import {
  CartesianGrid, Line, LineChart as ReLineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Area, AreaChart
} from 'recharts';
import { useChartTheme, formatINR } from './chartTheme.js';

/**
 * data: [{ label, value }]
 * money: true to format axis + tooltip as INR compact
 * filled: render an area chart underneath (subtle gradient)
 */
export default function LineChart({ data = [], money = false, filled = true }) {
  const t = useChartTheme();
  if (!data.length) return null;

  const fmt = (v) => money ? formatINR(v, { compact: true }) : Number(v).toLocaleString();
  const Chart = filled ? AreaChart : ReLineChart;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Chart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={t.primary} stopOpacity={0.30} />
            <stop offset="95%" stopColor={t.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" stroke={t.muted} fontSize={11} tickLine={false} />
        <YAxis stroke={t.muted} fontSize={11} tickLine={false} tickFormatter={fmt} width={56} />
        <Tooltip
          contentStyle={{
            background: t.surface, border: `1px solid ${t.grid}`,
            borderRadius: 4, fontSize: 12, color: t.text
          }}
          formatter={(v) => [fmt(v), 'Value']}
        />
        {filled ? (
          <Area type="monotone" dataKey="value" stroke={t.primary} strokeWidth={2}
            fill="url(#lineFill)" dot={false} />
        ) : (
          <Line type="monotone" dataKey="value" stroke={t.primary} strokeWidth={2} dot={false} />
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
