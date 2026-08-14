/**
 * A1 · RED HARNESS — the stake-bounds rule, and the shape of check that could not see it.
 *
 *   node scripts/stake-bounds-red.mjs
 *
 * ⭐ THE POINT OF THIS FILE. Before 2026-08-14 `test:config` asserted
 * `DEFAULT_GLOBAL_CONFIG.minStake === 1_000` and passed — for two and a half weeks, while
 * production charged a TZS 500 floor on BOTH products. The assertion was true and useless:
 * a code default is not a live setting, and nothing in the suite could tell them apart.
 * Mutation `constant-right-migration-missing` below reproduces exactly that state — the
 * constant correct, the migration absent — and the suite must go RED on it. If it ever
 * goes green again, the guard has drifted back to testing the constant.
 *
 * ⚠️ CRLF: an LF anchor silently fails to match a CRLF tree, the mutation never applies,
 * and the harness reports "defect not caught" as guard weakness. Every mutation matches
 * both line endings AND re-reads the file to confirm the anchor is gone from disk.
 *
 * ⚠️ POSITIVE CONTROL FIRST. A refusal check needs one in the same run, or fixing the
 * defect turns the check red and nobody can tell the two apart.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const MKT = new URL("../src/lib/server/market-config.ts", import.meta.url);
const UD = new URL("../src/lib/server/updown-config.ts", import.meta.url);
const PAY = new URL("../src/lib/payout.ts", import.meta.url);
const originals = new Map([[MKT, readFileSync(MKT, "utf8")], [UD, readFileSync(UD, "utf8")], [PAY, readFileSync(PAY, "utf8")]]);
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const CWD = new URL("..", import.meta.url);
const suiteFails = () => {
  try { execSync("npx tsx scripts/config-persist.test.mts", { cwd: CWD, stdio: "pipe" }); return false; }
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
    name: "constant-right-migration-missing",
    why: "⭐ THE ACTUAL 2026-08-14 STATE: minStake reads 1,000 in code and the reconcile cannot move a stored 500. This is what a whole green suite looked like while production charged 500",
    file: MKT,
    from: "    if (g.minStake === 500) { g.minStake = DEFAULT_GLOBAL_CONFIG.minStake; changed = true; }",
    to: "    // no v3 reconcile",
  },
  {
    name: "updown-floor-left-behind",
    why: "the poll product moves to 1,000 and Up & Down keeps its 500 floor — one rule, two answers, which is what 'both products' in the rule is there to stop",
    file: UD,
    from: '    bump("defaultMinStake", 500);',
    to: "    // no v3 min reconcile",
  },
  {
    name: "updown-ceiling-left-behind",
    why: "Up & Down keeps its TZS 100,000 ceiling, so the same bet is legal on a poll and refused on a round",
    file: UD,
    from: '    bump("defaultMaxStake", 100_000);\n  }\n  return { config: c, changed };',
    to: "  }\n  return { config: c, changed };",
  },
  {
    name: "migration-overwrites-a-deliberate-choice",
    why: "the reconcile stops checking the legacy value and rewrites ANY stored floor — a migration that overwrites an operator's deliberate 2,500 is worse than one that does nothing",
    file: MKT,
    from: "    if (g.minStake === 500) { g.minStake = DEFAULT_GLOBAL_CONFIG.minStake; changed = true; }",
    to: "    { g.minStake = DEFAULT_GLOBAL_CONFIG.minStake; changed = true; }",
  },
  {
    name: "migration-reruns-on-an-already-migrated-config",
    why: "the version gate goes, so the reconcile fires forever and an operator who deliberately sets 500 after the migration is silently overruled on the next boot",
    file: MKT,
    from: "  if (fromVersion < 3) {",
    to: "  if (true) {",
  },
  {
    name: "withdrawal-fee-back-to-1pct",
    why: "the cold-start fallback disagrees with the live 1.5% again — the disagreement the Terms page was quoting",
    file: PAY,
    from: "export const DEFAULT_WITHDRAWAL_FEE_RATE = 0.015;",
    to: "export const DEFAULT_WITHDRAWAL_FEE_RATE = 0.01;",
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
