/** Ali's restored house-gold palette: each reverted choice makes its guard fail. */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { MUTATIONS } from "./anchors/u43-shell-palette.anchors.mjs";

const root = process.cwd();
const originals = new Map([...new Set(MUTATIONS.map((item) => join(root, item.file)))].map((file) => [file, readFileSync(file, "utf8")]));
let failed = 0;
const check = (name, condition, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failed++;
};
const run = () => spawnSync("npm", ["run", "test:u43-shell-palette", "--silent"], {
  cwd: root, encoding: "utf8", shell: process.platform === "win32",
});
try {
  const baseline = run();
  check("baseline guard green", baseline.status === 0, `exit ${baseline.status}`);
  for (const item of MUTATIONS) {
    const file = join(root, item.file);
    const original = originals.get(file);
    check(`${item.name}: exact anchor`, original.split(item.from).length === 2);
    if (original.split(item.from).length !== 2) continue;
    try {
      writeFileSync(file, original.replace(item.from, item.to));
      const result = run();
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
      check(`${item.name}: red at ${item.expected}`, result.status !== 0 && output.includes(`FAIL ${item.expected}`), `exit ${result.status}`);
    } finally {
      writeFileSync(file, original);
    }
  }
} finally {
  for (const [file, original] of originals) writeFileSync(file, original);
  check("sources restored byte for byte", [...originals].every(([file, original]) => readFileSync(file, "utf8") === original));
}
console.log(`U43 shell palette red: ${failed ? `${failed} failed` : "all mutations caught"}`);
process.exit(failed ? 1 : 0);
