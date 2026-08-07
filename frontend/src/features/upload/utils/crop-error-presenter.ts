import type { ParsedError } from '@/utils/error-parser';

export function getCropUserMessage(parsed?: ParsedError | null): string {
  switch (parsed?.code) {
    case 'CROP_FAILED':
      return 'Unable to process your image. Please try again.';
    case 'OPTIMIZATION_FAILED':
      return 'Unable to optimize your image. Please try another photo.';
    default:
      return 'Something went wrong while processing your image.';
  }
}
