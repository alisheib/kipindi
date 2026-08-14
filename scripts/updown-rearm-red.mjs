/**
 * RED harness for `npm run test:updown-rearm`.
 *
 *   node scripts/updown-rearm-red.mjs
 *
 * ⛔ MUTATION 1 IS NOT A HYPOTHETICAL — it is the code that was running on production on
 * 2026-08-14, with all three gold chains `RUNNING` and dead for up to 3.8 days. The rest are
 * the ways the fix could be spelled WRONG, and three of them are over-corrections: a chain
 * that walks forward past LIVE boundaries is a worse defect than one that stalls, because a
 * stall is visible on the board and a skipped round is not.
 *
 * ⭐ Every mutation must turn the suite RED **and** the unmutated suite must be green in the
 * same session — otherwise "no defect" and "no feature" are indistinguishable. The green run
 * is the first thing this harness does.
 *
 * Rules obeyed: anchors re-expressed in the target file's line endings; the verdict is read
 * from the suite's OWN summary line; MISS unless the run exits non-zero AND names a failure.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SERVICE = new URL("../src/lib/server/updown-service.ts", import.meta.url);
const CALENDAR = new URL("../src/lib/server/market-calendar.ts", import.meta.url);

const MUTATIONS = [
  {
    // 🔴 THE PRODUCTION DEFECT ITSELF. Delete the re-arm and the gate returns with
    // `nextBoundaryAt` still pinned inside the closed session — the deadlock, restored.
    name: "rearm-deleted — the closed-session gate returns without moving the boundary (the live defect)",
    file: SERVICE,
    from: `    if (skipTo !== boundaryIso) await chainStore.patch(chain.id, { nextBoundaryAt: skipTo });`,
    to: `    // reverted: the gate returns without re-arming`,
  },
  {
    // ⚠️ THE ONE THAT LOOKS BUSY AND ACHIEVES NOTHING. Deriving the next boundary from an
    // instant just before the one we are holding lands back on the SAME boundary, the
    // equality guard correctly refuses the write — and the chain is pinned exactly as before.
    // This is what a patch that writes back the value it read actually does.
    name: "rearm-writes-back-what-it-read — the boundary is 'moved' to itself",
    file: SERVICE,
    from: `    const fromMs = Math.max(Date.parse(boundaryIso), now);`,
    to: `    const fromMs = Date.parse(boundaryIso) - 1;`,
  },
  {
    // ⚠️ THE CRAWL. Derived from the boundary instead of the clock, the chain advances ONE
    // span per tick — so a chain 3.8 days behind on a 15-minute grid needs ~365 ticks to
    // catch up, each firing instantly. "The boundary moved" is green on this; §1.2 is not.
    name: "rearm-from-boundary-not-now — the chain crawls one span per tick instead of catching up",
    file: SERVICE,
    from: `    const fromMs = Math.max(Date.parse(boundaryIso), now);`,
    to: `    const fromMs = Date.parse(boundaryIso);`,
  },
  {
    // ⚠️ THE REWIND — the obvious spelling of the fix, and wrong every weekend. A gold chain
    // holding a FUTURE shut boundary gets dragged back to one before it, and a rewound chain
    // can re-open a boundary it has already passed.
    name: "rearm-from-now-only — a chain holding a future shut boundary is dragged backwards",
    file: SERVICE,
    from: `    const fromMs = Math.max(Date.parse(boundaryIso), now);`,
    to: `    const fromMs = now;`,
  },
  {
    // ⛔ OVER-CORRECTION, AND THE WORSE DEFECT. Skip unconditionally and the game silently
    // drops rounds during trading hours. Every assertion about "the boundary moved" stays
    // green; the positive controls in §2 and §4 do not.
    name: "gate-always-closed — live boundaries are skipped instead of played",
    file: SERVICE,
    from: `  if (!openSession.open) {
    // ⛔ RE-ARM BEFORE RETURNING`,
    to: `  if (true) {
    // ⛔ RE-ARM BEFORE RETURNING`,
  },
  {
    // ⛔ OVER-CORRECTION, SECOND SHAPE. The abandon deadline is a different rule with a
    // different justification; collapsing it into "skip whenever we did not open" throws away
    // the retry that lets a bar publish, and every round would open a full boundary late.
    name: "abandon-deadline-disarmed — an open boundary is skipped before its price can publish",
    file: SERVICE,
    from: `      if (ageMs > abandonMs) {`,
    to: `      if (ageMs > -1) {`,
  },
  {
    // ⛔ THE GATE MUST BE EVALUATED AT THE ROUND'S OWN INSTANT, not at the clock. Reading it
    // at `now` would open a round ON a Saturday boundary merely because the tick happened to
    // land on a Wednesday — settling money on a price the market never made.
    name: "gate-read-at-now — the calendar is asked about the tick instead of about the round",
    file: SERVICE,
    from: `  const openSession = marketSessionAt(asset.category, boundaryIso, await deadHoursFor(asset.symbol));`,
    to: `  const openSession = marketSessionAt(asset.category, new Date(now).toISOString(), await deadHoursFor(asset.symbol));`,
  },
  {
    // ⚠️ THE CONTROL'S OWN CONTROL. §3 claims crypto never reaches this branch. If that were
    // untrue the section would be proving nothing, so break the claim and require §3 to say so.
    name: "crypto-loses-its-24-7-calendar — the immunity §3 asserts is removed",
    file: CALENDAR,
    from: `  return category === "crypto" ? "always" : "fx-metals";`,
    to: `  return "fx-metals";`,
  },
];

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const toFileEol = (text, contents) => (contents.includes("\r\n") ? text.replace(/\n/g, "\r\n") : text);

function runSuite() {
  let exitCode = 0, out = "";
  try {
    out = execSync("npx tsx scripts/updown-rearm.test.mts", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    exitCode = e.status ?? 1;
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  const m = /(?:ALL PASS|FAILURES) — (\d+) passed, (\d+) failed/.exec(out);
  return { exitCode, passed: Number(m?.[1] ?? 0), failed: Number(m?.[2] ?? 0), out };
}

// ⭐ THE POSITIVE CONTROL, IN THIS RUN, BEFORE ANY MUTATION. A harness that only ever sees
// red cannot tell a working guard from a broken suite.
const base = runSuite();
console.log(`positive control — unmutated suite: ${base.passed} passed, ${base.failed} failed`);
if (base.exitCode !== 0 || base.failed > 0) {
  console.log("⛔ the suite is not green before mutation — fix that first; every RED below would be meaningless.");
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
