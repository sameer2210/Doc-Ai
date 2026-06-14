import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';
import { AppLogger } from '@common/logger/logger.service';
import { RequestContextService } from '@common/context/request-context.service';

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

  // Backward Compatibility Tests
  it('should handle P2002 unique constraint violation (existing behavior)', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint error', {
      code: 'P2002',
      clientVersion: '1.0.0',
      meta: { target: ['email'] },
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('Unique constraint failed'),
      }),
    );
  });

  it('should handle P2003 foreign key violation (existing behavior)', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Foreign key error', {
      code: 'P2003',
      clientVersion: '1.0.0',
      meta: { field_name: 'userId' },
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Related record does not exist',
      }),
    );
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should handle P2025 record not found error (existing behavior)', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '1.0.0',
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Record not found',
      }),
    );
  });

  // Connectivity Failure Tests
  it('should handle P1001 and return 503 DATABASE_UNAVAILABLE', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Can\'t reach database server', {
      code: 'P1001',
      clientVersion: '1.0.0',
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Database temporarily unavailable. Please try again later.',
      error: 'DATABASE_UNAVAILABLE',
      errorCode: 'DATABASE_UNAVAILABLE',
      success: false,
      requestId: 'mock-request-id',
      timestamp: expect.any(String),
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Database failure encountered'),
      expect.objectContaining({
        requestId: 'mock-request-id',
        path: '/test-route',
        errorCode: 'P1001',
        category: 'DATABASE_UNAVAILABLE',
        errorClass: 'PrismaClientKnownRequestError',
      }),
    );
  });

  it('should handle P1002 connection timeout and return 503 DATABASE_UNAVAILABLE', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Connection timeout', {
      code: 'P1002',
      clientVersion: '1.0.0',
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'DATABASE_UNAVAILABLE', statusCode: 503 })
    );
  });

  it('should handle P1008 operation timeout and return 503 DATABASE_CAPACITY_EXCEEDED', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Operation timeout', {
      code: 'P1008',
      clientVersion: '1.0.0',
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'DATABASE_CAPACITY_EXCEEDED', statusCode: 503 })
    );
  });

  it('should handle P1017 server closed connection and return 503 DATABASE_UNAVAILABLE', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Server closed connection', {
      code: 'P1017',
      clientVersion: '1.0.0',
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'DATABASE_UNAVAILABLE', statusCode: 503 })
    );
  });

  it('should handle P1010 user denied access and return 503 DATABASE_AUTHENTICATION_FAILED', () => {
    const error = new Prisma.PrismaClientInitializationError('User denied access', '1.0.0', 'P1010');

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'DATABASE_AUTHENTICATION_FAILED', statusCode: 503 })
    );
  });

  it('should handle P1011 TLS connection error and return 503 DATABASE_UNAVAILABLE', () => {
    const error = new Prisma.PrismaClientInitializationError('TLS connection failed', '1.0.0', 'P1011');

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'DATABASE_UNAVAILABLE', statusCode: 503 })
    );
  });

  it('should handle P1012 Schema parsing error and return 503 DATABASE_UNAVAILABLE', () => {
    const error = new Prisma.PrismaClientInitializationError('Schema parsing error', '1.0.0', 'P1012');

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'DATABASE_UNAVAILABLE', statusCode: 503 })
    );
  });

  // Authentication Failure Tests
  it('should handle P1000 authentication failure and return 503 DATABASE_AUTHENTICATION_FAILED', () => {
    const error = new Prisma.PrismaClientInitializationError('Authentication failed', '1.0.0', 'P1000');

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Database temporarily unavailable. Please try again later.',
      error: 'DATABASE_AUTHENTICATION_FAILED',
      errorCode: 'DATABASE_AUTHENTICATION_FAILED',
      success: false,
      requestId: 'mock-request-id',
      timestamp: expect.any(String),
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Database failure encountered'),
      expect.objectContaining({
        category: 'DATABASE_AUTHENTICATION_FAILED',
      }),
    );
  });

  // Capacity Exceeded / Pool Exhaustion Tests
  it('should handle P2028 connection pool timeout and return 503 DATABASE_CAPACITY_EXCEEDED', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Transaction timeout / pool full', {
      code: 'P2028',
      clientVersion: '1.0.0',
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Database temporarily unavailable. Please try again later.',
      error: 'DATABASE_CAPACITY_EXCEEDED',
      errorCode: 'DATABASE_CAPACITY_EXCEEDED',
      success: false,
      requestId: 'mock-request-id',
      timestamp: expect.any(String),
    });
  });

  it('should map errors with pool-related message string to DATABASE_CAPACITY_EXCEEDED', () => {
    const error = new Prisma.PrismaClientUnknownRequestError(
      'Error: connection pool timeout exhausted when requesting connection',
      { clientVersion: '1.0.0' }
    );

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Database temporarily unavailable. Please try again later.',
      error: 'DATABASE_CAPACITY_EXCEEDED',
      errorCode: 'DATABASE_CAPACITY_EXCEEDED',
      success: false,
      requestId: 'mock-request-id',
      timestamp: expect.any(String),
    });
  });

  // Validation Error Masking Tests
  it('should mask PrismaClientValidationError and return clean 500 error', () => {
    const error = new Prisma.PrismaClientValidationError(
      'Invalid user.create() invocation: Unknown field "nonexistent_field"',
      { clientVersion: '1.0.0' }
    );

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      status: 'error',
      requestId: 'mock-request-id',
      timestamp: expect.any(String),
    });

    // Verify raw error didn't leak to client, but was logged internally
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Prisma validation/internal error'),
      expect.objectContaining({
        errorClass: 'PrismaClientValidationError',
        message: expect.stringContaining('Invalid user.create'),
      }),
    );
  });

  // Secret Redaction Verification
  it('should redact sensitive connection URI details before writing to log', () => {
    const error = new Prisma.PrismaClientInitializationError(
      'Failed to connect to postgresql://sameer:my_super_secret_password@db.supabase.com:5432/spandavidya',
      '1.0.0'
    );

    filter.catch(error, mockArgumentsHost);

    const loggedMetadata = mockLogger.error.mock.calls[0][1] as any;
    expect(loggedMetadata.message).not.toContain('my_super_secret_password');
    expect(loggedMetadata.message).not.toContain('sameer');
    expect(loggedMetadata.message).toContain('[REDACTED_PASSWORD]');
    expect(loggedMetadata.message).toContain('[REDACTED_USER]');
  });
});
