/** Physical source-copy red proof for U43's R6-A and R7-A guard repairs. */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolveAnchor, toEol } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/visual-r6a-r7a.anchors.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tsx = join(root, "node_modules/tsx/dist/cli.mjs");
const run = (gate, source) => {
  const temp = join(root, "scripts", `.tmp-${gate.split("/").at(-1)}-${randomUUID()}.mts`);
  try {
    writeFileSync(temp, source);
    const result = spawnSync(process.execPath, [tsx, temp], { cwd: root, encoding: "utf8", timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
    return { code: result.status, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
  } finally {
    unlinkSync(temp);
  }
};

for (const gate of [...new Set(MUTATIONS.map((m) => m.file))]) {
  const source = readFileSync(join(root, gate), "utf8");
  const baseline = run(gate, source);
  if (baseline.code !== 0 || !baseline.output.includes("0 failed")) throw new Error(`${gate}: baseline must be green\n${baseline.output.slice(-1500)}`);
  for (const mutation of MUTATIONS.filter((m) => m.file === gate)) {
    const anchor = resolveAnchor(source, mutation.from);
    if (!anchor.ok) throw new Error(`${mutation.name}: ${anchor.reason}`);
    const changed = source.replace(anchor.needle, toEol(mutation.to, anchor.eol));
    const red = run(gate, changed);
    if (red.code !== 1 || !red.output.includes(mutation.expect)) throw new Error(`${mutation.name}: expected ${mutation.expect}\n${red.output.slice(-1500)}`);
    console.log(`RED ${mutation.name}: ${mutation.expect}`);
  }
  if (readFileSync(join(root, gate), "utf8") !== source) throw new Error(`${gate}: source drifted`);
}
console.log(`visual-r6a-r7a-red: ${MUTATIONS.length}/${MUTATIONS.length} physical source-copy mutations caught; originals unchanged`);
