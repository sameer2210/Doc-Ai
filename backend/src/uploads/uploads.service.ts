import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '@prisma-local/prisma.service';
import { ConfigService } from '@config/config.service';
import { v4 as uuidv4 } from 'uuid';

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
