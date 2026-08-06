import {
  API_ERROR_CONTRACT_VERSION,
  ApiErrorCode,
  ErrorCategory,
} from '@common/constants/api-error-codes.enum';

export type ClientErrorBody = {
  statusCode: number;
  errorCode?: ApiErrorCode | string;
  category?: ErrorCategory | string;
  message?: string | string[];
  error?: string;
  requestId: string;
  timestamp: string;
  contractVersion: string;
};

export function buildClientErrorBody(params: {
  statusCode: number;
  errorCode?: ApiErrorCode | string;
  category?: ErrorCategory | string;
  message?: string | string[];
  error?: string;
  requestId: string;
}): ClientErrorBody {
  return {
    statusCode: params.statusCode,
    errorCode: params.errorCode,
    category: params.category,
    message: params.message,
    error: params.error,
    requestId: params.requestId,
    timestamp: new Date().toISOString(),
    contractVersion: API_ERROR_CONTRACT_VERSION,
  };
}
