# Troubleshooting

## Install

**`npm error ERESOLVE could not resolve` (Radix / react-dom peer)**
The project ships an `.npmrc` with `legacy-peer-deps=true`. If you bypassed it (e.g., `npm install --no-package-lock`), re-run plain `npm install`.

**`Cannot determine the project's Expo SDK version`**
You ran `npx expo install ...` before `npm install`. Run `npm install` first.

## Build

**Gradle says "Unsupported class file major version"**
Your shell is picking up an old JDK. Confirm with `java -version` — must report 21.x. If multiple JDKs are installed, set `JAVA_HOME` to the JDK 21 install:

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.9-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```

**`google-services.json was not found`**
Copy it from `docs/`:

```powershell
copy docs\google-services.json google-services.json
```

The root copy is gitignored. The package in `app.json` (`com.redivac.scmplatform`) must match the `client.client_info.android_client_info.package_name` inside `google-services.json`.

**`npm run android` succeeds but the app crashes on launch**
Run `npm run prebuild` first — the `android/` folder is regenerated from `app.json`, so plugin or package changes need a fresh prebuild.

## Runtime

**Login fails with `NETWORK` / `Cannot reach the server`**
- On a physical device: the back-end on `localhost` is not reachable. Update `.env.local` with your machine's LAN IP and re-launch (Metro must restart to re-read env).
- On the Android emulator: use `10.0.2.2` instead of `localhost`. Update `.env.local` accordingly.
- Check the Service Health screen (top-bar heart-pulse icon) for per-service status.

**Login succeeds but every subsequent call is 401**
Refresh-token endpoint likely isn't issuing new access tokens. Check the IAM service logs. The mobile app retries once silently; if refresh fails it clears tokens and routes to `/login`. Use `correlation_id` from the error toast's Details expander to match the request in IAM logs.

**Drawer doesn't open from gesture**
The swipe-edge width is 60 px. If you have edge-to-edge gestures on Android 14+, swipe from inside the screen rather than the very edge, or tap the hamburger.

**Theme doesn't persist**
SecureStore writes are async. If you force-killed the app immediately after toggling, the write may not have flushed. Wait ~1 second after the toggle, then cold-launch.

## FCM (Phase 4)

**No token shown in Settings → Push notifications**
- On Android 13+ the OS prompts for `POST_NOTIFICATIONS` once. If you tapped Deny, re-enable from device Settings → Apps → Nexus SCM → Notifications, then cold-launch the app.
- `google-services.json` at the project root must match `android.package` in `app.json` (`com.redivac.scmplatform`). If you ever regenerate it from Firebase, copy from `docs/` to root again — the root copy is gitignored.
- After installing or upgrading `@react-native-firebase/*`, run `npm run prebuild` so the `com.google.gms.google-services` Gradle plugin is re-applied.

**Test push from Firebase Console**
1. Settings → Push notifications → Copy token.
2. Firebase Console → project `gep-training-platform` → Cloud Messaging → "Send test message" → paste the token.
3. To deep-link, add a data field: key `deep_link`, value e.g. `/(app)/approvals` or `/(app)/purchase-orders/<id>`. Only paths under `/(app)/...` (approvals, purchase-orders, suppliers, users, dashboard) are accepted by the in-app allow-list.

**Push opens the app but doesn't navigate**
The deep-link guard (`isSafeDeepLink` in `src/notifications/fcm.js`) only accepts the prefixes listed there. If you need to add a route (e.g. once Phase 5 ships), extend `VALID_DEEP_LINK_PREFIXES`.

**Background message handler doesn't fire**
It must be registered at module top level in `app/_layout.js` (not inside a component). Don't move that call into `FcmGate`.

**Device doesn't appear under `/auth/me/devices`**
- The IAM service must have applied migration `002_devices.sql`. Restart `iam` so `migrate()` runs (or check the startup log for `applied migration 002_devices.sql`).
- The mobile app only registers once both the access token and FCM token are present. Log out and back in to force a re-registration; check the dev console for `[fcm] device registration failed` warnings.
- The registration call uses the same axios client as everything else, so a 401 here means the access token is invalid — the silent-refresh interceptor will try once, then route to login.

**Sending a test push from `back-end/tools/fcm-push`**
- See `back-end/tools/fcm-push/README.md` for full setup. Quick check: `node send.js --token <COPY_FROM_SETTINGS> --dry-run` prints the exact JSON payload that would hit FCM without sending.

**Approving a PO doesn't fire a push**
- IAM must have a Firebase service account configured: either `back-end/iam/firebase-service-account.json` exists, or `FIREBASE_SERVICE_ACCOUNT_JSON` env var contains the JSON. If neither is set, IAM responds `503 FCM_NOT_CONFIGURED`.
- Both IAM and PO services need the **same** `INTERNAL_SERVICE_TOKEN` value. If only one has it, the PO log shows `[notify] failed (401)`; if neither, you'll see `[notify] INTERNAL_SERVICE_TOKEN not set; skipping push`.
- Confirm `AUTH_SERVICE_URL` (or `IAM_URL`) on PO service points at the running IAM instance.
- The target user must have at least one registered device (check via `back-end/tools/fcm-push/list-devices.js`).

**Foreground notification doesn't show in the system tray**
- The Android default channel is created on first launch. If you previously denied the channel post-install, re-enable from device Settings → Apps → Nexus SCM → Notifications → General notifications.
- Foreground display is handled by `@notifee/react-native`; check the dev console for `notifee` errors. Background/quit notifications use FCM's OS-level auto-display (different path).
