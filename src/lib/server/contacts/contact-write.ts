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
 * twins — a race included) is a refusal carrying the existing row's id. The lookup before Save is a convenience for
 * the officer, never the decision, and there is no second way to save.
 * ⛔ NEVER LINKED TO A PLAYER. The builder sets `userId: null` whatever number it is given, even one a player holds:
 * a link is a fact only sign-up records, and a form that linked would put "Player" on the row — D19's oracle.
 * 🔴 D19 · A PLAYER'S NUMBER ANSWERS EXACTLY LIKE A STRANGER'S. The lookup's three keys name no account, and the
 * mirrored consent leaves this module only through `contactAddReply`, which hands it to a reader alone (A1.1).
 * ⛔ ERASED ROWS (`sourceRef = "erasure"`, decision C3, amendment A1.7). Adding an erased number refuses with ONE
 * sentence and NO id — there is nothing to open — and an erased row is MISSING to the edit (`findEditableContact`),
 * so no officer can write a name back onto an erased person's number.
 * ⭐ THE EDIT IS COMPARE-AND-SET (`updateIfUnchanged` in both twins, decision C25): two officers editing one contact
 * cannot silently overwrite each other — the second save is refused as stale. It writes the four fields and the
 * stamp, and never the number, `sourceRef`, the link, the caches or the provenance.
 * ⛔ THE AUDIT NAMES THE MASKED NUMBER AND THE FIELD NAMES — never the digits, the name, the email or the notes.
 *
 * Guard: `test:contacts-form` (§2–§5, executed on the memory twin) · `test:dal-parity` §22 (the two CAS twins).
 */
import { randomBytes } from "node:crypto";
import { db } from "@/lib/server/store";
import type { ContactConsentState, ContactEditPatch, ContactSource, StoredMarketingContact } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { mirrorContactCache } from "@/lib/server/marketing/contact-cache";
import { ERASURE_EVIDENCE } from "@/lib/marketing/erasure-mark";
import { parseTzNumber } from "@/lib/tz-msisdn";
import type { TzNumber } from "@/lib/tz-msisdn";
import { maskPhone } from "@/lib/phone-normalize";
import { CONTACT_LIMITS, charCount, draftContactRow } from "@/lib/contacts/contact-fields";
import type { ColumnMapping, FieldProblem, ImportFieldKey } from "@/lib/contacts/contact-fields";

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
 *  get the same answer. */
export type ContactNumberLookup =
  | { state: "free"; sentence: null; existingId: null }
  | { state: "duplicate"; sentence: string; existingId: string }
  | { state: "refused"; sentence: string; existingId: null };

export type ContactAddResult =
  /** `consent` is the row's mirrored cache — it leaves the server only through `contactAddReply` (A1.1). */
  | { ok: true; id: string; consent: ContactConsentState }
  | { ok: false; reason: "invalid_number"; field: "number"; error: string }
  | { ok: false; reason: "duplicate"; field: "number"; error: string; existingId: string }
  /** ⛔ No id: an erased row opens nothing (A1.7). */
  | { ok: false; reason: "erased"; field: "number"; error: string }
  | { ok: false; reason: "invalid_field"; field: ContactFormField; error: string };

/** What the add ACTION hands the browser. `consent` is present for a reader ONLY. */
export type ContactAddReply =
  | { ok: true; id: string; consent?: ContactConsentState }
  | Exclude<ContactAddResult, { ok: true }>;

export type ContactEditResult =
  | { ok: true; id: string; updatedAt: string }
  /** Unknown — or erased (A1.7): the same answer, so the refusal is no erasure oracle. */
  | { ok: false; reason: "missing"; error: string }
  | { ok: false; reason: "stale"; error: string }
  | { ok: false; reason: "invalid_field"; field: ContactFormField; error: string };

/* ═══ THE SENTENCES THE SERVICE SAYS ═══════════════════════════════════════════════════════════ */

/** ⭐ The same words for every duplicate — a player's number included (D19). */
export const CONTACT_DUPLICATE = "This number is already in the book.";
/** ⛔ C3 · an erased number: one sentence, nothing to open, and no word about why. */
export const CONTACT_ERASED = "This number can't be added to the book.";
/** An edit of a row that is not there — or is erased (A1.7). The dialog's missing state says the same. */
export const CONTACT_MISSING = "This contact isn't in the book.";
export const CONTACT_STALE =
  "Someone changed this contact after you opened it, so nothing was saved. Reload to see the latest version, then make your change again.";

const NAME_TOO_LONG = `A name can be at most ${CONTACT_LIMITS.displayName} characters.`;
const EMAIL_TOO_LONG = `An email address can be at most ${CONTACT_LIMITS.email} characters.`;
const EMAIL_SHAPE = "This doesn't look like an email address (name@example.com).";
const NOTES_TOO_LONG = `Notes can be at most ${CONTACT_LIMITS.notes} characters.`;

/* ═══ THE FIELDS — the importer's ONE drafting rule (U28, decisions C11 and C12) ═════════════════ */

/** The form's four fields as a row of cells, so `draftContactRow` — the rule every writer of a row shares — reads
 *  them exactly as it reads an imported row: one limits table, one tag rule, one email rule. */
const FORM_MAPPING: ColumnMapping = { name: 0, email: 1, tags: 2, notes: 3 };
/** The order the dialog draws them in: the first problem in this order is the one a refusal names. */
const FORM_ORDER: readonly ImportFieldKey[] = ["name", "email", "notes", "tags"];
const FORM_FIELD: Partial<Record<ImportFieldKey, ContactFormField>> = {
  name: "displayName", email: "email", notes: "notes", tags: "tags",
};

export type ContactFields = { displayName: string | null; email: string | null; tags: string[]; notes: string | null };
export type ContactFieldsVerdict =
  | { ok: true; value: ContactFields }
  | { ok: false; field: ContactFormField; error: string };

/** One problem, in the form's words. The RULE is `draftContactRow`'s; only the wording is the form's own ("a name",
 *  not "the Name cell"), and a tag problem keeps `checkTags`' sentence, which already speaks to a person. */
function formSentence(p: FieldProblem, email: string | null): string {
  if (p.field === "name") return NAME_TOO_LONG;
  if (p.field === "email") return email !== null && charCount(email) > CONTACT_LIMITS.email ? EMAIL_TOO_LONG : EMAIL_SHAPE;
  if (p.field === "notes") return NOTES_TOO_LONG;
  return p.sentence;
}

/**
 * The four fields, cleaned and checked. Name: NFC, invisible characters out, spaces collapsed, ≤ 120 characters.
 * Email: trimmed, lower case, ≤ 254, the importer's shape. Notes: ≤ 1000. Tags: `splitTags` + `checkTags` — split on
 * `,` `;` `|`, stored lower case, ≤ 32 characters each and 20 per contact. Empty is null (tags: []).
 */
export function contactFormFields(input: { displayName: string; email: string; notes: string; tags: string }): ContactFieldsVerdict {
  const drafted = draftContactRow(
    [String(input.displayName ?? ""), String(input.email ?? ""), String(input.tags ?? ""), String(input.notes ?? "")],
    FORM_MAPPING,
  );
  for (const key of FORM_ORDER) {
    const problem = drafted.problems.find((p) => p.field === key);
    const field = FORM_FIELD[key];
    if (problem !== undefined && field !== undefined) return { ok: false, field, error: formSentence(problem, drafted.email) };
  }
  return { ok: true, value: { displayName: drafted.displayName, email: drafted.email, tags: drafted.tags, notes: drafted.notes } };
}

/* ═══ THE ONE CREATE BUILDER (decision X6) ═══════════════════════════════════════════════════════ */

/** What a new book row is made of — every field NAMED, every value already decided by its writer. ⛔ There is no
 *  consent, no cache and no link here: the builder writes those itself, and only as "nothing known yet". */
export type NewContactFields = {
  /** parseTzNumber's own answer for the raw text — it must be `ok`. */
  number: TzNumber;
  /** What the officer actually typed or pasted, or the file's cell (kept, clipped to `CONTACT_LIMITS.phone`). */
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
    rawInput: clipChars(String(fields.rawInput ?? "").trim(), CONTACT_LIMITS.phone),
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

/* ═══ ERASED ROWS (C3, A1.7) ═════════════════════════════════════════════════════════════════════ */

export function isErasedContact(row: Pick<StoredMarketingContact, "sourceRef">): boolean {
  return row.sourceRef === ERASURE_EVIDENCE;
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
 * ⛔ An erased row is refused with C3's one sentence and NO id.
 */
export async function lookupContactNumber(number: string): Promise<ContactNumberLookup> {
  const parsed = parseTzNumber(String(number ?? ""));
  if (parsed.verdict !== "ok" || parsed.msisdn === null) return { state: "refused", sentence: parsed.reason, existingId: null };
  const existing = await db.marketingContact.findByMsisdn(parsed.msisdn);
  if (existing === null) return { state: "free", sentence: null, existingId: null };
  if (isErasedContact(existing)) return { state: "refused", sentence: CONTACT_ERASED, existingId: null };
  return { state: "duplicate", sentence: CONTACT_DUPLICATE, existingId: existing.id };
}

/* ═══ ADD ════════════════════════════════════════════════════════════════════════════════════════ */

const filledFields = (f: ContactFields): string[] =>
  [
    f.displayName !== null ? "displayName" : null,
    f.email !== null ? "email" : null,
    f.notes !== null ? "notes" : null,
    f.tags.length > 0 ? "tags" : null,
  ].filter((k): k is string => k !== null);

/** A create the index refused: the row that holds the number, named — or, for an erased row, one sentence and no id. */
async function takenRefusal(msisdn: string): Promise<ContactAddResult> {
  const existing = await db.marketingContact.findByMsisdn(msisdn);
  // ⛔ A refusal with no row behind it is not a duplicate this module can name (an id collision, in theory). Say
  // nothing false: it throws, and the action answers that saving failed.
  if (existing === null) throw new Error("the book refused the contact but holds no row for its number");
  if (isErasedContact(existing)) return { ok: false, reason: "erased", field: "number", error: CONTACT_ERASED };
  return { ok: false, reason: "duplicate", field: "number", error: CONTACT_DUPLICATE, existingId: existing.id };
}

/**
 * One contact, added by an officer. The number is parsed HERE from the raw text (the dialog's verdict is display
 * only); the fields go through the ONE drafting rule; the row is built by `newContactRow` from named values — never
 * from the request; the unique index decides duplicates; `mirrorContactCache` sets the caches from the truth; and
 * one audit row names the masked number and which fields were filled.
 */
export async function addContact(request: ContactAddRequest, officerId: string, now: Date = new Date()): Promise<ContactAddResult> {
  const raw = String(request.number ?? "");
  const parsed = parseTzNumber(raw);
  if (parsed.verdict !== "ok" || parsed.msisdn === null) {
    return { ok: false, reason: "invalid_number", field: "number", error: parsed.reason };
  }
  const fields = contactFormFields({
    displayName: request.displayName, email: request.email, notes: request.notes, tags: request.tags,
  });
  if (!fields.ok) return { ok: false, reason: "invalid_field", field: fields.field, error: fields.error };

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
 */
export function contactAddReply(result: ContactAddResult, reads: boolean): ContactAddReply {
  if (!result.ok) return result;
  return reads ? { ok: true, id: result.id, consent: result.consent } : { ok: true, id: result.id };
}

/* ═══ EDIT — compare-and-set ═════════════════════════════════════════════════════════════════════ */

const changedFields = (before: StoredMarketingContact, after: StoredMarketingContact): string[] =>
  [
    before.displayName !== after.displayName ? "displayName" : null,
    before.email !== after.email ? "email" : null,
    before.notes !== after.notes ? "notes" : null,
    before.tags.join("\n") !== after.tags.join("\n") ? "tags" : null,
  ].filter((k): k is string => k !== null);

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
  const expected = String(request.expectedUpdatedAt ?? "");
  if (!Number.isFinite(Date.parse(expected))) return { ok: false, reason: "stale", error: CONTACT_STALE };
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
  await audit({
    category: "ADMIN",
    action: "contacts.contact.edited",
    actorId: officerId,
    targetType: "MarketingContact",
    targetId: row.id,
    payload: { number: maskPhone(row.msisdn), fields: changedFields(row, cas.row) },
  });
  return { ok: true, id: row.id, updatedAt: cas.row.updatedAt };
}
