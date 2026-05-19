// Persona → drawer menu mapping.
// Menu items reference Expo Router hrefs; only items whose `roles` intersect the user's roles[] are shown.

export const ROLES = {
  BUYER: 'BUYER',
  APPROVER: 'APPROVER',
  ADMIN: 'ADMIN',
};

export const MENU_ITEMS = [
  { key: 'dashboard',       label: 'Dashboard',       href: '/(app)/dashboard',       roles: ['BUYER', 'APPROVER', 'ADMIN'], icon: 'view-dashboard-outline' },
  { key: 'suppliers',       label: 'Suppliers',       href: '/(app)/suppliers',       roles: ['BUYER', 'ADMIN'],             icon: 'factory' },
  { key: 'purchase-orders', label: 'Purchase Orders', href: '/(app)/purchase-orders', roles: ['BUYER', 'APPROVER', 'ADMIN'], icon: 'file-document-outline' },
  { key: 'approvals',       label: 'Approvals',       href: '/(app)/approvals',       roles: ['APPROVER'],                    icon: 'check-decagram-outline' },
  { key: 'users',           label: 'Users',           href: '/(app)/users',           roles: ['ADMIN'],                       icon: 'account-multiple-outline' },
  { key: 'terms',           label: 'Terms',           href: '/(app)/terms',           roles: ['BUYER', 'APPROVER', 'ADMIN'], icon: 'file-sign' },
  { key: 'contact',         label: 'Contact Us',      href: '/(app)/contact',         roles: ['BUYER', 'APPROVER', 'ADMIN'], icon: 'email-outline' },
  { key: 'support',         label: 'Support',         href: '/(app)/support',         roles: ['BUYER', 'APPROVER', 'ADMIN'], icon: 'lifebuoy' },
];

export function menuForRoles(userRoles = []) {
  const set = new Set(userRoles);
  return MENU_ITEMS.filter((m) => m.roles.some((r) => set.has(r)));
}

export function landingForRoles(userRoles = []) {
  const set = new Set(userRoles);
  if (set.has(ROLES.ADMIN)) return '/(app)/dashboard';
  if (set.has(ROLES.APPROVER)) return '/(app)/approvals';
  return '/(app)/dashboard';
}
