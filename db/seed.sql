-- Seeds one checklist matching the mock data already shown in the client
-- Documents page and admin Checklists page, so real behavior lines up with
-- what's already been demoed. Run this once, after Schema.sql, against a
-- fresh database.

INSERT INTO requirement_checklists (name, description, is_active)
VALUES ('New Savings Account', 'Requirements for opening a new CBLU savings account.', TRUE)
RETURNING id;
-- Note the id this returns (it'll be 1 on a fresh database) — used below.

INSERT INTO checklist_items (checklist_id, label, description, is_required, validation_rules, display_order)
VALUES
  (
    1,
    'Valid Government ID',
    'A government-issued ID with photo and full name — UMID, passport, or driver''s license.',
    TRUE,
    '{"requiredKeywords": ["republic of the philippines"]}',
    1
  ),
  (
    1,
    'Proof of Billing',
    'A utility bill or statement no older than 3 months showing the client''s current address.',
    TRUE,
    '{"requiredKeywords": ["billing statement", "due date"]}',
    2
  ),
  (
    1,
    'Signature Specimen Card',
    'A signed specimen card matching the signature the client will use on their account.',
    TRUE,
    '{"requiredKeywords": ["specimen signature"]}',
    3
  );