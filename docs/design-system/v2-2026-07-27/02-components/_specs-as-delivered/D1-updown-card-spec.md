# D1 · UpDownCard — implementation spec

Visuals: `UpDown D1 Canvas.dc.html` (2a states ×7 at 360, 2b 3-across at 1280, 2c stress test).
Order per §5.4: visual → redlines → contract → notes.

---

## 1 · Redlines

Card container
- background `--bg-elevated` · border 1px `--border` · radius `--r-lg` (16px) · shadow `--shadow-card`
- padding 14px 14px 12px · `display:flex; flex-direction:column`; footer uses `margin-top:auto` → equal heights + aligned baselines in any grid row
- grid placement (board): `repeat(3, 1fr)` gap 16px at 1280; 1 col at 360. No internal breakpoint changes — the card is fully fluid from 332px up.

Header
- asset icon: 40px circle, mono 13px/700 glyph text ("Au"/"Ag"), bg `color-mix(gold-500 16%, transparent)`, border 1px `color-mix(gold-400 45%, transparent)`, ink `--gold-300` for gold; the same recipe on `--text-subtle` for silver. **NEW convention** — asset-tinted icon chips; gold tint here is asset identity, not "earned money" (flagged; swap to supplied asset artwork when available).
- title: Sora (`--font-display`) 14.5px/600, lh 1.25, ls −0.01em, `--text`; `text-overflow:ellipsis; white-space:nowrap` (stress-tested)
- duration chip: kit `.chip` default, text "5 MIN"
- live line: `.live-dot` (kit) + mono 9.5px/600, ls 0.10em, uppercase, `--text-subtle`
- live price: mono (`--font-mono`) 15.5px/700 tabular + 11×11 stroke arrow (2.5px), `--yes-300` up / `--no-300` down — arrow + colour, never colour alone
- % move: mono 11px/600 tabular, same colour as price
- unknown price (confirming): "—" in `--text-faint` + "AWAITING READ" mono 9px — **never a guessed number**

Countdown band
- container: bg `--bg-inset`, border 1px `color-mix(--border 70%, transparent)`, radius `--r-md` (12px), padding 9px 12px
- label: mono 8.5px/600, ls 0.12em, uppercase, `--text-faint` — "CLOSES IN" / "SELECTIONS CLOSED" / "ROUND SETTLED"
- digits: mono 28px/700 tabular, ls 0.05em, lh 1, `--text`
- final 30 s: digits `--no-300` + `ud-count-pulse` 1s infinite (opacity 1→0.55), ease `--ease-conduct`. **NEW keyframe** `ud-count-pulse` — add to kit; gated by `prefers-reduced-motion` (animation: none)
- after close: digits `00:00` in `--text-subtle`; status chip right-aligned: kit `.chip-pending` — "Awaiting result" / "Confirming price"

Stats band (all four survive 360: countdown above counts as the fourth)
- row: volume `VOL TZS 320,000` — mono 11.5px/600 tabular `--text-muted`, "VOL" prefix 8.5px `--text-faint`; players: 11px person stroke glyph (2px) + mono 11.5px/600
- pool split: labels `UP 58%` (`--yes-300`) / `42% DOWN` (`--no-300`), mono 9.5px/700 ls 0.06em; bar 5px tall, radius `--r-pill`, 2px gap, fills `--yes-500` / `--no-500`. Words + colour, per the "never colour-only" rule.

Winning-targets band (the PDF's Up/Down target prices — added 2026-07-28)
- shown **only** when `upTarget`/`downTarget` are known **and** state ∉ {resolved, void}; absent otherwise — we never render a boundary we don't have, and a settled card shows its outcome instead.
- header row (margin-top 10px): left label mono 8px/600 ls 0.12em uppercase `--text-faint` = "TARGET TO WIN" (`t.market.udWinTarget`, EN/SW/ZH), truncates; right `± $<buffer>` mono 8px tabular, shrink-0. Buffer = `upTarget − openPrice` = base × margin (the 0.5% "50pick factor"), mirroring the paper prototype's `4119.23 × 0.5% = 20.60 (±)`.
- two tinted TILES, **`grid-cols-2`** gap 8px (a fixed 50/50 split — a 6-figure price stacks on its own line inside the tile, so the row can never overflow):
  - UP tile (left): bg `color-mix(--yes-500 10%, transparent)`, border 1px `color-mix(--yes-500 24%, transparent)`, radius `--r-lg`, padding 6px 10px. Row 1 = ↗ (`I.trendingUp` s10) + "UP" mono 9px/700 caps ls 0.10em; row 2 = `≥ $<upTarget>` mono 12.5px/700 tabular, leading-tight. All ink `--yes-300`.
  - DOWN tile (right): the mirror — right-aligned, `--no-500` tint / `--no-300` ink, ↘ (`I.trendingDown`), `≤ $<downTarget>`.
  - the tiles deliberately echo the Up/Down bet buttons below (soft tint → solid fill = an intensity ladder from "the target" to "the action"), realising the paper prototype's boxed ↗ UP / ↘ Down targets with their arrows.
- meaning: reach ≥ upTarget ⇒ UP wins, ≤ downTarget ⇒ DOWN wins, strictly between ⇒ VOID + full refund. Frozen at open (a later config/margin edit never moves a live round). Full math: `docs/UPDOWN-PRICING.md`.
- responsive: verified by rendering the real board card at 360 / 768 / 1280 × EN/SW/ZH — overflow 0 at every width, incl. a 6-figure BTC stress case (`≥ $104,756.68` on one line inside its tile); band correctly absent on an awaiting-price round.

Stake row
- 44px tall (≥40 tap target), bg `--bg-inset`, border 1px `--border`, radius `--r-md` (12px input radius), padding 0 12px 0 14px
- "TZS" prefix: mono 10.5px/600 ls 0.04em `--text-subtle`; amount: mono 15px/700 tabular `--text`
- projected return: 11×11 right-arrow stroke + mono 12px/600 tabular `--text-muted` (neutral ink — a projection is not earned money, no gold)

Actions
- two `.btn .btn-yes` / `.btn .btn-no`, `.btn-lg` (46px), `flex:1`, gap 8px between; 14×14 trend arrows (2.2px stroke)
- label: "Up" body 15px/600 + mono 12.5px/600 "× 1.4 est." at 85% opacity — the estimate marker rides the button itself
- qualifier line beneath: body 10px, lh 1.45, `--text-faint`: "× figures are pool estimates, not fixed odds — final payout depends on how the pools close."
- disabled (closed state): kit `.btn:disabled` (opacity 0.45)

State panels (replace stake+actions after settlement)
- CONFIRMING: bg `color-mix(--bg-inset 70%, transparent)`, border `--border`, radius `--r-md`, padding 14px; `.chip-pending` "Confirming price"; body 11.5px `--text-muted`. Calm — no spinner, no alarm.
- RESOLVED: bg `--bg-inset`, padding 12px 14px; outcome mono 14px/700 ls 0.04em `--yes-300`/`--no-300` + 14px arrow ("UP WINS"); right: closed/open prices mono 10.5px tabular `--text-muted`. No gold — the card announces the market outcome, not the player's payout.
- VOID: identical shell to CONFIRMING; default `.chip` "VOID · Refunded" (neutral grey-blue, not an error); body copy "returned in full".

Footer (never dropped)
- top border 1px `color-mix(--border 55%, transparent)`, padding-top 10px
- mono 9.5px `--text-faint`: "Source: Kitco · quoted 14:34:58" (ellipsised under stress) + right "open $2,409.40" tabular

USD vs TZS: asset prices always `$…` in mono, coloured or muted, never gold; player money always `TZS …` prefix.

### New values not in the kit (flagged per §5.2)
1. `ud-count-pulse` keyframe (opacity 1→0.55, 1s) + reduced-motion gate
2. asset icon chip recipe (color-mix tints above)
3. mono micro-labels at 8.5–9.5px (kit's smallest is 10px `--gilt-eyebrow`) — justify: card density at 360; all are uppercase tracking labels, not reading copy
4. countdown 28px display size (between kit type steps)

Everything else resolves to existing tokens/classes.

---

## 2 · Component contract

```
UpDownCard
  assetName        string                      // "Gold" — rendered "… Up or Down"
  assetIcon        "gold" | "silver" | string  // icon recipe key; string = ticker fallback glyph
  assetTicker      string                      // "GOLD" — LIVE line
  durationMinutes  5 | 15 | 30
  livePrice        number | null               // null => "—" + AWAITING READ; NEVER render 0
  openPrice        number                      // the line; always known once round exists
  upTarget         number | null               // frozen winning boundary (base + margin); null on legacy/awaiting rounds → targets band hidden
  downTarget       number | null               // frozen winning boundary (base − margin); null → band hidden
  movePct          number | null               // null => omit row (with livePrice null)
  secondsLeft      number                      // <=30 triggers urgency; 0 + state drives label
  volumeTzs        number                      // TZS-formatted with separators
  players          number
  upPct            number                      // 0..100; downPct derived
  estMultiplier    number | null               // display-only estimate; null => hide "× …" (never 0)
  stakeTzs         number                      // current input value
  state            "open" | "closing" | "confirming" | "resolved" | "void"
  outcome          "UP" | "DOWN" | null        // required iff state === "resolved"
  closePrice       number | null               // required iff resolved; null otherwise
  sourceName       string
  sourceQuotedAt   string                      // ISO; rendered HH:MM:SS
  onPick?          (side: "UP" | "DOWN", stakeTzs: number) => void
  onStakeChange?   (tzs: number) => void
```

Mutually exclusive states
- `open` (secondsLeft > 30) · `open`+urgency (≤30) · `closing` (00:00, buttons disabled, "Awaiting result") · `confirming` · `resolved` (needs `outcome` + `closePrice`) · `void`
- Exactly one of {stake+actions, confirming panel, resolved band, void panel} renders. Actions exist only in `open`/`closing`; disabled only in `closing`.

Unknown-value rendering (real data or nothing)
- `livePrice/movePct null` → "—" + "AWAITING READ"; no zero, no stale value
- `closePrice null` while confirming → panel copy only, no number anywhere
- `estMultiplier null` (pools too thin to estimate) → buttons read "Up" / "Down"; projected-return arrow row hidden
- `players/volume` are never null post-open; render `0` honestly ("TZS 0", "0") — they are real observed values

---

## 3 · Notes & open questions

1. **"× 1.4 est." both sides** — real pools imply different multipliers per side (`estUp`/`estDown`)? Contract keeps one `estMultiplier`; split it if the backend quotes per-side.
2. **Urgency threshold** hard-coded at 30 s per brief; prop if operators need per-duration tuning.
3. **Icon artwork** — mono "Au"/"Ag" glyph chips are placeholders; supply real asset marks and the recipe keeps only the tinted ring.
4. **Resolved band and the player's own position** (won/lost/payout) is intentionally NOT on the board card — that belongs to D3/Bets. Confirm.
5. **Stress title** ellipsises on one line; alternative is a 2-line clamp (+~18px card height, still baseline-aligned since footer is bottom-pinned). Preference?
6. **Winning-targets tiles** (added + refined 2026-07-28) realise the "50pick Dynamic Engine" PDF on the card — two colour-coded target tiles (`↗ UP ≥` / `↘ DOWN ↘ ≤`) that preview the bet buttons, matching the approved paper prototype **including its arrows**. Stacking the arrow+label over the price keeps a 6-figure asset on one line inside its 50%-width tile, so nothing overflows at 360px. (Resolves the earlier "arrows or not" question — arrows in, via the tile layout.)
