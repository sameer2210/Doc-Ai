import {
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { HttpService } from '@nestjs/axios';
import type { ConfigService } from '@config/config.service';
import type { PrismaService } from '@prisma-local/prisma.service';
import type { UploadsService } from '../uploads/uploads.service';
import type { PredictImageDto } from './dto/predict-image.dto';
import type { Upload } from '@prisma/client';
import { AiService } from './ai.service';
import { of, throwError } from 'rxjs';
import type { AxiosResponse } from 'axios';
import { Buffer } from 'node:buffer';

function buildPngBuffer(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24);
  buffer[0] = 0x89;
  buffer[1] = 0x50;
  buffer[2] = 0x4e;
  buffer[3] = 0x47;
  buffer[4] = 0x0d;
  buffer[5] = 0x0a;
  buffer[6] = 0x1a;
  buffer[7] = 0x0a;
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 4, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

const mockAxiosConfig = {} as AxiosResponse['config'];
const mockAxiosHeaders = {} as AxiosResponse['headers'];
const emptyDto: PredictImageDto = {};

describe('AiService', () => {
  let service: AiService;
  let httpService: { post: jest.Mock };
  let prisma: {
    chat: { findFirst: jest.Mock; create: jest.Mock };
    aiPrediction: { count: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
    message: { create: jest.Mock };
    upload: { update: jest.Mock };
    $transaction: jest.Mock;
  };
  let configService: Record<string, unknown>;
  let uploadsService: { uploadFile: jest.Mock };

  beforeEach(() => {
    httpService = {
      post: jest.fn().mockImplementation((url: string) => {
        if (url && typeof url === 'string' && url.includes('eye-detection')) {
          return of({
            data: { success: true, eyeDetected: true, confidence: 0.95, boundingBox: null, processingTime: 50 },
            status: 200,
            statusText: 'OK',
            headers: mockAxiosHeaders,
            config: mockAxiosConfig,
          });
        }
        return of({
          data: { prediction: 'Normal', confidence: 0.99 },
          status: 200,
          statusText: 'OK',
          headers: mockAxiosHeaders,
          config: mockAxiosConfig,
        });
      }),
    };

    prisma = {
      chat: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      aiPrediction: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      message: {
        create: jest.fn(),
      },
      upload: {
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    configService = {
      cataractModelApiUrl: 'https://cataract-detection-235799044931.asia-south1.run.app/predict',
      eyeDetectionModelApiUrl: 'https://eye-detection-235799044931.asia-south1.run.app/predict',
      mlGatewayTimeoutMs: 15000,
      mlGatewayMaxRetries: 2,
    };

    uploadsService = {
      uploadFile: jest.fn(),
    };

    service = new AiService(
      httpService as unknown as HttpService,
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
      uploadsService as unknown as UploadsService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('predictCataract', () => {
    const validFile = {
      buffer: buildPngBuffer(1024, 768),
      mimetype: 'image/png',
      size: 1024 * 1024,
      originalname: 'eye.png',
    } as Express.Multer.File;

    it('successfully processes cataract prediction flow (happy path)', async () => {
      const uploadRecord = { id: 'upload-123', fileUrl: 'https://s3/eye.png' };
      uploadsService.uploadFile.mockResolvedValue({
        success: true,
        data: uploadRecord as Upload,
        message: 'Uploaded',
      });

      const eyeResponse: AxiosResponse = {
        data: { success: true, eyeDetected: true, confidence: 0.95, boundingBox: null, processingTime: 100 },
        status: 200,
        statusText: 'OK',
        headers: mockAxiosHeaders,
        config: mockAxiosConfig,
      };
      const cataractResponse: AxiosResponse = {
        data: { prediction: 'Immature', confidence: 0.87 },
        status: 200,
        statusText: 'OK',
        headers: mockAxiosHeaders,
        config: mockAxiosConfig,
      };
      httpService.post.mockImplementation((url: string) => {
        if (url.includes('eye-detection')) {
          return of(eyeResponse);
        }
        return of(cataractResponse);
      });

      prisma.chat.findFirst.mockResolvedValue({ id: 'chat-1' });

      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const txMock = {
          message: {
            create: jest.fn().mockResolvedValue({ id: 'msg-456' }),
          },
          upload: {
            update: jest.fn().mockResolvedValue({}),
          },
          aiPrediction: {
            create: jest.fn().mockResolvedValue({
              id: 'pred-789',
              prediction: 'Immature',
              confidence: 0.87,
            }),
          },
        };
        return callback(txMock);
      });

      const result = await service.predictCataract(
        validFile,
        { chatId: 'chat-1' },
        'user-abc',
      );

      expect(result).toEqual({
        prediction: 'Immature',
        confidence: 0.87,
        uploadedImageUrl: 'https://s3/eye.png',
        chatId: 'chat-1',
        eyeValidation: {
          status: 'PERFORMED',
        },
      });

      expect(uploadsService.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({ mimetype: 'image/png' }),
        'user-abc',
        undefined,
      );
      expect(httpService.post).toHaveBeenCalledWith(
        'https://cataract-detection-235799044931.asia-south1.run.app/predict',
        expect.any(FormData),
        expect.objectContaining({ timeout: 15000 }),
      );
    });

    it('halts processing and throws BadRequestException when Eye Detection returns eyeDetected: false', async () => {
      const uploadRecord = { id: 'upload-123', fileUrl: 'https://s3/eye.png' };
      uploadsService.uploadFile.mockResolvedValue({
        success: true,
        data: uploadRecord as Upload,
        message: 'Uploaded',
      });

      const eyeResponse: AxiosResponse = {
        data: { success: true, eyeDetected: false, confidence: 0, boundingBox: null, processingTime: 120 },
        status: 200,
        statusText: 'OK',
        headers: mockAxiosHeaders,
        config: mockAxiosConfig,
      };
      httpService.post.mockReturnValueOnce(of(eyeResponse));

      await expect(
        service.predictCataract(validFile, emptyDto, 'user-abc'),
      ).rejects.toThrow(BadRequestException);

      expect(uploadsService.uploadFile).toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('degrades gracefully and sets eyeValidation.status SKIPPED when Eye Detection service throws retryable 503 error', async () => {
      const uploadRecord = { id: 'upload-123', fileUrl: 'https://s3/eye.png' };
      uploadsService.uploadFile.mockResolvedValue({
        success: true,
        data: uploadRecord as Upload,
        message: 'Uploaded',
      });

      const eyeError = new ServiceUnavailableException('Eye service offline');
      const cataractResponse: AxiosResponse = {
        data: { prediction: 'Immature', confidence: 0.88 },
        status: 200,
        statusText: 'OK',
        headers: mockAxiosHeaders,
        config: mockAxiosConfig,
      };

      httpService.post.mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('eye-detection')) {
          return throwError(() => eyeError);
        }
        return of(cataractResponse);
      });

      const createPredictionSpy = jest.fn().mockResolvedValue({
        id: 'pred-789',
        prediction: 'Immature',
        confidence: 0.88,
      });

      prisma.chat.findFirst.mockResolvedValue({ id: 'chat-1' });
      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const txMock = {
          message: { create: jest.fn().mockResolvedValue({ id: 'msg-456' }) },
          upload: { update: jest.fn().mockResolvedValue({}) },
          aiPrediction: {
            create: createPredictionSpy,
          },
        };
        return callback(txMock);
      });

      const result = await service.predictCataract(validFile, { chatId: 'chat-1' }, 'user-abc');

      expect(result.eyeValidation).toEqual({
        status: 'SKIPPED',
        message: 'Eye validation could not be completed because the validation service was temporarily unavailable.',
      });
      expect(result.eyeValidation).not.toHaveProperty('reason');
      expect(result.prediction).toBe('Immature');

      expect(createPredictionSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rawMlResponse: expect.objectContaining({
            prediction: 'Immature',
            confidence: 0.88,
            eyeValidation: expect.objectContaining({
              status: 'SKIPPED',
              reason: 'SERVICE_UNAVAILABLE',
            }),
          }),
        }),
      });
    });

    it('halts processing and throws when Eye Detection encounters ENOTFOUND (DNS failure)', async () => {
      const uploadRecord = { id: 'upload-123', fileUrl: 'https://s3/eye.png' };
      uploadsService.uploadFile.mockResolvedValue({
        success: true,
        data: uploadRecord as Upload,
        message: 'Uploaded',
      });

      const dnsError = { code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND invalid-host' };
      const cataractResponse: AxiosResponse = {
        data: { prediction: 'Normal', confidence: 0.99 },
        status: 200,
        statusText: 'OK',
        headers: mockAxiosHeaders,
        config: mockAxiosConfig,
      };

      httpService.post.mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('eye-detection')) {
          return throwError(() => dnsError);
        }
        return of(cataractResponse);
      });

      await expect(
        service.predictCataract(validFile, emptyDto, 'user-abc'),
      ).rejects.toThrow();

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('halts processing and throws if Eye Detection returns corrupted schema', async () => {
      const uploadRecord = { id: 'upload-123', fileUrl: 'https://s3/eye.png' };
      uploadsService.uploadFile.mockResolvedValue({
        success: true,
        data: uploadRecord as Upload,
        message: 'Uploaded',
      });

      const corruptedResponse = {
        data: { invalidSchema: true },
        status: 200,
        statusText: 'OK',
        headers: mockAxiosHeaders,
        config: mockAxiosConfig,
      };

      httpService.post.mockReturnValueOnce(of(corruptedResponse));

      await expect(
        service.predictCataract(validFile, emptyDto, 'user-abc'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('creates a default chat if none exists', async () => {
      const uploadRecord = { id: 'upload-123', fileUrl: 'https://s3/eye.png' };
      uploadsService.uploadFile.mockResolvedValue({
        success: true,
        data: uploadRecord as Upload,
        message: 'Uploaded',
      });

      const eyeSuccessResponse = {
        data: { success: true, eyeDetected: true, confidence: 0.95, boundingBox: null, processingTime: 50 },
        status: 200,
        statusText: 'OK',
        headers: mockAxiosHeaders,
        config: mockAxiosConfig,
      };
      const modelResponse: AxiosResponse = {
        data: { prediction: 'Normal', confidence: 0.99 },
        status: 200,
        statusText: 'OK',
        headers: mockAxiosHeaders,
        config: mockAxiosConfig,
      };
      httpService.post.mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('eye-detection')) {
          return of(eyeSuccessResponse);
        }
        return of(modelResponse);
      });

      prisma.chat.findFirst.mockResolvedValue(null);
      prisma.chat.create.mockResolvedValue({ id: 'chat-new' });

      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const txMock = {
          message: {
            create: jest.fn().mockResolvedValue({ id: 'msg-456' }),
          },
          upload: {
            update: jest.fn().mockResolvedValue({}),
          },
          aiPrediction: {
            create: jest.fn().mockResolvedValue({
              id: 'pred-789',
              prediction: 'Normal',
              confidence: 0.99,
            }),
          },
        };
        return callback(txMock);
      });

      const result = await service.predictCataract(
        validFile,
        emptyDto,
        'user-abc',
      );

      expect(result.chatId).toBe('chat-new');
      expect(prisma.chat.create).toHaveBeenCalledWith({
        data: { userId: 'user-abc', title: 'AI Health Consultation' },
      });
    });

    it('halts processing and throws if image fails file validation', async () => {
      const invalidFile = {
        buffer: Buffer.from('not-a-png'),
        mimetype: 'image/png',
        size: 10,
        originalname: 'bad.png',
      } as Express.Multer.File;

      await expect(
        service.predictCataract(invalidFile, emptyDto, 'user-abc'),
      ).rejects.toThrow(BadRequestException);

      expect(uploadsService.uploadFile).not.toHaveBeenCalled();
    });

    it('fails gracefully and throws if upload service fails', async () => {
      uploadsService.uploadFile.mockRejectedValue(
        new InternalServerErrorException('S3 failure'),
      );

      await expect(
        service.predictCataract(validFile, emptyDto, 'user-abc'),
      ).rejects.toThrow(InternalServerErrorException);

      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('retries when Cataract Detection Model returns retryable 503 error, then exhausts retries and throws', async () => {
      const uploadRecord = { id: 'upload-123', fileUrl: 'https://s3/eye.png' };
      uploadsService.uploadFile.mockResolvedValue({
        success: true,
        data: uploadRecord as Upload,
        message: 'Uploaded',
      });

      const eyeSuccessResponse = {
        data: { success: true, eyeDetected: true, confidence: 0.95, boundingBox: null, processingTime: 50 },
        status: 200,
        statusText: 'OK',
        headers: mockAxiosHeaders,
        config: mockAxiosConfig,
      };
      const errorResponse = {
        response: { status: 503, data: { message: 'Model loading' } },
        message: 'Service Unavailable',
      };
      httpService.post.mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('eye-detection')) {
          return of(eyeSuccessResponse);
        }
        return throwError(() => errorResponse);
      });

      await expect(
        service.predictCataract(validFile, emptyDto, 'user-abc'),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(httpService.post).toHaveBeenCalledTimes(4); // 1 Eye Detection call + 3 Cataract Detection retries
    }, 15000);

    it('succeeds if a retry succeeds', async () => {
      const uploadRecord = { id: 'upload-123', fileUrl: 'https://s3/eye.png' };
      uploadsService.uploadFile.mockResolvedValue({
        success: true,
        data: uploadRecord as Upload,
        message: 'Uploaded',
      });

      const eyeSuccessResponse = {
        data: { success: true, eyeDetected: true, confidence: 0.95, boundingBox: null, processingTime: 50 },
        status: 200,
        statusText: 'OK',
        headers: mockAxiosHeaders,
        config: mockAxiosConfig,
      };
      const errorResponse = {
        response: { status: 503, data: { message: 'Model loading' } },
        message: 'Service Unavailable',
      };
      const cataractResponse: AxiosResponse = {
        data: { prediction: 'Mature', confidence: 0.95 },
        status: 200,
        statusText: 'OK',
        headers: mockAxiosHeaders,
        config: mockAxiosConfig,
      };

      let cataractAttempt = 0;
      httpService.post.mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('eye-detection')) {
          return of(eyeSuccessResponse);
        }
        cataractAttempt += 1;
        if (cataractAttempt === 1) {
          return throwError(() => errorResponse);
        }
        return of(cataractResponse);
      });

      prisma.chat.findFirst.mockResolvedValue({ id: 'chat-1' });
      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const txMock = {
          message: {
            create: jest.fn().mockResolvedValue({ id: 'msg-456' }),
          },
          upload: {
            update: jest.fn().mockResolvedValue({}),
          },
          aiPrediction: {
            create: jest.fn().mockResolvedValue({
              id: 'pred-789',
              prediction: 'Mature',
              confidence: 0.95,
            }),
          },
        };
        return callback(txMock);
      });

      const result = await service.predictCataract(
        validFile,
        { chatId: 'chat-1' },
        'user-abc',
      );

      expect(result.prediction).toBe('Mature');
      expect(httpService.post).toHaveBeenCalledTimes(3); // 1 Eye Detection call + 2 Cataract calls
    });

    it('throws immediately on non-retryable ML failure (e.g. 400 Bad Request)', async () => {
      const uploadRecord = { id: 'upload-123', fileUrl: 'https://s3/eye.png' };
      uploadsService.uploadFile.mockResolvedValue({
        success: true,
        data: uploadRecord as Upload,
        message: 'Uploaded',
      });

      const eyeSuccessResponse = {
        data: { success: true, eyeDetected: true, confidence: 0.95, boundingBox: null, processingTime: 50 },
        status: 200,
        statusText: 'OK',
        headers: mockAxiosHeaders,
        config: mockAxiosConfig,
      };
      const errorResponse = {
        response: { status: 400, data: { message: 'Bad file format' } },
        message: 'Bad Request',
      };
      httpService.post.mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('eye-detection')) {
          return of(eyeSuccessResponse);
        }
        return throwError(() => errorResponse);
      });

      await expect(
        service.predictCataract(validFile, emptyDto, 'user-abc'),
      ).rejects.toThrow(BadRequestException);

      expect(httpService.post).toHaveBeenCalledTimes(2); // 1 Eye Detection call + 1 Cataract call
    });

    it('rolls back and throws if database writes in prediction transaction fail', async () => {
      const uploadRecord = { id: 'upload-123', fileUrl: 'https://s3/eye.png' };
      uploadsService.uploadFile.mockResolvedValue({
        success: true,
        data: uploadRecord as Upload,
        message: 'Uploaded',
      });

      const eyeSuccessResponse = {
        data: { success: true, eyeDetected: true, confidence: 0.95, boundingBox: null, processingTime: 50 },
        status: 200,
        statusText: 'OK',
        headers: mockAxiosHeaders,
        config: mockAxiosConfig,
      };
      const cataractResponse: AxiosResponse = {
        data: { prediction: 'Normal', confidence: 0.99 },
        status: 200,
        statusText: 'OK',
        headers: mockAxiosHeaders,
        config: mockAxiosConfig,
      };
      httpService.post.mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('eye-detection')) {
          return of(eyeSuccessResponse);
        }
        return of(cataractResponse);
      });

      prisma.chat.findFirst.mockResolvedValue({ id: 'chat-1' });

      prisma.$transaction.mockRejectedValue(
        new InternalServerErrorException('DB Constraint Violated'),
      );

      await expect(
        service.predictCataract(validFile, { chatId: 'chat-1' }, 'user-abc'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('returns cached prediction when idempotencyKey is matched', async () => {
      const cachedRecord = {
        prediction: 'Immature',
        confidence: 0.95,
        message: { chatId: 'chat-cached-123' },
        upload: { fileUrl: 'https://s3/cached-eye.png' },
      };
      prisma.aiPrediction.findFirst.mockResolvedValue(cachedRecord);

      const result = await service.predictCataract(
        validFile,
        emptyDto,
        'user-abc',
        { idempotencyKey: 'idemp-key-999' },
      );

      expect(result).toEqual({
        prediction: 'Immature',
        confidence: 0.95,
        uploadedImageUrl: 'https://s3/cached-eye.png',
        chatId: 'chat-cached-123',
      });
      expect(uploadsService.uploadFile).not.toHaveBeenCalled();
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('aborts retry loop immediately when signal is aborted', async () => {
      const uploadRecord = { id: 'upload-123', fileUrl: 'https://s3/eye.png' };
      uploadsService.uploadFile.mockResolvedValue({
        success: true,
        data: uploadRecord as Upload,
        message: 'Uploaded',
      });

      const abortController = new AbortController();
      abortController.abort(new Error('Request cancelled by client'));

      await expect(
        service.predictCataract(validFile, emptyDto, 'user-abc', {
          signal: abortController.signal,
        }),
      ).rejects.toThrow('Request cancelled by client');

      expect(httpService.post).not.toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('returns paginated list of predictions with mapped records', async () => {
      const mockRecords = [
        {
          id: 'pred-1',
          prediction: 'Immature',
          confidence: 0.85,
          aiProvider: 'GOOGLE_CLOUD_RUN',
          modelVersion: 'v1',
          createdAt: new Date('2026-06-12T10:00:00Z'),
          upload: { fileUrl: 'https://s3/eye1.png' },
        },
      ];

      prisma.aiPrediction.count.mockResolvedValue(25);
      prisma.aiPrediction.findMany.mockResolvedValue(mockRecords);

      const result = await service.getHistory('user-abc', {
        page: 2,
        limit: 10,
        prediction: 'Immature',
      });

      expect(result).toEqual({
        data: [
          {
            id: 'pred-1',
            prediction: 'Immature',
            confidence: 0.85,
            uploadedImageUrl: 'https://s3/eye1.png',
            aiProvider: 'GOOGLE_CLOUD_RUN',
            modelVersion: 'v1',
            createdAt: new Date('2026-06-12T10:00:00Z'),
          },
        ],
        meta: {
          total: 25,
          page: 2,
          limit: 10,
          totalPages: 3,
        },
      });

      expect(prisma.aiPrediction.count).toHaveBeenCalledWith({
        where: { userId: 'user-abc', prediction: 'Immature' },
      });
      expect(prisma.aiPrediction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-abc', prediction: 'Immature' },
          skip: 10,
          take: 10,
        }),
      );
    });

    it('applies default page=1 and limit=10 if values are missing', async () => {
      prisma.aiPrediction.count.mockResolvedValue(0);
      prisma.aiPrediction.findMany.mockResolvedValue([]);

      const result = await service.getHistory('user-abc', {});

      expect(result.meta).toEqual({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      expect(prisma.aiPrediction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });
  });
});
