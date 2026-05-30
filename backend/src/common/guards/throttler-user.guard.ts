import { Inject, Injectable } from '@nestjs/common';
import {
  getOptionsToken,
  getStorageToken,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { ConfigService } from '@config/config.service';
import type { Request } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import * as jwt from 'jsonwebtoken';
import { Reflector } from '@nestjs/core';

interface AuthenticatedRequestUser {
  userId?: string;
  id?: string;
}

@Injectable()
export class ThrottlerUserGuard extends ThrottlerGuard {
  constructor(
    @Inject(getOptionsToken())
    options: ThrottlerModuleOptions,
    @Inject(getStorageToken())
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(
    request: Request & { user?: AuthenticatedRequestUser },
  ): Promise<string> {
    const authenticatedUserId = request.user?.userId ?? request.user?.id;

    if (authenticatedUserId) {
      return authenticatedUserId;
    }

    const token = this.extractBearerToken(request);
    if (!token) {
      return request.ip ?? 'unknown-ip';
    }

    return this.extractUserIdFromToken(token) ?? request.ip ?? 'unknown-ip';
  }

  private extractBearerToken(req: Request): string | undefined {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }

  private extractUserIdFromToken(token: string): string | undefined {
    try {
      const decoded = jwt.verify(
        token,
        this.configService.jwtSecret,
      ) as JwtPayload | string;

      if (typeof decoded === 'string') {
        return undefined;
      }

      if (typeof decoded.sub === 'string') {
        return decoded.sub;
      }

      if (typeof decoded.userId === 'string') {
        return decoded.userId;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }
}
