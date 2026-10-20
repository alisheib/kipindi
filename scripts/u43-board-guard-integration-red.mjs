/** Physical regressions for the two U43 board guard assertions updated after
 * the BoardViz first-paint and exact-phase capture changes. Each source file is
 * restored byte-for-byte before the next plant. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const guard = () => {
  try {
    return { code: 0, out: execFileSync(process.execPath, ["--import", "tsx", "scripts/u43-board.test.mts"],
      { cwd: root, encoding: "utf8" }) };
  } catch (error) {
    return { code: error.status ?? 1, out: String(error.stdout ?? "") + String(error.stderr ?? "") };
  }
};
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const plants = [
  {
    file: "src/components/charts/board-viz.tsx",
    from: "aria-expanded={open === true}",
    to: "aria-expanded={open}",
    expect: "recent outcomes remain before the inline chart",
  },
  {
    file: "scripts/live/updown-visual-states.mjs",
    from: "if (requirement.marketPage) {",
    to: "if (false) {",
    expect: "market card capture waits for side words to paint after scrolling",
  },
];

if (guard().code !== 0) throw new Error("U43 board guard red before plants");
let caught = 0;
for (const plant of plants) {
  const path = join(root, plant.file);
  const original = readFileSync(path);
  const text = original.toString("utf8");
  if (text.split(plant.from).length !== 2 || plant.to.includes(plant.from)) {
    throw new Error(`Invalid unique plant: ${plant.file}`);
  }
  let result;
  try {
    writeFileSync(path, text.replace(plant.from, plant.to));
    result = guard();
  } finally {
    writeFileSync(path, original);
  }
  if (digest(readFileSync(path)) !== digest(original)) throw new Error(`Restore mismatch: ${plant.file}`);
  const found = result.code !== 0 && result.out.includes(`FAIL ${plant.expect}`);
  console.log(`${found ? "CAUGHT" : "MISSED"} ${plant.expect}`);
  if (found) caught++;
}
if (caught !== plants.length || guard().code !== 0) throw new Error(`${caught}/${plants.length} caught or guard red after restore`);
console.log(`U43 board guard integration red: ${caught}/${plants.length}; both source files restored`);
