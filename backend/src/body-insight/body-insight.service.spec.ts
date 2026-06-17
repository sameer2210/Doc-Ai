import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { BodyInsightService } from './body-insight.service';
import { PrismaService } from '@prisma-local/prisma.service';
import { InternalServerErrorException } from '@nestjs/common';
import { Gender } from '@prisma/client';

describe('BodyInsightService', () => {
  let service: BodyInsightService;
  let prisma: jest.Mocked<PrismaService>;

  // Reusable tx mock — rebuilt per test so mock state is fresh
  let txBodyInsightUpsert: jest.Mock;
  let txUserUpdate: jest.Mock;

  beforeEach(async () => {
    txBodyInsightUpsert = jest.fn();
    txUserUpdate = jest.fn().mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BodyInsightService,
        {
          provide: PrismaService,
          useValue: {
            bodyInsight: {
              findUnique: jest.fn(),
              // Direct upsert is NOT called by upsertProfile; the service uses
              // a $transaction callback that receives a `tx` client instead.
            },
            $transaction: jest.fn().mockImplementation(
              (callback: (tx: unknown) => Promise<unknown>) => {
                const tx = {
                  bodyInsight: { upsert: txBodyInsightUpsert },
                  user: { update: txUserUpdate },
                };
                return callback(tx);
              },
            ),
          },
        },
      ],
    }).compile();

    service = module.get<BodyInsightService>(BodyInsightService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe('getProfile', () => {
    it('should return null if no profile exists', async () => {
      (prisma.bodyInsight.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getProfile('user-1');

      expect(result).toBeNull();
      expect(prisma.bodyInsight.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should return a sanitized, status-enriched profile if one exists', async () => {
      const mockProfile = {
        id: 'bi-1',
        userId: 'user-1',
        dateOfBirth: new Date('1990-01-01'),
        gender: Gender.MALE,
        diabetes: true,
        hypertension: false,
        blurredVision: false,
        nightVisionDifficulty: false,
        halosAroundLights: false,
        familyHistoryOfCataract: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.bodyInsight.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      const result = await service.getProfile('user-1');

      expect(result).toEqual({
        id: 'bi-1',
        userId: 'user-1',
        dateOfBirth: mockProfile.dateOfBirth,
        gender: Gender.MALE,
        diabetes: true,
        hypertension: false,
        blurredVision: false,
        nightVisionDifficulty: false,
        halosAroundLights: false,
        familyHistoryOfCataract: true,
        completed: true,
        completionPercentage: 100,
        createdAt: mockProfile.createdAt,
        updatedAt: mockProfile.updatedAt,
      });
    });

    it('should throw InternalServerErrorException on database error', async () => {
      (prisma.bodyInsight.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(service.getProfile('user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('upsertProfile', () => {
    it('should upsert the profile and return status-enriched details', async () => {
      const dto = {
        dateOfBirth: '1990-01-01',
        gender: Gender.MALE,
        diabetes: true,
        hypertension: false,
        blurredVision: false,
        nightVisionDifficulty: false,
        halosAroundLights: false,
        familyHistoryOfCataract: true,
      };

      const mockProfile = {
        id: 'bi-1',
        userId: 'user-1',
        dateOfBirth: new Date('1990-01-01'),
        gender: Gender.MALE,
        diabetes: true,
        hypertension: false,
        blurredVision: false,
        nightVisionDifficulty: false,
        halosAroundLights: false,
        familyHistoryOfCataract: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // The service calls tx.bodyInsight.upsert inside the $transaction callback
      txBodyInsightUpsert.mockResolvedValue(mockProfile);

      const result = await service.upsertProfile('user-1', dto);

      expect(result).toEqual({
        id: 'bi-1',
        userId: 'user-1',
        dateOfBirth: mockProfile.dateOfBirth,
        gender: Gender.MALE,
        diabetes: true,
        hypertension: false,
        blurredVision: false,
        nightVisionDifficulty: false,
        halosAroundLights: false,
        familyHistoryOfCataract: true,
        completed: true,
        completionPercentage: 100,
        createdAt: mockProfile.createdAt,
        updatedAt: mockProfile.updatedAt,
      });

      // Verify $transaction was invoked
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      // Verify the upsert call that happened inside the transaction callback
      expect(txBodyInsightUpsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: {
          userId: 'user-1',
          dateOfBirth: new Date('1990-01-01'),
          gender: Gender.MALE,
          diabetes: true,
          hypertension: false,
          blurredVision: false,
          nightVisionDifficulty: false,
          halosAroundLights: false,
          familyHistoryOfCataract: true,
        },
        update: {
          dateOfBirth: new Date('1990-01-01'),
          gender: Gender.MALE,
          diabetes: true,
          hypertension: false,
          blurredVision: false,
          nightVisionDifficulty: false,
          halosAroundLights: false,
          familyHistoryOfCataract: true,
        },
      });

      // Verify the user flag update inside the transaction
      expect(txUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { bodyInsightCompleted: true },
      });
    });

    it('should throw InternalServerErrorException on database error during upsert', async () => {
      // Make the transaction itself throw so the service catches and wraps it
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(
        service.upsertProfile('user-1', {
          dateOfBirth: undefined,
          gender: undefined,
          diabetes: false,
          hypertension: false,
          blurredVision: false,
          nightVisionDifficulty: false,
          halosAroundLights: false,
          familyHistoryOfCataract: false,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getUserContext', () => {
    it('should return null if no profile exists', async () => {
      (prisma.bodyInsight.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getUserContext('user-1');

      expect(result).toBeNull();
    });

    it('should return dynamic age-calculated and sanitized context', async () => {
      const today = new Date();
      const dob = new Date(today.getFullYear() - 40, today.getMonth(), today.getDate());

      const mockProfile = {
        id: 'bi-1',
        userId: 'user-1',
        dateOfBirth: dob,
        gender: Gender.FEMALE,
        diabetes: true,
        hypertension: true,
        blurredVision: false,
        nightVisionDifficulty: true,
        halosAroundLights: false,
        familyHistoryOfCataract: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.bodyInsight.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      const result = await service.getUserContext('user-1');

      expect(result).toEqual({
        age: 40,
        gender: Gender.FEMALE,
        diabetes: true,
        hypertension: true,
        blurredVision: false,
        nightVisionDifficulty: true,
        halosAroundLights: false,
        familyHistoryOfCataract: false,
      });
    });

    it('should return null if completion percentage is less than 60%', async () => {
      const mockProfile = {
        id: 'bi-1',
        userId: 'user-1',
        dateOfBirth: null,
        gender: null,
        diabetes: null as unknown,
        hypertension: null as unknown,
        blurredVision: null as unknown,
        nightVisionDifficulty: null as unknown,
        halosAroundLights: null as unknown,
        familyHistoryOfCataract: null as unknown,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.bodyInsight.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      const result = await service.getUserContext('user-1');

      expect(result).toBeNull();
    });

    it('should return null and log on database error', async () => {
      (prisma.bodyInsight.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await service.getUserContext('user-1');

      expect(result).toBeNull();
    });
  });
});
