import { Test, TestingModule } from '@nestjs/testing';
import { HttpExceptionFilter } from './http-exception.filter';
import { AppLogger } from '@common/logger/logger.service';
import { RequestContextService } from '@common/context/request-context.service';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let logger: AppLogger;
  let context: RequestContextService;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: any;

  beforeEach(async () => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      headersSent: false,
    };
    mockRequest = {
      method: 'GET',
      originalUrl: '/test',
      body: {},
    };
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpExceptionFilter,
        {
          provide: AppLogger,
          useValue: {
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
        {
          provide: RequestContextService,
          useValue: {
            requestId: jest.fn().mockReturnValue('req-123'),
            userId: jest.fn().mockReturnValue('user-123'),
          },
        },
      ],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);
    logger = module.get<AppLogger>(AppLogger);
    context = module.get<RequestContextService>(RequestContextService);
  });

  it('should return immediately if headers are already sent', () => {
    mockResponse.headersSent = true;
    filter.catch(new HttpException('Already Sent', 400), mockArgumentsHost);
    expect(mockResponse.end).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should handle standard HttpException with status < 500', () => {
    const error = new HttpException('Bad Request error', HttpStatus.BAD_REQUEST);
    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(logger.warn).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Bad Request error',
        requestId: 'req-123',
      }),
    );
  });

  it('should handle standard HttpException with status >= 500', () => {
    const error = new HttpException('Server crash', HttpStatus.INTERNAL_SERVER_ERROR);
    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(logger.error).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        requestId: 'req-123',
      }),
    );
  });

  it('should handle non-HttpException error and map it to 500', () => {
    const error = new Error('Raw DB crash');
    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(logger.error).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }),
    );
  });

  it('should handle string responses from HttpException', () => {
    const error = new HttpException('Simple error string', HttpStatus.FORBIDDEN);
    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Simple error string',
      }),
    );
  });

  it('should fallback to default requestId if request context service is empty', () => {
    jest.spyOn(context, 'requestId').mockReturnValue(undefined);
    jest.spyOn(context, 'userId').mockReturnValue(undefined);

    const error = new HttpException('Simple error', 400);
    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'unknown',
      }),
    );
  });

  it('should map database readiness failure with DATABASE_UNAVAILABLE', () => {
    const errorResponse = {
      status: 'error',
      details: {
        database: {
          status: 'down',
          errorCode: 'DATABASE_UNAVAILABLE',
          errorMessage: 'DB connection lost',
        },
      },
    };
    const exception = new HttpException(errorResponse, HttpStatus.SERVICE_UNAVAILABLE);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database temporarily unavailable. Please try again later.',
        error: 'DATABASE_UNAVAILABLE',
        errorCode: 'DATABASE_UNAVAILABLE',
        success: false,
        requestId: 'req-123',
      }),
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it('should map database readiness failure with DATABASE_AUTHENTICATION_FAILED', () => {
    const errorResponse = {
      status: 'error',
      details: {
        database: {
          status: 'down',
          errorCode: 'DATABASE_AUTHENTICATION_FAILED',
          errorMessage: 'Authentication failed',
        },
      },
    };
    const exception = new HttpException(errorResponse, HttpStatus.SERVICE_UNAVAILABLE);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database temporarily unavailable. Please try again later.',
        error: 'DATABASE_AUTHENTICATION_FAILED',
        errorCode: 'DATABASE_AUTHENTICATION_FAILED',
        success: false,
        requestId: 'req-123',
      }),
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it('should map database readiness failure with DATABASE_CAPACITY_EXCEEDED', () => {
    const errorResponse = {
      status: 'error',
      details: {
        database: {
          status: 'down',
          errorCode: 'DATABASE_CAPACITY_EXCEEDED',
          errorMessage: 'Connection pool timeout',
        },
      },
    };
    const exception = new HttpException(errorResponse, HttpStatus.SERVICE_UNAVAILABLE);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database temporarily unavailable. Please try again later.',
        error: 'DATABASE_CAPACITY_EXCEEDED',
        errorCode: 'DATABASE_CAPACITY_EXCEEDED',
        success: false,
        requestId: 'req-123',
      }),
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it('should redact sensitive credentials in logs when database readiness check fails', () => {
    const errorResponse = {
      status: 'error',
      details: {
        database: {
          status: 'down',
          errorCode: 'DATABASE_UNAVAILABLE',
          errorMessage: 'Could not connect to postgresql://admin:secretpasswd@localhost:5432/spanda',
        },
      },
    };
    const exception = new HttpException(errorResponse, HttpStatus.SERVICE_UNAVAILABLE);

    filter.catch(exception, mockArgumentsHost);

    const loggedMetadata = (logger.error as jest.Mock).mock.calls[0][1];
    expect(loggedMetadata.message).not.toContain('secretpasswd');
    expect(loggedMetadata.message).not.toContain('admin');
    expect(loggedMetadata.message).toContain('[REDACTED_PASSWORD]');
  });
});
