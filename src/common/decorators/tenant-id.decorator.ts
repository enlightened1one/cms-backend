import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @TenantId() — shorthand decorator to extract tenantId from the authenticated user.
 *
 * Usage:
 *   @Get()
 *   findAll(@TenantId() tenantId: string) { ... }
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId;
  },
);
