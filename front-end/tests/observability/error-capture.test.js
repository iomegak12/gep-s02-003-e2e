import { describe, test, expect, beforeEach, vi } from 'vitest';
import { collectorCalls } from './helpers/otlp-msw';

describe('Faro error capture', () => {
  beforeEach(() => collectorCalls.reset());

  test('faro.api.pushError forwards a thrown Error to the transport', async () => {
    const { initFaro, getFaro } = await import('../../src/observability/faro.js');
    initFaro({
      url: 'http://localhost:8080/collect',
      appName: 'gep-scm-web',
      appVersion: 'test',
      environment: 'test',
    });
    const faro = getFaro();
    const spy = vi.spyOn(faro.api, 'pushError');
    try { throw new Error('boom'); } catch (e) { faro.api.pushError(e); }
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test('Errors instrumentation is enabled in Faro config', async () => {
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
    expect(names.some(n => /errors/i.test(n))).toBe(true);
  });
});
