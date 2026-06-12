import { Roles, ROLES_KEY } from './roles.decorator';

describe('Roles Decorator', () => {
  it('should set the roles metadata', () => {
    class TestClass {
      @Roles('admin', 'user')
      testMethod() {}
    }

    const testInstance = new TestClass();
    const roles = Reflect.getMetadata(ROLES_KEY, testInstance.testMethod);
    expect(roles).toEqual(['admin', 'user']);
  });
});
