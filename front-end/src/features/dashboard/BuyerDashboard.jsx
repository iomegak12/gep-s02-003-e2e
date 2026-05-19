import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import KpiCard from '../../components/charts/KpiCard.jsx';
import ChartCard from '../../components/charts/ChartCard.jsx';
import DonutChart from '../../components/charts/DonutChart.jsx';
import BarChart from '../../components/charts/BarChart.jsx';
import LineChart from '../../components/charts/LineChart.jsx';
import ChipGroup from '../../components/ui/ChipGroup.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { aggregationsByStatus } from '../../api/suppliers.js';
import {
  poCycleTime, poMonthlySpend, poSpendBySupplier
} from '../../api/purchaseOrders.js';
import { formatINR } from '../../components/charts/chartTheme.js';
import { SUPPLIER_STATUS_LABEL } from '../../constants/statuses.js';
import './Dashboard.css';

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map((y) => ({
  value: String(y), label: String(y)
}));

export default function BuyerDashboard() {
  const [year, setYear] = useState(String(CURRENT_YEAR));

  const supByStatusQ = useQuery({ queryKey: ['agg', 'sup-by-status'],     queryFn: aggregationsByStatus, staleTime: 60_000 });
  const monthlyQ     = useQuery({ queryKey: ['agg', 'po-monthly', year],  queryFn: () => poMonthlySpend(Number(year)), staleTime: 60_000 });
  const topSupQ      = useQuery({ queryKey: ['agg', 'po-top-sup', 'ytd'], queryFn: () => poSpendBySupplier('ytd', 5),  staleTime: 60_000 });
  const cycleQ       = useQuery({ queryKey: ['agg', 'po-cycle'],          queryFn: poCycleTime,                        staleTime: 60_000 });

  const supDonut = useMemo(() => (supByStatusQ.data?.data || []).map((d) => ({
    label: SUPPLIER_STATUS_LABEL[d.status] || d.status,
    value: d.count,
    key:   d.status
  })), [supByStatusQ.data]);

  const monthly = useMemo(() => {
    const arr = monthlyQ.data?.data || monthlyQ.data || [];
    return arr.map((m) => ({
      label: m.month ? m.month.toString().slice(0, 7).slice(5) : m.label,
      value: Number(m.total_spend ?? m.value ?? 0)
    }));
  }, [monthlyQ.data]);

  const topSup = useMemo(() => (topSupQ.data?.data || []).map((s) => ({
    label: s.supplier_name || s.display_name || s.supplier_id?.slice(0, 8),
    value: Number(s.total_spend ?? s.total ?? 0)
  })), [topSupQ.data]);

  const avgDays = cycleQ.data?.avg_days;
  const medianDays = cycleQ.data?.median_days;

  return (
    <div className="dash">
      <header className="dash__header">
        <div>
          <h1 className="t-headline">Buyer dashboard</h1>
          <p className="t-body-sm">At-a-glance view of supplier health and your team's spend.</p>
        </div>
      </header>

      <div className="dash__kpis">
        <KpiCard
          label="Cycle time · avg"
          value={cycleQ.isLoading ? '…' : (avgDays != null ? `${Number(avgDays).toFixed(1)}d` : '—')}
          sublabel={medianDays != null ? `median ${Number(medianDays).toFixed(1)}d` : ' '}
          tone="primary"
        />
        <KpiCard
          label="Suppliers"
          value={supByStatusQ.isLoading ? '…' :
            (supByStatusQ.data?.data || []).reduce((s, d) => s + d.count, 0).toLocaleString()}
          sublabel="across all statuses"
          to="/suppliers"
        />
        <KpiCard
          label="Top supplier (YTD)"
          value={topSupQ.isLoading ? '…' : (topSup[0]?.label || '—')}
          sublabel={topSup[0] ? formatINR(topSup[0].value, { compact: true }) : ' '}
          tone="primary"
        />
        <KpiCard
          label="Spend YTD"
          value={topSupQ.isLoading ? '…' :
            formatINR(topSup.reduce((s, d) => s + d.value, 0), { compact: true })}
          sublabel="top 5 suppliers"
        />
      </div>

      <div className="dash__grid">
        <div className="dash__cell--4">
          <ChartCard title="Suppliers by status" subtitle="Live count from the supplier directory" height={260}>
            <ChartBody query={supByStatusQ} data={supDonut}>
              <DonutChart data={supDonut} />
            </ChartBody>
          </ChartCard>
        </div>

        <div className="dash__cell--8">
          <ChartCard
            title="Monthly spend"
            subtitle={`Total PO spend by month in ${year}`}
            height={260}
            actions={
              <ChipGroup compact options={YEAR_OPTIONS} value={year} onChange={setYear} />
            }
          >
            <ChartBody query={monthlyQ} data={monthly}>
              <LineChart data={monthly} money />
            </ChartBody>
          </ChartCard>
        </div>

        <div className="dash__cell--12">
          <ChartCard title="Top suppliers by spend (YTD)" subtitle="Ranked by total PO value" height={260}>
            <ChartBody query={topSupQ} data={topSup}>
              <BarChart data={topSup} orientation="horizontal" money />
            </ChartBody>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

/** Shared loading / empty / error wrapper for chart bodies. */
function ChartBody({ query, data, children }) {
  if (query.isLoading) return <Skeleton width="100%" height="100%" />;
  if (query.isError)   return <div className="dash__error">Could not load — retry from the screen menu.</div>;
  if (!data || data.length === 0) return <div className="dash__error">No data yet.</div>;
  return children;
}
