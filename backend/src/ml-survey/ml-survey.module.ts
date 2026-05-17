import { Module } from '@nestjs/common';
import { MLSurveyController } from './ml-survey.controller';
import { MLSurveyService } from './ml-survey.service';
import { PrismaService } from '@prisma-local/prisma.service';
import { AuditLogService } from '@audit-log/audit-log.service';

@Module({
  controllers: [MLSurveyController],
  providers: [MLSurveyService, PrismaService, AuditLogService],
  exports: [MLSurveyService],
})
export class MLSurveyModule {}
