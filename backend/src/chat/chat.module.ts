import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConfigModule } from '@config/config.module';
import { PrismaService } from '@prisma-local/prisma.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 60_000,
      maxRedirects: 3,
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, PrismaService],
  exports: [ChatService],
})
export class ChatModule {}
