import type { BodyInsight } from '@prisma/client';

export function getBodyInsightStatus(profile: BodyInsight | null) {
  if (!profile) {
    return { completed: false, completionPercentage: 0 };
  }

  const fields = [
    profile.dateOfBirth,
    profile.gender,
    profile.diabetes,
    profile.hypertension,
    profile.blurredVision,
    profile.nightVisionDifficulty,
    profile.halosAroundLights,
    profile.familyHistoryOfCataract,
  ];

  const filledCount = fields.filter((f) => f !== null && f !== undefined).length;
  const totalFields = fields.length;
  const completionPercentage = Math.round((filledCount / totalFields) * 100);

  // DOB & Gender are optional, symptoms are boolean. So if all symptoms are boolean, profile is considered complete.
  const symptomsFilled =
    typeof profile.diabetes === 'boolean' &&
    typeof profile.hypertension === 'boolean' &&
    typeof profile.blurredVision === 'boolean' &&
    typeof profile.nightVisionDifficulty === 'boolean' &&
    typeof profile.halosAroundLights === 'boolean' &&
    typeof profile.familyHistoryOfCataract === 'boolean';

  return {
    completed: symptomsFilled,
    completionPercentage,
  };
}
