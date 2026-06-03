import {
  PrismaClient,
  Role,
  ComplaintCategory,
  ComplaintStatus,
  ComplaintPriority,
  ActivityAction,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────
function generateRef(index: number) {
  return `CCMS-2025-${String(index).padStart(5, '0')}`;
}

function generateToken() {
  return randomBytes(32).toString('hex');
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding CCMS database...');

  // ── 1. Platform tenant ────────────────────────────────────
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
  console.log(`✅ Tenant: ${tenant.name}`);

  // ── 2. Super admin ────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'superadmin@ccms.app' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'superadmin@ccms.app',
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash: await bcrypt.hash('Admin@1234', 12),
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Super admin: ${superAdmin.email}`);

  // ── 3. Demo tenant ────────────────────────────────────────
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
  console.log(`✅ Demo tenant: ${demoTenant.name}`);

  // ── 4. Tenant admin ───────────────────────────────────────
  const tenantAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'admin@fastlogistics.com' } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: 'admin@fastlogistics.com',
      firstName: 'Emeka',
      lastName: 'Okafor',
      passwordHash: await bcrypt.hash('TenantAdmin@1234', 12),
      role: Role.TENANT_ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Tenant admin: ${tenantAdmin.email}`);

  // ── 5. Agent ──────────────────────────────────────────────
  const agent = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'agent@fastlogistics.com' } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: 'agent@fastlogistics.com',
      firstName: 'Kelechi',
      lastName: 'Eze',
      passwordHash: await bcrypt.hash('Agent@1234', 12),
      role: Role.AGENT,
      isActive: true,
    },
  });
  console.log(`✅ Agent: ${agent.email}`);

  // ── 6. Vendor ─────────────────────────────────────────────
  const vendor = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'vendor@supplierco.com' } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: 'vendor@supplierco.com',
      firstName: 'Bola',
      lastName: 'Tinubu',
      passwordHash: await bcrypt.hash('Vendor@1234', 12),
      role: Role.VENDOR,
      isActive: true,
    },
  });
  console.log(`✅ Vendor: ${vendor.email}`);

  // ── 7. Complaints ─────────────────────────────────────────
  //
  // We create one complaint per status so every screen in your
  // dashboard has data to render.  assignedToId is null on OPEN
  // complaints because no agent has been assigned yet.
  //
  const complaintSeeds = [
    {
      // Newly submitted — nobody assigned yet
      complaintRef: generateRef(1),
      orderRef: 'ORD-9921',
      customerName: 'Chidi Nwosu',
      customerEmail: 'chidi.nwosu@example.com',
      customerPhone: '+2348031112233',
      category: ComplaintCategory.WRONG_ITEM_DELIVERED,
      description:
        'I ordered a blue shirt size L but received a red shirt size M. Very disappointing.',
      photos: [],
      status: ComplaintStatus.OPEN,
      priority: ComplaintPriority.HIGH,
      assignedToId: null,
      createdById: null, // customer-submitted via public form
    },
    {
      // Assigned but agent has not started yet
      complaintRef: generateRef(2),
      orderRef: 'ORD-4432',
      customerName: 'Amara Obi',
      customerEmail: 'amara.obi@example.com',
      customerPhone: '+2347055667788',
      category: ComplaintCategory.ITEM_DAMAGED,
      description:
        'The television I received has a cracked screen. The packaging also looked tampered with.',
      photos: [],
      status: ComplaintStatus.ASSIGNED,
      priority: ComplaintPriority.CRITICAL,
      assignedToId: agent.id,
      createdById: null,
    },
    {
      // Agent actively working on it
      complaintRef: generateRef(3),
      orderRef: 'ORD-7710',
      customerName: 'Fatima Bello',
      customerEmail: 'fatima.bello@example.com',
      customerPhone: null,
      category: ComplaintCategory.MISSING_ITEM,
      description: 'My order had 3 items but only 2 were delivered. The blender is missing.',
      photos: [],
      status: ComplaintStatus.IN_PROGRESS,
      priority: ComplaintPriority.MEDIUM,
      assignedToId: agent.id,
      createdById: tenantAdmin.id,
    },
    {
      // Escalated to vendor — waiting on supplier
      complaintRef: generateRef(4),
      orderRef: 'ORD-3305',
      customerName: 'Tunde Adeyemi',
      customerEmail: 'tunde.adeyemi@example.com',
      customerPhone: '+2348099887766',
      category: ComplaintCategory.DIFFERENT_COLOR_OR_SIZE,
      description: 'Ordered black sneakers size 42, received white sneakers size 41.',
      photos: [],
      status: ComplaintStatus.PENDING_VENDOR,
      priority: ComplaintPriority.MEDIUM,
      assignedToId: agent.id,
      createdById: tenantAdmin.id,
    },
    {
      // Agent resolved — awaiting customer confirmation
      complaintRef: generateRef(5),
      orderRef: 'ORD-8821',
      customerName: 'Ngozi Eze',
      customerEmail: 'ngozi.eze@example.com',
      customerPhone: '+2348020304050',
      category: ComplaintCategory.OTHER,
      description:
        'Driver was rude during delivery and demanded extra payment before dropping the package.',
      photos: [],
      status: ComplaintStatus.RESOLVED,
      priority: ComplaintPriority.HIGH,
      assignedToId: agent.id,
      createdById: tenantAdmin.id,
      resolutionNote:
        'Complaint escalated to dispatch team. Driver reprimanded. Delivery fee refunded.',
      resolvedAt: new Date('2025-05-28T14:00:00Z'),
    },
    {
      // Fully closed — customer confirmed
      complaintRef: generateRef(6),
      orderRef: 'ORD-1102',
      customerName: 'Ifeanyi Okeke',
      customerEmail: 'ifeanyi.okeke@example.com',
      customerPhone: '+2348077665544',
      category: ComplaintCategory.WRONG_ITEM_DELIVERED,
      description: 'Received a bag of rice instead of the washing machine I ordered.',
      photos: [],
      status: ComplaintStatus.CLOSED,
      priority: ComplaintPriority.CRITICAL,
      assignedToId: agent.id,
      createdById: tenantAdmin.id,
      resolutionNote: 'Washing machine replacement delivered on 2025-05-22.',
      resolvedAt: new Date('2025-05-20T09:00:00Z'),
      closedAt: new Date('2025-05-22T11:00:00Z'),
    },
    {
      // Customer rejected resolution — complaint reopened
      complaintRef: generateRef(7),
      orderRef: 'ORD-5599',
      customerName: 'Aisha Mohammed',
      customerEmail: 'aisha.mohammed@example.com',
      customerPhone: '+2348011223344',
      category: ComplaintCategory.ITEM_DAMAGED,
      description:
        'Phone arrived with a shattered back glass. The replacement sent was also scratched.',
      photos: [],
      status: ComplaintStatus.REOPENED,
      priority: ComplaintPriority.HIGH,
      assignedToId: agent.id,
      createdById: tenantAdmin.id,
      resolutionNote: 'First replacement dispatched — customer rejected due to scratches.',
      resolvedAt: new Date('2025-05-25T10:00:00Z'),
    },
  ];

  const complaints: any[] = [];

  for (const seed of complaintSeeds) {
    const complaint = await prisma.complaint.create({
      data: {
        ...seed,
        tenantId: demoTenant.id,
        secureToken: generateToken(),
      },
    });
    complaints.push(complaint);
    console.log(`✅ Complaint: ${complaint.complaintRef} [${complaint.status}]`);
  }

  // ── 8. Messages ───────────────────────────────────────────
  //
  // Threads on the IN_PROGRESS and PENDING_VENDOR complaints
  // so the message UI has realistic data.  isInternal: true
  // messages are only visible to agents/admins.
  //
  await prisma.message.createMany({
    data: [
      // ── Complaint 3 — IN_PROGRESS ─────────────────────────
      {
        complaintId: complaints[2].id,
        senderId: null,                          // customer (guest)
        senderName: 'Fatima Bello',
        senderEmail: 'fatima.bello@example.com',
        content: 'I have been waiting 5 days. Where is my blender?',
        isInternal: false,
      },
      {
        complaintId: complaints[2].id,
        senderId: agent.id,
        senderName: 'Kelechi Eze',
        content:
          'Hi Fatima, we have raised this with our warehouse. You will receive an update within 24 hours.',
        isInternal: false,
      },
      {
        complaintId: complaints[2].id,
        senderId: agent.id,
        senderName: 'Kelechi Eze',
        content:
          'Internal note: Warehouse confirmed blender was left behind during packing. Scheduling re-delivery for tomorrow.',
        isInternal: true,               // hidden from customer
      },

      // ── Complaint 4 — PENDING_VENDOR ─────────────────────
      {
        complaintId: complaints[3].id,
        senderId: null,
        senderName: 'Tunde Adeyemi',
        senderEmail: 'tunde.adeyemi@example.com',
        content: 'This is the second time this has happened with your service.',
        isInternal: false,
      },
      {
        complaintId: complaints[3].id,
        senderId: agent.id,
        senderName: 'Kelechi Eze',
        content:
          'We sincerely apologise, Tunde. We have escalated this to the supplier and are awaiting their response.',
        isInternal: false,
      },
      {
        complaintId: complaints[3].id,
        senderId: agent.id,
        senderName: 'Kelechi Eze',
        content: 'Internal note: Vendor contacted via email on 2025-06-01. Awaiting stock confirmation.',
        isInternal: true,
      },

      // ── Complaint 7 — REOPENED ────────────────────────────
      {
        complaintId: complaints[6].id,
        senderId: null,
        senderName: 'Aisha Mohammed',
        senderEmail: 'aisha.mohammed@example.com',
        content:
          'The replacement phone you sent is also scratched. I am not accepting this. Please send a brand new one.',
        isInternal: false,
      },
      {
        complaintId: complaints[6].id,
        senderId: agent.id,
        senderName: 'Kelechi Eze',
        content:
          'We are very sorry, Aisha. We have escalated this to our quality control team and will send a verified new unit.',
        isInternal: false,
      },
    ],
  });
  console.log('✅ Messages seeded');

  // ── 9. Activities (audit trail) ───────────────────────────
  //
  // Each activity represents one event in the complaint lifecycle.
  // metadata stores before/after state for STATUS_CHANGED events.
  //
  await prisma.activity.createMany({
    data: [
      // Complaint 1 — OPEN (customer submitted, no agent yet)
      {
        tenantId: demoTenant.id,
        complaintId: complaints[0].id,
        actorId: null,
        actorName: 'Customer',
        action: ActivityAction.COMPLAINT_CREATED,
        metadata: { ref: complaints[0].complaintRef },
      },

      // Complaint 2 — ASSIGNED
      {
        tenantId: demoTenant.id,
        complaintId: complaints[1].id,
        actorId: null,
        actorName: 'Customer',
        action: ActivityAction.COMPLAINT_CREATED,
        metadata: { ref: complaints[1].complaintRef },
      },
      {
        tenantId: demoTenant.id,
        complaintId: complaints[1].id,
        actorId: tenantAdmin.id,
        actorName: 'Emeka Okafor',
        action: ActivityAction.COMPLAINT_ASSIGNED,
        metadata: { assignedTo: 'Kelechi Eze' },
      },

      // Complaint 3 — IN_PROGRESS
      {
        tenantId: demoTenant.id,
        complaintId: complaints[2].id,
        actorId: null,
        actorName: 'Customer',
        action: ActivityAction.COMPLAINT_CREATED,
        metadata: { ref: complaints[2].complaintRef },
      },
      {
        tenantId: demoTenant.id,
        complaintId: complaints[2].id,
        actorId: tenantAdmin.id,
        actorName: 'Emeka Okafor',
        action: ActivityAction.COMPLAINT_ASSIGNED,
        metadata: { assignedTo: 'Kelechi Eze' },
      },
      {
        tenantId: demoTenant.id,
        complaintId: complaints[2].id,
        actorId: agent.id,
        actorName: 'Kelechi Eze',
        action: ActivityAction.STATUS_CHANGED,
        metadata: { from: 'ASSIGNED', to: 'IN_PROGRESS' },
      },

      // Complaint 4 — PENDING_VENDOR
      {
        tenantId: demoTenant.id,
        complaintId: complaints[3].id,
        actorId: null,
        actorName: 'Customer',
        action: ActivityAction.COMPLAINT_CREATED,
        metadata: { ref: complaints[3].complaintRef },
      },
      {
        tenantId: demoTenant.id,
        complaintId: complaints[3].id,
        actorId: tenantAdmin.id,
        actorName: 'Emeka Okafor',
        action: ActivityAction.COMPLAINT_ASSIGNED,
        metadata: { assignedTo: 'Kelechi Eze' },
      },
      {
        tenantId: demoTenant.id,
        complaintId: complaints[3].id,
        actorId: agent.id,
        actorName: 'Kelechi Eze',
        action: ActivityAction.STATUS_CHANGED,
        metadata: { from: 'IN_PROGRESS', to: 'PENDING_VENDOR' },
      },

      // Complaint 5 — RESOLVED
      {
        tenantId: demoTenant.id,
        complaintId: complaints[4].id,
        actorId: null,
        actorName: 'Customer',
        action: ActivityAction.COMPLAINT_CREATED,
        metadata: { ref: complaints[4].complaintRef },
      },
      {
        tenantId: demoTenant.id,
        complaintId: complaints[4].id,
        actorId: agent.id,
        actorName: 'Kelechi Eze',
        action: ActivityAction.COMPLAINT_RESOLVED,
        metadata: { note: 'Driver reprimanded. Delivery fee refunded.' },
      },

      // Complaint 6 — CLOSED
      {
        tenantId: demoTenant.id,
        complaintId: complaints[5].id,
        actorId: null,
        actorName: 'Customer',
        action: ActivityAction.COMPLAINT_CREATED,
        metadata: { ref: complaints[5].complaintRef },
      },
      {
        tenantId: demoTenant.id,
        complaintId: complaints[5].id,
        actorId: agent.id,
        actorName: 'Kelechi Eze',
        action: ActivityAction.COMPLAINT_RESOLVED,
        metadata: { note: 'Replacement delivered.' },
      },
      {
        tenantId: demoTenant.id,
        complaintId: complaints[5].id,
        actorId: null,
        actorName: 'Ifeanyi Okeke',
        action: ActivityAction.COMPLAINT_CLOSED,
        metadata: { confirmedByCustomer: true },
      },

      // Complaint 7 — REOPENED
      {
        tenantId: demoTenant.id,
        complaintId: complaints[6].id,
        actorId: null,
        actorName: 'Customer',
        action: ActivityAction.COMPLAINT_CREATED,
        metadata: { ref: complaints[6].complaintRef },
      },
      {
        tenantId: demoTenant.id,
        complaintId: complaints[6].id,
        actorId: agent.id,
        actorName: 'Kelechi Eze',
        action: ActivityAction.COMPLAINT_RESOLVED,
        metadata: { note: 'First replacement dispatched.' },
      },
      {
        tenantId: demoTenant.id,
        complaintId: complaints[6].id,
        actorId: null,
        actorName: 'Aisha Mohammed',
        action: ActivityAction.COMPLAINT_REOPENED,
        metadata: { reason: 'Replacement also damaged — scratched back glass.' },
      },
    ],
  });
  console.log('✅ Activities seeded');

  // ── Summary ───────────────────────────────────────────────
  console.log('\n🎉 Seed complete!\n');
  console.log('────────────────────────────────────────────────────');
  console.log('Super Admin:   superadmin@ccms.app        / Admin@1234');
  console.log('Tenant Admin:  admin@fastlogistics.com    / TenantAdmin@1234');
  console.log('Agent:         agent@fastlogistics.com    / Agent@1234');
  console.log('Vendor:        vendor@supplierco.com      / Vendor@1234');
  console.log('────────────────────────────────────────────────────');
  console.log('Complaints seeded: 7 (one per status)');
  console.log('  OPEN · ASSIGNED · IN_PROGRESS · PENDING_VENDOR');
  console.log('  RESOLVED · CLOSED · REOPENED');
  console.log('────────────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });