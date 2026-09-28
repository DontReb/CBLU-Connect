# CBLU Connect

CBLU Connect is a React/Vite frontend with Vercel serverless APIs and PostgreSQL persistence.

## Local setup

1. Install Node.js 20+.
2. Run `npm install`.
3. Set `DATABASE_URL` and a long random `AUTH_SECRET`.
4. Apply `db/Schema.sql` to PostgreSQL.
5. Ensure active users have password hashes in the project's scrypt format.
6. Run `npm run dev`.

After login, `/dashboard` renders by role:
- **client:** document checklist and OCR upload/validation history.
- **agent:** escalated chat queue and session controls.
- **admin:** operational metrics and administrative access.

## API

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/chat/message`
- `GET/PATCH /api/chat/sessions`
- `GET /api/dashboard/summary`
- `GET /api/documents/checklists`
- `POST /api/documents/upload`

## Deployment

Vercel detects the `api/` serverless functions. `vercel.json` uses an SPA rewrite that excludes `/api/*`.

Set `DATABASE_URL` and `AUTH_SECRET` in Vercel Project Settings before deployment.

## OCR

Document uploads use Tesseract.js and the validation rules in `checklist_items.validation_rules`. OCR and validation results are persisted in PostgreSQL.

For production, also configure upload limits, storage retention, database backups, rate limiting, and secret rotation.