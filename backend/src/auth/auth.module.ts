import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from '@auth/auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '@users/users.module';
import { JwtStrategy } from '@auth/strategies/jwt.strategy';
import { TokenService } from '@auth/token/token.service';
import { ConfigModule } from '@config/config.module';
import { ConfigService } from '@config/config.service';
import { PrismaService } from '@prisma-local/prisma.service';
import { UsersService } from '@users/users.service';
import { HashService } from './hash/hash.service';
import { RefreshTokenStrategy } from './strategies/refresh.strategy';
import { AuditLogService } from '@audit-log/audit-log.service';

@Module({
  imports: [PassportModule, JwtModule.register({}), UsersModule, ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenStrategy,
    TokenService,
    ConfigService,
    PrismaService,
    UsersService,
    HashService,
    AuditLogService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
