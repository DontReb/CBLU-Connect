-- ============================================================================
-- ONE-TIME UPDATE: login attempt limit
-- ============================================================================
-- Run once on a database set up before the login limit:
--
--   node db/run-sql.js db/migrate_login_limit.sql
--
-- Safe to run twice: it only adds what's missing. Keeps all existing data.
-- A new database doesn't need this — db/Schema.sql already has it.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS login_attempts (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    ip              VARCHAR(64) NOT NULL,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    succeeded       BOOLEAN NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at);

COMMIT;
