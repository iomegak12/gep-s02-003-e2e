// IAM domain metrics — exported via the global OTel MeterProvider
// (set up in telemetry.js). Counters flow to Prometheus through the
// OTel Collector.

const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('gep-iam-domain');

const loginsTotal = meter.createCounter('iam_logins_total', {
  description: 'Total login attempts. Label `result`=success|failure.',
});

const jwtIssuedTotal = meter.createCounter('iam_jwt_issued_total', {
  description: 'Total JWTs issued. Label `role`=role of subject.',
});

const registrationsTotal = meter.createCounter('iam_registrations_total', {
  description: 'Total user registrations. Label `result`=success|failure.',
});

module.exports = {
  recordLogin: (result) => loginsTotal.add(1, { result }),
  recordJwtIssued: (role) => jwtIssuedTotal.add(1, { role: role || 'unknown' }),
  recordRegistration: (result) => registrationsTotal.add(1, { result }),
};
