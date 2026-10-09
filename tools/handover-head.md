# S6 visual pass — the state, for resuming on any machine (updated 2026-10-09 ~19:10 EAT)

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
Each merge was proved on the merged tree: every suite reading a touched file, the helper's suites, the red twins it
touches, and every round-5 mutation proof (R5-A 41, R5-C 59, R5-E 27, R5-I 58 planted defects, all caught, all files
restored byte-identical). Known reds that are not the branch's: `test:orphans` (main's two landing-v3 panels),
`test:house-bot-disclosure` D19a (the legal-tree pin — green once the branch is main), `test:backup` from a junctioned
worktree (the shared Prisma client predates main's `targetListId`), `test:house-bot-holder-lifecycle` (main's own;
S14 fixing).

## 3 · Running on OMEGA when this was written (redo from the brief if OMEGA is gone)
- **R5-H** (merge staged, its proof running): every loading ghost a client reference instead of a drawn tree in every
  refresh (/wallet/receipts 16.9 KB → 0.5 KB per refresh), the ghosts' bands fixed, the journey flag and the
  not-found mark in the first paint. Pushed to `origin/vodacom-visual` as soon as its proof is green.
- **R5-G** (helper, worktree `F:\kipindi-r5g`): one page, one name for the journey's money pages and every door; the
  regulator's name everywhere it renders. Brief: appendix B.
- **A browser probe** of R5-H's proposed route-entrance patch (a fade that may blink on every journey tab tap and
  replay at hydration, jumping the page to the top): opacity sampled per frame before and after, in a lock turn.

## 4 · Ready to start (Ali: "allocate more agents" once marketing is done)
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
