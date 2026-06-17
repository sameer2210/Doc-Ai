import { Test, type TestingModule } from '@nestjs/testing';
import { AuthProfileService } from './auth-profile.service';
import { PrismaService } from '@prisma-local/prisma.service';
import { AuthProvider, Prisma } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('AuthProfileService', () => {
  let service: AuthProfileService;
  let prisma: Partial<PrismaService>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userAuthProvider: {
        upsert: jest.fn(),
      },
    } as unknown as PrismaService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthProfileService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuthProfileService>(AuthProfileService);
  });

  describe('findOrCreateUser', () => {
    it('should create a new OTP user with null profile fields', async () => {
      (prisma.user?.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user?.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: null,
        avatarUrl: null,
        role: 'USER',
      });

      const result = await service.findOrCreateUser(prisma as PrismaService, {
        email: 'USER@example.com ',
        provider: AuthProvider.EMAIL_OTP,
      });

      expect(prisma.user?.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(prisma.user?.create).toHaveBeenCalledWith({
        data: {
          email: 'user@example.com',
          name: null,
          avatarUrl: null,
          googleId: null,
          role: 'USER',
        },
      });
      expect(prisma.userAuthProvider?.upsert).toHaveBeenCalledWith({
        where: {
          userId_provider: {
            userId: 'user-1',
            provider: AuthProvider.EMAIL_OTP,
          },
        },
        update: {},
        create: {
          userId: 'user-1',
          provider: AuthProvider.EMAIL_OTP,
        },
      });
      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'user-1',
          email: 'user@example.com',
          name: null,
          avatarUrl: null,
        }),
        isNewUser: true,
      });
    });

    it('should link provider and enrich profile for an existing OTP user when logging in with Google', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: null,
        avatarUrl: null,
        googleId: null,
        role: 'USER',
      };

      (prisma.user?.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user?.update as jest.Mock).mockResolvedValue({
        ...existingUser,
        name: 'Sameer Khan',
        avatarUrl: 'google-avatar-url',
        googleId: 'google-sub-id',
      });

      const result = await service.findOrCreateUser(prisma as PrismaService, {
        email: 'user@example.com',
        provider: AuthProvider.GOOGLE,
        profile: {
          name: 'Sameer Khan',
          avatarUrl: 'google-avatar-url',
          externalId: 'google-sub-id',
        },
      });

      expect(prisma.user?.create).not.toHaveBeenCalled();
      expect(prisma.user?.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          name: 'Sameer Khan',
          avatarUrl: 'google-avatar-url',
          googleId: 'google-sub-id',
        },
      });
      expect(prisma.userAuthProvider?.upsert).toHaveBeenCalledWith({
        where: {
          userId_provider: {
            userId: 'user-1',
            provider: AuthProvider.GOOGLE,
          },
        },
        update: {},
        create: {
          userId: 'user-1',
          provider: AuthProvider.GOOGLE,
        },
      });
      expect(result.isNewUser).toBe(false);
      expect(result.user.name).toBe('Sameer Khan');
      expect(result.user.avatarUrl).toBe('google-avatar-url');
    });

    it('should link provider and keep existing profile information when existing Google user logs in with OTP', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Sameer Khan',
        avatarUrl: 'google-avatar-url',
        googleId: 'google-sub-id',
        role: 'USER',
      };

      (prisma.user?.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const result = await service.findOrCreateUser(prisma as PrismaService, {
        email: 'user@example.com',
        provider: AuthProvider.EMAIL_OTP,
      });

      expect(prisma.user?.create).not.toHaveBeenCalled();
      expect(prisma.user?.update).not.toHaveBeenCalled();
      expect(prisma.userAuthProvider?.upsert).toHaveBeenCalledWith({
        where: {
          userId_provider: {
            userId: 'user-1',
            provider: AuthProvider.EMAIL_OTP,
          },
        },
        update: {},
        create: {
          userId: 'user-1',
          provider: AuthProvider.EMAIL_OTP,
        },
      });
      expect(result.isNewUser).toBe(false);
      expect(result.user).toEqual(existingUser);
    });

    it('should throw ForbiddenException if Google account is linked to a different googleId', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Sameer Khan',
        avatarUrl: 'google-avatar-url',
        googleId: 'original-google-id',
        role: 'USER',
      };

      (prisma.user?.findUnique as jest.Mock).mockResolvedValue(existingUser);

      await expect(
        service.findOrCreateUser(prisma as PrismaService, {
          email: 'user@example.com',
          provider: AuthProvider.GOOGLE,
          profile: {
            name: 'Sameer Khan',
            avatarUrl: 'google-avatar-url',
            externalId: 'different-google-id',
          },
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.user?.update).not.toHaveBeenCalled();
    });

    it('should handle user creation race conditions and re-fetch gracefully', async () => {
      (prisma.user?.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'user-2',
          email: 'race@example.com',
          name: null,
          avatarUrl: null,
          role: 'USER',
        });

      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0', meta: { target: ['email'] } },
      );
      (prisma.user?.create as jest.Mock).mockRejectedValue(p2002Error);

      const result = await service.findOrCreateUser(prisma as PrismaService, {
        email: 'race@example.com',
        provider: AuthProvider.EMAIL_OTP,
      });

      expect(prisma.user?.create).toHaveBeenCalled();
      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'user-2',
          email: 'race@example.com',
        }),
        isNewUser: false,
      });
    });

    it('should throw ForbiddenException if googleId unique constraint fails on update', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: null,
        avatarUrl: null,
        googleId: null,
        role: 'USER',
      };

      (prisma.user?.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0', meta: { target: ['googleId'] } },
      );
      (prisma.user?.update as jest.Mock).mockRejectedValue(p2002Error);

      await expect(
        service.findOrCreateUser(prisma as PrismaService, {
          email: 'user@example.com',
          provider: AuthProvider.GOOGLE,
          profile: {
            name: 'Sameer Khan',
            avatarUrl: 'google-avatar-url',
            externalId: 'already-linked-google-id',
          },
        }),
      ).rejects.toThrow(new ForbiddenException('Google account is already linked to another user'));
    });
  });
});
