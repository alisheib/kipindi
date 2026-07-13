/**
 * Runtime market-config — tax + commission + stake bounds.
 *
 * Two scopes:
 *   GLOBAL   — applies to every market unless overridden
 *   PER-MARKET — optional override stored against a specific market id
 *
 * `getEffectiveConfig(marketId)` returns the merged values used by the
 * payout engine + the admin UI. Every set/clear is HMAC-audited so the
 * GBT inspector trail is intact.
 *
 * Persists across hot-reloads via `globalThis.__50PICK_MARKET_CONFIG`,
 * same backup pattern as the audit ring + market store.
 *
 * DAL: All exported functions are async for DAL consistency. Config data
 * remains in-memory for now (pure configuration, not entity data).
 * // TODO Phase 6: back with SystemConfig Prisma table
 */
import { audit } from "./audit";
import { loadConfig, saveConfig } from "./config-store";

export type RateConfig = {
  /** Tax rate (e.g. 0.04 = 4%). Going to TRA per Income Tax Act $80. */
  taxRate: number;
  /** Operator commission (e.g. 0.05 = 5%). 50pick keeps this. */
  commissionRate: number;
  /** Early cash-out commission (e.g. 0.09 = 9%). Withheld from a player's
   *  cash-out proceeds when they CLOSE a position before the market resolves,
   *  and booked to the house reserve as operator revenue. Holding to settlement
   *  is unaffected (normal tax + commission apply at resolution). Admin-tunable;
   *  separate from the settlement pool fees above. */
  cashOutFeeRate: number;
  /** Operator reserve rate (e.g. 0.02 = 2%). Contributes to the pool
   *  fee taken at resolution; kept as operator margin. Can be 0 to disable. */
  reserveRate: number;
  /** Payment aggregator rate (e.g. 0.01 = 1%). Covers Selcom/Pesapal/etc
   *  transaction fees. Can be 0 pre-launch. */
  aggregatorRate: number;
  /** Minimum stake in TZS. */
  minStake: number;
  /** Maximum stake in TZS. */
  maxStake: number;
  /** Show "thin profit" warning when projected payout/stake < this. Default 1.05. */
  thinProfitRatio: number;
  /** Starter wallet balance for newly-registered users in TZS.
   *  Default 0 — anyone can sign up but must add funds (or be credited
   *  by an admin) before they can place a stake. Setting this to a
   *  positive number turns 50pick into a free-trial sandbox. */
  starterBalanceTzs: number;
  /** TRA withholding tax as a fraction of the operator's total commission.
   *  E.g. 0.10 = 10% of the 9% commission goes to TRA.
   *  This does NOT affect player payouts — it's deducted from the operator's take. */
  traTaxOnCommissionRate: number;
  /** GBT levy as a fraction of the operator's total commission.
   *  E.g. 0.05 = 5% of the 9% commission goes to GBT.
   *  This does NOT affect player payouts — it's deducted from the operator's take. */
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
};

export const DEFAULT_GLOBAL_CONFIG: RateConfig = {
  taxRate: 0.04,
  commissionRate: 0.03,
  cashOutFeeRate: 0.09,  // 9% early-cash-out commission (management spec, license review 2026-05)
  reserveRate: 0.02,
  aggregatorRate: 0.00, // 0% until aggregator contract is signed
  minStake: 100,
  // Must equal the dial's reachable cap (baseStake 500 × maxMultiplier 200 =
  // 100,000) so the server enforces exactly what the UI shows — otherwise a
  // crafted POST could stake far above the displayed limit. Admin can raise it
  // at /admin/config (raise the dial's maxMultiplier to match if you do).
  maxStake: 100_000,
  thinProfitRatio: 1.05,
  // Starter balance for new wallets. 0 in production — only tester phones
  // (TESTER_BOOTSTRAP_PHONES env) get 100K for QA. Admin can raise this
  // temporarily at /admin/config for promotional campaigns.
  starterBalanceTzs: 0,
  // Taxes on the operator's commission (total pool fee = tax + commission
  // + reserve + aggregator = 9%). These come OUT of the operator's take,
  // not from the player's payout.
  traTaxOnCommissionRate: 0.10,   // 10% of commission → TRA
  gbtLevyOnCommissionRate: 0.05,  // 5% of commission → GBT
  // The objection window players get before a verdict's money moves.
  objectionWindowHours: 24,
};

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

export async function listMarketOverrides(): Promise<Array<{ marketId: string; over: Partial<RateConfig> }>> {
  await ensureHydrated();
  return Array.from(store.perMarket.entries()).map(([marketId, over]) => ({ marketId, over }));
}

/** Validation — guards user-input ranges before audit. */
function validate(updates: Partial<RateConfig>): { ok: true } | { ok: false; reason: string } {
  if (updates.taxRate !== undefined) {
    if (Number.isNaN(updates.taxRate) || updates.taxRate < 0 || updates.taxRate > 0.20) {
      return { ok: false, reason: "Tax rate must be 0-20%." };
    }
  }
  if (updates.commissionRate !== undefined) {
    if (Number.isNaN(updates.commissionRate) || updates.commissionRate < 0 || updates.commissionRate > 0.20) {
      return { ok: false, reason: "Commission rate must be 0-20%." };
    }
  }
  if (updates.cashOutFeeRate !== undefined) {
    if (Number.isNaN(updates.cashOutFeeRate) || updates.cashOutFeeRate < 0 || updates.cashOutFeeRate > 0.30) {
      return { ok: false, reason: "Cash-out fee must be 0-30%." };
    }
  }
  if (updates.reserveRate !== undefined) {
    if (Number.isNaN(updates.reserveRate) || updates.reserveRate < 0 || updates.reserveRate > 0.10) {
      return { ok: false, reason: "Reserve rate must be 0-10%." };
    }
  }
  if (updates.aggregatorRate !== undefined) {
    if (Number.isNaN(updates.aggregatorRate) || updates.aggregatorRate < 0 || updates.aggregatorRate > 0.10) {
      return { ok: false, reason: "Aggregator rate must be 0-10%." };
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
  // Combined ceiling: tax + commission + reserve + aggregator < 30%
  {
    const t = updates.taxRate ?? store.global.taxRate;
    const c = updates.commissionRate ?? store.global.commissionRate;
    const r = updates.reserveRate ?? store.global.reserveRate;
    const a = updates.aggregatorRate ?? store.global.aggregatorRate;
    if (t + c + r + a >= 0.30) return { ok: false, reason: "Combined fees (tax + commission + reserve + aggregator) cannot exceed 30%." };
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
  return { ok: true };
}

export async function setGlobalConfig(updates: Partial<RateConfig>, officerId: string):
  Promise<{ ok: true; config: RateConfig } | { ok: false; error: string }> {
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
    payload: { before, after: store.global, changes: updates },
  });
  return { ok: true, config: { ...store.global } };
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

/**
 * Whole-pool pari-mutuel payout.
 *
 *   netPool = (yesPool + noPool) x (1 - tax - commission)
 *   payout  = (myStake / winningSidePool) x netPool
 *
 * IMPORTANT: under heavy lean (winning side dominates), payout/stake can
 * approach (1 - tax - commission). At extremes (e.g. 95%+ favorite wins)
 * winners can take a small NET LOSS even though they "won". The
 * `houseLean()` helper below labels this for the UI.
 */
export function payoutForWhole(
  opts: { yesPool: number; noPool: number; side: "YES" | "NO"; stake: number },
  cfg: RateConfig,
): { payout: number; net: number; share: number; ratio: number } {
  // Player's stake is already in the pool when this is called for projection.
  const yesPool = opts.side === "YES" ? opts.yesPool + opts.stake : opts.yesPool;
  const noPool  = opts.side === "NO"  ? opts.noPool  + opts.stake : opts.noPool;
  const grossPool   = yesPool + noPool;
  const winningPool = opts.side === "YES" ? yesPool : noPool;
  const fee = Math.min(0.99, Math.max(0, cfg.taxRate + cfg.commissionRate + cfg.reserveRate + cfg.aggregatorRate));
  const netPool = grossPool * (1 - fee);
  if (winningPool <= 0) return { payout: 0, net: 0, share: 0, ratio: 0 };
  const share = opts.stake / winningPool;
  const payout = Math.round(share * netPool);
  const ratio = opts.stake > 0 ? payout / opts.stake : 0;
  return { payout, net: payout - opts.stake, share, ratio };
}

/** Projected payout for an actual settlement — uses the *current* pools (no
 *  hypothetical stake added), since the position was already placed. */
export function settledPayoutWhole(
  opts: { yesPool: number; noPool: number; side: "YES" | "NO"; stake: number },
  cfg: RateConfig,
): number {
  const grossPool   = opts.yesPool + opts.noPool;
  const winningPool = opts.side === "YES" ? opts.yesPool : opts.noPool;
  if (winningPool <= 0) return 0;
  const fee = Math.min(0.99, Math.max(0, cfg.taxRate + cfg.commissionRate + cfg.reserveRate + cfg.aggregatorRate));
  const netPool = grossPool * (1 - fee);
  return Math.round((opts.stake / winningPool) * netPool);
}

export type LeanLevel = "fair" | "thin" | "negative";

/** Categorise the projected payout/stake ratio for the inline warning. */
export function houseLean(ratio: number, cfg: RateConfig): LeanLevel {
  if (ratio < 1.0) return "negative";
  if (ratio < cfg.thinProfitRatio) return "thin";
  return "fair";
}
