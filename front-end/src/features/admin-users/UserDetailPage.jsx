import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, KeyRound, PauseCircle, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ResetPasswordModal from './ResetPasswordModal.jsx';
import { getUser, updateUser } from '../../api/iam.js';
import { normaliseError } from '../../api/errors.js';

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [resetOpen, setResetOpen] = useState(false);

  const userQ = useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id),
    enabled: !!id
  });

  const toggleActive = useMutation({
    mutationFn: (next) => updateUser(id, { is_active: next }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.setQueryData(['user', id], updated);
      toast.success(updated.is_active ? 'User reactivated' : 'User deactivated');
    },
    onError: (err) => toast.error('Could not update user', { description: normaliseError(err).message })
  });

  if (userQ.isLoading) {
    return <Skeleton width="100%" height={320} />;
  }
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
        <Link to="/admin/users" className="t-body-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Users
        </Link>
      </div>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 className="t-headline">{u.full_name}</h1>
          <div className="mono t-body-sm">{u.email}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge tone={u.is_active ? 'active' : 'inactive'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
        </div>
      </header>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '10px 12px', marginBottom: 16,
        background: 'var(--surface-container-low)',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius)'
      }}>
        <span className="t-body-sm">Admin actions:</span>
        <Button variant="secondary" startIcon={<Pencil size={14} />} onClick={() => navigate(`/admin/users/${id}/edit`)}>Edit</Button>
        <Button variant="secondary" startIcon={<KeyRound size={14} />} onClick={() => setResetOpen(true)}>Reset password</Button>
        {u.is_active ? (
          <Button variant="secondary" startIcon={<PauseCircle size={14} />} onClick={() => toggleActive.mutate(false)} loading={toggleActive.isPending}>Deactivate</Button>
        ) : (
          <Button variant="primary" startIcon={<PlayCircle size={14} />} onClick={() => toggleActive.mutate(true)} loading={toggleActive.isPending}>Reactivate</Button>
        )}
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <Section title="Identity">
          <Row label="Email" value={u.email} mono />
          <Row label="Full name" value={u.full_name} />
          <Row label="Created" value={u.created_at ? new Date(u.created_at).toLocaleString() : '—'} />
          <Row label="Updated" value={u.updated_at ? new Date(u.updated_at).toLocaleString() : '—'} />
        </Section>
        <Section title="Roles & access">
          <Row label="Roles" value={
            <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
              {(u.roles || []).map((r) => <Badge key={r} tone="primary" variant="outline">{r}</Badge>)}
            </span>
          } />
          <Row label="Approval limit" value={u.approval_limit != null
            ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(u.approval_limit))
            : '—'} />
          <Row label="Active" value={u.is_active ? 'Yes' : 'No'} />
        </Section>
      </div>

      <ResetPasswordModal
        open={resetOpen}
        user={u}
        onClose={() => setResetOpen(false)}
      />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{
      padding: 16,
      background: 'var(--surface-container-lowest)',
      border: '1px solid var(--outline-variant)',
      borderRadius: 'var(--radius)'
    }}>
      <h2 className="t-caps" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>{title}</h2>
      <dl style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</dl>
    </section>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'baseline' }}>
      <dt className="t-body-sm" style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className={mono ? 'mono' : undefined} style={{ margin: 0 }}>{value || '—'}</dd>
    </div>
  );
}
