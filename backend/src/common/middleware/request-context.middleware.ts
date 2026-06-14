import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from '../context/request-context.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly context: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const rawId = req.headers['x-request-id'] || req.headers['request-id'];
    const requestId = (Array.isArray(rawId) ? rawId[0] : rawId) || uuidv4();

    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    this.context.run(
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
      },
      () => {
        next();
      },
    );
  }
}
