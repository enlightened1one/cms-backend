import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as hashUtil from '../common/utils/hash.util';

const mockPrisma = {
  tenant: { findUnique: jest.fn() },
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  activity: { create: jest.fn() },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock.jwt.token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── register ──────────────────────────────────────────────

  describe('register', () => {
    const dto = {
      tenantId: 'tenant-1',
      email: 'agent@test.com',
      firstName: 'Test',
      lastName: 'Agent',
      password: 'Secure@1234',
      role: 'AGENT' as any,
    };

    it('throws NotFoundException when tenant does not exist', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.register(dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', isActive: true });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('creates user and returns token on success', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', isActive: true });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null); // email check
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        tenantId: dto.tenantId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.activity.create.mockResolvedValue({});

      const result = await service.register(dto);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('token');
      expect(result.data).toHaveProperty('user');
    });
  });

  // ── login ─────────────────────────────────────────────────

  describe('login', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.login({ email: 'nobody@test.com', password: 'any' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'hashed',
        isActive: true,
      });
      jest.spyOn(hashUtil, 'comparePassword').mockResolvedValue(false);
      await expect(service.login({ email: 'agent@test.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
