import { AxiosError } from 'axios';
import { AppError } from '@/shared/errors/app-error';
import {
  AI_MODEL_LOADING_MESSAGE,
  AI_SERVICE_UNAVAILABLE_MESSAGE,
  EYE_NOT_DETECTED_MESSAGE,
  IMAGE_SIZE_TOO_LARGE_MESSAGE,
  IMAGE_RESOLUTION_TOO_LARGE_MESSAGE,
  getUploadStatusMessage,
} from '@/shared/uploads/upload-errors';

/**
 * Parsed error structure for healthcare-friendly feedback.
 */
export interface ParsedError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Parses diverse error types (AxiosError, Network Error, Timeout, Server Errors, etc.)
 * and transforms them into patient-friendly, professional medical app-friendly alerts.
 */
type ApiErrorPayload = {
  message?: string;
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringField(value: unknown, field: keyof ApiErrorPayload): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const raw = value[field];
  return typeof raw === 'string' ? raw : undefined;
}

export function parseUploadError(error: unknown): ParsedError {
  const fallbackMessage = 'Unable to analyze the eye image right now. Please try again.';

  if (!error) {
    return { message: fallbackMessage };
  }

  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
    };
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const responseData = error.response?.data;

    const apiMessage = getStringField(responseData, 'message') ?? getStringField(responseData, 'error');
    const mappedStatusMessage = getUploadStatusMessage(status, apiMessage);

    if (mappedStatusMessage) {
      return {
        message: mappedStatusMessage,
        status,
        code:
          mappedStatusMessage === AI_MODEL_LOADING_MESSAGE
            ? 'TIMEOUT'
            : mappedStatusMessage === EYE_NOT_DETECTED_MESSAGE
              ? 'EYE_NOT_DETECTED'
              : mappedStatusMessage === AI_SERVICE_UNAVAILABLE_MESSAGE
                ? 'SERVER_UNAVAILABLE'
                : mappedStatusMessage === IMAGE_SIZE_TOO_LARGE_MESSAGE
                  ? 'FILE_TOO_LARGE'
                  : mappedStatusMessage === IMAGE_RESOLUTION_TOO_LARGE_MESSAGE
                    ? 'INVALID_REQUEST'
                    : 'INVALID_REQUEST',
      };
    }

    if (status === 401 || status === 403) {
      return {
        message: 'Your session has expired. Please log in again to continue with the analysis.',
        status,
        code: 'UNAUTHORIZED',
      };
    }

    if (apiMessage) {
      return {
        message: apiMessage,
        status,
        code: 'API_ERROR',
      };
    }
  }

  // 3. Handle Network Errors
  if (
    error instanceof Error &&
    (error.message.toLowerCase().includes('network error') ||
      ('code' in error && error.code === 'ERR_NETWORK'))
  ) {
    return {
      message: 'AI service is temporarily unavailable. Please try again later.',
      code: 'NETWORK_ERROR',
    };
  }

  // 4. Handle Standard Errors
  if (error instanceof Error) {
    if (error.message?.toLowerCase().includes('timeout')) {
      return {
        message: AI_MODEL_LOADING_MESSAGE,
        code: 'TIMEOUT',
      };
    }
    return {
      message: error.message || fallbackMessage,
      code: 'STANDARD_ERROR',
    };
  }

  // 5. Unrecognized Error object/string
  const messageString = typeof error === 'string' ? error : fallbackMessage;
  return {
    message:
      messageString === 'Network Error'
        ? 'AI service is temporarily unavailable. Please try again later.'
        : messageString,
    code: 'UNKNOWN',
  };
}
