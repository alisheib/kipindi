import { MillioneaTicketsGhost } from "./tickets-ghost";

/**
 * /millionea/tickets loading skeleton — SYNCHRONOUS AND WORDLESS (the S5 review of 24ec0d33, HIGH 2). It streams before the
 * tickets' gate answers, to a signed-in reader the edge passes while Millionea is dark as well (L5), so it asks the server
 * nothing and draws no word of the product (`maswali-ghost.tsx`): the page's own head, as bars, for every reader. A
 * journey reader who moves here from outside the product is drawn Tiketi zangu's head by the journey's root loading state
 * (`route-ghost.tsx`, by the address).
 */
export default function MillioneaTicketsLoading() {
  return <MillioneaTicketsGhost />;
}
