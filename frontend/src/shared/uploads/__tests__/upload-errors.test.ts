import {
  getUploadErrorDetails,
  EYE_NOT_DETECTED_TITLE,
  EYE_NOT_DETECTED_MESSAGE,
  AI_TIMEOUT_TITLE,
  AI_TIMEOUT_MESSAGE,
  UPLOAD_FAILED_TITLE,
  UPLOAD_FAILED_MESSAGE,
  NO_INTERNET_TITLE,
  NO_INTERNET_MESSAGE,
  IMAGE_TOO_LARGE_TITLE,
  IMAGE_INPUT_SIZE_EXCEEDS_LIMIT_MESSAGE,
  INVALID_IMAGE_TITLE,
  INVALID_IMAGE_FILE_MESSAGE,
  UNSUPPORTED_FORMAT_TITLE,
  UNSUPPORTED_IMAGE_FORMAT_MESSAGE,
  IMAGE_NOT_FOUND_TITLE,
  IMAGE_NOT_FOUND_MESSAGE,
  CROP_FAILED_TITLE,
  CROP_FAILED_MESSAGE,
  OPTIMIZATION_FAILED_TITLE,
  OPTIMIZATION_FAILED_MESSAGE,
  ANALYSIS_FAILED_TITLE,
  ANALYSIS_FAILED_MESSAGE,
  type UploadPipelineErrorCode,
} from '../upload-errors';

describe('upload-errors getUploadErrorDetails', () => {
  const codes: UploadPipelineErrorCode[] = [
    'EYE_NOT_DETECTED',
    'AI_TIMEOUT',
    'UPLOAD_FAILED',
    'NO_INTERNET',
    'IMAGE_TOO_LARGE',
    'INVALID_IMAGE',
    'UNSUPPORTED_FORMAT',
    'IMAGE_NOT_FOUND',
    'CROP_FAILED',
    'OPTIMIZATION_FAILED',
    'ANALYSIS_FAILED',
  ];

  it('returns appropriate title and message for EYE_NOT_DETECTED', () => {
    const result = getUploadErrorDetails('EYE_NOT_DETECTED');
    expect(result).toEqual({
      title: EYE_NOT_DETECTED_TITLE,
      message: EYE_NOT_DETECTED_MESSAGE,
    });
  });

  it('returns appropriate title and message for AI_TIMEOUT', () => {
    const result = getUploadErrorDetails('AI_TIMEOUT');
    expect(result).toEqual({
      title: AI_TIMEOUT_TITLE,
      message: AI_TIMEOUT_MESSAGE,
    });
  });

  it('returns appropriate title and message for UPLOAD_FAILED', () => {
    const result = getUploadErrorDetails('UPLOAD_FAILED');
    expect(result).toEqual({
      title: UPLOAD_FAILED_TITLE,
      message: UPLOAD_FAILED_MESSAGE,
    });
  });

  it('returns appropriate title and message for NO_INTERNET', () => {
    const result = getUploadErrorDetails('NO_INTERNET');
    expect(result).toEqual({
      title: NO_INTERNET_TITLE,
      message: NO_INTERNET_MESSAGE,
    });
  });

  it('returns appropriate title and message for IMAGE_TOO_LARGE', () => {
    const result = getUploadErrorDetails('IMAGE_TOO_LARGE');
    expect(result).toEqual({
      title: IMAGE_TOO_LARGE_TITLE,
      message: IMAGE_INPUT_SIZE_EXCEEDS_LIMIT_MESSAGE,
    });
  });

  it('returns appropriate title and message for INVALID_IMAGE', () => {
    const result = getUploadErrorDetails('INVALID_IMAGE');
    expect(result).toEqual({
      title: INVALID_IMAGE_TITLE,
      message: INVALID_IMAGE_FILE_MESSAGE,
    });
  });

  it('returns appropriate title and message for UNSUPPORTED_FORMAT', () => {
    const result = getUploadErrorDetails('UNSUPPORTED_FORMAT');
    expect(result).toEqual({
      title: UNSUPPORTED_FORMAT_TITLE,
      message: UNSUPPORTED_IMAGE_FORMAT_MESSAGE,
    });
  });

  it('returns appropriate title and message for IMAGE_NOT_FOUND', () => {
    const result = getUploadErrorDetails('IMAGE_NOT_FOUND');
    expect(result).toEqual({
      title: IMAGE_NOT_FOUND_TITLE,
      message: IMAGE_NOT_FOUND_MESSAGE,
    });
  });

  it('returns appropriate title and message for CROP_FAILED', () => {
    const result = getUploadErrorDetails('CROP_FAILED');
    expect(result).toEqual({
      title: CROP_FAILED_TITLE,
      message: CROP_FAILED_MESSAGE,
    });
  });

  it('returns appropriate title and message for OPTIMIZATION_FAILED', () => {
    const result = getUploadErrorDetails('OPTIMIZATION_FAILED');
    expect(result).toEqual({
      title: OPTIMIZATION_FAILED_TITLE,
      message: OPTIMIZATION_FAILED_MESSAGE,
    });
  });

  it('returns appropriate title and message for ANALYSIS_FAILED', () => {
    const result = getUploadErrorDetails('ANALYSIS_FAILED');
    expect(result).toEqual({
      title: ANALYSIS_FAILED_TITLE,
      message: ANALYSIS_FAILED_MESSAGE,
    });
  });

  it('exhaustively covers all 11 error codes without throwing', () => {
    codes.forEach(code => {
      const details = getUploadErrorDetails(code);
      expect(details).toHaveProperty('title');
      expect(details).toHaveProperty('message');
      expect(typeof details.title).toBe('string');
      expect(typeof details.message).toBe('string');
      expect(details.title.length).toBeGreaterThan(0);
      expect(details.message.length).toBeGreaterThan(0);
    });
  });
});
