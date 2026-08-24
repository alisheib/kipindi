/**
 * RED HARNESS — recovery accepts a phone OR an email (2026-08-25).
 *
 *   node scripts/reset-identifier-red.mjs
 *
 * ⭐ THE POINT OF THIS FILE. `requestPasswordReset` took a PHONE and nothing else, so a
 * player who registered with an email and remembered only that had no route back into
 * their account — while the sign-in page one click away already offered a Phone/Email
 * switcher. 66 of 100 production accounts carry an email. Each mutation below restores
 * one way that can regress, and `test:reset-identifier` must go RED on every one.
 *
 * ⛔ AND THE INTERESTING FAILURE IS NOT THE MISSING FEATURE. `enumeration-oracle` keeps
 * the feature working perfectly and makes the NEGATIVE branch throw. Nothing looks
 * broken — the page still redirects to "sent" — but the error shape and timing now
 * differ between a hit and a miss, which is an existence oracle on an unauthenticated
 * endpoint. A guard that only checked "a link is sent" would stay green through it.
 *
 * ⚠️ THE MUTATIONS ARE A SIDECAR (`anchors/reset-identifier.anchors.mjs`), so
 * `test:red-anchors` can audit that every anchor still resolves exactly once WITHOUT
 * running this file. One definition, imported by both — a copy here could drift from
 * the copy that is audited.
 *
 * ⚠️ POSITIVE CONTROL FIRST, and again after restore. A refusal check needs one in the
 * same run, or fixing the defect turns the check red and nobody can tell the two apart.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { MUTATIONS } from "./anchors/reset-identifier.anchors.mjs";

const CWD = new URL("..", import.meta.url);
const abs = (p) => new URL(`../${p}`, import.meta.url);

// Derive the restore set FROM the mutations, never a hand-list: `red:failure-reasons`
// once printed "tree restored" while leaving two mutations on disk, because its list
// was hard-coded and did not include the seventh file it had started mutating.
const files = new Map();
for (const m of MUTATIONS) if (!files.has(m.file)) files.set(m.file, readFileSync(abs(m.file), "utf8"));
const restore = () => { for (const [f, s] of files) writeFileSync(abs(f), s); };

const suiteFails = () => {
  try { execSync("npx tsx scripts/reset-identifier.test.mts", { cwd: CWD, stdio: "pipe" }); return false; }
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
  // ⛔ REFUSE, NEVER GUESS. A no-op replace would run the suite against a clean tree
  // and report "defect not caught" — guard weakness — over a mutation that never ran.
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
