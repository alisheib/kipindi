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

/** REFUNDED (R1): its week voided whole and the ticket's stake came back, written in the same transaction as the money. */
export const TICKET_STATES = ["LIVE", "CANCELLED", "SETTLED", "REFUNDED"] as const;
export type TicketState = (typeof TICKET_STATES)[number];

/** What a ticket shows once its week is known: still running (its money still out), won, did not win, won with its share
 *  forfeited after Compliance's review (OD-07), refunded with the week, or cancelled. */
export type TicketShown = "running" | "won" | "lost" | "forfeited" | "refunded" | "cancelled";

/**
 * The settlement's mark on a winning share Compliance forfeited (OD-07): `forfeitMaswaliShare` writes the ticket's
 * `frozenReason` as this prefix and the officer's reason. Only the prefix is ever read; the reason never leaves the server.
 */
export const FORFEITED_SHARE_MARK = "forfeited · ";

/** The key of each week state's word. A DRAFT is never shown to a player; its key exists for the console. */
export const WEEK_STATE_KEY: Record<WeekState, string> = {
  DRAFT: "weekStatusDraft",
  OPEN: "weekStatusOpen",
  CLOSED: "weekStatusClosed",
  RESOLVING: "weekStatusResolving",
  SETTLED: "weekStatusSettled",
  VOIDED: "weekStatusVoided",
};

/** The key of each shown ticket state's word. A forfeited share reads the composition's own `shareForfeited`. */
export const TICKET_SHOWN_KEY: Record<TicketShown, string> = {
  running: "ticketRunning",
  won: "ticketWon",
  lost: "ticketLost",
  forfeited: "shareForfeited",
  refunded: "ticketRefunded",
  cancelled: "ticketCancelled",
};

/**
 * ⭐ THE ONE DECISION: what a ticket shows, from its own state, its week's, and — in a voided week — whether ITS OWN
 * refund has landed. A cancelled ticket is cancelled whatever the week did. A ticket REFUNDED by its week's bulk refund
 * (R1; the status is written in the money's own transaction), or in a voided week one whose refund has landed
 * (`refundLanded`: its position VOID with a settlement stamp), shows refunded; one still LIVE in a voided week whose
 * refund is owed is still running — its money is out, as the platform's open position reads ("Pending"), and the void
 * lane retries the refund until it lands. A settled ticket won (its share forfeited, by its own mark) or did not; anything
 * else is still running.
 * ⛔ Never "lost" before its week SETTLED — a ticket whose picks already miss is still running until the week is final.
 * ⛔ Never "refunded" from the week's VOIDED stamp alone (S5 review M3): a caller that does not know the ticket's refund
 *    passes nothing, and the ticket does not claim one.
 * ⛔ Never "won" for a share Compliance forfeited (S5 re-review 3): the money went back to the jackpot, so the ticket reads
 *    "forfeited", from its own mark — no caller can forget to say so. A share HELD for review still won (its hold mark is
 *    the row's `share`); a release makes it paid.
 */
export function ticketShown(
  ticket: { status: TicketState; won: boolean | null; frozenReason: string | null },
  week: WeekState,
  refundLanded = false,
): TicketShown {
  if (ticket.status === "CANCELLED") return "cancelled";
  if (ticket.status === "REFUNDED") return "refunded";
  if (week === "VOIDED") return refundLanded ? "refunded" : "running";
  if (ticket.status === "SETTLED" && week === "SETTLED") {
    if (ticket.won !== true) return "lost";
    return ticket.frozenReason?.startsWith(FORFEITED_SHARE_MARK) ? "forfeited" : "won";
  }
  return "running";
}
