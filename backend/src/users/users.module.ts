import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '@prisma-local/prisma.service';
import { UsersController } from './users.controller';
import { AuditLogService } from '@audit-log/audit-log.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, AuditLogService],
  exports: [UsersService],
})
export class UsersModule {}
