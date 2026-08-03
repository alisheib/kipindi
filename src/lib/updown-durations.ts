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
