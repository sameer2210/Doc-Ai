import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '@prisma-local/prisma.service';
import { ConfigService } from '@config/config.service';
import { v4 as uuidv4 } from 'uuid';
import { PresignedUrlDto } from './dto/presigned-url.dto';

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

    const bucketName = this.configService.awsBucketName;
    const region = this.configService.awsBucketRegion;
    const safeFileName = dto.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
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

  async uploadFile(file: any, userId: string) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No valid file buffer received. Ensure the file was uploaded correctly.');
    }
    const bucketName = this.configService.awsBucketName;
    const region = this.configService.awsBucketRegion;
    const fileExtension = (file.originalname || file.name || 'image.jpg').split('.').pop();
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
