import { ConfigService } from '@config/config.service';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';
import { Prisma } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { GeminiRateLimitService } from './gemini-rate-limit.service';
import { GeminiProviderService, ProviderErrorDetails } from './services/gemini-provider.service';
import { ChatHistoryService } from './services/chat-history.service';
import { ChatPersistenceService } from './services/chat-persistence.service';
import { SYSTEM_INSTRUCTION } from './constants/chat.constants';
import {
  toSse,
  extractSsePayloadsFromBuffer,
  extractGeminiPayloadData,
} from './utils/stream-parser.util';

interface StreamMetrics {
  chunkCount: number;
  eventCount: number;
  tokenCount: number;
  malformedChunkCount: number;
  accumulatedLength: number;
}

type StreamState = 'pending' | 'complete' | 'error';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly activeAssistantStreams = new Set<string>();

  // ─── Prediction label → human-readable display ───────────────────────────
  private static readonly PREDICTION_MAP: Record<string, string> = {
    No_Cataract: 'No Cataract Detected',
    Immature_Cataract: 'Early Cataract Indicators Detected',
    Mature_Cataract: 'Advanced Cataract Indicators Detected',
    IOL_Inserted: 'Artificial Lens Detected',
  };

  // ─── Prediction label → clinical insight ────────────────────────────────
  private static readonly INSIGHT_MAP: Record<string, string> = {
    No_Cataract:
      'The scan did not identify visible cataract-related abnormalities.',
    Immature_Cataract:
      'The scan suggests possible early-stage cataract-related lens changes.',
    Mature_Cataract:
      'The scan detected patterns commonly associated with advanced cataract conditions.',
    IOL_Inserted:
      'The scan suggests signs commonly associated with a previously implanted intraocular lens, often seen after cataract surgery.',
  };

  // ─── Prediction label → recommendation ──────────────────────────────────
  private static readonly RECOMMENDATION_MAP: Record<string, string> = {
    No_Cataract: 'Continue routine eye care and regular ophthalmic check-ups.',
    Immature_Cataract:
      'Early professional evaluation is recommended to monitor lens health progression.',
    Mature_Cataract:
      'A detailed ophthalmic examination is strongly recommended for proper clinical assessment.',
    IOL_Inserted:
      'Professional ophthalmic evaluation is recommended for clinical confirmation.',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly rateLimitService: GeminiRateLimitService,
    private readonly geminiProviderService: GeminiProviderService,
    private readonly chatHistoryService: ChatHistoryService,
    private readonly chatPersistenceService: ChatPersistenceService,
  ) {}

  // ─── Build structured scan user message content ──────────────────────────
  private buildScanUserContent(prediction: string, pct: number): string {
    const humanPrediction =
      ChatService.PREDICTION_MAP[prediction] ?? prediction.replace(/_/g, ' ');

    const clinicalInsight =
      ChatService.INSIGHT_MAP[prediction] ??
      'AI-based eye scan analysis completed.';

    const recommendation =
      ChatService.RECOMMENDATION_MAP[prediction] ??
      'Professional clinical verification is recommended.';

    return [
      'Eye Scan Result',
      '',
      `Detected Condition:\n${humanPrediction}`,
      '',
      `AI Confidence:\n${pct}%`,
      '',
      `Clinical Insight:\n${clinicalInsight}`,
      '',
      `Recommendation:\n${recommendation}`,
    ].join('\n');
  }

  private toJsonObject(
    value: Prisma.JsonValue | null | undefined,
  ): Prisma.JsonObject | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Prisma.JsonObject;
  }

  private getStreamState(
    metadata: Prisma.JsonObject | null,
  ): StreamState | null {
    if (!metadata) {
      return null;
    }
    const rawState = metadata.streamState;
    if (
      rawState === 'pending' ||
      rawState === 'complete' ||
      rawState === 'error'
    ) {
      return rawState;
    }
    return null;
  }

  // ─── Ensure a default chat exists for a user ────────────────────────────────
  async ensureDefaultChat(userId: string): Promise<string> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Enforce sequential execution for default chat creation per user
        // Using an explicit row lock on the user record
        await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

        const existing = await tx.chat.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (existing) return existing.id;

        const chat = await tx.chat.create({
          data: { userId, title: 'AI Health Consultation' },
        });
        return chat.id;
      });
    } catch (error) {
      this.logger.error(
        `chat.default_create_failed user=${userId} message=${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to initialize chat session',
      );
    }
  }

  // ─── Get paginated messages ──────────────────────────────────────────────────
  private async assertChatOwnedByUser(
    chatId: string,
    userId: string,
  ): Promise<void> {
    const chat = await this.prisma.chat.findFirst({
      where: { id: chatId, userId },
      select: { id: true },
    });
    if (!chat) {
      throw new ForbiddenException('Chat not found');
    }
  }

  async listMessages(
    chatId: string,
    userId: string,
    cursor?: string,
    limit = 30,
  ) {
    await this.assertChatOwnedByUser(chatId, userId);

    const boundedLimit = Math.min(Math.max(limit, 1), 50);
    if (cursor) {
      const cursorMessage = await this.prisma.message.findFirst({
        where: { id: cursor, chatId },
        select: { id: true },
      });
      if (!cursorMessage) {
        throw new BadRequestException('Invalid message cursor');
      }
    }

    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: boundedLimit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > boundedLimit;
    const items = hasMore ? messages.slice(0, boundedLimit) : messages;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return {
      items: items.map((m) => {
        const role = m.role.toLowerCase() as 'user' | 'assistant' | 'system';
        const meta = this.toJsonObject(m.metadata);
        const streamState = this.getStreamState(meta);
        const content = streamState === 'error' ? '' : (m.content ?? '');
        const isStalePending =
          m.role === 'ASSISTANT' &&
          streamState === 'pending' &&
          content.trim().length === 0 &&
          Date.now() - m.createdAt.getTime() > 90_000;
        const status = isStalePending
          ? 'error'
          : (streamState ??
            (m.role === 'ASSISTANT' && content.trim().length === 0
              ? 'pending'
              : 'complete'));

        const hasScanResult =
          m.role === 'ASSISTANT' && meta && meta.type === 'scan_result';
        const errorCode =
          status === 'error' && typeof meta?.errorCode === 'string'
            ? meta.errorCode
            : undefined;

        return {
          id: m.id,
          chatId: m.chatId,
          role,
          content,
          createdAt: m.createdAt.toISOString(),
          status,
          ...(errorCode ? { errorCode } : {}),
          ...(hasScanResult
            ? {
                type: 'scan_result' as const,
                scanResult: {
                  prediction: String(meta.prediction || ''),
                  confidence: Number(meta.confidence ?? 0),
                },
              }
            : {}),
        };
      }),
      nextCursor,
    };
  }

  // ─── Save a user message + create a placeholder assistant message ────────────
  async saveUserMessage(
    chatId: string,
    userId: string,
    content: string,
    attachments?: Array<{
      id: string;
      name: string;
      mimeType: string;
      size: number;
      serverUrl: string;
    }>,
  ) {
    await this.assertChatOwnedByUser(chatId, userId);

    let userMessage: Awaited<ReturnType<typeof this.prisma.message.create>>;
    let assistantMessage: Awaited<
      ReturnType<typeof this.prisma.message.create>
    >;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Enforce sequential execution for messages in this chat
        await tx.$executeRaw`SELECT id FROM "Chat" WHERE id = ${chatId} FOR UPDATE`;

        const lastMsg = await tx.message.findFirst({
          where: { chatId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        let baseTime = Date.now();
        if (lastMsg && lastMsg.createdAt.getTime() >= baseTime) {
          baseTime = lastMsg.createdAt.getTime() + 1;
        }

        const userMessageCreatedAt = new Date(baseTime);
        const assistantMessageCreatedAt = new Date(baseTime + 1);

        const uMsg = await tx.message.create({
          data: {
            chatId,
            role: 'USER',
            content,
            metadata:
              attachments && attachments.length > 0
                ? ({
                    attachments,
                  } as Prisma.JsonObject)
                : ({} as Prisma.JsonObject),
            createdAt: userMessageCreatedAt,
          },
        });

        const aMsg = await tx.message.create({
          data: {
            chatId,
            role: 'ASSISTANT',
            content: '',
            metadata: {
              streamState: 'pending',
            } as Prisma.JsonObject,
            createdAt: assistantMessageCreatedAt,
          },
        });

        return { uMsg, aMsg };
      });

      userMessage = result.uMsg;
      assistantMessage = result.aMsg;
    } catch (error) {
      this.logger.error(
        `chat.message_pair_create_failed chat=${chatId} message=${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to save chat message');
    }

    return {
      userMessage: {
        id: userMessage.id,
        chatId,
        role: 'user' as const,
        content: userMessage.content,
        createdAt: userMessage.createdAt.toISOString(),
        status: 'complete',
      },
      assistantMessageId: assistantMessage.id,
    };
  }

  // ─── Initialize Ayurvedic consultation flow on the backend ─────────────────
  async startConsultation(
    chatId: string,
    prediction: string,
    confidence: number,
    userId: string,
  ) {
    await this.assertChatOwnedByUser(chatId, userId);

    const pct = Math.round(confidence * 100);

    // 1. Check daily Gemini limit
    const limitCheck =
      await this.rateLimitService.checkAndIncrementLimit(userId);

    // 2. Classify confidence level
    let confidenceText: string;
    let confidenceLevel: string;
    if (confidence >= 0.85) {
      confidenceText = 'HIGH_CONFIDENCE';
      confidenceLevel = 'High';
    } else if (confidence >= 0.65) {
      confidenceText = 'MODERATE_CONFIDENCE';
      confidenceLevel = 'Moderate';
    } else {
      confidenceText = 'LOW_CONFIDENCE';
      confidenceLevel = 'Low';
    }
    let userMessage: Awaited<ReturnType<typeof this.prisma.message.create>>;
    let assistantMessage: Awaited<
      ReturnType<typeof this.prisma.message.create>
    >;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Enforce sequential execution for messages in this chat
        await tx.$executeRaw`SELECT id FROM "Chat" WHERE id = ${chatId} FOR UPDATE`;

        const lastMsg = await tx.message.findFirst({
          where: { chatId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        let baseTime = Date.now();
        if (lastMsg && lastMsg.createdAt.getTime() >= baseTime) {
          baseTime = lastMsg.createdAt.getTime() + 1;
        }

        const userMessageCreatedAt = new Date(baseTime);
        const assistantMessageCreatedAt = new Date(baseTime + 1);

        const uMsg = await tx.message.create({
          data: {
            chatId,
            role: 'USER',
            content: this.buildScanUserContent(prediction, pct),
            createdAt: userMessageCreatedAt,
          },
        });

        const aMsg = await tx.message.create({
          data: {
            chatId,
            role: 'ASSISTANT',
            content: '',
            metadata: {
              type: 'scan_result',
              prediction,
              confidence,
              confidenceLevel,
              confidenceText,
              streamState: limitCheck.allowed ? 'pending' : 'error',
              ...(!limitCheck.allowed
                ? { errorCode: 'DAILY_LIMIT_REACHED' }
                : {}),
            } as Prisma.JsonObject,
            createdAt: assistantMessageCreatedAt,
          },
        });

        return { uMsg, aMsg };
      });

      userMessage = result.uMsg;
      assistantMessage = result.aMsg;
    } catch (error) {
      this.logger.error(
        `chat.consultation_messages_failed chat=${chatId} user=${userId} message=${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to initialize consultation',
      );
    }

    if (!limitCheck.allowed) {
      this.logger.warn(
        `chat.daily_limit_reached user=${userId} remaining=${limitCheck.remaining}`,
      );
    }

    return {
      userMessage: {
        id: userMessage.id,
        chatId,
        role: 'user' as const,
        content: userMessage.content ?? '',
        createdAt: userMessage.createdAt.toISOString(),
        status: 'complete',
      },
      assistantMessageId: assistantMessage.id,
      limitReached: !limitCheck.allowed,
    };
  }

  // ─── Delegate Persistence Calls ────────────────────────────────────────────
  async persistAssistantSuccess(
    chatId: string,
    assistantMessageId: string,
    generatedText: string,
    extras?: Prisma.JsonObject,
  ): Promise<void> {
    return this.chatPersistenceService.persistAssistantSuccess(
      chatId,
      assistantMessageId,
      generatedText,
      extras,
    );
  }

  async persistAssistantSuccessSafe(
    chatId: string,
    assistantMessageId: string,
    generatedText: string,
    extras?: Prisma.JsonObject,
  ): Promise<boolean> {
    return this.chatPersistenceService.persistAssistantSuccessSafe(
      chatId,
      assistantMessageId,
      generatedText,
      extras,
    );
  }

  async persistAssistantError(
    chatId: string,
    assistantMessageId: string,
    details: ProviderErrorDetails,
  ): Promise<void> {
    return this.chatPersistenceService.persistAssistantError(
      chatId,
      assistantMessageId,
      details,
    );
  }

  async persistAssistantErrorSafe(
    chatId: string,
    assistantMessageId: string,
    details: ProviderErrorDetails,
  ): Promise<boolean> {
    return this.chatPersistenceService.persistAssistantErrorSafe(
      chatId,
      assistantMessageId,
      details,
    );
  }

  // ─── Stream Gemini response (SSE) ───────────────────────────────────────────
  async *streamResponse(
    chatId: string,
    assistantMessageId: string,
    userId: string,
    options?: { signal?: AbortSignal },
  ): AsyncGenerator<string> {
    const streamSignal = options?.signal;
    const streamLockKey = `${userId}:${assistantMessageId}`;

    if (this.activeAssistantStreams.has(streamLockKey)) {
      yield toSse({
        type: 'error',
        code: 'DUPLICATE_STREAM',
        message: 'Stream already in progress for this message',
      });
      return;
    }

    this.activeAssistantStreams.add(streamLockKey);
    let closeReason = 'done';
    let stage = 'init';
    let finalizePath = 'none';
    let sawDoneMarker = false;
    let finalFinishReason: string | null = null;
    const metrics: StreamMetrics = {
      chunkCount: 0,
      eventCount: 0,
      tokenCount: 0,
      malformedChunkCount: 0,
      accumulatedLength: 0,
    };

    try {
      stage = 'validate_chat';
      this.logger.log(
        `stream.start chat=${chatId} assistantMessage=${assistantMessageId}`,
      );

      const chat = await this.prisma.chat.findFirst({
        where: { id: chatId, userId },
        select: { userId: true },
      });
      if (!chat) {
        closeReason = 'invalid_request';
        yield toSse({
          type: 'error',
          code: 'INVALID_REQUEST',
          message: 'Invalid chat context',
        });
        return;
      }

      stage = 'validate_provider';
      const apiKey = this.configService.googleApiKey;
      if (!apiKey) {
        closeReason = 'config_error';
        finalizePath = 'emit_configuration_error';
        await this.chatPersistenceService.persistAssistantErrorSafe(chatId, assistantMessageId, {
          code: 'CONFIGURATION_ERROR',
          message: 'AI provider is not configured',
        });
        yield toSse({
          type: 'error',
          code: 'CONFIGURATION_ERROR',
          message: 'AI provider is not configured',
        });
        return;
      }

      stage = 'load_assistant_message';
      const assistantMsg = await this.prisma.message.findFirst({
        where: { id: assistantMessageId, chatId, role: 'ASSISTANT' },
        select: { id: true, chatId: true, content: true, metadata: true },
      });

      if (!assistantMsg) {
        closeReason = 'invalid_request';
        yield toSse({
          type: 'error',
          code: 'INVALID_REQUEST',
          message: 'Invalid assistant message',
        });
        return;
      }

      if (streamSignal?.aborted) {
        closeReason = 'aborted';
        finalizePath = 'abort_before_provider';
        await this.chatPersistenceService.persistAssistantErrorSafe(chatId, assistantMessageId, {
          code: 'STREAM_ABORTED',
          message: 'Stream was aborted',
        });
        return;
      }

      if (assistantMsg.content && assistantMsg.content.trim().length > 0) {
        finalizePath = 'cached_content_shortcut';
        await this.chatPersistenceService.persistAssistantSuccessSafe(
          chatId,
          assistantMessageId,
          assistantMsg.content,
        );
        yield toSse({ type: 'token', token: assistantMsg.content });
        yield toSse({ type: 'done' });
        return;
      }

      stage = 'build_prompt_history';
      const history = await this.chatHistoryService.buildHistory(chatId, assistantMessageId);
      this.logger.log(
        `stream.prompt assistantMessage=${assistantMessageId} historyMessages=${history.contents.length} promptChars=${history.totalChars} estInputTokens=${history.estimatedInputTokens}`,
      );

      if (history.contents.length === 0) {
        closeReason = 'empty_context';
        const details: ProviderErrorDetails = {
          code: 'EMPTY_CONTEXT',
          message: 'No valid conversation context available',
        };
        finalizePath = 'empty_context_error';
        await this.chatPersistenceService.persistAssistantErrorSafe(
          chatId,
          assistantMessageId,
          details,
        );
        yield toSse({
          type: 'error',
          code: details.code,
          message: details.message,
        });
        return;
      }

      stage = 'provider_request';
      const provider = this.geminiProviderService.buildGeminiStreamUrl(apiKey);
      const requestBody = {
        system_instruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents: history.contents,
        generationConfig: this.geminiProviderService.buildGenerationConfig(provider.model),
      };

      this.logger.log(`Gemini request started user=${userId}`);
      const response = await firstValueFrom(
        this.httpService.post(provider.url, requestBody, {
          responseType: 'stream',
          headers: { 'Content-Type': 'application/json' },
          timeout: 60_000,
          signal: streamSignal,
        }),
      );

      this.logger.log(
        `stream.provider assistantMessage=${assistantMessageId} model=${provider.model} status=${response.status}`,
      );

      const stream: NodeJS.ReadableStream = response.data;
      let buffer = '';
      let accumulatedText = '';
      let sawFinishReason = false;

      stage = 'provider_stream';
      for await (const chunk of stream) {
        metrics.chunkCount += 1;
        if (streamSignal?.aborted) {
          closeReason = 'aborted';
          break;
        }

        buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
        const parsed = extractSsePayloadsFromBuffer(buffer);
        buffer = parsed.remainder;

        for (const payload of parsed.payloads) {
          metrics.eventCount += 1;
          if (!payload) {
            continue;
          }
          if (payload === '[DONE]') {
            sawDoneMarker = true;
            continue;
          }

          const parsedPayload = extractGeminiPayloadData(payload);
          if (parsedPayload === null) {
            metrics.malformedChunkCount += 1;
            continue;
          }

          if (parsedPayload.finishReason) {
            sawFinishReason = true;
            finalFinishReason = parsedPayload.finishReason;
          }

          if (parsedPayload.tokens.length === 0) {
            continue;
          }

          for (const token of parsedPayload.tokens) {
            if (!token) {
              continue;
            }
            this.logger.log(`gemini.token => ${token}`);
            accumulatedText += token;
            metrics.tokenCount += 1;
            metrics.accumulatedLength = accumulatedText.length;
            yield toSse({ type: 'token', token });
          }
        }
      }

      if (buffer.trim().length > 0) {
        const residualParsed = extractSsePayloadsFromBuffer(
          `${buffer}\n\n`,
        );
        for (const payload of residualParsed.payloads) {
          metrics.eventCount += 1;
          if (!payload) {
            continue;
          }
          if (payload === '[DONE]') {
            sawDoneMarker = true;
            continue;
          }

          const parsedPayload = extractGeminiPayloadData(payload);
          if (parsedPayload === null) {
            metrics.malformedChunkCount += 1;
            continue;
          }

          if (parsedPayload.finishReason) {
            sawFinishReason = true;
            finalFinishReason = parsedPayload.finishReason;
          }

          for (const token of parsedPayload.tokens) {
            accumulatedText += token;
            metrics.tokenCount += 1;
            metrics.accumulatedLength = accumulatedText.length;
            yield toSse({ type: 'token', token });
          }
        }
      }

      if (closeReason === 'aborted') {
        finalizePath = 'abort_during_stream';
        await this.chatPersistenceService.persistAssistantErrorSafe(chatId, assistantMessageId, {
          code: 'STREAM_ABORTED',
          message: 'Stream was aborted',
        });
        return;
      }

      const finalContent = accumulatedText.trim();
      if (!finalContent) {
        closeReason = 'empty_output';
        finalizePath = 'empty_response_error';
        await this.chatPersistenceService.persistAssistantErrorSafe(chatId, assistantMessageId, {
          code: 'EMPTY_RESPONSE',
          message: 'AI provider returned an empty response',
        });
        yield toSse({
          type: 'error',
          code: 'EMPTY_RESPONSE',
          message: 'AI provider returned an empty response',
        });
        return;
      }

      if (!sawDoneMarker && !sawFinishReason) {
        closeReason = 'provider_error';
        finalizePath = 'missing_stream_terminal';
        await this.chatPersistenceService.persistAssistantErrorSafe(chatId, assistantMessageId, {
          code: 'PROVIDER_ERROR',
          message: 'AI response stream ended before completion',
        });
        yield toSse({
          type: 'error',
          code: 'PROVIDER_ERROR',
          message: 'AI response stream ended before completion',
        });
        return;
      }

      stage = 'persist_success';
      const successPersisted = await this.chatPersistenceService.persistAssistantSuccessSafe(
        chatId,
        assistantMessageId,
        finalContent,
        {
          streamIntegrity: 'complete',
          streamChunkCount: metrics.chunkCount,
          streamEventCount: metrics.eventCount,
          streamTokenCount: metrics.tokenCount,
          ...(finalFinishReason
            ? { providerFinishReason: finalFinishReason }
            : {}),
        } as Prisma.JsonObject,
      );
      if (!successPersisted) {
        closeReason = 'persistence_error';
        finalizePath = 'persist_success_failed';
        await this.chatPersistenceService.persistAssistantErrorSafe(chatId, assistantMessageId, {
          code: 'PERSISTENCE_ERROR',
          message: 'Failed to save assistant response',
        });
        yield toSse({
          type: 'error',
          code: 'PERSISTENCE_ERROR',
          message: 'Failed to save assistant response',
        });
        return;
      }

      finalizePath = 'persist_success';
      yield toSse({ type: 'done' });
    } catch (error) {
      if (streamSignal?.aborted) {
        closeReason = 'aborted';
        finalizePath = 'abort_in_catch';
        await this.chatPersistenceService.persistAssistantErrorSafe(chatId, assistantMessageId, {
          code: 'STREAM_ABORTED',
          message: 'Stream was aborted',
        });
        return;
      }

      const details = this.geminiProviderService.buildProviderError(error);
      closeReason =
        details.code === 'PROVIDER_RATE_LIMIT'
          ? 'rate_limited'
          : 'provider_error';
      finalizePath = 'provider_exception';
      const status = this.geminiProviderService.getProviderStatus(error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown provider error';

      this.logger.error(
        `Gemini failed status=${status ?? 'unknown'} message=${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (details.code === 'PROVIDER_RATE_LIMIT') {
        this.logger.warn(
          `stream.rate_limit assistantMessage=${assistantMessageId} status=${details.providerStatus ?? 429}`,
        );
      } else {
        this.logger.error(
          `stream.error assistantMessage=${assistantMessageId} stage=${stage} code=${details.code} status=${details.providerStatus ?? 'unknown'} message=${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
        );
      }

      await this.chatPersistenceService.persistAssistantErrorSafe(chatId, assistantMessageId, details);
      yield toSse({
        type: 'error',
        code: details.code,
        message: details.message,
      });
    } finally {
      this.activeAssistantStreams.delete(streamLockKey);
      this.logger.log(
        `stream.closed chat=${chatId} assistantMessage=${assistantMessageId} reason=${closeReason} finalizePath=${finalizePath} chunks=${metrics.chunkCount} events=${metrics.eventCount} tokens=${metrics.tokenCount} malformed=${metrics.malformedChunkCount} accumulated=${metrics.accumulatedLength} doneMarker=${sawDoneMarker ? 1 : 0} finishReason=${finalFinishReason ?? 'none'}`,
      );
    }
  }

  async listChats(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return chats.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt.toISOString(),
      lastMessage: c.messages[0]?.content ?? null,
      messageCount: c._count.messages,
    }));
  }

  async createChat(userId: string) {
    return await this.prisma.chat.create({
      data: {
        userId,
        title: 'AI Health Consultation',
      },
    });
  }

  async deleteChat(chatId: string, userId: string) {
    await this.assertChatOwnedByUser(chatId, userId);
    return await this.prisma.chat.delete({
      where: { id: chatId },
    });
  }
}
