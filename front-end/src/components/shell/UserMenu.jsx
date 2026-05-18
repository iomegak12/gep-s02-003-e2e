import { useEffect, useRef, useState } from 'react';
import { LogOut, Settings, UserCircle, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { logout as logoutApi } from '../../api/iam.js';
import './UserMenu.css';

function initialsOf(name = '', email = '') {
  const src = name || email || '?';
  return src
    .split(/[\s.@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') || '?';
}

export default function UserMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!isAuthenticated) {
    return <Link to="/login" className="usermenu__signin">Sign in</Link>;
  }

  const initials = initialsOf(user?.full_name, user?.email);
  return (
    <div className="usermenu" ref={ref}>
      <button
        className="usermenu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="usermenu__avatar">{initials}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="usermenu__popover" role="menu">
          <div className="usermenu__head">
            <div style={{ fontWeight: 600 }}>{user?.full_name || user?.email}</div>
            <div className="t-body-sm">{(user?.roles || []).join(' · ')}</div>
          </div>
          <Link to="/profile" className="usermenu__item" role="menuitem" onClick={() => setOpen(false)}>
            <UserCircle size={14} /> My profile
          </Link>
          <Link to="/settings" className="usermenu__item" role="menuitem" onClick={() => setOpen(false)}>
            <Settings size={14} /> Settings
          </Link>
          <button className="usermenu__item" role="menuitem" onClick={async () => { await logoutApi(); logout(); }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
