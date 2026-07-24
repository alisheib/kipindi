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
 */
import { audit } from "./audit";
import { loadConfig, saveConfig } from "./config-store";
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
  /** Charged to the player on withdrawal (0.01 = 1%). This is the ONLY thing a
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
  // two maths never mix (docs/FEE-MODEL-DECISION.md, docs/COMPLIANCE-DECISIONS.md).
  /**
   * Which fee formula NEW polls use.
   *  - `capped-commission`: fee = min(commissionRate·pool, feeCeilingRate·smaller).
   *  - `loser-share` (default): fee = (platformFeeRate+operatorFeeRate)·losingPool.
   * loser-share is outcome-DEPENDENT (the fee depends on which side loses) — an
   * explicit owner override of the licence's outcome-neutral posture.
   */
  feeModel: FeeModel;
  /** loser-share: "Platform" fee slice, share of the LOSING pool (default 0.03). */
  platformFeeRate: number;
  /** loser-share: "Operator" fee slice, share of the LOSING pool (default 0.10). */
  operatorFeeRate: number;
  /** loser-share DISPLAY only: the fixed pre-bet "possible winnings" a player is
   *  shown = stake × (1 + this). default 0.5 → a 1.5× headline. NOT the pari-mutuel
   *  payout — the disclaimer beside it says so. */
  estimatedWinningsRate: number;
  /** loser-share DISPLAY only: whether to show that pre-bet estimate at all. */
  showEstimatedWinnings: boolean;
};

export const DEFAULT_GLOBAL_CONFIG: RateConfig = {
  // THE RULE: "our commission is 10% of the pool, but never more than a third of
  // the smaller side." These two numbers are that sentence. They cross over
  // seamlessly at 70/30 — see payout.ts.
  commissionRate: DEFAULT_COMMISSION_RATE,   // 0.10
  feeCeilingRate: DEFAULT_FEE_CEILING_RATE,  // 1/3 — the exact fraction, not 0.33
  // Early exit after the free window. Goes to the HOUSE (it used to be left in
  // the pool, so we earned nothing on an early exit).
  cashOutFeeRate: DEFAULT_CASHOUT_FEE_RATE,               // 0.10 (only applies if a paid window is set)
  freeExitGraceMinutes: DEFAULT_FREE_EXIT_GRACE_MINUTES,      // 5
  paidExitWindowMinutes: DEFAULT_PAID_EXIT_WINDOW_MINUTES,    // 0 → exit locks at the free window (no paid exit)
  // Withdrawal. The ONLY thing a player is charged directly. No withholding tax.
  withdrawalFeeRate: DEFAULT_WITHDRAWAL_FEE_RATE,                     // 0.01 (1%)
  withdrawalGatewayShareRate: DEFAULT_WITHDRAWAL_GATEWAY_SHARE_RATE,  // 0.005 → gateway
  minStake: 100,
  // Must equal the dial's reachable cap (baseStake 500 × maxMultiplier 200 =
  // 100,000) so the server enforces exactly what the UI shows — otherwise a
  // crafted POST could stake far above the displayed limit. Admin can raise it
  // at /admin/config (raise the dial's maxMultiplier to match if you do).
  maxStake: 100_000,
  thinProfitRatio: THIN_PROFIT_RATIO,
  // Starter balance for new wallets. 0 in production — only tester phones
  // (TESTER_BOOTSTRAP_PHONES env) get 100K for QA. Admin can raise this
  // temporarily at /admin/config for promotional campaigns.
  starterBalanceTzs: 0,
  // Levies on OUR FEE. Out of the operator's take, never the player's payout.
  traTaxOnCommissionRate: DEFAULT_TRA_TAX_ON_COMMISSION_RATE,    // 10% of our fee → TRA
  gbtLevyOnCommissionRate: DEFAULT_GBT_LEVY_ON_COMMISSION_RATE,  // 5% of our fee → GBT
  // The objection window players get before a verdict's money moves.
  objectionWindowHours: 24,
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
 */
export function snapshotFromConfig(cfg: RateConfig): FeeSnapshot {
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
    estimatedWinningsRate: cfg.estimatedWinningsRate,
    showEstimatedWinnings: cfg.showEstimatedWinnings,
    v: 2,
    stampedAt: new Date().toISOString(),
  };
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

export function snapshotOrLegacy(raw: unknown): FeeSnapshot {
  const s = raw as Partial<FeeSnapshot> | null | undefined;
  if (s && Number.isFinite(s.commissionRate) && Number.isFinite(s.feeCeilingRate)) {
    // THE NO-MIX GUARANTEE. Only a snapshot that explicitly froze `feeModel:
    // "loser-share"` (a v2 poll created after 2026-07-23) reads as loser-share.
    // Everything else — every poll created before this change has NO feeModel —
    // reads as the legacy `capped-commission` model, so its maths is byte-for-byte
    // what it always was, and the loser-share/display fields are inert on it.
    const isLoserShare = s.feeModel === "loser-share";
    return {
      commissionRate: safeRate(s.commissionRate, DEFAULT_COMMISSION_RATE),
      feeCeilingRate: safeRate(s.feeCeilingRate, DEFAULT_FEE_CEILING_RATE, MAX_FEE_CEILING_RATE),
      cashOutFeeRate: safeRate(s.cashOutFeeRate, DEFAULT_CASHOUT_FEE_RATE),
      freeExitGraceMinutes: Number.isFinite(s.freeExitGraceMinutes) ? Math.max(0, s.freeExitGraceMinutes as number) : DEFAULT_FREE_EXIT_GRACE_MINUTES,
      paidExitWindowMinutes: Number.isFinite(s.paidExitWindowMinutes) ? Math.max(0, s.paidExitWindowMinutes as number) : DEFAULT_PAID_EXIT_WINDOW_MINUTES,
      traTaxOnCommissionRate: safeRate(s.traTaxOnCommissionRate, DEFAULT_TRA_TAX_ON_COMMISSION_RATE),
      gbtLevyOnCommissionRate: safeRate(s.gbtLevyOnCommissionRate, DEFAULT_GBT_LEVY_ON_COMMISSION_RATE),
      thinProfitRatio: Number.isFinite(s.thinProfitRatio) ? (s.thinProfitRatio as number) : THIN_PROFIT_RATIO,
      feeModel: isLoserShare ? "loser-share" : "capped-commission",
      platformFeeRate: safeRate(s.platformFeeRate, DEFAULT_PLATFORM_FEE_RATE),
      operatorFeeRate: safeRate(s.operatorFeeRate, DEFAULT_OPERATOR_FEE_RATE),
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
      v: isLoserShare || s.showEstimatedWinnings === true ? 2 : 1,
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

// ── Durable persistence (SystemConfig) ──────────────────────────────────────
// The globalThis cache above is now a write-through cache over the SystemConfig
// table, so admin retunes of fee/tax/stake config survive deploys instead of
// silently reverting to DEFAULT_GLOBAL_CONFIG.
const MARKET_CONFIG_KEY = "market.config";
type PersistedMarketConfig = { global: RateConfig; perMarket: Array<[string, Partial<RateConfig>]> };

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MARKET_CONFIG_HYDRATED: boolean | undefined;
}

/** Load persisted config into the cache once per process (before first read). */
async function ensureHydrated(): Promise<void> {
  if (globalThis.__50PICK_MARKET_CONFIG_HYDRATED) return;
  globalThis.__50PICK_MARKET_CONFIG_HYDRATED = true;
  const stored = await loadConfig<PersistedMarketConfig>(MARKET_CONFIG_KEY);
  if (stored) {
    // Merge over defaults so a newly-added field gets its default, not undefined.
    store.global = { ...DEFAULT_GLOBAL_CONFIG, ...stored.global };
    store.perMarket = new Map(stored.perMarket ?? []);
  }
}

/** Write the whole config through to the DB (fire-and-forget; never throws). */
function persist(): void {
  void saveConfig(MARKET_CONFIG_KEY, { global: store.global, perMarket: Array.from(store.perMarket.entries()) });
}

/** Read merged config — per-market overrides on top of global. */
export async function getEffectiveConfig(marketId?: string): Promise<RateConfig> {
  await ensureHydrated();
  if (marketId) {
    const over = store.perMarket.get(marketId);
    if (over) return { ...store.global, ...over };
  }
  return { ...store.global };
}

export async function getGlobalConfig(): Promise<RateConfig> {
  await ensureHydrated();
  return { ...store.global };
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
 */
function validate(updates: Partial<RateConfig>): { ok: true; warn?: string } | { ok: false; reason: string } {
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
    const wf = updates.withdrawalFeeRate ?? store.global.withdrawalFeeRate;
    const gs = updates.withdrawalGatewayShareRate ?? store.global.withdrawalGatewayShareRate;
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
  if (updates.minStake !== undefined) {
    if (updates.minStake < 100 || !Number.isFinite(updates.minStake)) {
      return { ok: false, reason: "Min stake must be >= TZS 100." };
    }
  }
  if (updates.maxStake !== undefined) {
    if (updates.maxStake < 1000 || !Number.isFinite(updates.maxStake)) {
      return { ok: false, reason: "Max stake must be >= TZS 1,000." };
    }
  }
  // Cross-check: max must not fall below min, or every stake is rejected and
  // betting is silently bricked (buyPosition bounds-checks stake against both).
  {
    const min = updates.minStake ?? store.global.minStake;
    const max = updates.maxStake ?? store.global.maxStake;
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
    const tra = updates.traTaxOnCommissionRate ?? store.global.traTaxOnCommissionRate;
    const gbt = updates.gbtLevyOnCommissionRate ?? store.global.gbtLevyOnCommissionRate;
    if (tra + gbt > 1) {
      return { ok: false, reason: "TRA + GBT levies cannot exceed 100% of the commission — they are paid out of it." };
    }
  }

  // ── Fee-model fields (loser-share) ───────────────────────────────────
  if (updates.feeModel !== undefined) {
    if (updates.feeModel !== "capped-commission" && updates.feeModel !== "loser-share") {
      return { ok: false, reason: "Fee model must be 'capped-commission' or 'loser-share'." };
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
    const pf = updates.platformFeeRate ?? store.global.platformFeeRate;
    const of = updates.operatorFeeRate ?? store.global.operatorFeeRate;
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
    const c = updates.commissionRate ?? store.global.commissionRate;
    const k = updates.feeCeilingRate ?? store.global.feeCeilingRate;
    // Sweep under the EFFECTIVE model — for loser-share, worstCaseWinnerRatio
    // evaluates both outcomes (its fee depends on the loser). The winner floor
    // must hold whichever model + rates are about to be saved.
    const fm = updates.feeModel ?? store.global.feeModel;
    const pf = updates.platformFeeRate ?? store.global.platformFeeRate;
    const of = updates.operatorFeeRate ?? store.global.operatorFeeRate;
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
 */
export function validateRateConfig(updates: Partial<RateConfig>): { ok: true; warn?: string } | { ok: false; reason: string } {
  return validate(updates);
}

export async function setGlobalConfig(updates: Partial<RateConfig>, officerId: string):
  Promise<{ ok: true; config: RateConfig; warn?: string } | { ok: false; error: string }> {
  await ensureHydrated();
  const v = validate(updates);
  if (!v.ok) return { ok: false, error: v.reason };
  const before = { ...store.global };
  store.global = { ...store.global, ...updates };
  persist();
  audit({
    category: "ADMIN",
    action: "config.global.updated",
    actorId: officerId,
    targetType: "MarketConfig",
    targetId: "global",
    // The audit trail records the winner-floor warning too — if an officer sets a
    // ceiling above 50%, the fact that they were told is part of the record.
    payload: { before, after: store.global, changes: updates, warn: v.warn ?? null },
  });
  return { ok: true, config: { ...store.global }, warn: v.warn };
}

export async function setMarketOverride(marketId: string, updates: Partial<RateConfig>, officerId: string):
  Promise<{ ok: true; config: RateConfig } | { ok: false; error: string }> {
  await ensureHydrated();
  const v = validate(updates);
  if (!v.ok) return { ok: false, error: v.reason };
  const before = store.perMarket.get(marketId) ?? {};
  const merged = { ...before, ...updates };
  store.perMarket.set(marketId, merged);
  persist();
  audit({
    category: "ADMIN",
    action: "config.market.override",
    actorId: officerId,
    targetType: "MarketConfig",
    targetId: marketId,
    payload: { before, after: merged, changes: updates },
  });
  return { ok: true, config: await getEffectiveConfig(marketId) };
}

export async function clearMarketOverride(marketId: string, officerId: string): Promise<{ ok: true }> {
  await ensureHydrated();
  const before = store.perMarket.get(marketId);
  store.perMarket.delete(marketId);
  persist();
  audit({
    category: "ADMIN",
    action: "config.market.cleared",
    actorId: officerId,
    targetType: "MarketConfig",
    targetId: marketId,
    payload: { before },
  });
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

/**
 * Projection for a bet NOT YET PLACED — the stake is added to the chosen side.
 * @deprecated Prefer importing `payoutFor` from `@/lib/payout` directly.
 */
export function payoutForWhole(
  opts: { yesPool: number; noPool: number; side: "YES" | "NO"; stake: number },
  rates: FeeRatesLike,
): { payout: number; net: number; share: number; ratio: number } {
  const r = payoutFor(opts, rates);
  return { payout: r.payout, net: r.net, share: r.share, ratio: r.ratio };
}

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
