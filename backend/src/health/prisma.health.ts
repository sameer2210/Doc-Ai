import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '@prisma-local/prisma.service';
import { Prisma } from '@prisma/client';
import {
  DATABASE_UNAVAILABLE,
  DATABASE_AUTHENTICATION_FAILED,
  DATABASE_CAPACITY_EXCEEDED,
} from '@common/constants/database-error-codes';
import { redactSensitiveData } from '@common/utils/redact-sensitive-data';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key = 'prisma'): Promise<HealthIndicatorResult> {
    try {
      // Run a simple query to check DB connection
      await this.prisma.$queryRaw`SELECT 1`;

      return this.getStatus(key, true);
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      const redactedMessage = redactSensitiveData(message);
      let category = DATABASE_UNAVAILABLE;
      let code: string | null = null;

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        code = error.code;
      } else if (error instanceof Prisma.PrismaClientInitializationError) {
        code = error.errorCode ?? null;
      }

      // Prisma Database Error Code Classification:
      // P1000: Authentication failed.
      // P1010: User was denied access on the database (permission/authorization failure).
      if (code === 'P1000' || code === 'P1010') {
        category = DATABASE_AUTHENTICATION_FAILED;
      }
      // P1001: Can't reach database server.
      // P1002: Connection timeout.
      // P1017: Server closed the connection.
      // P1011: TLS connection error.
      // P1012: Schema parsing error (prevents client initialization, making DB unavailable).
      else if (
        code === 'P1001' ||
        code === 'P1002' ||
        code === 'P1011' ||
        code === 'P1012' ||
        code === 'P1017'
      ) {
        category = DATABASE_UNAVAILABLE;
      }
      // P1008: Operations timeout.
      // P2028: Transaction/connection pool full or connection pool timeout.
      else if (code === 'P1008' || code === 'P2028') {
        category = DATABASE_CAPACITY_EXCEEDED;
      }
      // Fallback message check for connection pool timeout strings
      else if (/pool|connection\s+pool|exhausted|capacity|timeout/i.test(message)) {
        category = DATABASE_CAPACITY_EXCEEDED;
      }

      throw new HealthCheckError(
        'Prisma check failed',
        this.getStatus(key, false, {
          errorCode: category,
          errorMessage: redactedMessage,
        }),
      );
    }
  }
}
