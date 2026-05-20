#!/usr/bin/env node
/**
 * send.js — send a test push notification via the FCM HTTP v1 API.
 *
 * Setup (once):
 *   1. Firebase Console → Project settings → Service accounts → "Generate new private key".
 *      Save the downloaded JSON as `./service-account.json` (this file is gitignored).
 *   2. `npm install` inside this folder.
 *
 * Usage:
 *   node send.js --token <FCM_TOKEN>
 *   node send.js --token <FCM_TOKEN> --title "..." --body "..." --deep-link "/(app)/approvals"
 *   node send.js --token <FCM_TOKEN> --data key1=value1 --data key2=value2
 *   node send.js --user-email approver-hi@demo.local --iam http://localhost:3001 --password "Passw0rd!"
 *
 * Flags:
 *   --token <s>            FCM device token. Required unless --user-email is given.
 *   --user-email <s>       Look up tokens from IAM by signing in as the user. Sends to every registered device.
 *   --password <s>         Password used with --user-email (defaults to env IAM_PASSWORD).
 *   --iam <url>            IAM base URL (default: env IAM_URL or http://localhost:3001).
 *   --service-account <p>  Path to the Firebase service account JSON (default: ./service-account.json or env FIREBASE_SERVICE_ACCOUNT).
 *   --title <s>            Notification title (default: "Nexus SCM").
 *   --body <s>             Notification body (default: "This is a test push.").
 *   --deep-link <s>        Sets data.deep_link. Must start with /(app)/ to be honored by the mobile app.
 *   --data k=v             Extra data field. May be repeated.
 *   --dry-run              Print the request payload and exit; do not call FCM.
 */

const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];
const DEFAULT_SERVICE_ACCOUNT = path.join(__dirname, 'service-account.json');

function parseArgs(argv) {
  const out = { data: {} };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--token':           out.token = next(); break;
      case '--user-email':      out.userEmail = next(); break;
      case '--password':        out.password = next(); break;
      case '--iam':             out.iam = next(); break;
      case '--service-account': out.serviceAccount = next(); break;
      case '--title':           out.title = next(); break;
      case '--body':            out.body = next(); break;
      case '--deep-link':       out.deepLink = next(); break;
      case '--dry-run':         out.dryRun = true; break;
      case '--data': {
        const kv = next();
        const eq = kv.indexOf('=');
        if (eq < 0) die(`--data expects key=value (got "${kv}")`);
        out.data[kv.slice(0, eq)] = kv.slice(eq + 1);
        break;
      }
      case '-h':
      case '--help':            out.help = true; break;
      default: die(`Unknown argument: ${a}`);
    }
  }
  return out;
}

function die(msg) {
  console.error(`Error: ${msg}`);
  console.error('Run `node send.js --help` for usage.');
  process.exit(2);
}

function help() {
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 27).map(l => l.replace(/^ ?\* ?/, '')).join('\n'));
}

function loadServiceAccount(p) {
  const file = p || process.env.FIREBASE_SERVICE_ACCOUNT || DEFAULT_SERVICE_ACCOUNT;
  if (!fs.existsSync(file)) {
    die(
      `Service account JSON not found at ${file}.\n` +
      `Generate one in Firebase Console → Project settings → Service accounts → Generate new private key,\n` +
      `then save it as ${DEFAULT_SERVICE_ACCOUNT} (or pass --service-account <path>).`
    );
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function getAccessToken(serviceAccountJson) {
  const auth = new GoogleAuth({ credentials: serviceAccountJson, scopes: SCOPES });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

async function fetchTokensForUser({ iam, email, password }) {
  if (!password) die('--password is required when using --user-email (or set IAM_PASSWORD env var).');
  const login = await fetch(`${iam}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) {
    const body = await login.text();
    die(`IAM login failed (${login.status}): ${body}`);
  }
  const { access_token } = await login.json();
  const devices = await fetch(`${iam}/api/v1/auth/me/devices`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!devices.ok) {
    const body = await devices.text();
    die(`IAM /auth/me/devices failed (${devices.status}): ${body}`);
  }
  const { data } = await devices.json();
  return (data || []).map((d) => ({ token: d.token, platform: d.platform }));
}

function buildMessage({ token, title, body, deepLink, extraData }) {
  const data = { ...(extraData || {}) };
  if (deepLink) data.deep_link = deepLink;
  // FCM v1 requires all data values to be strings.
  for (const k of Object.keys(data)) data[k] = String(data[k]);

  return {
    message: {
      token,
      notification: { title, body },
      data,
      android: {
        priority: 'HIGH',
        notification: { channelId: 'default', sound: 'default' },
      },
      apns: {
        payload: { aps: { sound: 'default' } },
      },
    },
  };
}

async function sendToToken({ projectId, accessToken, token, payload, dryRun }) {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const fullPayload = { ...payload, message: { ...payload.message, token } };
  if (dryRun) {
    console.log(`[dry-run] would POST to ${url}`);
    console.log(JSON.stringify(fullPayload, null, 2));
    return { dryRun: true };
  }
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fullPayload),
  });
  const text = await resp.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: resp.status, body: parsed };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) return help();

  const sa = loadServiceAccount(args.serviceAccount);
  const projectId = sa.project_id;
  if (!projectId) die('Service account JSON missing "project_id".');

  // Figure out the recipient(s)
  let recipients = [];
  if (args.token) {
    recipients.push({ token: args.token, platform: 'unknown' });
  } else if (args.userEmail) {
    const iam = args.iam || process.env.IAM_URL || 'http://localhost:3001';
    const password = args.password || process.env.IAM_PASSWORD;
    console.log(`Looking up devices for ${args.userEmail} via ${iam} …`);
    recipients = await fetchTokensForUser({ iam, email: args.userEmail, password });
    if (recipients.length === 0) die(`No devices registered for ${args.userEmail}.`);
    console.log(`Found ${recipients.length} device(s).`);
  } else {
    die('Provide either --token <FCM_TOKEN> or --user-email <email>.');
  }

  const accessToken = await getAccessToken(sa);
  const payload = buildMessage({
    title: args.title || 'Nexus SCM',
    body: args.body || 'This is a test push.',
    deepLink: args.deepLink,
    extraData: args.data,
  });

  console.log(`Sending to ${recipients.length} device(s) via FCM project "${projectId}"…`);
  let okCount = 0;
  for (const r of recipients) {
    const result = await sendToToken({
      projectId,
      accessToken,
      token: r.token,
      payload,
      dryRun: args.dryRun,
    });
    if (result.dryRun) {
      okCount++;
      continue;
    }
    if (result.status >= 200 && result.status < 300) {
      okCount++;
      const name = result.body?.name || '(no name)';
      console.log(`  ✓ ${r.platform.padEnd(7)} ${r.token.slice(0, 16)}… → ${name}`);
    } else {
      const code = result.body?.error?.status || result.status;
      const msg = result.body?.error?.message || JSON.stringify(result.body).slice(0, 200);
      console.error(`  ✗ ${r.platform.padEnd(7)} ${r.token.slice(0, 16)}… → ${code} · ${msg}`);
    }
  }
  console.log(`Done. ${okCount}/${recipients.length} accepted by FCM.`);
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
