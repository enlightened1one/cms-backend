import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityAction, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { hashPassword } from '../common/utils/hash.util';
import { buildResponse } from '../common/utils/response.util';
import {
  buildPaginationParams,
  paginate,
} from '../common/utils/pagination.util';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────

  async create(
    tenantId: string,
    dto: CreateUserDto,
    actor: AuthenticatedUser,
  ) {
    // Prevent non-super-admins from creating SUPER_ADMIN accounts
    if (dto.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can create another SUPER_ADMIN');
    }

    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists in this organisation');
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        passwordHash,
        role: dto.role,
      },
      select: this.safeSelect(),
    });

    await this.prisma.activity.create({
      data: {
        tenantId,
        actorId: actor.id,
        actorName: `${actor.firstName} ${actor.lastName}`,
        action: ActivityAction.USER_CREATED,
        metadata: { userId: user.id, email: user.email, role: user.role },
      },
    });

    return buildResponse('User created successfully', user);
  }

  // ─────────────────────────────────────────────────────────
  // FIND ALL (scoped to tenant)
  // ─────────────────────────────────────────────────────────

  async findAll(tenantId: string, query: QueryUsersDto) {
    const { skip, take } = buildPaginationParams(query);

    const where: Prisma.UserWhereInput = {
      tenantId,
      ...(query.role && { role: query.role }),
      ...(query.isActive !== undefined && {
        isActive: query.isActive === 'true',
      }),
      ...(query.search && {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        select: this.safeSelect(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildResponse('Users fetched', paginate(users, total, query));
  }

  // ─────────────────────────────────────────────────────────
  // FIND ONE
  // ─────────────────────────────────────────────────────────

  async findOne(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        ...this.safeSelect(),
        _count: {
          select: { assignedComplaints: true, messages: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return buildResponse('User fetched', user);
  }

  // ─────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────

  async update(
    tenantId: string,
    userId: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
  ) {
    await this.assertExists(tenantId, userId);

    // Prevent role escalation to SUPER_ADMIN by non-super-admins
    if (dto.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can assign SUPER_ADMIN role');
    }

    const updateData: Prisma.UserUpdateInput = {
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName && { lastName: dto.lastName }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.role && { role: dto.role }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    if (dto.password) {
      updateData.passwordHash = await hashPassword(dto.password);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: this.safeSelect(),
    });

    const action = dto.isActive === false
      ? ActivityAction.USER_DEACTIVATED
      : ActivityAction.USER_UPDATED;

    await this.prisma.activity.create({
      data: {
        tenantId,
        actorId: actor.id,
        actorName: `${actor.firstName} ${actor.lastName}`,
        action,
        metadata: { targetUserId: userId, updatedFields: Object.keys(dto) },
      },
    });

    return buildResponse('User updated successfully', user);
  }

  // ─────────────────────────────────────────────────────────
  // PRIVATE
  // ─────────────────────────────────────────────────────────

  private async assertExists(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private safeSelect(): Prisma.UserSelect {
    return {
      id: true,
      tenantId: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}
