/**
 * red:share-preview — proves `test:share-preview` catches each defect it names, on THAT defect's assertion.
 *
 * Same discipline as `red:landing-contract`: reintroduce the real defect in the product file, assert
 * the gate goes red on the assertion that names it (a red for the wrong reason proves nothing), then
 * restore. Case 5 is the positive control: the market page loses its openGraph altogether, and only
 * the census assertion (1.2) stands between that and a green spread law over a page with no preview.
 *
 * ⚠️ It writes real files and restores them in `finally`. Run it alone, never beside another red
 * harness on the same tree, and read `git status` afterwards.
 *
 * Run: npm run red:share-preview
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";

// ⭐ The cases are DATA in `scripts/anchors/share-preview.anchors.mjs`, audited by `test:red-anchors` §3.
import { MUTATIONS as CASES } from "./anchors/share-preview.anchors.mjs";

const runGate = () => {
  const r = spawnSync("npx", ["tsx", "scripts/share-preview.test.mts"], { encoding: "utf8", shell: process.platform === "win32" });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
};
const failedLabels = (out) => out.split(/\r?\n/).filter((l) => l.trim().startsWith("FAIL ")).map((l) => l.trim().slice(5));

const before = runGate();
if (before.code !== 0) {
  console.error("REFUSING: test:share-preview is already RED on the untouched tree.");
  console.error(failedLabels(before.out).slice(0, 8).join("\n"));
  process.exit(1);
}
console.log("precondition: gate is GREEN on the untouched tree\n");

let caught = 0;
const problems = [];
for (const [i, c] of CASES.entries()) {
  const original = readFileSync(c.file, "utf8");
  let mutated;
  try { mutated = injectDefect(original, c.from, c.to); }
  catch (e) { problems.push(`case ${i + 1}: ANCHOR — ${e.message}`); console.log(`  ${i + 1}. ANCHOR FAIL  ${c.name}`); continue; }
  try {
    writeFileSync(c.file, mutated, "utf8");
    const r = runGate();
    const labels = failedLabels(r.out);
    if (r.code === 0) { problems.push(`case ${i + 1} (${c.name}): stayed GREEN`); console.log(`  ${i + 1}. NOT CAUGHT   ${c.name}`); }
    else if (!labels.some((l) => l.startsWith(c.expect + " "))) {
      problems.push(`case ${i + 1} (${c.name}): red, but not on ${c.expect} — ${labels.slice(0, 3).join(" | ")}`);
      console.log(`  ${i + 1}. WRONG REASON ${c.name}`);
    } else { caught++; console.log(`  ${i + 1}. caught on ${c.expect.padEnd(5)} ${c.name}`); }
  } finally {
    writeFileSync(c.file, original, "utf8");
  }
  if (readFileSync(c.file, "utf8") !== original) problems.push(`${c.file} not restored`);
}

const after = runGate();
if (after.code !== 0) problems.push("gate RED after restore");
console.log(`\n${caught}/${CASES.length} caught · green after restore: ${after.code === 0}`);
if (problems.length) { console.error("\nPROBLEMS:"); problems.forEach((p) => console.error("  ✗ " + p)); process.exit(1); }
console.log("RED PROOF COMPLETE");
