require('dotenv/config');

const env = {
  iamUrl: process.env.IAM_URL ?? 'http://localhost:3001',
  supplierUrl: process.env.SUPPLIER_URL ?? 'http://localhost:3002',
  poUrl: process.env.PO_URL ?? 'http://localhost:3003',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@demo.local',
  buyerEmail: process.env.BUYER_EMAIL ?? 'buyer@demo.local',
  approverHiEmail: process.env.APPROVER_HI_EMAIL ?? 'approver-hi@demo.local',
  approverLoEmail: process.env.APPROVER_LO_EMAIL ?? 'approver-lo@demo.local',
  seedPassword: process.env.SEED_PASSWORD ?? 'Passw0rd!',
  approvalThreshold: Number(process.env.PO_APPROVAL_THRESHOLD ?? '100000'),
  waitTimeoutMs: Number(process.env.WAIT_FOR_STACK_TIMEOUT ?? '60000'),
};

module.exports = { env };
