/** S13 agency files: one view, one row model, three renderers. No measure is recomputed here. */
import type { Report, Row, Section, SummaryItem } from "./reports/types";
import type { JourneyMeasuresView, MeasureRow } from "./journey-measures";
import { cellMarks, countText, dueText, halvesText, minutesText, spanText, type Cell, type DayWindow } from "@/lib/journey/measures";
import { CSV_BOM, CSV_EOL, csvCell } from "@/lib/contacts/csv-write";

export type MeasuresDocumentOptions = { generatorId: string; generatorName: string; generatedAtMs: number; reference: string; layout?: "pdf" | "xlsx" };
type Line = { section: string; measure: MeasureRow; label: string; window: DayWindow; cell: Cell; change: string | null; median: number | null };
const FIVE = (v: JourneyMeasuresView) => v.rows.filter((r) => r.def.no !== "4b");

/** The screen's exact cells, in the order both the document and CSV print them. */
export function documentLines(view: JourneyMeasuresView): Line[] {
  const lines: Line[] = [];
  for (const measure of FIVE(view)) {
    lines.push({ section: "Before and after", measure, label: "Before · 14 days", window: view.windows.before, cell: measure.before, change: null, median: measure.median?.before ?? null });
    for (const days of [7, 14, 28] as const) lines.push({ section: "Before and after", measure, label: `After · ${days} days`, window: view.windows.after[days], cell: measure.after[days], change: measure.changes[days]?.text ?? null, median: measure.median?.after[days] ?? null });
    lines.push({ section: "This period", measure, label: dueText(view.schedule.due), window: view.periodWindow, cell: measure.period, change: measure.periodChange?.text ?? null, median: measure.median?.period ?? null });
  }
  return lines;
}

const periodSpan = (window: DayWindow) => window.fromDay && window.toDay ? `${spanText(window.fromDay, window.toDay)} EAT` : "No counted day";
const cellNote = (line: Line) => [line.cell.note, ...cellMarks(line.cell), line.change && `${line.change} vs before`, line.measure.median && `Median ${minutesText(line.median)}`].filter(Boolean).join(" · ");
const numeric = (c: Cell) => c.tenths === null ? null : c.tenths / 1000;

function reportRows(lines: Line[]): Row[] {
  return lines.map((line) => ({
    measure: `${line.measure.def.no}. ${line.measure.def.name}`,
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
  const due = dueText(view.schedule.due);
  const period = `${due} · ${periodSpan(view.periodWindow)} · ${view.periodWindow.days.length} counted East Africa day${view.periodWindow.days.length === 1 ? "" : "s"}`;
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
    { title: "Before and after", titleSw: "Kabla na baada", description: "The five agency measures; a share always travels with both counts, its status and its window.", columns: MEASURE_COLUMNS, rows: reportRows(beforeAfter) },
    { title: "This period", titleSw: "Kipindi hiki", description: period, columns: MEASURE_COLUMNS, rows: reportRows(thisPeriod) },
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
    subtitle: due,
    orientation: "landscape",
    reference: opts.reference,
    meta: { generatedAt: new Date(opts.generatedAtMs).toISOString(), generatedBy: opts.generatorName, period, classification: "Confidential" },
    summary,
    summaryColumns: 2,
    sections,
    notes: [
      ...view.definitions.notes,
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
  for (const line of documentLines(view)) rows.push([
    line.section, `${line.measure.def.no}. ${line.measure.def.name}`, line.label,
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
  for (const note of view.definitions.notes) rows.push(["Method", null, null, null, null, null, null, null, null, "note", note]);
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
