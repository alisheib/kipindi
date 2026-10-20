/** Physical U43 B5 mutations run only against copied CSS, never the shared tree. */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS as mutations } from "./anchors/u43-motion-contract.anchors.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const gate = join(repo, "scripts/u43-motion-contract.test.mjs");
const files = ["src/app/motion.css", "src/app/globals.css"];
const hash = (file) => createHash("sha256").update(readFileSync(join(repo, file))).digest("hex");
const before = new Map(files.map((file) => [file, hash(file)]));
function run(root) {
  const result = spawnSync(process.execPath, [gate], {
    cwd: repo, encoding: "utf8", env: { ...process.env, U43_MOTION_ROOT: root },
  });
  return { code: result.status, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), "u43-motion-red-"));
  mkdirSync(join(dir, "src/app"), { recursive: true });
  for (const file of files) copyFileSync(join(repo, file), join(dir, file));
  return dir;
}

function clean(dir) {
  const parent = realpathSync(tmpdir());
  const target = realpathSync(dir);
  if (!target.startsWith(`${parent}${sep}`)) throw new Error(`Refusing to remove non-temp path: ${target}`);
  rmSync(target, { recursive: true, force: true });
}

const base = run(repo);
if (base.code !== 0) throw new Error(`U43 motion guard is red before mutations:\n${base.output}`);
let caught = 0;
for (const mutation of mutations) {
  const dir = scratch();
  try {
    const path = join(dir, mutation.file);
    const source = readFileSync(path, "utf8");
    if (source.split(mutation.from).length !== 2) throw new Error(`Stale or ambiguous mutation anchor ${mutation.id}`);
    writeFileSync(path, source.replace(mutation.from, mutation.to));
    const result = run(dir);
    const failed = result.output.split(/\r?\n/).some((line) => line.startsWith(`FAIL ${mutation.id} `));
    const pass = result.code !== 0 && failed;
    console.log(`${pass ? "CAUGHT" : "MISSED"} ${mutation.id}: CSS mutant read by named assertion`);
    if (!pass) throw new Error(`Mutation ${mutation.id} not caught by its assertion:\n${result.output}`);
    caught++;
  } finally {
    clean(dir);
  }
}
for (const file of files) if (hash(file) !== before.get(file)) throw new Error(`Shared file changed during red proof: ${file}`);
if (run(repo).code !== 0) throw new Error("U43 motion guard failed after red proof");
console.log(`U43 MOTION RED: ${caught}/${mutations.length} caught; scratch removed; shared CSS byte-unchanged`);
