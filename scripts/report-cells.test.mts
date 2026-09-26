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
import { renderPdf } from "../src/lib/server/reports/pdf.ts";
import { summaryText, type Report } from "../src/lib/server/reports/types.ts";

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

console.log("\n── 5 · The \"At a glance\" block is numbers, not sentences ──");
/* The defect (2026-09-25): `SummaryItem.value` was a string and the delta was glued onto it, so
   the headline block reached Excel as TEXT — `"158,000   (11 txns)"` — which no SUM, comparison
   or chart can read. Now a numeric item is a NUMBER cell in B, its delta is its own cell in C,
   and B is wide enough that the number shows rather than `#####`.
   ⭐ EVERY REPORT, not one: all nine builders carry a headline block, and a builder left on the
   old text shape is precisely the one nobody would open. */
/** The number format a tile of each kind must carry — the same strings a TABLE cell of that kind
 *  gets (`applyValue` in xlsx.ts), so a headline figure and its table row read identically. */
const NUMFMT: Record<string, string> = { tzs: "#,##0;[Red]-#,##0", integer: "#,##0", percent: "0.0%" };
/** A text tile whose words are a formatted NUMBER is the defect, whatever its label says. The first
 *  draft only caught labels containing "(TZS)", which let the regulator pack's GGR/NGR, both levy
 *  tiles, Margin and every count tile regress to text while this stayed green. */
const LOOKS_NUMERIC = /^[-−]?[\d,]+(\.\d+)?%?$/;
/** The ONLY tiles that are words by design. Anything else must carry a number — an allowlist, so a
 *  NEW text tile has to be declared here rather than slipping past a heuristic. */
const TEXT_TILES = new Set(["Hash algorithm", "Schema version", "Chain integrity", "First entry in export", "Last entry in export"]);
/** How many numeric tiles each builder emits on a DATABASE-FREE run. Pinned, not `>= n`: a builder
 *  that quietly drops a tile back to text lowers its own count and fails here by name. (daily-ops'
 *  three levy tiles exist only when the ledger is readable — the probe report below covers their
 *  shapes.) */
const NUMERIC_TILES: Record<string, number> = {
  "daily-ops": 3, "gbt-monthly": 4, "fiu-sar": 3, "sx-register": 1, "iso-audit": 2,
  "kyc-reverify": 3, "rg-engagement": 4, "match-integrity": 3, "finance-window": 6,
};
{
  const ids = Object.keys(REPORT_CATALOGUE) as ReportId[];
  let numericItems = 0, withDelta = 0;
  const bad: string[] = [];
  const unpinned = ids.filter((id) => !(id in NUMERIC_TILES));
  ok("CONTROL · every catalogue report has a pinned tile count (a new report must be added here)",
    unpinned.length === 0, unpinned.join(", ") || `${ids.length} reports`);
  for (const id of ids) {
    const { sheet, report } = await sheetFor(id);
    /* ⭐ AND THE PDF, which nothing in `test:all` rendered at all before this: the same report, the
       same `summaryText` words, through `renderPdf` — a throw or a non-PDF buffer fails here. */
    const pdf = await renderPdf(report).catch((e: Error) => e);
    if (!(pdf instanceof Buffer) || pdf.subarray(0, 5).toString("latin1") !== "%PDF-")
      bad.push(`${id}: renderPdf ${pdf instanceof Error ? `threw ${pdf.message}` : "returned no PDF"}`);
    const items = report.summary ?? [];
    for (const k of items) if (k.num === undefined && !TEXT_TILES.has(k.label))
      bad.push(`${id}: "${k.label}" is text but is not a declared text tile`);
    const numericHere = items.filter((k) => k.num !== undefined).length;
    if (numericHere !== NUMERIC_TILES[id]) bad.push(`${id}: ${numericHere} numeric tiles, pinned ${NUMERIC_TILES[id]}`);
    // The glance block is the run of rows right after its "At a glance" heading.
    let head = 0;
    sheet.eachRow((r, n) => { if (!head && r.getCell(1).value === "At a glance") head = n; });
    if (items.length && !head) { bad.push(`${id}: no "At a glance" heading`); continue; }
    items.forEach((k, i) => {
      const row = sheet.getRow(head + 1 + i);
      const [a, b, c] = [row.getCell(1).value, row.getCell(2).value, row.getCell(3).value];
      if (a !== k.label) { bad.push(`${id}: row ${head + 1 + i} label "${String(a)}" ≠ "${k.label}"`); return; }
      if (k.num === undefined && (/\(TZS\)/.test(k.label) || LOOKS_NUMERIC.test(k.value.trim())))
        bad.push(`${id}: tile "${k.label}" is a number written as TEXT ("${k.value}")`);
      if (k.num !== undefined) {
        numericItems++;
        if (typeof b !== "number" || b !== k.num) bad.push(`${id}: "${k.label}" B=${JSON.stringify(b)} — want the number ${k.num}`);
        if (row.getCell(2).numFmt !== NUMFMT[k.format])
          bad.push(`${id}: "${k.label}" numFmt ${JSON.stringify(row.getCell(2).numFmt)} — want ${JSON.stringify(NUMFMT[k.format])}`);
        // A number wider than its column prints `#####`; text spills, numbers do not.
        const shown = row.getCell(2).numFmt?.includes("%") ? `${(k.num * 100).toFixed(1)}%` : k.num.toLocaleString("en-US");
        const w = sheet.getColumn(2).width ?? 0;
        if (w < shown.length + 2) bad.push(`${id}: column B ${w} wide for "${shown}"`);
      } else if (typeof b !== "string" || b !== k.value.replace(/^([=+\-@\t\r])/, "'$1")) {
        bad.push(`${id}: text tile "${k.label}" B=${JSON.stringify(b)}`);
      }
      if (k.delta) {
        withDelta++;
        if (c !== k.delta.replace(/^([=+\-@\t\r])/, "'$1")) bad.push(`${id}: "${k.label}" delta not in C (C=${JSON.stringify(c)})`);
        if (typeof b === "string" && b.includes(k.delta)) bad.push(`${id}: "${k.label}" delta FUSED into the value cell`);
      }
    });
  }
  ok("CONTROL · the catalogue has numeric headline figures to check", numericItems === 29, `${numericItems} numeric tiles (29 pinned)`);
  ok("CONTROL · and some of them carry a delta", withDelta >= 3, `${withDelta} with a delta`);
  ok("every headline figure is a formatted NUMBER cell, its delta beside it, never fused", bad.length === 0,
    bad.slice(0, 6).join(" · ") || `${ids.length} reports`);
}

{
  /* ⚠️ ONE MARGIN, THREE PLACES — and they disagreed on a tie. The glance cell hands Excel the raw
     fraction (Excel rounds half-up in DECIMAL); the PDF and the "Operator margin" row used `toFixed`
     on the BINARY double. GGR 23,000 on 80,000 retained is 28.75% exactly in decimal and
     28.749999… in binary: the workbook said 28.8%, the PDF and its own table row 28.7%. The builder
     now rounds once. Seeded ON this EAT day's midnight, which is always ≤ now. */
  const { db } = await import("../src/lib/server/store.ts");
  const { startOfEatDay } = await import("../src/lib/server/report-money.ts");
  const day0 = new Date(startOfEatDay(Date.now())).toISOString();
  const put = (id: string, type: string, amount: number) => db.txn.create({
    id: `txn_margin_${id}`, userId: "usr_margin", walletId: "wlt_margin", type, status: "CONFIRMED",
    amount, fee: 0, createdAt: day0,
  } as Parameters<typeof db.txn.create>[0]);
  await put("bet", "BET_PLACED", -80_000);
  await put("pay", "BET_PAYOUT", 57_000);
  const { sheet, report } = await sheetFor("daily-ops");
  const tileNum = report.summary?.find((k) => k.label === "Margin")?.num;
  let head = 0;
  sheet.eachRow((r, n) => { if (!head && r.getCell(1).value === "At a glance") head = n; });
  const idx = (report.summary ?? []).findIndex((k) => k.label === "Margin");
  // Excel's own display rule: the value at 15 significant digits, then half-up at one decimal.
  const v = Number(sheet.getRow(head + 1 + idx).getCell(2).value);
  const excelShows = `${(Math.round(Number((v * 100).toPrecision(15)) * 10) / 10).toFixed(1)}%`;
  const rowNote = report.sections.flatMap((s) => s.rows).find((r) => r.metric === "Operator margin")?.note;
  ok("CONTROL · the tie case reached the builder (GGR 23,000 on 80,000 retained)", tileNum !== undefined && tileNum > 0.28 && tileNum < 0.29, String(tileNum));
  const tile = report.summary?.find((k) => k.label === "Margin");
  const pdfWords = tile ? summaryText(tile) : "(no tile)";   // what drawSummary prints
  ok("the Margin Excel shows == the PDF tile == the \"Operator margin\" row == 28.8%",
    excelShows === rowNote && pdfWords === rowNote && rowNote === "28.8%",
    `Excel ${excelShows} · PDF ${pdfWords} · row ${String(rowNote)}`);
  // …and a LOSING day on the same tie: GGR −23,000 on 80,000 is −28.75%. Excel rounds half AWAY
  // from zero (−28.8%); `Math.round(-287.5)` is −287, so a one-sided rounding said −28.7.
  for (const id of ["bet", "pay"]) await db.txn.update(`txn_margin_${id}`, { status: "FAILED" });
  await put("bet2", "BET_PLACED", -80_000);
  await put("pay2", "BET_PAYOUT", 103_000);
  const lose = await sheetFor("daily-ops");
  let h2 = 0;
  lose.sheet.eachRow((r, n) => { if (!h2 && r.getCell(1).value === "At a glance") h2 = n; });
  const v2 = Number(lose.sheet.getRow(h2 + 1 + idx).getCell(2).value);
  const excel2 = `${(Math.sign(v2) * Math.round(Math.abs(Number((v2 * 100).toPrecision(15))) * 10) / 10).toFixed(1)}%`;
  const tile2 = lose.report.summary?.find((k) => k.label === "Margin");
  const row2 = lose.report.sections.flatMap((s) => s.rows).find((r) => r.metric === "Operator margin")?.note;
  ok("…and on a losing day: Excel == PDF == row == −28.8%",
    excel2 === row2 && (tile2 ? summaryText(tile2) : "") === row2 && row2 === "-28.8%",
    `Excel ${excel2} · PDF ${tile2 ? summaryText(tile2) : "(none)"} · row ${String(row2)}`);
  // Leave the store as the next block expects it: nothing of today's.
  for (const id of ["bet2", "pay2"]) await db.txn.update(`txn_margin_${id}`, { status: "FAILED" });
}

{
  /* ⭐ THE PROPERTY ITSELF: the money tiles SUM. Excel would add B cells; so does this, and the
     result must equal the sum of the figures the builder computed — which the old text cells
     could not produce at all (a string contributes nothing to a SUM).
     ⛔ ON AN EMPTY STORE THIS IS VACUOUS — every tile is 0, and 0 text cells "sum" to the same 0
     as 0 number cells. So real money is seeded first, and a CONTROL requires the sum be non-zero. */
  const { db } = await import("../src/lib/server/store.ts");
  const at = new Date(Date.now() - 3_600_000).toISOString();
  const seed = (id: string, type: string, amount: number) => db.txn.create({
    id: `txn_cells_${id}`, userId: "usr_cells", walletId: "wlt_cells", type, status: "CONFIRMED",
    amount, fee: 0, createdAt: at,
  } as Parameters<typeof db.txn.create>[0]);
  await seed("dep", "DEPOSIT", 158_000);
  await seed("wd", "WITHDRAWAL", -40_000);
  await seed("bet", "BET_PLACED", -25_000);
  const { sheet, report } = await sheetFor("finance-window");
  let head = 0;
  sheet.eachRow((r, n) => { if (!head && r.getCell(1).value === "At a glance") head = n; });
  const money = (report.summary ?? []).map((k, i) => ({ k, i })).filter(({ k }) => /\(TZS\)/.test(k.label));
  const excelSum = money.reduce((s, { i }) => {
    const v = sheet.getRow(head + 1 + i).getCell(2).value;
    return s + (typeof v === "number" ? v : 0);
  }, 0);
  const builderSum = money.reduce((s, { k }) => s + (k.num ?? Number.NaN), 0);
  ok("CONTROL · finance-window has money tiles to sum", money.length >= 4, `${money.length} tiles`);
  ok("CONTROL · and the seeded money reached them (a zero sum proves nothing)", builderSum > 0, `builder sum ${builderSum}`);
  ok("SUM over the money tiles == the builder's own figures", excelSum === builderSum,
    `sheet ${excelSum} vs builder ${builderSum}`);
}

{
  /* ⚠️ `#####` IS INVISIBLE ON THE CATALOGUE'S OWN DATA. Every real report happens to carry a
     section whose column B is already wide, so a glance block that sized nothing still passed
     §5 above — measured: the mutation that deletes the sizing survived it. This drives the
     renderer directly with a ten-figure sum and deliberately NARROW sections, the one shape in
     which an unsized number column would print `#####` instead of the money. */
  const big = 1_234_567_890;
  /* ⭐ AND THE SHAPES A DATABASE-FREE CATALOGUE RUN NEVER PRODUCES: a non-zero percent, a
     NEGATIVE money figure (daily-ops' "GGR less levies booked" on a losing day — its levy tiles are only
     built when the ledger is readable), and a non-finite figure, which must reach the workbook as
     the PDF's "—" rather than as `<v>NaN</v>`, a file Excel refuses to open. */
  const probe = [
    { label: "Stakes (TZS)", num: big, format: "tzs" as const },
    { label: "Margin", num: 0.2875, format: "percent" as const },
    { label: "GGR less levies booked (TZS)", num: -12_345, format: "tzs" as const },
    { label: "Broken (TZS)", num: Number.NaN, format: "tzs" as const },
  ];
  const buf = await renderXlsx({
    title: "Width probe", subtitle: "", reference: "WIDTH-PROBE",
    meta: { generatedAt: new Date().toISOString(), generatedBy: GEN, period: "probe" },
    summary: probe,
    sections: [{ title: "narrow", columns: [{ header: "a", key: "a", width: 4 }, { header: "b", key: "b", width: 4 }], rows: [{ a: "x", b: 1 }] }],
  });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  const w = ws.getColumn(2).width ?? 0;
  const shown = big.toLocaleString("en-US");
  ok("a ten-figure glance sum gets a column wide enough to show it, whatever the sections want",
    w >= shown.length + 2, `column B ${w} wide for "${shown}" (${shown.length} chars)`);
  let head = 0;
  ws.eachRow((r, n) => { if (!head && r.getCell(1).value === "At a glance") head = n; });
  const cell = (i: number) => ws.getRow(head + 1 + i).getCell(2);
  ok("a percent tile is the FRACTION with a 0.0% format (Excel shows 28.8%)",
    cell(1).value === 0.2875 && cell(1).numFmt === NUMFMT.percent, `${JSON.stringify(cell(1).value)} · ${cell(1).numFmt}`);
  ok("a negative money tile stays a negative NUMBER in the red-negative money format",
    cell(2).value === -12_345 && cell(2).numFmt === NUMFMT.tzs, `${JSON.stringify(cell(2).value)} · ${cell(2).numFmt}`);
  ok("a non-finite tile is written as the PDF's \"—\", never as NaN", cell(3).value === "—", JSON.stringify(cell(3).value));
}

console.log(`\nreport-cells: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
