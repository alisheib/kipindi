/**
 * THE COMPLIANCE-ROW SWEEP — find (and, on request, declare) bets with no statutory audit row.
 *
 *   npx tsx scripts/audit-gap-sweep.mts                      # dry run, last 24 h
 *   npx tsx scripts/audit-gap-sweep.mts --hours 720          # dry run, last 30 days
 *   npx tsx scripts/audit-gap-sweep.mts --all                # dry run, all history
 *   npx tsx scripts/audit-gap-sweep.mts --all --declare --yes-write-to-this-database
 *
 * ⛔ WHY IT EXISTS SEPARATELY FROM THE LIFECYCLE CHORE. `lifecycle.ts` sweeps a rolling 24 h every
 * five minutes, which keeps the register current from the day it ships. It does NOT reach the holes
 * that accumulated BEFORE it existed — and those are the ones nobody has ever been able to count.
 * This is the backfill: any window, run by hand, once.
 *
 * ⛔ IT CANNOT RESTORE A ROW, AND `--declare` DOES NOT PRETEND TO. The audit log is append-only, so
 * the missing entry can never be added; what `--declare` writes is a chained `audit.row_missing` row
 * RECORDING that the entry is absent, dated now. Read `src/lib/server/audit-reconcile.ts` before
 * running it against anything that matters.
 *
 * ⛔ DRY RUN IS THE DEFAULT. Without `--declare` this script writes nothing at all. With `--declare`
 * against a non-loopback database it additionally demands `--yes-write-to-this-database`, so a
 * production URL sitting in the shell cannot be swept into by a half-typed command.
 */
import { declareBetAuditGaps, findBetAuditGaps, RECONCILE_DECLARE_CAP, RECONCILE_GRACE_MS } from "../src/lib/server/audit-reconcile";

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
  console.error("!! DATABASE_URL is not set. This reconciles a durable Position table against a durable audit chain;\n   with no database there is neither.");
  process.exit(2);
}
let host = "";
try { host = new URL(RAW).hostname; } catch { host = "(unparseable)"; }
const loopback = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(host);

const hours = has("all") ? 24 * 365 * 20 : num("hours", 24);
const cap = num("cap", RECONCILE_DECLARE_CAP);
const declare = has("declare");

if (declare && !loopback && !has("yes-write-to-this-database")) {
  console.error(
    `!! --declare would APPEND to the audit chain on ${host}, which is not a loopback database.\n` +
    `   Re-run with --yes-write-to-this-database if that is genuinely the database you mean.\n` +
    `   (Dry run — without --declare — reads and writes nothing; start there.)`,
  );
  process.exit(2);
}

const opts = { lookbackMs: hours * 60 * 60 * 1000, cap };
console.log(`\naudit-gap-sweep — database host ${host}${loopback ? " (loopback)" : ""}`);
console.log(`  window     : last ${hours} h, ending ${Math.round(RECONCILE_GRACE_MS / 60000)} min ago (the grace — nothing younger is judged)`);
console.log(`  mode       : ${declare ? "DECLARE (appends audit.row_missing rows)" : "DRY RUN (reads only)"}`);
console.log(`  cap        : ${cap} declaration(s) per run\n`);

const r = declare ? await declareBetAuditGaps(opts) : await findBetAuditGaps(opts);
const declared = "declared" in r ? r.declared : 0;

// ⭐ THE POPULATION FIRST, ALWAYS. A sweep that found nothing over zero positions has established
// nothing, and the two outcomes read identically unless the scanned count is printed.
console.log(`  POPULATION : ${r.scanned} position(s) committed in ${r.windowFrom} .. ${r.windowUntil}`);
console.log(`  GAPS       : ${r.gaps.length}${r.capped ? ` (CAPPED at ${cap} — more exist; re-run)` : ""}`);
if (declare) console.log(`  DECLARED   : ${declared}`);

if (r.gaps.length === 0) {
  console.log(`\n  Every committed bet in this window has its market.position.opened row.`);
} else {
  const house = r.gaps.filter((g) => g.houseBotId).length;
  console.log(`\n  ${r.gaps.length} bet(s) with NO compliance row — ${house} placed by a house bot, ${r.gaps.length - house} by a player:`);
  for (const g of r.gaps.slice(0, 200)) {
    console.log(`    ${g.placedAt}  ${g.positionId}  player=${g.userId}  market=${g.marketId}  stake=${g.stake}${g.houseBotId ? `  bot=${g.houseBotId}` : ""}`);
  }
  if (r.gaps.length > 200) console.log(`    … and ${r.gaps.length - 200} more`);
  if (!declare) console.log(`\n  Nothing was written. Re-run with --declare to enter these in the chain as audit.row_missing.`);
}
console.log();
process.exit(0);
