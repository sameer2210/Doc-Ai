export const EyeValidationStatus = {
  PERFORMED: 'PERFORMED',
  SKIPPED: 'SKIPPED',
} as const;

export type EyeValidationStatus =
  (typeof EyeValidationStatus)[keyof typeof EyeValidationStatus];

export interface EyeValidationResult {
  status: EyeValidationStatus;
  message?: string;
}
