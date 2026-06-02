import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignComplaintDto } from './dto/assign-complaint.dto';
import { QueryComplaintsDto } from './dto/query-complaints.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { MessagesService } from '../messages/messages.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreateMessageDto } from '../messages/dto/create-message.dto';
import { QueryActivitiesDto } from '../activities/dto/query-activities.dto';
import { QueryMessagesDto } from '../messages/dto/query-messages.dto';

@ApiTags('Complaints')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('complaints')
export class ComplaintsController {
  constructor(
    private readonly complaintsService: ComplaintsService,
    private readonly messagesService: MessagesService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // COMPLAINTS CRUD
  // ─────────────────────────────────────────────────────────

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.AGENT)
  @ApiOperation({
    summary: 'Create a new complaint',
    description:
      'Agent submits a complaint on behalf of a customer. Generates a unique complaint reference and secure tracking token.',
  })
  @ApiResponse({ status: 201, description: 'Complaint created with tracking token' })
  create(
    @Body() dto: CreateComplaintDto,
    @TenantId() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.complaintsService.create(tenantId, dto, actor);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.AGENT, Role.VENDOR)
  @ApiOperation({
    summary: 'List complaints (paginated + filterable)',
    description:
      'Supports filtering by status, category, priority, assignee, and free-text search across ref, order, customer name/email.',
  })
  findAll(@TenantId() tenantId: string, @Query() query: QueryComplaintsDto) {
    return this.complaintsService.findAll(tenantId, query);
  }

  @Get('stats')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Get complaint statistics for the tenant dashboard',
  })
  getStats(@TenantId() tenantId: string) {
    return this.complaintsService.getStats(tenantId);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.AGENT, Role.VENDOR)
  @ApiOperation({ summary: 'Get a single complaint by ID' })
  @ApiParam({ name: 'id', description: 'Complaint CUID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.complaintsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.AGENT)
  @ApiOperation({ summary: 'Update complaint details (category, description, priority, photos)' })
  @ApiParam({ name: 'id', description: 'Complaint CUID' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateComplaintDto,
    @TenantId() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.complaintsService.update(tenantId, id, dto, actor);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.AGENT)
  @ApiOperation({
    summary: 'Transition complaint status',
    description:
      'Enforces a strict state machine. See README for allowed transitions. Resolution note is required when setting status to RESOLVED.',
  })
  @ApiParam({ name: 'id', description: 'Complaint CUID' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @TenantId() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.complaintsService.updateStatus(tenantId, id, dto, actor);
  }

  @Patch(':id/assign')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Assign complaint to an agent',
    description: 'Agent must belong to the same tenant. Auto-advances status from OPEN → ASSIGNED.',
  })
  @ApiParam({ name: 'id', description: 'Complaint CUID' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignComplaintDto,
    @TenantId() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.complaintsService.assign(tenantId, id, dto, actor);
  }

  // ─────────────────────────────────────────────────────────
  // NESTED: MESSAGES
  // ─────────────────────────────────────────────────────────

  @Get(':id/messages')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.AGENT, Role.VENDOR)
  @ApiOperation({
    summary: 'Get all messages for a complaint',
    description:
      'Returns the full message thread. Internal notes are filtered for non-admin roles.',
  })
  @ApiParam({ name: 'id', description: 'Complaint CUID' })
  getMessages(
    @Param('id') complaintId: string,
    @TenantId() tenantId: string,
    @Query() query: QueryMessagesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.messagesService.findAll(tenantId, complaintId, query, actor);
  }

  @Post(':id/messages')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.AGENT, Role.VENDOR)
  @ApiOperation({
    summary: 'Post a message to a complaint thread',
    description:
      'Supports internal notes (hidden from customer) and public messages visible to all parties.',
  })
  @ApiParam({ name: 'id', description: 'Complaint CUID' })
  createMessage(
    @Param('id') complaintId: string,
    @Body() dto: CreateMessageDto,
    @TenantId() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.messagesService.create(tenantId, complaintId, dto, actor);
  }

  // ─────────────────────────────────────────────────────────
  // NESTED: ACTIVITIES
  // ─────────────────────────────────────────────────────────

  @Get(':id/activities')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.AGENT)
  @ApiOperation({
    summary: 'Get the activity timeline for a complaint',
    description:
      'Immutable audit log of every action taken on this complaint, in chronological order.',
  })
  @ApiParam({ name: 'id', description: 'Complaint CUID' })
  getActivities(
    @Param('id') complaintId: string,
    @TenantId() tenantId: string,
    @Query() query: QueryActivitiesDto,
  ) {
    return this.activitiesService.findByComplaint(tenantId, complaintId, query);
  }
}
