/**
 * House Liquidity Pool — management-funded reserve that seeds every market
 * so winners always have a losing-side pool to draw from.
 *
 * Architecture:
 *   • The house injects equal liquidity on both YES and NO sides when a
 *     market opens. This is NOT a real bet — it's virtual liquidity.
 *   • At settlement, the house's LOSING-side stake is consumed by winners
 *     (that's the cost of providing liquidity). The house's WINNING-side
 *     stake returns to the reserve.
 *   • A configurable % of every settled market's gross pool is routed to
 *     the reserve to replenish it over time.
 *
 * Fee split (all dynamic, configured in RateConfig):
 *   grossPool × taxRate           → TRA (Tanzania Revenue Authority)
 *   grossPool × commissionRate    → 50pick operating profit
 *   grossPool × reserveRate       → house liquidity reserve
 *   grossPool × aggregatorRate    → payment aggregator (Selcom/Pesapal/etc)
 *
 * Admin controls:
 *   • View balance, top-up, withdraw
 *   • Set default seed amount per market
 *   • Set minimum reserve (alert threshold)
 *   • View ledger history
 *
 * Persists across hot-reloads via globalThis, same pattern as market-config.
 */
import { audit } from "./audit";

export type HousePoolConfig = {
  /** TZS injected per side (YES + NO) when a market opens. Total seed = 2x this. */
  seedPerSide: number;
  /** Minimum reserve — below this, admin gets a warning and new markets can
   *  optionally be paused. 0 = no minimum. */
  minReserve: number;
  /** If true, block new market creation when reserve < minReserve. */
  pauseMarketsOnLowReserve: boolean;
};

export const DEFAULT_HOUSE_POOL_CONFIG: HousePoolConfig = {
  // Stress-test validated: 50k/side survives 200 markets on a 10M reserve.
  // 500k/side depletes after ~19 markets. Start conservative; admin can
  // raise it at /admin/house-pool once player volume justifies it.
  seedPerSide: 50_000,    // TZS 50k per side = TZS 100k total seed per market
  minReserve: 200_000,    // TZS 200k floor — alert threshold
  pauseMarketsOnLowReserve: false,
};

export type HousePoolLedgerEntry = {
  id: string;
  type: "TOP_UP" | "SEED_OUT" | "SETTLE_RETURN" | "RESERVE_FEE" | "WITHDRAW" | "LOSS_ABSORBED";
  amount: number;           // positive = money in, negative = money out
  balanceAfter: number;
  marketId: string | null;  // null for top-ups / withdrawals
  note: string;
  actorId: string;          // officer or "system"
  createdAt: string;
};

type HousePoolStore = {
  balance: number;
  config: HousePoolConfig;
  /** Virtual positions the house holds in each market: marketId → perSide seed amount. */
  seeds: Map<string, number>;
  ledger: HousePoolLedgerEntry[];
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_HOUSE_POOL: HousePoolStore | undefined;
}

const pool: HousePoolStore =
  globalThis.__50PICK_HOUSE_POOL ??
  (globalThis.__50PICK_HOUSE_POOL = {
    balance: 1_000_000, // Initial TZS 1M from management pocket
    config: { ...DEFAULT_HOUSE_POOL_CONFIG },
    seeds: new Map(),
    ledger: [],
  });

let ledgerSeq = pool.ledger.length;

function pushLedger(entry: Omit<HousePoolLedgerEntry, "id" | "createdAt">): HousePoolLedgerEntry {
  const e: HousePoolLedgerEntry = {
    ...entry,
    id: `hpl_${++ledgerSeq}_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  };
  pool.ledger.push(e);
  // Cap the in-memory ledger to 500 entries (FIFO)
  if (pool.ledger.length > 500) pool.ledger.splice(0, pool.ledger.length - 500);
  return e;
}

// ─── Read ────────────────────────────────────────────────────────────────────

export function getHousePoolBalance(): number {
  return pool.balance;
}

export function getHousePoolConfig(): HousePoolConfig {
  return { ...pool.config };
}

export function getHousePoolSeedForMarket(marketId: string): number {
  return pool.seeds.get(marketId) ?? 0;
}

export function getHousePoolLedger(limit = 50): HousePoolLedgerEntry[] {
  return pool.ledger.slice(-limit).reverse();
}

export function getHousePoolStats(): {
  balance: number;
  config: HousePoolConfig;
  activeSeeds: number;
  totalSeeded: number;
  isLow: boolean;
} {
  let totalSeeded = 0;
  for (const v of pool.seeds.values()) totalSeeded += v * 2; // per-side × 2
  return {
    balance: pool.balance,
    config: { ...pool.config },
    activeSeeds: pool.seeds.size,
    totalSeeded,
    isLow: pool.config.minReserve > 0 && pool.balance < pool.config.minReserve,
  };
}

// ─── Admin mutations ─────────────────────────────────────────────────────────

export function topUpHousePool(amount: number, officerId: string): { ok: true; balance: number } | { ok: false; error: string } {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Amount must be positive." };
  pool.balance += amount;
  pushLedger({
    type: "TOP_UP",
    amount,
    balanceAfter: pool.balance,
    marketId: null,
    note: `Admin top-up TZS ${amount.toLocaleString()}`,
    actorId: officerId,
  });
  audit({
    category: "ADMIN",
    action: "house_pool.top_up",
    actorId: officerId,
    targetType: "HousePool",
    targetId: "house",
    payload: { amount, balanceAfter: pool.balance },
  });
  return { ok: true, balance: pool.balance };
}

export function withdrawHousePool(amount: number, officerId: string): { ok: true; balance: number } | { ok: false; error: string } {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Amount must be positive." };
  if (amount > pool.balance) return { ok: false, error: `Insufficient reserve. Balance: TZS ${pool.balance.toLocaleString()}.` };
  pool.balance -= amount;
  pushLedger({
    type: "WITHDRAW",
    amount: -amount,
    balanceAfter: pool.balance,
    marketId: null,
    note: `Admin withdrawal TZS ${amount.toLocaleString()}`,
    actorId: officerId,
  });
  audit({
    category: "ADMIN",
    action: "house_pool.withdraw",
    actorId: officerId,
    targetType: "HousePool",
    targetId: "house",
    payload: { amount, balanceAfter: pool.balance },
  });
  return { ok: true, balance: pool.balance };
}

export function setHousePoolConfig(
  updates: Partial<HousePoolConfig>,
  officerId: string,
): { ok: true; config: HousePoolConfig } | { ok: false; error: string } {
  if (updates.seedPerSide !== undefined) {
    if (!Number.isFinite(updates.seedPerSide) || updates.seedPerSide < 0)
      return { ok: false, error: "Seed per side must be ≥ 0." };
  }
  if (updates.minReserve !== undefined) {
    if (!Number.isFinite(updates.minReserve) || updates.minReserve < 0)
      return { ok: false, error: "Min reserve must be ≥ 0." };
  }
  const before = { ...pool.config };
  pool.config = { ...pool.config, ...updates };
  audit({
    category: "ADMIN",
    action: "house_pool.config_updated",
    actorId: officerId,
    targetType: "HousePool",
    targetId: "house",
    payload: { before, after: pool.config, changes: updates },
  });
  return { ok: true, config: { ...pool.config } };
}

// ─── Market lifecycle hooks ──────────────────────────────────────────────────

/**
 * Seed a market with house liquidity. Called by createMarket.
 * Deducts seedPerSide × 2 from the reserve and records a per-market virtual
 * position. Returns the per-side amount (to be added to yesPool + noPool).
 *
 * If reserve is insufficient, seeds whatever is available (split evenly).
 * If reserve is 0 or seedPerSide is 0, returns 0 (no seeding).
 */
export function seedMarket(marketId: string): number {
  const cfg = pool.config;
  if (cfg.seedPerSide <= 0) return 0;

  const totalNeeded = cfg.seedPerSide * 2;
  // Seed whatever we can afford, rounded down to keep both sides equal
  const totalAvailable = Math.min(totalNeeded, pool.balance);
  const perSide = Math.floor(totalAvailable / 2);
  if (perSide <= 0) return 0;

  pool.balance -= perSide * 2;
  pool.seeds.set(marketId, perSide);

  pushLedger({
    type: "SEED_OUT",
    amount: -(perSide * 2),
    balanceAfter: pool.balance,
    marketId,
    note: `Seed TZS ${perSide.toLocaleString()} per side`,
    actorId: "system",
  });

  return perSide;
}

/**
 * Settle the house's virtual position for a market. Called during resolution.
 *
 * @param marketId    — the resolved market
 * @param outcome     — "YES" | "NO" | "VOID"
 * @param grossPool   — total pool (yesPool + noPool) before any fees
 * @param reserveRate — the % of gross pool that goes to the reserve (e.g. 0.02)
 *
 * Returns the amount credited back to the reserve.
 */
export function settleHousePosition(
  marketId: string,
  outcome: "YES" | "NO" | "VOID",
  grossPool: number,
  reserveRate: number,
): { returnedToReserve: number; reserveFee: number; lossAbsorbed: number } {
  const perSide = pool.seeds.get(marketId) ?? 0;

  // 1. Reserve fee from the gross pool (configurable %)
  const reserveFee = Math.round(grossPool * Math.max(0, Math.min(0.10, reserveRate)));

  // Apply each balance movement just before its ledger entry so every
  // `balanceAfter` is the true running reserve balance at that step (auditors
  // reconcile by walking the ledger; lumping the mutation broke that).
  if (outcome === "VOID") {
    // Full refund of both sides
    const returned = perSide * 2;
    pool.seeds.delete(marketId);

    if (returned > 0) {
      pool.balance += returned;
      pushLedger({ type: "SETTLE_RETURN", amount: returned, balanceAfter: pool.balance, marketId, note: "Void — full refund", actorId: "system" });
    }
    if (reserveFee > 0) {
      pool.balance += reserveFee;
      pushLedger({ type: "RESERVE_FEE", amount: reserveFee, balanceAfter: pool.balance, marketId, note: `Reserve fee ${(reserveRate * 100).toFixed(1)}%`, actorId: "system" });
    }
    return { returnedToReserve: returned, reserveFee, lossAbsorbed: 0 };
  }

  // 2. House winning-side stake returns to reserve
  // House always has equal YES and NO. Winning side returns, losing side is absorbed.
  const returned = perSide; // winning side comes back
  const lossAbsorbed = perSide; // losing side was consumed by player payouts

  pool.seeds.delete(marketId);

  if (returned > 0) {
    pool.balance += returned;
    pushLedger({ type: "SETTLE_RETURN", amount: returned, balanceAfter: pool.balance, marketId, note: `Winning-side return (${outcome})`, actorId: "system" });
  }
  if (lossAbsorbed > 0) {
    // Accounting-only: the losing seed was already consumed by player payouts and
    // was never part of the reserve balance, so the reserve is unchanged here.
    pushLedger({ type: "LOSS_ABSORBED", amount: -lossAbsorbed, balanceAfter: pool.balance, marketId, note: `Losing-side absorbed (${outcome === "YES" ? "NO" : "YES"})`, actorId: "system" });
  }
  if (reserveFee > 0) {
    pool.balance += reserveFee;
    pushLedger({ type: "RESERVE_FEE", amount: reserveFee, balanceAfter: pool.balance, marketId, note: `Reserve fee ${(reserveRate * 100).toFixed(1)}%`, actorId: "system" });
  }

  return { returnedToReserve: returned, reserveFee, lossAbsorbed };
}

/**
 * Check if the reserve is low enough to block market creation.
 */
export function canSeedNewMarket(): { ok: true } | { ok: false; reason: string } {
  const cfg = pool.config;
  if (!cfg.pauseMarketsOnLowReserve) return { ok: true };
  if (cfg.minReserve > 0 && pool.balance < cfg.minReserve) {
    return { ok: false, reason: `House reserve too low (TZS ${pool.balance.toLocaleString()} < min TZS ${cfg.minReserve.toLocaleString()}). Top up or disable the check.` };
  }
  return { ok: true };
}
