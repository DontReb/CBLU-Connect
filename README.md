# CBLU Connect

A web portal for the **Cooperative Bank of La Union (CBLU)** that improves information
dissemination, client communication and the loan application process. Clients get a
chatbot that can hand them to a live agent, and an online version of CBLU's **Loan
Application Form (Individual and Sole Proprietor, CBLU REV. 2023)**:

1. The client uploads a photo of **one valid ID** — PhilSys National ID, Driver's License
   or Passport.
2. OCR reads the ID and finds **only the matching fields** of the application form:
   name, extension name, date of birth, sex, citizenship, permanent address and civil
   status (whichever the ID shows).
3. A **live face check** with the camera follows: **face verification** (the face matches
   the ID photo) and **liveness detection** (a real person, not a photo or a video — the
   screen flashes colours and the client turns their head left and right). Only when it
   passes are the ID's values filled into the form. Three failed checks in a day lock
   scanning until the next day; the client can verify at a branch and still type the form.
4. The client completes the rest and gets a **ready-to-print, filled-out application
   form**, followed by the **list of other documents** to bring.
5. The client ticks the documents they already have. The bank can see each client's
   progress. It is only a checklist: **no documents are uploaded or stored**.

Developed as a thesis project using the Rapid Application Development (RAD) model. The
study evaluates:

| Feature | Metrics |
|---|---|
| OCR | Character Error Rate (CER), Word Error Rate (WER) |
| Face verification | True Acceptance Rate (TAR), True Rejection Rate (TRR), False Acceptance Rate (FAR), False Rejection Rate (FRR), Equal Error Rate (EER) — ISO/IEC 19795-1 |
| Liveness detection | APCER, BPCER (ISO/IEC 30107-3), ACER, average processing time |
| Whole system | Usability against applicable ISO/IEC 25010 characteristics |

---

## Test accounts

All three accounts share one password: **`CbluTest123!`**

| Role | Name | Email | What to try |
|---|---|---|---|
| Client | Maria Santos | `maria.santos@cblu.test` | Scan an ID, pass the face check, print the form, tick requirements, chat with a live agent |
| Administrator | Grace Fernandez | `grace.fernandez@cblu.test` | See each client's progress and face checks, edit the requirements list, post announcements, record face check tests |
| Live agent | Carlo Ramirez | `carlo.ramirez@cblu.test` | Claim and answer live chats, read closed chats |

They are created by `db/seed-users.sql`. They are for testing only: replace or remove
them before real clients use the system.

**Wrong passwords.** After 5 wrong passwords within 15 minutes, logging in to that account
pauses for 15 minutes (and 20 wrong passwords from one internet address pause that
address). If you lock a test account while testing, wait 15 minutes, or run this in
Neon's SQL Editor:

```
DELETE FROM login_attempts WHERE email = 'maria.santos@cblu.test';
```

**New client accounts** are made by an administrator: **Clients → Add client**. There's no
public sign-up, so the bank decides who gets an account. Leave the password empty to get a
generated one (like `Kp7m-Qx3t-Rw9z`); it is shown once, with a button to copy the login
details for the client.

**Trying the ID scan without a real ID:** `tests/ocr-samples/` has specimen cards of
fictional people (marked "SPECIMEN - NOT A REAL ID"). On the Loan Application page,
choose `tests/ocr-samples/standard/p2_philsys_front_photo.jpg` as the front and
`p2_philsys_back_photo.jpg` as the back, then press **Read my ID**. The scan works, but
the face check will say it can't find the photo on the ID: the specimen cards have a grey
silhouette, not a face. To demo the whole flow, scan **your own** ID and do the face check
yourself (nothing is saved).

**Face check tips:** use a phone or a laptop with a front camera, over HTTPS (any Vercel
address) or `localhost`. Turn the screen brightness up and face a light. Each failed check
uses one of the day's 3 tries; to reset a test account's tries, delete its rows from
`identity_checks`.

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
  printing the form, logging in, branches and hours. The chat can be expanded to full
  screen (Esc shrinks it back).
- Log in. Asking the chatbot for a person prompts them to log in first.

**Clients**
- See an overview: the latest announcements, how far their loan application is, and
  which requirements they have ready.
- **Loan Application:** upload a photo of the front of a valid ID (and, for a PhilSys ID,
  the back). The scan shows what it read and what it will fill, which it couldn't read,
  and anything to double-check. Then a **face check** (about 20 seconds): look straight,
  hold still while the screen flashes colours, turn left and right as asked, look straight
  again. If it passes, the values go into the form, marked "From your ID". A scan never
  overwrites a value the client typed. After 3 failed checks in a day, scanning is locked
  until the next day and the client is told to verify at a branch; they can still type the
  form by hand. Photos and camera pictures are deleted right after checking; neither they,
  nor the ID's text, nor any face data is saved.
- Complete the rest of the form (99 fields in 6 sections, saved and resumable). Optional
  sections — spouse, collateral, co-makers — start folded away. **Clear form** erases every
  answer (after a confirmation), including the last scan's details.
- **Print form:** CBLU's form laid out like the paper original on long bond paper
  (8.5 × 13 in; A4, Letter and Legal also fit), with the client's answers filled in, the
  borrower's printed name on the signature line, and blank space for everything the form
  keeps on paper (bank and other assets, credit information, references, signatures,
  For Bank's Use Only). The last page is the requirements checklist with their ticks.
- **Requirements:** tick each document they already have.
- **Announcements:** every announcement from the bank, newest first (the overview shows
  the latest three).
- Chat with a live agent. The agent sees the conversation the client had with the bot.

**Administrators**
- Create client accounts (name, email, and optionally mobile number, branch, account
  number and password).
- See every client: face check status (verified / failed today / locked), application
  progress (not started / required fields filled / form complete), which ID filled it, and
  how many requirements they've ticked — open a client to see their latest face checks
  (result, reason, scores, time) and exactly which documents they ticked.
- **Face check tests:** record test sessions with consenting volunteers (real person,
  printed photo, phone/tablet screen) for measuring accuracy. Recordings download to the
  admin's computer only.
- Add, edit and remove items on the requirements checklist.
- Post, edit and delete announcements, which clients see on their overview.

**Live agents**
- See waiting chats appear on their own, with the client's bot conversation.
- Claim a chat (only one agent can claim each), reply, and close it.
- Read the transcripts of closed chats.

---

## The face check

After the ID is read, the client does one live check in front of the camera. It gives
two separate results, both decided **on the server** from the pictures (the browser only
guides the client):

**Face verification** — is the person at the camera the person on the ID? The face on
the ID photo and the face in the "look straight" picture are each turned into 128
numbers (SFace) and compared (cosine similarity, 1 = identical). At or above the
threshold (default **0.363**, OpenCV's suggested value for SFace) they match.

**Liveness detection** — is a real, live person there, not a printed photo or a video on
a screen? Everything below must hold:

| Check | What it catches |
|---|---|
| **Screen flashes** — 6 random colours (with black between). The colour the screen throws on the face must follow the sequence (at least 5 of 6). | A pre-recorded video can't know the colours in advance. |
| **Head turns** — left and right, in a random order. The nose must move sideways relative to the eyes. | A flat photo has no depth: tilting it barely moves the nose relative to the eyes. |
| **Passive anti-spoofing** — MiniFASNet looks at the two straight-on pictures and scores "real face" (0–1, must be ≥ 0.5). | Print texture, screen moiré, photo edges. |
| **Same person throughout** — every picture of the check must show the same face. | Swapping a photo in and out between steps. |

The flow can't be cheated from the browser: the challenge (colours, turn order) is made
by the server, signed, valid for 5 minutes and usable once; the scanned ID values travel
in a signed token and are written only after a pass; and the ID photo at the face check
must be byte-for-byte the photo that was scanned (SHA-256 fingerprint).

**Privacy.** The ID photo and the 16 camera pictures are deleted as soon as they're
checked. No pictures or face data (embeddings) are stored. `identity_checks` keeps only
the result, the reason it failed, the scores and the times, for the admin and for
measuring.

**Models** (in `models/face/`, run with ONNX Runtime's WebAssembly build on the server;
YuNet also runs in the browser for live guidance):

| Model | Job | Source and licence |
|---|---|---|
| YuNet (2026may, dynamic input) | Finds faces and 5 landmarks | OpenCV Zoo · MIT · Wu, Peng & Yu (2023), *Machine Intelligence Research* 20, 656–665 |
| SFace (2021dec) | Face → 128 numbers for matching | OpenCV Zoo · Apache-2.0 · Zhong et al. (2021), *IEEE Trans. Image Processing* 30, 2587–2598 |
| MiniFASNetV2 + MiniFASNetV1SE (80×80) | Real face vs photo/screen | Minivision Silent-Face-Anti-Spoofing · Apache-2.0 · converted from PyTorch to ONNX (outputs checked equal) |

All three licences allow use by the bank.

**Thresholds** can be changed without code, as Vercel environment variables:
`FACE_MATCH_THRESHOLD` (default 0.363), `FACE_REAL_THRESHOLD` (0.5),
`FACE_SESSION_THRESHOLD` (same person across pictures, 0.3). Set them from your own
measurements (below) — the defaults come from the model authors, not from ID photos.

**OCR and the portrait.** The ID's portrait sits right next to the text, and Tesseract
reads bits of it as letters ("LW © GARCIA"). The face detector now finds the portrait and
blanks it before OCR.

---

## Measuring accuracy

### OCR — CER and WER

`node scripts/ocr-accuracy.mjs <folder>` runs the same scan as the live site on every
test case in a folder (`cases.json` lists the photos and expected values) and reports,
on the values that go into the form:

- **CER** (Character Error Rate) = (S + D + I) ÷ N — characters substituted, deleted and
  inserted to turn what was read into the expected value (Levenshtein distance), divided
  by the number of expected characters, added up over all fields.
- **WER** (Word Error Rate) — the same, counting words.
- **Field accuracy** — fields read exactly right (case, spaces and punctuation ignored).

Case and extra spaces are ignored for CER/WER; punctuation and Ñ count. Lower is better.

Results on the specimen sets in `tests/ocr-samples/` (each ID as a flat "clean" scan and
as a tilted, blurred "photo"):

| Set | What it is | CER | WER | Fields correct |
|---|---|---|---|---|
| `standard` | 4 people × 3 IDs, used while building the parser | **0.05%** | **0.30%** | 183 / 184 (99.5%) |
| `unseen` | 6 different people, another font; kept back and run once before any fix | **1.08%** | **4.60%** | 264 / 276 (95.7%; 94.6% on the first run) |
| `hard` | 6 people, another font, small photos with heavy shadows | **3.91%** | **9.92%** | 247 / 276 (89.5%) |
| All | 96 ID scans, 8,030 characters, 1,320 words | **1.94%** | **5.61%** | 694 / 736 (94.3%) |

Clean scans: CER 0.3%, WER 1.5%. Phone-style photos: CER 3.6%, WER 9.7%. Birth date,
sex, civil status and citizenship had no errors; most errors are in names and addresses,
and names with **Ñ**, which OCR always reads as N. The ID type was recognised in all 96.
A scan takes about 2–3 seconds here.

These are synthetic cards, so they measure the software, not real-world photos. For the
study, collect photos of real IDs **with each owner's written consent**, write their
`cases.json`, run the script on that folder (`--csv results.csv` saves every field), and
delete the photos when done.

How the scan works (`server/ocr.js`, `server/idParsers.js`, `server/idScan.js`):
1. Each photo is turned upright, the portrait blanked, grayscaled and resized to 1600 px
   wide, then read by Tesseract in "single block" mode.
2. The ID type is recognised from its printed headings. Values are read from under their
   labels; when a label is lost, from the order the card prints them. Dates, sex and civil
   status are normalised to the form's options. On passports, the birth date is read from
   the machine-readable lines and checked with their check digits.
3. If fields the ID shows are still missing, the photos are read again with shadows
   evened out, and the gaps filled.

### Face verification and liveness detection

**1. Record sessions with volunteers.** Log in as an admin and open **Face check tests**.
For each session, enter the volunteer's code (P01, P02… — no names), what is in front of
the camera, the ID photo, and tick that they signed the consent form. The session runs
the same camera steps as a client's face check and downloads a `.zip` to that computer
(ID photo, 16 pictures, `session.json`). Nothing is sent to the server.

A suggested protocol (adjust to your adviser's guidance):

| Recording | Per volunteer | Notes |
|---|---|---|
| Real person | 3 | Different times/lighting if possible |
| Attack: printed photo | 2 | A colour print of the volunteer's face, held up to the camera |
| Attack: phone/tablet screen | 2 | The volunteer's photo or a video of them, shown on a second device |

With 30 volunteers that is 90 real-person sessions, 2,610 impostor pairs (each session
against the other 29 volunteers' IDs) and 120 attacks. With fewer pairs, FAR can't be
measured finely: with 100 impostor pairs, one false accept is already 1%.

**2. Measure.**

```
node scripts/face-eval.mjs <folder with the .zip files> --csv sessions.csv --roc roc.csv
```

Every session goes through `server/face/verify.js`, the code that decides a real face
check, and the script reports:

- **Face verification** (ISO/IEC 19795-1). Genuine pairs: each real-person session vs.
  that volunteer's own ID. Impostor pairs: each real-person session vs. every other
  volunteer's ID.
  - **TAR** = genuine pairs accepted ÷ genuine pairs
  - **FRR** = 1 − TAR
  - **FAR** = impostor pairs accepted ÷ impostor pairs
  - **TRR** = 1 − FAR
  - **EER** = the error rate where FAR = FRR, and the threshold where that happens

  `roc.csv` has TAR/FAR/FRR/TRR at every threshold, for a ROC or DET chart. Re-run with
  `--threshold 0.40` to see another operating point.
- **Liveness detection** (ISO/IEC 30107-3).
  - **APCER** = attacks accepted as a real person ÷ attacks, for each attack type; the
    highest is reported.
  - **BPCER** = real people rejected as an attack ÷ real-person sessions.
  - **ACER** = (APCER + BPCER) ÷ 2. ACER isn't defined in ISO/IEC 30107-3; it comes from
    the OULU-NPU benchmark. Report it only next to APCER and BPCER.
  - **Average processing time**: the server's decision time per session, and the time the
    person spent in front of the camera.

  An attack that can't even finish the camera steps (e.g. a photo can't turn its head)
  counts as rejected and is listed as a non-response.

Processing time from the live site (Vercel), after real use:

```sql
SELECT count(*), round(avg(processing_ms)) AS avg_processing_ms, round(avg(capture_ms)) AS avg_capture_ms
FROM identity_checks;
```

Recordings contain faces and ID cards: personal data under the Data Privacy Act of 2012
(RA 10173), and ID details count as sensitive personal information. Keep them in a
protected folder, share them only within the study, and delete them when it ends.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS 4, Motion, Leaflet (map) |
| Backend | Vercel serverless functions (Node.js) |
| Database | PostgreSQL on Neon, connected through Vercel |
| Login | bcryptjs password hashing, JWT session in an HTTP-only cookie (7 days), limit on wrong passwords |
| OCR | Tesseract.js 7, with sharp for photo clean-up |
| Face check | ONNX Runtime Web 1.30 (WebAssembly, in the browser and on the server) running YuNet, SFace and MiniFASNet |
| File uploads | formidable; fflate zips test recordings in the browser |
| Hosting | Vercel (free Hobby plan) |

**How it fits together.** The browser only talks to the serverless functions in `api/`,
and only those reach the database. Every function checks the user's session and role
on the server, not just in the browser. ID photos go to `api/forms/ocr.js`, are read, and
are deleted; the values come back in a signed token. The face check's pictures go to
`api/identity/face.js`, which decides, deletes them, and only then saves the form values,
the ID type, the time, OCR's confidence and the check's result.
The printable form is built in the browser from the saved values. Live chat has no open
connection: both sides ask `api/chat.js` for new messages every few seconds (polling),
because Vercel's free plan cannot hold connections open.

---

## Project structure

```
CBLU-Connect/
├── api/                          Serverless functions. EVERY .js file here is one
│   │                             Vercel function — the free plan allows 12; this uses 11
│   ├── auth/
│   │   ├── login.js              POST — check email + password (with the attempt limit), set the session cookie
│   │   ├── logout.js             POST — clear the session cookie
│   │   └── me.js                 GET  — who is logged in
│   ├── admin/
│   │   ├── clients.js            GET  — clients + progress; ?id= one client's ticks
│   │   │                         POST — create a client account
│   │   └── checklist-items.js    GET/POST/PUT/DELETE — the requirements checklist
│   ├── client/
│   │   └── checklist.js          GET/PUT — the client's requirements and their ticks
│   ├── forms/
│   │   ├── application.js        GET/PUT — loan form fields + the client's answers
│   │   └── ocr.js                POST — read an ID photo; returns what it will fill
│   ├── identity/
│   │   └── face.js               GET — a new face check challenge · POST — decide the
│   │                             face check, then fill the form from the scan
│   ├── announcements.js          GET (any logged-in user) · POST/PUT/DELETE (admin)
│   └── chat.js                   Live chat: start, queue, claim, send, close (?action=…)
│
├── server/                       Shared backend code, kept OUTSIDE api/ so it doesn't
│   │                             count as a function
│   ├── auth.js                   Password hashing, sessions, requireRole()
│   ├── loginLimit.js             Wrong-password limit: 5 per account, 20 per address, 15-minute pause
│   ├── db.js                     Database connection (SSL always on)
│   ├── ocr.js                    Photo clean-up (sharp, portrait blanked) + Tesseract.js
│   ├── idParsers.js              Reads PhilSys / Driver's License / Passport text
│   ├── idScan.js                 One scan: first pass, second pass if fields are missing
│   ├── loanForm.js               Loads the loan form template and saved answers
│   ├── identity.js               Signed scan/challenge tokens, 3-tries lock, filling the form
│   └── face/
│       ├── models.js             Loads the ONNX models once per server instance
│       ├── image.js              Decode, crop, resize, straighten faces (pure JS + sharp)
│       ├── detect.js             YuNet face finding
│       ├── match.js              SFace: face → 128 numbers, cosine similarity
│       ├── antispoof.js          MiniFASNet: real face vs photo/screen
│       ├── flash.js              Did the face's colour follow the flashes?
│       └── verify.js             The decision: face verification + liveness, thresholds
│
├── shared/face/                  Used by both the browser and the server
│   ├── yunet.js                  YuNet input/output decoding
│   ├── pose.js                   Head turn from the 5 landmarks
│   └── challenge.js              Flash colours, timings, random challenge, picture names
│
├── models/face/                  yunet.onnx, sface.onnx, minifasnet_v2.onnx,
│                                 minifasnet_v1se.onnx (packed into the functions by
│                                 vercel.json), their licences, and a README on sources
│
├── db/
│   ├── Schema.sql                Core tables (users, chats, requirements checklist)
│   ├── seed.sql                  The "Loan Application Requirements" checklist (10 items)
│   ├── seed-users.sql            The three test accounts
│   ├── forms_schema.sql          Loan application tables
│   ├── forms_seed.sql            CBLU's 2023 loan form: 99 fields, 9 filled from an ID
│   ├── announcements_schema.sql  Announcements table
│   ├── migrate_id_scan.sql       ONE-TIME update for a database set up before Oct 2026
│   ├── migrate_face_check.sql    ONE-TIME update adding the face check tables
│   ├── migrate_login_limit.sql   ONE-TIME update adding the login_attempts table
│   └── run-sql.js                node db/run-sql.js <file> — runs a .sql file
│
├── src/
│   ├── App.jsx                   Routes, role guards, and the site-wide chatbot
│   ├── layouts/DashboardLayout.jsx   Sidebar + top bar shared by all dashboards
│   ├── components/
│   │   ├── ChatWidget.jsx        The chatbot + live chat, shown on every page
│   │   ├── FaceCheck.jsx         The face check's camera screen
│   │   ├── DynamicFormField.jsx  Draws one loan form field from the database
│   │   ├── RequireRole.jsx       Sends users to /login or their own dashboard
│   │   └── …                     Landing page sections (Hero, About, Features, map…)
│   ├── lib/
│   │   ├── face/detector.js      Live face finding in the browser (guidance only)
│   │   ├── face/capture.js       Runs the camera steps and takes the 16 pictures
│   │   ├── idPhoto.js            Shrinks an ID photo to a JPEG before upload
│   │   ├── applicationStatus.js  "Not started / N of M required / Form complete"
│   │   ├── chatRules.js          Chatbot replies, and which messages mean "get me a person"
│   │   ├── chatApi.js            Calls api/chat.js
│   │   ├── *Context.js / *Provider.jsx   Shared state: login, chat, checklist,
│   │   │                                 admin data, agent queue
│   │   └── mockClient.js         Profile page sample data (see status below)
│   └── pages/
│       ├── LandingPage.jsx, LoginPage.jsx
│       ├── client/               Overview, Loan Application, Requirements, Announcements, Profile,
│       │                         ClientLoanApplicationPrint.jsx (+ its .css)
│       ├── admin/                Overview, Clients, Announcements, Requirements,
│       │                         AdminFaceTest.jsx (records test sessions)
│       └── agent/                Queue, Closed
│
├── public/models/face/yunet.onnx The face finder, served to the browser
├── scripts/
│   ├── ocr-accuracy.mjs          OCR: CER, WER, field accuracy on a folder of ID photos
│   ├── face-eval.mjs             Face check: TAR, TRR, FAR, FRR, EER, APCER, BPCER, ACER, time
│   └── convert-face-models.py    Rebuilds the anti-spoofing models from PyTorch (optional)
├── tests/ocr-samples/            Specimen ID photos + expected values; make_ids.py
│                                 regenerates them (Python + Pillow)
├── eng.traineddata               Tesseract's English language file (packed into the OCR
│                                 function by vercel.json)
└── vercel.json                   Page routing, time limits, files packed with OCR and the face check
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

Optional, after measuring the face check: `FACE_MATCH_THRESHOLD`, `FACE_REAL_THRESHOLD`,
`FACE_SESSION_THRESHOLD` (see "The face check").

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

*Database set up before the ID-scan change (October 2026)* — run this, once:

```
node db/run-sql.js db/migrate_id_scan.sql
```

It replaces the old loan form tables with CBLU's 2023 form, removes the document upload
tables, adds the tick-only checklist and the new requirements list. It keeps users,
announcements and chats, but deletes saved loan applications and uploads (test data).
It runs as one transaction: if anything fails, nothing changes.

*Database set up before the face check* — run this, once (after the one above, if you
needed that too):

```
node db/run-sql.js db/migrate_face_check.sql
```

It adds the `identity_checks` table and two columns to `form_submissions`, and keeps all
data. Running it twice does no harm.

*Database set up before the login attempt limit* — run this, once:

```
node db/run-sql.js db/migrate_login_limit.sql
```

It adds the `login_attempts` table and keeps all data. Running it twice does no harm.
Until it's run, every login fails with "Login failed".

Neon's browser query editor can't run files with several statements, so always use the
helper script. An "already exists" error means that file has already been run.

**4. Start it**

```
vercel dev
```

Use `vercel dev`, not `npm run dev`. `npm run dev` serves only the website, without
the `api/` functions. The camera works on `localhost`; from another device (a phone),
open a Vercel preview address, since browsers only allow the camera over HTTPS.

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
- **OCR.** `vercel.json` gives `api/forms/ocr.js` 60 seconds and packs Tesseract's engine
  files and `eng.traineddata` into it; without that, OCR crashes once deployed. sharp
  installs its Linux version on Vercel by itself.
- **Face check.** `vercel.json` gives `api/identity/face.js` 60 seconds and packs the four
  models and ONNX Runtime's WebAssembly file into it (about 90 MB of the 250 MB allowed).
  The first check after the function has been idle loads the models, so it takes a few
  seconds longer; after that a decision takes 1–2 seconds.
- **Before a demo.** Neon's free database sleeps when unused, so the first request after
  a while takes a few extra seconds. Open the site and log in once beforehand.

---

## Current status

| Feature | Status |
|---|---|
| Login, logout, role-based pages and API | Done |
| Login attempt limit (5 wrong passwords → 15-minute pause; 20 per address) | Done |
| Chatbot on every page (rule-based replies in `chatRules.js`) | Done |
| Live chat between client and agent | Done — polling every 3–4 seconds |
| Client: ID scan fills the loan form (PhilSys, Driver's License, Passport) | Done |
| Client: live face check (face verification + liveness) before filling; 3 tries a day | Done |
| Client: CBLU 2023 loan form online, printable on long bond paper | Done |
| Client: tick-only requirements checklist, printed with the form | Done |
| Client: overview with announcements and progress | Done |
| Client: profile page | Partial — name is real; other fields are sample data |
| Admin: client progress, requirements checklist (add/edit/remove), announcements | Done |
| Admin: face check status and history per client; test session recorder | Done |
| Accuracy scripts: OCR (CER, WER); face (TAR, TRR, FAR, FRR, EER, APCER, BPCER, ACER, time) | Done — waiting on volunteer recordings for face figures |
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
- **Accuracy figures** come from synthetic specimen cards, not real ID photos. The face
  check has no figures yet: they need recordings of real volunteers.
- **Face check thresholds** are the model authors' defaults. ID photos are small and
  printed, so the best match threshold for them may be lower; set it from the volunteer
  results (EER, or a FAR the bank accepts).
- **Face check scope.** It stops printed photos, photos and videos on a screen, and
  pre-recorded videos. It is not certified (e.g. iBeta ISO 30107-3), and it doesn't defend
  against 3D masks or a video fed in through a fake ("virtual") camera. It needs a front
  camera and reasonable light, and the flashing may not suit people sensitive to it — they
  are told to verify at a branch.
- **The application is printed, not submitted online.** The bank sees how far a client is,
  but receives the signed form and documents on paper.
- **Passwords** can't be reset or changed in the portal yet; a client who forgets one asks
  the branch. The login pause lifts on its own after 15 minutes — admins can't lift it early.
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
2. Measure OCR on real ID photos, and record face check sessions with volunteers
   (both with written consent) for the study; set the face check thresholds from them.
3. Fill the client profile from `client_profiles`.
4. Optionally move chatbot replies into the `chatbot_rules` table so admins can edit them.

## Owner

**Liv Clarence Torres**
