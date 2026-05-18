const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { pool, migrate } = require('./db');
const routes = require('./routes');
const { correlation, errorHandler } = require('./middleware');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./openapi');

async function ensureBootstrapAdmin() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) return;
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (rows.length) return;
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (email, full_name, password_hash, roles) VALUES ($1, $2, $3, $4)`,
    [email, 'Bootstrap Admin', hash, ['ADMIN']],
  );
  console.log(`[iam] bootstrapped admin ${email}`);
}

const PORT = parseInt(process.env.PORT || '3001', 10);
const origins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

async function main() {
  await migrate();
  await ensureBootstrapAdmin();

  const app = express();
  app.use(cors({ origin: origins.length ? origins : true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(correlation);

  app.get('/health', async (req, res) => {
    try { await pool.query('SELECT 1'); res.json({ ok: true }); }
    catch { res.status(503).json({ ok: false }); }
  });

  // OpenAPI / Swagger UI
  app.get('/api/v1/openapi.json', (_req, res) => res.json(openapiSpec));
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'GEP-SCM Auth Service · API Docs',
  }));

  app.use('/api/v1', routes);
  app.use(errorHandler);

  app.listen(PORT, () => console.log(`[iam] listening on :${PORT}`));
}

main().catch(e => { console.error('[iam] fatal', e); process.exit(1); });
