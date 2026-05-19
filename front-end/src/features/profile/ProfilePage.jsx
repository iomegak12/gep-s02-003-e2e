import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import Badge from '../../components/ui/Badge.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Button from '../../components/ui/Button.jsx';
import { me } from '../../api/iam.js';
import { normaliseError } from '../../api/errors.js';
import { ROLES } from '../../utils/roles.js';

export default function ProfilePage() {
  const profileQ = useQuery({
    queryKey: ['me'],
    queryFn: me,
    staleTime: 30_000
  });

  if (profileQ.isLoading) return <Skeleton width="100%" height={200} />;
  if (profileQ.isError) {
    const e = normaliseError(profileQ.error);
    return <EmptyState title="Could not load profile" description={e.message} />;
  }
  const u = profileQ.data;
  const isApprover = (u.roles || []).includes(ROLES.APPROVER);

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 className="t-headline">My profile</h1>
          <p className="t-body-sm">Account details from <code className="mono">/auth/me</code>.</p>
        </div>
        <Link to="/settings">
          <Button variant="secondary" startIcon={<Settings size={14} />}>Settings</Button>
        </Link>
      </header>

      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
      }}>
        <Section title="Identity">
          <Row label="Full name" value={u.full_name || u.name} />
          <Row label="Email" value={u.email} mono />
          <Row label="Account status" value={
            <Badge tone={u.is_active === false ? 'inactive' : 'active'}>
              {u.is_active === false ? 'Inactive' : 'Active'}
            </Badge>
          } />
        </Section>
        <Section title="Roles & access">
          <Row label="Roles" value={
            <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
              {(u.roles || []).map((r) => <Badge key={r} tone="primary" variant="outline">{r}</Badge>)}
            </span>
          } />
          {isApprover && (
            <Row label="Approval limit" value={
              u.approval_limit != null
                ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(u.approval_limit))
                : '—'
            } />
          )}
          {u.created_at && <Row label="Created" value={new Date(u.created_at).toLocaleString()} />}
        </Section>
      </div>

      <p className="t-body-sm" style={{ marginTop: 16, color: 'var(--text-muted)' }}>
        Need to change something? Email/name and roles are managed by an admin.
        You can change your own password in <Link to="/settings" style={{ color: 'var(--primary)' }}>Settings</Link>.
      </p>
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
