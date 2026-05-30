import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { PredictImageDto } from './dto/predict-image.dto';
import { PredictionHistoryDto } from './dto/prediction-history.dto';
import { GetUser } from '@common/decorators/get-user.decorator';
import { createImageUploadInterceptorOptions } from '../uploads/upload-validation';

@ApiTags('AI / ML Gateway')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('predict')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', createImageUploadInterceptorOptions()))
  @ApiOperation({
    summary: 'Cataract Detection',
    description:
      'Upload a retinal image (JPEG/PNG/WEBP/JPG ≤ 5 MB and ≤ 4096 × 4096 px). The image is stored in AWS S3 and forwarded to the Hugging Face cataract detection model. Returns a prediction label and confidence score.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Retinal image file (JPEG, PNG, WEBP or JPG, max 5 MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Prediction result with S3 image URL and confidence score',
    schema: {
      example: {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        prediction: 'IOL_Inserted',
        confidence: 0.92,
        uploadedImageUrl: 'https://sameer-aws-s3-bucket.s3.ap-south-1.amazonaws.com/uploads/…',
        aiProvider: 'HUGGING_FACE',
        modelVersion: 'v1',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file type, size, or missing file' })
  @ApiResponse({ status: 401, description: 'Unauthorized — JWT required' })
  @ApiResponse({ status: 503, description: 'ML API unavailable after retries' })
  async predict(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: PredictImageDto,
    @GetUser('userId') userId: string,
  ) {
    const result = await this.aiService.predictCataract(file, dto, userId);
    return {
      success: true,
      data: result,
      message: 'Cataract detection completed successfully.',
    };
  }

  @Get('history')
  @ApiOperation({
    summary: 'Prediction History',
    description:
      'Retrieve paginated cataract prediction history for the authenticated user. Supports filtering by prediction label.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of AI prediction records',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            prediction: 'IOL_Inserted',
            confidence: 0.92,
            uploadedImageUrl: 'https://…',
            aiProvider: 'HUGGING_FACE',
            modelVersion: 'v1',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — JWT required' })
  async getHistory(
    @Query() dto: PredictionHistoryDto,
    @GetUser('userId') userId: string,
  ) {
    const result = await this.aiService.getHistory(userId, dto);
    return {
      success: true,
      ...result,
    };
  }
}
