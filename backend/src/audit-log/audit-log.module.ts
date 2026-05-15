import { Module } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from '@prisma-local/prisma.service';

@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService, PrismaService],
})
export class AuditLogModule {}
