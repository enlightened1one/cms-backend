import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityAction, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { buildResponse } from '../common/utils/response.util';
import {
  buildPaginationParams,
  paginate,
} from '../common/utils/pagination.util';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────
  // CREATE MESSAGE
  // ─────────────────────────────────────────────────────────

  async create(
    tenantId: string,
    complaintId: string,
    dto: CreateMessageDto,
    actor: AuthenticatedUser,
  ) {
    // Verify complaint belongs to this tenant
    const complaint = await this.prisma.complaint.findFirst({
      where: { id: complaintId, tenantId },
    });
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    // Only admins and tenant admins can post internal notes
    const canPostInternal =
      actor.role === Role.SUPER_ADMIN || actor.role === Role.TENANT_ADMIN || actor.role === Role.AGENT;

    if (dto.isInternal && !canPostInternal) {
      throw new ForbiddenException('Only agents and admins can post internal notes');
    }

    const message = await this.prisma.message.create({
      data: {
        complaintId,
        senderId: actor.id,
        senderName: `${actor.firstName} ${actor.lastName}`,
        senderEmail: actor.email,
        content: dto.content,
        isInternal: dto.isInternal ?? false,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        tenantId,
        complaintId,
        actorId: actor.id,
        actorName: `${actor.firstName} ${actor.lastName}`,
        action: dto.isInternal
          ? ActivityAction.INTERNAL_NOTE_ADDED
          : ActivityAction.MESSAGE_SENT,
        metadata: {
          messageId: message.id,
          isInternal: message.isInternal,
          preview: dto.content.slice(0, 80),
        },
      },
    });

    return buildResponse('Message sent', message);
  }

  // ─────────────────────────────────────────────────────────
  // FIND ALL MESSAGES FOR A COMPLAINT
  // ─────────────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    complaintId: string,
    query: QueryMessagesDto,
    actor: AuthenticatedUser,
  ) {
    // Verify complaint belongs to this tenant
    const complaint = await this.prisma.complaint.findFirst({
      where: { id: complaintId, tenantId },
    });
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    const { skip, take } = buildPaginationParams(query);

    // Vendors and non-admin roles cannot see internal notes unless explicitly allowed
    const canSeeInternal =
      actor.role === Role.SUPER_ADMIN ||
      actor.role === Role.TENANT_ADMIN ||
      actor.role === Role.AGENT;

    const showInternal = canSeeInternal && (query.includeInternal ?? true);

    const where: Prisma.MessageWhereInput = {
      complaintId,
      // Filter out internal notes for those who shouldn't see them
      ...(!showInternal && { isInternal: false }),
    };

    const [messages, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' }, // Chronological order for chat UX
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return buildResponse('Messages fetched', paginate(messages, total, query));
  }
}
