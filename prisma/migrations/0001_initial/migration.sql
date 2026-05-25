-- ─────────────────────────────────────────────────────────────
-- CCMS Initial Migration
-- Creates all tables for the multi-tenant complaint management system
-- ─────────────────────────────────────────────────────────────

-- CreateEnum: Role
CREATE TYPE "Role" AS ENUM (
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'AGENT',
  'VENDOR'
);

-- CreateEnum: ComplaintCategory
CREATE TYPE "ComplaintCategory" AS ENUM (
  'WRONG_ITEM_DELIVERED',
  'ITEM_DAMAGED',
  'DIFFERENT_COLOR_OR_SIZE',
  'MISSING_ITEM',
  'OTHER'
);

-- CreateEnum: ComplaintStatus
CREATE TYPE "ComplaintStatus" AS ENUM (
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'PENDING_VENDOR',
  'RESOLVED',
  'CLOSED',
  'REOPENED'
);

-- CreateEnum: ComplaintPriority
CREATE TYPE "ComplaintPriority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

-- CreateEnum: ActivityAction
CREATE TYPE "ActivityAction" AS ENUM (
  'COMPLAINT_CREATED',
  'COMPLAINT_ASSIGNED',
  'COMPLAINT_UNASSIGNED',
  'STATUS_CHANGED',
  'PRIORITY_CHANGED',
  'MESSAGE_SENT',
  'INTERNAL_NOTE_ADDED',
  'COMPLAINT_RESOLVED',
  'COMPLAINT_CLOSED',
  'COMPLAINT_REOPENED',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DEACTIVATED',
  'TENANT_CREATED',
  'TENANT_UPDATED'
);

-- CreateTable: tenants
CREATE TABLE "tenants" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "slug"      TEXT NOT NULL,
  "email"     TEXT NOT NULL,
  "phone"     TEXT,
  "logoUrl"   TEXT,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key"  ON "tenants"("slug");
CREATE UNIQUE INDEX "tenants_email_key" ON "tenants"("email");

-- CreateTable: users
CREATE TABLE "users" (
  "id"           TEXT NOT NULL,
  "tenantId"     TEXT NOT NULL,
  "email"        TEXT NOT NULL,
  "firstName"    TEXT NOT NULL,
  "lastName"     TEXT NOT NULL,
  "phone"        TEXT,
  "passwordHash" TEXT NOT NULL,
  "role"         "Role" NOT NULL DEFAULT 'AGENT',
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt"  TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");
CREATE INDEX "users_role_idx"     ON "users"("role");

-- CreateTable: complaints
CREATE TABLE "complaints" (
  "id"             TEXT NOT NULL,
  "complaintRef"   TEXT NOT NULL,
  "tenantId"       TEXT NOT NULL,
  "orderRef"       TEXT NOT NULL,
  "customerName"   TEXT NOT NULL,
  "customerEmail"  TEXT NOT NULL,
  "customerPhone"  TEXT,
  "category"       "ComplaintCategory" NOT NULL,
  "description"    TEXT NOT NULL,
  "photos"         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status"         "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
  "priority"       "ComplaintPriority" NOT NULL DEFAULT 'MEDIUM',
  "assignedToId"   TEXT,
  "createdById"    TEXT,
  "secureToken"    TEXT NOT NULL,
  "resolutionNote" TEXT,
  "resolvedAt"     TIMESTAMP(3),
  "closedAt"       TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "complaints_complaintRef_key" ON "complaints"("complaintRef");
CREATE UNIQUE INDEX "complaints_secureToken_key"  ON "complaints"("secureToken");
CREATE INDEX "complaints_tenantId_idx"            ON "complaints"("tenantId");
CREATE INDEX "complaints_tenantId_status_idx"     ON "complaints"("tenantId", "status");
CREATE INDEX "complaints_tenantId_assignedToId_idx" ON "complaints"("tenantId", "assignedToId");
CREATE INDEX "complaints_orderRef_idx"            ON "complaints"("orderRef");
CREATE INDEX "complaints_secureToken_idx"         ON "complaints"("secureToken");

-- CreateTable: messages
CREATE TABLE "messages" (
  "id"          TEXT NOT NULL,
  "complaintId" TEXT NOT NULL,
  "senderId"    TEXT,
  "senderName"  TEXT NOT NULL,
  "senderEmail" TEXT,
  "content"     TEXT NOT NULL,
  "isInternal"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "messages_complaintId_idx" ON "messages"("complaintId");

-- CreateTable: activities
CREATE TABLE "activities" (
  "id"          TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "complaintId" TEXT,
  "actorId"     TEXT,
  "actorName"   TEXT NOT NULL,
  "action"      "ActivityAction" NOT NULL,
  "metadata"    JSONB,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activities_tenantId_idx"    ON "activities"("tenantId");
CREATE INDEX "activities_complaintId_idx" ON "activities"("complaintId");
CREATE INDEX "activities_actorId_idx"     ON "activities"("actorId");

-- AddForeignKey: users → tenants
ALTER TABLE "users"
  ADD CONSTRAINT "users_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: complaints → tenants
ALTER TABLE "complaints"
  ADD CONSTRAINT "complaints_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: complaints.assignedToId → users
ALTER TABLE "complaints"
  ADD CONSTRAINT "complaints_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: complaints.createdById → users
ALTER TABLE "complaints"
  ADD CONSTRAINT "complaints_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: messages → complaints
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_complaintId_fkey"
  FOREIGN KEY ("complaintId") REFERENCES "complaints"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: messages.senderId → users
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: activities → tenants
ALTER TABLE "activities"
  ADD CONSTRAINT "activities_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: activities.complaintId → complaints
ALTER TABLE "activities"
  ADD CONSTRAINT "activities_complaintId_fkey"
  FOREIGN KEY ("complaintId") REFERENCES "complaints"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: activities.actorId → users
ALTER TABLE "activities"
  ADD CONSTRAINT "activities_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
