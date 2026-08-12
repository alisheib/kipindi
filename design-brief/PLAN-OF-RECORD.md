# PLAN OF RECORD — inherit the round-2 design kit, apply it, clean up

**Living document — updated after every batch.** Started 2026-08-12 (session: FINAL inherit-apply-cleanup).
Operator authorization: Ali, 2026-08-12 evening — full autonomy, commits + pushes approved
("apply all changes in the new design kit literally · don't touch market cards and progress bars ·
just the things we agreed on · organize the design files first").

**STATUS: implementation session RUNNING (started 2026-08-13).** The organization session
(2026-08-12, `78b7f000`→`fd66292b`) filed the kit, wired the gates and wrote §1–§7. This session
builds it. Ali's instruction 2026-08-13: *"walk through the design inheritance step by step,
detail by detail, side by side, every filter every bar every detail, every logic implemented,
every flow — take as much time as needed"* + *"when done don't ask, just push cleanly, all docs
updated"*. Full autonomy on commits and pushes; push per batch, verified live.

**§8 below is THE EXECUTION PLAN** — written before any code was touched, per Ali's plan-first
instruction. It pins the two open definitions on measured evidence and resolves every internal
contradiction found in the kit.

| Phase | State |
|---|---|
| 0 · Locate kit, acceptance record | ✅ done — kit filed at `docs/design-system/v3-2026-08-11-landing-discovery/` + `ACCEPTANCE.md` (commit `78b7f000`) |
| 1a · Organize design files | ✅ done — commit `78b7f000`, pushed. Everything removed archived at `F:\50pick-design-archive\2026-08-12-final\` |
| 1b · Wire 22 design gates into predeploy | ✅ done — all 22 wired; 2 ghost steps removed; **baseline: all 22 gates GREEN** on `78b7f000` (each run individually, exit 0, 2026-08-12) — no pre-existing red to carry |
| 1c · Old-doc cleanup (stale glyph archive, old-version sweep) | ✅ done — see CLEANUP-MANIFEST |
| 1d · Re-verify the baseline on `5bfd95fa` | ✅ **2026-08-13: 22/22 GREEN re-run individually with real exit codes; `npx tsc --noEmit` exit 0, zero output.** Nothing red inherited |
| 2 · Write the execution plan (§8) | ✅ 2026-08-13 — §8, definitions pinned |
| 2a · /markets data contract | ⬜ batch 1 |
| 2b · /markets UI (filter bar replaces rail) | ⬜ batch 1 |
| 2c · Hero replacement (photo out, same commit) | ⬜ batch 2 |
| 2d · Landing composition + header | ⬜ batch 3 |
| 3 · Post-implementation cleanup remainder | ⬜ batch 4 |

---

## 1 · The strategy (final — supersedes the total-replacement plan)

The existing system stays: tokens, primitives, laws, the ~200 incident-bought decisions.
From the returned round-2 kit we inherit **three surfaces only** — the hero/banner, the
`/markets` discovery layer (filter + sort + data contract), the landing composition (incl.
header) — expressed **entirely through existing tokens**. The kit's own token file is a proven
byte-identical copy of ours (0/323 value mismatches — verified 2026-08-12); the only new tokens
are the four rhythm-scale derivations the kit documents (`--rh-tight/close/section/chapter`,
all `calc()` of `--sp-*`), which will be defined once in `globals.css` in the existing grammar.

**Frozen and untouched:** `market-card.tsx`, `side-picker.tsx`, the conviction bar/needle,
`needle.css`, the palette, the type scale, the footer, all licence/RG/legal copy. (Kit contract
+ Ali's instruction, 2026-08-12.)

Kit acceptance record (file-by-file INHERIT/IGNORE + reconciliations): see `ACCEPTANCE.md`
beside the filed kit.

## 2 · Design-file organization (Phase 1a)

Ali emptied `design-brief/` on 2026-08-12 18:58–18:59 (Explorer delete) and dropped in the
returned kit zip. Everything deleted was recovered from the Recycle Bin to
`F:\50pick-design-archive\2026-08-12-final\recovered-from-recycle-bin\` (verified: v3 = 267
files, matching its documented count). Filing, per DESIGN_AUTHORITY §0b:

| Thing | Goes to | Why |
|---|---|---|
| The returned kit (raw, complete, incl. its LOCKED token copy + brand copies + the rejected 07 hero) | `docs/design-system/v3-2026-08-11-landing-discovery/` + `ACCEPTANCE.md` | §0b: incoming commission, raw and untouched, with an acceptance record |
| `LAWS.md` · `INVENTORY.md` · `LANGUAGE-AND-CONTENT.md` · `integration-notes/` (the four live references that were only inside the deleted v3 package) | `docs/design-brief/handover-2026-08/` | §0c: `docs/design-brief/` is the commission record. A package links to the rulebook; it never bundles the only copy |
| `design-brief/` (repo root) | ends holding ONLY: `PLAN-OF-RECORD.md` (this file), `CLEANUP-MANIFEST.md`, `00-NEXT-SESSION-PROMPT.md` — all tracked | the brief's end state |
| Kit zip, stale root `NEXT-SESSION-PROMPT.md` (Aug 10), `scripts/build-design-handover.mts` | archive, then delete from tree | superseded / one-shot generator for the dead strategy (untracked, non-npm, undeclared `sharp` dep — `test:orphans` would flag it) |
| `design-brief/handover-v2-2026-08-11/` tracked files (Ali-deleted, ` D` in git) | commit the deletion | round sent + kit returned; §0b banner says delete on send; archived copy kept |
| Citers to fix in the same commit | `docs/DESIGN_AUTHORITY.md:85` (stale "under review" banner) · `docs/README.md:55` (stale v2 row) | cite-check 2026-08-12: these are the only two doc citers |

## 3 · The 22 design gates (Phase 1b)

`predeploy` currently runs 4 of 22 static design gates — and is **broken**: it names
`test:sentinel-timer` and `test:sentinel-pause`, which do not exist, so the chain dies at step
44 and `build`/`qa:live` never run. Fix: remove the two ghost entries (coverage lives in
`test:sentinel-guards`, already in the chain), then wire in the 18 missing gates.

Roster (all static, no server needed — verified):

In predeploy already: `test:tokens` · `test:design-frozen` · `test:outcome` · `test:history`
To add (18): `test:bridge` · `test:design-one-door` · `test:measure` · `test:contrast` ·
`test:ui-consistency` · `test:motion-ladder` · `test:glyph-motion` · `test:reduce-motion` ·
`test:keyframes` · `test:m1-light` · `test:gold-is-money` · `test:crest-legibility` ·
`test:chip-contract` · `test:shell-boundary` · `test:admin-clip` · `test:search-adoption` ·
`test:integrity` · `test:overdue-format`

Note: the "22" count is not written anywhere in the repo — this roster is the derivation that
matches the handover's premise exactly (4 in predeploy, 22 total). Recording it here makes this
file the missing citation.

⛔ The five ratchet allowlists are **NOT regenerated at zero** (that order belonged to the dead
strategy): `design-frozen` FROZEN_ALLOWLIST (41) · `motion-ladder` ALLOWLIST (0) · `measure`
RAW_WIDTH_ALLOWLIST (58) · `m1-light` PENDING (0) · `reduce-motion` KEPT (4). Entries move only
when a change in this plan legitimately moves a measured value.

**Gate baseline (2026-08-12, tree `78b7f000`): all 22 gates GREEN** — run individually,
`test:tokens … test:overdue-format -> EXIT=0` for every one. The two ghost predeploy steps
(`test:sentinel-timer`, `test:sentinel-pause` — scripts that never existed) are removed, so the
chain no longer dies at step 44 before `build`; all 72 remaining steps resolve to real scripts
(verified by parsing `package.json`).

## 4 · The /markets data contract (Phase 2a) — concrete values, from the kit

State model (kit README §"State management", adopted verbatim):

```
status:   'open' | 'today' | 'new' | 'watch' | 'all'    default 'open'  ← default view excludes CLOSED
sort:     'closing' | 'pool' | 'people' | 'close' | 'move' | 'new'      default 'closing'
sortDir:  'asc' | 'desc' | null (null = the sort's natural direction)
odds:     'any' | 'call' (40–60%) | 'cont' (25–75%) | 'long' (<15%)     numeric boundaries fixed
pool:     'any' | '10k' (≥ TZS 10,000) | '50k' (≥ TZS 50,000)
topics:   string[] (multi-select; [] = all)
query:    string
density:  'grid' | 'list'   persisted (localStorage 50pick.discovery.v1)
watch:    string[]          persisted (same key)
shown:    paging cursor — page size 12 (2–3 col grid) / 6 (1 col); resets on any change
```

URL contract: `/markets?status=…&sort=…&odds=…&pool=…&topic=a,b&q=…` — defaults omitted
(clean board = clean URL); server-renderable; controls write `replaceState`, only `q` uses
`pushState` (debounced 300ms). Sort options + hints: Closing soonest (default) · Biggest pool ·
Most predictors · Closest call · Biggest move (absent `move24h` sorts LAST, not zero) · Newest
first. Result count in the sticky bar **is** the pager total — same value, same source.
Empty states per cause: filter-miss (computed relaxations with real counts) ≠ search-miss
(catalogue gap: search-all-including-closed + suggest). `New` follows `market-card.tsx`'s
`isNew` definition. Definitions to pin during 2a implementation: does "live" include
`selectionClosed`; what `All` includes — record the answers here when pinned.

_Open items to pin in 2a (recorded when implemented): the exact status→MarketStatus mapping,
topic taxonomy source of truth, whether search is server-side._

## 5 · Decisions log (reconciliations — decided calls beat the kit)

1. **Hero = kit's `01` recommendation** (question board + brand-mark backdrop + live
   `<MarketCard/>` in the hero foot). Headline **"The wisdom of YES & NO."** verbatim.
   `public/hero/hero-bg.webp` + its `page.tsx:80` reference removed in the SAME commit the new
   hero lands. The `07` alternative hero: not chosen, filed as provenance only.
2. **Cold start:** hero becomes the FOURTH consumer of the existing cold-start rule — concrete
   behaviour to be pinned here before batch 2c (awaiting codebase map).
3. **Measured widths beat the kit's +25% stress assumption:** short labels sized to SW
   1.74× p90 / 2.25× p95 (source: `docs/design-brief/handover-2026-08/LANGUAGE-AND-CONTENT.md`).
   Mobile verification at **360px**, not the kit's 390.
4. **Gold discipline Q5 narrows the kit's palette rule:** gold stays on pool figures + settled
   payouts (real money); NO gold on sort (kit's final agrees), watch star, result count,
   question-board YES-% — unless stripping it guts the hero, in which case it goes to Ali as a
   named question, not decided silently.
5. **First-visit modal copy:** how-it-works band and the modal read the SAME i18n keys.
6. **RG line above footer + public source attributions (TMA/Transfermarkt/TwelveData):** built
   as designed (strings verbatim from `public-footer.tsx`), flagged for Ali/compliance in the
   final report; one deletion each if refused.
7. **Frozen-card tap targets + type-nano/label raise:** NOT touched (kit's own contract +
   Ali's instruction). Recorded as open items for a later Phase-3-token decision.

## 6 · Batch log (updated after each push)

| Batch | Commit(s) | Gates | Verified | Notes |
|---|---|---|---|---|
| 1a organize | `78b7f000` | docs · one-door · integrity · orphans · tsc — all green | pushed, prod 200 | kit filed + acceptance; references refiled; v2 deletion committed |
| 1b gates | `c7cb34ec` | all 22 design gates green individually; 72 predeploy steps resolve | pushed, prod 200 | 2 ghost steps removed |
| 1c glyph cleanup | `fd66292b` | docs · one-door · integrity green | pushed | 03-glyphs archived (41 files / 22,866 B verified) + 4 citers annotated |
| 2a contract · step 1 (pure module + gate) | `(this session)` | `test:discovery-contract` 78 assertions green; `red:discovery-contract` **7/7 real defects caught**, tree restored byte-identical; tsc 0 | local | `src/lib/markets/discovery.ts` — parsing, defaults, ONE href builder, status predicates, odds/pool buckets, sorts + explicit tie-breakers, cross-filtered counts, relaxations. Pure: no server imports, lifecycle facts stay in `market-service.ts` |
| 2a contract · step 2 (page wiring) | _in progress_ | | | |
| 2b markets UI | _next session_ | | | |
| 2c hero | _next session_ | | | |
| 2d landing + header | _next session_ | | | |
| 3 remainder | _next session_ | | | |

## 7 · IMPLEMENTATION DOSSIER — measured facts for the next session (2026-08-12)

Three read-only investigations mapped the live code. Everything below is verified with
file:line; re-verify only what a later commit may have moved.

### 7a · /markets today (what batches 2a/2b replace)

- `src/app/markets/page.tsx` (692 lines) — **pure server component**, `force-dynamic`;
  `FilterBar` / `SearchAwareGrid` / `LiveEmptyState` / `GridSkeleton` are async server
  functions inside the same file. Client islands: `RefreshPoller` (30s), `SearchBox`,
  `MarketCard`, `EmptyState`.
- Board read: `getLiveBoard = cache(() => listMarkets({status:"LIVE"}).filter(m => !isClosedByTime(m)))`
  (`page.tsx:65-67`) — ONE read per request (B-17); enrichments (`traderSeedsByMarket`,
  `getCardCharts`, `countCommentsByMarkets`) degrade with `.catch(() => new Map())` (B-1);
  the board read itself must keep throwing to `error.tsx`.
- URL params today: `cat` / `when` / `q` / `page` — `DEFAULT_WHEN = "all"` has **four readers**
  (`page.tsx:50-54`) and there are **three independent href builders** (`page.tsx:161`, `:302`,
  `:415`) plus `Pagination.href` (`pagination.tsx:56-60`). Any new param (sort/odds/pool/topic)
  must thread through ALL of them or links silently drop it.
- ⚠️ `when=today` as default once rendered a 0-card board on production while the header said
  "40 live" (`page.tsx:34-54`) — the kit's status counts avoid this class; keep counts honest.
- The rail to delete: 5 `WHEN_OPTIONS` + 8 `CATEGORIES` pills (`page.tsx:135-221`).
  ⚠️ **`h-8` = 48px here** — `tailwind.config.ts:156-171` overrides the spacing scale
  (`h-10` = 80px, `px-3` = 16px). Burn records: `pagination.tsx:74-84`, `loading.tsx:10`.
- No sort UI exists; the pattern to copy is `/results` (`src/app/results/page.tsx:33-223`:
  `SortField`, parse, `SORT_OPTIONS`, apply, `buildHref`, a third `<nav>` rail group).
- **Both skeletons hard-code `height: 349`**: `loading.tsx:70` (route transition) and
  `page.tsx:666` (`GridSkeleton`, the Suspense fallback a visitor actually sees). Move the
  measured card height through ONE shared definition in the same commit as any change.
  Licence condition 1: skeleton blocks must not read as numbers.
- Paging: `PLAYER_PER_PAGE = 12` (`pagination.tsx:16`); kit contract: `Load N more`,
  N = min(pageSize, remaining); 12 at 2–3 cols / 6 at 1 col; pager total == filter-bar count.
- Watchlist: `watchlist-service.ts` + `WatchStar` (`src/components/markets/watch-star.tsx`)
  exist — star renders ONLY on the detail page today; `/watchlist` route exists with no
  `/markets` entry point. Kit: 44×44 star on every market, `Watching` status filter.
  ⚠️ Kit persists watch to localStorage; the CODEBASE already persists server-side — the
  server wins (decided): `Watching` filter reads the service, not localStorage.
- Search: `SearchBox` debounced-URL 250ms + grammar (`src/lib/search/fields.ts:47-58`,
  fields title/category/criterion/id/status). Typeahead is greenfield (kit §3g).
- Density toggle: does not exist anywhere — greenfield (kit compact list §3e,
  `role="table"` semantics).
- `move24h`: derived, `getCardCharts` (`market-history.ts:293-338`), `undefined` without a
  24h baseline (A-5). Today fetched only for rendered ids — the `Biggest move` sort needs a
  board-wide fetch; **absent sorts LAST, never as 0**.
- `isNew`: the card derives `fresh = volume===0 && predictors===0`, `noPrice = volume===0`
  (`market-card.tsx:237-238`); the board's "new markets" rule matches (`page.tsx:385`).
  The kit's `New` status filter follows the card. `predictorCount` counts PEOPLE and is never
  decremented on cash-out.
- "Open" vs closed: inclusion gate `isClosedByTime` (`market-service.ts:340-343`); a
  selection-closed market STAYS on the board awaiting results (`isSelectionClosed`,
  `:348-352`) — the kit's `Open` segment = today's default board; `All` = decide whether it
  adds RESOLVED/VOIDED (kit invented `All 58` incl. closed — pin this in 2a and record here).
- Categories: 7 + all — **Politics is licence-excluded** (`market-service.ts:65-76`); the
  8-item list is re-declared in ≥5 places (`markets/page.tsx:142`, `results/page.tsx:84`,
  `app/page.tsx:47`, `admin/markets/page.tsx:27`, `admin/markets/new/wizard.tsx:18`) —
  derive from `MARKET_CATEGORIES` while touching this. `categoryGlyph()` exists
  (`glyphs.tsx:334-343`).
- Topic aggregate (count + pool per topic): **does not exist** — fold it from the one cached
  board read in JS (~40 rows), never a second query; per-topic counts must reconcile to the
  header count (kit's own requirement).
- Measure: `/markets` page + loading are on the RAW_WIDTH ratchet allowlist
  (`measure-system.test.mts:50`) — migrating them to `<PageContainer tier="board">` SHRINKS
  the list (the one legitimate ratchet move; identical emitted classes).
- Sticky geometry is a coupled triple today: `top-[56px]` / `lg:top-[122px]` /
  `min-h-[17px]` echo row (`page.tsx:104`, `:122`, `search-box.tsx:171-180`). The kit's
  sticky filter bar (top 56, z 20, condense-on-scroll via `grid-template-rows: 1fr→0fr`,
  never max-height) replaces this — re-derive the offsets once, keep them in one place.
- `ProposePromo` renders at `page.tsx:98` — kit: **remove from /markets entirely** (footer
  link keeps the flag).
- i18n: ONE dict (`src/lib/i18n-dict.ts`, en≈1 / sw≈1637 / zh≈3083). `common.sort`
  ("Panga"/"排序") exists unused; `results.sortNewest/sortHighest` are the sort-label
  precedent. ⛔ **CORRECTED 2026-08-13 — this line used to say "`Dict = typeof dict.en` so
  missing keys are compile errors". THAT IS FALSE and it is the dangerous direction to be
  wrong in.** `Dict` is derived from `en` ALONE, there is no `satisfies Record<Locale, Dict>`
  anywhere in the file, and both consumers erase the drift with a cast
  (`i18n-server.ts:20`, `i18n.tsx:98` — `dict[locale] as Dict`). A key added to `en` and
  forgotten in `sw`/`zh` **typechecks clean and ships**. `npm run test:i18n` is the only real
  parity check — the gate's own header says so. The group is `market` (singular, 334 keys);
  there is no `markets.*`.

### 7b · Landing + header today (what batches 2c/2d replace)

- `src/app/page.tsx` order today: full-bleed hero (`:72-212`; `<img src="/hero/hero-bg.webp">`
  at `:80`, inline oklch gradient literals `:99-113`) → Up&Down band (`:217-246`) → live grid
  of 8 (`:248-286`) → topic tiles (`:288-311`, static `TOPICS`, no counts) → trust strip
  (`:313-353`) → `StatsBand` (`:355-366`, gated `settledCount > 0`).
- ⚠️ The hero H1 is **hardcoded English JSX with no i18n key** (`:134-152`). Decision: the
  headline words stay verbatim in ALL locales ("The wisdom of YES & NO." — YES/NO are product
  terms and the words are the decided call); move it to dict keys anyway so the string has one
  home, with identical en/sw/zh values unless Ali says otherwise. Eyebrow/lede stay translated
  (`t.home.*`).
- **Cold start**: `docs/DESIGN_AUTHORITY.md:494-498` — ONE rule (`volume===0 && predictors===0`
  on a live open market), THREE consumers (`markets/page.tsx:385`, `market-card.tsx:237-238`,
  `markets/[id]/page.tsx:209-224`; the card/detail split it into `fresh`/`noPrice` — read
  their comments). The new hero is the FOURTH consumer: the aggregate-conviction bar gates on
  `Σ pool > 0` (below it: the dashed-rail vocabulary `--bar-empty-track`, never a 50% claim —
  `impliedYesPct` returns a hardcoded 50 on an empty pool, `market-service.ts:232-236`);
  the question board gates on `live.length > 0`. **Update DESIGN_AUTHORITY's three-consumer
  paragraph to four in the same commit.**
- **Aggregate conviction** is net-new: `Σ yesPool / Σ (yesPool+noPool)` over live markets,
  computed once server-side — never an average of per-market percentages.
- **The ticker is global and its data is FABRICATED** (`src/lib/server/ticker-feed.ts` — a
  hardcoded 12-item synthetic array, on every page of a licensed real-money product). The kit
  keeps a ticker as the one permitted perpetual loop; the batch that touches the landing must
  wire it to REAL events (recent settled markets keyed off `settledAt` + recent market opens)
  or render nothing — A-5: nothing over a guess. This is the plan's one product-honesty fix.
- **Settled strip** (new): `listMarkets({status:"RESOLVED"})` then **re-sort by
  `settledAt ?? resolutionStage2At` DESC** — never slice the board-ordered list (that pinned
  3 July markets as "recent" on prod once, `markets/page.tsx:326-334`); a RESOLVED market with
  `settledAt: null` is still inside the objection window — key off `settledAt`. Source label:
  the market's `sourceUrl` host or the settlement source name; amount = pool − fee via
  `payout.ts` + the frozen `feeSnapshot`, formatted by `formatTzs` — gold is correct here
  (earned money). `resolvedOutcome` must be threaded to every new call site that can render a
  resolved state (law 25 / `test:outcome` reads call sites).
- **Header** (`src/components/layout/top-app-bar.tsx`): today translucent
  (92%/78% + blur ≥1024, `globals.css:2455-2464`) → kit: **opaque `var(--panel)` at every
  scroll position**, `--shadow-2` when scrolled (140ms ease-out). Today NO auth buttons in the
  header (auth lives in avatar menu + hero + bottom rail) → kit: `Sign in` (ghost) + `Sign up`
  (pill) in the header at every width. Language toggle today is a 3-pill capsule hidden <640
  AND 1024–1279 (the overflow band, `top-app-bar.tsx:137-142`) → kit: ONE 44×44 `EN ⌄`
  trigger at every width opening a `role="listbox"` (options must be DIRECT children).
  Nav tiers: destination (no border) / utility (bordered) / action (pill); active =
  `--pill-active` + `--text` + 600 — the ONLY active treatment. Up & Down is a destination
  with a 5px `--gilt` dot + `--brand-300` ink (⚠️ verify the gilt dot against
  `test:gold-is-money` before shipping; if the gate objects, the dot goes brand, not gold).
  ⚠️ The nav must hold `Jedwali la Washindi` (SW for "Top", 19 chars, ×6.33) through the
  1024–1279 band — the band that already overflowed once.
- **Bottom rail** (`src/components/layout/bottom-nav.tsx`): today 5 slots authed / 4 guest,
  aqua-literal active pill → kit: 5 slots `Markets · Up & Down · Live · Results · More`,
  active = `--pill-active` on the pip + `--text` label (same language as desktop), auth NOT
  in the rail (it moves to the header), `--panel` + 1px `--border` top +
  `--shadow-overlay-up` + safe-area padding. Keep `t.nav.*` keys; More carries Positions /
  Wallet / Top / Invite for authed users (wallet stays one tap via the header pill).
- **How it works** (new section): heading + lede read the SAME dict keys as the first-visit
  primer (`t.primer.card1Title` = "Predict events. Not chance." + `card1Body`) — and fix
  `first-visit-primer.tsx` to read the dict too (today it duplicates the copy inline,
  `:164-211`; the `t.primer.*` keys exist in all three locales and are dead). The three step
  cards are the kit's new copy (README §1b verbatim) → new dict keys with SW+ZH.
- **Trust band**: use `PaymentLogo` (`src/components/wallet/payment-logo.tsx`) for the M-Pesa
  cell — marks are trademarked, must sit on a WHITE tile, `public/pay/mpesa.svg` is a vertical
  lockup (`:20-39` constraints). Never inline the SVG.
- **Stats band replacement**: the two-counter `StatsBand` goes; the proof rail (hero) and the
  settled strip carry the proof role. Real figures only: live count, `Σ` open pools,
  predictions today (count since 00:00 EAT — new cheap query), closing today (`≤24h`).
- **Entry motion**: budget 550ms (kit MOTION.md); use existing `--t-*`/`--m-*` +
  `.m-in`-family utilities; IO precedent is `pulse-grid.tsx:83`; ⚠️ `motion.css` ATOM A
  (`:173-188`): `animation-delay` IS clamped under reduced motion — a delayed `both`-fill
  keyframe blanks content for its whole delay. Reveal marks everything visible without the
  observer under reduced motion; script adds the `.js` class so no-JS renders everything.
  THREE motion gates (OS / in-app / low-end throttle) — every new loop needs its calm branch
  in the same change (`test:reduce-motion`).
- Rhythm tokens: define `--rh-tight/close/section/chapter` ONCE in `globals.css` as `calc()`
  of `--sp-*` with the placement rule as the comment beside them (kit README §1 has the rule:
  144 · 96 · 96 · 144, compressing to ~122/97/96/123 at ≤1024).
- `app-shell.tsx:145`: `<main>` carries `pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0`
  for the floating rail — any new fixed element must respect it. `.market-grid` is SHARED by
  landing and /markets (`globals.css:2640-2702`) — a change hits both.
- OG/social + reports also carry "Predict events. Not chance." (`layout.tsx:43,68,75`) — the
  how-it-works promotion does not touch those.

### 7c · Verification protocol (every batch)

1. `npx tsc --noEmit` · `npm run build` · `npm run predeploy`-relevant gates (at minimum the
   22 design gates + `test:measure` + `test:markets` + `test:i18n` + `test:trilingual`).
2. Boot local in-memory server → screenshot every changed surface at **360 and 1280** in
   **en, sw, zh** — and READ the screenshots (ellipsis notes, clipping inside cards).
3. Commit by explicit path (`git add <paths>`), `git branch --show-current` first, push
   `origin HEAD:main`, then verify: prod 200 + `railway logs -s 50pick` clean boot + live
   screenshot. Quote outputs in the batch log (§6).
4. ⚠️ A second operator shares `main` — `git fetch` + check for new commits before every
   batch; never `git add -A` (another session's in-flight files were once swept into a
   broken deploy).

---

# 8 · THE EXECUTION PLAN (written 2026-08-13, before any code was touched)

## 8.0 · How this session works

One step at a time: **make the change → verify it → record it → next**. Never two batches in
flight. If a step's outcome contradicts this plan, the plan is updated *before* proceeding, not
after. Four batches, each ending in: gates green → screenshots at 360 and 1280 in en/sw/zh →
commit by explicit path → push → verify live → batch log updated in §6.

**Session baseline, measured 2026-08-13 on `5bfd95fa` (not inherited from the previous session's
claim):** `npx tsc --noEmit` → exit 0, zero output lines. All 22 design gates run individually
with real exit codes → **22 green / 0 red**. ⚠️ The exit code was captured *without* a pipe:
`npm run test:x > log 2>&1; code=$?`. Trap 4 (`EXIT=$?` after a pipe reads the last command) was
hit once during this session's first typecheck and the reading was discarded.

## 8.1 · PINNED DEFINITION 1 — what `Open` means

> **`Open` = status `LIVE` **and** `isSelectionClosed(m) === false`.**
> A market a player can actually place a bet on at this instant.

This closes the kit's open question 5 (`README.md:416`, `OPEN-QUESTIONS.md §6.1`), which the kit
deliberately left unanswered and which `ACCEPTANCE.md`'s twelve reconciliations do not resolve.

**Why this direction, and why it is safe — measured on production 2026-08-13:**

| Whole live board, all 4 pages of `https://50pick.tz/markets` | |
|---|---|
| Bettable cards (`chip-live`) | **40** |
| Selection-closed cards (`chip-pending`) | **1** |
| Total | **41** — exactly the header's own "41 live" |
| Share an `Open` segment removes from the default view | **2.4 %** |

⛔ **This is the number that had to be checked before pinning, and it is why the answer is not
obvious.** `createMarket` forces a category selection-lead onto essentially every poll, and the
table runs to **2,880 minutes = 48 hours** for macro/infrastructure
(`ai-poll-config.ts:23-32`) — so a macro poll is betting-closed but still `LIVE` on the board for
up to two days. On a differently-shaped book this definition could hide a large slice. It hides
**one card today**, which is nowhere near the class of the 2026-08-10 incident (a 24-hour window
over long-horizon inventory rendered **0 cards** at nine of nine viewport×locale combinations
under a header reading "40 live"). ⚠️ **Re-measure this ratio before assuming it still holds.**

**The supporting argument (the measurement alone does not decide it):**
- The card already contradicts the word. A selection-closed card wears `chip-pending` labelled
  **"Closed"**, loses the live dot, and its YES/NO row is replaced by a `pointer-events-none`
  ghost (`market-card.tsx:213`, `:289-297`, `:373-390`). Calling that card "Open" is a promise
  the server itself refuses — `buyPosition` returns `SELECTION_CLOSED` (`market-service.ts:678`).
- The kit's stated purpose for the segment is exactly this: *"`Open` being the default is the
  entire mechanism that removes closed markets from the default view"* (`COMPONENTS.md:122-124`).
- It makes every count truthful: the number beside `Open` is the number of markets you can bet on.

⛔ **What does NOT change:** `isClosedByTime` stays the board-INCLUSION gate
(`markets/page.tsx:65-67`, `:260-262`). A selection-closed market is still fetched, still on the
board, still reachable — it simply lives under `All` rather than `Open`. The ⛔ comment at
`page.tsx:260-262` remains true and must not be deleted.

## 8.2 · PINNED DEFINITION 2 — what `All` means

> **`All` = the UNSETTLED book of the poll product line: status `LIVE` ∪ status `CLOSED`.**
> `RESOLVED` and `VOIDED` are **not** included — they live at `/results`.

This **departs from the kit's literal text**, and the departure is deliberate and recorded.

**What the kit actually says, and why it is not authority here:**
- The kit's own documents flag `All` as **invented and unconfirmed**, twice, in identical words:
  *"`All` includes closed and resolved; confirm that is what a user expects `All` to mean"*
  (`OPEN-QUESTIONS.md:59`, `README.md:398`).
- **The executable spec is silent.** In the prototype, `open` and `all` carry the *byte-identical*
  predicate `test:()=>true`, and the 18-market fixture has no status, resolved or outcome field
  at all (`prototype/…dc.html:446-452`, `:383-402`). At runtime the prototype's `All` and `Open`
  return the same set and the same count. There is nothing to inherit.
- The kit's drawn `All 58` vs `Open 41` is a delta of 17 that is never itemised anywhere.

**Why LIVE ∪ CLOSED is the right answer:**
1. **It does not duplicate a whole nav destination.** `/results` already covers the entire settled
   archive — `RESOLVED` + `VOIDED`, category filter, two sorts, an outcome-donut KPI, a notable
   carousel, search on the shared grammar and pagination at 12/page
   (`results/page.tsx:111-148`) — and it is in the primary nav for both authed and anonymous
   users (`top-app-bar.tsx:71`, `:79`).
2. **It fills the one genuine hole.** `CLOSED` appears on **no player discovery surface today**:
   `/markets` queries LIVE (`:66`), `/live` queries LIVE (`live/page.tsx:41`), `/results` queries
   RESOLVED+VOIDED (`:111-112`), `/fairness` queries RESOLVED (`:74`). Only the detail page and
   `/watchlist` render one.
3. **It makes `Open` ⊂ `All` a real, non-empty difference** — `All − Open` = selection-closed
   markets ∪ CLOSED markets — which is what a segment control is *for*. The kit's version could
   not distinguish them.
4. **The card needs no new state.** `MarketCard` already renders CLOSED with its own chip and
   copy (`market-card.tsx:24`, `:288-298`), and `/watchlist` is the live precedent for a player
   board passing every status through one grid (`watchlist/page.tsx:76-80`).

⛔ **`All` NEVER means "both product lines".** `test:product-line` lists
`src/app/markets/page.tsx` as `MUST_STAY_DEFAULT`; any `listMarkets` call there carrying
`productLine:"ALL"` fails the gate, because Up & Down rounds (~300k/yr) would flood the board
(`scripts/product-line.test.mts:100-114`).

⚠️ **Adding `VOIDED` would be a new unbounded query** — `/markets` reads LIVE and RESOLVED today
and never reads VOIDED. Another reason the line is drawn at CLOSED.

## 8.3 · Count honesty — the rule this session adds

The 2026-08-10 incident's real lesson is recorded at `board-discovery.test.mts:15-19`: the
number "40 live" was **factually true** and the board was still a lie, because the count described
the census while the grid described a filtered subset. The kit puts a count on **every** segment
and binds the pager total to the filter-bar count (`README.md:227`). So:

> **Every count rendered on `/markets` names the exact set the board would show if you pressed it.**

Concretely:
- Each status segment's count = markets matching **that status AND every other active filter**
  (odds/pool/topic/q) — the prototype's cross-filtered `countWith` behaviour
  (`prototype:731`, `:589`), **not** the drawn layouts', which show `Open 41` while odds+pool are
  pressed and the result reads 9 (`04-markets-discovery-desktop.html:362`). The layouts are wrong
  on this and the prototype is right.
- Topic counts use the same cross-filtered mechanism (`prototype:784`).
- The pager total **is** the filter-bar count — same value, same variable, never recomputed.
- The page header's census figure is relabelled to name the set it actually counts, so the header
  and the segments can never state two different totals for the same word.

## 8.4 · The kit contradicts itself in eleven places — every one resolved here

Found by reading `README.md`, `SPEC.md`, `COMPONENTS.md`, `DISCOVERY-RATIONALE.md`,
`OPEN-QUESTIONS.md`, the three layouts and the working prototype against each other.

| # | The contradiction | Resolution (and why) |
|---|---|---|
| 1 | **`topic` is specified three incompatible ways** — SPEC/URL says single value (`:565`); README says comma-joined array (`:321`, `:308`); DISCOVERY-RATIONALE explicitly rejects multi-select by name (`:37-40`) | **Single-select.** Two of three sources agree and the third *argues* the case ("multi-select doubles the state space"). URL carries `topic=<slug>`, default `all` omitted |
| 2 | **Topic control shape flipped twice inside the kit** — round 2.1 made it chips on desktop (`SPEC.md:457-458`); round 2.6, the LAST round, replaced eight pills with one menu (`SPEC.md:734`). Layouts follow 2.6; the prototype still renders chips | **One menu control**, same shape as sort. The last correction round wins — that is what "round 2 final" means |
| 3 | **Status segment count: 5 in the docs, 4 in every drawn layout** — `Watching` appears in README/COMPONENTS but in none of 04/05/06 | **Five.** `Watching` is specified behaviour with a server-side service already built; the layouts simply predate it |
| 4 | **Sort count: 6 in the docs, 5 in every drawn menu** — `Biggest move` is absent from all three layouts | **Six.** README/SPEC/COMPONENTS/prototype all carry it; SPEC calls it out as a new sort (`:460`) |
| 5 | **`Biggest move` absent-value handling** — written rule and `ACCEPTANCE.md:111` say *sort last*; the prototype coerces absent→0 (`:432`), which puts them last only in the natural direction and **first** once the user flips it | **Last in BOTH directions.** Implemented as a partition, not a coerced value. `ACCEPTANCE` already adopted this; the prototype is the defect |
| 6 | **Segment counts cross-filtered (prototype) vs not (layouts)** | **Cross-filtered** — see §8.3. A count that says 41 and yields 9 is the incident's own failure shape |
| 7 | **`Clear all` clears to a different status than `Clear every filter`** — bar resets `status:'open'` (`:795`), empty-state fallback resets `status:'all'` (`:813`) | **`Clear all` → `open`** (the default), and the empty-state's last-resort exit is relabelled **"Include everything"** → `all`, which is what it actually does. They are two different actions and will read as two different actions |
| 8 | **Page size 6 at one column is specified but not implemented** — the responsive `page` (6 when <720) is used for `Load N more` but the initial cursor and every reset use the constant 12 (`:499`, `:572`, vs `:627`) | **Implement the contract**: initial page and every reset use the responsive size. Whole rows, never an orphan |
| 9 | **`shown` resets "on any change" — except density and watch, which bypass `redeal()`** (`:774`, `:670` vs `README.md:312`) | **Density and watch do NOT reset paging** — they change presentation and membership-of-a-set, not the query. The README's blanket sentence is the imprecise one |
| 10 | **End-of-set copy differs** — spec/layouts: *"…that is every market matching these filters"* (`COMPONENTS.md:232`); prototype: *"…that is the whole board"* (`:352`) | **The spec's wording.** It is true under every filter combination; the prototype's is only true with no filters applied |
| 11 | **Search-miss exits exist only in the drawn layout**, never in the prototype (`06-states.html:384` vs `:813-814`) | **Build the layout's version** — search-miss and filter-miss are genuinely different causes and the plan already requires per-cause empty states |

**Two further absences (nothing to resolve — recorded so nobody re-hunts them):**
- **Tie-breaking is unspecified across the entire kit.** The prototype relies on JS sort
  stability. → This session defines one explicit secondary key per sort and records it in §8.5.
- **`status=watch`, `sortDir` and `density` have no URL representation** (`SPEC.md:561`), yet ship
  as state. → `sortDir`/`density` stay client-persisted (`50pick.discovery.v1`) and out of the
  URL, per the kit. `Watching` **does** get a URL value, because a status segment that cannot be
  linked to is the only one that breaks the back button.

## 8.5 · The pinned data contract (what Batch 1 implements)

**URL params** — every default omitted, server-renderable, `replaceState` on every control except
`q` which uses `pushState` debounced 300 ms so Back clears a search:

| Param | Values | Default |
|---|---|---|
| `status` | `open` · `today` · `new` · `watch` · `all` | `open` |
| `sort` | `closing` · `pool` · `people` · `close` · `move` · `new` | `closing` |
| `dir` | `asc` · `desc` | *(absent = the sort's natural direction)* |
| `odds` | `any` · `call` · `cont` · `long` | `any` |
| `pool` | `any` · `10k` · `50k` | `any` |
| `topic` | `all` + the 7 category slugs | `all` |
| `q` | free text, trimmed | *(empty)* |

**Status predicates** (all against the ONE cached board read):
`open` = LIVE ∧ ¬selectionClosed · `today` = open ∧ closes ≤ 24 h · `new` = **follows
`market-card.tsx`'s rule** (`volume === 0 && predictors === 0`, `:237-238`) not the kit's
"added in 4 days" — per `ACCEPTANCE.md:109-110` · `watch` = server-side watchlist membership
(the service wins over the kit's localStorage) · `all` = §8.2.

**Sort keys, natural direction, and the tie-breaker this session defines:**

| Key | Label | Expression | Natural | Tie-break |
|---|---|---|---|---|
| `closing` | Closing soonest | `bettableUntil(m)` | asc | `createdAt` desc |
| `pool` | Biggest pool | `yesPool + noPool` | desc | `bettableUntil` asc |
| `people` | Most predictors | `predictorCount` | desc | pool desc |
| `close` | Closest call | `abs(50 − yesPct)` | asc | pool desc |
| `move` | Biggest move | `abs(move24h)` | desc | pool desc |
| `new` | Newest first | `createdAt` | desc | `bettableUntil` asc |

⛔ `move`: markets with **no** `move24h` are partitioned OUT and appended last **in both
directions** — never coerced to 0 (contradiction 5). `move24h` is `undefined` without a 24 h
baseline (`market-history.ts:293-338`) and A-5 forbids inventing one.
⚠️ `closing` must sort by **`selectionClosedAt ?? resolutionAt`** — the clock the card *shows* —
not `resolutionAt`. The existing `bettableUntil` helper (`page.tsx:263-264`) already encodes this
and the comment above it records why (a board that contradicted its own cards).

**Odds buckets** (single-select, inclusive unless stated): `call` = 40 ≤ pct ≤ 60 ·
`cont` = 25 ≤ pct ≤ 75 · `long` = pct < 15 (strictly under). `call` ⊂ `cont` by design.
⚠️ `impliedYesPct` returns a hardcoded **50** on an empty pool (`market-service.ts:232-236`), so
a cold-start market would land in `call` and `cont` on a number nobody staked. **Markets with
`pool === 0` are excluded from every odds bucket** — licence condition 1 (never render a guessed
number) applied to filtering, not just display.

**Pool buckets**: `10k` = pool ≥ 10,000 · `50k` = pool ≥ 50,000 (TZS, inclusive, no upper bound).

**Paging**: 12 at 2–3 columns, 6 at one column, always whole rows. `Load N more` where
N = min(pageSize, remaining). Under one page → no pager. Reset to page 1 on any status/sort/
odds/pool/topic/q change (not on density/watch). Count line `aria-live="polite"`; the grid is not.
Infinite scroll is prohibited (`DISCOVERY-RATIONALE`).

**Empty states — three causes, never one generic**: filter-miss (offer computed relaxations with
real counts, priority-ordered, only those yielding > 0, capped at 3, first primary) · search-miss
(search-everything-including-closed + suggest + Try chips) · watching-empty.

## 8.6 · Gate risk register (checked before writing code)

| Gate | Risk from this work | Action |
|---|---|---|
| **`test:board-discovery`** | 🔴 **Will break by design.** It is a *structural* guard pinned byte-close to the current implementation: `DEFAULT_WHEN` as a named constant, the `WHEN_CUTOFFS` table, ≥5 `DEFAULT_WHEN` usages, ≥2 `sp.when` readers, the `resolvedAll` descending re-sort, `inWindow = new Set(...)` (`board-discovery.test.mts:64-141`). Replacing the when-rail removes every anchor it greps for | **Rewrite the gate onto the new structure in the SAME commit**, preserving its *property* — "a player who has chosen nothing is never shown a subset of the live book chosen by a clock" (`:26-29`). ⛔ Do not delete it, do not weaken it. Its RED harness (`board-discovery-red.mjs:45-60`) mutates `page.tsx` by exact string anchors and must be re-anchored too |
| **`test:product-line`** | `/markets` must never opt into `productLine:"ALL"` | `All` = LIVE ∪ CLOSED on the MARKET line only. Gate stays green untouched |
| **`test:outcome`** | If the grid can render a RESOLVED card, law 25 forces `resolvedOutcome` onto that call site. ⚠️ The gate's detection is **regex-shallow** — `status={statusFor(m)}` would EVADE it (`outcome-display.test.mts:92-95`) | `All` excludes RESOLVED, so the main grid never renders one. The existing resolved teaser keeps its literal `status="RESOLVED"` + `resolvedOutcome` |
| **`test:measure`** | `/markets` page + loading are on the `RAW_WIDTH_ALLOWLIST` (`measure-system.test.mts:50`) | Migrating both to `<PageContainer tier="board">` **removes** two entries — the one legitimate ratchet move (shrinking, never zeroing) |
| **`test:gold-is-money`** | Watch star and any gilt nav dot are challengeable | Verify both against the gate before shipping; default to non-gold. Sort carries no gold (the kit's own final round withdrew it) |
| **`test:i18n` / `test:trilingual`** | Every new key needs real SW + ZH; `Dict = typeof dict.en` makes a missing key a **compile error** | Add all three locales in the same edit |
| **`test:chip-contract`, `test:ui-consistency`, `test:contrast`, `test:shell-boundary`** | New chips, new controls, new sticky bar | Run after every step, not once at the end |

⚠️ `test:board-discovery` and `test:product-line` are **NOT in `predeploy`** — they can rot
silently. Both are run explicitly in this session's per-step verification.

## 8.7 · Batch order and per-step verification

Unchanged from the brief: **1** `/markets` contract + UI · **2** hero · **3** landing + header +
rail · **4** cleanup + handoff. Every step, without exception:

1. `npx tsc --noEmit` — real exit code, no pipe.
2. The gates that step can plausibly break, plus `test:board-discovery` + `test:product-line`.
3. Local drive at **360** and **1280** in **en · sw · zh** against a seeded in-memory server, and
   the screenshots are **read**, not just captured (ellipsis, clipping inside cards).
4. Commit by explicit path. `git branch --show-current` first. `git fetch` and check for a second
   operator's commits before every batch.
5. Push, then verify: prod 200 + clean boot + a live screenshot.
6. Update §6's batch log **in the same commit** as the code.

**Local harness for this session** (`.qa-design-round2/`, gitignored under `.qa-design-*/`):
in-memory dev server on `:3009` (no `DATABASE_URL` exists on this machine — verified — so a local
boot cannot reach production), seeded via `/api/dev-test/seed-real-markets` +
`/api/dev-test/seed-markets` → **46 live markets**, enough for 4 pages at 12/page.
⚠️ A dev server booted while `prisma generate` was running served **404 on every `/api/*` route**
while rendering pages normally; a clean restart fixed it. Not a product defect — do not chase it.
