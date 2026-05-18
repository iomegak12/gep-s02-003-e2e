import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import PurchaseOrderWizard from './PurchaseOrderWizard.jsx';
import { createPurchaseOrder } from '../../api/purchaseOrders.js';
import { normaliseError } from '../../api/errors.js';

export default function PurchaseOrderCreatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [topError, setTopError] = useState(null);

  const mutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: (po) => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success(`PO ${po.po_number} created in DRAFT`);
      navigate(`/purchase-orders/${po.id}`, { replace: true });
    },
    onError: (err) => {
      const e = normaliseError(err);
      if (e.code === 'SUPPLIER_NOT_ACTIVE') {
        setTopError({ message: 'The chosen supplier is not active and cannot receive new POs. Pick a different supplier.', correlationId: e.correlationId });
      } else if (e.code === 'SUPPLIER_NOT_FOUND') {
        setTopError({ message: 'The chosen supplier could not be found. Pick a different supplier.', correlationId: e.correlationId });
      } else if (e.code === 'VALIDATION_FAILED') {
        setTopError({ message: 'Please correct the highlighted fields.', correlationId: e.correlationId });
      } else {
        setTopError({ message: e.message || 'Could not create purchase order.', correlationId: e.correlationId });
      }
    }
  });

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Link to="/purchase-orders" className="t-body-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Purchase orders
        </Link>
      </div>
      <header style={{ marginBottom: 16 }}>
        <h1 className="t-headline">New purchase order</h1>
        <p className="t-body-sm">POs start in <code className="mono">DRAFT</code>. Submit it from the detail page after creation.</p>
      </header>

      <PurchaseOrderWizard
        submitting={mutation.isPending}
        topError={topError}
        onSubmit={(payload) => { setTopError(null); return mutation.mutateAsync(payload); }}
        onCancel={() => navigate('/purchase-orders')}
      />
    </div>
  );
}
