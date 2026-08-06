import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppLogger } from '@common/logger/logger.service';
import { RequestContextService } from '@common/context/request-context.service';
import { Request, Response } from 'express';
import {
  DATABASE_UNAVAILABLE,
  DATABASE_AUTHENTICATION_FAILED,
  DATABASE_CAPACITY_EXCEEDED,
} from '@common/constants/database-error-codes';
import { redactSensitiveData } from '@common/utils/redact-sensitive-data';
import { buildClientErrorBody } from './error-response.util';
import {
  ApiErrorCode,
  ErrorCategory,
} from '@common/constants/api-error-codes.enum';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientValidationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLogger,
    private readonly context: RequestContextService,
  ) {}

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientUnknownRequestError
      | Prisma.PrismaClientRustPanicError
      | Prisma.PrismaClientInitializationError
      | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = this.context.requestId() ?? 'unknown';

    // 1. Identify Database Failure Category
    let category: string | null = null;
    let code: string | null = null;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      code = exception.code;
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      code = exception.errorCode ?? null;
    }

    const message = exception.message || '';
    const redactedMessage = redactSensitiveData(message);

    // Prisma Database Error Code Classification:
    // P1000: Authentication failed.
    // P1010: User was denied access on the database (permission/authorization failure).
    if (code === 'P1000' || code === 'P1010') {
      category = DATABASE_AUTHENTICATION_FAILED;
    }
    // P1001: Can't reach database server.
    // P1002: Connection timeout.
    // P1017: Server closed the connection.
    // P1011: TLS connection error.
    // P1012: Schema parsing error (prevents client initialization, making DB unavailable).
    else if (
      code === 'P1001' ||
      code === 'P1002' ||
      code === 'P1011' ||
      code === 'P1012' ||
      code === 'P1017'
    ) {
      category = DATABASE_UNAVAILABLE;
    }
    // P1008: Operations timeout.
    // P2028: Transaction/connection pool full or connection pool timeout.
    else if (code === 'P1008' || code === 'P2028') {
      category = DATABASE_CAPACITY_EXCEEDED;
    }
    // Fallback message check for connection pool timeout strings
    else if (/pool|connection\s+pool|exhausted|capacity|timeout/i.test(message)) {
      category = DATABASE_CAPACITY_EXCEEDED;
    }
    // Fallback for general Prisma initialization or Rust panic or unknown request errors
    else if (
      exception instanceof Prisma.PrismaClientInitializationError ||
      exception instanceof Prisma.PrismaClientUnknownRequestError ||
      exception instanceof Prisma.PrismaClientRustPanicError
    ) {
      category = DATABASE_UNAVAILABLE;
    }

    // 2. Handle Database Failures (503 Service Unavailable)
    if (category) {
      const status = HttpStatus.SERVICE_UNAVAILABLE;

      // Log failure internally with context (using redacted message)
      this.logger.error('Database failure encountered during request', {
        requestId,
        path: request.originalUrl,
        errorClass: exception.constructor.name,
        errorCode: code ?? 'unknown',
        category,
        timestamp: new Date().toISOString(),
        message: redactedMessage,
      });

      return response.status(status).json(
        buildClientErrorBody({
          statusCode: status,
          errorCode: ApiErrorCode.DATABASE_UNAVAILABLE,
          category: ErrorCategory.DATABASE,
          message: 'Database temporarily unavailable. Please try again later.',
          error: category,
          requestId,
        }),
      );
    }

    // 3. Handle query-level errors with backward compatibility
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      let clientMessage = 'Internal server error';

      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          clientMessage = `Unique constraint failed on the field: ${exception.meta?.target}`;
          break;
        case 'P2003':
          this.logger.warn(
            JSON.stringify({
              event: 'PRISMA_FK_VIOLATION',
              code: exception.code,
              target: exception.meta?.field_name ?? null,
            }),
          );
          status = HttpStatus.CONFLICT;
          clientMessage = 'Related record does not exist';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          clientMessage = 'Record not found';
          break;
        default:
          this.logger.error('Prisma query error', {
            requestId,
            path: request.originalUrl,
            errorCode: exception.code,
            message: redactedMessage,
          });
          break;
      }

      return response.status(status).json(
        buildClientErrorBody({
          statusCode: status,
          errorCode:
            status === HttpStatus.NOT_FOUND
              ? ApiErrorCode.USER_NOT_FOUND
              : status === HttpStatus.CONFLICT
                ? ApiErrorCode.VALIDATION_ERROR
                : ApiErrorCode.DATABASE_UNAVAILABLE,
          category: ErrorCategory.DATABASE,
          message: clientMessage,
          error:
            status === HttpStatus.NOT_FOUND
              ? 'Not Found'
              : status === HttpStatus.CONFLICT
                ? 'Conflict'
                : 'Internal Server Error',
          requestId,
        }),
      );
    }

    // 4. Handle Prisma validation errors (e.g. PrismaClientValidationError)
    this.logger.error('Prisma validation/internal error', {
      requestId,
      path: request.originalUrl,
      errorClass: exception.constructor.name,
      message: redactedMessage,
    });

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      buildClientErrorBody({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: ApiErrorCode.DATABASE_UNAVAILABLE,
        category: ErrorCategory.DATABASE,
        message: 'Internal server error',
        error: 'Internal Server Error',
        requestId,
      }),
    );
  }
}
