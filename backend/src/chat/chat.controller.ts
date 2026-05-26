import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { GetUser } from '@common/decorators/get-user.decorator';

// ─── DTOs ────────────────────────────────────────────────────────────────────
class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}

class StreamMessageDto {
  @IsString()
  @IsNotEmpty()
  assistantMessageId!: string;
}

export class StartConsultationDto {
  @IsString()
  @IsNotEmpty()
  prediction!: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;
}

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ─── GET /chats/:chatId/messages ─────────────────────────────────────────────
  @Get(':chatId/messages')
  @ApiOperation({ summary: 'List paginated messages for a chat' })
  async listMessages(
    @Param('chatId') chatId: string,
    @GetUser('userId') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    // If chatId is 'default', resolve or create the user's default chat
    const resolvedChatId =
      chatId === 'default'
        ? await this.chatService.ensureDefaultChat(userId)
        : chatId;

    const data = await this.chatService.listMessages(
      resolvedChatId,
      cursor,
      limit ? Number(limit) : 30,
    );
    return data;
  }

  // ─── POST /chats/:chatId/messages ────────────────────────────────────────────
  @Post(':chatId/messages')
  @ApiOperation({ summary: 'Send a message (saves user msg + creates assistant placeholder)' })
  async sendMessage(
    @Param('chatId') chatId: string,
    @GetUser('userId') userId: string,
    @Body() body: SendMessageDto,
  ) {
    // Resolve 'default' to the user's real chat (or create it)
    const resolvedChatId =
      chatId === 'default'
        ? await this.chatService.ensureDefaultChat(userId)
        : chatId;

    const result = await this.chatService.saveUserMessage(
      resolvedChatId,
      body.content,
    );
    return result;
  }

  // ─── POST /chats/:chatId/stream ──────────────────────────────────────────────
  @Post(':chatId/stream')
  @ApiOperation({ summary: 'Stream assistant response (SSE)' })
  async streamResponse(
    @Param('chatId') chatId: string,
    @GetUser('userId') userId: string,
    @Body() body: StreamMessageDto,
    @Res() res: Response,
  ) {
    // Resolve 'default' to the user's real chat
    const resolvedChatId =
      chatId === 'default'
        ? await this.chatService.ensureDefaultChat(userId)
        : chatId;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

      try {
        for await (const chunk of this.chatService.streamResponse(
          resolvedChatId,
          body.assistantMessageId,
        )) {
          if (!res.writableEnded) {
            res.write(chunk);
          }
        }
      } catch (err) {
        this.chatService['logger'].error('Error in streamResponse controller endpoint:', err);
      } finally {
        if (!res.writableEnded) {
          res.end();
        }
      }
    }

    // ─── POST /chats/:chatId/consultation ──────────────────────────────────────────
  @Post(':chatId/consultation')
  @ApiOperation({ summary: 'Generate professional medical AI prompt and initialize consultation' })
  async startConsultation(
    @Param('chatId') chatId: string,
    @GetUser('userId') userId: string,
    @Body() body: StartConsultationDto,
  ) {
    const resolvedChatId =
      chatId === 'default'
        ? await this.chatService.ensureDefaultChat(userId)
        : chatId;

    return await this.chatService.startConsultation(
      resolvedChatId,
      body.prediction,
      body.confidence,
      userId,
    );
  }
}
