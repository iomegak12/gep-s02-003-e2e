import Skeleton from '../ui/Skeleton.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import './DataCardGrid.css';

/**
 * Generic card grid. `renderCard(item)` returns the card body.
 */
export default function DataCardGrid({
  data = [],
  renderCard,
  loading = false,
  onCardClick,
  emptyTitle = 'No results',
  emptyDescription,
  skeletonCount = 8
}) {
  if (!loading && data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="dcg">
      {loading
        ? Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={`sk-${i}`} className="dcg__card">
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={10} style={{ marginTop: 8 }} />
              <Skeleton width="100%" height={10} style={{ marginTop: 12 }} />
            </div>
          ))
        : data.map((item, idx) => (
            <div
              key={item.id ?? idx}
              className="dcg__card dcg__card--clickable"
              role="button"
              tabIndex={0}
              onClick={() => onCardClick?.(item)}
              onKeyDown={(e) => { if (e.key === 'Enter') onCardClick?.(item); }}
            >
              {renderCard(item)}
            </div>
          ))}
    </div>
  );
}
