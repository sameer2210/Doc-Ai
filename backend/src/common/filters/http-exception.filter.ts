import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { AppLogger } from '@common/logger/logger.service';
import { RequestContextService } from '@common/context/request-context.service';
import { toUploadHttpException } from '../../uploads/upload-errors';

const MAX_LOG_FIELD_LENGTH = 1_000;

type ClientErrorBody = {
  statusCode: number;
  message?: string | string[];
  error?: string;
  requestId: string;
  timestamp: string;
};

function redactSensitiveBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;

  const sensitiveKeys = new Set([
    'authorization',
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'idtoken',
    'id_token',
    'provideraccesstoken',
    'apikey',
    'api_key',
    'cookie',
    'set-cookie',
    'password',
    'token',
  ]);

  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).map(([key, value]) => [
      key,
      sensitiveKeys.has(key.toLowerCase()) ? '[REDACTED]' : truncateForLog(value),
    ]),
  );
}

function truncateForLog(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value.length <= MAX_LOG_FIELD_LENGTH) return value;
  return `${value.slice(0, MAX_LOG_FIELD_LENGTH)}...[TRUNCATED]`;
}

function normalizeHttpExceptionResponse(response: string | object): {
  clientMessage?: string | string[];
  error?: string;
  logMessage: unknown;
} {
  if (typeof response === 'string') {
    return {
      clientMessage: response,
      logMessage: response,
    };
  }

  const payload = response as Record<string, unknown>;
  const message = payload.message;
  return {
    clientMessage:
      typeof message === 'string' || Array.isArray(message)
        ? message
        : undefined,
    error: typeof payload.error === 'string' ? payload.error : undefined,
    logMessage: payload,
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLogger,
    private readonly context: RequestContextService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    if (res.headersSent) {
      res.end();
      return;
    }

    const normalizedException =
      exception instanceof HttpException
        ? exception
        : toUploadHttpException(exception) ?? exception;

    const status =
      normalizedException instanceof HttpException
        ? normalizedException.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      normalizedException instanceof HttpException
        ? normalizedException.getResponse()
        : undefined;
    const normalized =
      exceptionResponse !== undefined
        ? normalizeHttpExceptionResponse(exceptionResponse)
        : {
            clientMessage: 'Internal server error',
            logMessage:
              exception instanceof Error ? exception.message : 'Unexpected error',
          };

    const requestId = this.context.requestId() ?? 'unknown';
    const userId = this.context.userId() ?? null;

    const errorLog = {
      requestId,
      userId,
      method: req.method,
      url: req.originalUrl,
      statusCode: status,
      message: normalized.logMessage,
      timestamp: new Date().toISOString(),
      stack:
        status >= 500 && exception instanceof Error
          ? exception.stack
          : undefined,
    };

    if (status >= 500) {
      this.logger.error('Unhandled exception', errorLog);
    } else {
      this.logger.warn('Handled HTTP exception', errorLog);
    }

    // Send to Sentry only for server errors
    if (
      status >= 500 &&
      process.env.SENTRY_DSN &&
      process.env.NODE_ENV === 'production'
    ) {
      Sentry.captureException(exception, (scope) => {
        scope.setTag('request_id', requestId);
        scope.setUser(userId ? { id: userId } : null);
        scope.setContext('request', {
          method: req.method,
          url: req.originalUrl,
          body: redactSensitiveBody(req.body),
        });
        return scope;
      });
    }

    const body: ClientErrorBody = {
      statusCode: status,
      message:
        status >= 500
          ? 'Internal server error'
          : normalized.clientMessage,
      error: status >= 500 ? undefined : normalized.error,
      requestId,
      timestamp: new Date().toISOString(),
    };

    res.status(status).json(body);
  }
}
