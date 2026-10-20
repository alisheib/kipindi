/** Source mutations prove each U43 board rule has a guard that fails for the right reason. */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { MUTATIONS as cases } from "./anchors/u43-board.anchors.mjs";

const gate = () => {
  try { return { code: 0, out: execFileSync("npx", ["tsx", "scripts/u43-board.test.mts"], { encoding: "utf8", shell: process.platform === "win32" }) }; }
  catch (e) { return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") }; }
};
if (gate().code !== 0) throw new Error("Board guard is red before mutation");
let caught = 0;
for (const item of cases) {
  const original = readFileSync(item.file, "utf8");
  if (original.split(item.from).length !== 2 || item.to.includes(item.from)) throw new Error(`Anchor invalid: ${item.file} ${item.expect}`);
  let result;
  try { writeFileSync(item.file, original.replace(item.from, item.to)); result = gate(); }
  finally { writeFileSync(item.file, original); }
  const pass = result.code !== 0 && result.out.includes(`FAIL ${item.expect}`);
  console.log(`${pass ? "CAUGHT" : "MISSED"} ${item.expect}`);
  if (pass) caught++;
}
if (gate().code !== 0 || caught !== cases.length) throw new Error(`${caught}/${cases.length} caught or guard red after restore`);
console.log(`U43 BOARD RED: ${caught}/${cases.length} caught; files restored`);
