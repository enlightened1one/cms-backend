import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ActivitiesService } from './activities.service';
import { QueryActivitiesDto } from './dto/query-activities.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Activities')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Get the full audit log for a tenant',
    description:
      'Returns all activity events across the tenant, newest first. Filterable by action type and actor.',
  })
  @ApiResponse({ status: 200, description: 'Activities fetched' })
  findAll(
    @TenantId() tenantId: string,
    @Query() query: QueryActivitiesDto,
  ) {
    return this.activitiesService.findByTenant(tenantId, query);
  }
}
