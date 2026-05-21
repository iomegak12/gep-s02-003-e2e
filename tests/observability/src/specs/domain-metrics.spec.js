const { env, SERVICE_NAMES } = require('../helpers/env');
const { fetchCollectorMetrics, findSeries } = require('../helpers/prom');
const { loginAs } = require('../helpers/http');

/**
 * Asserts the presence of domain counters / histograms emitted by IAM, PO, Supplier.
 * Cycle 6 implements the producing code; this spec stays RED until then.
 */
describe('Domain (business) metrics', () => {
  beforeAll(async () => {
    // Drive IAM login → produces iam_logins_total{result="success"}.
    await loginAs(env.iamUrl, env.adminEmail, env.seedPassword).catch(() => {});
    await new Promise(r => setTimeout(r, 6000));
  });

  test('IAM exposes iam_logins_total counter (result label)', async () => {
    const parsed = await fetchCollectorMetrics(env.collectorMetricsUrl);
    const series = findSeries(parsed, 'iam_logins_total', { service_name: SERVICE_NAMES.iam });
    expect(series.length).toBeGreaterThan(0);
    expect(series[0].labels).toEqual(expect.objectContaining({ result: expect.any(String) }));
  });

  test('IAM exposes iam_jwt_issued_total counter (role label)', async () => {
    const parsed = await fetchCollectorMetrics(env.collectorMetricsUrl);
    const series = findSeries(parsed, 'iam_jwt_issued_total', { service_name: SERVICE_NAMES.iam });
    expect(series.length).toBeGreaterThan(0);
  });

  test('PO exposes po_state_transitions_total counter (from,to,outcome labels)', async () => {
    const parsed = await fetchCollectorMetrics(env.collectorMetricsUrl);
    const series = findSeries(parsed, 'po_state_transitions_total', { service_name: SERVICE_NAMES.po });
    expect(series.length).toBeGreaterThan(0);
    const sample = series[0];
    expect(sample.labels).toEqual(expect.objectContaining({
      from: expect.any(String),
      to: expect.any(String),
      outcome: expect.any(String),
    }));
  });

  test('PO exposes po_approval_duration_seconds histogram', async () => {
    const parsed = await fetchCollectorMetrics(env.collectorMetricsUrl);
    const buckets = findSeries(parsed, 'po_approval_duration_seconds_bucket', { service_name: SERVICE_NAMES.po });
    expect(buckets.length).toBeGreaterThan(0);
  });

  test('Supplier exposes supplier_blacklist_hits_total counter', async () => {
    const parsed = await fetchCollectorMetrics(env.collectorMetricsUrl);
    const series = findSeries(parsed, 'supplier_blacklist_hits_total', { service_name: SERVICE_NAMES.supplier });
    expect(series.length).toBeGreaterThan(0);
  });

  test('Supplier exposes supplier_crud_total counter (op,status labels)', async () => {
    const parsed = await fetchCollectorMetrics(env.collectorMetricsUrl);
    const series = findSeries(parsed, 'supplier_crud_total', { service_name: SERVICE_NAMES.supplier });
    expect(series.length).toBeGreaterThan(0);
    expect(series[0].labels).toEqual(expect.objectContaining({
      op: expect.any(String),
      status: expect.any(String),
    }));
  });
});
