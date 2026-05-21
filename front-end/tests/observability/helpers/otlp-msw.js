import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

/**
 * Captures every OTLP/HTTP request the Faro / OTel browser SDK pushes to the
 * Collector. Tests read `collectorCalls` to assert payload shape.
 */
export const collectorCalls = {
  traces:  [],
  metrics: [],
  logs:    [],
  faro:    [],
  reset() { this.traces = []; this.metrics = []; this.logs = []; this.faro = []; },
};

const COLLECTOR_BASE = 'http://localhost:4318';

export const handlers = [
  http.post(`${COLLECTOR_BASE}/v1/traces`,  async ({ request }) => {
    collectorCalls.traces.push(await safeJson(request));
    return new HttpResponse(null, { status: 200 });
  }),
  http.post(`${COLLECTOR_BASE}/v1/metrics`, async ({ request }) => {
    collectorCalls.metrics.push(await safeJson(request));
    return new HttpResponse(null, { status: 200 });
  }),
  http.post(`${COLLECTOR_BASE}/v1/logs`,    async ({ request }) => {
    collectorCalls.logs.push(await safeJson(request));
    return new HttpResponse(null, { status: 200 });
  }),
  // Faro Collector receiver path (when /api/faro/v1/events is used via Nginx).
  http.post('http://localhost:8080/collect', async ({ request }) => {
    collectorCalls.faro.push(await safeJson(request));
    return new HttpResponse(null, { status: 200 });
  }),
];

async function safeJson(request) {
  try { return await request.clone().json(); }
  catch { return { _raw: await request.clone().text() }; }
}

export const server = setupServer(...handlers);
