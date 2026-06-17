import type { PrismaService } from '@prisma-local/prisma.service';
import type { AuthProvider, User, Prisma } from '@prisma/client';

export type PrismaExecutor = PrismaService | Prisma.TransactionClient;

export interface AuthProfileInput {
  email: string;
  provider: AuthProvider;
  profile?: {
    name?: string | null;
    avatarUrl?: string | null;
    externalId?: string | null;
  };
}

export interface AuthProfileResult {
  user: User;
  isNewUser: boolean;
}
