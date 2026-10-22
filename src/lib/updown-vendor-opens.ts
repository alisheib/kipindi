/** The price at a minute label is that minute bar's OPEN, the settlement rule. */
import { ALLOWED_DURATIONS, MINUTE_MS, roundSpanMinutes } from "./updown-durations";

export type OpenPoint = { t: number; price: number | null };
/** A read the platform has already confirmed. Its provider time identifies the
 * vendor minute bar; the round boundary may be later and must not be substituted. */
export type ConfirmedPricePin = { quotedAt: string | null; price: number | null };
export type VendorOpenCandle = { t: number; o: number };

export const ROUND_LINE_RANGE = "1H" as const;
/** The 60-minute choice runs 72 minutes including its result phase. Four more
 * minutes retain the deciding bar while it publishes after the close. The
 * vendor fetch still has one shared 1-minute range per asset; only the card's
 * displayed window is longer than the chart's labelled 1H window. */
export const ROUND_LINE_WINDOW_MS = Math.max(...ALLOWED_DURATIONS.map(roundSpanMinutes)) * MINUTE_MS + 4 * MINUTE_MS;
export const ROUND_LINE_OUTPUT_BARS = ROUND_LINE_WINDOW_MS / MINUTE_MS + 1;

/** A live line belongs to a bettable or locked round. Once decided, its
 * historical line may remain briefly; waiting for a source has no live line. */
export function shouldDisplayRoundLine(
  state: "open" | "locked" | "closing" | "confirming" | "resolved" | "void",
  opensAtMs: number,
  closesAtMs: number,
  nowMs: number,
  openPrice: number | null,
): boolean {
  if (openPrice == null || !Number.isFinite(openPrice) || openPrice <= 0
    || ![opensAtMs, closesAtMs, nowMs].every(Number.isFinite)
    || closesAtMs <= opensAtMs || nowMs < opensAtMs) return false;
  const active = state === "open" || state === "locked";
  const settled = state === "resolved" || state === "void";
  return (active && nowMs <= closesAtMs)
    || (settled && nowMs - opensAtMs <= ROUND_LINE_WINDOW_MS);
}

export function roundLineHistoryUrl(assetKey: string): string {
  return `/api/updown/history?asset=${encodeURIComponent(assetKey)}&range=${ROUND_LINE_RANGE}&style=line&scope=round`;
}

/** A card can have a later confirmed read even when the vendor history still has
 * only its opening bar. In that case, "no newer price" would contradict the card. */
export function hasLaterConfirmedRead(
  opensAtMs: number, readPrice: number | null, readQuotedAt: string | null,
): boolean {
  const quotedAtMs = readQuotedAt ? Date.parse(readQuotedAt) : Number.NaN;
  return readPrice != null && Number.isFinite(readPrice) && readPrice > 0
    && Number.isFinite(quotedAtMs) && quotedAtMs > opensAtMs;
}

export function vendorOpenPoints(
  bars: readonly { t: number; o: number }[],
  intervalMs: number,
  decimals: number,
): OpenPoint[] {
  const points: OpenPoint[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i > 0) {
      for (let t = bars[i - 1].t + intervalMs; t < bars[i].t; t += intervalMs) {
        points.push({ t, price: null });
      }
    }
    points.push({ t: bars[i].t, price: Number(bars[i].o.toFixed(decimals)) });
  }
  return points;
}

/** A vendor can revise a historical bar after a round used its OPEN. Keep the
 * immutable confirmed read authoritative: a revised bar becomes a gap, never a
 * second price at the same labelled minute. Missing or unparseable source times
 * cannot identify a bar and do not erase unrelated history. */
export function conflictingVendorOpenTimes(
  bars: readonly VendorOpenCandle[],
  pins: readonly ConfirmedPricePin[],
  decimals: number,
): Set<number> {
  const byTime = new Map(bars.map((bar) => [bar.t, Number(bar.o.toFixed(decimals))]));
  const conflicts = new Set<number>();
  for (const pin of pins) {
    if (pin.quotedAt == null || pin.price == null || !Number.isFinite(pin.price)) continue;
    const at = Date.parse(pin.quotedAt);
    if (!Number.isFinite(at)) continue;
    const vendorOpen = byTime.get(at);
    if (vendorOpen != null && vendorOpen !== Number(pin.price.toFixed(decimals))) conflicts.add(at);
  }
  return conflicts;
}

export function maskConflictingVendorOpens<T extends VendorOpenCandle>(
  series: { mode: "line"; points: readonly OpenPoint[] } | { mode: "candles"; candles: readonly T[]; gaps: readonly number[]; bucketMs: number },
  pins: readonly ConfirmedPricePin[],
  decimals: number,
): { mode: "line"; points: OpenPoint[] } | { mode: "candles"; candles: T[]; gaps: number[]; bucketMs: number } {
  if (series.mode === "line") {
    const conflicts = conflictingVendorOpenTimes(
      series.points.filter((point): point is { t: number; price: number } => point.price != null)
        .map((point) => ({ t: point.t, o: point.price })), pins, decimals);
    return { mode: "line", points: series.points.map((point) =>
      conflicts.has(point.t) ? { t: point.t, price: null } : point) };
  }
  const conflicts = conflictingVendorOpenTimes(series.candles, pins, decimals);
  return {
    mode: "candles", bucketMs: series.bucketMs,
    candles: series.candles.filter((bar) => !conflicts.has(bar.t)),
    gaps: [...new Set([...series.gaps, ...conflicts])].sort((a, b) => a - b),
  };
}

/** Refuse a line without its actual opening bar, or one that differs from the frozen receipt. */
export function roundOpenPoints(
  points: readonly OpenPoint[],
  opensAtMs: number,
  closesAtMs: number,
  nowMs: number,
  openPrice: number,
  decimals: number,
  closePrice: number | null = null,
  read: ConfirmedPricePin | null = null,
): OpenPoint[] | null {
  const end = Math.min(nowMs, closesAtMs);
  if (end < opensAtMs || end - opensAtMs > ROUND_LINE_WINDOW_MS) return null;
  const inRound = points.filter((point) => point.t >= opensAtMs && point.t <= end);
  const first = inRound[0];
  if (!first || first.t !== opensAtMs || first.price !== Number(openPrice.toFixed(decimals))) return null;
  // A settled receipt is immutable. If a later vendor history changes the
  // deciding bar, hide the line instead of drawing a false close beside it.
  if (closePrice != null && (!Number.isFinite(closePrice)
    || inRound.find((point) => point.t === closesAtMs)?.price !== Number(closePrice.toFixed(decimals)))) return null;
  if (read?.price != null && read.quotedAt != null) {
    const quotedAt = Date.parse(read.quotedAt);
    const vendorAtRead = inRound.find((point) => point.t === quotedAt);
    if (vendorAtRead && vendorAtRead.price !== Number(read.price.toFixed(decimals))) return null;
  }
  return inRound;
}
