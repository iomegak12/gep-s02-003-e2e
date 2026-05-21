import {
  InventoryRepository,
  validateInventoryItem,
  ValidationError,
  ItemNotFoundError,
  DuplicateItemError,
  NotImplementedError,
} from '../src/index.js';

// ---------- Sample item factory used across the suite ----------
function sampleItem(overrides = {}) {
  return {
    id: 'item-1',
    sku: 'SKU-001',
    name: 'Widget',
    quantity: 10,
    unit: 'pcs',
    reorderLevel: 5,
    unitCost: 50,
    salePrice: 80,
    currency: 'INR',
    location: 'WH-A/B1',
    category: 'gadgets',
    ...overrides,
  };
}

// ---------- Throwaway in-memory implementation ----------
// Lives inside the test file ONLY to prove the contract suite itself is correct.
// Real implementations live outside this file and call runInventoryContractTests.
class InMemoryInventoryRepository extends InventoryRepository {
  constructor() {
    super();
    this._byId = new Map();
  }

  _ensure(id) {
    if (!this._byId.has(id)) throw new ItemNotFoundError(id);
    return this._byId.get(id);
  }

  add(item) {
    validateInventoryItem(item);
    if (this._byId.has(item.id)) throw new DuplicateItemError('id', item.id);
    for (const existing of this._byId.values()) {
      if (existing.sku === item.sku) throw new DuplicateItemError('sku', item.sku);
    }
    const stored = { ...item };
    this._byId.set(item.id, stored);
    return { ...stored };
  }

  update(id, changes) {
    const current = this._ensure(id);
    const next = { ...current, ...changes, id: current.id };
    validateInventoryItem(next);
    this._byId.set(id, next);
    return { ...next };
  }

  remove(id) {
    this._ensure(id);
    this._byId.delete(id);
  }

  getById(id) {
    return { ...this._ensure(id) };
  }

  listAll() {
    return [...this._byId.values()].map((i) => ({ ...i }));
  }

  isAvailable(id, qty) {
    const it = this._ensure(id);
    return it.quantity >= qty;
  }

  findLowStock() {
    return this.listAll().filter((i) => i.quantity <= i.reorderLevel);
  }

  search({ category, location, text } = {}) {
    return this.listAll().filter((i) => {
      if (category && i.category !== category) return false;
      if (location && i.location !== location) return false;
      if (text) {
        const hay = `${i.name} ${i.sku}`.toLowerCase();
        if (!hay.includes(text.toLowerCase())) return false;
      }
      return true;
    });
  }
}

// ---------- Reusable contract conformance suite ----------
export function runInventoryContractTests(makeRepo, label = 'implementation') {
  describe(`InventoryRepository contract — ${label}`, () => {
    let repo;
    beforeEach(() => { repo = makeRepo(); });

    test('add stores and returns the item', () => {
      const stored = repo.add(sampleItem());
      expect(stored).toMatchObject({ id: 'item-1', sku: 'SKU-001' });
      expect(repo.getById('item-1')).toMatchObject({ name: 'Widget' });
    });

    test('add throws ValidationError on bad input', () => {
      expect(() => repo.add(sampleItem({ quantity: -1 }))).toThrow(ValidationError);
      expect(() => repo.add(sampleItem({ currency: 'RUPEE' }))).toThrow(ValidationError);
    });

    test('add throws DuplicateItemError on duplicate id or sku', () => {
      repo.add(sampleItem());
      expect(() => repo.add(sampleItem())).toThrow(DuplicateItemError);
      expect(() => repo.add(sampleItem({ id: 'item-2' }))).toThrow(DuplicateItemError);
    });

    test('getById throws ItemNotFoundError when missing', () => {
      expect(() => repo.getById('nope')).toThrow(ItemNotFoundError);
    });

    test('update merges changes and re-validates', () => {
      repo.add(sampleItem());
      const updated = repo.update('item-1', { quantity: 3 });
      expect(updated.quantity).toBe(3);
      expect(() => repo.update('item-1', { quantity: -5 })).toThrow(ValidationError);
      expect(() => repo.update('missing', { quantity: 1 })).toThrow(ItemNotFoundError);
    });

    test('remove deletes; subsequent getById throws ItemNotFoundError', () => {
      repo.add(sampleItem());
      repo.remove('item-1');
      expect(() => repo.getById('item-1')).toThrow(ItemNotFoundError);
      expect(() => repo.remove('item-1')).toThrow(ItemNotFoundError);
    });

    test('listAll returns all stored items', () => {
      repo.add(sampleItem());
      repo.add(sampleItem({ id: 'item-2', sku: 'SKU-002' }));
      expect(repo.listAll()).toHaveLength(2);
    });

    test('isAvailable reflects on-hand quantity', () => {
      repo.add(sampleItem({ quantity: 10 }));
      expect(repo.isAvailable('item-1', 10)).toBe(true);
      expect(repo.isAvailable('item-1', 11)).toBe(false);
    });

    test('findLowStock returns items at or under reorderLevel', () => {
      repo.add(sampleItem({ id: 'a', sku: 'A', quantity: 2, reorderLevel: 5 }));
      repo.add(sampleItem({ id: 'b', sku: 'B', quantity: 9, reorderLevel: 5 }));
      const low = repo.findLowStock();
      expect(low.map((i) => i.id)).toEqual(['a']);
    });

    test('search filters by category, location, and text', () => {
      repo.add(sampleItem({ id: 'a', sku: 'A-1', name: 'Red Widget',  category: 'gadgets', location: 'WH-A' }));
      repo.add(sampleItem({ id: 'b', sku: 'B-1', name: 'Blue Gizmo',  category: 'gizmos',  location: 'WH-A' }));
      repo.add(sampleItem({ id: 'c', sku: 'C-1', name: 'Red Gizmo',   category: 'gizmos',  location: 'WH-B' }));

      expect(repo.search({ category: 'gizmos' }).map((i) => i.id).sort()).toEqual(['b', 'c']);
      expect(repo.search({ location: 'WH-A' }).map((i) => i.id).sort()).toEqual(['a', 'b']);
      expect(repo.search({ text: 'red'    }).map((i) => i.id).sort()).toEqual(['a', 'c']);
    });
  });
}

// ---------- Run the suite against the in-memory stub ----------
runInventoryContractTests(() => new InMemoryInventoryRepository(), 'InMemoryInventoryRepository');

// ---------- Abstract base & validator: contract-level guarantees ----------
describe('InventoryRepository abstract base', () => {
  const methods = ['add', 'update', 'remove', 'getById', 'listAll', 'isAvailable', 'findLowStock', 'search'];

  test.each(methods)('%s() throws NotImplementedError on the base class', (method) => {
    const base = new InventoryRepository();
    expect(() => base[method]()).toThrow(NotImplementedError);
  });
});

describe('validateInventoryItem', () => {
  test('accepts a well-formed item', () => {
    expect(() => validateInventoryItem(sampleItem())).not.toThrow();
  });

  test('rejects missing required strings', () => {
    expect(() => validateInventoryItem(sampleItem({ sku: '' }))).toThrow(ValidationError);
    expect(() => validateInventoryItem(sampleItem({ name: '   ' }))).toThrow(ValidationError);
  });

  test('rejects negative or non-finite numbers', () => {
    expect(() => validateInventoryItem(sampleItem({ unitCost: -1 }))).toThrow(ValidationError);
    expect(() => validateInventoryItem(sampleItem({ quantity: Infinity }))).toThrow(ValidationError);
  });

  test('rejects bad currency', () => {
    expect(() => validateInventoryItem(sampleItem({ currency: 'RUPEE' }))).toThrow(ValidationError);
  });
});
