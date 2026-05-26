import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';

@Injectable()
export class GeminiRateLimitService {
  private readonly logger = new Logger(GeminiRateLimitService.name);
  private readonly DAILY_LIMIT = 10;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks if user has exceeded the daily limit (10).
   * Automatically resets the count if the last used date is on a previous calendar day.
   */
  async checkAndIncrementLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const now = new Date();
    
    return await this.prisma.$transaction(async (tx) => {
      // Find or create usage record
      let usage = await tx.geminiUsage.findUnique({
        where: { userId },
      });

      if (!usage) {
        usage = await tx.geminiUsage.create({
          data: {
            userId,
            count: 1,
            lastUsed: now,
          },
        });
        return { allowed: true, remaining: this.DAILY_LIMIT - 1 };
      }

      // Check if last used day is different from today (UTC day check)
      const lastUsedDate = new Date(usage.lastUsed);
      const isDifferentDay =
        lastUsedDate.getUTCDate() !== now.getUTCDate() ||
        lastUsedDate.getUTCMonth() !== now.getUTCMonth() ||
        lastUsedDate.getUTCFullYear() !== now.getUTCFullYear();

      if (isDifferentDay) {
        // Reset the counter
        const updated = await tx.geminiUsage.update({
          where: { userId },
          data: {
            count: 1,
            lastUsed: now,
          },
        });
        return { allowed: true, remaining: this.DAILY_LIMIT - 1 };
      }

      if (usage.count >= this.DAILY_LIMIT) {
        return { allowed: false, remaining: 0 };
      }

      // Increment count
      const updated = await tx.geminiUsage.update({
        where: { userId },
        data: {
          count: usage.count + 1,
          lastUsed: now,
        },
      });

      return { allowed: true, remaining: this.DAILY_LIMIT - updated.count };
    });
  }
}
