#!/usr/bin/env node
/**
 * test:all — the single Phase-B safety net.
 *
 * Runs typecheck + every `test:*` suite declared in package.json (money,
 * security, concurrency, i18n, compliance), aggregates a pass/fail summary,
 * and exits non-zero if ANYTHING fails.
 *
 * Each suite is a fresh process, so the in-memory store never leaks across
 * suites.
 *
 * ⭐ SUITES RUN CONCURRENTLY (2026-10-05). The battery has roughly doubled since
 * this file's header was written, and it ran them one at a time — on a box with N
 * cores that is N-1 cores idle for the whole run, paid again on every push because
 * CI runs the same aggregator. Nothing is skipped and no suite was deleted to make
 * this faster: the saving is scheduling, not coverage. (No count is written here
 * on purpose — the run prints its own, and a number in a comment is a number that
 * will disagree with the thing it describes.)
 *
 * ⛔ CONCURRENCY IS NOT FREE FOR EVERY SUITE, AND THE CLASSES ARE MEASURED FROM
 * THE SUITE'S OWN SOURCE, NEVER FROM A LIST KEPT HERE. A hand-kept list of
 * "the parallel-unsafe ones" is a second definition of a fact the files already
 * state, and it would rot the first time somebody adds a suite that binds a port.
 * Three classes, each with its own cap:
 *   - `db`   — boots the throwaway Postgres cluster (`db-scratch.mts`, a FIXED
 *              port). Two at once fight over the same cluster → 1 at a time.
 *   - `port` — binds a socket or writes a fixed path (`.listen(`, `createServer(`,
 *              `localhost:3000`, a `tmp`/`scratch`/`.50pick` write). Two at once
 *              collide on the port or the file → 1 at a time.
 *   - `pure` — a fresh process over the in-memory Map store, touching nothing
 *              shared → up to `--jobs`.
 * Output stays in DECLARATION ORDER whatever order suites finish in, because a
 * readable, diffable log was the reason the original ran serially.
 *
 * Usage:
 *   node scripts/test-all.mjs              # typecheck + all suites
 *   node scripts/test-all.mjs --no-tsc     # skip the typecheck step
 *   node scripts/test-all.mjs --jobs 4     # cap concurrency (default: cores, max 8)
 *   node scripts/test-all.mjs --serial     # one at a time (the pre-2026-10-05 behaviour)
 *   node scripts/test-all.mjs --only money # only suites whose key contains "money"
 *   node scripts/test-all.mjs --filter kyc,ledger,wallet
 *   node scripts/test-all.mjs --skip responsive,motion  # drop suites needing a live server
 *
 * ⚠️ TWO suites need a live server on :3000 and FAIL without one — that is expected,
 * not a regression: `test:responsive` (9-width sweep) and `test:motion` (proves the
 * motion layer's tokens resolve in a real browser; a green unit suite cannot see a
 * dead `var()`, which is how the B5 outage killed all motion silently). Boot the app
 * and run them, or pass `--skip responsive,motion` in a serverless run.
 */
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cpus } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const args = process.argv.slice(2);
const noTsc = args.includes("--no-tsc");
const serial = args.includes("--serial");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null;
const filterIdx = args.indexOf("--filter");
const filterList = filterIdx >= 0 ? (args[filterIdx + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean) : null;
const skipIdx = args.indexOf("--skip");
const skipList = skipIdx >= 0 ? (args[skipIdx + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean) : null;
const jobsIdx = args.indexOf("--jobs");
const jobs = serial ? 1 : Math.max(1, Number(jobsIdx >= 0 ? args[jobsIdx + 1] : "") || Math.min(cpus().length, 8));

// Every `test:*` script except the aggregator itself, in declaration order.
let suites = Object.keys(pkg.scripts)
  .filter((k) => k.startsWith("test:") && k !== "test:all")
  .map((k) => ({ key: k, cmd: pkg.scripts[k] }));

if (only) suites = suites.filter((s) => s.key.includes(only));
if (filterList) suites = suites.filter((s) => filterList.some((f) => s.key.includes(f)));
// 🔴 `--skip` IS AN EXACT MATCH. `--only` and `--filter` stay substring matches on purpose —
// they are exploratory and a too-wide net just runs more tests. `--skip` is the opposite: a too
// wide net SILENTLY DISABLES GATES, and this one did. Under the old `includes(f)`,
// `--skip motion` also dropped `test:motion-ladder`, `test:glyph-motion` and
// `test:reduce-motion` — three suites that need no server and were never meant to be skipped —
// while the run still printed a clean pass. That is the reason CI could not simply be given the
// invocation this file's own header recommends.
// ⛔ AND A TERM THAT MATCHES NOTHING IS A HARD ERROR, because the failure it prevents is a typo
// in CI skipping zero suites, or a renamed suite quietly coming back into a serverless run.
if (skipList) {
  const keys = new Set(suites.map((s) => s.key));
  const unmatched = skipList.filter((f) => !keys.has(f) && !keys.has(`test:${f}`));
  if (unmatched.length) {
    console.error(`--skip named ${unmatched.length} suite(s) that do not exist: ${unmatched.join(", ")}`);
    console.error("Refusing to run: a skip term that matches nothing means the pipeline is not skipping what it thinks it is.");
    process.exit(1);
  }
  suites = suites.filter((s) => !skipList.some((f) => s.key === f || s.key === `test:${f}`));
}

// ── Resource class, read off the suite's OWN source ──────────────────────────
// Derived, never declared. `pure` is the default and the fallback: a suite whose
// file cannot be read is treated as the cheap class, because misreading a pure
// suite as exclusive only costs time, while the reverse would cost correctness —
// so the fallback has to be the one that cannot corrupt a run. (A file we cannot
// read is also one we cannot run, and it will fail loudly on its own.)
const HAZARD =
  /\.listen\(|createServer\(|(?:localhost|127\.0\.0\.1):\d{4}|writeFileSync\(\s*[`'"][^`'"]*(?:tmp|temp|scratch|\.50pick)/i;
const sourceCache = new Map();
function readSuiteSource(file) {
  if (!sourceCache.has(file)) {
    try {
      sourceCache.set(file, readFileSync(join(root, file), "utf8"));
    } catch {
      sourceCache.set(file, "");
    }
  }
  return sourceCache.get(file);
}
function classOf(cmd) {
  const targets = [...cmd.matchAll(/scripts\/[\w/.-]+\.(?:mts|mjs|cjs|ts)/g)].map((m) => m[0]);
  if (targets.some((f) => f.includes("db-scratch"))) return "db";
  return targets.some((f) => HAZARD.test(readSuiteSource(f))) ? "port" : "pure";
}
for (const s of suites) s.cls = classOf(s.cmd);
// Cap per class. `pure` gets the pool; the two exclusive classes get one slot each,
// and they run ALONGSIDE the pool rather than after it — a db suite and a port suite
// conflict with their own kind, not with an in-memory one.
const CAP = { pure: jobs, db: 1, port: 1 };

const npmCli = process.platform === "win32" ? "npm.cmd" : "npm";
const results = [];
const t0 = Date.now();

function hr() { return "─".repeat(64); }

function render(label, passed, ms, out) {
  const tag = passed ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  ${tag}  ${label.padEnd(26)} ${(ms / 1000).toFixed(1)}s`);
  if (!passed) {
    // Surface the failing tail so an unattended run captures the reason.
    const tail = out.trim().split("\n").slice(-25).join("\n");
    console.log(`\x1b[90m${tail.split("\n").map((l) => "        │ " + l).join("\n")}\x1b[0m`);
  }
}

// The typecheck step stays synchronous and first: everything after it is noise if
// the tree does not compile.
function runSync(label, cmdline) {
  const start = Date.now();
  // One string + `shell: true`, never (bin, argv[]) + shell: Node 24 deprecates that
  // combination (DEP0190) because the arguments are concatenated unescaped, and it
  // printed a warning over every single run. Nothing here is user input, but a warning
  // nobody can act on is how a log stops being read.
  const r = spawnSync(cmdline, {
    cwd: root,
    encoding: "utf8",
    shell: true, // npm.cmd needs a shell on Windows
    env: { ...process.env, FORCE_COLOR: "0" },
    maxBuffer: 32 * 1024 * 1024,
  });
  const ms = Date.now() - start;
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const passed = r.status === 0;
  results.push({ label, passed, ms, out });
  render(label, passed, ms, out);
  return passed;
}

function runAsync(suite) {
  const start = Date.now();
  return new Promise((resolve) => {
    const child = spawn(`${npmCli} run ${suite.key}`, {
      cwd: root,
      shell: true,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    let out = "";
    // Cap what we retain per suite; only the tail is ever printed, and 459 suites
    // holding unbounded stdout is how a green run dies of memory instead.
    const keep = (chunk) => {
      out += chunk;
      if (out.length > 2 * 1024 * 1024) out = out.slice(-1024 * 1024);
    };
    child.stdout.on("data", (d) => keep(String(d)));
    child.stderr.on("data", (d) => keep(String(d)));
    child.on("error", (e) => {
      out += `\n${e.message}`;
      resolve({ ...suite, passed: false, ms: Date.now() - start, out });
    });
    child.on("close", (code) => {
      resolve({ ...suite, passed: code === 0, ms: Date.now() - start, out });
    });
  });
}

console.log(
  `\n${hr()}\n  test:all — ${suites.length} suite(s)${noTsc ? "" : " + typecheck"}` +
    ` · ${jobs} job(s)\n${hr()}`,
);

if (!noTsc) runSync("typecheck", `${npmCli} run typecheck`);

// ── Scheduler ────────────────────────────────────────────────────────────────
// Suites start in declaration order, subject to their class cap, and their lines
// are PRINTED in declaration order regardless of the order they finish in: a
// finished suite is held until every suite declared before it has also printed.
// That keeps two runs of the same tree diffable, which is what the serial version
// was really buying.
const done = new Array(suites.length).fill(null);
let nextToPrint = 0;
function flush() {
  while (nextToPrint < suites.length && done[nextToPrint]) {
    const r = done[nextToPrint];
    results.push({ label: r.key, passed: r.passed, ms: r.ms, out: r.out });
    render(r.key, r.passed, r.ms, r.out);
    nextToPrint++;
  }
}

const inFlight = { pure: 0, db: 0, port: 0 };
let cursor = 0;
let active = 0;

await new Promise((resolveAll) => {
  if (!suites.length) return resolveAll();
  function pump() {
    // Walk forward for the next suite whose class has a free slot. Scanning past a
    // blocked suite is what lets a single slow `db` suite overlap the pure pool
    // instead of stalling the whole queue behind itself.
    let started = false;
    for (let i = cursor; i < suites.length; i++) {
      const s = suites[i];
      if (s.started || inFlight[s.cls] >= CAP[s.cls]) continue;
      if (active >= jobs) break;
      s.started = true;
      inFlight[s.cls]++;
      active++;
      started = true;
      runAsync(s).then((r) => {
        done[i] = r;
        inFlight[s.cls]--;
        active--;
        flush();
        if (nextToPrint === suites.length) return resolveAll();
        pump();
      });
    }
    while (cursor < suites.length && suites[cursor].started) cursor++;
    if (!started && active === 0 && nextToPrint < suites.length) {
      // Nothing running and nothing startable would be a scheduler bug, not a test
      // failure — say so rather than hanging forever on an empty event loop.
      console.error("scheduler stalled: no suite is runnable and none is in flight");
      process.exit(1);
    }
  }
  pump();
});

const failed = results.filter((r) => !r.passed);
const totalMs = Date.now() - t0;

console.log(`\n${hr()}`);
console.log(`  ${results.length - failed.length}/${results.length} green · ${(totalMs / 1000).toFixed(1)}s total`);
if (failed.length) {
  console.log(`  \x1b[31mFAILED:\x1b[0m ${failed.map((f) => f.label).join(", ")}`);
}
console.log(`${hr()}\n`);

process.exit(failed.length ? 1 : 0);
