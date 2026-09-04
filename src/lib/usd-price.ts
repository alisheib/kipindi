/**
 * ONE USD price spelling for asset-price surfaces (chart round 2, session 80 — the
 * four-lens review's last confirmed finding, applied after the FINAL FORM landed).
 *
 * Six byte-equivalent private copies of this formatter lived across the chart home, the
 * updown pages and the admin rounds page — the exact "private copies" class the chart
 * one-home sprint was founded to kill (four copies of one smoothing function), and a
 * precision or grouping change in any one of them would silently desync the board from
 * the hero on the same price. The card's memoized variant was the performance-correct
 * shape — an `Intl.NumberFormat` is constructed per DECIMALS, once, at module scope,
 * because that is the only thing that varies (BTC and gold quote to 2, FX to 4) — so
 * that shape is the shared one, byte-identical output.
 *
 * Asset prices are quoted in USD because that is what the source publishes. Player
 * money is ALWAYS TZS via `formatTzs` — the two must never be confusable.
 *
 * `null`/`undefined` renders an em-dash (A-5: never a plausible-looking zero for a
 * price nobody read).
 */
const USD_FORMATS = new Map<number, Intl.NumberFormat>();

export function usd(n: number | null | undefined, decimals: number): string {
  if (n == null) return "—";
  let f = USD_FORMATS.get(decimals);
  if (f === undefined) {
    f = new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    USD_FORMATS.set(decimals, f);
  }
  return `$${f.format(n)}`;
}
