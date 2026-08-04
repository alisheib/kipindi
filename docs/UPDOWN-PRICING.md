# Up & Down — pricing & the margin (winning-boundary) model

> The math behind how an Up & Down round is won, and where every piece lives. Money-critical
> — read this before touching `decideOutcome*`, `computeTargets`, or the round's price fields.
>
> **Authoritative for:** the band arithmetic and the money split. For the *reader* and the round
> lifecycle see `UPDOWN-ARCHITECTURE.md`; for the player-facing rules see `UPDOWN-SPEC.md`; for the
> operator-facing version of all of it see `50pick-updown-operator-guide.pdf`.

## ⛔ CORRECTED 2026-08-04 — THE DEFAULT IS THE TICK FLOOR, NOT 0.5%

This document described `defaultMarginBps = 50` (**0.5%**) as the model. **That is no longer true
and was measured to be wrong.** The live value is **`defaultMarginBps: 0`**, and `marginSchedule`
is **empty** — so the band is *always* the asset's own minimum move unless a chain overrides it.

| | then | **now (live)** |
|---|---|---|
| `defaultMarginBps` | 50 (0.5%) | **0** |
| effective band, BTC | ±$316 on a $63,000 price | **±$0.02** (2 ticks) |
| effective band, gold | ±$16.50 | **±$0.40** (40 ticks) |
| rounds that paid a winner | **63%** measured | **~99%** designed |
| `minMoveTicks` floor | none — assets sat at **1** | **`MIN_MOVE_TICKS_FLOOR = 2`** |

⭐ **Why**: at 0.5% Bitcoin had to travel **±$316 inside five minutes** and refunded 5 real
production rounds out of 5. A refunded round earns **no fee**, so a wide band does not raise the
margin — it removes it. Ali's decision, 2026-08-04, on the measurement. ⛔ Do not re-open it.

⛔ **And a one-tick band is now refused.** At `decimals: 2` a single tick is 0.01 while `toFixed(2)`
rounding error reaches 0.005 on *each* of the two prices that decide the round — the band would be
no larger than the noise it measures. `recommendMinMoveTicks` derives the per-asset number from
measured feed disagreement (gold: its own feed differs by up to **$0.20** at one instant and
**$0.29–$0.87** across a bar seam, hence 40 ticks).

## The model in one paragraph

At a round's **open**, the price is frozen as the **base** (`openPrice`, from a confirmed
observation — under the dated-bar reader, the `open` of the last *finished* minute). We compute a
**margin = base × marginBps / 10000**, **floored at `minMoveTicks × 10^-decimals`**, and set two
**winning boundaries**, frozen onto the round: **upTarget = base + margin**,
**downTarget = base − margin**. At **close**, the settlement price (`closePrice`, the `open` of the
bar labelled with the boundary) is compared against those frozen targets:

```
close ≥ upTarget          → UP   (YES pays)
close ≤ downTarget        → DOWN (NO pays)
downTarget < close < upTarget → VOID ("no-move") — every stake refunded in full
close or targets missing  → VOID ("source-failed")
```

Worked example at the **live** setting — BTC, `marginBps: 0`, `decimals: 2`, `minMoveTicks: 2`:
base **63,856.00** → percentage gives 0, floor gives **0.02** → up **63,856.02**, down **63,855.98**.
A close of 63,832.00 is DOWN. (The original 0.5% illustration — base 4120 → margin 20.6 — still shows
the arithmetic when a percentage *is* set, but it is no longer any chain's configuration.)

This is a **generalisation of the pre-existing behaviour**, not a new money path: the engine already
VOIDed+refunded when the move was inside a sub-tick dead-band (`minMove`). We replaced that absolute
dead-band with a **percentage margin** and now expose the two target prices.

## Why VOID in the band (not "any move decides")

The targets are *winning boundaries* — you must reach one to win. A move smaller than the margin
means neither side clearly won, so the round VOIDs and **refunds every stake in full** (no fee). This
matches the PDF ("upper/lower winning boundary") and the engine's existing `no-move ⇒ VOID` rule.
⚠️ **Economic consequence, and this is why the default is now 0.** A percentage band voids far more
rounds than the tick floor, especially on short/low-volatility rounds — and a void earns the house
nothing. Measured on production: at 0.50% the pay rate was **63%**; at the tick floor it is designed
for **~99%**. The levers remain the per-chain override and the `PAID A WINNER · 7d` readout, but the
default is no longer something to tune down from — it is already at the floor.

## The numbers are DATA — editable, with a per-chain override

- **Global default**: `UpDownConfig.defaultMarginBps`, edited at `/admin/updown` (the Thresholds
  form). **Live value: `0`** — the %-band is off and the asset's minimum-move rule decides, which is
  the intended configuration. ⛔ `marginSchedule` is **empty**, so the per-class "E-32 ladder" this
  document once described has no rungs: a blank chain override inherits `0` and nothing else.
- **Per-chain override**: `UpDownChain.marginBps` (`null` = inherit the default). Edited per
  asset×duration, so a fast 5-min chain can run a tighter margin than a 30-min one.
- **Frozen per round**: the margin + both targets are stamped onto the `UpDownRound` at open. **A later
  config edit never moves a live round's boundaries** — a bet is priced by the rule in force when it
  was taken. (Proven by `updown-engine.test.mts` §11.)

Validation: `marginBps` is a whole number of basis points, **0–2000** (0–20%). Above 20% a round would
almost never reach a boundary and would void perpetually.

## Admin controls (where to change it, live)

`/admin/updown` (accounting-gated) exposes every lever, each with in-app instructions:

- **Thresholds → Round margin (%)** — the global `defaultMarginBps`, entered as a percentage (`0.5` = 50 bps).
  The help text states the win/void rule and that the margin is frozen at open, so a change here affects only
  **new** rounds — a live round keeps the boundaries it opened with.
- **Price reading method** — which reader produces the price those boundaries are compared against: a
  **market data feed** (default — `twelvedata` for real quotes, `mock` for simulated) or **AI page
  reading**. The card states the consequence of the current selection *before* the save; choosing the
  simulated feed is a type-to-arm confirmation (`SIMULATED`, the same gate the payment-provider switch
  uses for `MOCK`); and a missing `TWELVEDATA_API_KEY` is named outright, because a selected-but-
  unconfigured provider refuses every reading rather than quietly falling back to invented prices.
  A change takes effect at the next grid boundary — **rounds already open keep the source they
  captured**. `docs/UPDOWN-ARCHITECTURE.md` §3 has the measured reason the feed is the default.
- **Add chain → Margin % (optional)** — the per-chain override; blank inherits the product default.
- **Chains table → Margin column** — each chain's effective band (its override, else the default, tagged `·def`).
- **Chains table → Void rate** — voids ÷ resolved over the last 50 rounds for that chain (amber at ≥ 40%). This
  is the feedback loop for the lever: a high void rate means the margin is too wide for that asset/duration —
  tighten it there without touching the other chains.

The `%` ↔ bps conversion lives in `src/app/admin/updown/actions.ts` (`Math.round(pct × 100)`, guarded so a
stake-only chain edit never clears an existing override); the void-rate sample is computed read-only in
`src/app/admin/updown/page.tsx` from `roundStore`.

## Where every piece lives

| Concern | Symbol | File |
|---|---|---|
| Margin resolver (chain override → default) | `marginBpsForChain(chain, cfg)` | `src/lib/server/updown-config.ts` |
| **The target maths (pure)** | `computeTargets(openPrice, marginBps, asset)` → `{margin, upTarget, downTarget}` | `src/lib/server/updown-config.ts` |
| Product default + validation | `UpDownConfig.defaultMarginBps`, `setUpDownConfig`, `checkMarginBps` | `src/lib/server/updown-config.ts` |
| **The outcome rule (pure)** | `decideOutcomeByTargets(close, up, down)` | `src/lib/server/updown-service.ts` |
| Legacy fallback (null targets) | `decideOutcome(open, close, minMove)` | `src/lib/server/updown-service.ts` |
| Freeze targets at open + criterion text | `openRound` | `src/lib/server/updown-service.ts` |
| Resolve by targets / fallback + evidence | `closeRound` (`useTargets = round.upTarget != null`) | `src/lib/server/updown-service.ts` |
| Storage | `StoredRound.{marginBps,upTarget,downTarget}`, `StoredChain.marginBps` | `src/lib/server/updown-dal.ts` |
| DB columns | `UpDownRound.{marginBps,upTarget,downTarget}`, `UpDownChain.marginBps` (Decimal(24,8)/Int, nullable) | `prisma/schema.prisma` + `migrations/20260728150000_updown_margin` |
| Board → card threading | `BoardRound.{upTarget,downTarget}`, `toBoardRound` | `src/lib/server/updown-board.ts` |
| **Player card — "Target to win" band** | `UpDownCard` (`upTarget`/`downTarget` props; `Up ≥` / `Down ≤` + `± buffer`) | `src/components/updown/updown-card.tsx` |
| Detail hero + settlement proof | `PriceHero` target lines + proof rows | `src/components/updown/price-hero.tsx`, `src/app/updown/[roundId]/page.tsx` |
| Label copy | `udWinTarget` (EN/SW/ZH) | `src/lib/i18n-dict.ts` |

## Player display (what the bettor sees)

The two frozen targets are surfaced on every player surface, matching the PDF's Up/Down target
breakdown and the approved paper prototype:

- **Board card** — a "Target to win" header (`± <buffer>` = base × margin) over **two colour-coded
  tiles** that echo the Up/Down bet buttons: `↗ UP · ≥ $<upTarget>` (emerald) and `↘ DOWN · ≤ $<downTarget>`
  (rose), matching the approved paper prototype including its arrows. Hidden when the price/targets aren't
  confirmed or the round is settled/void. Fixed 50/50 grid with the price stacked under the label → no
  overflow at 360px even for 6-figure assets; verified across EN/SW/ZH. Spec:
  `docs/design-system/v2-2026-07-27/02-components/_specs-as-delivered/D1-updown-card-spec.md`.
- **Round detail** — the price hero draws the up/down boundary lines with their prices; the
  settlement proof states `≥ upTarget` / `≤ downTarget` beside the open/close.

The tick **floor**: `computeTargets` never lets the margin fall below the asset's minimum move
(`minMoveTicks × 10^−decimals`), so a degenerate (near-zero) margin can't be decided by sub-tick noise.

## What this does NOT touch (containment)

The margin only changes **which outcome is selected** (UP/DOWN/VOID). The money math is unchanged:
`buyPosition` / `settleMarket` / `payout.ts` are pool-and-outcome driven and never read a price. Pari-mutuel
payout, the winner floor, the capped-commission fee (13%), one-sided refunds, and the audit chain are all
as before. The `× 1.4 est.` headline is a display estimate of payout, unrelated to the price band. Up & Down
stays contained to `productLine: "UPDOWN"`.

## Backward compatibility

Rounds opened before this ships have `upTarget/downTarget = null`; `closeRound` detects that and falls back
to the legacy `openPrice ± minMove` rule. No data backfill; the migration is additive nullable columns.

## Tests (the guard)

- `scripts/updown-engine.test.mts` (`npm run test:updown-engine`, 86 assertions) — the PDF example frozen on
  the round, UP/DOWN/VOID at the boundaries, in-band VOID refunds in full, DOWN→NO, the legacy fallback,
  **money conservation under the margin model** (drift 0), and the **freeze** property (a mid-round config
  change can't move a live round).
- `scripts/updown-config.test.mts` (`npm run test:updown-config`, 77 assertions) — `computeTargets` = the PDF
  example, scale-invariance, the tick floor, `marginBpsForChain`, config validation (whole bps 0–2000, 0
  disables), and the per-chain override stored + resolved.

Any change to the outcome math MUST keep both suites green (they run inside `test:all` + `predeploy`).
