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
 * ran clean (exit 0, at least one assertion, none failed); a child that crashed or failed stays red. The runner's
 * closing `ALL PASS`/`FAILURES` line is derived from those lines and is never counted on its own (the first full run,
 * 2026-09-16, refused on it: Postgres §18 was 70 passed, 0 failed, under the 90 floor). A Postgres suite whose `0.pg` line never
 * printed did not reach Postgres, and is red.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { MUTATIONS as DEFECTS_ALL } from "./anchors/house-bot-engine.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

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
/**
 * 🔴 THIS HARNESS COULD NOT RUN AT ALL FOR THREE DAYS, AND NOTHING SAID SO (found and repaired by C5-8
 * phase 3, 2026-09-20). A SECTION-NARROWED child legitimately prints fewer assertions than the WHOLE
 * suite's `minPass`, so `0.mem` / `0.pg` go red on the floor while every case that ran passed; `abfe07d5`
 * (2026-09-16) added `benignFloor` to excuse exactly that, matching the floor line by its detail.
 * The next day `fbaad0dd` changed `lib/house-bot-two-stores.mts:44,80` to print
 * `… — exit 0 · 153 passed (at least 732) · 0 failed`, and the ` (at least N)` clause made this regex match
 * NOTHING. From that commit on, every sectioned baseline read RED and the harness exited before injecting a
 * single defect — `REFUSING TO RUN — "engine-pg#13" is RED before any mutation` — so all 39 declared engine
 * mutations were undemonstrable and `red:all` reported only a failing harness.
 * ⛔ THE REPAIR DOES NOT WIDEN THE EXCUSE: it still applies ONLY to a run this harness deliberately narrowed
 * (`d.sections`), and still requires exit 0, at least one assertion, and zero failures. The ` (at least N)`
 * clause is OPTIONAL so both formats parse.
 * ⭐ AND THE ROT CANNOT RECUR SILENTLY. A floor line under a sectioned run that this regex cannot parse is now
 * reported as a FORMAT MOVE, by name, instead of being read as a product defect — the failure mode above,
 * turned into a message that says what actually happened.
 */
const FLOOR = /^\s*FAIL 0\.(?:mem|pg) · the (?:memory|Postgres) run exits 0 with assertions and no failure — exit (\d+) · (\d+) passed(?: \(at least \d+\))? · (\d+) failed/;
const FLOOR_LINE = /^\s*FAIL 0\.(?:mem|pg) · the (?:memory|Postgres) run exits 0 with assertions and no failure/;
const SUMMARY = /^\s*(?:ALL PASS|FAILURES) — /;
const benignFloor = (d, line) => {
  if (!d.sections) return false;
  const m = FLOOR.exec(line);
  if (!m) {
    if (FLOOR_LINE.test(line)) {
      console.error(`\n!! THE FLOOR LINE'S FORMAT HAS MOVED — this harness can no longer read it, so it cannot tell a narrowed run from a real floor failure:\n   ${line.trim()}\n   Update FLOOR in ${import.meta.url.split("/").pop()} in the same commit as the format change.`);
      process.exit(2);
    }
    return false;
  }
  return m[1] === "0" && Number(m[2]) > 0 && m[3] === "0";
};

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
  const fails = output.split("\n").filter((l) => /^\s*FAIL/.test(l) && !SUMMARY.test(l) && !benignFloor(d, l));
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
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { releaseLock(); process.exit(1); });

const original = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const shaBefore = new Map(files.map((f) => [f, sha(f)]));

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
