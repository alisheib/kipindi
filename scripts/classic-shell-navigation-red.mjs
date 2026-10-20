/** Physical mutation proof for the classic parity navigation retry. */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS } from "./anchors/classic-shell-navigation.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const guard = join(ROOT, "scripts/classic-shell-navigation.test.mjs");
const runGuard = () => spawnSync(process.execPath, [guard], { cwd: ROOT, encoding: "utf8", timeout: 30_000 });
if (runGuard().status !== 0) throw new Error("classic shell navigation guard is red before mutation");

let passed = 0;
for (const plant of MUTATIONS) {
  const target = join(ROOT, plant.file);
  const original = readFileSync(target);
  const source = original.toString("utf8");
  try {
    writeFileSync(target, injectDefect(source, plant.from, plant.to), "utf8");
    const run = runGuard();
    const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
    if (run.error || run.status !== 1 || !output.includes(plant.expect)) {
      throw new Error(`${plant.name}: guard did not fail its named assertion (exit ${run.status}, ${run.error?.message ?? output.slice(-500)})`);
    }
    console.log(`PASS ${plant.name}: ${plant.expect}`);
    passed++;
  } finally {
    writeFileSync(target, original);
    if (!readFileSync(target).equals(original)) throw new Error(`${plant.name}: source was not restored byte for byte`);
  }
}
if (runGuard().status !== 0) throw new Error("classic shell navigation guard is red after restore");
console.log(`ALL PASS — ${passed}/${MUTATIONS.length} physical reversals caught and restored`);
