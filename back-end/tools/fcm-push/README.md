# fcm-push — dev tool to send a test push

Two small Node.js scripts that exercise the end-to-end FCM path:

- `send.js` — send a notification to a specific FCM token (or to all devices registered for a user).
- `list-devices.js` — print devices registered against a user.

## One-time setup

1. **Generate a Firebase service account key**
   Firebase Console → Project settings → **Service accounts** → **Generate new private key**.
   Save the downloaded JSON as `service-account.json` in this folder. It's gitignored.

2. **Install**
   ```powershell
   cd back-end\tools\fcm-push
   npm install
   ```

## Send to a known FCM token

The fastest path. Grab the device's token from the mobile app's **Settings → Push notifications → Copy token**.

```powershell
node send.js --token <PASTED_TOKEN> --title "Hi from FCM" --body "It works!"
```

Add `--deep-link "/(app)/approvals"` to make the mobile app navigate when the notification is tapped:

```powershell
node send.js --token <PASTED_TOKEN> --deep-link "/(app)/approvals"
```

Or use the prebuilt approvals shortcut:

```powershell
npm run send:approvals -- --token <PASTED_TOKEN>
```

## Send to every device registered for a user

When the user is signed in to mobile, the device token is registered via `POST /auth/me/devices`. The tool can look that up:

```powershell
node send.js --user-email approver-hi@demo.local --password "Passw0rd!" --title "PO needs approval" --deep-link "/(app)/approvals"
```

By default it talks to `http://localhost:3001` — override with `--iam <url>` or `IAM_URL` env var.

## List devices for a user

```powershell
node list-devices.js --email approver-hi@demo.local --password "Passw0rd!"
```

## Deep-link contract

The mobile app's allow-list accepts only:

- `/(app)/dashboard`
- `/(app)/approvals`
- `/(app)/purchase-orders/<id>`
- `/(app)/suppliers/<id>`
- `/(app)/users/<id>`

Other links are silently ignored on the device.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `Service account JSON not found` | Drop `service-account.json` into this folder, or pass `--service-account <path>`. |
| `401 UNAUTHENTICATED` from FCM | The service account file doesn't have the `Firebase Cloud Messaging API Admin` role, or the project_id doesn't match the device's google-services.json. |
| `404 NOT_FOUND` from FCM with `Requested entity was not found` | The FCM token has been invalidated (app uninstalled / data cleared). Re-run on the device to issue a fresh token. |
| Device receives the push but no deep-link navigation | The link doesn't match the allow-list above. |
