# CCMS — Customer Complaint Management System

### Multi-Tenant SaaS Backend · NestJS · PostgreSQL · Prisma · JWT

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [Status Machine](#status-machine)
7. [Role Permissions](#role-permissions)
8. [Quick Start](#quick-start)
9. [Environment Variables](#environment-variables)
10. [API Reference](#api-reference)
11. [Multi-Tenancy](#multi-tenancy)
12. [Security](#security)
13. [Testing](#testing)
14. [Deployment](#deployment)

---



## Overview

CCMS is a production-ready multi-tenant backend for managing customer complaints in logistics companies. Every complaint is scoped to a **tenant** (organisation), assigned to an **agent**, tracked through a strict **status machine**, and logged to an immutable **activity timeline**.

Key principles from the PRD:

- A customer never needs an account — they interact via a **unique secure tracking link** tied to their order
- Every status transition triggers an **email to the customer** (email integration is a future Phase 2 concern — tokens are generated and stored)
- The customer **confirms or rejects** every resolution — nothing closes without their input
- Photo evidence is captured at complaint creation (up to 5 URLs)
- Full **audit trail** on every complaint event

---



## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        main.ts                          │
│   NestJS App · Global Guards · Swagger · ValidationPipe │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   ┌─────────┐   ┌──────────┐   ┌──────────────┐
   │  Auth   │   │  Users   │   │   Tenants    │
   │ Module  │   │  Module  │   │   Module     │
   └─────────┘   └──────────┘   └──────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        ▼
              ┌──────────────────┐
              │   Complaints     │  ◄── Core domain
              │     Module       │
              └────────┬─────────┘
                       │
           ┌───────────┼───────────┐
           ▼           ▼           ▼
      ┌─────────┐ ┌─────────┐ ┌──────────┐
      │Messages │ │Activities│ │  Prisma  │
      │ Module  │ │  Module  │ │  Module  │
      └─────────┘ └─────────┘ └──────────┘
                                    │
                              ┌─────▼──────┐
                              │  NeonDB    │
                              │ PostgreSQL │
                              └────────────┘
```

**Design principles:**

- **Thin controllers** — no business logic; controllers only validate input and delegate to services
- **Services** own all business rules, authorization checks, and database access
- **Global guards** enforce JWT + RBAC on every request
- **Global interceptor** wraps all responses in a consistent envelope
- **Global filter** catches all exceptions and formats them uniformly
- **Prisma** is a global singleton shared across all modules

---



## Tech Stack


| Layer            | Technology                          |
| ---------------- | ----------------------------------- |
| Framework        | NestJS 10                           |
| Language         | TypeScript 5                        |
| ORM              | Prisma 5                            |
| Database         | PostgreSQL (NeonDB)                 |
| Auth             | JWT + Passport                      |
| Password hashing | bcrypt                              |
| Validation       | class-validator + class-transformer |
| Documentation    | Swagger / OpenAPI 3                 |
| Config           | @nestjs/config + Joi                |
| Testing          | Jest                                |


---



## Project Structure

```
ccms-backend/
├── prisma/
│   ├── schema.prisma              # Full DB schema with relations
│   ├── seed.ts                    # Seeds super admin + demo tenant
│   └── migrations/
│       └── 0001_initial/
│           └── migration.sql      # Hand-written initial migration
│
├── src/
│   ├── main.ts                    # Bootstrap: Swagger, CORS, pipes, guards
│   ├── app.module.ts              # Root module — composes all features
│   │
│   ├── config/
│   │   ├── app.config.ts          # Typed config factory
│   │   └── config.module.ts       # Joi schema validation at startup
│   │
│   ├── prisma/
│   │   ├── prisma.service.ts      # PrismaClient singleton + lifecycle hooks
│   │   └── prisma.module.ts       # @Global() — available everywhere
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts   # @CurrentUser()
│   │   │   ├── roles.decorator.ts           # @Roles(Role.AGENT, ...)
│   │   │   ├── public.decorator.ts          # @Public() — skips JWT
│   │   │   └── tenant-id.decorator.ts       # @TenantId()
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts    # Global error formatter
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts            # Applied globally in AppModule
│   │   │   ├── roles.guard.ts               # RBAC — checks @Roles()
│   │   │   └── tenant-isolation.guard.ts    # Prevents cross-tenant access
│   │   ├── interceptors/
│   │   │   ├── response.interceptor.ts      # Wraps all responses
│   │   │   └── logging.interceptor.ts       # Request/response logger
│   │   ├── interfaces/
│   │   │   ├── jwt-payload.interface.ts
│   │   │   ├── pagination.interface.ts
│   │   │   ├── response.interface.ts
│   │   │   └── authenticated-request.interface.ts
│   │   ├── dto/
│   │   │   └── pagination-query.dto.ts      # Base DTO for all list endpoints
│   │   └── utils/
│   │       ├── pagination.util.ts           # buildPaginationParams, paginate()
│   │       ├── hash.util.ts                 # hashPassword, comparePassword
│   │       ├── token.util.ts                # generateSecureToken, complaintRef
│   │       └── response.util.ts             # buildResponse()
│   │
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts       # POST /auth/register, /login, GET /auth/me
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts      # Validates JWT, loads user into request
│   │   └── dto/
│   │       ├── register.dto.ts
│   │       └── login.dto.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts      # GET /users, POST /users, PATCH /users/:id
│   │   ├── users.service.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       ├── update-user.dto.ts
│   │       └── query-users.dto.ts
│   │
│   ├── tenants/
│   │   ├── tenants.module.ts
│   │   ├── tenants.controller.ts    # SUPER_ADMIN only CRUD
│   │   ├── tenants.service.ts
│   │   └── dto/
│   │       ├── create-tenant.dto.ts
│   │       └── update-tenant.dto.ts
│   │
│   ├── complaints/
│   │   ├── complaints.module.ts
│   │   ├── complaints.controller.ts  # Full complaint + nested message/activity routes
│   │   ├── complaints.service.ts     # Status machine, assignment, stats
│   │   ├── complaints.service.spec.ts
│   │   └── dto/
│   │       ├── create-complaint.dto.ts
│   │       ├── update-complaint.dto.ts
│   │       ├── update-status.dto.ts
│   │       ├── assign-complaint.dto.ts
│   │       └── query-complaints.dto.ts
│   │
│   ├── messages/
│   │   ├── messages.module.ts
│   │   ├── messages.service.ts       # Thread management + internal notes
│   │   └── dto/
│   │       ├── create-message.dto.ts
│   │       └── query-messages.dto.ts
│   │
│   └── activities/
│       ├── activities.module.ts
│       ├── activities.controller.ts  # GET /activities (tenant audit log)
│       ├── activities.service.ts     # findByComplaint, findByTenant
│       └── dto/
│           └── query-activities.dto.ts
│
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── README.md
```

---



## Database Schema

```
Tenant (1) ──── (N) User
Tenant (1) ──── (N) Complaint
Tenant (1) ──── (N) Activity

User (1) ──── (N) Complaint  [assignedTo]
User (1) ──── (N) Complaint  [createdBy]
User (1) ──── (N) Message    [sender]
User (1) ──── (N) Activity   [actor]

Complaint (1) ──── (N) Message
Complaint (1) ──── (N) Activity
```

**Tenant isolation** is enforced at every query level using `tenantId` as a mandatory `WHERE` clause filter. No cross-tenant data leakage is possible through normal service calls.

---



## Status Machine

```
          ┌─────────┐
   Create │  OPEN   │────────────────────────────┐
          └────┬────┘                            │
               │ assign()                        │
               ▼                                 │
         ┌──────────┐                            │
         │ ASSIGNED │                            │
         └────┬─────┘                            │
              │ updateStatus()                   │
              ▼                                  ▼
        ┌─────────────┐              ┌──────────────────┐
        │ IN_PROGRESS │◄─────────────│    REOPENED      │
        └──────┬──────┘              └──────────────────┘
               │                             ▲
    ┌──────────┼───────────┐                 │
    ▼          ▼           ▼                 │
┌────────┐ ┌──────────┐ ┌──────────┐        │
│PENDING │ │ RESOLVED │ │  CLOSED  │         │
│ VENDOR │ └────┬─────┘ └──────────┘         │
└────┬───┘      │                            │
     │          ├──── CLOSED (customer confirms)
     │          └──── REOPENED (customer rejects) ─────┘
     │
     └──► IN_PROGRESS
```

**Rules:**

- Transitions outside the allowed graph return `400 Bad Request`
- `RESOLVED` requires a `resolutionNote` (agent's explanation to customer)
- `CLOSED` is terminal — no further transitions allowed
- Assigning a complaint auto-advances `OPEN → ASSIGNED`

---



## Role Permissions


| Action                | SUPER_ADMIN | TENANT_ADMIN | AGENT | VENDOR |
| --------------------- | ----------- | ------------ | ----- | ------ |
| Create tenant         | ✅           | ❌            | ❌     | ❌      |
| List tenants          | ✅           | ❌            | ❌     | ❌      |
| Create user           | ✅           | ✅            | ❌     | ❌      |
| List users            | ✅           | ✅            | ❌     | ❌      |
| Update user           | ✅           | ✅            | ❌     | ❌      |
| Create complaint      | ✅           | ✅            | ✅     | ❌      |
| List complaints       | ✅           | ✅            | ✅     | ✅      |
| Get complaint         | ✅           | ✅            | ✅     | ✅      |
| Update complaint      | ✅           | ✅            | ✅*    | ❌      |
| Update status         | ✅           | ✅            | ✅*    | ❌      |
| Assign complaint      | ✅           | ✅            | ❌     | ❌      |
| Post message          | ✅           | ✅            | ✅     | ✅      |
| Post internal note    | ✅           | ✅            | ✅     | ❌      |
| View internal notes   | ✅           | ✅            | ✅     | ❌      |
| View activities       | ✅           | ✅            | ✅     | ❌      |
| View tenant audit log | ✅           | ✅            | ❌     | ❌      |
| Complaint stats       | ✅           | ✅            | ❌     | ❌      |


 Agents can only update/change status on complaints assigned to them.

---



## Quick Start



### Prerequisites

- Node.js >= 18
- pnpm >= 9
- A PostgreSQL database (NeonDB recommended — free tier available at neon.tech)



### 1. Clone and install

```bash
git clone https://github.com/your-org/ccms-backend.git
cd ccms-backend
pnpm install
```



### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
JWT_SECRET="your-minimum-32-character-secret-key"
```



### 3. Generate Prisma client

```bash
pnpm run prisma:generate
```



### 4. Run database migrations

```bash
# Development — creates migration history
pnpm run prisma:migrate:dev

# Production — applies existing migrations
pnpm run prisma:migrate:deploy
```



### 5. Seed the database

```bash
pnpm run prisma:seed
```

This creates:

- `superadmin@ccms.app` / `Admin@1234` — SUPER_ADMIN
- `admin@fastlogistics.com` / `TenantAdmin@1234` — TENANT_ADMIN (demo tenant)



### 6. Start the server

```bash
# Development (hot reload)
pnpm run start:dev

# Production
pnpm run build
pnpm run start:prod
```



### 7. Open Swagger docs

```
http://localhost:3000/api/v1/docs
```

---



## Environment Variables


| Variable             | Required | Default                 | Description                                   |
| -------------------- | -------- | ----------------------- | --------------------------------------------- |
| `NODE_ENV`           | No       | `development`           | `development` | `production` | `test`         |
| `PORT`               | No       | `3000`                  | HTTP port                                     |
| `DATABASE_URL`       | **Yes**  | —                       | PostgreSQL connection string                  |
| `JWT_SECRET`         | **Yes**  | —                       | Min 32 characters. Use a strong random string |
| `JWT_EXPIRES_IN`     | No       | `7d`                    | Token lifetime (e.g. `1d`, `7d`, `30d`)       |
| `BCRYPT_SALT_ROUNDS` | No       | `12`                    | Higher = more secure but slower               |
| `FRONTEND_URL`       | No       | `http://localhost:5173` | Used for building customer tracking URLs      |
| `ALLOWED_ORIGINS`    | No       | `http://localhost:3000` | Comma-separated CORS origins                  |


---



## API Reference

All endpoints are prefixed with `/api/v1`.

### Authentication


| Method | Endpoint         | Auth   | Description                    |
| ------ | ---------------- | ------ | ------------------------------ |
| `POST` | `/auth/register` | Public | Register a new user            |
| `POST` | `/auth/login`    | Public | Login and receive JWT          |
| `GET`  | `/auth/me`       | JWT    | Get authenticated user profile |


**Login response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "email": "...", "role": "AGENT", "tenantId": "..." },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```



### Users


| Method  | Endpoint     | Roles         | Description                        |
| ------- | ------------ | ------------- | ---------------------------------- |
| `POST`  | `/users`     | TENANT_ADMIN+ | Create user in tenant              |
| `GET`   | `/users`     | TENANT_ADMIN+ | List users (paginated, filterable) |
| `GET`   | `/users/:id` | AGENT+        | Get user by ID                     |
| `PATCH` | `/users/:id` | TENANT_ADMIN+ | Update user / deactivate           |


**Query params for** `GET /users`**:**

- `page`, `limit` — pagination
- `search` — searches name and email
- `role` — filter by role enum
- `isActive` — `true` or `false`



### Tenants


| Method  | Endpoint       | Roles                     | Description      |
| ------- | -------------- | ------------------------- | ---------------- |
| `POST`  | `/tenants`     | SUPER_ADMIN               | Create tenant    |
| `GET`   | `/tenants`     | SUPER_ADMIN               | List all tenants |
| `GET`   | `/tenants/:id` | SUPER_ADMIN, TENANT_ADMIN | Get tenant       |
| `PATCH` | `/tenants/:id` | SUPER_ADMIN, TENANT_ADMIN | Update tenant    |




### Complaints


| Method  | Endpoint                     | Roles         | Description                            |
| ------- | ---------------------------- | ------------- | -------------------------------------- |
| `POST`  | `/complaints`                | AGENT+        | Create complaint for a customer        |
| `GET`   | `/complaints`                | VENDOR+       | List complaints (paginated + filtered) |
| `GET`   | `/complaints/stats`          | TENANT_ADMIN+ | Dashboard stats                        |
| `GET`   | `/complaints/:id`            | VENDOR+       | Get complaint detail                   |
| `PATCH` | `/complaints/:id`            | AGENT+        | Update category/description/photos     |
| `PATCH` | `/complaints/:id/status`     | AGENT+        | Transition complaint status            |
| `PATCH` | `/complaints/:id/assign`     | TENANT_ADMIN+ | Assign to an agent                     |
| `GET`   | `/complaints/:id/messages`   | VENDOR+       | Get message thread                     |
| `POST`  | `/complaints/:id/messages`   | VENDOR+       | Post a message                         |
| `GET`   | `/complaints/:id/activities` | AGENT+        | Get activity timeline                  |


**Query params for** `GET /complaints`**:**

- `page`, `limit` — pagination
- `search` — searches ref, orderRef, customerName, customerEmail, description
- `status` — `OPEN`  `ASSIGNED`  `IN_PROGRESS`  `PENDING_VENDOR`  `RESOLVED`  `CLOSED`  `REOPENED`
- `category` — `WRONG_ITEM_DELIVERED`  `ITEM_DAMAGED`  `DIFFERENT_COLOR_OR_SIZE`  `MISSING_ITEM`  `OTHER`
- `priority` — `LOW`  `MEDIUM`  `HIGH`  `CRITICAL`
- `assignedToId` — filter by agent ID
- `orderRef` — filter by order reference
- `sortBy` — `createdAt`  `updatedAt`  `priority`  `status`
- `sortOrder` — `asc`  `desc`

**Create complaint body:**

```json
{
  "orderRef": "ORD-9921",
  "customerName": "Chioma Obi",
  "customerEmail": "chioma@gmail.com",
  "customerPhone": "08012345678",
  "category": "WRONG_ITEM_DELIVERED",
  "description": "I received a blue shirt instead of the black one I ordered.",
  "photos": ["https://cdn.example.com/photo1.jpg"],
  "priority": "MEDIUM"
}
```

**Update status body:**

```json
{
  "status": "RESOLVED",
  "resolutionNote": "A replacement has been dispatched and will arrive in 24 hours."
}
```

**Assign body:**

```json
{ "agentId": "clx7abc123def456" }
```



### Activities


| Method | Endpoint                     | Roles         | Description           |
| ------ | ---------------------------- | ------------- | --------------------- |
| `GET`  | `/activities`                | TENANT_ADMIN+ | Tenant-wide audit log |
| `GET`  | `/complaints/:id/activities` | AGENT+        | Complaint timeline    |




### Response Envelope

Every response (success or error) uses a consistent shape:

**Success:**

```json
{
  "success": true,
  "message": "Complaint created successfully",
  "data": { ... },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Error:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["orderRef must not be empty", "customerEmail must be an email"],
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/api/v1/complaints"
}
```

**Paginated list:**

```json
{
  "success": true,
  "message": "Complaints fetched",
  "data": {
    "data": [ ... ],
    "meta": {
      "total": 47,
      "page": 2,
      "limit": 10,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPreviousPage": true
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---



## Multi-Tenancy

CCMS uses **schema-based logical tenant isolation** (single schema, tenant-scoped queries):

1. Every table with tenant-owned data has a `tenantId` column
2. The `JwtStrategy` loads `tenantId` into `request.user` on every authenticated request
3. The `@TenantId()` decorator extracts it cleanly into service calls
4. Every service method filters by `tenantId` — a user from Tenant A **cannot** access Tenant B's data even with a valid JWT
5. `SUPER_ADMIN` is the only role that can query across tenants (e.g., listing all tenants)

---



## Security


| Concern                | Implementation                                                             |
| ---------------------- | -------------------------------------------------------------------------- |
| Authentication         | JWT Bearer tokens (HS256, configurable expiry)                             |
| Password storage       | bcrypt with configurable salt rounds (default 12)                          |
| Input validation       | class-validator whitelist + forbidNonWhitelisted on all DTOs               |
| Role authorization     | `RolesGuard` checks `@Roles()` metadata after JWT validation               |
| Tenant isolation       | `tenantId` scoped on all queries; `TenantIsolationGuard` for path params   |
| Customer link security | 64-char cryptographically random hex token per complaint                   |
| CORS                   | Configurable allowed origins; defaults to `*` in development               |
| Sensitive fields       | `passwordHash` is never included in any select response                    |
| Error messages         | Generic auth errors ("Invalid email or password") prevent user enumeration |
| Environment            | Joi validation at startup prevents misconfigured deployments               |


---



## Testing

```bash
# Run all unit tests
pnpm test

# Run tests with coverage report
pnpm run test:cov

# Run tests in watch mode during development
pnpm run test:watch
```

Tests included:

- `auth.service.spec.ts` — register, login, token generation
- `complaints.service.spec.ts` — status machine, assignment, not-found handling
- `pagination.util.spec.ts` — skip/take calculation, meta generation
- `token.util.spec.ts` — token format, uniqueness, URL construction

---



## Deployment



### NeonDB (Recommended)

1. Create a free database at [neon.tech](https://neon.tech)
2. Copy the connection string into `DATABASE_URL`
3. Run `pnpm run prisma:migrate:deploy`



### Railway / Render / [Fly.io](http://Fly.io)

```bash
# Set environment variables in your platform dashboard, then:
pnpm run build
pnpm run prisma:migrate:deploy
pnpm run start:prod
```



### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec prisma generate
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

---

