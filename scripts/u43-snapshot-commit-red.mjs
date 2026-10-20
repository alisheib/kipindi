/** Recreate each precommit chart write; only the targeted PostgreSQL rollback assertion may count as red. */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { MUTATIONS as mutations } from "./anchors/u43-snapshot-commit.anchors.mjs";

if (!process.env.VERIFY_DATABASE_URL) throw new Error("snapshot red needs the disposable local PostgreSQL cluster");
const target = new URL("../src/lib/server/market-service.ts", import.meta.url);
const original = readFileSync(target, "utf8");
const run = () => {
  const r = spawnSync("npx", ["tsx", "scripts/u43-snapshot-commit.test.mts"], {
    cwd: process.cwd(), env: process.env, encoding: "utf8", shell: process.platform === "win32",
    timeout: 5 * 60_000, maxBuffer: 128 * 1024 * 1024,
  });
  return { code: r.status ?? 1, output: `${r.stdout ?? ""}${r.stderr ?? ""}` };
};

const baseline = run();
if (baseline.code !== 0 || !baseline.output.includes("ALL PASS — test:u43-snapshot-commit")) {
  throw new Error(`snapshot guard was red before any mutation: ${baseline.output.slice(-1400)}`);
}
let caught = 0;
for (const mutation of mutations) {
  if (original.split(mutation.from).length !== 2 || mutation.to.includes(mutation.from)) {
    throw new Error(`snapshot red anchor absent or ambiguous: ${mutation.name}`);
  }
  let result;
  try {
    writeFileSync(target, original.replace(mutation.from, mutation.to));
    result = run();
  } finally {
    writeFileSync(target, original);
  }
  const passed = result.code !== 0 && result.output.includes(mutation.expected);
  console.log(`${passed ? "CAUGHT" : "MISSED"} ${mutation.name}`);
  if (!passed) console.log(result.output.slice(-1400));
  if (passed) caught++;
}
if (readFileSync(target, "utf8") !== original || caught !== mutations.length) {
  throw new Error(`snapshot red caught ${caught}/${mutations.length} or did not restore source`);
}
console.log(`U43 SNAPSHOT RED: ${caught}/${mutations.length} caught; source restored byte for byte`);
