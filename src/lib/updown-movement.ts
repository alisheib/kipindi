/**
 * DOES THIS ASSET MOVE ENOUGH TO DECIDE A ROUND OF THIS LENGTH? — the duration gate's second axis.
 *
 * ── WHY A SECOND AXIS (G1, `docs/UPDOWN-FINAL-DESIGN.md` §3b) ────────────────
 * `symbolReadiness` / `validateSymbolDuration` already gate a pairing on whether the asset can
 * be **PRICED IN TIME** — the feed's lag against the round's betting window (E-84/E-89).
 * ⛔ **Nothing gated on whether it MOVES ENOUGH TO DECIDE.** Those are two different failure
 * modes with one symptom — the player's stake comes back — and the second was unguarded.
 *
 * A round is decided by whether the close clears `open ± band`, and at the tick floor the band
 * is the asset's own smallest meaningful move (`minMoveTicks × 10^-decimals`): **$0.02 for
 * Bitcoin, $0.40 for gold**. Bitcoin has so much headroom above its floor that no duration can
 * threaten it. Gold does not, and Bitcoin is structurally incapable of revealing that.
 *
 * ── MEASURED ON PRODUCTION 2026-08-06, and it corrected the design doc ──────
 *
 *   asset  gap   n    p10 |move|   floor    headroom
 *   BTC    18m   74   $8.22        $0.02    411×
 *   XAU    18m   59   $0.84        $0.40      2.1×
 *   XAU    36m   57   $0.74        $0.40      1.9×
 *   XAU    54m   56   $0.71        $0.40      1.8×
 *
 * ⭐ **GOLD'S p10 DOES NOT GROW WITH TIME — it FALLS: 0.84 → 0.74 → 0.71.** §3b projected a
 * 3-minute gold p10 of ~$0.34 by scaling $0.84 with √t. **This platform's own data contradicts
 * that scaling in direction**: the lower tail is set by quiet regimes that stay quiet for an
 * hour, not by a random walk. The projection may still land in the right place — but it is a
 * MODEL, and a model must not be the thing that refuses an operator's write. So nothing here
 * extrapolates.
 *
 * ── THE RULE, AND WHY THE TWO LEVELS REST ON DIFFERENT EVIDENCE ─────────────
 *  · **③ BLOCK requires DIRECT evidence** — a measured window no longer than the round itself,
 *    with `p10 |move| < floor`, i.e. more than one round in ten decided by nothing. That
 *    mirrors the read-success gate exactly, which blocks below 90%.
 *  · **② CAUTION may be inferred from a LONGER window**, and only in the safe direction: if the
 *    quietest tenth of moves over 18 minutes barely clears the band, a 3-minute round has less
 *    room, not more. ⚠️ It is an inference, the sentence says which window it came from and how
 *    many samples, and it can only ever warn.
 *  · **Below the sample floor it says the asset is not measured at this length** and gates
 *    nothing. An unmeasured asset is a known unknown; inventing a number for it is A-5.
 *
 * ⛔ NO IMPORTS, so the console, the server gate and a node suite all share one rule — the same
 * reasoning as `updown-durations.ts` and `updown-refund-reason.ts`.
 */

/** Below this, a gap has not been measured and no claim is made from it. */
export const MIN_MOVE_SAMPLES = 20;

/**
 * Headroom at or below which a pairing is refused OUTRIGHT, given direct evidence.
 * `1` means "the quietest tenth of rounds do not clear the band at all" — more than one round
 * in ten refunds with nobody at fault, which is the same bar the read-success gate blocks at.
 */
export const MOVE_BLOCK_HEADROOM = 1;

/**
 * Headroom below which the operator is warned. Three: at 2× headroom the quietest tenth clears
 * the band by a single band-width, which one slow minute erases.
 */
export const MOVE_CAUTION_HEADROOM = 3;

/** One measured window: how far this asset travelled over `gapMinutes`, and how often. */
export type MoveWindow = {
  gapMinutes: number;
  samples: number;
  /** The quietest tenth of observed absolute moves, in price units. */
  p10Abs: number;
  /** The typical absolute move, for the operator's sense of scale. */
  medianAbs: number;
};

/** One asset's movement record: its own band floor, and every window actually measured. */
export type MovementProfile = {
  assetKey: string;
  /** `minMoveTicks × 10^-decimals` — the smallest band a round on this asset can carry. */
  tickFloorAbs: number;
  /** Ascending by gap. Only windows that met `MIN_MOVE_SAMPLES`. */
  windows: MoveWindow[];
};

export type MovementAdvice = {
  /** ① room to spare · ② thin, read this · ③ this length cannot be decided here. */
  level: 1 | 2 | 3;
  /** The sentence for the operator. Empty on a plain ①. */
  message: string;
  /** `p10 |move| ÷ tick floor` at the window the verdict rests on, or null when unmeasured. */
  headroom: number | null;
  /** WHICH window it rests on — never hidden, because a 54-minute window judging a 3-minute
   *  round is an inference and the operator has to be able to see that it is one. */
  measuredAtMinutes: number | null;
  samples: number;
  /** True when the verdict came from a window LONGER than the round (a ② at most). */
  inferred: boolean;
  /** True when nothing is measured for this asset at all. */
  unmeasured: boolean;
};

/** The window to judge `durationMinutes` by: the shortest measured one that is at least as long.
 *  ⛔ Never a SHORTER window — that would claim more movement than the round can produce. */
function windowFor(profile: MovementProfile, durationMinutes: number): MoveWindow | null {
  const atOrAbove = profile.windows
    .filter((w) => w.gapMinutes >= durationMinutes && w.samples >= MIN_MOVE_SAMPLES)
    .sort((a, b) => a.gapMinutes - b.gapMinutes);
  return atOrAbove[0] ?? null;
}

/** Headroom, or null when the window cannot produce one. */
export function headroomOf(w: MoveWindow | null, tickFloorAbs: number): number | null {
  if (!w || !(tickFloorAbs > 0) || !Number.isFinite(w.p10Abs)) return null;
  return w.p10Abs / tickFloorAbs;
}

/** Money, to the asset's own precision, for a sentence an operator reads. */
const money = (n: number) => `$${n.toFixed(n < 1 ? 2 : 2)}`;

/**
 * Judge one asset at one duration.
 *
 * ⛔ `durationMinutes` is REQUIRED. This axis has no meaning without it — "does gold move
 * enough" is not a question, "does gold move enough in three minutes" is. An asset-level
 * overload would invite exactly the category error E-84 was.
 */
export function judgeMovement(
  profile: MovementProfile | undefined,
  durationMinutes: number,
): MovementAdvice {
  const none: MovementAdvice = {
    level: 2, message: "", headroom: null, measuredAtMinutes: null,
    samples: 0, inferred: false, unmeasured: true,
  };
  if (!profile || profile.windows.length === 0 || !(profile.tickFloorAbs > 0)) {
    return {
      ...none,
      message:
        `How far ${profile?.assetKey ?? "this asset"} typically moves has not been measured here ` +
        `yet, so nothing is known about whether a ${durationMinutes}-minute round on it can be ` +
        `decided. Run it long first and watch for refunds reading "the price did not move far ` +
        `enough".`,
    };
  }

  const w = windowFor(profile, durationMinutes);
  const headroom = headroomOf(w, profile.tickFloorAbs);
  if (!w || headroom == null) {
    return {
      ...none,
      message:
        `${profile.assetKey} has been measured here, but not over a window as long as ` +
        `${durationMinutes} minutes, so how often a round this length would be decided is not ` +
        `known. Nothing is being claimed either way.`,
    };
  }

  // ⭐ DIRECT vs INFERRED, and it is the difference between refusing and warning. A window
  // LONGER than the round tells us the round has AT MOST this much room; it cannot tell us the
  // round is unworkable, because the shorter window has never been observed.
  const inferred = w.gapMinutes > durationMinutes;
  const floor = money(profile.tickFloorAbs);
  const where = inferred
    ? `over the ${w.gapMinutes} minutes it has actually been measured at (${w.samples} samples), ` +
      `which is LONGER than a ${durationMinutes}-minute round — so a round this length has less ` +
      `room, not more`
    : `over ${w.gapMinutes} minutes (${w.samples} samples)`;
  const quiet =
    `The quietest tenth of ${profile.assetKey}'s moves ${where} is ${money(w.p10Abs)}, ` +
    `against a ${floor} band`;

  if (headroom <= MOVE_BLOCK_HEADROOM) {
    if (!inferred) {
      return {
        level: 3,
        message:
          `${quiet} — so more than one round in ten would not move far enough to be called and ` +
          `every stake in it would come back. A refunded round earns nothing, and it is not ` +
          `offered at this length.`,
        headroom, measuredAtMinutes: w.gapMinutes, samples: w.samples, inferred, unmeasured: false,
      };
    }
    // ⛔ A BLOCK MAY NOT REST ON AN INFERENCE. The shorter window has never been observed here;
    // refusing an operator's write on a projection is the thing G1 exists to avoid.
    return {
      level: 2,
      message:
        `${quiet} — barely more than the band itself. A ${durationMinutes}-minute round has less ` +
        `room than that, so expect refunds reading "the price did not move far enough". This ` +
        `length has not been measured directly, so it is not refused — watch it.`,
      headroom, measuredAtMinutes: w.gapMinutes, samples: w.samples, inferred, unmeasured: false,
    };
  }

  if (headroom < MOVE_CAUTION_HEADROOM) {
    return {
      level: 2,
      message:
        `${quiet} — only ${headroom.toFixed(1)}× the band. Rounds will be decided most of the ` +
        `time, but a quiet spell will refund. ${profile.assetKey} is a thin mover at this length; ` +
        `a longer round has more room.`,
      headroom, measuredAtMinutes: w.gapMinutes, samples: w.samples, inferred, unmeasured: false,
    };
  }

  return {
    level: 1,
    message: "",
    headroom, measuredAtMinutes: w.gapMinutes, samples: w.samples, inferred, unmeasured: false,
  };
}
