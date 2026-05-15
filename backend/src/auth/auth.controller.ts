import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GetUser } from '@common/decorators/get-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { Public } from '@common/decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user and return JWT tokens',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        accessToken: 'string',
        refreshToken: 'string',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Invalid credentials' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User registration',
    description: 'Register a new user and return JWT tokens',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User has been successfully registered.',
    schema: {
      example: {
        accessToken: 'string',
        refreshToken: 'string',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiOperation({
    summary: 'User logout',
    description: 'Logout user and invalidate tokens',
  })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post('logout')
  logout(@GetUser('userId') userId: string) {
    return this.authService.logout(userId);
  }

  @Public()
  @UseGuards(RefreshAuthGuard)
  @ApiBearerAuth('refresh-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiOperation({
    summary: 'Refresh tokens',
    description: 'Refresh access and refresh tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens have been successfully refreshed.',
    schema: {
      example: {
        accessToken: 'string',
        refreshToken: 'string',
      },
    },
  })
  @Post('refresh')
  refreshTokens(
    @GetUser('userId') userId: string,
    @GetUser('email') email: string,
    @Req() req: Request,
  ) {
    return this.authService.refreshTokens(userId, email);
  }
}
