/** Physical red proof for the 2026-10-20 gold restoration's R5-I guards.
 * Each plant changes one real source file on disk, runs the unmodified guard,
 * checks the named assertion went red, and restores the original bytes.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveAnchor, toEol } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/visual-pass-r5i-gold.anchors.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = () => spawnSync(process.execPath, [join(root, "node_modules/tsx/dist/cli.mjs"), join(root, "scripts/visual-pass-r5i.test.mts")], {
  cwd: root,
  encoding: "utf8",
  timeout: 30_000,
  maxBuffer: 4 * 1024 * 1024,
});

const baseline = run();
if (baseline.status !== 0 || !baseline.stdout.includes("0 failed")) {
  throw new Error(`R5-I must start green; status ${baseline.status}\n${baseline.stdout}\n${baseline.stderr}`);
}

let caught = 0;
for (const plant of MUTATIONS) {
  const path = join(root, plant.file);
  const original = readFileSync(path);
  const source = original.toString("utf8");
  const anchor = resolveAnchor(source, plant.from);
  if (!anchor.ok) throw new Error(`${plant.name}: ${anchor.reason}`);
  const changed = source.replace(anchor.needle, toEol(plant.to, anchor.eol));
  let result;
  try {
    writeFileSync(path, changed);
    result = run();
  } finally {
    writeFileSync(path, original);
  }
  if (!readFileSync(path).equals(original)) throw new Error(`${plant.name}: source did not restore byte-identical`);
  if (result.status !== 1 || !result.stdout.includes(plant.expect)) {
    throw new Error(`${plant.name}: expected ${plant.expect}, got status ${result.status}\n${result.stdout}\n${result.stderr}`);
  }
  caught++;
  console.log(`caught ${caught}/${MUTATIONS.length}: ${plant.name}`);
}

const restored = run();
if (restored.status !== 0 || !restored.stdout.includes("0 failed")) {
  throw new Error(`R5-I did not return green; status ${restored.status}\n${restored.stdout}\n${restored.stderr}`);
}
console.log(`visual-pass-r5i-gold-red: ${caught}/${MUTATIONS.length} physical mutations caught; all source files restored byte-identical; guard green`);
