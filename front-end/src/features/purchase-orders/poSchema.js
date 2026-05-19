import { z } from 'zod';
import { PAYMENT_TERMS } from '../../constants/statuses.js';

const trimmed = (min = 1, max = 200, msg = 'Required') =>
  z.string().trim().min(min, msg).max(max, `Max ${max} characters`);

const iso2 = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Use a 2-letter ISO code (e.g. IN)');
const iso3 = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a 3-letter ISO code (e.g. INR)');

export const UOM_OPTIONS = ['EA', 'PCS', 'BOX', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'HR'];

export const lineItemSchema = z.object({
  line_number:     z.number().int().min(1, 'Line # must be ≥ 1'),
  item_description: trimmed(2, 500, 'Description is required'),
  sku:             z.string().trim().max(50).optional().or(z.literal('')),
  quantity:        z.number().positive('Quantity must be > 0'),
  unit_of_measure: z.enum(UOM_OPTIONS, { errorMap: () => ({ message: 'Pick a UoM' }) }),
  unit_price:      z.number().min(0, 'Unit price must be ≥ 0'),
  tax_rate:        z.number().min(0).max(100)
});

export const poDeliveryAddressSchema = z.object({
  street:      trimmed(1, 200, 'Street is required'),
  city:        trimmed(1, 80,  'City is required'),
  state:       trimmed(1, 80,  'State is required'),
  country:     iso2,
  postal_code: trimmed(1, 20,  'Postal code is required')
});

export const poCreateSchema = z.object({
  supplier_id:           z.string().uuid('Choose a supplier'),
  currency:              iso3,
  expected_delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick an expected delivery date'),
  payment_terms:         z.enum(PAYMENT_TERMS, { errorMap: () => ({ message: 'Pick payment terms' }) }),
  delivery_address:      poDeliveryAddressSchema,
  notes:                 z.string().trim().max(2000).optional().or(z.literal('')),
  line_items:            z.array(lineItemSchema).min(1, 'Add at least one line item')
});

/** Initial draft values (India-only, like the supplier wizard). */
export function emptyPoDraft() {
  const today = new Date();
  const inAWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    supplier_id: '',
    supplier_snapshot: null, // local-only convenience for the wizard UI
    currency: 'INR',
    expected_delivery_date: inAWeek.toISOString().slice(0, 10),
    payment_terms: '',
    delivery_address: { street: '', city: '', state: '', country: 'IN', postal_code: '' },
    notes: '',
    line_items: []
  };
}

/** Prepare a server payload from a wizard draft. */
export function toCreatePayload(values) {
  const { supplier_snapshot, ...rest } = values; // drop UI-only field
  const out = { ...rest };
  if (!out.notes || !out.notes.trim()) delete out.notes;
  // Always renumber 1..N to guarantee uniqueness — the back-end has a
  // unique constraint on (po_id, line_number) and the UI shouldn't be able
  // to break it.
  out.line_items = (values.line_items || []).map((li, idx) => {
    const item = {
      line_number:      idx + 1,
      item_description: li.item_description,
      quantity:         li.quantity,
      unit_of_measure:  li.unit_of_measure,
      unit_price:       li.unit_price,
      tax_rate:         li.tax_rate
    };
    if (li.sku && li.sku.trim()) item.sku = li.sku.trim();
    return item;
  });
  return out;
}

/** Pure helpers used by the inline editor and the review screen. */
export function computeLineTotal(li) {
  const qty   = Number(li.quantity   || 0);
  const price = Number(li.unit_price || 0);
  return qty * price;
}
export function computeTotals(items = []) {
  let subtotal = 0;
  let tax = 0;
  for (const li of items) {
    const line = computeLineTotal(li);
    subtotal += line;
    tax += line * (Number(li.tax_rate || 0) / 100);
  }
  return { subtotal, tax_amount: tax, total_amount: subtotal + tax };
}
