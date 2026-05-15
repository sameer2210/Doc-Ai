import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestHelper } from './utils/test-helper';
import { MockGuard } from './utils/mock.guard';
import { NEW_TEST_USER, TEST_USER } from './utils/users';

describe('Auth e2e', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const result = await TestHelper.createApp(MockGuard);
    app = result.app;

    await request(app.getHttpServer()).post('/auth/register').send({
      email: TEST_USER.email,
      password: TEST_USER.password,
      name: TEST_USER.name,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    accessToken = loginRes.body.accessToken || loginRes.body.access_token;
    refreshToken = loginRes.body.refreshToken || loginRes.body.refresh_token;
  });

  afterAll(async () => {
    await TestHelper.cleanupUsers(app, [TEST_USER.email, NEW_TEST_USER.email]);
    await TestHelper.closeApp(app);
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: NEW_TEST_USER.email,
          password: NEW_TEST_USER.password,
          name: NEW_TEST_USER.name,
        })
        .expect(200);

      expect(res.body).toMatchObject({
        email: NEW_TEST_USER.email,
        name: NEW_TEST_USER.name,
      });
      expect(res.body).not.toHaveProperty('password');
    });

    it('should fail registering user with existing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: NEW_TEST_USER.email,
          password: NEW_TEST_USER.password,
          name: NEW_TEST_USER.name,
        })
        .expect(403, {
          message: 'Email already in use',
          error: 'Forbidden',
          statusCode: 403,
        });
    });
  });

  describe('POST /auth/login', () => {
    it('should login with correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
    });

    it('should fail login with wrong credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_USER.email, password: 'wrongpass' })
        .expect(403, {
          message: 'Invalid credentials',
          error: 'Forbidden',
          statusCode: 403,
        });
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return 401 if no refresh token provided', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(401);
    });

    it('should refresh tokens with valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
      // Optionally update tokens for next tests
      accessToken = res.body.access_token;
      refreshToken = res.body.refresh_token;
    });
  });

  describe('POST /auth/logout', () => {
    it('should return 401 if no access token', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });

    it('should logout user with valid access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body).toEqual({ message: 'Successfully logged out' });
    });

    it('should fail to refresh tokens after logout', async () => {
      // Trying to use old refresh token after logout should fail
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
