import { NotImplementedError } from './errors.js';

/**
 * Abstract contract for an inventory repository. Consumers code against this
 * type; implementers extend it and override every method. Calling an
 * un-overridden method throws NotImplementedError so tests fail loudly.
 */
export class InventoryRepository {
  // ----- CRUD -----

  /**
   * @param {import('./inventoryItem.js').InventoryItem} item
   * @returns {import('./inventoryItem.js').InventoryItem} the stored item
   */
  add(item) { throw new NotImplementedError('add'); }

  /**
   * @param {string} id
   * @param {Partial<import('./inventoryItem.js').InventoryItem>} changes
   * @returns {import('./inventoryItem.js').InventoryItem} the updated item
   */
  update(id, changes) { throw new NotImplementedError('update'); }

  /**
   * @param {string} id
   * @returns {void}
   */
  remove(id) { throw new NotImplementedError('remove'); }

  /**
   * @param {string} id
   * @returns {import('./inventoryItem.js').InventoryItem}
   */
  getById(id) { throw new NotImplementedError('getById'); }

  /**
   * @returns {import('./inventoryItem.js').InventoryItem[]}
   */
  listAll() { throw new NotImplementedError('listAll'); }

  // ----- Queries & checks -----

  /**
   * @param {string} id
   * @param {number} qty
   * @returns {boolean}
   */
  isAvailable(id, qty) { throw new NotImplementedError('isAvailable'); }

  /**
   * @returns {import('./inventoryItem.js').InventoryItem[]} items at or below reorderLevel
   */
  findLowStock() { throw new NotImplementedError('findLowStock'); }

  /**
   * @param {{category?: string, location?: string, text?: string}} criteria
   * @returns {import('./inventoryItem.js').InventoryItem[]}
   */
  search(criteria) { throw new NotImplementedError('search'); }
}
