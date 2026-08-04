/**
 * Up & Down — THE MARGIN LADDER (finding E-32).
 *
 *   npx tsx scripts/updown-margin-schedule.test.mts     (npm run test:margin-schedule)
 *
 * ── WHAT THIS EXISTS TO STOP ─────────────────────────────────────────────────
 * Before 2026-08-02 the winning margin was ONE number — `defaultMarginBps: 50` = 0.5% —
 * for every duration and every asset class. That is not a tuning nit; it is a silent
 * kill switch on the whole game. 0.5% of BTC is a **±$316 move inside five minutes**, so a
 * chain on the default fills its history with `no-move` VOIDs *while the price feed works
 * perfectly* — which is indistinguishable from findings E-16 and E-25, the two outages that
 * made all 1,402 of the platform's first rounds void. Safe, silent, and it looks exactly
 * like the bug that was just fixed.
 *
 * ── WHY THE CENTRAL CASE IS FIVE REAL PRODUCTION ROUNDS ──────────────────────
 * On 2026-08-02 the platform settled its first five non-VOID rounds ever, on a live BTC/USD
 * chain, against real confirmed provider prices (campaign §6q). Their open/close prices are
 * the sample below — not invented numbers, not a fixture. Replaying them through the REAL
 * `computeTargets` is the only assertion here that could have caught E-32 before it was
 * found, and it is the one that fails loudest if the ladder is ever widened back:
 *
 *     at 0.50% (the old default)  →  0 of 5 resolve.   The game does not exist.
 *     at the ladder's 5-min rung  →  4 of 5 resolve.
 *
 * ⚠️ PROVEN RED BEFORE THE FIX (§0.1b). With `marginBpsForChain` returning the flat
 * default, cases 3, 4 and 6 fail and the replay reports 0/5 — the campaign rule is that an
 * assertion which has never failed is not evidence.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import {
  getUpDownConfig, setUpDownConfig, __resetUpDownConfig,
  marginBpsForChain, resolveScheduledMarginBps, computeTargets,
  ALLOWED_DURATIONS, DEFAULT_UPDOWN_CONFIG,
} from "../src/lib/server/updown-config.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

const OFFICER = "usr_officer_test";
__resetUpDownConfig();

// ── 1 · the ladder resolves to the TIGHTEST matching rung ────────────────────
//
// ⛔ AGAINST AN EXPLICIT FIXTURE, NOT THE SHIPPED CONFIG (changed 2026-08-04). The shipped
// schedule is now EMPTY — the tick floor is the rule — but the ladder MACHINERY is still live
// code, because an operator can still configure a schedule per category and duration. Testing
// resolution logic against whatever happens to be shipped conflates two questions: *"does the
// resolver work"* and *"what did we decide to ship"*. §4 and §6 answer the second; this
// answers the first, and keeps answering it whatever the shipped default becomes.
const LADDER_FIXTURE = {
  marginSchedule: [
    { category: "*", maxDurationMinutes: 5, bps: 2 },
    { category: "*", maxDurationMinutes: 15, bps: 3 },
    { category: "*", maxDurationMinutes: 30, bps: 5 },
    { category: "*", maxDurationMinutes: 60, bps: 7 },
    { category: "*", maxDurationMinutes: 240, bps: 14 },
    { category: "*", maxDurationMinutes: 1440, bps: 30 },
  ],
  defaultMarginBps: 50,
} as never as Awaited<ReturnType<typeof getUpDownConfig>>;

{
  const cfg = LADDER_FIXTURE;
  ok("1.1 · a 5-minute round takes the 5-minute rung, not a longer one",
     resolveScheduledMarginBps(cfg, "crypto", 5) === 2, `got ${resolveScheduledMarginBps(cfg, "crypto", 5)}`);
  ok("1.2 · a 15-minute round takes the 15-minute rung",
     resolveScheduledMarginBps(cfg, "crypto", 15) === 3, `got ${resolveScheduledMarginBps(cfg, "crypto", 15)}`);
  ok("1.3 · a 30-minute round takes the 30-minute rung",
     resolveScheduledMarginBps(cfg, "macro", 30) === 5, `got ${resolveScheduledMarginBps(cfg, "macro", 30)}`);
  ok("1.4 · a duration BETWEEN rungs rounds UP to the next rung, never down",
     resolveScheduledMarginBps(cfg, "crypto", 20) === 5, `got ${resolveScheduledMarginBps(cfg, "crypto", 20)}`);
  ok("1.5 · a duration past the top rung returns null, so the caller falls back explicitly",
     resolveScheduledMarginBps(cfg, "crypto", 5_000) === null);
}

// ── 2 · an exact category beats the "*" ladder ───────────────────────────────
// The axis Ali asked for. It is unpopulated today because the two live classes measured the
// same, but EUR/USD (median 5-min move 0.012%, a THIRD of gold's) is already measured as
// needing its own rung — so the mechanism must work before a forex asset arrives.
{
  const set = await setUpDownConfig({
    marginSchedule: [
      { category: "*", maxDurationMinutes: 5, bps: 2 },
      { category: "forex", maxDurationMinutes: 5, bps: 1 },
    ],
  }, OFFICER);
  ok("2.1 · the schedule is accepted", set.ok);
  const cfg = await getUpDownConfig();
  ok("2.2 · a forex 5-minute round takes the forex rung, not the wildcard",
     resolveScheduledMarginBps(cfg, "forex", 5) === 1, `got ${resolveScheduledMarginBps(cfg, "forex", 5)}`);
  ok("2.3 · every other class still takes the wildcard",
     resolveScheduledMarginBps(cfg, "crypto", 5) === 2);
  __resetUpDownConfig();
}

// ── 3 · resolution order: chain override → ladder → flat default ─────────────
// Against the explicit fixture too — this is the RESOLVER's contract, not the shipped value.
{
  const cfg = LADDER_FIXTURE;
  const chain = (durationMinutes: number, marginBps: number | null) =>
    ({ durationMinutes, marginBps }) as never;
  ok("3.1 · a chain's own override wins over the ladder",
     marginBpsForChain(chain(5, 25), cfg, { category: "crypto" }) === 25);
  ok("3.2 · an override of 0 is honoured, not treated as absent",
     marginBpsForChain(chain(5, 0), cfg, { category: "crypto" }) === 0);
  ok("3.3 · no override → the ladder, NOT the flat default",
     marginBpsForChain(chain(5, null), cfg, { category: "crypto" }) === 2,
     `got ${marginBpsForChain(chain(5, null), cfg, { category: "crypto" })}`);
  ok("3.4 · past the top rung → the flat default",
     marginBpsForChain(chain(100_000, null), cfg, { category: "crypto" }) === cfg.defaultMarginBps);
}

// ── 4 · NO DURATION THE PLATFORM CAN EMIT CARRIES A PERCENTAGE BAND ──────────
//
// ⛔ THE RATCHET, INVERTED 2026-08-04. It used to require every allowed duration to be priced
// BY THE LADDER — correct while the ladder was the rule. Ali's decision replaced the ladder
// with the TICK FLOOR, so the ratchet now points the other way: every duration must resolve
// to 0 bps, i.e. to the floor, and a surviving rung is what would silently re-widen a band.
//
// ⚠️ The direction changed; the purpose did not. Both versions exist to stop one duration
// being quietly priced differently from the rest, which is how E-32 hid.
{
  const cfg = await getUpDownConfig();
  for (const d of ALLOWED_DURATIONS) {
    for (const category of ["crypto", "macro"]) {
      const bps = marginBpsForChain({ durationMinutes: d, marginBps: null } as never, cfg, { category });
      ok(`4 · ${category} ${d}m runs at the TICK FLOOR (0 bps), with no rung re-pricing it`,
         bps === 0 && resolveScheduledMarginBps(cfg, category, d) === null, `got ${bps}`);
    }
  }
}

// ── 5 · THE FIVE REAL PRODUCTION ROUNDS (campaign §6q) ───────────────────────
// Real confirmed provider prices from the first five rounds the platform ever settled.
// BTC/USD, decimals 2, minMoveTicks 1 — the live asset row.
// ⛔ 2 ticks, the floor since 2026-08-04 — at 1 the band equals the price's own rounding error.
const BTC = { decimals: 2, minMoveTicks: 2 };
const REAL_ROUNDS = [
  { n: 1, open: 63268.00, close: 63162.01, outcome: "DOWN" },
  { n: 2, open: 63162.01, close: 63132.00, outcome: "DOWN" },
  { n: 3, open: 63132.00, close: 63187.99, outcome: "UP" },
  { n: 4, open: 63187.99, close: 63206.87, outcome: "UP" },
  { n: 5, open: 63206.87, close: 63205.88, outcome: "DOWN" },
];
const settle = (open: number, close: number, bps: number) => {
  const { upTarget, downTarget } = computeTargets(open, bps, BTC);
  return close >= upTarget ? "UP" : close <= downTarget ? "DOWN" : "VOID";
};
//
// ⭐ THE SAME FIVE ROUNDS, NOW REPLAYED ACROSS ALL THREE SETTINGS THE PRODUCT HAS HAD. This is
// the clearest statement of Ali's 2026-08-04 decision that exists anywhere, and it is made
// entirely out of real money that really moved:
//
//     0.50% (the original flat default) →  0 of 5 resolve   ← E-32 itself
//     0.02% (the E-32 ladder)           →  4 of 5 resolve
//     the TICK FLOOR                    →  5 of 5 resolve   ← what ships now
{
  const cfg = await getUpDownConfig();
  ok("5.0 · ⭐ no rung prices a 5-minute crypto round any more — the ladder is retired",
     resolveScheduledMarginBps(cfg, "crypto", 5) === null,
     String(resolveScheduledMarginBps(cfg, "crypto", 5)));

  const atOld = REAL_ROUNDS.filter((r) => settle(r.open, r.close, 50) !== "VOID").length;
  ok("5.1 · at the OLD 0.50% default, 0 of the 5 real rounds resolve — this is E-32 itself",
     atOld === 0, `${atOld}/5 resolved`);

  // The retired ladder, kept as the middle of the story rather than as a live rule.
  const atLadder = REAL_ROUNDS.filter((r) => settle(r.open, r.close, 2) !== "VOID");
  ok("5.2 · at the RETIRED ladder's 2 bps, 4 of the 5 resolve — better, and still a refund in five",
     atLadder.length === 4, `${atLadder.length}/5 resolved`);

  // ⭐ THE DECISION, IN REAL MONEY. Round #5 moved 0.002% — $0.99 on a $63,206 price — which a
  // 0.02% band swallowed and a $0.02 band does not. That one round is the difference between
  // a player being paid and being handed their stake back with no fee earned (E-65).
  const atFloor = REAL_ROUNDS.filter((r) => settle(r.open, r.close, 0) !== "VOID");
  ok("5.2b · ⭐ at the TICK FLOOR, 5 of 5 resolve — including the one that moved only $0.99",
     atFloor.length === 5, `${atFloor.length}/5 resolved`);

  // And they resolve the RIGHT WAY. A margin that resolved them all as UP would pass a
  // count-only assertion while paying the wrong side — the direction is the money.
  for (const r of REAL_ROUNDS) {
    const got = settle(r.open, r.close, 0);
    ok(`5.3 · round #${r.n} (${r.open} → ${r.close}) settles ${r.outcome} at the tick floor`,
       got === r.outcome, `got ${got}`);
  }
}

// ── 6 · the flat default is now only ever a long-window fallback ─────────────
{
  // ⛔ AN EMPTY SCHEDULE IS A DECISION, NOT AN OMISSION — and the distinction is the point.
  // `resolveScheduledMarginBps` returns null for every duration, so every chain falls through
  // to `defaultMarginBps`, which is 0, which `computeTargets` floors at one tick. A single
  // leftover rung would silently re-widen exactly one duration's band while every other
  // surface still said "tick floor" — E-32's shape, arriving by omission rather than by edit.
  ok("6.1 · ⭐ the shipped ladder is EMPTY — the tick floor is the rule, with nothing overriding it",
     Array.isArray(DEFAULT_UPDOWN_CONFIG.marginSchedule) && DEFAULT_UPDOWN_CONFIG.marginSchedule.length === 0,
     `${DEFAULT_UPDOWN_CONFIG.marginSchedule?.length ?? 0} rungs`);
  const covered = ALLOWED_DURATIONS.filter(
    (d) => resolveScheduledMarginBps(DEFAULT_UPDOWN_CONFIG, "crypto", d) !== null);
  ok("6.2 · ⭐ and NO ALLOWED_DURATION is captured by a rung", covered.length === 0, `captured: ${covered.join(", ")}`);
  ok("6.3 · the flat default they all fall through to is the tick floor",
     DEFAULT_UPDOWN_CONFIG.defaultMarginBps === 0, String(DEFAULT_UPDOWN_CONFIG.defaultMarginBps));
}

// ── 7 · a malformed ladder is refused, because it decides what winning IS ────
{
  ok("7.1 · a non-integer margin is refused",
     !(await setUpDownConfig({ marginSchedule: [{ category: "*", maxDurationMinutes: 5, bps: 2.5 }] } as never, OFFICER)).ok);
  ok("7.2 · a margin above 2000 bps is refused",
     !(await setUpDownConfig({ marginSchedule: [{ category: "*", maxDurationMinutes: 5, bps: 2001 }] }, OFFICER)).ok);
  ok("7.3 · a zero-minute window is refused",
     !(await setUpDownConfig({ marginSchedule: [{ category: "*", maxDurationMinutes: 0, bps: 2 }] }, OFFICER)).ok);
  ok("7.4 · an empty category is refused",
     !(await setUpDownConfig({ marginSchedule: [{ category: "", maxDurationMinutes: 5, bps: 2 }] }, OFFICER)).ok);
  ok("7.5 · an EMPTY ladder is allowed — an operator must be able to revert to one flat number",
     (await setUpDownConfig({ marginSchedule: [] }, OFFICER)).ok);
  __resetUpDownConfig();
}

console.log(`\n${fail === 0 ? "✅" : "❌"} margin schedule (E-32): ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
