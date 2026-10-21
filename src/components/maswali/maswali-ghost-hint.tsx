"use client";

import { useEffect } from "react";

/**
 * WHAT THE DOOR KNEW, FOR THE DRAWING THAT FOLLOWS IT (MASWALI-BUILD S5-DESIGN-TICKETS; the R1 tickets critic's M9,
 * DESIGN_AUTHORITY §B7 rule 3: nothing moves when a page lands on its loading drawing).
 *
 * A ticket's page holds one band only its own state can say before the clauses: the free cancel's door, inside its ten
 * minutes (the clock line, the button, the rule — `maswali-ticket-cancel.tsx`). The ticket's loading drawing asks the
 * server nothing (`maswali-ghost.tsx`), so on its own it cannot know the band is there, and the clauses landed a band
 * lower than it drew them. But the door a player opened the ticket from DID know — the held ticket's row on the hub, the
 * ticket's card on Tiketi zangu, the stamp after a cut — so each such door notes the window here as it is drawn
 * (`MaswaliGhostHint`), and the drawing reads it by the address it is drawn for (`freeCancelKnownOpen`): the band is
 * drawn exactly when the page will draw it.
 * ⛔ CLIENT ONLY, AND NEVER A FACT ON SCREEN: a note is written by an effect, read by a client drawing, and kept for this
 *    tab alone (module state — the server's copy is never written, so no reader's note reaches another). It decides one
 *    band's height and says nothing: the door itself is the page's, counted from the server's instant.
 */
const freeCancels = new Map<string, number>();

/** Notes the free cancel's end (ms) of the ticket a door on screen opens. */
export function noteFreeCancel(serial: string, until: number): void {
  if (typeof window === "undefined" || !Number.isFinite(until)) return;
  freeCancels.set(serial, until);
}

/** Whether the door that opened this ticket knew its free cancel to be open at `nowMs`. */
export function freeCancelKnownOpen(serial: string | null, nowMs: number): boolean {
  if (typeof window === "undefined" || serial === null) return false;
  const until = freeCancels.get(serial);
  return until !== undefined && until > nowMs;
}

/** The ticket's serial in a ticket page's address (`/millionea/tickets/MLN-…`), or null for any other address. */
export function ticketSerialOf(pathname: string | null): string | null {
  const m = /^\/millionea\/tickets\/([^/?#]+)\/?$/.exec(pathname ?? "");
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return null; }
}

/** A door's note for the drawing that follows it: renders nothing. */
export function MaswaliGhostHint({ serial, cancelUntil }: { serial: string; cancelUntil: number }) {
  useEffect(() => { noteFreeCancel(serial, cancelUntil); }, [serial, cancelUntil]);
  return null;
}
