import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import './Menu.css';

/**
 * Lightweight dropdown menu.
 *   items: Array<{ key, label, icon?, danger?, disabled?, onSelect: () => void }>
 *   trigger: optional custom trigger element (defaults to vertical kebab)
 *   align: 'left' | 'right' (defaults to 'right')
 */
export default function Menu({ items = [], trigger, align = 'right', label = 'Open menu' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <div className="menu" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger || <MoreVertical size={16} />}
      </button>
      {open && (
        <div className={`menu__popover menu__popover--${align}`} role="menu">
          {visible.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              className={`menu__item${it.danger ? ' menu__item--danger' : ''}`}
              disabled={it.disabled}
              onClick={() => { setOpen(false); it.onSelect?.(); }}
            >
              {it.icon && <span className="menu__icon">{it.icon}</span>}
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
