import { describe, test, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './helpers/otlp-msw';

/**
 * Every outbound axios request from the front-end must carry a W3C
 * `traceparent` header injected by @grafana/faro-web-tracing.
 */
describe('W3C traceparent injection on axios requests', () => {
  let captured;
  beforeEach(() => {
    captured = [];
    server.use(
      http.get('http://localhost:3001/api/v1/users/me', ({ request }) => {
        captured.push(Object.fromEntries(request.headers));
        return HttpResponse.json({ ok: true });
      }),
    );
  });

  test('axios-trace.js exports an instrumented axios instance', async () => {
    const mod = await import('../../src/observability/axios-trace.js');
    expect(mod.default || mod.api).toBeTruthy();
  });

  test('axios request to IAM carries a traceparent header', async () => {
    const { initFaro } = await import('../../src/observability/faro.js');
    initFaro({
      url: 'http://localhost:8080/collect',
      appName: 'gep-scm-web',
      appVersion: 'test',
      environment: 'test',
    });
    const ax = (await import('../../src/observability/axios-trace.js')).default;
    await ax.get('http://localhost:3001/api/v1/users/me').catch(() => {});
    expect(captured.length).toBeGreaterThan(0);
    expect(captured[0].traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
  });
});
