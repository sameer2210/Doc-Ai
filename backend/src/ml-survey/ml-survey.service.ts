import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';
import { CreateMLSurveyDto } from './dto/create-ml-survey.dto';
import { AuditLogService } from '@audit-log/audit-log.service';
import { AuditAction, AuditContext } from '@common/constants/audit.enum';

@Injectable()
export class MLSurveyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateMLSurveyDto, userId: string) {
    const survey = await this.prisma.mLSurvey.create({
      data: {
        userId,
        name: dto.name,
        age: dto.age,
        gender: dto.gender,
        imageUrl: dto.imageUrl,
      },
    });

    await this.auditLogService.logEvent({
      userId,
      action: 'ML_SURVEY_SUBMITTED' as any, // Custom action string
      context: AuditContext.USER,
      metadata: {
        surveyId: survey.id,
        name: survey.name,
        age: survey.age,
        gender: survey.gender,
      },
    });

    return {
      success: true,
      data: survey,
      message: 'ML Survey data successfully saved in the database.',
    };
  }

  async getByUserId(userId: string) {
    return this.prisma.mLSurvey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
