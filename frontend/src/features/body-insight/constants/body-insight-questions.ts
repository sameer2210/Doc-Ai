export enum BodyInsightQuestionId {
  DIABETES = 'diabetes',
  HYPERTENSION = 'hypertension',
  BLURRED_VISION = 'blurredVision',
  NIGHT_VISION_DIFFICULTY = 'nightVisionDifficulty',
  HALOS_AROUND_LIGHTS = 'halosAroundLights',
  FAMILY_HISTORY_OF_CATARACT = 'familyHistoryOfCataract',
}

export const BODY_INSIGHT_QUESTIONS = [
  {
    id: BodyInsightQuestionId.DIABETES,
    title: 'Diabetes',
    description: 'Have you been diagnosed with diabetes?',
  },
  {
    id: BodyInsightQuestionId.HYPERTENSION,
    title: 'Hypertension',
    description: 'Have you been diagnosed with high blood pressure?',
  },
  {
    id: BodyInsightQuestionId.BLURRED_VISION,
    title: 'Blurred Vision',
    description: 'Do you experience persistent or intermittent blurred vision?',
  },
  {
    id: BodyInsightQuestionId.NIGHT_VISION_DIFFICULTY,
    title: 'Night Vision Difficulty',
    description: 'Do you find it difficult to see clearly at night or in low light?',
  },
  {
    id: BodyInsightQuestionId.HALOS_AROUND_LIGHTS,
    title: 'Halos Around Lights',
    description: 'Do you see bright rings or halos around light sources?',
  },
  {
    id: BodyInsightQuestionId.FAMILY_HISTORY_OF_CATARACT,
    title: 'Family History of Cataract',
    description: 'Do you have a biological relative diagnosed with cataracts?',
  },
] as const;
