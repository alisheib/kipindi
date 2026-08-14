/**
 * RED harness for `npm run test:updown-tick-cadence`.
 *
 *   node scripts/updown-tick-cadence-red.mjs
 *
 * ⛔ MUTATION 1 IS THE CODE THAT WAS RUNNING ON PRODUCTION on 2026-08-14, at 2,269
 * transactions a second on a platform with 75 users. The rest are the ways the fix could be
 * spelled wrong — and three of them are OVER-CORRECTIONS, because the failure mode of "space
 * the fires out" is spacing them out past the moment the price becomes readable, which
 * silently pushes every round's open into its own betting window. That defect would be
 * invisible in the logs the original one filled.
 *
 * ⭐ The unmutated suite is run FIRST and its result printed, so a broken suite cannot pass
 * itself off as a working guard.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SCHED = new URL("../src/lib/server/updown-scheduler.ts", import.meta.url);
const SERVICE = new URL("../src/lib/server/updown-service.ts", import.meta.url);

const MUTATIONS = [
  {
    // 🔴 THE PRODUCTION DEFECT. A past boundary re-arms at 0 ms and the loop turns as fast as
    // the database can answer.
    name: "floor-removed — a past boundary re-fires at 0ms (the live defect)",
    file: SCHED,
    from: `  let delay = raw > 0 ? raw : (o.graceOnPast ? BOOT_GRACE_MS : REFIRE_FLOOR_MS);`,
    to: `  let delay = raw > 0 ? raw : (o.graceOnPast ? BOOT_GRACE_MS : 0);`,
  },
  {
    // ⛔ OVER-CORRECTION. The boot grace exists so a restart does not hammer every chain at
    // once; collapsing it into the floor is a different outage with the same shape.
    name: "boot-grace-collapsed — a restart re-fires every missed boundary at the floor",
    file: SCHED,
    from: `  let delay = raw > 0 ? raw : (o.graceOnPast ? BOOT_GRACE_MS : REFIRE_FLOOR_MS);`,
    to: `  let delay = raw > 0 ? raw : REFIRE_FLOOR_MS;`,
  },
  {
    // ⚠️ A hint nobody reads. Everything about the hint stays green; only the real fire→re-arm
    // loop in §5 can see that the scheduler went back to asking at the bare floor.
    name: "hint-ignored-by-scheduler — advanceChain says when to return and fireChain drops it",
    file: SCHED,
    from: `      if (r.retryAfterMs != null) retryMs = Math.max(retryMs, r.retryAfterMs);`,
    to: `      // reverted: the hint is discarded`,
  },
  {
    // ⛔ OVER-CORRECTION, AND THE EXPENSIVE ONE. If the hint is a guess rather than the gate's
    // own remaining wait, every round opens up to a full rung late — 15s off a 3-minute
    // betting window, on every round, for as long as nobody measures it.
    name: "hint-is-a-guess — the retry is a constant instead of the gate's own remaining wait",
    file: SERVICE,
    from: `        retryAfterMs: readyAt - now,`,
    to: `        retryAfterMs: 60_000,`,
  },
  {
    // ⛔ OVER-CORRECTION. Sleeping past the abandon deadline leaves the round waiting to be
    // voided — a stake with no path out, which is E-24's exact shape.
    name: "hint-unbounded-by-deadline — the retry can sleep past the moment the round must be abandoned",
    file: SERVICE,
    from: `        retryAfterMs: Math.max(0, Math.min(ladderMs, toDeadlineMs)),`,
    to: `        retryAfterMs: Math.max(0, ladderMs),`,
  },
  {
    // ⚠️ A FAILED reading is terminal. Waiting a rung for it means ~26 pointless fires before
    // the deadline instead of one.
    name: "failed-waits-a-rung — a terminal reading is retried as if a rung could change it",
    file: SERVICE,
    from: `      const ladderMs = obs.state === "failed" ? Number.POSITIVE_INFINITY : (obs.retryAfterMs ?? 0);`,
    to: `      const ladderMs = obs.retryAfterMs ?? 0;`,
  },
  {
    // ⚠️ A hint on a branch that MOVED the boundary would override the timer's own, correct
    // delay — the mirror defect: too slow instead of too fast.
    name: "moved-branch-hints-anyway — a re-armed boundary carries a stale retry that overrides it",
    file: SERVICE,
    from: `          detail: \`no open price for \${boundaryIso} after \${Math.round(ageMs / 1000)}s — boundary abandoned, next \${skipTo}\`,`,
    to: `          detail: \`no open price for \${boundaryIso} after \${Math.round(ageMs / 1000)}s — boundary abandoned, next \${skipTo}\`,
          retryAfterMs: 60_000,`,
  },
  {
    // ⚠️ The operator's readout. Storing the boundary rather than the fire instant makes a
    // stalled chain report a "next fire" in the PAST — a console that says the scheduler has
    // stopped whether or not it has.
    name: "health-reports-the-boundary — the admin 'next fire' goes back to lying about stalled chains",
    file: SCHED,
    from: `  timers.set(id, { timeout, at: now + delay });`,
    to: `  timers.set(id, { timeout, at: nextMs });`,
  },
];

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const toFileEol = (text, contents) => (contents.includes("\r\n") ? text.replace(/\n/g, "\r\n") : text);

function runSuite() {
  let exitCode = 0, out = "";
  try {
    out = execSync("npx tsx scripts/updown-tick-cadence.test.mts", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    exitCode = e.status ?? 1;
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  const m = /(?:ALL PASS|FAILURES) — (\d+) passed, (\d+) failed/.exec(out);
  return { exitCode, passed: Number(m?.[1] ?? 0), failed: Number(m?.[2] ?? 0), out };
}

const base = runSuite();
console.log(`positive control — unmutated suite: ${base.passed} passed, ${base.failed} failed`);
if (base.exitCode !== 0 || base.failed > 0) {
  console.log("⛔ the suite is not green before mutation — every RED below would be meaningless.");
  process.exit(1);
}

let caught = 0;
const missed = [];
for (const m of MUTATIONS) {
  const original = readFileSync(m.file, "utf8");
  const from = toFileEol(m.from, original);
  const to = toFileEol(m.to, original);
  if (!original.includes(from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is broken, not the guard.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  writeFileSync(m.file, original.replace(from, to));
  try {
    if (readFileSync(m.file, "utf8") === original) throw new Error("mutation did not land on disk");
    const r = runSuite();
    if (r.exitCode !== 0 && r.failed > 0) {
      caught++;
      console.log(`  ✓ RED  ${m.name}\n         → ${r.failed} failed · ${(/FAIL (.+)/.exec(r.out)?.[1] ?? "").slice(0, 86)}`);
    } else {
      missed.push(m.name);
      console.log(`  ✗ MISS ${m.name}\n         → exit ${r.exitCode}, ${r.failed} failed — the guard did NOT catch this`);
    }
  } finally {
    writeFileSync(m.file, original);
  }
}

console.log(`\nRED HARNESS — ${caught}/${MUTATIONS.length} caught (positive control: ${base.passed} passed before mutation)`);
if (missed.length) { for (const m of missed) console.log(`  · ${m}`); process.exit(1); }
