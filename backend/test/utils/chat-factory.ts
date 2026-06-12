import { PrismaService } from '@prisma-local/prisma.service';
import { SenderRole } from '@prisma/client';

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
    overrides: { createdAt?: Date; metadata?: any } = {},
  ) {
    return this.prisma.message.create({
      data: {
        chatId,
        role,
        content,
        metadata: overrides.metadata ?? {},
        createdAt: overrides.createdAt ?? new Date(),
      },
    });
  }
}
