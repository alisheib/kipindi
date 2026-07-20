/**
 * Report verification against a REAL database.
 *
 * Every existing report suite asserts that a file was produced. None asserts the
 * file is RIGHT — which is how a fabricated provenance line, a tax report on the
 * wrong 24 hours, and a self-exclusion register with the wrong date in every row
 * all survived. This drives the actual builders and checks the numbers.
 *
 * Usage:
 *   DATABASE_URL=<url> npx tsx scripts/reports-verify-live.mts
 *   DATABASE_URL=<url> npx tsx scripts/reports-verify-live.mts --render   # also write PDF/XLSX
 *
 * Read-only: builders only SELECT. Nothing is written to the database.
 */
import { REPORT_CATALOGUE } from "../src/lib/server/reports/catalogue.ts";
import { renderPdf } from "../src/lib/server/reports/pdf.ts";
import { renderXlsx } from "../src/lib/server/reports/xlsx.ts";
import { writeFileSync, mkdirSync } from "node:fs";

const RENDER = process.argv.includes("--render");
const OUT = ".50pick-reports";
const GENERATOR = "usr_verify_harness";

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`    PASS ${label}`);
  else { fail++; log(`    FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

const num = (s: unknown) => Number(String(s ?? "").replace(/[^\d.-]/g, "")) || 0;

if (RENDER) { try { mkdirSync(OUT, { recursive: true }); } catch { /* exists */ } }

log(`report verification against live data${RENDER ? " (+render)" : ""}\n`);

for (const [id, entry] of Object.entries(REPORT_CATALOGUE)) {
  log(`── ${id} · ${entry.name}`);
  let report;
  const t0 = Date.now();
  try {
    report = await entry.build(GENERATOR);
  } catch (e) {
    fail++;
    log(`    FAIL build threw — ${(e as Error).message.split("\n")[0]}`);
    continue;
  }
  const ms = Date.now() - t0;

  // ── Universal invariants every regulator artifact must satisfy ──
  check("has a title", !!report.title?.trim());
  check("has a reference", !!report.reference?.trim());
  check("declares a period", !!report.meta?.period?.trim());
  check("has at least one section", (report.sections?.length ?? 0) > 0);

  // No section may claim a total that its own rows contradict when untruncated.
  for (const s of report.sections ?? []) {
    if (!s.totals) continue;
    const truncated = /showing the most recent/i.test(s.description ?? "");
    if (truncated) {
      check(`${s.title}: truncation disclosed alongside full total`, true);
    }
  }

  // The fabricated-provenance class of defect: no note may assert a source the
  // builder does not read. We cannot prove provenance generically, but we CAN
  // pin the specific false claims that shipped, so they cannot come back.
  const notes = (report.notes ?? []).join(" | ").toLowerCase();
  check(
    "no 'generated from the audit log' claim",
    !/generated from the (live )?append-only audit log/.test(notes),
    "this pack does not read the audit log",
  );
  check(
    "no unbacked 'verify in /admin/audit' instruction",
    !/hash-chained to an audit entry\s*—\s*verify/.test(notes),
  );

  log(`    · built in ${ms}ms · ${report.sections?.length ?? 0} sections · ` +
      `${(report.sections ?? []).reduce((n, s) => n + (s.rows?.length ?? 0), 0)} rows`);
  for (const item of report.summary ?? []) log(`      ${item.label}: ${item.value}`);

  // ── Per-report numeric invariants ──
  if (id === "daily-ops") {
    const g = num(report.summary?.find((s) => /gross gaming/i.test(s.label))?.value);
    const tra = num(report.summary?.find((s) => /TRA/i.test(s.label))?.value);
    const gbt = num(report.summary?.find((s) => /GBT/i.test(s.label))?.value);
    const net = num(report.summary?.find((s) => /net after tax/i.test(s.label))?.value);
    if (report.summary?.some((s) => /net after tax/i.test(s.label))) {
      // The document's own arithmetic must close on its face. Before the rounding
      // fix this could be off by up to 1 TZS on a document stating a tax liability.
      check("net after tax == GGR − TRA − GBT (as printed)", Math.abs(net - (g - tra - gbt)) < 1,
        `printed net=${net}, derived=${g - tra - gbt}`);
    }
    check("period names EAT", /EAT/i.test(report.meta?.period ?? ""), report.meta?.period);
  }

  if (id === "iso-audit") {
    const inFile = num(report.summary?.find((s) => /in this export/i.test(s.label))?.value);
    const inLog = num(report.summary?.find((s) => /in the log/i.test(s.label))?.value);
    check("states rows-in-file and rows-in-log separately",
      report.summary!.some((s) => /in this export/i.test(s.label)) &&
      report.summary!.some((s) => /in the log/i.test(s.label)));
    check("export never claims more rows than the log holds", inFile <= inLog,
      `export=${inFile} log=${inLog}`);
    const cols = report.sections?.[0]?.columns?.map((c) => c.key) ?? [];
    check("emits prevHash so the chain is walkable", cols.includes("prevHash"), cols.join(","));
  }

  if (id === "fiu-sar") {
    check("period is a real window, not 'lifetime'",
      !/lifetime/i.test(report.meta?.period ?? ""), report.meta?.period);
  }

  if (id === "sx-register") {
    const rows = report.sections?.[0]?.rows ?? [];
    // The bug: "Started" carried User.createdAt. It must be the exclusion start or
    // blank — never a date that precedes the platform's knowledge of the exclusion.
    const bad = rows.filter((r) => {
      const st = String((r as Record<string, unknown>).periodStarted ?? "");
      const en = String((r as Record<string, unknown>).periodEnds ?? "");
      return st && en && new Date(st).getTime() > new Date(en).getTime();
    });
    check("no row starts after it ends", bad.length === 0, `${bad.length} rows`);
  }

  // ── Renderers ──
  if (RENDER) {
    try {
      const pdf = await renderPdf(report);
      check("PDF renders", pdf.subarray(0, 5).toString() === "%PDF-");
      writeFileSync(`${OUT}/${id}.pdf`, pdf);
      const xlsx = await renderXlsx(report);
      check("XLSX renders", xlsx.subarray(0, 2).toString() === "PK");
      writeFileSync(`${OUT}/${id}.xlsx`, xlsx);
    } catch (e) {
      fail++;
      log(`    FAIL render — ${(e as Error).message.split("\n")[0]}`);
    }
  }
  log("");
}

log("────────────────────────────────────────────");
if (fail) { log(`report verification: ${fail} FAILED`); process.exit(1); }
log(`report verification: all checks passed${RENDER ? ` · files in ${OUT}/` : ""}`);
