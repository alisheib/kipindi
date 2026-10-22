import { priceState } from "./price-state";

export const MARKET_SPARK_WINDOW_MS = 7 * 24 * 3600_000;

/** Show a trend label only when its series contains a stroke the chart can draw. */
export function hasDrawableMarketSpark(data: readonly (number | null)[] | undefined): boolean {
  if (!Array.isArray(data)) return false;
  for (let i = 1; i < data.length; i++) {
    if (Number.isFinite(data[i - 1]) && Number.isFinite(data[i])) return true;
  }
  return false;
}

type Snapshot = { t: string; yesPool: number; noPool: number };

/**
 * Sixteen equal moments in the past seven days. A snapshot holds its price until
 * the next real snapshot; a moment before the first known price, or after a
 * one-sided/empty snapshot, stays blank. This never turns event frequency into
 * apparent price movement or invents an opening price for a young market.
 */
export function sampleMarketSpark(
  snapshots: readonly Snapshot[],
  nowMs: number,
  slots = 16,
): (number | null)[] {
  if (!Number.isFinite(nowMs) || slots < 2) return [];
  const start = nowMs - MARKET_SPARK_WINDOW_MS;
  const rows = snapshots
    .map((s) => ({ at: Date.parse(s.t), price: priceState(s.yesPool, s.noPool) }))
    .filter((s) => Number.isFinite(s.at) && s.at >= start && s.at <= nowMs)
    .sort((a, b) => a.at - b.at);
  if (rows.filter((s) => s.price.kind === "priced").length < 4) return [];

  let next = 0;
  let held: number | null = null;
  return Array.from({ length: slots }, (_, i) => {
    const at = start + (i / (slots - 1)) * MARKET_SPARK_WINDOW_MS;
    while (next < rows.length && rows[next].at <= at) {
      const price = rows[next].price;
      held = price.kind === "priced" ? price.yesPct : null;
      next++;
    }
    return held;
  });
}
