# Changelog

All notable changes to the Nexus SCM mobile app are documented here. Versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Phase 1 — Shell, Auth, Onboarding
- Initial Expo SDK 54 scaffold (React Native 0.81, React 19.1, JDK 21, Kotlin 2.1.20, Gradle 8.14.3, AGP 8.7+).
- Expo Router file-based navigation with `/`, `/onboarding/carousel`, `/(auth)/login`, `/(app)/*` route groups.
- AuthContext backed by `expo-secure-store` (access + refresh tokens + cached user).
- Three axios instances (IAM / Supplier / PO) with `Authorization: Bearer`, `X-Correlation-Id`, and 401 silent-refresh interceptor.
- Material 3 theme tokens (Light + Dark) derived from `front-end/docs/ui-artifacts/DESIGN.md`, with system / light / dark toggle persisted to SecureStore.
- Splash screen via `expo-splash-screen` plugin; animated 3-slide onboarding carousel (reanimated FadeIn / FadeInDown).
- Login screen with 4 sample-persona quick-fill icons (Buyer / Approver / Approver-Lo / Admin).
- Drawer shell with persona-filtered menu (Dashboard, Suppliers, Purchase Orders, Approvals, Users, Terms, Contact, Support), top app bar (profile / settings / notifications / health dots).
- Stub screens: Dashboard, Profile, Settings, Notifications, Health, Terms, Contact, Support.
- Phase 2 / 3 entry stubs for Suppliers, Purchase Orders, Users, Approvals.
- Firebase config wired (`app.json` → `android.googleServicesFile`, package `com.redivac.scmplatform`, project `gep-training-platform`).
- Standard project docs: README, CONTRIBUTING, CHANGELOG, TROUBLESHOOTING, MIT LICENSE, `.gitignore`, `.env`, `.env.local`, `.env.prod`.

### Phase 2 — Directories
- Reusable `PaginatedList` component backed by TanStack Query `useInfiniteQuery` (consumes the standard `{data, page, page_size, total}` contract; pull-to-refresh + auto-pagination + empty/error states).
- Shared `StatusFilterBar` (chip row for status filters) and `SearchBar` (debounced search input).
- Lightweight `format.js` helpers (`formatCurrency`, `formatDate`, `daysAgo`).
- **Suppliers Directory** — `GET /api/v1/suppliers` paginated, with status chip filters and `GET /api/v1/suppliers/search?q=` debounced search.
- **Supplier Detail** — `GET /api/v1/suppliers/:id` + `GET /api/v1/suppliers/:id/scorecard`; Overview / Scorecard segmented tabs (read-only).
- **Purchase Orders Directory** — `GET /api/v1/purchase-orders` paginated with status chip filters; cards show PO number, supplier snapshot, total, status badge.
- **Purchase Order Detail** — `GET /api/v1/purchase-orders/:id` + `GET /api/v1/purchase-orders/:id/line-items`; header card with totals, line-item list, dates card, delivery & terms card (read-only, no transitions).
- **Users Directory + Detail** (ADMIN only) — `GET /api/v1/auth/users` and `GET /api/v1/auth/users/:id`; persona-gated with a friendly "Admins only" empty state for other roles.
- Each subfolder has its own `_layout.js` Stack so dynamic `[id].js` detail screens push on top of the directory inside the drawer.
- **Dashboard** wired to real aggregation endpoints: `supplier.aggregations/by-status`, `po.aggregations/by-status`, `po.aggregations/pending-approvals` (approver only), `po.aggregations/monthly-spend`, `po.aggregations/cycle-time`.

### Phase 3 — Approvals
- New reusable `ConfirmWithReasonModal` (Paper `Dialog`) with required reason textarea (min 5 chars), destructive tone, loading state. Designed to be reused by Cancel (PO), Blacklist (Supplier), Deactivate (Supplier) in later phases.
- **Approvals Inbox** (`app/(app)/approvals/index.js`) — paginated list of POs in `SUBMITTED` status via `GET /api/v1/purchase-orders?status=SUBMITTED` (server filters by the approver's `approval_limit`). Each card shows po_number, supplier, total, ETA, submitted-age, and inline Approve / Reject buttons.
- Approve → `POST /api/v1/purchase-orders/:id/approve`; Reject → opens reason modal → `POST /api/v1/purchase-orders/:id/reject` with `{ reason }`.
- Friendly error mapping: `APPROVAL_LIMIT_EXCEEDED` shows the user's own limit in the toast; `INVALID_STATUS_TRANSITION` auto-refreshes the inbox.
- After approve/reject the affected query caches are invalidated: `['purchase-orders']`, `['po-pending-approvals']`, `['po-agg-by-status']` — so the dashboard KPI and the PO directory both refresh on next view.
- Inbox is persona-gated; non-approvers see an "Approvers only" empty state.
- Demo credentials updated to `*@demo.local` (admin, buyer, approver-hi, approver-lo) — all using the same demo password.

### Phase 4.6 — Real push events from PO transitions + foreground system notifications
- **PO service** now fires a fire-and-forget push notification after each successful state transition:
  - `submit` → notify APPROVER + ADMIN (approvers filtered by `min_approval_limit ≥ total_amount`). Auto-approved POs route to the `approved` event instead.
  - `approve` → notify the buyer (owner) + ADMIN.
  - `reject` → notify the buyer (owner) + ADMIN, with the rejection reason snippet in the body.
  - `fulfill` → notify APPROVER + ADMIN.
  - `close` → notify APPROVER + ADMIN.
  - Failures never break the transition — the response is sent first; notify errors only log.
- **IAM service** owns the FCM sender:
  - New `src/fcm.js` — loads the Firebase service account from `FIREBASE_SERVICE_ACCOUNT_PATH` (default `back-end/iam/firebase-service-account.json`) or inline via `FIREBASE_SERVICE_ACCOUNT_JSON` env. Uses `google-auth-library` for OAuth2; sends one FCM v1 request per token; collects `UNREGISTERED` / `NOT_FOUND` results and prunes those tokens from the `devices` table.
  - New `src/notifications.js` — exposes `POST /api/v1/internal/notifications/users` protected by `X-Internal-Token` matching env `INTERNAL_SERVICE_TOKEN`. Body accepts `user_ids[]`, `roles[]`, and optional `min_approval_limit`. Returns `{ recipients, devices, sent, failed, pruned }`.
- **Required new env vars**:
  - IAM: `INTERNAL_SERVICE_TOKEN` (any random string ≥ 32 chars), `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_JSON`.
  - PO service: `INTERNAL_SERVICE_TOKEN` (same value as IAM), `AUTH_SERVICE_URL` or `IAM_URL` (defaults to `http://localhost:3001`).
- **Mobile** — foreground notifications now show in the **device's system tray** via `@notifee/react-native`:
  - New `src/notifications/notifee.js` — creates an Android `default` channel (HIGH importance) on cold start, displays a local notification on every foreground FCM message, and routes taps via `onForegroundEvent`.
  - Background/quit-state notifications still use FCM's OS-level auto-display (unchanged).
  - The notifee `pressAction` handler forwards `data.deep_link` through the same `pendingDeepLink` slot as the FCM background-tap path, so the routing logic stays in one place.

### Phase 4.5 — Server-side device registration + test tool
- **IAM** — new `devices` table (`002_devices.sql`) and three endpoints under `/auth/me/devices`:
  - `POST` upserts a `(user_id, token, platform, app_version)` row; on token conflict it re-binds to the current user.
  - `GET` lists the calling user's devices (latest first).
  - `DELETE /:token` unregisters a specific token (idempotent).
- **Mobile** — `FcmGate` now calls `registerDevice` whenever both an access token and an FCM token are present, and re-registers on `messaging().onTokenRefresh`. The `(accessToken, fcmToken)` pair is memoised so the endpoint isn't called on every render. Logout flow (drawer) now `DELETE`s the current device token before clearing local state, and clears the in-memory notifications inbox.
- **Tool** — new `back-end/tools/fcm-push/` with two scripts:
  - `send.js` — send a test push via the FCM HTTP v1 API. Accepts a raw `--token` or a `--user-email` (signs in to IAM and fans out to every device for that user). Supports `--title`, `--body`, `--deep-link`, repeated `--data k=v`, and `--dry-run`.
  - `list-devices.js` — prints registered devices for a user.

### Phase 4 — FCM + deep links
- Installed `@react-native-firebase/app` and `@react-native-firebase/messaging` (both `^24.0.0`); their config plugins are registered in `app.json` and pick up `google-services.json` automatically during `expo prebuild`.
- New `src/notifications/fcm.js` — Android 13+ `POST_NOTIFICATIONS` permission request, iOS `requestPermission`, `getToken`, `toNotificationItem` mapper, and `isSafeDeepLink` allow-list to prevent routing to arbitrary URLs.
- New `src/notifications/NotificationsContext.js` — in-memory inbox (last 50), unread counter, token + permission state, pending deep-link slot.
- Root `app/_layout.js` now:
  - Registers `messaging().setBackgroundMessageHandler` at module scope (required for cold-start delivery).
  - Wraps the tree in `NotificationsProvider`.
  - Adds an `FcmGate` that, once Auth has hydrated, requests permission, retrieves the token, subscribes to `onMessage` (foreground), `onNotificationOpenedApp` (tap from background), and `getInitialNotification` (tap from quit).
  - Routes `data.deep_link` payloads (e.g. `/(app)/approvals`, `/(app)/purchase-orders/<id>`) via Expo Router, deferring until the user is authenticated.
  - Invalidates `purchase-orders` and `pending-approvals` query caches on every foreground push so the UI stays fresh.
- Notifications screen (`app/(app)/notifications.js`) now lists received messages (title, body, source: foreground / background-open / quit-open) with tap-to-open for any `deep_link`.
- AppBar bell icon shows a real unread badge (1, 2, …, 9+) sourced from the context; falls back to the previous health amber/red dot when zero unread.
- Settings screen has a new **Push notifications** card showing permission state and the FCM device token with a Copy button — paste this into Firebase Console → Cloud Messaging to send a test push.

## Planned
