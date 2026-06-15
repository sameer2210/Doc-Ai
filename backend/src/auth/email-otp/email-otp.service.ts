import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '@prisma-local/prisma.service';
import { HashService } from '../hash/hash.service';
import { TokenService } from '../token/token.service';
import { EmailService } from './services/email.service';
import { AuditLogService } from '@audit-log/audit-log.service';
import { AuditAction, AuditContext } from '@common/constants/audit.enum';
import { AuthProvider } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class EmailOtpService {
  private readonly logger = new Logger(EmailOtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async requestOtp(email: string, req?: Request): Promise<{ success: boolean }> {
    const normalizedEmail = email.trim().toLowerCase();
    const now = new Date();

    // 1. Rate Limit Checks
    const rateLimit = await this.prisma.emailOtpRateLimit.findUnique({
      where: { email: normalizedEmail },
    });

    let dailyCount = 1;
    let lastResetAt = now;

    if (rateLimit) {
      const isNewDay =
        now.getDate() !== rateLimit.lastResetAt.getDate() ||
        now.getMonth() !== rateLimit.lastResetAt.getMonth() ||
        now.getFullYear() !== rateLimit.lastResetAt.getFullYear();

      if (isNewDay) {
        dailyCount = 1;
        lastResetAt = now;
      } else {
        if (rateLimit.dailyCount >= 20) {
          this.logger.warn(`Daily OTP send limit exceeded for email: ${normalizedEmail}`);
          throw new BadRequestException('Daily OTP limit exceeded. Please try again tomorrow.');
        }
        dailyCount = rateLimit.dailyCount + 1;
        lastResetAt = rateLimit.lastResetAt;
      }

      // Cooldown check (60 seconds)
      if (rateLimit.lastRequestAt) {
        const elapsedMs = now.getTime() - rateLimit.lastRequestAt.getTime();
        if (elapsedMs < 60000) {
          throw new BadRequestException('Please wait 60 seconds before requesting a new OTP.');
        }
      }
    }

    // 2. Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await this.hashService.hashData(otp);

    // 3. Deduplicate: Delete any pre-existing OTP records for that email
    await this.prisma.emailOtp.deleteMany({
      where: { email: normalizedEmail },
    });

    // 4. Store the OTP record with 10-minute expiry
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    const ipAddress = req?.ip ?? null;
    const userAgent = req?.headers['user-agent'] as string ?? null;

    await this.prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        codeHash: hash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // 5. Update Rate Limit record
    await this.prisma.emailOtpRateLimit.upsert({
      where: { email: normalizedEmail },
      update: {
        dailyCount,
        lastRequestAt: now,
        lastResetAt,
      },
      create: {
        email: normalizedEmail,
        dailyCount: 1,
        lastRequestAt: now,
        lastResetAt: now,
      },
    });

    // 6. Send email (with retry handling)
    try {
      await this.emailService.sendOtpEmail(normalizedEmail, otp);
    } catch (err) {
      this.logger.error(`Resend API error: failed to send email to ${normalizedEmail}`, err);
      // Suppress email sending errors to protect user presence (User Enumeration Protection)
    }

    // 7. Audit log OTP request
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      await this.auditLogService.logEvent({
        userId: user.id,
        action: AuditAction.OTP_REQUESTED,
        context: AuditContext.AUTH,
        ipAddress,
        userAgent,
        metadata: { email: normalizedEmail },
      });
    } else {
      this.logger.log(`OTP requested for guest/new user: ${normalizedEmail}`);
    }

    return { success: true };
  }

  async verifyOtp(email: string, otp: string, req?: Request) {
    const normalizedEmail = email.trim().toLowerCase();
    const now = new Date();

    // 1. Look up active OTP record
    const otpRecord = await this.prisma.emailOtp.findFirst({
      where: { email: normalizedEmail },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // 2. Expiry check
    if (otpRecord.expiresAt < now) {
      await this.prisma.emailOtp.delete({
        where: { id: otpRecord.id },
      });
      throw new UnauthorizedException('OTP has expired');
    }

    // 3. Failed attempts check (pre-verification)
    if (otpRecord.attempts >= 5) {
      await this.prisma.emailOtp.delete({
        where: { id: otpRecord.id },
      });
      throw new UnauthorizedException('OTP has expired. Please request a new code.');
    }

    // 4. Compare hash
    const isValid = await this.hashService.compareData(otp, otpRecord.codeHash);

    if (!isValid) {
      const updated = await this.prisma.emailOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });

      if (updated.attempts >= 5) {
        await this.prisma.emailOtp.delete({
          where: { id: otpRecord.id },
        });
        throw new UnauthorizedException('Too many failed attempts. Please request a new code.');
      }

      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // 5. Verification Transaction (Atomic Consumption and User resolution)
    const user = await this.prisma.$transaction(async (tx) => {
      // Consume the OTP atomically to prevent race conditions (double submit)
      const deleted = await tx.emailOtp.deleteMany({
        where: {
          id: otpRecord.id,
          expiresAt: { gt: now },
        },
      });

      if (deleted.count !== 1) {
        throw new UnauthorizedException('OTP already verified or expired');
      }

      // Find or Create user
      let u = await tx.user.findUnique({
        where: { email: normalizedEmail },
      });

      let isNewUser = false;
      if (!u) {
        isNewUser = true;
        u = await tx.user.create({
          data: {
            email: normalizedEmail,
            name: 'Unknown',
            role: 'USER',
          },
        });
      }

      // Link Provider to User
      const existingLink = await tx.userAuthProvider.findUnique({
        where: {
          userId_provider: {
            userId: u.id,
            provider: AuthProvider.EMAIL_OTP,
          },
        },
      });

      if (!existingLink) {
        await tx.userAuthProvider.create({
          data: {
            userId: u.id,
            provider: AuthProvider.EMAIL_OTP,
          },
        });
      }

      return { user: u, isNewUser };
    });

    // 6. Generate Session and Tokens (Outside of Database Transaction)
    const tokens = await this.tokenService.generateTokens(
      user.user.id,
      user.user.email,
      user.user.role,
    );

    const userAgent = req?.headers['user-agent'] as string ?? null;
    const ipAddress = req?.ip ?? null;

    await this.tokenService.updateRefreshToken(
      user.user.id,
      tokens.refresh_token,
      {
        ipAddress,
        userAgent,
        deviceInfo: userAgent,
      },
    );

    // 7. Audit log events
    if (user.isNewUser) {
      await this.auditLogService.logEvent({
        userId: user.user.id,
        action: AuditAction.USER_REGISTERED,
        context: AuditContext.AUTH,
        ipAddress,
        userAgent,
        metadata: { provider: 'email-otp', email: user.user.email },
      });
    }

    await this.auditLogService.logEvent({
      userId: user.user.id,
      action: AuditAction.USER_LOGGED_IN,
      context: AuditContext.AUTH,
      ipAddress,
      userAgent,
      metadata: {
        provider: 'email-otp',
        ip: ipAddress,
      },
    });

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      user: {
        id: user.user.id,
        email: user.user.email,
        name: user.user.name ?? undefined,
        avatarUrl: user.user.avatarUrl ?? undefined,
      },
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredOtps() {
    try {
      const result = await this.prisma.emailOtp.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired OTP records`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired OTPs', error);
    }
  }
}
