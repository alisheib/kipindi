/**
 * Normative reporting money definitions — the single source of truth for the
 * /admin/reports console (Batch 3 §1). Every figure is derived from REAL
 * confirmed transactions; nothing is fabricated, and an empty store yields
 * honest zeros (the console hides sections that have no rows).
 *
 * Definitions (normative — match the statutory catalogue prose + industry
 * standard; see docs/50pick-admin-reporting-spec.md §1):
 *   Stakes  = Σ|BET_PLACED (CONFIRMED)|                — gross wagered in period
 *   Payouts = Σ|BET_PAYOUT + CASHOUT (CONFIRMED)|      — winner distributions
 *   Refunds = Σ|BET_REFUND (CONFIRMED)|                — voided/one-sided stakes returned
 *   GGR     = Stakes − Payouts − Refunds               — operator commission (= what we KEEP)
 *   Bonus   = Σ|BONUS_CREDIT (CONFIRMED)|              — bonus-wallet cost
 *   Fees    = Σ fee on DEPOSIT + WITHDRAWAL (CONFIRMED)— payment-processing fees
 *   NGR     = GGR − Bonus − Fees                       — bottom line before tax
 *   Hold %  = GGR / Stakes × 100                       — near-constant; drift = alarm
 *
 * ⚠️ GGR nets out REFUNDS (2026-07). A voided or one-sided poll returns every
 * stake and we earn NOTHING on it — but a refunded stake was still counted in
 * `Stakes`, and the refund is a BET_REFUND, not a payout. Without subtracting it,
 * GGR was overstated by the whole refunded amount, and the TRA/GBT levy (which is
 * 15% of GGR = 15% of our commission) was charged on money we never made. Under
 * the capped-fee model one-sided polls are common, so this was a live over-tax.
 * GGR now equals the actual commission we keep, which is the base the ledger
 * already levies TRA/GBT on (levySplit in payout.ts) — so the report and the
 * ledger finally agree, per Ali's decision (tax on what we keep).
 *
 * SINGLE SOURCE OF TRUTH: `analytics.grossGamingRevenue()` / `netGamingRevenue()`
 * now delegate to `moneyForWindow()` below, so /admin/finance, /admin/live, the
 * admin overview and the GBT-monthly statutory report all read GGR = Stakes −
 * Payouts and NGR = GGR − Bonus − Fees from this one module. (Historically the
 * legacy analytics functions returned Stakes/turnover mislabelled "GGR"; that is
 * reconciled — see the batch log entry that flags the changed displayed numbers.)
 */
import { db } from "./store";
import type { StoredTxn } from "./store";
import { listMarkets, listPositionsForMarket } from "./market-service";
import type { MarketCategory } from "./market-service";
import { positionStore, marketStore } from "./market-dal";

export type ReportPeriod = "today" | "7d" | "30d" | "mtd";
export const REPORT_PERIODS: ReportPeriod[] = ["today", "7d", "30d", "mtd"];

export const EAT_OFFSET_MS = 3 * 3600_000; // East Africa Time = UTC+3, no DST.
const DAY_MS = 24 * 3600_000;

/**
 * Midnight EAT (as a UTC epoch ms) of the day containing `ms`.
 *
 * EXPORTED ON PURPOSE — this is the single definition of "a Tanzanian day" for
 * every report. `buildDailyOps` used to derive its own window from
 * `new Date().getFullYear()/getMonth()/getDate()`, which is SERVER-LOCAL; the
 * Railway container runs UTC, so its "day" ran 03:00 → 03:00 EAT. That report
 * computes the TRA and GBT levies, so the tax was assessed on the wrong 24
 * hours, and consecutive daily filings could not be reconciled against the
 * (EAT-correct) monthly pack. Import this — do not re-derive a day anywhere.
 */
export function startOfEatDay(ms: number): number {
  return Math.floor((ms + EAT_OFFSET_MS) / DAY_MS) * DAY_MS - EAT_OFFSET_MS;
}

/** The EAT calendar date (YYYY-MM-DD) containing `ms`. Never use
 *  `toISOString().slice(0,10)` for a player- or regulator-facing date: between
 *  21:00 and 24:00 EAT that prints tomorrow. */
export function eatDateLabel(ms: number): string {
  return new Date(ms + EAT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Midnight EAT of the first day of the month containing `ms`. */
function startOfEatMonth(ms: number): number {
  const d = new Date(ms + EAT_OFFSET_MS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - EAT_OFFSET_MS;
}

/** [start, end] epoch-ms bounds for a report period, anchored to `now`. */
export function periodBounds(period: ReportPeriod, now = Date.now()): { start: number; end: number } {
  switch (period) {
    case "today": return { start: startOfEatDay(now), end: now };
    case "7d":    return { start: now - 7 * DAY_MS, end: now };
    case "30d":   return { start: now - 30 * DAY_MS, end: now };
    case "mtd":   return { start: startOfEatMonth(now), end: now };
  }
}

/** The equal-length window immediately preceding `bounds` — for "vs prior". */
export function priorBounds(bounds: { start: number; end: number }): { start: number; end: number } {
  const len = bounds.end - bounds.start;
  return { start: bounds.start - len, end: bounds.start };
}

export type MoneySummary = {
  stakes: number;
  payouts: number;
  refunds: number;
  ggr: number;
  bonusCost: number;
  fees: number;
  ngr: number;
  holdPct: number;
  deposits: number;
  depositCount: number;
  withdrawals: number;
  withdrawalCount: number;
  activePlayers: number;
};

function within(t: StoredTxn, start: number, end: number): boolean {
  const at = Date.parse(t.createdAt);
  return at >= start && at < end;
}

function summarise(txns: StoredTxn[]): MoneySummary {
  const conf = txns.filter((t) => t.status === "CONFIRMED");
  const stakes = conf.filter((t) => t.type === "BET_PLACED").reduce((s, t) => s + Math.abs(t.amount), 0);
  const payouts = conf.filter((t) => t.type === "BET_PAYOUT" || t.type === "CASHOUT").reduce((s, t) => s + Math.abs(t.amount), 0);
  // Refunds return the whole stake and earn us nothing — they MUST net out of GGR,
  // or a voided/one-sided poll is taxed on money we never kept.
  const refunds = conf.filter((t) => t.type === "BET_REFUND").reduce((s, t) => s + Math.abs(t.amount), 0);
  const bonusCost = conf.filter((t) => t.type === "BONUS_CREDIT").reduce((s, t) => s + Math.abs(t.amount), 0);
  const fees = conf.filter((t) => t.type === "DEPOSIT" || t.type === "WITHDRAWAL").reduce((s, t) => s + (t.fee || 0), 0);
  const deposits = conf.filter((t) => t.type === "DEPOSIT");
  const withdrawals = conf.filter((t) => t.type === "WITHDRAWAL");
  const ggr = stakes - payouts - refunds;
  const ngr = ggr - bonusCost - fees;
  return {
    stakes,
    payouts,
    refunds,
    ggr,
    bonusCost,
    fees,
    ngr,
    holdPct: stakes > 0 ? (ggr / stakes) * 100 : 0,
    deposits: deposits.reduce((s, t) => s + t.amount, 0),
    depositCount: deposits.length,
    withdrawals: withdrawals.reduce((s, t) => s + Math.abs(t.amount), 0),
    withdrawalCount: withdrawals.length,
    // Active = anyone with any txn in the window (bet, deposit, …).
    activePlayers: new Set(txns.map((t) => t.userId)).size,
  };
}

/** Core money summary for an explicit [start, end) window. This is the single
 *  primitive the whole admin surface shares: the reports console (via
 *  `reportSummary`) and the legacy finance/live/overview + GBT-monthly report
 *  (via `analytics.grossGamingRevenue`/`netGamingRevenue`, which now delegate
 *  here). One definition of GGR/NGR everywhere. */
export async function moneyForWindow(start: number, end: number): Promise<MoneySummary> {
  const all = await db.txn.listAll();
  return summarise(all.filter((t) => within(t, start, end)));
}

/** Period summary + the equal-length prior window (for the compare toggle). */
export async function reportSummary(period: ReportPeriod, now = Date.now()): Promise<{
  bounds: { start: number; end: number };
  current: MoneySummary;
  prior: MoneySummary;
}> {
  const bounds = periodBounds(period, now);
  const prior = priorBounds(bounds);
  const all = await db.txn.listAll();
  return {
    bounds,
    current: summarise(all.filter((t) => within(t, bounds.start, bounds.end))),
    prior: summarise(all.filter((t) => within(t, prior.start, prior.end))),
  };
}

// ── Per-game money split (Up & Down vs long-form polls) ──────────────────────
//
// Ali, 2026-07-25: "Up & Down is a game and normal polls are another game completely."
// The money is one ledger, but management must see what EACH game earns. Every bet
// transaction carries `positionId` → Position → market → `productLine`, so the split
// is a join, not a schema change. Only BET-derived money is game-specific
// (stakes / payouts / refunds / GGR); deposits, withdrawals, bonuses and payment fees
// are platform-level and are NOT attributed to a game — they belong to neither.
//
// ⚠️ The combined `MoneySummary`/`summarise` above is UNCHANGED and stays the base for
// every existing reader and the statutory pack — TRA/GBT is levied on TOTAL commission
// across both games. This is additive.

export type GameLine = "MARKET" | "UPDOWN";

export type GameMoney = {
  game: GameLine;
  stakes: number;
  payouts: number;
  refunds: number;
  /** stakes − payouts − refunds — this game's commission (what we keep on it). */
  ggr: number;
  /** ggr / stakes × 100 — this game's hold. */
  holdPct: number;
  /** Count of settled+open BET_PLACED txns attributed to this game in the window. */
  bets: number;
  /** Distinct players who staked on this game in the window. */
  players: number;
};

function emptyGame(game: GameLine): GameMoney {
  return { game, stakes: 0, payouts: 0, refunds: 0, ggr: 0, holdPct: 0, bets: 0, players: 0 };
}

/**
 * The viewer of a report needs money split by GAME. Builds the positionId→productLine
 * map once (join over the position + market stores) and buckets the window's bet txns.
 *
 * SCALE NOTE: like `summarise`/`moneyForWindow` this walks the in-memory stores; at
 * real volume the whole reporting layer wants a SQL GROUP BY (positionId join). That is
 * a platform-wide reporting optimisation, tracked separately — this stays consistent
 * with the existing all-time-scan pattern rather than introducing a lone exception.
 */
export async function moneyByGame(start: number, end: number): Promise<{ market: GameMoney; updown: GameMoney }> {
  const [allTxn, positions, markets] = await Promise.all([
    db.txn.listAll(),
    positionStore.values(),
    marketStore.values(),
  ]);
  const plByMarket = new Map<string, GameLine>(markets.map((m) => [m.id, (m.productLine === "UPDOWN" ? "UPDOWN" : "MARKET")]));
  const plByPosition = new Map<string, GameLine>(positions.map((p) => [p.id, plByMarket.get(p.marketId) ?? "MARKET"]));

  const out: Record<GameLine, GameMoney & { _players: Set<string> }> = {
    MARKET: { ...emptyGame("MARKET"), _players: new Set<string>() },
    UPDOWN: { ...emptyGame("UPDOWN"), _players: new Set<string>() },
  };

  for (const t of allTxn) {
    if (t.status !== "CONFIRMED") continue;
    if (!within(t, start, end)) continue;
    if (!t.positionId) continue; // deposits/withdrawals/bonus have no position → platform-level, not a game
    if (t.type !== "BET_PLACED" && t.type !== "BET_PAYOUT" && t.type !== "CASHOUT" && t.type !== "BET_REFUND") continue;
    const game = plByPosition.get(t.positionId) ?? "MARKET";
    const g = out[game];
    const amt = Math.abs(t.amount);
    if (t.type === "BET_PLACED") { g.stakes += amt; g.bets += 1; g._players.add(t.userId); }
    else if (t.type === "BET_PAYOUT" || t.type === "CASHOUT") g.payouts += amt;
    else if (t.type === "BET_REFUND") g.refunds += amt;
  }

  const finish = (g: GameMoney & { _players: Set<string> }): GameMoney => {
    const ggr = g.stakes - g.payouts - g.refunds;
    return {
      game: g.game, stakes: g.stakes, payouts: g.payouts, refunds: g.refunds,
      ggr, holdPct: g.stakes > 0 ? (ggr / g.stakes) * 100 : 0,
      bets: g.bets, players: g._players.size,
    };
  };
  return { market: finish(out.MARKET), updown: finish(out.UPDOWN) };
}

export type DailyPnlRow = {
  /** EAT day start, epoch ms — stable key. */
  dayMs: number;
  stakes: number;
  payouts: number;
  ggr: number;
  bonus: number;
  fees: number;
  ngr: number;
  holdPct: number;
};

/** One row per EAT calendar day in the period, oldest→newest, + totals.
 *  "today" collapses to a single row; longer periods give the daily P&L grid. */
export async function dailyPnl(period: ReportPeriod, now = Date.now()): Promise<{ rows: DailyPnlRow[]; totals: DailyPnlRow }> {
  const { start, end } = periodBounds(period, now);
  const all = await db.txn.listAll();
  const inWindow = all.filter((t) => within(t, start, end));
  const firstDay = startOfEatDay(start);
  const rows: DailyPnlRow[] = [];
  for (let day = firstDay; day < end; day += DAY_MS) {
    const dayTxns = inWindow.filter((t) => {
      const at = Date.parse(t.createdAt);
      return at >= day && at < day + DAY_MS;
    });
    const m = summarise(dayTxns);
    rows.push({ dayMs: day, stakes: m.stakes, payouts: m.payouts, ggr: m.ggr, bonus: m.bonusCost, fees: m.fees, ngr: m.ngr, holdPct: m.holdPct });
  }
  const t = summarise(inWindow);
  const totals: DailyPnlRow = { dayMs: 0, stakes: t.stakes, payouts: t.payouts, ggr: t.ggr, bonus: t.bonusCost, fees: t.fees, ngr: t.ngr, holdPct: t.holdPct };
  return { rows, totals };
}

export type KpiTrends = { ggr: number[]; ngr: number[]; active: number[] };

/**
 * Per-EAT-day KPI trend for the money-tile sparklines, oldest→newest. Each
 * point is that day's REAL metric via the canonical `summarise()` — the SAME
 * function the scalar GGR/NGR/active read — so a spark can never imply a trend
 * that isn't the tile's own metric (the reason net-flow was rejected as a GGR
 * spark). `active` is the day's distinct-txn-user count = `activePlayers`.
 * Pure read (one `listAll` + in-memory day buckets); mutates nothing.
 *
 * Default "7d" = a 7-point recent daily trend; the money tiles show a "today"/
 * period scalar with this as the recent history leading up to it.
 */
export async function dailyKpiSeries(period: ReportPeriod = "7d", now = Date.now()): Promise<KpiTrends> {
  const { start, end } = periodBounds(period, now);
  const all = await db.txn.listAll();
  const inWindow = all.filter((t) => within(t, start, end));
  const firstDay = startOfEatDay(start);
  const ggr: number[] = [], ngr: number[] = [], active: number[] = [];
  for (let day = firstDay; day < end; day += DAY_MS) {
    const dayTxns = inWindow.filter((t) => {
      const at = Date.parse(t.createdAt);
      return at >= day && at < day + DAY_MS;
    });
    const m = summarise(dayTxns);
    ggr.push(m.ggr);
    ngr.push(m.ngr);
    active.push(m.activePlayers);
  }
  return { ggr, ngr, active };
}

export type CategoryRow = {
  category: MarketCategory;
  stakes: number;
  payouts: number;
  ggr: number;
  sharePct: number; // share of total (positive) GGR
  holdPct: number;
};

/** Share-of-GGR by market category, via positionId → market.category.
 *  In production this is a single GROUP BY join; here we build the lookup map
 *  from the in-memory stores. Categories with no staked activity are omitted. */
export async function categoryBreakdown(period: ReportPeriod, now = Date.now()): Promise<CategoryRow[]> {
  const { start, end } = periodBounds(period, now);
  // positionId → category lookup (market-scoped).
  // MONEY READ → productLine "ALL". This attributes staked volume and fees to a
  // category; excluding Up & Down rounds would drop their entire turnover out of the
  // revenue breakdown while every remaining number still reconciled with itself,
  // which is the worst shape a books defect can take. Guarded by test:product-line.
  const markets = await listMarkets({ productLine: "ALL" });
  const posCat = new Map<string, MarketCategory>();
  for (const m of markets) {
    for (const p of await listPositionsForMarket(m.id)) posCat.set(p.id, m.category);
  }
  const acc = new Map<MarketCategory, { stakes: number; payouts: number }>();
  for (const t of await db.txn.listAll()) {
    if (t.status !== "CONFIRMED" || !t.positionId) continue;
    const isStake = t.type === "BET_PLACED";
    // A refund is payout-like for GGR: it returns a stake we keep nothing from.
    const isPayout = t.type === "BET_PAYOUT" || t.type === "CASHOUT" || t.type === "BET_REFUND";
    if (!isStake && !isPayout) continue;
    if (!within(t, start, end)) continue;
    const cat = posCat.get(t.positionId);
    if (!cat) continue;
    const e = acc.get(cat) ?? { stakes: 0, payouts: 0 };
    if (isStake) e.stakes += Math.abs(t.amount);
    else e.payouts += Math.abs(t.amount);
    acc.set(cat, e);
  }
  const rows: CategoryRow[] = [];
  for (const [category, e] of acc) {
    rows.push({ category, stakes: e.stakes, payouts: e.payouts, ggr: e.stakes - e.payouts, sharePct: 0, holdPct: e.stakes > 0 ? ((e.stakes - e.payouts) / e.stakes) * 100 : 0 });
  }
  const totalPositiveGgr = rows.reduce((s, r) => s + Math.max(0, r.ggr), 0) || 1;
  for (const r of rows) r.sharePct = (Math.max(0, r.ggr) / totalPositiveGgr) * 100;
  return rows.sort((a, b) => b.ggr - a.ggr);
}
