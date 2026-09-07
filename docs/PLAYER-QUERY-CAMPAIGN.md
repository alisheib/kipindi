# PLAYER QUERY CAMPAIGN — find anything, on every client-facing page

> ⭐ **THIS IS THE TRACKER AND THE PLAN OF RECORD. Read it first, resume from §0.**
> It is a RECORD and a WORK ORDER, **not** design law. The law is
> [`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md) — one rulebook, no second one (§0a).
> Nothing here restates a token value; where a number matters this file names the
> instrument that re-derives it.

**Opened** 2026-09-07 · **Branch** `player-query-campaign` (off `1f64ca1a`) ·
**Ali's approval** given on the plan below, 2026-09-07.

---

## §0 — RESUME AT

**Stage 1 is IN PROGRESS. 1 of 5 core files written.**

```
▶ NEXT ACTION: finish src/lib/query/ — sort.ts, href.ts, counts.ts, empty.ts.
  Then refactor src/lib/markets/discovery.ts onto them WITHOUT changing behaviour,
  and prove it with `npm run test:discovery-contract` + `npm run red:discovery-contract`.
```

| | |
|---|---|
| ☑ | `src/lib/query/parse.ts` — `oneParam` · `oneOf` · `parseDir` · `clampText` |
| ☐ | `src/lib/query/sort.ts` — `SortSpec` · `compareBy` · `sortBy` · `effectiveDir` |
| ☐ | `src/lib/query/href.ts` — `buildQueryHref` (defaults omitted, `page` dropped) |
| ☐ | `src/lib/query/counts.ts` — `matchesAll` · `countFor` (the cross-filter rule) |
| ☐ | `src/lib/query/empty.ts` — `relaxations` (exits carry real counts, max 3) |
| ☐ | refactor `discovery.ts` + `notification-filters.ts` onto the core |
| ☐ | `src/components/ui/query-bar.tsx`; `discovery-bar.tsx` becomes a thin binding |
| ☐ | new guards `test:query-core` + `red:query-core` |

⛔ **Stage 1 changes NOTHING a player can see.** The proof is that
`test:discovery-contract`, `red:discovery-contract`, `test:filter-language`,
`red:filter-language`, `qa:discovery-probe` and `qa:filter-scan` all stay green **with no
edits to those scripts**. If one of them needs an edit to pass, the refactor is wrong — not
the gate.

### Where the repo is on THIS machine, and how to find it on yours

⛔ **DO NOT COPY A PATH OUT OF THIS FILE.** `CLAUDE.md` records that the repo path has been
wrong on two machines in three days — *"the path is not a fact about the project, it is a
fact about the machine."* Ask the shell instead:

```bash
hostname && pwd && git rev-parse --show-toplevel && git branch --show-current
```

Then `git fetch && git checkout player-query-campaign`.

---

## §1 — WHY (the complaint, in the player's words)

Players cannot tell **what is still running from what is finished**, and inside what is
finished cannot tell **won from lost from voided-and-refunded**. They also have no way to
search or sort their own history.

The design that answers this **already exists and is already law.** `/markets` has six
lifecycle lenses, six sorts with a tri-state direction, odds and pool buckets, topic, the
shared search grammar, cross-filtered honest counts, a phone filter sheet and a named empty
cause for every dead end (§K 6 / 6b / 7). It was never carried across to the pages where a
player looks at their own money.

**The sharpest gap, measured.** `PositionStatus` is
`OPEN | WIN | LOSS | VOID | CASHED_OUT` (`prisma/schema.prisma:1220`), and
`src/app/positions/page.tsx:64` collapses four of those five into one **Settled** bucket
with `p.status !== "OPEN"`. The four counts it needs are **already computed nine lines
later** (`:134-136`) and spent on a summary strip. A player whose market was voided and
whose stake came back sits in the same tab, under the same word, as a player who lost.

**Ali's framing, 2026-09-07:** *"design matters more than anything at this level because our
players are all critics in the first period"*, and *"client or user facing pages should all
be perfectly handled and perfectly interpreted."*

---

## §2 — THE DESIGN, DECIDED ONCE

Every client-facing page that lists anything gets the **same** surface, because a player
who learns it on `/positions` must already know it on `/wallet`.

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

**Nine rules. Each is already law, or already shipped somewhere.**

1. **Lens and sort never go behind a click, at any width** — §K 6b, the kit's ruling:
   *"they answer the first two questions a punter has and must never cost a tap."* Side,
   topic and window go in the phone `Filters` sheet and inline on desktop.
2. **Only the selected pill is outlined**; unselected is text on transparent. The reason is
   the kit's: *"fifteen outlined capsules in one bar was the single biggest source of the
   'chunky' criticism."*
3. ⛔ **A filter pill is NEVER coloured by its status.** `Won` does not go gold, `Lost` does
   not go rose. Four colours in one rail is a second control language, and it would collide
   with the status chips on the cards below, which *are* the status language. Pills stay
   brand-outline; cards carry the tone.
4. **Every count is cross-filtered** — the number on a pill is what pressing it would
   actually show, with every other filter still on (`discovery.ts:502-533`). A board once
   printed *"40 live · TZS 1,659k in play"* above **zero** cards. Where no honest number
   exists, no count renders — never a zero standing in for unknown (A-5).
5. **The result count is ONE variable**, shared by the bar and the pager, published as
   `data-result-count` so an instrument can check the promise against the delivery.
6. **Every state is in the URL** — shareable, refresh-safe, back-button-safe. Defaults
   omitted so a clean page has a clean URL. Filters use `replace` + `scroll:false`: a filter
   is not a navigation.
7. **Changing anything resets to page 1.** `SearchBox` and `DateTimeRangeFilter` already do
   `sp.delete("page")`; the shared href builder does it for lens and sort too.
8. **An empty result names its own cause and offers a way out that works** — five causes,
   never one generic message, and an exit only when its real count is `> 0`.
9. **A scrolling rail scrolls the active pill into view on load** (`StripAutoScroll`).
   Without it a seven-pill strip at 360 opens on a lens the player cannot see.

⭐ **None of this needs a new component or one line of new CSS.** `--pill-active`,
`.kp-fchip[data-on]`, `.kp-fopt`, `.kp-fsheet-trigger`, `.kp-strip-fade` and `.search-box`
are all shipped.

---

## §3 — THE CENSUS: all 50 client-facing routes, each with a ruling

Re-derive the population, never trust this list:
```bash
find src/app -name page.tsx -not -path "*/admin/*" -not -path "*/api/*" | wc -l
```

⭐ **A page ruled to need nothing was READ AND DECIDED, not skipped.** An unenumerated
population is how a campaign comes to believe it covered something it never looked at.
`test:route-census` (Stage 6) makes this claim checkable rather than asserted.

### A · Full bar — lens · sort · search · window (10)

| Route | Lens strip | Sheet | Sort | Search |
|---|---|---|---|---|
| `/positions` | `All · Open · Settled · Won · Lost · Refunded · Cashed out` | Side · Topic · When | recent · stake · return · closing · market | title + topic |
| `/wallet` | `All · Money in · Money out · Bets · Payouts · Refunds · Bonuses · Adjustments` (+`Commission` only where the account has any) | Status · When | recent · amount | ref · msisdn · description · id |
| `/updown/history` | `All · In play · Up wins · Down wins · Refunded` | Asset · Duration · When (the day rail folds in) | recent · stake · return | round · asset |
| `/results` | `All · Yes won · No won · Refunded` — `voidCount` is already computed at `:220` for the donut and offers no pill | Product · Topic · When | keep `resolved`/`volume`, add direction | keep |
| `/watchlist` | `All · Live · In progress · Settled` — LIVE, CLOSED, RESOLVED and VOIDED sit in one unfiltered, unsorted, unpaged grid today | Topic | closing · pool · added | title |
| `/proposals` | all six `ProposalStatus` lenses — `DECLINED` and `CHANGES_REQUESTED` have no way in today, so a proposer cannot find their own declined proposal | Topic · When | votes · newest · status | title |
| `/notifications` | keep the five | When | keep the two | **add** — the only lens surface with no search |
| `/profile/account` | keep the audit categories, **add counts** | When | time · category | action · target |
| `/fairness` | `All · Resolved · Voided` — it reads `status:"RESOLVED"` only (`:83`), so **voided settlements are invisible on the page that exists to prove settlements** | When | settled · pool | title |
| `/markets` | unchanged — the reference | unchanged | unchanged | unchanged |

### B · One axis, deliberately not the full bar (5)

| Route | Ruling |
|---|---|
| `/leaderboard` | **Sort only** — ROI · net · streak · volume. Hard-wired in SQL (`market-dal.ts:932`); the board is 50 rows, so a lens would narrow a list that is already a top-50 and a search over 50 rows is a control with no job. |
| `/live` | **Move `q` into the URL** (`mode="url"`). Real search today, but in `useState`, so a shared link loses it. No lens — the wall is by definition every live market. |
| `/positions/performance` | **Product lens** `All · Polls · Up & Down`. The one player list that mixes both product lines (`:31`, no `productLine` filter); §L2 says a mixed book resolves side words per row. |
| `/profile/invite` | **Lens + sort** on the recruit roster — `All · Earning · First bet · Signed up`. Unbounded and unsorted today. |
| `/markets/[id]` comments | **Sort only** — newest · oldest. `INITIAL_SHOW = 15` with a "show all" is already honest; a thread does not want a lens. |

### C · Window aligned, still a summary (1)

`/profile/activity` keeps `week · month · all` but takes the **shared preset vocabulary**,
so "last 30 days" means the same span as on `/wallet` and `/positions`. It was left on
presets in July because a custom window needed a between-window DAL method; `/wallet` builds
that method in Stage 3, so this follows it. **Stays a summary** — no sort, no search, no
paging.

### D · Read and ruled to need nothing (34)

| Group | Routes | Why nothing |
|---|---|---|
| Live board | `/updown` | Asset and duration pills are already the primitive; the board shows one current round plus at most two neighbours. A lens would be a control with no job. |
| Single object | `/updown/[roundId]` · `/proposals/[id]` · `/wallet/receipt/[id]` · `/positions/[positionId]` (a redirect) · `/agent/invite/[token]` · `/wallet/deposit/return` | One object, or a handful of the viewer's own rows on it. A filter over three rows is noise. |
| Forms and flows | `/auth/login` · `/auth/register` · `/auth/otp` · `/auth/2fa` · `/auth/forgot-password` · `/auth/reset-password` · `/auth/verify-email` · `/proposals/new` · `/wallet/deposit` · `/wallet/withdraw` · `/profile/source-of-funds` | Nothing is listed. |
| Settings | `/profile` · `/profile/notifications` · `/profile/responsible-gambling` · `/profile/security` · `/profile/sessions` | Fixed short lists of controls. `/profile/sessions` renders exactly one device by design (single-session model). |
| Public agent | `/agent` · `/agent/apply` · `/agent/status` | Static copy and a form. |
| Legal | `/legal/terms` · `/legal/aml` · `/legal/privacy` · `/legal/responsible-gambling` · `/legal/agent-terms` | A document is read, not queried — see the ruling below. |
| Other | `/` · `/help` · `/offline` | See the rulings below. |

**`/profile/kyc` — the one that needed a decision, not a shrug.** It renders a `FilterPill`
rail (`:290`, `:308-310`) that is **not a filter** — it is the ID-document chooser (NIDA ·
passport · licence · voter's card). It carries no `data-filter-rail`, so it is invisible to
`test:filter-language`. That is *correct* but *undocumented*, which is indistinguishable
from an oversight. **Ruling:** it keeps the pill geometry through `filterPillClass` (§K's
own precedent for a chip that cannot be a `<Link>`), and it is added to the guard's **named
non-filter exemptions with its reason**, so the gate's population is honest in both
directions. **No visible change.**

**`/` (home) — ruled: no filter.** Its strips are curated (closing-soonest, a conviction
bar, one live card) and a curated strip is an editorial choice, not a subset a player
narrows. Every strip already links through to `/markets` where the lenses live. A lens on a
hero would make the front page argue with the board.

**`/help` — ruled: no control today, with the number written down.** Eight FAQ items
(`help/page.tsx:20`), all on one screen at 360. A search over eight items cannot earn its
height. ⭐ **The ruling is re-derivable, not permanent** — recorded with its count, so at
~12 items it is re-taken rather than inherited.

**`/legal/*` — ruled: no filter, and one honest gap named.** A legal document must stay a
single continuous text. But `/legal/terms` is the longest page in the product (432 lines)
and its `LegalSection`s are **already numbered and titled** (`legal/_components`), so a
player looking for the void rule scrolls blind. **A section index built from what already
exists would be a real improvement and is not filtering.** ▶ **Ali's call — flagged, not
scoped**, so it is a decision rather than an omission.

---

## §4 — ARCHITECTURE

### One query core, one contract per page

The repo already reached the right shape twice — `src/lib/markets/discovery.ts` and
`src/lib/notification-filters.ts`: a **pure contract module** owning parse, default, filter,
sort, href and count, so the page holds no second definition of any of them. Rather than
write a third and fourth copy, the generic half is extracted and every contract — including
those two — imports it (§0a).

```
src/lib/query/
  parse.ts   oneParam · oneOf · parseDir · clampText      ☑ WRITTEN
  sort.ts    SortSpec · compareBy · sortBy · effectiveDir  ☐
  href.ts    buildQueryHref — defaults OMITTED, page dropped  ☐
  counts.ts  matchesAll · countFor — the cross-filter rule, once  ☐
  empty.ts   relaxations — exits carry real counts, capped at 3   ☐
```

⛔ **Every rule is lifted VERBATIM from `discovery.ts`**, never re-derived or "improved" —
the null-last comparator (`:450-460`), the omit-defaults builder (`:216-233`), count honesty
(`:502-533`), relaxations (`:541-567`).

Then one thin contract per page: `src/lib/positions/portfolio.ts` ·
`src/lib/wallet/ledger.ts` · `src/lib/updown/history-query.ts` ·
`src/lib/results/archive.ts` · `src/lib/watchlist/query.ts`.

### One bar, driven by a spec

`discovery-bar.tsx` is `/markets`-specific **only in its labels**. Generalise it to
`src/components/ui/query-bar.tsx`, driven by a `QuerySpec`, rendering `FilterPill` /
`MenuShell` / `FilterSheet` exactly as it does now. `DiscoveryBar` becomes a thin `/markets`
binding — its `Chip` wrapper pinning `replace scroll={false}` + `aria-pressed`, its labels
and its signed-out watch rule stay where they are.

⛔ **`FilterSheet` and `MenuShell` DO NOT MOVE HOUSE.** Five gates are pinned to those paths
(`scripts/design-gate/routes.mjs`, `design-frozen.test.mts`, `ui-consistency*`,
`red:updown-filter-sheet`, `test:orphans`), and **a guard pinned to a path stops guarding
the moment the file moves.** `query-bar.tsx` imports them where they are.

---

## §5 — STAGES

| # | Stage | State |
|---|---|---|
| 1 | The core — no user-visible change | ▶ **IN PROGRESS** (see §0) |
| 2 | `/positions` — the complaint | ☐ |
| 3 | `/wallet` — the second complaint | ☐ |
| 4 | The rest of census A + all of census B | ☐ |
| 5 | The status dictionary (`STATUS_TONE`) | ☐ |
| 6 | Guards + docs + verification | ☐ |

### Stage 2 · `/positions`

**Lens** `?tab=` — seven pills, one strip (Ali's ruling, 2026-09-07):

| Pill | value | means |
|---|---|---|
| All | *(default, omitted)* | everything |
| Open | `open` | `OPEN` |
| Settled | `settled` | the union of the four below — **today's links keep working** |
| Won | `win` | `WIN` |
| Lost | `loss` | `LOSS` |
| Refunded | `void` | `VOID` — the word a player reads is `t.common.voided` / `t.market.udPosRefunded`, from the lexicon, **never the enum** (§L3) |
| Cashed out | `cashed` | `CASHED_OUT` |

**Sort** `?sort=` + `?dir=`, tri-state:

| id | key | natural | note |
|---|---|---|---|
| `recent` | `placedAt` | desc | default |
| `stake` | `stake` | desc | |
| `return` | `finalPayout − stake` | desc | **`null` for OPEN** → last in BOTH directions, ⛔ never `?? 0` |
| `closing` | `selectionClosedAt ?? resolutionAt` | asc | the clock shown is the clock sorted by |
| `market` | title | asc | locale-collated |

**Search** `?q=` over the joined market title (all three locales) + category. Add a
`POSITION_SEARCH` schema to `src/lib/search/fields.ts` with **`viewModel: true`** — it
matches a joined title, not a `Position` column, so it must **never** reach `queryToWhere`.
⛔ No `allowRegex` on a player route (`test:search-adoption` rule 4).

**Sheet — three groups, matching `/markets`' three:** `SIDE` (Any · Yes · No via
`sideWord`) · `TOPIC` (the 7 `MARKET_CATEGORIES`, derived never re-typed) · `WHEN`
(`PLAYER_PRESETS`).

**Paging** — page the **open** list too; it renders in full today.

**Empty causes** — `search-miss · window-miss · filter-miss · lens-empty · no-positions`.
`lens-empty` on *Refunded* reads *"nothing of yours has been voided"* — a **healthy** state,
not a failure, the same reasoning `/markets` applies to an empty `progress` board.

⚠️ **PERFORMANCE, AND IT IS LOAD-BEARING.** Searching by title needs titles for **every**
position, not only the twelve rendered — and the page issues one `getMarket` per rendered
position today (`:73-79`). Add a narrow-projection batched read beside the existing
`poolsByIds` (`market-dal.ts:781`) and `bookByIds` (`:791`): `titlesByIds(ids)` selecting
id, the three titles, category, status and the two deadlines, and delete the loop. **This
makes the page faster than today, not slower.**

### Stage 3 · `/wallet`

- **Move the state into the URL.** `tab` and `page` are `useState`
  (`wallet-client.tsx:537-538`), so a filtered ledger is not shareable and the back button
  does nothing. The three `Tabs` stay a **section** rail (`data-section-rail`, §K 7) — they
  are not filters and must never become pills.
- 🔴 **Filter the stored `TxnType`, NEVER the UI token.** `wallet/page.tsx:22-30`
  deliberately folds `BONUS_CREDIT` and `ADJUSTMENT_CREDIT` into `deposit`, and `CASHOUT`
  and `HOUSE_FEE` into `payout`/`withdraw`, to drive the sign and the receipt link.
  **Filtering on that token would tell a player their bonus was a deposit.**
- **Status lens** — all seven `TxnStatus` values are labelled 1:1 today and **not one is
  filterable**. `Any · In flight · Confirmed · Failed · Reversed`, in the sheet.
- 🔴 **STATE THE CAP.** `db.txn.findByUser(userId, 1000)` (`:84`) truncates **silently**;
  transaction 1,001 is unreachable by any route. `/updown/history` already solved this
  honestly — it tells the player when its 400-cap bites (`:106`, banner `:263`). Do the
  same, then push paging into the DAL once the window makes that cheap.
- ⚠️ **Bonus grants.** The wallet renders only `ACTIVE | QUEUED` (`page.tsx:107-108`) and
  then only `grants.slice(0, 5)` (`wallet-client.tsx:287`). **Five of seven
  `BonusGrantStatus` values — `PENDING_KYC · FULFILLED · EXPIRED · CANCELLED · FORFEITED` —
  are invisible on EVERY player surface.** Same lens treatment + "show all", so a player can
  see a bonus they were granted and lost.

### Stage 4 · the rest

⚠️ **`/results` gives up its desktop sidebar.** Its category rail is an `aside` today with
full-width pills and `countClassName="lg:ml-auto"` — a second layout for the same job, at
board width, beside `/markets` which uses the bar. That is exactly the inconsistency this
campaign exists to remove. **It is the one VISIBLE change to a page that already works;**
everything else in Stage 4 is additive.

⛔ **`/updown` (the live board) is deliberately left alone.** See census D.

### Stage 5 · the status dictionary

`src/lib/status-tone.ts` has **no `WIN`, `LOSS` or `CASHED_OUT`**, so
`src/components/markets/position-card.tsx:67-74` hand-types the tone in a ternary — the
exact shape §B11 calls *"a chip variant hand-typed beside a status label"*. Route it through
`STATUS_TONE` × `TONE_CHIP`, the way `components/home/trust-band.tsx:160` already does.
This is what stops the new *Refunded* lens and the card it filters to from disagreeing about
what refunded looks like.

**Ali's ruling, 2026-09-07:**

- **`VOID` → royal.** `STATUS_TONE.VOID.player` already says `royal` and five other player
  surfaces paint it royal; the card is the odd one out, and §B11 says drift gets fixed.
- **`LOSS` keeps `variant="no"`**, recorded in `STATUS_TONE_EXCEPTIONS` **with its reason** —
  a lost bet is betting semantics — which turns a divergence into a decision.
- ⚠️ **`WIN` carries `gold` VERBATIM.** `test:gold-is-money` passes today because a winning
  position *is* a money outcome. Normalising it to `success` would give that gate an opinion.
- ⛔ **Keep an explicit fallback.** The ternary's `: "warning"` arm is what actually renders
  `CASHED_OUT` today, plus anything unenumerated. A bare map lookup returning `undefined` is
  an untoned chip **no gate would catch**.
- ⛔ **The LABEL does not move.** `:64-66` records a fixed §L2 defect — the chip printed the
  stored enum, so a Swahili player read "YES" beside a page reading "NDIO". **Keep that
  comment alive** or the next session reintroduces what it records.

---

## §6 — GUARDS

🔴 **The blind spot this campaign inherits, and it is not hypothetical.**
`test:filter-language` discovers rails **only** by the literal string `data-filter-rail`
(`scripts/filter-language.test.mts:195`), then cross-checks two hardcoded lists. Its §0.4
goes red if you emit the hook without declaring — a loud, correct stop. But its player
stray-sweep §3.6 is keyed on `OLD_IDIOM = /rounded-md border px-3 font-mono/`, which the
script's **own §6.9 note records as matching ZERO files** — it won, and is kept as a
tombstone. **A new rail that omits the hook is invisible to it.**

**Already true at HEAD:** `src/app/notifications/page.tsx` and `src/app/profile/kyc/page.tsx`
render real `FilterPill` rails, carry no hook, and appear in neither list. **This is not a
missing feature — it is a gate reporting on a smaller population than it claims.** When
those rails are hooked or exempted the gate may go red on copy nobody ever inspected;
**if it does, that is the finding, not a regression introduced here.**

### ⛔ Four places every touched page must be declared, IN THE SAME COMMIT

1. `data-filter-rail` on the rail wrapper.
2. `SURFACES` in `scripts/filter-language.test.mts`.
3. `SURFACES` in `scripts/filter-language-scan.mjs`, **with its correct `rails` count** —
   that number is the per-route vacuity control.
4. `PLAYER` in `scripts/responsive-audit.mjs`. **That array is hand-typed and has lost a
   whole product line before** — `/updown` was unaudited at every width until E-196.

Glob-based, therefore automatic: `test:measure` · `test:integrity` ·
`test:search-adoption` · `test:tap-target` · `test:section-rail` · `test:type-scale` ·
`test:labels` · `test:i18n`.

### New guards — each must meet `DESIGN-BASELINE.md:85-95`

> state its **re-derived population**, land at **zero** outside any allowlist, and have its
> **RED control built BEFORE the gate is believed**.

| Guard | What it asserts |
|---|---|
| `test:query-core` / `red:query-core` | null-last holds in **both** directions; defaults omitted from every href; changing a filter drops `page`; a count is never computed over a wider set than its own control would show |
| `test:lifecycle-reach` / `red:lifecycle-reach` | **the one that answers the actual complaint** — for every player-visible lifecycle enum, every value a player can be in is reachable by some control. ⭐ Its population is **derived from `prisma/schema.prisma`, never typed**, so a new enum value fails it by default instead of quietly having no lens |
| `test:route-census` / `red:route-census` | globs every non-admin `page.tsx` and requires each to appear in a declared ruling list, so **a new client-facing route cannot be added without a ruling.** A campaign that says "every page" and cannot enumerate its pages has not covered them |
| `qa:player-filters` | the player twin of `qa:admin-filters`, reusing its two-arm invariant **verbatim**: **SUBSET** (filtered ⊆ unfiltered) **and** **MATCHING** (every survivor satisfies the filter), with the value **chosen from the data** — present but not universal — so a correct filter *must* reduce the count. ⛔ Either arm alone is satisfied by a broken filter, which is why both exist |
| `qa:count-truth` | generalises `qa:discovery-probe`, which is hardcoded to `/markets`. For every rail: read each pill's promised `data-count`, follow its href, count what arrives. **A count that disagrees with its own page is the defect this campaign is most likely to introduce** |

---

## §7 — i18n

One file, three locales, balanced at **en = sw = zh = 2,195** at the branch point;
`test:i18n` fails on any imbalance, so **every new key lands in all three dictionaries in
the same edit.** Words come from the lexicon (`side-label.ts`), never typed at a call site
— §L2 / §L3: no enum reaches a sentence, and a translated string carries no English enum
token.

⚠️ **Swahili runs 35–40% longer than English and is where a filter rail breaks** — the
`/markets` bar rendered **448px tall at 360 in Swahili** before its strips were made to
scroll. **Measure every new rail in Swahili, not English.**

⚠️ `datetime-range-filter.tsx:160` does `LABELS[id] ?? id` — an unknown preset id renders
the **raw token** as UI copy, an §L3 breach **no static guard can see**. Any preset id this
campaign introduces gets its three translations in the same commit.

---

## §8 — VERIFICATION (a green suite is not proof — §K Definition of Done)

1. `npx tsc --noEmit`, then `npm run build` — **a typecheck is not a build.**
2. `npm run test:all` (it enumerates every `test:*` key, so declaring the key registers the
   gate), plus each `red:*` harness for the guards touched. ⛔ **A guard is not believed
   until its RED control has been seen to FAIL.**
3. **Live drive on `next dev`.** ⛔ **NOT `next start`** — it 404s `/auth/demo` and
   `/api/dev-test/*` and prints "NOT delivered" instead of the OTP, so nothing can sign in.
   `rm -rf .next/dev` first (the turbopack cache reached **29 GB** and hung twice on one
   route). **First route compile is ~4 minutes** — pre-warm with curl before driving.
   ⛔ **One live session per account** — a parallel drive on one persona gets the sign-in
   page at **HTTP 200**, so each lane needs its own persona.
4. `qa:player-filters` + `qa:count-truth` — a filter must narrow, the survivors must match,
   every promised count must be delivered.
5. `qa:filter-scan` — every control: radius 999px, painted height ≥ 44, zero inline styles,
   zero unselected outlines. **Exits 3 if it reaches nothing.**
6. `npm run test:responsive` over **all 50 routes** at **360 / 768 / 1280 / 1920** ×
   **EN + SW + ZH**, zero horizontal overflow at 360. `MSYS_NO_PATHCONV=1` for
   `ONLY=/route` in Git Bash.
7. **LOOK AT THE SCREENSHOTS**, at 360 in Swahili first.
8. Update the docs in §9, then **ask Ali before pushing.**

---

## §9 — WHERE EACH DOC FACT GOES (§0, the filing law)

| What | Its ONE home |
|---|---|
| The rule *"a page that lists anything states its query through `QueryBar`"* | `docs/DESIGN_AUTHORITY.md` §K, as an extension of rule 6 — ⛔ never a new design doc |
| The player list shape, as record and on-ramp | `docs/DESIGN-BASELINE.md` **§3c**, mirroring §3b's treatment of the console |
| The component spec + provenance | `docs/design-system/v2-2026-07-27/02-components/query-bar/`, beside the existing `filter-pill/` |
| This tracker — the census, every ruling, what changed and what was refused | **this file** |
| The START-HERE pointer | `CLAUDE.md` |

⛔ **No number is restated in any of them.** Where a value matters the doc names the
instrument that re-derives it — **every register number in the Design Gate rotted at least
once, and one rotted mid-session.**

---

## §10 — WORKING RULES ON THIS BRANCH

- Branch `player-query-campaign`, off `1f64ca1a`. **`git branch --show-current` before every
  commit** — a push to `main` deploys the live real-money platform.
- ⛔ **Never `git add -A`** — the working directory is shared with a second session, and
  `Ocean Logo/` and `docs/REPORTS-CHECK-2026-09.md` are deliberately untracked.
- ⛔ **Never write a regex containing `\b` or `\s` through `node -e` in Git Bash** — the
  shell turns `\b` into a literal `0x08` and the pattern can then **never** match, while
  grep and sed print it invisibly. `cat -v` the pattern before blaming the product. Patch via
  a script file.
- ⚠️ **Author prose-heavy files with an editor, not a heredoc** — CRLF and delimiter mangling
  on this Windows/Git-Bash pair has cost real time.
- **Ali validates every push.** Ask first, every time.

---

## §11 — OUT OF SCOPE, RECORDED SO IT KEEPS

**The admin console — Ali's instruction, 2026-09-07: not now, say it later.** Nothing in
this campaign touches `src/app/admin/`. The inventory is gathered and holds: **~40 tables —
23 with no search, 28 with no date filter, 23 with no sort control, 18 truncating silently
with a bare `.slice()`.** Three sharper items sit inside it:

1. 🔴 **`/admin/audit` reads the in-process ring** (`audit.ts:479`, capped 10,000,
   per-container, **emptied on every deploy**) while `getAuditPageDurable()` (`:507`) is
   written and unused — and the page has **no date filter and no search**. A regulator asking
   *"every ADMIN action on 12 March"* **cannot be answered from the console.** ⛔ If this is
   ever picked up, the durable switch lands FIRST: a filter over an incomplete population is
   a check that lies.
2. 🔴 **`/admin/transactions` advertises a grammar it does not execute** —
   `helpFields={fieldNames(TXN_SEARCH)}` renders `ref:` / `msisdn:` / `type:` chips while
   `prisma-dal.ts:1418-1426` does a single `contains` over four columns. `queryToWhere` exists
   with **zero call sites in `src/app/admin`**. This is the `regex-advertised-never-executed`
   defect class recurring in a new form.
3. 🔴 **Report XLSX/PDF exports ignore the date filter above them** —
   `generate-button.tsx:36` sends only `?format=`, and `api/admin/reports/[id]/route.ts:65`
   calls `entry.build(userId)`, so the catalogue entry owns its own period.

**A section index for `/legal/terms`** — see census D. Navigation, not filtering. ▶ Ali's call.

**⛔ NOT OURS TO WRITE:** `prisma/migrations/20260907140000_agent_tier_drop/migration.sql`
(`ALTER TABLE "AffiliateAgent" DROP COLUMN IF EXISTS "tier"`). A parallel session's
permission classifier refused that DROP twice; writing it here would route around a decision
that is **Ali's**. Recorded in `docs/AGENT-PROGRAMME.md` §5. **Nothing in this campaign
depends on that column.**
