const axios = require('axios');
const { env, SERVICE_NAMES } = require('../helpers/env');
const { generateSampleTraffic } = require('../helpers/http');
const { waitFor } = require('../helpers/wait');

/**
 * Asserts that structured logs reach Loki AND carry trace_id/span_id.
 */
async function queryLoki(query) {
  const end = Date.now() * 1e6;
  const start = end - 5 * 60 * 1e9; // last 5 minutes
  const res = await axios.get(`${env.lokiUrl}/loki/api/v1/query_range`, {
    params: { query, start, end, limit: 50 },
    timeout: 5000,
    validateStatus: () => true,
  });
  return res;
}

describe('Log correlation — JSON logs in Loki with trace_id/span_id', () => {
  beforeAll(async () => {
    await generateSampleTraffic(env).catch(() => {});
    await new Promise(r => setTimeout(r, 5000));
  });

  for (const [key, serviceName] of Object.entries(SERVICE_NAMES)) {
    test(`${key}: emits structured log lines to Loki`, async () => {
      const res = await waitFor(async () => {
        const r = await queryLoki(`{service_name="${serviceName}"}`);
        if (r.status !== 200) return null;
        const streams = r.data?.data?.result || [];
        return streams.length > 0 ? r : null;
      }, { timeoutMs: 20000, label: `Loki logs for ${serviceName}` });

      expect(res.status).toBe(200);
    });

    test(`${key}: at least one log line contains trace_id`, async () => {
      const r = await queryLoki(`{service_name="${serviceName}"} |= "trace_id"`);
      expect(r.status).toBe(200);
      const streams = r.data?.data?.result || [];
      const lines = streams.flatMap(s => s.values.map(v => v[1]));
      const withTrace = lines.filter(l => /"trace_id"\s*:\s*"[0-9a-f]{32}"/i.test(l));
      expect(withTrace.length).toBeGreaterThan(0);
    });
  }
});
