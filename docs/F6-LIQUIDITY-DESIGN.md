# F6 · Seeded / guaranteed liquidity — compliance & risk design

> **Status: DESIGN ONLY. No code has been written.** The backlog requires this:
> *"Plan this one carefully with compliance first; may need Ali/regulator input
> before build… produce the mechanic + risk/accounting/compliance model in
> planning; only build once the model is signed off."*
>
> **Bottom line: I recommend we do NOT build F6 as house-backed liquidity.**
> The reasoning is below. There is a cheaper, safer way to solve the same problem.
> Author: Claude · 2026-07-13 · for Ali's decision.

---

## 1 · The problem F6 is trying to solve (it is real)

A fresh market is thin. Two bad things follow, and both are already visible in our
own code:

**(a) One-sided markets earn the operator nothing.** If every bet lands on one
side there is no opposing pool to pay from, so we refund everyone at 0% fee
(`market-service.ts:1269-1339`, audit `market.resolved.one_sided_refund`). The
player is made whole — good — but the operator earns **zero**. Every one-sided
market is a market we ran for free.

**(b) A winner on a heavy favourite can LOSE money.** Our payout is whole-pool
pari-mutuel:

```
grossPool   = yesPool + noPool
winningPool = the pool on the winning side
fee         = tax 4% + commission 3% + reserve 2% + aggregator 0%  = 9%
netPool     = grossPool × (1 − 0.09)
payout      = (stake / winningPool) × netPool
```

As a market leans, `winningPool → grossPool`, so `payout/stake → 0.91`. A player
who is **right** walks away with **91% of their stake**. `market-config.ts:284-287`
already knows this and labels it `fair` / `thin` / `negative` via `houseLean()`.

That is the cold-start ceiling on volume. It is worth solving.

---

## 2 · What already exists (the surprising part)

**A `HousePoolLedger` table is already in the production database, and no code
touches it.** `prisma/schema.prisma:1084-1099`, migrated in
`20260610120000_entity_tables_phase0`. Its enum names the exact F6 lifecycle:

```prisma
enum HousePoolEntryType {
  TOP_UP        // operator funds the liquidity pot
  SEED_OUT      // pot stakes into a market
  SETTLE_RETURN // seed comes back (won)
  LOSS_ABSORBED // seed lost
  RESERVE_FEE
  WITHDRAW
  CASHOUT_FEE
}
```

`grep HousePool | SEED_OUT | LOSS_ABSORBED` across `src/` → **zero matches.**
Someone scoped this before and stopped. I think they stopped for the reason in §3.

Also: `traderSeeds` (which the backlog calls "display only") is confirmed
harmless — it returns the first 3 **real** bettor ids for the avatar crest on a
card (`market-service.ts:539-550`). It touches no money. It is not a precedent.

---

## 3 · Why house-backed liquidity is the wrong shape for THIS product

### 3.1 It destroys outcome-neutrality — the defining property of pari-mutuel

Today the operator takes a **fixed 9% rake and does not care who wins.** That
neutrality is the whole reason a pool-betting licence is a lower-risk instrument
than a bookmaker's: the house has no position, so it has no incentive to
influence an outcome.

The moment the house stakes into the pool, its P&L depends on which way the market
resolves. Economically the product stops being pari-mutuel and starts being a
**book**. That is a different licence class and a materially higher integrity bar.
This is not a technicality we can paper over in the UI.

### 3.2 It contradicts a rule we already enforce — and the house cannot recuse itself

Our own settlement code, `market-service.ts:1149-1175`:

> *"Officer-conflict hard-block: an officer who holds a position in this market
> **MUST NOT** resolve it — they have a financial interest in the outcome. This is
> a **POCA §16 / GBT licensing requirement**."*

We block a **person** with a stake from resolving. Under F6, the **house** holds a
stake in every seeded market — and the only people who can resolve it are the
house's own officers. There is nobody to hand it to.

Worse: the rule is enforced per-natural-person (`p.userId === opts.officerId`). A
house seed booked under a synthetic user id would **pass the literal check while
violating the principle exactly.** If we build F6 naively, our own conflict guard
silently stops protecting us. That is the single most dangerous property of this
feature.

### 3.3 Every payout-guarantee variant has a perverse incentive

I looked for a variant that keeps the house outcome-neutral. **There isn't one.**

- *House stakes both sides equally* → not neutral, because the payout depends on
  the ratio of the pools, and player money is asymmetric.
- *House guarantees a payout floor (tops winners up to 1.0×)* → the top-up is only
  needed when the **heavy** side wins. So the house pays less if the **minority**
  side wins → the house is financially better off resolving against the crowd.
- *Seed withdrawn before settlement* → then it never provided payout liquidity at
  all; it only decorated the odds, and pulling it changes the payouts.

Any mechanism where the house's cash flow varies with the outcome hands the house
a reason to prefer one outcome. Bounded and formulaic is better than unbounded and
discretionary — but it is not zero, and "small conflict of interest on a
real-money licensed product" is not a position I would want to defend to the GBT.

### 3.4 It corrupts the regulator-facing numbers

Every statutory figure we produce is derived from **player** `Transaction` rows,
and GGR is defined as `stakes − payouts` (`report-money.ts:82-107`).

A house seed is not a player transaction. So either:
- we book it **outside** `Transaction` → it is invisible to every report, and our
  GBT return understates turnover; or
- we book it **as a synthetic player** → it **inflates `stakes`, inflates
  `payouts`, and corrupts `holdPct`** — the metric whose own docstring says
  *"near-constant; drift = alarm"* (`report-money.ts:15`). We would be
  deliberately poisoning our own fraud alarm.

Ring-fencing is therefore mandatory, not optional: `HousePoolLedger` would have to
be a **separate accounting dimension explicitly excluded from GGR**, and
`report-money.ts` would need a house-exclusion filter. That is real work and a
permanent source of reconciliation risk.

---

## 4 · Recommendation

**Do not build house-backed liquidity.** Solve the cold-start problem with
mechanisms that cost the house nothing and keep it outcome-neutral:

| # | Mechanism | What it fixes | Effort |
|---|---|---|---|
| **R1** | **Minimum-liquidity gate ("book-building")** — a market accepts bets but does not *lock in* until both sides clear a floor by selection-close. If it doesn't, it voids to a **100% refund** — which is exactly what we already do today, only now it is **disclosed up-front instead of being a surprise at settlement.** | The one-sided case, honestly | S |
| **R2** | **Honest payout-ratio disclosure at bet time** — we already compute `houseLean() → fair/thin/negative`. Surface it harder: if a player's projected return is < 1.0×, say so plainly before they commit. | The "I was right and still lost money" trust-killer | S (mostly built) |
| **R3** | **Fewer, bigger markets** — concentrate liquidity instead of splitting it across many thin ones. This is a curation policy, not code. | Thin pools, at the root | Policy |
| **R4** | **Event-timed scheduling (this is F8)** — markets around real moments (Simba/Yanga, AFCON, rains) draw natural two-sided interest. **F8 is the real answer to the liquidity problem.** | Cold start, at the root | = F8 |
| **R5** | **Cap-and-disclose fee waiver** — on a thin market, waive part of our own 9% so winners clear 1.0×. Cost is bounded by fee revenue **on that same market** (worst case: we earn 0%, exactly like today's one-sided refund). | Negative-return wins | M |

**R5 is the closest honest thing to F6** — but note it still has the §3.3 incentive
(we keep more fee if the minority wins), so it must be **formulaic, capped, and
never discretionary**, and it should be disclosed. I would only do R5 *after*
R1–R4, and I would want it in writing to the GBT.

**My actual advice: ship R1 + R2, prioritise F8, and drop F6.** The liquidity
problem is a *demand* problem, and house money is a poor substitute for demand.

---

## 5 · If Ali decides to build it anyway — the mandatory conditions

I would not ship this without **all** of these:

1. **Written GBT approval** that operator participation in a pool it also settles
   is permissible under our licence class. This is the gate. Nothing else matters
   until it is answered.
2. **Ring-fenced accounting.** House money moves through `HousePoolLedger`
   (already migrated) and is **excluded from GGR/hold/turnover** in
   `report-money.ts`. Reconciliation test proving player-GGR is unchanged by any
   house seed.
3. **Fix the conflict guard to be entity-aware**, not person-aware — a market with
   a live house seed must be flagged, and the guard must not be silently
   satisfiable by a synthetic user id.
4. **Independent resolution for seeded markets.** If the house has a position, the
   house's officers should not be the sole resolvers — this needs an answer
   (external source auto-resolution, or a genuinely independent reviewer).
5. **Hard exposure caps** — per-market and aggregate — with a kill-switch, and
   `LOSS_ABSORBED` surfaced on the finance page.
6. **Public disclosure** on any seeded market ("this market includes operator-
   provided liquidity"). If we would be embarrassed to show it, we should not do it.

---

## 6 · Three defects found while researching this (unrelated to F6, worth fixing)

These are live today and I did not go looking for them:

1. **🔴 The tax base is inconsistent — two different answers in a regulator-facing
   return.** The ledger books the TRA/GBT levy on the **3% commission slice**
   (`ledger.ts:191-192` → TRA = 10% × 3% = **0.3% of gross**). The statutory Daily
   Operations report books the same levy on **GGR ≈ the whole 9%**
   (`reports/catalogue.ts:525-538` → TRA = 10% × 9% = **0.9% of gross**). That is a
   **3× discrepancy** between our books and our statutory return. One of them is
   wrong and I don't know which — it needs a tax/legal answer, not an engineering one.

2. **🔴 `/admin/finance` shows a FABRICATED tax number.** `admin/finance/page.tsx:46-48`
   computes `taxAccrued = ggr × 0.05` with the comment *"placeholder formula"*. It is
   presented to the owner as real. This violates our own never-fabricate rule and I
   would fix it immediately (show the real computed levies, or an empty state).

3. **🟠 The cash-out fee is documented as revenue but is not.** `market-config.ts:27-31`
   says the 9% cash-out fee is *"booked to the house reserve as operator revenue"*.
   The ledger says the opposite (`ledger.ts:272-288`): the fee *"was never removed
   from the pool — it stays distributed among remaining participants."* And GGR counts
   `CASHOUT` as a **payout**, which *reduces* GGR. So the fee is invisible in every
   direction and the config docs are misleading.

Also noted: `houseAccountBalances()` (`ledger.ts:394`) has **zero call sites** — the
house ledger is written but never surfaced anywhere. Worth putting on the owner
dashboard (F7).

---

## 7 · Decision needed from Ali

- [ ] **A.** Accept the recommendation — drop F6, do R1 + R2, prioritise F8. *(my advice)*
- [ ] **B.** Pursue F6 — in which case the **first** action is a written question to
      the GBT (§5.1), not code.
- [ ] **C.** Build R5 (capped fee waiver) only.

And separately, regardless of F6: **fix defect #2 (the fabricated tax figure) now**,
and get a ruling on **defect #1 (the tax base)**.
