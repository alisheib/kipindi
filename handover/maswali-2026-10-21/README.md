# MASWALI-BUILD — hand-over of 2026-10-21 (Claude, OMEGA-COMPILE01, the Maswali lead)

## ⏹ STOP 2 — 2026-10-21 ~17:15 UTC (Ali: "work for 2 hours and push everything and progress … so we continue from another machine")

**Read in this order:** this section → `MERGE-NOTES.md` (same folder: every PM ruling, what each lane changed, every
merge map and owed item) → MASWALI-PLAN §0 on `claude/maswali-s5-release`. Each lane's head commit message says what is
verified and what is left. The lane agents' memory dies with the OMEGA session; the commits and these notes are the state.

### Branches at the stop (all pushed)
| Lane | Branch | Head | State |
|---|---|---|---|
| **S5 release** (integration) | `claude/maswali-s5-release` | ff9933e45 | holds fix-srv (all of it, 1e88fdb93), fix-player, parity, platform 1–7, main `67e47f8d2`, DOORS (with REGISTER's shared pieces d5446df25 + 26503c06c) and HUB; tsc 0 ; hub-reads 17/17 and player 187 per store, engine 210 PG, doors 53, hub 53 |
| S5-DESIGN-DOORS | `claude/maswali-s5-design-doors` | 8881bd0c4 | DONE (every cell 10), merged |
| S5-DESIGN-HUB | `claude/maswali-s5-design-hub` | 9776e6c2c | DONE except merge-dependent cells (MERGE-NOTES "HUB"), merged |
| S5-DESIGN-SLIP | `claude/maswali-s5-design-slip` | 5139fce7d | DONE except the composer pills (ruled (a), MERGE-NOTES); NOT merged yet — dry-run conflicts: DESIGN_AUTHORITY.md, package.json, maswali-design.test.mts, globals.css |
| S5-DESIGN-TICKETS | `claude/maswali-s5-design-tickets` | ae2ce1f0b | DONE (every row 10; F visual 9 = the ledger note REGISTER fixed); NOT merged yet — dry-run conflict: package.json |
| S5-DESIGN-REGISTER | `claude/maswali-s5-design-register` | 33a2b4ea9 | DONE round 1 (every cell 10); its shared pieces partly in the release via DOORS; NOT merged yet (latest) — dry-run conflict: maswali-design.test.mts |
| S5-FIX-PLATFORM | `claude/maswali-s5-fix-platform` | f2bcba995 | DONE D1–D15 (D15 chat yield .50 measured); NOT merged yet past 1–7 — dry-run clean |
| S5-FIX-SRV | `claude/maswali-s5-fix-srv` | 1e88fdb93 | DONE, merged |
| S5-PARITY | `claude/maswali-s5-parity` | 9a0c6b033 | calibrated on main bfa0b7d57 (52/52 + null 68/68); the candidate compare runs at the final head (command in MERGE-NOTES) |
| S7 | `claude/maswali-s7` | 0f0d42fcc | S7-F8 1–15; S17 rush first green; merge with S5 after S5 lands (26 conflicted files, FIX-SRV's map) |
| S6 | `mln-s6-notices` bd74c982c · `mln-s6-int` 81c60f0f5 · `mln-s6-reports` 57624a2fa | | notices round 17 complete; **red:maswali-money-path plant (6b) MISSED on S6-N** (the S5 release catches it) — S6 fixes its blind guard first |
| (Codex's S6 L+D prep) | `codex/maswali-s6-ld-prep-20261019` | 44f2cc84f | kept for the S6 lanes |

### Next, in order
1. **Finish the S5 integration** on `claude/maswali-s5-release`: merge SLIP, TICKETS, REGISTER (its latest), PLATFORM
   (8–22) — conflicts and their resolutions in MERGE-NOTES (the dry-run list, HUB's merge map). Then, once: scripts/glyphs
   map.ts FILL_KEYS `salesPaused` + `npm run glyphs:gen` with PREVIOUS_SPRITES = the pair production serves at that moment,
   and the hub's paused Callout → `glyph="salesPaused"`; the D19a re-pin (`test:house-bot-blob-pin`); move `sealLineOf`
   out of the "use client" seal-line file into a pure module (millionea-view.ts imports it as a value — the root of
   journey-home 7.client); grep the millionea zh templates once more for a space before a Han-initial fill.
2. **Round 2 of the 10/10 pass:** every lane re-shoots after the §T5 numerals, the zh spacing and the ledger-note change;
   SLIP's composer pills per ruling (a); HUB's L4/L20 with TICKETS' row and L5 with REGISTER's live register page; decide
   L16 (the kit ghost border 1.79:1, a classic change); then the critics (R1-*.md + COMMON.md) re-score every cell until 10.
3. **Gates on the exact commit:** every changed-file reader and red twin, `test:all` with the database suites, the money
   battery (e2e:money/fault/card), the classic parity candidate compare (re-capture the baseline first if main changed a
   served page since bfa0b7d57 — `tools/job-par-base.sh`), the render jobs (`tools/render-jobs.sh`), next build, local
   qa:live.
4. **Push `main`** under `F:/kipindi-locks/main-push.lock` (OMEGA) — Railway must be building again (below) — then the
   AGENTS §4 read-back (`tools/readback.sh <sha>`); then STAFF_PREVIEW: `FEATURE_MILLIONEA=STAFF_PREVIEW` on Railway
   (Ali's ruling; reversible with `WITHDRAWN`).
5. S7 (merge S5, its left items), S6 (the 6b guard first, then L → D → R → N), S8.

### Facts a fresh machine needs
- **Railway's builds were still paused at 17:00Z** (status.railway.com "Dashboard and API unavailable, builds paused").
  The deploy watcher ran on OMEGA inside the lead's session; on another machine re-trigger by hand once builds return:
  `node tools/railway-deploy-main.mjs <main's full sha>` (token in `.env.qa.local`, never printed). main = `67e47f8d2`
  carries U43's CI repair and the marketing harm-marker mute (asheib-bb). After it deploys, run `tools/readback.sh` and
  record U43's part in MOBILE-VISUAL-PLAN §0 (U43 asked the Maswali lead to).
- OMEGA slots: U43 (paused) lent `mln-slot-5..8` to Maswali; the S6 lane's leftover chains may still run in slot 4.
- Trees on OMEGA (remove with junctions unlinked first): `kipindi-mln-rb` (read-back, node_modules JUNCTION),
  `kipindi-mln-pbase` (parity's main tree), `maswali-s7-red-20261021` (S7's red checkout, node_modules JUNCTION), the lane
  trees `kipindi-mln-*`, `maswali-coord-20261019` (the release), `maswali-s7-integrate-20261019` (S7).

---

## (Earlier the same day — the first stop, ~10:45 UTC)

Ali stopped the session ("finish what you're doing … so we proceed on another session with clean pushed"). Codex is out:
only Claude works 50pick now. Read `docs/MASWALI-PLAN.md` §0 on `claude/maswali-s5-release` first; this folder holds
what §0 points to.

## What is in this folder
- `critics/` — round 1 of Ali's 10/10 design request (*"if anything regarding design, animations, or progress of the
  Maswali game is not 10/10 as a player, UI/UX engineer or animation specialist, move it to 10/10 with full consistency
  with our design"*): `COMMON.md` (the critics' brief), `R1-hub.md`, `R1-slip.md`, `R1-tickets.md`, `R1-register.md`,
  `R1-doors.md`, `R1-motion.md` (scores per surface × lens, every flaw with its tile/frame and its fix; lines marked
  **LEAD RULING** are decisions), and `DESIGN-LANE.md` (the design lanes' common brief, incl. who owns which shared file).
- `tools/` — the OMEGA lane toolbox (re-point the scratchpad path `S=` in each before use): `mln-slot.sh` (Maswali's slots
  F:/kipindi-locks/mln-slot-1..4; U43 5–8, PHOSPHOR 9–12), `mln-slot-s7.sh` (slot 4 only), `mln-server-run.sh` (a fresh
  in-memory `next dev`, or `MODE=start` = build + `next start`; never warm /auth/demo), `mln-procs.ps1`, `mln-tree.sh`
  (an SSD worktree with its own `npm ci` + the scratch-Postgres packages), `mln-readback.sh`, `readers.mjs` (which
  red/qa/e2e scripts read a diff's files), `render-jobs.sh` + `job-*.sh` (S5's render jobs), the Railway scripts
  (`railway-read.mjs`, `railway-deploy-main.mjs`, `railway-deploy-watch.sh`) and the clean-up scripts.

## The branches (all on GitHub; read each one's head)
- **S5 release:** `claude/maswali-s5-release` (= `codex/maswali-coord-20261019`, kept identical) — Codex's S5 merged with
  main 4471bb44 (`d1c5910f`) + docs (Ali's rulings).
- **S5 fix lanes** (from the release head 8c468393): `claude/maswali-s5-fix-srv` (server/console: the seal-device alarm,
  corrections, attestation, version checks, dialogs…), `claude/maswali-s5-fix-player` (P1–P19: player truths, the
  objection-window phases `millioneaWeekPhase`/`weekPhaseWord`, carry weeks by the calendar chain…), `claude/maswali-s5-fix-platform`
  (dark safety D1–D14: the edge's neutral 404, encoded aliases, payload, OG 404, entitlement, ghosts, leaderboard reads,
  r5j 3.7.2, route transitions, hover-on-touch, preview bar, nav fallback, rail spacing).
- **S5 design lanes** (round 1 of the 10/10 pass; doors from the release head, the rest from fix-player's `cdb4bf46e`):
  `claude/maswali-s5-design-doors`, `-hub`, `-slip`, `-tickets`, `-register`.
- **Parity instrument:** `claude/maswali-s5-parity` (Phosphor's strips settle cherry-picked + the /watchlist time canonical).
- **S7:** `claude/maswali-s7` (the wide-winner settlement fix S7-F8; on top of Codex's `codex/maswali-s7-integration-20261019`).
- **S6:** `mln-s6-notices` (round 17, in progress), `mln-s6-int` (L+D squashed), `mln-s6-reports` (round 15 accepted);
  Codex's preserved WIP (the two S6 notices attempts are reconciled into mln-s6-notices bd74c982c, archived and deleted): `codex/maswali-s6-ld-prep-20261019` (staged L+D prep), `codex/maswali-s5-vis-p`, `-vis-r` (tiny WIP).

## Next, in order (the lead's plan when stopped)
1. Read each lane's last report line in §0 (or its head commit) — every lane committed and pushed at the stop; some commits
   are marked "WIP … not verified".
2. Integrate on `claude/maswali-s5-release`: merge fix-srv, fix-player (+ its verification follow-ups), fix-platform, the
   five design branches, parity; resolve shared files (i18n-dict.ts millionea keys, globals.css kp-mln blocks, millionea-view.ts,
   maswali-player.ts end-of-file blocks); `glyphs:gen` once with `PREVIOUS_SPRITES` = the pair production serves; re-pin D19a
   once at the merge commit; merge `origin/main` (U43's CI-repair release 110587e7e and its docs).
3. Round 2: the lanes adopt the shared pieces (REGISTER's ReceiptRow sentence variant + ledger rows + WeekStateChip +
   MaswaliCarry; TICKETS' seal-line mark and held-row props; SLIP's handoff/panelDelay/panelClassName in the ticket's cancel
   confirm; PLATFORM's route-ghost flags), then re-shoot every page × 320–1920 × en/sw/zh and re-run the critics until every
   cell is 10.
4. The gates on the exact commit: every changed-file reader and red twin, `test:all` with the database suites, the money
   battery, classic parity with the parity lane's harness (baseline at live main → null compare → candidate), the render jobs,
   build + local `qa:live`; then push `main` (under `F:/kipindi-locks/main-push.lock`) and the read-back.
5. Then STAFF_PREVIEW (Ali's ruling: right after S5 is live), S7, S6 (L → D → R → N), S8.

## Facts to know
- **Railway paused builds platform-wide** on 2026-10-20/21 (status.railway.com). Pushes during a pause are DROPPED. Production
  serves `d268ef919`; `main` = `110587e7e` (U43's repair) is not deployed. Re-trigger by hand when builds return:
  `node tools/railway-deploy-main.mjs <main sha>` (token in F:\kipindi-main\.env.qa.local, never printed). Ali: keep pushing.
- `test:needle-rest` is red on production since U43 Release B (bisect: 92/0 at 1b7a91782, 89/3 at 1384383fd, 55/35 from
  7e3a06ea0; the commit between them pins it). U43 records it as its owed item.
- The repository was cleaned on Ali's word: 192 stale remote branches deleted (merged into main, or archived first in
  `F:\kipindi-archive\stale-remote-branches-20261021.bundle`), Codex's worktrees removed, local stale branches archived in
  `F:\kipindi-archive\stale-local-branches-20261021.bundle`; the main checkout's untracked leftovers moved to
  `F:\kipindi-archive\kipindi-main-untracked-20261021\` and Ali's logo sources to `F:\kipindi-archive\brand-sources\`.

## Lane results at the stop (the rest: read each branch's head commit messages)
- **S5-FIX-SRV — DONE** at `9935dfd47`: all 16 items fixed, each with its guard + plant; engine 172/173, purchase/settle/void
  both stores, the money red twins, tsc 0, admin drive 87/0. Left (same class as finding 2): openWeek, closeWeek, voidWeek,
  claimCarry and sunsetMaswali still write outside the lock's transaction with the audit before commit. Expect merge conflicts
  with S7 in sealQuestion/confirmSeal/correctSeal (A9 lines byte-identical to S7's 5fbdb2eaa). test:house-bot-reports' 13 mem
  + 2 PG reds predate it (same on 8c468393b).
- **S5-PARITY** at `9a0c6b033`: Phosphor's strips settle cherry-picked; the /watchlist moment canonical (U43 moved the date to
  `.mcardp-closes`); --prove-red 299/299 against a fresh main server. A baseline capture was still running at the stop
  (scratchpad s5par/parity-v5-4471bb44.json on OMEGA); re-capture at the new live main anyway, null-compare, then the S5
  candidate with --allow-base.
- **U43 (closed)**: main = `c63c89387` (U43 release 110587e7e + docs). When Railway deploys it, U43's AGENTS §4 read-back is
  owed: `handover/u43-2026-10-21/u43-readback.sh <full-sha>` on branch `u43-handover-20261021`; record the result in
  MOBILE-VISUAL-PLAN §0's "⛔ PRODUCTION HAS NOT DEPLOYED…" paragraph.
- **HUB notes for round 2**: the paused Callout needs `salesPaused` in FILL_KEYS (map.ts + glyphs:gen) then glyph="salesPaused";
  the final-week rule key is `millionea.finalWeekRule` (How's ruleSunset should reuse its clause — one wording).
- **S5-DESIGN-TICKETS** at `96e5e9a94` = WIP, NOT verified, with one KNOWN tsc error (ticket-acts.tsx calls the new cancel button without its required `price` prop). Done and checked: `c69c788f9` (dev-only seed route seed-maswali-tickets + scripts/maswali-ticket-shots.mjs: all 19 ticket states across 12 weeks). Its before tiles show the win seal breaking a 7-digit amount ("TZS" / "1,740,000") at 320/360 in all three languages. Everything else of R1-tickets is still to do.

- **S6 NOTICES — round 17 COMPLETE** at `bd74c982c` (14 commits; notify 138/0 mem + 144/0 PG; claims 635/0; red:maswali-claims 29/29). Owed at that head: tsc, the both-store suites and the reds listed in MASWALI-PLAN §0.
- **S5-DESIGN-DOORS** at `5bc6e2c57`: nearly all of R1-doors done and verified (the ghost equals the card); the last commit is static-verified only.
