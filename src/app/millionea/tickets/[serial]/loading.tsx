import { MillioneaTicketGhost } from "./ticket-ghost";

/**
 * /millionea/tickets/[serial] loading skeleton — the drawing is `ticket-ghost.tsx` (this folder), which the journey's root
 * loading state draws too; it reads its own words in the browser, so this file asks the server nothing.
 */
export default function MillioneaTicketLoading() {
  return <MillioneaTicketGhost />;
}
