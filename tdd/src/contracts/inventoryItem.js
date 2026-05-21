import { ValidationError } from './errors.js';

/**
 * @typedef {Object} InventoryItem
 *
 * Identity
 * @property {string} id            Stable unique id (UUID/ULID).
 * @property {string} sku           Business-readable stock-keeping unit.
 * @property {string} name          Display name.
 *
 * Quantity & Units
 * @property {number} quantity      Current quantity on hand (>= 0).
 * @property {string} unit          Unit of measure, e.g. "pcs", "kg", "ltr".
 * @property {number} reorderLevel  Threshold under which item is "low stock".
 *
 * Pricing & Cost
 * @property {number} unitCost      Cost per unit (>= 0).
 * @property {number} salePrice     Sale price per unit (>= 0).
 * @property {string} currency      ISO-4217 code, e.g. "INR", "USD".
 *
 * Location & Category
 * @property {string} location      Warehouse / bin identifier.
 * @property {string} category      Category or tag.
 * @property {string} [supplier]    Optional supplier reference.
 */

const REQUIRED_STRINGS = ['id', 'sku', 'name', 'unit', 'currency', 'location', 'category'];
const REQUIRED_NUMBERS = ['quantity', 'reorderLevel', 'unitCost', 'salePrice'];

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isNonNegativeNumber(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

/**
 * Validate an InventoryItem shape. Throws ValidationError on the first failure.
 * @param {InventoryItem} item
 * @returns {void}
 */
export function validateInventoryItem(item) {
  if (item === null || typeof item !== 'object') {
    throw new ValidationError('Item must be an object');
  }

  for (const key of REQUIRED_STRINGS) {
    if (!isNonEmptyString(item[key])) {
      throw new ValidationError(`Field "${key}" must be a non-empty string`);
    }
  }

  for (const key of REQUIRED_NUMBERS) {
    if (!isNonNegativeNumber(item[key])) {
      throw new ValidationError(`Field "${key}" must be a non-negative finite number`);
    }
  }

  if (item.currency.length !== 3) {
    throw new ValidationError('Field "currency" must be a 3-letter ISO-4217 code');
  }

  if (item.supplier !== undefined && !isNonEmptyString(item.supplier)) {
    throw new ValidationError('Field "supplier" must be a non-empty string when provided');
  }
}
