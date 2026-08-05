/**
 * ⭐ E-101 · WHERE DOES A TICKET REFERENCE ACTUALLY LIVE?
 *
 * 🔴 REPORTED BY ALI, 2026-08-05: *"when I click on ticket it just opens positions, not the
 * specific position I was in with details."* He found it in the wallet, and the wallet was the
 * least of it — **four surfaces print a position's reference and then link to a generic list**,
 * and for an Up & Down bet that list is one the position can NEVER appear on:
 *
 *   · `/wallet` → the TICKET box, `href="/positions"`                     (Ali's report)
 *   · `/updown/[roundId]` → a button literally captioned "Open in positions", on the
 *     **Up & Down** result panel — and `/positions` is `listPositionsForUser(…, "MARKET")`,
 *     long-form polls only. ⛔ A DEAD END BY CONSTRUCTION: the one surface that knows for
 *     certain the position is an Up & Down bet was the one sending it to the other game.
 *   · the bet-placed / win / cash-out emails, which quote `Reference: pos_…` two lines above
 *     a "View positions" button that goes nowhere near it
 *   · `notifyWin`'s default href, same thing in the bell menu
 *
 * ⭐ ONE RULE, IN ONE PLACE (§0.1b.1 — fix the shared thing, not the page). Every one of those
 * sites now links to `/positions/<positionId>`, which resolves ownership on the server and
 * redirects here. This function is the redirect target's whole decision, kept pure so it can be
 * driven without a database, a session or a browser.
 *
 * ⛔ THE FALLBACK MUST NEVER BE `/positions` FOR AN UP & DOWN POSITION. That is the defect,
 * not a safe default: a page that filters the other product line will render "no positions yet"
 * over a bet the player is holding, which is a money surface stating something false.
 */
export type PositionProductLine = "MARKET" | "UPDOWN";

export type TicketDestination = {
  /** Where to send the player. Always carries the fragment so the row can be scrolled to. */
  href: string;
  /** Which surface actually carries the details. `*-list` means we could not do better. */
  surface: "market" | "updown-round" | "updown-list" | "market-list";
  /**
   * True when we landed on a LIST rather than on the position itself. Callers may want to
   * say so; nothing may treat it as success. It exists so "we degraded" is a value that can
   * be asserted, rather than a shape a reader has to infer from the string.
   */
  isFallback: boolean;
};

/**
 * The ONE anchor convention: the fragment is the position id itself, and every destination
 * renders an element carrying that id. A fragment naming something the page does not render
 * is a link that looks deep and lands at the top — the failure this replaces, one step subtler.
 */
export function positionAnchorId(positionId: string): string {
  return positionId;
}

/**
 * The player's PORTFOLIO for a product line, scrolled to one ticket.
 *
 * ⛔ THE TWO GAMES HAVE TWO PORTFOLIOS AND THAT IS THE WHOLE POINT (Ali, 2026-07-25).
 * `/positions` is `listPositionsForUser(…, "MARKET")` and `/updown/history` is the Up & Down
 * one; sending a bet to the wrong one renders an empty state over money the player is holding.
 * Both list destinations resolve through here so there is ONE place that knows which is which.
 */
export function positionListHref(productLine: PositionProductLine, positionId: string): string {
  const frag = `#${positionAnchorId(positionId)}`;
  return productLine === "UPDOWN" ? `/updown/history${frag}` : `/positions${frag}`;
}

export function positionPermalink(input: {
  positionId: string;
  productLine: PositionProductLine;
  marketId: string | null;
  /** The Up & Down round this position's market belongs to, when it has one. */
  roundId?: string | null;
}): TicketDestination {
  const { positionId, productLine, marketId, roundId } = input;
  const frag = `#${positionAnchorId(positionId)}`;

  if (productLine === "UPDOWN") {
    // The round page renders the viewer's own stake, payout, result and the settlement proof —
    // it IS "the specific position with details", and it already existed.
    if (roundId) return { href: `/updown/${roundId}${frag}`, surface: "updown-round", isFallback: false };
    // ⛔ `/updown/history`, never `/positions`. A round row can be missing (a market created
    // before its round, or one removed by an ops reset); the Up & Down portfolio still lists
    // the bet, and the other game's page still cannot.
    return { href: positionListHref("UPDOWN", positionId), surface: "updown-list", isFallback: true };
  }

  if (marketId) return { href: `/markets/${marketId}${frag}`, surface: "market", isFallback: false };
  return { href: positionListHref("MARKET", positionId), surface: "market-list", isFallback: true };
}

/** The permalink a surface links to BEFORE ownership is known — resolved server-side. */
export function positionPermalinkHref(positionId: string): string {
  return `/positions/${positionId}`;
}
