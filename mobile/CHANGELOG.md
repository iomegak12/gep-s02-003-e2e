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

## Planned

### Phase 2 — Directories
- Suppliers Directory + Detail (`GET /suppliers`, `GET /suppliers/:id`, `GET /suppliers/:id/scorecard`, `GET /suppliers/search`).
- Purchase Orders Directory + Detail (`GET /purchase-orders`, `GET /purchase-orders/:id`, `GET /purchase-orders/:id/line-items`).
- Users Directory + Detail (admin only).
- Shared `PaginatedList` component with `{data, page, page_size, total}` contract.

### Phase 3 — Approvals
- Approvals Inbox via `GET /purchase-orders/aggregations/pending-approvals`.
- Approve / Reject actions with reason modal.
- Error handling for `APPROVAL_LIMIT_EXCEEDED` and `INVALID_STATUS_TRANSITION`.

### Phase 4 — FCM + polish
- `@react-native-firebase/messaging` integration.
- Foreground + background + quit-state notification handlers.
- Deep-link routing into Expo Router URLs from `data.deep_link`.
- Signed release APK.
