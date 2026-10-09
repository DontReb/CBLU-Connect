-- ============================================================================
-- CBLU Connect — loan application form (filled in online, printed on paper)
-- Run AFTER Schema.sql (reuses the users table and the set_updated_at()
-- trigger function defined there):
--   node db/run-sql.js db/forms_schema.sql
-- ============================================================================

-- What kind of input a field renders as. Kept small on purpose — every
-- type here is something DynamicFormField.jsx knows how to draw.
CREATE TYPE form_field_type AS ENUM (
    'text', 'textarea', 'number', 'date', 'email', 'tel', 'select'
);

-- ----------------------------------------------------------------------------
-- FORM TEMPLATES — one row per paper form the bank uses.
-- ----------------------------------------------------------------------------

CREATE TABLE form_templates (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(50) UNIQUE NOT NULL,   -- stable key, e.g. 'cblu-loan-isp-2023'
    name            VARCHAR(150) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- FORM TEMPLATE FIELDS — one row per field filled in online.
-- id_source names the value from a scanned ID that fills this field
-- (lastName, firstName, middleName, suffix, birthDate, sex, nationality,
-- address, civilStatus — see server/idParsers.js). NULL = never filled from
-- an ID; the client types it.
-- ----------------------------------------------------------------------------

CREATE TABLE form_template_fields (
    id                SERIAL PRIMARY KEY,
    template_id       INTEGER NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
    field_key         VARCHAR(80) NOT NULL,      -- e.g. 'b_last_name'
    label             VARCHAR(200) NOT NULL,
    section           VARCHAR(100) NOT NULL,     -- groups fields on the page
    field_type        form_field_type NOT NULL DEFAULT 'text',
    options           JSONB,                     -- select choices
    is_required       BOOLEAN NOT NULL DEFAULT FALSE,
    id_source         VARCHAR(40),
    help_text         TEXT,
    display_order     SMALLINT NOT NULL DEFAULT 0,
    UNIQUE (template_id, field_key)
);

CREATE INDEX idx_form_template_fields_template ON form_template_fields(template_id);

-- ----------------------------------------------------------------------------
-- FORM SUBMISSIONS — one application per client per form. Records which ID
-- was scanned last and how confident OCR was, but never the ID's text or
-- image (data minimisation — only the fields the form needs are kept).
-- ----------------------------------------------------------------------------

CREATE TABLE form_submissions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id           INTEGER NOT NULL REFERENCES form_templates(id),
    status                VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft | submitted
    last_id_type          VARCHAR(30),           -- e.g. 'philsys', 'drivers_license', 'passport'
    last_scan_at          TIMESTAMPTZ,
    last_ocr_confidence   NUMERIC(5,2),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (client_id, template_id)
);

-- ----------------------------------------------------------------------------
-- FORM SUBMISSION VALUES — one row per filled-in field. `source` records
-- whether the value came from an ID scan ('ocr') or the client typed it
-- ('manual'). A new scan never overwrites a 'manual' value.
-- ----------------------------------------------------------------------------

CREATE TABLE form_submission_values (
    id              BIGSERIAL PRIMARY KEY,
    submission_id   UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
    field_id        INTEGER NOT NULL REFERENCES form_template_fields(id) ON DELETE CASCADE,
    value           TEXT,
    source          VARCHAR(10) NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('ocr', 'manual')),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (submission_id, field_id)
);

CREATE INDEX idx_form_submission_values_submission ON form_submission_values(submission_id);

CREATE TRIGGER trg_form_submissions_updated_at
    BEFORE UPDATE ON form_submissions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_form_submission_values_updated_at
    BEFORE UPDATE ON form_submission_values
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
