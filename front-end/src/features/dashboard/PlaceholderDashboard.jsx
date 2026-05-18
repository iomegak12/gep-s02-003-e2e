import ChartCard from '../../components/charts/ChartCard.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useAuth } from '../../auth/AuthProvider.jsx';

const TITLE_BY_ROLE = {
  BUYER: 'Buyer dashboard',
  APPROVER: 'Approver dashboard',
  ADMIN: 'Admin dashboard'
};

export default function PlaceholderDashboard({ persona }) {
  const { user } = useAuth();
  const role = persona || (user?.roles?.[0] ?? 'BUYER');
  return (
    <div>
      <header style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 className="t-headline">{TITLE_BY_ROLE[role] || 'Dashboard'}</h1>
        <Badge tone="primary" variant="outline">Phase 1 placeholder</Badge>
      </header>
      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <ChartCard key={i} title={`Widget ${i}`} subtitle="Wired up in Phase 8" height={160}>
            <Skeleton width="100%" height="100%" />
          </ChartCard>
        ))}
      </div>
    </div>
  );
}
