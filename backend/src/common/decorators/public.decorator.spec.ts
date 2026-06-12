import { Public, IS_PUBLIC_KEY } from './public.decorator';

describe('Public Decorator', () => {
  it('should set the IS_PUBLIC_KEY metadata to true', () => {
    class TestClass {
      @Public()
      testMethod() {}
    }

    const testInstance = new TestClass();
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, testInstance.testMethod);
    expect(isPublic).toBe(true);
  });
});
