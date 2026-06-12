import type { Request } from 'express';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '@prisma-local/prisma.service';
import { HashService } from './hash/hash.service';
import { TokenService } from './token/token.service';
import { AuditLogService } from '@audit-log/audit-log.service';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@config/config.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: Partial<PrismaService>;
  let hashService: Partial<HashService>;
  let tokenService: Partial<TokenService>;
  let auditLogService: Partial<AuditLogService>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as PrismaService;

    hashService = {
      hashData: jest.fn(),
      compareData: jest.fn(),
    };

    tokenService = {
      generateTokens: jest.fn(),
      updateRefreshToken: jest.fn(),
      removeRefreshToken: jest.fn(),
      removeRefreshTokenByToken: jest.fn(),
      rotateRefreshToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      getSubjectFromRefreshToken: jest.fn(),
    };

    auditLogService = {
      logEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        { provide: HashService, useValue: hashService },
        { provide: TokenService, useValue: tokenService },
        { provide: AuditLogService, useValue: auditLogService },
        {
          provide: ConfigService,
          useValue: {
            googleClientIds: ['test-google-client-id'],
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should throw if email is already taken', async () => {
      (prisma.user?.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'taken@example.com',
      });

      await expect(
        service.register({
          email: 'taken@example.com',
          password: 'pass',
          name: 'Test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create a user and return auth DTO', async () => {
      (prisma.user?.findUnique as jest.Mock).mockResolvedValue(null);
      (hashService.hashData as jest.Mock).mockResolvedValue('hashed');
      (prisma.user?.create as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'new@example.com',
        name: 'Test',
        role: 'USER',
      });
      (tokenService.generateTokens as jest.Mock).mockResolvedValue({
        access_token: 'access',
        refresh_token: 'refresh',
      });

      const result = await service.register({
        email: 'new@example.com',
        password: 'pass',
        name: 'Test',
      });

      expect(result).toEqual({
        accessToken: 'access',
        refreshToken: 'refresh',
        user: {
          id: '1',
          email: 'new@example.com',
          name: 'Test',
          avatarUrl: undefined,
        },
      });
      expect(tokenService.updateRefreshToken).toHaveBeenCalledWith(
        '1',
        'refresh',
        {
          deviceInfo: null,
          ipAddress: null,
          userAgent: null,
        },
      );
      expect(auditLogService.logEvent).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should throw on invalid credentials', async () => {
      (prisma.user?.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'nope@example.com', password: 'wrong' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return tokens and log login', async () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        password: 'hashed',
        role: 'USER',
      };

      (prisma.user?.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (hashService.compareData as jest.Mock).mockResolvedValue(true);
      (tokenService.generateTokens as jest.Mock).mockResolvedValue({
        access_token: 'access',
        refresh_token: 'refresh',
      });

      const result = await service.login(
        { email: 'user@example.com', password: 'correct' },
        { ip: '127.0.0.1', headers: { 'user-agent': 'test-agent' } } as unknown as Request,
      );

      expect(result).toHaveProperty('accessToken', 'access');
      expect(result).toHaveProperty('refreshToken', 'refresh');
      expect(tokenService.updateRefreshToken).toHaveBeenCalledWith(
        '1',
        'refresh',
        {
          deviceInfo: 'test-agent',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        },
      );
      expect(auditLogService.logEvent).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should remove refresh token and log logout', async () => {
      (prisma.user?.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'user@example.com',
      });

      await service.logout('1');

      expect(tokenService.removeRefreshToken).toHaveBeenCalledWith('1');
      expect(auditLogService.logEvent).toHaveBeenCalled();
    });

    it('should remove refresh token using mobile refresh token', async () => {
      (tokenService.getSubjectFromRefreshToken as jest.Mock).mockResolvedValue('1');
      (tokenService.verifyRefreshToken as jest.Mock).mockResolvedValue(true);

      await service.logoutByRefreshToken('refresh');

      expect(tokenService.removeRefreshTokenByToken).toHaveBeenCalledWith('1', 'refresh');
      expect(auditLogService.logEvent).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('should throw if user not found or no refresh token', async () => {
      (prisma.user?.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.refreshTokens('1', 'user@example.com'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should refresh tokens and log event', async () => {
      (prisma.user?.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'user@example.com',
        role: 'USER',
      });

      (tokenService.generateTokens as jest.Mock).mockResolvedValue({
        access_token: 'new_access',
        refresh_token: 'new_refresh',
      });
      (tokenService.verifyRefreshToken as jest.Mock).mockResolvedValue(true);

      const result = await service.refreshTokens('1', 'user@example.com', {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
        body: { refreshToken: 'old_refresh' },
      } as unknown as Request);

      expect(result).toHaveProperty('accessToken', 'new_access');
      expect(tokenService.rotateRefreshToken).toHaveBeenCalledWith(
        '1',
        'old_refresh',
        'new_refresh',
        {
          deviceInfo: 'test-agent',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        },
      );
      expect(auditLogService.logEvent).toHaveBeenCalled();
    });
  });
});
