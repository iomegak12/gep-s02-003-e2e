const { z } = require('zod');
const { AppError } = require('../common/errors');

const PAYMENT_TERMS = ['NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', 'IMMEDIATE', 'ADVANCE_50_50'];

const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  postal_code: z.string(),
});

const lineItemSchema = z.object({
  line_number: z.number().int().min(1),
  item_description: z.string().min(1),
  sku: z.string().optional(),
  quantity: z.number().min(0),
  unit_of_measure: z.string(),
  unit_price: z.number().min(0),
  tax_rate: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const createPoSchema = z.object({
  supplier_id: z.string(),
  currency: z.string(),
  expected_delivery_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  payment_terms: z.enum(PAYMENT_TERMS),
  delivery_address: addressSchema.optional(),
  notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1),
});

const updatePoSchema = z.object({
  expected_delivery_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  payment_terms: z.enum(PAYMENT_TERMS).optional(),
  delivery_address: addressSchema.optional(),
  notes: z.string().optional(),
});

const updateLineItemSchema = z.object({
  item_description: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().min(0).optional(),
  unit_of_measure: z.string().optional(),
  unit_price: z.number().min(0).optional(),
  tax_rate: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const reasonSchema = z.object({
  reason: z.string().min(1),
});

const optionalReasonSchema = z.object({
  reason: z.string().min(1).optional(),
}).partial();

const fulfillSchema = z.object({
  actual_delivery_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
});

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new AppError(400, 'VALIDATION_FAILED', 'Validation failed', result.error.issues));
    }
    req.body = result.data;
    next();
  };
}

module.exports = {
  PAYMENT_TERMS,
  addressSchema,
  lineItemSchema,
  createPoSchema,
  updatePoSchema,
  updateLineItemSchema,
  reasonSchema,
  optionalReasonSchema,
  fulfillSchema,
  validate,
};
