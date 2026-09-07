/**
 * red:dal-parity — proves `test:dal-parity` catches the silent-production-no-op in each of its
 * shapes, each on its OWN assertion. Same discipline as `red:payout-destination`: reintroduce
 * the REAL defect on a COPY of the tree, assert the gate goes red on THAT case's assertion
 * rather than on some incidental collapse, and prove the gate is green again afterwards.
 *
 * ⭐ THE GATE IS SOURCE-LEVEL, SO THE MUTATION IS TOO. `test:dal-parity` reads `src/` through
 * `KP_SRC`; this harness copies `src/lib/server/{store,prisma-dal}.ts` into a scratch tree,
 * mutates the copy, and points the gate at it. The working tree is never written — there is
 * nothing to restore and nothing to leave dirty.
 *
 * ⭐ THE MATCH IS ON `FAIL <label>`, so a defect caught for the wrong reason cannot print PASS.
 * The anchors are DATA in `scripts/anchors/dal-parity.anchors.mjs`.
 *
 * Run: npm run red:dal-parity
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/dal-parity.anchors.mjs";

const GATE = "scripts/dal-parity.test.mts";
const FILES = ["src/lib/server/store.ts", "src/lib/server/prisma-dal.ts", "scripts/lib/decomment.mts"];

const runGate = (srcDir) => {
  try {
    execFileSync("npx", ["tsx", GATE], {
      encoding: "utf8", stdio: "pipe", shell: process.platform === "win32",
      env: srcDir ? { ...process.env, KP_SRC: srcDir } : process.env,
    });
    return { code: 0, out: "" };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

const base = runGate(null);
if (base.code !== 0) {
  console.error("REFUSING: test:dal-parity is already RED on the untouched tree.");
  console.error(base.out.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 5).join("\n"));
  process.exit(1);
}
console.log("precondition: gate is GREEN on the untouched tree\n");

// One scratch copy of the two files the gate reads, mutated per case.
const scratch = join(tmpdir(), `kp-red-dal-parity-${process.pid}`);
const scratchSrc = join(scratch, "src");
const copyTree = () => {
  if (existsSync(scratch)) rmSync(scratch, { recursive: true, force: true });
  for (const f of FILES) {
    const dest = join(scratch, f);
    mkdirSync(join(dest, ".."), { recursive: true });
    writeFileSync(dest, readFileSync(f, "utf8"), "utf8");
  }
};

let caught = 0;
const problems = [];
try {
  for (const [i, c] of MUTATIONS.entries()) {
    copyTree();
    const target = join(scratch, c.file);
    const original = readFileSync(target, "utf8");
    let mutated;
    try { mutated = injectDefect(original, c.from, c.to); }
    catch (e) { problems.push(`case ${i + 1} (${c.name}): ANCHOR — ${e.message}`); console.log(`  ${i + 1}. ANCHOR FAIL  ${c.name}`); continue; }
    writeFileSync(target, mutated, "utf8");
    const r = runGate(scratchSrc);
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
} finally {
  if (existsSync(scratch)) rmSync(scratch, { recursive: true, force: true });
}

// The working tree was never written; prove the gate is still green on it anyway.
const after = runGate(null);
if (after.code !== 0) problems.push("gate RED on the untouched tree after the run");

console.log(`\n${caught}/${MUTATIONS.length} caught · working tree untouched · green after: ${after.code === 0}`);
if (problems.length) { console.error("\nPROBLEMS:"); problems.forEach((p) => console.error("  ✗ " + p)); process.exit(1); }
console.log("RED PROOF COMPLETE");
