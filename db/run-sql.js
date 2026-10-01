// Runs a .sql file against DATABASE_URL using the real Postgres protocol
// (via `pg`), which — unlike Neon's browser Query editor — handles a file
// with many semicolon-separated statements (CREATE TABLE, CREATE INDEX,
// etc.) in one call.
//
// Usage:
//   node db/run-sql.js db/Schema.sql
//   node db/run-sql.js db/seed.sql
//   node db/run-sql.js db/seed-users.sql

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

// Minimal .env.local loader — avoids adding a dependency just for this
// one-off script. Only sets a variable if it isn't already in the
// environment, so a real env var always wins.
function loadEnvLocal() {
  const envPath = path.resolve('.env.local');
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');

    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const file = process.argv[2];
if (!file) {
  console.error('Usage: node db/run-sql.js <path-to-sql-file>');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set — check that .env.local exists and has it.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sql = fs.readFileSync(file, 'utf8');

pool
  .query(sql)
  .then(() => {
    console.log(`Ran ${file} successfully.`);
  })
  .catch((err) => {
    console.error(`Failed running ${file}:`, err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());