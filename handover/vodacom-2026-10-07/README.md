# Vodacom plan — handover of 2026-10-07 (from ALI-BLADE15)

Read `docs/VODACOM-PLAN.md` §0 on `main` first; this folder holds what §0 points to: the drafts and the tools that lived
only in one laptop's scratchpad. Branch `vodacom-handover`, folder `handover/vodacom-2026-10-07/`. Nothing here is on
`main`, and nothing here changes what a player is served until it is applied, proven and pushed.

## What is live (main)

| Commit | What |
|---|---|
| `23f762f4` + `cd34231b` | **S6 A8i** — a dialog acts on Enter only where it is pressed; a key held down from before presses nothing in it. Records in VODACOM-PLAN §0i "A8i", §0h point 57. Prod read back (dpl, routes, no journey chrome in classic first loads). |
| `5a87e764` | Parity harness: A8d's and A8g's four measured Sell layouts copied in; React's DEV-only measure error filed, never compared. |
| `95d15927` | The ticket's "Imefunguliwa {date}" line keeps its date whole (holder block + `/positions` card); guard `test:sell-grace-truth` 5.opened (+3 plants). |
| `7d4b0ad5` | `test:ticker-honesty` 9.8/9.9 see `settledAmount` again; `red:ticker-honesty` anchors unique. Prod read back. |
| `7a4e95f9` | S7's plan filed: `S7-PLAN.md` (draft + 23 Amendments), §0h point 58. |

## The A8d/A8g/A8h close-out proof (run 2026-10-06/07 on `7d4b0ad5`, ALI-BLADE15)

| Proof | Result |
|---|---|
| `red:ticker-honesty` (alone) | 28/28 caught, tree clean |
| parity `--prove-red` | 81/81 |
| parity `--compare` v2 (compare 2) | 38/39: every Sell check passes (the four measured layouts matched); 4.1's 224 cells differ ONLY in the footer, and only by the helpline link `0652f61f` removed (owner ruling 2026-10-06, another lane) — checked field by field over all 224 cells |
| tiles `current 1500` (both hosts × sw/en/zh × 14 widths, free + shut) | 168/168 — incl. the holder block at 320 sw shut, where the date used to break |
| tiles `paid 1000000` | 168 measured cells pass; its one FAIL is the fixture (four 1M tickets cannot be seeded) |
| price-guard drive `paid` (re-run, D.3 timed from the result's own entry) | 28/28 |
| price-guard drive `current` | 4/4 |
| result drives `main` / `extra` | 10/10, 4/4 |
| result drive `lost` | ⚠️ NOT PROVEN: the dev server reset the connection mid-run (`ERR_CONNECTION_RESET`) — re-run |
| crash control | ⚠️ C.1 failed only because the drive matched the ENGLISH crash title on a Swahili page; its diagnosis shows the page DID reach the critical-error screen ("Kitu kimevunjika kabla hata ya kuanza") with the guard stripped — the guard is needed. `tools/a8h/drive/result-drive.mjs` now matches all three titles: re-run for a clean PASS |
| production build + `first-load-parts` | ⚠️ NOT READ: the build compiled; the reader was handed an unconverted Git-Bash path, and the next drive deleted `.next`. Re-run: build, then `python tools/wp6c/first-load-parts.py C:/kipindi-journey / /markets /positions /help` (a Windows path for the script; it now has a `SellResultHost` marker) |
| `test:all --skip responsive,motion` | 444/461 — the 17 reds are exactly the §0i baseline list |

## Next, in order

1. **A8i-2** (money, every player) — `drafts/a8i2.json`: 2 new files (`src/lib/modal-stack.ts`, `src/components/ui/key-guard.tsx`)
   and 52 edits. ⚠️ **UNREVIEWED**: its three review lenses hit the session limit. Review it first (correctness/money,
   change-set mechanics, gates/proof), then apply with `tools/apply_changeset.py` (dry run first; every find must occur
   once). It closes the review's confirmed findings (`review/a8i-review-verdicts.json`: 24 confirmed, 1 refuted): the
   Up & Down held-Enter bet burst, the board card that starves the held-key rule, focus behind the top dialog, W2 (a
   second Enter under the leaving win seal SOLD a ticket in a real browser), the dial's repeat under a BUSY retry, K,
   one Escape closing every dialog, the census gaps. ⛔ The "bet confirm reopens with Confirm disabled" race was REFUTED:
   drop any `remainingMs` reset the draft adds unless a reviewer shows a reason. Its `callsForAli` become §0h points
   (the 400 ms arming beat, overrule: the money confirms open on Cancel as the kit's A5 does). Proof: typecheck, its
   suites + `red:enter-where-pressed`, `qa:enter-where-pressed` (its new A8i-2 section), `tools/a8i/drive.mjs main` (the
   2026-10-04 12-case drive: W2 and K must now pass; P stays the design difference), battery, push, prod check.
2. **A8j** (money, every player, pre-existing) — `drafts/a8j.json` (2 new, 16 edits): Enter in the withdraw amount box,
   and in the close-account phrase box, submits without the confirm. ⚠️ Its 19 review problems
   (`drafts/a8j.review-problems.json`) are NOT yet addressed (the revision hit the session limit): revise, then apply.
3. **The close-out's three owed items** above (lost drive, crash control, first-load read), then the records in
   VODACOM-PLAN §0i ("S6 STOPPED HERE" and the A8d/A8g/A8h bullets) — the table above is their content.
4. **WP12** — `tools/WP12.json` (11 files, 34 edits, 2 new; dry run OK on `7d4b0ad5`) and
   `drafts/wp12-qa-journey-shell.json` (the WP6b step 5 tile drive `qa:journey-shell`, never written before: drafted,
   reviewed in three lenses, 22 problems fixed). Parity: the v2 baseline predates `0652f61f`, so capture a FRESH baseline
   on the tree just before WP12 (S6-PLAN A18), apply WP12, compare: WP12 serves no new byte, so expect no difference.
5. **S7** — only when S6 has closed: `S7-PLAN.md`'s Amendments, "When S7 may start".

## Tools (copied from the scratchpads; paths are ALI-BLADE15's)

Every script names `C:/kipindi-journey` and a scratchpad path near its top (`S=…`, `REPO=…`, `OLD=…`): point them at
this machine's worktree and at this folder before running. Heavy Node only through `~/heavy-node-lock.sh` (one heavy
job at a time on a RAM-failing laptop); file-mutating reds alone and detached.

- `tools/apply_changeset.py <cs.json> [--write]` — applies a change set (find must occur exactly once; newline-aware).
- `tools/run-with-server.sh`, `with-server-detached.sh`, `run-parity.sh`, `parity-detached.sh`, `reds-alone.sh`,
  `run-gates.sh` — a fresh in-memory `next dev` on 3041 per run; lock jobs with a `.done` marker.
- `tools/a8i/drive.mjs` — the 2026-10-04 12-case real-key drive (`main` | `control`).
- `tools/a8h/drive/` — `price-guard-drive.mjs <out> paid|current`, `result-drive.mjs <out> main|extra|lost|expect-crash`,
  `crash-inner.sh <log>` + `crash-edit.py` (strips and restores the host's guard; run inside ONE lock job).
- `tools/a8dg-drive/a8dg-tiles.mjs <out> current|paid <stake> <widths> [zoom]` — Sell row + strip tiles (strip found by
  its tint; every date-time must stay on one line).
- `tools/wp6c/build-detached.sh`, `first-load-parts.py`, `first-load.py`; `tools/prod/a8-prod.sh`, `chunks-check.sh`.
- `tools/chains/` — the chains used here (`a8i-chain.sh`, `a8close-chain.sh`).
- `drafts/draft-wf.js` — the workflow that drafted A8i-2/A8j (re-run it for reviews; its agents read the findings file).
