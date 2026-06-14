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

    console.log('\n========== REQUEST ==========');

    console.log({
      requestId,
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      params: req.params,
      body: req.body,
    });

    console.log('=============================\n');

    return next.handle().pipe(
      tap((response) => {
        console.log('\n========== RESPONSE ==========');

        console.log({
          requestId,
          method: req.method,
          url: req.originalUrl,
          statusCode: context.switchToHttp().getResponse().statusCode,
          duration: `${Date.now() - start}ms`,
          response,
        });

        console.log('==============================\n');
      }),
    );
  }
}
