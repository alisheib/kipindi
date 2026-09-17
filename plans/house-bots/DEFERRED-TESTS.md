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
| 1 | C5-5b | `npm run test:house-bot-caps` | both | That the per-bot and global cap refusals still fire on both stores | Changed files it DOES load: `house-bot-dal.ts` (C5-5b only REMOVED unused members — `test:dal-parity` 1348/0 and `test:house-bot-migrations` 655/0 on a real cluster), `constants.ts` (only `ALERT_KEY.staffEdge` / `STAFF_EDGE_MIN_SETTLED`) and `house-bot/clock.ts` (only `eatMonthWindow`); `book.ts` is byte-identical to its last green state for `houseDayBook` / `houseOpenExposure`, the two members this suite reads. MEASURED (grep over `scripts/`): no case in this suite names any removed member, column, alert key or module. No cap rule, limit or seam line changed. (Corrected by C5-5b's fixer: the earlier reason claimed no changed file reaches it at all — review conformance-04.) |
| 2 | C5-5b | `npm run test:house-bot-comms` | both | That every house bell and letter the engine sends still reads as it did | The only notifier C5-5b touched is `notifyAdminMarketCancelled` — a PLATFORM notice, not a house one — and its bytes are `main`'s again (exit gate A: no diff line in `notification-service.ts` touches it). `test:cert-c1` 1215/0 and `test:cert-c3` 1521/0 cover the templates and bells that did change. |
| 3 | C5-5b | `npm run test:house-bot-holder-lifecycle` | both | That designate → start → pause → remove and the holder's own doors still behave | It loads the edited `house-bot-dal.ts` and `constants.ts`, but MEASURED (grep over `scripts/`): no case in it names any removed reader, column, alert key or display module, and `designation.ts` was not edited by C5-5b (`test:house-bot-designation` 169/161 ALL PASS covers the status word it shares). (Corrected by C5-5b's fixer — review conformance-04.) |
| 4 | C5-5b | `npm run test:all` here and in `C:/kipindi-old-build`, compared red by red | — | That C5-5b introduced no red that clean `origin/main` does not also have | Ruling 275 assigns `test:all` red-by-red to C5-8 alone, once for the whole commit (§2 row A). C5-5b ran every suite its changed files reach, and compared the two inherited reds it does touch (`test:red-anchors` 4 · rg-doors ×2 + 4.1/4.2 66 vs 65; `test:read-tiers` 7.1) line by line against the known-red list. |
| 5 | C5-5b | The mutation batch of `plans/house-bots/tools/*.json`, including C5-5b's own `plans/house-bots/tools/c5-5b-mutations.json` (written by its fixer) | both | That every surviving assertion of Commit 5, and the un-build's own guards, can actually fail | Ruling 275 gives the batch to C5-8, once for the whole commit (§2 row E). C5-5b planned its own guard mutations and ran none; every struck ruling's mutations are listed as REMOVED, never as run. |
| 6 | C5-5b | `npm run qa:house-bot-holder-view` | — | That the holder's own pages and RSC payloads still carry nothing about house bots (D19c) | C5-5b removed admin-only display and readers; it changed no player or holder surface (exit gate A: the 10 display files and both player surfaces are byte-identical to `origin/main`, and reports 0.198.1–3 pin the player population from disk). C5-8 runs it once for the commit (§2 row C). |
| 7 | C5-5b (fixer) | `npm run qa:house-bot-console-probe` (it needs a fresh `next build`, then `next start`) | Postgres + served | That the ADMIN positive control 4.3 still hits every route instance it names now that `/admin/kyc/[id]<holder>` is back in `MUST_CARRY`, and that no non-staff response carries a house word | The fixer RE-ANCHORED the control (review d19-hunt-03): C5-5b had dropped the KYC case with the six display pages, but that page is not one of them — `src/app/admin/kyc/[id]/page.tsx:126` still reads the holder's durable audit rows through the gate, and the probe's own first-time designation writes `house_bot.password_verified` against that holder, so an ADMIN must still receive house data there. Ruling 275 spends the one fresh build at C5-8, which runs this probe once for the whole commit (§2 row D). The same durable read, the same viewers, are MEASURED at unit level on BOTH stores by `test:house-bot-reports` 4.260.5. |
| 8 | C5-5b (fixer) | Extend `scripts/house-bot-console-probe.mts`'s `viewers` with SUPPORT, COMPLIANCE and MODERATOR cookies and assert, per route, that a staff role without that route's view grant (and a MODERATOR on an Owner-only path) receives no house hit | served | The STAFF half of ruling 259's audience on the SERVED layer, not only in the gate's own unit cases | Not attempted here: the probe cannot run without the one fresh build ruling 275 reserves for C5-8, and an unrun change to a served harness is worse than a tracked one. The audience matrix itself is now MEASURED on both stores by the restored `test:house-bot-reports` 4.259.2, 4.259.3, 4.260.2 and 4.260.6 (COMPLIANCE, MODERATOR, SUPPORT, Owner-only paths, a PLAYER holding a view grant). C5-7 owns the served layer (replan §3). |
| 9 | C5-5b | The 360 tile of the resolver-queue card's crowd/held row, the ceremony's pools line, the objections POOL HELD cell, the Up & Down rounds VOLUME cell, the markets Actions cell, the KYC "Money at stake" card and the notifications bell body | — | That no leftover gap, empty slot or stray separator survives the un-build at 360 width on those seven surfaces | The 1280 tile of each WAS opened and read; in the captured 360 tile the changed region is below the fold or outside the ScrollX viewport (review visual-01, visual-02, visual-05), so those seven 360 reads are NOT MEASURED. What stands instead is exit gate A: each of those files is byte-identical to `origin/main`, so no markup of the removed line can remain — a proof of absence, not a render. No server was up for the fixer and ruling 275 forbids a second build here; C5-7 re-photographs every page at 1280 and 360 with the changed element scrolled into view first. |
| 10 | C5-5b | The four phase-D surfaces at 1280 and 360: the emergency-void dialog, the objection-decision dialog, the Up & Down void-round dialog, and the bulk-resolve confirm with rows ticked | — | That the removed `{exposureSlot}` above each "Reason (required)" field and the removed bulk count sentence left no gap or empty slot | Never captured — every shot is of a closed page (review visual-04). All four client components AND their server callers are byte-identical to `origin/main`, so the dialogs are provably `main`'s markup. C5-7's client pass opens each one. |
| 11 | C5-5b (fixer) | `npm run test:house-bot-money`, `test:house-bot-engine`, `test:house-bot-designation`, `test:house-bot-info-edge` | both | That the money, engine, designation and info-edge behaviour over `market-service.ts` is unchanged after the fixer edited that file | The fixer's only change to `src/lib/server/market-service.ts` is ONE BLANK LINE restored between two statements inside `emergencyVoidMarket`, so the function differs from `origin/main` only by Commit 3/4's sanctioned seam lines (review conformance-06). No token, no order and no behaviour changed; `test:house-bot-seam` 96/0 and `test:red-anchors` (the inherited 4 only), which read that file as text, were re-run. The implementer's two-store runs (money 113/131, engine 698/677, designation 169/161, info-edge 20/5) were measured on bytes identical in every other respect. |

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
