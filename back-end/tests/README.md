# GEP-SCM End-to-End API Test Suite

HTTP integration tests for the three backend services (`iam`, `supplier-service`, `po-service`). The suite is intended as a contract reference for client (UI/mobile) developers: every endpoint they will consume is exercised here against the real, networked services.

## What it covers

- **iam** — login, /me, password change, admin user management, role guard
- **supplier** — CRUD, state transitions, search, all four aggregations, scorecard
- **po** — CRUD, line-items + total recomputation, full state machine (submit/approve/reject/fulfill/close/cancel/revise), approval-limit enforcement, RBAC, list/search/aggregations
- **cross-service** — PO ↔ supplier validation (BLACKLISTED → 422 SUPPLIER_NOT_ACTIVE, unknown → 422 SUPPLIER_NOT_FOUND), correlation-id propagation, IAM-issued JWT accepted by both downstream services, tampered token rejected

Coverage is **happy path for every endpoint + key error cases** (401 / 403 / 404 / 409 / 422). Not the exhaustive matrix.

## Prerequisites

1. The full stack is running and **seeded**:
   ```bash
   cd back-end
   docker compose up --build
   ```
   Wait until the `seed` container exits with code 0 — that's how we know the demo users / suppliers / POs exist.

2. Node 20+ available locally.

## Run

```bash
cd back-end/tests
cp .env.example .env        # adjust if you bind to non-default host ports
npm install
npm test
```

Service-scoped runs:

```bash
npm run test:iam
npm run test:supplier
npm run test:po
npm run test:cross
```

A Jest `globalSetup` polls `/health` on all three services before any test runs, so `npm test` can be invoked the moment `docker compose up` is issued — it will block (up to `WAIT_FOR_STACK_TIMEOUT` ms) until everything is reachable.

## Pointing at a non-default host

Edit `.env`:

```
IAM_URL=http://10.0.0.5:3001
SUPPLIER_URL=http://10.0.0.5:3002
PO_URL=http://10.0.0.5:3003
PO_APPROVAL_THRESHOLD=100000
```

`PO_APPROVAL_THRESHOLD` must match the value the `po-service` container was started with — the state-machine spec relies on it to construct under/over-threshold POs.

## Seeded principals used

All passwords: `Passw0rd!` (override via `SEED_PASSWORD`).

| Email | Role | Approval limit |
|---|---|---|
| admin@demo.local | ADMIN | — |
| buyer@demo.local | BUYER | — |
| approver-hi@demo.local | APPROVER | 1,000,000 |
| approver-lo@demo.local | APPROVER | 50,000 |

## Test conventions

- **Self-contained writes** — every spec that mutates data creates its own supplier / PO with timestamped identifiers, so re-runs are idempotent. No truncation between runs.
- **Error-envelope assertion** — `expectErrorEnvelope(res, code, status)` validates spec §3.4 shape (`{ error: { code, message, correlation_id, details? } }`). Always assert via this helper rather than checking `res.status` alone.
- **No mocks** — all assertions are against live HTTP responses, the way a client will see them.
- **Correlation IDs** — every request includes a unique `X-Correlation-Id`; one dedicated spec confirms it is echoed back in response headers and surfaces inside the error envelope on failure.

## Layout

```
src/
├── helpers/
│   ├── env.ts                  # env-var loader
│   ├── http.ts                 # axios wrapper: validateStatus=true so we can assert on errors
│   ├── auth.ts                 # login() with per-email token cache
│   ├── assert.ts               # expectErrorEnvelope, expectPaginated
│   ├── fixtures.ts             # makeSupplierPayload, makePoPayload
│   ├── supplier-helper.ts      # createActiveSupplier, createBlacklistedSupplier
│   ├── wait-for-stack.ts       # global setup: poll /health on all 3 services
│   └── load-env.ts             # imported via setupFiles
└── tests/
    ├── iam/{health,login,me,users-admin}.spec.ts
    ├── supplier/{health,crud,transitions,search-and-aggregations,scorecard}.spec.ts
    ├── po/{health,create,line-items,state-machine,approval-limits,rbac,list-and-search,aggregations}.spec.ts
    └── cross-service/{po-against-blacklisted-supplier,po-against-unknown-supplier,correlation-id-propagation,jwt-cross-service}.spec.ts
```
