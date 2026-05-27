import {
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { GetUser } from '@common/decorators/get-user.decorator';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ALLOWED_IMAGE_MIME_TYPES, uploadConfig } from './uploads.config';
import { PresignedUrlDto } from './dto/presigned-url.dto';

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('presigned-url')
  @ApiOperation({
    summary: 'Generate S3 presigned URL for direct upload',
    description: 'Generates a temporary S3 URL for uploading files directly from client device.',
  })
  @ApiBody({ type: PresignedUrlDto })
  async generatePresignedUrl(
    @Body() dto: PresignedUrlDto,
    @GetUser('userId') userId: string,
  ) {
    return this.uploadsService.generatePresignedUrl(dto, userId);
  }

  @Post('image')
  @Throttle({
    default: {
      limit: uploadConfig.uploadImageRateLimit,
      ttl: uploadConfig.uploadImageRateTtlMs,
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: uploadConfig.uploadImageMaxSizeBytes,
        files: 1,
      },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
          return;
        }
        cb(
          new BadRequestException(
            'Only PNG, JPEG, and WEBP image files are allowed',
          ),
          false,
        );
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload an image to S3',
    description: 'Uploads an image file to AWS S3 and returns the URL.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: uploadConfig.uploadImageMaxSizeBytes,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @GetUser('userId') userId: string,
  ) {
    return this.uploadsService.uploadFile(file, userId);
  }
}
