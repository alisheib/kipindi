/**
 * red:backup-order — proves `test:backup` catches the ordering defects it names, each on its
 * OWN assertion. Same discipline as `red:timer-date` / `red:time-left`: reintroduce the REAL
 * defect, assert the gate goes red on THAT case's assertion rather than on some incidental
 * collapse, restore, and prove the gate is green again afterwards.
 *
 * ⛔ WHY THIS HARNESS EXISTS AT ALL. `test:backup` had 116 assertions and no red proof, and one
 * of them asserted the OPPOSITE of what is now correct — that a declared table holding an FK
 * into an undeclared one must ABORT the dump. It was a true statement about the old assembly
 * order, it was green every day, and it was green through the four nights the nightly backup
 * was dead for exactly that reason. **A gate nobody has watched fail is a gate nobody has
 * watched.**
 *
 * ⭐ THE MATCH IS ON `FAIL <label>`, NOT ON A SECTION NUMBER, so a defect caught for the wrong
 * reason cannot print PASS.
 *
 * ⛔ The anchors are DATA, in `scripts/anchors/backup-order.anchors.mjs`, so `test:red-anchors`
 * can audit that every one still resolves exactly once WITHOUT running this file.
 *
 * Run: npm run red:backup-order
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/backup-order.anchors.mjs";

// ⚠️ `test:backup` typechecks first (tsc -p tsconfig.backup.json) and several mutations are
// deliberately type-clean, so the suite itself is the signal — run it directly rather than
// through the npm script, so a tsc failure cannot masquerade as an assertion failure.
const GATE = "scripts/backup.test.mts";

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
  console.error("REFUSING: test:backup is already RED on the untouched tree.");
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
