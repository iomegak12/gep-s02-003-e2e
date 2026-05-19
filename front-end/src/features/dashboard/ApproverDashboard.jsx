import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import KpiCard from '../../components/charts/KpiCard.jsx';
import ChartCard from '../../components/charts/ChartCard.jsx';
import LineChart from '../../components/charts/LineChart.jsx';
import BarChart from '../../components/charts/BarChart.jsx';
import ChipGroup from '../../components/ui/ChipGroup.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import {
  poPendingApprovals, poCycleTime, poMonthlySpend, poSpendByCategory
} from '../../api/purchaseOrders.js';
import { formatINR } from '../../components/charts/chartTheme.js';
import './Dashboard.css';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map((y) => ({
  value: String(y), label: String(y)
}));

export default function ApproverDashboard() {
  const [year, setYear] = useState(String(CURRENT_YEAR));

  const pendingQ  = useQuery({ queryKey: ['agg', 'po-pending'],         queryFn: poPendingApprovals, staleTime: 30_000 });
  const cycleQ    = useQuery({ queryKey: ['agg', 'po-cycle'],           queryFn: poCycleTime,        staleTime: 60_000 });
  const monthlyQ  = useQuery({ queryKey: ['agg', 'po-monthly', year],   queryFn: () => poMonthlySpend(Number(year)), staleTime: 60_000 });
  const catQ      = useQuery({ queryKey: ['agg', 'po-cat',  'ytd'],     queryFn: () => poSpendByCategory('ytd'),    staleTime: 60_000 });

  const monthly = useMemo(() => {
    const arr = monthlyQ.data?.data || monthlyQ.data || [];
    return arr.map((m) => ({
      label: m.month ? m.month.toString().slice(0, 7).slice(5) : m.label,
      value: Number(m.total_spend ?? m.value ?? 0)
    }));
  }, [monthlyQ.data]);

  const byCat = useMemo(() => (catQ.data?.data || []).map((c) => ({
    label: String(c.category || '').replace(/_/g, ' '),
    value: Number(c.total_spend ?? c.total ?? 0)
  })), [catQ.data]);

  return (
    <div className="dash">
      <header className="dash__header">
        <div>
          <h1 className="t-headline">Approver dashboard</h1>
          <p className="t-body-sm">Your queue, cycle time and spend trends.</p>
        </div>
      </header>

      <div className="dash__kpis">
        <KpiCard
          label="Pending approvals"
          value={pendingQ.isLoading ? '…' : (pendingQ.data?.count ?? 0).toLocaleString()}
          sublabel="awaiting your action"
          tone="pending"
          to="/approvals"
        />
        <KpiCard
          label="Pending total value"
          value={pendingQ.isLoading ? '…' : formatINR(pendingQ.data?.total_value ?? 0, { compact: true })}
          sublabel="filtered to your limit"
        />
        <KpiCard
          label="Cycle time · avg"
          value={cycleQ.isLoading ? '…' : (cycleQ.data?.avg_days != null ? `${Number(cycleQ.data.avg_days).toFixed(1)}d` : '—')}
          sublabel={cycleQ.data?.median_days != null ? `median ${Number(cycleQ.data.median_days).toFixed(1)}d` : ' '}
        />
        <KpiCard
          label="Monthly spend (YTD)"
          value={monthlyQ.isLoading ? '…' : formatINR(monthly.reduce((s, d) => s + d.value, 0), { compact: true })}
          sublabel="rolling current year"
        />
      </div>

      <div className="dash__grid">
        <div className="dash__cell--8">
          <ChartCard
            title="Monthly spend"
            subtitle={`Total PO spend by month in ${year}`}
            height={260}
            actions={<ChipGroup compact options={YEAR_OPTIONS} value={year} onChange={setYear} />}
          >
            <ChartBody query={monthlyQ} data={monthly}>
              <LineChart data={monthly} money />
            </ChartBody>
          </ChartCard>
        </div>
        <div className="dash__cell--4">
          <ChartCard title="Spend by category (YTD)" subtitle="Procurement spend split" height={260}>
            <ChartBody query={catQ} data={byCat}>
              <BarChart data={byCat} orientation="horizontal" money />
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
