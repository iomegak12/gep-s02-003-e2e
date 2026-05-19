// Quick-fill credentials for the four seeded back-end personas.
// Source: back-end/tests seed data and tech spec Appendix D.
// SECURITY: these are demo creds for trainees only; do not use in production builds.

export const SAMPLE_CREDENTIALS = [
  {
    id: 'buyer',
    label: 'Buyer',
    description: 'Procurement officer',
    email: 'buyer1@gep.com',
    password: 'P@ssw0rd!',
    roleHint: 'BUYER',
    accent: '#3E46FF',
  },
  {
    id: 'approver',
    label: 'Approver',
    description: 'Senior buyer',
    email: 'approver1@gep.com',
    password: 'P@ssw0rd!',
    roleHint: 'APPROVER',
    accent: '#10B981',
  },
  {
    id: 'approver-lo',
    label: 'Approver (Lo)',
    description: 'Low approval limit',
    email: 'approver.low@gep.com',
    password: 'P@ssw0rd!',
    roleHint: 'APPROVER',
    accent: '#F59E0B',
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Platform admin',
    email: 'admin1@gep.com',
    password: 'P@ssw0rd!',
    roleHint: 'ADMIN',
    accent: '#8D2800',
  },
];
