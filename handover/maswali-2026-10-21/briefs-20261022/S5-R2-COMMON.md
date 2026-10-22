# S5 round 2 — what every S5 lane does in THIS step (lead asheib-f3, 2026-10-22 PM)

Ali's request (2026-10-21): every Millionea surface rated 10/10 by a player, a UI/UX engineer and an animation
specialist, fully consistent with 50pick's design, before it ships. Round 1 is merged into `claude/maswali-s5-release`
(`7e9a314f0`). Round 2 started on six branches and stopped clean at 2026-10-22 ~08:00Z; you resume YOUR branch.

## Read (in this order)
1. `$F/LANE-COMMON.md` (the rules) — it supersedes the slot/scratch paths in older briefs.
2. `$S/critics/DESIGN-LANE.md` — who owns which file (still binding), the design loop, the rules that never bend.
3. `$S/critics/ROUND2.md` — round 2's rulings (§T5 numerals, zh spacing, one ledger + note line, one week chip/row/phase,
   the chat's .50 yield, a dialog's way back never moves the page = §M8a item 18, L16 no change).
4. Your critic report(s) in `$S/critics/` (named in your brief) — **LEAD RULING** lines are decisions.
5. `git show 38ef27da2:handover/maswali-2026-10-21/MERGE-NOTES.md` → the "ROUND 2 STOP" section (your lane's entry) and the
   "2026-10-22 — ALL LANES MERGED" red list.
6. Your branch's own commits: `git log --format='%h %s%n%b' 7e9a314f0..HEAD` — what is verified, what is WIP.

## Scope of THIS step (important — it differs from ROUND2.md's loop)
- Finish your LEFT list (your brief): code, guards + mutation proofs, every reader suite + red twin, `tsc` (slot), and
  only the TARGETED drives/shots that prove what you changed (the ones your brief names).
- ⛔ Do NOT run your surface's FULL re-shoot now. The lead merges all six lanes, then renders the integrated head ONCE
  (every page × 320·360·768·1024·1280·1920 × sw/en/zh, motion frames); you and the independent critics then read and
  score those same tiles, and you fix what is below 10. A full re-shoot on your branch would miss the other lanes' round-2
  work and cost ~45 min of the shared machine.
- Clear the release-only reds your brief assigns to you; never weaken a guard to do it.
- Self-review your branch's whole round-2 diff before you report: dead code, names, one wording per truth, kit reuse.
- Shared files (i18n-dict.ts, globals.css, millionea-view.ts, maswali-player.ts, package.json, the kit): tight hunks in
  your own block, never reformat or reorder — the lead merges six branches.

## Your report adds (beyond LANE-COMMON's six points)
7. Every changed/new player string in en/sw/zh.
8. Your critic table as you believe it stands now, and which cells only the integrated render can prove.
9. Anything the lead must do at the merge for your lane (re-pins, wiring, a deletion).
