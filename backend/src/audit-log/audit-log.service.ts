import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';
import { AuditAction, AuditContext } from '@common/constants/audit.enum'; // Optional: use enums for type safety
import { QueryAuditDto } from './dto/query-audit.dto';
import { AuditLog, Prisma } from '@prisma/client';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logEvent({
    userId,
    action,
    context,
    metadata = {},
    ipAddress,
    userAgent,
  }: {
    userId: string;
    action: AuditAction;
    context: AuditContext;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    try {
      const resolvedIpAddress = ipAddress ?? this.getStringMetadata(metadata, 'ip');
      const resolvedUserAgent =
        userAgent ?? this.getStringMetadata(metadata, 'userAgent');

      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          context,
          metadata: metadata as Prisma.InputJsonValue,
          ipAddress: resolvedIpAddress,
          userAgent: resolvedUserAgent,
        },
      });
      this.logger.debug(
        `Audit log written: ${action} (${context})`,
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

  private getStringMetadata(
    metadata: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = metadata[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
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

    const whereConditions: Prisma.Sql[] = [];

    if (from) {
      whereConditions.push(Prisma.sql`"createdAt" >= ${new Date(from)}`);
    }
    if (to) {
      whereConditions.push(Prisma.sql`"createdAt" <= ${new Date(to)}`);
    }
    if (action) {
      whereConditions.push(Prisma.sql`"action" = ${action}`);
    }
    if (context) {
      whereConditions.push(Prisma.sql`"context" = ${context}`);
    }
    if (userId) {
      whereConditions.push(Prisma.sql`"userId" = ${userId}`);
    }
    if (search) {
      whereConditions.push(
        Prisma.sql`LOWER(COALESCE("metadata"::text, '')) LIKE LOWER(${`%${search}%`})`,
      );
    }

    const whereClause =
      whereConditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}`
        : Prisma.empty;

    const querySql = Prisma.sql`
      SELECT *
      FROM "AuditLog"
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT ${take}
      OFFSET ${skip}
    `;

    return this.prisma.$queryRaw<AuditLog[]>(querySql);
  }
}
