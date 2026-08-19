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

/**
 * ⭐ E-166 · THE HANDOVER — what a FINISHED round says about the one that follows it.
 *
 * Ali, 2026-08-19: *"every ending round confirmed ⇒ the next one is already armed and takes the
 * screen."* A chain emits a round every `roundSpanMinutes(duration)`, forever; a surface that
 * stops at "Closed" is describing a game that did not stop.
 *
 * 🔴 WHAT IT REPLACES, read off production 2026-08-19. On `/updown/[roundId]` a settled round
 * renders the header word **"Resolved"** over a pod reading **`Round settled  00:00`** — a dead
 * zero, the exact thing E-99 exists to forbid — and `refreshCadence` then disables the poller,
 * so that screen is final until the player reloads by hand. On the board the settled card is
 * headed **"Closed · BTC"**. *Closed is not a result, and it is not true of this game.*
 *
 * ⛔ THE COUNTDOWN IS THE RARE CASE, NOT THE COMMON ONE — the single most important fact here.
 * The brief asked for *"NEXT MATCH IN 0:47"*. `advanceChain` closes the round that ENDS at a
 * boundary and opens the round that STARTS at it **inside one call**, both gated on the same
 * confirmed observation — so the successor is born at the instant its predecessor settles, with
 * an `opensAt` already ~91s in the PAST, because that is how long the dated bar takes to publish.
 *
 * Measured over every settled round in 24h (`scripts/live/ops/handover-gap-census.cjs`):
 *   · **1,186 of 1,203 (98.6%) had their successor ALREADY OPEN** when the result landed;
 *   · median `successor.opensAt − predecessor.resolvedAt` = **−91.5s** (p10 −121s, min −306s);
 *   · median `successor.createdAt − predecessor.resolvedAt` = **0.1s** — the same call;
 *   · only **16 of 1,203 (1.3%)** had a successor still in the future.
 * So `successorOpensAt − now` is NEGATIVE almost every time and a naive countdown would render a
 * dead or negative clock on 98.6% of settles. `live` is the main road; `counting` is the spur.
 *
 * ⛔ AND `live` DOES NOT COUNT ANYTHING. This was built the other way first — the digits ran to
 * the successor's own bets-close, on the reasoning that *"how long do I have to get in"* is the
 * most useful number available. **Looking at it killed the idea.** On the board the successor is
 * the card immediately to the left, already showing that exact clock, so the settled card
 * rendered a second `02:50` under a different caption 300px away: two big identical numbers that
 * read as a duplicate rather than as a handover. And on any surface it put ANOTHER round's clock
 * inside a pod that has only ever described its own round.
 *
 * ⭐ So the rule is: the pod counts only when it is counting to something that is not already
 * happening. `counting` — a future open — is real news and gets digits. `live` says the state and
 * shows `—:—`, which is the literal truth: nothing about THIS round is being counted any more,
 * and the next match's clock belongs to the next match. The board card then reads
 * *result → "next match live" → GO TO IT*, which is the whole story with nothing repeated.
 *
 * ⛔ NEVER FABRICATE THE INSTANT. `successorOpensAtMs` is null while the chain sits between a
 * boundary and the bar that opens it, and `chainRunning` is false when an operator stopped the
 * chain or the market session is shut — 5 of 19 live chains are stopped right now, and the gold
 * chains sit session-closed for hours. Both get a NAMED state, never a plausible number: the
 * same rule `resultClock` already enforces with `—:—`.
 *
 * Pure, and beside its siblings, for the reason they are: the pods are client components wrapped
 * around ticking intervals and no node suite can drive them. The rule is the part worth guarding.
 */

/**
 * ⛔ HOW LONG THE RESULT IS HELD BEFORE THE HANDOVER SPEAKS. A named constant, never a magic
 * number: it is the whole difference between *"you saw your result"* and *"something flashed"*.
 * 2.5s is a comfortable read of the outcome line plus the payout beside it, and it is
 * deliberately SHORTER than the ~91s head start the successor already has — the player is late
 * to the next match either way, so the hold must not make them later than it has to be.
 */
export const HANDOVER_HOLD_MS = 2_500;

export type HandoverPhase =
  /** Not settled — there is no handover to speak of. */
  | "none"
  /** Settled within the hold: the result stands alone, untouched. */
  | "hold"
  /** No successor can exist — the chain is stopped, or the market session is shut. */
  | "unavailable"
  /** A successor is coming and we cannot honestly name when. */
  | "waiting"
  /** The successor opens at a known instant that is still ahead. */
  | "counting"
  /** The successor is OPEN. The surface may hand over to it now. */
  | "live";

export type HandoverClock = {
  phase: HandoverPhase;
  /** The instant the digits count to, or null when we cannot honestly name one → `—:—`. */
  targetMs: number | null;
  /** Digits should tick. False = `—:—`, never `0:00`. */
  counting: boolean;
  /**
   * ⛔ THE HAND-OVER SIGNAL, and deliberately NOT "the open instant has passed". A boundary can
   * arrive minutes before the round that starts there exists (the bar has not published), and
   * handing the screen to a round that is not there yet is a navigation to nothing. `ready` is
   * true only when a real successor row is open.
   */
  ready: boolean;
};

export function handoverClock(input: {
  /** The CLOSING round's state. */
  state: RoundPhaseState;
  /** When this round's result became final (`resolvedAt`). Null ⇒ unknown; the hold is skipped. */
  settledAtMs: number | null;
  /** True when a successor ROW exists — not merely when a boundary has passed. */
  successorExists: boolean;
  /** The successor's open instant: its own `opensAt`, else the chain's declared next boundary. */
  successorOpensAtMs: number | null;
  /** False ⇒ no successor can exist right now (chain not RUNNING / session closed). */
  chainRunning: boolean;
  nowMs: number;
  holdMs?: number;
}): HandoverClock {
  const { state, settledAtMs, successorExists, successorOpensAtMs, chainRunning, nowMs } = input;
  const holdMs = input.holdMs ?? HANDOVER_HOLD_MS;

  const settled = state === "resolved" || state === "void";
  if (!settled) return { phase: "none", targetMs: null, counting: false, ready: false };

  // ⛔ THE HOLD IS ANCHORED TO THE RESULT, NOT TO THE MOUNT. Anchoring it to when the component
  // appeared would restart it on every poll — `router.refresh()` re-renders the server tree
  // constantly — and the player would watch the ticker vanish and come back for ever.
  // ⚠️ A null instant is a legacy row, not a fresh settle: skip the hold rather than hold for
  // ever, because a hold that never ends IS the dead end this feature exists to remove.
  if (settledAtMs != null && nowMs < settledAtMs + holdMs) {
    return { phase: "hold", targetMs: null, counting: false, ready: false };
  }

  // ⛔ A STOPPED CHAIN HAS NO NEXT MATCH AND MUST NOT PRETEND TO.
  if (!chainRunning) return { phase: "unavailable", targetMs: null, counting: false, ready: false };

  // The spur: a successor whose open is genuinely still ahead — 1.3% of settles, measured.
  // ⛔ Checked BEFORE `live` so a pre-created round (a real row whose window has not begun)
  // counts down to its open rather than being handed over early. `opensAt <= now` is
  // load-bearing across this product and this rule may not be the thing that breaks it.
  if (successorOpensAtMs != null && nowMs < successorOpensAtMs) {
    return { phase: "counting", targetMs: successorOpensAtMs, counting: true, ready: false };
  }

  // The main road: the next match is already running, and has been for about 91 seconds.
  // ⛔ NO DIGITS. See the header — the next match's clock belongs to the next match, and on the
  // board it is already on screen one card away. `—:—` is the honest readout: nothing about THIS
  // round is being counted any more.
  if (successorExists && successorOpensAtMs != null) {
    return { phase: "live", targetMs: null, counting: false, ready: true };
  }

  // A boundary has passed with no round at it yet — the bar has not published, or the boundary
  // was abandoned (20 of 2,357 successions in 48h, gaps of 11 to 83 minutes). Another round is
  // coming; we will not invent its time.
  return { phase: "waiting", targetMs: null, counting: false, ready: false };
}
