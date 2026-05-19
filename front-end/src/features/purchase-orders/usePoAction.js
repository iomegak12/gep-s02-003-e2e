import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  submitPo, approvePo, rejectPo, fulfillPo, cancelPo, revisePo, closePo
} from '../../api/purchaseOrders.js';
import { normaliseError } from '../../api/errors.js';
import { withCorr } from '../../api/notify.js';
import { PO_ACTION_META } from './poActions.js';

const API_BY_ACTION = {
  submit:  (id)        => submitPo(id),
  approve: (id)        => approvePo(id),
  reject:  (id, args)  => rejectPo(id, args?.reason),
  fulfill: (id, args)  => fulfillPo(id, args?.actual_delivery_date),
  cancel:  (id, args)  => cancelPo(id, args?.reason),
  revise:  (id)        => revisePo(id),
  close:   (id)        => closePo(id)
};

/**
 * Drives the PO action confirm modals. State holds the currently-pending
 * action + the PO it applies to.
 *   const action = usePoAction();
 *   action.open('approve', po);
 *   action.confirm({ reason }) // or { actual_delivery_date }
 */
export function usePoAction({ onSuccess } = {}) {
  const qc = useQueryClient();
  const [state, setState] = useState({ action: null, po: null });

  const close = useCallback(() => setState({ action: null, po: null }), []);
  const open  = useCallback((action, po) => setState({ action, po }), []);

  const mutation = useMutation({
    mutationFn: ({ action, poId, args }) => API_BY_ACTION[action](poId, args),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['purchase-order', vars.poId] });
      qc.invalidateQueries({ queryKey: ['po-pending-approvals'] });
      if (vars.action === 'submit' && data?.auto_approved) {
        toast.success('Auto-approved', {
          description: `PO total is within the threshold — no approver review needed.`
        });
      } else {
        toast.success(`${PO_ACTION_META[vars.action].label} succeeded`);
      }
      onSuccess?.({ ...vars, data });
      close();
    },
    onError: (err, vars) => {
      const e = normaliseError(err);
      if (e.code === 'INVALID_STATUS_TRANSITION') {
        toast.error('PO status changed elsewhere', {
          description: 'Refreshing — the PO is no longer in the expected state.'
        });
        qc.invalidateQueries({ queryKey: ['purchase-orders'] });
        qc.invalidateQueries({ queryKey: ['purchase-order', vars.poId] });
        close();
      } else if (e.code === 'APPROVAL_LIMIT_EXCEEDED') {
        toast.error('Approval limit exceeded', {
          description: 'This PO exceeds your personal approval limit.'
        });
      } else {
        toast.error(`${PO_ACTION_META[vars.action].label} failed`, {
          description: withCorr(e.message || 'Please try again.', e.correlationId)
        });
      }
    }
  });

  const confirm = useCallback(
    (args) => mutation.mutate({ action: state.action, poId: state.po?.id, args }),
    [mutation, state]
  );

  return {
    open, close, confirm,
    submitting: mutation.isPending,
    action: state.action,
    po: state.po,
    meta: state.action ? PO_ACTION_META[state.action] : null
  };
}
