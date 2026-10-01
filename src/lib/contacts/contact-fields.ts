/**
 * ⭐ THE ONE FIELD LIST FOR A CONTACT BOOK FILE — and the rules every writer of a book row shares.
 *                                                                        (U28a, S10 2026-10-01)
 *
 * Every reader and writer of a contacts FILE takes its columns from `CONTACT_FIELDS`: the importer's header
 * matching (U25's CSV, U26's vCard, U27's XLSX, U30's mapping panel), the export header (U34, through
 * `contactExportHeader`) and the sample sheets (`sample-sheet.ts`). The tag rule (`splitTags`, `tagKey`,
 * `checkTags`) and the limits table (`CONTACT_LIMITS`) live here too, because every writer of a row — U22's
 * form, U23's bulk bar and the importer — must refuse the same things in the same words (decisions C11 and
 * C12). One list, five readers. A second list is the defect `test:contacts-import` §F20 looks for.
 *
 * ── WHY THE EXPORT HEADER STAYS ENGLISH (and it is NOT "so our own importer can re-read it") ─────────
 * The importer reads Swahili headers too — that is what the aliases are for — so re-reading needs no English.
 * The header is English snake_case for three other reasons: ① one fixed canonical spelling per column, so a
 * file can be diffed and re-imported without guessing; ② the transactions export, the precedent U34 copies,
 * writes English snake_case machine headers (`api/admin/transactions/export/route.ts`); ③ admin chrome is
 * English (plan §5.13). ⛔ Swahili headers are READ, never WRITTEN.
 *
 * ⛔ OD10 · CONSENT IS NEVER READ FROM A FILE. `ImportFieldKey` has no consent member, so a mapping cannot even
 * be typed at consent. The consent words (consent, opt in, subscribed, ridhaa, kibali…) sit in
 * `CONTACT_NOT_IMPORTED`, so a Consent column is RECOGNISED in order to be refused — never mapped, and never
 * mistaken for Notes. Un-buildable, not defaulted off.
 *
 * ⛔ A MASKED EXPORT CANNOT BE IMPORTED. `phone_masked` and `email_masked` (M5) are refused headers:
 * `parseTzNumber("+255••••01")` reads five digits and would tell the officer some were "cut off", which
 * misdescribes a mask. The whole file is refused with its own sentence instead.
 *
 * ── HEADER MATCHING IS AN EXACT LOOKUP ──────────────────────────────────────────────────────────
 * `normaliseHeader` folds case, accents, punctuation and spacing, and the result is looked up in a Map built
 * ONCE per vocabulary. ⛔ Never a substring test: `test:search-adoption` forbids the shape, and "contains
 * phone" would also map "Phone 1 - Type" to the numbers. Two tiers — a STRONG alias beats a WEAK one, and a
 * tie goes to the leftmost column. 🔴 The weak tier exists because a Swahili sheet's "Namba" column is often
 * the row SERIAL: "Namba | Jina | Simu" must read its numbers from Simu.
 *
 * ── EVERY BEHAVIOUR COMES FROM A PURE FACTORY ───────────────────────────────────────────────────
 * `buildContactVocabulary(fields, notImported)` returns matchHeader, autoMapHeaders, validateMapping,
 * draftContactRow and exportHeader. The module's named exports are its instance over `CONTACT_FIELDS` and
 * `CONTACT_NOT_IMPORTED`, which is what lets every red plant in the suite run in memory.
 *
 * ── A vCARD IS NEVER HEADER-MATCHED (amendment A1.2) ───────────────────────────────────────────
 * U26's reader emits one row per card and NO header row, the cells in `fileColumns()` order. `autoMapFile`
 * maps `format: "vcard"` by that fixed order (`fileColumnsMapping`) and never looks for column names in it,
 * so card 1 is a contact, not a header row — and `line` stays the card ordinal.
 *
 * Pure and client-safe. It imports `../tz-msisdn` (client-safe by its own header), `./csv-write` (the
 * formula-guard pair, C16), `./xlsx-limits` (Excel's scientific-form detector and sentence, M6/C18, and the ONE
 * phone-format remedy clause, A1.6 — itself import-free) and the format TYPE from `./parsed-file` (C15,
 * import-free), and nothing else: no lib/server, no node:, no React.
 * Guard: `npm run test:contacts-import` · red: `npm run red:contacts-import`.
 */
import { parseTzNumber } from "../tz-msisdn";
import { unguardCell } from "./csv-write";
import type { ContactsFileFormat } from "./parsed-file";
import { PHONE_FORMAT_REMEDY, excelShortenedSentence, looksExcelShortened } from "./xlsx-limits";

/* ══ THE KEYS ═══════════════════════════════════════════════════════════════════════════════════ */

/** The fields a file may feed. ⛔ There is deliberately no consent key (OD10 — see the header). */
export type ImportFieldKey = "phone" | "name" | "first_name" | "last_name" | "email" | "tags" | "notes";

/**
 * Where a vCard keeps a field (decision C20: THIS list owns the vCard→field mapping, and `vcard.ts` imports
 * it). "N" is the structured name's GIVEN and FAMILY components joined by `composeName` — prefix, additional
 * names and suffix are dropped. "ORG" is the organisation's first component.
 */
export type VcardSource = "TEL" | "FN" | "N" | "ORG" | "EMAIL" | "CATEGORIES" | "NOTE";

export type ContactFieldSpec = {
  /** The column name a mapping uses, and an alias. */
  readonly key: ImportFieldKey;
  /** The sample sheet's header, the mapping panel's label and the noun in every sentence ("Phone"). */
  readonly label: string;
  /** The export's machine header. Null for the name parts — an export writes the ONE stored name. Phone's
   *  and email's masked spellings come from `CONTACT_NOT_IMPORTED` (see `contactExportHeader`). */
  readonly exportHeader: string | null;
  /** The Swahili header the Swahili sample variant writes. READ by the importer, never written by the export. */
  readonly swAlias: string | null;
  /** STRONG spellings, written already NORMALISED (`normaliseHeader(a) === a`, §F3). The label, the key, the
   *  export header and the Swahili header must each be listed: nothing is registered implicitly, so renaming
   *  one without its alias goes red (§F4). */
  readonly aliases: readonly string[];
  /** WEAK spellings, used only when no column carries a strong one ("Namba" is often a row serial). */
  readonly weakAliases: readonly string[];
  readonly required: boolean;
  /** The longest value this field accepts, in characters — read from `CONTACT_LIMITS`, never typed here. */
  readonly maxLength: number;
  /** Where a vCard keeps it, in order of preference: the first non-empty source wins (`pickVcardValue`).
   *  EMPTY for the name parts — a vCard's N reaches the book through `name` (C20). */
  readonly vcard: readonly VcardSource[];
  /** The sample sheet's values AS WRITTEN, one per sample row (`CONTACT_SAMPLE_ROW_COUNT`). */
  readonly samples: readonly string[];
  /** One line for the mapping panel. */
  readonly hint: string;
};

/* ══ THE ONE LIMITS TABLE ═══════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ DECISION C12 — ONE TABLE. U22's form, U23's bulk bar and the importer all read it, so a name the importer
 * accepted can always be saved back unchanged through the edit form (the pre-decision specs had 80 in one
 * place and 120 in another). Lengths count CHARACTERS — Unicode code points (`charCount`) — not UTF-16 units
 * and not bytes. `phone` bounds the raw cell kept in `rawInput`; the number's own verdict is
 * `parseTzNumber`'s, never this table's.
 */
export const CONTACT_LIMITS = {
  displayName: 120,
  email: 254,
  notes: 1000,
  tag: 32,
  tags: 20,
  listName: 60,
  phone: 40,
} as const;

export const MAX_TAGS: number = CONTACT_LIMITS.tags;
export const MAX_TAG_LENGTH: number = CONTACT_LIMITS.tag;

/** How many example rows the sample sheet carries; every field has exactly this many samples. */
export const CONTACT_SAMPLE_ROW_COUNT = 3;

/** Characters as a person counts them: Unicode code points. */
export function charCount(s: string): number {
  return Array.from(String(s ?? "")).length;
}

/** A string can only be over `limit` code points if it is over `limit` UTF-16 units — the cheap test first. */
function longerThan(s: string, limit: number): boolean {
  return s.length > limit && charCount(s) > limit;
}

/* ══ THE FIELDS ═════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ THE SAMPLES ARE CHOSEN, NOT DECORATIVE — each one is something a reader must survive:
 * · every phone is written `0XXX XXX XXX` WITH SPACES, so Excel keeps it as text (a 12-digit `255…` saved
 *   from Excel comes back as `2.55745E+11`, its last digits gone — §F13 simulates that coercion). The three
 *   numbers are three operators' ranges and appear in no fixture in this repo, so `isSampleMsisdn` never
 *   collides with a test's own number.
 * · the tag cells use each of `,` `;` `|` exactly once, and the first carries an embedded comma, which forces
 *   CSV quoting.
 * · one email is mixed case, so the lower-casing is exercised; every email is @example.com (RFC 2606 — it
 *   cannot reach anyone); the third row has none, to show optional means optional.
 * · one note is longer than 75 octets and holds an em dash (three bytes in UTF-8), which forces a vCard fold
 *   and proves UTF-8 plus the BOM. It also holds `,` and `;`, which the vCard writer must escape.
 * · ⛔ no sample NAME holds a character outside GSM-7: names feed `{jina}` in a message and would force UCS-2.
 */
export const CONTACT_FIELDS: readonly ContactFieldSpec[] = [
  {
    key: "phone",
    label: "Phone",
    exportHeader: "phone_e164",
    swAlias: "Simu",
    aliases: [
      "phone", "phone e164", "phone number", "phone no", "mobile", "mobile phone", "mobile number", "mobile no",
      "cell", "cell phone", "cellphone", "msisdn", "tel", "tel no", "telephone", "whatsapp", "whatsapp number",
      "phone 1 value", "simu", "namba ya simu", "nambari ya simu", "simu ya mkononi",
    ],
    weakAliases: ["number", "namba", "nambari", "contact", "contacts"],
    required: true,
    maxLength: CONTACT_LIMITS.phone,
    vcard: ["TEL"],
    samples: ["0745 100 200", "0678 200 300", "0622 300 400"],
    // ⛔ A1.6 · ONE remedy, worded ONCE in xlsx-limits.ts: the M6 sentence beside a shortened cell and every
    // CSV-directing refusal give the officer the same step, so the panel never shows two different fixes.
    hint: `A Tanzanian mobile number in any spelling: 0745 100 200, +255 745 100 200 or 255745100200. If the list comes from Excel, ${PHONE_FORMAT_REMEDY} before you save it, so no digit is lost.`,
  },
  {
    key: "name",
    label: "Name",
    exportHeader: "name",
    swAlias: "Jina",
    aliases: ["name", "full name", "display name", "contact name", "customer name", "client name", "jina", "jina kamili", "majina"],
    weakAliases: [],
    required: false,
    maxLength: CONTACT_LIMITS.displayName,
    vcard: ["FN", "N", "ORG"],
    samples: ["Amina Juma", "Baraka Mwakyusa", "Neema Kimaro"],
    hint: "The name to use in messages. It is kept whole, never split into parts.",
  },
  {
    key: "first_name",
    label: "First name",
    exportHeader: null,
    swAlias: "Jina la kwanza",
    aliases: ["first name", "firstname", "given name", "jina la kwanza"],
    weakAliases: [],
    required: false,
    maxLength: CONTACT_LIMITS.displayName,
    vcard: [],
    samples: ["Amina", "Baraka", "Neema"],
    hint: "Read only when the file has no Name column, and joined with Last name.",
  },
  {
    key: "last_name",
    label: "Last name",
    exportHeader: null,
    swAlias: "Jina la mwisho",
    aliases: ["last name", "lastname", "surname", "family name", "jina la mwisho", "jina la ukoo"],
    weakAliases: [],
    required: false,
    maxLength: CONTACT_LIMITS.displayName,
    vcard: [],
    samples: ["Juma", "Mwakyusa", "Kimaro"],
    hint: "Read only when the file has no Name column, and joined after First name.",
  },
  {
    key: "email",
    label: "Email",
    exportHeader: "email",
    swAlias: "Barua pepe",
    aliases: ["email", "e mail", "email address", "e mail address", "e mail 1 value", "mail", "barua pepe", "anwani ya barua pepe"],
    weakAliases: [],
    required: false,
    maxLength: CONTACT_LIMITS.email,
    vcard: ["EMAIL"],
    samples: ["amina.juma@example.com", "Baraka.M@Example.com", ""],
    hint: "Optional. Stored in lower case.",
  },
  {
    key: "tags",
    label: "Tags",
    exportHeader: "tags",
    swAlias: "Makundi",
    // ⛔ A1.5 · NOT "labels" and NOT "group membership": those are Google Contacts' label columns, which hold
    // `* myContacts ::: …` — not tags under C11. They sit in CONTACT_NOT_IMPORTED with their own sentence.
    aliases: [
      "tags", "tag", "label", "groups", "group", "categories", "category",
      "segment", "segments", "makundi", "kundi", "kikundi", "lebo",
    ],
    weakAliases: [],
    required: false,
    maxLength: CONTACT_LIMITS.tag,
    vcard: ["CATEGORIES"],
    samples: ["VIP, Dar es Salaam", "customer; Arusha", "vip | Dodoma"],
    hint: `Separate tags with a comma, ; or |. Letters, digits, spaces, - and _ only, up to ${CONTACT_LIMITS.tag} characters each and ${CONTACT_LIMITS.tags} per contact. Stored in lower case.`,
  },
  {
    key: "notes",
    label: "Notes",
    exportHeader: "notes",
    swAlias: "Maelezo",
    aliases: ["notes", "note", "comments", "comment", "remarks", "description", "maelezo", "maoni"],
    weakAliases: [],
    required: false,
    maxLength: CONTACT_LIMITS.notes,
    vcard: ["NOTE"],
    samples: ["Met at the Mlimani City stand, wants match reminders by SMS — weekends only; no calls.", "Prefers messages in Swahili.", ""],
    hint: `Optional, up to ${CONTACT_LIMITS.notes} characters.`,
  },
];

/**
 * The columns a file of OURS carries: the export writes them, the sample sheet shows them, and a vCard
 * becomes them (U26 emits one row per card in this order, each cell filled by `pickVcardValue`, and ⛔ NO
 * header row — A1.2). The name parts are import-only — read from a foreign file when it has no Name column.
 */
export function fileColumns(fields: readonly ContactFieldSpec[] = CONTACT_FIELDS): readonly ContactFieldSpec[] {
  return fields.filter((f) => f.exportHeader !== null);
}

/**
 * ⭐ A1.2 · the FIXED mapping a vCard grid is read by: each `fileColumns()` field at its own position
 * (`{ phone: 0, name: 1, email: 2, tags: 3, notes: 4 }`). Derived from the list, never typed, so the reader
 * that fills the cells and the mapping that reads them cannot disagree about the order.
 */
export function fileColumnsMapping(fields: readonly ContactFieldSpec[] = CONTACT_FIELDS): ColumnMapping {
  const mapping: ColumnMapping = {};
  fileColumns(fields).forEach((f, index) => {
    mapping[f.key] = index;
  });
  return mapping;
}

/* ══ THE COLUMNS THAT ARE RECOGNISED IN ORDER NOT TO BE READ ════════════════════════════════════ */

export type NotImportedColumn = {
  /** exportOnly: our export writes it, an import ignores it. refused: its presence refuses the whole file.
   *  foreign: another product's column that looks like one of ours but is not (Google's labels, A1.5) — our
   *  export never writes it; an import names it and does not read it. */
  readonly kind: "exportOnly" | "refused" | "foreign";
  /** The header our export writes for it (null when the export never writes it). */
  readonly header: string | null;
  /** For a masked export column: the field whose masked spelling this is (M5). Null otherwise. */
  readonly masks: ImportFieldKey | null;
  /** Spellings, written normalised, exactly as `ContactFieldSpec.aliases`. */
  readonly aliases: readonly string[];
  /** The ONE sentence the mapping panel shows for this column. */
  readonly reason: string;
};

/** ⛔ OD10, in words: the mapping panel's sentence for any Consent column. */
export const CONTACT_CONSENT_NOT_READ =
  "Consent is never read from a file — it is recorded with the basis you choose before Apply.";

/** A masked export, refused whole. ⛔ It never echoes a cell: the example is the mask's own shape. */
export const CONTACT_MASKED_FILE =
  "These numbers are masked (+255••••01), so this file cannot be imported. Export the book again as someone who can see full numbers.";

/** The same refusal for the masked email column, which only a masked export writes (M5). */
export const CONTACT_MASKED_EMAIL_FILE =
  "This file's email addresses are masked, so it cannot be imported. Export the book again as someone who can see full contact details.";

/**
 * ⛔ A1.5, in words: the mapping panel's sentence for Google Contacts' label columns ("Labels", the older
 * "Group Membership"). Their cells read `* myContacts ::: Friends` — a system label and Google's own separator,
 * neither of which is a tag under C11 — so mapping them would put a tags problem on EVERY row of the most likely
 * source file. ⛔ The example is Google's shape, never a cell from the file.
 */
export const CONTACT_GOOGLE_LABELS_NOT_READ =
  "Google's contact labels (like * myContacts ::: Friends) are not tags, so this column is not read. To keep some as tags, put them in a column named Tags, separated by commas, and map that column.";

export const CONTACT_NOT_IMPORTED: readonly NotImportedColumn[] = [
  {
    kind: "exportOnly",
    header: "operator",
    masks: null,
    aliases: ["operator", "network", "carrier"],
    reason: "The network is worked out from the number itself, so this column is not read.",
  },
  {
    kind: "exportOnly",
    header: "consent",
    masks: null,
    aliases: [
      "consent", "consent state", "consent status", "opt in", "optin", "opted in", "opt out", "optout", "opted out",
      "subscribed", "unsubscribed", "marketing", "marketing consent", "sms consent", "ridhaa", "kibali",
    ],
    reason: CONTACT_CONSENT_NOT_READ,
  },
  {
    kind: "exportOnly",
    header: "source",
    masks: null,
    aliases: ["source", "contact source"],
    reason: "Where a contact came from is recorded by the import itself, so this column is not read.",
  },
  {
    kind: "exportOnly",
    header: "added_at",
    masks: null,
    aliases: ["added at", "date added", "created at", "created"],
    reason: "The date a contact was added is set when it is saved, so this column is not read.",
  },
  {
    kind: "refused",
    header: "phone_masked",
    masks: "phone",
    aliases: ["phone masked", "msisdn masked"],
    reason: CONTACT_MASKED_FILE,
  },
  {
    kind: "refused",
    header: "email_masked",
    masks: "email",
    aliases: ["email masked"],
    reason: CONTACT_MASKED_EMAIL_FILE,
  },
  {
    kind: "foreign",
    header: null,
    masks: null,
    aliases: ["labels", "group membership"],
    reason: CONTACT_GOOGLE_LABELS_NOT_READ,
  },
];

/* ══ HEADER NORMALISATION ═══════════════════════════════════════════════════════════════════════ */

/* ⛔ MODULE-LEVEL, NOT PER CALL — an import runs these per header and per cell. The `/g` ones are only ever
 * used with `String.replace`, never with `.test` (a `/g` regex carries `lastIndex` state). */
const FORMAT_CHARS = /\p{Cf}/gu;
const COMBINING_MARKS = /\p{M}/gu;
const HEADER_SEPARATORS = /[\s\p{Cc}\p{Pd}_.\/:#()*]+/gu;
const WHITESPACE = /\s+/g;
const CONTROL_CHARS = /\p{Cc}/gu;
const NEWLINES = /\r\n?/g;
const NON_DIGITS = /\D/g;
const LF = String.fromCharCode(10);
const TAB = String.fromCharCode(9);
/* The two joiners some scripts and emoji sequences need — built from their codes, never typed (repo memory). */
const ZWNJ = String.fromCharCode(0x200c);
const ZWJ = String.fromCharCode(0x200d);

/**
 * Invisible format characters out of a value a person will SEE — a stored name or note, an echoed header:
 * the direction overrides and isolates (U+202A–U+202E, U+2066–U+2069) that would make an admin row or an SMS
 * `{jina}` render backwards, zero-width spaces, word joiners and a stray BOM. ⭐ The zero-width joiner and
 * non-joiner are KEPT: Persian, Indic scripts and emoji sequences need them to render correctly.
 * (`xlsx-limits.ts`' sheet-name echo drops the same direction controls.)
 */
function dropFormatChars(s: string): string {
  return s.replace(FORMAT_CHARS, (c) => (c === ZWNJ || c === ZWJ ? c : ""));
}

/**
 * The form every alias is written in and every header is looked up by. Format characters go first (a BOM —
 * C19's belt; `stripBom` in the CSV reader is the decode-time stripper — or a zero-width space), then NFKD
 * with the combining marks removed, lower case, and every run of whitespace, control characters, dashes and
 * `_ . / : # ( ) *` becomes one space. So "Phone 1 - Value" → "phone 1 value", "E-mail" → "e mail",
 * " SIMU: " → "simu".
 */
export function normaliseHeader(raw: string): string {
  return String(raw ?? "")
    .replace(FORMAT_CHARS, "")
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(HEADER_SEPARATORS, " ")
    .trim();
}

/* ══ THE ONE TAG RULE (decision C11) ════════════════════════════════════════════════════════════ */

/**
 * ⭐ ONE RULE FOR EVERY WRITER — the form (U22), the bulk bar (U23) and the importer — and the ONE grouping key
 * for every reader (U21's tag pill, U31's merge). Split on `,` `;` `|`; NFKC; trim; inner whitespace
 * collapsed; STORED LOWER CASE; letters, digits, space, `-` and `_` only; 1–32 characters; at most 20 per
 * contact; de-duplicated case-insensitively (which lower case makes exact).
 *
 * ⚠️ RECORDED, NOT HIDDEN: Google Contacts' Labels column separates with ` ::: ` and carries system labels
 * like `* myContacts`. Under C11 those are not separators, and `*` and `:` are not tag characters, so such a
 * cell, typed or mapped by hand, is REFUSED by `checkTags` with one sentence — never silently mangled. And
 * since A1.5 the Google columns ("Labels", "Group Membership") are no longer tag aliases at all: they are
 * recognised in `CONTACT_NOT_IMPORTED` and not read, so a Google export never auto-maps them into a tags
 * problem on every row. C11 is unchanged; `test:contacts-import` §F11b and §F28 pin both answers.
 *
 * ⛔ A tag needs at least one letter or digit: a lone combining mark, or only `-` and `_`, renders as nothing
 * (or as punctuation) and is refused with its own sentence.
 */
const TAG_SEPARATORS = /[,;|]/;
const TAG_ALLOWED = /^[\p{L}\p{M}\p{N} _-]+$/u;
const TAG_HAS_LETTER = /[\p{L}\p{N}]/u;

export const TAG_CHARACTERS_SENTENCE = "A tag can hold only letters, digits, spaces, - and _.";
export const TAG_NEEDS_LETTER_SENTENCE = "A tag needs at least one letter or digit.";
export const TAG_EMPTY_SENTENCE = "Type a tag.";
export const TAG_ONE_AT_A_TIME_SENTENCE = "Type one tag at a time — a comma, ; or | separates tags.";

/** A tag's stored form, and the key every reader groups by: NFKC, whitespace collapsed, trimmed, lower case. */
export function tagKey(tag: string): string {
  return String(tag ?? "").normalize("NFKC").replace(WHITESPACE, " ").trim().toLowerCase();
}

/** A cell of tags → the stored tags, in order of first appearance, empties and repeats dropped. Never validates. */
export function splitTags(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const piece of String(raw ?? "").split(TAG_SEPARATORS)) {
    const tag = tagKey(piece);
    if (tag === "" || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

/** Stored tags → one cell. `splitTags(joinTags(splitTags(x)))` equals `splitTags(x)`. */
export function joinTags(tags: readonly string[]): string {
  return tags.join(", ");
}

export type TagLimits = { readonly tag: number; readonly tags: number };

/**
 * The first rule a tag list breaks, as ONE sentence for a person — or null. ⛔ The sentence names the rule and
 * the limit and never the tag itself (a tags cell can hold anything someone pasted).
 */
export function checkTags(
  tags: readonly string[],
  limits: TagLimits = { tag: CONTACT_LIMITS.tag, tags: CONTACT_LIMITS.tags },
): string | null {
  if (tags.length > limits.tags) return `A contact can have at most ${limits.tags} tags.`;
  for (const t of tags) {
    if (t.length === 0) return TAG_EMPTY_SENTENCE;
    if (longerThan(t, limits.tag)) return `Each tag can be at most ${limits.tag} characters.`;
  }
  for (const t of tags) if (!TAG_ALLOWED.test(t)) return TAG_CHARACTERS_SENTENCE;
  for (const t of tags) if (!TAG_HAS_LETTER.test(t)) return TAG_NEEDS_LETTER_SENTENCE;
  return null;
}

export type TagsVerdict = { readonly ok: true; readonly tags: string[] } | { readonly ok: false; readonly sentence: string };

/** A writer's one call for a tags field (U22's form): split, then check. */
export function parseTags(raw: string): TagsVerdict {
  const tags = splitTags(raw);
  const problem = checkTags(tags);
  return problem === null ? { ok: true, tags } : { ok: false, sentence: problem };
}

export type OneTagVerdict = { readonly ok: true; readonly tag: string } | { readonly ok: false; readonly sentence: string };

/** ONE tag typed on its own (U23's bulk "Tag" box): a separator is refused rather than split. */
export function parseOneTag(raw: string): OneTagVerdict {
  const text = String(raw ?? "");
  if (TAG_SEPARATORS.test(text)) return { ok: false, sentence: TAG_ONE_AT_A_TIME_SENTENCE };
  const tag = tagKey(text);
  if (tag === "") return { ok: false, sentence: TAG_EMPTY_SENTENCE };
  const problem = checkTags([tag]);
  return problem === null ? { ok: true, tag } : { ok: false, sentence: problem };
}

/* ══ NAMES ══════════════════════════════════════════════════════════════════════════════════════ */

/**
 * A name as stored: NFC, invisible format characters dropped (direction overrides, zero-width spaces — the two
 * joiners kept, see `dropFormatChars`), whitespace collapsed, control characters removed, trimmed; empty
 * becomes null.
 */
export function cleanDisplayName(raw: string): string | null {
  const t = dropFormatChars(String(raw ?? "").normalize("NFC"))
    .replace(WHITESPACE, " ")
    .replace(CONTROL_CHARS, "")
    .replace(WHITESPACE, " ")
    .trim();
  return t === "" ? null : t;
}

/**
 * Given + family → one name, joined by one space. ⭐ The ONE composer: `draftContactRow` uses it for a file's
 * First name / Last name columns, and U26 uses it for a vCard's N (C20), so the two cannot disagree.
 */
export function composeName(given: string, family: string): string | null {
  const parts = [cleanDisplayName(given), cleanDisplayName(family)].filter((p): p is string => p !== null);
  return parts.length > 0 ? parts.join(" ") : null;
}

/* ══ THE vCARD MAPPING (decision C20) ═══════════════════════════════════════════════════════════ */

/** A card's values by source. U26 fills N with `composeName(given, family)` and ORG with its first component. */
export type VcardValues = Partial<Record<VcardSource, string | null>>;

/** The field's value from a card: the first of `field.vcard` that is non-empty. Name = FN, else N, else ORG. */
export function pickVcardValue(field: ContactFieldSpec, values: VcardValues): string {
  for (const source of field.vcard) {
    const v = String(values[source] ?? "").trim();
    if (v !== "") return v;
  }
  return "";
}

/* ══ THE VOCABULARY — the factory and its types ═════════════════════════════════════════════════ */

export type HeaderMatch =
  | { readonly kind: "field"; readonly field: ImportFieldKey; readonly strength: "strong" | "weak" }
  | { readonly kind: "notImported"; readonly refused: boolean; readonly reason: string }
  | { readonly kind: "unknown" };

/** Field → column index. A field takes at most one column (by shape); a column at most one field (checked). */
export type ColumnMapping = Partial<Record<ImportFieldKey, number>>;

export type MappedColumn = {
  readonly index: number;
  readonly header: string;
  readonly status: "mapped" | "unused" | "notImported" | "unknown";
  /** The field the column feeds (mapped) or would have fed (unused). */
  readonly field: ImportFieldKey | null;
  /** One sentence for the mapping panel, or null for a mapped column. */
  readonly note: string | null;
};

export type AutoMapResult = {
  readonly mapping: ColumnMapping;
  readonly columns: readonly MappedColumn[];
  /** The first row reads as a contact, not as column names. */
  readonly headerless: boolean;
  /** Why this file cannot be imported as it stands, in one sentence — or null. */
  readonly refusal: string | null;
};

/**
 * `autoMapHeaders`' answer, for a whole parsed file (A1.2). `headerRows` is how many leading rows are column
 * names — 1 for CSV, XLSX and paste, 0 for a vCard — so the caller drafts `rows.slice(headerRows)` and a card is
 * never lost to a header row. For a vCard, `columns` carry the `fileColumns()` labels as their headers: pass
 * `columns.map((c) => c.header)` to `validateMapping` for the panel's manual overrides.
 */
export type FileMapResult = AutoMapResult & { readonly headerRows: 0 | 1 };

export type MappingVerdict = { readonly ok: true } | { readonly ok: false; readonly sentence: string };

export type FieldProblem = { readonly field: ImportFieldKey; readonly sentence: string };

/**
 * One file row, drafted for the book. ⛔ Exactly these six keys — no first/last keys (a name is never stored
 * in parts), and no consent, source or operator (none of them is ever read from a file).
 * `rawPhone` is the unguarded, trimmed Phone cell, kept for `rawInput`; its VERDICT is `parseTzNumber`'s and
 * belongs to U30, except Excel's scientific form, which is a problem here (M6).
 */
export type ContactDraft = {
  readonly rawPhone: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly tags: string[];
  readonly notes: string | null;
  readonly problems: readonly FieldProblem[];
};

export type ContactVocabulary = {
  readonly fields: readonly ContactFieldSpec[];
  readonly notImported: readonly NotImportedColumn[];
  /**
   * Normalised spellings claimed twice. §F3 requires none. The first claim wins, and the not-imported columns
   * claim FIRST, so a consent word attached to a field by mistake still refuses — it fails closed.
   */
  readonly collisions: readonly string[];
  readonly matchHeader: (raw: string) => HeaderMatch;
  readonly autoMapHeaders: (headers: readonly string[]) => AutoMapResult;
  /** A1.2 · the format decides: a vCard is mapped by `fileColumnsMapping` and never header-matched; every
   *  other format header-matches its first row through `autoMapHeaders`. */
  readonly autoMapFile: (format: ContactsFileFormat, firstRow: readonly string[]) => FileMapResult;
  readonly validateMapping: (headers: readonly string[], mapping: ColumnMapping) => MappingVerdict;
  readonly draftContactRow: (cells: readonly string[], mapping: ColumnMapping) => ContactDraft;
  readonly exportHeader: (full: boolean) => readonly string[];
};

const UNKNOWN_MATCH: HeaderMatch = { kind: "unknown" };
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTE_BLANK_HEADER = "This column has no name, so it is not read.";
const NOTE_UNKNOWN_HEADER = "This is not a contact field, so it is not read.";
const MAPPING_UNKNOWN_FIELD = "This mapping names a field the contact book does not have.";
const MAPPING_NO_SUCH_COLUMN = "This mapping points at a column the file does not have.";
const MAPPING_NO_PHONE = "Choose the column that holds the phone numbers.";
const HEADERS_LISTED = 8;
const HEADER_CLIP = 30;

const isNamePart = (k: ImportFieldKey): boolean => k === "first_name" || k === "last_name";

/** A header with six or more digits "reads as a number": the refusal then lists no headers (§5.14). */
const readsAsNumber = (h: string): boolean => h.replace(NON_DIGITS, "").length >= 6;

/** Only digits, spaces and the punctuation a phone number is written with — nothing else. */
const NUMBER_SHAPED = /^[\s'+().\d-]+$/;

/**
 * A first-row cell that IS a contact's number, so the file has no header row. 🔴 It must be SHAPED like a
 * number before `parseTzNumber` is asked: the parser drops every non-digit, so a real header such as
 * "Phone (0712 345 678)" or "Simu 0754123456" would otherwise refuse the whole file as headerless.
 */
const readsAsContactNumber = (h: string): boolean => {
  const t = dropFormatChars(h);
  return NUMBER_SHAPED.test(t) && parseTzNumber(t).verdict === "ok";
};

const clipHeader = (raw: string): string => {
  const h = dropFormatChars(raw);
  return charCount(h) <= HEADER_CLIP ? h : `${Array.from(h).slice(0, HEADER_CLIP).join("")}…`;
};

const cellTooLong = (label: string, limit: number): string => `The ${label} cell is longer than ${limit} characters.`;

/** A Notes value: CRLF and CR become LF, invisible format characters and control characters other than LF and
 *  TAB go (the two joiners stay), trimmed; empty is null. */
function cleanNotes(raw: string): string | null {
  const t = dropFormatChars(raw)
    .replace(NEWLINES, LF)
    .replace(CONTROL_CHARS, (c) => (c === LF || c === TAB ? c : ""))
    .trim();
  return t === "" ? null : t;
}

/**
 * ⭐ THE FACTORY. Pure: the same lists in, the same behaviour out, and nothing read from anywhere else.
 * The named exports below are its instance over `CONTACT_FIELDS` and `CONTACT_NOT_IMPORTED`.
 */
export function buildContactVocabulary(
  fields: readonly ContactFieldSpec[],
  notImported: readonly NotImportedColumn[],
): ContactVocabulary {
  const byKey = new Map<ImportFieldKey, ContactFieldSpec>(fields.map((f): [ImportFieldKey, ContactFieldSpec] => [f.key, f]));
  const phone = byKey.get("phone");
  if (!phone) throw new Error("contact-fields: a vocabulary needs a phone field");
  const labelOf = (k: ImportFieldKey): string => byKey.get(k)?.label ?? k;

  // ── the alias Map, built ONCE ──────────────────────────────────────────────────────────────────
  const lookup = new Map<string, HeaderMatch>();
  const collisions: string[] = [];
  const claim = (alias: string, match: HeaderMatch): void => {
    const key = normaliseHeader(alias);
    if (key === "") return;
    if (lookup.has(key)) collisions.push(key);
    else lookup.set(key, match);
  };
  for (const e of notImported) {
    const match: HeaderMatch = { kind: "notImported", refused: e.kind === "refused", reason: e.reason };
    for (const a of e.aliases) claim(a, match);
  }
  for (const f of fields) {
    for (const a of f.aliases) claim(a, { kind: "field", field: f.key, strength: "strong" });
    for (const a of f.weakAliases) claim(a, { kind: "field", field: f.key, strength: "weak" });
  }

  const matchHeader = (raw: string): HeaderMatch => lookup.get(normaliseHeader(raw)) ?? UNKNOWN_MATCH;

  // ── the refusal sentences, derived from the list ───────────────────────────────────────────────
  const sheetLabels = fileColumns(fields).map((f) => f.label).join(", ");
  const headerlessSentence =
    `The first row looks like a contact, not column names. Add a header row (${sheetLabels}) and upload it again.`;
  const noPhoneBase =
    `This file has no ${phone.label} column. Name the column that holds the numbers "${phone.label}"` +
    `${phone.swAlias ? ` (or "${phone.swAlias}")` : ""} and upload it again.`;
  /**
   * ⛔ §5.14 — the headers are LISTED only when the row is demonstrably column names: at least one of them is a
   * spelling this vocabulary knows, none reads as a number, and none holds an `@`. A headerless list with no phone
   * column (names and emails, say) would otherwise echo its first contact into the sentence. The price, accepted: a
   * real header row made only of spellings this vocabulary does not know is not listed either — the sentence still
   * names the fix.
   * ⚠️ RESIDUAL, RECORDED: a first DATA row in which one cell happens to be a known spelling ("Contact", "Notes")
   * and the others carry no digits and no `@` (a bare name) is still listed — it needs a contact whose cell is
   * literally a column word, in a file with no phone column at all.
   */
  const noPhoneSentence = (headers: readonly string[], matches: readonly HeaderMatch[]): string => {
    const named = headers.map((h) => dropFormatChars(String(h ?? "")).trim()).filter((h) => h !== "");
    const recognised = matches.some((m) => m.kind !== "unknown");
    if (named.length === 0 || !recognised || named.some((h) => readsAsNumber(h) || h.includes("@"))) return noPhoneBase;
    const shown = named.slice(0, HEADERS_LISTED).map(clipHeader);
    const more = named.length - shown.length;
    return `${noPhoneBase} The columns found: ${shown.join(", ")}${more > 0 ? ` and ${more} more` : ""}.`;
  };

  // ── autoMapHeaders ─────────────────────────────────────────────────────────────────────────────
  const autoMapHeaders = (headers: readonly string[]): AutoMapResult => {
    const matches = headers.map((h) => matchHeader(String(h ?? "")));
    // Strength first, then position: a strong column replaces a weak winner; otherwise the leftmost stays.
    const winner = new Map<ImportFieldKey, { index: number; strength: "strong" | "weak" }>();
    matches.forEach((m, index) => {
      if (m.kind !== "field") return;
      const current = winner.get(m.field);
      if (current === undefined || (current.strength === "weak" && m.strength === "strong")) {
        winner.set(m.field, { index, strength: m.strength });
      }
    });
    // ⛔ The parts are read only when no Name column matched — a present Name is never overridden by parts.
    const nameMapped = winner.has("name");
    const mapping: ColumnMapping = {};
    for (const [key, w] of winner) {
      if (nameMapped && isNamePart(key)) continue;
      mapping[key] = w.index;
    }

    const columns = headers.map((h, index): MappedColumn => {
      const header = dropFormatChars(String(h ?? ""));
      const m = matches[index];
      if (m.kind === "notImported") return { index, header, status: "notImported", field: null, note: m.reason };
      if (m.kind === "unknown") {
        return { index, header, status: "unknown", field: null, note: header.trim() === "" ? NOTE_BLANK_HEADER : NOTE_UNKNOWN_HEADER };
      }
      if (mapping[m.field] === index) return { index, header, status: "mapped", field: m.field, note: null };
      const note = nameMapped && isNamePart(m.field)
        ? `The ${labelOf("name")} column is used, so this one is not read.`
        : `Another ${labelOf(m.field)} column is used — this one is not read.`;
      return { index, header, status: "unused", field: m.field, note };
    });

    const refused = matches.find((m): m is Extract<HeaderMatch, { kind: "notImported" }> => m.kind === "notImported" && m.refused);
    const headerless = headers.some((h) => readsAsContactNumber(String(h ?? "")));
    let refusal: string | null = null;
    if (refused) refusal = refused.reason;
    else if (headerless) refusal = headerlessSentence; // ⛔ never echoes the cell (§5.14)
    else if (mapping.phone === undefined) refusal = noPhoneSentence(headers, matches);
    return { mapping, columns, headerless, refusal };
  };

  // ── autoMapFile (A1.2: a vCard has NO header row) ──────────────────────────────────────────────
  const gridMapping = fileColumnsMapping(fields);
  const gridColumns: readonly MappedColumn[] = fileColumns(fields).map(
    (f, index): MappedColumn => ({ index, header: f.label, status: "mapped", field: f.key, note: null }),
  );
  const autoMapFile = (format: ContactsFileFormat, firstRow: readonly string[]): FileMapResult => {
    // ⛔ Never header-matched: card 1 is a contact, and its number would read as a "headerless" refusal.
    if (format === "vcard") {
      return { mapping: { ...gridMapping }, columns: gridColumns.map((c) => ({ ...c })), headerless: false, refusal: null, headerRows: 0 };
    }
    return { ...autoMapHeaders(firstRow), headerRows: 1 };
  };

  // ── validateMapping (the mapping panel's manual overrides — and a forged request) ──────────────
  const fieldKeys = new Set<string>(fields.map((f) => f.key));
  const validateMapping = (headers: readonly string[], mapping: ColumnMapping): MappingVerdict => {
    const matches = headers.map((h) => matchHeader(String(h ?? "")));
    // A masked export is refused WHOLE, whatever column the officer points Phone at.
    for (const m of matches) if (m.kind === "notImported" && m.refused) return { ok: false, sentence: m.reason };

    const used = new Map<number, ImportFieldKey>();
    for (const [key, index] of Object.entries(mapping ?? {})) {
      if (index === undefined) continue;
      if (!fieldKeys.has(key)) {
        // ⛔ OD10 at the wire: a request naming "consent" gets the consent sentence, not a generic one.
        const asHeader = matchHeader(key);
        return { ok: false, sentence: asHeader.kind === "notImported" ? asHeader.reason : MAPPING_UNKNOWN_FIELD };
      }
      const field = key as ImportFieldKey;
      if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= headers.length) {
        return { ok: false, sentence: MAPPING_NO_SUCH_COLUMN };
      }
      const m = matches[index];
      // ⛔ A not-imported column — Consent, Operator, Source, Added, Google's labels — can feed NO field, Notes and
      // Tags included.
      if (m.kind === "notImported") return { ok: false, sentence: m.reason };
      const other = used.get(index);
      if (other !== undefined) {
        return { ok: false, sentence: `${labelOf(other)} and ${labelOf(field)} cannot read the same column — choose one column for each.` };
      }
      used.set(index, field);
    }
    for (const f of fields) {
      if (f.required && mapping?.[f.key] === undefined) {
        return { ok: false, sentence: f.key === "phone" ? MAPPING_NO_PHONE : `Choose a column for ${f.label}.` };
      }
    }
    return { ok: true };
  };

  // ── draftContactRow ────────────────────────────────────────────────────────────────────────────
  const nameSpec = byKey.get("name");
  const emailSpec = byKey.get("email");
  const tagsSpec = byKey.get("tags");
  const notesSpec = byKey.get("notes");
  const tagLimits: TagLimits = { tag: tagsSpec?.maxLength ?? CONTACT_LIMITS.tag, tags: CONTACT_LIMITS.tags };

  const draftContactRow = (cells: readonly string[], mapping: ColumnMapping): ContactDraft => {
    // Every mapped cell is unguarded first; a ragged row's missing cells read as "".
    const cellOf = (k: ImportFieldKey): string => {
      const i = mapping[k];
      if (i === undefined) return "";
      const v = cells[i];
      return unguardCell(v == null ? "" : String(v));
    };
    const problems: FieldProblem[] = [];

    // ⛔ Every sentence names the field and the limit and NEVER the cell's value (§5.14).
    const rawPhone = cellOf("phone").trim();
    if (longerThan(rawPhone, phone.maxLength)) problems.push({ field: "phone", sentence: cellTooLong(phone.label, phone.maxLength) });
    // 🔴 M6 — flagged HERE, once, for every producer (CSV, paste, XLSX text). Excel saves a 12-digit General
    // number as `2.55713E+11` and the last digits are GONE; `parseTzNumber` would call it "cut off", which sends
    // the officer looking in the wrong place. ⛔ Never "repaired": the expansion is a stranger's number. The
    // detector and its sentence are U27's (`xlsx-limits.ts`, the ONE copy table — C18).
    else if (looksExcelShortened(rawPhone)) problems.push({ field: "phone", sentence: excelShortenedSentence() });

    let displayName: string | null = null;
    const nameLimit = nameSpec?.maxLength ?? CONTACT_LIMITS.displayName;
    if (mapping.name !== undefined) {
      displayName = cleanDisplayName(cellOf("name"));
      if (displayName !== null && longerThan(displayName, nameLimit)) {
        problems.push({ field: "name", sentence: cellTooLong(labelOf("name"), nameLimit) });
      }
    } else if (mapping.first_name !== undefined || mapping.last_name !== undefined) {
      displayName = composeName(cellOf("first_name"), cellOf("last_name"));
      if (displayName !== null && longerThan(displayName, nameLimit)) {
        problems.push({ field: "name", sentence: `${labelOf("first_name")} and ${labelOf("last_name")} together are longer than ${nameLimit} characters.` });
      }
    }

    const emailCell = cellOf("email").trim().toLowerCase();
    const email = emailCell === "" ? null : emailCell;
    if (email !== null) {
      const emailLabel = labelOf("email");
      const emailLimit = emailSpec?.maxLength ?? CONTACT_LIMITS.email;
      if (longerThan(email, emailLimit)) problems.push({ field: "email", sentence: cellTooLong(emailLabel, emailLimit) });
      else if (!EMAIL_SHAPE.test(email)) {
        problems.push({ field: "email", sentence: `The ${emailLabel} cell doesn't look like an email address (name@example.com).` });
      }
    }

    const tags = splitTags(cellOf("tags"));
    const tagProblem = checkTags(tags, tagLimits);
    if (tagProblem !== null) problems.push({ field: "tags", sentence: tagProblem });

    const notes = cleanNotes(cellOf("notes"));
    const notesLimit = notesSpec?.maxLength ?? CONTACT_LIMITS.notes;
    if (notes !== null && longerThan(notes, notesLimit)) problems.push({ field: "notes", sentence: cellTooLong(labelOf("notes"), notesLimit) });

    return { rawPhone, displayName, email, tags, notes, problems };
  };

  // ── exportHeader (U34's ONLY header source) ────────────────────────────────────────────────────
  const exportHeader = (full: boolean): readonly string[] => {
    const out: string[] = [];
    for (const f of fileColumns(fields)) {
      const masked = full ? undefined : notImported.find((e) => e.kind === "refused" && e.masks === f.key && e.header !== null);
      out.push(masked?.header ?? String(f.exportHeader));
    }
    for (const e of notImported) if (e.kind === "exportOnly" && e.header !== null) out.push(e.header);
    return out;
  };

  return { fields, notImported, collisions, matchHeader, autoMapHeaders, autoMapFile, validateMapping, draftContactRow, exportHeader };
}

/* ══ THE DEFAULT INSTANCE — what every caller imports ═══════════════════════════════════════════ */

export const CONTACT_VOCABULARY: ContactVocabulary = buildContactVocabulary(CONTACT_FIELDS, CONTACT_NOT_IMPORTED);

/** What a header means: a field (strong or weak), a column recognised in order not to be read, or unknown. */
export function matchHeader(raw: string): HeaderMatch {
  return CONTACT_VOCABULARY.matchHeader(raw);
}

/**
 * The mapping panel's starting point. Strength beats position; the name parts only without a Name column; a
 * refused (masked) header refuses the file; a first row whose cell IS a number (shaped like one, not a header
 * that merely holds digits) refuses with a sentence that never echoes it; no Phone column refuses, listing the
 * headers only when they are demonstrably column names (one is known, none reads as a number or holds an `@`).
 * ⛔ For a vCard call `autoMapFile` instead — a vCard has no header row (A1.2).
 */
export function autoMapHeaders(headers: readonly string[]): AutoMapResult {
  return CONTACT_VOCABULARY.autoMapHeaders(headers);
}

/**
 * ⭐ A1.2 · the mapping for a whole parsed file: a vCard (`format: "vcard"`) is read by the fixed
 * `fileColumns()` order with `headerRows: 0`; CSV, XLSX and paste header-match their first row
 * (`headerRows: 1`). Draft `rows.slice(headerRows)`.
 */
export function autoMapFile(format: ContactsFileFormat, firstRow: readonly string[]): FileMapResult {
  return CONTACT_VOCABULARY.autoMapFile(format, firstRow);
}

/** The officer's manual mapping, checked: Phone required, one column per field and one field per column,
 *  no not-imported column mapped, and a masked export refused whole. */
export function validateMapping(headers: readonly string[], mapping: ColumnMapping): MappingVerdict {
  return CONTACT_VOCABULARY.validateMapping(headers, mapping);
}

/** One row → a draft for the book, with any problems as sentences. */
export function draftContactRow(cells: readonly string[], mapping: ColumnMapping): ContactDraft {
  return CONTACT_VOCABULARY.draftContactRow(cells, mapping);
}

/**
 * ⭐ U34's ONLY header source: `phone_e164, name, email, tags, notes, operator, consent, source, added_at`.
 * Masked (`full` false), both identity columns say so — `phone_masked` and `email_masked` (M5) — because a CSV
 * has no eye and no tooltip: the header is the only place a spreadsheet can say which artefact it is.
 */
export function contactExportHeader(full: boolean): readonly string[] {
  return CONTACT_VOCABULARY.exportHeader(full);
}
