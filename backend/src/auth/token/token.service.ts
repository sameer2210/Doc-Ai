import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@config/config.service';
import { PrismaService } from '@prisma-local/prisma.service';
import type { StringValue } from 'ms';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

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
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }

  async removeRefreshToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
  }

  async verifyRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.hashedRefreshToken) return false;

    return await bcrypt.compare(refreshToken, user.hashedRefreshToken);
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
}
