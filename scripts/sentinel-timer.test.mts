/**
 * Sentinel timer logic tests — the deploy-proof boot decision (pure function).
 * Proves a Railway restart RESUMES the same next-sweep target instead of
 * resetting the countdown, that a missed target runs after the grace window,
 * and that a first-ever boot schedules one interval out. All epoch-ms (UTC), so
 * the logic is timezone/clock-change independent by construction.
 */
import { computeBootSchedule } from "../src/lib/server/market-sentinel.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

const NOW = 1_750_000_000_000; // fixed reference instant (epoch ms)
const INTERVAL = 4 * 60 * 60_000; // 4h
const GRACE = 90_000; // 90s

// ── first-ever boot (nothing persisted) ──────────────────────────────────────
{
  const d = computeBootSchedule(null, NOW, INTERVAL, GRACE);
  ok("first boot → kind 'first'", d.kind === "first");
  ok("first boot → one interval out", d.delayMs === INTERVAL, `delay=${d.delayMs}`);
  ok("first boot → no fixed target", d.targetAt === null);

  const d2 = computeBootSchedule({ nextSweepAt: null }, NOW, INTERVAL, GRACE);
  ok("persisted with null target → also 'first'", d2.kind === "first");
}

// ── resume a future target (the deploy-proof case) ───────────────────────────
{
  const target = NOW + 100_000; // 100s in the future
  const d = computeBootSchedule({ nextSweepAt: target }, NOW, INTERVAL, GRACE);
  ok("future target → kind 'resume'", d.kind === "resume");
  ok("resume keeps the SAME target", d.targetAt === target, `target=${d.targetAt}`);
  ok("resume delay = remaining time", d.delayMs === 100_000, `delay=${d.delayMs}`);
}

// ── deploy-proof: repeated boots toward the same target never reset it ────────
{
  const target = NOW + 3_000_000;
  // Simulate 3 restarts at increasing times before the target.
  const b1 = computeBootSchedule({ nextSweepAt: target }, NOW, INTERVAL, GRACE);
  const b2 = computeBootSchedule({ nextSweepAt: target }, NOW + 500_000, INTERVAL, GRACE);
  const b3 = computeBootSchedule({ nextSweepAt: target }, NOW + 2_000_000, INTERVAL, GRACE);
  ok("every restart resumes the identical target", b1.targetAt === target && b2.targetAt === target && b3.targetAt === target);
  ok("countdown shrinks across restarts (not reset)", b1.delayMs > b2.delayMs && b2.delayMs > b3.delayMs, `${b1.delayMs} > ${b2.delayMs} > ${b3.delayMs}`);
  ok("a push does NOT bump the target back to a full interval", b3.delayMs < INTERVAL);
}

// ── missed target while down → grace, not skipped ────────────────────────────
{
  const d = computeBootSchedule({ nextSweepAt: NOW - 5_000 }, NOW, INTERVAL, GRACE);
  ok("past target → kind 'grace'", d.kind === "grace", `kind=${d.kind}`);
  ok("grace runs soon (grace window)", d.delayMs === GRACE, `delay=${d.delayMs}`);
}

// ── boundary: target == now is treated as due (grace), not resume ────────────
{
  const d = computeBootSchedule({ nextSweepAt: NOW }, NOW, INTERVAL, GRACE);
  ok("target == now → grace (not resume)", d.kind === "grace", `kind=${d.kind}`);
}

console.log(`\nsentinel-timer: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
