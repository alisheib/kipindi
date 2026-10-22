import { RoutePick } from "@/components/ui/route-pick";
import { MILLIONEA_HREF } from "../millionea-parts";
import { MillioneaTicketsGhost } from "./tickets-ghost";
import { MillioneaTicketGhost } from "./[serial]/ticket-ghost";

/** The list's own address; a ticket's is one segment under it (the journey's root loading state's whole-path pattern). */
const LIST = MILLIONEA_HREF.tickets;

/**
 * /millionea/tickets loading skeleton — SYNCHRONOUS AND WORDLESS (the S5 review of 24ec0d33, HIGH 2). It streams before the
 * tickets' gate answers, to a signed-in reader the edge passes while Millionea is dark as well (L5), so it asks the server
 * nothing and draws no word of the product (`maswali-ghost.tsx`): the page's own head, as bars, for every reader. A
 * journey reader who moves here from outside the product is drawn Tiketi zangu's head by the journey's root loading state
 * (`route-ghost.tsx`, by the address).
 * ⭐ THE DESTINATION'S OWN DRAWING (the lead's round-2 item, 2026-10-22; REGISTER measured the shape on the register): a
 *    segment's loading state wraps its child segments too, so on a client hop from the list to a ticket THIS drawing — the
 *    list's bands — painted for as long as the ticket took (seconds on a slow line), and every band moved when the ticket
 *    landed. It picks by the address being moved to, as the journey's root loading state does (`RoutePick`: during a move
 *    `usePathname()` already names the destination): the list's drawing on the list, the ticket's own
 *    (`[serial]/ticket-ghost.tsx`) on a ticket — the same two drawings and the same whole-path pattern as `route-ghost.tsx`.
 *    Any other address under this segment (none today) gets the list's.
 */
export default function MillioneaTicketsLoading() {
  return (
    <RoutePick
      routes={{ [LIST]: <MillioneaTicketsGhost /> }}
      patterns={[[`^${LIST}/[^/]+$`, <MillioneaTicketGhost />]]}
      other={<MillioneaTicketsGhost />}
    />
  );
}
