/**
 * WHAT THE FEED HAS ACTUALLY DONE ON THIS PLATFORM — and what to tell the operator.
 *
 * Ali, 2026-08-05: *"guide admins as they go for every asset based on history of 12data — you
 * have to guide them, 'we advise you put this' etc., in warnings. Everything regarding the Up &
 * Down generation would be dynamic."* And, on what to do with the advice: *"not advise — don't
 * allow it. Anything risky don't allow it… grey the field out or don't allow it in the dropdown."*
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
 * ── 🔴 E-84 · THIS MODULE'S FIRST VERSION JUDGED A HEALTHY ASSET AGAINST TWO YARDSTICKS IT IS
 *    NOT MEASURED ON, AND WIRING IT UNCHANGED WOULD HAVE BLOCKED BITCOIN AT EVERY DURATION.
 *
 * The measured quantity is `confirmedAt - boundaryAt`: how long after a boundary a reading
 * became USABLE. The first version compared it against `maxStalenessSeconds` and, separately,
 * against the round's RESULT PHASE. Both comparisons are category errors, and production says so:
 *
 *   BTC/USD, read 2026-08-05 from the live database (204 readings, 2026-08-04 14:55 → 08-05 07:13)
 *     readings 204 · confirmed 198 (97.1%) · failed 0
 *     confirmedAt − boundaryAt   median 132.25s   max 432.61s
 *     sourceQuotedAt − boundaryAt   median 0.00s   max 0.00s   ← what staleness actually judges
 *
 * ⭐ **The skew the staleness gate judges is ZERO on all 198 confirmed readings**, because a
 * dated 1-minute bar is labelled with the boundary itself (`judgeFeedStaleness` compares
 * `sourceQuotedAt` to `boundaryAt`, not `confirmedAt`). Meanwhile the 132s is very largely OUR
 * OWN configured patience: `barPublicationGraceSeconds` is 120 on production, the window inside
 * which "bar not published" means *not yet* and does not burn an attempt. So the old rule
 * `median >= stalenessSeconds → ③` would have stamped **③ "more than half its rounds cannot be
 * priced in time"** on an asset that priced 97.1% of its readings and settled real winners at
 * three minutes that morning. A sentence that is not merely useless but false.
 *
 * ── WHAT THE MEASURED WAIT ACTUALLY DECIDES ─────────────────────────────────
 * Since E-83, `advanceChain` **will not open a round until its reading confirms**, and abandons
 * the boundary entirely past `abandonAfterSeconds`. So on a RUNNING chain the wait is not a
 * settlement risk — it is subtracted from the BETTING WINDOW:
 *
 *     boundary ──── wait ────► round actually opens ──── betting ────► selections close
 *     |<────────────── durationMinutes ──────────────>|<─ result phase ─>| close
 *
 * A 3-minute BTC chain therefore opens ~132s after its boundary and leaves the player about
 * **48 seconds** of a round advertised as three minutes. That is the real, measured,
 * player-facing consequence, and it is what this module gates on:
 *
 *   ③ BLOCKED   the round cannot work — it would offer less than the platform's own minimum
 *               selection window (`SELECTION_CLOSE_MIN_SECONDS`), or the asset cannot be priced
 *               often enough, or the typical reading arrives past `abandonAfterSeconds`, the
 *               deadline at which a round is closed and every stake refunded.
 *   ② CAUTION   it works, and costs something the operator should know — a materially shortened
 *               betting window, an unmeasured asset, or a success rate below 98%.
 *
 * ⚠️ `abandonAfterSeconds`, not `maxStalenessSeconds`, is the deadline a slow reading is judged
 * against — it is the number `advanceChain` and `healStuckRounds` both give up on. Passing the
 * staleness window here is the E-84 mistake in a new place.
 */
import { ALLOWED_DURATIONS } from "../updown-durations";

/** Below this, an asset has not been measured here and we say so rather than guessing. */
export const MIN_SAMPLES_FOR_ADVICE = 20;

/**
 * The least betting time a round may offer and still be worth opening.
 *
 * ⚠️ Deliberately its own constant rather than a reuse of `SELECTION_CLOSE_MIN_SECONDS`, which
 * happens to be the same 30 seconds but answers a different question (the shortest a round may
 * LOCK for). They agree today because 30s is the smallest window that means anything to a
 * player either way; if one moves, the other should not follow by accident.
 */
export const MIN_BETTING_SECONDS = 30;

/**
 * Below this share of the advertised betting time surviving the wait, the operator is warned.
 * Half: a round that spends more of its own length waiting to open than taking bets is not the
 * round its name promises, even though it settles correctly.
 */
export const BETTING_WINDOW_CAUTION_FRACTION = 0.5;

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

/**
 * How much of the advertised betting window survives a reading that arrives `lagSeconds` after
 * the boundary.
 *
 * ⭐ THE LAST INSTANT A BET MAY BE PLACED IS EXACTLY `durationMinutes` AFTER THE BOUNDARY, and
 * that is the round shape's own statement rather than an approximation of it: `selectionClosesAt`
 * is `close − resultPhase`, and `close` is `boundary + span` where `span = duration + resultPhase`
 * — the two result phases cancel. That is precisely Ali's 2026-08-04 decision, *"the advertised
 * duration is exactly the betting time"*.
 *
 * ⚠️ So the result phase does NOT extend the window a late reading eats into, which is the trap
 * this function exists to keep anyone from re-deriving by hand.
 */
export function bettingSecondsAfterLag(durationMinutes: number, lagSeconds: number): number {
  return Math.round(durationMinutes * 60 - lagSeconds);
}

/**
 * The shortest duration this asset's own record supports, or null if none does.
 *
 * "Supports" means two things, both measured: the round still offers a betting window worth
 * opening after the wait, and it keeps at least half its advertised betting time. ⚠️ This used
 * to be derived from the RESULT PHASE — see E-84 in the header. The result phase is not where
 * the wait lands.
 */
export function advisedMinDuration(
  medianLagSeconds: number,
  allowed: readonly number[] = ALLOWED_DURATIONS,
): number | null {
  for (const d of [...allowed].sort((a, b) => a - b)) {
    const left = bettingSecondsAfterLag(d, medianLagSeconds);
    if (left >= MIN_BETTING_SECONDS && left >= d * 60 * BETTING_WINDOW_CAUTION_FRACTION) return d;
  }
  return null;
}

/**
 * Turn one asset's measured history into advice for a specific duration.
 *
 * `abandonAfterSeconds` is the live derived deadline (`abandonAfterSeconds(cfg)`), not a
 * constant — the same reading is safe or unsafe depending on how long the platform is set to
 * wait, and quoting a stale limit in a warning is how an operator ends up acting on a rule that
 * no longer applies.
 */
export function adviseFromHistory(
  h: FeedHistory,
  opts: {
    durationMinutes?: number;
    abandonAfterSeconds: number;
    allowedDurations?: readonly number[];
  },
): FeedAdvice {
  const { durationMinutes, abandonAfterSeconds } = opts;
  const allowedDurations = opts.allowedDurations ?? ALLOWED_DURATIONS;

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
  const advisedMin = advisedMinDuration(h.medianLagSeconds, allowedDurations);
  const parts: string[] = [];
  let level: 1 | 2 | 3 = 1;

  // ── How often it reads at all ──────────────────────────────────────────────
  if (okPct < 90) {
    level = 3;
    parts.push(
      `${h.assetKey} has produced a usable price in only ${okPct.toFixed(0)}% of ` +
      `${h.readings} readings here. Rounds on it will refund often, and a refunded round earns ` +
      `nothing — it is not offered until that improves.`,
    );
  } else if (okPct < 98) {
    level = 2;
    parts.push(`${h.assetKey} reads successfully ${okPct.toFixed(0)}% of the time here (${h.readings} readings).`);
  }

  // ── Does a reading arrive before the platform gives up on the boundary? ────
  //
  // ⛔ `abandonAfterSeconds` IS THE DEADLINE, not the staleness window (E-84). Past it,
  // `advanceChain` abandons the boundary and `healStuckRounds` closes the round with every stake
  // refunded — so an asset whose TYPICAL reading lands past it produces nothing but refunds.
  if (h.medianLagSeconds >= abandonAfterSeconds) {
    level = 3;
    parts.push(
      `Its typical reading arrives ${h.medianLagSeconds}s after the boundary, past the ` +
      `${abandonAfterSeconds}s deadline at which a round is closed and every stake refunded — ` +
      `more than half its rounds would refund rather than settle.`,
    );
  } else if (h.medianLagSeconds >= abandonAfterSeconds * 0.8) {
    level = level === 3 ? 3 : 2;
    parts.push(
      `Its typical reading arrives ${h.medianLagSeconds}s after the boundary, against the ` +
      `${abandonAfterSeconds}s deadline at which a round refunds — close enough that a slow ` +
      `minute will refund.`,
    );
  }

  // ── Whether THIS duration still leaves a round worth opening ───────────────
  //
  // ⛔ THIS BLOCKS, IT DOES NOT ADVISE. Ali, 2026-08-05: *"not advise — don't allow it.
  // Anything risky don't allow it. Tell the admin based on history 'we advise not to use it
  // less than 10 mins' etc., and grey the field out or don't allow it in the dropdown."*
  //
  // Since E-83 a chain does not open a round until its reading confirms, so the wait comes out
  // of the BETTING WINDOW, not out of settlement. A round left with less than the platform's
  // own minimum selection window is one that takes a name, a countdown and a stake while
  // offering no realistic chance to bet — so the pairing is level ③: greyed in the dropdown and
  // refused by the server for the same reason, because a control that offers what the server
  // refuses is its own defect.
  if (durationMinutes != null) {
    const left = bettingSecondsAfterLag(durationMinutes, h.medianLagSeconds);
    const advice = advisedMin != null
      ? `We advise not running ${h.assetKey} below ${advisedMin} minutes`
      : `No available round length survives that wait`;
    if (left < MIN_BETTING_SECONDS) {
      level = 3;
      parts.push(
        `A reading on ${h.assetKey} typically arrives ${h.medianLagSeconds}s after the boundary, ` +
        `so a ${durationMinutes}-minute round would open with ` +
        `${left <= 0 ? "no betting time left at all" : `only ${left}s of betting left`} — ` +
        `below the ${MIN_BETTING_SECONDS}s minimum a round must offer. ${advice}, and it ` +
        `is not offered.`,
      );
    } else if (left < durationMinutes * 60 * BETTING_WINDOW_CAUTION_FRACTION) {
      level = level === 3 ? 3 : 2;
      parts.push(
        `A reading on ${h.assetKey} typically arrives ${h.medianLagSeconds}s after the boundary, ` +
        `and a chain does not open a round before its price is known — so a ${durationMinutes}-minute ` +
        `round will usually offer about ${left}s of betting rather than ${durationMinutes * 60}s. ` +
        `It settles correctly; players simply get a shorter window than the name suggests. ${advice}.`,
      );
    }
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
