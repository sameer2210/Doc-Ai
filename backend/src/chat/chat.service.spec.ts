import type { ConfigService } from '@config/config.service';
import type { HttpService } from '@nestjs/axios';
import { PrismaService } from '@prisma-local/prisma.service';
import type { Prisma } from '@prisma/client';
import { ChatService } from './chat.service';
import type { GeminiRateLimitService } from './gemini-rate-limit.service';
import { GeminiProviderService } from './services/gemini-provider.service';
import { ChatHistoryService } from './services/chat-history.service';
import { ChatPersistenceService } from './services/chat-persistence.service';
import type { AppLogger } from '@common/logger/logger.service';
import { BodyInsightService } from '../body-insight/body-insight.service';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { of } from 'rxjs';
import { Readable } from 'stream';

type ProviderErrorDetails = {
  code: string;
  message: string;
  providerStatus?: number;
};

describe('ChatService unit tests', () => {
  const chatFindFirst = jest.fn();
  const chatCreate = jest.fn();
  const messageCreate = jest.fn();
  const messageFindFirst = jest.fn();
  const messageFindMany = jest.fn();
  const messageUpdateMany = jest.fn();
  const transaction = jest.fn();
  const checkAndIncrementLimit = jest.fn();
  const buildHistory = jest.fn();
  const httpPost = jest.fn();

  const configServiceMock = {
    googleApiKey: 'test-google-api-key',
    googleGeminiModel: 'gemini-2.5-flash',
  } as unknown as ConfigService;

  const geminiProviderService = new GeminiProviderService(configServiceMock);

  const prismaMock = {
    chat: {
      findFirst: chatFindFirst,
      create: chatCreate,
    },
    message: {
      create: messageCreate,
      findFirst: messageFindFirst,
      findMany: messageFindMany,
      updateMany: messageUpdateMany,
    },
    $transaction: transaction,
  } as unknown as PrismaService;

  const chatPersistenceService = new ChatPersistenceService(
    prismaMock,
    {
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
    } as unknown as AppLogger,
  );

  const chatHistoryService = {
    buildHistory: buildHistory,
  } as unknown as ChatHistoryService;

  const httpServiceMock = {
    post: httpPost,
  } as unknown as HttpService;

  const bodyInsightServiceMock = {
    getUserContext: jest.fn().mockResolvedValue(null),
  } as unknown as BodyInsightService;

  const service = new ChatService(
    prismaMock,
    httpServiceMock,
    configServiceMock,
    {
      checkAndIncrementLimit,
    } as unknown as GeminiRateLimitService,
    geminiProviderService,
    chatHistoryService,
    chatPersistenceService,
    bodyInsightServiceMock,
  );

  const buildProviderError = geminiProviderService.buildProviderError.bind(geminiProviderService);
  const persistAssistantError = (
    service as unknown as { persistAssistantError: CallableFunction }
  ).persistAssistantError.bind(service);

  beforeEach(() => {
    jest.clearAllMocks();
    (configServiceMock as any).googleApiKey = 'test-google-api-key';
    chatFindFirst.mockResolvedValue({ id: 'chat-1', userId: 'user-1' });
    messageFindFirst.mockResolvedValue(null);
    transaction.mockImplementation((arg: any) => {
      if (typeof arg === 'function') {
        const mockTx = {
          chat: { findFirst: chatFindFirst, create: chatCreate },
          message: {
            create: messageCreate,
            findFirst: messageFindFirst,
            findMany: messageFindMany,
            updateMany: messageUpdateMany,
          },
          $executeRaw: jest.fn().mockResolvedValue(1),
        };
        return arg(mockTx);
      }
      return Promise.all(arg);
    });
  });

  describe('Original tests', () => {
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
        'Immature_Cataract',
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
          prediction: 'Immature_Cataract',
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
            prediction: 'Immature_Cataract',
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
            prediction: 'Immature_Cataract',
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

  describe('ensureDefaultChat', () => {
    it('returns existing chat if one is found', async () => {
      chatFindFirst.mockResolvedValueOnce({ id: 'chat-existing' });

      const result = await service.ensureDefaultChat('user-1');

      expect(result).toBe('chat-existing');
      expect(chatCreate).not.toHaveBeenCalled();
    });

    it('creates default chat if none is found', async () => {
      chatFindFirst.mockResolvedValueOnce(null);
      chatCreate.mockResolvedValueOnce({ id: 'chat-new' });

      const result = await service.ensureDefaultChat('user-1');

      expect(result).toBe('chat-new');
      expect(chatCreate).toHaveBeenCalledWith({
        data: { userId: 'user-1', title: 'AI Health Consultation' },
      });
    });

    it('throws InternalServerErrorException when transaction fails', async () => {
      transaction.mockRejectedValueOnce(new Error('concurrency deadlock'));

      await expect(service.ensureDefaultChat('user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('listMessages', () => {
    it('throws ForbiddenException if chat does not belong to user', async () => {
      chatFindFirst.mockResolvedValueOnce(null);

      await expect(service.listMessages('chat-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException if cursor does not exist', async () => {
      chatFindFirst.mockResolvedValueOnce({ id: 'chat-1' });
      messageFindFirst.mockResolvedValueOnce(null);

      await expect(
        service.listMessages('chat-1', 'user-1', 'invalid-cursor'),
      ).rejects.toThrow(BadRequestException);
    });

    it('correctly maps message statuses like stale pending', async () => {
      chatFindFirst.mockResolvedValueOnce({ id: 'chat-1' });
      messageFindMany.mockResolvedValueOnce([
        {
          id: 'msg-1',
          chatId: 'chat-1',
          role: 'ASSISTANT',
          content: '',
          metadata: { streamState: 'pending' },
          createdAt: new Date(Date.now() - 100_000), // > 90 seconds
        },
        {
          id: 'msg-2',
          chatId: 'chat-1',
          role: 'ASSISTANT',
          content: 'fresh response',
          metadata: { streamState: 'complete' },
          createdAt: new Date(),
        },
      ]);

      const result = await service.listMessages('chat-1', 'user-1');

      expect(result.items[0].status).toBe('error'); // stale pending mapped to error
      expect(result.items[1].status).toBe('complete');
    });
  });

  describe('saveUserMessage', () => {
    it('saves USER and ASSISTANT pair with correct time offsets and optional attachments', async () => {
      const uMsgMock = {
        id: 'user-msg-1',
        content: 'hello',
        createdAt: new Date('2026-06-12T10:00:00.000Z'),
      };
      const aMsgMock = {
        id: 'assistant-msg-1',
        createdAt: new Date('2026-06-12T10:00:00.001Z'),
      };

      messageCreate
        .mockResolvedValueOnce(uMsgMock)
        .mockResolvedValueOnce(aMsgMock);

      const attachments = [
        { id: 'att-1', name: 'image.png', mimeType: 'image/png', size: 100, serverUrl: 'http://s3' },
      ];

      const result = await service.saveUserMessage(
        'chat-1',
        'user-1',
        'hello',
        attachments,
      );

      expect(result).toEqual({
        userMessage: {
          id: 'user-msg-1',
          chatId: 'chat-1',
          role: 'user',
          content: 'hello',
          createdAt: uMsgMock.createdAt.toISOString(),
          status: 'complete',
        },
        assistantMessageId: 'assistant-msg-1',
      });

      expect(messageCreate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'USER',
            content: 'hello',
            metadata: { attachments },
          }),
        }),
      );
    });
  });

  describe('startConsultation', () => {
    it('sets correct confidence classifications', async () => {
      checkAndIncrementLimit.mockResolvedValueOnce({ allowed: true });
      messageCreate
        .mockResolvedValueOnce({ id: 'u', createdAt: new Date() })
        .mockResolvedValueOnce({ id: 'a', createdAt: new Date() });

      await service.startConsultation('chat-1', 'Immature_Cataract', 0.72, 'user-1');

      expect(messageCreate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              confidenceText: 'MODERATE_CONFIDENCE',
              confidenceLevel: 'Moderate',
            }),
          }),
        }),
      );
    });
  });

  describe('streamResponse async generator', () => {
    it('yields error if duplicate stream is initiated for same message', async () => {
      (service as any).activeAssistantStreams.add('user-1:msg-dup');

      const generator = service.streamResponse('chat-1', 'msg-dup', 'user-1');
      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks[0]).toContain('DUPLICATE_STREAM');
      (service as any).activeAssistantStreams.clear();
    });

    it('yields error if Google API key is missing', async () => {
      chatFindFirst.mockResolvedValueOnce({ userId: 'user-1' });
      (configServiceMock as any).googleApiKey = undefined;

      const generator = service.streamResponse('chat-1', 'msg-1', 'user-1');
      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks[0]).toContain('CONFIGURATION_ERROR');
    });

    it('uses cached content shortcut if assistant message is already populated', async () => {
      chatFindFirst.mockResolvedValueOnce({ userId: 'user-1' });
      (configServiceMock as any).googleApiKey = 'mock-key';
      prismaMock.message.findFirst = jest.fn().mockResolvedValueOnce({
        id: 'msg-1',
        content: 'previously saved AI advice',
      });

      const generator = service.streamResponse('chat-1', 'msg-1', 'user-1');
      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks[0]).toContain('previously saved AI advice');
      expect(chunks[1]).toContain('done');
    });

    it('streams tokens successfully from provider SSE stream chunks', async () => {
      chatFindFirst.mockResolvedValueOnce({ userId: 'user-1' });
      (configServiceMock as any).googleApiKey = 'mock-key';
      prismaMock.message.findFirst = jest.fn().mockResolvedValueOnce({
        id: 'msg-1',
        content: '',
      });
      buildHistory.mockResolvedValueOnce({
        contents: [{ role: 'user', parts: [{ text: 'question' }] }],
        totalChars: 8,
        estimatedInputTokens: 5,
      });

      const mockStream = new Readable({
        read() {},
      });

      httpPost.mockReturnValueOnce(of({ data: mockStream, status: 200 }));
      const successPersistedSpy = jest.spyOn(chatPersistenceService, 'persistAssistantSuccessSafe').mockResolvedValueOnce(true);

      const generator = service.streamResponse('chat-1', 'msg-1', 'user-1');

      setTimeout(() => {
        mockStream.push('data: {"candidates":[{"content":{"parts":[{"text":"Ayurvedic "}]}}]}\n\n');
        mockStream.push('data: {"candidates":[{"content":{"parts":[{"text":"treatment "}]}}]}\n\n');
        mockStream.push('data: [DONE]\n\n');
        mockStream.push(null); // EOF
      }, 50);

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toContain('Ayurvedic ');
      expect(chunks[1]).toContain('treatment ');
      expect(chunks[2]).toContain('done');
      expect(successPersistedSpy).toHaveBeenCalledWith(
        'chat-1',
        'msg-1',
        'Ayurvedic treatment',
        expect.any(Object),
      );
    });

    it('handles stream abort mid-stream and yields abort code', async () => {
      chatFindFirst.mockResolvedValueOnce({ userId: 'user-1' });
      (configServiceMock as any).googleApiKey = 'mock-key';
      prismaMock.message.findFirst = jest.fn().mockResolvedValueOnce({
        id: 'msg-1',
        content: '',
      });
      buildHistory.mockResolvedValueOnce({
        contents: [{ role: 'user', parts: [{ text: 'question' }] }],
      });

      const mockStream = new Readable({
        read() {},
      });
      httpPost.mockReturnValueOnce(of({ data: mockStream, status: 200 }));

      const controller = new AbortController();
      const generator = service.streamResponse('chat-1', 'msg-1', 'user-1', {
        signal: controller.signal,
      });

      setTimeout(() => {
        mockStream.push('data: {"candidates":[{"content":{"parts":[{"text":"Start "}]}}]}\n\n');
      }, 20);

      const firstResult = await generator.next();
      expect(firstResult.value).toContain('Start ');

      const errorPersistedSpy = jest.spyOn(chatPersistenceService, 'persistAssistantErrorSafe').mockResolvedValueOnce(true);

      // Abort mid-stream
      controller.abort();
      // Push another chunk so the generator loops once and evaluates signal.aborted
      mockStream.push('data: {"candidates":[{"content":{"parts":[{"text":"interrupted"}]}}]}\n\n');
      mockStream.push(null); // EOF

      const secondResult = await generator.next();
      expect(secondResult.done).toBe(true);

      expect(errorPersistedSpy).toHaveBeenCalledWith(
        'chat-1',
        'msg-1',
        expect.objectContaining({ code: 'STREAM_ABORTED' }),
      );
    });

    it('appends Body Insight context if one is returned by the service', async () => {
      chatFindFirst.mockResolvedValueOnce({ userId: 'user-1' });
      (configServiceMock as any).googleApiKey = 'mock-key';
      prismaMock.message.findFirst = jest.fn().mockResolvedValueOnce({
        id: 'msg-1',
        content: '',
      });
      buildHistory.mockResolvedValueOnce({
        contents: [{ role: 'user', parts: [{ text: 'question' }] }],
        totalChars: 8,
        estimatedInputTokens: 5,
      });

      const mockContext = {
        age: 40,
        gender: 'FEMALE' as any,
        diabetes: true,
        hypertension: false,
        blurredVision: false,
        nightVisionDifficulty: false,
        halosAroundLights: false,
        familyHistoryOfCataract: true,
      };
      jest.spyOn(bodyInsightServiceMock, 'getUserContext').mockResolvedValueOnce(mockContext);

      const mockStream = new Readable({
        read() {},
      });
      httpPost.mockReturnValueOnce(of({ data: mockStream, status: 200 }));

      const generator = service.streamResponse('chat-1', 'msg-1', 'user-1');

      setTimeout(() => {
        mockStream.push('data: {"candidates":[{"content":{"parts":[{"text":"Response "}]}}]}\n\n');
        mockStream.push('data: [DONE]\n\n');
        mockStream.push(null);
      }, 50);

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(httpPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          system_instruction: {
            parts: [
              {
                text: expect.stringContaining('"diabetes": true'),
              },
            ],
          },
        }),
        expect.any(Object),
      );
    });

    it('continues streaming without Body Insight context if getUserContext throws an error', async () => {
      chatFindFirst.mockResolvedValueOnce({ userId: 'user-1' });
      (configServiceMock as any).googleApiKey = 'mock-key';
      prismaMock.message.findFirst = jest.fn().mockResolvedValueOnce({
        id: 'msg-1',
        content: '',
      });
      buildHistory.mockResolvedValueOnce({
        contents: [{ role: 'user', parts: [{ text: 'question' }] }],
        totalChars: 8,
        estimatedInputTokens: 5,
      });

      jest.spyOn(bodyInsightServiceMock, 'getUserContext').mockRejectedValueOnce(new Error('Fetch failed'));

      const mockStream = new Readable({
        read() {},
      });
      httpPost.mockReturnValueOnce(of({ data: mockStream, status: 200 }));

      const generator = service.streamResponse('chat-1', 'msg-1', 'user-1');

      setTimeout(() => {
        mockStream.push('data: {"candidates":[{"content":{"parts":[{"text":"Response "}]}}]}\n\n');
        mockStream.push('data: [DONE]\n\n');
        mockStream.push(null);
      }, 50);

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks[0]).toContain('Response ');
      expect(httpPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          system_instruction: {
            parts: [
              {
                text: expect.not.stringContaining('Additional Context:'),
              },
            ],
          },
        }),
        expect.any(Object),
      );
    });
  });
});
