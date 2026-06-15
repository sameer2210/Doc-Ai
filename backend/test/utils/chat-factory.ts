import type { PrismaService } from '@prisma-local/prisma.service';
import type { SenderRole, Prisma } from '@prisma/client';

export class ChatFactory {
  constructor(private readonly prisma: PrismaService) {}

  async createChat(userId: string, title = 'AI Health Consultation') {
    return this.prisma.chat.create({
      data: {
        userId,
        title,
      },
    });
  }

  async createMessage(
    chatId: string,
    role: SenderRole,
    content: string,
    overrides: { createdAt?: Date; metadata?: Record<string, unknown> } = {},
  ) {
    return this.prisma.message.create({
      data: {
        chatId,
        role,
        content,
        metadata: (overrides.metadata ?? {}) as Prisma.InputJsonValue,
        createdAt: overrides.createdAt ?? new Date(),
      },
    });
  }
}
