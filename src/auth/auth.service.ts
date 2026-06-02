import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { hashPassword, comparePassword } from '../common/utils/hash.util';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { buildResponse } from '../common/utils/response.util';
import { ActivityAction, Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    // Verify the tenant exists and is active
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Tenant not found or inactive');
    }

    // Email uniqueness is enforced per tenant
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: dto.tenantId, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists in this organisation');
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        tenantId: dto.tenantId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        passwordHash,
        role: dto.role,
      },
      select: this.safeUserSelect(),
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        tenantId: dto.tenantId,
        actorId: user.id,
        actorName: `${user.firstName} ${user.lastName}`,
        action: ActivityAction.USER_CREATED,
        metadata: { email: user.email, role: user.role },
      },
    });

    const token = this.generateToken(user as any);

    return buildResponse('Registration successful', { user, token });
  }

  // ─────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    // Find user by email across all tenants (email + password login)
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const safeUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: this.safeUserSelect(),
    });

    const token = this.generateToken(user as any);

    return buildResponse('Login successful', { user: safeUser, token });
  }

  // ─────────────────────────────────────────────────────────
  // ME — return current user profile
  // ─────────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...this.safeUserSelect(),
        tenant: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return buildResponse('Profile fetched', user);
  }

  // ─────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────

  private generateToken(user: { id: string; email: string; role: Role; tenantId: string }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    return this.jwtService.sign(payload);
  }

  private safeUserSelect() {
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
