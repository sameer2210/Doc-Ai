import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { RequestContextService } from '../context/request-context.service';
import { Response } from 'express';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  constructor(private readonly context: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse<Response>();
    const requestId = this.context.get('requestId');

    const url = request.url || '';
    const bypassPaths = [
      '/v1/health/live',
      '/health/live',
      '/v1/health/ready',
      '/health/ready',
      '/v1/metrics',
      '/metrics',
    ];
    const shouldBypass = bypassPaths.some((path) => url === path || url.startsWith(path + '?'));

    if (shouldBypass) {
      return next.handle().pipe(
        tap(() => {
          if (requestId) {
            response.setHeader('X-Request-Id', requestId);
          }
        }),
      );
    }

    return next.handle().pipe(
      tap(() => {
        if (requestId) {
          response.setHeader('X-Request-Id', requestId);
        }
      }),
      map((data) => {
        return {
          requestId,
          statusCode: response.statusCode,
          timestamp: new Date().toISOString(),
          path: request.url,
          data,
        };
      }),
    );
  }
}
