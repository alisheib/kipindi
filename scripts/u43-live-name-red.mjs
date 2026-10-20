/** U43 B5 red proof: reverting any live round-name seam makes its guard fail. */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { MUTATIONS as cases } from "./anchors/u43-live-name.anchors.mjs";

const gate = () => {
  try { return { code: 0, out: execFileSync("npx", ["tsx", "scripts/u43-live-name.test.mts"], { encoding: "utf8", shell: process.platform === "win32" }) }; }
  catch (e) { return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") }; }
};
if (gate().code !== 0) throw new Error("Live-name guard is red before mutation");
let caught = 0;
for (const item of cases) {
  const original = readFileSync(item.file, "utf8");
  const from = original.includes("\r\n") ? item.from.replaceAll("\n", "\r\n") : item.from;
  const to = original.includes("\r\n") ? item.to.replaceAll("\n", "\r\n") : item.to;
  if (original.split(from).length !== 2) throw new Error(`Anchor invalid: ${item.file} ${item.expect}`);
  let result;
  try { writeFileSync(item.file, original.replace(from, to)); result = gate(); }
  finally { writeFileSync(item.file, original); }
  const pass = result.code !== 0 && result.out.includes(`FAIL ${item.expect}`);
  console.log(`${pass ? "CAUGHT" : "MISSED"} ${item.expect}`);
  if (pass) caught++;
}
if (gate().code !== 0 || caught !== cases.length) throw new Error(`${caught}/${cases.length} caught or guard red after restore`);
console.log(`U43 LIVE NAME RED: ${caught}/${cases.length} caught; files restored`);
