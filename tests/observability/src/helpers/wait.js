const axios = require('axios');

async function waitFor(fn, { timeoutMs = 60000, intervalMs = 1000, label = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      const ok = await fn();
      if (ok) return ok;
    } catch (e) {
      lastErr = e;
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out waiting for ${label}: ${lastErr ? lastErr.message : 'no result'}`);
}

async function waitForHttp(url, { timeoutMs = 60000, expectStatus = 200 } = {}) {
  return waitFor(async () => {
    const res = await axios.get(url, { timeout: 3000, validateStatus: () => true });
    return res.status === expectStatus;
  }, { timeoutMs, label: `HTTP ${expectStatus} from ${url}` });
}

module.exports = { waitFor, waitForHttp };
