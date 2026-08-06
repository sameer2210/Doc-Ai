import { AxiosError } from 'axios';
import { AppError } from '@/shared/errors/app-error';
import { ApiErrorCode, isApiErrorCode } from '@/shared/api/api-error-contract';
import {
  getUploadStatusMessage,
  type UploadPipelineErrorCode,
} from '@/shared/uploads/upload-errors';

/**
 * Parsed error structure for pipeline state resolution.
 */
export interface ParsedError {
  message: string;
  code?: string;
  status?: number;
}

type ApiErrorPayload = {
  message?: string;
  error?: string;
  errorCode?: string;
  category?: string;
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

/**
 * Exhaustive compile-time safe mapping dictionary translating every backend ApiErrorCode
 * to its corresponding frontend UploadPipelineErrorCode workflow state.
 */
const MACHINE_ERROR_MAP: Record<ApiErrorCode, UploadPipelineErrorCode> = {
  [ApiErrorCode.EYE_NOT_DETECTED]: 'EYE_NOT_DETECTED',
  [ApiErrorCode.INVALID_IMAGE]: 'INVALID_IMAGE',
  [ApiErrorCode.UNSUPPORTED_FORMAT]: 'UNSUPPORTED_FORMAT',
  [ApiErrorCode.IMAGE_TOO_LARGE]: 'IMAGE_TOO_LARGE',
  [ApiErrorCode.IMAGE_RESOLUTION_TOO_HIGH]: 'INVALID_IMAGE',
  [ApiErrorCode.MODEL_LOADING]: 'AI_TIMEOUT',
  [ApiErrorCode.MODEL_TIMEOUT]: 'AI_TIMEOUT',
  [ApiErrorCode.AI_SERVICE_UNAVAILABLE]: 'AI_TIMEOUT',
  [ApiErrorCode.PREDICTION_FAILED]: 'ANALYSIS_FAILED',
  [ApiErrorCode.UPLOAD_FAILED]: 'UPLOAD_FAILED',
  [ApiErrorCode.NO_INTERNET]: 'NO_INTERNET',
  [ApiErrorCode.NETWORK_ERROR]: 'NO_INTERNET',
  [ApiErrorCode.DATABASE_UNAVAILABLE]: 'ANALYSIS_FAILED',
  [ApiErrorCode.UNAUTHORIZED]: 'ANALYSIS_FAILED',
  [ApiErrorCode.ANALYSIS_FAILED]: 'ANALYSIS_FAILED',
  [ApiErrorCode.VALIDATION_ERROR]: 'INVALID_IMAGE',
  [ApiErrorCode.INVALID_CREDENTIALS]: 'ANALYSIS_FAILED',
  [ApiErrorCode.FORBIDDEN]: 'ANALYSIS_FAILED',
  [ApiErrorCode.USER_NOT_FOUND]: 'ANALYSIS_FAILED',
  [ApiErrorCode.EMAIL_ALREADY_EXISTS]: 'ANALYSIS_FAILED',
  [ApiErrorCode.OTP_INVALID]: 'ANALYSIS_FAILED',
  [ApiErrorCode.OTP_EXPIRED]: 'ANALYSIS_FAILED',
  [ApiErrorCode.OTP_RATE_LIMITED]: 'ANALYSIS_FAILED',
  [ApiErrorCode.CHAT_NOT_FOUND]: 'ANALYSIS_FAILED',
};

/**
 * Maps legacy status messages to pipeline error code keys for backward compatibility.
 */
function mapLegacyCode(mappedStatusMessage: string): string {
  if (mappedStatusMessage.toLowerCase().includes('busy') || mappedStatusMessage.toLowerCase().includes('time')) {
    return 'TIMEOUT';
  }
  if (mappedStatusMessage.toLowerCase().includes('eye') || mappedStatusMessage.toLowerCase().includes('detect')) {
    return 'EYE_NOT_DETECTED';
  }
  if (mappedStatusMessage.toLowerCase().includes('unavailable')) {
    return 'SERVER_UNAVAILABLE';
  }
  if (mappedStatusMessage.toLowerCase().includes('5 mb') || mappedStatusMessage.toLowerCase().includes('large')) {
    return 'FILE_TOO_LARGE';
  }
  return 'INVALID_REQUEST';
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

    const rawErrorCode = getStringField(responseData, 'errorCode');
    const apiMessage = getStringField(responseData, 'message') ?? getStringField(responseData, 'error');

    // 1. Machine-Readable Error Path (Exhaustive Table Lookup with Runtime Type Guard)
    if (isApiErrorCode(rawErrorCode)) {
      const pipelineCode = MACHINE_ERROR_MAP[rawErrorCode];
      return {
        message: apiMessage || fallbackMessage,
        code: pipelineCode,
        status,
      };
    }

    // 2. Legacy Text-Matching Path (Backward Compatibility Fallback)
    const mappedStatusMessage = getUploadStatusMessage(status, apiMessage);

    if (mappedStatusMessage) {
      return {
        message: mappedStatusMessage,
        status,
        code: mapLegacyCode(mappedStatusMessage),
      };
    }

    if (status === 401 || status === 403) {
      return {
        message: apiMessage || 'Session expired.',
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
      message: 'Network connection interrupted.',
      code: 'NETWORK_ERROR',
    };
  }

  // 4. Handle Standard Errors
  if (error instanceof Error) {
    if (error.message?.toLowerCase().includes('timeout')) {
      return {
        message: 'Request timed out.',
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
    message: messageString,
    code: 'UNKNOWN',
  };
}
