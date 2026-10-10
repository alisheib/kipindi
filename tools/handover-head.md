# S6 visual pass — the state, for resuming on any machine (updated 2026-10-10 ~05:35 EAT)

**Why this file exists.** Ali, 2026-10-09: *"push live everything you have in case later we proceed on another machine
… not to keep anything locked on this machine and the next machine repeats it by accident"* and *"anything not done
here and pushed live is lost"*. Everything the visual pass has merged is on GitHub; this file says what is merged, what
was still running on OMEGA-COMPILE01 when it was written, what the independent reviews found, how it goes live, and
every question for Ali. The session's working tools and notes are on `origin/vodacom-visual-tools` (README-TOOLS.md maps
them; on OMEGA they live in the session scratchpad, written `S` in briefs).

## 1 · The branches (all on GitHub)
- **`origin/vodacom-visual`** at `4b754b89` — the S6 visual pass (journey shell + shared page bodies), NOT live. Every
  round's work is merged on it (§2), and main is merged in up to `e7a979c6` (S14's STEP 57/58, both round-6 hotfixes,
  the docs). Nothing finished waits on a WIP branch.
- `origin/vodacom-visual-tools` — the working tools (lock-turn chains, merge checks, briefs, triage notes, owner lists,
  every round's mutation proof as `*-vis.*` and `*-wip.*` scripts with their re-aimed plants, the merged-tree results).
- **Live from this lane (all read back on production):** `9cb95938` (immutable cache only for static files),
  `118fc75c` (the proxy runs for every page address), `731e58f0` (every response carries the static security headers)
  and `2cd2239e` (RESPONSIBLE GAMBLING: the break and self-exclusion emails state the end in EAT with its time, a
  permanent exclusion no date). **On main, test only:** `e7a979c6` — 2cd2239e had moved six of house-bots' line-pinned
  money writes one line and turned `test:house-bot-reports` red on main; re-pinned (memory 251/0, Postgres green,
  `red:house-bot-money` 63/63, `red:house-bot-c5` 99/99 with nothing left dirty).
- Merged WIP branches, kept only as a record (safe to delete after the push to main): `vodacom-visual-r5g-wip`,
  `-r5j-wip`, `-r5k-wip`, `-r5l-wip`, `-r5l-final`, `-r6a-wip`, `-r6b-wip`, `-r6c-wip`, `-r6-trio`,
  `-r6-on-r5l-rehearsal`.

## 2 · Merged on `vodacom-visual` (each commit's message is the full record)
Rounds 1–4 of the visual pass and the edge read, then round 5 and round 6:
- **R5-F** qa:bar-geometry repaired · **R5-D** loading ghosts and the not-found view out of every document; a real market
  never "not found"; the worker caches only images and fonts · **R5-B** the Wallet's footer, tabs and sheets; dated
  notices; one name per money action · **R5-C** gold only where money was earned · **R5-E** titles balanced with figures
  whole; no inserted invisible characters · **R5-A** the home card; one page one name; every ✕ on its title and withheld
  in flight; counts; the regulator's name; legal titles · **R5-I** every state in its own ink; calm refusals; grant tones
  · **R5-H** every loading ghost a client reference, the ghosts' bands, the journey flag and the not-found mark in the
  first paint · **R5-G** the journey's money pages take the journey's words · **R5-K** seven loading ghosts rebuilt from
  their pages · **the route entrance** — no blink, no replay, no jump at hydration · **R5-J** (`cef12387`) every count
  grouped the one way; one figure reader · **R5-L** (`bc67dfa7`) every other loading drawing opens on its page's own bands.
- Round 6 (the independent review's findings): **R6-B** (`9ab2d9d9`) focus kept inside a busy dialog, the chart's retry,
  linear text helpers, a name's cut on the server · **R6-A** (`d6b3410d`, responsible gambling) during a break no bet panel
  and no first-bet invitation · **R6-C** (`1dbded7f`) reviewer C's consistency findings — one name per page for every
  door, the stake whole in the bet confirm, right-aligned labels on their edge, 12px button pairs, back links to the hub ·
  **the state titles** (`422832b1`): the KYC and invite loading drawings no longer show a title false for some readers.
- **Main merged in** (`1e4586e5`, `4b754b89`): one conflict each — `email.ts` (the branch's side: main's hotfix plus
  R5-B's F9) and house-bots' 0.232 pin (both histories kept, the branch's own seven lines re-derived: 1623 … 4708).
- **The verdict fan-out awaits its notices** (`cb389b52`): found by the R6 merge's red twins, bisected to R5-B — the
  settlement gate's three refusal controls had passed with their guards deleted (`red:officer-hold` 10/13 on the branch,
  13/13 on main and again now). No caller waits on it; no notice's words moved.
- How it was proved on the merged tree (R6 + the state titles, before main came in): 289 suites — every one green but the
  known reds below — 72 red twins, and all fourteen mutation proofs on an identical checkout: R6-A 31, R6-B 28, R6-C 40,
  R5-L 38, R5-K 29, R5-A 41, R5-C 59, R5-E 27, R5-G 30, R5-J 26, R5-D 27, R5-H 41, R5-B 36, R5-I 58 — **511 planted
  defects, every one caught on its named check, every file restored byte-identical** (eight plants re-aimed at code R6-C
  moved, each with its reason). After main came in: the interacting suites (email truth 1,237, rg-email-end, privacy,
  proxy and cache scope, campaign gates, the census ratchets) green; then **the whole post-merge check on `4b754b89`**
  (tools `merge-check-range2.sh`, `BASE=422832b1`, results `S/runs/merge-mainmerge.txt`): the 340 suites reading any file
  main or tonight's fixes touched, all green but `test:backup` and `test:orphans` (below); 28 red twins, 26 green —
  `red:campaign-visuals` (its plants are in memory) and `red:contacts-import` were stopped by the run's 15-minute cap, so
  they are owed a long turn, not failed; and **the fourteen proofs again on the merged branch: 511 of 511 caught, every
  file restored byte-identical** (`S/runs/vis-proofs-main.log`).
- Known reds that are not the branch's: `test:orphans` (main's two landing-v3 panels), `test:house-bot-disclosure` D19a
  (the legal-tree pin, green once the branch is main), `test:backup` from a junctioned worktree (the shared Prisma client
  predates main's `targetListId`), `red:house-bot-console` 1.548 (main's own — red on main before today's hotfixes), and
  the database-backed red twins left to the locked final proof: `red:house-bot-engine` (over 15 minutes; it was catching
  when stopped), `red:house-bot-money` on the branch, and `red:house-bot-c5` on the branch (it needs
  `test:house-bot-disclosure` green, so it runs once the branch is main). (`test:house-bot-holder-lifecycle` is green
  since main came in.)

## 3 · Waiting to merge
Nothing. **Named, not yet done** (R5-L's report names them for the integrator; each needs its own measurement and tile):
1. **Done on `origin/vodacom-visual-history-bar` (`16ca3bed`, on `4b754b89`; proved statically — r5l §7b with 6/6 plants,
   R5-H/R5-J/R5-L proofs; owed: a tile at 320, 1024 and 1280 beside the page, then merge it with the round-6 read's
   fixes).** It was: `/updown/history`'s loading drawing drew its bar from typed boxes: row 1 four fixed pills where the page has six
   lenses with counts and the count's phrase, and row 2 a 180px sort box (+ the phone's Filters) where from `lg` the page
   lays its sort, the asset, duration and day groups (`history-bar.tsx` 190–215) on a row that takes two lines at `lg` in
   every language even for a player with one asset — the ghost is 56px short there. Fix: the bar kit
   (`components/ui/query-bar-ghost.tsx`: PillGhost, CountGhost, SortGhost, FiltersGhost, GroupGhost behind
   `QueryGroupDivider`), as R5-L did for /markets and /results; the assets are admin rows, so the drawing needs a case
   (one asset, measured from the served fonts — `S/r5l/measure-routes.cts`) and a tile at 1024 and 1280.
2. **Done on the same branch (`6123d45c`; owed: tiles of /positions, /wallet and /wallet/receipts loading at 320 and 390), with
   the money books' typed Filters box too and a census (r5l 9.3: no player drawing hand-draws a sort or a Filters box).**
   It was: `/positions`' ghost (R5-K) drew row 2's sort inline (`text-body-sm tracking-normal`, no `w-full`, where MenuShell's
   value is `kp-menu-value … text-[13px]`) and a typed 104px Filters box — fold them onto the kit's SortGhost,
   FiltersGhost and GroupGhost (phone rows stay one line either way).
3. **Done on the same branch (`2e58013d`; owed: `qa:count-truth`, `red:count-truth` and the player-filter drive in a lock
   turn).** It was: `qa:count-truth` read the first `[data-result-count]` 220ms after load; /markets' bar ghost carries an empty one (the
   phone grid's hook, globals.css ~7844), now also during document loads — the drive should select
   `[data-result-count]:not([data-result-count=""])`.
4. The root-level spinners (the journey's AnyPageGhost in route-ghost.tsx and the classic SectionLoader in
   src/app/loading.tsx) still draw a 360px spinner block — R5-D's call whether a root ghost should draw a page.
5. `/profile/invite`'s drawing is the player's page; an approved agent's page is the commission dashboard, a different
   layout (its title is set and not shown since `422832b1`, so no false word — the bands still differ for agents).
6. Admin console skeletons (FilterToolbarSkeleton in admin/ai-polls and admin/candidates, AudienceCountFallback in the
   campaign audience card) — staff pages, lowest priority.

## 4 · How it goes live
1. Done 2026-10-10 ~03:50 (§2). Owed to a long turn: `red:campaign-visuals` and `red:contacts-import` in full, and the
   database-backed red twins (`red:house-bot-engine`, `red:house-bot-money` on the branch, `red:house-bot-c5` once the
   branch is main).
   **Turn A done on `4b754b89`** (2026-10-10 03:55–04:45 EAT, the lock held; `S/wm16a2-chain.sh`, results
   `S/runs/wm16a2-*`): `prisma generate` 0; **typecheck 0 errors**; **test:all 500/507 green with every database suite**
   (2,219 s). The seven, each re-run alone here and on main `e7a979c6`: `test:audit-drain` passes alone on both (one
   timing assertion lost under the battery's parallel load); `test:revoked-deadend`, `test:admin-section-gate`,
   `test:needle-rest` fail on both (they need a running dev server — the browser turns run them); `test:house-bot-console`
   fails on both (main's own Postgres half, as `red:house-bot-console`); `test:orphans` fails on both;
   `test:house-bot-disclosure` is the ONLY branch-only failure — its D19a pin (5.1, 5.1.c3) holds the legal chrome
   (`legal/_components.tsx`, `legal-nav.tsx`) to main's bytes, and the pass changed that chrome's layout, not a published
   word; it turns green when the branch becomes main. The red twins are not in this turn (see the line above).
   **Turn B was running from 04:46 EAT** (`S/wm16b2-chain.sh`, the lock held, ~3 h: classic-shell parity — its baseline at
   main `e7a979c6` captured 05:09 — then bar geometry with main as control, header fit, both seals, needle-rest, the font
   probe, the preview drive, local `qa:live`, round 6's tiles into `S/visual/tiles-r6b2`). If this file still says
   running, rerun it. ⚠️ Its parity compare REFUSED at 05:32 (A18: the merge `1e4586e5` brought 78 served files "from
   elsewhere"). Verified: both merges' main sides (`9aa4eec2`, `e7a979c6`) are ancestors of the baseline commit
   `e7a979c6`, so the baseline holds every file they brought and the tree differs from it only by the branch's own 317
   served files — the case `--allow-base` exists for. Run `npm run qa:classic-shell-parity -- --compare
   S/visual/parity-main-e7a979c6.json --allow-base` on a fresh in-memory server (a lock turn), then attribute every
   difference to a named EXPECTED_DIFFS entry (never a re-baseline). Round 6's read then uses `S/visual/read-brief-r6-fixes.md` (being drafted) with diffs against
   `tiles-r5` (`S/visual/tile-diff.cjs`).
2. The final proof, in lock turns (`wm16a`–`wm16d` in the tools): typecheck + the whole battery with the database
   suites + every red twin the pass touches (the database-backed ones included); classic-shell parity against a
   baseline at the new base (named EXPECTED_DIFFS only, never a re-baseline — the sell confirm's free-window box and its
   ✕ are page-body changes to register); header fit, the landmark seals, needle-rest, bar-geometry (with main as
   control), the preview drive, local `qa:live`, round 6's tiles; the edge scenarios with R4-J's verdict; document weight
   tip vs main; R5-H's lock-turn items (production-build chunks, refresh bytes, frame recordings, the swept ghosts
   re-tiled); R5-L's lock turn (`ONLY=E E_WIDTHS=360,390,1280 E_LOCALES=sw,en,zh npm run qa:ghost-landing --
   http://localhost:3001` and its `RED_BOXES=1` control; re-tile 170, 175/176, 177/178/203, 193/194, 195/196 and the
   generic pages at 390 and 1280; `red:results-filter`, `red:count-truth`); the route-entrance probe;
   `qa:footer-reachable`; R6's browser checks (a break session on the market page and Up & Down —
   `S/r6a/qa-journey-edges.r6a.mjs`; the back links "‹ AKAUNTI" → /account at 390 and ≥1024; Tab inside a busy dialog).
3. Round 6's read of every tile; anything found is fixed and proved, and the read repeats until it finds nothing.
4. Tell the other sessions, push to main, watch the deploy, read back production (`qa:live` as QA Mobile 01 with the
   peer notice), close S6 in VODACOM-PLAN §0g/§0h/§0i.

## 5 · Questions for Ali (none blocks the pass; each has a default in place)
79 so far: the plain list is appendix F; the full record (with the S12 word list and the S8 notes) is appendix G.
