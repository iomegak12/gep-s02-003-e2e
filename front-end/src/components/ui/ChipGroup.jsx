import './ChipGroup.css';

/**
 * Single-select pill toggle group.
 *   options: Array<{ value, label } | string>
 *   value:   string
 *   onChange: (next:string) => void
 *   columns?: 'auto' (default, wraps) | a number for grid columns
 *   compact?: smaller chips
 *   disabled?: boolean
 *   maxHeight?: number (px) — scroll when chips overflow
 */
export default function ChipGroup({
  options = [],
  value,
  onChange,
  columns = 'auto',
  compact = false,
  disabled = false,
  maxHeight,
  ariaLabel
}) {
  const style = maxHeight ? { maxHeight, overflowY: 'auto' } : undefined;
  return (
    <div
      className={`chip-group${compact ? ' chip-group--compact' : ''}`}
      role="radiogroup"
      aria-label={ariaLabel}
      style={{ ...style, ...(typeof columns === 'number' ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)` } : null) }}
    >
      {options.map((opt) => {
        const o = typeof opt === 'string' ? { value: opt, label: opt } : opt;
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`chip${active ? ' chip--active' : ''}`}
            onClick={() => !disabled && onChange?.(o.value)}
            disabled={disabled}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
