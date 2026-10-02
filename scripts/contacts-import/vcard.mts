/**
 * test:contacts-import · section "vcard" — U26: the vCard reader (`src/lib/contacts/vcard.ts`).   (S10, 2026-10-02)
 *
 * ⭐ EXECUTED, NOT READ. Every behaviour runs through the real reader, on fixtures BUILT HERE in code — there is no
 * `.vcf` on disk (`core.autocrlf=true` would rewrite a fixture file's line endings), and every CR, LF, BOM, backslash
 * and non-ASCII character is made from its char code (the editing tools decode escape text into raw characters).
 * The SOURCE is read only for what only the source can show: what vcard.ts imports (§V11a), and that no other src
 * file sniffs for a vCard (§V11b).
 *
 * ⭐ THE PLAN'S SENTENCES, ASSERTED (§9 U26 and DECISIONS-U21-U28): both continuation rules in ONE walk, against two
 * fixtures and in both orders (§V1a unfold-first, §V1b QP-first, §V1c); the version-aware fold (§V1f); groups
 * (§V2); bare 2.1 parameters (§V3); `tel:` URIs with ';ext=' and '+254' fixtures and a plain control (§V4); every
 * TEL kept in preference order with the first SENDABLE one chosen (§V5); cards counted apart from rows, with the
 * 12-card sentence (§V6a); C15's shape with NO header row and the card ordinal as `line` (A1.2 — §V6b, §V6c); the
 * skipped cards in `unreadable` with digit-free reasons (A1.8 — §V6b, §V10a); every split point, a CR|LF split
 * included (§V7); a 1 MB PHOTO never held (§V8b); the Accept line's 20,000 cards in 64 KB chunks with the NDC table
 * built once (§V8a); the C20 mapping (§V9b); the ONE sniff (C17 — §V11b, §V12); and U28's own sample vCard read
 * back with card 1 first (§V13 — the reader's side of U28b's round trip).
 *
 * ⭐ PROVED BY MUTATION. Every label below is named by at least one red plant EXCEPT the three CONTROLS — §V4c, §V8c
 * and §V11c — which exist to show that a neighbour's fixture, measure or scanner can discriminate at all. A plant is
 * one of: a RULE swapped in `buildVcardReader` (the walk itself unchanged — the faithful defect); a pass over the
 * WHOLE text before the real walk (how a two-pass reader behaves — the chunks are gathered first, so the chunked and
 * whole reads stay equal and only the targeted assertion can move); a chunk wrapper (a boundary read as a line end);
 * an output map (a shape defect); or a swapped function, source or tree. The runner requires each plant's OWN label
 * among the reds.
 *
 * ⛔ IN-PROCESS. Every plant is a replacement bundle built in memory; this module reads files and makes no
 * file-changing call.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "../lib/decomment.mts";
import { REPO_ROOT, srcFiles } from "../lib/tracked-files.mts";
import type { ImportSection, RedPlant, SectionContext } from "../contacts-import.test.mts";
import {
  MAX_KEPT_LINE,
  VCARD_CUT_OFF,
  VCARD_NO_PHONE,
  VCARD_RULES,
  assertVcardCounts,
  buildVcardReader,
  createVcardReader,
  describeVcardCounts,
  looksLikeVcard,
  parseVcardText,
  type VcardCounts,
  type VcardParam,
  type VcardReader,
  type VcardReaderOptions,
  type VcardRules,
  type VcardStats,
} from "../../src/lib/contacts/vcard.ts";
import {
  CONTACT_FIELDS,
  CONTACT_SAMPLE_ROW_COUNT,
  autoMapFile,
  autoMapHeaders,
  draftContactRow,
  fileColumns,
  splitTags,
  type ContactFieldSpec,
  type ImportFieldKey,
} from "../../src/lib/contacts/contact-fields.ts";
import { isParsedContactsFile } from "../../src/lib/contacts/parsed-file.ts";
import { CONTACT_SAMPLES } from "../../src/lib/contacts/sample-sheet.ts";
import { parseTzNumber, tzTableBuildCount } from "../../src/lib/tz-msisdn.ts";

/* ⛔ Every special character from its code — the editing tools decode escape text into raw characters. */
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const CRLF = CR + LF;
const BOM = String.fromCharCode(0xfeff);
const BACKSLASH = String.fromCharCode(92);
const E_ACUTE = String.fromCharCode(0xe9);
/** The three CJK characters of a Chinese name, each three bytes in UTF-8. */
const WANG_XIAOMING = String.fromCharCode(0x738b, 0x5c0f, 0x660e);

const VCARD_PATH = "src/lib/contacts/vcard.ts";
const KB64 = 64 * 1024;
const MEGA = 1024 * 1024;

/** A source as the guards read it: comments stripped, CRLF normalised (core.autocrlf=true). */
const tidy = (raw: string): string => decomment(raw).split(CRLF).join(LF);
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const message = (e: unknown): string => (e instanceof Error ? e.message : String(e));
/** Lines, each followed by `eol` (CRLF by default). */
const lines = (rows: readonly string[], eol: string = CRLF): string => rows.map((l) => l + eol).join("");
const chunked = (text: string, size: number): string[] => {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
};
/** A detail with every control and format character spelled out, so a failure never prints one raw. */
const visible = (x: unknown): string =>
  Array.from(typeof x === "string" ? x : String(JSON.stringify(x)))
    .map((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      return c < 32 || c === 127 || (c >= 0x2000 && c <= 0x206f) || c === 0xfeff ? `<U+${c.toString(16).toUpperCase()}>` : ch;
    })
    .join("");
/** A run of seven or more digits once the characters a phone number is written with are taken out (§5.14). */
const longDigitRun = (s: string): boolean => /\d{7,}/.test(s.replace(/[\s+().-]/g, ""));
const countOf = (re: RegExp, s: string): number => (s.match(re) ?? []).length;

/** The grid's columns, in the fixed order every vCard row is written in (A1.2). */
const COLUMNS: readonly ContactFieldSpec[] = fileColumns();
const LABELS = COLUMNS.map((f) => f.label);
const col = (key: ImportFieldKey): number => COLUMNS.findIndex((f) => f.key === key);

/* ══ THE BUNDLE UNDER TEST ══════════════════════════════════════════════════════════════════════ */

type FileOf = ReturnType<VcardReader["end"]>;
type Read = { readonly file: FileOf; readonly stats: VcardStats };
type Source = { readonly path: string; readonly text: string };

export type VcardImpl = {
  readonly createReader: (options?: VcardReaderOptions) => VcardReader;
  readonly parse: (text: string, options?: VcardReaderOptions) => FileOf;
  readonly looksLikeVcard: (head: string) => boolean;
  readonly assertCounts: (counts: VcardCounts) => void;
  readonly describeCounts: (counts: VcardCounts) => string;
  /** vcard.ts as the guards read it. */
  readonly source: string;
  /** Every src file whose raw text names BEGIN:VCARD at all, decommented — §V11b's population. */
  readonly sniffTree: readonly Source[];
  /** How many src files `srcFiles()` walked to find them. */
  readonly srcScanned: number;
};

/** Mentions the token at all — the cheap filter before a file is decommented and scanned. */
const NAMES_VCARD = /begin:vcard/i;

let cached: VcardImpl | null = null;

/** The SHIPPED bundle: the module's own reader and functions, and the real sources. Built once. */
function real(): VcardImpl {
  if (cached) return cached;
  const paths = srcFiles();
  const sniffTree: Source[] = [];
  for (const path of paths) {
    const raw = readFileSync(join(REPO_ROOT, path), "utf8");
    if (NAMES_VCARD.test(raw)) sniffTree.push({ path, text: tidy(raw) });
  }
  cached = {
    createReader: createVcardReader,
    parse: parseVcardText,
    looksLikeVcard,
    assertCounts: assertVcardCounts,
    describeCounts: describeVcardCounts,
    source: tidy(readFileSync(join(REPO_ROOT, VCARD_PATH), "utf8")),
    sniffTree,
    srcScanned: paths.length,
  };
  return cached;
}

/** Feeds `chunks` to a fresh reader from the bundle, ends it, and returns the file with its counts. */
function readChunks(impl: VcardImpl, chunks: readonly string[], fileName: string | null = null): Read {
  const reader = impl.createReader({ fileName });
  for (const chunk of chunks) reader.push(chunk);
  const file = reader.end();
  return { file, stats: reader.stats() };
}
const readText = (impl: VcardImpl, text: string, fileName: string | null = null): Read => readChunks(impl, [text], fileName);
const cellAt = (r: Read, row: number, key: ImportFieldKey): string | undefined => r.file.rows[row]?.cells[col(key)];
const rowLines = (r: Read): number[] => r.file.rows.map((x) => x.line);
const unreadLines = (r: Read): number[] => r.file.unreadable.map((x) => x.line);
const brief = (r: Read): string =>
  `rows on lines ${rowLines(r).join(",") || "none"} · unreadable ${unreadLines(r).join(",") || "none"} · ${r.stats.cards} card(s)`;

/* ══ THE FIXTURES — built here, in code ═════════════════════════════════════════════════════════ */

/** V1a — 2.1: a quoted-printable FN whose soft break continues with a SPACE (RFC 2045 forbids only trailing spaces). */
const QP_SPACE = lines([
  "BEGIN:VCARD",
  "VERSION:2.1",
  "FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Mama=",
  " Asha Mwakalinga",
  "TEL;CELL:0712345611",
  "END:VCARD",
]);

/** V1b — two iPhone-shaped 3.0 cards: the TEL first, a folded base64 PHOTO last, its final line ending `==`. */
const PHOTO_LINES: readonly string[] = [
  "PHOTO;ENCODING=b;TYPE=JPEG:/9j/4AAQSkZJRgABAQAAAQABAAD",
  " /2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwg",
  " JC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA==",
];
const iphoneCard = (name: string, tel: string): string[] => [
  "BEGIN:VCARD",
  "VERSION:3.0",
  `N:;${name};;;`,
  `FN:${name}`,
  `TEL;type=CELL;type=VOICE;type=pref:${tel}`,
  ...PHOTO_LINES,
  "END:VCARD",
];
const PHOTO_EQ = lines([...iphoneCard("Baraka", "0712345612"), ...iphoneCard("Neema", "0754345613")]);

/** V1c — 3.0: a plain NOTE ending in `=` (no encoding), then the TEL. */
const NOTE_EQ = lines(["BEGIN:VCARD", "VERSION:3.0", "FN:Zawadi Ally", "NOTE:Lipa=", "TEL;TYPE=CELL:0712345614", "END:VCARD"]);

/** V1d — 2.1: a quoted-printable UTF-8 name whose soft break falls after the first of its three characters. */
const QP_UTF8 = lines([
  "BEGIN:VCARD",
  "VERSION:2.1",
  "FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=E7=8E=8B=",
  "=E5=B0=8F=E6=98=8E",
  "TEL;CELL:0712345615",
  "END:VCARD",
]);

/** V1e — 2.1: a quoted-printable NOTE whose last line ends with a stray `=`, directly before END:VCARD. */
const QP_TRAILING = lines([
  "BEGIN:VCARD",
  "VERSION:2.1",
  "FN:Hamisi Juma",
  "TEL;CELL:0712345616",
  "NOTE;ENCODING=QUOTED-PRINTABLE:Lipa kwa M-Pesa=",
  "END:VCARD",
  "BEGIN:VCARD",
  "VERSION:2.1",
  "FN:Rehema Ally",
  "TEL;CELL:0754345617",
  "END:VCARD",
]);

/** V1f — one fold in a 3.0 card and one in a 2.1 card. */
const FOLD_30 = lines(["BEGIN:VCARD", "VERSION:3.0", "FN:Mwaka", " linga", "TEL;TYPE=CELL:0712345618", "END:VCARD"]);
const FOLD_21 = lines(["BEGIN:VCARD", "VERSION:2.1", "FN:Asha", "NOTE:Mwaka", " linga", "TEL;CELL:0712345619", "END:VCARD"]);

/** V2 — Apple's `item1.` groups with their labels, and a WhatsApp share's `waid`. */
const GROUPS = lines([
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:Asha Mwakalinga",
  "item1.TEL;type=pref:+255 712 345 621",
  "item1.X-ABLabel:_$!<Mobile>!$_",
  "item2.EMAIL;type=INTERNET:asha@example.com",
  "item2.X-ABLabel:_$!<Home>!$_",
  "END:VCARD",
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:Juma Bakari",
  "item1.TEL;waid=255754345622:+255 754 345 622",
  "item1.X-ABLabel:Mobile",
  "END:VCARD",
]);

/** V3 — bare 2.1 parameters: a bare PREF on the second TEL, and a bare QUOTED-PRINTABLE. */
const BARE_PREF = lines(["BEGIN:VCARD", "VERSION:2.1", "N:Juma;Bakari", "TEL;CELL:0754111222", "TEL;CELL;PREF:0712345678", "END:VCARD"]);
const BARE_QP = lines([
  "BEGIN:VCARD",
  "VERSION:2.1",
  "FN;CHARSET=UTF-8;QUOTED-PRINTABLE:Asha=20Mwakalinga",
  "TEL;CELL:0712345631",
  "END:VCARD",
]);

/** V4 — 4.0 `tel:` URIs: with URI parameters, foreign, and plain (the control). */
const URI_EXT_RAW = "tel:+255-712-345-641;ext=101";
const URI_FOREIGN_RAW = "tel:+254712345642";
const URI_PLAIN_RAW = "tel:+255712345643";
const URI_EXT = lines(["BEGIN:VCARD", "VERSION:4.0", "FN:Asha Mwakalinga", `TEL;VALUE=uri;PREF=1;TYPE="voice,cell":${URI_EXT_RAW}`, "END:VCARD"]);
const URI_FOREIGN = lines(["BEGIN:VCARD", "VERSION:4.0", "FN:Wanjiru Kamau", `TEL;VALUE=uri:${URI_FOREIGN_RAW}`, "END:VCARD"]);
const URI_PLAIN = lines(["BEGIN:VCARD", "VERSION:4.0", "FN:Neema Mushi", `TEL;VALUE=uri:${URI_PLAIN_RAW}`, "END:VCARD"]);

/** V5 — preference: 4.0 PREF=n, a 3.0 `pref` TYPE, a preferred landline beside a mobile, and landlines only. */
const LANDLINE = "+255 22 212 3456";
const PREF_40 = lines([
  "BEGIN:VCARD",
  "VERSION:4.0",
  "FN:Neema Mushi",
  "TEL;TYPE=cell;PREF=2:+255 754 100 651",
  "TEL;TYPE=cell;PREF=1:+255 712 100 652",
  "END:VCARD",
]);
const PREF_30 = lines([
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:Baraka Juma",
  "TEL;type=CELL:0754100653",
  "TEL;type=CELL;type=VOICE;type=pref:0712100654",
  "END:VCARD",
]);
const LANDLINE_FIRST = lines([
  "BEGIN:VCARD",
  "VERSION:4.0",
  "FN:Kampuni ya Bakari",
  `TEL;TYPE=work;PREF=1:${LANDLINE}`,
  "TEL;TYPE=cell:0712100655",
  "END:VCARD",
]);
const LANDLINES_ONLY = lines([
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:Ofisi ya Kariakoo",
  "TEL;TYPE=WORK:+255 22 211 0001",
  `TEL;TYPE=WORK;TYPE=PREF:${LANDLINE}`,
  "END:VCARD",
]);

/**
 * V6 — THE 12-CARD FIXTURE: 2.1, 3.0 and 4.0 mixed. Card 4 has only an EMAIL, card 9 only an ADR, and card 12 is
 * cut off by the end of the file — so 12 cards, 9 rows.
 */
const TWELVE_LINES: readonly string[] = [
  // 1 · 3.0 — FN beside N
  "BEGIN:VCARD", "VERSION:3.0", "FN:Asha Mwakalinga", "N:Mwakalinga;Asha;;;", "TEL;TYPE=CELL:0712 345 601",
  "EMAIL;TYPE=INTERNET:asha@example.com", "CATEGORIES:familia,VIP", "END:VCARD",
  // 2 · 2.1 — a quoted-printable N, and a bare PREF on the second TEL
  "BEGIN:VCARD", "VERSION:2.1", "N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Juma;Bakari=20Ali;;;", "TEL;CELL:0754100602",
  "TEL;CELL;PREF:0688100602", "END:VCARD",
  // 3 · 4.0 — a tel: URI
  "BEGIN:VCARD", "VERSION:4.0", "FN:Neema Mushi", 'TEL;VALUE=uri;TYPE="voice,cell":tel:+255-754-100-603', "END:VCARD",
  // 4 · no TEL — an EMAIL only
  "BEGIN:VCARD", "VERSION:3.0", "FN:Halima Said", "EMAIL:halima@example.com", "END:VCARD",
  // 5 · 3.0 — Apple's groups
  "BEGIN:VCARD", "VERSION:3.0", "FN:Rehema Kileo", "item1.TEL;type=pref:+255 678 100 605", "item1.X-ABLabel:_$!<Mobile>!$_",
  "END:VCARD",
  // 6 · 2.1 — a preferred work landline, then the mobile
  "BEGIN:VCARD", "VERSION:2.1", "N:Mollel;Daudi", `TEL;WORK;PREF:${LANDLINE}`, "TEL;CELL:0622 100 606", "END:VCARD",
  // 7 · 3.0 — an ORG and no name
  "BEGIN:VCARD", "VERSION:3.0", "ORG:Kariakoo Traders;Mauzo", "TEL:0773100607", "END:VCARD",
  // 8 · 4.0 — an N and no FN
  "BEGIN:VCARD", "VERSION:4.0", "N:Kimaro;Grace;;;", "TEL;TYPE=cell:0655100608", "END:VCARD",
  // 9 · no TEL — an ADR only
  "BEGIN:VCARD", "VERSION:3.0", "FN:Ofisi ya Posta", "ADR;TYPE=WORK:;;Mtaa wa Samora;Dar es Salaam;;;Tanzania", "END:VCARD",
  // 10 · 3.0 — an iPhone PHOTO ending == right before END:VCARD
  "BEGIN:VCARD", "VERSION:3.0", "FN:Juma Hamisi", "TEL;TYPE=CELL:0712100610", ...PHOTO_LINES, "END:VCARD",
  // 11 · 2.1 — a quoted-printable NOTE whose soft break continues with a space
  "BEGIN:VCARD", "VERSION:2.1", "FN:Mama Asha", "TEL;CELL:0754100611", "NOTE;ENCODING=QUOTED-PRINTABLE:Lipa kwa=", " M-Pesa tu",
  "END:VCARD",
  // 12 · 3.0 — cut off: the file ends before its END:VCARD
  "BEGIN:VCARD", "VERSION:3.0", "FN:Saida Omari", "TEL;TYPE=CELL:0712100612",
];
const TWELVE = lines(TWELVE_LINES, CRLF);
const TWELVE_LF = lines(TWELVE_LINES, LF);
const TWELVE_CR = lines(TWELVE_LINES, CR);
const TWELVE_FILE_NAME = "kadi.vcf";
const TWELVE_SENTENCE = "12 cards, 9 rows — 2 cards have no phone number; 1 card is cut off before its end.";
const TWELVE_ROW_LINES = [1, 2, 3, 5, 6, 7, 8, 10, 11];
/** Every row's cells, LITERAL, in `fileColumns()` order (Phone, Name, Email, Tags, Notes — §V10b holds the order). */
const TWELVE_CELLS: readonly (readonly string[])[] = [
  ["0712 345 601", "Asha Mwakalinga", "asha@example.com", "familia,VIP", ""],
  ["0688100602", "Bakari Ali Juma", "", "", ""],
  ["+255-754-100-603", "Neema Mushi", "", "", ""],
  ["+255 678 100 605", "Rehema Kileo", "", "", ""],
  ["0622 100 606", "Daudi Mollel", "", "", ""],
  ["0773100607", "Kariakoo Traders", "", "", ""],
  ["0655100608", "Grace Kimaro", "", "", ""],
  ["0712100610", "Juma Hamisi", "", "", ""],
  ["0754100611", "Mama Asha", "", "", "Lipa kwa M-Pesa tu"],
];
const FILE_KEYS = ["format", "fileName", "rows", "width", "blankRows", "notes", "unreadable"];

/** V6e — four cards, the second missing its END:VCARD. */
const MISSING_END = lines([
  "BEGIN:VCARD", "VERSION:3.0", "FN:Kadi Moja", "TEL:0712345661", "END:VCARD",
  "BEGIN:VCARD", "VERSION:3.0", "FN:Kadi Mbili", "TEL:0712345662",
  "BEGIN:VCARD", "VERSION:3.0", "FN:Kadi Tatu", "TEL:0712345663", "END:VCARD",
  "BEGIN:VCARD", "VERSION:3.0", "FN:Kadi Nne", "TEL:0712345664", "END:VCARD",
]);

/** V6f — 2.1: an AGENT whose own card (with its own TEL) is nested inside card 1. */
const AGENT_CARD = lines([
  "BEGIN:VCARD", "VERSION:2.1", "N:Mwakalinga;Asha", "TEL;CELL:0712345671", "AGENT:",
  "BEGIN:VCARD", "VERSION:2.1", "N:Msaidizi;Juma", "TEL;CELL:0754345672", "END:VCARD",
  "END:VCARD",
]);

/** V7b — a 3.0 fold right after a CRLF that the chunking splits between its CR and its LF. */
const CR_SPLIT_HEAD = `BEGIN:VCARD${CRLF}VERSION:3.0${CRLF}FN:Mwaka${CR}`;
const CR_SPLIT_TAIL =
  `${LF} linga${CRLF}TEL;TYPE=CELL:0712345681${CRLF}END:VCARD${CRLF}` +
  `BEGIN:VCARD${CRLF}VERSION:3.0${CRLF}FN:Pili${CRLF}TEL:0712345682${CRLF}END:VCARD${CRLF}`;

/** V7c — a line that is BEGIN:VCARD or END:VCARD, the way the 12-card fixture writes them. */
const BEGIN_AT_LINE = /(?:^|[\r\n])BEGIN:VCARD(?=[\r\n]|$)/g;
const END_AT_LINE = /(?:^|[\r\n])END:VCARD(?=[\r\n]|$)/g;

/** V8a — the corpus: card i is "Mteja i" on 0712 + i, every card exactly 79 characters long. */
const LARGE = 20_000;
const SMALL = 40;
const pad = (n: number, width: number): string => String(n).padStart(width, "0");
const corpusPhone = (i: number): string => `0712${pad(i, 6)}`;
const corpusName = (i: number): string => `Mteja ${pad(i, 5)}`;
const corpusCache = new Map<number, string>();
const corpus = (n: number): string => {
  let text = corpusCache.get(n);
  if (text === undefined) {
    const cards: string[] = [];
    for (let i = 1; i <= n; i++) {
      cards.push(lines(["BEGIN:VCARD", "VERSION:3.0", `FN:${corpusName(i)}`, `TEL;TYPE=CELL:${corpusPhone(i)}`, "END:VCARD"]));
    }
    text = cards.join("");
    corpusCache.set(n, text);
  }
  return text;
};

/** V8b/V8c — a 1 MB value, folded into 75-character lines, on one physical line, and as a NOTE. */
const bigCache = new Map<string, string>();
const big = (kind: "folded" | "line" | "note"): string => {
  const hit = bigCache.get(kind);
  if (hit !== undefined) return hit;
  let text: string;
  if (kind === "folded") {
    const out = ["BEGIN:VCARD", "VERSION:3.0", "FN:Picha Kubwa", `PHOTO;ENCODING=b;TYPE=JPEG:${"A".repeat(48)}`];
    for (let left = MEGA - 48; left > 0; left -= 74) out.push(` ${"A".repeat(Math.min(74, left))}`);
    out.push("TEL;TYPE=CELL:0712345691", "END:VCARD");
    text = lines(out);
  } else if (kind === "line") {
    text = lines(["BEGIN:VCARD", "VERSION:4.0", "FN:Picha Kubwa", `PHOTO:data:image/jpeg;base64,${"A".repeat(MEGA)}`, "TEL;TYPE=cell:0712345692", "END:VCARD"]);
  } else {
    text = lines(["BEGIN:VCARD", "VERSION:4.0", "FN:Maelezo Marefu", `NOTE:${"A".repeat(MEGA)}`, "TEL;TYPE=cell:0712345693", "END:VCARD"]);
  }
  bigCache.set(kind, text);
  return text;
};

/** V9a — 3.0 text escapes (each backslash built from its code) and two CATEGORIES lines. */
const ESCAPED_NOTE_RAW = `Lipa kwa M-Pesa${BACKSLASH}, Tigo Pesa${BACKSLASH}; au benki.${BACKSLASH}nAsante ${BACKSLASH}${BACKSLASH} karibu`;
const ESCAPED_NOTE = `Lipa kwa M-Pesa, Tigo Pesa; au benki.${LF}Asante ${BACKSLASH} karibu`;
const ESCAPES = lines([
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:Asha Mwakalinga",
  "TEL:0712345694",
  `NOTE:${ESCAPED_NOTE_RAW}`,
  "CATEGORIES:friends,VIP",
  "CATEGORIES:Dar",
  "END:VCARD",
]);

/** V9b — FN beside N and ORG; N beside ORG (with prefix and additional names); ORG alone, with an escaped `;`. */
const NAMES = lines([
  "BEGIN:VCARD", "VERSION:3.0", "FN:Bi Asha", "N:Mwakalinga;Asha;;;", "ORG:Kariakoo Traders", "TEL:0712345695", "END:VCARD",
  "BEGIN:VCARD", "VERSION:3.0", "N:Mwakalinga;Asha;Neema;Bi;", "ORG:Kariakoo Traders", "TEL:0712345696", "END:VCARD",
  "BEGIN:VCARD", "VERSION:3.0", `ORG:Mama${BACKSLASH}; Shop;Mauzo`, "TEL:0712345697", "END:VCARD",
]);

/** V9c — 2.1 quoted-printable names in ISO-8859-1 and in an unknown charset. */
const CHARSETS = lines([
  "BEGIN:VCARD", "VERSION:2.1", "FN;CHARSET=ISO-8859-1;ENCODING=QUOTED-PRINTABLE:Jos=E9 Mwakalinga", "TEL;CELL:0712345698", "END:VCARD",
  "BEGIN:VCARD", "VERSION:2.1", "FN;CHARSET=x-bogus;ENCODING=QUOTED-PRINTABLE:Asha=20Juma", "TEL;CELL:0712345699", "END:VCARD",
]);

/** V9d — lower-case property names, and a 3.0 fold, under every line ending. */
const LOWER_LINES: readonly string[] = [
  "begin:vcard", "version:3.0", "fn:Asha Mwakalinga", "tel;type=cell:0712345701", "end:vcard",
  "BEGIN:VCARD", "VERSION:3.0", "FN:Juma", "  Bakari", "TEL:0754345702", "END:VCARD",
];

/* ══ THE SCANNERS (§V11) — the same functions run over the real tree and over every plant ══════════ */

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
const PERMITTED_IMPORTS = ["../tz-msisdn", "./contact-fields"];
const DIRECTIVE = /^\s*["']use (?:client|server)["']/;
const SERVER_ONLY = /["']server-only["']/;
const NODE_BUILTIN = /["']node:/;
const CONSOLE = /\bconsole\s*\./;
const LOWER_INCLUDES = /\.toLowerCase\(\)\s*\.includes\(/;

/**
 * §V11b's sniff shapes: BEGIN:VCARD inside a regex literal, handed to a string method, compared with `===`, or a
 * `case` label. ⚠️ A writer holding the token as an array element (sample-sheet.ts writes BEGIN:VCARD lines) is NOT
 * a sniff — §V11c holds both answers.
 */
const SNIFF_FORMS: readonly RegExp[] = [
  /\/[^\/\n]*begin:vcard[^\/\n]*\/[dgimsuyv]*/i,
  /\.(?:startsWith|endsWith|includes|indexOf|lastIndexOf|match|search|test)\s*\(\s*["'`][^"'`\n]*begin:vcard/i,
  /[=!]==?\s*["'`]\s*begin:vcard|begin:vcard\s*["'`]\s*[=!]==?/i,
  /\bcase\s+["'`]\s*begin:vcard/i,
];
function sniffers(files: readonly Source[]): string[] {
  const out: string[] = [];
  for (const f of files) {
    // ⛔ Exempt by EXACT path: the reader owns the one sniff (C17).
    if (f.path === VCARD_PATH) continue;
    if (SNIFF_FORMS.some((form) => form.test(f.text))) out.push(f.path);
  }
  return out;
}

/* ══ THE ASSERTION LABELS — one place, so a plant names exactly the line it must turn red ═══════════ */

export const L = {
  V1a: "V1a · ⭐ ONE WALK — a 2.1 quoted-printable soft break whose next line starts with a space keeps that space: 'Mama=' then ' Asha Mwakalinga' reads 'Mama Asha Mwakalinga' (unfold-first reads 'Mama=Asha')",
  V1b: "V1b · ⭐ ONE WALK — an iPhone-shaped 3.0 PHOTO whose last folded line ends '==' right before END:VCARD swallows nothing: 2 cards, 2 rows (QP-first loses both)",
  V1c: "V1c · ⭐ ONE WALK — a plain 3.0 'NOTE:Lipa=' is no soft break: the TEL on the next line is the card's phone",
  V1d: "V1d · a quoted-printable UTF-8 name split across a soft break mid-character decodes whole",
  V1e: "V1e · a stray '=' ending a quoted-printable NOTE's last line does not swallow END:VCARD — the card closes as a row",
  V1f: "V1f · ⚠️ the fold is version-aware: 3.0 'FN:Mwaka' + ' linga' is 'Mwakalinga', 2.1 'NOTE:Mwaka' + ' linga' is 'Mwaka linga'",
  V2: "V2 · Apple, Google and WhatsApp 'itemN.' group prefixes are stripped: item1.TEL and item2.EMAIL are read",
  V3a: "V3a · bare 2.1 parameters are read: TEL;CELL;PREF outranks the TEL;CELL written before it",
  V3b: "V3b · a bare 2.1 QUOTED-PRINTABLE token is the encoding: 'Asha=20Mwakalinga' reads 'Asha Mwakalinga'",
  V4a: "V4a · a 4.0 tel: URI loses its scheme and is cut at its first ';' — the ';ext=101' number reads ok, not too long",
  V4b: "V4b · a 4.0 'tel:+254' URI is seen as foreign, never too long — the scheme is stripped before the '+' is looked for",
  V4c: "V4c · CONTROL — a plain 'tel:+255' URI parses ok kept whole or not, while the ';ext=' and '+254' URIs kept whole do not — why V4a and V4b use them",
  V5a: "V5a · 4.0 PREF=1 beats a PREF=2 written first",
  V5b: "V5b · a 3.0 'pref' TYPE on the second TEL wins",
  V5c: "V5c · ⚠️ a preferred work landline yields to the card's mobile — the row's phone is the first SENDABLE number",
  V5d: "V5d · a card whose every number is unsendable is still a row, with its most preferred number, so U30 can say why",
  V6a: "V6a · ⭐ COUNTS — the 12-card fixture is 12 cards, 9 rows, 2 with no phone and 1 cut off, and describeVcardCounts says exactly the plan's sentence (singulars and thousands too)",
  V6b: "V6b · ⭐ each row's line is its card's ordinal, the skipped cards' ordinals are in `unreadable` with their reasons, ONE summary note, and the file is a valid ParsedContactsFile",
  V6c: "V6c · ⛔ A1.2 — NO header row: rows[0] is card 1 on line 1 with its own cells, no row holds the column labels, and autoMapFile('vcard') drafts card 1 first",
  V6d: "V6d · assertVcardCounts THROWS when cards differ from rows + unreadable (counts only in its message) and holds on every fixture's counts",
  V6e: "V6e · a missing END mid-file cuts off only its own card: 4 cards, rows for 1, 3 and 4, card 2 cut off",
  V6f: "V6f · a 2.1 AGENT's own card is nested, never counted, and never lends its TEL to the outer card",
  V7a: "V7a · ⭐ STREAMING — every split point of every sweep fixture, and 1-character chunks, read exactly as the whole text, and parseVcardText is that one reader",
  V7b: "V7b · a CR|LF pair split across two chunks is ONE line end — the 3.0 fold right after it still joins",
  V7c: "V7c · every prefix of the 12-card fixture reads through end() without throwing, as a valid file whose cards = rows + unreadable, each card begun and not ended cut off",
  V8a: "V8a · ⭐ one path at both ends: 40 cards in one push give 40 rows, 20,000 cards in 64 KB chunks give 20,000 rows equal to the cards written, and the NDC table is still built once",
  V8b: "V8b · ⭐ a 1 MB PHOTO is never held — folded or on one line, in 64 KB chunks, its card's TEL is read and the longest value held is under 4,096 characters",
  V8c: "V8c · CONTROL — the same 1 MB as a NOTE is held only up to MAX_KEPT_LINE and counted as truncated, so V8b's measure is no constant",
  V9a: "V9a · text escapes are undone (comma, semicolon, backslash, newline) and every CATEGORIES line joins one tags cell — the fixture really holds backslashes",
  V9b: "V9b · ⭐ C20 — the name is FN, else N's given + family, else ORG's first component",
  V9c: "V9c · a CHARSET is honoured (ISO-8859-1 'Jos=E9' is José) and an unknown one falls back to UTF-8, counted once",
  V9d: "V9d · CRLF, LF-only, CR-only and a leading BOM read identically, and lower-case property names are read",
  V10a: "V10a · ⛔ §5.14 / A1.8 — no unreadable reason holds a digit, and no note, sentence or assertion message holds a run of 7+ digits",
  V10b: "V10b · every row is its card's values in fileColumns() order — literal cells for all nine rows — with nothing invented beside them",
  V11a: "V11a · ⛔ PURITY (C20) — vcard.ts imports exactly ../tz-msisdn and ./contact-fields: no directive, no server-only, no node:, no console, no .toLowerCase().includes(",
  V11b: "V11b · ⛔ ONE SNIFF (C17) — no src file but vcard.ts tests text against BEGIN:VCARD",
  V11c: "V11c · CONTROL — the sniff scanner reports a planted sniff and passes a writer's BEGIN:VCARD lines",
  V12: "V12 · looksLikeVcard: vCards behind a BOM and blank lines, or in lower case, are vCards; a CSV header, a quoted 'BEGIN:VCARD' cell, a cut head and an empty one are not",
  V13: "V13 · U28's sample vCard reads as 3 rows on lines 1–3 — card 1 survives — and drafts exactly as the sample rows themselves",
} as const;

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════ */

async function run(ctx: SectionContext<VcardImpl>): Promise<void> {
  const { impl, ok, log } = ctx;
  const reads: Read[] = [];
  const read = (text: string, fileName: string | null = null): Read => {
    const r = readText(impl, text, fileName);
    reads.push(r);
    return r;
  };

  // ── V1 · ONE WALK ──────────────────────────────────────────────────────────────────────────────
  const qpSpace = read(QP_SPACE);
  ok(L.V1a, qpSpace.file.rows.length === 1 && cellAt(qpSpace, 0, "name") === "Mama Asha Mwakalinga",
    `name ${visible(cellAt(qpSpace, 0, "name"))} · ${brief(qpSpace)}`);
  const photoEq = read(PHOTO_EQ);
  ok(L.V1b, same(rowLines(photoEq), [1, 2]) && photoEq.file.unreadable.length === 0
    && cellAt(photoEq, 0, "phone") === "0712345612" && cellAt(photoEq, 1, "phone") === "0754345613", brief(photoEq));
  const noteEq = read(NOTE_EQ);
  ok(L.V1c, noteEq.file.rows.length === 1 && cellAt(noteEq, 0, "phone") === "0712345614" && cellAt(noteEq, 0, "notes") === "Lipa=",
    `phone ${visible(cellAt(noteEq, 0, "phone"))} · ${brief(noteEq)}`);
  const qpUtf8 = read(QP_UTF8);
  ok(L.V1d, qpUtf8.file.rows.length === 1 && cellAt(qpUtf8, 0, "name") === WANG_XIAOMING, `name ${visible(cellAt(qpUtf8, 0, "name"))}`);
  const qpTrailing = read(QP_TRAILING);
  ok(L.V1e, same(rowLines(qpTrailing), [1, 2]) && qpTrailing.file.unreadable.length === 0
    && cellAt(qpTrailing, 0, "notes") === "Lipa kwa M-Pesa", `${brief(qpTrailing)} · note ${visible(cellAt(qpTrailing, 0, "notes"))}`);
  const fold30 = read(FOLD_30);
  const fold21 = read(FOLD_21);
  ok(L.V1f, cellAt(fold30, 0, "name") === "Mwakalinga" && cellAt(fold21, 0, "notes") === "Mwaka linga",
    `3.0 name ${visible(cellAt(fold30, 0, "name"))} · 2.1 note ${visible(cellAt(fold21, 0, "notes"))}`);

  // ── V2 · GROUPS · V3 · BARE 2.1 PARAMETERS ─────────────────────────────────────────────────────
  const groups = read(GROUPS);
  ok(L.V2, groups.file.rows.length === 2 && cellAt(groups, 0, "phone") === "+255 712 345 621"
    && cellAt(groups, 0, "email") === "asha@example.com" && cellAt(groups, 1, "phone") === "+255 754 345 622", brief(groups));
  const barePref = read(BARE_PREF);
  ok(L.V3a, barePref.file.rows.length === 1 && cellAt(barePref, 0, "phone") === "0712345678",
    `phone ${visible(cellAt(barePref, 0, "phone"))}`);
  const bareQp = read(BARE_QP);
  ok(L.V3b, cellAt(bareQp, 0, "name") === "Asha Mwakalinga", `name ${visible(cellAt(bareQp, 0, "name"))}`);

  // ── V4 · tel: URIs ─────────────────────────────────────────────────────────────────────────────
  const uriExt = read(URI_EXT);
  const extPhone = cellAt(uriExt, 0, "phone") ?? "";
  ok(L.V4a, extPhone === "+255-712-345-641" && parseTzNumber(extPhone).verdict === "ok",
    `phone ${visible(extPhone)} → ${parseTzNumber(extPhone).verdict}`);
  const uriForeign = read(URI_FOREIGN);
  const foreignPhone = cellAt(uriForeign, 0, "phone") ?? "";
  ok(L.V4b, foreignPhone === "+254712345642" && parseTzNumber(foreignPhone).verdict === "foreign",
    `phone ${visible(foreignPhone)} → ${parseTzNumber(foreignPhone).verdict}`);
  const uriPlain = read(URI_PLAIN);
  const plainPhone = cellAt(uriPlain, 0, "phone") ?? "";
  ok(L.V4c, parseTzNumber(plainPhone).verdict === "ok" && parseTzNumber(URI_PLAIN_RAW).verdict === "ok"
    && parseTzNumber(URI_EXT_RAW).verdict === "too_long" && parseTzNumber(URI_FOREIGN_RAW).verdict === "too_long",
    `plain read ${parseTzNumber(plainPhone).verdict}, plain whole ${parseTzNumber(URI_PLAIN_RAW).verdict} · ext whole ${parseTzNumber(URI_EXT_RAW).verdict} · +254 whole ${parseTzNumber(URI_FOREIGN_RAW).verdict}`);

  // ── V5 · PREFERENCE, THEN SENDABLE ─────────────────────────────────────────────────────────────
  const pref40 = read(PREF_40);
  ok(L.V5a, cellAt(pref40, 0, "phone") === "+255 712 100 652", `phone ${visible(cellAt(pref40, 0, "phone"))}`);
  const pref30 = read(PREF_30);
  ok(L.V5b, cellAt(pref30, 0, "phone") === "0712100654", `phone ${visible(cellAt(pref30, 0, "phone"))}`);
  const landlineFirst = read(LANDLINE_FIRST);
  ok(L.V5c, cellAt(landlineFirst, 0, "phone") === "0712100655" && parseTzNumber(LANDLINE).verdict === "landline",
    `phone ${visible(cellAt(landlineFirst, 0, "phone"))} · the preferred number reads ${parseTzNumber(LANDLINE).verdict}`);
  const landlinesOnly = read(LANDLINES_ONLY);
  ok(L.V5d, landlinesOnly.file.rows.length === 1 && landlinesOnly.file.unreadable.length === 0 && cellAt(landlinesOnly, 0, "phone") === LANDLINE,
    `${brief(landlinesOnly)} · phone ${visible(cellAt(landlinesOnly, 0, "phone"))}`);

  // ── V6 · CARDS COUNTED APART FROM ROWS, AND C15'S SHAPE ────────────────────────────────────────
  const twelve = read(TWELVE, TWELVE_FILE_NAME);
  const st = twelve.stats;
  const sentence = impl.describeCounts(st);
  ok(L.V6a, st.cards === 12 && st.rows === 9 && st.noPhone === 2 && st.cutOff === 1 && sentence === TWELVE_SENTENCE
    && impl.describeCounts({ cards: 1, rows: 1, noPhone: 0, cutOff: 0 }) === "1 card, 1 row."
    && impl.describeCounts({ cards: 20000, rows: 19998, noPhone: 1, cutOff: 1 })
      === "20,000 cards, 19,998 rows — 1 card has no phone number; 1 card is cut off before its end."
    && impl.describeCounts({ cards: 3, rows: 0, noPhone: 0, cutOff: 3 }) === "3 cards, 0 rows — 3 cards are cut off before their end.",
    `${st.cards} cards, ${st.rows} rows, ${st.noPhone} with no phone, ${st.cutOff} cut off · "${sentence}"`);
  ok(L.V6b, same(rowLines(twelve), TWELVE_ROW_LINES)
    && same(twelve.file.unreadable, [
      { line: 4, reason: VCARD_NO_PHONE },
      { line: 9, reason: VCARD_NO_PHONE },
      { line: 12, reason: VCARD_CUT_OFF },
    ])
    && same(twelve.file.notes, [TWELVE_SENTENCE]) && isParsedContactsFile(twelve.file)
    && twelve.file.format === "vcard" && twelve.file.fileName === TWELVE_FILE_NAME && twelve.file.blankRows === 0
    && twelve.file.width === COLUMNS.length,
    `${brief(twelve)} · notes ${visible(twelve.file.notes)} · valid ${isParsedContactsFile(twelve.file)}`);
  const firstRow = twelve.file.rows[0];
  const asCards = firstRow === undefined ? null : autoMapFile("vcard", firstRow.cells);
  const firstDraft = firstRow === undefined || asCards === null ? null : draftContactRow(firstRow.cells, asCards.mapping);
  ok(L.V6c, firstRow !== undefined && firstRow.line === 1 && same(firstRow.cells, TWELVE_CELLS[0])
    && !twelve.file.rows.some((r) => same(r.cells, LABELS))
    && asCards !== null && asCards.headerRows === 0
    && firstDraft !== null && firstDraft.rawPhone === "0712 345 601" && firstDraft.displayName === "Asha Mwakalinga",
    `rows[0] ${visible(firstRow)} · headerRows ${asCards?.headerRows ?? "none"}`);

  const missingEnd = read(MISSING_END);
  ok(L.V6e, missingEnd.stats.cards === 4 && same(rowLines(missingEnd), [1, 3, 4])
    && same(missingEnd.file.unreadable, [{ line: 2, reason: VCARD_CUT_OFF }]), brief(missingEnd));
  const agent = read(AGENT_CARD);
  ok(L.V6f, agent.stats.cards === 1 && same(rowLines(agent), [1]) && agent.file.unreadable.length === 0
    && cellAt(agent, 0, "phone") === "0712345671", `${brief(agent)} · phone ${visible(cellAt(agent, 0, "phone"))}`);

  let threw = "";
  try {
    impl.assertCounts({ cards: 12, rows: 9, noPhone: 2, cutOff: 0 });
  } catch (e) {
    threw = message(e);
  }
  let heldOn = 0;
  let heldProblem = "";
  try {
    impl.assertCounts({ cards: 12, rows: 9, noPhone: 2, cutOff: 1 });
    for (const r of reads) {
      impl.assertCounts(r.stats);
      heldOn++;
    }
  } catch (e) {
    heldProblem = message(e);
  }
  ok(L.V6d, threw !== "" && !longDigitRun(threw) && heldProblem === "" && heldOn === reads.length,
    threw === "" ? "did NOT throw on 12 cards, 9 rows and 2 unreadable" : `threw "${threw}" · held on ${heldOn} fixture(s)${heldProblem ? ` — then threw "${heldProblem}"` : ""}`);

  // ── V7 · STREAMING ─────────────────────────────────────────────────────────────────────────────
  const SWEEP: ReadonlyArray<readonly [string, string]> = [
    ["the 12-card fixture (CRLF)", TWELVE],
    ["the 12-card fixture (LF)", TWELVE_LF],
    ["the 12-card fixture (CR)", TWELVE_CR],
    ["the soft break with a space", QP_SPACE],
    ["the split UTF-8 name", QP_UTF8],
    ["the 3.0 fold", FOLD_30],
    ["the 2.1 fold", FOLD_21],
    ["the iPhone PHOTO", PHOTO_EQ],
  ];
  const sweepMisses: string[] = [];
  let splits = 0;
  for (const [name, text] of SWEEP) {
    const whole = readText(impl, text);
    const wholeJson = JSON.stringify(whole);
    if (JSON.stringify(impl.parse(text)) !== JSON.stringify(whole.file)) sweepMisses.push(`${name}: parseVcardText differs from one push`);
    for (let k = 0; k <= text.length; k++) {
      splits++;
      if (JSON.stringify(readChunks(impl, [text.slice(0, k), text.slice(k)])) !== wholeJson) {
        sweepMisses.push(`${name}: split at ${k} of ${text.length}`);
        break;
      }
    }
    if (JSON.stringify(readChunks(impl, text.split(""))) !== wholeJson) sweepMisses.push(`${name}: 1-character chunks`);
  }
  ok(L.V7a, sweepMisses.length === 0, sweepMisses.slice(0, 4).join(" | ") || `${SWEEP.length} fixtures, ${splits} two-chunk splits and 1-character chunks, all equal`);

  const crSplit = readChunks(impl, [CR_SPLIT_HEAD, CR_SPLIT_TAIL]);
  const crWhole = readText(impl, CR_SPLIT_HEAD + CR_SPLIT_TAIL);
  ok(L.V7b, CR_SPLIT_HEAD.endsWith(CR) && CR_SPLIT_TAIL.startsWith(LF) && same(crSplit, crWhole)
    && crSplit.file.rows.length === 2 && cellAt(crSplit, 0, "name") === "Mwakalinga",
    `split: ${brief(crSplit)}, name ${visible(cellAt(crSplit, 0, "name"))} · whole: ${brief(crWhole)}`);

  const prefixMisses: string[] = [];
  for (let k = 0; k <= TWELVE.length && prefixMisses.length === 0; k++) {
    const prefix = TWELVE.slice(0, k);
    let r: Read | null = null;
    try {
      r = readText(impl, prefix);
    } catch (e) {
      prefixMisses.push(`the prefix of ${k} characters threw: ${message(e)}`);
    }
    if (r === null) break;
    const begun = countOf(BEGIN_AT_LINE, prefix);
    const ended = countOf(END_AT_LINE, prefix);
    const s = r.stats;
    const good = isParsedContactsFile(r.file)
      && s.cards === s.rows + s.noPhone + s.cutOff
      && r.file.rows.length === s.rows && r.file.unreadable.length === s.noPhone + s.cutOff
      && s.cards === begun && s.cutOff === begun - ended;
    if (!good) {
      prefixMisses.push(`the prefix of ${k} characters: ${s.cards} card(s) (begun ${begun}), ${s.rows} row(s), ` +
        `${r.file.unreadable.length} unreadable, ${s.cutOff} cut off (expected ${begun - ended}), valid ${isParsedContactsFile(r.file)}`);
    }
  }
  ok(L.V7c, prefixMisses.length === 0, prefixMisses[0] ?? `${TWELVE.length + 1} prefixes read`);

  // ── V8 · BOTH ENDS OF §3c, AND WHAT IS NEVER HELD ──────────────────────────────────────────────
  const small = readText(impl, corpus(SMALL));
  const largeChunks = chunked(corpus(LARGE), KB64);
  const large = readChunks(impl, largeChunks);
  let wrongRow = -1;
  for (let i = 0; i < LARGE; i++) {
    const row = large.file.rows[i];
    const want = COLUMNS.map((f) => (f.key === "phone" ? corpusPhone(i + 1) : f.key === "name" ? corpusName(i + 1) : ""));
    if (row === undefined || row.line !== i + 1 || !same(row.cells, want)) {
      wrongRow = i + 1;
      break;
    }
  }
  const builds = tzTableBuildCount();
  ok(L.V8a, small.file.rows.length === SMALL && small.stats.cards === SMALL
    && large.file.rows.length === LARGE && large.stats.cards === LARGE && large.file.unreadable.length === 0 && wrongRow < 0
    && builds === 1,
    `${SMALL} cards in one push: ${small.file.rows.length} rows · ${LARGE} cards in ${largeChunks.length} chunks: ${large.file.rows.length} rows, ` +
    `first wrong row ${wrongRow < 0 ? "none" : wrongRow} · NDC table built ${builds} time(s)`);

  const photoFolded = readChunks(impl, chunked(big("folded"), KB64));
  const photoLine = readChunks(impl, chunked(big("line"), KB64));
  const neverHeld = (r: Read, phone: string): boolean =>
    r.file.rows.length === 1 && cellAt(r, 0, "phone") === phone && r.stats.peakKeptChars < 4096 && r.stats.truncated === 0;
  ok(L.V8b, neverHeld(photoFolded, "0712345691") && neverHeld(photoLine, "0712345692"),
    `folded: phone ${visible(cellAt(photoFolded, 0, "phone"))}, longest held ${photoFolded.stats.peakKeptChars} · ` +
    `one line: phone ${visible(cellAt(photoLine, 0, "phone"))}, longest held ${photoLine.stats.peakKeptChars}`);
  const bigNote = readChunks(impl, chunked(big("note"), KB64));
  ok(L.V8c, bigNote.stats.truncated === 1 && bigNote.stats.peakKeptChars === MAX_KEPT_LINE && bigNote.file.rows.length === 1
    && cellAt(bigNote, 0, "phone") === "0712345693",
    `truncated ${bigNote.stats.truncated} · longest held ${bigNote.stats.peakKeptChars} of ${MAX_KEPT_LINE}`);

  // ── V9 · TEXT, NAMES, CHARSETS, LINE ENDINGS ───────────────────────────────────────────────────
  const escapes = read(ESCAPES);
  ok(L.V9a, ESCAPES.includes(BACKSLASH) && ESCAPES.includes(BACKSLASH + BACKSLASH) && !ESCAPED_NOTE_RAW.includes(LF)
    && cellAt(escapes, 0, "notes") === ESCAPED_NOTE && cellAt(escapes, 0, "tags") === "friends,VIP,Dar",
    `note ${visible(cellAt(escapes, 0, "notes"))} · tags ${visible(cellAt(escapes, 0, "tags"))}`);
  const names = read(NAMES);
  ok(L.V9b, same(names.file.rows.map((r) => r.cells[col("name")]), ["Bi Asha", "Asha Mwakalinga", "Mama; Shop"]),
    visible(names.file.rows.map((r) => r.cells[col("name")])));
  const charsets = read(CHARSETS);
  ok(L.V9c, cellAt(charsets, 0, "name") === `Jos${E_ACUTE} Mwakalinga` && cellAt(charsets, 1, "name") === "Asha Juma"
    && charsets.stats.decodeWarnings === 1,
    `names ${visible(charsets.file.rows.map((r) => r.cells[col("name")]))} · decode warnings ${charsets.stats.decodeWarnings}`);
  const endings = [lines(LOWER_LINES, CRLF), lines(LOWER_LINES, LF), lines(LOWER_LINES, CR), BOM + lines(LOWER_LINES, CRLF)].map((t) => read(t));
  const endingJson = endings.map((r) => JSON.stringify(r.file));
  ok(L.V9d, endingJson.every((j) => j === endingJson[0]) && endings[0].file.rows.length === 2
    && cellAt(endings[0], 0, "phone") === "0712345701" && cellAt(endings[0], 0, "name") === "Asha Mwakalinga"
    && cellAt(endings[0], 1, "name") === "Juma Bakari",
    `CRLF ${brief(endings[0])} · LF ${brief(endings[1])} · CR ${brief(endings[2])} · BOM ${brief(endings[3])}`);

  // ── V10 · WHAT A RESULT MAY SAY, AND WHAT A ROW HOLDS ──────────────────────────────────────────
  const reasons = reads.flatMap((r) => r.file.unreadable.map((u) => u.reason));
  const said = [...reads.flatMap((r) => r.file.notes), sentence, threw];
  const digitReasons = reasons.filter((x) => /\d/.test(x));
  const longRuns = said.filter(longDigitRun);
  ok(L.V10a, reasons.length >= 4 && digitReasons.length === 0 && longRuns.length === 0,
    `${reasons.length} reason(s), ${said.length} sentence(s) · with a digit: ${visible(digitReasons.slice(0, 2))} · with a long run: ${visible(longRuns.slice(0, 2))}`);
  ok(L.V10b, same(LABELS, ["Phone", "Name", "Email", "Tags", "Notes"]) && same(Object.keys(twelve.file), FILE_KEYS)
    && twelve.file.rows.every((r) => same(Object.keys(r), ["line", "cells"]) && r.cells.length === COLUMNS.length)
    && same(twelve.file.rows.map((r) => r.cells), TWELVE_CELLS),
    `keys ${Object.keys(twelve.file).join(",")} · cells ${visible(twelve.file.rows.map((r) => r.cells).slice(0, 2))}…`);

  // ── V11 · THE SOURCE: PURE, AND THE ONE SNIFF ──────────────────────────────────────────────────
  const specs = specifiers(impl.source);
  const impure: string[] = [];
  for (const s of specs) if (!PERMITTED_IMPORTS.includes(s)) impure.push(`imports ${s}`);
  for (const need of PERMITTED_IMPORTS) if (!specs.includes(need)) impure.push(`does not import ${need}`);
  if (DIRECTIVE.test(impl.source)) impure.push("carries a directive");
  if (SERVER_ONLY.test(impl.source)) impure.push("imports server-only");
  if (NODE_BUILTIN.test(impl.source)) impure.push("names a node: module");
  if (CONSOLE.test(impl.source)) impure.push("writes to the console");
  if (LOWER_INCLUDES.test(impl.source)) impure.push("hand-rolls a .toLowerCase().includes( search");
  ok(L.V11a, impure.length === 0, impure.join(" | ") || `imports ${specs.join(", ")}`);

  const offenders = sniffers(impl.sniffTree);
  const sawReader = impl.sniffTree.some((f) => f.path === VCARD_PATH);
  log(`V11b population (srcFiles): ${impl.srcScanned} src file(s) walked; ${impl.sniffTree.length} name BEGIN:VCARD at all: ${impl.sniffTree.map((f) => f.path).join(", ") || "none"}`);
  ok(L.V11b, impl.srcScanned >= 500 && sawReader && offenders.length === 0,
    offenders.join(" | ") || `${impl.sniffTree.length} file(s) scanned, ${VCARD_PATH} excepted${sawReader ? "" : " — and NOT found, so the walk is blind"}`);
  const plantedSniff = sniffers([{ path: "src/lib/contacts/planted-sniff.ts", text: "export const isCard = (head: string): boolean => /^begin:vcard/i.test(head);" }]);
  const writerLines = sniffers([{ path: "src/lib/contacts/planted-writer.ts", text: 'const card = ["BEGIN:VCARD", "VERSION:3.0", "END:VCARD"];' }]);
  ok(L.V11c, plantedSniff.length === 1 && writerLines.length === 0,
    `planted sniff reported ${plantedSniff.length}× · writer lines reported ${writerLines.length}×`);

  // ── V12 · THE ONE SNIFF, EXECUTED ──────────────────────────────────────────────────────────────
  const SNIFF_CASES: ReadonlyArray<readonly [string, string, boolean]> = [
    ["vCards in a .txt, behind a BOM and blank lines", `${BOM}${CRLF}${CRLF}  BEGIN:VCARD${CRLF}VERSION:3.0${CRLF}`, true],
    ["lower case", `begin:vcard${LF}version:3.0${LF}`, true],
    ["trailing spaces", `BEGIN:VCARD  ${CRLF}`, true],
    ["the 12-card fixture", TWELVE, true],
    ["a CSV header", `Name,Phone${CRLF}Asha,0712345601${CRLF}`, false],
    ["a quoted BEGIN:VCARD cell", `"BEGIN:VCARD",x${CRLF}`, false],
    ["BEGIN:VCARD followed by a comma", `BEGIN:VCARD,x${CRLF}`, false],
    ["another first line", `X-WR-NAME:Kadi${CRLF}BEGIN:VCARD${CRLF}`, false],
    ["a head cut before its line ends", "BEGIN:VCA", false],
    ["only blank lines", `   ${CRLF}  `, false],
    ["empty", "", false],
  ];
  const sniffMisses = SNIFF_CASES.filter(([, head, want]) => impl.looksLikeVcard(head) !== want).map(([name]) => name);
  ok(L.V12, sniffMisses.length === 0, sniffMisses.join(", ") || `${SNIFF_CASES.length} heads`);

  // ── V13 · U28's SAMPLE vCARD, READ BACK ────────────────────────────────────────────────────────
  const sample = read(CONTACT_SAMPLES.vcf());
  const rowsWanted = Array.from({ length: CONTACT_SAMPLE_ROW_COUNT }, (_, i) =>
    COLUMNS.map((f) => (f.key === "tags" ? splitTags(f.samples[i] ?? "").join(",") : f.samples[i] ?? "")));
  const sampleMap = sample.file.rows[0] === undefined ? null : autoMapFile("vcard", sample.file.rows[0].cells);
  const viaVcard = sampleMap === null ? [] : sample.file.rows.slice(sampleMap.headerRows).map((r) => draftContactRow(r.cells, sampleMap.mapping));
  const direct = autoMapHeaders(LABELS);
  const viaRows = Array.from({ length: CONTACT_SAMPLE_ROW_COUNT }, (_, i) =>
    draftContactRow(COLUMNS.map((f) => f.samples[i] ?? ""), direct.mapping));
  ok(L.V13, same(rowLines(sample), Array.from({ length: CONTACT_SAMPLE_ROW_COUNT }, (_, i) => i + 1))
    && sample.file.unreadable.length === 0 && sample.file.notes.length === 0
    && same(sample.file.rows.map((r) => r.cells), rowsWanted)
    && sampleMap !== null && sampleMap.headerRows === 0 && viaVcard.length === CONTACT_SAMPLE_ROW_COUNT && same(viaVcard, viaRows),
    `${brief(sample)} · cells ${visible(sample.file.rows.map((r) => r.cells).slice(0, 1))}`);
}

/* ══ THE RED PLANTS — each a defect somebody could plausibly write, built in memory ═════════════════ */

const EMPTY_STATS: VcardStats = createVcardReader().stats();

/** A reader that ends with `parse(text)`, from chunks gathered first — the shape every whole-text plant shares. */
const gathering = (finish: (text: string, options?: VcardReaderOptions) => Read): ((options?: VcardReaderOptions) => VcardReader) =>
  (options?: VcardReaderOptions): VcardReader => {
    const parts: string[] = [];
    let done: Read | null = null;
    return {
      push: (chunk: string) => {
        if (done === null) parts.push(chunk);
      },
      end: () => {
        if (done === null) done = finish(parts.join(""), options);
        return done.file;
      },
      stats: () => (done === null ? EMPTY_STATS : done.stats),
    };
  };

/** TWO PASSES, simulated: `pass` runs over the WHOLE text, then the real walk reads what it left. */
function withTextPass(pass: (text: string) => string): VcardImpl {
  const base = real();
  const createReader = gathering((text, options) => {
    const reader = base.createReader(options);
    reader.push(pass(text));
    const file = reader.end();
    return { file, stats: reader.stats() };
  });
  return { ...base, createReader, parse: (text, options) => readChunksWith(createReader, [text], options) };
}

const readChunksWith = (createReader: (options?: VcardReaderOptions) => VcardReader, chunks: readonly string[], options?: VcardReaderOptions): FileOf => {
  const reader = createReader(options);
  for (const chunk of chunks) reader.push(chunk);
  return reader.end();
};

/** One RULE swapped in the real factory — the walk itself unchanged. */
function withRules(patch: Partial<VcardRules>): VcardImpl {
  const built = buildVcardReader({ ...VCARD_RULES, ...patch });
  return { ...real(), createReader: built.createReader, parse: built.parse };
}

/** Every result passes through `map` — a SHAPE defect, applied to the chunked and the whole read alike. */
function withOutput(map: (r: Read) => Read): VcardImpl {
  const base = real();
  const createReader = (options?: VcardReaderOptions): VcardReader => {
    const inner = base.createReader(options);
    let out: Read | null = null;
    return {
      push: (chunk: string) => inner.push(chunk),
      end: () => {
        if (out === null) out = map({ file: inner.end(), stats: inner.stats() });
        return out.file;
      },
      stats: () => (out === null ? inner.stats() : out.stats),
    };
  };
  return { ...base, createReader, parse: (text, options) => readChunksWith(createReader, [text], options) };
}

/** The chunks reach the real reader through `wrap`; the whole-text parse stays the shipped one. */
function withChunks(wrap: (inner: VcardReader) => { push: (chunk: string) => void; flush: () => void }): VcardImpl {
  const base = real();
  const createReader = (options?: VcardReaderOptions): VcardReader => {
    const inner = base.createReader(options);
    const wrapped = wrap(inner);
    let flushed = false;
    return {
      push: (chunk: string) => wrapped.push(chunk),
      end: () => {
        if (!flushed) {
          flushed = true;
          wrapped.flush();
        }
        return inner.end();
      },
      stats: () => inner.stats(),
    };
  };
  return { ...base, createReader };
}

/** A chunk boundary read as a line end: every chunk but the last reaches the reader with a LF after it. */
const lineEndAtChunkEnd = (inner: VcardReader): { push: (chunk: string) => void; flush: () => void } => {
  let held: string | null = null;
  return {
    push: (chunk: string) => {
      if (held !== null) inner.push(held + LF);
      held = chunk;
    },
    flush: () => {
      if (held !== null) inner.push(held);
      held = null;
    },
  };
};

/** A LF that opens a chunk after a chunk ending in CR is read as a SECOND line end — the held CR forgotten. */
const crLfTwice = (inner: VcardReader): { push: (chunk: string) => void; flush: () => void } => {
  let lastCr = false;
  return {
    push: (chunk: string) => {
      inner.push(lastCr && chunk.startsWith(LF) ? LF + chunk : chunk);
      if (chunk.length > 0) lastCr = chunk.endsWith(CR);
    },
    flush: () => undefined,
  };
};

/* The passes a two-pass reader makes over the whole text. ⛔ `/g` regexes, used only with `replace`. */
const FOLD_BREAK = /(?:\r\n|\r|\n)[ \t]/g;
const SOFT_BREAK = /=(?:\r\n|\r|\n)/g;
const unfoldThenJoin = (t: string): string => t.replace(FOLD_BREAK, "").replace(SOFT_BREAK, "");
const joinThenUnfold = (t: string): string => t.replace(SOFT_BREAK, "").replace(FOLD_BREAK, "");

/** Every BEGIN:VCARD after the first preceded by an empty AGENT — a reader that nests every inner BEGIN. */
const nestEveryBegin = (t: string): string => {
  const parts = t.split("BEGIN:VCARD");
  return parts[0] + parts.slice(1).map((p, i) => (i === 0 ? "BEGIN:VCARD" : `AGENT:${CRLF}BEGIN:VCARD`) + p).join("");
};

/** PREF=n read, a `pref` TYPE (3.0) or a bare PREF (2.1) ignored. */
const prefOnly = (params: readonly VcardParam[]): number => {
  let rank = 101;
  for (const p of params) {
    if (p.name !== "PREF") continue;
    for (const v of p.values) {
      const n = Number(v);
      if (Number.isInteger(n) && n >= 1 && n < rank) rank = n;
    }
  }
  return rank;
};

const PLANTS: readonly RedPlant<VcardImpl>[] = [
  // ── the two continuation rules split into two passes — BOTH orders, each against its own fixture ──
  {
    name: "two passes, UNFOLD FIRST — the soft break's continuation loses its leading space (the plan's RED, order 1)",
    expect: L.V1a,
    impl: () => withTextPass(unfoldThenJoin),
  },
  {
    name: "two passes, QP FIRST — the PHOTO line ending '==' swallows END:VCARD and both cards are lost (the plan's RED, order 2)",
    expect: L.V1b,
    impl: () => withTextPass(joinThenUnfold),
  },
  {
    name: "two passes, QP FIRST — a plain 'NOTE:Lipa=' swallows the TEL after it",
    expect: L.V1c,
    impl: () => withTextPass(joinThenUnfold),
  },
  {
    name: "the ENCODING parameter not read — quoted-printable never decoded, its soft breaks never joined",
    expect: L.V1d,
    impl: () => withTextPass((t) => t.replace(/;ENCODING=QUOTED-PRINTABLE/gi, "")),
  },
  {
    name: "the soft-break rule takes END:VCARD too — a stray '=' glues the END onto the NOTE",
    expect: L.V1e,
    impl: () => withTextPass((t) => t.split(`=${CRLF}END:VCARD`).join("=END:VCARD")),
  },
  {
    name: "one fold rule for every version — 3.0's drop-one applied to 2.1",
    expect: L.V1f,
    impl: () => withRules({ foldDrop: () => 1 }),
  },
  {
    name: "one fold rule for every version — 2.1's keep-the-space applied to 3.0",
    expect: L.V1f,
    impl: () => withRules({ foldDrop: () => 0 }),
  },
  // ── names and parameters ──
  {
    name: "the 'itemN.' group prefix kept — ITEM1.TEL is not a TEL",
    expect: L.V2,
    impl: () => withRules({ propertyName: (token) => token.trim().toUpperCase() }),
  },
  {
    name: "bare 2.1 parameters ignored — TEL;CELL;PREF loses its PREF",
    expect: L.V3a,
    impl: () => withRules({ bareParam: () => null }),
  },
  {
    name: "a bare QUOTED-PRINTABLE read as a TYPE, not the encoding",
    expect: L.V3b,
    impl: () => withRules({ bareParam: () => "TYPE" }),
  },
  // ── tel: URIs ──
  {
    name: "the tel: URI kept whole — ';ext=101' reads as three more digits",
    expect: L.V4a,
    impl: () => withRules({ telValue: (v) => v.trim() }),
  },
  {
    name: "the URI cut at ';' but its scheme kept — 'tel:+254…' has no leading '+', so it is never foreign",
    expect: L.V4b,
    impl: () => withRules({
      telValue: (v) => {
        const t = v.trim();
        const cut = t.indexOf(";");
        return cut >= 0 ? t.slice(0, cut).trim() : t;
      },
    }),
  },
  // ── preference, then sendable ──
  {
    name: "preference ignored — document order picks the PREF=2 number",
    expect: L.V5a,
    impl: () => withRules({ rank: () => 101 }),
  },
  {
    name: "only 4.0's PREF=n read — a 3.0 'pref' TYPE (and a bare 2.1 PREF) ignored",
    expect: L.V5b,
    impl: () => withRules({ rank: prefOnly }),
  },
  {
    name: "'preferred first' taken literally — the preferred work landline wins over the mobile",
    expect: L.V5c,
    impl: () => withRules({ choosePhone: (phones) => phones[0] ?? "" }),
  },
  {
    name: "a card of landlines dropped as 'no phone number' — U30 never learns why",
    expect: L.V5d,
    impl: () => withRules({ choosePhone: (phones) => phones.find((p) => parseTzNumber(p).verdict === "ok") ?? "" }),
  },
  // ── counts and the shape ──
  {
    name: "skipped cards uncounted — cards = rows, nothing unreadable",
    expect: L.V6a,
    impl: () => withOutput((r) => ({
      file: { ...r.file, unreadable: [], notes: [] },
      stats: { ...r.stats, cards: r.stats.rows, noPhone: 0, cutOff: 0 },
    })),
  },
  {
    name: "skipped cards sent to notes instead of unreadable",
    expect: L.V6b,
    impl: () => withOutput((r) => ({
      file: { ...r.file, unreadable: [], notes: [...r.file.notes, ...r.file.unreadable.map((u) => `Card ${u.line}: ${u.reason}`)] },
      stats: r.stats,
    })),
  },
  {
    name: "a header row emitted in card 1's place — card 1 lost",
    expect: L.V6c,
    impl: () => withOutput((r) => ({
      file: { ...r.file, rows: r.file.rows.length === 0 ? r.file.rows : [{ line: 1, cells: [...LABELS] }, ...r.file.rows.slice(1)] },
      stats: r.stats,
    })),
  },
  {
    name: "a header row emitted on line 1 beside card 1 — two rows on one line",
    expect: L.V6c,
    impl: () => withOutput((r) => ({
      file: { ...r.file, rows: [{ line: 1, cells: [...LABELS] }, ...r.file.rows], width: LABELS.length },
      stats: r.stats,
    })),
  },
  {
    name: "assertVcardCounts that can never throw",
    expect: L.V6d,
    impl: () => ({ ...real(), assertCounts: () => undefined }),
  },
  {
    name: "a missing END nests every card after it — one BEGIN in an open card read as an agent's",
    expect: L.V6e,
    impl: () => withTextPass(nestEveryBegin),
  },
  {
    name: "a 2.1 AGENT not understood — its own card cuts the outer card off and is counted instead",
    expect: L.V6f,
    impl: () => withTextPass((t) => t.split(`AGENT:${CRLF}`).join("")),
  },
  // ── streaming ──
  {
    name: "a chunk end read as a line end (the plan's RED)",
    expect: L.V7a,
    impl: () => withChunks(lineEndAtChunkEnd),
  },
  {
    name: "a CR|LF pair split across chunks read as two line ends",
    expect: L.V7b,
    impl: () => withChunks(crLfTwice),
  },
  {
    name: "a card cut off at the end of the file counted but never listed",
    expect: L.V7c,
    impl: () => withOutput((r) => {
      const last = r.file.unreadable[r.file.unreadable.length - 1];
      const forgotten = last !== undefined && last.reason === VCARD_CUT_OFF && last.line === r.stats.cards;
      return forgotten ? { file: { ...r.file, unreadable: r.file.unreadable.slice(0, -1) }, stats: r.stats } : r;
    }),
  },
  {
    name: "a 64 KB chunk end read as a line end — the Accept line's corpus loses a card",
    expect: L.V8a,
    impl: () => withChunks(lineEndAtChunkEnd),
  },
  {
    name: "PHOTO held like a field — the 1 MB photo buffered",
    expect: L.V8b,
    impl: () => withRules({ kept: new Set([...VCARD_RULES.kept, "PHOTO"]) }),
  },
  // ── text, names, charsets, line endings ──
  {
    name: "text escapes never undone — every backslash kept",
    expect: L.V9a,
    impl: () => withTextPass((t) => t.split(BACKSLASH).join(BACKSLASH + BACKSLASH)),
  },
  {
    name: "a second vCard mapping — ORG read before N for the name",
    expect: L.V9b,
    impl: () => withRules({
      fields: CONTACT_FIELDS.map((f): ContactFieldSpec => (f.key === "name" ? { ...f, vcard: ["FN", "ORG", "N"] as const } : f)),
    }),
  },
  {
    name: "the CHARSET parameter ignored — ISO-8859-1 bytes decoded as UTF-8",
    expect: L.V9c,
    impl: () => withTextPass((t) => t.replace(/;CHARSET=[^;:]*/gi, "")),
  },
  {
    name: "a lone CR is not a line end",
    expect: L.V9d,
    impl: () => withTextPass((t) => t.replace(/\r(?!\n)/g, " ")),
  },
  // ── what a result says and holds ──
  {
    name: "an unreadable reason that names its card's number",
    expect: L.V10a,
    impl: () => withOutput((r) => ({
      file: { ...r.file, unreadable: r.file.unreadable.map((u) => ({ line: u.line, reason: `Card ${u.line}: ${u.reason}` })) },
      stats: r.stats,
    })),
  },
  {
    name: "a sixth cell invented beside the five — a consent read from an X- property",
    expect: L.V10b,
    impl: () => withOutput((r) => ({
      file: {
        ...r.file,
        rows: r.file.rows.map((row) => ({ line: row.line, cells: [...row.cells, "GIVEN"] })),
        width: r.file.rows.length === 0 ? 0 : r.file.width + 1,
      },
      stats: r.stats,
    })),
  },
  // ── the source ──
  {
    name: "vcard.ts imports the server store",
    expect: L.V11a,
    impl: () => ({ ...real(), source: `${real().source}${LF}import "@/lib/server/store";${LF}` }),
  },
  {
    name: "a second vCard sniff — U25's import-parse.ts tests /^begin:vcard/i itself",
    expect: L.V11b,
    impl: () => ({
      ...real(),
      sniffTree: [
        ...real().sniffTree,
        { path: "src/lib/contacts/import-parse.ts", text: `export const looksLikeVcard = (head: string): boolean => /^begin:vcard/i.test(head.trim());${LF}` },
      ],
    }),
  },
  {
    name: "looksLikeVcard as a substring test — a CSV cell saying BEGIN:VCARD reads as vCards",
    expect: L.V12,
    impl: () => ({ ...real(), looksLikeVcard: (head: string) => /begin:vcard/i.test(head) }),
  },
  {
    name: "U28's sample vCard read with its escapes left in — the long note comes back with backslashes",
    expect: L.V13,
    impl: () => withTextPass((t) => t.split(BACKSLASH).join(BACKSLASH + BACKSLASH)),
  },
];

export const vcardSection: ImportSection<VcardImpl> = {
  name: "vcard",
  owner: "U26",
  real,
  run,
  plants: PLANTS,
};
