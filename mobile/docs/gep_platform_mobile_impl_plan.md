# Nexus SCM — Mobile App (Expo) Implementation Plan

## Context

Ramkumar (Mobile UI developer) has built the web front-end of the GEP-style Nexus SCM platform and now needs a **React Native + Expo** mobile companion that consumes the same three back-end services (IAM:3001, Supplier:3002, PO:3003). The mobile app targets buyers, approvers, and admins on the go — emphasizing **read access** for directories and **approval actions** for approvers; create/edit/delete are deferred. The product, design tokens (Nexus SCM brand), endpoint contracts, and error envelopes are already authoritative in `front-end/docs/*.md` and `back-end/tests/`.

## Decisions (locked with user)

| Topic | Choice |
|---|---|
| Location | `c:\000 - GEP - S02 - 003\gep-003-e2e\mobile\` (new sibling to `front-end/`, `back-end/`) |
| Framework | Expo SDK 54 (latest stable), **development build** (not Expo Go) |
| Language | **JavaScript only** (no TypeScript) |
| Routing | **Expo Router** (file-based, deep-link ready for FCM) |
| UI library | **React Native Paper** (Material 3, maps cleanly to DESIGN.md tokens) |
| Data layer | **TanStack Query + axios** (3 axios instances, one per service) |
| Secure storage | `expo-secure-store` for `access_token` + `refresh_token` |
| Icons | `react-native-svg` + svg files only (no emojis, no icon fonts where avoidable; `@expo/vector-icons` allowed only as fallback) |
| SVG branding | `assets/branding/gep-logo.svg` (placeholder — user will supply real asset) |
| Theme | Follow system on first launch; user override stored in SecureStore key `nexus.theme` |
| Auth expiry | 401 → call `POST /api/v1/auth/refresh` silently, retry original request once; if refresh fails → clear tokens, route to `/login` |
| Personas seed | 4 sample-credential icons: Buyer · Approver · Approver (low limit) · Admin |
| API host config | Three base URLs, one per service, via `process.env.EXPO_PUBLIC_*`. **Dev** (`.env.local`): LAN IP (e.g., `http://192.168.x.x:3001`). **Prod** (`.env.prod`): Azure host below. |
| Prod URLs (`.env.prod`) | `EXPO_PUBLIC_IAM_URL=http://gep003-tp7s4.westus.cloudapp.azure.com:3001`<br>`EXPO_PUBLIC_SUPPLIER_URL=http://gep003-tp7s4.westus.cloudapp.azure.com:3002`<br>`EXPO_PUBLIC_PO_URL=http://gep003-tp7s4.westus.cloudapp.azure.com:3003`<br>(Port mapping confirmed with user: **3001=IAM, 3002=Supplier, 3003=PO** — matches tech spec.) |
| Toolchain (verified compatible) | **Expo SDK 54.0.0** · **React Native 0.81** · React 19.1 · **Kotlin 2.1.20** · **Gradle 8.14.3** · **AGP 8.7+** · **JDK 21** (Gradle 8.14 supports JDK 17–26; AGP 8.x supports JDK 21) · **compileSdk 36** / **targetSdk 36** / **minSdk 24** · buildTools 36.0.0 · NDK 27.1.12297006 · **Node ≥ 20.19.4** |
| Build | Gradle (default Expo prebuild target) — no custom version overrides needed; SDK 54 defaults are correct |
| Android package | **`com.redivac.scmplatform`** (must match the existing FCM `google-services.json`) |
| Firebase project | `gep-training-platform` (project number `12280716947`) — config already provisioned by user at `mobile/docs/google-services.json` |

## Phased delivery

### Phase 1 — Shell, Auth, Onboarding *(checkpoint)*
**Goal:** A user can install the dev build, see splash, swipe through carousel, log in with one of 4 sample creds, land on an empty persona-specific dashboard, open the drawer, toggle theme, and log out.

- Scaffold Expo app with `npx create-expo-app@latest mobile --template blank` then add `expo-router`, `react-native-paper`, `react-native-svg`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-secure-store`, `@tanstack/react-query`, `axios`, `expo-splash-screen`, `expo-status-bar`, `expo-linear-gradient`.
- `app.json`: set `name: "Nexus SCM"`, `slug: "nexus-scm-mobile"`, `orientation: "portrait"`, `userInterfaceStyle: "automatic"`, `splash` config, **`android.package: "com.redivac.scmplatform"`** (matches FCM config), `android.googleServicesFile: "./google-services.json"`, `ios.bundleIdentifier`, fullscreen via `androidStatusBar.translucent: true` + safe-area handling.
- Copy `mobile/docs/google-services.json` to `mobile/google-services.json` (project root) so Gradle picks it up; add it to `.gitignore` (do not commit Firebase credentials) and document the source path in README.
- `android/build.gradle` should keep the **Expo SDK 54 defaults** (Kotlin 2.1.20, compileSdk 36, targetSdk 36, minSdk 24, buildTools 36.0.0, Gradle wrapper 8.14.3, AGP 8.7+). No version overrides required; if any are needed they would go via `expo-build-properties` plugin in `app.json` rather than editing native files directly (keeps `expo prebuild` reproducible).
- Folder structure:
  ```
  mobile/
    app/
      _layout.js                    # Root: PaperProvider, QueryClientProvider, ThemeProvider, SecureStore bootstrap
      index.js                      # Splash → carousel → Get Started
      onboarding/
        _layout.js                  # Stack
        carousel.js                 # 3-4 marketing slides w/ reanimated transitions
      (auth)/
        login.js                    # Email + Password + 4 persona quick-fill icons
      (app)/
        _layout.js                  # Drawer + top app bar; redirects to /login if no token
        dashboard.js                # Persona-routed (buyer/approver/admin)
        profile.js
        settings.js
        notifications.js
        health.js                   # Service health detail (IAM/SUP/PO)
        suppliers/                  # Phase 2
        purchase-orders/            # Phase 2
        users/                      # Phase 2
        approvals/                  # Phase 3
        terms.js
        contact.js
        support.js
    src/
      api/
        client.js                   # 3 axios instances + interceptors (Bearer, X-Correlation-Id, 401 refresh)
        iam.js                      # login, refresh, me, users
        suppliers.js
        purchaseOrders.js
      auth/
        AuthContext.js              # token state + SecureStore I/O
        sampleCredentials.js        # 4 personas with email/password
      theme/
        tokens.js                   # Light + Dark palettes from DESIGN.md
        ThemeProvider.js
      components/
        AppBar.js                   # Top nav: profile / settings / notifications / health
        DrawerContent.js            # User block + theme switch + persona menus
        StatusBadge.js              # PO + Supplier statuses with semantic colors
        HealthDots.js               # 3 SVG dots polling /health every 30s
        ErrorToast.js               # error.code + correlation_id expander
        EmptyState.js
        PaginatedList.js            # Reusable {data,page,page_size,total}
      hooks/
        useAuth.js
        useCorrelationId.js
        useHealth.js
      utils/
        correlationId.js            # uuid v4
        roles.js                    # role → drawer menu mapping
    assets/
      branding/
        gep-logo.svg                # SVG logo (Nexus SCM placeholder)
        splash.png                  # From the user-provided screenshot
      icons/                        # All persona/menu icons as .svg
    .env                            # placeholders only
    .env.local                      # LAN IP for dev
    .env.prod                       # production URLs
    .gitignore
    app.json
    babel.config.js                 # expo-router + reanimated plugins
    metro.config.js                 # svg transformer (react-native-svg-transformer)
    README.md
    CONTRIBUTING.md
    CHANGELOG.md
    TROUBLESHOOTING.md
    LICENSE                         # MIT
    package.json
  ```

- **Splash** (`expo-splash-screen`): match attached screenshot — white bg, centered illustration, gradient CTA card; held until SecureStore bootstrap + font load complete.
- **Carousel** (`onboarding/carousel.js`): 3 slides with `react-native-reanimated` fade + translateX transitions; bullet indicators; "Get Started" CTA on final slide → `/(auth)/login`.
- **Login** (`(auth)/login.js`):
  - Email + password fields (Paper `TextInput`).
  - 4 circular SVG icon buttons in a row labeled BUYER / APPROVER / APPROVER-LO / ADMIN → tapping prefills the form from `src/auth/sampleCredentials.js`.
  - "Sign In" → `POST /api/v1/auth/login` → store `access_token` + `refresh_token` in SecureStore → route by role (ADMIN→`/dashboard?role=admin`, APPROVER→`/approvals`, BUYER→`/dashboard?role=buyer`).
  - Inline error for `AUTH_FAILED`, `VALIDATION_FAILED`.
- **Drawer** (`(app)/_layout.js`):
  - Header card: avatar (initials), email, role chips, **theme switch (Light/Dark)**.
  - Menu items filtered by `roles[]` claim using `src/utils/roles.js`:
    - BUYER: Dashboard, Suppliers, Purchase Orders, Terms, Contact Us, Support
    - APPROVER: Approvals, Purchase Orders, Dashboard, Terms, Contact Us, Support
    - ADMIN: Dashboard, Users, Suppliers, Purchase Orders, Terms, Contact Us, Support
  - Footer: Logout (`POST /api/v1/auth/logout`, clear SecureStore, route to `/login`).
- **Top app bar** (Paper `Appbar.Header`): hamburger, title, right-side icons: profile · settings · notifications · health alerts (each opens its dedicated screen). Health icon shows badge if any of 3 services is amber/red (polled by `useHealth` every 30s).
- **Theme**: Light + Dark Material 3 schemes built from DESIGN.md tokens (`primary #1d20e9`, status colors, etc.). Provider reads system theme; override persisted to SecureStore `nexus.theme`.

**Phase 1 verification**
- `npx expo prebuild --clean && npx expo run:android` builds without Kotlin/Gradle errors on Java 21.
- Splash → carousel animates → Get Started → Login.
- Tap each of the 4 persona icons → form prefills → Sign In hits IAM 3001 → token stored in SecureStore (verify via `adb logcat` or a debug toast).
- Drawer opens, shows role-correct menu, theme toggle flips palette and persists across cold launch.
- Logout clears token and returns to Login.
- Pull SecureStore offline (airplane mode) → app should still cold-start to Login.

---

### Phase 2 — Directories (Suppliers / POs / Users — read-only)
**Goal:** All three directories with detail screens, paginated lists, filters, search.

- `app/(app)/suppliers/index.js` — `GET /api/v1/suppliers?page=&page_size=&status=` via `useInfiniteQuery`; filter chips for status; search box wired to `GET /suppliers/search?q=`.
- `app/(app)/suppliers/[id].js` — parallel `GET /suppliers/:id` + `GET /suppliers/:id/scorecard`; tab view (Overview / Scorecard) via `react-native-tab-view` or Paper segmented buttons. No edit buttons (deferred).
- `app/(app)/purchase-orders/index.js` — list with status filter chips, `supplier_snapshot.display_name`, total + currency formatting.
- `app/(app)/purchase-orders/[id].js` — header (po_number, status badge, supplier, total, dates), line items table, delivery address, notes. **No action bar in v1** (transitions deferred — only approvals shown in Phase 3).
- `app/(app)/users/index.js` (ADMIN only) — `GET /api/v1/auth/users` paginated.
- `app/(app)/users/[id].js` — read-only profile.
- Shared `<PaginatedList>` component for all three.
- Empty/loading/error states using shared components from Phase 1.

**Verification:** scroll, filter, search each directory; deep-link `app/(app)/suppliers/<id>` from the URL bar (dev menu) lands directly on detail; tokens still attached; 401 mid-session triggers silent refresh.

---

### Phase 3 — Approvals
**Goal:** Approver inbox with approve/reject (the only mutate flow in v1).

- `app/(app)/approvals/index.js` — `GET /api/v1/purchase-orders/aggregations/pending-approvals`; cards show po_number, supplier, total, expected delivery, age.
- Per-row **Approve** → `POST /api/v1/purchase-orders/:id/approve`; **Reject** → reason modal → `POST /:id/reject`.
- Error handling: `APPROVAL_LIMIT_EXCEEDED` (clear toast quoting user's `approval_limit`), `INVALID_STATUS_TRANSITION` (toast + refetch list).
- Reuse `ErrorToast` and `ConfirmWithReasonModal` (new component, mirrors web spec §7.6).

**Verification:** log in as `approver-1` and `approver-low-limit` seeds; approve a small PO (success), approve a PO above limit (clean error), reject with reason < 5 chars (validation), reject with valid reason (success).

---

### Phase 4 — FCM, Deep Links, Polish
**Goal:** Push notifications, animations, production hardening.

- Add `@react-native-firebase/app` + `@react-native-firebase/messaging` (preferred over `expo-notifications` because the user already has a native FCM config and dev build is in use).
- Wire `google-services.json` (Firebase project `gep-training-platform`, package `com.redivac.scmplatform`) — placed at `mobile/google-services.json`, referenced from `app.json` via `android.googleServicesFile`. Expo prebuild applies the `com.google.gms.google-services` Gradle plugin automatically when the RNFirebase config plugin is added (`expo install @react-native-firebase/app` then add `"@react-native-firebase/app"` to `app.json` `plugins`).
- Register an FCM token on login (`messaging().getToken()`); persist it server-side **only when an IAM endpoint exists** — until then, log it to console and surface it under Settings → Debug for manual testing.
- Foreground handler: `messaging().onMessage` → Paper Snackbar.
- Background/quit handler: `messaging().setBackgroundMessageHandler` + `messaging().onNotificationOpenedApp` / `getInitialNotification` → route via Expo Router (`router.push('/(app)/approvals')` or `/(app)/purchase-orders/<id>`) based on a `deep_link` field in the data payload.
- Background + foreground notification handlers; tap-to-open deep links into Expo Router URLs (e.g., `/(app)/approvals` or `/(app)/purchase-orders/<id>`).
- Tighten carousel + drawer-open animations with reanimated worklets.
- Lint pass, README/CONTRIBUTING/TROUBLESHOOTING/CHANGELOG fill-in, MIT LICENSE.
- `.env.prod` finalized with production URLs (when user provides).

**Verification:** receive a test FCM push while app is backgrounded → notification taps open the correct screen; release build assembles (`./gradlew assembleRelease`).

---

## Files to be created (new) / referenced

**New (mobile app — all under `c:\000 - GEP - S02 - 003\gep-003-e2e\mobile\`):** see structure tree above.

**Referenced (read-only, source-of-truth for endpoint contracts):**
- `front-end/docs/GEP_SCM_Platform_UI_Spec.md` — error codes, endpoint mapping, role-based nav.
- `front-end/docs/GEP_SCM_Platform_Technical_Specification.md` — JWT shape, state machines, env vars.
- `front-end/docs/ui-artifacts/DESIGN.md` — color tokens, typography, spacing, radius, status palette.
- `back-end/tests/src/tests/{iam,supplier,po,cross-service}/*` — authoritative request/response/error shapes; mirror these into axios test fixtures.
- `front-end/src/**` — reuse patterns (axios interceptors, role gating, status badge color map) where helpful.

## Cross-cutting requirements (apply to every phase)

- Every request: `Authorization: Bearer <token>` + `X-Correlation-Id: <uuidv4>`.
- Every error toast: title = `error.message`, expander = `error.code` + copyable `correlation_id` (using monospace JetBrains-style font on copy display).
- All icons sourced from `assets/icons/*.svg` via `react-native-svg-transformer` — no emojis.
- Fullscreen: `expo-status-bar` style follows theme; immersive flag on Android via `app.json`.
- All three back-end base URLs read from `process.env.EXPO_PUBLIC_*` (Expo's public-env convention).

## End-to-end verification (full app, post-Phase 4)

1. Start back-end services (IAM:3001, Supplier:3002, PO:3003) on dev host; confirm `/health` returns `{ok:true}` for each.
2. Set `EXPO_PUBLIC_IAM_URL=http://<lan-ip>:3001` (and SUP, PO) in `.env.local`.
3. Confirm `java -version` reports JDK 21, `node --version` ≥ 20.19.4. Then `npx expo prebuild --clean && npx expo run:android` — should produce Gradle 8.14.3 wrapper, Kotlin 2.1.20, compileSdk 36.
4. Cold-launch → splash → carousel animates → Get Started.
5. Login with each persona via quick-fill icons → land on persona-correct dashboard.
6. Open drawer → toggle theme → verify persistence after kill+relaunch.
7. Suppliers / POs / Users directories: paginate, filter, search, tap row → detail loads.
8. As Approver: open Approvals → approve under-limit PO → reject with reason → verify backend state via web app.
9. Force a 401 (revoke token in DB or wait 15 min) → next call silently refreshes; if refresh fails → routed to Login.
10. Send an FCM test message from Firebase console (project `gep-training-platform`) to the registered token → notification appears in tray → tap → opens deep-linked screen (e.g., `/(app)/approvals`).
11. Verify `assembleRelease` produces signed APK and `.env.prod` URLs are baked in.
