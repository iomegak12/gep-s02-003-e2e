// @ts-check
const path = require('path');
const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config({ path: path.resolve(__dirname, '.env.tests') });

const BASE_URL = process.env.WEB_BASE_URL || 'http://localhost:8080';
const isCI = !!process.env.CI;

module.exports = defineConfig({
  testDir: './specs',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: BASE_URL,
    headless: isCI ? true : false,
    viewport: { width: 1366, height: 800 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
