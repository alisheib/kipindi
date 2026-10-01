/**
 * ⭐ THE SAMPLE SHEETS — rendered from `CONTACT_FIELDS[*].samples`, never typed a second time.
 *                                                                        (U28a, S10 2026-10-01)
 *
 * The CSV the "Download a sample sheet" button offers (label headers, comma, BOM), plus the variants the
 * suite drives through the readers: Swahili headers (each field's `swAlias`), the `sep=;` semicolon form,
 * and a vCard 3.0. The columns are `fileColumns()` — exactly the importable columns the export writes, in
 * the same order — so the sample, the export and the vCard grid cannot disagree about what a column is.
 *
 * ⛔ NO XLSX SAMPLE. exceljs is server-only and U27's boundary forbids it in any client graph; a CSV opens in
 * Excel, and U27 can add one later from the same `samples`.
 *
 * 🔴 THE SAMPLE NUMBERS MAY BELONG TO REAL PEOPLE. Tanzania has no fictional number range, so any number
 * `parseTzNumber` calls ok may be a live subscriber. An operator who leaves the three example rows in and
 * imports under a first-party basis would record consent for a stranger. `SAMPLE_MSISDNS` makes them KNOWN —
 * derived from the samples at load, never typed by hand — and ⛔ U30 must refuse such a row into `invalid`
 * with `SAMPLE_ROW_SENTENCE`. Until U30 there is no importer, so nothing is exposed today.
 *
 * ── THE vCARD ───────────────────────────────────────────────────────────────────────────────────
 * 3.0, CRLF. FN carries the name and `N:;;;;` stays empty, so no reader ever splits it (C20: FN wins over N).
 * Then TEL;TYPE=CELL, EMAIL, CATEGORIES (the tags as the ONE tag rule stores them) and NOTE. Text is escaped
 * per RFC 6350 — backslash, comma, semicolon, newline — and every line is folded at 75 OCTETS, counted in
 * UTF-8 because the em dash in the long sample note is three bytes, without splitting a character or an
 * escape pair across the fold. The backslash is built from its char code: the editing tools decode escape
 * text into raw characters (repo memory).
 *
 * Imports `./contact-fields`, `./csv-write` and `../tz-msisdn` only — pure and client-safe.
 * Guard: `npm run test:contacts-import` · red: `npm run red:contacts-import`.
 */
import { CONTACT_FIELDS, CONTACT_SAMPLE_ROW_COUNT, fileColumns, splitTags, type ContactFieldSpec } from "./contact-fields";
import { toCsv } from "./csv-write";
import { parseTzNumber } from "../tz-msisdn";

const CRLF = String.fromCharCode(13, 10);
const BACKSLASH = String.fromCharCode(92);
const ANY_NEWLINE = /\r\n|\r|\n/g;

/** RFC 6350 §3.2: a content line longer than 75 octets is folded. */
export const VCARD_FOLD_OCTETS = 75;

export type SampleCsvVariant = { readonly headers: "label" | "swahili"; readonly delimiter: "," | ";" };

export type SampleFiles = {
  readonly csv: (variant: SampleCsvVariant) => string;
  readonly vcf: () => string;
};

export type ContactSampleFile = { readonly filename: string; readonly mime: string; readonly content: string };

/** The UTF-8 length of one code point. */
function utf8Octets(ch: string): number {
  const cp = ch.codePointAt(0) ?? 0;
  return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
}

/** vCard TEXT escaping: backslash first, then comma, semicolon, and every newline as backslash-n. */
export function escapeVcardText(s: string): string {
  return String(s ?? "")
    .split(BACKSLASH).join(BACKSLASH + BACKSLASH)
    .split(",").join(BACKSLASH + ",")
    .split(";").join(BACKSLASH + ";")
    .replace(ANY_NEWLINE, BACKSLASH + "n");
}

/**
 * One logical line → physical lines of at most `maxOctets` UTF-8 octets each, the continuations starting with
 * one space (which counts). ⛔ It never splits a code point, and never splits a backslash from the character
 * it escapes — RFC 6350 would allow the latter, but a reader that unescapes per physical line would not.
 */
export function foldVcardLine(line: string, maxOctets = VCARD_FOLD_OCTETS): string {
  const chars = Array.from(line);
  const units: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === BACKSLASH && i + 1 < chars.length) {
      units.push(chars[i] + chars[i + 1]);
      i++;
    } else {
      units.push(chars[i]);
    }
  }
  const lines: string[] = [];
  let current = "";
  let used = 0;
  for (const unit of units) {
    let octets = 0;
    for (const ch of unit) octets += utf8Octets(ch);
    if (used + octets > maxOctets && current !== "" && current !== " ") {
      lines.push(current);
      current = " ";
      used = 1;
    }
    current += unit;
    used += octets;
  }
  lines.push(current);
  return lines.join(CRLF);
}

/**
 * ⭐ A FACTORY, so the suite's red plants run in memory: the same fields in, the same files out.
 * The default instance (`CONTACT_SAMPLES`) is what the button and `contactSampleFile` use.
 */
export function buildSampleFiles(fields: readonly ContactFieldSpec[]): SampleFiles {
  const columns = fileColumns(fields);
  const rows: string[][] = [];
  for (let i = 0; i < CONTACT_SAMPLE_ROW_COUNT; i++) rows.push(columns.map((f) => f.samples[i] ?? ""));

  const csv = (variant: SampleCsvVariant): string => {
    const header = columns.map((f) => (variant.headers === "swahili" ? f.swAlias ?? f.label : f.label));
    return toCsv([header, ...rows], { bom: true, delimiter: variant.delimiter });
  };

  const vcf = (): string => {
    let out = "";
    for (const row of rows) {
      let fn = "";
      const props: string[] = [];
      columns.forEach((f, c) => {
        const value = row[c];
        switch (f.vcard[0]) {
          case "FN":
            fn = value;
            break;
          case "TEL":
            if (value !== "") props.push(`TEL;TYPE=CELL:${value}`);
            break;
          case "EMAIL":
            if (value !== "") props.push(`EMAIL:${escapeVcardText(value)}`);
            break;
          case "CATEGORIES": {
            const tags = splitTags(value);
            if (tags.length > 0) props.push(`CATEGORIES:${tags.map(escapeVcardText).join(",")}`);
            break;
          }
          case "NOTE":
            if (value !== "") props.push(`NOTE:${escapeVcardText(value)}`);
            break;
          default:
            break;
        }
      });
      const card = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVcardText(fn)}`, "N:;;;;", ...props, "END:VCARD"];
      for (const line of card) out += foldVcardLine(line) + CRLF;
    }
    return out;
  };

  return { csv, vcf };
}

export const CONTACT_SAMPLES: SampleFiles = buildSampleFiles(CONTACT_FIELDS);

/** A CSV variant of the default samples. The button uses `{ headers: "label", delimiter: "," }`. */
export function contactSampleCsv(variant: SampleCsvVariant): string {
  return CONTACT_SAMPLES.csv(variant);
}

/** What the button hands the browser, unchanged: the file name, the MIME type and the text. */
export function contactSampleFile(kind: "csv" | "vcf"): ContactSampleFile {
  return kind === "csv"
    ? { filename: "50pick-contacts-sample.csv", mime: "text/csv;charset=utf-8", content: CONTACT_SAMPLES.csv({ headers: "label", delimiter: "," }) }
    : { filename: "50pick-contacts-sample.vcf", mime: "text/vcard;charset=utf-8", content: CONTACT_SAMPLES.vcf() };
}

/* ══ THE SAMPLE NUMBERS, KNOWN ══════════════════════════════════════════════════════════════════ */

/** The gateway form (`255…`) of every phone sample that parses — derived, never typed. */
export function sampleMsisdnsOf(fields: readonly ContactFieldSpec[]): ReadonlySet<string> {
  const out = new Set<string>();
  for (const s of fields.find((f) => f.key === "phone")?.samples ?? []) {
    const p = parseTzNumber(s);
    if (p.verdict === "ok" && p.msisdn !== null) out.add(p.msisdn);
  }
  return out;
}

export const SAMPLE_MSISDNS: ReadonlySet<string> = sampleMsisdnsOf(CONTACT_FIELDS);

/** Is this one of the sample sheet's example numbers? Takes the `255…` key or any spelling of it. */
export function isSampleMsisdn(msisdn: string): boolean {
  const raw = String(msisdn ?? "");
  if (SAMPLE_MSISDNS.has(raw)) return true;
  const p = parseTzNumber(raw);
  return p.msisdn !== null && SAMPLE_MSISDNS.has(p.msisdn);
}

/** ⛔ U30's sentence for a sample row it refuses into `invalid` (see the header). No digits, no echo. */
export const SAMPLE_ROW_SENTENCE = "This is the sample sheet's example row. Delete it and add your own contacts.";
