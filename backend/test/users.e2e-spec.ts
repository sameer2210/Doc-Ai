import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestHelper } from './utils/test-helper';
import { MockGuard } from './utils/mock.guard';
import { NEW_TEST_USER, TEST_USER } from './utils/users';
import { S3Client } from '@aws-sdk/client-s3';

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

    accessToken = loginRes.body.accessToken || loginRes.body.access_token;
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

  describe('DELETE /user/me', () => {
    let s3SendSpy: jest.SpyInstance;

    beforeAll(() => {
      s3SendSpy = jest.spyOn(S3Client.prototype, 'send').mockImplementation(async () => {
        return {} as never;
      });
    });

    afterAll(() => {
      s3SendSpy.mockRestore();
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).delete('/user/me').expect(401);
    });

    it('should delete user profile and all cascade related rows with valid token', async () => {
      const userBefore = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      const userId = userBefore!.id;

      // Seed cascade related rows
      const session = await prisma.session.create({
        data: {
          userId,
          refreshToken: 'test-refresh-token-e2e',
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      const bodyInsight = await prisma.bodyInsight.create({
        data: {
          userId,
          diabetes: false,
          hypertension: false,
          blurredVision: false,
          nightVisionDifficulty: false,
          halosAroundLights: false,
          familyHistoryOfCataract: false,
        },
      });

      const userAuthProvider = await prisma.userAuthProvider.create({
        data: {
          userId,
          provider: 'EMAIL_OTP',
        },
      });

      const auditLog = await prisma.auditLog.create({
        data: {
          userId,
          action: 'TEST_ACTION',
          context: 'TEST_CONTEXT',
        },
      });

      const chat = await prisma.chat.create({
        data: {
          userId,
          title: 'Test Consultation',
        },
      });

      const message = await prisma.message.create({
        data: {
          chatId: chat.id,
          role: 'USER',
          content: 'Test content',
        },
      });

      const upload = await prisma.upload.create({
        data: {
          userId,
          fileUrl: 'https://example.com/file.png',
          fileType: 'image/png',
          s3Key: 'test-s3-key-e2e',
        },
      });

      const prediction = await prisma.aiPrediction.create({
        data: {
          userId,
          messageId: message.id,
          uploadId: upload.id,
          prediction: 'No_Cataract',
          confidence: 0.95,
          rawMlResponse: {},
        },
      });

      // Execute deletion
      await request(app.getHttpServer())
        .delete('/user/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify deletions
      const deletedUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(deletedUser).toBeNull();

      const deletedSession = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(deletedSession).toBeNull();

      const deletedBodyInsight = await prisma.bodyInsight.findUnique({
        where: { id: bodyInsight.id },
      });
      expect(deletedBodyInsight).toBeNull();

      const deletedUserAuthProvider = await prisma.userAuthProvider.findUnique({
        where: { id: userAuthProvider.id },
      });
      expect(deletedUserAuthProvider).toBeNull();

      const deletedAuditLog = await prisma.auditLog.findUnique({
        where: { id: auditLog.id },
      });
      expect(deletedAuditLog).toBeNull();

      const deletedChat = await prisma.chat.findUnique({
        where: { id: chat.id },
      });
      expect(deletedChat).toBeNull();

      const deletedMessage = await prisma.message.findUnique({
        where: { id: message.id },
      });
      expect(deletedMessage).toBeNull();

      const deletedUpload = await prisma.upload.findUnique({
        where: { id: upload.id },
      });
      expect(deletedUpload).toBeNull();

      const deletedPrediction = await prisma.aiPrediction.findUnique({
        where: { id: prediction.id },
      });
      expect(deletedPrediction).toBeNull();
    });
  });
});
