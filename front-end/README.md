# Nexus SCM — Front-End

React 18 + Vite (JavaScript) web client for the GEP SCM Platform. Talks to the
back-end IAM, Supplier, and Purchase Order services exclusively through an
nginx reverse proxy.

## Phase status

All 8 phases are shipped — see [CHANGELOG.md](CHANGELOG.md) for the per-phase
detail.

- **Phase 1 — Foundation** ✅ scaffold, design tokens, theme, app shell, service health modal, nginx + docker.
- **Phase 2 — Login** ✅ form, sample-cred icons, role-based landing.
- **Phase 3 — Suppliers** ✅ list (Table/Card/Kanban) + detail, create wizard (chips, India address), edit, admin actions (approve / blacklist / deactivate / reactivate / delete) + pending queue.
- **Phase 4 — Purchase Orders** ✅ list + detail with status-driven action bar, 4-step create wizard, inline line-item editor for DRAFT POs.
- **Phase 5 — Approvals** ✅ approver inbox with KPIs, queue filtered by approval limit, inline Approve / Reject.
- **Phase 6 — User Management** ✅ list, detail, create, edit, reset password modal.
- **Phase 7 — Profile & Settings** ✅ profile view, change password, theme + debug toggles, footer nav for Terms & Support.
- **Phase 8 — Dashboards, charts & polish** ✅ persona-specific dashboards (Buyer / Approver / Admin) with KPIs + Recharts donut / bar / line widgets, year-selector, accessibility pass, dark-palette refinement.

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

## How to demo

The Login page has three icon buttons under the form that pre-fill the seed
credentials. Pick one to walk the matching journey:

| Persona | Email | Where to start | What to try |
|---|---|---|---|
| **Buyer** | `buyer@demo.local` | `/buyer/dashboard` | Create a supplier (4-step wizard with India address chips) → Create a PO → Submit it (small totals auto-approve). |
| **Approver** (hi) | `approver-hi@demo.local` | `/approvals` | Approve / Reject queue items — Reject opens curated chip reasons. |
| **Admin** | `admin@demo.local` | `/admin/dashboard` | Approve/blacklist pending suppliers, manage users, reset a password. |

Password for all seeded accounts: `Passw0rd!`. Click the **health-dot** in the
top bar at any time to see IAM / Supplier / PO service status; toggle the
sun/moon to switch themes. Visit `/terms` and `/support` from the footer of
the sidebar.

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
