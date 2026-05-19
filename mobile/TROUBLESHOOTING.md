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

## FCM (Phase 4 onward)

Not yet wired; placeholders only. When implementing, ensure:
- `app.json` → `android.googleServicesFile` resolves.
- Package name matches `google-services.json`.
- `@react-native-firebase/app` config plugin is added to `app.json` `plugins`.
- After install run `npm run prebuild --clean` so the GMS Gradle plugin is applied.
