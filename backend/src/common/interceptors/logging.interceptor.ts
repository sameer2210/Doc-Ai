import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    const start = Date.now();

    console.log('\n========== REQUEST ==========');

    console.log({
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
