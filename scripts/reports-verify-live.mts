/**
 * REPORT VERIFICATION AGAINST PRODUCTION — `npm run verify:reports-live`.
 *
 * Every other report suite runs on the empty in-memory store. This one drives the REAL catalogue
 * builders against the production database and checks the numbers they print — the only
 * instrument that reads real money through the real builders. That is how a fabricated provenance
 * line, a tax report on the wrong 24 hours, and a self-exclusion register with the wrong date in
 * every row were caught.
 *
 * ⛔ NEVER A `test:*` SCRIPT. `test:all` runs every `test:*`, so naming this one that would make
 * CI need production credentials. It is run by hand, from a Railway-linked checkout:
 *
 *   railway run --service Postgres npm run verify:reports-live
 *   railway run --service Postgres npm run verify:reports-live -- --render   # also write PDF/XLSX
 *
 * ⭐ THE PASSWORD NEVER REACHES A COMMAND LINE. `railway run --service Postgres` injects the
 * Postgres service's `DATABASE_PUBLIC_URL` into this process's environment; nothing is typed,
 * echoed or logged (the host is printed, never the URL). The old usage line —
 * `DATABASE_URL=<url> npx tsx …` — is exactly how the production password reached a session
 * transcript on 2026-09-25.
 *
 * ⛔ IT REFUSES, RATHER THAN LYING, IN FOUR CASES:
 *  · no `--prod` flag, or no database URL: with no DATABASE_URL `store.ts` silently selects the
 *    EMPTY in-memory store, and this script used to print "report verification against live data
 *    … all checks passed" about nothing;
 *  · an internal `*.railway.internal` host — unreachable from a laptop;
 *  · a checkout whose HEAD is not already DEPLOYED. The builders only SELECT, with ONE exception:
 *    `getGlobalConfig()`'s first hydration re-persists the whole market config when the stored
 *    `CONFIG_VERSION` is older than the code's. Run from deployed code, the versions match and
 *    nothing is written; run from a branch that bumped the version, it would WRITE production;
 *  · uncommitted changes under `src/` or `prisma/` (the same reason).
 *
 * `--render` writes the documents to the git-ignored `.50pick-reports/`. Off production the
 * self-exclusion hashes are dev-salted (`SX_REGISTER_SALT` is an app variable, not a Postgres one),
 * and the files hold real player data: delete the folder when done.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const argv = process.argv.slice(2);
const RENDER = argv.includes("--render");
const OUT = ".50pick-reports";
const GENERATOR = "usr_verify_harness";
const refuse = (why: string): never => { console.error(`verify:reports-live REFUSED — ${why}`); process.exit(2); };

if (!argv.includes("--prod")) {
  refuse("pass --prod (use `npm run verify:reports-live`). Without a database this reads an EMPTY in-memory store.");
}
const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || "";
if (!url) refuse("no database URL in the environment. Run: railway run --service Postgres npm run verify:reports-live");
let host = "";
try { host = new URL(url).host; } catch { refuse("the database URL does not parse."); }
if (/\.railway\.internal/i.test(host)) {
  refuse(`${host} is Railway's INTERNAL host, unreachable from a laptop — run through \`railway run --service Postgres\`, which injects DATABASE_PUBLIC_URL.`);
}
const git = (...a: string[]) => execFileSync("git", a, { encoding: "utf8" }).trim();
if (git("status", "--porcelain", "--", "src", "prisma")) refuse("uncommitted changes under src/ or prisma/ — this must run the code that is deployed.");
const link = (await fetch("https://50pick.tz/", { method: "HEAD" }).catch(() => null))?.headers.get("link") ?? "";
const deployed = link.match(/dpl=([0-9a-f]{7,40})/)?.[1];
if (!deployed) refuse("could not read the deployed commit from https://50pick.tz (the `dpl=` preload parameter).");
try { git("merge-base", "--is-ancestor", "HEAD", deployed); }
catch { refuse(`HEAD ${git("rev-parse", "--short", "HEAD")} is not contained in the deployed ${deployed!.slice(0, 8)} (git fetch origin, then check out a deployed commit).`); }

// Only now may the server modules load — `store.ts` picks its backend at import time.
process.env.DATABASE_URL = url;
delete process.env.USE_PRISMA_DAL;
const { REPORT_CATALOGUE } = await import("../src/lib/server/reports/catalogue.ts");
const { renderPdf } = await import("../src/lib/server/reports/pdf.ts");
const { renderXlsx } = await import("../src/lib/server/reports/xlsx.ts");
const { summaryText } = await import("../src/lib/server/reports/types.ts");
const { leviesBooked } = await import("../src/lib/server/ledger.ts");
const { startOfEatDay } = await import("../src/lib/server/report-money.ts");
type SummaryItem = import("../src/lib/server/reports/types.ts").SummaryItem;
type Report = import("../src/lib/server/reports/types.ts").Report;

let fail = 0, skip = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`    PASS ${label}`);
  else { fail++; log(`    FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}
/** A check that could not be made is SAID, and never counted as a pass. */
const skipped = (label: string, why: string) => { skip++; log(`    SKIP ${label} — ${why}`); };

/** The ONLY headline tiles that are words by design (same list as `test:report-cells`). */
const TEXT_TILES = new Set(["Hash algorithm", "Schema version", "Chain integrity", "First entry in export", "Last entry in export"]);
/** A tile's RAW number. A numeric tile that lost its `num` is a FAILURE, never re-parsed from text. */
const fig = (k: SummaryItem | undefined): number => (k && k.num !== undefined ? k.num : Number.NaN);

if (RENDER) { try { mkdirSync(OUT, { recursive: true }); } catch { /* exists */ } }
log(`report verification · PRODUCTION · postgres @ ${host} · deployed ${deployed!.slice(0, 8)}${RENDER ? " · +render" : ""}\n`);

for (const [id, entry] of Object.entries(REPORT_CATALOGUE)) {
  log(`── ${id} · ${entry.name}`);
  const day0 = startOfEatDay(Date.now());
  const ledgerBefore = id === "daily-ops" ? await leviesBooked(day0, day0 + 86_400_000).catch(() => null) : null;
  let report: Report;
  const t0 = Date.now();
  try {
    report = await (entry as { build: (g: string) => Promise<Report> }).build(GENERATOR);
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

  /* ⭐ A TOTAL MUST BE THE SUM OF ITS ROWS — or say, in so many words, that it is not. This block
     used to run `check(…, true)` when the truncation sentence was present and assert nothing
     otherwise: it could not fail. Now a capped section must state "the most recent N of M" with
     N = its row count and M > N; an uncapped one must have every money/count total equal the
     column's sum. */
  for (const s of report.sections ?? []) {
    const cap = (s.description ?? "").match(/Showing the most recent ([\d,]+) of ([\d,]+)/i);
    if (cap) {
      const n = Number(cap[1].replace(/,/g, "")), m = Number(cap[2].replace(/,/g, ""));
      check(`${s.title}: the cap sentence matches the rows shown (${n} of ${m})`, n === s.rows.length && m > n,
        `rows ${s.rows.length}, sentence says ${n} of ${m}`);
      continue;
    }
    if (!s.totals) continue;
    for (const c of s.columns) {
      if (c.format !== "tzs" && c.format !== "integer") continue;
      const t = s.totals[c.key];
      if (typeof t !== "number") continue;
      const sum = s.rows.reduce((acc, r) => acc + (typeof r[c.key] === "number" ? (r[c.key] as number) : 0), 0);
      check(`${s.title}: total "${c.header}" == the sum of its rows`, Math.abs(sum - t) < 0.5, `total ${t}, rows sum ${sum}`);
    }
  }

  // The fabricated-provenance class of defect: no note may assert a source the builder does not
  // read. We cannot prove provenance generically, but we CAN pin the false claims that shipped.
  const notes = (report.notes ?? []).join(" | ").toLowerCase();
  check("no 'generated from the audit log' claim",
    !/generated from the (live )?append-only audit log/.test(notes), "this pack does not read the audit log");
  check("no unbacked 'verify in /admin/audit' instruction", !/hash-chained to an audit entry\s*—\s*verify/.test(notes));
  // The daily-ops note said "GGR = … refunded stakes. This is the operator's commission from the pool."
  check("no note calls GGR the operator's commission",
    !/(ggr[^.|]*\bis|this is) the operator's commission/.test(notes));

  log(`    · built in ${ms}ms · ${report.sections?.length ?? 0} sections · ` +
      `${(report.sections ?? []).reduce((n, s) => n + (s.rows?.length ?? 0), 0)} rows`);
  for (const item of report.summary ?? []) log(`      ${item.label}: ${summaryText(item)}`);

  /* ⭐ EVERY HEADLINE FIGURE THAT IS NOT A DECLARED TEXT TILE REACHES THE WORKBOOK AS A NUMBER.
     Before 2026-09-25 each was formatted text ("158,000   (11 txns)"), which Excel cannot sum. */
  for (const item of report.summary ?? []) {
    if (!TEXT_TILES.has(item.label)) {
      check(`"${item.label}" carries a raw number`, typeof item.num === "number" && Number.isFinite(item.num), `value="${item.value}"`);
    }
  }

  // ── Per-report invariants ──
  if (id === "daily-ops") {
    /* 🔴 REP-01: the GGR lookup once matched no label and the arithmetic check silently compared
       against 0. The lookup has a CONTROL. */
    const pick = (re: RegExp) => report.summary?.find((s) => re.test(s.label));
    const ggrItem = pick(/^GGR\b|gross gaming/i);
    check("CONTROL · the GGR summary label was actually FOUND (REP-01)", ggrItem !== undefined,
      `labels: ${(report.summary ?? []).map((s) => s.label).join(" | ")}`);
    const traItem = pick(/^TRA\b/i), gbtItem = pick(/^GBT\b/i), netItem = pick(/net after tax/i);
    /* ⭐ THE LEVY TILES AGAINST AN INDEPENDENT LEDGER READ (LEAD-F.3). The old check only asked the
       face to close — net == GGR − TRA − GBT — which the builder computes from those very figures,
       so it passed just as happily on the code that multiplied GGR by the rates. This reads
       HOUSE:TRA_LEVY / HOUSE:GBT_LEVY itself, before and after the build; if a settlement posted in
       between, the comparison is SKIPPED and said so, never guessed. */
    const ledgerAfter = await leviesBooked(day0, day0 + 86_400_000).catch(() => null);
    if (ledgerBefore === null || ledgerAfter === null) {
      check("levy lines are omitted together when the ledger cannot be read", !traItem && !gbtItem && !netItem,
        "the ledger read failed here, yet the report printed levy lines");
    } else if (ledgerBefore.tra !== ledgerAfter.tra || ledgerBefore.gbt !== ledgerAfter.gbt) {
      skipped("levy tiles == the booked ledger", "a settlement posted levies during the run; re-run");
    } else {
      check("the levy lines are PRESENT when the ledger is readable", !!traItem && !!gbtItem && !!netItem);
      check("TRA tile == HOUSE:TRA_LEVY booked today (read independently)", fig(traItem) === ledgerAfter.tra,
        `tile ${fig(traItem)}, ledger ${ledgerAfter.tra}`);
      check("GBT tile == HOUSE:GBT_LEVY booked today (read independently)", fig(gbtItem) === ledgerAfter.gbt,
        `tile ${fig(gbtItem)}, ledger ${ledgerAfter.gbt}`);
      check("face arithmetic: net after tax == GGR − TRA − GBT", Math.abs(fig(netItem) - (fig(ggrItem) - fig(traItem) - fig(gbtItem))) < 1,
        `net ${fig(netItem)}, ggr ${fig(ggrItem)}, tra ${fig(traItem)}, gbt ${fig(gbtItem)}`);
    }
    check("period names EAT", /EAT/i.test(report.meta?.period ?? ""), report.meta?.period);
  }

  if (id === "iso-audit") {
    const inFile = fig(report.summary?.find((s) => /in this export/i.test(s.label)));
    const inLog = fig(report.summary?.find((s) => /in the log/i.test(s.label)));
    check("states rows-in-file and rows-in-log separately", Number.isFinite(inFile) && Number.isFinite(inLog));
    check("export never claims more rows than the log holds", inFile <= inLog, `export=${inFile} log=${inLog}`);
    const cols = report.sections?.[0]?.columns?.map((c) => c.key) ?? [];
    check("emits prevHash so the chain is walkable", cols.includes("prevHash"), cols.join(","));
    /* A pack reading BROKEN or UNVERIFIED used to pass here. Without the signing key every row fails
       to recompute under the dev fallback, so the tile is evidence of nothing — SKIP, never PASS. */
    const chain = report.summary?.find((s) => s.label === "Chain integrity");
    check("CONTROL · the Chain integrity tile was FOUND", chain !== undefined);
    if (process.env.AUDIT_CHAIN_SECRET) check("chain integrity is Intact", chain?.value === "Intact", `${chain?.value} — ${chain?.delta ?? ""}`);
    else skipped("chain integrity is Intact", `AUDIT_CHAIN_SECRET is an app variable, absent here; the tile reads "${chain?.value}" and is not evidence`);
  }

  if (id === "fiu-sar") {
    check("period is a real window, not 'lifetime'", !/lifetime/i.test(report.meta?.period ?? ""), report.meta?.period);
  }

  if (id === "sx-register") {
    // Narrow on purpose: this checks that no row STARTS after it ENDS. It cannot tell a "Started"
    // column carrying User.createdAt (the shipped bug) from the exclusion's own start.
    const rows = report.sections?.[0]?.rows ?? [];
    const bad = rows.filter((r) => {
      const st = String(r.periodStarted ?? ""), en = String(r.periodEnds ?? "");
      return st && en && new Date(st).getTime() > new Date(en).getTime();
    });
    check("no row starts after it ends", bad.length === 0, `${bad.length} rows`);
  }

  // ── Renderers ──
  try {
    const pdf = await renderPdf(report);
    check("PDF renders", pdf.subarray(0, 5).toString("latin1") === "%PDF-");
    const xlsx = await renderXlsx(report);
    check("XLSX renders", xlsx.subarray(0, 2).toString("latin1") === "PK");
    if (RENDER) { writeFileSync(`${OUT}/${id}.pdf`, pdf); writeFileSync(`${OUT}/${id}.xlsx`, xlsx); }
  } catch (e) {
    fail++;
    log(`    FAIL render — ${(e as Error).message.split("\n")[0]}`);
  }
  log("");
}

log("────────────────────────────────────────────");
const skipNote = skip ? ` · ${skip} SKIPPED (not evidence — see above)` : "";
if (fail) { log(`report verification: ${fail} FAILED${skipNote}`); process.exit(1); }
log(`report verification: all checks passed${skipNote}${RENDER ? ` · files in ${OUT}/ — delete them when done` : ""}`);
process.exit(0);
