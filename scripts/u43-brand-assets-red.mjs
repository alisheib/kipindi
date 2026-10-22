/** U43 brand asset red proof: a missing gilt centre or stale export breaks sync. */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { MUTATIONS } from "./anchors/u43-brand-assets.anchors.mjs";

const root = process.cwd();
const original = new Map([...new Set(MUTATIONS.map((m) => resolve(root, m.file)))].map((file) => [file, readFileSync(file)]));
const run = () => spawnSync("npm", ["run", "test:brand-assets", "--silent"], {
  cwd: root, encoding: "utf8", shell: process.platform === "win32",
});
let failed = 0;
function check(label, yes) {
  console.log(`${yes ? "PASS" : "FAIL"} ${label}`);
  if (!yes) failed++;
}
try {
  check("baseline assets in sync", run().status === 0);
  for (const { name: label, file: relativeFile, from, to, expectedAsset } of MUTATIONS) {
    const file = resolve(root, relativeFile);
    const bytes = original.get(file);
    const text = bytes.toString("utf8");
    check(`${label}: exact anchor`, text.split(from).length === 2);
    if (text.split(from).length !== 2) continue;
    try {
      writeFileSync(file, text.replace(from, to));
      const result = run();
      const output = `${result.stdout}${result.stderr}`;
      const caught = result.status !== 0 && output.includes(`DRIFTED  ${expectedAsset}`)
        && (relativeFile !== "src/lib/brand-mark.ts" || output.includes("DRIFTED  public/og/og-1200x630.png"));
      check(`${label}: red`, caught);
      if (!caught) console.log(`  diagnostic: exit=${result.status}; ${output.split("\n").filter((line) => /DRIFTED|error/i.test(line)).slice(0, 5).join(" | ")}`);
    } finally {
      writeFileSync(file, bytes);
    }
  }
} finally {
  for (const [file, bytes] of original) writeFileSync(file, bytes);
  check("sources restored byte for byte", [...original].every(([file, bytes]) => readFileSync(file).equals(bytes)));
}
console.log(`U43 brand assets red: ${failed ? `${failed} failed` : "all mutations caught"}`);
process.exitCode = failed ? 1 : 0;
