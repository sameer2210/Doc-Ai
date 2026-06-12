import { Test, TestingModule } from '@nestjs/testing';
import { RequestContextService } from './request-context.service';

describe('RequestContextService', () => {
  let service: RequestContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestContextService],
    }).compile();

    service = module.get<RequestContextService>(RequestContextService);
  });

  it('should run a callback within store context and return values via accessors', (done) => {
    const data = {
      requestId: 'req-abc',
      userId: 'user-xyz',
      method: 'POST',
      path: '/auth/verify',
    };

    service.run(data, () => {
      expect(service.get('requestId')).toBe('req-abc');
      expect(service.requestId()).toBe('req-abc');
      expect(service.userId()).toBe('user-xyz');
      expect(service.method()).toBe('POST');
      expect(service.path()).toBe('/auth/verify');
      done();
    });
  });

  it('should return undefined when outside of store context', () => {
    expect(service.get('requestId')).toBeUndefined();
    expect(service.requestId()).toBeUndefined();
    expect(service.userId()).toBeUndefined();
    expect(service.method()).toBeUndefined();
    expect(service.path()).toBeUndefined();
  });
});
