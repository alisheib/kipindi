# 50pick — Fee model rebuild. Session prompt.

> Paste everything below into a fresh session. It is self-contained.

---

You are working on **50pick** (repo `F:\kipindi-main`, branch `main`, Node 24, Next.js + Postgres/Prisma).
50pick is a Tanzania-licensed **pari-mutuel** YES/NO prediction game. Players stake into one pool;
winners split it. "50pick" is the product name — "kipindi" is only the repo name, never the game.

This is a **final, signed-off decision by Ali (owner)**. It is not open for redesign. Implement it
completely, everywhere, and finish the project.

---

## 1 · Why we are doing this

**A player who WON was paid less than he staked.** Real case: YES 300,000, NO 10,500 (pool 310,500).
He staked 100,000 on YES. YES won. He was paid **93,150** — a **6,850 loss on a correct call**.

Root cause: the fee is charged on the **whole pool**, which includes the winner's own returned stake
(`settledPayoutWhole` in `src/lib/server/market-config.ts`). For a winner merely to break even, the
losing side must be ≥ the fee rate as a share of the pool. Here it was 3.4%. **Every single player on
the winning side was mathematically guaranteed to lose.** The fee (31,050) was three times larger than
the entire prize (10,500), so it could only come out of the winners' own stakes. The code documents
this as accepted behaviour (`market-config.ts` ~L308, `docs/F6-LIQUIDITY-DESIGN.md` L25). It is not
acceptable and it is being removed.

---

## 2 · THE DECISION (final)

> **Our commission is 10% of the pool, but never more than a third of the smaller side.**

```
pool        = yesPool + noPool
smaller     = min(yesPool, noPool)
commission  = commissionRate  * pool        // commissionRate  = 0.10
ceiling     = feeCeilingRate  * smaller     // feeCeilingRate  = 1/3  (0.3333…)
fee         = min(commission, ceiling)      // <-- the whole fix
netPool     = pool - fee
payout(p)   = round(p.stake / winningPool * netPool)     // winners only; losers get 0
```

**Why a ceiling at all:** the smaller side *is* the prize — it is all the money the winners can win.
Without a cap, a 10%-of-pool fee on a lopsided poll grows **bigger than the entire prize**, so it eats
into the winners' own stakes. That is the bug.

**Why exactly a third:** at a ceiling of one half we would take exactly as much as every winner put
together, and anything above that takes more than the winners — indefensible. At a third, **the winners
always keep at least twice what we take.** It gives a promise we print in the Terms and never break:
**"We never take more than a third of what you win."**

**No cliff, no `if`:** "the full 10% whenever the smaller side is ≥ 30% of the pool" and "never more
than a third of the smaller side" are the *same rule*. They cross over seamlessly at exactly **70/30**
(10% of 100,000 = 10,000; a third of 30,000 = 10,000). Write it as `min(commission, ceiling)` and the
switchover happens by itself. **Do NOT implement it as a threshold branch** — a threshold is gameable.

### Worked numbers (pool 100,000) — use these as test fixtures

| YES / NO | smaller as % of pool | fee | winner (big side) gets back |
|---|---|---|---|
| 50 / 50 | 50% | 10,000 | 1.80x |
| 60 / 40 | 40% | 10,000 | 1.50x |
| **70 / 30** | **30%** | **10,000** | **1.29x** — the seam |
| 80 / 20 | 20% | 6,667 | 1.167x |
| 90 / 10 | 10% | 3,333 | 1.074x |
| 95 / 5 | 5% | 1,667 | 1.035x |
| 100 / 0 | 0% | 0 | full refund |

**The reported poll:** YES 300,000 / NO 10,500 (pool 310,500). fee = min(31,050, 3,500) = **3,500**.
netPool 307,000. The 100,000 stake pays **102,333** — it paid **93,150** under the old rule, a 6,850
loss on a correct call. Fee is **3,500 whether YES or NO wins.**

### Invariants — these are the point of the work. Test them.

1. **A WIN position is NEVER paid below its stake.** Provable: `fee ≤ (1/3)*smaller ≤ losingPool`, so
   `ratio ≥ 1 + (2/3)*smaller/max > 1`. **This holds for ANY commissionRate an admin can type** — the
   ceiling seals the system against admin error too. Assert it in code and throw if violated.
2. **Outcome-neutral.** The fee is computed from the two pool numbers only and never reads the
   outcome. It must be byte-identical for a YES win and a NO win on the same final pools. This is what
   the pari-mutuel licence rests on (`F6 §3.1`) — do not break it.
3. **No mint / no leak.** `sum(payouts) + fee == pool` (allow rounding dust).
4. **Balanced poll:** when `yesPool == noPool`, `fee == commissionRate * pool` exactly.
5. **One-sided:** `smaller == 0` → `fee == 0` → everyone refunded. This now falls out of the maths;
   keep the explicit branch only for audit clarity.

### Taxes — out of OUR fee, never from the player

```
traLevy  = traTaxOnCommissionRate * fee   // 0.10 -> TRA
gbtLevy  = gbtLevyOnCommissionRate * fee  // 0.05 -> GBT
operator keeps fee - traLevy - gbtLevy    // 85% of the fee
```
Player payout is untouched by these. Example: fee 10,000 → TRA 1,000, GBT 500, we keep 8,500.

### Early exit (cash-out)

- Inside the **5-minute free window**: full refund, zero fee.
- After it: player receives `stake * (1 - cashOutFeeRate)`, `cashOutFeeRate = 0.10`.
- **The fee goes to the HOUSE.** Today it does not — the code deducts it from the player then leaves
  it in the pool, where the remaining players receive it (`ledger.ts` ~L272-288). The config docstring
  (`market-config.ts` ~L27-31) claims the opposite. **We currently earn ZERO on every early exit. Fix
  this.** Book it to `HOUSE:COMMISSION`, and apply the TRA/GBT levies to it like any other fee.
- The stake leaves the pool entirely.
- **NEW GUARD:** block an exit that would drop the player's side to zero. Today one man can exit, make
  the poll one-sided, and force a **full refund of everybody** — a 300,000 poll earns us nothing, and a
  group could do it deliberately to void a poll they are losing.

### Withdrawal

- `withdrawalFeeRate = 0.01` (1% of the amount withdrawn).
- Of that, `withdrawalGatewayShareRate = 0.005` goes to the payment gateway; we keep the other 0.5%.
- **DELETE the 15% withholding tax entirely.** Today `wallet-service.ts` (~L472) calls
  `computeWithdrawalTax(amount, amount)`, withholding 15% of **every** withdrawal — including money a
  player deposited and never bet. Deposit 100,000, bet nothing, withdraw → he receives **85,000**. The
  code comment calls itself "naïve". Ali's decision: **taxes are only ever on our commission.** A
  player pays nothing but the 1%. Remove `computeWithdrawalTax` and its hardcoded `0.15`.
  > ⚠️ Raise once with Ali before shipping: the 15% sits in the code citing the Income Tax Act. Removing
  > it is a legal call, and he has made it — but flag it in your summary so it is on the record.

---

## 3 · Admin rates — final list. Nothing hardcoded, anywhere.

**KEEP / ADD** (these are the seed defaults for the DB):

| Field | Default | Meaning |
|---|---|---|
| `commissionRate` | **0.10** | our cut, on the pool |
| `feeCeilingRate` | **1/3 (0.3333…)** | **NEW.** fee can never exceed this share of the smaller side. Store the exact fraction, not a rounded 0.33. |
| `cashOutFeeRate` | **0.10** | early exit, after the grace window. Goes to the house. |
| `freeExitGraceMinutes` | **5** | **NEW field** — currently hardcoded `GRACE_PERIOD_MS` in `market-service.ts` |
| `withdrawalFeeRate` | **0.01** | **NEW.** charged to the player on withdrawal |
| `withdrawalGatewayShareRate` | **0.005** | **NEW.** the part of the 1% that goes to the gateway |
| `traTaxOnCommissionRate` | 0.10 | of OUR fee |
| `gbtLevyOnCommissionRate` | 0.05 | of OUR fee |
| `thinProfitRatio` | 1.05 | still drives the "thin upside" warning |
| `minStake` | 100 | |
| `maxStake` | 100_000 | |
| `objectionWindowHours` | 24 | |
| `starterBalanceTzs` | 0 | |

**DELETE COMPLETELY** — from `RateConfig`, the admin UI, the persisted `SystemConfig` JSON, the client
constants in `src/lib/payout.ts` (L23-26), and every consumer:

- `taxRate` (4%)
- `reserveRate` (2%)
- `aggregatorRate` (0–1%)
- the hardcoded `0.15` withholding tax in `src/lib/server/payments.ts` (~L89)
- `OPERATOR_MARGIN` (dead, `market-service.ts` ~L39) and `CASHOUT_SLIPPAGE` if now redundant

**Validation:** `commissionRate` 0–30%, `feeCeilingRate` 0–100%. **Warn above 50%** — at a ceiling of
half we take exactly as much as all the winners combined, and above half we take more than they do. At
100% a winner on a thin poll profits nothing. The combined-fee ceiling check (`t+c+r+a < 0.30`) is
obsolete — replace it.

---

## 4 · Rates stick to the poll (Ali's explicit requirement)

Today **nothing** is stored on the poll about its rates — settlement reads **live** config, so changing
a rate in admin silently reprices bets **already placed**. The admin page itself claims the opposite in
writing (`admin/config/page.tsx` ~L207-219: *"Positions already opened keep the fee model that was in
effect when they were placed"*). **That claim is false today.**

- Add `PredictionMarket.feeSnapshot Json?` to `prisma/schema.prisma`.
- Stamp it at market creation from `getEffectiveConfig()`.
- **Settlement, cash-out and every payout preview read the snapshot, never live config.**
- A rate change affects **future polls only.**

### Old data / migration

- **Settled markets:** leave alone. History is history.
- **LIVE / OPEN markets with positions already placed:** backfill a snapshot of the **OLD** rates
  (`commissionRate: 0.09`) **plus the new `feeCeilingRate: 1/3`**. This is deliberate: the ceiling can
  only ever *reduce* the fee versus what those players were quoted, so they are paid **more, never
  less** — nobody can complain, and the in-flight bug is killed immediately. Do not migrate them to
  10%, that would pay them less than they agreed to.
- Write the migration + a backfill script, and state in your summary exactly how many rows moved.

---

## 5 · Everywhere the change must land

Read these first — a prior exploration confirmed the line numbers, but re-verify.

**Core math** (make `src/lib/payout.ts` the single source of truth; `market-config.ts` must import it —
today the formula is duplicated in both and the rates are re-declared as client constants):
- `src/lib/payout.ts` — `payoutFor`, `leanFor`, the `DEFAULT_*_RATE` constants
- `src/lib/server/market-config.ts` — `RateConfig`, `DEFAULT_GLOBAL_CONFIG`, `validate`,
  `payoutForWhole` (~L313), `settledPayoutWhole` (~L333), `houseLean` (~L348)
- `src/lib/server/market-service.ts` — `settleMarket` (~L1313), `buyPosition`, `cashOutValue` (~L974),
  `settleDueMarkets`, `autoResolveExpiredDemoMarkets` (~L582 — duplicates the settlement loop and is
  **missing the one-sided refund branch**; fix the divergence)
- `src/lib/server/ledger.ts` — `settlementPayoutEntries` (~L184), `cashoutEntries` (~L272). Delete dead
  code while there: `grossShare`, `totalFeeRate`, `settlementLossEntries` (always returns `[]`).
  `houseAccountBalances()` (~L394) has **zero call sites** — surface it on `/admin/finance`.
- `src/lib/server/wallet-service.ts` (~L472), `src/lib/server/payments.ts` (~L87)

**The `"negative"` lean level is now mathematically unreachable.** Delete it from the `LeanLevel` type
so the compiler finds every consumer. Keep `fair` / `thin`.

**Player UI** — every surface that shows a fee, payout, odds or warning:
- `src/components/markets/house-lean-warning.tsx` — remove the `negative` branch. Its docstring
  promises a rose tone the JSX never implements; align them.
- `src/components/markets/conviction-dial.tsx` (~L476-487 math, ~L1336-1360 payout block + warning).
  Note `payoutDisplay` (~L487) is **dead code** — computed, never rendered.
- `src/components/markets/bet-confirm-modal.tsx` (~L239-272). `payout`/`ratio`/`net`/`netColor` are
  received and never rendered.
- `src/components/markets/position-card.tsx` (~L76-84) — OPEN positions currently show nothing
- `src/components/markets/resolution-panel.tsx` (~L154-172) — the `resPlatformFee` line item
- `src/components/markets/market-card.tsx` (~L100-196) — the `HowItWorks` popover
- `src/components/markets/sell-button.tsx`, `sell-confirm-modal.tsx` — early-exit fee copy
- `src/components/onboarding/first-visit-primer.tsx` (~L138-188) — **duplicates its copy OUTSIDE i18n**
  in a hardcoded `CARDS` array, plus a hardcoded caption. Both must change.
- `src/app/markets/[id]/page.tsx` — ~L97 the catch-branch **falls back to a hardcoded 4% fee** while
  settlement takes the real rate. Make it fail loudly, not guess. Also ~L287-318, ~L426-439.
- `src/app/positions/page.tsx`, `src/app/help/page.tsx`, `src/app/legal/terms/page.tsx`
  (fee prose hardcoded per-locale in JSX: EN ~L56-75, SW ~L148-167, ZH ~L237+)

**i18n — `src/lib/i18n-dict.ts`** (EN ≈ L1-1180, SW ≈ L1181-2325, ZH ≈ L2326-3465). One file, three
locales, all three must move together.
- **Now false, must be rewritten or deleted:** `market.heavyLeanWarning` (*"a winning share may be
  below your stake"* — now impossible), `market.refundRiskNote`, `market.crowdedWarning`. The honest
  message on a lopsided poll is now **"upside is thin because the other side is small"**, never
  "you may lose".
- **Hardcoded "9%" that will lie the moment admin retunes the rate** — must interpolate the live value:
  `market.hedgeBothBody`, `market.hedgeOppositeBody`, `dialog.freeExitBody` (× 3 locales), and
  `src/lib/server/notification-service.ts` ~L122 (untranslated, EN-only).
- **Delete:** `wallet.taxNotice` / `wallet.taxBody` (no withholding tax any more), rendered at
  `src/app/wallet/withdraw/page.tsx` ~L153. Replace with the 1% withdrawal fee disclosure.
- **Factually wrong FAQs:** `help.faq2a` (says the quote holds 5 seconds; `QUOTE_HOLD_MS = 10_000`),
  `help.faq6a` (calls the cash-out fee a "small slippage buffer"), `help.faq8a` (claims tax +
  commission rates are visible on every market — they are not).
- Also: `market.resPlatformFee`, `dialog.payoutHowItWorks`, `dialog.payoutCalcBody`,
  `dialog.poolSharePayout`, `dialog.poolShareIfWins`, `common.howItWorksBody`, `common.howItWorksFine`,
  `common.liveExplainer`, the `toast.*` cash-out strings.

**Admin:**
- `src/app/admin/config/config-form.tsx` — remove the deleted fields; add `feeCeilingRate`,
  `withdrawalFeeRate`, `withdrawalGatewayShareRate`, `freeExitGraceMinutes`. `MarketOverrideForm`
  currently cannot override `cashOutFeeRate` / `thinProfitRatio` even though `getEffectiveConfig`
  merges them — expose them.
- `src/app/admin/config/page.tsx` — the KPI row and the **"Whole-pool distribution model"** explainer
  (~L56-76) document the OLD formula and the *"winning positions can yield a small net loss"* edge case
  we are deleting. Rewrite both.
- **Add a live simulator** to the config page: type YES pool / NO pool / stake → show fee, netPool,
  payout, ratio, house take, and the worst-case winner ratio across the lean range. This is how Ali
  sees a rate change before he saves it. **Guardrail: refuse to save a config where a winner could be
  paid below stake.**
- `src/app/admin/finance/page.tsx` (~L46-48) — computes `taxAccrued = ggr * 0.05` with the comment
  *"placeholder formula"* and shows it to the owner **as if it were real**. Show the real computed
  levies or an empty state. Never fabricate.
- `src/app/admin/markets/[id]/page.tsx` — add a lean / thin-poll indicator to the pool breakdown.

---

## 6 · New feature — the exact payout, disclosed when betting closes

Ali's request. Once a poll closes to betting the pools are **frozen**, so the payout stops being a
projection and becomes an exact number.

- On close, compute every open position's exact `payoutIfWin` from the frozen pools + the poll's fee
  snapshot, **using the same function that settles**. Never a separate estimate. Never AI — it is fixed
  arithmetic, and what we tell a player must equal what we pay him, to the shilling.
- Persist to `Position.potentialPayout`. Notify each player: *"Betting is closed. If your side wins you
  receive X."*
- Show it on `position-card.tsx` (OPEN positions currently show nothing) and the market page.
- **Admin:** flag lopsided / thin polls at close so they can be managed.

Note there is an existing **"D3" policy** (cited as *license review 2026-05*) that hides the payout
figure **before** a bet is placed. This change discloses it only **after betting closes**, so it does
not touch D3. Leave the pre-bet behaviour alone unless Ali says otherwise.

---

## 7 · Tests — extend the COMMITTED suite, do not build a throwaway

`scripts/money-invariants.test.mts`, `cashout-fee.test.mts`, `settlement-gate.test.mts`,
`ledger.test.mts`, `emergency-void.test.mts`, `bonus-betting.test.mts`, `concurrency.test.mts`.
The regression suite lives at `qa/` — run `npm run qa` (501 checks). **Never rebuild a throwaway suite.**

Add:
1. **Winner floor** — for every WIN position, `finalPayout >= stake`. Sweep the lean range 50/50 → 99/1,
   and sweep `commissionRate` from 0 to 30% to prove the ceiling seals it against admin error.
2. **Outcome-neutrality** — the fee is identical for a YES win and a NO win on the same final pools.
3. **The 70/30 seam** — at exactly 70/30, `commission == ceiling` (both 10,000 on a 100,000 pool);
   assert continuity across the line — no jump in fee or payout as the pools drift across it.
4. **Balanced no-regression** — `yesPool == noPool` → `fee == commissionRate * pool`.
5. **Cash-out** — the fee now lands in `HOUSE:COMMISSION` and no longer leaks into the pool; the
   side-collapse guard fires.
6. **Withdrawal** — a player who deposits and never bets withdraws his full amount minus only the 1%.
7. Fixtures: use the exact numbers from the table in §2 and the reported poll.

---

## 8 · Verify for real, then finish

- Screenshot against **`next build && next start`**, never `next dev` (dev serves stale CSS and produces
  false overflow).
- Audit **360 / 768 / 1280 / 1920**.
- **UI-kit discipline is strict**: use the existing kit primitives only, extend the kit rather than
  writing ad-hoc styles, and keep every surface consistent and responsive in every detail.
- Drive the real flows end to end: seed the reported poll (YES 300,000 / NO 10,500, stake 100,000 on
  YES), settle YES, confirm **102,333**. Settle NO instead on the same pools, confirm the house take is
  **the same 3,500**. Deposit and withdraw without betting, confirm the full amount back minus 1%.
  Change a rate in admin and confirm every screen and all three languages move with it — and that an
  already-open poll does **not**.
- Run `npm run qa` and the full money suite. Report failures with the output; do not paper over them.
- **Nine-role gate before ship:** architect, routing, SW engineer, UI/UX, graphic designer, art
  evaluator, QA, user, shop owner. Ship only if it passes all nine.

## 9 · Docs to bring in line

- `docs/F6-LIQUIDITY-DESIGN.md` — §1(b) *"A winner on a heavy favourite can LOSE money"* is now solved;
  update it and record the decision.
- `CLAUDE.md` — the "default 9% margin" line and the tax-model section.
- `src/app/legal/terms/page.tsx` — the fee prose, all three locales.
- The decision doc for the team is at `docs/50pick-fee-decision.docx`.

## 10 · Known issue to raise, not to guess at

`docs/F6-LIQUIDITY-DESIGN.md` §6.1: the ledger books the TRA levy on the **commission slice** while the
statutory Daily Operations report books it on the **whole GGR** — a **3× discrepancy between our books
and our regulator filing**. That is a tax/legal question, not an engineering one. Surface it to Ali;
do not silently pick one.

---

**Start by reading the files in §5 to confirm the line numbers, then plan, then build it all.**
