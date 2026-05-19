import { z } from 'zod';
import { ROLES } from '../../utils/roles.js';

const ROLE_VALUES = Object.values(ROLES);

/** Common base + per-action refinements. */
const baseShape = {
  email:          z.string().trim().toLowerCase().email('Enter a valid email').max(255),
  full_name:      z.string().trim().min(1, 'Full name is required').max(200),
  roles:          z.array(z.enum(ROLE_VALUES)).min(1, 'Pick at least one role'),
  approval_limit: z.union([z.number().nonnegative('Must be ≥ 0'), z.null(), z.undefined()]).optional(),
  is_active:      z.boolean().optional()
};

const passwordField = z
  .string()
  .min(8, 'At least 8 characters')
  .max(128, 'Max 128 characters');

export const userCreateSchema = z
  .object({
    ...baseShape,
    password: passwordField
  })
  .superRefine((v, ctx) => {
    if (v.roles.includes(ROLES.APPROVER) && (v.approval_limit == null || Number.isNaN(v.approval_limit))) {
      ctx.addIssue({
        path: ['approval_limit'],
        code: z.ZodIssueCode.custom,
        message: 'Required when role includes APPROVER'
      });
    }
  });

export const userUpdateSchema = z
  .object({
    roles:          z.array(z.enum(ROLE_VALUES)).optional(),
    approval_limit: z.union([z.number().nonnegative(), z.null()]).optional(),
    is_active:      z.boolean().optional()
  })
  .superRefine((v, ctx) => {
    if (v.roles?.includes(ROLES.APPROVER) && (v.approval_limit == null || Number.isNaN(v.approval_limit))) {
      ctx.addIssue({
        path: ['approval_limit'],
        code: z.ZodIssueCode.custom,
        message: 'Required when role includes APPROVER'
      });
    }
  });

export const resetPasswordSchema = z.object({ password: passwordField });

export function emptyUserDraft() {
  return {
    email: '',
    full_name: '',
    password: '',
    roles: [],
    approval_limit: null,
    is_active: true
  };
}

/** Strip fields that don't belong in create/update payloads. */
export function toCreatePayload(values) {
  const out = {
    email: values.email,
    full_name: values.full_name,
    password: values.password,
    roles: values.roles
  };
  if (values.roles.includes(ROLES.APPROVER) && values.approval_limit != null) {
    out.approval_limit = values.approval_limit;
  }
  return out;
}
export function toUpdatePayload(values) {
  const out = {};
  if (values.roles)              out.roles = values.roles;
  if (values.is_active != null)  out.is_active = values.is_active;
  // Send approval_limit ONLY when APPROVER role; null clears the field for non-approvers.
  if (values.roles?.includes(ROLES.APPROVER)) {
    out.approval_limit = values.approval_limit ?? null;
  } else if (values.roles && !values.roles.includes(ROLES.APPROVER)) {
    out.approval_limit = null;
  }
  return out;
}
