/**
 * MASWALI MILLIONEA — WHY A QUESTION VOIDED: A CLOSED LIST (MASWALI-BUILD S2; MASWALI-PLAN §3 MR-15, OD-04, OD-09b).
 *
 * A question is VOID only on one of these grounds, each published on the register with its evidence. The Yes/No markets'
 * discretionary "management may refund" grounds do NOT carry over, and a platform error voids the whole WEEK (an integrity
 * failure), never one question — so there is no `operator` code here, on purpose.
 *
 * No imports, like `updown-refund-reason.ts`: the register (server), the ticket page, the officer's seal form and the
 * schema's CHECK on `voidReason` (it must be present exactly when the outcome is VOID) all read the same list.
 */

/** Every ground a question may void on, as the code stored in `MaswaliQuestion.voidReason`. */
export const MASWALI_VOID_REASONS = [
  /** Not played or not finished by the question's void deadline (scheduled start + 48 h, capped at the final deadline). */
  "not_played",
  /** Abandoned, with no official result. */
  "abandoned",
  /** No reading from the primary or the named fallback source by the deadline. */
  "no_source",
  /** The outcome was publicly settled before the sales close (MR-5). */
  "settled_before_close",
  /** The criterion is materially wrong, or the English and Swahili texts diverge — found before the close. */
  "criterion_wrong",
  /** The same, upheld on a player's objection after the close. */
  "criterion_objection",
] as const;

export type MaswaliVoidReason = (typeof MASWALI_VOID_REASONS)[number];

export function isMaswaliVoidReason(v: unknown): v is MaswaliVoidReason {
  return typeof v === "string" && (MASWALI_VOID_REASONS as readonly string[]).includes(v);
}

/** The dictionary key of each ground's sentence, under the `millionea` namespace, so no caller writes its own copy. */
export const MASWALI_VOID_REASON_KEY: Record<MaswaliVoidReason, string> = {
  not_played: "voidNotPlayed",
  abandoned: "voidAbandoned",
  no_source: "voidNoSource",
  settled_before_close: "voidSettledBeforeClose",
  criterion_wrong: "voidCriterionWrong",
  criterion_objection: "voidCriterionObjection",
};

/**
 * May an officer seal this ground NOW? `not_played` and `no_source` turn on the question's own void deadline: before it,
 * the event may still be played or the source may still answer, so the void is refused (the system proposes it once the
 * deadline passes, MR-15). The other grounds are facts an officer can establish at any time.
 */
export function voidGroundAvailable(reason: MaswaliVoidReason, voidDeadlineAtMs: number, nowMs: number): boolean {
  switch (reason) {
    case "not_played":
    case "no_source":
      return nowMs >= voidDeadlineAtMs;
    case "abandoned":
    case "settled_before_close":
    case "criterion_wrong":
    case "criterion_objection":
      return true;
  }
}
