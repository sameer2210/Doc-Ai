import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';
import { Prisma } from '@prisma/client';
import { ProviderErrorDetails } from './gemini-provider.service';
import { AppLogger } from '@common/logger/logger.service';

type StreamState = 'pending' | 'complete' | 'error';

@Injectable()
export class ChatPersistenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {}

  private toJsonObject(
    value: Prisma.JsonValue | null | undefined,
  ): Prisma.JsonObject | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Prisma.JsonObject;
  }

  private mergeMetadataWithStreamState(
    metadata: Prisma.JsonObject | null,
    streamState: StreamState,
    extras?: Prisma.JsonObject,
  ): Prisma.JsonObject {
    return {
      ...(metadata ?? {}),
      ...(extras ?? {}),
      streamState,
    };
  }

  async persistAssistantError(
    chatId: string,
    assistantMessageId: string,
    details: ProviderErrorDetails,
  ): Promise<void> {
    const existing = await this.prisma.message.findFirst({
      where: { id: assistantMessageId, chatId, role: 'ASSISTANT' },
      select: { metadata: true },
    });
    if (!existing) {
      throw new BadRequestException('Invalid assistant message');
    }
    const metadata = this.toJsonObject(existing?.metadata);
    await this.prisma.message.updateMany({
      where: { id: assistantMessageId, chatId, role: 'ASSISTANT' },
      data: {
        content: '',
        metadata: this.mergeMetadataWithStreamState(metadata, 'error', {
          errorCode: details.code,
          ...(details.providerStatus
            ? { providerStatus: details.providerStatus }
            : {}),
        } as Prisma.JsonObject),
      },
    });
  }

  async persistAssistantErrorSafe(
    chatId: string,
    assistantMessageId: string,
    details: ProviderErrorDetails,
  ): Promise<boolean> {
    try {
      await this.persistAssistantError(chatId, assistantMessageId, details);
      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `stream.persist_error_failed assistantMessage=${assistantMessageId} message=${err.message}`,
        err.stack,
      );
      return false;
    }
  }

  async persistAssistantSuccess(
    chatId: string,
    assistantMessageId: string,
    generatedText: string,
    extras?: Prisma.JsonObject,
  ): Promise<void> {
    const existing = await this.prisma.message.findFirst({
      where: { id: assistantMessageId, chatId, role: 'ASSISTANT' },
      select: { metadata: true },
    });
    if (!existing) {
      throw new BadRequestException('Invalid assistant message');
    }
    const metadata = this.toJsonObject(existing?.metadata);
    const trimmed = generatedText.trim();
    await this.prisma.message.updateMany({
      where: { id: assistantMessageId, chatId, role: 'ASSISTANT' },
      data: {
        content: trimmed,
        tokenCount: Math.ceil(trimmed.length / 4),
        metadata: this.mergeMetadataWithStreamState(
          metadata,
          'complete',
          extras,
        ),
      },
    });
  }

  async persistAssistantSuccessSafe(
    chatId: string,
    assistantMessageId: string,
    generatedText: string,
    extras?: Prisma.JsonObject,
  ): Promise<boolean> {
    try {
      await this.persistAssistantSuccess(
        chatId,
        assistantMessageId,
        generatedText,
        extras,
      );
      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `stream.persist_success_failed assistantMessage=${assistantMessageId} message=${err.message}`,
        err.stack,
      );
      return false;
    }
  }
}
