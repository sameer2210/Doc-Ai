import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AppModule } from '@app/app.module';
import { UploadsService } from '../../src/uploads/uploads.service';
import { PrismaService } from '@prisma-local/prisma.service';
import { TestUserFactory } from '../utils/test-user-factory';
import { cleanupDatabase } from '../utils/cleanup';
import { S3Client } from '@aws-sdk/client-s3';
import { BadRequestException } from '@nestjs/common';
import type { User } from '@prisma/client';

// Helper to create a valid minimal PNG buffer for dimensions check
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

describe('UploadsService (Integration)', () => {
  let moduleRef: TestingModule;
  let uploadsService: UploadsService;
  let prisma: PrismaService;
  let userFactory: TestUserFactory;
  let testUser: User;
  let s3SendSpy: jest.SpyInstance;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    uploadsService = moduleRef.get<UploadsService>(UploadsService);
    prisma = moduleRef.get<PrismaService>(PrismaService);
    userFactory = new TestUserFactory(prisma);

    await cleanupDatabase(prisma);
    testUser = await userFactory.create();

    // Mock S3 putObject command to avoid actual AWS S3 network calls
    s3SendSpy = jest.spyOn(S3Client.prototype, 'send').mockImplementation(async () => {
      return {} as never;
    });
  });

  afterAll(async () => {
    s3SendSpy.mockRestore();
    await cleanupDatabase(prisma);
    await prisma.$disconnect();
    await moduleRef.close();
  });

  describe('generatePresignedUrl', () => {
    it('should generate a valid presigned upload URL and save metadata', async () => {
      const dto = {
        fileName: 'test-document.pdf',
        fileType: 'application/pdf',
        fileSize: 1024 * 1024, // 1MB
      };

      const result = await uploadsService.generatePresignedUrl(dto, testUser.id);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('fileUrl');
      expect(result.fileUrl).toContain('test-document.pdf');

      // Check DB record
      const uploadRecord = await prisma.upload.findUnique({
        where: { id: result.id },
      });
      expect(uploadRecord).toBeDefined();
      expect(uploadRecord?.userId).toBe(testUser.id);
      expect(uploadRecord?.fileType).toBe(dto.fileType);
    });

    it('should throw BadRequestException on unsupported mimetype', async () => {
      const dto = {
        fileName: 'dangerous.exe',
        fileType: 'application/x-msdownload',
        fileSize: 1024,
      };

      await expect(
        uploadsService.generatePresignedUrl(dto, testUser.id)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadFile (Direct Multipart)', () => {
    it('should validate file, execute S3 Put, and save metadata', async () => {
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'eye.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: buildPngBuffer(200, 200),
        size: 200,
        destination: '',
        filename: '',
        path: '',
        stream: null as never,
      };

      const result = await uploadsService.uploadFile(file, testUser.id);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.fileType).toBe('image/png');
      expect(s3SendSpy).toHaveBeenCalled();

      // Check database
      const record = await prisma.upload.findUnique({
        where: { id: result.data.id },
      });
      expect(record).toBeDefined();
      expect(record?.userId).toBe(testUser.id);
    });

    it('should fail validation and throw error for oversized file', async () => {
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'huge.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: buildPngBuffer(200, 200),
        size: 10 * 1024 * 1024, // 10MB (cap is 5MB)
        destination: '',
        filename: '',
        path: '',
        stream: null as never,
      };

      await expect(
        uploadsService.uploadFile(file, testUser.id)
      ).rejects.toThrow();
    });
  });
});
