# CBLU Connect

A web-based portal for the **Cooperative Bank of La Union (CBLU)**, built to improve
information dissemination, client communication, and document requirements checking.
It includes a rule-based chatbot with live-agent escalation and an assisted
checklist system that uses OCR to validate a client's uploaded documents against
a bank-defined set of requirements.

Developed as a thesis project using the Rapid Application Development (RAD) model.
The study evaluates OCR accuracy, document validation accuracy, and usability
against applicable ISO/IEC 25010 criteria.

> **Status: active development.** This README documents what's actually built and
> working today, what's still mock data, and what's still undecided. See
> [Current Status](#current-status--whats-real-vs-mock) before assuming any given
> page is backed by real data.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router v7, Tailwind CSS v4, Motion (framer-motion) |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | PostgreSQL, hosted on Neon via Vercel's Postgres integration |
| Auth | bcryptjs (password hashing) + JWT sessions in an httpOnly cookie |
| OCR | Tesseract.js |
| File upload parsing | formidable |
| Hosting / deployment | Vercel |

---

## Project structure

```
CBLU-Connect/
├── api/                          Vercel serverless functions (the backend)
│   ├── lib/
│   │   ├── db.js                 Postgres connection pool
│   │   ├── auth.js               Password hashing, JWT, session cookies, requireRole()
│   │   └── validateDocument.js   Keyword-matching logic for OCR'd text
│   ├── auth/
│   │   ├── login.js              POST — checks credentials, sets session cookie
│   │   ├── logout.js             POST — clears session cookie
│   │   └── me.js                 GET — current logged-in user from the session
│   ├── admin/
│   │   ├── clients.js            GET — all clients + checklist progress (admin-only)
│   │   └── checklist-items.js    GET/POST — checklist item definitions (admin-only)
│   ├── client/
│   │   └── checklist.js          GET — the logged-in client's own checklist + status
│   ├── documents/
│   │   └── upload.js             POST — OCR + validate an uploaded document
│   └── chat/
│       └── message.js            Empty stub — chatbot backend not yet built
│
├── db/
│   ├── Schema.sql                Full schema — 12 tables, run this first
│   ├── seed.sql                  One checklist + its 3 required items
│   ├── seed-users.sql            One test account per role (admin/client/agent)
│   └── run-sql.js                Helper: node db/run-sql.js <file> — runs a .sql
│                                  file against DATABASE_URL. Needed because Neon's
│                                  browser Query editor can't run multi-statement files.
│
└── src/
    ├── App.jsx                   Routes, page-transition animation, auth/role guards
    ├── layouts/
    │   └── DashboardLayout.jsx   Shared sidebar+topbar shell for all 3 dashboards
    ├── components/
    │   ├── RequireRole.jsx       Route guard — redirects by auth state/role
    │   ├── ChatMessageBubble.jsx Shared chat bubble (agent queue + closed sessions)
    │   ├── ChatWidget.jsx        The landing-page chatbot widget
    │   └── ...                   Landing page sections (Hero, Features, About, etc.)
    ├── lib/
    │   ├── authContext.js / AuthProvider.jsx         Session state, login/logout
    │   ├── checklistContext.js / ChecklistProvider.jsx   Client's checklist + upload
    │   ├── adminDataContext.js / AdminDataProvider.jsx   Admin clients + checklist items
    │   ├── agentSessionsContext.js / AgentSessionsProvider.jsx   Agent chat queue (mock)
    │   ├── mockClient.js / mockAdmin.js / mockAgent.js   Remaining placeholder data
    │   └── chatRules.js          Rule-based chatbot matching logic (frontend-only)
    └── pages/
        ├── LandingPage.jsx, LoginPage.jsx
        ├── client/                Overview, Documents, Profile + dashboard layout
        ├── admin/                 Overview, Clients, Checklists, Reviews + layout
        └── agent/                 Queue, Closed sessions + dashboard layout
```

---

## Getting started

### 1. Install dependencies

```
npm install
```

### 2. Set up the database

You need a hosted Postgres database — Vercel Postgres (powered by Neon) is what
this project uses. Create one from your Vercel project's Storage tab (or
`Add New → Store → Neon`), which automatically injects `DATABASE_URL` into your
Vercel project's environment variables.

Then run the schema and seed files, in this order, using the helper script (plain
`node`, no extra tools needed — this works around Neon's browser Query editor not
supporting files with multiple SQL statements):

```
node db/run-sql.js db/Schema.sql
node db/run-sql.js db/seed.sql
node db/run-sql.js db/seed-users.sql
```

### 3. Environment variables

Create `.env.local` in the project root (already gitignored — never commit this):

```
DATABASE_URL=postgresql://...    # from your Neon/Vercel Postgres database (pooled connection)
JWT_SECRET=...                   # any long random string, used to sign session cookies
```

Generate a `JWT_SECRET` with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add both variables in Vercel's dashboard too (Project Settings → Environment
Variables → Development/Preview/Production) — `vercel dev` pulls the Development
environment from Vercel's cloud once a project is linked, so a variable that only
exists locally may not actually be picked up.

### 4. Run it

```
vercel dev
```

**Not** `npm run dev` — that only serves the frontend. The `api/` serverless
functions need the Vercel CLI's dev runtime to work locally at all.

---

## Test accounts

Seeded by `db/seed-users.sql`, all sharing one password:

| Role | Email | Password |
|---|---|---|
| Admin | `grace.fernandez@cblu.test` | `CbluTest123!` |
| Client | `maria.santos@cblu.test` | `CbluTest123!` |
| Agent | `carlo.ramirez@cblu.test` | `CbluTest123!` |

---

## Current status — what's real vs. mock

| Feature | Status |
|---|---|
| Login / logout / sessions | ✅ Real — bcrypt + JWT cookie, checked server-side on every protected route |
| Route guards by role | ✅ Real — `RequireRole` redirects to `/login` or the correct dashboard |
| Admin → Clients table | ✅ Real — live query against `users` + `client_profiles` |
| Admin → Checklists (view + add item) | ✅ Real — reads/writes `checklist_items`. Editing/deleting existing items is **not** built yet |
| Client → Documents (upload) | ✅ Real — real file upload → Tesseract OCR → keyword validation → 3 DB writes |
| Client → Overview (checklist progress) | ✅ Real — reflects the same live checklist state as Documents |
| Admin → Overview (stat cards) | ✅ Real for clients/checklist-item counts. "Pending reviews" count is still mock |
| Admin → Reviews (document review queue) | ⬜ Mock — `MOCK_REVIEWS` in `mockAdmin.js`, not connected to `document_validations` |
| Agent → Queue / Closed sessions | ⬜ Mock — `MOCK_SESSIONS` in `mockAgent.js`, nothing persisted |
| Chatbot (landing page widget) | ⬜ Frontend-only keyword matching (`chatRules.js`). The "I'll connect you to a live agent" line doesn't create a real `chat_sessions` row — `api/chat/message.js` is an empty stub |
| Client → Profile page | ⬜ Partially mock — name comes from the real session; email/phone/branch/account number/verification status are still `MOCK_CLIENT` |
| Original uploaded document files | ⬜ Not persisted anywhere. OCR runs on the temp file, then it's deleted — only the extracted text and validation result are kept. See [Open design question](#open-design-question-should-original-files-be-kept) |

---

## Known gaps / not yet implemented

- **Checklist item editing/deleting** — only adding new items works from the admin UI.
- **Admin document review queue** isn't wired to real data (see table above).
- **Chatbot escalation** doesn't create a real chat session — `api/chat/message.js`
  is an empty file.
- **Agent dashboard** is entirely mock — claiming a chat, replying, and closing it
  only update local React state, nothing is persisted.
- **Client profile fields** beyond the name are mock.
- A cosmetic leftover: `db/Schema.sql`'s header comment says "Meridian Bank"
  instead of CBLU — harmless (it's a SQL comment), just never corrected.

### Open design question: should original files be kept?

Right now a document upload runs through OCR and is then deleted — only the
extracted text, validation result, and file *name* are kept. This means the admin
Reviews page (once wired up) can only ever show the automated OCR result, never
the actual scanned image, for a human to double check. The alternative is adding
object storage (Vercel Blob or similar) and a `storage_path` column on
`document_uploads`. Not yet decided — worth settling before the Reviews queue
gets wired to real data, since it changes that endpoint's shape.

---

## Pending decisions (waiting on the bank / thesis adviser)

The checklist items currently seeded (**Valid Government ID**, **Proof of
Billing**, **Signature Specimen Card**) are placeholders. Four questions are out
with the team for confirmation, and the answers will drive real changes across
multiple pages:

1. **Which documents can clients actually upload?** — drives `db/seed.sql`, the
   admin Checklists page, the client Documents page, and each item's
   `validation_rules` keyword list.
2. **What does a client need to see on their dashboard?** — drives
   `ClientOverview.jsx` and `ClientProfile.jsx`.
3. **What does an admin need to see on their dashboard?** — drives
   `AdminOverview.jsx`, `AdminClients.jsx`, and what the Reviews queue should
   surface.
4. **What information does the bank need from a client to open an account?** —
   may mean new columns on `client_profiles`, or new fields with their own
   validation rules.

---

## Roadmap

Rough order, each one builds on the last:

1. Finalize checklist items once the team's answers come back; update
   `db/seed.sql` and re-seed.
2. Decide the original-file storage question (above), then wire the admin
   Reviews queue to real data.
3. Wire chatbot escalation — `api/chat/message.js` should read `chatbot_rules`
   from the database and create a real `chat_sessions` row on a fallback reply.
4. Wire the agent dashboard (`AgentSessionsProvider`) to real `chat_sessions` /
   `chat_messages` data — claim, reply, close.
5. Build out the client Profile page with real `client_profiles` data.
6. Checklist item editing and deletion from the admin UI.
