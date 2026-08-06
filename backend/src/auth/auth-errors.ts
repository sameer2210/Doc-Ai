import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiErrorCode,
  ErrorCategory,
} from '@common/constants/api-error-codes.enum';

export function createInvalidCredentialsException(
  message: string = 'Invalid credentials',
): ForbiddenException {
  return new ForbiddenException({
    errorCode: ApiErrorCode.INVALID_CREDENTIALS,
    category: ErrorCategory.AUTH,
    message,
  });
}

export function createForbiddenException(
  message: string = 'Access denied',
): ForbiddenException {
  return new ForbiddenException({
    errorCode: ApiErrorCode.FORBIDDEN,
    category: ErrorCategory.AUTH,
    message,
  });
}

export function createUnauthorizedException(
  message: string = 'Unauthorized',
): UnauthorizedException {
  return new UnauthorizedException({
    errorCode: ApiErrorCode.UNAUTHORIZED,
    category: ErrorCategory.AUTH,
    message,
  });
}

export function createEmailAlreadyExistsException(
  message: string = 'Email already in use',
): ForbiddenException {
  return new ForbiddenException({
    errorCode: ApiErrorCode.EMAIL_ALREADY_EXISTS,
    category: ErrorCategory.AUTH,
    message,
  });
}

export function createOtpInvalidException(
  message: string = 'Invalid OTP code',
): UnauthorizedException {
  return new UnauthorizedException({
    errorCode: ApiErrorCode.OTP_INVALID,
    category: ErrorCategory.AUTH,
    message,
  });
}

export function createOtpExpiredException(
  message: string = 'OTP has expired',
): UnauthorizedException {
  return new UnauthorizedException({
    errorCode: ApiErrorCode.OTP_EXPIRED,
    category: ErrorCategory.AUTH,
    message,
  });
}

export function createOtpRateLimitedException(
  message: string = 'Too many OTP requests. Please try again later.',
): BadRequestException {
  return new BadRequestException({
    errorCode: ApiErrorCode.OTP_RATE_LIMITED,
    category: ErrorCategory.AUTH,
    message,
  });
}
