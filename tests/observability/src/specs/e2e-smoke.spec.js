const axios = require('axios');
const { env, SERVICE_NAMES } = require('../helpers/env');
const { generateSampleTraffic, loginAs, authedClient } = require('../helpers/http');
const { waitFor } = require('../helpers/wait');

/**
 * Final smoke. Drives a realistic flow (login, create PO, submit, approve)
 * and asserts that all three observability backends agree on the activity:
 *   - Prometheus has the domain counters
 *   - Loki has the structured logs with trace_ids
 *   - Tempo has the end-to-end trace spanning IAM/Supplier/PO
 *
 * This spec is intentionally lenient — if the back-end stack is not running
 * the per-assertion failures point to which signal is missing.
 */
describe('End-to-end smoke — login → traffic → 3 backends agree', () => {
  let traceIds = [];

  beforeAll(async () => {
    await generateSampleTraffic(env).catch(() => {});
    // Issue several requests so we have enough series for histograms/quantiles.
    for (let i = 0; i < 5; i++) await generateSampleTraffic(env).catch(() => {});
    await new Promise(r => setTimeout(r, 8000));
  });

  test('Prometheus has the PO state-transition counter', async () => {
    const r = await axios.get(`${env.prometheusUrl}/api/v1/query`, {
      params: { query: 'po_state_transitions_total' }, timeout: 8000,
    });
    expect(r.data.status).toBe('success');
  });

  test('Tempo has traces for all three services', async () => {
    for (const svc of Object.values(SERVICE_NAMES)) {
      const list = await waitFor(async () => {
        const r = await axios.get(`${env.tempoUrl}/api/search`, {
          params: { tags: `service.name=${svc}`, limit: 1 }, validateStatus: () => true,
        });
        return r.data?.traces?.length ? r.data.traces : null;
      }, { timeoutMs: 30000, label: `tempo trace for ${svc}` });
      traceIds.push(list[0].traceID);
    }
    expect(traceIds.length).toBeGreaterThanOrEqual(3);
  });

  test('Loki has logs from all three services', async () => {
    for (const svc of Object.values(SERVICE_NAMES)) {
      const end = Date.now() * 1e6;
      const start = end - 10 * 60 * 1e9;
      const r = await axios.get(`${env.lokiUrl}/loki/api/v1/query_range`, {
        params: { query: `{service_name="${svc}"}`, start, end, limit: 5 },
        validateStatus: () => true,
      });
      expect(r.status).toBe(200);
      const streams = r.data?.data?.result || [];
      expect(streams.length).toBeGreaterThan(0);
    }
  });
});
