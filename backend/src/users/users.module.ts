import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuditLogService } from '@audit-log/audit-log.service';
import { HashService } from '@auth/hash/hash.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AuditLogService, HashService],
  exports: [UsersService],
})
export class UsersModule {}
