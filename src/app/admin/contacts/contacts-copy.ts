/**
 * The empty-state copy for /admin/contacts, in ONE place (U17, 2026-09-28).
 *
 * ⭐ ONE PLACE FOR THE PAGE'S SENTENCES, so the page, its loading ghost and `test:contacts-page` read the
 * same words. (U17's ghost laid out the empty state's strings transparently; since U20 the ghost stands
 * in for the list, and these sentences render inside the table's empty row — `AdminTableEmpty`.)
 *
 * Admin chrome is English; the Swahili gloss for this section sits on `AdminPageHead`
 * ("Anwani", copied from `src/app/admin/invites/[id]/page.tsx:88`), not on the empty state —
 * `EmptyState`'s `titleSw`/`bodySw` props are accepted for back-compat and NEVER rendered.
 */
export const CONTACTS_EMPTY = {
  title: "No contacts yet",
  /** ⛔ States the present, promises nothing: there is no store until U18 and no importer until
   *  U25, and this programme does not publish a commitment with no code behind it (D12). */
  body: "The marketing address book is empty. Adding and importing contacts are not live yet.",
} as const;

/** U20 · a search that matches nothing. ⛔ Says WHY a part of a number finds nothing: the book never
 *  searches inside a number (a masked role could rebuild one digit by digit, `contacts-query.ts`). */
export const CONTACTS_NO_MATCH = {
  title: "No contacts match",
  body: "Nothing in the book matches this search. Search by name, or by a complete phone number — part of a number is not searched.",
} as const;

/** Short on purpose: "Name or full phone number" was clipped at 360 ("…phone numl", measured 2026-10-01). */
export const CONTACTS_SEARCH_PLACEHOLDER = "Name or full number";
