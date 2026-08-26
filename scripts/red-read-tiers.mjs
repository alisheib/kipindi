/**
 * red:read-tiers — proves `test:read-tiers` catches the defects it names, each on its OWN
 * assertion. Reintroduce the REAL defect, assert the gate goes red on THAT case's assertion
 * rather than on some incidental collapse, restore, and prove the gate is green afterwards.
 *
 * ⭐ WHY THIS HARNESS IS NOT OPTIONAL FOR THIS PARTICULAR SUITE. READ_TIERS exists to REFUSE
 * things, and a refusal is the easiest property in software to assert vacuously — a selector
 * that matches nothing, a role with no row, a helper that returns false. Session 66 shipped
 * `E-225` the same day: a leg asserting an ABSENCE that had passed for a year because its
 * locator could never match. **A refusal suite with no RED proof is that finding waiting to
 * happen.**
 *
 * ⭐ `admin-exempted` IS THE CASE TO READ. It re-introduces the short-circuit the DOMAIN axis
 * legitimately has (`defaultGrant` returns all-true for ADMIN) into the READ axis, where ruling
 * D3 forbids it. ADMIN is the only account that exists on production, so an exempt ADMIN makes
 * the rule unwitnessable by any session anyone can open.
 *
 * ⭐ AND `nothing-is-readable` IS THE POSITIVE CONTROL IN MUTATION FORM: a tier where nobody can
 * read anything satisfies every refusal assertion in §2. It is caught only by the same-role
 * controls (2.6, 2.11, 2.12), which is exactly what those are for.
 *
 * ⭐ THE MATCH IS ON `FAIL <label>`, NOT ON A SECTION NUMBER, so a defect caught for the
 * wrong reason cannot print PASS.
 *
 * ⛔ The anchors are DATA, in `scripts/anchors/read-tiers.anchors.mjs`, so `test:red-anchors`
 * can audit that every one still resolves exactly once WITHOUT running this file.
 *
 * Run: npm run red:read-tiers
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/read-tiers.anchors.mjs";

// Run the suite directly rather than through the npm script, so nothing between npm and the
// assertions can masquerade as an assertion failure.
// ⛔ EACH MUTATION IS CHECKED AGAINST THE SUITE THAT OWNS IT, NOT AGAINST ONE FIXED GATE.
// The axis is proved by two suites: read-tiers (the model + runtime) and player-page-reads (the
// one surface it actually changes). Running every mutation against a single gate would report
// the page mutations as NOT CAUGHT while the guard that owns them was working perfectly — a
// harness blaming the product for its own wiring, which is the failure this repo keeps paying for.
const GATES = {
  "read-tiers": "scripts/read-tiers.test.mts",
  "player-page-reads": "scripts/player-page-reads.test.mts",
};

const runGate = (suite) => {
  const gate = GATES[suite];
  if (!gate) throw new Error(`no gate registered for suite "${suite}"`);
  try {
    execFileSync("npx", ["tsx", gate], { encoding: "utf8", stdio: "pipe", shell: process.platform === "win32" });
    return { code: 0, out: "" };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

for (const [suite, gate] of Object.entries(GATES)) {
  const base = runGate(suite);
  if (base.code !== 0) {
    console.error(`REFUSING: ${gate} is already RED on the untouched tree.`);
    console.error(base.out.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 5).join("\n"));
    process.exit(1);
  }
}
console.log(`precondition: all ${Object.keys(GATES).length} gates GREEN on the untouched tree\n`);

const originals = new Map();
for (const f of new Set(MUTATIONS.map((c) => c.file))) originals.set(f, readFileSync(f, "utf8"));

let caught = 0;
const problems = [];
for (const [i, c] of MUTATIONS.entries()) {
  const original = originals.get(c.file);
  let mutated;
  try { mutated = injectDefect(original, c.from, c.to); }
  catch (e) { problems.push(`case ${i + 1} (${c.name}): ANCHOR — ${e.message}`); console.log(`  ${i + 1}. ANCHOR FAIL  ${c.name}`); continue; }
  writeFileSync(c.file, mutated, "utf8");
  const r = runGate(c.suite);
  writeFileSync(c.file, original, "utf8");

  if (r.code === 0) {
    problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    console.log(`  ${i + 1}. NOT CAUGHT   ${c.name}`);
  } else if (!r.out.includes(`FAIL ${c.expect}`)) {
    const lines = r.out.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 3).map((l) => l.trim());
    problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${lines.join(" | ") || "(no FAIL line)"}`);
    console.log(`  ${i + 1}. WRONG REASON ${c.name}`);
  } else {
    caught++;
    console.log(`  ${i + 1}. caught      ${c.name}  →  ${c.expect}`);
  }
}

// ⚠️ RESTORATION IS MEASURED, NOT INFERRED FROM `problems.length`. The house harnesses
// print `restored: ${problems.length === 0}`, which reports FALSE whenever any case failed
// for any reason — so a run whose files were restored perfectly still says the tree may be
// dirty, and a reader who trusts that line goes looking for damage that is not there. The
// question "did every file go back?" has its own answer.
const unrestored = [...originals].filter(([f, original]) => readFileSync(f, "utf8") !== original).map(([f]) => f);
for (const f of unrestored) problems.push(`${f} NOT RESTORED — the working tree is dirty`);
const after = Object.keys(GATES).map((su) => runGate(su)).find((x) => x.code !== 0) ?? { code: 0 };
if (after.code !== 0) problems.push("a gate is RED after restore");

console.log(`\n${caught}/${MUTATIONS.length} caught · files restored: ${unrestored.length === 0 ? "all" : unrestored.join(", ")} · green after restore: ${after.code === 0}`);
if (problems.length) { console.error("\nPROBLEMS:"); problems.forEach((p) => console.error("  ✗ " + p)); process.exit(1); }
console.log("RED PROOF COMPLETE");
