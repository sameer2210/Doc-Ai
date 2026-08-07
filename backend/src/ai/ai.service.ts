import { ConfigService } from '@config/config.service';
import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';
import { Prisma } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { ApiErrorCode } from '@common/constants/api-error-codes.enum';
import {
  EyeValidationStatus,
  EyeValidationReason,
} from './constants/eye-validation.enum';
import { EyeValidationPresenter } from './presenters/eye-validation.presenter';
import {
  AI_SERVICE_UNAVAILABLE_MESSAGE,
  createEyeNotDetectedException,
  mapCataractModelError,
} from '../uploads/upload-errors';
import { validateUploadImageFile } from '../uploads/upload-validation';
import { UploadsService } from '../uploads/uploads.service';
import { PredictImageDto } from './dto/predict-image.dto';
import { PredictCataractResultDto } from './dto/predict-image-response.dto';
import { PredictionHistoryDto } from './dto/prediction-history.dto';

export interface EyeDetectionBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EyeDetectionModelResponse {
  success: boolean;
  eyeDetected: boolean;
  confidence: number;
  boundingBox: EyeDetectionBoundingBox | null;
  processingTime: number;
}

interface CataractModelResponse {
  prediction: string;
  confidence: number;
}

const predictionHistorySelect = {
  id: true,
  prediction: true,
  confidence: true,
  aiProvider: true,
  modelVersion: true,
  createdAt: true,
  upload: {
    select: {
      fileUrl: true,
    },
  },
} as const;

type PredictionHistoryRecord = Prisma.AiPredictionGetPayload<{
  select: typeof predictionHistorySelect;
}>;

import { sleep } from '@common/utils/sleep.util';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiUrl: string;
  private readonly eyeApiUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly uploadsService: UploadsService,
  ) {
    this.apiUrl = this.configService.cataractModelApiUrl;
    this.eyeApiUrl = this.configService.eyeDetectionModelApiUrl;
    this.timeoutMs = this.configService.mlGatewayTimeoutMs;
    this.maxRetries = this.configService.mlGatewayMaxRetries;
  }

  async predictCataract(
    file: Express.Multer.File,
    dto: PredictImageDto,
    userId: string,
    options?: { signal?: AbortSignal; idempotencyKey?: string },
  ): Promise<PredictCataractResultDto> {
    this.logger.log(`[AI/ML Flow] Incoming request to predictCataract:
      - User ID: ${userId}
      - File Name: ${file?.originalname}
      - File Size: ${file?.size} bytes
      - Mime Type: ${file?.mimetype}
      - Idempotency Key: ${options?.idempotencyKey ?? 'none'}`);

    if (options?.idempotencyKey) {
      const existingPrediction = await this.prisma.aiPrediction.findFirst({
        where: {
          userId,
          upload: {
            idempotencyKey: options.idempotencyKey,
          },
        },
        select: {
          prediction: true,
          confidence: true,
          message: { select: { chatId: true } },
          upload: { select: { fileUrl: true } },
        },
      });

      if (existingPrediction) {
        this.logger.log(
          `[AI/ML Flow] Returning cached prediction for idempotencyKey: ${options.idempotencyKey}`,
        );
        return {
          prediction: existingPrediction.prediction,
          confidence: existingPrediction.confidence,
          uploadedImageUrl: existingPrediction.upload.fileUrl,
          chatId: existingPrediction.message.chatId,
        };
      }
    }

    try {
      const validatedFile = validateUploadImageFile(file);
      const normalizedFile = {
        ...file,
        mimetype: validatedFile.mimeType,
      } satisfies Express.Multer.File;
      this.logger.log(`[AI/ML Flow] File validation passed.`);

      this.logger.log(`[AI/ML Flow] Step 2: Uploading image to AWS S3...`);
      let uploadResult: Awaited<ReturnType<UploadsService['uploadFile']>>;
      try {
        uploadResult = await this.uploadsService.uploadFile(
          normalizedFile,
          userId,
          options?.idempotencyKey,
        );
      } catch (error) {
        this.logger.error(
          `[AI/ML Flow] Upload stage failed for user ${userId}: ${this.getErrorMessage(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
      const uploadRecord = uploadResult.data;
      const uploadedImageUrl = uploadRecord.fileUrl;
      this.logger.log(
        `[AI/ML Flow] S3 Upload Success. Image URL: ${uploadedImageUrl}`,
      );

      this.logger.log(
        `[AI/ML Flow] Step 2.5: Running Eye Detection Validation Stage...`,
      );
      let eyeValidation: {
        status: EyeValidationStatus;
        reason?: EyeValidationReason;
      };
      try {
        const eyeResponse = await this.executeWithRetry(
          'Eye Detection Model API',
          () => this.callEyeDetectionModel(normalizedFile, options?.signal),
          options?.signal,
        );

        if (!eyeResponse.eyeDetected) {
          this.logger.warn(
            `[AI/ML Flow] Eye Detection Validation Failed for upload ${uploadRecord.id}: Image does not contain a human eye (confidence: ${eyeResponse.confidence}). Halting pipeline.`,
          );
          throw createEyeNotDetectedException();
        }

        eyeValidation = { status: EyeValidationStatus.PERFORMED };
      } catch (error) {
        if (
          error instanceof HttpException &&
          error.getStatus() === 400 &&
          typeof error.getResponse() === 'object' &&
          (error.getResponse() as Record<string, unknown>)?.errorCode ===
            ApiErrorCode.EYE_NOT_DETECTED
        ) {
          throw error;
        }

        const retryableReason = this.classifyEyeDetectionError(error);
        if (retryableReason) {
          this.logger.warn(
            `[AI/ML Flow] Eye Detection infrastructure unavailable (reason: ${retryableReason}): ${this.getErrorMessage(error)}. Proceeding gracefully to Cataract Detection stage.`,
          );
          eyeValidation = {
            status: EyeValidationStatus.SKIPPED,
            reason: retryableReason,
          };
        } else {
          this.logger.error(
            `[AI/ML Flow] Non-retryable error or defect in Eye Detection pipeline: ${this.getErrorMessage(error)}. Halting pipeline.`,
          );
          throw error;
        }
      }

      this.logger.log(
        `[AI/ML Flow] Step 3: Sending request to Cataract Detection Model at ${this.apiUrl}...`,
      );
      let mlResponse: CataractModelResponse;
      try {
        mlResponse = await this.callWithRetry(normalizedFile, options?.signal);
      } catch (error) {
        this.logger.error(
          `[AI/ML Flow] Cataract Model stage failed for upload ${uploadRecord.id}: ${this.getErrorMessage(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
      this.logger.log(
        `[AI/ML Flow] Cataract Detection Model returned: ${JSON.stringify(mlResponse)}`,
      );

      this.logger.log(
        `[AI/ML Flow] Step 4: Resolving Chat session for user ${userId}...`,
      );
      let chat;
      try {
        if (dto.chatId) {
          chat = await this.prisma.chat.findFirst({
            where: { id: dto.chatId, userId },
          });
          if (!chat) {
            throw new NotFoundException('Target chat session not found');
          }
        } else {
          chat = await this.prisma.chat.create({
            data: { userId, title: 'AI Health Consultation' },
          });
        }
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        this.logger.error(
          `[AI/ML Flow] Chat Prisma write/query stage failed for user ${userId}: ${this.getErrorMessage(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw new InternalServerErrorException(
          'Failed to prepare prediction chat session',
        );
      }
      this.logger.log(`[AI/ML Flow] Chat session ready: ${chat.id}`);

      this.logger.log(
        `[AI/ML Flow] Step 5: Saving prediction record to Database...`,
      );
      const systemMessageContent =
        `AI scan uploaded for cataract prediction.\n` +
        `Prediction: ${mlResponse.prediction}\n` +
        `Confidence: ${(mlResponse.confidence * 100).toFixed(2)}%\n` +
        `AI Provider: GOOGLE_CLOUD_RUN\n` +
        `Model Version: v1`;
      const rawMlResponse: Prisma.JsonObject = {
        prediction: mlResponse.prediction,
        confidence: mlResponse.confidence,
        eyeValidation: {
          status: eyeValidation.status,
          ...(eyeValidation.reason ? { reason: eyeValidation.reason } : {}),
          timestamp: new Date().toISOString(),
        },
      };

      const record = await this.prisma.$transaction(async (tx) => {
        try {
          const systemMessage = await tx.message.create({
            data: {
              chatId: chat.id,
              role: 'SYSTEM',
              content: systemMessageContent,
              metadata: {
                type: 'scan_prediction_record',
                prediction: mlResponse.prediction,
                confidence: mlResponse.confidence,
              } as Prisma.JsonObject,
            },
            select: { id: true },
          });

          await tx.upload.update({
            where: { id: uploadRecord.id },
            data: { messageId: systemMessage.id },
          });

          return tx.aiPrediction.create({
            data: {
              userId,
              messageId: systemMessage.id,
              uploadId: uploadRecord.id,
              prediction: mlResponse.prediction,
              confidence: mlResponse.confidence,
              rawMlResponse,
              aiProvider: 'GOOGLE_CLOUD_RUN',
              modelVersion: 'v1',
            },
          });
        } catch (error) {
          this.logger.error(
            `[AI/ML Flow] Prediction Prisma transaction failed for upload ${uploadRecord.id}: ${this.getErrorMessage(error)}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw error;
        }
      });
      this.logger.log(
        `[AI/ML Flow] Step 6: Prediction saved successfully. Record ID: ${record.id}`,
      );

      const validationMessage = EyeValidationPresenter.buildValidationMessage(
        eyeValidation.status,
      );

      return {
        prediction: record.prediction,
        confidence: record.confidence,
        uploadedImageUrl,
        chatId: chat.id,
        eyeValidation: {
          status: eyeValidation.status,
          ...(validationMessage ? { message: validationMessage } : {}),
        },
      };
    } catch (error) {
      if (
        options?.idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.aiPrediction.findFirst({
          where: { upload: { userId, idempotencyKey: options.idempotencyKey } },
          include: { message: true, upload: true },
        });
        if (existing) {
          return {
            prediction: existing.prediction,
            confidence: existing.confidence,
            uploadedImageUrl: existing.upload.fileUrl,
            chatId: existing.message.chatId,
          };
        }
      }
      const message = this.getErrorMessage(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `[AI/ML Flow] ERROR in predictCataract: ${message}`,
        stack,
      );
      throw error;
    }
  }

  async getHistory(userId: string, dto: PredictionHistoryDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(dto.prediction ? { prediction: dto.prediction } : {}),
    };

    const [total, records] = await Promise.all([
      this.prisma.aiPrediction.count({ where }),
      this.prisma.aiPrediction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: predictionHistorySelect,
      }),
    ]);

    const typedRecords: PredictionHistoryRecord[] = records;
    const mappedRecords = typedRecords.map((record) => ({
      id: record.id,
      prediction: record.prediction,
      confidence: record.confidence,
      uploadedImageUrl: record.upload.fileUrl,
      aiProvider: record.aiProvider,
      modelVersion: record.modelVersion,
      createdAt: record.createdAt,
    }));

    return {
      data: mappedRecords,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async executeWithRetry<T>(
    operationName: string,
    fn: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    let lastError: unknown = new ServiceUnavailableException(
      AI_SERVICE_UNAVAILABLE_MESSAGE,
    );

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      if (signal?.aborted) {
        throw signal.reason ?? new ServiceUnavailableException('Request cancelled by client');
      }

      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const isLast = attempt === this.maxRetries;
        const shouldRetry = this.isRetryableMlError(error);
        this.logger.warn(
          `${operationName} attempt ${attempt + 1}/${this.maxRetries + 1} failed: ${this.getErrorMessage(error)}${isLast ? ' - no more retries' : ' - retrying...'}`,
        );

        if (!shouldRetry || isLast || signal?.aborted) {
          throw error;
        }

        await sleep(Math.pow(2, attempt) * 1000, signal);
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new ServiceUnavailableException(AI_SERVICE_UNAVAILABLE_MESSAGE);
  }

  private async callWithRetry(
    file: Express.Multer.File,
    signal?: AbortSignal,
  ): Promise<CataractModelResponse> {
    return this.executeWithRetry(
      'Cataract Model API',
      () => this.callCataractModel(file, signal),
      signal,
    );
  }

  private async callEyeDetectionModel(
    file: Express.Multer.File,
    signal?: AbortSignal,
  ): Promise<EyeDetectionModelResponse> {
    this.logger.log(
      `[AI/ML Flow] [Eye Model Request Start] Preparing multipart request for Eye Detection Model at ${this.eyeApiUrl}...`,
    );

    const formData = new FormData();
    const fileBytes = new Uint8Array(file.buffer);
    const blob = new Blob([fileBytes], { type: file.mimetype });
    formData.append('file', blob, file.originalname || 'eye-scan.jpg');

    const headers = {
      accept: 'application/json',
    };

    const startTime = Date.now();
    try {
      const response = await firstValueFrom(
        this.httpService.post<EyeDetectionModelResponse>(this.eyeApiUrl, formData, {
          headers,
          timeout: this.timeoutMs,
          signal,
        }),
      );
      const duration = Date.now() - startTime;

      if (!response.data || typeof response.data.eyeDetected !== 'boolean') {
        throw new InternalServerErrorException(
          'Corrupted or invalid response schema from Eye Detection Model API',
        );
      }

      this.logger.log(
        `[AI/ML Flow] [Eye Model Success] Returned eyeDetected=${response.data?.eyeDetected}, confidence=${response.data?.confidence} in ${duration}ms!`,
      );
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[AI/ML Flow] [Eye Model Request Failed] Request failed after ${duration}ms: ${this.getErrorMessage(error)}`,
      );

      if (error instanceof HttpException) {
        if (error.getStatus() === 503) {
          this.logger.error(
            `[AI/ML Flow] [Eye Model Unavailable] Eye Detection Model returned 503 or request timed out.`,
          );
        }
        throw error;
      }

      const mappedError = mapCataractModelError(error);
      throw mappedError;
    }
  }

  private classifyEyeDetectionError(error: unknown): EyeValidationReason | null {
    if (error instanceof ServiceUnavailableException) {
      return EyeValidationReason.SERVICE_UNAVAILABLE;
    }

    if (typeof error === 'object' && error !== null) {
      const rec = error as Record<string, unknown>;
      const response = rec.response as Record<string, unknown> | undefined;
      const status =
        typeof response?.status === 'number'
          ? response.status
          : typeof rec.status === 'number'
          ? rec.status
          : undefined;
      const code = typeof rec.code === 'string' ? rec.code : undefined;

      // 1. Explicit status code checks
      if (status === 503 || status === 504) {
        return EyeValidationReason.SERVICE_UNAVAILABLE;
      }

      // 2. Explicit error code checks (DNS failure ENOTFOUND must return null -> fail closed)
      if (code === 'ENOTFOUND') {
        return null;
      }

      if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
        return EyeValidationReason.TIMEOUT;
      }

      if (
        code === 'ECONNRESET' ||
        code === 'ECONNREFUSED' ||
        code === 'ERR_NETWORK'
      ) {
        return EyeValidationReason.NETWORK_ERROR;
      }

      // 3. Fallback to message inspection as final resort
      const message = (
        typeof rec.message === 'string' ? rec.message : ''
      ).toLowerCase();

      if (message.includes('timeout') || message.includes('timed out')) {
        return EyeValidationReason.TIMEOUT;
      }

      if (message.includes('network error')) {
        return EyeValidationReason.NETWORK_ERROR;
      }
    }

    return null;
  }

  private async callCataractModel(
    file: Express.Multer.File,
    signal?: AbortSignal,
  ): Promise<CataractModelResponse> {
    this.logger.log(
      `[AI/ML Flow] [Model Request Start] Preparing multipart/form-data upload using modern native global FormData.`,
    );
    this.logger.log(
      `[AI/ML Flow] - File name: ${file.originalname || 'eye-scan.jpg'}`,
    );
    this.logger.log(`[AI/ML Flow] - File mimetype: ${file.mimetype}`);
    this.logger.log(
      `[AI/ML Flow] - File buffer length: ${file.buffer?.length} bytes`,
    );
    this.logger.log(
      `[AI/ML Flow] - Configured ML timeout limit: ${this.timeoutMs}ms`,
    );

    const formData = new FormData();
    const fileBytes = new Uint8Array(file.buffer);
    const blob = new Blob([fileBytes], { type: file.mimetype });
    formData.append('file', blob, file.originalname || 'eye-scan.jpg');

    const headers = {
      accept: 'application/json',
    };

    this.logger.log(
      `[AI/ML Flow] [Model Request Target] Target Endpoint: ${this.apiUrl}`,
    );

    if (this.timeoutMs < 10000) {
      this.logger.warn(
        `[AI/ML Flow] WARNING: The configured ML gateway timeout (${this.timeoutMs}ms) is extremely short for deep learning inference. Recommend increasing it to at least 15000ms in backend/.env.`,
      );
    }

    this.logger.log(
      `[AI/ML Flow] [Model Request Socket] Initiating POST request to Cataract Detection Model...`,
    );
    const startTime = Date.now();
    try {
      const response = await firstValueFrom(
        this.httpService.post<CataractModelResponse>(this.apiUrl, formData, {
          headers,
          timeout: this.timeoutMs,
          signal,
        }),
      );
      this.logger.log('========================');
      this.logger.log(`ML Prediction: ${response.data.prediction}`);
      this.logger.log(
        `ML Confidence: ${(response.data.confidence * 100).toFixed(2)}%`,
      );
      this.logger.log(`RAW ML RESPONSE: ${JSON.stringify(response.data, null, 2)}`);
      this.logger.log('========================');
      const duration = Date.now() - startTime;
      this.logger.log(
        `[AI/ML Flow] [Model Request Success] Received 200 OK from Cataract Detection Model in ${duration}ms!`,
      );
      this.logger.log(
        `[AI/ML Flow] [Model Response Body] Data: ${JSON.stringify(response.data)}`,
      );
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[AI/ML Flow] [Model Request Failed] Request failed after ${duration}ms.`,
      );

      if (error instanceof HttpException) {
        if (error.getStatus() === 503) {
          this.logger.error(
            `[AI/ML Flow] [Model Unavailable] Cataract Detection Model returned a retryable 503 response or the request timed out.`,
          );
        }
        throw error;
      }

      const mappedError = mapCataractModelError(error);
      this.logger.error(
        `[AI/ML Flow] [Model Error Response] Returning mapped status ${mappedError.getStatus()} with message: ${mappedError.message}`,
      );
      throw mappedError;
    }
  }

  private isRetryableMlError(error: unknown): boolean {
    return error instanceof ServiceUnavailableException;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
