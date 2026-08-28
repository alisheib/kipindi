/**
 * RED PROOF for the AI CONSOLE VOCABULARIES (`npm run test:ai-vocabulary`).
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the suite EXIT NON-ZERO *and*
 * report the NAMED failing check. Every mutation is reverted and the file verified byte-for-byte
 * afterwards. A mutation whose anchor is missing is reported as PROVING NOTHING — never skipped
 * quietly, because a stale anchor is an ABSENT test that fails in the direction of looking fine.
 *
 * ⭐ TWO OF THE FIVE ARE THE DEFECTS AS THEY SHIPPED — the poll rail losing `other` (the
 * validator's documented fallback category) and the candidate rail losing `VERIFYING` (the
 * state a candidate sits in when verification hangs). Both are restored the way a hand-copied
 * list creates them in the first place: by omitting one member.
 *
 * ⭐ THE ONE MOST WORTH HAVING IS THE PHANTOM, and it is the mistake the SCAN ITSELF made. It
 * proposed deriving both rails from the poll categories; a MarketCandidate can never hold
 * `tech` or `other`, so that adds two filters which always return zero rows. A guard that only
 * hunts for MISSING members reads that as an improvement — which is exactly why every rule here
 * compares two SETS and names the difference in BOTH directions.
 *
 * ⭐ AND THE LAST IS THE REGRESSION THAT PASSES EVERYTHING ELSE: the canonical module stays
 * perfect, the import stays in place, and the rail simply re-types its own literal beside it.
 *
 * Run: npm run red:ai-vocabulary
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/ai-vocabulary.anchors.mjs";

// Run the suite directly rather than through the npm script, so nothing between npm and the
// assertions can masquerade as an assertion failure.
const GATE = "scripts/ai-vocabulary.test.mts";

const runGate = () => {
  try {
    execFileSync("npx", ["tsx", GATE], { encoding: "utf8", stdio: "pipe", shell: process.platform === "win32" });
    return { code: 0, out: "" };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

const base = runGate();
if (base.code !== 0) {
  console.error("REFUSING: test:ai-vocabulary is already RED on the untouched tree.");
  console.error(base.out.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 5).join("\n"));
  process.exit(1);
}
console.log("precondition: gate is GREEN on the untouched tree\n");

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
  const r = runGate();
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
const after = runGate();
if (after.code !== 0) problems.push("gate RED after restore");

console.log(`\n${caught}/${MUTATIONS.length} caught · files restored: ${unrestored.length === 0 ? "all" : unrestored.join(", ")} · green after restore: ${after.code === 0}`);
if (problems.length) { console.error("\nPROBLEMS:"); problems.forEach((p) => console.error("  ✗ " + p)); process.exit(1); }
console.log("RED PROOF COMPLETE");
