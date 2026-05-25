import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * @Roles(...roles) — decorates a route with the roles allowed to access it.
 *
 * Usage:
 *   @Roles(Role.TENANT_ADMIN, Role.AGENT)
 *   @Get('complaints')
 *   findAll() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
