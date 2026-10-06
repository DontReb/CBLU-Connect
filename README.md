# CBLU Connect

A web portal for the **Cooperative Bank of La Union (CBLU)** that improves information
dissemination, client communication and document requirements checking. Clients get a
chatbot that can hand them to a live agent, a document checklist that checks each
upload with OCR, and an online version of the bank's Business Loan Application Form
that can be filled in from a photo of the paper form.

Developed as a thesis project using the Rapid Application Development (RAD) model. The
study evaluates OCR accuracy, document validation accuracy, and usability against
applicable ISO/IEC 25010 characteristics.

---

## Test accounts

All three accounts share one password: **`CbluTest123!`**

| Role | Name | Email | What to try |
|---|---|---|---|
| Client | Maria Santos | `maria.santos@cblu.test` | Upload documents, fill in or scan the loan form, chat with a live agent |
| Administrator | Grace Fernandez | `grace.fernandez@cblu.test` | View clients, add checklist items, post announcements |
| Live agent | Carlo Ramirez | `carlo.ramirez@cblu.test` | Claim and answer live chats, read closed chats |

They are created by `db/seed-users.sql`. They are for testing only: replace or remove
them before real clients use the system.

**Demoing live chat:** a browser window can only be logged in as one person at a time.
Open a normal window for Maria and a private (incognito) window for Carlo, side by side.

1. As Maria, open the chat, ask a question, then tap **Need a person? Chat with a live agent**.
2. As Carlo, Maria appears in the **Queue** within a few seconds. Click her, then **Claim this chat**.
3. Message back and forth. Either side can end the chat; it then appears under Carlo's **Closed** tab.

---

## What each user can do

**Guests** (not logged in)
- Read about CBLU, its services and branch location.
- Ask the chatbot, which appears on every page, about accounts, loans, requirements,
  logging in, branches and hours.
- Log in. Asking the chatbot for a person prompts them to log in first.

**Clients**
- See an overview: checklist progress, the latest announcements and verification status.
- Upload a photo of each required document. OCR reads it and checks for the required
  keywords, then shows **Valid** or **Needs attention** with the reason.
- Fill in the Business Loan Application (Individual/Sole-Proprietorship): 41 fields in
  5 sections, saved and resumable. A photo of the filled paper form auto-fills email,
  mobile number and TIN, and never overwrites a value the client typed.
- Chat with a live agent. The agent sees the conversation the client had with the bot.
  Messages arrive within about 3 seconds, and the chat survives page changes and refreshes.

**Administrators**
- View all clients with their branch, verification status and checklist progress.
- Add checklist items, including the keywords OCR must find in each document.
- Post, edit and delete announcements, which clients see on their overview.

**Live agents**
- See waiting chats appear on their own, with the client's bot conversation.
- Claim a chat (only one agent can claim each), reply, and close it.
- Read the transcripts of closed chats.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS 4, Motion, Leaflet (map) |
| Backend | Vercel serverless functions (Node.js) |
| Database | PostgreSQL on Neon, connected through Vercel |
| Login | bcryptjs password hashing, JWT session in an HTTP-only cookie (7 days) |
| OCR | Tesseract.js 7 |
| File uploads | formidable |
| Hosting | Vercel (free Hobby plan) |

**How it fits together.** The browser only talks to the serverless functions in `api/`,
and only those reach the database. Every function checks the user's session and role
on the server, not just in the browser. OCR runs inside the upload functions. Uploaded
images are deleted after reading; only the extracted text and the result are kept. Live
chat has no open connection: both sides ask `api/chat.js` for new messages every few
seconds (polling), because Vercel's free plan cannot hold connections open.

---

## Project structure

```
CBLU-Connect/
├── api/                          Serverless functions. EVERY .js file here is one
│   │                             Vercel function — the free plan allows 12; this uses 11
│   ├── auth/
│   │   ├── login.js              POST — check email + password, set the session cookie
│   │   ├── logout.js             POST — clear the session cookie
│   │   └── me.js                 GET  — who is logged in
│   ├── admin/
│   │   ├── clients.js            GET  — all clients + checklist progress
│   │   └── checklist-items.js    GET/POST — checklist items
│   ├── client/
│   │   └── checklist.js          GET  — the client's own checklist and statuses
│   ├── documents/
│   │   └── upload.js             POST — OCR an uploaded document and check its keywords
│   ├── forms/
│   │   ├── application.js        GET/PUT — loan form fields + the client's saved answers
│   │   └── ocr.js                POST — scan a photo of the paper loan form
│   ├── announcements.js          GET (any logged-in user) · POST/PUT/DELETE (admin)
│   └── chat.js                   Live chat: start, queue, claim, send, close (?action=…)
│
├── server/                       Shared backend code, kept OUTSIDE api/ so it doesn't
│   │                             count as a function
│   ├── auth.js                   Password hashing, sessions, requireRole()
│   ├── db.js                     Database connection (SSL always on)
│   ├── ocr.js                    Tesseract.js runner + accepted image types
│   ├── validateDocument.js       Keyword check for OCR text
│   └── formAutofill.js           Finds email, mobile number and TIN in OCR text
│
├── db/
│   ├── Schema.sql                Core tables (users, chats, checklists, documents)
│   ├── seed.sql                  The New Savings Account checklist + 3 required items
│   ├── seed-users.sql            The three test accounts
│   ├── forms_schema.sql          Loan application form tables
│   ├── forms_seed.sql            The Individual/Sole-Proprietorship loan form (41 fields)
│   ├── announcements_schema.sql  Announcements table
│   └── run-sql.js                node db/run-sql.js <file> — runs a .sql file
│
├── src/
│   ├── App.jsx                   Routes, role guards, and the site-wide chatbot
│   ├── layouts/DashboardLayout.jsx   Sidebar + top bar shared by all dashboards
│   ├── components/
│   │   ├── ChatWidget.jsx        The chatbot + live chat, shown on every page
│   │   ├── DynamicFormField.jsx  Draws one loan form field from the database
│   │   ├── ChatMessageBubble.jsx Chat bubble for the agent pages
│   │   ├── RequireRole.jsx       Sends users to /login or their own dashboard
│   │   └── …                     Landing page sections (Hero, About, Features, map…)
│   ├── lib/
│   │   ├── chatRules.js          Chatbot replies, and which messages mean "get me a person"
│   │   ├── chatApi.js            Calls api/chat.js
│   │   ├── *Context.js / *Provider.jsx   Shared state: login, chat, checklist,
│   │   │                                 admin data, agent queue
│   │   └── mockClient.js / mockAdmin.js  Remaining sample data (see status below)
│   └── pages/
│       ├── LandingPage.jsx, LoginPage.jsx
│       ├── client/               Overview, Documents, Loan Application, Profile
│       ├── admin/                Overview, Clients, Announcements, Checklists, Reviews
│       └── agent/                Queue, Closed
│
├── eng.traineddata               Tesseract's English language file (packed into the OCR
│                                 functions by vercel.json)
└── vercel.json                   Page routing, OCR time limits, files packed with OCR
```

---

## Running it on your computer

**1. Install**

```
npm install
```

**2. Environment variables.** Create `.env.local` in the project root. It is already
gitignored; never commit it.

```
DATABASE_URL=postgresql://...   # from your Neon database (Vercel → Storage)
JWT_SECRET=...                  # any long random string
```

Generate a `JWT_SECRET` with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add both to Vercel too (Settings → Environment Variables). `vercel dev` reads the
Development values from Vercel once the project is linked.

**3. Database.** Run each file once, in this order. Neon's browser query editor can't
run files with several statements, so use the helper script:

```
node db/run-sql.js db/Schema.sql
node db/run-sql.js db/seed.sql
node db/run-sql.js db/seed-users.sql
node db/run-sql.js db/forms_schema.sql
node db/run-sql.js db/forms_seed.sql
node db/run-sql.js db/announcements_schema.sql
```

An "already exists" error means that file has already been run. If your database has
loan form or announcement tables from an older version of this project, drop them
first and then run the last three files again.

**4. Start it**

```
vercel dev
```

Use `vercel dev`, not `npm run dev`. `npm run dev` serves only the website, without
the `api/` functions.

---

## Deploying on Vercel

- **Branches.** Every pushed branch gets its own preview address. The `main` branch is
  the live site.
- **Who can open it.** Preview addresses ask for a Vercel login by default; the main
  (production) address is public. Present from the production address.
- **Environment variables.** `DATABASE_URL` and `JWT_SECRET` need **Production** (and
  **Preview**, for preview links) ticked. Redeploy after changing them.
- **12-function limit.** The free plan allows 12 functions per deployment, and every
  `.js` file in `api/` counts. This project uses 11. Put shared code in `server/`, and
  add a new action to an existing endpoint rather than a new file where possible.
- **OCR.** `vercel.json` gives the two OCR functions 60 seconds. It also packs
  Tesseract's engine files and `eng.traineddata` into them; without that, OCR crashes
  once deployed.
- **Before a demo.** Neon's free database sleeps when unused, so the first request after
  a while takes a few extra seconds. Open the site and log in once beforehand.

---

## Current status

| Feature | Status |
|---|---|
| Login, logout, role-based pages and API | Done |
| Chatbot on every page (rule-based replies in `chatRules.js`) | Done |
| Live chat between client and agent | Done — polling every 3–4 seconds |
| Client: document checklist with OCR validation | Done — JPG, PNG or WebP images |
| Client: loan application form + photo scan | Done — Individual/Sole-Proprietorship form |
| Client: overview with announcements | Done — verification status is still sample data |
| Client: profile page | Partial — name is real; other fields are sample data |
| Admin: clients, checklist items (add), announcements | Done |
| Admin: overview counts | Partial — pending-review count is sample data |
| Admin: document review queue | Sample data only, not yet connected |
| Agent: queue, claim, reply, close, closed chats | Done |

---

## Known gaps

- **Uploads are images only.** OCR can't read PDFs or iPhone HEIC photos, so those are
  refused with a message asking for a JPG, PNG or WebP.
- **Original document images aren't kept.** Only the OCR text and result are saved, so
  an admin review screen could never show the actual image. Keeping images would need
  file storage (for example Vercel Blob) and a new column on `document_uploads`.
- **Checklist items** can be added but not yet edited or removed.
- **Loan form:** there's no PDF download or print yet. The repeating tables (trade
  references, existing deposits, loans and credit cards) and the
  Cooperative/Partnership/Corporation form aren't included. Admins can't view
  submitted applications yet.
- **Live chat** is for logged-in clients only. There is no "no agent online" notice;
  a client simply waits in the queue.
- **Chatbot replies** live in `chatRules.js`. The `chatbot_rules` table exists but isn't
  used yet.

---

## Still waiting on CBLU

- The final list of documents clients must upload, with the keywords each must contain.
  This drives `db/seed.sql` and the admin Checklists page.
- The information the bank needs to open an account. This may add fields to
  `client_profiles`.

## Next steps

1. Load CBLU's final document list into the checklist.
2. Decide whether to keep original images, then connect the admin review queue.
3. Fill the client profile from `client_profiles`.
4. Allow editing and removing checklist items.
5. Optionally move chatbot replies into the `chatbot_rules` table so admins can edit them.


## Owner
**Liv Clarence Torres**