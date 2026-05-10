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
 */
import { audit } from "./audit";

export type RateConfig = {
  /** Tax rate (e.g. 0.04 = 4%). Going to TRA per Income Tax Act §80. */
  taxRate: number;
  /** Operator commission (e.g. 0.05 = 5%). 50pick keeps this. */
  commissionRate: number;
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
};

export const DEFAULT_GLOBAL_CONFIG: RateConfig = {
  taxRate: 0.04,
  commissionRate: 0.05,
  minStake: 100,
  maxStake: 1_000_000,
  thinProfitRatio: 1.05,
  // Sign-up gift — TZS 100,000 lands in every new wallet so first-time
  // users (and the manager doing demo runs) can place dozens of stakes
  // without an upfront deposit. Admin can change this any time at
  // /admin/config — the production launch will lower this to 0.
  starterBalanceTzs: 100_000,
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

/** Read merged config — per-market overrides on top of global. */
export function getEffectiveConfig(marketId?: string): RateConfig {
  if (marketId) {
    const over = store.perMarket.get(marketId);
    if (over) return { ...store.global, ...over };
  }
  return { ...store.global };
}

export function getGlobalConfig(): RateConfig {
  return { ...store.global };
}

export function listMarketOverrides(): Array<{ marketId: string; over: Partial<RateConfig> }> {
  return Array.from(store.perMarket.entries()).map(([marketId, over]) => ({ marketId, over }));
}

/** Validation — guards user-input ranges before audit. */
function validate(updates: Partial<RateConfig>): { ok: true } | { ok: false; reason: string } {
  if (updates.taxRate !== undefined) {
    if (Number.isNaN(updates.taxRate) || updates.taxRate < 0 || updates.taxRate > 0.20) {
      return { ok: false, reason: "Tax rate must be 0–20%." };
    }
  }
  if (updates.commissionRate !== undefined) {
    if (Number.isNaN(updates.commissionRate) || updates.commissionRate < 0 || updates.commissionRate > 0.20) {
      return { ok: false, reason: "Commission rate must be 0–20%." };
    }
  }
  if (updates.taxRate !== undefined && updates.commissionRate !== undefined) {
    if (updates.taxRate + updates.commissionRate >= 0.30) {
      return { ok: false, reason: "Combined tax + commission cannot exceed 30%." };
    }
  } else {
    const t = updates.taxRate ?? store.global.taxRate;
    const c = updates.commissionRate ?? store.global.commissionRate;
    if (t + c >= 0.30) return { ok: false, reason: "Combined tax + commission cannot exceed 30%." };
  }
  if (updates.minStake !== undefined) {
    if (updates.minStake < 100 || !Number.isFinite(updates.minStake)) {
      return { ok: false, reason: "Min stake must be ≥ TZS 100." };
    }
  }
  if (updates.maxStake !== undefined) {
    if (updates.maxStake < 1000 || !Number.isFinite(updates.maxStake)) {
      return { ok: false, reason: "Max stake must be ≥ TZS 1,000." };
    }
  }
  if (updates.thinProfitRatio !== undefined) {
    if (updates.thinProfitRatio < 1.0 || updates.thinProfitRatio > 2.0) {
      return { ok: false, reason: "Thin-profit threshold must be 1.0–2.0." };
    }
  }
  if (updates.starterBalanceTzs !== undefined) {
    if (!Number.isFinite(updates.starterBalanceTzs) || updates.starterBalanceTzs < 0 || updates.starterBalanceTzs > 5_000_000) {
      return { ok: false, reason: "Starter balance must be 0–5,000,000 TZS." };
    }
  }
  return { ok: true };
}

export function setGlobalConfig(updates: Partial<RateConfig>, officerId: string):
  | { ok: true; config: RateConfig }
  | { ok: false; error: string } {
  const v = validate(updates);
  if (!v.ok) return { ok: false, error: v.reason };
  const before = { ...store.global };
  store.global = { ...store.global, ...updates };
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

export function setMarketOverride(marketId: string, updates: Partial<RateConfig>, officerId: string):
  | { ok: true; config: RateConfig }
  | { ok: false; error: string } {
  const v = validate(updates);
  if (!v.ok) return { ok: false, error: v.reason };
  const before = store.perMarket.get(marketId) ?? {};
  const merged = { ...before, ...updates };
  store.perMarket.set(marketId, merged);
  audit({
    category: "ADMIN",
    action: "config.market.override",
    actorId: officerId,
    targetType: "MarketConfig",
    targetId: marketId,
    payload: { before, after: merged, changes: updates },
  });
  return { ok: true, config: getEffectiveConfig(marketId) };
}

export function clearMarketOverride(marketId: string, officerId: string): { ok: true } {
  const before = store.perMarket.get(marketId);
  store.perMarket.delete(marketId);
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
 *   netPool = (yesPool + noPool) × (1 - tax - commission)
 *   payout  = (myStake / winningSidePool) × netPool
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
  const fee = Math.min(0.99, Math.max(0, cfg.taxRate + cfg.commissionRate));
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
  const fee = Math.min(0.99, Math.max(0, cfg.taxRate + cfg.commissionRate));
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
