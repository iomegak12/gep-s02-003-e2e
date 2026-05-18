import EmptyState from '../ui/EmptyState.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import './DataKanban.css';

/**
 * Display-only Kanban grouped by `groupBy(item)`.
 * Props:
 *   columns: [{ key, label, tone? }]
 *   data: array of items
 *   groupBy: (item) => columnKey
 *   renderCard: (item) => React node
 *   loading, onCardClick
 */
export default function DataKanban({
  columns = [],
  data = [],
  groupBy,
  renderCard,
  loading = false,
  onCardClick,
  emptyTitle = 'No items'
}) {
  if (!loading && data.length === 0) {
    return <EmptyState title={emptyTitle} />;
  }

  const byKey = new Map(columns.map((c) => [c.key, []]));
  for (const item of data) {
    const k = groupBy(item);
    if (byKey.has(k)) byKey.get(k).push(item);
  }

  return (
    <div className="kanban">
      {columns.map((col) => {
        const items = byKey.get(col.key) || [];
        return (
          <section key={col.key} className="kanban__col">
            <header className="kanban__col-head">
              <span
                className="kanban__col-dot"
                style={col.tone ? { background: `var(--status-${col.tone})` } : undefined}
              />
              <span className="t-body" style={{ fontWeight: 600 }}>{col.label}</span>
              <span className="kanban__count">{items.length}</span>
            </header>
            <div className="kanban__col-body">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={`sk-${i}`} className="kanban__card">
                      <Skeleton width="80%" height={12} />
                      <Skeleton width="50%" height={10} style={{ marginTop: 8 }} />
                    </div>
                  ))
                : items.map((it, idx) => (
                    <div
                      key={it.id ?? idx}
                      className="kanban__card"
                      role="button"
                      tabIndex={0}
                      onClick={() => onCardClick?.(it)}
                      onKeyDown={(e) => { if (e.key === 'Enter') onCardClick?.(it); }}
                    >
                      {renderCard(it)}
                    </div>
                  ))}
              {!loading && items.length === 0 && (
                <div className="kanban__empty t-body-sm">—</div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
