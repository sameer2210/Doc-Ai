// src/shared/errors/user-facing-error.ts
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

/**
 * Convert any error into a user‑facing error object.
 * For known AppError codes we provide specific titles/messages.
 * The optional fallback can override parts of the result.
 */
export function getUserFacingError(
  error: unknown,
  fallback?: Partial<UserFacingError>,
): UserFacingError {
  let title: string | undefined;
  let message: string | undefined;
  let retryable = false;

  if (error instanceof AppError) {
    title = getTitleForCode(error.code);
    retryable = Boolean(error.retryable);
    if (error.code === 'UNAUTHORIZED') {
      // Session expired scenario
      message = 'Your session has expired. Please sign in again.';
    } else if (error.code === 'FORBIDDEN') {
      // Authentication required scenario
      message = 'Authentication required. Please sign in to continue using chat.';
    } else {
      message = error.message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  // Merge with fallback values, ensuring undefined never overwrites valid data
  return {
    title: fallback?.title ?? title ?? FALLBACK_ERROR.title,
    message: fallback?.message ?? message ?? FALLBACK_ERROR.message,
    retryable: fallback?.retryable ?? retryable,
  };
}

function getTitleForCode(code: AppError['code']): string {
  switch (code) {
    case 'NETWORK_ERROR':
      return 'Connection issue';
    case 'UNAUTHORIZED':
      return 'Session expired';
    case 'FORBIDDEN':
      return 'Authentication required';
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
