/**
 * RED DRIVE for Commit 5's CONVERTED MUTATION REGISTERS — `red:house-bot-c5`
 * (C5-8 · DEFERRED-TESTS §1 rows 93 and 96 · the instrument row 96 says was missing).
 *
 *   npm run red:house-bot-c5
 *   npm run red:house-bot-c5 -- --only c5-5b:M1,c5-s4:S4-M33
 *   npm run red:house-bot-c5 -- --slice 0:12            (primaries [0,12) — serialise a long run in batches)
 *   npm run red:house-bot-c5 -- --log path/to/run.jsonl (append one JSON line per declaration)
 *
 * ⛔ WHY THIS EXISTS AT ALL. `scripts/anchors/house-bot-c5.anchors.mjs` converted 262 write-only register entries
 * into 70 declared anchors, and DECLARING bought exactly two things: `test:red-anchors` §3 re-resolves every `from`
 * against the tree daily, and `test:house-bot-reports` 0.505/0.505b audit every `suite` key and every `expect`.
 * ⭐ NEITHER INSTRUMENT APPLIES THE `to`. Both answer about the `from` and the `expect`, so a declaration whose
 * replacement is truncated, or whose second half was never converted, passes both while proving nothing — which is
 * precisely what happened to `5b-M4` and `S4-M73` and was found only by applying them for real. This file applies
 * the `to`, and it is the only thing in the repository that does.
 *
 * ⛔ AN ANCHOR THAT RESOLVES IS NOT AN ASSERTION THAT WENT RED. A mutation that reddens *something* is reported
 * WRONG-ASSERTION, not CAUGHT, and that is a failure: a defect caught by a neighbouring assertion is evidence about
 * the neighbour, never about the assertion the register named.
 * ⭐ AND THAT BRANCH WAS PROVED TO FIRE, BY MUTATION, 2026-09-21 — reading the code is not evidence that it reports.
 * `c5-5b:M1`'s `expect` was temporarily aimed at a REAL label of the same suite that this mutation cannot redden
 * (`0.505 · ⛔ RULING 505 · …`). The run printed `WRONG-ASSERTION … red, but NOT on "0.505 · …"`, named the line that
 * DID go red (`0.191.0`), summarised `0 caught, 1 wrong-assertion`, and exited non-zero; the file was then restored
 * and `git status --porcelain` was EMPTY. ⭐ A FIRST control tried an `expect` matching no label at all and never
 * reached this branch: `0.505b` reported it stale, the suite was RED at baseline, and the run REFUSED TO START —
 * which is the defence in depth working, and the reason the baseline gate below is not merely hygiene.
 *
 * ⛔ THIS HARNESS MUTATES THE REPOSITORY. Two concurrent red runs once left a live payout gate DISABLED while the
 * harness reported clean, so this follows `red-house-bot-console.mjs` exactly: a lock file against a concurrent run,
 * a refusal to start when any target differs from git HEAD, temp-file + rename writes with a read-back check, a GREEN
 * baseline per suite before any mutation, the shared anchor resolver (which insists an anchor is unique), restoration
 * inside a `finally`, and a byte-identical check at the end. A dirty file at exit is a non-zero exit, never a warning.
 *
 * ⛔ ANCHORS ARE DECLARED, NOT INLINE, so `test:red-anchors` §3 audits every one of them and §4's ratchet is not
 * raised by adding this command — the command names `house-bot-c5`, a declaration file of that name exists, so it
 * counts as declaring. That was measured before and after, not assumed.
 *
 * ⚠️ IT IS SLOW, AND THE NUMBER IS MEASURED RATHER THAN GUESSED: the `reports-mem` child costs ~37s a run and
 * there are 67 of them, so a full sweep is ~45 minutes. `red:all`'s per-harness timeout defaults to 300s, so in a
 * fleet run this harness reads TIME unless it is given room — ⛔ which is a premise to state, not to hide:
 *     npm run red:all -- --timeout 4000          (the whole fleet, this harness included)
 *     npm run red:house-bot-c5 -- --slice 0:12   (or drive it in batches, which is how it was first proved)
 * ⛔ It is NOT excused from `red:all` by a skip list. A runner that hides a guard it cannot afford to run is the
 * disease `red-all.mjs`'s own header exists to cure.
 *
 * ⭐ `combineInto` — an entry that names another is not a mutation of its own; it is applied WITH the one it names.
 * `S4-M73` is written "(a) the call AND (b) the helper": applied alone, (a) calls an undefined helper, names no
 * requester token, and the suite stays GREEN. The pair is the defect.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync, appendFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { MUTATIONS as DECLARED } from "./anchors/house-bot-c5.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

/**
 * 🔴 A DEFECT THAT DOES NOT PARSE IS NOT THE REGISTER'S DEFECT — and it still prints CAUGHT.
 *
 * The prose registers delimit `from` and `to` with BACKTICKS, so a replacement containing a template literal
 * (`${reason}.`) closes the delimiter early and an extractor taking "up to the next backtick" writes down a
 * replacement that ends mid-expression. Four declarations reached this harness that way. Each RESOLVED, each
 * injected, and each produced a file `esbuild` could not parse: six suite sections printed `threw — Transform
 * failed` instead of asserting, the named assertion went red anyway because its scan is textual, and the run
 * said CAUGHT. What had actually been proved was that a syntax error reddens things.
 * ⛔ So every injected file is PARSED BEFORE IT IS WRITTEN, and a mutation whose file will not parse is
 * BROKEN-INJECTION — a failure, never a catch. This is the `to` half of what `test:red-anchors` §3 does for
 * the `from`, and nothing else in the repository asks it.
 * ⚠️ ONLY A SCRIPT HAS A GRAMMAR TO BREAK (2026-09-26, house-bots step 8). The first declarations into a MARKDOWN
 * register (`docs/HOUSE-BOTS.md` and `docs/COMPLIANCE-DECISIONS.md`, whose accepted risks 8–12 the disclosure suite
 * holds verbatim) would have reached esbuild as TypeScript and been classed BROKEN-INJECTION every time, proving
 * nothing either way. So a file that is not a script is not parsed: prose has no syntax to break, and the shared
 * resolver has already refused a `from` that does not match exactly once. Every file a declaration named before that
 * day is a script and is still parsed, exactly as before.
 */
const esbuild = createRequire(import.meta.url)("esbuild");
const SCRIPT_FILE = /\.(?:[cm]?[jt]sx?)$/;
const parses = (file, code) => {
  if (!SCRIPT_FILE.test(file)) return null;
  try { esbuild.transformSync(code, { loader: file.endsWith("x") ? "tsx" : "ts", sourcefile: file }); return null; }
  catch (e) { return `${file}: ${String(e.errors?.[0]?.text ?? e.message).slice(0, 160)}`; }
};

const argOf = (flag) => process.argv.find((a, i) => process.argv[i - 1] === flag);
const ONLY = (argOf("--only") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const SLICE = argOf("--slice");
const LOG = argOf("--log");

/** ⭐ Partners are applied with their primary and are never driven alone (see the header). */
const PRIMARY_ALL = DECLARED.filter((m) => !m.combineInto);
const partsOf = (m) => [m, ...DECLARED.filter((x) => x.combineInto === m.name)];
for (const p of DECLARED.filter((x) => x.combineInto)) {
  if (!DECLARED.some((m) => m.name === p.combineInto)) {
    console.error(`REFUSING TO RUN — ${p.name} combines into "${p.combineInto}", which matches no declaration; the pairing is dead.`);
    process.exit(1);
  }
}

let PRIMARY = ONLY.length ? PRIMARY_ALL.filter((d) => ONLY.some((o) => d.name.startsWith(o))) : PRIMARY_ALL;
if (SLICE) {
  const [a, b] = SLICE.split(":").map((n) => Number(n));
  PRIMARY = PRIMARY.slice(a, b);
}
if (PRIMARY.length === 0) {
  console.error("REFUSING TO RUN — the filter selected no declaration.");
  process.exit(1);
}

/**
 * ⚠️ THE MEMORY CHILD IS RUN DIRECTLY, as `red-house-bot-console.mjs` does and for the same reason: every mutation
 * here is a SOURCE or pure-logic defect measured by a disk walk, and a Postgres round trip per mutation would add
 * hours measuring nothing these assertions ask about. The PostgreSQL half of the same cases is run by
 * `test:house-bot-reports` at the commit close.
 */
const MEM_ENV = { DATABASE_URL: "", USE_PRISMA_DAL: "false", HB_MONEY_STORE: "memory" };
const SUITES = {
  "reports-mem": { cmd: "npx tsx scripts/lib/house-bot-reports-cases.mts", env: MEM_ENV },
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
const run = (suite) => {
  const s = SUITES[suite];
  if (!s) throw new Error(`unknown suite ${suite}`);
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

const LOCK = "scripts/.red-house-bot-c5.lock";
if (existsSync(LOCK)) {
  console.error(`REFUSING TO RUN — ${LOCK} exists, so another red drive is in flight. If none is, delete it.`);
  process.exit(1);
}
const files = [...new Set(PRIMARY.flatMap((m) => partsOf(m).map((e) => e.file)))];
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
for (const key of [...new Set(PRIMARY.map((d) => d.suite))]) {
  const base = run(key);
  if (base.red) {
    console.error(`REFUSING TO RUN — "${key}" is RED before any mutation:\n${base.fails.slice(0, 10).join("\n") || base.output.split("\n").slice(-6).join("\n")}`);
    process.exit(1);
  }
  console.log(`baseline green · ${key}`);
}

let caught = 0, missed = 0, wrong = 0, stale = 0, brokenInj = 0;
for (const [i, d] of PRIMARY.entries()) {
  const edits = partsOf(d);
  const touched = [...new Set(edits.map((e) => e.file))];
  const mutated = new Map(touched.map((f) => [f, original.get(f)]));
  let broke = "";
  for (const e of edits) {
    try { mutated.set(e.file, injectDefect(mutated.get(e.file), e.from, e.to)); }
    catch (err) { broke = `${e.name === d.name ? "" : `${e.name}: `}${err.message}`; break; }
  }
  const tag = `${String(i + 1).padStart(2)}/${PRIMARY.length}`;
  if (broke) {
    stale++;
    console.log(`${tag} STALE ${d.name}\n        ↳ ${broke}; the harness is measuring nothing`);
    if (LOG) appendFileSync(LOG, `${JSON.stringify({ name: d.name, verdict: "STALE", reason: broke })}\n`);
    continue;
  }
  // ⛔ See `parses` above: a mutation whose file will not parse never reaches the suite.
  const unparseable = [...mutated].map(([f, code]) => parses(f, code)).find(Boolean);
  if (unparseable) {
    brokenInj++;
    console.log(`${tag} BROKEN-INJECTION ${d.name}\n        ↳ the injected file does not parse — ${unparseable}`);
    if (LOG) appendFileSync(LOG, `${JSON.stringify({ name: d.name, verdict: "BROKEN-INJECTION", reason: unparseable })}\n`);
    continue;
  }

  let result;
  try {
    for (const f of touched) write(f, mutated.get(f));
    result = run(d.suite);
  } finally {
    for (const f of touched) write(f, original.get(f));
  }
  const own = result.fails.find((l) => l.includes(d.expect));
  let verdict;
  if (result.red && own) { caught++; verdict = "CAUGHT"; console.log(`${tag} CAUGHT ${d.name}\n        ↳ ${own.trim().slice(0, 200)}`); }
  else if (result.red) {
    wrong++; verdict = "WRONG-ASSERTION";
    console.log(`${tag} WRONG-ASSERTION ${d.name} — red, but NOT on "${d.expect.slice(0, 60)}…"\n        ↳ ${(result.fails[0] ?? (result.crashed ? `crashed: ${result.output.split("\n").slice(-3).join(" | ")}` : "")).trim().slice(0, 400)}`);
  } else { missed++; verdict = "MISSED"; console.log(`${tag} MISSED ${d.name} — ${d.suite} stayed GREEN with this defect injected`); }
  if (LOG) appendFileSync(LOG, `${JSON.stringify({
    name: d.name, verdict, suite: d.suite, expect: d.expect.slice(0, 40),
    paired: edits.length - 1, crashed: result.crashed,
    fails: result.fails.map((l) => l.trim().slice(0, 300)),
  })}\n`);
}

let dirty = 0;
for (const [p, before] of shaBefore) {
  if (sha(p) !== before) { dirty++; console.log(`DIRTY ${p} — NOT restored byte-identically`); }
  try { unlinkSync(`${p}.red-tmp`); } catch { /* already gone */ }
}
/* ⛔ BROKEN-INJECTION IS A FAILURE, AS THE HEADER SAYS — and until 2026-09-26 the exit code did not say so: it was
   counted, printed per declaration and then left out of this line and of the exit, so a run whose only defect was an
   unparseable injection exited 0 over a summary that never mentioned it. */
console.log(`\nhouse-bot-c5 RED: ${caught} caught, ${wrong} wrong-assertion, ${missed} missed, ${stale} stale, ${brokenInj} broken-injection, ${dirty} files left dirty`);
if (wrong + missed + stale + brokenInj > 0 || dirty > 0) process.exit(1);
