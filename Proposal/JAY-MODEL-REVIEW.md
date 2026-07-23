# Review of "50pick Calculations.xlsx"

**To:** Jay
**Re:** Your payout / fee model for 50pick
**Date:** 2026-07-22

Thanks for this — the workbook is clear and, importantly, the core engine you've laid
out is the *right* model. Below is what your sheet does, how it lines up with what
50pick runs in production today, and the two places where your sheet is a **proposal
that differs** from the live system (so we can decide those deliberately).

---

## 1. What your sheet models

A **pari-mutuel (pool) market** on a Yes/No question:

- Everyone's stake goes into a pool. In your example: **YES pool = 16,000**,
  **NO pool = 650,000**, total **666,000**.
- **Winners get their stake back, plus a pro-rata share of the losing side's pool**
  (share = your stake ÷ winning-side pool).
- A **13% fee** (Platform 3% + Operator 10%) is taken off the "net winnings", which
  you define as the **losing pool**.
- You show players an **"estimated possible winnings" of 1.5× their stake** (the
  "0.5 | 0.5" odds), with a note that the real figure may be more or less.

## 2. This matches how 50pick already works — you re-derived it correctly ✅

The live engine (`src/lib/payout.ts`) is exactly this shape:
- Stakes are protected — a winner is **never** paid below their stake (the code
  refuses to settle if that would happen).
- Winners split the pool pro-rata by stake.
- Money conserves exactly (no shilling minted or lost — largest-remainder rounding).
- One-sided market (nobody on the other side) → **everyone refunded in full, 0 fee**.

So the mechanism is sound and we're aligned on it. The two items below are where your
sheet proposes something **different** from what's live, and both are worth a conscious
decision rather than a quiet switch.

---

## 3. Difference #1 — the FEE basis (this is the real proposal)

| | **Your model** | **50pick live** |
|---|---|---|
| Fee rule | **13% of the losing pool** | **min( 10% of total pool , ⅓ of the smaller pool )** |
| Depends on the outcome? | **Yes** — the loser changes with the result | **No** — reads the two pool sizes only |
| Taxes (TRA 10% + GBT 5%) | not separated | come **out of our fee**, never the player |

On your own example (YES 16,000 / NO 650,000):

| Outcome | Your fee | Live fee |
|---|---:|---:|
| YES (underdog) wins | **84,500** | 5,333 |
| NO (favourite) wins | **2,080** | 5,333 |

**Two things to note, because the headline is not "your model earns more":**

1. **In expectation the two are close — live is even slightly higher here.** If we
   weight by the pool-implied odds (NO is a 97.6% favourite because that's where the
   money is), your model's *expected* fee is **≈ 4,060** and the live model's is
   **5,333**. So your approach is **not** a revenue increase on this market; it's a
   *different distribution* of the same rough take. (An earlier off-the-cuff estimate
   I gave assumed a coin-flip 50/50 and was wrong — corrected here.)

2. **What actually changes is *who* pays and *how steady* it is.** As a share of the
   prize the winners share:
   - Your fee is a **flat 13%** every time — simple to promise ("you keep 87% of what
     you win").
   - The live fee is **0.8%** when an underdog wins a big pool, but **33%** when a
     favourite wins a thin pool (it hits the "⅓ of the smaller side" ceiling).

   So versus live, your model is **gentler on favourite-wins** and **heavier on
   upset-wins**, and the house take **swings with the result** instead of being fixed.

**The catch with an outcome-dependent fee.** Because your fee is charged on the
*losing* side, it can only be computed *after* the result is known — so the same final
pools yield 84,500 or 2,080 depending on who wins. The live model is deliberately
**outcome-neutral** (same fee either way), and our pari-mutuel licence design leans on
that property (`payout.ts:57-60`). Moving to a loser-based fee is therefore not just an
accounting tweak — it likely needs a compliance sign-off. That's the main reason I'd
flag this for an owner decision rather than adopt it.

## 4. Difference #2 — the "1.5× estimated winnings" display ❌ (don't ship as-is)

This is the one I'd push back on. Showing a **fixed** 1.5× ("0.5 | 0.5") number is
misleading in a pool game, and your own numbers show why:

| Player | Shown "possible winnings" | Actually receives | Off by |
|---|---:|---:|---|
| Jimmy (YES, staked 1,000) | 1,500 | **36,344** | under-states ~24× |
| Jay (NO, staked 100,000) | 150,000 | **102,142** | **over-states ~47%** |

The over-statement is the dangerous one — advertising a payout higher than what we pay
is a consumer-protection problem. Separately, **50pick's licence review (policy "D3",
May 2026) requires that we show *no* payout number before a bet is placed** — the app
currently shows only "if your side wins, you share the pool" and reveals the exact
figure once betting closes.

If we ever want to show a pre-bet number, it must be the **live pool-based projection**
(which the engine already computes) with an "estimate, will change" caveat — never a
fixed multiplier detached from the pools.

---

## 5. Bottom line

- **Engine: spot on.** We're using the same pari-mutuel model you've described.
- **Fee basis (13% of loser): a genuine choice, not a bug** — but it's outcome-dependent
  (a licence concern) and, contrary to first impression, **not more lucrative** in
  expectation. Worth a formal owner + compliance decision.
- **The fixed 1.5% "possible winnings" display: please don't** — it's misleading and it
  conflicts with our licence policy. Use the live projection if we show anything.

Happy to walk through any of the arithmetic.
