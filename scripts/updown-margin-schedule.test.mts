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
{
  const cfg = await getUpDownConfig();
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
{
  const cfg = await getUpDownConfig();
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

// ── 4 · NO DURATION THE PLATFORM CAN EMIT IS PRICED AT THE OLD DEFAULT ───────
// The ratchet. `ALLOWED_DURATIONS` is what an operator can actually pick, so every one of
// them must be priced by the ladder — a rung going missing is how E-32 comes back.
{
  const cfg = await getUpDownConfig();
  for (const d of ALLOWED_DURATIONS) {
    for (const category of ["crypto", "macro"]) {
      const bps = marginBpsForChain({ durationMinutes: d, marginBps: null } as never, cfg, { category });
      ok(`4 · ${category} ${d}m is priced by the ladder at ${bps} bps, not the flat ${cfg.defaultMarginBps}`,
         bps < 20 && bps === resolveScheduledMarginBps(cfg, category, d), `got ${bps}`);
    }
  }
}

// ── 5 · THE FIVE REAL PRODUCTION ROUNDS (campaign §6q) ───────────────────────
// Real confirmed provider prices from the first five rounds the platform ever settled.
// BTC/USD, decimals 2, minMoveTicks 1 — the live asset row.
const BTC = { decimals: 2, minMoveTicks: 1 };
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
{
  const cfg = await getUpDownConfig();
  const ladder = resolveScheduledMarginBps(cfg, "crypto", 5);
  // ⚠️ Asserted before it is USED. `computeTargets(open, null, …)` quietly yields a 0
  // margin (null/10000 === 0, floored at one tick), so a missing rung would make the
  // replay below report 5/5 resolved and read like a pass on a broken ladder.
  ok("5.0 · there IS a 5-minute crypto rung to replay against", ladder != null, `got ${ladder}`);
  if (ladder == null) { console.log("❌ no 5-minute rung — the replay cannot run"); process.exit(1); }

  const atOld = REAL_ROUNDS.filter((r) => settle(r.open, r.close, 50) !== "VOID").length;
  ok("5.1 · at the OLD 0.50% default, 0 of the 5 real rounds resolve — this is E-32 itself",
     atOld === 0, `${atOld}/5 resolved`);

  const atLadder = REAL_ROUNDS.filter((r) => settle(r.open, r.close, ladder) !== "VOID");
  ok(`5.2 · at the ladder's ${ladder} bps, 4 of the 5 real rounds resolve`,
     atLadder.length === 4, `${atLadder.length}/5 resolved`);

  // And they resolve the RIGHT WAY. A margin that resolved them all as UP would pass a
  // count-only assertion while paying the wrong side — the direction is the money.
  for (const r of REAL_ROUNDS) {
    const got = settle(r.open, r.close, ladder);
    const expected = r.n === 5 ? "VOID" : r.outcome; // #5 moved 0.002%, inside a 0.02% band
    ok(`5.3 · round #${r.n} (${r.open} → ${r.close}) settles ${expected} at ${ladder} bps`,
       got === expected, `got ${got}`);
  }
}

// ── 6 · the flat default is now only ever a long-window fallback ─────────────
{
  ok("6.1 · the shipped default config carries a ladder at all",
     Array.isArray(DEFAULT_UPDOWN_CONFIG.marginSchedule) && DEFAULT_UPDOWN_CONFIG.marginSchedule.length >= 3,
     `${DEFAULT_UPDOWN_CONFIG.marginSchedule?.length ?? 0} rungs`);
  // The ladder must COVER every allowed duration, or one of them silently falls through to
  // 0.50% — the exact defect, reintroduced by omission rather than by edit.
  const uncovered = ALLOWED_DURATIONS.filter(
    (d) => resolveScheduledMarginBps(DEFAULT_UPDOWN_CONFIG, "crypto", d) === null);
  ok("6.2 · every ALLOWED_DURATION is covered by a rung", uncovered.length === 0, `uncovered: ${uncovered.join(", ")}`);
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
