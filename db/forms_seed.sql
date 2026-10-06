-- Seeds the Business Loan Application Form (Individual / Sole-Proprietorship)
-- as a digital template: 41 single-value fields across 5 sections.
-- Run AFTER forms_schema.sql:
--   node db/run-sql.js db/forms_seed.sql
--
-- Not included on purpose (see the note at the bottom of the Loan
-- Application page): the repeating tables (top trade references, existing
-- deposit accounts, existing loans, existing credit cards), the signature
-- and declaration blocks, and the Cooperative/Partnership/Corporation
-- version of the form.
--
-- Only 3 fields get an autofill_pattern — email, mobile number and TIN —
-- because they're the only fields whose shape is unique on the page.
-- Backslashes below are single and literal (standard_conforming_strings is
-- on by default in Postgres), so '\d' reaches JavaScript as \d.

INSERT INTO form_templates (code, name, description)
VALUES (
  'sblaf-isp',
  'Business Loan Application — Individual / Sole-Proprietorship',
  'Digital version of the CBLU Business Loan Application Form for individual and sole-proprietorship borrowers.'
);

INSERT INTO form_template_fields
  (template_id, field_key, label, section, field_type, options, is_required, autofill_pattern, help_text, display_order)
SELECT
  t.id, v.field_key, v.label, v.section, v.field_type::form_field_type, v.options::jsonb,
  v.is_required, v.autofill_pattern, v.help_text, v.display_order
FROM form_templates t
CROSS JOIN (
  VALUES
    -- 1. Borrower information (13)
    ('application_type', 'Application type', 'Borrower information', 'select',
      '["New Application","Additional Loan","Renewal","Restructuring"]', TRUE, NULL, NULL, 1),
    ('borrower_type', 'Borrower type', 'Borrower information', 'select',
      '["Individual","Sole-Proprietorship"]', TRUE, NULL, NULL, 2),
    ('first_name', 'First name', 'Borrower information', 'text', NULL, TRUE, NULL, NULL, 3),
    ('middle_name', 'Middle name', 'Borrower information', 'text', NULL, FALSE, NULL, NULL, 4),
    ('last_name', 'Last name', 'Borrower information', 'text', NULL, TRUE, NULL, NULL, 5),
    ('suffix', 'Suffix', 'Borrower information', 'text', NULL, FALSE, NULL, 'e.g. Jr., Sr., III — leave blank if none.', 6),
    ('civil_status', 'Civil status', 'Borrower information', 'select',
      '["Single","Married","Separated","Widow/er","Annulled"]', TRUE, NULL, NULL, 7),
    ('date_of_birth', 'Date of birth', 'Borrower information', 'date', NULL, TRUE, NULL, NULL, 8),
    ('place_of_birth', 'Place of birth', 'Borrower information', 'text', NULL, FALSE, NULL, 'Municipality/City, Province', 9),
    ('sex', 'Sex', 'Borrower information', 'select', '["Male","Female"]', TRUE, NULL, NULL, 10),
    ('citizenship', 'Citizenship', 'Borrower information', 'text', NULL, TRUE, NULL, NULL, 11),
    ('spouse_name', 'Name of spouse', 'Borrower information', 'text', NULL, FALSE, NULL, 'Full name, if married.', 12),
    ('mothers_maiden_name', 'Mother''s maiden name', 'Borrower information', 'text', NULL, TRUE, NULL, 'First, middle and last name.', 13),

    -- 2. Contact & identification (9) — mobile, email and TIN are the 3 auto-fill fields
    ('home_address', 'Home address', 'Contact & identification', 'textarea', NULL, TRUE, NULL,
      'Unit #, Building/House #, Street, Barangay, Municipality/City, Province, Zip code', 14),
    ('home_ownership', 'Home address ownership', 'Contact & identification', 'select',
      '["Owned (unencumbered)","Owned (mortgaged)","Rented","Living with relatives"]', FALSE, NULL, NULL, 15),
    ('length_of_stay_years', 'Length of stay at this address (years)', 'Contact & identification', 'number', NULL, FALSE, NULL, NULL, 16),
    ('landline', 'Landline number', 'Contact & identification', 'tel', NULL, FALSE, NULL, 'Area code and number', 17),
    ('mobile_number', 'Mobile number', 'Contact & identification', 'tel', NULL, TRUE,
      '(?<!\d)((?:\+63|0)\s?9\d{2}[\s-]?\d{3}[\s-]?\d{4})(?!\d)', NULL, 18),
    ('email', 'Email address', 'Contact & identification', 'email', NULL, TRUE,
      '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', NULL, 19),
    ('tin', 'TIN', 'Contact & identification', 'text', NULL, FALSE,
      '\bTIN\b\s*(?:No\.?)?\s*[:.]?\s*(\d{3}[\s-]?\d{3}[\s-]?\d{3}(?:[\s-]?\d{3,5})?)', 'Tax Identification Number', 20),
    ('philsys', 'PhilSys number', 'Contact & identification', 'text', NULL, FALSE, NULL, NULL, 21),
    ('other_government_id', 'Other government-issued ID', 'Contact & identification', 'text', NULL, FALSE, NULL,
      'Type and number, e.g. Driver''s License N01-23-456789', 22),

    -- 3. Business information (9)
    ('business_name', 'Registered business name (trade name)', 'Business information', 'text', NULL, TRUE, NULL, NULL, 23),
    ('business_address', 'Principal business address', 'Business information', 'textarea', NULL, TRUE, NULL,
      'Write "Same as home address" if it is.', 24),
    ('business_address_ownership', 'Business address ownership', 'Business information', 'select',
      '["Owned (unencumbered)","Owned (mortgaged)","Rented"]', FALSE, NULL, NULL, 25),
    ('years_in_operation', 'Years the business has been in operation', 'Business information', 'number', NULL, FALSE, NULL, NULL, 26),
    ('number_of_branches', 'Number of branches', 'Business information', 'number', NULL, FALSE, NULL, NULL, 27),
    ('nature_of_business', 'Nature of business (PSIC)', 'Business information', 'select',
      '["A – Agriculture, Forestry & Fishing","B – Mining and Quarrying","C – Manufacturing","D – Electricity, Gas, Steam and Air-conditioning Supply","E – Water Supply, Sewerage, Waste Management and Remediation","F – Construction","G – Wholesale & Retail Trade; Repair of Motor Vehicles & Motorcycles","H – Transportation & Storage","I – Accommodation & Food Service Activities","J – Information & Communication","K – Financial & Insurance Activities","L – Real Estate Activities","M – Professional, Scientific & Technical Activities","N – Administrative & Support Service Activities","O – Public Administration & Defense; Compulsory Social Security","P – Education","Q – Human Health & Social Work Activities","R – Arts, Entertainment and Recreation","S – Other Service Activities","T – Activities of Households as Employers","U – Activities of Extraterritorial Organizations and Bodies"]',
      TRUE, NULL, NULL, 28),
    ('business_activity', 'Specific business activity', 'Business information', 'text', NULL, TRUE, NULL,
      'e.g. Sari-sari store, rice retailing, tricycle operation', 29),
    ('employees_full_time', 'Number of full-time employees', 'Business information', 'number', NULL, FALSE, NULL, NULL, 30),
    ('employees_part_time', 'Number of part-time / contractual employees', 'Business information', 'number', NULL, FALSE, NULL, NULL, 31),

    -- 4. Loan details (7)
    ('loan_amount', 'Loan amount applied for (Php)', 'Loan details', 'number', NULL, TRUE, NULL,
      'Subject to the approval of the bank.', 32),
    ('tenor_months', 'Tenor (months)', 'Loan details', 'number', NULL, TRUE, NULL, NULL, 33),
    ('repayment_frequency', 'Proposed frequency of repayment', 'Loan details', 'select',
      '["Weekly","Monthly","Quarterly","Annually","Lump sum","Others"]', TRUE, NULL, NULL, 34),
    ('loan_facility', 'Loan facility', 'Loan details', 'select', '["Credit Line","Term Loan","Others"]', TRUE, NULL, NULL, 35),
    ('loan_purpose', 'Loan purpose', 'Loan details', 'select',
      '["Working capital","Business expansion","Construction/development of real estate","Purchase of equipment/motor vehicles","Acquisition of real estate","Purchase of biological asset","Loan takeout/refinancing","Others"]',
      TRUE, NULL, NULL, 36),
    ('loan_type', 'Type of loan', 'Loan details', 'select', '["Unsecured Loan","Secured Loan"]', TRUE, NULL, NULL, 37),
    ('collateral_description', 'Collateral and/or surety offered', 'Loan details', 'textarea', NULL, FALSE, NULL,
      'Only if secured — e.g. land title, motor vehicle, deposits, third-party guarantee.', 38),

    -- 5. Financial information (3)
    ('firm_size', 'Firm size (total assets, excluding land)', 'Financial information', 'select',
      '["Micro (not more than Php 3M)","Small (Php 3,000,001 to 15M)","Medium (Php 15,000,001 to 100M)"]', FALSE, NULL,
      'Subject to bank verification.', 39),
    ('annual_sales', 'Annual sales or revenue (Php)', 'Financial information', 'number', NULL, TRUE, NULL, NULL, 40),
    ('source_of_funds', 'Source of funds for loan repayment', 'Financial information', 'select',
      '["Revenue","Asset Sale","Savings and/or Investment","Inheritance","Salary/Allowance","Others"]', TRUE, NULL, NULL, 41)
) AS v(field_key, label, section, field_type, options, is_required, autofill_pattern, help_text, display_order)
WHERE t.code = 'sblaf-isp';
