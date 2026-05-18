export const SUPPLIER_STATUS = Object.freeze({
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLACKLISTED: 'BLACKLISTED'
});

export const SUPPLIER_STATUS_TONE = {
  PENDING_APPROVAL: 'pending',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLACKLISTED: 'error'
};

export const PO_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  FULFILLED: 'FULFILLED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED'
});

export const PO_STATUS_TONE = {
  DRAFT: 'neutral',
  SUBMITTED: 'submitted',
  APPROVED: 'active',
  REJECTED: 'error',
  FULFILLED: 'fulfilled',
  CLOSED: 'inactive',
  CANCELLED: 'error'
};

export const SUPPLIER_CATEGORY = Object.freeze({
  RAW_MATERIALS: 'RAW_MATERIALS',
  PACKAGING: 'PACKAGING',
  LOGISTICS: 'LOGISTICS',
  IT_SERVICES: 'IT_SERVICES',
  PROFESSIONAL_SERVICES: 'PROFESSIONAL_SERVICES',
  MRO: 'MRO',
  CAPEX: 'CAPEX',
  OTHER: 'OTHER'
});

export const SUPPLIER_CATEGORY_LIST = Object.values(SUPPLIER_CATEGORY);

export const PAYMENT_TERMS = Object.freeze([
  'IMMEDIATE', 'NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', 'ADVANCE_50_50'
]);

/** Order matters for Kanban columns. */
export const SUPPLIER_STATUS_ORDER = [
  'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE', 'BLACKLISTED'
];

export const SUPPLIER_STATUS_LABEL = {
  PENDING_APPROVAL: 'Pending approval',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  BLACKLISTED: 'Blacklisted'
};

export const SERVICE_LABEL = {
  iam: 'IAM',
  sup: 'Suppliers',
  po: 'Purchase Orders'
};
