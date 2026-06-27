import { randomUUID } from 'crypto';

export const TEST_USER = {
  email: `user-${randomUUID()}@test.com`,
  password: 'password123!',
  name: 'Test User',
};

export const NEW_TEST_USER = {
  email: `new-user-${randomUUID()}@test.com`,
  password: 'password123!',
  name: 'New Test User',
};

