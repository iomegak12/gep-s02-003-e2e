import { z } from 'zod';
import { SUPPLIER_CATEGORY_LIST, PAYMENT_TERMS } from '../../constants/statuses.js';

const trimmed = (min = 1, max = 200, msg = 'Required') =>
  z.string().trim().min(min, msg).max(max, `Max ${max} characters`);

const iso2 = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'Use a 2-letter ISO code (e.g. IN)');

const iso3Currency = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Use a 3-letter ISO code (e.g. INR)');

export const contactSchema = z.object({
  primary_name: trimmed(1, 120, 'Contact name is required'),
  email:        z.string().trim().toLowerCase().email('Enter a valid email'),
  phone:        trimmed(4, 32, 'Phone is required')
});

export const addressSchema = z.object({
  street:      trimmed(1, 200, 'Street is required'),
  city:        trimmed(1, 80,  'City is required'),
  state:       trimmed(1, 80,  'State is required'),
  country:     iso2,
  postal_code: trimmed(1, 20,  'Postal code is required')
});

/**
 * Used for Create. Edit re-uses this with `.partial()` so any subset can be
 * sent in a PATCH body, but `supplier_code` is stripped before sending
 * (immutable on the back-end).
 */
export const supplierBaseSchema = z.object({
  supplier_code: trimmed(2, 40, 'Supplier code is required'),
  legal_name:    trimmed(1, 200, 'Legal name is required'),
  display_name:  trimmed(1, 120, 'Display name is required'),
  category:      z.enum(SUPPLIER_CATEGORY_LIST, { errorMap: () => ({ message: 'Pick a category' }) }),
  sub_category:  z.string().trim().max(80).optional().or(z.literal('')),
  country:       iso2,
  region:        z.string().trim().max(40).optional().or(z.literal('')),
  tax_id:        z.string().trim().max(40).optional().or(z.literal('')),
  contact:       contactSchema,
  address:       addressSchema,
  payment_terms: z.enum(PAYMENT_TERMS, { errorMap: () => ({ message: 'Pick payment terms' }) }),
  currency:      iso3Currency,
  tags:          z.array(z.string().trim().min(1)).max(20).optional()
});

export const supplierCreateSchema = supplierBaseSchema;
export const supplierUpdateSchema = supplierBaseSchema.omit({ supplier_code: true }).partial();

/** Default empty values for a brand-new supplier form. */
export function emptySupplier() {
  return {
    supplier_code: '',
    legal_name: '',
    display_name: '',
    category: '',
    sub_category: '',
    country: '',
    region: '',
    tax_id: '',
    contact: { primary_name: '', email: '', phone: '' },
    address: { street: '', city: '', state: '', country: '', postal_code: '' },
    payment_terms: '',
    currency: '',
    tags: []
  };
}

/** Map an existing supplier record into the form's value shape. */
export function supplierToFormValues(s = {}) {
  const base = emptySupplier();
  return {
    ...base,
    ...s,
    sub_category: s.sub_category ?? '',
    region: s.region ?? '',
    tax_id: s.tax_id ?? '',
    contact: { ...base.contact, ...(s.contact || {}) },
    address: { ...base.address, ...(s.address || {}) },
    tags: Array.isArray(s.tags) ? s.tags : []
  };
}

/**
 * Strip empty-string optionals before sending — the back-end accepts the field
 * being absent, and an empty string would needlessly bloat the payload (and
 * in some Pydantic configs trigger validation).
 */
export function pruneEmpty(payload) {
  const out = {};
  for (const [k, v] of Object.entries(payload || {})) {
    if (v === undefined) continue;
    if (typeof v === 'string') {
      if (v.trim() === '') continue;
      out[k] = v;
    } else if (Array.isArray(v)) {
      if (v.length > 0) out[k] = v;
    } else if (v !== null && typeof v === 'object') {
      out[k] = v;
    } else {
      out[k] = v;
    }
  }
  return out;
}
