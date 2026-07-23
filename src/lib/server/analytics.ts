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
import { moneyForWindow } from "./report-money";
import { listMarkets, ratesFor } from "./market-service";
import { poolFee, levySplit, type FeeModel } from "../payout";

export type Period = "today" | "7d" | "28d" | "qtd";
/** Either a rolling window (Period, ending now) OR explicit epoch bounds
 *  [start, end) — the latter lets callers ask for a fixed calendar month
 *  (e.g. the statutory GBT monthly pack) instead of a rolling window. */
export type Window = Period | { start: number; end: number };

function periodToMs(p: Period): number {
  switch (p) {
    case "today": return 24 * 3600_000;
    case "7d":    return 7 * 24 * 3600_000;
    case "28d":   return 28 * 24 * 3600_000;
    case "qtd":   return 91 * 24 * 3600_000;
  }
}

function windowBounds(w: Window): { start: number; end: number } {
  if (typeof w === "object") return w;
  const end = Date.now();
  return { start: end - periodToMs(w), end };
}

async function txnsInPeriod(w: Window) {
  const { start, end } = windowBounds(w);
  // Single-pass over all transactions — O(T) instead of O(U × T/U).
  return (await db.txn.listAll()).filter((t) => {
    const ts = new Date(t.createdAt).getTime();
    return ts >= start && ts < end;
  });
}

/**
 * GGR = Stakes − Payouts (the operator's commission from the pool). This is the
 * normative definition shared with the reports console — delegates to
 * `report-money.moneyForWindow` so every admin surface shows ONE GGR figure.
 * (Previously this returned Stakes/turnover only, mislabelled "GGR"; reconciled.)
 */
export async function grossGamingRevenue(period: Window = "today") {
  const { start, end } = windowBounds(period);
  return (await moneyForWindow(start, end)).ggr;
}

/**
 * NGR = GGR − bonus cost − payment-processing fees — the pre-tax operator bottom
 * line. Delegates to the same `report-money` core as GGR so the definitions can
 * never drift. (Previously this returned Stakes − Payouts, i.e. the value that is
 * actually GGR; reconciled to the normative NGR.)
 */
export async function netGamingRevenue(period: Window = "today") {
  const { start, end } = windowBounds(period);
  return (await moneyForWindow(start, end)).ngr;
}

export type PollFeeRow = {
  marketId: string;
  title: string;
  settledAt: string;
  outcome: "YES" | "NO";
  feeModel: FeeModel;
  pool: number;
  fee: number;
  operatorNet: number;
};
export type SettlementFeesByPoll = {
  rows: PollFeeRow[];
  byModel: Record<FeeModel, { count: number; fee: number }>;
  totalFee: number;
};

/**
 * Per-poll settlement commission for the period, WITH the fee model each poll used
 * — so an accountant can see, poll by poll, whether it was `loser-share` (a % of the
 * losing side) or `capped-commission`, and reconcile the fee. The fee is recomputed
 * from the poll's OWN frozen snapshot + declared outcome via `poolFee` — the exact
 * function and inputs settlement used, so it equals the booked commission to the
 * shilling. Read-only; moves no money. Only YES/NO settlements bear a fee (VOID /
 * one-sided are full refunds at 0 fee and are omitted).
 */
export async function settlementFeesByPoll(period: Window = "28d"): Promise<SettlementFeesByPoll> {
  const { start, end } = windowBounds(period);
  const markets = await listMarkets({ status: "RESOLVED" }).catch(() => []);
  const rows: PollFeeRow[] = [];
  const byModel: Record<FeeModel, { count: number; fee: number }> = {
    "loser-share": { count: 0, fee: 0 },
    "capped-commission": { count: 0, fee: 0 },
  };
  for (const m of markets) {
    if (!m.settledAt) continue; // adjudicated but not yet settled → no fee booked
    const ts = new Date(m.settledAt).getTime();
    if (ts < start || ts >= end) continue;
    if (m.resolvedOutcome !== "YES" && m.resolvedOutcome !== "NO") continue; // VOID = refund, 0 fee
    const rates = ratesFor(m);
    const fb = poolFee(m.yesPool, m.noPool, rates, m.resolvedOutcome);
    const fee = Math.round(fb.fee);
    const { operatorNet } = levySplit(fee, rates);
    const model = rates.feeModel;
    rows.push({
      marketId: m.id,
      title: m.titleEn,
      settledAt: m.settledAt,
      outcome: m.resolvedOutcome,
      feeModel: model,
      pool: m.yesPool + m.noPool,
      fee,
      operatorNet,
    });
    byModel[model].count += 1;
    byModel[model].fee += fee;
  }
  rows.sort((a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime());
  return { rows, byModel, totalFee: rows.reduce((s, r) => s + r.fee, 0) };
}

export async function depositsTotal(period: Window = "today") {
  const ts = (await txnsInPeriod(period)).filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED");
  return { amount: ts.reduce((s, t) => s + t.amount, 0), count: ts.length };
}

export async function withdrawalsTotal(period: Window = "today") {
  const ts = (await txnsInPeriod(period)).filter((t) => t.type === "WITHDRAWAL" && t.status === "CONFIRMED");
  return { amount: ts.reduce((s, t) => s + Math.abs(t.amount), 0), count: ts.length };
}

/** Per-provider deposit/withdrawal totals with fees + net. */
export async function providerSummary(period: Window = "today") {
  const ts = await txnsInPeriod(period);
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
export async function activePlayers(period: Period = "today") {
  const ts = await txnsInPeriod(period);
  return new Set(ts.map((t) => t.userId)).size;
}

/** Real money owed to players = spendable balance PLUS funds on hold (in-flight
 *  and AML-held withdrawals). Held funds are still the operator's liability until
 *  they actually leave the platform, so excluding them understated the regulator-
 *  facing "wallet liability" figure. Bonus balances are non-withdrawable and so
 *  are tracked separately, not here. Single-pass over wallets. */
export async function walletLiabilityTotal() {
  let total = 0;
  for (const w of await db.wallet.listAll()) {
    if (w.status === "ACTIVE") total += w.balance + (w.hold ?? 0);
  }
  return total;
}

/**
 * KYC funnel — count of users at each step.
 * registered → started → pending → approved.
 */
export async function kycFunnel() {
  const users = await db.user.list();
  const registered = users.length;
  let started = 0;
  let pending = 0;
  let approved = 0;
  for (const u of users) {
    const k = await db.kyc.findByUserId(u.id);
    if (!k || k.status === "NOT_STARTED") continue;
    started++;
    if (k.status === "PENDING_REVIEW") pending++;
    else if (k.status === "APPROVED") approved++;
  }
  return { registered, started, pending, approved };
}

/** Self-exclusion + cooling-off counts (currently active). */
export async function rgRosterCounts() {
  const now = Date.now();
  const oneWeek = now + 7 * 24 * 3600_000;
  let selfExcluded = 0;
  let cooledOff = 0;
  let expiringThisWeek = 0;
  let pendingLimitIncrease = 0;
  for (const u of await db.user.list()) {
    const r = await db.responsible.get(u.id);
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
export async function amlStats(period: Period = "7d") {
  const pending = (await db.txn.listByStatus("AML_REVIEW")).length;
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
export async function userStatusCounts() {
  const all = await db.user.list();
  return all.reduce(
    (acc, u) => {
      acc[u.status] = (acc[u.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<StoredUser["status"], number>,
  );
}

/** Top-N players by lifetime GROSS gaming margin (stakes − payouts), anonymised.
 *  NOTE: this is per-user GROSS margin, NOT full NGR — it excludes bonus cost,
 *  fees and refunds, which are not attributable per player. The `ngr` field name
 *  is kept for its single consumer (finance "Top-10 player concentration", which
 *  is NOT labelled NGR in the UI); read it as "gross margin contribution".
 *  Single-pass over all transactions, grouped by userId. */
export async function topNgrContributors(n = 10) {
  const map = new Map<string, { stakes: number; payouts: number }>();
  for (const t of await db.txn.listAll()) {
    if (t.status !== "CONFIRMED") continue;
    const isStake = t.type === "BET_PLACED";
    const isPayout = t.type === "BET_PAYOUT" || t.type === "CASHOUT";
    if (!isStake && !isPayout) continue;
    const e = map.get(t.userId) ?? { stakes: 0, payouts: 0 };
    if (isStake) e.stakes += Math.abs(t.amount);
    else e.payouts += Math.abs(t.amount);
    map.set(t.userId, e);
  }
  const out: Array<{ userId: string; lifetimeStakes: number; lifetimePayouts: number; ngr: number }> = [];
  for (const [userId, e] of map) {
    out.push({ userId, lifetimeStakes: e.stakes, lifetimePayouts: e.payouts, ngr: e.stakes - e.payouts });
  }
  return out.sort((a, b) => b.ngr - a.ngr).slice(0, n);
}

/** Operator margin = hold % over the period. Delegates to the CANONICAL
 *  report-money summary so it EQUALS the GGR shown beside it on /admin/finance:
 *  holdPct = (stakes − payouts − refunds) / stakes. (Previously it omitted
 *  refunds, so a voided/one-sided poll made this tile disagree with GGR — a
 *  figure that couldn't be reconciled to the canonical source.) */
export async function operatorMarginPct(period: Period = "28d") {
  const end = Date.now();
  const { holdPct } = await moneyForWindow(end - periodToMs(period), end);
  return holdPct;
}

/** Withdrawals over the AML threshold (1M TZS) — count + total. */
export async function amlThresholdBreaches(period: Period = "7d") {
  const ts = (await txnsInPeriod(period)).filter((t) => t.type === "WITHDRAWAL" && Math.abs(t.amount) >= 1_000_000);
  return { count: ts.length, total: ts.reduce((s, t) => s + Math.abs(t.amount), 0) };
}

/**
 * Time-bucketed series for charting. Returns evenly-spaced buckets covering
 * the period. Each bucket has the net flow (deposits + bets stake) − (payouts +
 * cashouts + withdrawals). Useful for the money-flow area chart.
 */
export async function moneyFlowSeries(period: Period = "today", buckets = 24) {
  const totalMs = periodToMs(period);
  const now = Date.now();
  const bucketMs = totalMs / buckets;
  const ts = await txnsInPeriod(period);
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
 * Operator margin over time (per bucket). Margin = hold % using the SAME
 * definition as the canonical report-money summary (report-money.ts `summarise`):
 * holdPct = (stakes − payouts − refunds) / stakes × 100. Refunds MUST net out or
 * a bucket containing a voided/one-sided poll overstates margin and the chart
 * disagrees with the GGR line + the scalar margin tile.
 */
export async function marginSeries(period: Period = "28d", buckets = 28) {
  const totalMs = periodToMs(period);
  const now = Date.now();
  const bucketMs = totalMs / buckets;
  const ts = await txnsInPeriod(period);
  const out: Array<{ x: number; y: number; label: string }> = [];
  for (let i = 0; i < buckets; i++) {
    const bucketStart = now - totalMs + i * bucketMs;
    const bucketEnd = bucketStart + bucketMs;
    let stakes = 0;
    let payouts = 0;
    let refunds = 0;
    for (const t of ts) {
      const at = new Date(t.createdAt).getTime();
      if (at < bucketStart || at >= bucketEnd) continue;
      if (t.status !== "CONFIRMED") continue;
      if (t.type === "BET_PLACED") stakes += Math.abs(t.amount);
      else if (t.type === "BET_PAYOUT" || t.type === "CASHOUT") payouts += Math.abs(t.amount);
      else if (t.type === "BET_REFUND") refunds += Math.abs(t.amount);
    }
    const margin = stakes === 0 ? 0 : ((stakes - payouts - refunds) / stakes) * 100;
    const d = new Date(bucketStart);
    out.push({ x: i, y: margin, label: `${d.getDate()}/${d.getMonth() + 1}` });
  }
  return out;
}

/** Per-day provider deposit volume — for the stacked-bar provider chart. */
export async function providerStackedSeries(period: Period = "28d", buckets = 14) {
  const totalMs = periodToMs(period);
  const now = Date.now();
  const bucketMs = totalMs / buckets;
  const ts = (await txnsInPeriod(period)).filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED");
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

export async function listProvidersInPeriod(period: Period = "28d") {
  return Array.from(new Set((await txnsInPeriod(period)).map((t) => t.provider ?? "OTHER").filter((p) => p !== "INTERNAL"))).slice(0, 5);
}

/**
 * Suspicious-bet pattern detector.
 *
 * Flags any BET_PLACED in the last 7 days whose stake is more than `multiple`
 * times the user's 30-day median stake (default 10×). Also flags users whose
 * 24-hour stake count exceeds `velocityThreshold` (default 100 — possible
 * automated activity).
 *
 * Aligns with FATF Recommendation 10 (CDD ongoing monitoring) + Tanzania POCA
 * Cap 423 §16 (suspicious activity reporting). Output feeds /admin/aml so a
 * compliance officer can investigate before a SAR window closes.
 */
export type SuspiciousFlag = {
  userId: string;
  txnId: string;
  positionId: string | null;
  type: "STAKE_SPIKE" | "VELOCITY";
  detectedAt: string;
  detail: string;
  stake: number;
  median: number;
  multiple: number;
};

/** Single-pass suspicious-bet detection — groups by userId first, then analyses. */
export async function detectSuspiciousBets(opts: { multiple?: number; velocityThreshold?: number } = {}) {
  const multiple = opts.multiple ?? 10;
  const velocityThreshold = opts.velocityThreshold ?? 100;
  const now = Date.now();
  const recentCutoff = now - 7 * 24 * 3600_000;
  const baselineCutoff = now - 30 * 24 * 3600_000;

  // Single-pass: group confirmed BET_PLACED txns by userId.
  const byUser = new Map<string, StoredTxn[]>();
  for (const t of await db.txn.listAll()) {
    if (t.type !== "BET_PLACED" || t.status !== "CONFIRMED") continue;
    const arr = byUser.get(t.userId) ?? [];
    arr.push(t);
    byUser.set(t.userId, arr);
  }

  const flags: SuspiciousFlag[] = [];
  for (const [userId, userTxns] of byUser) {
    const baseline = userTxns
      .filter((t) => new Date(t.createdAt).getTime() >= baselineCutoff)
      .map((t) => Math.abs(t.amount))
      .sort((a, b) => a - b);
    if (baseline.length < 3) continue;
    const median = baseline[Math.floor(baseline.length / 2)] || 1;
    for (const t of userTxns) {
      const at = new Date(t.createdAt).getTime();
      if (at < recentCutoff) continue;
      const stake = Math.abs(t.amount);
      const ratio = stake / median;
      if (ratio >= multiple) {
        flags.push({
          userId,
          txnId: t.id,
          positionId: t.positionId ?? null,
          type: "STAKE_SPIKE",
          detectedAt: new Date().toISOString(),
          detail: `Stake ${stake.toLocaleString()} is ${ratio.toFixed(1)}× the 30-day median of ${median.toLocaleString()}`,
          stake,
          median,
          multiple: Math.round(ratio * 10) / 10,
        });
      }
    }

    const last24h = userTxns.filter((t) => new Date(t.createdAt).getTime() >= now - 24 * 3600_000);
    if (last24h.length >= velocityThreshold) {
      flags.push({
        userId,
        txnId: last24h[0].id,
        positionId: last24h[0].positionId ?? null,
        type: "VELOCITY",
        detectedAt: new Date().toISOString(),
        detail: `${last24h.length} bets in the last 24h (threshold ${velocityThreshold})`,
        stake: last24h.reduce((s, t) => s + Math.abs(t.amount), 0),
        median,
        multiple: Math.round((last24h.length / Math.max(1, velocityThreshold)) * 10) / 10,
      });
    }
  }
  return flags.sort((a, b) => b.multiple - a.multiple);
}
