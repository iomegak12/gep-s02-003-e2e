import { useState } from 'react';
import './Tabs.css';

/**
 * Uncontrolled tabs.
 *   items: [{ key, label, content }]
 *   defaultKey: initial active key
 */
export default function Tabs({ items = [], defaultKey, onChange }) {
  const initial = defaultKey ?? items[0]?.key;
  const [active, setActive] = useState(initial);
  const handle = (k) => { setActive(k); onChange?.(k); };
  const current = items.find((i) => i.key === active);
  return (
    <div className="tabs">
      <div className="tabs__list" role="tablist">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={it.key === active}
            className={`tabs__tab${it.key === active ? ' is-active' : ''}`}
            onClick={() => handle(it.key)}
          >
            {it.label}
          </button>
        ))}
      </div>
      <div className="tabs__panel" role="tabpanel">{current?.content}</div>
    </div>
  );
}
