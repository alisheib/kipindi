/**
 * The words of /admin/contacts, in ONE place (U17, 2026-09-28 · U21, 2026-10-02).
 *
 * ⭐ ONE PLACE FOR THE PAGE'S SENTENCES, so the page, its loading ghost, the filter rail and `test:contacts-page`
 * read the same words. (U17's ghost laid out the empty state's strings transparently; since U20 the ghost stands
 * in for the list, and these sentences render inside the table's empty row — `AdminTableEmpty`.)
 * ⭐ U21 · AND ONE VOCABULARY FOR THE COLUMN AND THE RAIL (decision C13). The Consent and Source labels moved here
 * from `page.tsx` ONCE, so the chip in a row and the pill that filters for it can never say two different things —
 * the defect C13 found between two specs ("Not recorded" against "No consent recorded").
 * ⭐ U23 · AND THE BULK BAR'S WORDS — its six actions, the confirmation's consequences (Suppress's permanence among them,
 * C23), and the server-counted result line. The rules those words describe are `src/lib/contacts/bulk-rules.ts`.
 *
 * Admin chrome is English; the Swahili gloss for this section sits on `AdminPageHead`
 * ("Anwani", copied from `src/app/admin/invites/[id]/page.tsx:88`), not on the empty state —
 * `EmptyState`'s `titleSw`/`bodySw` props are accepted for back-compat and NEVER rendered.
 */
import type { ContactConsentState, ContactSource } from "@/lib/server/store";
import { adminCount, formatNumber } from "@/lib/utils";
import { CONTACT_FIELDS, CONTACT_LIMITS } from "@/lib/contacts/contact-fields";
import { isPerRowAction } from "@/lib/contacts/bulk-rules";
import type { BulkOutcome, BulkPreview, ContactBulkAction } from "@/lib/contacts/bulk-rules";

export const CONTACTS_EMPTY = {
  title: "No contacts yet",
  /** ⛔ States the present, promises nothing (D12): since U22 one contact can be added by hand — the button the
   *  sentence names sits in the page head — and the importer (U25–U32) is still not live, so it is not offered. */
  body: "The marketing address book is empty. Use Add contact to put a number in it; importing a file is not live yet.",
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

/* ═══ U22 · THE CONTACT FORM — the dialog's words (the page head's button, the dialog, its actions) ═══════════ */

/**
 * The dialog's labels. ⭐ The headings carry NO Swahili: no shipped gloss exists for "Add a contact" or "Edit contact",
 * and one is never invented (§5.13). The eyebrow reuses the page head's shipped "Anwani".
 * ⚠️ The keys end in `Label` on purpose: `test:read-tiers` §7 reads `{… .email …}` in an admin .tsx as a raw email
 * render, so the form never writes a `.email` accessor — not even for a label.
 */
export const CONTACT_FORM = {
  addButton: "Add contact",
  addTitle: "Add a contact",
  editTitle: "Edit contact",
  eyebrow: "Contacts · Anwani",
  numberLabel: "Phone number",
  nameLabel: "Name",
  emailLabel: "Email",
  notesLabel: "Notes",
  tagsLabel: "Tags",
  consent: "Consent",
  source: "Source",
  added: "Added",
  save: "Save contact",
  saveEdit: "Save changes",
  cancel: "Cancel",
  close: "Close",
  tryAgain: "Try again",
  reload: "Reload",
} as const;

/**
 * ⛔ THE FORM'S OWN SENTENCE ABOUT CONSENT — the one thing every viewer is told (A1.1). Nothing lawful can be chosen
 * on a form (OD9's basis and an 18+ attestation are U33's), so the add dialog states the list's own label, "Not
 * recorded" (C13), and this sentence; it never offers a choice.
 */
export const CONTACT_CONSENT_NOTE = "This form never records consent; a contact with no consent recorded is never sent marketing.";
/** The number field's resting help line, before anything is typed. */
export const CONTACT_NUMBER_HINT = "A Tanzanian mobile number in any spelling: 0712 345 678, +255 712 345 678 or 255712345678.";
/** The number field's hover text. ⭐ The caller's `title` wins over PhoneInput's own, which is the PLAYER locale's. */
export const CONTACT_NUMBER_TITLE = "Nine digits after +255";
/** Edit mode: the number is the row's key. A number that changed is a different person's row (`store.ts`). */
export const CONTACT_NUMBER_FIXED = "The number can't be changed — add a new number as a new contact.";
/** The operator chip's hover text — "issued from", never "is on": a number that moved network keeps its prefix. */
export function contactRangeTitle(brand: string): string {
  return `Issued from ${brand}'s range — a number that moved network keeps its prefix.`;
}
/** While the book is asked whether the number is already in it. */
export const CONTACT_CHECKING = "Checking the book…";
/** The duplicate's way out: opens the row that holds the number (`?edit=<contact id>`, a cuid — never the number). */
export const CONTACT_OPEN_EXISTING = "Open the existing contact →";

/** A field's one-line hint, from the ONE field list (`contact-fields.ts`) — never retyped here. */
function fieldHint(key: "email" | "tags"): string {
  return CONTACT_FIELDS.find((f) => f.key === key)?.hint ?? "";
}
export const CONTACT_EMAIL_HINT = fieldHint("email");
export const CONTACT_TAGS_HINT = fieldHint("tags");
/** Edit mode: the stored address is shown masked (`<Sensitive field="contactEmail">`) and never sent to the dialog. */
export const CONTACT_EMAIL_KEEP_HINT = "Leave this empty to keep the stored address, or type a new one to replace it.";
/** The replacement field's accessible name (it sits under the masked address, with no label of its own). */
export const CONTACT_EMAIL_NEW_LABEL = "New email address";
export const CONTACT_EMAIL_REMOVE = "Remove the stored address";
export const CONTACT_EMAIL_KEEP = "Keep the stored address";
export const CONTACT_EMAIL_REMOVING = "The stored address will be removed when you save.";
/** The notes counter — the limit is the ONE table's (`CONTACT_LIMITS.notes`), passed in. */
export function contactNotesCount(used: number, limit: number): string {
  return `${formatNumber(used)} of ${formatNumber(limit)} characters`;
}

export const CONTACT_ADDED = "Contact added";
export const CONTACT_SAVED = "Contact saved";
export const CONTACT_ADD_FAILED = "Couldn't add the contact";
export const CONTACT_SAVE_FAILED = "Couldn't save the contact";
/** 🔴 A1.1 · the post-save consent line — built ONLY when the reply carries the mirrored consent, which it does for a
 *  reader alone (`contactAddReply`). */
export function contactAddedConsent(label: string): string {
  return `Consent: ${label} — read from the consent record. This form never records consent.`;
}
/** The dialog's own read failed (`loadContactEdit`): never "missing" — the contact may well be there. */
export const CONTACT_EDIT_FAILED = "Couldn't load this contact. Try again.";

/** The actions' gate refusal (`softRequireStaff`) — said in words, beside the read-only banner the layout shows. */
export const CONTACT_ROLE_REFUSAL = "Your role can view contacts but not add or change them.";
/** The per-officer rate rule refused (`contacts.write` / `contacts.lookup`). */
export function CONTACT_RATE_LIMITED(retryAfterSec: number): string {
  const s = Math.max(1, Math.ceil(Number.isFinite(retryAfterSec) ? retryAfterSec : 60));
  const wait = s < 60 ? `${s} second${s === 1 ? "" : "s"}` : `${Math.ceil(s / 60)} minute${Math.ceil(s / 60) === 1 ? "" : "s"}`;
  return `Too many contacts in a short time. Wait ${wait}, then try again.`;
}

/* ═══ U23 · THE BULK BAR — the bar, the parameter dialog, the confirmation, the result ══════════════════════════ */

/**
 * Each action's words: its button, its hover line, the overlay's running sentence, the confirmation's title and
 * consequence, the done toast's title, and the result line's past tense and "already" phrase.
 * ⛔ SUPPRESS SAYS ITS PERMANENCE IN WORDS (C23/M13): an officer's stop is lifted by nobody — not the person, not a later
 * holder of the number. ⛔ English only: no Swahili is invented for these (§5.13).
 */
export const BULK_COPY: Record<ContactBulkAction, {
  label: string;
  hint: string;
  running: (count: string) => string;
  title: (count: string, p: Pick<BulkPreview, "tag" | "listName" | "listIsNew">) => string;
  confirm: (n: number) => string;
  consequence: string;
  done: (listName: string | null) => string;
  past: (n: number) => string;
  already: string | null;
}> = {
  tag: {
    label: "Tag",
    hint: "Add one tag to every selected contact.",
    running: (c) => `Tagging ${c}…`,
    title: (c, p) => `Tag ${c} with “${p.tag ?? ""}”?`,
    confirm: (n) => `Tag ${formatNumber(n)}`,
    consequence: `Each contact gets the tag once. A contact that already has it, or already carries ${CONTACT_LIMITS.tags} tags, is left as it is.`,
    done: () => "Tagged",
    past: () => "tagged",
    already: "already had it",
  },
  untag: {
    label: "Untag",
    hint: "Remove one tag from every selected contact.",
    running: (c) => `Removing the tag from ${c}…`,
    title: (c, p) => `Remove “${p.tag ?? ""}” from ${c}?`,
    confirm: (n) => `Untag ${formatNumber(n)}`,
    consequence: "Only the contacts that carry the tag change.",
    done: () => "Tag removed",
    past: () => "untagged",
    already: "didn't have it",
  },
  addToList: {
    label: "Add to list",
    hint: "Add every selected contact to a list.",
    running: (c) => `Adding ${c} to the list…`,
    title: (c, p) => (p.listIsNew ? `Add ${c} to a new list, “${p.listName ?? ""}”?` : `Add ${c} to “${p.listName ?? ""}”?`),
    confirm: (n) => `Add ${formatNumber(n)}`,
    consequence: "A contact already on the list keeps the date it joined.",
    done: (listName) => (listName === null ? "Added to the list" : `Added to “${listName}”`),
    past: () => "added",
    already: "already on it",
  },
  withdraw: {
    label: "Record a withdrawal",
    hint: "Record that these people asked not to receive marketing.",
    running: (c) => `Recording a withdrawal for ${c}…`,
    title: (c) => `Record a withdrawal for ${c}?`,
    confirm: (n) => `Record ${formatNumber(n)}`,
    consequence: "Each number gets a withdrawal in the consent record, in your name, and a player's own marketing switch is turned off. Nothing here records a consent.",
    done: () => "Withdrawal recorded",
    past: (n) => (n === 1 ? "withdrawal recorded" : "withdrawals recorded"),
    already: "already withdrawn",
  },
  suppress: {
    label: "Suppress",
    hint: "Stop all marketing to these numbers, permanently.",
    running: (c) => `Suppressing ${c}…`,
    title: (c) => `Suppress ${c}?`,
    confirm: (n) => `Suppress ${formatNumber(n)}`,
    consequence: "Permanent — no one can lift this, not even the person; a later owner of this number will not receive marketing either.",
    done: () => "Suppressed",
    past: () => "suppressed",
    already: "already suppressed",
  },
  remove: {
    label: "Remove",
    hint: "Take these contacts out of the book.",
    running: (c) => `Removing ${c}…`,
    title: (c) => `Remove ${c} from the book?`,
    confirm: (n) => `Remove ${formatNumber(n)}`,
    consequence: "The contacts leave the book and its lists. Their consent and stop records are kept, and rows emptied by an erasure are kept.",
    done: () => "Removed from the book",
    past: () => "removed",
    already: null,
  },
};

/** The bar's own sentences. */
export const CONTACTS_BULK = {
  none: "Tick contacts to tag, list, withdraw, suppress or remove them.",
  /** Every action's hover line while nothing is ticked. */
  noneTitle: "Tick at least one contact",
  /** ⛔ The bar says why there is no "record consent" (U33 adds it with a recorded basis and an 18+ attestation). */
  consentNote: "Consent can't be recorded here: a lawful record needs a basis and an 18+ attestation, which this page doesn't take yet.",
  clear: "Clear",
  selectPage: "Select every contact on this page",
  selectRow: (label: string) => `Select ${label}`,
  editRow: (label: string) => `Edit ${label}`,
  selected: (n: number, offPage: number) =>
    (offPage > 0 ? `${formatNumber(n)} selected · ${formatNumber(offPage)} on another page` : `${formatNumber(n)} selected`),
  selectAllMatching: (n: number) => `Select all ${formatNumber(n)} matching`,
  allMatching: (n: number) => `All ${formatNumber(n)} matching selected`,
  filterChanged: "The filter changed, so the selection of every matching contact was cleared.",
  tickCap: (max: number) => `A selection holds at most ${formatNumber(max)} ticked contacts — use Select all matching for more.`,
  perRowCap: (max: number) => `A withdrawal or a suppression writes one record per number, so it takes at most ${formatNumber(max)} contacts at a time.`,
  tagTitle: "Tag the selected contacts",
  untagTitle: "Remove a tag from the selected contacts",
  tagLabel: "Tag",
  tagHint: "One tag: letters, digits, spaces, - or _. It is stored in lower case.",
  listTitle: "Add the selected contacts to a list",
  listLabel: "List",
  listNew: "Name a new list…",
  listNameLabel: "New list name",
  listNameHint: `Up to ${CONTACT_LIMITS.listName} characters. A name that differs from a list's only in capitals is that list.`,
  continue: "Continue",
  cancel: "Cancel",
  eyebrow: "Contacts · Anwani",
  previewFailed: "Couldn't count the selection",
  refused: "Nothing was changed",
  failedTitle: "The bulk action didn't finish",
  failedBody: "Some contacts may already have changed — refresh and read the list before pressing again.",
  retry: "Review it again",
  unsavedBody: "A tag or a list name has been typed but nothing has been applied. Leaving now discards it.",
  noName: "No name",
  editLink: "edit →",
  actionsLabel: "Bulk actions",
} as const;

/**
 * ⭐ EVERY ACTION BUTTON'S STATE AND ITS REASON, FROM ONE FUNCTION — so no button can be disabled without saying why. A
 * role that may view but not act gets the act gate's own sentence (`useActDisabledReason`) and the button stays on screen;
 * nothing ticked, or past the per-number cap, says that. An enabled button's hover line says what it does.
 */
export function bulkActionState(
  action: ContactBulkAction,
  s: { mayAct: boolean; actReason: string | undefined; count: number; perRowMax: number; busy: boolean },
): { disabled: boolean; title: string } {
  if (!s.mayAct) return { disabled: true, title: s.actReason ?? CONTACT_ROLE_REFUSAL };
  if (s.count === 0) return { disabled: true, title: CONTACTS_BULK.noneTitle };
  if (isPerRowAction(action) && s.count > s.perRowMax) return { disabled: true, title: CONTACTS_BULK.perRowCap(s.perRowMax) };
  return { disabled: s.busy, title: BULK_COPY[action].hint };
}

/** "and 30 more" under an enumerated confirmation — null when every row is named. */
export function enumerateTail(count: number, shown: number): string | null {
  return count > shown ? `and ${formatNumber(count - shown)} more` : null;
}

/**
 * ⭐ THE SERVER-COUNTED RESULT LINE ("3 tagged · 2 already had it"). Every number in it is the store's own count, never
 * the client's. 🔴 A1.1 · when the split is absent (a withdrawal, for a viewer who may not read a number) the line says
 * the total only — the split is a consent signal, and the reply did not carry it.
 */
export function bulkResultLine(r: Pick<BulkOutcome, "action" | "matched" | "changed" | "unchanged" | "full">): string {
  if (r.changed === null || r.unchanged === null) return `A withdrawal is on record for ${adminCount(r.matched, "contact")}`;
  const words = BULK_COPY[r.action];
  const parts = [`${formatNumber(r.changed)} ${words.past(r.changed)}`];
  if (words.already !== null) parts.push(`${formatNumber(r.unchanged)} ${words.already}`);
  if (r.full > 0) parts.push(`${formatNumber(r.full)} already ${r.full === 1 ? "carries" : "carry"} ${CONTACT_LIMITS.tags} tags`);
  const gone = r.matched - r.changed - r.unchanged - r.full;
  if (gone > 0) parts.push(`${formatNumber(gone)} no longer in the book`);
  return parts.join(" · ");
}
