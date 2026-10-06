-- ============================================================================
-- CBLU Connect — announcements posted by admins, shown to clients
-- Run AFTER Schema.sql (reuses users and set_updated_at()):
--   node db/run-sql.js db/announcements_schema.sql
-- ============================================================================

CREATE TABLE announcements (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    body            TEXT NOT NULL,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);

CREATE TRIGGER trg_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
