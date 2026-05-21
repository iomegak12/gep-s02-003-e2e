const { env, SERVICE_NAMES } = require('../helpers/env');
const { queryProm } = require('../helpers/prom');
const { generateSampleTraffic } = require('../helpers/http');
const { waitFor } = require('../helpers/wait');

/**
 * Tempo `metrics_generator` (or Collector `servicegraph` connector) emits
 *   traces_service_graph_request_total{client=..., server=...}
 *   traces_spanmetrics_calls_total{service_name=..., span_kind=...}
 * Both should be queryable from Prometheus after Cycle 7.
 */
describe('Service dependency graph & spanmetrics (from traces)', () => {
  beforeAll(async () => {
    // Trigger cross-service traffic so edges appear.
    for (let i = 0; i < 3; i++) await generateSampleTraffic(env).catch(() => {});
    await new Promise(r => setTimeout(r, 8000));
  });

  test('service graph edge present: po -> supplier OR po -> iam', async () => {
    const series = await waitFor(async () => {
      const r = await queryProm(
        env.prometheusUrl,
        `traces_service_graph_request_total{client="${SERVICE_NAMES.po}"}`,
      );
      return r.length > 0 ? r : null;
    }, { timeoutMs: 30000, label: 'service graph edge from PO' });

    const servers = series.map(s => s.metric.server);
    expect(servers.some(s => s === SERVICE_NAMES.supplier || s === SERVICE_NAMES.iam)).toBe(true);
  });

  test('spanmetrics calls total present for all 3 services', async () => {
    for (const svc of Object.values(SERVICE_NAMES)) {
      const r = await queryProm(
        env.prometheusUrl,
        `traces_spanmetrics_calls_total{service_name="${svc}"}`,
      );
      expect(r.length).toBeGreaterThan(0);
    }
  });
});
