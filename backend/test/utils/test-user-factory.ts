import { PrismaService } from '@prisma-local/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export class TestUserFactory {
  constructor(private readonly prisma: PrismaService) {}

  async create(overrides: {
    email?: string;
    password?: string;
    name?: string;
    role?: Role;
  } = {}) {
    const email = overrides.email ?? `test-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@test.com`;
    const plainPassword = overrides.password ?? 'password123!';
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: overrides.name ?? 'Test User',
        role: overrides.role ?? Role.USER,
      },
    });
  }
}
