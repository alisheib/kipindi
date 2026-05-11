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

export type SummaryItem = {
  label: string;
  value: string;
  /** Tone hint for the value cell — "good", "bad", "neutral" (default). */
  tone?: "good" | "bad" | "neutral";
  /** Optional delta annotation, e.g. "+12% vs last 28d". */
  delta?: string;
};

export type Report = {
  /** Title used in the PDF cover band, XLSX sheet name, file name. */
  title: string;
  /** Short subtitle — period label, jurisdiction, etc. */
  subtitle: string;
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
};
