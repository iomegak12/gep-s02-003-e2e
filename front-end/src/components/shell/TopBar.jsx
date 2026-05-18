import { useState } from 'react';
import { Activity, Menu, Search } from 'lucide-react';
import Tooltip from '../ui/Tooltip.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import ServiceHealthModal from './ServiceHealthModal.jsx';
import UserMenu from './UserMenu.jsx';
import { useServiceHealth, summariseHealth } from '../../hooks/useServiceHealth.js';
import './TopBar.css';

export default function TopBar({ onToggleSidebar }) {
  const [healthOpen, setHealthOpen] = useState(false);
  const { data } = useServiceHealth();
  const overall = summariseHealth(data);

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          className="topbar__icon-btn"
          aria-label="Toggle navigation"
          onClick={onToggleSidebar}
        >
          <Menu size={18} />
        </button>
        <a className="topbar__brand" href="/">
          <span className="topbar__logo">N</span>
          <span className="topbar__wordmark">Nexus SCM</span>
        </a>
      </div>

      <div className="topbar__search">
        <Search size={14} className="topbar__search-icon" />
        <input
          type="search"
          placeholder="Search suppliers, POs…"
          aria-label="Global search"
          disabled
        />
      </div>

      <div className="topbar__right">
        <Tooltip label="Back-end service health" placement="bottom">
          <button
            type="button"
            className="topbar__health"
            onClick={() => setHealthOpen(true)}
            aria-label="Open service health"
          >
            <Activity size={16} />
            <span className="topbar__health-dot" data-status={overall} aria-hidden="true" />
          </button>
        </Tooltip>

        <ThemeToggle />
        <UserMenu />
      </div>

      <ServiceHealthModal open={healthOpen} onClose={() => setHealthOpen(false)} />
    </header>
  );
}
