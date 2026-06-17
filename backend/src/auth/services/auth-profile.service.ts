import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { AuthProvider, User, Prisma } from '@prisma/client';
import {
  AuthProfileInput,
  AuthProfileResult,
  PrismaExecutor,
} from '../types/auth-profile.types';

@Injectable()
export class AuthProfileService {
  private readonly logger = new Logger(AuthProfileService.name);

  /**
   * Unified flow to find or create a user, link their provider,
   * and enrich their profile information if logging in via a profile-rich provider.
   */
  async findOrCreateUser(
    prismaClient: PrismaExecutor,
    input: AuthProfileInput,
  ): Promise<AuthProfileResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    this.logger.debug(`findOrCreateUser — email: ${normalizedEmail}, provider: ${input.provider}`);

    // 1. Check if user already exists
    let user = await prismaClient.user.findUnique({
      where: { email: normalizedEmail },
    });

    this.logger.debug(`findOrCreateUser — existing user found: ${!!user}`);

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      try {
        const createdUser = await prismaClient.user.create({
          data: {
            email: normalizedEmail,
            name: input.profile?.name ?? null,
            avatarUrl: input.profile?.avatarUrl ?? null,
            googleId: input.profile?.externalId ?? null,
            role: 'USER',
          },
        });
        this.logger.log(`findOrCreateUser — created new user: ${createdUser.id}`);
        user = createdUser;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const target = this.extractConstraintTarget(error);
          if (target.includes('googleId')) {
            throw new ForbiddenException(
              'Google account is already linked to another user',
            );
          }
          // Concurrent registration race condition: re-fetch the user created concurrently
          user = await prismaClient.user.findUnique({
            where: { email: normalizedEmail },
          });
          if (!user) {
            throw error; // If still not found, propagate original error
          }
          isNewUser = false;
          this.logger.warn(`findOrCreateUser — race condition resolved for: ${normalizedEmail}`);
        } else {
          throw error;
        }
      }
    }

    // 2. Idempotently link the provider
    await this.linkProvider(prismaClient, user.id, input.provider);
    this.logger.debug(`findOrCreateUser — provider linked: ${input.provider} for user ${user.id}`);

    // 3. Enrich missing profile data for existing users
    if (!isNewUser) {
      user = await this.enrichProfile(prismaClient, user, input);
    }

    return { user, isNewUser };
  }

  /**
   * Idempotently links a UserAuthProvider relation.
   */
  async linkProvider(
    prismaClient: PrismaExecutor,
    userId: string,
    provider: AuthProvider,
  ): Promise<void> {
    try {
      await prismaClient.userAuthProvider.upsert({
        where: {
          userId_provider: {
            userId,
            provider,
          },
        },
        update: {},
        create: {
          userId,
          provider,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return; // Already linked by concurrent request
      }
      throw error;
    }
  }

  /**
   * Enriches profile data (name, avatarUrl, googleId) for existing users.
   * Only applies enrichment for GOOGLE provider logins.
   * EMAIL_OTP logins intentionally do not enrich profile (Option C).
   */
  private async enrichProfile(
    prismaClient: PrismaExecutor,
    user: User,
    input: AuthProfileInput,
  ): Promise<User> {
    const updateData: Prisma.UserUpdateInput = {};

    if (input.provider === AuthProvider.GOOGLE) {
      if (input.profile?.externalId) {
        if (user.googleId && user.googleId !== input.profile.externalId) {
          throw new ForbiddenException(
            'Google account is linked to a different identity',
          );
        }
        if (!user.googleId) {
          updateData.googleId = input.profile.externalId;
        }
      }

      // Enrich missing name and avatarUrl (only if they are currently null/falsy)
      if (!user.name && input.profile?.name) {
        updateData.name = input.profile.name;
      }
      if (!user.avatarUrl && input.profile?.avatarUrl) {
        updateData.avatarUrl = input.profile.avatarUrl;
      }
    }

    if (Object.keys(updateData).length > 0) {
      try {
        const updated = await prismaClient.user.update({
          where: { id: user.id },
          data: updateData,
        });
        this.logger.debug(`enrichProfile — updated user ${user.id} with provider data`);
        return updated;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const target = this.extractConstraintTarget(error);
          if (target.includes('googleId')) {
            throw new ForbiddenException(
              'Google account is already linked to another user',
            );
          }
        }
        throw error;
      }
    }

    return user;
  }

  /**
   * Safely extracts the constraint target array from a Prisma P2002 error.
   * Handles both string and string[] variants of meta.target.
   */
  private extractConstraintTarget(
    error: Prisma.PrismaClientKnownRequestError,
  ): string[] {
    const target = error.meta?.target;
    if (Array.isArray(target)) {
      return target.filter((t): t is string => typeof t === 'string');
    }
    if (typeof target === 'string') {
      return [target];
    }
    return [];
  }
}
