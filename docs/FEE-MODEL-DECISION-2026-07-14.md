# The fee model — decision record

**Date:** 2026-07-14 · **Decided by:** Ali (owner) · **Status:** SHIPPED

---

## Why

**A player who WON was paid less than he staked.**

Real poll: **YES 300,000 / NO 10,500** (pool 310,500). He staked **100,000 on YES**.
YES won. He was paid **93,150** — a **6,850 loss on a correct call**.

The fee was **9% of the whole pool**, and the whole pool *includes the winners' own
returned stakes*. On that poll the fee came to **31,050** against a prize — the
entire NO side — of only **10,500**.

> **The fee was three times larger than everything there was to win.**

So it could only come out of the winners' own money. **Every single player on the
winning side was mathematically guaranteed to lose.** For a winner merely to break
even, the losing side had to be at least 9% of the pool. Here it was 3.4%.

The code documented this as accepted behaviour, warned players about it in three
languages (*"a winning share may be below your stake"*), and shipped it.

---

## The decision

> ### Our commission is 10% of the pool, but never more than a third of the smaller side.

```
pool        = yesPool + noPool
smaller     = min(yesPool, noPool)        # the prize
commission  = commissionRate * pool       # 10%
ceiling     = feeCeilingRate  * smaller   # a third
fee         = min(commission, ceiling)    # <- the whole fix
netPool     = pool - fee
payout(p)   = round(p.stake / winningPool * netPool)
```

**Why a ceiling at all.** The smaller side *is* the prize — it is all the money the
winners can win. Without a cap, a 10%-of-pool fee on a lopsided poll grows **bigger
than the entire prize**, so it eats into the winners' own stakes. That is the bug.

**Why exactly a third.** At a ceiling of one half we would take exactly as much as
every winner put together; above that, more than they do — indefensible. At a third,
**the winners always keep at least twice what we take.** It gives us a promise we
print in the Terms and never break:

> **"We never take more than a third of what you win."**

**No cliff, no `if`.** "The full 10% whenever the smaller side is ≥ 30% of the pool"
and "never more than a third of the smaller side" are the **same rule**. They cross
over seamlessly at exactly **70/30** (10% of 100,000 = 10,000; a third of 30,000 =
10,000). `min()` finds the seam by itself. A threshold would be a step function, and
a step function is gameable by a bettor who nudges the pools across the line.

---

## The numbers (pool 100,000) — all verified in `scripts/fee-model.test.mts`

| YES / NO | smaller, as % of pool | fee | winner (big side) gets back | our share of the losers' money |
|---|---|---|---|---|
| 50 / 50 | 50% | 10,000 | 1.80× | 20% |
| 60 / 40 | 40% | 10,000 | 1.50× | 25% |
| **70 / 30** | **30%** | **10,000** | **1.29×** — *the seam* | **33%** |
| 80 / 20 | 20% | 6,667 | 1.167× | 33% |
| 90 / 10 | 10% | 3,333 | 1.074× | 33% |
| 95 / 5 | 5% | 1,667 | 1.035× | 33% |
| 100 / 0 | 0% | 0 | full refund | — |

Our bite of the losers' money climbs from 20%, reaches a third, and **never goes
higher however sick the poll gets**. No row pays a winner less than he staked.

**The reported poll:** fee = `min(31,050, 3,500)` = **3,500**. netPool 307,000. The
100,000 stake now pays **102,333**. The fee is **3,500 whether YES or NO wins.**

---

## The invariants — these are the point of the work

1. **A WIN IS NEVER PAID BELOW ITS STAKE.** Because `fee ≤ (1/3)·smaller ≤ losingPool`,
   the ratio is `≥ 1 + (2/3)·smaller/larger > 1`. **This holds for ANY
   `commissionRate` an admin can type** — it is the *ceiling* that seals the system,
   so admin error cannot resurrect the bug. Enforced at runtime by
   `assertWinnerFloor()`, which **throws** rather than underpay: refusing to settle
   is recoverable, paying a winner 93,150 on a 100,000 stake is not.
2. **OUTCOME-NEUTRAL.** `poolFee()` takes the two pool sizes and **has no outcome
   parameter**. The fee is byte-identical for a YES win and a NO win on the same
   final pools. The pari-mutuel licence rests on this (F6 §3.1).
3. **NO MINT / NO LEAK.** `Σ payouts + fee == pool`, to rounding dust.
4. **BALANCED POLL:** `yesPool == noPool` → `fee == commissionRate × pool`, exactly.
5. **ONE-SIDED:** `smaller == 0` → `fee == 0` → everyone refunded. Falls out of the
   maths; nothing is special-cased.

---

## What else this fixed

| | |
|---|---|
| **Rates now stick to the poll** | Settlement read **live** config, so changing a rate in admin silently repriced bets **already placed** — while the admin page claimed in writing that it didn't. Each poll now freezes its rates at creation (`feeSnapshot`). A rate change affects **future polls only**. |
| **The early-exit fee is revenue** | It was deducted from the player and then **left in the pool**, where the *remaining players* collected it. **50pick earned zero on every early exit.** It now goes to `HOUSE:COMMISSION`. |
| **Side-collapse guard** | The last player on a side could sell out, make the poll one-sided, and force a **full refund of everybody** — retroactively voiding a poll he was losing. Refused. |
| **The 15% withholding tax is deleted** | It taxed **every** withdrawal, including a player's own untouched deposit: deposit 100,000, bet nothing, withdraw → receive **85,000**. Now: a 1% fee, and nothing else. |
| **The 4% phantom fee** | `markets/[id]/page.tsx` had a catch-branch that fell back to a **hardcoded 4% fee** while settlement used 9%. Silent, and wrong in the player's favour on screen but against him in the wallet. The fallback is gone — the rates ride on the market row, so there is nothing to fetch and nothing to invent. |
| **The duplicated settlement loop** | `autoResolveExpiredDemoMarkets` carried a hand-copied settlement loop that claimed to be "the exact settlement codepath" and wasn't — it was **missing the one-sided refund branch entirely**. It now calls `settleMarket()`. One settlement codepath. |
| **The exact payout, disclosed at close** (§6) | Once betting closes the pools are frozen, so the payout stops being a projection. Every player is now told the **exact** amount he receives if he is right — computed by the *same function that settles*, so what we say and what we pay cannot disagree. |

---

## 🔴 ESCALATED TO ALI — three decisions that are yours, not engineering's

### 1. ✅ DECIDED & DONE (2026-07-15): the exit window replaces the guard

Ali's design, built and verified: **cash-out is a fixed window from when the bet
was placed — free for `freeExitGraceMinutes` (5), paid at `cashOutFeeRate` (10%)
for `paidExitWindowMinutes` (15), then LOCKED and the bet rides to settlement.**

**Why it works.** Every abusive exit needs a *late* exit — you can only tell you're
losing once the real-world event is near, which is hours or days after the bet.
Locking the exit ~20 minutes in means that by the time anyone could know the
outcome, their door shut long ago. The gutting attack and the void attack are both
dead, and the eventual winner is no longer trapped (the old last-shilling guard is
gone).

**Short / ending-soon polls (Ali's edge case), handled two ways:**
1. Selling always shuts at **selection close**, whichever comes first — a poll that
   closes 8 min after your bet gives 5 free + 3 paid, then locks.
2. **Runway rule** — cash-out is only offered if the bet had at least the free
   window of betting time left when it was placed. Bet on a 3-minute poll, or 2
   minutes before close, and there is **no cash-out at all**: you took a
   last-moment position, you ride it. This is what stops a short/no-gap poll being
   sold at the wire when the outcome is becoming visible.

All three windows are admin-editable (`freeExitGraceMinutes`,
`paidExitWindowMinutes`, `cashOutFeeRate`) and frozen onto each poll. Verified
end-to-end: free at 2 min, 10% at 10 min, LOCKED at 25 min; a 3-min poll and a
late bet both offer no exit; the hour-later gutting attempt is refused.

The old side-collapse guard is **removed** — it only blocked the last shilling, was
bypassable for 100 TZS, and trapped the winner. Tests updated
(`scripts/cashout-fee.test.mts`).

---

<details><summary>Original problem (for the record) — the guard only blocked the last shilling</summary>

### The guard did NOT stop this (superseded by the window above)

The brief asked for a guard that *"blocks an exit that would drop the player's side
to zero"* — because the last player on a side could otherwise sell out, make the
poll one-sided, and force a **full refund of everybody**, voiding a poll he was
losing. **That guard is built and it does stop exactly that.**

**But an adversarial review found it only blocks the last shilling.** Reproduced
end-to-end through the real services:

| step | pools | result |
|---|---|---|
| Alice YES 100,000 · Bob NO 10,000 | 100,000 / 10,000 | Bob would win **106,667** |
| Alice tries to exit | — | **REFUSED** — the guard fires ✅ |
| Alice buys YES **100** (the minimum stake) | 100,100 / 10,000 | — |
| Alice exits her big position | **100 / 10,000** | **ALLOWED** — `100,100 − 100,000 = 100 > 0` |
| NO wins. Bob was right. | | Bob is paid **10,067** |

**For 100 TZS, Alice destroyed 96,600 of a correct caller's winnings.** Our own fee
collapsed from 3,333 to **33**. Inside the free-exit window it costs her *nothing*.

**Root cause is structural, not a coding slip:** cash-out returns the stake **at
par**, but that stake is what backs the other side's prize. **Any** threshold-at-zero
is gameable by sitting just above it.

**This needs your decision, because every fix is a business trade-off:**

| option | effect |
|---|---|
| **(a) Cap how far a side may shrink** — e.g. a side may never fall below X% of its high-water mark | Simple, non-gameable (the peak only rises). Needs one new column. But it traps players who want a legitimate exit. |
| **(b) Price cash-out against the pool**, not the stake | Economically correct, but re-opens the free-option problem that the selection-close lockout was built to close. |
| **(c) Charge an exit fee proportional to the damage** the exit does to the other side | Fairest, most complex. |
| **(d) Accept it and disclose it** | Cheapest. But it is a real way to hurt a winning player. |

*(Related: the same guard then **traps the victim** — Bob is now the sole NO stake,
so he cannot exit the poll Alice hollowed out.)*

</details>

### 2. ✅ DECIDED & DONE (2026-07-15): referral commission accrues at settlement

Ali's call: rework it. `onRecruitBet` no longer accrues commission — it fires only
the first-bet prize. Commission now accrues in a new `onRecruitSettlement` hook,
from **this position's actual share of the fee we charged** (`(stake/pool) × fee`),
called from `settleMarket` after the lock releases (it takes the referrer's wallet
lock). Verified: on the reported poll the referrer is paid **564** (his share of the
real 3,500), not 5,000; on a one-sided or voided poll he is paid **0**, because we
earned 0. The refund branches never reach the accrual, so a refunded poll accrues
nothing.

<details><summary>Original problem (for the record)</summary>

`onRecruitBet` accrues the referrer's cut against `stake × commissionRate` — the
**uncapped** fee. Under the capped model our real fee can be far lower (on the
reported poll we earn **3,500**, not 31,050), and on a **one-sided** poll we earn
**nothing** while this would still accrue.

It cannot be fixed at bet time: **the real fee is not knowable until the pools are
final.** (This is now done — see above.)

</details>

### 3. The tax base — ✅ DECIDED & DONE (2026-07-15): tax on what we KEEP

Ali's ruling: **taxes are 15% of the commission we actually keep** (10% TRA + 5%
GBT), and the rates live in admin config as the single source of truth.

The concrete bug this exposed: GGR was `stakes − payouts` and **did not net out
refunds**. A voided or one-sided poll returns every stake and we keep nothing — but
the stake was still in `stakes`, so GGR (and the TRA/GBT levy on it) was overstated
by the whole refunded amount. Under the capped model one-sided polls are common, so
we were over-taxing ourselves on a live basis.

Fixed everywhere GGR is computed (`report-money.ts`, `reports/catalogue.ts`):
`GGR = stakes − payouts − refunds`. GGR now equals the commission we kept, which is
the exact base the ledger already levies on — so **the report and the ledger agree
to the shilling.** Verified against real Postgres with a mixed workload:
two-sided fee 10,000 → report TRA 1,000 / GBT 500 == ledger TRA 1,000 / GBT 500 ==
15% of 10,000; the 160,000 in refunds from the one-sided and voided polls taxed at
zero.

> Note: this is the levy on OUR commission. It is a *separate* thing from the
> per-player **withholding** tax that was deleted (that one taxed a player's own
> money and is gone).
>
> **✅ The obsolete per-player "TRA Withholding Tax Remittance" report is REMOVED
> (2026-07-15, Ali's decision).** It filed a per-player withholding under Income Tax
> Act Cap 332 — a scheme we no longer operate, so every row was zero. Deleted the
> card (`admin/reports`, `admin/compliance`), the generator (`buildTraTax`) and the
> catalogue entry. Our real TRA obligation (10% of commission) is filed in the
> Daily Operations report alongside the GBT 5% levy.

---

## Legal — on the record

**Removing the 15% withholding tax is a legal call, not an engineering one.** The
code cited the Income Tax Act (Cap 332). Ali has made the decision — taxes are only
ever on 50pick's commission, never on a player's money — and it is recorded here.

**🔴 STILL OPEN, needs a tax ruling:** the ledger books the TRA/GBT levy on the
commission slice; the statutory Daily Operations report books it on GGR. That was a
**3× discrepancy** between our books and our regulator filing. The capped-fee model
narrows it, but *which base is correct* is a tax question. **It has deliberately not
been resolved in code** — picking one silently would be choosing our own tax base.
See `docs/F6-LIQUIDITY-DESIGN.md` §6.1.

---

## Proof

| | |
|---|---|
| `npm run test:fee-model` | 77 assertions: winner floor swept across the full lean range × every commissionRate 0–30%; outcome-neutrality; the 70/30 seam and its continuity; balanced; one-sided; no-mint; Ali's whole table; the reported poll end-to-end; rates-stick; the admin guardrail |
| `npm run test:withdrawal` | 16 assertions, incl. deposit → never bet → withdraw → **99,000** (was 85,000) |
| `npm run test:all` | 57/58 green incl. typecheck (`test:responsive` needs a live server) |
| **Real Postgres, real services** | Reported poll settled YES → **102,333**. Same pools settled NO → house takes the **same 3,500**. Ledger balances to zero. Deposit→withdraw → **99,000**. |
