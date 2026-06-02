import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: Role;
  tenantId: string;
  iat?: number;
  exp?: number;
}
