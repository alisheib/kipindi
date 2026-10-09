/**
 * U22 · ONE CONTACT, ADDED OR EDITED BY AN OFFICER — and THE ONE CREATE BUILDER every writer of a new book row uses
 * (`newContactRow`, decision X6: U22 creates it; U31, U32 and U33 reuse it).                    (S10, 2026-10-02)
 *
 * ⛔ NO CONSENT IS RECORDED HERE, AND NONE CAN BE. Nothing lawful can be chosen on a form: a contact needs OD9's basis
 * and an 18+ attestation, which only U33 builds. So the request types carry no consent key, this module writes NO
 * ledger row (`test:dal-parity` §20 counts every ledger writer — this file is not one), and the builder writes the
 * caches only as their empty values: a new row's `consentState` and `suppressedAt` come from U24's
 * `mirrorContactCache` (decision C4), which reads the ledger and the stop list themselves.
 * ⭐ THE UNIQUE INDEX IS THE DUPLICATE CHECK (OD32). `addContact` creates; a create the index refuses (`null` in both
 * twins — a race included) is a refusal. The lookup before Save is a convenience for the officer, never the decision,
 * and there is no second way to save. ⭐ C8b · a number the book already holds — or BLOCKS — when the save reads it is
 * answered from that one read, before any write, so a held number and a blocked one take the same path (and the same
 * time); the index still refuses a row that lands between the read and the create.
 * ⛔ NEVER LINKED TO A PLAYER. The builder sets `userId: null` whatever number it is given, even one a player holds:
 * a link is a fact only sign-up records, and a form that linked would put "Player" on the row — D19's oracle.
 * 🔴 D19 · A PLAYER'S NUMBER ANSWERS EXACTLY LIKE A STRANGER'S. The lookup's three keys name no account, and the
 * mirrored consent leaves this module only through `contactAddReply`, which hands it to a reader alone (A1.1).
 * ⭐ C8b (B1 · B2, Ali's ruling of 2026-10-09: "an erased person's number stays blocked until its holder signs up or agrees
 * to offers again") · THE BOOK BLOCKS AN ERASED NUMBER, AND A BLOCKED NUMBER ANSWERS EXACTLY LIKE ONE ALREADY IN THE BOOK.
 * `bookBlocks` is the ONE test, asked of one number: its tombstone (`sourceRef = "erasure"`, decision C3 — a book row
 * decides alone), or with no book row an erasure standing on it (C8a's ONE rule, `erasure-mark.ts`: the latest of the
 * number's GIVEN rows and erasure markers is a marker — a later opt-out tap never lifts it; a GIVEN does, and so does a
 * NEW ACCOUNT registering the number, which revives the tombstone as its own row, `registration-contact.ts`). The lookup
 * and the save answer such a number "already in the book" (`CONTACT_DUPLICATE`, reason `duplicate`) and write nothing —
 * 🔴 until C8b they answered "This number can't be added to the book", the one sentence in the console that said a
 * number's holder had asked to be erased (X22). A blocked number carries NO contact id — there is no row anybody may open
 * — and neither does ANY answer handed to a viewer who may not read a number (`contactLookupReply`, `contactAddReply`):
 * the "Open the existing contact" link is a READER's control, so to a masked officer an ordinary duplicate, a player's
 * number and an erased one are the same sentence and nothing else. An erased row is MISSING to the edit
 * (`findEditableContact`), so no officer can write a name back onto an erased person's number.
 * ⚠️ The ledger is asked BEFORE the create, while a tombstone is also refused by the unique index at the write itself: an
 * erasure whose marker lands between this check and the create is not refused — a window of milliseconds, recorded for
 * C8, not closed here.
 * ⭐ THE EDIT IS COMPARE-AND-SET (`updateIfUnchanged` in both twins, decision C25): two officers editing one contact
 * cannot silently overwrite each other — the second save is refused as stale. It writes the four fields and the
 * stamp, and never the number, `sourceRef`, the link, the caches or the provenance.
 * ⭐ vb7 · AN EDIT THAT CHANGES NOTHING WRITES NOTHING: no stamp moves (another officer's open dialog stays valid) and no
 * audit row is written with no fields. Every saved edit answers with the fields it changed, for the dialog's toast.
 * ⛔ vb7 review M1 · …AND NONE OF THAT MAY DEPEND ON THE HIDDEN EMAIL. A stale token is refused FIRST, before anything
 * typed is compared with the row, and a submitted replacement email ALWAYS counts as changed and is written — so a masked
 * officer cannot learn whether a typed address equals the stored one from "nothing changed" against "stale".
 * ⛔ vb7 · THE RAW NUMBER TEXT HAS A LENGTH (`contactNumberTooLong`, the importer's limit, C12): a paste longer than any
 * phone number is refused, never parsed for the number inside it and cut into `rawInput`; and the builder cleans the
 * text it keeps of invisible and control characters, so a NUL cannot fail the insert as "Saving the contact failed".
 * ⛔ THE AUDIT NAMES THE MASKED NUMBER AND THE FIELD NAMES — never the digits, the name, the email or the notes.
 *
 * Guard: `test:contacts-form` (§2–§5, executed on the memory twin) · `test:dal-parity` §22 (the two CAS twins).
 */
import { randomBytes } from "node:crypto";
import { db } from "@/lib/server/store";
import type { ContactConsentState, ContactEditPatch, ContactSource, StoredMarketingContact } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { mirrorContactCache } from "@/lib/server/marketing/contact-cache";
import { isErasedNumber } from "@/lib/marketing/erasure-mark";
import { parseTzNumber } from "@/lib/tz-msisdn";
import type { TzNumber } from "@/lib/tz-msisdn";
import { maskPhone } from "@/lib/phone-normalize";
import { CONTACT_LIMITS, charCount, cleanDisplayName, contactFormDraft } from "@/lib/contacts/contact-fields";
import type { ContactFormFieldKey } from "@/lib/contacts/contact-fields";
import { CONTACT_PASTE_TOO_LONG, contactNumberTooLong } from "@/lib/contacts/contact-number";

/* ═══ THE WIRE SHAPES ═══════════════════════════════════════════════════════════════════════════ */

/** What the add form posts. ⛔ Exactly these keys — no consent, no link, no source: the action re-types each one. */
export type ContactAddRequest = {
  /** The RAW text: the paste when the last edit was a paste, else the field's digits. Parsed HERE, again. */
  number: string;
  displayName: string;
  email: string;
  notes: string;
  tags: string;
};

/**
 * What the edit form posts. `email`: null KEEPS the stored address (the dialog never holds it — a stored email renders
 * only through `<Sensitive field="contactEmail">`), "" removes it, any other text replaces it.
 */
export type ContactEditRequest = {
  id: string;
  displayName: string;
  email: string | null;
  notes: string;
  tags: string;
  /** The row's `updatedAt` as the dialog was rendered — the compare in compare-and-set. */
  expectedUpdatedAt: string;
};

/** The form's fields, as their `data-field` names them (`focusFirstInvalid`). */
export type ContactFormField = "number" | "displayName" | "email" | "notes" | "tags";

/** ⛔ EXACTLY THREE KEYS, and none names an account, a name or a consent (D19): a player's number and a stranger's
 *  get the same answer. ⭐ C8b (B2) · a number the book BLOCKS is a `duplicate` too, with no id (there is no row anybody
 *  may open); `existingId` is a READER's — a viewer who may not read a number gets every duplicate with none
 *  (`contactLookupReply`). */
export type ContactNumberLookup =
  | { state: "free"; sentence: null; existingId: null }
  | { state: "duplicate"; sentence: string; existingId: string | null }
  | { state: "refused"; sentence: string; existingId: null };

export type ContactAddResult =
  /** `consent` is the row's mirrored cache — it leaves the server only through `contactAddReply` (A1.1). */
  | { ok: true; id: string; consent: ContactConsentState }
  | { ok: false; reason: "invalid_number"; field: "number"; error: string }
  /** ⭐ C8b (B2) · `existingId` is null for a number the book BLOCKS (an erasure — nothing to open), and for every viewer
   *  who may not read a number (`contactAddReply`). */
  | { ok: false; reason: "duplicate"; field: "number"; error: string; existingId: string | null }
  | { ok: false; reason: "invalid_field"; field: ContactFormField; error: string };

/** What the add ACTION hands the browser. `consent` is present for a reader ONLY; a duplicate's id too. */
export type ContactAddReply =
  | { ok: true; id: string; consent?: ContactConsentState }
  | Exclude<ContactAddResult, { ok: true }>;

export type ContactEditResult =
  /** `changed`: the fields this save changed, in the dialog's order — none when nothing needed saving (vb7: then
   *  nothing was written, and `updatedAt` is the row's own). */
  | { ok: true; id: string; updatedAt: string; changed: ContactFormFieldKey[] }
  /** Unknown — or erased (A1.7): the same answer, so the refusal is no erasure oracle. */
  | { ok: false; reason: "missing"; error: string }
  | { ok: false; reason: "stale"; error: string }
  | { ok: false; reason: "invalid_field"; field: ContactFormField; error: string };

/* ═══ THE SENTENCES THE SERVICE SAYS ═══════════════════════════════════════════════════════════ */

/** ⭐ The same words for every duplicate — a player's number included (D19) — and, since C8b (B2), for a number the book
 *  blocks because its holder was erased (X22): one sentence, never a word about why. */
export const CONTACT_DUPLICATE = "This number is already in the book.";
/** An edit of a row that is not there — or is erased (A1.7). The dialog's missing state says the same. */
export const CONTACT_MISSING = "This contact isn't in the book.";
export const CONTACT_STALE =
  "Someone changed this contact after you opened it, so nothing was saved. Reload to see the latest version, then make your change again.";

/* ═══ THE FIELDS — the ONE form rule (`contactFormDraft`, contact-fields.ts) ════════════════════════ */

export type ContactFields = { displayName: string | null; email: string | null; tags: string[]; notes: string | null };
export type ContactFieldsVerdict =
  | { ok: true; value: ContactFields }
  | { ok: false; field: ContactFormField; error: string };

/**
 * The four fields, cleaned and checked — by `contactFormDraft` (vb5 moved the form's rule and its words to
 * `contact-fields.ts`, pure and client-safe, so the dialog can ask the very same rule in the browser; this file imports
 * node:crypto and cannot run there). The first problem in the dialog's order is the one a refusal names. Name: NFC,
 * invisible characters out, spaces collapsed, NO phone number, ≤ 120 characters. Email: THE ONE EMAIL RULE
 * (`checkContactEmail`'s). Notes: ≤ 1000. Tags: split on `,` `;` `|`, THE ONE TAG RULE (no phone number), stored lower
 * case, ≤ 32 characters each and 20 per contact. Empty is null (tags: []).
 * ⛔ vb5 · the wording is the form's own and follows the rule that fired — a short name holding a number is told so, never
 * "at most 120 characters" (this file mapped every name problem to the length sentence).
 */
export function contactFormFields(input: { displayName: string; email: string; notes: string; tags: string }): ContactFieldsVerdict {
  const drafted = contactFormDraft(input);
  const first = drafted.problems[0];
  if (first !== undefined) return { ok: false, field: first.field, error: first.sentence };
  const v = drafted.values;
  return { ok: true, value: { displayName: v.displayName, email: v.email, tags: [...v.tags], notes: v.notes } };
}

/* ═══ THE ONE CREATE BUILDER (decision X6) ═══════════════════════════════════════════════════════ */

/** What a new book row is made of — every field NAMED, every value already decided by its writer. ⛔ There is no
 *  consent, no cache and no link here: the builder writes those itself, and only as "nothing known yet". */
export type NewContactFields = {
  /** parseTzNumber's own answer for the raw text — it must be `ok`. */
  number: TzNumber;
  /** What the officer actually typed or pasted, or the file's cell (kept cleaned of invisible and control characters,
   *  clipped to `CONTACT_LIMITS.phone` — `cleanRawInput`). */
  rawInput: string;
  displayName: string | null;
  email: string | null;
  tags: readonly string[];
  notes: string | null;
  source: ContactSource;
  /** An import run's id (X6), `null` for a typed contact. */
  sourceRef: string | null;
  importId: string | null;
  officerId: string | null;
  at: string;
};

/** A contact id: `mc_` and sixteen letters. ⛔ No digit, ever — an id travels in an address (`?edit=`), and an id that
 *  could hold a nine-digit run would look like a phone number in a URL, a log or a scan for one. */
export function newContactId(): string {
  return `mc_${Array.from(randomBytes(16), (b) => String.fromCharCode(97 + (b % 26))).join("")}`;
}

const clipChars = (s: string, limit: number): string => (charCount(s) > limit ? Array.from(s).slice(0, limit).join("") : s);

/**
 * ⛔ vb7 · THE RAW TEXT AS A ROW KEEPS IT: invisible format and control characters out — a NUL failed Postgres' insert
 * as "Saving the contact failed" — whitespace collapsed and trimmed, by the ONE cleaner a stored name takes
 * (`cleanDisplayName`), then clipped to the limits table's phone length. The digits a person typed are kept as typed.
 */
export function cleanRawInput(raw: string): string {
  return clipChars(cleanDisplayName(String(raw ?? "")) ?? "", CONTACT_LIMITS.phone);
}

/**
 * ⭐ THE ONE PLACE A NEW `StoredMarketingContact` IS SHAPED. The form, the importer's commit (U31/U32) and U33 call it;
 * none builds a row of its own.
 * ⛔ `userId` is null and the caches are UNKNOWN / null, whatever the caller holds: a link is sign-up's fact, and the
 * caches are the ledger's and the stop list's — `mirrorContactCache` writes them after the create (C4).
 * ⛔ `operator` is null: the brand is derived at render from `ndc` through the ONE table, because brands drift.
 */
export function newContactRow(fields: NewContactFields, id: string = newContactId()): StoredMarketingContact {
  const n = fields.number;
  if (n.verdict !== "ok" || n.msisdn === null || n.ndc === null) {
    throw new Error("newContactRow: only a number parseTzNumber calls ok becomes a book row");
  }
  return {
    id,
    msisdn: n.msisdn,
    rawInput: cleanRawInput(fields.rawInput),
    displayName: fields.displayName,
    email: fields.email,
    ndc: n.ndc,
    operator: null,
    source: fields.source,
    sourceRef: fields.sourceRef,
    userId: null,
    consentState: "UNKNOWN",
    suppressedAt: null,
    tags: [...fields.tags],
    notes: fields.notes,
    importId: fields.importId,
    createdAt: fields.at,
    createdBy: fields.officerId,
    updatedAt: fields.at,
    updatedBy: fields.officerId,
  };
}

/* ═══ ERASED ROWS (C3, A1.7) — AND ERASED NUMBERS WITH NO ROW (C8a): THE BOOK BLOCKS THEM (C8b · B1) ══════════════ */

/** Is this book ROW the erased tombstone? A row decides alone (`isErasedNumber` with a row). Its callers hold a row: the
 *  edit's opener, the create the index refused, and sign-up's writer (`registration-contact.ts`, which revives it). */
export function isErasedContact(row: Pick<StoredMarketingContact, "sourceRef">): boolean {
  return isErasedNumber(row, false);
}

/** What the book holds for one number, and whether it BLOCKS it. */
export type BookBlock = { existing: StoredMarketingContact | null; blocked: boolean };

/**
 * ⭐ C8b (B1) · THE ONE TEST "DOES THE BOOK BLOCK THIS NUMBER?" — "may a name be written onto it?" — asked of one number
 * by every writer that would add one (the Add form's lookup and its save). The number is BLOCKED when its book row is
 * the erasure's tombstone, or — with no book row — an erasure STANDS on it (C8a's ONE rule): `erasure-mark.ts`'s
 * `isErasedNumber`, the very function the importer's decide() asks over the same facts (`loadImportFacts` reads the book
 * rows and `messagingConsent.erasureStandsAmong` for a whole step), so the importer and the form can never disagree. A
 * book row decides alone — the tombstone blocks whatever the ledger says, and an ordinary row (a NEW client's, revived
 * from the tombstone at sign-up, among them) never does. The block is lifted only by the holder's own act: a later GIVEN
 * (the ledger), or a new account registering the number (`registration-contact.ts`).
 * ⛔ BOTH READS FOR EVERY NUMBER, a row or none: the ledger is asked even when a row decides alone, so a number held by an
 * ordinary row and one held by an erasure take the same reads — the answer's timing says no more than its words.
 */
export async function bookBlocks(msisdn: string): Promise<BookBlock> {
  const existing = await db.marketingContact.findByMsisdn(msisdn);
  const stands = (await db.messagingConsent.erasureStandsAmong({ channel: "SMS", category: "MARKETING", identifiers: [msisdn] })).includes(msisdn);
  return { existing, blocked: isErasedNumber(existing, stands) };
}

/** A contact id as the store mints them (`newContactId`; the dev seed's `mc_seed_000`). Anything else is read as
 *  nothing, without asking the store. */
const CONTACT_ID_SHAPE = /^[A-Za-z0-9_-]{1,64}$/;

/** ⭐ THE ONE ANSWER TO "MAY THIS ROW BE OPENED FOR EDITING?" — the `?edit=` loader and `editContact` both ask it: null
 *  for an id that is not a contact id, for a row that is not there, and for an ERASED row (A1.7). */
export async function findEditableContact(id: string): Promise<StoredMarketingContact | null> {
  const key = String(id ?? "");
  if (!CONTACT_ID_SHAPE.test(key)) return null;
  const row = await db.marketingContact.find(key);
  return row === null || isErasedContact(row) ? null : row;
}

/* ═══ THE LOOKUP — the officer's early answer, never the decision ════════════════════════════════ */

/**
 * Before Save: is this number refused, already in the book, or free? ⛔ A convenience — `addContact`'s create is the
 * check. 🔴 D19: the answer has exactly three keys and is the same for a player's number as for a stranger's.
 * ⭐ C8b (B2) · a number the book BLOCKS (`bookBlocks`: its tombstone, or with no book row an erasure standing on it) is
 * "already in the book" too — the same state and sentence, and NO id: there is no row anybody may open. Only a READER is
 * handed the id of a row they may open (`contactLookupReply`).
 */
export async function lookupContactNumber(number: string): Promise<ContactNumberLookup> {
  const parsed = parseTzNumber(String(number ?? ""));
  if (parsed.verdict !== "ok" || parsed.msisdn === null) return { state: "refused", sentence: parsed.reason, existingId: null };
  const { existing, blocked } = await bookBlocks(parsed.msisdn);
  if (blocked) return { state: "duplicate", sentence: CONTACT_DUPLICATE, existingId: null };
  if (existing === null) return { state: "free", sentence: null, existingId: null };
  return { state: "duplicate", sentence: CONTACT_DUPLICATE, existingId: existing.id };
}

/**
 * ⭐ C8b (B2) · WHAT THE LOOKUP ACTION HANDS THE BROWSER. A duplicate's id is the "Open the existing contact" link — a
 * READER's control: to a viewer who may not read a number it would hand the row that holds a number they typed, and the
 * absence of one would mark the number an erased person's. So that viewer is told every duplicate with `existingId: null`
 * — an ordinary contact, a player's number and an erased one read the same sentence and nothing else.
 */
export function contactLookupReply(lookup: ContactNumberLookup, reads: boolean): ContactNumberLookup {
  if (reads || lookup.state !== "duplicate") return lookup;
  return { state: "duplicate", sentence: lookup.sentence, existingId: null };
}

/* ═══ ADD ════════════════════════════════════════════════════════════════════════════════════════ */

const filledFields = (f: ContactFields): string[] =>
  [
    f.displayName !== null ? "displayName" : null,
    f.email !== null ? "email" : null,
    f.notes !== null ? "notes" : null,
    f.tags.length > 0 ? "tags" : null,
  ].filter((k): k is string => k !== null);

/** The duplicate answer: the row that holds the number named for a reader — or, for a number the book BLOCKS, the same
 *  sentence with no id (C8b · B2). */
const duplicateOf = (existing: StoredMarketingContact | null, blocked: boolean): ContactAddResult => ({
  ok: false, reason: "duplicate", field: "number", error: CONTACT_DUPLICATE, existingId: blocked || existing === null ? null : existing.id,
});

/** A create the index refused: the row that holds the number — answered as `duplicateOf` answers a read. */
async function takenRefusal(msisdn: string): Promise<ContactAddResult> {
  const existing = await db.marketingContact.findByMsisdn(msisdn);
  // ⛔ A refusal with no row behind it is not a duplicate this module can name (an id collision, in theory). Say
  // nothing false: it throws, and the action answers that saving failed.
  if (existing === null) throw new Error("the book refused the contact but holds no row for its number");
  return duplicateOf(existing, isErasedContact(existing));
}

/**
 * One contact, added by an officer. The number is parsed HERE from the raw text (the dialog's verdict is display
 * only); the fields go through the ONE drafting rule; a number the book already holds or BLOCKS (C3 · C8a · C8b —
 * `bookBlocks`) is answered "already in the book" from that read; the row is built by `newContactRow` from named values
 * — never from the request; the unique index decides a duplicate that lands after the read; `mirrorContactCache` sets the
 * caches from the truth; and one audit row names the masked number and which fields were filled.
 */
export async function addContact(request: ContactAddRequest, officerId: string, now: Date = new Date()): Promise<ContactAddResult> {
  const raw = String(request.number ?? "");
  // ⛔ vb7 · longer than any phone number is written (C12, the importer's limit): refused whole — never parsed for the
  // number inside it, and never cut into the row's raw text.
  if (contactNumberTooLong(raw)) return { ok: false, reason: "invalid_number", field: "number", error: CONTACT_PASTE_TOO_LONG };
  const parsed = parseTzNumber(raw);
  if (parsed.verdict !== "ok" || parsed.msisdn === null) {
    return { ok: false, reason: "invalid_number", field: "number", error: parsed.reason };
  }
  const fields = contactFormFields({
    displayName: request.displayName, email: request.email, notes: request.notes, tags: request.tags,
  });
  if (!fields.ok) return { ok: false, reason: "invalid_field", field: fields.field, error: fields.error };
  // ⛔ C3 · C8a · C8b · a number the book BLOCKS is never added by hand — its tombstone, or with no book row an erasure
  // standing on it (the importer's own question) — and it answers exactly as a number already in the book: one read,
  // one sentence, no id. A number a row already holds answers from the same read, so the two take one path.
  const { existing, blocked } = await bookBlocks(parsed.msisdn);
  if (blocked || existing !== null) return duplicateOf(existing, blocked);

  const at = now.toISOString();
  const row = newContactRow({
    number: parsed,
    rawInput: raw,
    displayName: fields.value.displayName,
    email: fields.value.email,
    tags: fields.value.tags,
    notes: fields.value.notes,
    source: "OPERATOR",
    sourceRef: null,
    importId: null,
    officerId,
    at,
  });
  const created = await db.marketingContact.create(row);
  if (created === null) return takenRefusal(parsed.msisdn);

  // ⭐ THE CACHES FROM THE TRUTH (C4): the ledger's latest word and the active stop, through the ONE mirror.
  await mirrorContactCache(parsed.msisdn, at);
  const saved = await db.marketingContact.find(created.id);
  await audit({
    category: "ADMIN",
    action: "contacts.contact.added",
    actorId: officerId,
    targetType: "MarketingContact",
    targetId: created.id,
    payload: { number: maskPhone(parsed.msisdn), fields: filledFields(fields.value) },
  });
  return { ok: true, id: created.id, consent: saved?.consentState ?? created.consentState };
}

/**
 * 🔴 D19 / A1.1 · THE MIRRORED CONSENT IS A PLAYER SIGNAL. Until U33 a GIVEN or WITHDRAWN ledger row can only be a
 * player's (sign-up, profile, opt-out) or an erasure's, so the consent a new row reads back answers "is this a
 * player?" for a number the officer typed. It travels to a viewer whose identity.contact cell is `read`, and to
 * nobody else — the key is absent from a masked viewer's reply, not merely hidden.
 * ⭐ C8b (B2) · …AND A DUPLICATE'S ID IS A READER'S TOO: the masked viewer's refusal carries `existingId: null` whatever
 * holds the number — the same reply for an ordinary contact, a player's number and an erased one (`contactLookupReply`'s
 * rule, at Save).
 */
export function contactAddReply(result: ContactAddResult, reads: boolean): ContactAddReply {
  if (!result.ok) {
    if (reads || result.reason !== "duplicate") return result;
    return { ...result, existingId: null };
  }
  return reads ? { ok: true, id: result.id, consent: result.consent } : { ok: true, id: result.id };
}

/* ═══ EDIT — compare-and-set ═════════════════════════════════════════════════════════════════════ */

/**
 * The fields an edit changed, in the dialog's order. ⛔ vb7 review M1 · `emailSubmitted`: a replacement address typed
 * into the box ALWAYS counts as "email" — compared by value, the answer would say whether the typed address equals the
 * hidden one, to an officer who may not read it.
 */
const changedFields = (before: StoredMarketingContact, after: StoredMarketingContact, emailSubmitted: boolean): ContactFormFieldKey[] => {
  const out: ContactFormFieldKey[] = [];
  if (before.displayName !== after.displayName) out.push("displayName");
  if (emailSubmitted || before.email !== after.email) out.push("email");
  if (before.notes !== after.notes) out.push("notes");
  if (JSON.stringify(before.tags) !== JSON.stringify(after.tags)) out.push("tags");
  return out;
};

/**
 * One contact's name, email, notes and tags, changed — ONLY if nobody changed the row since the dialog was rendered.
 * ⛔ An unknown or ERASED row is MISSING (A1.7). ⛔ The number, `sourceRef`, the link, the caches and the provenance
 * are not in the patch at all (`ContactEditPatch` has no key for them).
 */
export async function editContact(request: ContactEditRequest, officerId: string, now: Date = new Date()): Promise<ContactEditResult> {
  const row = await findEditableContact(request.id);
  if (row === null) return { ok: false, reason: "missing", error: CONTACT_MISSING };

  const keepEmail = request.email === null;
  const fields = contactFormFields({
    displayName: request.displayName, email: keepEmail ? "" : String(request.email ?? ""), notes: request.notes, tags: request.tags,
  });
  if (!fields.ok) return { ok: false, reason: "invalid_field", field: fields.field, error: fields.error };

  // An unreadable token can match no row: refused as stale, never handed to a database that would throw on it.
  // ⛔ vb7 review M1 · …and a token that is not the row's own stamp is refused HERE, FIRST — before anything typed is
  // compared with the row. Asked after the "nothing changed" test, a stale save with the right guess at a hidden email
  // answered "nothing changed" (no write, no audit row) and a wrong guess "stale": an oracle on the address.
  const expected = String(request.expectedUpdatedAt ?? "");
  const expectedAt = Date.parse(expected);
  if (!Number.isFinite(expectedAt) || expectedAt !== Date.parse(row.updatedAt)) return { ok: false, reason: "stale", error: CONTACT_STALE };
  // ⭐ vb7 · NOTHING CHANGED IS NOTHING WRITTEN: the stamp stays (another officer's open dialog stays valid), and no
  // audit row is written that names no field. The answer says so, by naming none. ⛔ A submitted email is a change by
  // definition (`changedFields`), whatever it equals.
  const wanted: StoredMarketingContact = {
    ...row,
    displayName: fields.value.displayName,
    email: keepEmail ? row.email : fields.value.email,
    notes: fields.value.notes,
    tags: fields.value.tags,
  };
  if (changedFields(row, wanted, !keepEmail).length === 0) return { ok: true, id: row.id, updatedAt: row.updatedAt, changed: [] };
  // ⭐ A WRITE IN THE SAME MILLISECOND AS THE LAST ONE MUST STILL MOVE `updatedAt`, or a second edit carrying the same
  // token would pass the compare: at = the later of now and the row's own stamp + 1 ms.
  const at = new Date(Math.max(now.getTime(), Date.parse(row.updatedAt) + 1)).toISOString();
  const patch: ContactEditPatch = {
    displayName: fields.value.displayName,
    ...(keepEmail ? {} : { email: fields.value.email }),
    notes: fields.value.notes,
    tags: fields.value.tags,
    updatedBy: officerId,
  };
  const cas = await db.marketingContact.updateIfUnchanged(row.id, patch, { expectedUpdatedAt: expected }, at);
  if (!cas.ok) {
    return cas.reason === "stale"
      ? { ok: false, reason: "stale", error: CONTACT_STALE }
      : { ok: false, reason: "missing", error: CONTACT_MISSING };
  }
  const changed = changedFields(row, cas.row, !keepEmail);
  await audit({
    category: "ADMIN",
    action: "contacts.contact.edited",
    actorId: officerId,
    targetType: "MarketingContact",
    targetId: row.id,
    payload: { number: maskPhone(row.msisdn), fields: changed },
  });
  return { ok: true, id: row.id, updatedAt: cas.row.updatedAt, changed };
}
