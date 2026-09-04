/**
 * How a settled outcome is allowed to reach the player — the routing law, and the only
 * place it is written.
 *
 * ── THE DEFECT THIS EXISTS TO END (Ali, 2026-09-04) ───────────────────────────────────
 *
 * A player opened 50pick after a night away. Several rounds had settled while they slept,
 * so the poller found them all in one tick and announced them all in one tick: a queue of
 * gold seals for money that had landed hours earlier, and — because the toast layer's flood
 * guard destroyed everything past four while the poller marked all of them announced — no
 * account at all of the rest. "They appear all of a sudden."
 *
 * ⭐ THE PLATFORM'S OWN LAW ALREADY SAID SO, IN THREE PLACES, AND THE CODE DISAGREED WITH
 * ALL THREE: §F5 "nothing answers an action the player did not take"; §F6 "a burst coalesces
 * into one, never a stack"; §M7 "wins get the seal, losses get the receipt". A celebration
 * fired by a poll for a result the player never watched land is the §F5 violation exactly.
 *
 * ── WHY THIS MODULE IS PURE ──────────────────────────────────────────────────────────
 *
 * ⛔ NO `"use client"`, NO `document`, NO `window`, NO React, NO CLOCK OF ITS OWN. Every
 * input arrives as an argument. That is not tidiness: it is what lets the guard suite CALL
 * this function and assert what it RETURNS, rather than grepping the source for a symbol.
 * §5b — assert the value, not the symbol — is only fully available on a pure module, and
 * this is the decision that most needs it. `test:presence-class` §1 imports and executes it.
 *
 * @see docs/DESIGN_AUTHORITY.md §F5 · §F6 · §M7
 */

/** The three outcomes a settled position can carry. ⚠️ Read off the row, never inferred
 *  from the market's public outcome: a market can resolve YES and still refund an unmatched
 *  backer in full, and saying "you lost" there is a false money statement. */
export type OutcomeKind = "WIN" | "LOSS" | "VOID";

/** How the player came to be looking at this outcome. */
export type PresenceClass = "LIVE" | "RETURNING";

/**
 * Where the outcome is allowed to go.
 *  - `CEREMONY` — the gold seal. ⛔ A LIVE win and nothing else (§M7).
 *  - `TOAST`    — the corner receipt. A LIVE loss or refund.
 *  - `LEDGER`   — the calm away-ledger, surfaced as one NoticeBar. Nothing is shown now.
 */
export type AnnouncementChannel = "CEREMONY" | "TOAST" | "LEDGER";

/**
 * The freshness cap — belt and braces against a presence clock that is wrong rather than
 * merely old.
 *
 * ⭐ IT IS THE SECOND OF TWO INDEPENDENT GATES, AND DELIBERATELY THE TIGHTER ONE. The first
 * gate asks "were you here when it landed?" (`settledAtMs >= presenceSinceMs`, whose
 * boundary is the 30-minute play-session gap Ali ruled on). This one asks "did it land
 * recently?" and answers for the cases the first cannot see: storage cleared mid-session, a
 * device clock corrected by NTP under us, a watch-list entry resurrected long after the
 * fact, a remount that re-seeds `presenceSince` from a stale prop.
 *
 * 5 minutes is ≥10× the worst honest observation lag: the market lane is `ACTIVE_POLL_MS`
 * 2s + `POLL_TIMEOUT_MS` 8s, the Up & Down lane is the ~30s `RefreshPoller`. So a result a
 * present player genuinely watched land can never be older than this when we see it, and
 * anything that is, was not watched.
 */
export const MAX_LIVE_AGE_MS = 300_000;

/** Everything the routing needs to know about the player, passed in rather than read. */
export type PresenceContext = {
  /** When the current uninterrupted attentive window began, in SERVER time.
   *  `null` = not established (host not mounted, signed out, storage gone). */
  presenceSinceMs: number | null;
  /** Now, in SERVER time — `Date.now()` plus the one captured offset. ⛔ Never a raw
   *  device `Date.now()`: `settledAtMs` is a server instant and a device clock is not. */
  serverNowMs: number;
  /** Is the document actually being looked at right now. */
  attentive: boolean;
};

export type Routing = {
  channel: AnnouncementChannel;
  presence: PresenceClass;
  /** Set only when `channel === "TOAST"`. Identical for every member of one group, and
   *  DIFFERENT per outcome — a loss and a refund must never coalesce into one statement. */
  groupKey?: string;
};

/**
 * Route one settled outcome.
 *
 * ⭐ THE INVARIANT THE WHOLE GUARD SUITE PINS, AND THE ONE SENTENCE THIS FILE SHOULD BE
 * READABLE AS: **every uncertainty routes AWAY from ceremony.** A missing settle instant, an
 * unestablished clock, a hidden tab, a stale result — all of them produce the calm channel.
 *
 * ⛔ On a licensed real-money product a FALSE celebration is strictly worse than a missed
 * one. A missed celebration costs a moment; a false one tells a player they won something
 * at a time they did not, which is a money statement the platform cannot support. So the
 * checks below are ordered as gates that can only ever subtract, and there is exactly one
 * path to `CEREMONY`.
 */
export function routeOutcome(
  /* ⚠️ `undefined` IS IN THIS TYPE ON PURPOSE, AND IT IS NOT DEFENSIVE PADDING — the RED
   * harness found it. Rule 2 below looked redundant for `null`, because rule 4's
   * `settledAtMs < presenceSinceMs` coerces `null` to 0 and routes it away anyway. `undefined`
   * does not coerce: `undefined < n` is false, `n - undefined` is NaN, and `NaN > MAX` is
   * false — so without rule 2 an absent timestamp falls through EVERY gate and reaches the
   * seal. A producer reading an optional field (`round.resolvedAtMs`, a row whose `settledAt`
   * is missing) hands us exactly that. ⛔ Never narrow this back to `number | null`. */
  outcome: { kind: OutcomeKind; settledAtMs: number | null | undefined },
  ctx: PresenceContext,
): Routing {
  // 1 · Nobody is looking. A poll on a hidden tab is not the player's act (§F5), and a seal
  //     shown to an empty chair is a seal spent — the celebration is gone when they return.
  if (!ctx.attentive) return { channel: "LEDGER", presence: "RETURNING" };

  // 2 · ⛔ AN UNKNOWN SETTLE INSTANT IS NEVER LIVE. Without it there is no fact that could
  //     make this a moment the player witnessed, and "we don't know" must not read as "yes".
  //     ⚠️ `== null` (loose) catches BOTH null and undefined, and that is load-bearing: this
  //     is the ONLY gate that stops an `undefined` timestamp, because the two comparisons
  //     below both go false on NaN and wave it straight through to the seal.
  if (outcome.settledAtMs == null) return { channel: "LEDGER", presence: "RETURNING" };

  // 3 · The presence clock was never established. Same reasoning as 2, one layer up.
  if (ctx.presenceSinceMs == null) return { channel: "LEDGER", presence: "RETURNING" };

  // 4 · It landed before this sitting began. THIS is the returning player, and it is the
  //     whole point of the change.
  if (outcome.settledAtMs < ctx.presenceSinceMs) return { channel: "LEDGER", presence: "RETURNING" };

  // 5 · It landed during this sitting but too long ago to be news — the freshness cap.
  if (ctx.serverNowMs - outcome.settledAtMs > MAX_LIVE_AGE_MS) {
    return { channel: "LEDGER", presence: "RETURNING" };
  }

  // 6 · LIVE. The player was here, and it just happened.
  //     ⛔ The seal is the win's alone (§M7); a loss gets the receipt, and a refund is
  //     neither an achievement nor an alarm — each keeps its own group so the two can
  //     never be summed into one sentence.
  if (outcome.kind === "WIN") return { channel: "CEREMONY", presence: "LIVE" };
  return { channel: "TOAST", presence: "LIVE", groupKey: `outcome:${outcome.kind}` };
}
