#!/usr/bin/env node
// Generates the 23 hand-crafted GEP-003 Grafana 11 dashboards as JSON files.
// Run: `node back-end/observability/tools/generate-dashboards.js`
//
// Output: back-end/observability/grafana/dashboards/<id>_<slug>.json
//
// Each dashboard is intentionally compact (1-page, focused) — production-style
// rather than community-import bloat. Datasource UIDs are wired to provisioned
// datasources: "prometheus" (default), "loki", "tempo".

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, '..', 'grafana', 'dashboards');
fs.mkdirSync(OUT_DIR, { recursive: true });

const DS_PROM  = { type: 'prometheus', uid: 'prometheus' };
const DS_LOKI  = { type: 'loki',       uid: 'loki' };
const DS_TEMPO = { type: 'tempo',      uid: 'tempo' };

let panelId = 0;
const nid = () => ++panelId;

// ---------- panel helpers ----------
const stat = (title, expr, unit = 'none', extra = {}) => ({
  id: nid(), type: 'stat', title, datasource: DS_PROM,
  targets: [{ expr, refId: 'A' }],
  fieldConfig: { defaults: { unit, ...extra } },
  options: { reduceOptions: { calcs: ['lastNotNull'] }, colorMode: 'value' },
});

const ts = (title, expr, unit = 'none', legend = '{{service_name}}') => ({
  id: nid(), type: 'timeseries', title, datasource: DS_PROM,
  targets: [{ expr, refId: 'A', legendFormat: legend }],
  fieldConfig: { defaults: { unit, custom: { lineWidth: 1, fillOpacity: 10 } } },
  options: { legend: { displayMode: 'list', placement: 'bottom' } },
});

const heatmap = (title, expr) => ({
  id: nid(), type: 'heatmap', title, datasource: DS_PROM,
  targets: [{ expr, refId: 'A', format: 'heatmap', legendFormat: '{{le}}' }],
  options: { calculate: false, color: { scheme: 'Spectral', mode: 'scheme', exponent: 0.5 } },
});

const table = (title, expr) => ({
  id: nid(), type: 'table', title, datasource: DS_PROM,
  targets: [{ expr, refId: 'A', format: 'table', instant: true }],
});

const logs = (title, expr) => ({
  id: nid(), type: 'logs', title, datasource: DS_LOKI,
  targets: [{ expr, refId: 'A' }],
  options: { showLabels: true, showTime: true, wrapLogMessage: true },
});

const nodeGraph = (title) => ({
  id: nid(), type: 'nodeGraph', title, datasource: DS_TEMPO,
  targets: [{ queryType: 'serviceMap', refId: 'A' }],
});

const traceSearch = (title) => ({
  id: nid(), type: 'traces', title, datasource: DS_TEMPO,
  targets: [{ queryType: 'traceql', query: '{ status = error } || {}', refId: 'A', limit: 20 }],
});

// Place panels in a tidy 24-col grid.
function layout(panels) {
  const cols = 12, rowH = 8;
  return panels.map((p, i) => ({
    ...p,
    gridPos: { x: (i % 2) * cols, y: Math.floor(i / 2) * rowH, w: cols, h: rowH },
  }));
}

function dash(uid, title, tags, panels) {
  return {
    annotations: { list: [] },
    description: title,
    editable: true,
    fiscalYearStartMonth: 0,
    graphTooltip: 1,
    id: null,
    panels: layout(panels),
    refresh: '30s',
    schemaVersion: 39,
    tags: ['gep', ...tags],
    templating: { list: [] },
    time: { from: 'now-1h', to: 'now' },
    timepicker: {},
    timezone: '',
    title,
    uid,
    version: 1,
    weekStart: '',
  };
}

// ---------- dashboards ----------
const dashboards = [
  ['A1_platform_overview', 'Platform Overview (SLO Summary)', ['overview', 'slo'], () => [
    stat('Availability (30d) — IAM',      `slo:availability:30d{service_name="gep-iam"}`,      'percentunit'),
    stat('Availability (30d) — Supplier', `slo:availability:30d{service_name="gep-supplier"}`, 'percentunit'),
    stat('Availability (30d) — PO',       `slo:availability:30d{service_name="gep-po"}`,       'percentunit'),
    stat('PO approval p99 (5m)',          `slo:po_approval_latency:p99_5m`,                    's'),
    ts('HTTP error ratio (5m)',           `slo:http_error_ratio:5m`,                           'percentunit'),
    ts('Request rate per service',        `sum by (service_name) (rate(http_server_duration_count[1m]))`),
    stat('Web Vitals — LCP p75 (24h)',    `slo:rum_web_vitals_lcp:p75_24h`,                    's'),
    stat('Web Vitals — INP p75 (24h)',    `slo:rum_web_vitals_inp:p75_24h`,                    's'),
  ]],

  ['A2_service_dependency_graph', 'Service Dependency Graph', ['traces', 'graph'], () => [
    nodeGraph('Service dependency map (Tempo)'),
    ts('Edge request rate', `sum by (client, server) (rate(traces_service_graph_request_total[1m]))`, 'reqps', '{{client}} → {{server}}'),
    ts('Edge error ratio',  `sum by (client, server) (rate(traces_service_graph_request_failed_total[5m])) / clamp_min(sum by (client, server) (rate(traces_service_graph_request_total[5m])), 1e-9)`, 'percentunit', '{{client}} → {{server}}'),
    ts('Edge p95 latency',  `histogram_quantile(0.95, sum by (le, client, server) (rate(traces_service_graph_request_server_seconds_bucket[5m])))`, 's', '{{client}} → {{server}}'),
  ]],

  ['A3_transaction_flow', 'Cross-Service Transaction Flow', ['traces', 'transactions'], () => [
    traceSearch('Recent traces (all services)'),
    ts('Span call rate by service',     `sum by (service_name) (rate(traces_spanmetrics_calls_total[1m]))`, 'reqps'),
    ts('Span p95 latency by service',   `histogram_quantile(0.95, sum by (le, service_name) (rate(traces_spanmetrics_latency_bucket[5m])))`, 's'),
  ]],

  ...['gep-iam', 'gep-supplier', 'gep-po'].map((svc, i) => {
    const id = `B${i+1}_${svc.replace('gep-', '')}_red`;
    const title = `${svc.replace('gep-', '').toUpperCase()} — RED`;
    return [id, title, ['service', svc], () => [
      stat('Request rate (1m)',  `sum(rate(http_server_duration_count{service_name="${svc}"}[1m]))`, 'reqps'),
      stat('Error rate (5m)',    `sum(rate(http_server_duration_count{service_name="${svc}",http_status_code=~"5.."}[5m]))`, 'reqps'),
      stat('p50 latency (5m)',   `histogram_quantile(0.50, sum by (le) (rate(http_server_duration_bucket{service_name="${svc}"}[5m])))`, 's'),
      stat('p99 latency (5m)',   `histogram_quantile(0.99, sum by (le) (rate(http_server_duration_bucket{service_name="${svc}"}[5m])))`, 's'),
      ts('Requests by route',    `sum by (http_route) (rate(http_server_duration_count{service_name="${svc}"}[1m]))`, 'reqps', '{{http_route}}'),
      ts('Status code mix',      `sum by (http_status_code) (rate(http_server_duration_count{service_name="${svc}"}[1m]))`, 'reqps', '{{http_status_code}}'),
      heatmap('Latency heatmap', `sum by (le) (rate(http_server_duration_bucket{service_name="${svc}"}[1m]))`),
      ts('In-flight requests',   `sum(http_server_active_requests{service_name="${svc}"})`, 'short'),
    ]];
  }),

  ['C1_node_runtime', 'Node.js Runtime (IAM + PO)', ['runtime', 'node'], () => [
    ts('CPU utilization', `process_cpu_utilization{service_name=~"gep-iam|gep-po"}`, 'percentunit'),
    ts('RSS memory',      `process_memory_usage{service_name=~"gep-iam|gep-po"}`, 'bytes'),
    ts('Event-loop lag',  `nodejs_eventloop_lag_seconds{service_name=~"gep-iam|gep-po"}`, 's'),
    ts('GC pause',        `nodejs_gc_duration_seconds_sum{service_name=~"gep-iam|gep-po"}`, 's'),
    ts('Active handles',  `nodejs_active_handles{service_name=~"gep-iam|gep-po"}`, 'short'),
    ts('Heap by space',   `nodejs_heap_space_size_used_bytes{service_name=~"gep-iam|gep-po"}`, 'bytes', '{{space}}'),
  ]],

  ['C2_python_runtime', 'Python Runtime (Supplier)', ['runtime', 'python'], () => [
    ts('CPU utilization', `process_cpu_utilization{service_name="gep-supplier"}`, 'percentunit'),
    ts('RSS memory',      `process_memory_usage{service_name="gep-supplier"}`, 'bytes'),
    ts('Threads',         `process_runtime_cpython_thread_count{service_name="gep-supplier"}`, 'short'),
    ts('GC objects',      `process_runtime_cpython_gc_objects_collected{service_name="gep-supplier"}`, 'short', '{{generation}}'),
  ]],

  ['C3_container_resources', 'Container Resources (CPU / Mem / Net / IO)', ['runtime', 'host'], () => [
    ts('CPU (system)',      `system_cpu_utilization`,    'percentunit'),
    ts('Memory used',       `system_memory_usage{state="used"}`, 'bytes'),
    ts('Network RX/TX',     `rate(system_network_io[1m])`, 'Bps', '{{direction}}'),
    ts('Disk IO ops',       `rate(system_disk_operations[1m])`, 'iops', '{{direction}}'),
    ts('Disk IO bytes',     `rate(system_disk_io[1m])`, 'Bps', '{{direction}}'),
  ]],

  ['D1_postgres', 'PostgreSQL (IAM + PO)', ['database', 'postgres'], () => [
    ts('Query rate (server-spans, db.system=postgresql)',
       `sum(rate(traces_spanmetrics_calls_total{db_system="postgresql"}[1m]))`, 'reqps'),
    ts('Query p95 latency',
       `histogram_quantile(0.95, sum by (le) (rate(traces_spanmetrics_latency_bucket{db_system="postgresql"}[5m])))`, 's'),
    ts('Errors',
       `sum(rate(traces_spanmetrics_calls_total{db_system="postgresql",status_code="STATUS_CODE_ERROR"}[1m]))`, 'reqps'),
    table('Top slowest pg operations',
       `topk(10, sum by (db_operation) (rate(traces_spanmetrics_latency_sum{db_system="postgresql"}[5m])) / clamp_min(sum by (db_operation) (rate(traces_spanmetrics_latency_count{db_system="postgresql"}[5m])), 1e-9))`),
  ]],

  ['D2_mongo', 'MongoDB (Supplier)', ['database', 'mongo'], () => [
    ts('Op rate by command',
       `sum by (db_operation) (rate(traces_spanmetrics_calls_total{db_system="mongodb"}[1m]))`, 'reqps', '{{db_operation}}'),
    ts('p95 latency by command',
       `histogram_quantile(0.95, sum by (le, db_operation) (rate(traces_spanmetrics_latency_bucket{db_system="mongodb"}[5m])))`, 's', '{{db_operation}}'),
    ts('Errors',
       `sum(rate(traces_spanmetrics_calls_total{db_system="mongodb",status_code="STATUS_CODE_ERROR"}[1m]))`, 'reqps'),
  ]],

  ['E1_api_latency_heatmap', 'API Latency Heatmap', ['http'], () => [
    heatmap('Latency heatmap (all services)', `sum by (le) (rate(http_server_duration_bucket[1m]))`),
    ts('Request body size (avg)',  `sum by (service_name) (rate(http_server_request_body_size_sum[5m])) / clamp_min(sum by (service_name) (rate(http_server_request_body_size_count[5m])), 1e-9)`, 'bytes'),
    ts('4xx ratio',                `sum by (service_name) (rate(http_server_duration_count{http_status_code=~"4.."}[5m])) / clamp_min(sum by (service_name) (rate(http_server_duration_count[5m])), 1e-9)`, 'percentunit'),
    ts('5xx ratio',                `sum by (service_name) (rate(http_server_duration_count{http_status_code=~"5.."}[5m])) / clamp_min(sum by (service_name) (rate(http_server_duration_count[5m])), 1e-9)`, 'percentunit'),
  ]],

  ['E2_cross_service_calls', 'Cross-Service Calls (PO → IAM / Supplier)', ['cross-service'], () => [
    ts('Call rate by target',  `sum by (target) (rate(po_cross_service_calls_total[1m]))`, 'reqps', '{{target}}'),
    ts('Status mix',           `sum by (target, status) (rate(po_cross_service_calls_total[1m]))`, 'reqps', '{{target}}/{{status}}'),
    ts('Edge p95 (from graph)',`histogram_quantile(0.95, sum by (le, client, server) (rate(traces_service_graph_request_server_seconds_bucket{client="gep-po"}[5m])))`, 's', '→ {{server}}'),
  ]],

  ['F1_logs_explorer', 'Unified Logs Explorer', ['logs'], () => [
    logs('All services — last 1h', `{service_name=~"gep-.+"}`),
    logs('Errors only',            `{service_name=~"gep-.+"} |= "\\"level\\":\\"error\\""`),
  ]],

  ['F2_error_logs_patterns', 'Error Logs & Patterns', ['logs', 'errors'], () => [
    logs('Errors (IAM)',      `{service_name="gep-iam"} |= "error"`),
    logs('Errors (Supplier)', `{service_name="gep-supplier"} |= "error"`),
    logs('Errors (PO)',       `{service_name="gep-po"} |= "error"`),
    {
      id: nid(), type: 'timeseries', title: 'Error log rate by service', datasource: DS_LOKI,
      targets: [{ expr: 'sum by (service_name) (rate({service_name=~"gep-.+"} |= "error" [1m]))', refId: 'A', legendFormat: '{{service_name}}' }],
      fieldConfig: { defaults: { unit: 'short' } },
    },
  ]],

  ['G1_trace_search_apm', 'Trace Search & APM', ['traces', 'apm'], () => [
    traceSearch('Recent traces'),
    ts('Trace ingest rate', `rate(tempo_distributor_spans_received_total[1m])`, 'short'),
    ts('Slow traces (> 1s) rate', `sum(rate(traces_spanmetrics_latency_bucket{le="+Inf"}[1m])) - sum(rate(traces_spanmetrics_latency_bucket{le="1"}[1m]))`, 'reqps'),
  ]],

  ['G2_span_metrics', 'Span Metrics (RED from traces)', ['traces', 'spanmetrics'], () => [
    ts('Calls rate by service', `sum by (service_name) (rate(traces_spanmetrics_calls_total[1m]))`, 'reqps'),
    ts('Errors rate by service', `sum by (service_name) (rate(traces_spanmetrics_calls_total{status_code="STATUS_CODE_ERROR"}[1m]))`, 'reqps'),
    ts('p50 latency by service', `histogram_quantile(0.50, sum by (le, service_name) (rate(traces_spanmetrics_latency_bucket[5m])))`, 's'),
    ts('p99 latency by service', `histogram_quantile(0.99, sum by (le, service_name) (rate(traces_spanmetrics_latency_bucket[5m])))`, 's'),
  ]],

  ['H1_iam_domain', 'IAM Domain', ['domain', 'iam'], () => [
    ts('Logins by result',  `sum by (result) (rate(iam_logins_total[1m]))`, 'reqps', '{{result}}'),
    ts('JWTs issued',       `sum by (role) (rate(iam_jwt_issued_total[1m]))`, 'reqps', '{{role}}'),
    ts('Registrations',     `sum by (result) (rate(iam_registrations_total[1m]))`, 'reqps', '{{result}}'),
    stat('Login success ratio', `sum(rate(iam_logins_total{result="success"}[5m])) / clamp_min(sum(rate(iam_logins_total[5m])), 1e-9)`, 'percentunit'),
  ]],

  ['H2_supplier_domain', 'Supplier Domain', ['domain', 'supplier'], () => [
    ts('CRUD operations',          `sum by (op, status) (rate(supplier_crud_total[1m]))`, 'reqps', '{{op}}/{{status}}'),
    ts('Blacklist hits',           `sum(rate(supplier_blacklist_hits_total[5m]))`, 'reqps'),
    ts('State transitions',        `sum by (from, to) (rate(supplier_state_transitions_total[5m]))`, 'reqps', '{{from}}→{{to}}'),
  ]],

  ['H3_po_domain_slo', 'PO Domain & Approval SLO', ['domain', 'po', 'slo'], () => [
    ts('State transitions',         `sum by (from, to, outcome) (rate(po_state_transitions_total[5m]))`, 'reqps', '{{from}}→{{to}}/{{outcome}}'),
    stat('Approval p99 (SLO < 500ms)', `slo:po_approval_latency:p99_5m`, 's', { thresholds: { mode: 'absolute', steps: [{ color: 'green', value: null }, { color: 'red', value: 0.5 }] } }),
    heatmap('Approval-duration heatmap', `sum by (le) (rate(po_approval_duration_seconds_bucket[5m]))`),
    ts('Cross-service calls',       `sum by (target) (rate(po_cross_service_calls_total[1m]))`, 'reqps', '{{target}}'),
  ]],

  ['I1_rum_overview', 'RUM — Overview', ['rum', 'frontend'], () => [
    stat('Active sessions (5m)',  `sum(faro_sessions_active)`, 'short'),
    stat('JS error rate (5m)',    `sum(rate(faro_errors_total[5m]))`, 'reqps'),
    ts('Pageviews by route',      `sum by (page) (rate(faro_pageviews_total[1m]))`, 'reqps', '{{page}}'),
    ts('Sessions by browser',     `sum by (browser_name) (faro_sessions_active)`, 'short', '{{browser_name}}'),
  ]],

  ['I2_core_web_vitals', 'Core Web Vitals', ['rum', 'webvitals'], () => [
    stat('LCP p75 (24h)',  `slo:rum_web_vitals_lcp:p75_24h`, 's'),
    stat('INP p75 (24h)',  `slo:rum_web_vitals_inp:p75_24h`, 's'),
    ts('LCP per page',     `quantile_over_time(0.75, faro_web_vitals_lcp_seconds[5m])`, 's', '{{page}}'),
    ts('INP per page',     `quantile_over_time(0.75, faro_web_vitals_inp_seconds[5m])`, 's', '{{page}}'),
    ts('CLS per page',     `quantile_over_time(0.75, faro_web_vitals_cls[5m])`, 'short', '{{page}}'),
    ts('FCP / TTFB',       `quantile_over_time(0.75, faro_web_vitals_fcp_seconds[5m])`, 's', 'FCP {{page}}'),
  ]],

  ['I3_frontend_errors', 'Front-end Errors', ['rum', 'errors'], () => [
    logs('Faro error events', `{app_name="gep-scm-web"} |= "ErrorEvent"`),
    logs('Console error logs', `{app_name="gep-scm-web"} |= "\\"level\\":\\"error\\""`),
    ts('Error rate', `sum(rate(faro_errors_total[1m]))`, 'reqps'),
  ]],

  ['I4_user_journeys', 'User Journeys & Page Performance', ['rum', 'navigation'], () => [
    ts('Navigation timing (avg)',   `avg(faro_navigation_timing_seconds) by (page, phase)`, 's', '{{page}}/{{phase}}'),
    ts('Resource timing (top 10)',  `topk(10, avg by (resource) (faro_resource_timing_seconds))`, 's', '{{resource}}'),
    ts('Route-change latency',      `histogram_quantile(0.95, sum by (le, page) (rate(faro_route_change_seconds_bucket[5m])))`, 's', '{{page}}'),
  ]],

  ['I5_browser_to_api_trace', 'Browser → API End-to-End Trace', ['rum', 'traces'], () => [
    traceSearch('Recent end-to-end traces (root = browser)'),
    nodeGraph('Service map including browser'),
    ts('Browser → API p95', `histogram_quantile(0.95, sum by (le) (rate(traces_spanmetrics_latency_bucket{service_name="gep-scm-web"}[5m])))`, 's'),
  ]],

  ['J1_collector_health', 'OTel Collector Health', ['collector', 'self'], () => [
    ts('Spans received',  `rate(otelcol_receiver_accepted_spans_total[1m])`, 'short'),
    ts('Spans refused',   `rate(otelcol_receiver_refused_spans_total[1m])`, 'short'),
    ts('Metrics points',  `rate(otelcol_receiver_accepted_metric_points_total[1m])`, 'short'),
    ts('Log records',     `rate(otelcol_receiver_accepted_log_records_total[1m])`, 'short'),
    ts('Exporter queue',  `otelcol_exporter_queue_size`, 'short', '{{exporter}}'),
    ts('Exporter errors', `rate(otelcol_exporter_send_failed_spans_total[1m])`, 'short'),
  ]],
];

// ---------- write ----------
let count = 0;
for (const [uid, title, tags, build] of dashboards) {
  panelId = 0; // reset id counter per dashboard
  const json = dash(uid, title, tags, build());
  fs.writeFileSync(path.join(OUT_DIR, `${uid}.json`), JSON.stringify(json, null, 2));
  count++;
}
console.log(`Wrote ${count} dashboards to ${OUT_DIR}`);
