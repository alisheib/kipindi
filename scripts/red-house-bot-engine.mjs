/**
 * RED DRIVE for the house-bot engine — `red:house-bot-engine` (C4 step 11; 04 N1 red list, N2-E1…E8, 01 mutations,
 * MON-06, X7, L7).
 *
 *   npm run red:house-bot-engine              (needs a clean tree for its target files — commit first)
 *   npm run red:house-bot-engine -- --memory-only
 *   npm run red:house-bot-engine -- --only N1-1,MON-06
 *
 * Puts back each defect declared in `scripts/anchors/house-bot-engine.anchors.mjs`, runs the suite (and sections) it
 * names, and requires that run to go red ON THAT MUTATION'S OWN ASSERTION. Then it puts every file back byte for byte.
 *
 * Follows `red-house-bot-money.mjs`: a lock file against a concurrent run, a refusal to start when a target differs from
 * git HEAD, temp-file + rename writes, the shared anchor resolver, a green baseline per suite-and-sections before any
 * mutation, and a byte-identical check at the end.
 *
 * ⚠️ A run filtered to some sections cannot meet the two-store runner's population floor (`0.mem`/`0.pg · … exits 0
 * with assertions`). A floor line is not counted as red ONLY when a filter is on AND its own detail shows the child
 * ran clean and the FLOOR is the only limb that failed (exit 0, at least one assertion, none failed, passes BELOW the
 * stated floor); a child that crashed or failed stays red. That one exemption lives in
 * `scripts/lib/red-two-store-floor.mjs` and is proved both ways by `npm run test:red-engine-floor`. The runner's
 * closing `ALL PASS`/`FAILURES` line is derived from those lines and is never counted on its own (the first full run,
 * 2026-09-16, refused on it: Postgres §18 was 70 passed, 0 failed, under the 90 floor). A Postgres suite whose `0.pg` line never
 * printed did not reach Postgres, and is red.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { MUTATIONS as DEFECTS_ALL } from "./anchors/house-bot-engine.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";
import { armRestoreGuard } from "./lib/red-restore-guard.mjs";
import { benignFloor, floorShapeDrifted } from "./lib/red-two-store-floor.mjs";

const MEMORY_ONLY = process.argv.includes("--memory-only");
const onlyArg = process.argv.find((a, i) => process.argv[i - 1] === "--only");
const ONLY = onlyArg ? onlyArg.split(",").map((s) => s.trim()).filter(Boolean) : [];
const DEFECTS = ONLY.length ? DEFECTS_ALL.filter((d) => ONLY.some((o) => d.name.startsWith(o))) : DEFECTS_ALL;
const MEM_ENV = { DATABASE_URL: "", USE_PRISMA_DAL: "false", HB_MONEY_STORE: "memory" };
const SUITES = {
  "engine-mem": { cmd: "npx tsx scripts/lib/house-bot-engine-cases.mts", env: MEM_ENV },
  "engine-pg": { cmd: "npx tsx scripts/db-scratch.mts --run npx tsx scripts/house-bot-engine.test.mts", env: {} },
  "caps-mem": { cmd: "npx tsx scripts/lib/house-bot-caps-cases.mts", env: MEM_ENV },
  "caps-pg": { cmd: "npx tsx scripts/db-scratch.mts --run npx tsx scripts/house-bot-caps.test.mts", env: {} },
  "info-edge-mem": { cmd: "npx tsx scripts/lib/house-bot-info-edge-cases.mts", env: MEM_ENV },
  "designation-mem": { cmd: "npx tsx scripts/lib/house-bot-designation-cases.mts", env: MEM_ENV },
  "comms-mem": { cmd: "npx tsx scripts/lib/house-bot-comms-cases.mts", env: MEM_ENV },
  "money-mem": { cmd: "npx tsx scripts/lib/house-bot-money-cases.mts", env: MEM_ENV },
  seam: { cmd: "npx tsx scripts/house-bot-seam.test.mts", env: {} },
};
const SUMMARY = /^\s*(?:ALL PASS|FAILURES) — /;

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const write = (p, s) => {
  const tmp = `${p}.red-tmp`;
  writeFileSync(tmp, s);
  renameSync(tmp, p);
  if (readFileSync(p, "utf8") !== s) throw new Error(`read-back mismatch on ${p}`);
};
const keyOf = (d) => `${d.suite}${d.sections ? `#${d.sections}` : ""}`;
const run = (d) => {
  const s = SUITES[d.suite];
  if (!s) throw new Error(`unknown suite ${d.suite}`);
  const env = { ...process.env, ...s.env, ...(d.sections ? { HB_ENGINE_SECTIONS: d.sections } : {}) };
  let output;
  try {
    output = execSync(s.cmd, { stdio: "pipe", encoding: "utf8", maxBuffer: 512 * 1024 * 1024, env, timeout: 45 * 60_000 });
  } catch (e) {
    output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  const lines = output.split("\n");
  // ⛔ A floor line the pattern can no longer read stays RED — failing closed is right — but it is NAMED here, because
  // the last time it drifted in silence the harness refused for five days and nobody could see why.
  for (const l of lines) {
    if (floorShapeDrifted(l)) {
      console.error(`⛔ FLOOR PATTERN DRIFTED — this two-store floor line no longer parses, so it counts as a REAL failure:\n   ${l.trim()}\n   Re-aim FLOOR in scripts/lib/red-two-store-floor.mjs at what scripts/lib/house-bot-two-stores.mts prints, and run \`npm run test:red-engine-floor\`.`);
    }
  }
  const fails = lines.filter((l) => /^\s*FAIL/.test(l) && !SUMMARY.test(l) && !benignFloor(Boolean(d.sections), l));
  // A child that died before its summary is red even with no FAIL line (a thrown section is a FAIL line; a crash is not).
  const crashed = !/@@SUMMARY|ALL PASS|FAILURES/.test(output);
  const pgMissing = d.suite.endsWith("-pg") && !/^\s*(?:PASS|FAIL) 0\.pg · /m.test(output);
  if (pgMissing) fails.push("FAIL 0.pg · NOT MEASURED — the Postgres half never ran");
  return { red: fails.length > 0 || crashed, fails, output, crashed };
};

const LOCK = "scripts/.red-house-bot-engine.lock";
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
 * ⛔ A KILLED DRIVE MUST NOT LEAVE A DEFECT ON DISK. This harness shed the leaking idiom at 85dc41af — the signal
 * handler released the lock and exited WITHOUT restoring, so a stopped drive left the injected defect in the worktree
 * looking like a plausible one-line change for the next `git add -A` in any lane to ship. The restore now lives in
 * ONE module all three house-bot red harnesses arm: read `scripts/lib/red-restore-guard.mjs` for what it covers, what
 * it cannot (a Windows `taskkill` runs nothing at all), and why this harness's own refusal to start on a dirty target
 * stays the load-bearing check.
 */
armRestoreGuard({ original, write, releaseLock, label: "house-bot-engine RED" });

// ⭐ Every suite-and-sections a mutation names must be GREEN first — a red baseline would make every mutation look caught.
const baselines = new Map();
for (const d of DEFECTS) {
  if (MEMORY_ONLY && d.suite.endsWith("-pg")) continue;
  if (!baselines.has(keyOf(d))) baselines.set(keyOf(d), d);
}
for (const [key, d] of baselines) {
  const base = run(d);
  if (base.red) {
    console.error(`REFUSING TO RUN — "${key}" is RED before any mutation:\n${base.fails.slice(0, 10).join("\n") || base.output.split("\n").slice(-6).join("\n")}`);
    process.exit(1);
  }
  console.log(`baseline green · ${key}`);
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
    result = run(d);
  } finally {
    write(d.file, src);
  }
  const own = result.fails.find((l) => l.includes(d.expect));
  if (result.red && own) { caught++; console.log(`CAUGHT ${d.name}\n        ↳ ${own.trim().slice(0, 260)}`); }
  else if (result.red) { missed++; console.log(`WRONG-ASSERTION ${d.name} — red, but NOT on "${d.expect}"\n        ↳ ${(result.fails[0] ?? (result.crashed ? `crashed: ${result.output.split("\n").slice(-3).join(" | ")}` : "")).trim().slice(0, 400)}`); }
  else { missed++; console.log(`MISSED ${d.name} — ${keyOf(d)} stayed GREEN with this defect injected`); }
}

let dirty = 0;
for (const [p, before] of shaBefore) {
  if (sha(p) !== before) { dirty++; console.log(`DIRTY ${p} — NOT restored byte-identically`); }
  try { unlinkSync(`${p}.red-tmp`); } catch { /* already gone */ }
}
console.log(`\nhouse-bot-engine RED: ${caught} caught, ${missed} missed, ${notMeasured} not measured, ${dirty} files left dirty`);
if (missed > 0 || dirty > 0 || notMeasured > 0) process.exit(1);
