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
export class RequestContextInterceptor<T> implements NestInterceptor<T, any> {
  constructor(private readonly context: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse<Response>();
    const requestId = this.context.get('requestId');

    return next.handle().pipe(
      tap(() => {
        if (requestId) {
          response.setHeader('X-Request-Id', requestId);
        }
      }),
      map((data) => ({
        requestId,
        statusCode: response.statusCode,
        timestamp: new Date().toISOString(),
        path: request.url,
        data,
      })),
    );
  }
}
