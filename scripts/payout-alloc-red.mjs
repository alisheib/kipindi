/**
 * E-200 · RED HARNESS — the winner set the allocator is fed.
 *
 *   node scripts/payout-alloc-red.mjs
 *
 * ⭐ THE POINT OF THIS FILE. Both largest-remainder allocators document one precondition —
 * `Σ(stake over winners) == winningPool` — and NOTHING enforced it, because the winner set
 * was chosen inline inside `settleMarket`. On 2026-08-24 `mkt_c97209dbe6e1fa584472` closed
 * with a POOL residual of +15: a CASHED_OUT position on the winning side, whose stake had
 * already left the pool, was counted as a winner, `remainder` went negative, and the top-up
 * loop was skipped in silence. Thirteen winners were paid 185,498 instead of 185,505.
 *
 * ⛔ AND FOUR MONEY SUITES WERE GREEN OVER IT. The overall ledger still summed to zero — the
 * error sits inside a self-cancelling POOL/COMMISSION pair, the same shape that hid the
 * 2026-08-11 commission defect. An aggregate that balances is not evidence that its
 * components do. Each mutation restores one flavour of the defect and `test:payout-alloc`
 * must go RED on every one.
 *
 * ⚠️ THE MUTATIONS ARE A SIDECAR (`anchors/payout-alloc.anchors.mjs`), so `test:red-anchors`
 * can audit that every anchor still resolves exactly once WITHOUT running this file. One
 * definition, imported by both — a copy here could drift from the copy it audits.
 *
 * ⚠️ POSITIVE CONTROL FIRST, and again at the end. A refusal check needs one in the same run,
 * or fixing the defect turns the check red and nobody can tell the two apart.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { MUTATIONS } from "./anchors/payout-alloc.anchors.mjs";

const CWD = new URL("..", import.meta.url);
const abs = (repoRelative) => new URL(`../${repoRelative}`, import.meta.url);

// Snapshot every file any mutation touches, so the restore set cannot omit one.
// `red:failure-reasons` once printed "tree restored" while leaving two mutations on
// disk, because its restore list was hard-coded and did not include the file it had
// started mutating. Deriving the set from MUTATIONS makes that impossible.
const files = new Map();
for (const m of MUTATIONS) if (!files.has(m.file)) files.set(m.file, readFileSync(abs(m.file), "utf8"));
const restore = () => { for (const [f, s] of files) writeFileSync(abs(f), s); };

const suiteFails = () => {
  try { execSync("npx tsx scripts/payout-allocation.test.mts", { cwd: CWD, stdio: "pipe" }); return false; }
  catch { return true; }
};

restore();
if (suiteFails()) {
  console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red.");
  console.error("  A red below would be indistinguishable from red-on-everything. Fix the suite first.");
  process.exit(1);
}
console.log("  ✓ CONTROL  the unmutated tree is GREEN — a red below is caused by the mutation\n");

let proven = 0, missed = 0, broken = 0;
for (const m of MUTATIONS) {
  restore();
  const src = readFileSync(abs(m.file), "utf8");
  // ⛔ REFUSE, NEVER GUESS. A no-op replace would run the suite against a clean tree and
  // report "defect not caught" — guard weakness — over a mutation that never happened.
  if (!src.includes(m.from)) {
    console.log(`  ✗ BROKEN   ${m.name}  — anchor no longer resolves in ${m.file}`);
    console.log(`              the HARNESS is stale, not the guard. Re-anchor before trusting any verdict.`);
    broken++;
    continue;
  }
  writeFileSync(abs(m.file), src.replace(m.from, m.to));
  if (readFileSync(abs(m.file), "utf8").includes(m.from)) {
    console.log(`  ✗ BROKEN   ${m.name}  — mutation did not reach disk`);
    broken++;
    continue;
  }
  if (suiteFails()) { proven++; console.log(`  ✓ CAUGHT   ${m.name}\n              ${m.why}`); }
  else { missed++; console.log(`  ✗ MISSED   ${m.name}  — the guard did NOT go red\n              ${m.why}`); }
}

restore();
if (suiteFails()) {
  console.error("\n✗ POSITIVE CONTROL FAILED AFTER RESTORE — the tree did not come back clean.");
  process.exit(1);
}

// ⛔ The last word is about the TREE, not about the checks.
let dirty = 0;
for (const [f, s] of files) if (readFileSync(abs(f), "utf8") !== s) dirty++;
console.log(`\n  ${proven}/${MUTATIONS.length} proven · ${missed} missed · ${broken} broken · ${dirty} file(s) left modified`);
if (missed > 0 || broken > 0 || dirty > 0) process.exit(1);
