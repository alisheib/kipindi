/** Physical reversals of U43 capture premise checks. Only the two capture
 * scripts are touched; each is restored byte-for-byte before the next plant. */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS } from "./anchors/u43-capture-premises.anchors.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const paths = { capture: join(root, "scripts/live/updown-visual-capture.mjs"),
  states: join(root, "scripts/live/updown-visual-states.mjs") };
const guard = join(root, "scripts/u43-capture-premises.test.mjs");
const run = () => spawnSync(process.execPath, [guard], { cwd: root, encoding: "utf8", timeout: 30_000 });
const control = run();
if (control.status !== 0) throw new Error(`green control failed: ${control.stdout}\n${control.stderr}`);
const cases = MUTATIONS;
const originals = new Map(Object.entries(paths).map(([key, path]) => [key, readFileSync(path, "utf8")]));
let caught = 0;
try {
  for (const { name, file, from, to, expected } of cases) {
    const key = file.includes("-capture.mjs") ? "capture" : "states";
    const path = paths[key], source = originals.get(key);
    if (readFileSync(path, "utf8") !== source) throw new Error(`${name}: source changed during red fleet`);
    const lineEnding = source.includes("\r\n") ? "\r\n" : "\n";
    const exactFrom = from.replace(/\n/g, lineEnding);
    const exactTo = to.replace(/\n/g, lineEnding);
    const count = source.split(exactFrom).length - 1;
    if (count !== 1) throw new Error(`${name}: expected anchor count, saw ${count}`);
    try {
      writeFileSync(path, source.replace(exactFrom, exactTo));
      const result = run(), output = `${result.stdout}\n${result.stderr}`;
      if (result.status === 0 || !output.includes(expected)) {
        throw new Error(`${name}: guard missed the planted reversal: ${output.slice(0, 750)}`);
      }
      console.log(`RED ${++caught}/${cases.length}: ${name}`);
    } finally { writeFileSync(path, source); }
  }
} finally {
  for (const [key, path] of Object.entries(paths)) {
    if (readFileSync(path, "utf8") !== originals.get(key)) throw new Error(`${key} was not restored byte-for-byte`);
  }
}
const after = run();
if (after.status !== 0) throw new Error(`green control failed after red: ${after.stdout}\n${after.stderr}`);
console.log(`U43 capture premise physical red: ${caught}/${cases.length}, both scripts restored`);
