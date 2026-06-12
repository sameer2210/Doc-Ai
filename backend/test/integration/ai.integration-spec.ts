import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@app/app.module';
import { AiService } from '../src/ai/ai.service';
import { ChatService } from '@chat/chat.service';
import { PrismaService } from '@prisma-local/prisma.service';
import { TestUserFactory } from '../utils/test-user-factory';
import { cleanupDatabase } from '../utils/cleanup';
import { HttpService } from '@nestjs/axios';
import { S3Client } from '@aws-sdk/client-s3';
import { of } from 'rxjs';

// Helper to create a valid minimal PNG buffer
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

describe('AiService and Consultation (Integration)', () => {
  let moduleRef: TestingModule;
  let aiService: AiService;
  let chatService: ChatService;
  let prisma: PrismaService;
  let httpService: HttpService;
  let userFactory: TestUserFactory;
  let testUser: any;
  let s3SendSpy: jest.SpyInstance;
  let httpPostSpy: jest.SpyInstance;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    aiService = moduleRef.get<AiService>(AiService);
    chatService = moduleRef.get<ChatService>(ChatService);
    prisma = moduleRef.get<PrismaService>(PrismaService);
    httpService = moduleRef.get<HttpService>(HttpService);
    userFactory = new TestUserFactory(prisma);

    await cleanupDatabase(prisma);
    testUser = await userFactory.create();

    // Mock S3
    s3SendSpy = jest.spyOn(S3Client.prototype, 'send').mockImplementation(async () => {
      return {} as any;
    });

    // Mock Hugging Face HttpService POST call
    httpPostSpy = jest.spyOn(httpService, 'post').mockImplementation(() => {
      return of({
        data: { prediction: 'Immature_Cataract', confidence: 0.87 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as any);
    });
  });

  afterAll(async () => {
    s3SendSpy.mockRestore();
    httpPostSpy.mockRestore();
    await cleanupDatabase(prisma);
    await prisma.$disconnect();
    await moduleRef.close();
  });

  describe('predictCataract Pipeline', () => {
    it('should run prediction pipeline, save upload record, and create DB prediction entry', async () => {
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'eye-scan.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: buildPngBuffer(256, 256),
        size: 256,
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const result = await aiService.predictCataract(file, {}, testUser.id);
      
      expect(result).toEqual({
        prediction: 'Immature_Cataract',
        confidence: 0.87,
        uploadedImageUrl: expect.any(String),
        chatId: expect.any(String),
      });

      // Verify records are saved in DB
      const predictionRecord = await prisma.aiPrediction.findFirst({
        where: { userId: testUser.id },
      });
      expect(predictionRecord).toBeDefined();
      expect(predictionRecord?.prediction).toBe('Immature_Cataract');
      expect(predictionRecord?.confidence).toBe(0.87);
    });
  });

  describe('startConsultation and Persistence', () => {
    it('should initialize a consultation in the database', async () => {
      const chatId = await chatService.ensureDefaultChat(testUser.id);
      
      const result = await chatService.startConsultation(
        chatId,
        'Immature_Cataract',
        0.87,
        testUser.id,
      );

      expect(result).toHaveProperty('userMessage');
      expect(result).toHaveProperty('assistantMessageId');
      expect(result.limitReached).toBe(false);

      // Verify messages are created in the database
      const assistantMsg = await prisma.message.findUnique({
        where: { id: result.assistantMessageId },
      });
      expect(assistantMsg).toBeDefined();
      expect(assistantMsg?.role).toBe('ASSISTANT');
      // Stream state should be set to pending initially
      const meta = assistantMsg?.metadata as any;
      expect(meta?.streamState).toBe('pending');
    });

    it('should persist assistant success responses', async () => {
      const chatId = await chatService.ensureDefaultChat(testUser.id);
      const assistantMessageId = (await prisma.message.findFirst({
        where: { chatId, role: 'ASSISTANT' },
        orderBy: { createdAt: 'desc' },
      }))!.id;

      const generatedText = 'Based on the scan, I recommend consulting an eye doctor.';
      await chatService.persistAssistantSuccess(chatId, assistantMessageId, generatedText);

      // Verify content is saved in DB
      const updatedMsg = await prisma.message.findUnique({
        where: { id: assistantMessageId },
      });
      expect(updatedMsg?.content).toBe(generatedText);
      const meta = updatedMsg?.metadata as any;
      expect(meta?.streamState).toBe('complete');
    });
  });
});
