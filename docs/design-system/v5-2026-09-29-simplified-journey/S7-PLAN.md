# S7 — home and cards (flagged): build plan (drafted 2026-10-04, filed with its Amendments 2026-10-07)

> The working plan for VODACOM-PLAN S7, "Home and cards (flagged): §3.2 in full, plus the How-to card wired to a
> **static** How-to sheet" (`docs/VODACOM-PLAN.md` :3034-3038). Produced by a read-only mapping workflow on 2026-10-04
> (five subsystem researchers: home, cards, shell, routes and How-to). The planner then re-read every fact below in the
> files. Nothing was run. **The Amendments section at the end overrides anything above it.** Status lives in
> `docs/VODACOM-PLAN.md` §0 (a new §0j, opened by WP0); this file is the how.
>
> Line numbers are as read on 2026-10-04 at `cb83746b`. Another session's uncommitted A8h edits sit in 16 files of the
> same tree, and in some of them the numbers below are the working copy's:
> - `docs/VODACOM-PLAN.md`: +128 lines from about :1009;
> - `src/components/layout/app-shell.tsx`: +6 lines after :498;
> - `S6-PLAN.md`, `shell-lazy.tsx`, `qa-classic-shell-parity.mjs` and `popup-fit.test.mts`.
>
> Re-read before editing.

## Summary

### What S7 builds

For a journey reader, S7 draws the deck's home (frame 1) in 50pick's look, as the S4 canvas binds it
(`s4-canvas/pick-1-home.dc.html` and the `s4-3-*` boards; choices 1B/2A/3A, §0h point 1). It also builds the one
journey card that five surfaces draw: the home, `/watchlist`, `/live`, the question page's similar rail and `/results`
(where the card shows its settled state). Beyond that, S7:
- wires the How-to card to a static How-to sheet. This is §3.8's S7 part: the sheet opens on a tap, with no auto-open
  and no seen key.
- takes the LIVE strip off `/` and `/markets` for a journey reader;
- stands the old first-visit primer down for a journey reader;
- answers a journey reader's `/markets` with a 307 to the home.

### Why a classic visitor's served markup does not change

Every page S7 touches asks the one per-request resolver, `resolveSimpleJourney()` (journey-preview.ts:248-255). It
never reads the cookie and never calls `simpleJourneyFor` (simple-journey-flag.test.mts:639-644). Only a journey
request takes a new arm. For every other request the classic element is today's, in today's slot, with today's props:
- **`/`**: `page.tsx` returns `<LegacyLanding>` after one cached await. That component is today's body moved verbatim
  (§3.2's "first commit of S7", VODACOM-PLAN.md:2563-2564). `page.tsx` keeps the route config and metadata that Next
  reads only from the route file (page.tsx:34, :47-56).
- **`/watchlist`, `/live`, `/results` and the question page**: each puts one ternary in its cards' slot. The else arm
  is today's markup and is not re-indented. There is no new sibling, so the RSC payload gains no `false` child (the WP7
  lesson, VODACOM-PLAN.md:381, :397).
- **AppShell**:
  - It renders the LIVE strip in a ternary whose else arm is today's `<LiveTicker events={tickerEvents} />`
    (app-shell.tsx:458).
  - Its new `/markets` branch has a condition that is false for every classic request.
- **The journey card** is its own server component. `market-card.tsx` stays untouched: its client chunk, the eleven
  red anchors in it and the twenty scripts that read it.

### What does change for a classic visitor

JavaScript and CSS change; markup never does. Each change has an S6 precedent:
- `/`'s initial scripts gain the home's small lazy module (the WP9 `TicketSwitchRail` precedent, S6-PLAN.md:780-782).
- The LIVE strip's and the primer's client code change on every page (WP7's Needle precedent).
- The stylesheet gains the journey's rules, which match nothing on a classic page (WP5's `.kp-hub*` precedent).

Each change is recorded in §0j under "Served bytes for a classic viewer", as S6 recorded its own. `qa:classic-shell-parity`
v3 (WP1) proves the markup, page bodies included, against a baseline captured before S7's first product commit. No new
EXPECTED_DIFFS entry is expected.

### What S7 leaves to later sessions, and why

- **The card buttons (S8).** The card's NDIO/HAPANA are real links in S7, going exactly where today's buttons go. The
  bet sheet (`BetSheetHost`) is S8's work (VODACOM-PLAN.md:2903, :3040-3042), and no sheet UI exists in `src/`. S8
  turns the same anchors into the in-place sheet (Open point 4).
- **The question page's journey layout (S8).** Its two big buttons come with the sheet.
- **Placed later:**
  - the SSE odds patch (Open point 5);
  - the home on a break (Open point 26);
  - the auto-open, the seen key and `primer-keys.ts` (Open point 18).
- **Production.** Production proves only that nothing changed for players (§0h point 4, VODACOM-PLAN.md:1090-1092).
  Staff seeing the deck's home on production waits for S14 (Open point 2).

**Order (13 packages, each green on its own):**
1. WP0: the start line (S6 closed, today's reds, the bar budget measured).
2. WP1: parity v3 (classic page bodies on every S7 route), with its baseline.
3. WP2: the pure move into `legacy-landing.tsx`, every gate re-pointed. This is S7's first product commit.
4. WP3: the pure rules (home list, card face, `/markets` target, journey ticker list), with in-process suites.
5. WP4: S7's words.
6. WP5: the journey card.
7. WP6: the home's lazy module, the shared lost-chunk guard, the How-to card and the static How-to sheet.
8. WP7: the journey home on `/`.
9. WP8: the LIVE strip leaves `/` and `/markets`; the old primer stands down.
10. WP9: `/markets` answers 307; Tafuta moves into Akaunti.
11. WP10: journey cards on `/watchlist`, `/live`, the similar rail and `/results`.
12. WP11: the drives (`qa:journey-above-fold`, `qa:cls-budget --journey`, `qa:journey-home`, `qa:live` [E2]).
13. WP12: proof, records, merge, deploy.

### Corrections to the maps, verified in the files

1. **The plan's line numbers today** (working copy):
   - §0h :1073;
   - board S7 row :2047;
   - §3 table :2071-2128;
   - SJ-1…SJ-9 :2263-2307;
   - §2 build map :2439-2471;
   - §3.1 :2477-2559;
   - §3.2 :2561-2607;
   - §3.8 :2814-2839;
   - the privacy line :2890-2891;
   - ripple map :2895-2925;
   - §5 S7 :3034-3038;
   - S16 :3100-3113.

   The brief's "near 2543 / 2796 / 3005" are pre-A8h numbers.
2. **`predeploy` is package.json:361** (two maps say :360).
   - It holds test:hero-contract, test:landing-contract, test:one-sided, test:featured-card, test:ticker-honesty,
     test:filter-language, test:house-bot-disclosure, test:simple-journey-flag and the four journey suites.
   - It does not hold test:hero-copy (:785), test:landing-mine (:642), test:product-line (:159), test:route-census
     (:1010), test:popup-fit (:723), test:timer-date (:18) or test:red-anchors (:263). Those bite only under test:all.
3. **Three census reds are file-mutating node harnesses, not in-process twins:** red:ticker-honesty (package.json:863),
   red:one-sided (:868) and red:featured-card (:870).
   - So S7's new card and ticker rules take in-process plants in a new red:journey-home.
   - "test:one-sided §8.9 (new)" (VODACOM-PLAN.md:2599-2600, :2902) collides with the existing 8.9 and 8.10
     (one-sided.test.mts:394, :401). The suite's sections already run to 16 (:611).
4. **The ripple map's Home row (:2901) is wrong in three ways:**
   - It omits test:hero-copy, which reads the body: source :103, checks 3d :270 and 3e :277, plants :367 and :371.
     Its `?? ""` reports a wrong path as "no rails".
   - It lists hero-contract and landing-contract, which name page.tsx only in comments (hero-contract.test.mts:76,
     landing-contract.test.mts:68).
   - It lists ticker-honesty §11, which reads app-shell, live-ticker and ticker.ts, not page.tsx. S7's ticker change
     does break 11.5's exact regex, though (ticker-honesty.test.mts:270).
5. **test:house-bot-disclosure needs no re-point to stay green.**
   - Its population is every player file (house-bot-absence-cases.mts:232-236). `page.tsx` still exists, and every
     plant appends to a copy of it (:250-331).
   - Its NAMED list's intent ("the home page") moves, so WP2 adds `legacy-landing.tsx` beside `page.tsx`.
6. **Two gates and the anchors need nothing:**
   - simple-journey-flag's red world appends a cookie read to `page.tsx` (simple-journey-flag.test.mts:853), so it
     works on any `page.tsx`.
   - route-census maps the file to `/` by path (:49-57).
   - No anchor under `scripts/anchors/` targets `page.tsx`.
7. **The canvas card's meta row uses two inks:**
   - the left words are `--text-subtle` (oklch 70% .08 268, globals.css:436);
   - the close label is `--text-muted` (oklch 86% .04 268, :435).

   The card's fill and edge are `--bg-elevated` and `--border` (:415, :425).
8. **The canvas and the product differ on the How-to card and the chips.**
   - The canvas draws the How-to card as an `<a>` to the sheet's board and the chips as `<button aria-pressed>`
     (pick-1-home.dc.html).
   - In the product the How-to card opens a dialog in place, so it is a button.
   - The chips are `?cat=` links (SJ-7, :2297-2300), so they are FilterPill: a declared filter SURFACE
     (filter-language.test.mts §0.4, :392).
9. **The over-cap wording on record is stale.**
   - Three places still say "Shinda zaidi ya {cap}× dau": §3's `journey.cardWinOver` row (:2092),
     INHERIT-MANIFEST.md:52 (SJ-1) and S4-COPY-AUDIT.md:23.
   - The S4 panel amended SJ-1 (VODACOM-PLAN.md:1754-1756; §0h point 2, :1081-1083).
   - The Swahili sign-off approved "Upande mdogo, ona makadirio" and "Faida ndogo · ≈1.0×" (S4-COPY-AUDIT.md:226).
10. **A `redirect()` in markets/page.tsx cannot answer a document with a 307.**
    - The root `loading.tsx` streams HTTP 200 first. proxy.ts:52-60 records this, and `/account` measured it
      (qa-classic-shell-parity.mjs:244-253).
    - The one real-307 precedent is AppShell's document-only E-381 redirect (app-shell.tsx:131-136). Its flight hazard
      is described at :98-107.
    - The proxy may not name the pass (simple-journey-flag.test.mts:645-647).
11. **The SSE `market:odds` event carries `{ marketId, yesPct }` only** (event-bus.ts:35). With no pools, no
    multiplier can be patched from it (§3.2 :2578).
12. **`test:journey-above-fold` cannot be a `test:*` key.** test:all runs every `test:*` (test-all.mjs:43-45) and
    documents only responsive and motion as needing a server (:19-23).
13. **NoticeBar geometry, and which bars can coexist.**
    - A NoticeBar is `py-2`, which is 12px each way on this repo's scale (tailwind.config.ts:215). Its action is at
      least 44px tall (notice-bar.tsx:191). So each bar is at least 69px, even on one line.
    - The session-ended notice (a signed-out flight, app-shell.tsx:131-137, :404-418) and the away summary (signed in,
      :442-448) never show together.
    - The preview marker (:389) sits above both for every pre-flip journey viewer, and it is not in §3.2's bar list
      (:2568).
14. **§3.8's "24 QA drivers" (:2819) is stale** (grep 2026-10-04):
    - 32 scripts name `50pick-primer-seen`: 31 set it and `verify-s1-visual` removes it.
    - 3 use `?primer=1`.
    - None uses `kp-primer-force`.
15. **The helpline key is named two ways.** §3.8 says `howTo.helplineLabel` (:2825). The §3 table and the namespace
    rule say `journey.howHelplineLabel` (:2128, :2079).
16. **§3.2's question-page numbers have drifted.**
    - The holder block's SellButton is at [id]/page.tsx:909-923 (`freeUntil` :915).
    - The two Countdowns are at :836 and :844.
    - "The 5-minute free exit" has been each poll's frozen grace since A8 (VODACOM-PLAN.md:166-177).
17. **Which kit atoms are client components.**
    - FilterPill, Chip, glyphs, IconPlate, Button and PageContainer carry no "use client".
    - RefreshPoller and EmptyState do (refresh-poller.tsx:1, empty-state.tsx:1).
    - NavProgress starts on any internal `<a>` click (nav-progress.tsx:101-129), so a server-rendered link needs no
      `50pick:navigating` dispatch.
18. **The classic home's board rows already use real links for their buttons.**
    - They link to `/markets/{id}?side=YES&from=home`, with prefetch off (landing-hero.tsx:348-355).
    - `from=home` is read only by the old journey's funnel (side-picker.tsx:62-67).
19. **`PLAYER_PER_PAGE` (12) is exported from a component module** (pagination.tsx:17).
20. **Some canvas sizes are off the type ladder** (tailwind.config.ts:198-209): the sheet title at 24, the headline at
    30, the side word at 17 and MFANO's body at 14.5. The kit wins (§0h point 7, :1097-1098).
21. **IconPlate takes its fill, ink and edge as CSS values** (icon-plate.tsx:50-67), so the 3A plate must pass tokens.
22. **The play glyph.** `I.playBare` (glyphs.tsx:191) is the canvas's play glyph; `I.play` (:168) is circled.
23. **None of the five card pages asks the resolver today:** `/`, `/markets`, `/live`, `/results`, `/watchlist` and the
    question page (grep 2026-10-04).

## Work packages

### WP0 — The start line: S6 closed, today's reds, the bar budget measured (S; depends on S6's close)

**Goal.** Start S7 on a clean, closed S6. Before any S7 code, know which gates are red today and how tall the bars
above a journey page really are. The above-the-fold clause depends on that number.

**Files.**
- docs/VODACOM-PLAN.md:
  - §0 RESUME;
  - a new §0j "S7: home and cards (flagged)", the status home;
  - §1 S7 row to 🔨;
  - §0h points for the Open points below.
- C:/Users/Ali/.claude/projects/C--Users-Ali/memory/project_kipindi_vodacom_plan.md
- Scratchpad only: the bar probe (no repo script).

**Steps.**
1. **Check the precondition; never assume it.**
   - §0i "⏸ S6 STOPPED HERE" (VODACOM-PLAN.md:219-225) must be closed: A8h committed with its owed list run
     (:1066-1071), and S6 WP12 done. If S7 starts before WP12, the coordinator records the reason in §0h.
   - `git status --porcelain -- src scripts docs package.json` must be empty.
   - S7 stages files by path, never with `git add -A`, and checks `git diff --cached --stat` before every commit. A8h's
     16 files sat in this tree on 2026-10-04.
2. **Re-derive today's reds.** Run them under `~/heavy-node-lock.sh`, detached and never piped:
   - `npm run test:all -- --skip responsive,motion`;
   - `npm run test:red-anchors`;
   - the in-process `red:journey-*` twins.

   Record every red by name in §0j against §0i's baseline list (:187-196). Re-derive every figure; never copy one.
3. **Measure the bar budget on today's tree.** S6's journey shell already renders on `/` for a pass holder.
   - **Server:** a scratchpad probe on a local in-memory server. Run `rm -rf .next`, then
     `DISABLE_ADMIN_TOTP=true npx next dev -p <port>` with no DATABASE_URL. Browse localhost only, and drive through
     `scripts/live/journey-pass.mjs` (`premise`, `mintStaffPass`, `demoSession`).
   - **Measure at 360 and 390 × sw/en/zh:**
     - the journey header (56, globals.css:6398);
     - the preview marker (preview-marker.tsx:14-28);
     - the announcement bar, raised through `/admin/system` as a seeded admin (no new dev-test route, because of
       test:cert-devroutes);
     - the away summary (signed in, after a settlement while the player was away);
     - the session-ended notice (a displaced session seen on a flight: a second `/auth/demo` sign-in, then a refresh on
       a polling page);
     - the rail's top at 640, 740 and 844 tall (the 64px slot plus its 1px border, globals.css:6286-6291, :6316-6326).
   - **Compute card 1's budget.**
     - The canvas puts the bottom of card 1's buttons at about 464px on a 56px header with no bars (pick-1-home sizes:
       8 + 72 + 16 + 67 + 16 + 44 + 16 + 16 + 18 + 12 + 47 + 12 + 64).
     - The rail's top at 640 tall is 575px, which leaves about 111px for bars.
     - If the marker plus the bars exceed that slack, raise Open point 24 in §0h now, before WP7.
4. **Docs in the same pass:** §1 S7 row 🔨, §0 RESUME names this file, and memory.

**Gates.**
- test:docs
- test:vodacom-plan: the S7 row is 🔨, with no ✅ before a commit.

**Served bytes for a classic viewer.** None (no product change).

**Done when.**
- The tree is clean at S6's close.
- Today's reds are named in §0j.
- The bar heights and the rail's tops are recorded per cell.
- §0h carries the bar-budget point if the arithmetic fails.

### WP1 — `qa:classic-shell-parity` v3: classic page bodies on every S7 route (M; depends on WP0)

**Goal.** Make the binding promise provable. A classic visitor's body on `/`, `/markets`, `/live`, `/results`,
`/watchlist` and the question page's similar rail is captured before S7, then compared after every package.

The harness today captures only the shell's regions and the signed-in `/positions` body, and never visits `/live`,
`/results` or `/watchlist` (qa-classic-shell-parity.mjs:9-17, :209-214, :577-583).

**Files.**
- scripts/qa-classic-shell-parity.mjs (edited; VERSION 3)
- docs/VODACOM-PLAN.md §0j (the baseline file and its base commit)

**Steps.**
1. **Bump the version.** VERSION 2 → 3 (:198), and MATRIX gains `book`. `--compare` will then refuse any v2 file
   (:900-902), which is intended.
2. **Seed a book.** Add a BOOK phase after the matrix and the Sell capture; the matrix's demo portfolio must stay empty
   (:18-20).
   - Seed through the dev-test doors that already exist: seed-real-markets, seed-player-portfolio, seed-watchlist (its
     forced `progress` row gives a selection-closed market), and resolve-seed-markets or fast-forward-market.
   - The book must render every classic card state S7 touches: live priced, one-sided, empty pool, selection closed,
     resolved YES and NO, and void.
   - Add no new dev-test route (test:cert-devroutes).
3. **Capture per cell** (guest and player; en and sw; 360 and 1280):
   - the normalised `<main>` markup, boxes and computed styles of `/`, `/markets`, `/live` and `/results`;
   - `/watchlist`, for the player only (edge-protected, proxy.ts:39);
   - the similar rail (`section[aria-labelledby="similar-markets-heading"]`) of one seeded question;
   - the LIVE strip's region (`div.ticker-strip`, live-ticker.tsx:209-233) on the four lobby routes;
   - `/`'s head: the canonical link and every og:* meta, read from the bytes. WP2's metadata must survive.
4. **Normalise only what calibration shows two fresh servers of one tree disagree on; never guess.** Candidates:
   - market and round ids (`mkt_~`, `udr_~`);
   - time-left labels and EAT dates;
   - relative times;
   - chart paths;
   - the identity avatar's `cm~` ids (as `shell-skeleton.py` normalises them);
   - chunk hashes.
5. **Teach `--prove-red` the bodies.** Each plant must be reported where stated and nowhere else:
   - a card class changed in one route's body is reported in that body's field only;
   - a dropped og:url is reported in the head field;
   - a `journey-*` test id planted into a classic body is reported as a trace (RAW_TRACE :486; the live trace :590).
6. **Calibrate.**
   - `--prove-red` must be green.
   - Commit WP1. It changes scripts only, so the served tree is still S6's.
   - Capture `parity-v3-<sha8>.json` at WP1's commit on a fresh server.
   - A null `--compare` on a second fresh server must exit 0.
   - After any rebase, re-capture into a new file (A18).

**Gates.**
- qa:classic-shell-parity, in three modes: `--prove-red` (the control), `--baseline` and a null `--compare`.
- test:orphans
- test:docs

**Served bytes for a classic viewer.** None (scripts only).

**Done when.**
- v3's `--prove-red` catches every plant.
- The v3 baseline at WP1's commit and a null compare on a fresh server agree.
- §0j names the file and its base.

### WP2 — The pure move: today's home body into `legacy-landing.tsx`, every gate re-pointed (S; depends on WP1)

**Goal.** §3.2's "first commit of S7". The home body leaves the route file verbatim, so the journey arm can later be
added beside it without touching a classic line. Nothing a visitor is served changes.

This is a move, not a shelving. SHELVED.md's rows land "in the SAME commit that hides the item" (SHELVED.md:9), and the
move hides nothing; the landing's row lands in WP7. Its "no renames" rule (:10) is about component files whose paths
scripts pin. The route body has no such path, and every script that names `page.tsx` is re-pointed here.

**Files.**
- src/app/page.tsx (edited): keeps :1-2, :34 and :36-56; the body becomes one delegation.
- src/components/home/legacy-landing.tsx (new): today's imports :4-32 and :58-321 verbatim, as
  `export async function LegacyLanding`.
- scripts/featured-card.test.mts: 3.4 (:221-223); prose (:191).
- scripts/one-sided.test.mts: 7.2 (:304, :308); prose (:126).
- scripts/landing-mine.test.mts (:76)
- scripts/hero-copy.test.mts: the source (:103); the 3d/3e messages (:270, :277).
- scripts/lib/house-bot-absence-cases.mts: NAMED (:232).
- Prose only: scripts/hero-contract.test.mts (:76), scripts/landing-contract.test.mts (:68),
  scripts/anchors/one-sided.anchors.mjs (:44).
- scripts/journey-home.test.mts (new), plus package.json `test:journey-home` and `red:journey-home` (new, in-process;
  test:journey-home joins predeploy, A14's precedent).
- docs/VODACOM-PLAN.md: the ripple Home row (:2901) gains hero-copy and marks the two contracts "prose only"; §0j.

**Steps.**
1. **`page.tsx` keeps what Next reads only from the route file:**
   - `import type { Metadata }` and `import { ROOT_OPEN_GRAPH } from "./layout"` (:1-2);
   - `export const dynamic = "force-dynamic"` (:34);
   - the `metadata` block with its comment (:36-56).

   Moving these would lose `/`'s canonical, og:url and og:image (the regression recorded at :49-55 and
   layout.tsx:91-99), and `/` would stop being force-dynamic.

   The default export becomes a plain function that returns `<LegacyLanding searchParams={searchParams} />`. The JSDoc
   on `searchParams` moves with the body.
2. **`legacy-landing.tsx`** is an async server component with no directive.
   - It carries today's imports (minus the two above) and :58-321 byte for byte, including the 50-line header comment.
     Tailwind scans comments (tailwind.config.ts `content`), so a reworded comment could add or drop a generated
     utility on every page.
   - `export default async function LandingPage` becomes `export async function LegacyLanding`. Nothing else changes.
3. **Re-point every gate that reads the body.** Ten files name `app/page.tsx` (grep 2026-10-04):
   - **featured-card 3.4 and one-sided 7.2** read `legacy-landing.tsx`.
   - **landing-mine §3** reads it, with a control that the file holds `export async function LegacyLanding(`.
   - **hero-copy:**
     - its world reads `src.get("src/components/home/legacy-landing.tsx")`;
     - a presence control is added (the body is over 1,000 characters and holds `<TrustBand`), because `?? ""` would
       report a wrong path as "no rails";
     - 3d/3e's messages name the new file;
     - the two plants keep their shape.
   - **house-bot-disclosure's NAMED list** gains `legacy-landing.tsx` beside `page.tsx`.
   - **simple-journey-flag and route-census** need no edit.
   - **The four prose comments** now name `legacy-landing.tsx`.
4. **test:journey-home §1, "the route file"** (in-process, decommented reads). It checks that:
   - `page.tsx` exports `dynamic = "force-dynamic"`;
   - its metadata is spelled `alternates: { canonical: "/" }` and `openGraph: { ...ROOT_OPEN_GRAPH, url: "/" }`;
   - `ROOT_OPEN_GRAPH` comes from `"./layout"`;
   - the one classic return is `<LegacyLanding searchParams={searchParams} />`;
   - `legacy-landing.tsx` carries no directive and only `page.tsx` imports it.

   red:journey-home plants a defect for each, in memory:
   - the metadata moved;
   - openGraph replaced instead of spread;
   - `dynamic` dropped;
   - a second importer.

**Gates.**
- test:featured-card and test:one-sided. Their reds, red:featured-card and red:one-sided, mutate files: run each alone,
  detached, after committing, then `git diff --exit-code`.
- test:landing-mine
- test:hero-copy + red:hero-copy
- test:house-bot-disclosure (5.2.0 and its plants)
- test:simple-journey-flag
- test:route-census
- test:journey-home + red:journey-home (new)
- test:red-anchors
- test:measure
- test:docs
- qa:classic-shell-parity `--compare` against the v3 baseline: 0 differences, bodies and `/`'s head included.
- The WP6c served-HTML compare (`scratchpad/s6/wp6c/shell-skeleton.py`): a HEAD-against-HEAD null pair first, then `/`
  signed out and signed in. The body skeleton must be identical.

**Served bytes for a classic viewer.**
- **Production HTML and RSC:** none. A server component's boundary leaves nothing of its own.
- **`next dev`:** React's development-only debug data may name `LegacyLanding` where it named `LandingPage`. Production
  does not serve it and no capture reads it.

**Done when.**
- Every gate above is green or on WP0's red list.
- Parity v3 shows 0 differences.
- The ripple map's Home row names hero-copy.

### WP3 — The pure rules: home list, card face, the `/markets` target, the journey ticker list (M; depends on WP2)

**Goal.** Put every decision S7's pages make into pure modules, tested in process, before any markup uses them.

**Files.**
- src/lib/journey/home-list.ts (new, pure)
- src/lib/journey/card-face.ts (new, pure)
- src/lib/journey/markets-redirect.ts (new, pure; imports only `pending-bet.ts` and the query helpers)
- src/lib/markets/ticker.ts (edited): `JOURNEY_TICKER_ROUTES` and `tickerShowsOn(pathname, journey = false)`. It must
  still import nothing (11.14).
- src/lib/server/journey-sheet.ts (edited): `cardFigures(m, nowMs)` is extracted from `sheetPublic`, which then calls
  it with identical output.
- scripts/journey-home.test.mts (§2, §3)
- scripts/markets-redirect.test.mts (new), plus package.json `test:markets-redirect` and `red:markets-redirect` (new,
  in-process; test:markets-redirect joins predeploy).
- scripts/ticker-honesty.test.mts: 11.1 and 11.2 gain the journey cases.

**Steps.**
1. **`home-list.ts`** (SJ-6/SJ-7, VODACOM-PLAN.md:2290-2300):
   - **`parseHomeParams(sp, categories)` → `{ cat, q, page }`:**
     - `cat` is a known id (MARKET_CATEGORIES, categories.ts:29-31), else none;
     - `q` is `clampText(oneParam(sp, "q"), MAX_QUERY_LEN)` (query/parse.ts:27, :72; search/query.ts:58);
     - `page` is a positive whole number, else 1.
   - **`homeBook(markets, nowMs, bettable)`:** keeps the markets taking bets. The caller passes `bettable`, the bet
     path's own test (`status === "LIVE" && !isSelectionClosed && resolutionAt > now`, journey-sheet.ts:58), so the
     module stays pure. It orders by closing instant ascending (`cardClosesAtMs`, card-close-label.ts:34), then pool
     descending, then id, which keeps the order stable across refreshes.
   - **`homeChips(book)`:** Zote first, then the categories holding at least one bettable market. Sports, weather and
     macro come first (the deck's order), then the rest in MARKET_CATEGORIES order.
   - **`homeView(book, params, perPage, matches)`:** filters by `cat` and by `q` (the caller's `matchesQuery` over
     MARKET_SEARCH, as `/live` does), then pages **cumulatively**: page n shows the first perPage·n cards (Open point 12).
     It reports `more` and clamps `page` to the last page.
   - **`homeHref({ cat, q, page })`:** `/` plus only the parameters that are set, in a fixed order.
2. **`card-face.ts`:** `cardFace({ productLine, status, resolvedOutcome, bettable, estimates })` gives the meta row's
   right-hand label and each side's face. It reads `cardEstimate`'s states only (estimate.ts:135-151):
   - priced → `win` (≈{mult});
   - `overCap` → `overCap`, with no number;
   - `lean === "thin"` → `thin` (≈{mult}) (Open point 6);
   - emptyPool or fillsEmptySide → `beFirst`;
   - oneSidedRefund → `oneSide`;
   - hidden (a legacy capped fee, the display switch off, or no rates) → the side word alone;
   - an Up & Down round (estimate null) → the product's side word alone;
   - unsettled and not bettable → `closed` (no control);
   - RESOLVED or VOIDED → `settled`, carrying the outcome and its ink: YES ink, NO ink, VOID neutral (one-sided 8.10's
     rule, one-sided.test.mts:401-404).

   It also sets `oneSidedNote` on an unsettled one-sided pool (L22, Open point 7).
3. **`markets-redirect.ts`:** `journeyMarketsTarget(search)` always returns a same-origin path, `/` or `/watchlist`
   (Open point 13):

   | `/markets` with | goes to |
   |---|---|
   | nothing | `/` |
   | `topic=sports` | `/?cat=sports` |
   | `topic=all`, an unknown topic | `/` |
   | `topic=sports&topic=macro` | `/?cat=sports` (an array takes its first value, `oneParam`) |
   | `cat=<known id>` with no `topic` | `/?cat=<id>` |
   | `q`, clamped | kept |
   | `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` (UTM_VALUE, pending-bet.ts:99), `utm_id`, `gclid`, `gbraid`, `wbraid` (one token shape) | kept (GA's own list, google-tag.ts per the routes map) |
   | `ref`, `invite` (CODE, pending-bet.ts:96) | kept |
   | `side=YES` or `side=NO` | kept (harmless on `/`; S11's auto-open reads it) |
   | `bet`, valid by `parseBetParam` | kept, re-formatted by `formatBetParam` |
   | `status=watch` | `/watchlist`, carrying `cat` and `q` |
   | `status`, `sort`, `dir`, `odds`, `pool`, `page`, `when`, `w`, anything else | dropped |

   Output order is fixed: cat, q, side, bet, ref, invite, the utm keys, then the click ids. Values are encoded with
   `encodeURIComponent`.
4. **`ticker.ts`:**
   - `JOURNEY_TICKER_ROUTES = ["/live", "/results"]`, S16's list (VODACOM-PLAN.md:3110);
   - `tickerShowsOn(pathname, journey = false)` reads that list when `journey` is true.

   With `journey` false the function is unchanged, so 11.1 and 11.2 still hold.
5. **`journey-sheet.ts`:** extract `cardFigures(m, nowMs)` → `{ bettable, rates, estimates }`, using `bettable` from
   :58, `pickEstimateRates(ratesFor(m))`, and `cardEstimate` for YES and NO. `sheetPublic` calls it. The card and the
   sheet then cannot disagree about a market.
6. **Tests:**
   - **journey-home §2, home-list:**
     - a golden order, including a pool tie;
     - the chips' order and an empty book;
     - parsing `cat`, `q` and `page` (unknown, array, negative, huge);
     - cumulative paging and the clamp;
     - the hrefs.
   - **journey-home §3, card-face:**
     - the S3 golden pools: Dodoma ≈2.8×/≈1.4× and Yanga ≈2.9×/≈1.4× (VODACOM-PLAN.md:2493-2494);
     - the canvas states: empty pool, one side, over the cap with its thin side at ≈1.0×, legacy, closed;
     - settled YES, NO and VOID;
     - an Up & Down row, live and settled.

     Each check has an in-memory plant in red:journey-home.
   - **test:markets-redirect §1:** the table above as goldens. red:markets-redirect plants:
     - a dropped key leaks;
     - status=watch is ignored;
     - an unvalidated topic passes through;
     - a target that is not same-origin.
   - **ticker-honesty:**
     - `tickerShowsOn("/", true)` and `("/markets", true)` are false;
     - `("/live", true)` and `("/results", true)` are true;
     - every classic answer is unchanged.

**Gates.**
- test:journey-home + red:journey-home
- test:markets-redirect + red:markets-redirect
- test:ticker-honesty, plus red:ticker-honesty alone and detached. Its file plants must still be caught; its cases 9 and
  10 anchor on a line `platform-stats.ts` holds twice, a known problem recorded for its owners (§0i :232-234).
- test:journey-sheet + red:journey-sheet (sheetPublic's output unchanged)
- test:journey-estimate and test:card-close-label (unchanged)
- test:client-graph-safe (the three new modules are client-safe)
- typecheck

**Served bytes for a classic viewer.**
- **HTML and RSC:** none.
- **JS:** `ticker.ts` ships to the browser (11.14), so LiveTicker's chunk gains the journey list on every page. The
  output is unchanged.

**Done when.**
- The three modules and `cardFigures` exist, and the suites and their twins are green.
- `sheetPublic` is proven unchanged.

### WP4 — S7's words: the journey.* keys (S; depends on WP3)

**Goal.** Every word S7 shows comes from its own key. No existing value changes before S15 (§3.9, :2846-2847).

**Files.**
- src/lib/i18n-dict.ts: the journey namespace (en :2874, sw :5259, zh :7586).
- docs/VODACOM-PLAN.md:
  - the §3 table: S7's drafts are added; `journey.cardWinOver` is marked not used on cards (Correction 9);
  - §3.8 :2825: `howTo.helplineLabel` becomes `journey.howHelplineLabel`.
- docs/design-system/v5-2026-09-29-simplified-journey/INHERIT-MANIFEST.md :52: SJ-1's over-cap sentence follows the
  panel.
- docs/design-system/v5-2026-09-29-simplified-journey/S4-COPY-AUDIT.md: "S7 drafts", with the Swahili review signed
  (§0h point 3).

**Steps.**
1. Add the keys listed in "New dictionary keys" below. sw is verbatim from the §3 table where a row exists, or the
   approved canvas word (S4-COPY-AUDIT.md:226). en follows the deck's English (SJ-21). zh is drafted: formal 您,
   break-keep.
2. **Reuse, never copy:**
   - `common.yes` and `common.no` through `sideWord`;
   - `market.catAll`, `catSports`, `catWeather`, `catMacro`, `catCrypto`, `catCulture`, `catTech`, `catOther`;
   - `market.oneSideOnly` (:3646), `market.oneSidedNote` (:3648), `market.waitingForResults` and
     `market.statusClosed`;
   - `market.resolvedOutcome` ("Imetatuliwa") and `common.voided` ("Imebatilishwa");
   - `journey.cardClosesToday`, `cardDaysLeft` and `cardDaysLeftOne`;
   - `journey.comp*`, `rg.setLimits`, `common.close`, `common.clearSearch` and `common.search`.

   Never edit an existing value (S6-PLAN.md:114).
3. **Do not add `journey.cardWinOver`** (Open point 6). Correct INHERIT-MANIFEST SJ-1 and the §3 row in this commit,
   so the old wording lives in one place only: the history.

**Gates.**
- test:i18n (en/sw/zh parity, sw≠en, placeholder parity)
- test:translation-safety
- test:rate-copy: no literal N% or N×; only `{mult}×`, `{pct}%` and `{cap}` placeholders.
- test:labels (NDIO)
- test:docs
- test:house-bot-disclosure 5.1 goes red by construction on any dictionary change (S6-PLAN.md:124). Re-derive it and
  record it; do not "fix" it.

**Served bytes for a classic viewer.** No visible word changes. If the dictionary rides in the client bundle (`useT`),
every page's JS grows by these keys. Record it in §0j, as S6 WP1's keys were.

**Done when.**
- The keys exist in en/sw/zh.
- The Swahili review is signed in S4-COPY-AUDIT.
- §3, §3.8 and INHERIT-MANIFEST agree.

### WP5 — The journey card: one server component, every state (M; depends on WP3, WP4)

**Goal.** Build the canvas's card (s4-3-card-*.dc.html) in the kit's atoms, as one component whose state comes from
the market itself. The live, closed and settled states are one component (B9: "a new state as a prop on the existing
component" holds inside it). It is not mounted anywhere yet.

**Files.**
- src/components/journey/cards/journey-card.tsx (new; server component, no directive)
- src/app/globals.css: `.kp-jcard*` and the `--jcard-*` tokens (§2 :2450, "own height tokens; density does not apply").
- docs/design-system/v2-2026-07-27/02-components/market-card/spec.md and 07-provenance/CHANGELOG.md: the journey card
  as the market card's journey state, effective at the flip (B9, DESIGN_AUTHORITY.md:981-987).
- scripts/journey-home.test.mts (§4)

**Steps.**
1. **Props:**
   - the market row (StoredMarket fields: pools, status, outcome, close instants, category, competition, titles and
     short titles, productLine, fee snapshot);
   - the render's clock (`nowMs`), the words and the locale;
   - the heading level: h2 on the home, `/live`, `/watchlist` and `/results`; h3 in the similar rail;
   - for an Up & Down row on `/live`, its round id;
   - `from: "home"` on the home only.

   The card computes everything itself through `cardFigures` (WP3), `cardFace`, `cardCloseLabel` with
   `cardCloseText`, `cardTitle` (short-title.ts:237) and `normaliseCompetition` with `competitionLabel`. The close
   label is computed on the server, never in the browser, where midnight in East Africa could split the server and
   client.
2. **Anatomy** (pick-1-home.dc.html :57-109; s4-3-card-priced):
   - `<article class="kp-jcard" data-row-id data-testid="journey-card">`, with padding 16, gap 12, radius `--r-lg`,
     `--bg-elevated` and a 1px `--border`.
   - **The meta row** (body-sm): "category · competition" in `--text-subtle` on the left, the close label in
     `--text-muted` on the right. "Inafungwa leo" has a clock glyph; selection closed shows an hourglass and
     `market.waitingForResults`; settled shows a check and "Imetatuliwa"; void shows "Imebatilishwa".
   - **The heading:** the short title, Sora 600 on the title-sm rung. Only the full-title fallback is clamped to two
     lines (`short === false`, ticket-card.tsx:91's pattern).
   - **The pick row:** two columns with a 10px gap. Each pick is at least 64px tall and wraps its second line, and both
     grow together to 74px (§0g item 11, :1640-1646).
     - Line 1 is the side word (`sideWord`) in the `.btn-yes` or `.btn-no` ink and tracking (globals.css:1277-1300).
       There is no new ink, and no `.btn` height or nowrap, which a two-line pick cannot use.
     - Line 2 is the face's words: `journey.cardWin` with the figure in a mono nowrap unit and a no-break space before
       "dau"; or `cardBeFirst`, `oneSideOnly`, `cardOverCap` or `cardThin`; or nothing for a hidden or Up & Down face.
   - **The selection-closed row:** a 64px row that is not a control, with a lock glyph and `market.statusClosed`
     (s4-3-card-closed).
   - **The settled row:** `journey.cardResultLabel`, then a `<time>` with `formatDayTime(settledAt ?? resolutionAt)`
     formatted on the server, then the outcome chip (`outcomeWord`, product-aware) in its own ink (s4-3-card-settled).
   - **One-sided:** an unsettled one-sided card adds `market.oneSidedNote` in its side word, one line under the picks
     (L22; Open point 7).
3. **Links, all server-rendered `<Link>`s** (Open point 4):
   - **The stretched card link** goes to `/markets/<id>`, or for an Up & Down row on `/live` to `/updown/<round>`
     (`/updown` when no round resolved; pulse-grid.tsx:175). Its `aria-label` is the reader's full title.
   - **The picks** link to `/markets/<id>?side=YES|NO`, adding `&from=home` on the home, with prefetch off — exactly
     where today's buttons go (market-card.tsx:437; landing-hero.tsx:348-355). An Up & Down pick reaches its round
     through the question page's verbatim `?side` translation ([id]/page.tsx:142-154). A pick's accessible name is its
     visible text.
   - **Stacking:** the picks row is raised above the stretched link inside the card's own stacking context, at z 2/3 on
     the local plane (z ≤ 10 is local, stacking-contract.test.mts:690). This is `.mcardp`'s pattern
     (globals.css:6818-6828) without its classes.
4. **What the card never carries** (§3.2 and the canvas):
   - a pool, predictor count, bar, sparkline or 24-hour move;
   - a status or signal chip, the category watermark or the info popup;
   - Share or Details;
   - `data-market-surface`, `.mcardp` or `.market-grid`. V18 (scripts/qa/landing-ten.mjs) selects those, and phone
     density rewrites them (globals.css:6908-6920).
   - an `onClick` or a `50pick:navigating` dispatch, because NavProgress already catches every internal link.
5. **CSS:** `.kp-jcard*` and the `--jcard-*` tokens, with sizes on the type ladder only (Correction 20). WP7's ghost uses
   the same tokens.

**Gates.**
- **test:journey-home §4 and its plants.** It checks that:
  - the card has no directive and no client module imports it;
  - every figure comes through `cardFigures` and `cardFace`, with no `%`, no `priceState` and no pool printed;
  - it carries none of the forbidden hooks or classes;
  - the hrefs are as above;
  - the heading clamp applies only to the fallback;
  - the close label is server-computed.
- test:betting-ink (the inks are on side controls and the result chip)
- test:gold-is-money
- test:contrast (the second line, 13px, on both fills)
- test:design-frozen (no inline values in a new file)
- test:ui-consistency
- test:type-scale (no new off-ladder size and no tracking growth)
- test:tokens
- test:dead-css (the classes are used from WP7 on: run it in WP7)
- test:stacking

**Served bytes for a classic viewer.** None in HTML or RSC, and no client code (it is a server component). CSS:
`.kp-jcard*` and its tokens, which match nothing on a classic page.

**Done when.**
- The card renders every state in a test world.
- §4 and its plants are green.
- The spec and the CHANGELOG are written.

### WP6 — The home's lazy module, the shared lost-chunk guard, the How-to card and the static How-to sheet (M; depends on WP4)

**Goal.**
- Give the journey home its client parts without putting their code in a classic visitor's first load of `/`.
- Build the How-to card and the static sheet in §3.8's order (:2821), opened only by a tap.

**Files.**
- **The guard (one of two cases):**
  - If S6 WP12 already did WP6c's owed item (8) (VODACOM-PLAN.md:491-494), the guard is already shared and S7 imports
    it.
  - Otherwise S7 adds src/components/layout/lost-chunk.ts (new), holding `Nothing` and `nothingIfLost` lifted from
    `shell-lazy.tsx`, and edits `shell-lazy.tsx` to import it.
- src/components/journey/home/home-lazy.tsx (new, "use client")
- src/components/journey/home/howto-card.tsx (new, "use client")
- src/components/onboarding/how-to-play-sheet.tsx (new, "use client"; §3.8's path)
- src/app/globals.css: `.kp-jhowto*` (the card) and `.kp-howto*` (the sheet; §2 :2465 names `.kp-howto__step`).
- scripts/journey-shell.test.mts §12: 12.module.lost and 12.module.dynamic are re-pointed in the open, with
  red:journey-shell's plants.
- scripts/popup-fit.test.mts: REVIEWED gains the sheet.
- scripts/journey-home.test.mts (§5)

**Steps.**
1. **The guard.** Lift the guard out of `shell-lazy.tsx`, where §12 pins it (journey-shell.test.mts:2180-2186,
   :2249-2256).
   - **The new module:** one module that both lazy modules import, with no directive and no imports.
   - **The re-pins in §12:**
     - 12.module.lost reads the guard in its new home and checks that `shell-lazy.tsx` imports it;
     - 12.module.dynamic allows exactly that one extra static import;
     - each re-pin gets its plant.
   - **The older files, in their own commit:** `ticket-switch-rail.tsx` and `lazy-overlays.tsx` adopt the guard, for
     every player (WP6c owed (8)). A lost chunk there then leaves the part out instead of reaching an error screen.
   - **Skip** this whole step if S6 WP12 already did it.
2. **`home-lazy.tsx`** declares one line per part:
   `export const LazyX = dynamic(() => import("…").then((m) => m.X).catch(nothingIfLost));`
   - **The parts:** `LazyHowToCard`, `LazyRefreshPoller`, and `LazyEmptyState` only if WP7 uses the kit's EmptyState.
   - **No option object:** no `ssr: false` and no `loading`. The server render stays on, and next/dynamic then adds no
     Suspense boundary of its own (the WP6c finding, VODACOM-PLAN.md:425-426).
   - **Why a client module:** any of these modules imported statically from a server file would join `/`'s first load
     for every visitor (§0h point 20), and 12.nodefer.platform forbids a server module from deferring a client module
     (journey-shell.test.mts:2272-2274). Only `journey-home.tsx` (WP7) imports `home-lazy.tsx`.
3. **The How-to card** (`howto-card.tsx`, pick-1-home.dc.html :37-46):
   - **Element:** `<button type="button" aria-haspopup="dialog" data-testid="journey-howto-card">`, at least 72px tall,
     radius `--r-lg`, `--bg-elevated` and a 1px `--border`. It holds `open` and renders the sheet.
   - **The plate:** a 48px IconPlate with the play glyph `I.playBare`. Choice 3A, royal: token-valued fill and edge from
     the `.btn-primary` material (globals.css:1238-1259), never gilt (§2 :2447).
   - **The text:** `journey.howToCardTitle` (Sora 600, body-lg); the meta `fill(journey.howToCardMeta, { steps,
     minutes })` (body-sm, `--text-subtle`); and `I.chevronRight`.
   - **The numbers:** `steps` is the sheet's step count. `minutes` is a named constant in the sheet's module, the deck's
     "dakika 1".
4. **The sheet** (`how-to-play-sheet.tsx`, pick-5-how-to-play.dc.html and s4-7-howto-*):
   - **The frame:**
     - the kit `<Modal sheet sheetUntil="lg" maxWidth={440} labelledBy={titleId} panelClassName="kp-wsheet kp-howto">`
       (tickets-guest-sheet.tsx:28-37's precedent);
     - on the default dialog rung, 100 (test:stacking);
     - `data-testid="journey-howto-sheet"`;
     - the grab handle `.kp-wsheet__grab` below 1024, with no drag (`dragToDismiss` is not built);
     - the kit's own ✕ (`showClose`, `common.close`). The canvas's 44px royal ✕ is canvas drift (§0h point 7).
   - **The order:**
     1. **The title:** an h2 with `journey.howToTitle` in `.kp-jsheet__title`, which reserves the ✕'s room
        (globals.css:6454).
     2. **The steps region:** a region with `tabIndex={0}`, named by `journey.howStepsAria`, holding an `<ol>` of the
        three steps.
        - The badges are neutral (choice 1B, DESIGN_AUTHORITY §M3): `--bg-royal-soft` fill, `--border-strong` inset
          ring, `--text` mono numerals.
        - The titles and bodies are filled with `sideWord(t, "YES" | "NO", "MARKET")`.
        - Step 2's `{mult}` comes from `estimateFor({ ...HOW_TO_EXAMPLE, bettable: true })`, giving "2.7"
          (journey-estimate.test.mts:73-75).
     3. **MFANO:** the kit `Callout tone="info"` (§2 :2466).
        - **Its label:** an `.eyebrow` with `journey.howExampleLabel`. Latin text is uppercased by CSS; zh 示例 gets
          neither uppercase nor mono (qa:dg-eyebrow).
        - **Its body, through `fillNodes`:** `{stake}` and `{payout}` are `.amount` spans (`formatTzs`; mono, nowrap),
          and `{mult}` is one nowrap unit with its ≈ and ×.
        - **Then the Makadirio line:** `journey.estimateNote`, with `{pct}` = `loserSharePct(HOW_TO_EXAMPLE.rates)`,
          which is 13 (Open point 21).
     4. **The CTA:** "Nimeelewa, anza", a full-width kit Button in the `.btn-primary` material. It closes the sheet.
     5. **The foot:**
        - "Weka mipaka" (`rg.setLimits`) goes to `/profile/responsible-gambling` when signed in and to
          `/legal/responsible-gambling` when signed out. The card hands the sheet `signedIn` from the server.
        - The helpline is `<a href={"tel:" + HELPLINE_TEL()}>`, labelled `journey.howHelplineLabel` beside `HELPLINE()`
          in a nowrap tabular span. It uses Inter, not mono (§0g item 7, :1617-1619), in the footer's idiom
          (public-footer.tsx:223-227).
        - Each target is at least 44px. A link closes the sheet as it navigates.
   - **Sizing:**
     - The panel is capped at the viewport height minus 48px. The Modal wrapper is items-end and cannot scroll content
       above a panel, which is why the primer's measured cap exists (first-visit-primer.tsx:369-390).
     - The title row and the foot (CTA and links) never scroll. Only the steps-and-MFANO region scrolls, under a fade,
       when the cap bites (s4-7-howto-320; §0g :1718-1721; Open point 20).
     - On desktop it is a centred dialog 440px wide.
   - **Storage:** none. No seen flag in S7 (Open point 18), so no Privacy §7 change.
5. **Records:**
   - popup-fit's REVIEWED gains the sheet by name, with its review note.
   - red:journey-home plants it out through `reviewGaps` (popup-review.mts), A13's pattern.

**Gates.**
- **test:journey-home §5 and its plants.** It checks:
  - the card's button semantics and test id;
  - the sheet's order;
  - side words come through `sideWord`;
  - figures come only from `HOW_TO_EXAMPLE` through `estimateFor`, and `{pct}` from `loserSharePct`;
  - the sheet's decommented source holds no helpline digits ("0800"), and it reads both `HELPLINE()` and
    `HELPLINE_TEL()`;
  - the limits href depends on sign-in;
  - nothing writes to localStorage or sessionStorage;
  - the cap is on the panel;
  - `home-lazy.tsx` is each part's only loader and is imported only by `journey-home.tsx`.
- test:journey-shell §12 + red:journey-shell (only if the guard moves)
- test:popup-fit
- test:stacking
- test:support-contact
- test:design-frozen
- test:ui-consistency (the kit Button, never a raw `btn` button)
- test:type-scale: the title on title-md 22, because the canvas's 24 is off the ladder.
- test:tokens
- test:contrast
- test:i18n
- test:rate-copy
- test:journey-estimate
- qa:dg-eyebrow

**Served bytes for a classic viewer.**
- **HTML and RSC:** none, because nothing is mounted yet.
- **JS:** if the guard moves, `shell-lazy.tsx`'s chunk changes on every page. A8h's precedent: "a guest's page changes
  only by the name of the shell's lazy chunk" (VODACOM-PLAN.md:1061-1066).
- **CSS:** `.kp-jhowto*` and `.kp-howto*`.

**Done when.**
- The card and the sheet render in a test world.
- §5 and its plants are green.
- If the guard moved, §12 is re-pinned with its plants.

### WP7 — The journey home on `/` (L; depends on WP5, WP6)

**Goal.** A journey reader's `/` is the deck's home in the canvas's order (§3.2 :2566-2574). Every other reader's `/`
is byte-for-byte today's.

**Files.**
- src/app/page.tsx (edited: asks the resolver; the journey arm comes first)
- src/components/journey/home/journey-home.tsx (new, server; the home's `listMarkets` read)
- src/components/journey/home/journey-home-ghost.tsx (new, server)
- src/components/journey/home/home-chips.tsx (new, server; a declared filter SURFACE)
- src/app/globals.css: `.kp-jhome*`
- scripts/journey-home.test.mts: §6 the page's shape, §7 the view.
- scripts/filter-language.test.mts: SURFACES.
- scripts/product-line.test.mts:
  - MUST_STAY_DEFAULT += `journey-home.tsx`;
  - a listed file that is missing now fails, where today it is skipped silently (:231-233). This change gets its own
    control.
- docs/SHELVED.md (the landing's row)
- docs/PLAYER-QUERY-CAMPAIGN.md §4: the `/` ruling (:1045-1048) gains a journey sentence.
- docs/VODACOM-PLAN.md §0j

**Steps.**
1. **`page.tsx`:**
   - It calls `const { journey } = await resolveSimpleJourney();` first, never the cookie and never `simpleJourneyFor`.
   - For a journey request it returns
     `<Suspense fallback={<JourneyHomeGhost />}><JourneyHome searchParams={searchParams} /></Suspense>` before the one
     classic return. This is the journey skeleton inside `page.tsx`; the root `loading.tsx` stays generic (§3.2 :2579).
   - `metadata` and `dynamic` stay exactly as WP2 left them, with no `generateMetadata` (Open point 25).
2. **`JourneyHome` (server):**
   - **The reads:** `getServerT`, `getSession` (signed-in only feeds the sheet's limits link), and `listMarkets({ status:
     "LIVE" })` on the MARKET default. Then `searchParams` → WP3's `parseHomeParams`, `homeBook`, `homeChips` and
     `homeView`.
   - **The layout:** inside `<PageContainer tier="board">`, with no padding or width classes on it (measure §6). In this
     order:
     1. **The How-to card** (`LazyHowToCard`), first in the column. From 1024 it sits beside the h1
        (s4-3-home-desktop :39-46).
     2. **The h1:** `journey.headlineAsk`, a `<br>`, then `fill(journey.headlineSides, { yes, no })` with `sideWord`.
        It uses a journey class in the `.kp-hero__headline` family (font, weight, tracking), at a rung measured to hold
        exactly two lines at 360 in sw, en and zh (§2 :2448). The landing's pinned `<h1 className="kp-hero__headline">`
        (hero-copy plant 2b) is untouched.
     3. **The chips:** FilterPill links with `?cat=`, `data-filter-rail` and `aria-label={journey.homeChipsAria}`. Zote
        comes first, and a chip's href keeps `q` and drops `page`. The rail bleeds to the right edge and scrolls (canvas
        s4-3-home-chips).
     4. **The q line,** when `q` is set: `journey.homeQueryLine` and a `common.clearSearch` link to `homeHref` without
        `q`. A link's settings are never applied invisibly (the §0h point 23 lesson).
     5. **The list:** a `ul` of JourneyCards (h2, `from: "home"`). The grid is 1 column below 640, 2 at 640 and 3 from
        1024 (`.kp-jhome__grid`, never `.market-grid`).
     6. **"Onyesha zaidi":** a `<Link scroll={false}>` to `homeHref({ …, page: n + 1 })` while `more` is true.
     7. **The empty states,** in the canvas's words (s4-3-home-empty): a category with none; an empty book; a q miss
        (`journey.homeQueryNone` with `common.clearSearch`). They use a server-safe composition, or the kit EmptyState
        through `LazyEmptyState`.
     8. **`LazyRefreshPoller`** with `intervalMs={30_000}` (§3.2 :2578). There is no SSE patch (Open point 5).
3. **`JourneyHomeGhost`** follows the canvas's skeleton (s4-3-home-skeleton) at the landed geometry, using the same
   `--jcard-*` tokens:
   - the How-to card at 72;
   - the headline at two lines;
   - the chips at 44;
   - the card boxes.

   It draws the How-to card's title, as `positions/loading.tsx` draws its words, and every other shape is aria-hidden.
4. **SHELVED row:**

   | Item | Files | Why shelved | How to re-mount | Test |
   |---|---|---|---|---|
   | The classic landing on `/`, for journey viewers only (`LegacyLanding`: the hero, proof rail, board, how-it-works band, topic tiles, Up & Down band and trust band) | `src/components/home/legacy-landing.tsx` and `src/components/home/*`, unmounted on `/` for a journey request only | SJ-6 / §3.2: the home is the question list | In `src/app/page.tsx`, return `<LegacyLanding>` for every request | `npm run test:journey-home` (§6) |

   `lib/markets/hero.ts`, `landing.ts`, `landing-picks.ts` and `updown-band-round.ts` stay in use for classic readers.
   `platform-stats.ts` stays (the ticker).
5. **PLAYER-QUERY-CAMPAIGN §4:** "`/` — ruled no filter" now holds for classic readers. Add a sentence that a journey
   reader's home filters by `?cat` and `?q` (SJ-6, SJ-7). test:route-census reads routes, not rulings, so it cannot see
   this.

**Gates.**
- **test:journey-home §6, the page's shape, with plants.** It checks:
  - the resolver is asked exactly once;
  - the journey arm comes before the classic return;
  - the classic return is unchanged;
  - metadata and `dynamic` are untouched, with no `generateMetadata`.
- **test:journey-home §7, the view, with plants.** It checks:
  - the canvas's order;
  - the list read stays on the product default;
  - the chips are declared;
  - paging is cumulative;
  - no journey file uses `.market-grid` or `.mcardp`.
- test:product-line
- test:filter-language + red:filter-language (alone, detached)
- test:simple-journey-flag (10.census.read, .decide and .write: no new reader or decider)
- test:journey-shell §9 + red:journey-shell: the journey home's links become edges; no route loses its last entrance.
- test:measure + red:measure (alone)
- test:design-frozen
- test:ui-consistency
- test:type-scale
- test:dead-css
- test:contrast
- test:hooks-order
- test:client-graph-safe
- test:i18n
- qa:classic-shell-parity `--compare` (v3): 0 differences on `/`, body and head, and everywhere else.

**Served bytes for a classic viewer.**
- **HTML and RSC on `/`:** unchanged. The classic arm is today's element after one cached await, and parity v3 proves
  it.
- **JS:** `/`'s initial scripts gain the home's lazy module, a few next/dynamic declarations (the TicketSwitchRail
  precedent). No head preloads, because the server renders none of its parts for a classic request.
- **CSS:** the stylesheet gains `.kp-jhome*`.

All of these are recorded in §0j. WP12's production-build read measures the JS.

**Done when.**
- A pass holder's `/` is the deck's home in sw/en/zh, from 320 to 1280.
- Parity v3 shows 0 differences.
- The SHELVED row and the query-campaign sentence have landed.

### WP8 — The LIVE strip leaves `/` and `/markets`; the old primer stands down (M; depends on WP7)

**Goal.** The strip leaves `/` and `/markets` for a journey reader and stays on `/live` and `/results` (§3.2
:2580-2581; COMPLIANCE "ticker off `/`", S0). The old first-visit primer never opens for a journey reader; the How-to
sheet replaces it (§3.8; S6-PLAN.md:603 hands both to S7). Classic readers keep both.

**Files.**
- src/components/layout/app-shell.tsx: :458 becomes a ternary in the same slot.
- src/components/layout/live-ticker.tsx: a `journey` prop, and `tickerShowsOn(pathname, journey)` (:127).
- src/components/onboarding/first-visit-primer.tsx: one term, in the effect and in the render.
- scripts/ticker-honesty.test.mts: 11.3 and 11.5 are re-pinned in the open.
- scripts/journey-shell.test.mts: §11 gains the primer, with red:journey-shell plants.
- scripts/journey-home.test.mts: §8, the strip.
- docs/SHELVED.md: two rows.

**Steps.**
1. **AppShell:**
   `{journeyShown ? <LiveTicker events={tickerEvents} journey /> : <LiveTicker events={tickerEvents} />}`.
   - The else arm is today's element with today's props, so a classic request's RSC row is unchanged. A
     `{journeyShown && …}` sibling would add a `false` child.
   - The prop is the shell's per-request answer, the same one that chose the header. It stays put across a soft
     navigation and is re-decided on `router.refresh()`.
   - **Why not `useJourneyOn()`** (§3.2's literal wording, :2580): its server snapshot is always false
     (journey-on.ts:48-51), and the strip is painted by the server in flow at 32px (live-ticker.tsx:99-105, :209-233). A
     journey document load of `/` would paint the strip and then drop it after hydration. That top-of-page shift is what
     qa:cls-budget's single-shift line exists to fail (0.02, cls-budget.mjs:57-58). Open point 16.
2. **LiveTicker:**
   - It takes `journey = false` and computes `const shown = events.length > 0 && tickerShowsOn(pathname, journey);`.
   - test:ticker-honesty 11.3 is pinned at two `<LiveTicker events={tickerEvents}` inside the one ternary.
   - 11.5's exact regex (:270) becomes `tickerShowsOn\(\s*pathname\s*,\s*journey\s*\)`, with a clause that
     `live-ticker.tsx` imports no `useJourneyOn`.
3. **FirstVisitPrimer:**
   - Add `const journeyOn = useJourneyOn();` with the hooks.
   - In the open effect, after the SUPPRESS_ON line, add `if (journeyOn) return;`, with `journeyOn` in the deps.
   - Straight after the render guard (:356), add `if (journeyOn) return null;`.
   - **The term is `journeyOn` on every route** (Open point 17), not S6's
     `journeyOn && isJourneySurface(pathname)`. The sheet replaces the primer for a journey reader, and S11's auto-open
     will also run on `/live`, `/results` and `/watchlist` (:2833).
   - **Nothing moves out of the primer in S7:** HIDE_ON, SUPPRESS_ON, STORAGE_KEY and primerForced stay declared there
     (marketing-optout.test.mts:983-989 with its plant :1342-1369; stacking-contract 6.1-6.5, :799-826). §3.8's
     `primer-keys.ts` is S11's (Open point 18).
   - **No flash:** the primer mounts in the browser only (lazy-overlays.tsx:21-24, `ssr: false`), after the shell's
     mark is on the page, so it does not open for a journey reader even for a frame.
4. **SHELVED rows:**

   | Item | Files | How to re-mount | Test |
   |---|---|---|---|
   | The LIVE strip on `/` and `/markets`, for journey viewers only | `src/components/layout/live-ticker.tsx`, with `src/lib/markets/ticker.ts`'s journey list; unmounted there for a journey request only | In `app-shell.tsx`, render the strip's else arm for every request | `npm run test:ticker-honesty` (11.5) and `npm run test:journey-home` (§8) |
   | The first-visit primer, for journey viewers only, on every route | `src/components/onboarding/first-visit-primer.tsx`, shelved there by one term | Take the `journeyOn` term out of its effect and its render guard | `npm run test:journey-shell` (11.primer) |

**Gates.**
- test:ticker-honesty + red:ticker-honesty (alone, detached)
- test:journey-shell §11 (11.primer.effect, 11.primer.render, 11.reads.primer) + red:journey-shell plants
- test:journey-home §8 + plants: the shell passes `journey` only in the journeyShown arm, and the else arm is verbatim.
- test:marketing-optout + red:marketing-optout (alone)
- test:stacking (6.1-6.5)
- test:hooks-order
- test:simple-journey-flag
- test:privacy-notice: no new storage.
- qa:classic-shell-parity `--compare` (v3 captures the strip region): 0 differences.

**Served bytes for a classic viewer.**
- **Markup and RSC props:** no change; the else arm is today's.
- **JS:** LiveTicker's and the primer's client code change on every page (WP7's Needle precedent,
  VODACOM-PLAN.md:381-383).

**Done when.**
- A pass holder sees no strip on `/` but does see it on `/live` and `/results`.
- A pass holder never sees the old primer.
- Classic readers keep both.
- Parity shows 0 differences.

### WP9 — `/markets` answers a journey reader with a 307; Tafuta moves into Akaunti (M; depends on WP7)

**Goal.** §3.2's "a 307 via `redirect()` while flagged" (:2591-2596), done the only way that gives a real 307 here. It
takes the param rules of WP3, the board's shelved axes, and `test:markets-redirect`. The hub's search row, which S6
left on `/markets` (S6-PLAN.md:349; hub-rows.ts:110-111), moves.

**Files.**
- src/components/layout/app-shell.tsx: a document-only branch after the E-381 block (:131-138).
- src/app/markets/page.tsx: the flight redirect, as its first statement.
- src/app/markets/loading.tsx: the ghost is chosen on the server.
- src/components/journey/account/hub-rows.ts and hub-row.tsx: the Tafuta row becomes a `search` kind.
- scripts/markets-redirect.test.mts §2 + red:markets-redirect
- scripts/journey-account.test.mts + red
- scripts/journey-shell.test.mts §9: the hub's root moves from `/markets` to `/`.
- docs/SHELVED.md
- docs/PLAYER-QUERY-CAMPAIGN.md §4: the bucket A sentence for `/markets` (:977-981).
- docs/VODACOM-PLAN.md §3.2: why the 307 is the shell's.

**Steps.**
1. **One target.** WP3's `journeyMarketsTarget` is the only function either door calls.
2. **A document: AppShell.** After the E-381 block, AppShell runs
   `if (pathname === "/markets" && h.get("x-kp-document") === "1" && (await journeyRead).journey) redirect(journeyMarketsTarget(h.get("x-href") ?? pathname) as never);`.
   - **This gives a real 307.** E-381 measured it, even with JavaScript off (app-shell.tsx:98-136). `x-href` carries
     the path and query (proxy.ts:265-268).
   - **Document-only,** because a root-layout redirect on a flight blanks the page and the page stays blank (:98-107).
   - **Not in the proxy,** which may not name the pass (10.no.grant).
   - **Anchors stay verbatim:** `const h = await headers();` and `const journeyRead = resolveSimpleJourney();`
     (S6-PLAN.md:505-513).
3. **A flight: the page.** `markets/page.tsx` asks the resolver before any read. For a journey request it calls
   `redirect(journeyMarketsTarget(sp) as never)`, and the client router follows it (positions/page.tsx:50's shape). For
   a classic request this costs one cached await and changes no output.
4. **The loading ghost.** `markets/loading.tsx` asks the resolver beside its words (positions/loading.tsx:32-33; §0h
   point 21). A journey reader gets WP7's JourneyHomeGhost; everybody else gets today's ghost, unchanged.
   - Without this, a soft hop through a classic `/markets` link would flash the board's ghost first. Such links include
     the question page's back link (:484) and the empty states of `/watchlist` (:220), `/live` (:221) and `/results`
     (:545).
   - error.tsx and not-found.tsx also link `/markets`. They are re-pointed at the flip (§3.9, :2851-2852).
5. **Tafuta.** The hub row becomes a GET form with `action="/"`: one `q` field (the kit Input, labelled `common.search`,
   placeholder `journey.hubSearchPlaceholder`) and a submit. SJ-6 says "search lives in Akaunti" (:2296). The journey
   home shows the q line (WP7), and the note at hub-rows.ts:110 is updated.
6. **SHELVED row:**

   | Item | Files | How to re-mount | Test |
   |---|---|---|---|
   | The board (`/markets`) and its axes `status, sort, dir, odds, pool, page`, for journey viewers only | `src/app/markets/page.tsx` (with `src/lib/markets/discovery.ts` and `src/components/markets/discovery-bar.tsx`), unmounted for a journey request by the redirect | Remove the AppShell branch and the page's journey redirect | `npm run test:markets-redirect` |

   The key must exist in the same commit (test:docs, docs-links.mjs:56-59).
7. **Docs:** §3.2 records that a page-level redirect streams HTTP 200 with a meta refresh (proxy.ts:52-60). The
   query-campaign's bucket A line for `/markets` becomes "for classic readers; journey readers are redirected (S7)".

**Gates.**
- **test:markets-redirect §2, with plants.** It checks:
  - AppShell has the branch exactly once: document-only, journey-only, through the one target function, and after the
    `/admin` and opt-out returns;
  - the page's branch comes first, before `getServerT` and `getBoard`, and uses the same function;
  - the proxy names no pass.

  The plants:
  - the document guard dropped;
  - the branch firing for a classic request;
  - a second target function;
  - the page redirecting after its reads.
- test:simple-journey-flag (10.shell.order, 10.no.grant, 10.census.*)
- test:journey-account + red (the search row)
- test:journey-shell §9: the census table is edited in this commit (the hub's root `/` replaces `/markets`).
- test:revoked-deadend (E-381 unchanged; a server-backed suite)
- test:measure (the markets page and its loading file agree on the board tier)
- test:red-anchors (the board-discovery, featured-card and one-sided anchors on `markets/page.tsx` still resolve once)
- The redirect cells of qa:journey-home (WP11)
- qa:classic-shell-parity `--compare`: classic `/markets` shows 0 differences.

**Served bytes for a classic viewer.** None.
- AppShell's branch has a condition that is false for a classic request.
- The page's await changes no output.
- `markets/loading.tsx` draws today's markup.
- `/account` is a not-found body for classic readers, unchanged.

**Done when.**
- A pass holder's document GET of `/markets?topic=sports&utm_source=x` answers 307 to `/?cat=sports&utm_source=x`.
- A soft hop from a journey page lands on the target with the home's ghost.
- A classic visitor still gets `/markets` at 200 with the board.
- Tafuta searches from Akaunti.

### WP10 — The journey card on `/watchlist`, `/live` and the similar rail; `/results`' settled card (M; depends on WP5, WP9)

**Goal.** Put the journey card on the other surfaces §3.2 names (:2597-2600). Each page's own frame stays as it is.
Only the cards swap (Open point 10).

**Files.**
- src/app/watchlist/page.tsx (:248-268)
- src/app/live/page.tsx (:229)
- src/app/markets/[id]/page.tsx (:1039-1081)
- src/app/results/page.tsx (:504-522)

Each page asks the resolver once and adds one ternary in its cards' slot. Also:
- scripts/journey-home.test.mts §9: the JourneyCard census and per-page pins.
- docs/SHELVED.md

**Steps.**
1. **Ask once.** Each page asks the resolver once, beside its first reads. None asks today (Correction 23).
2. **One ternary per slot.** The cards' slot becomes one ternary whose else arm is today's markup, not re-indented. Red
   anchors must resolve exactly once, and these anchor files target these pages:
   - `one-sided.anchors.mjs`: the question page :113-128 and `/results` :192, :206;
   - `count-truth.anchors.mjs`: `/results` :46 and `/watchlist` :85;
   - `measure`, `pager-reach`, `chart-one-home` and `recategorise`: `/results`;
   - `market-columns`, `share-preview` and `timer-date`: the question page.

   The page-by-page changes:
   - **`/watchlist`:** every status. Live faces, the selection-closed face and the settled face; Up & Down rows in their
     own words. The card's root carries `data-row-id`, and nothing wraps it with another (the warning at
     watchlist/page.tsx:241-247).
   - **`/live`:**
     - **The swap:** the journey list replaces `<LivePulseGrid markets={markets} />`. It uses home-list's order and
       its cumulative "Onyesha zaidi", with `q` kept.
     - **Up & Down rows** link to their round (`roundByMarket`, :110-124).
     - **Kept:** the hero carousel and the explainer. One-sided §9 keeps reading the classic code, which does not
       change.
   - **The similar rail:**
     - `getSimilarMarkets` returns markets taking bets, so the cards show priced faces.
     - The cards are h3 under the heading `journey.similarTitle`.
     - The rest of the question page stays classic in S7. Its two big buttons come with the sheet in S8.
   - **`/results`:** the settled face. `FeaturedResult` and `NotableCarousel` stay.
3. **Overlays.** These routes stay out of `isJourneySurface`; their DENY pins hold (journey-shell.test.mts:560-565;
   Open point 11).
4. **SHELVED rows:**
   - **`LivePulseGrid` on `/live`:** `src/app/live/pulse-grid.tsx`. Test: `npm run test:one-sided` (§9).
   - **The classic `MarketCard` on `/watchlist`, `/results` and the similar rail:**
     `src/components/markets/market-card.tsx`. Test: `npm run test:featured-card`.

   Each row is for journey viewers only; it is unmounted there for a journey request, and re-mounted by rendering the
   ternary's else arm for every request.

**Gates.**
- **test:journey-home §9, with plants.** It checks that:
  - the JourneyCard sites are named: `journey-home.tsx`, `/live`, `/watchlist`, `/markets/[id]` and `/results`;
  - each site hands the card the market row: never a price, never a `?? 0` on a pool;
  - the card computes its face only through `cardFigures` and `cardFace`;
  - no journey file uses `data-market-surface`, `.mcardp` or `.market-grid`.
- test:featured-card: 3.0 is still 6 and 3.3 still 4 live sites, because no MarketCard site is added or removed.
- test:one-sided: 2.4 is the same six; §9's classic `/live` is unchanged.
- test:product-line
- test:timer-date: exactly two Countdowns on the question page (:114-116).
- test:pager-reach
- test:chart-one-home
- test:red-anchors
- test:measure
- qa:classic-shell-parity `--compare` (v3 bodies on `/live`, `/results`, `/watchlist` and the similar rail):
  0 differences.

**Served bytes for a classic viewer.** None. The ternaries sit in the same slot, and the journey card is a server
component, so no new client code.

**Done when.**
- A pass holder sees journey cards on the four surfaces, in every state they draw.
- Classic readers see today's cards.
- Parity shows 0 differences.

### WP11 — The drives (M; depends on WP8, WP9, WP10)

**Goal.** Measure in a real browser what no source check can see:
- the How-to card above the fold, and card 1's buttons above the tab bar;
- no layout shift;
- what each reader sees;
- that production carries no journey trace.

Every drive's red control plants in the page only, never in a repo file. That is these drives' in-process twin.

**Files.**
- scripts/qa-journey-above-fold.mjs (new) and scripts/live/journey-above-fold.mjs (new; the rules, shared with the
  red control)
- scripts/qa-journey-home.mjs (new)
- scripts/cls-budget.mjs (gains `--journey`)
- scripts/pre-deploy-live-check.mjs ([E2])
- package.json: `qa:journey-above-fold` and `qa:journey-home` (new)
- docs/VODACOM-PLAN.md: the §1 S7 row (:2047) and the §5 S7 entry (:3035) now name `qa:journey-above-fold`, in the
  commit that adds the key (test:docs); §0j.

**Steps.**
1. **qa:journey-above-fold** (Correction 12). It runs locally only, behind journey-pass.mjs's `premise`.
   - **The matrix:**
     - viewports: 360×640, 360×740 (V15 re-pointed, :2918) and 390×844;
     - sw/en/zh × guest and signed in;
     - two bar states: the ordinary bars (the preview marker only) and all bars up (the marker plus the announcement,
       plus the session-ended notice for a guest or the away summary for a signed-in reader).
   - **The book:**
     - card 1 with a full title in one variant, because S2's backfill is not approved on production (:2041);
     - card 1 with a 56-code-point short title (short-title.ts:36) in another.
   - **The wait:** wait for `[data-testid=journey-tabs]` to be visible. The rail hydrates one chunk late (:446-451). A
     cell with no rail is INVALID, never a PASS.
   - **The rules:**
     - the How-to card is the first journey element in main, and its bottom is at or above the rail's top;
     - the bottom of card 1's picks is at or above the rail's top;
     - the h1 is exactly two lines.

     The pass rule follows Open point 24.
   - **The red control:** `--prove-red` is the default and plants in the page only (`route.fulfill` CSS or
     `addStyleTag`). Each of these must fail its rule:
     - a 300px How-to card;
     - card 1 pushed down 200px;
     - the rail removed (reported INVALID).
2. **qa:cls-budget `--journey`.**
   - **The budget:** the same (0.05 per route, 0.02 per shift, cls-budget.mjs:57-58).
   - **Where:** locally only, with a pass, on `/`, `/live`, `/results` and `/watchlist` (signed in), guest and signed
     in, sw at 360×780.
   - **The control:** RED_SHELL must fail in journey mode too.
   - **The classic mode** is unchanged and still defaults to production.
3. **qa:journey-home: tiles, read one by one.**
   - **The home's states:**
     - priced, closes today, empty pool, one side, over the cap, legacy, a full title clamped;
     - the chips scrolled, an empty category, a q line and a q miss;
     - the end of page 1 with Onyesha zaidi;
     - 3 columns at 1280.
   - **The How-to sheet** in sw/en/zh at 320×640, 360×640, 390×844 and 1280. Its exits must be reachable without
     scrolling.
   - **The other routes' cards:** selection closed; settled YES, NO and VOID; Up & Down.
   - **The ghost against the landed page.** Hold the RSC response — the response, never the request. The How-to card,
     headline, chips and card 1 must land within ±2px of the ghost. qa:cls-budget cannot see a skeleton swap
     (cls-budget.mjs:32-36).
   - **The redirect cells:**
     - a document gets a 307 and the table's Location;
     - a flight lands on the target;
     - a classic document gets 200 and the board.
   - **The controls:** a reader with no pass gets today's `/`, `/markets`, `/live`, `/results` and `/watchlist`, with
     no journey trace.
4. **qa:live [E2].**
   - PREVIEW_TESTIDS stays as it is (pre-deploy-live-check.mjs:344).
   - A second list holds S7's journey test ids (`journey-home`, `journey-card`, `journey-howto-card`,
     `journey-howto-sheet`). They must be absent for a signed-out visitor.
   - The routes checked: JOURNEY_PUBLIC_ROUTES gains `/live` and `/results` beside `/` and `/markets`.
   - With a control.
   - `/markets` must still answer 200 with the board for a classic visitor.

**Gates.**
- Each drive's own red control
- test:orphans
- test:docs

**Served bytes for a classic viewer.** None (drives only).

**Done when.**
- Each drive's red control fails its plant.
- The clean matrices pass as Open point 24 rules.
- The tiles have been read.

### WP12 — Proof, records, merge, deploy (M; depends on all)

**Goal.** Prove S7 against its promise, ship it behind the flag, and close the records.

**Steps.**
1. **The battery,** under the lock, detached:
   - `test:all -- --skip responsive,motion`;
   - test:red-anchors;
   - every in-process red: journey-home, markets-redirect, journey-shell, journey-account, simple-journey-flag,
     journey-sheet, hero-copy;
   - every file-mutating red S7 touched: red:featured-card, red:one-sided, red:ticker-honesty, red:filter-language,
     red:measure, red:marketing-optout. Run each alone, after committing, then `git diff --exit-code`.
2. **Parity v3:** `--prove-red`, then `--compare` against WP1's baseline. 0 differences in every cell.
3. **A local production build,** read by WP6c's `first-load-parts.py` and `first-load.py`:
   - classic `/`'s initial scripts carry the home lazy module's small chunk, and none of the How-to card's, the sheet's
     or the journey card's markers;
   - `/live`, `/results`, `/watchlist` and `/markets/<id>` keep their initial scripts.

   Also the served-HTML skeleton compare (a null pair first) on `/`, signed out and signed in.
4. **The drives (WP11)** are green, and their tiles have been read.
5. **An adversarial refute-and-mutate review** of the applied change before its commit (Ali's standing rule; S6's
   practice).
6. **Merge, push and verify.**
   - The deploy commit: `/api/health` against origin/main, and `?dpl=`.
   - `qa:live` on production, with [E2] extended.
   - `qa:cls-budget` on production in classic mode: `/,/markets,/results,/live`.
   - Production read as a guest by the chunks check: no journey card or How-to code in a classic page's initial
     scripts.
7. **Records:**
   - §0j as built, with each package's served bytes;
   - §1 S7 row;
   - SHELVED rows;
   - LANDING-TEN §0 item 4: the landing is shelved for journey readers (R18);
   - the MOBILE-VISUAL U16/U18 bullets (already re-targeted; check them);
   - memory.

**Done when (S7), as proposed in Open point 2:**
- On a local in-memory server through a real staff pass, the deck's home renders in sw/en/zh from 320 to 1280.
- qa:journey-above-fold, qa:cls-budget `--journey` and qa:journey-home are green.
- Parity v3 shows 0 differences.
- Production proves nothing changed for players.

"Staff see the deck's home on production" waits for S14 (§0h point 4). Only then is S7 ✅.

## New dictionary keys (journey.*)

### From the §3 table

sw is binding and en is the deck's own.

| Key | sw | en | zh (draft) |
|---|---|---|---|
| `howToCardTitle` | Jinsi ya kucheza | How to play | 玩法说明 |
| `howToCardMeta` | Hatua {steps} · dakika {minutes} | {steps} steps · {minutes} min | {steps} 步 · {minutes} 分钟 |
| `headlineAsk` | Jibu swali. | Answer the question. | 回答问题。 |
| `headlineSides` | {yes} au {no}. | {yes} or {no}. | {yes}还是{no}。 |
| `cardWin` | Shinda ≈{mult}× dau | Win ≈{mult}× your bet | 赢 ≈{mult}× 投注 |
| `showMore` | Onyesha zaidi | Show more | 显示更多 |
| `howToTitle` | Jinsi ya kucheza | How to play | 玩法说明 |
| `howStep1Title` … `howStep3Body`, `howExampleLabel`, `howExampleBody`, `howCta`, `howHelplineLabel` | as §3 :2119-2128 | as §3 | as §3 |
| `estimateNote` (shared with S8) | as §3 :2101 | as §3 | as §3 |

### S7 drafts

sw is the canvas's approved word where one is drawn (S4-COPY-AUDIT.md:226). The rest are Claude's drafts for the
review.

| Key | sw | en | zh (draft) |
|---|---|---|---|
| `cardBeFirst` | Kuwa wa kwanza | Be the first | 抢先下注 |
| `cardOverCap` | Upande mdogo, ona makadirio | Small side, see the estimate | 冷门一方，请查看预估 |
| `cardThin` | Faida ndogo · ≈{mult}× | Small gain · ≈{mult}× | 收益很小 · ≈{mult}× |
| `cardResultLabel` | Matokeo | Result | 结果 |
| `similarTitle` | Maswali yanayofanana | Similar questions | 相似问题 |
| `homeChipsAria` | Aina za maswali | Question topics | 问题类别 |
| `homeEmptyCatTitle` | {cat}: hakuna maswali wazi kwa sasa | {cat}: no open questions right now | {cat}：目前没有开放的问题 |
| `homeEmptyTitle` | Hakuna maswali wazi kwa sasa | No open questions right now | 目前没有开放的问题 |
| `homeEmptyBody` | Maswali mapya yataonekana hapa yakichapishwa. | New questions appear here when they are published. | 新问题发布后会显示在这里。 |
| `homeEmptyAll` | Onyesha maswali yote | Show all questions | 显示全部问题 |
| `homeQueryLine` | Unatafuta: “{q}” | Searching for “{q}” | 正在搜索“{q}” |
| `homeQueryNone` | Hakuna swali linalolingana na “{q}” | No question matches “{q}” | 没有与“{q}”匹配的问题 |
| `howStepsAria` | Hatua | Steps | 步骤 |
| `hubSearchPlaceholder` | Tafuta swali | Search questions | 搜索问题 |

### Not added

`cardWinOver` is not added: the panel's rule replaced it on cards (Correction 9).

## Risks

1. **A dirty base.** A8h's uncommitted edits sit in 16 files, including app-shell.tsx, shell-lazy.tsx and the parity
   harness. `git add -A` would sweep them into an S7 commit, and the harness hashes uncommitted served files
   (qa-classic-shell-parity.mjs:158-173). Mitigation:
   - WP0's precondition;
   - staging by path;
   - `git diff --cached --stat` before every commit.
2. **The route file's exports.** If `metadata` or `dynamic` leave `page.tsx`, `/` loses its canonical and og tags and
   force-dynamic (page.tsx:34, :47-56; layout.tsx:91-99). Pinned by journey-home §1 and parity v3's head capture.
3. **Silent gate re-points.**
   - hero-copy's `?? ""` (:103) reads a wrong path as "no rails".
   - product-line's `if (!src) continue` (:231-233) checks nothing for a missing file.
   - WP2 and WP7 add presence controls.
4. **Red anchors resolve exactly once.**
   - They target the four pages WP10 and WP9 edit (anchors/*.mjs).
   - A re-indented or duplicated anchored line breaks test:red-anchors, which is not in predeploy.
   - Use same-slot ternaries without re-indenting, and run test:red-anchors after every page package.
5. **Classic first-load JS.** Any static import of a "use client" module into `/`'s server graph joins every classic
   visitor's first load (§0h point 20).
   - Only `home-lazy.tsx` may carry client parts to `/`.
   - WP12's production-build read is the only proof (journey-shell §12 cannot see chunking).
6. **The ticker.**
   - Through `useJourneyOn`, a 32px in-flow strip would paint and then drop (live-ticker.tsx:127, :170;
     journey-on.ts:48-51).
   - 11.5's exact regex must be re-pinned in the open (ticker-honesty.test.mts:270), never loosened in silence.
7. **The all-bars-up budget at 360×640.** It is probably unreachable. By the arithmetic: three bars at ≥69px each, plus
   the marker, against about 111px of slack (Corrections 13 and 17; Open point 24). WP0 measures before WP7 builds.
8. **The rail hydrates a chunk late** (VODACOM-PLAN.md:446-451). A measurement taken before `journey-tabs` is visible
   passes vacuously.
9. **qa:cls-budget cannot see a skeleton swap,** and it runs with reduced motion (cls-budget.mjs:21-36). The ghost's
   geometry needs qa:journey-home's held-response check.
10. **The 307 lives in the root layout.**
    - On a flight it would blank the page (app-shell.tsx:98-107), so it is document-only, pinned, with a plant.
    - `redirect()` needs `as never` under typedRoutes (:135).
11. **Mostly full titles on production.** The short titles are mostly unapproved (the S2 backfill waits, :2041), so
    production cards show clamped full titles. The above-fold matrix measures full titles too.
12. **Up & Down rows reach `/live`, `/watchlist` and `/results`.** `cardEstimate` returns null for them
    (estimate.ts:124). A card that assumed MARKET-only would price or mislink them.
13. **Density leaks** through `.mcardp` and `.market-grid` on phones (globals.css:6908-6920). The journey card uses
    neither.
14. **The stretched link covers the card.** A pick row that is not raised above it would make a tap on NDIO open the
    market page. Keep it on the local plane (z ≤ 10, stacking-contract.test.mts:690).
15. **Dictionary changes.** Any change turns house-bot-disclosure 5.1 red by construction (S6-PLAN.md:124). Record it;
    do not fix it.
16. **Tailwind scans comments.** New files' comments must carry no class-shaped strings, and the moved 50-line comment
    moves verbatim. The Edit tool can write JSON escapes as control characters, and Git Bash heredocs eat backslashes
    (test:source-bytes catches both). Build regex backslashes with `chr(92)`.
17. **The page and the shell can disagree mid-visit** after a pass expires (journey-preview.ts:244-246). LegacyLanding
    could then render inside the journey shell until the next refresh. The page's own answer is the authority; the 30s
    refresh realigns them.
18. **journey-shell §9 over-counts.** LegacyLanding's literals count as journey entrances for `/` (S6-PLAN.md:1793-1798),
    so a door the journey home drops is invisible there. Only the tiles prove what a reader sees.
19. **The Modal has no height cap.** Without the panel's cap, the sheet's top would be unreachable on a 640-tall phone
    (first-visit-primer.tsx:369-389). Measure at 320×640 and 360×640.
20. **Heavy Node crashes this laptop.** One heavy job at a time through `~/heavy-node-lock.sh`. Red harnesses run
    detached and alone. Never run `red:all` against a dev server (S6-PLAN A6), and never `timeout` a lock run.
21. **The funnel.**
    - Preview traffic is "off" (app-shell.tsx:360), and `from=home` keeps the old journey's meaning.
    - S7 sends no `variant=new` sheet event, because there is no sheet yet. The agency's "Home → sheet" measure starts
      at S8.
22. **S6's own owed items stay owed** unless WP12 did them: the qa:journey-shell tiles (WP6b item 5) and the
    mid-visit switch drive. S7's qa:journey-home does not replace them.

## Open points → §0h

Each is a call the coordinator makes, recorded as a numbered §0h point, with its overrule.

1. **S7 starts only after S6 closes:** A8h committed and proved, and WP12 done. Overrule: start S7 on A8h's commit
   before WP12, recorded with its reason.
2. **S7 is ✅ on local drives through a staff pass, plus production proving "nothing changed for players".** "Staff see
   the deck's home on production" moves to S14 with S1's press (§0h point 4). Overrule: Ali turns his preview on and
   checks the home on production at S7's close.
3. **The journey card is its own server component** (`JourneyCard`, its settled state inside it), not a
   `MarketCard variant="journey"` as §2 (:2450) and B9's letter say. The reasons:
   - the classic card's chunk, its 11 anchors and its 20 raw readers stay untouched;
   - density cannot reach the journey card;
   - the classic card shelves whole, at its own path, at S16.

   Overrule: build the variant inside `market-card.tsx`. Classic card pages' JS then changes, and featured-card
   3.0/3.3 and one-sided 2.4 move.
4. **S7's NDIO/HAPANA are real server-rendered links to today's destination:** `/markets/<id>?side=YES|NO`, with
   `&from=home` on the home. There is no `go()` in S7. The in-place sheet, the `?bet=` pushState, the press-pop replay
   and SJ-9's "never navigate" land in S8 on the same anchors. The reasons:
   - no sheet exists;
   - a placeholder would be a dead tap;
   - links keep the card free of client code, and a tap works before hydration;
   - CLAUDE.md's side-locked rule (:865-884) and the agency's `?side=` link hold until the flip.

   Overrule: pull BetSheetHost into S7.
5. **No SSE odds patch in S7.** The event carries no pools (event-bus.ts:35); the 30s RefreshPoller is enough for a
   staff preview. Overrule: extend the event with pools, a payload change for every signed-in viewer.
6. **Over the cap the card says "Upande mdogo, ona makadirio", with no number.** A thin side (`lean === "thin"`, below
   1.05×, payout.ts:128) says "Faida ndogo · ≈{mult}×" (the panel's amended SJ-1, §0h point 2). `cardWinOver` is not
   added. Overrule: "Shinda zaidi ya {cap}× dau".
7. **A one-sided journey card keeps L22's refund sentence,** one line under the picks (v4 L22: "on every one-sided
   card"). This departs from the canvas. Overrule: drop it, so the S8 sheet alone carries it.
8. **An empty own side says the new short key `journey.cardBeFirst` ("Kuwa wa kwanza",** §0g item 11).
   `market.beFirst` stays on the market page. Overrule: reuse `beFirst`, which wraps at every width.
9. **Up & Down rows on `/live`, `/watchlist` and `/results` get the journey card** in their own words, with no figure,
   linking to their round. Overrule: journey `/live` lists questions only, and rounds stay under Juu/Chini.
10. **Only the cards swap.** `/live` keeps its hero carousel and explainer, and `/results` keeps its notable carousel.
    Overrule: drop them for journey readers.
11. **`/live`, `/results` and `/watchlist` stay out of `isJourneySurface` in S7,** so the Needle, the panel and the chat
    bubble stay. Overrule: add them, which moves journey-shell §2's DENY pins.
12. **"Onyesha zaidi" is cumulative:** `?page=n` shows the first 12·n cards, and the scroll position is kept. The deck
    has no "previous". Overrule: a pager that shows only cards 12(n−1)+1 to 12n.
13. **The `/markets` 307 is AppShell's, for documents only, plus a page-level redirect for flights.** The param rules
    are WP3's table, which adds `utm_id`, `gbraid` and `wbraid` (GA's list) to §3.2's keep-list and carries `cat` and
    `q` to `/watchlist`. Overrule: a page-level redirect only, which gives HTTP 200 and a meta refresh on a document.
14. **Tafuta becomes a search field inside Akaunti that submits `/?q=`,** and the journey home shows the query with
    "Futa utafutaji". Overrule: Tafuta links to `/`, with no search for journey readers until S15.
15. **`markets/loading.tsx` picks its ghost on the server,** so a journey reader gets the home's ghost (§0h point 21's
    pattern). Overrule: keep today's ghost, and accept a flash of the board on a soft hop.
16. **The LIVE strip is gated by a server prop passed only on a journey request,** not by `useJourneyOn` (§3.2's
    wording). The journey list is S16's `["/live","/results"]`. Overrule: the client hook, with a 32px shift on every
    journey load of `/`.
17. **The old primer stands down for a journey reader on every route** (`journeyOn` alone). Overrule: S6's overlay
    term, on journey surfaces only.
18. **`primer-keys.ts` and the `50pick-howto-seen` key move to S11,** with the auto-open that reads them. S7 writes
    nothing to storage, so Privacy §7 is unchanged in S7. Overrule: write the seen key in S7, with Privacy §7, a version
    bump and a COMPLIANCE entry in the same commit.
19. **The How-to card is a button that opens the sheet in place,** with no URL. `/?howto=1` is S11's. Overrule: push
    `?howto=1`, as the bet sheet will push `?bet=`.
20. **The sheet:**
    - the kit Modal, 440 wide on desktop;
    - a grab handle with no drag;
    - the kit's 48px ✕;
    - MFANO as the kit `Callout tone="info"`;
    - the CTA and links pinned, with only the steps and MFANO scrolling under a fade when the cap bites.

    Overrule any of: whole-panel scroll (§3.8's sizing line), the canvas's 480 width and royal ✕, or a glyph-less
    royal box.
21. **MFANO's `{pct}` and figures come from HOW_TO_EXAMPLE's fixed 13%** (SJ-21 requires "TZS 1,000 → ≈2.7× → TZS
    2,700"). Overrule: the live default rates, after which the deck's figures hold only at 13%.
22. **Copy: the §3 table wins where the canvas's en/zh differ.** The helpline label is the deck's "Msaada", beside the
    number. Overrule: the canvas wording, or `footer.helpline` "Simu ya msaada".
23. **The above-fold gate is named `qa:journey-above-fold`.** Overrule: keep a `test:*` key, which then has to be added
    to every serverless battery's `--skip`.
24. **"All bars up" means** the marker plus the announcement plus the session-ended notice (guest) or the away summary
    (signed in).
    - The How-to card must be above the fold in every cell.
    - Card 1's buttons must end above the tab bar in every cell except 360×640 with all bars up. That cell is measured
      and recorded.

    Overrule: require it there too. Then the transient bars must be compacted on phones, which is a change to S6's and
    classic bars.
25. **The journey home keeps the root `<title>`;** the static `metadata` is untouched. Overrule: "Maswali" through
    `generateMetadata`, measured byte-identical for classic readers first.
26. **The home on a break** (s4-3-home-break, approved words) **is built in S8,** with the sheet's block states.
    Overrule: build it in S7, reading the RG until-date on the page.
27. **The classic body is proved by parity v3:** body captures and a seeded book, with the baseline at WP1's commit.
    Overrule: a tracked served-HTML compare instead.
28. **The lost-chunk guard is lifted into one shared module in S7** if S6 WP12 has not done it, and the two older
    next/dynamic files adopt it in their own commit, for every player. Overrule: home parts without the guard, so a lost
    chunk falls to `/`'s error page.
29. **The settled card's time is `settledAt ?? resolutionAt`,** formatted by the platform's day-time formatter: English
    months until S12's locale lane. Overrule: `resolutionAt` only.
30. **The landing-v3 browser gates keep running against classic `/` until the flip.** `qa:landing-v3:*` and
    `qa:ghost-landing` are split into park and keep at S15/S16. Overrule: split them in WP2.

## ⭐ Amendments (the coordinator, 2026-10-07) — these override everything above

Filed 2026-10-07 from the draft of 2026-10-04 (above, unchanged) after: an adversarial critique of that draft (21 findings,
8 major and 13 minor — every one taken, most of them modified), a drift check of every file and line the draft names
against origin/main `7d4b0ad5`, and two adversarial reviews of these amendments (21 problems and 10 omissions found and
fixed). Where an amendment and the body disagree, the amendment wins. The calls taken under Ali's delegation are listed
at the end ("Points for Ali"); VODACOM-PLAN §0h point 58 carries them.

**When S7 may start.** S7 may start only when S6 has closed, and each part of that is checked on main, never assumed (A2). Four things must hold. (1) A8i is live: 23f762f4, read back in cd34231b, which already holds on origin/main 7d4b0ad5. (2) A8i-2 and A8j, the two live money fixes for every player that cd34231b put first (VODACOM-PLAN.md:43, :256), are merged to main, each deploy is read back from ?dpl=, and their §0i and §1 rows are ticked. A8i-2 reworks the kit Modal's dialog stack (focus never goes behind the top dialog, and one Escape closes the top dialog only), and the How-to sheet is built on that Modal. (3) The owed A8d/A8g/A8h proof has run (§0i :252-256), including parity compare 2 after the copy that 5a87e764 landed. (4) S6 WP12 is done, with its v2 qa:classic-shell-parity --compare (S6-PLAN.md:924) recorded in §0i. S7 then branches from origin/main at that close commit, in a worktree whose src/, scripts/, docs/ and package.json are clean. It never builds on an S6 branch, and never in a tree that holds another lane's uncommitted work. WP0 re-reads every line number and re-derives today's reds (A3, A4). These include red:simple-journey-flag, red since 9b21bae9, and red:ticker-honesty, which 7d4b0ad5 re-armed, so WP0 confirms its 28/28. The draft's overrule, 'start on A8h's commit before WP12', is withdrawn: A8h has been on main since 2e3ea161, and A8i is live. Ali may choose a narrower overrule: start on origin/main once (1) and (2) hold (A8i-2 and A8j merged and read back), before (3) and (4). In that case only WP0 runs: the docs commit with the §0h points (numbered after S6's last, 57 today, and rebased onto main last, just before its push), the reds, the scripts-only harness repairs and the bar measurements (A2-A7). WP1 waits until §0i records S6's last two v2 compares, because parity v3's VERSION 3 refuses every v2 baseline (qa-classic-shell-parity.mjs:211, :907-908 at 7d4b0ad5). WP1 then edits the harness exactly as S6 leaves it (5a87e764 included, nothing re-derived), captures its v3 baseline on a tree that holds S6's final commits, and captures it again into a new file after any rebase.

### A1 · Base and citations: every line number re-read at origin/main 7d4b0ad5, and the Corrections that changed

*Overrides:* The header note (draft :3-15); every file:line citation listed below in the Summary, Corrections 1-23, WP0-WP12, Risks and Open points; the content of Corrections 2, 4, 6 (first bullet), 9, 10, 12, 14 and 16.

1. Header. Replace the cb83746b note with: 'Line numbers are at origin/main 7d4b0ad5 (2026-10-07 00:30 EAT), re-read 2026-10-07. §5 S7 is docs/VODACOM-PLAN.md:3123-3127. Since 85866b36, main gained 783b652c (marketing docs only), 23f762f4 (S6 A8i, live), cd34231b (A8i's records: §0, §0i, §0h point 57, DESIGN_AUTHORITY §A rule 8 and S6-PLAN's as-built note), 5a87e764 (the parity harness: A8d's and A8g's measured Sell layouts, and React's DEV-only measure error filed), 95d15927 (the ticket's opened line: [id]/page.tsx and position-card.tsx) and 7d4b0ad5 (the ticker re-arm).
A number read at 85866b36 converts as follows:
- VODACOM-PLAN.md: unchanged to :28; +1 at :29; §0 :30-51 rewritten as :31-41; −10 from :52 to :1120; +28 from :1121 to :1625; +38 from :1626.
- package.json: +2 from :46; +3 from :834.
- qa-classic-shell-parity.mjs: +13 from :100; +5 from :302; +7 from :765; +8 from :1168; +15 from :1489; +16 from :1511; +18 from :1691.
- ticker-honesty.test.mts: +7 from :216; +11 from :224. ticker-honesty-red.mjs: +2 from :92; +3 from :100.
- src/app/markets/[id]/page.tsx: +2 from :906. modal.tsx: +1 from :11; +2 from :34; +7 from :285.
- S6-PLAN.md: +9 from :1774. DESIGN_AUTHORITY.md: +10 from :1456.
There are no uncommitted edits to allow for. A8d+A8g is 315a3ae5 (cb83746b was its pre-rebase copy), A8h is 2e3ea161 with its records in c5fbc2d1, and A8i landed squashed as 23f762f4 (its branch commits 44924afc and 51c6f319 are not on main). A8i-2, A8j, the owed A8 proof and WP12 will move §0, §0i, §0h and package.json again before S7 starts, so re-read every number at S7's start (A2). If origin/main has moved past 7d4b0ad5 when these amendments are filed, apply the offsets from `git diff -U0 7d4b0ad5 origin/main`. Cite package.json keys by name, not by line.'
2. Summary.
- simple-journey-flag.test.mts:640-645 (10.census.read :641-642, .write :643, .decide :644-645).
- §3.2's 'first commit of S7' is VODACOM-PLAN.md:2650-2651, and the WP7 lesson is :420 and :436-437.
- Today's `<LiveTicker events={tickerEvents} />` is app-shell.tsx:462.
- The bet-sheet ripple row is :2992, and S8 is :3129-3131 (src/ still has no BetSheetHost).
- §0h point 4 is :1167-1169.
- The section 'What does change for a classic visitor' is replaced by A23 item 6.
3. Corrections.
- C1: §0h :1150 (its last point today is 57, :1654-1663); board S7 row :2134 (still ⬜); §3 table :2158-2215; SJ-1…SJ-9 :2350-2394; §2 build map :2526-2558; §3.1 :2564-2646; §3.2 :2648-2694; §3.8 :2903-2928; privacy line :2979-2980; ripple map :2984-3014; §5 S7 :3123-3127; S16 :3189-3202.
- C2: predeploy is package.json:375. Besides test:simple-journey-flag, it runs SIX journey suites: journey-estimate, -sheet, -funnel, -shell, -account and -tickets. Since 23f762f4 it also runs test:enter-where-pressed. Still outside it: test:hero-copy, test:landing-mine, test:product-line, test:route-census, test:popup-fit, test:timer-date and test:red-anchors.
- C3: red:ticker-honesty, red:one-sided and red:featured-card (package.json:878, :883 and :885). How each red runs is A3 item 4.
- C4: the ripple Home row is :2990. ticker-honesty §11 reads app-shell (ticker-honesty.test.mts:273), live-ticker (:280), ticker.ts (:308) and globals.css (11.8, :315), never page.tsx. 11.5's exact regex is :281. WP2's Files read 'the ripple Home row (:2990)'.
- C6, first bullet: the cookie plant is simple-journey-flag.test.mts:854, but the twin as a whole is red on main (A3 item 3).
- C8: SJ-7 is :2384-2387 (filter-language §0.4 is still :392).
- C9: FOUR places still say 'Shinda zaidi ya {cap}× dau': the §3 row journey.cardWinOver (:2179), SJ-1's own text in the plan (:2356-2357), INHERIT-MANIFEST.md:52 and S4-COPY-AUDIT.md:23. The panel's amendment is :1841-1843, and §0h point 2 is :1158-1160. WP4 step 3 corrects all four.
- C10: the E-381 branch is app-shell.tsx:132-137. Its redirect is at :137, and since 9b21bae9 its next-path test is isSafePath (:134). The flight hazard is :99-108. 10.no.grant is simple-journey-flag.test.mts:646-648. The /account measurement is qa-classic-shell-parity.mjs:258-266 (EXPECTED_DIFFS 'account-streams-200').
- C11: §3.2 :2665 (the patch moves to S8, A7).
- C12: test:all collects every test:* at test-all.mjs:72-75 and names its two server suites at :44-48. Since 403324ec it runs suites concurrently by default (A3 item 1).
- C13: E-381 is app-shell.tsx:132-138; the session-ended NoticeBar is :405-419; AwaySummaryBar is :446-452; PreviewMarker is :390; §3.2's bar list is :2655. C13's '≥69px per bar' is struck (A5).
- C14: §3.8's '24 QA drivers' is :2908. On 2026-10-07 (7d4b0ad5), 34 scripts name 50pick-primer-seen (33 set it, and verify-s1-visual removes it), 3 use ?primer=1, and none uses kp-primer-force. Re-count when WP8 touches the primer.
- C15: void (A6).
- C16: the A8 bullet is VODACOM-PLAN.md:182-202. Since 95d15927, the holder block's SellButton is [id]/page.tsx:911-925 (freeUntil :917). The two Countdowns stay at :836 and :844.
- C18: landing-hero.tsx:342-349 (YES :343, NO :346).
- C20: §0h point 7 is :1174-1175. C20's content is replaced by A15.
4. WP0. The journey header is globals.css:6370. The rail is :6258-6263 (its 1px border) and :6288-6298 (the 64px slot).
5. WP3-WP7.
- VODACOM-PLAN.md: SJ-6/SJ-7 :2377-2387; S16's ticker list :3199; the S3 goldens :2580-2581; §3.9 :2935-2936; §3.8's order :2910 and its helpline line :2914 (A6); §2 rows :2534, :2535, :2537, :2552 and :2553; §0g item 11 :1727-1733; WP6c owed (8) :530-533; the WP6c finding :464-465; §0g item 7 :1704-1706; §0g sizing :1805-1808; A8h's served-bytes quote :1101 (bullet :1100-1105); §3.2's order :2653-2661, refresh :2665 and root loading :2666.
- i18n-dict.ts: the journey namespace opens at en :2872, sw :5255 and zh :7580. market.oneSideOnly is sw :3644, and market.oneSidedNote is sw :3646.
- globals.css: `.mcardp`'s stretched link :6790-6800; the phone density block :6880-6892; `.kp-jsheet__title` :6426.
- journey-shell.test.mts: LOST_GUARD :2181-2187; 12.module.dynamic :2242-2245; 12.module.lost :2250-2257; 12.parts.client :2258-2261; 12.nodefer.platform :2273-2275.
- journey-sheet.ts:58-59: :58 is the Up & Down / not-LIVE early return, and :59 is `bettable`.
- pending-bet.ts:96-98: CODE is :96, UTM_KEYS :97 and UTM_VALUE :98.
6. WP8-WP12, Risks and Open points.
- VODACOM-PLAN.md (draft → 7d4b0ad5): :2580-2581 → :2667-2668; :2833 → :2922; :381-383 → :420-422; :2591-2596 → :2678-2683; :2851-2852 → :2940-2941; :2296 → :2383; :2597-2600 → :2684-2687; the §1 S7 row :2047 → :2134; the §5 S7 entry :3035 → :3124; V15 :2918 → :3007; the S2 backfill :2041 → :2128; the rail hydrating late :446-451 → :485-490; the §3 How-to rows :2119-2128 → :2206-2215; estimateNote :2101 → :2188; the §2 Card row :2450 → :2537.
- app-shell.tsx: :458 → :462; :131-138 → :132-139; :98-136 → :99-137; :98-107 → :99-108; `as never` :135 → :136; funnelScopeValue :360 → :361.
- WP9's AppShell branch goes after app-shell.tsx:139 and adds no path-safety rule of its own. The E-381 block's isSafePath (src/lib/safe-next.ts:33) is the one rule test:pending-bet 6.one-rule guards (A11 item 5).
- src/app/markets/[id]/page.tsx: WP10's similar rail (draft :1039-1081) is :1042-1085 since 95d15927, with its grid at :1057-1083 (at 85866b36: :1040-1083).
- marketing-optout.test.mts: the overlay HIDE_ON check is :1002-1009 (OVERLAYS :995-999), and its plants are :1361-1388 (the primer's is :1387-1388). `(auth|admin|s)(` still resolves exactly once.
- stacking-contract.test.mts: the primer's checks are :807-826. WP0 renumbers them 8.1-8.5 (A3 item 2).
- Risk 13: globals.css:6880-6892.
- Risk 18: S6-PLAN.md:1802-1807 (draft :1793-1798).
- Open point 4: CLAUDE.md:866-885.

*From:* Drift items 3-4; 9-15; 33-34; 36-37; 39-41; 42-44; 62-64; 70; 90-102; 105-109; 110-111; 113-114; 115-121/331; 126-128 (the line only); 140; 142-146; 147-152; 153-154; 155-156; 157-163 (lines); 164-167; 170-173; 179-181; 183-184 (line); 223-231; 418-839 (21 VODACOM-PLAN cites); 523/539-540; 620-621/626-627/716-717; 680-681/697; 616; 424/458/472; 903-1379 (VODACOM-PLAN cites); 908-1363 (app-shell cites); 939-940; 1344; 1392. Second review: the A1 problem (main is 7d4b0ad5, five commits past 783b652c) and missing items 2, 4 and 9 (5a87e764, 95d15927, 7d4b0ad5, predeploy :375, point 57, the similar rail). Every number was re-based with each file's diff offsets and spot-read on 7d4b0ad5. Corrected on re-check: pending-bet.ts:96 is CODE, and UTM_KEYS and UTM_VALUE are :97-98, so A1 names all three.

### A2 · The start line: S6 closed (A8i-2 and A8j included), the base, and when parity v3 may replace v2

*Overrides:* WP0 step 1 (precondition) and its Done-when ('The tree is clean at S6's close'); WP1 steps 1 and 6 (when VERSION 3 lands; the commit its v3 baseline is captured at); WP6 Gates (adds test:enter-where-pressed); Risk 1 (rewritten); Risk 22 (S6's owed items); Open point 1 (decision and overrule).

Re-read 2026-10-07 at origin/main 7d4b0ad5.
1. S6 is closed only when all of these hold. Check each on main; never assume it.
(a) A8i is live: 23f762f4, read back in cd34231b (§0 :31-41; §0i 'A8i' :1111-1148). This holds today.
(a2) A8i-2 and A8j are merged to main, each deploy is read back from ?dpl=, and their §0i and §1 rows are ticked. cd34231b put these two S6 items first (§0 :43; §0i :256). Both are live money fixes for every player.
- A8i-2 changes the kit Modal: a second fresh Enter while a dialog drawn over another is leaving; a key held outside an open dialog and on a way out; and the dialog stack, where focus never goes behind the top dialog and one Escape closes the top dialog only (S6-PLAN.md:1779-1781; §0 :33-39).
- A8j covers Enter in the withdraw amount box and in the close-account phrase box (§0 :39-41).
(b) The owed A8d/A8g/A8h proof has run, including 'parity compare 2 after the copy' (§0i :252-256; A8h's own owed list :1105-1110). The copy itself landed in 5a87e764.
(c) S6 WP12 is done, including its v2 `qa:classic-shell-parity --compare` (S6-PLAN.md:924).
§0i records (b)'s compare 2 and (c)'s compare, each with its result and its baseline file.
2. The base.
- S7 builds on a branch cut from origin/main at S6's close, in a worktree where `git status --porcelain -- src scripts docs package.json` is empty.
- It never builds on an S6 branch (vodacom-a8i, or A8i-2's or A8j's), and never in a tree that holds another lane's uncommitted work.
- Stage files by path, never with `git add -A`. Read `git diff --cached --stat` before every commit, because the parity harness hashes uncommitted served files (qa-classic-shell-parity.mjs:171-185).
3. Parity v3. From VERSION 3 on (qa-classic-shell-parity.mjs:211), a v2 baseline is refused (:907-908). So WP1's VERSION 3 may be committed, pushed, or used for any S6 compare only after §0i records both v2 compares of item 1.
- WP1 edits the harness exactly as S6 leaves it, never an older copy. Today that is 5a87e764: A8d's and A8g's four measured Sell layouts, and React's DEV-only measure error, which is filed to a cell's devOnly list (its check 2.13 and control P.7d). Nothing is re-derived from a scratchpad. Any later S6 patch is included the same way.
- WP1's v3 baseline is captured at a commit whose tree holds S6's final commits. After any rebase, capture it again into a new file (S6-PLAN A18, :1852).
4. Under the overrule (Open point 1), S7 may start on origin/main once items 1(a) and 1(a2) hold (A8i-2 and A8j merged and read back), before (b) and (c). Until item 3's condition holds:
- only WP0 runs;
- WP0 names in §0j the S6 compares it waits on;
- WP1 does not start.
WP0 numbers its §0h points after S6's last one: 57 on 7d4b0ad5 (:1654-1663), and A8i-2 and A8j may add more. Its docs commit is rebased onto main last, just before its push, because S6's records move §0, §0i and §0h in the meantime.
The draft's overrule 'start on A8h's commit' is withdrawn: A8h is on main (2e3ea161), and A8i is live.
5. Risk 1 now reads: 'The base. A8i is live (23f762f4). The open dependency is A8i-2, which changes the kit Modal the How-to sheet is built on: the dialog stack (focus never goes behind the top dialog, and one Escape closes the top dialog only), and a second Enter while a dialog drawn over another is leaving (S6-PLAN.md:1779-1781). The sheet is already bound by DESIGN_AUTHORITY §A rule 8 (:1456-1465): no Enter listener on the window or the document, and the Modal's held-key rule. test:enter-where-pressed (in predeploy since 23f762f4) refuses such a listener anywhere in src/ (§2.1), and the How-to sheet adds none. S7 branches only after A8i-2 and A8j are merged and read back. So WP6 builds the sheet on the Modal as A8i-2 leaves it, and test:enter-where-pressed joins WP6's gates. The mitigation is unchanged: stage by path, and read `git diff --cached --stat` before every commit.'
6. Risk 22's list of S6's owed items gains items 1(a2) and 1(b). WP0 step 1's check and its Done-when read item 1 (item 4 under the overrule).

*From:* Critique 8; drift 207-212 (WP0 step 1), 1307-1312 (Risk 1), 1373-1374 (Open point 1, Risk 22). Second review: both A2 problems (A8i is live as 23f762f4; A8i-2 and A8j come first, cd34231b; 5a87e764 already landed the DEV-only patch; point 57) and missing items 2, 8 and 9.

### A3 · Today's reds, the battery on this laptop, and how each red harness runs

*Overrides:* WP0 step 2 and its Done-when ('Today's reds are named'); WP8 Gates (the test:stacking line and 'red:marketing-optout (alone)'); the test:red-anchors and test:orphans gate lines in WP9-WP12; WP12 step 1 (its command and red lists); Risk 4 (last bullet); Risk 20; Correction 3 (how the harnesses run); Correction 6, first bullet ('works on any page.tsx'). Adds a scripts-only commit to WP0 (the stacking renumber, with A4 item 2 and, if needed, item 3 below).

1. The battery on ALI-BLADE15 is `npm run test:all -- --serial --skip responsive,motion`, run under ~/heavy-node-lock.sh, detached and never piped. This applies to WP0 step 2, WP12 step 1 and Risk 20.
- Since 403324ec, test:all runs up to min(cores, 8) suites at once by default (scripts/test-all.mjs:12-33, :70). The lock serialises sessions, not test:all's own child processes.
- `--jobs 2` is allowed only after §0j records a run measured safe on this machine.
- `--skip` is an exact match, and it refuses a term that matches nothing (:79-97).
2. WP0 step 2 records every red in §0j by its full check label and its value, never by a number alone.
- It reads them against two records: §0i's baseline list (VODACOM-PLAN.md:203-212: 22 reds at 5a820b9c), and the latest battery on record, A8i's on 4093dc54 (:1128-1130). That battery ran test:all 444/461; its 17 reds were all on the baseline list, and five of the 22 were green. test:red-anchors showed only its two known anchors, and decomment's 24 carriers were main's own.
- Every later S7 run is read against that record label by label, never as a bare exit code.
- test:stacking exits 1 on main. Its z-order check '6.1 every root-plane z in src/ is a named rung' (stacking-contract.test.mts:725) fails on the LIVE strip's focus ring at z 11 (globals.css:1503), red since 2ab8830e.
- The same file prints a second, unrelated 6.1: '6.1 ⛔ the primer's RENDER guard tests SUPPRESS_ON, not only HIDE_ON' (:807). It also repeats 6.2 and 6.3 (:733 and :812, :740 and :813). So a primer regression would read as the known red.
- So WP0's scripts-only commit renumbers the primer block 8.1-8.5 (:807-826). 7.1-7.3 are already taken by needle.css's table (:763-777). Only the labels change; every check's body stays byte-identical. No doc or script names those five ids: the docs' 'stacking 6.1' is the z-order red.
- WP8's gate reads: 'the primer's 8.1-8.5 are green, and every other test:stacking check's verdict matches WP0's, label for label'. Under the overrule (no renumber), WP8, WP12 and §0j read the primer's checks by their full label text.
- The same label-by-label reading applies to test:red-anchors and test:orphans in WP9-WP12 and in Risk 4.
3. red:simple-journey-flag is red on main.
- Since 9b21bae9, its two email-bar plants (simple-journey-flag.test.mts:850, :852) replace `{emailVerifyState && !journeyShown && <EmailVerifyBanner`. app-shell.tsx:438 no longer holds that text: it now reads `{emailVerifyState && !journeyShown && !promoSuppressed && <EmailVerifyBanner`.
- Both plants print 'INCONCLUSIVE (plant did not apply)' (:909), and the twin exits 1 (:912).
- It is the sign-up lane's red, and WP0 records it as such.
- If it is still red when WP0 runs, S7 re-anchors the two plants on the current line in its own scripts-only commit, named in §0j and §0h. The twin must then catch every plant.
- Only after that does S7 read this twin, for WP8's and WP9's AppShell plants and in WP12.
4. How each red that S7 runs touches the repo (read from each harness at 7d4b0ad5):
- File-mutating: red:featured-card, red:one-sided, red:ticker-honesty, red:filter-language and red:timer-date (red-timer-date.mjs:51-53). Each writes the repo's own files, then restores them. Run each alone and detached, after committing, then run `git diff --exit-code`.
- Temp-copy: red:measure (measure-red.mjs:61-63), red:contrast (contrast-audit-red.mjs:51) and red:chat-availability (chat-availability-red.mjs:67). Each mutates a copy in the OS temp folder and writes nothing in the repo. They are heavy, so run each alone and detached.
- In-process (`--prove-red`): red:journey-home, red:markets-redirect, red:journey-shell, red:journey-account, red:journey-tickets, red:journey-sheet, red:simple-journey-flag, red:hero-copy, red:marketing-optout (marketing-optout.test.mts calls no writeFileSync) and red:enter-where-pressed (its census reads every dialog in src/, the How-to sheet included).
WP12 step 1 runs all three lists, plus qa:lost-chunk (A13) and the tools of A9. WP8's 'red:marketing-optout (alone)' becomes an in-process run.

*From:* Drift 126-128 (red:simple-journey-flag), 213-218 (WP0 step 2), 956/1040/1117/1224/1321-1322/1207 (test:stacking, test:red-anchors, test:orphans), 1222-1223 and 1360-1361 (--serial), 1227-1228 (red:marketing-optout). Corrected on re-check: measure-red works on a temp copy (measure-red.mjs:61-63). Second review: both A3 problems (the two 6.1 checks, renumbered 8.1-8.5 because 7.1-7.3 are taken). §0's old red list is gone from main, so the A8i run's record replaces it.

### A4 · red:ticker-honesty gives an exact verdict before and after S7 edits the ticker

*Overrides:* WP0 step 2 and Gates (a new precondition); WP3 Files, step 4, step 6 (the ticker-honesty tests) and Gates (the 'cases 9 and 10 … a known problem' exemption is struck); WP8 Files, step 2 and Gates; WP12 step 1; Correction 3 (red:ticker-honesty still mutates files, but its anchors become declared).

1. WP0 precondition.
- Main has carried the re-arm since 7d4b0ad5. 9.8 reads settledAmount itself; 9.9 holds every chargedFee call in platform-stats.ts to the poll's frozen rates; and cases 9 and 10 anchor on settledAmount's head and on the line after its fee call (ticker-honesty-red.mjs:87-104 at 7d4b0ad5).
- WP0 runs red:ticker-honesty alone and detached on the base, then runs `git diff --exit-code`, and records the verdict in §0j.
- It must print '28/28 real defects caught, each on its own assertion' (:303) and exit 0, with no ANCHOR FAIL (:264-267) and no WRONG REASON (:276-281).
- If it does not, WP0 stops and raises it in §0h. It is the ticker owners' red, and S7 never edits ticker.ts or live-ticker.tsx on a twin that cannot give a verdict.
- §0i :268-272 still calls the re-arm staged. Correcting that is S6's record, not S7's.
2. WP0's scripts-only commit declares the anchors and makes the verdict exact.
- Move the harness's CASES (ticker-honesty-red.mjs:30-232) to scripts/anchors/ticker-honesty.anchors.mjs as MUTATIONS entries. Each entry carries its name, file, from, to and the check id it must fail on.
- The harness imports them, as board-discovery-red.mjs:21 does, so test:red-anchors §3 checks that each anchor resolves exactly once.
- The verdict matches the whole check id. Today it is a substring test (`!r.out.includes(c.expect)`, :276), so an expected 11.2 is met by a failing 11.21 or 11.22, and an expected 1.1 by 11.1-control. It becomes: some failing line, trimmed, starts with '✗ <id> '. The gate prints '  ✗ ' followed by the label (ticker-honesty.test.mts:356-358), and every label starts with its id.
- A control runs before any case. A synthetic gate output that fails only 11.21 (or only 11.2j) does not satisfy an expected 11.2; one that fails 11.2 does.
- Re-derive §4's undeclared count before and after the move. It drops by one, so lower UNDECLARED_CEILING (red-anchors.test.mts:288) to the new count in the same commit (4.2, :325-327). Never raise it.
3. WP3 (ticker.ts).
- ticker.ts:116 (`  return TICKER_ROUTES.includes(p);`) stays byte-identical.
- The journey arm is one new line directly above it, after the trailing-slash line: `  if (journey) return JOURNEY_TICKER_ROUTES.includes(p);`. The signature gains `journey = false`.
- New check ids. 11.1j: true for /live and /results and their trailing-slash forms. 11.2j: false for /, /markets, /live/x, /results/x, /livex and every entry of the classic never-list.
- Two new declared cases, each expected on 11.2j: the journey line matching by prefix (`.some((r) => p.startsWith(r))`), and the journey line reading TICKER_ROUTES (ticker.ts:109) instead of JOURNEY_TICKER_ROUTES.
4. WP8 (live-ticker.tsx).
- live-ticker.tsx:127 becomes `  const shown = events.length > 0 && tickerShowsOn(pathname, journey);`.
- In the same commit, re-point the 11.5 case's from to that line. Its to stays `  const shown = events.length > 0;`.
- Add a declared case whose to is `  const shown = events.length > 0 && tickerShowsOn(pathname);` (the journey argument dropped), expected on 11.5. WP8 re-pins 11.5's regex (ticker-honesty.test.mts:281) to `tickerShowsOn(pathname, journey)`, so this plant fails it.
5. Gates in WP3, WP8 and WP12.
- red:ticker-honesty, run alone and detached, prints 'N/N real defects caught, each on its own assertion' and exits 0. N is the declared count: today's 28 plus S7's three. Then run `git diff --exit-code`.
- test:red-anchors §3 lists every ticker-honesty anchor as resolving exactly once.
- WP3's exemption for cases 9 and 10 is struck.

*From:* Critique 2; drift 502-503 (the WP3 gate). Second review: the three A4 problems (7d4b0ad5 landed the re-arm; the verdict was a substring match) and missing items 2 and 7.

### A5 · The above-the-fold budget comes from the product, and the drive raises every bar for real

*Overrides:* WP0 step 3 (the budget) and its Done-when; Correction 13 ('≥69px per bar'); Risk 7; Open point 24; WP7 step 2 (the PageContainer line) and step 3 (the ghost's padding); WP11 step 1 (matrix, bar states, pass rule and red control); VODACOM-PLAN §5 S7 :3124-3125 (amended in WP0's docs commit).

1. WP0 step 3 derives card 1's budget from the PRODUCT, not from the canvas.
- Measure on today's tree, at 360 and 390 × sw/en/zh:
  - the journey header (globals.css:6370);
  - each bar as the product draws it at that width: the preview marker; the announcement, raised through /admin/system as the seeded admin; the away summary, after a settlement while the player is away; and the session-ended notice, raised by item 4's method on a page that already polls, such as /live (app-shell.tsx:102-107);
  - the rail's top at 640, 740 and 844 tall.
- Compute the bottom of card 1's picks from:
  - PageContainer's 32px top: pad 'page' is `px-3 lg:px-6 py-6` (page-container.tsx:85-89, :106), and py-6 is 32px (tailwind.config.ts:219);
  - the How-to card (≥72);
  - the h1 at its rung's real line height;
  - the chips (44);
  - the card's meta (18), its title (title-sm, 24px lines, at one line and at two) and its picks (64, and the grown 74).
- Measure every figure and record it per cell in §0j, with how each bar was raised. Copy no figure from the draft or from this amendment.
- The WP0 probe may stay a scratchpad script, but §0j records its method, never its path. WP11's tracked drive re-measures every figure.
2. Strike Correction 13's '≥69px per bar' and Risk 7's arithmetic. At 360 and 390, the text's 14rem basis pushes a bar's action under its text (notice-bar.tsx:85-93), and the action is at least 44px tall (:190-191). So a bar with an action is about 95px or more. The preview marker has an action (preview-marker.tsx:14-28), and its en/sw line wraps to two lines. The announcement has only a dismiss, so it is about 57-61px. These are estimates; item 1's measurements replace them.
3. Before WP7, WP0 records one §0h point in three parts.
(a) Population. The matrix measures the post-flip page. In each cell the drive first asserts that `[data-testid=journey-preview-marker]` is present, and records its height in §0j. It then hides the marker with a page-only style (display: none) and measures. Figures taken with the marker on are recorded, never gated.
(b) Cells. One exported table in scripts/live/journey-above-fold.mjs, mirrored in §0j:
- GATED: the How-to card's bottom is at or above the rail's top in every cell. Card 1's picks end at or above the rail's top in every cell with no transient bar (360×640, 360×740, 390×844), and in the all-bars cells at 390×844 (guest and signed in).
- RECORDED (measured and reported, never PASS or FAIL): card 1 in the all-bars cells at 360×640 and 360×740.
- If WP0's figures put a GATED cell over the line, WP0 raises it in §0h before WP7. The options are compact journey bars, a shorter h1 rung, or moving the cell. A cell never moves to RECORDED silently.
- WP0's docs commit amends VODACOM-PLAN §5 S7 (:3124-3125) to name exactly these cells. It names the drive in words until WP11 adds its key (VODACOM-PLAN.md:63).
(c) Padding. The home keeps PageContainer's house padding (32px top), as S6's journey pages do (tickets-view.tsx:87, account/page.tsx:55). The canvas's 8px top (pick-1-home.dc.html:35) is recorded as a canvas deviation shared by every journey page. WP7 step 3's ghost uses the same padding.
4. WP11 step 1.
- The two bar states are 'no transient bar' and 'all bars up'. All bars up means the announcement plus the session-ended notice for a guest, or the announcement plus the away summary when signed in. In both states the marker is hidden as in (a).
- The pass rule reads (b)'s table, never a hard-coded exemption.
- Raise each expected bar the way WP0 does. A cell in which any expected bar is not visible is INVALID, never PASS.
- The guest session-ended notice, step by step:
  1. Sign the cell's player in.
  2. Displace the session with a second sign-in from another browser context.
  3. Trigger a REFRESH flight on the journey home: dispatch the `50pick:refresh` event its RefreshPoller listens for (refresh-poller.tsx:21, :56-60), or wait for the 30s tick. A soft hop does not raise the notice, because it does not re-render AppShell (the root segment is pruned, app-shell.tsx:95-97). A document load does not either, because it answers 307 (:137).
  4. Wait for `[data-testid=session-ended-notice]` while `[data-testid=journey-tabs]` stays visible.
- The red control gains a page-only plant that hides the session-ended notice in an all-bars guest cell. That cell must report INVALID.

*From:* Critique 10. Re-checked against AppShell: the adjudication's 'a soft hop through the Maswali tab' cannot raise the notice (app-shell.tsx:95-107), so the trigger is a refresh flight. Second review: the refresh-poller.tsx correction is taken (:21 and :56-60). tickets-view.tsx stays at :87, where its PageContainer is.

### A6 · No helpline on the How-to sheet (Ali's ruling of 2026-10-06)

*Overrides:* Correction 15; WP4 Files, step 1, Done-when and the 'New dictionary keys' row :1276 (howHelplineLabel); WP6 Goal (§3.8's order), step 4 item 5 ('The foot'), the Sizing line ('the foot (CTA and links)') and Gates (journey-home §5's helpline check); WP11 step 3 (the sheet's exits); Open point 20 ('links'); Open point 22 (its helpline half and its overrule); §0h point 10's helpline row (annotated).

The ruling is 0652f61f, recorded at docs/COMPLIANCE-DECISIONS.md:12-46. No player surface shows the helpline. :43-45 supersede every rule that published it to players, and :46 forbids restoring it. test:support-contact §15 (support-contact.test.mts:926-986) holds this in predeploy. So the How-to sheet shows no helpline.
1. WP6 step 4, the foot.
- One link only: 'Weka mipaka' (rg.setLimits), to /profile/responsible-gambling when signed in and to /legal/responsible-gambling when signed out.
- It is at least 44px tall and closes the sheet as it navigates.
- There is no tel: link, no HELPLINE() or HELPLINE_TEL() read (support-config.ts:234, :236), no helpline label or digits, and nothing in their place.
- The Sizing line reads 'the title row, the CTA and the limits link never scroll'.
2. WP4 adds no helpline key.
- journey.howHelplineLabel leaves 'New dictionary keys' (:1276) and is listed under 'Not added', beside cardWinOver.
- footer.helpline no longer exists (0652f61f deleted it in en, sw and zh), so Open point 22's old overrule is void.
- WP4's Done-when reads: '§3, §3.8, INHERIT-MANIFEST and COMPLIANCE-DECISIONS agree that no helpline appears on a player surface.'
3. WP0's docs commit corrects the plan text before anyone builds from it (lines at 7d4b0ad5).
- §3.8's order (VODACOM-PLAN.md:2910) ends at 'Weka mipaka'. Its helpline line (:2914) is struck.
- The §3 row journey.howHelplineLabel (:2215) is struck.
- §2 :2483 and :2501, and §0g :1705-1706 and :1807-1808, are annotated 'superseded on player surfaces by the owner ruling of 2026-10-06 (COMPLIANCE-DECISIONS)'.
- §0h point 10 (:1180-1182) gets a note: 'helpline row superseded 2026-10-06'.
- INHERIT-MANIFEST's frame-5 row (:28), SJ-24 (:76) and L10 (:94) get the same annotation, pointing at COMPLIANCE-DECISIONS. The ruling text is not rewritten: it is Ali's own word superseding them (:43-45), and a §0h point tells him.
- SJ-18's helpline line (INHERIT-MANIFEST.md:70; VODACOM-PLAN.md:2449-2451) and §0g item 9's 'small 18+ and helpline line' (:1711) belong to the focused deposit chrome. That is S9's work: §3.5 (:2786, its focused chrome :2813) and §5 S9 (:3133). Their annotation names S9 and §3.5.
4. Gates (WP6).
- journey-home §5 checks that the sheet's decommented source reads neither HELPLINE() nor HELPLINE_TEL(), holds no '0800', and renders no label whose English names a helpline. red:journey-home carries an in-memory plant that puts a `tel:${HELPLINE_TEL()}` link back.
- test:support-contact stays a WP6 gate: §15.1 (:961) and §15.2 (:963) stay green with the sheet in src/. Its own controls, §15.4 and §15.5, prove the detectors.
5. WP11 step 3. The sheet's exits are the kit ✕, the CTA and Weka mipaka. Each must be reachable without scrolling at 320×640, 360×640, 390×844 and 1280.
6. The canvas's helpline lines are not built.
- In S7: the sheet's (pick-5-how-to-play.dc.html:83, s4-7-howto-320.dc.html:42) and the home end's footer line (s4-3-home-end.dc.html:64). The footer is the platform's, and 0652f61f already cleared it.
- In S8: the home on a break's (s4-3-home-break.dc.html:33).
7. What becomes of the old text.
- Correction 15 is void.
- Open point 22 keeps only its copy half: the §3 table wins where the canvas's en or zh differ.
- Open point 20's 'CTA and links pinned' reads 'the CTA and the limits link pinned'.

*From:* Critique 18; drift 168-169 (Correction 15), 524-526/533 (WP4), 662/733-739/744/757-758/766 (WP6), 1276/1429-1441 (the key row, Open points 20 and 22). The two drift notes disagreed on the commit (WP0 or WP4) and on the manifest. Resolved: WP0's docs commit, with the manifest annotated, not rewritten. Second review: SJ-18's deposit chrome is S9's (§3.5), and §0g item 9's deposit helpline line is annotated with it.

### A7 · The SSE odds patch moves to S8, payload-free

*Overrides:* Summary 'Placed later' (the SSE bullet); Open point 5; WP7 step 2 item 8 ('There is no SSE patch'); VODACOM-PLAN §3.2 :2665 and the §5 S8 entry :3129-3131 (amended in WP0's docs commit).

1. The Summary's 'Placed later' bullet reads 'the SSE odds patch → S8 (Open point 5)'. Open point 5 is rewritten (the §0h point).
2. WP0's docs commit makes these changes together with the §0h points (lines at 7d4b0ad5):
- §3.2 :2665 becomes: '`RefreshPoller 30s` in S7; the SSE `market-odds` patch for visible cards lands in S8 with the sheet's SSE listener (§3.3 Live refresh, :2717-2718), payload-free'.
- The §5 S8 entry (:3129-3131) gains: 'the §3.2 card patch: when `50pick:sse:market-odds` names a journey card on screen, that card's figures are re-read from the server. They are never computed from yesPct, and the event's payload (event-bus.ts:35) is never widened. It comes with its own test and in-process plant.'
- §5 S7 stays '§3.2 in full', because §3.2 now places the patch in S8.
3. S7 adds no SSE listener.
- WP7 step 2 item 8's LazyRefreshPoller at 30s is the journey home's only refresh.
- journey-home §7 pins that no file under src/components/journey/home or src/components/journey/cards listens for `50pick:sse:market-odds` (use-event-stream.ts:14, :23). Its plant adds such a listener.
- event-bus.ts and use-event-stream.ts are untouched.
Why S8:
- The event carries { marketId, yesPct } only (event-bus.ts:35).
- No component listens to it today.
- The stream opens only for a session (app-shell.tsx:499; api/events/route.ts:41-48).
- §3.3's sheet already builds an SSE listener, where a refresh's load is sized together with the sheet's own 10s refetch.

*From:* Critique 13. Lines re-based on 7d4b0ad5.

### A8 · Parity v3: the book reaches every classic card state, and the trace sees S7's class names

*Overrides:* WP1 step 2 (the BOOK phase: its doors, order, parameters and premise); WP1 step 5 (new plants) and the harness's live trace selector; WP1 step 6 (the baseline is captured only after both).

Why the book needs a bigger pool.
- The in-memory market store starts empty (market-dal.ts:108), and the harness seeds only seed-real-markets' six questions (seed-real-markets/route.ts:21-28; qa-classic-shell-parity.mjs:1045 at 7d4b0ad5).
- seed-player-portfolio takes the first WANT live non-demo questions (route.ts:79, :90-92) and plans each one by its index: OPEN first, then CASHED_OUT, then WIN from the 7th, LOSS for the 10th and 11th, and VOID for the 12th (:146-149). It skips a refused buy without recording it (:113-114).
- On six questions it can make only OPEN and CASHED_OUT, and seed-watchlist then answers ok:false ('void: no market on the board is in this state', :132, :167).
1. The BOOK phase runs after the matrix and after the Sell capture, which keeps its { markets: 5 } (qa-classic-shell-parity.mjs:1051). As the demo player, in this order:
(a) POST /api/dev-test/seed-markets. It tops the canonical catalogue up whenever fewer than 25 questions are LIVE (seedDemoMarkets, market-service.ts:4874-4875), and it answers { live, ids } (seed-markets/route.ts:19-25). The BOOK refuses unless that reply names at least 12 LIVE questions whose title does not start with 'Demo · ' (isDemoMarket, market-service.ts:405-407). A refused BOOK makes the baseline INVALID, and nothing is written. §0j records the pool size.
(b) POST /api/dev-test/seed-player-portfolio with { markets: 12 }.
- Its reply must hold placed === 12 and intended.VOID === 1 (:218-220).
- byStatus counts every MARKET position the demo player holds, the Sell capture's included (:212-214). It must include VOID ≥ 1, WIN ≥ 1 and LOSS ≥ 1.
- No refusal may start with 'cashOut', 'stage1', 'settle' or 'void' (:166-188). A refusal starting with 'updown' is an Up & Down round whose window closed between listing and buying (:199-207); it is recorded in the baseline and never fails it.
- The voided question is marketIds[11] (:223), voided through emergencyVoidMarket (:187-188). WIN and LOSS settle through resolveMarket and settleMarket (:169-186).
(c) POST /api/dev-test/seed-watchlist. Its reply must be ok: true, with byLens.void, byLens.done and byLens.progress each at least 1 (the lenses: src/lib/watchlist/following.ts:95; the forced progress row: seed-watchlist/route.ts:111-120).
The BOOK uses no admin-console drive and no new dev-test route (test:cert-devroutes). Its own body cells (WP1 step 3) are captured after (a)-(c) and after the checks of item 2.
2. Before anything is recorded, the capture asserts:
- the voided question's card (marketIds[11]) is on /results;
- settled YES and NO cards are on /results;
- /watchlist shows at least one void card, one done card and one selection-closed card.
If any of these is missing, the baseline is INVALID and nothing is written.
3. Before the v3 baseline is captured, teach the trace S7's class names.
- The live trace selector (qa-classic-shell-parity.mjs:595) adds [class*='kp-jcard'], [class*='kp-jhome'], [class*='kp-jhowto'] and [class*='kp-howto'].
- Its class report (:599) names those classes too. Today it keeps only classes containing 'journey', so such an element would be reported as a bare 'class:'.
- None of these prefixes occurs in src/ on main.
- --prove-red gains two plants, each reported as a trace in its own cell: a kp-jcard element in a classic body, and data-testid="journey-home-ghost" in a classic /markets raw body. RAW_TRACE (:491) already matches any journey-* test id.

*From:* Critique 7; critique 4 (its WP1 part). Second review: both A8 problems (a fresh server's six questions never reach WIN, LOSS or VOID; refusals are judged on the MARKET half only) and missing item 1.

### A9 · The served-bytes proofs become three tracked Node tools in WP1; no gate or record names a scratchpad path

*Overrides:* WP1 Files and Steps (three new tools and their keys; step 4's 'as shell-skeleton.py normalises them'); WP2 Gates (the scratchpad shell-skeleton.py bullet); WP7 Gates (adds the skeleton compare on /) and 'Served bytes' ('WP12's production-build read'); WP9 and WP10 Gates (a page-scope run); WP12 steps 3 and 6; Risk 5; Open point 27; how §0j records these runs.

In WP1 (scripts only, beside parity v3), first run `git ls-files scripts`.
- If S6 WP12 has tracked equivalents, extend their routes and markers and cite their commit.
- Otherwise port the three WP6c instruments to tracked Node scripts: shell-skeleton.py, first-load-parts.py with first-load.py, and chunks-check-wp6c.sh. Today they exist only in session 0cb4430f's scratchpad, and the repo tracks no Python.
- Each tool gets its package.json key in the commit that adds it (test:docs and test:orphans green), and a control that must pass before any verdict is read.
- None of them is a test:* key (Correction 12).
(1) `qa:served-skeleton` (scripts/qa-served-skeleton.mjs).
- Capture and compare. `--capture <file>` saves each cell's second (warm) response from one running local server, and refuses a BASE that is not localhost. `--compare <a> <b>` compares two captures, so two servers never run at once.
- Head: link, script and meta tags. Chunk hashes and ?dpl= are normalised, and script preloads are listed apart.
- Body: tags with their id, class, role, data-testid and hidden; comments, including React's boundary markers `<!--$-->`, `<!--$?-->`, `<!--$!-->` and `<!--/$-->`; and a placeholder per text node.
- `--main` walks inside `<main id="main-content">` and the streamed segments `<div hidden id="S:…">` instead of collapsing them. shell-skeleton.py collapses both (:86-92), which is why it could not see the body WP2 moves.
- Normalisations: only those shell-skeleton.py carries (:31-48: chunk hashes, ?dpl=, React's generated ids, the identity avatar's ids and streamed segment ids), plus what a calibration null pair proves necessary under --main (market and round ids and time labels, as parity v3's calibration settles them).
- Client-rendered boundaries are counted, never stripped or normalised. Each capture counts its `<!--$!-->` markers and its BAILOUT_TO_CLIENT_SIDE_RENDERING templates. A compare fails when either count grows, whatever else matches (shell-skeleton.py:164-170). Both captures of a pair carry lazy-overlays' by-design boundaries (item 3), so those cancel out.
- Controls: a HEAD-against-HEAD null pair reports no change. `--self-test` plants on synthetic documents, each reported in its own field: a dropped `<!--$-->`; a boundary turned into `<!--$!-->` (a new bail-out); a new `<template data-dgst>`; an extra body element; a class changed inside main (reported only under --main); a dropped og:url meta; an added head preload.
(2) `qa:first-load` (scripts/qa-first-load.mjs).
- It builds and reads one local `next build`, run under ~/heavy-node-lock.sh and detached.
- A local build records no commit, because deploymentId is set only on Railway (next.config.ts:42-45). So the tool ties the build to HEAD itself. It refuses to build on a dirty tree (`git status --porcelain -- src scripts package.json` not empty). Once the build exits 0, it writes .next/kp-head with `git rev-parse HEAD`. It refuses to read any .next whose kp-head is missing or is not HEAD, so a stale .next from another tree, such as S6's last build, is never read as S7's.
- Per route, it lists the client-reference entry files and each next/dynamic part's react-loadable chunks. It then prints each part's verdict and where each marker sits.
- Routes are passed in a form Git Bash cannot rewrite (first-load-parts.py:4).
- The marker table lives in the script, and the script fails if any marker is not unique in src/.
- S7 adds its markers (the home lazy module's chunk, the How-to card, the How-to sheet and the journey card) and its routes (/, /live, /results, /watchlist, /markets/[id] and /account, per A20).
- Control: the classic deposit test id is found in every route's entry files, and a journey marker planted in memory into one route's entry set is reported.
(3) `qa:chunks-prod` (scripts/qa-chunks-prod.mjs; prod/chunks-check.sh is not in the repo).
- It reads an origin (production by default) as a guest, with GETs only, and lists initial scripts and low-priority preloads apart.
- S6's and S7's journey markers must be absent from the initial scripts, with two by-design exceptions that are reported, never failed: kp-journey-shell (shell-mark.ts reaches every page by design, VODACOM-PLAN.md:528), and, on / only, the home lazy module's marker (WP7 puts that small module in /'s first load by design, A23 item 6).
- The HTML must carry no journey markup.
- Client-rendered boundaries. The tree carries lazy-overlays' boundaries by design (VODACOM-PLAN.md:539). The primer, and the chat bubble when the chatbot is on, load with ssr: false (lazy-overlays.tsx:17-24, :45-46), and next/dynamic wraps each in a bail-out boundary of its own.
  - Every `<!--$!-->` must be such a boundary: its template carries data-dgst BAILOUT_TO_CLIENT_SIDE_RENDERING.
  - Their number must be exactly 1 (the primer), plus 1 when the document's inline RSC data passes chatbotEnabled true to LazyOverlays (layout.tsx:243).
  - Any other `<!--$!-->`, any other digest, or any other count fails.
  - WP6c's saved documents (2026-10-03) held exactly two of each on every route, for guest, player and journey readers, with chatbotEnabled true.
  - chunks-check-wp6c.sh's zero rule (:30, :36) is not ported, because as written it fails every page. §0j records that WP6c's owed drive 6 ('no <!--$!--> in the HTML', VODACOM-PLAN.md:527) is read by this rule instead.
- Controls: the classic bar's test ids are found in the initial scripts; a synthetic document with the expected by-design boundaries passes; the same document with one more `<!--$!-->` fails; and a document with chatbotEnabled false and two boundaries fails.
Where the keys replace scratchpad paths:
- WP2's last gate becomes 'qa:served-skeleton --main: a null pair first, then / signed out and signed in; head and body, main included, identical'.
- WP7 runs the same compare on / after the journey arm lands.
- WP9 and WP10 run --main on the routes they edit, /account (A20) included.
- WP12 step 3 becomes qa:first-load with S7's markers, plus qa:served-skeleton --main.
- WP12 step 6's production chunk read becomes qa:chunks-prod.
- WP1 step 4's 'as shell-skeleton.py normalises them' reads 'as qa:served-skeleton normalises them'.
The production build runs under ~/heavy-node-lock.sh, detached. Risk 5, Open point 27 and §0j name these keys and the commits they ran on, never a file in Temp.

*From:* Critiques 3 and 15: the same defect, so one remedy is applied once (page scope = --main; both control sets kept). Second review: the A9 problems (qa:chunks-prod's zero rule fails every page by construction; qa:served-skeleton counts bail-outs and never strips them; the home lazy module is reported on /, not failed; qa:first-load's tie to HEAD) and missing item 5. /account comes from the A20 problem.

### A10 · WP2's move: the exact range, and which comments name the new file

*Overrides:* WP2 Files (the page.tsx and legacy-landing.tsx ranges; the prose list) and steps 2 and 3 ('The four prose comments').

1. The range.
- src/app/page.tsx is 322 lines on main (CRLF).
- LandingPage runs from its JSDoc at :58 (the comment is :58-110, and the function starts at :111) to its closing brace at :322. :321 is `);`.
- legacy-landing.tsx takes today's imports :4-32 and :58-322 verbatim. Read ':58-322' wherever the draft says ':58-321'.
2. Three comments describe where the landing's rows are built today, and now name legacy-landing.tsx:
- hero-copy.test.mts:80 (`// decommented app/page.tsx`; this file joins WP2's Files);
- hero-contract.test.mts:76;
- landing-contract.test.mts:68.
3. Three other comments name app/page.tsx, but they record the 2026-09-28 deletion of the landing's .market-grid card from that file, which stays true: featured-card.test.mts:191, one-sided.test.mts:126 and scripts/anchors/one-sided.anchors.mjs:44. They are left unchanged.
4. route-census.test.mts:49 and :54 are comments too, but that file maps the route by path and needs no edit.
No gate reads these comments.

*From:* Drift 319-321/345 (the range) and 327-328/360 (the comments). Corrected on re-check: three of the drift's six comments are history, and rewriting them would make them false.

### A11 · WP3's /markets target keeps the sign-up greeting (`welcome`) and keeps no path rule of its own

*Overrides:* WP3 Files (markets-redirect.ts keeps no path regex of its own), step 3 (the table and its output order) and Gates (adds test:pending-bet); WP9 Gates (adds test:pending-bet); test:markets-redirect §1's goldens and red:markets-redirect's plants; Open point 13's keep-list.

Why. Since 9b21bae9, a new account with a safe next lands on that path with `welcome=new` appended (src/app/auth/register/actions.ts:110-117; src/app/auth/login/actions.ts:240-247). AuthFlash greets on `welcome=new` or `welcome=back`, then clears the parameter in place (auth-flash.tsx:31, :42-58). A journey reader whose next was /markets would lose that greeting in the 307.
1. The table gains one row: `welcome=new` or `welcome=back` is kept, and any other value is dropped. It is written last, after the click ids.
2. test:markets-redirect §1 adds these goldens:
- `/markets?welcome=new` → `/?welcome=new`;
- `/markets?topic=sports&welcome=new` → `/?cat=sports&welcome=new`;
- `/markets?status=watch&welcome=new` → `/watchlist?welcome=new`;
- `/markets?welcome=x` → `/`.
3. red:markets-redirect gains an in-process plant that drops `welcome`.
4. Classic /markets is untouched: the table serves journey readers only.
5. One path rule. 9b21bae9 also made src/lib/safe-next.ts the one same-origin rule. test:pending-bet 6.one-rule (pending-bet.test.mts:136-151, in predeploy) fails on any other file under src/ that keeps a hand-rolled leading-slash regex (the pattern its scanner looks for is at :143).
- journeyMarketsTarget builds its target from two literals, '/' and '/watchlist', plus parameters encoded with encodeURIComponent. It never copies a path from the request, and it keeps no leading-slash test of its own. Its imports stay pending-bet.ts and the query helpers.
- markets-redirect §1 asserts isSafePath(target) (safe-next.ts:33) for every golden. red:markets-redirect's 'a target that is not same-origin' plant must fail it: the plant builds the target from a request value, so `?q=/evil.example` yields `//evil.example`.
- test:pending-bet joins WP3's and WP9's gates.

*From:* Drift implied by 9b21bae9 (the VODACOM-PLAN 3.7 rewrite named in the task), checked against src on main while composing; it was not in the drift list. Second review: missing item 3 (9b21bae9's one path rule, applied to WP3's module).

### A12 · The journey card's labels: the close label's ink by state, and a settled date that carries its year

*Overrides:* Correction 7 (second bullet); WP3 step 2 (cardFace's meta output) and journey-home §3; WP5 step 2 (the meta row and the settled row) and WP5 Gates (journey-home §4, timer-date); WP10 Gates (the test:timer-date line); WP11 step 3 (card tiles); Open point 29.

1. The ink. Correction 7's second bullet is replaced:
- The right-hand label inherits the row's --text-subtle (globals.css:436).
- Exactly two labels take --text-muted (:435): 'Inafungwa leo' with its clock (s4-3-card-today.dc.html:20), and the selection-closed 'Inasubiri matokeo' with its hourglass (s4-3-card-closed.dc.html:20).
- 'Siku N' stays subtle. So does the settled 'Imetatuliwa': its check glyph has no ink of its own (s4-3-card-settled.dc.html:20).
- Void ('Imebatilishwa') follows settled.
2. WP3: cardFace's meta output is `{ kind: 'today' | 'days' | 'waiting' | 'settled' | 'void', emphasis: 'muted' | 'subtle' }`.
- emphasis is muted exactly for today and waiting.
- It is derived from cardCloseLabel's kinds (src/lib/markets/card-close-label.ts:17-21), plus status and outcome.
- journey-home §3's goldens pin the emphasis for every state, with in-memory plants: today returned subtle; days returned muted.
3. WP5: the label carries the face's emphasis (data-emphasis or a modifier class).
- The row sets --text-subtle once. The muted rule is the only other meta rule that sets color.
- journey-home §4 pins this, with a plant that re-points the muted rule to --text-subtle.
- No new contrast pair is needed: contrast-audit.mts:765 already scores --text-subtle on --bg-elevated at 4.5.
4. The settled row (WP5 step 2).
- The card binds the instant once: `const settledIso = m.settledAt ?? m.resolutionAt;`.
- It renders `<time dateTime={settledIso} …>{formatDeadline(settledIso, nowMs)}</time>` on the server. nowMs is the render clock the card already receives (WP5 step 1).
- journey-card.tsx calls no formatDayTime, formatDateTime or toLocale*String, and formats exactly one date.
- formatDeadline (utils.ts:334) adds the year when the instant is not in this year. formatDayTime (:298) never does, and /results lists the whole settled archive.
5. In WP5's commit, extend scripts/timer-date.test.mts §3:
- add src/components/journey/cards/journey-card.tsx to the ONE HOME PER FACT list (:131-136);
- add checks like those at :145-155 for ticket-card.tsx: every `formatDeadline(` on the card sits in `<time dateTime={X}…>{formatDeadline(X, nowMs)}</time>` with the same X; there is exactly one such date; and the file has no directive and no toLocale*String.
6. scripts/anchors/timer-date.anchors.mjs gains two declared anchors on the card, mirroring :109-126:
- 'journey-home-card-year-blind': `{formatDeadline(settledIso, nowMs)}` → `{formatDayTime(settledIso)}`, expected on the one-home check;
- 'journey-home-card-names-another-instant': the formatted instant is swapped to m.resolutionAt while dateTime stays settledIso, expected on the same-instant check.
7. Proof:
- test:timer-date is green;
- red:timer-date (file-mutating, red-timer-date.mjs:51-53) runs alone and detached after the commit, followed by `git diff --exit-code`;
- test:red-anchors passes, with each anchor resolving exactly once.
WP10's test:timer-date line also names the card. qa:journey-home's card tiles (closes today, Siku N, selection closed, settled, void) are read for the two inks.

*From:* Critiques 17 and 9.

### A13 · The lost-chunk guard: lifted into a shared module in WP6, and given to the chat bubble and the primer only in live fix L1

*Overrides:* WP6 Files (the guard bullet); WP6 step 1 (the 'older files, in their own commit' sub-bullet and 'Skip this whole step'); WP6 Gates; WP6 'Served bytes'; WP12 step 1 (the battery); Open point 28. Adds package L1 between WP6 and WP7. (The Summary's classic list is now A23 item 6.)

(a) WP6, the flagged commit.
- If S6 has already shipped a shared guard, import it and cite its commit in §0j. Otherwise create src/components/layout/lost-chunk.ts, with no directive and no imports.
- Move Nothing, the reported flag and nothingIfLost into it verbatim from shell-lazy.tsx:40-72. Only `export` is added, and the report wording does not change. The flag then allows one report per page across every loader that takes the guard.
- shell-lazy.tsx imports them, and its eleven loader lines (:77-96, A8h's host included) stay byte-identical. home-lazy.tsx imports them too.
- ticket-switch-rail.tsx is drawn for journey requests only, so it adopts the guard in this commit: its loader (ticket-switch-rail.tsx:20) ends in `.catch(nothingIfLost)`, with the import after :18.
- In the same commit, re-pin in the open journey-tickets 5.lazy's LAZY_TABS literal (journey-tickets.test.mts:430, checked at :447) and red:journey-tickets' plant railNoServerRender (:1013).
- Re-pin journey-shell §12, each re-pin with its plant in red:journey-shell:
  - 12.module.lost (:2250-2257; its guard text, LOST_GUARD, is :2181-2187) reads the guard in lost-chunk.ts and checks that shell-lazy.tsx imports it.
  - 12.module.dynamic (:2242-2245) allows exactly that one extra static import.
  - 12.parts.client (:2258-2261) counts every module shell-lazy.tsx names apart from next/dynamic (importsIn counts static, bare and dynamic imports, :296-305), and requires each to be a 'use client' part. The guard's import would fail both its count and its client test. The re-pin sets aside exactly the '@/components/layout/lost-chunk' specifier, and requires that module to carry no directive and import nothing. Plant: a second static import of a module that is not a client part still fails 12.parts.client.
- WP6's served-bytes section names every chunk that changes: shell-lazy's on every page, and the rail wrapper's on /positions and /updown/history. Behaviour does not change.
(b) WP6 does not touch src/components/layout/lazy-overlays.tsx. Its adoption is live fix L1, for every player. L1 is one commit, after WP6 and before WP7, recorded in §0j under 'Live changes for every player' and as a §0h point.
- The change touches lazy-overlays.tsx:15-24 only. The guard's import goes after :15, and each of the two loaders (:17-24) ends its import chain in `.catch(nothingIfLost)`, imported from '@/components/layout/lost-chunk'. `{ ssr: false }` stays on both. Lines :45-46 stay byte-identical, because red:chat-availability anchors :45 (chat-availability-red.mjs:39-41).
- The named behaviour: a ChunkLoadError for the chat bubble or the first-visit primer renders nothing for the rest of that page's life, and sends at most one /api/client-error report per page. Today it shows global-error's critical-error screen. Any other error is thrown on, as today. There is no HTML or RSC change, because both parts render in the browser only. Every page's initial JS changes by the LazyOverlays module.
- The gate, in predeploy: test:journey-shell §12 gains 12.dynamic.census.
  - The src files that import next/dynamic must be exactly shell-lazy.tsx, lazy-overlays.tsx, ticket-switch-rail.tsx and home-lazy.tsx. Today there are three: shell-lazy.tsx:38, lazy-overlays.tsx:15 and ticket-switch-rail.tsx:17.
  - Every dynamic( loader's import chain in them ends in `.catch(nothingIfLost)`.
  - Each file imports nothingIfLost from '@/components/layout/lost-chunk', and none defines its own.
- The in-process twin: red:journey-shell gains these in-memory plants, each caught on its own check:
  - the catch dropped from ChatRoot's loader;
  - the catch dropped from FirstVisitPrimer's loader;
  - a fifth file importing next/dynamic without the guard;
  - a local copy of the guard inside lazy-overlays.tsx;
  - the guard catching every error.
- The drive: a tracked local drive, qa:lost-chunk (scripts/qa-lost-chunk.mjs, new; its package key lands in the same commit; test:orphans).
  - It runs on a classic page, as a guest and signed in.
  - Premise cell: with no abort, the chat bubble shows.
  - Then it route.aborts the chat bubble's chunk, and the primer's chunk under ?primer=1 (first-visit-primer.tsx:43). Each time, the page stays up, shows no critical-error screen, leaves that part out, and sends exactly one POST to /api/client-error.
  - One more cell aborts a shell-lazy part's chunk. It replaces WP6c's untracked lost-chunk drive.
  - Control, one server at a time under ~/heavy-node-lock.sh: run the drive on L1's commit and stop its server; `rm -rf .next`; check out L1's parent in the same worktree; serve it and run the drive again, which must FAIL its chat-bubble cell on the critical-error screen; stop that server, `rm -rf .next`, and check L1's commit out again. Never serve a second worktree at the same time. Both runs are recorded in §0j.
- After L1, each of these is read against WP0's record:
  - test:chat-availability is green: its 2.2 reads lazy-overlays.tsx (chat-availability.test.mts:95-107). red:chat-availability (a temp-copy harness) still catches every plant.
  - test:stacking is read label by label: lazy-overlays.tsx is a ROOT_MOUNTS entry (stacking-contract.test.mts:442), and its binding reader (:489-500) starts parsing a loader written in shell-lazy's one-line form.
  - qa:classic-shell-parity --compare shows 0 differences.
  - WP12's battery runs qa:lost-chunk.
- If S6 WP12 ships WP6c owed (8) first, with an equivalent gate, twin and drive, skip (b) and cite its commit in §0j.

*From:* Critique 1. Re-checked while composing: the adjudication's 'ten loader lines' is eleven since A8h (shell-lazy.tsx:77-96). Second review: both A13 problems (12.parts.client; L1's gates test:chat-availability and test:stacking, its one-server control, and the :15-24 range) and missing item 6.

### A14 · The 3A royal plate reads the primary material from one definition

*Overrides:* WP6 step 3 ('The plate: … token-valued fill and edge from the .btn-primary material'); Correction 21; WP6 Files (globals.css, contrast-audit.mts, contrast-audit-red.mjs); WP6 Gates (test:contrast, red:contrast, test:tokens, test:m1-light, parity); WP6 'Served bytes for a classic viewer' (the CSS); §0j.

1. The tokens land in their own commit, before the How-to card: 'the primary material as tokens; computed values unchanged'.
- globals.css :root gains three tokens. Each is byte-identical to today's literal in .btn-primary (globals.css:1238-1259), and each is declared beside its family, as INTAKE §2 requires (docs/design-brief/INTAKE.md:55):
  - --wash-primary: `linear-gradient(180deg, oklch(53% 0.20 268) 0%, oklch(48% 0.20 268) 100%)`, beside --wash-raised, --wash-float, --wash-modal and --wash-inset (:767-770);
  - --edge-primary: `inset 0 0 0 1px oklch(74% 0.16 268 / 0.32)`, beside --edge-lit, --edge-lit-strong and --edge-shade (:731-735);
  - --shadow-primary: `0 2px 8px -2px oklch(20% 0.10 268 / 0.50)`, beside --shadow-1 to --shadow-5 (:598-602, under their 'Shadows + glows' comment at :597).
- test:m1-light's scan of custom properties named shadow, edge or elev (m1-even-light.test.mts:234) keeps reading the two shadow values.
- .btn-primary reads the tokens. Its background becomes var(--wash-primary). Its box-shadow becomes var(--edge-primary), var(--shadow-primary), then today's third (glow) literal, unchanged. Border, text-shadow, letter-spacing and hover are untouched.
- In the same commit, the contrast gate follows the tokens. test:contrast's btnPrimaryStops (contrast-audit.mts:614) becomes `btnPrimaryStops: tokenGradient("wash-primary")`. The reader takes the bare name and adds the dashes itself (:367-368; declValue matches the `--<name>:` declaration, :166-167, and throws on a second declaration site), as every other caller does (tokenGradient("gilt-metal") at :639, "wash-raised" at :651).
- red:contrast's 60%-stop plant (contrast-audit-red.mjs:146-149) is re-anchored on the token's declaration line. Its color-mix plant (:164-167) is confirmed to still match exactly once.
- Proof, all in that commit:
  - red:contrast, run alone and detached (a temp-copy harness): every plant caught, and no broken anchor;
  - test:contrast, test:tokens, test:m1-light and test:design-frozen green;
  - qa:classic-shell-parity v3 --compare: 0 differences. The guest header's Sign-up CTA (top-app-bar.tsx:424) keeps its computed background-image and box-shadow (PROPS, qa-classic-shell-parity.mjs:474-483).
- §0j, under served bytes for a classic viewer: the stylesheet's text changes on every page, and computed values do not.
2. The plate.
- Markup: `<IconPlate size={48} className="kp-jhowto__plate">` with no bg, fg or border props, so IconPlate sets no inline colour (icon-plate.tsx:50-91 applies those props only when given).
- In globals.css, .kp-jhowto__plate sets background var(--wash-primary); box-shadow var(--edge-primary), var(--shadow-primary) (the board's two shadows, not the glow); and color var(--pearl-50).
3. In the same commit as the plate, test:contrast gains the plate's pair, per INTAKE §4c: the --pearl-50 glyph on the ramp's worst stop, minimum 3.0 (non-text). The pair gets a red:contrast plant.
4. journey-home §5 pins the plate: no inline colour, the class present, and the class's declarations reading the three tokens. Plant: a literal oklch in the plate's rule.
5. Correction 21 is extended: IconPlate takes no shadow, so the material comes through a class.

*From:* Critique 20 (token names fixed while composing, so test:m1-light still reads them). Second review: tokenGradient takes the bare name, and the family lines are corrected.

### A15 · The How-to sheet's title is 24px, as its canvas draws it

*Overrides:* WP6 step 4 item 1 (the title in `.kp-jsheet__title`); WP6 Gates ('test:type-scale: the title on title-md 22…'); Correction 20; WP5's side-word size; journey-home §5.

1. The title.
- The How-to sheet's h2 carries `kp-jsheet__title kp-jsheet__title--lg`.
- The new modifier sets only `font-size: var(--type-h2); line-height: 1.2`. That is 24px, as the canvas draws it (pick-5-how-to-play.dc.html:40).
- `.kp-jsheet__title` itself (globals.css:6426, 20px) is unchanged for the guest Tiketi sheet. That sheet's board draws 20 (s4-9-tiketi-guest.dc.html:20), and journey-shell.test.mts:1570 pins its markup.
2. At 320, the board draws 22, which is on no CSS rung (s4-7-howto-320.dc.html:21).
- The title stays 24 if qa:journey-home's 320×640 sheet tiles show it on one line beside the kit ✕ in sw, en and zh.
- Otherwise it takes --type-h3 below 360.
- Either way, §0h records the 320 deviation.
3. The gate.
- Delete WP6's gate line 'test:type-scale: the title on title-md 22…'. test:type-scale reads text-[Npx] utilities and inline sizes, never a class's font-size (type-scale.test.mts:360-366, :1083-1088).
- journey-home §5 pins both halves instead: the h2 carries both classes, and the modifier declares `font-size: var(--type-h2)`.
- Plants: the modifier dropped from the h2; the size re-pointed to var(--type-h3).
4. Correction 20 is replaced.
- 24 (--type-h2) and 17 (--type-h4) ARE on the CSS type scale (globals.css:215, :217).
- Only the phone headline's 30, the desktop headline's 40 and MFANO's 14.5 are off both ladders.
- So WP5's side word takes var(--type-h4), the canvas's 17.

*From:* Critique 19; drift 183-184 (Correction 20). Second review: the 320 board's title is :21.

### A16 · The home's head at every width, and card titles in multi-column grids

*Overrides:* WP7 step 2 items 1-2 (the How-to card 'first in the column', 'From 1024 it sits beside the h1', the h1 with a <br>, the rung measured at 360 only); WP5 step 2 (the heading: only the fallback clamps) and step 5 (CSS); WP10 (multi-column grids); WP11 step 3 (the tiles: '3 columns at 1280'); journey-home §7.

1. Order.
- The DOM keeps the deck's 360 order at every width (§3.2 :2653-2661): the How-to card, then the h1. Below 1024 the head is a column (pick-1-home.dc.html:37-48).
- From 1024 the head is one flex-wrap row with the desktop board's values (s4-3-home-desktop.dc.html:39-45): the h1 has `flex: 1 1 520px; min-width: 0`; the How-to card has `flex: 0 1 440px; min-width: 320px`; the gap is 16px 24px. The h1 takes `order: -1`, so it draws on the left.
- Tab order is unchanged, because the h1 is not focusable (precedent: .kp-proof, globals.css:4393-4413).
- With PageContainer's 32px lg gutters (page-container.tsx:106; unless Ali overrules A5(c)), the 984px of flex bases do not fit a 1024 viewport's 960px. So from 1024 to about 1047 the card wraps under the h1. Keep the canvas values, and record the wrapped composition in the 1024 tile.
2. The headline.
- The <br> is phone-only: `<br className="kp-jhome__br">`, with `display: none` from 1024.
- The separator between the two sentences is the language's own: a space in sw and en, and nothing after zh's 。. It must reach the served HTML, so it is an explicit expression or a dictionary value, never source whitespace (SWC drops it).
- Below 1024, the rung is the one measured to hold exactly two lines at 360.
- From 1024, it is the largest rung that holds ONE line at 1280 beside the How-to card in sw, en and zh. The candidates are --type-display-2 (44), text-display-3 (36) and --type-h1 (32) (globals.css:213-214; tailwind.config.ts:207). The canvas's 40 is on neither ladder (§0h point 7). §0j records the chosen rung.
3. Card titles.
- In a multi-column grid, the card title reserves two of its line-heights through a --jcard-* token (the board's 47px, s4-3-home-desktop.dc.html:56, :64, :72). For the home, that is .kp-jhome__grid from 640.
- In every grid, the card's action block (the picks, or the closed or settled row, with the one-sided note) takes `margin-block-start: auto`. A title running to three lines at 640-1023 then still leaves the picks level across a row.
- One column (below 640) reserves nothing (pick-1-home.dc.html:62), so the above-fold budget is untouched.
- WP10 names each surface whose card grid has more than one column, and applies the same reserve there.
4. journey-home §7 pins the following, each with an in-memory plant in red:journey-home:
- the DOM order;
- `order: -1` only inside the ≥1024 query;
- the <br>'s class hidden only from 1024;
- the separator's carrier;
- the reserve only inside the ≥640 grid query;
- the action block's `margin-block-start: auto`.
5. qa:journey-home tiles, in sw, en and zh:
- at 1280, the h1 sits left of the How-to card on one line (its height equals one line-height ±1px), and its served text holds the separator;
- at 1024, the wrapped composition is recorded;
- at 768 and 1280, in every multi-column row, the picks' tops are equal within ±1px.

*From:* Critique 16. Lines re-based on 7d4b0ad5.

### A17 · WP7's test ids, what paints on a hop to /, and a ghost drive that can see the ghost

*Overrides:* WP7 steps 1-3 (the root test ids; JourneyHomeGhost's markers and importers); WP7 Gates (journey-home §6 and §7); WP11 step 3 ('the ghost against the landed page'); Risk 9 (the held-response check). Adds a new Open point (/'s loading picture).

1. Test ids.
- JourneyHome's outermost server-rendered element carries data-testid="journey-home". journey-home §7 pins it exactly once, with a plant that removes it.
- JourneyHomeGhost's root carries data-testid="journey-home-ghost". Its How-to card, headline, chips and first card box each carry data-ghost-part (howto | headline | chips | card).
- journey-home §6 pins the ghost's id, and pins that journey-home-ghost.tsx is imported only by src/app/page.tsx. Plants: the id removed; an import from markets/loading.tsx.
2. /'s loading picture: a new Open point, recorded in §0h before WP7.
- src/app/loading.tsx stays generic and unedited, as §3.2 :2666 says.
- JourneyHomeGhost is the fallback of the Suspense inside page.tsx's journey arm (WP7 step 1, unchanged).
- So a soft hop to / paints the root box first (loading.tsx:1-11), and paints the home ghost only while JourneyHome's read is still streaming. §0j records this as a known difference from the canvas's loading board (s4-3-home-skeleton).
- S7 adds no route group and no pathname choice in the root loading. The root segment is not re-sent on a soft navigation (app-shell.tsx:95-97; journey-preview.ts:244-246), so a choice there would follow the last document load, not the hop.
3. WP11 step 3's ghost cell is rewritten.
- Never hold or truncate the response: a held body arrives whole, so the page's own fallback never paints.
- Use qa:ghost-landing §A's method (ghost-landing.mjs:88-133):
  - staff-pass contexts at 360×780 sw, 390×844 en and 1280×900 zh;
  - a CDP network throttle (latency 400 ms, 400 kbps) and CPU 4×;
  - from journey /live, CLICK the visible journey link to / (the Maswali tab below 1024, the header's Maswali link at 1280). Never goto.
- A rAF probe records the four data-ghost-part boxes on the last frame where `[data-testid=journey-home-ghost]` is on screen while location.pathname is /.
- After landing (journey-home and journey-tabs visible), the How-to card, the h1, the chip rail and the first journey-card must each land within ±2px of their ghost part. Frames of the root box before the ghost are recorded with their duration, not gated.
- Verdicts:
  - PASS: a ghost is captured, and every part is within ±2px.
  - FAIL: a ghost is captured and a part is off; or the classic control (the same hop with no pass) shows journey-home-ghost.
  - NOT MEASURED: three throttled hops in a row capture no ghost frame. This happens when the home's read resolves before the server's first flush, as an in-memory store may. It is never a PASS: it blocks WP11's done-when like a FAIL until a §0h point records Ali's call (accept the gap until the flip, or take the (home) route-group overrule).
- Red control, page-only: serve a stylesheet plant through route.fulfill, as ghost-landing's RED_GHOST does. Moving the ghost's card box by 40px must FAIL. Hiding the ghost must report no ghost frame.
- This cell replaces Risk 9's 'held-response check'.
4. If Ali takes the overrule (a (home) route group), it becomes its own package before WP7:
- move src/app/page.tsx to src/app/(home)/page.tsx;
- add src/app/(home)/loading.tsx, chosen on the server like positions/loading.tsx:26-33, whose classic arm is today's RootLoading markup verbatim;
- re-point every gate and doc that names src/app/page.tsx in the same commit;
- name in §0j the classic served changes (the router tree's (home) segment and the page chunk's path), and prove them: parity v3 with 0 DOM differences on /, plus qa:first-load and qa:served-skeleton --main (A9);
- the ghost cell then also requires the ghost to be the first frame after the click.
5. A19 keeps markets/loading.tsx untouched. A23 lists journey-home and, conditionally, journey-home-ghost in qa:live.

*From:* Critique 11; critique 4 (its WP7 part); critique 14 (its WP7 part). Critiques 6 and 11 disagreed on holding the response. Resolved: a throttled hop, with a NOT MEASURED verdict, because a held body arrives whole.

### A18 · SHELVED rows in SHELVED.md's six columns

*Overrides:* WP7 step 4 (the landing's row and the sentence after it); WP8 step 4 (two rows); WP9 step 6 (the board's row); WP10 step 4 (LivePulseGrid and MarketCard rows).

1. Every S7 SHELVED row (WP7 step 4, WP8 step 4, WP9 step 6, WP10 step 4) is written in SHELVED.md's six columns, in its order (SHELVED.md:15): Item | Files | Why shelved | Date | How to re-mount | Test.
- Every cell is filled.
- Each row lands in the SAME commit that hides its item (SHELVED.md:9).
- Date is that commit's date.
- On a line that carries a path, a link or an npm run command, write 'shelved' or 'unmounted' (SHELVED.md:11-12).
2. Why shelved, per row:
- the landing: 'SJ-6 / §3.2: the home is the question list';
- the strip: 'COMPLIANCE-DECISIONS §10 (:518) / §3.2: the LIVE strip leaves / and /markets';
- the primer: '§3.8: the How-to sheet replaces it';
- the board: '§3.2: /markets answers 307';
- LivePulseGrid and MarketCard: '§3.2: the journey card replaces them'.
3. WP7 step 4's sentence after its row reads: '`src/lib/markets/hero.ts` and `landing.ts`, and `src/lib/server/landing-picks.ts` and `updown-band-round.ts`, stay in use for classic readers.'
4. WP10's LivePulseGrid row unmounts only the wall: under A21 the journey arm draws the search box itself.

*From:* Drift 850-852 and 854 (WP7 step 4), 944-949, 1013-1017 and 1097-1103 (WP8-WP10 rows).

### A19 · markets/loading.tsx stays untouched, and a hop to a question page never shows the home's ghost

*Overrides:* WP9 Files (markets/loading.tsx removed); WP9 step 4 (struck); WP9 'Served bytes' (the loading line); WP9 Done-when (the soft-hop bullet); WP11 step 3 (the redirect cells; a new card-tap tile); Open point 15; Risks (adds the hand-off to S8).

1. WP9 step 4 is struck. src/app/markets/loading.tsx is not edited in S7: Open point 15 is decided the other way, and WP9's Files drop it.
- A journey reader's soft hop through a classic /markets link paints today's markets ghost before the redirect lands home.
- A hop to /markets/<id> paints what every reader's hop paints today, because the markets segment's loading file wraps every child segment (sprint-additions-e2e.mjs:150-152).
- No player sees this before the flip (§0h point 4, :1167-1169), and the flip re-points those links to / (VODACOM-PLAN.md:2940-2941, :3175).
- A17's importer pin keeps JourneyHomeGhost out of every loading file. board-discovery's skeleton anchor (anchors/board-discovery.anchors.mjs:103-109) stays untouched.
2. WP9's Done-when, bullet 2, becomes: 'A soft hop from a journey page through a classic /markets link ends on the table's target. A17's probe records every loading frame on the way, in order: today's markets ghost, then the root box on the follow-up navigation to /.' WP11's redirect cell records that sequence in §0j.
3. WP11 step 3 gains a card-tap tile, using A17's throttled hop and rAF probe, never a held response.
- A journey reader on the home taps a card's stretched link, and in a second run an NDIO pick, going to /markets/<id>.
- In every frame until the question page lands, the probe records which loading picture is on screen: journey-home-ghost, markets/loading's ghost, or [id]/loading's ghost. Each is identified by a selector unique to its markup, named in the drive.
- Any frame carrying journey-home-ghost FAILs.
- A run that captures no loading frame at all is NOT MEASURED, never a PASS.
- The ghost actually seen is recorded in §0j for S8.
4. If Ali overrules item 1:
- The journey arm is exactly `if (journey && (await headers()).get("x-pathname") === "/markets") return <JourneyHomeGhost t={t} />;`. x-pathname is set for every request (proxy.ts:265), and resolveSimpleJourney reads it the same way (journey-preview.ts:251). So /markets/<id> keeps today's ghost for every reader.
- The file follows journey-tickets §10's rule (journey-tickets.test.mts:528-589):
  - exactly one `const [{ t }, { journey }] = await Promise.all([getServerT(), resolveSimpleJourney()]);`;
  - no other session read, except that one headers() read, used only for the guard;
  - exactly one journey early return, placed before the one classic return;
  - every block of today's ghost kept after it;
  - no client code.
- It is pinned in markets-redirect §2, with in-memory plants: the condition inverted; the journey return made unconditional; the resolver not asked; a classic block lost; the path clause dropped.
- A8's trace plants then also cover a classic /markets raw body.
5. The journey question page's loading picture belongs to S8, with the question page's journey layout. That includes the markets segment's fallback on a hop from outside /markets. Record this hand-off in §0h.

*From:* Critiques 4 and 6 (the WP9 and WP11 parts). Lines re-based on 7d4b0ad5.

### A20 · Tafuta keeps the Akaunti board's row and opens in place

*Overrides:* WP9 step 5 (Tafuta as an always-open GET form); WP9 Files (hub-rows.ts and hub-row.tsx, 'a search kind'); WP9 Gates (test:journey-account + red; test:journey-shell §9; qa:served-skeleton on /account); WP9 'Served bytes' (/account); WP11 step 3 (Akaunti tiles); Open point 14.

At rest, Tafuta is the Akaunti board's row (s4-8-akaunti.dc.html:71): the search glyph, 'Tafuta' (common.search) and the chevron. It opens in place, as S6 built Lugha from the same board's link row (language-row.tsx:21-28).
1. Markup, server-rendered by hub-row.tsx.
- An `<li><details>` whose `<summary className="kp-hub__row">` is the row.
- Inside it, a GET form with `action="/"`, holding the kit Input (`name="q"`, labelled common.search, placeholder journey.hubSearchPlaceholder) and a kit Button submit (common.search).
- The chevron turns 90° when open, as Lugha's does. globals.css:5988-5990 holds those three journey-only rules; share or mirror them.
- It works with JavaScript off.
- There is never a search box on / (SJ-6, INHERIT-MANIFEST.md:57).
2. hub-rows.ts.
- SEARCH (:109) becomes `{ id: "search", kind: "search", action: "/", label: "common.search", glyph: "search" }`.
- The HubRow union (:82-89) gains the kind.
- HUB_WORDS gains journey.hubSearchPlaceholder.
- The note at :108 is rewritten.
- hub-row.tsx renders the new kind.
3. journey-account pins:
- the settings order `language,cardSize,needle,search`, unchanged (journey-account.test.mts:410);
- the row's kind is 'search';
- its summary holds the glyph, the label and the chevron;
- the form's method is GET, its action is / and its field is q.
In-memory plants, each of which must be caught: the row turned back into a link to /markets; method POST; the field renamed; the chevron dropped. The misspelt-route plant searchMisspelt (:771, :868) is re-pointed to the search kind's action. 4.helpline (:513-514) stays green.
4. journey-shell §9: hubDoorsFor (journey-shell.test.mts:1908) also counts a search row's action as an edge. Plant: drop the search row, and the hub's edge to / disappears.
5. qa:journey-home gains Akaunti tiles at 360 in sw, en and zh, with Tafuta closed and open, plus one submit that lands on /?q=… and shows the q line.
6. Served bytes: /account's client JS gains the kit Input's chunk (input.tsx:1, 'use client'). /account is journey-only: everybody else gets notFound (account/page.tsx:49). /account joins qa:first-load's S7 routes (A9 (2)). WP9 runs qa:served-skeleton --main on /account, before and after, for a classic reader (the not-found page) and for a journey reader. §0j records which scripts each reader actually receives.

*From:* Critique 21; drift 977/1012 (hub-rows.ts :108-109). Second review: /account joins qa:first-load and qa:served-skeleton.

### A21 · A journey reader's /live keeps today's list, order and search box; one paging rule

*Overrides:* WP3 step 1 (homeView's paging split out); WP10 step 2 (the /live bullet); WP10 Gates (journey-home §9); WP11 step 3 (tiles); Open points 10 and 12 (refined). Adds a new Open point (paging on journey /live).

1. WP10 step 2, /live.
- The journey arm renders `all` (live/page.tsx:96-99): the same array that today's count line, FeaturedContest and wall are all derived from (:129, :155, :197). That is today's `!isClosedByTime` population (:69), filtered by q on the server, with both product lines.
- It keeps today's order: listBoard's resolutionAt ascending (market-dal.ts:775, :1322).
- It never calls homeBook or any bettable filter.
2. Each row is a JourneyCard.
- Rows that take bets draw their priced faces.
- Selection-closed rows (isSelectionClosed, market-service.ts:626-630) draw WP5's selection-closed face: a 64px row that is not a control, the lock glyph and market.statusClosed, with A12's 'Inasubiri matokeo' label.
- Up & Down rows link to their round (roundByMarket, :116).
3. What else stays.
- The search box that LivePulseGrid draws today (pulse-grid.tsx:111-119) stays for journey readers: the same SearchBox with the same props, in its own Suspense, above the list.
- The count line, FeaturedContest and the explainer stay (Open point 10).
- Any change this makes to classic /live's scripts (for example, a chunk name) is named in §0j and read by qa:first-load in WP12.
4. Paging on journey /live (a new Open point).
- Use the cumulative 'Onyesha zaidi': 12·n cards (PLAYER_PER_PAGE, pagination.tsx:17), with ?page=n parsed like parseHomeParams' page, q kept, and the scroll position kept.
- WP3 step 1 splits homeView's paging into an exported pure `pageCumulative(list, page, perPage) → { shown, more, page }`. The home and /live both call it, so there is one rule. journey-home §2 tests it.
- Classic /live's batch wall (pulse-grid.tsx:41, :54-90) is untouched.
5. Gates. journey-home §9 pins that /live's journey arm maps `all`, calls neither homeBook nor a bettable test, and pages only through pageCumulative. In-process plants: homeBook swapped in; a bettable `.filter(` added; the search box dropped.
6. WP11 step 3 tiles, on journey /live:
- a selection-closed row in sw, en and zh, at 360 and 1280 (seed-watchlist manufactures one, seed-watchlist/route.ts:111-120);
- the end of page 1, with 'Onyesha zaidi';
- a count control: clicking 'Onyesha zaidi' until it is gone reaches exactly the number of cards in the hero's data-result-count (live/page.tsx:197).

*From:* Critique 12.

### A22 · WP10's overlays: /watchlist is pinned out of the journey surfaces too

*Overrides:* WP10 step 3 ('their DENY pins hold'); Open point 11 (its overrule's wording).

1. 'Their DENY pins hold' is true only for /live and /results (journey-shell.test.mts:562). §2's DENY list (:561-565) has no /watchlist entry.
2. WP10 adds '/watchlist' to DENY, with a red:journey-shell plant: isJourneySurface('/watchlist') answering true must fail 2.deny./watchlist. All three of Open point 11's routes are then pinned.
3. WP10 step 3 also states that the similar rail's page is already a journey surface: /markets/<id> matches surfaces.ts:63 and sits in ALLOW (:560). So the Needle, the panel and the chat bubble already stand down there for a journey reader.
4. Open point 11's overrule moves both ALLOW and DENY.

*From:* Drift 1095-1096 (Open point 11).

### A23 · Production proves 'nothing changed for players' for signed-out and signed-in players alike, and the classic changes are named in full

*Overrides:* WP11 step 4 ([E2]'s routes, its id list and its control; a new [E3]); WP11 step 3 (a positive control); WP12 step 6; WP12 'Done when (S7)'; Summary 'What does change for a classic visitor' (replaced by item 6) and Summary 'Production'; the production half of Open point 2.

1. WP11 step 4, [E2] (signed out).
- Routes: /, /markets, /live, /results and /markets/<a live id>. Read the id from the first question link on production's own /markets. If no id is found, the cell FAILS; it never skips.
- PREVIEW_TESTIDS stays as it is (pre-deploy-live-check.mjs:344), and S6 WP12's additions stay beside it (journey-top-bar, journey-tabs, journey-deposit; S6-PLAN.md:917).
- S7's list is a second exported constant, never merged into PREVIEW_TESTIDS. It holds only ids a journey page's served document carries before hydration: journey-home, journey-card and journey-howto-card (A17). journey-home-ghost is added if, and only if, item 3's positive control finds it in the inline RSC data.
- journey-howto-sheet is NOT listed. The kit Modal renders nothing until it is mounted and open, then portals (modal.tsx:317-319 at 7d4b0ad5), so the id can never be in served HTML. The drives keep using it to find the open sheet.
- data-journey is checked as well.
- /markets must answer 200 with the board.
- Control, as for the marker (:370-373): a synthetic check that the S7 matcher catches each id in element form and in RSC-payload form, and passes a page without them.
2. qa:live gains [E3], a signed-in production read.
- When it runs: only when BASE is not local and QA_SIGNED_IN=mobile01 is set. [F] stays local (:395-396). Without the opt-in or the secret, [E3] prints 'NOT MEASURED' with the reason. That is neither a pass nor a failure, so predeploy's qa:live and other lanes' production runs are unchanged. Under ACTIVE it prints a SKIP, as [E2] does.
- How it signs in: once, as the unfunded QA player mobile01 (scripts/live/harness.mjs:77-82), through loginOnce (:220-231), with QA_MOBILE01_PASSWORD from the gitignored .env.qa.local (qaEnv, :137-142).
- What it reads, with GETs only: /, /markets, /live, /results, /watchlist and the same /markets/<id>.
- Each page answers 200 with a real session: kp_session is present, as [F] checks (:425-437), and /watchlist (edge-protected, proxy.ts:39) lands on /watchlist, not on the sign-in page.
- Neither the served HTML nor the rendered document carries any listed id, data-journey or the preview marker. /markets is the board.
- It runs the same matcher controls as [E2].
- Limits: no click, no star, no bet, no deposit and no setting change. Nobody else may be signed in as mobile01 during the run, because a second login revokes the first (LANDING-TEN.md:925-927).
3. A positive control in qa:journey-home (local, staff pass).
- Fetch the documents of /, /live and /results with the pass. Assert each listed id appears where it belongs: journey-home, journey-howto-card and journey-home-ghost on /; journey-card on all three.
- Then assert that none appears in the same documents fetched with no pass.
- journey-home, journey-card and journey-howto-card must be found, or the list itself FAILs: an absence check over an id that never appears proves nothing.
- journey-home-ghost is listed only if found, and §0j records which.
- Both scripts import the one exported list.
4. WP12 step 6 runs qa:live on production with QA_SIGNED_IN=mobile01. The production proof is not recorded until a run shows [E3] actually measured.
5. 'Done when (S7)' reads: 'Production proves that nothing changed for players beyond what §0j names. That is the live fix L1 (a chat-bubble or primer chunk that never arrives leaves that part out instead of showing the critical-error screen; proven locally by qa:lost-chunk, red on its parent commit) and the served bytes of item 6, each with its proof. qa:live [E2] (signed out: /, /markets, /live, /results and a question page) and [E3] (signed in as the QA player: those pages and /watchlist) pass on the deploy commit.' 'Staff see the deck's home on production' stays with S14 (Open point 2; §0h point 4).
6. The Summary's 'What does change for a classic visitor' is replaced by this list. Markup never changes for a classic request. Each row is recorded in §0j under 'Served bytes for a classic viewer', with its proof.
(a) Behaviour, for every player: the live fix L1 (A13(b)), in its own commit. A chat-bubble or first-visit-primer chunk that never arrives leaves that part out, with one /api/client-error report per page, instead of the critical-error screen. Gate: 12.dynamic.census (predeploy). Twin: the in-process plants in red:journey-shell. Drive: qa:lost-chunk, red on L1's parent.
(b) CSS, on every page:
- .btn-primary's material moves onto three tokens, with its computed values unchanged (A14). Proof: test:contrast with red:contrast, test:m1-light, and parity v3 on the guest Sign-up CTA.
- The journey's own rules (.kp-jcard*, .kp-jhome*, .kp-jhowto*, .kp-howto*, .kp-jsheet__title--lg) match nothing on a classic page. Proof: parity v3.
(c) JS, on every page: the dictionary's new journey.* keys (WP4); shell-lazy's chunk, which imports the guard (WP6); the LazyOverlays module (L1); LiveTicker's chunk, with the journey list and its server prop (WP3 and WP8); and the primer's chunk, with its journey stand-down (WP8). A classic reader's output is unchanged. Proof: parity v3 and qa:served-skeleton.
(d) JS, one route each:
- /: the home's small lazy module joins its first load (WP7, after the TicketSwitchRail precedent). Proof: qa:first-load; qa:chunks-prod reports it on / without failing.
- /positions and /updown/history: the rail wrapper's chunk changes (WP6). Proof: qa:first-load.
- /live: the SearchBox reference the journey arm adds (A21), named if its script list moves. Proof: qa:first-load and qa:served-skeleton --main.
- /account: the kit Input's chunk (A20). A classic reader is served the not-found page. Proof: qa:first-load, and qa:served-skeleton on a classic reader's and a journey reader's /account.
(e) HTML and RSC: none for a classic request. Proof: parity v3 (bodies included) and qa:served-skeleton --main. No new EXPECTED_DIFFS entry is expected; any difference is named or fixed, never re-baselined. An overrule that moves served bytes (A17 item 4's route group, A19 item 4's loading branch) adds its own named rows.

*From:* Critiques 5 and 14; critique 4 (its [E2] part). Second review: the A23 problem and missing item 10 (the done-when and the Summary name L1 and every served-byte change). modal.tsx's render guard is :317-319 since 23f762f4.

### Points for Ali (VODACOM-PLAN §0h point 58)

1. [Replaces Open point 1] Decision: S7 starts only when S6 is closed, on a branch from origin/main at that close. S6 is closed when three things hold. First, A8i-2 and A8j, the two Enter-key money fixes for every player that S6 now does first, are live and read back. Second, the owed proof of A8d, A8g and A8h has run. Third, WP12 is done, with its classic-parity comparisons recorded in §0i. A8i itself has been live since 23f762f4. Overrule: start once A8i-2 and A8j are live and read back, but do only WP0 (the records, the reds, the test repairs and the bar measurements) until §0i records S6's last two comparisons, because WP1's upgraded check can no longer read S6's old baselines. Under the overrule, WP0's points are numbered after S6's last point (57 today). The draft's old overrule, 'start on A8h's commit', is withdrawn: A8h and A8i are both live.

2. [New] Decision: red:simple-journey-flag has been red on main since 9b21bae9, because two of its plants no longer match AppShell's email-bar line. If its owner has not fixed it by WP0, S7 re-anchors the two plants in its own named scripts-only commit before it reads that red twin. Overrule: S7 waits for the owner, and reads none of that twin's AppShell plants until it is fixed.

3. [New] Decision: before S7 changes anything a player sees, WP0 makes two test tools give exact answers. It does this in one scripts-only commit, and no check's logic changes. First, red:ticker-honesty's 28 cases move into scripts/anchors/, so test:red-anchors checks that each still finds its line, and its verdict matches whole check ids (today an expected 11.2 is satisfied by a failing 11.21). Second, test:stacking's five first-visit-tour checks are renumbered 8.1-8.5, so they can no longer be mistaken for the known red z-order check that also prints 6.1. Overrule: leave both tools as their owners wrote them. S7 then re-points only the two ticker cases it breaks (in WP3 and WP8), and reads test:stacking by each check's full wording.

4. [Replaces Open point 24] Decision, in three parts. (a) The above-the-fold check measures the page players will see after launch: the staff-only Preview bar is hidden while measuring, and its height is recorded. (b) Card 1's YES/NO buttons must clear the tab bar with no notice bar up on 360×640, 360×740 and 390×844 phones, and with every notice bar up on 390×844. With every bar up on 360×640 and 360×740, they are measured and recorded, not required. §5 S7 is amended to match. (c) The home keeps the standard 32px top padding, like Tiketi zangu and Akaunti, not the canvas's 8px. Overrule any part: (a) count the Preview bar too; (b) require the two small-phone every-bar cells as well, and give the notice bars a compact phone form, either journey-only and flagged, or for every player in its own live-fix commit with a gate and a red twin; (c) an 8px top on every journey page.

5. [Replaces Open point 22's helpline half and Open point 20's 'links'] Decision: the How-to sheet's foot is 'Weka mipaka' alone, and nothing replaces the helpline. The deck's helpline link (INHERIT-MANIFEST frame 5, SJ-24, L10) is dropped under Ali's own ruling of 2026-10-06 (no helpline on any player surface). Those manifest rows and §0h point 10 are annotated as superseded by that ruling. So is the deposit screen's helpline line (SJ-18), which is S9's work and is never built. Overrule, either: (a) add 'Pumzika / Jizuie' beside Weka mipaka; or (b) a new owner ruling that exempts the sheet: COMPLIANCE-DECISIONS records it, support-contact §15's MAY_READ gains the sheet, and its label is a new journey key other than 'Msaada'.

6. [Replaces Open point 5] Decision: the live odds update for the cards on screen moves from S7 to S8, with the bet sheet's own listener. It needs no change to what the server broadcasts: when the server announces that a market's odds moved and its card is on screen, that card's figures are re-read from the server. Until then, the journey home refreshes every 30 seconds. §3.2 and the §5 S8 entry are amended in WP0. Overrule: build it in S7 as a debounced page refresh inside the home's lazy module, for signed-in journey readers only, with a test and a plant.

7. [Replaces Open point 27] Decision: what a classic visitor is served is proved by parity v3 plus three tracked Node tools added in WP1, each with its own control. The first is a served-HTML skeleton that includes the page body (qa:served-skeleton). The second is a first-load reading of a local build, tied to the commit it was built from (qa:first-load). The third is a production chunks check (qa:chunks-prod). It accepts only the two parts every page already draws in the browser alone (the chat bubble when it is on, and the first-visit tour), and fails anything else drawn that way. These tools replace the WP6c scratchpad tools, so Open point 27's old overrule is now built. Overrule: parity v3 alone, with the raw-HTML and first-load claims recorded in §0j as unproven.

8. [Replaces Open point 28] Decision: the lost-chunk guard moves into one shared module in WP6. The chat bubble and the first-visit primer adopt it in S7's own live fix L1, for every player. L1 is one commit with a journey-shell census, in-process plants, and the qa:lost-chunk drive, which must fail on the parent commit (run one server at a time). Afterwards, a lost chunk there leaves that part out instead of showing the critical-error screen. Overrule: S7 leaves lazy-overlays.tsx untouched, and WP6c owed (8) waits for a later live-fix session.

9. [Replaces Open point 29] Decision: a settled card's time is settledAt ?? resolutionAt, written like every date on S6's ticket card: day and clock, plus the year when it is not this year (formatDeadline). Month names stay English until S12. Overrule: resolutionAt only (the year rule stays either way).

10. [New] Decision: a void card's 'Imebatilishwa' takes the settled label's quieter ink, because no S4 board draws a void card. Only 'Inafungwa leo' and 'Inasubiri matokeo' take the brighter ink. Overrule: the brighter ink, as for a state that needs the reader's attention.

11. [New] Decision: the How-to card's royal plate (choice 3A) is drawn exactly as its board draws it. .btn-primary's literal ramp, lit edge and drop become tokens that both the button and the plate read. Every page receives this stylesheet change with its computed values unchanged, proven by parity and test:contrast. Overrule: a flat --royal-500 plate with no token work, recorded as a departure from the 3A board.

12. [New, beside Open point 20] Decision: the How-to sheet's title is 24px (--type-h2), as its canvas draws it, while the guest Tiketi sheet keeps its canvas's 20px. At 320 the title stays 24 if it holds one line beside the ✕. Otherwise it drops to 20, and the 320 deviation is recorded. Overrule: both journey sheets at 20px, with the How-to size recorded as a canvas deviation.

13. [New] Decision: the home's markup keeps the deck's phone order at every width: the How-to card, then the headline. From 1024, CSS draws the headline first, on one line, as the desktop board does. Tab order is unchanged; only a desktop screen reader hears the card before the headline. Overrule: put the headline first in the markup and raise the How-to card with CSS below 1024. Phone screen readers would then hear a different order from what phones show.

14. [New] Decision: / keeps the generic loading box. The canvas's home skeleton shows only while the home's list is still arriving (a Suspense boundary inside page.tsx, as §3.2 says), and the drive measures it there. If the list never arrives late on a local server, the drive reports 'not measured', and that comes back to Ali before WP12. Overrule: a (home) route group with a loading file chosen on the server (§0h point 21's pattern). That moves src/app/page.tsx, re-points every gate that names it, and changes what classic / is served, which must then be named and proven.

15. [Replaces Open point 15] Decision: the /markets loading file stays untouched in S7. A journey reader's soft hop through a classic /markets link shows today's board skeleton for a moment before landing home. No player sees this before the flip, and the flip re-points those links. Overrule: draw the home skeleton there, on the exact /markets path only, pinned and planted as A19 says.

16. [New] Decision: until S8 builds the journey question page, a journey reader who taps a card sees the same loading skeleton on the way as every reader does today. S8 designs the journey's own. Overrule: give the journey question page its own loading skeleton in S7.

17. [Replaces Open point 14] Decision: Tafuta keeps the Akaunti board's row and opens a search field in place (Lugha's pattern), submitting /?q= to the journey home. That keeps the deck's 'search lives in Akaunti' without putting a search box on the home. Overrule, either: a plain link to /, with no search for journey readers until S15; or the draft's always-open form, recorded as a departure from the board.

18. [New; refines Open points 10 and 12] Decision: a journey reader's /live keeps exactly today's list, in today's order. That includes markets whose selection has closed, drawn as closed cards (SJ-6 sends them there). It keeps its search box, hero and explainer. Only the cards change, and its endless scrolling becomes the deck's 'Onyesha zaidi' (12 more per tap). Classic /live is untouched. Overrule any of: keep the endless 24-card reveal for journey readers (a small lazy client wrapper); order /live like the home (soonest closing first, closed rows last); drop the search box (search lives in Akaunti).

19. [Amends Open point 2's production half] Decision: when asked, S7's production check also signs in once as the unfunded QA player mobile01, and only reads pages, /watchlist and a question page included, so signed-in players are covered too. Nobody else may be signed in as mobile01 during that run. Overrule: production stays signed-out only, S7's done-when says 'nothing changed for signed-out visitors', and the gap is recorded in §0j.

20. [Adds to Open point 13's keep-list] Decision: the /markets redirect keeps welcome=new and welcome=back, so a new account whose next was /markets is still greeted on the journey home (9b21bae9's landing rule). Overrule: drop it like any other parameter; the greeting is then lost on that one path.

### Critique findings not taken as proposed

- No critique finding is rejected outright. All 21 are taken: 2, 8, 9, 14 and 17 in full, and the rest modified. Every problem the second review raised is taken, except the parts named below. Each line below is a part of a fix that was not taken, with the reason.
- Critique 1: 'take the lazy-overlays and rail adoption out of S7, and leave owed (8) to S6 WP12 or a later session' is not the default. Ali's standing rule is to fix a defect platform-wide with its own guard (§0h point 20, VODACOM-PLAN.md:1222-1224). So S7 ships the adoption as the named live fix L1, with a gate, a red twin and a drive (A13). Leaving it is the §0h overrule.
- Critique 2: of 'repair or explicitly quarantine cases 9 and 10', the quarantine is not taken, and the repair is no longer S7's. Main has carried the re-arm since 7d4b0ad5 (9.8 and 9.9 read settledAmount again), so WP0 only confirms red:ticker-honesty's 28/28 (A4 item 1).
- Critiques 4 and 6: 'pin a journey branch in markets/loading.tsx' and 'guard it with x-pathname' are not taken by default, because S7 adds no branch there (A19). Both become the exact rule if Ali overrules A19.
- Critique 7: its evidence 'no dev-test route voids a market' is wrong, so its admin-console drive is rejected. seed-player-portfolio voids its twelfth placed market through emergencyVoidMarket (route.ts:148, :187-188). On a fresh in-memory server that needs a pool of at least 12 questions, which seed-markets supplies (A8).
- Critique 10: the option of pad='none' with the canvas's 8px top is not the default, because S6's journey pages keep the house padding (tickets-view.tsx:87, account/page.tsx:55). It is the §0h overrule (c).
- Critique 11: 'hop through a classic /markets link whose loading draws the ghost' and 'truncate the held flight after the fallback row' are not taken. markets/loading stays untouched (A19), and a held or truncated flight cannot show a fallback that the server never streamed separately. The (home) route group is the §0h overrule, not the default, because it moves src/app/page.tsx, which many gates name.
- Critique 12: 'order the journey /live by close instant, then pool, then id' is not taken. SJ-6's order rules / only (INHERIT-MANIFEST.md:57), and once selection-closed rows are kept, that order would list already-closed rows first. /live keeps today's order (A21).
- Critique 13: 'build the refresh-on-event variant in S7' is not taken. The patch moves to S8, beside the sheet's own SSE listener (VODACOM-PLAN.md:2717-2718), where its load is sized together with the sheet's 10s refetch (A7). Building it in S7 is the §0h overrule.
- Critique 15: the alternative 'let parity v3's captures replace the served-HTML compare' is rejected. Parity reads raw bytes only for journey traces (qa-classic-shell-parity.mjs:491-494 at 7d4b0ad5) and otherwise reads the hydrated DOM, so Suspense markers, streamed segments and bail-outs stay invisible to it. The rest of critique 15 is critique 3's remedy, applied once (A9).
- Critique 16: 'h1 first in the DOM, reordered on phones' is not the default. The DOM keeps the deck's 360 order, and CSS draws the h1 first from 1024 with tab order unchanged (precedent: globals.css:4393-4413). It is the §0h overrule.
- Critique 18: both options (reuse footer.helpline, or record why the sheet may label the helpline 'Msaada') are overtaken. Ali's ruling of 2026-10-06 removed the helpline from every player surface, and 0652f61f deleted footer.helpline (COMPLIANCE-DECISIONS.md:12-46). A6 applies the ruling.
- Critique 19: the example 'both journey sheets at 20px' is not the default. The How-to canvas draws 24 (pick-5-how-to-play.dc.html:40), which is --type-h2 on the CSS scale. It is the §0h overrule.
- Critique 20: the alternative 'a flat --royal-500 plate' is not the default, because it is not the 3A board. It is the §0h overrule.
- Critique 21: the first option, 'a row that leads to a search entry on the home', is rejected. SJ-6 allows no search box on / (INHERIT-MANIFEST.md:57), so Tafuta opens in place instead (A20).
- Critique 5: the alternative 'narrow the done-when to signed-out visitors' is not the default. It is the §0h overrule.
- Second review, A1 (pending-bet.ts): the correction to ':96-97' is not taken. On main, :96 is CODE, and UTM_KEYS and UTM_VALUE are :97-98. A1 now names all three (:96-98).
- Second review, A5 (tickets-view.tsx): the correction to ':86' is not taken. :86 is `return (`; the PageContainer is :87 and RefreshPoller is :88. The refresh-poller.tsx correction is taken (:21, :56-60).
- Second review, A8: '(up-fixture's floor)' is not the source of the 12. up-fixture's floor is 11 (scripts/live/up-fixture.mjs:127-128: five for the portfolio, six for the archive). A8's 12 comes from seed-player-portfolio's own VOID index (:146-149).
- Second review, A14: --shadow-1 to --shadow-5 are globals.css:598-602, not :597-601. :597 is their 'Shadows + glows' comment.
- Second review, A13: importsIn counts static, bare and dynamic imports (journey-shell.test.mts:296-305), not static imports only. The 12.parts.client re-pin is taken all the same, because the guard's static import adds a module that is not a client part.
- Second review, A3: renumbering the primer block to 7.1-7.5 is not taken, because needle.css's prose table already uses 7.1-7.3 (stacking-contract.test.mts:763-777). The block becomes 8.1-8.5.
- Second review, A9: reading the expected bail-out count 'from a capture of the previous deploy' is not taken, because a count read off production would carry forward any boundary that is already broken there. The count comes from the document's own chatbotEnabled (layout.tsx:243).
- Second review, A20: qa:first-load reads one build, with one entry set per route, so it cannot tell a classic reader from a journey reader. The per-reader read of /account is qa:served-skeleton's; qa:first-load lists the route's entry files once.
