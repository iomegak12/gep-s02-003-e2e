// FCM v1 sender used by the internal notifications endpoint.
// Loads a Firebase service account from FIREBASE_SERVICE_ACCOUNT_PATH (default ./firebase-service-account.json)
// OR from FIREBASE_SERVICE_ACCOUNT_JSON (inline JSON, handy for docker secrets).
//
// On a per-token 404 with FCM error code UNREGISTERED, the offending token is deleted
// from the `devices` table so subsequent sends don't keep failing.

const fs = require('fs');
const path = require('path');

let auth;
try {
  // Lazy-required so the rest of IAM still runs without google-auth-library installed
  // (e.g., in environments where push isn't configured yet).
  auth = require('google-auth-library');
} catch {
  auth = null;
}

const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];

let cached = null; // { projectId, getAccessToken }

function isConfigured() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return true;
  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(__dirname, '..', 'firebase-service-account.json');
  return fs.existsSync(p);
}

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(__dirname, '..', 'firebase-service-account.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function getClient() {
  if (cached) return cached;
  if (!auth) throw new Error('google-auth-library is not installed');
  const sa = loadServiceAccount();
  if (!sa.project_id) throw new Error('Service account JSON missing project_id');
  const ga = new auth.GoogleAuth({ credentials: sa, scopes: SCOPES });
  cached = {
    projectId: sa.project_id,
    async getAccessToken() {
      const c = await ga.getClient();
      const { token } = await c.getAccessToken();
      return token;
    },
  };
  return cached;
}

function buildMessage({ token, title, body, data, deepLink }) {
  const d = { ...(data || {}) };
  if (deepLink) d.deep_link = deepLink;
  for (const k of Object.keys(d)) d[k] = String(d[k]);
  return {
    message: {
      token,
      notification: { title, body },
      data: d,
      android: {
        priority: 'HIGH',
        notification: { channel_id: 'default', sound: 'default' },
      },
      apns: { payload: { aps: { sound: 'default' } } },
    },
  };
}

/**
 * Send the same notification to many tokens. Returns aggregate stats and the list of
 * tokens that should be pruned (FCM said UNREGISTERED).
 */
async function sendToTokens(tokens, { title, body, data, deepLink }) {
  if (!tokens || tokens.length === 0) {
    return { sent: 0, failed: 0, pruneTokens: [] };
  }
  if (!isConfigured()) {
    return { sent: 0, failed: tokens.length, pruneTokens: [], skipped: true };
  }
  const { projectId, getAccessToken } = getClient();
  const accessToken = await getAccessToken();
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  let sent = 0;
  let failed = 0;
  const pruneTokens = [];

  await Promise.all(tokens.map(async (tok) => {
    const payload = buildMessage({ token: tok, title, body, data, deepLink });
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (resp.ok) { sent++; return; }
      failed++;
      const text = await resp.text();
      let parsed; try { parsed = JSON.parse(text); } catch { parsed = null; }
      const errCode = parsed?.error?.details?.find?.((d) => d['@type']?.endsWith('FcmError'))?.errorCode
                   || parsed?.error?.status;
      // UNREGISTERED / NOT_FOUND → device is gone; prune.
      if (resp.status === 404 || errCode === 'UNREGISTERED' || errCode === 'NOT_FOUND') {
        pruneTokens.push(tok);
      }
      console.warn(`[fcm] send failed (${resp.status}) ${tok.slice(0, 16)}…: ${errCode || text.slice(0, 120)}`);
    } catch (e) {
      failed++;
      console.warn(`[fcm] send error ${tok.slice(0, 16)}…:`, e.message);
    }
  }));

  return { sent, failed, pruneTokens };
}

module.exports = { isConfigured, sendToTokens };
