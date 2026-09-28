/**
 * Download every report through the REAL route and READ what the documents say about their window.
 * XLSX: read cell A7 back with exceljs. PDF: saved for rasterising.
 *   BASE=http://localhost:3010 node read-artifacts.mjs <outDir>
 */
import { request } from "playwright";
import ExcelJS from "exceljs";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.BASE || "http://localhost:3010";
const OUT = resolve(process.argv[2] ?? "./artifacts");
mkdirSync(OUT, { recursive: true });

const IDS = ["daily-ops", "gbt-monthly", "fiu-sar", "sx-register", "iso-audit",
  "kyc-reverify", "rg-engagement", "match-integrity", "finance-window"];

const ctx = await request.newContext({ baseURL: BASE, ignoreHTTPSErrors: true });
const seed = await ctx.post(`${BASE}/api/dev-test/seed-admin`, { data: {} });
if (!seed.ok()) { console.error("seed-admin failed", seed.status()); process.exit(1); }

/* The window the page would hand a WINDOWED report — a custom EAT minute range, so the document's
   printed period must name exactly these two instants and nothing else. */
const CUSTOM = "range=custom&from=2026-09-01T08:15&to=2026-09-04T17:45";

let bad = 0;
for (const id of IDS) {
  for (const format of ["pdf", "xlsx"]) {
    const q = id === "finance-window" ? `&${CUSTOM}` : "";
    const res = await ctx.get(`${BASE}/api/admin/reports/${id}?format=${format}${q}`);
    if (!res.ok()) { console.log(`✗ ${id}.${format} → ${res.status()}`); bad++; continue; }
    const buf = Buffer.from(await res.body());
    const disp = res.headers()["content-disposition"] ?? "";
    const fn = /filename="?([^"]+)"?/.exec(disp)?.[1] ?? `${id}.${format}`;
    writeFileSync(resolve(OUT, fn), buf);
    if (format === "xlsx") {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const a7 = String(wb.worksheets[0].getCell("A7").value ?? "");
      const period = /^Period:\s*(.*?)\s{3,}Generated:/.exec(a7)?.[1];
      console.log(`\n── ${id}`);
      console.log(`   file    ${fn}`);
      console.log(`   PERIOD  ${period ?? "!! NO Period: FIELD !!"}`);
      if (!period) bad++;
      const sub = String(wb.worksheets[0].getCell("A6").value ?? "");
      console.log(`   subtitle ${sub}`);
    }
  }
}
await ctx.dispose();
console.log(`\n${bad === 0 ? "ALL 9 REPORTS STATE A PERIOD" : `${bad} PROBLEM(S)`}`);
process.exit(bad === 0 ? 0 : 1);
