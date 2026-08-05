/**
 * WHICH PHASE IS THIS ROUND IN, from the player's point of view?
 *
 * Pure and separate from the card so it can be tested without a browser — the card is a client
 * component and a countdown, neither of which a node suite can drive.
 *
 * 🔴 THIS EXISTS BECAUSE THE RESULT PHASE WAS INVISIBLE. The card decided `locked` from
 * `state`, a prop rendered ONCE on the server. A player who opened the board during betting
 * kept `state: "open"` for as long as they sat there, so when the lock passed nothing
 * re-evaluated: the countdown to the lock hit zero, `running` went false, and the caption fell
 * through to "Selections closed" over a dead `00:00` for the entire phase. Measured on
 * production 2026-08-04 — 25 consecutive samples across a whole 1-minute phase, not one of them
 * reading "Result in".
 *
 * ⭐ The instants do not go stale, so the phase is derived from them, with the server's own
 * verdict still winning when it says locked. `nowMs` must come from the SERVER-anchored clock,
 * never `Date.now()` — a device clock can be minutes out (this campaign's own laptop is 93
 * seconds slow, E-81) and would put the player in a different phase from the server.
 */
export type RoundPhaseState = "open" | "locked" | "closing" | "confirming" | "resolved" | "void";

export type RoundPhase = {
  /** Bets are closed but the round has not closed — the "result in" window. */
  locked: boolean;
  /** The UP/DOWN controls may be offered. */
  bettable: boolean;
};

export function roundPhase(input: {
  state: RoundPhaseState;
  selectionClosesAtMs: number | null;
  closesAtMs: number;
  nowMs: number;
}): RoundPhase {
  const { state, selectionClosesAtMs, closesAtMs, nowMs } = input;

  const settled = state === "resolved" || state === "void";
  const pastLock = selectionClosesAtMs != null && nowMs >= selectionClosesAtMs;
  const beforeClose = nowMs < closesAtMs;

  // ⛔ `beforeClose` is load-bearing. Past the close the round is confirming or settled, and
  // calling that "Result in" would promise a countdown that has already run out.
  const locked = !settled && (state === "locked" || (pastLock && beforeClose));

  // ⛔ `&& !locked` is what stops this becoming a money defect. Once locked the card re-targets
  // its countdown at the CLOSE, so a naive "state is open and the clock is running" test reads
  // as bettable for the whole result phase. `buyPosition` would refuse every one of those taps
  // — a control offering what the server refuses.
  const bettable = state === "open" && !locked && beforeClose;

  return { locked, bettable };
}

/**
 * ⭐ E-99 · THE RESULT CLOCK — what the player sees AFTER the close, while the round waits for
 * its dated bar. Ali, 2026-08-05: *"we agreed that we want a timer called results and put a new
 * timer for results… so users would wait for results."*
 *
 * 🔴 WHAT IT REPLACES, measured over 22 production rounds: a DEAD `0:00` captioned "Selections
 * closed" for a **median 95s, p90 116s, max 151s**. The betting clock counts to the lock and the
 * result-phase clock counts to the close; nothing counted the wait for the price itself, which
 * is the longest single pause in the game and the one a player is least able to explain.
 *
 * Pure, and separate from the card, for the same reason `roundPhase` is: the card is a client
 * component wrapped around a ticking interval, and neither is drivable from a node suite.
 *
 * ⛔ `expectedResultAtMs` is NULL when the asset is under the measurement floor, and this then
 * reports `counting: false` with no target. The card must show `—:—`, never a plausible number:
 * a countdown is a promise about someone's money, and one we invented is A-5's fabrication.
 */
export type ResultClock = {
  /** The round is past its close and has not settled — the player is waiting for a price. */
  awaiting: boolean;
  /** A measured instant to count to, or null when we cannot honestly name one. */
  targetMs: number | null;
  /** Digits should tick. False = show `—:—`, never `0:00`. */
  counting: boolean;
};

export function resultClock(input: {
  state: RoundPhaseState;
  closesAtMs: number;
  expectedResultAtMs: number | null;
  nowMs: number;
}): ResultClock {
  const { state, closesAtMs, expectedResultAtMs, nowMs } = input;
  const settled = state === "resolved" || state === "void";
  const awaiting = !settled && nowMs >= closesAtMs;
  if (!awaiting || expectedResultAtMs == null) {
    return { awaiting, targetMs: null, counting: false };
  }
  // ⚠️ THE OVERRUN IS NORMAL AND MUST NOT READ AS A FAULT. The target is a MEDIAN, so about one
  // round in ten passes it (p90 116s against ~92s). Past it we stop counting and say we are
  // waiting — showing `0:00` would re-create the exact dead clock this function exists to remove.
  return { awaiting, targetMs: expectedResultAtMs, counting: nowMs < expectedResultAtMs };
}
