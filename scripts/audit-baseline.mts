/**
 * THE UNVERIFIABLE BASELINE — declare, once and by hand, which rows the chain admits it cannot
 * re-verify, so that everything else that fails to recompute can be called what it is: an EDIT.
 *
 *   npx tsx scripts/audit-baseline.mts                                   # census only, writes nothing
 *   npx tsx scripts/audit-baseline.mts --declare --yes-write-to-this-database
 *
 * ⛔ READ `src/lib/server/audit.ts` (UNVERIFIABLE_BASELINE_ACTION) BEFORE RUNNING THIS. It is a
 * compliance statement, not a maintenance chore: the operator is recording "these N rows predate the
 * current signing regime and I accept them as they stand", and that acceptance is permanent and
 * chained. Afterwards, ANY row that fails to recompute outside it makes `verifyChainFull()` return
 * `valid:false` on every surface that renders it.
 *
 * ⛔ SO DO NOT RUN IT TO MAKE A RED CHECK GO GREEN. A baseline declared over rows that were EDITED
 * launders the edit into the record, permanently, under an operator's name. The census below prints
 * what it is about to attest to and — when it can — a sample of the rows, precisely so the decision
 * is made with the rows in front of the person making it. If the count is not what the platform's
 * history predicts, stop and find out why first.
 *
 * ⛔ DRY RUN IS THE DEFAULT, and `--declare` against a non-loopback database additionally demands
 * `--yes-write-to-this-database`, `--by <officer id>` and `--expect-digest <sha256>`.
 *
 * ⭐ `--expect-digest` IS THE DIGEST THE OFFICER REVIEWED, and the declaration is REFUSED if the census
 * taken at write time differs (2026-09-26). A census and a declaration are two runs; a row that stopped
 * verifying between them would otherwise be accepted, permanently, without anyone having seen it.
 */
import { censusUnverifiable, readUnverifiableBaseline, UNVERIFIABLE_BASELINE_ACTION, audit, verifyChainFull } from "../src/lib/server/audit";

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(`--${f}`);
const str = (f: string, dflt: string): string => {
  const i = argv.indexOf(`--${f}`);
  return i === -1 ? dflt : (argv[i + 1] ?? dflt);
};

const RAW = process.env.DATABASE_URL ?? "";
if (!RAW) {
  console.error("!! DATABASE_URL is not set. The baseline is a census of the persisted chain; with no database there is no chain.");
  process.exit(2);
}
let host = "";
try { host = new URL(RAW).hostname; } catch { host = "(unparseable)"; }
const loopback = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(host);
const declare = has("declare");
const by = str("by", "");

if (declare && !loopback && !has("yes-write-to-this-database")) {
  console.error(
    `!! --declare would APPEND a compliance declaration to the audit chain on ${host}, which is not a\n` +
    `   loopback database. Re-run with --yes-write-to-this-database if that is genuinely the database\n` +
    `   you mean. (Census — without --declare — reads and writes nothing; start there.)`,
  );
  process.exit(2);
}
const expectDigest = str("expect-digest", "");
if (declare && !loopback && (!by || !/^[0-9a-f]{64}$/.test(expectDigest))) {
  console.error(
    `!! A declaration on ${host} needs --by <officer id> (whose acceptance this is) and\n` +
    `   --expect-digest <the 64-hex DIGEST from the census the officer reviewed>.`,
  );
  process.exit(2);
}

console.log(`\naudit-baseline — database host ${host}${loopback ? " (loopback)" : ""}`);
console.log(`  mode       : ${declare ? `DECLARE (appends one ${UNVERIFIABLE_BASELINE_ACTION} row)` : "CENSUS (reads only)"}`);

const existing = await readUnverifiableBaseline();
if (existing) {
  console.log(`\n  A BASELINE IS ALREADY IN FORCE:`);
  console.log(`    entry      : ${existing.entryId}`);
  console.log(`    declared   : ${existing.declaredAt}${existing.declaredBy ? ` by ${existing.declaredBy}` : ""}`);
  console.log(`    covers     : seq <= ${existing.frontierSeq}`);
  console.log(`    count      : ${existing.count} unverifiable row(s)`);
  console.log(`    digest     : ${existing.digest}`);
  console.log(`  ⚠️ Declaring again does not replace it — the older declaration stays in the chain forever.`);
  console.log(`     Re-declare only when a KEY was legitimately retired (AUDIT_CHAIN_SECRET_PREVIOUS) or the`);
  console.log(`     frontier must genuinely move; never to silence a finding.`);
}

const census = await censusUnverifiable();
// ⚠️ NOT "seq 1 ..": the table's first surviving row is not seq 1 (production's began at 266,304 on
// 2026-09-11), so the population is stated as what was walked, up to the frontier.
console.log(`\n  POPULATION : ${census.scanned} row(s) walked, up to seq ${census.frontierSeq}`);
console.log(`  UNVERIFIABLE: ${census.count} row(s) recompute under no known signing key`);
if (census.sample.length) {
  // ⭐ THE ROWS, IN FRONT OF THE PERSON DECIDING — identity only. If these are not all from the era the
  // platform's history predicts (the pre-AUDIT_CHAIN_SECRET fallback, pre-normalisation writes), STOP.
  console.log(`\n  THE ROWS (first ${census.sample.length}${census.count > census.sample.length ? ` of ${census.count}` : ""}, chain order):`);
  for (const r of census.sample) {
    console.log(`    seq ${r.seq}  ${r.createdAt}  ${r.category.padEnd(10)} ${r.action}  ${r.id}${r.beyondFrontier ? "  (beyond frontier)" : ""}`);
  }
}
console.log(`  DIGEST     : ${census.digest}`);

if (census.scanned === 0) {
  console.log(`\n  ⚠️ NOT MEASURED — the table is empty. A baseline over nothing attests to nothing.`);
  process.exit(0);
}
if (census.count === 0) {
  console.log(`\n  Every row recomputes. ⭐ No baseline is needed: verifyChainFull() already reports valid`);
  console.log(`  over this chain, and any FUTURE row that stops recomputing will make it false on its own.`);
  if (!declare) process.exit(0);
}

if (!declare) {
  console.log(`\n  Nothing was written. Re-run with --declare to record this census in the chain.`);
  console.log(`  ⛔ Before you do: ${census.count} row(s) will be permanently accepted as un-attestable.`);
  process.exit(0);
}

if (expectDigest && expectDigest !== census.digest) {
  console.error(
    `\n!! REFUSED — the census at write time (digest ${census.digest}, ${census.count} row(s)) is NOT the one\n` +
    `   the officer reviewed (${expectDigest}). Something changed between the two runs: census again, look\n` +
    `   at the rows, and decide again. Nothing was written.`,
  );
  process.exit(2);
}

const entry = await audit({
  category: "COMPLIANCE",
  action: UNVERIFIABLE_BASELINE_ACTION,
  actorId: by || null,
  targetType: null,
  targetId: null,
  payload: {
    frontierSeq: census.frontierSeq,
    count: census.count,
    digest: census.digest,
    scanned: census.scanned,
    supersedes: existing?.entryId ?? null,
    note:
      "Rows at or below frontierSeq that recompute under no known signing key are ACCEPTED as "
      + "predating the current regime. Their exact stored content is fixed by `digest`. Any row "
      + "outside this declaration that fails to recompute is an in-place EDIT and makes "
      + "verifyChainFull() return valid:false.",
  },
});
console.log(`\n  DECLARED   : ${entry.id} at ${entry.createdAt}`);

// ⛔ THE DECLARATION IS RE-READ AND THE CHAIN RE-VERIFIED, HERE, NOW. A baseline that does not
// actually make the check pass is worse than none — the operator would walk away believing the
// record was settled. Driven, never assumed.
const after = await verifyChainFull();
console.log(`  VERIFY     : valid=${after.valid} baselined=${after.baselined ?? 0} unattested=${after.unattested ?? 0} linkBroken=${after.linkBroken ?? false}`);
if (!after.valid) {
  console.error(`\n  !! The chain is STILL not valid after the declaration: ${after.firstBreakAt ?? "(no reason given)"}`);
  console.error(`     That is a finding, not a failure of this script. Do not re-run it to try to clear it.`);
  process.exit(1);
}
console.log();
process.exit(0);
