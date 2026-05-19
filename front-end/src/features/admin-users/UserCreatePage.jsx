import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import UserForm from './UserForm.jsx';
import { createUser } from '../../api/iam.js';
import { normaliseError } from '../../api/errors.js';

export default function UserCreatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [topError, setTopError] = useState(null);

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
      navigate(`/admin/users/${user.id}`, { replace: true });
    },
    onError: (err) => {
      const e = normaliseError(err);
      if (e.code === 'DUPLICATE_RESOURCE') {
        setTopError({ message: 'A user with that email already exists.', correlationId: e.correlationId });
      } else if (e.code === 'VALIDATION_FAILED') {
        setTopError({ message: 'Please correct the highlighted fields.', correlationId: e.correlationId });
      } else {
        setTopError({ message: e.message || 'Could not create user.', correlationId: e.correlationId });
      }
    }
  });

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Link to="/admin/users" className="t-body-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Users
        </Link>
      </div>
      <header style={{ marginBottom: 16 }}>
        <h1 className="t-headline">New user</h1>
        <p className="t-body-sm">Create the account, assign roles, set an initial password to share securely.</p>
      </header>

      <UserForm
        mode="create"
        submitting={mutation.isPending}
        topError={topError}
        onSubmit={(payload) => { setTopError(null); return mutation.mutateAsync(payload); }}
        onCancel={() => navigate('/admin/users')}
      />
    </div>
  );
}
