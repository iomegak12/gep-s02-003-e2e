// Faro Web SDK bootstrap.
//
// Initializes RUM, browser tracing (auto-instruments fetch/XHR/document-load/
// user-interaction), error capture, and Web Vitals (LCP/INP/CLS/FCP/TTFB).
//
// Telemetry is shipped to the OTel Collector (OTLP/HTTP) reverse-proxied by
// Nginx at /otlp/v1/* in production. In dev/vite the proxy entry in
// vite.config.js forwards the same paths to localhost:4318.

import {
  initializeFaro,
  getWebInstrumentations,
  ConsoleInstrumentation,
  ErrorsInstrumentation,
  SessionInstrumentation,
  ViewInstrumentation,
  WebVitalsInstrumentation,
} from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

let _faro = null;

const DEFAULTS = {
  url: '/otlp/v1/traces',          // overridden via initFaro({...})
  appName: 'gep-scm-web',
  appVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0',
  environment: 'dev',
};

export function initFaro(opts = {}) {
  if (_faro) return _faro;
  const cfg = { ...DEFAULTS, ...opts };

  _faro = initializeFaro({
    url: cfg.url,
    app: {
      name: cfg.appName,
      version: cfg.appVersion,
      environment: cfg.environment,
    },
    instrumentations: [
      ...getWebInstrumentations({ captureConsole: true }),
      new ConsoleInstrumentation(),
      new ErrorsInstrumentation(),
      new SessionInstrumentation(),
      new ViewInstrumentation(),
      new WebVitalsInstrumentation(),
      new TracingInstrumentation({
        instrumentationOptions: {
          // Propagate W3C traceparent to the same-origin API endpoints.
          propagateTraceHeaderCorsUrls: [
            /\/api\/v1\//,
            /\/health(\/|$)/,
          ],
        },
      }),
    ],
  });

  return _faro;
}

export function getFaro() {
  return _faro;
}
