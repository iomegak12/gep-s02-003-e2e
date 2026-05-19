import { Link } from 'react-router-dom';
import Badge from '../ui/Badge.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import './KpiCard.css';

/**
 * Compact KPI tile. Props:
 *   label, value, sublabel?, tone? ('neutral'|'primary'|'active'|'pending'|'error')
 *   loading?, to? (link), trend? ('up'|'down'), trendLabel?
 */
export default function KpiCard({
  label, value, sublabel, tone = 'neutral',
  loading = false, to, trend, trendLabel
}) {
  const body = (
    <>
      <div className="kpi__label t-body-sm">{label}</div>
      <div className="kpi__value">
        {loading ? <Skeleton width={120} height={28} /> : value}
      </div>
      <div className="kpi__sub">
        {sublabel && <span className="t-body-sm">{sublabel}</span>}
        {trend && (
          <Badge tone={trend === 'up' ? 'active' : trend === 'down' ? 'error' : 'neutral'}>
            {trend === 'up' ? '▲' : '▼'} {trendLabel || ''}
          </Badge>
        )}
      </div>
    </>
  );
  const cls = `kpi kpi--${tone}${to ? ' kpi--linked' : ''}`;
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}
