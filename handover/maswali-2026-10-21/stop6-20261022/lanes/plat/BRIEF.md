# Lane PLATFORM — S5 round 2, finish (Millionea's platform layer: edge, shell, route ghosts, preview bar, chat yield,
# both rails, motion) — lead ali-7e on ALI-BLADE15, 2026-10-22 evening

- Worktree `C:/kipindi-mln-plat` · branch `claude/maswali-s5-r2-platform` (head `3162c09c6`, an empty STOP 5 commit: nothing
  uncommitted; PLATFORM 1–17 verified as each message says) · step name `S5-R2-PLATFORM` (next commit 19) · scratch
  `C:/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/22b71bac-cd55-4164-a2d1-012a5a83c1c2/scratchpad/lanes/plat/`.
- Read FIRST: `../LANE-COMMON-BLADE.md` (this machine's rules — no Node here; every check through the remote runner).
- Then (git show from `origin/maswali-handover-20261021`, folder `handover/maswali-2026-10-21/`):
  `stop5-20261022/briefs/PLATFORM.md`, `stop5-20261022/briefs/S5-R2-COMMON.md`, `critics/COMMON-R2.md`, `critics/ROUND2.md`,
  `critics/DESIGN-LANE.md`, `critics/R1-motion.md`, and your tools in `lanes-20261022/platform/` (batch2.sh, batch3.sh,
  readers.mjs, sweep.mjs, merge-notes.md, msg-*.txt — written for OMEGA's paths; keep the steps).
- Your own last commit message (`git log -1 --format=%B 3162c09c6`) holds "WHAT IS LEFT, IN ORDER" 1–5: your work order.
  Commit 17 (`748003c0d`) is Ali's rail ruling of 2026-10-22 (Markets · Up & Down · Deposit · Millionea · More while
  Millionea's door is drawn; Live leads More).

## Step 0 — bring your branch onto the current release (first)
`git fetch origin`; merge `origin/claude/maswali-s5-release` (head `2ed817395` or newer; merge again if it moves). A trial
merge was CLEAN. One merge commit, pushed. The release now carries DOORS' /markets loading fix, so item 2 (classic-rail
RAIL=dark and qa:maswali-door-dark fully green) can run on your merged head.

## Then your list (all on the runner, batched; tiles brought back and READ)
1. qa:classic-rail RAIL=drawn on a fresh in-memory dev server with FEATURE_MILLIONEA=ACTIVE (it takes a real break at the
   end); read every tile — rails and More panels — sw first.
2. qa:classic-rail RAIL=dark and qa:maswali-door-dark (WITHDRAWN with DOOR_DARK_PLANT=1, and STAFF_PREVIEW), each on its
   own fresh server.
3. Batch 2: tsc; every writer in your writers list serially (re-derive the list from your round-2 diff:
   `git diff --name-only 7e9a314f0...HEAD` then `git grep -l` each path under scripts/); the DB suites; test:visual-v1,
   test:u43-bar-ink, test:u43-market-rail; red:header-fit and red:journey-header-fit with their servers.
4. The DB-suite readers of the files 17 edited in comments/docs only (a confirmation).
5. Batch 3 (perceived performance on a production build) if your messages say it is owed: `next build` + `next start`
   needs a DATABASE_URL by design — use the in-memory dev server for drives, and for First Load JS compare the Millionea
   routes with /markets and /wallet from the build's route table (the lead's phase-4 check: REGISTER saw /millionea/slip take
   > 90 s at 12 KB/s — find the outlier, if any, and say what drives it).
Fix only what is plainly yours (guard + plant, pushed); everything else into your report with file, line and tile.

## Done means
Your list done; tsc 0 and every reader green on the runner at your final pushed head; the tiles read. Then your report
(LANE-COMMON-BLADE's six points + the round-2 extras: changed player strings in en/sw/zh; your critic rows — reduced
motion, perceived performance, chat yield — as they stand and which cells only the integrated render proves; what the
lead must do at the merge, e.g. D11's §M8a number inside item 11, the classic-visible changes parity must name).
