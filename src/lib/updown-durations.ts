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

// ---------------------------------------------------------------------------
// THE BETTING WINDOW — E-72. Bets close BEFORE the round does.
// ---------------------------------------------------------------------------
//
// ⛔ WHY (Ali's decision, 2026-08-04). Bets were accepted right up to the closing second:
// `openRound` wrote `selectionClosedAt: null`, and `isSelectionClosed` then falls back to
// `resolutionAt` — which for an Up & Down round IS the close instant. The board shows the live
// price and both frozen targets, so at 21:26:59 on a round closing 21:27:00 a player could see
// the price was already past a target and stake with about one second of risk.
//
// ⛔ AND THE SETTLEMENT REBUILD MAKES IT MUCH WORSE, which is why the two ship together.
// Taking the open from a completed 1-minute bar puts the open 60-120s in the past. On a
// 3-minute round that is up to two-thirds of the round already played — visible to anyone,
// bettable by anyone. Shipping open-from-bar WITHOUT this window would widen the hole while
// looking like a fairness improvement.
//
// ⚠️ A FIXED 30s IS NOT ENOUGH, and that is the whole reason this is a proportion. 30s is a
// sixth of a 3-minute round but only 3% of a 15-minute one, and 0.8% of an hour — so a fixed
// lead leaves the long durations wide open. The window is the last 20% of the round, floored
// at 30s so the shortest rounds still lock long enough to matter.

/** The share of a round, at the end, during which bets are closed. */
export const SELECTION_CLOSE_FRACTION = 0.2;
/** The floor, in seconds — a 3-minute round's 20% is 36s; nothing may lock for less than this. */
export const SELECTION_CLOSE_MIN_SECONDS = 30;

/**
 * How many seconds before a round's close bets stop being accepted.
 *
 * Pure, and exported so the server, the card and the round page share ONE answer. Three copies
 * of a rule that decides whether a bet is legal is exactly the drift E-49/E-56 were about, and
 * the `[5, 15, 30]` duplication is the same failure in this very feature.
 */
export function selectionCloseLeadSeconds(
  durationMinutes: number,
  opts?: { fraction?: number; minSeconds?: number },
): number {
  const fraction = opts?.fraction ?? SELECTION_CLOSE_FRACTION;
  const minSeconds = opts?.minSeconds ?? SELECTION_CLOSE_MIN_SECONDS;
  const total = Math.max(0, durationMinutes) * 60;
  // ⛔ NEVER LONGER THAN THE ROUND. A misconfigured fraction must not produce a round that is
  // shut before it opens — that would take no bets at all and look like an outage.
  return Math.min(total, Math.max(minSeconds, Math.round(total * fraction)));
}

/**
 * The instant bets stop being accepted, given the round's close.
 *
 * ⚠️ Returns null when the lead would swallow the whole round, so a caller writes `null` rather
 * than an instant at or before the open — `createMarket` drops a `selectionClosedAt` already in
 * the past, and a round born locked is worse than one that never locks.
 */
export function selectionClosesAt(closeIso: string, durationMinutes: number): string | null {
  const closeMs = Date.parse(closeIso);
  if (!Number.isFinite(closeMs)) return null;
  const lead = selectionCloseLeadSeconds(durationMinutes);
  const openMs = closeMs - durationMinutes * 60_000;
  const at = closeMs - lead * 1000;
  return at > openMs ? new Date(at).toISOString() : null;
}
