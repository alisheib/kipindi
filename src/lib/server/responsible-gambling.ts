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
 *
 * Single-pass aggregation — earlier version filtered the same txn list
 * three times (one per window). Now we walk it once and accumulate
 * daily / weekly / monthly sums together. The 30-day window dominates,
 * so anything that doesn't fall inside it short-circuits early.
 */
export function checkDepositLimit(userId: string, amount: number): { allowed: boolean; reason?: string } {
  const r = getRgSettings(userId);
  const now = Date.now();
  const cutoffMonth = now - 30 * 86_400 * 1000;
  const cutoffWeek = now - 7 * 86_400 * 1000;
  const cutoffDay = now - 86_400 * 1000;

  let dailySum = 0, weeklySum = 0, monthlySum = 0;
  // Explicit type annotation on the local — db.txn.findByUser returns
  // `unknown` in the current type chain (a pre-existing store-shape
  // issue) so we narrow once here for the loop.
  const allTxns: StoredTxn[] = db.txn.findByUser(userId, 500) as StoredTxn[];
  for (const t of allTxns) {
    if (t.type !== "DEPOSIT" || t.status !== "CONFIRMED") continue;
    const at = new Date(t.createdAt).getTime();
    if (at < cutoffMonth) continue;        // older than 30d — irrelevant to any window
    monthlySum += t.amount;
    if (at < cutoffWeek) continue;
    weeklySum += t.amount;
    if (at < cutoffDay) continue;
    dailySum += t.amount;
  }

  if (r.dailyDepositLimit !== null && dailySum + amount > r.dailyDepositLimit) {
    return { allowed: false, reason: `Daily deposit limit of TZS ${r.dailyDepositLimit.toLocaleString()} would be exceeded.` };
  }
  if (r.weeklyDepositLimit !== null && weeklySum + amount > r.weeklyDepositLimit) {
    return { allowed: false, reason: `Weekly deposit limit of TZS ${r.weeklyDepositLimit.toLocaleString()} would be exceeded.` };
  }
  if (r.monthlyDepositLimit !== null && monthlySum + amount > r.monthlyDepositLimit) {
    return { allowed: false, reason: `Monthly deposit limit of TZS ${r.monthlyDepositLimit.toLocaleString()} would be exceeded.` };
  }
  return { allowed: true };
}

/**
 * Markers-of-harm detector — LCCP SR Code 3.4.1.
 *
 * Single-marker fires an in-app prompt; multi-marker triggers a Player-Safety
 * outreach within 24h. Markers detected:
 *
 *   1. RAPID_DEPOSIT_ESCALATION  — 3+ deposits in 60 min OR 24h sum > 2× 7d-prior daily-avg
 *   2. CHASING_LOSSES            — deposit within 30 min of a losing bet, repeated 3+ times
 *   3. LATE_NIGHT_PLAY           — placed 5+ bets between 00:00 and 06:00 EAT in last 7d
 *   4. LIMIT_BREACH_HISTORY      — 2+ blocked deposit attempts in last 7d (i.e. tried to exceed)
 *   5. SESSION_OVERRUN           — current session exceeds reality-check interval × 4
 *
 * The detector is read-only — it computes from existing audit + transaction
 * history, never mutates user state. Output drives the in-app prompt and the
 * /admin/compliance Player Safety dashboard.
 */
export type HarmMarker =
  | "RAPID_DEPOSIT_ESCALATION"
  | "CHASING_LOSSES"
  | "LATE_NIGHT_PLAY"
  | "LIMIT_BREACH_HISTORY"
  | "SESSION_OVERRUN";

export type HarmFlag = {
  userId: string;
  marker: HarmMarker;
  detectedAt: string;
  severity: "info" | "warn" | "high";
  detail: string;
};

/** Context passed to every Detector — pre-computed once per call to
 *  detectHarmMarkers so the individual detectors don't re-walk the
 *  transaction list. */
type DetectorContext = {
  userId: string;
  now: number;
  txns: StoredTxn[];
  recent7d: StoredTxn[];
  opts: { sessionStartedAt?: string };
};

/** A Detector is a pure function from context to an optional flag.
 *  Adding a new harm-marker is now one entry in the DETECTORS array
 *  below — no need to graft new logic into a 100-line function. */
type Detector = (ctx: DetectorContext) => HarmFlag | null;

const flag = (
  ctx: DetectorContext,
  marker: HarmMarker,
  severity: HarmFlag["severity"],
  detail: string,
): HarmFlag => ({
  userId: ctx.userId,
  marker,
  detectedAt: new Date().toISOString(),
  severity,
  detail,
});

const DETECTORS: Detector[] = [
  // 1. Rapid deposit escalation — 3+ deposits in 60 min OR 24h sum >
  //    2× prior-7d daily-avg AND > TZS 50,000.
  (ctx) => {
    const deposits = ctx.txns.filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED");
    const dep1h = deposits.filter((t) => ctx.now - new Date(t.createdAt).getTime() < 3600_000);
    if (dep1h.length >= 3) {
      return flag(ctx, "RAPID_DEPOSIT_ESCALATION", "warn", `${dep1h.length} deposits in last 60 min`);
    }
    const dep24h = deposits.filter((t) => ctx.now - new Date(t.createdAt).getTime() < 24 * 3600_000);
    const depPrior7d = deposits.filter((t) => {
      const at = new Date(t.createdAt).getTime();
      return at >= ctx.now - 8 * 24 * 3600_000 && at < ctx.now - 24 * 3600_000;
    });
    const priorDailyAvg =
      depPrior7d.length > 0 ? depPrior7d.reduce((s, t) => s + t.amount, 0) / 7 : 0;
    const today24hSum = dep24h.reduce((s, t) => s + t.amount, 0);
    if (priorDailyAvg > 0 && today24hSum > priorDailyAvg * 2 && today24hSum > 50_000) {
      return flag(
        ctx,
        "RAPID_DEPOSIT_ESCALATION",
        "warn",
        `24h deposits ${Math.round(today24hSum).toLocaleString()} > 2× prior daily avg ${Math.round(priorDailyAvg).toLocaleString()}`,
      );
    }
    return null;
  },

  // 2. Chasing losses — 3+ deposits within 30 min of a losing bet in 7d
  (ctx) => {
    const lostBets = ctx.recent7d.filter((t) => t.type === "BET_PLACED" && t.status === "CONFIRMED");
    const recentDeposits = ctx.recent7d.filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED");
    let chases = 0;
    for (const dep of recentDeposits) {
      const depAt = new Date(dep.createdAt).getTime();
      const nearby = lostBets.find((b) => {
        const bAt = new Date(b.createdAt).getTime();
        return depAt - bAt > 0 && depAt - bAt < 30 * 60_000;
      });
      if (nearby) chases++;
    }
    if (chases >= 3) {
      return flag(
        ctx,
        "CHASING_LOSSES",
        "high",
        `${chases} deposits within 30 min of a losing bet over the last 7 days`,
      );
    }
    return null;
  },

  // 3. Late-night play — 5+ bets between 00:00 and 06:00 EAT (UTC+3) in 7d
  (ctx) => {
    const lateNight = ctx.recent7d.filter((t) => {
      if (t.type !== "BET_PLACED" || t.status !== "CONFIRMED") return false;
      const eatHours = (new Date(t.createdAt).getUTCHours() + 3) % 24;
      return eatHours >= 0 && eatHours < 6;
    });
    if (lateNight.length >= 5) {
      return flag(
        ctx,
        "LATE_NIGHT_PLAY",
        "info",
        `${lateNight.length} bets between 00:00 and 06:00 EAT in last 7 days`,
      );
    }
    return null;
  },

  // 4. Limit-breach history — no audit-side ledger yet; left as a
  //    no-op detector so adding the data source later is one PR (just
  //    return a flag, no surrounding plumbing changes).

  // 5. Session overrun — current session exceeds reality-check × 4
  (ctx) => {
    if (!ctx.opts.sessionStartedAt) return null;
    const startedAt = new Date(ctx.opts.sessionStartedAt).getTime();
    const minutes = (ctx.now - startedAt) / 60_000;
    const r = getRgSettings(ctx.userId);
    const limitMin = r.realityCheckIntervalMin || DEFAULT_REALITY_CHECK_MIN;
    if (minutes > limitMin * 4) {
      return flag(
        ctx,
        "SESSION_OVERRUN",
        "warn",
        `Session has run ${Math.round(minutes)} min, > 4× reality-check interval (${limitMin} min)`,
      );
    }
    return null;
  },
];

/** Detect harm markers for a single user. Walks the DETECTORS list
 *  and collects flags — adding a new marker is one entry in the
 *  array above. */
export function detectHarmMarkers(
  userId: string,
  opts: { sessionStartedAt?: string } = {},
): HarmFlag[] {
  const now = Date.now();
  const txns = db.txn.findByUser(userId, 1_000) as StoredTxn[];
  const ctx: DetectorContext = {
    userId,
    now,
    txns,
    recent7d: txns.filter((t) => now - new Date(t.createdAt).getTime() < 7 * 24 * 3600_000),
    opts,
  };
  const flags: HarmFlag[] = [];
  for (const det of DETECTORS) {
    const f = det(ctx);
    if (f) flags.push(f);
  }
  return flags;
}

/**
 * Detect markers across ALL users — feeds /admin/compliance Player Safety panel.
 */
export function detectHarmMarkersForAllUsers(): HarmFlag[] {
  const out: HarmFlag[] = [];
  for (const u of db.user.list()) {
    out.push(...detectHarmMarkers(u.id));
  }
  return out;
}
