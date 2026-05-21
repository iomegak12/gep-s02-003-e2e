// @ts-check
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.tests') });

const { test, expect } = require('@playwright/test');
const { loadUsers } = require('../helpers/dataLoader');
const { login, logout, navigateVia } = require('../helpers/flows');
const { clickLocator, fillLocator, pressKey, pause } = require('../helpers/actions');

const users = loadUsers();
const SEARCH_QUERY = process.env.PO_SEARCH_QUERY || 'PO-2026-00061';
const EXPECTED_PO = process.env.PO_EXPECTED_NUMBER || 'PO-2026-00061';
const EXPECTED_SUPPLIER = process.env.PO_EXPECTED_SUPPLIER || 'EuroTrans Logistics';

test.describe('Purchase Orders — search & view detail (data-driven)', () => {
  for (const u of users) {
    test(`[${u.role}] ${u.username} can find ${EXPECTED_PO} and see ${EXPECTED_SUPPLIER}`, async ({ page }) => {
      await login(page, u);

      // Sidebar → Purchase orders (matches recorded test-2.spec.ts)
      await navigateVia(page, 'Purchase orders');
      await expect(page.getByRole('heading', { name: /Purchase orders/i })).toBeVisible();

      // Recorded flow performed a UI button click here before searching
      // (likely a view-switcher toggle). Mirror it best-effort: try to ensure
      // we are in a view that renders POs as clickable buttons (kanban/card).
      // If the 5th button (index 4) exists at header level (view switcher),
      // click it the same way the recording did — but tolerate its absence.
      const headerButtons = page.locator('header button, .po-list__header button');
      const targetSwitcher = headerButtons.nth(4);
      if (await targetSwitcher.isVisible().catch(() => false)) {
        await clickLocator(page, targetSwitcher);
        await pause(page);
      }

      // Search textbox — accessible name from the recorded flow.
      const searchBox = page.getByRole('textbox', { name: 'Search by PO number, notes,' });
      await clickLocator(page, searchBox);
      await fillLocator(page, searchBox, SEARCH_QUERY);
      await pressKey(page, searchBox, 'Enter');
      await pause(page);

      // Result card-button starts with the PO number, e.g.
      // "PO-2026-00061 EuroTrans Logistics …".
      const resultButton = page
        .getByRole('button', { name: new RegExp(`^${EXPECTED_PO}\\b`) })
        .first();
      await expect(resultButton).toBeVisible({ timeout: 15_000 });
      await clickLocator(page, resultButton);

      // Detail page assertions (recorded clicked the PO# text and supplier heading).
      await expect(page).toHaveURL(/\/purchase-orders\/[^/]+$/);
      await expect(page.getByText(EXPECTED_PO, { exact: false }).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: EXPECTED_SUPPLIER })).toBeVisible();
      await pause(page);

      await logout(page);
    });
  }
});
