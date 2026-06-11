import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { PrismaService } from '@prisma-local/prisma.service';

@Injectable()
export class GeminiRateLimitService implements OnModuleInit {
  private readonly logger = new Logger(GeminiRateLimitService.name);
  private readonly GEMINI_USAGE_ACTION = 'GEMINI_QUERY';
  private readonly GEMINI_USAGE_CONTEXT = 'system';
  private readonly dailyLimit: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.dailyLimit = this.configService.geminiDailyLimit;
  }

  onModuleInit(): void {
    this.logger.log(`Gemini daily limit configured: ${this.dailyLimit}`);
  }

  async checkAndIncrementLimit(
    userId: string,
  ): Promise<{ allowed: boolean; remaining: number }> {
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

    const nextDayStartUtc = new Date(
      dayStartUtc.getTime() + 24 * 60 * 60 * 1000,
    );

    try {
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

        const dailyLimit = this.dailyLimit;

        if (usageCount >= dailyLimit) {
          this.logger.warn(
            `User ${userId} exceeded daily Gemini limit (${dailyLimit}).`,
          );

          return {
            allowed: false,
            remaining: 0,
          };
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

        return {
          allowed: true,
          remaining: dailyLimit - (usageCount + 1),
        };
      });
    } catch (error) {
      this.logger.error(
        `gemini.rate_limit_transaction_failed user=${userId} message=${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new InternalServerErrorException(
        'Failed to validate AI usage limit',
      );
    }
  }
}
