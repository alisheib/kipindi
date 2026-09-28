# WP3 · Featured card — build spec

Worktree `C:\kipindi-landing-v3`, branch `landing-v3`, HEAD `3d6cdb67`. Line numbers are from that HEAD. The tracker (§2.1) names functions, not lines, so re-grep before each edit.

**Sources read:**
- `docs/LANDING-TEN.md`: §2.1 WP3 (L180–196), §3 K7/K18/K22/K36/K47–K49
- `HANDOVER-LANDING-10.md` WP3
- `SPEC-VALUES.md` §2, §4, §6
- `ACCEPTANCE.md` §C3 and §C8
- `INHERIT-MANIFEST.md`: R3, L3, L5, L6, L14, L17, L22
- The concept file, `design/50pick Home Concept v3.dc.html`:
  - Featured card: L157–206. Top row L158–161, h2 L163, meta line L164, price and delta row L166–170, bar with ghost tick and "24h ago" label L171–176, predictors and pool L177, buttons L178–183.
  - Grid card: L325–369. It shows **no source**, so V18 is our addition. The board row's meta line at L258 does name its source.
  - How the ghost and delta are computed: L654–657.

---

## 0 · Files touched

| File | Why |
|---|---|
| `src/components/markets/market-card.tsx` | Featured-only: time top-right, full question, meta line, 24h delta, bar as `img` with the full reading, the tick. Landing-only prop: `sourceName`. Sitewide: SOON tested on milliseconds. |
| `src/components/brand.tsx` (`TippingBar`, L198–357) | One new prop, `mark`, which draws the tick. It is a state of the bar, not a second component. |
| `src/lib/markets/price-state.ts` | New pure helper `dayAgoYesPct`. |
| `src/lib/markets/time-left.ts` | Export `HOUR_MS`; new pure `closesWithinTheHour`. |
| `src/lib/markets/source-host.ts` (**new**) | The one "host for display" helper, moved out of `trust-band.tsx`. |
| `src/lib/server/source-registry.ts` | New pure `sourceNameFor`. It reuses `sourceMatchesAny` and adds no second host rule. |
| `src/lib/server/market-history.ts` (`cardChartFrom` L300, batched select L356) | `move24h` is measured only between two two-sided readings. **Required for the tick to be true** (§1.4). |
| `src/lib/eat-day.ts` | New `formatEatDate`; `trust-band.tsx` switches to it (same behaviour). |
| `src/lib/markets/hero.ts` (`HeroRow`, L38–45) | `sourceName?: string`. |
| `src/app/page.tsx` | Read the registry once; resolve the name per row; the grid passes `sourceName` and `msLeft`. |
| `src/components/home/landing-hero.tsx` (featured `<MarketCard>`, L252–282) | Pass `sourceName`, `closesOn`, `msLeft`. |
| `src/app/markets/page.tsx` (L354), `src/app/markets/[id]/page.tsx` (L1032), `src/app/watchlist/page.tsx` (L248) | Pass `msLeft` so SOON keeps working in English and starts working in sw/zh. |
| `src/components/home/trust-band.tsx` (L251–257, L259, L310–316) | Delete the private `sourceHost` and the inline year logic; import the shared helpers. |
| `src/app/globals.css` | `.tipbar-mark`, `.mcardp-closes`, `.mcardp-src`, `.mcardp-h24`, `.mcardp-h24-key`, featured question rules. |
| `src/lib/i18n-dict.ts` | `market.settlesOn`, `market.h24Ago`, `market.barReading` in en, sw and zh. |

`featured` is passed only by `landing-hero.tsx`. The other six `<MarketCard>` call sites never pass it, so every `featured &&` branch is landing-only.

---

## 1 · Data flow: server to card

### 1.1 The source name is resolved on the server; the card only receives a string

`listSources()` (source-registry.ts L175) lives in a module that imports `./prisma`, `./audit` and `./config-store`, so it is **server-only**. `MarketCard` is `"use client"` (L1). Never import the registry into the card. `page.tsx` and `landing-hero.tsx` are server components with no `"use client"`, so the name is resolved there and passed down as a string.

**New `src/lib/markets/source-host.ts`** (no imports):
```ts
/** A source URL's host for DISPLAY ("www." dropped), or null when it does not parse — never the raw URL.
 *  One definition: the settled strip (WP13) and the cards' source line (WP3).
 *  ⛔ Not a match rule — `sourceMatchesAny` (source-registry.ts) is the only host MATCH. */
export function sourceHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, "") || null; } catch { return null; }
}
```
In `trust-band.tsx`, delete `function sourceHost` (L310–316) and import this one. L259 `host ? … : …` works unchanged with `null`.

**`source-registry.ts`: add after `sourceMatchesAny` (L354–365):**
```ts
/** The NAME a player reads for the source a market settles on (landing v3 WP3, V18): the registry's label
 *  when the URL's host is a registered source, else the bare host, else null. DISPLAY ONLY — never a trust
 *  decision (`isSourceTrusted` is the gate).
 *  ⛔ Through `sourceMatchesAny`, one source at a time — the host rule keeps its ONE definition site
 *  (`test:bulk-resolve` 4.7 counts `host.endsWith(`), so a look-alike domain can never borrow a name.
 *  `enabled: true`: a source switched off after publishing is still the one this market settles on.
 *  The market's own category first, then any (a market re-categorised after publishing). */
export function sourceNameFor(sources: TrustedSource[], url: string | null | undefined, category: MarketCategory): string | null {
  if (!url) return null;
  const named = (s: TrustedSource, cat: MarketCategory) => sourceMatchesAny([{ ...s, enabled: true }], url, cat);
  const hit = sources.find((s) => named(s, category)) ?? sources.find((s) => named(s, s.category));
  return hit ? hit.label : sourceHost(url);
}
```
⛔ Leave the line `(s) => s.enabled && s.category === category && (host === s.domain || host.endsWith(`.${s.domain}`)),` byte-identical. It is a `red:bulk-resolve` anchor (`scripts/anchors/bulk-resolve.anchors.mjs` L108).

**`page.tsx`:**
- Imports (L8–11): add `resolvePublishCategory` to the market-service import. Add `import { listSources, sourceNameFor, type TrustedSource } from "@/lib/server/source-registry";`.
- `Promise.all` (L97–108): add `listSources().catch(() => [] as TrustedSource[])` and destructure it as `sources`.
  - Use all sources, not `enabledOnly`: naming a source is not trusting it.
  - If the read fails, cards fall back to the host, which is still true.
- `heroRows` map (L133–158), after `sourceUrl: m.sourceUrl`: add `sourceName: sourceNameFor(sources, m.sourceUrl, resolvePublishCategory(m.category)) ?? undefined,`.

**`hero.ts` L44:** add `sourceName?: string;` beside `sourceUrl?: string;`. Document it as "resolved on the server; absent when the URL does not parse". `test:hero-contract`'s completeness check parses `DiscoveryRow` only, so this optional field is safe.

### 1.2 Close date, featured only: a string formatted on the server
`eat-day.ts`: add beside `formatEatDay` (L72):
```ts
/** A day a player reads: `formatEatDay`, plus the year when it is not this EAT year (zh's form always carries it). */
export function formatEatDate(atMs: number, nowMs: number, monthsShort: readonly string[], locale: "en" | "sw" | "zh"): string {
  const key = eatDayKey(atMs);
  const day = formatEatDay(key, monthsShort, locale);
  return locale === "zh" || key.slice(0, 4) === eatDayKey(nowMs).slice(0, 4) ? day : `${day} ${key.slice(0, 4)}`;
}
```
In `trust-band.tsx`, replace L251–257's IIFE with `fill(t.home.settledOn, { date: formatEatDate(row.settledAtMs, nowMs, t.common.monthsShort, locale) })`. Output is identical.

The date is the **betting close** (`bettableUntilMs`), per the tracker. It is the same instant the top-right countdown counts to. The handover's "competition" has no field; SPEC-VALUES §6 says ask before adding a column, so none is added.

### 1.3 `msLeft`, the milliseconds of betting left at render time (SOON)
Pass it from the same deadline and clock as the `timeLeft` label:
- `landing-hero.tsx`, featured: `msLeft={featured.bettableUntilMs - nowMs}`.
- `page.tsx`, grid (L349): `msLeft={r.bettableUntilMs - nowMs}`.
- `markets/page.tsx` L365 block: `msLeft={Date.parse(m.selectionClosedAt ?? m.resolutionAt) - nowMs}`. No `60_000` literal and no second `}, fill);`, because `red:time-left` anchors expect exactly one.
- `markets/[id]/page.tsx` L1048: compute `const simNow = Date.now()` once, thread it into `similarTimeLeft` (L1079, new `nowMs` parameter) and into `msLeft`, so the label and the chip read one clock.
- `watchlist/page.tsx` L259: `msLeft={resolved ? undefined : Date.parse(m.selectionClosedAt ?? m.resolutionAt) - Date.now()}`. SOON has never fired there in any locale; this makes the chip agree on every live surface.
- `/results` and the resolved block on `/markets` (L425): not live, so nothing to pass.

### 1.4 🔴 `move24h` must be a move between two prices, or the tick lies

Today `cardChartFrom` (market-history.ts L300–324) takes `yes` from every snapshot. `recordSnapshot` (L191) stores `0.5` for an empty pool and `1.0`/`0.0` for a one-sided pool. The first bet on any market is one-sided. So for any market younger than 24h, the baseline is a fabricated 100 or 0.

**Evidence:** the WP6 local drive frame `.qa-shots/landing-v3/wp6-local/p1/build-360-sw-t00.png` shows the featured card at `NDIO 50%` with `↘ -50 pt`. Built on that data, WP3 would draw a "24h ago" tick at the rail's end and print "▼50 · 24h ago". That is the ruling-13 (L14/V17) defect moved onto the tick.

**Fix (sitewide, and a correction for /markets' 24h move too):**
```ts
type CardPoint = { t: string; yes: number; yesPool: number; noPool: number };
function cardChartFrom(points: CardPoint[]): CardChart {
  if (points.length < 2) return EMPTY_CARD;
  const spark = compress(points, 16).map((s) => Math.round(s.yes * 100));
  const now = Date.now();
  // (keep the 🔴 fallback note) + ⛔ WP3: a move is measured between two PRICES. An empty pool is
  // recorded as 0.5 and a one-sided one as 1.0/0.0 — neither is a price (ruling 13) — so the baseline is
  // the earliest TWO-SIDED reading inside the window, the current reading must be two-sided, and they
  // must be two different readings.
  const last = points[points.length - 1];
  const cur = priceState(last.yesPool, last.noPool);
  const dayAgo = points.find((s) => now - Date.parse(s.t) <= 24 * 3600_000 && priceState(s.yesPool, s.noPool).kind === "priced");
  if (!dayAgo || dayAgo === last || cur.kind !== "priced") return { spark };
  const was = priceState(dayAgo.yesPool, dayAgo.noPool);
  return was.kind === "priced" ? { spark, move24h: cur.yesPct - was.yesPct } : { spark };
}
```
- Batched read (L356): `select: { marketId: true, t: true, yes: true, yesPool: true, noPool: true }`. The point becomes `{ t, yes, yesPool: num(r.yesPool), noPool: num(r.noPool) }` using the existing `num` (L38).
- `getCardChart` already passes `MarketSnapshot`, which carries the pools.
- Import `priceState` from `@/lib/markets/price-state` (pure, no imports).
- Side effect, recorded in the tracker: on `/markets`, `MoveText` and the "move" sort stop showing moves measured from a fabricated 50/100/0.

---

## 2 · `market-card.tsx`

**Imports:**
- L13: add `fill` to `import { cn, formatTzs } from "@/lib/utils"`.
- L18: `import { priceState, dayAgoYesPct } from "@/lib/markets/price-state";`.
- New: `import { closesWithinTheHour } from "@/lib/markets/time-left";`.

**Props, after `sourceUrl?: string;` (L71):**
```ts
  /** LANDING ONLY (WP3, V18): the name of the source this market settles on — the registry's label, else
   *  the host — resolved on the server (`sourceNameFor`). Absent on every other surface, so /markets' card
   *  and its skeleton (`--mcard-h`, qa:card-geometry) do not change. */
  sourceName?: string;
  /** Featured card only (WP3): the betting-close day, formatted on the server (`formatEatDate`). */
  closesOn?: string;
  /** Milliseconds of betting left when `timeLeft` was computed — same deadline, same clock. Drives SOON
   *  in every locale (L17). Absent → no SOON. */
  msLeft?: number;
```
- Add `sourceName, closesOn, msLeft` to the destructure (L239).
- Update the `featured` doc (L95–106). "No type-size change" becomes false (see §4), and the doc should now list the time top-right and the meta line.

**SOON (L17), `getSignalBadge` L122–143:**
- The parameter `timeLeft: string` becomes `msLeft: number | undefined`.
- L130 becomes `if (closesWithinTheHour(msLeft)) return { kind: "soon", label: labels.soon };`.
- The call at L324 becomes `getSignalBadge(live, showPrice ? yesPct : null, volume, predictors, msLeft, fresh, {`. The prefix `getSignalBadge(live, showPrice ? yesPct : null,` is pinned by `test:one-sided` 3.10.

`time-left.ts`:
- L38 becomes `export const HOUR_MS = 3600_000;`.
- Add:
```ts
/** ⭐ SOON's one test (landing v3 WP3, INHERIT-MANIFEST L17): betting shuts inside the band this label counts
 *  in MINUTES. It was `/^\d+m left$/` on the ENGLISH label, so it never fired in sw or zh. Asked of the
 *  milliseconds it fires in every locale at the instant the label turns to minutes (`test:time-left` 1.10/1.11). */
export function closesWithinTheHour(msLeft: number | undefined): boolean {
  return msLeft !== undefined && Number.isFinite(msLeft) && msLeft > 0 && msLeft < HOUR_MS;
}
```

**Derived values, after `showSpark` (L343):**
```ts
  /* WP3 · the 24h mark: featured only, only where a price exists NOW and a move was measured between two
     prices (`dayAgoYesPct`, `cardChartFrom`). One-sided, empty or fresh: no mark (WP6). The tick and the
     text read ONE number. */
  const dayAgo = featured && live && showPrice ? dayAgoYesPct(yesPool, noPool, move24h) : null;
  const barReading = featured && showPrice
    ? fill(t.market.barReading, { yesPct, yesWord: sideWord(t, "YES", productLine), noPct: 100 - yesPct, noWord: sideWord(t, "NO", productLine) })
    : null;
  const metaLine = [closesOn, sourceName ? fill(t.market.settlesOn, { source: sourceName }) : null].filter(Boolean).join(" · ");
```
⛔ No `yesPct >= n ? …`-shaped ternary anywhere: `test:outcome` §3's `PROB` regex hunts that shape. Write `yesPct - dayAgo`, never a comparison.

`price-state.ts`, appended (still no imports):
```ts
/** Where the price stood a day ago on the card's own bar (WP3): the printed price minus the measured move,
 *  or null — no two-sided price now, or no move. Kept within 1–99 like every printed price (L14). */
export function dayAgoYesPct(yesPool: number, noPool: number, move24h: number | undefined): number | null {
  const p = priceState(yesPool, noPool);
  if (p.kind !== "priced" || move24h === undefined || !Number.isFinite(move24h)) return null;
  return Math.min(99, Math.max(1, p.yesPct - move24h));
}
```

**Top row, after `<span className="mcardp-cat">{catLabel}</span>` (L411):**
```tsx
        {featured && <span className="mcardp-closes">{timeLeft}</span>}
```

**Question and meta line, in `.mcardp-qwrap` after L418.** It goes inside the question column, as in the concept (L163–164). There is no extra flex gap, and the line stays with its question when a grid card stretches.
```tsx
          {metaLine && <p className="mcardp-src">{metaLine}</p>}
```
The source is **text, not a link**:
- A non-live card is itself a `<Link>` (L648), so a link inside it would nest (WP17).
- A raised link would need its own 40px reach.
- The detail page already links the source.

**Move-line row (L465–473).** Keep `{(live || oneSided) && (` and the `<div className="mcardp-moveline">` literal, which `test:one-sided` 3.12 and its anchor pin:
```tsx
          {oneSided ? (
            <span className="mcardp-oneside">{t.market.oneSideOnly}</span>
          ) : dayAgo !== null ? (
            <DayAgoMove move={yesPct - dayAgo} label={t.market.h24Ago} />
          ) : (
            !featured && !fresh && move24h !== undefined && <MoveText move={move24h} label={t.market.twentyFourHourMove} />
          )}
```
New component, beside `MoveText` (L147):
```tsx
/** WP3 · the featured card's 24h delta, keyed to the tick on its bar ("▲5 · 24h ago"). Neutral ink — a move
 *  of the YES price is not a side (§B2a). The glyph is decoration; a screen reader hears the sign. */
function DayAgoMove({ move, label }: { move: number; label: string }) {
  return (
    <span className="mcardp-h24">
      <span className="mcardp-h24-key" aria-hidden />
      <span aria-hidden>{move > 0 ? "▲" : move < 0 ? "▼" : "±"}</span>
      <span className="sr-only">{move > 0 ? "+" : move < 0 ? "−" : "±"}</span>
      {Math.abs(move)} · {label}
    </span>
  );
}
```
Type the ▲ ▼ ± − characters literally. Per memory, the Edit tool and `node -e` decode backslash-u escapes into raw characters.

**Bar (L489).** Still one line. Keep `empty={noPrice || oneSided}` (once) and the `emptyLabel={…}` expression byte-exact. Append:
```
 probabilityLabel={barReading ?? t.market.probBarAria.replace("{side}", sideWord(t, "YES", productLine))} as={featured ? "img" : undefined} mark={dayAgo}
```
`role="img"` is **featured only**. `scripts/live/ops/d29-terminal-cards.mjs:36` and `glitch-hunter.mjs:61,205` query `[role="progressbar"]` on other cards, and the tracker scopes WP3 to the featured variant. Pinned already: the tag must keep `empty` within 700 chars (`ui-consistency` tipping-bar-without-cold-start).

**Meta row (L568–569):** `{!featured && timeLeft}`. The featured time now sits top-right, and the info button stays in the meta row.

Unchanged: the footer (`<ShareButton compact marketId={id} title={title} />`, `flex items-center justify-end gap-2`), the buttons, the price slot and the WP6 note.

---

## 3 · `TippingBar` (brand.tsx): the tick
Prop, after `as` (L243). Destructure it as `mark = null`.
```ts
  /** Where the price stood 24 hours ago, 0–100: a still hairline on the rail (landing v3 WP3), drawn on the
   *  needle's own 6–94 scale so the two marks order truthfully. null/absent → none. Never on the empty rail:
   *  a pool with no price has nothing to have moved from. Changes only with a new render (L12). */
  mark?: number | null;
```
In the non-empty branch, **before** the needle `<div>` (L327) so the needle paints over it when they coincide:
```tsx
        {mark != null && <div className="tipbar-mark" style={{ left: `${Math.max(6, Math.min(94, mark))}%` }} aria-hidden />}
```
- An inline `left` is live data, which `test:design-frozen` allows.
- A `<div>` is not SVG geometry, so brand.tsx's `test:chart-one-home` EXEMPT entry still matches its old detectors.
- No `.tipbar-anim` transition is added, per motion law L12 / WP15.

---

## 4 · CSS (`globals.css`, tokens only; no new tokens)
After `.tipbar-needle` (L1679–1688):
```css
/* landing v3 · WP3 — the 24h mark: where the price stood a day ago. `--text` because it is a graphic that must
   read against both fills at ≥ 3:1 (WCAG 1.4.11; `test:contrast` pairs it with each fill's worst stop —
   `--text-muted` measured ≈2.8 against the YES fill). Never animated (L12). */
.tipbar-mark { position: absolute; top: -4px; bottom: -4px; width: 2px; margin-left: -1px; border-radius: 1px; background: var(--text); pointer-events: none; }
```
After `.mcardp-onesided-note` (L4802–4811), add a new "Featured card + the landing's source line (landing v3 · WP3)" block:
```css
.mcardp--featured .mcardp-q { display: block; -webkit-line-clamp: unset; overflow: visible; min-height: 0; overflow-wrap: break-word; text-wrap: pretty; }
@media (min-width: 640px)  { .mcardp--featured .mcardp-q { font-size: var(--type-h4); font-weight: 700; } }
@media (min-width: 1024px) { .mcardp--featured .mcardp-q { font-size: var(--type-h3); line-height: 1.25; } }
.mcardp-closes { margin-left: auto; font-family: var(--font-mono); font-size: var(--type-micro); font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--text); }
.mcardp-src { margin-top: var(--sp-1); font-size: var(--type-small); line-height: 1.4; color: var(--text-subtle); overflow-wrap: anywhere; text-wrap: pretty; }
.mcardp-h24 { display: inline-flex; align-items: center; gap: var(--sp-1); font-family: var(--font-mono); font-size: var(--type-micro); line-height: 1; font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--text-subtle); }
.mcardp-h24-key { width: 2px; height: 10px; border-radius: 1px; background: var(--text); }
```
**Why each value:**
- **Question size:** below 640 it stays at 15px (budget in §6). The concept's 21–26px maps onto the locked ladder only where no first-screen limit applies.
- **`.mcardp-closes`:** `margin-left: auto` keeps it right-aligned on whichever line it lands when the chip row wraps (D65 note L4561–4580: chips wrap, never cut). `--text` is the tracker's ink, and a countdown never takes the betting pair (`test:betting-ink`).
- **`.mcardp-src`:** "Settles on X" is a **sentence**. L6 and WP13's `.kp-settled__meta` precedent (L5617–5624) put it at the reading floor `--type-small` in body type, not the concept's 12px mono caps. It wraps and is never ellipsised (V2). It is a data line, so it stays out of the 0.14em eyebrow list (L1061–1071).
- **`.mcardp-h24`:** same rung as `.mcardp-meta`'s time. Neutral ink, as in the concept (L168).

**Collisions to avoid:**
- No `max-width < 640` rule (the `test:density-contract` §2 fence).
- None of the selectors that guards read by first match: `.mcardp-meta .live`, `.mcardp-share`, `.mcardp-details`, or a column-0 `.mcardp-info {`.

---

## 5 · i18n (`src/lib/i18n-dict.ts`, `market` section, after `twentyFourHourMove`)

| key | en (binding) | sw (draft) | zh (draft) |
|---|---|---|---|
| `settlesOn` | `Settles on {source}` | `Linatatuliwa kwa {source}` | `结算来源：{source}` |
| `h24Ago` | `24h ago` | `saa 24 zilizopita` | `24小时前` |
| `barReading` | `{yesPct}% {yesWord}, {noPct}% {noWord}` | `{yesWord} {yesPct}%, {noWord} {noPct}%` | `「{yesWord}」{yesPct}%，「{noWord}」{noPct}%` |

- **Where:** en L777, sw L3415, zh L5613.
- **Review comment:** put `// drafted, marked for native review; English is binding.` above each sw and zh key.
- **Why this sw verb:** `linatatuliwa kwa` is the dictionary's own settling verb (`home.howStep2B`, `twoOfficerBody`). The concept's `INAAMULIWA NA` is the alternative.
- **Why sw `barReading` reorders words:** it is also required. `test:i18n` fails a sw value that is byte-identical to en.
- **Placeholder names:** they match `home.heroConvRead` (WP8's pattern).
- **Other suites:** `test:rate-copy` passes (placeholders before `%`; no objection word near "24"). `test:i18n` covers parity.
- **Source names are not translated.** Registry labels ("Bank of Tanzania") are proper names, like WP13's hosts.

---

## 6 · The 360px sw first-screen budget (V15)

The gate's line is min(740, top of the bottom rail). The rail is 64px plus a 1px border (`.kp-rail__item` L5782), so the line is about **715** in a 360×780 cell.

**Last recorded on production** (`.qa-shots/landing-v3/d1prod/prod/report-build.json`, D1, 2026-09-26, before WP6). These are recorded numbers; re-derive them before concluding anything.

| Element | Recorded |
|---|---|
| Featured card top | 414 |
| Price (`.mcardp-prob`) bottom | 498 |
| YES/NO (`.mcardp-actions`) bottom | 599 |
| Headroom to the line | ≈116px |

**What WP3 adds on a phone** (the compact card gap is 6px):

| Change | Cost |
|---|---|
| Time top-right: in sw "masaa 21 yamebaki" wraps the chip row (the WP6 frame shows MUBASHARA + INASOGEA + KRIPTO filling ~250 of ~296px) | +18–25 (also moves the price) |
| Question unclamped | +20 per line beyond two |
| Meta line in the question column (~240px wide) | +4 + one to two lines at 18px ≈ +22–40 |
| Delta | 0 (it rides the existing move-line row) |
| Tick | 0 (absolutely positioned) |

- **Total:** typically +45–65, worst about +105, so the YES/NO bottom lands at roughly 645–705 against 715. It fits, but not by much.
- **Price bottom:** about 523, no risk.
- **One-sided featured:** the WP6 note (+~61) plus WP3 is likely **over** the line. It only occurs when no two-sided market is open, because the hero seats by `priceTier`. Measure it.
- **If a cell fails:** WP2's rule applies. Tighten the hero's phone spacing (`.kp-hero__inner` L3991: `padding: var(--sp-8) var(--sp-4)`, `gap: var(--sp-6)`; 16px is available), never the text. Anything beyond that goes to Ali as a numbered choice.

Deliberately not adopted, to protect this budget:
- The concept's 21–26px question below 640.
- The 10px bar.
- The "24h ago" label under the tick. The concept reserves a 20px row under the bar for it (L171 `margin-bottom:20px`); here the legend key in the delta line replaces it.
- The separate YES | delta | NO price row.

---

## 7 · Guards

**Pinned text that must stay byte-exact:**
- `market-card.tsx`:
  - `const price = priceState(yesPool, noPool);`
  - `const showPrice = !noPrice && price.kind === "priced";`
  - Both gated `@ {yesPct}%` / `@ {100 - yesPct}%` suffixes (`test:one-sided` 3.3, its anchor, and the contrast-callsite anchor)
  - `empty={noPrice || oneSided}`, exactly once
  - The `emptyLabel={outcomeLabel ?? (…)}` expression (`test:outcome` D29, `test:one-sided` 3.6)
  - `          ) : oneSided ? (`
  - `      {(live || oneSided) && (`
  - `getSignalBadge(live, showPrice ? yesPct : null,`
  - `const showSpark = !fresh && !oneSided && `
  - The D29 lines (`const noPrice = isNew ?? volume === 0;`, `const neverBet = predictors === 0;`, the outcome-before-absence order)
  - `        <ShareButton compact marketId={id} title={title} />` and the footer order (`test:card-share` §1, its anchor)
  - `data-row-id={id}`
- `source-registry.ts`: `host.endsWith(` count stays at 1 (`test:bulk-resolve` 4.7), plus the anchor line at `bulk-resolve.anchors.mjs` L108.
- `time-left.ts`: the `Math.max(1, …)` minutes line (a `red:time-left` anchor) and no server import (2.5).
- `markets/page.tsx`: the `timeLeftStr` block and a single `    }, fill);` (`red:time-left`); `    yesPct: shownYesPct(m.yesPool, m.noPool),` (`red:one-sided`).
- `page.tsx`: `                    yesPool={r.yesPool}`, once.
- `landing-hero.tsx`: `<span className="kp-qrow__num">{price.yesPct}</span>` and the `kp-proof__num`/pip markup (`test:betting-ink` §1).

**New or changed:**
1. **`test:featured-card`** (`scripts/featured-card.test.mts`). Add it to `predeploy` right after `test:one-sided`; `test:all` picks it up automatically.
   - **§1, behavioural:**
     - `closesWithinTheHour` boundaries: 3_599_999 true; 3_600_000, 0, negative, `undefined` and `NaN` false.
     - `dayAgoYesPct`: 20k/10k with move 5 gives 62; one-sided gives null; empty gives null; no move gives null; the clamp holds at 99 and 1.
     - `sourceNameFor`:
       - `https://kitco.com/x` and `https://www.kitco.com/x` return the label.
       - ⛔ `https://evilkitco.com/x` returns `evilkitco.com` and **never** "Kitco".
       - A disabled source is still named.
       - A source in another category is still named.
       - An unregistered URL returns its host without `www`.
       - A malformed URL returns null.
     - `cardChartFrom`, via `recordSnapshot` + `getCardChart` in the manner of history-fabrication:
       - 500/500 then 700/300 gives 20.
       - 0/0 then 700/300 gives undefined.
       - 1000/0 then 1000/500 gives undefined.
       - 500/500 then 1000/0 gives undefined.
   - **§2, card source** (decommented regex):
     - SOON calls `closesWithinTheHour(msLeft)` and no `m left` regex remains.
     - `dayAgo` is computed only under `featured && live && showPrice`.
     - `as={featured ? "img" : undefined}`.
     - `barReading` exists only when featured and priced.
     - `.mcardp-closes` sits in the top row and the meta row has `{!featured && timeLeft}`.
     - The card imports no registry and parses no URL.
   - **§3, call sites:**
     - `sourceName=` appears only in `src/app/page.tsx` and `landing-hero.tsx`. This protects `/markets` geometry. Positive control: at least 2 sites found.
     - `closesOn=` appears only in `landing-hero.tsx`.
     - Every live countdown site passes `msLeft`.
   - **§4, brand.tsx:** `tipbar-mark` appears after the `if (empty)` return and is `aria-hidden`.
   - **§5, i18n:** the three keys exist in all three locales; `barReading` carries both percentages.
   - **Controls:** each matcher is shown rejecting the pre-fix spelling.
2. **`red:featured-card`** (`scripts/featured-card-red.mjs` + `scripts/anchors/featured-card.anchors.mjs`), cloned from `one-sided-red.mjs`. Planned mutations:
   - SOON goes back to testing a label.
   - `dayAgoYesPct` drops its `p.kind !== "priced"` guard (a tick on a one-sided card).
   - `cardChartFrom` drops `&& priceState(...).kind === "priced"`.
   - `sourceNameFor` uses `url.includes(s.domain)`, so a look-alike borrows a name.
   - `sourceName=` is added to a `/markets` call site.
   - Positive control: `mark={dayAgo}` removed from the bar.

   Single-line anchors only (CRLF tree), each resolving exactly once. ⚠️ In `markets/page.tsx` the 14-space props also occur inside the 16-space block (L425), so pick a unique line. Verify with `test:red-anchors`.
3. **`test:contrast`** (`scripts/contrast-audit.mts` ~L771): add `--text on worstStop(tokenGradient("bar-fill-yes"))` and `… "bar-fill-no"`, both at `min: 3.0` (the tick).
4. **`test:betting-ink`** §1: the `.mcardp-closes` rule must not match `BETTING` and must be `color: var(--text)`. Add a planted copy with `--yes-300`.
5. **`qa:card-geometry`** (`scripts/card-geometry-probe.mjs`): run before and after. `/markets` must be identical at 360, 1280 and 1920. `/` changes, and the change is recorded.
6. **V18** (not built in this row): it should select `.kp-hero__card .mcardp-src`, `.kp-lgw .mcardp-src` and WP4's row meta line.

---

## 8 · Docs, in the same commit
- **`docs/LANDING-TEN.md`:**
  - §0 RESUME AT.
  - §1 WP3 row.
  - §2.1 WP3: name `sourceNameFor`, `sourceHost`, `formatEatDate`, `closesWithinTheHour`, `dayAgoYesPct`, `cardChartFrom`, and the classes. Record what is not adopted, from §6.
  - §3 notes for K18, K22, K36, K47 and K49.
  - WP6's L264 "not this row's" list is untouched.
- **`INHERIT-MANIFEST.md`**, new rows:
  - **L24:** the meta line is a sentence (L6 / WP13), not 12px mono caps.
  - **L25:** the question stays at 15px below 640 for V15, h4 from 640, h3 from 1024.
  - **L26:** `move24h` is measured only between two prices (ruling 13). Cite the "−50 pt" frame. /markets is affected sitewide.
  - **L27:** the source is named, not linked: registry label via the one host rule, else the host; a link would nest inside a non-live card's `<Link>`.
- **`docs/NEXT-PLAN.md`** ▶0b row, when the ✅ count moves. Then run `npm run test:landing-ten-plan`.

---

## 9 · Verification checklist
Run every heavy step through `bash ~/heavy-node-lock.sh run landing …`, one acquisition per step.

1. **Typecheck and suites:**
   - `npm run typecheck`
   - Test suites: `test:featured-card`, `one-sided`, `outcome`, `card-share`, `time-left`, `bulk-resolve`, `history`, `contrast`, `betting-ink`, `i18n`, `rate-copy`, `ui-consistency`, `design-frozen`, `chart-one-home`, `density-contract`, `hero-contract`, `landing-contract`, `landing-ten-plan`.
   - Anchor audit: `test:red-anchors`.
   - Red harnesses: `red:featured-card`, `red:one-sided`, `red:time-left`, `red:bulk-resolve`.
   - Run red harnesses one at a time, never concurrently, then check `git status`.
   - Run `npm run test:all` before the push, because D2 is sitewide.
2. **Drive:** add `scripts/qa/landing-v3/verify-wp3.sh`, cloned from `verify-wp6.sh`.
   - After `updown-seed` (which runs `seedDefaultSources`), stake on the featured market so it has **two two-sided readings**: YES, then NO, then YES again. Only then does it get a `move24h`.
   - Phase 1 is the one-sided featured.
   - Use `/api/dev-test/fast-forward-market` to bring one market under an hour.
   - Capture `/` and `/markets` at 360, 768 and 1280 in sw, en and zh. **Look at the frames.**
3. **Checks on the frames and DOM** (sw first):
   - [ ] The time sits top-right in `--text` and is gone from the meta row.
   - [ ] The full question shows with no ellipsis at 360 and 1280.
   - [ ] The meta line reads "27 Sep · Settles on Tanzania Meteorological Authority" for `meteo.go.tz` and a bare host for `boomplay.com`. A non-current year shows the year.
   - [ ] The tick's `left` equals `yesPct − move24h` (on the 6–94 scale), and "▲n · 24h ago" states the same n.
   - [ ] No tick and no delta on the one-sided featured card or on a fresh or empty one.
   - [ ] The featured bar is `role="img"` with aria-label exactly "{p}% YES, {100−p}% NO" (localised), matching the printed price.
   - [ ] Grid cards on `/` show "Settles on …". `/markets`, `/results`, `/watchlist` and detail cards do not.
   - [ ] SOON appears in sw and zh as well as en for the market under an hour, on `/` and `/markets`.
   - [ ] `/markets` 24h moves no longer show moves measured from a one-sided first bet.
4. **Gate:**
   - `node scripts/qa/landing-ten.mjs` locally: V15 at 360 sw, with both the priced and the one-sided featured card; V17 = 0; V2 = 0; V7 clean.
   - RED V15 and V17 must report PROVED.
   - `npm run test:needle-rest` §4 on `/` at 360 and 768.
   - `npm run qa:card-geometry -- before|after`.
5. **Screen reader spot check:** h2 → meta line → price → "+5 · 24h ago" → the bar's reading.
6. **Production:**
   - `git fetch`, then merge `origin/main`, then `git push origin HEAD:main`.
   - Confirm the deployed sha with `?dpl=<sha>`.
   - Run `verify-prod.sh wp3 <sha>` with frames at 360, 768 and 1280 × sw, en and zh.
   - Re-shoot `/markets`, `/watchlist` and the detail page, because SOON and `move24h` are sitewide.
   - The row turns 🔵, then ✅.

**New session needed?** No. WP3 fits one session. Start a fresh one only if context runs low after the local drive, and resume from the updated `docs/LANDING-TEN.md` §0.

---

# WP4 · Closing-soonest board rows — build spec

Read at `C:\kipindi-landing-v3`, branch `landing-v3`, HEAD `3d6cdb67`. This was a read-only pass. Line numbers below are from that tree and will drift.

**Session note (for Ali):** WP4 fits in one build session, including the local drive under the lock, the push and the production re-measure. The pick slip (D3/WP5) should start a **new session**, because it changes these buttons into client controls and adds a Modal. WP3 should land first or in the same session, because both rows need the same two keys and the same source resolver (§3).

---

## 0 · What the code does now

- **Row component:** `QuestionRow` in `src/components/home/landing-hero.tsx:151-202` is **one `<Link className="kp-qrow">`** (line 159). Inside it are:
  - the category glyph (160-162);
  - the title with an inline `style={{ maxWidth: "44ch" }}` (173);
  - the pool (177);
  - the price slot (178-194);
  - a 2px lean rule with an inline width (197-199).
- **Board:** `LandingProof` (403-501) renders `<div className="kp-qboard">` (491-495). It takes **no `nowMs`**, so the rows cannot compute time left today.
- **WP6 wiring already in place:** `const price = priceState(row.yesPool, row.noPool)` (157), and the one-sided label `t.market.oneSideOnly` (190). There is no dashed rail and no refund note on the row yet; the WP6 notes say those arrive with WP4.
- **Current CSS:** `src/app/globals.css:4323-4455`. It uses grid areas `"i q p" ". s p"`, a `@media (min-width: 821px)` block (4395-4402) and a `@media (max-width: 560.98px)` block (4409-4455, marked density: general, containing the 3-line clamp). It also has a `.kp-qrow:hover` padding-inline reflow (4345, the D25/U27 ungated hover) and `.kp-qrow__lean` (4386-4394).
- **Data on `HeroRow`** (`src/lib/markets/hero.ts:38-45` plus `DiscoveryRow`, `discovery.ts:54-93`):
  - Available: `id, category, pool, predictors, yesPct (shown), bettableUntilMs, resolvesAtMs, selectionClosed, status, titleEn/Sw/Zh, yesPool, noPool, sourceUrl?`.
  - **Missing:** the source's *name*, and `nowMs` in `LandingProof`.
  - There is no competition/event field (the concept's "PREMIER LEAGUE GW6"). SPEC-VALUES §6 says "ask before adding a column", so the row uses the close date instead.
  - `move24h` for board rows is actually fetched (`drawnIds` includes `heroIds`, `page.tsx:198-209`), but the concept draws no 24h mark on rows. **No mark.**

### How the detail page handles `?side=` (answers "is it the same link for a visitor?")

- `MarketDetail` reads `sp.side` (`src/app/markets/[id]/page.tsx:111-116`) and passes `initialSide={side === "YES" || side === "NO" ? side : undefined}` to `SidePicker` (633).
- `SidePicker` starts at `useState(initialSide)` (`side-picker.tsx:56`) and renders `ConvictionDial lockedSide={side}` (99-111). **The side is locked on arrival**, and "Change side" (84-96) is the existing escape.
- A **visitor** gets the sign-in panel instead. It builds `betNext = "/markets/"+id+"?side="+side` (660) into both `/auth/register?next=…` and `/auth/login?next=…` (661-676). Register honours a safe `next` (`auth/register/page.tsx:75-76, 216`).
- **So until D3, one href serves both.** `/markets/{id}?side=YES|NO` locks the side for a player. A visitor keeps the side through sign-up, with one extra page compared with R2's direct `/auth/register?next=` (which D3 builds).
- An invalid `side` value is ignored.

---

## 1 · Decisions

1. **The row is an `<li>` holding three sibling interactive zones**, and the row itself is not a link (WP17):
   - the head link: title plus meta, as in the concept, where the `<a>` wraps both;
   - the read block, which is not interactive;
   - two side links.
   - The head link keeps a `min-height: var(--h-control-md)`, so V4 never sees a 21px one-line title link.
   - I did **not** use the stretched-overlay pattern (`.kp-settled__open`). The brief says "the title is its own link", and the concept's tap target is the title block.
2. **Until D3, the YES/NO controls are `<Link className="btn btn-yes|btn-no btn-md">` anchors, not `<button>`s.**
   - They navigate, and a link is a link.
   - `landing-hero.tsx` has **no entry** in `scripts/ui-consistency-baseline.json`, so it is at 0. The `raw-button-btn-class` rule (`ui-consistency.test.mts:358-365`) only matches `<button …className="…btn…">`, so the count stays 0.
   - `nav-progress.tsx:101-130` already starts the progress bar on any internal `<a>` click, so no client handler is needed. The row stays a server component.
   - `prefetch={false}` on the two side links: 4 rows × 2 query variants would otherwise add 8 detail prefetches.
3. **The bar is `TippingBar`** at `height={6}`, `showLabels={false}`, `recastOnHover={false}`.
   - Priced state: `yesPct`. Otherwise: `empty` with the dashed `--bar-empty-track` rail.
   - Its wrapper is `aria-hidden`. The text equivalent (WP17) is the price line printed directly above it, "71% YES" or "— One side only", so a named bar would repeat it on 4 rows. This also means no new aria key.
4. **Unpriced rows draw the dashed rail too, not just one-sided rows**, the same as the card (`empty={noPrice || oneSided}`).
5. **D29 truth fix on the row (it is being rebuilt anyway).** Today an empty pool always reads `t.home.heroNoPrice` ("No bets yet"). A market whose only bettor cashed out has pool 0 and predictors ≥ 1, because `predictorCount` is never decremented. So:
   - `emptyLabel = oneSided ? t.market.oneSideOnly : row.predictors === 0 ? t.home.heroNoPrice : t.market.noPoolYet`;
   - this is one derivation, used by both the price slot and the rail.
6. **Meta line:** `Closes {date} · Settles on {source} · Pool TZS n · n predictors`.
   - The absolute close date beside the relative time left is the Gaming Board's "a timer names its instant" item (#6).
   - Date only, plus the year when it is not this year: the WP13 rule, lifted into one helper. The concept's meta is a date.
   - The pool and predictors are always stated (V18/K48). A zero pool only reaches the board on a thin day (tier 2), and it is true.
7. **Glyph removed** (the concept has none; MOBILE-VISUAL flagged its mis-centring). The `categoryGlyph` import goes.
8. **Price reading at 13px:**
   - priced: `--yes-300`. A price names a side, so §B2a allows the betting pair. `.kp-qrow__num` is **not gilt**, as before.
   - label: `--text-subtle`.
   - time left: `--text` at 700, never betting ink (`test:betting-ink` family).
   - This also clears the finding about the 20px em-dash sitting beside an 11px label.
9. **Breakpoints move to 640/1024 (L4), written mobile-first.** There are no `max-width < 640` rules, so `test:density-contract` §2 has nothing to police. The old 821 and 560.98 blocks are deleted whole.
10. **Keep these verbatim, because guards read them:**
    - `const price = priceState(row.yesPool, row.noPool);` (`test:one-sided` 4.1);
    - `<span className="kp-qrow__num">{price.yesPct}</span>` (the `red:one-sided` anchor, `anchors/one-sided.anchors.mjs:49-54`, which must resolve **exactly once**);
    - `className="kp-qrow"` as the literal attribute (4.2-control regex; use `data-price`, not a modifier class);
    - `QuestionRow` stays between `function QuestionRow(` and `export function LandingHero(` (the test slice, `one-sided.test.mts:172-173`);
    - nothing is inserted inside `SignedInAct` (`landing-mine.test.mts:76` slices to the next `function`).

---

## 2 · Markup — `src/components/home/landing-hero.tsx`

**Imports (33-46):**
- `import { I } from "@/components/ui/glyphs";` (drop `categoryGlyph`);
- add `import { formatEatDate } from "@/lib/eat-day";`.

**`QuestionRow` (replaces 151-202)**, with the WHY comments carried over:

```tsx
function QuestionRow({ row, t, locale, nowMs }: { row: HeroRow; t: Dict; locale: Locale; nowMs: number }) {
  const price = priceState(row.yesPool, row.noPool);
  const title = pickLocalized(locale, row.titleEn, row.titleSw, row.titleZh);
  const yes = sideWord(t, "YES", "MARKET");
  const no = sideWord(t, "NO", "MARKET");
  const timeLeft = timeLeftLabel(row.bettableUntilMs, nowMs, {
    closed: t.market.closed, days: t.market.timeLeftD, hours: t.market.timeLeftH, minutes: t.market.timeLeftM,
  }, fill);
  const closes = fill(t.market.closesOn, { date: formatEatDate(row.bettableUntilMs, nowMs, t.common.monthsShort, locale) });
  const emptyLabel = price.kind === "oneSided" ? t.market.oneSideOnly : row.predictors === 0 ? t.home.heroNoPrice : t.market.noPoolYet;
  const oneSidedNote = price.kind === "oneSided" ? t.market.oneSidedNote.replace("{side}", sideWord(t, price.emptySide, "MARKET")) : null;
  const yesAria = (price.kind === "priced" ? t.market.backSideAria.replace("{pct}", String(price.yesPct)) : t.market.backSideAriaNoPrice).replace("{side}", yes);
  const noAria = (price.kind === "priced" ? t.market.backSideAria.replace("{pct}", String(100 - price.yesPct)) : t.market.backSideAriaNoPrice).replace("{side}", no);
  return (
    <li className="kp-qrow" data-price={price.kind} data-row-id={row.id}>
      <Link href={`/markets/${row.id}` as never} className="kp-qrow__head">
        <span className="kp-qrow__q">{title}</span>
        <span className="kp-qrow__meta">
          <span className="kp-qrow__close">{closes}</span>
          {row.sourceName && <>{" · "}<span className="kp-qrow__src">{fill(t.market.settlesOn, { source: row.sourceName })}</span></>}
          {" · "}<span className="kp-qrow__pool">{t.common.pool} {formatTzs(row.pool)}</span>
          {" · "}<span className="kp-qrow__depth">{formatNumber(row.predictors)} {row.predictors === 1 ? t.market.predictorsCountOne : t.market.predictorsCount}</span>
        </span>
      </Link>
      <div className="kp-qrow__read">
        <div className="kp-qrow__line">
          <span className="kp-qrow__price">
            {price.kind === "priced" ? (
              <>
                <span className="kp-qrow__num">{price.yesPct}</span>
                <span className="kp-qrow__unit">% {t.common.yes}</span>
              </>
            ) : (
              <>
                <span className="kp-qrow__num" aria-hidden>—</span>
                <span className="kp-qrow__unit kp-qrow__unit--label">{emptyLabel}</span>
              </>
            )}
          </span>
          <span className="kp-qrow__left">{timeLeft}</span>
        </div>
        <div className="kp-qrow__bar" aria-hidden>
          {price.kind === "priced" ? (
            <TippingBar yesPct={price.yesPct} height={6} showLabels={false} recastOnHover={false} />
          ) : (
            <TippingBar empty emptyLabel={emptyLabel} height={6} />
          )}
        </div>
      </div>
      <div className="kp-qrow__act">
        <Link href={`/markets/${row.id}?side=YES` as never} prefetch={false} className="btn btn-yes btn-md kp-qrow__btn" aria-label={yesAria}>
          {yes}{price.kind === "priced" && <span className="kp-qrow__at"> @ {price.yesPct}%</span>}
        </Link>
        <Link href={`/markets/${row.id}?side=NO` as never} prefetch={false} className="btn btn-no btn-md kp-qrow__btn" aria-label={noAria}>
          {no}{price.kind === "priced" && <span className="kp-qrow__at"> @ {100 - price.yesPct}%</span>}
        </Link>
      </div>
      {oneSidedNote && <p className="kp-qrow__note">{oneSidedNote}</p>}
    </li>
  );
}
```

Notes on this markup:
- The `aria-label` keys are the card's own (`backSideAria`/`backSideAriaNoPrice`), so one control has one vocabulary. Neither name carries a figure on a one-sided or empty row.
- The two inline `style` props are gone (`44ch` moves to CSS; the lean rule is deleted), so `test:design-frozen` stays at 0.
- `test:outcome`'s PROB regex (`outcome-display.test.mts:60-65`) never sees a pool or pct comparison yielding a YES/NO literal on one line. The `?side=YES` literals sit on lines with no comparison. Keep it that way.

**`LandingProof` (403-501):**
- Add `nowMs: number` to the props.
- Replace 491-495 with:

```tsx
<ul className="kp-qboard" role="list">
  {figures.board.map((row) => <QuestionRow key={row.id} row={row} t={t} locale={locale} nowMs={nowMs} />)}
</ul>
```

- `role="list"` is needed because WebKit drops the list role under `list-style: none`, as `TrustLines` does.
- Update the header comment's "Nothing in it changed meaning" to describe the rebuilt row.

## 3 · Data plumbing

- **New `src/lib/markets/source-name.ts`** (pure, no imports; the server page and any client can call it). If WP3 already built a resolver, use that one; there must be **one** resolver.

  ```ts
  export type SourceEntry = { domain: string; label: string };
  export function sourceHost(url: string | null | undefined): string {
    if (!url) return "";
    try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
  }
  /** The registry's label for the source a market settles on (most specific domain wins), else its host; null without a parseable URL. */
  export function sourceName(url: string | null | undefined, sources: readonly SourceEntry[]): string | null {
    const host = sourceHost(url); if (!host) return null;
    let best: SourceEntry | null = null;
    for (const s of sources) if ((host === s.domain || host.endsWith("." + s.domain)) && (!best || s.domain.length > best.domain.length)) best = s;
    return best?.label.trim() || host;
  }
  ```

  - There is no `enabled` filter: a disabled source still names what an existing market settles on.
  - Delete `trust-band.tsx`'s private `sourceHost` (310-316) and import this one (used at 259). Same output: `URL.hostname` is already lowercase.
- **`hero.ts` `HeroRow`** (38-45): add `sourceName?: string | null;`, with a doc comment saying it is resolved server-side in `page.tsx`.
  - It is optional on purpose. `.mts` fixtures are outside tsc, and `fixtureIsComplete` only checks `DiscoveryRow` keys.
  - The grid cards (WP3's landing-only source prop) read the same field.
- **`src/app/page.tsx`:**
  - Add `listSources().catch(() => [])` to the `Promise.all` at 97-107 (import from `@/lib/server/source-registry`). A failed read falls back to the host, which is still a true name (B-1).
  - Add `sourceName: sourceName(m.sourceUrl, sources)` after line 157.
  - Line 271 becomes `<LandingProof … nowMs={nowMs} … />`.
- **`src/lib/eat-day.ts`:** add

  ```ts
  export function formatEatDate(atMs: number, nowMs: number, monthsShort: readonly string[], locale: "en" | "sw" | "zh"): string {
    const key = eatDayKey(atMs); const day = formatEatDay(key, monthsShort, locale);
    return locale === "zh" || key.slice(0, 4) === eatDayKey(nowMs).slice(0, 4) ? day : `${day} ${key.slice(0, 4)}`;
  }
  ```

  Replace `trust-band.tsx:251-256` with `fill(t.home.settledOn, { date: formatEatDate(row.settledAtMs, nowMs, t.common.monthsShort, locale) })` and drop its now-unused imports. The output is identical, and the rule has one home.

## 4 · CSS — replaces `globals.css:4323-4455` in full

Everything is tokens. The only literals are `44ch` (the calibrated Sora measure, with its comment moved here) and the delivery's `190/230/104px` measures. `globals.css` is `CSS_SYSTEM`, exempt from the design-frozen css scan.

```css
/* The question board (landing v3 · WP4): a list of rows, each three SIBLING zones — the title link,
   the reading (price · time left · 6px bar), the two side links — never one link (WP17). */
.kp-qboard { border-top: 1px solid var(--border-royal); }
.kp-qrow {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "head" "read" "act";
  align-items: center;
  row-gap: var(--sp-3);
  padding-block: var(--sp-4);
  border-bottom: 1px solid var(--border);
}
/* The note is NOT an area: an empty named row would still take a row-gap. It auto-places below. */
.kp-qrow__note { grid-column: 1 / -1; }
.kp-qrow__head {
  grid-area: head;
  display: flex; flex-direction: column; justify-content: center;
  gap: var(--sp-1);
  min-width: 0;
  min-height: var(--h-control-md);   /* V4: a one-line title link is never a 21px target */
  color: var(--text);
  text-decoration: none;
}
.kp-qrow__q {
  font-family: var(--font-display); font-weight: 700; font-size: var(--type-h4);
  letter-spacing: -0.01em; line-height: 1.25; color: var(--text);
  max-inline-size: 44ch;             /* moved from the inline style; the calibration note moves with it */
  text-wrap: pretty;
  /* phone ceiling — the U6 3-line bound, now written mobile-first (lifted from 640) */
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;
}
.kp-qrow__meta {
  font-family: var(--font-mono); font-size: var(--type-small); line-height: 1.5;
  font-variant-numeric: tabular-nums; color: var(--text-subtle); overflow-wrap: anywhere;
}
.kp-qrow__close, .kp-qrow__pool, .kp-qrow__depth { white-space: nowrap; }
.kp-qrow__read { grid-area: read; display: grid; gap: var(--sp-2); min-width: 0; }
.kp-qrow__line { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: var(--sp-3); row-gap: var(--sp-1); }
.kp-qrow__price { font-family: var(--font-mono); font-size: var(--type-small); font-weight: 700; font-variant-numeric: tabular-nums; min-width: 0; }
.kp-qrow__num { color: var(--text-faint); }
.kp-qrow__unit { color: var(--text-subtle); }
.kp-qrow__unit--label { margin-left: 0.35em; font-weight: 600; }  /* the phrase needs the space a "%" must not have */
.kp-qrow[data-price="priced"] .kp-qrow__price { white-space: nowrap; }
.kp-qrow[data-price="priced"] .kp-qrow__num,
.kp-qrow[data-price="priced"] .kp-qrow__unit { color: var(--yes-300); }   /* names the YES side (§B2a); never gilt */
.kp-qrow__left {
  margin-inline-start: auto;
  font-family: var(--font-mono); font-size: var(--type-small); font-weight: 700;
  color: var(--text); white-space: nowrap;   /* time is not a side: no betting ink (test:betting-ink) */
}
.kp-qrow__act { grid-area: act; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-2); }
.kp-qrow__btn { padding-inline: var(--sp-2); }   /* sw "HAPANA @ 29%" fits a 140px half at 320 */
.kp-qrow__at { font-family: var(--font-mono); font-size: var(--type-small); }
@media (hover: hover) {
  .kp-qrow__head:hover .kp-qrow__q { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 0.18em; }
}
/* Tablet: title and bar side by side, the pair wraps below at its own width. */
@media (min-width: 640px) {
  .kp-qrow {
    grid-template-columns: minmax(0, 1fr) minmax(190px, 230px);
    grid-template-areas: "head read" "act act";
    column-gap: var(--sp-6);
  }
  .kp-qrow__q { display: block; -webkit-line-clamp: none; overflow: visible; }
  .kp-qrow__act { justify-self: start; grid-template-columns: repeat(2, minmax(104px, 1fr)); }
}
/* Desktop: one line — title · bar and time · buttons. */
@media (min-width: 1024px) {
  .kp-qrow {
    grid-template-columns: minmax(0, 1fr) minmax(190px, 230px) auto;
    grid-template-areas: "head read act";
    column-gap: var(--sp-8);
  }
  .kp-qrow__act { justify-self: end; }
}
```

**The note:** add `.kp-qrow__note` to the existing `.mcardp-onesided-note` rule (4802-4810) as a selector list, with the declarations unchanged: `--type-small`, `--text-muted`, `60ch`. That gives one rule, and V7's measure holds on a full-width desktop row. Card geometry is unchanged because no `.mcardp*` declaration moves.

**Deleted:** `.kp-qrow:hover` and its padding transition (4345, D25), `.kp-qrow__glyph`, `.kp-qrow__sub`, `.kp-qrow__lean`, and both old media blocks.

**Width budget check** (sw, `.kp-band__inner` gutters from 5204-5209):
- 1024 → 976 content: 230 bar + ~280 pair + 64 gaps leaves a ~400px title.
- 768 → 720: the title gets 466px.
- 320 → 288: two 140px halves.
- The phone line wraps the time under the label only when "— Hakuna bwawa bado" plus hours overflows.

## 5 · i18n — `src/lib/i18n-dict.ts`, `market` section

If WP3 already added these keys under the same meaning, reuse them and do not add them twice. Placeholder parity holds, there are no digits (`test:rate-copy`), and sw/zh differ from en (`i18n-parity` §2).

| key | en (~line 765) | sw (~3410) | zh (~5608) |
|---|---|---|---|
| `closesOn` | `Closes {date}` | `Inafungwa {date}` | `{date} 截止` |
| `settlesOn` | `Settles on {source}` | `Inaamuliwa na {source}` | `结算依据：{source}` |

- Put `// drafted, marked for native review; English is binding.` above **each** sw and zh key, as the file already does at 3407-3409.
- Everything else is reused: `common.pool`, `common.yes`, `common.monthsShort`, `market.closed/timeLeftD/H/M`, `market.oneSideOnly`, `market.oneSidedNote`, `market.noPoolYet`, `market.predictorsCount(One)`, `market.backSideAria(NoPrice)`, `home.heroNoPrice`.

## 6 · Guard updates (same commit)

- **`scripts/one-sided.test.mts` §4 (169-189):**
  - Amend 4.3 to `/const emptyLabel = price\.kind === "oneSided" \? t\.market\.oneSideOnly : row\.predictors === 0 \? t\.home\.heroNoPrice : t\.market\.noPoolYet;/`.
  - Add 4.6: unpriced draws `<TippingBar empty emptyLabel={emptyLabel}`, and the priced arm is `<TippingBar yesPct={price.yesPct}`.
  - Add 4.7: the note is `price.kind === "oneSided" ? t.market.oneSidedNote.replace("{side}", sideWord(t, price.emptySide, "MARKET")) : null`.
  - Add 4.8: exactly 2 × `{price.kind === "priced" && <span className="kp-qrow__at">`.
  - Add 4.9: `<li className="kp-qrow"` is present and no `<Link …className="kp-qrow"`.
  - Each new check gets a control.
- **`scripts/anchors/one-sided.anchors.mjs`:**
  - Add a mutation `<TippingBar empty emptyLabel={emptyLabel} height={6} />` → `<TippingBar yesPct={50} height={6} />` (expect 4.6).
  - Add a mutation `{price.kind === "priced" && <span className="kp-qrow__at"> @ {price.yesPct}%</span>}` → `{true && …}` (expect 4.8).
  - `red:one-sided` goes from 8/8 to 10/10. Re-run `test:red-anchors`: every `from` must resolve exactly once.
- **`scripts/betting-ink.test.mts` §1** (38-58): add `.kp-qrow__left` to `liveDefects`. It must exist, carry no `--yes/--no`, and use `color: var(--text)`. Add a plant `§3g` that swaps in `--yes-300`, and include it in `§3a`.
- **`scripts/hero-contract.test.mts`:** add §8, which proves `sourceName`:
  - the registry label wins;
  - the most specific domain wins;
  - a subdomain matches;
  - an unknown host returns the host;
  - an unparseable or absent URL returns null.
  - Nothing else changes: `hero.ts` ordering, the board size of 4, and featured ∉ board are all untouched.
- **No change needed:**
  - `test:ui-consistency`: the side controls are anchors; the tipping rule is satisfied by the `empty` sibling arm (281-316).
  - `test:design-frozen`: 0 in this file.
  - `test:popup-fit`: there is no dialog. D3's slip will add +1 to its ratchet.
  - `test:density-contract`: no max-width < 640 rule remains.
  - `test:landing-mine`: the `SignedInAct` slice is untouched.
  - `qa:card-geometry`: no `.mcardp*` change. Run it anyway if you are under the lock.

## 7 · Gate re-points — `scripts/qa/landing-ten.mjs`

- **Survive unchanged, because the classes are kept:**
  - V3 TARGETS (277): `.kp-qrow__price, .kp-qrow__num`. The row buttons are new `a.btn` targets.
  - V3 plant (813).
  - V7 `.kp-qrow__q` (470). The note is a `p` and is capped at 60ch.
  - V11 `.kp-qrow` / `.kp-qrow__num` (603-606).
  - V14 landmark `.kp-qrow` (689, now an `li`).
  - V17 surface `.kp-qrow` (767).
  - `capture.mjs:58`.
- **V8 text map (785):** add `".kp-qrow__meta", ".kp-qrow__note"`. Both carry dictionary words, so an untranslated key shows as identical sw/en.
- **V18 (new, D2), row half.** A block in `CHECKS` (template string: no backticks). For each visible `.kp-qrow`, require visible non-empty `.kp-qrow__price`, `.kp-qrow__left`, `.kp-qrow__pool` and `.kp-qrow__src`, pushing `"a board row shows no <name>"`.
  - `REDS.V18`: remove the first visible row's `.kp-qrow__src`; `applied` means it is gone.
  - It is not in `SKELETON_CLASSES` (1117).
  - WP3 adds the `.mcardp` half.
  - Add a V18 row to the class table in `docs/LANDING-TEN.md` (after 513).
- **`scripts/live/mobile-visual-drive.mjs:212`:** `.kp-qboard > a.kp-qrow` → `.kp-qboard > .kp-qrow`. It would silently measure 0 rows otherwise.
- **New drive `scripts/qa/landing-v3/rows.mjs`** (+ `verify-wp4.sh`, modelled on `verify-wp6.sh`), per `.kp-qrow`:
  - No `a a`, `a button` or `button a` nesting, and the `li` is not an `a`.
  - Side links are ≥ 44px tall; their hrefs end `?side=YES` / `?side=NO`; the head href is `/markets/{id}`.
  - Phone: head < read < act vertically, the act is full row width, and the two halves are equal (±1px).
  - Tablet: head and read overlap vertically with read to the right; act is below both.
  - Desktop: head, read and act share one band, left to right.
  - State by `data-price`:
    - priced: 2 × `.kp-qrow__at` and `.tipbar-rail`;
    - oneSided: 0 × `.kp-qrow__at`, `.tipbar-empty`, and a note naming the empty side;
    - none: `.tipbar-empty` and no note.
  - Its RED control plants `display:block` on a desktop row and expects the one-line assertion to fail.

## 8 · Docs (same commit)

- **`docs/LANDING-TEN.md`:**
  - §1 WP4 row: status and commit.
  - §2.1 WP4: correct "`pricedYesPct` returns null" to `priceState` and add the D29 label rule. Name the meta keys, `source-name.ts`, `formatEatDate`, `?side=` for both player and visitor until D3, the glyph removal, and "no 24h mark on rows".
  - §2.1 WP6: "refund note and dashed rail arrive with WP4" becomes done.
  - Rewrite §0 RESUME AT.
- There is no new INHERIT-MANIFEST law conflict. The competition meta is replaced by the close date per SPEC-VALUES §6. Record that in §2.1.

## 9 · Verification checklist

1. Under `bash ~/heavy-node-lock.sh run landing …`, run in order: `test:one-sided`, `red:one-sided` (**run alone**, then check that `git diff --stat` is clean), `test:red-anchors`, `test:betting-ink`, `test:hero-contract`, `test:i18n`, `test:ui-consistency`, `test:design-frozen`, `test:density-contract`, `test:popup-fit`, `test:landing-mine`, `test:outcome`, `test:signoff`, `test:rate-copy`, `test:landing-ten-plan`, then tsc.
2. Run `verify-wp4.sh` locally, three board states from one boot:
   - cold seed: every row is `none`;
   - `seed-onesided` phase 1: one-sided rows with the note and dashed rail;
   - phase 2: priced rows plus one one-sided row.
   - Each state at 360 / 768 / 1280 × **sw first**, en, zh, as viewport tiles.
   - **Look at the frames:** the one-line desktop row; tablet side-by-side with the pair wrapped; phone full-width pair; no "@" on unpriced rows; the refund note naming the empty side in each locale; 44ch title; 3-line clamp on phones only.
3. Run `rows.mjs` (+ RED), the gate base pass locally (V1–V18 on the row), and RED V17 and V18.
4. **`test:needle-rest` §4 at 360 and 768 on `/`**, signed in via `/auth/demo`. This is the main layout risk (see §10.1).
5. Tap-through, signed out: a row's NO lands on `/markets/{id}?side=NO` → Sign up carries `next=…?side=NO`. Signed in: the dial arrives with NO locked. Middle-click opens a new tab (the controls are real anchors).
6. Push (merge `origin/main`, never rebase), confirm `?dpl=<sha>`, then `verify-prod.sh`. Re-measure on production at 360 / 768 / 1280 × sw/en/zh. Re-read V3/V4/V17/V18 counts from the gate output, never from a recorded number.

## 10 · Risks and hand-offs

1. **Needle §4.** The phone NO link's right edge sits at the 16px gutter (344 at 360). The host's rule counts a small control's whole box within 4px of the parked disc (`needle.tsx:351-427`, disc 56px). Clear 64px windows per row come from head text lines that end short of the edge; the 58px read zone alone is too small.
   - If §4 reports `/` samples on `NO`/`HAPANA`, do **not** silently inset the pair: that breaks the placement map ("full-width YES/NO").
   - Take it to Ali as a numbered choice: (1) inset the phone pair's end by `--sp-4`; (2) accept, and record it on the needle lane.
2. **V3 on production.** The row links are new `a.btn` targets. Rows sit below the first screen at every gate width I can reason about, but compare V3 before and after on the 1440 and 1920 cells.
3. **U32 is exposed by the new path.** A one-sided row's YES/NO now lands on the detail page, whose `SidePicker` chip still prints `yesPct = shownYesPct ?? impliedYesPct` = 100/0 on a one-sided pool (`markets/[id]/page.tsx` note above the `yesPct` line). That is MOBILE-VISUAL U32's to fix, not WP4's. Name it in the D2 handover.
4. **WP3 ownership.** `closesOn`, `settlesOn`, `source-name.ts`, `HeroRow.sourceName` and `formatEatDate` are shared. Whichever row lands first builds them; the other reuses them.
5. **D3 hand-off.**
   - The act zone becomes a client island. Signed in: kit `<Button>`, not a raw `<button className="btn">`, which would take `raw-button-btn-class` from 0 to 2 in its file. Visitors: `/auth/register?next=/markets/{id}?side=SIDE`.
   - The slip Modal adds +1 to the `test:popup-fit` ratchet.
   - `4.8`'s regex will need re-pointing then.

---

# WP9 · Pick-a-side grid — build spec

Everything below was read at `3d6cdb67` on branch `landing-v3` in `C:\kipindi-landing-v3`. Line numbers are as of that commit.

## 0. The decision in brief

1. **Keep `.market-grid` and add a landing-only `.kp-pick`, plus a `data-n` attribute.**
   - `.market-grid` has to stay, because three things select it:
     - the stagger (`globals.css:3930`);
     - the calm-branch delay rule (`globals.css:3060`);
     - the gate's V6 (`landing-ten.mjs:414`).
   - Delete the `.kp-lgw` wrapper and the inline `<style>` tag.
2. **Viewport breakpoints set the columns.**
   - Below 640: a snap rail inside the band's 16px gutter.
   - 640–1023: `repeat(2, minmax(0,1fr))`.
   - 1024 and up: `repeat(3, minmax(0,1fr))`.
   - `1fr` rows apply only from 640.
3. **The card gets one landing-only prop.** When it is set:
   - the slot under the bar (24h band, one-sided note or "No bets yet") is always rendered;
   - that slot reserves three lines of the note;
   - it is the only part of the card that grows when the row is taller. `.mcardp-head` stops growing.
   - The result is that bars and YES/NO rows line up across a row. `/markets` markup does not change, and neither do `MARKET_CARD_H` / `--mcard-h`.
4. **Two gate classes have to change in the same commit.**
   - **V9 would report every control in the peeking and off-screen cards as "clipped".** It focuses with `preventScroll`.
   - **V6 cannot see the defect WP6 found.** It compares card heights, and a stretched row has equal heights by construction.
5. **There is a new static guard, `test:landing-grid`**, with `red:landing-grid` and its anchors.
6. **There is a new local drive, `verify-wp9.sh` / `wp9-rail.mjs`,** for everything the gate cannot see: snapping, keyboard, touch, the chat bubble and the Needle.

## 1. What is there today

- **`src/app/page.tsx` — the §1c band, lines 276–367.**
  - Line 280: the band renders only when `comp.grid.length > 0`.
  - Lines 282–302: `.kp-shead`, with the link at 299: `href=/markets?sort=${comp.lens}`, text `fill(t.home.gridSeeAll,{n: figures.openCount})`.
  - Lines 305–325: the "orphan-row" comment. It reasons about the 614px container query and records the 44px phone cost of `1fr`.
  - Line 326: the inline `<style>`: `.kp-lgw{container-type:inline-size}@container (min-width:614px){.kp-lgw .market-grid{grid-auto-rows:1fr}}`.
  - Lines 327–328: `<div className="kp-lgw">` and `<div className="market-grid">`, both indented 12 spaces.
  - Line 329: `comp.grid.slice(0, LANDING_GRID_SIZE)`.
  - Lines 332–356: `<MarketCard …/>`. `yesPool={r.yesPool}` is at line 346, indented 20 spaces. That exact line is the `red:one-sided` anchor at `scripts/anchors/one-sided.anchors.mjs:43-44`.
  - Line 363: the topics wrapper, `marginTop: var(--rh-close)`.
- **`LANDING_GRID_SIZE = 3`** is at `src/lib/markets/landing.ts:48`.
  - `landingGrid` (lines 117–138) seats priced markets first and then shows them in the lens order (L23).
  - On a thin day `comp.grid` can hold 1 or 2 cards.
- **`globals.css`:**
  - `.market-grid` at line 3345: `gap:14px; grid-template-columns: repeat(auto-fill, minmax(min(300px,100%),1fr))`.
  - The Compact override at line 6156: `html:not([data-density="comfortable"]) .market-grid { gap: 10px; }`, below 640.
  - The featured span at lines 3900–3905. It is hero-only and does not apply here.
  - `.kp-band__inner` at line 5204: `max-width: var(--w-board)` (1280) and `padding-inline` 16px, or 24px from 768.
  - `.kp-shead` at line 5237, with `margin-bottom: --rh-tight` (24).
  - The bottom nav is already called `.kp-rail` (line 5744). **Do not name the new class `kp-rail`.**
- **The card, `src/components/markets/market-card.tsx`:**
  - In-flow children, in order: top, head, moveline, bar, slot, traders, actions, meta, foot.
  - `.mcardp` (line 4516) is a flex column with `height:100%`.
  - `.mcardp-head` (line 4595) is `flex: 1 1 auto`.
  - `.mcardp-meta` (line 4655) has `margin-top: auto`.
  - Flexbox gives free space to `flex-grow` items before auto margins. So when a row is stretched (by `1fr`, or by the rail's single row), the extra height goes into the head of each shorter card. That pushes its bar down. **This is the WP6 "empty band": the one-sided card's bar sits higher than its row-mates' bars.**
  - The slot content is three mutually exclusive expressions:
    - line 490: `{noPrice && neverBet && <div className="mcardp-nobets">…`
    - line 494: `{oneSidedNote && <p className="mcardp-onesided-note">…`
    - lines 496–499: `{showSpark && (<MicroSpark … stretch/>)}`
  - `.mcardp-onesided-note` (line 4802) is `--type-small` (13px) at line-height 1.4 with a 60ch cap. The spark's height is `--mcard-spark-h` (28px, or 20px in Compact).
- **Landing grid cards are always live.** `matchesStatus("open")` excludes `selectionClosed` (`discovery.ts:365`), so the moveline row is always present.

## 2. Markup

### 2a. `src/app/page.tsx`

- Add this after `timeLeftStr` (lines 245–251):
  ```tsx
  const gridCards = comp.grid.slice(0, LANDING_GRID_SIZE);
  ```
- Replace lines 305–360 (the comment, the `<style>`, both wrappers and the map) with the block below.
- Keep the indentation exactly as it is now:
  - the div at 12 spaces;
  - `{gridCards.map` at 14;
  - `<MarketCard` at 18;
  - props at 20.

  That keeps `                    yesPool={r.yesPool}` occurring exactly once.
```tsx
            {/* ⭐ WP9 · PICK A SIDE (landing v3). Below 640 a snap rail, the next card peeking; two columns
                to 1023; three from 1024. The layout and its reasons live on `.kp-pick` in globals.css.
                `.market-grid` stays on so the stagger, the calm-branch delays and the gate's V6 still find
                this grid. Every card is `landingGrid`: the slot under the bar is reserved and is the only
                part that grows, so bars and YES/NO rows line up across a row (V6). /markets never carries
                `.kp-pick` or `landingGrid` (test:landing-grid). */}
            <div className="market-grid kp-pick" data-n={gridCards.length}>
              {gridCards.map((r) => {
                const cc = cardCharts.get(r.id) ?? { spark: [] };
                return (
                  <MarketCard
                    …every existing prop unchanged, byte for byte…
                    traders={traderMap.get(r.id)}
                    landingGrid
                  />
                );
              })}
            </div>
```
- ⛔ Do not put any Tailwind-shaped token (`x-[…]`) in the new comment. Tailwind scans comments.
- The header link (lines 299–302) does not change. It stays 44px and sits before the rail in the DOM, so it comes first in tab order.
- ⛔ Do not add an "All markets" end-card to the rail. V6 would read an off-height item in the row, and the header link is the section's one door.
- Add no `role`, `aria-label` or `tabindex` to the rail:
  - The h2 already labels the section.
  - The rail contains focusable controls, so axe's `scrollable-region-focusable` passes.
  - A focusable scroller that wraps controls would sail close to WP17's rule against nested interactive elements.
- **No new i18n keys**, so WP16 is unaffected.

### 2b. `src/components/markets/market-card.tsx`

**Use one prop for the landing grid's card.**
- If WP3 (built before WP9 in §0's order) has already added its "grid cards name their source" prop, extend that prop and its class.
- Otherwise add the prop below, and WP3 reuses it.

Add after `featured?: boolean;` (line 106):
```ts
  /**
   * The LANDING GRID's card (landing v3 WP9; WP3's grid source line rides the same prop). Every card in a row
   * keeps the same slots so bars and YES/NO rows line up (V6): the slot under the bar — the 24h band, the
   * one-sided refund note or "No bets yet" — is ALWAYS rendered, reserves three lines of the note, and is
   * the only part of the card that grows when its row is taller. ⛔ Landing only: /markets, /results,
   * /watchlist and the detail rail never pass it, so their markup and MARKET_CARD_H are unchanged.
   */
  landingGrid?: boolean;
```
- Destructure `landingGrid` in the signature at line 239.
- Just above `const body = (`, move the three slot expressions from lines 490–499 into a constant. Move their WP6 comments with them. Keep each expression **byte-identical**, because two tests read them:
  - `test:outcome` (`scripts/outcome-display.test.mts:227`) matches `\{noPrice && neverBet && <div className="mcardp-nobets">`;
  - `test:one-sided` §149–156 reads the `oneSidedNote` / `showSpark` constants.
  ```tsx
  const slot = (
    <>
      {noPrice && neverBet && <div className="mcardp-nobets">{t.market.noBetsYet}</div>}
      {oneSidedNote && <p className="mcardp-onesided-note">{oneSidedNote}</p>}
      {showSpark && (
        <MicroSpark data={spark!} width={300} height={28} padX={0} padY={4} smooth area stretch
                    className="mcardp-spark" lineClassName="mcardp-spark-line" />
      )}
    </>
  );
  ```
- In the body, where lines 490–499 were:
  ```tsx
  {landingGrid ? <div className="mcardp-slot">{slot}</div> : slot}
  ```
  Without the prop this renders a fragment, so the `/markets` DOM is identical.
- At both root sites (line 623 on the `<article>` and line 648 on the `<Link>`):
  ```ts
  cn("mcardp group", featured && "mcardp--featured", landingGrid && "mcardp--lgrid", className)
  ```

## 3. CSS (`src/app/globals.css` only)

**(a) Rhythm tokens.** Add these in the MARKET-CARD RHYTHM block, after `--mcard-spark-h: 28px;` at line 869. They are derived values, not new design values: SPEC-VALUES' "fixed 58px note slot" maps onto three lines of the existing note. `--mcard-h` does not consume them.
```css
  --mcard-note-lh: 1.4;                                               /* .mcardp-onesided-note's line-height, named once */
  --mcard-note-slot: calc(3 * var(--mcard-note-lh) * var(--type-small)); /* three lines of the note: 54.6px (concept: 58) */
```
- In `.mcardp-onesided-note` (line 4802), change `line-height: 1.4;` to `line-height: var(--mcard-note-lh);`. This is zero change on every site.

**(b) The landing card.** Add directly after the `.mcardp-onesided-note` block:
```css
/* ── The landing grid's card (landing v3 · WP9) ── `mcardp--lgrid` is set only by `landingGrid` (/ only).
   The slot under the bar takes the row's slack instead of the head, so every card's bar sits at the same
   offset (head and move line are fixed) and every YES/NO row at the same offset from the bottom. The slot
   reserves three lines of the one-sided note, so a card with no note is the same height as one with.
   A column flex, so the stretched spark keeps its full width and its -4px pull toward the bar. */
.mcardp--lgrid .mcardp-head { flex-grow: 0; }
.mcardp--lgrid > .mcardp-slot {
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
  min-height: var(--mcard-note-slot);
}
```

**(c) The landing grid layout.** Add after `.kp-shead__link:hover` (line 5268). The selector `.market-grid.kp-pick` (specificity 0,2,0) beats `.market-grid` wherever it sits in the file. The rail sets no `gap`, so the Compact rule (10px) still applies below 640, and 14px applies in Comfortable.
```css
/* ── §1c PICK A SIDE — the landing grid's own layout (landing v3 · WP9) ─────────────────────────────
   `.kp-pick` rides on `.market-grid`, on / only. Below 640 a snap rail (the delivery's
   grid-auto-flow: column / 86% cards): the next card peeks 24–64px inside the band's 16px gutter,
   and the RAIL is the scroll box — the page never scrolls sideways (V1).
   ⛔ overscroll-behavior-x, never the shorthand: once overflow-x is auto the rail scrolls on BOTH axes,
   and `contain` on y would stop a vertical swipe that starts on a card from scrolling the page.
   ⛔ No touch-action: pan-y must reach the page.
   The block padding keeps the cards' cast and the 8px kp-rise entrance inside the clip (no transient
   vertical scroll); the equal negative margin keeps the section's 24/32 rhythm where it was.
   1fr rows only from 640, where cards sit side by side — in one column 1fr cost 44px per phone
   (measured on production 2026-09-24); in the rail the single row already equalises by stretch. */
@media (max-width: 639.98px) {
  /* density: general — the rail is the landing grid's phone LAYOUT, not card spacing; Compact and Comfortable both get it (the gap still follows the Compact rule on .market-grid) */
  .market-grid.kp-pick {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: 86%;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    scrollbar-width: thin;
    padding-block: var(--sp-2);
    margin-block: calc(-1 * var(--sp-2));
  }
  .market-grid.kp-pick > * { scroll-snap-align: start; }
  /* A thin day with one card: nothing to peek at, so it takes the whole rail. */
  .market-grid.kp-pick[data-n="1"] { grid-auto-columns: 100%; }
}
@media (min-width: 640px) {
  .market-grid.kp-pick { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 1fr; }
}
@media (min-width: 1024px) {
  .market-grid.kp-pick { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
```
**Notes on the CSS:**
- `test:density-contract` §2 (`EXEMPT`, line 43) requires every phone-only block to open with that `density: general` comment. Without it the suite fails.
- `grid-template-columns: none` is required. Otherwise the first card fills the explicit auto-fill track at full width.
- `minmax(0,1fr)` stops a card's min-content from blowing out a column.
- The margins collapse like this:
  - top: the head's 24px plus the rail's −8px margin plus its 8px padding puts the cards 24px below the head, as today;
  - bottom: 32 − 8 + 8 = 32 to the topics, as today.
  - Removing `.kp-lgw` matters here: its `container-type` containment stopped margins collapsing through it.
- ⛔ Add no edge-fade mask. It would dim the peek, which is the affordance.
- Reduced motion needs nothing new:
  - snapping is scroll physics, not an animation;
  - the `.market-grid > *` entrance keeps its calm-branch rules (`globals.css:3060`, motion.css);
  - no `scroll-behavior` is set.
- **What does not change:**
  - the base `.market-grid` (line 3345);
  - the Compact block (lines 6140–6165);
  - every `.mcardp-*` rule that tests pin:
    - `test:card-share` reads `.mcardp-share` / `.mcardp-details` by first match;
    - `test:tap-target` §6 matches `.mcardp-info {` at column 0;
    - `test:betting-ink` reads `.mcardp-meta .live`.

  None of those selectors is added.

## 4. The numbers to expect

- **Below 640.** The rail is W = vw − 32 wide. A card is 0.86W. The peek is 0.14W − gap (gap is 10 in Compact, 14 in Comfortable).

  | Viewport (px) | Card width (px) | Peek, Compact (px) | Peek, Comfortable (px) |
  |---|---|---|---|
  | 277 | 210.7 | 24.3 | 20.3 |
  | 320 | 247.7 | 30.3 | 26.3 |
  | 360 | 282.1 | 35.9 | 31.9 |
  | 412 | 326.8 | 43.2 | — |
  | 560 | 454.1 | 63.9 | 59.9 |

- **From 640.** Column widths (gap 14):

  | Viewport (px) | Columns | Column width (px) |
  |---|---|---|
  | 640 | 2 | 297 |
  | 768 | 2 | 353 |
  | 1023 | 2 | 480.5 |
  | 1024 | 3 | 316 |
  | 1280 / 1920 | 3 | 401.3 |

  - 640–1023 is two columns with an orphan third card, as in the concept (three cards, `auto-fit` 300).
  - `1fr` gives the orphan its row-mates' height, which satisfies V6's orphan rule.
- **Note slot.** Reserved at 54.6px, which is three lines.
  - en and zh notes take 2 lines at 768 and above.
  - sw takes about 3 lines.
  - In the rail at 320 and 277, sw reaches 4–5 lines. The elastic slot absorbs this, so alignment holds and the row grows.
- **Height cost.** A priced card with a spark gains about 27px (about 35px in Compact) of blank slot under the spark. That is the delivery's "fixed note slot", by design (SPEC-VALUES §4, HANDOVER WP7).
- **Chat bubble at 360.** The bubble is 44px at right 16 / bottom 80 (`ChatRoot.tsx:325-326`), so it spans x 300–344.
  - It covers the peek strip (x 308–344). It never covers card 1: card 1's controls end at x 283.
  - Card 1's controls clear the bubble by at least 5px at every rail width from 277 to 560.

## 5. Guard updates (same commit)

1. **`scripts/qa/landing-ten.mjs`, V6 (lines 404–465): add bar and button alignment.** Put this after the within-row height loop, inside the same block. It is a template literal: no backticks, no backslashes.
   ```js
   // ⭐ BARS AND YES/NO LINE UP (landing v3 WP9, K15). A stretched row has equal HEIGHTS by construction, which is how one
   // card's refund note pushed its row-mates' bars down while this class stayed green (the WP6 review).
   if (kids.every((k) => k.classList.contains("mcardp"))) {
     for (const row of rowList) {
       if (row.length < 2) continue;
       for (const [q, name] of [[".tipbar-rail, .tipbar-empty", "bar"], [".mcardp-actions", "YES/NO row"]]) {
         const offs = row.map((x) => { const e = x.el.querySelector(q); return { x, o: e ? Math.round(e.getBoundingClientRect().top - x.el.getBoundingClientRect().top) : null }; }).filter((v) => v.o !== null);
         if (offs.length < 2) continue;
         const m = med(offs.map((v) => v.o));
         for (const v of offs) if (Math.abs(v.o - m) > 1) bad.push({ what: "the " + name + " sits at a different height from its row-mates'", measured: v.o + " vs " + m + "px below the card top", where: sel(c) + " > " + sel(v.x.el) + ' "' + textOf(v.x.el) + '"' });
       }
     }
   }
   ```
   - Once the rail ships, V6 also sees the phone grid: one row of 3. Before WP9 it skipped the single column (`maxPerRow < 2`).
2. **`landing-ten.mjs`, V9 (line 567): a horizontal scroller brings a focused child into view.**
   - V9 focuses with `preventScroll` (line 549). As written, every control in cards 2–3 would read as "clipped by `.kp-pick`" in every phone cell, across all 7 phone widths and all 3 locales plus the state cells.
   - On the scroll axis, compare against the scroller's scrollable extent. On the other axis, compare against its box.
   ```js
   const pr = p.getBoundingClientRect();
   const xs = /(auto|scroll)/.test(ps.overflowX) && p.scrollWidth > p.clientWidth + 1;   // WP9: the rail scrolls a Tab target in
   const L = xs ? pr.left + p.clientLeft - p.scrollLeft : pr.left, R = xs ? L + p.scrollWidth : pr.right;
   if (ring.top < pr.top - 0.5 || ring.bottom > pr.bottom + 0.5 || ring.left < L - 0.5 || ring.right > R + 0.5) clipped = p;
   ```
3. **RED mode: let a class carry several plants.**
   - `RED=V6.bars` proves V6, because the class is the part before the dot. Add after line 50:
     ```js
     const RED_CLASS = RED ? RED.split(".")[0] : null;
     ```
   - At lines 1074–1075, replace `RED` with `RED_CLASS`.
   - Add two plants to `REDS` (line 803). Both are quoted keys.
   ```js
   "V6.bars": `(() => { for (const g of document.querySelectorAll(".market-grid")) {
       const cards = [...g.children].filter((k) => k.classList.contains("mcardp") && k.getBoundingClientRect().height > 0);
       const top = (k) => Math.round(k.getBoundingClientRect().top);
       const v = cards.find((k) => cards.some((o) => o !== k && top(o) === top(k)));
       const bar = v && v.querySelector(".tipbar-rail, .tipbar-empty"); if (!bar) continue;
       const off = () => bar.getBoundingClientRect().top - v.getBoundingClientRect().top; const before = off();
       bar.parentElement.style.setProperty("margin-top", "12px", "important");
       return { applied: off() - before > 1, note: "bar " + Math.round(before) + " -> " + Math.round(off()) + "px beside a row-mate" }; }
     return { applied: false, note: "no card grid has a row with two cards at this width" }; })()`,
   "V9.rail": `(() => { const g = document.querySelector(".market-grid.kp-pick");
     if (!g || !/(auto|scroll)/.test(getComputedStyle(g).overflowX)) return { applied: false, note: "no scrolling rail at this width" };
     g.style.setProperty("max-height", "96px", "important");
     return { applied: g.scrollHeight > g.clientHeight + 1, note: "rail squashed to " + g.clientHeight + "px of " + g.scrollHeight }; })()`,
   ```
   - `V9.rail` proves that the new exemption still reports a real clip on the axis the rail does not scroll.
   - Run `V6.bars` at `base-360-sw` and `base-1280-sw`. Run `V9.rail` at `base-360-sw` only.
   - The existing V6 plant now lands on the rail at 360. Before WP9 it lands on `.kp-topics` there.
4. **New static guard.** Add `scripts/landing-grid.test.mts` (`test:landing-grid`; `test:all` picks it up automatically), `scripts/landing-grid-red.mjs` (`red:landing-grid`), and `scripts/anchors/landing-grid.anchors.mjs`. `test:red-anchors` §3 audits that every anchor resolves exactly once. Use postcss, as `density-contract` does.
   - **§1 — `page.tsx`:**
     - exactly one `className="market-grid kp-pick"` carrying `data-n=`;
     - no `<style>` element and no `kp-lgw`;
     - the grid's `<MarketCard` passes `landingGrid`, `yesPool` and `noPool`.
   - **§2 — `landingGrid` appears at no other call site:**
     - `markets/page.tsx:354`, `:425`
     - `markets/[id]/page.tsx:1032`
     - `results/page.tsx:500`
     - `watchlist/page.tsx:248`
     - `landing-hero.tsx:252`
   - **§3 — `market-card.tsx`:**
     - `landingGrid && "mcardp--lgrid"` appears at both roots;
     - `className="mcardp-slot"` appears only under `landingGrid`;
     - the three slot expressions are unchanged.
   - **§4 — `globals.css`:**
     - The `(max-width:639.98px)` `.market-grid.kp-pick` rule has: `grid-auto-flow: column`, `grid-auto-columns: 86%`, `overflow-x: auto`, `scroll-snap-type: x mandatory`, `overscroll-behavior-x: contain`.
     - It has no `overscroll-behavior:` shorthand and no `touch-action`.
     - `> *` has `scroll-snap-align: start`.
     - At 640: two columns plus `1fr` rows. At 1024: three columns.
     - The base `.market-grid` still reads `repeat(auto-fill, minmax(min(300px, 100%), 1fr))`.
     - `.mcardp--lgrid .mcardp-head` is `flex-grow: 0`.
     - The slot is `flex: 1 0 auto` with `min-height: var(--mcard-note-slot)`.
     - The note's line-height reads `var(--mcard-note-lh)`.
   - **RED mutations** (each must fail its own section):
     1. drop `landingGrid` from `page.tsx` (§1);
     2. add it to `/markets`' first card (§2);
     3. `x mandatory` → `none` (§4);
     4. `overscroll-behavior-x: contain` → `overscroll-behavior: contain` (§4);
     5. head `flex-grow: 0` → `1` (§4 — the WP6 band returns);
     6. change the base `.market-grid` columns (§4 — `/markets` touched).
5. **Existing suites to run, and what each should show.**

   | Suite | Expected |
   |---|---|
   | `test:density-contract` | Passes; its printed population includes the new block |
   | `test:one-sided` + `red:one-sided` | 8/8; the `page.tsx:346` anchor still resolves |
   | `test:outcome` | Passes (nobets regex) |
   | `test:card-share`, `test:tap-target`, `test:betting-ink` | Pass |
   | `test:dead-css` | Passes (`.kp-pick`, `.mcardp--lgrid`, `.mcardp-slot` all have consumers) |
   | `test:tokens` | Passes (two new tokens, each defined once) |
   | `test:design-frozen` | Passes (globals.css is `CSS_SYSTEM`, line 269; `page.tsx` loses its only `<style>`) |
   | `test:i18n` | Passes (no keys) |
   | `test:red-anchors` | Passes |
   | `test:landing-ten-plan` | Passes |
   | typecheck | Passes |
   | `test:needle-rest` | Local, heavy. §4 (line 199) sweeps `/` at 360 and 768 and must stay at 0 covered |

   - Why `test:needle-rest` is expected to stay clean: the host's census (`needle.tsx:391-404`) uses unclipped rects. So the peeking card's YES box (x ≈ 323–444) now reaches the right-edge strip. The host glides clear of it, and it re-checks on any scroll because it listens in the capture phase (line 674).
6. **`qa:card-geometry` as a before/after pair** (`scripts/card-geometry-probe.mjs` measures `/markets` and `/` at 360, 1280 and 1920).
   - Run `before` on the untouched tree, then `after`.
   - Every `/markets @…` key must read **IDENTICAL**.
   - The `/ @…` keys are expected to move:
     - at 360 the three grid cards share one top, and `docHeight` falls by roughly two stacked cards;
     - at 1280 and 1920 card heights grow by about the slot slack.
   - The script exits 1 on any difference, so read the diff lines rather than the exit code.
7. **Docs, in the same pass.** Keep `test:landing-ten-plan` green throughout.
   - `docs/LANDING-TEN.md`:
     - §1 WP9 row: 🔨 while building, 🔵 once live with its sha, ✅ once measured on production.
     - §2.1 WP9: rewrite as BUILT, including the mappings (58px → three lines of the note; the delivery's 14px gap → the Compact 10px rule, Ali 2026-09-15) and the V9 note.
     - §2.1 WP6 "Accepted, recorded" line: now delivered by WP9.
     - Class table: V6 becomes "…; the bar or the YES/NO row at a different offset across row-mates (card grids)". V9 becomes "…; a horizontal scroller's own scroll extent counts as in view".
     - "Running it": add `RED=V6.bars …`.
     - §3 notes for K15, K44 and P12.
     - §0 state and next.
   - `docs/NEXT-PLAN.md` ▶ 0b count: update when WP9 turns ✅.

## 6. Verification checklist

**Setup:** one heavy-node lock hold each, run detached, with a `.done` marker.
- `bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/verify-wp9.sh wp9`
- Model `verify-wp9.sh` on `verify-wp6.sh`:
  - port 3057, `localhost`;
  - seed-markets and updown;
  - `seed-onesided.mjs` phases 1 and 2, plus a new **PHASE=3**: two more contested markets from the unused tail, so the grid holds priced and one-sided cards **in the same row**.
- **Precondition, asserted:** at least one one-sided card and at least one priced card in one grid row. If that is not true, the run is INCONCLUSIVE, not clean.

**Local, `scripts/qa/landing-v3/wp9-rail.mjs`:**
- **Widths:** 277, 320, 360, 412, 560, 640, 768, 1023, 1024, 1280, 1920.
- **Locales:** sw, en, zh.
1. **Layout.**
   - Below 640: one row; card width ÷ rail `clientWidth` is 0.86 ± 0.005; the peek (`rail.right − card2.left`) matches §4 ± 1; `scrollWidth > clientWidth`.
   - 640–1023: two distinct card lefts. From 1024: three distinct lefts on one top.
2. **V1.** `max(doc, body).scrollWidth ≤ innerWidth` and `scrollX === 0`, both before and after scrolling the rail.
3. **Slots.**
   - Bar offset and YES/NO offset equal ±1 across row-mates.
   - Every slot is at least 54px tall.
   - A one-sided note's bottom is at or above its slot's bottom.
   - Watch zoom 277 in sw: a wrapped chip row (`.mcardp-top{flex-wrap:wrap}`) would show up here as a real bar offset.
4. **Snap.**
   - Setting `scrollLeft` to 1 settles back to 0.
   - `scrollBy(card + gap)` lands exactly on card 2's `offsetLeft`.
   - The end position shows card 3 whole.
5. **Keyboard.**
   - Start on `.kp-shead__link` and Tab through all three cards: link, YES, NO, ⓘ, Share, Details for each.
   - Every focused element's rect must lie inside the rail's rect and the viewport, with its ring visible. This measures real focus scrolling plus snap.
   - Shift+Tab back the same way.
   - ArrowRight on a focused card link scrolls the rail.
6. **Touch.**
   - A CDP `Input.synthesizeScrollGesture` horizontal swipe on the rail moves the rail, snaps, and leaves `scrollX` at 0.
   - A vertical swipe that starts on a card scrolls the page. This proves y still chains to the page.
7. **Chat bubble** at 277, 320 and 360, signed out.
   - Scroll the page until the rail's YES row is at the bubble's y (vh − 124 to vh − 80). Wait 400ms (past D3's 250ms) but less than 3s (before D75).
   - Hit-test card 1's controls: none may return `.cm-fab`.
   - Record the peek coverage as information only.
8. **Needle,** signed in via `/auth/demo`, at 360.
   - Put the rail band at the Needle's y, scroll the rail, wait 1.9s.
   - Its `covered()` result must be empty.
9. **Motion.**
   - `reducedMotion: 'reduce'` and `data-motion=reduced`: every card at opacity 1, and the rail still snaps.
   - No-JS: the rail renders and scrolls.
   - Comfortable cookie: gap 14. Compact: gap 10.
10. **One-card case.** DOM plant: remove two cards and set `data-n="1"`; the card width equals the rail width.
11. **Frames.** For each cell, capture viewport tiles of the band at rest, after swiping to card 2, and at the end. Use `capture.mjs` with `WIDTHS=277,320,360,560,640,768,1024,1280` plus `MODE=concept` beside it. **Look at them.**
12. **Gate and RED controls.** `qa:landing-ten` base pass locally: V1, V6 and V9 at 0, and V15 unchanged. REDs: `V6.bars` (360, 1280), `V9.rail` (360), `V6` (360). Each must read PROVED.
13. **Suites.** Everything in §5.5, plus `qa:card-geometry after` and `test:needle-rest`.

**Production:**
- Push to `main`, then confirm the `?dpl=` sha.
- Run `verify-prod.sh` with RED `V6.bars` and `V9.rail` added.
- Run `wp9-rail.mjs` against production for items 1–7 and 9–11; they are read-only.
- The gate must show V1, V6 and V9 clean in all 33 cells. The known open counts (V3, V4) stay unchanged.
- Look at frames at 360, 768 and 1280 × sw, en, zh. Only then does the row turn ✅.
- A control on the old build: run the amended gate against production **before** deploying. V6 should report bar offsets wherever a one-sided card shares a row, which confirms the check sees the WP6 defect.

## 7. What the gate cannot see

- **It measures only at scroll 0.** The rail is far below the fold, so V3 never sees the bubble over the rail. Items 7 and 8 of the drive cover this.
- **It never scrolls or focuses for real.** Snap positions, focus scroll plus re-snap, touch pan-y chaining and momentum are all invisible to it (items 4–6). iOS Safari momentum with snap needs the DEV devices.
- **Its data is production's.** If production's grid has no one-sided card that day, V6's bar check passes without testing anything. The seeded local row and the RED plant are the proof.
- **Android text scaling is not covered by any driver** (Known gaps). sw notes at 130% text reach 5+ lines; the elastic slot should hold, but only the DEV row can confirm it.
- **Whether the peek reads as "there is more"** is a judgement for a person looking at the frames, and so is what cards 2 and 3 look like.
- **V9's exemption trusts that focus scrolls the rail.** Item 5 checks that with real Tab presses.

## 8. Open items

1. **The chat bubble does not hide during a rail swipe.**
   - `scroll-cast.tsx:124-130` listens to window `scroll`, `pointerup` and `keydown`.
   - A horizontal swipe fires none of those: a touch pan ends in `pointercancel`, and a rail scroll does not bubble to window.
   - So within 3s of the last tap, the bubble stays over the peek (never over card 1's controls).
   - That file belongs to the U7 lane, and the bubble is already Ali's open V3 call. So WP9 records this rather than changing it. Numbered choice for Ali:
     1. Leave it as is.
     2. Make a rail swipe count as moving: one capture-phase `document` scroll listener in `scroll-cast.tsx`.
2. **K49 ("closing time next to every price") names WP9 in the crosswalk.**
   - The grid card's time sits in the meta row. WP3 owns the top-right time mechanism, so WP9 does not move it.
   - WP9's row note should record that K49 on grid cards goes with WP3, on the same `landingGrid` prop.
   - Whatever WP3 adds above the bar on grid cards (its source line) must be a fixed single line (ellipsis). Otherwise V6's bar check will flag it.
3. **Accepted as-is:**
   - A thin day with two cards leaves a hole in the third column from 1024. Card width stays constant.
   - About 21px of the peeking card's YES button is visible and tappable. It opens that market side-locked, and the confirm step still applies.

**Files:**
- `C:\kipindi-landing-v3\src\app\page.tsx`
- `C:\kipindi-landing-v3\src\components\markets\market-card.tsx`
- `C:\kipindi-landing-v3\src\app\globals.css`
- `C:\kipindi-landing-v3\scripts\qa\landing-ten.mjs`
- `C:\kipindi-landing-v3\scripts\needle-rest.test.mjs`
- `C:\kipindi-landing-v3\scripts\density-contract.test.mts`
- `C:\kipindi-landing-v3\scripts\anchors\one-sided.anchors.mjs`
- `C:\kipindi-landing-v3\scripts\card-geometry-probe.mjs`
- `C:\kipindi-landing-v3\scripts\qa\landing-v3\verify-wp6.sh`
- `C:\kipindi-landing-v3\scripts\qa\landing-v3\capture.mjs`
- `C:\kipindi-landing-v3\docs\LANDING-TEN.md`

New files to create:
- `scripts/landing-grid.test.mts`
- `scripts/landing-grid-red.mjs`
- `scripts/anchors/landing-grid.anchors.mjs`
- `scripts/qa/landing-v3/verify-wp9.sh`
- `scripts/qa/landing-v3/wp9-rail.mjs`

**New session needed:** no. WP9 can be built in the current session. The heavy work is two lock holds: the geometry `before` run, then the WP9 drive.

---

# V18 · Gate class: every market shows price or state, time, pool, source — build spec

Read at `C:\kipindi-landing-v3` (branch `landing-v3`, HEAD `3d6cdb67`, worktree clean). Nothing in the repo was edited. The only things run were `node --check` and a compile-only splice of the proposed code into a scratch copy. No browser was used.

## 0 · Decisions, in one place

1. **Five parts plus one order rule, checked per surface.** The first part is a price or a labelled state. Then come time left, pool, predictors and source. I added predictors because K48 ("Depth (pool and predictors) on every market") names V18, and the §2.1 WP4 bullet says "pool · predictors (depth on every market, V18)".
   - The **order rule covers only the source and the price/state.** They must come before the pick, both in the DOM and on screen (K36).
   - Time, pool and predictors are checked for **presence only**. Where they sit belongs to K49 and V21. The delivery's own grid card puts the pool *below* the buttons (concept `50pick Home Concept v3.dc.html` ~l.368), so a pool-before-pick rule would fail the delivery's own design.
2. **Parts and surfaces are found through data attributes, not class names or words.**
   - Each part gets `data-market-part="price|state|time|pool|predictors|source|pick"`.
   - Each surface root gets `data-market-surface="featured|card|board"`.
   - This follows the repo's existing instrumentation contract (`data-row-id` / `data-chip` / `data-result-count`, see the comment on `PositionCard` in `position-card.tsx` ~l.62).
   - Class names only widen the **population**. `.mcardp[data-row-id]` and `.kp-qrow` are always examined, so a surface that loses its attribute is reported as "unmarked" instead of silently skipped. The card fallback requires `data-row-id` because the Up & Down card uses the `.mcardp` shell without it (`scripts/live/mobile-visual-drive.mjs` l.168–190 uses the same rule).
3. **How the source is detected:** a visible `[data-market-part="source"]` on the source **name**, not on the "Settles on" label. Its centre must be inside its own surface's box, it must contain at least 2 letters (`\p{L}{2}`), and it must come before the pick.
4. **RED control:** remove one part from one surface. `RED_PART` picks the part: `source` (default), `price`, `time`, `pool`, `predictors`, or `order` (moves the source after the pick). The plant removes *every* copy of that part in the surface. WP3 will give the featured card two time elements, and hiding only one would read as BLIND.
5. **The line-1046 crash is not a gate or `--cell` bug.** It was a SyntaxError thrown inside Playwright's `browserType.launch` on a machine that bugchecked (0x1A MEMORY_MANAGEMENT) about four minutes later (§8). Reading around it turned up two real instrument defects. The worst: **a `--cell`/`--pass` that matches nothing prints "GATE GREEN" with exit 0.** Fixes in §8.

## 1 · What I read in the gate (`scripts/qa/landing-ten.mjs`)

- **`CHECKS`** (l.118–790) is one template literal that is evaluated in the page. Inside it:
  - Backslashes are doubled (`\\s` in source becomes `\s` in the page).
  - It has no backticks except two escaped ones in the l.134 comment, and must never contain `${`.
  - Helpers available inside it: `V`, `push(cls, items)` (l.120), `sel(el)` (l.122: tag plus up to two classes plus id), `vis(el)` (l.127: rect > 0, not `visibility:hidden`, not `display:none`, opacity > 0.05), `textOf(el)` (l.131: innerText, 60 chars).
  - Each class is a `{ … push("Vn", bad); }` block. Extra per-class facts go on `V[V.length-1]`, for example V4's `.rung` (l.344), V5's `.unmeasurable` (l.401) and V9's `.examined` (l.578).
- **V15** (l.701–732), **V16** (l.734–756) and **V17** (l.758–781) are the v3 precedents.
  - V15 reports "no featured market" as a finding, not a pass.
  - V17 reads **per market surface** (`.mcardp, .kp-qrow`). Its comment says why: "never off the whole page: the conviction bar's reading is an aggregate, not a price".
- **`REDS`** (l.803–944): each entry is a template literal evaluated in the page *before* `CHECKS`. It must return `{ applied, note }` and cannot see `CHECKS`' helpers. V15/V16/V17's plants are at l.929–943.
- **Per-cell output** (l.1120–1144): `clean` or `FAIL <cell> Vn:k`. Classes are filtered on the clienthop skeleton (`SKELETON_CLASSES`, l.1117; V18 is correctly not in it) and on the informational `zoom-200` cell. `gate.json` keeps up to 8 examples per class (l.1180–1190).
- **RED mode** (l.1057–1090): one cell is run clean, then run again with the plant.
  - **PROVED** means the plant applied and the target's delta is above 0.
  - **BLIND** means the plant applied but the delta is 0 or less.
  - **INCONCLUSIVE** means the plant did not apply.
  - Movement in other classes is printed as a collateral warning.
  - Because this is a delta rule, V18 must push **one item per (surface × missing part)**, so hiding one part always adds exactly one.

**Why V18 must read per surface.** A page-level search finds every part *outside* the markets:
- The hero trust line `home.trustCell1H` says "named sources".
- The settled strip links a source on every row (`trust-band.tsx` l.279–282).
- The proof rail prints a pool (`LandingProof`).
- The LIVE strip prints times.

So a page-level check passes while every card is missing all four. And one card's source is not another's, so nothing may be deduplicated across surfaces (unlike V16's `seen` set).

## 2 · The population on `/` and what each surface shows today

| Surface | Where | Root | Today |
|---|---|---|---|
| featured | `LandingHero` → `.kp-hero__card` → `<MarketCard featured …>` (`landing-hero.tsx` l.250–283) | `article.mcardp` (`market-card.tsx` l.618) or `Link.mcardp` (l.648) | price/state ✓, time ✓ (`.mcardp-timeleft` l.568, after the actions), pool ✓ (l.560), predictors ✓ (l.506–521), **source ✗** (`sourceUrl` is a prop, l.71, but it is not even destructured, l.239) |
| card (grid) | `page.tsx` l.328–359, `comp.grid.slice(0, LANDING_GRID_SIZE)` (= 3, `landing.ts` l.48) | same card | same as featured, **source ✗** |
| board | `LandingProof` → `.kp-qboard` → `QuestionRow` (`landing-hero.tsx` l.151–202; `QUESTION_BOARD_SIZE` = 4, `hero.ts` l.28) | `Link.kp-qrow` (l.159) | price/state ✓ (l.178–194), pool ✓ (`.kp-qrow__sub` l.177), **time ✗, predictors ✗, source ✗, no pick** (WP4 adds them) |

**Expected V18 reading once the attributes land and before WP3/WP4 are built** (derived; re-derive on the day, never quote it): 1 (featured source) + 3 (grid source) + 4×3 (board time, predictors, source) = **16 per full-book cell**, and fewer on a thin book. It reaches 0 when WP3 (featured and grid source) and WP4 (board meta, time, pick) are built. This follows the V17 precedent: V17 landed in D1 and RED-PROVED while its findings were WP6's to clear, as named on the GATE row.

## 3 · The data attributes (they change no class, style, text or geometry, so `MARKET_CARD_H` / `qa:card-geometry` and `test:design-frozen` are untouched)

**`src/components/markets/market-card.tsx`** (`MarketCard`). The card is shared across the site, but these attributes are inert.

| Line | Element | Attribute |
|---|---|---|
| 618–625 | `<article … className={cn("mcardp group", …)}>` | `data-market-surface={featured ? "featured" : "card"}` |
| 648 | `<Link data-row-id={id} … className={cn("mcardp group", …)}>` | the same |
| 420 | `<div className="mcardp-prob">` | `data-market-part={resolvedOutcome ? "state" : showPrice ? "price" : undefined}`. It goes on the wrapper, not on `.mcardp-pct`, because `one-sided.test.mts` l.140 pins `'<div className="mcardp-pct">{yesPct}'` with `indexOf`. The dash arms (l.442, l.447) stay unmarked because a dash is not a label. |
| 468 | `<span className="mcardp-oneside">` | `data-market-part="state"` |
| 490 | `{noPrice && neverBet && <div className="mcardp-nobets">` | `data-market-part="state"` |
| 508 | `<span className="t-txt mcardp-befirst">` | `data-market-part="predictors"` (a labelled zero) |
| 518 | `<span className="t-txt"><b>{predictors…}` | `data-market-part="predictors"` |
| 524 | `<div className="mcardp-actions">` (live branch only; not `--single` at l.552) | `data-market-part="pick"` |
| 560 | `<span>{fresh ? t.market.noPoolYet : formatTzs(volume)}</span>` | `data-market-part="pool"` |
| 568 | `<span className={cn("mcardp-timeleft", live && "live")}>` | `data-market-part="time"` |
| WP3 new | "Settles on {source}" line | `data-market-part="source"` on the **name** span only (from `listSources()` matched on the `sourceUrl` host, falling back to the host). If WP3 makes it a link, the attribute goes on the `<a>`, which stays a sibling of the stretched `.mcardp-open`, never inside another link (WP17), and reaches the 40px floor via `::after` (V4). |
| WP3 new | featured top-right time | `data-market-part="time"` |

**`src/components/home/landing-hero.tsx`** (`QuestionRow`)

| Line | Element | Attribute |
|---|---|---|
| 159 | `<Link … className="kp-qrow">`. After WP4, the row's root container, **not** the title link. | `data-market-surface="board" data-row-id={row.id}` |
| 177 | `<span className="kp-qrow__sub">` | `data-market-part="pool"` |
| 178 | `<span className="kp-qrow__price">` | `data-market-part={price.kind === "priced" ? "price" : undefined}` |
| 189 | `<span className="kp-qrow__unit kp-qrow__unit--label">` | `data-market-part="state"` |
| WP4 new | time (`timeLeftLabel` on `bettableUntilMs`), predictors, source name, and the YES@/NO@ pair's wrapper | `time`, `predictors`, `source`, `pick` |

**Two pins break and must be amended in the same commit** (no anchor `from:` string touches these lines; I checked `scripts/anchors/*.anchors.mjs`):
- `scripts/one-sided.test.mts` l.136: change to `/<span className="mcardp-oneside"[^>]*>\{t\.market\.oneSideOnly\}<\/span>/`
- `scripts/outcome-display.test.mts` l.227 and its control at l.237–238: change to `/\{noPrice && neverBet && <div className="mcardp-nobets"[^>]*>/`. The control still rejects the ungated form, because that string has no `neverBet`.

Optional follow-up: a predeploy static guard, for example three asserts in `test:landing-contract`, that each `data-market-part` value exists in `market-card.tsx` and `QuestionRow`. `qa:landing-ten` is not in the pipeline, so without such a guard a dropped attribute is only caught at the next gate run.

## 4 · The V18 block: insert into `CHECKS` after V17 (after l.781), before `/* ── the text map V8 needs` (l.783)

This has been compile-proven: spliced into a copy of `CHECKS`, `new Function` accepts it, the page sees `/\p{L}/u`, and there are 0 backticks and 0 `${`. Write it with a patch script made by the Write tool (§0 trap 7), not a heredoc or `node -e`. The em-dash is `String.fromCharCode(8212)`, the file's own l.1110 idiom, so no `\u` escape can be mangled.

```js
  /* ── V18 every market shows its price or state, time, pool, predictors and source (landing v3) ─
     The delivery's V18 and ACCEPTANCE K7, K36, K48: every market surface on the page (the featured
     card, each grid card, each closing-soonest board row) shows (a) a price, or a LABELLED state
     (No bets yet, One side only, No pool yet, the result word; the em-dash alone is not a label),
     (b) the time left, (c) the pool, (d) the predictors (depth: K48, and section 2.1 WP4 names V18
     for it) and (e) the named source; and the source and the price or state come BEFORE the pick
     (K36), in the DOM and on the screen.
     ⛔ READ PER SURFACE, NEVER OFF THE PAGE. The trust lines say "named sources", the settled strip
     links a source on every row, the proof rail prints a pool and the LIVE strip prints times: a
     page-level search finds all four while every card shows none of them. One card's source is not
     another's, so nothing is deduplicated across surfaces.
     ⭐ FOUND BY THE INSTRUMENTATION CONTRACT, NOT BY A CLASS OR A WORD. Each part carries
     data-market-part (price, state, time, pool, predictors, source, pick) and each surface
     data-market-surface (featured, card, board), so a WP3/WP4 rebuild that renames every class keeps
     this check, and no visible word is read (three locales). The classes widen the POPULATION only:
     .mcardp[data-row-id] and .kp-qrow are examined even when they lose the attribute, and named as
     unmarked rather than skipped. (The Up and Down card wears the .mcardp shell with no data-row-id,
     which is why the card fallback asks for one, as scripts/live/mobile-visual-drive.mjs does.)
     A part counts only when it is visible, centred inside its own surface's box (the card clips),
     and says something: a price holds a digit, a state or a source holds letters, the rest hold a
     letter or a digit. Time, pool and predictors are PRESENCE only: where they sit is K49's and the
     placement map's (V21), and the delivery's own grid card prints its pool below the pick.
     No surface at all is a finding, not a pass. */
  {
    const bad = [];
    const LETTER = /\\p{L}/u, NAME = /\\p{L}{2}/u, DIGIT = /\\d/;
    const DASH = String.fromCharCode(8212);                  // the em-dash, without an escape to mangle
    const LABEL = { featured: "the featured card", card: "a grid card", board: "a board row" };
    const says = (el) => (el.innerText || "").replace(/\\s+/g, " ").trim();
    const wordy = (t) => LETTER.test(t) || DIGIT.test(t);
    const inside = (el, box) => {
      const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      return cx >= b.left - 1 && cx <= b.right + 1 && cy >= b.top - 1 && cy <= b.bottom + 1;
    };
    const find = (s, names, test) => [...s.querySelectorAll(names.map((n) => '[data-market-part="' + n + '"]').join(","))]
      .find((el) => vis(el) && inside(el, s) && test(says(el)));
    // BEFORE = earlier in the DOM AND earlier on the screen: above the pick, or on its line and left of it.
    const follows = (el, pick) => !!(el.compareDocumentPosition(pick) & Node.DOCUMENT_POSITION_FOLLOWING);
    const before = (el, pick) => {
      if (!follows(el, pick)) return false;
      const a = el.getBoundingClientRect(), b = pick.getBoundingClientRect();
      return a.bottom <= b.top + 2 || (a.top < b.bottom && a.bottom > b.top && a.right <= b.left + 2);
    };
    const surfaces = [...document.querySelectorAll("[data-market-surface], .mcardp[data-row-id], .kp-qrow")].filter(vis);
    const examined = {};
    for (const s of surfaces) {
      const kind = s.getAttribute("data-market-surface") || "unmarked";
      const who = LABEL[kind] || "an unmarked market surface";
      examined[kind] = (examined[kind] || 0) + 1;
      const where = kind + " " + (s.getAttribute("data-row-id") || sel(s)) + ' "' + textOf(s).slice(0, 40) + '"';
      if (!LABEL[kind]) bad.push({ what: "a market surface carries no known data-market-surface", measured: JSON.stringify(kind) + " on " + sel(s), where });
      const shown = find(s, ["price"], (t) => DIGIT.test(t)) || find(s, ["state"], (t) => LETTER.test(t));
      if (!shown) {
        const dash = [...s.querySelectorAll("*")].some((e) => !e.children.length && (e.textContent || "").trim() === DASH && vis(e));
        bad.push({ what: who + " shows neither a price nor a labelled state", measured: dash ? "an em-dash with no label" : "0 visible price or state", where });
      }
      for (const [p, name] of [["time", "time left"], ["pool", "pool"], ["predictors", "predictor count"]]) {
        if (!find(s, [p], wordy)) bad.push({ what: who + " shows no " + name, measured: "0 visible [data-market-part=" + p + "]", where });
      }
      const src = find(s, ["source"], (t) => NAME.test(t));
      if (!src) bad.push({ what: who + " names no source", measured: "0 visible [data-market-part=source]", where });
      const pick = [...s.querySelectorAll('[data-market-part="pick"], .btn-yes, .btn-no')].find(vis);
      if (!pick) continue;                                   // a closed market takes no pick: nothing can follow one
      for (const [el, name] of [[shown, "its price or state"], [src, "its source"]]) {
        if (!el || before(el, pick)) continue;
        const a = el.getBoundingClientRect(), b = pick.getBoundingClientRect();
        bad.push({ what: who + " shows " + name + " after the pick",
          measured: "top " + Math.round(a.top) + " vs the pick's " + Math.round(b.top) + (follows(el, pick) ? "" : ", and later in the DOM"), where });
      }
    }
    if (!surfaces.length) bad.push({ what: "no market surface on the page", measured: "0 visible [data-market-surface], .mcardp[data-row-id], .kp-qrow", where: "document" });
    push("V18", bad);
    V[V.length - 1].examined = examined;
  }
```

Notes:
- `.btn-yes/.btn-no` is the pick fallback: stable design-system classes that `test:contrast` pins.
- The nojs cells will report "no market surface", the same as V14/V15 already do there (R4(8)).
- V18 does not move under any existing RED plant, except V14's hero-hide, which *lowers* it (a collateral warning, not a failure).

## 5 · REDS.V18 plus the `RED_PART` switch

Add at module level, after l.50 (`const RED_MODE = …`):

```js
// V18's plant takes ONE part away from ONE surface; RED_PART names it (default "source"). One plant
// proves only the branch it removes, so each part is its own run (scripts/qa/landing-v3/verify-*.sh).
const RED_PARTS = ["source", "price", "time", "pool", "predictors", "order"];
const RED_PART = process.env.RED_PART || "source";
if (RED === "V18" && !RED_PARTS.includes(RED_PART)) { console.error(`RED_PART must be one of: ${RED_PARTS.join(" ")}`); process.exit(2); }
const RED_TAG = RED === "V18" ? `V18-${RED_PART}` : RED;
```

Use `RED_TAG` in the header (l.1045), in `RED ${…} on` (l.1072) and in `red-${…}.json` (l.1088), so the six V18 runs don't overwrite each other.

Append to `REDS` after `V17` (l.943, before `};` at l.944). This is also compile-proven:

```js
  // landing v3 — V18: take ONE part away from ONE surface, the featured card first (it is on every cell
  // with a market). RED_PART picks the part: source (default) · price (price AND state, since either
  // passes) · time · pool · predictors · order (every source part moved after the pick). EVERY element
  // of that part in the surface goes: WP3 gives the featured card a top-right time AND keeps the meta
  // row's, and hiding one copy would leave the part on screen and read as BLIND when the check is not.
  V18: `(() => { const PART = ${JSON.stringify(RED_PART)};
        const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05; };
        const names = PART === "price" ? ["price", "state"] : [PART === "order" ? "source" : PART];
        const q = names.map((n) => '[data-market-part="' + n + '"]').join(",");
        const surfaces = [...new Set(document.querySelectorAll("[data-market-surface], .mcardp[data-row-id], .kp-qrow"))].filter(vis);
        surfaces.sort((a, b) => (b.getAttribute("data-market-surface") === "featured") - (a.getAttribute("data-market-surface") === "featured"));
        for (const s of surfaces) {
          const parts = [...s.querySelectorAll(q)].filter((el) => vis(el) && (el.innerText || "").trim());
          if (!parts.length) continue;
          const on = (s.getAttribute("data-market-surface") || "unmarked") + " " + (s.getAttribute("data-row-id") || "");
          if (PART === "order") {
            const pick = [...s.querySelectorAll('[data-market-part="pick"], .btn-yes, .btn-no')].find(vis);
            if (!pick) continue;
            for (const el of parts) pick.after(el);
            return { applied: parts.every((el) => !!(pick.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)),
              note: "moved " + parts.length + " source part(s) after the pick on " + on };
          }
          for (const el of parts) el.style.setProperty("display", "none", "important");
          return { applied: parts.every((el) => !vis(el)), note: "hid " + parts.length + " [data-market-part=" + names.join("|") + "] on " + on };
        }
        return { applied: false, note: "no visible surface shows a " + names.join("/") + " part" + (PART === "order" ? " and a pick" : "") }; })()`,
```

**What can be proved, and when:**
- `price`, `time`, `pool` and `predictors` can reach PROVED as soon as the §3 attributes land.
- Run `price` on a **priced** featured card (WP6 drive phase 2) *and* on a **one-sided** one (phase 1), so both the price arm and the state arm are proved.
- `source` and `order` are **INCONCLUSIVE until WP3** builds the source line. That is the correct verdict: a plant cannot prove anything against a feature that does not exist yet (§2.0).
- `time` hides the info button inside `.mcardp-timeleft`. V4/V9 move only if that button already had a finding, and that shows as a collateral warning.

Driver loop, replacing/extending `verify-local.sh` l.60–64, `verify-prod.sh` l.34–38 and `verify-wp6.sh` l.73–77:

```bash
for P in price time pool predictors source order; do
  say "RED V18 ($P) on base-360-sw"
  RED_PART=$P RED=V18 BASE="$BASE" node scripts/qa/landing-ten.mjs --red --cell=base-360-sw > "$OUT/red-V18-$P.txt" 2>&1
  grep -E "PROVED|BLIND|INCONCLUSIVE" "$OUT/red-V18-$P.txt" | tail -1 | tee -a "$LOG"
done
```

## 6 · Docs (`docs/LANDING-TEN.md`)

**Class table** ("What the classes are", after the V17 row at l.513):

```
| V18 | Market completeness (v3) | per market surface on `/` — the featured card, each grid card, each closing-soonest board row (`[data-market-surface]`; `.mcardp[data-row-id]` and `.kp-qrow` widen the population so an unmarked surface is named, never skipped): a visible price holding a digit, or a labelled state holding words (the em-dash alone fails), the time left, the pool, the predictor count and the named source, each a `[data-market-part]` centred inside its own surface; the source and the price or state before the pick (`[data-market-part="pick"]`) in the DOM and on the screen. Read per surface, never off the page — the trust lines, the settled strip and the proof rail carry every part too. No surface at all is a finding. RED removes one part (`RED_PART` = source · price · time · pool · predictors · order) |
```

Other doc edits:
- **§2.1 "V15–V21":** add a bullet: "V18 reads per surface through `data-market-part` / `data-market-surface` (the part table lives in the V18 block's comment); each part is its own RED run (`RED_PART`)".
- **§3 K36:** add `V18` to its rows. The order rule is K36's gate. `test:landing-ten-plan` accepts it because V18 is an §1 id.
- **"Running it":** add `RED_PART=time RED=V18 node scripts/qa/landing-ten.mjs --red --cell=base-360-sw` and `node scripts/qa/landing-ten.mjs --compile` (§8).
- **"Known gaps"** (l.523, "the gate reads no price"): now stale, since V17 and V18 read prices. Rewrite it.
- **§1 V18:** 🔨 with the attribute and gate commit, 🔵 when live, ✅ only after WP3 and WP4 bring it to 0 on production with every `RED_PART` PROVED. `NEXT-PLAN.md` ▶ 0b's count moves with it.
- **GATE row:** name V18's count as "WP3's and WP4's to clear" until then.

## 7 · Real defects V18 will surface (the gate reads presence, not truth)

- **A cashed-out, empty LIVE card has no visible label.** When `noPrice && !neverBet` (pool 0, predictors ≥ 1), the card shows the dash (l.442), a rail whose "No pool yet" is aria-only (`TippingBar` empty branch, `brand.tsx` l.295–305), and "TZS 0". V18 reports "an em-dash with no label".
  - Truthful fix, with no pin churn: add a sibling line `{noPrice && !neverBet && <div className="mcardp-nobets" data-market-part="state">{t.market.noPoolYet}</div>}`. It is an existing key, the rail already carries that name, and the row matches a never-bet card's height. Re-run `qa:card-geometry`.
  - Owner: WP3/WP6.
- **For WP4** (V18 can't see this): `QuestionRow` l.190 prints `t.home.heroNoPrice` ("No bets yet") for every `none` pool, including a cashed-out one. That is the D29 false absence, one surface over. It should use `row.predictors === 0 ? t.home.heroNoPrice : t.market.noPoolYet`, and `one-sided.test.mts` §4.3's regex has to be amended with it.
- **A market with no `sourceUrl`.** The schema allows it (`PredictionMarket.sourceUrl String?`, schema l.1538, "required at app layer"). Such a card fails V18(e), and that is correct under K7. WP3 must not invent a fallback source.

## 8 · The single-cell crash at `landing-ten.mjs:1046`: cause and fixes

**What actually failed.** The log is `.qa-shots/landing-v3/wp6-local/gate-p1-360-sw.txt`, from the `8e4055c3` version of `verify-wp6.sh`, l.56–58. That step no longer exists at HEAD.
- The error is `browserType.launch: Malformed arrow function parameter list`, `name: 'SyntaxError'`.
- The call log shows Chromium launched (pid 12544) and then was closed cleanly.
- So the SyntaxError was thrown inside Playwright's in-process server during `launch`. The `:1046:32` location is just Playwright rewriting the stack to the place the API was called from, not where the error started.

**`--cell` is not involved.**
- `buildCells` l.108 only filters strings. It ran successfully, since the log printed "gate: 1 cells".
- No cell value is ever evaluated as code. `page.evaluate` only receives the fixed `CHECKS`/`REDS` strings and numbers (`scrollTo(0, v)`).
- Up to l.1046, the non-RED single-cell path is identical to the RED path.

**Evidence the gate itself is sound:**
- `node --check scripts/qa/landing-ten.mjs` exits 0.
- `CHECKS` (40,621 chars) and all 17 `REDS` compile under `new Function`.
- The same `chromium.launch({ headless: true })` (in `capture.mjs` l.66) succeeded in 9 captures just before the failure (00:55:22–00:56:54 UTC) and 27 just after it (00:56:56–00:59:59 UTC; `verify.log`).

**Cause: the machine.** Windows System log:
- Bugcheck **0x1A MEMORY_MANAGEMENT (0x41792)**, reboot recorded 04:01 EAT on 2026-09-27, dump `C:\WINDOWS\Minidump\092726-15296-01.dmp`.
- The SyntaxError happened at 03:56:54 EAT.
- After it, `gate-base.txt` is its one header line followed by **NUL bytes**, and `verify.log` has no `gate exit` line, no cleanup line and no `verify.done`. The EXIT trap never ran, which is what an OS dying mid-write looks like.
- Two more bugchecks on 2026-09-26: 0x1A at 15:26 and 0x3B at 20:18.
- This is the known failing RAM on ALI-BLADE15. A V8 parse error in library code that parses fine on disk, one second into a launch, is consistent with corrupted memory under a lazily compiled function. **No `--cell` change fixes it.** Re-run it (and restore the phase-1 single-cell gate in `verify-wp6.sh`: the one-sided *featured* card has never been measured by the gate, only captured).

**Defects found while tracing it. Fix these:**
1. **A filter that matches nothing reports GATE GREEN.** With 0 cells, l.1168–1213 print "TOTAL 0 violations; 0 cells unmeasured", "GATE GREEN" and exit 0. A typo'd `--cell`/`--pass` certifies a page that was never loaded.
2. **A bare `--cell base-360-sw`** (no `=`) is silently ignored and runs the whole pass.
3. **An uncaught launch failure exits 1**, the same code as "GATE RED". That is how `verify-wp6.sh` logged `phase-1 gate exit=1`.
4. **`--red` without `--cell`** silently uses `cells[0]`.

Code for these. At module level, beside `ONLY_PASS` (l.48), and delete the local `const ONLY_CELL` at l.108:

```js
const ONLY_CELL = (process.argv.find((a) => a.startsWith("--cell=")) || "").split("=")[1] || null;
for (const bare of ["--cell", "--pass"]) {
  if (process.argv.includes(bare)) { console.error(`${bare} takes its value after "=" (${bare}=<id>); a bare ${bare} is ignored and the whole matrix would run`); process.exit(2); }
}
```

Replace l.1044–1046:

```js
const cells = buildCells();
// ⛔ A FILTER THAT MATCHES NOTHING MEASURES NOTHING, AND NOTHING IS NOT GREEN. With zero cells the
//    summary reads TOTAL 0, 0 unmeasured, "GATE GREEN", exit 0 — a typo'd --cell certified the page.
if (!cells.length) {
  console.error(`⛔ no cell matches${ONLY_CELL ? ` --cell=${ONLY_CELL}` : ""}${ONLY_PASS ? ` --pass=${ONLY_PASS}` : ""}. Nothing was measured.`);
  process.exit(2);
}
if (RED_MODE && cells.length !== 1) { console.error(`--red measures ONE cell: pass --cell=<id> (${cells.length} selected)`); process.exit(2); }
console.log(`gate: ${cells.length} cells against ${BASE}${RED_MODE ? `  [RED CONTROL: ${RED_TAG}]` : ""}`);
/* ⛔ AN INSTRUMENT THAT DID NOT START IS NOT A RED GATE. 2026-09-27: the WP6 drive's phase-1 gate died in
   browserType.launch with a SyntaxError thrown inside Playwright; the same launch worked in the captures
   either side of it and the machine bugchecked 0x1A four minutes later. Uncaught, that is exit 1, the
   code a driver reads as GATE RED. One retry, then exit 2, the gate's own "could not measure" code. */
let browser = null;
for (let attempt = 1; !browser; attempt++) {
  try { browser = await chromium.launch({ headless: true }); }
  catch (e) {
    const why = String((e && e.message) || e).split(String.fromCharCode(10))[0];
    if (attempt >= 2) { console.error(`⛔ INSTRUMENT: chromium did not launch (${why}). Nothing was measured; this is not a gate result.`); process.exit(2); }
    console.error(`⚠️ chromium launch failed (${why}); one retry`);
  }
}
```

Optional, and cheap on this machine: a no-browser self-test, placed right after `REDS` (l.944):

```js
if (process.argv.includes("--compile")) {
  new Function("return " + CHECKS);
  for (const v of Object.values(REDS)) new Function("return " + v);
  console.log(`compiled CHECKS (${CHECKS.length} chars) and ${Object.keys(REDS).length} RED plants`);
  process.exit(0);
}
```

## 9 · Order of work and verification

1. **Commit A (D2, now):**
   - §3 attributes on the card and the current row, plus the two pin amendments.
   - The §4 block, §5 REDS/`RED_PART`/`RED_TAG`, the §8 hardening, and the §6 docs.
   - Run `node scripts/qa/landing-ten.mjs --compile`, then `test:one-sided`, `red:one-sided`, `test:outcome` and `test:landing-ten-plan`.
   - Under the heavy-node lock: `verify-wp6.sh`. The gate base pass should show V18 at the derived per-cell count (§2), `examined` in `gate.json` should read `{featured:1, card:3, board:4}` on a full book, and the RED runs `price` (phase 1 and phase 2), `time`, `pool` and `predictors` should be **PROVED**, with `source`/`order` **INCONCLUSIVE**.
2. **WP3:** the source line on the featured card (plus top-right time) and on grid cards (landing-only prop). RED `source` and `order` become PROVED, and the card rows of V18 reach 0.
3. **WP4:** the board row's root container gets the surface attribute; time, predictors, source and pick are added. V18 reaches 0 on production at 360/768/1280 × sw/en/zh, the frames are looked at, and V18 turns ✅.

Scratch proof of the compile check (not repo files): `C:\Users\Ali\AppData\Local\Temp\claude\C--Users-Ali\ec5dbdc6-0d3a-4f6b-a5d7-28a9dddf646a\scratchpad\compile-v18.mjs`, `v18-block.txt`, `v18-red.txt`.

**No new session is needed for this.** The spec fits the current build session's D2 batch.

---

# WP14b + share: what is left, build spec

Read at `3d6cdb67` (branch `landing-v3`). Line numbers are for that commit.

## 0 · Verdict

1. **Card-footer share on the landing is done. Nothing to build.** The featured card and every grid card render it. The concept puts no share on board rows, so WP4 must not add one.
2. **"Share on WhatsApp" after placing can't come before D3.** It needs the pick slip's placed state (WP5). WP5's own row already names it ("…after-placing share", LANDING-TEN.md:99). So WP14b closes in D2 with a narrower unit, and K50 stays open until WP5 is ✅.
3. **D2 still owes four things, plus one I recommend:**
   - **(A)** The market page writes a bare `openGraph` object. This breaks the ROOT_OPEN_GRAPH law, on the one page every share links to.
   - **(B)** The WhatsApp preview's image and description still print 0/100 on one-sided markets, and an invented 50/50 on markets with no bets.
   - **(C)** A guard for A and B.
   - **(D)** A production check for the preview.
   - **(E, recommended)** On every card whose betting has closed (`/results`, `/watchlist`, closed cards on `/markets`), the card share is broken, and it is a control inside a link. This is sitewide.

## 1 · Card-footer share: present?

- **The card.** `src/components/markets/market-card.tsx`, footer at :592–609. `<ShareButton compact marketId={id} title={title} />` is at :593, left of Details, and renders regardless of `featured`.
- **The landing call sites.** Featured: `src/components/home/landing-hero.tsx:252–282`. Grid: `src/app/page.tsx:332–356`. Both pass `status="LIVE"` plus `selectionClosed`.
- **The landing only seats open markets.** `landingGrid` filters with `matchesStatus(r,"open")` (`src/lib/markets/landing.ts:123`). `heroFigures` does the same (`src/lib/markets/hero.ts:81`). So every landing card takes the live branch:
  - an `<article>` with a stretched `<Link className="mcardp-open">` (:620–645);
  - share is a sibling of that link, not inside it;
  - share is raised by `.mcardp > .mcardp-foot { z-index: 3 }` (`src/app/globals.css:6084–6087`, over `.mcardp-open` z-index 2 at :6077–6082).
- **Nothing hides the featured footer.** `.mcardp--featured` (globals.css:3893) and `.kp-hero__card` (:4002) don't touch it.
- **Guards.** Pinned by `test:card-share` §1–§6 and `red:card-share`. Hit-tested on production by `qa:card-share-glow` (`scripts/live-card-share-glow.mjs`).
- **Board rows.** The concept puts none on them: its board section (lines 251–300) has only the placed line at :297. Share appears only on the featured footer (:207) and the grid footer (:368). `QuestionRow` (`landing-hero.tsx:151`) has none. **WP4 builds none.**
- **A conflict to record, not a gap.** The concept prints the word "Share" (concept :207 and :368; HANDOVER:133 "Keys: `common.share`"). The repo ships an icon-only glyph:
  - Ali, 2026-08-25: "a tiny share icon … not very bulky".
  - The footer row paints 17px and `MARKET_CARD_H` is derived from it (`card-share.test.mts` §3).
  - It is named by `aria-label={t.dialog.shareMarket}` (`share-button.tsx:94`).
  - Record this as INHERIT-MANIFEST **L24** (§7).

## 2 · After placing: move to D3

- Nothing places from the landing yet (WP5 ⬜). The detail page's bet flow (`conviction-dial.tsx` ~:939–1080) has no share after placing either.
- R2 (INHERIT-MANIFEST:39) reads "After placing: 'You're with X%…' plus Share on WhatsApp." It is part of the slip ruling, so it can't close before the slip exists.
- **Tracker:** keep the `WP14b` id (`landing-ten-plan` IDS needs no change) and narrow its unit (§7). The after-placing half is already in WP5's unit.

## 3 · The preview card (K50)

### 3a · The market page does not spread `ROOT_OPEN_GRAPH`, and must

- `src/app/markets/[id]/page.tsx` `generateMetadata` (:58–102) sets `openGraph: { title, description, images }` (:90–94), with no spread and no import.
- Next merges `metadata` per field (layout.tsx:90–98), so every market page emits **no** og:type, og:site_name, og:locale or og:locale:alternate. This is the exact shape LANDING-TEN.md:574–580 forbids, and it's the page every share links to.
- The other five routes spread it: `/`, `/results`, `/leaderboard`, `/proposals`, `/auth/register`.
- **Nothing guards the law.** `grep ROOT_OPEN_GRAPH scripts` finds nothing.
- **Build:** `import { ROOT_OPEN_GRAPH } from "../../layout"`, then `openGraph: { ...ROOT_OPEN_GRAPH, title, description: desc, images: [{ url: ogImage, width: 1200, height: 630 }] }`, plus the one-line "⛔ Never write a bare `openGraph` object here" comment the sibling routes carry.
- **Do not add `url`.** A win link carries `?w=`. Scrapers that follow og:url (Facebook) would fetch the plain market URL and lose the win card.

### 3b · Price truth in the preview: yes, apply WP6's rule now

- **`/api/og/market/[id]` is display-only.** `src/app/api/og/market/[id]/route.tsx`, GET :42–204. Its only consumers are `<meta og:image>` and crawlers, and nothing on a money path reads it.
- **What it does today:** `const yes = impliedYesPct(m)` (:49). `impliedYesPct` returns **50 for an empty pool** and a raw `Math.round` otherwise (`market-service.ts:344–348`). So:
  - one-sided markets print "YES 100% · leans yes · 0% NO" (:169–187);
  - lopsided two-sided markets can print 100/0;
  - markets with no bets print "YES 50% · tipping · 50% NO", an invented crowd price (the D29 class).
- **The description has the same problem.** `generateMetadata`'s `yes = shownYesPct(...) ?? impliedYesPct(m)` (:68) feeds `desc` at :80, which is og:description, twitter:description and meta description. On one-sided and empty markets it reads "YES 100% · NO 0%" or "YES 50% · NO 50%". The WhatsApp preview is exactly og:title + og:description + og:image.
- **The helper is safe to import there.** `price-state.ts` has no imports and no "use client" (:23–25), so a nodejs route can use it.
- **Build: a new pure helper**, `src/lib/markets/share-preview.ts`:
  - Relative imports only: `./price-state` and `../i18n-dict` (i18n-dict.ts has no directive; `dict` is exported at :29).
  - `sharePreviewPrice(yesPool, noPool, predictorCount)` returns one of:
    - `{kind:"priced", yesPct, noPct: 100-yesPct, lean}`. yesPct comes from `priceState` (1–99), and the lean rule moves here from route :185.
    - `{kind:"oneSided", label: dict.en.market.oneSideOnly}`.
    - `{kind:"none", label: predictorCount===0 ? dict.en.market.noBetsYet : dict.en.market.noPoolYet}`. This is the card's `neverBet` rule (market-card.tsx:319, :489).
  - `sharePreviewDescription(p)` returns "YES 62% · NO 38%. Predict on 50pick." / "One side only. Predict on 50pick." / "No bets yet. Predict on 50pick."
  - English is kept on purpose: the preview is English by the page's own comment (:86–87).
- **Route changes:**
  - Drop the `impliedYesPct` import (:18).
  - Priced: two segments as today.
  - One-sided or none: a single `C.track` rail with a dashed border and one centred label, with no % and no lean word. Hex is allowed: `design-frozen` skips `src/app/api/` (design-frozen.test.mts:490), and Satori can't parse oklch (route :8–11). If Satori draws the dash solid, use the plain track and confirm by eye.
  - **Don't put the refund sentence in the image.** Its phase logic (L22) lives in the card (market-card.tsx:353), and a second copy would repeat E-196.
- **`generateMetadata` changes:** replace :68 and the non-win arm of :80 with the helper. Image and description then come from one rule and can't disagree (B6).
- **Re-routing:** move the detail page's "metadata" and "`/api/og/market`" out of U32's list, in the same commit as the code (§7). The bar, side picker, JSON-LD (page.tsx:150, :430), callout, `/live` and `/results` featured all stay with U32.
- **Follow-up, not built:** a resolved market's image shows the closing split and a lean, not the outcome. Route it to U32.

### 3c · Guard (C)

**`scripts/share-preview.test.mts`** (`test:share-preview`). Add it to `test:all` and `predeploy` next to `test:one-sided`.

- **§1 Spread law.** For every `src/app/**/*.{ts,tsx}` (decommented), every `openGraph:` other than layout's `openGraph: ROOT_OPEN_GRAPH` must be a literal whose first member is `...ROOT_OPEN_GRAPH`.
  - Positive control: `markets/[id]/page.tsx` must be among the files matched.
  - In-memory plant: a bare object must fail.
  - Print the census; don't hardcode the count.
- **§2 Behaviour, from fixtures:**
  - (0,0,0) → none / "No bets yet"; (0,0,3) → none / "No pool yet".
  - (5000,0) and (0,5000) → oneSided.
  - (25000,100) → 99/1; (100,25000) → 1/99; (199,1) → 99/1.
  - (5000,5000) → 50 "tipping".
  - No description matches `/\b(?:0|100)%/`; one-sided and none descriptions contain no `%`.
  - Control: `impliedYesPct({yesPool:25000,noPool:100})===100`.
- **§3 Wiring.** The route imports `sharePreviewPrice` and has no `impliedYesPct`. `generateMetadata` calls `sharePreviewDescription`.

**`scripts/share-preview-red.mjs`**, with plants in `scripts/anchors/share-preview.anchors.mjs` (audited by `test:red-anchors`, single-line anchors, CRLF tree). Each plant must fail its own assertion:

1. Remove `...ROOT_OPEN_GRAPH,` from page.tsx.
2. Restore `impliedYesPct(m)` in the route.
3. Drop the 1–99 clamp.
4. Return `priced` for a one-sided pool.
5. Positive control: delete the page's `openGraph`.

Run it alone; it writes the tree.

### 3d · Production check (D): `scripts/qa/landing-v3/og-prod.mjs`

It uses fetch only: no browser, no dev server. Add it as `qa:landing-v3:og-prod` and call it from `verify-prod.sh` after the gate.

- **The UA matters.** Use `WhatsApp/2.23.20.0 A`. Next 16.2.4 streams metadata into the body for ordinary UAs, but blocks it into `<head>` for UAs matching `HTML_LIMITED_BOT_UA_RE`, which includes `WhatsApp` (`node_modules/next/dist/shared/lib/router/utils/html-bots.js:15`). A default-UA curl can see a different document from the one WhatsApp gets. Record one desktop-Chrome read as information only.
- **Which markets.** Collect ids from `GET /`: `data-row-id="…"` (featured and grid) plus `href="/markets/<id>"` (board rows), plus 2 `data-row-id` from `/results`. Get each card's state from its own markup slice: `mcardp-oneside` → one-sided; `mcardp-pct--empty` → none; otherwise priced.
- **Per market page** (`/markets/<id>`): expect 200. Parse og tags **only before `</head>`** and check:
  - exactly one `og:image` equal to `https://www.50pick.tz/api/og/market/<id>` (metadataBase is `appUrl()`, app-url.ts:17);
  - `og:image:width` 1200 and `og:image:height` 630;
  - `og:type` = website, `og:site_name` = 50pick, `og:locale` = sw_TZ;
  - `twitter:image` is the same URL;
  - `og:description` doesn't match `/\b(?:0|100)%/`, and has no `%` at all when one-sided or none.
- **Per image:**
  - 200 and `content-type: image/png`;
  - PNG signature bytes `89 50 4E 47 0D 0A 1A 0A`;
  - IHDR `readUInt32BE(16)` = 1200 and `readUInt32BE(20)` = 630;
  - size recorded; flag under 5 KB (blank) or over 300 KB (WhatsApp is widely reported to drop large previews, so treat it as "look at it", not a proven failure);
  - `cache-control` recorded (expect `max-age=0`, `image-response.js:39`);
  - save to `.qa-shots/landing-v3/<label>/og/<state>-<id>.png` and look at one of each state.
- **Controls:**
  - `/api/og/market/nonexistent` → 404 and `/markets/nonexistent` → 404.
  - **Run a baseline against today's production before the D2 push.** It should fail on og:type/site_name/locale for every market and on og:description for one-sided markets. If the check can't fail today, it proves nothing.
- **Tracker one-liner:**
  ```
  UA='WhatsApp/2.23.20.0 A'; B=https://www.50pick.tz; ID=<id>
  curl -s -A "$UA" "$B/markets/$ID" | grep -o '<head[ >].*</head>' | grep -o '<meta property="og:[^>]*>'
  curl -s -A "$UA" -o og.png -w '%{http_code} %{content_type} %{size_download}\n' "$B/api/og/market/$ID"
  ```
- **The seen half of K50** is one priced and one one-sided link pasted into a WhatsApp chat on Ali's handset (DEV row). The fetch check proves the inputs, not the render.

## 4 · Link builders and WhatsApp keys

- **`ShareButton`** (`src/components/markets/share-button.tsx`) builds its link from `window.location.origin + /markets/${marketId}` (:58).
  - `?ref=` is added only when `refCode` is passed (:59). The card passes none (:42–46; the open decision is PLAYER-INVITE-UNPAID §11).
  - Text is `t.market.shareText` "{title} — predict on 50pick" (i18n-dict.ts:1181 / sw :3696 / zh :5896).
  - The WhatsApp link `waLink` is built at :61; the dialog's WhatsApp tile is :141–160, with the literal label "WhatsApp" plus `t.dialog.sendToChat`.
- **Correction to the brief.** `test:card-share` does **not** allow only `share-button.tsx`. §2 (:60–93) asserts that share-button.tsx is *among* the market-link builders, and that `market-card.tsx` builds none. It rejects a headcount on purpose (:76–89).
  - Today two files match the scan: `share-button.tsx` and `position-share.tsx` (grep at this commit).
  - So a slip file that built its own wa.me link would pass today.
- **No WhatsApp-specific share exists.** There is no `common.shareWhatsApp` key.
  - Existing keys: `common.share` (en :78, sw :2825, zh :5027); `share.{sharePick, shareWin, pickedText, wonText}` (en :1683–1690, sw :4097–4104, zh :6295–6302).
  - **`PositionShare`** (`position-share.tsx`) already shares "the market and the side" through `t.share.pickedText` (:75), which is side plus title, with no stake or payout. But it tries the system share sheet first (:91–95) and falls back to WhatsApp only after that (:98).

## 5 · D2 build order for WP14b

A–D touch no file that WP3, WP4 or WP9 edit. E touches only `market-card.tsx` :574–651, so any order works.

1. **A + B + C** in one commit: page.tsx metadata, the route, `share-preview.ts`, `test:share-preview` / `red:share-preview`, and the tracker edits from §7.
2. **E (recommended), the card share on closed and resolved cards.**
   - **The defect.** Closed and resolved cards render `<Link data-row-id … className="mcardp …">{body}</Link>` (:648), and `body` includes ShareButton's `<button>` (:593). That is a button inside an anchor.
   - The dialog is a portal (`modal.tsx:311`; scrim `onClick` at :334 doesn't stop propagation). React bubbles its clicks to that Link, whose `onClick` (`next/dist/client/app-dir/link.js:300–322` → `linkClicked` :53–72) calls `preventDefault` and navigates.
   - Result: WhatsApp and Copy never happen, and dismissing the dialog navigates away. This is S07-results-01 (MOBILE-VISUAL-FINDINGS:2451–2456, still unverified and unrouted), plus the nested-control half of S07-results-26 (:2654–2658).
   - **Build:**
     - One return for all phases: `<article data-row-id className=… style={{cursor:"pointer"}}>` + `<Link className="mcardp-open" aria-label={title} onClick={navigating}/>` + `{body}`.
     - The footer's Details becomes the real `<Link className="mcardp-details">` in every phase. A raised `<span>` would swallow the click.
     - Update the comment at :574–576.
     - Re-point `scripts/live/kyc-at-withdrawal-prod.mjs:200`, which selects `a[data-row-id]`.
   - **Guard:** add `test:card-share` §7 ("no branch wraps `{body}` in a Link; exactly one `mcardp-open`"), plus a `red:card-share` plant that restores the old branch.
   - **Drives:**
     - Local `/results`: open the share, press Copy, and check the URL stays `/results` with the toast; press the WhatsApp tile and check a wa.me popup opens with the URL unchanged; Esc and the scrim leave the URL unchanged.
     - Then `qa:card-geometry` and the D2 re-shoots of `/markets`, `/results` and `/watchlist`.
   - This is the literal WP14b unit, in D2's own sitewide file, and D2 already re-shoots `/results`. If it isn't built, WP14b's note must say "card share certified on live cards only", and it stays with S07-results-01.
3. **D:** the baseline run before the push, then after `?dpl=<sha>` confirms the deploy. WP14b turns ✅ when D is clean and the frames are looked at.

## 6 · D3 (WP5): the WhatsApp share after placing

- **Where.** On every placed line: featured card, grid card, board row and bottom sheet. R2 is generic and beats the concept, which draws the link only on the featured card (concept :206, versus :297 and :367 without it).
- **Build it in `PositionShare`, not a new component** (E-196):
  - Add `channel?: "any"|"whatsapp"` (default "any" = today's behaviour) and `look?: "pill"|"link"`.
  - For a pick with `channel="whatsapp"`, render a real `<a href="https://wa.me/?text=…" target="_blank" rel="noopener noreferrer">`, built synchronously; the pick path needs no server call (:71–76).
  - A label that says WhatsApp must open WhatsApp, not the system sheet.
  - A synchronous link also avoids Safari blocking `window.open` after an `await`.
  - Text: `t.share.pickedText`. URL: `/markets/{id}`, with no `?side` and no `?ref`.
- **Key: `share.shareWhatsApp`.**
  - en "Share on WhatsApp"; sw "Shiriki kwenye WhatsApp" (the delivery draft had "Shiriki WhatsApp", i18n-draft.json:139); zh "分享到 WhatsApp" (:255).
  - sw and zh carry `// drafted, marked for native review; English is binding.`
  - Record that HANDOVER's `common.shareWhatsApp` maps to it. The "→" is a glyph, not part of the string.
- **Style.** A `globals.css` class using `min-height: var(--tap-min)` (:310), not a new `h-[40px]`.
- **Stacking.** Inside a live card, the placed row must be a direct child of `.mcardp` and join the z-index 3 list (globals.css:6084–6087). Otherwise `.mcardp-open` covers it: visible, named and unclickable (the E-218 trap, card-share.test.mts:117–123).
- **"You're with X%".** Compute it from the post-place pools through `priceState`:
  - two-sided: 1–99;
  - one-sided after the player's own stake: no % and the one-sided note instead. Otherwise the line prints the 100 that V17 exists to stop.
- **Guards:**
  - Tighten `card-share` §2 to an exact allowlist {share-button.tsx, position-share.tsx}.
  - The slip passes no `won` or `payout`.
  - `share.pickedText` in all three languages has no `{amount}`, `{stake}` or `{payout}`.

## 7 · Tracker edits (in the same commit as step 1)

- **§1 WP14b row** (LANDING-TEN.md:110): unit → "Share on every card footer, every phase + the WhatsApp preview card (market og:image, og tags spread from ROOT_OPEN_GRAPH, no 0/100 in the preview)". Note → "after placing → WP5 (D3), whose unit carries it; K50 closes only with both".
- **§2.1 WP14b paragraph** (:339–340): rewrite it to §5 above. The current "What is added: … after placing" names the wrong remainder.
- **§2.1 WP6** "NOT this row's" list (:264–266) **and** MOBILE-VISUAL-PLAN.md:1439–1442: drop "metadata" and "`/api/og/market`" ("moved to landing v3 WP14b").
- **§3 K50** (:440): "card share + preview card: WP14b (D2), each og:image read on production by `qa:landing-v3:og-prod`; after placing: WP5 (D3); ticks when both are ✅". P13 (:388) is unchanged.
- **INHERIT-MANIFEST:** add **L24** (the word "Share" versus the compact glyph, Ali 2026-08-25, `MARKET_CARD_H`, `test:card-share` §3). Add **Q2** (below).
- **If E ships:** mark S07-results-01 and S07-results-26 (nested half) as delivered by WP14b.
- **Aside:** §1 still shows WP6 ⬜ although its build commits (`8e4055c3`, `3d6cdb67`) are on the branch. The WP6 session should set it to 🔨.

## 8 · Questions for Ali (for the tracker)

1. **Preview language.** Og:title and og:description are English (page.tsx:86–88). Once spread, og:locale will say `sw_TZ`, and the shared message is in the sharer's language. (a) Keep English (the build's default), or (b) use the Swahili title (`titleSw`, what a visitor with no cookie sees).

No other product calls are needed. `?ref=` on shares stays with the existing PLAYER-INVITE-UNPAID §11 decision.

## 9 · Session

No new session is needed for WP14b's D2 half. A–D are light. E adds one local Playwright drive, run through `~/heavy-node-lock.sh`. **Start a new session at D3** (WP5 + the WhatsApp share): the slip is the largest unit left and it touches the bet path.

---

# D2 · completeness critique

I read everything at `C:\kipindi-landing-v3` (HEAD `3d6cdb67`) and did not edit, build or run anything. Line numbers are from that HEAD.

## (1) ACCEPTANCE items assigned to WP3/WP4/WP9/WP14b/V18 that no spec fully delivers

These are the §3 rows that name these five. P8, P11, P12, P13, K7, K15, K18, K22, K36, K44, K46, K47, K48, K49, K50, K52 and K53 were checked against the specs and the concept.

| Item | Gap | Recommended owner / fix |
|---|---|---|
| **K49** "closing time next to every price", **grid cards** | The concept puts the time top-right on grid cards too: `c.closesIn` at `50pick Home Concept v3.dc.html` L326. WP3 does this for the featured card only (`.mcardp-closes`, and `{!featured && timeLeft}`). WP4 does it for board rows (`.kp-qrow__left`). WP9 §8.2 hands grid cards back to WP3, which never picks them up. Grid-card time therefore stays in `.mcardp-meta`, **below** YES/NO (`market-card.tsx` L559–571). | Give it to WP3, but **not in the chip row**. `.mcardp-top` wraps (`globals.css` L4580), so a wrap on one card and not its neighbour misaligns bars (see C5). Put it on the left of `.mcardp-moveline` (L465–473). That row has a fixed height and sits just above the bar, beside the price. The alternative is to record it as a deviation. |
| **K7** "labelled state" on a cashed-out empty card | This is pool 0 with predictors ≥ 1. V18 §7 finds it: the card shows a dash (L442) and a rail whose "No pool yet" is aria-only. V18 hands it to "WP3/WP6", but WP3 does not build it. V18 would then report it on any day such a card is shown. | One slot line: `{noPrice && !neverBet && <div className="mcardp-nobets" data-market-part="state">{t.market.noPoolYet}</div>}`. WP9 should own it, because it is a slot expression. Pin it in `test:landing-grid` §3 and re-run `qa:card-geometry`. |
| **K7 / K36 / K48 / K53** (V18 can only reach 0 if the parts carry the tags it looks for) | Neither WP3 nor WP4 includes any `data-market-*` attributes. **Featured card:** WP3 empties `.mcardp-timeleft` down to the info button, which has no text (`HowItWorks`, L196–206: `aria-label` plus `<I.info/>`). V18's `time` tag at L568 then finds nothing it can read. **Board rows:** WP4 rewrites `QuestionRow` from scratch, so V18's commit-A tags at old L159/177/178/189 disappear. The `<li>` is then examined as "unmarked" and every part fails. | Write the tags into WP3 and WP4 as each element is built. **WP3:** `.mcardp-closes` gets `time`, and the source span gets `source`. **WP4:** the `<li>` gets `data-market-surface="board"`. `.kp-qrow__price` gets `price` when priced; `.kp-qrow__unit--label` gets `state`. Then `__left` = time, `__pool` = pool, `__depth` = predictors, `__src` = source and `__act` = pick. |
| **K22** "every bar and chart has a text description", plus ruling 13 on the chart | `MicroSpark` is `aria-hidden` (`micro-spark.tsx` L82, L103). WP3 §1.4 fixes `move24h`, but the spark itself is still built from **every** snapshot (`market-history.ts` L302). That includes the invented 0.5 (L196) and the 1.0/0.0 of a one-sided first bet. So a card that is two-sided today still draws a spike to 100 or 0 at its start. Nothing measures this (V17 reads text only). | Extend WP3 §1.4 to build `spark` from two-sided readings only, and keep hiding it below 4 points. On the featured card, record that the spark is decorative and the delta line is its text. |
| **K18 / K47** on production | WP3 proves the mark locally only, with seeded readings. No gate class looks for the tick, and production may have no featured market with two two-sided readings in 24h on the day. | Record in §3 K18/K47 that the ✅ evidence is the local frames plus `red:featured-card`, and that production shows the mark only when the data allows. Don't let a missing tick on production pass as proof. |
| **K50 / P13** | Covered: WP14b narrows its unit and K50 stays open until WP5. | Apply WP14b §7's edits to §1/§3 in the same commit. |

## (2) Conflicts between the specs

- **C1 · Source-name resolver (WP3 vs WP4).**
  - WP3 adds `sourceNameFor` in `source-registry.ts` built on `sourceMatchesAny` (L354–365), plus `src/lib/markets/source-host.ts` (returns `string|null`).
  - WP4 adds `src/lib/markets/source-name.ts` with its own `host.endsWith("." + s.domain)`. It ignores category, lets the most specific domain win, and returns `""`.
  - WP4's version is a second copy of the host-matching rule, which `source-registry.ts` L336–352 forbids.
  - **Use WP3's.** Drop `source-name.ts`, and make `HeroRow.sourceName?: string` (not `|null`).
  - `hero-contract` §8 (WP4) should test `sourceNameFor`.
- **C2 · The date and source keys.**
  - **Bare date vs "Closes {date}":** WP3 passes the featured card a bare date as a prop (`closesOn`, rendered "27 Sep · Settles on X"). WP4 adds a key `market.closesOn: "Closes {date}"`. The key does not exist today (checked in `i18n-dict.ts`). A bare date beside a countdown is ambiguous, so the featured card should also use `fill(t.market.closesOn, …)`.
  - **Draft translations of `settlesOn` differ:**

    | Spec | sw draft | zh draft |
    |---|---|---|
    | WP3 | `Linatatuliwa kwa` | `结算来源：` |
    | WP4 | `Inaamuliwa na` | `结算依据：` |

    WP4's pair is the delivery's own draft (`i18n-draft.json` L150/266).
  - **Pick for `settlesOn`:** sw `Linatatuliwa kupitia {source}`, which agrees with *soko* and matches the dictionary (`i18n-dict.ts` L4376). zh `结算依据：{source}`. Add each key once.
- **C3 · Three V18 designs.**
  - V18 uses `data-market-*` attributes plus `RED_PART`.
  - WP4 §7 has its own V18 block keyed on classes (`.kp-qrow__price/__left/__pool/__src`) and its own `REDS.V18`.
  - WP3 §7.6 selects `.kp-hero__card .mcardp-src` and `.kp-lgw .mcardp-src`. WP9 deletes `.kp-lgw` (`page.tsx` L326–327).
  - **Keep V18's design.** WP3 and WP4 drop their V18 parts and add tags instead (see gap row 3).
- **C4 · Two ways of giving one gate class several RED plants.**
  - WP9 uses dotted keys (`RED=V6.bars`) and splits them with `RED_CLASS`, applied at `landing-ten.mjs` L1074–1075.
  - V18 uses a `RED_PART` env var plus `RED_TAG`, applied at L1045/1072/1088.
  - **Unify on dotted keys:** `REDS["V18.source"|"V18.price"|…]`, loop `RED=V18.$P`, and `red-${RED}.json` stays unique. Drop `RED_PART` and `RED_TAG`.
- **C5 · WP3's grid source line vs WP9's alignment (K15).**
  - WP3 puts `.mcardp-src` inside `.mcardp-qwrap`, wrapping and never cut short (V2).
  - WP9 sets `.mcardp--lgrid .mcardp-head{flex-grow:0}`. The head height then varies with the number of source lines: "Settles on Tanzania Meteorological Authority" takes 2 lines, `boomplay.com` takes 1. Bars move by about 18px per line, and WP9's new V6 bar check fires.
  - WP9 §8.2 asks for a single line with an ellipsis, which V2 forbids.
  - **Fix:** for non-featured cards, render the source line **directly after the bar**. WP9 then makes it the first child of `.mcardp-slot`, which is the one part allowed to grow. That is still before the pick (K36, V18 order), and the head keeps a fixed height. The featured card keeps it under the question. This works in either build order.
- **C6 · WP9's prop name collides.** `landingGrid` is already the exported function in `src/lib/markets/landing.ts` L117. It is used by `landing-contract.test.mts` and quoted in the tracker. WP9's §2 "appears at no other call site" check would match those. Rename the prop (e.g. `gridSlots`) and keep the class `mcardp--lgrid`.
- **C7 · The card's root element.**
  - WP14b-E collapses both branches into one `<article>` with a stretched link.
  - WP9 edits "both roots L623/L648" and V18 edits "L618–625/L648".
  - **Build E first**, then add WP9's class and V18's surface tag to the single root. E must also re-point `kyc-at-withdrawal-prod.mjs` L200 (`a[data-row-id]`).
- **C8 · V18 commit A tags the current `QuestionRow`, and WP4 deletes it.** Put the board tags in WP4's rewrite only.
- **C9 · V18's order rule vs WP4's desktop row.**
  - V18's `before()` passes only if the part is **above** the pick, or vertically overlaps it **and** sits to its left.
  - WP4 at ≥1024 vertically centres a 44px `act` beside a head that can be a 2-line title plus a 2-line meta (about 88px). The `.kp-qrow__src` span on the second meta line then sits below the act's bottom, and V18 wrongly reports "source after the pick".
  - **Fix:** relax the rule to DOM-precedes AND (`a.bottom <= b.top+2 || a.right <= b.left+2`).
- **C10 · The note's CSS rule.** WP4 turns `.mcardp-onesided-note` (`globals.css` L4802–4810) into a list with `.kp-qrow__note`. WP9 changes its `line-height` to `var(--mcard-note-lh)`, and `test:landing-grid` §4 reads that rule. The guard must match with `rule.selectors.includes(...)`, not the exact selector string.
- **C11 · Pinned card spellings shift under three rows.**
  - V18 adds tags to `mcardp-oneside` (L468) and `mcardp-nobets` (L490), which amends `one-sided.test.mts` L136 and `outcome-display.test.mts` L227/L237.
  - WP9 §3 pins "the three slot expressions unchanged". WP3 rewrites the move line around L468.
  - Do V18's card tags in the WP3 commit, and have WP9 pin the post-V18 spelling.
- **C12 · Law numbers collide.** WP3 claims INHERIT-MANIFEST L24–L27; WP14b claims L24 plus Q2. The last existing entries are L23 (`INHERIT-MANIFEST.md` L77) and Q1 (L85). Number them in landing order: WP14b takes L24 and Q2, WP3 takes L25–L28.
- **C13 · Duplicated refactor.** WP3 and WP4 both make the same `trust-band.tsx` change (L251–256 → `formatEatDate`; delete `sourceHost` L310–316). Do it once, in WP3.
- **C14 · Meta line built as one string vs V18's source tag.** WP3's `metaLine` joins everything into one `<p>`. If V18's `source` tag sat on that `<p>`, the date alone ("27 Sep" matches `\p{L}{2}`) would satisfy it with no source present. Render the source as its own span, and only when `sourceName` is set: `{closes}{sourceName && <> · <span data-market-part="source">…</span></>}`.

## (3) Spot-checks of the riskiest claims (code read)

1. **WP4 `source-name.ts` "one resolver": wrong in effect.** `test:bulk-resolve` 4.7 counts `host.endsWith(` in `source-registry.ts` only (`bulk-resolve.test.mts` L227–229, decommented). A second rule in another file passes the suite while breaking the law. (C1)
2. **"red:one-sided 8/8" (WP4 "→10/10", WP9 "8/8"): stale.** `scripts/anchors/one-sided.anchors.mjs` has **11** mutations (L14–L86), and the runner prints `caught/CASES.length` (`one-sided-red.mjs` L59). The count after WP4 is 13/13. The tracker's "8/8" (`LANDING-TEN.md` L257) is stale too.
3. **V18 "WP3 gives the featured card a top-right time AND keeps the meta row's": wrong about WP3's spec.** WP3 *moves* the time. On the featured card, L568 is left holding only the info button, which has no text. The six-part RED still works because it hides every copy, but the tag must go on `.mcardp-closes` (gap row 3).
4. **WP3 §1.4 (invented baseline): true, but only half fixed.**
   - `recordSnapshot` writes `yes: total > 0 ? … : 0.5` (`market-history.ts` L196).
   - The batched select at L356 has no pool columns; `MarketSnapshot` does have `yesPool`/`noPool` (`prisma/schema.prisma` L1807–1808).
   - The spark at L302 still draws the invented readings (gap row 4).
5. **WP3 bar "Append `probabilityLabel=…`": wrong wording.** The tag already has `probabilityLabel` (`market-card.tsx` L489). Replace it; a duplicate JSX attribute is a TS error.
6. **WP9 "WP3's grid source line rides the same prop": wrong.** WP3's prop is the string `sourceName`, not a flag. (C6)
7. **Confirmed true:**
   - **WP14b:**
     - The bare `openGraph` is at `markets/[id]/page.tsx` L90–94.
     - `impliedYesPct` returns 50 on an empty pool (`market-service.ts` L344–348), and the og route imports it (route L18, L49).
     - `test:card-share` §2 is an "includes" check, not an allowlist (L80–90).
     - The closed branch `<Link>{body}</Link>` (L647–650) wraps `ShareButton` (L593).
     - `../../layout` resolves correctly, as in `auth/register`.
   - **WP9's layout mechanics:** `.mcardp-head` grows with `flex:1 1 auto` (L4595), `.mcardp-meta` has `margin-top:auto` (L4655), and the traders row is always rendered with a fixed min-height (L4609). So YES/NO does line up from the bottom.
   - **WP3's tick is safe to draw:** `.tipbar-rail` is `overflow: visible` (L1623–1630), and the needle clamps to 6–94 (`brand.tsx` ~L281), matching the mark's clamp.
   - **WP4's sizes:** `--h-control-md` is 44px (L313), so `.btn-md` is at least 44.
   - **Not checked:** the V15 360-sw budgets in WP3 are derived estimates, not measurements. Measure them.

## (4) Build order and deploys

1. **Step 0: gate and scripts only, no browser.**
   - V18 §8 hardening, and dotted RED keys (C4).
   - WP9's V6 bar check and V9 scroller exemption.
   - The V18 block with the relaxed order rule (C9).
   - `og-prod.mjs`.
   - Run `--compile`.
   - **Before any D2 deploy, run the production baselines:** `og-prod` (it must fail today), and `RED=V6.bars` on the current production as WP9's old-build control.
2. **Deploy 1: WP14b A+B+C+E, plus step 0.** It is independent, and E must come before any other card-root edit (C7). Confirm with `?dpl=`, re-run `og-prod`, then the `/results` share drive and `qa:card-geometry`.
3. **Deploy 2: WP3, then WP4, plus V18's tags, as one deploy.**
   - WP3 builds the shared pieces: `formatEatDate`, `sourceNameFor`/`sourceHost`, `market.closesOn`/`settlesOn`, `HeroRow.sourceName`, `listSources` in `page.tsx`, and the trust-band refactor.
   - WP3 also covers `cardChartFrom` plus the spark, SOON via `msLeft`, the featured card, and the grid source line after the bar (C5).
   - Then WP4 reuses those pieces.
   - Tags go in as each element is built. The RED runs for V18 `price/time/pool/predictors/source/order` must all come back PROVED locally before the push.
   - Afterwards, re-shoot `/markets`, `/watchlist` and the detail page (SOON and `move24h` changes are sitewide).
4. **Deploy 3: WP9 on its own.** It needs a production that is post-WP3 but pre-WP9 as its V6/V9 control, plus its own `qa:card-geometry` before/after, `needle-rest` and chat-bubble drives. It moves the grid source line and the new "No pool yet" line into `.mcardp-slot`. V18 turns ✅ only after re-measuring V18 on production **after deploy 3**, since the grid card DOM changes again.

WP3 and WP4 should share a deploy. WP14b A–D could ride with any deploy once its baseline has run, but E belongs in deploy 1. WP9 should not share with WP3/WP4.

**New session needed: yes. Start one before WP9 (deploy 3), resuming from `docs/LANDING-TEN.md` §0.** Step 0 plus deploys 1 and 2 fit the current session if context holds. D3 (WP5, the pick slip) also needs a fresh session.

Main file for the fixes above: `C:\kipindi-landing-v3\docs\LANDING-TEN.md`