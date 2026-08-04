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
