# GEP SCM Front-End — Phased Implementation Plan

## Context

The GEP SCM Platform back-end (IAM, Supplier, PO services) is built and tested. The UI/UX team has delivered a complete designer specification ([GEP_SCM_Platform_UI_Spec.md](front-end/docs/GEP_SCM_Platform_UI_Spec.md)), a Nexus SCM design system ([DESIGN.md](front-end/docs/ui-artifacts/DESIGN.md)), and per-screen HTML/PNG references under [front-end/docs/ui-artifacts/](front-end/docs/ui-artifacts/).

We need a production-leaning React 18 + Vite (JavaScript) front-end that:
- Talks to the three back-ends **only** through an nginx reverse proxy (no direct CORS, no exposed back-end URLs in the SPA).
- Strictly honors the Nexus SCM color tokens with first-class **light/dark** theme switching.
- Renders large supplier/PO datasets efficiently (query, cache, sort, filter, group, virtualize) and supports **table, card, and Kanban** views.
- Ships in **8 incremental phases**, not one big drop.

This plan covers the foundation (Phase 1) in execution-ready detail and outlines Phases 2–8 as scoped deliverables that build on the foundation.

---

## Stack & Key Libraries

| Concern | Choice | Why |
|---|---|---|
| Framework | **React 18 + Vite (JavaScript)** | Per requirement |
| Routing | **react-router-dom v6** | Standard SPA routing |
| Data/cache | **@tanstack/react-query v5** | Caching, retries, dedupe, request lifecycle |
| Tables | **@tanstack/react-table v8** + **@tanstack/react-virtual v3** | Headless, ~14KB, full virtualization |
| Charts | **recharts** | Lightweight, React-idiomatic, easy theming via CSS vars |
| HTTP | **axios** with interceptors | JWT + `X-Correlation-Id` injection, 401 handling |
| Forms | **react-hook-form** | Performance-friendly for PO wizard / supplier forms |
| Validation | **zod** + `@hookform/resolvers` | Mirrors back-end validation contracts |
| Styling | **Plain CSS + CSS variables** (Nexus tokens) + lightweight CSS Modules per component | No framework lock-in; light/dark via `[data-theme]` attribute on `<html>` |
| Icons | **lucide-react** | Stroke-based 20px icons matching DESIGN.md |
| Drag/Kanban | **@dnd-kit/core** (Phase 3+ when Kanban lands) | Lightweight, accessible |
| UUID | **uuid** (v4) | `X-Correlation-Id` per request |
| Toasts | **sonner** | Tiny, themable |

Token storage: **localStorage** key `gep.auth` ( `{ access_token, expires_at, user }` ); theme key `gep.theme`.

---

## Project Structure (modular)

```
front-end/
├── .dockerignore
├── .gitignore
├── CHANGELOG.md
├── CONTRIBUTING.md
├── Dockerfile                      # multi-stage: node:20-alpine builder -> nginx:alpine runner
├── LICENSE                         # MIT
├── README.md
├── TROUBLESHOOTING.md
├── docker-compose.yml              # extends back-end's gep-network (external: true)
├── index.html
├── package.json
├── vite.config.js
├── nginx/
│   ├── nginx.conf                  # SPA fallback + /api/v1/iam, /api/v1/supplier, /api/v1/po proxies
│   └── default.conf.template       # env-substituted upstreams (optional)
├── public/
│   └── favicon.svg
├── docs/                           # already exists (specs + ui-artifacts)
└── src/
    ├── main.jsx
    ├── App.jsx                     # routes + providers (QueryClient, Theme, Auth, Toaster)
    ├── styles/
    │   ├── tokens.css              # Nexus colors (light + dark), typography, spacing, radii
    │   ├── reset.css
    │   └── global.css
    ├── theme/
    │   ├── ThemeProvider.jsx       # reads/writes localStorage `gep.theme`, sets [data-theme]
    │   └── useTheme.js
    ├── auth/
    │   ├── AuthProvider.jsx        # login/logout, token persistence, current user/roles
    │   ├── useAuth.js
    │   ├── RequireAuth.jsx         # route guard
    │   └── RequireRole.jsx         # role-based guard ('BUYER' | 'APPROVER' | 'ADMIN')
    ├── api/
    │   ├── client.js               # axios instance: baseURL `/api/v1`, Bearer + X-Correlation-Id interceptors, 401 -> logout
    │   ├── correlation.js          # uuid generator
    │   ├── errors.js               # normalizes { error: { code, message, correlation_id } }
    │   ├── iam.js                  # login, logout, me, users CRUD, password
    │   ├── suppliers.js            # CRUD, status transitions, search, aggregations
    │   ├── purchaseOrders.js       # CRUD, line items, transitions, aggregations
    │   └── health.js               # parallel GET /health/{iam,sup,po} via proxy
    ├── components/                 # all reusable UI primitives + composites
    │   ├── shell/
    │   │   ├── AppShell.jsx
    │   │   ├── TopBar.jsx
    │   │   ├── Sidebar.jsx          # collapsible 240<->64px, role-filtered nav
    │   │   ├── ServiceHealthDot.jsx
    │   │   ├── ServiceHealthModal.jsx   # opens on click, shows IAM/SUP/PO statuses
    │   │   ├── ThemeToggle.jsx
    │   │   └── UserMenu.jsx
    │   ├── ui/                     # design-system primitives
    │   │   ├── Button.jsx
    │   │   ├── Input.jsx
    │   │   ├── Select.jsx
    │   │   ├── Modal.jsx
    │   │   ├── Drawer.jsx
    │   │   ├── Badge.jsx           # status chips (supplier + PO color maps)
    │   │   ├── Card.jsx
    │   │   ├── Tabs.jsx
    │   │   ├── Tooltip.jsx
    │   │   ├── Skeleton.jsx
    │   │   ├── EmptyState.jsx
    │   │   ├── ErrorState.jsx
    │   │   └── ConfirmWithReason.jsx
    │   ├── data/                   # data-display composites (Phase 3+)
    │   │   ├── DataTable.jsx       # TanStack Table + Virtual wrapper
    │   │   ├── DataCardGrid.jsx    # card view
    │   │   ├── DataKanban.jsx      # Kanban view grouped by status
    │   │   ├── ViewSwitcher.jsx    # Table | Card | Kanban toggle
    │   │   └── Pagination.jsx
    │   ├── charts/                 # Phase 8 polish, but ChartCard primitive lands Phase 1
    │   │   ├── ChartCard.jsx
    │   │   ├── DonutChart.jsx
    │   │   ├── BarChart.jsx
    │   │   ├── LineChart.jsx
    │   │   └── KpiCard.jsx
    │   └── forms/
    │       ├── Field.jsx
    │       └── FormErrors.jsx
    ├── features/                   # screen-level code, one folder per persona/domain
    │   ├── auth/                   # Phase 2: LoginPage
    │   ├── profile/                # Phase 7
    │   ├── settings/               # Phase 7
    │   ├── suppliers/              # Phase 3
    │   ├── purchase-orders/        # Phase 4
    │   ├── approvals/              # Phase 5
    │   ├── admin-users/            # Phase 6
    │   └── dashboard/              # role-specific dashboards (Buyer/Approver/Admin)
    ├── routes/
    │   ├── index.jsx               # route table; lazy-loaded feature pages
    │   └── postLoginRedirect.js    # ADMIN -> /admin/dashboard, APPROVER -> /approvals, BUYER -> /buyer/dashboard
    ├── hooks/
    │   ├── useServiceHealth.js     # polls every 30s
    │   ├── useDebouncedValue.js
    │   └── useLocalStorage.js
    ├── utils/
    │   ├── currency.js
    │   ├── date.js
    │   └── roles.js
    └── constants/
        ├── statuses.js             # supplier + PO status enums + color tokens
        └── nav.js                  # nav items per role
```

---

## Nginx Reverse Proxy

[front-end/nginx/nginx.conf](front-end/nginx/nginx.conf) — single nginx serves the SPA and proxies the three back-ends. SPA never sees `localhost:3001/3002/3003`.

Route map (all under `/api/v1` from the SPA's perspective):

| SPA call | Proxied to |
|---|---|
| `/api/v1/auth/*` and `/health/iam` | `http://iam:3001/api/v1/auth/*` / `http://iam:3001/health` |
| `/api/v1/suppliers/*` and `/health/sup` | `http://supplier-service:3002/api/v1/suppliers/*` / `http://supplier-service:3002/health` |
| `/api/v1/purchase-orders/*` and `/health/po` | `http://po-service:3003/api/v1/purchase-orders/*` / `http://po-service:3003/health` |
| anything else | `try_files $uri /index.html` (SPA fallback) |

Per requirement: **no nginx healthcheck block**. Headers forwarded: `Authorization`, `X-Correlation-Id`, `Content-Type`.

---

## Docker

[front-end/Dockerfile](front-end/Dockerfile) — multi-stage:
1. `node:20-alpine` → `npm ci` → `npm run build` → emits `/app/dist`.
2. `nginx:1.27-alpine` → copies `dist` to `/usr/share/nginx/html` and `nginx/nginx.conf` to `/etc/nginx/conf.d/default.conf`. No HEALTHCHECK directive.

[front-end/docker-compose.yml](front-end/docker-compose.yml) — single `web` service on port `8080:80`, attached to existing `gep-network` as an **external** network so it joins the back-end stack:

```yaml
services:
  web:
    build: .
    container_name: gep-web
    ports: ["8080:80"]
    networks: [gep-network]
networks:
  gep-network:
    external: true
```

No `version:`, no healthchecks (per requirement).

---

## Theme System (Nexus light + dark)

- `src/styles/tokens.css` exposes **every** color from DESIGN.md as CSS variables under `:root` (light) and `[data-theme="dark"]` (dark).
- `ThemeProvider` sets `document.documentElement.dataset.theme` and persists to `localStorage` key `gep.theme`. Defaults to `window.matchMedia('(prefers-color-scheme: dark)')`.
- Components only consume `var(--surface)`, `var(--primary)`, etc. — never hard-coded hex.

> **Note on dark palette**: DESIGN.md provides full light tokens but only narrative hints for dark (deep obsidian base `#0B0C0E`). We will derive a balanced dark palette by re-mapping the same token names (e.g., `--surface`, `--on-surface`, `--surface-container`) using the obsidian base + DESIGN.md's stated rules. Final dark hex values to be confirmed with the design team during Phase 8 polish.

---

## Phased Delivery

### Phase 1 — Foundation (this delivery)
- Scaffold Vite project, install dependencies, configure ESLint + Prettier.
- Standard files: `README.md`, `CONTRIBUTING.md`, `TROUBLESHOOTING.md`, `CHANGELOG.md`, `LICENSE` (MIT), `.gitignore`, `.dockerignore`, `Dockerfile`, `docker-compose.yml`, `nginx/nginx.conf`.
- `tokens.css` with full light + dark Nexus palette.
- `ThemeProvider` + `ThemeToggle`.
- `AuthProvider` skeleton (no UI yet — `login()`/`logout()` methods, localStorage persistence, JWT decode for roles + approval_limit).
- `api/client.js` axios instance with Bearer + `X-Correlation-Id` interceptors and 401 → logout redirect.
- `AppShell` with `TopBar` (logo, search placeholder, **clickable health indicator → `ServiceHealthModal`**, theme toggle, user menu placeholder) and collapsible `Sidebar`.
- `ServiceHealthModal`: shows three rows (IAM / Suppliers / PO) with green/amber/red dot, last-check time, response time. Polls `/health/iam`, `/health/sup`, `/health/po` (via nginx) every 30 s with `react-query`.
- Route skeleton with placeholder pages and a fake "logged-in as BUYER" toggle for shell development until Phase 2 lands login.
- UI primitives needed by the shell: `Button`, `Modal`, `Tooltip`, `Skeleton`, `Badge`, `ChartCard` (empty container).

**Phase 1 verification:** `docker compose up` from `back-end/` then `front-end/` brings up the stack on `http://localhost:8080`; clicking the health icon shows three live statuses; toggling theme swaps colors instantly and persists across reload.

### Phase 2 — Login
- `LoginPage` (`/login`) wired to `POST /api/v1/auth/login` via nginx.
- Store token + decoded user in localStorage; redirect by role (`postLoginRedirect.js`).
- `RequireAuth` + `RequireRole` guards activated on all non-public routes.
- Logout from `UserMenu` calls `POST /api/v1/auth/logout` and clears storage.
- Error handling for `AUTH_FAILED`, `VALIDATION_FAILED`.

### Phase 3 — Suppliers (Buyer + Admin)
- `DataTable` (TanStack Table + Virtual), `DataCardGrid`, `DataKanban` (grouped by `status`), `ViewSwitcher`.
- Supplier List `/suppliers` with filters (status/category/country) + global search (debounced → `/suppliers/search`).
- Supplier Detail `/suppliers/:id` with Overview + Scorecard tabs.
- Supplier Create `/suppliers/new` and Edit `/suppliers/:id/edit` (react-hook-form + zod).
- Admin actions row-kebab (approve/deactivate/reactivate/blacklist/delete) using `ConfirmWithReason`.
- Admin Supplier Approval queue `/admin/suppliers/pending`.

### Phase 4 — Purchase Orders (Buyer)
- PO List `/purchase-orders` with Table/Card/Kanban (Kanban grouped by PO status).
- PO Create 3-step wizard `/purchase-orders/new`.
- PO Detail `/purchase-orders/:id` with status-driven action bar, inline line-item editor (DRAFT only), and all transitions (submit/fulfill/close/cancel/revise).

### Phase 5 — Approvals (Approver)
- Approvals Inbox `/approvals` (uses `/aggregations/pending-approvals`).
- Approver PO Detail view with Approve / Reject only.
- Handle `APPROVAL_LIMIT_EXCEEDED` and `INVALID_STATUS_TRANSITION` per spec.

### Phase 6 — User Management (Admin)
- User List `/admin/users`, Detail, Create, Edit, Reset Password modal.
- Admin Dashboard `/admin/dashboard`.

### Phase 7 — Profile & Settings (all roles)
- `/profile` (read-only from `/auth/me`).
- `/settings`: change password (`PATCH /auth/me/password`), theme selector (mirrors top-bar), debug toggle for correlation-id surfacing.

### Phase 8 — Dashboards, charts & polish
- Persona-specific dashboards with **3–4 charts each**:
  - **Buyer Dashboard**: Suppliers-by-status donut, Monthly-spend line, Top-suppliers-by-spend bar, Cycle-time KPI.
  - **Approver Dashboard**: Pending-approvals KPI, Monthly-spend line, Cycle-time KPI, Spend-by-category bar.
  - **Admin Dashboard**: Total-users KPI, Suppliers-by-status donut, POs-by-status donut, Top-suppliers-by-spend bar.
- Empty/error/loading states across all screens, accessibility audit (focus rings, keyboard nav, aria labels), dark-palette finalization with design team, README + screenshots, CHANGELOG `v1.0.0`.

---

## Critical Files (Phase 1 deliverables, to create)

- [front-end/package.json](front-end/package.json)
- [front-end/vite.config.js](front-end/vite.config.js)
- [front-end/index.html](front-end/index.html)
- [front-end/Dockerfile](front-end/Dockerfile)
- [front-end/docker-compose.yml](front-end/docker-compose.yml)
- [front-end/nginx/nginx.conf](front-end/nginx/nginx.conf)
- [front-end/.gitignore](front-end/.gitignore)
- [front-end/.dockerignore](front-end/.dockerignore)
- [front-end/README.md](front-end/README.md)
- [front-end/CONTRIBUTING.md](front-end/CONTRIBUTING.md)
- [front-end/TROUBLESHOOTING.md](front-end/TROUBLESHOOTING.md)
- [front-end/CHANGELOG.md](front-end/CHANGELOG.md)
- [front-end/LICENSE](front-end/LICENSE)
- [front-end/src/main.jsx](front-end/src/main.jsx)
- [front-end/src/App.jsx](front-end/src/App.jsx)
- [front-end/src/styles/tokens.css](front-end/src/styles/tokens.css)
- [front-end/src/styles/reset.css](front-end/src/styles/reset.css)
- [front-end/src/styles/global.css](front-end/src/styles/global.css)
- [front-end/src/theme/ThemeProvider.jsx](front-end/src/theme/ThemeProvider.jsx)
- [front-end/src/auth/AuthProvider.jsx](front-end/src/auth/AuthProvider.jsx)
- [front-end/src/auth/RequireAuth.jsx](front-end/src/auth/RequireAuth.jsx)
- [front-end/src/auth/RequireRole.jsx](front-end/src/auth/RequireRole.jsx)
- [front-end/src/api/client.js](front-end/src/api/client.js)
- [front-end/src/api/health.js](front-end/src/api/health.js)
- [front-end/src/components/shell/AppShell.jsx](front-end/src/components/shell/AppShell.jsx)
- [front-end/src/components/shell/TopBar.jsx](front-end/src/components/shell/TopBar.jsx)
- [front-end/src/components/shell/Sidebar.jsx](front-end/src/components/shell/Sidebar.jsx)
- [front-end/src/components/shell/ServiceHealthModal.jsx](front-end/src/components/shell/ServiceHealthModal.jsx)
- [front-end/src/components/shell/ThemeToggle.jsx](front-end/src/components/shell/ThemeToggle.jsx)
- [front-end/src/components/ui/{Button,Modal,Tooltip,Skeleton,Badge}.jsx](front-end/src/components/ui/)
- [front-end/src/hooks/useServiceHealth.js](front-end/src/hooks/useServiceHealth.js)
- [front-end/src/routes/index.jsx](front-end/src/routes/index.jsx)
- [front-end/src/constants/{statuses,nav}.js](front-end/src/constants/)

---

## Verification (Phase 1)

1. **Build & run locally without Docker**: `cd front-end && npm install && npm run dev` → `http://localhost:5173` loads the shell; theme toggle works; health modal shows three rows (will be red until back-end is up — proves the call path exists).
2. **Run back-end**: `cd back-end && docker compose up -d` brings up `gep-network` + IAM/Supplier/PO containers.
3. **Run front-end via Docker**: `cd front-end && docker compose up --build -d` brings up `gep-web` on the same network; open `http://localhost:8080`.
4. **Health proxy check**: click health icon → all three dots green within 2 s; tooltip shows last-check time and response time; refresh after 30 s shows the timestamp advancing.
5. **Theme persistence**: switch to dark, reload — stays dark; clear `localStorage.gep.theme`, reload — follows OS preference.
6. **No direct back-end calls**: open browser DevTools Network tab — confirm **zero** requests to `localhost:3001/3002/3003`; all traffic flows through `localhost:8080/api/v1/*` and `localhost:8080/health/*`.
7. **Lint/format**: `npm run lint` clean.
8. **Docker image size**: `docker images gep-web` — final image should be < 50 MB (nginx:alpine + built static assets only).
