/** Price evidence for the current round card. A newer number needs a timed source read. */
export function cardPriceRead(input: {
  opensAtMs: number;
  closesAtMs: number;
  readQuotedAt: string | null;
  openPrice: number | null;
  readPrice: number | null;
}): "unknown" | "opening" | "newer" {
  const { opensAtMs, closesAtMs, readQuotedAt, openPrice, readPrice } = input;
  if (openPrice == null || !readQuotedAt || !Number.isFinite(opensAtMs)
      || !Number.isFinite(closesAtMs) || closesAtMs < opensAtMs) return "unknown";
  const quoteMs = Date.parse(readQuotedAt);
  if (!Number.isFinite(quoteMs) || quoteMs < opensAtMs || quoteMs > closesAtMs) return "unknown";
  if (quoteMs > opensAtMs) return readPrice == null ? "unknown" : "newer";
  return "opening";
}
