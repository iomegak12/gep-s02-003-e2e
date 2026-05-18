import { SUPPLIER_STATUS } from '../../constants/statuses.js';
import { REASON_PRESETS } from '../../constants/reasonPresets.js';

/**
 * Returns the list of admin actions available for a supplier, given its
 * current status. Each entry is a descriptor consumed by the kebab menu
 * and the detail-page action bar.
 */
export function adminActionsFor(status) {
  switch (status) {
    case SUPPLIER_STATUS.PENDING_APPROVAL:
      return ['approve', 'blacklist', 'delete'];
    case SUPPLIER_STATUS.ACTIVE:
      return ['deactivate', 'blacklist', 'delete'];
    case SUPPLIER_STATUS.INACTIVE:
      return ['reactivate', 'blacklist', 'delete'];
    case SUPPLIER_STATUS.BLACKLISTED:
      return ['delete'];
    default:
      return [];
  }
}

export const ACTION_META = {
  approve:    { label: 'Approve',    requireReason: false, danger: false, confirmVariant: 'primary',
                title: 'Approve supplier?',
                description: 'The supplier becomes ACTIVE and is eligible for new POs.' },
  deactivate: { label: 'Deactivate', requireReason: true,  danger: true,  confirmVariant: 'danger',
                title: 'Deactivate supplier?',
                description: 'The supplier becomes INACTIVE. Existing POs are unaffected. Pick a reason for the audit log.',
                reasonPresets: REASON_PRESETS.supplierDeactivate },
  reactivate: { label: 'Reactivate', requireReason: false, danger: false, confirmVariant: 'primary',
                title: 'Reactivate supplier?',
                description: 'The supplier becomes ACTIVE again and can receive new POs.' },
  blacklist:  { label: 'Blacklist',  requireReason: true,  danger: true,  confirmVariant: 'danger',
                title: 'Blacklist supplier?',
                description: 'New POs against this supplier will be blocked. Existing POs are NOT cancelled. Pick a reason for the audit log.',
                reasonPresets: REASON_PRESETS.supplierBlacklist },
  delete:     { label: 'Delete',     requireReason: false, danger: true,  confirmVariant: 'danger',
                title: 'Delete supplier?',
                description: 'This soft-deletes the supplier. They will no longer appear in the directory.' }
};
