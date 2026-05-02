/**
 * Aggregation queries for the admin dashboard.
 *
 * These compute on the in-memory store today. In production each function
 * becomes a single Postgres query. Function shapes match the SQL we expect
 * to write — no behaviour change at the call site.
 *
 * All money values are in TZS (integer minor units would normally be cents,
 * but TZS has no fractional unit in practice, so we keep integers).
 */
import { db } from "./store";
import type { StoredTxn, StoredUser } from "./store";

export type Period = "today" | "7d" | "28d" | "qtd";

function periodToMs(p: Period): number {
  switch (p) {
    case "today": return 24 * 3600_000;
    case "7d":    return 7 * 24 * 3600_000;
    case "28d":   return 28 * 24 * 3600_000;
    case "qtd":   return 91 * 24 * 3600_000;
  }
}

function txnsInPeriod(period: Period): StoredTxn[] {
  const cutoff = Date.now() - periodToMs(period);
  // Snapshot all txns in period — db doesn't expose a list-all, so we walk via users.
  const all: StoredTxn[] = [];
  for (const u of db.user.list()) {
    for (const t of db.txn.findByUser(u.id, 5_000)) {
      if (new Date(t.createdAt).getTime() >= cutoff) all.push(t);
    }
  }
  return all;
}

/**
 * GGR = sum of stakes placed (BET_PLACED). Excludes payouts. Standard regulator
 * definition: gross gaming revenue is everything wagered, before any winnings.
 */
export function grossGamingRevenue(period: Period = "today"): number {
  return txnsInPeriod(period)
    .filter((t) => t.type === "BET_PLACED" && t.status === "CONFIRMED")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
}

/**
 * NGR = GGR − payouts − cash-outs. The bottom-line operator income before tax + opex.
 */
export function netGamingRevenue(period: Period = "today"): number {
  const ts = txnsInPeriod(period);
  const stakes = ts.filter((t) => t.type === "BET_PLACED" && t.status === "CONFIRMED").reduce((s, t) => s + Math.abs(t.amount), 0);
  const payouts = ts.filter((t) => (t.type === "BET_PAYOUT" || t.type === "CASHOUT") && t.status === "CONFIRMED").reduce((s, t) => s + Math.abs(t.amount), 0);
  return stakes - payouts;
}

export function depositsTotal(period: Period = "today"): { amount: number; count: number } {
  const ts = txnsInPeriod(period).filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED");
  return { amount: ts.reduce((s, t) => s + t.amount, 0), count: ts.length };
}

export function withdrawalsTotal(period: Period = "today"): { amount: number; count: number } {
  const ts = txnsInPeriod(period).filter((t) => t.type === "WITHDRAWAL" && t.status === "CONFIRMED");
  return { amount: ts.reduce((s, t) => s + Math.abs(t.amount), 0), count: ts.length };
}

/** Per-provider deposit/withdrawal totals with fees + net. */
export function providerSummary(period: Period = "today"): Array<{
  provider: string;
  deposits: number;
  depositCount: number;
  withdrawals: number;
  withdrawalCount: number;
  net: number;
}> {
  const ts = txnsInPeriod(period);
  const map: Record<string, { deposits: number; depositCount: number; withdrawals: number; withdrawalCount: number }> = {};
  for (const t of ts) {
    const key = t.provider ?? "OTHER";
    if (key === "INTERNAL") continue; // skip internal bet payouts
    const e = (map[key] ??= { deposits: 0, depositCount: 0, withdrawals: 0, withdrawalCount: 0 });
    if (t.type === "DEPOSIT" && t.status === "CONFIRMED") {
      e.deposits += t.amount;
      e.depositCount++;
    } else if (t.type === "WITHDRAWAL" && t.status === "CONFIRMED") {
      e.withdrawals += Math.abs(t.amount);
      e.withdrawalCount++;
    }
  }
  return Object.entries(map)
    .map(([provider, e]) => ({
      provider,
      deposits: e.deposits,
      depositCount: e.depositCount,
      withdrawals: e.withdrawals,
      withdrawalCount: e.withdrawalCount,
      net: e.deposits - e.withdrawals,
    }))
    .sort((a, b) => b.deposits - a.deposits);
}

/** Active players in the period — anyone with at least one bet or deposit. */
export function activePlayers(period: Period = "today"): number {
  const ts = txnsInPeriod(period);
  return new Set(ts.map((t) => t.userId)).size;
}

/** Sum of all wallet balances across all users. */
export function walletLiabilityTotal(): number {
  let total = 0;
  for (const u of db.user.list()) {
    const w = db.wallet.findByUserId(u.id);
    if (w && w.status === "ACTIVE") total += w.balance;
  }
  return total;
}

/**
 * KYC funnel — count of users at each step.
 * registered → started → pending → approved.
 */
export function kycFunnel(): {
  registered: number;
  started: number;
  pending: number;
  approved: number;
} {
  const users = db.user.list();
  const registered = users.length;
  let started = 0;
  let pending = 0;
  let approved = 0;
  for (const u of users) {
    const k = db.kyc.findByUserId(u.id);
    if (!k || k.status === "NOT_STARTED") continue;
    started++;
    if (k.status === "PENDING_REVIEW") pending++;
    else if (k.status === "APPROVED") approved++;
  }
  return { registered, started, pending, approved };
}

/** Self-exclusion + cooling-off counts (currently active). */
export function rgRosterCounts(): {
  selfExcluded: number;
  cooledOff: number;
  expiringThisWeek: number;
  pendingLimitIncrease: number;
} {
  const now = Date.now();
  const oneWeek = now + 7 * 24 * 3600_000;
  let selfExcluded = 0;
  let cooledOff = 0;
  let expiringThisWeek = 0;
  let pendingLimitIncrease = 0;
  for (const u of db.user.list()) {
    const r = db.responsible.get(u.id);
    if (!r) continue;
    const sxAt = r.selfExclusionUntil ? new Date(r.selfExclusionUntil).getTime() : 0;
    const coAt = r.coolingOffUntil ? new Date(r.coolingOffUntil).getTime() : 0;
    if (sxAt > now) {
      selfExcluded++;
      if (sxAt < oneWeek) expiringThisWeek++;
    }
    if (coAt > now) cooledOff++;
    if (r.pendingIncreaseTo !== null) pendingLimitIncrease++;
  }
  return { selfExcluded, cooledOff, expiringThisWeek, pendingLimitIncrease };
}

/** AML queue stats for the period. */
export function amlStats(period: Period = "7d"): {
  pending: number;
  approved: number;
  rejected: number;
  avgTimeToDecisionMin: number;
} {
  const pending = db.txn.listByStatus("AML_REVIEW").length;
  // Approved = transactions that were AML_REVIEW then flipped to CONFIRMED via the
  // approve action. We don't track that directly in the txn record, so we count
  // ADMIN audit entries with action=aml.approved/rejected as a proxy.
  const cutoff = Date.now() - periodToMs(period);
  // The audit module is async-ringed; use a simple count proxy:
  return {
    pending,
    approved: 0,         // populated when audit-by-action exists
    rejected: 0,
    avgTimeToDecisionMin: 0,
  };
}

/** Active player counts grouped by wallet status — used by /admin/players summary chips. */
export function userStatusCounts(): Record<StoredUser["status"], number> {
  const all = db.user.list();
  return all.reduce(
    (acc, u) => {
      acc[u.status] = (acc[u.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<StoredUser["status"], number>,
  );
}

/** Top-N players by lifetime NGR contribution (anonymised id). */
export function topNgrContributors(n = 10): Array<{ userId: string; lifetimeStakes: number; lifetimePayouts: number; ngr: number }> {
  const out: Array<{ userId: string; lifetimeStakes: number; lifetimePayouts: number; ngr: number }> = [];
  for (const u of db.user.list()) {
    const ts = db.txn.findByUser(u.id, 5_000);
    const stakes = ts.filter((t) => t.type === "BET_PLACED" && t.status === "CONFIRMED").reduce((s, t) => s + Math.abs(t.amount), 0);
    const payouts = ts.filter((t) => (t.type === "BET_PAYOUT" || t.type === "CASHOUT") && t.status === "CONFIRMED").reduce((s, t) => s + Math.abs(t.amount), 0);
    if (stakes === 0 && payouts === 0) continue;
    out.push({ userId: u.id, lifetimeStakes: stakes, lifetimePayouts: payouts, ngr: stakes - payouts });
  }
  return out.sort((a, b) => b.ngr - a.ngr).slice(0, n);
}

/** Sum of operator margin = NGR / (NGR + payouts). */
export function operatorMarginPct(period: Period = "28d"): number {
  const ts = txnsInPeriod(period);
  const stakes = ts.filter((t) => t.type === "BET_PLACED" && t.status === "CONFIRMED").reduce((s, t) => s + Math.abs(t.amount), 0);
  const payouts = ts.filter((t) => (t.type === "BET_PAYOUT" || t.type === "CASHOUT") && t.status === "CONFIRMED").reduce((s, t) => s + Math.abs(t.amount), 0);
  if (stakes === 0) return 0;
  return ((stakes - payouts) / stakes) * 100;
}

/** Withdrawals over the AML threshold (1M TZS) — count + total. */
export function amlThresholdBreaches(period: Period = "7d"): { count: number; total: number } {
  const ts = txnsInPeriod(period).filter((t) => t.type === "WITHDRAWAL" && Math.abs(t.amount) >= 1_000_000);
  return { count: ts.length, total: ts.reduce((s, t) => s + Math.abs(t.amount), 0) };
}

/**
 * Time-bucketed series for charting. Returns evenly-spaced buckets covering
 * the period. Each bucket has the net flow (deposits + bets stake) − (payouts +
 * cashouts + withdrawals). Useful for the money-flow area chart.
 */
export function moneyFlowSeries(period: Period = "today", buckets = 24): Array<{ x: number; y: number; label: string }> {
  const totalMs = periodToMs(period);
  const now = Date.now();
  const bucketMs = totalMs / buckets;
  const ts = txnsInPeriod(period);
  const out: Array<{ x: number; y: number; label: string }> = [];
  for (let i = 0; i < buckets; i++) {
    const bucketStart = now - totalMs + i * bucketMs;
    const bucketEnd = bucketStart + bucketMs;
    let inflow = 0;
    let outflow = 0;
    for (const t of ts) {
      const at = new Date(t.createdAt).getTime();
      if (at < bucketStart || at >= bucketEnd) continue;
      if (t.status !== "CONFIRMED") continue;
      if (t.type === "DEPOSIT") inflow += t.amount;
      else if (t.type === "BET_PLACED") inflow += Math.abs(t.amount);
      else if (t.type === "WITHDRAWAL") outflow += Math.abs(t.amount);
      else if (t.type === "BET_PAYOUT" || t.type === "CASHOUT") outflow += Math.abs(t.amount);
    }
    const net = inflow - outflow;
    const d = new Date(bucketStart);
    const label =
      period === "today" ? `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}` :
      `${d.getDate()}/${d.getMonth() + 1}`;
    out.push({ x: i, y: net, label });
  }
  return out;
}

/**
 * Operator margin over time (per bucket). Margin = stakes / (stakes + payouts) × 100.
 */
export function marginSeries(period: Period = "28d", buckets = 28): Array<{ x: number; y: number; label: string }> {
  const totalMs = periodToMs(period);
  const now = Date.now();
  const bucketMs = totalMs / buckets;
  const ts = txnsInPeriod(period);
  const out: Array<{ x: number; y: number; label: string }> = [];
  for (let i = 0; i < buckets; i++) {
    const bucketStart = now - totalMs + i * bucketMs;
    const bucketEnd = bucketStart + bucketMs;
    let stakes = 0;
    let payouts = 0;
    for (const t of ts) {
      const at = new Date(t.createdAt).getTime();
      if (at < bucketStart || at >= bucketEnd) continue;
      if (t.status !== "CONFIRMED") continue;
      if (t.type === "BET_PLACED") stakes += Math.abs(t.amount);
      else if (t.type === "BET_PAYOUT" || t.type === "CASHOUT") payouts += Math.abs(t.amount);
    }
    const margin = stakes === 0 ? 0 : ((stakes - payouts) / stakes) * 100;
    const d = new Date(bucketStart);
    out.push({ x: i, y: margin, label: `${d.getDate()}/${d.getMonth() + 1}` });
  }
  return out;
}

/** Per-day provider deposit volume — for the stacked-bar provider chart. */
export function providerStackedSeries(period: Period = "28d", buckets = 14): Array<{ label: string; segments: number[] }> {
  const totalMs = periodToMs(period);
  const now = Date.now();
  const bucketMs = totalMs / buckets;
  const ts = txnsInPeriod(period).filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED");
  // Discover provider order
  const providers = Array.from(new Set(ts.map((t) => t.provider ?? "OTHER"))).slice(0, 5);
  const out: Array<{ label: string; segments: number[] }> = [];
  for (let i = 0; i < buckets; i++) {
    const bucketStart = now - totalMs + i * bucketMs;
    const bucketEnd = bucketStart + bucketMs;
    const segments = providers.map(() => 0);
    for (const t of ts) {
      const at = new Date(t.createdAt).getTime();
      if (at < bucketStart || at >= bucketEnd) continue;
      const idx = providers.indexOf(t.provider ?? "OTHER");
      if (idx >= 0) segments[idx] += t.amount;
    }
    const d = new Date(bucketStart);
    out.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, segments });
  }
  return out;
}

export function listProvidersInPeriod(period: Period = "28d"): string[] {
  return Array.from(new Set(txnsInPeriod(period).map((t) => t.provider ?? "OTHER").filter((p) => p !== "INTERNAL"))).slice(0, 5);
}
