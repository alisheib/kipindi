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
import { EAT_OFFSET_MS } from "@/lib/eat-day";
import { db } from "./store";
import type { StoredTxn } from "./store";
import { listMarkets, listPositionsForMarket } from "./market-service";
import type { MarketCategory } from "./market-service";
import { positionStore, marketStore } from "./market-dal";

export type ReportPeriod = "today" | "7d" | "30d" | "mtd";
export const REPORT_PERIODS: ReportPeriod[] = ["today", "7d", "30d", "mtd"];

/**
 * East Africa Time = UTC+3, no DST — IMPORTED, never re-declared.
 *
 * ⛔ This module used to write `3 * 3600_000` itself, so the STATUTORY TAX path and
 * `lib/eat-day.ts` (whose header calls itself "the one place the platform decides
 * what a day is" and forbids copying the offset) agreed about the offset only by
 * coincidence. The two literals happened to be equal; nothing made them stay equal,
 * and the report that computes the TRA and GBT levies is the last place that should
 * hold a private opinion about when a Tanzanian day starts. Re-exported because
 * `date-range.ts` and `scripts/date-range.test.mts` already import it from here.
 */
export { EAT_OFFSET_MS };
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
export function startOfEatMonth(ms: number): number {
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

/**
 * A reporting window — either a legacy preset id (dashboards/sparklines) OR an already-
 * resolved `{start,end}` (from `resolveRange`, which supports the full preset set + a
 * custom date+hour+minute range). `boundsOf` normalises either to epoch-ms bounds, so
 * every report function accepts both and custom windows flow through unchanged.
 */
export type Window = ReportPeriod | { start: number; end: number };
export function boundsOf(w: Window, now = Date.now()): { start: number; end: number } {
  return typeof w === "string" ? periodBounds(w, now) : w;
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
  // SQL, not `listAll().filter(within)`. Measured at 1,000 users × 100 transactions:
  // 3,176 ms and 333 MB of heap became 48 ms and ~0 (s13-scale-ceilings.mts). `listInRange`
  // uses the SAME bounds as `within` — >= start, < end — so the totals are unchanged.
  return summarise(await db.txn.listInRange(start, end));
}

/** Period summary + the equal-length prior window (for the compare toggle). */
export async function reportSummary(period: Window, now = Date.now()): Promise<{
  bounds: { start: number; end: number };
  current: MoneySummary;
  prior: MoneySummary;
}> {
  const bounds = boundsOf(period, now);
  const prior = priorBounds(bounds);
  // Two windows, two queries — still far cheaper than one whole-table walk, and the two
  // are adjacent so the index serves both.
  const [cur, prev] = await Promise.all([
    db.txn.listInRange(bounds.start, bounds.end),
    db.txn.listInRange(prior.start, prior.end),
  ]);
  return { bounds, current: summarise(cur), prior: summarise(prev) };
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

/**
 * The two games — plus the honest third bucket for bet money whose game cannot be
 * determined. `UNATTRIBUTED` is NOT a game and must never be presented as one; it exists
 * so the per-game split can DISCLOSE what it does not know instead of guessing.
 */
export type GameLine = "MARKET" | "UPDOWN" | "UNATTRIBUTED";

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
 * 🔴 ATTRIBUTION IS DISCLOSED, NEVER GUESSED (F-03, 2026-08-20).
 * This used to read `plByPosition.get(t.positionId) ?? "MARKET"` — so a bet transaction
 * whose Position row no longer exists was silently counted as long-form MARKET money. That
 * is a regulator-facing number: the per-game GGR split feeds management reporting and the
 * Up & Down economics card. Guessing inside it means the MARKET line overstates itself by
 * an amount nobody can see.
 *
 * Measured on production 2026-08-20: 374 CONFIRMED bet transactions carry a `positionId`
 * that no longer resolves (213 BET_PLACED · 104 BET_REFUND · 57 BET_PAYOUT, 16 players,
 * net −50,494 TZS) — pre-launch reset artifacts. They now land in `unattributed`, printed
 * as its own line. `Combined` still includes them, so the statutory total is unchanged;
 * only the MARKET line stops absorbing money it cannot account for.
 *
 * ⛔ DO NOT "RESCUE" THESE VIA LedgerEntry.marketId. It looks like it should work —
 * LedgerEntry does carry `marketId`, and 317 of the 374 have a ledger row that carries one.
 * Measured with a control: platform-wide, 4,041 of 5,074 ledger `marketId`s resolve to a
 * live market row, so the join itself is sound — but for these 374, **0 resolve**. The same
 * reset deleted the markets. The rescue recovers an id, not a game. Disclosure is the only
 * honest answer.
 *
 * SCALE NOTE (updated 2026-07-31): the transaction side no longer walks the whole table —
 * it asks SQL for the window, like every other function here. The `positionId → productLine`
 * join is still built in memory from the position and market stores. ⚠️ That is no longer
 * cheap: "bounded by markets" was written when markets meant long-form polls, and every
 * Up & Down round is now a market row — 12,931 of them on production 2026-08-20, growing
 * ~360/day. A full SQL GROUP BY over the join is the answer (audit F-07).
 */
export async function moneyByGame(start: number, end: number): Promise<{ market: GameMoney; updown: GameMoney; unattributed: GameMoney }> {
  const [allTxn, positions, markets] = await Promise.all([
    db.txn.listInRange(start, end),
    positionStore.values(),
    marketStore.values(),
  ]);
  const plByMarket = new Map<string, GameLine>(markets.map((m) => [m.id, (m.productLine === "UPDOWN" ? "UPDOWN" : "MARKET")]));
  const plByPosition = new Map<string, GameLine>(positions.map((p) => [p.id, plByMarket.get(p.marketId) ?? "MARKET"]));

  const out: Record<GameLine, GameMoney & { _players: Set<string> }> = {
    MARKET: { ...emptyGame("MARKET"), _players: new Set<string>() },
    UPDOWN: { ...emptyGame("UPDOWN"), _players: new Set<string>() },
    UNATTRIBUTED: { ...emptyGame("UNATTRIBUTED"), _players: new Set<string>() },
  };

  for (const t of allTxn) {
    if (t.status !== "CONFIRMED") continue;
    if (!within(t, start, end)) continue;
    if (!t.positionId) continue; // deposits/withdrawals/bonus have no position → platform-level, not a game
    if (t.type !== "BET_PLACED" && t.type !== "BET_PAYOUT" && t.type !== "CASHOUT" && t.type !== "BET_REFUND") continue;
    // ⛔ NO `?? "MARKET"`. An unresolvable positionId means we do not know the game;
    // saying "MARKET" would put money on a regulator-facing line that cannot support it.
    const game = plByPosition.get(t.positionId) ?? "UNATTRIBUTED";
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
  return { market: finish(out.MARKET), updown: finish(out.UPDOWN), unattributed: finish(out.UNATTRIBUTED) };
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
export async function dailyPnl(period: Window, now = Date.now()): Promise<{ rows: DailyPnlRow[]; totals: DailyPnlRow }> {
  const { start, end } = boundsOf(period, now);
  // The window comes from SQL now; `within` kept only where a per-DAY slice is taken
  // below. Same bounds, so every figure is unchanged — measured 66x faster, 333 MB less.
  const inWindow = await db.txn.listInRange(start, end);
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
export async function dailyKpiSeries(period: Window = "7d", now = Date.now()): Promise<KpiTrends> {
  const { start, end } = boundsOf(period, now);
  // The window comes from SQL now; `within` kept only where a per-DAY slice is taken
  // below. Same bounds, so every figure is unchanged — measured 66x faster, 333 MB less.
  const inWindow = await db.txn.listInRange(start, end);
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
export async function categoryBreakdown(period: Window, now = Date.now()): Promise<CategoryRow[]> {
  const { start, end } = boundsOf(period, now);
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
  // The window is the WHERE clause now; the per-row `within` below is therefore
  // redundant but harmless, and kept so the bounds stay stated at the point of use.
  for (const t of await db.txn.listInRange(start, end)) {
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
