# GEP SCM Platform — UI Designer Prompt

> Paste this into v0 / Lovable / Figma AI / Claude / any AI design tool. For full per-screen I/O contracts, refer to `GEP_SCM_Platform_UI_Spec.md` in the same folder.

---

## Product context

Design a modern, enterprise-grade Supply Chain Management (SCM) web app that unifies **supplier master data management** and a **purchase-order (PO) workflow with approvals and spend analytics**. Backend is three microservices: **IAM** (auth & users), **Supplier** (master + state machine + scorecard), **Purchase Order** (PO + line items + workflow + spend). The UI consumes them over HTTP+JSON with a bearer JWT.

The product serves three personas: **BUYER** (creates suppliers and POs), **APPROVER** (approves POs within a personal limit), **ADMIN** (manages users; approves/blacklists suppliers). There is **no signup** — admins create accounts.

Visual direction: clean, dense, data-forward enterprise SaaS (think Linear × Ramp × SAP Ariba but lighter). Light + dark themes. Accessible (WCAG AA). Generous use of badges, status colors, paginated tables, and clear empty/error states.

---

## Global shell (every authenticated screen)

- **Top navigation** (left → right): app logo, global search (suppliers & POs), service health indicator (three small dots: `IAM`, `SUP`, `PO`, polling each service's `/health` every 30s — green/amber/red), theme toggle (light/dark), user avatar menu (Profile / Settings / Logout).
- **Left navigation**: collapsible icon+label rail; items filter by role (see below).
- **Layout**: top + left fixed; main content scrolls.
- **Standard states**: skeleton loaders for tables, friendly empty states with a primary CTA, error toasts that show `error.code` and `correlation_id` in a "Details" expander.

---

## Auth & shell screens (all roles)

- **Login** — email + password; no signup; "session expired" redirect on 401.
- **Profile** — read-only: email, role chips, `approval_limit` (only if APPROVER).
- **Settings** — change password (current + new + confirm); theme preference; debug toggle "show correlation IDs in success toasts".
- **Logout** — from user menu only.

---

## Per-persona journeys (screen lists)

### BUYER

Left nav: **Dashboard · Suppliers · Purchase Orders · My Profile**

Screens:
1. **Buyer Dashboard** — donut: suppliers by status; bars: suppliers by category & country; line: monthly spend (year selector); table: top 5 suppliers by spend YTD; KPI: cycle-time (avg & median days).
2. **Supplier List** — paginated table (supplier_code, display_name, category, country, status badge); status filter chips; search box; "Create supplier".
3. **Supplier Detail** — Overview tab (all master fields incl. contact + address blocks); Scorecard tab (rating, on-time delivery %, total orders); Edit button.
4. **Supplier Create / Edit** — long form with sections: Identity (supplier_code, legal_name, display_name, tax_id), Classification (category, sub_category, tags), Location (country, region, address block), Commercial (payment_terms, currency), Contact (primary_name, email, phone). New supplier always lands in `PENDING_APPROVAL`.
5. **PO List** — paginated table (po_number, supplier name, total + currency, status badge, expected delivery); status filter chips; "Create PO".
6. **PO Create Wizard** — 3 steps: (1) pick an ACTIVE supplier via search; (2) line items inline-editable table (line_number, item_description, quantity, unit_of_measure, unit_price, tax_rate) with live total; (3) review header (currency, payment_terms, expected_delivery_date, delivery address block, notes) then submit.
7. **PO Detail (Buyer)** — header with po_number + status badge + supplier name + total + dates; line items table; action bar whose buttons depend on status: DRAFT → edit line items / Submit / Cancel; SUBMITTED → Cancel; APPROVED → Fulfill (date picker) / Cancel; REJECTED → Revise (back to DRAFT); FULFILLED → Close; CLOSED/CANCELLED → read-only. Auto-approval toast when submitted PO is under threshold (`auto_approved: true`).

### APPROVER

Left nav: **Approvals Inbox · Purchase Orders · Dashboard · My Profile**

Screens:
1. **Approvals Inbox** — server-filtered queue of POs the approver can act on (within their `approval_limit`). Columns: po_number, supplier, total, expected delivery, age in days, Approve / Reject buttons. Reject opens reason modal. Approve over-limit shows friendly message "This PO exceeds your approval limit".
2. **PO Detail (Approver)** — same as Buyer detail but only Approve / Reject actions; otherwise read-only.
3. **Approver Dashboard** — pending approvals count card at top + same spend/cycle-time analytics as buyer.

### ADMIN

Left nav: **Dashboard · Users · Suppliers · Purchase Orders · My Profile**

Screens:
1. **Admin Dashboard** — total users, suppliers by status, POs by status, top suppliers by spend.
2. **User List / Detail / Create / Edit** — fields: email, full_name, password (create only), roles multi-select (BUYER/APPROVER/ADMIN), approval_limit (required if APPROVER), is_active toggle. Row action: **Reset Password modal**.
3. **Supplier Approval Queue** — list of PENDING_APPROVAL suppliers; per row: Approve / Deactivate (reason) / Reactivate / Blacklist (reason) / Delete (confirm). Status transitions are explicit — never edit `status` directly.
4. **Supplier Full List & Detail** — same as buyer's, plus admin actions in a kebab menu on each row.
5. **PO List & Detail** — read-only access to everything.

---

## Component checklist (must exist)

- **Status badge** — supplier statuses: PENDING_APPROVAL (amber), ACTIVE (green), INACTIVE (grey), BLACKLISTED (red). PO statuses: DRAFT (grey), SUBMITTED (blue), APPROVED (green), REJECTED (red), FULFILLED (teal), CLOSED (dark grey), CANCELLED (red outline).
- **Pagination control** — `{page, page_size, total}` from server; First / Prev / page input / Next / Last; page-size selector (10/20/50/100).
- **Confirm-with-reason modal** — used by Reject PO, Cancel PO, Blacklist Supplier, Deactivate Supplier. Required `reason` textarea (min 5 chars).
- **Status-transition action bar** — generic on PO Detail & Supplier Detail; visible buttons depend on current status; on `INVALID_STATUS_TRANSITION` refetch entity and re-render.
- **Error toast** — title = `error.message`; expander shows `error.code` + copyable `correlation_id`; success toasts auto-dismiss, errors require manual dismiss.
- **Health dots** — 3 dots in top nav with hover tooltip (service name, last check time, last response time).
- **Theme toggle** — persist to `localStorage` (`gep.theme`), default to system preference.

---

## Visual + interaction hints

- Modern enterprise SaaS: clean sans-serif, generous padding inside cards but dense tables.
- Both light and dark themes must be designed simultaneously — choose tokens, not raw colors.
- Status colors must work for color-blind users (pair color with icon).
- Currency values right-aligned; dates ISO-formatted (YYYY-MM-DD).
- Approver inbox should feel like an action queue (Linear / Superhuman vibe), not a passive list.
- PO Create wizard should feel like a controlled flow — disable "Next" until step is valid; allow back/edit.

---

## Out of scope

- No signup screen.
- No refresh-token UX (re-auth on 401 only).
- No file uploads, attachments, comments, or notifications in v1.
- No supplier or PO bulk imports.
- No supplier-side portal (this app is for the buying organization only).

---

## For full I/O contracts

See `GEP_SCM_Platform_UI_Spec.md` (same folder). Every field name, request shape, response shape, and error code in this prompt is taken verbatim from the back-end E2E tests under `back-end/tests/src/tests/{iam,supplier,po,cross-service}` and is authoritative.
