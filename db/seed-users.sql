-- Seeds one test account per role, sharing the password: CbluTest123!
-- (bcrypt hash below, cost factor 10, generated with bcryptjs). Names match
-- the mock data already used across the admin/agent dashboards, so logging
-- in as each of these lines up with what you've already been testing.
--
-- These are for local/dev testing only — replace or remove before this
-- goes anywhere someone else can reach it.

WITH new_admin AS (
  INSERT INTO users (email, password_hash, full_name, role)
  VALUES (
    'grace.fernandez@cblu.test',
    '$2b$10$KPlIA9Ngw6209b.GcFA8xuzgrWNKV8H3TIaA4jA.0eb0goAusHP3u',
    'Grace Fernandez',
    'admin'
  )
  RETURNING id
)
INSERT INTO admin_profiles (user_id, department, access_level)
SELECT id, 'Client Onboarding', 2 FROM new_admin;

WITH new_client AS (
  INSERT INTO users (email, password_hash, full_name, role)
  VALUES (
    'maria.santos@cblu.test',
    '$2b$10$KPlIA9Ngw6209b.GcFA8xuzgrWNKV8H3TIaA4jA.0eb0goAusHP3u',
    'Maria Santos',
    'client'
  )
  RETURNING id
)
INSERT INTO client_profiles (user_id, account_number, branch, verification_status)
SELECT id, '2201-0043128', 'CBLU Main Branch — Dagupan', 'pending' FROM new_client;

WITH new_agent AS (
  INSERT INTO users (email, password_hash, full_name, role)
  VALUES (
    'carlo.ramirez@cblu.test',
    '$2b$10$KPlIA9Ngw6209b.GcFA8xuzgrWNKV8H3TIaA4jA.0eb0goAusHP3u',
    'Carlo Ramirez',
    'agent'
  )
  RETURNING id
)
INSERT INTO agent_profiles (user_id, status)
SELECT id, 'online' FROM new_agent;