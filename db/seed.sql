-- Seeds the requirements checklist a client prepares for a loan application.
-- Run once, after Schema.sql, against a fresh database:
--   node db/run-sql.js db/seed.sql
--
-- PLACEHOLDER LIST — based on the bank's checklist of supporting documents
-- (Annex A-1) and the photo box on CBLU's application form. Replace it with
-- CBLU's final list once confirmed; admins can also add items from the
-- Checklists page. Clients only tick what they have; nothing is uploaded.

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
