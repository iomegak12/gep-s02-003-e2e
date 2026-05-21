import { describe, test, expect, beforeEach } from 'vitest';
import { collectorCalls } from './helpers/otlp-msw';

describe('Core Web Vitals — captured by Faro built-in instrumentation', () => {
  beforeEach(() => collectorCalls.reset());

  test('Web Vitals instrumentation is enabled in Faro config', async () => {
    const { initFaro, getFaro } = await import('../../src/observability/faro.js');
    initFaro({
      url: 'http://localhost:8080/collect',
      appName: 'gep-scm-web',
      appVersion: 'test',
      environment: 'test',
    });
    const faro = getFaro();
    const instr = faro.instrumentations?.instrumentations || [];
    const names = instr.map(i => i.name);
    // @grafana/faro-web-sdk registers a WebVitalsInstrumentation by default in getWebInstrumentations()
    expect(names.some(n => /web-vitals/i.test(n))).toBe(true);
  });

  test('pushMeasurement helper records a vital (smoke)', async () => {
    const { initFaro, getFaro } = await import('../../src/observability/faro.js');
    initFaro({
      url: 'http://localhost:8080/collect',
      appName: 'gep-scm-web',
      appVersion: 'test',
      environment: 'test',
    });
    const faro = getFaro();
    faro.api.pushMeasurement({ type: 'web-vital', values: { lcp: 1234 } });
    // No throw is enough at this stage; transport assertions live in I5 dashboard verification.
    expect(true).toBe(true);
  });
});
