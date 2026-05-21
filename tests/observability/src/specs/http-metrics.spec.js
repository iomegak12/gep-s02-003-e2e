const { env, SERVICE_NAMES } = require('../helpers/env');
const { fetchCollectorMetrics, findSeries } = require('../helpers/prom');
const { generateSampleTraffic } = require('../helpers/http');

describe('HTTP server metrics — auto-instrumentation', () => {
  beforeAll(async () => {
    await generateSampleTraffic(env).catch(() => {});
    await new Promise(r => setTimeout(r, 6000));
  });

  for (const [key, serviceName] of Object.entries(SERVICE_NAMES)) {
    test(`${key}: http_server_duration histogram has buckets`, async () => {
      const parsed = await fetchCollectorMetrics(env.collectorMetricsUrl);
      const buckets = findSeries(parsed, 'http_server_duration_bucket', { service_name: serviceName });
      const count   = findSeries(parsed, 'http_server_duration_count',  { service_name: serviceName });
      const sum     = findSeries(parsed, 'http_server_duration_sum',    { service_name: serviceName });
      expect(buckets.length).toBeGreaterThan(0);
      expect(count.length).toBeGreaterThan(0);
      expect(sum.length).toBeGreaterThan(0);
    });

    test(`${key}: histogram labels include http_route and http_status_code`, async () => {
      const parsed = await fetchCollectorMetrics(env.collectorMetricsUrl);
      const buckets = findSeries(parsed, 'http_server_duration_bucket', { service_name: serviceName });
      const sample = buckets[0];
      expect(sample).toBeDefined();
      expect(sample.labels).toEqual(expect.objectContaining({
        http_route: expect.any(String),
        http_status_code: expect.any(String),
      }));
    });
  }
});
