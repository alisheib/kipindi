# MASWALI-BUILD — hand-over of 2026-10-21 (Claude, OMEGA-COMPILE01, the Maswali lead)

> ⏳ **2026-10-21 PM (Ali: "proceed", then "work for 2 hours and push everything and progress … so we continue from another machine").**
> The lanes were resumed and the S5 release moved on (see `MERGE-NOTES.md` here: every PM ruling, what each lane changed, and
> what the next integration must do). The final state of this round is written at the top of this file at the round's end
> (~17:05 UTC); until then, read MASWALI-PLAN §0 on `claude/maswali-s5-release` and each lane branch's head commit.


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
