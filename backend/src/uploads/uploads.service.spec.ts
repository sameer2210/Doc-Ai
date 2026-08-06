import { UploadsService } from './uploads.service';
import type { PrismaService } from '@prisma-local/prisma.service';
import type { ConfigService } from '@config/config.service';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException, InternalServerErrorException, PayloadTooLargeException } from '@nestjs/common';
import { Buffer } from 'node:buffer';

jest.mock('@aws-sdk/client-s3', () => {
  const original = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...original,
    S3Client: jest.fn().mockImplementation(() => {
      return {
        send: jest.fn(),
      };
    }),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    getSignedUrl: jest.fn(),
  };
});

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

describe('UploadsService', () => {
  let service: UploadsService;
  let prisma: any;
  let configService: any;
  let s3ClientInstance: any;

  beforeEach(() => {
    prisma = {
      upload: {
        create: jest.fn(),
      },
    };

    configService = {
      awsBucketRegion: 'ap-south-1',
      awsAccessKeyId: 'test-access-key',
      awsAccessSecret: 'test-secret-key',
      awsBucketName: 'test-bucket-name',
    };

    jest.clearAllMocks();

    service = new UploadsService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
    );

    s3ClientInstance = (service as any).s3Client;
  });

  describe('generatePresignedUrl', () => {
    it('successfully generates a presigned url and creates an upload record (happy path)', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://s3.amazonaws.com/signed-url');

      const mockUploadRecord = {
        id: 'upload-abc',
        userId: 'user-123',
        fileUrl: 'https://test-bucket-name.s3.ap-south-1.amazonaws.com/uploads/user-123/mock-key',
        fileType: 'image/png',
        s3Key: 'uploads/user-123/mock-key',
      };
      prisma.upload.create.mockResolvedValue(mockUploadRecord);

      const result = await service.generatePresignedUrl(
        {
          fileType: 'image/png',
          fileSize: 1024 * 1024,
          fileName: 'avatar.png',
        },
        'user-123',
      );

      expect(result).toEqual({
        id: 'upload-abc',
        uploadUrl: 'https://s3.amazonaws.com/signed-url',
        fileUrl: expect.stringContaining('https://test-bucket-name.s3.ap-south-1.amazonaws.com/uploads/user-123/'),
      });

      expect(getSignedUrl).toHaveBeenCalledWith(
        s3ClientInstance,
        expect.any(Object),
        { expiresIn: 900 },
      );
      expect(prisma.upload.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          fileType: 'image/png',
          s3Key: expect.stringContaining('uploads/user-123/'),
        }),
      });
    });

    it('rejects unsupported file type with BadRequestException', async () => {
      await expect(
        service.generatePresignedUrl(
          {
            fileType: 'image/gif',
            fileSize: 1024,
            fileName: 'unsupported.gif',
          },
          'user-123',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.upload.create).not.toHaveBeenCalled();
    });

    it('rejects empty or whitespace file names', async () => {
      await expect(
        service.generatePresignedUrl(
          {
            fileType: 'image/png',
            fileSize: 1024,
            fileName: '   ',
          },
          'user-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-finite or negative file sizes', async () => {
      await expect(
        service.generatePresignedUrl(
          {
            fileType: 'image/png',
            fileSize: -50,
            fileName: 'negative.png',
          },
          'user-123',
        ),
      ).rejects.toThrow(PayloadTooLargeException);

      await expect(
        service.generatePresignedUrl(
          {
            fileType: 'image/png',
            fileSize: Infinity,
            fileName: 'infinite.png',
          },
          'user-123',
        ),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('rejects sizes larger than 50 MB limit', async () => {
      await expect(
        service.generatePresignedUrl(
          {
            fileType: 'image/png',
            fileSize: 50 * 1024 * 1024 + 1,
            fileName: 'huge.png',
          },
          'user-123',
        ),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('throws InternalServerErrorException if prisma database insertion fails', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://s3.amazonaws.com/signed-url');
      prisma.upload.create.mockRejectedValue(new Error('Prisma database down'));

      await expect(
        service.generatePresignedUrl(
          {
            fileType: 'image/png',
            fileSize: 1024,
            fileName: 'file.png',
          },
          'user-123',
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException if S3 getSignedUrl fails', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('S3 handshake failed'));

      await expect(
        service.generatePresignedUrl(
          {
            fileType: 'image/png',
            fileSize: 1024,
            fileName: 'file.png',
          },
          'user-123',
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('uploadFile', () => {
    const validMulterFile = {
      buffer: buildPngBuffer(1024, 768),
      mimetype: 'image/png',
      size: 1 * 1024 * 1024,
      originalname: 'scan.png',
    } as Express.Multer.File;

    it('successfully uploads file buffer to S3 and returns creation record (happy path)', async () => {
      s3ClientInstance.send.mockResolvedValue({});

      const mockUploadRecord = {
        id: 'upload-xyz',
        userId: 'user-123',
        fileUrl: 'https://test-bucket-name.s3.ap-south-1.amazonaws.com/uploads/user-123/uuid.png',
        fileType: 'image/png',
        s3Key: 'uploads/user-123/uuid.png',
      };
      prisma.upload.create.mockResolvedValue(mockUploadRecord);

      const result = await service.uploadFile(validMulterFile, 'user-123');

      expect(result).toEqual({
        success: true,
        data: mockUploadRecord,
        message: 'File uploaded successfully',
      });

      expect(s3ClientInstance.send).toHaveBeenCalled();
      expect(prisma.upload.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          fileType: 'image/png',
          s3Key: expect.stringContaining('uploads/user-123/'),
        }),
      });
    });

    it('throws InternalServerErrorException and stops when S3 client send throws', async () => {
      s3ClientInstance.send.mockRejectedValue(new Error('S3 Access Denied'));

      await expect(
        service.uploadFile(validMulterFile, 'user-123'),
      ).rejects.toThrow(InternalServerErrorException);

      expect(prisma.upload.create).not.toHaveBeenCalled();
    });

    it('throws InternalServerErrorException if database record creation fails', async () => {
      s3ClientInstance.send.mockResolvedValue({});
      prisma.upload.create.mockRejectedValue(new Error('Database unique constraint violated'));

      await expect(
        service.uploadFile(validMulterFile, 'user-123'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('deleteObjects', () => {
    it('should successfully call S3 client send to delete keys', async () => {
      s3ClientInstance.send.mockResolvedValue({});

      await expect(service.deleteObjects(['key1', 'key2'])).resolves.not.toThrow();

      expect(s3ClientInstance.send).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if S3 client send fails', async () => {
      s3ClientInstance.send.mockRejectedValue(new Error('S3 error'));

      await expect(service.deleteObjects(['key1'])).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
