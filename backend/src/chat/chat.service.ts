import { ConfigService } from '@config/config.service';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';
import { Prisma } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { GeminiRateLimitService } from './gemini-rate-limit.service';

// ─── Gemini REST types ────────────────────────────────────────────────────────
interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiStreamChunk {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
}

// ─── Ayurvedic system prompt ──────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `
You are SpandaVidya AI, a calm and intelligent Ayurvedic eye-health assistant.

The user already received an AI cataract scan result.
Your role is to present the result like a professional health consultation.

IMPORTANT RESPONSE RULES:
- Keep responses concise and premium
- Never generate long explanations
- Never sound robotic or academic
- Never mention prompts, AI systems, models, or technical processing
- Never use emojis
- Never overuse warnings
- Never repeat the same point twice

RESPONSE STYLE:
- Start directly with the result interpretation
- Sound reassuring and medically aware
- Use short clean sections
- Maximum 120-160 words
- Use bullet points only when necessary
- Make the response feel like a real consultation summary

ALWAYS INCLUDE:
1. What the scan likely suggests
2. Confidence quality (strong/moderate/limited)
3. Immediate eye-care guidance
4. Simple Ayurvedic support if relevant
5. Whether professional examination is recommended

CONFIDENCE BEHAVIOR:
- HIGH_CONFIDENCE:
  Speak more confidently but still avoid diagnosis claims

- MODERATE_CONFIDENCE:
  Say the result appears suggestive but should be clinically verified

- LOW_CONFIDENCE:
  Say the scan result is unclear or limited and recommend proper eye examination

VERY IMPORTANT:
Even if information is incomplete:
- still generate a polished consultation response
- never say "I cannot analyze"
- never expose internal limitations
- never return empty responses

TONE:
- calm
- premium healthcare assistant
- short
- intelligent
- reassuring
`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly geminiBaseUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent';

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
        const content = m.content ?? '';
        const meta = m.metadata as any;

        const hasScanResult =
          m.role === 'ASSISTANT' &&
          meta &&
          typeof meta === 'object' &&
          !Array.isArray(meta) &&
          meta.type === 'scan_result';

        return {
          id: m.id,
          chatId: m.chatId,
          role,
          content,
          createdAt: m.createdAt.toISOString(),
          status: 'complete',
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
      data: { chatId, role: 'ASSISTANT', content: '' },
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
        data: { chatId, role: 'ASSISTANT', content: limitExceededText },
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

  // ─── Build Gemini conversation history ──────────────────────────────────────
  private async buildHistory(
    chatId: string,
    assistantMessageId: string,
  ): Promise<GeminiContent[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        NOT: { id: assistantMessageId },
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages
      .filter((m) => m.content && m.content.trim().length > 0)
      .map((m) => ({
        role: m.role === 'USER' ? ('user' as const) : ('model' as const),
        parts: [{ text: m.content ?? '' }],
      }));
  }

  // ─── Stream Gemini response (SSE) ───────────────────────────────────────────
  async *streamResponse(
    chatId: string,
    assistantMessageId: string,
  ): AsyncGenerator<string> {
    const apiKey = this.configService.googleApiKey;
    if (!apiKey) {
      yield `data: ${JSON.stringify({ type: 'error', message: 'GOOGLE_API_KEY is not configured' })}\n\n`;
      return;
    }

    // Check if this message was already pre-filled (e.g. daily limit exceeded)
    const assistantMsg = await this.prisma.message.findUnique({
      where: { id: assistantMessageId },
    });

    if (
      assistantMsg &&
      assistantMsg.content &&
      assistantMsg.content.trim().length > 0
    ) {
      yield `data: ${JSON.stringify({ type: 'token', token: assistantMsg.content })}\n\n`;
      yield `data: ${JSON.stringify({ type: 'done' })}\n\n`;
      return;
    }

    const history = await this.buildHistory(chatId, assistantMessageId);

    if (history.length === 0) {
      yield 'data: {"type":"error","message":"No message history found"}\n\n';
      return;
    }

    const url = `${this.geminiBaseUrl}?key=${apiKey}&alt=sse`;

    const requestBody = {
      system_instruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents: history,
      generationConfig: {
        temperature: 0.45,
        maxOutputTokens: 280,
        topP: 0.85,
      },
    };

    let fullText = '';

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, requestBody, {
          responseType: 'stream',
          headers: { 'Content-Type': 'application/json' },
          timeout: 60_000,
        }),
      );

      const stream: NodeJS.ReadableStream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;

          try {
            const parsed: GeminiStreamChunk = JSON.parse(payload);
            const token =
              parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            if (token) {
              fullText += token;
              yield `data: ${JSON.stringify({ type: 'token', token })}\n\n`;
            }
          } catch {
            // skip malformed chunk
          }
        }
      }
    } catch (error: any) {
      this.logger.error('Gemini streaming error:', error?.message);
      yield `data: ${JSON.stringify({ type: 'error', message: 'AI response failed. Please try again.' })}\n\n`;
    } finally {
      const finalContent =
        fullText.trim() || 'AI response failed. Please try again.';
      try {
        await this.prisma.message.update({
          where: { id: assistantMessageId },
          data: { content: finalContent },
        });
      } catch (e) {
        this.logger.warn('Failed to persist assistant message:', e);
      }
      yield `data: ${JSON.stringify({ type: 'done' })}\n\n`;
    }
  }
}
