/**
 * Market history — implied-YES-probability + volume snapshots over time.
 *
 * A snapshot is recorded on every price-moving event (a buyPosition or a
 * resolveMarket). The PriceChart on /markets/[id] reads this series.
 *
 * Capped per-market at MAX_POINTS. Older points get evicted FIFO.
 *
 * DAL pattern: all exported functions are async and routed through a
 * HistoryStore interface. With a database available, history is durable in the
 * MarketSnapshot table; without one (tests, local no-DB runs) it falls back to
 * an in-memory Map.
 *
 * ── Why this file is the way it is ─────────────────────────────────────────
 * History used to be in-memory on BOTH paths — the "Prisma" store was a
 * verbatim copy of the memory one behind four TODOs. Since every push to main
 * is a live deploy, that Map was wiped several times a week, so every chart
 * went empty; and an empty chart triggered `seedHistory()`, which fabricated a
 * synthetic random walk and rendered it to real-money bettors as real history.
 * That broke the A-5 no-fabrication rule the MarketCard cites and obeys (it
 * hides the sparkline below 4 REAL points — which is exactly why the card was
 * blank while the detail chart showed a confident curve).
 *
 * seedHistory is deleted. A market with no bets now has an empty chart, and
 * that is the correct, honest rendering. Do not reintroduce a fallback that
 * invents points.
 *
 * ── Invariant: the write path must never reject ────────────────────────────
 * recordSnapshot is called fire-and-forget (no await, no .catch) from six
 * places in market-service.ts, on the bet and settlement paths. An unhandled
 * rejection takes the Node process down, so every store WRITE swallows and
 * logs its own errors. A lost chart point is a cosmetic loss; a crashed
 * container mid-bet is not. Reads may throw — every caller already guards.
 */
import { prisma, hasDatabase } from "./prisma";

/** Prisma Decimal | number → number. Chart values are display-only. */
function num(d: unknown): number {
  if (d == null) return 0;
  return Number(d);
}

export type MarketSnapshot = {
  /** ISO timestamp */
  t: string;
  /** Implied YES probability 0..1 (NOT 0..100 — matches kit PriceChart shape) */
  yes: number;
  /** Pool sizes for context */
  yesPool: number;
  noPool: number;
  /** Total volume so far at the moment of snapshot */
  volume: number;
};

const MAX_POINTS = 800;

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MARKET_HISTORY: Map<string, MarketSnapshot[]> | undefined;
}

const history: Map<string, MarketSnapshot[]> =
  globalThis.__50PICK_MARKET_HISTORY ?? (globalThis.__50PICK_MARKET_HISTORY = new Map());

// ---------------------------------------------------------------------------
// HistoryStore interface — async so that Prisma-backed impls can be swapped in
// ---------------------------------------------------------------------------

interface HistoryStore {
  /** Oldest-first, capped at MAX_POINTS. May throw; callers already guard. */
  get(marketId: string): Promise<MarketSnapshot[]>;
  /** MUST NOT reject — see the header note on fire-and-forget callers. */
  append(marketId: string, snap: MarketSnapshot): Promise<void>;
  hasHistory(marketId: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Memory implementation — wraps the existing globalThis Map
// ---------------------------------------------------------------------------

const memoryStore: HistoryStore = {
  async get(marketId) {
    return history.get(marketId) ?? [];
  },
  async append(marketId, snap) {
    const arr = history.get(marketId) ?? [];
    arr.push(snap);
    if (arr.length > MAX_POINTS) arr.splice(0, arr.length - MAX_POINTS);
    history.set(marketId, arr);
  },
  async hasHistory(marketId) {
    return (history.get(marketId)?.length ?? 0) > 0;
  },
};

// ---------------------------------------------------------------------------
// Prisma implementation — durable, backed by the MarketSnapshot table.
// ---------------------------------------------------------------------------

/** How often an append also prunes. Pruning on every write would double the
 *  cost of the hottest write on the platform; 1-in-N keeps the table bounded
 *  at ~MAX_POINTS + N without paying for it on the bet path. */
const PRUNE_EVERY = 50;

const prismaStore: HistoryStore = {
  async get(marketId) {
    const db = prisma();
    if (!db) return [];
    // Newest-first so the index serves the LIMIT, then reversed — every
    // consumer (chart, sparkline, move24h) wants oldest-first. `take` bounds
    // the read no matter how large the table grows.
    const rows = await db.marketSnapshot.findMany({
      where: { marketId },
      orderBy: { t: "desc" },
      take: MAX_POINTS,
      select: { t: true, yes: true, yesPool: true, noPool: true, volume: true },
    });
    return rows.reverse().map((r) => ({
      t: r.t.toISOString(),
      yes: r.yes,
      yesPool: num(r.yesPool),
      noPool: num(r.noPool),
      volume: num(r.volume),
    }));
  },

  async append(marketId, snap) {
    const db = prisma();
    if (!db) return;
    try {
      await db.marketSnapshot.create({
        data: {
          marketId,
          t: new Date(snap.t),
          yes: snap.yes,
          yesPool: snap.yesPool,
          noPool: snap.noPool,
          volume: snap.volume,
        },
      });
      if (Math.random() < 1 / PRUNE_EVERY) await pruneHistory(marketId);
    } catch (err) {
      // Swallowed by contract — see the header. A market that was deleted, or a
      // transient DB blip, must never surface as an unhandled rejection on the
      // bet path.
      console.error("[market-history] snapshot append failed", { marketId, err });
    }
  },

  async hasHistory(marketId) {
    const db = prisma();
    if (!db) return false;
    return !!(await db.marketSnapshot.findFirst({ where: { marketId }, select: { id: true } }));
  },
};

/** FIFO retention: drop everything older than the newest MAX_POINTS points.
 *  Never throws — it is only ever called from inside append's try block, but it
 *  guards independently so a future caller cannot break the write contract. */
async function pruneHistory(marketId: string): Promise<void> {
  const db = prisma();
  if (!db) return;
  try {
    const [cutoff] = await db.marketSnapshot.findMany({
      where: { marketId },
      orderBy: { t: "desc" },
      skip: MAX_POINTS,
      take: 1,
      select: { t: true },
    });
    if (!cutoff) return;
    await db.marketSnapshot.deleteMany({ where: { marketId, t: { lte: cutoff.t } } });
  } catch (err) {
    console.error("[market-history] prune failed", { marketId, err });
  }
}

// ---------------------------------------------------------------------------
// Feature-flag switch
// ---------------------------------------------------------------------------

const USE_PRISMA = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";
const store: HistoryStore = USE_PRISMA ? prismaStore : memoryStore;

// ---------------------------------------------------------------------------
// Exported functions — all async, delegate to store
// ---------------------------------------------------------------------------

/** Record a price point. Never rejects — callers are fire-and-forget on the bet
 *  and settlement paths, where an unhandled rejection would kill the process. */
export async function recordSnapshot(marketId: string, yesPool: number, noPool: number): Promise<void> {
  try {
    const total = yesPool + noPool;
    const snap: MarketSnapshot = {
      t: new Date().toISOString(),
      yes: total > 0 ? yesPool / total : 0.5,
      yesPool,
      noPool,
      volume: total,
    };
    await store.append(marketId, snap);
  } catch (err) {
    console.error("[market-history] recordSnapshot failed", { marketId, err });
  }
}

export async function getHistory(marketId: string): Promise<MarketSnapshot[]> {
  return store.get(marketId);
}

/** Compress the raw history to roughly N points spread evenly across time
 *  so the PriceChart stays readable at any scale. Always includes the first
 *  + last actual snapshots so the line lands on the real current value. */
export async function getCompressedHistory(marketId: string, targetPoints = 24): Promise<MarketSnapshot[]> {
  const all = await store.get(marketId);
  if (all.length === 0) return [];
  if (all.length <= targetPoints) return all.slice();

  // Bucket by index — even-step downsample.
  const out: MarketSnapshot[] = [];
  const step = (all.length - 1) / (targetPoints - 1);
  for (let i = 0; i < targetPoints; i++) {
    out.push(all[Math.round(i * step)]);
  }
  return out;
}

/**
 * ⛔ `seedHistory()` USED TO LIVE HERE AND HAS BEEN DELETED. DO NOT REINTRODUCE IT.
 *
 * It generated a synthetic random walk (a seeded LCG) landing on the market's
 * current YES probability, and `/markets/[id]` called it on every render. With
 * history in a process-local Map that was wiped on each deploy, it fired for
 * EVERY market, not the "legacy demo markets" its comment claimed — so real
 * players saw invented price history on a licensed real-money platform.
 *
 * A market with too little history renders an EMPTY chart. That is correct.
 * `getProbabilityChart` returns no ranges below 2 points and `getCardChart`
 * returns an empty spark, both by design (A-5 no-fabrication).
 */

// ── Chart data for the signature ProbabilityChart + card sparkline ──────────

export type ProbRange = "1D" | "1W" | "1M" | "ALL";
const RANGE_WINDOWS: { id: ProbRange; ms: number | null }[] = [
  { id: "1D", ms: 24 * 3600_000 },
  { id: "1W", ms: 7 * 24 * 3600_000 },
  { id: "1M", ms: 30 * 24 * 3600_000 },
  { id: "ALL", ms: null },
];

function compress<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr.slice();
  const out: T[] = [];
  const step = (arr.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

function labelFor(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Full detail chart: a range-keyed series of {t,p} (p in 0..100). Only includes
 *  ranges that actually have ≥2 points, so the chart never shows a fake window. */
export async function getProbabilityChart(marketId: string): Promise<{
  series: Partial<Record<ProbRange, { t: string; p: number }[]>>;
  ranges: ProbRange[];
}> {
  const all = await getHistory(marketId);
  if (all.length < 2) return { series: {}, ranges: [] };
  const now = Date.now();
  const series: Partial<Record<ProbRange, { t: string; p: number }[]>> = {};
  const ranges: ProbRange[] = [];
  for (const w of RANGE_WINDOWS) {
    const slice = w.ms == null ? all : all.filter((s) => now - Date.parse(s.t) <= w.ms!);
    if (slice.length < 2) continue;
    const pts = compress(slice, 24).map((s) => ({ t: labelFor(s.t), p: Math.round(s.yes * 100) }));
    pts[pts.length - 1] = { ...pts[pts.length - 1], t: "now" };
    series[w.id] = pts;
    ranges.push(w.id);
  }
  return { series, ranges };
}

/** Lightweight card data: a short yes% sparkline series + the 24h move (points).
 *  move24h is undefined when there isn't enough history to compute it. */
export async function getCardChart(marketId: string): Promise<CardChart> {
  return cardChartFrom(await getHistory(marketId));
}

type CardChart = { spark: number[]; move24h?: number };
const EMPTY_CARD: CardChart = { spark: [] };

/** Shared by the single and batched readers so a card can never disagree with
 *  itself depending on which path rendered it. */
function cardChartFrom(points: { t: string; yes: number }[]): CardChart {
  if (points.length < 2) return EMPTY_CARD;
  const spark = compress(points, 16).map((s) => Math.round(s.yes * 100));
  const now = Date.now();
  const dayAgo = points.find((s) => now - Date.parse(s.t) <= 24 * 3600_000) ?? points[0];
  const cur = Math.round(points[points.length - 1].yes * 100);
  return { spark, move24h: cur - Math.round(dayAgo.yes * 100) };
}

/** A card only ever needs enough history to draw 16 points and a 24h delta, so
 *  the batched read is bounded by TIME rather than by count. Wider than 24h so a
 *  quiet market still shows shape rather than flattening to nothing. */
const CARD_WINDOW_MS = 7 * 24 * 3600_000;

/**
 * Card charts for a whole board in ONE query.
 *
 * Every board (`/`, `/markets`, `/results`) renders N cards, and calling
 * `getCardChart` per card meant N round trips each pulling up to MAX_POINTS
 * rows — 800 rows fetched to draw a 16-point sparkline, N times per render, on
 * the hottest routes in the product. Always prefer this over mapping
 * `getCardChart` across a list.
 */
export async function getCardCharts(marketIds: string[]): Promise<Map<string, CardChart>> {
  const out = new Map<string, CardChart>();
  if (marketIds.length === 0) return out;

  const db = prisma();
  if (!db) {
    // No database (tests, local no-DB runs) — the memory Map has no per-query
    // cost, so the simple path is correct here.
    for (const id of marketIds) out.set(id, cardChartFrom(await getHistory(id)));
    return out;
  }

  try {
    const rows = await db.marketSnapshot.findMany({
      where: { marketId: { in: marketIds }, t: { gte: new Date(Date.now() - CARD_WINDOW_MS) } },
      orderBy: { t: "asc" },
      select: { marketId: true, t: true, yes: true },
    });
    const grouped = new Map<string, { t: string; yes: number }[]>();
    for (const r of rows) {
      const arr = grouped.get(r.marketId);
      const pt = { t: r.t.toISOString(), yes: r.yes };
      if (arr) arr.push(pt);
      else grouped.set(r.marketId, [pt]);
    }
    for (const id of marketIds) out.set(id, cardChartFrom(grouped.get(id) ?? []));
  } catch (err) {
    // A board must still render without its sparklines.
    console.error("[market-history] batched card charts failed", err);
    for (const id of marketIds) out.set(id, EMPTY_CARD);
  }
  return out;
}
