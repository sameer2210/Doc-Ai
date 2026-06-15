import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let prismaIndicator: PrismaHealthIndicator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(async (indicators) => {
              for (const fn of indicators) {
                await fn();
              }
              return { status: 'ok', info: {}, error: {}, details: {} };
            }),
          },
        },
        {
          provide: PrismaHealthIndicator,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    prismaIndicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
  });

  it('liveness should return status up', () => {
    const result = controller.liveness();
    expect(result.status).toBe('ok');
    expect(result.details.liveness.status).toBe('up');
  });

  it('readiness should check database health indicator', async () => {
    const result = await controller.readiness();
    expect(result.status).toBe('ok');
    expect(healthCheckService.check).toHaveBeenCalled();
    expect(prismaIndicator.isHealthy).toHaveBeenCalledWith('database');
  });
});
