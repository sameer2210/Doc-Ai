import type { PrismaService } from '@prisma-local/prisma.service';
import { SenderRole } from '@prisma/client';

export class DatabaseSeeder {
  constructor(private readonly prisma: PrismaService) {}

  async seedMessages(chatId: string, count: number) {
    const baseTime = Date.now() - count * 1000; // start in the past
    const messagesData = Array.from({ length: count }).map((_, index) => {
      // Ensure that as index increases, messages get newer (index 0 is oldest, index count-1 is newest)
      return {
        chatId,
        role: index % 2 === 0 ? SenderRole.USER : SenderRole.ASSISTANT,
        content: `Message content ${index}`,
        createdAt: new Date(baseTime + index * 1000),
      };
    });

    // We can insert them one-by-one or in transaction to maintain exact ordering and dates
    await this.prisma.$transaction(
      messagesData.map((data) =>
        this.prisma.message.create({
          data,
        }),
      ),
    );
  }
}
