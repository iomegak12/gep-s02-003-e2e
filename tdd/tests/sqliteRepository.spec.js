import fs from 'node:fs';

import { SqliteInventoryRepository } from '../src/index.js';
import { runInventoryContractTests } from './contract.spec.js';

const TEST_DB_PATH = process.env.INVENTORY_DB_PATH;

function removeTestDatabaseFiles() {
  if (!TEST_DB_PATH || TEST_DB_PATH === ':memory:') return;
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    const f = TEST_DB_PATH + suffix;
    if (fs.existsSync(f)) fs.rmSync(f, { force: true });
  }
}

describe('SqliteInventoryRepository — environment wiring', () => {
  test('loads INVENTORY_DB_PATH from .env.test', () => {
    expect(TEST_DB_PATH).toBe('./data/test/inventory.test.db');
  });
});

// One database file is created for the whole suite and removed at the end.
// Between tests we just truncate the table so each test sees an empty store.
let sharedRepo;

beforeAll(() => {
  removeTestDatabaseFiles();
  sharedRepo = new SqliteInventoryRepository();
});

afterAll(() => {
  if (sharedRepo) sharedRepo.close();
  removeTestDatabaseFiles();
});

beforeEach(() => {
  sharedRepo._db.exec('DELETE FROM inventory_items');
});

runInventoryContractTests(() => sharedRepo, 'SqliteInventoryRepository (file-backed)');
