// @ts-check
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.tests') });

const { test, expect } = require('@playwright/test');
const { loadUsers } = require('../helpers/dataLoader');
const { login, logout, navigateVia, searchList } = require('../helpers/flows');
const { clickLocator, pause } = require('../helpers/actions');

const users = loadUsers();
const SEARCH_QUERY = process.env.SUPPLIER_SEARCH_QUERY || 'EuroTrans';
const EXPECTED_NAME = process.env.SUPPLIER_EXPECTED_NAME || 'EuroTrans Logistics';

test.describe('Suppliers — search & view detail (data-driven)', () => {
  for (const u of users) {
    test(`[${u.role}] ${u.username} can find "${SEARCH_QUERY}" and see ${EXPECTED_NAME}`, async ({ page }) => {
      await login(page, u);

      // Navigate through the sidebar (more realistic than direct URL).
      await navigateVia(page, 'Suppliers');
      await expect(page.getByRole('heading', { name: /^Suppliers$/ })).toBeVisible();

      // Search input's accessible name comes from its placeholder
      // ("Search suppliers…" — note the ellipsis character).
      await searchList(page, /Search suppliers/i, SEARCH_QUERY);

      // The result can render as a card-button (card/kanban view) or as a
      // table row (table view) depending on the user's persisted preference.
      // Match whichever element contains the search term and is clickable.
      const result = page
        .locator('button, tr', { hasText: SEARCH_QUERY })
        .first();
      await expect(result).toBeVisible({ timeout: 15_000 });
      await clickLocator(page, result);

      // Detail page — the display name appears as the page heading.
      await expect(page).toHaveURL(/\/suppliers\/[^/]+$/);
      await expect(page.getByRole('heading', { name: EXPECTED_NAME })).toBeVisible();
      await pause(page);

      await logout(page);
    });
  }
});
