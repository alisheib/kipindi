# 50pick — THE RULES

> **STATUS: 🟢 LAW. This file is the single authoritative statement of what 50pick charges,
> what it permits, and what it refuses.** Every other document links here rather than
> restating the numbers. If another document, a code comment, an admin screen or a player
> surface disagrees with this file, that other thing is a **defect** — fix it, and fix it in
> the same commit that finds it.
>
> ⛔ **Do not restate a rate anywhere else.** A number written twice is a number that will
> disagree with itself. Copy that must show a rate reads it from config; copy that cannot is
> listed in §7 as a known duplicate, with its file and line, so it can be found again.
>
> ⚠️ **Not to be confused with `docs/design-system/v2-2026-07-27/06-patterns-and-rules/RULES.md`,**
> which is the design-law file. A search for "RULES.md" hits that one first. This one is money.

Established 2026-08-14. Owner: Ali (Dar es Salaam). Enforcement and configuration for each
rule are named below; nothing here is a plan or a proposal.

### ⏳ ROLL-OUT STATUS — read this before quoting §1 as current behaviour

The rules below are **decided**. Some are still landing in code. A rule that is not yet live
is marked **⏳ LANDING** at its §2 entry with what remains; a rule with no marker is live and
verified on production. **⛔ Never delete a ⏳ marker without verifying on production** — this
file is worthless the moment it describes an intention as a fact.

| Rule | Status |
|---|---|
| Stake bounds 1,000 / 1,000,000 | ✅ live — config reconciled and read back from the production DB |
| Withdrawal fee 1.5% | ✅ live — production has charged 1.5% since before 2026-08-10 |
| Taxes only on our fee · free cancellation 5 min | ✅ live, unchanged by this programme |
| Our fee: 13% of the losing side, **both** games | ✅ **live, and now SETTLED ON BOTH PRODUCTS with real money.** Up & Down: Gold round #267 — fee **1,820.00 = 13% × 14,000**, payouts 20,180, residual 0.00. Long-form poll `mkt_3254d2723f3443358300` — fee **1,690.00 = 13% × 13,000**, payouts 12,069 + 4,827 + 2,414 = **19,310 = pool − fee**, residual 0.00, TRA 169 and GBT 85 taken from *our fee* only. ⭐ The winners' shares were 12,068.75 / 4,827.50 / 2,413.75 — they do not divide, so `allocateFeeShares`' largest-remainder path really was exercised and still summed exactly |
| Positions per market: unlimited, both sides | ✅ **live, verified on production 2026-08-14** — one player held BOTH sides of Up & Down round #268, and another held YES then added NO on a long-form poll; the wallet moved both times |
| Bonus wagering: one side only | ✅ **live, verified on production 2026-08-14** — the first two grants in production's history were issued, and `wageredTzs` did **not** move for the hedge or for a top-up taken while the opposite leg was open. A free exit gave the credit back. §2.5 |
| Failure messages explain themselves | ⏳ LANDING |

---

## §1 · THE RULE SET

| Rule | Value | Applies to |
|---|---|---|
| **Our fee** | **13% of the LOSING side** — Platform 3% + Operator 10% | **Both games — identical** |
| Tax on our fee | TRA 10% + GBT 5% **of the fee we earned**, never from a player's payout | Both |
| **Minimum stake** | **TZS 1,000** | Both |
| **Maximum stake** | **TZS 1,000,000 — PER BET**, not per player per market | Both |
| **Positions per market** | **Unlimited, either or both sides** | Both |
| **Bonus wagering** | Only **one side** of a market counts toward a bonus requirement | Both |
| Free cancellation | 5 minutes, full refund, then locked | Both |
| Withdrawal fee | 1.5% of the amount withdrawn (0.5% of it is the gateway's) | Platform |
| Failure messages | State the reason and the next step; severity must match — a fixable problem is a **warning**, not a red error | Whole player UI |

### Accepted consequences — recorded, and not to be re-opened

- **On a balanced Up & Down round our income halves** (26% → 13% of the losers' money).
  Deliberate: one charge model the customer can understand. Ali, 2026-08-14.
- **Per-bet cap + unlimited positions means total exposure on one market is NOT bounded by
  the maximum.** The player's balance and the daily loss limit are what bound it. ⛔ No
  surface may state the maximum in words implying it limits total exposure on a market.

---

## §2 · EACH RULE: decided, enforced, configured, stated

### 2.1 · Our fee — 13% of the losing side

> 🔴 **Up & Down is outcome-DEPENDENT under this model, by decision.** `capped-commission`
> read only the two pool sizes and was byte-identical whichever side won — the licence anchor
> in `docs/F6-LIQUIDITY-DESIGN.md` §3.1. `loser-share` charges a slice of whichever side LOST.
> Long-form polls have been outcome-dependent since 2026-07-23 under Ali's explicit override;
> 2026-08-14 extends that override to Up & Down so the platform has ONE posture. Recorded in
> full at `docs/COMPLIANCE-DECISIONS.md` § 2026-08-14 and flagged for the GBT file.

| | |
|---|---|
| **Decided** | Ali, 2026-08-14. Supersedes the 2026-07-24 ruling that gave Up & Down `capped-commission` at 13% of the pool with a ⅓ ceiling. Long-form polls have been on this model since 2026-07-23. |
| **Enforced in** | `src/lib/payout.ts` → `poolFee()`, the `loser-share` arm. **This is the only place the arithmetic exists**; client and server both import it. |
| **Configured in** | Polls: `SystemConfig["market.config"].global` — `feeModel`, `platformFeeRate`, `operatorFeeRate`, editable at `/admin/config`. Up & Down: `SystemConfig["updown.config"].defaultRateProfile` **and separately on every `UpDownChain.rateProfile` row** — the chains do NOT inherit a changed default. |
| **Frozen per market** | Every market stamps `PredictionMarket.feeSnapshot` at creation and settles by it **forever**. ⛔ A snapshot is never rewritten, backfilled or migrated. Changing a rate affects FUTURE markets only, and the two models never mix. |
| **Stated to players** | `/legal/terms` §4 · the in-app assistant's system prompt (`src/app/_actions/chat.ts`) · `/help` FAQ · the conviction dial's "how it works" hint. |
| **Stated to admins** | `/admin/config` (fee model + simulator) · `/admin/updown` · `/admin/markets/[id]`. |
| **Guarded by** | `npm run test:fee-model` · `npm run test:loser-share-fee` · `npm run test:money-invariants` · `npm run test:settlement-gate` · `npm run test:fee-model-caption` / `red:fee-model-caption` (the model NAMED on an admin screen is the model CHARGED) · `npm run test:thin-alert` / `red:thin-alert` (the lopsided-market alert, model-aware) |
| **Monitored by** | `market.selection_closed.thin_poll` — fires at selection-close on `oneSided`, `thinUpside` (a real position would be paid under `thinProfitRatio`) or `lopsidedBook` (the smaller side under 15% of the pool), and states the fee **per outcome** because under loser-share a single pre-outcome figure cannot exist. |

> 🔴 **THAT ALERT WAS SILENT FOR THREE WEEKS AND NOBODY COULD TELL.** It used to fire on
> `closeFee.capped`, and `capped` is a **capped-commission concept** — `poolFee`'s loser-share
> arm returns `false` for it always. So from 2026-07-23 it could only fire on a fully
> one-sided poll, and after A2 the same became true of every Up & Down round. It never
> errored; it simply stopped firing.
>
> ⛔ **And its payload was worse than its trigger.** `worstWinnerRatio` was derived from a fee
> computed with no winning side — which under loser-share is **zero** — so it OVERSTATED what
> a big-side winner would receive. On a 200,000/10,000 book it read exactly `1.0500`, at the
> thin floor, where the real figure is `1.0435`, under it. An officer would have been told the
> upside was fine. Both fixed 2026-08-14 (F1); the ratio now comes from `settledPayoutFor`,
> the function that actually settles.

> 🔴 **A NUMBER CAN BE RIGHT UNDER A LAW THAT IS WRONG.** `/admin/updown` priced its fee
> tile through the real `poolFee` and captioned it with the literal `capped-commission 13%`.
> When A2 landed, the value moved (1,300 → 650) and the caption could not: a correct figure
> under a retired rule, which is worse than a wrong one because an operator who checks the
> arithmetic finds it sound. Corrected 2026-08-14 (A4). Every fee caption is now derived
> from the same resolved rates the arithmetic uses — `describeFeeModel` in `payout.ts`.
>
> ⛔ **And the tile read `defaultRateProfile`, which no live chain reads.** All 16
> `UpDownChain` rows carry their own copy and do NOT inherit, so the one console that would
> have to notice a half-migrated board was structurally blind to it. `boardFeeSummary` now
> reads every configured chain — including STOPPED ones, which freeze their profile onto
> the first round a restart opens — and renders `split` rather than picking one.

### 2.2 · Taxes are only ever on OUR commission

A player is never taxed — not on a payout, not on a withdrawal, not ever. TRA 10% and GBT 5%
are levied on the fee *we* earned. Enforced in `payout.ts` → `levySplit`; rates in
`market.config` (`traTaxOnCommissionRate`, `gbtLevyOnCommissionRate`); admin-editable at
`/admin/config`. On a voided or one-sided market we keep nothing, so we are taxed on nothing.

### 2.3 · Stake bounds — TZS 1,000 to TZS 1,000,000, per bet

| | |
|---|---|
| **Decided** | Ali, 2026-07-26; re-affirmed and made a **rule** (not a default) 2026-08-14. |
| **Enforced in** | `src/lib/server/market-service.ts` → `buyPosition`, against the bounds `getEffectiveConfig` + `stakeBoundsForUpDownMarket` resolve for that market. The check is on a **single bet's** amount. |
| **The rule itself** | `PLATFORM_MIN_STAKE` / `PLATFORM_MAX_STAKE` in `src/lib/payout.ts`. The admin doors validate against these, so the platform cannot be configured out of its own rule: an operator may NARROW the window inside 1,000…1,000,000, never widen it. |
| **Configured in** | `SystemConfig["market.config"].global.minStake/maxStake` (`/admin/config`) and `SystemConfig["updown.config"].defaultMinStake/defaultMaxStake` (`/admin/updown`). All 16 Up & Down chains carry NULL min/max and inherit; `stakeBoundsFor` additionally FLOORS any chain at the product minimum, so a legacy row below the floor can never take a sub-floor stake. |
| **Migration** | `reconcileConfigDefaults` (v3) and `reconcileUpDownDefaults` (v3) raise a stored 500 → 1,000 and 100,000 → 1,000,000 on first read after deploy, and leave a deliberate custom value alone. |
| **Stated to players** | The stake panel and preset ladder derive their range from the same resolver the money path uses — one source, no display/enforcement split. |
| **Guarded by** | `npm run test:config` · `npm run red:stake-bounds` (6 mutations, incl. the exact 2026-08-14 state) · `test:updown-engine` §8B (floor-on-read for legacy rows) |

> 🔴 **THE TRAP THIS RULE WAS FOUND BY.** On 2026-08-14 the code default read `1_000`, a green
> suite asserted it read `1_000` — and **production had been charging a TZS 500 floor on both
> products since 2026-07-26**. `persist()` writes the whole config snapshot, so an unrelated
> save re-froze the old floor, and the v2 migration only moved a value sitting on exactly
> `100`. **A code default is not a live setting.** Verify a bound change by reading the DB.

### 2.4 · Positions per market — unlimited, either or both sides

> ✅ **LIVE, VERIFIED ON PRODUCTION 2026-08-14.** Driven with real money, not from a suite:
> **QA Fleet 09 held BOTH sides of Up & Down round #268** (YES 2,000 + NO 1,000) and both
> stakes stood; and **QA Fleet 01 held YES 3,000 then added NO 2,000** on
> `mkt_85d2b28535bcc68a86ae`, wallet 191,740 → 189,740, i.e. the money really moved. The
> hedge is accepted with no cap and no block.

A player may hold as many positions as they like on one market, on one side or on both. There
is no per-market cap and no hedging block. Enforced by the *absence* of a guard in
`buyPosition` — the "ONE ACCOUNT, ONE SIDE" block was removed 2026-08-14. See §2.5: the two
changes are inseparable.

| | |
|---|---|
| **Decided** | Ali, 2026-08-14, superseding the 2026-08-04 decision that added the guard. |
| **Guarded by** | `npm run test:updown-window` §6 · `npm run test:updown-quickbet` §4 · `npm run test:updown-engine` §8B · `npm run test:bonus-one-side` §1 |

> ✅ **AND A HEDGED HOLDER IS QUOTED BOTH OUTCOMES — Ali, 2026-08-14 (UD-20).** On a locked
> round the round page and the card each show two rows, one per outcome, priced by the money
> path's own `projectedPayout` from **that side's own stake**:
>
> ```
>   YOU HOLD BOTH SIDES          UP 7,000 · DOWN 3,000
>   If it closes UP     you get  11,487
>   If it closes DOWN   you get   4,842
> ```
>
> ⛔ **Not by resurrecting the single number.** `myExactPayout` used to price `up + down` as if
> it all sat on UP — on the figures above it would say **15,536**, overstating by 4,049 on a
> money surface (A-5). That field stays NULL for a hedge, permanently, and
> `npm run test:updown-hedge-quote` §1.5 fails if it ever learns to answer again.
> ⚠️ A one-sided holder gets the same two rows and their losing row reads **0** — simply true,
> and better than leaving it unsaid.
>
> ⚠️ **HEDGING IS A REAL MARKET POSITION, NOT A GUARANTEED LOSS — and no surface may say
> otherwise.** `test:updown-engine` 8b.12/8b.13 drive it: the same two legs return **+6,750**
> on one outcome and **−7,170** on the other, from the same pools through the same fee
> function. The retired player copy said *"hedging here locks in a loss"*, and a first draft
> of that very test asserted the same thing and went RED. On a lopsided market a small hedge
> on the thin side can pay many times both stakes.

### 2.5 · Bonus wagering — only one side counts

> ✅ **LIVE, VERIFIED ON PRODUCTION 2026-08-14 — the grants now exist.** This rule had no live
> subject until the GROWTH officer issued the **first two bonus grants in production's
> history** (TZS 10,000 × 5 to QA Fleet 01 and 02). Every figure below is read off the GRANT
> ROW by `scripts/live/ops/bonus-census.cjs`, never from a number a page rendered:
>
> | step | wallet cash | `wageredTzs` |
> |---|---|---|
> | grant issued | 194,740 | 0 / 50,000 |
> | YES 3,000 — first side | 191,740 | **3,000** |
> | NO 2,000 — the hedge | 189,740 | **3,000 — unchanged** |
> | YES 4,000 — a top-up while the opposite leg is open | 185,740 | **3,000 — still unchanged** |
>
> ⭐ The third row is the conservative form this section describes, caught live: the money
> moved 4,000 and the turnover counter did not advance by a shilling.
>
> **B1b, on a second player so the accrual was clean** — QA Fleet 02: bet YES 5,000, turnover
> 0 → **5,000**; free exit inside the window, turnover **5,000 → 0** and cash 200,094 →
> 205,094. The credit leaves with the stake.

A stake placed while the player holds an **OPEN position on the opposite side of that market**
accrues **no** turnover toward a bonus requirement.

⚠️ **That includes a top-up on the side they started on**, while the opposite leg is open. The
rule is deliberately the conservative form. The looser reading — *"credit whichever side they
were on first"* — still amplifies: UP 10,000 (credited) · DOWN 10,000 (not) · UP 10,000
(credited) yields **20,000 of turnover for 10,000 of net exposure**. This form can only ever
UNDER-credit, and no arrangement of bets turns a hedge into wagering progress. It is not a
trap: closing the opposite leg is free inside 5 minutes, and the next stake counts again
(`test:bonus-one-side` §2.5).

⛔ **This rule and §2.4 are one change and must never ship apart.** The window between them is
the exploit: at the agreed rates, a TZS 10,000 bonus with a 5× requirement clears for 3,250 of
fee — a 6,750 gift per grant, same day, no risk taken.

A player holding an unfulfilled grant who takes the opposite side is **warned before
confirming, and may proceed** — it is a warning, not a refusal (see §2.9).

> ✅ **Shipped 2026-08-14 (B2).** An inline warning on `/markets/[id]`, naming the amount
> they still have to wager, in EN/SW/ZH, shown ONLY to a player who actually holds an
> unfulfilled grant. ⛔ Computed on the READ path: `getBonusSummary` issues its own wallet
> read and would block on the bet's own uncommitted row — the P2028 self-deadlock at
> `bonus-service.ts:235-243`. That is the right place for it, because the SERVER applies
> this rule whatever the panel showed.
>
> ⚠️ **Production has ZERO grants and ZERO bonus balance**, so this surface has no live
> subject yet. Verifying it means granting a bonus to a QA-fleet player and driving it.

> 🔴 **AND A SECOND, INDEPENDENT ROUTE WAS FOUND IN THE SAME PLACE (B1b, 2026-08-14).**
> `cashOutPosition` never called `reverseWagering`. A player could bet, cancel **free** inside
> the 5-minute grace, get the whole stake back **and keep the turnover credit** — clearing a
> 5× requirement at **zero** cost, repeatable. Every other refund path (void, one-sided,
> emergency, orphan) already reversed; the exit a player actually uses did not. Closed by
> `reverseWageringLocked` in the same commit. It was not in the work order.

| | |
|---|---|
| **Enforced in** | `market-service.ts` → `buyPosition` (the `opposite` predicate gates `recordWageringLocked`) and `cashOutPosition` (`reverseWageringLocked`). |
| **Guarded by** | `npm run test:bonus-one-side` (22 checks) · `npm run red:bonus-one-side` (6/6, incl. both pre-fix sources verbatim AND three over-corrections) |
| **Audited** | `bonus.wagering_skipped_opposite_side` on the suppressed stake · `bonus.wagering_reversed` on the cancellation |

### 2.6 · Free cancellation — 5 minutes

Full refund inside 5 minutes of placing the bet; after that the position locks and rides to
settlement. There is no paid-exit window (`paidExitWindowMinutes: 0`). Configured in
`market.config` (`freeExitGraceMinutes`); enforced in `cashOutPosition`.

### 2.7 · Withdrawal fee — 1.5%

Charged on the amount withdrawn; 0.5 percentage points of it is the payment gateway's share.
`DEFAULT_WITHDRAWAL_FEE_RATE` / `DEFAULT_WITHDRAWAL_GATEWAY_SHARE_RATE` in `payout.ts`,
configured in `market.config`, editable at `/admin/config`. Stated to players on
`/wallet/withdraw`, where it is interpolated from live config.

### 2.8 · What a player is charged, in full

| | |
|---|---|
| The pool fee | indirectly, through the payout — 13% of the losing side |
| Withdrawal fee | 1.5% of the amount withdrawn |

**Nothing else.** No withholding tax. No cash-out fee (the paid-exit window is off). If you
find yourself adding a deduction to a player's money, stop.

### 2.9 · Failure messages

> ⏳ **LANDING — the BETTING and CASH-OUT paths shipped 2026-08-14 (C2–C5).** The wallet,
> KYC, auth, proposals and objections reasons are the next tranche and are enumerated at
> `docs/FAILURE-INVENTORY.md` §2.3; until they emit a `reason` they render exactly as before.
> ⛔ Do not read this rule as fully live for those surfaces.

| | |
|---|---|
| **Enforced in** | `src/lib/failure-reasons.ts` — the registry (22 reasons), each with a severity, a channel and a dictionary key. The server emits a machine `reason` alongside the `code`, and carries the FIGURES in `detail` as **numbers**. |
| **Rendered by** | `renderFailure()` — one function, used by the poll dial and the Up & Down quick-bet surface. ⛔ It never renders `r.error`: the server's English prose is API/audit truth and has no business being a headline in front of a Swahili or Chinese player. |
| **Guarded by** | `npm run test:failure-reasons` (48 checks) · `npm run red:failure-reasons` (9/9) |

> ⭐ **THIS IS WHAT CLOSES §2.3.** A 999 stake is now refused with *"Minimum bet is TZS 1,000.
> Enter TZS 1,000 or more and try again."* — driven through the real `buyPosition` and
> rendered through the real surface mappers, **in all three languages, on both products**.
> Before today the server named both bounds in its own sentence and NEITHER surface showed
> one: the poll dial fell through `errorCopy`'s INVALID phrase tests (which have no bounds
> test) to *"That didn't go through"*, and Up & Down mapped every INVALID to one generic line
> and discarded the server string by design.
>
> 🔴 **AND THE FIRST VERSION OF THAT SENTENCE SHIPPED A LITERAL `{min}` INTO IT.**
> `String.replace` with a string pattern substitutes only the FIRST occurrence, and the copy
> uses `{min}` twice — so it rendered *"Minimum bet is TZS 1,000. Enter {min} or more…"*.
> Every "does it name the minimum" assertion was GREEN, in all three languages. Only reading
> the rendered output caught it. `test:failure-reasons` §1.5b and §2.render now assert that
> **no placeholder survives** and that **every declared figure changes the sentence**.

Every player-facing refusal states **the reason** and **the next step**, at a severity that
matches what happened:

- **info / warning** — the player can fix it: below minimum, above maximum, insufficient
  balance, selections closed, rate-limited, daily limit reached, the §2.5 bonus warning.
- **error** — a genuine fault or a hard block: suspended account, self-exclusion, system error.

⛔ No screen renders a raw server string as a headline. No screen says only "failed".

---

## §3 · THE TWO FEE MODELS, AND WHY BOTH STILL EXIST

`loser-share` is **the** model. `capped-commission` — `fee = min(commissionRate × pool,
feeCeilingRate × smaller side)` — is **legacy**: it is retained only because markets created
before the cutover froze it and must settle by what they froze.

Measured on production, 2026-08-14:

| Product | Frozen model | Rows | Range |
|---|---|---|---|
| MARKET | `loser-share` | 48 | 2026-07-23 → 2026-08-14 |
| MARKET | none (read as legacy capped) | 58 | 2026-06-29 → 2026-07-22 |
| UPDOWN | `capped-commission` | 4,146 | 2026-08-05 → 2026-08-14 |

⛔ The two maths NEVER mix. The model is frozen per market at creation and settlement reads
only the snapshot. Do not "harmonise" history.

---

## §4 · WHAT IS NOT A RULE

These are settings an operator may tune inside the rules above, not rules themselves: the
per-market fee override, the daily loss limit, the objection window, the estimated-winnings
display rate, the Up & Down round margin and tick floor, and the per-chain stake window
(within 1,000…1,000,000).

---

## §5 · HOW TO CHANGE A RULE

1. Ali decides, in writing.
2. Record it in `docs/COMPLIANCE-DECISIONS.md` (newest first, append — never rewrite).
3. Change this file.
4. Change the code, the config, and every surface §2 names for that rule — in the same commit.
5. Prove the guard RED first, with a positive control in the same run.
6. Verify on production by **reading the database** and by **looking at the screen**.
7. Regenerate any PDF that states the rule, and rasterise it to check.

---

## §6 · DECISION HISTORY

| Date | Decision | Record |
|---|---|---|
| 2026-08-14 | Up & Down moves to `loser-share`; stake bounds are a rule at 1,000/1,000,000; unlimited positions; one-side bonus wagering; every failure explains itself | `docs/COMPLIANCE-DECISIONS.md` § 2026-08-14 |
| 2026-08-14 | A human approval wins — the AI 75-confidence gate applies only with no human in the loop | `docs/COMPLIANCE-DECISIONS.md` § 2026-08-14 |
| 2026-07-26 | Stake bounds 1,000 / 1,000,000 | `src/lib/payout.ts` |
| 2026-07-24 | Up & Down freezes `capped-commission` @ 13% with a ⅓ ceiling — **SUPERSEDED 2026-08-14** | `docs/COMPLIANCE-DECISIONS.md` § 2026-07-24 |
| 2026-07-23 | New polls freeze `loser-share` (3% + 10% of the losing pool) | `docs/COMPLIANCE-DECISIONS.md` § 2026-07-23 |
| 2026-07-22 | 5-minute free exit, then locked; no paid window | `src/lib/payout.ts` |
| 2026-07-14 | The 15% withholding tax is DELETED | `docs/FEE-MODEL-DECISION-2026-07-14.md` |

---

## §7 · KNOWN DUPLICATES — rates written inline that could not be made data-driven

Every entry here is a number this file also states. When a rate changes, these change with it.

✅ The guard that enforces the list — **`npm run test:rate-copy`**, which fails when a
player-facing string hardcodes a rate figure — shipped 2026-08-14 (F5). It scans every
string in all three dictionaries, and it carries its own positive control: the exact strings
this sweep fixed must still be REJECTED by it, so a green run means the copy is clean rather
than that the scanner has gone blind.

**The table is EMPTY, and that is the goal state — not an oversight.** Every rate the sweep
found was made data-driven rather than recorded as a duplicate:

| Was | Now |
|---|---|
| `estimateHowItWorks` hardcoded **"1.5×"** | `{mult}` — read from `estimatedWinningsRate`. ⚠️ Up & Down runs **1.4×**, so the hint explaining the figure was quoting a different figure from the button beside it. |
| `card3Body` · `howStep3B` stated the retired ceiling, ungated, to every new player | rewritten to the rule that is actually true, with no figure at all |
| `/legal/terms` §4 stated the retired rule in **all three languages**; §5 said the withdrawal fee was **1%** | 13% of the losing side; 1.5% — what production has charged all along |
| the in-app assistant taught the retired rule, a "base TZS 500" stake and a "1x-200x multiplier" | the current rule, the real bounds, and that the maximum is **per bet** |
| 🔴 leaderboard `tierSovereign`/`tierDiamond`/`tierGold` restated the ROI thresholds — the **same numbers the classifier tests**, in three languages | `{roi}`/`{resolved}`, interpolated from `TIER_THRESHOLDS` |

### ⛔ Two rates that no guard can reach — the `.docx` hand-outs

`test:rate-copy` scans the dictionaries. It cannot open a Word file, so the two documents below
state retired rates that nothing in this repo can fail on:

| File | What it still says |
|---|---|
| `docs/50pick-fee-decision.docx` (2026-07-14) | the fee comes from the whole pool; proposes charging on "matched money" |
| `docs/50pick-fee-model-examples.docx` (2026-07-14) | *"Fee = **10%** of the matched money"*, TRA **4%**, Commission **3%**, Reserve **2%**, providers **1%**, early-exit **9%** |

⛔ Every one of those figures is wrong today, and both files describe themselves as hand-outs
"for the team to read and decide". They are kept as the record of a real decision — and marked
in [`FEE-DOCX-SUPERSEDED.md`](FEE-DOCX-SUPERSEDED.md), because a binary cannot carry its own
banner. ⚠️ Regenerate from this file before either is handed to anyone again.

> ⭐ **THE LAST ROW WAS FOUND BY THE GUARD ITSELF, ON ITS FIRST RUN.** Nobody had listed it:
> `leaderboard/page.tsx` tested `roi >= 60` and the copy said "≥60% ROI". Whoever tuned a
> tier would have moved one and left the other, and the board would have awarded a badge its
> own caption denied.

| File | What it hardcodes | Why it cannot read config |
|---|---|---|
| _(none — every rate found by the sweep was made data-driven instead)_ | | |
