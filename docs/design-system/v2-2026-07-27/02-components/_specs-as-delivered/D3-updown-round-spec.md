# D3 · Round detail — implementation spec

Visuals: `UpDown D3 Canvas.dc.html` — 4a open/betting 1280, 4b resolved-with-proof 1280,
4c open 360, 4d resolved 360.
Inherits D1 (`D1-updown-card-spec.md`) and the page frame from D2 (`D2-updown-board-spec.md`).
Order per §5.4: visual → redlines → contract → notes.

---

## 1 · Redlines

### Page frame
- canvas `--bg`, padding 22px 16px 56px, content `max-width: 1232px` centred, stack gap 18px — **identical to D2**, so board → round feels like the same place
- back link: mono 12px, `--text-subtle`, 12px left-arrow (2px stroke), label "Up & Down"

### Header
- asset icon: 44px circle (D1's recipe at +4px — this is a page, not a card): mono 14px/700, bg `color-mix(--gold-500 16%, transparent)`, border 1px `color-mix(--gold-400 45%, transparent)`, ink `--gold-300`
- title: Sora (`--font-display`) 20px/600, lh 1.25, ls −0.01em, `--text`, ellipsised on one line; `.chip` "5 MIN" beside it
- status line: `.live-dot` (open only) + mono 9.5px/600, ls 0.10em, uppercase, `--text-subtle` — "LIVE · GOLD" / "SETTLED · GOLD"
- countdown pod, right: bg `--bg-inset`, border 1px `color-mix(--border 70%, transparent)`, radius `--r-md`, padding 9px 14px
  - label mono 8.5px/600 ls 0.12em uppercase `--text-faint` — "CLOSES IN" / "ROUND SETTLED"
  - digits mono **28px**/700 tabular, ls 0.05em, lh 1 — same 28px display size as D1, `--text` open / `--text-subtle` settled
  - final 30 s: `--no-300` + `ud-count-pulse` 1s infinite (D1's keyframe, reduced-motion gated)
- header wraps at 360: title block then countdown pod, both full width

### Layout grid
- 1280: `minmax(0, 1.55fr) minmax(300px, 1fr)` gap 16px, `align-items: start` — price hero left, pool + stake stacked right
- 360: single column, order price → pool → stake/result → proof
- proof panel spans the full content width beneath the grid at every size

### Price panel (the hero)
- shell: `--bg-elevated`, border 1px `--border`, radius `--r-lg`, `--shadow-card`, padding 16px 16px 10px
- label mono 8.5px/600 ls 0.12em uppercase `--text-faint` — "LIVE PRICE" / "CLOSE PRICE"
- big price: mono **26px**/700 tabular, lh 1, ls −0.01em, `--yes-300` above open / `--no-300` below — **NEW size** (between kit steps; justified: this is the page's hero figure and must outrank the 20px title)
- % move beside it: mono 12px/600 tabular, same ink
- unknown price: "—" mono 26px `--text-faint` + "AWAITING READ" mono 9px ls 0.10em — **never a guessed number** (D1's rule, same treatment)
- open price, right-aligned: label mono 8.5px `--text-faint` + value mono 13px/700 tabular `--text-muted`
- chart: `viewBox 0 0 640 220`, `width:100%`, plot area x 0→606, y 18→196
  - **open-price marker**: 1px… actually `stroke-width 1.25`, `--gilt`, `stroke-dasharray 3 4`, opacity 0.75, full plot width. Gilt is correct here — it is the reference line the bet is measured against, i.e. the money line, not decoration
  - marker label: mono 9px/600 ls 0.12em `--gilt` opacity 0.9, 6px above the line, "OPEN $2,409.40"
  - price line: 2.25px, round caps/joins, `--yes-300` / `--no-300` by direction
  - area tint: same path closed to the open line, clipped above/below it. Above = `--yes-400` 0.26→0.02 vertical; below = `--no-400` 0.02→0.26. **This is the element that answers "am I above or below?" pre-cognitively**
  - live point: 3.6px filled dot in the direction ink + a 7px halo at 0.22 opacity, `ud-point` 1.6s ease-in-out infinite (opacity 1→0.45), reduced-motion gated. Resolved state keeps the dot, drops nothing else
  - value tag: mono 11px/700 in direction ink, `text-anchor:end`, 10px left of the point, 12px above (up) or 18px below (down) so it never collides with the line
  - **no axis, no gridlines, no ticks** — per brief
- footer row: mono 9.5px `--text-faint`, space-between — "Above open by $4.45" · "Source: Kitco · quoted 14:34:58"

### Pool panel
- shell as price panel, padding 14px 16px 16px
- volume: mono 17px/700 tabular `--text` + label mono 9px ls 0.10em uppercase `--text-faint`
- players: 12px person glyph (2px stroke, `--text-muted`) + mono 17px/700 tabular
- split labels: mono 9.5px/700 ls 0.06em — "UP 58%" `--yes-300` / "42% DOWN" `--no-300` (words + colour, never colour alone)
- bar: 6px tall, 2px gap, radius `--r-pill`, fills `--yes-500` / `--no-500` (1px taller than D1's 5px — page scale)
- **TZS on each side beneath the bar**: mono 10.5px tabular `--text-muted`, space-between — this is D3's addition over D1's percentages-only

### Stake panel (open state only)
- shell as above, padding 14px 16px 16px
- "YOUR PICK" label mono 8.5px ls 0.12em uppercase `--text-faint`; value is `.chip .chip-yes` (or `.chip-no`) + 12px trend arrow — **a statement, not a control**
- explanatory line: body 12px, lh 1.5, `--text-muted` — "Locked when you chose UP on the board. To take the other side, leave this round."
- stake field: 46px tall, `--bg-inset`, border 1px `--border`, radius `--r-md`, padding 0 12px 0 14px
  - "TZS" prefix mono 10.5px/600 ls 0.04em `--text-subtle`; amount mono 16px/700 tabular `--text`
  - projected return, right: 11px arrow + mono 12.5px/600 tabular `--text-muted` — **neutral ink, no gold; a projection is not earned money**
- presets: 4 × `flex:1`, 30px tall, radius `--r-sm`, mono 11px/600 — rest: border `--border`, bg `color-mix(--bg-elevated 60%, transparent)`, ink `--text-muted`; active: border `--brand-500`, bg `oklch(40% 0.12 262 / 0.35)`, ink `--text` (the kit's nav-active idiom, same as D2's asset tabs)
- confirm: `.btn .btn-gold .btn-lg`, full width, label "Confirm UP" + mono "TZS 100" at 0.85 opacity. **The single use of gold on this page** — it is the money commit
- qualifier: body 10px, lh 1.45, `--text-faint` — D1's exact estimate wording, verbatim

### Result panel (resolved state only, replaces stake panel)
- "YOUR RESULT" label + `.chip-resolved` "Resolved · Win" (or `.chip-no` "Resolved · Loss", `.chip` "Void · Refunded")
- payout: mono 22px/700 tabular, `--gilt` on a win — **earned money, the correct second use of gold** — `--text` on a loss/void
- right: "YOUR PICK · STAKE" label + mono 12px tabular `--text-muted`
- `.btn-ghost .btn-sm` full width, "Open in Positions"

### Settlement proof (resolved state only)
- shell as above, padding 16px 18px 18px, full content width
- header: `.gilt-eyebrow` "Settlement proof" + right mono 9.5px ls 0.08em uppercase `--text-subtle` "Round GLD-5M-0418 · auditable record"; `.gilt-rule` beneath, margin 10px 0 14px
- three cards, `repeat(3, 1fr)` gap 14px at 1280, single column at 360: **open observation · close observation · outcome**
  - card shell: `--bg-inset`, border 1px `color-mix(--border 70%, transparent)`, radius `--r-md`, padding 12px 14px 13px
  - label mono 8.5px/600 ls 0.12em uppercase `--text-faint`
  - price mono 19px/700 tabular, lh 1, `--text` — deliberately **not** coloured: these are facts of record, not live direction
  - `<dl>` grid `auto 1fr`, gap 5px 10px, mono 10.5px — Source (link, `--aqua-300` per the kit's link colour) · Quoted · Observed, both timestamps with the timezone
  - outcome card: mono 19px/700 ls 0.04em + 16px arrow, `--yes-300`/`--no-300`; rows Move (absolute $) · Percent (3 dp) · **Rule ("close > open ⇒ UP")** — stating the rule is what makes it auditable rather than assertive
- evidence excerpt: `<pre>`, `--bg-inset`, border 1px `color-mix(--border 70%, transparent)`, **left border 2px `color-mix(--gilt 55%, transparent)`**, radius `--r-sm`, padding 11px 13px, mono 10.5px, lh 1.65, `--text-muted`, `white-space: pre-wrap; overflow-wrap: break-word` (never clips at 360)
- closing note: body 11px, lh 1.55, `--text-faint` — states the void-and-refund rule, so the failure path is on the receipt itself

### New values not already in the kit (flagged per §5.2)
1. **26px hero price** — between kit type steps. Justified: must outrank the 20px page title as the hero figure.
2. **44px asset icon** — D1's 40px recipe at page scale; same colour recipe, no new tokens.
3. **`ud-point` keyframe** (opacity 1→0.45, 1.6s ease-in-out) + reduced-motion gate — the live price point. Promote to the kit stylesheet beside `ud-count-pulse`.
4. **Area-tint gradients** `--yes-400`/`--no-400` at 0.26→0.02 — existing tokens, new usage. Worth adding as a documented recipe since D4's round explorer will want the same.
5. **6px pool bar** (D1 uses 5px) — page scale.
6. Mono micro-labels at 8.5–9.5px — already flagged and accepted in D1.

Everything else resolves to existing tokens and kit classes.

---

## 2 · Component contract

```
UpDownRound
  roundId          string                       // "GLD-5M-0418" — shown on the proof
  assetName        string                       // "Gold" → "Gold Up or Down"
  assetIcon        "gold" | "silver" | string
  assetTicker      string                       // status line
  durationMinutes  5 | 15 | 30
  openPrice        number                       // the line; always known once the round exists
  livePrice        number | null                // null => "—" + AWAITING READ; NEVER 0
  priceSeries      { t: string; price: number }[] | null   // null => hero renders open line only
  secondsLeft      number                       // <=30 triggers urgency
  volumeTzs        number
  players          number
  upPct            number                       // 0..100; downPct derived
  upTzs            number                       // pool money per side — D3 shows both
  downTzs          number
  pick             "UP" | "DOWN"                // LOCKED — chosen on the card, never a control here
  stakeTzs         number
  estMultiplier    number | null                // null => hide projection + "×" (never 0)
  state            "open" | "closing" | "confirming" | "resolved" | "void"
  outcome          "UP" | "DOWN" | null         // required iff resolved
  closePrice       number | null                // required iff resolved
  payoutTzs        number | null                // required iff resolved && won
  result           "WIN" | "LOSS" | "VOID" | null
  proof            {
                     open:  { price, sourceName, sourceHref, quotedAt, observedAt }
                     close: { price, sourceName, sourceHref, quotedAt, observedAt }
                     evidenceExcerpt: string
                   } | null                     // required iff resolved
  onStakeChange?   (tzs: number) => void
  onConfirm?       (stakeTzs: number) => void
```

### Mutually exclusive
- Exactly one of **{stake panel, result panel}** renders: stake in `open`/`closing`, result in `resolved`/`void`.
- The **settlement proof renders only when `proof != null`**, i.e. only after resolution. It is never a skeleton and never partially filled.
- `confirming` shows the price panel with the unknown-price treatment plus D1's calm `.chip-pending` "Confirming price" — **no invented close price anywhere**.
- The confirm button is disabled in `closing`; it does not exist in `resolved`/`void`.

### Unknown-value rendering (real data or nothing)
| Value null | Renders |
|---|---|
| `livePrice` | "—" + "AWAITING READ"; hero line still drawn to its last real point, live dot hidden |
| `priceSeries` | Hero shows the gilt open line and the open price only — no fabricated curve |
| `closePrice` while confirming | Panel copy only; no number, no placeholder |
| `estMultiplier` | Projection row and "×" figure hidden; confirm reads "Confirm UP" alone |
| `proof` | Proof panel absent entirely (not an empty shell) |
| `payoutTzs` on a loss | "TZS 0" is honest here — the stake was really lost; ink is `--text`, never gilt |
| `volume` / `players` | Never null post-open; render real zeros honestly |

---

## 3 · Notes & open questions

1. **Gold is used exactly twice** and both are defensible: the confirm button (money commit) and a winning payout (earned money). The proof panel's gilt is structural — eyebrow, rule, open-price marker, evidence border — matching the Positions "Your standing" panel idiom.
2. **Proof prices are deliberately uncoloured.** Green/rose on the receipt would re-read facts of record as live direction. Only the outcome cell is coloured, and it carries an arrow as well.
3. **Timezone on every timestamp** (EAT). Recommend the same in D4's proof drawer — a receipt without a zone is not auditable.
4. **The "Rule" row** ("close > open ⇒ UP") is my addition, not in the brief. Rationale: a receipt that states its own rule can be checked by the player; one that only asserts an outcome cannot. Remove if legal prefers not to publish the tie-break — **but then the tie case needs a stated policy elsewhere** (see 5).
5. **OPEN QUESTION — exact ties.** `close === open` is unspecified. UP-wins, DOWN-wins and VOID are all defensible; VOID matches the platform's existing refund posture. Needs a product decision, and it belongs on this receipt once made.
6. **OPEN QUESTION — leaving the round.** The stake copy says "to take the other side, leave this round", which implies a cancel/withdraw path that has never been designed. If cash-out-before-close exists, it needs a panel here; if it does not, the copy should change.
7. **OPEN QUESTION — series length.** The hero assumes ~34 samples over a 5-minute round. At 30 minutes the sampling rate must change or the line gets noisy; recommend a fixed sample count per duration rather than a fixed interval.
8. **`priceSeries` timestamps are unused in the render** (index-spaced x-axis). Fine for equal sampling; if the feed can drop samples, x must become time-proportional or a gap will read as a price move that never happened.

---

## 4 · As built (repo · 2026-07-27) — open questions resolved

Implemented at `src/app/updown/[roundId]/page.tsx` + `src/components/updown/{price-hero,round-stake-panel}.tsx` + `round-countdown.tsx` (`RoundCountdownPod`), data in `src/lib/server/updown-board.ts`.

- **§3.5 exact ties → RESOLVED: VOID + full refund.** This was already the server rule — `decideOutcome` (`updown-service.ts`) voids on `|close − open| < minMove` (one tick), which includes `close === open`, and `settleMarket` refunds in full. The receipt now **publishes** it. The "Rule" row is stated as the true **dead-band**, not a literal `close = open`: *"Up if the close is above the open · Down if below · Void if it does not move."* (A receipt must not claim more precision than the mechanism has.)
- **§3.6 leaving the round → RESOLVED: no exit.** The pick is final. It is chosen on the board and carried here as `?side`; the stake panel renders it as a **chip statement, not a control**, and there is no cash-out/withdraw path. Copy: "Locked from your pick on the board. To switch sides, leave this round." When navigated to WITHOUT a side (direct link), a safe two-way control renders so betting is never blocked. The one money commit is the gold Confirm, through the shared `useUpDownQuickBet → buyPositionAction` path (no parallel money path); bounds 1k/1M enforced server-side.
- **§3.7 series length → RESOLVED (with a data caveat).** The oracle reads only at grid boundaries, so the "~60 samples" is not achievable from real data today. `priceSeriesFor` hands the hero **only the real CONFIRMED reads inside the round window** — ≈2 points for a 5-minute round, more for a 30-minute one — downsampled with an even-step to ≤60 if a finer feed is ever added. It **never fabricates** intermediate points (A-5). `priceSeries = null` (fewer than two real points) ⇒ the hero draws the gilt open line alone. A real ~60-point hero would require intra-round oracle sampling (backend follow-up); the render already handles both the sparse and the dense case.
- **`ud-point`** promoted to the kit stylesheet (`globals.css`, beside `ud-count-pulse`, reduced-motion gated) — the one new value flagged in §85.3; everything else resolved to existing tokens/classes.
- **Proof "Observed" timestamp** added from `observation.confirmedAt` (our observed time), rendered in EAT alongside the source's own quoted time, per §80.
