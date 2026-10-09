-- ============================================================================
-- ONE-TIME UPDATE for a database set up before the ID-scan change (Oct 2026).
-- Run once, from the project folder:
--   node db/run-sql.js db/migrate_id_scan.sql
--
-- What it does (one transaction — it either fully applies or not at all):
--   1. Removes the document upload tables. Clients no longer upload their
--      documents; the checklist is tick-only. (Deletes test uploads.)
--   2. Replaces the old loan form tables with CBLU's 2023 form.
--      Deletes saved loan applications — test data only.
--   3. Adds client_checklist_marks (which items each client has ticked).
--   4. Retires the old "New Savings Account" checklist and adds the
--      "Loan Application Requirements" checklist.
-- It does NOT touch users, announcements or chats.
--
-- GENERATED from Schema.sql, forms_schema.sql, forms_seed.sql and seed.sql,
-- so a fresh install and an updated database end up the same.
-- ============================================================================

-- 1. Document uploads out
DROP TABLE IF EXISTS document_validations CASCADE;
DROP TABLE IF EXISTS document_ocr_results CASCADE;
DROP TABLE IF EXISTS document_uploads CASCADE;
ALTER TABLE checklist_items DROP COLUMN IF EXISTS validation_rules;

-- 2. Old loan form tables out, new ones in (same as forms_schema.sql + forms_seed.sql)
DROP TABLE IF EXISTS form_submission_values CASCADE;
DROP TABLE IF EXISTS form_submissions CASCADE;
DROP TABLE IF EXISTS form_template_fields CASCADE;
DROP TABLE IF EXISTS form_templates CASCADE;
DROP TYPE IF EXISTS form_field_type CASCADE;

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

INSERT INTO form_templates (code, name, description)
VALUES (
  'cblu-loan-isp-2023',
  'Loan Application Form — Individual and Sole Proprietor',
  'Digital version of the Cooperative Bank of La Union loan application form (CBLU REV. 2023).'
);

INSERT INTO form_template_fields
  (template_id, field_key, label, section, field_type, options, is_required, id_source, help_text, display_order)
SELECT
  t.id, v.field_key, v.label, v.section, v.field_type::form_field_type, v.options::jsonb,
  v.is_required, v.id_source, v.help_text, v.display_order
FROM form_templates t
CROSS JOIN (
  VALUES
    ('loan_type', 'Loan type', 'Loan details', 'select', '[{"group": "Secured", "options": ["Real Estate Mortgage Loan", "Motorcycle Loan", "Tricycle Loan", "Auto Loan", "DOA Loan", "Kabayan Loan"]}, {"group": "Unsecured", "options": ["Unsecured Loan", "Salary Loan", "ACPC Loan", "Market Loan", "Business Loan"]}]', TRUE, NULL, NULL, 1),
    ('amount_applied', 'Amount applied for (Php)', 'Loan details', 'number', NULL, TRUE, NULL, NULL, 2),
    ('facility', 'Facility', 'Loan details', 'select', '["Term", "Credit Line"]', TRUE, NULL, NULL, 3),
    ('desired_term', 'Desired term', 'Loan details', 'select', '["1 year", "2 years", "3 years", "4 years", "5 years"]', TRUE, NULL, NULL, 4),
    ('loan_purpose', 'Loan purpose', 'Loan details', 'textarea', NULL, TRUE, NULL, NULL, 5),
    ('b_last_name', 'Last name', 'Borrower''s data', 'text', NULL, TRUE, 'lastName', NULL, 6),
    ('b_first_name', 'First name', 'Borrower''s data', 'text', NULL, TRUE, 'firstName', NULL, 7),
    ('b_middle_name', 'Middle name', 'Borrower''s data', 'text', NULL, FALSE, 'middleName', NULL, 8),
    ('b_ext_name', 'Extension name', 'Borrower''s data', 'text', NULL, FALSE, 'suffix', 'Jr., Sr., III — leave blank if none', 9),
    ('b_birth_date', 'Date of birth', 'Borrower''s data', 'date', NULL, TRUE, 'birthDate', NULL, 10),
    ('b_gender', 'Gender', 'Borrower''s data', 'select', '["Male", "Female"]', TRUE, 'sex', NULL, 11),
    ('b_permanent_address', 'Permanent home address', 'Borrower''s data', 'textarea', NULL, TRUE, 'address', 'No., Street, Subd./Bldg. Name, City/Municipality, Zip Code', 12),
    ('b_citizenship', 'Citizenship', 'Borrower''s data', 'text', NULL, TRUE, 'nationality', NULL, 13),
    ('b_tin', 'TIN', 'Borrower''s data', 'text', NULL, FALSE, NULL, 'Tax Identification Number', 14),
    ('b_cellphone', 'Cellphone no.', 'Borrower''s data', 'tel', NULL, TRUE, NULL, NULL, 15),
    ('b_present_address', 'Present home address', 'Borrower''s data', 'textarea', NULL, TRUE, NULL, 'No., Street, Subd./Bldg. Name, City/Municipality, Zip Code', 16),
    ('b_years_of_stay', 'Years of stay', 'Borrower''s data', 'number', NULL, FALSE, NULL, 'At the present address', 17),
    ('b_civil_status', 'Civil status', 'Borrower''s data', 'select', '["Single", "Married", "Widow/er", "Separated"]', TRUE, 'civilStatus', NULL, 18),
    ('b_home_ownership', 'Home ownership', 'Borrower''s data', 'select', '["Owned", "Mortgaged", "Living w/ relatives/parents", "Rented"]', FALSE, NULL, NULL, 19),
    ('b_monthly_rent', 'Monthly rent (Php)', 'Borrower''s data', 'number', NULL, FALSE, NULL, 'Only if your home is rented', 20),
    ('b_family_members', 'Number of family members', 'Borrower''s data', 'number', NULL, FALSE, NULL, NULL, 21),
    ('b_employer_name', 'Employer / business name', 'Borrower''s data', 'text', NULL, FALSE, NULL, 'If self-employed, your business name', 22),
    ('b_position', 'Position / title', 'Borrower''s data', 'text', NULL, FALSE, NULL, NULL, 23),
    ('b_years_employed', 'Years of employment / business', 'Borrower''s data', 'number', NULL, FALSE, NULL, NULL, 24),
    ('b_employer_address', 'Employer / business address', 'Borrower''s data', 'textarea', NULL, FALSE, NULL, NULL, 25),
    ('b_employer_contact', 'Contact no. of employer / business', 'Borrower''s data', 'tel', NULL, FALSE, NULL, NULL, 26),
    ('b_nature_of_business', 'Nature of job / business', 'Borrower''s data', 'text', NULL, FALSE, NULL, NULL, 27),
    ('b_gross_income', 'Gross monthly income', 'Borrower''s data', 'select', '["Less than Php 50,000.00", "Php 50,001.00 to 75,000.00", "Php 75,001.00 to 100,000.00", "Php 100,001.00 to 200,000.00", "Over Php 200,000.00"]', TRUE, NULL, NULL, 28),
    ('b_other_income_source', 'Source of other income', 'Borrower''s data', 'text', NULL, FALSE, NULL, NULL, 29),
    ('b_other_gross_income', 'Other gross monthly income', 'Borrower''s data', 'select', '["Less than Php 50,000.00", "Php 50,001.00 to 75,000.00", "Php 75,001.00 to 100,000.00", "Php 100,001.00 to 200,000.00", "Over Php 200,000.00"]', FALSE, NULL, NULL, 30),
    ('s_last_name', 'Last name', 'Spouse''s personal data', 'text', NULL, FALSE, NULL, NULL, 31),
    ('s_first_name', 'First name', 'Spouse''s personal data', 'text', NULL, FALSE, NULL, NULL, 32),
    ('s_middle_name', 'Middle name', 'Spouse''s personal data', 'text', NULL, FALSE, NULL, NULL, 33),
    ('s_ext_name', 'Extension name', 'Spouse''s personal data', 'text', NULL, FALSE, NULL, 'Jr., Sr., III — leave blank if none', 34),
    ('s_birth_date', 'Date of birth', 'Spouse''s personal data', 'date', NULL, FALSE, NULL, NULL, 35),
    ('s_citizenship', 'Citizenship', 'Spouse''s personal data', 'text', NULL, FALSE, NULL, NULL, 36),
    ('s_tin', 'TIN', 'Spouse''s personal data', 'text', NULL, FALSE, NULL, 'Tax Identification Number', 37),
    ('s_cellphone', 'Cellphone no.', 'Spouse''s personal data', 'tel', NULL, FALSE, NULL, NULL, 38),
    ('s_present_address', 'Present home address', 'Spouse''s personal data', 'textarea', NULL, FALSE, NULL, 'No., Street, Subd./Bldg. Name, City/Municipality, Zip Code', 39),
    ('s_occupation', 'Occupation', 'Spouse''s personal data', 'select', '["Employed", "Self Employed"]', FALSE, NULL, NULL, 40),
    ('s_employer_name', 'Employer / business name', 'Spouse''s personal data', 'text', NULL, FALSE, NULL, 'If self-employed, your business name', 41),
    ('s_position', 'Position / title', 'Spouse''s personal data', 'text', NULL, FALSE, NULL, NULL, 42),
    ('s_years_employed', 'Years of employment / business', 'Spouse''s personal data', 'number', NULL, FALSE, NULL, NULL, 43),
    ('s_employer_address', 'Employer / business address', 'Spouse''s personal data', 'textarea', NULL, FALSE, NULL, NULL, 44),
    ('s_employer_contact', 'Contact no. of employer / business', 'Spouse''s personal data', 'tel', NULL, FALSE, NULL, NULL, 45),
    ('s_nature_of_business', 'Nature of job / business', 'Spouse''s personal data', 'text', NULL, FALSE, NULL, NULL, 46),
    ('s_gross_income', 'Gross monthly income', 'Spouse''s personal data', 'select', '["Less than Php 50,000.00", "Php 50,001.00 to 75,000.00", "Php 75,001.00 to 100,000.00", "Php 100,001.00 to 200,000.00", "Over Php 200,000.00"]', FALSE, NULL, NULL, 47),
    ('s_other_income_source', 'Source of other income', 'Spouse''s personal data', 'text', NULL, FALSE, NULL, NULL, 48),
    ('s_other_gross_income', 'Other gross monthly income', 'Spouse''s personal data', 'select', '["Less than Php 50,000.00", "Php 50,001.00 to 75,000.00", "Php 75,001.00 to 100,000.00", "Php 100,001.00 to 200,000.00", "Over Php 200,000.00"]', FALSE, NULL, NULL, 49),
    ('col_tct_oct', 'TCT/OCT no/s.', 'Collateral details', 'text', NULL, FALSE, NULL, NULL, 50),
    ('col_registered_owners', 'Registered owner/s', 'Collateral details', 'textarea', NULL, FALSE, NULL, 'One owner per line', 51),
    ('col_tax_dec_no', 'Tax declaration no.', 'Collateral details', 'text', NULL, FALSE, NULL, NULL, 52),
    ('col_improvement_type', 'Type of improvement', 'Collateral details', 'select', '["House & Lot", "Vacant Lot", "Commercial Bldg."]', FALSE, NULL, NULL, 53),
    ('col_description', 'Description', 'Collateral details', 'textarea', NULL, FALSE, NULL, NULL, 54),
    ('col_lot_area', 'Lot area (sq. m.)', 'Collateral details', 'number', NULL, FALSE, NULL, NULL, 55),
    ('col_floor_area', 'Floor area (sq. m.)', 'Collateral details', 'number', NULL, FALSE, NULL, NULL, 56),
    ('col_tax_dec_improvement', 'Tax declaration no. (improvement)', 'Collateral details', 'text', NULL, FALSE, NULL, NULL, 57),
    ('col_location', 'Location', 'Collateral details', 'text', NULL, FALSE, NULL, NULL, 58),
    ('col_others', 'Others (chattel, certificate of time deposit, etc.)', 'Collateral details', 'textarea', NULL, FALSE, NULL, NULL, 59),
    ('c1_last_name', 'Last name', 'Co-borrower / co-maker 1', 'text', NULL, FALSE, NULL, NULL, 60),
    ('c1_first_name', 'First name', 'Co-borrower / co-maker 1', 'text', NULL, FALSE, NULL, NULL, 61),
    ('c1_middle_name', 'Middle name', 'Co-borrower / co-maker 1', 'text', NULL, FALSE, NULL, NULL, 62),
    ('c1_ext_name', 'Extension name', 'Co-borrower / co-maker 1', 'text', NULL, FALSE, NULL, 'Jr., Sr., III — leave blank if none', 63),
    ('c1_birth_date', 'Date of birth', 'Co-borrower / co-maker 1', 'date', NULL, FALSE, NULL, NULL, 64),
    ('c1_gender', 'Gender', 'Co-borrower / co-maker 1', 'select', '["Male", "Female"]', FALSE, NULL, NULL, 65),
    ('c1_permanent_address', 'Permanent home address', 'Co-borrower / co-maker 1', 'textarea', NULL, FALSE, NULL, 'No., Street, Subd./Bldg. Name, City/Municipality, Zip Code', 66),
    ('c1_citizenship', 'Citizenship', 'Co-borrower / co-maker 1', 'text', NULL, FALSE, NULL, NULL, 67),
    ('c1_tin', 'TIN', 'Co-borrower / co-maker 1', 'text', NULL, FALSE, NULL, 'Tax Identification Number', 68),
    ('c1_cellphone', 'Cellphone no.', 'Co-borrower / co-maker 1', 'tel', NULL, FALSE, NULL, NULL, 69),
    ('c1_present_address', 'Present home address', 'Co-borrower / co-maker 1', 'textarea', NULL, FALSE, NULL, 'No., Street, Subd./Bldg. Name, City/Municipality, Zip Code', 70),
    ('c1_years_of_stay', 'Years of stay', 'Co-borrower / co-maker 1', 'number', NULL, FALSE, NULL, 'At the present address', 71),
    ('c1_civil_status', 'Civil status', 'Co-borrower / co-maker 1', 'select', '["Single", "Married", "Widow/er", "Separated"]', FALSE, NULL, NULL, 72),
    ('c1_employer_name', 'Employer / business name', 'Co-borrower / co-maker 1', 'text', NULL, FALSE, NULL, 'If self-employed, your business name', 73),
    ('c1_position', 'Position / title', 'Co-borrower / co-maker 1', 'text', NULL, FALSE, NULL, NULL, 74),
    ('c1_years_employed', 'Years of employment / business', 'Co-borrower / co-maker 1', 'number', NULL, FALSE, NULL, NULL, 75),
    ('c1_employer_address', 'Employer / business address', 'Co-borrower / co-maker 1', 'textarea', NULL, FALSE, NULL, NULL, 76),
    ('c1_employer_contact', 'Contact no. of employer / business', 'Co-borrower / co-maker 1', 'tel', NULL, FALSE, NULL, NULL, 77),
    ('c1_nature_of_business', 'Nature of job / business', 'Co-borrower / co-maker 1', 'text', NULL, FALSE, NULL, NULL, 78),
    ('c1_gross_income', 'Gross monthly income', 'Co-borrower / co-maker 1', 'select', '["Less than Php 50,000.00", "Php 50,001.00 to 75,000.00", "Php 75,001.00 to 100,000.00", "Php 100,001.00 to 200,000.00", "Over Php 200,000.00"]', FALSE, NULL, NULL, 79),
    ('c2_last_name', 'Last name', 'Co-borrower / co-maker 2', 'text', NULL, FALSE, NULL, NULL, 80),
    ('c2_first_name', 'First name', 'Co-borrower / co-maker 2', 'text', NULL, FALSE, NULL, NULL, 81),
    ('c2_middle_name', 'Middle name', 'Co-borrower / co-maker 2', 'text', NULL, FALSE, NULL, NULL, 82),
    ('c2_ext_name', 'Extension name', 'Co-borrower / co-maker 2', 'text', NULL, FALSE, NULL, 'Jr., Sr., III — leave blank if none', 83),
    ('c2_birth_date', 'Date of birth', 'Co-borrower / co-maker 2', 'date', NULL, FALSE, NULL, NULL, 84),
    ('c2_gender', 'Gender', 'Co-borrower / co-maker 2', 'select', '["Male", "Female"]', FALSE, NULL, NULL, 85),
    ('c2_permanent_address', 'Permanent home address', 'Co-borrower / co-maker 2', 'textarea', NULL, FALSE, NULL, 'No., Street, Subd./Bldg. Name, City/Municipality, Zip Code', 86),
    ('c2_citizenship', 'Citizenship', 'Co-borrower / co-maker 2', 'text', NULL, FALSE, NULL, NULL, 87),
    ('c2_tin', 'TIN', 'Co-borrower / co-maker 2', 'text', NULL, FALSE, NULL, 'Tax Identification Number', 88),
    ('c2_cellphone', 'Cellphone no.', 'Co-borrower / co-maker 2', 'tel', NULL, FALSE, NULL, NULL, 89),
    ('c2_present_address', 'Present home address', 'Co-borrower / co-maker 2', 'textarea', NULL, FALSE, NULL, 'No., Street, Subd./Bldg. Name, City/Municipality, Zip Code', 90),
    ('c2_years_of_stay', 'Years of stay', 'Co-borrower / co-maker 2', 'number', NULL, FALSE, NULL, 'At the present address', 91),
    ('c2_civil_status', 'Civil status', 'Co-borrower / co-maker 2', 'select', '["Single", "Married", "Widow/er", "Separated"]', FALSE, NULL, NULL, 92),
    ('c2_employer_name', 'Employer / business name', 'Co-borrower / co-maker 2', 'text', NULL, FALSE, NULL, 'If self-employed, your business name', 93),
    ('c2_position', 'Position / title', 'Co-borrower / co-maker 2', 'text', NULL, FALSE, NULL, NULL, 94),
    ('c2_years_employed', 'Years of employment / business', 'Co-borrower / co-maker 2', 'number', NULL, FALSE, NULL, NULL, 95),
    ('c2_employer_address', 'Employer / business address', 'Co-borrower / co-maker 2', 'textarea', NULL, FALSE, NULL, NULL, 96),
    ('c2_employer_contact', 'Contact no. of employer / business', 'Co-borrower / co-maker 2', 'tel', NULL, FALSE, NULL, NULL, 97),
    ('c2_nature_of_business', 'Nature of job / business', 'Co-borrower / co-maker 2', 'text', NULL, FALSE, NULL, NULL, 98),
    ('c2_gross_income', 'Gross monthly income', 'Co-borrower / co-maker 2', 'select', '["Less than Php 50,000.00", "Php 50,001.00 to 75,000.00", "Php 75,001.00 to 100,000.00", "Php 100,001.00 to 200,000.00", "Over Php 200,000.00"]', FALSE, NULL, NULL, 99)
) AS v(field_key, label, section, field_type, options, is_required, id_source, help_text, display_order)
WHERE t.code = 'cblu-loan-isp-2023';

-- 3. Tick-only checklist (same as the end of Schema.sql)
DROP TABLE IF EXISTS client_checklist_marks CASCADE;

-- ----------------------------------------------------------------------------
-- CLIENT CHECKLIST MARKS — a row means "this client has ticked this item";
-- unticking deletes the row.
-- ----------------------------------------------------------------------------

CREATE TABLE client_checklist_marks (
    client_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checklist_item_id   INTEGER NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
    marked_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (client_id, checklist_item_id)
);

-- 4. New checklist (same as seed.sql)
UPDATE requirement_checklists SET is_active = FALSE WHERE is_active;

WITH checklist AS (
  INSERT INTO requirement_checklists (name, description, is_active)
  VALUES ('Loan Application Requirements', 'Documents to bring with the printed loan application form.', TRUE)
  RETURNING id
)
INSERT INTO checklist_items (checklist_id, label, description, is_required, display_order)
SELECT checklist.id, v.label, v.description, v.is_required, v.display_order
FROM checklist
CROSS JOIN (
  VALUES
    ('Signed application form', 'Print it from Loan Application, then sign it.', TRUE, 1),
    ('One (1) valid government-issued ID', 'Clear photocopy, front and back.', TRUE, 2),
    ('Recent 2x2 ID picture', 'For the photo box on the application form.', TRUE, 3),
    ('Proof of income', 'Latest ITR or BIR Form 2316, payslips for the past 2 months, or a Certificate of Employment with salary.', TRUE, 4),
    ('Marriage contract', 'If married.', FALSE, 5),
    ('Proof of business registration', 'If self-employed: DTI or BIR certificate of registration, and Barangay or Mayor''s permit.', FALSE, 6),
    ('Bank statements or passbook', 'Photocopy covering the past 6 months.', FALSE, 7),
    ('Proof of billing', 'Utility bill for the past 3 months showing your address.', FALSE, 8),
    ('Collateral documents', 'For secured loans: photocopy of the TCT/CCT or the vehicle OR/CR, and the latest tax declaration.', FALSE, 9),
    ('Location / vicinity map', 'For real estate collateral.', FALSE, 10)
) AS v(label, description, is_required, display_order);
