import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '@common/filters/prisma-exception.filter';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { AppLogger } from '@common/logger/logger.service';
import { AppConfig } from '@config/app.config';
import { CorsConfig } from '@config/cors.config';
import { helmetOptions } from '@config/helmet.config';
import { BadRequestException, Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ApiErrorCode, ErrorCategory } from '@common/constants/api-error-codes.enum';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as Sentry from '@sentry/node';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { version } from '../package.json';
import { AppModule } from './app.module';
import { RequestContextService } from './common/context/request-context.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Get instances after app creation
  const appLogger = app.get(AppLogger);
  const requestContext = app.get(RequestContextService);
  const logger = new Logger('HTTP');

  // Replace Nest default logger with custom one
  app.useLogger(appLogger);
  app.useGlobalInterceptors(
    new LoggingInterceptor(requestContext),
    new ResponseInterceptor(requestContext),
    new RequestContextInterceptor(requestContext),
  );

  // Setup morgan logging
  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => logger.log(message.trim()),
      },
    }),
  );

  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('spandavidya API')
    .setDescription(
      'Production-ready NestJS boilerplate with authentication, RBAC, auditing, and metrics.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: version,
      tracesSampleRate: 0.1,
      enabled: isProd,
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((err) =>
          err.constraints ? Object.values(err.constraints) : [],
        );
        return new BadRequestException({
          errorCode: ApiErrorCode.VALIDATION_ERROR,
          category: ErrorCategory.VALIDATION,
          message: messages.length === 1 ? messages[0] : messages,
        });
      },
    }),
  );

  app.useGlobalFilters(
    new HttpExceptionFilter(appLogger, requestContext),
    new PrismaExceptionFilter(appLogger, requestContext),
  );

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.enableShutdownHooks();

  process.once('SIGUSR2', async () => {
    await app.close();
    process.kill(process.pid, 'SIGUSR2');
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  if (isProd) {
    app.use(helmet(helmetOptions));
    app.use(helmet.hidePoweredBy());
    app.enableCors(CorsConfig);
  } else {
    app.use(helmet());
    app.enableCors();
  }

  await app.listen(AppConfig.port, '0.0.0.0');
  appLogger.log(`Server listening on port ${AppConfig.port}`);
}
void bootstrap();
