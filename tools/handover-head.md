# S6 visual pass — the state, for resuming on any machine (updated 2026-10-09 ~23:55 EAT)

**Why this file exists.** Ali, 2026-10-09: *"push live everything you have in case later we proceed on another machine
… not to keep anything locked on this machine and the next machine repeats it by accident"* and *"anything not done
here and pushed live is lost"*. Everything the visual pass has merged is on GitHub; this file says what is merged, what
was still running on OMEGA-COMPILE01 when it was written, what the independent reviews found, how it goes live, and
every question for Ali. The session's working tools and notes are on `origin/vodacom-visual-tools` (README-TOOLS.md maps
them; on OMEGA they live in the session scratchpad, written `S` in briefs).

## 1 · The branches (all on GitHub)
- **`origin/vodacom-visual`** at `422832b1` — the S6 visual pass (journey shell + shared page bodies), NOT live. Every
  round's work is merged on it (§2); nothing finished waits on a WIP branch any more. Based on main `118fc75c`; main has
  moved 139 commits since (S14's STEP 57/58 and the two hotfixes below) — see §4 step 1.
- `origin/vodacom-visual-tools` — the working tools (lock-turn chains, merge checks, briefs, triage notes, owner lists,
  every round's mutation proof, the reviewers' evidence under `tools/review6/`).
- **Live from this lane today (all read back on production):** `9cb95938` (immutable cache only for static files),
  `118fc75c` (the proxy runs for every page address), `731e58f0` (every response carries the static security headers —
  a missing file under a public folder no longer renders the signed-in not-found page unprotected) and `2cd2239e`
  (RESPONSIBLE GAMBLING: the break and self-exclusion emails state the end in EAT with its time, a permanent exclusion
  no date — they gave a UTC day, a day early for ends 00:00–03:00 EAT).
- Merged WIP branches, kept only as a record (safe to delete after the push to main): `vodacom-visual-r5g-wip`,
  `-r5j-wip`, `-r5k-wip`, `-r5l-wip`, `-r5l-final`, `-r6a-wip`, `-r6b-wip`, `-r6c-wip`, `-r6-trio`,
  `-r6-on-r5l-rehearsal` (the R6 merge rehearsed on R5-L before it was picked onto the branch).

## 2 · Merged on `vodacom-visual` (each commit's message is the full record)
Rounds 1–4 of the visual pass and the edge read, then round 5 and round 6:
- **R5-F** qa:bar-geometry repaired · **R5-D** loading ghosts and the not-found view out of every document; a real market
  never "not found"; the worker caches only images and fonts · **R5-B** the Wallet's footer, tabs and sheets; dated
  notices; one name per money action · **R5-C** gold only where money was earned · **R5-E** titles balanced with figures
  whole; no inserted invisible characters · **R5-A** the home card; one page one name; every ✕ on its title and withheld
  in flight; counts; the regulator's name; legal titles · **R5-I** every state in its own ink; calm refusals; grant tones
  · two red twins fixed · **R5-H** every loading ghost a client reference (/wallet/receipts 16.9 KB → 0.5 KB per refresh),
  the ghosts' bands, the journey flag and the not-found mark in the first paint · **R5-G** the journey's money pages take
  the journey's words, a 97-door census, the regulator's name kept whole on the opt-out footer, /offline and the error page
  · **R5-K** seven loading ghosts rebuilt from their pages · **the route entrance** — no blink on a journey tab tap, no
  replay and no jump to the top at hydration · **R5-J** (`cef12387`) every count grouped the one way; one figure reader for
  every result · **R5-L** (`bc67dfa7`) every other loading drawing opens on its page's own bands (agent pages, leaderboard,
  results, markets, live, the sixteen generic loaders); one ghost kit.
- Round 6 (the independent review's findings): **R6-B** (`9ab2d9d9`) focus kept inside a busy dialog, the chart's retry,
  linear text helpers, a name's cut on the server, the round page's title in the reader's words · **R6-A** (`d6b3410d`,
  responsible gambling) during a break no bet panel and no first-bet invitation; the bell's permanent exclusion without a
  date · **R6-C** (`1dbded7f`) reviewer C's consistency findings — one name per page for every door, the stake whole in
  the bet confirm, the Up & Down range line, right-aligned labels on their edge, one pill size, 12px button pairs, back
  links to the hub · **the state titles** (`422832b1`, found merging R6-C onto R5-L): the KYC and invite loading drawings
  no longer show a title that is false for some readers (a verified player read "Verify your identity").
- How each merge was proved: on the merged tree, every suite reading a touched file, the helper's lists, the red twins and
  the mutation proofs. R5-L: 107 suites, 14 red twins, seven proofs (R5-L 38, R5-K 29, R5-H 41, R5-B 36, R5-J 26, R5-D 27,
  R5-G 30 planted defects caught, every file restored byte-identical; six old plants re-aimed at R5-L's code). The R6 trio
  and the state titles: rehearsed on R5-L (16 interacting suites green), then — **running at ~23:55 EAT on OMEGA** — every
  suite reading a touched file plus R6-A/B/C's own lists and red twins (`S/runs/merge-r6.txt`) and all fourteen proofs on
  an identical checkout (`S/runs/wip-proofs-r6.log`). If this file still says "running", treat that proof as not done:
  rerun it (tools: `merge-check-range.sh` with `BASE=bc67dfa7`, and each round's `*-vis.*` proof).
- Known reds that are not the branch's: `test:orphans` (main's two landing-v3 panels), `test:house-bot-disclosure` D19a
  (the legal-tree pin, green once the branch is main), `test:backup` from a junctioned worktree (the shared Prisma client
  predates main's `targetListId`), `test:house-bot-holder-lifecycle` (main's own; S14 fixing).

## 3 · Waiting to merge
Nothing. (R5-L's and R6-C's notes for each other are done: the deposit return ghost's pair on `gap-2`, the withdraw
balance label's take-back, /profile's identity row name, R5-K's performance drawing in `performance-ghost.tsx`.)

## 4 · How it goes live
1. Bring main in: `git merge origin/main` into `vodacom-visual` (a merge, not a rebase: one conflict, and no force-push
   of the shared branch). The one conflict is `src/lib/server/email.ts` — main's hotfix 2cd2239e and R6-A's copy of it
   are the same change; the branch's file is main's plus R5-B's F9 (`agentRevokedHtml`'s date in each line's own month
   words), so keep the branch's side. Then rerun the merge check over the merge (BASE = the branch before it).
2. The final proof, in lock turns (`wm16a`–`wm16d` in the tools): typecheck + the whole battery with the database
   suites + every red twin the pass touches; classic-shell parity against a baseline at the new base (named
   EXPECTED_DIFFS only, never a re-baseline — the sell confirm's free-window box and its ✕ are page-body changes to
   register); header fit, the landmark seals, needle-rest, bar-geometry (with main as control), the preview drive, local
   `qa:live`, round 6's tiles; the edge scenarios with R4-J's verdict; document weight tip vs main; R5-H's lock-turn
   items (production-build chunks, refresh bytes, frame recordings, the swept ghosts re-tiled); R5-L's lock turn
   (`ONLY=E E_WIDTHS=360,390,1280 E_LOCALES=sw,en,zh npm run qa:ghost-landing -- http://localhost:3001` and its
   `RED_BOXES=1` control; re-tile 170, 175/176, 177/178/203, 193/194, 195/196 and the generic pages at 390 and 1280;
   `red:results-filter`, `red:count-truth`); the route-entrance probe; `qa:footer-reachable`; R6's browser checks (a
   break session on the market page and Up & Down — `S/r6a/qa-journey-edges.r6a.mjs`; the back links "‹ AKAUNTI" →
   /account at 390 and ≥1024; Tab inside a busy dialog).
3. Round 6's read of every tile; anything found is fixed and proved, and the read repeats until it finds nothing.
4. Tell the other sessions, push to main, watch the deploy, read back production (`qa:live` as QA Mobile 01 with the
   peer notice), close S6 in VODACOM-PLAN §0g/§0h/§0i.

## 5 · Questions for Ali (none blocks the pass; each has a default in place)
79 so far: the plain list is appendix F; the full record (with the S12 word list and the S8 notes) is appendix G.
