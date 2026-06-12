import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';
import { Prisma } from '@prisma/client';
import {
  SYSTEM_INSTRUCTION,
  MAX_HISTORY_MESSAGES,
  MAX_HISTORY_CHARS,
  KNOWN_FAILED_ASSISTANT_TEXTS,
} from '../constants/chat.constants';

export interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

@Injectable()
export class ChatHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  private getStreamState(
    metadata: Prisma.JsonObject | null,
  ): 'pending' | 'complete' | 'error' | null {
    if (!metadata) {
      return null;
    }
    const rawState = metadata.streamState;
    if (
      rawState === 'pending' ||
      rawState === 'complete' ||
      rawState === 'error'
    ) {
      return rawState;
    }
    return null;
  }

  private toJsonObject(
    value: Prisma.JsonValue | null | undefined,
  ): Prisma.JsonObject | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Prisma.JsonObject;
  }

  compactText(raw: string): string {
    return raw.replace(/\s+/g, ' ').trim();
  }

  shouldSkipForHistory(
    role: 'USER' | 'ASSISTANT' | 'SYSTEM',
    text: string,
    metadata: Prisma.JsonObject | null,
  ): boolean {
    if (role === 'SYSTEM') {
      return true;
    }
    if (!text) {
      return true;
    }
    if (KNOWN_FAILED_ASSISTANT_TEXTS.has(text)) {
      return true;
    }
    const streamState = this.getStreamState(metadata);
    if (role === 'ASSISTANT' && streamState === 'pending') {
      return true;
    }
    if (streamState === 'error') {
      return true;
    }
    if (
      role === 'ASSISTANT' &&
      metadata &&
      typeof metadata.streamIntegrity === 'string' &&
      metadata.streamIntegrity === 'incomplete'
    ) {
      return true;
    }
    if (role === 'ASSISTANT' && streamState === 'complete') {
      const hasExplicitIntegrity =
        metadata &&
        typeof metadata.streamIntegrity === 'string' &&
        metadata.streamIntegrity === 'complete';
      const hasFinishReason =
        metadata &&
        typeof metadata.providerFinishReason === 'string' &&
        metadata.providerFinishReason.length > 0;
      const looksLegacyAndTruncated =
        !hasExplicitIntegrity &&
        !hasFinishReason &&
        text.length < 45 &&
        !/[.!?]$/.test(text);
      if (looksLegacyAndTruncated) {
        return true;
      }
    }
    return false;
  }

  isStructuredScanUserMessage(text: string): boolean {
    const lowered = text.toLowerCase();
    return (
      lowered.includes('eye scan result') &&
      lowered.includes('detected condition') &&
      lowered.includes('ai confidence')
    );
  }

  async buildHistory(
    chatId: string,
    assistantMessageId: string,
  ): Promise<{
    contents: GeminiContent[];
    totalChars: number;
    estimatedInputTokens: number;
  }> {
    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        NOT: { id: assistantMessageId },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        role: true,
        content: true,
        metadata: true,
      },
    });

    const chronologic = [...messages].reverse();
    let latestScanUserIndex = -1;
    let latestScanAssistantIndex = -1;
    for (let idx = chronologic.length - 1; idx >= 0; idx -= 1) {
      const message = chronologic[idx];
      const compacted = this.compactText(message.content ?? '');
      const metadata = this.toJsonObject(message.metadata);

      if (
        latestScanUserIndex === -1 &&
        message.role === 'USER' &&
        this.isStructuredScanUserMessage(compacted)
      ) {
        latestScanUserIndex = idx;
      }

      if (
        latestScanAssistantIndex === -1 &&
        message.role === 'ASSISTANT' &&
        metadata?.type === 'scan_result'
      ) {
        latestScanAssistantIndex = idx;
      }

      if (latestScanUserIndex !== -1 && latestScanAssistantIndex !== -1) {
        break;
      }
    }

    const deDuplicated: GeminiContent[] = [];

    for (let idx = 0; idx < chronologic.length; idx += 1) {
      const message = chronologic[idx];
      const compacted = this.compactText(message.content ?? '');
      const metadata = this.toJsonObject(message.metadata);

      if (
        message.role === 'USER' &&
        this.isStructuredScanUserMessage(compacted) &&
        idx !== latestScanUserIndex
      ) {
        continue;
      }

      if (
        message.role === 'ASSISTANT' &&
        metadata?.type === 'scan_result' &&
        idx !== latestScanAssistantIndex
      ) {
        continue;
      }

      if (this.shouldSkipForHistory(message.role, compacted, metadata)) {
        continue;
      }

      const nextRole: GeminiContent['role'] =
        message.role === 'USER' ? 'user' : 'model';
      const previous = deDuplicated[deDuplicated.length - 1];
      if (
        previous &&
        previous.role === nextRole &&
        previous.parts[0]?.text === compacted
      ) {
        continue;
      }

      deDuplicated.push({
        role: nextRole,
        parts: [{ text: compacted }],
      });
    }

    const recentWindow = deDuplicated.slice(-MAX_HISTORY_MESSAGES);
    const budgeted: GeminiContent[] = [];
    let totalChars = 0;

    for (let idx = recentWindow.length - 1; idx >= 0; idx -= 1) {
      const item = recentWindow[idx];
      const text = item.parts[0]?.text ?? '';
      if (!text) {
        continue;
      }
      const canAdd =
        totalChars + text.length <= MAX_HISTORY_CHARS ||
        budgeted.length < 2;
      if (!canAdd) {
        continue;
      }
      budgeted.unshift(item);
      totalChars += text.length;
    }

    const estimatedInputTokens = Math.ceil(
      (SYSTEM_INSTRUCTION.length + totalChars) / 4,
    );

    return {
      contents: budgeted,
      totalChars,
      estimatedInputTokens,
    };
  }
}
