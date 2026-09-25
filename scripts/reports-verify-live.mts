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
import { summaryText, type SummaryItem } from "../src/lib/server/reports/types.ts";
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
/** A headline figure's RAW number — never re-parsed from its display text (see `SummaryItem`). */
const fig = (k: SummaryItem | undefined) => (k?.num !== undefined ? k.num : num(k?.value));

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
  for (const item of report.summary ?? []) log(`      ${item.label}: ${summaryText(item)}`);

  /* ⭐ A MONEY OR COUNT TILE MUST REACH THE WORKBOOK AS A NUMBER. Before 2026-09-25 every
     headline figure was pre-formatted text ("158,000   (11 txns)" in the XLSX), so Excel
     could not sum it. A "(TZS)" label carrying only text is that defect coming back. */
  for (const item of report.summary ?? []) {
    if (/\(TZS\)/.test(item.label)) check(`"${item.label}" carries a raw number`, typeof item.num === "number", `value="${item.value}"`);
  }

  // ── Per-report numeric invariants ──
  if (id === "daily-ops") {
    /**
     * 🔴 THIS CHECK HAD BEEN VACUOUS SINCE THE DAY IT WAS WRITTEN (REP-01, filed 2026-09-02,
     * still open until now). It looked the GGR figure up with `/gross gaming/i` — but the
     * summary's label is `"GGR (TZS)"`, which contains neither word. `find` returned undefined,
     * `num(undefined)` returned 0, and the assertion reduced to `|net − (0 − tra − gbt)| < 1`:
     * it PASSED silently on every day where net happened to be 0, and would have FALSE-FAILED
     * the moment real money made it non-zero. The only numeric guard on a document that states
     * a tax liability was, in effect, asserting nothing.
     * ⛔ SO THE LABEL LOOKUP NOW HAS A CONTROL. Matching a label that no longer exists must be a
     * LOUD failure, never a silent zero — that is the whole defect, and a wider regex without a
     * found-check would simply re-arm it for the next rename.
     */
    const pick = (re: RegExp) => report.summary?.find((s) => re.test(s.label));
    const ggrItem = pick(/^GGR\b|gross gaming/i);
    check("CONTROL · the GGR summary label was actually FOUND (REP-01)", ggrItem !== undefined,
      `labels: ${(report.summary ?? []).map((s) => s.label).join(" | ")}`);

    const netItem = pick(/net after tax/i);
    if (netItem && ggrItem) {
      const g = fig(ggrItem);
      const tra = fig(pick(/^TRA\b/i));
      const gbt = fig(pick(/^GBT\b/i));
      const net = fig(netItem);
      // The document's own arithmetic must close on its face — it states a tax liability.
      check("net after tax == GGR − TRA − GBT (as printed)", Math.abs(net - (g - tra - gbt)) < 1,
        `printed net=${net}, derived=${g - tra - gbt} (ggr=${g} tra=${tra} gbt=${gbt})`);
    } else {
      /* ⭐ OMISSION IS A VALID STATE, AND IT IS CHECKED RATHER THAN SKIPPED. The levy lines are
         dropped wholesale when the ledger cannot be read — never printed as 0 — so their absence
         must be ALL-OR-NOTHING. A document showing TRA but no net is a half-stated liability. */
      const anyLevy = pick(/^TRA\b/i) || pick(/^GBT\b/i);
      check("levy lines are omitted together, or not at all", !anyLevy,
        anyLevy ? `found "${anyLevy.label}" with no "Net after tax" beside it` : "all omitted (ledger unreadable)");
    }
    check("period names EAT", /EAT/i.test(report.meta?.period ?? ""), report.meta?.period);
  }

  if (id === "iso-audit") {
    const inFile = fig(report.summary?.find((s) => /in this export/i.test(s.label)));
    const inLog = fig(report.summary?.find((s) => /in the log/i.test(s.label)));
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
