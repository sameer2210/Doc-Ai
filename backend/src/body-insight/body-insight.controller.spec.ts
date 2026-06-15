import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { BodyInsightController } from './body-insight.controller';
import { BodyInsightService } from './body-insight.service';
import { Gender } from '@prisma/client';

describe('BodyInsightController', () => {
  let controller: BodyInsightController;
  let service: jest.Mocked<BodyInsightService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BodyInsightController],
      providers: [
        {
          provide: BodyInsightService,
          useValue: {
            getProfile: jest.fn(),
            upsertProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BodyInsightController>(BodyInsightController);
    service = module.get(BodyInsightService) as jest.Mocked<BodyInsightService>;
  });

  describe('getProfile', () => {
    it('should delegate to service.getProfile with correct userId', async () => {
      const mockResult = {
        id: 'bi-1',
        userId: 'user-123',
        dateOfBirth: new Date(),
        gender: Gender.MALE,
        diabetes: false,
        hypertension: false,
        blurredVision: false,
        nightVisionDifficulty: false,
        halosAroundLights: false,
        familyHistoryOfCataract: false,
        completed: true,
        completionPercentage: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      service.getProfile.mockResolvedValue(mockResult);

      const result = await controller.getProfile('user-123');

      expect(result).toEqual(mockResult);
      expect(service.getProfile).toHaveBeenCalledWith('user-123');
    });
  });

  describe('upsertProfile', () => {
    it('should delegate to service.upsertProfile with correct userId and DTO', async () => {
      const dto = {
        dateOfBirth: '1995-05-05',
        gender: Gender.FEMALE,
        diabetes: true,
        hypertension: false,
        blurredVision: true,
        nightVisionDifficulty: false,
        halosAroundLights: false,
        familyHistoryOfCataract: true,
      };
      const mockResult = {
        id: 'bi-1',
        userId: 'user-123',
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        diabetes: dto.diabetes,
        hypertension: dto.hypertension,
        blurredVision: dto.blurredVision,
        nightVisionDifficulty: dto.nightVisionDifficulty,
        halosAroundLights: dto.halosAroundLights,
        familyHistoryOfCataract: dto.familyHistoryOfCataract,
        completed: true,
        completionPercentage: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      service.upsertProfile.mockResolvedValue(mockResult);

      const result = await controller.upsertProfile('user-123', dto);

      expect(result).toEqual(mockResult);
      expect(service.upsertProfile).toHaveBeenCalledWith('user-123', dto);
    });
  });
});
