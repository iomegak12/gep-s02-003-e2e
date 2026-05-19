import {
  Bar, BarChart as ReBarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Cell
} from 'recharts';
import { useChartTheme, STATUS_COLOR } from './chartTheme.js';
import { formatINR } from './chartTheme.js';

/**
 * data: [{ label, value, key? }]
 *   key (when provided) maps via STATUS_COLOR.
 * orientation: 'vertical' (default — labels on x) | 'horizontal' (labels on y)
 * money: true to format values as INR (axis + tooltip)
 */
export default function BarChart({ data = [], orientation = 'vertical', money = false }) {
  const t = useChartTheme();
  if (!data.length) return null;

  const colorFor = (d, i) => {
    const tok = d.key ? STATUS_COLOR[d.key] : null;
    return tok ? t[tok] : t.series[i % t.series.length];
  };

  const fmt = (v) => money ? formatINR(v, { compact: true }) : Number(v).toLocaleString();
  const layout = orientation === 'horizontal' ? 'vertical' : 'horizontal';
  // Recharts uses `layout: 'vertical'` for horizontal bars (axes swap).

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ReBarChart data={data} layout={layout} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={layout === 'horizontal'} />
        {layout === 'horizontal' ? (
          <>
            <XAxis dataKey="label" stroke={t.muted} fontSize={11} tickLine={false} interval={0} />
            <YAxis stroke={t.muted} fontSize={11} tickLine={false} tickFormatter={fmt} width={56} />
          </>
        ) : (
          <>
            <XAxis type="number" stroke={t.muted} fontSize={11} tickLine={false} tickFormatter={fmt} />
            <YAxis dataKey="label" type="category" stroke={t.muted} fontSize={11} tickLine={false} width={120} interval={0} />
          </>
        )}
        <Tooltip
          cursor={{ fill: 'transparent' }}
          contentStyle={{
            background: t.surface, border: `1px solid ${t.grid}`,
            borderRadius: 4, fontSize: 12, color: t.text
          }}
          formatter={(v, _, payload) => [fmt(v), payload?.payload?.label]}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={colorFor(d, i)} />)}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  );
}
