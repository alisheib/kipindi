/**
 * ⭐ THE vCARD READER — a `.vcf` read as a STREAM into C15's ONE shape, one row per card.   (U26, S10 2026-10-02)
 *
 * The contact book imports vCards: an iPhone or Android export, Google Contacts, Outlook, a WhatsApp share. This
 * module reads one as it arrives — `createVcardReader().push(chunk)` for every piece of decoded text, then `.end()` —
 * and returns C15's `ParsedContactsFile` with `format: "vcard"`. `parseVcardText` is only push + end: there is ONE
 * walk, for 40 cards and for 150,000 (§3c — the same code path at both ends, never a second implementation).
 *
 * ── ⛔ BOTH CONTINUATION RULES LIVE IN ONE WALK ──────────────────────────────────────────────────────
 * A vCard continues a line two ways, and only the PROPERTY HEAD says which one applies, so they cannot be two passes:
 *   · a FOLD (vCard 2.1, RFC 2425, RFC 6350): a line that begins with a space or a tab continues the line above;
 *   · a QUOTED-PRINTABLE soft break (RFC 2045): a QP value whose line ends in `=` goes on with the next line, and a
 *     space that next line begins with is CONTENT.
 * Two passes corrupt each other silently, in BOTH orders. Unfold first and a soft break's continuation loses its
 * space ("Mama Asha" arrives as "Mama=Asha"). Join soft breaks first and every line ending in `=` swallows the next
 * one — the END:VCARD after a base64 PHOTO line ending in `==` (iPhone and Google put PHOTO last), or the TEL after a
 * plain `NOTE:Lipa=` — and a whole card is lost. So each physical line is decided ONCE, in order:
 *   (1) the pending property is QP, its value (trailing spaces and tabs aside) ends in `=`, and this line is not
 *       END:VCARD → a soft break: that `=` is dropped and the line is appended VERBATIM, leading space included;
 *   (2) otherwise a line that begins with a space or a tab is a fold;
 *   (3) otherwise the pending property is complete, and this line starts the next one.
 * A blank line completes the pending property.
 * ⚠️ THE FOLD IS VERSION-AWARE: 2.1 keeps the whitespace (RFC 822 style); 3.0 and 4.0 drop exactly one character
 * (RFC 2425 §5.8.1, RFC 6350 §3.2), and so does a card whose VERSION line has not been seen yet.
 *
 * ── WHAT A CARD BECOMES ─────────────────────────────────────────────────────────────────────────────
 * ⭐ C20 — THE MAPPING IS `CONTACT_FIELDS[*].vcard`. One row per card and ⛔ NO HEADER ROW (A1.2): the cells sit in
 * the fixed `fileColumns()` order, each filled by `pickVcardValue` — so the name is FN, else N's given + family
 * (through `composeName`), else ORG's first component — and `line` is the card's ordinal, 1-based and counted over
 * EVERY card, so the number U30 prints is the card's own and `isParsedContactsFile` holds.
 *   · `itemN.` group prefixes (Apple, Google, WhatsApp) are stripped. Bare 2.1 parameters are read: `TEL;CELL;PREF`
 *     is TYPE=CELL and TYPE=PREF, and a bare QUOTED-PRINTABLE or BASE64 is the ENCODING.
 *   · A 4.0 `tel:` URI loses its scheme and is cut at its first `;` — kept whole, `;ext=101` reads as three more
 *     digits (too long) and a `+254` number is never seen as foreign.
 *   · ⚠️ "PREFERRED FIRST" TAKEN LITERALLY IS WRONG FOR SMS. Every TEL is kept in preference order (PREF=n, then a
 *     `pref` TYPE, then document order) and the row's phone is the FIRST one `isSendableTzNumber` accepts: a
 *     preferred work landline yields to the card's mobile. A card with no sendable number keeps its most preferred
 *     one, so U30 can say why that row is refused. The other numbers are counted (`extraPhones`) and dropped — one
 *     person, one row. The choice reads the CURRENT numbering table, so a re-import after a table change can choose
 *     differently; that is accepted.
 *   · A card with no phone number, or cut off before its END:VCARD (the file ends, or a BEGIN:VCARD arrives that is
 *     not a 2.1 AGENT's own card), is NOT a row: it goes to `unreadable` as `{ line: its ordinal, reason }` (A1.8,
 *     X19) with a reason that carries no digits, and the file gets ONE summary note, `describeVcardCounts`. A 2.1
 *     AGENT's own card is nested, never counted, and never lends its TEL to the card around it.
 *   · Cards are counted apart from rows: `assertVcardCounts` throws unless cards = rows + unreadable.
 *
 * ── STREAMING, AND WHAT IS NEVER HELD ───────────────────────────────────────────────────────────────
 * Any split of the text into chunks reads exactly as the whole text, a split between a CR and its LF included: a CR
 * that ends a chunk is a line end and a LF that opens the next chunk is swallowed, a property is complete only when
 * the NEXT line shows it is not continued, and a chunk boundary is never a line end. Only the values a field reads
 * are held (each capped at `MAX_KEPT_LINE`); every other value — a 1 MB PHOTO, a LOGO, a SOUND — is never held at
 * all, not even one whole physical line of it: the walk keeps its head and whether it ends in `=`.
 *
 * ── THE ONE SNIFF ───────────────────────────────────────────────────────────────────────────────────
 * `looksLikeVcard` is the ONE vCard sniff (C17): U25's `detectFormat` imports it, so a `.txt` of vCards is vCards.
 *
 * ⛔ PURE AND CLIENT-SAFE — OD29 parses a vCard in the browser. It imports `../tz-msisdn` and `./contact-fields` and
 * nothing else (C20): no directive, no server module, no Node built-in, no logging. It never throws on any input.
 * A leading byte-order mark is stripped once (C19: U25's `stripBom` is the decode-time stripper; this is a belt).
 * Every behaviour comes from `buildVcardReader(rules)`; the module's readers are its instance over `VCARD_RULES`,
 * which is what lets every red plant in the suite run in memory.
 * Guard: `npm run test:contacts-import` (the `vcard` section) · red: `npm run red:contacts-import`.
 */
import { isSendableTzNumber } from "../tz-msisdn";
import {
  CONTACT_FIELDS,
  composeName,
  fileColumns,
  pickVcardValue,
  type ContactFieldSpec,
  type VcardValues,
} from "./contact-fields";

/* ══ CHARACTERS — by code, never typed: the editing tools decode escape text into raw characters ══════ */

const CR = 13;
const LF = 10;
const SP = 32;
const HTAB = 9;
const QUOTE = 34;
const COMMA = 44;
const COLON = 58;
const SEMICOLON = 59;
const EQUALS = 61;
const BACKSLASH = 92;
const BYTE_ORDER_MARK = 0xfeff;
const NEWLINE = String.fromCharCode(LF);
const BACKSLASH_TEXT = String.fromCharCode(BACKSLASH);

/* ══ LIMITS ══════════════════════════════════════════════════════════════════════════════════════ */

/**
 * The most characters of ONE kept value (a FN, a NOTE…) the reader holds; the rest is dropped and counted in
 * `truncated`. Far above every field's limit (C12 — a note is 1,000), so a value cut here is still refused as too
 * long by U28's `draftContactRow`: the cut can never turn a refused value into an accepted one.
 */
export const MAX_KEPT_LINE = 65_536;

/** A property head (name and parameters) longer than this before its `:` is not a property: dropped, never held. */
const MAX_HEAD = 4096;

/** The properties the walk itself reads. Their values are short, so this much of one is held. */
const STRUCTURAL = new Set(["BEGIN", "END", "VERSION", "AGENT"]);
const STRUCTURAL_CAP = 64;

/** The rank of a property that states no preference (RFC 6350's PREF runs 1–100; lower is preferred). */
const NO_PREFERENCE = 101;

/** The text a soft-break continuation is checked against (case-insensitive, spaces and tabs around it allowed). */
const END_LINE = "END:VCARD";

/* ══ THE RULES ═══════════════════════════════════════════════════════════════════════════════════ */

/** One parameter of a property head: its name upper-cased, its values unquoted, case kept. */
export type VcardParam = { readonly name: string; readonly values: readonly string[] };

/**
 * ⭐ THE RULES THE WALK APPLIES — each one a decision the plan took, named so a red plant can swap exactly one and
 * leave the walk itself untouched.
 */
export type VcardRules = {
  /** The field list the cells come from (C20): `fileColumns(fields)` fixes the order, each `field.vcard` its sources. */
  readonly fields: readonly ContactFieldSpec[];
  /** The properties whose values are held. Every other value is never held at all. */
  readonly kept: ReadonlySet<string>;
  /** The most characters of one kept value that are held. */
  readonly maxKept: number;
  /** How many characters a fold drops from its line's start: 2.1 keeps the whitespace, 3.0 and 4.0 drop one. */
  readonly foldDrop: (version: string | null) => number;
  /** The property a head's first token names: the `itemN.` group stripped, upper-cased. */
  readonly propertyName: (token: string) => string;
  /** A bare 2.1 parameter token's name — ENCODING for an encoding token, else TYPE — or null to drop it. */
  readonly bareParam: (token: string) => string | null;
  /** A property's preference: PREF=n (1–100); a `pref` TYPE ranks 1; anything else ranks 101. */
  readonly rank: (params: readonly VcardParam[]) => number;
  /** A TEL value as the number's raw text: a `tel:` URI loses its scheme and is cut at its first `;`. */
  readonly telValue: (value: string) => string;
  /** The row's phone, from the card's numbers in preference order: the first sendable one, else the first. */
  readonly choosePhone: (phones: readonly string[]) => string;
};

const ENCODING_TOKENS = new Set(["QUOTED-PRINTABLE", "BASE64", "B", "8BIT", "7BIT"]);
const TEL_SCHEME = /^tel:/i;

function foldDrop(version: string | null): number {
  return version === "2.1" ? 0 : 1;
}

function propertyName(token: string): string {
  const t = token.trim();
  const dot = t.lastIndexOf(".");
  return (dot >= 0 ? t.slice(dot + 1) : t).trim().toUpperCase();
}

function bareParam(token: string): string | null {
  return ENCODING_TOKENS.has(token.trim().toUpperCase()) ? "ENCODING" : "TYPE";
}

function preferenceRank(params: readonly VcardParam[]): number {
  let rank = NO_PREFERENCE;
  for (const p of params) {
    if (p.name === "PREF") {
      for (const v of p.values) {
        const n = Number(v);
        if (Number.isInteger(n) && n >= 1 && n < NO_PREFERENCE && n < rank) rank = n;
      }
    } else if (p.name === "TYPE") {
      for (const v of p.values) if (v.toUpperCase() === "PREF" && rank > 1) rank = 1;
    }
  }
  return rank;
}

function telValue(value: string): string {
  const t = value.trim();
  if (!TEL_SCHEME.test(t)) return t;
  const rest = t.slice(4);
  const cut = rest.indexOf(";");
  return (cut >= 0 ? rest.slice(0, cut) : rest).trim();
}

function choosePhone(phones: readonly string[]): string {
  for (const p of phones) if (isSendableTzNumber(p)) return p;
  return phones[0] ?? "";
}

/** ⭐ The rules as the plan decided them — what `createVcardReader` and `parseVcardText` read by. */
export const VCARD_RULES: VcardRules = {
  fields: CONTACT_FIELDS,
  kept: new Set<string>(CONTACT_FIELDS.flatMap((f) => f.vcard)),
  maxKept: MAX_KEPT_LINE,
  foldDrop,
  propertyName,
  bareParam,
  rank: preferenceRank,
  telValue,
  choosePhone,
};

/* ══ THE SHAPE, THE REASONS, THE COUNTS ══════════════════════════════════════════════════════════ */

/*
 * C15's shape as this reader fills it. ⚠️ RESTATED BY STRUCTURE, NOT IMPORTED: under C20 this file imports only
 * tz-msisdn and contact-fields, so it cannot name `ParsedContactsFile`. Nothing here is exported under that name
 * (`test:contacts-boundary` §2.6 holds the one declaration), the result is assignable to it, and
 * `test:contacts-import` holds every result the suite reads to `isParsedContactsFile`.
 */
type CardRow = { line: number; cells: string[] };
type UnreadCard = { line: number; reason: string };
type VcardFile = {
  format: "vcard";
  fileName: string | null;
  rows: CardRow[];
  width: number;
  blankRows: number;
  notes: string[];
  unreadable: UnreadCard[];
};

/** The reason for a card that ended with no phone number (A1.8: no digits, and nothing taken from the card). */
export const VCARD_NO_PHONE = "This card has no phone number.";

/** The reason for a card that never reached its END:VCARD — the file ended, or the next card began. */
export const VCARD_CUT_OFF = "This card is cut off before its end, so it was not read.";

export type VcardCounts = {
  /** Every top-level card the file began. A 2.1 AGENT's own card is not one. */
  readonly cards: number;
  readonly rows: number;
  /** Cards that ended with no phone number. */
  readonly noPhone: number;
  /** Cards cut off before their END:VCARD. */
  readonly cutOff: number;
};

export type VcardStats = VcardCounts & {
  /** Lines outside every card, lines that are not a property, and a BEGIN or END of something that is not a vCard. */
  readonly strayLines: number;
  /** Rows whose card held more than one number — the extra numbers are dropped. */
  readonly extraPhones: number;
  /** Kept values longer than `maxKept`, cut there. */
  readonly truncated: number;
  /** Encoded values that did not decode cleanly: an unknown charset, a broken `=` escape, base64 that is not. */
  readonly decodeWarnings: number;
  /** The longest kept value held, in characters — what "never held" is measured by. */
  readonly peakKeptChars: number;
};

export type VcardReaderOptions = { readonly fileName?: string | null };

export interface VcardReader {
  /** The next piece of the text, split anywhere. Ignored after `end()`. */
  push(chunk: string): void;
  /** No more text: a card still open is cut off, and the whole file comes back as C15's shape. Idempotent. */
  end(): VcardFile;
  /** The counts so far. */
  stats(): VcardStats;
}

export type VcardBuild = {
  readonly createReader: (options?: VcardReaderOptions) => VcardReader;
  readonly parse: (text: string, options?: VcardReaderOptions) => VcardFile;
};

/* ══ HEADS, PARAMETERS AND VALUES ════════════════════════════════════════════════════════════════ */

type Head = {
  readonly name: string;
  readonly params: readonly VcardParam[];
  readonly qp: boolean;
  readonly base64: boolean;
  readonly charset: string | null;
  readonly rank: number;
};

/** `text` split on every `sep` that is not inside double quotes. */
function splitUnquoted(text: string, sep: number): string[] {
  const out: string[] = [];
  let start = 0;
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === QUOTE) quoted = !quoted;
    else if (c === sep && !quoted) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out;
}

/** A parameter's values: quotes removed, split on commas (RFC 6350 writes `TYPE="voice,cell"`), empties dropped. */
function paramValues(raw: string): string[] {
  const out: string[] = [];
  for (const piece of raw.split('"').join("").split(",")) {
    const v = piece.trim();
    if (v !== "") out.push(v);
  }
  return out;
}

/** A property head — `[group.]NAME[;param…]`, everything before the value's `:` — or null when it names nothing. */
function parseHead(text: string, rules: VcardRules): Head | null {
  const tokens = splitUnquoted(text, SEMICOLON);
  const name = rules.propertyName(tokens[0] ?? "");
  if (name === "") return null;
  const params: VcardParam[] = [];
  for (let k = 1; k < tokens.length; k++) {
    const token = tokens[k].trim();
    if (token === "") continue;
    const eq = token.indexOf("=");
    if (eq < 0) {
      const bare = rules.bareParam(token);
      if (bare !== null) params.push({ name: bare, values: [token] });
      continue;
    }
    params.push({ name: token.slice(0, eq).trim().toUpperCase(), values: paramValues(token.slice(eq + 1)) });
  }
  let qp = false;
  let base64 = false;
  let charset: string | null = null;
  for (const p of params) {
    if (p.name === "ENCODING") {
      for (const v of p.values) {
        const e = v.toUpperCase();
        if (e === "QUOTED-PRINTABLE") qp = true;
        else if (e === "B" || e === "BASE64") base64 = true;
      }
    } else if (p.name === "CHARSET" && charset === null && p.values.length > 0) {
      charset = p.values[0];
    }
  }
  return { name, params, qp, base64, charset, rank: rules.rank(params) };
}

/** One decoder per charset label, built once; null for a label the platform does not know. */
const DECODERS = new Map<string, TextDecoder | null>();

function decoderFor(label: string): TextDecoder | null {
  const key = label.trim().toLowerCase();
  const known = DECODERS.get(key);
  if (known !== undefined) return known;
  let decoder: TextDecoder | null = null;
  try {
    decoder = new TextDecoder(key);
  } catch {
    decoder = null;
  }
  DECODERS.set(key, decoder);
  return decoder;
}

/** Bytes → text in `charset` (UTF-8 when none is named). An unknown label decodes as UTF-8, and is counted. */
function decodeBytes(bytes: readonly number[], charset: string | null, warn: () => void): string {
  let decoder = decoderFor(charset === null || charset.trim() === "" ? "utf-8" : charset);
  if (decoder === null) {
    warn();
    decoder = decoderFor("utf-8");
  }
  if (decoder === null) return bytes.map((b) => String.fromCharCode(b)).join("");
  return decoder.decode(Uint8Array.from(bytes));
}

/** A hex digit's value, or -1 (a position past the end reads NaN, which is -1 too). */
function hexValue(c: number): number {
  if (c >= 48 && c <= 57) return c - 48;
  if (c >= 65 && c <= 70) return c - 55;
  if (c >= 97 && c <= 102) return c - 87;
  return -1;
}

/** Only spaces and tabs from `from` to the end of `s`. */
function onlyBlankFrom(s: string, from: number): boolean {
  for (let i = from; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c !== SP && c !== HTAB) return false;
  }
  return true;
}

/**
 * A QUOTED-PRINTABLE value → text. `=XX` (either case) is one byte and ASCII is itself; the bytes are decoded in the
 * value's charset, so a character split across a soft break decodes whole. The walk has already joined the soft
 * breaks, so a `=` left at the very end is a soft break with nothing after it and is dropped; any other `=` that is
 * not an escape is kept as written, and counted.
 */
function decodeQuotedPrintable(raw: string, charset: string | null, warn: () => void): string {
  let out = "";
  const bytes: number[] = [];
  const flush = (): void => {
    if (bytes.length === 0) return;
    out += decodeBytes(bytes, charset, warn);
    bytes.length = 0;
  };
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c === EQUALS) {
      const hi = hexValue(raw.charCodeAt(i + 1));
      const lo = hexValue(raw.charCodeAt(i + 2));
      if (hi >= 0 && lo >= 0) {
        bytes.push(hi * 16 + lo);
        i += 2;
        continue;
      }
      if (onlyBlankFrom(raw, i + 1)) break;
      warn();
      bytes.push(EQUALS);
      continue;
    }
    if (c < 0x80) {
      bytes.push(c);
      continue;
    }
    flush();
    out += raw[i];
  }
  flush();
  return out;
}

const BASE64_SPACE = /\s+/g;

/** A BASE64 text value (2.1 and 3.0 write ENCODING=B) → text in its charset. One that does not decode is kept, and counted. */
function decodeBase64(raw: string, charset: string | null, warn: () => void): string {
  let binary: string;
  try {
    binary = atob(raw.replace(BASE64_SPACE, ""));
  } catch {
    warn();
    return raw;
  }
  const bytes: number[] = [];
  for (let i = 0; i < binary.length; i++) bytes.push(binary.charCodeAt(i));
  return decodeBytes(bytes, charset, warn);
}

/**
 * vCard TEXT escapes undone: a backslash before `n` or `N` is a newline; before a backslash, a comma, a semicolon
 * or a colon it is that character. Any other backslash is kept as written.
 */
function unescapeText(s: string): string {
  if (s.indexOf(BACKSLASH_TEXT) < 0) return s;
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === BACKSLASH && i + 1 < s.length) {
      const next = s.charCodeAt(i + 1);
      if (next === 110 || next === 78) {
        out += NEWLINE;
        i++;
        continue;
      }
      if (next === BACKSLASH || next === COMMA || next === SEMICOLON || next === COLON) {
        out += s[i + 1];
        i++;
        continue;
      }
    }
    out += s[i];
  }
  return out;
}

/** A structured value split on its UNESCAPED separator (N and ORG on `;`, CATEGORIES on `,`), escapes left in. */
function splitEscaped(s: string, sep: number): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === BACKSLASH) {
      i++;
      continue;
    }
    if (c === sep) {
      out.push(s.slice(start, i));
      start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out;
}

/* ══ THE WALK ════════════════════════════════════════════════════════════════════════════════════ */

type Ranked = { readonly value: string; readonly rank: number; readonly order: number };

const byPreference = (a: Ranked, b: Ranked): number => a.rank - b.rank || a.order - b.order;

const firstPreferred = (list: readonly Ranked[]): string | null =>
  list.length === 0 ? null : list.slice().sort(byPreference)[0].value;

/**
 * ⭐ THE FACTORY. Pure: the same rules in, the same reader out, and nothing read from anywhere else. The module's
 * `createVcardReader` and `parseVcardText` are its instance over `VCARD_RULES`.
 */
export function buildVcardReader(rules: VcardRules): VcardBuild {
  const columns = fileColumns(rules.fields);

  const createReader = (options?: VcardReaderOptions): VcardReader => {
    const fileName = options?.fileName ?? null;
    const rows: CardRow[] = [];
    const unreadable: UnreadCard[] = [];
    const counts = {
      cards: 0,
      rows: 0,
      noPhone: 0,
      cutOff: 0,
      strayLines: 0,
      extraPhones: 0,
      truncated: 0,
      decodeWarnings: 0,
      peakKeptChars: 0,
    };
    const warn = (): void => {
      counts.decodeWarnings++;
    };

    /* ── the card being read ── */
    let depth = 0; // 0 outside every card, 1 inside one, 2 and more inside a 2.1 AGENT's own card
    let ordinal = 0;
    let version: string | null = null;
    let agentOpen = false; // the last property was an AGENT with no value: a BEGIN now opens the agent's card
    let order = 0;
    let tels: Ranked[] = [];
    let names: Ranked[] = [];
    let emails: Ranked[] = [];
    let structuredName: string | null = null;
    let org: string | null = null;
    let categories: string[] = [];
    let note: string | null = null;

    /* ── the property being read: one logical line ── */
    let open = false;
    let head = "";
    let headDone = false;
    let headQuoted = false;
    let headTooLong = false;
    let prop: Head | null = null;
    let keptField = false;
    let cap = 0;
    let value = "";
    let overflow = false;
    let tail = 0; // the last value character that is not a space or a tab; 0 when there is none

    /* ── the physical line being read ── */
    let started = false;
    let undecided = false; // a soft break is pending, and this line may yet be END:VCARD
    let held = "";
    let phase = 0;
    let matched = 0;
    let skip = 0;
    let pendingCr = false;
    let atStart = true;
    let result: VcardFile | null = null;

    const resetCard = (): void => {
      version = null;
      agentOpen = false;
      order = 0;
      tels = [];
      names = [];
      emails = [];
      structuredName = null;
      org = null;
      categories = [];
      note = null;
    };

    const cutOff = (): void => {
      unreadable.push({ line: ordinal, reason: VCARD_CUT_OFF });
      counts.cutOff++;
      depth = 0;
    };

    const finishCard = (): void => {
      const phones = tels.slice().sort(byPreference).map((t) => t.value);
      const phone = phones.length > 0 ? rules.choosePhone(phones) : "";
      if (phone.trim() === "") {
        unreadable.push({ line: ordinal, reason: VCARD_NO_PHONE });
        counts.noPhone++;
        return;
      }
      if (phones.length > 1) counts.extraPhones++;
      const values: VcardValues = {
        TEL: phone,
        FN: firstPreferred(names),
        N: structuredName,
        ORG: org,
        EMAIL: firstPreferred(emails),
        CATEGORIES: categories.length > 0 ? categories.join(",") : null,
        NOTE: note,
      };
      rows.push({ line: ordinal, cells: columns.map((f) => pickVcardValue(f, values)) });
      counts.rows++;
    };

    const beginCard = (): void => {
      if (depth >= 1 && agentOpen) {
        depth++;
        agentOpen = false;
        return;
      }
      if (depth >= 1) cutOff();
      depth = 1;
      ordinal++;
      counts.cards++;
      resetCard();
    };

    const endCard = (): void => {
      agentOpen = false;
      if (depth === 0) {
        counts.strayLines++;
        return;
      }
      if (depth > 1) {
        depth--;
        return;
      }
      depth = 0;
      finishCard();
    };

    /** A kept property's value, decoded, into the card. */
    const collect = (p: Head, raw: string): void => {
      const text = p.qp ? decodeQuotedPrintable(raw, p.charset, warn) : p.base64 ? decodeBase64(raw, p.charset, warn) : raw;
      switch (p.name) {
        case "TEL": {
          const v = rules.telValue(text);
          if (v !== "") tels.push({ value: v, rank: p.rank, order: order++ });
          break;
        }
        case "FN": {
          const v = unescapeText(text).trim();
          if (v !== "") names.push({ value: v, rank: p.rank, order: order++ });
          break;
        }
        case "N": {
          if (structuredName === null) {
            const parts = splitEscaped(text, SEMICOLON);
            structuredName = composeName(unescapeText(parts[1] ?? ""), unescapeText(parts[0] ?? ""));
          }
          break;
        }
        case "ORG": {
          if (org === null) {
            const v = unescapeText(splitEscaped(text, SEMICOLON)[0] ?? "").trim();
            if (v !== "") org = v;
          }
          break;
        }
        case "EMAIL": {
          const v = unescapeText(text).trim();
          if (v !== "") emails.push({ value: v, rank: p.rank, order: order++ });
          break;
        }
        case "CATEGORIES": {
          for (const piece of splitEscaped(text, COMMA)) {
            const v = unescapeText(piece).trim();
            if (v !== "") categories.push(v);
          }
          break;
        }
        case "NOTE": {
          if (note === null) {
            const v = unescapeText(text);
            if (v.trim() !== "") note = v;
          }
          break;
        }
        default:
          break;
      }
    };

    /** One complete property. */
    const onProperty = (p: Head, raw: string): void => {
      if (p.name === "BEGIN" || p.name === "END") {
        if (raw.trim().toUpperCase() !== "VCARD") {
          counts.strayLines++;
          return;
        }
        if (p.name === "BEGIN") beginCard();
        else endCard();
        return;
      }
      if (depth === 0) {
        counts.strayLines++;
        return;
      }
      agentOpen = p.name === "AGENT" && raw.trim() === "";
      if (depth > 1) return;
      if (p.name === "VERSION") {
        version = raw.trim();
        return;
      }
      if (keptField) collect(p, raw);
    };

    const openLine = (): void => {
      open = true;
      head = "";
      headDone = false;
      headQuoted = false;
      headTooLong = false;
      prop = null;
      keptField = false;
      cap = 0;
      value = "";
      overflow = false;
      tail = 0;
    };

    /** The pending logical line is complete. */
    const emitLine = (): void => {
      if (!open) return;
      open = false;
      if (prop === null) {
        if (headDone || headTooLong || head.trim() !== "") counts.strayLines++;
        return;
      }
      if (keptField) {
        if (overflow) counts.truncated++;
        if (value.length > counts.peakKeptChars) counts.peakKeptChars = value.length;
      }
      onProperty(prop, value);
    };

    /** Value text: its last visible character is noted, and it is held only up to the property's cap. */
    const appendValue = (s: string, from: number): void => {
      const n = s.length;
      if (from >= n) return;
      for (let j = n - 1; j >= from; j--) {
        const c = s.charCodeAt(j);
        if (c !== SP && c !== HTAB) {
          tail = c;
          break;
        }
      }
      if (cap === 0) return;
      const room = cap - value.length;
      if (n - from > room) {
        overflow = true;
        if (room > 0) value += s.slice(from, from + room);
      } else {
        value += from === 0 ? s : s.slice(from);
      }
    };

    /** Text of the pending logical line: the head until its first unquoted `:`, then the value. */
    const appendLine = (s: string): void => {
      if (s.length === 0) return;
      let from = 0;
      if (!headDone) {
        let i = 0;
        for (; i < s.length; i++) {
          const c = s.charCodeAt(i);
          if (c === QUOTE) headQuoted = !headQuoted;
          else if (c === COLON && !headQuoted) break;
        }
        if (!headTooLong) {
          head += i === s.length ? s : s.slice(0, i);
          if (head.length > MAX_HEAD) {
            headTooLong = true;
            head = "";
          }
        }
        if (i === s.length) return;
        headDone = true;
        prop = headTooLong ? null : parseHead(head, rules);
        if (prop !== null) {
          keptField = rules.kept.has(prop.name);
          cap = keptField ? rules.maxKept : STRUCTURAL.has(prop.name) ? STRUCTURAL_CAP : 0;
        }
        from = i + 1;
      }
      appendValue(s, from);
    };

    /** Rule (1)'s first half: the pending property is QP and its value ends in `=`. */
    const softBreakPending = (): boolean => open && prop !== null && prop.qp && tail === EQUALS;

    /** A soft break taken: the `=` (and any spaces or tabs after it) leaves the value, and the line goes on. */
    const consumeSoftBreak = (): void => {
      if (cap > 0 && !overflow) {
        let k = value.length - 1;
        while (k >= 0 && (value.charCodeAt(k) === SP || value.charCodeAt(k) === HTAB)) k--;
        if (k >= 0 && value.charCodeAt(k) === EQUALS) value = value.slice(0, k);
      }
      tail = 0;
    };

    /** One more character of a line after a soft break: can this line still be END:VCARD? */
    const stillEnd = (c: number): boolean => {
      if (phase === 0) {
        if (c === SP || c === HTAB) return true;
        phase = 1;
      }
      if (phase === 1) {
        const upper = c >= 97 && c <= 122 ? c - 32 : c;
        if (upper !== END_LINE.charCodeAt(matched)) return false;
        matched++;
        if (matched === END_LINE.length) phase = 2;
        return true;
      }
      return c === SP || c === HTAB;
    };

    /** A piece of the current physical line — never a line end inside it. Its first character decides the line. */
    const lineText = (s: string, from: number, to: number): void => {
      let i = from;
      if (!started) {
        started = true;
        if (softBreakPending()) {
          undecided = true;
          held = "";
          phase = 0;
          matched = 0;
        } else {
          const c = s.charCodeAt(i);
          if (open && (c === SP || c === HTAB)) {
            skip = rules.foldDrop(version);
          } else {
            emitLine();
            openLine();
            skip = 0;
          }
        }
      }
      if (undecided) {
        while (i < to) {
          const c = s.charCodeAt(i);
          held += s[i];
          i++;
          if (!stillEnd(c)) {
            undecided = false;
            consumeSoftBreak();
            appendLine(held);
            held = "";
            break;
          }
        }
        if (undecided) return;
      }
      if (skip > 0) {
        const drop = Math.min(skip, to - i);
        i += drop;
        skip -= drop;
      }
      if (i < to) appendLine(i === 0 && to === s.length ? s : s.slice(i, to));
    };

    /** The current physical line ended (CR, LF or CRLF). */
    const lineEnd = (): void => {
      if (!started) {
        // A blank line: after a soft break it is an empty continuation, otherwise it completes the property.
        if (softBreakPending()) consumeSoftBreak();
        else emitLine();
      } else if (undecided) {
        undecided = false;
        if (phase === 2) {
          // END:VCARD after a dangling `=`: the property ends where it stood, and this line is the END.
          emitLine();
          openLine();
          appendLine(held);
        } else {
          consumeSoftBreak();
          appendLine(held);
        }
        held = "";
      }
      started = false;
      skip = 0;
    };

    const push = (chunk: string): void => {
      if (result !== null) return;
      const s = String(chunk ?? "");
      const n = s.length;
      if (n === 0) return;
      let i = 0;
      if (atStart) {
        atStart = false;
        if (s.charCodeAt(0) === BYTE_ORDER_MARK) i = 1;
      }
      if (pendingCr) {
        pendingCr = false;
        if (i < n && s.charCodeAt(i) === LF) i++;
      }
      while (i < n) {
        let j = i;
        while (j < n) {
          const c = s.charCodeAt(j);
          if (c === CR || c === LF) break;
          j++;
        }
        if (j > i) lineText(s, i, j);
        if (j === n) break;
        lineEnd();
        if (s.charCodeAt(j) === CR) {
          if (j + 1 < n) {
            if (s.charCodeAt(j + 1) === LF) j++;
          } else {
            pendingCr = true;
          }
        }
        i = j + 1;
      }
    };

    const end = (): VcardFile => {
      if (result !== null) return result;
      if (started) lineEnd();
      emitLine();
      if (depth >= 1) cutOff();
      result = {
        format: "vcard",
        fileName,
        rows,
        width: rows.length > 0 ? columns.length : 0,
        blankRows: 0,
        notes: unreadable.length > 0 ? [describeVcardCounts(counts)] : [],
        unreadable,
      };
      return result;
    };

    const stats = (): VcardStats => ({ ...counts });

    return { push, end, stats };
  };

  const parse = (text: string, options?: VcardReaderOptions): VcardFile => {
    const reader = createReader(options);
    reader.push(text);
    return reader.end();
  };

  return { createReader, parse };
}

const DEFAULT_READER = buildVcardReader(VCARD_RULES);

/** ⭐ A reader for one file: `push` each piece of decoded text as it arrives, then `end()`. */
export function createVcardReader(options?: VcardReaderOptions): VcardReader {
  return DEFAULT_READER.createReader(options);
}

/** A whole text in one go — the same reader, one push and `end()`. */
export function parseVcardText(text: string, options?: VcardReaderOptions): VcardFile {
  return DEFAULT_READER.parse(text, options);
}

/* ══ THE ONE SNIFF (C17) ═════════════════════════════════════════════════════════════════════════ */

const FIRST_VISIBLE = /\S/;
const VCARD_BEGIN_LINE = /^[ \t]*BEGIN:VCARD[ \t]*$/i;

/**
 * ⭐ THE ONE vCARD SNIFF: true when the first line that is not blank — after a byte-order mark and any leading
 * whitespace — is BEGIN:VCARD, in any case, with trailing spaces allowed. A CSV whose first cell merely says so (a
 * quoted cell, or one followed by a comma) is not a vCard. Content beats the file's name: U25's `detectFormat`
 * calls this, so a `.txt` of vCards is read as vCards.
 */
export function looksLikeVcard(head: string): boolean {
  const text = String(head ?? "");
  const first = FIRST_VISIBLE.exec(text);
  if (first === null) return false;
  let to = first.index;
  while (to < text.length) {
    const c = text.charCodeAt(to);
    if (c === CR || c === LF) break;
    to++;
  }
  return VCARD_BEGIN_LINE.test(text.slice(first.index, to));
}

/* ══ THE COUNTS, SAID AND CHECKED ════════════════════════════════════════════════════════════════ */

const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;
const grouped = (n: number): string => String(n).replace(THOUSANDS, ",");
const counted = (n: number, one: string, many: string): string => `${grouped(n)} ${n === 1 ? one : many}`;

/**
 * ⭐ The one sayable sentence, in English admin chrome: "12 cards, 9 rows — 2 cards have no phone number; 1 card is
 * cut off before its end." With nothing skipped it is only "12 cards, 12 rows." Counts only, never a value.
 */
export function describeVcardCounts(counts: VcardCounts): string {
  const read = `${counted(counts.cards, "card", "cards")}, ${counted(counts.rows, "row", "rows")}`;
  const why: string[] = [];
  if (counts.noPhone > 0) why.push(`${counted(counts.noPhone, "card has", "cards have")} no phone number`);
  if (counts.cutOff > 0) {
    why.push(`${counted(counts.cutOff, "card is", "cards are")} cut off before ${counts.cutOff === 1 ? "its" : "their"} end`);
  }
  return why.length === 0 ? `${read}.` : `${read} — ${why.join("; ")}.`;
}

/**
 * Throws unless every card the file began is a row or unreadable: cards = rows + no phone + cut off. The message
 * carries counts only. U30 calls it before it shows a pre-flight, as it does its own sums.
 */
export function assertVcardCounts(counts: VcardCounts): void {
  const unread = counts.noPhone + counts.cutOff;
  if (counts.cards !== counts.rows + unread) {
    throw new Error(
      `vCard counts do not add up: ${counted(counts.cards, "card", "cards")}, but ${counted(counts.rows, "row", "rows")} and ${grouped(unread)} unreadable`,
    );
  }
}
