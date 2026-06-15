import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { Public } from '@common/decorators/public.decorator';
import { EmailOtpService } from './email-otp.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Auth')
@Controller('auth/email')
export class EmailOtpController {
  constructor(private readonly emailOtpService: EmailOtpService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ requestOtp: { limit: 3, ttl: 900_000 } })
  @ApiOperation({ summary: 'Request email OTP' })
  @ApiBody({ type: RequestOtpDto })
  @ApiResponse({ status: 200, description: 'Always returns success: true to prevent user enumeration' })
  @Post('request-otp')
  async requestOtp(@Body() dto: RequestOtpDto, @Req() req: Request) {
    return this.emailOtpService.requestOtp(dto.email, req);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ verifyOtp: { limit: 10, ttl: 900_000 } })
  @ApiOperation({ summary: 'Verify email OTP' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'Returns accessToken, refreshToken, user' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    return this.emailOtpService.verifyOtp(dto.email, dto.otp, req);
  }
}
