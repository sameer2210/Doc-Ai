import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BodyInsightController } from './body-insight.controller';
import { BodyInsightService } from './body-insight.service';

@Module({
  imports: [PrismaModule],
  controllers: [BodyInsightController],
  providers: [BodyInsightService],
  exports: [BodyInsightService],
})
export class BodyInsightModule {}
