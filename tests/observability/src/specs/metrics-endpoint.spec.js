const { env } = require('../helpers/env');
const { fetchCollectorMetrics } = require('../helpers/prom');
const { generateSampleTraffic } = require('../helpers/http');

describe('OTel Collector — Prometheus metrics endpoint', () => {
  beforeAll(async () => {
    await generateSampleTraffic(env).catch(() => { /* services may not be up yet */ });
  });

  test('exposes Prometheus exposition format at :8889/metrics', async () => {
    const parsed = await fetchCollectorMetrics(env.collectorMetricsUrl);
    expect(typeof parsed).toBe('object');
    expect(Object.keys(parsed).length).toBeGreaterThan(0);
  });

  test('contains at least one OTel-translated metric series', async () => {
    const parsed = await fetchCollectorMetrics(env.collectorMetricsUrl);
    const names = Object.keys(parsed);
    const otelLike = names.filter(n =>
      n.startsWith('http_server_') ||
      n.startsWith('process_') ||
      n.startsWith('system_') ||
      n.startsWith('otelcol_')
    );
    expect(otelLike.length).toBeGreaterThan(0);
  });

  test('Collector self-health endpoint responds 200', async () => {
    const axios = require('axios');
    const res = await axios.get(env.collectorHealthUrl, { timeout: 3000, validateStatus: () => true });
    expect(res.status).toBe(200);
  });
});
