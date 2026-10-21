/** Physical red proof for Ali's restored house-gold census and named surfaces. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { MUTATIONS } from "./anchors/visual-pass-r5c.anchors.mjs";

const root = process.cwd();
const originals = new Map([...new Set(MUTATIONS.map((item) => resolve(root, item.file)))].map((file) => [file, readFileSync(file)]));
const run = () => spawnSync("npm", ["run", "test:visual-pass-r5c", "--silent"], {
  cwd: root, encoding: "utf8", shell: process.platform === "win32",
});
let failed = 0;
function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) failed++;
}
try {
  check("baseline gold census and guard green", run().status === 0);
  for (const item of MUTATIONS) {
    const file = resolve(root, item.file);
    const original = originals.get(file);
    const text = original.toString("utf8");
    check(`${item.name}: exact anchor`, text.split(item.from).length === 2);
    if (text.split(item.from).length !== 2) continue;
    try {
      writeFileSync(file, text.replace(item.from, item.to));
      const result = run();
      check(`${item.name}: red at ${item.expected}`, result.status !== 0
        && `${result.stdout ?? ""}${result.stderr ?? ""}`.includes(`FAIL ${item.expected}`));
    } finally {
      writeFileSync(file, original);
    }
  }
} finally {
  for (const [file, original] of originals) writeFileSync(file, original);
  check("sources restored byte for byte", [...originals].every(([file, original]) => readFileSync(file).equals(original)));
}
console.log(`visual-pass-r5c red: ${failed ? `${failed} failed` : "all mutations caught"}`);
process.exitCode = failed ? 1 : 0;
