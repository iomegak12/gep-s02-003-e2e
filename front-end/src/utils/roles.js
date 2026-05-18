export const ROLES = Object.freeze({
  BUYER: 'BUYER',
  APPROVER: 'APPROVER',
  ADMIN: 'ADMIN'
});

export function landingPathFor(roles = []) {
  if (roles.includes(ROLES.ADMIN)) return '/admin/dashboard';
  if (roles.includes(ROLES.APPROVER) && !roles.includes(ROLES.BUYER)) return '/approvals';
  if (roles.includes(ROLES.BUYER)) return '/buyer/dashboard';
  if (roles.includes(ROLES.APPROVER)) return '/approver/dashboard';
  return '/profile';
}
