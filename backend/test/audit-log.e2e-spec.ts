import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestHelper } from './utils/test-helper';
import { MockGuard } from './utils/mock.guard';
import { TEST_USER } from './utils/users';
import { PrismaService } from '@app/prisma/prisma.service';

describe('AuditLog e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  beforeAll(async () => {
    const result = await TestHelper.createApp(MockGuard);
    app = result.app;
    prisma = app.get(PrismaService);

    // Register & login user to get access token
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

    accessToken = loginRes.body.accessToken || loginRes.body.access_token;
  });

  afterAll(async () => {
    await TestHelper.cleanupUsers(app, [TEST_USER.email]);
    await TestHelper.closeApp(app);
  });

  describe('GET /audit-logs', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/audit-logs').expect(401);
    });

    it('should return audit logs list with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('action');
        expect(res.body[0]).toHaveProperty('userId');
        expect(res.body[0]).toHaveProperty('timestamp');
      }
    });
  });
});
