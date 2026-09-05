#!/usr/bin/env node
/**
 * red:officer-hold — proves `test:settlement-gate` §14 actually CATCHES the defects it names.
 *
 * ⛔ WHY THIS FILE EXISTS AT ALL. §14 is a section of assertions about a control that did not
 * exist a day ago, and every one of them is phrased as a refusal ("a player cannot hold", "the
 * same officer cannot release"). A refusal-shaped assertion is green on a deleted feature, on a
 * broken import, and on a function that returns `{ok:false}` for the wrong reason. So the gate
 * carries positive controls, and this harness answers the other half: it reintroduces each REAL
 * defect the officer hold could plausibly ship with, one at a time, and requires the gate to
 * exit non-zero **on that case's own assertion** rather than falling over somewhere else.
 *
 * ⭐ THE MUTATIONS ARE THE DESIGN, RESTATED AS DAMAGE. Each one is a decision from
 * `holdSettlementAsOfficer`'s header, inverted:
 *   1. the role gate            → anyone can freeze a payout
 *   2. the no-stake widening    → the hold inherits the player rule and helps nobody
 *   3. the settled wall         → a hold is accepted after the money has moved
 *   4. the one-per-officer rule → a double-click manufactures two cases
 *   5. the window widening      → an officer is timed out exactly when the timer is lagging
 *
 * ⛔ Anchors go through `scripts/red-anchor.mjs`: matched in the FILE's own line-ending
 * convention and refused if they match twice. A `\n`-authored anchor cannot match a CRLF
 * checkout, which once made a harness declare the product unprovable on a normal Windows clone.
 *
 * Run: npm run red:officer-hold
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";

// The five mutations live in `scripts/anchors/officer-hold.anchors.mjs` as importable DATA,
// so `test:red-anchors` §3 re-resolves every one of them against the real file on every run.
// ⛔ ONE DEFINITION. A copy here would be a second set of anchors that could rot apart from
// the audited set while both looked healthy — the exact failure that directory exists for.
import { MUTATIONS as CASES } from "./anchors/officer-hold.anchors.mjs";

const runGate = () => {
  try {
    execFileSync("npx", ["tsx", "scripts/settlement-gate.test.mts"], { encoding: "utf8", stdio: "pipe", shell: process.platform === "win32" });
    return { code: 0, out: "" };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

// ⭐ THE PRECONDITION. If the gate is not green on the untouched tree, every "it went red" below
// is meaningless — it was already red. Refuse rather than report comfort.
const base = runGate();
if (base.code !== 0) {
  console.error("REFUSING TO RUN: test:settlement-gate is already RED on the untouched tree.");
  console.error(base.out.slice(0, 1500));
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
  try {
    mutated = injectDefect(original, c.from, c.to);
  } catch (e) {
    problems.push(`case ${i + 1} (${c.name}): ANCHOR PROBLEM — ${e.message}`);
    console.log(`  ${String(i + 1).padStart(2)}. ANCHOR FAIL  ${c.name}`);
    continue;
  }
  writeFileSync(c.file, mutated, "utf8");
  const r = runGate();
  writeFileSync(c.file, original, "utf8");

  if (r.code === 0) {
    problems.push(`case ${i + 1} (${c.name}): gate stayed GREEN with the defect present`);
    console.log(`  ${String(i + 1).padStart(2)}. NOT CAUGHT   ${c.name}`);
  } else if (!r.out.includes(`FAIL ${c.expect}`)) {
    // ⛔ RED FOR THE WRONG REASON IS NOT A PROOF. Without this the harness would happily accept
    // a mutation that broke the file's syntax and never exercised the control at all.
    const lines = r.out.split("\n").filter((l) => l.startsWith("FAIL")).map((l) => l.trim()).slice(0, 3);
    problems.push(`case ${i + 1} (${c.name}): went red, but NOT on "${c.expect}" — got: ${lines.join(" | ") || "(no FAIL lines — the suite fell over)"}`);
    console.log(`  ${String(i + 1).padStart(2)}. WRONG REASON ${c.name}`);
  } else {
    caught++;
    console.log(`  ${String(i + 1).padStart(2)}. caught  ${c.name}`);
  }
}

// The tree must be exactly as it was found — a harness that mutates in place and half-restores
// is one `git add -A` away from shipping its own defect to production.
for (const [f, original] of originals) {
  if (readFileSync(f, "utf8") !== original) problems.push(`${f} was NOT restored byte-identically`);
}

console.log(`\nred:officer-hold — ${caught}/${CASES.length} defects caught on their own assertion`);
if (problems.length) {
  console.error("\nPROBLEMS:");
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}
