import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import KpiCard from '../../components/charts/KpiCard.jsx';
import ChartCard from '../../components/charts/ChartCard.jsx';
import DonutChart from '../../components/charts/DonutChart.jsx';
import BarChart from '../../components/charts/BarChart.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { aggregationsByStatus } from '../../api/suppliers.js';
import { listUsers } from '../../api/iam.js';
import {
  poAggregationsByStatus, poSpendBySupplier
} from '../../api/purchaseOrders.js';
import { formatINR } from '../../components/charts/chartTheme.js';
import { SUPPLIER_STATUS_LABEL } from '../../constants/statuses.js';
import './Dashboard.css';

const PO_STATUS_LABEL = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', APPROVED: 'Approved',
  REJECTED: 'Rejected', FULFILLED: 'Fulfilled', CLOSED: 'Closed', CANCELLED: 'Cancelled'
};

export default function AdminDashboard() {
  // Tiny call just to read `total` for the user count KPI.
  const usersQ      = useQuery({ queryKey: ['users', { page: 1, pageSize: 1 }], queryFn: () => listUsers({ page: 1, page_size: 1 }), staleTime: 60_000 });
  const supByStatQ  = useQuery({ queryKey: ['agg', 'sup-by-status'], queryFn: aggregationsByStatus, staleTime: 60_000 });
  const poByStatQ   = useQuery({ queryKey: ['agg', 'po-by-status'],  queryFn: poAggregationsByStatus, staleTime: 60_000 });
  const topSupQ     = useQuery({ queryKey: ['agg', 'po-top-sup', 'ytd-10'], queryFn: () => poSpendBySupplier('ytd', 10), staleTime: 60_000 });

  const supDonut = useMemo(() => (supByStatQ.data?.data || []).map((d) => ({
    label: SUPPLIER_STATUS_LABEL[d.status] || d.status, value: d.count, key: d.status
  })), [supByStatQ.data]);

  const poDonut = useMemo(() => (poByStatQ.data?.data || []).map((d) => ({
    label: PO_STATUS_LABEL[d.status] || d.status, value: d.count, key: d.status
  })), [poByStatQ.data]);

  const topSup = useMemo(() => (topSupQ.data?.data || []).map((s) => ({
    label: s.supplier_name || s.display_name || s.supplier_id?.slice(0, 8),
    value: Number(s.total_spend ?? s.total ?? 0)
  })), [topSupQ.data]);

  const totalUsers = usersQ.data?.total ?? 0;
  const totalSuppliers = (supByStatQ.data?.data || []).reduce((s, d) => s + d.count, 0);
  const totalPOs       = (poByStatQ.data?.data  || []).reduce((s, d) => s + d.count, 0);

  return (
    <div className="dash">
      <header className="dash__header">
        <div>
          <h1 className="t-headline">Admin dashboard</h1>
          <p className="t-body-sm">Platform-wide health: users, suppliers, POs and spend.</p>
        </div>
      </header>

      <div className="dash__kpis">
        <KpiCard
          label="Total users"
          value={usersQ.isLoading ? '…' : totalUsers.toLocaleString()}
          sublabel="all roles"
          to="/admin/users"
        />
        <KpiCard
          label="Total suppliers"
          value={supByStatQ.isLoading ? '…' : totalSuppliers.toLocaleString()}
          sublabel="across all statuses"
          to="/suppliers"
        />
        <KpiCard
          label="Total purchase orders"
          value={poByStatQ.isLoading ? '…' : totalPOs.toLocaleString()}
          sublabel="across all statuses"
          to="/purchase-orders"
        />
        <KpiCard
          label="Top supplier (YTD)"
          value={topSupQ.isLoading ? '…' : (topSup[0]?.label || '—')}
          sublabel={topSup[0] ? formatINR(topSup[0].value, { compact: true }) : ' '}
          tone="primary"
        />
      </div>

      <div className="dash__grid">
        <div className="dash__cell--6">
          <ChartCard title="Suppliers by status" subtitle="Live count" height={260}>
            <ChartBody query={supByStatQ} data={supDonut}>
              <DonutChart data={supDonut} />
            </ChartBody>
          </ChartCard>
        </div>
        <div className="dash__cell--6">
          <ChartCard title="POs by status" subtitle="Distribution across the lifecycle" height={260}>
            <ChartBody query={poByStatQ} data={poDonut}>
              <DonutChart data={poDonut} />
            </ChartBody>
          </ChartCard>
        </div>
        <div className="dash__cell--12">
          <ChartCard title="Top suppliers by spend (YTD)" subtitle="Ranked across the company" height={300}>
            <ChartBody query={topSupQ} data={topSup}>
              <BarChart data={topSup} orientation="horizontal" money />
            </ChartBody>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function ChartBody({ query, data, children }) {
  if (query.isLoading) return <Skeleton width="100%" height="100%" />;
  if (query.isError)   return <div className="dash__error">Could not load.</div>;
  if (!data || data.length === 0) return <div className="dash__error">No data yet.</div>;
  return children;
}
