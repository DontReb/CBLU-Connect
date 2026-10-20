-- ============================================================================
-- ONE-TIME UPDATE: change password, temporary passwords, password reset
-- ============================================================================
-- Run once on a database set up before these were added:
--
--   node db/run-sql.js db/migrate_account_settings.sql
--
-- Safe to run twice: it only adds what's missing. Keeps all existing data.
-- A new database doesn't need this — db/Schema.sql already has it.
-- ============================================================================

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

COMMIT;
