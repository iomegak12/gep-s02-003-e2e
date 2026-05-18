import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  approveSupplier, deactivateSupplier, reactivateSupplier, blacklistSupplier, deleteSupplier
} from '../../api/suppliers.js';
import { normaliseError } from '../../api/errors.js';
import { ACTION_META } from './supplierActions.js';

const API_BY_ACTION = {
  approve:    (id) => approveSupplier(id),
  deactivate: (id, reason) => deactivateSupplier(id, reason),
  reactivate: (id) => reactivateSupplier(id),
  blacklist:  (id, reason) => blacklistSupplier(id, reason),
  delete:     (id) => deleteSupplier(id)
};

/**
 * Drives the kebab + ConfirmWithReason wiring for a single supplier action.
 * Returns: { open(action, supplier), close(), state }
 *   state: { action, supplier, submitting }
 */
export function useSupplierAction({ onSuccess } = {}) {
  const qc = useQueryClient();
  const [state, setState] = useState({ action: null, supplier: null });

  const close = useCallback(() => setState({ action: null, supplier: null }), []);
  const open  = useCallback((action, supplier) => setState({ action, supplier }), []);

  const mutation = useMutation({
    mutationFn: ({ action, supplierId, reason }) => API_BY_ACTION[action](supplierId, reason),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['supplier', vars.supplierId] });
      qc.invalidateQueries({ queryKey: ['suppliers-pending'] });
      toast.success(`${ACTION_META[vars.action].label} succeeded`);
      onSuccess?.(vars);
      close();
    },
    onError: (err, vars) => {
      const e = normaliseError(err);
      if (e.code === 'INVALID_STATUS_TRANSITION') {
        toast.error('Status changed elsewhere', {
          description: 'Refreshing — the supplier is no longer in the expected state.'
        });
        qc.invalidateQueries({ queryKey: ['suppliers'] });
        qc.invalidateQueries({ queryKey: ['supplier', vars.supplierId] });
        qc.invalidateQueries({ queryKey: ['suppliers-pending'] });
        close();
      } else {
        toast.error(`${ACTION_META[vars.action].label} failed`, {
          description: e.message || 'Please try again.'
        });
      }
    }
  });

  const confirm = useCallback(
    (reason) => mutation.mutate({ action: state.action, supplierId: state.supplier?.id, reason }),
    [mutation, state]
  );

  return {
    open,
    close,
    confirm,
    submitting: mutation.isPending,
    action: state.action,
    supplier: state.supplier,
    meta: state.action ? ACTION_META[state.action] : null
  };
}
