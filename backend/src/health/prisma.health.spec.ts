import { Test, TestingModule } from '@nestjs/testing';
import { PrismaHealthIndicator } from './prisma.health';
import { PrismaService } from '@prisma-local/prisma.service';
import { HealthCheckError } from '@nestjs/terminus';
import { Prisma } from '@prisma/client';
import {
  DATABASE_UNAVAILABLE,
  DATABASE_AUTHENTICATION_FAILED,
  DATABASE_CAPACITY_EXCEEDED,
} from '@common/constants/database-error-codes';

describe('PrismaHealthIndicator', () => {
  let indicator: PrismaHealthIndicator;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaHealthIndicator,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    indicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should return health status when query succeeds', async () => {
    jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([1]);

    const result = await indicator.isHealthy('database');
    expect(result).toEqual({ database: { status: 'up' } });
    expect(prismaService.$queryRaw).toHaveBeenCalled();
  });

  it('should throw HealthCheckError when query fails with DATABASE_UNAVAILABLE', async () => {
    jest.spyOn(prismaService, '$queryRaw').mockRejectedValue(new Error('DB connection lost'));

    try {
      await indicator.isHealthy('database');
      fail('Should have thrown HealthCheckError');
    } catch (e: any) {
      expect(e).toBeInstanceOf(HealthCheckError);
      expect(e.causes).toEqual({
        database: {
          status: 'down',
          errorCode: DATABASE_UNAVAILABLE,
          errorMessage: 'DB connection lost',
        },
      });
    }
  });

  it('should throw HealthCheckError when query fails with DATABASE_AUTHENTICATION_FAILED (P1000)', async () => {
    const error = new Prisma.PrismaClientInitializationError('Authentication failed', '1.0.0', 'P1000');
    jest.spyOn(prismaService, '$queryRaw').mockRejectedValue(error);

    try {
      await indicator.isHealthy('database');
      fail('Should have thrown HealthCheckError');
    } catch (e: any) {
      expect(e).toBeInstanceOf(HealthCheckError);
      expect(e.causes).toEqual({
        database: {
          status: 'down',
          errorCode: DATABASE_AUTHENTICATION_FAILED,
          errorMessage: 'Authentication failed',
        },
      });
    }
  });

  it('should throw HealthCheckError when query fails with DATABASE_CAPACITY_EXCEEDED', async () => {
    const error = new Error('Error: connection pool timeout exhausted when requesting connection');
    jest.spyOn(prismaService, '$queryRaw').mockRejectedValue(error);

    try {
      await indicator.isHealthy('database');
      fail('Should have thrown HealthCheckError');
    } catch (e: any) {
      expect(e).toBeInstanceOf(HealthCheckError);
      expect(e.causes).toEqual({
        database: {
          status: 'down',
          errorCode: DATABASE_CAPACITY_EXCEEDED,
          errorMessage: 'Error: connection pool timeout exhausted when requesting connection',
        },
      });
    }
  });

  it('should throw HealthCheckError with DATABASE_AUTHENTICATION_FAILED for P1010 (User denied access)', async () => {
    const error = new Prisma.PrismaClientInitializationError('User denied access to db', '1.0.0', 'P1010');
    jest.spyOn(prismaService, '$queryRaw').mockRejectedValue(error);

    try {
      await indicator.isHealthy('database');
      fail('Should have thrown');
    } catch (e: any) {
      expect(e.causes.database.errorCode).toBe(DATABASE_AUTHENTICATION_FAILED);
    }
  });

  it('should throw HealthCheckError with DATABASE_UNAVAILABLE for P1011 (TLS connection error)', async () => {
    const error = new Prisma.PrismaClientInitializationError('TLS connection failed', '1.0.0', 'P1011');
    jest.spyOn(prismaService, '$queryRaw').mockRejectedValue(error);

    try {
      await indicator.isHealthy('database');
      fail('Should have thrown');
    } catch (e: any) {
      expect(e.causes.database.errorCode).toBe(DATABASE_UNAVAILABLE);
    }
  });

  it('should throw HealthCheckError with DATABASE_UNAVAILABLE for P1012 (Schema parsing error)', async () => {
    const error = new Prisma.PrismaClientInitializationError('Schema parsing error', '1.0.0', 'P1012');
    jest.spyOn(prismaService, '$queryRaw').mockRejectedValue(error);

    try {
      await indicator.isHealthy('database');
      fail('Should have thrown');
    } catch (e: any) {
      expect(e.causes.database.errorCode).toBe(DATABASE_UNAVAILABLE);
    }
  });

  it('should redact sensitive credentials in the HealthCheckError errorMessage', async () => {
    const error = new Error('Could not connect to postgresql://admin:supersecretpassword@localhost:5432/spanda');
    jest.spyOn(prismaService, '$queryRaw').mockRejectedValue(error);

    try {
      await indicator.isHealthy('database');
      fail('Should have thrown');
    } catch (e: any) {
      const msg = e.causes.database.errorMessage;
      expect(msg).not.toContain('supersecretpassword');
      expect(msg).not.toContain('admin');
      expect(msg).toContain('[REDACTED_PASSWORD]');
    }
  });
});
