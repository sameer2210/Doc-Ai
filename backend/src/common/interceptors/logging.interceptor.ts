/* eslint-disable no-console */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RequestContextService } from '../context/request-context.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly context: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const requestId = this.context.requestId() || 'unknown';

    const start = Date.now();

    const isProd = process.env.NODE_ENV === 'production';

    console.log('\n========== REQUEST ==========');

    console.log({
      requestId,
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      params: req.params,
      ...(isProd ? {} : { body: req.body }),
    });

    return next.handle().pipe(
      tap((response) => {
        console.log('\n========== RESPONSE ==========');

        console.log({
          requestId,
          method: req.method,
          url: req.originalUrl,
          statusCode: context.switchToHttp().getResponse().statusCode,
          duration: `${Date.now() - start}ms`,
          ...(isProd ? {} : { response }),
        });
      }),
    );
  }
}
