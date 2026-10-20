/** Physical reversals for the three-database scratch E2E safety contract. */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS } from "./anchors/u43-scratch-e2e-runner.anchors.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const helper = resolve(root, "scripts/lib/u43-scratch-e2e-plan.mjs");
const runner = resolve(root, "scripts/u43-scratch-e2e-runner.mjs");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const eol = (value, before) => before.includes("\r\n") ? value.replace(/\n/g, "\r\n") : value;
const original = new Map([helper, runner].map((path) => [path, readFileSync(path, "utf8")]));
function guard() {
  const run = spawnSync(process.execPath, ["scripts/u43-scratch-e2e-runner.test.mjs"], {
    cwd: root, encoding: "utf8", shell: false, timeout: 30_000,
  });
  return { code: run.status ?? 1, output: `${run.stdout ?? ""}${run.stderr ?? ""}` };
}
const green = guard();
if (green.code !== 0 || !green.output.includes("u43-scratch-e2e-runner: 12 passed, 0 failed")) {
  throw new Error("Scratch E2E premise guard must be green before mutation");
}
const plants = MUTATIONS;

let caught = 0;
for (const plant of plants) {
  const path = resolve(root, plant.file);
  const before = original.get(path);
  const current = readFileSync(path, "utf8");
  if (sha(current) !== sha(before)) throw new Error("Scratch runner changed before red plant; refusing mutation");
  const from = eol(plant.from, before), to = eol(plant.to, before);
  if (current.split(from).length !== 2) throw new Error(`Red anchor absent or ambiguous: ${plant.name}`);
  writeFileSync(path, current.replace(from, to), "utf8");
  try {
    const red = guard();
    if (red.code === 0 || !red.output.includes(plant.failure)) {
      throw new Error(`Owning assertion missed mutation: ${plant.name}`);
    }
    caught++;
    console.log(`RED ${plant.name}`);
  } finally {
    writeFileSync(path, before, "utf8");
    if (sha(readFileSync(path, "utf8")) !== sha(before)) throw new Error(`Restore failed: ${plant.name}`);
  }
}
const restored = guard();
if (restored.code !== 0 || !restored.output.includes("u43-scratch-e2e-runner: 12 passed, 0 failed")) {
  throw new Error("Scratch E2E premise guard failed after restoration");
}
console.log(`u43-scratch-e2e-runner red: ${caught}/${plants.length} caught; source restored`);
