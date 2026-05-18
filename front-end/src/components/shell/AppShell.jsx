import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar.jsx';
import Sidebar from './Sidebar.jsx';
import './AppShell.css';

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="shell">
      <TopBar onToggleSidebar={() => setCollapsed((c) => !c)} />
      <div className="shell__body">
        <Sidebar collapsed={collapsed} />
        <main className="shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
