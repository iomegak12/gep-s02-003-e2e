# GEP SCM Platform — UI/UX Designer Specification

> **Audience**: UI/UX designers crafting wireframes and visual designs.
> **Source of truth**: Endpoint contracts in this document were derived from the back-end E2E tests under `back-end/tests/src/tests/{iam,supplier,po,cross-service}`. Treat the field names and error codes here as authoritative.
> **Not in scope**: Visual treatment (typography, exact colors, spacing). This doc describes *what* each screen does and *what data* it exchanges, not how it should look pixel-perfect.

---

## 1. Overview

### Product

The GEP SCM Platform is a procurement system that unifies **Supplier Master Data Management** with a first-class **Purchase Order (PO) workflow**. It replaces fragmented supplier records and email-driven approvals with a single directory, explicit state machines, and built-in spend analytics.

### Personas (roles)

| Role | One-line responsibility |
|------|------------------------|
| **BUYER** | Creates and manages suppliers and purchase orders; submits POs for approval; tracks fulfilment. |
| **APPROVER** | Reviews submitted POs and approves/rejects them subject to their personal `approval_limit`. |
| **ADMIN** | Manages users (create, roles, reset password); approves/blacklists/deactivates suppliers; full read access. |

### Back-end services consumed

| Service | Base URL | Purpose |
|---------|----------|---------|
| IAM | `http://localhost:3001` | Authentication, users, roles, profile |
| Supplier | `http://localhost:3002` | Supplier master + state transitions + scorecard + aggregations |
| Purchase Order | `http://localhost:3003` | PO + line items + workflow + spend analytics |

### Authentication model

- The UI logs in once against IAM, receives an `access_token` (JWT, ~24 h), and attaches it to **every** request to all three services as `Authorization: Bearer <token>`.
- Every request must also carry an `X-Correlation-Id` header (UUID generated client-side); errors echo it back so the user can quote it to support.
- There is **no signup** — accounts are created by ADMINs.
- There are **no refresh tokens**; on 401 `TOKEN_INVALID` redirect to login.

### Standard error envelope

Every non-2xx response (except `/health`) returns:

```json
{ "error": { "code": "ERROR_CODE", "message": "Human readable text", "correlation_id": "uuid" } }
```

| Error code | Typical status | When the UI sees it | Suggested user message |
|------------|----------------|---------------------|------------------------|
| `AUTH_REQUIRED` | 401 | Missing token | "Please sign in." |
| `TOKEN_INVALID` | 401 | Malformed/expired token | "Your session expired — please sign in again." |
| `AUTH_FAILED` | 401 | Bad credentials | "Email or password is incorrect." |
| `INSUFFICIENT_ROLE` | 403 | Role not allowed | "You don't have permission to do this." |
| `APPROVAL_LIMIT_EXCEEDED` | 403 | Approver's limit < PO total | "This PO exceeds your approval limit." |
| `VALIDATION_FAILED` | 400 | Missing/invalid fields | Show inline field-level errors from `error.details`. |
| `INVALID_CURRENT_PASSWORD` | 400 | Change-password mismatch | "Current password is incorrect." |
| `DUPLICATE_RESOURCE` | 409 | Email or supplier_code already exists | "This {field} is already in use." |
| `INVALID_STATUS_TRANSITION` | 409 | Action not allowed in current state | "Action not available — current status: {status}." |
| `INVALID_STATE_FOR_EDIT` | 409 | Editing line items on non-DRAFT PO | "Line items can only be edited while the PO is in DRAFT." |
| `SUPPLIER_NOT_ACTIVE` | 422 | PO creation against non-ACTIVE supplier | "Supplier is not active and cannot receive new POs." |
| `SUPPLIER_NOT_FOUND` | 404 | Unknown supplier id | "Supplier not found." |
| `PURCHASE_ORDER_NOT_FOUND` | 404 | Unknown PO id | "Purchase order not found." |
| `USER_NOT_FOUND` | 404 | Unknown user id | "User not found." |

Always surface the `correlation_id` inside the error toast's "Details" expander.

---

## 2. Application Shell (all roles)

### Layout

A fixed top navigation bar, a fixed collapsible left navigation rail, and a scrollable main content area. Layout is the same across all roles; only left-nav items change.

### Top navigation (left → right)

1. **App logo / wordmark** — links to the role-appropriate dashboard.
2. **Global search box** — placeholder "Search suppliers, POs…" — on submit, decides intent by selected scope (Suppliers vs POs) and routes to the matching search results screen.
3. **Service health indicator** — three small dots labelled `IAM`, `SUP`, `PO`. Each polls its respective `GET /health` every 30 seconds. Green = `{ok: true}` within 2 s; amber = slow; red = error/timeout. Tooltip on hover shows last check time per service.
4. **Theme toggle** — sun/moon icon. Toggles between light and dark theme. Persisted to `localStorage` key `gep.theme`.
5. **User avatar menu** — initials/avatar; dropdown items:
   - "My Profile" → `/profile`
   - "Settings" → `/settings`
   - "Logout" → calls `POST /api/v1/auth/logout`, clears token, routes to `/login`.

### Left navigation

Collapsible (icon-only when collapsed). Items are filtered by the current user's `roles[]` claim — see each persona journey below for the item list.

### Global UI states

- **Loading**: skeleton placeholders for tables, spinner for buttons.
- **Empty**: friendly illustration + one-line message + primary CTA (e.g., "No suppliers yet — Create one").
- **Error**: toast with `error.message`, expandable "Details" showing `error.code` and `correlation_id`. For per-field errors (`VALIDATION_FAILED` with `details`), render inline beneath the offending field.

---

## 3. Auth & Shell Screens (all roles)

### 3.1 Login screen

- **Route**: `/login`
- **Purpose**: authenticate the user.
- **Primary action**: Sign in.

**Inputs**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Email | text (email) | yes | |
| Password | password | yes | |

**Calls**: `POST /api/v1/auth/login` body `{ email, password }`.

**Outputs (success 200)**

| Field | Use |
|-------|-----|
| `access_token` | Store in memory + sessionStorage; attach to all future requests. |
| `token_type` | Expect `"Bearer"`. |
| `expires_in` | Number of seconds; schedule a logout warning before expiry. |
| `user.email` | Display in top-right menu. |
| `user.roles[]` | Drives left-nav and post-login redirect (BUYER → Buyer Dashboard, APPROVER → Approvals Inbox, ADMIN → Admin Dashboard). |
| `user.approval_limit` | Shown on profile if APPROVER. |

**Error states**: `AUTH_FAILED` (inline below the form), `VALIDATION_FAILED` (per field).

### 3.2 Logout

- Triggered from the user menu only.
- Calls `POST /api/v1/auth/logout` (body `{}`); on 204 clear token + route to `/login`.

### 3.3 Profile screen

- **Route**: `/profile`
- **Purpose**: read-only view of the current user.
- **Calls**: `GET /api/v1/auth/me`.

**Display**

| Field | Notes |
|-------|-------|
| `email` | read-only |
| `roles[]` | rendered as role chips |
| `approval_limit` | only shown when role includes `APPROVER`; formatted as currency |

### 3.4 Settings screen

- **Route**: `/settings`
- **Purpose**: change password, theme preference, debug toggles.

**Sections**

1. **Change Password**
   - Fields: Current password, New password, Confirm new password (client-side match).
   - Calls `PATCH /api/v1/auth/me/password` body `{ current_password, new_password }`.
   - Success: 204 — show toast "Password updated".
   - Error: `INVALID_CURRENT_PASSWORD` inline on current-password field.
2. **Appearance** — light/dark theme selector (mirrors the top-bar toggle).
3. **Debug** — checkbox "Show correlation IDs in success toasts" (off by default).

---

## 4. Buyer Journey

### Left nav for BUYER

1. Dashboard
2. Suppliers
3. Purchase Orders
4. *(footer)* My Profile

### 4.1 Buyer Dashboard

- **Route**: `/buyer/dashboard`
- **Purpose**: at-a-glance view of supplier health and spend.

**Cards / panels** (all driven by GET endpoints, no inputs other than optional `year`):

| Panel | Endpoint | Display |
|-------|----------|---------|
| Suppliers by status | `GET /api/v1/suppliers/aggregations/by-status` | Donut chart, counts per status |
| Suppliers by category | `GET /api/v1/suppliers/aggregations/by-category` | Bar chart, top N |
| Suppliers by country | `GET /api/v1/suppliers/aggregations/by-country` | World map or bar chart |
| Monthly spend | `GET /api/v1/purchase-orders/aggregations/monthly-spend?year={YYYY}` | Line/bar chart with year selector |
| Top suppliers by spend (YTD) | `GET /api/v1/purchase-orders/aggregations/spend-by-supplier?period=ytd&limit=5` | Ranked table |
| Cycle time | `GET /api/v1/purchase-orders/aggregations/cycle-time` | KPI card showing `avg_days` and `median_days` |

### 4.2 Supplier List

- **Route**: `/suppliers`
- **Purpose**: browse and filter the supplier directory.

**Inputs (query params on `GET /api/v1/suppliers`)**

| Filter | Type | Default |
|--------|------|---------|
| `page` | number | 1 |
| `page_size` | number | 20 |
| `status` | enum (`PENDING_APPROVAL`, `ACTIVE`, `INACTIVE`, `BLACKLISTED`) | (none = all) |

Plus a search box that calls `GET /api/v1/suppliers/search?q={q}&limit=20` and routes results to a results panel.

**Outputs**

A paginated table with columns: `supplier_code`, `display_name`, `category`, `country`, `status` (badge), `created_at`. Row click → Supplier Detail. "Create supplier" button top-right.

### 4.3 Supplier Detail

- **Route**: `/suppliers/:id`
- **Calls**: `GET /api/v1/suppliers/:id` and `GET /api/v1/suppliers/:id/scorecard` in parallel.

**Display tabs**

1. **Overview** — all master fields: `supplier_code`, `legal_name`, `display_name`, `category`, `sub_category`, `country`, `region`, `tax_id`, contact block (`primary_name`, `email`, `phone`), address block, `payment_terms`, `currency`, `tags[]`, `status`, `created_at`.
2. **Scorecard** — `rating`, `on_time_delivery_rate`, `total_orders_count` (any missing fields rendered as "—").

**Actions** (BUYER): "Edit" button → Supplier Edit screen.

**Error**: 404 `SUPPLIER_NOT_FOUND` → empty state with "Back to suppliers".

### 4.4 Supplier Create

- **Route**: `/suppliers/new`
- **Calls**: `POST /api/v1/suppliers`

**Inputs**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| supplier_code | text | yes | Must be unique — surface `DUPLICATE_RESOURCE` |
| legal_name | text | yes | |
| display_name | text | yes | |
| category | enum | yes | (e.g., RAW_MATERIALS, LOGISTICS — list TBC) |
| sub_category | text | no | |
| country | text (ISO) | yes | |
| region | text | no | |
| tax_id | text | yes | |
| contact.primary_name | text | yes | |
| contact.email | email | yes | |
| contact.phone | tel | yes | |
| address.street | text | yes | |
| address.city | text | yes | |
| address.state | text | yes | |
| address.country | text | yes | |
| address.postal_code | text | yes | |
| payment_terms | text | yes | e.g., NET30 |
| currency | text (ISO) | yes | e.g., INR |
| tags | chip input | no | |

**Output (201)**: redirect to Supplier Detail with toast "Supplier submitted — status PENDING_APPROVAL".

### 4.5 Supplier Edit

- **Route**: `/suppliers/:id/edit`
- **Calls**: `PATCH /api/v1/suppliers/:id` (partial — only changed fields).
- Same field layout as Create; `supplier_code` is read-only.

### 4.6 PO List

- **Route**: `/purchase-orders`
- **Calls**: `GET /api/v1/purchase-orders?page=&page_size=&status=`

**Filters**: status chip row (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `FULFILLED`, `CLOSED`, `CANCELLED`).

**Columns**: `po_number`, supplier (from `supplier_snapshot.display_name`), `total_amount` + currency, `status` (badge), `expected_delivery_date`, `created_at`. Row click → PO Detail.

Top-right "Create PO" button.

### 4.7 PO Create wizard

- **Route**: `/purchase-orders/new`
- 3-step wizard:

**Step 1 — Choose supplier**
Search box → `GET /api/v1/suppliers/search?q=`; only suppliers with `status: ACTIVE` are selectable (others shown disabled with a tooltip "Not active").

**Step 2 — Line items**
Inline editable table (Add row button). Per row:

| Field | Type | Required |
|-------|------|----------|
| line_number | number (auto) | yes |
| item_description | text | yes |
| quantity | number | yes |
| unit_of_measure | text (EA / KG / HR …) | yes |
| unit_price | number | yes |
| tax_rate | number (0..1) | yes |

Live total row.

**Step 3 — Review & submit**
Form fields:

| Field | Type | Required |
|-------|------|----------|
| currency | text (ISO) | yes |
| payment_terms | text | yes |
| expected_delivery_date | date | yes |
| delivery_address (street/city/state/country/postal_code) | block | yes |
| notes | textarea | no |

On "Create" → `POST /api/v1/purchase-orders` with full payload. Success 201 → redirect to PO Detail with toast "PO {po_number} created in DRAFT".

**Errors**: `VALIDATION_FAILED` (line items empty etc.), `SUPPLIER_NOT_ACTIVE` (return to step 1 with banner), `SUPPLIER_NOT_FOUND`.

### 4.8 PO Detail (Buyer view)

- **Route**: `/purchase-orders/:id`
- **Calls**: `GET /api/v1/purchase-orders/:id` and `GET /api/v1/purchase-orders/:id/line-items`.

**Header**: `po_number`, status badge, supplier name (snapshot), total amount, expected delivery date, created date.

**Body**: line items table; below that, delivery address + notes + payment terms.

**Action bar — visible by current status**

| Status | BUYER actions |
|--------|---------------|
| DRAFT | Edit line items (add/edit/delete), Submit, Cancel, Edit header |
| SUBMITTED | Cancel |
| APPROVED | Fulfill, Cancel |
| REJECTED | Revise |
| FULFILLED | Close |
| CLOSED / CANCELLED | (read-only) |

**Action mappings**

| Button | Call | Body | Notes |
|--------|------|------|-------|
| Submit | `POST /api/v1/purchase-orders/:id/submit` | `{}` | If response `auto_approved: true`, show toast "Auto-approved (under threshold)". |
| Fulfill | `POST /api/v1/purchase-orders/:id/fulfill` | `{ actual_delivery_date: "YYYY-MM-DD" }` | Date picker modal |
| Close | `POST /api/v1/purchase-orders/:id/close` | `{}` | |
| Cancel | `POST /api/v1/purchase-orders/:id/cancel` | `{ reason }` | Confirm-with-reason modal |
| Revise | `POST /api/v1/purchase-orders/:id/revise` | `{}` | Returns PO to DRAFT |

Errors to handle: `INVALID_STATUS_TRANSITION`, `INVALID_STATE_FOR_EDIT`.

### 4.9 PO Line Item editor (inline on PO Detail when DRAFT)

| Action | Call |
|--------|------|
| Add | `POST /api/v1/purchase-orders/:id/line-items` body `{line_number, item_description, quantity, unit_of_measure, unit_price, tax_rate}` → 201 |
| Edit | `PATCH /api/v1/purchase-orders/:id/line-items/:lineId` body partial |
| Delete | `DELETE /api/v1/purchase-orders/:id/line-items/:lineId` |
| List | `GET /api/v1/purchase-orders/:id/line-items` |

---

## 5. Approver Journey

### Left nav for APPROVER

1. Approvals Inbox
2. Purchase Orders (read)
3. Dashboard
4. *(footer)* My Profile

### 5.1 Approvals Inbox

- **Route**: `/approvals`
- **Purpose**: queue of POs awaiting this approver.
- **Calls**: `GET /api/v1/purchase-orders/aggregations/pending-approvals` (server already filters to approver's `approval_limit`).

**Columns**: `po_number`, supplier name, `total_amount`, `expected_delivery_date`, age (days since submission), Approve / Reject buttons.

**Row actions**

| Button | Call | Body |
|--------|------|------|
| Approve | `POST /api/v1/purchase-orders/:id/approve` | `{}` |
| Reject | `POST /api/v1/purchase-orders/:id/reject` | `{ reason }` |

Approve error `APPROVAL_LIMIT_EXCEEDED` → toast "This PO ({total_amount}) exceeds your approval limit ({user.approval_limit})." `INVALID_STATUS_TRANSITION` → toast "PO is no longer awaiting approval — refreshing." (then refresh).

### 5.2 PO Detail (Approver view)

Same as Buyer view minus mutate-the-PO actions; only Approve / Reject. Auto-approved POs and rejected POs are read-only.

### 5.3 Approver Dashboard

Same aggregation cards as the Buyer Dashboard (spend, cycle-time, monthly spend), with the **Pending approvals count** card at the top, linking to Approvals Inbox.

---

## 6. Admin Journey

### Left nav for ADMIN

1. Dashboard
2. Users
3. Suppliers (review queue + full list)
4. Purchase Orders (read)
5. *(footer)* My Profile

### 6.1 Admin Dashboard

- **Route**: `/admin/dashboard`
- Panels:
  - Total users (from `GET /api/v1/auth/users?page=1&page_size=1` → `total`)
  - Suppliers by status (same endpoint as Buyer)
  - POs by status (`GET /api/v1/purchase-orders/aggregations/by-status`)
  - Top suppliers by spend (YTD) (`spend-by-supplier?period=ytd&limit=10`)

### 6.2 User List

- **Route**: `/admin/users`
- **Calls**: `GET /api/v1/auth/users?page=&page_size=`
- **Columns**: email, full name, roles (chips), `approval_limit` (if APPROVER), `is_active` (badge).
- Top-right "Create user" button. Row click → User Detail.

### 6.3 User Detail

- **Route**: `/admin/users/:id`
- **Calls**: `GET /api/v1/auth/users/:id`
- Displays all fields read-only with Edit / Reset Password buttons.
- 404 `USER_NOT_FOUND` → empty state.

### 6.4 User Create

- **Route**: `/admin/users/new`
- **Calls**: `POST /api/v1/auth/users`

| Field | Type | Required |
|-------|------|----------|
| email | email | yes — `DUPLICATE_RESOURCE` if taken |
| full_name | text | yes |
| password | password | yes — show strength meter |
| roles | multi-select chips (`BUYER`, `APPROVER`, `ADMIN`) | yes |
| approval_limit | number | required when roles includes `APPROVER` |

### 6.5 User Edit

- **Route**: `/admin/users/:id/edit`
- **Calls**: `PATCH /api/v1/auth/users/:id` body partial `{roles?, approval_limit?, is_active?}`.

### 6.6 Reset Password modal

- Opens from User Detail / User List row action.
- **Calls**: `POST /api/v1/auth/users/:id/reset-password` body `{ password }`.
- Success 204 → toast "Password reset. Share new password with user securely."

### 6.7 Supplier Approval queue

- **Route**: `/admin/suppliers/pending`
- **Calls**: `GET /api/v1/suppliers?status=PENDING_APPROVAL`
- Same columns as buyer's Supplier List + per-row actions:

| Button | Call | Body |
|--------|------|------|
| Approve | `POST /api/v1/suppliers/:id/approve` | `{}` |
| Deactivate | `POST /api/v1/suppliers/:id/deactivate` | `{ reason }` |
| Reactivate | `POST /api/v1/suppliers/:id/reactivate` | `{}` |
| Blacklist | `POST /api/v1/suppliers/:id/blacklist` | `{ reason }` |
| Delete | `DELETE /api/v1/suppliers/:id` | (confirm modal) |

Errors: `INSUFFICIENT_ROLE` (shouldn't happen for ADMIN), `INVALID_STATUS_TRANSITION` (e.g., approving an already-ACTIVE supplier — refresh row).

### 6.8 Supplier Full List (admin view)

Same as Buyer Supplier List with all admin actions exposed in a row kebab menu.

---

## 7. Shared Component Catalog

### 7.1 Service Health Indicator

Three labelled dots (IAM / SUP / PO) in the top nav. Each polls `GET /health` on its respective service every 30 s. Tooltip on hover shows: service name, last check timestamp, last response time. Click opens a small popover listing all three with the same data.

### 7.2 Theme Toggle

Single icon button. Toggles between `light` and `dark`. Persists choice to `localStorage` (`gep.theme`); defaults to system preference on first load.

### 7.3 Status Badges

Color-coded labels used in tables and detail headers.

| Supplier status | Suggested color treatment |
|-----------------|---------------------------|
| PENDING_APPROVAL | amber |
| ACTIVE | green |
| INACTIVE | grey |
| BLACKLISTED | red |

| PO status | Suggested color treatment |
|-----------|---------------------------|
| DRAFT | grey |
| SUBMITTED | blue |
| APPROVED | green |
| REJECTED | red |
| FULFILLED | teal |
| CLOSED | dark-grey |
| CANCELLED | red-outline |

### 7.4 Error Toast

Title = `error.message`. Collapsible "Details" reveals `error.code` and `correlation_id` (copy-to-clipboard icon). Auto-dismiss after 6 s unless the toast is an error (errors require manual dismiss).

### 7.5 Pagination Control

Consistent across all list endpoints, which always return `{ data[], page, page_size, total }`. Controls: First / Prev / page input / Next / Last + page-size selector (10 / 20 / 50 / 100).

### 7.6 Confirm-with-Reason Modal

Used by Reject (PO), Cancel (PO), Blacklist (Supplier), Deactivate (Supplier). Fields: required `reason` textarea (min 5 chars), Cancel / Confirm buttons. Confirm sends `{ reason }` to the corresponding endpoint.

### 7.7 Status-Transition Action Bar

Generic pattern reused on both Supplier Detail and PO Detail: the visible buttons depend on the current `status`. When the back-end returns `INVALID_STATUS_TRANSITION`, the bar should refetch the entity and re-render — the state changed under the user.

---

## 8. Navigation Map

### Public

| Route | Screen |
|-------|--------|
| `/login` | Login |

### Authenticated — common

| Route | Screen | Roles |
|-------|--------|-------|
| `/profile` | Profile | all |
| `/settings` | Settings | all |

### BUYER routes

| Route | Screen |
|-------|--------|
| `/buyer/dashboard` | Buyer Dashboard |
| `/suppliers` | Supplier List |
| `/suppliers/new` | Supplier Create |
| `/suppliers/:id` | Supplier Detail |
| `/suppliers/:id/edit` | Supplier Edit |
| `/purchase-orders` | PO List |
| `/purchase-orders/new` | PO Create wizard |
| `/purchase-orders/:id` | PO Detail (Buyer) |

### APPROVER routes

| Route | Screen |
|-------|--------|
| `/approvals` | Approvals Inbox |
| `/approver/dashboard` | Approver Dashboard |
| `/purchase-orders` | PO List (read-only) |
| `/purchase-orders/:id` | PO Detail (Approver) |

### ADMIN routes

| Route | Screen |
|-------|--------|
| `/admin/dashboard` | Admin Dashboard |
| `/admin/users` | User List |
| `/admin/users/new` | User Create |
| `/admin/users/:id` | User Detail |
| `/admin/users/:id/edit` | User Edit |
| `/admin/suppliers/pending` | Supplier Approval queue |
| `/suppliers` | Supplier Full List |
| `/suppliers/:id` | Supplier Detail (admin actions) |
| `/purchase-orders` | PO List (read) |
| `/purchase-orders/:id` | PO Detail (read) |

### Post-login routing

| Role(s) include | Land on |
|-----------------|---------|
| ADMIN | `/admin/dashboard` |
| APPROVER (and not ADMIN) | `/approvals` |
| BUYER only | `/buyer/dashboard` |
| Multiple non-admin roles | `/buyer/dashboard` (with role switcher in top bar) |

---

## 9. Endpoint Coverage Matrix

Every endpoint covered by E2E tests, mapped to the screen(s) that consume it. Designers can use this to confirm no functionality is orphaned.

### IAM

| Endpoint | Screen(s) |
|----------|-----------|
| `GET /health` | Health Indicator |
| `POST /api/v1/auth/login` | Login |
| `POST /api/v1/auth/logout` | Top-nav user menu |
| `GET /api/v1/auth/me` | Profile |
| `PATCH /api/v1/auth/me/password` | Settings |
| `GET /api/v1/auth/users` | Admin → User List, Admin Dashboard total |
| `POST /api/v1/auth/users` | Admin → User Create |
| `GET /api/v1/auth/users/:id` | Admin → User Detail |
| `PATCH /api/v1/auth/users/:id` | Admin → User Edit |
| `POST /api/v1/auth/users/:id/reset-password` | Admin → Reset Password modal |

### Supplier

| Endpoint | Screen(s) |
|----------|-----------|
| `GET /health` | Health Indicator |
| `POST /api/v1/suppliers` | Supplier Create |
| `GET /api/v1/suppliers` | Supplier List, Admin Supplier Approval queue |
| `GET /api/v1/suppliers/:id` | Supplier Detail |
| `PATCH /api/v1/suppliers/:id` | Supplier Edit |
| `DELETE /api/v1/suppliers/:id` | Admin Supplier Approval queue / Detail |
| `POST /api/v1/suppliers/:id/approve` | Admin Supplier Approval queue |
| `POST /api/v1/suppliers/:id/deactivate` | Admin Supplier actions |
| `POST /api/v1/suppliers/:id/reactivate` | Admin Supplier actions |
| `POST /api/v1/suppliers/:id/blacklist` | Admin Supplier actions |
| `GET /api/v1/suppliers/:id/scorecard` | Supplier Detail → Scorecard tab |
| `GET /api/v1/suppliers/search` | Global search, PO Create Step 1 |
| `GET /api/v1/suppliers/aggregations/by-category` | Buyer Dashboard |
| `GET /api/v1/suppliers/aggregations/by-country` | Buyer Dashboard |
| `GET /api/v1/suppliers/aggregations/by-status` | Buyer & Admin Dashboards |
| `GET /api/v1/suppliers/aggregations/top-rated` | (optional Buyer Dashboard panel) |

### Purchase Order

| Endpoint | Screen(s) |
|----------|-----------|
| `GET /health` | Health Indicator |
| `POST /api/v1/purchase-orders` | PO Create wizard |
| `GET /api/v1/purchase-orders` | PO List |
| `GET /api/v1/purchase-orders/:id` | PO Detail |
| `POST /api/v1/purchase-orders/:id/submit` | PO Detail (Buyer) |
| `POST /api/v1/purchase-orders/:id/approve` | Approvals Inbox / PO Detail (Approver) |
| `POST /api/v1/purchase-orders/:id/reject` | Approvals Inbox / PO Detail (Approver) |
| `POST /api/v1/purchase-orders/:id/fulfill` | PO Detail (Buyer) |
| `POST /api/v1/purchase-orders/:id/close` | PO Detail (Buyer) |
| `POST /api/v1/purchase-orders/:id/cancel` | PO Detail (Buyer) |
| `POST /api/v1/purchase-orders/:id/revise` | PO Detail (Buyer) |
| `POST /api/v1/purchase-orders/:id/line-items` | PO Detail line-item editor |
| `GET /api/v1/purchase-orders/:id/line-items` | PO Detail |
| `PATCH /api/v1/purchase-orders/:id/line-items/:lineId` | PO Detail line-item editor |
| `DELETE /api/v1/purchase-orders/:id/line-items/:lineId` | PO Detail line-item editor |
| `GET /api/v1/purchase-orders/search` | Global search |
| `GET /api/v1/purchase-orders/aggregations/by-status` | Admin Dashboard, PO List filters |
| `GET /api/v1/purchase-orders/aggregations/spend-by-supplier` | Buyer / Admin Dashboards |
| `GET /api/v1/purchase-orders/aggregations/spend-by-category` | Buyer Dashboard |
| `GET /api/v1/purchase-orders/aggregations/monthly-spend` | Buyer / Approver Dashboards |
| `GET /api/v1/purchase-orders/aggregations/pending-approvals` | Approvals Inbox |
| `GET /api/v1/purchase-orders/aggregations/cycle-time` | Buyer / Approver Dashboards |

---

## 10. Cross-cutting behaviour the designer should know about

- **Auto-approval**: when a buyer submits a PO whose `total_amount` ≤ approval threshold, the response comes back with `status: APPROVED` and `auto_approved: true`. UI should celebrate this with a distinct toast and skip "awaiting approval" messaging.
- **Supplier snapshot**: PO list/detail should display supplier info from `supplier_snapshot` (frozen at PO creation), not by re-fetching the supplier — so a renamed/blacklisted supplier still shows the name as it was on the PO.
- **Blacklist propagation**: blacklisting a supplier does NOT cancel existing POs; it only blocks *new* PO creation. UI should not imply otherwise.
- **Pagination**: every list endpoint uses `{ data, page, page_size, total }`. One reusable pagination component suffices.
- **Correlation-id**: generate a UUID per request; send as `X-Correlation-Id`; capture it from error envelopes for support tickets.
