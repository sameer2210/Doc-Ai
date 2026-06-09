import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

const logger = new Logger('PrismaExceptionFilter');

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        message = `Unique constraint failed on the field: ${exception.meta?.target}`;
        break;
      case 'P2003':
        logger.warn(
          JSON.stringify({
            event: 'PRISMA_FK_VIOLATION',
            code: exception.code,
            target: exception.meta?.field_name ?? null,
          }),
        );

        status = HttpStatus.CONFLICT;
        message = 'Related record does not exist';
        break;
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        break;
    }

    response.status(status).json({
      status: 'error',
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
