import { describe, test, expect, beforeEach } from 'vitest';
import { collectorCalls } from './helpers/otlp-msw';

/**
 * Faro must initialize during app bootstrap and post the Faro session-start
 * event to the Collector receiver.
 */
describe('Faro RUM SDK initialization', () => {
  beforeEach(() => collectorCalls.reset());

  test('faro.js exports initFaro and a non-null faro instance after init', async () => {
    const mod = await import('../../src/observability/faro.js');
    expect(typeof mod.initFaro).toBe('function');
    const instance = mod.initFaro({
      url: 'http://localhost:8080/collect',
      appName: 'gep-scm-web',
      appVersion: 'test',
      environment: 'test',
    });
    expect(instance).toBeTruthy();
  });

  test('initialization configures app name = gep-scm-web', async () => {
    const { initFaro, getFaro } = await import('../../src/observability/faro.js');
    initFaro({
      url: 'http://localhost:8080/collect',
      appName: 'gep-scm-web',
      appVersion: 'test',
      environment: 'test',
    });
    const faro = getFaro();
    expect(faro.metas.value.app?.name).toBe('gep-scm-web');
  });
});
