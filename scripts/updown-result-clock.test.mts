/**
 * E-99 · THE RESULT CLOCK — the third timer, and the rule that decides what it shows.
 *
 *   npm run test:updown-result-clock
 *
 * ⛔ EVERY CHECK HERE MUST FAIL IF THE FEATURE IS DELETED. `resultClock` returning a constant
 * `{awaiting:false,targetMs:null,counting:false}` — i.e. the behaviour before this shipped —
 * must break §2, §3 and §5. That is the bar §0 sets, and it is the bar four of session 27's
 * own checks failed to clear.
 */
import { resultClock, roundPhase } from "../src/lib/updown-card-phase.ts";

let pass = 0; const fails: string[] = [];
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

const CLOSE = Date.parse("2026-08-05T15:38:00.000Z");
const LAG = 92;                                   // BTC's measured median, seconds
const EXPECTED = CLOSE + LAG * 1000;

console.log("\n── 1 · before the close there is no result clock at all ──");
{
  const c = resultClock({ state: "open", closesAtMs: CLOSE, expectedResultAtMs: EXPECTED, nowMs: CLOSE - 60_000 });
  ok("1.1 an OPEN round is not awaiting a result", c.awaiting === false);
  ok("1.2 …and offers no result target, so the betting clock keeps the digits",
    c.targetMs === null, `targetMs=${c.targetMs}`);
  const locked = resultClock({ state: "locked", closesAtMs: CLOSE, expectedResultAtMs: EXPECTED, nowMs: CLOSE - 20_000 });
  ok("1.3 the RESULT PHASE (locked, pre-close) still counts to the CLOSE, not to the result",
    locked.awaiting === false && locked.targetMs === null);
}

console.log("\n── 2 · after the close it counts to the MEASURED instant ──");
{
  const c = resultClock({ state: "confirming", closesAtMs: CLOSE, expectedResultAtMs: EXPECTED, nowMs: CLOSE + 10_000 });
  ok("2.1 ⭐ past the close the round IS awaiting a result", c.awaiting === true);
  ok("2.2 ⭐ and the target is boundary + the asset's own median, to the millisecond",
    c.targetMs === EXPECTED, `got ${c.targetMs} want ${EXPECTED}`);
  ok("2.3 ⭐ the digits tick", c.counting === true);
  // ⛔ THE ANTI-CONSTANT CHECK. A different asset's median must move the target — otherwise
  // someone could hardcode 90s and every check above would still pass.
  const slower = resultClock({ state: "confirming", closesAtMs: CLOSE, expectedResultAtMs: CLOSE + 151_000, nowMs: CLOSE + 10_000 });
  ok("2.4 ⛔ the target FOLLOWS the measurement — a slower asset counts longer",
    slower.targetMs === CLOSE + 151_000 && slower.targetMs !== c.targetMs,
    `slow=${slower.targetMs} fast=${c.targetMs}`);
}

console.log("\n── 3 · the overrun is normal and must NOT render as 0:00 ──");
{
  // p90 is 116s against a ~92s median, so roughly one round in ten passes its own estimate.
  const c = resultClock({ state: "confirming", closesAtMs: CLOSE, expectedResultAtMs: EXPECTED, nowMs: EXPECTED + 30_000 });
  ok("3.1 still awaiting — an overrun is not a settlement", c.awaiting === true);
  ok("3.2 ⭐ but it has STOPPED counting, so the card shows `—:—` and never a dead 0:00",
    c.counting === false);
  ok("3.3 …and it still reports the target, so the caption can stay 'Result in'",
    c.targetMs === EXPECTED);
}

console.log("\n── 4 · an UNMEASURED asset gets no clock, not a plausible one (A-5) ──");
{
  const c = resultClock({ state: "confirming", closesAtMs: CLOSE, expectedResultAtMs: null, nowMs: CLOSE + 5_000 });
  ok("4.1 it is awaiting a result", c.awaiting === true);
  ok("4.2 ⛔ with NO target — we never invent a median we have not measured",
    c.targetMs === null);
  ok("4.3 ⛔ and it does not count", c.counting === false);
}

console.log("\n── 5 · a settled round never shows a result clock ──");
for (const state of ["resolved", "void"] as const) {
  const c = resultClock({ state, closesAtMs: CLOSE, expectedResultAtMs: EXPECTED, nowMs: CLOSE + 10_000 });
  ok(`5.1 ${state}: not awaiting`, c.awaiting === false);
  ok(`5.2 ${state}: no target, so the pod reads its settled state`, c.targetMs === null);
}

console.log("\n── 6 · the result clock cannot re-open betting (the money check) ──");
{
  // ⛔ THE ONE WAY THIS FEATURE COULD COST MONEY. The card retargets its countdown past the
  // close, so `running` becomes true again — and if `bettable` were derived from "the clock is
  // running" the UP/DOWN controls would light up on a round `buyPosition` has already shut.
  const now = CLOSE + 10_000;
  const phase = roundPhase({ state: "confirming", selectionClosesAtMs: CLOSE - 60_000, closesAtMs: CLOSE, nowMs: now });
  const clock = resultClock({ state: "confirming", closesAtMs: CLOSE, expectedResultAtMs: EXPECTED, nowMs: now });
  ok("6.1 ⭐ the clock is running while the round is NOT bettable",
    clock.counting === true && phase.bettable === false,
    `counting=${clock.counting} bettable=${phase.bettable}`);
  ok("6.2 …and it is not 'locked' either — locked means the result PHASE, before the close",
    phase.locked === false);
}

console.log(`\n${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length ? 1 : 0);
