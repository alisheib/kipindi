#!/usr/bin/env node
/**
 * RED PROOF for `npm run test:lifecycle-reach`.
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the gate EXIT NON-ZERO *and* report
 * a failure naming the right thing — `expect` is matched against the gate's output, so a mutation
 * that goes red for an unrelated reason is reported as WRONG REASON rather than as caught. A
 * harness that cannot be wrong about WHY is worth more than one more case.
 *
 * ⛔ AND A MISSING ANCHOR IS REPORTED, NEVER SKIPPED. A stale anchor is an ABSENT test that fails
 * in the direction of looking fine — this repo has a recorded case of exactly that, where a red
 * harness carried an `expect` on every case that nothing read and proved "went red" rather than
 * "red on its own assertion".
 *
 * ⚠️ NO SERVER NEEDED — the gate under proof is static, so this is a straight mutate/run/restore.
 * The tree is restored by COMPARISON rather than by assumption, and the gate is re-run afterwards
 * to prove it is genuinely back.
 *
 * Run: npm run red:lifecycle-reach
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/lifecycle-reach.anchors.mjs";

const runGate = () => {
  try {
    return { code: 0, out: execFileSync("npx", ["tsx", "scripts/lifecycle-reach.test.mts"], { encoding: "utf8", stdio: "pipe", shell: true }) };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

const base = runGate();
if (base.code !== 0) {
  console.error("REFUSING: test:lifecycle-reach is already RED on the untouched tree — fix that first, or a mutation cannot be shown to cause anything.");
  console.error(base.out.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 6).join("\n"));
  process.exit(1);
}
console.log("precondition: the gate is GREEN on the untouched tree\n");

const originals = new Map();
for (const f of new Set(MUTATIONS.map((c) => c.file))) originals.set(f, readFileSync(f, "utf8"));

let caught = 0;
const problems = [];
for (const [i, c] of MUTATIONS.entries()) {
  const original = originals.get(c.file);
  let mutated;
  try { mutated = injectDefect(original, c.from, c.to); }
  catch (e) {
    problems.push(`case ${i + 1} (${c.name}): ANCHOR — ${e.message}`);
    console.log(`  ${i + 1}. ANCHOR FAIL  ${c.name}`);
    continue;
  }
  writeFileSync(c.file, mutated, "utf8");
  const r = runGate();
  writeFileSync(c.file, original, "utf8");

  if (r.code === 0) {
    problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    console.log(`  ${i + 1}. NOT CAUGHT   ${c.name}`);
  } else if (!r.out.includes(c.expect)) {
    const lines = r.out.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 3).map((l) => l.trim());
    problems.push(`case ${i + 1} (${c.name}): red, but no failure mentioned "${c.expect}" — got ${lines.join(" | ") || "(no FAIL line)"}`);
    console.log(`  ${i + 1}. WRONG REASON ${c.name}`);
  } else {
    caught++;
    console.log(`  ${i + 1}. caught       ${c.name}  →  ${c.expect}`);
  }
}

// ⚠️ RESTORATION IS MEASURED, NOT INFERRED.
const unrestored = [...originals].filter(([f, o]) => readFileSync(f, "utf8") !== o).map(([f]) => f);
for (const f of unrestored) problems.push(`${f} NOT RESTORED — the working tree is dirty`);
const after = runGate();
if (after.code !== 0) problems.push("the gate is RED after restore");

console.log(`\n${caught}/${MUTATIONS.length} cases caught · files restored: ${unrestored.length === 0 ? "all" : unrestored.join(", ")} · green after restore: ${after.code === 0}`);
if (problems.length) { console.error("\nPROBLEMS:"); problems.forEach((p) => console.error("  ✗ " + p)); process.exit(1); }
if (caught === 0) { console.error("\n✗ ZERO cases exercised — this run proves nothing about the gate."); process.exit(1); }
console.log("RED PROOF COMPLETE — test:lifecycle-reach refuses every defect it names.");
