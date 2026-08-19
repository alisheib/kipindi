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
  // ── §7 · A BOUNDARY THAT OUTLIVED ITS OWN ROUND (FAILURE-INVENTORY §7.4) ──────────────────
  //
  // 🔴 MUTATION 9 IS THE CODE THAT RAN ON PRODUCTION from at least 2026-08-15 to 2026-08-18,
  // with BTC 3m and ETH 3m firing every 30 seconds and producing nothing. The two after it are
  // the ways this fix is most likely to be spelled WRONG, and mutation 11 is the important one:
  // it is the fix a reasonable person writes first, it makes §7.1 green, and it leaves the
  // 3-minute chain that actually stalled still broken.
  {
    // 🔴 THE DEFECT ITSELF. Without this test `openRound` derives a past close, `createMarket`
    // THROWS, the throw escapes before step 4's re-arm, and `fireChain`'s `finally` re-arms on
    // the same instant — for ever.
    name: "span-check-deleted — a boundary past its own close is handed to createMarket (the live defect)",
    file: SERVICE,
    from: `    if (spanCloseMs <= now) {`,
    to: `    if (false) {`,
  },
  {
    // 🔴 THE PRODUCTION SHAPE EXACTLY: the abandon reached only when the reading is NOT
    // confirmed. A boundary hours old HAS a dated bar, so the gate is never entered and the
    // chain spins. This is the one-line difference between the old code and the new.
    name: "span-check-gated-on-confirmed — the abandon skips the case that has a price (the shape that stalled)",
    file: SERVICE,
    from: `    if (spanCloseMs <= now) {`,
    to: `    if (spanCloseMs <= now && obs.state !== "confirmed") {`,
  },
  {
    // ⚠️ THE PLAUSIBLE FIX, AND THE REASON §7.2 EXISTS. Judging a dead boundary by the ABANDON
    // DEADLINE instead of by the round's own SPAN is the obvious spelling — and it is wrong for
    // exactly the two lengths whose span is shorter than that deadline: 3 minutes (240s) and 5
    // minutes (360s), against 390s. Both stalled chains were 3-minute chains. §7.1 stays GREEN
    // under this mutation; §7.2b does not, which is the whole point of splitting them.
    name: "span-check-uses-abandon-deadline — right for 10m+, still broken for the 3m chain that stalled",
    file: SERVICE,
    from: `    if (spanCloseMs <= now) {`,
    to: `    if (now - Date.parse(boundaryIso) > abandonAfterSeconds(await getUpDownConfig()) * 1000) {`,
  },
  {
    // ⚠️ THE CRAWL, ONE BRANCH ALONG FROM MUTATION 3. Deriving the skip from the boundary
    // instead of the clock advances one span per tick: 28 hours on a 4-minute grid is 420
    // boundaries, every one firing instantly because it is still in the past. "The boundary
    // moved" is green on this; §7.3 is not.
    name: "span-skip-from-boundary-not-now — the recovered chain crawls 420 boundaries instead of catching up",
    file: SERVICE,
    from: `    if (spanCloseMs <= now) {
      const skipTo = new Date(boundaryAfter(anchorMs, chain.durationMinutes, now)).toISOString();`,
    to: `    if (spanCloseMs <= now) {
      const skipTo = new Date(boundaryAfter(anchorMs, chain.durationMinutes, Date.parse(boundaryIso))).toISOString();`,
  },
  {
    // ⛔ THE OVER-CORRECTION, AND THE WORSE DEFECT — the same shape as `gate-always-closed`
    // above. Abandon boundaries that have not reached their close yet and the game silently
    // stops opening rounds, which no assertion about a column moving can see. §7.4b is the
    // positive control that does.
    name: "span-check-too-eager — live boundaries are abandoned an hour before their close",
    file: SERVICE,
    from: `    if (spanCloseMs <= now) {`,
    to: `    if (spanCloseMs <= now + 3_600_000) {`,
  },
  {
    // ⚠️ DECLINING TO OPEN IS NOT ENOUGH — THE BOUNDARY HAS TO MOVE. Return without writing and
    // the chain stops throwing while still making the identical call every tick: the outage
    // survives, and the one line that made it visible in the logs is gone. Strictly worse than
    // the defect it replaces, and §7.1b is the only assertion that separates them.
    //
    // ⚠️ ANCHORED ON INDENTATION, and that is deliberate. The identical patch-and-return shape
    // appears in the price-deadline branch two levels deeper (8 spaces) and in the
    // closed-session branch one level shallower (4 spaces). Six spaces is this branch and only
    // this branch — and quoting the `detail` line instead would drag a backtick and a `${}`
    // into a template literal, which is how a harness ends up mutating its own prose.
    name: "span-check-returns-without-writing — the throw stops, the silent stall remains",
    file: SERVICE,
    from: `      await chainStore.patch(chain.id, { nextBoundaryAt: skipTo });\n      return {\n        observation: obs.state, closed, opened: false,`,
    to: `      return {\n        observation: obs.state, closed, opened: false,`,
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
