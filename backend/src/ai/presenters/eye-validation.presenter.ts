import { EyeValidationStatus } from '../constants/eye-validation.enum';

export class EyeValidationPresenter {
  static readonly DEFAULT_SKIPPED_MESSAGE =
    'Eye validation could not be completed because the validation service was temporarily unavailable.';

  static readonly DEGRADED_PREDICTION_MESSAGE =
    'Cataract detection completed with pre-validation warning.';

  static readonly SUCCESS_PREDICTION_MESSAGE =
    'Cataract detection completed successfully.';

  /**
   * Constructs the presenter message for eyeValidation response.
   * Returns a localized string when eye validation is SKIPPED, or undefined when PERFORMED.
   */
  static buildValidationMessage(status: EyeValidationStatus): string | undefined {
    if (status === EyeValidationStatus.SKIPPED) {
      return EyeValidationPresenter.DEFAULT_SKIPPED_MESSAGE;
    }
    return undefined;
  }

  /**
   * Constructs the top-level API envelope message depending on eye validation status.
   */
  static buildPredictionResponseMessage(status?: EyeValidationStatus): string {
    if (status === EyeValidationStatus.SKIPPED) {
      return EyeValidationPresenter.DEGRADED_PREDICTION_MESSAGE;
    }
    return EyeValidationPresenter.SUCCESS_PREDICTION_MESSAGE;
  }
}
