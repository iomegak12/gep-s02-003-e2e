// @ts-check
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.tests') });

const { test, expect } = require('@playwright/test');
const { loadUsers } = require('../helpers/dataLoader');
const { login, logout } = require('../helpers/flows');

const users = loadUsers();

test.describe('Authentication — login & logout (data-driven)', () => {
  for (const u of users) {
    test(`[${u.role}] ${u.username} can log in and log out`, async ({ page }) => {
      await login(page, u);

      // Confirm a logged-in shell is visible (sidebar nav or user menu trigger).
      await expect(page.locator('.usermenu__trigger')).toBeVisible();

      await logout(page);
      await expect(page).toHaveURL(/\/login(\?|$)/);
    });
  }
});
