import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConfigModule } from '@config/config.module';
import { PrismaService } from '@prisma-local/prisma.service';
import { GeminiRateLimitService } from './gemini-rate-limit.service';
import { GeminiProviderService } from './services/gemini-provider.service';
import { ChatHistoryService } from './services/chat-history.service';
import { ChatPersistenceService } from './services/chat-persistence.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 60_000,
      maxRedirects: 3,
    }),
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    PrismaService,
    GeminiRateLimitService,
    GeminiProviderService,
    ChatHistoryService,
    ChatPersistenceService,
  ],
  exports: [ChatService, GeminiRateLimitService],
})
export class ChatModule {}
