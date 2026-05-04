import { Role } from '@prisma/client';

export interface JwtUser {
  id: string;
  email: string;
  role: Role;
}
