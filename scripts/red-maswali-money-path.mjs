/**
 * RED DRIVE for the Millionea money path (MASWALI-BUILD S3) — `red:maswali-money-path`.
 *
 *   npm run red:maswali-money-path                  (needs a clean tree for its targets — commit first)
 *   npm run red:maswali-money-path -- --only "(4)"  (one mutation, by name prefix)
 *
 * Puts back each defect declared in `scripts/anchors/maswali-money-path.anchors.mjs` into the real source — the cap not
 * counted in the lock, bonus money buying a ticket, a pool tolerance of one shilling, a guarantee not read before paying,
 * the loss limit offset by a win, a held winner paid free, a forfeit to the house, the drive's money in the public
 * jackpot, a close that does not wait for a purchase in flight, a week void that pushes no balance, refunds twice, books
 * no ledger group or leaves its tickets LIVE — runs the memory child that mutation names (`test:maswali-purchase`,
 * `test:maswali-settle`, `test:maswali-close-race` or `test:maswali-void`), and requires it to go red ON THAT
 * MUTATION'S OWN ASSERTION. Then it puts every file back byte for byte.
 *
 * Built on `red-maswali-engine.mjs`: a lock file against a concurrent run, a refusal to start when a target differs from
 * git HEAD, temp-file + rename writes, the shared anchor resolver, a green baseline of every suite it uses before any
 * mutation, the shared restore guard, and a byte-identical check at the end.
 * ⛔ Run it detached under the heavy-node lock, never piped, and never beside another red drive: it rewrites live files.
 * ⚠️ This file carries no backslash: line breaks are built from their code points.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { MUTATIONS } from "./anchors/maswali-money-path.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";
import { armRestoreGuard, haltIfStopped, isConsoleStop, requestStop } from "./lib/red-restore-guard.mjs";

const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const onlyArg = process.argv.find((a, i) => process.argv[i - 1] === "--only");
const ONLY = onlyArg ? onlyArg.split(",").map((x) => x.trim()).filter(Boolean) : [];
const DEFECTS = ONLY.length ? MUTATIONS.filter((d) => ONLY.some((o) => d.name.startsWith(o))) : MUTATIONS;
const SUITES = {
  purchase: "npx tsx scripts/lib/maswali-purchase-child.mts",
  settle: "npx tsx scripts/lib/maswali-settle-child.mts",
  closerace: "npx tsx scripts/lib/maswali-close-race-child.mts",
  void: "npx tsx scripts/lib/maswali-void-child.mts",
};
const MEM_ENV = { ...process.env, DATABASE_URL: "", USE_PRISMA_DAL: "false", HB_MONEY_STORE: "memory" };
const lf = (s) => s.split(CR + LF).join(LF);

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const write = (p, s) => {
  const tmp = `${p}.red-tmp`;
  writeFileSync(tmp, s);
  renameSync(tmp, p);
  if (readFileSync(p, "utf8") !== s) throw new Error(`read-back mismatch on ${p}`);
};
const run = (suite) => {
  try {
    const out = execSync(SUITES[suite], { stdio: "pipe", encoding: "utf8", maxBuffer: 256 * 1024 * 1024, env: MEM_ENV, timeout: 20 * 60_000 });
    return { red: false, output: out };
  } catch (e) {
    if (isConsoleStop(e)) requestStop("the child exited with STATUS_CONTROL_C_EXIT — a console stop (Ctrl-C / Ctrl-Break) reached this drive");
    return { red: true, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
};

const LOCK = "scripts/.red-maswali-money-path.lock";
if (existsSync(LOCK)) {
  console.error(`REFUSING TO RUN — ${LOCK} exists, so another drive of this red is in flight. If none is, delete it.`);
  process.exit(1);
}
for (const d of DEFECTS) if (!SUITES[d.suite]) { console.error(`REFUSING TO RUN — ${d.name} names an unknown suite "${d.suite}"`); process.exit(1); }
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
armRestoreGuard({ original, write, releaseLock, label: "maswali-money-path RED" });

// ⭐ Every suite this drive uses must be GREEN first — a red baseline would make every mutation look caught.
for (const suite of [...new Set(DEFECTS.map((d) => d.suite))]) {
  const base = run(suite);
  haltIfStopped("maswali-money-path RED");
  if (base.red) {
    const fails = base.output.split(LF).filter((l) => l.trimStart().startsWith("FAIL")).slice(0, 10);
    console.error(`REFUSING TO RUN — the ${suite} suite is RED before any mutation:${LF}${fails.join(LF) || base.output.slice(-2000)}`);
    process.exit(1);
  }
  console.log(`baseline green · ${suite}`);
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
  let result;
  try {
    result = run(d.suite);
  } finally {
    write(d.file, src);
  }
  haltIfStopped("maswali-money-path RED");
  const fails = result.output.split(LF).filter((l) => l.trimStart().startsWith("FAIL"));
  const own = fails.find((l) => l.includes(d.expect));
  if (result.red && own) { caught++; console.log(`CAUGHT ${d.name}${LF}        ↳ ${own.trim()}`); }
  else if (result.red) { missed++; console.log(`WRONG-ASSERTION ${d.name} — red, but NOT on "${d.expect}"${LF}        ↳ ${(fails[0] ?? result.output.split(LF).slice(-3).join(" ")).trim()}`); }
  else { missed++; console.log(`MISSED ${d.name} — the ${d.suite} suite stayed GREEN with this defect injected`); }
}

let dirty = 0;
for (const [p, before] of shaBefore) {
  if (sha(p) !== before) { dirty++; console.log(`DIRTY ${p} — NOT restored byte-identically`); }
  try { unlinkSync(`${p}.red-tmp`); } catch { /* already gone */ }
}
console.log(`${LF}maswali-money-path RED: ${caught}/${DEFECTS.length} caught, ${missed} missed, ${dirty} files left dirty`);
if (missed > 0 || dirty > 0 || caught !== DEFECTS.length) process.exit(1);
