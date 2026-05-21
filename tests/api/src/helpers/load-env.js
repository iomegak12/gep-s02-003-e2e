// Loads the shared test env file used by both UI (Playwright) and API (Jest) tests.
// Path: tests/ui/.env.tests (kept in the UI folder per project layout, but shared).
const path = require('path');
const dotenv = require('dotenv');

const sharedEnvPath = path.resolve(__dirname, '..', '..', '..', 'ui', '.env.tests');
dotenv.config({ path: sharedEnvPath });
