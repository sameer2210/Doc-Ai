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
    // 1. Validate file
    this.validateFile(file);

    // 2. Upload image to AWS S3 (reuse existing UploadsService)
    this.logger.log(`Uploading image to S3 for user ${userId}…`);
    const uploadResult = await this.uploadsService.uploadFile(file, userId);
    const uploadedImageUrl: string = uploadResult.data.fileUrl;

    // 3. Call Hugging Face API with retry + timeout
    this.logger.log(`Calling HuggingFace ML API at ${this.apiUrl}…`);
    const mlResponse = await this.callWithRetry(file);

    // 4. Persist prediction record
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

    this.logger.log(`Prediction saved: ${record.id} — ${record.prediction}`);

    // 5. Return structured response
    return {
      id: record.id,
      prediction: record.prediction,
      confidence: record.confidence,
      uploadedImageUrl: record.uploadedImageUrl,
      patientId: record.patientId,
      aiProvider: record.aiProvider,
      modelVersion: record.modelVersion,
      createdAt: record.createdAt,
    };
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

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE: Single HTTP POST to Hugging Face (multipart/form-data)
  // ─────────────────────────────────────────────────────────────────────────────

  private async callHuggingFace(file: Express.Multer.File): Promise<HuggingFaceResponse> {
    // Build native FormData (Node 20 global)
    const formData = new FormData();
    // Convert Buffer → ArrayBuffer to satisfy strict BlobPart typing
    const arrayBuffer = file.buffer.buffer.slice(
      file.buffer.byteOffset,
      file.buffer.byteOffset + file.buffer.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: file.mimetype });
    formData.append('file', blob, file.originalname || 'image.jpg');

    try {
      const response = await firstValueFrom(
        this.httpService.post<HuggingFaceResponse>(this.apiUrl, formData, {
          timeout: this.timeoutMs,
        }),
      );
      return response.data;
    } catch (error: any) {
      if (error?.response) {
        // Hugging Face returned an error status
        throw new InternalServerErrorException(
          `ML API error ${error.response.status}: ${JSON.stringify(error.response.data)}`,
        );
      }
      // Network / timeout error
      throw error;
    }
  }
}
