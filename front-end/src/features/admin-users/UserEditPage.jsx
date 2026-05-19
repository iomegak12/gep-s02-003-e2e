import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import UserForm from './UserForm.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Button from '../../components/ui/Button.jsx';
import { getUser, updateUser } from '../../api/iam.js';
import { normaliseError } from '../../api/errors.js';

export default function UserEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [topError, setTopError] = useState(null);

  const userQ = useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id),
    enabled: !!id
  });

  const mutation = useMutation({
    mutationFn: (payload) => updateUser(id, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.setQueryData(['user', id], updated);
      toast.success('User updated');
      navigate(`/admin/users/${id}`, { replace: true });
    },
    onError: (err) => {
      const e = normaliseError(err);
      if (e.code === 'VALIDATION_FAILED') {
        setTopError({ message: 'Please correct the highlighted fields.', correlationId: e.correlationId });
      } else {
        setTopError({ message: e.message || 'Could not update user.', correlationId: e.correlationId });
      }
    }
  });

  if (userQ.isLoading) return <Skeleton width="100%" height={320} />;
  if (userQ.isError) {
    const e = normaliseError(userQ.error);
    return (
      <EmptyState
        title={e.code === 'USER_NOT_FOUND' ? 'User not found' : 'Could not load user'}
        description={e.message}
        action={<Button onClick={() => navigate('/admin/users')} startIcon={<ArrowLeft size={14} />}>Back to users</Button>}
      />
    );
  }

  const u = userQ.data;

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Link to={`/admin/users/${id}`} className="t-body-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Back to {u.full_name}
        </Link>
      </div>
      <header style={{ marginBottom: 16 }}>
        <h1 className="t-headline">Edit user</h1>
        <p className="t-body-sm">Email and full name are immutable. Use Reset password to change credentials.</p>
      </header>

      <UserForm
        mode="edit"
        initialValues={u}
        submitting={mutation.isPending}
        topError={topError}
        onSubmit={(payload) => { setTopError(null); return mutation.mutateAsync(payload); }}
        onCancel={() => navigate(`/admin/users/${id}`)}
      />
    </div>
  );
}
