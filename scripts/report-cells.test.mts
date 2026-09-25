/**
 * REPORT CELLS — what the workbook actually contains, read back out of the rendered file.
 *
 * 🔴 WHY IT EXISTS. `report-renderers-smoke.mjs` proves a report DOWNLOADS: 200, right
 * content-type, right magic bytes, right filename. Every one of those passed while the
 * match-integrity stake-refunds totals row was shipping to the Gaming Board with a BLANK first
 * cell, and while daily-ops' column A was ten characters wide under twenty-seven-character
 * labels. "The file opens" is not "the file is right", and neither is a green builder — the
 * defects live in the rendered CELLS, so this suite renders the real documents and reads the
 * cells back with ExcelJS.
 *
 * ⛔ IT BUILDS THE REPORTS ITSELF rather than reading artifacts a previous run left behind. A
 * suite that reads yesterday's file passes on code that no longer produces it.
 */
import ExcelJS from "exceljs";
import { REPORT_CATALOGUE, type ReportId } from "../src/lib/server/reports/catalogue.ts";
import { renderXlsx } from "../src/lib/server/reports/xlsx.ts";
import type { Report } from "../src/lib/server/reports/types.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

const GEN = "usr_reportcells";
async function sheetFor(id: ReportId) {
  const entry = REPORT_CATALOGUE[id] as { build: (u: string) => Promise<Report> };
  const report = await entry.build(GEN);
  const buf = await renderXlsx(report);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  return { sheet: wb.worksheets[0], report };
}

console.log("\n── 1 · A totals label must survive its column's format ──");
/* The defect: `totals.when = "Total (all)"` sits in a column declared `format: "date"`.
   `fmtDate` returns "" for an unparseable string, so the label was ERASED in both renderers and
   the gilt totals row printed with an empty first cell — taking with it the one signal that
   separates a capped table's total from a complete one. */
{
  const { sheet, report } = await sheetFor("match-integrity");
  const refundSection = report.sections.find((s) => /refund/i.test(s.title));
  ok("CONTROL · the stake-refunds section exists and declares a totals label",
    !!refundSection?.totals && typeof refundSection.totals[refundSection.columns[0].key] === "string",
    String(refundSection?.totals?.[refundSection?.columns[0].key ?? ""] ?? "(none)"));
  ok("CONTROL · that column really is a date-formatted one (the whole trap)",
    refundSection?.columns[0].format === "date", refundSection?.columns[0].format ?? "(none)");

  let label: string | null = null;
  sheet.eachRow((r) => {
    const a = r.getCell(1).value;
    if (typeof a === "string" && /^Total/.test(a)) label = a;
  });
  ok("the rendered totals row carries its label",
    label !== null,
    label ?? "(first cell EMPTY — an unlabelled total in a regulator pack)");
}

console.log("\n── 2 · Per-section widths must not clobber each other ──");
/* REP-07: `sheet.getColumn(n).width` is worksheet-GLOBAL but was written once per section, so
   the LAST section won. Measured on daily-ops: column A ended 10 wide while the summary
   section's 27-character metric labels sat in it. */
{
  const { sheet } = await sheetFor("daily-ops");
  const CAP = 60; // colWidthFor's own ceiling — never demand more than the renderer can give
  let longest = 0, sample = "";
  sheet.eachRow((r) => {
    const v = r.getCell(1).value;
    if (typeof v !== "string" || v.length > CAP) return;
    /* ⭐ A TABLE LABEL SHARES ITS ROW WITH NUMBERS. Section descriptions and the notes block are
       merged prose on rows holding nothing else, and `colWidthFor` never measures them — an
       earlier draft counted a 234-character note and demanded a width the renderer is designed
       not to produce, failing on correct code. Requiring a numeric sibling selects exactly the
       cells that DO drive the column. */
    let hasNumber = false;
    r.eachCell((c) => { if (typeof c.value === "number") hasNumber = true; });
    if (hasNumber && v.length > longest) { longest = v.length; sample = v; }
  });
  ok("CONTROL · column A holds a long table label", longest >= 20, `"${sample}" (${longest} chars)`);
  const w = sheet.getColumn(1).width ?? 0;
  ok("column A fits its widest section's label", w >= Math.min(longest, CAP), `width ${w} vs ${longest} chars`);
}

console.log("\n── 3 · Money must be numbers Excel can sum ──");
{
  const { sheet } = await sheetFor("finance-window");
  let nums = 0, formatted = 0;
  sheet.eachRow((r) => r.eachCell((c) => {
    if (typeof c.value === "number") { nums++; if (c.numFmt) formatted++; }
  }));
  ok("CONTROL · the workbook contains numeric cells at all", nums > 0, `${nums} numeric cell(s)`);
  ok("every numeric cell carries a number format", formatted === nums, `${formatted}/${nums}`);
}

console.log("\n── 4 · A windowed document states its own window ──");
/* The whole point of the finance export: a workbook whose period exists only in the URL that
   produced it is unreadable six months later. */
{
  const { sheet, report } = await sheetFor("finance-window");
  ok("CONTROL · the report meta names a period", !!report.meta.period, report.meta.period);
  let onFace: string | null = null;
  sheet.eachRow((r) => r.eachCell((c) => {
    if (typeof c.value === "string" && /EAT/.test(c.value) && /→|->/.test(c.value)) onFace = c.value;
  }));
  ok("and the window is printed in the sheet itself", onFace !== null, onFace ?? "(nowhere on the face)");
}

console.log(`\nreport-cells: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
