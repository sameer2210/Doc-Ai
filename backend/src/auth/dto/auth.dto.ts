import { Role } from '@prisma/client';

export class AuthDto {
  accessToken!: string;
  refreshToken!: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  };
}
