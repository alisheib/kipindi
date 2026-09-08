# PLAYER QUERY CAMPAIGN — find anything, on every client-facing page

> ⭐ **THE TRACKER AND THE PLAN OF RECORD. Start at §0, work from §1.**
> A RECORD and a WORK ORDER — **not** design law. The law is
> [`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md); one rulebook, no second one (§0a).
> ⛔ No design token value is restated here. Where a number matters, this file gives the
> command that re-derives it — every register number in the Design Gate rotted at least
> once, and one rotted mid-session.

| | |
|---|---|
| **Opened** | 2026-09-07, on Ali's instruction |
| **Branch** | ⛔ **NONE — `player-query-campaign` was merged and DELETED 2026-09-08. Work from `main`.** |
| **Approved** | the plan in §2–§5, by Ali, 2026-09-07 |
| **Scope** | every client-facing page. ⛔ **Admin explicitly excluded** — §11 |
| **Merged?** | ✅ **YES — stages 1–3 and tasks 4.1–4.5 are LIVE on 50pick.tz** (`main` `4e667633`, deploy `107e28f6`, 2026-09-08 11:22 EAT). The remaining tasks are NOT built. |

---

## §0 — RESUME AT

```
▶ NEXT ACTION — task 4.10 in the board below.
  /positions/performance: product lens All / Polls / Up & Down.
  ⛔ IT IS NOT A LIST AND IT TAKES NO PROPS. `performance/page.tsx` has no searchParams,
     no pager and no rows to filter — it is five money tiles, a P&L chart and a
     hardcoded `.slice(0, 5)` of recent settlements. Every aggregate (net P&L, win rate,
     ROI, avg stake, total staked, both streaks, the whole pnlSeries) is computed BEFORE
     any market is fetched, so a product lens cannot be cross-filtered from the current
     read at all.
  ⛔ AND `productLine` IS NOT ON THE POSITION — it is on the MARKET. The page reaches it
     only per-row, after a `getMarket` join, and only for the best-win market and the
     ≤5 recent ones. Two honest routes: pass `productLine` into `listPositionsForUser`
     (already supported, third arg, indexed join) and read twice for the counts, or bulk
     -join every settled position. Decide which, in writing.
  ⚠️ THE BOARD CALLS THIS "the one player list that mixes both product lines" AND THAT IS
     FALSE — /live says in its own source that IT is the one board that opts into both,
     and `product-line.test.mts` pins that in a gate. This page mixes them INSIDE one
     ROI-style aggregate, which is the worse case, but it is not the only one.
  One commit per route.

  ⛔ BRANCH OFF `main`. There is no campaign branch any more — what was built is LIVE.
```

**Stage 4 of 6. Stages 1–3 CLOSED (12/12, 7/7, 8/8). 4.1–4.9 done; 5 routes left.**

> ⭐ **EVERYTHING BUILT SO FAR IS ON PRODUCTION** (2026-09-08, `main` `4e667633`). The branch
> was merged and deleted, so a session that goes looking for `player-query-campaign` will not
> find it and must not recreate it from an older base. `git checkout -b <new-lane> main`.
>
> ✅ **DEBT ② IS PAID (2026-09-08, with task 4.6).** The §1 stage headings now read `(6/14)`,
> `(0/4)` — which was always accurate, Stage 5 has genuinely not started — and
> `(3/9 — 6.5, 6.6, + qa:bar-geometry)`, matching the board above rather than contradicting it.
> §5's four core files are ticked, `windows.ts` is listed, and the contract list is re-derived from
> disk with the command that re-derives it: it used to hand out `src/lib/watchlist/query.ts`, a
> path that has never existed.
>
> ⚠️ **DEBT ① IS STILL OPEN.** `qa:bar-geometry` is counted toward Stage 6 but has **no RED
> control**, which Stage 6's own exit condition requires ("each new guard's RED control has been
> *seen to fail*"). The three geometry defects it found were fixed on the strength of an
> unreproducible hand mutation. ⛔ Build its control before crediting it — and note that
> `QUERY_GROUP_CLASS`, the constant created BY that fix, still has **one adopter**: fourteen
> `<nav>`s across six other bars carry the unrepaired `hidden shrink-0 items-center gap-1 lg:flex`.
> The repair landed in a constant and was never rolled out.

### What task 4.5 found — read before 4.6

⭐ **A PAGE CAN BE MOSTLY RIGHT, AND THE CAMPAIGN'S JOB IS THEN TO CHANGE LESS, NOT MORE.**
`/notifications` already had real cross-filtered counts, a rail that wraps rather than scrolls
(with a note recording that a scroller had hidden the SAFETY lens at 360), and a written analysis
of lens overlap. ⛔ Its five lenses were kept **verbatim**. What was missing was the hook, a
search, and a sort that is a sort.

🔴 **ITS SORT WAS A SECOND PILL RAIL** — two stacked `<nav>`s, identical in shape, one filtering
and one ORDERING. That is the §A5/§7g confusion by name, sitting *inside the population of the
gate named for it*: `test:section-rail`'s floor fell **9 → 7** when they left, two at once.

⭐ **THIS ROUTE'S SEARCH RUNS IN SQL, AND THAT IS FORCED.** `notification-service.ts` measures the
inbox as unbounded — *"20 rows to one player in an hour, and 360/day if a 3-minute chain runs"* —
so the read-all-and-filter-in-JS shape every other route uses is not available.
`NOTIFICATION_SEARCH` is the only PLAYER schema that is not a `viewModel`.
⛔ **A SQL-SIDE SEARCH MUST NARROW THE COUNTS BY HAND.** A JS-side one gets it free; all five
count queries carry the search fragment, or every pill over-promises the moment a player types.

🔴 **AND THE SEARCH ARRIVED CARRYING A LIE.** `?q=zzzznomatch` rendered *"No notifications yet —
We'll buzz here when a bet settles or a market resolves"* over an inbox holding **71 rows**. Five
per-lens empty sentences, each correct about a LENS and each wrong about a SEARCH. ⚠️ **Adding a
filter adds an empty CAUSE — check every existing empty state the same day.**

⛔ **NOT EVERY ROUTE BELONGS IN `qa:player-filters`, AND THE REASON IS NOW IN THE DRIVER.** These
lenses answer three different questions, so DISJOINT is false *by design*. Declaring a partition
that is not there would make a correct page report a real failure; the omission is documented so
nobody "fixes" it.

⭐ **KEEPING THE OLD `testId`s WAS WORTH MORE THAN THE NAMING CONVENTION.** `qa:notifications-page`
addresses these pills by `notif-filter-<id>` and its **210 assertions** stayed green through the
whole rewrite. A convention is a convention; a working instrument is evidence.
**Stage 6 tasks 6.6 (`qa:count-truth`) and a NEW `qa:bar-geometry` LANDED EARLY — see below.**

### ⭐ `qa:bar-geometry` — the gate that measures what a person sees, and the three defects it found

⛔ **IT CLOSES THE HOLE §2 NAMED IN WRITING.** The `/markets` 44px overlap shipped with *every
automated check green*: the DOCUMENT does not overflow, so `test:responsive` passed; the radius
and tap floor were untouched, so `qa:filter-scan` passed. **Neither asks whether two controls
occupy the same pixels, or whether a control has fallen off the screen.** This does, per surface ×
width × locale, and it captures the bar as an image beside every measurement.

Three defects on its first two runs, none of which any existing gate could see:

1. 🔴 **`/proposals sw 1280: CLIPPED "Mchanganyiko / Zote" 1239→1442 vs viewport 1280`** — 162px
   off the right edge, in Swahili, at desktop width. ⚠️ **Not a `/proposals` bug — a LATENT one
   everywhere:** every bar hand-wrote its desktop group as `shrink-0` with no wrap, and only that
   route has EIGHT categories *and* the platform's longest pill label. `QUERY_GROUP_CLASS` owns
   that wrapper now.
2. 🔴 **THREE ROUTES DREW A SEARCH BAND STRAIGHT THROUGH THE BAR — 91px of overlap.** Both stuck
   at `top-[56px]`, and **two sticky surfaces cannot share one offset.** ⛔ The clearance used to
   exist: `/results`' retired sidebar sat at `top-[122px]` precisely to clear it, and **task 4.2
   deleted that arithmetic without replacing what it was buying.** Fixed on all three at once —
   one defect, one cause.
3. 🔴 **`/updown/history` reported `bar@-252` while every other surface reported `bar@56`.** Its
   bar sat inside a **247px wrapper**, and a sticky element only sticks within its PARENT's box —
   so it unpinned after a quarter of a screen, on the one route that renders four hundred rows.

⚠️ **NONE OF THE THREE IS VISIBLE AT SCROLL 0, WHICH IS WHERE EVERY SCREENSHOT IN THIS CAMPAIGN
HAD BEEN TAKEN.** The stick assertion is mutation-proven: putting the bar back inside the short
wrapper reports `top -52`; taking it out reports `top 56`.

⭐ **AND THE INSTRUMENT WAS RUN AGAINST THE REFERENCE FIRST.** Its first draft reported EIGHTEEN
defects on `/markets` and every one reproduced there — both were exemptions this repo had already
written down (a closed `<details>` still lays out; a control in a scrolling strip is not clipped).
**Run a new instrument against the reference surface first. If the reference fails, the instrument
is the defect.**

### 🔴 `/results` WAS SHOWING TWO SETTLEMENTS TWICE, AND ONLY A NEW GATE COULD SEE IT

`notableList` took the archive's three highest-volume markets from **`all`**, but `notableIds` was
subtracted only from **page 1's** slice. So a high-volume market whose natural position was page 2
rendered in page 1's carousel **and again in page 2's grid**. Measured before the fix: page 1
carried 14 rows against page 2's 8, and paging the archive showed the same two settlements twice.

⛔ **NOTHING ALREADY IN THE PIPELINE COULD HAVE FOUND IT.** `data-result-count` was right; every
lens assertion was right; every survivor belonged to its lens. Only the PARTITION ACROSS PAGES was
broken — a property no single page can observe.

⚠️ **AND IT WAS INVISIBLE UNTIL TASK 4.2 REPAIRED THE INSTRUMENT.** Before that fix the carousel
rendered only `slides[current]` and `FeaturedResult` carried no row identity, so two of the three
duplicates were not in the DOM at all — the page UNDER-reported instead of double-reporting.
⭐ **Repairing an instrument exposes what it could not see. The second finding is not a regression
from the first.**

The fix promotes from **within the page** (`[...paged]`, not `[...all]`). ⛔ Lifting the notables
out of the pageable list instead would make the pager count a different population from the bar —
*"1–12 of 19"* under a bar promising 22 — i.e. two totals for one question.

### ⭐ `qa:count-truth` + `red:count-truth` — task 6.6, landed here because this is where it earned it

Shipping a fix without the guard that found it is what this repo forbids. It reads every pill's
`data-count`, follows the href, walks EVERY page, and checks three things: the promise is
delivered, the destination agrees with its own `data-result-count`, and **no row is counted
twice**. Green: **98 pills across all six rail surfaces, 0 failed.**

⛔ **ITS RED CONTROL FOUND A REAL HOLE IN THE DRIVER ITSELF, WHICH IS THE WHOLE ARGUMENT FOR RED
CONTROLS.** The walk stopped on `ids.length >= promised` — **the very number under test**. A page
that over-renders therefore ended the walk early, and whatever it double-counted on a later page
was never fetched: the `pages-overlap` mutation slipped straight through a gate that looked
correct. ⭐ **A stop condition derived from the thing being measured cannot measure it.** The end
of a list is now detected from the product's own clamp (`safePage` re-serves the last page, so an
identical id sequence means "no more pages"). 4/4 mutations caught, tree restored byte-identical.

⚠️ **AND TWO MUTATIONS HAD TO BE REPAIRED BEFORE THE PROOF MEANT ANYTHING.** The verbatim `/results`
defect **stayed GREEN** — on that fixture all three notables happened to land on page 1, so the
mutated and correct code picked the same three. A mutation that reproduces its defect only on some
data is a red proof that passes by luck. It is now deterministic, **and it declares the fixture
shape it needs** (`?product=all`, which crosses a page boundary where the default view does not),
so an un-posable case reports 🔶 rather than failing wrongly — `qa:player-filters`' third outcome,
borrowed.

### What task 4.3 found — read before 4.4

⛔ **A LENS SET IS THE CARD'S CHIP LADDER, AND THE PLAN UNDERCOUNTED IT FOR THE THIRD TIME.**
The board said `/watchlist` gets `All · Live · In progress · Settled`. Both middle words were
wrong, and **both corrections came from copy already in the tree rather than from reasoning**:

- 🔴 **`i18n-dict.ts` ALREADY FORBIDS THE WORD "LIVE" HERE**, in its own note on `statusOpen`:
  *"`statusOpen` is NOT `statusLive`. A market can be LIVE and no longer taking bets, and the
  card already labels exactly that case 'Closed'."* A `Live` pill on a watchlist collects
  markets a player can no longer act on — the confusion this campaign exists to remove.
- 🔴 **"Settled" IS ONE WORD FOR TWO OUTCOMES.** The campaign's own complaint ends *"cannot tell
  won from lost from **voided-and-refunded**"*. Folding `VOIDED` into `Settled` re-commits that
  defect on the page that names it. Five lenses: `all · open · progress · done · void`.

⭐ **AND COVERING IS NOW BY CONSTRUCTION, NOT BY ENUMERATION.** `progress` is the RESIDUAL arm —
*not open and not settled* — so every value of `PredictionMarketStatus` lands in exactly one lens
**including `DRAFT`**, which `createMarket` never writes but `@default(DRAFT)` keeps alive. ⚠️ A
four-status enumeration would have dropped such a row into no pill at all. ⛔ Do not "simplify"
a residual arm into a status list.

🔴 **`/watchlist` IS THE ONLY PLAYER BOARD THAT SPANS THE WHOLE LIFECYCLE.** `/markets` reads the
unsettled book, `/results` the terminal archive — each can assume away half. A star survives
settlement, so this page can assume nothing. That is why its lens set partitions all five
statuses while every other route's partitions one half.

🔴 **ITS READ WAS UNBOUNDED ON A PAGE THAT POLLS EVERY 20 SECONDS.** `listMarkets({productLine:
"ALL"})` — no limit, no status filter, the ~13,000-row table `attribution()` measures at 2,534 ms
for ONE read — to keep a dozen starred rows and discard the rest, **three times a minute per open
tab**. It is now `playerMarketsByIds`, one indexed read of exactly the ids. ⚠️ **THE OPTIMISATION
NEARLY REPEALED A PRODUCT RULE:** `listMarkets` drops `Demo · ` fixtures from every player
listing, so the replacement had to apply `isDemoMarket` itself or a starred demo would reappear
on one board and no other. **A faster read is a different read — check what the old one filtered.**

⚠️ **`MarketCard` ALREADY EMITS `data-row-id`.** A wrapper adding it too would have put TWO
matching nodes per market in the DOM: set arithmetic survives that, but anything that COUNTS the
attribute reports exactly double — `/results`' "promised 8, delivered 5" with its sign reversed.
**Check the component before instrumenting around it.**

⛔ **AND THE INSTRUMENT WAS WRONG BEFORE THE PAGE WAS.** A fresh overlap/clipping probe reported
18 defects on `/watchlist` — and reproduced every one of them on `/markets`, the reference bar.
Both classes were artifacts this repo had already paid for and written down: a **closed
`<details>` still lays out its subtree** (`clip.mjs`'s exemption 2), and a control inside a
**horizontally scrolling strip** is not clipped when it runs past the viewport. ⭐ **Run a new
instrument against the reference surface first. If the reference fails, the instrument is the
defect.**

🔴 **`/results` HAD BEEN OVER-PROMISING ITS OWN COUNT BY THREE.** `data-result-count` said 8
while the document held 5. The notable carousel rendered `{slides[current]}`, so on page one up
to TWO settled markets existed nowhere in the DOM, and `FeaturedResult` — a second code path
from the grid — carried no row identity. ⛔ The page's own note said its total *"cannot be
reconstructed from the DOM"*, which is the opposite of what §3 rule 5 publishes it for.
**Only `qa:player-filters` found it; every static gate was green.**

⭐ **A LENS SET MUST COVER ITS PARENT, AND TWICE NOW THE PLAN UNDERCOUNTED IT.**
`/updown/history` needed a SIXTH lens the plan had not named — a round whose bets have settled
but whose settlement PRICE is still being confirmed is none of up/down/void, and the card has
always had a fifth chip for it. Read the CARD's chip ladder before writing a lens set.

⛔ **A WORD THAT VARIES BY PRODUCT CANNOT SIT IN ONE RAIL.** `/results`' outcome lens is
withheld entirely under `?product=all`, because "Yes won" and "Up won" cannot both be the label
— E-169 is that defect already shipped once.

⚠️ **Three gates went red for the right reason and none was loosened:**
`test:search-adoption` refused a hand-rolled `.toLowerCase().includes()` (it became
`UD_ROUND_SEARCH` through the shared grammar); `test:section-rail`'s floor stepped 15 → 14 → 10,
each in the commit that moved the rail — ⚠️ **and the first attempt GUESSED 12 when the real
population was 10. Re-derive, never predict.**

⭐ **`qa:player-filters` NOW HAS A THIRD OUTCOME.** Some arms need the fixture to hold a
particular shape — "at least one lens is present but not universal" cannot be exercised when
every row sits in one lens. ⛔ Reporting that as a FAILURE is a false finding about working
code; reporting it as a PASS is vacuous green. It prints 🔶, counts separately, never adds to
`pass`, and is named in the summary.

⚠️ **THE INSTRUMENTATION CONTRACT IS NOW THREE ATTRIBUTES, and a new row type must carry the
third or the driver refuses to run:** `data-result-count` on the bar, `data-chip`/`data-count`
on each pill, and **`data-row-id` on every row**. It is read without regard to visibility, so
disjoint/covering can be proven over SETS rather than by parsing a visible word — which would
only work in English.

### The shape every remaining route follows

⭐ **THE PATTERN IS SETTLED — copy `/positions` or `/wallet`, do not re-invent it.** A route
needs four files' worth of work and no more:

1. **a contract** in `src/lib/<area>/…` over `lib/query` — ids, defaults, predicates, a sort
   spec, exits. ⛔ Pure: no server imports, no words.
2. **a `<route>-bar.tsx`** beside the page. ⛔ It carries `data-filter-rail` and renders
   `<FilterPill>` **in its own source** — `test:filter-language` §0.5/§3.1/§3.2 require it of a
   declared surface, which is why `components/ui/query-bar.tsx` owns the MECHANISMS and never
   the controls.
3. **the page** — parse, decorate, filter, count, sort, page. The counts come from the same read
   as the rows, so a count cannot disagree with the list under it.
4. **the four declarations** in §6, in the SAME commit.

⚠️ **Two rulings from Stage 3 generalise, and both would be easy to get wrong again:**

- 🔴 **Grep for who WRITES a param before naming one.** `/wallet` uses `?state=` and not
  `?status=` because `wallet/deposit/actions.ts` already redirects to
  `/wallet?deposited=…&status=…`. A filter on `?status=` would have silently narrowed the
  wallet of every player returning from a deposit.
- 🔴 **Filter the STORED enum, never a display token.** `adaptTxn` folds `BONUS_CREDIT` into
  `deposit`, so a lens built on the token would have told a player their bonus was a deposit.

⚠️ **And a cap is detected by reading CAP + 1 rows**, never `rows.length === CAP` — otherwise a
player with exactly the cap is told their history was truncated when it was complete.

### What Stage 2 found — read before Stage 3

🔴 **A DEFECT `/markets` HAD ALREADY SHIPPED, AND ONLY A SCREENSHOT FOUND IT.** At 360 the
44×44 sort-direction button was drawn **on top of** the sort label. Measured before the fix:

| route | summary | direction button | overlap |
|---|---|---|---|
| `/markets` **sw** | 16→255 | 154→198 | **44px** |
| `/markets` **en** | 16→218 | 166→210 | **44px** |
| `/markets` **zh** | 16→162 | 162→206 | 0 (short labels escape) |

⛔ **Every automated check was green over it.** The DOCUMENT does not overflow
(`scrollWidth === clientWidth === 360`), so `test:responsive` passed; the pill radius and the
44px floor were untouched, so `qa:filter-scan` passed. ⚠️ **And the first fix was wrong** —
`shrink` changed nothing, because the summary is not a flex item (its parent `<details>` is a
plain block). `w-full` is what binds it. **Re-measure, do not re-reason.**

⭐ **THE PAGE IS THE PROOF, NOT THE SUITE.** Re-derive on any converted route:

```bash
MSYS_NO_PATHCONV=1 node scripts/live/player-query-shots.mjs $BASE --only=/positions   --widths=360,1280 --locales=sw,en,zh
```

It refuses to shoot the wrong language (reads `<html lang>` back) and refuses to shoot a page
whose rail is absent — because **a fixture gap and a broken rail look identical in an image.**

⚠️ **Three gates went red for the right reason and were re-anchored, never loosened:**
`test:stacking` (the `z-20` moved into `QUERY_BAR_CLASS` — re-anchored onto the shared
constant, which now guards all sixteen routes rather than one), `test:section-rail`'s
population floor 15 → 14 (the rail is behind a `Chip` alias, the shape `/markets` has had
since batch 5), and three `red:filter-language` anchors followed the rail to its new file.
⭐ **And `red:filter-language` caught MY file:** `unhooked-rail` stayed GREEN because the bar
imported from `filter-pill` twice, so deleting one import left §3.1 satisfied.

### What Stage 1 cost, and what it found — read before Stage 2

⛔ **Three things were only found because a RED control refused to agree with its gate.** All
three are the same disease: a check adjacent to the truth.

1. 🔴 **`red:filter-language` was RED at HEAD, inherited from `main`.** `c977204e` gave
   `filter-sheet.tsx` a second effect closing `}, [open]);`, so case 20's anchor matched twice
   and refused to inject. The refusal was the smaller half: assertion **5.6 was vacuous** — a
   bare `/\}, \[open\]\);/` over the whole file — so mutating the FOCUS effect would have left
   the OTHER effect satisfying it and the gate would have stayed **green over the reintroduced
   money-dialog focus defect**. Both halves re-keyed onto the focus effect's own three lines.
2. 🔴 **The first refactor disarmed a proof and every other signal said it was fine.**
   `sortRows` was collapsed to `sortBy(SORT_SPEC, …)`: typecheck clean, orderings
   byte-identical, `test:discovery-contract` green — and `ties-left-to-sort-stability` went
   from RED to GREEN, because the product had stopped calling `compareRows` while the gate
   went on importing it. ⭐ **The product path must BE the proved path.**
3. 🔴 **Two dev fixtures had been silently vacuous since KYC became a money gate (2026-09-05).**
   `stress-bulk-bet` had every bet rejected and reported `poolMath: "PASS"` — 0 ≡ 0 when
   nothing is accepted. And nothing could give a **signed-in** player a portfolio, so
   `/positions` hid its rail and the scan reported *"0 `data-filter-rail`, expected 1"*:
   ⛔ **a fixture gap and a missing rail are indistinguishable from outside.**

⭐ **`test:query-core`'s own RED control then found two of ITS assertions vacuous** (15/17 on
the first run) before either was believed. Both repaired; 17/17.

⚠️ **`discovery.ts` keeps three lines it could have delegated** — in `compareRows`, `countFor`
and `buildDiscoveryHref` — because `red:discovery-contract` is anchored on them and
`scripts/discovery-contract-red.mjs` reads ONE file, so those anchors cannot follow the rules
into `lib/query/`. §8's rule is that the gate does not bend. ⭐ **So the duplication is a
CHECKED EQUIVALENCE, not a comment:** `test:query-core` §7 asserts the copies and the core
agree over 432 comparator pairs and 5,184 URLs. Read the note at each of the three sites
before touching them.

⛔ **`components/ui/query-bar.tsx` does not render your pills for you, and that is forced by a
gate that is right.** `test:filter-language` §3.1/§3.2 require every declared surface to import
`filter-pill` and render `<FilterPill>` **in its own source**, and §0.5 that it carry
`data-filter-rail` literally. A bar that swallowed both would make every page it serves
invisible to the gate — §6's blind spot, built deliberately. **It owns the mechanisms; the page
owns the controls.**

### The fixture every live run from here depends on

⛔ **A live gate over an empty product is a SKIPPED RUN, not a pass.** Re-derive the data before
believing any drive:

```bash
curl -s -X POST $BASE/api/dev-test/seed-real-markets
curl -s -X POST $BASE/api/dev-test/seed-markets
curl -s "$BASE/auth/demo" -c cj.txt -o /dev/null -L
curl -s -X POST $BASE/api/dev-test/seed-player-portfolio -b cj.txt \
     -H 'content-type: application/json' -d '{"markets":14,"stake":1500}'
curl -s -X POST $BASE/api/dev-test/updown-seed -H 'content-type: application/json' -d '{}'
```

`seed-player-portfolio` drives the REAL money paths and returns `byStatus` **read back from the
store, never from its own plan** — so it reports what the product produced, not what it meant
to. It must show all five `PositionStatus` values before a lens over them proves anything.

### Find the repo on this machine

⛔ **Do not copy a path out of this file.** `CLAUDE.md` records that the repo path has been
wrong on two machines in three days — *"the path is not a fact about the project, it is a
fact about the machine."* Ask the shell:

```bash
hostname && pwd && git rev-parse --show-toplevel && git branch --show-current
git fetch && git checkout player-query-campaign
```

### The stage board

| # | Stage | Exit condition | State |
|---|---|---|---|
| 1 | **The core** | the six existing gates in §8 green **with no edits to those scripts** | ✅ **12/12** |
| 2 | **`/positions`** | `qa:player-filters` + `qa:count-truth` green on it; 360 Swahili screenshot looked at | ✅ **7/7** |
| 3 | **`/wallet`** | same, plus the 1,000-row cap is stated to the player | ✅ **8/8** |
| 4 | **The other 13 pages** | every census-A and census-B route done, one commit each | ▶ **9/14** |
| 5 | **The status dictionary** | `position-card.tsx` has no hand-typed tone; `test:gold-is-money` still green | ☐ 0/4 |
| 6 | **Guards + docs** | the full §8 sweep passes and each new guard's RED control has been *seen to fail* | ▶ **3/9** (6.5, 6.6, + `qa:bar-geometry`, unplanned) |

---

## §1 — THE WORK, in order

Every task names its files. A task is done when it typechecks, its stage's gates are green,
and — for anything visible — its 360 Swahili screenshot has been looked at.

### Stage 1 · the core — no user-visible change (✅ 12/12, CLOSED)

| | Task | Files |
|---|---|---|
| ☑ | **1.1** parse primitives — `oneParam` · `oneOf` · `parseDir` · `clampText` | `src/lib/query/parse.ts` |
| ☑ | **1.2** the comparator — `SortSpec` · `compareBy` · `sortBy` · `effectiveDir`. Null-last in **both** directions, explicit tie-break, `id` final | `src/lib/query/sort.ts` |
| ☑ | **1.3** the href builder — `buildQueryHref`, defaults **omitted**, `page` dropped on any filter change | `src/lib/query/href.ts` |
| ☑ | **1.4** the cross-filter rule — `matchesAll` · `countFor`, predicates take `(row, state)` so a patched count reads the patched state | `src/lib/query/counts.ts` |
| ☑ | **1.5** empty causes — `relaxations`, exits carry real counts, capped at 3, never an exit to another empty page | `src/lib/query/empty.ts` |
| ☑ | **1.6** refactor the reference onto the core — **behaviour-identical** | `src/lib/markets/discovery.ts` |
| ☑ | **1.7** refactor the second contract — its `parseFilter`/`parseSort` become `oneOf` | `src/lib/notification-filters.ts` |
| ☑ | **1.8** the shared bar MECHANISMS — root class, lens strip, sort+direction, option row, result count, clear. ⛔ **Not** a bar that renders the pills; see §0 | `src/components/ui/query-bar.tsx` |
| ☑ | **1.9** `DiscoveryBar` becomes a binding of them, keeping the literals §5.16–5.22 pin | `src/components/markets/discovery-bar.tsx` |
| ☑ | **1.10** `test:query-core` — 65 assertions, incl. §7's two equivalences | [`scripts/query-core.test.mts`](../scripts/query-core.test.mts) |
| ☑ | **1.11** `red:query-core` — 17/17, and it found 2 of the gate's own assertions vacuous first | [`scripts/query-core-red.mjs`](../scripts/query-core-red.mjs) + [anchors](../scripts/anchors/query-core.anchors.mjs) |
| ☑ | **1.12** run the exit condition — all six green, none edited | — |

† **Why the planned gates are named without their directory, here and in Stage 6.** They
live under `scripts/` with every other gate — but `test:docs` resolves **every** `scripts/…`
path written anywhere in `docs/` against the disk, and it went red on eight of them the
moment this board was first written. That is the guard behaving correctly: a doc that cites
a file which does not exist is a doc that hands out a path nobody can follow. ⭐ **The npm
key is the real handle anyway** — `test:all` enumerates `test:*`, so *declaring the key is
what registers the gate*. Write the full path only once the file exists.

⛔ **No barrel file.** Import `@/lib/query/sort` directly, never `@/lib/query`. `CLAUDE.md`
records what a convenience re-export costs here: `audit.ts` was reachable from the CLIENT
graph, so importing `hashKey64` from `locks.ts` pulled `node:async_hooks` into a browser
chunk and **broke the build**. `discovery.ts`'s header already forbids server imports for
the same reason; a barrel is how one arrives by accident.

⛔ **Stage 1 changes nothing a player can see, and that is provable.**
`test:discovery-contract`, `red:discovery-contract`, `test:filter-language`,
`red:filter-language`, `qa:discovery-probe` and `qa:filter-scan` must all stay green
**without editing those scripts.** If one needs an edit to pass, **the refactor is wrong —
not the gate.**

### Stage 2 · `/positions` — the complaint (✅ 7/7, CLOSED)

| | Task | Files |
|---|---|---|
| ☑ | **2.1** the contract — lens · sort · sheet axes · empty causes | `src/lib/positions/portfolio.ts` |
| ☑ | **2.2** `POSITION_SEARCH` schema, **`viewModel: true`** | `src/lib/search/fields.ts` · `src/lib/search/index.ts` |
| ☑ | **2.3** batched title read, and delete the per-position loop | `src/lib/server/market-dal.ts` · `market-service.ts` · `positions/page.tsx:73-79` |
| ☑ | **2.4** the page on `QueryBar`; page the **open** list too | `src/app/positions/page.tsx` |
| ☑ | **2.5** skeleton parity — same tier, same rail height, so the page does not move on load | `src/app/positions/loading.tsx` |
| ☑ | **2.6** keys in **all three** locales, one edit | `src/lib/i18n-dict.ts` |
| ☑ | **2.7** declare the rail in the **four** places in §6 | 3 scripts + the page |

**Lens** `?tab=` — seven pills, one strip (Ali's ruling):

| Pill | value | means |
|---|---|---|
| All | *(default, omitted from the URL)* | everything |
| Open | `open` | `OPEN` |
| Settled | `settled` | the union of the four below — **today's `?tab=settled` links keep working** |
| Won | `win` | `WIN` |
| Lost | `loss` | `LOSS` |
| Refunded | `void` | `VOID` — the word a player reads comes from the lexicon (`t.common.voided` / `t.market.udPosRefunded`), ⛔ **never the enum** (§L3) |
| Cashed out | `cashed` | `CASHED_OUT` |

**Sort** `?sort=` + `?dir=`, direction tri-state:

| id | key | natural | note |
|---|---|---|---|
| `recent` | `placedAt` | desc | default |
| `stake` | `stake` | desc | |
| `return` | `finalPayout − stake` | desc | **`null` for OPEN** → last in BOTH directions. ⛔ Never `?? 0` — that lands them last descending and **first** the moment the player flips it |
| `closing` | `selectionClosedAt ?? resolutionAt` | asc | the clock the card SHOWS is the clock it is sorted by |
| `market` | title | asc | locale-collated |

**Sheet — three groups, the same count `/markets` carries:** `SIDE` (Any · Yes · No, via
`sideWord`) · `TOPIC` (the 7 `MARKET_CATEGORIES`, **derived, never re-typed**) · `WHEN`
(`PLAYER_PRESETS`, which is written and has zero call sites today).

**Empty causes:** `search-miss · window-miss · filter-miss · lens-empty · no-positions`.
`lens-empty` on *Refunded* reads *"nothing of yours has been voided"* — a **healthy** state,
not a failure, and the same reasoning `/markets` applies to an empty `progress` board.

⚠️ **2.3 IS LOAD-BEARING, NOT AN OPTIMISATION.** Searching by title needs titles for
**every** position, not only the twelve rendered, and the page issues one `getMarket` per
rendered position today. Add `titlesByIds(ids)` beside the existing `poolsByIds` and
`bookByIds` in `market-dal.ts` — a narrow projection: id, the three titles, category,
status, both deadlines. **The page ends up faster than it is now.**

### Stage 3 · `/wallet` — the second complaint (✅ 8/8, CLOSED)

| | Task | Files |
|---|---|---|
| ☑ | **3.1** the contract — type lens · status lens · window · search | `src/lib/wallet/ledger.ts` |
| ☑ | **3.2** a windowed, filtered player-transaction read | `src/lib/server/prisma-dal.ts` |
| ☑ | **3.3** move `tab` and `page` out of React state into the URL | `src/app/wallet/page.tsx` |
| ☑ | **3.4** the bar; the three `Tabs` **stay** a section rail | `src/app/wallet/wallet-client.tsx` |
| ☑ | **3.5** state the row cap to the player when it bites | `wallet-client.tsx` |
| ☑ | **3.6** bonus grants — lens + "show all" | `wallet/page.tsx` · `wallet-client.tsx` |
| ☑ | **3.7** keys in all three locales | `src/lib/i18n-dict.ts` |
| ☑ | **3.8** declare the rail in the four places | 3 scripts + the page |

🔴 **Filter the stored `TxnType`, never the UI token.** `wallet/page.tsx:22-30` deliberately
folds `BONUS_CREDIT` and `ADJUSTMENT_CREDIT` into `deposit`, and `CASHOUT` and `HOUSE_FEE`
into `payout`/`withdraw`, because that token drives the credit/debit sign and the receipt
link. **Filtering on it would tell a player their bonus was a deposit.**

Lenses: `All · Money in · Money out · Bets · Payouts · Refunds · Bonuses · Adjustments`,
plus `Commission` **only for an account that has any** — a rail that offers a lens which
can only ever be empty is a dead end, not a filter.

Status lens, in the sheet: `Any · In flight · Confirmed · Failed · Reversed`. All seven
`TxnStatus` values are already labelled 1:1 on screen and **not one is filterable today.**

🔴 **The cap is silent and must not stay silent.** Re-derive it:
```bash
grep -n "findByUser(session.userId" src/app/wallet/page.tsx
```
`/updown/history` is the honest precedent — it tells the player when its own cap bites
(`updown/history/page.tsx` `capped`, and the banner below it). Do the same, then let 3.2's
windowed read make real paging cheap.

⚠️ **Bonus grants.** The wallet renders only `ACTIVE | QUEUED` and then only the first few.
Re-derive:
```bash
grep -n "BonusGrantStatus" -A 12 prisma/schema.prisma | head -20
grep -n "grants.slice\|status: {" src/app/wallet/page.tsx src/app/wallet/wallet-client.tsx
```
Five of the seven statuses are invisible on **every** player surface, so a player cannot see
a bonus they were granted and lost.

### Stage 4 · the other thirteen pages (9/14)

One commit each, in this order. Same bar, same nine rules.

| | Route | What it gets |
|---|---|---|
| ☑ | **4.1** `/updown/history` | lens `All · In play · Up wins · Down wins · Refunded`; sheet Asset · Duration · When (the day rail folds into the window); sort; paging. The 400 cap **stays stated** |
| ☑ | **4.2** `/results` | lens `All · Yes won · No won · Refunded`; sheet Product · Topic · When; direction on the existing two sorts. ⚠️ **retires the desktop sidebar** — see below |
| ☑ | **4.3** `/watchlist` | lens `All · Open · In progress · Resolved · Void` — ⚠️ **FIVE, and the plan's `Live`/`Settled` were both wrong**; sheet Topic; 4 sorts (`starred` default = today's order); search; paging. 🔴 Also replaced an **unbounded 20-second-polled board read** with `playerMarketsByIds`. See above |
| ☑ | **4.4** `/proposals` | lens `All · Under review · Changes requested · Approved · Live · Resolved · Declined` — SEVEN, and COVERING is enforced by the TYPE system (`Record<ProposalStatus, …>`); sheet Mine · Topic · When; 3 sorts; search. 🔴 The old rail asked THREE questions at once (`hot`/`new` were ORDERINGS), and its default view was gated on **200 net votes**. Legacy `?f=` proven equivalent row-for-row |
| ☑ | **4.5** `/notifications` | the `data-filter-rail` hook it had NEVER carried, + **search that runs in SQL** (the inbox is unbounded — 360 rows/day), + the sort moved out of a second pill rail into the shared control. ⛔ Lenses kept VERBATIM — they were already right. 🔴 The new search arrived saying *"No notifications yet"* over 71 rows |
| ☑ | **4.6** `/profile/account` | counts on the existing category rail; When; sort; search. 🔴 Its read was the **in-memory audit ring** — 10,000 rows GLOBALLY, per-container, emptied by every deploy — so the counts this task adds would have been an accident of uptime. `getAuditForActorDurable` now, which also repairs the **GDPR Art. 15 export** that read the same ring. 🔴 `?act=` was passed through unnarrowed (`?act=lol` emptied the table with nothing to clear it), and the rail hid itself below TWO categories while the filter stayed applied. 🔴 The stored enum reached the player in **three** places, one of them inside a translated sentence |
| ☑ | **4.7** `/fairness` | 🔴 It read `listMarkets({status:"RESOLVED"})` — an exact equality, not an `IN` — so **voided settlements were invisible on the page that exists to prove settlements**. Now `listTerminalMarkets()`: `RESOLVED ∪ VOIDED`, memoised, and strictly cheaper than the uncached read it replaces. ⛔ **The plan's lens `All · Resolved · Voided` was WRONG twice** — an enumeration where a residual belongs, and *coarser than the column beside it* (status and outcome are in bijection here, so `Resolved` is exactly `yes ∪ no` on a page that already prints them apart). It is `?out=all · yes · no · void`, byte-identical to `/results`, with `void` as a **negation**. 🔴 Three more live defects on the way: the table was ordered **oldest-first under a heading saying "Recently resolved"** (and by the market's *scheduled* clock, not the settlement one it prints); it rendered the **literal characters `…`** three times, because `…` as a JSX *text child* is not an escape; and it **published 12 characters of internal officer user-ids on an unauthenticated page** while its own sibling feed refuses to, in writing |
| ☑ | **4.8** `/leaderboard` | ⛔ **"Sort only" was not available here, because the SORT *IS* THE SELECTION.** `leaderboard(limit)` is `order by … limit 50`, so a JS sort would have left the selection on ROI and changed only the label — *"most staked"* meaning **the biggest staker among the fifty best ROIs**. The ORDER BY moves with the sort, into BOTH stores. 🔴 **`streak` is CUT** — it is not in the aggregate, so it could only re-order an already-chosen fifty; and it is walked in `placedAt` order while a streak is a fact about SETTLEMENT order, which on a table mixing 5-minute rounds with multi-week polls routinely disagree. The column stays; making it *selectable* is refused, in writing. `volume` → `staked` (this platform already uses "volume" for a market's pool). 🔴 The ribbon printed the **board size** under the label "Predictors", so a platform with 1,000 ranked players advertised **50** — a false public number that got *less* true as the platform grew. New gate `test:leaderboard-order` 31/31, red-proven against a JS re-label |
| ☑ | **4.9** `/live` | move `q` into the URL — and 🔴 **the 2026-08-10 defect was LIVE on this page.** The hero printed `{markets.length} live · {n} tipping` over the **unfiltered** board while the wall filtered client-side, so typing `zzz` rendered *"40 live · 6 tipping"* and a six-slide featured carousel **above an empty grid** — `counts.ts`'s opening paragraph, verbatim, in production. Moving the search to the SERVER is what fixes it: the count, the tipping figure, the hero carousel and the wall now come from ONE array. 🔴 It also repairs the search itself — the client filtered a snapshot carrying neither `resolutionCriterion` nor `status` while the box advertised `criterion:` and `status:` chips, so two field prefixes could never match and a bare token searched 4 of 5 declared columns. ⚠️ **The infinite-scroll wall is deliberately KEPT** — replacing it with a pager is a visible change to the page whose stated job is identity, and that is Ali's call, not this task's |
| ☐ | **4.10** `/positions/performance` | product lens `All · Polls · Up & Down` — the one player list that mixes both product lines |
| ☐ | **4.11** `/profile/invite` | lens `All · Earning · First bet · Signed up` + sort. Unbounded and unsorted today |
| ☐ | **4.12** `/markets/[id]` comments | sort only — newest · oldest |
| ☐ | **4.13** `/profile/activity` | the **shared** window vocabulary, so "last 30 days" means the same span as on `/wallet`. Stays a summary — no sort, no search, no paging |
| ☐ | **4.14** `/profile/kyc` | **no visible change** — declare its non-filter pill rail as a named exemption with its reason, so the gate's population becomes honest |

⚠️ **4.2 is the campaign's one visible change to a page that already works.** `/results`
carries its category rail as a desktop `aside` of full-width pills — a second layout for the
same job, at board width, beside `/markets` which uses the bar. That is exactly the
inconsistency this campaign exists to remove, so it adopts the bar. Everything else in
Stage 4 is additive.

⛔ **`/updown` (the live board) is deliberately untouched.** Its asset and duration pills are
already the primitive, and the board shows one current round plus at most two neighbours.
A lens there would be a control with no job.

### Stage 5 · the status dictionary (0/4)

| | Task | Files |
|---|---|---|
| ☐ | **5.1** add `WIN` · `LOSS` · `CASHED_OUT` (and `OPEN` for the player surface) to the dictionary | `src/lib/status-tone.ts` |
| ☐ | **5.2** record the `LOSS` divergence as a **decision**, with its reason | `STATUS_TONE_EXCEPTIONS` |
| ☐ | **5.3** route the card through `TONE_CHIP`; **keep** the explicit fallback and the §L2 comment | `src/components/markets/position-card.tsx` |
| ☐ | **5.4** confirm `test:gold-is-money` and `test:labels` still green | — |

`status-tone.ts` has no entry for three of the five position statuses, so the card
hand-types its tone in a ternary — the exact shape §B11 calls *"a chip variant hand-typed
beside a status label"*. `components/home/trust-band.tsx` already does it correctly and is
the pattern to copy. **This is what stops the new *Refunded* lens and the card it filters to
from disagreeing about what refunded looks like.**

**Ali's ruling, 2026-09-07:**

- **`VOID` → royal.** The dictionary already says the player surface is royal and five other
  player surfaces paint it royal. The card is the odd one out, and §B11 says drift gets
  fixed.
- **`LOSS` keeps the betting rose**, recorded in `STATUS_TONE_EXCEPTIONS` **with its
  reason** — a lost bet is betting semantics. That is what turns a divergence into a
  decision instead of leaving it a drift.
- ⚠️ **`WIN` carries `gold` verbatim.** `test:gold-is-money` passes today because a winning
  position *is* a money outcome. Normalising it to `success` for tidiness would give that
  gate an opinion.
- ⛔ **Keep an explicit fallback.** The ternary's final arm is what actually renders
  `CASHED_OUT` today, plus anything nobody enumerated. A bare map lookup returning
  `undefined` is an **untoned chip that no gate would catch.**
- ⛔ **The label does not move.** The comment above that ternary records a fixed §L2 defect —
  the chip printed the stored enum, so a Swahili player read "YES" beside a page reading
  "NDIO". **Keep the comment alive** or the next session reintroduces what it records.

### Stage 6 · guards, docs, verification (3/9 — 6.5, 6.6, + `qa:bar-geometry`, unplanned)

| | Task | Files |
|---|---|---|
| ☐ | **6.1** `test:lifecycle-reach` — population **derived from `prisma/schema.prisma`, never typed** | new gate, `lifecycle-reach.test.mts` † |
| ☐ | **6.2** `red:lifecycle-reach` | new control, `lifecycle-reach-red.mjs` † |
| ☐ | **6.3** `test:route-census` — globs every non-admin `page.tsx`; a new route without a ruling fails | new gate, `route-census.test.mts` † |
| ☐ | **6.4** `red:route-census` | new control, `route-census-red.mjs` † |
| ☑ | **6.5** `qa:player-filters` — pulled forward to stage 4 so each route is verified as it lands | [`scripts/live/player-filter-drive.mjs`](../scripts/live/player-filter-drive.mjs) |
| ☑ | **6.6** `qa:count-truth` + `red:count-truth` — landed 2026-09-08 alongside the `/results` defect it found. 98 pills / 6 surfaces green; 4/4 mutations caught | [`scripts/live/count-truth-drive.mjs`](../scripts/live/count-truth-drive.mjs) · [`scripts/red-count-truth.mjs`](../scripts/red-count-truth.mjs) |
| ☐ | **6.7** the rule, in §K, as an extension of rule 6 | `docs/DESIGN_AUTHORITY.md` |
| ☐ | **6.8** the shape, as record and on-ramp | `docs/DESIGN-BASELINE.md` **§3c** |
| ☐ | **6.9** the component spec + provenance | `docs/design-system/v2-2026-07-27/02-components/query-bar/` |

---

## §2 — WHY, in the player's words

They cannot tell **what is still running from what is finished**, and inside what is
finished cannot tell **won from lost from voided-and-refunded**. They also cannot search or
sort their own history.

The answer already exists and is already law: `/markets` has six lifecycle lenses, six
sorts with a tri-state direction, odds and pool buckets, topic, the shared search grammar,
cross-filtered honest counts, a phone filter sheet and a named empty cause for every dead
end (§K 6 / 6b / 7). **It was never carried across to the pages where a player looks at
their own money.**

**The sharpest gap.** Re-derive it:

```bash
sed -n '/^enum PositionStatus/,/^}/p' prisma/schema.prisma
grep -n 'status !== "OPEN"' src/app/positions/page.tsx
grep -n "wins\|losses\|cashOuts" src/app/positions/page.tsx | head
```

Five stored states; four of them collapse into one **Settled** bucket. The per-outcome
counts are **already computed a few lines later** and spent on a summary strip. A player
whose market was voided and whose stake came back sits in the same tab, under the same word,
as a player who lost.

**Ali's framing:** *"design matters more than anything at this level because our players are
all critics in the first period"*, and *"client or user facing pages should all be perfectly
handled and perfectly interpreted."*

---

## §3 — THE DESIGN, decided once

Every client-facing page that lists anything gets the **same** surface, because a player who
learns it on `/positions` must already know it on `/wallet`.

```
┌────────────────────────────────────────────────────────────────┐
│  🔍  Search positions                                     [×]  │  ← only where the page has
│      2 words · hiding crypto                                   │    search; the echo row is
├────────────────────────────────────────────────────────────────┤    ALWAYS reserved height
│  [All 47] [Open 6] [Settled 41] [Won 18] →      41 positions   │  ← LENS · primary rank
│                                                                │    scrolls ≤lg, wraps >lg
│  Sort: Most recent │↓│   [Filters 2]                           │  ← phone
│  Sort: Most recent │↓│ │ SIDE [Any][Yes][No] │ TOPIC ▾ │ Clear │  ← desktop ≥lg
└────────────────────────────────────────────────────────────────┘
```

**Nine rules. Every one is already law, or already shipped somewhere.**

1. **Lens and sort never go behind a click, at any width** — §K 6b, the kit's own ruling:
   *"they answer the first two questions a punter has and must never cost a tap."* Side,
   topic and window go in the phone `Filters` sheet and inline on desktop.
2. **Only the selected pill is outlined**; unselected is text on transparent. The reason is
   the kit's: *"fifteen outlined capsules in one bar was the single biggest source of the
   'chunky' criticism."*
3. ⛔ **A filter pill is NEVER coloured by its status.** `Won` does not go gold, `Lost` does
   not go rose. Four colours in one rail is a second control language, and it would collide
   with the status chips on the cards below, which *are* the status language. **Pills stay
   brand-outline; cards carry the tone.**
4. **Every count is cross-filtered** — the number on a pill is what pressing it would
   actually show, with every other filter still on. A board once printed *"40 live · TZS
   1,659k in play"* above **zero** cards: the number was true and the board was still a lie.
   Where no honest number exists, **no count renders** — never a zero standing in for
   unknown (A-5).
5. **The result count is ONE variable**, shared by the bar and the pager, published as
   `data-result-count` so an instrument can check the promise against the delivery.
6. **Every state is in the URL** — shareable, refresh-safe, back-button-safe. Defaults
   omitted, so a clean page has a clean URL. Filters use `replace` + `scroll:false`: **a
   filter is not a navigation.**
7. **Changing anything resets to page 1.** `SearchBox` and `DateTimeRangeFilter` already do
   this; the shared href builder does it for lens and sort too.
8. **An empty result names its own cause and offers a way out that works** — five causes,
   never one generic message, and an exit only when its real count is `> 0`. ⛔ Never an
   exit that leads to another empty page.
9. **A scrolling rail scrolls the active pill into view on load** (`StripAutoScroll`).
   Without it a seven-pill strip at 360 opens on a lens the player cannot see.

⭐ **None of this needs a new component or one line of new CSS.** `--pill-active`,
`.kp-fchip[data-on]`, `.kp-fopt`, `.kp-fsheet-trigger`, `.kp-strip-fade` and `.search-box`
are all shipped. Two pieces were built for exactly this work and have **zero call sites
today**: `PLAYER_PRESETS` in `datetime-range-filter.tsx`, and the sort/dir persistence key
in `discovery.ts`.

---

## §4 — THE CENSUS: every client-facing route, each with a ruling

⛔ **THE COUNT IS NOT WRITTEN HERE, AND THAT IS THE POINT.** This section said *"all 50"*
in its first draft. Running the instrument returned **51** — the doc had been wrong about
its own population from the moment it was written, which is exactly the failure this file's
header warns about. Ask the instrument:

```bash
find src/app -name page.tsx -not -path "*/admin/*" -not -path "*/api/*" | wc -l
```

The four buckets below must partition that number exactly. **If they do not, the census is
stale and the missing route has no ruling** — which is the one thing this section exists to
make impossible. Task 6.3 (`test:route-census`) turns that arithmetic into a gate.

⭐ **A page ruled to need nothing was READ AND DECIDED, not skipped.** An unenumerated
population is how a campaign comes to believe it covered something it never looked at.
Task 6.3 makes this claim checkable instead of asserted.

**A · Full bar (10)** — `/positions` · `/wallet` · `/updown/history` · `/results` ·
`/watchlist` · `/proposals` · `/notifications` · `/profile/account` · `/fairness` ·
`/markets`. Per-route detail is in §1 Stages 2–4. `/markets` is listed because it is the
shape everything copies; **its only change is Stage 1, and nothing on it moves for a
player.**

**B · One axis (5)** — `/leaderboard` (sort) · `/live` (`q` into the URL) ·
`/positions/performance` (product lens) · `/profile/invite` (lens + sort) ·
`/markets/[id]` comments (sort). Each reason is in task 4.8–4.12.

**C · Window vocabulary only (1)** — `/profile/activity`. Task 4.13.

**D · Read and ruled to need nothing** — everything the three buckets above do not name.
The groups below plus `/profile/kyc` are all of it; count the rows rather than trusting a
total written in prose.

| Group | Routes | Why nothing |
|---|---|---|
| Live board | `/updown` | The board shows one current round plus at most two neighbours; its pills are already the primitive. A lens would be a control with no job. |
| Single object | `/updown/[roundId]` · `/proposals/[id]` · `/wallet/receipt/[id]` · `/positions/[positionId]` (a redirect) · `/agent/invite/[token]` · `/wallet/deposit/return` | One object, or a handful of the viewer's own rows on it. A filter over three rows is noise. |
| Forms and flows | `/auth/login` · `/auth/register` · `/auth/otp` · `/auth/2fa` · `/auth/forgot-password` · `/auth/reset-password` · `/auth/verify-email` · `/proposals/new` · `/wallet/deposit` · `/wallet/withdraw` · `/profile/source-of-funds` | Nothing is listed. |
| Settings | `/profile` · `/profile/notifications` · `/profile/responsible-gambling` · `/profile/security` · `/profile/sessions` | Fixed short lists of controls, not collections. `/profile/sessions` renders exactly one device **by design** — single-session model. |
| Public agent | `/agent` · `/agent/apply` · `/agent/status` | Static copy and a form. |
| Legal | `/legal/terms` · `/legal/aml` · `/legal/privacy` · `/legal/responsible-gambling` · `/legal/agent-terms` | A document is read, not queried — but see the ruling below. |
| Other | `/` · `/help` · `/offline` | See the rulings below. |

**Three of those 34 needed a decision, not a shrug:**

- **`/profile/kyc`** renders a `FilterPill` rail that is **not a filter** — it is the
  ID-document chooser. It carries no `data-filter-rail`, so it is invisible to
  `test:filter-language`. That is *correct* but *undocumented*, which is indistinguishable
  from an oversight. **Ruling:** keep the pill geometry through `filterPillClass` (§K's own
  precedent for a chip that cannot be a `<Link>`) and add it to the guard's **named
  non-filter exemptions with its reason**, so the population is honest in both directions.
  Task 4.14. **No visible change.**
- **`/help`** — ruled no control today, **with its item count written down**, so the ruling
  is re-taken when the FAQ grows rather than inherited forever. Re-derive:
  `grep -c "key:" src/app/help/page.tsx`. Everything fits one screen at 360; a search over
  that many items cannot earn its height.
- **`/legal/*`** — ruled no filter. A legal document must stay one continuous text. **But**
  `/legal/terms` is the longest page in the product and its sections are **already numbered
  and titled**, so a player looking for the void rule scrolls blind. **A section index built
  from what already exists would be a real improvement and is not filtering.** ▶ **Ali's
  call — flagged, deliberately not scoped**, so it is a decision rather than an omission.

**`/` (home)** — ruled no filter. Its strips are curated, and a curated strip is an
editorial choice, not a subset a player narrows. Every strip already links through to
`/markets` where the lenses live. A lens on a hero would make the front page argue with the
board.

---

## §5 — ARCHITECTURE

### One query core, one contract per page

The repo already reached the right shape twice — `src/lib/markets/discovery.ts` and
`src/lib/notification-filters.ts`: a **pure contract module** owning parse, default, filter,
sort, href and count, so the page holds no second definition of any of them. Rather than
write a third and a fourth copy, the generic half is extracted and **every contract,
including those two, imports it** (§0a: one fact, one home).

```
src/lib/query/
  parse.ts   oneParam · oneOf · parseDir · clampText              ☑ 1.1
  sort.ts    SortSpec · compareBy · sortBy · effectiveDir          ☑ 1.2
  href.ts    buildQueryHref — defaults OMITTED, page dropped       ☑ 1.3
  counts.ts  matchesAll · countFor — the cross-filter rule, once   ☑ 1.4
  empty.ts   relaxations — exits carry real counts, capped at 3    ☑ 1.5
  windows.ts PLAYER_PRESETS · inWindow — the EAT day boundary      ☑ (2026-09-08)
```

⛔ **THE FOUR BOXES ABOVE READ ☐ UNTIL 2026-09-08 WHILE ALL FOUR FILES WERE ON PRODUCTION.** Stage 1
closed 12/12 and this list was never re-ticked, so a session skimming §5 as §0 instructs would have
concluded the core did not exist and written a second one. Fixed with task 4.6; ⚠️ this is the
second debt of exactly this shape in one document — see §0.

🔴 **`windows.ts` WAS NOT IN THIS LIST AND ITS ABSENCE COST A REAL DEFECT.** It owned the preset
IDs while the day arithmetic was hand-written five times, and every copy computed midnight in the
SERVER's zone while the rows beside it rendered in EAT — so `Today` excluded rows stamped today, on
five shipped routes. One home now, and `test:query-core` §9 asserts all five surfaces agree.

⛔ **Every rule is lifted VERBATIM from `discovery.ts`, never re-derived or "improved"** —
the null-last comparator, the omit-defaults builder, count honesty, the relaxation rule.
Its own header explains why it is pure and what three independent href builders cost.

Then one thin contract per page. ⛔ **RE-DERIVED FROM DISK 2026-09-08, because the list below used
to hand out `src/lib/watchlist/query.ts` — a path that has never existed** (the file is
`following.ts`), which is the same "a doc that hands out a file nobody can follow" failure
`test:docs` exists to catch and which §1's own footnote describes:

```bash
ls src/lib/positions/portfolio.ts src/lib/wallet/ledger.ts src/lib/updown/history-query.ts \
   src/lib/results/archive.ts src/lib/watchlist/following.ts src/lib/proposals/board.ts \
   src/lib/notification-filters.ts src/lib/account/activity.ts
```

`positions/portfolio.ts` · `wallet/ledger.ts` · `updown/history-query.ts` · `results/archive.ts` ·
`watchlist/following.ts` · `proposals/board.ts` · `notification-filters.ts` ·
`account/activity.ts`.

### One bar, driven by a spec

`discovery-bar.tsx` is `/markets`-specific **only in its labels**. It becomes
`src/components/ui/query-bar.tsx`, driven by a `QuerySpec`, rendering `FilterPill` /
`MenuShell` / `FilterSheet` exactly as it does now. `DiscoveryBar` stays as a thin
`/markets` binding — its `Chip` wrapper pinning `replace scroll={false}` + `aria-pressed`,
its labels, and its signed-out watch rule do not move.

⛔ **`FilterSheet` and `MenuShell` DO NOT MOVE HOUSE.** Ask which scripts are pinned to
their current paths — ⛔ **do not trust a number in prose, including the one this line used
to carry:**

```bash
grep -rln "filter-sheet\|menu-shell" scripts/
```

⚠️ **That command is why this paragraph is worded this way.** The first draft said *"five
gates"* and named `design-gate/routes.mjs` and `test:orphans` among them — a list inherited
from a parallel session and never re-derived. The instrument returns **more files than
that, and two of the named ones are not among them.** **A guard pinned to a path stops
guarding the moment the file moves**, and a *wrong* list of which guards those are is worse
than no list, because it reads as diligence. `query-bar.tsx` imports both components where
they are.

---

## §6 — GUARDS

🔴 **The blind spot this campaign inherits. It is not hypothetical.**
`test:filter-language` discovers rails **only** by the literal string `data-filter-rail`,
then cross-checks two hardcoded lists. Its §0.4 goes red if you emit the hook without
declaring — a loud, correct stop. But its player stray-sweep is keyed on an idiom the
script's **own §6.9 note records as matching ZERO files** — it won, and is kept as a
tombstone. **A new rail that omits the hook is invisible to it.**

Re-derive both halves:

```bash
grep -rl "filter-pill" src/app src/components | sort > /tmp/a
grep -rl "data-filter-rail" src/app src/components | sort > /tmp/b
comm -23 /tmp/a /tmp/b
```

**Already true at HEAD:** `src/app/notifications/page.tsx` and
`src/app/profile/kyc/page.tsx` render real `FilterPill` rails, carry no hook, and appear in
neither declared list. **This is not a missing feature — it is a gate reporting on a smaller
population than it claims.** When those rails are hooked or exempted the gate may go red on
copy nobody ever inspected; **if it does, that is the finding, not a regression introduced
here.**

### ⛔ EIGHT places every touched page must be declared, IN THE SAME COMMIT

🔴 **THIS TABLE SAID "FOUR" UNTIL 2026-09-08 AND THE REAL NUMBER WAS EIGHT.** Re-derived, not
counted from memory — every hand-typed enumeration of player surfaces in `scripts/`:

```bash
grep -rn "^const SURFACES\|^const PLAYER\b" scripts/ scripts/live/
```

⛔ **The four this table used to omit are the four LIVE DRIVERS, and every one of them fails
SILENTLY.** An undeclared route is simply never visited, so the run reports a clean pass over a
surface it never opened — which is the "guard whose POPULATION is blind" shape, four times.

| | Where | Why it must be there |
|---|---|---|
| 1 | `data-filter-rail` on the rail wrapper | the gate's only discovery key. ⛔ It must sit on the file the lists below NAME — when a rail moves out of `page.tsx` into a `*-bar.tsx`, the declaration moves with it |
| 2 | `SURFACES` in `scripts/filter-language.test.mts` | §0.4 fails without it — the loud, correct stop |
| 3 | `SURFACES` in `scripts/filter-language-scan.mjs`, **with its `rails` count** | that number is the per-route vacuity control |
| 4 | `PLAYER` in `scripts/responsive-audit.mjs` | **hand-typed, and it lost a whole product line before** — `/updown` was unaudited at every width until E-196 |
| 5 | `SURFACES` in `scripts/live/count-truth-drive.mjs`, **with its `minPills` floor** | `qa:count-truth`. An absent route is never walked, so its counts are never checked |
| 6 | `SURFACES` in `scripts/live/bar-geometry-drive.mjs`, **with its `minControls` floor** | `qa:bar-geometry`. The only instrument that asks whether two controls share pixels |
| 7 | `SURFACES` in `scripts/live/player-filter-drive.mjs` | `qa:player-filters` — SUBSET + MATCHING. ⚠️ If the lenses are genuinely not a partition, declare the EXCLUSION with its reason (the `/notifications` block is the model); a false partition makes a correct page report a real failure |
| 8 | `SURFACES` in `scripts/live/player-query-shots.mjs` | the screenshots. ⚠️ **This script had NO npm key at all until 2026-09-08** — `test:orphans` was red about it while this document handed out its command line. It is `qa:player-shots` now |

⚠️ **Only #2 fails loudly. #3–#8 are all silent.**

⭐ **AND THE REAL LESSON IS THAT A HAND-TYPED LIST CANNOT POLICE ITSELF** — which is what task 6.3
(`test:route-census`) exists to end. Until it lands, this table is the only thing standing between a
new rail and four instruments that will report success without looking at it.

Glob-based, therefore automatic: `test:measure` · `test:integrity` ·
`test:search-adoption` · `test:tap-target` · `test:section-rail` · `test:type-scale` ·
`test:labels` · `test:i18n`.

### The four new guards, and what each must prove

> ⛔ `DESIGN-BASELINE.md` sets the bar: a guard must state its **re-derived population**,
> land at **zero** outside any allowlist, and have its **RED control built BEFORE the gate
> is believed.** If it cannot land at zero, refuse it and say so with arithmetic.

| Guard | What it asserts |
|---|---|
| `test:query-core` | null-last holds in **both** directions; defaults omitted from every href; changing a filter drops `page`; a count is never computed over a wider set than its own control would show |
| `test:lifecycle-reach` | **the one that answers the actual complaint** — for every player-visible lifecycle enum, every value a player can be in is reachable by some control. ⭐ Population **derived from `prisma/schema.prisma`, never typed**, so a new enum value fails it by default instead of quietly having no lens |
| `test:route-census` | globs every non-admin `page.tsx` and requires each to appear in a declared ruling list, so **a new client-facing route cannot ship without a ruling** |
| `qa:player-filters` | the player twin of `qa:admin-filters`, its two-arm invariant borrowed **verbatim**: **SUBSET** (filtered ⊆ unfiltered) **and** **MATCHING** (every survivor satisfies the filter), with the value **chosen from the data** — present but not universal — so a correct filter *must* reduce the count. ⛔ Either arm alone is satisfied by a broken filter, which is why both exist |
| `qa:count-truth` | generalises the `/markets`-only probe. For every rail: read each pill's promised `data-count`, follow its href, count what arrives. **A count that disagrees with its own page is the defect this campaign is most likely to introduce** |

---

## §7 — i18n

One dictionary file, three locales, and `test:i18n` fails on any imbalance — so **every new
key lands in all three in the same edit.** Re-derive the balance before and after:

```bash
npm run test:i18n
```

Words come from the lexicon (`src/lib/side-label.ts`), never typed at a call site — §L2 /
§L3: **no enum ever reaches a sentence**, and a translated string carries no English enum
token.

⚠️ **Swahili runs 35–40% longer than English and is where a filter rail breaks.** The
`/markets` bar once rendered a sticky control surface tall enough to eat most of a phone
viewport at 360 in Swahili before its strips were made to scroll. **Measure every new rail
in Swahili, not English.**

⚠️ `datetime-range-filter.tsx` resolves its labels through a lookup with a fallback to the
**raw id** — an unknown preset renders the bare token as UI copy, an §L3 breach **no static
guard can see**. Any preset id this campaign introduces gets its three translations in the
same commit.

---

## §8 — VERIFICATION (a green suite is not proof — §K Definition of Done)

**The six gates Stage 1 must not disturb:** `test:discovery-contract` ·
`red:discovery-contract` · `test:filter-language` · `red:filter-language` ·
`qa:discovery-probe` · `qa:filter-scan`.

**The sweep, per stage:**

1. `npx tsc --noEmit`, then `npm run build` — **a typecheck is not a build.**
2. `npm run test:all` — it enumerates every `test:*` key, so **declaring the key registers
   the gate**; there is no list to update. Plus each `red:*` for the guards touched.
   ⛔ **A guard is not believed until its RED control has been seen to FAIL.**
3. **Live drive on `next dev`.** ⛔ **Never `next start`** — it 404s `/auth/demo` and
   `/api/dev-test/*` and prints "NOT delivered" instead of the OTP, so nothing can sign in.
   `rm -rf .next/dev` first — the turbopack cache has grown to tens of GB and hung twice on
   one route. **The first route compile is ~4 minutes**, so pre-warm with curl before
   driving. ⛔ **One live session per account** — a parallel drive on one persona gets the
   sign-in page at **HTTP 200**, so each lane needs its own persona.
4. `qa:player-filters` + `qa:count-truth` — a filter must narrow, the survivors must match,
   and every promised count must be delivered.
5. `qa:filter-scan` — every control measured: the pill radius, painted height, zero inline
   styles, zero unselected outlines. **It exits 3 if it reaches nothing**, because a gate
   that reaches nothing must go red.
6. `npm run test:responsive` over **every client-facing route** × **EN + SW + ZH**, zero horizontal
   overflow at the narrowest width. `MSYS_NO_PATHCONV=1` for `ONLY=/route` in Git Bash.
7. **LOOK AT THE SCREENSHOTS**, at 360 in Swahili first.
8. Update the docs in §9, then **ask Ali before pushing.**

---

## §9 — WHERE EACH DOC FACT GOES (§0, the filing law)

| What | Its ONE home |
|---|---|
| The rule *"a page that lists anything states its query through `QueryBar`"* | `docs/DESIGN_AUTHORITY.md` §K, extending rule 6 — ⛔ never a new design doc |
| The player list shape, as record and on-ramp | `docs/DESIGN-BASELINE.md` **§3c**, mirroring §3b's treatment of the console |
| The component spec + provenance | `docs/design-system/v2-2026-07-27/02-components/query-bar/`, beside `filter-pill/` |
| This tracker — the board, the census, every ruling, what was refused | **this file** |
| The START-HERE pointer | `CLAUDE.md` and `docs/README.md` (both done) |

---

## §10 — WORKING RULES ON THIS BRANCH

- Branch `player-query-campaign`. **`git branch --show-current` before every commit** — a
  push to `main` deploys the live real-money platform.
- ⛔ **Never `git add -A`** — this working directory is shared with a second session, and
  `Ocean Logo/` and `docs/REPORTS-CHECK-2026-09.md` are deliberately untracked. Stage by
  name.
- ⛔ **Never write a regex containing `\b` or `\s` through `node -e` in Git Bash** — the
  shell turns `\b` into a literal `0x08`, the pattern can then **never** match, and grep and
  sed print it invisibly. `cat -v` the pattern before blaming the product. Patch via a
  script file.
- ⚠️ **Author prose-heavy files with an editor, not a heredoc.** CRLF and delimiter mangling
  on this Windows / Git Bash pair has cost real time.
- **Ali validates every push. Ask first, every time**, and ask before starting development
  on a new stage.

---

## §11 — OUT OF SCOPE, recorded so it keeps

**The admin console — Ali's instruction, 2026-09-07: not now, say it later.** Nothing in
this campaign touches `src/app/admin/`. The inventory was gathered before the cut and holds:
**~40 tables — 23 with no search, 28 with no date filter, 23 with no sort control, 18
truncating silently with a bare `.slice()`.** Three sharper items sit inside it:

1. 🔴 **`/admin/audit` reads the in-process ring** — capped, per-container, **emptied on
   every deploy** — while a durable reader is written and unused, and the page has **no date
   filter and no search**. A regulator asking *"every admin action on 12 March"* **cannot be
   answered from the console.** ⛔ If this is ever picked up, **the durable switch lands
   FIRST**: a filter over an incomplete population is a check that lies.
2. 🔴 **`/admin/transactions` advertises a grammar it does not execute** — it renders the
   `field:` help chips while the DAL does a single `contains` over four columns.
   `queryToWhere` exists with **zero call sites under `src/app/admin`**. This is the
   `regex-advertised-never-executed` defect class recurring in a new form.
3. 🔴 **Report XLSX/PDF exports ignore the date filter above them** — the button sends only
   `?format=`, and the route lets the catalogue entry own its own period. So the window
   governs the on-screen KPIs and **nothing that is downloaded**.

**A section index for `/legal/terms`** — see §4. Navigation, not filtering. ▶ Ali's call.

**⛔ NOT OURS TO WRITE:** the `AffiliateAgent.tier` DROP migration. A parallel session's
permission classifier refused it twice; writing it here would route around a decision that
is **Ali's**. Recorded in `docs/AGENT-PROGRAMME.md` §5. **Nothing in this campaign depends
on that column.**
