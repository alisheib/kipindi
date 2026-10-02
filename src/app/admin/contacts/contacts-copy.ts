/**
 * The words of /admin/contacts, in ONE place (U17, 2026-09-28 · U21, 2026-10-02).
 *
 * ⭐ ONE PLACE FOR THE PAGE'S SENTENCES, so the page, its loading ghost, the filter rail and `test:contacts-page`
 * read the same words. (U17's ghost laid out the empty state's strings transparently; since U20 the ghost stands
 * in for the list, and these sentences render inside the table's empty row — `AdminTableEmpty`.)
 * ⭐ U21 · AND ONE VOCABULARY FOR THE COLUMN AND THE RAIL (decision C13). The Consent and Source labels moved here
 * from `page.tsx` ONCE, so the chip in a row and the pill that filters for it can never say two different things —
 * the defect C13 found between two specs ("Not recorded" against "No consent recorded").
 *
 * Admin chrome is English; the Swahili gloss for this section sits on `AdminPageHead`
 * ("Anwani", copied from `src/app/admin/invites/[id]/page.tsx:88`), not on the empty state —
 * `EmptyState`'s `titleSw`/`bodySw` props are accepted for back-compat and NEVER rendered.
 */
import type { ContactConsentState, ContactSource } from "@/lib/server/store";
import { adminCount, formatNumber } from "@/lib/utils";

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

/** U24 · filters (not a search) that match nothing. U21 · the rail stays on screen above this row, so the sentence
 *  can point at it: each axis's "Any" removes that one filter, and Clear filters removes them all. */
export const CONTACTS_NO_MATCH_FILTERED = {
  title: "No contacts match",
  body: "Nothing in the book matches every filter chosen above. Choose Any on one of them, or clear them all.",
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
  // ⭐ ONE SENTENCE, THE FILTER NAMED ONCE: the loader's reason opens "This filter …", so the named filter takes its
  // place — never "can't be used here. This filter isn't available…" under a title that already says it.
  body: (param: string, reason: string) =>
    reason.startsWith("This filter ")
      ? `The “${param}” filter ${reason.slice("This filter ".length)}`
      : `The “${param}” filter can't be used here. ${reason}`,
} as const;

/* ═══ U21 · ONE VOCABULARY FOR THE COLUMN AND THE RAIL (decision C13) ═══════════════════════════ */

/**
 * The recorded consent, as the Consent column's chip AND the rail's Consent axis say it. ⛔ UNKNOWN reads "Not
 * recorded" everywhere (C13) — never "No consent", which would claim a refusal nobody recorded. A full Record, so a
 * new consent state is a compile error here, not a silent blank in a row or a missing pill.
 * ⚠️ It is the CACHE `consentState` (kept true by U24's `mirrorContactCache`), named as what it is.
 */
export const CONSENT_LABEL: Record<ContactConsentState, { label: string; variant: "success" | "neutral" | "warning" }> = {
  GIVEN: { label: "Given", variant: "success" },
  UNKNOWN: { label: "Not recorded", variant: "neutral" },
  WITHDRAWN: { label: "Withdrawn", variant: "warning" },
};

/** Where a number came from, as the Source column AND the rail's Source axis say it. A full Record, as above. */
export const SOURCE_LABEL: Record<ContactSource, string> = {
  IMPORT: "Import",
  REGISTRATION: "Sign-up",
  OPERATOR: "Added by staff",
  AGENT: "Agent",
};

/** The Suppressed axis's two values (`?suppressed=yes|no`) — over the `suppressedAt` cache. ⛔ Not "Reachable": that
 *  is the send gate asked row by row (RG, KYC, age, account), which no stored column equals (§9 U21). */
export const SUPPRESSED_LABEL = { yes: "Suppressed", no: "Not suppressed" } as const;

/** The rail's group keys — the mono word that names each axis. ⚠️ Load-bearing, not decoration: every axis opens
 *  with an "Any" pill, and without its key a row of pills cannot say what it clears (`FilterGroupKey`). */
export const RAIL_KEYS = {
  consent: "Consent",
  suppressed: "Suppressed",
  op: "Operator",
  source: "Source",
  list: "List",
  tag: "Tag",
  player: "Player",
  import: "Import",
  window: "Added",
} as const;

/** The rail as a whole, for a screen reader (`role="group"`). */
export const RAIL_LABEL = "Filter the contact book";
/** Every axis's first pill: that filter removed. */
export const RAIL_ANY = "Any";
/** An applied list id the book has no list for — still a selected pill, so it can be seen and cleared. */
export const RAIL_UNKNOWN_LIST = "Unknown list";
/** An applied list when the lists could not be read (the error state): the rail cannot say its name, and must not
 *  call a list that may well exist "unknown". */
export const RAIL_CHOSEN_LIST = "Chosen list";
export const RAIL_MORE_TAGS = (cap: number) => `Showing the ${cap} most-used tags.`;
export const RAIL_MORE_LISTS = (cap: number) => `Showing the first ${cap} lists, A to Z.`;
/** Clear filters in the rail's foot — drawn only when the page shows none of its own: a FAILED read has no
 *  "Showing contacts:" line and no table to hold one, and N filters would otherwise take N presses of "Any". */
export const RAIL_CLEAR = "Clear filters";

/**
 * The longest pill label the rail draws whole. A pill never wraps and never shrinks (the kit's `whitespace-nowrap`
 * and `shrink-0`), so a 60-character list name (C12) or five operators at once would run off a 360px screen. Past
 * this length the label is clipped and the WHOLE text rides in the pill's hover title. 38 keeps the longest window
 * ("25 Sep 2026 14:30 → 26 Oct 2026 14:31", 37 characters) and the longest tag (32, C11) whole.
 */
export const RAIL_LABEL_MAX = 38;
export function railFit(label: string): string {
  return label.length > RAIL_LABEL_MAX ? `${label.slice(0, RAIL_LABEL_MAX - 1)}…` : label;
}

/** A value the address carries that the parser refused (`?op=NOKIA`), drawn as typed — clipped, and quoted so it
 *  reads as what was typed rather than as an option the book offers. */
export function railTypedValue(raw: string): string {
  return `“${raw.length > 24 ? `${raw.slice(0, 23)}…` : raw}”`;
}

/** An operator pill's hover text: the prefixes its filter matches, from the ONE table (C10). */
export function railOperatorTitle(ndcs: readonly string[]): string {
  const p = ndcs.map((n) => `0${n}`);
  return p.length <= 1 ? `Numbers starting ${p.join("")}` : `Numbers starting ${p.slice(0, -1).join(", ")} or ${p[p.length - 1]}`;
}

/** The rail's count line — the console's one count recipe (`adminCount`; never `.toLocaleString()`). In the
 *  "N of M" form the noun agrees with the WHOLE book, the same rule `/admin/candidates` follows. */
export function railCountLine(match: number, book: number): string {
  return match === book ? adminCount(book, "contact") : `${formatNumber(match)} of ${adminCount(book, "contact")}`;
}
