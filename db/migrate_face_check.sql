-- ============================================================================
-- ONE-TIME UPDATE: live face check (face verification + liveness detection)
-- ============================================================================
-- Run once on a database that already has the ID-scan tables
-- (run db/migrate_id_scan.sql first if you haven't yet):
--
--   node db/run-sql.js db/migrate_face_check.sql
--
-- Safe to run twice: it only adds what's missing. Keeps all existing data.
-- A new database doesn't need this — db/forms_schema.sql already has it.
-- ============================================================================

BEGIN;

ALTER TABLE form_submissions
    ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS identity_match_score REAL;

CREATE TABLE IF NOT EXISTS identity_checks (
    id                  BIGSERIAL PRIMARY KEY,
    client_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id        UUID NOT NULL UNIQUE,
    id_type             VARCHAR(30),
    passed              BOOLEAN NOT NULL,
    face_verified       BOOLEAN NOT NULL,
    live                BOOLEAN NOT NULL,
    failure_reason      VARCHAR(30),
    match_score         REAL,
    real_face_score     REAL,
    flash_matches       SMALLINT,
    flash_total         SMALLINT,
    turn_left           REAL,
    turn_right          REAL,
    same_person_score   REAL,
    capture_ms          INTEGER,
    processing_ms       INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_checks_client ON identity_checks(client_id, created_at);

COMMIT;
