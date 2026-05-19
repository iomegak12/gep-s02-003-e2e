import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar.jsx';
import Sidebar from './Sidebar.jsx';
import './AppShell.css';

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="shell">
      <a href="#main" className="shell__skip">Skip to content</a>
      <TopBar onToggleSidebar={() => setCollapsed((c) => !c)} />
      <div className="shell__body">
        <Sidebar collapsed={collapsed} />
        <main id="main" className="shell__main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
