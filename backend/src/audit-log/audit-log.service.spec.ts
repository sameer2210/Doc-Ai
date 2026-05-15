import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from '@prisma-local/prisma.service';
import { AuditAction, AuditContext } from '@common/constants/audit.enum';
import { Logger } from '@nestjs/common';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prisma: {
    auditLog: { create: jest.Mock };
    $queryRawUnsafe: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn(),
      },
      $queryRawUnsafe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  describe('logEvent', () => {
    it('should write an audit log successfully', async () => {
      prisma.auditLog.create.mockResolvedValue(undefined);

      await service.logEvent({
        userId: 'user1',
        action: AuditAction.USER_UPDATED,
        context: AuditContext.USER,
        metadata: { field: 'name' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          action: AuditAction.USER_UPDATED,
          context: AuditContext.USER,
          metadata: { field: 'name' },
        },
      });

      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        'Audit log written: USER_UPDATED (user) by user user1',
      );
    });

    it('should log error if writing audit log fails', async () => {
      const error = new Error('DB failed');
      prisma.auditLog.create.mockRejectedValue(error);

      await service.logEvent({
        userId: 'user1',
        action: AuditAction.USER_CREATED,
        context: AuditContext.USER,
      });

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to write audit log: DB failed',
        error.stack,
      );
    });

    it('should handle unknown error types gracefully', async () => {
      prisma.auditLog.create.mockRejectedValue('some unknown error');

      await service.logEvent({
        userId: 'u1',
        action: AuditAction.USER_CREATED,
        context: AuditContext.USER,
      });

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to write audit log: Unknown error',
        'some unknown error',
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should build and run raw query with filters', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue(['log1', 'log2']);

      const result = await service.getAuditLogs({
        skip: 5,
        take: 10,
        from: '2024-01-01',
        to: '2024-02-01',
        action: AuditAction.USER_CREATED,
        context: AuditContext.USER,
        userId: 'u1',
        search: 'email',
      });

      const expectedSQL = `SELECT * FROM "AuditLog" WHERE "timestamp" >= '2024-01-01' AND "timestamp" <= '2024-02-01' AND "action" = 'USER_CREATED' AND "context" = 'user' AND "userId" = 'u1' AND LOWER(metadata::text) LIKE LOWER('%email%') ORDER BY "timestamp" DESC LIMIT 10 OFFSET 5`;

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(expectedSQL);
      expect(result).toEqual(['log1', 'log2']);
    });

    it('should run query without filters if none provided', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue(['log1']);

      const result = await service.getAuditLogs({});

      const expectedSQL = `SELECT * FROM "AuditLog"  ORDER BY "timestamp" DESC LIMIT 20 OFFSET 0`;

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(expectedSQL);
      expect(result).toEqual(['log1']);
    });
  });
});
