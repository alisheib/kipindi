/**
 * RED DRIVE for the fence (MASWALI-BUILD S0.5) — `red:maswali-fence`.
 *
 *   npm run red:maswali-fence                  (needs a clean tree for its targets — commit first)
 *   npm run red:maswali-fence -- --only "(4)"  (one mutation, by name prefix)
 *
 * Puts back each defect declared in `scripts/anchors/maswali-fence.anchors.mjs` into the real source (the one reading
 * of a stored line, the generic money doors, the poll scheduler, the fee mirror, the leaderboard, the permalink, the
 * house-bot policy, the settle action), runs the memory store's child of `test:maswali-fence`
 * (`scripts/lib/maswali-fence-child.mts`), and requires it to go red ON THAT MUTATION'S OWN ASSERTION. Then it puts
 * every file back byte for byte.
 *
 * Built on `red-cashout-price-guard.mjs`: a lock file against a concurrent run, a refusal to start when a target differs
 * from git HEAD, temp-file + rename writes, the shared anchor resolver, a green baseline before any mutation, the shared
 * restore guard, and a byte-identical check at the end. MEMORY ONLY: the Postgres-only reads are held by the suite's own
 * Postgres child (see the anchors file).
 * ⛔ Run it detached under the heavy-node lock, never piped, and never beside another red drive: it rewrites live money
 * files for minutes (seventeen memory runs). From `red:all`, give it a `--timeout` of at least 1200 seconds.
 * ⚠️ This file carries no backslash: line breaks are built from their code points.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { MUTATIONS } from "./anchors/maswali-fence.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";
import { armRestoreGuard, haltIfStopped, isConsoleStop, requestStop } from "./lib/red-restore-guard.mjs";

const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const onlyArg = process.argv.find((a, i) => process.argv[i - 1] === "--only");
const ONLY = onlyArg ? onlyArg.split(",").map((x) => x.trim()).filter(Boolean) : [];
const DEFECTS = ONLY.length ? MUTATIONS.filter((d) => ONLY.some((o) => d.name.startsWith(o))) : MUTATIONS;
const CHILD = "npx tsx scripts/lib/maswali-fence-child.mts";
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

const LOCK = "scripts/.red-maswali-fence.lock";
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
armRestoreGuard({ original, write, releaseLock, label: "maswali-fence RED" });

// ⭐ The child must be GREEN first — a red baseline would make every mutation look caught.
const base = run();
haltIfStopped("maswali-fence RED");
if (base.red) {
  const fails = base.output.split(LF).filter((l) => l.trimStart().startsWith("FAIL")).slice(0, 10);
  console.error(`REFUSING TO RUN — the memory child is RED before any mutation:${LF}${fails.join(LF) || base.output.slice(-2000)}`);
  process.exit(1);
}
console.log("baseline green · the memory child of test:maswali-fence");

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
  haltIfStopped("maswali-fence RED");
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
console.log(`${LF}maswali-fence RED: ${caught}/${DEFECTS.length} caught, ${missed} missed, ${dirty} files left dirty`);
if (missed > 0 || dirty > 0 || caught !== DEFECTS.length) process.exit(1);
