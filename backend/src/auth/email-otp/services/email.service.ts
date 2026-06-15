import { Injectable, Logger } from '@nestjs/common';

export interface EmailProvider {
  sendOtpEmail(email: string, otp: string): Promise<void>;
}

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn(`RESEND_API_KEY is not defined. Logging OTP instead: ${otp}`);
      return;
    }

    const payload = {
      from: 'SpandaVidya <noreply@spandavidyaai.com>',
      to: [email],
      subject: 'Your SpandaVidya Verification Code',
      html: `
        <div style="font-family: sans-serif; padding: 24px; color: #111827;">
          <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 16px;">Your verification code is:</h2>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 2px; color: #8C6B3E; margin-bottom: 24px;">${otp}</div>
          <p style="font-size: 14px; color: #6B7280; margin-bottom: 8px;">This code expires in 10 minutes.</p>
          <p style="font-size: 12px; color: #9CA3AF;">If you did not request this code, ignore this email.</p>
        </div>
      `,
    };

    let attempt = 0;
    const maxRetries = 3;
    const delays = [1000, 2000, 4000];

    while (attempt <= maxRetries) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Resend API response error (${response.status}): ${errText}`);
        }

        this.logger.log(`OTP email sent successfully to ${email}`);
        return;
      } catch (error) {
        attempt++;
        if (attempt > maxRetries) {
          this.logger.error(`Failed to send OTP email to ${email} after ${maxRetries} retries`, error);
          throw error;
        }
        const delay = delays[attempt - 1] ?? 1000;
        this.logger.warn(`Resend failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

@Injectable()
export class EmailService {
  constructor(private readonly provider: ResendEmailProvider) {}

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    await this.provider.sendOtpEmail(email, otp);
  }
}
