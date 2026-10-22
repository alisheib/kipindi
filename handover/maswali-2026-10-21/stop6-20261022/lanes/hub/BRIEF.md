# Lane HUB — S5 round 2, finish (the Millionea hub `/millionea`) — lead ali-7e on ALI-BLADE15, 2026-10-22 evening

- Worktree `C:/kipindi-mln-hub` · branch `claude/maswali-s5-r2-hub` (head `b513328cc`, a WIP commit: "not verified — one
  red unexplained (H6 carry, sw 1920x1440)") · step name `S5-R2-HUB` (your next commit is 5) · scratch
  `C:/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/22b71bac-cd55-4164-a2d1-012a5a83c1c2/scratchpad/lanes/hub/`.
- Read FIRST: `../LANE-COMMON-BLADE.md` (this machine's rules — no Node here; every check through the remote runner).
- Then (git show from `origin/maswali-handover-20261021`, folder `handover/maswali-2026-10-21/`):
  `stop5-20261022/briefs/HUB.md`, `stop5-20261022/briefs/S5-R2-COMMON.md`, `critics/COMMON-R2.md`, `critics/ROUND2.md`,
  `critics/DESIGN-LANE.md`, `critics/R1-hub.md`, the hub rows of `critics/R1-motion.md`, and your lane's tools in
  `lanes-20261022/hub/` (heavy-r2.sh = the job pattern: tsc, red twins, the state drive `scripts/maswali-hub-states.mjs`
  runs a/b/c on a fresh dev server with FEATURE_MILLIONEA=ACTIVE MLN_HUB_RUN=<run>, tiles in
  `.50pick-shots/maswali-hub-states`; plants.mjs = the plant run; heavy-c4/c5 were not saved: rebuild them from these).
- Your own last commit message (`git log -1 --format=%B b513328cc`) holds the lead's rulings 2a–2c and "What is left, in
  order" 1–6: that list is your work order.

## Step 0 — bring your branch onto the current release (do this first)
`git fetch origin` and merge `origin/claude/maswali-s5-release` (head `2ed817395` or newer — if it moves while you work,
merge it again). The release gained S5-FACTS/FACTS2 (keepFact, MaswaliFacts, salesCloseColon, MaswaliStrike — §M8a item
24), the language-loader colour fix and three red fixes since your base. A trial merge conflicts ONLY in
`docs/DESIGN_AUTHORITY.md` §M8a: both sides appended numbered items — keep every item, in number order (the release's 24,
then your 25–27). One merge commit (`MASWALI-BUILD S5-R2-HUB 5: merge the S5 release …`) whose message names the
resolution. Then the lead's merge-time wiring that touches YOUR files can be done by you now, on this branch:
- the hub's close line reads `salesCloseColon` (your 18.1/18.2 say it is done — confirm), and the question rows adopt
  `MaswaliStrike` for a voided question if they draw a strike (§M8a item 24 says the hub adopts it at the merge);
- `reserveRuleAfterHead` swaps in the slip (`maswali-slip.tsx` ~458) and the ticket (`maswali-ticket.tsx` ~428) — those
  files are SLIP's/TICKETS', whose lanes are finished and merged: you may make exactly this swap, with its guard;
- the no-week EmptyState → TICKETS' `MaswaliEmptyState` (merged in the release: `src/components/maswali/maswali-empty-state.tsx`):
  `<MaswaliEmptyState title={t.millionea.hubNoWeek} body={noWeekBody(t, locale, hub.paused ? null : msOf(hub.nextOpensAt))} fill />`
  and drop the drive's T5_THEIRS entry for `[data-testid="millionea-hub-no-week"] p.leading-relaxed`;
- `millionea-shell` 1.1b → "no call left" if your branch is the one that removes the last MillioneaPreviewMark call, and
  delete the component only when NO call is left anywhere on the merged tree (grep), with its §M8a/qa:live notes
  (PLATFORM's note: qa:live's PREVIEW_TESTIDS keeps `millionea-preview-mark` — it is the BAR's own testid).

## Then your list 1–5 (your commit message), every check on the runner
Batch: one job = tsc + your static suites + the reds of the files you touched + the drive runs you need, tiles brought back
in `$OUT`. Explain the H6 carry red (repeat run vs a code cause — never waived). G2's per-language widths come from the
INFO lines a run prints. REGISTER's round 2 is finished but NOT yet in the release (the lead merges it next): measure your
drawing's ledger against REGISTER's ledger by merging `origin/claude/maswali-s5-r2-register` into a THROWAWAY local branch
for that one run (never into your branch; delete the throwaway after), and say so in the run's name and your report.
Read the tiles you need yourself (≤ 40 per pass, sw first).

## Done means
Your list 1–5 done, each change with its guard + plant, tsc 0 and every reader of every file you touched green on the
runner at your final pushed head, the tiles of your states read. Then your report (LANE-COMMON-BLADE's six points + the
round-2 extras: every changed player string in en/sw/zh; your critic table as it stands and which cells only the
integrated render proves; what the lead must do at the merge).
