/**
 * THE TICKET SWEEP — find (and, on request, declare) audit appends that were allocated and never written.
 *
 *   npx tsx scripts/audit-ticket-sweep.mts                    # dry run, last 20,000 rows
 *   npx tsx scripts/audit-ticket-sweep.mts --window 200000    # dry run, wider
 *   npx tsx scripts/audit-ticket-sweep.mts --all              # dry run, every row ever written
 *   npx tsx scripts/audit-ticket-sweep.mts --all --declare --yes-write-to-this-database
 *
 * ⛔ WHY IT EXISTS SEPARATELY FROM THE LIFECYCLE CHORE. `lifecycle.ts` sweeps a bounded window every
 * five minutes so its cost stays flat as the table grows. It does not reach a hole older than that
 * window. This is the backfill: any window, run by hand, once.
 *
 * ⛔ IT CANNOT RESTORE A ROW, AND `--declare` DOES NOT PRETEND TO. Read
 * `src/lib/server/audit-ticket.ts` before running it against anything that matters: for this class
 * of loss there is no anchor anywhere, so what the missing appends SAID is not recoverable. The
 * declaration records that they are absent, and how many.
 *
 * ⛔ DRY RUN IS THE DEFAULT. Without `--declare` this writes nothing at all. With `--declare`
 * against a non-loopback database it additionally demands `--yes-write-to-this-database`, so a
 * production URL sitting in the shell cannot be swept into by a half-typed command.
 */
import {
  declareAuditTicketGaps, findAuditTicketGaps, ticketGapTotal,
  TICKET_DECLARE_CAP, TICKET_SWEEP_WINDOW_ROWS,
} from "../src/lib/server/audit-ticket";

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(`--${f}`);
const num = (f: string, dflt: number): number => {
  const i = argv.indexOf(`--${f}`);
  if (i === -1) return dflt;
  const v = Number(argv[i + 1]);
  return Number.isFinite(v) ? v : dflt;
};

const RAW = process.env.DATABASE_URL ?? "";
if (!RAW) {
  console.error("!! DATABASE_URL is not set. A ticket gap is a property of the persisted chain; with no database there is no chain.");
  process.exit(2);
}
let host = "";
try { host = new URL(RAW).hostname; } catch { host = "(unparseable)"; }
const loopback = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(host);

const windowRows = has("all") ? 0 : num("window", TICKET_SWEEP_WINDOW_ROWS);
const cap = num("cap", TICKET_DECLARE_CAP);
const declare = has("declare");

if (declare && !loopback && !has("yes-write-to-this-database")) {
  console.error(
    `!! --declare would APPEND to the audit chain on ${host}, which is not a loopback database.\n` +
    `   Re-run with --yes-write-to-this-database if that is genuinely the database you mean.\n` +
    `   (Dry run — without --declare — reads and writes nothing; start there.)`,
  );
  process.exit(2);
}

const opts = { windowRows, cap };
console.log(`\naudit-ticket-sweep — database host ${host}${loopback ? " (loopback)" : ""}`);
console.log(`  window     : ${windowRows === 0 ? "ALL rows" : `last ${windowRows} rows by seq`}`);
console.log(`  mode       : ${declare ? "DECLARE (appends audit.rows_missing rows)" : "DRY RUN (reads only)"}`);
console.log(`  cap        : ${cap} declaration(s) per run\n`);

const r = declare ? await declareAuditTicketGaps(opts) : await findAuditTicketGaps(opts);
const declared = "declared" in r ? r.declared : 0;

// ⭐ THE POPULATION FIRST, ALWAYS, AND BOTH HALVES OF IT. "No gaps" over zero ticketed rows has
// established nothing; and the pre-ticket rows are EXCLUDED, never counted as gap-free.
console.log(`  POPULATION : ${r.scannedTicketed} ticketed row(s) across ${r.boots} boot(s), of ${r.scannedRows} row(s) in the window`);
console.log(`  EXCLUDED   : ${r.scannedRows - r.scannedTicketed} pre-ticket row(s) — written before the ticket shipped, and permanently invisible to this detector`);
console.log(`  GAPS       : ${r.gaps.length} range(s), ${ticketGapTotal(r)} append(s)${r.capped ? ` (CAPPED at ${cap} — more exist; re-run)` : ""}`);
if (declare) console.log(`  DECLARED   : ${declared} range(s), ${"declaredAppends" in r ? r.declaredAppends : 0} append(s)`);

if (r.scannedTicketed === 0) {
  console.log(`\n  ⚠️ NOT MEASURED — there are no ticketed rows in this window, so "no gaps" is vacuous.`);
} else if (r.gaps.length === 0) {
  console.log(`\n  Every ticket issued by every boot in this window landed in the table.`);
} else {
  console.log(`\n  ${r.gaps.length} range(s) of appends that were allocated and never written:`);
  for (const g of r.gaps.slice(0, 200)) {
    console.log(`    boot=${g.boot}  tickets ${g.from}..${g.to}  (${g.missing} append(s))  lost between ${g.afterAt} and ${g.beforeAt}`);
  }
  if (r.gaps.length > 200) console.log(`    … and ${r.gaps.length - 200} more`);
  if (!declare) console.log(`\n  Nothing was written. Re-run with --declare to enter these in the chain as audit.rows_missing.`);
}
console.log(
  `\n  ⛔ A TAIL LOSS IS NOT IN THIS COUNT. A process that died with its queue non-empty left no\n` +
  `     ticket above the hole to bound it. The mark of that is the ABSENCE of a system.shutdown_drain\n` +
  `     row for the boot — a boot whose marker landed at ticket T with 1..T all present wrote every\n` +
  `     append it ever issued.\n`,
);
process.exit(0);
