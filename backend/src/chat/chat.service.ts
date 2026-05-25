import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '@prisma-local/prisma.service';
import { ConfigService } from '@config/config.service';

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
const SYSTEM_INSTRUCTION = `You are a compassionate senior Ayurvedic clinical consultant with 15+ years of experience. 
You provide holistic health guidance combining modern clinical findings with traditional Ayurvedic wisdom.

When a patient shares an eye scan / cataract detection result:
1. Acknowledge the result warmly and clearly
2. Explain what the result means in simple language
3. Give Ayurvedic perspective on eye health (Netra Roga / Drishti Dosha)
4. Provide practical dietary recommendations for eye health (Triphala, Shatavari, carrots, ghee)
5. Suggest lifestyle modifications and yoga/pranayama for eyes (Trataka, Palming, eye exercises)
6. Recommend Ayurvedic herbs (Amalaki, Triphala Ghee, Saptamrita Lauh)
7. Advise on when to see an ophthalmologist

Keep your response warm, clear, and actionable. Use simple language.
Format with clear sections and bullet points. Include a safety disclaimer at the end.`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly geminiBaseUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent';

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

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
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return {
      items: items.map((m) => ({
        id: m.id,
        chatId: m.chatId,
        role: m.role.toLowerCase() as 'user' | 'assistant',
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        status: 'complete',
      })),
      nextCursor,
    };
  }

  // ─── Save a user message + create a placeholder assistant message ────────────
  async saveUserMessage(chatId: string, content: string) {
    // Ensure the chat exists (upsert-like pattern)
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

  // ─── Build Gemini conversation history ──────────────────────────────────────
  private async buildHistory(chatId: string, assistantMessageId: string): Promise<GeminiContent[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        NOT: { id: assistantMessageId },
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({
        role: m.role === 'USER' ? ('user' as const) : ('model' as const),
        parts: [{ text: m.content }],
      }));
  }

  // ─── Stream Gemini response (SSE) ───────────────────────────────────────────
  async *streamResponse(
    chatId: string,
    assistantMessageId: string,
  ): AsyncGenerator<string> {
    const apiKey = this.configService.googleApiKey;
    if (!apiKey) {
      throw new BadRequestException('GOOGLE_API_KEY is not configured');
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
        temperature: 0.7,
        maxOutputTokens: 1024,
        topP: 0.95,
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
      // Persist the full response to DB
      if (fullText) {
        try {
          await this.prisma.message.update({
            where: { id: assistantMessageId },
            data: { content: fullText },
          });
        } catch (e) {
          this.logger.warn('Failed to persist assistant message:', e);
        }
      }
      yield `data: ${JSON.stringify({ type: 'done' })}\n\n`;
    }
  }
}
