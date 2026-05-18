import { NavLink } from 'react-router-dom';
import Tooltip from '../ui/Tooltip.jsx';
import { navForRoles } from '../../constants/nav.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import './Sidebar.css';

export default function Sidebar({ collapsed }) {
  const { roles } = useAuth();
  const items = navForRoles(roles);
  const primary = items.filter((i) => !i.footer);
  const footer = items.filter((i) => i.footer);

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <nav className="sidebar__nav" aria-label="Main">
        {primary.map((it) => (
          <SidebarItem key={it.to} item={it} collapsed={collapsed} />
        ))}
      </nav>
      {footer.length > 0 && (
        <nav className="sidebar__nav sidebar__nav--footer" aria-label="Account">
          {footer.map((it) => (
            <SidebarItem key={it.to} item={it} collapsed={collapsed} />
          ))}
        </nav>
      )}
    </aside>
  );
}

function SidebarItem({ item, collapsed }) {
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.to}
      className={({ isActive }) => `sidebar__item${isActive ? ' is-active' : ''}`}
    >
      <Icon size={18} />
      {!collapsed && <span className="sidebar__label">{item.label}</span>}
    </NavLink>
  );
  return collapsed ? <Tooltip label={item.label} placement="right">{link}</Tooltip> : link;
}
