-- ============================================================================
-- ONE-TIME UPDATE: privacy notice and consent records
-- ============================================================================
-- Run once on a database set up before the privacy consent:
--
--   node db/run-sql.js db/migrate_privacy_consent.sql
--
-- Safe to run twice: it only adds what's missing. Keeps all existing data.
-- A new database doesn't need this — db/Schema.sql already has it.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS privacy_consents (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose         VARCHAR(20) NOT NULL CHECK (purpose IN ('portal', 'id_face')),
    given           BOOLEAN NOT NULL,          -- true = agreed, false = withdrew
    notice_version  VARCHAR(20) NOT NULL,      -- PRIVACY_NOTICE_VERSION in shared/privacy.js
    ip              VARCHAR(64),
    user_agent      VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_privacy_consents_user ON privacy_consents(user_id, purpose, created_at);

COMMIT;
