import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';

import { InventoryRepository } from '../contracts/inventoryRepository.js';
import { validateInventoryItem } from '../contracts/inventoryItem.js';
import {
  ItemNotFoundError,
  DuplicateItemError,
  ValidationError,
} from '../contracts/errors.js';

const DEFAULT_DB_PATH = './data/inventory.db';

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS inventory_items (
    id            TEXT PRIMARY KEY,
    sku           TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    quantity      REAL NOT NULL,
    unit          TEXT NOT NULL,
    reorder_level REAL NOT NULL,
    unit_cost     REAL NOT NULL,
    sale_price    REAL NOT NULL,
    currency      TEXT NOT NULL,
    location      TEXT NOT NULL,
    category      TEXT NOT NULL,
    supplier      TEXT
  );
`;

function rowToItem(row) {
  if (!row) return null;
  const item = {
    id: row.id,
    sku: row.sku,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    reorderLevel: row.reorder_level,
    unitCost: row.unit_cost,
    salePrice: row.sale_price,
    currency: row.currency,
    location: row.location,
    category: row.category,
  };
  if (row.supplier != null) item.supplier = row.supplier;
  return item;
}

function itemToParams(item) {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    reorder_level: item.reorderLevel,
    unit_cost: item.unitCost,
    sale_price: item.salePrice,
    currency: item.currency,
    location: item.location,
    category: item.category,
    supplier: item.supplier ?? null,
  };
}

function mapUniqueViolation(err, item) {
  if (err && err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    return new DuplicateItemError('id', item.id);
  }
  if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    const msg = String(err.message || '');
    if (msg.includes('inventory_items.sku')) return new DuplicateItemError('sku', item.sku);
    if (msg.includes('inventory_items.id'))  return new DuplicateItemError('id',  item.id);
  }
  return null;
}

export class SqliteInventoryRepository extends InventoryRepository {
  /**
   * @param {string} [dbPath]  Overrides INVENTORY_DB_PATH and the default.
   */
  constructor(dbPath) {
    super();

    const resolved = dbPath ?? process.env.INVENTORY_DB_PATH ?? DEFAULT_DB_PATH;
    if (resolved !== ':memory:') {
      const dir = path.dirname(resolved);
      if (dir && dir !== '.' && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this._db = new Database(resolved);
    this._db.pragma('journal_mode = WAL');
    this._db.pragma('foreign_keys = ON');
    this._db.exec(CREATE_TABLE_SQL);

    this._stmts = {
      insert: this._db.prepare(`
        INSERT INTO inventory_items
          (id, sku, name, quantity, unit, reorder_level, unit_cost, sale_price, currency, location, category, supplier)
        VALUES
          (@id, @sku, @name, @quantity, @unit, @reorder_level, @unit_cost, @sale_price, @currency, @location, @category, @supplier)
      `),
      updateAll: this._db.prepare(`
        UPDATE inventory_items SET
          sku = @sku, name = @name, quantity = @quantity, unit = @unit,
          reorder_level = @reorder_level, unit_cost = @unit_cost, sale_price = @sale_price,
          currency = @currency, location = @location, category = @category, supplier = @supplier
        WHERE id = @id
      `),
      deleteById: this._db.prepare(`DELETE FROM inventory_items WHERE id = ?`),
      getById:    this._db.prepare(`SELECT * FROM inventory_items WHERE id = ?`),
      listAll:    this._db.prepare(`SELECT * FROM inventory_items`),
      lowStock:   this._db.prepare(`SELECT * FROM inventory_items WHERE quantity <= reorder_level`),
    };
  }

  close() {
    if (this._db && this._db.open) this._db.close();
  }

  // ----- CRUD -----

  add(item) {
    validateInventoryItem(item);
    try {
      this._stmts.insert.run(itemToParams(item));
    } catch (err) {
      const mapped = mapUniqueViolation(err, item);
      if (mapped) throw mapped;
      throw err;
    }
    return rowToItem(this._stmts.getById.get(item.id));
  }

  update(id, changes) {
    if (typeof id !== 'string' || id.length === 0) {
      throw new ValidationError('id must be a non-empty string');
    }
    const current = this._stmts.getById.get(id);
    if (!current) throw new ItemNotFoundError(id);

    const merged = { ...rowToItem(current), ...changes, id };
    validateInventoryItem(merged);

    try {
      this._stmts.updateAll.run(itemToParams(merged));
    } catch (err) {
      const mapped = mapUniqueViolation(err, merged);
      if (mapped) throw mapped;
      throw err;
    }
    return rowToItem(this._stmts.getById.get(id));
  }

  remove(id) {
    const info = this._stmts.deleteById.run(id);
    if (info.changes === 0) throw new ItemNotFoundError(id);
  }

  getById(id) {
    const row = this._stmts.getById.get(id);
    if (!row) throw new ItemNotFoundError(id);
    return rowToItem(row);
  }

  listAll() {
    return this._stmts.listAll.all().map(rowToItem);
  }

  // ----- Queries & checks -----

  isAvailable(id, qty) {
    const row = this._stmts.getById.get(id);
    if (!row) throw new ItemNotFoundError(id);
    return row.quantity >= qty;
  }

  findLowStock() {
    return this._stmts.lowStock.all().map(rowToItem);
  }

  search(criteria = {}) {
    const { category, location, text } = criteria;
    const clauses = [];
    const params = {};
    if (category) { clauses.push('category = @category'); params.category = category; }
    if (location) { clauses.push('location = @location'); params.location = location; }
    if (text) {
      clauses.push('(LOWER(name) LIKE @text OR LOWER(sku) LIKE @text)');
      params.text = `%${String(text).toLowerCase()}%`;
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `SELECT * FROM inventory_items ${where}`;
    return this._db.prepare(sql).all(params).map(rowToItem);
  }
}
