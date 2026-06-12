import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let mockResponse: any;
  let mockArgumentsHost: any;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
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
        status: 'error',
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
        status: 'error',
        message: 'Related record does not exist',
      }),
    );
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
        status: 'error',
        message: 'Record not found',
      }),
    );
  });

  it('should fallback to 500 for unhandled prisma error codes', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Some other database error', {
      code: 'P9999',
      clientVersion: '1.0.0',
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Internal server error',
      }),
    );
  });
});
