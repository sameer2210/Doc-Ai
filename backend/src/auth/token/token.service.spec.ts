import { TokenService } from './token.service';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '@prisma-local/prisma.service';
import type { ConfigService } from '@config/config.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => {
  return {
    hash: jest.fn().mockResolvedValue('mocked-bcrypt-hash'),
    compare: jest.fn().mockResolvedValue(true),
  };
});

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: any;
  let prisma: any;
  let configService: any;

  beforeEach(() => {
    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    };

    prisma = {
      user: {
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    configService = {
      jwtSecret: 'access-secret',
      jwtExpiresIn: '60m',
      jwtRefreshSecret: 'refresh-secret',
      jwtRefreshExpiresIn: '7d',
    };

    jest.clearAllMocks();

    service = new TokenService(
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );

    // Default transaction implementation
    prisma.$transaction.mockImplementation((arg: any) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      return Promise.all(arg);
    });
  });

  describe('generateTokens', () => {
    it('signs access and refresh tokens with correct secrets and expirations', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('mocked-access-token')
        .mockResolvedValueOnce('mocked-refresh-token');

      const result = await service.generateTokens('user-1', 'user@test.com', 'USER');

      expect(result).toEqual({
        access_token: 'mocked-access-token',
        refresh_token: 'mocked-refresh-token',
      });

      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        { sub: 'user-1', email: 'user@test.com', role: 'USER' },
        { secret: 'access-secret', expiresIn: '60m' },
      );

      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        { sub: 'user-1', email: 'user@test.com', role: 'USER' },
        { secret: 'refresh-secret', expiresIn: '7d' },
      );
    });
  });

  describe('updateRefreshToken', () => {
    it('hashes token and updates database records inside transaction', async () => {
      jwtService.decode.mockReturnValueOnce({ exp: 1234567890 });

      await service.updateRefreshToken('user-1', 'refresh-token-xyz', {
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('refresh-token-xyz', 12);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { hashedRefreshToken: 'mocked-bcrypt-hash' },
      });
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          refreshToken: expect.any(String), // sha256 hex
          ipAddress: '127.0.0.1',
          deviceInfo: 'Mozilla',
          expiresAt: new Date(1234567890 * 1000),
        },
      });
    });
  });

  describe('removeRefreshToken', () => {
    it('clears hashed refresh token on user and deletes user sessions', async () => {
      await service.removeRefreshToken('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { hashedRefreshToken: null },
      });
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('removeRefreshTokenByToken', () => {
    it('clears token on user and deletes matching session if session exists', async () => {
      prisma.session.findUnique.mockResolvedValueOnce({ userId: 'user-1' });

      await service.removeRefreshTokenByToken('user-1', 'token-123');

      expect(prisma.session.delete).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { hashedRefreshToken: null },
      });
    });

    it('falls back to just clearing user hashed refresh token if session is missing', async () => {
      prisma.session.findUnique.mockResolvedValueOnce(null);

      await service.removeRefreshTokenByToken('user-1', 'token-123');

      expect(prisma.session.delete).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { hashedRefreshToken: null },
      });
    });
  });

  describe('rotateRefreshToken', () => {
    it('rotates refresh token, hashes next token, and updates existing session', async () => {
      prisma.session.updateMany.mockResolvedValueOnce({ count: 1 });
      jwtService.decode.mockReturnValueOnce({ exp: 1234567890 });

      await service.rotateRefreshToken('user-1', 'token-old', 'token-new', {
        ipAddress: '127.0.0.1',
        deviceInfo: 'iPhone',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { hashedRefreshToken: 'mocked-bcrypt-hash' },
      });
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-1',
          refreshToken: expect.any(String), // sha256 of old
        }),
        data: expect.objectContaining({
          refreshToken: expect.any(String), // sha256 of new
          ipAddress: '127.0.0.1',
          deviceInfo: 'iPhone',
        }),
      });
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('creates new session if update count is 0 (session not found/expired)', async () => {
      prisma.session.updateMany.mockResolvedValueOnce({ count: 0 });
      jwtService.decode.mockReturnValueOnce({ exp: 1234567890 });

      await service.rotateRefreshToken('user-1', 'token-old', 'token-new', {
        ipAddress: '127.0.0.1',
        deviceInfo: 'iPhone',
      });

      expect(prisma.session.create).toHaveBeenCalled();
    });
  });

  describe('verifyRefreshToken', () => {
    it('returns true if active session exists in database', async () => {
      prisma.session.findFirst.mockResolvedValueOnce({ id: 'session-id' });

      const result = await service.verifyRefreshToken('user-1', 'token-123');

      expect(result).toBe(true);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('falls back to compare user hashedRefreshToken if session does not exist in DB', async () => {
      prisma.session.findFirst.mockResolvedValueOnce(null);
      prisma.user.findUnique = jest.fn().mockResolvedValueOnce({ hashedRefreshToken: 'bcrypt-hashed' });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.verifyRefreshToken('user-1', 'token-123');

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('token-123', 'bcrypt-hashed');
    });

    it('returns false if session is missing and user has no hashed refresh token', async () => {
      prisma.session.findFirst.mockResolvedValueOnce(null);
      prisma.user.findUnique = jest.fn().mockResolvedValueOnce({ hashedRefreshToken: null });

      const result = await service.verifyRefreshToken('user-1', 'token-123');

      expect(result).toBe(false);
    });
  });

  describe('getSubjectFromRefreshToken', () => {
    it('successfully extracts subject (sub) property from valid refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({ sub: 'user-id-extracted' });

      const sub = await service.getSubjectFromRefreshToken('token-valid');

      expect(sub).toBe('user-id-extracted');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('token-valid', { secret: 'refresh-secret' });
    });

    it('returns null if jwt verify fails', async () => {
      jwtService.verifyAsync.mockRejectedValueOnce(new Error('token expired'));

      const sub = await service.getSubjectFromRefreshToken('token-invalid');

      expect(sub).toBeNull();
    });
  });

  describe('getRefreshTokenExpiry', () => {
    it('returns 30 days default expiration if decode returns null', () => {
      jwtService.decode.mockReturnValueOnce(null);

      const expiry = (service as any).getRefreshTokenExpiry('token-nodecode');

      // Expiry should be around 30 days in the future
      const diffMs = expiry.getTime() - Date.now();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(30);
    });
  });
});
