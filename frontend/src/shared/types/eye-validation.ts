export enum EyeValidationStatus {
  PERFORMED = 'PERFORMED',
  SKIPPED = 'SKIPPED',
}

export interface EyeValidationResult {
  status: EyeValidationStatus;
  message?: string;
}
