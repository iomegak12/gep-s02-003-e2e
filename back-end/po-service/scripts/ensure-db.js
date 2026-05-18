const { Client } = require('pg');

async function main() {
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
      console.log(`[po-service] created database ${dbName}`);
    } else {
      console.log(`[po-service] database ${dbName} already exists`);
    }
  } finally {
    await admin.end();
  }
}

main().catch(e => { console.error('[po-service] ensure-db failed', e); process.exit(1); });
