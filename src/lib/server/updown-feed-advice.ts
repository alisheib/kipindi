/**
 * WHAT THE FEED HAS ACTUALLY DONE ON THIS PLATFORM — and what to tell the operator.
 *
 * Ali, 2026-08-05: *"guide admins as they go for every asset based on history of 12data — you
 * have to guide them, 'we advise you put this' etc., in warnings. Everything regarding the Up &
 * Down generation would be dynamic."*
 *
 * So the console's advice is DERIVED FROM MEASUREMENT, not from constants a human typed once.
 * Every reading the platform has ever taken is already recorded on `UpDownObservation`
 * (`boundaryAt`, `confirmedAt`, `state`, `attempts`), which is a real, growing history at no
 * extra provider cost. This module turns that history into a sentence an operator can act on.
 *
 * ⛔ THE HARD RULE: IT MUST NEVER INVENT CONFIDENCE. An asset with two readings has not been
 * measured, and saying "median +84s" off two samples is exactly the fabrication A-5 forbids —
 * it reads identically to a number backed by a thousand. Every advisory therefore carries the
 * sample size it rests on, and below `MIN_SAMPLES_FOR_ADVICE` it says plainly that the asset is
 * not yet measured here and falls back to the catalogue's own measured floor.
 *
 * ⚠️ WHAT THE LAG ACTUALLY MEASURES. `confirmedAt - boundaryAt` is how long after a boundary a
 * reading became USABLE — which folds in both the provider's bar-publication delay and our own
 * retry ladder. That is deliberately the operator-facing number: it answers "how long until
 * this asset can settle a round", which is what decides a duration. It is NOT the raw provider
 * latency, and it must not be quoted as such.
 */

/** Below this, an asset has not been measured here and we say so rather than guessing. */
export const MIN_SAMPLES_FOR_ADVICE = 20;

/** One asset's measured record. All fields come from stored readings; none are assumed. */
export type FeedHistory = {
  assetKey: string;
  readings: number;
  confirmed: number;
  failed: number;
  /** Seconds from boundary to a usable reading — the median of confirmed readings. */
  medianLagSeconds: number | null;
  /** The worst confirmed reading. What a duration has to survive, not the typical case. */
  maxLagSeconds: number | null;
};

export type FeedAdvice = {
  /** ① fine · ② usable, read this · ③ do not run this here. */
  level: 1 | 2 | 3;
  /** The sentence shown to the operator. Empty only for a plain ①. */
  message: string;
  /** The shortest duration this asset's own history supports, or null if unmeasured. */
  advisedMinDurationMinutes: number | null;
  /** How many readings the advice rests on — always shown, so it can be weighed. */
  basedOnReadings: number;
  /** True when there is not enough history to say anything about this asset yet. */
  unmeasured: boolean;
};

/** Round a lag up to the whole minute a result phase is expressed in. */
const minutesFor = (seconds: number) => Math.max(1, Math.ceil(seconds / 60));

/**
 * The shortest duration whose RESULT PHASE comfortably covers the worst reading we have seen.
 *
 * The result phase is where settlement happens (T-1), so it is the part that must outlast the
 * feed. A duration whose phase is shorter than the asset's own worst lag will routinely reach
 * its close with no usable price — which is not a theory: it is what 175 consecutive voids
 * looked like (E-83).
 */
export function advisedMinDuration(maxLagSeconds: number, allowed: readonly number[]): number | null {
  const needMinutes = minutesFor(maxLagSeconds);
  for (const d of [...allowed].sort((a, b) => a - b)) {
    // The result phase is 20% of the duration, rounded up, minimum one minute (T-1).
    const phase = Math.max(1, Math.ceil((d * 60 * 0.2) / 60));
    if (phase >= needMinutes) return d;
  }
  return null;
}

/**
 * Turn one asset's measured history into advice for a specific duration.
 *
 * `stalenessSeconds` is the live config value, not a constant — the same reading is safe or
 * unsafe depending on how strict the platform is set to be, and quoting a stale limit in a
 * warning is how an operator ends up acting on a rule that no longer applies.
 */
export function adviseFromHistory(
  h: FeedHistory,
  opts: { durationMinutes?: number; stalenessSeconds: number; allowedDurations: readonly number[] },
): FeedAdvice {
  const { durationMinutes, stalenessSeconds, allowedDurations } = opts;

  if (h.readings < MIN_SAMPLES_FOR_ADVICE || h.medianLagSeconds == null || h.maxLagSeconds == null) {
    return {
      level: 2,
      message:
        `${h.assetKey} has only ${h.readings} recorded reading${h.readings === 1 ? "" : "s"} on this ` +
        `platform, which is not enough to advise from. Start it on a longer round and watch ` +
        `PAID A WINNER before shortening it.`,
      advisedMinDurationMinutes: null,
      basedOnReadings: h.readings,
      unmeasured: true,
    };
  }

  const okPct = h.readings > 0 ? (h.confirmed / h.readings) * 100 : 0;
  const advisedMin = advisedMinDuration(h.maxLagSeconds, allowedDurations);
  const parts: string[] = [];
  let level: 1 | 2 | 3 = 1;

  // ── How often it reads at all ──────────────────────────────────────────────
  if (okPct < 90) {
    level = 3;
    parts.push(
      `${h.assetKey} has produced a usable price in only ${okPct.toFixed(0)}% of ` +
      `${h.readings} readings here. Rounds on it will refund often, and a refunded round earns ` +
      `nothing — we advise not running it until that improves.`,
    );
  } else if (okPct < 98) {
    level = 2;
    parts.push(`${h.assetKey} reads successfully ${okPct.toFixed(0)}% of the time here (${h.readings} readings).`);
  }

  // ── How close it runs to the staleness limit ───────────────────────────────
  if (h.medianLagSeconds >= stalenessSeconds) {
    level = 3;
    parts.push(
      `Its typical reading arrives ${h.medianLagSeconds}s after the boundary, which is past the ` +
      `${stalenessSeconds}s staleness limit — more than half its rounds cannot be priced in time.`,
    );
  } else if (h.medianLagSeconds >= stalenessSeconds * 0.8) {
    level = level === 3 ? 3 : 2;
    parts.push(
      `Its typical reading arrives ${h.medianLagSeconds}s after the boundary, against a ` +
      `${stalenessSeconds}s staleness limit — close enough that a slow minute will refund.`,
    );
  }

  // ── Whether THIS duration is long enough for THIS asset ────────────────────
  //
  // ⛔ THIS BLOCKS, IT DOES NOT ADVISE. Ali, 2026-08-05: *"not advise — don't allow it.
  // Anything risky don't allow it. Tell the admin based on history 'we advise not to use it
  // less than 10 mins' etc., and grey the field out or don't allow it in the dropdown."*
  //
  // A round whose result phase is shorter than the asset's own slowest reading reaches its
  // close with no usable price. That is not a risk to weigh — it is a round that takes stakes,
  // shows a countdown and voids, which is exactly what 175 consecutive rounds did (E-83). So
  // the pairing is level ③: greyed in the dropdown, and refused by the server for the same
  // reason, because a control that offers what the server refuses is its own defect.
  if (durationMinutes != null && advisedMin != null && durationMinutes < advisedMin) {
    level = 3;
    parts.push(
      `Its slowest reading here took ${h.maxLagSeconds}s, so a ${durationMinutes}-minute round ` +
      `can reach its close before the price is available. We advise not running ${h.assetKey} ` +
      `below ${advisedMin} minutes, and it is not offered.`,
    );
  }

  if (parts.length === 0) {
    parts.push(
      `${h.assetKey} has read successfully ${okPct.toFixed(0)}% of ${h.readings} times here, ` +
      `typically ${h.medianLagSeconds}s after the boundary. Nothing to watch for.`,
    );
  }

  return {
    level,
    message: parts.join(" "),
    advisedMinDurationMinutes: advisedMin,
    basedOnReadings: h.readings,
    unmeasured: false,
  };
}
