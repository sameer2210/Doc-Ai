export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export type BodyInsightProfile = {
  id: string;
  userId: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  diabetes: boolean;
  hypertension: boolean;
  blurredVision: boolean;
  nightVisionDifficulty: boolean;
  halosAroundLights: boolean;
  familyHistoryOfCataract: boolean;
  completed: boolean;
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
};

export type UpsertBodyInsightPayload = {
  dateOfBirth: string | null;
  gender: Gender | null;
  diabetes: boolean;
  hypertension: boolean;
  blurredVision: boolean;
  nightVisionDifficulty: boolean;
  halosAroundLights: boolean;
  familyHistoryOfCataract: boolean;
};
