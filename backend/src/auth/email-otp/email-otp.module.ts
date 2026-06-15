import { Module } from '@nestjs/common';
import { EmailOtpController } from './email-otp.controller';
import { EmailOtpService } from './email-otp.service';
import { EmailService, ResendEmailProvider } from './services/email.service';
import { ConfigModule } from '@config/config.module';
import { AuthModule } from '@auth/auth.module';
import { AuditLogModule } from '@audit-log/audit-log.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    AuditLogModule,
  ],
  controllers: [EmailOtpController],
  providers: [
    EmailOtpService,
    EmailService,
    ResendEmailProvider,
  ],
  exports: [EmailOtpService],
})
export class EmailOtpModule {}
