/**
 * test:contacts-import · section "fields" — U28a: the ONE field list (`src/lib/contacts/contact-fields.ts`), the
 * CSV writer pair (`csv-write.ts`) and the sample sheets (`sample-sheet.ts`).          (S10, 2026-10-01)
 *
 * ⭐ EXECUTED, NOT READ, wherever the behaviour can run in a script: the header vectors (Swahili and tolerance),
 * strength-then-position, the masked and headerless refusals, the tag rule, the limits, Excel's coercion of the
 * phone samples, the guard pair's round trip, the vCard fold. The SOURCE is read only for what only the source
 * can show: what each module imports (§F1), and that no other file in the contacts trees keeps a second list
 * (§F20) or a file entrance without the sample button (§F21).
 *
 * ⭐ THE DECISIONS ARE ASSERTED HERE TOO (`DECISIONS-U21-U28`): C11 the one tag rule (§F11), C12 the one limits
 * table (§F12a), C16 the guard pair with the apostrophe lead (§F15), C20 the vCard mapping in the list (§F24),
 * M5 the masked email header (§F25), M6 Excel's scientific form flagged in `draftContactRow` (§F23), and from
 * AMENDMENT A1: a vCard is never header-matched (A1.2, §F27), Google's label columns are recognised and not read
 * (A1.5, §F28), and the Phone hint carries the ONE phone-format remedy (A1.6, §F29).
 *
 * ⭐ PROVED BY MUTATION. Every label below is named by at least one red plant EXCEPT four, said here rather than
 * discovered: F0 and F14b compare the module's own named exports with themselves (no bundle can swap a module
 * export), and F20b and F21b ARE controls — each feeds its scanner a planted file. Each plant is built so that its
 * own label is the one it breaks, not a neighbour that happens to fail first; where a plant breaks a neighbour as
 * well, the runner still requires its own label to be among the reds.
 *
 * ⛔ NO PARSER LIVES HERE. A second CSV or vCard reader in the suite is exactly the defect U28 forbids, so the
 * round trips through the REAL readers are U28b: §F16–§F18 (CSV, through U25's reader) and §F19b (vCard, through U26's)
 * have landed; the XLSX case waits for U27b's reader — see the TODO at the end of this file.
 * What can be checked without a reader is: the sample rows handed straight to `draftContactRow` (§F16a), and
 * the writer's own envelope (§F19a, §F26).
 *
 * ⛔ IN-PROCESS. Every plant below is a replacement bundle built in memory; this module reads files and makes
 * no file-writing call.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "../lib/decomment.mts";
import { srcFiles } from "../lib/tracked-files.mts";
import type { ImportSection, RedPlant, SectionContext } from "../contacts-import.test.mts";
import {
  CONTACT_CONSENT_NOT_READ,
  CONTACT_FIELDS,
  CONTACT_GOOGLE_LABELS_NOT_READ,
  CONTACT_LIMITS,
  CONTACT_MASKED_FILE,
  CONTACT_NOT_IMPORTED,
  CONTACT_SAMPLE_ROW_COUNT,
  CONTACT_VOCABULARY,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  TAG_CHARACTERS_SENTENCE,
  TAG_NEEDS_LETTER_SENTENCE,
  autoMapFile,
  autoMapHeaders,
  buildContactVocabulary,
  checkTags,
  composeName,
  contactExportHeader,
  draftContactRow,
  fileColumns,
  fileColumnsMapping,
  joinTags,
  matchHeader,
  normaliseHeader,
  parseOneTag,
  pickVcardValue,
  splitTags,
  tagKey,
  validateMapping,
  type ColumnMapping,
  type ContactDraft,
  type ContactFieldSpec,
  type ContactVocabulary,
  type HeaderMatch,
  type ImportFieldKey,
  type MappingVerdict,
  type NotImportedColumn,
  type OneTagVerdict,
} from "../../src/lib/contacts/contact-fields.ts";
import { CSV_BOM, CSV_GUARD_LEADS, csvCell, guardCell, toCsv, unguardCell } from "../../src/lib/contacts/csv-write.ts";
import { PHONE_FORMAT_REMEDY, excelShortenedSentence, looksExcelShortened } from "../../src/lib/contacts/xlsx-limits.ts";
import {
  CONTACT_SAMPLES,
  SAMPLE_MSISDNS,
  SAMPLE_ROW_SENTENCE,
  VCARD_FOLD_OCTETS,
  buildSampleFiles,
  contactSampleCsv,
  contactSampleFile,
  foldVcardLine,
  isSampleMsisdn,
  sampleMsisdnsOf,
  type SampleFiles,
} from "../../src/lib/contacts/sample-sheet.ts";
import { parseTzNumber } from "../../src/lib/tz-msisdn.ts";
// U28b · the REAL readers — the round trips drive the samples through them, never through a parser written here.
import { parseCsv } from "../../src/lib/contacts/import-parse.ts";
import { parseVcardText } from "../../src/lib/contacts/vcard.ts";

/* ⛔ Control characters, the BOM and the backslash are built from their codes: the editing tools decode escape
 * text into raw characters (repo memory), and a raw BOM in a vector would be invisible. */
const TAB = String.fromCharCode(9);
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const CRLF = CR + LF;
const BOM = String.fromCharCode(0xfeff);
const BACKSLASH = String.fromCharCode(92);
const BACKTICK = String.fromCharCode(96);
/* The invisible characters §F10c plants, and the joiner it requires to survive — built from their codes too. */
const RLO = String.fromCharCode(0x202e);
const PDF = String.fromCharCode(0x202c);
const LRI = String.fromCharCode(0x2066);
const PDI = String.fromCharCode(0x2069);
const ZWSP = String.fromCharCode(0x200b);
const ZWJ = String.fromCharCode(0x200d);
const COMBINING_ACUTE = String.fromCharCode(0x0301);

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
/** A source as the guards read it: comments stripped, CRLF normalised (core.autocrlf=true). */
const read = (rel: string): string => decomment(readFileSync(join(ROOT, rel), "utf8")).split(CRLF).join(LF);
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const octets = (s: string): number => new TextEncoder().encode(s).length;
/** A detail line with every control and format character spelled out, so a failure never prints one raw. */
const visible = (s: string | null | undefined): string =>
  Array.from(String(s ?? "null"))
    .map((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      return c < 32 || c === 127 || (c >= 0x2000 && c <= 0x206f) || c === 0xfeff ? `<U+${c.toString(16).toUpperCase()}>` : ch;
    })
    .join("");

/* ══ THE BUNDLE UNDER TEST ══════════════════════════════════════════════════════════════════════ */

type Source = { readonly path: string; readonly text: string };

type Tags = {
  readonly split: (raw: string) => string[];
  readonly key: (tag: string) => string;
  readonly join: (tags: readonly string[]) => string;
  readonly check: (tags: readonly string[]) => string | null;
  readonly one: (raw: string) => OneTagVerdict;
};

type Writer = {
  /** The guard's declared lead set (`CSV_GUARD_LEADS`) — §F15b holds it to the transactions set plus `'`. */
  readonly leads: readonly string[];
  readonly guard: (s: string) => string;
  readonly unguard: (s: string) => string;
  readonly cell: (v: string | number | null | undefined) => string;
  readonly toCsv: typeof toCsv;
};

export type FieldsImpl = {
  readonly fields: readonly ContactFieldSpec[];
  readonly notImported: readonly NotImportedColumn[];
  readonly vocab: ContactVocabulary;
  readonly tags: Tags;
  readonly writer: Writer;
  readonly samples: SampleFiles;
  /** The vCard line folder (`foldVcardLine`) — §F19c drives it directly. */
  readonly fold: (line: string, maxOctets?: number) => string;
  readonly sampleMsisdns: ReadonlySet<string>;
  readonly sources: { readonly fields: string; readonly csvWrite: string; readonly sampleSheet: string; readonly route: string };
  /** Every file `srcFiles()` finds under the contacts trees — §F20 and §F21's population. */
  readonly tree: readonly Source[];
  readonly treeDirs: readonly string[];
  /** U28b · the REAL readers the round trips run (U25's CSV, U26's vCard) — swappable only so a plant can break one. */
  readonly readers: { readonly csv: typeof parseCsv; readonly vcard: typeof parseVcardText };
};

const PATHS = {
  fields: "src/lib/contacts/contact-fields.ts",
  csvWrite: "src/lib/contacts/csv-write.ts",
  sampleSheet: "src/lib/contacts/sample-sheet.ts",
  route: "src/app/api/admin/transactions/export/route.ts",
} as const;

/** The trees a second field list or a file entrance could live in — whichever hold files (the count is printed). */
const CONTACT_TREES = [
  "src/app/admin/contacts",
  "src/app/api/admin/contacts",
  "src/lib/contacts",
  "src/lib/server/contacts",
  "src/components/admin/contacts",
];

/**
 * §F20/§F21's population, taken from `srcFiles()` — the repo's ONE `src` walker (`scripts/lib/tracked-files.mts`:
 * "a second walker is the defect"). It sees every extension JavaScript can run, `.js`/`.mjs`/`.cjs` included, so a
 * second list cannot hide in a file a private `.ts`-only walker would have skipped.
 */
function contactsTree(): { dirs: string[]; files: Source[] } {
  const paths = srcFiles().filter((p) => CONTACT_TREES.some((d) => p.startsWith(`${d}/`))).sort();
  const dirs = CONTACT_TREES.filter((d) => paths.some((p) => p.startsWith(`${d}/`)));
  return { dirs, files: paths.map((p) => ({ path: p, text: read(p) })) };
}

/**
 * The transactions export's formula-guard lead characters, read out of its `cell()` regex — the set C16 says
 * the contacts guard must equal plus the apostrophe. Escapes are decoded by hand (no escape text typed here).
 */
function routeLeads(routeSource: string): string[] {
  const at = routeSource.indexOf("function cell(");
  const open = at < 0 ? -1 : routeSource.indexOf("/^[", at);
  const close = open < 0 ? -1 : routeSource.indexOf("]/", open);
  if (close < 0) return [];
  const body = routeSource.slice(open + 3, close);
  const out: string[] = [];
  for (let i = 0; i < body.length; i++) {
    if (body[i] === BACKSLASH && i + 1 < body.length) {
      i++;
      const e = body[i];
      out.push(e === "t" ? TAB : e === "r" ? CR : e === "n" ? LF : e);
    } else {
      out.push(body[i]);
    }
  }
  return out;
}

let cached: FieldsImpl | null = null;

/** The SHIPPED bundle: the default instances every caller imports, and the real sources. Built once. */
function real(): FieldsImpl {
  if (cached) return cached;
  const tree = contactsTree();
  cached = {
    fields: CONTACT_FIELDS,
    notImported: CONTACT_NOT_IMPORTED,
    vocab: CONTACT_VOCABULARY,
    tags: { split: splitTags, key: tagKey, join: joinTags, check: (t) => checkTags(t), one: parseOneTag },
    writer: { leads: CSV_GUARD_LEADS, guard: guardCell, unguard: unguardCell, cell: csvCell, toCsv },
    samples: CONTACT_SAMPLES,
    fold: foldVcardLine,
    sampleMsisdns: SAMPLE_MSISDNS,
    sources: { fields: read(PATHS.fields), csvWrite: read(PATHS.csvWrite), sampleSheet: read(PATHS.sampleSheet), route: read(PATHS.route) },
    tree: tree.files,
    treeDirs: tree.dirs,
    readers: { csv: parseCsv, vcard: parseVcardText },
  };
  return cached;
}

/** A bundle over DIFFERENT lists: everything derived from them is rebuilt by the shipped factories. */
function withLists(fields: readonly ContactFieldSpec[], notImported: readonly NotImportedColumn[]): FieldsImpl {
  return {
    ...real(),
    fields,
    notImported,
    vocab: buildContactVocabulary(fields, notImported),
    samples: buildSampleFiles(fields),
    sampleMsisdns: sampleMsisdnsOf(fields),
  };
}

const spec = (key: ImportFieldKey): ContactFieldSpec => {
  const f = CONTACT_FIELDS.find((x) => x.key === key);
  if (!f) throw new Error(`no ${key} field`);
  return f;
};
const patchField = (key: ImportFieldKey, patch: Partial<ContactFieldSpec>): ContactFieldSpec[] =>
  CONTACT_FIELDS.map((f) => (f.key === key ? { ...f, ...patch } : f));

/* ══ THE LITERAL EXPECTATIONS ═══════════════════════════════════════════════════════════════════ */

/**
 * ⭐ What the three sample rows must draft to — typed here as LITERALS, never computed by the code under test.
 * U28b reuses them: the CSV, Swahili, `sep=;` and vCard round trips must each produce exactly these.
 */
export const EXPECTED_SAMPLE_DRAFTS: readonly ContactDraft[] = [
  {
    rawPhone: "0745 100 200",
    displayName: "Amina Juma",
    email: "amina.juma@example.com",
    tags: ["vip", "dar es salaam"],
    notes: "Met at the Mlimani City stand, wants match reminders by SMS — weekends only; no calls.",
    problems: [],
  },
  {
    rawPhone: "0678 200 300",
    displayName: "Baraka Mwakyusa",
    email: "baraka.m@example.com",
    tags: ["customer", "arusha"],
    notes: "Prefers messages in Swahili.",
    problems: [],
  },
  { rawPhone: "0622 300 400", displayName: "Neema Kimaro", email: null, tags: ["vip", "dodoma"], notes: null, problems: [] },
];

/** U34's header, as the plan fixes it. */
const EXPORT_HEADER_FULL = ["phone_e164", "name", "email", "tags", "notes", "operator", "consent", "source", "added_at"];
const EXPORT_HEADER_MASKED = ["phone_masked", "name", "email_masked", "tags", "notes", "operator", "consent", "source", "added_at"];

/** Decision C12, as decided. */
const C12_LIMITS = { displayName: 120, email: 254, notes: 1000, tag: 32, tags: 20, listName: 60, phone: 40 };

/* ══ THE SCANNERS (§F1, §F20, §F21) — the same functions run over the real tree and over every plant ═══ */

const IMPORT_FORMS = [
  /^\s*(?:import|export)\b[^;=]*?\bfrom\s*["']([^"']+)["']/gm,
  /^\s*import\s*["']([^"']+)["']/gm,
  /\bimport\s*\(\s*["']([^"']+)["']/g,
  /\brequire\s*\(\s*["']([^"']+)["']/g,
];
function specifiers(src: string): string[] {
  const out: string[] = [];
  for (const form of IMPORT_FORMS) for (const m of src.matchAll(form)) out.push(m[1]);
  return out;
}
const DIRECTIVE = /^\s*["']use (?:client|server)["']/;
const SERVER_ONLY = /["']server-only["']/;

/**
 * §F20's population is hand-chosen DISTINCTIVE tokens: the underscore keys and the Swahili aliases. ⚠️ A second
 * list built only from common words (name, email, notes) would pass, because those words appear legitimately in
 * UI code — stated, not hidden; U34's own guard must assert it imports `contactExportHeader`.
 */
const DISTINCTIVE = [
  "phone_e164", "phone_masked", "email_masked", "added_at", "first_name", "last_name",
  "simu", "namba", "nambari", "jina", "makundi", "maelezo", "barua pepe", "ridhaa",
];
const QUOTE_CLASS = `["'${BACKTICK}]`;
const LITERAL_FORMS = DISTINCTIVE.map((t) => ({ t, form: new RegExp(`${QUOTE_CLASS} *${t} *${QUOTE_CLASS}`, "i") }));
function oneListOffenders(files: readonly Source[]): string[] {
  const out: string[] = [];
  for (const f of files) {
    // ⛔ Exempt by EXACT path: a basename test would also exempt a `contact-fields.ts` in any other contacts tree.
    if (f.path === PATHS.fields) continue;
    for (const { t, form } of LITERAL_FORMS) if (form.test(f.text)) out.push(`${f.path}: "${t}"`);
  }
  return out;
}

const ENTRANCES = [
  /type\s*=\s*\{?\s*["']file["']/,
  /accept\s*=\s*\{?\s*["'][^"']*\.(?:csv|vcf|xlsx|txt)\b/i,
  /<(?:FileDrop|Dropzone)\b/,
];
const SAMPLE_BUTTON = /<SampleSheetButton\b/;
function entrancesWithoutButton(files: readonly Source[]): { entrances: number; missing: string[] } {
  const withEntrance = files.filter((f) => ENTRANCES.some((form) => form.test(f.text)));
  return { entrances: withEntrance.length, missing: withEntrance.filter((f) => !SAMPLE_BUTTON.test(f.text)).map((f) => f.path) };
}

/** Excel's General format, simulated: a purely numeric cell becomes a Number — leading zeros lost — and more
 *  than 11 integer digits are shown, and saved to CSV, as `2.55745E+11`. Text stays text. */
function excelGeneral(cell: string): string {
  const t = cell.trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(t)) return cell;
  const n = Number(t);
  return String(Math.trunc(Math.abs(n))).length > 11 ? n.toExponential(5).toUpperCase() : String(n);
}

/** One CSV cell's quotes taken off — a single cell, not a parser. */
const unquote = (s: string): string =>
  s.length >= 2 && s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1).split('""').join('"') : s;

/* ══ THE ASSERTION LABELS — one place, so a plant names exactly the line it must turn red ═══════════ */

export const L = {
  F0: "F0 · the module's named exports ARE the default vocabulary and the default samples",
  F1: "F1 · ⛔ PURITY — contact-fields imports only tz-msisdn, csv-write, xlsx-limits and parsed-file, csv-write nothing, sample-sheet only contact-fields, csv-write and tz-msisdn; no lib/server, node:, react, next or exceljs, and no directive",
  F2: "F2 · ⭐ COMPLETENESS — every field has a unique key, a label, a strong alias, a limit, a vCard source and a sample in every row; phone alone is required",
  F2b: "F2b · the Name samples are the First/Last name samples composed — one person per row, whichever columns a file uses",
  F2c: "F2c · the samples are chosen: spaced phones, @example.com emails (one mixed case), , ; | once each with an embedded comma, a long UTF-8 note, GSM-7 names",
  F3: "F3 · ⛔ NO AMBIGUITY — every alias is written normalised and claimed exactly once across the fields and the not-imported columns",
  F4a: "F4a · contactExportHeader(true) is U34's literal header",
  F4b: "F4b · ⭐ every export header resolves through matchHeader to its own owner — a field, an export-only column, or a refused one",
  F4c: "F4c · every label, key and Swahili header resolves to its own field, strongly",
  F5: "F5 · ⭐ the Swahili and tolerance vectors resolve as written, and a near miss does not (EXECUTED)",
  F6a: "F6a · ⛔ OD10 — every consent word resolves to not-imported with the consent sentence, and no field owns one",
  F6b: "F6b · ⛔ OD10 — validateMapping refuses a Consent column for EVERY field, and a forged consent key",
  F7a: "F7a · ⛔ a masked export is refused by autoMapHeaders, and Phone is never mapped to the masked column",
  F7b: "F7b · ⛔ a masked export is refused by validateMapping, whatever column Phone is pointed at",
  F8a: "F8a · no Phone column → a refusal naming Phone and Simu that lists the headers only when they are column names — none reads as a number or holds an @, and one is known",
  F8b: "F8b · ⛔ a first row that is a contact → headerless, never echoed — and a header that merely holds digits is not a contact",
  F9: "F9 · ⭐ strength first, then position — 'Namba | Jina | Simu' reads Simu, not the serials",
  F10: "F10 · ⛔ a name is never split, and the parts are composed only when no Name column exists",
  F10b: "F10b · a draft has exactly rawPhone, displayName, email, tags, notes, problems — no first/last keys",
  F10c: "F10c · ⛔ direction overrides and zero-width spaces are dropped from a stored name, a note and an echoed header; the joiner is kept",
  F11a: "F11a · ⭐ C11 — splitTags splits on , ; |, collapses, lower-cases and de-duplicates (literal expectations, EXECUTED)",
  F11b: "F11b · ⛔ C11 — checkTags and parseOneTag hold the character rule, at least one letter or digit, 1–32 characters and 20 per contact",
  F12a: "F12a · ⛔ C12 — CONTACT_LIMITS is the decided table and every field's limit is read from it",
  F12b: "F12b · each limit breach is exactly ONE problem naming the field and its limit, and the limit itself is allowed",
  F12c: "F12c · ⛔ no problem sentence echoes the cell",
  F13: "F13 · ⭐ the phone samples survive Excel's General coercion (EXECUTED, with a control that does not)",
  F14: "F14 · ⛔ SAMPLE_MSISDNS is exactly the parsed phone samples — all ok, all distinct",
  F14b: "F14b · isSampleMsisdn takes any spelling of a sample number and refuses others; U30's sentence carries no digits",
  F15a: "F15a · ⭐ C16 — unguardCell(guardCell(s)) === s for every s, through csvCell too (EXECUTED over a corpus)",
  F15b: "F15b · CSV_GUARD_LEADS is EXACTLY the transactions export's set plus the apostrophe, every lead is guarded, and csvCell quotes per RFC 4180",
  F15c: "F15c · toCsv writes CRLF after every line, the BOM when asked, and sep=; after the BOM for ';'",
  F16a: "F16a · the sample rows draft to their literal expectations (cells handed directly — the parser round trip is U28b)",
  F16: "F16 · ⭐ U28b — the CSV sample re-reads through U25's REAL reader: the BOM is stripped (its first header resolves to Phone) and the drafts are the literal expectations, every number a sample number",
  F17: "F17 · U28b — the Swahili-header sample re-reads through the same reader to the same drafts",
  F18: "F18 · U28b — the sep=; sample re-reads to the same drafts: the field list survives the directive and the vote",
  F19a: "F19a · ⭐ the sample vCard — every line ≤ 75 octets, at least one fold, escaped, N:;;;; on every card, CRLF only",
  F19b: "F19b · ⭐ U28b — the sample vCard re-reads through U26's REAL reader: three rows on lines 1, 2, 3 and no header row, mapped with headerRows 0 so card 1 survives (A1.2), to the literal expectations",
  F19c: "F19c · folding never splits a character or an escape pair",
  F20a: "F20a · ⛔ ONE LIST — no contacts-tree file but src/lib/contacts/contact-fields.ts (by exact path) holds a distinctive key or Swahili alias as a literal",
  F20b: "F20b · CONTROL — the one-list scanner reports a planted list",
  F21a: "F21a · every contacts-tree file with a file entrance also holds <SampleSheetButton",
  F21b: "F21b · CONTROL — the entrance scanner reports a planted entrance with no button",
  F23: "F23 · ⛔ M6 — Excel's scientific form in a Phone cell is ONE problem with its own sentence, never echoed",
  F24: "F24 · ⭐ C20 — the vCard mapping lives in the list: Name = FN, else N (given + family), else ORG",
  F25: "F25 · ⛔ M5 — the masked export header names BOTH identity columns masked, and both refuse",
  F26: "F26 · the sample files' envelope — names, MIME types, a BOM on the CSVs only, literal header lines",
  F27: "F27 · ⛔ A1.2 — a vCard is mapped by the fixed fileColumns() order with no header row, never header-matched, so card 1 survives",
  F28: "F28 · ⛔ A1.5 — Google's label columns (Labels, Group Membership) are recognised and not read, with their own sentence; no field owns them",
  F29: "F29 · ⛔ A1.6 — the Phone hint carries the ONE remedy clause from xlsx-limits, the M6 sentence carries the same clause, and contact-fields words no remedy of its own",
} as const;

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════ */

function run(ctx: SectionContext<FieldsImpl>): void {
  const { impl, ok, log } = ctx;
  const v = impl.vocab;
  const field = (k: ImportFieldKey): ContactFieldSpec | undefined => impl.fields.find((f) => f.key === k);
  const phoneSpec = field("phone");
  const nameSpec = field("name");

  // ── F0 · the named exports are the default instance ──────────────────────────────────────────
  ok(L.F0,
    same(matchHeader("Simu"), CONTACT_VOCABULARY.matchHeader("Simu"))
      && same(autoMapHeaders(["Namba", "Jina", "Simu"]), CONTACT_VOCABULARY.autoMapHeaders(["Namba", "Jina", "Simu"]))
      && same(autoMapFile("vcard", ["0745 100 200"]), CONTACT_VOCABULARY.autoMapFile("vcard", ["0745 100 200"]))
      && same(autoMapFile("csv", ["Simu", "Jina"]), CONTACT_VOCABULARY.autoMapFile("csv", ["Simu", "Jina"]))
      && same(validateMapping(["Simu"], { phone: 0 }), CONTACT_VOCABULARY.validateMapping(["Simu"], { phone: 0 }))
      && same(draftContactRow(["0745 100 200", "Amina"], { phone: 0, name: 1 }), CONTACT_VOCABULARY.draftContactRow(["0745 100 200", "Amina"], { phone: 0, name: 1 }))
      && same(contactExportHeader(false), CONTACT_VOCABULARY.exportHeader(false))
      && contactSampleCsv({ headers: "label", delimiter: "," }) === CONTACT_SAMPLES.csv({ headers: "label", delimiter: "," })
      && contactSampleFile("csv").content === CONTACT_SAMPLES.csv({ headers: "label", delimiter: "," }));

  // ── F1 · PURITY ──────────────────────────────────────────────────────────────────────────────
  const allowed: Array<readonly [string, string, ReadonlySet<string>]> = [
    ["contact-fields.ts", impl.sources.fields, new Set(["../tz-msisdn", "./csv-write", "./xlsx-limits", "./parsed-file"])],
    ["csv-write.ts", impl.sources.csvWrite, new Set<string>()],
    ["sample-sheet.ts", impl.sources.sampleSheet, new Set(["./contact-fields", "./csv-write", "../tz-msisdn"])],
  ];
  const impure: string[] = [];
  const seen: string[] = [];
  for (const [file, src, permitted] of allowed) {
    const specs = specifiers(src);
    seen.push(`${file} → ${specs.length ? specs.join(", ") : "nothing"}`);
    for (const s of specs) if (!permitted.has(s)) impure.push(`${file} imports ${s}`);
    if (DIRECTIVE.test(src)) impure.push(`${file} carries a "use client"/"use server" directive`);
    if (SERVER_ONLY.test(src)) impure.push(`${file} imports server-only`);
  }
  ok(L.F1, impure.length === 0, impure.length ? impure.join(" | ") : seen.join(" · "));

  // ── F2 · COMPLETENESS ────────────────────────────────────────────────────────────────────────
  const keys = impl.fields.map((f) => f.key);
  const foldedIntoName = (f: ContactFieldSpec): boolean =>
    (f.key === "first_name" || f.key === "last_name") && f.vcard.length === 0 && (nameSpec?.vcard.includes("N") ?? false);
  const incomplete = impl.fields
    .filter((f) => !(
      f.label.trim() !== "" && f.aliases.length > 0 && f.maxLength > 0
      && (f.vcard.length > 0 || foldedIntoName(f))
      && f.samples.length === CONTACT_SAMPLE_ROW_COUNT && f.samples.some((s) => s.trim() !== "")
    ))
    .map((f) => f.key);
  const required = impl.fields.filter((f) => f.required).map((f) => f.key);
  const phoneEveryRow = phoneSpec !== undefined && phoneSpec.samples.length === CONTACT_SAMPLE_ROW_COUNT
    && phoneSpec.samples.every((s) => s.trim() !== "");
  ok(L.F2, new Set(keys).size === keys.length && incomplete.length === 0 && required.join(",") === "phone" && phoneEveryRow,
    `incomplete: ${incomplete.join(", ") || "none"} · required: ${required.join(", ") || "none"}`);

  // ── F2b · the parts compose to the name, row by row ───────────────────────────────────────────
  const first = field("first_name");
  const last = field("last_name");
  ok(L.F2b, nameSpec !== undefined && first !== undefined && last !== undefined
    && nameSpec.samples.every((s, i) => composeName(first.samples[i] ?? "", last.samples[i] ?? "") === s));

  // ── F2c · the samples are chosen ──────────────────────────────────────────────────────────────
  const emails = field("email")?.samples ?? [];
  const tagCells = field("tags")?.samples ?? [];
  const noteCells = field("notes")?.samples ?? [];
  const occurrences = (cells: readonly string[], ch: string): number => cells.join("").split(ch).length - 1;
  const hygiene: Record<string, boolean> = {
    spacedPhones: (phoneSpec?.samples ?? []).every((s) => /^0\d{3} \d{3} \d{3}$/.test(s)),
    exampleEmails: emails.filter((e) => e !== "").every((e) => /@example\.com$/i.test(e)),
    mixedCaseEmail: emails.some((e) => e !== "" && e !== e.toLowerCase()),
    eachSeparatorOnce: occurrences(tagCells, ",") === 1 && occurrences(tagCells, ";") === 1 && occurrences(tagCells, "|") === 1,
    embeddedComma: tagCells.some((c) => c.includes(",")),
    longUtf8Note: noteCells.some((n) => octets(n) > VCARD_FOLD_OCTETS && Array.from(n).some((ch) => (ch.codePointAt(0) ?? 0) > 127)),
    gsmNames: (nameSpec?.samples ?? []).every((n) => /^[A-Za-z][A-Za-z .'-]*$/.test(n)),
  };
  const unhygienic = Object.entries(hygiene).filter(([, good]) => !good).map(([k]) => k);
  ok(L.F2c, unhygienic.length === 0, unhygienic.join(", "));

  // ── F3 · NO AMBIGUITY ────────────────────────────────────────────────────────────────────────
  const claims: string[] = [];
  for (const f of impl.fields) claims.push(...f.aliases, ...f.weakAliases);
  for (const e of impl.notImported) claims.push(...e.aliases);
  const normal = claims.map(normaliseHeader);
  const twice = [...new Set(normal.filter((n, i) => normal.indexOf(n) !== i))];
  const unnormalised = claims.filter((a) => normaliseHeader(a) !== a);
  ok(L.F3, twice.length === 0 && unnormalised.length === 0 && v.collisions.length === 0,
    `${claims.length} spellings · twice: ${twice.join(", ") || "none"} · not normalised: ${unnormalised.join(", ") || "none"}`);

  // ── F4 · HEADERS RESOLVE TO THEIR OWN OWNER ───────────────────────────────────────────────────
  ok(L.F4a, same(v.exportHeader(true), EXPORT_HEADER_FULL), v.exportHeader(true).join(","));
  const ownerOf = (h: string): HeaderMatch | null => {
    const f = impl.fields.find((x) => x.exportHeader === h);
    if (f) return { kind: "field", field: f.key, strength: "strong" };
    const e = impl.notImported.find((x) => x.header === h);
    if (e) return { kind: "notImported", refused: e.kind === "refused", reason: e.reason };
    return null;
  };
  const headerMisses = [...v.exportHeader(true), ...v.exportHeader(false)].filter((h) => {
    const want = ownerOf(h);
    return want === null || !same(v.matchHeader(h), want);
  });
  ok(L.F4b, headerMisses.length === 0, headerMisses.join(", "));
  const labelMisses = impl.fields.flatMap((f) =>
    [f.label, f.key, ...(f.swAlias ? [f.swAlias] : [])]
      .filter((h) => {
        const m = v.matchHeader(h);
        return !(m.kind === "field" && m.field === f.key && m.strength === "strong");
      })
      .map((h) => `${f.key} ← ${h}`));
  ok(L.F4c, labelMisses.length === 0, labelMisses.join(", "));

  // ── F5 · SWAHILI AND TOLERANCE, EXECUTED ──────────────────────────────────────────────────────
  const VECTORS: ReadonlyArray<readonly [string, ImportFieldKey, "strong" | "weak"]> = [
    ["simu", "phone", "strong"], ["namba ya simu", "phone", "strong"], ["nambari ya simu", "phone", "strong"],
    ["simu ya mkononi", "phone", "strong"],
    ["namba", "phone", "weak"], ["nambari", "phone", "weak"], ["number", "phone", "weak"], ["contact", "phone", "weak"],
    ["jina", "name", "strong"], ["jina kamili", "name", "strong"],
    ["jina la kwanza", "first_name", "strong"], ["jina la mwisho", "last_name", "strong"],
    ["barua pepe", "email", "strong"], ["anwani ya barua pepe", "email", "strong"],
    ["makundi", "tags", "strong"], ["kikundi", "tags", "strong"], ["maelezo", "notes", "strong"],
    ["SIMU", "phone", "strong"], [" Simu: ", "phone", "strong"], ["Namba_ya_Simu", "phone", "strong"],
    ["Phone 1 - Value", "phone", "strong"], ["E-mail", "email", "strong"], ["E-mail 1 - Value", "email", "strong"],
    ["Mobile No.", "phone", "strong"], [BOM + "Phone", "phone", "strong"],
    ["Given Name", "first_name", "strong"], ["Family Name", "last_name", "strong"], ["Categories", "tags", "strong"],
    ["Label", "tags", "strong"],
    // ⛔ A1.5: Google's "Labels" and "Group Membership" are NOT here — they are recognised and not read (§F28).
  ];
  const vectorMisses = VECTORS.filter(([h, f, s]) => {
    const m = v.matchHeader(h);
    return !(m.kind === "field" && m.field === f && m.strength === s);
  }).map(([h]) => JSON.stringify(h.split(BOM).join("<BOM>")));
  const nearMiss = v.matchHeader("Phone 1 - Type").kind === "unknown";
  ok(L.F5, vectorMisses.length === 0 && nearMiss,
    `${VECTORS.length - vectorMisses.length}/${VECTORS.length}${vectorMisses.length ? ` — missed ${vectorMisses.join(", ")}` : ""}${nearMiss ? "" : " — 'Phone 1 - Type' matched a field (a substring test?)"}`);

  // ── F6 · OD10, CONSENT IS NEVER A FIELD ───────────────────────────────────────────────────────
  const consentEntry = impl.notImported.find((e) => e.header === "consent");
  const CONSENT_WORDS = ["consent", "Opt-in", "subscribed", "marketing consent", "ridhaa", "kibali", "Consent State", "opted out"];
  const consentMisses = CONSENT_WORDS.filter((w) => {
    const m = v.matchHeader(w);
    return !(m.kind === "notImported" && !m.refused && m.reason === CONTACT_CONSENT_NOT_READ);
  });
  const consentForms = new Set((consentEntry?.aliases ?? []).map(normaliseHeader));
  const fieldOwnsConsent = impl.fields.flatMap((f) =>
    [...f.aliases, ...f.weakAliases].filter((a) => consentForms.has(normaliseHeader(a))).map((a) => `${f.key}: ${a}`));
  const noConsentKey = impl.fields.every((f) => !/consent|ridhaa|kibali|opt/i.test(f.key));
  ok(L.F6a, consentEntry !== undefined && consentMisses.length === 0 && fieldOwnsConsent.length === 0 && noConsentKey,
    `missed: ${consentMisses.join(", ") || "none"} · owned by a field: ${fieldOwnsConsent.join(", ") || "none"}`);
  const leaks = impl.fields.map((f) => f.key).filter((k) => k !== "phone").filter((k) => {
    const r = v.validateMapping(["Simu", "Consent"], { phone: 0, [k]: 1 });
    return r.ok || r.sentence !== CONTACT_CONSENT_NOT_READ;
  });
  const forged = v.validateMapping(["Simu", "Consent"], { phone: 0, consent: 1 } as unknown as ColumnMapping);
  const unmappedConsent = v.validateMapping(["Simu", "Consent"], { phone: 0 });
  ok(L.F6b, leaks.length === 0 && !forged.ok && forged.sentence === CONTACT_CONSENT_NOT_READ && unmappedConsent.ok,
    `fields that accepted the Consent column: ${leaks.join(", ") || "none"} · forged key ${forged.ok ? "ACCEPTED" : "refused"}`);

  // ── F7 · A MASKED EXPORT IS REFUSED ───────────────────────────────────────────────────────────
  const masked = v.autoMapHeaders(["phone_masked", "name"]);
  const maskedTxn = v.autoMapHeaders(["msisdn_masked", "Jina"]);
  ok(L.F7a, masked.refusal === CONTACT_MASKED_FILE && masked.mapping.phone === undefined && maskedTxn.refusal === CONTACT_MASKED_FILE,
    `refusal: ${masked.refusal ?? "none"} · phone → ${masked.mapping.phone ?? "unmapped"}`);
  const manualMasked = v.validateMapping(["phone_masked", "name"], { phone: 0 });
  const elsewhere = v.validateMapping(["phone_masked", "name", "Simu"], { phone: 2, name: 1 });
  const clean = v.validateMapping(["Simu", "name"], { phone: 0, name: 1 });
  ok(L.F7b, !manualMasked.ok && manualMasked.sentence === CONTACT_MASKED_FILE && !elsewhere.ok && clean.ok,
    `phone→masked ${manualMasked.ok ? "ACCEPTED" : "refused"} · phone→another column of a masked file ${elsewhere.ok ? "ACCEPTED" : "refused"}`);

  // ── F8 · MISSING PHONE AND HEADERLESS ─────────────────────────────────────────────────────────
  const noPhone = v.autoMapHeaders(["Jina", "Barua pepe"]).refusal ?? "";
  const numericHeader = v.autoMapHeaders(["Jina", "Ref 1234567"]).refusal ?? "";
  // A headerless list with no phone column: its "headers" are the first contact, and must not be echoed (§5.14).
  const nameAndEmail = v.autoMapHeaders(["Amina Juma", "amina@example.com"]).refusal ?? "";
  const bareNames = v.autoMapHeaders(["Amina Juma", "Arusha"]).refusal ?? "";
  ok(L.F8a, /Phone/.test(noPhone) && /Simu/.test(noPhone) && noPhone.includes("Jina") && noPhone.includes("Barua pepe")
    && numericHeader !== "" && !numericHeader.includes("Ref") && !/\d{7}/.test(numericHeader)
    && nameAndEmail !== "" && !nameAndEmail.includes("Amina") && !nameAndEmail.includes("@example")
    && bareNames !== "" && !bareNames.includes("Amina") && !bareNames.includes("Arusha"),
    `${noPhone} · name+email row → ${nameAndEmail.includes("Amina") ? "ECHOED" : "not echoed"} · bare names → ${bareNames.includes("Amina") ? "ECHOED" : "not echoed"}`);
  const digitCount = (s: string): number => (s.match(/\d/g) ?? []).length;
  const hl = v.autoMapHeaders(["0712 345 678", "Amina"]);
  const hl2 = v.autoMapHeaders(["+255 712 345 678", "Amina", "amina@example.com"]);
  // 🔴 A real header that merely CONTAINS a number is column names, not a contact (parseTzNumber drops non-digits).
  const parenHeader = v.autoMapHeaders(["Phone (0712 345 678)", "Jina"]);
  const simuHeader = v.autoMapHeaders(["Simu 0754123456", "Jina"]);
  ok(L.F8b, hl.headerless && hl.refusal !== null && digitCount(hl.refusal) < 9 && !hl.refusal.includes("Amina")
    && hl2.headerless && hl2.refusal !== null && digitCount(hl2.refusal) < 9 && !hl2.refusal.includes("amina")
    && !parenHeader.headerless && parenHeader.refusal !== null && !/\d{6}/.test(parenHeader.refusal)
    && !simuHeader.headerless && simuHeader.refusal !== null && !/\d{6}/.test(simuHeader.refusal),
    `${hl.refusal ?? "no refusal"} · 'Phone (0712 345 678)' headerless ${parenHeader.headerless} · 'Simu 0754123456' headerless ${simuHeader.headerless}`);

  // ── F9 · STRENGTH, THEN POSITION ──────────────────────────────────────────────────────────────
  const s1 = v.autoMapHeaders(["Namba", "Jina", "Simu"]);
  const s2 = v.autoMapHeaders(["Name", "Contact"]);
  const s3 = v.autoMapHeaders(["Mobile", "Phone"]);
  const s4 = v.autoMapHeaders(["Number", "Mobile"]);
  ok(L.F9, s1.mapping.phone === 2 && s1.mapping.name === 1 && s1.columns[0]?.status === "unused" && (s1.columns[0]?.note ?? "") !== ""
    && s2.mapping.phone === 1 && s2.mapping.name === 0
    && s3.mapping.phone === 0 && s3.columns[1]?.status === "unused"
    && s4.mapping.phone === 1,
    `Namba|Jina|Simu → phone ${s1.mapping.phone} · Name|Contact → phone ${s2.mapping.phone} · Mobile|Phone → phone ${s3.mapping.phone} · Number|Mobile → phone ${s4.mapping.phone}`);

  // ── F10 · NEVER SPLIT, COMPOSE ONLY WHEN NEEDED ───────────────────────────────────────────────
  const parts = v.autoMapHeaders(["First name", "Last name", "Simu"]);
  const partsDraft = v.draftContactRow(["Amina", "Juma", "0712 345 678"], parts.mapping);
  const both = v.autoMapHeaders(["Name", "First name", "Simu"]);
  const bothDraft = v.draftContactRow(["Amina Juma", "Bibi", "0712 345 678"], { name: 0, first_name: 1, phone: 2 });
  const spaced = v.draftContactRow(["Amina   Juma ", "0712 345 678"], { name: 0, phone: 1 });
  ok(L.F10, partsDraft.displayName === "Amina Juma" && parts.mapping.first_name === 0 && parts.mapping.last_name === 1
    && both.mapping.name === 0 && both.mapping.first_name === undefined && both.columns[1]?.status === "unused"
    && bothDraft.displayName === "Amina Juma" && spaced.displayName === "Amina Juma",
    `parts → ${partsDraft.displayName} · Name over parts → ${bothDraft.displayName}`);
  const draftKeys = Object.keys(v.draftContactRow(["0712 345 678"], { phone: 0 })).join(",");
  ok(L.F10b, draftKeys === "rawPhone,displayName,email,tags,notes,problems", draftKeys);

  // ── F10c · INVISIBLE FORMAT CHARACTERS NEVER REACH WHAT A PERSON SEES ─────────────────────────
  const sneaky = v.draftContactRow([`${RLO}Amina${ZWSP} Juma${PDF}`, "0712 345 678", `${LRI}call after 6${PDI}`], { name: 0, phone: 1, notes: 2 });
  const joined = v.draftContactRow([`Amina${ZWJ}Juma`, "0712 345 678"], { name: 0, phone: 1 });
  const listed = v.autoMapHeaders(["Jina", `${RLO}Kanda`]);
  const listedSentence = listed.refusal ?? "";
  const INVISIBLE = [RLO, PDF, LRI, PDI, ZWSP];
  ok(L.F10c, sneaky.displayName === "Amina Juma" && sneaky.notes === "call after 6" && joined.displayName === `Amina${ZWJ}Juma`
    && listedSentence.includes("Kanda") && !INVISIBLE.some((c) => listedSentence.includes(c)) && listed.columns[1]?.header === "Kanda",
    `name ${visible(sneaky.displayName)} · notes ${visible(sneaky.notes)} · joiner ${visible(joined.displayName)} · header ${visible(listed.columns[1]?.header)}`);

  // ── F11 · THE ONE TAG RULE (C11), EXECUTED ────────────────────────────────────────────────────
  const TAG_VECTORS: ReadonlyArray<readonly [string, readonly string[]]> = [
    ["VIP, Dar es Salaam", ["vip", "dar es salaam"]],
    ["a;b|c", ["a", "b", "c"]],
    [" a ,, a ;A ", ["a"]],
    ["Dar  es   Salaam", ["dar es salaam"]],
    ["x | X | x", ["x"]],
    ["customer; Arusha", ["customer", "arusha"]],
    ["", []],
  ];
  const tagMisses = TAG_VECTORS.filter(([raw, want]) =>
    !same(impl.tags.split(raw), want) || !same(impl.tags.split(impl.tags.join(impl.tags.split(raw))), want))
    .map(([raw]) => `${JSON.stringify(raw)} → ${JSON.stringify(impl.tags.split(raw))}`);
  ok(L.F11a, tagMisses.length === 0 && impl.tags.key("  VIP  Club ") === "vip club", tagMisses.join(" · "));
  const twentyOne = Array.from({ length: 21 }, (_, i) => `t${i}`);
  const check = impl.tags.check;
  const rule: Record<string, boolean> = {
    count: check(twentyOne) === "A contact can have at most 20 tags.",
    length: check(["a".repeat(33)]) === "Each tag can be at most 32 characters.",
    characters: check(["dar!"]) === TAG_CHARACTERS_SENTENCE && check(["vip:gold"]) === TAG_CHARACTERS_SENTENCE,
    allowed: check(["vip", "dar es salaam", "a-b_c", "a".repeat(32), "mteja 2026"]) === null && check(twentyOne.slice(0, 20)) === null,
    // ⚠️ Decision C11 as decided: Google's ' ::: ' labels, typed or mapped by hand, are refused by the character
    // rule, never mangled. (A1.5 keeps Google's label COLUMNS from auto-mapping at all — §F28.)
    googleLabels: check(impl.tags.split("* myContacts ::: Friends")) === TAG_CHARACTERS_SENTENCE,
    // A tag that renders as nothing, or as bare punctuation, is not a tag.
    needsLetter: check([COMBINING_ACUTE]) === TAG_NEEDS_LETTER_SENTENCE && check(["-"]) === TAG_NEEDS_LETTER_SENTENCE
      && check(["_ -"]) === TAG_NEEDS_LETTER_SENTENCE && check([`e${COMBINING_ACUTE}`]) === null && check(["a-"]) === null,
    oneTag: same(impl.tags.one(" VIP "), { ok: true, tag: "vip" }),
    oneRefusesSeparators: !impl.tags.one("a,b").ok && !impl.tags.one("a|b").ok && !impl.tags.one("a;b").ok,
    oneRefusesEmpty: !impl.tags.one("  ").ok,
    oneRefusesLong: !impl.tags.one("a".repeat(33)).ok,
  };
  const broken = Object.entries(rule).filter(([, good]) => !good).map(([k]) => k);
  ok(L.F11b, broken.length === 0, broken.join(", "));

  // ── F12 · LIMITS (C12) AND NO ECHO ────────────────────────────────────────────────────────────
  const limitMisses: string[] = [];
  if (!same(CONTACT_LIMITS, C12_LIMITS)) limitMisses.push(`CONTACT_LIMITS ${JSON.stringify(CONTACT_LIMITS)}`);
  if (MAX_TAGS !== C12_LIMITS.tags || MAX_TAG_LENGTH !== C12_LIMITS.tag) limitMisses.push("MAX_TAGS / MAX_TAG_LENGTH");
  const fieldLimit: Partial<Record<ImportFieldKey, number>> = {
    phone: CONTACT_LIMITS.phone, name: CONTACT_LIMITS.displayName, first_name: CONTACT_LIMITS.displayName,
    last_name: CONTACT_LIMITS.displayName, email: CONTACT_LIMITS.email, tags: CONTACT_LIMITS.tag, notes: CONTACT_LIMITS.notes,
  };
  for (const f of impl.fields) {
    const want = fieldLimit[f.key];
    if (want !== undefined && f.maxLength !== want) limitMisses.push(`${f.key}.maxLength ${f.maxLength}, the table says ${want}`);
  }
  ok(L.F12a, limitMisses.length === 0, limitMisses.join(" · "));

  const M: ColumnMapping = { phone: 0, name: 1, email: 2, tags: 3, notes: 4 };
  type Cells = { phone?: string; name?: string; email?: string; tags?: string; notes?: string };
  const row = (patch: Cells): string[] => {
    const c = { phone: "0745 100 200", name: "Amina", email: "", tags: "", notes: "", ...patch };
    return [c.phone, c.name, c.email, c.tags, c.notes];
  };
  type Breach = { readonly what: string; readonly cells: string[]; readonly field: ImportFieldKey; readonly limit: number | null; readonly offending: string };
  const breach = (what: string, k: keyof Cells & ImportFieldKey, value: string, limit: number | null): Breach =>
    ({ what, cells: row({ [k]: value }), field: k, limit, offending: value });
  const BREACHES: Breach[] = [
    breach("a 121-character name", "name", "N".repeat(121), 120),
    breach("21 tags", "tags", twentyOne.join(","), 20),
    breach("a 33-character tag", "tags", "a".repeat(33), 32),
    breach("a 255-character email", "email", `${"a".repeat(243)}@example.com`, 254),
    breach("a malformed email", "email", "amina at example", null),
    breach("1001 characters of notes", "notes", "n".repeat(1001), 1000),
    breach("a 41-character phone cell", "phone", "7".repeat(41), 40),
  ];
  const STEM: Record<ImportFieldKey, RegExp> = {
    phone: /phone/i, name: /name/i, first_name: /first name/i, last_name: /last name/i, email: /email/i, tags: /tag/i, notes: /note/i,
  };
  const breachMisses = BREACHES.filter((b) => {
    const p = v.draftContactRow(b.cells, M).problems;
    return !(p.length === 1 && p[0].field === b.field && STEM[b.field].test(p[0].sentence)
      && (b.limit === null || p[0].sentence.includes(String(b.limit))));
  }).map((b) => b.what);
  const AT_LIMIT = [
    row({}), row({ name: "N".repeat(120) }), row({ tags: twentyOne.slice(0, 20).join(",") }), row({ tags: "a".repeat(32) }),
    row({ email: `${"a".repeat(242)}@example.com` }), row({ notes: "n".repeat(1000) }),
  ];
  const atLimitFlagged = AT_LIMIT.filter((cells) => v.draftContactRow(cells, M).problems.length !== 0).length;
  ok(L.F12b, breachMisses.length === 0 && atLimitFlagged === 0,
    `missed: ${breachMisses.join(", ") || "none"} · at-the-limit rows flagged: ${atLimitFlagged}`);

  const echoCell = `Asha 0712345678 ${"x".repeat(110)}`;
  const echo = v.draftContactRow(row({ name: echoCell }), M).problems;
  const echoes = BREACHES.flatMap((b) =>
    v.draftContactRow(b.cells, M).problems.filter((p) => p.sentence.includes(b.offending.slice(0, 10))).map(() => b.what));
  ok(L.F12c, echo.length === 1 && !echo[0].sentence.includes("0712345678") && !echo[0].sentence.includes("Asha") && echoes.length === 0,
    echoes.length ? `echoed: ${echoes.join(", ")}` : `${echo.length} problem(s) for the long name`);

  // ── F13 · EXCEL-SAFE SAMPLES ──────────────────────────────────────────────────────────────────
  const phoneSamples = phoneSpec?.samples ?? [];
  const survived = phoneSamples.filter((s) => {
    const before = parseTzNumber(s);
    const after = parseTzNumber(excelGeneral(s));
    return before.verdict === "ok" && after.verdict === "ok" && after.msisdn === before.msisdn;
  }).length;
  const control = excelGeneral("255745100200") === "2.55745E+11" && parseTzNumber(excelGeneral("255745100200")).verdict !== "ok";
  ok(L.F13, phoneSamples.length > 0 && survived === phoneSamples.length && control,
    `${survived}/${phoneSamples.length} survive · control ${control ? "corrupted, as Excel does" : "NOT corrupted — the simulation proves nothing"}`);

  // ── F14 · THE SAMPLE NUMBERS ARE KNOWN ────────────────────────────────────────────────────────
  const parsed = phoneSamples.map((s) => parseTzNumber(s));
  const derived = new Set(parsed.filter((p) => p.verdict === "ok" && p.msisdn !== null).map((p) => String(p.msisdn)));
  const setsEqual = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => a.size === b.size && [...a].every((x) => b.has(x));
  ok(L.F14, parsed.length > 0 && parsed.every((p) => p.verdict === "ok") && derived.size === CONTACT_SAMPLE_ROW_COUNT
    && setsEqual(impl.sampleMsisdns, derived), `${impl.sampleMsisdns.size} known · ${derived.size} derived`);
  const shippedPhones = CONTACT_FIELDS.find((f) => f.key === "phone")?.samples ?? [];
  const anySpelling = shippedPhones.length > 0 && shippedPhones.every((s) => {
    const p = parseTzNumber(s);
    return p.msisdn !== null && isSampleMsisdn(p.msisdn) && isSampleMsisdn(`+${p.msisdn}`) && isSampleMsisdn(s);
  });
  ok(L.F14b, anySpelling && !isSampleMsisdn("255712000999") && !isSampleMsisdn("") && !/\d/.test(SAMPLE_ROW_SENTENCE)
    && setsEqual(SAMPLE_MSISDNS, sampleMsisdnsOf(CONTACT_FIELDS)));

  // ── F15 · THE GUARD PAIR (C16) ────────────────────────────────────────────────────────────────
  const w = impl.writer;
  const CORPUS = ["=1+1", "+255712345678", "-x", "@y", `${TAB}z`, `${CR}w`, "'=x", "''", "'", "-5", "@a", "", "plain", "'Asha", "Ñandú — Dar", 'say "hi"', "'+255"];
  const roundMisses = CORPUS.filter((s) => w.unguard(w.guard(s)) !== s || w.unguard(unquote(w.cell(s))) !== s)
    .map((s) => JSON.stringify(s));
  ok(L.F15a, roundMisses.length === 0 && w.unguard("'Asha") === "'Asha", roundMisses.join(", "));
  const leads = routeLeads(impl.sources.route);
  const NON_LEADS = ["a", "Z", "0", " ", "#", "%", '"', "!", "(", "*", LF];
  // ⭐ SET EQUALITY, so the claim csv-write.ts makes ("that set plus '") is the claim checked: an extra lead such as
  // ';' or '|' outside the spared list above is caught here, not only a missing one.
  const declaredLeads = [...new Set(w.leads)].sort();
  const expectedLeads = [...new Set([...leads, "'"])].sort();
  const leadSetExact = same(declaredLeads, expectedLeads);
  const guardsLeads = [...leads, "'", ...w.leads].every((c) => w.guard(`${c}x`) === `'${c}x`);
  const sparesOthers = NON_LEADS.every((c) => w.guard(`${c}x`) === `${c}x`);
  const quoting = w.cell("=1+1") === `"'=1+1"` && w.cell('say "hi"') === '"say ""hi"""' && w.cell(null) === '""'
    && w.cell(42) === '"42"' && w.cell(-5) === `"'-5"`;
  ok(L.F15b, leads.length === 6 && leadSetExact && guardsLeads && sparesOthers && quoting,
    `transactions route leads read: ${leads.length} · declared ${visible(declaredLeads.join(""))} vs route+' ${visible(expectedLeads.join(""))} · leads guarded ${guardsLeads} · others spared ${sparesOthers} · quoting ${quoting}`);
  const rows = [["a", "b"], ["c", null]];
  const plain = w.toCsv(rows);
  ok(L.F15c, plain === `"a","b"${CRLF}"c",""${CRLF}` && w.toCsv(rows, { bom: true }) === BOM + plain
    && w.toCsv(rows, { bom: true, delimiter: ";" }) === `${BOM}sep=;${CRLF}"a";"b"${CRLF}"c";""${CRLF}`
    && CSV_BOM === BOM && CSV_BOM.length === 1);

  // ── F16a · THE SAMPLE ROWS DRAFT TO THEIR LITERAL EXPECTATIONS ────────────────────────────────
  const columns = fileColumns(impl.fields);
  const sampleMap = v.autoMapHeaders(columns.map((f) => f.label));
  const drafts = Array.from({ length: CONTACT_SAMPLE_ROW_COUNT }, (_, i) =>
    v.draftContactRow(columns.map((f) => f.samples[i] ?? ""), sampleMap.mapping));
  const knownNumbers = drafts.every((d) => {
    const p = parseTzNumber(d.rawPhone);
    return p.msisdn !== null && impl.sampleMsisdns.has(p.msisdn);
  });
  const equalRows = drafts.filter((d, i) => same(d, EXPECTED_SAMPLE_DRAFTS[i])).length;
  ok(L.F16a, sampleMap.refusal === null && drafts.length === EXPECTED_SAMPLE_DRAFTS.length
    && equalRows === EXPECTED_SAMPLE_DRAFTS.length && knownNumbers,
    `${equalRows}/${EXPECTED_SAMPLE_DRAFTS.length} rows as expected · numbers known ${knownNumbers}`);

  // ── F16–F18 · U28b · THE CSV SAMPLES BACK THROUGH U25's REAL READER ────────────────────────────
  // ⛔ Never a parser of this file's own (U28): the samples go through `parseCsv`, then the ONE mapping and the ONE
  // drafter — exactly the path an officer's file takes — and must come back as the literal expectations above.
  const sameDrafts = (ds: readonly ContactDraft[]): boolean =>
    ds.length === EXPECTED_SAMPLE_DRAFTS.length && ds.every((d, i) => same(d, EXPECTED_SAMPLE_DRAFTS[i]));
  const allKnown = (ds: readonly ContactDraft[]): boolean => ds.length > 0 && ds.every((d) => {
    const p = parseTzNumber(d.rawPhone);
    return p.msisdn !== null && impl.sampleMsisdns.has(p.msisdn);
  });
  const viaCsv = (text: string) => {
    const read = impl.readers.csv(text);
    if (!read.ok) return { drafts: [] as ContactDraft[], first: "", phone: false, why: read.sentence };
    const header = read.file.rows[0]?.cells ?? [];
    const map = v.autoMapFile("csv", header);
    const first = header[0] ?? "";
    const m = v.matchHeader(first);
    const drafts = read.file.rows.slice(map.headerRows).map((r) => v.draftContactRow(r.cells, map.mapping));
    return { drafts, first, phone: m.kind === "field" && m.field === "phone", why: map.refusal ?? "" };
  };
  const rtLabelCsv = impl.samples.csv({ headers: "label", delimiter: "," });
  const f16 = viaCsv(rtLabelCsv);
  ok(L.F16, rtLabelCsv.charCodeAt(0) === 0xfeff && f16.first.charCodeAt(0) !== 0xfeff && f16.phone
    && sameDrafts(f16.drafts) && allKnown(f16.drafts),
    `sample starts with the BOM ${rtLabelCsv.charCodeAt(0) === 0xfeff} · first header resolves to phone ${f16.phone} · ${f16.drafts.filter((d, i) => same(d, EXPECTED_SAMPLE_DRAFTS[i])).length}/${EXPECTED_SAMPLE_DRAFTS.length} drafts as expected${f16.why ? ` · ${f16.why}` : ""}`);
  const f17 = viaCsv(impl.samples.csv({ headers: "swahili", delimiter: "," }));
  ok(L.F17, sameDrafts(f17.drafts) && allKnown(f17.drafts),
    `${f17.drafts.filter((d, i) => same(d, EXPECTED_SAMPLE_DRAFTS[i])).length}/${EXPECTED_SAMPLE_DRAFTS.length} drafts as expected${f17.why ? ` · ${f17.why}` : ""}`);
  const semi = impl.samples.csv({ headers: "label", delimiter: ";" });
  const f18 = viaCsv(semi);
  ok(L.F18, semi.slice(1, 6) === "sep=;" && sameDrafts(f18.drafts) && allKnown(f18.drafts),
    `directive written ${semi.slice(1, 6) === "sep=;"} · ${f18.drafts.filter((d, i) => same(d, EXPECTED_SAMPLE_DRAFTS[i])).length}/${EXPECTED_SAMPLE_DRAFTS.length} drafts as expected${f18.why ? ` · ${f18.why}` : ""}`);

  // ── F19a · THE SAMPLE vCARD ───────────────────────────────────────────────────────────────────
  const vcf = impl.samples.vcf();
  const physical = vcf.split(CRLF);
  const trailing = physical.pop();
  const longest = Math.max(0, ...physical.map(octets));
  const folds = physical.filter((l) => l.startsWith(" ")).length;
  const strayBreaks = physical.filter((l) => l.includes(LF) || l.includes(CR)).length;
  const linesEqual = (want: string): number => physical.filter((l) => l === want).length;
  const n = CONTACT_SAMPLE_ROW_COUNT;
  ok(L.F19a, trailing === "" && longest <= VCARD_FOLD_OCTETS && folds >= 1 && strayBreaks === 0
    && linesEqual("BEGIN:VCARD") === n && linesEqual("END:VCARD") === n && linesEqual("VERSION:3.0") === n && linesEqual("N:;;;;") === n
    && vcf.includes(`${BACKSLASH},`) && vcf.includes(`${BACKSLASH};`) && vcf.includes("—"),
    `longest line ${longest} octets · ${folds} fold(s) · ${linesEqual("BEGIN:VCARD")} card(s)`);

  // ── F19b · U28b · THE SAMPLE vCARD BACK THROUGH U26's REAL READER (A1.2: no header row) ─────────
  const vfile = impl.readers.vcard(impl.samples.vcf());
  const vmap = v.autoMapFile("vcard", vfile.rows[0]?.cells ?? []);
  const vdrafts = vfile.rows.slice(vmap.headerRows).map((r) => v.draftContactRow(r.cells, vmap.mapping));
  const vlines = vfile.rows.map((r) => r.line).join(",");
  ok(L.F19b, vfile.rows.length === CONTACT_SAMPLE_ROW_COUNT && vlines === "1,2,3" && vmap.headerRows === 0
    && vfile.unreadable.length === 0 && sameDrafts(vdrafts) && allKnown(vdrafts),
    `${vfile.rows.length} row(s) on lines ${vlines} · headerRows ${vmap.headerRows} · ${vdrafts.filter((d, i) => same(d, EXPECTED_SAMPLE_DRAFTS[i])).length}/${EXPECTED_SAMPLE_DRAFTS.length} drafts as expected · unreadable ${vfile.unreadable.length}`);

  // ── F19c · FOLDING NEVER SPLITS A CHARACTER OR AN ESCAPE PAIR ─────────────────────────────────
  const emojiLine = `NOTE:${String.fromCodePoint(0x1f600).repeat(30)}`;
  const escapeLine = `NOTE:X${`${BACKSLASH},`.repeat(40)}`;
  const unfold = (folded: string): string => {
    const p = folded.split(CRLF);
    return p[0] + p.slice(1).map((x) => x.slice(1)).join("");
  };
  const loneSurrogate = (s: string): boolean => Array.from(s).some((ch) => ch.length === 1 && (ch.charCodeAt(0) & 0xf800) === 0xd800);
  const emojiFolded = impl.fold(emojiLine);
  const escapeFolded = impl.fold(escapeLine);
  const ep = emojiFolded.split(CRLF);
  const sp = escapeFolded.split(CRLF);
  ok(L.F19c, unfold(emojiFolded) === emojiLine && unfold(escapeFolded) === escapeLine && ep.length > 1 && sp.length > 1
    && [...ep, ...sp].every((x) => octets(x) <= VCARD_FOLD_OCTETS) && !ep.some(loneSurrogate)
    && sp.slice(0, -1).every((x) => !x.endsWith(BACKSLASH)) && sp.slice(1).every((x) => x.startsWith(" ")));

  // ── F20 · ONE LIST, STRUCTURALLY ──────────────────────────────────────────────────────────────
  const offenders = oneListOffenders(impl.tree);
  log(`F20 population (srcFiles): ${impl.tree.length} file(s) under ${impl.treeDirs.length} tree(s) holding files: ${impl.treeDirs.join(", ")}`);
  ok(L.F20a, impl.tree.length >= 3 && offenders.length === 0,
    offenders.length ? offenders.join(" | ") : `${impl.tree.length} file(s) scanned, ${PATHS.fields} excepted`);
  const planted = oneListOffenders([{ path: "src/app/admin/contacts/planted-export.ts", text: 'const H = ["phone_e164","name"];' }]);
  ok(L.F20b, planted.length === 1 && planted[0].endsWith('"phone_e164"'), planted.join(" | ") || "the planted list was NOT reported");

  // ── F21 · A BUTTON BESIDE EVERY ENTRANCE ──────────────────────────────────────────────────────
  const entrance = entrancesWithoutButton(impl.tree);
  log(`F21 population: ${entrance.entrances} file entrance(s) in the contacts trees — 0 until U30 adds the drop zone`);
  ok(L.F21a, entrance.missing.length === 0,
    `${entrance.entrances} entrance(s)${entrance.missing.length ? ` — no button in ${entrance.missing.join(", ")}` : ""}`);
  const plantedDrop = '<input type="file" accept=".csv" onChange={pick} />';
  const bare = entrancesWithoutButton([{ path: "planted-drop.tsx", text: plantedDrop }]);
  const paired = entrancesWithoutButton([{ path: "planted-drop.tsx", text: `${plantedDrop}<SampleSheetButton />` }]);
  ok(L.F21b, bare.entrances === 1 && bare.missing.length === 1 && paired.entrances === 1 && paired.missing.length === 0);

  // ── F23 · M6, EXCEL'S SCIENTIFIC FORM ─────────────────────────────────────────────────────────
  const SCIENTIFIC = ["2.55713E+11", "2,55713E+11", " 2.55713e+11 ", "2.55754E+11"];
  const sciMisses = SCIENTIFIC.filter((c) => {
    const p = v.draftContactRow([c], { phone: 0 }).problems;
    return !(p.length === 1 && p[0].field === "phone" && p[0].sentence === excelShortenedSentence());
  });
  const sciEcho = v.draftContactRow(["2.55754E+11"], { phone: 0 }).problems.some((p) => p.sentence.includes("2.55754"));
  const plainNumbers = v.draftContactRow(["0745 100 200"], { phone: 0 }).problems.length === 0
    && v.draftContactRow(["255713000000"], { phone: 0 }).problems.length === 0;
  ok(L.F23, sciMisses.length === 0 && !sciEcho && plainNumbers && looksExcelShortened("2.55713E+11") && !looksExcelShortened("255713000000"),
    `unflagged: ${sciMisses.map((c) => JSON.stringify(c)).join(", ") || "none"} · echoed ${sciEcho}`);

  // ── F24 · C20, THE vCARD MAPPING LIVES IN THE LIST ────────────────────────────────────────────
  const vcardOf = (k: ImportFieldKey): readonly string[] | null => field(k)?.vcard ?? null;
  const mapping = same(vcardOf("name"), ["FN", "N", "ORG"]) && same(vcardOf("phone"), ["TEL"]) && same(vcardOf("email"), ["EMAIL"])
    && same(vcardOf("tags"), ["CATEGORIES"]) && same(vcardOf("notes"), ["NOTE"]) && same(vcardOf("first_name"), []) && same(vcardOf("last_name"), []);
  const grid = same(columns.map((f) => f.label), ["Phone", "Name", "Email", "Tags", "Notes"]) && columns.every((f) => f.vcard.length > 0)
    && impl.fields.filter((f) => !columns.includes(f)).every((f) => f.vcard.length === 0);
  const picks = nameSpec !== undefined
    && pickVcardValue(nameSpec, { FN: "", N: composeName("Asha", "Mwakalinga"), ORG: "Kariakoo Traders" }) === "Asha Mwakalinga"
    && pickVcardValue(nameSpec, { FN: "Bi Asha", N: "Asha Mwakalinga" }) === "Bi Asha"
    && pickVcardValue(nameSpec, { ORG: "Kariakoo Traders" }) === "Kariakoo Traders"
    && pickVcardValue(nameSpec, {}) === "";
  const composes = composeName("  Asha ", "") === "Asha" && composeName("", "") === null && composeName("Asha", "Mwakalinga") === "Asha Mwakalinga";
  ok(L.F24, mapping && grid && picks && composes, `mapping ${mapping} · grid ${grid} · FN→N→ORG ${picks} · composer ${composes}`);

  // ── F25 · M5, THE MASKED EXPORT HEADER ────────────────────────────────────────────────────────
  const fullHeader = v.exportHeader(true);
  const maskedHeader = v.exportHeader(false);
  const differAt = fullHeader.map((h, i) => (h === maskedHeader[i] ? -1 : i)).filter((i) => i >= 0);
  const refuses = (h: string): boolean => {
    const m = v.matchHeader(h);
    return m.kind === "notImported" && m.refused;
  };
  ok(L.F25, same(maskedHeader, EXPORT_HEADER_MASKED) && same(differAt, [0, 2]) && differAt.every((i) => refuses(maskedHeader[i]))
    && fullHeader.length === maskedHeader.length, `${maskedHeader.join(",")} · differs at ${differAt.join(",")}`);

  // ── F26 · THE SAMPLE FILES' ENVELOPE ──────────────────────────────────────────────────────────
  const csvFile = contactSampleFile("csv");
  const vcfFile = contactSampleFile("vcf");
  const labelCsv = impl.samples.csv({ headers: "label", delimiter: "," });
  const swCsv = impl.samples.csv({ headers: "swahili", delimiter: "," });
  const semiCsv = impl.samples.csv({ headers: "label", delimiter: ";" });
  const linesOf = (s: string): string[] => (s.startsWith(BOM) ? s.slice(1) : s).split(CRLF);
  const envelope: Record<string, boolean> = {
    filenames: csvFile.filename === "50pick-contacts-sample.csv" && vcfFile.filename === "50pick-contacts-sample.vcf",
    mimes: csvFile.mime === "text/csv;charset=utf-8" && vcfFile.mime === "text/vcard;charset=utf-8",
    bomOnCsvOnly: [csvFile.content, labelCsv, swCsv, semiCsv].every((s) => s.startsWith(BOM))
      && !vcfFile.content.startsWith(BOM) && vcfFile.content.startsWith("BEGIN:VCARD"),
    labelHeader: linesOf(labelCsv)[0] === '"Phone","Name","Email","Tags","Notes"',
    swahiliHeader: linesOf(swCsv)[0] === '"Simu","Jina","Barua pepe","Makundi","Maelezo"',
    semicolonHeader: same(linesOf(semiCsv).slice(0, 2), ["sep=;", '"Phone";"Name";"Email";"Tags";"Notes"']),
    rowCount: linesOf(labelCsv).length === CONTACT_SAMPLE_ROW_COUNT + 2 && linesOf(semiCsv).length === CONTACT_SAMPLE_ROW_COUNT + 3,
  };
  const envelopeMisses = Object.entries(envelope).filter(([, good]) => !good).map(([k]) => k);
  ok(L.F26, envelopeMisses.length === 0, envelopeMisses.join(", "));

  // ── F27 · A1.2, A vCARD HAS NO HEADER ROW ─────────────────────────────────────────────────────
  const gridLabels = columns.map((f) => f.label);
  const card1 = columns.map((f) => f.samples[0] ?? "");
  const asCard = v.autoMapFile("vcard", card1);
  const labelsAsCard = v.autoMapFile("vcard", gridLabels);
  const cardHeaderMatched = v.autoMapFile("csv", card1);
  const FIXED_GRID = { phone: 0, name: 1, email: 2, tags: 3, notes: 4 };
  const ROW_FORMATS = ["csv", "xlsx", "paste"] as const;
  const gridColumnsRight = asCard.columns.length === columns.length
    && asCard.columns.every((c, i) => c.index === i && c.status === "mapped" && c.field === columns[i]?.key && c.header === columns[i]?.label);
  ok(L.F27, asCard.headerRows === 0 && asCard.refusal === null && !asCard.headerless && same(asCard.mapping, FIXED_GRID)
    && same(fileColumnsMapping(impl.fields), FIXED_GRID) && gridColumnsRight
    && labelsAsCard.headerRows === 0 && same(labelsAsCard.mapping, FIXED_GRID)
    && same(v.draftContactRow(card1, asCard.mapping), EXPECTED_SAMPLE_DRAFTS[0])
    && v.validateMapping(asCard.columns.map((c) => c.header), asCard.mapping).ok
    && ROW_FORMATS.every((fmt) => v.autoMapFile(fmt, gridLabels).headerRows === 1)
    && same(v.autoMapFile("csv", gridLabels).mapping, v.autoMapHeaders(gridLabels).mapping)
    && cardHeaderMatched.headerless && cardHeaderMatched.refusal !== null,
    `vcard → headerRows ${asCard.headerRows}, mapping ${JSON.stringify(asCard.mapping)} · control: card 1 header-matched → ${cardHeaderMatched.headerless ? "headerless (the card A1.2 saves)" : "NOT headerless — the control proves nothing"}`);

  // ── F28 · A1.5, GOOGLE'S LABEL COLUMNS ARE RECOGNISED AND NOT READ ────────────────────────────
  const GOOGLE_COLUMNS = ["Labels", "Group Membership"];
  const googleMisses = GOOGLE_COLUMNS.filter((h) => {
    const m = v.matchHeader(h);
    return !(m.kind === "notImported" && !m.refused && m.reason === CONTACT_GOOGLE_LABELS_NOT_READ);
  });
  const googleForms = new Set(GOOGLE_COLUMNS.map(normaliseHeader));
  const googleOwnedByField = impl.fields.flatMap((f) =>
    [...f.aliases, ...f.weakAliases].filter((a) => googleForms.has(normaliseHeader(a))).map((a) => `${f.key}: ${a}`));
  const googleFile = v.autoMapHeaders(["Name", "Phone 1 - Value", "Labels"]);
  const googleRow = v.draftContactRow(["Amina Juma", "0745 100 200", "* myContacts ::: Friends"], googleFile.mapping);
  const forcedLabels = v.validateMapping(["Phone 1 - Value", "Group Membership"], { phone: 0, tags: 1 });
  ok(L.F28, googleMisses.length === 0 && googleOwnedByField.length === 0 && googleFile.refusal === null
    && googleFile.mapping.tags === undefined && googleFile.columns[2]?.status === "notImported"
    && googleFile.columns[2]?.note === CONTACT_GOOGLE_LABELS_NOT_READ && googleRow.problems.length === 0
    && !forcedLabels.ok && forcedLabels.sentence === CONTACT_GOOGLE_LABELS_NOT_READ,
    `missed: ${googleMisses.join(", ") || "none"} · owned by a field: ${googleOwnedByField.join(", ") || "none"} · a Google row's problems: ${googleRow.problems.length}`);

  // ── F29 · A1.6, ONE PHONE-FORMAT REMEDY ───────────────────────────────────────────────────────
  const phoneHint = phoneSpec?.hint ?? "";
  ok(L.F29, /Number with 0 decimal places/.test(PHONE_FORMAT_REMEDY) && phoneHint.includes(PHONE_FORMAT_REMEDY)
    && excelShortenedSentence().includes(PHONE_FORMAT_REMEDY) && !/\bas text\b/i.test(phoneHint)
    && !impl.sources.fields.includes("decimal places"),
    phoneHint);
}

/* ══ THE RED PLANTS — each a defect somebody could plausibly write, built in memory ═════════════════ */

/** validateMapping as somebody would write it without the not-imported refusals: bounds, uniqueness, Phone. */
const naiveValidate = (headers: readonly string[], mapping: ColumnMapping): MappingVerdict => {
  const known = new Set<string>(CONTACT_FIELDS.map((f) => f.key));
  const used = new Set<number>();
  for (const [key, index] of Object.entries(mapping)) {
    if (index === undefined) continue;
    if (!known.has(key) || !Number.isInteger(index) || index < 0 || index >= headers.length || used.has(index)) {
      return { ok: false, sentence: "This mapping is not valid." };
    }
    used.add(index);
  }
  return mapping.phone === undefined ? { ok: false, sentence: "Choose the column that holds the phone numbers." } : { ok: true };
};

const withVocab = (patch: Partial<ContactVocabulary>): FieldsImpl => ({ ...real(), vocab: { ...real().vocab, ...patch } });

const PLANTS: readonly RedPlant<FieldsImpl>[] = [
  {
    // ⭐ ISOLATED: the planted field HAS a vCard source, so §F2's vCard clause passes and ONLY its empty samples can
    // turn §F2 red. (With `vcard: []` the vCard clause failed first, and deleting the samples clause stayed red.)
    name: "a field with no sample value (the plan's RED)",
    expect: L.F2,
    impl: () => withLists([...CONTACT_FIELDS, {
      key: "city" as ImportFieldKey, label: "City", exportHeader: null, swAlias: null, aliases: ["city"], weakAliases: [],
      required: false, maxLength: 60, vcard: ["NOTE"], samples: ["", "", ""], hint: "",
    }], CONTACT_NOT_IMPORTED),
  },
  {
    name: "'simu' dropped from the phone aliases",
    expect: L.F5,
    impl: () => withLists(patchField("phone", { aliases: spec("phone").aliases.filter((a) => a !== "simu") }), CONTACT_NOT_IMPORTED),
  },
  {
    name: "name's export header renamed 'person' with no matching alias",
    expect: L.F4b,
    impl: () => withLists(patchField("name", { exportHeader: "person" }), CONTACT_NOT_IMPORTED),
  },
  {
    name: "the alias 'consent' attached to Notes",
    expect: L.F6a,
    impl: () => withLists(patchField("notes", { aliases: [...spec("notes").aliases, "consent"] }), CONTACT_NOT_IMPORTED),
  },
  {
    name: "'phone masked' moved from the refused columns into the phone aliases",
    expect: L.F7a,
    impl: () => withLists(
      patchField("phone", { aliases: [...spec("phone").aliases, "phone masked"] }),
      CONTACT_NOT_IMPORTED.map((e) => (e.header === "phone_masked" ? { ...e, aliases: e.aliases.filter((a) => a !== "phone masked") } : e)),
    ),
  },
  {
    name: "validateMapping without the not-imported-column refusal",
    expect: L.F7b,
    impl: () => withVocab({ validateMapping: naiveValidate }),
  },
  {
    name: "phone's weak aliases merged into the strong ones — strength is lost",
    expect: L.F9,
    impl: () => withLists(
      patchField("phone", { aliases: [...spec("phone").aliases, ...spec("phone").weakAliases], weakAliases: [] }),
      CONTACT_NOT_IMPORTED,
    ),
  },
  {
    name: "draftContactRow composes First + Last even when a Name column is mapped",
    expect: L.F10,
    impl: () => {
      const draft = real().vocab.draftContactRow;
      return withVocab({
        draftContactRow: (cells, mapping) => {
          const d = draft(cells, mapping);
          if (mapping.first_name === undefined && mapping.last_name === undefined) return d;
          const at = (i: number | undefined): string => (i === undefined ? "" : cells[i] ?? "");
          return { ...d, displayName: composeName(at(mapping.first_name), at(mapping.last_name)) };
        },
      });
    },
  },
  {
    name: "splitTags without '|'",
    expect: L.F11a,
    impl: () => {
      const SOH = String.fromCharCode(1);
      return { ...real(), tags: { ...real().tags, split: (raw: string) => splitTags(raw.split("|").join(SOH)).map((t) => t.split(SOH).join("|")) } };
    },
  },
  {
    name: "a phone sample written '255754000001' — Excel saves it as 2.55754E+11",
    expect: L.F13,
    impl: () => withLists(patchField("phone", { samples: ["255754000001", ...spec("phone").samples.slice(1)] }), CONTACT_NOT_IMPORTED),
  },
  {
    name: "SAMPLE_MSISDNS typed by hand, one sample number missing",
    expect: L.F14,
    impl: () => ({ ...real(), sampleMsisdns: new Set(["255745100200", "255678200300"]) }),
  },
  {
    name: "unguardCell is the identity",
    expect: L.F15a,
    impl: () => ({ ...real(), writer: { ...real().writer, unguard: (s: string) => s } }),
  },
  {
    name: "C16 · the transactions-style guard, with no apostrophe lead — '=x typed by a person comes back as =x",
    expect: L.F15a,
    impl: () => {
      const routeSet = new Set(routeLeads(real().sources.route));
      return { ...real(), writer: { ...real().writer, guard: (s: string) => (s.length > 0 && routeSet.has(s[0]) ? `'${s}` : s) } };
    },
  },
  {
    name: "the vCard writer stops folding",
    expect: L.F19a,
    impl: () => {
      const samples = real().samples;
      return { ...real(), samples: { ...samples, vcf: () => samples.vcf().split(`${CRLF} `).join("") } };
    },
  },
  {
    name: "a contacts-tree file keeps its own export header list",
    expect: L.F20a,
    impl: () => ({ ...real(), tree: [...real().tree, { path: "src/app/admin/contacts/planted-export.ts", text: 'export const HEADER = ["phone_e164", "name", "email"];' }] }),
  },
  {
    name: "a file entrance with no SampleSheetButton beside it",
    expect: L.F21a,
    impl: () => ({ ...real(), tree: [...real().tree, { path: "src/app/admin/contacts/planted-drop.tsx", text: '<input type="file" accept=".csv,.vcf" onChange={pick} />' }] }),
  },
  {
    name: "contact-fields.ts imports the server store",
    expect: L.F1,
    impl: () => ({ ...real(), sources: { ...real().sources, fields: `import { db } from "@/lib/server/store";${LF}${real().sources.fields}` } }),
  },
  {
    name: "a problem sentence quotes the cell back",
    expect: L.F12c,
    impl: () => {
      const draft = real().vocab.draftContactRow;
      return withVocab({
        draftContactRow: (cells, mapping) => {
          const d = draft(cells, mapping);
          return { ...d, problems: d.problems.map((p) => ({ field: p.field, sentence: `${p.sentence} You wrote: ${cells[mapping[p.field] ?? -1] ?? ""}` })) };
        },
      });
    },
  },
  {
    name: "C11 · splitTags keeps the first spelling — 'VIP' here and 'vip' there are two stored tags",
    expect: L.F11a,
    impl: () => ({
      ...real(),
      tags: {
        ...real().tags,
        split: (raw: string) => {
          const out: string[] = [];
          const seenKeys = new Set<string>();
          for (const piece of raw.split(/[,;|]/)) {
            const t = piece.normalize("NFKC").replace(/\s+/g, " ").trim();
            const k = t.toLowerCase();
            if (t === "" || seenKeys.has(k)) continue;
            seenKeys.add(k);
            out.push(t);
          }
          return out;
        },
      },
    }),
  },
  {
    name: "C11 · checkTags without the character rule",
    expect: L.F11b,
    impl: () => ({
      ...real(),
      tags: {
        ...real().tags,
        check: (tags: readonly string[]) =>
          tags.length > 20 ? "A contact can have at most 20 tags." : tags.some((t) => Array.from(t).length > 32) ? "Each tag can be at most 32 characters." : null,
      },
    }),
  },
  {
    name: "C12 · the Tags limit typed by hand as 40, the pre-decision number",
    expect: L.F12a,
    impl: () => withLists(patchField("tags", { maxLength: 40 }), CONTACT_NOT_IMPORTED),
  },
  {
    name: "M6 · draftContactRow without the scientific-form flag",
    expect: L.F23,
    impl: () => {
      const draft = real().vocab.draftContactRow;
      return withVocab({
        draftContactRow: (cells, mapping) => {
          const d = draft(cells, mapping);
          return { ...d, problems: d.problems.filter((p) => p.sentence !== excelShortenedSentence()) };
        },
      });
    },
  },
  {
    name: "C20 · Name's vCard sources without ORG",
    expect: L.F24,
    impl: () => withLists(patchField("name", { vcard: ["FN", "N"] }), CONTACT_NOT_IMPORTED),
  },
  {
    name: "M5 · the masked email column dropped — a masked export writes a plain 'email' header",
    expect: L.F25,
    impl: () => withLists(CONTACT_FIELDS, CONTACT_NOT_IMPORTED.filter((e) => e.header !== "email_masked")),
  },
  {
    name: "the headerless refusal quotes the first row back",
    expect: L.F8b,
    impl: () => {
      const autoMap = real().vocab.autoMapHeaders;
      return withVocab({
        autoMapHeaders: (headers) => {
          const r = autoMap(headers);
          return r.headerless ? { ...r, refusal: `${r.refusal ?? ""} First row: ${headers.join(", ")}` } : r;
        },
      });
    },
  },
  {
    name: "one alias claimed twice — 'label' on Notes as well as Tags",
    expect: L.F3,
    impl: () => withLists(patchField("notes", { aliases: [...spec("notes").aliases, "label"] }), CONTACT_NOT_IMPORTED),
  },
  // ── the assertions that carried weight without a plant (tranche-1 review) ─────────────────────────────
  {
    name: "§5.14 · the no-Phone refusal lists the headers whatever they hold",
    expect: L.F8a,
    impl: () => {
      const autoMap = real().vocab.autoMapHeaders;
      return withVocab({
        autoMapHeaders: (headers) => {
          const r = autoMap(headers);
          return r.refusal !== null && r.refusal.startsWith("This file has no ") && !r.refusal.includes("The columns found:")
            ? { ...r, refusal: `${r.refusal} The columns found: ${headers.join(", ")}.` }
            : r;
        },
      });
    },
  },
  {
    name: "the headerless test asks parseTzNumber with no number shape — 'Phone (0712 345 678)' refuses the file",
    expect: L.F8b,
    impl: () => {
      const autoMap = real().vocab.autoMapHeaders;
      const headerlessSentence = autoMap(["0712 345 678"]).refusal;
      return withVocab({
        autoMapHeaders: (headers) => {
          const r = autoMap(headers);
          return !r.headerless && headers.some((h) => parseTzNumber(String(h ?? "")).verdict === "ok")
            ? { ...r, headerless: true, refusal: headerlessSentence }
            : r;
        },
      });
    },
  },
  {
    name: "a stored name keeps its direction overrides and zero-width spaces",
    expect: L.F10c,
    impl: () => {
      const draft = real().vocab.draftContactRow;
      return withVocab({
        draftContactRow: (cells, mapping) => {
          const d = draft(cells, mapping);
          const i = mapping.name;
          if (i === undefined) return d;
          const kept = String(cells[i] ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
          return { ...d, displayName: kept === "" ? null : kept };
        },
      });
    },
  },
  {
    name: "C11 · a tag of only - and _, or a lone combining mark, is accepted",
    expect: L.F11b,
    impl: () => ({
      ...real(),
      tags: {
        ...real().tags,
        check: (tags: readonly string[]) => {
          const r = checkTags(tags);
          return r === TAG_NEEDS_LETTER_SENTENCE ? null : r;
        },
      },
    }),
  },
  {
    name: "C16 · ';' added to the guard's lead set — no longer the transactions set plus the apostrophe",
    expect: L.F15b,
    impl: () => {
      const leads = [...CSV_GUARD_LEADS, ";"];
      const set = new Set(leads);
      return {
        ...real(),
        writer: {
          ...real().writer,
          leads,
          guard: (s: string) => (s.length > 0 && set.has(s[0]) ? `'${s}` : s),
          unguard: (s: string) => (s.length > 1 && s[0] === "'" && set.has(s[1]) ? s.slice(1) : s),
        },
      };
    },
  },
  {
    name: "toCsv ends its lines with LF, not CRLF",
    expect: L.F15c,
    impl: () => ({
      ...real(),
      writer: { ...real().writer, toCsv: ((rows, opts) => toCsv(rows, opts).split(CRLF).join(LF)) as typeof toCsv },
    }),
  },
  {
    name: "draftContactRow stops lower-casing the email — U28b's oracle row 2 drifts",
    expect: L.F16a,
    impl: () => {
      const draft = real().vocab.draftContactRow;
      return withVocab({
        draftContactRow: (cells, mapping) => {
          const d = draft(cells, mapping);
          const i = mapping.email;
          const raw = i === undefined ? "" : String(cells[i] ?? "").trim();
          return { ...d, email: raw === "" ? null : raw };
        },
      });
    },
  },
  {
    name: "foldVcardLine counts a backslash escape as two separate units",
    expect: L.F19c,
    impl: () => ({
      ...real(),
      fold: (line: string, maxOctets = VCARD_FOLD_OCTETS) => {
        const lines: string[] = [];
        let current = "";
        let used = 0;
        for (const ch of Array.from(line)) {
          const o = octets(ch);
          if (used + o > maxOctets && current !== "" && current !== " ") {
            lines.push(current);
            current = " ";
            used = 1;
          }
          current += ch;
          used += o;
        }
        lines.push(current);
        return lines.join(CRLF);
      },
    }),
  },
  {
    name: "a second contact-fields.ts, in another contacts tree, keeps its own list",
    expect: L.F20a,
    impl: () => ({ ...real(), tree: [...real().tree, { path: "src/app/admin/contacts/contact-fields.ts", text: 'export const COLUMNS = ["phone_e164", "jina"];' }] }),
  },
  {
    name: "the Name samples drift from First + Last — row 3 is two different people",
    expect: L.F2b,
    impl: () => withLists(patchField("name", { samples: ["Amina Juma", "Baraka Mwakyusa", "Neema Mushi"] }), CONTACT_NOT_IMPORTED),
  },
  {
    name: "the email samples are all lower case — the lower-casing is never exercised",
    expect: L.F2c,
    impl: () => withLists(patchField("email", { samples: ["amina.juma@example.com", "baraka.m@example.com", ""] }), CONTACT_NOT_IMPORTED),
  },
  {
    name: "U34's header loses added_at",
    expect: L.F4a,
    impl: () => {
      const header = real().vocab.exportHeader;
      return withVocab({ exportHeader: (full) => header(full).filter((h) => h !== "added_at") });
    },
  },
  {
    name: "the email field's Swahili header renamed 'Barua' with no matching alias",
    expect: L.F4c,
    impl: () => withLists(patchField("email", { swAlias: "Barua" }), CONTACT_NOT_IMPORTED),
  },
  {
    name: "OD10 · validateMapping lets a Consent column feed a field",
    expect: L.F6b,
    impl: () => {
      const validate = real().vocab.validateMapping;
      return withVocab({
        validateMapping: (headers, mapping) => {
          const r = validate(headers, mapping);
          return !r.ok && r.sentence === CONTACT_CONSENT_NOT_READ ? { ok: true } : r;
        },
      });
    },
  },
  {
    name: "a draft grows a firstName key — a name stored in parts",
    expect: L.F10b,
    impl: () => {
      const draft = real().vocab.draftContactRow;
      return withVocab({ draftContactRow: (cells, mapping) => ({ ...draft(cells, mapping), firstName: null }) as ContactDraft });
    },
  },
  {
    name: "C12 · the Name limit is never checked",
    expect: L.F12b,
    impl: () => {
      const draft = real().vocab.draftContactRow;
      return withVocab({
        draftContactRow: (cells, mapping) => {
          const d = draft(cells, mapping);
          return { ...d, problems: d.problems.filter((p) => p.field !== "name") };
        },
      });
    },
  },
  {
    name: "the sample CSV is written without its BOM — Excel shows the em dash as mojibake",
    expect: L.F26,
    impl: () => {
      const samples = real().samples;
      return { ...real(), samples: { ...samples, csv: (variant) => samples.csv(variant).replace(BOM, "") } };
    },
  },
  // ── AMENDMENT A1 ───────────────────────────────────────────────────────────────────────────────────────
  {
    name: "A1.2 · a vCard header-matched like a CSV — card 1 is read as column names",
    expect: L.F27,
    impl: () => {
      const autoMap = real().vocab.autoMapHeaders;
      return withVocab({ autoMapFile: (_format, firstRow) => ({ ...autoMap(firstRow), headerRows: 1 }) });
    },
  },
  {
    name: "A1.5 · 'group membership' moved back onto the Tags aliases — every Google row gets a tags problem",
    expect: L.F28,
    impl: () => withLists(
      patchField("tags", { aliases: [...spec("tags").aliases, "group membership"] }),
      CONTACT_NOT_IMPORTED.map((e) => (e.kind === "foreign" ? { ...e, aliases: e.aliases.filter((a) => a !== "group membership") } : e)),
    ),
  },
  {
    name: "A1.6 · the Phone hint words its own remedy again — 'format the column as Text'",
    expect: L.F29,
    impl: () => withLists(
      patchField("phone", { hint: "A Tanzanian mobile number in any spelling. Keep the spaces, or format the column as Text, so a spreadsheet keeps every digit." }),
      CONTACT_NOT_IMPORTED,
    ),
  },
  // ── U28b · the round trips (each plant breaks the REAL path one way; the label that must catch it) ──
  {
    name: "U28b · the CSV reader leaves the byte-order mark on the first header",
    expect: L.F16,
    impl: () => ({
      ...real(),
      readers: {
        ...real().readers,
        csv: (text, options) => {
          const r = parseCsv(text, options);
          if (!r.ok || r.file.rows.length === 0) return r;
          const [head, ...rest] = r.file.rows;
          return { ok: true as const, file: { ...r.file, rows: [{ ...head, cells: [BOM + (head.cells[0] ?? ""), ...head.cells.slice(1)] }, ...rest] } };
        },
      },
    }),
  },
  {
    name: "U28b · 'simu' dropped — the Swahili sample's phone column no longer maps",
    expect: L.F17,
    impl: () => withLists(patchField("phone", { aliases: spec("phone").aliases.filter((a) => a !== "simu") }), CONTACT_NOT_IMPORTED),
  },
  {
    name: "U28b · a reader that ignores sep= and splits every line on commas",
    expect: L.F18,
    impl: () => ({ ...real(), readers: { ...real().readers, csv: (text, options) => parseCsv(text, { ...options, delimiter: "comma" }) } }),
  },
  {
    name: "U28b · the sample vCard header-matched — card 1 read as column names (A1.2)",
    expect: L.F19b,
    impl: () => withVocab({ autoMapFile: (_format, first) => ({ ...real().vocab.autoMapHeaders(first), headerRows: 1 as const }) }),
  },
];

export const fieldsSection: ImportSection<FieldsImpl> = {
  name: "fields",
  owner: "U28a",
  real,
  run,
  plants: PLANTS,
};

/* ══ TODO — U28b, landing in the commit after each real reader. NOT faked here. ═════════════════════
 *
 * ⛔ Each of these needs a REAL parser. Writing one in this file would be the second parser U28 forbids, so until
 * the reader exists the claim "the suite drives each sample back through the real parser" is not made.
 *
 *  ✅ §F16, §F17, §F18 and §F19b LANDED with U28b (S10, after U25 `928265b9` and U26 `b4faac34`), each with its own plant.
 *  ⏳ The A1.3 case waits for U27b's reader: an xlsx holding the NUMBER 255713000000 must draft `invalid` through it,
 *    never a contact.
 *  (The original notes, kept for the record:)
 *  · §F16 · CSV ROUND TRIP through U25's reader (`src/lib/contacts/import-parse.ts`): `contactSampleFile("csv")
 *    .content` starts with U+FEFF; the parsed first header resolves to phone (the BOM really was stripped — the pair
 *    U34 relies on); `autoMapHeaders` then `draftContactRow` give drafts equal to `EXPECTED_SAMPLE_DRAFTS`; every
 *    `rawPhone` is in `SAMPLE_MSISDNS` after `parseTzNumber`. Lands with U25.
 *  · §F17 · THE SWAHILI-HEADER VARIANT (`contactSampleCsv({ headers: "swahili", delimiter: "," })`) through the same
 *    reader gives drafts identical to §F16's. Plant 2 ('simu' dropped) must then also fail §F17. Lands with U25.
 *  · §F18 · THE `sep=;` VARIANT (`{ headers: "label", delimiter: ";" }`) gives drafts identical to §F16's — the field
 *    list survives the directive and the header-line delimiter vote. Lands with U25.
 *  · §F19b · vCARD ROUND TRIP through U26's reader (`src/lib/contacts/vcard.ts`): `CONTACT_SAMPLES.vcf()` gives 3
 *    rows — NO header row (A1.2), lines 1, 2 and 3 — mapped by `autoMapFile("vcard", …)` with `headerRows: 0`, whose
 *    drafts are identical to §F16's: CARD 1 SURVIVES, the name from FN, the tags from CATEGORIES, the note unescaped
 *    and unfolded with its em dash intact. Plant 13 (folding disabled) is already proven against §F19a above, and the
 *    fixed mapping against §F27; §F19b adds the reader's side. Lands with U26.
 *  · §F22 · THE BUTTON IS WHAT THE SUITE TESTED: `src/app/admin/contacts/sample-sheet-button.tsx` starts with
 *    "use client", imports `contactSampleFile`, builds the Blob from `.content` with `.mime`, sets the download name
 *    from `.filename`, imports nothing from lib/server or exceljs, and builds its title from `CONTACT_FIELDS` (no
 *    hand-typed column list). Lands with the button file, which is outside U28a's file set (S10).
 */
