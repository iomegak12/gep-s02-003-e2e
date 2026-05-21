// @ts-check
const { expect } = require('@playwright/test');
const { gotoPath, clickLocator, fillLocator, pressKey, pause } = require('./actions');

/**
 * Logs into the application at /login using email + password.
 * Uses role-based selectors (matches the actual accessible names on the page).
 */
async function login(page, { username, password }) {
  await gotoPath(page, '/login');

  const emailBox = page.getByRole('textbox', { name: 'Email' });
  const passwordBox = page.getByRole('textbox', { name: /Password/i });
  const submit = page.getByRole('button', { name: /^Log in$/i });

  await clickLocator(page, emailBox);
  await fillLocator(page, emailBox, username);
  await pressKey(page, emailBox, 'Tab');
  await fillLocator(page, passwordBox, password);
  await clickLocator(page, submit);

  // After login the app redirects away from /login into the AppShell.
  await expect(page).not.toHaveURL(/\/login(\?|$)/, { timeout: 15_000 });
  await pause(page);
}

/**
 * Logs the current user out via the avatar (top-bar user menu).
 * The trigger button's accessible name is the user's initials (e.g. "AD", "BU").
 */
async function logout(page) {
  // The trigger is a <button> rendered inside .usermenu — use that container
  // to avoid clashing with other initials-like buttons on the page.
  const trigger = page.locator('.usermenu__trigger');
  await clickLocator(page, trigger);

  const logoutItem = page.getByRole('menuitem', { name: /Logout/i });
  await clickLocator(page, logoutItem);

  await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 15_000 });
}

/**
 * Clicks a sidebar nav link by its visible label (exact match).
 */
async function navigateVia(page, linkLabel) {
  const link = page.getByRole('link', { name: linkLabel, exact: true });
  await clickLocator(page, link);
}

/**
 * Performs a search on a list page by filling the search input and pressing
 * Enter (Q5 = press ENTER explicitly even though live-filter is on).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string|RegExp} placeholder  accessible name of the search textbox
 * @param {string} query
 */
async function searchList(page, placeholder, query) {
  const box = page.getByRole('textbox', { name: placeholder });
  await clickLocator(page, box);
  await fillLocator(page, box, query);
  await pressKey(page, box, 'Enter');
  await pause(page);
}

module.exports = { login, logout, navigateVia, searchList };
