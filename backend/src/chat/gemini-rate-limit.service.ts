import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';

@Injectable()
export class GeminiRateLimitService {
  private readonly logger = new Logger(GeminiRateLimitService.name);
  private readonly DAILY_LIMIT = 10;
  private readonly GEMINI_USAGE_ACTION = 'GEMINI_QUERY';
  private readonly GEMINI_USAGE_CONTEXT = 'system';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks if user has exceeded the daily limit (10).
   * Uses audit-log records as usage ledger so no dedicated counter table is required.
   */
  async checkAndIncrementLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const now = new Date();
    const dayStartUtc = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const nextDayStartUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000);

    return await this.prisma.$transaction(async (tx) => {
      const usageCount = await tx.auditLog.count({
        where: {
          userId,
          action: this.GEMINI_USAGE_ACTION,
          context: this.GEMINI_USAGE_CONTEXT,
          createdAt: {
            gte: dayStartUtc,
            lt: nextDayStartUtc,
          },
        },
      });

      if (usageCount >= this.DAILY_LIMIT) {
        this.logger.warn(`User ${userId} exceeded daily Gemini limit (${this.DAILY_LIMIT}).`);
        return { allowed: false, remaining: 0 };
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: this.GEMINI_USAGE_ACTION,
          context: this.GEMINI_USAGE_CONTEXT,
          metadata: {
            source: 'gemini-rate-limit',
            usedAt: now.toISOString(),
          },
        },
      });

      const remaining = this.DAILY_LIMIT - (usageCount + 1);
      return { allowed: true, remaining };
    });
  }
}
