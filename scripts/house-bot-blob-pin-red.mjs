/** Physical reversals of D19a's durable U43 blob pin; always restore this owned file. */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS as plants } from "./anchors/house-bot-blob-pin.anchors.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "scripts/lib/house-bot-absence-cases.mts");
const original = readFileSync(target, "utf8");
let caught = 0;
for (const plant of plants) {
  const label = plant.name;
  if (plant.file !== "scripts/lib/house-bot-absence-cases.mts") throw new Error(`Unexpected mutation target: ${plant.file}`);
  if (original.split(plant.from).length !== 2) throw new Error(`D19a anchor absent or ambiguous: ${label}`);
  const mutation = original.replace(plant.from, plant.to);
  if (mutation === original) throw new Error(`${label} plant made no change`);
  try {
    writeFileSync(target, mutation, "utf8");
    const result = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/house-bot-blob-pin.test.mts"], {
      cwd: root, shell: false, encoding: "utf8", timeout: 60_000,
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    if (result.status !== 1 || !output.includes("FAIL ") || !output.includes("failed")) {
      throw new Error(`${label} did not make the guard fail (exit ${result.status}): ${output.slice(-1200)}`);
    }
    caught++;
    console.log(`caught ${label}`);
  } finally {
    if (readFileSync(target, "utf8") !== mutation) throw new Error("D19a source changed during red plant; refusing to overwrite another edit");
    writeFileSync(target, original, "utf8");
  }
}
console.log(`house-bot-blob-pin red: ${caught}/${plants.length} caught and source restored`);
if (caught !== plants.length) process.exitCode = 1;
