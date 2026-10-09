# R5-K / R5-L brief — every loading ghost lands where its page lands, box for box (follow-up)

You are helper R5-K or R5-L (your prompt says which, and your routes) in the follow-up round of 50pick's visual pass
for Vodacom. Worktree: F:\kipindi-r5k (R5-K) or F:\kipindi-r5l (R5-L), each on its own branch at vodacom-visual's tip
9677a3f5 (rebased on main 118fc75c, with R5-A..F, R5-H and R5-I merged). Working at the same time: R5-G (porting its
names work onto this tip — it touches deposit/withdraw loading and DepositGhost: if your route is one of those, keep
your hunks small and name the overlap), R5-J (counts and figures), and three read-only reviewers. ⚠️ OMEGA's memory is
shared and near its limit until the marketing session finishes: run suites strictly one at a time, never a dev
server, build, tsc, browser or battery (test:all). Read first, completely: S\briefs\r5-common.md (the rules — CONSISTENCY above all; where it says
"1699302a" read the tip named in your prompt), then R5-H's commit message on the branch (`git log --format=%B --grep
"R5-H" -1` in your worktree): it moved every player loading drawing to a client module (one convention, written in
src/components/ui/page-loader.tsx — the drawing reads its words with useT(); a loading file that needs a server answer
stays a server file and hands the drawing only that answer) and fixed the exact band defects its three auditors found.
Keep every guarantee it, R4-J and R5-D made: the ghost's words and boxes land where the page's do, the transport stays
a client reference (no drawn tree in any payload), the journey's chrome in the first paint, one tab lit, classic
unchanged except the ghost bodies themselves.
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

THE DEFECT CLASS: a ghost whose bands, heights, paddings, gaps or order differ from its page's makes the page JUMP when
the data lands — on a money page, at a Vodacom review, on a phone. R5-H's auditors listed the ghosts that need more
than a class fix (a rebuild, or a data-dependent height). Rebuild each ghost from its page's real structure: the same
kit components and the same props where the drawing allows (PageHeader, PageHero, BackLinkGhost, the money bar ghost,
Chip boxes, Stat boxes), each band's height derived from the page's classes on THIS repo's overridden scale
(px-3 = 16px, 6 = 32px; `--sp-*`; tokens like --h-input 44px, --h-control-lg 48px), per breakpoint (320, 360, 390,
640, 768, 1024, 1280) and per locale where words set a height (sw is longest; measure with the fonts — S\r5e has a
Sora/Inter width model). Where a band's height depends on data the ghost cannot know (a list's length, a wrap that
depends on a player's name), draw the most common case and SAY which case you drew and why.

ROUTES (R5-H's list; your prompt names your half)
- K: /wallet/receipt/[id] (hero shape, chip band, 51px row pitch, footnote); /wallet/deposit (form card padding, the
  provider-first order, 106px tiles, amount chips and hint, phone hint and button, trust strip); /wallet/deposit/return
  (a hero, not a card; rows; two buttons); /wallet/withdraw (a spinner panel instead of the form or the KYC panel — draw
  the form, and say what a KYC-gated reader sees); /profile (hero column and strip, achievements, row count, sign-out);
  /positions classic (the header button at 360, the strip's auto-fit grid, exposure keys 14px, row 2 three lines at lg);
  /positions/performance (stale band order).
- L: /agent (tile, panel and waterfall heights), /agent/apply (title row, step-button rail, one panel plus nav),
  /agent/status and /agent/invite (content bands); /leaderboard (ribbon, lens nav, sort row, podium; the extra spinner
  box; the table head); /results (carousel height at 1280, row-2 wrap at lg — measure); /markets (row-2 wrap at lg in
  sw); /live (CTA wrap threshold at 377–391px; card height by locale); the PageLoader routes (generic by design: their
  first band — a 257px spinner box against a page that starts with a 44px back link or a hero — decide per route
  whether to give it the page's first band, and apply ONE rule to all of them); the in-page Suspense skeletons
  (ResultsSkeleton, GridSkeleton and any other in src) — the same rule.

PROOF as r5-common.md says: a suite (K: scripts/visual-pass-r5k.test.mts → test:visual-pass-r5k; L: r5l), rendering
each ghost and its page's structure with react-dom/server where the page renders without data, else comparing class
lists band by band; controls and plants; a mutation proof under S\r5k\ or S\r5l\; every suite reading a touched file.
Name precisely what a lock turn must re-tile (extend qa:ghost-landing's routes/widths if you can: write the drive change
and say so — no browser yourself).
