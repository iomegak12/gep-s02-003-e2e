import './ChartCard.css';

/**
 * Container card for any chart/KPI widget. Wraps the body in a fixed-height
 * area so chart libraries can fill 100% width/height predictably.
 */
export default function ChartCard({ title, subtitle, actions, height = 240, children }) {
  return (
    <section className="chart-card">
      <header className="chart-card__header">
        <div>
          {title && <h3 className="t-headline">{title}</h3>}
          {subtitle && <p className="t-body-sm">{subtitle}</p>}
        </div>
        {actions && <div className="chart-card__actions">{actions}</div>}
      </header>
      <div className="chart-card__body" style={{ height }}>
        {children}
      </div>
    </section>
  );
}
