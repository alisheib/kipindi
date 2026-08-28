/**
 * RED PROOF for the SEARCH-ADOPTION guard (`npm run test:search-adoption`), §6 — ownership.
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation below must make the suite EXIT NON-ZERO
 * *and* report the NAMED failing check. Every mutation is reverted and the file verified
 * byte-for-byte afterwards. A mutation whose anchor is missing is reported as PROVING NOTHING
 * — never skipped quietly, because a stale anchor is an ABSENT test that fails in the
 * direction of looking fine.
 *
 * ⛔ ANCHORS GO THROUGH `red-anchor.mjs` and are DECLARED in `anchors/search-adoption.anchors.mjs`
 * — `core.autocrlf=true` here with no `.gitattributes`, so an anchor written with `\n` silently
 * misses on a Windows checkout unless the shared resolver normalises it.
 *
 * ⭐ WHAT IS BEING PROVED. §6 exists because S-06 (scan #1, 2026-08-28) put TWO OWNERS on one
 * piece of state: a url-mode <SearchBox/> that debounces into `?q`, and a `useState` seeded from
 * `?q` that only the Clear handler ever wrote. Three cheaper guards were considered and rejected
 * in §6's own comment — "no dead useState" (it was read, by the button), "no button labelled
 * Search" (a rename walks past it), and "nothing else writes ?q" (three files legitimately carry
 * ?q forward). So the assertion is a RELATIONSHIP, and a relationship is exactly the kind of
 * assertion that rots quietly. Hence case 3.
 *
 * Run: npm run red:search-adoption
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/search-adoption.anchors.mjs";

// Run the suite directly rather than through the npm script, so nothing between npm and the
// assertions can masquerade as an assertion failure.
const GATE = "scripts/search-adoption.test.mts";

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
  console.error("REFUSING: test:search-adoption is already RED on the untouched tree.");
  console.error(base.out.split("\n").filter((l) => l.trim().startsWith("FAIL")).slice(0, 5).join("\n"));
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
  try {
    mutated = injectDefect(original, c.from, c.to);
  } catch (e) {
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
  } else if (!r.out.includes(`FAIL ${c.expect}`)) {
    const lines = r.out.split("\n").filter((l) => l.trim().startsWith("FAIL")).slice(0, 3).map((l) => l.trim());
    problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${lines.join(" | ") || "(no FAIL line)"}`);
    console.log(`  ${i + 1}. WRONG REASON ${c.name}`);
  } else {
    caught++;
    console.log(`  ${i + 1}. caught      ${c.name}  →  ${c.expect}`);
  }
}

// ⚠️ RESTORATION IS MEASURED, NOT INFERRED. `restored: ${problems.length === 0}` is a LIE —
// it reports on the classification, not on the bytes, and would print "restored" over a dirty
// tree whenever every case happened to be caught.
const unrestored = [...originals]
  .filter(([f, original]) => readFileSync(f, "utf8") !== original)
  .map(([f]) => f);
for (const f of unrestored) problems.push(`${f} NOT RESTORED — the working tree is dirty`);
const after = runGate();
if (after.code !== 0) problems.push("gate RED after restore");

console.log(
  `\n${caught}/${MUTATIONS.length} caught · files restored: ${unrestored.length === 0 ? "all" : unrestored.join(", ")} · green after restore: ${after.code === 0}`,
);
if (problems.length) {
  console.error("\nPROBLEMS:");
  problems.forEach((p) => console.error("  ✗ " + p));
  process.exit(1);
}
console.log("RED PROOF COMPLETE");
