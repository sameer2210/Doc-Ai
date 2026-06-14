import { Test, TestingModule } from '@nestjs/testing';
import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { RequestContextService } from '../context/request-context.service';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: Partial<ExecutionContext>;
  let mockCallHandler: CallHandler;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => ({
          method: 'POST',
          originalUrl: '/predict',
          query: {},
          params: {},
          body: { file: 'some-file' },
        }),
        getResponse: () => ({ statusCode: 201 }),
      }),
    };

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ prediction: 'Immature' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        {
          provide: RequestContextService,
          useValue: {
            requestId: jest.fn().mockReturnValue('req-123'),
          },
        },
      ],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should log request details and response details via tap', (done) => {
    interceptor.intercept(mockExecutionContext as ExecutionContext, mockCallHandler).subscribe({
      next: (val) => {
        expect(consoleLogSpy).toHaveBeenCalled();
        expect(val).toEqual({ prediction: 'Immature' });
        done();
      },
      error: done,
    });
  });
});
