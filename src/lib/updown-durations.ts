/**
 * THE ROUND DURATIONS — one list, importable from BOTH the server and the browser.
 *
 * ⛔ WHY IT LIVES HERE AND NOT IN `updown-config.ts` (E-62, 2026-08-04).
 * The list belongs to the product, but `lib/server/updown-config.ts` pulls in Prisma, the audit
 * chain and the config store, so a client component cannot import it — which is exactly why
 * `/admin/updown` and the AI-proposal console each ended up with their own hand-copied
 * `const DURATIONS = [5, 15, 30]`. Three copies of one rule, and a duration added server-side
 * would have left both consoles still offering the old three: a server accepting a value no
 * screen can ask for. This module has NO imports on purpose, so every layer shares one list.
 *
 * ── THE GRID RULE, WHICH DECIDES WHAT MAY BE ADDED ──────────────────────────────────────────
 * Every duration must be a whole multiple of `OBSERVATION_GRID_MINUTES` (5). That is what lets a
 * 10-, 15-, 30- or 60-minute round reuse the price observation the 5-minute grid already
 * produces at its boundary: **one paid provider read serves every chain whose boundary lands
 * there.** A duration off the grid needs its own read at most of its boundaries.
 *
 * ⭐ **10 and 60 added 2026-08-04** on Ali's request ("3 and 30 and 60 also should be options").
 * Both divide 5 exactly, so both are FREE — no new boundaries, no extra provider calls. The
 * earlier analysis (E-62) answered *"30 already exists and 10 never did"* and stopped there,
 * never noticing that the values it was dismissing were the ones with no obstacle at all.
 *
 * ⛔ **3 IS NOT HERE, AND MUST NOT BE ADDED AS A ONE-LINE EDIT.** 3 and 5 coincide only every
 * 15 minutes, so a 3-minute chain needs its own paid read at most boundaries and fires **20 an
 * hour against a 5-minute chain's 12** — roughly **480 extra reads/day/asset** against a Twelve
 * Data Basic-8 plan of ~800/day, on which four assets already consume ~288/day each. Adding it
 * means either moving the grid to 1 minute (every allowed duration then divides it, at the cost
 * of many more observation instants) or accepting and pricing unshared reads. **Measure the real
 * consumption on production first.** It is a cost decision, not a constant. See E-62.
 *
 * ⚠️ A NEW CHAIN'S MARGIN IS NOT AUTOMATIC, and this is how E-32 happened.
 * `resolveScheduledMarginBps` picks the NARROWEST rung with `duration <= maxDurationMinutes`, so
 * a 10-minute chain takes the 15-minute rung — and when no `marginSchedule` is configured at all
 * (production, 2026-08-04) it falls back to `defaultMarginBps`, which is **50 bps = 0.5%**. On a
 * 10-minute BTC round that is a ±$319 band, wide enough to void nearly every round while the
 * feed works perfectly. The live chains run a **2 bps** per-chain override. Set the margin
 * deliberately when creating a chain; never accept the prefill blind.
 */

/** The observation grid, in minutes. Every allowed duration must be a multiple of this. */
export const OBSERVATION_GRID_MINUTES = 5;

/** The durations a chain may run. Each is a separate chain with its own timer and liquidity. */
export const ALLOWED_DURATIONS = [5, 10, 15, 30, 60] as const;

export type Duration = (typeof ALLOWED_DURATIONS)[number];

/**
 * Does this duration land on the observation grid? Exported so the RULE is testable and so a
 * future addition is checked rather than assumed — which is the whole point of E-62's analysis.
 */
export function landsOnGrid(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes > 0 && minutes % OBSERVATION_GRID_MINUTES === 0;
}

// ---------------------------------------------------------------------------
// THE MINUTE — because market data is published as 1-minute bars
// ---------------------------------------------------------------------------
//
// ⛔ WHY THIS EXISTS (2026-08-04). `generateRoundNow` computed its boundary as
// `Math.floor(Date.now() / 1000) * 1000`, which zeroes the MILLISECONDS and keeps the
// SECONDS. A round generated at 21:22:37 therefore carried the boundary `21:27:37`.
//
// That is harmless against a quote endpoint, which only ever answers "the price now" and
// does not care what instant you claim to be asking about. It is fatal against market data,
// which is published as bars labelled by the minute: **there is no bar labelled 21:27:37**,
// so every boundary the platform has ever created is unnamable in the very data that is
// meant to settle it. Measured on the live provider the same day: the bar labelled T exists
// 5 seconds after T and its `open` never changes thereafter — so a minute-aligned boundary
// has an immutable, re-checkable price, and a boundary with seconds on it has none at all.
//
// Kept here, in the module with no imports, so the server and both admin consoles read one
// definition — the same reason `ALLOWED_DURATIONS` lives here (a hand-copied array is how a
// server came to accept a duration no screen could ask for).

export const MINUTE_MS = 60_000;

/**
 * The whole minute `ms` belongs to — i.e. the start of the 1-minute bar covering it.
 *
 * ⚠️ It rounds DOWN, never up, and that is load-bearing. The minute that has already begun
 * can be priced NOW; the next one cannot, and opening a round whose own open price does not
 * exist yet is exactly the "takes stakes, shows a countdown, then voids" failure that E-67
 * was built to make impossible.
 */
export function minuteFloor(ms: number): number {
  return Math.floor(ms / MINUTE_MS) * MINUTE_MS;
}

/** Is this instant exactly on a minute? The property every round boundary must hold. */
export function isMinuteAligned(iso: string): boolean {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) && ms % MINUTE_MS === 0;
}
