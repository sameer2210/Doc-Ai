import {
  BadRequestException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  type HttpException,
} from '@nestjs/common';
import {
  ApiErrorCode,
  ErrorCategory,
} from '@common/constants/api-error-codes.enum';

export const INVALID_IMAGE_FILE_MESSAGE = 'Invalid image file';
export const IMAGE_SIZE_TOO_LARGE_MESSAGE = 'Image exceeds 5 MB limit';
export const IMAGE_SIZE_EXCEEDS_LIMIT_MESSAGE =
  'Image size exceeds 5 MB. Please upload a smaller image.';
export const IMAGE_RESOLUTION_TOO_LARGE_MESSAGE =
  'Image resolution is too large. Please upload a smaller image.';
export const AI_SERVICE_UNAVAILABLE_MESSAGE =
  'AI service is temporarily unavailable. Please try again later.';
export const AI_MODEL_LOADING_MESSAGE =
  'AI model is loading. Please try again in a few moments.';
export const EYE_NOT_DETECTED_MESSAGE =
  "We couldn't confidently detect a human eye in this image.";

type RecordLike = Record<string, unknown>;

function isRecord(value: unknown): value is RecordLike {
  return typeof value === 'object' && value !== null;
}

function getStringField(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const rawValue = value[key];
  return typeof rawValue === 'string' ? rawValue : undefined;
}

function getNumberField(value: unknown, key: string): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const rawValue = value[key];
  return typeof rawValue === 'number' ? rawValue : undefined;
}

export function createInvalidImageFileException(
  message: string = INVALID_IMAGE_FILE_MESSAGE,
): BadRequestException {
  return new BadRequestException({
    errorCode: ApiErrorCode.INVALID_IMAGE,
    category: ErrorCategory.IMAGE,
    message,
  });
}

export function createImageTooLargeException(
  message: string = IMAGE_SIZE_TOO_LARGE_MESSAGE,
): PayloadTooLargeException {
  return new PayloadTooLargeException({
    errorCode: ApiErrorCode.IMAGE_TOO_LARGE,
    category: ErrorCategory.STORAGE,
    message,
  });
}

export function createImageResolutionTooLargeException(
  message: string = IMAGE_RESOLUTION_TOO_LARGE_MESSAGE,
): BadRequestException {
  return new BadRequestException({
    errorCode: ApiErrorCode.IMAGE_RESOLUTION_TOO_HIGH,
    category: ErrorCategory.IMAGE,
    message,
  });
}

export function createAiServiceUnavailableException(
  message: string = AI_SERVICE_UNAVAILABLE_MESSAGE,
): ServiceUnavailableException {
  return new ServiceUnavailableException({
    errorCode: ApiErrorCode.AI_SERVICE_UNAVAILABLE,
    category: ErrorCategory.AI,
    message,
  });
}

export function createAiModelLoadingException(
  message: string = AI_MODEL_LOADING_MESSAGE,
): ServiceUnavailableException {
  return new ServiceUnavailableException({
    errorCode: ApiErrorCode.MODEL_LOADING,
    category: ErrorCategory.AI,
    message,
  });
}

export function createUnsupportedFormatException(
  message: string = 'Unsupported file format',
): BadRequestException {
  return new BadRequestException({
    errorCode: ApiErrorCode.UNSUPPORTED_FORMAT,
    category: ErrorCategory.IMAGE,
    message,
  });
}

export function createUploadFailedException(
  message: string = 'Failed to process file upload',
): BadRequestException {
  return new BadRequestException({
    errorCode: ApiErrorCode.UPLOAD_FAILED,
    category: ErrorCategory.STORAGE,
    message,
  });
}

export function createEyeNotDetectedException(
  message: string = EYE_NOT_DETECTED_MESSAGE,
): BadRequestException {
  return new BadRequestException({
    errorCode: ApiErrorCode.EYE_NOT_DETECTED,
    category: ErrorCategory.IMAGE,
    message,
  });
}

export function isMulterFileTooLargeError(error: unknown): boolean {
  return getStringField(error, 'code') === 'LIMIT_FILE_SIZE';
}

export function toUploadHttpException(error: unknown): HttpException | null {
  if (isMulterFileTooLargeError(error)) {
    return createImageTooLargeException();
  }

  return null;
}

export function getResponseMessage(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  const response = error.response;
  if (!isRecord(response)) {
    return undefined;
  }

  const data = response.data;
  if (typeof data === 'string') {
    return data;
  }

  if (isRecord(data)) {
    const message = data.message;
    if (typeof message === 'string') {
      return message;
    }

    const nestedData = data.data;
    if (isRecord(nestedData)) {
      const nestedMessage = nestedData.message;
      if (typeof nestedMessage === 'string') {
        return nestedMessage;
      }
    }
  }

  return undefined;
}

export function mapCataractModelError(error: unknown): HttpException {
  const responseStatus = getNumberField((isRecord(error) ? error.response : undefined) ?? undefined, 'status');
  const errorCode = getStringField(error, 'code');
  const errorMessage = getStringField(error, 'message')?.toLowerCase() ?? '';
  const responseMessage = getResponseMessage(error)?.toLowerCase() ?? '';
  const combinedMessage = `${errorMessage} ${responseMessage}`;

  if (
    errorCode === 'ECONNABORTED' ||
    combinedMessage.includes('timeout') ||
    combinedMessage.includes('timed out')
  ) {
    return createAiModelLoadingException();
  }

  if (responseStatus === 400) {
    return createInvalidImageFileException();
  }

  if (responseStatus === 413) {
    return createImageTooLargeException();
  }

  if (responseStatus === 503) {
    if (
      combinedMessage.includes('loading') ||
      combinedMessage.includes('starting') ||
      combinedMessage.includes('warming')
    ) {
      return createAiModelLoadingException();
    }

    return createAiServiceUnavailableException();
  }

  if (typeof responseStatus === 'number' && responseStatus >= 500) {
    return createAiServiceUnavailableException();
  }

  if (combinedMessage.includes('network error') || errorCode === 'ERR_NETWORK') {
    return createAiServiceUnavailableException();
  }

  return createAiServiceUnavailableException();
}
