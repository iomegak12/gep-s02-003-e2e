const { AppError } = require('../common/errors');

const PO_TRANSITIONS = [
  { from: 'DRAFT',     to: 'SUBMITTED', role: 'BUYER' },
  { from: 'DRAFT',     to: 'CANCELLED', role: 'BUYER' },
  { from: 'SUBMITTED', to: 'APPROVED',  role: 'APPROVER' },
  { from: 'SUBMITTED', to: 'REJECTED',  role: 'APPROVER' },
  { from: 'APPROVED',  to: 'FULFILLED', role: 'BUYER' },
  { from: 'APPROVED',  to: 'CANCELLED', role: 'BUYER' },
  { from: 'REJECTED',  to: 'DRAFT',     role: 'BUYER' },
  { from: 'FULFILLED', to: 'CLOSED',    role: 'BUYER' },
];

function assertTransition(from, to) {
  if (!PO_TRANSITIONS.some(t => t.from === from && t.to === to)) {
    throw new AppError(409, 'INVALID_STATUS_TRANSITION', `Cannot transition from ${from} to ${to}`, { from, to });
  }
}

module.exports = { PO_TRANSITIONS, assertTransition };
