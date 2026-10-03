/**
 * RED DRIVE for the sale's price guard — `red:cashout-price-guard` (Vodacom plan S6, A8c).
 *
 *   npm run red:cashout-price-guard                  (needs a clean tree for its target — commit first)
 *   npm run red:cashout-price-guard -- --only "(4)"  (one mutation, by name prefix)
 *
 * Puts back each defect declared in `scripts/anchors/cashout-price-guard.anchors.mjs` into the real
 * `src/lib/server/market-service.ts`, runs the memory store's child of `test:cashout-price-guard`
 * (`scripts/lib/cashout-price-guard-child.mts`, the very cases `test:cashout` runs in predeploy), and requires it to go
 * red ON THAT MUTATION'S OWN ASSERTION. Then it puts the file back byte for byte. `test:sell-price-guard`'s in-process
 * twin proves the STATIC gate sees each defect; this proves the cases that drive the money path see it too.
 *
 * Follows `red-house-bot-money.mjs`: a lock file against a concurrent run, a refusal to start when the target differs from
 * git HEAD (a restore would bake an uncommitted edit in as the baseline), temp-file + rename writes, the shared anchor
 * resolver, a green baseline before any mutation, the shared restore guard, and a byte-identical check at the end.
 * MEMORY ONLY, deliberately: every defect here is the guard's own logic, which no store changes; the Postgres half of the
 * same cases stays `test:cashout-price-guard`'s.
 * ⛔ Run it detached under the heavy-node lock, never piped, and never beside another red drive: it rewrites a live money
 * file for minutes (ten memory runs). From `red:all`, give it a `--timeout` of at least 900 seconds.
 * ⚠️ This file carries no backslash: line breaks are built from their code points.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { MUTATIONS } from "./anchors/cashout-price-guard.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";
import { armRestoreGuard, haltIfStopped, isConsoleStop, requestStop } from "./lib/red-restore-guard.mjs";

const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const onlyArg = process.argv.find((a, i) => process.argv[i - 1] === "--only");
const ONLY = onlyArg ? onlyArg.split(",").map((x) => x.trim()).filter(Boolean) : [];
const DEFECTS = ONLY.length ? MUTATIONS.filter((d) => ONLY.some((o) => d.name.startsWith(o))) : MUTATIONS;
const CHILD = "npx tsx scripts/lib/cashout-price-guard-child.mts";
const MEM_ENV = { ...process.env, DATABASE_URL: "", USE_PRISMA_DAL: "false", HB_MONEY_STORE: "memory" };
const lf = (s) => s.split(CR + LF).join(LF);

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const write = (p, s) => {
  const tmp = `${p}.red-tmp`;
  writeFileSync(tmp, s);
  renameSync(tmp, p);
  if (readFileSync(p, "utf8") !== s) throw new Error(`read-back mismatch on ${p}`);
};
const run = () => {
  try {
    const out = execSync(CHILD, { stdio: "pipe", encoding: "utf8", maxBuffer: 256 * 1024 * 1024, env: MEM_ENV, timeout: 20 * 60_000 });
    return { red: false, output: out };
  } catch (e) {
    if (isConsoleStop(e)) requestStop("the child exited with STATUS_CONTROL_C_EXIT — a console stop (Ctrl-C / Ctrl-Break) reached this drive");
    return { red: true, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
};

const LOCK = "scripts/.red-cashout-price-guard.lock";
if (existsSync(LOCK)) {
  console.error(`REFUSING TO RUN — ${LOCK} exists, so another drive of this red is in flight. If none is, delete it.`);
  process.exit(1);
}
const files = [...new Set(DEFECTS.map((d) => d.file))];
for (const f of files) {
  const head = execSync(`git show HEAD:${f}`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (lf(head) !== lf(readFileSync(f, "utf8"))) {
    console.error(`REFUSING TO RUN — ${f} differs from git HEAD. Commit or stash first.`);
    process.exit(1);
  }
}
writeFileSync(LOCK, `${process.pid} ${new Date().toISOString()}${LF}`);
const releaseLock = () => { try { unlinkSync(LOCK); } catch { /* already gone */ } };
process.on("exit", releaseLock);

const original = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const shaBefore = new Map(files.map((f) => [f, sha(f)]));
/** ⛔ A KILLED DRIVE MUST NOT LEAVE A DEFECT ON DISK — the restore every red harness of this kind arms (`red-restore-guard.mjs`). */
armRestoreGuard({ original, write, releaseLock, label: "cashout-price-guard RED" });

// ⭐ The child must be GREEN first — a red baseline would make every mutation look caught.
const base = run();
haltIfStopped("cashout-price-guard RED");
if (base.red) {
  const fails = base.output.split(LF).filter((l) => l.trimStart().startsWith("FAIL")).slice(0, 10);
  console.error(`REFUSING TO RUN — the memory child is RED before any mutation:${LF}${fails.join(LF) || base.output.slice(-2000)}`);
  process.exit(1);
}
console.log("baseline green · the memory child of test:cashout-price-guard");

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
  let result;
  try {
    result = run();
  } finally {
    write(d.file, src);
  }
  // ⛔ The file is back; if the operator stopped us, stop HERE rather than injecting the next defect.
  haltIfStopped("cashout-price-guard RED");
  const fails = result.output.split(LF).filter((l) => l.trimStart().startsWith("FAIL"));
  const own = fails.find((l) => l.includes(d.expect));
  if (result.red && own) { caught++; console.log(`CAUGHT ${d.name}${LF}        ↳ ${own.trim()}`); }
  else if (result.red) { missed++; console.log(`WRONG-ASSERTION ${d.name} — red, but NOT on "${d.expect}"${LF}        ↳ ${(fails[0] ?? result.output.split(LF).slice(-3).join(" ")).trim()}`); }
  else { missed++; console.log(`MISSED ${d.name} — the memory child stayed GREEN with this defect injected`); }
}

let dirty = 0;
for (const [p, before] of shaBefore) {
  if (sha(p) !== before) { dirty++; console.log(`DIRTY ${p} — NOT restored byte-identically`); }
  try { unlinkSync(`${p}.red-tmp`); } catch { /* already gone */ }
}
console.log(`${LF}cashout-price-guard RED: ${caught}/${DEFECTS.length} caught, ${missed} missed, ${dirty} files left dirty`);
if (missed > 0 || dirty > 0 || caught !== DEFECTS.length) process.exit(1);
