/**
 * test:contacts-form — U22's guard: add and edit ONE contact at /admin/contacts (decisions C3 · C4 · C9 · C11 · C12 ·
 * C24 · C25 · M5 · M12 · A1.1 · A1.7 · X6).
 *
 * ⭐ DRIVEN, NOT READ, wherever the behaviour can run in a script:
 *   §1 the number field's live verdict (`src/lib/contacts/contact-number.ts`) — the chip at two digits from the ONE
 *      table, every sentence parseTzNumber's own, 064 refused at two digits, no refusal while typing, a paste judged
 *      before PhoneInput's nine-digit cap;
 *   §2 the create (`src/lib/server/contacts/contact-write.ts`, the memory twin): NO consent recorded, nothing smuggled
 *      from the request, the caches mirrored from the ledger and the stop list, never linked to a player, an audit row
 *      with the masked number, and ONE create builder (X6);
 *   §3 duplicates: the unique index IS the check (the race included), the lookup's three keys say nothing about a
 *      player, an ERASED number refused with no id (C3), the server refusing what the dialog might not;
 *   §4 the edit: four fields and the stamp, compare-and-set (C25), unknown and erased rows MISSING (A1.7);
 *   §5 the `?edit=` loader and the add reply: the erased fixture never opens the dialog (A1.7), and nothing per-number
 *      that says "player" reaches a viewer who may not read a number (A1.1).
 * Then the source, for what only the source can show (§6): the actions gated first, rate-limited per officer, every
 * field re-typed; no consent control and no second save in the form; the page's <Sensitive> slots; `edit` never
 * carried by the ONE href builder (C9/M12, executed); the copy; the `contactEmail` registry entry (M5, executed);
 * PhoneInput's three additive props; the pure module pinned; the suite wired.
 * vb7 (validation batch 7): a paste longer than a phone number refused in the browser (1.8) and on the server (3.6), the
 * raw text cleaned of control characters (3.6), an edit that changes nothing writing nothing (4.7), the dialog's live
 * field rules (6.14), its honesty — optional labels, no silent cut, read-only for a view-only officer, the discard
 * question, the toasts (6.15) — and the lookup that never redirects (6.16, with `test:rbac` §15 executing its guard).
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY — a service, a loader, a reply shaper, an
 * href builder or a source string swapped — and requires the MATCHING assertion to fail. This file makes no
 * file-modifying call. Every store mutation goes through the store's own methods inside a scratch book: the memory
 * maps it touches are copied before a run and put back after it, so every run starts from the same empty book.
 *
 * Run:  npm run test:contacts-form
 * Red:  npm run red:contacts-form
 */
process.exitCode = 1;

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { db } from "../src/lib/server/store.ts";
import type { StoredMarketingContact, StoredUser, MessagingKey } from "../src/lib/server/store.ts";
import { audit, auditFlush, getAuditPage } from "../src/lib/server/audit.ts";
import { mayReceiveMarketingSms } from "../src/lib/server/marketing/consent.ts";
import {
  contactNumberVerdict, contactOperatorChip, contactTypingLine, governingPaste, contactNumberTooLong, CONTACT_PASTE_TOO_LONG,
} from "../src/lib/contacts/contact-number.ts";
import {
  addContact, editContact, lookupContactNumber, contactAddReply, newContactRow, findEditableContact, cleanRawInput,
  CONTACT_DUPLICATE, CONTACT_ERASED, CONTACT_MISSING, CONTACT_STALE,
} from "../src/lib/server/contacts/contact-write.ts";
import type { ContactAddRequest, ContactAddResult, ContactEditRequest, ContactEditResult } from "../src/lib/server/contacts/contact-write.ts";
import { loadContactEdit, contactEditView } from "../src/app/admin/contacts/contacts-loader.ts";
import { contactsHref, contactsLinkSp, contactsClearFiltersHref } from "../src/app/admin/contacts/contacts-query.ts";
import {
  CONSENT_LABEL, CONTACTS_EMPTY, CONTACT_FORM, CONTACT_ADDED_FILTERED, CONTACT_NOTHING_TO_SAVE, CONTACT_ROLE_REFUSAL,
  CONTACT_LOOKUP_RATE_LIMITED, CONTACT_LOOKUP_FALLBACK, CONTACT_ADD_FALLBACK, CONTACT_EDIT_FALLBACK, contactAddedWho,
  contactSavedTitle, contactRangeDisputedTitle,
} from "../src/app/admin/contacts/contacts-copy.ts";
import { SENSITIVE_FIELDS, maskEmail } from "../src/lib/server/sensitive-fields.ts";
import { parseTzNumber, TZ_MOBILE_NDCS, TZ_OPERATORS } from "../src/lib/tz-msisdn.ts";
import { normalizeTzLocalDigits, maskPhone } from "../src/lib/phone-normalize.ts";
import {
  CONTACT_LIMITS, NAME_HAS_PHONE_SENTENCE, NAME_TOO_LONG_SENTENCE, EMAIL_SHAPE_SENTENCE, TAG_HAS_PHONE_SENTENCE, contactFormProblems, splitTags,
} from "../src/lib/contacts/contact-fields.ts";
import { ERASURE_EVIDENCE } from "../src/lib/marketing/erasure-mark.ts";

const PROVE_RED = process.argv.includes("--prove-red");
/** vb7 review · the line break the source plants splice with, built from its code. */
const LF = String.fromCharCode(10);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const read = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8")).replace(/\r\n/g, "\n");
const rawRead = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

type Sources = {
  actions: string; actionsRaw: string; form: string; page: string; loading: string; write: string;
  number: string; phone: string; phoneRaw: string; registry: string; rate: string; cgs: string; pkg: string;
  /** vb7 review m5a · the unsaved-changes gate, whose exemption list must no longer name the dialog. */
  unsaved: string;
};
const REAL_SOURCES: Sources = {
  actions: read("src/app/admin/contacts/contact-form-actions.ts"),
  actionsRaw: rawRead("src/app/admin/contacts/contact-form-actions.ts"),
  form: read("src/app/admin/contacts/contact-form.tsx"),
  page: read("src/app/admin/contacts/page.tsx"),
  loading: read("src/app/admin/contacts/loading.tsx"),
  write: read("src/lib/server/contacts/contact-write.ts"),
  number: read("src/lib/contacts/contact-number.ts"),
  phone: read("src/components/ui/phone-input.tsx"),
  phoneRaw: rawRead("src/components/ui/phone-input.tsx"),
  registry: read("src/lib/server/sensitive-fields.ts"),
  rate: read("src/lib/server/rate-limit.ts"),
  cgs: read("scripts/client-graph-safe.test.mjs"),
  unsaved: read("scripts/unsaved-changes.test.mts"),
  pkg: rawRead("package.json"),
};

/** ⭐ X6 · every src file that calls the book's create — read ONCE (the raw text filters, only those are decommented). */
const TWINS = new Set(["lib/server/store.ts", "lib/server/prisma-dal.ts"]);
function walkSrc(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walkSrc(join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [join(dir, e.name)] : []);
}
const SRC = join(ROOT, "src");
const CREATORS = new Map<string, string>();
for (const f of walkSrc(SRC)) {
  const text = readFileSync(f, "utf8");
  if (!text.includes("marketingContact.create")) continue;
  const rel = f.slice(SRC.length + 1).replace(/\\/g, "/");
  if (TWINS.has(rel)) continue;
  const code = decomment(text);
  if (/\bdb\.marketingContact\.create\s*\(/.test(code)) CREATORS.set(rel, code);
}

/* ═══ THE IMPLEMENTATION UNDER TEST — swappable, so a red case can plant one piece ═══════════════ */

type Impl = {
  verdict: typeof contactNumberVerdict;
  /** The U22 review · which text governs after a paste. */
  paste: typeof governingPaste;
  add: typeof addContact;
  edit: typeof editContact;
  lookup: typeof lookupContactNumber;
  reply: typeof contactAddReply;
  editLoad: typeof loadContactEdit;
  href: typeof contactsHref;
  sources: Sources;
};
const REAL: Impl = {
  verdict: contactNumberVerdict, paste: governingPaste, add: addContact, edit: editContact, lookup: lookupContactNumber,
  reply: contactAddReply, editLoad: loadContactEdit, href: contactsHref, sources: REAL_SOURCES,
};

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};
/** One assertion whose evidence is computed by `fn` — a throw is a FAIL of that assertion, never a crashed run. */
async function check(label: string, fn: () => Promise<[boolean, string?]> | [boolean, string?]): Promise<void> {
  try {
    const [c, x] = await fn();
    ok(label, c, x ?? "");
  } catch (err) {
    ok(label, false, `threw: ${(err as Error)?.message ?? String(err)}`);
  }
}

/* ═══ THE SCRATCH BOOK — the memory maps a run touches, copied before and put back after ══════════ */

type Maps = Record<"marketingContacts" | "contactsByMsisdn" | "messagingConsents" | "suppressions" | "users" | "usersByPhone", Map<string, unknown>>;
const memory = (globalThis as unknown as { __50PICK_STORE?: Maps }).__50PICK_STORE;
const BOOK_KEYS = ["marketingContacts", "contactsByMsisdn", "messagingConsents", "suppressions", "users", "usersByPhone"] as const;
async function inScratchBook(fn: () => Promise<void>): Promise<void> {
  if (!memory) throw new Error("the memory store is not loaded — this suite runs on the memory twin only");
  const saved = BOOK_KEYS.map((k) => new Map([...memory[k]].map(([key, v]) => [key, v !== null && typeof v === "object" ? { ...(v as object) } : v])));
  try {
    await fn();
  } finally {
    BOOK_KEYS.forEach((k, i) => {
      memory[k].clear();
      for (const [key, v] of saved[i]) memory[k].set(key, v);
    });
  }
}

/** How many times the book's point read runs while `fn` does — the memory twin's method wrapped for one call, put back
 *  in a `finally` (in memory, never on disk). */
async function findCallsDuring<T>(fn: () => Promise<T>): Promise<{ value: T; calls: number }> {
  const book = db.marketingContact as unknown as { find: (id: string) => unknown };
  const real = book.find;
  let calls = 0;
  book.find = (id: string) => { calls++; return real(id); };
  try {
    return { value: await fn(), calls };
  } finally {
    book.find = real;
  }
}

/* ═══ FIXTURES ═══════════════════════════════════════════════════════════════════════════════════ */

const OFFICER = "usr_officer_u22";
const OTHER_OFFICER = "usr_officer_u22_two";
const NOW = new Date("2026-10-02T09:00:00.000Z");
const LATER = new Date("2026-10-02T10:00:00.000Z");
const STOP_AT = "2026-09-12T09:30:00.000Z";
const N = {
  main: "0712 345 678",
  mainPlus: "+255712345678",
  clean: "0754 000 333",
  control: "0754 000 666",
  withdrawn: "0754 000 222",
  player: "0754 000 111",
  playerOut: "0754 000 777",
  strangerOut: "0755 000 777",
  playerBook: "0754 000 444",
  strangerBook: "0755 000 444",
  erased: "0766 000 001",
  race: "0713 000 444",
  shape: "0713 220 001",
  dup: "0713 330 001",
  dupPlus: "+255713330001",
  edit: "0713 000 555",
  mail: "0713 000 556",
  sameMs: "0713 000 557",
  still: "0713 000 558",
  hidden: "0713 000 559",
} as const;

const bare = (local: string): string => {
  const p = parseTzNumber(local);
  if (p.verdict !== "ok" || !p.msisdn) throw new Error(`fixture ${local} does not parse`);
  return p.msisdn;
};
const mkey = (local: string): MessagingKey => ({ channel: "SMS", identifier: bare(local), category: "MARKETING" });
const req = (number: string, o: Partial<ContactAddRequest> = {}): ContactAddRequest =>
  ({ number, displayName: "", email: "", notes: "", tags: "", ...o });
const editReq = (id: string, expectedUpdatedAt: string, o: Partial<ContactEditRequest> = {}): ContactEditRequest =>
  ({ id, displayName: "", email: null, notes: "", tags: "", expectedUpdatedAt, ...o });

/** A book row written by hand — independent of the builder under test. */
function literalRow(id: string, local: string, o: Partial<StoredMarketingContact> = {}): StoredMarketingContact {
  const p = parseTzNumber(local);
  if (p.verdict !== "ok" || !p.msisdn || !p.ndc) throw new Error(`fixture ${local} does not parse`);
  return {
    id, msisdn: p.msisdn, rawInput: local, displayName: null, email: null, ndc: p.ndc, operator: null,
    source: "IMPORT", sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null,
    tags: [], notes: null, importId: null, createdAt: "2026-09-01T08:00:00.000Z", createdBy: null,
    updatedAt: "2026-09-01T08:00:00.000Z", updatedBy: null, ...o,
  };
}
function makeUser(id: string, phoneE164: string): StoredUser {
  const at = "2026-09-01T08:00:00.000Z";
  return {
    id, phoneE164, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null,
    acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: true, twoFactorEnabled: false,
    avatarDataUrl: null, createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null,
  } as StoredUser;
}
let ledgerSeq = 0;
async function ledger(local: string, status: "GIVEN" | "WITHDRAWN", source: "IMPORT" | "REGISTRATION" | "OPT_OUT_PAGE", createdAt: string) {
  await db.messagingConsent.create({
    id: `u22l_${++ledgerSeq}`, channel: "SMS", identifier: bare(local), category: "MARKETING", status, source,
    wording: "Ninakubali kupokea matangazo kwa SMS.", locale: "SW", evidence: "fixture", recordedBy: null, createdAt,
  });
}
const ledgerCount = (): number => memory?.messagingConsents.size ?? -1;

async function seedFixtures(): Promise<void> {
  // A player's account whose consent was GIVEN at sign-up — the number is not in the book.
  await db.user.create(makeUser("usr_u22_player", `+${bare(N.player)}`));
  await ledger(N.player, "GIVEN", "REGISTRATION", "2026-09-10T08:00:00.000Z");
  await db.user.create(makeUser("usr_u22_player_out", `+${bare(N.playerOut)}`));
  await ledger(N.playerOut, "GIVEN", "REGISTRATION", "2026-09-10T08:00:00.000Z");
  // A player's number ALREADY in the book (put there as the form would: no link), and a stranger's beside it.
  await db.user.create(makeUser("usr_u22_player_book", `+${bare(N.playerBook)}`));
  await db.marketingContact.create(literalRow("mc_u22_playerbook", N.playerBook, { source: "OPERATOR" }));
  await db.marketingContact.create(literalRow("mc_u22_strangerbook", N.strangerBook, { source: "OPERATOR" }));
  // A stranger's number whose last word is WITHDRAWN, behind an active stop.
  await ledger(N.withdrawn, "GIVEN", "IMPORT", "2026-09-11T08:00:00.000Z");
  await ledger(N.withdrawn, "WITHDRAWN", "OPT_OUT_PAGE", "2026-09-12T08:00:00.000Z");
  await db.suppression.create({
    id: "sup_u22", channel: "SMS", identifier: bare(N.withdrawn), category: "MARKETING", reason: "WITHDRAWN",
    evidence: "fixture", recordedBy: null, createdAt: STOP_AT, liftedAt: null, liftedReason: null,
  });
  // ⛔ THE ERASED TOMBSTONE (C3): only its number, the erasure mark, the person's last word WITHDRAWN.
  await db.marketingContact.create(literalRow("mc_u22_erased", N.erased, { sourceRef: ERASURE_EVIDENCE, consentState: "WITHDRAWN", rawInput: bare(N.erased) }));
  await ledger(N.erased, "GIVEN", "REGISTRATION", "2026-09-01T08:00:00.000Z");
  await ledger(N.erased, "WITHDRAWN", "IMPORT", "2026-09-05T08:00:00.000Z");
  // Rows for the edit: provenance, caches and a link-free import reference that an edit must never touch.
  await db.marketingContact.create(literalRow("mc_u22_edit", N.edit, {
    displayName: "Old name", email: "old@example.com", notes: "old notes", tags: ["old"], source: "IMPORT",
    sourceRef: "imp_run_1", importId: "imp_run_1", consentState: "GIVEN", suppressedAt: "2026-09-15T08:00:00.000Z",
    createdBy: "usr_creator", rawInput: "0713000555 as imported",
  }));
  await db.marketingContact.create(literalRow("mc_u22_mail", N.mail, { displayName: "Mail", email: "keep@example.com" }));
  await db.marketingContact.create(literalRow("mc_u22_ms", N.sameMs, { displayName: "Same ms", createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() }));
  // vb7 · a row an edit can leave exactly as it is (4.7).
  await db.marketingContact.create(literalRow("mc_u22_still", N.still, { displayName: "Still", notes: "kept", tags: ["a", "b"] }));
  // vb7 review M1 · a row whose email a masked officer cannot see (4.8).
  await db.marketingContact.create(literalRow("mc_u22_hidden", N.hidden, { displayName: "Hidden", email: "secret@example.com" }));
}

/** The book's region of a source, from an opener to its matching close brace (or "" when absent). */
function region(src: string, opener: string): string {
  const start = src.indexOf(opener);
  if (start < 0) return "";
  let depth = 0;
  for (let i = src.indexOf("{", start); i >= 0 && i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return src.slice(start);
}
/** One exported action's text: from its `export async function` to the next one. */
function actionBody(src: string, name: string): string {
  const at = src.indexOf(`export async function ${name}(`);
  if (at < 0) return "";
  const next = src.indexOf("export async function ", at + 1);
  return src.slice(at, next < 0 ? src.length : next);
}

/* ═══ THE LABELS, ONCE — the assertions and the red cases both read them ═══════════════════════════ */

const L = {
  v1: "1.1 · ⭐ the operator chip at TWO digits, from the ONE table: every sendable prefix reads typing with its holder's brand (060 flagged disputed), and one digit has no chip (EXECUTED)",
  v2: "1.2 · ONE source of sentences: at nine digits the verdict's sentence IS parseTzNumber's reason, and ok holds exactly when parseTzNumber says ok (EXECUTED)",
  v3: "1.3 · ⛔ 064 is refused at TWO digits, with the very sentence parseTzNumber gives every 064 number",
  v4: "1.4 · no refusal while typing: a short mobile number reads \"N of 9 digits\" until the field is settled, then parseTzNumber's too-short sentence",
  v5: "1.5 · ⭐ a paste is judged BEFORE truncation: a pasted +254… is refused as foreign, never called a Mbeya landline (CONTROL: the truncated digits alone read as one)",
  v5b: "1.5b · ⛔ a paste MERGED into digits already in the box never governs — the box's own number is what the lookup and the save get — while a paste that made the whole field still does (the U22 review)",
  v5c: "1.5c · ⭐ C2 · a number TYPED with its own \"+\" is judged as written: + then 254 is refused as foreign at its third digit, naming +254 and never Mbeya, and + then 1 at its first; + then 2 or 25 is still typing on its way to +255 (CONTROL: the same 254 712 345 typed without the + reads as the landline)",
  v6: "1.6 · the four spellings of one number give one verdict: the same stage, digits, chip and sentence",
  v7: "1.7 · every refusal is a person's sentence: non-empty, ending in a full stop, never a code",
  v8: "1.8 · ⛔ vb7 · a paste longer than any phone number is REFUSED before the lookup: 41 characters holding a valid number — and a sentence with a number in it — read CONTACT_PASTE_TOO_LONG and never ok (the lookup runs on ok alone), while a 40-character spaced number still parses (CONTROL: the 41 characters' own digits are a valid number)",
  c1: "2.1 · ⭐ THE FORM RECORDS NO CONSENT: a new number reads UNKNOWN, the ledger gains ZERO rows, and the send gate refuses it no_consent (EXECUTED)",
  c2: "2.2 · ⛔ the client cannot smuggle a consent, a link, a source, a reference, an import, a stop or a number: the row is OPERATOR, unlinked, mirrored, and keyed by the number it parsed",
  c3: "2.3 · ⭐ THE CACHE MIRRORS THE LEDGER AND THE STOP LIST: a number whose ledger says WITHDRAWN behind an active stop is added reading WITHDRAWN, suppressed at the stop's own time (CONTROL: a clean number reads UNKNOWN, unsuppressed)",
  c4: "2.4 · the row's shape: the bare 255… key and its prefix, source OPERATOR, no sourceRef, import or stored operator, the officer as creator and editor, the raw text kept, the name cleaned, tags through the ONE rule (split, lower case)",
  c5: "2.5 · ⛔ NEVER LINKED TO A PLAYER: adding the number a player's account holds leaves userId null",
  c6: "2.6 · the audit row names the MASKED number and the filled field NAMES — never the digits, the name or the notes",
  c7: "2.7 · ⭐ X6 · ONE create builder: every src caller of db.marketingContact.create( builds its row with newContactRow, and the builder writes no link and empty caches whatever it is handed (CONTROL: a literal row is flagged)",
  d1: "3.1 · ⭐ THE INDEX IS THE DUPLICATE CHECK: 0713 330 001 then +255713330001 leaves ONE row, and the second is refused with that row's id",
  d2: "3.2 · the race: a row created between the lookup and the save is a refusal carrying ITS id — no throw, no second row",
  d3: "3.3 · 🔴 D19 · the lookup says nothing else: exactly three keys for every answer, and a player's number answers exactly like a stranger's, in the book and out of it",
  d4: "3.4 · ⛔ C3 · an ERASED number is refused with one sentence and NO id — by the lookup and by the save — and nothing is written",
  d5: "3.5 · the server refuses what the dialog might not: 064 and a landline with parseTzNumber's own sentence, a 121-character name, a bad email, a 33-character tag and (vb5) a short name holding a phone number — told THAT, never the length sentence — each naming its field and writing nothing (CONTROL: 120 characters pass)",
  d6: "3.6 · ⛔ vb7 · the server holds the same length: a 41-character raw number is refused invalid_number on the number field in the paste sentence and nothing is written; a NUL, a tab and a zero-width space in a raw number are kept out of rawInput (cleanRawInput) while the number is still saved",
  e1: "4.1 · the edit writes ONLY the name, email, notes and tags (and the stamp): the number, source, sourceRef, link, caches, import and provenance are untouched",
  e2: "4.2 · ⭐ COMPARE-AND-SET: two saves on one token — the first lands, the second is refused as stale, and the row holds the first",
  e3: "4.3 · an unknown id is MISSING, and a malformed one is missing without the store being read",
  e4: "4.4 · ⛔ A1.7 · an ERASED row is MISSING to the edit: refused, and the row is left exactly as it was",
  e5: "4.5 · the email: null keeps the stored address, text replaces it (lower case), \"\" removes it",
  e6: "4.6 · ⭐ C25 · an edit in the same millisecond as the row's stamp still moves updatedAt, so the old token is refused",
  e8: "4.8 · ⛔ vb7 review M1 · NO ORACLE ON A HIDDEN EMAIL: a stale token is refused FIRST — before anything typed is compared with the row — and a submitted email ALWAYS counts as changed and is written: a stale save carrying the RIGHT guess is “stale” (never a quiet “nothing changed”), and with the current token the right guess and a wrong one answer alike — ok, [email], the stamp moved, one contacts.contact.edited row each",
  e7: "4.7 · ⭐ vb7 · an edit that changes nothing WRITES NOTHING: ok with no field changed, updatedAt and updatedBy untouched, no contacts.contact.edited row — while a real edit answers the fields it changed, in the dialog's order, and the toast says them (\"Contact saved — name and tags updated.\")",
  l1: "5.1 · ⛔ A1.7 · ?edit= of the erased fixture is MISSING — the dialog never opens on an erased person's row (an unknown id reads the same; a live row opens)",
  l2: "5.2 · 🔴 A1.1 · the edit view carries no number and no email, and the consent and the source ONLY for a reader",
  l3: "5.3 · 🔴 A1.1 · a masked viewer adding a seeded player's number reads no consent: the reply has no consent key and no \"Given\", a reader's carries the mirror, and the action and the form go through that reply",
  l4: "5.4 · no ?edit= is no dialog read, and a read that fails is FAILED — never missing",
  s1: "6.1 · ⛔ THE ACTIONS ARE GATED: the file opens \"use server\", and each of its three actions opens with its staff guard on \"growth\" — softRequireStaff for add and edit, softCheckStaff for the lookup (vb7) — and returns the refusal before the rate rule, the service or the store",
  s2: "6.2 · per-officer rate rules: contacts.write and contacts.lookup are declared, and each action spends its own on the officer as a string literal, refusing in words",
  s3: "6.3 · ⛔ every field re-typed: the actions name each field (text(body.x)) — never a spread of what the browser sent — and only a landed change revalidates the list",
  s4: "6.4 · ⛔ NO CONSENT CONTROL: the form states \"Not recorded\" and the form's sentence, has no consent input of any kind, and neither request carries a consent key",
  s5: "6.5 · ⛔ NO SAVE ANYWAY: one save path per mode, no \"anyway\" anywhere, Save disabled on a duplicate or an erased number, and the duplicate offers only the existing contact's link through contactsHref",
  s6b: "6.6b · ⛔ the dialog obeys the act gate too — Save and the email toggle are disabled for a view-only officer, each with the reason (the U22 review)",
  s6: "6.6 · the form is an act control and never names a number or an email: useMayAct and useActDisabledReason disable Add contact WITH the reason, the form is noValidate, no msisdn token and no .email accessor",
  s7: "6.7 · the page: Add contact in the head's actions, the dialog's number and email only through <Sensitive> slots, the close link the ONE builder without edit, the list's two c.msisdn reads unchanged",
  s8: "6.8 · ⛔ C9/M12 · edit never travels: the open link carries every filter and the sort into ?edit=, and the close link, the pager's base, SortTh's params and Clear filters all drop it (EXECUTED)",
  s9: "6.9 · the copy tells the truth: the empty book names Add contact and (S15) Import contacts and calls nothing \"not live\", and the loading ghost reserves the head's 40px button box",
  s10: "6.10 · ⭐ M5 · contactEmail is a registry field of its own: identity.contact, the MarketingContact target, masked like email, re-read by contact id (EXECUTED)",
  s11: "6.11 · PhoneInput's three props are ADDITIVE: the ref forwarded to the visible input, onPasteRaw heard before the strip, a caller's title winning — the hidden carrier still only with a name, the formatter's import line intact",
  s12: "6.12 · contact-number.ts is pure and pinned: no directive, it imports only tz-msisdn, phone-normalize and (vb7) contact-fields, and test:client-graph-safe pins it",
  s13: "6.13 · the suite is wired: test:contacts-form and red:contacts-form exist, and predeploy runs test:contacts-form right after test:contacts-page",
  s14: "6.14 · ⭐ vb7 · the dialog runs the shared rule LIVE: contactFormProblems for every field at once (EXECUTED: a bad email plus a bad tag are two sentences, each on its own field, before any server call), the email said once its box is left, counters for the name, the notes and the tags outside the Field so they stay beside an error, Save held until something changed and every field is within its rule — EVERY problem that holds it the stated reason, the email's too before its box is left (review m6) — and the number box red and aria-invalid on a refused number, described by an id'd verdict line that is not itself live",
  s15: "6.15 · vb7 · the dialog's honesty: the four optional fields carry the kit's optional mark (never typed into a label, §A7), no box has a maxLength at all (review m7: it counts UTF-16 units, the rules count characters — 121 emoji are refused, never cut to 120), every box is read-only for a view-only officer with the reason on screen, ✕ and Cancel ask before typing is thrown away, a field's refusal is the factual toast, the added toast names the contact (and a narrowed list), the saved toast names the fields, and the 060 chip speaks plain words (the copy EXECUTED)",
  s17: "6.17 · ⛔ vb7 review m3 · a number check REFUSED FOR THE 2-STEP SIGN-IN holds Save: the lookup's refusal is marked secondFactor (the actions' Refused type carries it), the dialog keeps it as a state of its own — the factor's sentence on the number's line with Check again, the same sentence in Save's visible reason — and Save stays off, so it never meets the step-up redirect that would lose the typing (the two sentences are rbac 15.2's)",
  s18: "6.18 · ⛔ vb7 review m5a · the dialog is GUARDED as every typed form is: <UnsavedChangesGuard> asks before a link or the tab leaves typed fields — the four free fields only, so typing just the number and following the duplicate's “Open the existing contact” asks nothing — and test:unsaved-changes no longer lists the file as exempt; ✕ and Cancel keep the dialog's own ask",
  s16: "6.16 · ⛔ vb7 · THE LOOKUP NEVER REDIRECTS FOR THE 2-STEP SIGN-IN: lookupContactNumberAction opens with softCheckStaff — the role check and its SECURITY audit kept, a second factor that lapsed or was never set up refused in words (test:rbac §15 executes the guard; no session at all still goes to sign in) — while add and edit keep softRequireStaff and its step-up; the lookup's rate refusal is a number check's own sentence, and every failure names its next step",
} as const;

const VECTORS = ["712345678", "754000111", "621000222", "601234567", "641234567", "221234567", "911234567", "301234567", "411234567", "801234567", "501234567"];

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;
  await inScratchBook(async () => {
    await seedFixtures();

    /* ── §1 · THE LIVE VERDICT ────────────────────────────────────────────────────────────────────── */
    await check(p(L.v1), () => {
      const rows = TZ_MOBILE_NDCS.filter((r) => r.sendable).map((r) => ({ r, v: impl.verdict({ value: r.ndc }) }));
      const fromTable = rows.length >= 19 && rows.every(({ r, v }) =>
        v.stage === "typing" && v.operator !== null && v.operator.brand === TZ_OPERATORS[r.operator].brand && v.operator.ndc === r.ndc);
      const single = ["6", "7"].map((d) => impl.verdict({ value: d }));
      const sixty = impl.verdict({ value: "60" });
      return [fromTable && single.every((v) => v.operator === null && v.stage === "typing") && sixty.operator !== null && sixty.operator.disputed !== null,
        rows.filter(({ r, v }) => v.operator?.brand !== TZ_OPERATORS[r.operator].brand).map(({ r }) => r.ndc).join(",") || `${rows.length} prefixes`];
    });
    await check(p(L.v2), () => {
      const off = VECTORS.filter((d) => {
        const v = impl.verdict({ value: d });
        const q = parseTzNumber(d);
        return !(v.sentence === q.reason && v.verdict === q.verdict && (v.stage === "ok") === (q.verdict === "ok"));
      });
      return [off.length === 0, off.join(",") || `${VECTORS.length} vectors`];
    });
    await check(p(L.v3), () => {
      const v = impl.verdict({ value: "64" });
      return [v.stage === "refused" && v.sentence === parseTzNumber("0641234567").reason && (v.sentence ?? "").includes("Telxer"), `${v.stage}: ${v.sentence}`];
    });
    await check(p(L.v4), () => {
      const typing = impl.verdict({ value: "71234" });
      const settled = impl.verdict({ value: "71234", settled: true });
      return [typing.stage === "typing" && typing.sentence === contactTypingLine(5) && typing.verdict === null
        && settled.stage === "refused" && settled.verdict === "too_short" && settled.sentence === parseTzNumber("71234").reason,
        `${typing.stage} "${typing.sentence}" / ${settled.stage} "${settled.sentence}"`];
    });
    await check(p(L.v5), () => {
      const paste = impl.verdict({ value: "254712345", pasted: "+254712345678" });
      const control = impl.verdict({ value: "254712345" });
      return [paste.stage === "refused" && paste.verdict === "foreign" && (paste.sentence ?? "").includes("+254") && !(paste.sentence ?? "").includes("Mbeya")
        && control.verdict === "landline" && (control.sentence ?? "").includes("Mbeya"),
        `paste ${paste.verdict}: ${paste.sentence} | control ${control.verdict}`];
    });
    await check(p(L.v5b), () => {
      const whole = impl.paste("+254712345678", "254712345"); // an empty box: the paste made the field
      const merged = impl.paste("345", "712345678"); // the box held 712 678 — a short paste merged at the caret
      const tail = impl.paste("12 345 678", "712345678"); // typed 7, then pasted the rest: the box is whole, the paste is not
      const none = impl.paste(null, "712345678");
      return [whole === "+254712345678" && merged === null && tail === null && none === null,
        `whole ${whole} · merged ${merged} · tail ${tail} · none ${none}`];
    });
    await check(p(L.v5c), () => {
      const kenya = impl.verdict({ value: "254", typedPlus: true });
      const usa = impl.verdict({ value: "1", typedPlus: true });
      const two = impl.verdict({ value: "2", typedPlus: true });
      const twentyFive = impl.verdict({ value: "25", typedPlus: true });
      const control = impl.verdict({ value: "254712345" });
      return [kenya.stage === "refused" && kenya.verdict === "foreign" && (kenya.sentence ?? "").includes("+254") && !(kenya.sentence ?? "").includes("Mbeya")
        && usa.stage === "refused" && usa.verdict === "foreign"
        && two.stage === "typing" && twentyFive.stage === "typing"
        && control.verdict === "landline" && (control.sentence ?? "").includes("Mbeya"),
        `+254 ${kenya.verdict}: ${kenya.sentence} | +1 ${usa.verdict} | +2 ${two.stage} | +25 ${twentyFive.stage} | control ${control.verdict}`];
    });
    await check(p(L.v6), () => {
      const spell = ["0712 345 678", "712345678", "+255712345678", "255712345678"].map((s) => impl.verdict({ value: s }));
      return [spell.every((v) => v.stage === "ok" && v.digits === "712345678" && v.operator?.brand === spell[0].operator?.brand && v.sentence === spell[0].sentence)
        && normalizeTzLocalDigits("+255 712 345 678") === "712345678", spell.map((v) => `${v.stage}/${v.digits}`).join(" | ")];
    });
    await check(p(L.v7), () => {
      const refusals = [
        ...VECTORS.map((d) => impl.verdict({ value: d })), impl.verdict({ value: "64" }),
        impl.verdict({ value: "71234", settled: true }), impl.verdict({ value: "254712345", pasted: "+254712345678" }),
      ].filter((v) => v.stage === "refused");
      const bad = refusals.filter((v) => typeof v.sentence !== "string" || v.sentence.trim().length < 12 || !v.sentence.trim().endsWith(".")
        || /^[a-z_]+$/.test(v.sentence) || /\b(?:too_short|too_long|unallocated_prefix|not_a_number)\b/.test(v.sentence));
      return [refusals.length >= 8 && bad.length === 0, `${refusals.length} refusals, ${bad.length} not a sentence`];
    });
    await check(p(L.v8), () => {
      const at40 = "0712" + " ".repeat(29) + "345 678";
      const at41 = "0712" + " ".repeat(30) + "345 678";
      const sentence = "Amina Juma, Mlimani City stand, 0712 345 678";
      const v41 = impl.verdict({ value: normalizeTzLocalDigits(at41), pasted: at41 });
      const vSentence = impl.verdict({ value: normalizeTzLocalDigits(sentence), pasted: sentence });
      const v40 = impl.verdict({ value: normalizeTzLocalDigits(at40), pasted: at40 });
      const lookupOnOk = impl.sources.form.includes('if (!isAdd || verdict.stage !== "ok") return;');
      return [at40.length === 40 && at41.length === 41 && v41.stage === "refused" && v41.sentence === CONTACT_PASTE_TOO_LONG
        && vSentence.stage === "refused" && vSentence.sentence === CONTACT_PASTE_TOO_LONG && v40.stage === "ok"
        && parseTzNumber(at41).verdict === "ok" && contactNumberTooLong(at41) && !contactNumberTooLong(at40) && lookupOnOk,
        `41 → ${v41.stage}: ${v41.sentence} · the sentence → ${vSentence.stage} · 40 → ${v40.stage} · lookup on ok alone ${lookupOnOk}`];
    });

    /* ── §2 · THE CREATE ──────────────────────────────────────────────────────────────────────────── */
    let r4: ContactAddResult | null = null;
    let r5: ContactAddResult | null = null;
    await check(p(L.c1), async () => {
      const before = ledgerCount();
      const r = await impl.add(req(N.main, { displayName: "Asha Mwakalinga" }), OFFICER, NOW);
      const row = r.ok ? await db.marketingContact.find(r.id) : null;
      const latest = await db.messagingConsent.latestFor(mkey(N.main));
      const gate = await mayReceiveMarketingSms(N.mainPlus, NOW) as { ok: boolean; skipReason?: string };
      return [r.ok && r.consent === "UNKNOWN" && row?.consentState === "UNKNOWN" && latest === null && ledgerCount() === before
        && !gate.ok && gate.skipReason === "no_consent",
        `${r.ok ? r.consent : r.reason} · row ${row?.consentState} · ledger ${before}→${ledgerCount()} · gate ${gate.skipReason ?? "ok"}`];
    });
    await check(p(L.c2), async () => {
      const smuggled = {
        ...req(N.clean, { displayName: "Baraka" }), consentState: "GIVEN", consent: "GIVEN", userId: "usr_smuggled",
        source: "IMPORT", sourceRef: "evil", importId: "imp_smuggled", msisdn: "255700000000", createdBy: "someone_else",
        suppressedAt: "2026-01-01T00:00:00.000Z",
      } as unknown as ContactAddRequest;
      const r = await impl.add(smuggled, OFFICER, NOW);
      const row = r.ok ? await db.marketingContact.find(r.id) : null;
      return [r.ok && row !== null && row.consentState === "UNKNOWN" && row.userId === null && row.source === "OPERATOR" && row.sourceRef === null
        && row.importId === null && row.msisdn === bare(N.clean) && row.createdBy === OFFICER && row.suppressedAt === null
        && (await db.marketingContact.findByMsisdn("255700000000")) === null,
        row ? `${row.consentState}/${row.userId}/${row.source}/${row.sourceRef}/${row.msisdn}` : "no row"];
    });
    await check(p(L.c3), async () => {
      const r = await impl.add(req(N.withdrawn), OFFICER, NOW);
      const row = r.ok ? await db.marketingContact.find(r.id) : null;
      const c = await impl.add(req(N.control), OFFICER, NOW);
      const crow = c.ok ? await db.marketingContact.find(c.id) : null;
      return [r.ok && r.consent === "WITHDRAWN" && row?.consentState === "WITHDRAWN" && row.suppressedAt === STOP_AT
        && crow?.consentState === "UNKNOWN" && crow.suppressedAt === null,
        `${row?.consentState}/${row?.suppressedAt} · control ${crow?.consentState}/${crow?.suppressedAt}`];
    });
    await check(p(L.c4), async () => {
      r4 = await impl.add(req(N.shape, { displayName: "  Neema   Kileo ", tags: "VIP; Dar | vip, ", notes: "Met at the stand." }), OFFICER, NOW);
      const row = r4.ok ? await db.marketingContact.find(r4.id) : null;
      const q = parseTzNumber(N.shape);
      return [r4.ok && row !== null && row.msisdn === q.msisdn && /^255[67]\d{8}$/.test(row.msisdn) && row.ndc === q.ndc
        && row.source === "OPERATOR" && row.sourceRef === null && row.importId === null && row.operator === null
        && row.createdBy === OFFICER && row.updatedBy === OFFICER && row.rawInput === N.shape && row.displayName === "Neema Kileo"
        && JSON.stringify(row.tags) === JSON.stringify(splitTags("VIP; Dar | vip, ")) && JSON.stringify(row.tags) === JSON.stringify(["vip", "dar"])
        && row.notes === "Met at the stand." && row.createdAt === NOW.toISOString() && /^mc_[a-z]{16}$/.test(row.id),
        row ? `${row.id} ${row.msisdn} ${row.ndc} ${row.source} [${row.tags}] "${row.displayName}" raw "${row.rawInput}"` : "no row"];
    });
    await check(p(L.c5), async () => {
      r5 = await impl.add(req(N.player), OFFICER, NOW);
      const row = r5.ok ? await db.marketingContact.find(r5.id) : null;
      const holder = await db.user.findByPhone(`+${bare(N.player)}`);
      return [r5.ok && row !== null && row.userId === null && holder !== null, `userId ${row?.userId} · a player holds it: ${holder !== null}`];
    });
    await check(p(L.c6), async () => {
      await auditFlush();
      const r = r4 as ContactAddResult | null;
      if (r === null || !r.ok) return [false, "2.4's contact was not added"];
      const entry = getAuditPage({ limit: 500 }).find((e) => e.targetId === r.id && e.action === "contacts.contact.added");
      const payload = JSON.stringify(entry?.payload ?? {});
      return [!!entry && entry.targetType === "MarketingContact" && entry.actorId === OFFICER && entry.category === "ADMIN"
        && payload.includes(maskPhone(bare(N.shape))) && !payload.includes(bare(N.shape).slice(3)) && !payload.includes("Neema")
        && !payload.includes("stand") && payload.includes("displayName") && payload.includes("tags") && payload.includes("notes") && !payload.includes("email"),
        payload];
    });
    await check(p(L.c7), () => {
      const unbuilt = [...CREATORS].filter(([, code]) => !/\bnewContactRow\s*\(/.test(code)).map(([rel]) => rel);
      const builder = region(impl.sources.write, "export function newContactRow(");
      // A whole-object spread (`...fields,`) would let any key the caller holds into the row; `[...fields.tags]` copies one array.
      const builderText = /\buserId:\s*null,/.test(builder) && /\bconsentState:\s*"UNKNOWN",/.test(builder) && /\bsuppressedAt:\s*null,/.test(builder)
        && !/\.\.\.fields(?![.\w])/.test(builder);
      const built = newContactRow({
        number: parseTzNumber("0713 220 009"), rawInput: "0713 220 009", displayName: null, email: null, tags: [], notes: null,
        source: "OPERATOR", sourceRef: null, importId: null, officerId: OFFICER, at: NOW.toISOString(),
        ...({ userId: "usr_smuggled", consentState: "GIVEN", suppressedAt: STOP_AT } as object),
      } as Parameters<typeof newContactRow>[0]);
      const control = !/\bnewContactRow\s*\(/.test("await db.marketingContact.create({ id: x, msisdn: y });");
      return [CREATORS.size >= 2 && CREATORS.has("lib/server/contacts/contact-write.ts") && unbuilt.length === 0 && builderText
        && built.userId === null && built.consentState === "UNKNOWN" && built.suppressedAt === null && control,
        `creators [${[...CREATORS.keys()]}] unbuilt [${unbuilt}]`];
    });

    /* ── §3 · DUPLICATES AND ERASED ROWS ─────────────────────────────────────────────────────────── */
    await check(p(L.d1), async () => {
      const before = await db.marketingContact.count();
      const first = await impl.add(req(N.dup), OFFICER, NOW);
      const second = await impl.add(req(N.dupPlus), OFFICER, NOW);
      const after = await db.marketingContact.count();
      const stored = first.ok ? await db.marketingContact.find(first.id) : null;
      return [first.ok && !second.ok && second.reason === "duplicate" && "existingId" in second && second.existingId === first.id
        && second.error === CONTACT_DUPLICATE && second.field === "number" && after === before + 1 && stored?.msisdn === bare(N.dup),
        `${first.ok ? first.id : first.reason} / ${second.ok ? "ok" : second.reason} · count ${before}→${after}`];
    });
    await check(p(L.d2), async () => {
      const early = await impl.lookup(N.race);
      await db.marketingContact.create(literalRow("mc_u22_raced", N.race));
      const before = await db.marketingContact.count();
      const r = await impl.add(req(N.race), OFFICER, NOW);
      return [early.state === "free" && !r.ok && r.reason === "duplicate" && "existingId" in r && r.existingId === "mc_u22_raced"
        && (await db.marketingContact.count()) === before, `${early.state} → ${r.ok ? "ok" : r.reason}`];
    });
    await check(p(L.d3), async () => {
      const answers = [
        await impl.lookup(N.playerOut), await impl.lookup(N.strangerOut),
        await impl.lookup(N.playerBook), await impl.lookup(N.strangerBook),
        await impl.lookup("0641234567"), await impl.lookup(N.erased), await impl.lookup("+254712345678"),
      ];
      const keysOk = answers.every((a) => Object.keys(a).sort().join(",") === "existingId,sentence,state");
      const outSame = JSON.stringify(answers[0]) === JSON.stringify(answers[1]) && answers[0].state === "free";
      const inSame = answers[2].state === "duplicate" && answers[3].state === "duplicate" && answers[2].sentence === CONTACT_DUPLICATE
        && answers[3].sentence === CONTACT_DUPLICATE && answers[2].existingId === "mc_u22_playerbook" && answers[3].existingId === "mc_u22_strangerbook";
      return [keysOk && outSame && inSame, answers.map((a) => Object.keys(a).sort().join("+")).join(" | ")];
    });
    await check(p(L.d4), async () => {
      const looked = await impl.lookup(N.erased);
      const before = await db.marketingContact.count();
      const ledgerBefore = ledgerCount();
      const added = await impl.add(req(N.erased, { displayName: "Back again" }), OFFICER, NOW);
      const tomb = await db.marketingContact.find("mc_u22_erased");
      const blob = JSON.stringify(added) + JSON.stringify(looked);
      return [looked.state === "refused" && looked.sentence === CONTACT_ERASED && looked.existingId === null
        && !added.ok && added.reason === "erased" && added.error === CONTACT_ERASED && !("existingId" in added) && !("id" in added)
        && !blob.includes("mc_u22_erased") && (await db.marketingContact.count()) === before && ledgerCount() === ledgerBefore
        && tomb !== null && tomb.displayName === null && tomb.sourceRef === ERASURE_EVIDENCE,
        blob];
    });
    await check(p(L.d5), async () => {
      const bad = ["0641234567", "0222123456"];
      const refused: ContactAddResult[] = [];
      for (const n of bad) refused.push(await impl.add(req(n), OFFICER, NOW));
      const long = await impl.add(req("0713 440 001", { displayName: "x".repeat(CONTACT_LIMITS.displayName + 1) }), OFFICER, NOW);
      const exact = await impl.add(req("0713 440 002", { displayName: "y".repeat(CONTACT_LIMITS.displayName) }), OFFICER, NOW);
      const mail = await impl.add(req("0713 440 003", { email: "not-an-address" }), OFFICER, NOW);
      const tagged = await impl.add(req("0713 440 004", { tags: "a".repeat(CONTACT_LIMITS.tag + 1) }), OFFICER, NOW);
      // vb5 · a name holding a phone number — the masked number in plain sight on every row — refused in its own words.
      const phoned = await impl.add(req("0713 440 005", { displayName: "Juma 0712 345 678" }), OFFICER, NOW);
      const numbersOk = refused.every((r, i) => !r.ok && r.reason === "invalid_number" && r.field === "number" && r.error === parseTzNumber(bad[i]).reason);
      const nothing = (await Promise.all(["0713 440 001", "0713 440 003", "0713 440 004", "0713 440 005"].map((n) => db.marketingContact.findByMsisdn(bare(n))))).every((x) => x === null)
        && (await db.marketingContact.findByMsisdn("255641234567")) === null;
      return [numbersOk && !long.ok && long.reason === "invalid_field" && long.field === "displayName" && exact.ok
        && !mail.ok && mail.reason === "invalid_field" && mail.field === "email" && !tagged.ok && tagged.reason === "invalid_field" && tagged.field === "tags"
        && !phoned.ok && phoned.reason === "invalid_field" && phoned.field === "displayName" && phoned.error === NAME_HAS_PHONE_SENTENCE && nothing,
        [...refused, long, exact, mail, tagged, phoned].map((r) => (r.ok ? "ok" : `${r.reason}:${"field" in r ? r.field : ""}`)).join(" | ")
          + ` · the phone-number name is told: ${phoned.ok ? "SAVED" : phoned.error}`];
    });
    await check(p(L.d6), async () => {
      const at41 = "0713" + " ".repeat(30) + "440 007";
      const long = await impl.add(req(at41), OFFICER, NOW);
      const NUL = String.fromCharCode(0);
      const TAB = String.fromCharCode(9);
      const ZWSP = String.fromCharCode(0x200b);
      const dirty = `0713${NUL}440${TAB}008${ZWSP}`;
      const saved = await impl.add(req(dirty), OFFICER, NOW);
      const row = saved.ok ? await db.marketingContact.find(saved.id) : null;
      const raw = row?.rawInput ?? "";
      const clean = ![...raw].some((c) => c.charCodeAt(0) < 32 || c === ZWSP);
      return [at41.length === 41 && !long.ok && long.reason === "invalid_number" && long.field === "number" && long.error === CONTACT_PASTE_TOO_LONG
        && (await db.marketingContact.findByMsisdn(bare("0713 440 007"))) === null
        && saved.ok && row !== null && row.msisdn === bare("0713 440 008") && clean && raw === "0713440 008" && cleanRawInput(dirty) === raw,
        `41 → ${long.ok ? "SAVED" : `${long.reason}: ${long.error}`} · raw kept ${JSON.stringify(raw)} · clean ${clean}`];
    });

    /* ── §4 · THE EDIT ────────────────────────────────────────────────────────────────────────────── */
    const FIXED: (keyof StoredMarketingContact)[] = ["msisdn", "rawInput", "ndc", "operator", "source", "sourceRef", "userId", "consentState", "suppressedAt", "importId", "createdAt", "createdBy"];
    await check(p(L.e1), async () => {
      const before = await db.marketingContact.find("mc_u22_edit");
      if (!before) return [false, "no fixture"];
      const r = await impl.edit(editReq("mc_u22_edit", before.updatedAt, { displayName: "Neema", notes: "", tags: "x, Y" }), OFFICER, NOW);
      const after = await db.marketingContact.find("mc_u22_edit");
      const moved = FIXED.filter((k) => JSON.stringify(after?.[k]) !== JSON.stringify(before[k]));
      return [r.ok && after !== null && after.displayName === "Neema" && after.notes === null && JSON.stringify(after.tags) === "[\"x\",\"y\"]"
        && after.email === before.email && after.updatedBy === OFFICER && after.updatedAt !== before.updatedAt && moved.length === 0,
        `${r.ok ? "ok" : r.reason} · moved [${moved}]`];
    });
    await check(p(L.e2), async () => {
      const base = await db.marketingContact.find("mc_u22_edit");
      if (!base) return [false, "no fixture"];
      const first = await impl.edit(editReq("mc_u22_edit", base.updatedAt, { displayName: "First" }), OFFICER, LATER);
      const second = await impl.edit(editReq("mc_u22_edit", base.updatedAt, { displayName: "Second" }), OTHER_OFFICER, LATER);
      const held = await db.marketingContact.find("mc_u22_edit");
      return [first.ok && !second.ok && second.reason === "stale" && second.error === CONTACT_STALE && held?.displayName === "First" && held.updatedBy === OFFICER,
        `${first.ok ? "ok" : first.reason} / ${second.ok ? "ok" : second.reason} · holds "${held?.displayName}"`];
    });
    await check(p(L.e3), async () => {
      const unknown = await impl.edit(editReq("mc_nope", NOW.toISOString(), { displayName: "Ghost" }), OFFICER, NOW);
      const malformed = await findCallsDuring(() => impl.edit(editReq("../../etc/passwd", NOW.toISOString(), { displayName: "Ghost" }), OFFICER, NOW));
      const tooLong = await findEditableContact("m".repeat(65));
      return [!unknown.ok && unknown.reason === "missing" && unknown.error === CONTACT_MISSING
        && !malformed.value.ok && malformed.value.reason === "missing" && malformed.calls === 0 && tooLong === null,
        `${unknown.ok ? "ok" : unknown.reason} · malformed ${malformed.value.ok ? "ok" : malformed.value.reason} with ${malformed.calls} store read(s)`];
    });
    await check(p(L.e4), async () => {
      const before = await db.marketingContact.find("mc_u22_erased");
      if (!before) return [false, "no fixture"];
      const r = await impl.edit(editReq("mc_u22_erased", before.updatedAt, { displayName: "Neema", email: "n@example.com", notes: "x", tags: "y" }), OFFICER, NOW);
      const after = await db.marketingContact.find("mc_u22_erased");
      return [!r.ok && r.reason === "missing" && r.error === CONTACT_MISSING && JSON.stringify(after) === JSON.stringify(before),
        `${r.ok ? "EDITED" : r.reason} · ${after?.displayName}/${after?.sourceRef}`];
    });
    await check(p(L.e5), async () => {
      const m0 = await db.marketingContact.find("mc_u22_mail");
      if (!m0) return [false, "no fixture"];
      const keep = await impl.edit(editReq("mc_u22_mail", m0.updatedAt, { displayName: "Mail" }), OFFICER, NOW);
      const m1 = await db.marketingContact.find("mc_u22_mail");
      const replace = await impl.edit(editReq("mc_u22_mail", m1?.updatedAt ?? "", { displayName: "Mail", email: "  New@Example.COM " }), OFFICER, NOW);
      const m2 = await db.marketingContact.find("mc_u22_mail");
      const remove = await impl.edit(editReq("mc_u22_mail", m2?.updatedAt ?? "", { displayName: "Mail", email: "" }), OFFICER, NOW);
      const m3 = await db.marketingContact.find("mc_u22_mail");
      return [keep.ok && m1?.email === "keep@example.com" && replace.ok && m2?.email === "new@example.com" && remove.ok && m3?.email === null,
        `${m1?.email} → ${m2?.email} → ${m3?.email}`];
    });
    await check(p(L.e6), async () => {
      const s0 = await db.marketingContact.find("mc_u22_ms");
      if (!s0) return [false, "no fixture"];
      const sameMs = new Date(s0.updatedAt);
      const a = await impl.edit(editReq("mc_u22_ms", s0.updatedAt, { displayName: "A" }), OFFICER, sameMs);
      const s1 = await db.marketingContact.find("mc_u22_ms");
      const b = await impl.edit(editReq("mc_u22_ms", s0.updatedAt, { displayName: "B" }), OTHER_OFFICER, sameMs);
      const s2 = await db.marketingContact.find("mc_u22_ms");
      return [a.ok && s1 !== null && Date.parse(s1.updatedAt) === Date.parse(s0.updatedAt) + 1 && !b.ok && b.reason === "stale" && s2?.displayName === "A",
        `${s0.updatedAt} → ${s1?.updatedAt} · second ${b.ok ? "ok" : b.reason}`];
    });
    await check(p(L.e7), async () => {
      const s0 = await db.marketingContact.find("mc_u22_still");
      if (!s0) return [false, "no fixture"];
      const editedRows = async () => {
        await auditFlush();
        return getAuditPage({ limit: 1000 }).filter((e) => e.targetId === "mc_u22_still" && e.action === "contacts.contact.edited").length;
      };
      const rows0 = await editedRows();
      // The same values, spelled differently: a padded name, the tags in another case — they clean to what is stored.
      const same = await impl.edit(editReq("mc_u22_still", s0.updatedAt, { displayName: " Still ", notes: "kept", tags: "A, b" }), OTHER_OFFICER, LATER);
      const s1 = await db.marketingContact.find("mc_u22_still");
      const rows1 = await editedRows();
      const real = await impl.edit(editReq("mc_u22_still", s1?.updatedAt ?? "", { displayName: "Still Here", notes: "kept", tags: "a, b, c" }), OFFICER, LATER);
      const rows2 = await editedRows();
      return [same.ok && same.changed.length === 0 && s1 !== null && s1.updatedAt === s0.updatedAt && s1.updatedBy === s0.updatedBy && rows1 === rows0
        && real.ok && JSON.stringify(real.changed) === JSON.stringify(["displayName", "tags"]) && rows2 === rows0 + 1
        && contactSavedTitle(real.changed) === "Contact saved — name and tags updated." && contactSavedTitle([]) === CONTACT_NOTHING_TO_SAVE
        && contactSavedTitle(["notes"]) === "Contact saved — notes updated.",
        `same → ${same.ok ? `ok [${same.changed}]` : same.reason}, stamp ${s0.updatedAt} → ${s1?.updatedAt}, audit rows ${rows0}→${rows1} · real → ${real.ok ? `[${real.changed}]` : real.reason}, rows → ${rows2}`];
    });

    await check(p(L.e8), async () => {
      const h0 = await db.marketingContact.find("mc_u22_hidden");
      if (!h0) return [false, "no fixture"];
      const editedRows = async () => {
        await auditFlush();
        return getAuditPage({ limit: 1000 }).filter((e) => e.targetId === "mc_u22_hidden" && e.action === "contacts.contact.edited").length;
      };
      const rows0 = await editedRows();
      // A STALE token carrying the right guess and nothing else changed — the old order answered "nothing changed".
      const staleRight = await impl.edit(editReq("mc_u22_hidden", "2026-01-01T00:00:00.000Z", { displayName: "Hidden", email: "secret@example.com" }), OTHER_OFFICER, LATER);
      const h1 = await db.marketingContact.find("mc_u22_hidden");
      // The current token: the right guess, then a wrong one — the same shape of answer each time.
      const right = await impl.edit(editReq("mc_u22_hidden", h1?.updatedAt ?? "", { displayName: "Hidden", email: " Secret@Example.com " }), OTHER_OFFICER, LATER);
      const h2 = await db.marketingContact.find("mc_u22_hidden");
      const rows2 = await editedRows();
      const wrong = await impl.edit(editReq("mc_u22_hidden", h2?.updatedAt ?? "", { displayName: "Hidden", email: "guess@example.com" }), OTHER_OFFICER, LATER);
      const h3 = await db.marketingContact.find("mc_u22_hidden");
      const rows3 = await editedRows();
      const alike = right.ok && wrong.ok && JSON.stringify(right.changed) === JSON.stringify(["email"]) && JSON.stringify(wrong.changed) === JSON.stringify(["email"]);
      return [!staleRight.ok && staleRight.reason === "stale" && h1 !== null && h1.updatedAt === h0.updatedAt
        && alike && h2 !== null && h2.updatedAt !== h1.updatedAt && rows2 === rows0 + 1
        && h3 !== null && h3.updatedAt !== h2.updatedAt && rows3 === rows0 + 2 && h3.email === "guess@example.com",
        `stale + right → ${staleRight.ok ? `ok [${staleRight.changed}]` : staleRight.reason} · right → ${right.ok ? `[${right.changed}]` : right.reason} · wrong → ${wrong.ok ? `[${wrong.changed}]` : wrong.reason} · rows ${rows0}→${rows2}→${rows3}`];
    });

    /* ── §5 · THE ?edit= LOADER AND THE ADD REPLY ─────────────────────────────────────────────────── */
    await check(p(L.l1), async () => {
      const erased = await impl.editLoad({ edit: "mc_u22_erased" }, true);
      const unknown = await impl.editLoad({ edit: "mc_nope" }, true);
      const live = await impl.editLoad({ edit: "mc_u22_edit" }, true);
      return [erased?.kind === "missing" && erased.sentence === CONTACT_MISSING && unknown?.kind === "missing" && live?.kind === "ready",
        `${erased?.kind} / ${unknown?.kind} / ${live?.kind}`];
    });
    await check(p(L.l2), async () => {
      const row = await db.marketingContact.find("mc_u22_edit");
      const masked = await impl.editLoad({ edit: "mc_u22_edit" }, false);
      const reader = await impl.editLoad({ edit: "mc_u22_edit" }, true);
      const vM = masked?.kind === "ready" ? masked.view : null;
      const vR = reader?.kind === "ready" ? reader.view : null;
      if (!row || !vM || !vR) return [false, "the live row did not load"];
      const keys = Object.keys(vM).sort().join(",");
      const blob = JSON.stringify(vM);
      return [vM.reader === null && vR.reader !== null && vR.reader.consentLabel === CONSENT_LABEL[row.consentState].label && vR.reader.sourceLabel.length > 0
        && keys === "addedLabel,displayName,hasEmail,id,ndc,notes,reader,tags,updatedAt" && !blob.includes(row.msisdn.slice(3)) && !blob.includes("@")
        && JSON.stringify(contactEditView(row, false)) === blob,
        `masked reader=${JSON.stringify(vM.reader)} · keys ${keys}`];
    });
    await check(p(L.l3), () => {
      const r = r5 as ContactAddResult | null;
      if (r === null || !r.ok) return [false, "2.5's player number was not added"];
      const masked = impl.reply(r, false);
      const reader = impl.reply(r, true);
      const form = impl.sources.form;
      const wired = /contactAddReply\(result, await viewerReadsContacts\(\)\.catch\(\(\) => false\)\)/.test(actionBody(impl.sources.actions, "addContactAction"))
        && /"consent" in r && r\.consent !== undefined \? contactAddedConsent\(CONSENT_LABEL\[r\.consent\]\.label\)/.test(form)
        && /mode\.contact\.reader !== null \?/.test(form);
      return [r.consent === "GIVEN" && masked.ok && !("consent" in masked) && !/GIVEN|Given/.test(JSON.stringify(masked))
        && reader.ok && "consent" in reader && reader.consent === "GIVEN" && wired,
        `mirror ${r.consent} · masked ${JSON.stringify(masked)} · reader ${JSON.stringify(reader)} · wired ${wired}`];
    });
    await check(p(L.l4), async () => {
      const none = await impl.editLoad({}, true);
      const blank = await impl.editLoad({ edit: "  " }, true);
      const book = db.marketingContact as unknown as { find: (id: string) => unknown };
      const realFind = book.find;
      book.find = () => { throw new Error("contact read fault (planted by test:contacts-form)"); };
      let faulted: Awaited<ReturnType<typeof loadContactEdit>> = null;
      try {
        faulted = await impl.editLoad({ edit: "mc_u22_edit" }, true);
      } finally {
        book.find = realFind;
      }
      return [none === null && blank === null && faulted?.kind === "failed", `${none} / ${blank} / ${faulted?.kind}`];
    });
  });

  /* ── §6 · THE SOURCE ────────────────────────────────────────────────────────────────────────────── */
  const src = impl.sources;
  const ACTIONS = ["lookupContactNumberAction", "addContactAction", "editContactAction"];
  await check(p(L.s1), () => {
    const exported = [...src.actions.matchAll(/^export async function (\w+)\(/gm)].map((m) => m[1]).sort().join(",");
    const GATE_FIRST = /^\s*const g = await soft(?:Require|Check)Staff\("growth", "contacts\.(?:lookup|add|edit)", CONTACT_ROLE_REFUSAL\);\s*if \(!g\.ok\) return g;/;
    const gated = ACTIONS.map((n) => {
      const body = actionBody(src.actions, n);
      const firstLine = body.slice(0, body.indexOf("\n"));
      const rest = body.slice(body.indexOf("\n") + 1);
      const gateAt = rest.search(/soft(?:Require|Check)Staff\(/);
      return firstLine.trimEnd().endsWith("{") && GATE_FIRST.test(rest) && gateAt >= 0 && gateAt < rest.indexOf("rateCheckAsync(") ? null : n;
    }).filter((n) => n !== null);
    return [src.actionsRaw.startsWith("\"use server\";") && exported === [...ACTIONS].sort().join(",") && gated.length === 0,
      `exported [${exported}] ungated [${gated}]`];
  });
  await check(p(L.s2), () => {
    const declared = /^\s*"contacts\.write":\s*\{\s*capacity:\s*\d+,\s*refillPerMin:\s*[\d.]+\s*\},/m.test(src.rate)
      && /^\s*"contacts\.lookup":\s*\{\s*capacity:\s*\d+,\s*refillPerMin:\s*[\d.]+\s*\},/m.test(src.rate);
    const spends = /rateCheckAsync\(g\.userId, "contacts\.lookup"\)/.test(actionBody(src.actions, "lookupContactNumberAction"))
      && /rateCheckAsync\(g\.userId, "contacts\.write"\)/.test(actionBody(src.actions, "addContactAction"))
      && /rateCheckAsync\(g\.userId, "contacts\.write"\)/.test(actionBody(src.actions, "editContactAction"));
    // vb7 · the lookup's refusal is a number check's own sentence; add and edit keep the contacts one.
    const inWords = (src.actions.match(/if \(!rate\.allowed\) return \{ ok: false, error: CONTACT_RATE_LIMITED\(rate\.retryAfterSec\) \};/g) ?? []).length === 2
      && (src.actions.match(/if \(!rate\.allowed\) return \{ ok: false, error: CONTACT_LOOKUP_RATE_LIMITED\(rate\.retryAfterSec\) \};/g) ?? []).length === 1;
    return [declared && spends && inWords, `declared ${declared} · spends ${spends} · in words ${inWords}`];
  });
  await check(p(L.s3), () => {
    const addB = actionBody(src.actions, "addContactAction");
    const editB = actionBody(src.actions, "editContactAction");
    const retyped = ["number", "displayName", "email", "notes", "tags"].every((k) => new RegExp(`\\b${k}: text\\(body\\.${k}\\)`).test(addB))
      && ["id", "displayName", "notes", "tags", "expectedUpdatedAt"].every((k) => new RegExp(`\\b${k}: text\\(body\\.${k}\\)`).test(editB))
      && /email: typeof body\.email === "string" \? body\.email : null/.test(editB);
    const noSpread = !/\.\.\.(?:body|request|draft|edit)\b/.test(src.actions);
    const revalidates = /if \(reply\.ok\) \{\s*try \{ revalidatePath\("\/admin\/contacts"\);/.test(addB)
      && /if \(result\.ok\) \{\s*try \{ revalidatePath\("\/admin\/contacts"\);/.test(editB);
    return [retyped && noSpread && revalidates, `retyped ${retyped} · no spread ${noSpread} · revalidates ${revalidates}`];
  });
  await check(p(L.s4), () => {
    const CONSENT_INPUT = /name=["']consent|consentState\s*[:=]|<Select[^>]*consent|<Toggle[^>]*consent|<Checkbox[^>]*consent|type=["']radio["']/i;
    const requests = src.form.match(/const request = \{[\s\S]*?\};/g) ?? [];
    const addType = region(src.write, "export type ContactAddRequest = {");
    const editType = region(src.write, "export type ContactEditRequest = {");
    return [src.form.includes("{CONSENT_LABEL.UNKNOWN.label}") && src.form.includes("{CONTACT_CONSENT_NOTE}") && CONSENT_LABEL.UNKNOWN.label === "Not recorded"
      && !CONSENT_INPUT.test(src.form) && requests.length === 2 && requests.every((r) => !/consent/i.test(r))
      && addType.length > 20 && editType.length > 20 && !/consent/i.test(addType + editType),
      `${requests.length} request(s) · input ${(CONSENT_INPUT.exec(src.form) ?? [""])[0]}`];
  });
  await check(p(L.s5), () => {
    const oneSave = (src.form.match(/\baddContactAction\(/g) ?? []).length === 1 && (src.form.match(/\beditContactAction\(/g) ?? []).length === 1;
    const canSave = (src.form.match(/const canSave = [\s\S]*?;\n/) ?? [""])[0];
    const blocked = /asked\.state !== "duplicate"/.test(canSave) && /asked\.state !== "refused"/.test(canSave) && /asked\.state !== "checking"/.test(canSave)
      && /disabled=\{!canSave\}/.test(src.form);
    const link = /href=\{contactsHref\(hrefParams, \{ edit: asked\.existingId \}\)\}/.test(src.form) && src.form.includes("{CONTACT_OPEN_EXISTING}");
    return [oneSave && !/anyway/i.test(src.form) && blocked && link, `one save ${oneSave} · blocked ${blocked} · link ${link}`];
  });
  await check(p(L.s6), () => {
    const form = src.form;
    return [/\buseMayAct\(\)/.test(form) && /\buseActDisabledReason\(\)/.test(form) && /disabled=\{!mayAct\}/.test(form) && /title=\{reason\}/.test(form)
      && /from "\.\/contact-form-actions"/.test(form) && /<form[\s\S]{0,40}?\bnoValidate\b/.test(form)
      && !/msisdn/i.test(form) && !/\.email\b/.test(form) && form.startsWith("\"use client\";"),
      `msisdn ${/msisdn/i.test(form)} · .email ${/\.email\b/.test(form)}`];
  });
  await check(p(L.s6b), () => {
    const form = src.form;
    return [(form.match(/\buseMayAct\(\)/g) ?? []).length >= 2 && /const canSave = !pending && mayAct && /.test(form)
      && /disabled=\{pending \|\| !mayAct\}/.test(form) && /disabled=\{!canSave\}[^>]*title=\{mayAct \? saveTitle : actReason\}/.test(form),
      `useMayAct ×${(form.match(/\buseMayAct\(\)/g) ?? []).length} · canSave gated ${/const canSave = !pending && mayAct && /.test(form)}`];
  });
  await check(p(L.s7), () => {
    const page = src.page;
    // U34a · the head's actions are a fragment now — the export link, then Add contact — so the button is found inside the
    // head's own region rather than as the whole `actions` value.
    const head = page.slice(Math.max(0, page.indexOf("<AdminPageHead")), Math.max(0, page.indexOf("<AdminBody>")));
    return [head.includes("actions={(") && head.includes("<AddContactButton hrefParams={linkSp} editOpen={editLoad !== null} />")
      && page.includes("<Sensitive field=\"contactPhone\" subjectId={editing.id} value={editing.msisdn} copyable />")
      && page.includes("<Sensitive field=\"contactEmail\" subjectId={editing.id} value={editing.email} />")
      && page.includes("closeHref={contactsHref(sp)}") && page.includes("const editLoad = await loadContactEdit(sp, reads);")
      && (page.match(/c\.msisdn/g) ?? []).length === 2
      // With every <Sensitive …/> taken out, the stored number and email are named NOWHERE — not rendered, not passed on.
      && !page.replace(/<Sensitive[\s\S]*?\/>/g, "").includes("editing.msisdn") && !page.replace(/<Sensitive[\s\S]*?\/>/g, "").includes("editing.email"),
      `${(page.match(/<Sensitive /g) ?? []).length} <Sensitive> tag(s)`];
  });
  await check(p(L.s8), () => {
    const sp = { q: "asha", op: "VODACOM", tag: "vip", sort: "name", dir: "asc", page: "2", edit: "mc_u22_edit" };
    const open = new URL(impl.href(sp, { edit: "mc_u22_other" }), "http://x").searchParams;
    const close = impl.href(sp);
    const pager = impl.href(sp, { page: "3" });
    const flat = contactsLinkSp(sp);
    const cleared = contactsClearFiltersHref(sp);
    return [open.get("edit") === "mc_u22_other" && open.get("op") === "VODACOM" && open.get("tag") === "vip" && open.get("q") === "asha"
      && open.get("sort") === "name" && open.get("dir") === "asc" && !open.has("page")
      && !close.includes("edit=") && !pager.includes("edit=") && pager.includes("page=3") && !cleared.includes("edit=")
      && flat.edit === undefined && src.page.includes("const linkSp = contactsLinkSp(sp);") && src.page.includes("const baseHref = contactsHref(sp);"),
      `${close} | ${pager}`];
  });
  await check(p(L.s9), () => {
    const body = CONTACTS_EMPTY.body;
    // U34a · the ghost's head holds the export link's box too; Add contact's 40px box is found inside the head's region.
    const head = src.loading.slice(Math.max(0, src.loading.indexOf("<AdminPageHead")), Math.max(0, src.loading.indexOf("<SkBody>")));
    const ADD_BOX = '<div data-skeleton="contacts-add"><SkChip className="h-[40px] w-[';
    const at = head.indexOf(ADD_BOX);
    const end = at < 0 ? -1 : head.indexOf('px]" /></div>', at);
    const width = at < 0 || end < 0 ? "" : head.slice(at + ADD_BOX.length, end);
    // S15 · the importer is live, so the empty book names BOTH page-head buttons and promises nothing that is not live.
    return [body.includes("Add contact") && body.includes("Import contacts") && !/not live/.test(body)
      && /^[0-9]+$/.test(width),
      body];
  });
  await check(p(L.s10), async () => {
    const spec = SENSITIVE_FIELDS.contactEmail;
    let readBack: string | null = null;
    let readNone: string | null = "unread";
    await inScratchBook(async () => {
      await db.marketingContact.create(literalRow("mc_u22_registry", "0713 000 560", { email: "read@example.com" }));
      readBack = await spec.read("mc_u22_registry");
      readNone = await spec.read("mc_nope");
    });
    return [spec.readClass === "identity.contact" && spec.targetType === "MarketingContact" && spec.mask === maskEmail
      && spec.mask("asha@example.com") === SENSITIVE_FIELDS.email.mask("asha@example.com") && readBack === "read@example.com" && readNone === null
      && /contactEmail:\s*\{[\s\S]{0,400}?db\.marketingContact\.find\(subjectId\)\)\?\.email/.test(src.registry),
      `${spec.readClass}/${spec.targetType} · read ${readBack} · none ${readNone}`];
  });
  await check(p(L.s11), () => {
    const phone = src.phone;
    const paste = region(phone, "const handlePaste = (");
    return [/export const PhoneInput = React\.forwardRef<HTMLInputElement, Props>\(function PhoneInput\(/.test(phone)
      && /onPasteRaw\?: \(text: string\) => void;/.test(phone)
      && paste.indexOf("onPasteRaw?.(text);") > 0 && paste.indexOf("onPasteRaw?.(text);") < paste.indexOf("if (text === stripDigits(text)) return;")
      // The caller's ref reaches the visible input — directly, or (since 2026-10-06, the hydration catch-up) through
      // `setBoxRef`, which keeps the box for itself AND hands it to the caller's ref, function or object.
      && (/\bref=\{ref\}/.test(phone) || (/\bref=\{setBoxRef\}/.test(phone)
        && /if \(typeof ref === "function"\) ref\(el\);\s*else if \(ref\) ref\.current = el;/.test(phone)))
      && /title=\{visibleRest\.title \?\? t\.common\.phoneInputTitle\}/.test(phone)
      && /\{name && <input type="hidden" name=\{name\} value=\{v\} \/>\}/.test(phone)
      && src.phoneRaw.includes("import { formatTzPhone } from \"@/lib/tz-msisdn\";"),
      `${paste.length} chars of handlePaste`];
  });
  await check(p(L.s12), () => {
    const specs = [...src.number.matchAll(/^import\s[^;]*?from\s+"([^"]+)";/gm)].map((m) => m[1]);
    return [specs.length >= 2 && specs.every((s) => s === "../tz-msisdn" || s === "../phone-normalize" || s === "./contact-fields") && !/"use (?:client|server)"/.test(src.number)
      && /^\s*"lib\/contacts\/contact-number\.ts",/m.test(src.cgs), `imports [${specs}]`];
  });
  await check(p(L.s13), () => {
    const scripts = (JSON.parse(src.pkg) as { scripts: Record<string, string> }).scripts;
    return [scripts["test:contacts-form"] === "tsx scripts/contacts-form.test.mts"
      && scripts["red:contacts-form"] === "tsx scripts/contacts-form.test.mts --prove-red"
      && (scripts.predeploy ?? "").includes("npm run test:contacts-page && npm run test:contacts-form &&"),
      `${scripts["test:contacts-form"]} · ${scripts["red:contacts-form"]}`];
  });
  await check(p(L.s14), () => {
    const form = src.form;
    // EXECUTED · the rule the dialog asks live: a bad email AND a bad tag are two sentences, each naming its own field.
    const two = contactFormProblems({ displayName: "Asha", email: "not-an-address", notes: "", tags: "vip, (0712) 345 678" });
    const twoOk = two.length === 2 && two[0].field === "email" && two[0].sentence === EMAIL_SHAPE_SENTENCE
      && two[1].field === "tags" && two[1].sentence === TAG_HAS_PHONE_SENTENCE;
    const live = form.includes("const problems = contactFormProblems({ displayName: name, email: typedMail, notes, tags });")
      && (form.match(/onBlur=\{\(\) => setMailTouched\(true\)\}/g) ?? []).length === 2
      && form.includes('const shownProblems = problems.filter((p) => p.field !== "email" || mailTouched);')
      && form.includes("contactCharacterCount(nameUsed, NAME_MAX)") && form.includes("contactCharacterCount(notesUsed, NOTES_MAX)")
      && form.includes("contactTagsCount(tagsUsed, TAGS_MAX)") && (form.match(/<FieldCount /g) ?? []).length === 3;
    // review m6 · the reason names EVERY problem that holds Save — the email's while its box is still being typed in.
    const typing = contactFormProblems({ displayName: "Asha", email: "asha@", notes: "", tags: "" });
    const save = /const canSave = !pending && mayAct && dirty && firstProblem === null && /.test(form)
      && form.includes('const blockers = [...(asked !== null && asked.state === "factor" ? [asked.sentence] : []), ...problems.map((p) => p.sentence)];')
      && form.includes('const saveReason = !mayAct ? (actReason ?? null) : blockers.length > 0 ? blockers.join(" ") : null;')
      && form.includes('const saveTitle = blockers.length > 0 ? blockers.join(" ") : undefined;') && !form.includes("shownProblems[0]")
      && typing.length === 1 && typing[0].field === "email" && typing[0].sentence === EMAIL_SHAPE_SENTENCE;
    const number = form.includes('error={verdict.stage === "refused" || errorAt("number") !== undefined}')
      && form.includes("aria-describedby={numberLineId}") && /<NumberVerdictLine\s+id=\{numberLineId\}/.test(form)
      && /<div\s+id=\{id\}[^>]*data-number-verdict/.test(form) && !/aria-live="polite"\s+data-number-verdict/.test(form)
      && form.includes('<p className="sr-only" aria-live="polite" data-number-announce>{announce}</p>');
    return [twoOk && live && save && number, JSON.stringify({ twoOk, live, save, number })];
  });
  await check(p(L.s15), () => {
    const form = src.form;
    // §A7 · the optional mark is the kit Field's own prop (t.common.optional, three languages) — never typed into a label.
    const plain = [CONTACT_FORM.nameLabel, CONTACT_FORM.emailLabel, CONTACT_FORM.notesLabel, CONTACT_FORM.tagsLabel];
    const labels = plain.every((l) => !l.includes("optional"))
      && ["nameLabel", "emailLabel", "notesLabel", "tagsLabel"].every((k) => form.includes(`label={CONTACT_FORM.${k}} optional`))
      && form.includes("{t.common.optional}")
      && !CONTACT_FORM.numberLabel.includes("optional");
    // review m7 · no box has a maxLength: a cap counts UTF-16 units — 121 emoji are 242 of them — while the rule counts
    // characters, so the rule refuses what a cap would have cut to an accepted 120 (EXECUTED).
    const emoji = String.fromCodePoint(0x1f600).repeat(121);
    const longName = contactFormProblems({ displayName: emoji, email: "", notes: "", tags: "" });
    const noCut = !/maxLength=/.test(form) && !form.includes("BOX_MAX") && emoji.length === 242
      && longName.length === 1 && longName[0].field === "displayName" && longName[0].sentence === NAME_TOO_LONG_SENTENCE;
    const readOnly = (form.match(/readOnly=\{!mayAct\}/g) ?? []).length === 6
      && form.includes('<p id={saveReasonId} className="text-body-sm text-text-secondary" data-save-reason>{saveReason}</p>');
    const discard = /const close = \(\) => \{\s*if \(pending\) return;\s*if \(dirty\) \{\s*setAsking\(true\);/.test(form)
      && form.includes("{CONTACT_FORM.discardAsk}") && form.includes("onClick={onClose}") && form.includes("{CONTACT_FORM.keepEditing}");
    const toasts = form.includes('variant: field !== null ? "factual" : "danger"') && form.includes("contactAddedWho(addedName, lastTwo)")
      && form.includes("filtered ? CONTACT_ADDED_FILTERED : null") && form.includes('deferToast({ title: contactSavedTitle(r.changed), variant: "success" });')
      && form.includes("contactRangeDisputedTitle(chip.brand)");
    const words = contactAddedWho(null, "78") === "A contact with no name (number ending 78) is in the book."
      && contactAddedWho("Asha", "01") === "Asha (number ending 01) is in the book."
      && contactRangeDisputedTitle("Airtel") === "Airtel's newest range — accepted, though the regulator's plan doesn't list it yet."
      && CONTACT_ADDED_FILTERED === "It may be outside the current filter.";
    return [labels && noCut && readOnly && discard && toasts && words, JSON.stringify({ labels, noCut, readOnly, discard, toasts, words })];
  });
  await check(p(L.s17), () => {
    const form = src.form;
    const marked = src.actions.includes("type Refused = { ok: false; error: string; field?: string; secondFactor?: true };");
    const kept = form.includes('if (!r.ok) return r.secondFactor === true ? { state: "factor", text, sentence: r.error } : { state: "unknown", text, sentence: r.error };')
      && form.includes('| { state: "factor"; text: string; sentence: string };');
    const held = /asked\.state !== "refused"\s*&& asked\.state !== "factor"/.test(form)
      && form.includes('const blockers = [...(asked !== null && asked.state === "factor" ? [asked.sentence] : []), ...problems.map((p) => p.sentence)];');
    const said = /asked\.state === "factor"\) \{[\s\S]{0,240}?text-danger-fg">\{asked\.sentence\}<\/span>[\s\S]{0,240}?onClick=\{onRecheck\}/.test(form)
      && form.includes("}, [isAdd, verdict.stage, numberText, checkRound]);") && CONTACT_FORM.checkAgain === "Check again";
    return [marked && kept && held && said, JSON.stringify({ marked, kept, held, said })];
  });
  await check(p(L.s18), () => {
    const form = src.form;
    const guard = form.includes('import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";')
      && form.includes("<UnsavedChangesGuard dirty={open && fieldsTyped} body={CONTACT_FORM.unsavedBody} />")
      && form.includes('const fieldsTyped = isAdd ? name !== "" || mail !== "" || notes !== "" || tags !== "" : dirty;')
      && CONTACT_FORM.unsavedBody.length > 20;
    const unexempt = src.unsaved.includes("const EXEMPT: Record<string, string> = {") && !src.unsaved.includes('"app/admin/contacts/contact-form.tsx":');
    return [guard && unexempt, JSON.stringify({ guard, unexempt })];
  });
  await check(p(L.s16), () => {
    const lookup = actionBody(src.actions, "lookupContactNumberAction");
    const add = actionBody(src.actions, "addContactAction");
    const edit = actionBody(src.actions, "editContactAction");
    const gates = /const g = await softCheckStaff\("growth", "contacts\.lookup", CONTACT_ROLE_REFUSAL\);/.test(lookup) && !/softRequireStaff\(/.test(lookup)
      && /const g = await softRequireStaff\("growth", "contacts\.add", CONTACT_ROLE_REFUSAL\);/.test(add)
      && /const g = await softRequireStaff\("growth", "contacts\.edit", CONTACT_ROLE_REFUSAL\);/.test(edit)
      && src.actions.includes('import { softCheckStaff, softRequireStaff } from "@/lib/server/rbac-guard";');
    const words = lookup.includes("CONTACT_LOOKUP_RATE_LIMITED(rate.retryAfterSec)") && lookup.includes("safeError(err, CONTACT_LOOKUP_FALLBACK)")
      && add.includes("safeError(err, CONTACT_ADD_FALLBACK)") && edit.includes("safeError(err, CONTACT_EDIT_FALLBACK)")
      && CONTACT_LOOKUP_RATE_LIMITED(30) === "Too many number checks — wait 30 seconds, then try again."
      && CONTACT_LOOKUP_FALLBACK === "Checking the number failed — you can still save; the book refuses a duplicate."
      && CONTACT_ADD_FALLBACK === "Saving the contact failed — it may not have saved. Reload the book to check before adding it again."
      && CONTACT_EDIT_FALLBACK.startsWith("Saving the changes failed") && CONTACT_ROLE_REFUSAL.endsWith("ask an officer with Growth access.");
    return [gates && words, JSON.stringify({ gates, words })];
  });
}

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`\ncontacts-form: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped code is already red (${failed.join(" | ")})`);
  console.log(`\n§0 baseline: ${pass} passed, ${fail} failed\n`);

  /* ── THE PLANTS — each a piece as somebody would write it wrongly, in memory ── */
  const invalid = (reason: string): ContactAddResult => ({ ok: false, reason: "invalid_number", field: "number", error: reason });
  const duplicateOf = async (msisdn: string): Promise<ContactAddResult> => {
    const existing = await db.marketingContact.findByMsisdn(msisdn);
    return existing
      ? { ok: false, reason: "duplicate", field: "number", error: CONTACT_DUPLICATE, existingId: existing.id }
      : { ok: false, reason: "invalid_number", field: "number", error: "taken" };
  };
  /** A create that never asks the mirror — the caches stay as the builder left them. */
  const constantCache: typeof addContact = async (request, officerId, now = new Date()) => {
    const parsed = parseTzNumber(request.number);
    if (parsed.verdict !== "ok" || !parsed.msisdn) return invalid(parsed.reason);
    const row = newContactRow({
      number: parsed, rawInput: request.number, displayName: request.displayName.trim() || null, email: null,
      tags: splitTags(request.tags), notes: request.notes.trim() || null, source: "OPERATOR", sourceRef: null, importId: null,
      officerId, at: now.toISOString(),
    });
    const created = await db.marketingContact.create(row);
    return created ? { ok: true, id: created.id, consent: created.consentState } : duplicateOf(parsed.msisdn);
  };

  const CASES: Array<{ name: string; expect: string; impl: Impl }> = [
    /* ── the plan's RED line, each in memory ── */
    {
      name: "the form defaults consent to granted — a GIVEN ledger row appended and the row marked GIVEN (the plan's own RED)",
      expect: L.c1,
      impl: {
        ...REAL,
        add: async (request, officerId, now = new Date()) => {
          const r = await addContact(request, officerId, now);
          if (!r.ok) return r;
          const row = await db.marketingContact.find(r.id);
          if (row) {
            await db.messagingConsent.create({
              id: `planted_${r.id}`, channel: "SMS", identifier: row.msisdn, category: "MARKETING", status: "GIVEN", source: "OPERATOR",
              wording: "Consent recorded by the form.", locale: "EN", evidence: "planted", recordedBy: officerId, createdAt: now.toISOString(),
            });
            await db.marketingContact.update(r.id, { consentState: "GIVEN" }, now.toISOString());
          }
          return { ...r, consent: "GIVEN" };
        },
      },
    },
    {
      name: "the service spreads the client draft into the row — consent, link, source, reference and number from the payload",
      expect: L.c2,
      impl: {
        ...REAL,
        add: async (request, officerId, now = new Date()) => {
          const parsed = parseTzNumber(request.number);
          if (parsed.verdict !== "ok" || !parsed.msisdn) return invalid(parsed.reason);
          const row = {
            ...newContactRow({
              number: parsed, rawInput: request.number, displayName: request.displayName.trim() || null, email: null, tags: [], notes: null,
              source: "OPERATOR", sourceRef: null, importId: null, officerId, at: now.toISOString(),
            }),
            ...(request as unknown as Partial<StoredMarketingContact>),
            tags: [],
          } as StoredMarketingContact;
          const created = await db.marketingContact.create(row);
          return created ? { ok: true, id: created.id, consent: created.consentState } : duplicateOf(parsed.msisdn);
        },
      },
    },
    {
      name: "the cache is written as a constant — UNKNOWN and unsuppressed, the ledger and the stop list never read",
      expect: L.c3,
      impl: { ...REAL, add: constantCache },
    },
    {
      name: "the number is stored as typed — 0713 330 001 and +255713330001 become two people",
      expect: L.d1,
      impl: {
        ...REAL,
        add: async (request, officerId, now = new Date()) => {
          const parsed = parseTzNumber(request.number);
          if (parsed.verdict !== "ok" || !parsed.msisdn) return invalid(parsed.reason);
          const row = {
            ...newContactRow({
              number: parsed, rawInput: request.number, displayName: request.displayName.trim() || null, email: null, tags: [], notes: null,
              source: "OPERATOR", sourceRef: null, importId: null, officerId, at: now.toISOString(),
            }),
            msisdn: request.number.replace(/\D/g, ""),
          };
          const created = await db.marketingContact.create(row);
          return created ? { ok: true, id: created.id, consent: created.consentState } : duplicateOf(row.msisdn);
        },
      },
    },
    {
      name: "🔴 D19 · the lookup tells the officer the number is a player",
      expect: L.d3,
      impl: {
        ...REAL,
        lookup: async (number) => {
          const real = await lookupContactNumber(number);
          const q = parseTzNumber(number);
          const holder = q.msisdn ? await db.user.findByPhone(`+${q.msisdn}`) : null;
          return { ...real, isPlayer: holder !== null } as typeof real;
        },
      },
    },
    {
      name: "last write wins — the edit is a plain update that ignores its token",
      expect: L.e2,
      impl: {
        ...REAL,
        edit: async (request, officerId, now = new Date()) => {
          const row = await db.marketingContact.find(request.id);
          if (!row) return { ok: false, reason: "missing", error: CONTACT_MISSING };
          const at = now.toISOString();
          await db.marketingContact.update(request.id, {
            displayName: request.displayName.trim() || null, notes: request.notes.trim() || null, tags: splitTags(request.tags), updatedBy: officerId,
          }, at);
          return { ok: true, id: request.id, updatedAt: at };
        },
      },
    },
    {
      name: "an ungated action — addContactAction loses its softRequireStaff",
      expect: L.s1,
      impl: {
        ...REAL,
        sources: {
          ...REAL_SOURCES,
          actions: REAL_SOURCES.actions.replace(
            "const g = await softRequireStaff(\"growth\", \"contacts.add\", CONTACT_ROLE_REFUSAL);\n  if (!g.ok) return g;",
            "const g = { ok: true as const, userId: \"anyone\" };",
          ),
        },
      },
    },
    {
      name: "a \"save anyway\" button beside the duplicate — a second path past the unique index's refusal",
      expect: L.s5,
      impl: {
        ...REAL,
        sources: {
          ...REAL_SOURCES,
          form: REAL_SOURCES.form.replace(
            "{CONTACT_OPEN_EXISTING}",
            "{CONTACT_OPEN_EXISTING}\n<Button type=\"button\" onClick={() => void addContactAction({ number: \"\", displayName: \"\", email: \"\", notes: \"\", tags: \"\" })}>Save anyway</Button>",
          ),
        },
      },
    },
    {
      name: "🔴 A1.1 · a masked viewer adding a seeded player's number reads \"Given\" — the reply carries the mirror to everyone",
      expect: L.l3,
      impl: { ...REAL, reply: (result) => result },
    },
    {
      name: "⛔ A1.7 · ?edit= of the erased fixture opens the dialog — the loader never asks whether the row is erased",
      expect: L.l1,
      impl: {
        ...REAL,
        editLoad: async (sp, reads) => {
          const id = String((Array.isArray(sp.edit) ? sp.edit[0] : sp.edit) ?? "").trim();
          const row = id ? await db.marketingContact.find(id) : null;
          return row ? { kind: "ready", row, view: contactEditView(row, reads) } : loadContactEdit(sp, reads);
        },
      },
    },
    {
      name: "⛔ C3 · the erased refusal carries the row's id — something to open on an erased person's number",
      expect: L.d4,
      impl: {
        ...REAL,
        add: async (request, officerId, now = new Date()) => {
          const r = await addContact(request, officerId, now);
          if (r.ok || r.reason !== "erased") return r;
          const q = parseTzNumber(request.number);
          const tomb = q.msisdn ? await db.marketingContact.findByMsisdn(q.msisdn) : null;
          return { ...r, existingId: tomb?.id ?? "" } as ContactAddResult;
        },
      },
    },
    {
      name: "vb5 · every name refusal worded as the length one (contact-write's own mapping before vb5) — a short name holding a number is told it is too long",
      expect: L.d5,
      impl: {
        ...REAL,
        add: async (request, officerId, now = new Date()) => {
          const r = await addContact(request, officerId, now);
          return !r.ok && r.reason === "invalid_field" && r.field === "displayName" ? { ...r, error: NAME_TOO_LONG_SENTENCE } : r;
        },
      },
    },

    /* ── and the rest of the unit, each on its own assertion ── */
    {
      name: "the operator chip from a hand-written map — 060 and every prefix not typed in it have no chip",
      expect: L.v1,
      impl: {
        ...REAL,
        verdict: (input) => {
          const v = contactNumberVerdict(input);
          const MAP: Record<string, string> = { "71": "Yas", "74": "Vodacom", "75": "Vodacom", "65": "Yas" };
          if (v.operator === null) return v;
          const brand = MAP[v.operator.ndc];
          return { ...v, operator: brand ? { ...v.operator, brand, disputed: null } : null };
        },
      },
    },
    {
      name: "too_short on every keystroke — parseTzNumber asked at every length",
      expect: L.v4,
      impl: {
        ...REAL,
        verdict: (input) => {
          const digits = normalizeTzLocalDigits(String(input.value ?? ""));
          if (digits === "") return contactNumberVerdict(input);
          const q = parseTzNumber(digits);
          return { stage: q.verdict === "ok" ? "ok" : "refused", digits, operator: contactOperatorChip(digits), verdict: q.verdict, sentence: q.reason };
        },
      },
    },
    {
      name: "the paste judged after truncation — a Kenyan number called a Mbeya landline",
      expect: L.v5,
      impl: { ...REAL, verdict: (input) => contactNumberVerdict({ ...input, pasted: null }) },
    },
    {
      name: "C2 · the typed \"+\" ignored — a Kenyan number typed with its plus called a Mbeya landline",
      expect: L.v5c,
      impl: { ...REAL, verdict: (input) => contactNumberVerdict({ ...input, typedPlus: false }) },
    },
    {
      name: "the U22 review · a paste always governs — the clipboard text is saved though the box shows a merged number",
      expect: L.v5b,
      impl: { ...REAL, paste: (paste) => paste },
    },
    {
      name: "the U22 review · the dialog's Save forgets the act gate — a view-only officer presses it into a refusal",
      expect: L.s6b,
      impl: { ...REAL, sources: { ...REAL.sources, form: REAL.sources.form.replace("const canSave = !pending && mayAct && ", "const canSave = !pending && ") } },
    },
    {
      name: "the row linked to the player who holds the number — the Player chip on a row GROWTH typed",
      expect: L.c5,
      impl: {
        ...REAL,
        add: async (request, officerId, now = new Date()) => {
          const r = await addContact(request, officerId, now);
          if (!r.ok) return r;
          const row = await db.marketingContact.find(r.id);
          const holder = row ? await db.user.findByPhone(`+${row.msisdn}`) : null;
          if (holder) await db.marketingContact.update(r.id, { userId: holder.id }, now.toISOString());
          return r;
        },
      },
    },
    {
      name: "the audit payload carries the number and the name",
      expect: L.c6,
      impl: {
        ...REAL,
        add: async (request, officerId, now = new Date()) => {
          const r = await addContact(request, officerId, now);
          if (!r.ok) return r;
          const row = await db.marketingContact.find(r.id);
          await audit({
            category: "ADMIN", action: "contacts.contact.added", actorId: officerId, targetType: "MarketingContact", targetId: r.id,
            payload: { number: row?.msisdn ?? "", name: row?.displayName ?? "" },
          });
          return r;
        },
      },
    },
    {
      name: "the edit rewrites provenance — the import reference and the source reset",
      expect: L.e1,
      impl: {
        ...REAL,
        edit: async (request, officerId, now = new Date()) => {
          const r = await editContact(request, officerId, now);
          if (!r.ok) return r;
          const at = new Date(Date.parse(r.updatedAt) + 1).toISOString();
          await db.marketingContact.update(request.id, { sourceRef: null, source: "OPERATOR" }, at);
          return { ...r, updatedAt: at } as ContactEditResult;
        },
      },
    },
    {
      name: "⛔ A1.7 · an erased row is editable — a name written back onto an erased person's number",
      expect: L.e4,
      impl: {
        ...REAL,
        edit: async (request, officerId, now = new Date()) => {
          const row = await db.marketingContact.find(request.id);
          if (row === null || row.sourceRef !== ERASURE_EVIDENCE) return editContact(request, officerId, now);
          const at = new Date(Math.max(now.getTime(), Date.parse(row.updatedAt) + 1)).toISOString();
          const cas = await db.marketingContact.updateIfUnchanged(row.id, {
            displayName: request.displayName, notes: request.notes || null, tags: splitTags(request.tags), updatedBy: officerId,
          }, { expectedUpdatedAt: request.expectedUpdatedAt }, at);
          return cas.ok ? { ok: true, id: row.id, updatedAt: cas.row.updatedAt } : { ok: false, reason: "stale", error: CONTACT_STALE };
        },
      },
    },
    {
      name: "🔴 A1.1 · the reader's view handed to a masked viewer — the row's consent and source on screen",
      expect: L.l2,
      impl: { ...REAL, editLoad: (sp) => loadContactEdit(sp, true) },
    },
    {
      name: "a consent picker in the form, defaulting to granted",
      expect: L.s4,
      impl: {
        ...REAL,
        sources: {
          ...REAL_SOURCES,
          form: REAL_SOURCES.form.replace("{CONTACT_CONSENT_NOTE}</p>", "{CONTACT_CONSENT_NOTE}</p>\n<Select name=\"consent\" defaultValue=\"GIVEN\" ariaLabel=\"Consent\" options={[]} />"),
        },
      },
    },
    {
      name: "the form forgets its act gate — Add contact enabled for a read-only role",
      expect: L.s6,
      impl: { ...REAL, sources: { ...REAL_SOURCES, form: REAL_SOURCES.form.replace("disabled={!mayAct}", "disabled={false}") } },
    },
    {
      name: "the dialog renders the stored number raw",
      expect: L.s7,
      impl: {
        ...REAL,
        sources: {
          ...REAL_SOURCES,
          page: REAL_SOURCES.page.replace("<Sensitive field=\"contactPhone\" subjectId={editing.id} value={editing.msisdn} copyable />", "<span>{editing.msisdn}</span>"),
        },
      },
    },
    {
      name: "edit rides along — the href builder carries ?edit= from the address into every link",
      expect: L.s8,
      impl: {
        ...REAL,
        href: (sp, patch) => {
          const base = contactsHref(sp, patch);
          const e = Array.isArray(sp.edit) ? sp.edit[0] : sp.edit;
          return e && !base.includes("edit=") ? `${base}${base.includes("?") ? "&" : "?"}edit=${encodeURIComponent(e)}` : base;
        },
      },
    },

    /* ── vb7 · validation batch 7, each on its own assertion ── */
    {
      name: "vb7 · a long paste judged only by the digits read out of it — the 41-character paste holding a number is ok",
      expect: L.v8,
      impl: { ...REAL, verdict: (input) => contactNumberVerdict({ ...input, pasted: typeof input.pasted === "string" && input.pasted.length > 40 ? null : input.pasted }) },
    },
    {
      name: "vb7 · the server parses a long raw number for the digits inside it — the paste is saved, its raw text cut",
      expect: L.d6,
      impl: { ...REAL, add: (request, officerId, now) => addContact({ ...request, number: request.number.length > 40 ? request.number.replace(/ +/g, " ") : request.number }, officerId, now) },
    },
    {
      name: "vb7 · the raw text kept as typed — a NUL in rawInput, the insert Postgres refuses as \"Saving the contact failed\"",
      expect: L.d6,
      impl: {
        ...REAL,
        add: async (request, officerId, now = new Date()) => {
          const r = await addContact(request, officerId, now);
          if (r.ok) await db.marketingContact.update(r.id, { rawInput: request.number }, now.toISOString());
          return r;
        },
      },
    },
    {
      name: "vb7 · an edit that changes nothing writes anyway — the stamp moves under another officer's open dialog and an empty audit row is written",
      expect: L.e7,
      impl: {
        ...REAL,
        edit: async (request, officerId, now = new Date()) => {
          const r = await editContact(request, officerId, now);
          if (!r.ok || r.changed.length > 0) return r;
          const at = now.toISOString();
          await db.marketingContact.update(request.id, { updatedBy: officerId }, at);
          await audit({ category: "ADMIN", action: "contacts.contact.edited", actorId: officerId, targetType: "MarketingContact", targetId: request.id, payload: { fields: [] } });
          return { ...r, updatedAt: at };
        },
      },
    },
    {
      name: "vb7 · the dialog checks only the number in the browser — name, email, notes and tags wait for Save, one problem a round trip",
      expect: L.s14,
      impl: {
        ...REAL,
        sources: {
          ...REAL_SOURCES,
          form: REAL_SOURCES.form.replace(
            "const problems = contactFormProblems({ displayName: name, email: typedMail, notes, tags });",
            "const problems: ReturnType<typeof contactFormProblems> = [];",
          ),
        },
      },
    },
    {
      name: "vb7 · a refused number gets no red box and no aria-invalid — the error prop forgets the verdict",
      expect: L.s14,
      impl: {
        ...REAL,
        sources: { ...REAL_SOURCES, form: REAL_SOURCES.form.replace('error={verdict.stage === "refused" || errorAt("number") !== undefined}', 'error={errorAt("number") !== undefined}') },
      },
    },
    {
      name: "vb7 · Edit Save enabled with nothing changed — the save writes anyway and moves the stamp",
      expect: L.s14,
      impl: {
        ...REAL,
        sources: { ...REAL_SOURCES, form: REAL_SOURCES.form.replace("const canSave = !pending && mayAct && dirty && firstProblem === null && ", "const canSave = !pending && mayAct && ") },
      },
    },
    {
      name: "vb7 · the silent cut back — the name box cut at 120 characters without a word",
      expect: L.s15,
      impl: { ...REAL, sources: { ...REAL_SOURCES, form: REAL_SOURCES.form.replace("value={name}" + LF, "value={name}" + LF + "              maxLength={NAME_MAX}" + LF) } },
    },
    /* ── the vb7 review's fixes (2026-10-03), each on its own assertion ── */
    {
      name: "vb7 review M1 · the old order — “nothing changed” asked before the token, by value: the right guess at a hidden email is a quiet ok, a wrong one stale",
      expect: L.e8,
      impl: {
        ...REAL,
        edit: async (request, officerId, now) => {
          const row = await findEditableContact(request.id);
          if (row !== null && request.email !== null && String(request.email).trim().toLowerCase() === (row.email ?? "")
            && request.displayName.trim() === (row.displayName ?? "") && request.notes.trim() === (row.notes ?? "")
            && JSON.stringify(splitTags(request.tags)) === JSON.stringify(row.tags)) {
            return { ok: true, id: row.id, updatedAt: row.updatedAt, changed: [] };
          }
          return editContact(request, officerId, now);
        },
      },
    },
    {
      name: "vb7 review m6 · the reason waits for the email's blur again — Save off while an address is typed, and no word why",
      expect: L.s14,
      impl: { ...REAL, sources: { ...REAL_SOURCES, form: REAL_SOURCES.form.replace("...problems.map((p) => p.sentence)];", "...shownProblems.map((p) => p.sentence)];") } },
    },
    {
      name: "vb7 review m3 · a refusal for the 2-step sign-in leaves Save on — Save meets the step-up redirect and the typing is lost",
      expect: L.s17,
      impl: { ...REAL, sources: { ...REAL_SOURCES, form: REAL_SOURCES.form.replace('      && asked.state !== "factor"' + LF, "") } },
    },
    {
      name: "vb7 review m5a · the guard watches the number too — typing a number and following the duplicate's link asks to discard",
      expect: L.s18,
      impl: { ...REAL, sources: { ...REAL_SOURCES, form: REAL_SOURCES.form.replace("<UnsavedChangesGuard dirty={open && fieldsTyped}", "<UnsavedChangesGuard dirty={open && dirty}") } },
    },
    {
      name: "vb7 · the lookup back on the redirecting guard — a lapsed second factor navigates the console away from the open dialog",
      expect: L.s16,
      impl: {
        ...REAL,
        sources: {
          ...REAL_SOURCES,
          actions: REAL_SOURCES.actions.replace(
            "const g = await softCheckStaff(\"growth\", \"contacts.lookup\", CONTACT_ROLE_REFUSAL);",
            "const g = await softRequireStaff(\"growth\", \"contacts.lookup\", CONTACT_ROLE_REFUSAL);",
          ),
        },
      },
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    await runAssertions(c.impl, tag);
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(`${tag}${c.expect}`)) problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`\n${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
