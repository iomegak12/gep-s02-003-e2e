# GEP SCM — Tests (root)

Unified test workspace combining API contract tests and UI end-to-end tests.

```
tests/
├── api/        # Jest API contract tests (iam, supplier, po, cross-service)
├── ui/         # Playwright UI tests (Chromium)
│   ├── .env.tests   # SHARED env file for both UI + API suites
│   ├── data.txt     # Data-driven users (pipe-delimited)
│   ├── playwright.config.js
│   ├── helpers/
│   └── specs/
└── package.json     # Orchestrator scripts
```

## One-time setup

```powershell
cd tests
npm run install:all
```

This installs deps for both `api/` and `ui/`, and downloads the Chromium browser for Playwright.

## Run scripts (from `tests/`)

| Script | What it runs |
| --- | --- |
| `npm run test:api`        | All API contract tests (Jest) |
| `npm run test:api:iam`    | IAM service tests |
| `npm run test:api:supplier` | Supplier service tests |
| `npm run test:api:po`     | PO service tests |
| `npm run test:api:cross`  | Cross-service tests |
| `npm run test:ui`         | All UI tests (Playwright, headless in CI / headed locally per config) |
| `npm run test:ui:headed`  | Force headed UI run |
| `npm run test:ui:report`  | Open the last HTML report |
| `npm run test:all`        | API tests then UI tests |

## Configuration

All environment is centralized in [`ui/.env.tests`](./ui/.env.tests). Both API
(Jest) and UI (Playwright) suites read from this single file.

Key variables:

- `WEB_BASE_URL` — base URL of the web app (default `http://localhost:8080`)
- `TEST_DATA_FILE` — path to the data-driven users file (default `./data.txt`)
- `UI_ACTION_DELAY_MIN_MS` / `UI_ACTION_DELAY_MAX_MS` — randomized pre-action
  delay applied before every Playwright action (default 300–1000 ms)
- `IAM_URL` / `SUPPLIER_URL` / `PO_URL` — API service endpoints
- Seeded credentials: `ADMIN_EMAIL`, `BUYER_EMAIL`, `APPROVER_HI_EMAIL`, `SEED_PASSWORD`
- Fixed UI targets: `SUPPLIER_SEARCH_QUERY`, `SUPPLIER_EXPECTED_NAME`,
  `PO_SEARCH_QUERY`, `PO_EXPECTED_NUMBER`, `PO_EXPECTED_SUPPLIER`

## Data-driven users (`ui/data.txt`)

Pipe-delimited, one user per line. Comments (`#`) and blank lines are ignored.

```
username|password|role
admin@demo.local|Passw0rd!|admin
buyer@demo.local|Passw0rd!|buyer
approver-hi@demo.local|Passw0rd!|approver
```

Each UI spec iterates over this list, so adding a new user automatically
expands the matrix.

## UI test scenarios

- `specs/login.spec.js` — login & logout for each user
- `specs/suppliers.spec.js` — login → Suppliers → search "EuroTrans" (press
  Enter) → open detail → assert "EuroTrans Logistics" → logout
- `specs/purchase-orders.spec.js` — login → Purchase Orders → search
  "PO-2026-00061" (press Enter) → open detail → assert PO number and
  "EuroTrans Logistics" supplier → logout

## Reporting

Playwright generates an HTML report at `ui/playwright-report/`. Open it with:

```powershell
npm run test:ui:report
```
