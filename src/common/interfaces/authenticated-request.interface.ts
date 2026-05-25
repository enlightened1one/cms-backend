import { Role } from '@prisma/client';
import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
  firstName: string;
  lastName: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
