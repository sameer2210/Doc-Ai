import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@config/config.service';
import { PrismaService } from '@prisma-local/prisma.service';
import type { StringValue } from 'ms';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { Role } from '@prisma/client';

export type RefreshSessionContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceInfo?: string | null;
};

@Injectable()
export class TokenService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async generateTokens(
    userId: string,
    email: string,
    role: Role,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const [access_token, refresh_token] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, email, role },
        {
          secret: this.config.jwtSecret,
          expiresIn: this.config.jwtExpiresIn as StringValue,
        },
      ),
      this.jwt.signAsync(
        { sub: userId, email, role },
        {
          secret: this.config.jwtRefreshSecret,
          expiresIn: this.config.jwtRefreshExpiresIn as StringValue,
        },
      ),
    ]);

    return { access_token, refresh_token };
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string,
    context: RefreshSessionContext = {},
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    const refreshTokenDigest = this.hashRefreshTokenForLookup(refreshToken);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { hashedRefreshToken },
      }),
      this.prisma.session.create({
        data: {
          userId,
          refreshToken: refreshTokenDigest,
          ipAddress: context.ipAddress ?? null,
          deviceInfo: context.deviceInfo ?? context.userAgent ?? null,
          expiresAt: this.getRefreshTokenExpiry(refreshToken),
        },
      }),
    ]);
  }

  async removeRefreshToken(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { hashedRefreshToken: null },
      }),
      this.prisma.session.deleteMany({
        where: { userId },
      }),
    ]);
  }

  async removeRefreshTokenByToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const refreshTokenDigest = this.hashRefreshTokenForLookup(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: refreshTokenDigest },
      select: { userId: true },
    });

    if (!session) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { hashedRefreshToken: null },
      });
      return;
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { hashedRefreshToken: null },
      }),
      this.prisma.session.delete({
        where: { refreshToken: refreshTokenDigest },
      }),
    ]);
  }

  async rotateRefreshToken(
    userId: string,
    currentRefreshToken: string,
    nextRefreshToken: string,
    context: RefreshSessionContext = {},
  ): Promise<void> {
    const currentRefreshTokenDigest =
      this.hashRefreshTokenForLookup(currentRefreshToken);
    const nextRefreshTokenDigest =
      this.hashRefreshTokenForLookup(nextRefreshToken);
    const hashedRefreshToken = await bcrypt.hash(nextRefreshToken, 12);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { hashedRefreshToken },
      });

      const updated = await tx.session.updateMany({
        where: {
          userId,
          refreshToken: currentRefreshTokenDigest,
          expiresAt: { gt: new Date() },
        },
        data: {
          refreshToken: nextRefreshTokenDigest,
          ipAddress: context.ipAddress ?? null,
          deviceInfo: context.deviceInfo ?? context.userAgent ?? null,
          expiresAt: this.getRefreshTokenExpiry(nextRefreshToken),
        },
      });

      if (updated.count === 0) {
        await tx.session.create({
          data: {
            userId,
            refreshToken: nextRefreshTokenDigest,
            ipAddress: context.ipAddress ?? null,
            deviceInfo: context.deviceInfo ?? context.userAgent ?? null,
            expiresAt: this.getRefreshTokenExpiry(nextRefreshToken),
          },
        });
      }
    });
  }

  async verifyRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const refreshTokenDigest = this.hashRefreshTokenForLookup(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: {
        userId,
        refreshToken: refreshTokenDigest,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (session) {
      return true;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { hashedRefreshToken: true },
    });
    if (!user?.hashedRefreshToken) return false;

    return bcrypt.compare(refreshToken, user.hashedRefreshToken);
  }

  async getSubjectFromRefreshToken(refreshToken: string): Promise<string | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(refreshToken, {
        secret: this.config.jwtRefreshSecret,
      });

      return typeof payload.sub === 'string' && payload.sub.trim() ? payload.sub : null;
    } catch {
      return null;
    }
  }

  private hashRefreshTokenForLookup(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private getRefreshTokenExpiry(refreshToken: string): Date {
    const decoded = this.jwt.decode(refreshToken);
    if (
      decoded &&
      typeof decoded === 'object' &&
      typeof decoded.exp === 'number'
    ) {
      return new Date(decoded.exp * 1000);
    }

    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
}
