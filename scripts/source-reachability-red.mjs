/**
 * RED PROOF for the source-reachability gate (`npm run test:source-reachability`).
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation below must make the suite EXIT
 * NON-ZERO *and* print that case's own `FAIL <expect>` line. A run that goes red for a
 * different reason is reported as WRONG REASON, never as a pass — otherwise a harness can
 * certify a guard that is only ever failing on something else.
 *
 * ⛔ AN ANCHOR THAT CANNOT BE FOUND IS A FAILURE, NEVER A SKIP. A stale anchor is an ABSENT
 * test that fails in the direction of looking fine; one in this repo sat that way for eight
 * days. `injectDefect` refuses a missing anchor AND an ambiguous one, and normalises line
 * endings (`core.autocrlf=true` here with no `.gitattributes`, so a multi-line anchor
 * written with `\n` silently misses on a Windows checkout).
 *
 * ⭐ TWO CASES MATTER MORE THAN THE REST AND NEITHER IS ABOUT DOMAINS: the probe FAILING
 * CLOSED (an Anthropic outage silently stops the console accepting any source at all, and
 * reaches the operator as a dead button) and the action BELIEVING THE CLIENT (the audit
 * chain records "blocked" about a host nobody measured, because a form field said so).
 *
 * Run: npm run red:source-reachability
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/source-reachability.anchors.mjs";

// The suite is run DIRECTLY, not through npm, so nothing between npm and the assertions can
// masquerade as an assertion failure.
const GATE = "scripts/source-reachability.test.mts";

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
  console.error("REFUSING: test:source-reachability is already RED on the untouched tree.");
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
  let mutated = original;
  let anchorFailed = null;
  // ⚠️ THE PRIMARY EDIT PLUS ANY PAIRED HALF, in order. The primary is TOP-LEVEL
  // (`from`/`to`) because that is what the fleet auditor `red-anchors.test.mts` reads —
  // an earlier draft nested every anchor under `edits` and the auditor died on it, which
  // means these anchors were invisible to the one file that exists to stop them rotting.
  // `also` carries the second half of a paired mutation: several of these defects are only
  // reachable as a pair, because the verdict's agreement check fails CLOSED and breaking
  // one half alone produces a safe refusal rather than the dangerous state.
  for (const e of [{ from: c.from, to: c.to }, ...(c.also ?? [])]) {
    try { mutated = injectDefect(mutated, e.from, e.to); }
    catch (err) { anchorFailed = err.message; break; }
  }
  if (anchorFailed) {
    problems.push(`case ${i + 1} (${c.name}): ANCHOR — ${anchorFailed}`);
    console.log(`  ${i + 1}. ANCHOR FAIL  ${c.name}`);
    continue;
  }
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

// ⚠️ RESTORATION IS MEASURED, NOT INFERRED. "restored: problems.length === 0" reports a
// dirty tree whenever any case failed for any reason, sending a reader looking for damage
// that is not there. "Did every file go back?" has its own answer.
const unrestored = [...originals].filter(([f, original]) => readFileSync(f, "utf8") !== original).map(([f]) => f);
for (const f of unrestored) problems.push(`${f} NOT RESTORED — the working tree is dirty`);
const after = runGate();
if (after.code !== 0) problems.push("gate RED after restore");

console.log(`\n${caught}/${MUTATIONS.length} caught · files restored: ${unrestored.length === 0 ? "all" : unrestored.join(", ")} · green after restore: ${after.code === 0}`);
if (problems.length) { console.error("\nPROBLEMS:"); problems.forEach((p) => console.error("  ✗ " + p)); process.exit(1); }
console.log("RED PROOF COMPLETE");
