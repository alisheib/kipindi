/**
 * red:landing-contract — proves `test:landing-contract` catches the defects it names, each on its
 * own assertion. Same discipline as `red:ticker-honesty`: reintroduce the real defect, assert the
 * gate goes red on THAT case's assertion (not on some incidental collapse), then restore.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";


// ⭐ The cases are DATA in `scripts/anchors/landing-contract.anchors.mjs`, audited by `test:red-anchors` §3.
import { MUTATIONS as CASES } from "./anchors/landing-contract.anchors.mjs";

const runGate = () => {
  try {
    execFileSync("npx", ["tsx", "scripts/landing-contract.test.mts"], { encoding: "utf8", stdio: "pipe", shell: process.platform === "win32" });
    return { code: 0, out: "" };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

const base = runGate();
if (base.code !== 0) {
  console.error("REFUSING: test:landing-contract is already RED on the untouched tree.");
  console.error(base.out.slice(0, 1200));
  process.exit(1);
}
console.log("precondition: gate is GREEN on the untouched tree\n");

const originals = new Map();
for (const f of new Set(CASES.map((c) => c.file))) originals.set(f, readFileSync(f, "utf8"));

let caught = 0;
const problems = [];
for (const [i, c] of CASES.entries()) {
  const original = originals.get(c.file);
  let mutated;
  try { mutated = injectDefect(original, c.from, c.to); }
  catch (e) { problems.push(`case ${i + 1}: ANCHOR — ${e.message}`); console.log(`  ${i + 1}. ANCHOR FAIL  ${c.name}`); continue; }
  writeFileSync(c.file, mutated, "utf8");
  const r = runGate();
  writeFileSync(c.file, original, "utf8");

  if (r.code === 0) { problems.push(`case ${i + 1} (${c.name}): stayed GREEN`); console.log(`  ${i + 1}. NOT CAUGHT   ${c.name}`); }
  else if (!r.out.includes(c.expect)) {
    const lines = r.out.split("\n").filter((l) => l.includes("✗")).slice(0, 3);
    problems.push(`case ${i + 1} (${c.name}): red, but not on ${c.expect} — ${lines.join(" | ")}`);
    console.log(`  ${i + 1}. WRONG REASON ${c.name}`);
  } else { caught++; console.log(`  ${i + 1}. caught on ${c.expect.padEnd(12)} ${c.name}`); }
}

for (const [f, original] of originals) {
  if (readFileSync(f, "utf8") !== original) problems.push(`${f} not restored`);
}
const after = runGate();
if (after.code !== 0) problems.push("gate RED after restore");

console.log(`\n${caught}/${CASES.length} caught · restored: ${problems.length === 0} · green after restore: ${after.code === 0}`);
if (problems.length) { console.error("\nPROBLEMS:"); problems.forEach((p) => console.error("  ✗ " + p)); process.exit(1); }
console.log("RED PROOF COMPLETE");
