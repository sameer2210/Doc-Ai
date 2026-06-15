import { Gender } from '@prisma/client';

export type BodyInsightContextSource = {
  dateOfBirth: Date | null;
  gender: Gender | null;
  diabetes: boolean;
  hypertension: boolean;
  blurredVision: boolean;
  nightVisionDifficulty: boolean;
  halosAroundLights: boolean;
  familyHistoryOfCataract: boolean;
};

export function calculateAge(dateOfBirth: Date | string | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function buildBodyInsightContext(profile: BodyInsightContextSource) {
  return {
    age: calculateAge(profile.dateOfBirth),
    gender: profile.gender,
    diabetes: profile.diabetes,
    hypertension: profile.hypertension,
    blurredVision: profile.blurredVision,
    nightVisionDifficulty: profile.nightVisionDifficulty,
    halosAroundLights: profile.halosAroundLights,
    familyHistoryOfCataract: profile.familyHistoryOfCataract,
  };
}
