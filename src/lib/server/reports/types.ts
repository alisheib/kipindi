/**
 * Shared report shape. Every report produces a `Report` object that
 * both the XLSX and PDF renderers can consume — same data, same
 * formatting rules, two outputs, one source of truth.
 *
 * The structure is regulator-friendly:
 *   · meta: who generated it, when, for what period
 *   · summary: KPIs surfaced at the top
 *   · sections: tabular blocks with headers + rows
 *   · notes: methodology / footnotes for the auditor
 */

export type ColumnAlign = "left" | "right" | "center";
export type ColumnFormat = "text" | "tzs" | "integer" | "percent" | "datetime" | "date";

export type Column = {
  header: string;
  key: string;
  width?: number;          // Excel width units; PDF uses proportional layout
  align?: ColumnAlign;
  format?: ColumnFormat;
  /** Optional secondary header line (subhead / unit). Renders smaller. */
  sub?: string;
};

export type Row = Record<string, string | number | null>;

export type Section = {
  title: string;
  /** Optional Swahili subtitle — kit pairs every English heading with sw. */
  titleSw?: string;
  /** A one-line description shown under the section title. */
  description?: string;
  columns: Column[];
  rows: Row[];
  /** Optional totals row — values keyed to the same column keys. */
  totals?: Row;
};

/** How a NUMERIC headline figure is shown — the numeric subset of `ColumnFormat`, with the same
 *  meaning: `tzs` whole shillings, `integer` a count, `percent` a FRACTION (0.123 → "12.3%"). */
export type SummaryFormat = "tzs" | "integer" | "percent";

/**
 * One "At a glance" figure. EITHER a number (`num` + `format`) OR text (`value`) — never both.
 *
 * 🔴 WHY THE NUMBER IS CARRIED RAW. This used to be `value: string` only, so every headline
 * figure reached the workbook as FORMATTED TEXT, and the delta was glued onto it: the XLSX cell
 * read `"158,000   (11 txns)"`. Excel cannot sum, compare or chart that — an accountant copying
 * the headline block into a reconciliation got a column of strings. A number is now written as
 * a number cell with a number format (`xlsx.ts`), and its delta sits in the cell beside it.
 * ⛔ THE DISPLAY STRING IS DERIVED, NEVER SUPPLIED ALONGSIDE. A builder that passed both a `num`
 * and a pre-formatted `value` would have two figures for one tile that nothing forces to agree —
 * so a numeric item has no `value`, and every renderer asks `summaryText()` for its words.
 */
export type SummaryItem = {
  label: string;
  /** Tone hint for the value cell — "good", "bad", "neutral" (default). */
  tone?: "good" | "bad" | "neutral";
  /** Optional annotation, e.g. "11 txns". Its OWN cell in the workbook — never fused into the value. */
  delta?: string;
} & (
  | { value: string; num?: undefined; format?: undefined }
  | { num: number; format: SummaryFormat; value?: undefined }
);

/** The words a renderer prints for a summary figure. The ONE place a numeric item is formatted. */
export function summaryText(k: SummaryItem): string {
  if (k.num === undefined) return k.value;
  if (!Number.isFinite(k.num)) return "—";
  if (k.format === "percent") return `${(k.num * 100).toFixed(1)}%`;
  return k.num.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Attestation row — renders at the bottom of regulator-grade reports.
 *  Each row gets a "Prepared by / Reviewed by / Approved by" label, a
 *  name, and a signature line. Optional; only present on hand-offs that
 *  need a wet-ink (or e-sign) trail. */
export type SignatureRow = {
  role: string;        // e.g. "Prepared by", "Reviewed by", "Approved by"
  name: string;        // operator name + title
  /** Optional ID printed alongside the name — usr_… or staff id. */
  id?: string;
  /** Optional date locked-in at sign time. */
  signedAt?: string;
};

export type Report = {
  /** Title used in the PDF cover band, XLSX sheet name, file name. */
  title: string;
  /** Short subtitle — period label, jurisdiction, etc. */
  subtitle: string;
  /** Page orientation for the PDF. Narrative/financial reports stay
   *  "portrait" (the default); wide data appendices (audit-log dumps,
   *  the cross-operator register, the RG limits grid, the SAR line-items)
   *  set "landscape" so their many columns render on one line each instead
   *  of wrapping mid-token. XLSX is always landscape+fit-to-width, so this
   *  only affects the PDF. */
  orientation?: "portrait" | "landscape";
  /** Code printed on every page for traceability — usually
   *  "<acronym>-<YYYYMMDD>-<actor-id-tail>". */
  reference: string;
  /** Who generated this; what window. */
  meta: {
    generatedAt: string;        // ISO
    generatedBy: string;        // user id or display label
    period: string;             // human-readable, e.g. "Last 28 days · 2026-04-13 → 2026-05-11"
    classification?: "Public" | "Internal" | "Confidential" | "Regulator hand-off";
  };
  /** Top-of-document KPIs (renders as a 2–4 col grid in PDF, a header
   *  block in XLSX). Optional. */
  summary?: SummaryItem[];
  /** One or more tabular sections. */
  sections: Section[];
  /** Methodology notes / disclaimers — printed in the footer band. */
  notes?: string[];
  /** Attestation block — present on regulator hand-offs. PDF renders
   *  a clean signature panel; XLSX renders a labeled block at the foot
   *  of the sheet. Omit for internal-only documents. */
  signatures?: SignatureRow[];
};
