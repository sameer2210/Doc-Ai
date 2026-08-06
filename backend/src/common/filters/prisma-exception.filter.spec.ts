import type { ArgumentsHost } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';
import type { AppLogger } from '@common/logger/logger.service';
import type { RequestContextService } from '@common/context/request-context.service';

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: any;
  let mockLogger: jest.Mocked<AppLogger>;
  let mockContext: jest.Mocked<RequestContextService>;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    mockContext = {
      requestId: jest.fn().mockReturnValue('mock-request-id'),
    } as any;

    filter = new PrismaExceptionFilter(mockLogger, mockContext);

    mockRequest = {
      originalUrl: '/test-route',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should handle P2002 unique constraint violation', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint error', {
      code: 'P2002',
      clientVersion: '1.0.0',
      meta: { target: ['email'] },
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        errorCode: 'VALIDATION_ERROR',
        category: 'DATABASE',
        contractVersion: '1.0',
        message: expect.stringContaining('Unique constraint failed'),
      }),
    );
  });

  it('should handle P2003 foreign key violation', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Foreign key error', {
      code: 'P2003',
      clientVersion: '1.0.0',
      meta: { field_name: 'userId' },
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        errorCode: 'VALIDATION_ERROR',
        category: 'DATABASE',
        contractVersion: '1.0',
        message: 'Related record does not exist',
      }),
    );
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should handle P2025 record not found error', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '1.0.0',
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: 'USER_NOT_FOUND',
        category: 'DATABASE',
        contractVersion: '1.0',
        message: 'Record not found',
      }),
    );
  });

  it('should handle P1001 and return 503 DATABASE_UNAVAILABLE', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Can\'t reach database server', {
      code: 'P1001',
      clientVersion: '1.0.0',
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      errorCode: 'DATABASE_UNAVAILABLE',
      category: 'DATABASE',
      message: 'Database temporarily unavailable. Please try again later.',
      error: 'DATABASE_UNAVAILABLE',
      requestId: 'mock-request-id',
      timestamp: expect.any(String),
      contractVersion: '1.0',
    });
  });

  it('should handle P1000 authentication failure and return 503 DATABASE_UNAVAILABLE', () => {
    const error = new Prisma.PrismaClientInitializationError('Authentication failed', '1.0.0', 'P1000');

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      errorCode: 'DATABASE_UNAVAILABLE',
      category: 'DATABASE',
      message: 'Database temporarily unavailable. Please try again later.',
      error: 'DATABASE_AUTHENTICATION_FAILED',
      requestId: 'mock-request-id',
      timestamp: expect.any(String),
      contractVersion: '1.0',
    });
  });

  it('should handle P2028 connection pool timeout and return 503 DATABASE_UNAVAILABLE', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Transaction timeout / pool full', {
      code: 'P2028',
      clientVersion: '1.0.0',
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      errorCode: 'DATABASE_UNAVAILABLE',
      category: 'DATABASE',
      message: 'Database temporarily unavailable. Please try again later.',
      error: 'DATABASE_CAPACITY_EXCEEDED',
      requestId: 'mock-request-id',
      timestamp: expect.any(String),
      contractVersion: '1.0',
    });
  });

  it('should mask PrismaClientValidationError and return clean 500 error', () => {
    const error = new Prisma.PrismaClientValidationError(
      'Invalid user.create() invocation: Unknown field "nonexistent_field"',
      { clientVersion: '1.0.0' },
    );

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'DATABASE_UNAVAILABLE',
      category: 'DATABASE',
      message: 'Internal server error',
      error: 'Internal Server Error',
      requestId: 'mock-request-id',
      timestamp: expect.any(String),
      contractVersion: '1.0',
    });
  });
});
