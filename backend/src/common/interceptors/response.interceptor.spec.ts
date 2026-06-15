import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ResponseInterceptor } from './response.interceptor';
import { RequestContextService } from '../context/request-context.service';
import type { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;
  let contextService: RequestContextService;
  let mockExecutionContext: any;
  let mockCallHandler: CallHandler<any>;
  let mockResponse: any;

  beforeEach(async () => {
    mockResponse = {
      statusCode: 200,
      setHeader: jest.fn(),
    };
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => ({ url: '/test-url' }),
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ result: 'success' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponseInterceptor,
        {
          provide: RequestContextService,
          useValue: {
            get: jest.fn().mockReturnValue('req-999'),
          },
        },
      ],
    }).compile();

    interceptor = module.get<ResponseInterceptor<any>>(ResponseInterceptor);
    contextService = module.get<RequestContextService>(RequestContextService);
  });

  it('should set X-Request-Id header and format standard data response', (done) => {
    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (val: any) => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'req-999');
        expect(val).toEqual(
          expect.objectContaining({
            requestId: 'req-999',
            statusCode: 200,
            path: '/test-url',
            data: { result: 'success' },
          }),
        );
        done();
      },
      error: done,
    });
  });

  it('should not set X-Request-Id if not present in request context', (done) => {
    jest.spyOn(contextService, 'get').mockReturnValue(undefined);

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (val: any) => {
        expect(mockResponse.setHeader).not.toHaveBeenCalled();
        expect(val.requestId).toBeUndefined();
        done();
      },
      error: done,
    });
  });

  it('should bypass response wrapping for /v1/health/live', (done) => {
    mockExecutionContext.switchToHttp().getRequest = () => ({ url: '/v1/health/live' });

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (val: any) => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'req-999');
        expect(val).toEqual({ result: 'success' });
        done();
      },
      error: done,
    });
  });

  it('should bypass response wrapping for /v1/health/ready', (done) => {
    mockExecutionContext.switchToHttp().getRequest = () => ({ url: '/v1/health/ready' });

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (val: any) => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'req-999');
        expect(val).toEqual({ result: 'success' });
        done();
      },
      error: done,
    });
  });

  it('should bypass response wrapping for /v1/metrics', (done) => {
    mockExecutionContext.switchToHttp().getRequest = () => ({ url: '/v1/metrics' });

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (val: any) => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'req-999');
        expect(val).toEqual({ result: 'success' });
        done();
      },
      error: done,
    });
  });
});
