import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '@prisma-local/prisma.service';
import { ConfigService } from '@config/config.service';
import { UploadsService } from '../uploads/uploads.service';
import { PredictImageDto } from './dto/predict-image.dto';
import { PredictionHistoryDto } from './dto/prediction-history.dto';
import { Prisma } from '@prisma/client';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

interface HuggingFaceResponse {
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

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly uploadsService: UploadsService,
  ) {
    this.apiUrl = this.configService.huggingfaceApiUrl;
    this.timeoutMs = this.configService.mlGatewayTimeoutMs;
    this.maxRetries = this.configService.mlGatewayMaxRetries;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC: Run cataract prediction
  // ─────────────────────────────────────────────────────────────────────────────

  async predictCataract(
    file: Express.Multer.File,
    _dto: PredictImageDto,
    userId: string,
  ) {
    this.logger.log(`[AI/ML Flow] Incoming request to predictCataract:
      - User ID: ${userId}
      - File Name: ${file?.originalname}
      - File Size: ${file?.size} bytes
      - Mime Type: ${file?.mimetype}`);

    try {
      // 1. Validate file
      this.validateFile(file);
      this.logger.log(`[AI/ML Flow] File validation passed.`);

      // 2. Upload image to AWS S3
      this.logger.log(`[AI/ML Flow] Step 2: Uploading image to AWS S3...`);
      let uploadResult: Awaited<ReturnType<UploadsService['uploadFile']>>;
      try {
        uploadResult = await this.uploadsService.uploadFile(file, userId);
      } catch (error) {
        this.logger.error(
          `[AI/ML Flow] Upload stage failed for user ${userId}: ${this.getErrorMessage(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
      const uploadRecord = uploadResult.data;
      const uploadedImageUrl = uploadRecord.fileUrl;
      this.logger.log(`[AI/ML Flow] S3 Upload Success. Image URL: ${uploadedImageUrl}`);

      // 3. Call Hugging Face API
      this.logger.log(`[AI/ML Flow] Step 3: Sending request to Hugging Face ML Model at ${this.apiUrl}...`);
      let mlResponse: HuggingFaceResponse;
      try {
        mlResponse = await this.callWithRetry(file);
      } catch (error) {
        this.logger.error(
          `[AI/ML Flow] HuggingFace stage failed for upload ${uploadRecord.id}: ${this.getErrorMessage(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
      this.logger.log(`[AI/ML Flow] Hugging Face ML Model returned: ${JSON.stringify(mlResponse)}`);

      // 4. Find or create a Chat session so the frontend can navigate to it.
      this.logger.log(`[AI/ML Flow] Step 4: Finding or creating Chat session for user ${userId}...`);
      let chat;
      try {
        chat = await this.prisma.chat.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (!chat) {
          chat = await this.prisma.chat.create({
            data: { userId, title: 'AI Health Consultation' },
          });
        }
      } catch (error) {
        this.logger.error(
          `[AI/ML Flow] Chat Prisma write stage failed for user ${userId}: ${this.getErrorMessage(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw new InternalServerErrorException('Failed to prepare prediction chat session');
      }
      this.logger.log(`[AI/ML Flow] Chat session ready: ${chat.id}`);

      // 5. Persist prediction record with relation links required by schema.
      this.logger.log(`[AI/ML Flow] Step 5: Saving prediction record to Database...`);
      const systemMessageContent =
        `AI scan uploaded for cataract prediction.\n` +
        `Prediction: ${mlResponse.prediction}\n` +
        `Confidence: ${(mlResponse.confidence * 100).toFixed(2)}%`;
      const rawMlResponse: Prisma.JsonObject = {
        prediction: mlResponse.prediction,
        confidence: mlResponse.confidence,
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
              aiProvider: 'HUGGING_FACE',
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
      this.logger.log(`[AI/ML Flow] Step 6: Prediction saved successfully. Record ID: ${record.id}`);

      // 6. Return prediction + chatId for frontend navigation
      return {
        prediction: record.prediction,
        confidence: record.confidence,
        uploadedImageUrl,
        chatId: chat.id,
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`[AI/ML Flow] ERROR in predictCataract: ${message}`, stack);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC: Get paginated prediction history
  // ─────────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE: Validate incoming file
  // ─────────────────────────────────────────────────────────────────────────────

  private validateFile(file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No image file provided.');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File exceeds 20 MB limit.');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE: HTTP call with exponential back-off retry
  // ─────────────────────────────────────────────────────────────────────────────

  private async callWithRetry(file: Express.Multer.File): Promise<HuggingFaceResponse> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.callHuggingFace(file);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const isLast = attempt === this.maxRetries;
        this.logger.warn(
          `HuggingFace API attempt ${attempt + 1}/${this.maxRetries + 1} failed: ${this.getErrorMessage(error)}${isLast ? ' - no more retries' : ' - retrying...'}`,
        );
        if (!isLast) {
          // Exponential back-off: 1 s, 2 s, 4 s …
          await new Promise((res) => setTimeout(res, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw new ServiceUnavailableException(
      `ML API unavailable after ${this.maxRetries + 1} attempts: ${lastError.message}`,
    );
  }

  private async callHuggingFace(file: Express.Multer.File): Promise<HuggingFaceResponse> {
    this.logger.log(`[AI/ML Flow] [HF Request Start] Preparing multipart/form-data upload using modern native global FormData.`);
    this.logger.log(`[AI/ML Flow] - File name: ${file.originalname || 'eye-scan.jpg'}`);
    this.logger.log(`[AI/ML Flow] - File mimetype: ${file.mimetype}`);
    this.logger.log(`[AI/ML Flow] - File buffer length: ${file.buffer?.length} bytes`);
    this.logger.log(`[AI/ML Flow] - Configured ML timeout limit: ${this.timeoutMs}ms`);

    // 1. Construct native FormData using global.FormData & Blob
    const formData = new global.FormData();
    const fileBytes = new Uint8Array(file.buffer);
    const blob = new Blob([fileBytes], { type: file.mimetype });
    formData.append('file', blob, file.originalname || 'eye-scan.jpg');

    const headers = {
      'accept': 'application/json',
    };

    this.logger.log(`[AI/ML Flow] [HF Request Target] Target Endpoint: ${this.apiUrl}`);

    // If timeout is ridiculously small (like 3s), warn in logs
    if (this.timeoutMs < 10000) {
      this.logger.warn(`[AI/ML Flow] WARNING: The configured ML gateway timeout (${this.timeoutMs}ms) is extremely short for deep learning inference. Recommend increasing it to at least 15000ms in backend/.env.`);
    }

    this.logger.log(`[AI/ML Flow] [HF Request Socket] Initiating POST request to Hugging Face...`);
    const startTime = Date.now();
    try {
      const response = await firstValueFrom(
        this.httpService.post<HuggingFaceResponse>(this.apiUrl, formData, {
          headers,
          timeout: this.timeoutMs,
        }),
      );
      const duration = Date.now() - startTime;
      this.logger.log(`[AI/ML Flow] [HF Request Success] Received 200 OK from Hugging Face in ${duration}ms!`);
      this.logger.log(`[AI/ML Flow] [HF Response Body] Data: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[AI/ML Flow] [HF Request Failed] Request failed after ${duration}ms.`);
      const typedError = error as {
        code?: string;
        message?: string;
        response?: {
          status: number;
          data: unknown;
        };
      };

      if (typedError.code === 'ECONNABORTED' || typedError.message?.includes('timeout')) {
        this.logger.error(
          `[AI/ML Flow] [HF Freeze/Timeout Detected] The request reached the exact freeze point. ` +
          `Axios terminated the socket request after exceeding the ${this.timeoutMs}ms timeout limit while waiting for the remote ML Space to return predictions.`,
        );
      }

      if (typedError.response) {
        this.logger.error(
          `[AI/ML Flow] [HF Error Response] HTTP Status: ${typedError.response.status}. ` +
          `Body: ${JSON.stringify(typedError.response.data)}`,
        );
        throw new InternalServerErrorException(
          `ML API error ${typedError.response.status}: ${JSON.stringify(typedError.response.data)}`,
        );
      }

      this.logger.error(`[AI/ML Flow] [HF Connection Error] Details: ${this.getErrorMessage(error)}`);
      throw error;
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
