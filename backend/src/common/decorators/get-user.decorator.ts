import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Role } from '@prisma/client';
import type { Request } from 'express';

interface UserWithRole {
  userId: string;
  email: string;
  role: Role;
}

export const GetUser = createParamDecorator(
  (data: keyof UserWithRole | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as UserWithRole | undefined;
    return data ? user?.[data] : user;
  },
);
