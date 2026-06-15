import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { Public } from '@common/decorators/public.decorator';
import { GetUser } from '@common/decorators/get-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { MobileLogoutDto } from './dto/mobile-logout.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Login ────────────────────────────────────────────────────────────────
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Email/password login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Returns accessToken, refreshToken, user' })
  @ApiResponse({ status: 403, description: 'Invalid credentials' })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    // Returns { accessToken, refreshToken, user } — client stores in SecureStore
    return this.authService.login(dto, req);
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Google Sign-In with idToken' })
  @ApiBody({ type: GoogleLoginDto })
  @ApiResponse({ status: 200, description: 'Returns accessToken, refreshToken, user' })
  @ApiResponse({ status: 403, description: 'Invalid Google token' })
  @Post('google')
  googleLogin(@Body() dto: GoogleLoginDto, @Req() req: Request) {
    return this.authService.googleLogin(dto, req);
  }

  // ─── Register ─────────────────────────────────────────────────────────────
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Register new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Returns accessToken, refreshToken, user' })
  @ApiResponse({ status: 403, description: 'Email already in use' })
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req);
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — invalidates refresh token in DB' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  @Post('logout')
  logout(@GetUser('userId') userId: string) {
    return this.authService.logout(userId);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Mobile logout — invalidates refresh token from native clients' })
  @ApiBody({ type: MobileLogoutDto })
  @ApiResponse({ status: 200, description: 'Logged out' })
  @ApiUnauthorizedResponse({ description: 'Invalid or revoked refresh token' })
  @Post('logout/mobile')
  logoutMobile(@Body() dto: MobileLogoutDto) {
    return this.authService.logoutByRefreshToken(dto.refreshToken);
  }

  // ─── Token Refresh ────────────────────────────────────────────────────────
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get new access + refresh tokens' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Returns new accessToken and refreshToken' })
  @ApiResponse({ status: 403, description: 'Invalid or revoked refresh token' })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    // RefreshAuthGuard reads token from body — userId/email extracted by guard
    // We call service directly with the DTO so verifyRefreshToken() gets the raw token
    return this.authService.refreshByToken(dto.refreshToken, req);
  }
}
