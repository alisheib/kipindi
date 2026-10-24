/**
 * Pari-mutuel fee + payout math — THE single source of truth.
 *
 * Imported by BOTH the client (dial, confirm modal, position card) and the
 * server (settlement, cash-out, ledger, admin simulator). Nothing in here may
 * import from `server/` — keep it isomorphic, and keep the formula in ONE place.
 * `server/market-config.ts` re-exports these rather than restating them; the old
 * code carried two copies of the formula and two sets of rate constants, and
 * they drifted.
 *
 * ── THE RULE ───────────────────────────────────────────────────────────────
 *
 * ⛔ THIS BLOCK STATED THE RETIRED RULE AS **THE** RULE UNTIL 2026-08-14, with a long
 * justification for a ceiling the live model does not have. It is the first thing any
 * engineer reads about our money, and it was describing a formula that had not priced a
 * new market since 2026-07-23. Corrected in F4; `docs/RULES.md` is the authority.
 *
 *   ⭐ CURRENT — `loser-share`, BOTH GAMES, identical:
 *
 *        "Our fee is 13% of the LOSING side."
 *
 *        losingPool = the pool on the side that did NOT happen
 *        fee        = (platformFeeRate + operatorFeeRate) * losingPool   // 3% + 10%
 *        netPool    = pool - fee
 *        payout(p)  = round(p.stake / winningPool * netPool)
 *
 *      The winners' own stakes are never touched: the fee comes out of money staked on
 *      an outcome that did not happen. One-sided market ⇒ no losing side ⇒ fee 0 and
 *      every stake refunded. VOID ⇒ no outcome ⇒ fee 0.
 *
 *   ⚫ LEGACY — `capped-commission`, retained ONLY because markets created before the
 *      cutover froze it and must settle by what they froze:
 *
 *        fee = min(commissionRate * pool, feeCeilingRate * min(yesPool, noPool))
 *
 *      The ceiling existed because a flat share OF THE WHOLE POOL can exceed the entire
 *      prize on a lopsided market, which would take the balance out of the winners' own
 *      returned stakes. Measured on a real poll (YES 300,000 / NO 10,500): a 9%-of-pool
 *      fee was 31,050 against a prize of 10,500, and a 100,000 winning stake paid back
 *      93,150. ⚠️ `loser-share` cannot reach that state at all — its fee is a share of the
 *      losing pool and so is bounded by it by construction — which is why the ceiling is
 *      not carried forward rather than being merely retuned.
 *
 *   ⏳ DECIDED, NOT IN FORCE — `stake-share`, polls and Up & Down (Ali's rulings of 2026-10-24,
 *      programme FEE-TAX-2026-10, `docs/FEE-TAX-PLAN.md` §3). Every door that could freeze it
 *      onto a new market reads `fee-law-gate.ts` and refuses until release R5:
 *
 *        "A fee on EVERY stake, and a tax on what the winners win."
 *
 *        f = platformFeeRate + operatorFeeRate, t = winningsTaxRate — both in WHOLE basis points
 *        F = rhu(yesPool, f) + rhu(noPool, f)        the fee, per side, rounded half up
 *        P = losingPool − (the losing side's fee)     the prize fund: the losers' NET stakes
 *        T = rhu(P, t)                                the winnings tax, withheld for TRA
 *        netPool = pool − F − T                       what the winners share
 *        payout(i) = (stake − its fee share) + its share of (P − T)   largest remainder, ties by id
 *
 *      Σ payouts + T + F = pool EXACTLY, in whole shillings — `stakeShareSplit` asserts it and
 *      leaves no dust and no residual. ⚠️ The fee now comes out of the WINNERS' stakes too, so on
 *      a lopsided market a winner can be paid LESS than they staked (100,000 against 10,000 pays
 *      94,395). That is ruling 1, deliberate, and warned before the bet; the floor under this
 *      model is the NET stake (stake − its fee), never the stake.
 *
 * ⛔ THE MATHS NEVER MIX. The model is frozen per market in `feeSnapshot` at creation
 * and settlement reads only the snapshot. On production, 4,220 Up & Down rounds and 58
 * legacy polls still settle by the legacy arm. Do not "harmonise" history. The same holds
 * for `stake-share` from the day it switches on: a market frozen under `loser-share` or
 * `capped-commission` settles by that law for ever, byte for byte (`test:loser-share-fee`,
 * `test:fee-model` and `test:settlement-gate` pass UNCHANGED across this release — the proof).
 *
 * ── THE INVARIANTS (see scripts/money-invariants.test.mts) ─────────────────
 *
 *  1. A WIN IS NEVER PAID BELOW ITS STAKE — under BOTH models, for different reasons.
 *       · loser-share: the fee removes at most 100% of the LOSING pool, so
 *         netPool = winningPool + losingPool*(1 - rate) >= winningPool, hence ratio >= 1.
 *       · capped-commission: fee <= (1/3)*smaller, so
 *         - winning side BIGGER: smaller == losingPool ⇒ ratio >= 1 + (2/3)*L/W > 1
 *         - winning side SMALLER: fee <= (1/3)*winningPool ⇒ ratio >= 2/3 + L/W > 5/3
 *     `assertWinnerFloor` re-checks it at runtime and THROWS, because refusing to settle
 *     is safe and paying a winner less than he staked is not.
 *     ⚠️ NOT under `stake-share` — and that is a ruling, not a regression (ruling 1, 2026-10-24).
 *     There the fee is taken from every stake, the winners' included, so the floor is the NET
 *     stake: payout ≥ stake − its fee, exactly (the prize share added on top is never negative).
 *     `assertNetStakeFloor` enforces it; `assertWinnerFloor` stays, unchanged, for every market
 *     frozen under the two older pool models, which is where it has always been true.
 *
 *  2. 🔴 OUTCOME-NEUTRALITY IS A PROPERTY OF THE LEGACY MODEL ONLY, AND THAT IS A
 *     DELIBERATE, RECORDED DECISION — not an oversight. `capped-commission` reads the two
 *     pool numbers and nothing else, so it is byte-identical for a YES win and a NO win on
 *     the same final pools; `docs/F6-LIQUIDITY-DESIGN.md` §3.1 names that as the
 *     pari-mutuel licence anchor. `loser-share` charges a slice of whichever side LOST and
 *     is therefore outcome-DEPENDENT: `poolFee` MUST be told the winning side. Polls have
 *     been outcome-dependent since 2026-07-23 and Up & Down since 2026-08-14, both under
 *     Ali's explicit override, recorded in `docs/COMPLIANCE-DECISIONS.md` and flagged for
 *     the GBT file. ⛔ Do not re-litigate it in code.
 *
 *  3. NO MINT / NO LEAK. sum(payouts) + fee == pool, to rounding dust.
 *     `stake-share` holds it with NO dust at all: Σ payouts + winnings tax + fee == pool, in
 *     whole shillings, asserted inside `stakeShareSplit` on every call.
 *
 *  4. BALANCED MARKET. yesPool == noPool ⇒ loser-share charges rate * half the pool
 *     (13% of 5,000 on a 10,000 book = 650); capped-commission charges commissionRate *
 *     pool exactly, the ceiling being slack. ⚠️ Our income on a balanced book therefore
 *     HALVED at the cutover — 26% → 13% of the losers' money. Deliberate: one charge model
 *     the customer can understand (`docs/RULES.md` §1, accepted consequences).
 *
 *  5. ONE-SIDED. Under loser-share there is no losing pool; under capped-commission
 *     smaller == 0. Either way fee == 0 and everybody is refunded. It falls out of the
 *     maths under both; settlement keeps an explicit branch only for audit clarity.
 *     ⛔ Under `stake-share` it does NOT fall out of the maths — a fee on every stake would
 *     charge the funded side — so the refund is the CALLER's branch and the arithmetic is
 *     never asked: settlement's one-sided branch and `chargedFee` refund in full at no fee
 *     (ruling 2), `stakeShareSplit` refuses a side with no money, and a projection onto an
 *     empty other side is the stake itself (`settledPayoutFor`'s one-sided mirror).
 *
 * Taxes (TRA/GBT) come out of OUR fee, never out of the player — see `levySplit`.
 * ⚠️ The `stake-share` WINNINGS TAX is a different thing and the one exception: it is withheld
 * from the winners' prize for TRA (ruling 3), never out of our fee, and never a levy on it.
 */

// ── Rates ───────────────────────────────────────────────────────────────────
// Cold-start fallbacks only. The live values are RateConfig (admin-tunable,
// persisted in SystemConfig) and, for a poll that already exists, the immutable
// `feeSnapshot` stamped on it at creation. Never read these constants in a money
// path — read the snapshot.

/** Our cut, as a share of the whole pool. */
export const DEFAULT_COMMISSION_RATE = 0.10;
/** The fee can never exceed this share of the SMALLER side. A third. */
export const DEFAULT_FEE_CEILING_RATE = 1 / 3;
/** Cash-out fee for the OPTIONAL paid-exit window, if a poll configures one
 *  (`paidExitWindowMinutes > 0`); goes to the house. Unused by default — the
 *  default policy has no paid window (see below), so nothing is ever charged. */
export const DEFAULT_CASHOUT_FEE_RATE = 0.10;
/** Minutes after placing a bet during which an exit is FREE (full refund). */
export const DEFAULT_FREE_EXIT_GRACE_MINUTES = 5;
/**
 * Minutes AFTER the free window during which an exit is still allowed but charged
 * `cashOutFeeRate`. `0` (the default) means NO paid window: once the free grace
 * elapses the exit LOCKS and the position rides to settlement — "5-min free exit,
 * then nothing" (Ali, 2026-07-22). A poll may still carry a non-zero paid window
 * in its frozen snapshot (legacy markets created before this change); the copy is
 * data-driven and describes each poll's own terms.
 *
 * Either way this is the timer that kills the "watch it lose, then bail" attack:
 * a real-world event resolves hours/days after the bet, so by the time a player
 * could know the outcome the exit closed long ago. Locking at the free window
 * (paid = 0) is strictly TIGHTER than the old free+paid window, so it is at least
 * as safe against a late exit that could gut a winner's prize.
 */
export const DEFAULT_PAID_EXIT_WINDOW_MINUTES = 0;
/** Charged to the player on withdrawal. 1.5% — the rule, and what production has been
 *  charging since before 2026-08-10. ⚠️ This constant read 0.01 until 2026-08-14 while the
 *  LIVE config read 0.015, so a cold start would have quietly under-charged and the Terms
 *  page's "1%" had a constant to point at. A cold-start fallback that disagrees with the
 *  live setting is a second version of the truth. See `docs/RULES.md`. */
export const DEFAULT_WITHDRAWAL_FEE_RATE = 0.015;
/** The slice of the withdrawal fee that goes to the payment gateway. */
export const DEFAULT_WITHDRAWAL_GATEWAY_SHARE_RATE = 0.005;
/** Of OUR fee, to TRA. */
export const DEFAULT_TRA_TAX_ON_COMMISSION_RATE = 0.10;
/** Of OUR fee, to GBT. */
export const DEFAULT_GBT_LEVY_ON_COMMISSION_RATE = 0.05;
/** Warn "thin upside" below this payout/stake ratio. */
export const THIN_PROFIT_RATIO = 1.05;
/**
 * A market whose SMALLER side is below this share of the pool is a lopsided book, and an
 * officer is told at selection-close (`market.selection_closed.thin_poll`).
 *
 * ⚠️ SEPARATE FROM `THIN_PROFIT_RATIO`, and deliberately so. The ratio asks "is there
 * anything in it for a winner"; this asks "is there anyone on the other side at all". A
 * market can fail either without failing the other: a 5% side can still pay its holders
 * handsomely, and a near-balanced book can pay thinly once the fee comes out. The alert
 * fires on EITHER, because they call for different responses.
 *
 * ⛔ Model-INDEPENDENT by construction — it reads only the two pool sizes, so unlike the
 * `capped` flag it replaced it means the same thing under both fee models. `capped` is a
 * capped-commission concept that `poolFee` returns `false` for under loser-share, always,
 * which is how this alert came to be silent for three weeks.
 */
export const THIN_SMALLER_SIDE_SHARE = 0.15;

// ── Stake bounds — A RULE, NOT A DEFAULT ────────────────────────────────────
/**
 * TZS 500 minimum (Ali, 2026-10-12 — it was TZS 1,000 from 2026-08-14) and TZS 1,000,000
 * maximum **PER BET**, on BOTH products (see `docs/RULES.md` §2.3). ⛔ The minimum DEPOSIT is a
 * separate rule (`DEPOSIT_MIN_TZS`, validators.ts) and did not move with this one: a player
 * may stake less than the smallest deposit. Unlike the rates above, these are not
 * merely cold-start fallbacks: they are the floor and ceiling the admin doors
 * themselves validate against, so an operator cannot configure the platform out of
 * its own rule. `/admin/config` and `/admin/updown` may narrow the window inside
 * them; they may not widen it past these.
 *
 * ⚠️ PER BET, not per player per market. A player may hold unlimited positions on a
 * market, either or both sides, so total exposure on one market is NOT bounded by
 * the maximum — the wallet balance and the daily loss limit are what bound it. Do
 * not write copy anywhere that implies otherwise.
 *
 * ⛔ AND A CONSTANT IS NOT A LIVE SETTING. These are what the persisted
 * SystemConfig rows are reconciled TOWARD (market-config `reconcileConfigDefaults`,
 * updown-config `reconcileUpDownDefaults`); the money path reads the config, floored at
 * the minimum on read (2026-10-07). Production ran a TZS 500 floor for two and a half
 * weeks while these read 1,000 — verify a bound change by READING THE DB, not by
 * reading this file.
 * 🔴 THE FLOOR ONLY RAISES (2026-10-12). Lowering this constant lowered nothing a player
 * could bet: a stored 1,000 is at or above the floor, so it stayed enforced. The
 * reconciles (market v4, Up & Down v5) lower a stored 1,000 to this value once; any
 * other stored value is an operator's choice and is left alone.
 */
export const PLATFORM_MIN_STAKE = 500;
/** @see PLATFORM_MIN_STAKE */
export const PLATFORM_MAX_STAKE = 1_000_000;

// ── Fee model ("loser-share" — owner decision 2026-07-23) ─────────────────────
// See docs/COMPLIANCE-DECISIONS.md and docs/FEE-MODEL-DECISION-2026-07-14.md. The model is
// FROZEN per poll (feeSnapshot.feeModel), so old polls keep `capped-commission`
// and new polls use `loser-share` — the two maths NEVER mix. A snapshot with no
// `feeModel` (every poll created before this change) is read as `capped-commission`.
/** The DEFAULT model NEW polls freeze. Owner set this to loser-share. */
export const DEFAULT_FEE_MODEL: FeeModel = "loser-share";
/** loser-share: the "Platform" slice of the fee, charged on the LOSING pool. */
export const DEFAULT_PLATFORM_FEE_RATE = 0.03;
/** loser-share: the "Operator" slice of the fee, charged on the LOSING pool.
 *  Total loser-share fee = platformFeeRate + operatorFeeRate (default 3% + 10% = 13%). */
export const DEFAULT_OPERATOR_FEE_RATE = 0.10;
/** The two loser-share slices summed may never exceed the whole losing pool. */
export const MAX_LOSER_SHARE_RATE = 1.0;
/**
 * jackpot-payout (Maswali Millionea): the highest fee share of a jackpot any configuration may freeze. A BOUND, not the
 * rate — the rate is `maswali.config.jackpotFeeRate` (admin-editable, frozen per week, RULES §2.12).
 */
export const MAX_JACKPOT_FEE_RATE = 0.5;
/**
 * stake-share (FEE-TAX-2026-10): the highest fee on EVERY stake (platform + operator) any configuration may freeze. A BOUND,
 * not the rate — the rate is `platformFeeRate + operatorFeeRate`, admin-set and frozen per market.
 * ⚠️ Lower than `MAX_LOSER_SHARE_RATE` (100%) because the base is different: a share of the WHOLE pool comes out of the
 * winners' stakes too, so the bound is what keeps "a winner can be paid below their stake" a lopsided-market event
 * (ruling 1) rather than the rule.
 */
export const MAX_STAKE_FEE_RATE = 0.30;
/**
 * stake-share: the highest WINNINGS TAX any configuration may freeze — a bound, not the rate. The rate is
 * `winningsTaxRate`, set only by an admin's audited save and frozen per market; no code default exists for it.
 */
export const MAX_WINNINGS_TAX_RATE = 0.50;
/** Display-only. The fixed "possible winnings" shown pre-bet = stake × (1 + rate).
 *  Default 0.5 → a 1.5× headline. It is a marketing estimate, NOT the pari-mutuel
 *  payout, which is why the disclaimer is mandatory. */
export const DEFAULT_ESTIMATED_WINNINGS_RATE = 0.5;
/** Bound for the display estimate rate (0 = show stake back; 5 = 6× headline). */
export const MAX_ESTIMATED_WINNINGS_RATE = 5;
/** Whether loser-share polls show the pre-bet estimate at all (owner: on). */
export const DEFAULT_SHOW_ESTIMATED_WINNINGS = true;

// ── Admin bounds ────────────────────────────────────────────────────────────

export const MAX_COMMISSION_RATE = 0.30;
/**
 * The ceiling may not exceed 100% of the smaller side. This is the ONE bound that
 * invariant 1 actually depends on: at exactly 100% a winner on a thin poll breaks
 * even (profits nothing), and above it he would lose. It is a hard stop, not a
 * preference.
 */
export const MAX_FEE_CEILING_RATE = 1.0;
/**
 * Warn (do not block) above a half: at a ceiling of one half we take exactly as
 * much as all the winners combined, and above it we take more than they do.
 */
export const FEE_CEILING_WARN_ABOVE = 0.50;

// ── Types ───────────────────────────────────────────────────────────────────

export type Side = "YES" | "NO";

/**
 * `negative` is GONE. A winning position can no longer be paid below its stake,
 * so the level that meant "you won but you lost money" is now unreachable. It was
 * deleted from the union deliberately so the compiler finds every consumer.
 *
 * ⭐ `below` IS BACK — FOR ONE MODEL, BY A RULING, AND IT IS NOT `negative`. Under
 * `stake-share` (Ali, 2026-10-24, ruling 1) the fee comes out of every stake, so on a
 * lopsided market a correct call CAN be paid less than it staked (100,000 against 10,000
 * pays 94,395) and the bet screen must say so before the bet. `negative` was a lie about a
 * bug; `below` is a true statement about a deliberate law. It is unreachable for a market
 * frozen under `capped-commission` or `loser-share` (their floor holds, `assertWinnerFloor`),
 * and it is added to the union for the same reason `negative` was taken out of it: so the
 * compiler finds every consumer, and none of them can render the thin-upside copy ("you will
 * never be paid less than you staked") over a figure that is below the stake.
 */
export type LeanLevel = "below" | "thin" | "fair";

/**
 * Which fee formula a poll uses. Frozen per poll so the two maths never mix:
 *  - `capped-commission`: fee = min(commissionRate·pool, feeCeilingRate·smaller).
 *    Outcome-NEUTRAL. Every poll created before 2026-07-23 (no `feeModel` on its
 *    snapshot) is read as this.
 *  - `loser-share`: fee = (platformFeeRate + operatorFeeRate)·losingPool.
 *    Outcome-DEPENDENT — the fee is a slice of whichever side LOSES, so `poolFee`
 *    must be told the winning side. Owner decision 2026-07-23; new default.
 */
/**
 *  - `jackpot-payout` (Maswali Millionea, MASWALI-BUILD S1; RULES §2.12): fee = `jackpotFeeRate` × the JACKPOT, taken
 *    only in a week with at least one 10/10 ticket, nothing in a no-winner week. It is NOT a pari-mutuel pool fee —
 *    `poolFee` refuses it, and the week's arithmetic is `maswali-money.ts`. The rate is frozen per week like every rate.
 *  - `stake-share` (polls and Up & Down, FEE-TAX-2026-10 — DECIDED, NOT IN FORCE until `fee-law-gate.ts` opens):
 *    fee = (platformFeeRate + operatorFeeRate) of EVERY stake, rounded half up per side; the losing side's net stakes
 *    are the prize fund, and `winningsTaxRate` of it is withheld for TRA. Outcome-NEUTRAL in its fee (both sides pay
 *    it), outcome-dependent in its tax (the tax is on whichever side lost). The arithmetic is `stakeShareSplit`; its
 *    two rates and its tax are REQUIRED on a snapshot and refused when missing — never defaulted.
 */
export type FeeModel = "capped-commission" | "loser-share" | "jackpot-payout" | "stake-share";

/**
 * Every fee model the code knows. `readRates` REFUSES any other value instead of coercing it (S1).
 * ⚠️ `stake-share` is listed because a snapshot that froze it must READ as itself — the refusal of an unknown model
 * cannot be the gate, or the first stake-share market would be unpriceable. Whether a NEW market may freeze it is
 * `fee-law-gate.ts`'s question, asked at every door, not this list's.
 */
export const FEE_MODELS: readonly FeeModel[] = ["capped-commission", "loser-share", "jackpot-payout", "stake-share"];

/**
 * The rates the fee is made of. Everything money-side takes exactly this.
 * `feeModel`/`platformFeeRate`/`operatorFeeRate` are OPTIONAL: absent ⇒ the legacy
 * `capped-commission` maths (so an old snapshot or a bare `{commissionRate}` still
 * behaves exactly as before).
 */
export interface FeeRates {
  commissionRate: number;
  feeCeilingRate: number;
  /** Absent ⇒ `capped-commission`. */
  feeModel?: FeeModel;
  /** loser-share only. */
  platformFeeRate?: number;
  /** loser-share only. */
  operatorFeeRate?: number;
  /** jackpot-payout only: the share of the JACKPOT taken when a week pays (0.13 = 13%), frozen per week. */
  jackpotFeeRate?: number;
  /**
   * stake-share only: the WINNINGS TAX withheld from the prize fund for TRA (0.15 = 15%), frozen per market.
   * ⛔ Present only on a `stake-share` snapshot, and REQUIRED there (`readRates` refuses one without it). There is no
   * code default: the rate comes from `market.config`, saved by an admin, at the moment a market is stamped.
   */
  winningsTaxRate?: number;
}

/**
 * The rates frozen onto a poll at creation, so that retuning admin config can
 * never reprice a bet that has already been placed. Settlement, cash-out and
 * every payout preview read THIS, never the live config.
 * Stored as `PredictionMarket.feeSnapshot` (Json).
 */
export interface FeeSnapshot extends FeeRates {
  // A stamped snapshot ALWAYS resolves these (snapshotFromConfig / snapshotOrLegacy),
  // so they are required here even though they are optional on the bare FeeRates.
  feeModel: FeeModel;
  platformFeeRate: number;
  operatorFeeRate: number;
  cashOutFeeRate: number;
  freeExitGraceMinutes: number;
  /** Minutes of paid (cashOutFeeRate) exit AFTER the free window, then the exit
   *  locks. `0` = no paid window: the exit locks at the free grace (the default
   *  policy since 2026-07-22). Frozen per poll, so legacy polls may still hold a
   *  non-zero value. */
  paidExitWindowMinutes: number;
  traTaxOnCommissionRate: number;
  gbtLevyOnCommissionRate: number;
  thinProfitRatio: number;
  /** Display-only (loser-share). Fixed pre-bet estimate = stake × (1 + this). */
  estimatedWinningsRate: number;
  /** Display-only (loser-share). Whether to show the pre-bet estimate at all. */
  showEstimatedWinnings: boolean;
  /** Schema version. `1` (or absent) = legacy `capped-commission`; `2` carries
   *  `feeModel` + the loser-share/display fields. Old snapshots read as v1.
   *  `3` = carries `stake-share` and its `winningsTaxRate` (FEE-TAX-2026-10). Only a
   *  stake-share snapshot is v3: every other model keeps the version it always stamped. */
  v: 1 | 2 | 3;
  /** ISO timestamp the snapshot was stamped. Audit only; never read by the math. */
  stampedAt: string;
}

/**
 * The subset of a poll's frozen rates the CLIENT needs: enough to project a
 * payout, categorise the lean, and state the early-exit terms honestly.
 *
 * Threaded from the server (`market.feeSnapshot`) into the dial / confirm modal /
 * sell modal, so every number and every sentence those surfaces show is the
 * poll's own — not a hardcoded "9%" that starts lying the moment admin retunes.
 */
export type PollRates = Pick<
  FeeSnapshot,
  "commissionRate" | "feeCeilingRate" | "cashOutFeeRate" | "freeExitGraceMinutes" | "paidExitWindowMinutes" | "thinProfitRatio"
  | "feeModel" | "platformFeeRate" | "operatorFeeRate" | "estimatedWinningsRate" | "showEstimatedWinnings"
  // stake-share only (optional on the snapshot): a projection onto a stake-share market needs it, and refuses without it.
  | "winningsTaxRate"
>;

export interface FeeBreakdown {
  /** yesPool + noPool. */
  pool: number;
  /** min(yesPool, noPool) — the prize. */
  smaller: number;
  /** max(yesPool, noPool). */
  larger: number;
  /** commissionRate * pool — what we'd take with no ceiling. */
  commission: number;
  /** feeCeilingRate * smaller — the most we are ever allowed to take. */
  ceiling: number;
  /** min(commission, ceiling) — what we actually take. ⛔ OUR fee ONLY, under every model: never the winnings tax. */
  fee: number;
  /** What is shared out among the winners: pool − fee under the older models; pool − fee − winningsTax under
   *  `stake-share` (with no winning side there is no tax yet, so a stake-share preview reports pool − fee). */
  netPool: number;
  /** True when the ceiling bound (the poll is lopsided enough that 10% would bite the winners). */
  capped: boolean;
  /** Our fee as a share of the LOSERS' money — the honest "house take". Caps at feeCeilingRate.
   *  (stake-share: the flat rate of every stake, which is also our take of the losers' stakes.) */
  shareOfLosers: number;
  /** stake-share only, and only when the winning side is known: the tax withheld from the prize fund for TRA. */
  winningsTax?: number;
  /** stake-share only, and only when the winning side is known: P, the losing side's net stakes (before the tax). */
  prizeFund?: number;
}

export interface PayoutResult {
  /** TZS, rounded. Includes return of stake. */
  payout: number;
  /** payout - stake. */
  net: number;
  /** This position's share of the winning pool. */
  share: number;
  /** payout / stake. Guaranteed >= 1 for a winner (invariant 1) under the two older pool models;
   *  under `stake-share` it can be below 1 on a lopsided market (ruling 1) — see `leanFor`'s `below`. */
  ratio: number;
  /** The fee maths this payout came out of — for disclosure UI and the ledger. */
  fee: FeeBreakdown;
}

export interface LevySplit {
  /** The whole fee we charged. */
  fee: number;
  /** traTaxOnCommissionRate * fee -> TRA. */
  traLevy: number;
  /** gbtLevyOnCommissionRate * fee -> GBT. */
  gbtLevy: number;
  /** What the operator actually keeps. */
  operatorNet: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const clamp = (n: number, lo: number, hi: number): number =>
  Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;

interface ResolvedRates {
  commissionRate: number;
  feeCeilingRate: number;
  feeModel: FeeModel;
  platformFeeRate: number;
  operatorFeeRate: number;
  /** jackpot-payout only; 0 under the pool models. */
  jackpotFeeRate: number;
  /**
   * stake-share only: the frozen winnings tax; 0 under every other model. `null` only on a TERMS read of a stake-share
   * rate set that carries no tax — an Up & Down profile, whose tax comes from `market.config` when a round is stamped.
   * ⛔ A PRICING read never returns null: it refuses instead.
   */
  winningsTaxRate: number | null;
}

/**
 * What a read is FOR. `pricing` (the default) prices money, so it requires every rate the model reads; `terms` only
 * names the model and its fee rate — a caption, a label, an outcome-neutral preview — and so lets a stake-share rate set
 * without its tax through (a profile never carries one). Under every model but `stake-share` the two are identical.
 */
type ReadNeed = "pricing" | "terms";

/**
 * Defensive read of the rates. A NaN/absent rate must never become a big fee.
 * CRUCIAL no-mix guarantee: an absent `feeModel` (every pre-2026-07-23 snapshot,
 * or a bare `{commissionRate}`) resolves to `capped-commission`, so old money
 * behaves exactly as before this change.
 * ⛔ `stake-share` is read the OTHER way on purpose: its rates are never clamped and
 * never defaulted (`readStakeShareRates`). The older models' defaults exist because
 * snapshots predating a field had to keep pricing; no stake-share snapshot predates
 * anything, so a missing rate there is a corrupt snapshot, and it is refused.
 */
function readRates(rates: Partial<FeeRates> | undefined, need: ReadNeed = "pricing"): ResolvedRates {
  const feeModel = readFeeModel(rates?.feeModel);
  if (feeModel === "stake-share") {
    const s = readStakeShareRates(rates, need);
    return {
      commissionRate: clamp(rates?.commissionRate ?? DEFAULT_COMMISSION_RATE, 0, 1),
      feeCeilingRate: clamp(rates?.feeCeilingRate ?? DEFAULT_FEE_CEILING_RATE, 0, MAX_FEE_CEILING_RATE),
      feeModel,
      platformFeeRate: s.platformFeeRate,
      operatorFeeRate: s.operatorFeeRate,
      jackpotFeeRate: 0,
      winningsTaxRate: s.winningsTaxRate,
    };
  }
  return {
    commissionRate: clamp(rates?.commissionRate ?? DEFAULT_COMMISSION_RATE, 0, 1),
    feeCeilingRate: clamp(rates?.feeCeilingRate ?? DEFAULT_FEE_CEILING_RATE, 0, MAX_FEE_CEILING_RATE),
    feeModel,
    platformFeeRate: clamp(rates?.platformFeeRate ?? DEFAULT_PLATFORM_FEE_RATE, 0, 1),
    operatorFeeRate: clamp(rates?.operatorFeeRate ?? DEFAULT_OPERATOR_FEE_RATE, 0, 1),
    jackpotFeeRate: readJackpotFeeRate(rates),
    winningsTaxRate: 0,
  };
}

/** A finite rate in [0, hi]. */
function isRateIn(v: unknown, hi: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= hi;
}

/**
 * ⛔ A STAKE-SHARE RATE SET IS READ, NEVER COMPLETED (FEE-TAX-2026-10). Platform and operator must be frozen finite rates,
 * each and together within `MAX_STAKE_FEE_RATE`; the winnings tax a frozen finite rate within `MAX_WINNINGS_TAX_RATE`.
 * Anything else THROWS, exactly as `readJackpotFeeRate` refuses a week without its rate: pricing a stake-share market at a
 * default would charge a law nobody froze. The sum is compared in basis points — the unit the arithmetic charges in — so
 * 0.10 + 0.20 (which a float stores as 0.30000000000000004) is the 30% it means.
 * A TERMS read (`need: "terms"`) lets a missing tax through as `null` — and only a missing one: a tax that is present and
 * out of range is refused on every read.
 */
function readStakeShareRates(
  rates: Partial<FeeRates> | undefined,
  need: ReadNeed,
): { platformFeeRate: number; operatorFeeRate: number; winningsTaxRate: number | null } {
  const p: unknown = rates?.platformFeeRate;
  const o: unknown = rates?.operatorFeeRate;
  const t: unknown = rates?.winningsTaxRate;
  if (!isRateIn(p, MAX_STAKE_FEE_RATE) || !isRateIn(o, MAX_STAKE_FEE_RATE) || rateBp(p + o) > rateBp(MAX_STAKE_FEE_RATE)) {
    throw new Error(
      `payout: a stake-share fee must be frozen as platform + operator rates within [0, ${MAX_STAKE_FEE_RATE}] ` +
      `(got ${JSON.stringify(p)} + ${JSON.stringify(o)}) — refused, never defaulted`,
    );
  }
  if (t === undefined || t === null) {
    if (need === "pricing") {
      throw new Error("payout: a stake-share snapshot must freeze its winnings tax rate — refused, never defaulted");
    }
    return { platformFeeRate: p, operatorFeeRate: o, winningsTaxRate: null };
  }
  if (!isRateIn(t, MAX_WINNINGS_TAX_RATE)) {
    throw new Error(`payout: a stake-share winnings tax must be frozen within [0, ${MAX_WINNINGS_TAX_RATE}] (got ${JSON.stringify(t)})`);
  }
  return { platformFeeRate: p, operatorFeeRate: o, winningsTaxRate: t };
}

/**
 * ⛔ THE FEE MODEL IS READ, NEVER GUESSED (MASWALI-BUILD S1). An ABSENT model is `capped-commission` — the no-mix
 * guarantee for every snapshot that predates the field. A KNOWN model is itself. Anything else is REFUSED: before S1 it
 * was coerced to capped-commission, which would have priced a corrupt (or future) snapshot under a law it never froze.
 */
function readFeeModel(v: unknown): FeeModel {
  if (v == null) return "capped-commission";
  if ((FEE_MODELS as readonly unknown[]).includes(v)) return v as FeeModel;
  throw new Error(`payout: unknown fee model ${JSON.stringify(v)} — refused, never coerced (RULES §3)`);
}

/** A jackpot-payout snapshot always freezes its rate; one that does not is refused rather than priced at a default. */
function readJackpotFeeRate(rates: Partial<FeeRates> | undefined): number {
  if (rates?.feeModel !== "jackpot-payout") return 0;
  const r = rates.jackpotFeeRate;
  if (typeof r !== "number" || !Number.isFinite(r) || r < 0 || r > MAX_JACKPOT_FEE_RATE) {
    throw new Error(`payout: a jackpot-payout rate must be frozen in [0, ${MAX_JACKPOT_FEE_RATE}] (got ${JSON.stringify(r)})`);
  }
  return r;
}

/**
 * The fee model a set of rates RESOLVES to — the exact predicate `poolFee` applies,
 * exported so a LABEL beside a fee number can never disagree with the arithmetic that
 * produced it.
 *
 * ⛔ Do not re-derive this at a call site with `rates.feeModel === "loser-share"`. An
 * ABSENT `feeModel` is `capped-commission` (the no-mix guarantee, `readRates`); a call
 * site that tests the raw field reads `undefined` for every legacy snapshot and will
 * label a legacy poll as neither model — or, worse, hardcode one. That is precisely the
 * defect this exists to close: `/admin/updown` displayed a hardcoded
 * `capped-commission 13%` beside a value that had already moved to loser-share.
 *
 * A TERMS read: an Up & Down `stake-share` profile carries no winnings tax (it is stamped
 * from `market.config`), and naming its model must not need one. Its fee rates are still
 * refused when missing or out of range, exactly as a price would refuse them.
 */
export function resolveFeeModel(rates: Partial<FeeRates> | undefined): FeeModel {
  return readRates(rates, "terms").feeModel;
}

/**
 * A short admin caption for a set of rates: the model NAMED and the rate that model
 * actually charges — both derived from the same resolved rates `poolFee` will use.
 *
 * ⭐ WHY THIS IS A FUNCTION AND NOT A STRING AT THE CALL SITE. `/admin/updown` captioned
 * its fee tile with the literal `"capped-commission 13%"` beside a value computed by
 * `poolFee`. The value moved when the model moved; the caption could not. The tile then
 * read a CORRECT number under a RETIRED law — the worst of the two possible lies, because
 * an operator who checks the arithmetic finds it sound.
 *
 * The percentages are the ones the arithmetic uses, clamped identically — `test:fee-model-caption`
 * ties the quoted rate back to a fee `poolFee` really charged, so the caption cannot drift.
 */
export function describeFeeModel(rates: Partial<FeeRates> | undefined): { model: FeeModel; caption: string } {
  const r = readRates(rates, "terms");
  const pct = (n: number) => `${Number((n * 100).toFixed(2))}%`;
  if (r.feeModel === "loser-share") {
    // The SAME clamp `poolFee` applies to the summed slices — not the raw sum.
    const loserRate = clamp(r.platformFeeRate + r.operatorFeeRate, 0, MAX_LOSER_SHARE_RATE);
    return { model: r.feeModel, caption: `loser-share ${pct(loserRate)}` };
  }
  // Maswali Millionea: the frozen jackpot share, taken at payout only ("13% at payout" — 13 characters, inside the
  // measured caption width; `test:fee-model-caption`).
  if (r.feeModel === "jackpot-payout") return { model: r.feeModel, caption: `${pct(r.jackpotFeeRate)} at payout` };
  // stake-share (FEE-TAX-2026-10): the rate of EVERY stake, in the whole basis points the arithmetic charges — "13% of
  // stakes", 13 characters; "12.75% of stakes" at the most decimals a basis point has, 16 (`test:fee-model-caption` §6).
  if (r.feeModel === "stake-share") return { model: r.feeModel, caption: `${pct(stakeFeeBpOf(r) / 10_000)} of stakes` };
  return { model: r.feeModel, caption: `capped ${pct(r.commissionRate)}/${pct(r.feeCeilingRate)}` };
}

/**
 * THE LOSER-SHARE TOTAL a set of rates charges — `platformFeeRate + operatorFeeRate`, clamped EXACTLY as `poolFee`
 * clamps it — as a fraction; `null` under capped-commission, which has no loser-share (the Vodacom plan S3, SJ-3).
 *
 * ⛔ NEVER `commissionRate`. On a loser-share poll `commissionRate` is a dormant legacy field that no fee reads, so a
 * sentence quoting it would name a rate the market does not charge.
 * ⛔ AND `null` UNDER `stake-share` TOO: its fee is a share of every stake, not of the losing side, so a sentence built on
 * this figure ("of the losing side") would misstate it. Its own figure is `stakeShareRate`.
 */
export function loserShareRate(rates: Partial<FeeRates> | undefined): number | null {
  const r = readRates(rates, "terms");
  return r.feeModel === "loser-share" ? clamp(r.platformFeeRate + r.operatorFeeRate, 0, MAX_LOSER_SHARE_RATE) : null;
}

/**
 * `{pct}` — the loser-share total as the copy prints it ("Kamisheni ya 13% imeshatolewa"): a percentage, to one
 * decimal at most (13 · 12.5); `null` under capped-commission, whose surfaces show the `describeFeeModel` caption
 * instead of a figure (SJ-3).
 */
export function loserSharePct(rates: Partial<FeeRates> | undefined): number | null {
  const rate = loserShareRate(rates);
  return rate === null ? null : Math.round(rate * 1000) / 10;
}

// ── stake-share figures (FEE-TAX-2026-10) ───────────────────────────────────
// Every figure below is read through `readRates` and converted to the WHOLE BASIS POINTS the arithmetic charges in, so
// a sentence quoting one can never name a rate the split does not apply. ⛔ None of them is a literal and none falls back
// to a default: under any other model each is `null`, and a stake-share rate set that is malformed throws.

/** A rate as whole basis points: round(rate × 10,000) — 0.13 → 1,300. The unit every stake-share figure is charged in. */
export function rateBp(rate: number): number {
  return Math.round(rate * 10_000);
}

/**
 * ROUND HALF UP of `bp` basis points of a whole-shilling amount: floor((amount × bp + 5,000) / 10,000) — 13% of 1,005 is
 * 130.65 → 131; 15% of 30,450 is 4,567.5 → 4,568. Exact integer arithmetic (the remainder is taken, never a float
 * quotient floored), for any amount and rate whose product is a safe integer.
 * ⛔ Refuses a fractional or negative amount, a fractional or negative rate, or a product past 2^53: money is whole
 * shillings, and a figure this cannot compute exactly is a figure it does not guess.
 */
export function roundHalfUpBp(amount: number, bp: number): number {
  if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(bp) || bp < 0) {
    throw new Error(`payout: round-half-up needs a whole non-negative amount and rate (got ${amount} at ${bp} bp)`);
  }
  const n = amount * bp + 5_000;
  if (!Number.isSafeInteger(n)) throw new Error(`payout: ${amount} at ${bp} bp is past exact arithmetic`);
  return (n - (n % 10_000)) / 10_000;
}

/** The stake-share fee rate of resolved rates, in basis points. Internal: callers hold a stake-share `ResolvedRates`. */
function stakeFeeBpOf(r: ResolvedRates): number {
  return rateBp(r.platformFeeRate + r.operatorFeeRate);
}

/** The stake-share fee on every stake, in basis points (1,300 = 13%); `null` under any other model. */
export function stakeFeeBp(rates: Partial<FeeRates> | undefined): number | null {
  const r = readRates(rates, "terms");
  return r.feeModel === "stake-share" ? stakeFeeBpOf(r) : null;
}

/**
 * The stake-share winnings tax, in basis points (1,500 = 15%); `null` under any other model, and `null` for a stake-share
 * rate set that carries no tax (an Up & Down profile — its tax is stamped from `market.config`).
 */
export function winningsTaxBp(rates: Partial<FeeRates> | undefined): number | null {
  const r = readRates(rates, "terms");
  return r.feeModel === "stake-share" && r.winningsTaxRate !== null ? rateBp(r.winningsTaxRate) : null;
}

/**
 * THE STAKE-SHARE TOTAL a set of rates charges on every stake — `platformFeeRate + operatorFeeRate`, as the fraction the
 * arithmetic applies (whole basis points); `null` under every other model. The `loserShareRate` of the new law.
 */
export function stakeShareRate(rates: Partial<FeeRates> | undefined): number | null {
  const bp = stakeFeeBp(rates);
  return bp === null ? null : bp / 10_000;
}

/**
 * `{pct}` — the stake-share fee as copy prints it (13 · 12.5 · 12.75): a percentage to two decimals at most, because the
 * arithmetic charges whole basis points and rounding the figure to one decimal would quote a rate it does not charge.
 * `null` under every other model.
 */
export function stakeSharePct(rates: Partial<FeeRates> | undefined): number | null {
  const bp = stakeFeeBp(rates);
  return bp === null ? null : bp / 100;
}

/** `{pct}` — the stake-share winnings tax as copy prints it (15); `null` unless `stake-share` with a frozen tax. */
export function winningsTaxPct(rates: Partial<FeeRates> | undefined): number | null {
  const bp = winningsTaxBp(rates);
  return bp === null ? null : bp / 100;
}

/**
 * THE BREAK-EVEN LEAN under `stake-share` (ruling 1): the share of the pool on the SMALLER side below which a winner on
 * the BIGGER side is paid less than their stake — f / (f + (1 − f)(1 − t)), ≈ 0.1495 (14.95%) at 13% and 15%
 * (FEE-TAX-PLAN §3: "once the small side is under about 14.95% of the pool"). From the totals, ignoring the shilling
 * rounding: the winner's ratio is (1 − f) + (1 − f)(1 − t)·L/W, which is 1 exactly there. A fraction in [0, 1]; `null`
 * under every other model (their floor holds at every lean) and for a stake-share rate set that freezes no tax.
 */
export function stakeShareBreakEvenShare(rates: Partial<FeeRates> | undefined): number | null {
  const feeBp = stakeFeeBp(rates);
  const taxBp = winningsTaxBp(rates);
  if (feeBp === null || taxBp === null) return null;
  const f = feeBp / 10_000;
  const keep = (1 - f) * (1 - taxBp / 10_000);
  return f + keep > 0 ? f / (f + keep) : 1;
}

/**
 * How many characters a fee caption may be. **MEASURED, not chosen.**
 *
 * 🔴 The first version of `describeFeeModel` returned `loser-share · 13% of losers` (27
 * chars), it shipped, and it was ELLIPSISED on the live console at exactly 1024px — the
 * `lg` breakpoint, where `/admin/updown`'s KPI row goes 4-up and the tile is at its
 * narrowest with the delta still on one line. Measured off production by
 * `qa:admin-updown-widths`: the chip's box is **144px** there and the string needed
 * **210px** — 7.24px per character, so **~19 rendered characters fit**, and `AdminKpi`
 * spends 2 of them on the direction glyph.
 *
 * ⛔ THIS IS WHY THE CAPTION DROPPED "of losers" AND THE " · " SEPARATORS. The model NAME is
 * the load-bearing half — naming the wrong law is the defect A4 existed to fix — and the
 * base it charges on is what the name "loser-share" already says. Do not restore the prose:
 * `test:fee-model-caption` §6 fails when a caption exceeds this budget, because a caption
 * that is correct and ellipsised is still a caption an operator cannot read.
 *
 * ⚠️ Clipping INSIDE a card never reaches `document.scrollWidth`, so no page-level overflow
 * check can see this. Only a per-element read or a human looking at the screenshot finds it.
 */
export const FEE_CAPTION_MAX_CHARS = 17;

// ── THE FEE ─────────────────────────────────────────────────────────────────

/**
 * The commission on a pool.
 *
 * `capped-commission` (legacy, default): outcome-neutral — it takes the two pool
 * sizes and nothing else (invariant 2), and `winningSide` is ignored.
 *
 * `loser-share`: the fee is `(platformFeeRate + operatorFeeRate) × losingPool`,
 * so it is OUTCOME-DEPENDENT — `poolFee` must be told the winning side to know which
 * pool loses. Money paths (settlement, `settledPayoutFor`, `payoutFor`) ALWAYS pass
 * it. When it is omitted on a loser-share poll (display/guardrail previews only, where
 * no outcome exists) there is no loser, so **the FEE IS ZERO** — see the inline note at
 * the `losingPool` line below, and `market-service.ts`'s F1 comment for why it matters:
 * an alert keyed off a capped-commission concept went silent on loser-share polls for
 * three weeks. Never used to move money either way.
 *
 * `stake-share` (FEE-TAX-2026-10, decided, gated by `fee-law-gate.ts`): the fee is a share
 * of EVERY stake, rounded half up per side — the figures `stakeShareTotals` computes and
 * `stakeShareSplit` settles with, so this arm cannot disagree with settlement. Its fee is
 * known WITHOUT a side, so a preview with none reports F alone: `netPool` = pool − F, and no
 * `winningsTax` or `prizeFund`, because the tax is a share of the LOSING side's net stakes and
 * there is no loser yet. With a side it reports what settlement will do: `fee` = F,
 * `prizeFund` = P, `winningsTax` = T, `netPool` = pool − F − T. Pools are whole shillings
 * under this model; a fractional pool is refused, never rounded.
 *
 * ⚠️ THE CONTRACT, FOR EVERY READER (changed in FEE-TAX-2026-10 R2): `fee` is OUR fee and
 * nothing else — never the winnings tax. What a stake-share market keeps back from its
 * players is `fee + (winningsTax ?? 0)`; the tax goes to TRA and is not revenue. So "paid
 * back = pool − fee" holds under the older models only, and `netPool` is the one figure
 * that is right under all of them. ⛔ A one-sided pool and a VOID are refunds, never priced
 * here: `chargedFee` and settlement's refund branch own them under every model.
 *
 * ⛔ THIS PARAGRAPH USED TO SAY THE FEE WAS PREVIEWED AGAINST THE **SMALLER** POOL, AND
 * IT NEVER WAS. Twenty lines down, `losingPool` is `0` when the side is absent, and the
 * inline comment there has always said so — so the file contradicted itself, with the
 * doc block being the half a reader meets first. No money was ever wrong (every money
 * path passes the side, and `test:loser-share-fee` proves it), which is exactly what let
 * it stand: a false sentence with no failing test behind it is invisible. `§9` of that
 * suite now asserts this prose against the behaviour, so the two cannot drift again.
 *
 * The winner floor holds under BOTH models (netPool ≥ winningPool ⇒ payout ≥ stake):
 * loser-share removes only a slice ≤ 100% of the losing pool, so netPool =
 * winningPool + losingPool·(1 − rate) ≥ winningPool.
 * (Both OLDER models. Under `stake-share` netPool can fall below the winning pool on a
 * lopsided market — ruling 1 — and the floor is the net stake: see `assertNetStakeFloor`.)
 *
 * Note `feeCeilingRate` is clamped to <= 100% here as well as in admin
 * validation. Two locks on the one thing invariant 1 depends on.
 */
export function poolFee(yesPool: number, noPool: number, rates: Partial<FeeRates>, winningSide?: Side): FeeBreakdown {
  // A preview with no side is a TERMS read: a stake-share fee is known without the tax (`readRates`).
  const r = readRates(rates, winningSide === undefined ? "terms" : "pricing");
  // ⛔ A Millionea week is not a pari-mutuel pool: its fee is a share of the JACKPOT, at payout only, computed by
  // `maswali-money.ts` from the week's frozen snapshot. Pricing it here would be a wrong figure, so it is refused.
  if (r.feeModel === "jackpot-payout") {
    throw new Error("poolFee: a jackpot-payout week is priced by maswali-money (RULES §2.12), never the pool fee");
  }
  // stake-share (FEE-TAX-2026-10): the one stake-share arithmetic, never a variant of the two arms below.
  if (r.feeModel === "stake-share") return stakeSharePoolFee(yesPool, noPool, r, rates, winningSide);
  const yes = Math.max(0, yesPool);
  const no = Math.max(0, noPool);
  const pool = yes + no;
  const smaller = Math.min(yes, no);
  const larger = Math.max(yes, no);

  if (r.feeModel === "loser-share") {
    // loser-share: fee = (platformFeeRate + operatorFeeRate) × the LOSING pool.
    // The loser is the side opposite the winner, so the fee needs the outcome. When
    // it is not known (a pre-resolution preview, or the VOID audit) there is no loser
    // and therefore no fee to charge yet: fee = 0. Money paths always pass the winner.
    const loserRate = clamp(r.platformFeeRate + r.operatorFeeRate, 0, MAX_LOSER_SHARE_RATE);
    const losingPool = winningSide === "YES" ? no : winningSide === "NO" ? yes : 0;
    const fee = loserRate * losingPool;
    return {
      pool,
      smaller,
      larger,
      commission: loserRate * pool,        // notional whole-pool figure — informational only
      ceiling: losingPool,                 // the losing pool the fee is a share of
      fee,
      netPool: pool - fee,
      capped: false,                       // no ceiling concept in this model
      shareOfLosers: loserRate,            // our constant take on the losing side
    };
  }

  const commission = r.commissionRate * pool;
  const ceiling = r.feeCeilingRate * smaller;
  const fee = Math.min(commission, ceiling);

  return {
    pool,
    smaller,
    larger,
    commission,
    ceiling,
    fee,
    netPool: pool - fee,
    capped: ceiling < commission,
    shareOfLosers: smaller > 0 ? fee / smaller : 0,
  };
}

/**
 * `poolFee`'s stake-share arm (FEE-TAX-2026-10), in three cases, in this order:
 *   · ONE SIDE ONLY, OR NO MONEY AT ALL → what settlement does there (ruling 2): a full refund at no fee — `fee` 0, no
 *     tax, `netPool` the whole pool. Under the two older pool models this falls out of their maths; under this one it
 *     does not (a fee on every stake would charge the funded side), so it is a branch — and a preview can never print a
 *     fee no settlement will take, the "phantom fee" `chargedFee` was built to stop readers counting.
 *   · both sides funded, no winning side → F alone: the fee is known before the outcome, the tax is not (it is a share
 *     of the LOSING side's net stakes) — `netPool` = pool − F, `winningsTax`/`prizeFund` absent;
 *   · both sides funded, with a side → `stakeShareTotals`, the very figures settlement pays by.
 * There is no ceiling and no cap in this model: `commission` and `ceiling` carry the fee itself, `capped` is false, and
 * `shareOfLosers` is the flat rate (our take of the losers' stakes is that rate, as it is of every stake).
 */
function stakeSharePoolFee(yesPool: number, noPool: number, r: ResolvedRates, rates: Partial<FeeRates>, winningSide: Side | undefined): FeeBreakdown {
  const yes = Math.max(0, yesPool);
  const no = Math.max(0, noPool);
  if (yes === 0 || no === 0) return stakeShareBreakdown(yes, no, 0, 0, yes + no);
  const bp = stakeFeeBpOf(r);
  if (winningSide === undefined) {
    const fee = roundHalfUpBp(yes, bp) + roundHalfUpBp(no, bp);
    return stakeShareBreakdown(yes, no, bp, fee, yes + no - fee);
  }
  const t = stakeShareTotals(yes, no, winningSide, rates);
  return { ...stakeShareBreakdown(yes, no, bp, t.fee, t.netPool), winningsTax: t.winningsTax, prizeFund: t.prizeFund };
}

/** A stake-share figure laid out as a `FeeBreakdown` (no ceiling, no cap: `commission` and `ceiling` carry the fee). */
function stakeShareBreakdown(yes: number, no: number, feeBp: number, fee: number, netPool: number): FeeBreakdown {
  return {
    pool: yes + no, smaller: Math.min(yes, no), larger: Math.max(yes, no),
    commission: fee, ceiling: fee, fee, netPool, capped: false, shareOfLosers: feeBp / 10_000,
  };
}

/**
 * THE FEE SETTLEMENT ACTUALLY DEBITS — for READERS only (landing v3 C1, the spec's §9 "phantom fee").
 *
 * 🔴 WHY THIS EXISTS. `poolFee(yes, no, rates, winner)` answers "what would the fee be on these pools if
 * `winner` won" — and it cannot know that `settleMarket` never gets that far on two shapes of pool:
 *   · ONE SIDE ONLY (exactly one pool holds money, the verdict is YES or NO): settlement refunds every open
 *     stake in full at ZERO fee, whatever the verdict — its one-sided branch, rules §7. Under loser-share a
 *     YES-only pool resolved NO has a "losing pool" of YES money, so `poolFee` prices a positive fee off the
 *     funded side that nobody was ever charged.
 *   · VOID: every stake is refunded at zero fee; under capped-commission `poolFee` with no winner still
 *     returns min(commission, ceiling) > 0 on a two-sided pool.
 * Readers that called `poolFee(…, resolvedOutcome)` — the finance per-poll fee view, the landing's settled
 * strip, the house book's recompute, the officer's market page — therefore counted or printed fee revenue
 * settlement never took.
 *
 * ⛔ IT MIRRORS `settleMarket` EXACTLY, IN ITS ORDER: (1) the one-sided predicate, character for character
 * (`opts.outcome !== "VOID" && ((yes > 0 && no === 0) || (yes === 0 && no > 0))`) → refund, fee 0;
 * (2) VOID → refund, fee 0; (3) otherwise the very call settlement debits, `poolFee(yes, no, rates, winner)`.
 * `test:charged-fee` drives the REAL settlement on every branch and pins this equal to what it debited.
 * ⭐ A MILLIONEA WEEK (S6) is handed in with `week`, as its settlement left it, and priced by its own model
 * (`jackpotCharged`); `test:maswali-reporting` pins that arm to what the real week settlement booked, on both stores.
 * ⭐ A STAKE-SHARE MARKET (FEE-TAX-2026-10) takes the same refund branch first (ruling 2: one side only, or VOID, is
 * refunded in full at no fee), and otherwise `stakeShareTotals` — `fee` = F, our fee only, with `winningsTax` = T and
 * `prizeFund` = P beside it; what the market kept back from its players is fee + winningsTax (`test:charged-fee`).
 * ⛔ It is NOT on any money path: `poolFee` and settlement are untouched, and nothing may pay, book or
 * refund from this. On a refund every charge field is 0 and `netPool` is the whole pool (it all went back).
 */
export interface ChargedFee extends FeeBreakdown {
  /** Settlement's refund branch (VOID, or one side only): every open stake returned in full, no fee. */
  refunded: boolean;
}

/**
 * ⭐ A MILLIONEA WEEK, AS ITS OWN SETTLEMENT LEFT IT (MASWALI-BUILD S6; RULES §2.12, §3 `jackpot-payout`) — the week's
 * mirrored columns (`MaswaliCycle`), written in the same transaction as its ledger group: VOIDED (MR-18: every ticket
 * refunded, no fee), or SETTLED with the jackpot J it paid (null when no ticket won) and its winning tickets k.
 */
export type JackpotWeekSettled =
  | { state: "VOIDED" }
  | { state: "SETTLED"; jackpot: number | null; winningTickets: number };

export function chargedFee(
  // `productLine` is a plain string so this module stays import-free (it ships to the client): the stored value is enough.
  m:
    | { yesPool: number; noPool: number; resolvedOutcome: Side | "VOID"; productLine?: string | null }
    | { yesPool: number; noPool: number; productLine: "MASWALI"; week: JackpotWeekSettled },
  rates: Partial<FeeRates>,
): ChargedFee {
  // ⭐ S6 · A MILLIONEA WEEK IS PRICED BY ITS OWN MODEL, from its own settlement (`jackpotCharged`): never this poll mirror.
  if ("week" in m) return jackpotCharged(m, m.week, rates);
  // ⛔ S0.5 · THE FENCE, KEPT FOR A WEEK HANDED IN WITHOUT ITS SETTLEMENT. A Millionea week holds every shilling on one
  // side, so the poll mirror below would call it a zero-fee refund; a caller that names a week but not how it settled
  // fails loudly rather than printing a wrong figure. Every caller passes `productLine` (`test:maswali-fence` census).
  if (m.productLine === "MASWALI") {
    throw new Error("chargedFee: a Millionea week's fee is the jackpot-payout model — hand in the week as its settlement left it, never this poll mirror.");
  }
  const isOneSided = m.resolvedOutcome !== "VOID"
    && ((m.yesPool > 0 && m.noPool === 0) || (m.yesPool === 0 && m.noPool > 0));
  if (isOneSided || m.resolvedOutcome === "VOID") {
    const yes = Math.max(0, m.yesPool);
    const no = Math.max(0, m.noPool);
    const pool = yes + no;
    return {
      pool, smaller: Math.min(yes, no), larger: Math.max(yes, no),
      commission: 0, ceiling: 0, fee: 0, netPool: pool, capped: false, shareOfLosers: 0,
      refunded: true,
    };
  }
  // ⭐ stake-share (FEE-TAX-2026-10): what its settlement keeps back, from the two totals — `fee` is F ONLY (our fee) and
  // the winnings tax T stands beside it, so staked − paid back = fee + winningsTax, and `netPool` is what the winners got.
  // The same `stakeShareTotals` the split settles by, so a reader and the settlement cannot price two different laws.
  // (Both pools empty — a market nobody backed — prices to zero; one side only never reaches here: refunded above.)
  if (resolveFeeModel(rates) === "stake-share") {
    const yes = Math.max(0, m.yesPool);
    const no = Math.max(0, m.noPool);
    const t = stakeShareTotals(yes, no, m.resolvedOutcome, rates);
    return {
      ...stakeShareBreakdown(yes, no, stakeFeeBp(rates) ?? 0, t.fee, t.netPool),
      winningsTax: t.winningsTax, prizeFund: t.prizeFund,
      refunded: false,
    };
  }
  return { ...poolFee(m.yesPool, m.noPool, rates, m.resolvedOutcome), refunded: false };
}

/**
 * ⭐ THE FEE A MILLIONEA WEEK'S SETTLEMENT TOOK, recomputed the way it took it (MASWALI-BUILD S6; MASWALI-PLAN §5b).
 * The settlement runs `maswali-money.ts → settleArithmetic`, whose fee is `Math.round(feeRate × J)`, and only when the
 * week has a winning ticket: this is that expression, over the week's FROZEN rate (`feeSnapshot.jackpotFeeRate`, read
 * as `readRates` reads every rate) and the J the settlement stamped. So a reader that compares it with the fee the
 * week BOOKED is comparing two independent records, and the sunset's J (R + S, no floor) needs no arm of its own.
 *   · VOIDED → every ticket refunded at no fee (MR-18): the poll mirror's refund shape, `netPool` the whole pool.
 *   · SETTLED, no winning ticket → no fee, nothing shared: S rolled to the jackpot (MR-21), `netPool` 0.
 *   · SETTLED with k ≥ 1 → fee = round(rate × J), `netPool` = J − fee (what the k shares and the dust came out of).
 * ⛔ A week whose snapshot froze another model, or that paid with no jackpot on record, THROWS — a reader must fail
 * loudly rather than print a fee nobody can stand behind (`readRates` already refuses a jackpot model with no rate).
 * Not on any money path, as `chargedFee`.
 */
function jackpotCharged(m: { yesPool: number; noPool: number }, week: JackpotWeekSettled, rates: Partial<FeeRates>): ChargedFee {
  const yes = Math.max(0, m.yesPool);
  const no = Math.max(0, m.noPool);
  const pool = yes + no;
  const shape = { pool, smaller: Math.min(yes, no), larger: Math.max(yes, no), ceiling: 0, capped: false, shareOfLosers: 0 };
  if (week.state === "VOIDED") return { ...shape, commission: 0, fee: 0, netPool: pool, refunded: true };
  const r = readRates(rates);
  if (r.feeModel !== "jackpot-payout") {
    throw new Error(`chargedFee: a Millionea week priced under ${r.feeModel} — its snapshot froze no jackpot fee (RULES §3)`);
  }
  const k = week.winningTickets;
  if (!Number.isSafeInteger(k) || k < 0) throw new Error(`chargedFee: a Millionea week's winning tickets must be a whole count, got ${k}`);
  if (k === 0) return { ...shape, commission: 0, fee: 0, netPool: 0, refunded: false };
  const J = week.jackpot;
  if (J === null || !Number.isSafeInteger(J) || J < 0) {
    throw new Error(`chargedFee: a Millionea week that paid ${k} ticket(s) has no settled jackpot on record (got ${J})`);
  }
  const fee = Math.round(r.jackpotFeeRate * J);
  return { ...shape, commission: fee, fee, netPool: J - fee, refunded: false };
}

/**
 * The withdrawal fee a player is charged: `round(amount * rate)`, floored at 0.
 * Isomorphic — the confirm modal (client) and wallet-service (server) both call
 * this, so what the player is shown before confirming equals what leaves the
 * wallet, to the shilling (audit H12). `net = amount - fee`.
 */
export function computeWithdrawalFee(amount: number, rate: number): number {
  return Math.max(0, Math.round(amount * Math.max(0, rate)));
}

/**
 * The smallest payout the GATEWAY will accept, in shillings.
 *
 * 🔴 Found live on 2026-07-31, and it had been unreachable until that day. Selcom's
 * `/walletcashin/process` answers:
 *
 *     resultcode=013  "Payment amount must be greater than or equal to TZS 1,000."
 *
 * It is not in the credentials pack or the API digest — no payout had ever got far enough
 * to meet it, because the rail itself was down. The first one that did was a TZS 1,000
 * withdrawal, and it failed: our minimum was 1,000 GROSS, the fee took 15, and we asked
 * Selcom to send 985.
 */
export const PROVIDER_MIN_PAYOUT_TZS = 1_000;

/**
 * The smallest GROSS withdrawal whose NET still clears `PROVIDER_MIN_PAYOUT_TZS`.
 *
 * ⚠️ Derived, never hardcoded — and that is the whole point. `withdrawalFeeRate` is
 * admin-tunable at `/admin/config`, so a constant minimum would silently break
 * the day someone edits the fee, in exactly the way that is invisible until a player is
 * refused. The gateway's floor is on the NET, so the check belongs on the NET.
 *
 * 🔴 AND IT WALKS TO THE TRUE BOUNDARY, BECAUSE THE FEE ROUNDS (2026-10-07). The algebraic
 * answer `ceil(floor / (1 − rate))` gave 1,016 at 1.5%, but `computeWithdrawalFee` ROUNDS:
 * 1,015 pays round(15.225) = 15 and nets exactly 1,000, which the gateway accepts and
 * `withdraw()` allowed — so every surface stated a minimum one shilling above the real one
 * (found by the money-and-compliance review of the owner's "state the true minimum" ruling).
 * Net is non-decreasing in the gross (the fee grows by at most 1 per shilling while rate < 1),
 * so stepping from the algebraic answer, with the SAME fee function, finds the exact boundary.
 *
 * ⚠️ This note used to add *"(it is 1.5% in production today, not the 1% default)"*.
 * That parenthetical outlived its own fact: `DEFAULT_WITHDRAWAL_FEE_RATE` has read 0.015
 * since 2026-08-14, so there has been no "1% default" to contrast with for weeks — in the
 * one file that owns the arithmetic. ⛔ It states no rate now, by design: the rule lives in
 * `docs/RULES.md` §2.7, the fallback in `DEFAULT_WITHDRAWAL_FEE_RATE` above, and the live
 * value in `market.config`. A number written twice is a number that will disagree with itself.
 */
export function minWithdrawalForRate(rate: number): number {
  const r = Math.min(Math.max(0, rate), 0.9); // a fee ≥ 100% has no solution; clamp rather than divide by ~0
  const nets = (gross: number) => gross - computeWithdrawalFee(gross, r) >= PROVIDER_MIN_PAYOUT_TZS;
  let gross = Math.ceil(PROVIDER_MIN_PAYOUT_TZS / (1 - r));
  while (nets(gross - 1)) gross--;
  while (!nets(gross)) gross++;
  return gross;
}

/**
 * Invariant 1, enforced. Throws rather than paying a winner less than he staked.
 *
 * Refusing to settle is the safe direction: the pool stays intact, the market
 * stays OPEN, an officer sees the failure. Paying the winner 93,150 on a 100,000
 * stake — the bug this whole change exists to kill — is not recoverable, because
 * by the time anyone notices, the money is gone.
 */
export function assertWinnerFloor(payout: number, stake: number, ctx: string): void {
  if (stake > 0 && payout < stake) {
    throw new Error(
      `[payout] WINNER FLOOR BREACHED (${ctx}): a WIN position staked ${stake} would be paid ${payout}. ` +
        `This must be impossible — fee <= feeCeilingRate * smallerSide guarantees payout >= stake for any ` +
        `commissionRate, provided feeCeilingRate <= 1. Refusing to settle. Check the poll's feeSnapshot.`,
    );
  }
}

/**
 * THE STAKE-SHARE FLOOR (FEE-TAX-2026-10, ruling 1). A `stake-share` winner may be paid less than its STAKE — the fee
 * comes out of every stake — but never less than `floor`: its NET stake (stake − its fee share) in a settlement split,
 * where it holds exactly; or, in a one-position projection, stake − rhu(stake) − 1, the one-shilling bound of a
 * projection against the split's per-side rounding. Throws rather than pay below it, for the reason
 * `assertWinnerFloor` gives: refusing to settle is safe, and an underpayment is gone once it is paid.
 * ⛔ Never `assertWinnerFloor` on a stake-share market — that would refuse every lopsided market the ruling allows.
 */
export function assertNetStakeFloor(payout: number, floor: number, ctx: string): void {
  if (payout < floor) {
    throw new Error(
      `[payout] NET-STAKE FLOOR BREACHED (${ctx}): a stake-share winner would be paid ${payout}, below its floor of ` +
        `${floor} (its stake less its fee). The prize share added to a net stake is never negative, so this must be ` +
        `impossible. Refusing to settle. Check the market's feeSnapshot.`,
    );
  }
}

// ── Payouts ─────────────────────────────────────────────────────────────────

/**
 * SETTLEMENT payout. The pools are final and ALREADY CONTAIN this position's
 * stake. This is the function that moves money, and every projection/disclosure
 * surface must route through it (or `projectedPayout`, which just adds the stake
 * and calls it) so that what we tell a player equals what we pay him, exactly.
 */
export function settledPayoutFor(
  opts: { yesPool: number; noPool: number; side: Side; stake: number },
  rates: Partial<FeeRates>,
): PayoutResult {
  // stake-share (FEE-TAX-2026-10): its own projection — the per-side rounding, the net-stake floor and the one-sided
  // mirror. Every older model takes the path below, byte for byte, and keeps `assertWinnerFloor`.
  if (readFeeModel(rates?.feeModel) === "stake-share") return stakeShareSettledPayout(opts, rates);
  // The position's own side IS the winning side in the scenario this payout is for
  // ("if MY side wins"). For loser-share that fixes the loser = the opposite pool;
  // for capped-commission it is ignored (outcome-neutral).
  const fee = poolFee(opts.yesPool, opts.noPool, rates, opts.side);
  const winningPool = opts.side === "YES" ? opts.yesPool : opts.noPool;

  if (winningPool <= 0 || opts.stake <= 0) {
    return { payout: 0, net: 0, share: 0, ratio: 0, fee };
  }

  const share = opts.stake / winningPool;
  const payout = Math.max(0, Math.round(share * fee.netPool));

  assertWinnerFloor(payout, opts.stake, `pools ${opts.yesPool}/${opts.noPool}, side ${opts.side}`);

  return {
    payout,
    net: payout - opts.stake,
    share,
    ratio: payout / opts.stake,
    fee,
  };
}

/**
 * `settledPayoutFor` under `stake-share` — ONE position's payout if its side wins, from the final pools (which already
 * hold its stake). It is `share × netPool`, netPool = pool − F − T from `stakeShareTotals` — the per-side rounding the
 * split settles by — which is exactly the single-position form of the split: (stake − its share of F_w) + its share of
 * (P − T) = stake × (W − F_w + P − T) / W. The split rounds the fee, the prize and the tax per winner by largest
 * remainder and this rounds once, so the two agree to within a shilling or two — a PROJECTION; settlement pays the split.
 *
 * ⭐ THE ONE-SIDED MIRROR. If the OTHER side holds nothing, settlement refunds every stake in full at no fee (ruling 2),
 * so the honest projection is the stake itself — never the 87% a fee on every stake would print. `payoutFor` adds the
 * projected stake before it calls this, so the first bet on an empty market is quoted its own stake back. It is the ONE
 * branch that answers a one-sided pool here: `stakeShareTotals` refuses one, so a projection that lost this line fails
 * loudly instead of quoting 87% (`red:stake-share-fee` drops it and requires the suite to go red).
 *
 * ⛔ THE FLOOR IS THE NET STAKE, NOT THE STAKE (ruling 1): payout ≥ stake − rhu(stake) − 1, the projection's one-shilling
 * bound against the split's rounding (`assertNetStakeFloor`). Proof: P ≥ T, so netPool ≥ W − F_w, and F_w ≤ f·W + ½; hence
 * share × netPool ≥ stake − f·stake − ½, and its rounding is ≥ stake − rhu(stake) − 1. A below-stake figure is a true
 * statement under this model, and `leanFor` names it `below`.
 */
function stakeShareSettledPayout(
  opts: { yesPool: number; noPool: number; side: Side; stake: number },
  rates: Partial<FeeRates>,
): PayoutResult {
  // A projection IS pricing: a malformed or incomplete stake-share rate set refuses here, whatever the pools.
  const { feeBp } = stakeSharePricing(rates);
  const yes = Math.max(0, opts.yesPool);
  const no = Math.max(0, opts.noPool);
  const winningPool = opts.side === "YES" ? yes : no;
  const otherPool = opts.side === "YES" ? no : yes;
  if (winningPool <= 0 || opts.stake <= 0) {
    return { payout: 0, net: 0, share: 0, ratio: 0, fee: poolFee(yes, no, rates, opts.side) };
  }
  if (otherPool <= 0) return { payout: opts.stake, net: 0, share: opts.stake / winningPool, ratio: 1, fee: stakeShareBreakdown(yes, no, 0, 0, yes + no) };
  const t = stakeShareTotals(yes, no, opts.side, rates);
  const share = opts.stake / winningPool;
  const payout = Math.max(0, Math.round(share * t.netPool));
  assertNetStakeFloor(payout, opts.stake - roundHalfUpBp(opts.stake, feeBp) - 1, `projection, pools ${yes}/${no}, side ${opts.side}`);
  return {
    payout, net: payout - opts.stake, share, ratio: payout / opts.stake,
    fee: { ...stakeShareBreakdown(yes, no, feeBp, t.fee, t.netPool), winningsTax: t.winningsTax, prizeFund: t.prizeFund },
  };
}

/**
 * WHICH positions the largest-remainder allocators must be fed — the winning
 * side, narrowed to the positions whose stake is STILL IN the winning pool.
 *
 * ⭐ THIS IS A FUNCTION BECAUSE IT IS A RULE, NOT A FILTER. Both allocators below
 * document one precondition — `Σ(stake over winners) == winningPool` — and every
 * guarantee they make rests on it. Nothing enforced it, because the decision lived
 * inline in `settleMarket`'s render of its own position list, where no suite could
 * reach it. It is exported so `test:payout-alloc` can drive the real decision.
 *
 * 🔴 E-200, measured on production 2026-08-24. The call site read
 * `allMarketPositions.filter((wp) => wp.side === opts.outcome)` — side only, ANY
 * status — so a **CASHED_OUT** position on the winning side was counted as a winner.
 * Its stake had already left the pool when the player exited, so the winner set
 * summed to MORE than `winningPool`:
 *
 *     mkt_c97209dbe6e1fa584472 — winningPool 184,505, winner set 189,505 (Δ +5,000)
 *
 * ⛔ AND THE FAILURE IS SILENT, WHICH IS WHY IT SURVIVED. An oversized winner set
 * makes `allocated` overshoot, so `remainder = floor(netPool) - allocated` goes
 * NEGATIVE and `for (…; remainder > 0; …)` simply never runs — the largest-remainder
 * top-up is skipped ENTIRELY, on the payouts and on the fee alike. Thirteen winners
 * were paid 185,498 instead of 185,505 and the house collected 492 instead of 499;
 * the 14 TZS stayed in escrow. ⚠️ The overall ledger still summed to zero, so
 * `test:trial-balance` and `test:money-invariants` were green over it — the same
 * self-cancelling shape that hid the 2026-08-11 commission defect.
 *
 * ⚠️ `settleMarket` already SAYS this, three lines above where it failed to do it:
 * *"A CASHED_OUT (or otherwise already-settled) position has already paid out and
 * had its stake removed from the pool"*. The comment was right; the filter was not.
 *
 * ⛔ ALLOWLIST, NOT DENYLIST — deliberately. `WIN` and `OPEN` are the only two states
 * in which a position is still owed money out of `netPool`: OPEN is about to be paid,
 * WIN was paid on an earlier pass and must receive the IDENTICAL amount if settlement
 * resumes (the determinism `allocateWinnerPayouts` promises). Every other status —
 * CASHED_OUT, VOID, LOSS — has already had its stake settled or refunded out of the
 * pool. A status added later is excluded until someone proves it belongs, which is
 * the safe direction: including a stranger overpays nobody but strands money, while
 * excluding a genuine winner would trip `assertWinnerFloor` loudly.
 *
 * ⚠️ Takes `status` as a plain string so this file stays isomorphic — importing the
 * Prisma `PositionStatus` enum here would drag the server into the client bundle.
 */
export const ALLOCATABLE_WINNER_STATUSES: readonly string[] = ["WIN", "OPEN"];

export function winnersForAllocation<T extends { side: Side; status: string }>(
  positions: readonly T[],
  outcome: Side,
): T[] {
  // ⚠️ ONE LINE ON PURPOSE — `red:payout-alloc` anchors on this statement, and a
  // multi-line anchor cannot match a CRLF tree from an LF declaration. Keep it single-line.
  return positions.filter((p) => p.side === outcome && ALLOCATABLE_WINNER_STATUSES.includes(p.status));
}

/**
 * LARGEST-REMAINDER payout allocation across ALL winners of a settled poll
 * (audit M2). `settledPayoutFor` rounds each winner independently, so the sum can
 * drift a few TZS from `netPool` (bounded, but the operator's fee then differs
 * from `poolFee` by that dust). This allocates so **Σ payouts == floor(netPool)
 * EXACTLY**: floor each winner's exact share, then hand the leftover shillings to
 * the largest fractional parts.
 *
 * Correctness:
 *  - Σ(stake over winners) == winningPool, so Σ(exact share·netPool) == netPool
 *    exactly ⇒ the remainder to distribute is in [0, #winners) — always enough
 *    winners to absorb it.
 *  - Each exact share·netPool ≥ stake (the fee cap ⇒ netPool ≥ winningPool), so
 *    floor(·) ≥ stake (stake is integer) — the winner floor holds; `+1` only helps.
 *    `assertWinnerFloor` re-checks each as a tripwire.
 *  - Deterministic (stable id tiebreak), so a RESUMED settlement computing the
 *    allocation over the SAME full winning-side set reproduces each winner's
 *    amount exactly — no drift across a crash/resume. The residual sub-shilling
 *    (`netPool - floor(netPool)`, < 1 TZS) stays with the house; no money is minted.
 *
 * Returns a Map keyed by the caller's position id.
 */
export function allocateWinnerPayouts(
  winners: Array<{ id: string; stake: number }>,
  winningPool: number,
  netPool: number,
): Map<string, number> {
  const out = new Map<string, number>();
  if (winners.length === 0 || winningPool <= 0 || netPool <= 0) {
    for (const w of winners) out.set(w.id, 0);
    return out;
  }
  const rows = winners.map((w) => {
    const raw = Math.max(0, (w.stake / winningPool) * netPool);
    return { id: w.id, stake: w.stake, floor: Math.floor(raw), frac: raw - Math.floor(raw) };
  });
  let allocated = 0;
  for (const r of rows) { out.set(r.id, r.floor); allocated += r.floor; }
  let remainder = Math.floor(netPool) - allocated; // in [0, winners.length)
  const byFrac = [...rows].sort((a, b) => (b.frac !== a.frac ? b.frac - a.frac : (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));
  for (let i = 0; i < byFrac.length && remainder > 0; i++, remainder--) {
    out.set(byFrac[i].id, (out.get(byFrac[i].id) ?? 0) + 1);
  }
  for (const w of winners) assertWinnerFloor(out.get(w.id) ?? 0, w.stake, `alloc winningPool ${winningPool} netPool ${netPool}`);
  return out;
}

/**
 * Split the poll's SINGLE fee across its winners so the parts sum to EXACTLY the whole.
 *
 * 🔴 WHY THIS EXISTS. The ledger used to derive each winner's commission line on its own,
 * as `Math.round((stake / winningPool) * fee)`. Independent rounding does not have to sum
 * to the fee — and `Math.round` breaks ties UPWARD, so it systematically over-collects.
 * Meanwhile the PAYOUTS were allocated by largest remainder and summed exactly. The
 * difference had to come from somewhere, and it came from the pool: the escrow account
 * finished settlement holding a NEGATIVE balance, i.e. the platform paid out money nobody
 * had staked.
 *
 * ⛔ Measured on production 2026-08-11, not theorised: 9 settled markets held a non-zero
 * pool residual and 7 were negative. On the certification market two winners with exact
 * .5 shares each rounded up — commission 98 + 163 = 261 against a fee of 260 — so
 * `POOL:mkt_85f1bae30206db0995a5` closed at −1.
 *
 * ⚠️ It was invisible to every money suite because the OVERALL ledger still summed to
 * zero: the error lives inside a self-cancelling pair (POOL −1, HOUSE:COMMISSION +1).
 * `test:trial-balance` and `test:money-invariants` were green throughout. An aggregate
 * that balances is not evidence that its components do.
 *
 * Same largest-remainder discipline as `allocateWinnerPayouts`, and the same deterministic
 * tie-break, so a resumed settlement reproduces the identical split.
 */
export function allocateFeeShares(
  winners: Array<{ id: string; stake: number }>,
  winningPool: number,
  fee: number,
): Map<string, number> {
  const out = new Map<string, number>();
  const total = Math.max(0, Math.floor(fee));
  if (winners.length === 0 || winningPool <= 0 || total <= 0) {
    for (const w of winners) out.set(w.id, 0);
    return out;
  }
  const rows = winners.map((w) => {
    const raw = Math.max(0, (w.stake / winningPool) * total);
    return { id: w.id, floor: Math.floor(raw), frac: raw - Math.floor(raw) };
  });
  let allocated = 0;
  for (const r of rows) { out.set(r.id, r.floor); allocated += r.floor; }
  let remainder = total - allocated; // in [0, winners.length)
  const byFrac = [...rows].sort((a, b) => (b.frac !== a.frac ? b.frac - a.frac : (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));
  for (let i = 0; i < byFrac.length && remainder > 0; i++, remainder--) {
    out.set(byFrac[i].id, (out.get(byFrac[i].id) ?? 0) + 1);
  }
  return out;
}

// ── stake-share SETTLEMENT ARITHMETIC (FEE-TAX-2026-10) ─────────────────────
//
// ⭐ ONE ARITHMETIC for the settlement, the close-time disclosure and every reader: `stakeShareSplit` when the positions
// are in hand, `stakeShareTotals` when only the two pools are (the same numbers — the split is built on them). In whole
// shillings, rates in whole basis points, every rounding half up and every per-position part a largest-remainder share,
// so a resumed settlement reproduces every shilling and the pool ends at exactly 0.
//
// ⛔ NEITHER PRICES A ONE-SIDED MARKET. Exactly one side funded is refunded in full at no fee (ruling 2) by the CALLER's
// branch — settlement's, and `chargedFee`'s — before either is asked; both THROW if handed one, so a missing branch fails
// loudly rather than charging the funded side. A market with no money on either side prices to zero.

/** The market's figures under `stake-share`, all whole shillings (`stakeShareTotals`, and the head of every split). */
export interface StakeShareTotals {
  /** F = feeYes + feeNo — OUR fee, on every stake. ⛔ Never the winnings tax. */
  fee: number;
  /** rhu(yesPool, f) — the fee on the YES side's stakes, rounded half up once for the side. */
  feeYes: number;
  /** rhu(noPool, f) — the fee on the NO side's stakes. */
  feeNo: number;
  /** P = the losing pool less the losing side's fee: the losers' net stakes, the prize fund, BEFORE the tax. */
  prizeFund: number;
  /** T = rhu(P, t) — the winnings tax, withheld from the prize fund for TRA. Not revenue, and not a levy on our fee. */
  winningsTax: number;
  /** pool − F − T: what the winners share — their net stakes back plus the prize after tax. */
  netPool: number;
}

/** One winner's part of a `stakeShareSplit`, in whole shillings. */
export interface StakeShareWinnerPart {
  /** fee_i — this stake's largest-remainder share of the WINNING side's fee, by stake. */
  fee: number;
  /** stake − fee: the NET stake. Paid back whatever the prize — the floor of a stake-share payout (ruling 1). */
  net: number;
  /** R_i — this stake's largest-remainder share of the prize fund AFTER the tax (P − T), by stake. */
  prize: number;
  /** tax_i — this stake's largest-remainder share of the winnings tax T, by stake. `prize + tax` = its GROSS winnings. */
  tax: number;
  /** net + prize — what the position is paid. */
  payout: number;
}

/** `stakeShareSplit`'s answer: the totals, every winner's part and every loser's fee, keyed by position id. */
export interface StakeShareSplit extends StakeShareTotals {
  /** Every winner, in id order (a Map's iteration order is part of determinism: a shuffled input gives the same Map). */
  perWinner: Map<string, StakeShareWinnerPart>;
  /** Every loser's fee_j — its largest-remainder share of the LOSING side's fee, by stake; it is paid nothing. In id order. */
  perLoser: Map<string, { fee: number }>;
}

/**
 * The two stake-share rates in the whole basis points the arithmetic charges in — a PRICING read: an incomplete or
 * out-of-range stake-share rate set THROWS (`readStakeShareRates`), and so does any other model, because this arithmetic
 * prices nothing else.
 */
function stakeSharePricing(rates: Partial<FeeRates> | undefined): { feeBp: number; taxBp: number } {
  const r = readRates(rates, "pricing");
  if (r.feeModel !== "stake-share" || r.winningsTaxRate === null) {
    throw new Error(`payout: the stake-share arithmetic prices only a stake-share snapshot with its winnings tax (got ${r.feeModel})`);
  }
  return { feeBp: stakeFeeBpOf(r), taxBp: rateBp(r.winningsTaxRate) };
}

/** Money under this model: a whole, non-negative, exactly representable number of shillings. */
function isWholeTzs(n: unknown): n is number {
  return typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
}

/**
 * LARGEST REMAINDER IN EXACT INTEGERS — the discipline of `allocateWinnerPayouts` and `allocateFeeShares` (floor every
 * exact share; hand the leftover shillings to the largest remainders; ties by id ascending), with the comparison made
 * on the EXACT remainder, (weight × total) mod Σ weights, in BigInt.
 * ⚠️ WHY NOT THOSE TWO'S CODE. They compare FLOAT fractional parts, and two shares that are equal in exact arithmetic can
 * differ in their last bit — which would let a float, not the id, decide a tie the id tie-break was written for. Under
 * `stake-share` every part of every winner is a largest-remainder share, so the remainder is computed exactly. Those two
 * are left as they are: they settle every market frozen under the older models, byte for byte.
 * Requires whole positive weights and a whole non-negative total; asserts the parts sum to the total; returns the Map
 * in id order.
 */
function largestRemainder(rows: ReadonlyArray<{ id: string; weight: number }>, total: number, what: string): Map<string, number> {
  if (!isWholeTzs(total)) throw new Error(`payout: ${what} must be a whole, non-negative number of shillings (got ${total})`);
  const out = new Map<string, number>();
  if (rows.length === 0) {
    if (total !== 0) throw new Error(`payout: ${what} of ${total} has nobody to be shared among`);
    return out;
  }
  const sumW = BigInt(rows.reduce((s, r) => s + r.weight, 0));
  const bigTotal = BigInt(total);
  const parts = rows.map((r) => {
    const exact = BigInt(r.weight) * bigTotal;
    return { id: r.id, floor: Number(exact / sumW), rem: exact % sumW };
  });
  const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const left = total - parts.reduce((s, p) => s + p.floor, 0); // in [0, rows.length) — Σ exact shares = total
  const extra = new Set([...parts].sort((a, b) => (a.rem !== b.rem ? (a.rem > b.rem ? -1 : 1) : byId(a, b))).slice(0, left).map((p) => p.id));
  for (const p of [...parts].sort(byId)) out.set(p.id, p.floor + (extra.has(p.id) ? 1 : 0));
  let sum = 0;
  for (const v of out.values()) sum += v;
  if (left < 0 || left >= rows.length || sum !== total) throw new Error(`payout: ${what} did not share out exactly (${sum} of ${total})`);
  return out;
}

/**
 * THE STAKE-SHARE TOTALS from the two pools alone — for readers that hold no positions (`chargedFee`, a report, the
 * close-time figure). The SAME numbers `stakeShareSplit` settles with: the split is built on this function.
 *   F_YES = rhu(yesPool, f), F_NO = rhu(noPool, f), F = F_YES + F_NO;  P = losingPool − F_losing;  T = rhu(P, t);
 *   netPool = pool − F − T.
 * ⛔ Whole shillings only (refused otherwise, never rounded); a stake-share rate set only, complete (`stakeSharePricing`);
 * a one-sided pool REFUSED (see the section note). Both pools 0 → all zeros.
 */
export function stakeShareTotals(yesPool: number, noPool: number, outcome: Side, rates: Partial<FeeRates>): StakeShareTotals {
  const { feeBp, taxBp } = stakeSharePricing(rates);
  if (!isWholeTzs(yesPool) || !isWholeTzs(noPool)) {
    throw new Error(`payout: stake-share pools must be whole shillings (got ${yesPool} / ${noPool})`);
  }
  if (outcome !== "YES" && outcome !== "NO") throw new Error(`payout: a stake-share market is priced for YES or NO only (got ${String(outcome)})`);
  if (yesPool === 0 && noPool === 0) return { fee: 0, feeYes: 0, feeNo: 0, prizeFund: 0, winningsTax: 0, netPool: 0 };
  if (yesPool === 0 || noPool === 0) {
    throw new Error("payout: a one-sided stake-share market is refunded in full at no fee (ruling 2) — never priced");
  }
  const feeYes = roundHalfUpBp(yesPool, feeBp), feeNo = roundHalfUpBp(noPool, feeBp);
  const fee = feeYes + feeNo;
  const prizeFund = outcome === "YES" ? noPool - feeNo : yesPool - feeYes;
  const winningsTax = roundHalfUpBp(prizeFund, taxBp);
  return { fee, feeYes, feeNo, prizeFund, winningsTax, netPool: yesPool + noPool - fee - winningsTax };
}

/**
 * ⭐ THE STAKE-SHARE SETTLEMENT SPLIT — every winner's and every loser's part, to the shilling (FEE-TAX-2026-10).
 *
 *   per winner i (stake s_i):  fee_i = LR(F_w by s_i);  R_i = LR(P − T by s_i);  tax_i = LR(T by s_i);
 *                              payout_i = (s_i − fee_i) + R_i;   gross winnings_i = R_i + tax_i
 *   per loser j:               fee_j = LR(F_l by s_j); paid nothing
 * LR = largest remainder in exact integers, ties by id (`largestRemainder`) — deterministic, so a resumed settlement
 * reproduces every shilling, and a shuffled input gives the same Maps in the same order.
 *
 * ⛔ IT REFUSES, LOUDLY, EVERY INPUT IT CANNOT SETTLE EXACTLY — the E-200 lesson: a winner set that did not sum to the
 * winning pool once short-paid thirteen winners in silence, because the arithmetic absorbed the error instead of naming
 * it. So: the winners' stakes must sum to the winning pool and the losers' to the losing pool; every stake a whole
 * positive number of shillings; every id unique across both sides; a stake-share rate set, complete; never a one-sided
 * market (refunded by the caller, ruling 2). And it asserts its own result: Σ payout + T + F = pool EXACTLY (no dust, no
 * residual — the pool ends at 0), and every winner's payout ≥ its net stake (`assertNetStakeFloor`, ruling 1 — NOT the
 * stake: a winner on a lopsided market is paid less than they staked, 94,395 on 100,000 against 10,000).
 * The document's worked example (FEE-TAX-PLAN §3): YES 1,000 / 3,000 / 5,000 against NO 10,000 / 20,000 / 5,000, YES
 * wins → F 5,720, P 30,450, T 4,568, payouts 3,746 / 11,237 / 18,729 (`test:stake-share-fee` pins every figure).
 */
export function stakeShareSplit(
  input: {
    yesPool: number;
    noPool: number;
    outcome: Side;
    winners: Array<{ id: string; stake: number }>;
    losers: Array<{ id: string; stake: number }>;
  },
  rates: Partial<FeeRates>,
): StakeShareSplit {
  const { yesPool, noPool, outcome, winners, losers } = input;
  const totals = stakeShareTotals(yesPool, noPool, outcome, rates); // refuses a bad rate set, fractional or one-sided pools
  const winningPool = outcome === "YES" ? yesPool : noPool;
  const losingPool = outcome === "YES" ? noPool : yesPool;
  const ids = new Set<string>();
  for (const p of [...winners, ...losers]) {
    if (typeof p.id !== "string" || p.id === "" || ids.has(p.id)) throw new Error(`payout: stake-share split — position id ${JSON.stringify(p.id)} is missing or not unique`);
    ids.add(p.id);
    if (!isWholeTzs(p.stake) || p.stake === 0) throw new Error(`payout: stake-share split — position ${p.id} has stake ${p.stake}; a stake is a whole positive number of shillings`);
  }
  const sumWinners = winners.reduce((s, w) => s + w.stake, 0);
  const sumLosers = losers.reduce((s, l) => s + l.stake, 0);
  if (sumWinners !== winningPool || sumLosers !== losingPool) {
    throw new Error(
      `payout: stake-share split — the positions do not make the pools (winners ${sumWinners} vs winning pool ${winningPool}, ` +
      `losers ${sumLosers} vs losing pool ${losingPool}). Refusing to settle on a wrong set (E-200).`,
    );
  }
  const feeWinning = outcome === "YES" ? totals.feeYes : totals.feeNo;
  const feeLosing = outcome === "YES" ? totals.feeNo : totals.feeYes;
  const w = winners.map((p) => ({ id: p.id, weight: p.stake }));
  const fees = largestRemainder(w, feeWinning, "the winning side's fee");
  const prizes = largestRemainder(w, totals.prizeFund - totals.winningsTax, "the prize after tax");
  const taxes = largestRemainder(w, totals.winningsTax, "the winnings tax");
  const loserFees = largestRemainder(losers.map((p) => ({ id: p.id, weight: p.stake })), feeLosing, "the losing side's fee");

  const stakeOf = new Map(winners.map((p) => [p.id, p.stake]));
  const perWinner = new Map<string, StakeShareWinnerPart>();
  let paid = 0;
  for (const [id, fee] of fees) {
    const net = (stakeOf.get(id) as number) - fee;
    const prize = prizes.get(id) as number;
    const payout = net + prize;
    assertNetStakeFloor(payout, net, `stake-share split, position ${id}, pools ${yesPool}/${noPool}, ${outcome} won`);
    perWinner.set(id, { fee, net, prize, tax: taxes.get(id) as number, payout });
    paid += payout;
  }
  const perLoser = new Map<string, { fee: number }>();
  for (const [id, fee] of loserFees) perLoser.set(id, { fee });

  if (paid !== totals.netPool || paid + totals.winningsTax + totals.fee !== yesPool + noPool) {
    throw new Error(
      `payout: stake-share split does not conserve the pool — paid ${paid} + tax ${totals.winningsTax} + fee ${totals.fee} ` +
      `against a pool of ${yesPool + noPool}. Refusing to settle.`,
    );
  }
  return { ...totals, perWinner, perLoser };
}

/**
 * PROJECTION for a bet not yet placed: the stake is added to the chosen side
 * first, then the settlement function runs on the resulting pools. Same maths,
 * one code path — a projection that used its own formula is how the old code
 * ended up quoting one number and paying another.
 */
export function payoutFor(
  opts: { yesPool: number; noPool: number; side: Side; stake: number },
  rates: Partial<FeeRates>,
): PayoutResult {
  return settledPayoutFor(
    {
      yesPool: opts.side === "YES" ? opts.yesPool + opts.stake : opts.yesPool,
      noPool: opts.side === "NO" ? opts.noPool + opts.stake : opts.noPool,
      side: opts.side,
      stake: opts.stake,
    },
    rates,
  );
}

/**
 * What the "Payout" column may honestly show for ONE position (E-49).
 *
 * While a market is still trading every OPEN position is a genuine two-sided
 * bet, so `payoutIfWin` is a fair projection. The moment the market has an
 * outcome that stops being true: the losing side will receive nothing, and
 * rendering its `payoutIfWin` under a column headed "Payout" quotes money it
 * can never receive — the SAME figure the actual winner's row shows. Between
 * sealing and settlement every position is still `OPEN`, so that window is
 * exactly when an officer is asked to scan this column.
 *
 * Settled positions carry the real figure and need no qualifier.
 *
 * ⛔ One definition, consumed by BOTH the cell and the sort accessor. Those
 * were two copies of the same expression, which is how a column and its own
 * sort order are able to disagree.
 */
export type PayoutViewKind =
  /** Settled. `amount` is what was actually paid. */
  | "final"
  /** Not settled yet. `amount` is what this side would receive if it wins. */
  | "projected"
  /** The market has resolved against this side. It receives nothing. */
  | "none"
  /** The market VOIDED. `amount` is the stake, coming back in full. */
  | "refund"
  /** Settled, but no figure was recorded — show nothing rather than guess. */
  | "unknown";

export interface PayoutView {
  kind: PayoutViewKind;
  /** `null` only when `kind` is `"unknown"`. */
  amount: number | null;
}

/**
 * The market's terminal answer, as this view needs it. `undefined` = still undecided.
 *
 * ⛔ VOID IS AN OUTCOME. E-56: the first cut of this took `Side | undefined`, so a
 * VOIDED market had no way to say so and fell through the `undefined` branch as
 * "still projected". On production that put a payout on all twelve positions of two
 * markets that had just been voided — one row quoting TZS 16,745 to a player who was
 * being refunded a 5,000 stake. The E-49 fix covered two of the three terminal states
 * and the third was the one live on the page.
 */
export type PayoutOutcome = Side | "VOID";

export function payoutViewFor(
  position: { status: string; side: Side; stake: number; potentialPayout: number; finalPayout?: number | null },
  outcome: PayoutOutcome | undefined,
): PayoutView {
  if (position.status !== "OPEN") {
    return position.finalPayout == null
      ? { kind: "unknown", amount: null }
      : { kind: "final", amount: position.finalPayout };
  }
  // Still OPEN. Only an outcome can turn a projection into a counterfactual.
  if (outcome === undefined) return { kind: "projected", amount: position.potentialPayout };
  // A void pays every side the same thing: the stake, whole. Neither a projection
  // (nothing is being predicted any more) nor nothing (the money is coming back).
  if (outcome === "VOID") return { kind: "refund", amount: position.stake };
  return position.side === outcome
    ? { kind: "projected", amount: position.potentialPayout }
    : { kind: "none", amount: 0 };
}

/**
 * Categorise the payout/stake ratio for the inline notice.
 *
 * There is no `negative` any more — the honest message on a lopsided poll is
 * "your upside is thin because the other side is small", NEVER "you may lose".
 *
 * ⭐ `below` (FEE-TAX-2026-10, ruling 1) — a projected payout UNDER the stake. Reachable only under `stake-share`, where
 * the fee comes out of every stake: a correct call on a lopsided market is paid less than it staked, and the bet screen
 * must say so before the bet. Under the two older pool models a winner's ratio is ≥ 1 (`assertWinnerFloor` throws
 * before anything lower exists), so for every market frozen under them this returns exactly what it always did.
 * ⚠️ A ratio of 0 is NOT `below`: it is `settledPayoutFor`'s answer when there is no position to project (no stake, or
 * no money on the side), not a payout — and it keeps the level it always had, so no older surface changes.
 */
export function leanFor(ratio: number, thinRatio: number = THIN_PROFIT_RATIO): LeanLevel {
  if (ratio > 0 && ratio < 1) return "below";
  return ratio < thinRatio ? "thin" : "fair";
}

// ── Taxes — out of OUR fee, never the player's payout ────────────────────────

/**
 * TRA + GBT levies. These are charged on the COMMISSION WE EARNED and are
 * invisible to the player: his payout is `netPool * share` whether or not we owe
 * a levy on our own cut. Applies identically to a settlement fee and a cash-out
 * fee.
 */
export function levySplit(
  fee: number,
  rates: { traTaxOnCommissionRate: number; gbtLevyOnCommissionRate: number },
): LevySplit {
  const f = Math.max(0, Math.round(fee));
  const traLevy = Math.round(f * clamp(rates.traTaxOnCommissionRate, 0, 1));
  const gbtLevy = Math.round(f * clamp(rates.gbtLevyOnCommissionRate, 0, 1));
  return { fee: f, traLevy, gbtLevy, operatorNet: f - traLevy - gbtLevy };
}

// ── Admin guardrail ─────────────────────────────────────────────────────────

/**
 * The worst payout/stake ratio any winner could suffer under these rates, swept
 * across the whole lean range. Used by the admin config simulator to refuse a
 * save that could pay a winner below his stake.
 *
 * The minimum sits where the winning side is the BIGGER one and the poll is at
 * its most lopsided, so it approaches `1 + (2/3)*L/W` as L/W -> 0 — i.e. it tends
 * to 1 from ABOVE and never crosses it. We sweep numerically anyway rather than
 * trusting the algebra, because this is the check that stops a bad config
 * reaching production.
 *
 * ⭐ `stake-share` (FEE-TAX-2026-10): the same sweep, and an answer BELOW 1 by design (ruling 1). The fee comes out of the
 * winners' stakes too, so the ratio is (1 − f) + (1 − f)(1 − t)·L/W, which tends to 1 − f from ABOVE as L/W → 0 —
 * ≈ 0.871 at the sweep's 99.9/0.1 for 13% and 15%. Under this model the answer is a WARNING for the officer, never a
 * refusal (`market-config.ts → validate`); `stakeShareBreakEvenShare` names the lean where it crosses 1.
 * ⚠️ A stake-share rate set that freezes no tax — an Up & Down profile, whose tax is stamped from `market.config` — is
 * swept at `MAX_WINNINGS_TAX_RATE`, the highest a snapshot may freeze: the worst case, and it never throws for want of it.
 */
export function worstCaseWinnerRatio(rates: Partial<FeeRates>): { ratio: number; atYes: number; atNo: number } {
  const swept: Partial<FeeRates> = resolveFeeModel(rates) === "stake-share" && winningsTaxBp(rates) === null
    ? { ...rates, winningsTaxRate: MAX_WINNINGS_TAX_RATE }
    : rates;
  const POOL = 1_000_000;
  let worst = Number.POSITIVE_INFINITY;
  let atYes = POOL / 2;
  let atNo = POOL / 2;

  // Sweep the lean from 50/50 to 99.9/0.1, both directions, and take the floor.
  for (let i = 500; i <= 999; i++) {
    const yes = (POOL * i) / 1000;
    const no = POOL - yes;
    for (const side of ["YES", "NO"] as const) {
      const winningPool = side === "YES" ? yes : no;
      if (winningPool <= 0) continue;
      // Pass `side` as the winning side so loser-share is swept honestly across
      // BOTH outcomes (its fee depends on which side loses); capped ignores it.
      const { netPool } = poolFee(yes, no, swept, side);
      const ratio = netPool / winningPool; // stake-independent
      if (ratio < worst) {
        worst = ratio;
        atYes = yes;
        atNo = no;
      }
    }
  }
  return { ratio: Number.isFinite(worst) ? worst : 1, atYes, atNo };
}
