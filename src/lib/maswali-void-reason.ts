/**
 * MASWALI MILLIONEA — WHY A QUESTION VOIDED: A CLOSED LIST (MASWALI-BUILD S2; MASWALI-PLAN §3 MR-15, OD-04, OD-09b).
 *
 * A question is VOID only on one of these grounds, each published on the register with its evidence. The Yes/No markets'
 * discretionary "management may refund" grounds do NOT carry over, and a platform error is never a ground for voiding one
 * question — so there is no `operator` code here, on purpose. ⏳ The whole-week void a platform error calls for (OD-26, the
 * manual Compliance week void) is not built yet; until it is, no player text promises it.
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
  /** The outcome was public, or the event had begun, before the sales close — MR-15's ground for MR-5's case: sales that ran
   *  past an event brought forward. The officer's own finding, before the close or after it. */
  "settled_before_close",
  /** The criterion is materially wrong, or the English and Swahili texts diverge — found before the close. */
  "criterion_wrong",
  /** The same, found after the close and before the check window ends — the sealing officer's finding, or an objection
   *  upheld with a void (MR-16 as built, S7-OB: `OBJECTION_VOID_GROUND`, the ruling's default ground). The stored code keeps
   *  its name; its words say only what happened. */
  "criterion_objection",
] as const;

export type MaswaliVoidReason = (typeof MASWALI_VOID_REASONS)[number];

export function isMaswaliVoidReason(v: unknown): v is MaswaliVoidReason {
  return typeof v === "string" && (MASWALI_VOID_REASONS as readonly string[]).includes(v);
}

/**
 * The console's name for each ground (English, as the admin console reads), so no control de-underscores the stored
 * code into a misspelling (`test:labels` §11a). A player reads the ground through `MASWALI_VOID_REASON_KEY` below.
 */
export const MASWALI_VOID_REASON_LABEL: Record<MaswaliVoidReason, string> = {
  not_played: "Not played by its void deadline",
  abandoned: "Abandoned, no official result",
  no_source: "No reading from the sources",
  settled_before_close: "Settled or begun before the sales close",
  criterion_wrong: "Criterion wrong, or the texts diverge",
  criterion_objection: "Criterion wrong, found after the close",
};

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
 * the event may still be played or the source may still answer, so the void is refused (once the deadline passes with no
 * seal, the console flags the question: its result from the source if the source gave it by then, else this void, MR-15).
 * The other grounds are facts an officer can establish at any time.
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
