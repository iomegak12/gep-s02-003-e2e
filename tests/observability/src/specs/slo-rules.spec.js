const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { env } = require('../helpers/env');

const RULES_FILE = path.resolve(
  __dirname, '..', '..', '..', '..',
  'back-end', 'observability', 'prometheus-rules.yml',
);
const RULES_TESTS_FILE = path.resolve(
  __dirname, '..', '..', '..', '..',
  'back-end', 'observability', 'prometheus-rules-tests.yml',
);

/**
 * Verifies:
 *   1. prometheus-rules.yml exists and is syntactically valid (promtool check rules)
 *   2. promtool test rules passes for the recording-rule unit tests
 *   3. Prometheus has loaded the rules at runtime (/api/v1/rules)
 *
 * If `promtool` is not on PATH the unit-level tests are skipped (with a clear note).
 */
function promtoolAvailable() {
  try {
    execSync('promtool --version', { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

describe('SLO recording rules', () => {
  test('prometheus-rules.yml file exists', () => {
    expect(fs.existsSync(RULES_FILE)).toBe(true);
  });

  test('promtool check rules passes', () => {
    if (!promtoolAvailable()) { console.warn('promtool not on PATH — skipping'); return; }
    expect(() => execSync(`promtool check rules "${RULES_FILE}"`, { stdio: 'pipe' })).not.toThrow();
  });

  test('promtool test rules passes', () => {
    if (!promtoolAvailable()) { console.warn('promtool not on PATH — skipping'); return; }
    if (!fs.existsSync(RULES_TESTS_FILE)) {
      throw new Error(`Missing rule unit tests file: ${RULES_TESTS_FILE}`);
    }
    expect(() => execSync(
      `promtool test rules "${RULES_TESTS_FILE}"`,
      { stdio: 'pipe' },
    )).not.toThrow();
  });

  test('Prometheus loaded the SLO recording rules at runtime', async () => {
    const res = await axios.get(`${env.prometheusUrl}/api/v1/rules`, {
      timeout: 5000, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    const groups = res.data?.data?.groups || [];
    const allRules = groups.flatMap(g => g.rules || []);
    const names = allRules.map(r => r.name);
    expect(names).toEqual(expect.arrayContaining([
      'slo:po_approval_latency:p99_5m',
      'slo:http_error_ratio:5m',
    ]));
  });
});
