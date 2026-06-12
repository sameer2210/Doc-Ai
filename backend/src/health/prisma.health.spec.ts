import { Test, TestingModule } from '@nestjs/testing';
import { PrismaHealthIndicator } from './prisma.health';
import { PrismaService } from '@prisma-local/prisma.service';
import { HealthCheckError } from '@nestjs/terminus';

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

  it('should throw HealthCheckError when query fails', async () => {
    jest.spyOn(prismaService, '$queryRaw').mockRejectedValue(new Error('DB connection lost'));

    await expect(indicator.isHealthy('database')).rejects.toThrow(HealthCheckError);
  });
});
