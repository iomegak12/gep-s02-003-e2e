# GEP-Style SCM Platform — Backend

Three microservices behind a single `docker-compose up`:

| Service | Stack | Port | Purpose |
|---|---|---|---|
| `iam` | Node + Express + Postgres | 3001 | Login, JWT issuance, user/role management |
| `supplier-service` | Python + FastAPI + Mongo | 3002 | Supplier master, status machine, aggregations |
| `po-service` | Node + NestJS + Postgres (Prisma) | 3003 | PO lifecycle, line items, spend analytics |

See [docs/GEP_SCM_Platform_Technical_Specification.md](docs/GEP_SCM_Platform_Technical_Specification.md) for the full spec. Notable deviations: auth uses **HS256 with a shared secret** (no RS256, no refresh tokens, 24h access tokens).

## Quick start

```powershell
copy .env.example .env
docker compose up --build
```

When `seed` exits cleanly, the platform is ready.

### Seeded users (password `Passw0rd!`)
- `admin@demo.local` — ADMIN
- `buyer@demo.local` — BUYER
- `approver-hi@demo.local` — APPROVER, limit 1,000,000
- `approver-lo@demo.local` — APPROVER, limit 50,000

### Endpoints to try

- `POST http://localhost:3001/api/v1/auth/login` `{ "email": "buyer@demo.local", "password": "Passw0rd!" }`
- `GET  http://localhost:3002/api/v1/suppliers?status=ACTIVE` (Bearer token)
- `GET  http://localhost:3002/api/v1/suppliers/aggregations/by-category`
- `GET  http://localhost:3003/api/v1/purchase-orders`
- `GET  http://localhost:3003/api/v1/purchase-orders/aggregations/spend-by-category?period=ytd`

OpenAPI docs:
- Supplier: http://localhost:3002/api/v1/docs
- PO: http://localhost:3003/api/v1/docs

## Out of scope (v1)

Multi-tenancy, file attachments, event streams, M2M tokens, mTLS, supplier portal, audit tables, i18n.
