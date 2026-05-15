import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestHelper } from './utils/test-helper';
import { MockGuard } from './utils/mock.guard';
import { NEW_TEST_USER, TEST_USER } from './utils/users';

describe('Users e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  beforeAll(async () => {
    const result = await TestHelper.createApp(MockGuard);
    app = result.app;
    prisma = app.get(PrismaService);

    await request(app.getHttpServer()).post('/auth/register').send({
      email: TEST_USER.email,
      password: TEST_USER.password,
      name: TEST_USER.name,
    });

    await prisma.user.update({
      where: { email: TEST_USER.email },
      data: { role: 'ADMIN' },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    accessToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await TestHelper.cleanupUsers(app, [TEST_USER.email, NEW_TEST_USER.email]);
    await TestHelper.closeApp(app);
  });

  describe('POST /user', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).post('/user').expect(401);
    });

    it('should create user with valid token', async () => {
      const res = await request(app.getHttpServer())
        .post('/user')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: NEW_TEST_USER.email,
          password: NEW_TEST_USER.password,
          name: NEW_TEST_USER.name,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        email: NEW_TEST_USER.email,
        name: NEW_TEST_USER.name,
      });
    });
  });

  describe('GET /user/all', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/user/all').expect(401);
    });

    it('should return list with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/user/all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('email');
    });
  });

  describe('GET /user/me', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/user/me').expect(401);
    });

    it('should return user profile with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/user/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        email: TEST_USER.email,
        name: TEST_USER.name,
      });
    });
  });

  describe('PATCH /user/me', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/user/me').expect(401);
    });

    it('should update user profile with valid token', async () => {
      const res = await request(app.getHttpServer())
        .patch('/user/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body).toMatchObject({
        email: TEST_USER.email,
        name: 'Updated Name',
      });
    });
  });
});
