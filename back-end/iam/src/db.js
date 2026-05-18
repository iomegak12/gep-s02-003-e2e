const { Pool, Client } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureDatabase() {
  const target = new URL(process.env.DATABASE_URL);
  const dbName = target.pathname.replace(/^\//, '');
  const adminUrl = new URL(process.env.DATABASE_URL);
  adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (!rows.length) {
      await admin.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[iam] created database ${dbName}`);
    }
  } finally {
    await admin.end();
  }
}

async function migrate() {
  await ensureDatabase();
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    await pool.query(sql);
    console.log(`[iam] applied migration ${f}`);
  }
}

module.exports = { pool, migrate };
