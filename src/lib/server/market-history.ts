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
