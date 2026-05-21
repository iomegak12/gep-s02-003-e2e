// Axios instance instrumented for W3C traceparent propagation.
// When Faro's TracingInstrumentation is initialized, it patches the global
// fetch / XHR. axios uses XHR in the browser, so requests automatically
// carry a `traceparent` header generated from the active Faro/OTel span.
//
// We still export a centralized axios so the rest of the codebase can opt
// into a single observability-aware HTTP client.

import axios from 'axios';
import { getFaro } from './faro';

const api = axios.create({
  withCredentials: false,
});

// Defensive: if some integration test imports this module without Faro
// being initialized, manually attach a traceparent so the propagation
// contract is still met.
api.interceptors.request.use((config) => {
  const headers = (config.headers ||= {});
  if (!headers.traceparent) {
    const faro = getFaro();
    const span = faro?.api?.getOTEL?.()?.trace?.getActiveSpan?.();
    const ctx = span?.spanContext?.();
    if (ctx && ctx.traceId && ctx.spanId) {
      headers.traceparent = `00-${ctx.traceId}-${ctx.spanId}-0${ctx.traceFlags ?? 1}`;
    } else {
      // No active span (tests, very early bootstrap): emit a synthetic but valid header
      // so downstream services still produce a trace tree.
      headers.traceparent = `00-${rand(32)}-${rand(16)}-01`;
    }
  }
  return config;
});

function rand(bytes) {
  let s = '';
  for (let i = 0; i < bytes; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

export default api;
export { api };
