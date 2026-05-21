#!/usr/bin/env node
/**
 * GEP-003 UI CLI driver.
 *
 *   node src/scripts/cli.js smoke
 *   node src/scripts/cli.js observability
 *   node src/scripts/cli.js load --iterations 20 --concurrency 3
 *
 * Or via npm:
 *   npm run ui:smoke
 *   npm run ui:observability
 *   npm run ui:load
 *
 * Headless Chromium, single-process. Exits non-zero on the first failure.
 *
 *   Flows exercised (Q3 = A, E, F):
 *     - login as admin
 *     - search / filter suppliers
 *     - visit dashboards / analytics pages
 *
 *   The "observability" subcommand additionally asserts that traces,
 *   logs and RUM metrics for the just-driven session reached
 *   Tempo / Loki / Prometheus.
 */

'use strict';

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.tests') });

const { chromium } = require('@playwright/test');
const { runSmoke } = require('./flows');
const { assertObservability } = require('./observability');

// ---------- argv parsing ----------
function parseArgs(argv) {
  const subcommand = argv[2];
  const flags = {};
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) { flags[key] = true; }
      else { flags[key] = next; i++; }
    }
  }
  return { subcommand, flags };
}

const env = {
  baseUrl:      process.env.WEB_BASE_URL    || 'http://localhost:8080',
  adminEmail:   process.env.ADMIN_EMAIL     || 'admin@demo.local',
  password:     process.env.SEED_PASSWORD   || 'Passw0rd!',
  prometheus:   process.env.PROMETHEUS_URL  || 'http://localhost:9090',
  loki:         process.env.LOKI_URL        || 'http://localhost:3100',
  tempo:        process.env.TEMPO_URL       || 'http://localhost:3200',
};

function log(...m)  { console.log('[ui-cli]', ...m); }
function fail(...m) { console.error('[ui-cli][FAIL]', ...m); process.exit(1); }

async function withBrowser(fn) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 800 } });
    const page = await context.newPage();
    page.on('pageerror', err => log('pageerror:', err.message));
    await fn(page);
  } finally {
    await browser.close();
  }
}

// ---------- subcommands ----------
async function cmdSmoke() {
  log('subcommand=smoke base=', env.baseUrl);
  const t0 = Date.now();
  await withBrowser(async (page) => {
    await runSmoke(page, env, log);
  });
  log(`smoke OK in ${Date.now() - t0}ms`);
}

async function cmdObservability() {
  log('subcommand=observability base=', env.baseUrl);
  const t0 = Date.now();
  await withBrowser(async (page) => {
    await runSmoke(page, env, log);
  });
  // Give the OTel pipeline a moment to flush to Tempo/Loki/Prom.
  log('waiting 8s for backends to ingest…');
  await new Promise(r => setTimeout(r, 8000));
  await assertObservability(env, log);
  log(`observability OK in ${Date.now() - t0}ms`);
}

async function cmdLoad({ iterations = 10, concurrency = 1 } = {}) {
  const N = Number(iterations), C = Math.max(1, Number(concurrency));
  log(`subcommand=load iterations=${N} concurrency=${C} base=${env.baseUrl}`);
  let done = 0, failed = 0;
  const worker = async (wid) => {
    while (done + failed < N) {
      const myIdx = ++done;
      if (myIdx > N) { done--; break; }
      try {
        await withBrowser(async (page) => { await runSmoke(page, env, () => {}); });
        log(`worker=${wid} iter=${myIdx}/${N} ok`);
      } catch (e) {
        failed++;
        // Q9 = A: bail on first failure.
        fail(`worker=${wid} iter=${myIdx} failed: ${e.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: C }, (_, i) => worker(i + 1)));
  log(`load complete: ok=${done - failed} failed=${failed}`);
}

// ---------- dispatch ----------
(async () => {
  const { subcommand, flags } = parseArgs(process.argv);
  try {
    switch (subcommand) {
      case 'smoke':         await cmdSmoke(); break;
      case 'observability': await cmdObservability(); break;
      case 'load':          await cmdLoad(flags); break;
      default:
        console.error(`Usage: cli.js <smoke|observability|load> [--iterations N] [--concurrency N]`);
        process.exit(2);
    }
  } catch (e) {
    fail(e.stack || e.message);
  }
})();
