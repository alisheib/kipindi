/** Restore each overlapping-window defect and require the focused guard to fail. */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { MUTATIONS } from "./anchors/u43-board-window.anchors.mjs";

const gate = () => {
  try {
    return { code: 0, out: execFileSync("npx", ["tsx", "scripts/u43-board-window.test.mts"], {
      encoding: "utf8", shell: process.platform === "win32", stdio: "pipe",
    }) };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

if (gate().code !== 0) throw new Error("U43 board-window guard is red before mutation");
let caught = 0;
for (const item of MUTATIONS) {
  const original = readFileSync(item.file, "utf8");
  if (original.split(item.from).length !== 2 || item.to.includes(item.from)) {
    throw new Error(`Anchor invalid: ${item.file} ${item.name}`);
  }
  let result;
  try {
    writeFileSync(item.file, original.replace(item.from, item.to));
    result = gate();
  } finally {
    writeFileSync(item.file, original);
  }
  const pass = result.code !== 0 && result.out.includes(`FAIL ${item.expect}`);
  console.log(`${pass ? "CAUGHT" : "MISSED"} ${item.name}: ${item.expect}`);
  if (pass) caught++;
}
if (gate().code !== 0 || caught !== MUTATIONS.length) {
  throw new Error(`${caught}/${MUTATIONS.length} caught or guard red after restore`);
}
console.log(`U43 BOARD WINDOW RED: ${caught}/${MUTATIONS.length} caught; files restored`);
