import { LayoutGrid, Rows, Kanban } from 'lucide-react';
import Tooltip from '../ui/Tooltip.jsx';
import './ViewSwitcher.css';

const VIEWS = [
  { key: 'table',  label: 'Table',  Icon: Rows },
  { key: 'card',   label: 'Cards',  Icon: LayoutGrid },
  { key: 'kanban', label: 'Kanban', Icon: Kanban }
];

export default function ViewSwitcher({ value, onChange, available = ['table', 'card', 'kanban'] }) {
  return (
    <div className="view-switcher" role="group" aria-label="View">
      {VIEWS.filter((v) => available.includes(v.key)).map(({ key, label, Icon }) => (
        <Tooltip key={key} label={label} placement="bottom">
          <button
            type="button"
            className={`view-switcher__btn${value === key ? ' is-active' : ''}`}
            aria-pressed={value === key}
            onClick={() => onChange?.(key)}
          >
            <Icon size={14} />
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
