import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AppModule } from '@app/app.module';
import { AuthService } from '@auth/auth.service';
import { PrismaService } from '@prisma-local/prisma.service';
import { cleanupDatabase } from '../utils/cleanup';
import type { Request } from 'express';

describe('AuthService (Integration)', () => {
  let moduleRef: TestingModule;
  let authService: AuthService;
  let prisma: PrismaService;
  const testEmail = `integration-auth-${Date.now()}@test.com`;
  const testPassword = 'password123!';
  const testName = 'Integration User';

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
    prisma = moduleRef.get<PrismaService>(PrismaService);

    // Make sure we start clean
    await cleanupDatabase(prisma, [testEmail]);
  });

  afterAll(async () => {
    await cleanupDatabase(prisma, [testEmail]);
    await prisma.$disconnect();
    await moduleRef.close();
  });

  describe('register', () => {
    it('should successfully register a new user in the database', async () => {
      const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as unknown as Request;
      const result = await authService.register({
        email: testEmail,
        password: testPassword,
        name: testName,
      }, mockReq);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toMatchObject({
        email: testEmail,
        name: testName,
      });

      const userInDb = await prisma.user.findUnique({
        where: { email: testEmail },
      });
      expect(userInDb).toBeDefined();
      expect(userInDb?.email).toBe(testEmail);
    });

    it('should throw an error when trying to register the same email', async () => {
      const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as unknown as Request;
      await expect(
        authService.register({
          email: testEmail,
          password: testPassword,
          name: testName,
        }, mockReq)
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should successfully login and issue tokens', async () => {
      const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'test-agent' } } as unknown as Request;
      const result = await authService.login({
        email: testEmail,
        password: testPassword,
      }, mockReq);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');

      // Check if session record was created in the DB
      const sessionCount = await prisma.session.count({
        where: { userId: result.user.id },
      });
      expect(sessionCount).toBeGreaterThan(0);
    });

    it('should throw on incorrect password', async () => {
      const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as unknown as Request;
      await expect(
        authService.login({
          email: testEmail,
          password: 'wrongpassword',
        }, mockReq)
      ).rejects.toThrow();
    });
  });

  describe('refreshByToken', () => {
    it('should rotate the refresh token and invalidate the old session', async () => {
      const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'test-agent' } } as unknown as Request;
      
      // First login to get a refresh token
      const loginRes = await authService.login({
        email: testEmail,
        password: testPassword,
      }, mockReq);

      const oldRefreshToken = loginRes.refreshToken;

      // Perform refresh
      const refreshRes = await authService.refreshByToken(oldRefreshToken, mockReq);
      expect(refreshRes).toHaveProperty('accessToken');
      expect(refreshRes).toHaveProperty('refreshToken');

      // Old refresh token lookup should be rotated or updated in session table
      // Let's verify that using the old refresh token again throws ForbiddenException
      await expect(
        authService.refreshByToken(oldRefreshToken, mockReq)
      ).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should invalidate sessions on logout', async () => {
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });
      expect(user).toBeDefined();

      await authService.logout(user!.id);

      // User session should be deleted/invalidated
      const sessionCount = await prisma.session.count({
        where: { userId: user!.id },
      });
      expect(sessionCount).toBe(0);

      const updatedUser = await prisma.user.findUnique({
        where: { id: user!.id },
      });
      expect(updatedUser?.hashedRefreshToken).toBeNull();
    });
  });
});
