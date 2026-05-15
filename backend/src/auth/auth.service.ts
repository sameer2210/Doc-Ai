import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { HashService } from './hash/hash.service';
import { TokenService } from './token/token.service';
import { AuthDto } from './dto/auth.dto';
import { AuditLogService } from '@audit-log/audit-log.service';
import { Request } from 'express';
import { AuditAction, AuditContext } from '@common/constants/audit.enum';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private hashService: HashService,
    private tokenService: TokenService,
    private auditLogService: AuditLogService,
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

    return {
      email: user.email,
      name: user.name ?? undefined,
      role: user.role,
    };
  }

  async login(dto: LoginDto, req?: Request) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const passwordValid =
      user && (await this.hashService.compareData(dto.password, user.password));
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

    return tokens;
  }

  async logout(userId: string) {
    await this.tokenService.removeRefreshToken(userId);

    await this.auditLogService.logEvent({
      userId,
      action: AuditAction.USER_LOGGED_OUT,
      context: AuditContext.AUTH,
    });

    return { message: 'Successfully logged out' };
  }

  async refreshTokens(userId: string, email: string, req?: Request) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException('Access Denied');
    }

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

    return tokens;
  }
}
