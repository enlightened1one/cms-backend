import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { buildResponse } from '../common/utils/response.util';
import { buildPaginationParams, paginate } from '../common/utils/pagination.util';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ActivityAction } from '@prisma/client';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────

  async create(dto: CreateTenantDto, actorId: string, actorName: string) {
    const slugExists = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (slugExists) {
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    const emailExists = await this.prisma.tenant.findUnique({
      where: { email: dto.email },
    });
    if (emailExists) {
      throw new ConflictException('A tenant with this email already exists');
    }

    const tenant = await this.prisma.tenant.create({ data: dto });

    // Log as a system-level activity (no complaint)
    await this.prisma.activity.create({
      data: {
        tenantId: tenant.id,
        actorId,
        actorName,
        action: ActivityAction.TENANT_CREATED,
        metadata: { tenantName: tenant.name },
      },
    });

    return buildResponse('Tenant created successfully', tenant);
  }

  // ─────────────────────────────────────────────────────────
  // FIND ALL (paginated)
  // ─────────────────────────────────────────────────────────

  async findAll(query: PaginationQueryDto) {
    const { skip, take } = buildPaginationParams(query);

    const [tenants, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { users: true, complaints: true } } },
      }),
      this.prisma.tenant.count(),
    ]);

    return buildResponse('Tenants fetched', paginate(tenants, total, query));
  }

  // ─────────────────────────────────────────────────────────
  // FIND ONE
  // ─────────────────────────────────────────────────────────

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { _count: { select: { users: true, complaints: true } } },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return buildResponse('Tenant fetched', tenant);
  }

  // ─────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateTenantDto, actorId: string, actorName: string) {
    await this.assertExists(id);

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: dto,
    });

    await this.prisma.activity.create({
      data: {
        tenantId: id,
        actorId,
        actorName,
        action: ActivityAction.TENANT_UPDATED,
        metadata: { updatedFields: Object.keys(dto) },
      },
    });

    return buildResponse('Tenant updated successfully', tenant);
  }

  // ─────────────────────────────────────────────────────────
  // PRIVATE
  // ─────────────────────────────────────────────────────────

  private async assertExists(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }
}
