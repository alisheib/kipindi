/**
 * U49s-2 · THE WORDS A REFUSED OR ANSWERED SWITCH IS SAID IN — pure (no import at all), so the card (a client component)
 * says them and `test:marketing-settings` S14 runs every writer path of `src/lib/server/marketing/live-switch.ts` through
 * them.
 *
 * ⛔ NEVER "THEY WEREN'T SWITCHED ON" WITHOUT PROOF, NEVER "OFF" UNREAD. "weren't switched on" is kept for the refusals
 * made before this click wrote anything (`REFUSED_BEFORE_ANY_WRITE`) — not `cannot_read` (the switch could not be read at
 * all) nor `changed_meanwhile` (a write that lost a race, whose re-read may have failed while another opening stands):
 * those know nothing was written but not what is on, so they are "Couldn't confirm whether marketing SMS are on". A
 * switch-on that wrote (or may have) and was taken back, proven off by a read (`TAKEN_BACK`), is "The switch-on didn't
 * complete" — it may have read on for a moment. ⛔ No title repeats the sentence printed beneath it, and none
 * contradicts the card the refresh is about to show: `already_open` is worded from the server's read AFTER the refusal
 * (`AlreadyOpenReadsAs`), never from the page as it was before the click.
 */

/** The switch-on refusals made before this click wrote anything: a bad duration, no officer, a screened text, no
 *  database, an opening record that could not be written. */
export const REFUSED_BEFORE_ANY_WRITE: ReadonlySet<string> = new Set(["bad_duration", "no_officer", "bad_ops_text", "no_database", "record_failed"]);
/** The switch-on refusals whose write landed (or may have) and was taken back — each proven off by a read. */
export const TAKEN_BACK: ReadonlySet<string> = new Set(["save_failed", "not_open_after_save", "audit_failed"]);

export const NOT_SWITCHED_ON_TITLE = "Marketing SMS weren't switched on";
export const TAKEN_BACK_TITLE = "The switch-on didn't complete";
export const UNCONFIRMED_ON_TITLE = "Couldn't confirm whether marketing SMS are on";

/** A refused switch-on's title. */
export function openRefusalTitle(reason: string | undefined): string {
  if (reason === "unconfirmed_off") return "Marketing SMS may still be on";
  if (reason === "other_open") return "Two switch-ons at once";
  if (reason === "already_open") return "Switched on since this page loaded";
  if (reason !== undefined && REFUSED_BEFORE_ANY_WRITE.has(reason)) return NOT_SWITCHED_ON_TITLE;
  if (reason !== undefined && TAKEN_BACK.has(reason)) return TAKEN_BACK_TITLE;
  return UNCONFIRMED_ON_TITLE;
}

/** How the server reads the switch right after an `already_open` refusal — what the refreshed card is about to show: an
 *  opening (on), one stamped by a clock ahead of this one (malformed here), or anything else (the switch changed again). */
export type AlreadyOpenReadsAs = "open" | "malformed" | "other";

export const CLEAR_FIRST_TITLE = "Clear the stored switch first";
export const CLEAR_FIRST =
  "The stored switch is in a shape this version can't read, and it blocks switching on. Switch it off now to clear it, then switch on.";
export const CHANGED_AS_CLICKED = "The switch changed as you clicked — the card now shows how it reads. Switch on again if it is off.";

/** A refused switch-on's toast: its title above the writer's sentence — except `already_open`, worded from the read after
 *  it: one this server reads malformed is cleared first (the writer's "already on" would contradict the card's Off), and
 *  one that no longer reads as an opening is said as a change, never as "already on". */
export function openRefusalToast(reason: string | undefined, error: string, readsAs?: AlreadyOpenReadsAs): { title: string; description: string } {
  if (reason === "already_open" && readsAs === "malformed") return { title: CLEAR_FIRST_TITLE, description: CLEAR_FIRST };
  if (reason === "already_open" && readsAs !== "open") return { title: UNCONFIRMED_ON_TITLE, description: CHANGED_AS_CLICKED };
  return { title: openRefusalTitle(reason), description: error };
}

/** A refused switch-off's title — in every one of these it may still be on. */
export function closeRefusalTitle(reason: string | undefined): string {
  if (reason === "reopened_meanwhile") return "Your switch-off didn't hold";
  if (reason === "close_unconfirmed") return "Couldn't confirm marketing SMS are off";
  if (reason === "still_open_after_close") return "Marketing SMS are still on";
  return "Couldn't switch marketing SMS off";
}

/** A switch-off that found nothing to remove, as the read after it says: nothing stored; a stored switch it could not
 *  remove (three deletes failed — it reads off, but the owner meant to clear it); somebody's opening; or no read. */
export type AlreadyOffRemains = "none" | "stale" | "open" | "unread";

/** A switch-off that found nothing to remove — "It was already off." only when the read after it found nothing stored. */
export function alreadyOffToast(remains: AlreadyOffRemains): { title: string; description?: string; variant: "success" | "danger" } {
  if (remains === "none") return { title: "It was already off.", variant: "success" };
  if (remains === "stale") {
    return { title: "It reads off, but the stored switch couldn't be cleared", description: "Switch it off again to clear it — if it stays, tell the developer.", variant: "danger" };
  }
  if (remains === "open") {
    return { title: "Your switch-off didn't hold", description: "Someone switched marketing SMS on at the same moment — they are on now. Switch them off again if you meant to.", variant: "danger" };
  }
  return { title: "Couldn't confirm marketing SMS are off", description: "The switch couldn't be read back — reload the page to check it is off.", variant: "danger" };
}

/** Why the card's buttons are disabled: not the owner — or a role that could not be read just now (said as such, never
 *  as "not the owner"). */
export const NOT_OWNER_REASON = "Only an owner account (ADMIN) can switch marketing SMS on or off.";
export const ROLE_UNREAD_REASON = "Your role couldn't be checked just now — reload the page to switch marketing SMS on or off.";
