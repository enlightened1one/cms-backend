import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new tenant [SUPER_ADMIN only]' })
  @ApiResponse({ status: 201, description: 'Tenant created' })
  create(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantsService.create(
      dto,
      user.id,
      `${user.firstName} ${user.lastName}`,
    );
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all tenants (paginated) [SUPER_ADMIN only]' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.tenantsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get a single tenant by ID' })
  @ApiParam({ name: 'id', description: 'Tenant CUID' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update tenant details' })
  @ApiParam({ name: 'id', description: 'Tenant CUID' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantsService.update(
      id,
      dto,
      user.id,
      `${user.firstName} ${user.lastName}`,
    );
  }
}
