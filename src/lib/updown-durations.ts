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
 * ── THE LATTICE RULE, WHICH DECIDES WHAT MAY BE ADDED ───────────────────────────────────────
 * A duration is allowed if it **divides 1440**, the number of minutes in a day. Its boundaries
 * then land on a lattice anchored at midnight UTC, which is stable across days and which every
 * other allowed duration also lands on — so one paid provider read still serves every chain
 * whose boundary meets there.
 *
 * ⭐ **10 and 60 added 2026-08-04** on Ali's request ("3 and 30 and 60 also should be options").
 * The earlier analysis (E-62) answered *"30 already exists and 10 never did"* and stopped there,
 * never noticing that the values it was dismissing were the ones with no obstacle at all.
 *
 * ⭐ **AND 3 IS NOW HERE — the rule that excluded it stopped being true.**
 * This header used to say, in capitals, that 3 must never be added as a one-line edit, because
 * 3 does not divide 5: a 3-minute chain would need its own paid read at most boundaries and
 * fire 20 an hour against a 5-minute chain's 12 — ~480 extra reads/day/asset against a ~800/day
 * plan. **That arithmetic was right and its premise is now false.** It assumed chains EMIT ON A
 * TIMER, all landing on shared instants. Ali made generation manual (E-67), and
 * `generateRoundNow` deliberately opens on `minuteFloor(now)` rather than on any grid — because
 * opening on the grid asked for a price up to 120s old and the button worked one minute in
 * four. **Manual rounds do not coincide, so nothing was being shared and nothing was being
 * saved.** The 5-minute rule was costing the product its shortest, most repeatable duration to
 * protect an optimisation that no longer runs.
 *
 * ⚠️ **If chains are ever put back on timers, re-do that measurement before assuming it is
 * still free.** On the epoch lattice a 3-minute chain shares :00/:15/:30/:45 with the 15-minute
 * one, so the sharing is better than it was — but the read count per asset per day is a
 * provider-plan question, and it is answered by measuring, not by this comment.
 *
 * ⚠️ A NEW CHAIN'S MARGIN IS NOT AUTOMATIC, and this is how E-32 happened.
 * `resolveScheduledMarginBps` picks the NARROWEST rung with `duration <= maxDurationMinutes`, so
 * a 10-minute chain takes the 15-minute rung — and when no `marginSchedule` is configured at all
 * (production, 2026-08-04) it falls back to `defaultMarginBps`, which is **50 bps = 0.5%**. On a
 * 10-minute BTC round that is a ±$319 band, wide enough to void nearly every round while the
 * feed works perfectly. The live chains run a **2 bps** per-chain override. Set the margin
 * deliberately when creating a chain; never accept the prefill blind.
 */

/**
 * The observation grid, in minutes.
 *
 * ⚠️ KEPT AT 5 FOR THE CHAIN ANCHOR, but it is no longer the rule that decides which durations
 * are allowed — see `landsOnGrid` below. It remains what a RUNNING chain anchors its emissions
 * to, which is the only thing it was ever load-bearing for.
 */
export const OBSERVATION_GRID_MINUTES = 5;

/**
 * ⭐ THE EPOCH LATTICE — the rule that replaced "must be a multiple of 5" (2026-08-04).
 *
 * ⛔ WHY THE OLD RULE HAD TO GO. It existed to make observation SHARING work: a 10-, 15- or
 * 30-minute round reuses the price the 5-minute grid already produces at its boundary, so one
 * paid provider read serves every chain crossing that instant. 3 does not divide 5, so it was
 * excluded — correctly, under that rule.
 *
 * ⚠️ BUT THE RULE'S OWN PREMISE STOPPED HOLDING when Ali made generation MANUAL. A round now
 * exists because an operator pressed Generate, and `generateRoundNow` deliberately opens on
 * `minuteFloor(now)` rather than on the chain's grid — because opening on the grid asked for a
 * price up to 120s old and the button only worked one minute in four. **Manual rounds do not
 * coincide, so there is nothing to share and nothing was being saved.** The 5-minute rule was
 * costing the product its shortest duration to protect an optimisation that no longer runs.
 *
 * ⭐ THE REPLACEMENT IS STRICTLY BETTER, and it is what §6ad item 8 asks for: a duration is
 * allowed if it **divides 1440** — the number of minutes in a day. Every such duration's
 * boundaries land on a lattice anchored at midnight UTC, so ALL of them still share instants
 * with each other (3 and 15 meet every 15 minutes; 5 and 15 every 15; 30 and 60 every hour),
 * and the lattice is stable across days rather than drifting with a per-chain anchor.
 *
 * ⛔ AND IT IS NOT A LOOSENING. 1440 has divisors like 7 and 9 that would be poor round
 * lengths, so `ALLOWED_DURATIONS` remains an explicit list — the lattice rule is the INVARIANT
 * every entry must satisfy, not a substitute for choosing them.
 */
export const MINUTES_PER_DAY = 1440;

/** The durations a chain may run. Each is a separate chain with its own timer and liquidity. */
export const ALLOWED_DURATIONS = [3, 5, 10, 15, 30, 60] as const;

export type Duration = (typeof ALLOWED_DURATIONS)[number];

/**
 * Does this duration land on the epoch lattice — i.e. does it divide the day evenly?
 *
 * Exported so the RULE is testable and so a future addition is checked rather than assumed,
 * which is the whole point of E-62's analysis. A duration that does not divide 1440 produces
 * boundaries that drift across midnight, so two consecutive days would use different instants
 * and no two chains could ever share a reading.
 */
export function landsOnGrid(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes > 0 && MINUTES_PER_DAY % minutes === 0;
}

/**
 * The boundary lattice for a duration: the instants at which its rounds begin and end, anchored
 * to midnight UTC rather than to a per-chain anchor.
 *
 * ⭐ This is what makes durations share instants again WITHOUT the 5-minute rule. A 3-minute
 * and a 15-minute round both land on :00, :15, :30, :45 — so when chains emit on a timer again,
 * one read still serves both.
 */
export function latticeBoundaryAtOrBefore(atMs: number, durationMinutes: number): number {
  const step = durationMinutes * MINUTE_MS;
  if (step <= 0) throw new Error("latticeBoundaryAtOrBefore: duration must be positive");
  return Math.floor(atMs / step) * step;
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
 * ⭐ THE RESULT PHASE — Ali's decision, 2026-08-04.
 *
 * The lock above is right, but it used to be taken OUT of the advertised time: a "3 min" round
 * ran three minutes end to end and stopped taking bets after 2m24s, so the player got 2:24 of
 * betting on a game called three minutes. Ali: *"instead of making the game time less, why not
 * the same time we are taking off, add it — so 3 min is really 3 mins, then we make a state for
 * the result to come out in the extra time, and give it a timer."*
 *
 * So the lead is now ADDED AFTER the betting window rather than carved out of it:
 *
 *     |<──────── durationMinutes: BETTING ────────>|<─ result phase ─>|
 *     open                              selection close            close
 *
 * The advertised duration is exactly the betting time, and the result phase is a visible,
 * separately-counted state that ends when the closing price is read.
 *
 * ⛔ WHY THE LEAD IS ROUNDED UP TO WHOLE MINUTES. The close price comes from a DATED ONE-MINUTE
 * bar, so a close at 3m36s could not be read at all — there is no bar labelled 17:33:36. Rounding
 * the lead up to the minute keeps every close on a minute mark, and it is not a rounding
 * convenience: it is what makes the round settleable.
 *
 * ⭐ AND THE LATTICE SURVIVES, which is not obvious and is the reason this shape was chosen.
 * §4.5's rule is that a round must divide 1440 so every round starts on the same clean clock
 * marks each day. The SPANS now do:
 *     3+1=4 (360/day) · 5+1=6 (240) · 10+2=12 (120) · 15+3=18 (80) · 30+6=36 (40) · 60+12=72 (20)
 * Every one divides 1440 exactly, so rounds still tile the day and several lengths still share
 * boundaries — the price-reading saving in §2 is untouched.
 */
export function resultPhaseMinutes(durationMinutes: number): number {
  const leadSeconds = selectionCloseLeadSeconds(durationMinutes);
  return Math.max(1, Math.ceil(leadSeconds / 60));
}

/**
 * The round's whole span, open → close: the betting window PLUS the result phase.
 *
 * ⚠️ This — not `durationMinutes` — is the distance from a round's open to its close, and it is
 * what the chain's grid steps by. `durationMinutes` is now purely "how long you may bet".
 */
export function roundSpanMinutes(durationMinutes: number): number {
  return Math.max(0, durationMinutes) + resultPhaseMinutes(durationMinutes);
}

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
  // ⭐ The lock is the close minus the RESULT PHASE, which lands it exactly `durationMinutes`
  // after the open — the whole advertised duration is bettable. It is NOT
  // `selectionCloseLeadSeconds` any more: that value is the INPUT to the result phase, and
  // using it here would re-carve the lead out of the betting window, restoring the very
  // behaviour Ali asked to remove while every other number still looked right.
  const at = closeMs - resultPhaseMinutes(durationMinutes) * 60_000;
  const openMs = closeMs - roundSpanMinutes(durationMinutes) * 60_000;
  return at > openMs ? new Date(at).toISOString() : null;
}
