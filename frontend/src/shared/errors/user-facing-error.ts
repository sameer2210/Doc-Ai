import { AppError } from '@/shared/errors/app-error';

export type UserFacingError = {
  title: string;
  message: string;
  retryable: boolean;
};

const FALLBACK_ERROR: UserFacingError = {
  title: 'Something went wrong',
  message: 'Please try again. If the problem continues, contact support.',
  retryable: true,
};

export function getUserFacingError(error: unknown, fallback?: Partial<UserFacingError>): UserFacingError {
  if (error instanceof AppError) {
    return {
      title: getTitleForCode(error.code),
      message: error.message || FALLBACK_ERROR.message,
      retryable: error.retryable,
      ...fallback,
    };
  }

  if (error instanceof Error) {
    return {
      ...FALLBACK_ERROR,
      message: error.message || FALLBACK_ERROR.message,
      ...fallback,
    };
  }

  if (typeof error === 'string' && error.trim()) {
    return {
      ...FALLBACK_ERROR,
      message: error,
      ...fallback,
    };
  }

  return {
    ...FALLBACK_ERROR,
    ...fallback,
  };
}

function getTitleForCode(code: AppError['code']): string {
  switch (code) {
    case 'NETWORK_ERROR':
      return 'Connection issue';
    case 'UNAUTHORIZED':
      return 'Session expired';
    case 'FORBIDDEN':
      return 'Access unavailable';
    case 'NOT_FOUND':
      return 'Not found';
    case 'VALIDATION_ERROR':
      return 'Check your input';
    case 'RATE_LIMITED':
      return 'Too many requests';
    case 'SERVER_ERROR':
      return 'Service unavailable';
    case 'UPLOAD_VALIDATION_ERROR':
      return 'Invalid image';
    case 'UPLOAD_TOO_LARGE':
      return 'Image too large';
    case 'UPLOAD_SERVICE_UNAVAILABLE':
      return 'Service unavailable';
    case 'UPLOAD_TIMEOUT':
      return 'Model loading';
    case 'UNKNOWN_ERROR':
    default:
      return FALLBACK_ERROR.title;
  }
}
