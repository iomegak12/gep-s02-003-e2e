# Plan: Inventory Library Contract (TDD-ready, Node.js / ESM / Jest)

## Context
Ramkumar is starting a new inventory-management library and wants to follow TDD.
Before any implementation or test is written, he needs a **contract** that:

1. Describes the **shape of an inventory item** (common properties).
2. Describes the **operations** consumers of the library can perform.
3. Defines a stable **error vocabulary** so tests can assert on specific failure modes.

This contract becomes the single source of truth that:
- **Developers** subclass / implement (in-memory first, then DB-backed later).
- **Testers** write Jest specs against — every implementation must satisfy the same suite.

The working directory `c:\000 - GEP - S02 - 003\gep-003-e2e\tdd` currently contains only a `docs` folder, so this is a greenfield scaffold.

## Decisions (locked in with user)
| Aspect | Choice |
|---|---|
| Language / Runtime | JavaScript on Node.js |
| Module system | ESM (`import` / `export`) |
| Test framework | Jest (`jest` with `--experimental-vm-modules` for ESM) |
| Method style | **Synchronous** (return values, not Promises) |
| Error style | **Custom Error classes** (thrown, not Result objects) |
| Abstraction | **Interface (JSDoc typedef) + Abstract base class** |
| Item properties | Identity, Quantity & Units, Pricing & Cost, Location & Category |
| Operations | CRUD on items + Queries / availability checks |

JavaScript has no native `interface` keyword, so the "contract" is expressed as:
- A **JSDoc `@typedef`** for the data shape (`InventoryItem`) — the property contract.
- An **abstract class** `InventoryRepository` whose methods `throw NotImplementedError` — the behavioural contract.
- A set of **named Error subclasses** — the failure contract.

---

## Proposed project layout

```
tdd/
├── package.json                       (type: "module", jest config)
├── src/
│   ├── contracts/
│   │   ├── inventoryItem.js           JSDoc typedef + factory/validator helpers
│   │   ├── inventoryRepository.js     Abstract base class (the contract)
│   │   └── errors.js                  Custom Error classes
│   └── index.js                       Public re-exports for consumers
├── tests/
│   └── contract.spec.js               Contract conformance suite (re-usable per implementation)
└── docs/                              (already present)
```

---

## 1. The data contract — `src/contracts/inventoryItem.js`

A JSDoc `@typedef` so editors / TS-in-JSDoc users get autocompletion, plus a
small `validateInventoryItem(item)` helper that throws `ValidationError`.

```js
/**
 * @typedef {Object} InventoryItem
 *
 * // Identity
 * @property {string} id          Stable unique id (UUID/ULID).
 * @property {string} sku         Human/business-readable stock-keeping unit.
 * @property {string} name        Display name.
 *
 * // Quantity & Units
 * @property {number} quantity    Current quantity on hand (>= 0).
 * @property {string} unit        Unit of measure, e.g. "pcs", "kg", "ltr".
 * @property {number} reorderLevel  Threshold under which item is "low stock".
 *
 * // Pricing & Cost
 * @property {number} unitCost    Cost per unit (>= 0).
 * @property {number} salePrice   Sale price per unit (>= 0).
 * @property {string} currency    ISO-4217 code, e.g. "INR", "USD".
 *
 * // Location & Category
 * @property {string} location    Warehouse / bin identifier.
 * @property {string} category    Category or tag.
 * @property {string} [supplier]  Optional supplier reference.
 */
```

`validateInventoryItem` enforces: required fields present, numbers non-negative,
currency is a 3-letter string, sku/name non-empty. Throws `ValidationError`.

---

## 2. The behavioural contract — `src/contracts/inventoryRepository.js`

Abstract base class. Each method throws `NotImplementedError` so any concrete
subclass that forgets to override a method fails loudly — and Jest tests can
assert that fact.

```js
export class InventoryRepository {
  // ----- CRUD -----
  /** @param {InventoryItem} item @returns {InventoryItem} */
  add(item)                 { throw new NotImplementedError('add'); }

  /** @param {string} id @param {Partial<InventoryItem>} changes @returns {InventoryItem} */
  update(id, changes)       { throw new NotImplementedError('update'); }

  /** @param {string} id @returns {void} */
  remove(id)                { throw new NotImplementedError('remove'); }

  /** @param {string} id @returns {InventoryItem} */
  getById(id)               { throw new NotImplementedError('getById'); }

  /** @returns {InventoryItem[]} */
  listAll()                 { throw new NotImplementedError('listAll'); }

  // ----- Queries & checks -----
  /** @param {string} id @param {number} qty @returns {boolean} */
  isAvailable(id, qty)      { throw new NotImplementedError('isAvailable'); }

  /** @returns {InventoryItem[]} items at/under reorderLevel */
  findLowStock()            { throw new NotImplementedError('findLowStock'); }

  /** @param {{category?:string, location?:string, text?:string}} criteria */
  search(criteria)          { throw new NotImplementedError('search'); }
}
```

**Why this method set:** matches the user's selections (CRUD + Queries/checks),
no stock-movement or transfer methods, keeping the contract minimal and TDD-friendly.

---

## 3. The error contract — `src/contracts/errors.js`

Custom Error classes give tests assertable types (`expect(fn).toThrow(ItemNotFoundError)`)
and give consumers branchable failure handling.

| Class | Thrown when |
|---|---|
| `ValidationError`     | `validateInventoryItem` fails, or `update` receives bad fields |
| `ItemNotFoundError`   | `getById` / `update` / `remove` cannot find the id |
| `DuplicateItemError`  | `add` receives an id or sku that already exists |
| `NotImplementedError` | Abstract method called on a subclass that did not override it |

Each extends `Error`, sets `this.name`, and carries a `code` string (`E_VALIDATION`,
`E_NOT_FOUND`, `E_DUPLICATE`, `E_NOT_IMPLEMENTED`) so consumers can switch on it
without depending on instanceof across module boundaries.

---

## 4. Public surface — `src/index.js`

```js
export { InventoryRepository } from './contracts/inventoryRepository.js';
export { validateInventoryItem } from './contracts/inventoryItem.js';
export {
  ValidationError, ItemNotFoundError,
  DuplicateItemError, NotImplementedError,
} from './contracts/errors.js';
```

Consumers only import from `inventory-lib` (the package); they never reach into
`contracts/*` directly.

---

## 5. Contract conformance test — `tests/contract.spec.js`

A **reusable Jest suite** parameterised by a factory:

```js
export function runInventoryContractTests(makeRepo) {
  describe('InventoryRepository contract', () => {
    test('add stores and returns the item', () => { /* ... */ });
    test('add throws DuplicateItemError on duplicate sku', () => { /* ... */ });
    test('getById throws ItemNotFoundError when missing', () => { /* ... */ });
    test('update merges changes and validates', () => { /* ... */ });
    test('remove deletes; subsequent getById throws ItemNotFoundError', () => { /* ... */ });
    test('isAvailable returns false when qty exceeds stock', () => { /* ... */ });
    test('findLowStock returns items at/under reorderLevel', () => { /* ... */ });
    test('search filters by category / location / text', () => { /* ... */ });
    test('abstract base throws NotImplementedError for every method', () => { /* ... */ });
  });
}
```

Every concrete implementation (in-memory, Mongo-backed, REST-backed, etc.)
imports and runs `runInventoryContractTests(() => new MyImpl())` — proving
it satisfies the contract.

---

## Critical files to be created

| Path | Purpose |
|---|---|
| `package.json`                          | `"type": "module"`, jest config, scripts |
| `src/contracts/inventoryItem.js`        | Typedef + `validateInventoryItem` |
| `src/contracts/inventoryRepository.js`  | Abstract base class |
| `src/contracts/errors.js`               | `ValidationError`, `ItemNotFoundError`, `DuplicateItemError`, `NotImplementedError` |
| `src/index.js`                          | Public re-exports |
| `tests/contract.spec.js`                | Reusable contract conformance suite |

No existing files to reuse — greenfield directory.

---

## Verification

1. `npm install` (installs `jest` as dev-dep).
2. `npm test` should:
   - Load the ESM Jest config.
   - Run the contract spec against a tiny throwaway in-memory stub created
     inside the test file (proves the suite itself is correct).
   - Confirm the abstract base throws `NotImplementedError` for every method.
3. Manual sanity-check from a Node REPL:
   ```js
   import { InventoryRepository, NotImplementedError } from './src/index.js';
   const r = new InventoryRepository();
   try { r.add({}); } catch (e) { console.log(e instanceof NotImplementedError); } // true
   ```
4. Hand the repo to a developer: they create `src/impl/inMemoryRepository.js`
   extending `InventoryRepository`, re-run `runInventoryContractTests` against
   it — green suite = contract satisfied.
