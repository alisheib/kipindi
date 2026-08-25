/**
 * red:share-link-readable — proves `test:share-link-readable` catches the defects it names, each on
 * its OWN assertion. Same discipline as `red:card-share` / `red:timer-date`: reintroduce the
 * REAL defect, require the gate to go red on THAT case's assertion rather than on some
 * incidental collapse, restore, and prove the gate is green again afterwards.
 *
 * ⭐ THE TWO WORTH READING ARE `back-to-a-single-line-input` AND `fit-without-collapsing`.
 * The first is the tidy-looking regression: the field returns to the shared single-line
 * control, matching every other field on the page — and an `<input>` CANNOT WRAP at any class
 * list, so the link is clipped again with nothing in the markup looking wrong. The second
 * drops the `height = 0` reset from the auto-size; `scrollHeight` never reports less than the
 * current height, so the box grows on every observation and never comes back. It looks
 * perfect on first paint and creeps taller as the window is resized, which is a defect **no
 * single screenshot can catch.**
 *
 * ⭐ AND `control-field-renders-nothing` IS THE POSITIVE CONTROL — the field stops being fed
 * the link. An empty control is never clipped, so every geometry assertion, offline and on
 * production, passes HARDER over a referral box with no referral link in it.
 *
 * ⚠️ THE MEASUREMENT IS NOT HERE, DELIBERATELY. Whether the whole link is on screen is
 * settled by `npm run qa:share-link-readable`, which compares `scrollWidth` against
 * `clientWidth` on production at three widths in three languages and does not care how the
 * link is rendered. This harness proves only that the offline gate cannot be fooled. Neither
 * is evidence for the other.
 *
 * ⛔ The anchors are DATA, in `scripts/anchors/share-link-readable.anchors.mjs`, so
 * `test:red-anchors` can audit that every one still resolves exactly once WITHOUT running
 * this file.
 *
 * Run: npm run red:share-link-readable
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/share-link-readable.anchors.mjs";

// Run the suite directly rather than through the npm script, so nothing between npm and the
// assertions can masquerade as an assertion failure.
const GATE = "scripts/share-link-readable.test.mts";

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
  console.error("REFUSING: test:share-link-readable is already RED on the untouched tree.");
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

// ⚠️ RESTORATION IS MEASURED, NOT INFERRED FROM `problems.length` — a run whose files went
// back perfectly must not report the tree as possibly dirty just because a case failed.
const unrestored = [...originals].filter(([f, original]) => readFileSync(f, "utf8") !== original).map(([f]) => f);
for (const f of unrestored) problems.push(`${f} NOT RESTORED — the working tree is dirty`);
const after = runGate();
if (after.code !== 0) problems.push("gate RED after restore");

console.log(`\n${caught}/${MUTATIONS.length} caught · files restored: ${unrestored.length === 0 ? "all" : unrestored.join(", ")} · green after restore: ${after.code === 0}`);
if (problems.length) { console.error("\nPROBLEMS:"); problems.forEach((p) => console.error("  ✗ " + p)); process.exit(1); }
console.log("RED PROOF COMPLETE");
