import { AuditLogService } from '@audit-log/audit-log.service';
import { AuditAction, AuditContext } from '@common/constants/audit.enum';
import { ConfigService } from '@config/config.service';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import {
  createEmailAlreadyExistsException,
  createForbiddenException,
  createInvalidCredentialsException,
  createUnauthorizedException,
} from './auth-errors';
import { PrismaService } from '@prisma-local/prisma.service';
import { AuthProvider } from '@prisma/client';
import { Request } from 'express';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { AuthDto } from './dto/auth.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { HashService } from './hash/hash.service';
import { TokenService } from './token/token.service';
import { AuthProfileService } from './services/auth-profile.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private hashService: HashService,
    private tokenService: TokenService,
    private auditLogService: AuditLogService,
    private configService: ConfigService,
    private authProfileService: AuthProfileService,
  ) {}

  async register(dto: RegisterDto, req?: Request): Promise<AuthDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw createEmailAlreadyExistsException('Email already in use');
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
      ipAddress: this.getIpAddress(req),
      userAgent: this.getUserAgent(req),
      metadata: {
        email: user.email,
      },
    });

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.role,
    );
    await this.tokenService.updateRefreshToken(
      user.id,
      tokens.refresh_token,
      this.getSessionContext(req),
    );

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        bodyInsightCompleted: user.bodyInsightCompleted,
      },
    };
  }

  async login(dto: LoginDto, req?: Request) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const passwordValid =
      user &&
      user.password &&
      (await this.hashService.compareData(dto.password, user.password));
    if (!user || !passwordValid) {
      throw createInvalidCredentialsException('Invalid credentials');
    }

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.role,
    );
    await this.tokenService.updateRefreshToken(
      user.id,
      tokens.refresh_token,
      this.getSessionContext(req),
    );

    await this.auditLogService.logEvent({
      userId: user.id,
      action: AuditAction.USER_LOGGED_IN,
      context: AuditContext.AUTH,
      ipAddress: this.getIpAddress(req),
      userAgent: this.getUserAgent(req),
      metadata: {
        ip: this.getIpAddress(req),
        userAgent: this.getUserAgent(req),
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
        bodyInsightCompleted: user.bodyInsightCompleted,
      },
    };
  }

  async logout(userId: string) {
    if (!userId) {
      throw createForbiddenException('Invalid logout request');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw createForbiddenException('Invalid logout request');
    }

    await this.tokenService.removeRefreshToken(userId);

    await this.logLogoutEventSafe(userId);

    return { message: 'Successfully logged out' };
  }

  async logoutByRefreshToken(rawRefreshToken: string) {
    if (!rawRefreshToken?.trim()) {
      throw createUnauthorizedException('Refresh token not provided');
    }

    const userId =
      await this.tokenService.getSubjectFromRefreshToken(rawRefreshToken);
    if (!userId) {
      throw createUnauthorizedException('Invalid refresh token');
    }

    const isValid = await this.tokenService.verifyRefreshToken(
      userId,
      rawRefreshToken,
    );
    if (!isValid) {
      throw createUnauthorizedException('Refresh token revoked or invalid');
    }

    await this.tokenService.removeRefreshTokenByToken(userId, rawRefreshToken);
    await this.logLogoutEventSafe(userId);

    return { message: 'Successfully logged out' };
  }

  async refreshTokens(userId: string, email: string, req?: Request) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw createForbiddenException('Access Denied');
    }

    // Extract the raw refresh token from request body or cookie
    const incomingRefreshToken =
      req?.body?.refreshToken || req?.cookies?.refresh_token || null;

    if (!incomingRefreshToken) {
      throw createUnauthorizedException('Refresh token not provided');
    }

    // Verify the token against the bcrypt hash in DB (prevents revoked token reuse)
    const isValid = await this.tokenService.verifyRefreshToken(
      userId,
      incomingRefreshToken,
    );
    if (!isValid) {
      // Token mismatch — logout event already happened, invalidate immediately
      await this.tokenService.removeRefreshToken(userId);
      throw createUnauthorizedException('Refresh token revoked or invalid');
    }

    // Issue a new token pair (token rotation)
    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    await this.tokenService.rotateRefreshToken(
      user.id,
      incomingRefreshToken,
      tokens.refresh_token,
      this.getSessionContext(req),
    );

    await this.auditLogService.logEvent({
      userId,
      action: AuditAction.USER_REFRESHED_TOKEN,
      context: AuditContext.AUTH,
      ipAddress: this.getIpAddress(req),
      userAgent: this.getUserAgent(req),
      metadata: {
        ip: this.getIpAddress(req),
        userAgent: this.getUserAgent(req),
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
      throw createUnauthorizedException('Refresh token not provided');
    }

    const userId =
      await this.tokenService.getSubjectFromRefreshToken(rawRefreshToken);
    if (!userId) {
      throw createUnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw createForbiddenException(
        'Access Denied — user not found or no active session',
      );
    }

    // Verify raw token against bcrypt hash stored in DB
    const isValid = await this.tokenService.verifyRefreshToken(
      userId,
      rawRefreshToken,
    );
    if (!isValid) {
      await this.tokenService.removeRefreshToken(userId);
      throw createUnauthorizedException('Refresh token revoked or invalid');
    }

    // Rotate: issue brand-new token pair
    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.role,
    );
    await this.tokenService.rotateRefreshToken(
      user.id,
      rawRefreshToken,
      tokens.refresh_token,
      this.getSessionContext(req),
    );

    await this.auditLogService.logEvent({
      userId,
      action: AuditAction.USER_REFRESHED_TOKEN,
      context: AuditContext.AUTH,
      ipAddress: this.getIpAddress(req),
      userAgent: this.getUserAgent(req),
      metadata: {
        ip: this.getIpAddress(req),
        userAgent: this.getUserAgent(req),
      },
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

    let payload: TokenPayload | undefined;
    try {
      const ticket = await client.verifyIdToken({
        idToken: dto.idToken,
        audience,
      });
      payload = ticket.getPayload();
    } catch {
      throw new ForbiddenException('Invalid Google token');
    }

    if (!payload || !payload.email) {
      throw new ForbiddenException('Google token missing email');
    }
    if (!payload.email_verified) {
      throw new ForbiddenException('Google email must be verified');
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const { user, isNewUser } = await this.authProfileService.findOrCreateUser(
      this.prisma,
      {
        email: normalizedEmail,
        provider: AuthProvider.GOOGLE,
        profile: {
          name: payload.name || null,
          avatarUrl: payload.picture || null,
          externalId: payload.sub,
        },
      },
    );

    if (isNewUser) {
      await this.auditLogService.logEvent({
        userId: user.id,
        action: AuditAction.USER_REGISTERED,
        context: AuditContext.AUTH,
        ipAddress: this.getIpAddress(req),
        userAgent: this.getUserAgent(req),
        metadata: { provider: AuthProvider.GOOGLE, email: user.email },
      });
    }

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.role,
    );
    await this.tokenService.updateRefreshToken(
      user.id,
      tokens.refresh_token,
      this.getSessionContext(req),
    );

    await this.auditLogService.logEvent({
      userId: user.id,
      action: AuditAction.USER_LOGGED_IN,
      context: AuditContext.AUTH,
      ipAddress: this.getIpAddress(req),
      userAgent: this.getUserAgent(req),
      metadata: {
        provider: AuthProvider.GOOGLE,
        ip: this.getIpAddress(req),
        userAgent: this.getUserAgent(req),
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
        bodyInsightCompleted: user.bodyInsightCompleted,
      },
    };
  }



  private getSessionContext(req?: Request) {
    const userAgent = this.getUserAgent(req);
    return {
      ipAddress: this.getIpAddress(req),
      userAgent,
      deviceInfo: userAgent,
    };
  }

  private getIpAddress(req?: Request): string | null {
    return req?.ip ?? null;
  }

  private getUserAgent(req?: Request): string | null {
    const userAgent = req?.headers['user-agent'];
    return typeof userAgent === 'string' ? userAgent : null;
  }
}
