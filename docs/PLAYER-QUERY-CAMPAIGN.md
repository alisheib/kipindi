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
| **Branch** | `player-query-campaign`, off `1f64ca1a` |
| **Approved** | the plan in §2–§5, by Ali, 2026-09-07 |
| **Scope** | every client-facing page. ⛔ **Admin explicitly excluded** — §11 |
| **Merged?** | **No.** Nothing is on `main`. Nothing is deployed. |

---

## §0 — RESUME AT

```
▶ NEXT ACTION — task 2.1 in the board below.
  Write src/lib/positions/portfolio.ts: the lens · sort · sheet axes · empty causes for
  /positions, as a contract over lib/query. Then 2.2 the search schema, 2.3 the batched
  title read (LOAD-BEARING, not an optimisation), 2.4 the page.
```

**Stage 2 of 6. Stage 1 is CLOSED at 12/12.** Nothing a player can see has changed yet.
Stage 2 is the first stage that moves a pixel.

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
| 2 | **`/positions`** | `qa:player-filters` + `qa:count-truth` green on it; 360 Swahili screenshot looked at | ▶ 0/7 |
| 3 | **`/wallet`** | same, plus the 1,000-row cap is stated to the player | ☐ 0/8 |
| 4 | **The other 13 pages** | every census-A and census-B route done, one commit each | ☐ 0/14 |
| 5 | **The status dictionary** | `position-card.tsx` has no hand-typed tone; `test:gold-is-money` still green | ☐ 0/4 |
| 6 | **Guards + docs** | the full §8 sweep passes and each new guard's RED control has been *seen to fail* | ☐ 0/9 |

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

### Stage 2 · `/positions` — the complaint (0/7)

| | Task | Files |
|---|---|---|
| ☐ | **2.1** the contract — lens · sort · sheet axes · empty causes | `src/lib/positions/portfolio.ts` |
| ☐ | **2.2** `POSITION_SEARCH` schema, **`viewModel: true`** | `src/lib/search/fields.ts` · `src/lib/search/index.ts` |
| ☐ | **2.3** batched title read, and delete the per-position loop | `src/lib/server/market-dal.ts` · `market-service.ts` · `positions/page.tsx:73-79` |
| ☐ | **2.4** the page on `QueryBar`; page the **open** list too | `src/app/positions/page.tsx` |
| ☐ | **2.5** skeleton parity — same tier, same rail height, so the page does not move on load | `src/app/positions/loading.tsx` |
| ☐ | **2.6** keys in **all three** locales, one edit | `src/lib/i18n-dict.ts` |
| ☐ | **2.7** declare the rail in the **four** places in §6 | 3 scripts + the page |

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

### Stage 3 · `/wallet` — the second complaint (0/8)

| | Task | Files |
|---|---|---|
| ☐ | **3.1** the contract — type lens · status lens · window · search | `src/lib/wallet/ledger.ts` |
| ☐ | **3.2** a windowed, filtered player-transaction read | `src/lib/server/prisma-dal.ts` |
| ☐ | **3.3** move `tab` and `page` out of React state into the URL | `src/app/wallet/page.tsx` |
| ☐ | **3.4** the bar; the three `Tabs` **stay** a section rail | `src/app/wallet/wallet-client.tsx` |
| ☐ | **3.5** state the row cap to the player when it bites | `wallet-client.tsx` |
| ☐ | **3.6** bonus grants — lens + "show all" | `wallet/page.tsx` · `wallet-client.tsx` |
| ☐ | **3.7** keys in all three locales | `src/lib/i18n-dict.ts` |
| ☐ | **3.8** declare the rail in the four places | 3 scripts + the page |

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

### Stage 4 · the other thirteen pages (0/14)

One commit each, in this order. Same bar, same nine rules.

| | Route | What it gets |
|---|---|---|
| ☐ | **4.1** `/updown/history` | lens `All · In play · Up wins · Down wins · Refunded`; sheet Asset · Duration · When (the day rail folds into the window); sort; paging. The 400 cap **stays stated** |
| ☐ | **4.2** `/results` | lens `All · Yes won · No won · Refunded`; sheet Product · Topic · When; direction on the existing two sorts. ⚠️ **retires the desktop sidebar** — see below |
| ☐ | **4.3** `/watchlist` | lens `All · Live · In progress · Settled`; sheet Topic; sort; search; paging. One unfiltered, unsorted, unpaged grid today |
| ☐ | **4.4** `/proposals` | all six `ProposalStatus` lenses — `DECLINED` and `CHANGES_REQUESTED` have **no way in** today, so a proposer cannot find their own declined proposal; sheet Topic · When; sort; search |
| ☐ | **4.5** `/notifications` | **search** (the only lens surface without it) + the `data-filter-rail` hook it has never carried |
| ☐ | **4.6** `/profile/account` | counts on the existing category rail; When; sort; search |
| ☐ | **4.7** `/fairness` | include `VOIDED`, then lens `All · Resolved · Voided`. It reads `RESOLVED` only, so **voided settlements are invisible on the page that exists to prove settlements** |
| ☐ | **4.8** `/leaderboard` | sort only — ROI · net · streak · volume. Hard-wired in SQL today |
| ☐ | **4.9** `/live` | move `q` into the URL (`mode="url"`), so a shared link keeps the search |
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

### Stage 6 · guards, docs, verification (0/9)

| | Task | Files |
|---|---|---|
| ☐ | **6.1** `test:lifecycle-reach` — population **derived from `prisma/schema.prisma`, never typed** | new gate, `lifecycle-reach.test.mts` † |
| ☐ | **6.2** `red:lifecycle-reach` | new control, `lifecycle-reach-red.mjs` † |
| ☐ | **6.3** `test:route-census` — globs every non-admin `page.tsx`; a new route without a ruling fails | new gate, `route-census.test.mts` † |
| ☐ | **6.4** `red:route-census` | new control, `route-census-red.mjs` † |
| ☐ | **6.5** `qa:player-filters` — the two-arm invariant, borrowed verbatim | new drive, `player-filter-drive.mjs` † |
| ☐ | **6.6** `qa:count-truth` — generalise the `/markets`-only probe | new probe, `count-truth-probe.mjs` † |
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
  sort.ts    SortSpec · compareBy · sortBy · effectiveDir          ☐ 1.2
  href.ts    buildQueryHref — defaults OMITTED, page dropped       ☐ 1.3
  counts.ts  matchesAll · countFor — the cross-filter rule, once   ☐ 1.4
  empty.ts   relaxations — exits carry real counts, capped at 3    ☐ 1.5
```

⛔ **Every rule is lifted VERBATIM from `discovery.ts`, never re-derived or "improved"** —
the null-last comparator, the omit-defaults builder, count honesty, the relaxation rule.
Its own header explains why it is pure and what three independent href builders cost.

Then one thin contract per page: `src/lib/positions/portfolio.ts` ·
`src/lib/wallet/ledger.ts` · `src/lib/updown/history-query.ts` ·
`src/lib/results/archive.ts` · `src/lib/watchlist/query.ts`.

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

### ⛔ Four places every touched page must be declared, IN THE SAME COMMIT

| | Where | Why it must be there |
|---|---|---|
| 1 | `data-filter-rail` on the rail wrapper | the gate's only discovery key |
| 2 | `SURFACES` in `scripts/filter-language.test.mts` | §0.4 fails without it — the loud, correct stop |
| 3 | `SURFACES` in `scripts/filter-language-scan.mjs`, **with its `rails` count** | that number is the per-route vacuity control |
| 4 | `PLAYER` in `scripts/responsive-audit.mjs` | **hand-typed, and it lost a whole product line before** — `/updown` was unaudited at every width until E-196 |

⚠️ **Only #2 fails loudly. #3 and #4 are silent.**

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
