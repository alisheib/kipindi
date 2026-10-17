/**
 * MASWALI MILLIONEA — THE WORD FOR EACH STATE (MASWALI-BUILD S2; manifest L11).
 *
 * A week's state and a ticket's state reach a screen ONLY through the dictionary: this maps each stored state to its
 * key under the `millionea` namespace (S5 adds the strings in three languages). One word per state across the products
 * where the meaning is the same (L11) — a held ticket reads like a held position — and Millionea's own word only where
 * the state is its own (a free-window cancel, a week voided whole).
 *
 * No imports: the server's register, the client's ticket list and the admin console read the same map.
 */

export const WEEK_STATES = ["DRAFT", "OPEN", "CLOSED", "RESOLVING", "SETTLED", "VOIDED"] as const;
export type WeekState = (typeof WEEK_STATES)[number];

export const TICKET_STATES = ["LIVE", "CANCELLED", "SETTLED"] as const;
export type TicketState = (typeof TICKET_STATES)[number];

/** What a ticket shows once its week is known: still running, won, did not win, refunded with the week, or cancelled. */
export type TicketShown = "running" | "won" | "lost" | "refunded" | "cancelled";

/** The key of each week state's word. A DRAFT is never shown to a player; its key exists for the console. */
export const WEEK_STATE_KEY: Record<WeekState, string> = {
  DRAFT: "weekStatusDraft",
  OPEN: "weekStatusOpen",
  CLOSED: "weekStatusClosed",
  RESOLVING: "weekStatusResolving",
  SETTLED: "weekStatusSettled",
  VOIDED: "weekStatusVoided",
};

/** The key of each shown ticket state's word. */
export const TICKET_SHOWN_KEY: Record<TicketShown, string> = {
  running: "ticketRunning",
  won: "ticketWon",
  lost: "ticketLost",
  refunded: "ticketRefunded",
  cancelled: "ticketCancelled",
};

/**
 * ⭐ THE ONE DECISION: what a ticket shows, from its own state and its week's. A cancelled ticket is cancelled whatever
 * the week did; a ticket in a voided week was refunded; a settled ticket won or did not; anything else is still running.
 * ⛔ Never "lost" before its week SETTLED — a ticket whose picks already miss is still running until the week is final.
 */
export function ticketShown(ticket: { status: TicketState; won: boolean | null }, week: WeekState): TicketShown {
  if (ticket.status === "CANCELLED") return "cancelled";
  if (week === "VOIDED") return "refunded";
  if (ticket.status === "SETTLED" && week === "SETTLED") return ticket.won === true ? "won" : "lost";
  return "running";
}
