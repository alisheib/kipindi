/**
 * `npm run test:red-engine-floor` — THE ONE EXEMPTION IN `red:house-bot-engine`, PROVED BOTH WAYS.
 *
 *   npx tsx scripts/red-engine-floor.test.mts
 *
 * ⛔ IT READS. IT NEVER MUTATES, never spawns a child, never touches a database — safe inside `test:all` for the
 * same reason `red-anchors.test.mts` is.
 *
 * ── WHAT IT IS FOR ────────────────────────────────────────────────────────────────────────────────────────────
 * `red:house-bot-engine` excuses exactly ONE kind of FAIL line: the two-store runner's POPULATION FLOOR, and only
 * under a `--only`/sections filter, which by construction runs a fraction of the suite. Everything else is red.
 *
 * ⛔ THE FAILURE THIS FILE EXISTS TO PREVENT. The pattern that recognises that line was written against
 * `… exit 0 · 153 passed · 0 failed`. `house-bot-two-stores.mts` later started printing
 * `… exit 0 · 153 passed (at least 751) · 0 failed`. Nothing connected the two, so the pattern silently matched
 * NOTHING, the harness read its own benign baseline as RED, and refused to inject a single mutation for five days
 * — 7 declarations UNMEASURED, with no error message that named the cause.
 *
 * ⭐ SO THE LINE IS NOT RETYPED HERE. §1 rebuilds it FROM `house-bot-two-stores.mts`'s own source — its label, its
 * detail template and the way `ok()` joins them — and §2/§3 run the real predicate against what came out. The next
 * reword fails this test in under a second instead of disarming a harness in silence.
 *
 * §1 · the floor line is DERIVED from the runner, and the historical pattern is shown not to match it (control).
 * §2 · POSITIVE — a genuine population-floor line from a filtered run is excused.
 * §3 · NEGATIVE — every other line, including a REAL assertion failure, is NOT excused.
 * §4 · the harness still routes through this one predicate, and holds no second copy of it.
 * §5 · ALL THREE house-bot red harnesses arm the ONE restore guard, and can still be told to stop.
 */
import { readFileSync } from "node:fs";
import { benignFloor, floorShapeDrifted, FLOOR } from "./lib/red-two-store-floor.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (p: string) => readFileSync(`${ROOT}/${p}`, "utf8").replace(/\r\n/g, "\n");

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}${detail ? ` — ${detail}` : ""}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  return cond;
};

// ── §1 · THE LINE, DERIVED FROM THE RUNNER ITSELF ────────────────────────────────────────────────────────────
const RUNNER = "scripts/lib/house-bot-two-stores.mts";
const runnerSrc = read(RUNNER);

/** How `ok()` composes what it prints. Quoted from the runner and ASSERTED to still be there, never assumed. */
const OK_COMPOSITION = 'console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`)';
ok(`1.1 · CONTROL · ${RUNNER}'s \`ok()\` still prints "<PASS|FAIL> <label> — <detail>"`,
   runnerSrc.includes(OK_COMPOSITION), OK_COMPOSITION);

/** Every `ok("0.mem …"/"0.pg …", <condition>, `<detail template>`)` in the runner. */
const pairs = [...runnerSrc.matchAll(/ok\("(0\.(?:mem|pg) · [^"]*)",[^`]*`([^`]*)`\)/g)]
  .map((m) => ({ label: m[1], tpl: m[2] }));
ok("1.2 · CONTROL · both floor assertions were found in the runner (0 would make everything below vacuous)",
   pairs.length === 2 && pairs.some((p) => p.label.startsWith("0.mem")) && pairs.some((p) => p.label.startsWith("0.pg")),
   pairs.map((p) => p.label.slice(0, 8)).join(", ") || "NONE FOUND");

/** Fill a detail template's `${…}` holes in order: exit, passed, the floor, failed. */
const render = (tpl: string, exit: number, passed: number, floor: number, failed: number) => {
  const v = [String(exit), String(passed), String(floor), String(failed)];
  let i = 0;
  return tpl.replace(/\$\{[^}]*\}/g, () => v[i++] ?? "?");
};
const holes = (tpl: string) => (tpl.match(/\$\{[^}]*\}/g) ?? []).length;
ok("1.3 · CONTROL · each detail template has exactly the four holes this test fills",
   pairs.every((p) => holes(p.tpl) === 4), pairs.map((p) => `${p.label.slice(0, 5)}:${holes(p.tpl)}`).join(" "));

/** The exact line the suite prints when the floor, and only the floor, is short. */
const floorLine = (p: { label: string; tpl: string }, exit = 0, passed = 153, floor = 751, failed = 0) =>
  `FAIL ${p.label} — ${render(p.tpl, exit, passed, floor, failed)}`;
const MEM = pairs.find((p) => p.label.startsWith("0.mem"))!;
const PG = pairs.find((p) => p.label.startsWith("0.pg"))!;
console.log(`     derived: ${floorLine(MEM)}`);
console.log(`     derived: ${floorLine(PG)}`);

ok("1.4 · the derived line carries the `(at least N)` clause the old pattern was blind to",
   floorLine(MEM).includes("(at least 751)") && floorLine(PG).includes("(at least 751)"));

/** ⛔ The pattern as it stood before this repair, quoted as history. It must NOT match what the runner prints today. */
const HISTORICAL = /^\s*FAIL 0\.(?:mem|pg) · the (?:memory|Postgres) run exits 0 with assertions and no failure — exit (\d+) · (\d+) passed · (\d+) failed/;
ok("1.5 · ⭐ CONTROL · the PRE-REPAIR pattern does NOT match today's line — the drift this test exists to catch is real",
   !HISTORICAL.test(floorLine(MEM)) && !HISTORICAL.test(floorLine(PG)));
ok("1.6 · …and the repaired pattern DOES match it", FLOOR.test(floorLine(MEM)) && FLOOR.test(floorLine(PG)));
ok("1.7 · a line the pattern can no longer read is NAMED as drift, and today's line is not",
   floorShapeDrifted("FAIL 0.mem · the memory run exits 0 with assertions and no failure — exit 0 · 153 passed · 0 failed")
   && !floorShapeDrifted(floorLine(MEM)) && !floorShapeDrifted("FAIL 18.L6b · a double sweep writes ONE counter — 2 rows"));

// ── §2 · POSITIVE · a genuine population-floor line from a FILTERED run is excused ───────────────────────────
ok("2.1 · ⭐ POSITIVE · the memory floor line of a filtered run is excused", benignFloor(true, floorLine(MEM)), floorLine(MEM));
ok("2.2 · ⭐ POSITIVE · the Postgres floor line of a filtered run is excused", benignFloor(true, floorLine(PG)), floorLine(PG));
ok("2.3 · POSITIVE · leading whitespace does not stop it being recognised", benignFloor(true, `   ${floorLine(PG)}`));
ok("2.4 · POSITIVE · a trailing carriage return does not stop it being recognised", benignFloor(true, `${floorLine(PG)}\r`));
ok("2.5 · POSITIVE · a one-assertion child still short of the floor is excused", benignFloor(true, floorLine(MEM, 0, 1, 751, 0)));

// ── §3 · NEGATIVE · everything else stays RED ────────────────────────────────────────────────────────────────
const NEGATIVES: [string, boolean, string][] = [
  ["3.1 · ⭐ a REAL assertion failure is NOT excused", true,
   "FAIL 18.L6b · ⭐ L6 · a double sweep at failover writes ONE counter for the stake, never two — 2 rows"],
  ["3.2 · ⭐ a REAL assertion failure that mentions the floor's own words is NOT excused", true,
   "FAIL 11.30 · ⭐ L3 · a started engine holding the planner's lease runs the sweep on its own timer — exit 0 · 3 passed (at least 1) · 1 failed"],
  ["3.3 · ⛔ the SAME floor line in an UNFILTERED run is NOT excused — a whole run must meet its floor", false, floorLine(MEM)],
  ["3.4 · a child that exited non-zero is NOT excused", true, floorLine(MEM, 1, 153, 751, 0)],
  ["3.5 · a child with a failing assertion is NOT excused", true, floorLine(MEM, 0, 153, 751, 3)],
  ["3.6 · a child that asserted NOTHING is NOT excused", true, floorLine(MEM, 0, 0, 751, 0)],
  ["3.7 · ⭐ a line claiming MORE passes than its own floor is NOT excused — the floor is not what failed", true,
   floorLine(MEM, 0, 900, 751, 0)],
  ["3.8 · a line claiming exactly the floor is NOT excused — that limb passed", true, floorLine(MEM, 0, 751, 751, 0)],
  ["3.9 · the migrate assertion beside it is NOT excused", true,
   "FAIL 0.pg.migrate · prisma migrate deploy applies every migration to the scratch database — could not connect"],
  ["3.10 · the harness's own NOT MEASURED line is NOT excused", true,
   "FAIL 0.pg · NOT MEASURED — the Postgres half never ran"],
  ["3.11 · a floor line quoted INSIDE another line is NOT excused", true,
   `  ↳ saw: ${floorLine(MEM)}`],
  ["3.12 · the PRE-REPAIR shape is NOT excused either — the pattern names today's subject, not a guess", true,
   "FAIL 0.mem · the memory run exits 0 with assertions and no failure — exit 0 · 153 passed · 0 failed"],
  ["3.13 · a PASS line is not the predicate's business", true, floorLine(MEM).replace(/^FAIL/, "PASS")],
];
for (const [name, filtered, line] of NEGATIVES) ok(name, !benignFloor(filtered, line), line.trim().slice(0, 120));

// ── §4 · THE HARNESS ROUTES THROUGH THIS PREDICATE, AND HOLDS NO SECOND COPY ─────────────────────────────────
const HARNESS = "scripts/red-house-bot-engine.mjs";
const harnessSrc = read(HARNESS);
ok(`4.1 · ${HARNESS} imports the predicate from the one module that defines it`,
   /import \{[^}]*benignFloor[^}]*\} from "\.\/lib\/red-two-store-floor\.mjs";/.test(harnessSrc));
ok("4.2 · ⛔ …and defines no FLOOR pattern of its own — a second copy is how the first one rotted",
   !/const\s+FLOOR\s*=/.test(harnessSrc) && !/const\s+benignFloor\s*=/.test(harnessSrc));
ok("4.3 · the exemption is still gated on a filter being on, at the call site",
   /benignFloor\(Boolean\(d\.sections\), l\)/.test(harnessSrc));

// ── §5 · EVERY RED HARNESS THAT MUTATES THIS REPOSITORY ARMS THE ONE RESTORE GUARD ───────────────────
/**
 * ⛔ THE FAILURE THIS SECTION EXISTS TO PREVENT. These three harnesses write a REAL defect into a REAL source file.
 * Until 2026-09-21 two of them released their lock on a signal and exited WITHOUT restoring, so a stopped drive left
 * the defect on disk for the next `git add -A` in any lane to ship — the payout-gate incident with one fewer step.
 *
 * ⛔ AND THE SIGNAL HANDLER WAS NEVER THE THING THAT SAVED IT. MEASURED 2026-09-21: Node cannot run a JS signal
 * callback while the main thread is blocked in `execSync`, and a red drive never returns to the event loop between
 * one child and the next, so the handler never ran at all. A real Ctrl-C mid-drive killed ONE suite child and the
 * harness went on to inject TEN more defects. What makes a stop real is `isConsoleStop` reading the child's own
 * STATUS_CONTROL_C_EXIT, and `haltIfStopped` between one mutation's restore and the next injection.
 *
 * ⭐ So this section pins the SHAPE, not a number: each harness imports the shared guard, arms it, reports a console
 * stop from its child, halts on it, and holds NO private copy of either idiom. A second copy is how the first rots.
 */
const RED_HARNESSES = ["scripts/red-house-bot-engine.mjs", "scripts/red-house-bot-console.mjs", "scripts/red-house-bot-money.mjs"];
for (const h of RED_HARNESSES) {
  const src = read(h);
  const name = h.replace("scripts/red-house-bot-", "").replace(".mjs", "");
  ok(`5.1 · ${name} imports the one restore guard`,
     /import \{[^}]*armRestoreGuard[^}]*\} from "\.\/lib\/red-restore-guard\.mjs";/.test(src));
  ok(`5.2 · ${name} ARMS it, from the same in-memory original and lock the run uses`,
     /armRestoreGuard\(\{ original, write, releaseLock, label: "[^"]+" \}\);/.test(src));
  /**
   * ⛔ NAME-BASED, NOT CALL-BASED, AND THAT IS THE WHOLE POINT. Written first as `process.on("SIG…"` this
   * assertion MISSED its own subject when mutation-tested: the idiom that actually leaked was
   * `for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, …)`, where the signal never appears as a literal
   * argument. A guard that cannot see the shape it exists to forbid is decoration. So: a signal NAME may not
   * appear in a harness at all — handling them belongs to the one module.
   */
  ok(`5.3 · ⛔ ${name} names no signal and keeps no private restore — a second copy is how the first one rotted`,
     !/SIGINT|SIGTERM|SIGBREAK|SIGHUP/.test(src) && !/COULD NOT RESTORE/.test(src),
     "restore and signal handling belong to scripts/lib/red-restore-guard.mjs alone");
  ok(`5.4 · ${name} reports a console stop from the child that carries it`,
     /if \(isConsoleStop\(e\)\) requestStop\(/.test(src),
     "a blocked main thread cannot be told any other way");
  ok(`5.5 · ⛔ ${name} HALTS after the restore and before the next injection`,
     /\} finally \{\n    write\(d\.file, src\);\n  \}\n(?:\s*\/\/[^\n]*\n)?\s*haltIfStopped\(/.test(src),
     "otherwise a stopped drive plants the next defect anyway");
}
const guardSrc = read("scripts/lib/red-restore-guard.mjs");
ok("5.6 · the guard restores BEFORE the lock is dropped, by prepending its exit pass",
   /process\.prependListener\("exit"/.test(guardSrc),
   "a plain process.on would run after the harness's own releaseLock");
ok("5.7 · the console-stop status is the measured number, not console text",
   /export const CONSOLE_STOP_STATUS = 3221225786;/.test(guardSrc),
   "text would turn on the machine's language; 0xC000013A does not");

console.log(`\nred-engine-floor: ${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length ? 1 : 0);
