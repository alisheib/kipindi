# S6 visual pass — the state, for resuming on any machine (updated 2026-10-09 ~19:40 EAT)

**Why this file exists.** Ali, 2026-10-09: *"push live everything you have in case later we proceed on another machine
… not to keep anything locked on this machine and the next machine repeats it by accident."* Everything the visual
pass has merged is on GitHub (`origin/vodacom-visual`); this file says what is merged, what was still running on
OMEGA-COMPILE01 when it was written, what is ready to start, how it goes live, and every question for Ali. The
session's scratch evidence (round tiles, triage notes, measurement scripts) lives only on OMEGA — the essential text
of it is copied below.

## 1 · The branch
- **`origin/vodacom-visual`** — the S6 visual pass (journey shell + shared page bodies), NOT live. Rebased on main
  `118fc75c` (the proxy hotfix); main has moved since (S14's STEP 57 `f33909983`) — rebase again before the final
  proof. Backups on OMEGA: `vodacom-visual-pre-rebase3` (before the last rebase).
- Live from this lane today: the two security hotfixes on main — `9cb95938` (immutable cache only for static files)
  and `118fc75c` (the proxy, so its security headers, runs for every page address); both read back on production.

## 2 · Merged on the branch (each commit's message is the full record)
Rounds 1–4 of the visual pass and the edge read (R3-*, R4-C…K), then round 5:
- **R5-F** — qa:bar-geometry repaired (painted boxes; an empty book or short page says NOT MEASURED).
- **R5-D** — loading ghosts and the not-found view out of every document (31 KB → 138 B); a real market never served as
  "not found"; the service worker caches only images and fonts.
- **R5-B** — the Wallet's footer, tabs and docked sheets on the column's rhythm; notices dated in the reader's
  language and cut at a word; one name per money action in the journey; an empty inbox without filters.
- **R5-C** — the second gold audit: gold only where money was earned, other highlights in the brand family, identity in
  metal; a census that fails on any new gold use.
- **R5-E** — every market title balanced with its figures whole; Chinese units and currencies kept with their numbers;
  no invisible character inserted into any sentence; the keep-words helpers linear and cluster-safe.
- **R5-A** — the home card on the claim's capitals; one page, one name in the journey; every close ✕ on its title's
  capitals and withheld while a request is in flight; counts grouped; the regulator's name and legal titles kept whole.
- **R5-I** — every state in its own ink (the betting YES/NO colours only for a bet's sides); fixable refusals said
  calmly; grant states in their own tones.
- Two red twins green again (the colour gate judges the standalone /offline document against its own tokens;
  implicit-submit's plants).
- **R5-H** — every loading ghost a client reference instead of a drawn tree in every refresh (/wallet/receipts 16.9 KB
  → 0.5 KB per refresh), the ghosts' bands fixed, the journey flag and the not-found mark in the first paint they
  belong to. Committed and pushed `9677a3f5` while its merged-tree proof was still running (181 suites, the red twins,
  all seven round-5 mutation proofs) — anything it finds is fixed forward.
Each merge was proved on the merged tree: every suite reading a touched file, the helper's suites, the red twins it
touches, and every round-5 mutation proof (R5-A 41, R5-C 59, R5-E 27, R5-I 58 planted defects, all caught, all files
restored byte-identical). Known reds that are not the branch's: `test:orphans` (main's two landing-v3 panels),
`test:house-bot-disclosure` D19a (the legal-tree pin — green once the branch is main), `test:backup` from a junctioned
worktree (the shared Prisma client predates main's `targetListId`), `test:house-bot-holder-lifecycle` (main's own;
S14 fixing).

## 3 · Running on OMEGA when this was written (redo from the brief if OMEGA is gone)
- **R5-H's merged-tree proof** (the commit is pushed; see §2).
- **R5-G** (helper, worktree `F:\kipindi-r5g`): one page, one name for the journey's money pages and every door; the
  regulator's name everywhere it renders — FINISHED on `eaed15d0` (61 checks, 30/30 plants), now being ported onto
  `9677a3f5` (R5-H reshaped the loading ghosts it touches). Its finished work is pushed as `origin/vodacom-visual-r5g-wip`
  (`a32c3317`, the snapshot before the port). Brief: appendix B.
- **A browser probe** of R5-H's proposed route-entrance patch (a fade that may blink on every journey tab tap and
  replay at hydration, jumping the page to the top): opacity sampled per frame before and after, in a lock turn.

## 3a · Also pushed
- `origin/vodacom-visual-tools` — the session's working tools (lock-turn chains, merge checks, briefs, triage notes,
  owner lists, every round's mutation proof, the probes; no tiles or logs). Its `README-TOOLS.md` maps them.

## 4 · Started on OMEGA at ~19:45 EAT (Ali: "allocate more agents"; static work only until the marketing session
frees the machine's memory — no dev server, build, tsc, browser or battery). Worktrees `F:\kipindi-r5j`, `-r5k`,
`-r5l`, and `F:\kipindi-rev` (the reviewers' stable copy at `9677a3f5`). If OMEGA is gone, start each again from its
brief on the latest `origin/vodacom-visual`:
- **R5-J** — one way to count, one figure matcher (appendix C).
- **R5-K / R5-L** — rebuild the ~20 loading ghosts that still don't match their pages box for box (appendix D).
- **Three independent reviewers** of the whole branch — A server/money/RG/security, B client runtime/hydration/
  performance, C cross-surface consistency (appendix E).
Every helper follows the common rules (appendix A).

## 5 · How it goes live
1. Merge every helper above; rebase on the latest main.
2. The final proof, in lock turns on OMEGA (scripts in the session scratchpad, `wm16a`–`wm16d`): typecheck + the whole
   battery with the database suites + every red twin the pass touches; classic-shell parity against a baseline at the
   new base (named EXPECTED_DIFFS only, never a re-baseline), header fit, the landmark seals, needle-rest,
   bar-geometry (with main as control), the preview drive, local `qa:live`, round 6's tiles; the edge scenarios with
   R4-J's verdict; document weight tip vs main; R5-H's lock-turn items (production-build chunks, refresh bytes, frame
   recordings, the swept ghosts re-tiled).
3. Round 6's read of every tile; anything found is fixed and proved, and the read repeats until it finds nothing.
4. Tell the other sessions, push to main, watch the deploy, read back production (`qa:live` as QA Mobile 01 with the
   peer notice), close S6 in VODACOM-PLAN §0g/§0h/§0i.

## 6 · Questions for Ali (none blocks the pass; each has a default in place)
The plain list is appendix F; the full record is appendix G.

---

## Appendix A · the rules every helper follows (briefs/r5-common.md)

### Round 5 fixers — the rules every R5 helper follows (read completely before anything else)

Product: 50pick, a Tanzanian real-money prediction market in Swahili, English and Chinese. Next.js 16 App Router,
React 19.2, TypeScript, Tailwind 3 with an OVERRIDDEN spacing scale (px-3 = 16px, 6 = 32px, `--sp-4` = 16px).
The owner's rule: only perfect visual AND logical results are accepted; nothing is deferred as small; every finding is
re-measured first (CONFIRMED / REFUTED with numbers), every "after" is computed and guarded.

- WORK ONLY in your own worktree (named in your brief), whose branch sits at vodacom-visual's tip 1699302a.
  node_modules is a junction to F:\kipindi-main\node_modules — never delete it recursively, never `npm ci` there.
- Do NOT commit, push, stash (`git stash` is forbidden on this machine), take the shared lock
  F:/kipindi-locks/heavy-node.lock, run tsc, or start a dev server or a browser. Lock turns run browsers; if a proof
  needs one, write the check (or the drive addition) and say so.
- Keep CRLF line endings (the repo is autocrlf). Git Bash eats backslashes in `-e` scripts and heredocs: use the Edit
  tool or node script FILES for anything with backslashes or multi-line edits.
- NO dictionary string may change (src/lib/i18n-dict.ts). Compose with EXISTING keys; anything needing new or changed
  words goes in your report under S12. Responsible-gambling sentences are owner-approved copy: never reword, never
  remove an RG notice, helpline or limit control.
- Classic CHROME (header, bar, rail, footer, ticker, bell, capsule, the classic avatar menu) is frozen for S6/S7 —
  `qa:classic-shell-parity` captures it. Journey-only changes go through journey components, a `journeyShown`-style
  prop the shell passes, or `:root:has(#kp-journey-shell)`. Shared page BODIES may be fixed for both shells — say
  exactly what classic viewers see.
- Gold is money (DESIGN_AUTHORITY Q5 "GOLD IS MONEY, AND NOTHING ELSE"; M3 "struck gold appears only where money was
  earned (payout, celebration, resolved seal)"; F3 "--warning-fg IS --gilt … a refusal has earned nothing"). The
  `--warning-fg: var(--gilt)` token itself is an owner ruling — do not change it.
- Other R5 helpers work at the same time in their own worktrees (R5-A home/cards/markets/results/legal/footer/hub/
  channels/capture; R5-B wallet/sheets/notifications/tickets/bell; R5-C the gold audit; R5-D offline/service worker/
  not-found mark/route ghosts/market metadata; R5-E text wrapping and the keep-words helpers). Stay in your area; if a
  fix needs another area's file, make the smallest hunk and name it in your report. The integrator merges with
  `git apply -3`.
- Evidence: round 5's tiles S\visual\tiles-r5 (and their diff overlays S\visual\diff-r5 against round 4), the edge
  tiles S\edges\tiles; the findings with tile numbers and measurements are in S\visual\triage-r5.md (and
  S\visual\triage-r4.md's EDGES section). Measure with PowerShell System.Drawing (no Python on this PC).
  S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad
- ⭐ CONSISTENCY IS THE RULE (Ali, 2026-10-09: "we need consistency and perfection in each move even if it takes more
  time"). A finding is never fixed on the one tile that showed it: for every item, FIND ITS SIBLINGS — the same
  pattern on every other surface (grep the class, the component, the convention: e.g. every close ×, every dialog
  title, every hairline above a sheet's actions, every place one page is named, every money figure, every centred
  zh line) — and bring them ALL to the same convention, or state in the report why a sibling legitimately differs.
  Where two conventions exist today, pick ONE (say why) and apply it everywhere in your area; name siblings outside
  your area for the integrator. Your report lists, per item, every sibling found and what was done to each.
- PROVE IT: a new `scripts/visual-pass-r5<x>.test.mts` registered as `test:visual-pass-r5<x>` in package.json (put
  your line next to the other visual-pass suites; expect a neighbour's line beside it at merge), reading source
  through scripts/lib/decomment.mts (decomment/decommentCss), rendering with react-dom/server where useful (see
  scripts/visual-pass-r4e.test.mts and r4i for the style); every fix with a control or a planted defect; and a
  mutation proof (a scratch script under S\r5<x>\) that plants each defect on disk, shows the suite catches it on its
  named check, and restores every file byte-identical (sha-256). Update any existing pin your change moves, with the
  reason. Run every static suite that reads a file you touch (grep scripts/ for each path) plus test:red-anchors,
  test:decomment, test:hooks-order, test:ui-consistency, test:i18n, test:journey-shell, test:simple-journey-flag,
  test:eyebrow-roles, test:type-scale, test:spacing-scale, test:design-frozen, test:css-vars-defined, test:stacking —
  each `npm run -s <name>` from your worktree, one at a time. Known reds that are NOT yours: test:dead-css,
  test:orphans, test:campaign-gates, test:house-bot-disclosure (the legal tree's byte pin, red until the branch is
  main). Name the files that need tsc.
- REPORT (final message): per item CONFIRMED/REFUTED with the measurement, the cause (file:line), the change and its
  predicted "after"; owner questions; S12 items; what classic viewers see; guards + plants + the mutation result;
  every suite and exit code; `git diff --stat` (+ untracked). Nothing committed.

---

## Appendix B · R5-G's brief

### R5-G brief — one page, one name; the regulator's one name (round 5's follow-up, consistency)

You are helper R5-G in the follow-up round of 50pick's visual pass for Vodacom. Read first, completely:
S\briefs\r5-common.md (the rules — CONSISTENCY above all; where it says "1699302a" read the tip named below), then
S\visual\triage-r5.md (§ "For the follow-up round") and the R5 reports' notes quoted here.
Worktree: F:\kipindi-r5g (branch vodacom-visual-r5g at vodacom-visual's tip eaed15d0: rebased on main 118fc75c, with
R5-A, R5-B, R5-C, R5-D, R5-E and R5-F merged). Working at the same time in their own worktrees: R5-H (the loading ghosts
out of every refresh, the journey flag — F:\kipindi-r5h, at an older tip) and R5-I (state inks — finished, merging
next); R5-J (counts and figures) and three reviewers may start later. Stay in your area; name others' files for the
integrator. Note R5-A's keepRegulator matches the zh name's break hint as `\p{Cf}` (no invisible character in source —
R5-E's census, test:visual-pass-r5e §6.5, forbids raw or escaped NBSP/ZWSP/WJ in player code).
Suite: scripts/visual-pass-r5g.test.mts → test:visual-pass-r5g.
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

Read the merged round-5 commits first (`git log --format=%B -6` in your worktree): R5-A made the journey's hub, avatar
menu, footer and profile rows name each page as the page names itself (F17, `hub-rows.ts`, `avatar-menu.tsx`'s
`journeyName`, `public-footer.tsx`); R5-B gave the journey's money doors one pair, `journey.depositAction` /
`journey.withdrawAction` (sw "Weka pesa" / "Toa pesa"), via `resolveSimpleJourney`; R5-D moved the deposit page's
loading drawing into `DepositGhost` (also drawn in the browser by `components/journey/route-ghost.tsx`).

YOUR ITEMS
G-1 One page, one name — the money pages. In the journey /wallet/deposit's h1 reads "Amana" (eyebrow "WEKA PESA") and
    /wallet/withdraw's "Toa fedha" (eyebrow "TOA"), under journey doors that say "Weka pesa" / "Toa pesa". The journey's
    pages take the journey's keys (composition — no new words); classic keeps its words. The page's loading ghost and
    the browser-drawn route ghost must land on the same words (the ghost's words land where the page's do, R4-J/R5-D),
    and the page's `<title>` / metadata must agree with its h1 in the journey (check how R5-A treated titles). Then the
    SWEEP (consistency): every journey door → the page it opens, for every page a journey player can reach (hub rows,
    avatar menu, footer, the Wallet's buttons and empty states, the bell's notices that link somewhere, the receipt
    page, the bottom tabs, the Up & Down entry, the profile rows) — list each pair door-word / page-h1 / page-eyebrow /
    ghost / `<title>` per locale, and bring each to one name or state why it legitimately differs (an action door like
    "Weka mipaka" names an action — R5-A ruled those). New words needed → S12, never a dictionary change.
G-5 The regulator's one name (R5-A's F18 siblings). R5-A kept "Gaming Board of Tanzania" whole wherever its line can
    hold it in the journey footer and the hero's trust row (`keepRegulator`, `.kp-gbt`). Siblings it named: the opt-out
    shell's footer (app-shell.tsx ~652; the sw name fits from 330px) and the offline page (offline-document.ts ~220,
    R5-D's person-free document — no client JS there; CSS only). Find every other place the regulator's name renders
    (grep the three locales' strings) and apply the one rule. The classic footer is frozen chrome — never touch it.


PROOF as r5-common.md says (suite, controls/plants, mutation proof under S\r5g\, every suite that reads a touched file).
Predict every "after" and list exactly what a lock turn must re-tile.

---

## Appendix C · R5-J's brief

### R5-J brief — one way to count, one figure matcher (round 5's follow-up, consistency)

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

---

## Appendix D · R5-K / R5-L's brief

### R5-K / R5-L brief — every loading ghost lands where its page lands, box for box (follow-up)

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

---

## Appendix E · the reviewers' brief

### Round 6 independent review of `vodacom-visual` — the brief every reviewer reads

Product: 50pick, a Tanzanian real-money prediction market in Swahili, English and Chinese (Next.js 16.2 App Router,
React 19.2, TypeScript, Tailwind 3 with an OVERRIDDEN spacing scale — px-3 = 16px, 6 = 32px, `--sp-4` = 16px; Prisma;
Railway behind Cloudflare). The branch `vodacom-visual` is the Vodacom plan's S6 visual pass: five rounds of fixes to
the new "journey" shell (flagged; classic players see the classic shell, whose CHROME is frozen) and to page bodies
both shells share. It is about to go LIVE to real players with real money. The owner's rule: only perfect visual AND
logical results ship; nothing found is deferred as small. Your job is to find what is still wrong before it ships.

WHERE: read-only. The tree is F:\kipindi-rev, detached at vodacom-visual's 9677a3f5 (a stable copy — the integrator
keeps merging into F:\kipindi-vis; never read there). The review range is
`git -C F:/kipindi-rev diff 118fc75c HEAD` (main's tip under the branch; ≈45 commits — read each commit's message too:
`git -C F:/kipindi-rev log --format='%h %s%n%b' 118fc75c..HEAD`; they state what each change promises).
⚠️ OMEGA's memory is shared and near its limit: run scripts strictly one at a time, small, and never a dev server,
build, tsc, browser or test battery. You may write
scratch scripts ONLY under S\review6\<your letter>\ and run them with node/tsx (node_modules is shared; never delete
or install anything). Do NOT edit the repo, commit, push, stash, take the lock F:/kipindi-locks/heavy-node.lock, run
tsc, start a dev server or a browser. Git Bash eats backslashes in `-e` scripts and heredocs: write script FILES.
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

METHOD
1. Read the commit messages, then the diff in your focus area (below), then the code around each hunk — a change is
   judged in its context (callers, the other shell, the other locales, the empty/error/loading/offline states, a
   phone at 320 and a desktop at 1280, a slow network, a refresh mid-request, a signed-out reader, a player on a
   responsible-gambling break or self-excluded, a held/frozen wallet, a house bot).
2. For each suspected defect, VERIFY it adversarially before reporting: reproduce it with a script (render with
   react-dom/server, run the function on the input, simulate the sequence), or cite the exact code path with line
   numbers that makes it happen. Try to refute your own finding first. Report only what survives, marked CONFIRMED
   (reproduced) or PLAUSIBLE (traced but not reproducible without a browser — say what a browser run must show).
3. Look for siblings: a defect found once is searched for everywhere it could recur.
Prior reviews (S\briefs\review-findings.md) found real defects (a static-cache rule that cached signed-in pages, the
proxy skipping image-like page addresses, a not-found mark one frame late, quadratic text helpers, inserted invisible
characters). Their fixes are on the branch — check them too: a fix can be incomplete.

REPORT (final message): the tip you reviewed; then each finding: SEVERITY (HIGH = money, data, security, privacy, RG,
a crash or a page that does not work; MEDIUM = wrong behaviour or a visible defect a player meets; LOW = a rare or
cosmetic defect), CONFIRMED/PLAUSIBLE, file:line, the concrete failure scenario (inputs/state → wrong result), how you
verified it (script path + output), and the smallest correct fix. Then what you checked and found sound (one line
each), so the integrator knows the coverage. No finding is too small to report; nothing unverified is reported as fact.

FOCUS AREAS (your prompt names yours)
A · SERVER, MONEY, RESPONSIBLE GAMBLING, SECURITY, DATA. Every server-side hunk: pages' data reads and their
    failure paths (a DB error must never become "not found" or an empty balance), generateMetadata, server actions
    touched by the pass (deposit/withdraw pages and confirms, the sell/bet confirms' commit paths), notification and
    email builders (R5-B changed market-service's dated notices and clipped titles: per-locale dates, word cuts),
    the proxy and next.config headers (two hotfixes are on main), the service worker (public/sw.js: what it caches,
    for whom), the offline document (person-free), RG surfaces (a break, an exclusion, limits — never offered a bet,
    never a promotion during a break; never a removed notice or helpline), the journey/classic resolver (who sees
    what), house-bot disclosure, privacy of anything rendered for one player reaching another (caching, shared
    URLs, OG images), and admin hunks (R5-A's in-flight rule touched admin confirms: can any action now double-fire
    or be blocked forever?).
B · CLIENT RUNTIME, HYDRATION, EFFECTS, PERFORMANCE, ACCESSIBILITY SEMANTICS. Every client component the pass touched:
    hydration mismatches (server vs client text: dates, locales, Intl, regexes with Unicode properties, random/ids),
    effects and their phases (useSyncExternalStore readers, the journey flag, the not-found mark, timers and their
    cleanup, polling, AbortControllers, the chart's 12s deadline), stale closures, race conditions on refresh and
    navigation, keyboard and focus (the ✕ withheld in flight — focus trap, initial focus, Escape), screen-reader
    names and live regions, the text helpers (keep-words, keep-run, fill-nodes, empty-state-text, cjk-marks: worst-case
    time on adversarial input, grapheme safety, characters inserted into copy), payload size (the loading ghosts and
    the not-found view were moved out of documents; check nothing heavy rides every refresh), and CSS that depends on
    a browser feature (container queries, :has(), text-wrap: balance, @supports) — what a phone without it shows.
C · CROSS-SURFACE CONSISTENCY (visual and verbal, statically). The pass's rule: one convention per pattern, applied to
    every sibling. Audit the conventions it established against every surface a player can reach in BOTH shells:
    one page one name (every door vs the page's h1/eyebrow/<title>/loading ghost, per locale); the close ✕ (one
    CloseX, on the title's capitals, withheld in flight); gold only for money earned (R5-C's census: anything it
    registered that should not be gold, anything gold it missed by another spelling); the brand family for non-money
    highlights; counts and money figures (formatNumber, .amount mono, TZS kept whole); titles balanced with figures
    whole; eyebrows, chips, section rails, empty states, loading ghosts that match their pages box for box (compare a
    ghost's structure to its page's); spacing on the override scale (no stock-scale inversions slipping in); the three
    locales' strings fitting their boxes at 320 (compute widths from the fonts if you need: S\r5e has a Sora/Inter
    width model). Read the round-5 tiles where useful (S\visual\tiles-r5\*.png — the Read tool shows images; the
    triage S\visual\triage-r5.md says what each tile is) — but most of this is code.

---

## Appendix F · the questions for Ali, plain

### Questions for Ali from the Vodacom visual pass (S6) — plain-English draft (2026-10-09)
(Each has a default already in place; "keep" means nothing changes unless you say so. Numbers match owner-items.md.)

#### Responsible gambling and rules
16. During a player's break we remove "bet now" sentences, but general lines stay (the home tagline, "deposit and
    withdraw with M-Pesa…") and the Invite / Propose & earn / Become an agent doors still show. Should a break hide
    those offers too?
17. Right after self-excluding, the phone becomes a guest again and sees "Sign up" and live YES/NO buttons. Should a
    phone that just excluded see no sign-up prompts for the exclusion period?
21. An excluded person can't re-register with the same phone or email, but a NEW phone + email opens a fresh account.
    Closing that needs person-level matching at sign-up — a policy decision.
22. Times never say "EAT" anywhere. Add it everywhere?

#### Money and colour (gold = money earned only)
28. Warnings (refused sign-in, "more info needed", a withdrawal hold) are painted in the same gold as money. Change
    warnings to an amber that isn't money's gold? (recommended)
29. The old (classic) header still has gold bits that aren't money (two small dots, the bell, the language tick, menu
    rows, the ticker separator, the "COMING SOON" tag). It's frozen until launch — fix at launch?
30. A decorative divider line has a gold middle → make it the claret colour?
31. The links to Responsible Gambling inside the legal pages are gold → blue. Changes the legal text's fingerprint, so
    it ships with the next policy version.
32. Four smaller gold questions: the home's pool / paid-out totals in gold; the one gold accent in empty-state
    pictures; the crest's metal shade; the hot-streak flame (the design rules say "no streak flames").
11. Leaderboard: the #1 ring and crown, and the streak flame — same "gold is money" question.
9.  "Paid out to players" on the home counts house-bot winnings too. Should a public money figure exclude bots?
14. The wallet pill's amount is now centred in its box (was pushed right). Keep?

#### Status colours (green/red are for YES/NO bets only; errors and successes now use their own red/green)
42, 43. The old (classic) header's notification badge is hard to read (2.64:1) and its "Clear all" uses the NO-bet
    red; the old wallet pill's +/− uses YES/NO colours. Frozen until launch — fix then?
44. The board's "hot" flag uses the NO-bet red. Give it its own colour?
45. The identity crest uses the YES/NO split. Change it?
46. Password, 2FA and email mistakes still show as red error pop-ups (every other fixable mistake is now a calm
    message). Make them calm too?
47. An unlocked bonus label is green. Or gold (money)?
48. A rejected source-of-funds form is amber on the profile and red on its own page. Which one?
49. Payouts in the wallet history are neutral. Or gold (money earned)?
50. On the old bet dial, hitting a SESSION LIMIT now shows its (unchanged) sentence as a message that stays until read,
    instead of a red error pop-up — the same as Up & Down. OK?
51. The leaderboard's rate of return is plain text with its +/− sign (not green/red, not gold). OK?

#### Names and words
35. The journey's "Propose markets" doors now use the page's own name "Mapendekezo ya Masoko" (the "earn" wording is
    gone there). OK?
36. Swahili leaderboard name: "Bingwa" or "Jedwali la Washindi"? One should be used everywhere.
27. The cashback promo's button "Weka sasa" — keep, or "Weka pesa" like the rest of the journey?
18. The English motto "The wisdom of YES & NO." shows under Swahili and Chinese headings — on purpose?
37. Long legal titles on small phones break as "Kanuni / za Michezo" (never ending a line on "za"). OK?

#### Looks (layout)
33. Small market cards show the pool amount without the word "Pool" (no room at 320px). Smaller text, taller cards,
    or keep (screen readers hear "Bwawa")?
34. Every pop-up's ✕ now lines up with its title; the confirm dialog's ✕ moved from the round badge to the title. OK?
38. A market title with a very long number (e.g. "TZS 10,000,000") fills the whole line on the smallest phones. Accept,
    or a smaller title below 360px?
39. Chinese titles now split words much less often, but a few still split at 320px (no browser can do it perfectly).
    Accept?
40. Money amounts in pop-up messages now use the numbers font. OK?
41. A month and its year may now go on two lines on a phone title ("December / 2026"). OK?
25. Focus outlines in the header sit 2px from the next button on a 390px phone. Accept, or widen the gaps?
26. Chinese text sits ~1.5px high in boxes (a font property). Accept?
19. The phone's "large text" setting doesn't enlarge our pages (browser zoom does). A type-scale project — later?
1, 10, 20. The chat bubble / Needle can cover a small part of a card or a focused button on some phones. Accept for
    now?
2. The classic wallet pill hides "TZS" on small phones (frozen until launch).
3, 4, 12, 13. Four small defects in the frozen classic header/footer/bell — fix at launch?
7. Ticket payout words are in the numbers font where the design shows the text font. Keep?
8. The account page on desktop is two columns (cards no longer side by side). Keep?
15. The offline page uses the phone's own font (ours would need the font files stored). Keep?
23. The old bet dial's tiny thumb text is below the reading size (the new bet sheet, S8, replaces it). Drop it now?

#### Process
24. A screen-checking tool was broken on main; it is repaired on the Vodacom branch (ships with it).
5, 6. Two earlier reports (small-text work order; two unused test files).

#### Word fixes needing a translator's OK (S12) — no word was changed by the pass
(the S12 list in owner-items.md, in plain words: about 14 small Swahili/Chinese wording fixes)

---

## Appendix G · the questions for Ali, the full record (with S12 and S8)

### Visual pass — items that are not mine to decide alone (collected 2026-10-08)

#### Owner decisions (Ali)
1. Chat bubble vs keyboard focus (G4 item 4): `scroll-padding-bottom` reserves only the rail, so a Tab-focused control at
   the right edge can sit up to 36 of its 44px under the bubble. AA (2.4.11) holds, AAA (2.4.12) does not. The fix
   (~80+44+8+inset below 1024) moves every focus/anchor scroll on every page, classic included.
2. Classic capsule shows "100,000" without "TZS" below 640 (G4 item 7). Classic chrome is frozen for S6/S7; the
   journey capsule shows TZS at every width. Room exists at 390 (~90px free; TZS needs ~27).
3. Classic home's hero/bands sit 8px off the classic footer from 1024 (G5): left as is so classic viewers are served
   what they were; the journey's `/` is aligned (f85df686).
4. Classic bar has no break rule (shows the deposit pill during a break); the journey does not (S4) and its Wallet
   now matches (b88d1a75).
5. Type-scale work order (28 small-text sites, 6e4d4f0a) — earlier report.
6. The orphans suite's two landing-v3 Workflow files — earlier report.

7. Ticket payout words are drawn in mono (13.5px JetBrains Mono bold); the canvas (s4-9-tiketi-open) and §T6 draw
   them in Inter 14/600 (G3). A type decision, left as built.
8. The Akaunti hub at 1024+ now reads as two columns (cards no longer pair side by side), the fix for the 73px bands
   under shorter cards (G2) — a visible desktop layout change, reading order unchanged.

9. The home proof band's "PAID OUT TO PLAYERS" sums every confirmed payout and cash-out transaction, house-bot
   accounts' winnings included (platform-stats.ts → sumConfirmedByTypes, no user filter). What a public money figure
   counts is a ruling (R3-A, 2026-10-09). Unchanged.

10. The Needle's rest (R3-B, 08f045d8): beside a full-width card at 360–390 the tucked dial still lies over ~14px of
    the card's frame/padding (its visible half is 28–30px against a 16px gutter) — tier 1 of the new rest rule, E-400's.
    And players whose dial the resize bug stored on the LEFT keep it there until they throw it back (a bug-caused left
    cannot be told from a thrown one; no migration).

11. Leaderboard gold outside money (R3-C): the podium's #1 gold ring and crown, and the HotChip's gold flame
    (leaderboard/page.tsx ~512, 532–560) — against Q5 (gold is money) and DESIGN_AUTHORITY's "no streak flames". Existing
    designs, left as built. (The "Fedha" tier's gold WAS fixed: plain ink.)

12. The CLASSIC bell's "25" badge covers the bell's dome at phone widths (round 4 tile 333: badge + glow x307–334
    y8–29; only the lip, base and clapper show) — live for every player today. The journey's same defect was fixed
    (R3-D + bf30c154: re-anchored from the left, 1px higher, no rose glow on the opaque bar). The classic bell is frozen
    for S6/S7 (A1, `qa:bell-untouched`), so fixing it for live players is a ruling.

13. The CLASSIC footer's "Propose markets & get paid" link leaves its COMING SOON pill alone on a second line at
    768 and 1024 (WP12 tiles 299/307) — live for every player today. G2 balanced it; R4-F (ca45ff6e) made that
    balance the journey's alone, because the classic footer is frozen chrome (qa:classic-shell-parity holds it to
    main's bytes). Fixing it for live classic viewers = one class plus a named EXPECTED_DIFFS entry — a ruling.

14. The journey capsule's words are now CENTRED in the box D31 reserves for 999,999 (R4-E, 88ee1a42): a short figure no
    longer hugs the right (TZS 0 was 39 | 10, now 24.4 | 24.4) — and so at every balance the "Salio" caption is centred
    over the figure (at TZS 258,208 on a 390 phone, ~34px left of its old flush-right spot). Taken as the pass's
    decision (rule 8a decides the box, not the alignment); reverting is three CSS values. Journey only.

15. The OFFLINE page now uses the system font (R4-G, cec24e83): it is a person-free document the phone app keeps, and
    the brand fonts live under build-hashed names only the app knows (the error page already does the same). Bringing
    Sora/Inter to it = self-hosting the font files — a small asset decision.
16. During a responsible-gambling BREAK (edge scenario 1): the sentences that tell the player to bet NOW are being
    removed (as for a held wallet), but the generic product lines stay — the home tagline "Chagua upande, weka dau…",
    the trust line "Weka na toa pesa kwa M-Pesa…", "Kuwa wa kwanza kutabiri". And the hub still offers Invite friends,
    Propose & earn and Become an agent: does "no promotions during a break" cover referral and earn offers?
17. Right after SELF-EXCLUDING, the same phone is a guest again: the bet panel's first button is Sign up, "Anza
    kutabiri" and live NDIO/HAPANA show. Should a device that has just excluded be treated differently (e.g. no
    sign-up prompts for the exclusion period)? (Whether the same phone/email can open a NEW account is being proved.)
18. The English motto "The wisdom of YES & NO." sits under the Swahili and Chinese headings — a brand line by design?
19. Enlarged text (a phone's larger default font) changes nothing on player pages: the type scale is in px. Browser
    zoom works (WCAG 1.4.4 is met by zoom); honouring the phone's font-size setting would be a type-scale project.
20. Item 10 extended: the Needle on the profile card's corner at 768 (14–17px inside) and 1024 (0px), and at 740×360
    landscape both the Needle and the chat bubble on the profile card.

21. A self-excluded person CANNOT re-register with the same phone or email (proved, R4-I) — but a NEW phone + email opens
    a fresh account: nothing at sign-up ties a person to an excluded account (exclusion and caps are per account; the
    KYC one-document rule only catches it at withdrawal, and only if the excluded account had verified its ID).
    Closing it needs person-level matching at sign-up — a policy decision (and new words).
22. Times are never labelled "EAT" anywhere today; break/exclusion ends now show date AND time in the reader's
    language ("hadi 10 Okt, 05:05"). Add "EAT" (everywhere, not just here)?
23. The old dial's thumb text is under the reading floor (its side word ~5.8px, multiplier ~11.6px at 360; a 10px
    "HAPANA" cannot fit a 43px thumb) — drop it or move it out of the thumb? (S8 replaces the dial in the journey.)
24. qa:bar-geometry is red on MAIN (88 failures, a stale instrument) — repair it so it guards again (tooling task).

25. The journey header's focus rings end 2px from the next control at 390 (the balance ring → the gold pill; "Ingia" →
    "Jisajili"): the S4 fit rule's 6px phone gaps hold a 4px ring. Accept, or widen the gaps (costs 320px fit slack —
    10.7px left today)?
26. Chinese text in boxes sits ~1.5px high (17 | 20 against Latin's 19 | 18): ideographs sit ~0.12em higher than
    Latin capitals on the same baseline, on every zh box. Accept, or adopt a platform-wide CJK vertical trim?
27. The cashback promo's "Weka sasa / Deposit now" — keep the promo's own wording, or match the journey's "Weka pesa"?

28. (R5-C, the second gold audit) The WARNING colour is the money gold today (`--warning-fg: var(--gilt)`, an owner token):
    every real warning — a refused sign-in, "more info needed" on KYC, a withdrawal hold — paints in money's gold. Proposed:
    an amber off gold's hue (`--warning-500: oklch(74% 0.15 62)`, `--warning-fg: oklch(84% 0.115 66)`, 7.5:1 / 10.8:1);
    chip.tsx's warning/paused and the warning toast would read the same tokens (feedback-law §2 is re-decided with it).
29. Classic chrome still carries gold that is not money (frozen for S6/S7): the "• Juu na Chini" dots (top-app-bar.tsx
    :533, `.kp-rail__dot`) → brand or none; the classic bell, language tick and avatar-menu rows → the journey's
    colours; the live-ticker separator → `--border-strong`; the classic header's "INAKUJA" tag (kept tinted there).
30. The claret rule's gold midpoint (`.claret-rule`, `var(--gilt) 50%`) → `var(--claret-300) 50%` (and the offline page's
    copy).
31. The legal pages' RG links are gold (Terms ×6, RG policy ×3) → brand. It changes the Terms/RG text hashes, so it ships
    with the next policy version.
32. Gold questions: the landing's pool and paid-out totals in gold (money, Q5) vs D5's inducement clause; the empty-state
    illustrations' one gold accent (§C7) vs Q5; the crest's raw metal (chroma 0.13) vs `--metal-gold` (0.068); §C5 "no
    streak flames" — the hot chip and streak chain are still flames (now metal, not gold).
33. (R5-A) The grid cards' pool figure has no word beside it ("TZS 1.2M" alone): at 320 the worst case (7-digit pool +
    "dakika 59 zimebaki" + the info button) uses 257.6 of 258px, so even one glyph wraps a fixed-height card. Smaller
    type, a second line (taller cards), or leave it (screen readers now hear "Bwawa")?
34. (R5-A) Every dialog's close ✕ now stands on its title's first line (one convention); the confirm dialog's ✕ moved off
    the medallion's centre to the title's capitals. Confirm the look.
35. (R5-A) "One page, one name" in the journey: the proposals doors now read the page's own name "Mapendekezo ya Masoko /
    Market Proposals" (the "earn" wording "Pendekeza na upate zawadi" is gone from the journey's doors). OK?
36. (R5-A) Swahili leaderboard name: "Bingwa" (the page's own name, now on the journey's doors) or "Jedwali la Washindi"
    (the classic nav)? One of them should change everywhere (S12 if the page changes).
37. (R5-A) Legal titles keep a connective with its noun: "Kanuni / za Michezo" (not "Kanuni za / Michezo"), "Terms / of
    Service", "Sera / ya Faragha" at the narrow widths where they wrap — rule: no line ends on a connective.
38. (R5-E) Very wide figures on a market's page title at 320: the line holds 220px; "TZS 10,000,000" (229px) and
    "USD 100 million" (221.5px) are kept whole, and a "?" after one reaches the faint watermark. No real title has one
    today. Accept, a smaller title below 360, or another technique?
39. (R5-E) Chinese titles now break far less inside words (balanced lines), but a few still split a word at 320 (e.g.
    "…7月降 / 雨…"): zero needs phrase segmentation no browser offers. Accept?
40. (R5-E) Every toast's money amounts are now in the figures' font (mono, §M4) — bet placed, sold, payouts, Up & Down
    results, the refused sale — in both shells. Confirm?
41. (R5-E) A month and its year may now wrap apart ("December" / "2026") so a long date fits a phone title. Confirm?
42. (R5-I) The CLASSIC bell's rose count badge reads 2.64:1 at its gradient's light end (below 4.5) and its "Clear all"
    hovers in the betting NO rose — the journey bell is fixed (brand pip 5.04:1, danger hover); the classic is frozen.
43. (R5-I) The CLASSIC wallet capsule's ±delta is still in the betting YES/NO colours (frozen chrome; the journey's is
    plain text now).
44. (R5-I) The board's "hot" flag chip shares the betting NO rose — split it? (§B2a calls it Ali's call.)
45. (R5-I) The identity crest's "Tipping Sigil" uses the YES/NO split — §B1a says it must not borrow from the mark.
46. (R5-I) Password, 2FA and email refusals a player can fix stay red pop-ups (the feedback law's pins hold them there);
    every other fixable refusal is now a calm message. Keep, or align them too?
47. (R5-I) A bonus that unlocked ("Unlocked") is green (a word is not money, as for invites) — or gold?
48. (R5-I) A rejected source-of-funds declaration is amber on /profile and red on its own page — which one?
49. (R5-I) Payout credits in /wallet's history: neutral (as the Receipts row decided) or gold (money earned, §M3)?
50. (R5-I) On the old dial, reaching a SESSION LIMIT (an RG limit) now shows its unchanged sentence as a message that
    stays until read, instead of the red ✗ pop-up — as Up & Down already does. Confirm?
51. (R5-I) The leaderboard's rate of return is now neutral text with its sign (not green/red, not gold). Right?

#### S12 (live-word corrections, ship with S12)
- Swahili "Arifa {n}" reads like one more chip beside "Pesa 3" on the notifications filter row (G1): "{n} arifa".
- The guest help subtitle "Maswali ya kawaida · Simu · Barua pepe" cannot fit one line at 320/360 (73px row); a
  shorter sw "Maswali · Simu · Barua pepe" (~175px) gives a 56px row (G2).
- Badge names are hard-coded bilingual "First Prediction · Ubashiri wa Kwanza" in every locale (achievements.ts);
  move to per-locale dictionary keys (G2; already an open defect in LIVE-QA-CAMPAIGN).
- At 320 only a TZS 1,000,000 stake wraps "Matokeo / yakitoka" (balanced); a shorter sw phrase would remove it (G3).
- (already held) "masaa 1 yamebaki" → "saa 1 imebaki".
- The hub card-size hint "Kwa simu tu. Hakuna kinachofichwa." (224.9px) cannot share one line with the row's centred
  switch at sw 360 (206px free) — two whole sentences, a 73px row (R4-E, 88ee1a42). A shorter sw hint gives one line.

- (R5-A) A key for the rules page's name ("Kanuni za Michezo / Game Rules / 游戏规则") for the hub row and footer link,
  which say "RTP ya mchezo na sheria / Game RTP & rules".
- (R5-A) sw AML door "Sera ya AML / KYC" vs the page title "Sera ya Kuzuia Uoshaji wa Fedha na KYC".
- (R5-A) sw "Weka mipaka" (the doors) vs the limits page's h1 "Vikomo".
- (R5-A) sw LIVE: "Mubashara" (the page) vs "hai" in count lines ("40 hai").
- (R5-A) zh regulator: the footer's 坦桑尼亚博彩委员会 vs the agent page's 坦桑尼亚博彩管理委员会.
- (R5-A) sw `proposals.earned` reads "umepataa" (likely a typo for "umepata").
- (R5-C) The factual validation toasts have no next-step line (F4) — new keys.
- (R5-I) The share button's "Couldn't copy" has no next step and no existing key fits.
- (R5-I) The agent application's submit pop-up prints the server's English error (apply-client.tsx ~175) — reason keys.

#### S8 (the journey bet sheet)
- A player on a break (or self-excluded but signed in) can open the old dial, pick a side and a stake, and is refused
  only at confirm ("Could not place" + the break's date). The S3 engine's `shortfallPlan` already refuses FIRST
  (gates 1–4: maintenance, the break with its date, the session limit, the account) — the S8 sheet must ask those gates
  when it OPENS, so the break's sentence (`rg.breakActive` / `rg.exclusionActive`, approved copy) shows before any
  stake. Not changed in the shelved dial now.
- The same for a HELD (frozen) wallet (round 4, tiles 088–100): the home's featured card shows live YES/NO; the bet path
  refuses `wallet_frozen` (shortfallPlan's gate 7, the wallet not ACTIVE). The S8 sheet must show the held notice before
  any stake, as the Wallet and the header already withhold their invitations for a held wallet.
