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
| Our fee: 13% of the losing side, **both** games | ⏳ LANDING — live for polls; Up & Down still freezes the legacy model |
| Positions per market: unlimited, both sides | ⏳ LANDING |
| Bonus wagering: one side only | ⏳ LANDING — ships in the same commit as the line above |
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

> ⏳ **LANDING.** Live for long-form polls since 2026-07-23. Up & Down still freezes
> `capped-commission` on every one of its 16 chains; the switch is workstream A2. Until it
> lands, an Up & Down round settles at min(13% × pool, ⅓ × smaller side).

| | |
|---|---|
| **Decided** | Ali, 2026-08-14. Supersedes the 2026-07-24 ruling that gave Up & Down `capped-commission` at 13% of the pool with a ⅓ ceiling. Long-form polls have been on this model since 2026-07-23. |
| **Enforced in** | `src/lib/payout.ts` → `poolFee()`, the `loser-share` arm. **This is the only place the arithmetic exists**; client and server both import it. |
| **Configured in** | Polls: `SystemConfig["market.config"].global` — `feeModel`, `platformFeeRate`, `operatorFeeRate`, editable at `/admin/config`. Up & Down: `SystemConfig["updown.config"].defaultRateProfile` **and separately on every `UpDownChain.rateProfile` row** — the chains do NOT inherit a changed default. |
| **Frozen per market** | Every market stamps `PredictionMarket.feeSnapshot` at creation and settles by it **forever**. ⛔ A snapshot is never rewritten, backfilled or migrated. Changing a rate affects FUTURE markets only, and the two models never mix. |
| **Stated to players** | `/legal/terms` §4 · the in-app assistant's system prompt (`src/app/_actions/chat.ts`) · `/help` FAQ · the conviction dial's "how it works" hint. |
| **Stated to admins** | `/admin/config` (fee model + simulator) · `/admin/updown` · `/admin/markets/[id]`. |
| **Guarded by** | `npm run test:fee-model` · `npm run test:loser-share-fee` · `npm run test:money-invariants` · `npm run test:settlement-gate` |

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

> ⏳ **LANDING.** The "ONE ACCOUNT, ONE SIDE" guard in `buyPosition` still refuses the
> opposite side. Removal is workstream B1, in one commit with §2.5.

A player may hold as many positions as they like on one market, on one side or on both. There
is no per-market cap and no hedging block. Enforced by the *absence* of a guard in
`buyPosition` — the "ONE ACCOUNT, ONE SIDE" block was removed 2026-08-14. See §2.5: the two
changes are inseparable.

### 2.5 · Bonus wagering — only one side counts

> ⏳ **LANDING.** `recordWageringLocked` still credits turnover on every stake, with no
> market or side dimension. Today the exposure is masked by the guard named in §2.4 — which
> is exactly why the two may not ship apart.

Only the side of a market a player was **already on** accrues turnover toward a bonus
requirement. A stake on the opposite side of a market they already hold contributes nothing.

⛔ **This rule and §2.4 are one change and must never ship apart.** The window between them is
the exploit: at the agreed rates, a TZS 10,000 bonus with a 5× requirement clears for 3,250 of
fee — a 6,750 gift per grant, same day, no risk taken.

A player holding an unfulfilled grant who takes the opposite side is **warned before
confirming, and may proceed** — it is a warning, not a refusal (see §2.9).

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

> ⏳ **LANDING.** Workstream C. Today `INVALID` is returned from 108 server sites carrying no
> reason, four disagreeing copy mappers exist, 12 player surfaces render a raw server string
> and 8 say only that something failed. Inventory: `docs/FAILURE-INVENTORY.md`.

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

⏳ The guard that enforces the list — `test:rate-copy`, which fails when a player-facing
string hardcodes a rate figure not recorded here — is **workstream F5 and is not yet written**.
Until it exists this table is maintained by hand, which is exactly why it must stay short.

| File | What it hardcodes | Why it cannot read config |
|---|---|---|
| _(none yet — populated as the sweep finds them)_ | | |
