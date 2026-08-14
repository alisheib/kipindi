/**
 * A2/A3 · RED HARNESS — the fee cutover, and the four ways it could go wrong.
 *
 *   node scripts/updown-cutover-red.mjs
 *
 * ⭐ TWO OF THESE ARE THE MISTAKES, NOT THE BUG. `not-switched` is the whole change failing
 * to happen; `history-repriced` is the change happening TO HISTORY — a build where the
 * legacy rounds silently start settling by the new maths. A suite that only checked the new
 * rate would be green on the second one, and 4,146 production rounds would settle wrong.
 *
 * ⚠️ CRLF: an LF anchor silently fails to match a CRLF tree, the mutation never applies, and
 * the harness reports "defect not caught" as guard weakness. Every mutation matches both
 * line endings AND re-reads the file to confirm the anchor is gone from disk.
 *
 * ⚠️ POSITIVE CONTROL FIRST — a refusal check needs one in the same run, or fixing the
 * defect turns the check red and nobody can tell the two apart.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const UD = new URL("../src/lib/server/updown-config.ts", import.meta.url);
const PAY = new URL("../src/lib/payout.ts", import.meta.url);
const originals = new Map([[UD, readFileSync(UD, "utf8")], [PAY, readFileSync(PAY, "utf8")]]);
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const CWD = new URL("..", import.meta.url);
const suiteFails = () => {
  try { execSync("npx tsx scripts/updown-fee-cutover.test.mts", { cwd: CWD, stdio: "pipe" }); return false; }
  catch { return true; }
};

restore();
if (suiteFails()) {
  console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red.");
  console.error("  A red below would be indistinguishable from red-on-everything. Fix the suite first.");
  process.exit(1);
}
console.log("  ✓ CONTROL  the unmutated tree is GREEN — a red below is caused by the mutation\n");

const MUTATIONS = [
  {
    name: "not-switched",
    why: "the product default stays on capped-commission, so every NEW Up & Down round keeps charging 13% of the pool with a ⅓ ceiling — the change simply never happened",
    file: UD,
    from: '    feeModel: "loser-share",\n    platformFeeRate: 0.03,\n    operatorFeeRate: 0.10,',
    to: '    feeModel: "capped-commission",\n    commissionRate: 0.13,',
  },
  {
    name: "history-repriced",
    why: "⭐ THE MISTAKE, NOT THE BUG. `poolFee` stops reading the frozen model and charges loser-share for everything — the 4,146 legacy rounds on production would settle by maths they never froze. The no-mix guarantee is what this catches",
    file: PAY,
    from: '  if (r.feeModel === "loser-share") {',
    to: "  if (true) {",
  },
  {
    name: "migration-missing",
    why: "the constant moves but the persisted config does not, so production keeps minting capped-commission rounds from a stale `defaultRateProfile` — exactly how the stake floor sat wrong for 19 days",
    file: UD,
    from: "    if (isRetiredDefault) {",
    to: "    if (false) {",
  },
  {
    name: "migration-overwrites-a-deliberate-profile",
    why: "the reconcile stops checking the retired shape and rewrites ANY stored profile, so an operator's deliberate 9% / 25% choice is silently replaced on the next boot",
    file: UD,
    from: "    const isRetiredDefault =\n      p.feeModel === \"capped-commission\" &&\n      p.commissionRate === 0.13 &&\n      Math.abs((p.feeCeilingRate ?? 0) - 1 / 3) < 1e-9;",
    to: "    const isRetiredDefault = p.feeModel === \"capped-commission\";",
  },
  {
    name: "chain-profile-stops-winning",
    why: "`rateProfileFor` prefers the product default over the chain's own frozen profile — every legacy chain silently adopts the new model, which is the migration doing itself by accident and without an audit row",
    file: UD,
    from: "  return (chain.rateProfile as Partial<RateConfig> | null) ?? cfg.defaultRateProfile;",
    to: "  return cfg.defaultRateProfile;",
  },
  {
    name: "loser-share-charges-the-whole-pool",
    why: "the fee is taken on the POOL rather than the losing side, which is the number the retired model produced and the one an operator might 'restore' to protect income",
    file: PAY,
    from: "  const fee = loserRate * losingPool;",
    to: "  const fee = loserRate * pool;",
  },
];

let caught = 0;
const problems = [];

for (const m of MUTATIONS) {
  restore();
  const src = readFileSync(m.file, "utf8");
  const asCRLF = m.from.replace(/\n/g, "\r\n");
  const anchor = src.includes(m.from) ? m.from : src.includes(asCRLF) ? asCRLF : null;
  if (anchor === null) { problems.push(`${m.name} — HARNESS ERROR: anchor not found`); continue; }

  writeFileSync(m.file, src.replace(anchor, anchor === asCRLF ? m.to.replace(/\n/g, "\r\n") : m.to));
  if (readFileSync(m.file, "utf8").includes(anchor)) {
    problems.push(`${m.name} — HARNESS ERROR: anchor still present after write`); continue;
  }

  if (suiteFails()) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
