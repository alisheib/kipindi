/**
 * red:timer-date — proves `test:timer-date` catches the defects it names, each on its OWN
 * assertion. Same discipline as `red:time-left` / `red:reset-identifier`: reintroduce the REAL
 * defect, assert the gate goes red on THAT case's assertion rather than on some incidental
 * collapse, restore, and prove the gate is green again afterwards.
 *
 * ⭐ THE MATCH IS ON `FAIL <label>`, NOT ON A SECTION NUMBER. Several of these mutations legally
 * turn TWO assertions red at once (removing the date also removes the thing §3 reads). Matching a
 * bare "3:" would let any of the dozen §3 lines satisfy any §3 case, so a mutation caught for the
 * wrong reason would still print PASS — the shape this campaign keeps paying for.
 *
 * ⛔ The anchors are DATA, in `scripts/anchors/timer-date.anchors.mjs`, so `test:red-anchors` can
 * audit that every one still resolves exactly once WITHOUT running this file.
 *
 * Run: npm run red:timer-date
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/timer-date.anchors.mjs";

const GATE = "scripts/timer-date.test.mts";

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
  console.error("REFUSING: test:timer-date is already RED on the untouched tree.");
  console.error(base.out.slice(0, 1500));
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

for (const [f, original] of originals) {
  if (readFileSync(f, "utf8") !== original) problems.push(`${f} not restored`);
}
const after = runGate();
if (after.code !== 0) problems.push("gate RED after restore");

console.log(`\n${caught}/${MUTATIONS.length} caught · restored: ${problems.length === 0} · green after restore: ${after.code === 0}`);
if (problems.length) { console.error("\nPROBLEMS:"); problems.forEach((p) => console.error("  ✗ " + p)); process.exit(1); }
console.log("RED PROOF COMPLETE");
