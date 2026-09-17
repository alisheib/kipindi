# House bots — the skipped-run register (ruling 275)

> **Authority.** `C5-D20-REPLAN.md` ruling 275 (Ali, 2026-09-17): the **initial** check of a change runs exactly as it
> always has; **repetition** is dropped. Every run a checkpoint skips is written here before that checkpoint closes, with
> the exact command, the store, what the run would prove, and why the skip is safe.
>
> **Commit 5 may not be marked ✅ until C5-8 has run this file to empty or Ali has released a row.** A row here is NOT a
> passed test — the PROGRESS entry that skipped it says NOT MEASURED.

## How to use this file

- **Adding a row** — the checkpoint that skips the run adds it, in its own section, and commits this file by name.
- **Clearing a row** — C5-8 (or the later test session) runs the command, records the printed result in the Result
  column, and moves the row to §3. A row whose run then fails is a finding, not a clearance.
- **Releasing a row** — only Ali releases a run without executing it, and the release is quoted in the row.

## 1. Open — owed before Commit 5 closes

| # | Checkpoint | Command | Store | What it would prove | Why the skip is safe |
|---|---|---|---|---|---|
| 1 | C5-5b | `npm run test:house-bot-caps` | both | That the per-bot and global cap refusals still fire on both stores | No changed file reaches it: it loads `house-bot-dal.ts` (from which C5-5b only REMOVED unused members, proven by `test:dal-parity` 1345/0 and `test:house-bot-migrations` 655/0 on a real cluster) and `constants.ts` (only `ALERT_KEY.staffEdge` / `STAFF_EDGE_MIN_SETTLED` removed — no caps case names either). No cap rule, limit or seam line changed. |
| 2 | C5-5b | `npm run test:house-bot-comms` | both | That every house bell and letter the engine sends still reads as it did | The only notifier C5-5b touched is `notifyAdminMarketCancelled` — a PLATFORM notice, not a house one — and its bytes are `main`'s again (exit gate A: no diff line in `notification-service.ts` touches it). `test:cert-c1` 1215/0 and `test:cert-c3` 1521/0 cover the templates and bells that did change. |
| 3 | C5-5b | `npm run test:house-bot-holder-lifecycle` | both | That designate → start → pause → remove and the holder's own doors still behave | No changed file reaches it: it names none of the removed readers, columns or display modules, and `designation.ts` was not edited by C5-5b (`test:house-bot-designation` 169/161 ALL PASS covers the status word it shares). |
| 4 | C5-5b | `npm run test:all` here and in `C:/kipindi-old-build`, compared red by red | — | That C5-5b introduced no red that clean `origin/main` does not also have | Ruling 275 assigns `test:all` red-by-red to C5-8 alone, once for the whole commit (§2 row A). C5-5b ran every suite its changed files reach, and compared the two inherited reds it does touch (`test:red-anchors` 4 · rg-doors ×2 + 4.1/4.2 66 vs 65; `test:read-tiers` 7.1) line by line against the known-red list. |
| 5 | C5-5b | The mutation batch of `plans/house-bots/tools/*.json` (and C5-5b's own `mutationsPlanned`) | both | That every surviving assertion of Commit 5, and the un-build's own guards, can actually fail | Ruling 275 gives the batch to C5-8, once for the whole commit (§2 row E). C5-5b planned its own guard mutations and ran none; every struck ruling's mutations are listed as REMOVED, never as run. |
| 6 | C5-5b | `npm run qa:house-bot-holder-view` | — | That the holder's own pages and RSC payloads still carry nothing about house bots (D19c) | C5-5b removed admin-only display and readers; it changed no player or holder surface (exit gate A: the 10 display files and both player surfaces are byte-identical to `origin/main`, and reports 0.198.1–3 pin the player population from disk). C5-8 runs it once for the commit (§2 row C). |

## 2. Owed once for the whole commit (C5-8's own gates, not skips)

These were never per-checkpoint runs; they are listed so nothing is lost between here and C5-8.

| # | Command | Store | What it proves |
|---|---|---|---|
| A | `npm run test:all` here, and in `C:/kipindi-old-build` at `origin/main`, compared **red by red** | — | No red on this branch that clean `origin/main` does not also have |
| B | A fresh `next build`, then `npm run verify:house-bot-bundle` | — | No house word, identifier, prop name or action name in the real public JavaScript (D19) |
| C | `npm run qa:house-bot-holder-view` | — | The holder's pages and RSC payloads carry nothing about house bots (D19c) |
| D | `npm run qa:house-bot-console-probe` | — | No console page, route handler or server action sends a house audit row to a non-staff session (rulings 259/260) |
| E | The ONE mutation batch, from a temporary worktree on its own scratch Postgres port | both | Every surviving assertion of Commit 5 can actually fail; every struck mutation listed as removed, never counted as run |
| F | Every `test:house-bot-*` suite on both stores | both | The whole commit green together, not suite by suite across sessions |

## 3. Cleared

| # | Checkpoint | Command | Result | When |
|---|---|---|---|---|
| _(none yet)_ | | | | |
