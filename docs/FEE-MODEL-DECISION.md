# Fee-model decision: loser-based fee (Jay proposal) vs live capped-commission

**Status:** OPEN — awaiting owner ruling
**Raised:** 2026-07-22, from `Proposal/50pick Calculations.xlsx` (accountant Jay)
**Owner:** Ali
**Scope:** Decision record only. **No code has changed.** The live money path is unchanged.

## The question
Jay's spreadsheet proposes charging the house fee as a flat **13% of the losing pool**
(Platform 3% + Operator 10%). The live engine charges **`min(10% of total pool, ⅓ of the
smaller pool)`**. Should we adopt Jay's basis?

## The two rules
| | Jay (proposed) | Live (`src/lib/payout.ts:11-42, 80-82, 252-275`) |
|---|---|---|
| Fee | `0.13 × losingPool` | `min(0.10 × pool, (1/3) × min(yesPool,noPool))` |
| Outcome-dependent? | **Yes** (loser is known only post-result) | **No** — outcome-neutral by construction |
| Winner floor (payout ≥ stake) | Holds (fee ≤ prize) | Holds (ceiling guarantees it) |
| Taxes | not modelled | TRA 10% + GBT 5% taken from our fee, not the player (`payout.ts:70, 424-432`) |

## Worked comparison — YES 16,000 / NO 650,000 (pool 666,000)
| Outcome (pool-implied prob) | Jay fee | Live fee | Jay rake % of prize | Live rake % of prize |
|---|---:|---:|---:|---:|
| YES underdog wins (2.4%) | 84,500 | 5,333 | 13.0% | 0.8% |
| NO favourite wins (97.6%) | 2,080 | 5,333 | 13.0% | 33.3% |
| **Expected (prob-weighted)** | **≈ 4,060** | **5,333** | flat 13% | 0.8%–33.3% |

Recompute: `node -e` with `liveFee=min(.10*666000,(1/3)*16000)`; Jay expected =
`P(YES)*.13*NO + P(NO)*.13*YES` = `0.26 * (YES*NO/pool)`.

## Trade-offs
**For Jay's model**
- One flat, promotable promise: "you always keep 87% of your winnings."
- Gentler on players when a favourite wins (13% vs the live 33% ceiling on a thin prize).
- Simple to explain to players and to the accountant.

**Against Jay's model**
- **Outcome-dependent fee** — same final pools yield a different fee per result. The live
  design is deliberately outcome-neutral and the pari-mutuel **licence rests on that**
  (`payout.ts:57-60`, `docs/F6-LIQUIDITY-DESIGN.md §3.1`). Changing this likely needs a
  compliance/licence sign-off — the biggest blocker.
- **Not a revenue gain.** Weighted by realistic (pool-implied) odds the expected take is
  comparable, and *lower* than live on the example above (4,060 vs 5,333).
- **Higher variance** — house revenue swings hard with the result (84,500 vs 2,080),
  which is worse for forecasting.
- Heavier on players when an upset wins (13% of a large prize vs the live 0.8%).

## Recommendation
**Keep the live model.** Jay's basis is not more lucrative in expectation, adds revenue
variance, and — decisively — is outcome-dependent, which cuts against the outcome-neutral
property our current licence design relies on. If the flat-13% *promise* is attractive for
marketing, revisit only with an explicit compliance review, and note the live model already
supports the promise "we never take more than a third of what you win" (`payout.ts:32-35`).

## Owner ruling
**Ali, 2026-07-23 — ADOPT Jay's loser-share model.** Despite the analysis above (comparable
expected revenue, outcome-dependence), the owner has decided to make `loser-share` the model
for new polls: fee = 13% of the losing pool (Platform 3% + Operator 10%), and players see a
fixed 1.5× "possible winnings" estimate pre-bet with a disclaimer.

Implemented **versioned, no mixed maths**: the model is frozen per poll (`feeSnapshot.feeModel`,
`v:2`), so only polls created from 2026-07-23 use it; every existing poll keeps
`capped-commission`. Admin-managed at /admin/config → Fee model (kit Select + Toggle, a
model-switch confirm that warns on EITHER direction, and a per-model description). The product
does NOT brand the model "Jay" — it is `loser-share` in UI + code; "Jay" is only the proposer,
recorded here. Accountants reconcile per poll via the **"Settlement fees by poll"** card on
/admin/finance (model + fee + operator net per settled poll, per-model totals). Full record + the
two compliance overrides (outcome-neutrality, D3) are logged in `docs/COMPLIANCE-DECISIONS.md`
(2026-07-23 entry). Money conservation + winner floor proven under the new model
(`scripts/loser-share-fee.test.mts`, `money-invariants`, `ledger`, `money-e2e` real Postgres).
