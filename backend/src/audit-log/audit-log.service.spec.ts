import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from '@prisma-local/prisma.service';
import { AuditAction, AuditContext } from '@common/constants/audit.enum';
import { Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prisma: {
    auditLog: { create: jest.Mock };
    $queryRaw: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn(),
      },
      $queryRaw: jest.fn(),
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
      prisma.$queryRaw.mockResolvedValue(['log1', 'log2']);

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

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const [queryArg] = prisma.$queryRaw.mock.calls[0] as [Prisma.Sql];
      const sqlText = queryArg.strings.join(' ');

      expect(sqlText).toContain('SELECT *');
      expect(sqlText).toContain('FROM "AuditLog"');
      expect(sqlText).toContain('"createdAt" >=');
      expect(sqlText).toContain('"createdAt" <=');
      expect(sqlText).toContain('"action" =');
      expect(sqlText).toContain('"context" =');
      expect(sqlText).toContain('"userId" =');
      expect(sqlText).toContain('metadata');
      expect(sqlText).toContain('ORDER BY "createdAt" DESC');
      expect(sqlText).toContain('LIMIT');
      expect(sqlText).toContain('OFFSET');
      expect(result).toEqual(['log1', 'log2']);
    });

    it('should run query without filters if none provided', async () => {
      prisma.$queryRaw.mockResolvedValue(['log1']);

      const result = await service.getAuditLogs({});
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);

      const [queryArg] = prisma.$queryRaw.mock.calls[0] as [Prisma.Sql];
      const sqlText = queryArg.strings.join(' ');

      expect(sqlText).toContain('SELECT *');
      expect(sqlText).toContain('FROM "AuditLog"');
      expect(sqlText).toContain('ORDER BY "createdAt" DESC');
      expect(result).toEqual(['log1']);
    });
  });
});
