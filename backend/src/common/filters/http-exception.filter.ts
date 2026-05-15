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

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : 'Unexpected error';

    const requestId = this.context.requestId() ?? 'unknown';
    const userId = this.context.userId() ?? null;

    const errorLog = {
      requestId,
      userId,
      method: req.method,
      url: req.originalUrl,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    this.logger.error('Unhandled exception', errorLog);

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
          body: req.body,
        });
        return scope;
      });
    }

    res.status(status).json({
      statusCode: status,
      message: typeof message === 'string' ? message : undefined,
      requestId,
    });
  }
}
