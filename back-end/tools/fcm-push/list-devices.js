#!/usr/bin/env node
/**
 * list-devices.js — sign in as a user and print their registered FCM devices.
 *
 * Usage:
 *   node list-devices.js --email <user@demo.local> --password <pass> [--iam http://localhost:3001]
 */

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--email':    out.email = next(); break;
      case '--password': out.password = next(); break;
      case '--iam':      out.iam = next(); break;
      case '-h':
      case '--help':     out.help = true; break;
      default: console.error(`Unknown argument: ${a}`); process.exit(2);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.email) {
    console.log('Usage: node list-devices.js --email <user> --password <pass> [--iam http://localhost:3001]');
    process.exit(args.help ? 0 : 2);
  }
  const iam = args.iam || process.env.IAM_URL || 'http://localhost:3001';
  const password = args.password || process.env.IAM_PASSWORD;
  if (!password) { console.error('--password is required (or set IAM_PASSWORD)'); process.exit(2); }

  const login = await fetch(`${iam}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: args.email, password }),
  });
  if (!login.ok) {
    console.error(`Login failed: ${login.status} ${await login.text()}`);
    process.exit(1);
  }
  const { access_token } = await login.json();
  const resp = await fetch(`${iam}/api/v1/auth/me/devices`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!resp.ok) {
    console.error(`/auth/me/devices failed: ${resp.status} ${await resp.text()}`);
    process.exit(1);
  }
  const { data, total } = await resp.json();
  console.log(`${total} device(s) for ${args.email}:`);
  for (const d of data || []) {
    console.log(`  • ${d.platform.padEnd(7)} v${d.app_version || '?'}  last seen ${d.last_seen_at}`);
    console.log(`    ${d.token}`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
