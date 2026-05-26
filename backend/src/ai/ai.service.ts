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

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

interface HuggingFaceResponse {
  prediction: string;
  confidence: number;
}

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
    dto: PredictImageDto,
    userId: string,
  ) {
    this.logger.log(`[AI/ML Flow] Incoming request to predictCataract:
      - User ID: ${userId}
      - Patient ID: ${dto.patientId}
      - File Name: ${file?.originalname}
      - File Size: ${file?.size} bytes
      - Mime Type: ${file?.mimetype}`);

    try {
      // 1. Validate file
      this.validateFile(file);
      this.logger.log(`[AI/ML Flow] File validation passed.`);

      // 2. Upload image to AWS S3
      this.logger.log(`[AI/ML Flow] Step 2: Uploading image to AWS S3...`);
      const uploadResult = await this.uploadsService.uploadFile(file, userId);
      const uploadedImageUrl: string = uploadResult.data.fileUrl;
      this.logger.log(`[AI/ML Flow] S3 Upload Success. Image URL: ${uploadedImageUrl}`);

      // 3. Call Hugging Face API
      this.logger.log(`[AI/ML Flow] Step 3: Sending request to Hugging Face ML Model at ${this.apiUrl}...`);
      const mlResponse = await this.callWithRetry(file);
      this.logger.log(`[AI/ML Flow] Hugging Face ML Model returned: ${JSON.stringify(mlResponse)}`);

      // 4. Persist prediction record
      this.logger.log(`[AI/ML Flow] Step 4: Saving prediction record to Database...`);
      const record = await this.prisma.aiPrediction.create({
        data: {
          userId,
          patientId: dto.patientId ?? null,
          uploadedImageUrl,
          prediction: mlResponse.prediction,
          confidence: mlResponse.confidence,
          rawMlResponse: mlResponse as object,
          aiProvider: 'HUGGING_FACE',
          modelVersion: 'v1',
        },
      });
      this.logger.log(`[AI/ML Flow] Step 5: Prediction saved successfully. Record ID: ${record.id}`);

      // 6. Find or create a Chat session so the frontend can navigate to it.
      //    We do NOT insert a static message here — the frontend sends the
      //    prediction context to Gemini which produces the actual consultation.
      this.logger.log(`[AI/ML Flow] Step 6: Finding or creating Chat session for user ${userId}...`);
      let chat = await this.prisma.chat.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (!chat) {
        chat = await this.prisma.chat.create({
          data: { userId, title: 'AI Health Consultation' },
        });
      }
      this.logger.log(`[AI/ML Flow] Chat session ready: ${chat.id}`);

      // 7. Return prediction + chatId for frontend navigation
      return {
        prediction: record.prediction,
        confidence: record.confidence,
        uploadedImageUrl: record.uploadedImageUrl,
        chatId: chat.id,
      };
    } catch (err: any) {
      this.logger.error(`[AI/ML Flow] ERROR in predictCataract: ${err?.message}`, err?.stack);
      throw err;
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
      ...(dto.patientId ? { patientId: dto.patientId } : {}),
    };

    const [total, records] = await Promise.all([
      this.prisma.aiPrediction.count({ where }),
      this.prisma.aiPrediction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          prediction: true,
          confidence: true,
          uploadedImageUrl: true,
          patientId: true,
          aiProvider: true,
          modelVersion: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      data: records,
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
      } catch (error: any) {
        lastError = error;
        const isLast = attempt === this.maxRetries;
        this.logger.warn(
          `HuggingFace API attempt ${attempt + 1}/${this.maxRetries + 1} failed: ${error?.message}${isLast ? ' — no more retries' : ' — retrying…'}`,
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
    const blob = new Blob([file.buffer as any], { type: file.mimetype });
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
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(`[AI/ML Flow] [HF Request Failed] Request failed after ${duration}ms.`);

      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        this.logger.error(
          `[AI/ML Flow] [HF Freeze/Timeout Detected] The request reached the exact freeze point. ` +
          `Axios terminated the socket request after exceeding the ${this.timeoutMs}ms timeout limit while waiting for the remote ML Space to return predictions.`,
        );
      }

      if (error?.response) {
        this.logger.error(
          `[AI/ML Flow] [HF Error Response] HTTP Status: ${error.response.status}. ` +
          `Body: ${JSON.stringify(error.response.data)}`,
        );
        throw new InternalServerErrorException(
          `ML API error ${error.response.status}: ${JSON.stringify(error.response.data)}`,
        );
      }

      this.logger.error(`[AI/ML Flow] [HF Connection Error] Details: ${error?.message || error}`);
      throw error;
    }
  }
}
