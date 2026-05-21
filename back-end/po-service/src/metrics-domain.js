// PO service domain metrics.
//   po_state_transitions_total{from,to,outcome}  — counter
//   po_approval_duration_seconds                 — histogram (for SLO)
//   po_cross_service_calls_total{target,status}  — counter

const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('gep-po-domain');

const stateTransitionsTotal = meter.createCounter('po_state_transitions_total', {
  description: 'Purchase-order state transitions. Labels from, to, outcome.',
});

const approvalDuration = meter.createHistogram('po_approval_duration_seconds', {
  description: 'Time between PO creation and final approval, in seconds.',
  unit: 's',
});

const crossServiceCalls = meter.createCounter('po_cross_service_calls_total', {
  description: 'Outbound calls to IAM / Supplier. Labels target, status.',
});

module.exports = {
  recordTransition: (from, to, outcome = 'ok') =>
    stateTransitionsTotal.add(1, { from, to, outcome }),
  recordApprovalDuration: (seconds) => approvalDuration.record(seconds),
  recordCrossServiceCall: (target, status) =>
    crossServiceCalls.add(1, { target, status: String(status) }),
};
