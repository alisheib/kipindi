import { MillioneaTicketsGhostPick } from "./tickets-ghost";

/**
 * /millionea/tickets loading skeleton — SYNCHRONOUS AND WORDLESS (the S5 review of 24ec0d33, HIGH 2). It streams before the
 * tickets' gate answers, to a signed-in reader the edge passes while Millionea is dark as well (L5), so it asks the server
 * nothing and draws no word of the product (`maswali-ghost.tsx`): the page's own head, as bars, for every reader. A
 * journey reader who moves here from outside the product is drawn Tiketi zangu's head by the journey's root loading state
 * (`route-ghost.tsx`, by the address).
 * ⭐ THE PAGE BEING OPENED (the lead's round-2 item, 2026-10-22): this segment's loading state wraps a ticket's too, so it
 *    draws the destination's drawing — the list's on the list, a ticket's own on a ticket — picked in the browser by
 *    `MillioneaTicketsGhostPick` (`tickets-ghost.tsx` says how), one client element with nothing in its payload.
 */
export default function MillioneaTicketsLoading() {
  return <MillioneaTicketsGhostPick />;
}
