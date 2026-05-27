import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '@prisma-local/prisma.service';
import { ConfigService } from '@config/config.service';
import { v4 as uuidv4 } from 'uuid';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { Upload } from '@prisma/client';

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/json',
];
const MAX_PRESIGNED_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const IMAGE_SIGNATURES: Record<string, (buffer: Buffer) => boolean> = {
  'image/jpeg': (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': (buffer) =>
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a,
  'image/webp': (buffer) =>
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP',
};

@Injectable()
export class UploadsService {
  private s3Client: S3Client;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.awsBucketRegion,
      credentials: {
        accessKeyId: this.configService.awsAccessKeyId,
        secretAccessKey: this.configService.awsAccessSecret,
      },
    });
  }

  async generatePresignedUrl(dto: PresignedUrlDto, userId: string) {
    if (!ALLOWED_MIME_TYPES.includes(dto.fileType)) {
      throw new BadRequestException(`File type ${dto.fileType} is not supported.`);
    }
    if (!Number.isFinite(dto.fileSize) || dto.fileSize <= 0 || dto.fileSize > MAX_PRESIGNED_FILE_SIZE_BYTES) {
      throw new BadRequestException('Invalid file size for presigned upload.');
    }
    if (!dto.fileName?.trim()) {
      throw new BadRequestException('File name is required.');
    }

    const bucketName = this.configService.awsBucketName;
    const region = this.configService.awsBucketRegion;
    const safeFileName = dto.fileName
      .trim()
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .slice(0, 180);
    const s3Key = `uploads/${userId}/${uuidv4()}-${safeFileName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        ContentType: dto.fileType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 900, // URL expires in 15 minutes
      });

      const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;

      const uploadRecord = await this.prisma.upload.create({
        data: {
          userId,
          fileUrl,
          fileType: dto.fileType,
          s3Key,
        },
      });

      return {
        id: uploadRecord.id,
        uploadUrl,
        fileUrl,
      };
    } catch (error) {
      console.error('Error generating S3 presigned URL:', error);
      throw new InternalServerErrorException('Failed to generate presigned upload URL');
    }
  }

  async uploadFile(file: Express.Multer.File, userId: string): Promise<{
    success: true;
    data: Upload;
    message: string;
  }> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No valid file buffer received. Ensure the file was uploaded correctly.');
    }
    const signatureMatches = IMAGE_SIGNATURES[file.mimetype]?.(file.buffer);
    if (!signatureMatches) {
      throw new BadRequestException('Uploaded file content does not match the declared image type.');
    }
    const bucketName = this.configService.awsBucketName;
    const region = this.configService.awsBucketRegion;
    const fileExtension = (file.originalname || 'image.jpg').split('.').pop();
    const s3Key = `uploads/${userId}/${uuidv4()}.${fileExtension}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype || 'image/jpeg',
        }),
      );

      const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;

      const uploadRecord = await this.prisma.upload.create({
        data: {
          userId,
          fileUrl,
          fileType: file.mimetype || 'image/jpeg',
          s3Key,
        },
      });

      return {
        success: true,
        data: uploadRecord,
        message: 'File uploaded successfully',
      };
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }
}
