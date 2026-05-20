// Quick-fill credentials for the four seeded demo personas.
// SECURITY: these are demo creds for trainees only; do not use in production builds.

const COMMON_PASSWORD = 'Passw0rd!';

export const SAMPLE_CREDENTIALS = [
  {
    id: 'buyer',
    label: 'Buyer',
    description: 'Procurement officer',
    email: 'buyer@demo.local',
    password: COMMON_PASSWORD,
    roleHint: 'BUYER',
    accent: '#3E46FF',
  },
  {
    id: 'approver',
    label: 'Approver Hi',
    description: 'High approval limit',
    email: 'approver-hi@demo.local',
    password: COMMON_PASSWORD,
    roleHint: 'APPROVER',
    accent: '#10B981',
  },
  {
    id: 'approver-lo',
    label: 'Approver Lo',
    description: 'Low approval limit',
    email: 'approver-lo@demo.local',
    password: COMMON_PASSWORD,
    roleHint: 'APPROVER',
    accent: '#F59E0B',
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Platform admin',
    email: 'admin@demo.local',
    password: COMMON_PASSWORD,
    roleHint: 'ADMIN',
    accent: '#8D2800',
  },
];
