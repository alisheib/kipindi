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
/* ── The explicit pack period, end to end through the route ──────────────────────────────────
   🔴 `buildGbtMonthly`/`buildFiuSar` always took a `packPeriod` and no caller ever passed one, so
   this endpoint could only serve `currentPackPeriod()` — and the pack card's Download, sitting
   beside that card's own month and sha256, served a DIFFERENT month once the EAT month rolled
   over. The route now honours `?period=` for entries whose declared coverage kind is
   `calendar-month`. Asserted as a DELTA: ask for a month that is NOT the default. */
console.log("\n── the explicit pack period ──");
{
  const now = new Date();
  const d = (n) => { const x = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, 1)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}`; };
  const deflt = d(1);   // previous complete month — what the route serves with no ?period
  const asked = d(3);   // three months back — provably not the default
  const say = (l, c, x = "") => { if (!c) bad++; console.log(`   ${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

  const read = async (q) => {
    const res = await ctx.get(`${BASE}/api/admin/reports/gbt-monthly?format=xlsx${q}`);
    if (!res.ok()) return { status: res.status(), period: null, meta: null };
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await res.body()));
    const a7 = String(wb.worksheets[0].getCell("A7").value ?? "");
    return { status: res.status(), period: /^Period:\s*(.*?)\s{3,}Generated:/.exec(a7)?.[1] ?? null, meta: a7 };
  };

  const base = await read("");
  say(`with no ?period the pack is the previous complete month (${deflt})`, base.period?.includes(`${deflt}-01`) === true, base.period ?? `HTTP ${base.status}`);
  const picked = await read(`&period=${asked}`);
  say(`?period=${asked} moves the document to THAT month`,
    picked.period?.includes(`${asked}-01`) === true && !picked.period?.includes(`${deflt}-01`), picked.period ?? `HTTP ${picked.status}`);
  say("CONTROL · the asked month is not the default, so the line above is a real delta", asked !== deflt, `${asked} vs ${deflt}`);

  /* ── The CURRENT month: allowed, and unmistakably a preview ──────────────────────────────
     ⭐ Asked for deliberately, because a month-to-date total under a bare "September 2026"
     heading reads exactly like September's statutory return. Four things must change together. */
  const cur = d(0);
  const partial = await read(`&period=${cur}`);
  say(`the RUNNING month (${cur}) is allowed, not refused`, partial.status === 200, `HTTP ${partial.status}`);
  say("…and its period says PARTIAL and names the days remaining",
    /PARTIAL/.test(partial.period ?? "") && /still to run/.test(partial.period ?? ""), partial.period ?? "(none)");
  say("…and it is classified Internal, not a regulator hand-off",
    /Classification:\s*Internal/.test(partial.meta ?? ""), (partial.meta ?? "").slice(-40));
  say("CONTROL · the COMPLETE month is NOT marked partial, so the check discriminates",
    !/PARTIAL/.test(base.period ?? ""), base.period ?? "(none)");

  const bad1 = await read("&period=2026-13");
  say("a malformed period is REFUSED, not coerced", bad1.status === 400, `HTTP ${bad1.status}`);
  const future = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const futureP = `${future.getUTCFullYear()}-${String(future.getUTCMonth() + 1).padStart(2, "0")}`;
  const bad2 = await read(`&period=${futureP}`);
  /* ⚠️ The rule changed on 2026-09-28 and this label changed with it. An UNFINISHED month is now
     allowed (and marked PARTIAL, asserted above); a month that has not BEGUN is refused, because
     it has no figures at all and an empty document titled with next month is a fabricated zero. */
  say(`a month that has not BEGUN (${futureP}) is REFUSED — nothing to report`, bad2.status === 400, `HTTP ${bad2.status}`);

  /* A report whose coverage is not calendar-month must IGNORE the param rather than half-honour it. */
  const other = await ctx.get(`${BASE}/api/admin/reports/daily-ops?format=xlsx&period=${asked}`);
  say("a non-calendar-month report ignores ?period entirely", other.ok(), `HTTP ${other.status()}`);
}

await ctx.dispose();
console.log(`\n${bad === 0 ? "ALL 9 REPORTS STATE A PERIOD · THE PACK PERIOD IS HONOURED" : `${bad} PROBLEM(S)`}`);
process.exit(bad === 0 ? 0 : 1);
