const { env, SERVICE_NAMES } = require('../helpers/env');
const { fetchCollectorMetrics, findSeries } = require('../helpers/prom');
const { generateSampleTraffic } = require('../helpers/http');

// Maps the user's asks (CPU, Memory, Network, Disk IO) to OTel-translated metric names.
// After Collector translation, dots become underscores: `process.cpu.utilization` -> `process_cpu_utilization`.
const REQUIRED_METRICS = [
  'process_cpu_utilization',
  'process_memory_usage',
  'system_network_io',
  'system_disk_io',
];

describe('Runtime / system metrics — per service (CPU, Memory, Network, IO)', () => {
  beforeAll(async () => {
    await generateSampleTraffic(env).catch(() => {});
    // Give Collector at least one batch interval to flush.
    await new Promise(r => setTimeout(r, 6000));
  });

  for (const [key, serviceName] of Object.entries(SERVICE_NAMES)) {
    describe(`service=${key} (${serviceName})`, () => {
      for (const metric of REQUIRED_METRICS) {
        test(`exposes ${metric}`, async () => {
          const parsed = await fetchCollectorMetrics(env.collectorMetricsUrl);
          const series = findSeries(parsed, metric, { service_name: serviceName });
          expect(series.length).toBeGreaterThan(0);
        });
      }
    });
  }
});
