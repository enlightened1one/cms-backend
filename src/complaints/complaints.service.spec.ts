import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ComplaintStatus, ComplaintPriority, ComplaintCategory, Role } from '@prisma/client';
import { ComplaintsService } from './complaints.service';
import { PrismaService } from '../prisma/prisma.service';

const mockActor = {
  id: 'actor-1',
  email: 'agent@test.com',
  role: Role.AGENT,
  tenantId: 'tenant-1',
  firstName: 'Test',
  lastName: 'Agent',
};

const mockComplaint = {
  id: 'complaint-1',
  complaintRef: 'CCMS-2025-12345',
  tenantId: 'tenant-1',
  orderRef: 'ORD-9921',
  customerName: 'Chioma Obi',
  customerEmail: 'chioma@gmail.com',
  category: ComplaintCategory.WRONG_ITEM_DELIVERED,
  description: 'Wrong item received',
  photos: [],
  status: ComplaintStatus.OPEN,
  priority: ComplaintPriority.MEDIUM,
  assignedToId: null,
  createdById: 'actor-1',
  secureToken: 'abc123token',
  resolutionNote: null,
  resolvedAt: null,
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  complaint: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  user: { findFirst: jest.fn() },
  activity: { create: jest.fn() },
  $transaction: jest.fn(),
};

describe('ComplaintsService', () => {
  let service: ComplaintsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComplaintsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ComplaintsService>(ComplaintsService);
    jest.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────

  describe('create', () => {
    it('creates complaint and returns it with tracking token', async () => {
      mockPrisma.complaint.create.mockResolvedValue(mockComplaint);
      mockPrisma.activity.create.mockResolvedValue({});

      const result = await service.create(
        'tenant-1',
        {
          orderRef: 'ORD-9921',
          customerName: 'Chioma Obi',
          customerEmail: 'chioma@gmail.com',
          category: ComplaintCategory.WRONG_ITEM_DELIVERED,
          description: 'Wrong item received',
        },
        mockActor,
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.complaint.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.activity.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── updateStatus ──────────────────────────────────────────

  describe('updateStatus', () => {
    it('throws BadRequestException for invalid status transition', async () => {
      // OPEN cannot go directly to CLOSED
      mockPrisma.complaint.findFirst.mockResolvedValue({
        ...mockComplaint,
        status: ComplaintStatus.OPEN,
      });

      await expect(
        service.updateStatus(
          'tenant-1',
          'complaint-1',
          { status: ComplaintStatus.CLOSED },
          mockActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when resolutionNote is missing on RESOLVED', async () => {
      mockPrisma.complaint.findFirst.mockResolvedValue({
        ...mockComplaint,
        status: ComplaintStatus.IN_PROGRESS,
      });

      await expect(
        service.updateStatus(
          'tenant-1',
          'complaint-1',
          { status: ComplaintStatus.RESOLVED },
          mockActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows valid transition OPEN → ASSIGNED', async () => {
      mockPrisma.complaint.findFirst.mockResolvedValue({
        ...mockComplaint,
        status: ComplaintStatus.OPEN,
      });
      mockPrisma.complaint.update.mockResolvedValue({
        ...mockComplaint,
        status: ComplaintStatus.ASSIGNED,
      });
      mockPrisma.activity.create.mockResolvedValue({});

      const result = await service.updateStatus(
        'tenant-1',
        'complaint-1',
        { status: ComplaintStatus.ASSIGNED },
        mockActor,
      );

      expect(result.success).toBe(true);
    });

    it('throws NotFoundException for unknown complaint', async () => {
      mockPrisma.complaint.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStatus(
          'tenant-1',
          'nonexistent',
          { status: ComplaintStatus.ASSIGNED },
          mockActor,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── assign ────────────────────────────────────────────────

  describe('assign', () => {
    it('throws NotFoundException when agent not in tenant', async () => {
      mockPrisma.complaint.findFirst.mockResolvedValue(mockComplaint);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.assign(
          'tenant-1',
          'complaint-1',
          { agentId: 'bad-agent' },
          {
            ...mockActor,
            role: Role.TENANT_ADMIN,
          },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
