/** U43 B5 mutation proof: every named system rule fails for a real wrong value. */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { MUTATIONS as cases } from "./anchors/u43-system.anchors.mjs";

const gate = () => {
  try { return { code: 0, out: execFileSync("npx", ["tsx", "scripts/u43-system.test.mts"], { encoding: "utf8", shell: process.platform === "win32" }) }; }
  catch (e) { return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") }; }
};
if (gate().code !== 0) throw new Error("System guard is red before mutation");
let caught = 0;
for (const item of cases) {
  const original = readFileSync(item.file, "utf8");
  const positions = [...original.matchAll(new RegExp(item.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))]
    .map((match) => match.index)
    .filter((index) => !item.lineStart || index === 0 || original[index - 1] === "\n");
  if (positions.length !== 1) throw new Error(`Anchor invalid: ${item.file} ${item.expect}`);
  let result;
  try { writeFileSync(item.file, original.slice(0, positions[0]) + item.to + original.slice(positions[0] + item.from.length)); result = gate(); }
  finally { writeFileSync(item.file, original); }
  const pass = result.code !== 0 && result.out.includes(`FAIL ${item.expect}`);
  console.log(`${pass ? "CAUGHT" : "MISSED"} ${item.expect}`);
  if (pass) caught++;
}
if (gate().code !== 0 || caught !== cases.length) throw new Error(`${caught}/${cases.length} caught or guard red after restore`);
console.log(`U43 SYSTEM RED: ${caught}/${cases.length} caught; files restored`);
