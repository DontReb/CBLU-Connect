import { Pool } from 'pg';

// Reuse one pool across invocations — serverless functions can be reused
// between requests on the same warm instance, and a fresh Pool per request
// will exhaust your Postgres connection limit quickly.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false } // typical for Neon/Supabase/Vercel Postgres
      : false,
});