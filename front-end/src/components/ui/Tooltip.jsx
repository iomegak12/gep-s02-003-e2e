import './Tooltip.css';

/** Minimal CSS-only tooltip; replace with a positioning lib later if needed. */
export default function Tooltip({ label, children, placement = 'bottom' }) {
  return (
    <span className="tt" data-placement={placement}>
      {children}
      <span className="tt__bubble" role="tooltip">{label}</span>
    </span>
  );
}
