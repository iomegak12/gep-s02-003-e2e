// @ts-check
'use strict';

/**
 * Reusable flows driven by the CLI. Q3 = A, E, F:
 *   1. login as admin
 *   2. search / filter suppliers
 *   3. visit dashboards / analytics pages
 *
 * Selectors mirror the existing tests/ui/helpers/flows.js so behaviour
 * stays consistent with the Playwright spec suite.
 */

async function login(page, env, log) {
  log('navigating to /login');
  await page.goto(`${env.baseUrl}/login`, { waitUntil: 'domcontentloaded' });

  const emailBox = page.getByRole('textbox', { name: 'Email' });
  const passwordBox = page.getByRole('textbox', { name: /Password/i });
  const submit = page.getByRole('button', { name: /^Log in$/i });

  await emailBox.click();
  await emailBox.fill(env.adminEmail);
  await passwordBox.fill(env.password);
  await submit.click();

  // Redirected away from /login.
  await page.waitForURL((u) => !/\/login(\?|$)/.test(String(u)), { timeout: 15_000 });
  log('login ok →', page.url());
}

async function searchSuppliers(page, log) {
  log('navigating to /suppliers');
  // Use direct URL — sidebar link names vary between releases.
  await page.goto((new URL('/suppliers', page.url())).toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Find a search input; fall back to any textbox if naming differs.
  const candidates = [
    page.getByRole('textbox', { name: /search/i }),
    page.getByPlaceholder(/search/i),
    page.locator('input[type="search"]').first(),
    page.locator('input[type="text"]').first(),
  ];
  let box = null;
  for (const c of candidates) {
    if (await c.count() > 0) { box = c.first(); break; }
  }
  if (!box) { log('no search input found — skipping search step'); return; }

  await box.click();
  await box.fill('Acme');
  await page.keyboard.press('Enter');
  await page.waitForLoadState('networkidle');
  log('supplier search submitted');
}

async function visitDashboards(page, log) {
  // Try a few common analytics routes — first one that responds 200 wins.
  const paths = ['/dashboard', '/analytics', '/reports', '/'];
  for (const p of paths) {
    const url = (new URL(p, page.url())).toString();
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => null);
    if (resp && resp.ok()) {
      log('visited', p, '→', resp.status());
      await page.waitForLoadState('networkidle').catch(() => {});
      // Give the page ~2s so client-side widgets (charts/tables) issue API calls
      // → useful for downstream RUM/trace assertions.
      await page.waitForTimeout(2000);
      return;
    }
  }
  log('no dashboard route returned 200 — continuing');
}

async function runSmoke(page, env, log) {
  await login(page, env, log);
  await searchSuppliers(page, log);
  await visitDashboards(page, log);
}

module.exports = { login, searchSuppliers, visitDashboards, runSmoke };
