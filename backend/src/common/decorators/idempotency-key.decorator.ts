import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const rawHeader =
      request.headers['idempotency-key'] ||
      request.headers['x-idempotency-key'];

    if (!rawHeader) {
      return undefined;
    }

    const value = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  },
);
