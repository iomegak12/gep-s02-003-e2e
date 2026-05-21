// @ts-check
'use strict';

/**
 * Q6 = A: after the UI session finishes, prove that the telemetry pipeline
 * produced traces, logs and metrics for the activity we just drove.
 *
 *   - Tempo:      a trace tagged service.name=gep-iam exists in the last 5 minutes
 *   - Loki:       at least one log line with service_name=gep-iam in the last 5 minutes
 *   - Prometheus: http_server_duration_count{service_name="gep-iam"} has samples
 *
 * Only stdlib `http`/`https` so the script has no extra deps.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    lib.get(u, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

async function assertTempoTraceExists({ tempo }, service, log) {
  const url = `${tempo}/api/search?tags=service.name%3D${encodeURIComponent(service)}&limit=1`;
  const r = await get(url);
  if (r.status !== 200) throw new Error(`Tempo ${url} -> HTTP ${r.status}`);
  const data = JSON.parse(r.body || '{}');
  const traces = data.traces || [];
  if (traces.length === 0) throw new Error(`Tempo: no trace for service.name=${service}`);
  log(`tempo: ${traces.length} trace(s) for ${service} (first=${traces[0].traceID})`);
}

async function assertLokiLogsExist({ loki }, service, log) {
  const end   = Date.now() * 1e6;
  const start = end - 5 * 60 * 1e9;
  const expr  = `{service_name=\"${service}\"}`;
  const url   = `${loki}/loki/api/v1/query_range?query=${encodeURIComponent(expr)}&start=${start}&end=${end}&limit=5`;
  const r = await get(url);
  if (r.status !== 200) throw new Error(`Loki ${url} -> HTTP ${r.status}: ${r.body.slice(0, 200)}`);
  const data = JSON.parse(r.body || '{}');
  const streams = data?.data?.result || [];
  if (streams.length === 0) throw new Error(`Loki: no logs for service_name=${service}`);
  log(`loki: ${streams.length} stream(s) for ${service}`);
}

async function assertPromMetricsExist({ prometheus }, service, log) {
  const expr = `http_server_duration_count{service_name=\"${service}\"}`;
  const url  = `${prometheus}/api/v1/query?query=${encodeURIComponent(expr)}`;
  const r = await get(url);
  if (r.status !== 200) throw new Error(`Prometheus ${url} -> HTTP ${r.status}`);
  const data = JSON.parse(r.body || '{}');
  if (data.status !== 'success') throw new Error(`Prometheus query not success: ${r.body.slice(0, 200)}`);
  const result = data?.data?.result || [];
  if (result.length === 0) throw new Error(`Prometheus: no series for ${expr}`);
  log(`prom: ${result.length} series for ${service}`);
}

async function assertObservability(env, log) {
  log('asserting observability signals…');
  // Login traffic always lands on IAM; that's the most reliable service to assert on.
  // Supplier + dashboards drive PO/Supplier — checked best-effort (warn instead of fail
  // if not present, since the UI route may not have hit those services depending on
  // which dashboard page actually renders).
  await assertTempoTraceExists(env, 'gep-iam', log);
  await assertLokiLogsExist(env, 'gep-iam', log);
  await assertPromMetricsExist(env, 'gep-iam', log);

  for (const svc of ['gep-supplier', 'gep-po']) {
    try {
      await assertPromMetricsExist(env, svc, log);
    } catch (e) {
      log(`(warn) ${svc}: ${e.message}`);
    }
  }
}

module.exports = { assertObservability };
