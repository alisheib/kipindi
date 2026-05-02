/**
 * Responsible gambling service.
 *
 * Implements the player-protection controls demanded by the Tanzania Gaming Board,
 * the UK Gambling Commission's LCCP (used as gold standard), and GLI-19 cert:
 *
 *  - Deposit limits (daily / weekly / monthly)
 *  - Loss limit (daily)
 *  - Session time limit + reality-check interval
 *  - Self-exclusion (24h / 1 week / 1 month / 6 months / permanent)
 *  - Cooling-off (short-term break)
 *
 * Regulator-critical invariants:
 *  - Limit DECREASES take effect immediately
 *  - Limit INCREASES are deferred 24 hours (LCCP SR Code 3.4.3) — a player in a hot
 *    state cannot raise their limit and immediately deposit more
 *  - Self-exclusion is one-way until expiry; the player CANNOT cancel it themselves
 *  - All state changes audited (COMPLIANCE category)
 */
import { audit } from "./audit";
import { db } from "./store";
import type { StoredResponsibleGambling, StoredTxn } from "./store";
import type { ServiceResult } from "./auth-service";

export const SELF_EXCLUSION_PERIODS_SEC = {
  "24h":   24 * 60 * 60,
  "1w":    7 * 24 * 60 * 60,
  "1m":    30 * 24 * 60 * 60,
  "6m":    182 * 24 * 60 * 60,
  "perm":  100 * 365 * 24 * 60 * 60,
} as const;

export const COOLING_OFF_PERIODS_SEC = {
  "1h":  60 * 60,
  "24h": 24 * 60 * 60,
  "1w":  7 * 24 * 60 * 60,
} as const;

export const LIMIT_INCREASE_DEFERRAL_SEC = 24 * 60 * 60;

const DEFAULT_REALITY_CHECK_MIN = 30;

/**
 * Read the player's responsible-gambling settings, lazily creating defaults if absent.
 */
export function getRgSettings(userId: string): StoredResponsibleGambling {
  const existing = db.responsible.get(userId);
  if (existing) return effectivize(existing);
  const fresh: StoredResponsibleGambling = {
    userId,
    dailyDepositLimit: null,
    weeklyDepositLimit: null,
    monthlyDepositLimit: null,
    dailyLossLimit: null,
    sessionTimeLimitMin: null,
    realityCheckIntervalMin: DEFAULT_REALITY_CHECK_MIN,
    selfExclusionUntil: null,
    coolingOffUntil: null,
    pendingIncreaseTo: null,
    pendingIncreaseEffectiveAt: null,
  };
  db.responsible.upsert(fresh);
  return fresh;
}

/**
 * Apply pending-increase if its effective time has passed.
 * Mutates the stored record in-place.
 */
function effectivize(r: StoredResponsibleGambling): StoredResponsibleGambling {
  if (r.pendingIncreaseTo !== null && r.pendingIncreaseEffectiveAt) {
    if (Date.now() >= new Date(r.pendingIncreaseEffectiveAt).getTime()) {
      const updated = {
        ...r,
        dailyDepositLimit: r.pendingIncreaseTo,
        pendingIncreaseTo: null,
        pendingIncreaseEffectiveAt: null,
      };
      db.responsible.upsert(updated);
      return updated;
    }
  }
  return r;
}

export type SetLimitInput = {
  dailyDepositLimit?: number | null;
  weeklyDepositLimit?: number | null;
  monthlyDepositLimit?: number | null;
  dailyLossLimit?: number | null;
  sessionTimeLimitMin?: number | null;
  realityCheckIntervalMin?: number;
};

/**
 * Apply a limit change. Decreases take effect immediately; increases for the daily
 * deposit limit are deferred 24 hours per LCCP SR Code 3.4.3.
 */
export function setLimits(userId: string, input: SetLimitInput): ServiceResult<StoredResponsibleGambling> {
  const cur = getRgSettings(userId);

  // Validate non-negative integers (or null = remove)
  for (const [k, v] of Object.entries(input)) {
    if (v === null || v === undefined) continue;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
      return { ok: false, error: `Invalid value for ${k}.`, code: "INVALID" };
    }
  }

  const next: StoredResponsibleGambling = { ...cur };
  let deferredIncrease = false;

  // Daily deposit limit: increases deferred 24h, decreases immediate
  if ("dailyDepositLimit" in input) {
    const newVal = input.dailyDepositLimit ?? null;
    const oldVal = cur.dailyDepositLimit;
    const isIncrease = newVal !== null && (oldVal === null || newVal > oldVal);
    if (isIncrease) {
      next.pendingIncreaseTo = newVal;
      next.pendingIncreaseEffectiveAt = new Date(Date.now() + LIMIT_INCREASE_DEFERRAL_SEC * 1000).toISOString();
      deferredIncrease = true;
    } else {
      next.dailyDepositLimit = newVal;
      next.pendingIncreaseTo = null;
      next.pendingIncreaseEffectiveAt = null;
    }
  }
  if ("weeklyDepositLimit" in input)   next.weeklyDepositLimit = input.weeklyDepositLimit ?? null;
  if ("monthlyDepositLimit" in input)  next.monthlyDepositLimit = input.monthlyDepositLimit ?? null;
  if ("dailyLossLimit" in input)       next.dailyLossLimit = input.dailyLossLimit ?? null;
  if ("sessionTimeLimitMin" in input)  next.sessionTimeLimitMin = input.sessionTimeLimitMin ?? null;
  if ("realityCheckIntervalMin" in input && input.realityCheckIntervalMin !== undefined) {
    next.realityCheckIntervalMin = Math.max(5, Math.min(120, input.realityCheckIntervalMin));
  }

  db.responsible.upsert(next);
  audit({
    category: "COMPLIANCE",
    action: deferredIncrease ? "rg.limit.increase.deferred" : "rg.limit.changed",
    actorId: userId,
    targetType: "ResponsibleGambling",
    targetId: userId,
    payload: { input, deferredIncrease, effectiveAt: next.pendingIncreaseEffectiveAt },
  });
  return { ok: true, data: next };
}

/**
 * Self-exclude. One-way: the player cannot reverse this themselves. Wallet is
 * frozen; session cookie is invalidated by the route handler that calls this.
 */
export function selfExclude(userId: string, period: keyof typeof SELF_EXCLUSION_PERIODS_SEC): ServiceResult<{ until: string }> {
  const cur = getRgSettings(userId);
  const until = new Date(Date.now() + SELF_EXCLUSION_PERIODS_SEC[period] * 1000).toISOString();
  db.responsible.upsert({ ...cur, selfExclusionUntil: until });
  // Freeze user + wallet
  db.user.update(userId, { status: "SELF_EXCLUDED" });
  const wallet = db.wallet.findByUserId(userId);
  if (wallet) db.wallet.update(wallet.id, { status: "FROZEN" });
  audit({
    category: "COMPLIANCE",
    action: "rg.self_exclusion.activated",
    actorId: userId,
    targetType: "User",
    targetId: userId,
    payload: { period, until },
  });
  return { ok: true, data: { until } };
}

/**
 * Cooling-off — shorter, also one-way until expiry. User cannot bet/deposit during.
 */
export function coolOff(userId: string, period: keyof typeof COOLING_OFF_PERIODS_SEC): ServiceResult<{ until: string }> {
  const cur = getRgSettings(userId);
  const until = new Date(Date.now() + COOLING_OFF_PERIODS_SEC[period] * 1000).toISOString();
  db.responsible.upsert({ ...cur, coolingOffUntil: until });
  db.user.update(userId, { status: "COOLED_OFF" });
  audit({
    category: "COMPLIANCE",
    action: "rg.cooling_off.activated",
    actorId: userId,
    targetType: "User",
    targetId: userId,
    payload: { period, until },
  });
  return { ok: true, data: { until } };
}

/**
 * True if the user is currently self-excluded or in a cooling-off period.
 */
export function isLockedOut(userId: string): { locked: boolean; until: string | null; reason: "self_exclusion" | "cooling_off" | null } {
  const r = getRgSettings(userId);
  const now = Date.now();
  if (r.selfExclusionUntil && new Date(r.selfExclusionUntil).getTime() > now) {
    return { locked: true, until: r.selfExclusionUntil, reason: "self_exclusion" };
  }
  if (r.coolingOffUntil && new Date(r.coolingOffUntil).getTime() > now) {
    return { locked: true, until: r.coolingOffUntil, reason: "cooling_off" };
  }
  return { locked: false, until: null, reason: null };
}

/**
 * Check whether a deposit of `amount` would exceed any active deposit limit.
 * Sums confirmed DEPOSIT transactions inside each rolling window.
 */
export function checkDepositLimit(userId: string, amount: number): { allowed: boolean; reason?: string } {
  const r = getRgSettings(userId);
  const now = Date.now();
  const txns = db.txn.findByUser(userId, 500).filter((t: StoredTxn) =>
    t.type === "DEPOSIT" && t.status === "CONFIRMED",
  );
  const sumSince = (sec: number) => {
    const cutoff = now - sec * 1000;
    return txns
      .filter((t) => new Date(t.createdAt).getTime() >= cutoff)
      .reduce((s, t) => s + t.amount, 0);
  };
  if (r.dailyDepositLimit !== null && sumSince(86_400) + amount > r.dailyDepositLimit) {
    return { allowed: false, reason: `Daily deposit limit of TZS ${r.dailyDepositLimit.toLocaleString()} would be exceeded.` };
  }
  if (r.weeklyDepositLimit !== null && sumSince(7 * 86_400) + amount > r.weeklyDepositLimit) {
    return { allowed: false, reason: `Weekly deposit limit of TZS ${r.weeklyDepositLimit.toLocaleString()} would be exceeded.` };
  }
  if (r.monthlyDepositLimit !== null && sumSince(30 * 86_400) + amount > r.monthlyDepositLimit) {
    return { allowed: false, reason: `Monthly deposit limit of TZS ${r.monthlyDepositLimit.toLocaleString()} would be exceeded.` };
  }
  return { allowed: true };
}
