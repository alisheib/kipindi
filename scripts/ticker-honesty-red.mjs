/**
 * red:ticker-honesty — proves `test:ticker-honesty` actually CATCHES the defects it names.
 *
 * A gate phrased as a refusal ("no unsettled row appears") is green on an empty array, on a broken
 * import, and on a feature that has been deleted. The gate itself answers that with a positive
 * control per case; this harness answers the other half: it reintroduces each REAL defect, one at a
 * time, and asserts the gate goes red **on that case's own assertion** rather than on some
 * incidental collapse. Then it restores the file and checks the tree is byte-identical.
 *
 * ⛔ Anchors go through `scripts/red-anchor.mjs`: matched in the FILE's line-ending convention, and
 * refused if they match twice. A `\n` anchor cannot match a CRLF checkout, which once made a
 * harness declare the product unprovable on a normal Windows clone.
 *
 * Run: npm run red:ticker-honesty
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS as CASES } from "./anchors/ticker-honesty.anchors.mjs";

// (The cases and their files live with the mutations, in scripts/anchors/ticker-honesty.anchors.mjs: S7 WP0.)



/**
 * ⭐ THE VERDICT IS THE WHOLE CHECK ID (S7 WP0, Amendment A4). The gate prints each failure as `  ✗ <label>`, and every
 * label starts with its id and a space. It used to be a substring test, so an expected 11.2 was met by a failing 11.21 or
 * 11.22, and an expected 1.1 by 1.1-control: red for the wrong reason, counted as caught.
 */
const caughtOn = (out, id) => out.split("\n").some((l) => l.trim().startsWith(`✗ ${id} `));
// CONTROL, before any case: the matcher must tell an id from its neighbours, both ways, or no verdict below means a thing.
{
  const wrong = [
    ["  ✗ 11.21 starting the run zeroes the buffer", "11.2"],
    ["  ✗ 11.22 the copy restarts", "11.2"],
    ["  ✗ 11.2j the journey list", "11.2"],
    ["  ✗ 1.1-control the settled sibling", "1.1"],
    ["  ✗ 11.1 the strip shows on /live", "1.1"],
  ];
  const right = [["  ✗ 11.2 the strip never shows on /", "11.2"], ["  ✗ 1.1 an unsettled row is dropped — got 1", "1.1"]];
  const bad = [...wrong.filter(([o, id]) => caughtOn(o, id)), ...right.filter(([o, id]) => !caughtOn(o, id))];
  if (bad.length) {
    console.error("REFUSING TO RUN: the verdict's matcher cannot tell a check id from its neighbours:");
    bad.forEach(([o, id]) => console.error(`  ✗ wanted ${id}, line ${JSON.stringify(o)}`));
    process.exit(1);
  }
  console.log("control: the verdict matches whole check ids (11.2 is not 11.21, 11.22 or 11.2j; 1.1 is not 1.1-control)");
}

const runGate = () => {
  try {
    execFileSync("npx", ["tsx", "scripts/ticker-honesty.test.mts"], { encoding: "utf8", stdio: "pipe", shell: process.platform === "win32" });
    return { code: 0, out: "" };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

// ⭐ THE PRECONDITION. If the gate is not green on the untouched tree, every "it went red" below
// is meaningless — it was already red. Refuse rather than report.
const base = runGate();
if (base.code !== 0) {
  console.error("REFUSING TO RUN: test:ticker-honesty is already RED on the untouched tree.");
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
  } else if (!caughtOn(r.out, c.expect)) {
    // Red for the wrong reason is not a proof. This is the check that separates "the gate caught
    // my defect" from "the gate fell over".
    const lines = r.out.split("\n").filter((l) => l.includes("✗")).map((l) => l.trim()).slice(0, 3);
    problems.push(`case ${i + 1} (${c.name}): went red, but NOT on ${c.expect} — got: ${lines.join(" | ") || "(no ✗ lines)"}`);
    console.log(`  ${String(i + 1).padStart(2)}. WRONG REASON ${c.name}  (wanted ${c.expect})`);
  } else {
    caught++;
    console.log(`  ${String(i + 1).padStart(2)}. caught on ${c.expect.padEnd(5)} ${c.name}`);
  }
}

// The tree must be exactly as it was found.
for (const [f, original] of originals) {
  if (readFileSync(f, "utf8") !== original) problems.push(`${f} was NOT restored byte-identically`);
}
let gitClean = true;
try {
  const st = execFileSync("git", ["status", "--porcelain", ...originals.keys()], { encoding: "utf8" }).trim();
  // Files legitimately edited in this working tree will show; what matters is that the harness
  // did not change them, which the byte comparison above already proved. Reported, not asserted.
  if (st) { gitClean = false; console.log(`\nnote: these files have working-tree changes of their own:\n${st}`); }
} catch { /* not a git checkout — the byte comparison stands on its own */ }

const after = runGate();
if (after.code !== 0) problems.push("the gate is RED after restore — the tree was not put back");

console.log(`\n${caught}/${CASES.length} real defects caught, each on its own assertion`);
console.log(`tree restored: ${gitClean ? "clean" : "byte-identical (pre-existing edits present)"} · gate green after restore: ${after.code === 0}`);
if (problems.length) {
  console.error("\nPROBLEMS:");
  problems.forEach((p) => console.error("  ✗ " + p));
  process.exit(1);
}
console.log("RED PROOF COMPLETE");
