# CBLU Connect

A web portal for the **Cooperative Bank of La Union (CBLU)** that improves information
dissemination, client communication and the loan application process. Clients get a
chatbot that can hand them to a live agent, and an online version of CBLU's **Loan
Application Form (Individual and Sole Proprietor, CBLU REV. 2023)**:

1. The client uploads a photo of **one valid ID** — PhilSys National ID, Driver's License
   or Passport.
2. OCR reads the ID and fills in **only the matching fields** of the application form:
   name, extension name, date of birth, sex, citizenship, permanent address and civil
   status (whichever the ID shows).
3. The client completes the rest and gets a **ready-to-print, filled-out application
   form**, followed by the **list of other documents** to bring.
4. The client ticks the documents they already have. The bank can see each client's
   progress. It is only a checklist: **no documents are uploaded or stored**.

Developed as a thesis project using the Rapid Application Development (RAD) model. The
study evaluates OCR field-extraction accuracy and usability against applicable ISO/IEC
25010 characteristics.

---

## Test accounts

All three accounts share one password: **`CbluTest123!`**

| Role | Name | Email | What to try |
|---|---|---|---|
| Client | Maria Santos | `maria.santos@cblu.test` | Scan an ID into the loan form, print it, tick requirements, chat with a live agent |
| Administrator | Grace Fernandez | `grace.fernandez@cblu.test` | See each client's progress, edit the requirements list, post announcements |
| Live agent | Carlo Ramirez | `carlo.ramirez@cblu.test` | Claim and answer live chats, read closed chats |

They are created by `db/seed-users.sql`. They are for testing only: replace or remove
them before real clients use the system.

**Trying the ID scan without a real ID:** `tests/ocr-samples/` has specimen cards of
fictional people (marked "SPECIMEN - NOT A REAL ID"). On the Loan Application page,
choose `tests/ocr-samples/standard/p2_philsys_front_photo.jpg` as the front and
`p2_philsys_back_photo.jpg` as the back, then press **Read my ID**.

**Demoing live chat:** a browser window can only be logged in as one person at a time.
Open a normal window for Maria and a private (incognito) window for Carlo, side by side.

1. As Maria, open the chat, ask a question, then tap **Need a person? Chat with a live agent**.
2. As Carlo, Maria appears in the **Queue** within a few seconds. Click her, then **Claim this chat**.
3. Message back and forth. Either side can end the chat; it then appears under Carlo's **Closed** tab.

---

## What each user can do

**Guests** (not logged in)
- Read about CBLU, its services and branch location.
- Ask the chatbot, which appears on every page, about loans, valid IDs, requirements,
  printing the form, logging in, branches and hours.
- Log in. Asking the chatbot for a person prompts them to log in first.

**Clients**
- See an overview: the latest announcements, how far their loan application is, and
  which requirements they have ready.
- **Loan Application:** upload a photo of the front of a valid ID (and, for a PhilSys ID,
  the back). The scan fills the borrower fields that appear on that ID and says which it
  filled, which it couldn't read, and anything to double-check. A scan never overwrites a
  value the client typed. Photos are shrunk in the browser before upload and deleted right
  after reading; neither the photo nor the ID's text is saved.
- Complete the rest of the form (99 fields in 6 sections, saved and resumable). Optional
  sections — spouse, collateral, co-makers — start folded away.
- **Print form:** CBLU's form laid out like the paper original on long bond paper
  (8.5 × 13 in; A4, Letter and Legal also fit), with the client's answers filled in, the
  borrower's printed name on the signature line, and blank space for everything the form
  keeps on paper (bank and other assets, credit information, references, signatures,
  For Bank's Use Only). The last page is the requirements checklist with their ticks.
- **Requirements:** tick each document they already have.
- Chat with a live agent. The agent sees the conversation the client had with the bot.

**Administrators**
- See every client: application progress (not started / required fields filled / form
  complete), which ID filled it, and how many requirements they've ticked — open a client
  to see exactly which.
- Add, edit and remove items on the requirements checklist.
- Post, edit and delete announcements, which clients see on their overview.

**Live agents**
- See waiting chats appear on their own, with the client's bot conversation.
- Claim a chat (only one agent can claim each), reply, and close it.
- Read the transcripts of closed chats.

---

## OCR accuracy

`node scripts/ocr-accuracy.mjs <folder>` runs the same scan as the live site on every
test case in a folder and compares each field it reads with the expected value
(`cases.json`). A field counts as correct only if it matches exactly, ignoring case,
spaces and punctuation.

Results on the specimen sets in `tests/ocr-samples/` (each ID as a flat "clean" scan
and as a tilted, blurred "photo"):

| Set | What it is | Fields correct |
|---|---|---|
| `standard` | 4 people × 3 IDs, used while building the parser | 183 / 184 — **99.5%** |
| `unseen` | 6 different people, another font; kept back and run once before any fix | 261 / 276 — **94.6%** (first run) · 95.7% now |
| `hard` | 6 people, another font, small photos with heavy shadows | 247 / 276 — **89.5%** |
| All | | 694 / 736 — **94.3%** |

The ID type was recognised in all 96 cases. Birth date, sex, civil status and
citizenship were 100% correct. Most misses are addresses (one wrong character fails the
whole field) and names with **Ñ**, which OCR always reads as N (18 of the 42 misses) —
the page reminds clients to check this. A scan takes about 2–4 seconds here; allow more
on Vercel.

These are synthetic cards, so they measure the software, not real-world photos. For the
study, collect photos of real IDs **with each owner's written consent**, write their
`cases.json`, and run the script on that folder. Delete the photos when done.

How the scan works (`server/ocr.js`, `server/idParsers.js`, `server/idScan.js`):
1. Each photo is turned upright, grayscaled and resized to 1600 px wide, then read by
   Tesseract in "single block" mode.
2. The ID type is recognised from its printed headings. Values are read from under their
   labels; when a label is lost, from the order the card prints them. Dates, sex and civil
   status are normalised to the form's options. On passports, the birth date is read from
   the machine-readable lines and checked with their check digits.
3. If fields the ID shows are still missing, the photos are read again with shadows
   evened out, and the gaps filled.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS 4, Motion, Leaflet (map) |
| Backend | Vercel serverless functions (Node.js) |
| Database | PostgreSQL on Neon, connected through Vercel |
| Login | bcryptjs password hashing, JWT session in an HTTP-only cookie (7 days) |
| OCR | Tesseract.js 7, with sharp for photo clean-up |
| File uploads | formidable |
| Hosting | Vercel (free Hobby plan) |

**How it fits together.** The browser only talks to the serverless functions in `api/`,
and only those reach the database. Every function checks the user's session and role
on the server, not just in the browser. ID photos go to `api/forms/ocr.js`, are read, and
are deleted; only the form values, the ID type, the time and OCR's confidence are saved.
The printable form is built in the browser from the saved values. Live chat has no open
connection: both sides ask `api/chat.js` for new messages every few seconds (polling),
because Vercel's free plan cannot hold connections open.

---

## Project structure

```
CBLU-Connect/
├── api/                          Serverless functions. EVERY .js file here is one
│   │                             Vercel function — the free plan allows 12; this uses 10
│   ├── auth/
│   │   ├── login.js              POST — check email + password, set the session cookie
│   │   ├── logout.js             POST — clear the session cookie
│   │   └── me.js                 GET  — who is logged in
│   ├── admin/
│   │   ├── clients.js            GET  — clients + progress; ?id= one client's ticks
│   │   └── checklist-items.js    GET/POST/PUT/DELETE — the requirements checklist
│   ├── client/
│   │   └── checklist.js          GET/PUT — the client's requirements and their ticks
│   ├── forms/
│   │   ├── application.js        GET/PUT — loan form fields + the client's answers
│   │   └── ocr.js                POST — read an ID photo and fill the matching fields
│   ├── announcements.js          GET (any logged-in user) · POST/PUT/DELETE (admin)
│   └── chat.js                   Live chat: start, queue, claim, send, close (?action=…)
│
├── server/                       Shared backend code, kept OUTSIDE api/ so it doesn't
│   │                             count as a function
│   ├── auth.js                   Password hashing, sessions, requireRole()
│   ├── db.js                     Database connection (SSL always on)
│   ├── ocr.js                    Photo clean-up (sharp) + Tesseract.js runner
│   ├── idParsers.js              Reads PhilSys / Driver's License / Passport text
│   ├── idScan.js                 One scan: first pass, second pass if fields are missing
│   └── loanForm.js               Loads the loan form template and saved answers
│
├── db/
│   ├── Schema.sql                Core tables (users, chats, requirements checklist)
│   ├── seed.sql                  The "Loan Application Requirements" checklist (10 items)
│   ├── seed-users.sql            The three test accounts
│   ├── forms_schema.sql          Loan application tables
│   ├── forms_seed.sql            CBLU's 2023 loan form: 99 fields, 9 filled from an ID
│   ├── announcements_schema.sql  Announcements table
│   ├── migrate_id_scan.sql       ONE-TIME update for a database set up before Oct 2026
│   └── run-sql.js                node db/run-sql.js <file> — runs a .sql file
│
├── src/
│   ├── App.jsx                   Routes, role guards, and the site-wide chatbot
│   ├── layouts/DashboardLayout.jsx   Sidebar + top bar shared by all dashboards
│   ├── components/
│   │   ├── ChatWidget.jsx        The chatbot + live chat, shown on every page
│   │   ├── DynamicFormField.jsx  Draws one loan form field from the database
│   │   ├── RequireRole.jsx       Sends users to /login or their own dashboard
│   │   └── …                     Landing page sections (Hero, About, Features, map…)
│   ├── lib/
│   │   ├── idPhoto.js            Shrinks an ID photo to a JPEG before upload
│   │   ├── applicationStatus.js  "Not started / N of M required / Form complete"
│   │   ├── chatRules.js          Chatbot replies, and which messages mean "get me a person"
│   │   ├── chatApi.js            Calls api/chat.js
│   │   ├── *Context.js / *Provider.jsx   Shared state: login, chat, checklist,
│   │   │                                 admin data, agent queue
│   │   └── mockClient.js         Profile page sample data (see status below)
│   └── pages/
│       ├── LandingPage.jsx, LoginPage.jsx
│       ├── client/               Overview, Loan Application, Requirements, Profile,
│       │                         ClientLoanApplicationPrint.jsx (+ its .css)
│       ├── admin/                Overview, Clients, Announcements, Requirements
│       └── agent/                Queue, Closed
│
├── scripts/ocr-accuracy.mjs      Measures OCR accuracy on a folder of ID photos
├── tests/ocr-samples/            Specimen ID photos + expected values; make_ids.py
│                                 regenerates them (Python + Pillow)
├── eng.traineddata               Tesseract's English language file (packed into the OCR
│                                 function by vercel.json)
└── vercel.json                   Page routing, OCR time limit, files packed with OCR
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

**3. Database.**

*New database* — run each file once, in this order:

```
node db/run-sql.js db/Schema.sql
node db/run-sql.js db/seed.sql
node db/run-sql.js db/seed-users.sql
node db/run-sql.js db/forms_schema.sql
node db/run-sql.js db/forms_seed.sql
node db/run-sql.js db/announcements_schema.sql
```

*Database set up before the ID-scan change (October 2026)* — run only this, once:

```
node db/run-sql.js db/migrate_id_scan.sql
```

It replaces the old loan form tables with CBLU's 2023 form, removes the document upload
tables, adds the tick-only checklist and the new requirements list. It keeps users,
announcements and chats, but deletes saved loan applications and uploads (test data).
It runs as one transaction: if anything fails, nothing changes.

Neon's browser query editor can't run files with several statements, so always use the
helper script. An "already exists" error means that file has already been run.

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
  `.js` file in `api/` counts. This project uses 10. Put shared code in `server/`, and
  add a new action to an existing endpoint rather than a new file where possible.
- **OCR.** `vercel.json` gives `api/forms/ocr.js` 60 seconds and packs Tesseract's engine
  files and `eng.traineddata` into it; without that, OCR crashes once deployed. sharp
  installs its Linux version on Vercel by itself.
- **Before a demo.** Neon's free database sleeps when unused, so the first request after
  a while takes a few extra seconds. Open the site and log in once beforehand.

---

## Current status

| Feature | Status |
|---|---|
| Login, logout, role-based pages and API | Done |
| Chatbot on every page (rule-based replies in `chatRules.js`) | Done |
| Live chat between client and agent | Done — polling every 3–4 seconds |
| Client: ID scan fills the loan form (PhilSys, Driver's License, Passport) | Done |
| Client: CBLU 2023 loan form online, printable on long bond paper | Done |
| Client: tick-only requirements checklist, printed with the form | Done |
| Client: overview with announcements and progress | Done |
| Client: profile page | Partial — name is real; other fields are sample data |
| Admin: client progress, requirements checklist (add/edit/remove), announcements | Done |
| Agent: queue, claim, reply, close, closed chats | Done |

---

## Known gaps

- **Valid IDs.** Only PhilSys National ID, Driver's License and Passport are read. Other
  IDs (UMID, postal ID, voter's ID…) get a message listing the accepted ones. Adding one
  means a new reader in `server/idParsers.js`.
- **Ñ** is read as N. Clients are asked to check names after a scan.
- **Driver's licenses** print the first and middle names together, so the split is a
  best guess (the client is told to check it).
- **Photos** must be something the browser can open (JPG, PNG, WebP; HEIC works in Safari).
  PDFs are refused.
- **Accuracy figures** come from synthetic specimen cards, not real ID photos.
- **The application is printed, not submitted online.** The bank sees how far a client is,
  but receives the signed form and documents on paper.
- **Live chat** is for logged-in clients only. There is no "no agent online" notice.
- **Chatbot replies** live in `chatRules.js`. The `chatbot_rules` table exists but isn't
  used yet.

---

## Still waiting on CBLU

- The final list of valid IDs to accept.
- The final list of requirements (the 10 items in `db/seed.sql` are placeholders; admins
  can edit them on the Requirements page).
- Whether the officers' names should be pre-printed under "For Bank's Use Only"
  (`BANK_SIGNATORIES` in `ClientLoanApplicationPrint.jsx`).

## Next steps

1. Load CBLU's final ID list and requirements.
2. Measure OCR accuracy on real ID photos (with consent) for the study.
3. Fill the client profile from `client_profiles`.
4. Optionally move chatbot replies into the `chatbot_rules` table so admins can edit them.
