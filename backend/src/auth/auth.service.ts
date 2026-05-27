import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { HashService } from './hash/hash.service';
import { TokenService } from './token/token.service';
import { AuthDto } from './dto/auth.dto';
import { AuditLogService } from '@audit-log/audit-log.service';
import { Request } from 'express';
import { AuditAction, AuditContext } from '@common/constants/audit.enum';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@config/config.service';
import { GoogleLoginDto } from './dto/google-login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private hashService: HashService,
    private tokenService: TokenService,
    private auditLogService: AuditLogService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto, req?: Request): Promise<AuthDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ForbiddenException('Email already in use');
    }

    const hash = await this.hashService.hashData(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hash,
        name: dto.name,
        role: 'USER',
      },
    });

    await this.auditLogService.logEvent({
      userId: user.id,
      action: AuditAction.USER_REGISTERED,
      context: AuditContext.AUTH,
      metadata: {
        email: user.email,
      },
    });

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.role,
    );
    await this.tokenService.updateRefreshToken(user.id, tokens.refresh_token);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
      },
    };
  }

  async login(dto: LoginDto, req?: Request) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const passwordValid =
      user && user.password && (await this.hashService.compareData(dto.password, user.password));
    if (!user || !passwordValid) {
      throw new ForbiddenException('Invalid credentials');
    }

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.role,
    );
    await this.tokenService.updateRefreshToken(user.id, tokens.refresh_token);

    await this.auditLogService.logEvent({
      userId: user.id,
      action: AuditAction.USER_LOGGED_IN,
      context: AuditContext.AUTH,
      metadata: {
        ip: req?.ip || null,
        userAgent: req?.headers['user-agent'] || null,
      },
    });

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
      },
    };
  }

  async logout(userId: string) {
    if (!userId) {
      throw new ForbiddenException('Invalid logout request');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('Invalid logout request');
    }

    await this.tokenService.removeRefreshToken(userId);

    await this.logLogoutEventSafe(userId);

    return { message: 'Successfully logged out' };
  }

  async logoutByRefreshToken(rawRefreshToken: string) {
    if (!rawRefreshToken?.trim()) {
      throw new ForbiddenException('Refresh token not provided');
    }

    const userId = await this.tokenService.getSubjectFromRefreshToken(rawRefreshToken);
    if (!userId) {
      throw new ForbiddenException('Invalid refresh token');
    }

    const isValid = await this.tokenService.verifyRefreshToken(userId, rawRefreshToken);
    if (!isValid) {
      throw new ForbiddenException('Refresh token revoked or invalid');
    }

    await this.tokenService.removeRefreshToken(userId);
    await this.logLogoutEventSafe(userId);

    return { message: 'Successfully logged out' };
  }

  async refreshTokens(userId: string, email: string, req?: Request) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException('Access Denied');
    }

    // Extract the raw refresh token from request body or cookie
    const incomingRefreshToken =
      req?.body?.refreshToken ||
      req?.cookies?.refresh_token ||
      null;

    if (!incomingRefreshToken) {
      throw new ForbiddenException('Refresh token not provided');
    }

    // Verify the token against the bcrypt hash in DB (prevents revoked token reuse)
    const isValid = await this.tokenService.verifyRefreshToken(
      userId,
      incomingRefreshToken,
    );
    if (!isValid) {
      // Token mismatch — logout event already happened, invalidate immediately
      await this.tokenService.removeRefreshToken(userId);
      throw new ForbiddenException('Refresh token revoked or invalid');
    }

    // Issue a new token pair (token rotation)
    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    await this.tokenService.updateRefreshToken(user.id, tokens.refresh_token);

    await this.auditLogService.logEvent({
      userId,
      action: AuditAction.USER_REFRESHED_TOKEN,
      context: AuditContext.AUTH,
      metadata: {
        ip: req?.ip || null,
        userAgent: req?.headers['user-agent'] || null,
      },
    });

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }

  /**
   * Mobile-native refresh flow — token comes in request body (no cookie needed).
   * Decodes the refresh JWT to extract userId, verifies against DB hash,
   * then issues a new rotated token pair.
   */
  async refreshByToken(rawRefreshToken: string, req?: Request) {
    if (!rawRefreshToken?.trim()) {
      throw new ForbiddenException('Refresh token not provided');
    }

    const userId = await this.tokenService.getSubjectFromRefreshToken(rawRefreshToken);
    if (!userId) {
      throw new ForbiddenException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException('Access Denied — user not found or no active session');
    }

    // Verify raw token against bcrypt hash stored in DB
    const isValid = await this.tokenService.verifyRefreshToken(userId, rawRefreshToken);
    if (!isValid) {
      await this.tokenService.removeRefreshToken(userId);
      throw new ForbiddenException('Refresh token revoked or invalid');
    }

    // Rotate: issue brand-new token pair
    const tokens = await this.tokenService.generateTokens(user.id, user.email, user.role);
    await this.tokenService.updateRefreshToken(user.id, tokens.refresh_token);

    await this.auditLogService.logEvent({
      userId,
      action: AuditAction.USER_REFRESHED_TOKEN,
      context: AuditContext.AUTH,
      metadata: { ip: req?.ip || null, userAgent: req?.headers['user-agent'] || null },
    });

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }

  private async logLogoutEventSafe(userId: string): Promise<void> {
    try {
      await this.auditLogService.logEvent({
        userId,
        action: AuditAction.USER_LOGGED_OUT,
        context: AuditContext.AUTH,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write logout audit event for user ${userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  async googleLogin(dto: GoogleLoginDto, req?: Request) {
    const audience = this.configService.googleClientIds;
    if (!audience.length) {
      throw new ForbiddenException('Google OAuth is not configured on server');
    }

    const client = new OAuth2Client();

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: dto.idToken,
        audience,
      });
      payload = ticket.getPayload();
    } catch (error) {
      throw new ForbiddenException('Invalid Google token');
    }

    if (!payload || !payload.email) {
      throw new ForbiddenException('Google token missing email');
    }

    let user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: payload.email,
          googleId: payload.sub,
          name: payload.name || 'Unknown',
          avatarUrl: payload.picture,
          role: 'USER',
        },
      });
      
      await this.auditLogService.logEvent({
        userId: user.id,
        action: AuditAction.USER_REGISTERED,
        context: AuditContext.AUTH,
        metadata: { provider: 'google', email: user.email },
      });
    } else if (!user.googleId) {
      // Link Google account to existing user
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub },
      });
    }

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.role,
    );
    await this.tokenService.updateRefreshToken(user.id, tokens.refresh_token);

    await this.auditLogService.logEvent({
      userId: user.id,
      action: AuditAction.USER_LOGGED_IN,
      context: AuditContext.AUTH,
      metadata: {
        provider: 'google',
        ip: req?.ip || null,
        userAgent: req?.headers['user-agent'] || null,
      },
    });

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
      },
    };
  }
}
