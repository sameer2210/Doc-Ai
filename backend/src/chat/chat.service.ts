import { ConfigService } from '@config/config.service';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';
import { Prisma } from '@prisma/client';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { GeminiRateLimitService } from './gemini-rate-limit.service';

// ─── Gemini REST types ────────────────────────────────────────────────────────
interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface StreamMetrics {
  chunkCount: number;
  eventCount: number;
  tokenCount: number;
  malformedChunkCount: number;
  accumulatedLength: number;
}

type StreamErrorCode =
  | 'RATE_LIMIT'
  | 'DUPLICATE_STREAM'
  | 'INVALID_REQUEST'
  | 'CONFIGURATION_ERROR'
  | 'EMPTY_CONTEXT'
  | 'EMPTY_RESPONSE'
  | 'STREAM_ABORTED'
  | 'PERSISTENCE_ERROR'
  | 'PROVIDER_ERROR';

type StreamState = 'pending' | 'complete' | 'error';

interface ProviderErrorDetails {
  code: StreamErrorCode;
  message: string;
  providerStatus?: number;
}

interface GeminiPayloadParseResult {
  tokens: string[];
  finishReason: string | null;
}

// ─── Ayurvedic system prompt ──────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `
You are SpandaVidya AI, a calm Ayurvedic eye-health assistant.
Reply as a professional consultation summary in 120-160 words.
Do not mention prompts, models, or technical limitations.
No emojis. No repetition. No diagnosis claims.
Include: likely scan interpretation, confidence quality, immediate eye-care guidance,
simple Ayurvedic support (if relevant), and whether professional exam is recommended.
Confidence behavior:
- HIGH_CONFIDENCE: confident but non-diagnostic.
- MODERATE_CONFIDENCE: suggestive, recommend clinical verification.
- LOW_CONFIDENCE: unclear/limited result, recommend proper eye exam.
`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly defaultGeminiModel = 'gemini-2.5-flash';
  private readonly activeAssistantStreams = new Set<string>();
  private static readonly MAX_HISTORY_MESSAGES = 14;
  private static readonly MAX_HISTORY_CHARS = 6500;
  private static readonly KNOWN_FAILED_ASSISTANT_TEXTS = new Set<string>([
    'AI response failed. Please try again.',
  ]);

  // ─── Prediction label → human-readable display ───────────────────────────
  private static readonly PREDICTION_MAP: Record<string, string> = {
    No_Cataract: 'No Cataract Detected',
    Immature: 'Early Cataract Indicators Detected',
    Mature: 'Advanced Cataract Indicators Detected',
    IOL_Inserted: 'Artificial Lens Detected',
  };

  // ─── Prediction label → clinical insight ────────────────────────────────
  private static readonly INSIGHT_MAP: Record<string, string> = {
    No_Cataract:
      'The scan did not identify visible cataract-related abnormalities.',
    Immature:
      'The scan suggests possible early-stage cataract-related lens changes.',
    Mature:
      'The scan detected patterns commonly associated with advanced cataract conditions.',
    IOL_Inserted:
      'The scan suggests signs commonly associated with a previously implanted intraocular lens, often seen after cataract surgery.',
  };

  // ─── Prediction label → recommendation ──────────────────────────────────
  private static readonly RECOMMENDATION_MAP: Record<string, string> = {
    No_Cataract: 'Continue routine eye care and regular ophthalmic check-ups.',
    Immature:
      'Early professional evaluation is recommended to monitor lens health progression.',
    Mature:
      'A detailed ophthalmic examination is strongly recommended for proper clinical assessment.',
    IOL_Inserted:
      'Professional ophthalmic evaluation is recommended for clinical confirmation.',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly rateLimitService: GeminiRateLimitService,
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

  private getStreamState(metadata: Prisma.JsonObject | null): StreamState | null {
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
    const existing = await this.prisma.chat.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing.id;

    const chat = await this.prisma.chat.create({
      data: { userId, title: 'AI Health Consultation' },
    });
    return chat.id;
  }

  // ─── Get paginated messages ──────────────────────────────────────────────────
  async listMessages(chatId: string, cursor?: string, limit = 30) {
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return {
      items: items.map((m) => {
        const role = m.role.toLowerCase() as 'user' | 'assistant' | 'system';
        const meta = this.toJsonObject(m.metadata);
        const streamState = this.getStreamState(meta);
        const metaErrorMessage =
          streamState === 'error' && typeof meta?.errorMessage === 'string'
            ? meta.errorMessage
            : '';
        const baseContent = m.content ?? '';
        const content =
          baseContent.trim().length > 0
            ? baseContent
            : metaErrorMessage;
        const isStalePending =
          m.role === 'ASSISTANT' &&
          streamState === 'pending' &&
          content.trim().length === 0 &&
          Date.now() - m.createdAt.getTime() > 90_000;
        const status =
          isStalePending
            ? 'error'
            : streamState ??
              (m.role === 'ASSISTANT' && content.trim().length === 0
                ? 'pending'
                : 'complete');

        const hasScanResult =
          m.role === 'ASSISTANT' &&
          meta &&
          meta.type === 'scan_result';

        return {
          id: m.id,
          chatId: m.chatId,
          role,
          content,
          createdAt: m.createdAt.toISOString(),
          status,
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
  async saveUserMessage(chatId: string, content: string) {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
      throw new BadRequestException(`Chat ${chatId} not found`);
    }

    const userMessage = await this.prisma.message.create({
      data: { chatId, role: 'USER', content },
    });

    const assistantMessage = await this.prisma.message.create({
      data: {
        chatId,
        role: 'ASSISTANT',
        content: '',
        metadata: {
          streamState: 'pending',
        } as Prisma.JsonObject,
      },
    });

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
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
      throw new BadRequestException(`Chat ${chatId} not found`);
    }

    const pct = Math.round(confidence * 100);

    // 1. Check daily Gemini limit (10 generations max per day per user)
    const limitCheck =
      await this.rateLimitService.checkAndIncrementLimit(userId);
    if (!limitCheck.allowed) {
      this.logger.warn(`User ${userId} reached daily Gemini query limit.`);

      const userMessage = await this.prisma.message.create({
        data: {
          chatId,
          role: 'USER',
          content: this.buildScanUserContent(prediction, pct),
        },
      });

      const limitExceededText =
        'Daily AI assistant limit reached. Please try again tomorrow.';
      const assistantMessage = await this.prisma.message.create({
        data: {
          chatId,
          role: 'ASSISTANT',
          content: limitExceededText,
          metadata: {
            streamState: 'complete',
          } as Prisma.JsonObject,
        },
      });

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
        limitReached: true,
      };
    }

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

    // 3. Persist messages
    const userMessage = await this.prisma.message.create({
      data: {
        chatId,
        role: 'USER',
        content: this.buildScanUserContent(prediction, pct),
      },
    });

    const assistantMessage = await this.prisma.message.create({
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
          streamState: 'pending',
        } as Prisma.JsonObject,
      },
    });

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
      limitReached: false,
    };
  }

  private compactText(raw: string): string {
    return raw.replace(/\s+/g, ' ').trim();
  }

  private shouldSkipForHistory(
    role: 'USER' | 'ASSISTANT' | 'SYSTEM',
    text: string,
    metadata: Prisma.JsonObject | null,
  ): boolean {
    if (role === 'SYSTEM') {
      return true;
    }
    if (!text) {
      return true;
    }
    if (ChatService.KNOWN_FAILED_ASSISTANT_TEXTS.has(text)) {
      return true;
    }
    const streamState = this.getStreamState(metadata);
    if (role === 'ASSISTANT' && streamState === 'pending') {
      return true;
    }
    if (streamState === 'error') {
      return true;
    }
    if (
      role === 'ASSISTANT' &&
      metadata &&
      typeof metadata.streamIntegrity === 'string' &&
      metadata.streamIntegrity === 'incomplete'
    ) {
      return true;
    }
    if (role === 'ASSISTANT' && streamState === 'complete') {
      const hasExplicitIntegrity =
        metadata &&
        typeof metadata.streamIntegrity === 'string' &&
        metadata.streamIntegrity === 'complete';
      const hasFinishReason =
        metadata &&
        typeof metadata.providerFinishReason === 'string' &&
        metadata.providerFinishReason.length > 0;
      const looksLegacyAndTruncated =
        !hasExplicitIntegrity &&
        !hasFinishReason &&
        text.length < 45 &&
        !/[.!?]$/.test(text);
      if (looksLegacyAndTruncated) {
        return true;
      }
    }
    return false;
  }

  private isStructuredScanUserMessage(text: string): boolean {
    const lowered = text.toLowerCase();
    return (
      lowered.includes('eye scan result') &&
      lowered.includes('detected condition') &&
      lowered.includes('ai confidence')
    );
  }

  private buildGenerationConfig(model: string): Record<string, unknown> {
    const config: Record<string, unknown> = {
      temperature: 0.35,
      maxOutputTokens: 512,
      topP: 0.8,
    };

    // Gemini 2.5 can consume output budget in thinking tokens.
    // Keep thinking budget at 0 so visible answer is not unexpectedly truncated.
    if (model.includes('2.5')) {
      config.thinkingConfig = {
        thinkingBudget: 0,
      };
    }

    return config;
  }

  private async buildHistory(chatId: string, assistantMessageId: string): Promise<{
    contents: GeminiContent[];
    totalChars: number;
    estimatedInputTokens: number;
  }> {
    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        NOT: { id: assistantMessageId },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        role: true,
        content: true,
        metadata: true,
      },
    });

    const chronologic = [...messages].reverse();
    let latestScanUserIndex = -1;
    let latestScanAssistantIndex = -1;
    for (let idx = chronologic.length - 1; idx >= 0; idx -= 1) {
      const message = chronologic[idx];
      const compacted = this.compactText(message.content ?? '');
      const metadata = this.toJsonObject(message.metadata);

      if (
        latestScanUserIndex === -1 &&
        message.role === 'USER' &&
        this.isStructuredScanUserMessage(compacted)
      ) {
        latestScanUserIndex = idx;
      }

      if (
        latestScanAssistantIndex === -1 &&
        message.role === 'ASSISTANT' &&
        metadata?.type === 'scan_result'
      ) {
        latestScanAssistantIndex = idx;
      }

      if (latestScanUserIndex !== -1 && latestScanAssistantIndex !== -1) {
        break;
      }
    }

    const deDuplicated: GeminiContent[] = [];

    for (let idx = 0; idx < chronologic.length; idx += 1) {
      const message = chronologic[idx];
      const compacted = this.compactText(message.content ?? '');
      const metadata = this.toJsonObject(message.metadata);

      if (
        message.role === 'USER' &&
        this.isStructuredScanUserMessage(compacted) &&
        idx !== latestScanUserIndex
      ) {
        continue;
      }

      if (
        message.role === 'ASSISTANT' &&
        metadata?.type === 'scan_result' &&
        idx !== latestScanAssistantIndex
      ) {
        continue;
      }

      if (this.shouldSkipForHistory(message.role, compacted, metadata)) {
        continue;
      }

      const nextRole: GeminiContent['role'] =
        message.role === 'USER' ? 'user' : 'model';
      const previous = deDuplicated[deDuplicated.length - 1];
      if (
        previous &&
        previous.role === nextRole &&
        previous.parts[0]?.text === compacted
      ) {
        continue;
      }

      deDuplicated.push({
        role: nextRole,
        parts: [{ text: compacted }],
      });
    }

    const recentWindow = deDuplicated.slice(-ChatService.MAX_HISTORY_MESSAGES);
    const budgeted: GeminiContent[] = [];
    let totalChars = 0;

    for (let idx = recentWindow.length - 1; idx >= 0; idx -= 1) {
      const item = recentWindow[idx];
      const text = item.parts[0]?.text ?? '';
      if (!text) {
        continue;
      }
      const canAdd =
        totalChars + text.length <= ChatService.MAX_HISTORY_CHARS ||
        budgeted.length < 2;
      if (!canAdd) {
        continue;
      }
      budgeted.unshift(item);
      totalChars += text.length;
    }

    const estimatedInputTokens = Math.ceil(
      (SYSTEM_INSTRUCTION.length + totalChars) / 4,
    );

    return {
      contents: budgeted,
      totalChars,
      estimatedInputTokens,
    };
  }

  private toSse(payload: Record<string, unknown>): string {
    return `data: ${JSON.stringify(payload)}\n\n`;
  }

  private isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private safeSerialize(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }

    try {
      const seen = new WeakSet<object>();
      const serialized = JSON.stringify(value, (_key, innerValue: unknown) => {
        if (typeof innerValue === 'object' && innerValue !== null) {
          if (seen.has(innerValue)) {
            return '[Circular]';
          }
          seen.add(innerValue);
        }
        return innerValue;
      });
      if (!serialized) {
        return '';
      }
      return serialized.length > 2_000
        ? `${serialized.slice(0, 2_000)}...`
        : serialized;
    } catch {
      return String(value);
    }
  }

  private extractProviderMessage(rawData: unknown): string {
    if (typeof rawData === 'string') {
      return rawData;
    }

    if (this.isObjectRecord(rawData)) {
      const errorPayload = rawData.error;
      if (this.isObjectRecord(errorPayload)) {
        const providerMessage = errorPayload.message;
        if (typeof providerMessage === 'string' && providerMessage.trim()) {
          return providerMessage;
        }
      }

      const directMessage = rawData.message;
      if (typeof directMessage === 'string' && directMessage.trim()) {
        return directMessage;
      }
    }

    return this.safeSerialize(rawData);
  }

  private extractSsePayloadsFromBuffer(buffer: string): {
    payloads: string[];
    remainder: string;
  } {
    const normalized = buffer.replace(/\r\n/g, '\n');
    const eventBlocks = normalized.split('\n\n');
    const remainder = eventBlocks.pop() ?? '';
    const payloads: string[] = [];

    for (const rawBlock of eventBlocks) {
      const block = rawBlock.trim();
      if (!block) {
        continue;
      }

      const lines = block.split('\n');
      const dataLines: string[] = [];
      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length > 0) {
        const combined = dataLines.join('\n').trim();
        if (combined) {
          payloads.push(combined);
        }
        continue;
      }

      // Fallback for providers/proxies that return raw JSON without SSE prefixes.
      if (block.startsWith('{') || block.startsWith('[')) {
        payloads.push(block);
      }
    }

    return { payloads, remainder };
  }

  private extractGeminiPayloadData(
    payload: string,
  ): GeminiPayloadParseResult | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return null;
    }

    const chunks: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    const tokens: string[] = [];
    let finishReason: string | null = null;

    for (const chunk of chunks) {
      if (!this.isObjectRecord(chunk)) {
        continue;
      }

      const candidatesRaw = chunk.candidates;
      if (!Array.isArray(candidatesRaw)) {
        continue;
      }

      for (const candidate of candidatesRaw) {
        if (!this.isObjectRecord(candidate)) {
          continue;
        }

        const candidateFinishReason = candidate.finishReason;
        if (
          finishReason === null &&
          typeof candidateFinishReason === 'string' &&
          candidateFinishReason.trim().length > 0
        ) {
          finishReason = candidateFinishReason;
        }

        const contentRaw = candidate.content;
        if (!this.isObjectRecord(contentRaw)) {
          continue;
        }

        const partsRaw = contentRaw.parts;
        if (!Array.isArray(partsRaw)) {
          continue;
        }

        for (const part of partsRaw) {
          if (!this.isObjectRecord(part)) {
            continue;
          }
          const text = part.text;
          if (typeof text === 'string' && text.length > 0) {
            tokens.push(text);
          }
        }
      }
    }

    return {
      tokens,
      finishReason,
    };
  }

  private async persistAssistantErrorSafe(
    assistantMessageId: string,
    details: ProviderErrorDetails,
  ): Promise<boolean> {
    try {
      await this.persistAssistantError(assistantMessageId, details);
      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `stream.persist_error_failed assistantMessage=${assistantMessageId} message=${err.message}`,
        err.stack,
      );
      return false;
    }
  }

  private async persistAssistantSuccessSafe(
    assistantMessageId: string,
    generatedText: string,
    extras?: Prisma.JsonObject,
  ): Promise<boolean> {
    try {
      await this.persistAssistantSuccess(assistantMessageId, generatedText, extras);
      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `stream.persist_success_failed assistantMessage=${assistantMessageId} message=${err.message}`,
        err.stack,
      );
      return false;
    }
  }

  private buildProviderError(error: unknown): ProviderErrorDetails {
    const axiosError = error as AxiosError<unknown>;
    const status = axiosError?.response?.status;
    const rawData = axiosError?.response?.data;
    const fallbackErrorMessage =
      error instanceof Error ? error.message : 'Unknown provider error';
    const rawMessage =
      this.extractProviderMessage(rawData) ||
      axiosError?.message ||
      fallbackErrorMessage;
    const lowered = rawMessage.toLowerCase();
    const isRateLimited =
      status === 429 ||
      lowered.includes('rate limit') ||
      lowered.includes('quota') ||
      lowered.includes('resource has been exhausted');

    if (isRateLimited) {
      return {
        code: 'RATE_LIMIT',
        message: 'AI service temporarily busy',
        providerStatus: status ?? 429,
      };
    }

    if (status === 400) {
      return {
        code: 'INVALID_REQUEST',
        message: 'AI request could not be processed',
        providerStatus: status,
      };
    }

    if (axiosError?.code === 'ECONNABORTED') {
      return {
        code: 'PROVIDER_ERROR',
        message: 'AI provider request timed out',
        providerStatus: status,
      };
    }

    return {
      code: 'PROVIDER_ERROR',
      message: 'AI provider request failed',
      providerStatus: status,
    };
  }

  private mergeMetadataWithStreamState(
    metadata: Prisma.JsonObject | null,
    streamState: StreamState,
    extras?: Prisma.JsonObject,
  ): Prisma.JsonObject {
    return {
      ...(metadata ?? {}),
      ...(extras ?? {}),
      streamState,
    };
  }

  private buildGeminiStreamUrl(apiKey: string): { url: string; model: string } {
    const configuredModel = this.configService.googleGeminiModel?.trim();
    const model = configuredModel || this.defaultGeminiModel;
    return {
      model,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
    };
  }

  private async persistAssistantSuccess(
    assistantMessageId: string,
    generatedText: string,
    extras?: Prisma.JsonObject,
  ): Promise<void> {
    const existing = await this.prisma.message.findUnique({
      where: { id: assistantMessageId },
      select: { metadata: true },
    });
    const metadata = this.toJsonObject(existing?.metadata);
    const trimmed = generatedText.trim();
    await this.prisma.message.update({
      where: { id: assistantMessageId },
      data: {
        content: trimmed,
        tokenCount: Math.ceil(trimmed.length / 4),
        metadata: this.mergeMetadataWithStreamState(metadata, 'complete', extras),
      },
    });
  }

  private async persistAssistantError(
    assistantMessageId: string,
    details: ProviderErrorDetails,
  ): Promise<void> {
    const existing = await this.prisma.message.findUnique({
      where: { id: assistantMessageId },
      select: { metadata: true },
    });
    const metadata = this.toJsonObject(existing?.metadata);
    await this.prisma.message.update({
      where: { id: assistantMessageId },
      data: {
        content: '',
        metadata: this.mergeMetadataWithStreamState(metadata, 'error', {
          errorCode: details.code,
          errorMessage: details.message,
          ...(details.providerStatus ? { providerStatus: details.providerStatus } : {}),
        } as Prisma.JsonObject),
      },
    });
  }

  // ─── Stream Gemini response (SSE) ───────────────────────────────────────────
  async *streamResponse(
    chatId: string,
    assistantMessageId: string,
    userId: string,
    options?: { signal?: AbortSignal },
  ): AsyncGenerator<string> {
    const streamSignal = options?.signal;

    if (this.activeAssistantStreams.has(assistantMessageId)) {
      yield this.toSse({
        type: 'error',
        code: 'DUPLICATE_STREAM',
        message: 'Stream already in progress for this message',
      });
      return;
    }

    this.activeAssistantStreams.add(assistantMessageId);
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

      const chat = await this.prisma.chat.findUnique({
        where: { id: chatId },
        select: { userId: true },
      });
      if (!chat || chat.userId !== userId) {
        closeReason = 'invalid_request';
        yield this.toSse({
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
        await this.persistAssistantErrorSafe(assistantMessageId, {
          code: 'CONFIGURATION_ERROR',
          message: 'AI provider is not configured',
        });
        yield this.toSse({
          type: 'error',
          code: 'CONFIGURATION_ERROR',
          message: 'AI provider is not configured',
        });
        return;
      }

      stage = 'load_assistant_message';
      const assistantMsg = await this.prisma.message.findUnique({
        where: { id: assistantMessageId },
        select: { id: true, chatId: true, content: true, metadata: true },
      });

      if (!assistantMsg || assistantMsg.chatId !== chatId) {
        closeReason = 'invalid_request';
        yield this.toSse({
          type: 'error',
          code: 'INVALID_REQUEST',
          message: 'Invalid assistant message',
        });
        return;
      }

      if (streamSignal?.aborted) {
        closeReason = 'aborted';
        finalizePath = 'abort_before_provider';
        await this.persistAssistantErrorSafe(assistantMessageId, {
          code: 'STREAM_ABORTED',
          message: 'Stream was aborted',
        });
        return;
      }

      if (assistantMsg.content && assistantMsg.content.trim().length > 0) {
        finalizePath = 'cached_content_shortcut';
        await this.persistAssistantSuccessSafe(
          assistantMessageId,
          assistantMsg.content,
        );
        yield this.toSse({ type: 'token', token: assistantMsg.content });
        yield this.toSse({ type: 'done' });
        return;
      }

      stage = 'build_prompt_history';
      const history = await this.buildHistory(chatId, assistantMessageId);
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
        await this.persistAssistantErrorSafe(assistantMessageId, details);
        yield this.toSse({
          type: 'error',
          code: details.code,
          message: details.message,
        });
        return;
      }

      stage = 'provider_request';
      const provider = this.buildGeminiStreamUrl(apiKey);
      const requestBody = {
        system_instruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents: history.contents,
        generationConfig: this.buildGenerationConfig(provider.model),
      };

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
        const parsed = this.extractSsePayloadsFromBuffer(buffer);
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

          const parsedPayload = this.extractGeminiPayloadData(payload);
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
            yield this.toSse({ type: 'token', token });
          }
        }
      }

      if (buffer.trim().length > 0) {
        const residualParsed = this.extractSsePayloadsFromBuffer(`${buffer}\n\n`);
        for (const payload of residualParsed.payloads) {
          metrics.eventCount += 1;
          if (!payload) {
            continue;
          }
          if (payload === '[DONE]') {
            sawDoneMarker = true;
            continue;
          }

          const parsedPayload = this.extractGeminiPayloadData(payload);
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
            yield this.toSse({ type: 'token', token });
          }
        }
      }

      if (closeReason === 'aborted') {
        finalizePath = 'abort_during_stream';
        await this.persistAssistantErrorSafe(assistantMessageId, {
          code: 'STREAM_ABORTED',
          message: 'Stream was aborted',
        });
        return;
      }

      const finalContent = accumulatedText.trim();
      if (!finalContent) {
        closeReason = 'empty_output';
        finalizePath = 'empty_response_error';
        await this.persistAssistantErrorSafe(assistantMessageId, {
          code: 'EMPTY_RESPONSE',
          message: 'AI provider returned an empty response',
        });
        yield this.toSse({
          type: 'error',
          code: 'EMPTY_RESPONSE',
          message: 'AI provider returned an empty response',
        });
        return;
      }

      if (!sawDoneMarker && !sawFinishReason) {
        closeReason = 'provider_error';
        finalizePath = 'missing_stream_terminal';
        await this.persistAssistantErrorSafe(assistantMessageId, {
          code: 'PROVIDER_ERROR',
          message: 'AI response stream ended before completion',
        });
        yield this.toSse({
          type: 'error',
          code: 'PROVIDER_ERROR',
          message: 'AI response stream ended before completion',
        });
        return;
      }

      stage = 'persist_success';
      const successPersisted = await this.persistAssistantSuccessSafe(
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
        await this.persistAssistantErrorSafe(assistantMessageId, {
          code: 'PERSISTENCE_ERROR',
          message: 'Failed to save assistant response',
        });
        yield this.toSse({
          type: 'error',
          code: 'PERSISTENCE_ERROR',
          message: 'Failed to save assistant response',
        });
        return;
      }

      finalizePath = 'persist_success';
      yield this.toSse({ type: 'done' });
    } catch (error) {
      if (streamSignal?.aborted) {
        closeReason = 'aborted';
        finalizePath = 'abort_in_catch';
        await this.persistAssistantErrorSafe(assistantMessageId, {
          code: 'STREAM_ABORTED',
          message: 'Stream was aborted',
        });
        return;
      }

      const details = this.buildProviderError(error);
      closeReason =
        details.code === 'RATE_LIMIT' ? 'rate_limited' : 'provider_error';
      finalizePath = 'provider_exception';

      if (details.code === 'RATE_LIMIT') {
        this.logger.warn(
          `stream.rate_limit assistantMessage=${assistantMessageId} status=${details.providerStatus ?? 429}`,
        );
      } else {
        const err = error as Error;
        this.logger.error(
          `stream.error assistantMessage=${assistantMessageId} stage=${stage} code=${details.code} status=${details.providerStatus ?? 'unknown'} message=${err.message}`,
          err.stack,
        );
      }

      await this.persistAssistantErrorSafe(assistantMessageId, details);
      yield this.toSse({
        type: 'error',
        code: details.code,
        message: details.message,
      });
    } finally {
      this.activeAssistantStreams.delete(assistantMessageId);
      this.logger.log(
        `stream.closed chat=${chatId} assistantMessage=${assistantMessageId} reason=${closeReason} finalizePath=${finalizePath} chunks=${metrics.chunkCount} events=${metrics.eventCount} tokens=${metrics.tokenCount} malformed=${metrics.malformedChunkCount} accumulated=${metrics.accumulatedLength} doneMarker=${sawDoneMarker ? 1 : 0} finishReason=${finalFinishReason ?? 'none'}`,
      );
    }
  }
}
