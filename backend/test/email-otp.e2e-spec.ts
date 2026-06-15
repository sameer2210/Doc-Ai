import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '@app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { EmailService } from '@app/auth/email-otp/services/email.service';

describe('Email OTP Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let capturedOtp: string | null = null;

  const mockEmailService = {
    sendOtpEmail: jest.fn().mockImplementation(async (email: string, otp: string) => {
      capturedOtp = otp;
      return Promise.resolve();
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(mockEmailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (app) {
      await prisma.user.deleteMany({
        where: { email: 'e2e-test@spandavidya.com' },
      });
      await prisma.emailOtp.deleteMany({
        where: { email: 'e2e-test@spandavidya.com' },
      });
      await prisma.emailOtpRateLimit.deleteMany({
        where: { email: 'e2e-test@spandavidya.com' },
      });
      await app.close();
    }
  });

  beforeEach(async () => {
    capturedOtp = null;
    if (prisma) {
      await prisma.emailOtp.deleteMany({
        where: { email: 'e2e-test@spandavidya.com' },
      });
      await prisma.emailOtpRateLimit.deleteMany({
        where: { email: 'e2e-test@spandavidya.com' },
      });
    }
  });

  it('should request an OTP and get success true', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/email/request-otp')
      .send({ email: 'e2e-test@spandavidya.com' })
      .expect(200);

    expect(res.body).toEqual({ success: true });
    expect(capturedOtp).not.toBeNull();
    expect(capturedOtp).toHaveLength(6);

    // Verify it exists in DB
    const dbOtp = await prisma.emailOtp.findFirst({
      where: { email: 'e2e-test@spandavidya.com' },
    });
    expect(dbOtp).not.toBeNull();
  });

  it('should fail to verify with invalid OTP', async () => {
    // Request OTP first
    await request(app.getHttpServer())
      .post('/auth/email/request-otp')
      .send({ email: 'e2e-test@spandavidya.com' });

    const res = await request(app.getHttpServer())
      .post('/auth/email/verify-otp')
      .send({ email: 'e2e-test@spandavidya.com', otp: '000000' })
      .expect(401);

    expect(res.body.message).toContain('Invalid or expired OTP');
  });

  it('should successfully verify with correct OTP and return tokens', async () => {
    // Request OTP first
    await request(app.getHttpServer())
      .post('/auth/email/request-otp')
      .send({ email: 'e2e-test@spandavidya.com' });

    expect(capturedOtp).not.toBeNull();

    const res = await request(app.getHttpServer())
      .post('/auth/email/verify-otp')
      .send({ email: 'e2e-test@spandavidya.com', otp: capturedOtp! })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe('e2e-test@spandavidya.com');

    // Verify OTP record is deleted after success
    const dbOtp = await prisma.emailOtp.findFirst({
      where: { email: 'e2e-test@spandavidya.com' },
    });
    expect(dbOtp).toBeNull();
  });
});
