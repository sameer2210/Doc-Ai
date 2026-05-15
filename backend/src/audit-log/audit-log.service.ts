import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';
import { AuditAction, AuditContext } from '@common/constants/audit.enum'; // Optional: use enums for type safety
import { QueryAuditDto } from './dto/query-audit.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logEvent({
    userId,
    action,
    context,
    metadata = {},
  }: {
    userId: string;
    action: AuditAction;
    context: AuditContext;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          context,
          metadata,
        },
      });

      this.logger.debug(
        `Audit log written: ${action} (${context}) by user ${userId}`,
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to write audit log: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          'Failed to write audit log: Unknown error',
          String(error),
        );
      }
    }
  }

  async getAuditLogs(query: QueryAuditDto) {
    const {
      skip = 0,
      take = 20,
      from,
      to,
      search,
      action,
      context,
      userId,
    } = query;

    const conditions: string[] = [];

    if (from) conditions.push(`"timestamp" >= '${from}'`);
    if (to) conditions.push(`"timestamp" <= '${to}'`);
    if (action) conditions.push(`"action" = '${action}'`);
    if (context) conditions.push(`"context" = '${context}'`);
    if (userId) conditions.push(`"userId" = '${userId}'`);
    if (search)
      conditions.push(`LOWER(metadata::text) LIKE LOWER('%${search}%')`);

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    return this.prisma.$queryRawUnsafe(
      `SELECT * FROM "AuditLog" ${whereClause} ORDER BY "timestamp" DESC LIMIT ${take} OFFSET ${skip}`,
    );
  }
}
