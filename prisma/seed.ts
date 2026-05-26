import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CCMS database...');

  // ── 1. Create default tenant ──────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'ccms-platform' },
    update: {},
    create: {
      name: 'CCMS Platform',
      slug: 'ccms-platform',
      email: 'admin@ccms.app',
      isActive: true,
    },
  });

  console.log(`✅ Tenant created: ${tenant.name} (${tenant.id})`);

  // ── 2. Create super admin user ────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@1234', 12);

  const superAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'superadmin@ccms.app' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'superadmin@ccms.app',
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Super admin created: ${superAdmin.email}`);

  // ── 3. Create sample tenant for demo ──────────────────────
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'fast-logistics' },
    update: {},
    create: {
      name: 'Fast Logistics Ltd',
      slug: 'fast-logistics',
      email: 'admin@fastlogistics.com',
      phone: '+2348012345678',
      isActive: true,
    },
  });

  console.log(`✅ Demo tenant created: ${demoTenant.name}`);

  // ── 4. Create tenant admin for demo ───────────────────────
  const tenantAdminHash = await bcrypt.hash('TenantAdmin@1234', 12);

  const tenantAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'admin@fastlogistics.com' } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: 'admin@fastlogistics.com',
      firstName: 'Emeka',
      lastName: 'Okafor',
      passwordHash: tenantAdminHash,
      role: Role.TENANT_ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Tenant admin created: ${tenantAdmin.email}`);

  console.log('\n🎉 Seed complete!\n');
  console.log('─────────────────────────────────────');
  console.log('Super Admin:   superadmin@ccms.app / Admin@1234');
  console.log('Tenant Admin:  admin@fastlogistics.com / TenantAdmin@1234');
  console.log('─────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
