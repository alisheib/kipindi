/** Disk mutation proof for U43 B5 error treatment. */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { MUTATIONS } from "./anchors/u43-error-palette.anchors.mjs";

const root = process.cwd();
const originals = new Map([...new Set(MUTATIONS.map((m) => join(root, m.file)))].map((f) => [f, readFileSync(f, "utf8")]));
let failed = 0;
const check = (label, yes, note = "") => {
  console.log(`${yes ? "PASS" : "FAIL"} ${label}${note ? ` — ${note}` : ""}`);
  if (!yes) failed++;
};
const guard = () => spawnSync("npm", ["run", "test:u43-error-palette", "--silent"], { cwd: root, encoding: "utf8", shell: process.platform === "win32" });
try {
  check("baseline guard green", guard().status === 0);
  for (const m of MUTATIONS) {
    const path = join(root, m.file);
    const original = originals.get(path);
    const unique = original.split(m.from).length === 2;
    check(`${m.name}: exact anchor`, unique);
    if (!unique) continue;
    try {
      writeFileSync(path, original.replace(m.from, m.to));
      const result = guard();
      check(`${m.name}: red at ${m.expected}`, result.status !== 0 && `${result.stdout ?? ""}${result.stderr ?? ""}`.includes(`FAIL ${m.expected}`), `exit ${result.status}`);
    } finally {
      writeFileSync(path, original);
    }
  }
} finally {
  for (const [path, original] of originals) writeFileSync(path, original);
  check("sources restored byte for byte", [...originals].every(([path, original]) => readFileSync(path, "utf8") === original));
}
console.log(`U43 error palette red: ${failed ? `${failed} failed` : "all mutations caught"}`);
process.exit(failed ? 1 : 0);
