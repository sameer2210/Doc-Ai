import {
  MiddlewareConsumer,
  Module,
  NestModule,
  OnApplicationShutdown,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@auth/auth.module';
import { UsersModule } from '@users/users.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerMiddleware } from '@common/middleware/logger.middleware';
// import { LoggerModule } from '@logger/logger.module';
import { PrismaService } from '@prisma-local/prisma.service';
import { THROTTLER_CONFIG, throttlerConfig } from '@config/throttler.config';
import { ThrottlerUserGuard } from '@common/guards/throttler-user.guard';
import { HealthModule } from '@health/health.module';
import { ConfigModule } from '@config/config.module';
import { RolesGuard } from '@common/decorators/guards/roles.guard';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AuditLogModule } from '@audit-log/audit-log.module';
import { MetricsModule } from '@common/metrics/metrics.module';
import { RequestContextService } from './common/context/request-context.service';
import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    HealthModule,
    MetricsModule,
    AuditLogModule,
    LoggerModule,
    ThrottlerModule.forRoot(throttlerConfig),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    ConfigModule,
    RequestContextService,
    {
      provide: THROTTLER_CONFIG,
      useValue: throttlerConfig,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerUserGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [PrismaService, RequestContextService],
})
export class AppModule implements NestModule, OnApplicationShutdown {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }

  onApplicationShutdown(signal: string) {
    console.log(`Application shutting down due to: ${signal}`);
  }
}
