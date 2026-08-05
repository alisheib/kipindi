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

export function refreshCadence(input: { settled: boolean; awaitingResult: boolean }): RefreshCadence {
  const { settled, awaitingResult } = input;
  // ⛔ `settled` wins over everything. A round cannot be both decided and awaiting a result,
  // but a caller that derives the two independently could pass both — and of the two possible
  // mistakes, "kept polling a finished round" is the one that costs a player data forever
  // while "stopped early" self-corrects on their next navigation.
  if (settled) return { enabled: false, intervalMs: LIVE_ROUND_MS };
  if (awaitingResult) return { enabled: true, intervalMs: AWAITING_RESULT_MS };
  return { enabled: true, intervalMs: LIVE_ROUND_MS };
}
