# GEP-Style SCM Platform — Technical Specification

**Version:** 1.0
**Audience:** Series 02 trainees building frontend (web) and mobile apps on top of these services
**Domain inspiration:** GEP-style procurement workflows (Supplier Master Data + Purchase Order Lifecycle)

---

## 1. Executive Summary

This specification defines three backend services that together form the foundation of a procurement platform inspired by GEP's domain — supplier master data management and the purchase-order lifecycle. The services expose REST/JSON APIs over HTTPS, authenticate using JWT (RS256), and are designed to be consumed by web and mobile frontends.

**Three services, mixed-stack on purpose:**

- **Auth Service** — Node.js + Express + PostgreSQL — issues JWT access/refresh tokens, manages users and roles.
- **Supplier Service** — Python + FastAPI + MongoDB — manages the supplier master, search/filter/aggregations, and supplier lifecycle status.
- **Purchase Order Service** — Node.js + NestJS + PostgreSQL — manages POs, line items, and the PO approval state machine.

**Beyond CRUD**, each business service exposes:

- A **status state machine** with explicit transition endpoints (not "PATCH status").
- **Search, filter, and aggregation endpoints** suitable for dashboard UIs.

---

## 2. Business Context

### 2.1 The Problem

Procurement teams at large enterprises manage thousands of suppliers across categories (raw materials, packaging, logistics, IT services, consulting) and issue hundreds of thousands of purchase orders per year. Two recurring frictions dominate:

1. **Supplier master data is fragmented.** A "supplier" exists differently in procurement, finance, and logistics systems. Onboarding takes weeks. Performance data is scattered. Buyers don't know which suppliers are blacklisted until a PO bounces.
2. **PO workflows are slow and opaque.** Buyers create POs in Excel, email them around for approval, and re-key them into ERPs. Status is invisible. Spend analytics is retrospective.

Our platform addresses these by providing a **unified supplier directory** and a **first-class PO workflow** with explicit state transitions and built-in spend analytics.

### 2.2 Personas

| Persona | Role | Primary tasks |
|---|---|---|
| **Buyer** | Procurement officer | Manage suppliers, create POs, submit for approval, track delivery |
| **Approver** | Senior buyer / category manager | Approve or reject POs above threshold, monitor team spend |
| **Admin** | Platform admin | Manage users and roles, approve new suppliers, configure thresholds |

### 2.3 Key User Journeys

1. **Onboard a new supplier** → Buyer creates supplier record in `PENDING_APPROVAL` → Admin reviews and transitions to `ACTIVE`.
2. **Raise a PO** → Buyer creates PO in `DRAFT` → adds line items → submits → state machine routes to `APPROVED` (if under threshold) or `SUBMITTED` (waits for approver).
3. **Approve a PO** → Approver views queue → opens PO → approves or rejects with reason.
4. **Track fulfilment** → Buyer marks PO as `FULFILLED` upon delivery → closes after invoice match.
5. **Spend analytics** → Buyer views dashboard: spend by supplier, by category, monthly trend, top suppliers.
6. **Supplier directory** → Anyone searches/filters suppliers by category, country, status, rating.

---

## 3. Solution Architecture

### 3.1 Service Topology

```
                          ┌────────────────────────┐
                          │   Web App (Next.js)    │
                          │  Mobile App (Expo RN)  │
                          └───────────┬────────────┘
                                      │ HTTPS + JWT
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
    ┌──────────────────┐   ┌────────────────────┐   ┌──────────────────────┐
    │   Auth Service   │   │  Supplier Service  │   │  Purchase Order Svc  │
    │  Node + Express  │   │  Python + FastAPI  │   │   Node + NestJS      │
    │   :3001          │   │   :3002            │   │   :3003              │
    └────────┬─────────┘   └─────────┬──────────┘   └──────────┬───────────┘
             │                       │                         │
             ▼                       ▼                         ▼
    ┌──────────────────┐   ┌────────────────────┐   ┌──────────────────────┐
    │  PostgreSQL      │   │     MongoDB        │   │     PostgreSQL       │
    │  (users, refresh │   │   (suppliers)      │   │  (purchase_orders,   │
    │   tokens)        │   │                    │   │   po_line_items)     │
    └──────────────────┘   └────────────────────┘   └──────────────────────┘

                                      ▲
                                      │ (synchronous HTTP, JWT pass-through)
                                      │
                          PO Service calls Supplier Service
                          for: supplier validation on PO create,
                               supplier category enrichment for spend analytics
```

### 3.2 Service Responsibilities (one-line each)

| Service | Owns | Does not own |
|---|---|---|
| Auth | Users, roles, JWT issuance, password hashes, refresh tokens | Business data |
| Supplier | Supplier master data, status lifecycle, supplier scorecard, supplier-side aggregations | Users, POs |
| Purchase Order | PO lifecycle, line items, approval workflow, spend analytics | Suppliers (refers to them by ID), users |

### 3.3 Cross-Cutting Standards

| Concern | Choice |
|---|---|
| Auth | JWT, RS256 (Auth holds private key, others have public key) |
| API style | REST/JSON; OpenAPI 3.1 documented per service |
| Timestamps | ISO 8601, UTC, suffix `Z` (`2026-05-11T10:30:00Z`) |
| IDs | UUIDv4 for technical IDs; human-readable business IDs (`PO-2026-00042`, `SUP-IN-00123`) for display |
| Pagination | `?page=1&page_size=20` (max 100); responses include `total`, `page`, `page_size` |
| Sorting | `?sort=field,-other_field` (prefix `-` for descending) |
| Filtering | Query parameters (`?status=ACTIVE&category=LOGISTICS`) |
| Error envelope | Standard JSON shape across all services (see §3.4) |
| Versioning | URL prefix `/api/v1/` |
| CORS | All services allow the frontend origin |
| Correlation | All requests accept and propagate `X-Correlation-Id` header |

### 3.4 Standard Error Envelope

All services return errors in this shape:

```json
{
  "error": {
    "code": "SUPPLIER_NOT_FOUND",
    "message": "Supplier with id 'a1b2c3d4-...' not found",
    "details": {
      "supplier_id": "a1b2c3d4-..."
    },
    "correlation_id": "req_8e2c..."
  }
}
```

HTTP status codes follow standard semantics: `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict (including invalid state transitions), `422` business rule violation, `500` server error.

---

## 4. Authentication Service Specification

### 4.1 Tech Stack

- **Runtime:** Node.js 20 LTS
- **Framework:** Express 4
- **Database:** PostgreSQL 16
- **Libraries:** `jsonwebtoken` (RS256), `bcrypt` (password hashing, cost factor 12), `pg`, `zod` (input validation)
- **Port:** `3001`
- **Base path:** `/api/v1`

### 4.2 Data Model

**`users` table**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | UUIDv4 |
| `email` | VARCHAR(255) UNIQUE NOT NULL | Lowercased on write |
| `full_name` | VARCHAR(200) NOT NULL | |
| `password_hash` | VARCHAR(255) NOT NULL | bcrypt hash |
| `roles` | TEXT[] NOT NULL | Subset of `['BUYER', 'APPROVER', 'ADMIN']` |
| `is_active` | BOOLEAN NOT NULL DEFAULT true | |
| `approval_limit` | NUMERIC(15,2) | Maximum PO amount this user can approve (for Approvers); NULL for others |
| `created_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | |

**`refresh_tokens` table**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID NOT NULL REFERENCES users | |
| `token_hash` | VARCHAR(255) NOT NULL | SHA-256 of the refresh token |
| `expires_at` | TIMESTAMPTZ NOT NULL | |
| `revoked_at` | TIMESTAMPTZ | Null until revoked |
| `created_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | |

### 4.3 JWT Design

**Algorithm:** RS256 (asymmetric). Auth holds the private key; Supplier and PO services each hold the public key for verification. In production, rotate keys with a `kid` (key ID) header.

**Access token lifetime:** 15 minutes.
**Refresh token lifetime:** 7 days. Refresh tokens are single-use (rotated on every refresh).

**Access token claims:**

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "priya.sharma@example.com",
  "name": "Priya Sharma",
  "roles": ["BUYER", "APPROVER"],
  "approval_limit": 500000.00,
  "iat": 1746957600,
  "exp": 1746958500,
  "iss": "gep-auth",
  "aud": ["gep-supplier", "gep-po"],
  "jti": "8c47b1e3-..."
}
```

**Refresh token claims:** Same as above but with `typ: "refresh"` and longer `exp`. Refresh tokens are sent as opaque strings (the underlying JWT is implementation detail); clients store them and POST them to `/auth/refresh`.

### 4.4 Endpoints

| Method | Path | Auth | Roles | Purpose |
|---|---|---|---|---|
| POST | `/auth/login` | None | — | Exchange email + password for tokens |
| POST | `/auth/refresh` | Refresh token (body) | — | Issue new access token; rotate refresh |
| POST | `/auth/logout` | Bearer | Any | Revoke the active refresh token |
| GET | `/auth/me` | Bearer | Any | Return current user profile |
| POST | `/auth/users` | Bearer | ADMIN | Create a new user |
| GET | `/auth/users` | Bearer | ADMIN | List users (paginated) |
| GET | `/auth/users/:id` | Bearer | ADMIN | Get one user |
| PATCH | `/auth/users/:id` | Bearer | ADMIN | Update user (roles, active flag, approval_limit) |
| POST | `/auth/users/:id/reset-password` | Bearer | ADMIN | Set a new password for the user |
| PATCH | `/auth/me/password` | Bearer | Any | Change own password (requires current password) |

### 4.5 Sample Flows

**Login**

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "priya.sharma@example.com",
  "password": "P@ssw0rd!"
}
```

Response (200):

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "550e8400-...",
    "email": "priya.sharma@example.com",
    "full_name": "Priya Sharma",
    "roles": ["BUYER", "APPROVER"],
    "approval_limit": 500000.00
  }
}
```

**Refresh**

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{ "refresh_token": "eyJhbGc..." }
```

Response (200): same shape as login.

**How other services validate tokens**

Each service has the Auth public key loaded at startup (from `AUTH_PUBLIC_KEY` env var or a JWKS endpoint at `/.well-known/jwks.json` — implementation choice). On every request:

1. Extract `Authorization: Bearer <token>` header.
2. Verify signature with public key.
3. Check `exp`, `iss`, `aud` (their own audience).
4. Read `sub` (user ID) and `roles` from claims.
5. Apply role-based authorization at the route handler.

If verification fails → `401`. If role check fails → `403`.

---

## 5. Supplier Service Specification

### 5.1 Tech Stack

- **Runtime:** Python 3.12
- **Framework:** FastAPI
- **Database:** MongoDB 7 (via Motor async driver)
- **Libraries:** `pydantic` v2 (validation), `python-jose[cryptography]` (JWT verification), `motor`, `uvicorn`
- **Port:** `3002`
- **Base path:** `/api/v1`

### 5.2 Data Model

**`suppliers` collection (MongoDB document)**

```json
{
  "_id": "ObjectId(...)",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "supplier_code": "SUP-IN-00123",
  "legal_name": "Acme Industrial Supplies Pvt Ltd",
  "display_name": "Acme Industrial",
  "category": "RAW_MATERIALS",
  "sub_category": "STEEL",
  "country": "IN",
  "region": "APAC",
  "tax_id": "29ABCDE1234F1Z5",
  "contact": {
    "primary_name": "Ravi Kumar",
    "email": "ravi@acme-industrial.com",
    "phone": "+91-9876543210"
  },
  "address": {
    "street": "Plot 42, Industrial Estate Phase II",
    "city": "Coimbatore",
    "state": "Tamil Nadu",
    "country": "IN",
    "postal_code": "641014"
  },
  "payment_terms": "NET_45",
  "currency": "INR",
  "status": "ACTIVE",
  "blacklist_reason": null,
  "certifications": [
    { "name": "ISO 9001", "issued_by": "BSI", "valid_until": "2027-03-31" }
  ],
  "tags": ["preferred", "msme"],
  "rating": 4.3,
  "on_time_delivery_rate": 92.5,
  "total_orders_count": 187,
  "total_spend_inr": 14750000.00,
  "created_by": "550e8400-...",
  "created_at": "2025-08-12T09:15:00Z",
  "updated_at": "2026-05-09T14:22:00Z"
}
```

**Categories (enum):** `RAW_MATERIALS`, `PACKAGING`, `LOGISTICS`, `IT_SERVICES`, `PROFESSIONAL_SERVICES`, `MRO`, `CAPEX`, `OTHER`.

**Payment terms (enum):** `NET_15`, `NET_30`, `NET_45`, `NET_60`, `NET_90`, `IMMEDIATE`, `ADVANCE_50_50`.

**Status (enum):** `PENDING_APPROVAL`, `ACTIVE`, `INACTIVE`, `BLACKLISTED`.

### 5.3 Supplier Status State Machine

```
                    ┌─────────────────────┐
                    │  PENDING_APPROVAL   │ ← initial state on create
                    └──────┬──────────┬───┘
                  approve  │          │  reject
                           ▼          ▼
                      ┌────────┐   ┌──────────────┐
                  ┌──▶│ ACTIVE │   │ BLACKLISTED  │ ← terminal
                  │   └────┬───┘   └──────────────┘
        reactivate│        │ deactivate / blacklist
                  │        ▼
                  │   ┌──────────┐
                  └───┤ INACTIVE │
                      └─────┬────┘
                            │ blacklist
                            ▼
                      ┌──────────────┐
                      │ BLACKLISTED  │
                      └──────────────┘
```

**Allowed transitions:**

| From | To | Triggered by | Role |
|---|---|---|---|
| `PENDING_APPROVAL` | `ACTIVE` | `POST /suppliers/{id}/approve` | ADMIN |
| `PENDING_APPROVAL` | `BLACKLISTED` | `POST /suppliers/{id}/blacklist` | ADMIN |
| `ACTIVE` | `INACTIVE` | `POST /suppliers/{id}/deactivate` | ADMIN |
| `ACTIVE` | `BLACKLISTED` | `POST /suppliers/{id}/blacklist` | ADMIN |
| `INACTIVE` | `ACTIVE` | `POST /suppliers/{id}/reactivate` | ADMIN |
| `INACTIVE` | `BLACKLISTED` | `POST /suppliers/{id}/blacklist` | ADMIN |

Any other transition → `409 Conflict` with `code: "INVALID_STATUS_TRANSITION"`.

### 5.4 Endpoints — CRUD

| Method | Path | Auth | Roles | Purpose |
|---|---|---|---|---|
| POST | `/suppliers` | Bearer | BUYER, ADMIN | Create supplier (always lands in `PENDING_APPROVAL`) |
| GET | `/suppliers` | Bearer | Any | List with filters, pagination, sort |
| GET | `/suppliers/{id}` | Bearer | Any | Get one supplier |
| PATCH | `/suppliers/{id}` | Bearer | BUYER, ADMIN | Update editable fields (not status) |
| DELETE | `/suppliers/{id}` | Bearer | ADMIN | Soft-delete (sets status to `INACTIVE`, marks `deleted_at`) |

**List filters supported on `GET /suppliers`:**

- `status=ACTIVE` (or comma-separated `ACTIVE,INACTIVE`)
- `category=LOGISTICS`
- `country=IN`
- `min_rating=4.0`
- `tag=preferred`
- `q=acme` (search across `legal_name`, `display_name`, `supplier_code`)
- `sort=-rating,display_name` (default: `-created_at`)
- `page=1&page_size=20`

### 5.5 Endpoints — Status Transitions

| Method | Path | Body | Role |
|---|---|---|---|
| POST | `/suppliers/{id}/approve` | (none) | ADMIN |
| POST | `/suppliers/{id}/deactivate` | `{ "reason": "..." }` | ADMIN |
| POST | `/suppliers/{id}/reactivate` | (none) | ADMIN |
| POST | `/suppliers/{id}/blacklist` | `{ "reason": "..." }` (required) | ADMIN |

### 5.6 Endpoints — Search & Aggregations

| Method | Path | Returns |
|---|---|---|
| GET | `/suppliers/search?q={text}&limit=10` | Type-ahead search results (`id`, `display_name`, `supplier_code`, `category`, `status`) — optimised for autocomplete dropdowns |
| GET | `/suppliers/aggregations/by-category` | `[{ "category": "LOGISTICS", "count": 42, "active_count": 38 }, ...]` |
| GET | `/suppliers/aggregations/by-country` | `[{ "country": "IN", "count": 87 }, ...]` |
| GET | `/suppliers/aggregations/by-status` | `[{ "status": "ACTIVE", "count": 120 }, ...]` |
| GET | `/suppliers/aggregations/top-rated?limit=10&min_orders=20` | Top suppliers by `rating`, with minimum order threshold |
| GET | `/suppliers/{id}/scorecard` | Full performance snapshot: rating, OTD rate, total orders, total spend, last 6 months trend |

### 5.7 Sample Payloads

**Create supplier** — `POST /api/v1/suppliers`

```json
{
  "supplier_code": "SUP-IN-00456",
  "legal_name": "Sundaram Logistics Pvt Ltd",
  "display_name": "Sundaram Logistics",
  "category": "LOGISTICS",
  "sub_category": "ROAD_FREIGHT",
  "country": "IN",
  "region": "APAC",
  "tax_id": "33ABCDE5678G1Z3",
  "contact": {
    "primary_name": "Meera Iyer",
    "email": "meera@sundaramlogistics.com",
    "phone": "+91-9123456789"
  },
  "address": {
    "street": "12 Anna Salai",
    "city": "Madurai",
    "state": "Tamil Nadu",
    "country": "IN",
    "postal_code": "625001"
  },
  "payment_terms": "NET_30",
  "currency": "INR"
}
```

Response (201): full supplier document with `status: "PENDING_APPROVAL"`.

**Aggregation** — `GET /api/v1/suppliers/aggregations/by-category`

```json
{
  "data": [
    { "category": "RAW_MATERIALS", "count": 145, "active_count": 132 },
    { "category": "LOGISTICS", "count": 87, "active_count": 80 },
    { "category": "IT_SERVICES", "count": 42, "active_count": 38 },
    { "category": "PROFESSIONAL_SERVICES", "count": 28, "active_count": 25 }
  ],
  "generated_at": "2026-05-11T10:30:00Z"
}
```

---

## 6. Purchase Order Service Specification

### 6.1 Tech Stack

- **Runtime:** Node.js 20 LTS
- **Framework:** NestJS 10
- **Database:** PostgreSQL 16 (via Prisma ORM)
- **Libraries:** `@nestjs/jwt` (token verification), `class-validator`, `axios` (calls to Supplier Service)
- **Port:** `3003`
- **Base path:** `/api/v1`

### 6.2 Data Model

**`purchase_orders` table**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `po_number` | VARCHAR(20) UNIQUE NOT NULL | Format: `PO-2026-00042` |
| `supplier_id` | UUID NOT NULL | References supplier (in Supplier Service) |
| `supplier_snapshot` | JSONB | Denormalised supplier name + category at PO creation time (for audit) |
| `buyer_id` | UUID NOT NULL | References user in Auth |
| `approver_id` | UUID | Set when approved/rejected |
| `status` | VARCHAR(20) NOT NULL | Enum (see §6.3) |
| `currency` | CHAR(3) NOT NULL | ISO 4217 |
| `subtotal` | NUMERIC(15,2) NOT NULL | Sum of line totals before tax |
| `tax_amount` | NUMERIC(15,2) NOT NULL DEFAULT 0 | |
| `total_amount` | NUMERIC(15,2) NOT NULL | subtotal + tax_amount |
| `expected_delivery_date` | DATE | |
| `actual_delivery_date` | DATE | |
| `delivery_address` | JSONB | |
| `payment_terms` | VARCHAR(20) NOT NULL | Same enum as Supplier |
| `notes` | TEXT | |
| `rejection_reason` | TEXT | Set when status → `REJECTED` |
| `requires_approval` | BOOLEAN NOT NULL | Computed: `total_amount > approval_threshold` |
| `approval_threshold` | NUMERIC(15,2) | Configurable; default 100000.00 in INR |
| `created_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| `submitted_at` | TIMESTAMPTZ | |
| `approved_at` | TIMESTAMPTZ | |
| `fulfilled_at` | TIMESTAMPTZ | |
| `closed_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | |

**`po_line_items` table**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `po_id` | UUID NOT NULL REFERENCES purchase_orders ON DELETE CASCADE | |
| `line_number` | INTEGER NOT NULL | 1, 2, 3, ... unique per PO |
| `item_description` | VARCHAR(500) NOT NULL | |
| `sku` | VARCHAR(50) | Optional |
| `quantity` | NUMERIC(12,3) NOT NULL | Supports fractional quantities |
| `unit_of_measure` | VARCHAR(10) NOT NULL | `EA`, `KG`, `L`, `M`, `HR`, etc. |
| `unit_price` | NUMERIC(15,4) NOT NULL | |
| `tax_rate` | NUMERIC(5,2) NOT NULL DEFAULT 0 | Percentage (e.g., 18.00 for 18% GST) |
| `line_total` | NUMERIC(15,2) NOT NULL | quantity × unit_price |
| `notes` | TEXT | |

UNIQUE constraint: `(po_id, line_number)`.

### 6.3 PO Status State Machine

```
                  ┌─────────┐
                  │  DRAFT  │ ← initial state
                  └─┬─────┬─┘
              submit│     │cancel
                    ▼     ▼
              ┌──────────┐ ┌──────────┐
              │SUBMITTED │ │CANCELLED │ (terminal)
              └─┬─────┬──┘ └──────────┘
        approve │     │ reject
                ▼     ▼
         ┌──────────┐ ┌──────────┐
         │ APPROVED │ │ REJECTED │
         └─┬──────┬─┘ └─────┬────┘
   fulfill │      │cancel   │ buyer edits
           ▼      ▼         ▼
     ┌──────────┐ ┌──────────┐
     │FULFILLED │ │CANCELLED │
     └────┬─────┘ └──────────┘  (back to DRAFT)
   close  │
          ▼
     ┌────────┐
     │ CLOSED │ (terminal)
     └────────┘
```

**Allowed transitions:**

| From | To | Endpoint | Role |
|---|---|---|---|
| `DRAFT` | `SUBMITTED` | `POST /purchase-orders/{id}/submit` | BUYER |
| `DRAFT` | `CANCELLED` | `POST /purchase-orders/{id}/cancel` | BUYER |
| `SUBMITTED` | `APPROVED` | `POST /purchase-orders/{id}/approve` | APPROVER |
| `SUBMITTED` | `REJECTED` | `POST /purchase-orders/{id}/reject` | APPROVER |
| `APPROVED` | `FULFILLED` | `POST /purchase-orders/{id}/fulfill` | BUYER |
| `APPROVED` | `CANCELLED` | `POST /purchase-orders/{id}/cancel` | BUYER |
| `REJECTED` | `DRAFT` | `POST /purchase-orders/{id}/revise` | BUYER (reopens for editing) |
| `FULFILLED` | `CLOSED` | `POST /purchase-orders/{id}/close` | BUYER, APPROVER |

**Auto-approval rule:** when a PO with `total_amount <= approval_threshold` is submitted, the state machine auto-transitions to `APPROVED` (skipping `SUBMITTED`). The response indicates this with `auto_approved: true`.

**Approval authority:** the Approver's `approval_limit` (from JWT claim) must be `>= total_amount`. If a PO exceeds the approver's limit → `403 Forbidden` with `code: "APPROVAL_LIMIT_EXCEEDED"`.

### 6.4 Endpoints — CRUD

| Method | Path | Auth | Roles | Notes |
|---|---|---|---|---|
| POST | `/purchase-orders` | Bearer | BUYER | Creates in `DRAFT`; validates supplier exists & is `ACTIVE` via call to Supplier Service |
| GET | `/purchase-orders` | Bearer | Any | List with filters, pagination |
| GET | `/purchase-orders/{id}` | Bearer | Any | Includes line items |
| PATCH | `/purchase-orders/{id}` | Bearer | BUYER | Only allowed when status is `DRAFT` |
| DELETE | `/purchase-orders/{id}` | Bearer | ADMIN | Only allowed when status is `DRAFT` or `CANCELLED` |

**Line item endpoints:**

| Method | Path | Auth | Roles | Notes |
|---|---|---|---|---|
| POST | `/purchase-orders/{id}/line-items` | Bearer | BUYER | Only allowed when status is `DRAFT` |
| GET | `/purchase-orders/{id}/line-items` | Bearer | Any | |
| PATCH | `/purchase-orders/{id}/line-items/{line_id}` | Bearer | BUYER | Only when `DRAFT` |
| DELETE | `/purchase-orders/{id}/line-items/{line_id}` | Bearer | BUYER | Only when `DRAFT` |

**List filters on `GET /purchase-orders`:**

- `status=SUBMITTED,APPROVED`
- `supplier_id=...`
- `buyer_id=...`
- `created_after=2026-01-01&created_before=2026-03-31`
- `min_amount=10000&max_amount=500000`
- `currency=INR`
- `q=keyword` (matches po_number, notes, line item descriptions)
- `sort=-created_at` (default)
- `page`, `page_size`

### 6.5 Endpoints — Status Transitions

| Method | Path | Body | Role |
|---|---|---|---|
| POST | `/purchase-orders/{id}/submit` | (none) | BUYER |
| POST | `/purchase-orders/{id}/approve` | (none) | APPROVER |
| POST | `/purchase-orders/{id}/reject` | `{ "reason": "..." }` (required) | APPROVER |
| POST | `/purchase-orders/{id}/fulfill` | `{ "actual_delivery_date": "2026-05-15" }` | BUYER |
| POST | `/purchase-orders/{id}/cancel` | `{ "reason": "..." }` | BUYER |
| POST | `/purchase-orders/{id}/revise` | (none) | BUYER |
| POST | `/purchase-orders/{id}/close` | (none) | BUYER, APPROVER |

Every transition returns the updated PO with the new status, timestamps, and an audit entry.

### 6.6 Endpoints — Search & Aggregations

| Method | Path | Returns |
|---|---|---|
| GET | `/purchase-orders/search?q={text}` | Type-ahead PO results |
| GET | `/purchase-orders/aggregations/by-status` | Count of POs per status |
| GET | `/purchase-orders/aggregations/spend-by-supplier?period=last_90_days&limit=10` | Top suppliers by spend in window |
| GET | `/purchase-orders/aggregations/spend-by-category?period=ytd` | Spend grouped by supplier category (requires call to Supplier Service for enrichment) |
| GET | `/purchase-orders/aggregations/monthly-spend?year=2026` | Spend per month for the year |
| GET | `/purchase-orders/aggregations/pending-approvals` | Count + total value of POs awaiting approval for current Approver |
| GET | `/purchase-orders/aggregations/cycle-time` | Average days from `DRAFT` → `FULFILLED`, broken down by category |

### 6.7 Inter-Service Communication

PO Service calls Supplier Service in two situations:

**1. On PO creation — supplier validation.**
- Endpoint called: `GET /api/v1/suppliers/{supplier_id}` on Supplier Service.
- Auth: pass through the buyer's JWT (no service-to-service M2M token in v1).
- If supplier doesn't exist → return `422` with `code: "SUPPLIER_NOT_FOUND"`.
- If supplier status is not `ACTIVE` → return `422` with `code: "SUPPLIER_NOT_ACTIVE"`.
- On success, denormalise `display_name` and `category` into `supplier_snapshot` on the PO record.

**2. On spend-by-category aggregation.**
- PO Service computes spend grouped by `supplier_id`.
- Calls `GET /suppliers/search` or `GET /suppliers?id=A,B,C,...` to resolve `category` for each supplier.
- Aggregates client-side and returns category-level totals.
- For training-grade implementation this is synchronous; in production, use a cache or supplier-category event stream.

**Retry policy:** 2 retries with exponential backoff (200ms, 800ms). Circuit-breaker opens after 5 consecutive failures.

### 6.8 Sample Payloads

**Create PO** — `POST /api/v1/purchase-orders`

```json
{
  "supplier_id": "550e8400-e29b-41d4-a716-446655440000",
  "currency": "INR",
  "expected_delivery_date": "2026-06-15",
  "payment_terms": "NET_30",
  "delivery_address": {
    "street": "Warehouse 3, MIDC Industrial Area",
    "city": "Pune",
    "state": "Maharashtra",
    "country": "IN",
    "postal_code": "411019"
  },
  "notes": "Urgent — Q2 production run",
  "line_items": [
    {
      "line_number": 1,
      "item_description": "MS Steel Rod, 12mm dia, 6m length",
      "sku": "STL-12-6M",
      "quantity": 500,
      "unit_of_measure": "EA",
      "unit_price": 850.00,
      "tax_rate": 18.00
    },
    {
      "line_number": 2,
      "item_description": "MS Steel Rod, 16mm dia, 6m length",
      "sku": "STL-16-6M",
      "quantity": 250,
      "unit_of_measure": "EA",
      "unit_price": 1250.00,
      "tax_rate": 18.00
    }
  ]
}
```

Response (201):

```json
{
  "id": "9a8b7c6d-...",
  "po_number": "PO-2026-00042",
  "supplier_id": "550e8400-...",
  "supplier_snapshot": {
    "display_name": "Acme Industrial",
    "category": "RAW_MATERIALS"
  },
  "buyer_id": "...",
  "status": "DRAFT",
  "currency": "INR",
  "subtotal": 737500.00,
  "tax_amount": 132750.00,
  "total_amount": 870250.00,
  "requires_approval": true,
  "approval_threshold": 100000.00,
  "expected_delivery_date": "2026-06-15",
  "payment_terms": "NET_30",
  "line_items": [ ... ],
  "created_at": "2026-05-11T10:30:00Z"
}
```

**Submit for approval** — `POST /api/v1/purchase-orders/9a8b7c6d-.../submit`

Response: PO with `status: "SUBMITTED"`, `submitted_at` set. Since `total_amount > approval_threshold`, the PO waits for an Approver.

**Aggregation** — `GET /api/v1/purchase-orders/aggregations/spend-by-category?period=ytd`

```json
{
  "period": { "from": "2026-01-01", "to": "2026-05-11" },
  "currency": "INR",
  "data": [
    { "category": "RAW_MATERIALS", "total_spend": 45200000.00, "po_count": 87 },
    { "category": "LOGISTICS", "total_spend": 12300000.00, "po_count": 156 },
    { "category": "IT_SERVICES", "total_spend": 8700000.00, "po_count": 34 }
  ],
  "generated_at": "2026-05-11T10:30:00Z"
}
```

---

## 7. Frontend / Mobile Consumption Patterns

This section maps the services to UI patterns trainees will build.

### 7.1 Login Flow (all platforms)

1. User submits email + password → `POST /auth/login`.
2. Frontend stores `access_token` in memory (or `secureStorage` on mobile).
3. Refresh token stored in `httpOnly` cookie (web) or `expo-secure-store` (mobile).
4. Axios/fetch interceptor adds `Authorization: Bearer <access_token>` to every request.
5. On `401` response with `code: "TOKEN_EXPIRED"`, interceptor calls `/auth/refresh`, retries the original request, transparent to the user.

### 7.2 Supplier Directory (web list + detail; mobile list + bottom-sheet detail)

- **List page:** `GET /suppliers?status=ACTIVE&category=...&page=1`
- **Filters sidebar:** drives the query params.
- **Search box:** debounced calls to `GET /suppliers/search?q=...` for type-ahead.
- **Detail page:** `GET /suppliers/{id}` + `GET /suppliers/{id}/scorecard` in parallel.
- **Status action buttons** (admin only): call the relevant transition endpoint, optimistically update UI, rollback on error.

### 7.3 PO Creation Wizard (web)

- **Step 1 — Supplier:** uses supplier search → captures `supplier_id`.
- **Step 2 — Line items:** dynamic form; computes subtotal client-side; sends full payload on save.
- **Step 3 — Delivery & terms:** delivery address, expected date, payment terms.
- **Step 4 — Review & submit:** `POST /purchase-orders` to create in `DRAFT`, then immediately `POST /purchase-orders/{id}/submit` if user clicks "Submit for approval"; or save as draft and exit.

### 7.4 Approval Queue (web — Approver dashboard)

- **List:** `GET /purchase-orders?status=SUBMITTED` (server filters to those within the approver's `approval_limit`).
- **Bulk actions:** approve multiple, with the UI calling the transition endpoint for each (could be parallelised).
- **Reject modal:** asks for `reason` (required) → `POST /purchase-orders/{id}/reject`.

### 7.5 Spend Analytics Dashboard (web)

Three widgets in parallel:

- **Monthly trend chart:** `GET /purchase-orders/aggregations/monthly-spend?year=2026`.
- **Top suppliers donut:** `GET /purchase-orders/aggregations/spend-by-supplier?period=last_90_days&limit=10`.
- **Category breakdown bar chart:** `GET /purchase-orders/aggregations/spend-by-category?period=ytd`.

Each widget is a separate React Query call; loading states render skeletons; errors render a retry button.

### 7.6 Mobile-Specific Patterns

- **Barcode-driven PO lookup:** scan a printed PO barcode (which encodes `po_number`) → `GET /purchase-orders?q=PO-2026-00042` → open detail.
- **Push notifications on approval requests:** when a PO transitions to `SUBMITTED` and would route to an Approver, the PO Service emits an event (out of scope for this spec — would integrate with a notification service later). The mobile client subscribes via Expo Notifications.
- **Offline-first PO drafts:** mobile app stores PO drafts in SQLite when offline; syncs to `POST /purchase-orders` on reconnect; conflicts (e.g., supplier deactivated meanwhile) surface as user-resolvable banner.

---

## 8. Appendices

### Appendix A: Sample JWT Access Token (decoded)

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "auth-key-2026-q2"
  },
  "payload": {
    "sub": "550e8400-e29b-41d4-a716-446655440000",
    "email": "priya.sharma@example.com",
    "name": "Priya Sharma",
    "roles": ["BUYER", "APPROVER"],
    "approval_limit": 500000.00,
    "iat": 1746957600,
    "exp": 1746958500,
    "iss": "gep-auth",
    "aud": ["gep-supplier", "gep-po"],
    "jti": "8c47b1e3-9d2a-4c5e-b1f3-7a6e8d9c0b1a"
  }
}
```

### Appendix B: Common Error Codes

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Body/query fails schema validation |
| 401 | `AUTH_REQUIRED` | No token present |
| 401 | `TOKEN_INVALID` | Token signature/format invalid |
| 401 | `TOKEN_EXPIRED` | Access token expired — client should refresh |
| 403 | `INSUFFICIENT_ROLE` | Role doesn't permit this action |
| 403 | `APPROVAL_LIMIT_EXCEEDED` | Approver's limit < PO total |
| 404 | `SUPPLIER_NOT_FOUND` / `PURCHASE_ORDER_NOT_FOUND` / `USER_NOT_FOUND` | Resource missing |
| 409 | `INVALID_STATUS_TRANSITION` | State machine violation |
| 409 | `DUPLICATE_RESOURCE` | Unique constraint (e.g., `supplier_code` already exists) |
| 422 | `SUPPLIER_NOT_ACTIVE` | Trying to create a PO against an inactive supplier |
| 422 | `BUSINESS_RULE_VIOLATION` | Generic business invariant broken |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### Appendix C: Environment Variables Checklist

**Auth Service**
- `DATABASE_URL=postgresql://...`
- `JWT_PRIVATE_KEY` (PEM, RS256)
- `JWT_PUBLIC_KEY` (PEM, for self-verification of issued tokens)
- `ACCESS_TOKEN_TTL_SECONDS=900`
- `REFRESH_TOKEN_TTL_SECONDS=604800`
- `BCRYPT_COST=12`
- `PORT=3001`

**Supplier Service**
- `MONGODB_URL=mongodb://...`
- `AUTH_PUBLIC_KEY` (PEM, for JWT verification)
- `JWT_ISSUER=gep-auth`
- `JWT_AUDIENCE=gep-supplier`
- `PORT=3002`

**Purchase Order Service**
- `DATABASE_URL=postgresql://...`
- `AUTH_PUBLIC_KEY` (PEM)
- `JWT_ISSUER=gep-auth`
- `JWT_AUDIENCE=gep-po`
- `SUPPLIER_SERVICE_URL=http://supplier-service:3002/api/v1`
- `DEFAULT_APPROVAL_THRESHOLD_INR=100000`
- `PORT=3003`

### Appendix D: Seed Data Suggestions for Training

Provide trainees with:
- **6 seeded users**, one per role combination (`buyer-1`, `buyer-2`, `approver-1`, `approver-low-limit`, `admin-1`, `inactive-user`).
- **~80 suppliers** spread across 5 categories, 4 countries, with a realistic distribution of statuses (60% ACTIVE, 15% INACTIVE, 20% PENDING, 5% BLACKLISTED) and ratings.
- **~150 purchase orders** spread across all statuses, last 12 months, mix of high-value (requiring approval) and low-value (auto-approved). This gives the spend analytics endpoints meaningful data on day one.

---

## 9. Out of Scope (for v1 of this training spec)

So you can flag these to your trainees as "real-world considerations beyond what we ship":

- Multi-tenancy (each enterprise customer isolated)
- Row-level supplier portal (external supplier persona)
- File attachments on POs (invoices, contracts)
- Email notifications and event streams (Kafka/Redis)
- Document versioning and audit trails on supplier records
- M2M service-to-service tokens (currently using JWT pass-through)
- Service mesh / mTLS between services
- Soft-delete vs hard-delete policy (currently soft on Supplier only)
- Internationalisation (currently English UI, but currencies are multi)

These are excellent topics for follow-up sessions or open-ended labs.
