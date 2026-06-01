/**
 * Market history — implied-YES-probability + volume snapshots over time.
 *
 * A snapshot is recorded on every price-moving event (a buyPosition or a
 * resolveMarket). The PriceChart on /markets/[id] reads this series.
 *
 * Capped per-market at MAX_POINTS (~14 days of activity at the kind of
 * volumes we see in demo). Older points get evicted FIFO.
 *
 * Persists across hot-reloads via globalThis.__50PICK_MARKET_HISTORY,
 * same backup pattern as the audit ring + market store.
 */

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

export function recordSnapshot(marketId: string, yesPool: number, noPool: number) {
  const total = yesPool + noPool;
  const snap: MarketSnapshot = {
    t: new Date().toISOString(),
    yes: total > 0 ? yesPool / total : 0.5,
    yesPool,
    noPool,
    volume: total,
  };
  const arr = history.get(marketId) ?? [];
  arr.push(snap);
  if (arr.length > MAX_POINTS) arr.splice(0, arr.length - MAX_POINTS);
  history.set(marketId, arr);
}

export function getHistory(marketId: string): MarketSnapshot[] {
  return history.get(marketId) ?? [];
}

/** Compress the raw history to roughly N points spread evenly across time
 *  so the PriceChart stays readable at any scale. Always includes the first
 *  + last actual snapshots so the line lands on the real current value. */
export function getCompressedHistory(marketId: string, targetPoints = 24): MarketSnapshot[] {
  const all = history.get(marketId) ?? [];
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
 * Seed a believable history for a freshly-created demo market so the chart
 * isn't visibly empty on first paint. Generates a smooth random walk landing
 * on the current YES probability. Idempotent — only seeds if no history yet.
 */
export function seedHistory(marketId: string, currentYesPool: number, currentNoPool: number, points = 16) {
  if ((history.get(marketId)?.length ?? 0) > 0) return;
  const total = currentYesPool + currentNoPool;
  const endYes = total > 0 ? currentYesPool / total : 0.5;
  const startYes = Math.max(0.10, Math.min(0.90, endYes + (Math.cos(marketId.length) * 0.18)));
  const startedAt = Date.now() - points * 60_000;
  // Deterministic hash → noise floor
  let h = 0;
  for (let i = 0; i < marketId.length; i++) h = (h * 31 + marketId.charCodeAt(i)) >>> 0;

  const snaps: MarketSnapshot[] = [];
  for (let i = 0; i < points; i++) {
    const k = i / Math.max(1, points - 1);
    h = (h * 1103515245 + 12345) >>> 0;
    const noise = ((h % 1000) / 1000 - 0.5) * 0.05;
    const yes = Math.max(0.05, Math.min(0.95, startYes + (endYes - startYes) * k + noise));
    const v = Math.round(total * (0.2 + 0.8 * k));
    const yesPool = Math.round(v * yes);
    const noPool  = v - yesPool;
    snaps.push({
      t: new Date(startedAt + i * 60_000).toISOString(),
      yes,
      yesPool,
      noPool,
      volume: v,
    });
  }
  history.set(marketId, snaps);
}

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
export function getProbabilityChart(marketId: string): {
  series: Partial<Record<ProbRange, { t: string; p: number }[]>>;
  ranges: ProbRange[];
} {
  const all = getHistory(marketId);
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
export function getCardChart(marketId: string): { spark: number[]; move24h?: number } {
  const all = getHistory(marketId);
  if (all.length < 2) return { spark: [] };
  const spark = compress(all, 16).map((s) => Math.round(s.yes * 100));
  const now = Date.now();
  const dayAgo = all.find((s) => now - Date.parse(s.t) <= 24 * 3600_000) ?? all[0];
  const cur = Math.round(all[all.length - 1].yes * 100);
  return { spark, move24h: cur - Math.round(dayAgo.yes * 100) };
}
