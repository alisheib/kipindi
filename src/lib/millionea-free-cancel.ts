/**
 * MASWALI MILLIONEA — THE FREE CANCEL A TICKET CARRIES (RULES §2.6, MR-12; S5-FIX-PLAYER P1). ONE RULE, two readers: the
 * server (`maswali-player.ts`: a ticket's open window, the receipt's "Ghairi hadi …") and the slip's confirm sheet, which
 * asks it again on every tick while the sheet is open, for a ticket cut NOW on the server-aligned clock — a time printed at
 * the page's render went stale while the player answered fifteen questions, and near the close promised a cancel the
 * purchase would not carry.
 *
 * It is `cancelMaswaliTicket`'s own test, through the platform's one exit formula (`exit-window.ts`):
 *   · a window exists only with the RUNWAY — a grace above zero that fitted before the close the ticket was bought under
 *     (`closeAtPurchase − placedAt ≥ grace`); a last-minute ticket never has one;
 *   · it ends at the earlier of the grace's end (`placedAt + grace`) and the week's close as it stands now.
 * Pure and isomorphic: no clock is read here, every instant is the caller's.
 */
import { exitWindowFacts } from "@/lib/exit-window";

/** When a ticket placed at `placedMs` stops being freely cancellable (ms) — or null when it never was (no runway). */
export function millioneaFreeCancelEnd(placedMs: number, closeAtPurchaseMs: number, closeNowMs: number, graceMinutes: number): number | null {
  const f = exitWindowFacts({ placedAtMs: placedMs, closesAtMs: closeAtPurchaseMs, freeExitGraceMinutes: graceMinutes, paidExitWindowMinutes: 0 });
  return f.hadRunway ? Math.min(f.exitCloseAtMs, closeNowMs) : null;
}
