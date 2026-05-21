// @ts-check
/**
 * Action helpers that wrap Playwright interactions with a randomized
 * pre-action delay (default 300–1000 ms) to give the back-end time to
 * complete data fetches. Range is configurable via .env.tests:
 *   UI_ACTION_DELAY_MIN_MS, UI_ACTION_DELAY_MAX_MS
 */

const MIN_MS = Number(process.env.UI_ACTION_DELAY_MIN_MS || 300);
const MAX_MS = Number(process.env.UI_ACTION_DELAY_MAX_MS || 1000);

function randomDelayMs() {
  const lo = Math.max(0, Math.min(MIN_MS, MAX_MS));
  const hi = Math.max(MIN_MS, MAX_MS);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

async function pause(page) {
  await page.waitForTimeout(randomDelayMs());
}

async function gotoPath(page, urlOrPath) {
  await pause(page);
  await page.goto(urlOrPath);
}

async function clickLocator(page, locator) {
  await pause(page);
  await locator.click();
}

async function fillLocator(page, locator, value) {
  await pause(page);
  await locator.fill(value);
}

async function pressKey(page, locator, key) {
  await pause(page);
  await locator.press(key);
}

module.exports = {
  pause,
  gotoPath,
  clickLocator,
  fillLocator,
  pressKey,
  randomDelayMs
};
