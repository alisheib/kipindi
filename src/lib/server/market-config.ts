/**
 * Runtime market-config — the rates, and the stake bounds.
 *
 * Two scopes:
 *   GLOBAL   — applies to every market unless overridden
 *   PER-MARKET — optional override stored against a specific market id
 *
 * `getEffectiveConfig(marketId)` returns the merged values. It is what a NEW
 * market's `feeSnapshot` is stamped from — and, crucially, it is NOT what an
 * existing market is settled at. See `snapshotFromConfig` below.
 *
 * ⚠️ RATES STICK TO THE POLL. Settlement, cash-out and every payout preview read
 * the immutable `feeSnapshot` frozen onto the market at creation, never this live
 * config. Before this change, settlement read live config, so an admin retuning a
 * rate silently repriced bets ALREADY PLACED — while the admin page claimed in
 * writing that it didn't. A rate change now affects FUTURE polls only.
 *
 * The payout formula itself lives in `src/lib/payout.ts` and is re-exported here.
 * It used to be duplicated in both files, with the rates re-declared as separate
 * client constants, and the two copies had already drifted.
 *
 * Every set/clear is HMAC-audited so the GBT inspector trail is intact.
 * Persists across hot-reloads via `globalThis.__50PICK_MARKET_CONFIG`.
 *
 * ⭐ EVERY WRITE IS READ-MODIFY-WRITE AGAINST THE ROW, WITH COMPARE-AND-SWAP (FEE-TAX-2026-10) — `writeMarketConfig`.
 * The writers used to merge onto THIS container's cache and write the whole cache back, so a container that booted before
 * another one's save wrote its stale copy over it — every field, the fee model and the tax included. Now a save reads the
 * row fresh, changes only what it was asked to, swaps it in only while the row still holds what was read, and reads it
 * back before it says "saved". And a market is stamped from a FRESH read that refuses when it fails
 * (`readMarketConfigFresh`), never from whatever this container booted with.
 */
import { audit } from "./audit";
import { configChanges, createConfigIfAbsent, loadConfigResult, replaceConfigIfValue } from "./config-store";
import { hasDatabase } from "./prisma";
import { feeLawLive, newFeeLawRefusal } from "../fee-law-gate";
import {
  DEFAULT_COMMISSION_RATE,
  DEFAULT_FEE_CEILING_RATE,
  DEFAULT_CASHOUT_FEE_RATE,
  DEFAULT_FREE_EXIT_GRACE_MINUTES,
  DEFAULT_PAID_EXIT_WINDOW_MINUTES,
  DEFAULT_WITHDRAWAL_FEE_RATE,
  DEFAULT_WITHDRAWAL_GATEWAY_SHARE_RATE,
  DEFAULT_TRA_TAX_ON_COMMISSION_RATE,
  DEFAULT_GBT_LEVY_ON_COMMISSION_RATE,
  THIN_PROFIT_RATIO,
  PLATFORM_MIN_STAKE,
  PLATFORM_MAX_STAKE,
  MAX_COMMISSION_RATE,
  MAX_FEE_CEILING_RATE,
  FEE_CEILING_WARN_ABOVE,
  DEFAULT_FEE_MODEL,
  DEFAULT_PLATFORM_FEE_RATE,
  DEFAULT_OPERATOR_FEE_RATE,
  DEFAULT_ESTIMATED_WINNINGS_RATE,
  DEFAULT_SHOW_ESTIMATED_WINNINGS,
  MAX_LOSER_SHARE_RATE,
  MAX_ESTIMATED_WINNINGS_RATE,
  MAX_STAKE_FEE_RATE,
  MAX_WINNINGS_TAX_RATE,
  rateBp,
  stakeShareBreakEvenShare,
  winningsTaxBp,
  worstCaseWinnerRatio,
  payoutFor,
  settledPayoutFor,
  leanFor,
  type FeeSnapshot,
  type FeeModel,
  type LeanLevel as LeanLevelType,
} from "../payout";

// The payout engine is ONE implementation, shared with the client. Re-exported
// so existing server call sites keep working without reaching across layers.
export {
  poolFee,
  payoutFor,
  settledPayoutFor,
  leanFor,
  levySplit,
  assertWinnerFloor,
  worstCaseWinnerRatio,
  type LeanLevel,
  type FeeRates,
  type FeeModel,
  type FeeSnapshot,
  type FeeBreakdown,
  type PayoutResult,
} from "../payout";

export type RateConfig = {
  /**
   * Our commission, as a share of the WHOLE pool (0.10 = 10%).
   * Capped in effect by `feeCeilingRate` — see payout.ts.
   */
  commissionRate: number;
  /**
   * THE CEILING. The fee may never exceed this share of the SMALLER side
   * (1/3 = a third). The smaller side is the prize — all the money the winners
   * can actually win — so an uncapped percentage-of-pool fee on a lopsided poll
   * grows bigger than the whole prize and starts eating the winners' own stakes.
   * This is the field that makes "a winner is never paid below his stake" true.
   * Store the exact fraction (1/3), not a rounded 0.33.
   */
  feeCeilingRate: number;
  /** Early cash-out commission (0.10 = 10%), charged after the free-exit window.
   *  Goes to the HOUSE (booked to HOUSE:COMMISSION, levies applied like any other
   *  fee). It previously left the fee sitting in the pool, where the remaining
   *  players collected it and we earned nothing on an early exit. */
  cashOutFeeRate: number;
  /** Minutes after placing a bet during which an exit is FREE (full refund, zero
   *  fee). Was a hardcoded GRACE_PERIOD_MS in market-service.ts. */
  freeExitGraceMinutes: number;
  /** Minutes of PAID exit (at cashOutFeeRate) AFTER the free window. `0` (the
   *  default since 2026-07-22) means NO paid window — the exit LOCKS the moment
   *  the free grace elapses ("5-min free exit, then nothing"). Any positive value
   *  re-opens a paid tail before the lock. Either way the position then rides to
   *  settlement; the time-lock is what makes a late exit — the only kind that can
   *  gut a winner's prize or void a poll you're losing — impossible. */
  paidExitWindowMinutes: number;
  /** Charged to the player on withdrawal. Live value **0.015 = 1.5%**
   *  (`DEFAULT_WITHDRAWAL_FEE_RATE`), admin-settable up to 0.05.
   *  ⚠️ This said `0.01 = 1%` until 2026-09-07 — the fee moved to 1.5% and the Terms of
   *  Service were corrected while seven comments on the money path were not. The example a
   *  field's own docblock gives is the number the next reader will code against.
   *  This is the ONLY thing a
   *  player is ever charged besides the pool commission — there is no withholding
   *  tax. See the note on `traTaxOnCommissionRate`. */
  withdrawalFeeRate: number;
  /** The slice of `withdrawalFeeRate` that goes to the payment gateway
   *  (0.005 = 0.5% of the amount). We keep the remainder. */
  withdrawalGatewayShareRate: number;
  /** Minimum stake in TZS. */
  minStake: number;
  /** Maximum stake in TZS. */
  maxStake: number;
  /** Show "thin upside" notice when projected payout/stake < this. Default 1.05. */
  thinProfitRatio: number;
  /** Starter wallet balance for newly-registered users in TZS.
   *  Default 0 — anyone can sign up but must add funds (or be credited
   *  by an admin) before they can place a stake. Setting this to a
   *  positive number turns 50pick into a free-trial sandbox. */
  starterBalanceTzs: number;
  /** TRA tax as a fraction of OUR FEE (0.10 = 10% of the commission we earned).
   *
   *  TAXES ARE ONLY EVER ON OUR COMMISSION. Never on the player. There is no
   *  withholding tax on a withdrawal — the old code withheld 15% of EVERY
   *  withdrawal, including money a player deposited and never bet, so a player
   *  who deposited 100,000 and placed no bet withdrew 85,000. That is deleted.
   *  A player pays the pool commission (indirectly, via the payout) and the 1%
   *  withdrawal fee, and nothing else.
   *
   *  Does NOT affect player payouts — it comes out of the operator's take. */
  traTaxOnCommissionRate: number;
  /** GBT levy as a fraction of OUR FEE (0.05 = 5% of the commission we earned).
   *  Does NOT affect player payouts — it comes out of the operator's take. */
  gbtLevyOnCommissionRate: number;
  /** How long a resolved market sits in the public objection window before its
   *  money moves. This is a REAL settlement gate, not a display: stage-2 of the
   *  resolution ceremony adjudicates the outcome but pays nobody, and the
   *  lifecycle sweeper settles the market only once this window has elapsed AND
   *  no objection is open against it (see settleMarket / settleDueMarkets in
   *  market-service.ts). A player who disputes a verdict therefore does so while
   *  the pool is still intact and an upheld objection can still change the money.
   *
   *  0 = no window (settle on the next sweep). Legal for a play-money/testing
   *  deployment; for the licensed real-money product this MUST stay > 0 — it is
   *  the control we describe to the regulator. */
  objectionWindowHours: number;

  // ── Scheduled resolution (per-market timer, replaces the poll-everything sweep) ──
  // Operational, NOT priced into a position, so — like objectionWindowHours — these
  // stay LIVE (they are read at resolve-trigger time, never frozen into feeSnapshot).
  /**
   * How a market's outcome is sealed when its resolve timer fires at resolutionAt.
   *  - "human" (default): the AI web-checks the market and pre-fills a recommendation,
   *    then officers seal + settle via the two-officer ceremony (POCA §16).
   *  - "auto": the AI seals AND settles WITHOUT the ceremony, but ONLY when its
   *    confidence clears `resolveConfidenceThreshold`; low-confidence / UNKNOWN always
   *    falls back to human. Owner-controlled (per-market override lives on the market
   *    row). It overrides the two-officer rule when enabled — Ali's dated decision
   *    2026-07-24, see docs/COMPLIANCE-DECISIONS.md.
   */
  resolutionMode: "human" | "auto";
  /** Minimum AI confidence (0-100) required to AUTO-resolve. Below this the market
   *  always falls back to the human ceremony, whatever the mode. Default 90. */
  resolveConfidenceThreshold: number;
  /** Minutes AFTER resolutionAt to fire the resolve trigger. Default 0 = fire exactly
   *  at resolutionAt. A small positive offset gives an official source time to publish
   *  before the AI checks. */
  resolveOffsetMinutes: number;

  // ── Fee MODEL (owner decision 2026-07-23) ─────────────
  // These are FROZEN per poll at creation. Changing them here reprices only FUTURE
  // polls; every existing poll keeps the model + rates its snapshot froze, so the
  // two maths never mix (docs/FEE-MODEL-DECISION-2026-07-14.md, docs/COMPLIANCE-DECISIONS.md).
  /**
   * Which fee formula NEW polls use.
   *  - `capped-commission`: fee = min(commissionRate·pool, feeCeilingRate·smaller).
   *  - `loser-share` (default): fee = (platformFeeRate+operatorFeeRate)·losingPool.
   *  - `stake-share` (FEE-TAX-2026-10 — decided, NOT in force: `validate` refuses it while `fee-law-gate.ts` is shut):
   *    fee = (platformFeeRate+operatorFeeRate) of EVERY stake, and `winningsTaxRate` of the losers' net stakes withheld
   *    for TRA (`payout.ts → stakeShareSplit`).
   * loser-share is outcome-DEPENDENT (the fee depends on which side loses) — an
   * explicit owner override of the licence's outcome-neutral posture.
   */
  feeModel: FeeModel;
  /** loser-share: "Platform" fee slice, share of the LOSING pool (default 0.03). */
  platformFeeRate: number;
  /** loser-share: "Operator" fee slice, share of the LOSING pool (default 0.10). */
  operatorFeeRate: number;
  /**
   * jackpot-payout only (Maswali Millionea, S1): the share of a week's jackpot taken at payout. Never in the global
   * config (`validateRateConfig` refuses the model for polls); a week passes it as a `rateOverrides` field from
   * `maswali.config` when it opens, and it freezes into that week's snapshot.
   */
  jackpotFeeRate?: number;
  /**
   * stake-share only (FEE-TAX-2026-10): the WINNINGS TAX withheld from a market's prize fund for TRA (0.15 = 15%), frozen
   * onto every stake-share poll and Up & Down round at creation — a round's comes from HERE, never from its chain's
   * profile (a profile may not carry one). ⛔ NO CODE DEFAULT: absent from `DEFAULT_GLOBAL_CONFIG` on purpose, it enters
   * force only by an admin's audited save — refused while `fee-law-gate.ts` is shut — and a stake-share market is never
   * stamped without it (`snapshotFromConfig` refuses). Inert under every other model. Never on a per-market override.
   */
  winningsTaxRate?: number;
  /** loser-share DISPLAY only: the fixed pre-bet "possible winnings" a player is
   *  shown = stake × (1 + this). default 0.5 → a 1.5× headline. NOT the pari-mutuel
   *  payout — the disclaimer beside it says so. */
  estimatedWinningsRate: number;
  /** loser-share DISPLAY only: whether to show that pre-bet estimate at all. */
  showEstimatedWinnings: boolean;
};

export const DEFAULT_GLOBAL_CONFIG: RateConfig = {
  // ⚫ LEGACY FIELDS, and the comment that stood here called them "THE RULE". They are
  // not: THE rule is 13% of the LOSING side (docs/RULES.md §2.1, live since 2026-07-23 on
  // polls and 2026-08-14 on Up & Down), and it is expressed by platformFeeRate +
  // operatorFeeRate below. These two describe the RETIRED capped-commission formula —
  // fee = min(commissionRate × pool, feeCeilingRate × smaller) — and they stay defined for
  // exactly one reason: 4,220 Up & Down rounds and 58 polls are FROZEN at that model and
  // must settle by it forever. ⛔ A cold start must never leave a reader of an old snapshot
  // looking at `undefined`.
  commissionRate: DEFAULT_COMMISSION_RATE,   // 0.10 — legacy arm only
  feeCeilingRate: DEFAULT_FEE_CEILING_RATE,  // 1/3 — the exact fraction, not 0.33
  // Early exit after the free window. Goes to the HOUSE (it used to be left in
  // the pool, so we earned nothing on an early exit).
  cashOutFeeRate: DEFAULT_CASHOUT_FEE_RATE,               // 0.10 (only applies if a paid window is set)
  freeExitGraceMinutes: DEFAULT_FREE_EXIT_GRACE_MINUTES,      // 5
  paidExitWindowMinutes: DEFAULT_PAID_EXIT_WINDOW_MINUTES,    // 0 → exit locks at the free window (no paid exit)
  // Withdrawal. The ONLY thing a player is charged directly. No withholding tax.
  withdrawalFeeRate: DEFAULT_WITHDRAWAL_FEE_RATE,                     // 0.015 (1.5%) — matches live
  withdrawalGatewayShareRate: DEFAULT_WITHDRAWAL_GATEWAY_SHARE_RATE,  // 0.005 → gateway
  // Stake floor and ceiling — PLATFORM_MIN_STAKE / PLATFORM_MAX_STAKE PER BET across ALL
  // products (owner, 2026-07-26; made a rule 2026-08-14; the minimum lowered 2026-10-12 —
  // docs/RULES.md §2.3 states the figures, payout.ts holds them).
  // Enforced server-side in buyPosition via getEffectiveConfig, and the admin door
  // below validates against the same two constants so the platform cannot be
  // configured out of its own rule.
  minStake: PLATFORM_MIN_STAKE,
  maxStake: PLATFORM_MAX_STAKE,
  thinProfitRatio: THIN_PROFIT_RATIO,
  // Starter balance for new wallets. 0 in production — only tester phones
  // (TESTER_BOOTSTRAP_PHONES env) get 100K for QA. Admin can raise this
  // temporarily at /admin/config for promotional campaigns.
  starterBalanceTzs: 0,
  // Levies on OUR FEE. Out of the operator's take, never the player's payout.
  traTaxOnCommissionRate: DEFAULT_TRA_TAX_ON_COMMISSION_RATE,    // 10% of our fee → TRA
  gbtLevyOnCommissionRate: DEFAULT_GBT_LEVY_ON_COMMISSION_RATE,  // 5% of our fee → GBT
  /**
   * The objection window players get before a verdict's money moves.
   *
   * ⭐ 1, not 24, from 2026-09-05 — management's decision, relayed by Ali, to shorten the
   * post-settlement dispute period and speed up payout cycles.
   *
   * ⛔ CHANGING THIS CONSTANT DOES NOT CHANGE PRODUCTION. The live value is the persisted
   * snapshot that `ensureHydrated` merges OVER these defaults, so a deploy alone moves
   * nothing — the flip is an audited act through `/admin/config` (see `live-poll-settle-drill`
   * and `market-config-diff.cjs`). No `CONFIG_VERSION` reconcile rule was added on purpose:
   * this is the control the platform describes to the regulator, and it must move by a
   * recorded human act rather than silently on a deploy.
   *
   * ⚠️ AND IT IS NOT RETROACTIVE. `objectionsClosedAt` is stamped at SEAL from the config then
   * in force, so every market sealed before the flip keeps its original deadline — until an
   * upheld objection with remedy REVERSE re-stamps it at the live value.
   */
  objectionWindowHours: 1,
  // Scheduled resolution. Default HUMAN — the AI recommends, officers seal (POCA §16).
  // Flip to "auto" (globally or per-market) to let the AI seal + settle on its own
  // above the confidence floor; low-confidence always falls back to human.
  resolutionMode: "human",
  resolveConfidenceThreshold: 90, // matches the sentinel's long-standing close threshold
  resolveOffsetMinutes: 0,        // fire exactly at resolutionAt
  // Fee model NEW polls freeze. Owner (2026-07-23) set the default to
  // "loser-share": fee = 13% of the losing pool (Platform 3% + Operator 10%),
  // and players see a fixed 1.5× "possible winnings" estimate pre-bet.
  feeModel: DEFAULT_FEE_MODEL,                          // "loser-share"
  platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,           // 0.03
  operatorFeeRate: DEFAULT_OPERATOR_FEE_RATE,           // 0.10
  // ⛔ `winningsTaxRate` is ABSENT, and that is the control (FEE-TAX-2026-10). The 15% of Ali's ruling 3 enters force by
  // an admin's audited save only, after release R5; a cold start must never invent a tax nobody saved.
  estimatedWinningsRate: DEFAULT_ESTIMATED_WINNINGS_RATE, // 0.5 → 1.5× headline
  showEstimatedWinnings: DEFAULT_SHOW_ESTIMATED_WINNINGS,  // true
};

/**
 * The rates that get FROZEN onto a market at creation.
 *
 * This is the fix for the thing the admin page has been claiming in writing but
 * not doing: settlement used to read LIVE config, so retuning a rate silently
 * repriced bets that had already been placed. Settlement, cash-out and every
 * payout preview now read this snapshot. A rate change affects FUTURE polls only.
 *
 * Only the rates that price a POSITION belong here. Stake bounds are entry-time
 * checks and the objection window is procedural, so both correctly stay live.
 *
 * ⛔ A `stake-share` MARKET IS STAMPED COMPLETE OR NOT AT ALL (FEE-TAX-2026-10). Its two fee rates and its winnings tax are
 * required on the snapshot and `payout.readRates` refuses one without them, so stamping an incomplete one would create a
 * market nobody could price or settle — it is refused HERE, before the market exists, with `RatesRefused`. And while
 * `fee-law-gate.ts` is shut it is refused whatever the rates: this is the last door every product passes through (a
 * poll, a round through its chain's profile, a week), so a hand-edited row cannot put the new law into force either.
 * Only a stake-share snapshot carries `winningsTaxRate` and only it is `v: 3`; every other model stamps what it always did.
 */
export function snapshotFromConfig(cfg: RateConfig): FeeSnapshot {
  if (cfg.feeModel === "stake-share") {
    const why = stakeShareStampProblem(cfg);
    if (why) throw new RatesRefused(`A stake-share market cannot be created: ${why}`);
  }
  return {
    commissionRate: cfg.commissionRate,
    feeCeilingRate: cfg.feeCeilingRate,
    cashOutFeeRate: cfg.cashOutFeeRate,
    freeExitGraceMinutes: cfg.freeExitGraceMinutes,
    paidExitWindowMinutes: cfg.paidExitWindowMinutes,
    traTaxOnCommissionRate: cfg.traTaxOnCommissionRate,
    gbtLevyOnCommissionRate: cfg.gbtLevyOnCommissionRate,
    thinProfitRatio: cfg.thinProfitRatio,
    // Freeze the fee model + its rates onto the poll (v2). A poll settles by the
    // model it was CREATED under, forever — the no-mix guarantee.
    feeModel: cfg.feeModel,
    platformFeeRate: cfg.platformFeeRate,
    operatorFeeRate: cfg.operatorFeeRate,
    // A Millionea week freezes its jackpot share beside the model (S1); a poll never carries the field.
    ...(cfg.feeModel === "jackpot-payout" ? { jackpotFeeRate: cfg.jackpotFeeRate } : {}),
    // A stake-share market freezes its winnings tax beside the model (FEE-TAX-2026-10); no other model carries the field.
    ...(cfg.feeModel === "stake-share" ? { winningsTaxRate: cfg.winningsTaxRate } : {}),
    estimatedWinningsRate: cfg.estimatedWinningsRate,
    showEstimatedWinnings: cfg.showEstimatedWinnings,
    v: cfg.feeModel === "stake-share" ? 3 : 2,
    stampedAt: new Date().toISOString(),
  };
}

/**
 * A market could not be given its rates, so it was not created — the stamping refusal (`snapshotFromConfig`) and the
 * failed fresh read (`createMarket` → `readMarketConfigFresh`). It carries `code` so a caller that must refuse SOFTLY —
 * `updown-service.ts → openRound`, where a throw is a recorded outage (FAILURE-INVENTORY §7.4) — can tell it from a bug
 * without depending on `instanceof` across module copies.
 */
export class RatesRefused extends Error {
  readonly code = "RATES_REFUSED" as const;
  constructor(message: string) {
    super(message);
    this.name = "RatesRefused";
  }
}

/** True for a `RatesRefused` from any copy of this module. */
export function isRatesRefused(e: unknown): e is RatesRefused {
  return (e as { code?: unknown } | null)?.code === "RATES_REFUSED";
}

/**
 * Why a stake-share rate set cannot be STAMPED, in an officer's words — or null when it can. The gate first (nothing
 * stamps the new law before R5), then the rates exactly as `payout.readRates` will price them: the fee rates through
 * the same read (refused when missing or out of range), and the winnings tax REQUIRED.
 */
function stakeShareStampProblem(cfg: Partial<RateConfig>): string | null {
  const shut = newFeeLawRefusal();
  if (shut) return shut;
  try {
    if (winningsTaxBp(cfg) === null) return "no winnings tax rate is saved. Save it at /admin/config first.";
  } catch (e) {
    return (e as Error)?.message ?? String(e);
  }
  return null;
}

/**
 * Read a market's frozen rates, with a safe fallback for rows created before
 * feeSnapshot existed (the backfill stamps those, but a race or a restore could
 * still surface one).
 *
 * The fallback deliberately uses the OLD commission (9%) with the NEW ceiling.
 * The ceiling can only ever REDUCE the fee versus what those players were quoted,
 * so an un-backfilled poll pays its winners MORE, never less — nobody can
 * complain, and the in-flight bug is dead either way. Migrating them to 10% would
 * pay them less than they agreed to, which we will not do.
 */
export const LEGACY_COMMISSION_RATE = 0.09;

/**
 * A rate read out of persisted JSON, made safe.
 *
 * `?? DEFAULT` is NOT enough: `typeof NaN === "number"`, so a NaN survives the
 * nullish coalesce and every downstream guard that only checks for null. It then
 * flows into `Math.min(0.30, Math.max(0, NaN)) === NaN` → a NaN cash-out value →
 * `if (value <= 0)` is FALSE for NaN → a NaN wallet credit. `poolFee` clamps its
 * own inputs, but the cash-out and levy rates are read outside it. Clamp here.
 */
function safeRate(v: unknown, fallback: number, hi = 1): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(0, v)) : fallback;
}

/**
 * A stake-share rate as a door must accept it (FEE-TAX-2026-10): finite, within [0, hi], and a WHOLE number of basis points
 * — the unit `payout.ts` charges in (`rateBp`). A rate between two basis points would be rounded by the arithmetic, so the
 * figure an officer saved would not be the figure players are charged; it is refused instead.
 */
function isWholeBpRate(v: unknown, hi: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= hi && Math.abs(v * 10_000 - Math.round(v * 10_000)) < 1e-6;
}

/**
 * ⭐ DOES THIS MARKET HAVE ITS OWN FROZEN RATES? — the ONLY honest discriminator.
 *
 * ⛔ **DO NOT ASK `stampedAt === "legacy"` INSTEAD.** `snapshotOrLegacy` produces that string
 * from TWO different facts and they are not the same fact:
 *
 *   · the snapshot arm writes `stampedAt: s.stampedAt ?? "legacy"` — a **genuine, fully valid
 *     snapshot** that merely predates the `stampedAt` field, priced by its OWN frozen rates;
 *   · the fallback arm writes the literal `stampedAt: "legacy"` — **no snapshot at all**,
 *     reconstructed at `LEGACY_COMMISSION_RATE` from nothing.
 *
 * A page that badges off the returned string therefore tells the owner that a correctly frozen
 * game was never frozen — on `/admin/house`, whose fourth question is *which rate applied, and
 * from when*. This predicate is the `if` below, extracted, and `snapshotOrLegacy` CALLS it, so
 * the two cannot drift apart later.
 *
 * ⚠️ Measured on production 2026-09-05: every market carrying a `feeSnapshot` also carries a
 * `stampedAt`, so the mislabelled population is currently EMPTY — 44 markets have no snapshot at
 * all and are genuine fallbacks. This closes the hole before a restore or a race opens it.
 *
 * ⭐ A snapshot that NAMES `stake-share` is its own snapshot whatever else it holds (FEE-TAX-2026-10): only
 * `snapshotFromConfig` writes that name, and reading one as "no snapshot" would hand it to the legacy fallback below —
 * `capped-commission` at 9%, a law it never froze. Its legacy fields are inert under its model, so they cannot decide it.
 */
export function hasOwnSnapshot(raw: unknown): boolean {
  const s = raw as Partial<FeeSnapshot> | null | undefined;
  return !!s && ((Number.isFinite(s.commissionRate) && Number.isFinite(s.feeCeilingRate)) || s.feeModel === "stake-share");
}

export function snapshotOrLegacy(raw: unknown): FeeSnapshot {
  const s = raw as Partial<FeeSnapshot> | null | undefined;
  // ⛔ ONE predicate, called — never re-typed. See `hasOwnSnapshot`.
  if (hasOwnSnapshot(raw) && s) {
    // THE NO-MIX GUARANTEE. Only a snapshot that explicitly froze `feeModel:
    // "loser-share"` (a v2 poll created after 2026-07-23) reads as loser-share.
    // Everything else — every poll created before this change has NO feeModel —
    // reads as the legacy `capped-commission` model, so its maths is byte-for-byte
    // what it always was, and the loser-share/display fields are inert on it.
    const isLoserShare = s.feeModel === "loser-share";
    // A Millionea week froze `jackpot-payout` and its rate (S1). Passed through as frozen — never folded into the
    // legacy model. A jackpot snapshot without a rate is left without one, and `payout.readRates` refuses it loudly.
    const isJackpot = s.feeModel === "jackpot-payout";
    // ⛔ A STAKE-SHARE SNAPSHOT IS PASSED THROUGH WITH EXACTLY WHAT IT FROZE (FEE-TAX-2026-10). This line used to send every
    // model it did not name to `capped-commission` — for this one that is a 13%-of-every-stake market silently settled
    // by a retired formula. Its two fee rates and its tax are NEVER `safeRate`d and never defaulted: a missing or
    // corrupt one reaches `payout.readRates` as it is, and pricing refuses it there, loudly. Nothing here throws —
    // display readers call this for every market; the refusal belongs to pricing.
    const isStakeShare = s.feeModel === "stake-share";
    return {
      commissionRate: safeRate(s.commissionRate, DEFAULT_COMMISSION_RATE),
      feeCeilingRate: safeRate(s.feeCeilingRate, DEFAULT_FEE_CEILING_RATE, MAX_FEE_CEILING_RATE),
      cashOutFeeRate: safeRate(s.cashOutFeeRate, DEFAULT_CASHOUT_FEE_RATE),
      freeExitGraceMinutes: Number.isFinite(s.freeExitGraceMinutes) ? Math.max(0, s.freeExitGraceMinutes as number) : DEFAULT_FREE_EXIT_GRACE_MINUTES,
      paidExitWindowMinutes: Number.isFinite(s.paidExitWindowMinutes) ? Math.max(0, s.paidExitWindowMinutes as number) : DEFAULT_PAID_EXIT_WINDOW_MINUTES,
      traTaxOnCommissionRate: safeRate(s.traTaxOnCommissionRate, DEFAULT_TRA_TAX_ON_COMMISSION_RATE),
      gbtLevyOnCommissionRate: safeRate(s.gbtLevyOnCommissionRate, DEFAULT_GBT_LEVY_ON_COMMISSION_RATE),
      thinProfitRatio: Number.isFinite(s.thinProfitRatio) ? (s.thinProfitRatio as number) : THIN_PROFIT_RATIO,
      feeModel: isLoserShare ? "loser-share" : isJackpot ? "jackpot-payout" : isStakeShare ? "stake-share" : "capped-commission",
      platformFeeRate: isStakeShare ? (s.platformFeeRate as number) : safeRate(s.platformFeeRate, DEFAULT_PLATFORM_FEE_RATE),
      operatorFeeRate: isStakeShare ? (s.operatorFeeRate as number) : safeRate(s.operatorFeeRate, DEFAULT_OPERATOR_FEE_RATE),
      ...(isJackpot && typeof s.jackpotFeeRate === "number" ? { jackpotFeeRate: s.jackpotFeeRate } : {}),
      ...(isStakeShare && s.winningsTaxRate !== undefined ? { winningsTaxRate: s.winningsTaxRate } : {}),
      // DISPLAY-ONLY, and MODEL-INDEPENDENT.
      //
      // These two never touch the maths — they drive the pre-bet "possible winnings"
      // headline and nothing else. They were originally gated to loser-share because
      // that was the only model that used them; Up & Down then arrived on
      // capped-commission needing the same "× 1.4 est." headline, and a gate that
      // silently zeroed it would have made the card impossible to build correctly.
      //
      // The gate is now on WHAT THE POLL FROZE, not on which model it uses: a poll
      // that explicitly stamped a rate gets it, a poll that never did gets 0 and the
      // headline is hidden. So every pre-existing capped-commission poll behaves
      // EXACTLY as before (none of them stamped these fields), and nothing about any
      // payout changes for any poll under either model.
      estimatedWinningsRate: safeRate(s.estimatedWinningsRate, 0, MAX_ESTIMATED_WINNINGS_RATE),
      showEstimatedWinnings: s.showEstimatedWinnings === true,
      // v2 = "carries the fee-model + display fields". A poll that froze either the
      // loser-share model or a display estimate is v2; a bare legacy snapshot is v1.
      // v3 = a stake-share snapshot (FEE-TAX-2026-10) — and only it.
      v: isStakeShare ? 3 : isLoserShare || isJackpot || s.showEstimatedWinnings === true ? 2 : 1,
      stampedAt: s.stampedAt ?? "legacy",
    };
  }
  return {
    commissionRate: LEGACY_COMMISSION_RATE,      // what those players were quoted
    feeCeilingRate: DEFAULT_FEE_CEILING_RATE,    // the ceiling — can only pay them MORE
    cashOutFeeRate: DEFAULT_CASHOUT_FEE_RATE,
    freeExitGraceMinutes: DEFAULT_FREE_EXIT_GRACE_MINUTES,
    paidExitWindowMinutes: DEFAULT_PAID_EXIT_WINDOW_MINUTES,
    traTaxOnCommissionRate: DEFAULT_TRA_TAX_ON_COMMISSION_RATE,
    gbtLevyOnCommissionRate: DEFAULT_GBT_LEVY_ON_COMMISSION_RATE,
    thinProfitRatio: THIN_PROFIT_RATIO,
    // An un-snapshotted poll predates this change ⇒ legacy capped-commission, no estimate.
    feeModel: "capped-commission",
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    operatorFeeRate: DEFAULT_OPERATOR_FEE_RATE,
    estimatedWinningsRate: 0,
    showEstimatedWinnings: false,
    v: 1,
    stampedAt: "legacy",
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MARKET_CONFIG: {
    global: RateConfig;
    perMarket: Map<string, Partial<RateConfig>>;
  } | undefined;
}

const store =
  globalThis.__50PICK_MARKET_CONFIG ??
  (globalThis.__50PICK_MARKET_CONFIG = {
    global: { ...DEFAULT_GLOBAL_CONFIG },
    perMarket: new Map<string, Partial<RateConfig>>(),
  });

/**
 * ⭐ Moves on every change THIS process makes to the cache (a save, a hydration, a fresh read), so a read that started
 * before one cannot land after it and put the older value back (`readMarketConfigFresh`). Process-local on purpose.
 */
let cacheGen = 0;

// ── Durable persistence (SystemConfig) ──────────────────────────────────────
// The globalThis cache above is now a write-through cache over the SystemConfig
// table, so admin retunes of fee/tax/stake config survive deploys instead of
// silently reverting to DEFAULT_GLOBAL_CONFIG.
const MARKET_CONFIG_KEY = "market.config";
/**
 * Persisted-config schema version. Bump when a DEFAULT that a live config may have
 * frozen at an old value must be reconciled forward (see `reconcileConfigDefaults`).
 *  v2 (2026-07-27): stake bounds default 100/100,000 → 1,000/1,000,000.
 *  v3 (2026-08-14): minStake 500 → 1,000. Production was measured on **500** on
 *      2026-08-14 while this file's default had read 1,000 since 2026-07-26, because
 *      `persist()` wrote the WHOLE snapshot (it did until FEE-TAX-2026-10; every save
 *      is now read-modify-write against the row — `writeMarketConfig`) — so an unrelated config save on
 *      2026-08-10 re-froze the old floor. v2's reconcile could not see it: it bumps a
 *      minStake sitting on exactly 100. ⛔ A CODE DEFAULT IS NOT A LIVE SETTING, and
 *      a green `config-persist.test.mts` asserting the constant would have passed with
 *      production on 500 the whole time. Verify this one by READING THE DB.
 *  v4 (2026-10-12): minStake 1,000 → 500 (Ali: "turn minimum stake instead of 1k to 500").
 *      The same trap from the other side: the floor on read (`floorStakeBounds`) only
 *      RAISES, so with the constant at 500 a stored 1,000 stayed enforced. ⛔ The minimum
 *      DEPOSIT did not move (validators.ts), and no other stored value is touched.
 */
const CONFIG_VERSION = 4;
type PersistedMarketConfig = { global: RateConfig; perMarket: Array<[string, Partial<RateConfig>]>; v?: number };

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MARKET_CONFIG_HYDRATED: boolean | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_MARKET_CONFIG_HYDRATING: Promise<void> | undefined;
}

/**
 * Forward-reconcile a config persisted under an older CONFIG_VERSION. Because `persist()`
 * wrote the WHOLE global snapshot (until FEE-TAX-2026-10), a value that was merely the OLD default froze in the
 * DB and shadows a new code default. This bumps ONLY values still sitting on a known
 * legacy default, so a deliberate admin choice is never touched. Pure + exported so the
 * migration is unit-tested directly (config-persist.test.mts).
 */
export function reconcileConfigDefaults(global: RateConfig, fromVersion: number): { global: RateConfig; changed: boolean } {
  const g = { ...global };
  let changed = false;
  if (fromVersion < 2) {
    // Stake bounds: 100/100,000 (legacy defaults) → the current 1,000/1,000,000.
    if (g.minStake === 100) { g.minStake = DEFAULT_GLOBAL_CONFIG.minStake; changed = true; }
    if (g.maxStake === 100_000) { g.maxStake = DEFAULT_GLOBAL_CONFIG.maxStake; changed = true; }
  }
  if (fromVersion < 3) {
    // 500 → 1,000. THE MINIMUM STAKE IS A RULE, NOT A PREFERENCE (Ali, 2026-08-14):
    // TZS 1,000 minimum and TZS 1,000,000 maximum PER BET, on both products. 500 was
    // the floor between the 100 era and 2026-07-26, and production was still on it.
    // ⚠️ Since v4 the default it moves a 500 to IS 500, so on its own this step is a no-op.
    if (g.minStake === 500) { g.minStake = DEFAULT_GLOBAL_CONFIG.minStake; changed = true; }
  }
  if (fromVersion < 4) {
    // 1,000 → 500 (Ali, 2026-10-12). The minimum stake is TZS 500 on both products; the stored
    // 1,000 is the floor v3 wrote, and the floor on read cannot lower it. ⛔ ONLY a stored 1,000:
    // a deliberate narrower window (1,500, 2,500 …) is an operator's choice and stays.
    if (g.minStake === 1_000) { g.minStake = DEFAULT_GLOBAL_CONFIG.minStake; changed = true; }
  }
  return { global: g, changed };
}

/**
 * Load persisted config into the cache once per process (before first read).
 *
 * 🔴 THE FLAG WAS RAISED ON THE LINE *BEFORE* THE AWAIT, IN THE MODULE THAT OWNS THE
 * FEE. `loadConfig` never throws — it logs and returns `null` — so one transient DB
 * error at first read left this process on CODE DEFAULTS for its whole life, with no
 * retry, and two consequences that are not cosmetic:
 *   · a market created in that window FREEZES those defaults into its immutable
 *     `feeSnapshot` and settles by them for ever (⛔ RULES.md §2.1: a snapshot is
 *     never rewritten), so the poll charges a rate the operator never chose;
 *   · `persist()` wrote the WHOLE snapshot, so the next unrelated admin save
 *     overwrote the officer's live row with those defaults. (Since FEE-TAX-2026-10 a save
 *     reads the row fresh and swaps it by compare-and-swap — `writeMarketConfig`.)
 * That is the trap RULES.md §2.3 already records from the other direction ("a code
 * default is not a live setting") — here the live setting silently becomes the code
 * default. A concurrent caller arriving during the read hit the same thing without
 * any DB error at all: it saw the flag up and read the defaults.
 *
 * The flag is now raised only AFTER the read lands; the in-flight promise is shared;
 * a failure leaves the flag DOWN so the next read retries.
 */
async function ensureHydrated(): Promise<void> {
  if (globalThis.__50PICK_MARKET_CONFIG_HYDRATED) return;
  if (!globalThis.__50PICK_MARKET_CONFIG_HYDRATING) {
    globalThis.__50PICK_MARKET_CONFIG_HYDRATING = hydrateNow()
      .finally(() => { globalThis.__50PICK_MARKET_CONFIG_HYDRATING = undefined; });
  }
  await globalThis.__50PICK_MARKET_CONFIG_HYDRATING;
}

async function hydrateNow(): Promise<void> {
  // ⛔ `loadConfigResult`, NOT `loadConfig`. The latter returns `null` for "no row", "no
  // database" AND "the read FAILED" alike, so the gate below closed on a read that never
  // landed — pinning this container on DEFAULT_GLOBAL_CONFIG for its entire life with no
  // retry, which is precisely what the docblock above says cannot happen any more. A market
  // created in that window freezes those defaults into its immutable feeSnapshot (RULES
  // §2.1), and the next unrelated admin save called `persist()`, which wrote the WHOLE
  // snapshot — including `perMarket: []`, silently destroying every per-market override an
  // officer had set. That half needs no rate to diverge at all. (`persist()` is gone since
  // FEE-TAX-2026-10: every save is read-modify-write against the row, `writeMarketConfig`.)
  // ⚠️ `ok: true, value: null` still closes the gate: a fresh install legitimately has no
  // row, and gating on a VALUE would leave every caller waiting for ever.
  const res = await loadConfigResult<PersistedMarketConfig>(MARKET_CONFIG_KEY);
  if (!res.ok) return; // gate stays DOWN — the next read retries
  const stored = res.value;
  if (stored) {
    // Merge over defaults so a newly-added field gets its default, not undefined; one-time forward migration for
    // legacy defaults (`fromRow`), self-healing on the first read after a deploy.
    const row = fromRow(stored);
    store.global = row.global;
    store.perMarket = row.perMarket;
    cacheGen++;
    // Re-write it at the new version — by COMPARE-AND-SWAP against the row just read (FEE-TAX-2026-10): this used to be
    // `persist()`, the whole cache written blind, which could land over a save another container made in between. If
    // the row moved, that container wrote it at its own version; the reconcile re-runs on the next boot, unchanged.
    if (row.migrated) {
      void replaceConfigIfValue(MARKET_CONFIG_KEY, stored, toRow(row))
        .catch((err) => console.error("[market-config] reconcile write-back failed:", (err as Error)?.message ?? err));
    }
  }
  // ⛔ LAST, not first: only a read that actually landed may close the gate.
  globalThis.__50PICK_MARKET_CONFIG_HYDRATED = true;
}

/** The cache's own state, as the row stores it and every writer reads it. */
type ConfigState = { global: RateConfig; perMarket: Map<string, Partial<RateConfig>> };

/** The four store calls the writer and the fresh read make. */
type MarketConfigStoreDeps = {
  hasDatabase: typeof hasDatabase;
  loadConfigResult: typeof loadConfigResult;
  replaceConfigIfValue: typeof replaceConfigIfValue;
  createConfigIfAbsent: typeof createConfigIfAbsent;
};
const REAL_STORE: MarketConfigStoreDeps = { hasDatabase, loadConfigResult, replaceConfigIfValue, createConfigIfAbsent };
let storeDeps: MarketConfigStoreDeps = REAL_STORE;

/**
 * ⚠️ TEST SEAM ONLY — `test:config` swaps the store `writeMarketConfig` and `readMarketConfigFresh` talk to, so the
 * compare-and-swap is driven against a row that moves, a read that fails and a stale cache without a database (every
 * suite runs without one). `null` restores the real store. ⛔ Refused in production; never called from application code.
 */
export function __setMarketConfigStoreForTest(deps: Partial<MarketConfigStoreDeps> | null): void {
  if (process.env.NODE_ENV === "production") throw new Error("market-config: the store seam is refused in production");
  storeDeps = deps ? { ...REAL_STORE, ...deps } : REAL_STORE;
}

/** A stored row, as the cache holds it: merged over the defaults and reconciled to `CONFIG_VERSION`. */
function fromRow(stored: PersistedMarketConfig): ConfigState & { migrated: boolean } {
  const merged: RateConfig = { ...DEFAULT_GLOBAL_CONFIG, ...stored.global };
  const storedVersion = stored.v ?? 1;
  const migrated = storedVersion < CONFIG_VERSION;
  return {
    global: migrated ? reconcileConfigDefaults(merged, storedVersion).global : merged,
    perMarket: new Map(stored.perMarket ?? []),
    migrated,
  };
}

/** The row a state is stored as. */
function toRow(state: ConfigState): PersistedMarketConfig {
  return { global: state.global, perMarket: Array.from(state.perMarket.entries()), v: CONFIG_VERSION };
}

/** Two stored values compared by VALUE, key order ignored (a jsonb round trip does not keep it). */
function sameStored(a: unknown, b: unknown): boolean {
  const canon = (v: unknown): string =>
    v && typeof v === "object" && !Array.isArray(v)
      ? `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}`
      : Array.isArray(v) ? `[${v.map(canon).join(",")}]` : JSON.stringify(v ?? null);
  return canon(a) === canon(b);
}

/**
 * ⭐ THE RATES, READ FRESH FROM THE ROW — for the one moment they matter: a market or a round being STAMPED
 * (`market-service.ts → createMarket`, which refuses to create anything when this fails). The cache this container
 * hydrated at boot may be minutes or days behind a save another container made; a market that froze it would settle by
 * a law nobody chose for ever (RULES §2.1). So: the row is read, merged and reconciled exactly as hydration would, and it
 * REPLACES the cache, so the stamping that follows reads it.
 * ⛔ FAILS CLOSED: a read that could not ask answers `ok: false` and leaves the cache as it was — the caller refuses.
 * ⚠️ An ABSENT row answers the defaults, as a container booting now would hold them (the hydration gate's own rule —
 * a fresh install has no row); with no database the cache IS the store and is answered without a read.
 * ⚠️ A save THIS process made while the read was in flight cannot be ordered against it: the read answers only when
 * the two agree, and otherwise refuses rather than guess (the `define-config` `reload()` rule).
 */
export async function readMarketConfigFresh(): Promise<{ ok: true; config: RateConfig } | { ok: false; error: string }> {
  await ensureHydrated();
  if (!storeDeps.hasDatabase()) return { ok: true, config: floorStakeBounds({ ...store.global }) };
  const genAtStart = cacheGen;
  const res = await storeDeps.loadConfigResult<PersistedMarketConfig>(MARKET_CONFIG_KEY);
  if (!res.ok) return { ok: false, error: res.error };
  const next: ConfigState = res.value ? fromRow(res.value) : { global: { ...DEFAULT_GLOBAL_CONFIG }, perMarket: new Map() };
  if (cacheGen !== genAtStart) {
    return sameStored(toRow(next), toRow(store))
      ? { ok: true, config: floorStakeBounds({ ...store.global }) }
      : { ok: false, error: "The rates changed while they were being read. Try again." };
  }
  store.global = next.global;
  store.perMarket = next.perMarket;
  cacheGen++;
  return { ok: true, config: floorStakeBounds({ ...store.global }) };
}

/**
 * ⭐ THE ONE WRITER — read-modify-write against a FRESH row, by COMPARE-AND-SWAP, read back before it reports "saved"
 * (FEE-TAX-2026-10). `change` is handed the row as stored now (never this container's cache) and returns the whole next
 * state, or a refusal; `record` writes the audit row once the write has landed.
 *
 * 🔴 WHAT IT REPLACED. `persist()` wrote THIS container's whole cache, fire-and-forget: a container that booted before
 * another one's save wrote its stale copy over the newer row on its next unrelated save — every field, the fee model and,
 * from this release, the winnings tax — and the audit row it wrote claimed a change it described against the wrong
 * "before". During a deploy two containers run side by side for a minute, so this was never hypothetical.
 *   1. read the row (a read that fails changes nothing);
 *   2. `change` validates against THAT row and builds the next state from it;
 *   3. swap it in ONLY while the row still holds exactly what was read (`replaceConfigIfValue`), or create it only if
 *      there is still none (`createConfigIfAbsent`); a row that moved in between is read again (three tries);
 *   4. once the swap lands the change IS stored — the audit row is written then, never before;
 *   5. read it back: only a row that holds what was written is reported "saved". One that already holds something else
 *      (another save landed straight after) is reported, never claimed.
 * ⚠️ With no database the cache IS the store (every suite and local dev): `change` runs against it and it is replaced.
 */
async function writeMarketConfig<R>(
  change: (fresh: ConfigState) => { ok: true; next: ConfigState; result: R } | { ok: false; error: string },
  record: (before: ConfigState, next: ConfigState, result: R) => void,
): Promise<{ ok: true; next: ConfigState; result: R } | { ok: false; error: string }> {
  await ensureHydrated();
  if (!storeDeps.hasDatabase()) {
    const before: ConfigState = { global: { ...store.global }, perMarket: new Map(store.perMarket) };
    const c = change(before);
    if (!c.ok) return c;
    store.global = c.next.global;
    store.perMarket = c.next.perMarket;
    cacheGen++;
    record(before, c.next, c.result);
    return c;
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await storeDeps.loadConfigResult<PersistedMarketConfig>(MARKET_CONFIG_KEY);
    if (!res.ok) return { ok: false, error: "The current settings could not be read, so nothing was changed. Please try again." };
    const fresh: ConfigState = res.value ? fromRow(res.value) : { global: { ...DEFAULT_GLOBAL_CONFIG }, perMarket: new Map() };
    const c = change({ global: { ...fresh.global }, perMarket: new Map(fresh.perMarket) });
    if (!c.ok) return c;
    const row = toRow(c.next);
    let landed: boolean;
    try {
      landed = res.value
        ? await storeDeps.replaceConfigIfValue(MARKET_CONFIG_KEY, res.value, row)
        : (await storeDeps.createConfigIfAbsent(MARKET_CONFIG_KEY, row)) === "created";
    } catch (err) {
      console.error("[market-config] save failed:", (err as Error)?.message ?? err);
      return { ok: false, error: "The save could not be completed, so it is not reported as saved. Reload the page and check the settings before trying again." };
    }
    if (!landed) continue; // another save moved the row between the read and the swap — read it again
    store.global = c.next.global;
    store.perMarket = c.next.perMarket;
    cacheGen++;
    record(fresh, c.next, c.result);
    const back = await storeDeps.loadConfigResult<PersistedMarketConfig>(MARKET_CONFIG_KEY);
    if (!back.ok) {
      return { ok: false, error: "The change was written but could not be read back to confirm it. Reload the page and check the settings before saving again." };
    }
    if (!back.value || !sameStored(back.value, row)) {
      return { ok: false, error: "The change was written, but another save changed the settings straight after. Reload the page to see what is in force now." };
    }
    return c;
  }
  return { ok: false, error: "The settings kept changing while this save was being made, so nothing was changed. Please try again." };
}

/**
 * ⭐ THE STAKE FLOOR, APPLIED ON READ (management, relayed by Ali 2026-10-07 — RULES.md §2.3). The minimum stake is
 * `PLATFORM_MIN_STAKE`, and every WRITE below it is refused (`validate`). But a value STORED before a floor was raised
 * survives until something rewrites it — the v3 reconcile above exists because production sat on 500 for weeks after the
 * code said 1,000, and a per-market override is never reconciled at all. So every READ floors the copy it returns: the
 * rules pages, the dial, the board, the house engine and `buyPosition` can never meet a stake bound under the rule,
 * whatever a row says. The max is lifted to at least the min.
 * ⛔ The STORE is never mutated here and the writers store it raw (`writeMarketConfig`); the admin form shows "stored X · enforced Y" when
 * the two differ (`getStoredStakeBounds`), so an officer can see — and save away — a legacy value.
 * ⚠️ A FLOOR NEVER LOWERS. When the minimum itself goes DOWN (2026-10-12: 1,000 → 500) a stored value above the new
 * floor stays enforced; that is the reconcile's job (v4), never this function's.
 */
export function floorStakeBounds<T extends { minStake: number; maxStake: number }>(c: T): T {
  const minStake = Math.max(Number.isFinite(c.minStake) ? c.minStake : PLATFORM_MIN_STAKE, PLATFORM_MIN_STAKE);
  const maxStake = Math.max(Number.isFinite(c.maxStake) ? c.maxStake : PLATFORM_MAX_STAKE, minStake);
  return { ...c, minStake, maxStake };
}

/** Read merged config — per-market overrides on top of global, stake bounds floored (`floorStakeBounds`). */
export async function getEffectiveConfig(marketId?: string): Promise<RateConfig> {
  await ensureHydrated();
  if (marketId) {
    const over = store.perMarket.get(marketId);
    if (over) return floorStakeBounds({ ...store.global, ...over });
  }
  return floorStakeBounds({ ...store.global });
}

export async function getGlobalConfig(): Promise<RateConfig> {
  await ensureHydrated();
  return floorStakeBounds({ ...store.global });
}

/** The GLOBAL stake bounds exactly as stored — for the admin form's "stored X · enforced Y" line only. ⛔ Never enforce
 *  or display these to a player: every reader of a bound goes through the floored getters above. */
export async function getStoredStakeBounds(): Promise<{ minStake: number; maxStake: number }> {
  await ensureHydrated();
  return { minStake: store.global.minStake, maxStake: store.global.maxStake };
}

/**
 * The resolution mode in force for a single market: its own column override wins,
 * else the global default. Used by the resolve trigger (resolveDueMarket) and by
 * the scheduler. `marketOverride` is `PredictionMarket.resolutionMode` (nullable).
 */
export async function getEffectiveResolutionMode(marketOverride: string | null | undefined): Promise<"human" | "auto"> {
  if (marketOverride === "human" || marketOverride === "auto") return marketOverride;
  return (await getGlobalConfig()).resolutionMode;
}

export async function listMarketOverrides(): Promise<Array<{ marketId: string; over: Partial<RateConfig> }>> {
  await ensureHydrated();
  return Array.from(store.perMarket.entries()).map(([marketId, over]) => ({ marketId, over }));
}

/**
 * Validation — guards user-input ranges before audit.
 *
 * The old combined-fee ceiling (`tax + commission + reserve + aggregator < 30%`)
 * is gone with those fields. It has been replaced by something that actually
 * protects a player: THE WINNER-FLOOR GUARDRAIL at the bottom of this function,
 * which refuses any config under which a winner could be paid below his stake.
 * The old check could not have caught the reported bug — 9% passed it easily.
 *
 * ⭐ `base` is the config the updates land on, and every cross-check reads IT (FEE-TAX-2026-10): the writers pass the row
 * as stored NOW (`writeMarketConfig`), never this container's cache, so a check can no longer pass against a value that
 * another container has already changed. `scope` says which door is asking:
 *   · "global"   — `/admin/config`'s save;
 *   · "override" — a per-market override: it may never carry a fee model or a winnings tax (both are platform-wide and
 *                  frozen onto a market when it is created);
 *   · "profile"  — an Up & Down fee profile (`validateRateConfig`): it may never carry a winnings tax — a round's tax
 *                  comes from `market.config` when it is stamped — so a stake-share profile needs one already saved here.
 * ⛔ THE NEW LAW IS GATED. While `fee-law-gate.ts` is shut, `stake-share` and any `winningsTaxRate` are refused at every
 * scope. Once open, `stake-share` needs its winnings tax and a fee on every stake within `MAX_STAKE_FEE_RATE`, in whole
 * basis points (the unit the arithmetic charges); and its winner-floor sweep is a WARNING naming the worst ratio and the
 * break-even lean — never a refusal, because a winner paid below their stake on a lopsided market is the ruling
 * (ruling 1), not a defect. Every older model keeps today's refusal, unchanged.
 */
function validate(
  updates: Partial<RateConfig>,
  base: RateConfig = store.global,
  scope: "global" | "override" | "profile" = "global",
): { ok: true; warn?: string } | { ok: false; reason: string } {
  if (updates.commissionRate !== undefined) {
    if (Number.isNaN(updates.commissionRate) || updates.commissionRate < 0 || updates.commissionRate > MAX_COMMISSION_RATE) {
      return { ok: false, reason: `Commission rate must be 0-${(MAX_COMMISSION_RATE * 100).toFixed(0)}%.` };
    }
  }
  if (updates.feeCeilingRate !== undefined) {
    if (Number.isNaN(updates.feeCeilingRate) || updates.feeCeilingRate < 0 || updates.feeCeilingRate > MAX_FEE_CEILING_RATE) {
      // The hard stop. Above 100% of the smaller side the fee exceeds the entire
      // prize and starts eating the winners' own stakes — the exact bug this
      // whole model exists to kill. It is not a preference; it is the bound
      // invariant 1 depends on.
      return { ok: false, reason: "Fee ceiling must be 0-100% of the smaller side. Above 100% a winner could be paid less than they staked." };
    }
  }
  if (updates.cashOutFeeRate !== undefined) {
    if (Number.isNaN(updates.cashOutFeeRate) || updates.cashOutFeeRate < 0 || updates.cashOutFeeRate > 0.30) {
      return { ok: false, reason: "Cash-out fee must be 0-30%." };
    }
  }
  if (updates.freeExitGraceMinutes !== undefined) {
    const g = updates.freeExitGraceMinutes;
    if (!Number.isFinite(g) || g < 0 || g > 60) {
      return { ok: false, reason: "Free-exit grace must be 0-60 minutes (0 = no free window)." };
    }
  }
  if (updates.paidExitWindowMinutes !== undefined) {
    const w = updates.paidExitWindowMinutes;
    if (!Number.isFinite(w) || w < 0 || w > 1440) {
      return { ok: false, reason: "Paid-exit window must be 0-1440 minutes (0 = no paid exit; exit locks at the free window)." };
    }
  }
  if (updates.withdrawalFeeRate !== undefined) {
    if (Number.isNaN(updates.withdrawalFeeRate) || updates.withdrawalFeeRate < 0 || updates.withdrawalFeeRate > 0.05) {
      return { ok: false, reason: "Withdrawal fee must be 0-5%." };
    }
  }
  if (updates.withdrawalGatewayShareRate !== undefined) {
    if (Number.isNaN(updates.withdrawalGatewayShareRate) || updates.withdrawalGatewayShareRate < 0 || updates.withdrawalGatewayShareRate > 0.05) {
      return { ok: false, reason: "Gateway share must be 0-5%." };
    }
  }
  // The gateway's slice comes OUT of the withdrawal fee — it cannot exceed it, or
  // we would be paying the gateway more than we charged the player and taking a
  // loss on every withdrawal.
  {
    const wf = updates.withdrawalFeeRate ?? base.withdrawalFeeRate;
    const gs = updates.withdrawalGatewayShareRate ?? base.withdrawalGatewayShareRate;
    if (gs > wf) {
      return { ok: false, reason: "Gateway share cannot exceed the withdrawal fee — it is paid out of it." };
    }
  }
  if (updates.objectionWindowHours !== undefined) {
    const h = updates.objectionWindowHours;
    // Cap at a week: a window longer than that strands players' money for no
    // regulatory gain. 0 disables the gate — allowed (play-money/testing), but
    // it is the control we describe to the regulator, so it must be a deliberate
    // act and it is audited like every other config change.
    if (!Number.isFinite(h) || h < 0 || h > 168) {
      return { ok: false, reason: "Objection window must be 0-168 hours (0 = no window)." };
    }
  }
  if (updates.resolutionMode !== undefined) {
    if (updates.resolutionMode !== "human" && updates.resolutionMode !== "auto") {
      return { ok: false, reason: "Resolution mode must be 'human' or 'auto'." };
    }
  }
  if (updates.resolveConfidenceThreshold !== undefined) {
    const c = updates.resolveConfidenceThreshold;
    // Floor at 50: auto-resolving below a coin-flip's confidence is never sane on a
    // real-money outcome. 100 is allowed (auto only on certainty).
    if (!Number.isFinite(c) || c < 50 || c > 100) {
      return { ok: false, reason: "Auto-resolve confidence threshold must be 50-100." };
    }
  }
  if (updates.resolveOffsetMinutes !== undefined) {
    const o = updates.resolveOffsetMinutes;
    // Cap at 24h: a resolve trigger further out than that just strands a settled
    // market unresolved for no reason (officers can always resolve early by hand).
    if (!Number.isFinite(o) || o < 0 || o > 1440) {
      return { ok: false, reason: "Resolve offset must be 0-1440 minutes (0 = fire at resolution time)." };
    }
  }
  // ⛔ THE BOUNDS ARE A RULE, SO THE DOOR ENFORCES THEM. These read >= 100 and >= 1,000
  // until 2026-08-14, which meant the platform could be configured out of its own
  // published minimum from the admin console — and had been: production sat on a TZS 500
  // floor. An operator may NARROW the window inside PLATFORM_MIN_STAKE … PLATFORM_MAX_STAKE;
  // never widen it.
  if (updates.minStake !== undefined) {
    if (!Number.isFinite(updates.minStake) || updates.minStake < PLATFORM_MIN_STAKE || updates.minStake > PLATFORM_MAX_STAKE) {
      return { ok: false, reason: `Min stake must be between TZS ${PLATFORM_MIN_STAKE.toLocaleString("en-GB")} and TZS ${PLATFORM_MAX_STAKE.toLocaleString("en-GB")} — the platform minimum is a rule, not a setting.` };
    }
  }
  if (updates.maxStake !== undefined) {
    if (!Number.isFinite(updates.maxStake) || updates.maxStake < PLATFORM_MIN_STAKE || updates.maxStake > PLATFORM_MAX_STAKE) {
      return { ok: false, reason: `Max stake must be between TZS ${PLATFORM_MIN_STAKE.toLocaleString("en-GB")} and TZS ${PLATFORM_MAX_STAKE.toLocaleString("en-GB")} — the platform maximum is a rule, not a setting.` };
    }
  }
  // Cross-check: max must not fall below min, or every stake is rejected and
  // betting is silently bricked (buyPosition bounds-checks stake against both).
  {
    const min = updates.minStake ?? base.minStake;
    const max = updates.maxStake ?? base.maxStake;
    if (max < min) return { ok: false, reason: "Max stake must be greater than or equal to min stake." };
  }
  if (updates.thinProfitRatio !== undefined) {
    if (updates.thinProfitRatio < 1.0 || updates.thinProfitRatio > 2.0) {
      return { ok: false, reason: "Thin-profit threshold must be 1.0-2.0." };
    }
  }
  if (updates.starterBalanceTzs !== undefined) {
    if (!Number.isFinite(updates.starterBalanceTzs) || updates.starterBalanceTzs < 0 || updates.starterBalanceTzs > 5_000_000) {
      return { ok: false, reason: "Starter balance must be 0-5,000,000 TZS." };
    }
  }
  if (updates.traTaxOnCommissionRate !== undefined) {
    if (Number.isNaN(updates.traTaxOnCommissionRate) || updates.traTaxOnCommissionRate < 0 || updates.traTaxOnCommissionRate > 0.50) {
      return { ok: false, reason: "TRA tax on commission must be 0-50%." };
    }
  }
  if (updates.gbtLevyOnCommissionRate !== undefined) {
    if (Number.isNaN(updates.gbtLevyOnCommissionRate) || updates.gbtLevyOnCommissionRate < 0 || updates.gbtLevyOnCommissionRate > 0.50) {
      return { ok: false, reason: "GBT levy on commission must be 0-50%." };
    }
  }
  // The levies come OUT of our fee. If they summed above 100% we would owe more
  // tax than we earned commission and the operator's take would go negative.
  {
    const tra = updates.traTaxOnCommissionRate ?? base.traTaxOnCommissionRate;
    const gbt = updates.gbtLevyOnCommissionRate ?? base.gbtLevyOnCommissionRate;
    if (tra + gbt > 1) {
      return { ok: false, reason: "TRA + GBT levies cannot exceed 100% of the commission — they are paid out of it." };
    }
  }

  // ── THE NEW LAW'S DOORS (FEE-TAX-2026-10) — which scope may carry what, and the gate ─────────
  if (scope === "override" && (updates.feeModel !== undefined || updates.winningsTaxRate !== undefined)) {
    return { ok: false, reason: "A per-market override cannot set a fee model or a winnings tax. Both are platform-wide, and frozen onto a market when it is created." };
  }
  if (scope === "profile" && updates.winningsTaxRate !== undefined) {
    return { ok: false, reason: "An Up & Down fee profile cannot carry a winnings tax. The tax is the platform's (/admin/config), frozen onto each round when it opens." };
  }
  if (updates.winningsTaxRate !== undefined) {
    const shut = newFeeLawRefusal();
    if (shut) return { ok: false, reason: shut };
    if (!isWholeBpRate(updates.winningsTaxRate, MAX_WINNINGS_TAX_RATE)) {
      return { ok: false, reason: `Winnings tax must be 0-${(MAX_WINNINGS_TAX_RATE * 100).toFixed(0)}% of the prize fund, in whole basis points (0.01%).` };
    }
  }

  // ── Fee-model fields (loser-share) ───────────────────────────────────
  if (updates.feeModel !== undefined) {
    if (updates.feeModel === "stake-share") {
      // ⛔ Decided, not in force: refused at every door until release R5 flips `fee-law-gate.ts`.
      const shut = newFeeLawRefusal();
      if (shut) return { ok: false, reason: shut };
    } else if (updates.feeModel !== "capped-commission" && updates.feeModel !== "loser-share") {
      return {
        ok: false,
        reason: feeLawLive()
          ? "Fee model must be 'capped-commission', 'loser-share' or 'stake-share'."
          : "Fee model must be 'capped-commission' or 'loser-share'.",
      };
    }
  }
  if (updates.platformFeeRate !== undefined) {
    if (Number.isNaN(updates.platformFeeRate) || updates.platformFeeRate < 0 || updates.platformFeeRate > MAX_LOSER_SHARE_RATE) {
      return { ok: false, reason: "Platform fee must be 0-100% of the losing pool." };
    }
  }
  if (updates.operatorFeeRate !== undefined) {
    if (Number.isNaN(updates.operatorFeeRate) || updates.operatorFeeRate < 0 || updates.operatorFeeRate > MAX_LOSER_SHARE_RATE) {
      return { ok: false, reason: "Operator fee must be 0-100% of the losing pool." };
    }
  }
  // The loser-share fee is the SUM of the two slices, charged on the losing pool.
  // It must stay <= 100% or netPool goes negative and a winner is paid below stake.
  {
    const pf = updates.platformFeeRate ?? base.platformFeeRate;
    const of = updates.operatorFeeRate ?? base.operatorFeeRate;
    if (pf + of > MAX_LOSER_SHARE_RATE) {
      return { ok: false, reason: "Platform + Operator fee cannot exceed 100% of the losing pool — a winner would be paid below their stake." };
    }
  }
  if (updates.estimatedWinningsRate !== undefined) {
    if (Number.isNaN(updates.estimatedWinningsRate) || updates.estimatedWinningsRate < 0 || updates.estimatedWinningsRate > MAX_ESTIMATED_WINNINGS_RATE) {
      return { ok: false, reason: `Estimated-winnings bonus must be 0-${(MAX_ESTIMATED_WINNINGS_RATE * 100).toFixed(0)}%.` };
    }
  }

  // ── THE GUARDRAIL ─────────────────────────────────────────────────────────
  // Refuse to save a config under which a winner could be paid below his stake.
  //
  // This is the check that would have stopped the reported bug reaching a player.
  // We do not trust the algebra here — we sweep the whole lean range numerically
  // with the real payout function and look at the actual floor. If a future edit
  // to the fee maths ever reintroduces a way to underpay a winner, an admin save
  // fails loudly rather than a player quietly losing money on a correct call.
  {
    const c = updates.commissionRate ?? base.commissionRate;
    const k = updates.feeCeilingRate ?? base.feeCeilingRate;
    // Sweep under the EFFECTIVE model — for loser-share, worstCaseWinnerRatio
    // evaluates both outcomes (its fee depends on the loser). The winner floor
    // must hold whichever model + rates are about to be saved.
    const fm = updates.feeModel ?? base.feeModel;
    const pf = updates.platformFeeRate ?? base.platformFeeRate;
    const of = updates.operatorFeeRate ?? base.operatorFeeRate;
    // ⭐ STAKE-SHARE (FEE-TAX-2026-10): complete rates or nothing, then a WARNING — never this guard's refusal. Its fee
    // comes out of every stake, so a winner on a lopsided market IS paid below their stake (ruling 1); refusing that
    // would refuse the law itself. The officer is told the worst case and the lean where it starts, in the audit too.
    if (fm === "stake-share") {
      // A stored stake-share model with the gate shut can only be a hand-edited row: no save goes through on it.
      const shut = newFeeLawRefusal();
      if (shut) return { ok: false, reason: shut };
      if (!isWholeBpRate(pf, MAX_STAKE_FEE_RATE) || !isWholeBpRate(of, MAX_STAKE_FEE_RATE) || rateBp(pf + of) > rateBp(MAX_STAKE_FEE_RATE)) {
        return {
          ok: false,
          reason: `Under stake-share, Platform + Operator is a fee on EVERY stake and may be at most ${(MAX_STAKE_FEE_RATE * 100).toFixed(0)}% together, each in whole basis points (0.01%).`,
        };
      }
      // A profile never carries the tax: its rounds take the platform's, so the platform's must already be saved.
      const t = scope === "profile" ? base.winningsTaxRate : (updates.winningsTaxRate ?? base.winningsTaxRate);
      if (t === undefined || !isWholeBpRate(t, MAX_WINNINGS_TAX_RATE)) {
        return {
          ok: false,
          reason: scope === "profile"
            ? "This fee profile is stake-share, and the platform has no winnings tax saved. Save the winnings tax at /admin/config first — every round freezes it when it opens."
            : "Stake-share needs a winnings tax rate. Enter it in the same save, or save it first.",
        };
      }
      const rates = { commissionRate: c, feeCeilingRate: k, feeModel: fm, platformFeeRate: pf, operatorFeeRate: of, winningsTaxRate: t };
      const worst = worstCaseWinnerRatio(rates);
      const breakEven = stakeShareBreakEvenShare(rates) ?? 0;
      const yesPct = Math.round((worst.atYes / (worst.atYes + worst.atNo)) * 100);
      return {
        ok: true,
        warn:
          `Under stake-share a winner on a lopsided market is paid back less than their stake (ruling 1): at a ` +
          `${yesPct}/${100 - yesPct} pool a winner on the bigger side gets ${(worst.ratio * 100).toFixed(1)}% of their stake, ` +
          `and a winner on the bigger side gets back less than they staked whenever the smaller side holds under ` +
          `${(breakEven * 100).toFixed(2)}% of the pool. Players are warned on the bet screen before they bet.`,
      };
    }
    const worst = worstCaseWinnerRatio({ commissionRate: c, feeCeilingRate: k, feeModel: fm, platformFeeRate: pf, operatorFeeRate: of });
    if (worst.ratio < 1) {
      return {
        ok: false,
        reason:
          `Refused: under these rates a winner could be paid ${(worst.ratio * 100).toFixed(1)}% of their stake ` +
          `(worst case at a ${Math.round((worst.atYes / (worst.atYes + worst.atNo)) * 100)}/` +
          `${Math.round((worst.atNo / (worst.atYes + worst.atNo)) * 100)} pool). ` +
          `A correct call must never lose money. Lower the fee ceiling.`,
      };
    }
    // Warn — but allow. Above a ceiling of one half we take at least as much as
    // ALL the winners combined, which is defensible only if Ali means it.
    if (k > FEE_CEILING_WARN_ABOVE) {
      return {
        ok: true,
        warn:
          `Fee ceiling is ${(k * 100).toFixed(0)}% of the smaller side. Above ${(FEE_CEILING_WARN_ABOVE * 100).toFixed(0)}% ` +
          `the house takes more than all the winners put together. Winners still never lose money, but check this is intended.`,
      };
    }
  }
  return { ok: true };
}

/**
 * The rate validator, exported so OTHER products validate through the SAME rules.
 *
 * An Up & Down chain freezes its own rate profile (capped-commission @ 13%) onto the
 * rounds it creates, and that profile has to clear exactly the checks a global config
 * change clears — above all the WINNER-FLOOR GUARDRAIL, which refuses any rates under
 * which a correct call could be paid less than it staked.
 *
 * Writing a second validator for the second product is how two definitions of one
 * truth start, and the one that drifts is always the one nobody is looking at. There
 * is one validator; this is it.
 *
 * ⭐ `scope: "profile"` (FEE-TAX-2026-10) — every Up & Down caller passes it: a profile may be `stake-share` once the gate
 * is open, may never carry a winnings tax, and a stake-share one needs the platform's tax already saved (`validate`).
 * Cross-checks read the platform config this container holds; `updown-config.ts`'s writers re-read their own row fresh.
 */
export function validateRateConfig(
  updates: Partial<RateConfig>,
  opts?: { scope?: "global" | "profile" },
): { ok: true; warn?: string } | { ok: false; reason: string } {
  return validate(updates, store.global, opts?.scope ?? "global");
}

/**
 * Save the platform's rates (`/admin/config`). Read-modify-write against the row, by compare-and-swap, read back before
 * "saved" (`writeMarketConfig`), and validated against the row as stored NOW — so a stale container can neither save
 * its old fee model or winnings tax back over a newer one, nor pass a check against a value that has already moved.
 */
export async function setGlobalConfig(updates: Partial<RateConfig>, officerId: string):
  Promise<{ ok: true; config: RateConfig; warn?: string } | { ok: false; error: string }> {
  const w = await writeMarketConfig<string | undefined>(
    (fresh) => {
      const v = validate(updates, fresh.global, "global");
      if (!v.ok) return { ok: false, error: v.reason };
      return { ok: true, next: { global: { ...fresh.global, ...updates }, perMarket: fresh.perMarket }, result: v.warn };
    },
    (before, next, warn) => audit({
      category: "ADMIN",
      action: "config.global.updated",
      actorId: officerId,
      targetType: "MarketConfig",
      targetId: "global",
      // The audit trail records the winner-floor warning too — if an officer sets a
      // ceiling above 50%, the fact that they were told is part of the record.
      payload: { before: before.global, after: next.global, changes: configChanges(before.global, next.global), warn: warn ?? null },
    }),
  );
  if (!w.ok) return { ok: false, error: w.error };
  return { ok: true, config: { ...w.next.global }, warn: w.result };
}

/**
 * Set a per-market override (stake bounds only, in practice — `setMarketOverrideAction`). Same writer as the global
 * save; ⛔ never a fee model or a winnings tax (`validate`'s "override" scope).
 */
export async function setMarketOverride(marketId: string, updates: Partial<RateConfig>, officerId: string):
  Promise<{ ok: true; config: RateConfig } | { ok: false; error: string }> {
  const w = await writeMarketConfig<{ before: Partial<RateConfig>; merged: Partial<RateConfig> }>(
    (fresh) => {
      const v = validate(updates, fresh.global, "override");
      if (!v.ok) return { ok: false, error: v.reason };
      const before = fresh.perMarket.get(marketId) ?? {};
      const merged = { ...before, ...updates };
      const perMarket = new Map(fresh.perMarket);
      perMarket.set(marketId, merged);
      return { ok: true, next: { global: fresh.global, perMarket }, result: { before, merged } };
    },
    (_before, _next, r) => audit({
      category: "ADMIN",
      action: "config.market.override",
      actorId: officerId,
      targetType: "MarketConfig",
      targetId: marketId,
      payload: { before: r.before, after: r.merged, changes: configChanges(r.before, r.merged) },
    }),
  );
  if (!w.ok) return { ok: false, error: w.error };
  return { ok: true, config: await getEffectiveConfig(marketId) };
}

/** Remove a per-market override. Same writer; it can now say it failed, so the caller must read `ok`. */
export async function clearMarketOverride(marketId: string, officerId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const w = await writeMarketConfig<Partial<RateConfig> | undefined>(
    (fresh) => {
      const perMarket = new Map(fresh.perMarket);
      const before = perMarket.get(marketId);
      perMarket.delete(marketId);
      return { ok: true, next: { global: fresh.global, perMarket }, result: before };
    },
    (_before, _next, before) => audit({
      category: "ADMIN",
      action: "config.market.cleared",
      actorId: officerId,
      targetType: "MarketConfig",
      targetId: marketId,
      payload: { before },
    }),
  );
  if (!w.ok) return { ok: false, error: w.error };
  return { ok: true };
}

// ── Payout adapters ─────────────────────────────────────────────────────────
//
// The formula itself lives in src/lib/payout.ts and is shared with the client.
// These are thin adapters that accept anything carrying the two rates — a live
// RateConfig OR a market's frozen FeeSnapshot — so a caller physically cannot
// pick the wrong one by passing the wrong shape.
//
// The two functions that used to live here each carried their own copy of
//   fee = tax + commission + reserve + aggregator; netPool = gross * (1 - fee)
// alongside a third copy in payout.ts. That is how the dial ended up quoting a
// different number than settlement paid.

// 🔴 `payoutForWhole()` DELETED 2026-09-07 — an @deprecated adapter with ZERO callers,
// left sitting on the money path it was written to protect. Use `payoutFor` from `@/lib/payout`.

/**
 * SETTLEMENT payout — the pools are final and already contain this stake.
 *
 * ⚠️ Pass the market's `feeSnapshot`, not live config. Settlement must price a
 * position at the rates it was placed under.
 */
export function settledPayoutWhole(
  opts: { yesPool: number; noPool: number; side: "YES" | "NO"; stake: number },
  rates: FeeRatesLike,
): number {
  return settledPayoutFor(opts, rates).payout;
}

/** Anything that carries the two rates the fee is made of. */
export type FeeRatesLike = { commissionRate: number; feeCeilingRate: number };

/**
 * Categorise the projected payout/stake ratio.
 *
 * There is no `negative` level any more — a winner cannot be paid below his
 * stake, so the state that meant "you won but you lost money" is unreachable.
 */
export function houseLean(ratio: number, cfg: { thinProfitRatio: number }): LeanLevelType {
  return leanFor(ratio, cfg.thinProfitRatio);
}
