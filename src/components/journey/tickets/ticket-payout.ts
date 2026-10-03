/**
 * WHAT A TICKET SAYS IT PAYS — nothing until the result (the Vodacom plan S6, SJ-4 and SJ-19; VODACOM-PLAN §0h point 22,
 * which supersedes S6-PLAN WP9 step 4's exact figure after betting closes).
 *
 *   · OPEN — whatever its market is doing: betting open, selling closed, or closed and stamped by the closing sweep — no
 *     figure: "Malipo · Matokeo yakitoka". SJ-4 and DESIGN_AUTHORITY §C3 (as amended 2026-09-29) keep a position's
 *     payout hidden before resolution, on the post-bet receipt and in Tiketi zangu alike, and the canvas draws every
 *     pending ticket so (s4-9-tiketi-open), one whose selling has closed included. The classic position card keeps its
 *     exact post-close figure: this is the journey's rule only.
 *   · settled — what was paid, `finalPayout`, as market-service wrote it at settlement: a win's payout, a loss's 0, a
 *     refund's stake, a sale's value — and 0 where nothing was recorded.
 *
 * ⛔ Pure — no import, no directive — so `test:journey-tickets` §2 drives it in process, beside defective twins.
 */

/** A ticket's payout, as the card draws it. */
export type TicketPayout = { kind: "atResult" } | { kind: "final"; amount: number; won: boolean };

export function ticketPayout(p: {
  status: "OPEN" | "WIN" | "LOSS" | "VOID" | "CASHED_OUT";
  finalPayout: number | null;
}): TicketPayout {
  if (p.status === "OPEN") return { kind: "atResult" };
  return { kind: "final", amount: p.finalPayout ?? 0, won: p.status === "WIN" };
}
