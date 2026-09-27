/**
 * WHEN A CONFIRMED QUOTE STOPS BEING "NOW" — one rule, shared by the terminal chart and the landing band.
 *
 * ⭐ HOISTED 2026-09-27 (landing v3, R5 · spec updown-band-v2 §3.2) from the two inline copies in
 * `getAssetTerminalSeries` (the vendor tier and the confirmed-reads tier of `updown-board.ts`), so the
 * landing's Up & Down band can age its verdict by EXACTLY the terminal's test. Two surfaces calling one
 * quote "live" and "stale" at the same minute is the B6 disagreement this file removes.
 *
 * THE RULE, unchanged from the terminal: a quote is stale once it is older than the larger of
 * `QUOTE_GAP_FACTOR` × the feed's own median cadence and an absolute `QUOTE_STALE_FLOOR_MS`. The floor
 * always applies — with no measurable cadence the gate must not FAIL OPEN (judge panel, finance + data
 * lenses: the first minutes of an outage are exactly when a window holds too few reads to measure).
 *
 * ⛔ The terminal's GAP-MARKER floor (3 minutes, `lineFrom`) is a different rule about drawing holes and
 * is NOT this one; it stays where it is.
 *
 * Isomorphic and pure: no directive, no import. `test:terminal-series` pins the terminal's behaviour and
 * `test:updown-match` §6 pins the boundary to the millisecond.
 */

/** A hole wider than this many median cadences means the feed has stalled. */
export const QUOTE_GAP_FACTOR = 2.5;
/** The absolute floor: never call a quote current for longer than this on cadence alone. */
export const QUOTE_STALE_FLOOR_MS = 5 * 60_000;

/**
 * The median consecutive delta of ascending instants — the feed's own cadence.
 * Null below TWO deltas (three instants): the terminal's own threshold, since one gap is not a cadence.
 */
export function medianCadenceMs(ascMs: number[]): number | null {
  const deltas = ascMs.slice(1).map((t, i) => t - ascMs[i]).sort((a, b) => a - b);
  return deltas.length >= 2 ? deltas[Math.floor(deltas.length / 2)] : null;
}

/**
 * The FIRST instant (integer ms) at which a quote taken at `quotedAtMs` is stale, so that
 * `isQuoteStale(q, now, c)` ⟺ `now >= quoteStaleAtMs(q, c)`.
 *
 * ⛔ EXACTLY the old strict `now − q > limit`. On integer instants that is `now − q ≥ ⌊limit⌋ + 1`,
 * and the floor matters: 2.5 × an odd cadence is a half-millisecond, where a bare `limit + 1` would
 * move the boundary by one millisecond (`test:updown-match` §6 plants that and must catch it).
 */
export function quoteStaleAtMs(quotedAtMs: number, cadenceMs: number | null): number {
  const limit = Math.max(cadenceMs != null ? QUOTE_GAP_FACTOR * cadenceMs : 0, QUOTE_STALE_FLOOR_MS);
  return quotedAtMs + Math.floor(limit) + 1;
}

/** True when the quote taken at `quotedAtMs` is no longer current at `nowMs`. */
export function isQuoteStale(quotedAtMs: number, nowMs: number, cadenceMs: number | null): boolean {
  return nowMs >= quoteStaleAtMs(quotedAtMs, cadenceMs);
}
