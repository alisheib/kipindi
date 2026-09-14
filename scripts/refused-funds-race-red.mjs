/**
 * RED DRIVE for `test:refused-funds-race` — restore each of S1's three drafted money defects, prove the
 * suite notices each on its OWN assertion, and put the tree back byte for byte.
 *
 *   Run: npm run red:refused-funds-race      (needs a clean tree for its target files — commit first)
 *
 * Follows `kyc-gate-red.mjs` exactly: a lock file against a second concurrent run, a refusal to start
 * when a target file differs from git HEAD (a restore would bake an uncommitted edit in as the
 * baseline), temp-file + rename writes (E-173), the shared anchor resolver, and a byte-identical check.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { MUTATIONS as DEFECTS } from "./anchors/refused-funds-race.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const write = (p, s) => {
  const tmp = `${p}.red-tmp`;
  writeFileSync(tmp, s);
  renameSync(tmp, p);
  if (readFileSync(p, "utf8") !== s) throw new Error(`read-back mismatch on ${p}`);
};

const LOCK = "scripts/.refused-funds-race-red.lock";
if (existsSync(LOCK)) {
  console.error(`REFUSING TO RUN — ${LOCK} exists, so another red drive is in flight. If none is, delete it.`);
  process.exit(1);
}
const files = [...new Set(DEFECTS.map((d) => d.file))];
for (const f of files) {
  const head = execSync(`git show HEAD:${f}`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (head.replace(/\r\n/g, "\n") !== readFileSync(f, "utf8").replace(/\r\n/g, "\n")) {
    console.error(`REFUSING TO RUN — ${f} differs from git HEAD. Commit or stash first.`);
    process.exit(1);
  }
}
writeFileSync(LOCK, `${process.pid} ${new Date().toISOString()}\n`);
const releaseLock = () => { try { unlinkSync(LOCK); } catch { /* already gone */ } };
process.on("exit", releaseLock);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { releaseLock(); process.exit(1); });

const original = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const shaBefore = new Map(files.map((f) => [f, sha(f)]));

// ⭐ The unmutated suite must be GREEN first — a red baseline would make every mutation look caught.
try {
  execSync("npx tsx scripts/refused-funds-race.test.mts", { stdio: "pipe", encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  console.error(`REFUSING TO RUN — the suite is RED before any mutation:\n${`${e.stdout ?? ""}${e.stderr ?? ""}`.slice(-2000)}`);
  process.exit(1);
}

let caught = 0, missed = 0;
for (const d of DEFECTS) {
  const src = original.get(d.file);
  let mutated;
  try {
    mutated = injectDefect(src, d.from, d.to);
  } catch (err) {
    console.log(`STALE ${d.name} — ${err.message}; the harness is measuring nothing`);
    missed++;
    continue;
  }
  write(d.file, mutated);
  let red = false, output = "";
  try {
    execSync("npx tsx scripts/refused-funds-race.test.mts", { stdio: "pipe", encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    red = true;
    output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  } finally {
    write(d.file, src);
  }
  const fails = output.split("\n").filter((l) => l.startsWith("FAIL"));
  const own = fails.find((l) => l.includes(d.check));
  if (red && own) { caught++; console.log(`CAUGHT ${d.name}\n        ↳ ${own.trim()}`); }
  else if (red) { missed++; console.log(`WRONG-ASSERTION ${d.name} — red, but NOT on "${d.check}"\n        ↳ ${(fails[0] ?? output.split("\n").slice(-3).join(" ")).trim()}`); }
  else { missed++; console.log(`MISSED ${d.name} — the suite stayed GREEN with this defect injected`); }
}

let dirty = 0;
for (const [p, before] of shaBefore) {
  if (sha(p) !== before) { dirty++; console.log(`DIRTY ${p} — NOT restored byte-identically`); }
  try { unlinkSync(`${p}.red-tmp`); } catch { /* already gone */ }
}
console.log(`\nrefused-funds-race RED: ${caught} caught, ${missed} missed, ${dirty} files left dirty`);
if (missed > 0 || dirty > 0) process.exit(1);
