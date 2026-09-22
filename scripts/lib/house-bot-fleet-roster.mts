/**
 * THE FLEET'S ROSTER — every bot, its rules, and THE STAKE IT MUST PLACE, derived by hand.
 *
 * ⛔ **THIS FILE IS THE ORACLE, AND IT DELIBERATELY IMPORTS NOTHING FROM `src/`.**
 *
 * There are three ways to check that a bot staked what its rules say, and two of them are worthless:
 *
 *  (a) **Call `decide.ts` and compare.** A tautology in the precise sense that matters — if `shapedAmount`
 *      has the wrong `pct` term then so does the oracle, and the case is green. It can only catch plumbing.
 *      It also drags the RNG in: `decideWithFlags` re-runs the whole decision from the SAME `randomInt`
 *      after loading each bot's flags, so a bot whose flags refuse it consumes fewer draws on the later run
 *      — replaying that means reverse-engineering a draw budget in order to check arithmetic.
 *  (b) **A general expected-stake function in the harness.** Better, but it is a second implementation: it
 *      drifts on the next rules change, and a shared misreading of the spec gives two agreeing wrong answers.
 *  (c) **Literals, derived by hand, from inputs this fixture chose.** ⭐ A literal cannot drift. It can only
 *      be WRONG, and a wrong literal is red on its first run, before any defect exists.
 *
 * Every expectation below is (c), written beside its arithmetic. The harness's only computation is `===`.
 *
 * ── HOW THE RANDOMNESS IS REMOVED, WITHOUT TOUCHING THE ENGINE ─────────────────────────────────────────
 * The engine keeps its real `crypto.randomInt`. Every draw is made irrelevant by CONFIGURATION instead:
 *   · `shaping.jitterPct = 0`   → `decide.ts` short-circuits and the RNG is **not called** for the amount
 *   · `counter.delayMinSec === delayMaxSec` → the draw happens and its value is forced
 *   · `counter.reactProbabilityPct = 100`   → the roll happens and cannot change the outcome
 *   · `fill.jitterSec = 0`      → not called
 *   · `opener.stakeMin === stakeMax`, `delayPollsMin === delayPollsMax` → forced
 * ⭐ That is the only safe way to handle the re-run trap above: you cannot out-model it, so you make
 * nothing depend on it. Two lanes put the randomness back deliberately, and say so in their own names.
 *
 * ── HOW THE LANES ARE ISOLATED ─────────────────────────────────────────────────────────────────────────
 * One lane = one `MarketCategory`, and each bot's `scope.categories` is exactly its own lane. That is the
 * PRODUCT's filter (`rulesCover`), not a test-only namespace: a bot in `crypto` is structurally incapable
 * of deciding about a `macro` market. Where a lane needs several bots on one category, the sub-namespace is
 * the disjoint `counter.triggerStakeMin/MaxTzs` band — also the product's own mechanism, also assertable.
 */

/** ⛔ Every figure the seeded world is built on, in one place, so a literal below can be checked against it. */
export const FLEET = {
  /** The platform stake bounds the fixture runs under (`world` does not change them). */
  boundsMin: 1_000,
  boundsMax: 1_000_000,
  holderBalance: 5_000_000,
  playerBalance: 1_000_000,
  /** `startHouseBot` REFUSES a start under 20 s, whatever `world.OPEN_CAPS` says. */
  minGapSec: 20,
} as const;

export type FleetBot = {
  /** Stable key in the run's output. */
  key: string;
  lane: string;
  category: string;
  /** What this desk is for, in the run report. */
  what: string;
  /** Disjoint trigger band, so one player stake selects exactly one bot on a shared category. */
  band: readonly [number, number];
  rules: {
    counter?: boolean; fill?: boolean; opener?: boolean;
    amount?: { kind: "PCT"; pct: number } | { kind: "FIXED"; fixedTzs: number };
    roundToTzs?: number;
    jitterPct?: number;
    delaySec?: number;
    reactPct?: number;
    thinSharePct?: number;
    leadPollsMin?: number;
    openerStakeTzs?: number;
    openerDelayMin?: number;
  };
  caps?: Record<string, number | null>;
};

/**
 * ⛔ CUTOFFS ARE NOT ARBITRARY. `scope.skipPollsClosingWithinMin` defaults to 60 and
 * `guards.noReactZonePollsMin` to 15, so a COUNTER poll closing in under 60 minutes answers `CUTOFF` and
 * a fixture that picked 30 would measure the guard instead of the arithmetic. 90 minutes clears both.
 * ⚠️ A FILL poll is the opposite: it is planned only within `leadPollsMin` of its cutoff, so it must close
 * SOON. Those two facts are why the two lanes use different markets and different closes.
 */
export const COUNTER_CUTOFF_MIN = 90;

export const ROSTER: readonly FleetBot[] = [
  /* ── Lane A · macro · the COUNTER arithmetic, and the two deliberate randomness cases ───────────── */
  {
    key: "A1-PCT", lane: "A", category: "macro", band: [35_000, 45_000],
    what: "COUNTER, 80% of the trigger, rounded to 500",
    rules: { counter: true, amount: { kind: "PCT", pct: 80 }, roundToTzs: 500, jitterPct: 0, delaySec: 25, reactPct: 100 },
  },
  {
    key: "A2-JITTER", lane: "A", category: "macro", band: [46_000, 55_000],
    what: "the same, with ±10% jitter put BACK — an interval assertion, weaker on purpose",
    rules: { counter: true, amount: { kind: "PCT", pct: 80 }, roundToTzs: 500, jitterPct: 10, delaySec: 25, reactPct: 100 },
  },
  {
    /**
     * ⛔ ITS OWN CATEGORY, AND THAT IS A MEASURED CORRECTION, not tidiness. `decide.ts` writes exactly ONE
     * visible SKIPPED row per trigger — the FIRST refusing bot's code, in `orderBots` order — not one per
     * bot. With three desks on `macro`, the row for A3's trigger named A1 with `TRIGGER_STAKE_RANGE`, and a
     * harness looking for A3's `NOT_REACTING` found nothing and called a correct product broken. A desk whose
     * whole subject is WHICH code gets written must be the only one deciding on its market.
     * ⭐ A1 and A2 still share `macro`, so the several-desks-on-one-category claim is still measured.
     */
    key: "A3-NEVER", lane: "A", category: "sports", band: [56_000, 65_000],
    what: "reactProbability 0 — deterministic in the other direction: every trigger must be NOT_REACTING",
    rules: { counter: true, amount: { kind: "PCT", pct: 80 }, roundToTzs: 500, jitterPct: 0, delaySec: 25, reactPct: 0 },
  },

  /* ── Lane B · crypto · the FIXED branch, and the stakeMax cut ───────────────────────────────────── */
  {
    key: "B1-FIXED", lane: "B", category: "crypto", band: [10_000, 99_999],
    what: "COUNTER at a FIXED 7,000 — the trigger size must not change it",
    rules: { counter: true, amount: { kind: "FIXED", fixedTzs: 7_000 }, roundToTzs: 1_000, jitterPct: 0, delaySec: 25, reactPct: 100 },
  },
  {
    key: "B2-CAPPED", lane: "B", category: "crypto", band: [100_000, 199_999],
    what: "80% of 150,000 = 120,000, cut to stakeMax 28,000 and floored to the bot's own 5,000 step = 25,000",
    rules: { counter: true, amount: { kind: "PCT", pct: 80 }, roundToTzs: 5_000, jitterPct: 0, delaySec: 25, reactPct: 100 },
    caps: { stakeMaxTzs: 28_000 },
  },

  /* ── Lane C · weather · the pool trap: nonHouse at DECIDE, lockedA15 at FIRE ────────────────────── */
  {
    key: "C1-POOLS", lane: "C", category: "weather", band: [90_000, 110_000],
    what: "the one case that excludes BOTH wrong pool fields, in BOTH directions",
    rules: { counter: true, amount: { kind: "PCT", pct: 80 }, roundToTzs: 500, jitterPct: 0, delaySec: 25, reactPct: 100 },
  },

];

/**
 * THE EXPECTED STAKES, EACH WITH ITS DERIVATION. ⛔ Read the arithmetic before changing a number: every one
 * of these is a hand calculation over inputs the fixture chose, and the whole value of the oracle is that
 * it was NOT produced by the code under test.
 *
 * `clampStake(s) = floorTo(min(s, stakeMaxTzs ?? 0, bounds.max), roundToTzs)`, ok iff `>= max(stakeMinTzs, bounds.min)`.
 * `floorTo(n, step) = floor(max(0,n) / step) * step`.
 */
export const EXPECT = {
  /**
   * A1 · trigger NO 40,000 on a market already holding a seeded NO 20,000 (both aged past the exit close).
   *   base   = floor(40,000 × 80 / 100)                      = 32,000
   *   jitter = off                                           → 32,000
   *   asked  = floorTo(32,000, 500)                          = 32,000
   *   cut    = NO.nonHouse 60,000 − YES.raw 0                = 60,000
   *   stake  = floorTo(min(32,000, 60,000, max 10,000,000, bounds 1,000,000), 500) = 32,000
   */
  "A1-PCT": { trigger: 40_000, seed: 20_000, decide: 32_000, fire: 32_000, asked: 32_000, side: "YES" },

  /**
   * A2 · trigger NO 50,000, jitter ±10%. base = 40,000; the stake must land inside
   *   [floorTo(floor(40,000 × 0.90), 500), floorTo(floor(40,000 × 1.10), 500)] = [36,000, 44,000]
   * ⚠️ An INTERVAL, and the run labels it as one. A point assertion here would be a lie about what jitter is.
   */
  "A2-JITTER": { trigger: 50_000, seed: 20_000, lo: 36_000, hi: 44_000, side: "YES" },

  /** A3 · trigger NO 60,000. No stake at all: every trigger must produce SKIPPED · NOT_REACTING. */
  "A3-NEVER": { trigger: 60_000, seed: 20_000, decide: null, side: "YES" },

  /**
   * B1 · trigger NO 40,000, seeded NO 5,000.
   *   base = 7,000 (FIXED — the trigger's 40,000 is irrelevant, which is the case)
   *   asked = floorTo(7,000, 1,000) = 7,000 ; cut = 45,000 ; stake = 7,000
   */
  "B1-FIXED": { trigger: 40_000, seed: 5_000, decide: 7_000, fire: 7_000, asked: 7_000, side: "YES" },

  /**
   * B2 · trigger NO 150,000, seeded NO 5,000, stakeMax 28,000, step 5,000.
   *   base = floor(150,000 × 0.8) = 120,000 ; asked = floorTo(120,000, 5,000) = 120,000
   *   cut  = 155,000 ; clampStake(min(120,000, 155,000)) = floorTo(min(120,000, 28,000, 1,000,000), 5,000) = 25,000
   * 🔴 THE SEED IS 5,000 AND NOT 10,000, AND THAT IS A MEASURED CORRECTION. At 10,000 it sat inside
   *   B1's band [10,000–99,999] on the SAME category, so B1 answered B2's market, `marketHeld` then refused
   *   B2 on its own market, and B2 decided nothing at all. A lane's seeds must fall outside EVERY band in
   *   the lane, not merely outside their own desk's.
   * ⭐ 25,000 and not 28,000 is the point: the final floor is to the BOT's step, not to the cap.
   */
  "B2-CAPPED": { trigger: 150_000, seed: 5_000, decide: 25_000, fire: 25_000, asked: 120_000, side: "YES" },

  /**
   * C1 · the pool trap. Market grace 1 minute, so a stake locks 60 s after it is placed.
   *   seeded NO 60,000 aged 70 s (locked) · trigger NO 100,000 (locks at t+60)
   *   later: YES 120,000 at t+20 · NO 40,000 at t+30
   *   DECIDE (at ≈t+5): asked = floorTo(floor(100,000 × 0.8), 500) = 80,000
   *                     cut   = NO.nonHouse 160,000 − YES.raw 0 = 160,000 → stake 80,000
   *                     ⛔ had decide used lockedA15 the cut would be 60,000 and the stake 60,000
   *   FIRE   (at ≈t+62, dueAt = max(t+25, exitClose t+60)):
   *                     against = NO.lockedA15 160,000 ; cut = 160,000 − YES.raw 120,000 = 40,000
   *                     capped  = floorTo(min(80,000, 40,000, …), 500) = 40,000
   *                     ⛔ had fire used nonHouse the cut would be 200,000 − 120,000 = 80,000
   * ⭐ One case, both wrong fields excluded, in both directions.
   */
  "C1-POOLS": { trigger: 100_000, seed: 60_000, lateYes: 120_000, lateNo: 40_000, decide: 80_000, fire: 40_000, asked: 80_000, side: "YES" },

} as const;
