# GEP-Style SCM Platform — Implementation Plan

## Context

We are building the three backend services described in [docs/GEP_SCM_Platform_Technical_Specification.md](docs/GEP_SCM_Platform_Technical_Specification.md) so they can serve as the API surface for upcoming web/mobile UI training demos. The working directory is greenfield (only the spec and an empty `iam/` folder exist).

User-confirmed deviations from the spec:
- **Auth simplified to HS256 with a shared `JWT_SECRET`** — no RS256 keypairs, **no refresh tokens**, long-lived access token (24h). `/auth/refresh` and refresh-token table are dropped.
- **Minimal seed data** instead of the full Appendix D dataset — enough to click through every flow.
- **Docker Compose at the workspace root** brings up everything with one command.
- All other §5/§6 features stay (state machines, aggregations, inter-service calls).

## Repo Layout

```
back-end/
├── docker-compose.yml          # postgres, mongo, all 3 services, seed runner
├── .env.example                # JWT_SECRET, DB URLs, ports
├── docs/                       # spec lives here
├── iam/                        # Auth Service — Node + Express + PG
├── supplier-service/           # Supplier Service — Python + FastAPI + Mongo
├── po-service/                 # Purchase Order Service — Node + NestJS + PG
└── seed/                       # one-shot seeder container (Node script hitting the APIs)
```

Each service folder contains: `Dockerfile`, `package.json`/`pyproject.toml`, `src/`, `README.md`, and a `.env.example`.

## Cross-Cutting Conventions

All three services implement:
- **JWT verification middleware** — HS256, shared `JWT_SECRET`, checks `iss=gep-auth` and own `aud`. Reads `sub`, `roles`, `approval_limit` from claims. Auth-only middleware emits the token; the others verify.
- **Error envelope** matching spec §3.4 (`{ error: { code, message, details, correlation_id } }`).
- **`X-Correlation-Id`** request header — accepted, generated if absent, propagated to downstream HTTP calls, attached to all logs.
- **Pagination** `?page&page_size` (max 100); responses wrap list data as `{ data, page, page_size, total }`.
- **Standard error codes** per spec Appendix B.
- **CORS** allowing `http://localhost:5173` and `http://localhost:3000` by default (configurable).
- **OpenAPI** exposed at `/api/v1/docs` (FastAPI native; `swagger-ui-express` for Express; `@nestjs/swagger` for Nest).

## Service Plans

### 1. Auth Service — [iam/](iam/)

**Stack:** Node 20 + Express 4 + PostgreSQL 16 + `pg` + `bcrypt` + `jsonwebtoken` (HS256) + `zod`. Port `3001`.

**Schema:** single `users` table per spec §4.2 (drop `refresh_tokens`). `password_hash`, `roles TEXT[]`, `approval_limit NUMERIC(15,2) NULL`.

**Routes** (spec §4.4, minus refresh):
- `POST /api/v1/auth/login` → returns `{ access_token, token_type, expires_in, user }`.
- `POST /api/v1/auth/logout` → no-op (stateless), returns 204.
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/users` (ADMIN) — create user with bcrypt hash.
- `GET /api/v1/auth/users` (ADMIN) — paginated list.
- `GET /api/v1/auth/users/:id` (ADMIN)
- `PATCH /api/v1/auth/users/:id` (ADMIN) — roles, is_active, approval_limit.
- `POST /api/v1/auth/users/:id/reset-password` (ADMIN)
- `PATCH /api/v1/auth/me/password` (Any) — requires current password.

**JWT claims:** `sub`, `email`, `name`, `roles`, `approval_limit`, `iat`, `exp` (now + 24h), `iss=gep-auth`, `aud=["gep-supplier","gep-po"]`, `jti`.

**Structure:** `src/{server.ts, db.ts, jwt.ts, middleware/{auth,error,correlation}.ts, routes/{auth,users}.ts, schemas/*.ts}`. Migrations via raw SQL files in `iam/migrations/` run on container startup.

### 2. Supplier Service — `supplier-service/`

**Stack:** Python 3.12 + FastAPI + Motor (async Mongo) + Pydantic v2 + `python-jose[cryptography]` (HS256 verify). Port `3002`.

**Document shape** per spec §5.2 — single `suppliers` collection. Indexes: `supplier_code` unique, `status`, `category`, `country`, text index on `legal_name`/`display_name`/`supplier_code` for `q=`.

**State machine** (spec §5.3) implemented as a transition table dict: `{(from, to): required_role}`; any unknown transition → 409 `INVALID_STATUS_TRANSITION`.

**Routes:**
- CRUD per §5.4 (`POST/GET/GET/{id}/PATCH/DELETE /api/v1/suppliers`). Create always lands in `PENDING_APPROVAL`. `DELETE` is soft (sets `status=INACTIVE`, `deleted_at`).
- Transitions per §5.5: `approve`, `deactivate`, `reactivate`, `blacklist` — each its own POST endpoint, `blacklist` requires `reason`.
- Search/aggregations per §5.6 using Mongo aggregation pipelines:
  - `/suppliers/search?q=&limit=` — `$text` search + projection.
  - `/suppliers/aggregations/by-category|by-country|by-status` — `$group` pipelines.
  - `/suppliers/aggregations/top-rated?limit&min_orders` — `$match` + `$sort`.
  - `/suppliers/{id}/scorecard` — current snapshot fields; "last 6 months trend" returns a stub array (real fulfilment data lives in PO Service — flagged in code comment as enrichment-from-events future work).

**Structure:** `app/{main.py, db.py, auth.py, models/supplier.py, routers/{suppliers,transitions,aggregations}.py, state_machine.py}`.

### 3. Purchase Order Service — `po-service/`

**Stack:** Node 20 + NestJS 10 + Prisma + PostgreSQL 16 + `axios`. Port `3003`.

**Schema** per spec §6.2 — `purchase_orders` + `po_line_items` tables. Prisma migrations.

**Modules:**
- `AuthModule` — JWT guard (HS256), `RolesGuard` reading `roles` claim, `ApprovalLimitGuard` for approve endpoint.
- `SuppliersClientModule` — `axios` wrapper hitting Supplier Service. Retry 2× with 200ms/800ms backoff. Simple circuit breaker (in-memory failure counter). Pass through the caller's JWT.
- `PurchaseOrdersModule` — CRUD + transitions per spec §6.3/§6.4/§6.5.
- `LineItemsModule` — nested CRUD; recomputes `subtotal/tax_amount/total_amount` on every write; only allowed in `DRAFT`.
- `AggregationsModule` — Prisma `groupBy` + raw SQL for date bucketing per §6.6. `spend-by-category` calls SuppliersClient to enrich `supplier_id → category` for each unique supplier in the result.

**State machine** (spec §6.3) as a typed transition map. Auto-approval rule: on `submit`, if `total_amount <= approval_threshold`, skip `SUBMITTED` → straight to `APPROVED`, response includes `auto_approved: true`. Approve endpoint compares JWT `approval_limit` against `total_amount` → 403 `APPROVAL_LIMIT_EXCEEDED` if insufficient.

**`po_number` generation:** `PO-YYYY-NNNNN` from a Postgres sequence per year (table `po_number_seq` with `(year, last_value)`, locked-update inside the create transaction).

**On create:** call `GET /api/v1/suppliers/{id}` on Supplier Service. 404 → 422 `SUPPLIER_NOT_FOUND`. Status≠`ACTIVE` → 422 `SUPPLIER_NOT_ACTIVE`. On success, denormalise `display_name` and `category` into `supplier_snapshot` JSONB.

**Structure:** standard Nest layout under `src/{auth, suppliers-client, purchase-orders, line-items, aggregations, common}`.

## Infrastructure — `docker-compose.yml`

Services:
- `postgres` (16) — single instance, two logical DBs (`auth`, `po`) created via init script.
- `mongo` (7) — single instance, `suppliers` DB.
- `iam` — builds from `./iam`, depends_on postgres healthcheck.
- `supplier-service` — builds from `./supplier-service`, depends_on mongo.
- `po-service` — builds from `./po-service`, depends_on postgres + supplier-service.
- `seed` — one-shot container that waits for the three services to be healthy, then runs `seed/run.ts` against their HTTP APIs. `restart: "no"`.

Shared env: `JWT_SECRET`, `JWT_ISSUER=gep-auth`, service URLs. `.env.example` documents all of them.

Each service exposes `GET /health` for compose healthchecks.

## Seed Data — `seed/`

Node script using `axios` that calls the live APIs (so it validates them end-to-end):

1. POST users: `admin@demo.local` (ADMIN), `buyer@demo.local` (BUYER), `approver-hi@demo.local` (APPROVER, limit 1,000,000), `approver-lo@demo.local` (APPROVER, limit 50,000). All password `Passw0rd!`.
2. Log in as admin, create ~8 suppliers across 3 categories and 2 countries; approve 6, blacklist 1, leave 1 pending.
3. Log in as buyer, create ~12 POs across suppliers — some under threshold (auto-approve), some above; submit all; log in as approver to approve a few, reject one with reason, fulfil one, close one.

Result: every endpoint has data; every status has at least one row; aggregations return non-empty results.

## Critical Files To Be Created

- `docker-compose.yml`, `.env.example` (root)
- `iam/src/server.ts`, `iam/src/jwt.ts`, `iam/src/middleware/auth.ts`, `iam/migrations/001_init.sql`, `iam/Dockerfile`
- `supplier-service/app/main.py`, `app/auth.py`, `app/state_machine.py`, `app/routers/suppliers.py`, `app/routers/aggregations.py`, `supplier-service/Dockerfile`
- `po-service/prisma/schema.prisma`, `src/auth/jwt.strategy.ts`, `src/suppliers-client/suppliers-client.service.ts`, `src/purchase-orders/state-machine.ts`, `src/purchase-orders/purchase-orders.service.ts`, `src/aggregations/aggregations.service.ts`, `po-service/Dockerfile`
- `seed/run.ts`, `seed/Dockerfile`

## Verification

1. **Boot:** `docker compose up --build` — all five service containers reach healthy; `seed` container exits 0.
2. **Auth:** `curl -X POST localhost:3001/api/v1/auth/login -d '{"email":"buyer@demo.local","password":"Passw0rd!"}'` returns an `access_token`.
3. **Supplier directory:** `GET localhost:3002/api/v1/suppliers?status=ACTIVE` returns seeded suppliers; `GET /suppliers/aggregations/by-category` returns non-empty `data`.
4. **PO flow end-to-end (manual, with token):**
   - `POST /purchase-orders` with a valid supplier_id and one line item under threshold → returns `DRAFT`.
   - `POST /purchase-orders/{id}/submit` → returns `APPROVED` with `auto_approved: true` (low-value) or `SUBMITTED` (high-value).
   - As approver: `POST /purchase-orders/{id}/approve` → `APPROVED`; with a low-limit approver on a high-value PO → 403 `APPROVAL_LIMIT_EXCEEDED`.
   - Invalid transition (e.g., approve a `DRAFT`) → 409 `INVALID_STATUS_TRANSITION`.
5. **Inter-service:** create a PO against a `BLACKLISTED` supplier → 422 `SUPPLIER_NOT_ACTIVE`. Against a non-existent UUID → 422 `SUPPLIER_NOT_FOUND`.
6. **Aggregations:** `GET /purchase-orders/aggregations/spend-by-category?period=ytd` returns category-level totals (proves cross-service enrichment works).
7. **OpenAPI:** each service serves docs at `/api/v1/docs` — usable by trainees building UIs.

## Out of Scope (carried from spec §9)

Multi-tenancy, file attachments, email/event streams, M2M tokens, mTLS, audit log tables, supplier portal. Flagged in each service README as future work.
