import {
  LayoutDashboard, Users, Building2, FileText, Inbox, ShieldCheck, UserCircle
} from 'lucide-react';
import { ROLES } from '../utils/roles.js';

/** Each item is filtered by the user's roles. `roles: null` means any. */
export const NAV_ITEMS = [
  { to: '/buyer/dashboard',    label: 'Dashboard',        icon: LayoutDashboard, roles: [ROLES.BUYER] },
  { to: '/approver/dashboard', label: 'Dashboard',        icon: LayoutDashboard, roles: [ROLES.APPROVER] },
  { to: '/admin/dashboard',    label: 'Dashboard',        icon: LayoutDashboard, roles: [ROLES.ADMIN] },
  { to: '/approvals',          label: 'Approvals',        icon: Inbox,           roles: [ROLES.APPROVER] },
  { to: '/suppliers',          label: 'Suppliers',        icon: Building2,       roles: [ROLES.BUYER, ROLES.ADMIN, ROLES.APPROVER] },
  { to: '/admin/suppliers/pending', label: 'Supplier review', icon: ShieldCheck, roles: [ROLES.ADMIN] },
  { to: '/purchase-orders',    label: 'Purchase orders',  icon: FileText,        roles: [ROLES.BUYER, ROLES.ADMIN, ROLES.APPROVER] },
  { to: '/admin/users',        label: 'Users',            icon: Users,           roles: [ROLES.ADMIN] },
  { to: '/profile',            label: 'My profile',       icon: UserCircle,      roles: null, footer: true }
];

export function navForRoles(roles = []) {
  const seen = new Set();
  return NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.some((r) => roles.includes(r))) return false;
    if (seen.has(item.to)) return false;
    seen.add(item.to);
    return true;
  });
}
