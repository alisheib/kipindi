/**
 * WHY A PLAYER GOT THEIR STAKE BACK — one rule, one answer, every surface.
 *
 * ── WHY THIS FILE EXISTS (E-65, and E-39 before it) ──────────────────────────
 * 🔴 A round resolved **DOWN**, the player had backed **UP**, and the card said
 * *"VOID · REFUNDED · TZS 500"* while the rule printed underneath said *"Down if at or below
 * the Down target"* — i.e. that they had lost. **The money was right and the page argued the
 * opposite.** The refund was correct: theirs was the only side, so there was no counterparty
 * and no pool to win from. Nothing on the screen said so.
 *
 * ⛔ THE ROOT CAUSE IS THAT TWO DIFFERENT THINGS WERE RENDERED BY ONE BRANCH.
 * A stake comes back for reasons that are not remotely alike:
 *
 *   · **the ROUND voided** — nobody was paid, for a reason about the price; or
 *   · **the ROUND decided perfectly well** and this player is refunded anyway, because
 *     nobody took the other side.
 *
 * The card had `voidReason === "source-failed" ? A : B` — two branches for five situations —
 * so a one-sided refund inherited *"the price did not move enough to call"*, which in E-65's
 * round was flatly untrue: the price moved, the round decided, and it decided against them.
 *
 * ── WHY IT LIVES HERE, WITH NO IMPORTS ──────────────────────────────────────
 * The card is a client component, the round page is a server component, the settlement proof,
 * the push and the inbox are three more callers. Five copies of "why did this refund" is five
 * chances to disagree about someone's money — the same reasoning as `updown-durations.ts`.
 * This module has NO imports so every layer can read it.
 */

/** The stored `voidReason` values a round can carry. Mirrors `VoidReason` in the DAL. */
export type StoredVoidReason = "no-move" | "source-failed" | "source-mismatch" | "operator";

/**
 * Why THIS player's stake came back. Each maps to its own sentence in all three languages.
 *
 * ⛔ `unmatched` IS NOT A VOID, and keeping it in the same union is deliberate: the player's
 * experience ("my stake came back") is identical, and the EXPLANATION is the only thing that
 * differs — so the type that carries the explanation is the right place to keep them apart.
 */
export type RefundReason =
  /** The price did not travel far enough either way. The margin working as designed. */
  | "no-move"
  /** We could not confirm a closing price. OUR failure, and it says so. */
  | "source-failed"
  /** A reading came from a domain the round did not pin at open. */
  | "source-mismatch"
  /** A human voided it. */
  | "operator"
  /**
   * ⭐ E-65. The round DECIDED — there was simply nobody on the other side, so there was no
   * pool to win from and every stake goes back. The card must never call this a void, and must
   * never imply the player lost.
   */
  | "unmatched"
  /** A void whose stored reason we do not recognise. Surfaced, never folded into `no-move` —
   *  a silent bucket is how E-1 hid for a month. */
  | "unexplained";

/** The i18n key for each reason, so no caller writes its own copy. */
export const REFUND_REASON_KEY: Record<RefundReason, string> = {
  "no-move": "udRefundNoMove",
  "source-failed": "udRefundSourceFailed",
  "source-mismatch": "udRefundSourceMismatch",
  operator: "udRefundOperator",
  unmatched: "udRefundUnmatched",
  unexplained: "udRefundUnexplained",
};

/**
 * The one decision.
 *
 * ⛔ THE ORDER MATTERS AND IS NOT ARBITRARY. `unmatched` is tested FIRST, because a one-sided
 * refund happens on a round that resolved UP or DOWN — so any check that looked at
 * `voidReason` first would find `null`, fall through, and print a void's copy on a decided
 * round. That is E-65, exactly.
 *
 * @param outcome        the ROUND's verdict — `"UP" | "DOWN" | "VOID" | null`
 * @param voidReason     the round's stored reason, when it voided
 * @param refundedStake  what THIS player got back; 0/undefined when they were not refunded
 * @param wonSide        did this player's side win the round?
 */
export function refundReasonFor(input: {
  outcome: "UP" | "DOWN" | "VOID" | null;
  voidReason: string | null;
  refundedStake?: number;
  wonSide?: boolean;
}): RefundReason | null {
  const { outcome, voidReason, refundedStake = 0, wonSide } = input;

  // ⭐ A DECIDED ROUND THAT STILL HANDED THE STAKE BACK can only be the one-sided case: the
  // player's side had no counterparty, so there was nothing to win and nothing to lose.
  // Checked before `voidReason`, which is null here — see the note above.
  if ((outcome === "UP" || outcome === "DOWN") && refundedStake > 0) return "unmatched";

  if (outcome !== "VOID") return null;

  switch (voidReason) {
    case "no-move": return "no-move";
    case "source-failed": return "source-failed";
    case "source-mismatch": return "source-mismatch";
    case "operator": return "operator";
    // ⛔ NOT folded into `no-move`. An unrecognised reason means either a new void kind or a
    // corrupt row, and both need an operator to look — telling the player "the price did not
    // move enough" would be a guess about their money.
    default: return "unexplained";
  }
}

/**
 * ⛔ E-56 · A VOID IS NEVER AN UP OR A DOWN.
 *
 * Exported so the rule is testable rather than living inside a ternary. A settled round shows
 * a direction only when it HAS one; a refund shows its reason instead. Rendering "DOWN WINS"
 * over a refunded stake is the same lie in the other direction.
 */
export function displayDirection(outcome: "UP" | "DOWN" | "VOID" | null): "UP" | "DOWN" | null {
  return outcome === "UP" || outcome === "DOWN" ? outcome : null;
}
