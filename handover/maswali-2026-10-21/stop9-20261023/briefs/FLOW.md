# Lane FLOW — Millionea's final end-to-end evaluation, and every flaw fixed before the release ships (lead asheib-f3)

## Ali's request (2026-10-23)
*"when done perfectly evaluate the final redirections and workflow of maswali. is it made perfectly"* — *"does it have
the right redirections, the right warnings, the right notifications, the right rendering, the right placement of things.
fix anything you notice not in place perfectly"*.

## What you evaluate
The release that is about to go to production: `origin/claude/maswali-s6-release` (S6-SHIP's head — it holds S5 with
round 2, S7 with the objection door, and S6: the rules page and Terms, the notices, the payout-float alert, the admin
improvements) at production's setting **FEATURE_MILLIONEA=ACTIVE** (production is ACTIVE since 2026-10-22; nothing sells
until a week opens). Re-run on S6-SHIP's final head when it says READY.

Walk every Millionea flow as a player would, in sw first, then en and zh, at 320, 360, 768 and 1280, and judge five things
in each — REDIRECTS (where every door, button and refusal takes the reader, and back), WARNINGS (responsible-gambling and
money words at the right moment: the break, the cap, sales paused/closed, closing soon, the free-cancel window, the share
that can be smaller than the ticket), NOTIFICATIONS (the bell entries, the letters — `test:comms-email-shots` renders them
— and the winner SMS text: what each says, in each language, and that it fires at the right moment and only once),
RENDERING (no clipping, overflow, lone words, wrong ink or broken glyph; motion with its reduced-motion end state) and
PLACEMENT (each thing where a player expects it; the phone rail's Millionea track; More with Live first; the landing line;
the home card; the journey tab).

The readers and flows: a guest; a new player with no money; a funded player; a player at the ticket cap; a player on a
break; a held wallet; a self-excluded account; sales paused; sales closed; a week settled with a win, a loss and a
rollover; a voided question; a voided week (refunds); an open objection window and a decided objection.
The paths: every entry point → the hub → How to play → the slip (answer all 15, the price, the confirm, buy) → the
receipt → the ticket page (states, free cancel, the objection door) → results / the register → notices. Where a step needs
money: insufficient balance → the deposit door → back to the slip with the answers kept; a guest buying → sign-in → back.

Use the drives that exist first (`qa:maswali-player-drive` at ACTIVE through every step, `maswali-player-shots`,
`qa:landing-doors`, `qa:classic-rail`, `qa:millionea-break-nav`, `qa:break-money-doors`, `qa:maswali-objection-door`,
`qa:maswali-door-dark`, the hub/register/tickets shot scripts, `test:comms-email-shots`, `test:maswali-notify`), then walk
by hand (Playwright scripts in your scratch) wherever a drive does not cover a step. READ every tile yourself.

## What you deliver
1. A report to "main": each flow × the five judgements: PASS, or the flaw with its tile, the rule or measurement it
   breaks, and the exact file:line.
2. FIX every flaw that is plainly a defect (a wrong redirect, a missing warning, a wrong word, a clipped label, a misplaced
   element): on branch `claude/maswali-flow-fixes` from S6-SHIP's head, each fix with its guard and plant, its record
   (LANE-COMMON's last section), pushed after every commit; tell S6-SHIP (agent a3036ac03a0150588) each head to merge. A
   flaw that needs a product decision → main, with your recommendation; never change a ruled word or rule on your own.

## Tree, budget
Tree: `git -C C:/50pick-ssd/maswali-coord-20261019 worktree add C:/50pick-ssd/kipindi-mln-flow -b claude/maswali-flow-fixes origin/claude/maswali-s6-release`,
then a REAL node_modules copied from the gate tree (it has embedded-postgres restored):
`robocopy C:\50pick-ssd\kipindi-mln-gate\node_modules C:\50pick-ssd\kipindi-mln-flow\node_modules /E /MT:16 /NFL /NDL /NJH /NJS /NP`
(never a junction for dev servers; never `npm ci`/`npm install` without restoring embedded-postgres after). Heavy jobs:
`bash $S/mln-slot-s5x.sh flow <cmd…>`; ports 3740–3749; KP_SCRATCH_PORT 5479; scratch `$F/flow/`. Never touch production
(no sign-in, no writes); never send a real SMS or email (the dev store's providers are mocks — confirm before any send).
Commit messages via a file, `git commit -F`, subject `MASWALI-BUILD FLOW <n>: …`, body ending with a blank line and
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push with a full refspec + ls-remote.
