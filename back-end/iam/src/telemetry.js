/* eslint-disable */
// IAM - OpenTelemetry bootstrap.
//
// MUST be loaded BEFORE express. We rely on env vars OTEL_SERVICE_NAME /
// OTEL_RESOURCE_ATTRIBUTES (set in docker-compose.yml) — NodeSDK reads them
// automatically, so no manual Resource construction is needed.

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter }   = require('@opentelemetry/exporter-trace-otlp-grpc');
const { OTLPMetricExporter }  = require('@opentelemetry/exporter-metrics-otlp-grpc');
const { OTLPLogExporter }     = require('@opentelemetry/exporter-logs-otlp-grpc');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { HostMetrics } = require('@opentelemetry/host-metrics');
const { RuntimeNodeInstrumentation } = require('@opentelemetry/instrumentation-runtime-node');
const { PinoInstrumentation } = require('@opentelemetry/instrumentation-pino');
const { metrics } = require('@opentelemetry/api');

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'gep-iam';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 10_000,
  }),
  logRecordProcessors: [new BatchLogRecordProcessor(new OTLPLogExporter())],
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs':  { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
    }),
    new RuntimeNodeInstrumentation({ eventLoopUtilizationMeasurementInterval: 5000 }),
    new PinoInstrumentation({
      logKeys: { traceId: 'trace_id', spanId: 'span_id', traceFlags: 'trace_flags' },
    }),
  ],
});

sdk.start();

// Host CPU / memory / network / IO metrics.
new HostMetrics({
  meterProvider: metrics.getMeterProvider(),
  name: `${SERVICE_NAME}-host-metrics`,
}).start();

const shutdown = () => sdk.shutdown().catch(() => {}).finally(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
