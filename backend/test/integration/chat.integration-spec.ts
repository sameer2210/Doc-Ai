import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@app/app.module';
import { ChatService } from '@chat/chat.service';
import { PrismaService } from '@prisma-local/prisma.service';
import { TestUserFactory } from '../utils/test-user-factory';
import { ChatFactory } from '../utils/chat-factory';
import { cleanupDatabase } from '../utils/cleanup';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('ChatService (Integration)', () => {
  let moduleRef: TestingModule;
  let chatService: ChatService;
  let prisma: PrismaService;
  let userFactory: TestUserFactory;
  let chatFactory: ChatFactory;

  let testUser1: any;
  let testUser2: any;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    chatService = moduleRef.get<ChatService>(ChatService);
    prisma = moduleRef.get<PrismaService>(PrismaService);
    userFactory = new TestUserFactory(prisma);
    chatFactory = new ChatFactory(prisma);

    // Clean up
    await cleanupDatabase(prisma);

    // Create two test users
    testUser1 = await userFactory.create();
    testUser2 = await userFactory.create();
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await prisma.$disconnect();
    await moduleRef.close();
  });

  describe('ensureDefaultChat', () => {
    it('should create a new default chat if none exists', async () => {
      const chatId = await chatService.ensureDefaultChat(testUser1.id);
      expect(chatId).toBeDefined();

      const chat = await prisma.chat.findUnique({ where: { id: chatId } });
      expect(chat).toBeDefined();
      expect(chat?.userId).toBe(testUser1.id);
      expect(chat?.title).toBe('AI Health Consultation');
    });

    it('should return existing chat if one already exists', async () => {
      const firstChatId = await chatService.ensureDefaultChat(testUser1.id);
      const secondChatId = await chatService.ensureDefaultChat(testUser1.id);
      expect(secondChatId).toBe(firstChatId);
    });
  });

  describe('saveUserMessage', () => {
    it('should save a user message and return an assistant placeholder message', async () => {
      const chatId = await chatService.ensureDefaultChat(testUser1.id);
      const content = 'Hello AI assistant!';
      
      const result = await chatService.saveUserMessage(chatId, testUser1.id, content);
      
      expect(result).toHaveProperty('userMessage');
      expect(result.userMessage.content).toBe(content);
      expect(result).toHaveProperty('assistantMessageId');

      // Check DB values
      const userMsg = await prisma.message.findUnique({
        where: { id: result.userMessage.id },
      });
      expect(userMsg).toBeDefined();
      expect(userMsg?.role).toBe('USER');
      expect(userMsg?.content).toBe(content);

      const assistantMsg = await prisma.message.findUnique({
        where: { id: result.assistantMessageId },
      });
      expect(assistantMsg).toBeDefined();
      expect(assistantMsg?.role).toBe('ASSISTANT');
      expect(assistantMsg?.content).toBe('');
    });

    it('should throw ForbiddenException if user does not own the chat', async () => {
      const chatId = await chatService.ensureDefaultChat(testUser1.id);
      await expect(
        chatService.saveUserMessage(chatId, testUser2.id, 'Hello!')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listMessages and Pagination', () => {
    it('should list messages in newest-first order with pagination metadata', async () => {
      // Clear messages for user 1
      const chatId = await chatService.ensureDefaultChat(testUser1.id);
      await prisma.message.deleteMany({ where: { chatId } });

      // Create 5 messages
      for (let i = 0; i < 5; i++) {
        await chatFactory.createMessage(chatId, 'USER', `Message ${i}`, {
          createdAt: new Date(Date.now() + i * 1000), // unique incremental times
        });
      }

      // List messages with limit 3
      const listResult = await chatService.listMessages(chatId, testUser1.id, undefined, 3);
      
      expect(listResult.items.length).toBe(3);
      // Newest first order: message 4, message 3, message 2
      expect(listResult.items[0].content).toBe('Message 4');
      expect(listResult.items[1].content).toBe('Message 3');
      expect(listResult.items[2].content).toBe('Message 2');
      expect(listResult.nextCursor).toBeDefined();

      // Fetch next page using nextCursor
      const nextPageResult = await chatService.listMessages(
        chatId,
        testUser1.id,
        listResult.nextCursor!,
        3,
      );
      expect(nextPageResult.items.length).toBe(2);
      expect(nextPageResult.items[0].content).toBe('Message 1');
      expect(nextPageResult.items[1].content).toBe('Message 0');
      expect(nextPageResult.nextCursor).toBeNull();
    });

    it('should throw BadRequestException for invalid cursor', async () => {
      const chatId = await chatService.ensureDefaultChat(testUser1.id);
      await expect(
        chatService.listMessages(chatId, testUser1.id, 'invalid-uuid')
      ).rejects.toThrow(BadRequestException);
    });
  });
});
