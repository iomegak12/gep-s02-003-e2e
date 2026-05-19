# Nexus SCM — Mobile (React Native + Expo)

Mobile companion to the Nexus SCM platform. Consumes the same three back-end services as the web front-end (`back-end/`):

| Service | Port | Purpose |
|---|---|---|
| IAM | 3001 | Auth, users, roles, profile |
| Supplier | 3002 | Supplier master, scorecard, aggregations |
| Purchase Order | 3003 | POs, line items, workflow, spend analytics |

---

## Stack

| Item | Version |
|---|---|
| Expo SDK | 54 |
| React Native | 0.81 |
| React | 19.1 |
| Routing | Expo Router 6 (file-based) |
| UI | React Native Paper (Material 3) |
| Data | TanStack Query + axios |
| Secure storage | `expo-secure-store` |
| Animation | `react-native-reanimated` |
| Icons | `react-native-svg` + inline SVG components |
| Java / Kotlin | JDK 21 · Kotlin 2.1.20 |
| Gradle / AGP | 8.14.3 · 8.7+ |
| compileSdk / targetSdk / minSdk | 36 / 36 / 24 |

---

## Prerequisites

- **Node.js ≥ 20.19.4** (`node -v`)
- **JDK 21** (Temurin recommended; `java -version`)
- **Android Studio** with an installed SDK Platform 36 and an emulator (or a real device with USB debugging)
- The back-end services running locally (see `../back-end/README.md`)

---

## First-time setup

```powershell
cd mobile
npm install
```

`legacy-peer-deps=true` is already set in `.npmrc` (needed for the current React 19.1 / Radix peer-range mismatch in `expo-router` 6.0.x).

### Environment

Three env files drive the API base URLs (only `EXPO_PUBLIC_*` vars are exposed to JS):

| File | Purpose | Committed? |
|---|---|---|
| `.env` | Default placeholders (localhost) | Yes |
| `.env.local` | Your dev machine's LAN IP for testing on a real device | **No** (gitignored) |
| `.env.prod` | Azure production URLs | Yes |

To find your LAN IP on Windows: `ipconfig` → "IPv4 Address" under your active Wi-Fi adapter, then edit `.env.local`.

### Firebase

The FCM config (`google-services.json`) is checked in **only** at `mobile/docs/google-services.json` (project number `12280716947`, package `com.redivac.scmplatform`). The build expects it at the project root, so on a clean checkout:

```powershell
copy docs\google-services.json google-services.json
```

The root copy is gitignored to keep credentials out of version control.

---

## Run the dev build

```powershell
# Generates native android/ + ios/ folders, then builds & installs the app
npm run prebuild
npm run android
```

Subsequent runs only need `npm run android` (or `npm start` to launch the dev menu and pick a target).

If you change `app.json` plugins, env vars, or native config, re-run `npm run prebuild`.

---

## Project layout

```
mobile/
  app/                  # Expo Router file-based routes
    _layout.js          # Root: providers + AuthGate
    index.js            # Splash → onboarding or login
    onboarding/         # Marketing carousel
    (auth)/login.js     # Login + 4 sample-persona quick-fill
    (app)/              # Drawer shell + screens
      _layout.js        # Drawer + AppBar
      dashboard.js
      profile.js
      settings.js
      notifications.js
      health.js         # Live IAM/SUP/PO status
      terms.js · contact.js · support.js
      suppliers/        # Phase 2
      purchase-orders/  # Phase 2
      users/            # Phase 2
      approvals/        # Phase 3
  src/
    api/                # 3 axios instances + interceptors + service modules
    auth/               # AuthContext + sample credentials
    components/         # AppBar, DrawerContent, StatusBadge, HealthDots, etc.
    hooks/              # useHealth, etc.
    theme/              # Light + Dark Material 3 tokens
    utils/              # correlationId, role → menu mapping
  docs/google-services.json
```

---

## Phased delivery

- **Phase 1 (this commit)** — splash, onboarding, login, drawer shell, theme switch, profile, settings, health, FCM stub.
- **Phase 2** — Suppliers / Purchase Orders / Users directories with detail screens (read-only).
- **Phase 3** — Approvals inbox with approve/reject.
- **Phase 4** — FCM push, deep links, animation polish, signed release.

See `CHANGELOG.md` for what shipped and `TROUBLESHOOTING.md` for build issues.
