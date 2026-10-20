/** Physical source mutations for Ali's restored vendor colour ruling. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS } from "./anchors/u43-social-brand.anchors.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const plants = MUTATIONS;
if (plants.length !== 3) throw new Error(`Expected three social-mark plants, found ${plants.length}`);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const guard = () => {
  try {
    return { code: 0, out: execFileSync(process.execPath, ["--import", "tsx", "scripts/u43-shell-palette.test.mts"],
      { cwd: root, encoding: "utf8" }) };
  } catch (error) {
    return { code: error.status ?? 1, out: String(error.stdout ?? "") + String(error.stderr ?? "") };
  }
};
if (guard().code !== 0) throw new Error("Shell palette guard red before mutation");
let caught = 0;
for (const plant of plants) {
  const path = join(root, plant.file);
  const original = readFileSync(path);
  const source = original.toString("utf8");
  if (source.split(plant.from).length !== 2 || plant.to.includes(plant.from)) throw new Error(`Invalid anchor: ${plant.name}`);
  let result;
  try {
    writeFileSync(path, source.replace(plant.from, plant.to));
    result = guard();
  } finally {
    writeFileSync(path, original);
  }
  if (digest(readFileSync(path)) !== digest(original)) throw new Error(`Restore mismatch: ${plant.name}`);
  const found = result.code !== 0 && result.out.includes(`FAIL ${plant.expected} `);
  console.log(`${found ? "CAUGHT" : "MISSED"} ${plant.name}`);
  if (found) caught++;
}
if (caught !== plants.length || guard().code !== 0) throw new Error(`${caught}/${plants.length} caught or guard red after restore`);
console.log(`U43 social brand RED: ${caught}/${plants.length} caught; source restored`);
