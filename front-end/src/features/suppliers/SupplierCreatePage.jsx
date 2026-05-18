import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import SupplierWizard from './SupplierWizard.jsx';
import { createSupplier } from '../../api/suppliers.js';
import { normaliseError } from '../../api/errors.js';

export default function SupplierCreatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [topError, setTopError] = useState(null);

  const mutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier submitted', {
        description: `${created.display_name} is now PENDING_APPROVAL.`
      });
      navigate(`/suppliers/${created.id}`, { replace: true });
    },
    onError: (err) => {
      const e = normaliseError(err);
      if (e.code === 'DUPLICATE_RESOURCE') {
        setTopError({
          message: 'A supplier with that supplier code already exists. Pick a different code.',
          correlationId: e.correlationId
        });
      } else if (e.code === 'VALIDATION_FAILED') {
        setTopError({ message: 'Please correct the highlighted fields.', correlationId: e.correlationId });
      } else {
        setTopError({ message: e.message || 'Could not create supplier.', correlationId: e.correlationId });
      }
    }
  });

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Link to="/suppliers" className="t-body-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Suppliers
        </Link>
      </div>
      <header style={{ marginBottom: 16 }}>
        <h1 className="t-headline">New supplier</h1>
        <p className="t-body-sm">All new suppliers land in <code className="mono">PENDING_APPROVAL</code> until an admin approves.</p>
      </header>

      <SupplierWizard
        submitting={mutation.isPending}
        topError={topError}
        onSubmit={(payload) => { setTopError(null); return mutation.mutateAsync(payload); }}
        onCancel={() => navigate('/suppliers')}
      />
    </div>
  );
}
