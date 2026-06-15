import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { GetUser } from './get-user.decorator';
import { ExecutionContext } from '@nestjs/common';

function getParamDecoratorFactory(decorator: () => ParameterDecorator) {
  class TestClass {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    testMethod(@decorator() value: unknown) {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestClass, 'testMethod');
  return args[Object.keys(args)[0]].factory;
}

describe('GetUser Decorator', () => {
  it('should return user from request when no data property is specified', () => {
    const factory = getParamDecoratorFactory(GetUser);
    const mockUser = { userId: '123', email: 'test@example.com', role: 'USER' };
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    } as unknown as ExecutionContext;

    const result = factory(undefined, mockContext);
    expect(result).toEqual(mockUser);
  });

  it('should return specific user property when data property is specified', () => {
    const factory = getParamDecoratorFactory(GetUser);
    const mockUser = { userId: '123', email: 'test@example.com', role: 'USER' };
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    } as unknown as ExecutionContext;

    const result = factory('email', mockContext);
    expect(result).toBe('test@example.com');
  });

  it('should return undefined if user is not present on request', () => {
    const factory = getParamDecoratorFactory(GetUser);
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as unknown as ExecutionContext;

    const result = factory(undefined, mockContext);
    expect(result).toBeUndefined();
  });
});
