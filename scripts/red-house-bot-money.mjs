/**
 * RED DRIVE for the house-bot money seam — `red:house-bot-money`.
 *
 *   npm run red:house-bot-money            (needs a clean tree for its target files — commit first)
 *   npm run red:house-bot-money -- --only "(e)"   (one mutation, by name prefix)
 *
 * Puts back each money defect declared in `scripts/anchors/house-bot-money.anchors.mjs` and the seam
 * source pins in `scripts/anchors/house-bot-seam.anchors.mjs`, runs the suite each one names, and requires
 * that suite to go red ON THAT MUTATION'S OWN ASSERTION. Then it puts every file back byte for byte.
 *
 * Follows `refused-funds-race-red.mjs`: a lock file against a concurrent run, a refusal to start when a
 * target differs from git HEAD (a restore would bake an uncommitted edit in as the baseline), temp-file +
 * rename writes, the shared anchor resolver, a green baseline per suite before any mutation, and a
 * byte-identical check at the end.
 *
 * `money-pg` / `caps-pg` mutations boot the scratch Postgres (`db-scratch --run`) and take minutes each; run
 * with `--memory-only` to skip them, which prints them as NOT MEASURED and exits non-zero.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { MUTATIONS as MONEY } from "./anchors/house-bot-money.anchors.mjs";
import { MUTATIONS as SEAM } from "./anchors/house-bot-seam.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";
import { armRestoreGuard, haltIfStopped, isConsoleStop, requestStop } from "./lib/red-restore-guard.mjs";

const MEMORY_ONLY = process.argv.includes("--memory-only");
// `--only (e),H5` runs just the named mutations (prefix match on the name) — for re-proving one fix without the fleet.
const onlyArg = process.argv.find((a, i) => process.argv[i - 1] === "--only");
const ONLY = onlyArg ? onlyArg.split(",").map((x) => x.trim()).filter(Boolean) : [];
const ALL_DEFECTS = [...SEAM, ...MONEY];
const DEFECTS = ONLY.length ? ALL_DEFECTS.filter((d) => ONLY.some((o) => d.name.startsWith(o))) : ALL_DEFECTS;
const SUITES = {
  seam: "npx tsx scripts/house-bot-seam.test.mts",
  "money-mem": "npx tsx scripts/lib/house-bot-money-cases.mts",
  "caps-mem": "npx tsx scripts/lib/house-bot-caps-cases.mts",
  // D19-5 (C4 ruling 152): the designation cases prove the holder is told nothing.
  "designation-mem": "npx tsx scripts/lib/house-bot-designation-cases.mts",
  "money-pg": "npx tsx scripts/db-scratch.mts --run npx tsx scripts/house-bot-money.test.mts",
  "caps-pg": "npx tsx scripts/db-scratch.mts --run npx tsx scripts/house-bot-caps.test.mts",
  /* ⭐ C5-8 · §1j row 84's five marker declarations. `0.232` — the rule that every POSITIONED transaction write
     copies the marker from the object whose id is its `positionId` — lives in the reports cases, so the five
     money-marker mutations declared in `house-bot-money.anchors.mjs` name this suite. Memory child only: the
     rule is a syntax-tree read of `market-service.ts` and a Postgres round trip measures nothing it asserts. */
  "reports-mem": "npx tsx scripts/lib/house-bot-reports-cases.mts",
};
const MEM_ENV = { ...process.env, DATABASE_URL: "", USE_PRISMA_DAL: "false", HB_MONEY_STORE: "memory" };
const envFor = (suite) => (suite.endsWith("-mem") ? MEM_ENV : process.env);

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const write = (p, s) => {
  const tmp = `${p}.red-tmp`;
  writeFileSync(tmp, s);
  renameSync(tmp, p);
  if (readFileSync(p, "utf8") !== s) throw new Error(`read-back mismatch on ${p}`);
};
const run = (suite) => {
  try {
    const out = execSync(SUITES[suite], { stdio: "pipe", encoding: "utf8", maxBuffer: 256 * 1024 * 1024, env: envFor(suite), timeout: 45 * 60_000 });
    return { red: false, output: out };
  } catch (e) {
    if (isConsoleStop(e)) requestStop(`the suite child exited with STATUS_CONTROL_C_EXIT — a console stop (Ctrl-C / Ctrl-Break) reached this drive`);
    return { red: true, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
};

const LOCK = "scripts/.red-house-bot-money.lock";
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

const original = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const shaBefore = new Map(files.map((f) => [f, sha(f)]));

/**
 * ⛔ A KILLED DRIVE MUST NOT LEAVE A DEFECT ON DISK. Until 2026-09-21 the handler above released the lock and
 * exited WITHOUT restoring, so a stopped drive left the injected defect in the worktree looking like a plausible
 * one-line change for the next `git add -A` in any lane to ship. The restore is SHARED, not copied — read
 * `scripts/lib/red-restore-guard.mjs` for what it covers, what it cannot (a Windows `taskkill` runs nothing at all),
 * and why the harness's own refusal to start on a dirty target stays the load-bearing check.
 */
armRestoreGuard({ original, write, releaseLock, label: "house-bot-money RED" });

// ⭐ Every suite a mutation names must be GREEN first — a red baseline would make every mutation look caught.
const needed = [...new Set(DEFECTS.map((d) => d.suite))].filter((s) => !(MEMORY_ONLY && s.endsWith("-pg")));
for (const suite of needed) {
  const base = run(suite);
  haltIfStopped("house-bot-money RED");
  if (base.red) {
    console.error(`REFUSING TO RUN — suite "${suite}" is RED before any mutation:\n${base.output.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 10).join("\n") || base.output.slice(-2000)}`);
    process.exit(1);
  }
  console.log(`baseline green · ${suite}`);
}

let caught = 0, missed = 0, notMeasured = 0;
for (const d of DEFECTS) {
  if (MEMORY_ONLY && d.suite.endsWith("-pg")) {
    notMeasured++;
    console.log(`NOT MEASURED ${d.name} — ${d.suite} skipped by --memory-only`);
    continue;
  }
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
    result = run(d.suite);
  } finally {
    write(d.file, src);
  }
  // ⛔ The file is back; if the operator stopped us, stop HERE rather than injecting the next defect.
  haltIfStopped("house-bot-money RED");
  const fails = result.output.split("\n").filter((l) => /^\s*FAIL/.test(l));
  const own = fails.find((l) => l.includes(d.expect));
  if (result.red && own) { caught++; console.log(`CAUGHT ${d.name}\n        ↳ ${own.trim()}`); }
  else if (result.red) { missed++; console.log(`WRONG-ASSERTION ${d.name} — red, but NOT on "${d.expect}"\n        ↳ ${(fails[0] ?? result.output.split("\n").slice(-3).join(" ")).trim()}`); }
  else { missed++; console.log(`MISSED ${d.name} — ${d.suite} stayed GREEN with this defect injected`); }
}

let dirty = 0;
for (const [p, before] of shaBefore) {
  if (sha(p) !== before) { dirty++; console.log(`DIRTY ${p} — NOT restored byte-identically`); }
  try { unlinkSync(`${p}.red-tmp`); } catch { /* already gone */ }
}
console.log(`\nhouse-bot-money RED: ${caught} caught, ${missed} missed, ${notMeasured} not measured, ${dirty} files left dirty`);
if (missed > 0 || dirty > 0 || notMeasured > 0) process.exit(1);
