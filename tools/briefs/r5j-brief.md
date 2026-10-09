# R5-J brief — one way to count, one figure matcher (round 5's follow-up, consistency)

You are helper R5-J in the follow-up round of 50pick's visual pass for Vodacom. Read first, completely:
S\briefs\r5-common.md (the rules — CONSISTENCY above all; where it says "1699302a" read the tip named below), then
S\visual\triage-r5.md (§ "For the follow-up round") and the R5 reports' notes quoted here.
Worktree: F:\kipindi-r5j (branch vodacom-visual-r5j at vodacom-visual's tip 9677a3f5: rebased on main 118fc75c, with
R5-A..F, R5-H and R5-I merged). Working at the same time in their own worktrees: R5-G (one page one name, the
regulator's name — porting onto this tip), R5-K and R5-L (rebuilding loading ghosts) and three read-only reviewers.
⚠️ OMEGA's memory is shared and near its limit until the marketing session finishes: run suites strictly one at a
time, never a dev server, build, tsc, browser or battery (test:all). R5-I added `refusalReason`/`refusalVariant` and
R5-E `moneyRuns`/`figureRuns` — read them before adding any counting or figure helper.
Suite: scripts/visual-pass-r5j.test.mts → test:visual-pass-r5j.
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

Read the merged round-5 commits first (`git log --format=%B -6` in your worktree): R5-A made the journey's hub, avatar
menu, footer and profile rows name each page as the page names itself (F17, `hub-rows.ts`, `avatar-menu.tsx`'s
`journeyName`, `public-footer.tsx`); R5-B gave the journey's money doors one pair, `journey.depositAction` /
`journey.withdrawAction` (sw "Weka pesa" / "Toa pesa"), via `resolveSimpleJourney`; R5-D moved the deposit page's
loading drawing into `DepositGhost` (also drawn in the browser by `components/journey/route-ghost.tsx`).

YOUR ITEMS
G-4 One way to count (R5-A's named siblings). Player-facing counts are grouped through `formatNumber` (the reader's
    locale) and followed by their lower-case plural key, as R5-A made the cards and /results ("12,479 imetatuliwa",
    "2 watabiri"). Still bare or runtime-locale: FilterPill counts on every rail (production /results shows "Zote
    12479"), /live (`markets.length`), /profile/account (`activity.length`), /updown/history (`rows.length`,
    `g.bets.length`), /proposals (`toLocaleString()`). Find EVERY count a player can see (grep `.length}`, `Count}`,
    `toLocaleString(`, `count={`, FilterPill/Chip count props, notification badges) and bring each to the convention,
    or say why it differs (a badge capped at "9+", an admin page — out of scope).
G-6 One figure matcher (R5-E's named siblings). R5-E made `moneyRuns`/`figureRuns` (keep-run.tsx, keep-words.tsx) the
    one reader of money and figures. `operation-result-modal.tsx` ~166 `withWholeFigures` is a second matcher: it
    swallows a sentence's trailing comma and misses compact ("TZS 1.2M"), decimal and no-break-space figures — move it
    to the shared reader (test:sell-grace-truth pins it line for line: move that pin with the reason). Then find every
    other private figure/money regex in player code and bring it to the shared reader, or say why it differs.
    Also the empty-slot NBSP placeholders (analytics-choice.tsx ~28, search-box.tsx ~197, time-select.tsx ~177,
    trust-band.tsx ~313): one convention (e.g. an `:empty::before` rule) so no invisible character is copied or read
    — keep the ZWSP live-region nonce in use-quick-bet.ts (it is functional) and the legal tree's authored &nbsp;
    (byte-pinned).


PROOF as r5-common.md says (suite, controls/plants, mutation proof under S\r5j\, every suite that reads a touched file).
Predict every "after" and list exactly what a lock turn must re-tile.
