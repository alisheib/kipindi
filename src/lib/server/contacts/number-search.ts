/**
 * C8b (B3) · A MASKED OFFICER'S WHOLE-NUMBER SEARCH ANSWERS ONE THING: WHETHER THE BOOK HOLDS THE NUMBER — never rows.
 *
 * ⭐ THE RULING (Ali, 2026-10-09 — COMPLIANCE-DECISIONS § "2026-10-09 · An erased number stays blocked, a test SMS to a
 * typed number is for Admin and Compliance, and the back-filled contacts are re-dated", item 1): "a GROWTH officer's
 * whole-number search answers only 'in the book' or 'not in the book', never rows". A viewer whose `identity.contact` cell
 * is not `read` (roles.ts — GROWTH is the one such role that reaches the book) types a whole number into the search box;
 * until C8b the list answered with that number's row — its name, its lists and tags, its "Added", its edit link — or with
 * nothing, so every row-level fact the survey found (an erased number missing while the Add form says "in the book", a
 * sign-up's date, a list membership) was one search away (docs/CONTACTS-SCREEN-PLAN.md §4.7, surfaces 2 and 4).
 * ⭐ THE MODEL (§4.7): to a masked officer a typed number shows ONE thing — whether the book would take it as new — so
 * the presence the page says is the Add form's own answer: "in the book" when a row holds the number OR the book BLOCKS
 * it (its holder was erased — `bookBlocks`), "not in the book" otherwise. The accepted residual is exactly that bit (STEP
 * 23, MARKETING-CAMPAIGN-HISTORY: "a whole-number lookup tells an officer a number is probably a client").
 * ⛔ THE OTHER FILTERS DO NOT NARROW IT: the answer is about the WHOLE book, whatever else the address holds — a presence
 * narrowed by a list or a window would be a per-row fact again (and a blocked number, which has no row, would read
 * differently from a held one).
 * ⛔ AND NO DOOR TAKES THE SEARCH FURTHER: the bulk bar and the export refuse a masked viewer's audience that searches a
 * whole number (`maskedNumberSearchRefusal`), so a forged post cannot turn the refused list into a write or a file. A
 * NAME search is unchanged for everyone, and a READER's whole-number search lists the row as it always did.
 * ⛔ The search box keeps a whole number as its bare key (`audience.ts`, the filter's `q`), so a whole number is read here
 * by the ONE numbering table (`parseTzNumber`) — exactly the reading the resolver gives the box — never by naming the
 * resolver's own search (`test:contacts-audience` 1.5 keeps that translation in audience.ts alone).
 *
 * Guard: `test:contacts-page` (the presence answer), `test:contacts-bulk` and `test:contacts-export` (the refusals).
 */
import { parseTzNumber } from "@/lib/tz-msisdn";
import type { ContactAudienceFilter } from "@/lib/server/marketing/audience";
import { bookBlocks } from "@/lib/server/contacts/contact-write";

/** The bare `255…` key when the search box holds a WHOLE number, else null (a name, or nothing). */
export function wholeNumberOf(f: Pick<ContactAudienceFilter, "q">): string | null {
  if (f.q === null) return null;
  const n = parseTzNumber(f.q);
  return n.verdict === "ok" && n.msisdn !== null ? n.msisdn : null;
}

/** ⛔ The one sentence the bulk bar and the export say to a masked viewer's whole-number audience. */
export const MASKED_NUMBER_SEARCH_REASON =
  "For your role a whole number shows only whether it is in the book — clear the search, or search by name, to act on contacts.";

/** ⛔ Is this audience a masked viewer's whole-number search? Then no row leaves through it: refused, naming `q`. */
export function maskedNumberSearchRefusal(f: Pick<ContactAudienceFilter, "q">, viewerReads: boolean): { param: "q"; reason: string } | null {
  if (viewerReads || wholeNumberOf(f) === null) return null;
  return { param: "q", reason: MASKED_NUMBER_SEARCH_REASON };
}

/**
 * ⭐ WHETHER THE BOOK HOLDS THIS NUMBER, as the Add form answers it — a row holds it, or the book blocks it
 * (`bookBlocks`: an erasure's tombstone, or with no row an erasure standing on it). The ONE presence a masked viewer's
 * whole-number search is told; never which row.
 */
export async function bookHoldsNumber(msisdn: string): Promise<boolean> {
  const { existing, blocked } = await bookBlocks(msisdn);
  return blocked || existing !== null;
}
