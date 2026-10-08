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

▶ NOW (2026-10-09 ~01:45 EAT, Ali-Blade15) — where every piece is, for a session on ANY machine:
  · C1 LIVE (`28fd214e`): the lane claimed.
  · THE DESIGN (§4) and THE CONTRACT `src/lib/contacts/import-flow.ts` — committed `750175c2` on branch
    `contacts-import` (pushed to origin; NOT on main: nothing calls the contract yet).
  · BUILDING (agents writing files, nothing run yet), in the worktree `C:\kipindi-s15`, branch `contacts-import-build`
    (cut from `750175c2`): the SERVER half (DAL members in both twins, the migration `ContactImport.targetListId`,
    import-check.ts, import-commit.ts, import-actions.ts, the check/commit suites, a dal-parity section, the `?u30=1`
    seed world) and the BROWSER half (import-read.ts, import-loop.ts, the dialog and its panels, the page-head button,
    the flow suite, the drive `scripts/live/contacts-import-drive.mjs`). When they land: ONE battery under the lock,
    an adversarial review, fixes, then push to main as C3–C5 with this file updated.
  · THE TEST FILES — `scripts/contacts-import/real-world-files.mts` (a generator: every Excel/CSV/vCard/paste variant,
    the broken ones, 150,000-row and 40 MB files, and a 40-row production check set tagged `qa-import-check`) is being
    written on branch `contacts-import`.
  · C2 (the visual audit of the LIVE screen) is queued behind this PC's heavy-node lock (the Vodacom session held it);
    shots go to `.qa-shots/contacts-screen/C2/` (git-ignored) — findings will be written HERE, not left in shots.
  · ⏳ ASKED Ali (2026-10-09 ~01:15 EAT; defaults if unanswered = (a)): 1 who imports (a: Growth + Admin) · 2 several
    numbers per person (a: each its own contact; the build starts with main-number-only, S15-4) · 3 a "pick from this
    phone" button (a: no) · 4 a live check on production with Claude's own temporary login and a 40-row file, deleted
    afterwards (a: yes — every production write still needs his click on the permission prompt).
  ⛔ If this PC is gone: the branches `contacts-import` and (once pushed) `contacts-import-build` on origin hold
    everything; the agents' unfinished files exist only here until the lead commits them — re-run the builds from §4.
```

## §1 — STEPS (each its own commit, push and live proof)

| # | Step | State |
|---|---|---|
| C1 | The lane claimed and this plan written | ✅ LIVE `28fd214e` |
| C2 | Audit of the LIVE screen: tiles at 360 / 768 / 1280 / 1440 (the console is English-only — `admin/layout.tsx` pins it), every field's validation, every failure path (a server error, a slow network, a double press, two tabs) → the defects fixed | ⏳ queued (lock) |
| C3 | The importer, part 1 — the file, the columns, the check (U30 + U31-B): staging only, nothing written to the book | 🔨 building (`contacts-import-build`) |
| C4 | The importer, part 2 — the commit loop and its bar (U32): counted by the server, resumable after a closed tab or a crash | 🔨 building |
| C5 | Duplicate detection, seen and decided: repeats inside a file, numbers already in the book (keep · use the file's · fill blanks), the list step | 🔨 building |
| C6 | Stress: large files at the limits, a large book, two imports at once, a crash mid-commit and its resume | ⬜ |
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
   list is ready for offers (its basis and 18+ recorded on the Lists card) or what to do so it is.
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

- **2026-10-09 ~01:45 EAT** — the design (§4) and the contract written and pushed (`750175c2`, branch
  `contacts-import`); two builders started in `C:\kipindi-s15` (`contacts-import-build`); the test-file generator being
  written. Ali asked four questions (§0). Found: the import was never reachable (no dialog, no actions) — the readers,
  staging and `decide()` were built and tested in S10 (U25–U29, U31-A) but nothing connected them to a screen.
- **2026-10-09 · C1** — the lane split recorded; this plan written.
