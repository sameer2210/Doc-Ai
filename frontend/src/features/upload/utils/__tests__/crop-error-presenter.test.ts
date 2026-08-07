import { getCropUserMessage } from '../crop-error-presenter';
import type { ParsedError } from '@/utils/error-parser';

describe('getCropUserMessage', () => {
  it('returns user-safe message for CROP_FAILED normalized error', () => {
    const parsed: ParsedError = { message: 'Raw canvas exception', code: 'CROP_FAILED' };
    expect(getCropUserMessage(parsed)).toBe('Unable to process your image. Please try again.');
  });

  it('returns user-safe message for OPTIMIZATION_FAILED normalized error', () => {
    const parsed: ParsedError = { message: 'Compression failure', code: 'OPTIMIZATION_FAILED' };
    expect(getCropUserMessage(parsed)).toBe('Unable to optimize your image. Please try another photo.');
  });

  it('sanitizes standard/unknown error codes to safe fallback message', () => {
    const parsed: ParsedError = { message: 'Call to ImageManipulator.manipulateAsync failed: Out of Memory', code: 'STANDARD_ERROR' };
    expect(getCropUserMessage(parsed)).toBe('Something went wrong while processing your image.');
  });

  it('returns fallback message for undefined or null parsed input', () => {
    expect(getCropUserMessage(null)).toBe('Something went wrong while processing your image.');
    expect(getCropUserMessage(undefined)).toBe('Something went wrong while processing your image.');
  });
});
