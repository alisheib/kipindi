# Up & Down — the final setup

**Written 2026-08-06 (session 31), from measurements against production, not from intent.**
Ali: *"knowing now what data we have, what capabilities we have, analyse the whole flow and find
the perfect final setup."*

This document exists because the campaign has finally accumulated enough real data to answer the
design questions with numbers instead of opinions. Every figure below is measured; the scripts
that produce them are named so any of it can be re-run and disagreed with.

---

## 0. The four facts everything else follows from

| # | Measured | Source |
|---|---|---|
| **1** | **The money is clean.** 0 rounds stranded · 0 open positions at risk · **0 winners ever paid below stake** · 0 negative wallets | `s31-updown-player-safety.cjs` |
| **2** | **The feed is not the problem.** BTC 86/91 (94.5%) · XAU 57/58 (98.3%) · **0 FAILED readings** · 100% today · **0 of 35 voids are feed-caused** | `s31-feed-provider-report.cjs` |
| **3** | **At the tick floor, no-move becomes extinct.** BTC median move is **$40 (3m) → $198 (60m)** against a **$0.02** floor — **100% of pairs clear it at every duration** | `.qa-s31/volprofile.cjs` |
| **4** | **One-sidedness is the whole remaining problem.** Of 35 rounds that ever carried a stake: **15 (43%) refunded one-sided**, 10 (29%) paid, 8 (23%) no-move, 2 (6%) operator | `.qa-s31/whynopay.cjs` |

⛔ **Fact 3 kills a question we thought was open.** The band does not need tuning per asset or per
duration. It needs to be *the tick floor*, always, and the wide options need to stop existing —
they produced **100% of the no-move refunds**, including a round that moved **$242** and told the
player the price had not moved.

⛔ **Fact 4 is the product.** Everything else is noise around it. A player stakes, waits, and
gets their money back — not because anything failed, but because they were alone.

---

## 1. The decisions

### D1 · The band is the tick floor, and the console stops offering rope

**Now:** the Add-chain form offers *Smallest possible (recommended)* plus wider bands, and both
live chains were set to **0.05%** — which at BTC's price is **±$32.25 against a $0.02 floor,
1,613× wider**. That single field caused every no-move refund the product has.

**Final:** the tick floor is the default *and* the only unrestricted choice. A wider band remains
reachable, but the form must state its measured cost **before** it is chosen, from the asset's own
history — the same pattern already built for duration (E-84/E-89):

> *"At 0.05%, **76%** of BTC rounds in the last 24h would have refunded. At the tick floor, 0%."*

⭐ **Why advise rather than remove:** a wider band is the correct tool for a genuinely thin or
jumpy asset, and this platform already believes in measuring rather than hardcoding (F-1, E-84).
Removing the option trades one unexplained rule for another. What was missing was never the
option — it was the consequence.

### D2 · The card tells the truth about the other side, *before* the bet

**Now:** the card shows a **flat `× 1.5 est.`** — `estimatedWinningsRate` is a config constant
(`market-config.ts:238`), not derived from the pool. It reads the same when the other side holds
TZS 36,000 and when it holds **nothing**.

⛔ **On a pari-mutuel game this hides the single strongest reason to take the thin side**, and the
thin side is 43% of the problem. The platform already computes the honest number — `projectedPayout`
— and already uses it for `myExactPayout` at the lock. It simply never shows it *before* the bet,
which is the only moment it could change anyone's mind.

**Final, two parts:**

1. **A live, pool-implied multiplier.** Backing the thin side of a 90/10 pool should read **`× 4.2`**,
   not `× 1.5`. That is not a promotion; it is what the player would actually be paid.
2. **An explicit empty-side state.** When one side has **zero** stake, the card says so plainly:
   *"Nobody has backed UP yet — if that does not change, your stake comes back."*

⭐ **Together these convert a post-hoc disappointment into an informed choice, and create the
organic incentive to fill a thin side.** The market can partly solve its own problem if the price
signal is honest. ⛔ This must precede D3, because it changes how much house float is needed.

### D3 · The house seeds the thin side — sized *after* D1 and D2

Ali's decision of 2026-08-04, still unbuilt, and still the only thing that touches the remaining
refunds. Unchanged in substance:

- a float source with **per-round and per-day exposure caps**;
- seeding at the **LOCK**, never at open — seeding at open is gameable;
- house positions kept **out of player metrics and leaderboards**;
- house P&L **split from commission** so the accountant can see both.

⛔ **Do not size it before D1 and D2 have run for a day.** Today's 43% one-sided rate is
contaminated: it was measured on a board whose band was refunding rounds that *did* have both
sides, and whose card was actively concealing the reward for taking the thin side. Size the float
against the rate that survives those two fixes, or over-provision against a number that no longer
exists. ⚠️ A `house.pool.state` key already exists in `SystemConfig` — read it before designing a
second float.

### D4 · Reach

ETH and SOL are **disabled**, so F-1's SOL short-duration risk is not live. Leave them off until
each has ≥20 confirmed readings and the measured gate clears it — the machinery for that already
exists and works.

---

## 2. Where each decision lands

| Surface | Change | Decision |
|---|---|---|
| **`/admin/updown` · Add-chain form** | band defaults to tick floor; each wider option carries its **measured refund rate** for that asset | D1 |
| **`/admin/updown` · Edit band (in-cell)** | same advisory — the in-cell editor is how both live chains were set | D1 |
| **`/admin/updown` · chain row** | surface the chain's **live refund rate split** (`no-move` vs `one-sided`), so an operator sees the consequence of their own band without leaving the page | D1 |
| **Player card (`updown-card.tsx`)** | replace the flat `estMultiplier` with the **pool-implied** figure; add the **empty-side** sentence | D2 |
| **Round page (`/updown/[roundId]`)** | same two, plus the stake panel — a player who taps through must see the identical number | D2 |
| **Round page · settlement proof** | already states the one-sided reason correctly (E-65/E-87). **No change.** | — |
| **Result moment (E-105)** | already distinguishes WIN / LOSS / refund in their own words. **No change.** | — |
| **`/admin/insights` · GGR tile** | still counts open unsettled stake as revenue — a money-reporting call, **Ali's** | open |
| **Accountant / reports** | house float P&L must be separable from commission | D3 |

⭐ **Three things are already right and must not be touched:** the settlement proof, the refund
reason copy, and the result moment. They were each fixed with real money behind them and re-opening
them is how a campaign undoes itself.

---

## 3. Sequence, and why this order

1. **Set the two live chains to the tick floor.** Minutes, no deploy, no money risk. Removes every
   *non-credible* refund immediately — the $242 round that claimed the price had not moved.
2. **Re-measure.** `s31-updown-player-safety.cjs` + `.qa-s31/whynopay.cjs`. Now the one-sided rate
   is clean.
3. **D2 — the honest multiplier and the empty-side state.** Small build, player-facing, and it
   changes the input to D3.
4. **Re-measure again.** How much did an honest price signal fill the thin side by itself?
5. **D1 — the band advisory in the form.** Stops recurrence when the next operator adds a chain.
6. **D3 — the house float.** The real build, now sized against a number that means something.

⛔ **Steps 1, 2 and 4 are not ceremony.** The whole reason this document can be written at all is
that the campaign measured before it argued, and the two largest mistakes it made this week were
both over-claims from a population that was not the one that mattered.

---

## 3b. ⚠️ Gaps found on a second pass — including one in this document's own §1

Ali asked whether §1–§3 seals it. It does not, and the honest list is short but load-bearing.
Each of these would have surfaced later as a defect; they are cheaper as design.

### G1 · "Tick floor, always" is a BTC conclusion, and gold does not share it

§1's D1 says the band needs no per-asset tuning. **That was measured on Bitcoin and it does not
generalise.** Consecutive-reading headroom above each asset's own floor:

| asset | floor | median \|move\| | **headroom** | worst case (p10) | clears the floor |
|---|---|---|---|---|---|
| **BTC** | $0.02 | $47.98 | **2,399×** | **399×** | 99% |
| **XAU** | $0.40 | $3.98 | **10×** | **2.1×** | **96%** |

⛔ Gold has **240× less headroom than Bitcoin**, and that is at an 18-minute cadence. Scale to a
3-minute round and its p10 move (~$0.34) falls **below its own $0.40 floor** — so a material share
of short gold rounds would refund `no-move` *even at the tick floor*. Bitcoin cannot reproduce this
because 399× of worst-case headroom absorbs any duration.

⭐ **The missing control, and the platform is one axis short of it.** `symbolReadiness` /
`validateSymbolDuration` already gate a pairing on whether the asset can be **priced in time**
(F-1, E-84). Nothing gates on whether it **moves enough to decide**. Those are two different
failure modes with the same symptom, and the second is unguarded. **The duration gate needs a
second axis: measured `p10 |move| ÷ tick floor` for that asset at that length**, refusing or warning
below a threshold. The data to compute it already exists in `UpDownObservation` — this is the same
build as D1's advisory, one column wider.

### G2 · D2 and D3 fight each other, and the loser is the player's trust

If the house seeds the thin side (D3) and that seed **shares in the winnings**, then the pool-implied
multiplier a player saw while betting (D2) is **higher than what they are actually paid** — the house
diluted it after the fact. ⛔ **That is a false money statement on the exact surface D2 exists to make
honest**, and it is the E-39/E-65 class this campaign has already paid for three times.

⭐ **The resolving rule, and it must be stated before D3 is built: the house seed is returned at
stake and takes no profit.** It exists to give a round a counterparty, not to compete with players
for the pot. A seed that wins gets its stake back; a seed that loses funds the winners. This keeps
D2's number true and makes the float's cost explicit and boundable, which is also what the
accountant needs.

### G3 · The multiplier moves, and the copy has to own that

Pari-mutuel odds change with every subsequent bet. A player sees `× 4.2`, taps, and three more
join the thin side — their real return is lower. ⛔ It cannot be locked without abandoning
pari-mutuel. **So the number must be labelled as live and moving**, and the product must keep
doing what it already does right: at the **LOCK** the pool freezes and `myExactPayout` replaces the
estimate with arithmetic. D2 is an honest *estimate* upgrade, never a promise — and the existing
lock behaviour is what makes that safe.

### G4 · The adversarial case D3 creates

Once the house reliably seeds the thin side, **a player who always takes the fat side is playing
the house at roughly even odds, minus fee**. That is not a bug — it is what a market maker is —
but it means the per-round and per-day exposure caps are not hygiene, they are **the only control**.
They must be sized as a loss limit, not as a convenience, and house exposure needs its own alarm.

### G5 · RG has not been considered in any of this

A fast-cycling game, a celebration popup, and a newly-prominent `× 4.2` on the thin side together
read differently from any one of them alone. ⭐ **The multiplier is information, not promotion:**
no colour escalation, no size jump, no "big win" framing, and it must not out-weigh the stake
control beside it. The existing rule stands — the win celebrates, **the loss is not its mirror**.

### G6 · A missed celebration is never re-offered

`sessionStorage` marks a round announced, so a player on another tab when their round settles
never sees the moment. **Recoverable** — the round page, the history and the wallet all carry the
result — so this is noted, not filed. Worth a decision only if the moment is ever considered
load-bearing.

---

## 4. What we deliberately do NOT do

- **Do not widen the band to "make rounds decide".** It is backwards: the band is what makes a
  decision *honest*, and the tick floor already yields 100% decisiveness.
- **Do not promote the multiplier.** D2 shows what a player would be paid, not a headline. A
  celebrated figure that is not the figure paid is the E-39/E-65 class of defect.
- **Do not seed at open.** Only at the lock.
- **Do not re-open** the settlement proof, refund copy, or the result moment.
- **Do not chase the ~100 rounds that carried no stake at all.** No band or float touches those;
  that is reach and liquidity, and it is a different conversation.
