import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { Public } from '@common/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';

@Public()
@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private health: MetricsService) {}

  @Get()
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', this.health.contentType);
    res.send(await this.health.getMetrics());
  }
}
