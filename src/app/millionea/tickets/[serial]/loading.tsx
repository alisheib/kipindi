import { MillioneaTicketGhost } from "./ticket-ghost";

/**
 * /millionea/tickets/[serial] loading skeleton — the drawing is `ticket-ghost.tsx` (this folder), which the journey's root
 * loading state and the list's own (`../loading.tsx`, on a hop from the list) draw too; it draws no word of the product
 * (`maswali-ghost.tsx`), so this file asks the server nothing.
 */
export default function MillioneaTicketLoading() {
  return <MillioneaTicketGhost />;
}
