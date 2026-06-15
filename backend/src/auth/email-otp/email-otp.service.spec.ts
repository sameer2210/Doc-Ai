import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EmailOtpService } from './email-otp.service';
import { PrismaService } from '@prisma-local/prisma.service';
import { HashService } from '../hash/hash.service';
import { TokenService } from '../token/token.service';
import { EmailService } from './services/email.service';
import { AuditLogService } from '@audit-log/audit-log.service';
import { AuthProvider } from '@prisma/client';


describe('EmailOtpService', () => {
  let service: EmailOtpService;
  let prisma: Partial<PrismaService>;
  let hashService: Partial<HashService>;
  let tokenService: Partial<TokenService>;
  let emailService: Partial<EmailService>;
  let auditLogService: Partial<AuditLogService>;

  beforeEach(async () => {
    prisma = {
      emailOtpRateLimit: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      emailOtp: {
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      userAuthProvider: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma as any)),
    } as unknown as PrismaService;

    hashService = {
      hashData: jest.fn().mockResolvedValue('hashed_otp'),
      compareData: jest.fn(),
    };

    tokenService = {
      generateTokens: jest.fn().mockResolvedValue({
        access_token: 'mock_access',
        refresh_token: 'mock_refresh',
      }),
      updateRefreshToken: jest.fn(),
    } as unknown as any;

    emailService = {
      sendOtpEmail: jest.fn().mockResolvedValue(undefined),
    };

    auditLogService = {
      logEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailOtpService,
        { provide: PrismaService, useValue: prisma },
        { provide: HashService, useValue: hashService },
        { provide: TokenService, useValue: tokenService },
        { provide: EmailService, useValue: emailService },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get<EmailOtpService>(EmailOtpService);
  });

  describe('requestOtp', () => {
    it('should generate, hash and send OTP when all checks pass', async () => {
      (prisma.emailOtpRateLimit?.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.requestOtp('USER@GMAIL.COM');

      expect(result).toEqual({ success: true });
      expect(prisma.emailOtp?.deleteMany).toHaveBeenCalledWith({
        where: { email: 'user@gmail.com' }, // Normalized email
      });
      expect(prisma.emailOtp?.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'user@gmail.com',
            codeHash: 'hashed_otp',
          }),
        }),
      );
      expect(emailService.sendOtpEmail).toHaveBeenCalledWith('user@gmail.com', expect.any(String));
    });

    it('should throw BadRequestException if cooldown is violated', async () => {
      const now = new Date();
      (prisma.emailOtpRateLimit?.findUnique as jest.Mock).mockResolvedValue({
        email: 'user@gmail.com',
        dailyCount: 2,
        lastResetAt: now,
        lastRequestAt: new Date(now.getTime() - 30 * 1000), // 30 seconds ago
      });

      await expect(service.requestOtp('user@gmail.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reset dailyCount if calendar day changes', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      (prisma.emailOtpRateLimit?.findUnique as jest.Mock).mockResolvedValue({
        email: 'user@gmail.com',
        dailyCount: 20, // Hit daily limit yesterday
        lastResetAt: yesterday,
        lastRequestAt: yesterday,
      });

      const result = await service.requestOtp('user@gmail.com');
      expect(result).toEqual({ success: true });
      expect(prisma.emailOtpRateLimit?.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            dailyCount: 1, // Reset to 1 (first request of new day)
          }),
        }),
      );
    });

    it('should throw BadRequestException if daily limit of 20 is exceeded', async () => {
      const now = new Date();
      (prisma.emailOtpRateLimit?.findUnique as jest.Mock).mockResolvedValue({
        email: 'user@gmail.com',
        dailyCount: 20,
        lastResetAt: now,
        lastRequestAt: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago (no cooldown breach)
      });

      await expect(service.requestOtp('user@gmail.com')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyOtp', () => {
    it('should throw UnauthorizedException if no OTP record exists', async () => {
      (prisma.emailOtp?.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyOtp('user@gmail.com', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if OTP has expired', async () => {
      const past = new Date(Date.now() - 1000);
      (prisma.emailOtp?.findFirst as jest.Mock).mockResolvedValue({
        id: 'otp-1',
        email: 'user@gmail.com',
        codeHash: 'hash',
        expiresAt: past,
        attempts: 0,
      });

      await expect(service.verifyOtp('user@gmail.com', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.emailOtp?.delete).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
      });
    });

    it('should delete OTP and throw if attempts >= 5', async () => {
      (prisma.emailOtp?.findFirst as jest.Mock).mockResolvedValue({
        id: 'otp-1',
        email: 'user@gmail.com',
        codeHash: 'hash',
        expiresAt: new Date(Date.now() + 100000),
        attempts: 5,
      });

      await expect(service.verifyOtp('user@gmail.com', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.emailOtp?.delete).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
      });
    });

    it('should increment attempts and delete if attempts hit 5 on failure', async () => {
      (prisma.emailOtp?.findFirst as jest.Mock).mockResolvedValue({
        id: 'otp-1',
        email: 'user@gmail.com',
        codeHash: 'hash',
        expiresAt: new Date(Date.now() + 100000),
        attempts: 4,
      });
      (hashService.compareData as jest.Mock).mockResolvedValue(false);
      (prisma.emailOtp?.update as jest.Mock).mockResolvedValue({
        id: 'otp-1',
        attempts: 5,
      });

      await expect(service.verifyOtp('user@gmail.com', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.emailOtp?.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { attempts: { increment: 1 } },
      });
      expect(prisma.emailOtp?.delete).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
      });
    });

    it('should onboard new user and return standard session structure on successful verify', async () => {
      const now = new Date();
      (prisma.emailOtp?.findFirst as jest.Mock).mockResolvedValue({
        id: 'otp-1',
        email: 'user@gmail.com',
        codeHash: 'hash',
        expiresAt: new Date(now.getTime() + 100000),
        attempts: 0,
      });
      (hashService.compareData as jest.Mock).mockResolvedValue(true);
      (prisma.emailOtp?.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.user?.findUnique as jest.Mock).mockResolvedValue(null); // New user
      (prisma.user?.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'user@gmail.com',
        role: 'USER',
      });
      (prisma.userAuthProvider?.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.verifyOtp('user@gmail.com', '123456');

      expect(result).toEqual({
        accessToken: 'mock_access',
        refreshToken: 'mock_refresh',
        user: {
          id: 'user-1',
          email: 'user@gmail.com',
          name: undefined,
          avatarUrl: undefined,
        },
      });
      expect(prisma.emailOtp?.deleteMany).toHaveBeenCalled();
      expect(prisma.user?.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            email: 'user@gmail.com',
            name: 'Unknown',
            role: 'USER',
          },
        }),
      );
      expect(prisma.userAuthProvider?.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          provider: AuthProvider.EMAIL_OTP,
        },
      });
    });

    it('should link provider to existing user without duplicate account', async () => {
      const now = new Date();
      (prisma.emailOtp?.findFirst as jest.Mock).mockResolvedValue({
        id: 'otp-1',
        email: 'user@gmail.com',
        codeHash: 'hash',
        expiresAt: new Date(now.getTime() + 100000),
        attempts: 0,
      });
      (hashService.compareData as jest.Mock).mockResolvedValue(true);
      (prisma.emailOtp?.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.user?.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'user@gmail.com',
        role: 'USER',
      }); // Existing user
      (prisma.userAuthProvider?.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.verifyOtp('user@gmail.com', '123456');

      expect(result.user.id).toBe('user-123');
      expect(prisma.user?.create).not.toHaveBeenCalled();
      expect(prisma.userAuthProvider?.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          provider: AuthProvider.EMAIL_OTP,
        },
      });
    });
  });
});
