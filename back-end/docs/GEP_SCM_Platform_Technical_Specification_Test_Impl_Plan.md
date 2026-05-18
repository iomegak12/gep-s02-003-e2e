# End-to-End API Test Suite for GEP-SCM Backend

## Context

Three backend services (iam, supplier-service, po-service) are about to be consumed by web/mobile UI training demos. Before client developers wire up against them, we need a runnable test suite that proves every endpoint behaves as the spec/impl-plan describes — including authentication, role-based access, state-machine transitions, and the cross-service calls between PO and Supplier services. The suite doubles as living contract documentation for client devs.

Decisions (confirmed with user):
- **Format:** automated test scripts (Jest + axios in Node).
- **Coverage:** happy path for every endpoint, plus the key 401/403/404/409/422 error cases per spec — not the exhaustive matrix.
- **Run mode:** against the live `docker compose up` stack with the existing `seed` container having run. Tests reuse seeded users and create their own short-lived suppliers/POs where mutation is needed.
- **Inter-service scenarios included** (BLACKLISTED supplier → 422, spend-by-category enrichment, correlation-id propagation).

## Approach

Single Jest test project at [back-end/tests/](back-end/tests/) (folder already exists, empty). Node + axios chosen because:
- 2 of 3 services and the seeder are already Node; reuses the team's primary toolchain.
- One runner, one report, one CI job covers all three services.
- Tests are pure HTTP — no in-process imports — so they exercise the real network/auth path the UI will use.

### Layout

```
back-end/tests/
├── package.json              # jest, axios, dotenv, @types/jest, ts-jest
├── jest.config.ts            # testTimeout 30s, sequential per file, parallel across files
├── tsconfig.json
├── .env.example              # IAM_URL, SUPPLIER_URL, PO_URL, JWT_SECRET (optional fallback)
├── src/
│   ├── helpers/
│   │   ├── http.ts           # axios factory: baseURL, X-Correlation-Id, error-envelope unwrap, retry on connection refused while stack boots
│   │   ├── auth.ts           # login(email,password) → token; cached per email
│   │   ├── assert.ts         # expectErrorEnvelope(res, code, status)
│   │   ├── fixtures.ts       # makeSupplierPayload(), makePoPayload(supplierId, lineTotal)
│   │   └── wait-for-stack.ts # globalSetup: poll /health on all 3 services
│   └── tests/
│       ├── iam/
│       │   ├── health.spec.ts
│       │   ├── login.spec.ts            # success, bad password→401 AUTH_FAILED, inactive user→401, missing fields→400
│       │   ├── me.spec.ts               # GET /me with/without token, PATCH /me/password
│       │   ├── users-admin.spec.ts      # CRUD as admin, list pagination, duplicate email→409, role guard (buyer→403 INSUFFICIENT_ROLE)
│       │   └── reset-password.spec.ts
│       ├── supplier/
│       │   ├── health.spec.ts
│       │   ├── crud.spec.ts             # create→PENDING, get, patch, list with filters, soft-delete
│       │   ├── transitions.spec.ts      # approve, deactivate→reactivate, blacklist (with reason), invalid transition→409 INVALID_STATUS_TRANSITION
│       │   ├── rbac.spec.ts             # buyer can create; only admin can transition/delete; missing token→401
│       │   ├── search.spec.ts           # ?q= text search, limit clamp
│       │   ├── aggregations.spec.ts     # by-category/country/status non-empty, top-rated respects min_orders
│       │   └── scorecard.spec.ts
│       ├── po/
│       │   ├── health.spec.ts
│       │   ├── create.spec.ts           # happy path → DRAFT + auto po_number + supplier_snapshot
│       │   ├── line-items.spec.ts       # add/update/delete, totals recompute, edit blocked outside DRAFT → INVALID_STATE_FOR_EDIT
│       │   ├── state-machine.spec.ts    # submit (auto-approve vs SUBMITTED), approve, reject(+reason), fulfill(+date), close, cancel, revise; invalid transition→409
│       │   ├── approval-limits.spec.ts  # high-value PO + low-limit approver → 403 APPROVAL_LIMIT_EXCEEDED; hi-approver succeeds
│       │   ├── rbac.spec.ts             # buyer cannot approve; approver cannot create; admin-only delete
│       │   ├── list-filters.spec.ts     # status, supplier_id, date range, pagination shape
│       │   ├── search.spec.ts
│       │   └── aggregations.spec.ts     # by-status, spend-by-supplier, spend-by-category (cross-service enrichment), monthly-spend, pending-approvals (respects approver limit), cycle-time
│       └── cross-service/
│           ├── po-against-blacklisted-supplier.spec.ts   # 422 SUPPLIER_NOT_ACTIVE
│           ├── po-against-unknown-supplier.spec.ts       # 422 SUPPLIER_NOT_FOUND (random UUID)
│           ├── correlation-id-propagation.spec.ts        # client sends X-Correlation-Id on PO create; same ID echoed in response header (and observable in logs — assert echo only)
│           └── jwt-cross-service.spec.ts                 # token issued by IAM accepted by supplier + po services; tampered token → 401 TOKEN_INVALID
```

### Authoritative endpoint inventory used by the suite

Captured from source (not just spec); test files reference these exactly.

**IAM** (`:3001`, prefix `/api/v1/auth`): `POST /login`, `POST /logout` (204), `GET /me`, `PATCH /me/password`, `POST /users` [ADMIN], `GET /users` [ADMIN], `GET /users/:id` [ADMIN], `PATCH /users/:id` [ADMIN], `POST /users/:id/reset-password` [ADMIN]. Health: `GET /health`.

**Supplier** (`:3002`, prefix `/api/v1`): `POST /suppliers` [BUYER|ADMIN], `GET /suppliers`, `GET /suppliers/{id}`, `PATCH /suppliers/{id}` [BUYER|ADMIN], `DELETE /suppliers/{id}` [ADMIN, soft]; transitions `POST /suppliers/{id}/{approve|deactivate|reactivate|blacklist}` [ADMIN]; `GET /suppliers/search`; aggregations `by-category|by-country|by-status|top-rated`; `GET /suppliers/{id}/scorecard`. Health: `GET /health`.

**PO** (`:3003`, prefix `/api/v1`): PO CRUD `POST|GET|GET/:id|PATCH/:id|DELETE/:id /purchase-orders`; line items nested CRUD under `/purchase-orders/:id/line-items[/{line_id}]`; transitions `submit`, `approve`, `reject`, `fulfill`, `cancel`, `revise`, `close`; `GET /purchase-orders/search`; aggregations `by-status`, `spend-by-supplier`, `spend-by-category`, `monthly-spend`, `pending-approvals`, `cycle-time`. Health: `GET /health`. Default approval threshold: **100,000** (env `DEFAULT_APPROVAL_THRESHOLD`).

### Seeded principals reused

Password `Passw0rd!`. Tokens cached in `auth.ts` for the test run.
- `admin@demo.local` — ADMIN
- `buyer@demo.local` — BUYER
- `approver-hi@demo.local` — APPROVER, limit 1,000,000
- `approver-lo@demo.local` — APPROVER, limit 50,000

### Test conventions

- **Self-cleaning writes:** each spec creates its own supplier (unique `supplier_code` with timestamp) and POs. No reliance on a specific seeded entity beyond users.
- **Error assertions** go through `expectErrorEnvelope(res, expectedCode, expectedStatus)` which validates spec §3.4 shape: `{ error: { code, message, correlation_id, details? } }`.
- **Correlation ID:** helper sends `X-Correlation-Id: test-<uuid>` on every request; one dedicated spec asserts it is echoed back in the response header.
- **No mocks.** All assertions are against live HTTP.

## Critical files to be created

- [back-end/tests/package.json](back-end/tests/package.json), [tsconfig.json](back-end/tests/tsconfig.json), [jest.config.ts](back-end/tests/jest.config.ts), [.env.example](back-end/tests/.env.example)
- [back-end/tests/src/helpers/http.ts](back-end/tests/src/helpers/http.ts), [auth.ts](back-end/tests/src/helpers/auth.ts), [assert.ts](back-end/tests/src/helpers/assert.ts), [fixtures.ts](back-end/tests/src/helpers/fixtures.ts), [wait-for-stack.ts](back-end/tests/src/helpers/wait-for-stack.ts)
- All `*.spec.ts` files listed under the layout above
- [back-end/tests/README.md](back-end/tests/README.md) — one page: prerequisites, `npm test` workflow, how to point at a non-default host

## Verification

1. `docker compose up --build` from `back-end/` — wait until `seed` container exits 0.
2. From `back-end/tests/`: `npm install && npm test`.
3. Expect green run: ~80–100 test cases across the spec files above. Total runtime target: under 60 seconds.
4. Each failure must surface as a clear assertion (endpoint, expected vs actual code/status) — these become the client-dev punch list before they integrate.
5. Smoke check after green: `npm test -- cross-service` alone passes — proves the trickiest path (PO ↔ Supplier inter-service) is solid.

## Out of scope

- Load / performance testing.
- Contract tests against an OpenAPI snapshot (could be added later by diffing `/api/v1/docs` responses).
- UI / browser flows.
- Restoring DB state between runs — tests are additive and idempotent on the data they create; no truncation needed.
