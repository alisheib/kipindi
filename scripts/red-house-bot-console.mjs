/**
 * RED DRIVE for the desk's console — `red:house-bot-console` (C7-SPEC ruling 318; PLAN §12's RED-harness line names
 * the console by name, so ruling 217's "no new red key" is kept).
 *
 *   npm run red:house-bot-console                 (needs a clean tree for its target files — commit first)
 *   npm run red:house-bot-console -- --only 453
 *
 * Puts back each defect declared in `scripts/anchors/house-bot-console.anchors.mjs`, runs the suite it names, and
 * requires that run to go red ON THAT MUTATION'S OWN ASSERTION. Then it puts every file back byte for byte.
 *
 * ⛔ THIS HARNESS MUTATES THE REPOSITORY. Two concurrent red runs once left a live payout gate DISABLED while the
 * harness reported clean, so this follows `red-house-bot-engine.mjs` exactly: a lock file against a concurrent run, a
 * refusal to start when any target differs from git HEAD, temp-file + rename writes with a read-back check, a GREEN
 * baseline per suite before any mutation, the shared anchor resolver (which insists an anchor is unique), and a
 * byte-identical check at the end. A dirty file at exit is a non-zero exit, never a warning.
 *
 * ⛔ ANCHORS ARE DECLARED, NOT INLINE, so `test:red-anchors` §3 resolves every one of them against the tree on every
 * run — an anchor that rots is then reported by a suite that runs daily rather than by a drive nobody ran. §4's
 * ratchet is never raised: declaring is the only way in.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { MUTATIONS as DEFECTS_ALL } from "./anchors/house-bot-console.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

const onlyArg = process.argv.find((a, i) => process.argv[i - 1] === "--only");
const ONLY = onlyArg ? onlyArg.split(",").map((s) => s.trim()).filter(Boolean) : [];
const DEFECTS = ONLY.length ? DEFECTS_ALL.filter((d) => ONLY.some((o) => d.name.startsWith(o))) : DEFECTS_ALL;

const MEM_ENV = { DATABASE_URL: "", USE_PRISMA_DAL: "false", HB_MONEY_STORE: "memory" };
/**
 * ⚠️ THE MEMORY CHILD IS RUN DIRECTLY, not through the two-store runner. The source pins run in that child, every
 * mutation below is a source or a pure-logic defect, and a Postgres round trip per mutation would put this drive well
 * past an hour for nothing it measures. The PostgreSQL half of the same cases is measured by `test:house-bot-console`
 * itself at the commit close; a mutation whose subject is store-dependent would name `console-pg` instead.
 */
const SUITES = {
  "console-mem": { cmd: "npx tsx scripts/lib/house-bot-console-cases.mts", env: MEM_ENV },
  "console-pg": { cmd: "npx tsx scripts/db-scratch.mts --run npx tsx scripts/house-bot-console.test.mts", env: {} },
  rbac: { cmd: "npx tsx scripts/rbac.test.mts", env: {} },
  "admin-nav": { cmd: "npx tsx scripts/admin-nav.test.mts", env: {} },
  /* ⭐ The reports cases, memory child only — §0's source pins (0.260.1, 0.434, 0.512) run there and a Postgres
     round trip measures nothing they assert. Added with ruling 434's first declared mutation. */
  "reports-mem": { cmd: "npx tsx scripts/lib/house-bot-reports-cases.mts", env: MEM_ENV },
  /* ⭐ C7 step 6's fix pass · the disclosure suite, for ruling 387's grammar half. `src/lib/search/fields.ts` is
     value-imported by the client search box, so a house-named key in the picker's own schema ships in a public
     chunk — and the only suite that measures that population is this one. */
  disclosure: { cmd: "npx tsx scripts/house-bot-disclosure.test.mts", env: {} },
};
const SUMMARY = /^\s*(?:ALL PASS|FAILURES) — /;

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const write = (p, s) => {
  const tmp = `${p}.red-tmp`;
  writeFileSync(tmp, s);
  renameSync(tmp, p);
  if (readFileSync(p, "utf8") !== s) throw new Error(`read-back mismatch on ${p}`);
};
const run = (d) => {
  const s = SUITES[d.suite];
  if (!s) throw new Error(`unknown suite ${d.suite}`);
  let output;
  try {
    output = execSync(s.cmd, { stdio: "pipe", encoding: "utf8", maxBuffer: 512 * 1024 * 1024, env: { ...process.env, ...s.env }, timeout: 45 * 60_000 });
  } catch (e) {
    output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  const fails = output.split("\n").filter((l) => /^\s*FAIL/.test(l) && !SUMMARY.test(l));
  // A child that died before its own summary is red even with no FAIL line (a thrown section prints one; a crash does not).
  const crashed = !/@@SUMMARY|ALL PASS|FAILURES|passed,/.test(output);
  return { red: fails.length > 0 || crashed, fails, output, crashed };
};

const LOCK = "scripts/.red-house-bot-console.lock";
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

// ⭐ Every suite a mutation names must be GREEN first — a red baseline would make every mutation look caught.
for (const key of [...new Set(DEFECTS.map((d) => d.suite))]) {
  const base = run({ suite: key });
  if (base.red) {
    console.error(`REFUSING TO RUN — "${key}" is RED before any mutation:\n${base.fails.slice(0, 10).join("\n") || base.output.split("\n").slice(-6).join("\n")}`);
    process.exit(1);
  }
  console.log(`baseline green · ${key}`);
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
    result = run(d);
  } finally {
    write(d.file, src);
  }
  const own = result.fails.find((l) => l.includes(d.expect));
  if (result.red && own) { caught++; console.log(`CAUGHT ${d.name}\n        ↳ ${own.trim().slice(0, 260)}`); }
  else if (result.red) { missed++; console.log(`WRONG-ASSERTION ${d.name} — red, but NOT on "${d.expect}"\n        ↳ ${(result.fails[0] ?? (result.crashed ? `crashed: ${result.output.split("\n").slice(-3).join(" | ")}` : "")).trim().slice(0, 400)}`); }
  else { missed++; console.log(`MISSED ${d.name} — ${d.suite} stayed GREEN with this defect injected`); }
}

let dirty = 0;
for (const [p, before] of shaBefore) {
  if (sha(p) !== before) { dirty++; console.log(`DIRTY ${p} — NOT restored byte-identically`); }
  try { unlinkSync(`${p}.red-tmp`); } catch { /* already gone */ }
}
console.log(`\nhouse-bot-console RED: ${caught} caught, ${missed} missed, ${dirty} files left dirty`);
if (missed > 0 || dirty > 0) process.exit(1);
