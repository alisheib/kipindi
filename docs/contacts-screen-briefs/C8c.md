# C8c — the live importer's robustness round (brief for the builder)

## Context
The contacts importer is LIVE on 50pick (a licensed Tanzanian betting platform; push to main = live). A read-only review
(2026-10-09) checked another session's fifteen importer findings against this build; the robustness items below apply.
Read docs/CONTACTS-SCREEN-PLAN.md §0, §1 (rows C3–C5 and C8) and §4 first; the contract is
src/lib/contacts/import-flow.ts. Fix exactly these; every decision below is made.

## The items
1. **N3 · a list's name unique whatever its case, in the DATABASE.** Today "VIP" and "vip" can both be created when two
   starts (or a start and the bulk bar) race: the case-insensitive check is in code only; `ContactList.name`'s unique
   index is case-sensitive. PORT the other session's finished fix — `git show b97fed35` on
   `origin/backup/marketing-s14-import` (read its message: a hand-written, expand-only migration whose DO block creates
   the `lower("name")` unique index only when no two lists already differ by case, so a release can never stop on it;
   both twins refuse the second spelling; `findByName` in any case; tests in contacts-bulk B7b, dal-parity 19.listci.*,
   red-dal-parity anchors, and a pg-probe section). Adapt it to main (its tree differs); give the migration a timestamp
   AFTER every migration on main; make the importer's new-list branch (the start's `freezeDecision`) meet the same refusal
   in its own words (a list made by someone else meanwhile → the start says so and offers that list). Say what you took.
2. **N4 · the check and the start yield to bets.** The check/start walk (src/lib/server/contacts/import-check.ts) reads
   page after page (a 200,000-row run ≈ 400 reads) without asking the bet queue; only commit steps do
   (src/lib/server/contacts/import-commit.ts — read how a step asks and waits). Between pages, ask the same queue the same
   way and wait while bets are queued, inside the walk's existing deadline (never a second clock); prove it on the memory
   twin with a queued bet.
3. **#14a · refusal audit rows.** Every refusal writes an audit row and nothing prunes them: a script sending bad cursors
   to the step action can write ~600 rows a minute. A "moved" (the cursor already advanced — normal concurrency) is not
   an event: do not audit it; for other refusals, audit at most one row per run per reason per minute (or justify another
   bound) — read the audit and rate-limit modules and choose the smallest change; prove it.
4. **#14b · a persistent database fault ends, it does not loop.** A persistent P2028/P2024 (a transaction timeout, no free
   connection) is retried forever at the same 500 rows under the sentence "bets come first". After a bounded number of
   consecutive transient faults (choose it, say why — e.g. 5 over at least a minute), the step PAUSES the run with its
   own sentence ("The database is busy — the import has paused. Resume it in a few minutes.") — never "bets come first",
   which is the bet queue's sentence. A persistent conflict ending as `server_error` likewise gets words the officer can
   act on. Prove both.
5. **#13 · tags not added are shown.** A contact already holding the tag limit, whose only difference is new tags, reads
   `no_change` while carrying `tagsNotAdded` (src/lib/contacts/import-decide.ts); the changes pages list only rows some
   choice would update, so "not added — this contact is full of tags" (the panel has the line) never appears, nor in the
   result. Make the changes pages and the result carry those rows for READERS (S15-10: a masked officer sees no
   per-row changes at all — keep that), as the decide() header promises.
6. **#5 · PostgreSQL proof.** Add to `scripts/live/contacts-import-pg-probe.mts` (run by `npm run test:contacts-import-db`):
   the start's NEW-LIST branch (the list inserted after the run is won; a taken name → P2002 → rolled back, the run left
   as it was) and `listOpenByOthers`.
7. **#15 · a resume of a STAGED run is refused** — pin it in the commit section (a plant allowing it must fail).
8. **#12 · the dialog paths the drive never executes** — extend `scripts/live/contacts-import-drive.mjs` (it is a `qa:`
   drive; you cannot run it — the integrator will): ✕ and Escape during a commit (the run stays resumable and says so),
   Stop during an upload, Stop during a busy wait, choosing an EXISTING list, an exception under KEEP refused for a
   masked officer, "show the contacts this import added", the failures page's "more". Each step asserted before it is
   photographed, as the drive already does. Mark them clearly so the integrator can read the result.

## Proof and rules
- House style: labels + red plants; every plant fails its OWN label for its stated reason (the runner checks).
- Run through the lock (below): typecheck, test:contacts-import + red, test:contacts-bulk + red, test:dal-parity +
  red:dal-parity (~8 min), test:red-anchors, test:migration-ownership, test:contacts-staging, test:contacts-lists + red,
  test:orphans (two landing-v3 panel scripts already fail on main — not yours), test:docs, test:source-bytes, and
  `npm run test:contacts-import-db` (embedded PostgreSQL) once your probe sections exist.
- Do NOT edit the plan doc or the marketing tracker (the integrator records the step). Correct every comment your change
  makes untrue. Never quote a number or a name in a sentence, log or audit row.
- Build control characters and backslashes from their codes (the editing tools decode escape text); never write source
  through a heredoc, sed or Python; never a class-shaped string in a comment in src; files are CRLF — use the Edit tool.
- ⛔ RAM: Node ONLY through the lock, one job at a time:
  `bash /c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/2540536f-6d58-44e1-b079-609d2a18516a/scratchpad/fastlock.sh c8c-builder <command>`
  from your checkout; never touch the lock. NEVER next build/dev, Playwright, npm install/ci (node_modules is a junction),
  prisma generate — EXCEPT that a new migration file is fine to write (the integrator runs prisma generate and the
  migration on a scratch PostgreSQL through the probe).
- Git: only your checkout and branch; small commits; push each; never main, never force.
- Final message (all that is returned): what you changed, decisions beyond the brief with reasons, exact results seen
  through the lock (counts, red caught/total, plants left green), commits (sha + subject), and what is NOT done or run.
