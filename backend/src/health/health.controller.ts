import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { Public } from '@common/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';

@Public()
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  liveness(): HealthCheckResult {
    return {
      status: 'ok',
      info: { liveness: { status: 'up' } },
      error: {},
      details: { liveness: { status: 'up' } },
    };
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([async () => this.prisma.isHealthy('database')]);
  }
}
