-- ============================================================================
-- Meridian Bank — core schema
-- Roles: admin, client, agent (live agent)
-- Run against a fresh Postgres database, e.g.:
--   psql "$DATABASE_URL" -f schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gives us gen_random_uuid()

-- ----------------------------------------------------------------------------
-- USERS — one table for all three roles. Role-specific fields live in the
-- extension tables below so this table stays small and login logic stays
-- role-agnostic (one users row, one password, one login flow).
-- ----------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('admin', 'client', 'agent');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            user_role NOT NULL DEFAULT 'client',
    phone_number    VARCHAR(20),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users(role);

-- ----------------------------------------------------------------------------
-- ADMIN — internal staff who manage chatbot rules, agents, and content.
-- ----------------------------------------------------------------------------

CREATE TABLE admin_profiles (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    department      VARCHAR(100),
    access_level    SMALLINT NOT NULL DEFAULT 1  -- 1 = standard, 2 = super admin
);

-- ----------------------------------------------------------------------------
-- CLIENT — the bank's customers using the site.
-- ----------------------------------------------------------------------------

CREATE TABLE client_profiles (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    account_number      VARCHAR(50) UNIQUE,
    branch              VARCHAR(100),
    date_of_birth       DATE,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified'
                         -- unverified | pending | verified
);

-- ----------------------------------------------------------------------------
-- AGENT — live agents who pick up escalated chats.
-- ----------------------------------------------------------------------------

CREATE TABLE agent_profiles (
    user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status                VARCHAR(20) NOT NULL DEFAULT 'offline',
                          -- online | offline | busy
    max_concurrent_chats  SMALLINT NOT NULL DEFAULT 3,
    last_active_at        TIMESTAMPTZ
);

CREATE INDEX idx_agent_profiles_status ON agent_profiles(status);

-- ----------------------------------------------------------------------------
-- CHATBOT RULES — the rule base for the rule-based bot. Admins manage these;
-- the chat API matches incoming messages against trigger_keywords.
-- ----------------------------------------------------------------------------

CREATE TABLE chatbot_rules (
    id                SERIAL PRIMARY KEY,
    trigger_keywords  TEXT[] NOT NULL,   -- e.g. {'open account','new account'}
    category          VARCHAR(100),      -- e.g. 'accounts', 'loans', 'cards'
    response_text     TEXT NOT NULL,
    priority          SMALLINT NOT NULL DEFAULT 0,  -- higher = checked first
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_by        UUID REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chatbot_rules_active ON chatbot_rules(is_active);
CREATE INDEX idx_chatbot_rules_keywords ON chatbot_rules USING GIN(trigger_keywords);

-- ----------------------------------------------------------------------------
-- CHAT SESSIONS — one row per client conversation. Starts with the bot;
-- moves to an agent when escalated.
-- ----------------------------------------------------------------------------

CREATE TYPE session_status AS ENUM ('bot', 'escalated', 'with_agent', 'closed');

CREATE TABLE chat_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID NOT NULL REFERENCES users(id),
    agent_id        UUID REFERENCES users(id),   -- null until an agent picks it up
    status          session_status NOT NULL DEFAULT 'bot',
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    escalated_at    TIMESTAMPTZ,
    closed_at       TIMESTAMPTZ
);

CREATE INDEX idx_chat_sessions_client ON chat_sessions(client_id);
CREATE INDEX idx_chat_sessions_agent ON chat_sessions(agent_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);

-- ----------------------------------------------------------------------------
-- CHAT MESSAGES — every message in every session, from client, bot, or agent.
-- ----------------------------------------------------------------------------

CREATE TYPE sender_type AS ENUM ('client', 'bot', 'agent');

CREATE TABLE chat_messages (
    id                BIGSERIAL PRIMARY KEY,
    session_id        UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_type       sender_type NOT NULL,
    sender_id         UUID REFERENCES users(id),        -- null when sender_type = 'bot'
    matched_rule_id   INTEGER REFERENCES chatbot_rules(id),  -- which rule fired, if any
    content           TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);

-- ----------------------------------------------------------------------------
-- Keep updated_at current on edit (users, chatbot_rules).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_chatbot_rules_updated_at
    BEFORE UPDATE ON chatbot_rules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- OCR & document validation — the assisted checklist
-- ============================================================================

-- ----------------------------------------------------------------------------
-- REQUIREMENT CHECKLISTS — what a client is applying for, e.g. "New Savings
-- Account" or "Personal Loan". Admins define these and their items.
-- ----------------------------------------------------------------------------

CREATE TABLE requirement_checklists (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- CHECKLIST ITEMS — one required document per checklist, with the rules its
-- OCR'd text is checked against. Kept simple and explainable: keyword rules,
-- stored as JSONB so items can be edited without a migration.
-- e.g. validation_rules = {"requiredKeywords": ["republic of the philippines",
--                                                 "driver's license"]}
-- ----------------------------------------------------------------------------

CREATE TABLE checklist_items (
    id                  SERIAL PRIMARY KEY,
    checklist_id        INTEGER NOT NULL REFERENCES requirement_checklists(id) ON DELETE CASCADE,
    label               VARCHAR(150) NOT NULL,
    description         TEXT,
    is_required         BOOLEAN NOT NULL DEFAULT TRUE,
    validation_rules    JSONB NOT NULL DEFAULT '{}',
    display_order       SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_checklist_items_checklist ON checklist_items(checklist_id);

-- ----------------------------------------------------------------------------
-- DOCUMENT UPLOADS — one row per file a client submits against a checklist
-- item. The file itself lives in object storage; this row just tracks it.
-- ----------------------------------------------------------------------------

CREATE TABLE document_uploads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES users(id),
    checklist_item_id   INTEGER NOT NULL REFERENCES checklist_items(id),
    file_name           VARCHAR(255) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
                        -- pending | processed | failed
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_uploads_client ON document_uploads(client_id);
CREATE INDEX idx_document_uploads_item ON document_uploads(checklist_item_id);

-- ----------------------------------------------------------------------------
-- DOCUMENT OCR RESULTS — the raw text an OCR engine extracted, plus its own
-- confidence score. Kept separate from validation so you can re-run
-- validation rules later without re-running OCR.
-- ----------------------------------------------------------------------------

CREATE TABLE document_ocr_results (
    id                  BIGSERIAL PRIMARY KEY,
    document_upload_id  UUID NOT NULL REFERENCES document_uploads(id) ON DELETE CASCADE,
    extracted_text      TEXT,
    confidence_score    NUMERIC(5,2),  -- 0.00-100.00, from the OCR engine
    ocr_engine          VARCHAR(50) NOT NULL DEFAULT 'tesseract.js',
    processed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- DOCUMENT VALIDATIONS — the outcome of checking OCR text against the item's
-- validation_rules. reviewed_by stays null until/unless an admin overrides
-- the automated result.
-- ----------------------------------------------------------------------------

CREATE TABLE document_validations (
    id                  BIGSERIAL PRIMARY KEY,
    document_upload_id  UUID NOT NULL REFERENCES document_uploads(id) ON DELETE CASCADE,
    is_valid            BOOLEAN NOT NULL,
    matched_keywords    JSONB,
    notes               TEXT,
    reviewed_by         UUID REFERENCES users(id),
    validated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_validations_upload ON document_validations(document_upload_id);