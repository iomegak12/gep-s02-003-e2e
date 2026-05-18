import { PO_STATUS } from '../../constants/statuses.js';
import { ROLES } from '../../utils/roles.js';
import { REASON_PRESETS } from '../../constants/reasonPresets.js';

/**
 * What actions a user can take on a PO given (status, roles).
 * Returns an array of action keys (each matches a `PO_ACTION_META` entry).
 */
export function poActionsFor(status, roles = []) {
  const isBuyer    = roles.includes(ROLES.BUYER);
  const isApprover = roles.includes(ROLES.APPROVER);
  const isAdmin    = roles.includes(ROLES.ADMIN);
  const buyerLike  = isBuyer || isAdmin;
  const approverLike = isApprover || isAdmin;

  switch (status) {
    case PO_STATUS.DRAFT:
      return buyerLike ? ['submit', 'cancel'] : [];
    case PO_STATUS.SUBMITTED: {
      const acts = [];
      if (approverLike) acts.push('approve', 'reject');
      if (buyerLike)    acts.push('cancel');
      return acts;
    }
    case PO_STATUS.APPROVED:
      return buyerLike ? ['fulfill', 'cancel'] : [];
    case PO_STATUS.REJECTED:
      return buyerLike ? ['revise'] : [];
    case PO_STATUS.FULFILLED:
      return (buyerLike || approverLike) ? ['close'] : [];
    case PO_STATUS.CLOSED:
    case PO_STATUS.CANCELLED:
      return [];
    default:
      return [];
  }
}

/** Action metadata: title, copy, variant, what kind of input it needs. */
export const PO_ACTION_META = {
  submit:  { label: 'Submit for approval', kind: 'plain', danger: false, variant: 'primary',
             title: 'Submit purchase order?',
             description: 'The PO will be auto-approved if its total is within the threshold; otherwise it goes to an approver.' },
  approve: { label: 'Approve',  kind: 'plain', danger: false, variant: 'primary',
             title: 'Approve PO?',
             description: 'The PO becomes APPROVED. The buyer can then mark it fulfilled.' },
  reject:  { label: 'Reject',   kind: 'reason', danger: true,  variant: 'danger',
             title: 'Reject PO?',
             description: 'The PO becomes REJECTED. The buyer can revise it back to DRAFT.',
             reasonPresets: REASON_PRESETS.poReject },
  fulfill: { label: 'Mark fulfilled', kind: 'date', danger: false, variant: 'primary',
             title: 'Mark PO fulfilled',
             description: 'Record the date the supplier actually delivered.' },
  cancel:  { label: 'Cancel',   kind: 'reason', danger: true,  variant: 'danger',
             title: 'Cancel PO?',
             description: 'Cancellation is terminal. Pick a reason for the audit log.',
             reasonPresets: REASON_PRESETS.poCancel },
  revise:  { label: 'Revise',   kind: 'plain', danger: false, variant: 'secondary',
             title: 'Revise PO?',
             description: 'Returns the PO to DRAFT so line items and header can be edited.' },
  close:   { label: 'Close',    kind: 'plain', danger: false, variant: 'primary',
             title: 'Close PO?',
             description: 'Marks the PO as fully closed after invoice/match. This is terminal.' }
};
