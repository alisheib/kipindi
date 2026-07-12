/**
 * Owner insight aggregates (F7) — decision-grade BI.
 *
 * HONESTY RULES (this is an owner-facing money surface):
 *  - There is **no "visit" stage** in the funnel. The platform has ZERO web
 *    analytics instrumentation (no pageview table, no vendor). A visit count
 *    would be invented, so the funnel starts at REGISTER and says so.
 *  - Retention is **activity**-retention (did a cohort's players actually BET in
 *    a later month), derived from confirmed BET_PLACED rows. A login-frequency
 *    curve is NOT possible — `user.lastLoginAt` is a single latest value and the
 *    Session table has no DAL accessor — so we do not pretend to have one.
 *  - LTV is real: lifetime (stakes − payouts) per player, i.e. what they actually
 *    contributed to GGR. Not a projection, not a model.
 *  - Empty platform → honest zeros, never filler.
 *
 * PERF: computed in a SINGLE pass over the transaction table (which the admin
 * money pages already scan) and memoised for 60s on globalThis — the same pattern
 * `platform-stats.ts` uses. One scan serves the whole dashboard.
 */
import { db } from "./store";
import { marketStore } from "./market-dal";
import type { MarketCategory } from "./market-service";

const TTL_MS = 60_000;

export type FunnelStep = { key: string; label: string; sw: string; value: number };

export type CohortRow = {
  /** YYYY-MM the players registered in. */
  cohort: string;
  players: number;
  /** Retained[k] = how many of this cohort placed a bet k months after signing up. */
  retained: number[];
  /** Lifetime GGR contribution of the cohort (stakes − payouts), in TZS. */
  ltvTotal: number;
  /** ltvTotal / players — the honest average value of a player from this cohort. */
  ltvPerPlayer: number;
};

export type TopMarket = {
  id: string;
  title: string;
  category: MarketCategory;
  volume: number;
  predictors: number;
  status: string;
};

export type Insights = {
  funnel: FunnelStep[];
  cohorts: CohortRow[];
  /** Max k across cohorts, so the UI knows how many retention columns to draw. */
  maxMonthOffset: number;
  topMarkets: TopMarket[];
  totals: { players: number; bettors: number; ltvTotal: number; ltvPerPlayer: number };
  generatedAt: string;
  /** Surfaced in the UI so nobody mistakes a stale panel for live data. */
  cached: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_INSIGHTS: { at: number; data: Insights } | undefined;
}

const ym = (iso: string) => iso.slice(0, 7); // YYYY-MM

/** Whole months between two YYYY-MM keys. */
function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export async function getInsights(force = false): Promise<Insights> {
  const cache = globalThis.__50PICK_INSIGHTS;
  if (!force && cache && Date.now() - cache.at < TTL_MS) {
    return { ...cache.data, cached: true };
  }

  // NOTE: the in-memory DAL returns values synchronously (the Prisma twin is
  // async), so `.catch()` is not available on the call — await inside try/catch.
  const safe = async <T,>(run: () => Promise<T> | T, fallback: T): Promise<T> => {
    try { return await run(); } catch { return fallback; }
  };

  const [users, txns, markets] = await Promise.all([
    safe(() => db.user.list(), [] as Awaited<ReturnType<typeof db.user.list>>),
    safe(() => db.txn.listAll(), [] as Awaited<ReturnType<typeof db.txn.listAll>>),
    safe(() => marketStore.values(), [] as Awaited<ReturnType<typeof marketStore.values>>),
  ]);

  // Players only — staff/admin accounts are not customers and would skew every
  // funnel and cohort figure.
  const players = users.filter((u) => u.role === "PLAYER");
  const playerIds = new Set(players.map((u) => u.id));
  const cohortOf = new Map<string, string>(); // userId -> YYYY-MM
  for (const u of players) cohortOf.set(u.id, ym(u.createdAt));

  // ── ONE pass over the ledger ──────────────────────────────────────────────
  const firstDeposit = new Set<string>();
  const firstBet = new Set<string>();
  const betMonths = new Map<string, Set<string>>(); // userId -> set of YYYY-MM they bet in
  const money = new Map<string, { stakes: number; payouts: number }>();

  for (const t of txns) {
    if (t.status !== "CONFIRMED") continue;
    if (!playerIds.has(t.userId)) continue;
    if (t.type === "DEPOSIT") { firstDeposit.add(t.userId); continue; }
    const isStake = t.type === "BET_PLACED";
    const isPayout = t.type === "BET_PAYOUT" || t.type === "CASHOUT";
    if (!isStake && !isPayout) continue;

    const e = money.get(t.userId) ?? { stakes: 0, payouts: 0 };
    if (isStake) {
      e.stakes += Math.abs(t.amount);
      firstBet.add(t.userId);
      const set = betMonths.get(t.userId) ?? new Set<string>();
      set.add(ym(t.createdAt));
      betMonths.set(t.userId, set);
    } else {
      e.payouts += Math.abs(t.amount);
    }
    money.set(t.userId, e);
  }

  // ── KYC (one scan, not the N+1 the existing kycFunnel does) ───────────────
  const kycRows = await safe(() => db.kyc.list(), [] as Awaited<ReturnType<typeof db.kyc.list>>);
  const kycApproved = new Set(
    kycRows.filter((k) => k.status === "APPROVED" && playerIds.has(k.userId)).map((k) => k.userId),
  );

  // ── Funnel — 4 REAL stages. "Visit" is deliberately absent (not instrumented).
  const funnel: FunnelStep[] = [
    { key: "register", label: "Registered", sw: "Wamejisajili", value: players.length },
    { key: "kyc", label: "KYC approved", sw: "KYC imeidhinishwa", value: kycApproved.size },
    { key: "deposit", label: "Deposited", sw: "Wameweka fedha", value: firstDeposit.size },
    { key: "bet", label: "Placed a bet", sw: "Wameweka dau", value: firstBet.size },
  ];

  // ── Cohorts: registration month × activity retention + real LTV ───────────
  const byCohort = new Map<string, string[]>();
  for (const u of players) {
    const c = ym(u.createdAt);
    const arr = byCohort.get(c) ?? [];
    arr.push(u.id);
    byCohort.set(c, arr);
  }

  let maxMonthOffset = 0;
  const cohorts: CohortRow[] = [];
  for (const [cohort, ids] of [...byCohort.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
    const retainedCounts: number[] = [];
    let ltvTotal = 0;
    for (const id of ids) {
      const m = money.get(id);
      if (m) ltvTotal += m.stakes - m.payouts;
      for (const bm of betMonths.get(id) ?? []) {
        const k = monthDiff(cohort, bm);
        if (k < 0) continue; // a bet before signup is impossible; ignore rather than invent
        retainedCounts[k] = (retainedCounts[k] ?? 0) + 1;
        if (k > maxMonthOffset) maxMonthOffset = k;
      }
    }
    const retained: number[] = [];
    for (let k = 0; k <= (retainedCounts.length ? retainedCounts.length - 1 : 0); k++) {
      retained[k] = retainedCounts[k] ?? 0;
    }
    cohorts.push({
      cohort,
      players: ids.length,
      retained,
      ltvTotal,
      ltvPerPlayer: ids.length ? Math.round(ltvTotal / ids.length) : 0,
    });
  }

  // ── Top markets by volume (markets is a small bounded table) ──────────────
  const topMarkets: TopMarket[] = markets
    .map((m) => ({
      id: m.id,
      title: m.titleEn,
      category: m.category,
      volume: m.yesPool + m.noPool,
      predictors: m.predictorCount,
      status: m.status,
    }))
    .filter((m) => m.volume > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10);

  let ltvTotalAll = 0;
  for (const [, m] of money) ltvTotalAll += m.stakes - m.payouts;

  const data: Insights = {
    funnel,
    cohorts,
    maxMonthOffset,
    topMarkets,
    totals: {
      players: players.length,
      bettors: firstBet.size,
      ltvTotal: ltvTotalAll,
      ltvPerPlayer: players.length ? Math.round(ltvTotalAll / players.length) : 0,
    },
    generatedAt: new Date().toISOString(),
    cached: false,
  };

  globalThis.__50PICK_INSIGHTS = { at: Date.now(), data };
  return data;
}
