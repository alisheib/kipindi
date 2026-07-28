# Up & Down — pricing & the margin (winning-boundary) model

> The math behind how an Up & Down round is won, and where every piece lives. Money-critical
> — read this before touching `decideOutcome*`, `computeTargets`, or the round's price fields.
> Shipped 2026-07-28 (the "50pick Dynamic Engine" pricing model). Prior behaviour (a sub-tick
> dead-band only) is preserved for any round opened before this and for `marginBps = 0`.

## The model in one paragraph

At a round's **open**, the asset's live spot price is frozen as the **base** (`openPrice`, from a
confirmed observation). We compute a **margin = base × marginBps / 10000** (default `marginBps = 50`
= **0.5%**, the "50pick" factor), and set two **winning boundaries**, frozen onto the round:
**upTarget = base + margin**, **downTarget = base − margin**. At **close**, the settlement price
(`closePrice`, spot at the boundary) is compared against those frozen targets:

```
close ≥ upTarget          → UP   (YES pays)
close ≤ downTarget        → DOWN (NO pays)
downTarget < close < upTarget → VOID ("no-move") — every stake refunded in full
close or targets missing  → VOID ("source-failed")
```

The PDF example: base **4120**, 0.5% → margin **20.6**, up **4140.6**, down **4099.4**. A close of
4145 is UP; 4095 is DOWN; 4110 (moved < 20.6) VOIDs and refunds.

This is a **generalisation of the pre-existing behaviour**, not a new money path: the engine already
VOIDed+refunded when the move was inside a sub-tick dead-band (`minMove`). We replaced that absolute
dead-band with a **percentage margin** and now expose the two target prices.

## Why VOID in the band (not "any move decides")

The targets are *winning boundaries* — you must reach one to win. A move smaller than the margin
means neither side clearly won, so the round VOIDs and **refunds every stake in full** (no fee). This
matches the PDF ("upper/lower winning boundary") and the engine's existing `no-move ⇒ VOID` rule.
⚠️ **Economic consequence:** a 0.5% band voids far more rounds than the old 1-tick band, especially on
short/low-volatility rounds — and a void earns the house nothing. The levers to manage that are the
per-chain margin override and the void-rate readout (below).

## The numbers are DATA — editable, with a per-chain override

- **Global default**: `UpDownConfig.defaultMarginBps` (default **50** = 0.5%), edited at `/admin/updown`
  (the Thresholds form). `0` disables the %-band and reverts to the source's minimum-move rule.
- **Per-chain override**: `UpDownChain.marginBps` (`null` = inherit the default). Edited per
  asset×duration, so a fast 5-min chain can run a tighter margin than a 30-min one.
- **Frozen per round**: the margin + both targets are stamped onto the `UpDownRound` at open. **A later
  config edit never moves a live round's boundaries** — a bet is priced by the rule in force when it
  was taken. (Proven by `updown-engine.test.mts` §11.)

Validation: `marginBps` is a whole number of basis points, **0–2000** (0–20%). Above 20% a round would
almost never reach a boundary and would void perpetually.

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
