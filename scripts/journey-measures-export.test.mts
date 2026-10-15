/** S13 WP8: the screen's cells survive PDF/XLSX/CSV, and the route is closed before release. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

process.exitCode = 1;
delete process.env.DATABASE_URL;
process.env.USE_PRISMA_DAL = "false";
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const route = readFileSync(join(ROOT, "src/app/api/admin/journey-measures/export/route.ts"), "utf8");
const V = await import("../src/lib/server/journey-measures.ts");
const M = await import("../src/lib/journey/measures.ts");
const D = await import("../src/lib/server/journey-measures-doc.ts");
const { renderPdf, findPdfOverflows } = await import("../src/lib/server/reports/pdf.ts");
const { renderXlsx } = await import("../src/lib/server/reports/xlsx.ts");
const { parseMeasuresExportPeriod } = await import("../src/app/api/admin/journey-measures/export/route.ts");
const RED = process.argv.includes("--prove-red");
const at = (day: string) => Date.parse(`${day}T00:00:00.000Z`) - 3 * 3_600_000;
const days = M.dayRange("2026-10-02", "2026-10-15");
const now = at("2026-10-16") + 9 * 3_600_000;
const facts: M.LaunchFacts = { observedSince: at("2026-10-01"), firstActiveAt: null, startedActive: false, gap: null,
  transitions: [{ at: at("2026-10-01"), state: "STAFF_PREVIEW" }] };
const rows = days.flatMap((day) => [
  { day, step: "sheet_open", origin: "home", variant: "old", utmSource: "", utmCampaign: "", count: 2 },
  { day, step: "sheet_open", origin: "board", variant: "old", utmSource: "", utmCampaign: "", count: 8 },
  { day, step: "bet", origin: "dial", variant: "old", utmSource: "", utmCampaign: "", count: 3 },
  { day, step: "low_balance", origin: "dial", variant: "old", utmSource: "", utmCampaign: "", count: 1 },
  ...(day === "2026-10-02" ? [{ day, step: "sheet_open", origin: "board", variant: "old", utmSource: "x", utmCampaign: "-x", count: 2 },
    { day, step: "bet", origin: "dial", variant: "old", utmSource: "x", utmCampaign: "-x", count: 1 }] : []),
]);
V.__setJourneyMeasuresReadsForTests({
  launch: async () => ({ ok: true, facts }),
  counterRows: async () => rows as never,
  homeViewsByDay: async () => new Map(days.map((day) => [day, 20])),
  campaignVisits: async () => [{ day: "2026-10-02", campaign: "-x", visits: 3 }],
  shortfallDeposits: async () => [], confirmedDeposits: async () => [], betsOf: async () => [], returnedBetsOf: async () => [],
  joinedPlayers: async () => [], depositOutcomesByDay: async () => new Map(),
} as never);
const view = await V.journeyMeasuresView({ nowMs: now, period: { kind: "baseline" }, fresh: true });
V.__setJourneyMeasuresReadsForTests(null);

const opts = { generatorId: "usr_report_123456", generatorName: "Report officer", generatedAtMs: now, reference: "SJM-BASELINE-20261016-123456" };
const doc = D.buildJourneyMeasuresDocument(view, opts);
const csv = D.buildJourneyMeasuresCsv(view);
const pdf = await renderPdf(doc);
const xlsx = await renderXlsx(doc);
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(xlsx as never);
const text = (value: unknown) => JSON.stringify(value);

function checks(subject = { doc, csv, route }): string[] {
  const fail: string[] = [];
  const check = (name: string, pass: boolean) => { if (!pass) fail.push(name); else if (!RED) console.log(`  PASS ${name}`); };
  const lines = D.documentLines(view);
  check("1.same-cells · five agency measures, baseline/7/14/28/period; no 4b in the summary", lines.length === 25 && subject.doc.summary?.length === 5 && !subject.doc.summary.some((s) => s.label.startsWith("4b.")));
  check("2.window · EAT baseline dates and counted-day total print in the document", subject.doc.meta.period.includes("2–15 Oct 2026 EAT") && subject.doc.meta.period.includes("14 counted East Africa days"));
  check("3.figure · the XLSX and PDF source uses the view's 10.0% and 30.0% baseline, with both halves", subject.doc.sections[0].rows.some((r) => r.measure === "1. Home → bet sheet" && r.numerator === 28 && r.denominator === 280 && r.share === 0.1)
    && subject.doc.sections[0].rows.some((r) => r.measure === "2. Bet sheet → bet placed" && r.numerator === 43 && r.denominator === 142 && r.share === 0.303));
  check("4.status · no offer, not recorded and not launched are words, never fabricated zeros", subject.doc.sections[0].rows.some((r) => r.measure === "3. Short balance → deposit" && r.status === "no offer" && r.share === null)
    && subject.doc.sections[0].rows.some((r) => r.measure === "4. Deposit → bet completed" && r.status === "not recorded" && r.share === null)
    && subject.doc.sections[0].rows.some((r) => r.measure === "1. Home → bet sheet" && r.status === "not launched" && r.share === null));
  check("5.csv · BOM, CRLF, quoted rows and the formula-guarded campaign survive", subject.csv.startsWith(String.fromCharCode(0xfeff) + '"Section"')
    && subject.csv.endsWith(String.fromCharCode(13, 10)) && subject.csv.includes('"\'-x"'));
  check("6.privacy · harm rows never enter an agency file", !text(subject.doc).includes("rapidDeposit") && !subject.csv.includes("rapidDeposit") && !text(subject.doc).includes("chasingLosses"));
  check("7.route · stored role, 2FA, same-origin, and audit before bytes are required", /db\.user\.findById\(session\.userId\)/.test(subject.route)
    && /checkAdminTotp\(session\.userId, session\.sessionId\)/.test(subject.route) && /exportRequestAllowed\(req\.headers\.get\("sec-fetch-site"\)\)/.test(subject.route)
    && subject.route.indexOf("const recorded = await audit(") < subject.route.indexOf("return new NextResponse(body")
    && subject.route.includes("if (!recorded.recorded)"));
  check("8.route · private, no-store and no harm read", subject.route.includes('includeHarm: false') && subject.route.includes('"cache-control": "no-store, max-age=0"'));
  return fail;
}

const bad = checks();
if (!RED) {
  const pdfOverflow = findPdfOverflows(doc);
  const longName = "a".repeat(64);
  const longDoc = D.buildJourneyMeasuresDocument({ ...view, campaigns: { ...view.campaigns,
    table: view.campaigns.table.map((row) => ({ ...row, campaign: longName })) } }, { ...opts, layout: "pdf" });
  const longOverflow = findPdfOverflows(longDoc);
  const sheetTexts: string[] = [];
  wb.eachSheet((sheet) => sheet.eachRow((row) => row.eachCell((cell) => {
    if (cell.type !== ExcelJS.ValueType.Merge) sheetTexts.push(String(cell.text));
  })));
  const has = (v: string) => sheetTexts.some((s) => s.includes(v));
  const parsed = [
    parseMeasuresExportPeriod(new URLSearchParams("period=baseline"), now)?.kind === "baseline",
    parseMeasuresExportPeriod(new URLSearchParams("period=week&week=2026-10-19"), now) === null,
    parseMeasuresExportPeriod(new URLSearchParams("period=week&week=2026-10-18"), now) === null,
    parseMeasuresExportPeriod(new URLSearchParams("period=month&month=2026-11"), now) === null,
  ];
  const extra = [
    ["9.pdf · rendered bytes and no measured overflow", pdf.subarray(0, 4).toString() === "%PDF" && pdfOverflow.length === 0, text(pdfOverflow.slice(0, 3))],
    ["10.xlsx · real workbook reads the agency title, date and both measure labels", xlsx.subarray(0, 2).toString() === "PK" && has("Simplified Journey measures") && has("2–15 Oct 2026") && has("Home → bet sheet") && has("Bet sheet → bet placed"), sheetTexts.slice(0, 35).join(" | ")],
    ["11.period · invalid and future requests are refused before a read", parsed.every(Boolean), text(parsed)],
    ["12.fit · a maximum-length campaign tag fits in the PDF", longOverflow.length === 0, text(longOverflow.slice(0, 3))],
  ] as const;
  for (const [name, ok, why] of extra) { console.log(`  ${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` — ${why}`}`); if (!ok) bad.push(name); }
  console.log(`\nJOURNEY MEASURES EXPORT — ${bad.length === 0 ? "all checks passed" : `${bad.length} failed`}\n`);
  process.exitCode = bad.length === 0 ? 0 : 1;
} else {
  const plants = [
    ["a period's EAT span omitted", { doc: { ...doc, meta: { ...doc.meta, period: "Baseline" } }, csv, route }, "2.window"],
    ["the status row printed as a counted zero", { doc: { ...doc, sections: doc.sections.map((s, i) => i === 0 ? { ...s, rows: s.rows.map((r) => r.measure === "3. Short balance → deposit" ? { ...r, status: "figure", share: 0 } : r) } : s) }, csv, route }, "4.status"],
    ["the formula guard removed", { doc, csv: csv.replace('"\'-x"', '"-x"'), route }, "5.csv"],
    ["a harm marker leaked into the file", { doc: { ...doc, notes: [...(doc.notes ?? []), "rapidDeposit"] }, csv, route }, "6.privacy"],
    ["2FA removed from the route", { doc, csv, route: route.replace("checkAdminTotp(session.userId, session.sessionId)", "Promise.resolve(\"ok\")") }, "7.route"],
    ["audit check removed before release", { doc, csv, route: route.replace("if (!recorded.recorded)", "if (false)") }, "7.route"],
  ] as const;
  let caught = 0;
  for (const [name, subject, expected] of plants) { const hit = checks(subject).some((failure) => failure.startsWith(expected)); if (hit) caught++; console.log(`${hit ? "PROVED" : "MISSED"} ${name}`); }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught\n`);
  process.exitCode = bad.length === 0 && caught === plants.length ? 0 : 1;
}
