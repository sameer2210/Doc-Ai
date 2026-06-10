import type { ConfigService } from '@config/config.service';
import type { HttpService } from '@nestjs/axios';
import type { PrismaService } from '@prisma-local/prisma.service';
import type { Prisma } from '@prisma/client';
import { ChatService } from './chat.service';
import type { GeminiRateLimitService } from './gemini-rate-limit.service';

type ProviderErrorDetails = {
  code: string;
  message: string;
  providerStatus?: number;
};

describe('ChatService error classification', () => {
  const chatFindFirst = jest.fn();
  const messageCreate = jest.fn();
  const messageFindFirst = jest.fn();
  const messageFindMany = jest.fn();
  const messageUpdateMany = jest.fn();
  const transaction = jest.fn();
  const checkAndIncrementLimit = jest.fn();

  const service = new ChatService(
    {
      chat: {
        findFirst: chatFindFirst,
      },
      message: {
        create: messageCreate,
        findFirst: messageFindFirst,
        findMany: messageFindMany,
        updateMany: messageUpdateMany,
      },
      $transaction: transaction,
    } as unknown as PrismaService,
    {} as HttpService,
    {} as ConfigService,
    {
      checkAndIncrementLimit,
    } as unknown as GeminiRateLimitService,
  );

  const buildProviderError = (
    service as unknown as { buildProviderError: CallableFunction }
  ).buildProviderError.bind(service);
  const persistAssistantError = (
    service as unknown as { persistAssistantError: CallableFunction }
  ).persistAssistantError.bind(service);

  beforeEach(() => {
    jest.clearAllMocks();
    chatFindFirst.mockResolvedValue({ id: 'chat-1' });
    transaction.mockImplementation((operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
    );
  });

  it('persists a daily-limit result on the existing scan assistant message', async () => {
    checkAndIncrementLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
    });
    messageCreate
      .mockResolvedValueOnce({
        id: 'user-message-1',
        chatId: 'chat-1',
        content: 'Eye Scan Result',
        createdAt: new Date('2026-06-10T10:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'assistant-message-1',
        chatId: 'chat-1',
        content: '',
        createdAt: new Date('2026-06-10T10:00:00.001Z'),
      });

    const result = await service.startConsultation(
      'chat-1',
      'Immature',
      0.87,
      'user-1',
    );

    expect(result).toMatchObject({
      assistantMessageId: 'assistant-message-1',
      limitReached: true,
    });
    expect(messageCreate).toHaveBeenCalledTimes(2);
    expect(messageCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'ASSISTANT',
          content: '',
          metadata: expect.objectContaining({
            type: 'scan_result',
            streamState: 'error',
            errorCode: 'DAILY_LIMIT_REACHED',
          }),
        }),
      }),
    );
    const userCreateInput = messageCreate.mock.calls[0][0] as {
      data: { createdAt: Date };
    };
    const assistantCreateInput = messageCreate.mock.calls[1][0] as {
      data: { createdAt: Date };
    };
    expect(assistantCreateInput.data.createdAt.getTime()).toBe(
      userCreateInput.data.createdAt.getTime() + 1,
    );
  });

  it('maps Gemini 429 responses to provider rate limits', () => {
    const result = buildProviderError({
      response: {
        status: 429,
        data: {
          error: {
            message: 'Resource has been exhausted',
          },
        },
      },
      message: 'Request failed with status code 429',
    }) as ProviderErrorDetails;

    expect(result).toEqual({
      code: 'PROVIDER_RATE_LIMIT',
      message: 'AI provider quota exceeded.',
      providerStatus: 429,
    });
  });

  it('maps other Gemini failures to provider errors', () => {
    const result = buildProviderError({
      status: 503,
      message: 'Service unavailable',
    }) as ProviderErrorDetails;

    expect(result).toEqual({
      code: 'PROVIDER_ERROR',
      message: 'AI service unavailable.',
      providerStatus: 503,
    });
  });

  it('persists provider errors without copying messages into content', async () => {
    messageFindFirst.mockResolvedValue({
      metadata: {
        type: 'scan_result',
        prediction: 'Immature',
        confidence: 0.87,
      } as Prisma.JsonObject,
    });
    messageUpdateMany.mockResolvedValue({ count: 1 });

    await persistAssistantError('chat-1', 'assistant-message-1', {
      code: 'PROVIDER_RATE_LIMIT',
      message: 'AI provider quota exceeded.',
      providerStatus: 429,
    });

    expect(messageUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'assistant-message-1',
        chatId: 'chat-1',
        role: 'ASSISTANT',
      },
      data: {
        content: '',
        metadata: {
          type: 'scan_result',
          prediction: 'Immature',
          confidence: 0.87,
          streamState: 'error',
          errorCode: 'PROVIDER_RATE_LIMIT',
          providerStatus: 429,
        },
      },
    });
  });

  it('does not hydrate legacy metadata error messages into content', async () => {
    messageFindMany.mockResolvedValue([
      {
        id: 'assistant-message-1',
        chatId: 'chat-1',
        role: 'ASSISTANT',
        content: '',
        createdAt: new Date('2026-06-10T10:00:00.001Z'),
        metadata: {
          type: 'scan_result',
          prediction: 'Immature',
          confidence: 0.87,
          streamState: 'error',
          errorCode: 'PROVIDER_RATE_LIMIT',
          errorMessage: 'AI provider quota exceeded.',
        },
      },
    ]);

    const result = await service.listMessages('chat-1', 'user-1');

    expect(result.items).toEqual([
      expect.objectContaining({
        content: '',
        status: 'error',
        errorCode: 'PROVIDER_RATE_LIMIT',
        type: 'scan_result',
      }),
    ]);
  });
});
