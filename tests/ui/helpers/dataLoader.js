// @ts-check
const fs = require('fs');
const path = require('path');

/**
 * Load pipe-delimited test users from the file configured via TEST_DATA_FILE
 * in .env.tests. Lines beginning with '#' and blank lines are ignored.
 *
 * Format per line: username|password|role
 *
 * @returns {{username: string, password: string, role: string}[]}
 */
function loadUsers() {
  const file = process.env.TEST_DATA_FILE || './data.txt';
  const abs = path.isAbsolute(file) ? file : path.resolve(__dirname, '..', file);
  const raw = fs.readFileSync(abs, 'utf8');

  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
    .map((line) => {
      const [username, password, role] = line.split('|').map((s) => (s || '').trim());
      if (!username || !password) {
        throw new Error(`Invalid data row in ${abs}: "${line}"`);
      }
      return { username, password, role: role || 'user' };
    });
}

module.exports = { loadUsers };
