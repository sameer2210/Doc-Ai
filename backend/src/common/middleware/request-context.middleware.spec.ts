import { Test, TestingModule } from '@nestjs/testing';
import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContextService } from '../context/request-context.service';
import { Request, Response } from 'express';

describe('RequestContextMiddleware', () => {
  let middleware: RequestContextMiddleware;
  let contextService: RequestContextService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(async () => {
    mockRequest = {
      headers: {},
      method: 'GET',
      originalUrl: '/v1/users',
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestContextMiddleware,
        {
          provide: RequestContextService,
          useValue: {
            run: jest.fn((data, callback) => callback()),
          },
        },
      ],
    }).compile();

    middleware = module.get<RequestContextMiddleware>(RequestContextMiddleware);
    contextService = module.get<RequestContextService>(RequestContextService);
  });

  it('should generate a new RequestId if none exists in headers', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.requestId).toBeDefined();
    expect(typeof mockRequest.requestId).toBe('string');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', mockRequest.requestId);
    expect(contextService.run).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: mockRequest.requestId,
        method: 'GET',
        path: '/v1/users',
      }),
      expect.any(Function),
    );
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should extract RequestId from X-Request-Id header', () => {
    mockRequest.headers = { 'x-request-id': 'custom-req-id-123' };

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.requestId).toBe('custom-req-id-123');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'custom-req-id-123');
    expect(contextService.run).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'custom-req-id-123',
      }),
      expect.any(Function),
    );
  });

  it('should extract RequestId from request-id header', () => {
    mockRequest.headers = { 'request-id': 'custom-req-id-456' };

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.requestId).toBe('custom-req-id-456');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'custom-req-id-456');
  });
});
