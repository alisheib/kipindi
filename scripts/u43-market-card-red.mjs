/** U43 B4 mutation proof: each named regression makes its own guard fail. */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { MUTATIONS } from "./anchors/u43-market-card.anchors.mjs";

const ROOT = process.cwd();
const originals = new Map([...new Set(MUTATIONS.map((mutation) => join(ROOT, mutation.file)))].map((file) => [file, readFileSync(file, "utf8")]));
let failed = 0;
const check = (name, passed, detail = "") => {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) failed++;
};
const run = () => spawnSync("npm", ["run", "test:u43-market-card", "--silent"], {
  cwd: ROOT, encoding: "utf8", shell: process.platform === "win32",
});
function mutation(name, file, from, to, expected) {
  const original = originals.get(file);
  check(`${name}: target exists`, original.includes(from));
  if (!original.includes(from)) return;
  try {
    writeFileSync(file, original.replace(from, to));
    const result = run();
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    check(`${name}: guard turns red at ${expected}`, result.status !== 0 && output.includes(`FAIL ${expected}`), `exit ${result.status}`);
  } finally {
    writeFileSync(file, original);
  }
}

try {
  const base = run();
  check("baseline guard is green", base.status === 0, `exit ${base.status}`);
  const only = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
  for (const item of MUTATIONS.filter((item) => !only || item.expected === only))
    mutation(item.name, join(ROOT, item.file), item.from, item.to, item.expected);
} finally {
  for (const [file, original] of originals) writeFileSync(file, original);
  check("all sources restored byte for byte", [...originals].every(([file, original]) => readFileSync(file, "utf8") === original));
}
console.log(`U43 market card red proof: ${failed ? `${failed} failed` : "all mutations caught"}`);
process.exit(failed ? 1 : 0);
