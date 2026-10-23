# S5 round 2b — finish HUB round 2 and R3-FIX, verified, for the release after S7+S6 (lead asheib-f3, 2026-10-23)

## Why
Ali (2026-10-23): *"proceed try to finish everything … end development perfectly"*; *"make sure everything perfect
visually and logically"*. Two S5 branches were never finished or merged: `claude/maswali-s5-r2-hub` (536b66535, HUB 13
WIP) and `claude/maswali-s5-r3-fix` (3b24c846c; R3-FIX 1 WIP). Millionea is ACTIVE on production (since 2026-10-22), so
every defect they fix is live today — e.g. the phone rails' labels cut at 320–332 in sw/zh (R3-FIX 3).

## Two lanes, one release
| Lane | Agent | Branch (from) | Tree | Ports · KP_SCRATCH_PORT · scratch |
|---|---|---|---|---|
| HUB-2B | ae99d072f737e490b | `claude/maswali-s5-r2-hub` (536b66535) | `C:/50pick-ssd/kipindi-mln-hub2b` | 3750–3759 · 5481 · `$F/hub2b/` |
| R3-2B | a872f3c3249f4d9ac | `claude/maswali-s5-r3-fix` (3b24c846c) | `C:/50pick-ssd/kipindi-mln-r3b` | 3760–3769 · 5482 · `$F/r3b/` |

Tree: `git -C C:/50pick-ssd/maswali-coord-20261019 worktree add <tree> <branch>` (fetch first), then a REAL
node_modules: `robocopy C:\50pick-ssd\kipindi-mln-gate\node_modules <tree>\node_modules /E /MT:16 /NFL /NDL /NJH /NJS /NP`
(never a junction for a dev server; never `npm ci`/`npm install` — if you must install, restore embedded-postgres and
async-exit-hook from the gate tree after).

## First: bring your branch to live main
When the lead says main is live at its new head (fd5368668: UDDOT — Up & Down's golden dot removed from every nav — and
LICBASIS), merge `origin/main` into your branch. Your branch is behind main (HUB 51 commits, R3-FIX 7): resolve every
conflict as its owner and explain each in the merge commit. R3-FIX's rail rules (globals.css; DESIGN_AUTHORITY §K 8b,
§M8a item 11) meet UDDOT's dot removal: no rail tab may regain a dot, and Millionea keeps its gold diamond and ink.
Until then, read and plan; do not start the long measurements on a base that will move.

## What is left
**HUB-2B:**
1. HUB 13 (WIP): verify the WebKit hold (the move's own request held, never a prefetch; measured at rest) — the hub drive
   green in Chromium AND WebKit at device pixel ratios 2.625 and 3 with the CJK face, against main's REGISTER ledger
   (REGISTER r2 is live now: its priceRun / counted fixes are in).
2. The tables (EYEBROW, QUESTIONS_HEADING, RANGES, WRAPS) measured in the four configurations (the lead's ruling recorded
   in HUB 12).
3. The FACTS keeper's connective: `reservesShort` ends a line on "ya" at sw 360 and 1280 — the shared keeper
   (`keepFact`) must keep a connective with its next word as the kit's `keepConnectives` does in labels; one rule, its
   guard + plant, every caller read.
4. Every tile of the hub re-read (sw first, then en, zh; 320, 360, 768, 1024, 1280, 1920; every state the drive seeds).
**R3-2B:**
1. R3-FIX 1 (WIP): qa:hover-touch verified on the runner with its controls, and its red twin (the hover gate undone in
   globals.css) caught by 1.1–1.3.
2. **The lead's ruling on R3-FIX 6's open point:** a loading drawing that models a STATIC paragraph (the register index's
   intro, How to play's steps and caption, the commitments' closing sentence, a fingerprint's 64 characters) sets that
   paragraph's own words unseen — the page's own type, measure and font, the ink transparent — with a bar under each
   line box it breaks into (an inline run with the skeleton's fill and `box-decoration-break: clone`), so it lands
   exactly in any engine by construction; its per-language line table is deleted. The drawing stays `aria-hidden`, never
   selectable, never focusable. Only DATA paragraphs (a week's facts) keep a line table, measured in Chromium, with the
   WebKit difference printed per cell. Record it in DESIGN_AUTHORITY §M4a rule 5 (replacing the open ⚠️ point) and
   §M8a item 22. The loading drawings' dark-safety stays as DOORS fixed it: no Millionea data or prop leaks to a page
   that is dark.
3. R3-FIX 4's ⚠️: with `fonts-noto-cjk` installed in CI, re-read EVERY browser gate's zh result (test:responsive,
   test:motion, the needle) at your head — a gate that passed on boxes now meets real Chinese widths; fix what is real.
4. R3-FIX 7: tsc, test:all, every drive you touched at the final head, and the rails' tiles (320/340/360/412, sw/en/zh,
   both engines) read by you.

## Proofs and measurements
WebKit and the Linux renderer: use GitHub's runners as R3-FIX and HUB did (`gh workflow run … -R alisheib/kipindi --ref
<your branch>`; the repo is public, minutes are free) — they also keep this machine's RAM for the S7+S6 release. Locally:
`bash $S/mln-slot-s5x.sh <lane> <cmd…>` (slots 1, 2, 3, 5 shared with the lead, FLOW, GUIDE and S6-NOTICES). Every check
you add has its plant (LANE-COMMON). CI on your branch: no failing case beyond main's own (test:needle-rest 55/35, the
same 35 cases). D19a (scripts/lib/house-bot-absence-cases.mts): re-pin only if your dictionary changes, with the strip-mln
check and a reviewed comment. Parity: if a classic surface moves (the classic phone rail does), name every difference.

## Rules
Never push `main`; never touch another lane's tree; stop only your own servers; never `TaskStop` a lock holder; never
print a secret; never touch production. Commits via `git commit -F`, subject `MASWALI-BUILD S5-R2-HUB <n>: …` or
`MASWALI-BUILD S5-R3-FIX <n>: …` (continue the numbering), body ending with a blank line and
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push after every commit (full refspec + `git ls-remote`).
Report "READY at <sha>" to the lead (the main conversation) with every printed count and every tile you read; a WIP
commit says "WIP: not verified" and what is left, in order, if you must stop.
