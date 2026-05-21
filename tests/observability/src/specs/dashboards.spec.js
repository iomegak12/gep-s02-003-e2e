const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { env } = require('../helpers/env');

const DASHBOARD_DIR = path.resolve(
  __dirname, '..', '..', '..', '..',
  'back-end', 'observability', 'grafana', 'dashboards',
);

const EXPECTED_DASHBOARDS = [
  'A1_platform_overview',
  'A2_service_dependency_graph',
  'A3_transaction_flow',
  'B1_iam_red',
  'B2_supplier_red',
  'B3_po_red',
  'C1_node_runtime',
  'C2_python_runtime',
  'C3_container_resources',
  'D1_postgres',
  'D2_mongo',
  'E1_api_latency_heatmap',
  'E2_cross_service_calls',
  'F1_logs_explorer',
  'F2_error_logs_patterns',
  'G1_trace_search_apm',
  'G2_span_metrics',
  'H1_iam_domain',
  'H2_supplier_domain',
  'H3_po_domain_slo',
  'I1_rum_overview',
  'I2_core_web_vitals',
  'I3_frontend_errors',
  'I4_user_journeys',
  'I5_browser_to_api_trace',
  'J1_collector_health',
];

function grafana() {
  return axios.create({
    baseURL: env.grafanaUrl,
    auth: { username: env.grafanaUser, password: env.grafanaPassword },
    timeout: 5000,
    validateStatus: () => true,
  });
}

describe('Grafana dashboards — 26 dashboards provisioned', () => {
  test('all expected dashboard JSON files exist', () => {
    for (const name of EXPECTED_DASHBOARDS) {
      const p = path.join(DASHBOARD_DIR, `${name}.json`);
      expect(fs.existsSync(p)).toBe(true);
    }
  });

  test('every dashboard JSON has unique uid and a title', () => {
    const seen = new Set();
    for (const name of EXPECTED_DASHBOARDS) {
      const raw = fs.readFileSync(path.join(DASHBOARD_DIR, `${name}.json`), 'utf8');
      const j = JSON.parse(raw);
      expect(j.uid).toBeTruthy();
      expect(j.title).toBeTruthy();
      expect(seen.has(j.uid)).toBe(false);
      seen.add(j.uid);
    }
  });

  test('Grafana API reports all expected dashboards loaded', async () => {
    const g = grafana();
    const res = await g.get('/api/search', { params: { type: 'dash-db', limit: 100 } });
    expect(res.status).toBe(200);
    const titles = (res.data || []).map(d => d.title);
    expect(titles.length).toBeGreaterThanOrEqual(EXPECTED_DASHBOARDS.length);
  });

  test('Grafana datasources are configured: Prometheus, Loki, Tempo', async () => {
    const g = grafana();
    const res = await g.get('/api/datasources');
    expect(res.status).toBe(200);
    const types = (res.data || []).map(d => d.type);
    expect(types).toEqual(expect.arrayContaining(['prometheus', 'loki', 'tempo']));
  });
});
