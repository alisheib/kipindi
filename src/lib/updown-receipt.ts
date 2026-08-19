/**
 * THE UP & DOWN BET RECEIPT — the facts a placed bet is confirmed with, and the ONE
 * rule that decides whether that bet has a way out.
 *
 * Isomorphic and dependency-free on purpose (the same reason `updown-durations.ts` has no
 * imports): the receipt modal is a client component, the runway rule it states is enforced
 * on the server, and a second copy of that rule is how the popup comes to promise an exit
 * the server will refuse.
 *
 * ⛔ WHY THE "WAY OUT" ROW IS COMPUTED AND NEVER STATED AS A CONSTANT.
 * `docs/RULES.md` §2.6 sets free cancellation at 5 minutes, and reading only that would put
 * *"Free cancellation · 5 min"* on every Up & Down receipt. It would be wrong on most of them.
 * `cashOutValue` (`market-service.ts`) gates on RUNWAY — how much betting time the bet had
 * when it was placed — not on how long ago it was placed:
 *
 *     hadRunway = graceMs > 0 && lockAt - placedAt >= graceMs
 *
 * An Up & Down round's betting window IS its advertised duration, so on a 3-minute round the
 * grace can never fit and the exit is **never** available; on a 5-minute round it exists only
 * at the very open. `market-service.ts`'s own comment calls the resulting TOO_SHORT refusal
 * "the ORDINARY branch". The table, for the six allowed durations:
 *
 *     duration        3       5        10     15      30      60
 *     last bet with   never   at open  +5m    +10m    +25m    +55m
 *     an exit
 *
 * ⛔ AND RUNWAY IS NOT THE ONLY GATE. `cashOutValue` also refuses a BONUS-FUNDED position
 * outright (`bonusFunded` → `BONUS_FUNDED`), because cash-out pays into the real wallet and
 * would launder non-withdrawable bonus into withdrawable cash. A receipt that checked only the
 * runway would promise a free cancellation on every bonus-funded bet. That is why
 * `bonusStakeTzs` is threaded out of `buyPosition` rather than assumed to be zero.
 */

// Type-only, so nothing from the server graph is pulled into the browser bundle — the same
// import the board card already takes for exactly this reason.
import type { PublicSourceClass } from "@/lib/server/updown-symbols";

/** The frozen, per-round facts a receipt states. Assembled server-side, passed down whole. */
export type UpDownReceiptInfo = {
  /** The round's advertised duration = its betting window, in minutes. */
  durationMinutes: number;
  /** ISO — when betting stops. Null on legacy rounds with no window. */
  selectionClosedAt: string | null;
  /** ISO — the round's close, i.e. when the result is due. */
  closesAt: string;
  /** The round's open price, or null when it has not been read yet. */
  openPrice: number | null;
  /** Decimal places for this asset's price. */
  decimals: number;
  /** E-53 · the KIND of market, never the data vendor. Keyed through `SOURCE_CLASS_KEY`. */
  sourceClass: PublicSourceClass;
  /** Where the round lives, for the receipt's ghost CTA. */
  roundHref: string;
  /**
   * The MARKET'S OWN frozen grace, in minutes — `ratesFor(market).freeExitGraceMinutes`,
   * never live config. A retune must not restate the terms of a bet already placed.
   */
  freeExitGraceMinutes: number;
};

/** What `buyPosition` reports back about the bet that was actually written. */
export type PlacedBetFacts = {
  /** ISO — the server's own instant, not the handset's. */
  placedAt: string;
  /** How much of the stake came from the bonus wallet. > 0 ⇒ never sellable. */
  bonusStakeTzs: number;
};

/**
 * Does THIS bet have a free cancellation, and for how long?
 *
 * Mirrors `cashOutValue`'s gate exactly — same inputs, same comparison, same order of
 * refusal (bonus first, because it is the more specific cause). Returns the grace in
 * minutes when an exit exists, or `null` when the bet rides to the result.
 */
export function freeExitMinutesFor(
  info: Pick<UpDownReceiptInfo, "selectionClosedAt" | "closesAt" | "freeExitGraceMinutes">,
  placed: PlacedBetFacts,
): number | null {
  // Bonus-funded positions are refused before the runway is even consulted.
  if ((placed.bonusStakeTzs ?? 0) > 0) return null;

  const graceMinutes = Math.max(0, info.freeExitGraceMinutes);
  if (graceMinutes <= 0) return null;
  const graceMs = graceMinutes * 60_000;

  // ⛔ THE LOCK INSTANT, NOT THE ROUND'S CLOSE. `cashOutValue` reads
  // `market.selectionClosedAt ?? market.resolutionAt` — selling shuts when SELECTIONS shut.
  // Measuring runway to the close instead would add the whole result phase to it and hand a
  // 3-minute round an exit it does not have.
  const lockMs = Date.parse(info.selectionClosedAt ?? info.closesAt);
  const placedMs = Date.parse(placed.placedAt);
  if (!Number.isFinite(lockMs) || !Number.isFinite(placedMs)) return null;

  return lockMs - placedMs >= graceMs ? graceMinutes : null;
}
