import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryActivitiesDto } from './dto/query-activities.dto';
import { buildResponse } from '../common/utils/response.util';
import {
  buildPaginationParams,
  paginate,
} from '../common/utils/pagination.util';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────
  // GET ACTIVITY TIMELINE FOR A COMPLAINT
  // ─────────────────────────────────────────────────────────

  async findByComplaint(
    tenantId: string,
    complaintId: string,
    query: QueryActivitiesDto,
  ) {
    // Verify complaint belongs to tenant
    const complaint = await this.prisma.complaint.findFirst({
      where: { id: complaintId, tenantId },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');

    const { skip, take } = buildPaginationParams(query);

    const where: Prisma.ActivityWhereInput = {
      tenantId,
      complaintId,
      ...(query.action && { action: query.action }),
      ...(query.actorId && { actorId: query.actorId }),
    };

    const [activities, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' }, // Oldest first — timeline view
        include: {
          actor: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return buildResponse(
      'Activity timeline fetched',
      paginate(activities, total, query),
    );
  }

  // ─────────────────────────────────────────────────────────
  // GET ALL TENANT-LEVEL ACTIVITIES (admin audit log)
  // ─────────────────────────────────────────────────────────

  async findByTenant(tenantId: string, query: QueryActivitiesDto) {
    const { skip, take } = buildPaginationParams(query);

    const where: Prisma.ActivityWhereInput = {
      tenantId,
      ...(query.action && { action: query.action }),
      ...(query.actorId && { actorId: query.actorId }),
    };

    const [activities, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
          complaint: {
            select: { id: true, complaintRef: true, orderRef: true },
          },
        },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return buildResponse(
      'Tenant activities fetched',
      paginate(activities, total, query),
    );
  }
}
