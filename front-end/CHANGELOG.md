# Changelog

All notable changes to the Nexus SCM front-end are documented here. Format
loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added — Phase 4b (Purchase Orders: create wizard + inline line-item editor)
- API: `createPurchaseOrder`, `addLineItem`, `updateLineItem`, `deleteLineItem`.
- `poSchema.js` — zod schemas (`poCreateSchema`, `lineItemSchema`,
  `poDeliveryAddressSchema`); `emptyPoDraft`, `toCreatePayload`,
  `computeLineTotal`, `computeTotals` helpers; `UOM_OPTIONS`.
- **PurchaseOrderWizard** — 4-step wizard mirroring the Supplier wizard:
  - Step 1: Supplier picker — debounced search via `/suppliers/search`,
    falls back to top-rated ACTIVE suppliers when query is empty; non-ACTIVE
    cards are visibly disabled with a tooltip.
  - Step 2: Line items — inline editable table (line #, description, SKU,
    qty, UoM, unit price, tax %), live line + grand totals, add/remove rows.
  - Step 3: Delivery & terms — currency, expected delivery date, payment
    terms chip group, India-only address flow (country chip locked; state
    chips → city chips → auto-fill pin); optional notes.
  - Step 4: Review — supplier summary, delivery summary, items table, totals.
  - Stepped header turns green ✓ when each step's fields validate.
- **PurchaseOrderCreatePage** at `/purchase-orders/new`: mounts the wizard,
  calls `POST /api/v1/purchase-orders`, toasts on success and routes to the
  new PO's detail page. Surfaces `SUPPLIER_NOT_ACTIVE`, `SUPPLIER_NOT_FOUND`,
  and `VALIDATION_FAILED` inline.
- **LineItemEditor** — inline editor swapped into the Detail page **only**
  when the PO is in DRAFT and the user is BUYER/ADMIN. Per-row Edit/Save/
  Cancel, Add line item, Delete with confirm. Wires
  `POST/PATCH/DELETE /line-items` and invalidates the line-items + PO
  queries on each mutation. Falls back to read-only table otherwise.
- Routes: `/purchase-orders/new` now mounts the real Create page; the
  Phase 4b placeholder is gone.

### Added — Phase 4a (Purchase Orders: list + detail)
- `src/api/purchaseOrders.js` — list / search / get / get-line-items +
  all status-transition endpoints + aggregations.
- `poActions.js` — declarative map of allowed PO actions by status × role
  (BUYER vs APPROVER vs ADMIN), plus per-action metadata (input kind:
  `plain` | `reason` | `date`, danger flag, variant).
- `usePoAction` hook — mutations + cache invalidation + curated success /
  error toasts. Auto-approval is surfaced via a distinct "Auto-approved"
  toast when `submit` returns `auto_approved: true`. Handles
  `APPROVAL_LIMIT_EXCEEDED` and `INVALID_STATUS_TRANSITION` gracefully.
- `PoActionDialog` — picks the right confirm modal flavour per action
  (plain confirm, reason capture with curated chips, or date capture for
  Fulfill).
- New page **PurchaseOrderListPage** at `/purchase-orders`:
  - Default view = **Kanban** grouped by status (DRAFT → SUBMITTED →
    APPROVED → FULFILLED → CLOSED + REJECTED, CANCELLED columns).
  - Also supports Table and Card views (Pagination on both). Choice
    persists to `localStorage.gep.po.view`.
  - Filters: status (Table/Card), debounced full-text `q` search.
  - "Create PO" CTA wired to a Phase 4b placeholder for now.
- New page **PurchaseOrderDetailPage** at `/purchase-orders/:id`:
  - Header with PO number, supplier snapshot, status badge,
    "Needs approval" hint for DRAFT POs over the threshold.
  - KPI tiles: Total / Subtotal / Tax / Expected delivery.
  - Status-driven **action bar** with Submit / Approve / Reject /
    Fulfill / Cancel / Revise / Close as the user's role + status allow.
  - Line items table (separate `GET /line-items` call, normalised for
    both array and `{data}` shapes), Delivery & terms panel with all
    state timestamps, Ship-to address, Notes, and Rejection reason.
- Routes for `/purchase-orders` and `/purchase-orders/:id`.

### Changed — Confirm-with-reason UX
- `ConfirmWithReason` modal now supports an optional `reasonPresets[]`
  prop. When provided it renders a chip group of curated reasons + an
  "Other…" chip that reveals a textarea on selection. Falls back to the
  plain textarea when no presets are supplied.
- New constants module `reasonPresets.js` with curated lists for
  Supplier Blacklist, Supplier Deactivate, PO Reject, PO Cancel.
- Supplier Blacklist + Deactivate now use the curated chip picker.

### Added — Phase 3c (Suppliers: admin actions)
- API methods: `approveSupplier`, `deactivateSupplier`, `reactivateSupplier`,
  `blacklistSupplier`, `deleteSupplier`.
- New UI primitives: `Menu` (lightweight dropdown / kebab) and
  `ConfirmWithReason` (modal with optional required `reason` textarea).
- `supplierActions.js` — declarative map of which actions are available per
  status + per-action metadata (title, description, danger, requires reason).
- `useSupplierAction` hook — wires the mutation, cache invalidation, toasts,
  and the `INVALID_STATUS_TRANSITION` refresh fallback.
- `SupplierActionMenu` — reusable kebab + confirm modal for any supplier
  record (used in list table and card views, admin only).
- Status-driven **action bar** on Supplier Detail (admin only) with explicit
  buttons (Approve / Deactivate / Reactivate / Blacklist / Delete) gated by
  the current status.
- New page **AdminSupplierPendingPage** at `/admin/suppliers/pending`:
  paginated list of `PENDING_APPROVAL` suppliers with inline Approve /
  Blacklist actions; replaces the Phase 1 placeholder.

### Changed — Suppliers create UX
- Supplier Create is now a **4-step wizard** (Identity → Contact → Address →
  Commercial) with a stepped header that turns green ✓ when a step's
  validation passes. Steps can be navigated by clicking a previously
  completed step.
- **Country is fixed to India** in the wizard. State picker uses chips
  spanning all 28 states + 8 UTs; selecting a state reveals city chips for
  that state, and selecting a city auto-fills the postal code with a
  curated default (user can still edit). Top-level + address country are
  pinned to `IN`, currency defaults to `INR`, region to `APAC`.
- **Category, sub-category, and payment terms are now chip pickers**
  (single-select). Sub-category chips are filtered by the chosen category;
  a small input + "Use" button lets the user submit a custom sub-category
  value not in the suggestion list.
- New primitive: `ChipGroup` (radio-style pill toggle, supports wrap or
  fixed columns, optional `maxHeight` for scrollable chip lists).
- New constants: `INDIA_STATES`, `citiesForState`, `pinForCity`,
  `SUBCATEGORIES_BY_CATEGORY`, `subcategoriesFor`.
- Supplier Edit stays as a single-page form but adopts the same chip
  pickers for category / sub-category / payment terms.

### Added — Phase 3b (Suppliers: create + edit)
- Dependencies: `react-hook-form`, `zod`, `@hookform/resolvers`.
- `supplierSchema.js` — zod schemas for create (full) and update
  (partial, `supplier_code` omitted as immutable), plus helpers
  (`emptySupplier`, `supplierToFormValues`, `pruneEmpty`).
- Reusable `SupplierForm` covering Identity, Contact, Address, and
  Commercial sections; ISO-2 country / ISO-3 currency input guards;
  tag chip input.
- `SupplierCreatePage` (`/suppliers/new`): `POST /api/v1/suppliers`,
  toast on success, surfaces `DUPLICATE_RESOURCE` (supplier_code) and
  `VALIDATION_FAILED` inline, redirects to the new supplier's detail.
- `SupplierEditPage` (`/suppliers/:id/edit`): pre-loads with
  `GET /api/v1/suppliers/:id`, sends `PATCH` with empty optionals
  stripped, invalidates list + detail cache.
- "Create supplier" button on list (BUYER/ADMIN only) and "Edit" on
  detail; routes guarded by `RequireRole`.
- New `Field` form primitive (label + error + hint).

### Added — Phase 3a (Suppliers: view + detail)
- `src/api/suppliers.js` — list / search / get / scorecard / aggregations
  bindings for the Supplier service.
- `src/hooks/useDebouncedValue.js` — generic debounce hook (used by list
  search box).
- Data composites under `src/components/data/`:
  - `DataTable` — TanStack Table + react-virtual; sortable headers,
    sticky thead, virtualized rows, skeleton loading state.
  - `DataCardGrid` — responsive card grid with skeletons.
  - `DataKanban` — display-only column board grouped by a key (no DnD).
  - `ViewSwitcher` — Table / Cards / Kanban toggle.
  - `Pagination` — page + page-size control wired to back-end
    `{ data, page, page_size, total }`.
- UI primitives: `Input`, `Select`, `Tabs`, `EmptyState`.
- `SupplierListPage` (`/suppliers`) — three views, status / category /
  country filters, debounced full-text search via the list endpoint's `q`
  param, server pagination, persists chosen view to `localStorage`
  (`gep.suppliers.view`).
- `SupplierDetailPage` (`/suppliers/:id`) — Overview + Scorecard tabs;
  handles `SUPPLIER_NOT_FOUND` with an empty state and back-link.

### Added — Phase 2 (Login)
- Real `LoginPage` wired to `POST /api/v1/auth/login`; persists `{ access_token, user }`
  to `localStorage.gep.auth` and redirects by role (`landingPathFor`).
- Three sample-credential icon buttons under the form
  (Buyer / Approver-hi / Admin) that pre-fill the seed credentials from the
  IAM tests (`*@demo.local` / `Passw0rd!`).
- Inline error banner for `AUTH_FAILED` / network errors; field-level errors
  for `VALIDATION_FAILED`.
- User menu logout now calls `POST /api/v1/auth/logout` before clearing the
  local session.

### Removed
- Phase 1 `LoginPlaceholder` dev role-switcher.

## [0.1.0] — Phase 1: Foundation

### Added
- Vite + React 18 (JavaScript) project scaffold.
- Nexus design tokens (light + dark) in `src/styles/tokens.css`, sourced from
  `docs/ui-artifacts/DESIGN.md`.
- Theme system with `[data-theme]` attribute and pre-paint FOUC guard in
  `index.html`. Persisted to `localStorage` (`gep.theme`).
- AuthProvider skeleton with localStorage persistence (`gep.auth`); JWT decode
  for roles + approval_limit; logout redirect on 401.
- Axios HTTP client with `Authorization` and `X-Correlation-Id` interceptors.
- App shell: collapsible sidebar (240 / 64 px), top bar with logo, search
  placeholder, **clickable service health indicator**, theme toggle, user
  menu placeholder.
- ServiceHealthModal showing live status of IAM / Suppliers / PO via nginx,
  refreshed every 30 s with react-query.
- UI primitives: Button, Modal, Tooltip, Skeleton, Badge, ChartCard.
- Routing skeleton with placeholder dashboards for BUYER / APPROVER / ADMIN
  and a dev-only role switcher (removed in Phase 2).
- nginx reverse proxy config + multi-stage Dockerfile + docker-compose joining
  the back-end's external `gep-network`.
- Standard docs: README, CONTRIBUTING, TROUBLESHOOTING, CHANGELOG, MIT
  LICENSE, `.gitignore`, `.dockerignore`.
