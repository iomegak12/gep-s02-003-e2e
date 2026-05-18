# Nexus SCM — Front-End

React 18 + Vite (JavaScript) web client for the GEP SCM Platform. Talks to the
back-end IAM, Supplier, and Purchase Order services exclusively through an
nginx reverse proxy.

## Phase status

This repo is being delivered in **8 phases**. See
[CHANGELOG.md](CHANGELOG.md) for what's currently shipped.

- **Phase 1 — Foundation** ✅ scaffold, design tokens, theme, app shell, service health modal, nginx + docker.
- Phase 2 — Login
- Phase 3 — Suppliers
- Phase 4 — Purchase Orders
- Phase 5 — Approvals
- Phase 6 — User Management
- Phase 7 — Profile & Settings
- Phase 8 — Dashboards, charts & polish

## Tech stack

| Concern | Library |
|---|---|
| Framework | React 18 + Vite (JavaScript) |
| Routing | react-router-dom v6 |
| Data fetching / cache | @tanstack/react-query v5 |
| Tables | @tanstack/react-table + @tanstack/react-virtual |
| Charts | recharts |
| HTTP | axios |
| Icons | lucide-react |
| Toasts | sonner |
| Styling | Plain CSS + CSS variables (Nexus design tokens) |

## Architecture in one diagram

```
Browser ──HTTP──> nginx (gep-web :8080)
                     │
                     ├─ / (SPA assets, html fallback)
                     ├─ /api/v1/auth/*           ──> iam:3001
                     ├─ /api/v1/suppliers/*      ──> supplier-service:3002
                     ├─ /api/v1/purchase-orders/* ──> po-service:3003
                     ├─ /health/iam              ──> iam:3001/health
                     ├─ /health/sup              ──> supplier-service:3002/health
                     └─ /health/po               ──> po-service:3003/health
```

The SPA **never** calls `localhost:3001/3002/3003` directly.

## Local development

### Option A — `vite dev` against host-published back-end ports

```
cd back-end && docker compose up -d
cd ../front-end
npm install
npm run dev
# open http://localhost:5173
```

Vite's dev proxy (see [vite.config.js](vite.config.js)) forwards `/api/v1/*` and
`/health/*` to `localhost:3001/3002/3003` so the same code works as in
production.

### Option B — full Docker stack (production-like)

```
cd back-end && docker compose up -d
cd ../front-end && docker compose up --build -d
# open http://localhost:8080
```

`front-end/docker-compose.yml` joins the **external** `gep-network` created by
the back-end stack, so nginx can resolve `iam`, `supplier-service`, and
`po-service` by DNS.

## Project layout

```
src/
  api/          axios client + per-service modules + correlation id
  auth/         AuthProvider, route guards (RequireAuth, RequireRole)
  components/
    shell/      AppShell, TopBar, Sidebar, ServiceHealthModal, ThemeToggle
    ui/         Button, Modal, Tooltip, Skeleton, Badge, etc.
    charts/     ChartCard, KpiCard, DonutChart, BarChart, LineChart
    data/       (Phase 3+) DataTable, DataCardGrid, DataKanban, ViewSwitcher
    forms/      Field, FormErrors
  features/     screen-level code, one folder per persona/domain
  routes/       route table + post-login redirect
  hooks/        useServiceHealth, useDebouncedValue, useLocalStorage
  theme/        ThemeProvider + useTheme
  styles/       tokens.css (light + dark), reset.css, global.css
  utils/        currency, date, roles
  constants/    statuses, nav
```

## Theming

`src/styles/tokens.css` defines every Nexus design token as a CSS variable
under `:root` (light) and `[data-theme="dark"]` (dark). Components consume
`var(--surface)`, `var(--primary)`, etc. — **never hard-coded hex**.

The user's theme choice is stored in `localStorage` under `gep.theme`
(`"light"` | `"dark"`); first load follows OS preference via
`prefers-color-scheme`.

## Authentication

- Access token (no refresh token) is stored in `localStorage` under `gep.auth`
  as `{ access_token, expires_at, user }`.
- Axios interceptors inject `Authorization: Bearer <token>` and
  `X-Correlation-Id: <uuid>` on every request.
- A 401 response clears the stored token and routes the user to `/login`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## License

MIT — see [LICENSE](LICENSE).
