// IAM - structured JSON logger.
//
// Uses pino-opentelemetry-transport as an explicit pino transport so log
// records are pushed to the OTel Collector via OTLP (HTTP) in a worker
// thread. This is more reliable across @opentelemetry/instrumentation-pino
// versions than relying on the instrumentation's built-in log-sending.

const pino = require('pino');

// pino-opentelemetry-transport reads OTEL_* env vars in the worker thread.
// We default to HTTP because the transport's OTLP-gRPC support has gaps in
// some releases. The Collector exposes both: gRPC :4317 and HTTP :4318.
const OTLP_HTTP_ENDPOINT = (process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
  || process.env.OTEL_EXPORTER_OTLP_HTTP_ENDPOINT
  || 'http://otel-collector:4318');

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'gep-iam';

const transport = pino.transport({
  targets: [
    // Console transport so docker compose logs still shows readable lines.
    { target: 'pino/file', options: { destination: 1 }, level: 'info' },
    // OTLP transport - ships log records to the Collector → Loki.
    {
      target: 'pino-opentelemetry-transport',
      level: 'info',
      options: {
        resourceAttributes: {
          'service.name': SERVICE_NAME,
          'service.namespace': 'gep',
          'deployment.environment': process.env.DEPLOYMENT_ENV || 'dev',
        },
        loggerName: SERVICE_NAME,
        // HTTP/protobuf is the default in pino-opentelemetry-transport v3.
        logRecordProcessorOptions: {
          recordProcessorType: 'batch',
          exporterOptions: { protocol: 'http/protobuf', url: `${OTLP_HTTP_ENDPOINT}/v1/logs` },
        },
      },
    },
  ],
});

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: SERVICE_NAME },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) { return { level: label }; },
  },
}, transport);

module.exports = { logger };
