import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * TenantIsolationGuard ensures that the tenantId being accessed in the request
 * matches the authenticated user's tenantId. SUPER_ADMIN is exempt.
 *
 * Used for routes that accept a :tenantId path parameter.
 */
@Injectable()
export class TenantIsolationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('Unauthenticated');

    // SUPER_ADMIN can access any tenant
    if (user.role === Role.SUPER_ADMIN) return true;

    const requestedTenantId = request.params?.tenantId || request.body?.tenantId;

    if (requestedTenantId && requestedTenantId !== user.tenantId) {
      throw new ForbiddenException("You do not have permission to access another tenant's data.");
    }

    return true;
  }
}
