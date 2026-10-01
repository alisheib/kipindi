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

/** U24 · filters (not a search) that match nothing. */
export const CONTACTS_NO_MATCH_FILTERED = {
  title: "No contacts match",
  body: "Nothing in the book matches these filters.",
} as const;

/** Short on purpose: "Name or full phone number" was clipped at 360 ("…phone numl", measured 2026-10-01). */
export const CONTACTS_SEARCH_PLACEHOLDER = "Name or full number";

/** U24 · the lead of the one line above the table that says, in words, what the list is narrowed to
 *  (`describeAudience`) — shown whenever anything but the search box narrows it. */
export const CONTACTS_FILTERED_LEAD = "Showing contacts:";

/** U24 · an address whose filter cannot be read. ⛔ The page shows NO rows rather than the whole book: a filter
 *  dropped in silence widens whatever is done to the list next (decision C2). It names the parameter. */
export const CONTACTS_FILTER_UNREADABLE = {
  title: "This filter can't be read",
  body: (param: string, reason: string) => `The “${param}” filter in this address can't be used. ${reason} Nothing is listed until it is cleared.`,
} as const;

/** U24 · 🔴 D19 — a filter that would tell a masked role which numbers are players. Same shape, its own words. */
export const CONTACTS_FILTER_NOT_FOR_ROLE = {
  title: "This filter isn't available",
  body: (param: string, reason: string) => `The “${param}” filter can't be used here. ${reason}`,
} as const;
