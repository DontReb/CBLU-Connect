import { Pool } from 'pg';

// Reuse one pool across invocations — serverless functions can be reused
// between requests on the same warm instance, and a fresh Pool per request
// will exhaust your Postgres connection limit quickly.
//
// SSL stays on everywhere, not just in production: there's no local
// database in this project — even `vercel dev` talks to the hosted Neon
// database, which requires SSL no matter where the request comes from.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
