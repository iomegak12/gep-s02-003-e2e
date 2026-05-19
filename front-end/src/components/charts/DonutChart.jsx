import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useChartTheme, STATUS_COLOR } from './chartTheme.js';

/**
 * data: [{ label, value, key? }]
 * key (when provided) is mapped through STATUS_COLOR to a token; otherwise a
 * round-robin from the categorical series palette is used.
 */
export default function DonutChart({ data = [], total }) {
  const t = useChartTheme();
  if (!data.length) return null;

  const colors = data.map((d, i) => {
    const tok = d.key ? STATUS_COLOR[d.key] : null;
    return tok ? t[tok] : t.series[i % t.series.length];
  });
  const centreTotal = total ?? data.reduce((s, d) => s + Number(d.value || 0), 0);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="58%"
            outerRadius="86%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle(t)}
            formatter={(v, name) => [Number(v).toLocaleString(), name]}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 11, color: t.muted }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-centre">
        <div className="donut-centre__value">{Number(centreTotal).toLocaleString()}</div>
        <div className="donut-centre__label">total</div>
      </div>
      <style>{`
        .donut-centre {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          pointer-events: none;
          margin-bottom: 26px; /* leave room for legend */
        }
        .donut-centre__value { font-size: 20px; font-weight: 700; color: ${t.text}; }
        .donut-centre__label { font-size: 10px; font-weight: 600; letter-spacing: 0.05em;
          text-transform: uppercase; color: ${t.muted}; }
      `}</style>
    </div>
  );
}

function tooltipStyle(t) {
  return {
    background: t.surface,
    border: `1px solid ${t.grid}`,
    borderRadius: 4,
    fontSize: 12,
    color: t.text
  };
}
