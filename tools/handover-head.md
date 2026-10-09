# S6 visual pass — the state, for resuming on any machine (updated 2026-10-09 ~22:10 EAT)

**Why this file exists.** Ali, 2026-10-09: *"push live everything you have in case later we proceed on another machine
… not to keep anything locked on this machine and the next machine repeats it by accident"* and *"anything not done
here and pushed live is lost"*. Everything the visual pass has merged is on GitHub; this file says what is merged, what
was still running on OMEGA-COMPILE01 when it was written, what the independent reviews found, how it goes live, and
every question for Ali. The session's working tools and notes are on `origin/vodacom-visual-tools` (README-TOOLS.md maps
them; on OMEGA they live in the session scratchpad, written `S` in briefs).

## 1 · The branches (all on GitHub)
- **`origin/vodacom-visual`** at `6f5b24c0` — the S6 visual pass (journey shell + shared page bodies), NOT live. Rebased
  on main `118fc75c`; main has moved since (S14's STEP 57 `f33909983` and docs) — rebase again before the final proof.
- `origin/vodacom-visual-r5g-wip` (`a32c3317`) — R5-G's work before its port (superseded: R5-G is merged).
- `origin/vodacom-visual-tools` — the working tools (lock-turn chains, merge checks, briefs, triage notes, owner lists,
  every round's mutation proof, the reviewers' evidence under `tools/review6/`).
- **Live from this lane today (all read back on production):** `9cb95938` (immutable cache only for static files),
  `118fc75c` (the proxy runs for every page address), `731e58f0` (every response carries the static security headers —
  a missing file under a public folder no longer renders the signed-in not-found page unprotected) and `2cd2239e`
  (RESPONSIBLE GAMBLING: the break and self-exclusion emails state the end in EAT with its time, a permanent exclusion
  no date — they gave a UTC day, a day early for ends 00:00–03:00 EAT).
- WIP branches (each a finished helper's work, being merged): `vodacom-visual-r5j-wip`, `-r5k-wip` (merged), `-r5l-wip`,
  `-r6a-wip`, `-r6b-wip`, `-r6c-wip`, `-r5g-wip` (merged).

## 2 · Merged on `vodacom-visual` (each commit's message is the full record)
Rounds 1–4 of the visual pass and the edge read, then round 5:
- **R5-F** qa:bar-geometry repaired · **R5-D** loading ghosts and the not-found view out of every document; a real market
  never "not found"; the worker caches only images and fonts · **R5-B** the Wallet's footer, tabs and sheets; dated
  notices; one name per money action · **R5-C** gold only where money was earned · **R5-E** titles balanced with figures
  whole; no inserted invisible characters · **R5-A** the home card; one page one name; every ✕ on its title and withheld
  in flight; counts; the regulator's name; legal titles · **R5-I** every state in its own ink; calm refusals; grant tones
  · two red twins fixed · **R5-H** every loading ghost a client reference (/wallet/receipts 16.9 KB → 0.5 KB per refresh),
  the ghosts' bands, the journey flag and the not-found mark in the first paint · **R5-G** the journey's money pages take
  the journey's words, a 97-door census, the regulator's name kept whole on the opt-out footer, /offline and the error page
  · **R5-K** seven loading ghosts rebuilt from their pages (receipt, deposit, return, withdraw, profile, classic positions,
  performance) · **the route entrance** — no blink on a journey tab tap, no replay and no jump to the top at hydration
  (proven in a browser before/after; S14's sweep had caught the jump).
Each merge was proved on the merged tree: every suite reading a touched file, the helper's lists, the red twins, and
every round-5 mutation proof — after R5-H, all seven green (R5-A 41, R5-B 36, R5-C 59, R5-D 27, R5-E 27, R5-H 41, R5-I
58 planted defects caught, every file restored byte-identical; five older plants re-aimed at the code R5-H moved).
Known reds that are not the branch's: `test:orphans` (main's two landing-v3 panels), `test:house-bot-disclosure` D19a
(the legal-tree pin, green once the branch is main), `test:backup` from a junctioned worktree (the shared Prisma client
predates main's `targetListId`), `test:house-bot-holder-lifecycle` (main's own; S14 fixing).

## 3 · Finished and waiting to merge (each on its WIP branch; merge in this order, proving each on the merged tree)
- **R5-J** (`-r5j-wip`, being merged at ~22:00 EAT): every count grouped the one way and worded in lower case; one figure
  reader for every result; no invisible placeholder characters. Merge note: classify R5-K's positions-ghost "00" slot in
  r5j's count census (a ghost shape, as its siblings).
- **R6-B** (`-r6b-wip`): keyboard focus kept inside busy dialogs; the chart's retry; linear text helpers; a name's cut
  decided on the server; ".." kept in free text; the round page's title in the reader's words; the win notice clipped
  (its proxy part is LIVE as 731e58f0).
- **R6-A** (`-r6a-wip`): during a break no bet panel on the market page or Up & Down (the break's notice instead), no
  empty state inviting a first bet (Tiketi zangu's Juu/Chini tab, performance, leaderboard, activity); the bell's
  permanent exclusion without a date (its email part is LIVE as 2cd2239e).
- **R6-C** (`-r6c-wip`): reviewer C's 17 consistency findings (the bet stake whole, the Up & Down range line, KYC and
  invite door names, "Tiketi zangu" everywhere in the journey, grids at 320, the sign-in break notice neutral, the Needle
  and chat ✕, the gold census's warning spellings, the bell's notices, tracked labels, pill sizes, whole questions,
  back links to the hub, 12px button pairs). Its notes for others: R5-K's return ghost row must be gap-2; carry R5-K's
  performance drawing into the new performance-ghost.tsx.
- **R5-L** (`-r5l-wip`, an unfinished snapshot; the helper was asked to finish and report): the board, agent, leaderboard,
  results, markets, live and PageLoader ghosts rebuilt from their pages (its helper ghost-kit.tsx vs R5-K's
  ghost-text.tsx — keep one).

## 4 · How it goes live
1. Merge R5-J, R6-B, R6-A, R6-C and R5-L (§3), each proved on the merged tree; rebase on the latest main (it now carries
   the two hotfixes 731e58f0 and 2cd2239e and S14's STEP 58).
2. The final proof, in lock turns (`wm16a`–`wm16d` in the tools): typecheck + the whole battery with the database
   suites + every red twin the pass touches; classic-shell parity against a baseline at the new base (named
   EXPECTED_DIFFS only, never a re-baseline — the sell confirm's free-window box and its ✕ are page-body changes to
   register); header fit, the landmark seals, needle-rest, bar-geometry (with main as control), the preview drive, local
   `qa:live`, round 6's tiles; the edge scenarios with R4-J's verdict; document weight tip vs main; R5-H's lock-turn
   items (production-build chunks, refresh bytes, frame recordings, the swept ghosts re-tiled); the route-entrance probe;
   `qa:footer-reachable`.
3. Round 6's read of every tile; anything found is fixed and proved, and the read repeats until it finds nothing.
4. Tell the other sessions, push to main, watch the deploy, read back production (`qa:live` as QA Mobile 01 with the
   peer notice), close S6 in VODACOM-PLAN §0g/§0h/§0i.

## 5 · Questions for Ali (none blocks the pass; each has a default in place)
78 so far: the plain list is appendix F; the full record (with the S12 word list and the S8 notes) is appendix G.
