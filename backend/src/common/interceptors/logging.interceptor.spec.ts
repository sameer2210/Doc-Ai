import { Test, TestingModule } from '@nestjs/testing';
import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: any;
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
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ prediction: 'Immature' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingInterceptor],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should log request details and response details via tap', (done) => {
    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (val) => {
        expect(consoleLogSpy).toHaveBeenCalled();
        expect(val).toEqual({ prediction: 'Immature' });
        done();
      },
      error: done,
    });
  });
});
