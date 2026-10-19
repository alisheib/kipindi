/** Mutate the real Next config, require the focused guard to fail for the named reason, then restore it. */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { MUTATIONS } from "./anchors/static-cache-scope.anchors.mjs";

const cli = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
const gate = () => {
  const run = spawnSync(process.execPath, [cli, "scripts/static-cache-scope.test.mts"], {
    cwd: process.cwd(), encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
  });
  return { code: run.status ?? 1, output: String(run.stdout ?? "") + String(run.stderr ?? "") };
};

if (gate().code !== 0) throw new Error("Static cache scope guard is red before mutation");
let caught = 0;
for (const mutation of MUTATIONS) {
  const original = readFileSync(mutation.file, "utf8");
  if (original.split(mutation.from).length !== 2 || mutation.to.includes(mutation.from)) {
    throw new Error(`Invalid unique anchor: ${mutation.name}`);
  }
  let run;
  try {
    writeFileSync(mutation.file, original.replace(mutation.from, mutation.to));
    run = gate();
  } finally {
    writeFileSync(mutation.file, original);
  }
  const pass = run.code !== 0 && run.output.includes(mutation.expect);
  console.log(`${pass ? "CAUGHT" : "MISSED"} ${mutation.name}: ${mutation.expect}`);
  if (pass) caught++;
}
if (gate().code !== 0 || caught !== MUTATIONS.length) throw new Error(`${caught}/${MUTATIONS.length} caught or guard red after restore`);
console.log(`STATIC CACHE SCOPE RED: ${caught}/${MUTATIONS.length} caught; config restored`);
