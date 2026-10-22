import { formatEatDate } from "../eat-day";

/** A terminal card may name a settlement day only after money actually moved. */
export function marketCardSettledDate(
  settledAt: string | null | undefined,
  nowMs: number | undefined,
  monthsShort: readonly string[],
  locale: "en" | "sw" | "zh",
): string | null {
  if (!settledAt || !Number.isFinite(nowMs)) return null;
  const settledMs = Date.parse(settledAt);
  return Number.isFinite(settledMs) ? formatEatDate(settledMs, nowMs!, monthsShort, locale) : null;
}
