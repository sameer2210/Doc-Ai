import { parseUploadError } from '../error-parser';
import { ApiErrorCode } from '@/shared/api/api-error-contract';
import { AppError } from '@/shared/errors/app-error';
import { AxiosError } from 'axios';

describe('parseUploadError', () => {
  it('should parse machine-readable ApiErrorCode correctly', () => {
    const error = new AxiosError(
      'Bad Request',
      'ERR_BAD_REQUEST',
      { headers: {} as any },
      {},
      {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: {} as any },
        data: {
          statusCode: 400,
          errorCode: ApiErrorCode.INVALID_IMAGE,
          category: 'IMAGE',
          message: 'Invalid image buffer',
          requestId: 'req-123',
          timestamp: new Date().toISOString(),
          contractVersion: '1.0',
        },
      },
    );

    const parsed = parseUploadError(error);
    expect(parsed.code).toBe('INVALID_IMAGE');
    expect(parsed.message).toBe('Invalid image buffer');
    expect(parsed.status).toBe(400);
  });

  it('should parse AppError instances directly', () => {
    const error = new AppError({ message: 'Custom app error', code: 'VALIDATION_ERROR', status: 422 });
    const parsed = parseUploadError(error);
    expect(parsed.code).toBe('VALIDATION_ERROR');
    expect(parsed.message).toBe('Custom app error');
    expect(parsed.status).toBe(422);
  });

  it('should handle network connection errors gracefully', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK');

    const parsed = parseUploadError(error);
    expect(parsed.code).toBe('NETWORK_ERROR');
    expect(parsed.message).toBe('Network connection interrupted.');
  });

  it('should handle timeout errors gracefully', () => {
    const error = new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED');

    const parsed = parseUploadError(error);
    expect(parsed.code).toBe('TIMEOUT');
    expect(parsed.message).toBe('Request timed out.');
  });

  it('should fall back to status text matching for unknown error codes', () => {
    const error = new AxiosError(
      'Payload Too Large',
      'ERR_BAD_REQUEST',
      { headers: {} as any },
      {},
      {
        status: 413,
        statusText: 'Payload Too Large',
        headers: {},
        config: { headers: {} as any },
        data: {
          message: 'Image size exceeds limit',
        },
      },
    );

    const parsed = parseUploadError(error);
    expect(parsed.code).toBe('FILE_TOO_LARGE');
  });

  it('should return fallback message for null or undefined input', () => {
    const parsed = parseUploadError(null);
    expect(parsed.message).toBe('Unable to analyze the eye image right now. Please try again.');
  });
});
