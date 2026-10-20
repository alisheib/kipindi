/** Physical reversals of U43's lock budget, isolated from concurrent source edits. */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { MUTATIONS as cases } from "./anchors/u43-lock-budget.anchors.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rel = {
  locks: "src/lib/server/locks.ts",
  market: "src/lib/server/market-service.ts",
};
const originals = Object.fromEntries(Object.entries(rel).map(([key, path]) =>
  [key, readFileSync(join(repo, path))]));
const redRoot = mkdtempSync(join(tmpdir(), "u43-lock-budget-"));
const expectedParent = `${resolve(tmpdir())}${sep}`;
if (!resolve(redRoot).startsWith(expectedParent) || !basename(redRoot).startsWith("u43-lock-budget-")) {
  throw new Error("Refusing to use an unexpected red scratch directory");
}
const run = (root) => spawnSync(process.execPath, [join(repo, "scripts/u43-lock-budget.test.mjs")], {
  cwd: repo,
  env: { ...process.env, U43_LOCK_BUDGET_ROOT: root },
  encoding: "utf8", shell: false, timeout: 60_000,
});
let caught = 0;
try {
  for (const [key, path] of Object.entries(rel)) {
    const destination = join(redRoot, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, originals[key]);
  }
  const green = run(redRoot);
  if (green.status !== 0 || !green.stdout.includes("u43-lock-budget: 20 passed, 0 failed")) {
    throw new Error(`Refusing red plants without a green copied-source control: ${(green.stdout ?? "").slice(-800)} ${(green.stderr ?? "").slice(-400)}`);
  }
  for (const plant of cases) {
    const key = Object.keys(rel).find((candidate) => rel[candidate] === plant.file);
    if (!key) throw new Error(`Undeclared copied source: ${plant.file}`);
    const target = join(redRoot, plant.file);
    const original = originals[key];
    if (!readFileSync(target).equals(original)) throw new Error(`Copied source changed before ${plant.name}`);
    const source = original.toString("utf8");
    if (source.split(plant.from).length !== 2) throw new Error(`Red anchor absent or ambiguous: ${plant.name}`);
    writeFileSync(target, source.replace(plant.from, plant.to));
    try {
      const result = run(redRoot);
      if (result.status !== 1 || !(result.stdout ?? "").includes(plant.failure)) {
        throw new Error(`Mutation escaped its named assertion: ${plant.name}\n${(result.stdout ?? "").slice(-900)} ${(result.stderr ?? "").slice(-500)}`);
      }
      caught++;
      console.log(`RED ${plant.name}`);
    } finally {
      writeFileSync(target, original);
      if (!readFileSync(target).equals(original)) throw new Error(`Byte restore failed: ${plant.name}`);
    }
  }
  console.log(`u43-lock-budget red: ${caught}/${cases.length} caught; copied source restored`);
} finally {
  // The only recursive removal is the unique directory this process created.
  if (!resolve(redRoot).startsWith(expectedParent) || !basename(redRoot).startsWith("u43-lock-budget-")) {
    throw new Error("Refusing to remove an unexpected red scratch directory");
  }
  rmSync(redRoot, { recursive: true, force: true });
}
