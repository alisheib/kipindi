/** Physical QA-clock reversals. Each source file is restored byte-for-byte. */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS } from "./anchors/u43-calendar-clock.anchors.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const tsx = join(root, "node_modules", "tsx", "dist", "cli.mjs");
const guard = join(root, "scripts", "u43-calendar-clock.test.mts");
const run = () => spawnSync(process.execPath, [tsx, guard], {
  cwd: root, encoding: "utf8", timeout: 45_000, maxBuffer: 4 * 1024 * 1024,
});
const green = run();
if (green.status !== 0 || !green.stdout.includes("U43 QA calendar clock:"))
  throw new Error(`QA calendar guard baseline failed: ${green.stdout}\n${green.stderr}`);

const onlyAt = process.argv.indexOf("--only");
const onlyName = onlyAt < 0 ? null : process.argv[onlyAt + 1];
if (onlyAt >= 0 && !onlyName) throw new Error("--only needs an exact mutation name");
const plants = MUTATIONS.filter((m) => onlyName == null || m.name === onlyName);
if (onlyName != null && plants.length !== 1) throw new Error(`unknown calendar mutation: ${onlyName}`);
const originals = new Map([...new Set(plants.map((m) => m.file))]
  .map((file) => [file, readFileSync(join(root, file), "utf8")]));
let caught = 0;
try {
  for (const plant of plants) {
    const path = join(root, plant.file);
    const original = originals.get(plant.file);
    if (readFileSync(path, "utf8") !== original) throw new Error(`${plant.name}: source changed during red run`);
    const needle = original.includes(plant.from) ? plant.from : plant.from.replace(/\n/g, "\r\n");
    const replacement = needle === plant.from ? plant.to : plant.to.replace(/\n/g, "\r\n");
    if (original.split(needle).length !== 2) throw new Error(`${plant.name}: anchor must occur exactly once`);
    try {
      writeFileSync(path, original.replace(needle, replacement), "utf8");
      const red = run();
      const output = `${red.stdout}\n${red.stderr}`;
      if (red.status === 0 || !output.includes(plant.expect))
        throw new Error(`${plant.name}: guard missed reversal: ${output.slice(-1600)}`);
      console.log(`RED ${++caught}/${plants.length}: ${plant.name}`);
    } finally {
      writeFileSync(path, original, "utf8");
      if (digest(readFileSync(path, "utf8")) !== digest(original))
        throw new Error(`${plant.name}: source was not restored byte-for-byte`);
    }
  }
} finally {
  for (const [file, original] of originals)
    if (digest(readFileSync(join(root, file), "utf8")) !== digest(original))
      throw new Error(`${file}: source differs after QA calendar red run`);
}
const final = run();
if (final.status !== 0 || !final.stdout.includes("U43 QA calendar clock:"))
  throw new Error(`QA calendar guard not green after red: ${final.stdout}\n${final.stderr}`);
console.log(`U43 QA calendar physical red: ${caught}/${plants.length}; all source bytes restored`);
