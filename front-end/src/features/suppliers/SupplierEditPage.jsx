import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import SupplierForm from './SupplierForm.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Button from '../../components/ui/Button.jsx';
import { getSupplier, updateSupplier } from '../../api/suppliers.js';
import { normaliseError } from '../../api/errors.js';

export default function SupplierEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [topError, setTopError] = useState(null);

  const supplierQ = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id),
    enabled: !!id
  });

  const mutation = useMutation({
    mutationFn: (payload) => updateSupplier(id, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.setQueryData(['supplier', id], updated);
      toast.success('Supplier updated');
      navigate(`/suppliers/${id}`, { replace: true });
    },
    onError: (err) => {
      const e = normaliseError(err);
      if (e.code === 'VALIDATION_FAILED') {
        setTopError({ message: 'Please correct the highlighted fields.', correlationId: e.correlationId });
      } else {
        setTopError({ message: e.message || 'Could not update supplier.', correlationId: e.correlationId });
      }
    }
  });

  if (supplierQ.isLoading) {
    return <Skeleton width="100%" height={320} />;
  }
  if (supplierQ.isError) {
    const e = normaliseError(supplierQ.error);
    return (
      <EmptyState
        title={e.code === 'SUPPLIER_NOT_FOUND' ? 'Supplier not found' : 'Could not load supplier'}
        description={e.message}
        action={<Button onClick={() => navigate('/suppliers')} startIcon={<ArrowLeft size={14} />}>Back to suppliers</Button>}
      />
    );
  }

  const s = supplierQ.data;

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Link to={`/suppliers/${id}`} className="t-body-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Back to {s.display_name}
        </Link>
      </div>
      <header style={{ marginBottom: 16 }}>
        <h1 className="t-headline">Edit supplier</h1>
        <p className="t-body-sm">Supplier code cannot be changed.</p>
      </header>

      <SupplierForm
        mode="edit"
        initialValues={s}
        submitting={mutation.isPending}
        topError={topError}
        onSubmit={(payload) => { setTopError(null); return mutation.mutateAsync(payload); }}
        onCancel={() => navigate(`/suppliers/${id}`)}
      />
    </div>
  );
}
