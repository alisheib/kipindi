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
| _(none yet — C5-5b appends here)_ | | | | | |

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
