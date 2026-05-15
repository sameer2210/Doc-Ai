import { Role } from '@prisma/client';

export class AuthDto {
  email!: string;
  name?: string;
  role!: Role;
}
