/**
 * Curated reason chips shown by ConfirmWithReason. The user can still pick
 * "Other…" to type a custom reason. Whatever value reaches the back-end is
 * a plain string in the same `reason` field as before — no schema change.
 */
export const REASON_PRESETS = Object.freeze({
  supplierBlacklist: [
    'Repeated quality issues',
    'Compliance violation',
    'Fraud or unethical conduct',
    'Contract breach',
    'Repeated delivery failures',
    'Financial instability',
    'Sanctioned entity',
    'Loss of accreditation'
  ],
  supplierDeactivate: [
    'Inactive partner',
    'Service paused at supplier request',
    'Failed annual renewal',
    'Performance below threshold',
    'Awaiting re-audit',
    'Reorganisation / merger'
  ],
  poReject: [
    'Insufficient justification',
    'Over budget',
    'Wrong supplier',
    'Duplicate PO',
    'Specifications incorrect',
    'Better quote available',
    'Awaiting approval from finance'
  ],
  poCancel: [
    'Project cancelled',
    'Specifications changed',
    'Supplier-side issue',
    'Duplicate PO',
    'Budget revoked',
    'Procurement on hold'
  ]
});
