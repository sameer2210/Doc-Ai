import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';
import { UpsertBodyInsightDto } from './dto/upsert-body-insight.dto';
import { BodyInsightResponseDto } from './dto/body-insight-response.dto';
import { getBodyInsightStatus } from './utils/get-body-insight-status';
import { buildBodyInsightContext } from './utils/build-body-insight-context';

@Injectable()
export class BodyInsightService {
  private readonly logger = new Logger(BodyInsightService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<BodyInsightResponseDto | null> {
    try {
      const profile = await this.prisma.bodyInsight.findUnique({
        where: { userId },
      });
      if (!profile) {
        return null;
      }
      const status = getBodyInsightStatus(profile);
      return {
        id: profile.id,
        userId: profile.userId,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        diabetes: profile.diabetes,
        hypertension: profile.hypertension,
        blurredVision: profile.blurredVision,
        nightVisionDifficulty: profile.nightVisionDifficulty,
        halosAroundLights: profile.halosAroundLights,
        familyHistoryOfCataract: profile.familyHistoryOfCataract,
        completed: status.completed,
        completionPercentage: status.completionPercentage,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve Body Insight profile for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('Failed to retrieve health profile');
    }
  }

  async upsertProfile(
    userId: string,
    dto: UpsertBodyInsightDto,
  ): Promise<BodyInsightResponseDto> {
    try {
      const dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
      const { profile } = await this.prisma.$transaction(async (tx) => {
        const p = await tx.bodyInsight.upsert({
          where: { userId },
          create: {
            userId,
            dateOfBirth,
            gender: dto.gender ?? null,
            diabetes: dto.diabetes,
            hypertension: dto.hypertension,
            blurredVision: dto.blurredVision,
            nightVisionDifficulty: dto.nightVisionDifficulty,
            halosAroundLights: dto.halosAroundLights,
            familyHistoryOfCataract: dto.familyHistoryOfCataract,
          },
          update: {
            dateOfBirth,
            gender: dto.gender ?? null,
            diabetes: dto.diabetes,
            hypertension: dto.hypertension,
            blurredVision: dto.blurredVision,
            nightVisionDifficulty: dto.nightVisionDifficulty,
            halosAroundLights: dto.halosAroundLights,
            familyHistoryOfCataract: dto.familyHistoryOfCataract,
          },
        });

        await tx.user.update({
          where: { id: userId },
          data: { bodyInsightCompleted: true },
        });

        return { profile: p };
      });

      const status = getBodyInsightStatus(profile);
      return {
        id: profile.id,
        userId: profile.userId,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        diabetes: profile.diabetes,
        hypertension: profile.hypertension,
        blurredVision: profile.blurredVision,
        nightVisionDifficulty: profile.nightVisionDifficulty,
        halosAroundLights: profile.halosAroundLights,
        familyHistoryOfCataract: profile.familyHistoryOfCataract,
        completed: status.completed,
        completionPercentage: status.completionPercentage,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upsert Body Insight profile for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('Failed to save health profile');
    }
  }

  async getUserContext(userId: string) {
    try {
      const profile = await this.prisma.bodyInsight.findUnique({
        where: { userId },
      });
      if (!profile) {
        return null;
      }
      const status = getBodyInsightStatus(profile);
      if (status.completionPercentage < 60) {
        return null;
      }
      return buildBodyInsightContext({
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        diabetes: profile.diabetes,
        hypertension: profile.hypertension,
        blurredVision: profile.blurredVision,
        nightVisionDifficulty: profile.nightVisionDifficulty,
        halosAroundLights: profile.halosAroundLights,
        familyHistoryOfCataract: profile.familyHistoryOfCataract,
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch user context for Gemini for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }
}
