/**
 * ⭐ E-102 · HOW OFTEN SHOULD A PAGE RE-ASK THE SERVER — and when should it STOP?
 *
 * 🔴 REPORTED BY ALI, 2026-08-05: *"when a result from Up & Down or any poll comes, the page
 * should refresh; a user cannot refresh to see a result if it came."*
 *
 * ⛔ THE ROUND PAGE HAD NO POLLER AT ALL. `/updown` (the board) polls every 20s and
 * `/markets/[id]` every 15s, but `/updown/[roundId]` — the ONE surface a player sits on
 * watching **`Result in 1:31`** count down — was `force-dynamic` with nothing to re-fetch it.
 * So E-99's timer counted honestly to zero and then the screen stayed exactly as it was until
 * the player reloaded by hand. **A countdown that finishes and changes nothing is worse than no
 * countdown**: it promises an arrival and then denies it.
 *
 * ⭐ A FIXED INTERVAL IS THE WRONG SHAPE FOR THIS PAGE, which is why the rule is a function.
 * The round has three phases with three completely different needs:
 *
 *   · **awaiting a result** — the price lands a measured ~92s after the boundary and the player
 *     is watching. 20s granularity means an average 10s of staring at a finished clock, so this
 *     phase polls FAST. It lasts ~90s and happens once per round: ~18 requests, not a load.
 *   · **open / locked** — the pool and the odds move. The board's 20s is the right cadence and
 *     using the same number keeps two views of one round from disagreeing.
 *   · **settled or void** — ⛔ **STOP.** Outcome, proof and payout are final; nothing will ever
 *     change again. Polling a decided round forever is pure waste on the low-end Android over
 *     2G the standards bar names, and it is the reason this is a rule rather than a constant.
 *   · **settled, and handing over (E-166)** — ⭐ the one bounded exception. A decided round
 *     still has ONE fact outstanding: has the round that follows it arrived? While that is
 *     genuinely open the page asks at the result cadence and then **stops dead** at
 *     `handoverPollUntil` — the successor's own open instant plus a grace, or a hard five-minute
 *     ceiling when that instant is unknown. ⛔ Nothing about the DECIDED round is re-read for
 *     its own sake, and there is no input that makes this arm unbounded.
 *
 * Pure and separate from the component for the same reason `roundPhase` and `resultClock` are:
 * the poller is a client component wrapped around a `setInterval`, and neither is drivable from
 * a node suite. The rule is the part worth guarding.
 */
export type RefreshCadence = {
  /** False ⇒ register no interval at all. Not "poll slowly" — poll never. */
  enabled: boolean;
  /** Milliseconds between refreshes. Meaningless when `enabled` is false. */
  intervalMs: number;
};

/** The result phase is short and the player is watching it. */
export const AWAITING_RESULT_MS = 5_000;
/** Matches the board, so two views of one round never disagree about how fresh they are. */
export const LIVE_ROUND_MS = 20_000;
/**
 * ⭐ E-166 · THE THIRD ARM. A settled round has exactly ONE thing left to learn — whether the
 * round that follows it has arrived — and the same "the player is watching" logic that sets
 * `AWAITING_RESULT_MS` applies, so it is the same number rather than a second one to keep in
 * step. ⛔ It is NOT a return to polling a decided round: the outcome, proof and payout are
 * still final and still never re-read for their own sake; the poll is bounded by
 * `handoverPollUntil` and stops dead there.
 */
export const HANDOVER_MS = 5_000;
/**
 * How far past the successor's known open instant the poll keeps going. The row is written in
 * the same transaction that settles the predecessor, so in the ordinary case it is already
 * there; this grace only covers the round trip and a boundary that slips by a tick.
 */
export const HANDOVER_GRACE_MS = 15_000;
/**
 * ⛔ THE HARD CEILING, from the settle, for when the open instant is UNKNOWN. Measured gaps
 * between a round's close and its successor's open reach **83 minutes** (an abandoned boundary,
 * or a gold chain whose session shut) — and a page that polls for 83 minutes on a decided round
 * is precisely the waste rule 5 forbids on the low-end Android over 2G. Five minutes covers the
 * real recoveries; past it the surface holds its honest waiting state and a navigation recovers.
 */
export const HANDOVER_MAX_MS = 5 * 60_000;

/**
 * ⭐ E-166 · WHEN MAY A SETTLED ROUND KEEP ASKING? Pure, and separate from `refreshCadence` so
 * the BOUND is testable on its own — an unbounded handover poll is the one way this feature
 * could re-create the defect `settled ⇒ enabled:false` was written to prevent.
 *
 * Returns the instant the poll must stop, given what we know:
 *   · the successor's open is KNOWN  → that instant plus a grace, and no further;
 *   · the successor's open is UNKNOWN → the settle plus the hard ceiling.
 * ⛔ Never `Infinity`, on any branch. There is no input to this function that produces one.
 */
export function handoverPollUntil(input: {
  settledAtMs: number | null;
  successorOpensAtMs: number | null;
  nowMs: number;
}): number {
  const { settledAtMs, successorOpensAtMs, nowMs } = input;
  // ⚠️ `settledAtMs` is null on a legacy row. Anchoring the ceiling to `now` there would let a
  // long-dead round poll for five minutes every time someone opens it, so the anchor falls back
  // to now only because there is nothing else — and `handoverClock` will have already reported
  // `live` or `unavailable` for such a round, which stops the poll on the next branch anyway.
  const ceiling = (settledAtMs ?? nowMs) + HANDOVER_MAX_MS;
  if (successorOpensAtMs == null) return ceiling;
  // ⛔ `min`, so a successor whose instant is far in the future cannot out-run the ceiling.
  return Math.min(successorOpensAtMs + HANDOVER_GRACE_MS, ceiling);
}

export function refreshCadence(input: {
  settled: boolean;
  awaitingResult: boolean;
  /**
   * ⭐ E-166 · the settled round is waiting for its successor to appear.
   *
   * ⛔ `untilMs` IS MANDATORY WHEN THIS IS PASSED, and it is the whole safety of the arm. Making
   * it optional would let a caller enable the handover poll with no bound, which is the
   * unbounded poll on a decided round this module's header forbids in as many words.
   * ⛔ AND `active` MUST BE FALSE ONCE THE SUCCESSOR IS IN HAND. The caller passes the phase's
   * own verdict; a round whose successor is open has nothing left to ask about and stops.
   */
  handover?: { active: boolean; untilMs: number; nowMs: number };
}): RefreshCadence {
  const { settled, awaitingResult, handover } = input;
  // ⛔ `settled` wins over everything. A round cannot be both decided and awaiting a result,
  // but a caller that derives the two independently could pass both — and of the two possible
  // mistakes, "kept polling a finished round" is the one that costs a player data forever
  // while "stopped early" self-corrects on their next navigation.
  if (settled) {
    // ⭐ THE ONE EXCEPTION, AND IT IS BOUNDED TWICE OVER: the caller must say the handover is
    // still active AND the deadline must not have passed. Either alone turns it off.
    if (handover?.active && handover.nowMs <= handover.untilMs) {
      return { enabled: true, intervalMs: HANDOVER_MS };
    }
    return { enabled: false, intervalMs: LIVE_ROUND_MS };
  }
  if (awaitingResult) return { enabled: true, intervalMs: AWAITING_RESULT_MS };
  return { enabled: true, intervalMs: LIVE_ROUND_MS };
}
