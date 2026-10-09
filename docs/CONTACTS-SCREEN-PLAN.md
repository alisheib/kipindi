# CONTACTS SCREEN — the importer and the screen's hardening (lane S15)

**STATUS — 🟢 OPEN · 2026-10-09 · Ali-Blade15 · branch `contacts-import`, pushed `HEAD:main` step by step.**
⛔ A file import is NOT live yet: the readers and the staging table exist, but no screen reaches them (§2).

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

▶ NOW (2026-10-09 ~04:15 EAT, Ali-Blade15) — where every piece is, for a session on ANY machine:
  · C1 LIVE (`28fd214e`) · C2 LIVE (`8adbdd9f`, served since 23:34 UTC 2026-10-08, health ok).
  · THE IMPORTER (C3–C5) — ✅ LIVE: `df835bb5` served on www.50pick.tz since 01:16:59 UTC 2026-10-09 (04:17 EAT),
    /api/health ok, the database reachable and MIGRATED (`20261009120000_contact_import_target_list` applied).
    ⏳ THE LIVE CHECK ON PRODUCTION is written and wired (`npm run qa:contacts-import-live`, LIVE_IMPORT_CHECK=1 + the
    git-ignored secrets file): it imports `prod-check-40.csv` through the real dialog only if the check reads 34 new ·
    0 in the book · 3 repeated · 3 invalid, then removes every contact it added through the bulk Remove. NOT RUN: the
    session's safety classifier refused the production write (2026-10-09 ~04:30 EAT) — it waits for Ali's own go.
    ⛔ A TEMPORARY GROWTH LOGIN EXISTS FOR IT on production — "QA Import Check (Claude)", +255 700 000 091,
    `usr_af44b503dd3d9c18d4f905bc` (made through `ops:provision-staff`, audited `staff.provisioned`; its password only in
    the session scratchpad's git-ignored env file) — REMOVE IT when the check is done or abandoned (Ali's rule of
    2026-10-08: "delete them when done testing"). There is no audited door to delete a staff login yet.
    (Was: "PUSHED TO MAIN in the commit that carries this line" —) branch `contacts-import-int`. Design
    §4 (decisions S15-1…12), contract `src/lib/contacts/import-flow.ts`. PROVEN before the push (battery 3, 2026-10-09
    ~04:10 EAT, on `87d3e319` + the plant fix `b6faaffb`): prisma generate 0 · typecheck 0 · `next build` 0 ·
    `test:contacts-import-db` 45/0 on PostgreSQL 18.3 (real concurrency, conflict rollbacks, the NULL-arm trap, the list
    foreign key, 20,000 rows settled once each in 9.7 s, p95 0.19 s a step) · contacts-import 285/0 + red 308/308 ·
    dal-parity + red (every case, §29 included) · red-anchors · contacts-staging/-boundary/-form/-page/-bulk/-export/-lists
    + reds · 61 suites in all · the drive `qa:contacts-import` 761/0 over the 28 generated files at 360 and 1280 ·
    admin-section-gate 21/0 · admin-action-gate 15/0 · the U20 drive 487/0 · the C2 checks 12/0 · repo clean after.
    NEXT: the deploy read back (`?dpl=` and /api/health, the migration applied), then C3b (the four reader gaps), C6
    (the big files through the browser), C7 (the export round trip), and the live check on production (question 4).
  · ⏳ ASKED Ali (2026-10-09 ~01:15 EAT; defaults if unanswered = (a)): 1 who imports (a: Growth + Admin) · 2 several
    numbers per person (a: each its own contact; the build starts with main-number-only, S15-4) · 3 a "pick from this
    phone" button (a: no) · 4 a live check on production with Claude's own temporary login and a 40-row file, deleted
    afterwards (a: yes — every production write still needs his click on the permission prompt).
  ⛔ If this PC is gone: the branches `contacts-import` and `contacts-import-build` on origin hold everything —
    `contacts-import-build` carries SNAPSHOT commits of the builders' unfinished files (e.g. `05f2e76c`, 2026-10-09
    ~02:00 EAT: import-flow.ts, store.ts, prisma-dal.ts mid-edit) — never merge a snapshot alone; finish or re-run the
    builds from §4 on top of it.
  ⭐ AFTER A POWER-OFF OR REBOOT OF ALI-BLADE15 (Ali, 2026-10-09 ~02:00 EAT: "if the PC turns off, when I say proceed it
    means we're up"): (1) `bash ~/heavy-node-lock.sh status` — if it names `contacts-c2` and no such job runs
    (`Get-CimInstance Win32_Process` by command line), release it, re-reading the owner IMMEDIATELY before the `rm`;
    (2) kill any `next dev` left on port 3101; (3) `git -C C:\kipindi-s15 status` — the builders' files on disk are newer
    than the last snapshot: commit them as another snapshot and push before anything else; (4) the agents (the two
    builders and the file generator) died with the PC — re-launch them from §4.4 and this block, telling each what is
    already on disk; (5) re-queue C2.
```

## §1 — STEPS (each its own commit, push and live proof)

| # | Step | State |
|---|---|---|
| C1 | The lane claimed and this plan written | ✅ LIVE `28fd214e` |
| C2 | Audit of the LIVE screen — 43 viewport tiles at 360 / 768 / 1280 / 1440 (the console is English-only), GROWTH and ADMIN, the add dialog's states, bulk, the hard-case rows, the error state: no page overflow anywhere. FOUND AND FIXED: **F1** a number TYPED as `+254 712 345 678` read "a landline in Katavi, Mbeya…" (the box drops the "+") → judged as written once its digits leave +255 (`contactNumberVerdict` typedPlus; `test:contacts-form` 1.5c + plant); **F2** at 360 the sideways-scrolling table showed names only → the masked number and operator under the name below 640px, from the server's masked projection (U19's one render kept); **F3** "20 selected" broke over two lines → the count keeps its measure; **F4** the bulk note promised consent recording "which this page doesn't take yet" → true under the final rule (a list reaches a non-player). NOT CHANGED (recorded): the filter rail is long at 360 for ADMIN; the KPI tiles stack one per row at 360 (the platform's band). PROVEN: the four suites + their reds, typecheck, `next build`, the U20 drive 487/0, and 12 browser checks of F1–F4 at 360 and 1280 (C2-verify). LIVE `8adbdd9f` (served 23:34 UTC 2026-10-08). ⚠️ F2 first shipped its line at 11px (`text-micro`), which `test:type-scale` §3 counts as sub-floor reading copy (751 against 750 — a check the C2 push did not run); caught by the importer's second battery and moved to `text-body-sm` (13px) in `d9c9df5f`, §3 back at 750 | ✅ LIVE |
| C3 | The importer, part 1 — the file, the columns, the check (U30 + U31-B): staging only, nothing written to the book | ✅ LIVE `df835bb5` — proof in §0 |
| C4 | The importer, part 2 — the commit loop and its bar (U32): counted by the server, resumable after a closed tab or a crash | ✅ LIVE `df835bb5` — proof in §0 |
| C5 | Duplicate detection, seen and decided: repeats inside a file, numbers already in the book (keep · use the file's · fill blanks — readers only, S15-10), the list step | ✅ LIVE `df835bb5` — proof in §0 |
| C3b | The readers made forgiving of real files — found by the generator's author reading the shipped readers against the 28 files (2026-10-09): **G1** a CSV with ONE broken quote is refused whole (`messy-real-life.csv`, `unterminated_quote` at its last record) → offer the rows before it, the broken record named; **G2** a workbook whose first visible sheet is a cover page finds no Phone column (`excel-multi-sheet.xlsx`) → read the sheet that holds the phones, and say which; **G3** two numbers in one phone cell (Google's ` ::: `, "0712… / 0754…") are invalid → take the first mobile, say so; **G4** Outlook's number in Business / Home / Primary while Mobile is empty is lost → fall back to the other phone columns. Proven with the generator's files | ⬜ (after C3–C5) |
| C6 | Stress: large files at the limits, through the REAL dialog on a local server (`npm run qa:contacts-import-big`, after `qa:contacts-import-files -- --big`): a 150,000-row CSV — check exactly the generator's truth (137,806 new · 9,200 repeated · 2,994 invalid), imported whole (read 0.2 s · upload + check 5.1 s · import 29.9 s); 150,000 vCards imported whole (138,071 added; read 0.9 s · 5.6 s · 31.4 s); a 42 MB vCard with photos read in 0.4 s (streamed; photos never uploaded) and checked; one row past 200,000 REFUSED with the cap named; a 1.4 MB workbook REFUSED with the save-as-CSV remedy. Two runs at once and a crash mid-commit: proven on PostgreSQL by `test:contacts-import-db` (5c, 5d–5i) and in `qa:contacts-import` (reload → adopt → resume) | ✅ `9121d857` (local) |
| C7 | U34b — an export read back through the importer, row for row | ⬜ |

## §2 — WHAT EXISTS TODAY (read from the code, 2026-10-09)

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
- Proof: `scripts/contacts-import/real-world-files.mts` (the files — Ali has none), the suites' new sections, the browser
  drive over every generated file at 360 and 1280, the stress run (150,000 rows; a 40 MB vCard), and the live check on
  production with a 40-contact file that is deleted afterwards.

## §3 — LOG (newest first)

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
