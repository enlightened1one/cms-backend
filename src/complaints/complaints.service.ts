import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityAction, ComplaintStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignComplaintDto } from './dto/assign-complaint.dto';
import { QueryComplaintsDto } from './dto/query-complaints.dto';
import { generateComplaintRef, generateSecureToken } from '../common/utils/token.util';
import { buildResponse } from '../common/utils/response.util';
import { buildPaginationParams, paginate } from '../common/utils/pagination.util';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';

/** Valid status transitions enforced by the service layer */
const STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  [ComplaintStatus.OPEN]: [ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS],
  [ComplaintStatus.ASSIGNED]: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.PENDING_VENDOR],
  [ComplaintStatus.IN_PROGRESS]: [
    ComplaintStatus.PENDING_VENDOR,
    ComplaintStatus.RESOLVED,
    ComplaintStatus.CLOSED,
  ],
  [ComplaintStatus.PENDING_VENDOR]: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED],
  [ComplaintStatus.RESOLVED]: [ComplaintStatus.CLOSED, ComplaintStatus.REOPENED],
  [ComplaintStatus.CLOSED]: [],
  [ComplaintStatus.REOPENED]: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.ASSIGNED],
};

@Injectable()
export class ComplaintsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateComplaintDto, actor: AuthenticatedUser) {
    const complaintRef = generateComplaintRef();
    const secureToken = generateSecureToken();

    const complaint = await this.prisma.complaint.create({
      data: {
        tenantId,
        complaintRef,
        secureToken,
        orderRef: dto.orderRef,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        category: dto.category,
        description: dto.description,
        photos: dto.photos || [],
        priority: dto.priority,
        createdById: actor.id,
      },
      include: this.defaultInclude(),
    });

    await this.prisma.activity.create({
      data: {
        tenantId,
        complaintId: complaint.id,
        actorId: actor.id,
        actorName: `${actor.firstName} ${actor.lastName}`,
        action: ActivityAction.COMPLAINT_CREATED,
        metadata: {
          complaintRef: complaint.complaintRef,
          category: complaint.category,
          orderRef: complaint.orderRef,
          customerName: complaint.customerName,
        },
      },
    });

    return buildResponse('Complaint created successfully', complaint);
  }

  // ─────────────────────────────────────────────────────────
  // FIND ALL (tenant-scoped + filters)
  // ─────────────────────────────────────────────────────────

  async findAll(tenantId: string, query: QueryComplaintsDto) {
    const { skip, take } = buildPaginationParams(query);

    const allowedSortFields = ['createdAt', 'updatedAt', 'priority', 'status'];
    const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.ComplaintWhereInput = {
      tenantId,
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
      ...(query.priority && { priority: query.priority }),
      ...(query.assignedToId && { assignedToId: query.assignedToId }),
      ...(query.orderRef && {
        orderRef: { contains: query.orderRef, mode: 'insensitive' },
      }),
      ...(query.search && {
        OR: [
          { complaintRef: { contains: query.search, mode: 'insensitive' } },
          { orderRef: { contains: query.search, mode: 'insensitive' } },
          { customerName: { contains: query.search, mode: 'insensitive' } },
          { customerEmail: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [complaints, total] = await this.prisma.$transaction([
      this.prisma.complaint.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: this.defaultInclude(),
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return buildResponse('Complaints fetched', paginate(complaints, total, query));
  }

  // ─────────────────────────────────────────────────────────
  // FIND ONE
  // ─────────────────────────────────────────────────────────

  async findOne(tenantId: string, id: string) {
    const complaint = await this.prisma.complaint.findFirst({
      where: { id, tenantId },
      include: {
        ...this.defaultInclude(),
        _count: { select: { messages: true, activities: true } },
      },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');

    return buildResponse('Complaint fetched', complaint);
  }

  // ─────────────────────────────────────────────────────────
  // UPDATE (general fields)
  // ─────────────────────────────────────────────────────────

  async update(tenantId: string, id: string, dto: UpdateComplaintDto, actor: AuthenticatedUser) {
    const existing = await this.assertExists(tenantId, id);

    // Only assigned agent, tenant admin, or super admin can update
    this.assertCanModify(existing, actor);

    const complaint = await this.prisma.complaint.update({
      where: { id },
      data: {
        ...(dto.category && { category: dto.category }),
        ...(dto.description && { description: dto.description }),
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.photos && { photos: dto.photos }),
      },
      include: this.defaultInclude(),
    });

    if (dto.priority && dto.priority !== existing.priority) {
      await this.prisma.activity.create({
        data: {
          tenantId,
          complaintId: id,
          actorId: actor.id,
          actorName: `${actor.firstName} ${actor.lastName}`,
          action: ActivityAction.PRIORITY_CHANGED,
          metadata: { from: existing.priority, to: dto.priority },
        },
      });
    }

    return buildResponse('Complaint updated', complaint);
  }

  // ─────────────────────────────────────────────────────────
  // UPDATE STATUS — enforces state machine transitions
  // ─────────────────────────────────────────────────────────

  async updateStatus(tenantId: string, id: string, dto: UpdateStatusDto, actor: AuthenticatedUser) {
    const existing = await this.assertExists(tenantId, id);

    // Validate transition is allowed
    const allowedNext = STATUS_TRANSITIONS[existing.status];
    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from "${existing.status}" to "${dto.status}". ` +
          `Allowed transitions: ${allowedNext.length ? allowedNext.join(', ') : 'none (terminal state)'}`,
      );
    }

    // Resolution note is mandatory when resolving
    if (dto.status === ComplaintStatus.RESOLVED && !dto.resolutionNote) {
      throw new BadRequestException(
        'A resolution note is required when marking a complaint as RESOLVED',
      );
    }

    const now = new Date();
    const complaint = await this.prisma.complaint.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.resolutionNote && { resolutionNote: dto.resolutionNote }),
        ...(dto.status === ComplaintStatus.RESOLVED && { resolvedAt: now }),
        ...(dto.status === ComplaintStatus.CLOSED && { closedAt: now }),
        // When reopened, clear the resolved state
        ...(dto.status === ComplaintStatus.REOPENED && {
          resolvedAt: null,
          resolutionNote: null,
        }),
      },
      include: this.defaultInclude(),
    });

    const activityAction =
      dto.status === ComplaintStatus.RESOLVED
        ? ActivityAction.COMPLAINT_RESOLVED
        : dto.status === ComplaintStatus.CLOSED
          ? ActivityAction.COMPLAINT_CLOSED
          : dto.status === ComplaintStatus.REOPENED
            ? ActivityAction.COMPLAINT_REOPENED
            : ActivityAction.STATUS_CHANGED;

    await this.prisma.activity.create({
      data: {
        tenantId,
        complaintId: id,
        actorId: actor.id,
        actorName: `${actor.firstName} ${actor.lastName}`,
        action: activityAction,
        metadata: {
          from: existing.status,
          to: dto.status,
          ...(dto.resolutionNote && { resolutionNote: dto.resolutionNote }),
        },
      },
    });

    return buildResponse('Complaint status updated', complaint);
  }

  // ─────────────────────────────────────────────────────────
  // ASSIGN
  // ─────────────────────────────────────────────────────────

  async assign(tenantId: string, id: string, dto: AssignComplaintDto, actor: AuthenticatedUser) {
    const existing = await this.assertExists(tenantId, id);

    // Verify the agent belongs to the same tenant
    const agent = await this.prisma.user.findFirst({
      where: { id: dto.agentId, tenantId, isActive: true },
    });
    if (!agent) {
      throw new NotFoundException('Agent not found in this organisation');
    }

    const previousAgentId = existing.assignedToId;

    const complaint = await this.prisma.complaint.update({
      where: { id },
      data: {
        assignedToId: dto.agentId,
        // Auto-advance to ASSIGNED if currently OPEN
        ...(existing.status === ComplaintStatus.OPEN && {
          status: ComplaintStatus.ASSIGNED,
        }),
      },
      include: this.defaultInclude(),
    });

    await this.prisma.activity.create({
      data: {
        tenantId,
        complaintId: id,
        actorId: actor.id,
        actorName: `${actor.firstName} ${actor.lastName}`,
        action: ActivityAction.COMPLAINT_ASSIGNED,
        metadata: {
          previousAgentId,
          newAgentId: dto.agentId,
          agentName: `${agent.firstName} ${agent.lastName}`,
        },
      },
    });

    return buildResponse('Complaint assigned successfully', complaint);
  }

  // ─────────────────────────────────────────────────────────
  // GET STATS (dashboard summary)
  // ─────────────────────────────────────────────────────────

  async getStats(tenantId: string) {
    const [total, open, assigned, inProgress, resolved, closed, reopened] = await Promise.all([
      this.prisma.complaint.count({ where: { tenantId } }),
      this.prisma.complaint.count({ where: { tenantId, status: ComplaintStatus.OPEN } }),
      this.prisma.complaint.count({ where: { tenantId, status: ComplaintStatus.ASSIGNED } }),
      this.prisma.complaint.count({ where: { tenantId, status: ComplaintStatus.IN_PROGRESS } }),
      this.prisma.complaint.count({ where: { tenantId, status: ComplaintStatus.RESOLVED } }),
      this.prisma.complaint.count({ where: { tenantId, status: ComplaintStatus.CLOSED } }),
      this.prisma.complaint.count({ where: { tenantId, status: ComplaintStatus.REOPENED } }),
    ]);

    const resolutionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    return buildResponse('Stats fetched', {
      total,
      open,
      assigned,
      inProgress,
      resolved,
      closed,
      reopened,
      resolutionRate,
    });
  }

  // ─────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────

  private async assertExists(tenantId: string, id: string) {
    const complaint = await this.prisma.complaint.findFirst({
      where: { id, tenantId },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    return complaint;
  }

  private assertCanModify(complaint: any, actor: AuthenticatedUser): void {
    if (actor.role === Role.SUPER_ADMIN || actor.role === Role.TENANT_ADMIN) return;

    if (complaint.assignedToId !== actor.id) {
      throw new ForbiddenException(
        'Only the assigned agent, TENANT_ADMIN, or SUPER_ADMIN can modify this complaint',
      );
    }
  }

  private defaultInclude(): Prisma.ComplaintInclude {
    return {
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    };
  }
}
