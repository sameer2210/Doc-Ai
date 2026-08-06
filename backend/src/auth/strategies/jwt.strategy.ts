import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@config/config.service';
import { Role } from '@prisma/client';
import { UsersService } from '@users/users.service';
import { ApiErrorCode, ErrorCategory } from '@common/constants/api-error-codes.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.jwtSecret,
    });
  }

  async validate(payload: { sub: string; email: string; role: Role }) {
    const exists = await this.usersService.exists(payload.sub);
    if (!exists) {
      this.logger.warn({ event: 'MISSING_USER', userId: payload.sub });
      throw new UnauthorizedException({
        errorCode: ApiErrorCode.UNAUTHORIZED,
        category: ErrorCategory.AUTH,
        message: 'User not found',
      });
    }
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
