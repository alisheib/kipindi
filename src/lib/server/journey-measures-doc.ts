/** S13 agency files: one view, one row model, three renderers. No measure is recomputed here. */
import type { Report, Row, Section, SummaryItem } from "./reports/types";
import { millioneaNote, populationWhere, type CellPlace, type JourneyMeasuresView, type MeasureRow } from "./journey-measures";
import { addDays, addMonths, cellMarks, countText, dueText, halvesText, minutesText, nextMondayAfter, spanText, type Cell, type DayWindow } from "@/lib/journey/measures";
import { CSV_BOM, CSV_EOL, csvCell } from "@/lib/contacts/csv-write";

export type MeasuresDocumentOptions = { generatorId: string; generatorName: string; generatedAtMs: number; reference: string; layout?: "pdf" | "xlsx" };
type Line = { section: string; measure: MeasureRow; label: string; window: DayWindow; cell: Cell; change: string | null; median: number | null; place: CellPlace };
const FIVE = (v: JourneyMeasuresView) => v.rows.filter((r) => r.def.no !== "4b");

/**
 * ⭐ S6 round 6 (LOW 8) — THE REQUESTED REPORT as one line, the period a file was asked for: never the report due on the
 * day it was fetched (a week-3 file fetched in week 6 read "Week 6 of 8"), so a file regenerates byte-identical.
 */
export function requestedText(view: JourneyMeasuresView): string {
  const p = view.period;
  if (p.kind === "baseline") return dueText({ kind: "baseline" });
  if (p.kind === "month") return dueText({ kind: "month", month: p.month, dueDay: nextMondayAfter(addDays(`${addMonths(p.month, 1)}-01`, -1)) });
  const k = view.schedule.mondays.indexOf(p.monday);
  const fromDay = addDays(p.monday, -7), toDay = addDays(p.monday, -1);
  return k < 0 ? `Week — ${spanText(fromDay, toDay)}` : dueText({ kind: "week", k: k + 1, of: view.schedule.mondays.length, monday: p.monday, fromDay, toDay });
}

/** The screen's exact cells, in the order both the document and CSV print them. */
export function documentLines(view: JourneyMeasuresView): Line[] {
  const lines: Line[] = [];
  const requested = requestedText(view);
  for (const measure of FIVE(view)) {
    lines.push({ section: "Before and after", measure, label: "Before · 14 days", window: view.windows.before, cell: measure.before, change: null, median: measure.median?.before ?? null, place: "before" });
    for (const days of [7, 14, 28] as const) lines.push({ section: "Before and after", measure, label: `After · ${days} days`, window: view.windows.after[days], cell: measure.after[days], change: measure.changes[days]?.text ?? null, median: measure.median?.after[days] ?? null, place: days });
    lines.push({ section: "This period", measure, label: requested, window: view.periodWindow, cell: measure.period, change: measure.periodChange?.text ?? null, median: measure.median?.period ?? null, place: "period" });
  }
  return lines;
}

const periodSpan = (window: DayWindow) => window.fromDay && window.toDay ? `${spanText(window.fromDay, window.toDay)} EAT` : "No counted day";
const cellNote = (line: Line) => [line.cell.note, ...cellMarks(line.cell), line.change && `${line.change} vs before`, line.measure.median && `Median ${minutesText(line.median)}`].filter(Boolean).join(" · ");
const numeric = (c: Cell) => c.tenths === null ? null : c.tenths / 1000;

/**
 * ⭐ S6 · OD-22 (round 6, the lead's decision) — the population THIS FILE names for a measure: exactly when a cell the
 * file prints (its own lines) left a unit out. A cell it does not print — since launch, or 4b's — never labels it, so a
 * file regenerates byte-identical whatever those cells come to hold.
 */
const populationIn = (lines: readonly Line[], m: MeasureRow) => populationWhere(m, lines.filter((l) => l.measure === m).map((l) => l.place));
/** A measure's label: with the population where one of this file's cells of it left a unit out — as it always was otherwise. */
const measureLabel = (lines: readonly Line[], m: MeasureRow) => {
  const p = populationIn(lines, m);
  return `${m.def.no}. ${m.def.name}${p ? ` · ${p.en}` : ""}`;
};
/** The file's method notes: the view's, and the Millionea sentence exactly when this file names a population. */
const fileNotes = (view: JourneyMeasuresView, lines: readonly Line[]) => [...view.definitions.notes, ...(FIVE(view).some((m) => populationIn(lines, m)) ? [millioneaNote()] : [])];

function reportRows(lines: Line[], all: readonly Line[]): Row[] {
  return lines.map((line) => ({
    measure: measureLabel(all, line.measure),
    window: `${line.label} · ${periodSpan(line.window)}`,
    numerator: line.cell.n,
    denominator: line.cell.d,
    share: numeric(line.cell),
    status: line.cell.status.replaceAll("-", " "),
    note: cellNote(line),
  }));
}

const MEASURE_COLUMNS: Section["columns"] = [
  { key: "measure", header: "Measure", width: 28 },
  { key: "window", header: "Window · EAT", width: 35 },
  { key: "numerator", header: "First count", width: 13, align: "right", format: "integer" },
  { key: "denominator", header: "Whole", width: 13, align: "right", format: "integer" },
  { key: "share", header: "Share", width: 12, align: "right", format: "percent" },
  { key: "status", header: "Status", width: 15 },
  { key: "note", header: "Note", width: 43 },
];

export function buildJourneyMeasuresDocument(view: JourneyMeasuresView, opts: MeasuresDocumentOptions): Report {
  const lines = documentLines(view);
  const requested = requestedText(view);
  const period = `${requested} · ${periodSpan(view.periodWindow)} · ${view.periodWindow.days.length} counted East Africa day${view.periodWindow.days.length === 1 ? "" : "s"}`;
  const summary: SummaryItem[] = FIVE(view).map((r) => r.period.tenths === null
    ? { label: `${r.def.no}. ${r.def.name}`, value: r.period.text, delta: r.period.note ?? undefined }
    : { label: `${r.def.no}. ${r.def.name}`, num: r.period.tenths / 1000, format: "percent", delta: halvesText(r.period) ?? undefined });
  const beforeAfter = lines.filter((l) => l.section === "Before and after");
  const thisPeriod = lines.filter((l) => l.section === "This period");
  const campaignRows: Row[] = view.campaigns.table.map((c) => ({
    // The PDF has a fixed-width column. Group an unbreakable tag for display there;
    // the workbook and CSV retain the exact tag for copying and reconciliation.
    campaign: opts.layout === "pdf" ? c.campaign.replace(/\S{19,}/g, (run) => run.match(/.{1,16}/g)?.join(" ") ?? run) : c.campaign,
    sheetOpens: c.sheetOpens,
    bets: c.bets,
    share: numeric(c.sheetToBet),
    status: c.sheetToBet.status.replaceAll("-", " "),
    landingVisits: c.landingVisits,
    note: [c.visitOnly ? "visit only" : null, c.sheetToBet.note].filter(Boolean).join(" · "),
  }));
  const definitions: Row[] = view.rows.map((r) => ({
    measure: `${r.def.no}. ${r.def.name}`,
    unit: r.def.unit,
    numerator: r.def.numerator.text,
    denominator: r.def.denominator.text,
  }));
  const sections: Section[] = [
    { title: "Before and after", titleSw: "Kabla na baada", description: "The five agency measures; a share always travels with both counts, its status and its window.", columns: MEASURE_COLUMNS, rows: reportRows(beforeAfter, lines) },
    { title: "This period", titleSw: "Kipindi hiki", description: period, columns: MEASURE_COLUMNS, rows: reportRows(thisPeriod, lines) },
    { title: "By campaign", titleSw: "Kwa kampeni", description: "Only bet sheet → bet placed has both halves tagged. Landing visits are context, not the denominator.", columns: [
      { key: "campaign", header: "Campaign", width: 22 },
      { key: "sheetOpens", header: "Sheet opens", width: 14, format: "integer" },
      { key: "bets", header: "Bets", width: 12, format: "integer" },
      { key: "share", header: "Share", width: 12, format: "percent" },
      { key: "status", header: "Status", width: 16 },
      { key: "landingVisits", header: "Landing visits", width: 16, format: "integer" },
      { key: "note", header: "Note", width: 28 },
    ], rows: campaignRows },
    { title: "How each measure is counted", titleSw: "Jinsi vipimo vinavyohesabiwa", columns: [
      { key: "measure", header: "Measure", width: 28 },
      { key: "unit", header: "Unit", width: 25 },
      { key: "numerator", header: "First count", width: 60 },
      { key: "denominator", header: "Whole", width: 60 },
    ], rows: definitions },
  ];
  return {
    title: "50pick — Simplified Journey measures",
    subtitle: requested,
    orientation: "landscape",
    reference: opts.reference,
    meta: { generatedAt: new Date(opts.generatedAtMs).toISOString(), generatedBy: opts.generatorName, period, classification: "Confidential" },
    summary,
    summaryColumns: 2,
    sections,
    notes: [
      ...fileNotes(view, lines),
      `Requested period: ${period}.`,
      `The launch day is excluded. Skipped days: ${view.periodWindow.skipped.length ? view.periodWindow.skipped.map((d) => `${d.day} (${d.why})`).join(", ") : "none"}.`,
      "A change says what moved in percentage points, not why.",
      ...(opts.layout === "pdf" ? ["Long campaign tags are grouped for PDF line fitting; Excel and CSV keep the exact tag."] : []),
      "This is a confidential agency report. The platform does not send it automatically.",
    ],
  };
}

/** Long-form CSV, with a BOM, quoted cells, CRLF, and the shared formula guard. */
export function buildJourneyMeasuresCsv(view: JourneyMeasuresView): string {
  const head = ["Section", "Measure", "Period", "From · EAT", "To · EAT", "Days", "Numerator", "Denominator", "Percent", "Status", "Note"];
  const rows: Array<Array<string | number | null>> = [head];
  const lines = documentLines(view);
  for (const line of lines) rows.push([
    line.section, measureLabel(lines, line.measure), line.label,
    line.window.fromDay, line.window.toDay, line.window.days.length,
    line.cell.n, line.cell.d, line.cell.tenths === null ? null : line.cell.text,
    line.cell.status, cellNote(line),
  ]);
  for (const c of view.campaigns.table) rows.push([
    "By campaign", c.campaign, periodSpan(view.campaigns.window), view.campaigns.window.fromDay, view.campaigns.window.toDay,
    view.campaigns.window.days.length, c.bets, c.sheetOpens, c.sheetToBet.tenths === null ? null : c.sheetToBet.text,
    c.sheetToBet.status, [c.visitOnly ? "visit only" : null, c.sheetToBet.note].filter(Boolean).join(" · "),
  ]);
  for (const { def } of view.rows) rows.push(["How counted", `${def.no}. ${def.name}`, def.unit, null, null, null, null, null, null, "definition", `First count: ${def.numerator.text} Whole: ${def.denominator.text} ${def.notes.join(" ")}`]);
  for (const note of fileNotes(view, lines)) rows.push(["Method", null, null, null, null, null, null, null, null, "note", note]);
  return CSV_BOM + rows.map((r) => r.map(csvCell).join(",") + CSV_EOL).join("");
}

export function measuresDocumentReference(view: JourneyMeasuresView, generatorId: string): string {
  const key = view.period.kind === "baseline" ? "BASELINE" : view.period.kind === "week" ? `WEEK-${view.period.monday.replaceAll("-", "")}` : `MONTH-${view.period.month.replaceAll("-", "")}`;
  return `SJM-${key}-${view.schedule.today.replaceAll("-", "")}-${generatorId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`;
}

export function measuresDocumentFilename(view: JourneyMeasuresView, format: "pdf" | "xlsx" | "csv"): string {
  const period = view.period.kind === "baseline" ? "baseline" : view.period.kind === "week" ? `week-${view.period.monday}` : `month-${view.period.month}`;
  return `50pick-simplified-journey-measures-${period}-${view.schedule.today}.${format}`;
}
