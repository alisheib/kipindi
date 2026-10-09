# CONTACTS SCREEN — the importer and the screen's hardening (lane S15)

**STATUS — 🟢 OPEN · 2026-10-09 · Ali-Blade15 · each step its own branch, merged and pushed to main step by step.**
✅ Importing a file IS LIVE on /admin/contacts since `df835bb5` (2026-10-09 04:17 EAT) — §0 says what is live and what is next.

> This file is the plan AND the progress record of the contacts-screen lane. Read §0 first. The rest of the
> marketing programme (the campaigns) is tracked in [`MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`](MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md).

---

## §0 — RESUME AT

```
LANE SPLIT (Ali, 2026-10-09 ~00:30 EAT — his words: "lets do something else and push live … how to handle import of
contacts, make it more solid, duplicate detection ui ux, perfection of visuals, validations, crash control, stress
testing everything … keep the original plan for them, let them finish it, make your own progress and push live";
then: "the contacts screen"):

  S15 (Ali-Blade15) OWNS the contacts screen, /admin/contacts:
    · the importer — U30 (the pre-flight), U31-B (the facts loader and the choice for numbers already in the book),
      U32 (the commit loop and its bar, resumable), U34b (an export read back through the importer)
    · duplicate detection — inside a file, against the book, and on Add contact
    · every field's validation, the screen's visuals at every width and language, crash control, stress tests
  S14 (OMEGA-COMPILE01) KEEPS the campaign path — the marketing tracker's §0 ▶ NEXT (the owner texts on production,
    U47b-2, U48a, licence outreach, the dry-fire, U52a, the admin guide v2, the clean-up).
  ⛔ Neither session starts or pushes the other's units. Files both lanes touch (contacts-copy.ts, page.tsx,
    package.json, the marketing tracker) are MERGED, never overwritten.
  ⭐ S14's admin guide (scripts/live/admin-guide.mjs, importShots — on origin/backup/marketing-s14-guide) already
    pictures the import by these data-block names, so S15 builds the dialog to them: contacts-import, import-entrance,
    import-adopt, import-preflight, import-file, import-mapping, import-mapping-next, import-apply, import-commit,
    import-done, and the dev seed POST /api/dev-test/marketing-contacts-seed?u30=1.

▶ NOW (2026-10-09 ~06:00 EAT, Ali-Blade15) — where every piece is, for a session on ANY machine:
  · LIVE on www.50pick.tz, each read back by `?dpl=` and /api/health: C1 `28fd214e` · C2 `8adbdd9f` + `d9c9df5f` ·
    THE IMPORTER (C3–C5) `df835bb5`, served since 01:16:59 UTC 2026-10-09 (04:17 EAT), the database MIGRATED
    (`20261009120000_contact_import_target_list`) · C6's big-file drive `9121d857` + `3fbceb46` · C7's export round
    trip `e47ef26e`. Each step's proof is its §1 row; the importer's is below.
  · IN FLIGHT (three builds; each lands only after its own battery, nothing half-done goes to main):
    1. C3b — ⛔ HELD for its review round (§1 row C3b): the fix round C3b-fix is being built on `contacts-c3b-fix`
       (checkout `C:\kipindi-c3bfix`), decisions D1–D10 in §4.6 (S15-14). Then a full battery, then C3b + C3b-fix to main.
    2. C3c — big workbooks read in the browser, being built on `contacts-c3c` (checkout `C:\kipindi-s15`), design §4.5
       (S15-13); it merges C3b-fix's shared sheet choice and title-row rule before its own battery.
    3. C8 — S14's importer review (`docs/marketing-specs/S14-IMPORTER-REVIEW.md` on `origin/backup/marketing-s14-import`,
       fifteen findings against S14's own importer, "S15's design meets the same questions") CHECKED against this live
       importer (2026-10-09 ~06:00 EAT, read-only): 4, 6, 7, 8, 9, 10 and 11 do not apply; what applies, with four new
       finds, is §1 row C8 — the gravest: an ERASED person with no book row is re-created by a later import (or the Add
       form) once an old /s/ link adds a later ledger row, or at once when they had opted out before the erasure.
    Builders run Node only under the heavy-node lock; both checkouts' `node_modules` are junctions into
    `C:\kipindi-marketing` (never `npm ci` there). The integrator's tree is `C:\kipindi-marketing` (`contacts-c3b-int`).
  · ⏳ THE LIVE CHECK ON PRODUCTION — written and wired (`npm run qa:contacts-import-live`, LIVE_IMPORT_CHECK=1 + the
    git-ignored secrets file): it imports `prod-check-40.csv` through the real dialog only if the check reads 34 new ·
    0 in the book · 3 repeated · 3 invalid, then removes every contact it added through the bulk Remove. NOT RUN: the
    session's safety classifier refused the production write (2026-10-09 ~04:30 EAT) — it waits for Ali's own go.
    ⛔ A TEMPORARY GROWTH LOGIN EXISTS FOR IT on production — "QA Import Check (Claude)", +255 700 000 091,
    `usr_af44b503dd3d9c18d4f905bc` (made through `ops:provision-staff`, audited `staff.provisioned`; management approved
    the QA GROWTH login on 2026-10-07, COMPLIANCE-DECISIONS item 6). Its password lives ONLY in Ali-Blade15's session
    scratchpad (a git-ignored env file) — if that PC is gone, the check cannot run with it. REMOVE ITS STAFF ACCESS when
    the check is done or abandoned (Ali's rule of 2026-10-08: "delete them when done testing"): Ali, signed in as the
    Owner → /admin/staff → "QA Import Check (Claude)" → role **Player**, reason "QA import login no longer needed" —
    `setStaffRoleAction`, audited `staff.role_changed`, its sessions revoked at once. (No door deletes an account; a
    Player account with no known password and no staff role is inert.)
  · ⏳ ASKED Ali (2026-10-09 ~01:15 EAT; defaults if unanswered = (a), except 2): 1 who imports (a: Growth + Admin) ·
    2 several numbers per person — ⚠️ CORRECTED to Ali the same night: the default is ONE MAIN NUMBER PER PERSON (S15-4),
    because two SIMs of one person double the cost and the complaint risk, and complaints get the 50pick sender name
    blocked — which also stops login codes; "every mobile its own contact" is a separate step ONLY on Ali's explicit
    choice (and S15-14 / C3e now govern a row with two mobiles) · 3 a "pick from this phone" button (a: no) · 4 a live
    check on production with Claude's own temporary login and a 40-row file, deleted afterwards (a: yes — every
    production write still needs his click on the permission prompt).
  · THE IMPORTER'S PROOF (battery 3, 2026-10-09 ~04:10 EAT, on `87d3e319` + the plant fix `b6faaffb`, before the push):
    prisma generate 0 · typecheck 0 · `next build` 0 · `test:contacts-import-db` 45/0 on PostgreSQL 18.3 (real
    concurrency, conflict rollbacks, the NULL-arm trap, the list foreign key, 20,000 rows settled once each in 9.7 s, p95
    0.19 s a step) · contacts-import 285/0 + red 308/308 · dal-parity + red (every case, §29 included) · red-anchors ·
    contacts-staging/-boundary/-form/-page/-bulk/-export/-lists + reds · 61 suites in all · the drive
    `qa:contacts-import` 761/0 over the 28 generated files at 360 and 1280 · admin-section-gate 21/0 · admin-action-gate
    15/0 · the U20 drive 487/0 · the C2 checks 12/0 · repo clean after.
  ⛔ If this PC is gone: every commit of this lane is on origin — main, and the branches `contacts-c3b`,
    `contacts-c3b-int`, `contacts-c3b-fix`, `contacts-c3c` (each builder pushes every commit). Nothing lives only on
    Ali-Blade15 but the scratchpad (logs, screenshots, the builders' briefs — their substance is §4.5 and §4.6 — and the
    QA login's password).
  ⭐ AFTER A POWER-OFF OR REBOOT OF ALI-BLADE15 (Ali, 2026-10-09 ~02:00 EAT: "if the PC turns off, when I say proceed it
    means we're up"): (1) `bash ~/heavy-node-lock.sh status` — a lock naming a `contacts-*`, `c3c-builder` or
    `c3bfix-builder` job that no process runs (`Get-CimInstance Win32_Process`, by command line) is released, re-reading
    the owner IMMEDIATELY before the `rm`; (2) kill any `next dev` left on port 3101; (3) `git status` in
    `C:\kipindi-marketing`, `C:\kipindi-s15` and `C:\kipindi-c3bfix` — commit and push anything on disk before anything
    else; (4) a builder that died with the PC is re-launched from its §4 section, told what its branch already holds.
```

## §1 — STEPS (each its own commit, push and live proof)

| # | Step | State |
|---|---|---|
| C1 | The lane claimed and this plan written | ✅ LIVE `28fd214e` |
| C2 | Audit of the LIVE screen — 43 viewport tiles at 360 / 768 / 1280 / 1440 (the console is English-only), GROWTH and ADMIN, the add dialog's states, bulk, the hard-case rows, the error state: no page overflow anywhere. FOUND AND FIXED: **F1** a number TYPED as `+254 712 345 678` read "a landline in Katavi, Mbeya…" (the box drops the "+") → judged as written once its digits leave +255 (`contactNumberVerdict` typedPlus; `test:contacts-form` 1.5c + plant); **F2** at 360 the sideways-scrolling table showed names only → the masked number and operator under the name below 640px, from the server's masked projection (U19's one render kept); **F3** "20 selected" broke over two lines → the count keeps its measure; **F4** the bulk note promised consent recording "which this page doesn't take yet" → true under the final rule (a list reaches a non-player). NOT CHANGED (recorded): the filter rail is long at 360 for ADMIN; the KPI tiles stack one per row at 360 (the platform's band). PROVEN: the four suites + their reds, typecheck, `next build`, the U20 drive 487/0, and 12 browser checks of F1–F4 at 360 and 1280 (C2-verify). LIVE `8adbdd9f` (served 23:34 UTC 2026-10-08). ⚠️ F2 first shipped its line at 11px (`text-micro`), which `test:type-scale` §3 counts as sub-floor reading copy (751 against 750 — a check the C2 push did not run); caught by the importer's second battery and moved to `text-body-sm` (13px) in `d9c9df5f`, §3 back at 750 | ✅ LIVE |
| C3 | The importer, part 1 — the file, the columns, the check (U30 + U31-B): staging only, nothing written to the book | ✅ LIVE `df835bb5` — proof in §0 |
| C4 | The importer, part 2 — the commit loop and its bar (U32): counted by the server, resumable after a closed tab or a crash | ✅ LIVE `df835bb5` — proof in §0 |
| C5 | Duplicate detection, seen and decided: repeats inside a file, numbers already in the book (keep · use the file's · fill blanks — readers only, S15-10), the list step | ✅ LIVE `df835bb5` — proof in §0 |
| C3b | The readers made forgiving of real files — found by the generator's author reading the shipped readers against the 28 files (2026-10-09): **G1** a CSV with ONE broken quote is refused whole (`messy-real-life.csv`, `unterminated_quote` at its last record) → offer the rows before it, the broken record named; **G2** a workbook whose first visible sheet is a cover page finds no Phone column (`excel-multi-sheet.xlsx`) → read the sheet that holds the phones, and say which; **G3** two numbers in one phone cell (Google's ` ::: `, "0712… / 0754…") are invalid → take the first mobile, say so; **G4** Outlook's number in Business / Home / Primary while Mobile is empty is lost → fall back to the other phone columns. Proven with the generator's files | ⛔ HELD for its review round. Built (`579f194d`, plant fix `3127bb3c`; integrated on `contacts-c3b-int`); battery 2026-10-09 ~05:40 EAT: typecheck, `next build`, 52 suites + reds green, the big drive (150,000 rows and cards, exact) and the round trip pass. The adversarial review then found a BLOCKER — a phone cell of 200,000 spaces made the split quadratic inside a server action (the live money server) — and four MAJOR defects: G4 took Outlook's Assistant's / Company Main Phone and weak "Namba" columns as the person's number; G1's counts said "every row counted" while an unclosed quote had swallowed lines; G2 judged a sheet by its first row alone (a title row lost the customers to a 25-row staff sheet); and a second MOBILE in a row was never checked against the stop list or an erasure. → the fix round **C3b-fix** (branch `contacts-c3b-fix`; its decisions D1–D10 in §4.6, S15-14 in §4.3) |
| C6 | Stress: large files at the limits, through the REAL dialog on a local server (`npm run qa:contacts-import-big`, after `qa:contacts-import-files -- --big`): a 150,000-row CSV — check exactly the generator's truth (137,806 new · 9,200 repeated · 2,994 invalid), imported whole (read 0.2 s · upload + check 5.1 s · import 29.9 s); 150,000 vCards imported whole (138,071 added; read 0.9 s · 5.6 s · 31.4 s); a 42 MB vCard with photos read in 0.4 s (streamed; photos never uploaded) and checked; one row past 200,000 REFUSED with the cap named; a 1.4 MB workbook REFUSED with the save-as-CSV remedy. Two runs at once and a crash mid-commit: proven on PostgreSQL by `test:contacts-import-db` (5c, 5d–5i) and in `qa:contacts-import` (reload → adopt → resume) | ✅ LIVE `9121d857` + `3fbceb46` (a drive and its record — run locally; re-run green on C3b, 2026-10-09 ~05:38 EAT) |
| C7 | U34b — an export read back through the importer, row for row (`npm run qa:contacts-import-roundtrip`): a reader's FULL export of 49 contacts (the hard cases among them — a comma and doubled quotes in a name, formula-looking names, a line break in a note) imported back: all 49 "already in the book", nothing new, repeated, invalid or unreadable; under "use the file's version" NOTHING differs (no changes listed; 0 new · 0 updated · 49 kept); the result 0 added · 0 updated · 49 kept · 0 failed. A MASKED export (GROWTH) is refused whole in words ("These numbers are masked…"), no way on | ✅ LIVE `e47ef26e` |
| C3c | A big Excel workbook read in the officer's browser — over 700 KB (about 25,000 rows), refused today with "save it as CSV", a remedy that can turn a 12-digit number into `2.55713E+11` for good. A workbook of 700 KB or less keeps the proven server path; the new reader is held to it by shared cell rules and a differential test (design §4.5, S15-13) | 🔨 building (branch `contacts-c3c`, checkout `C:\kipindi-s15`) |
| C3e | Several mobile numbers for one person, in EVERY format — a vCard already chooses one TEL (live since U26) and the person's other numbers are never checked: before a row is imported on one number, its other numbers are looked up, and a row whose other number is on the stop list, erased or already in the book is kept as it is (one person, one contact) | ⬜ designed after C3b-fix — until then S15-14 holds (CSV / Excel: exactly one distinct mobile per row, or the row is refused in words) |
| C8 | The LIVE importer's review round — S14's fifteen findings checked against this build (6 apply in part or whole) + four new finds. **MAJOR:** (#2 + N2) an erased person with NO book row is recognised only while the consent ledger's LATEST word is the erasure marker — a later Stop/Resume tap on an old /s/ link, or an opt-out BEFORE the erasure (erase.ts then writes no marker at all), lets an import or the Add form create them again with their name; (#3) a list's member figure counts only members not linked to an account, so a masked officer who imports one number into a list learns from the figure whether it is a player's (D19); (N1) the Add form answers a tombstoned number "This number can't be added to the book" — an erasure (and a former account) revealed. **MINOR:** (#1) an erased number reads "already in the book" in the check while the search cannot find it; (N3) list names are unique whatever their case only in code, not in the database; (N4) a 200,000-row check reads ~400 pages without yielding to queued bets; (#14) refusal audit rows are never pruned, and a persistent P2028/P2024 is retried forever as "bets come first"; (#13) tags not added (a contact full of tags) are never shown; (#5) the start's new-list branch and `listOpenByOthers` never ran on PostgreSQL; (#12) several dialog paths never driven (✕ during a commit, Stop during an upload or a busy wait, an existing list, an exception under KEEP); (#15) a resume of a STAGED run is untested | split in three: **C8a** 🔨 building (branch `contacts-c8a`, checkout `C:\kipindi-c8`, from main, ships alone — S15-15: an erasure stands until a new consent, a later opt-out never lifts it; erase.ts always writes the marker; the Add form asks the same rule) · **C8b** designed (§4.7, S15-16; owner questions 1–3 asked) — built after C8a · **C8c** the robustness items (N3 with the other session's finished `b97fed35`, N4, #14, #13, #5, #12, #15) — after C8a and C3b-fix |

## §2 — WHAT EXISTED WHEN THE LANE BEGAN (read from the code, 2026-10-09 ~00:30 EAT)

⚠️ The STARTING POINT, kept as the record — not today's state: the importer is live since `df835bb5`, and the "not live
yet" empty state is gone. Today's state is §0 and §1.

- **Live on /admin/contacts:** the list, the filters, Add contact and edit, bulk actions, the Lists card, Export CSV.
  The page's own empty state says "importing a file is not live yet".
- **Built, reached by nothing yet:** the CSV reader (U25), the vCard reader (U26), the XLSX guard (U27), the one field
  list (U28), the staging table `ContactImport` / `ContactImportRow` (U29 ✅), the pure import rule `decide()` (U31-A).
- **Missing:** the upload door (D18: no uploader, and a 1 MB server-action ceiling), the column mapping, the pre-flight
  screen (D19: a pre-flight must never say how many rows are players), the facts loader, the commit loop, the bar.
- **Designs on file** (written 2026-10-01/02, BEFORE U25–U29 were built — re-read against the code before building):
  `docs/marketing-specs/U29.md` … `U34.md`, `DECISIONS-U29-U40.md`, `CRITIC-U29-U40.md`.

## §4 — THE IMPORTER: the design (S15, 2026-10-09)

### §4.1 — Ali's requirements, in his words
"I don't have any files — create your own, use it, then delete the data you imported" · "super sophisticated to handle
any extreme normal-life scenarios from all types of imports, Excels, contact lists from phones" · "extreme UI handling
and user leading and safety and ease of use" · "push live when done — we cannot have undone work on this PC".
And from 2026-09-25: "it's 150k approx contacts, or VCF … it could be small and could be large" — both ends.

### §4.2 — What the officer sees (one dialog, one step at a time, never a dead end)
1. **Contacts → Import contacts** (`contacts-import`, beside Add contact and Export). If the officer has an unfinished
   import, the dialog opens ON it ("You have an import that isn't finished — 1,847 of 5,912 rows done · Resume ·
   Discard") — a closed tab, a reload, a crash or a deploy never loses a file's progress.
2. **Choose a file** (`import-entrance`): drop or pick — Excel (.xlsx), CSV (any delimiter, any of the encodings Excel
   writes), a phone's contacts export (.vcf from iPhone, Android, Google), or **paste** (from Excel or a chat). The
   sample sheet is one tap away. Files the importer can't read (old .xls, .ods, .numbers, PDF, a picture) are named and
   told how to save them as .xlsx or CSV.
3. **Reading** — in the browser, streamed; the bar counts rows read. An Excel file is read by the server (≤ 700 KB;
   larger ones are told how to save as CSV, which has no such limit).
4. **The columns** (`import-mapping`): each column of the file, its first values, and what it will be read as (Phone ·
   Name · Email · Tags · Notes · Not used), matched automatically in English and Swahili; the officer can change any.
   A file with **no header row** is recognised ("Your file starts with a contact, not column names — column B will be
   read as the phone number") and imported from its first row.
5. **Uploading** — the rows go to the server in batches of ≤ 2,000 rows / 200 KB; the bar counts rows staged. Nothing
   is in the contact book yet.
6. **The check** (`import-preflight`): five boxes that add up to the file — **New to the book · Already in the book ·
   Repeated in this file** (the first row wins) **· Not a mobile number · Could not be read** — each problem row listed
   with its row number in the officer's own spreadsheet and one plain sentence ("Row 14: this is a Kenyan number").
   "Nothing has been written to the book yet."
7. **Numbers already in the book** (only when there are some): **Keep what's in the book** (recommended) · **Use the
   file's version** · **Only fill in what's missing** — each with its live count; the changes listed ("Row 9 · Asha →
   Asha Mwakalinga"), a page at a time, each with its own exception. A blank cell never erases anything; numbers on the
   stop list and erased people are never changed.
8. **The list** (`import-apply` area): add the contacts to an existing list, a new list, or none — and whether that
   list is ready for offers (its basis and 18+ recorded on the Lists card) or what to do so it is. The start button reads "Import 40 rows" with the breakdown on its own line above it ("This import: 37 new · 0 updated · 3 kept as they are") — a label never wider than its button at 360. A viewer who may not read numbers sees no choice: numbers already in the book are kept as they are (S15-10).
9. **Import** (`import-commit`): the bar counts rows DONE as the server reports them — never a timer. Stop / Resume. A
   closed window stops after the current batch; reopening resumes. Bets always come first (the import waits when the
   betting engine is busy).
10. **The result** (`import-done`): Added · Updated · Kept as they were · Couldn't be imported (each with its row and
    reason, a page at a time) · "Show the contacts this import added" · the list's state.

### §4.3 — Decisions taken in S15 (on Ali's delegation of technical calls; each with its reason)
- **S15-1 · No consent step in the import.** Ali's FINAL rule (2026-10-07, COMPLIANCE-DECISIONS) makes consent decide
  nothing; a non-member is reached through a LIST whose licence basis and 18+ confirmation are recorded on the Lists
  card (`consent.ts` contact branch: `standing.cover`). So the import writes no consent (OD10 holds) and asks for no
  basis: U33b's picker and U32's `no_basis` refusal are retired; the import ends at "which list", and the list's own
  card carries the basis.
- **S15-2 · The check has five boxes, not six — no "has a 50pick account" box for any role.** Every client is already a
  contact (`08add760`), so a player's number reads "already in the book" like any other; a separate count would be the
  membership oracle OD65–OD67 closed for the campaign (padding defeats any floor). D19 is closed by shape.
- **S15-3 · Kept rows split by reason only for a viewer who may read numbers** (OD54: a stop per row is a player
  signal). Everyone else reads one "kept as they were".
- **S15-4 · One phone number per person (pending Ali's answer to question 2 of 2026-10-09).** The readers already take
  a card's or a cell's main number; the result says how many people had another number that was not imported. If Ali
  chooses "every mobile number", that ships as its own step.
- **S15-5 · Headerless files are accepted** when the first row reads as a contact (`autoMapHeaders().headerless`):
  synthetic column names, the phone column found, the officer confirms — instead of the old "Add a header row" refusal.
- **S15-6 · The commit is time-boxed per step, not budget-measured.** Each step settles at most 500 rows in ONE
  transaction (compare-and-set on `committedThrough`, X3), refuses `busy` while bets queue, and the bar moves only on
  the server's cursor. This replaces U32's production ping measurement (`unmeasured`), which needed an admin session on
  production before any import could run.
- **S15-7 · The first-row rule at scale.** A step loads "the first decidable line of each of these numbers in this run"
  with ONE grouped read (`contactImportRow.firstLinesAmong`), never by re-walking up to 200,000 staged rows per step.
- **S15-8 · Settled rows are blanked** (data minimisation, tracker owed item): once a row is settled its name, email,
  notes, tags and raw phone are emptied in the staging table — the line, key, outcome and the failure sentence stay.
- **S15-9 · Nobody is ever stuck.** A paused or unfinished run can always be resumed or cancelled by its starter or an
  admin; cancelling after the start keeps the rows already written and says how many.
- **S15-10 · Only a role that can read numbers updates contacts already in the book from a file** (the review round,
  2026-10-09; OD54 · OD65). Everyone else imports with "keep what's in the book": the check folds every kept row into one
  number, shows no changes list, and a start with another choice is refused `update_needs_reader`. Why: an independent
  review showed a GROWTH officer could import a ONE-line file with an invented name under "use the file's version" and read
  "0 contacts change" exactly when that number was on the stop list or erased — a per-person fact OD54 gives readers only.
  No count or floor can close that (OD65: padding defeats any floor); taking the choice away from non-readers does.
- **S15-11 · An import never changes a contact linked to a 50pick account** (the review's finding 14): the account is the
  source of its details; "use the file's version" would have overwritten a player's registration row, email included.
  `decide()` keeps such a row (reason `account`, shown to readers).
- **S15-12 · Unfinished runs end and can be reached.** A PAUSED or COMMITTING run idle 14 days is cancelled by the nightly
  sweep (its unsettled rows deleted; the contacts already written stay — `docs/DATA-RETENTION.md`), and an ADMIN sees other
  officers' unfinished imports in the dialog and can resume or cancel them (X18 made reachable).
- **S15-13 · A workbook over 700 KB is read in the officer's browser (C3c, §4.5).** The cap exists only because a workbook
  is uploaded whole to ONE server action (Next's 1 MB body) and parsed on the live money server; reading it in the browser
  removes both, and keeping the server path for the small ones means a defect in the new reader touches only files that
  are refused today.
- **S15-14 · One distinct mobile per row, or the row is refused in words (C3b-fix D3).** A row is one person. When a row
  holds two DIFFERENT mobiles (two in one cell, or two across Outlook's / Google's other phone columns), the platform cannot
  yet check the other one against the stop list or an erasure — so it imports neither and says why ("keep one"), exactly
  as before C3b. A cell or row with ONE mobile among landlines, foreign numbers or labels yields that mobile. C3e lifts
  this with the look-up, for every format (a vCard already chooses one TEL today).
- **S15-15 · An erasure stands until a new consent (C8a).** One rule for a number with no book row: the latest of its
  ledger rows that is a GIVEN or an erasure marker is the marker. A later opt-out never lifts it (only a consent does —
  numbers are recycled, so the next holder can still say yes), erase.ts writes the marker even when the number had
  already opted out, and the importer, its commit and the Add form all ask the same rule.
- **S15-16 · What a masked officer may know (C8b, §4.7).** A typed number shows only whether the book would take it as
  new; B1, B2, B5, B6, B7 are technical calls taken; B3, B4 and B8 wait for Ali's answers.

### §4.4 — The build (files; each step committed and pushed when proven)
- Contract: `src/lib/contacts/import-flow.ts` (pure — the types and sentences both sides share).
- Server: `src/app/admin/contacts/import/import-actions.ts` (the ONE action file, X17) over
  `src/lib/server/contacts/import-check.ts` (the check + the changes pages + the facts loader),
  `src/lib/server/contacts/import-commit.ts` (start, step, pause, resume, cancel, failures, result), new DAL members
  in both twins (`contactImport.commitBatch`, `contactImport.freezeDecision`, `contactImportRow.firstLinesAmong`,
  `contactImportRow.failedPage`, `marketingContact.snapshotsAmong`) with a `test:dal-parity` section, and one additive
  migration (`ContactImport.targetListId`).
- Browser: `src/app/admin/contacts/import/contacts-import-dialog.tsx` and its step panels, `src/lib/contacts/import-read.ts`
  (file → rows, streamed; paste → rows), `src/lib/contacts/import-loop.ts` (the ONE driver for the upload and the
  commit), the button in the page head.
- Proof: `scripts/lib/real-world-contact-files.mts` (`npm run qa:contacts-import-files [-- --big]`: the files — Ali has
  none), the suites' new sections, the browser drive over every generated file at 360 and 1280 (`qa:contacts-import`),
  the stress run (`qa:contacts-import-big`: 150,000 rows; a 42 MB vCard), the export round trip
  (`qa:contacts-import-roundtrip`), and the live check on production with a 40-contact file that is deleted afterwards
  (`qa:contacts-import-live`).
  ⚠️ `test:docs` checks only `scripts/<file>` paths with no folder in them — a `scripts/<folder>/<file>` path in a doc is
  never checked (this line named a file that never existed until 2026-10-09). Read such a path before you trust it.

### §4.5 — C3c: a big workbook read in the officer's browser (designed 2026-10-09 ~05:45 EAT)
- **Why.** An .xlsx over 700 KB is refused with "save it as CSV" — and Excel writes a 12-digit number in General format
  to CSV as `2.55713E+11`, its last digits gone for good. The cap is the transport's, not the product's (S15-13).
- **What.** `src/lib/contacts/xlsx-read.ts` — pure and client-safe: the zip's central directory read from the file's tail,
  each part inflated by the platform's `DecompressionStream("deflate-raw")`, a streaming XML scan (local names, so the Open
  XML SDK's `x:` prefixes read; cells and rows without `r`; entities, CDATA, `_xHHHH_`), shared strings with rich text
  joined and phonetic runs left out, styles for dates (exceljs 4.4.0's own date-format test and serial, 1900 and 1904),
  formulas' cached values, merges, hidden sheets, the same caps and notes. The cell rules move to
  `src/lib/contacts/xlsx-cells.ts` and both readers import them; the sheet is chosen by C3b-fix's shared `chooseSheet`
  and the title row by its shared function. `readContactsFile` sends a workbook over the cap to it and returns the CSV
  path's outcome. A browser without `deflate-raw` gets today's refusal, never a crash.
- **Proof.** A differential section of `test:contacts-import`: the two readers give IDENTICAL files over a crafted corpus
  (Excel, phone apps' inline strings, the Open XML SDK, LibreOffice, Google; formulas with and without values, booleans,
  errors, dates, merges, a phone stored as a number, zip quirks) + red plants; `big-50k.xlsx` and a new `big-150k.xlsx`
  read through the real dialog (`qa:contacts-import-big`), the 150,000-row one imported.
- **If its builder died with Ali-Blade15:** re-launch one from this section and the branch's own commits
  (`origin/contacts-c3c`), telling it what is already there.

### §4.6 — C3b-fix: the review round's decisions (2026-10-09 ~05:50 EAT; branch `contacts-c3b-fix`)
- **D1 (the BLOCKER).** The phone-cell split is linear (a run of blanks is skipped whole) and never runs on a cell longer
  than the phone field's own limit (`CONTACT_LIMITS.phone`, 40 — a longer cell is invalid there already). Proven by
  timing a 200,000-space cell.
- **D2.** G4 reads only the person's OWN phone columns (Mobile, Business, Business 2, Home, Home 2, Other, Primary, Car;
  Google's "Phone N - Value"; the strong headings) — never Assistant's Phone, Company Main Phone, Callback, Pager, a Fax,
  Telex, TTY/TDD, ISDN or Radio, and never a weak alias (Number, Namba, Nambari, Contact).
- **D3 = S15-14.** Exactly one distinct mobile per row, or the row is refused in words; the added column carries every
  mobile of the row's own phone columns joined by " / ", so the server's one rule decides; the "rows with another number"
  count is removed for CSV, Excel and the paste table (the vCard count stays).
- **D4.** After a split, a bare nine-digit part is never a mobile ("+254, 712 345 678" must not become a stranger's
  +255 712 345 678); a whole cell of nine digits keeps today's reading.
- **D5.** An unclosed quote that swallows lines says how many lines after its row were not read — in the record's
  sentence, a note at the columns step and the sum lines (never "every row counted" then); it applies only after at least
  one data row, else the file is refused whole as before.
- **D6.** The sheet is chosen by its CONTENT through one shared function (`src/lib/contacts/sheet-choice.ts`,
  `chooseSheet`): the visible sheet whose first 200 non-empty rows hold the most mobiles; ties → tab order; the note
  names the sheet read (counted among visible sheets) and every other sheet with numbers that was NOT read.
- **D7 (G5).** A title above the column names, in every format: the first of the next nine rows that names a phone column
  becomes the header, and the rows above it are left out with a note.
- **D8.** The "no sheet has a phone column" hint comes from the reader, never from the officer's current choice.
- **D9 (pre-existing, D19).** The columns step masks a cell for a viewer who may not read numbers by its DIGITS (7 or
  more, whatever separates them) — "255,757,300,014" and "0712/345/678" were shown whole; the drive's privacy check
  counts digits too.
- **D10.** The phone-cell suite's never-failing key-shape half replaced.

### §4.7 — C8b: what a MASKED officer may know about a number (the survey of 2026-10-09 ~06:30 EAT, on main `171eb6c8`)
A masked officer = a role whose `identity.contact` cell is not `read` (roles.ts); of those, only GROWTH reaches
/admin/contacts and /admin/campaigns. The rules: **D19** (no player facts — setup doc ~1606, A1.1 ~2417, OD54 adds the
stop list ~1280; ⚠️ "D19" in COMPLIANCE-DECISIONS ~2334 is a house-bot rule of the same name) · **X22** ("a browser never
learns a number was erased", setup doc ~2862) · the residual Ali ACCEPTED (STEP 23, MARKETING-CAMPAIGN-HISTORY ~643):
"a whole-number lookup tells an officer a number is probably a client".
**What the survey found a masked officer can tell today** (O ordinary · P a player's · E erased · S stopped):
1. Add contact (lookup and Save; 30 a minute, no audit row): O/P/S "already in the book" + an Open link; E with a
   tombstone "This number can't be added to the book" (erasure revealed); E with only the ledger marker → "free", and
   Save re-creates the person (C8a).
2. A whole-number search finds O/P/S, never E; a sign-up row's "Added" is the account's sign-up date, so any "Added"
   before 2026-10-02 (when the book got its first writer) is certainly a player's — also through the Added sort, the
   `?to=` window, the edit dialog and the masked export.
3. The importer's check says "already in the book" for E while the search finds nothing (X22's disguise undone).
4. Importing onto a list: kept O/P/S rows join it, E never — then `?list=` shows the row or nothing.
5. A list's figure (`live`, store ~4077 / prisma-dal ~4760) leaves out account-linked rows and tombstones: a one-number
   list shows 1 for O/S, 0 for P or E; the composer's count includes linked rows, so composer − card = the exact count
   of player members; a member who signs up later drops out of the figure.
6. Bulk: a READER can make a tag or list from a filter GROWTH may not use (stopped, players); GROWTH then filters by it.
7–9. The edit dialog, the KPI tiles, the masked export: only what 2 and 5 already give, and an erasure makes a row vanish
   (observational, not probeable).
10. ⚠️ The /admin overview feed, seen by EVERY staff role, lists `contacts.contact.registered|linked` with the contact id —
   the same id is in each row's edit link: which rows are players, live, free.
11–14 (the campaign path, S14's lane): the audience count (raw; makes 5's subtraction work); the confirm card; a TEST SMS
   to a typed number — one sentence for every gate refusal, a real SMS on a pass, tightly rate-limited and audited
   (already an accepted residual, R3/A19); the dormant live page's tallies.
**The model:** to a masked officer a typed number shows ONE thing — whether the book would take it as new; "already in
the book" also covers a number the book must refuse because its holder was erased; no surface takes a masked officer
from a typed number to a row; no figure separates linked contacts from unlinked ones.
- **B1** one test, `bookBlocks(n)`: a tombstone, or an erasure marker with no GIVEN after it (C8a builds the ledger half
  and erase.ts always writing the marker). Lifted only by the holder's own act — a later GIVEN, or a NEW account
  registering the number (registration then revives the tombstone as the new client's linked row, in one transaction;
  erasure deletes the tombstone's list memberships so no old coverage is inherited).
- **B2** Add contact: a blocked number answers "already in the book" at the lookup and at Save; a masked viewer's answer
  never carries a contact id — the Open link becomes a reader's control.
- **B3** a masked WHOLE-NUMBER search answers a presence line only ("in the book" / "not in the book"), never rows; the
  bulk and export routes refuse a masked whole-number `q`. Name search unchanged. *(owner question 1)*
- **B4** a masked officer's import puts ONLY the contacts the run CREATED on its list (readers unchanged). *(question 1)*
- **B5** list figures by viewer: masked → all live members, linked included, coverage over the same set (= the
  composer's count); readers → today's exact figures plus "N with an account". Lists card, importer picker, result.
- **B6** the overview feed shows `contacts.contact.registered|linked` to COMPLIANCE only.
- **B7** tag and add-to-list are refused for EVERY viewer when the audience uses consent, stop, source or player.
- **B8** "Added" = when the row entered the book; the 54 rows back-filled on 2026-10-03 re-dated to that day — a
  production data fix *(question 3)*.
Unchanged on purpose: the unique index, the stop list (Add and import never refuse a stopped number — the gate refuses it
at send), X22's `shown`, S15-10, OD65/OD66. Residuals no change removes: the presence bit (accepted, STEP 23); a row,
tag or list member vanishing after an erasure (observational — looks like another officer's removal); readers keep their
views (they run erasures). **Shared with S14's campaign path** (their files or their reads — merge, never overwrite):
`roleRefusal` / `campaignAudienceRefusal`, erase.ts, registration-contact.ts, admin-overview-feed.ts, consent.ts ~486,
the test SMS, U47's stop line.
**⏳ ASKED Ali (2026-10-09 ~06:35 EAT), default (a) recommended:** 1 an erased person's number — (a) stays blocked until
its holder signs up or opts in again; GROWTH then checks a typed number only as "in the book / not", and GROWTH's
imports add only new contacts to a list · (b) counts as new the next time anyone adds it (an old spreadsheet can bring the
name back; B3, B4 dropped). 2 a test SMS to a typed number — (a) Admin and Compliance only, GROWTH tests on its own phone ·
(b) kept for GROWTH (S14's lane builds it). 3 re-date the 54 back-filled clients to "added 3 Oct" — (a) yes · (b) no.
**Technical calls taken (S15-16):** B1, B2, B5, B6, B7 are built in C8b after C8a lands; B3, B4 wait for answer 1; B8
for answer 3.

## §3 — LOG (newest first)

- **2026-10-09 ~06:00 EAT · C3b held; C3b-fix and C3c started; S14's findings being checked** — C3b's battery on
  `contacts-c3b-int` (`8323dd49`, then `84b1b844`): typecheck, `next build`, 52 suites + reds green; one plant
  (phone-cell 8) stayed green → made honest (`3127bb3c`, red then COMPLETE); `test:orphans` red on main since `b1dec89b`
  (two landing-v3 Workflow panel scripts — not this lane's, its allowlist "may only shrink"); one dev server came up with
  every route 500 on a next/font Inter glitch (the next one was clean — the follow-up battery now restarts a server whose
  `/` is not 200); the big drive (150,000 rows: 137,806 new · 9,200 repeated · 2,994 invalid, exact; import 36.0 s) and
  the round trip pass. The adversarial review → C3b HELD (§1 row) and the fix round C3b-fix (§4.6). C3c designed (§4.5)
  and started. S14's importer review (fifteen findings) handed to a reviewer against this live importer. Docs: the plan's
  head and §2 no longer say "not live"; the old U30/U31/U32/U34 specs carry what was built instead of their drives; the
  tracker's U34 commit is `e47ef26e`; the proof line names the generator's real path (`test:docs` never checks a
  `scripts/<folder>/` path).
- **2026-10-09 · C3b built, not yet run (branch `contacts-c3b`)** — G1 a CSV keeps every record before a quotation mark never closed and lists that record as ONE unreadable record (`csvUnclosedQuoteReason`; refused whole only when nothing before it was a record; a TAB paste still splits by hand); G2 the server reads the first VISIBLE sheet whose header row has a phone column and names it in a note (`xlsxChosenSheetNote`; hidden sheets never); G3 ONE rule `src/lib/contacts/phone-cell.ts` (`firstMobileIn`) takes the first Tanzanian mobile of a several-number cell for staging's key, the check's sentence, the commit's raw text and the list paste; G4 `mappingFor` adds ONE "Phone (first mobile of: …)" column when a row's mobile sits outside the main phone column; S15-4's result line now counts a file's rows with another number too (`extraNumbersOf`); and the Excel size refusals now say "a CSV has no file-size limit (up to 200,000 rows in one import)" while too_many_rows says to split the list. Tests: csv C1l/C1lb, xlsx X32/X33 (+X27, X31), flow G4a–c/E1/P2b/R8, the new `phone-cell` section H1–H8, the drive's ground-truth expectations for the four files.
- **2026-10-09 ~04:35 EAT · C7** — the export round trip proven (the C7 row); the tracker's U34 row to shipped.
- **2026-10-09 ~04:30 EAT · C6** — the big files through the browser, all green (the C6 row); the importer LIVE `df835bb5`;
  the live check on production held for Ali's go (the classifier); C3b being built (`contacts-c3b`).
- **2026-10-09 ~04:15 EAT · the importer pushed (C3–C5)** — the review round built by both builders (`493e58bd`: S15-10
  readers alone update in-book contacts, S15-11 an account's row is never changed, S15-12 stuck runs end after 14 idle
  days and an admin reaches them; the cursor shown only from the server; cancel's true numbers; busy waits without giving
  up; the decision kept across a re-check; the erasure race closed inside the step; transient Postgres faults retried; a
  new list made inside the freeze) and the Postgres probe; battery 3 green (§0). Found and fixed on the way: red:dal-parity
  had crashed on every case at or after §28 since `b514d5e9` (2026-10-07 — the referee-key model missing from its copied
  files, `e9bece03`); C2's 11px phone line broke type-scale §3 on main (`d9c9df5f`, 13px); the plant P15b crashed its section
  (`b6faaffb`). Two visual defects read off the drive's shots at 360 and fixed: the start button's label wider than the
  button, and an empty "what would change" heading.
- **2026-10-09 ~03:15 EAT · the importer, first run and review** — integrated as `contacts-import-int` (both halves,
  the generator, main incl. C2). First battery: prisma generate 0, dal-parity 2211/0, contacts-staging 36/0,
  contacts-boundary 35/0, red-anchors 4907/0; typecheck 2 errors and contacts-import 274/1 → fixed (`a0a2d609`):
  contacts-import 275/0, red:contacts-import 287/287 (two plants made honest: flow P3, commit P5). An independent
  adversarial review (read-only, of `391a48cf`): 1 BLOCKER (the type error, already fixed), 4 MAJOR (a non-reader could
  read one number's stop or erasure through the check → S15-10; stuck runs and no admin adoption → S15-12; §29 never run on
  Postgres → the pg probe; a refusal without a view showed the starting cursor), 9 MINOR (cancel's numbers, busy giving
  up, an aged check's false sentence and lost choices, an unreachable "Show more", the erasure race inside a step, the
  mirror outside the transaction, transient Postgres faults stopping the run, an orphaned new list, a player's row
  overwritten → S15-11) and 5 NIT. All ruled and in a fix round with both builders (`3fd8bf74` carries the contract).
- **2026-10-09 · C2** — the live screen audited (43 tiles) and four defects fixed on branch `contacts-c2` (F1–F4 in §1);
  suites contacts-form 54/0, contacts-page 52/0, contacts-bulk 46/0, contacts-export 44/0 with their in-memory reds
  complete, typecheck 0, `next build` 0; on a fresh local server the U20 drive 487 passed / 0 failed and the targeted
  C2 checks 12/0 (typed +254 refused as foreign at 360 and 1280; +255 and 0712 unchanged; the masked number under the
  name shown at 360, hidden at 1280; the count on one line; the new consent note). The importer
  (C3–C5) is written on `contacts-import-build` (both halves, the test files, merged with main `391a48cf`) and goes
  through its first battery next.
- **2026-10-09 ~01:45 EAT** — the design (§4) and the contract written and pushed (`750175c2`, branch
  `contacts-import`); two builders started in `C:\kipindi-s15` (`contacts-import-build`); the test-file generator being
  written. Ali asked four questions (§0). Found: the import was never reachable (no dialog, no actions) — the readers,
  staging and `decide()` were built and tested in S10 (U25–U29, U31-A) but nothing connected them to a screen.
- **2026-10-09 · C1** — the lane split recorded; this plan written.
