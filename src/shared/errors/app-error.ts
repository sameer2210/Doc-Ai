export type AppErrorCode =
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export class AppError extends Error {
  code: AppErrorCode;
  status?: number;
  retryable: boolean;
  details?: unknown;

  constructor({
    message,
    code = 'UNKNOWN_ERROR',
    status,
    retryable = false,
    details,
  }: {
    message: string;
    code?: AppErrorCode;
    status?: number;
    retryable?: boolean;
    details?: unknown;
  }) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.details = details;
  }
}
