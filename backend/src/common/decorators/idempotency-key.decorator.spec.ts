import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { IdempotencyKey } from './idempotency-key.decorator';

function getParamDecoratorFactory(
  _decorator: (...args: unknown[]) => unknown,
) {
  class TestController {
    public test(@IdempotencyKey() _key?: string) {}
  }

  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'test');
  return args[Object.keys(args)[0]].factory;
}

describe('IdempotencyKey Decorator', () => {
  const factory = getParamDecoratorFactory(IdempotencyKey);

  function createMockContext(headers: Record<string, string | string[] | undefined>) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as any;
  }

  it('should extract idempotency-key header', () => {
    const ctx = createMockContext({ 'idempotency-key': 'key-123' });
    expect(factory(null, ctx)).toBe('key-123');
  });

  it('should extract x-idempotency-key header as fallback', () => {
    const ctx = createMockContext({ 'x-idempotency-key': 'key-456' });
    expect(factory(null, ctx)).toBe('key-456');
  });

  it('should return undefined if header is missing', () => {
    const ctx = createMockContext({});
    expect(factory(null, ctx)).toBeUndefined();
  });

  it('should handle array header values', () => {
    const ctx = createMockContext({ 'idempotency-key': ['key-789', 'key-999'] });
    expect(factory(null, ctx)).toBe('key-789');
  });
});
