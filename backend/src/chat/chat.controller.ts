import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { IsString, IsNotEmpty, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { GetUser } from '@common/decorators/get-user.decorator';

const SSE_STREAM_TIMEOUT_MS = 75_000;
const SSE_HEARTBEAT_MS = 15_000;

function writeSseChunk(res: Response, chunk: string): Promise<void> {
  if (res.writableEnded || res.destroyed) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onDrain = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      res.off('error', onError);
      res.off('drain', onDrain);
    };

    res.once('error', onError);
    const canContinue = res.write(chunk);
    if (canContinue) {
      cleanup();
      resolve();
      return;
    }
    res.once('drain', onDrain);
  });
}

// ─── DTOs ────────────────────────────────────────────────────────────────────
class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4_000)
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
  @MaxLength(80)
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
  private readonly logger = new Logger(ChatController.name);

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
      userId,
      cursor,
      limit ? Number(limit) : 30,
    );
    return data;
  }

  // ─── POST /chats/:chatId/messages ────────────────────────────────────────────
  @Post(':chatId/messages')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
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
      userId,
      body.content,
    );
    return result;
  }

  // ─── POST /chats/:chatId/stream ──────────────────────────────────────────────
  @Post(':chatId/stream')
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @ApiOperation({ summary: 'Stream assistant response (SSE)' })
  async streamResponse(
    @Param('chatId') chatId: string,
    @GetUser('userId') userId: string,
    @Body() body: StreamMessageDto,
    @Req() req: Request,
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
    const abortController = new AbortController();
    const streamTimeout = setTimeout(() => {
      abortController.abort(new Error('SSE stream timeout'));
    }, SSE_STREAM_TIMEOUT_MS);
    const heartbeat = setInterval(() => {
      void writeSseChunk(res, ': ping\n\n').catch((error) => {
        this.logger.warn(
          `stream.heartbeat_failed chat=${resolvedChatId} assistantMessage=${body.assistantMessageId} message=${error.message}`,
        );
        abortController.abort(error);
      });
    }, SSE_HEARTBEAT_MS);
    const onClientClose = () => {
      abortController.abort(new Error('SSE client disconnected'));
    };
    req.on('close', onClientClose);

    try {
      for await (const chunk of this.chatService.streamResponse(
        resolvedChatId,
        body.assistantMessageId,
        userId,
        { signal: abortController.signal },
      )) {
        if (!res.writableEnded) {
          await writeSseChunk(res, chunk);
        }
      }
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `stream.controller_error chat=${resolvedChatId} assistantMessage=${body.assistantMessageId} message=${error.message}`,
        error.stack,
      );
    } finally {
      clearTimeout(streamTimeout);
      clearInterval(heartbeat);
      req.off('close', onClientClose);
      if (!res.writableEnded) {
        res.end();
      }
    }
  }

  // ─── POST /chats/:chatId/consultation ──────────────────────────────────────────
  @Post(':chatId/consultation')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
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
