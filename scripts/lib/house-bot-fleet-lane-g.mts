/**
 * LANE G · RULES CHANGED MID-FLIGHT — one lane module of the fleet drive (see `house-bot-fleet-drive.mts`,
 * "lane modules").
 *
 * ⛔ THIS FILE IMPORTS NOTHING FROM `src/`, for the reason the roster's header gives: its `expect` literals are
 * the ORACLE, derived by hand beside their arithmetic, and calling `decide.ts` to check `decide.ts` is a
 * tautology. `run` receives everything it touches through `env`.
 *
 * ── WHAT IT MEASURES ─────────────────────────────────────────────────────────────────────────────────────
 * An officer changes an account's rules while a COUNTER intent is PENDING — decided, not yet fired. Nothing
 * on the intent row carries a rules version (`prisma/schema.prisma`, `HouseBotIntent` has no such column), so
 * the ONLY thing that makes the change visible is fire re-reading the account (`fire.ts:118`
 * `readBotAndHolder` → `houseBotStore.get`, an uncached SELECT) and re-parsing its rules (`fire.ts:127`).
 * Six accounts, six markets, six changes, each with a definite outcome:
 *
 *   G1 · counter mode switched OFF        → SKIPPED · OUT_OF_SCOPE          (fire.ts:147 coversAtFire → rulesCover)
 *   G2 · stakeMax LOWERED under the stake → clamped DOWN and written back   (fire.ts:229, :236 clampStake, MON-02)
 *   G3 · stakeMax RAISED                  → the stake must NOT grow         (THREE shrink-only layers: fire.ts:229 intent.stakeTzs is a term of the Math.min ·
 *                                           fire.ts:236 writes back only a SMALLER figure and clampStake's SQL carries `"stakeTzs" > new`, dal:3939 ·
 *                                           fire.ts:257 places the ROW's figure, never `recomputed`)
 *   G4 · schedule moved out               → SKIPPED · OUTSIDE_SCHEDULE      (fire.ts:162, on the DATABASE clock, fire.ts:155)
 *   G5 · rules made unparseable           → AUTO_PAUSED · RULES_INVALID and the row CANCELLED · BOT_NOT_ACTIVE
 *                                           (planner.ts:399 rulesOutcomes is THE actor — asserted, attempts 0 — because the save lands ≥ 29 s
 *                                           before dueAt and the planner passes every 15 s; fire.ts:128-131 is the second arm, NOT MEASURED)
 *   G6 · scope.categories EMPTIED         → SKIPPED · OUT_OF_SCOPE          (the §0 live blocker, with its CONTROL)
 *   and a second phase on two of the desks that placed nothing:
 *   G4 · stakeMax lowered UNDER stakeMin  → SKIPPED · STAKE_BOUNDS_CHANGED  (fire.ts:230-231)
 *   G1 · rules from a FUTURE build        → NOT a pause, NOT a skip: requeued quietly (fire.ts:129), then placed once restored
 *
 * ── HOW EACH CHANGE IS MADE, HONESTLY ────────────────────────────────────────────────────────────────────
 * Every change goes through `houseBotStore.saveRules(botId, rulesVersion, patch)` — the DAL's CAS, which is the
 * very statement the officer's own save ends in (`rules-save.ts:263`). G1, G2, G3 and G6 are reachable through
 * `saveHouseBotRules` too (it owns the ten switches and the fourteen caps); G4 and G5 are NOT: the form never
 * posts a schedule (it carries the stored one through, `rules-save.ts:193-195`), and it REFUSES to touch an
 * account whose rules will not parse (`rules-save.ts:150`, RULES_UNREADABLE) and proves by round-trip that
 * what it writes DOES parse (`rules-save.ts:246-248`). So G5's state is reached the only way it can be: a
 * document `readStoredRulesV1` rejects (a non-boolean mode leaf, `rules.ts:2654`), written through the DAL.
 * The lane says so in the assertion's own name.
 *
 * ── WHAT WOULD MAKE IT VACUOUS, AND WHAT IS DONE ABOUT EACH ─────────────────────────────────────────────
 *   · The change lands AFTER the row fired → every outcome is one the change had nothing to do with. So every
 *     sub-case captures the row's id while it is PENDING, asserts `dueAt` is still ahead of the DATABASE clock
 *     at the save instant, re-reads the row right after the save and asserts it is STILL PENDING, and asserts
 *     the terminal row carries THE SAME id. A 40 s counter delay (`delayMin === delayMax`) leaves ≈ 30 s for
 *     that: decided at ≈ trigger + 5–10 s (SWEEP_MIN_AGE_MS 5 s, SWEEP_INTERVAL_MS 5 s), claimed at ≈ dueAt +
 *     2 s (CLAIM_SKEW_GUARD_MS).
 *   · The save was refused (CAS conflict) and nobody looked → the unchanged product is measured. So `ok` is
 *     asserted, `rulesVersion === base + 1` is asserted, and the NEW value is read back off the store before
 *     the poller claims.
 *   · G4's code, OUTSIDE_SCHEDULE, is ALSO what `decide.ts:360` writes when the schedule is closed at decision
 *     time. So the discriminator is the TRANSITION: the same id seen PENDING with `reasonCode` null, then SKIPPED.
 *   · G1/G6's "nothing placed" is what an account that was never in scope looks like too. So the SKIPPED row
 *     that carries the PENDING id is the witness, and every absence is AND-ed with it.
 *   · G2's "position equals the new cap" is what a bot that simply decided 20,000 looks like. So the PENDING
 *     stake captured BEFORE the save (88,000) and `decision.firedStakeTzs` — written only by `clampStake` (the
 *     Postgres one at dal:3933 on this drive; its in-memory twin at dal:2659) —
 *     are asserted, and `decision.askedStakeTzs` must still say 88,000 (the decision was not re-run).
 *   · G3 passes for free if the decided stake was not pinned by the OLD cap. So the old cap (50,000) is BELOW
 *     the asked amount (96,000): a fire that re-sized UPWARD would place the cut (125,000) or the asked amount
 *     (96,000) — both visibly not 50,000. ⚠️ Growth is refused at THREE layers and only all three defeated
 *     together are observable (measured: the Math.min term dropped + the write-back gate `<` → `!==` + the SQL
 *     `>` → `<>` placed 125,000, wallet −125,000, 6 red). The Math.min term dropped ALONE is NOT observable at
 *     any durable surface (measured: 99/99) — a larger `recomputed` is never written and the bet carries the
 *     row's 50,000. Stated here, not claimed by any assertion.
 *   · G2/G4-bounds silently substitute the WRONG ACTOR if stakeMax goes under the LIVE minimum (1,000):
 *     `planner.ts:414` revalidateLive pauses the account and cancels the row. So every cap stays ≥ 1,000 and
 *     the account is asserted STILL ACTIVE after the row is terminal.
 *   · A stale figure reaching H0 is a SECURITY event that switches everyone off (ruling 165). So the lane ends
 *     with the alert ledger: zero `security`, zero `switchedOff`, the master switch still ON — AND-ed with the
 *     number of terminal rows witnessed, so it cannot pass by silence.
 *   · Under `KP_FLEET_SILENT=1` nothing decides, so no row is ever PENDING: every assertion below is AND-ed
 *     with that witness and goes red; the changes are not even attempted (there is nothing to change under).
 *
 * ⛔ A SKIPPED row's `stakeTzs` is never compared — it is the ruling-120 placeholder (`decide.ts:267`), and
 * `stakeOracle` (copied from the lanes file, one definition per file by necessity) refuses it loudly.
 * ⛔ Seeds are 5,000 — outside every band of BOTH culture lanes (F: 300,000–350,000; G: 100,000–159,999).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
import type { FleetBot } from "./house-bot-fleet-roster.mts";

export const LANE = "G";

const CATEGORY = "culture";
/**
 * 40 s, `delayMin === delayMax` so the draw happens and its value is forced. `counter.delayMinSec` is bounded
 * 5–600 (`rules.ts:592`). The roster's 25 s would leave ≈ 15 s to observe PENDING, save and re-read — too
 * tight with six desks deciding in one sweep.
 */
const DELAY_SEC = 40;
const COUNTER = { counter: true, amount: { kind: "PCT", pct: 80 }, roundToTzs: 500, jitterPct: 0, delaySec: DELAY_SEC, reactPct: 100 } as const;

export const roster: readonly FleetBot[] = [
  /* ── Lane G · culture · six desks, disjoint trigger bands, one change each ─────────────────────── */
  {
    key: "G1-MODE-OFF", lane: "G", category: CATEGORY, band: [100_000, 109_999],
    what: "counter mode switched OFF while PENDING → SKIPPED · OUT_OF_SCOPE; phase 2: rules from a FUTURE build → requeued, then placed",
    rules: { ...COUNTER },
  },
  {
    key: "G2-MAX-DOWN", lane: "G", category: CATEGORY, band: [110_000, 119_999],
    what: "stakeMax lowered 10,000,000 → 20,000 under a PENDING 88,000 → clamped DOWN to 20,000 and written back (MON-02)",
    rules: { ...COUNTER },
  },
  {
    /**
     * ⛔ THE OLD CAP IS BELOW THE ASKED AMOUNT ON PURPOSE. Asked 96,000, cap 50,000 → the decision is PINNED at
     * 50,000. Raising the cap to 1,000,000 then changes what a GROWING fire would do (96,000 or 125,000) while
     * a correct one stays at 50,000. A cap above the asked amount would leave a re-sizing fire invisible.
     */
    key: "G3-MAX-UP", lane: "G", category: CATEGORY, band: [120_000, 129_999],
    what: "stakeMax RAISED 50,000 → 1,000,000 under a PENDING 50,000 → the stake must NOT grow",
    rules: { ...COUNTER },
    caps: { stakeMaxTzs: 50_000 },
  },
  {
    key: "G4-SCHEDULE", lane: "G", category: CATEGORY, band: [130_000, 139_999],
    what: "schedule moved to a window that excludes now → SKIPPED · OUTSIDE_SCHEDULE; phase 2: stakeMax lowered UNDER stakeMin → STAKE_BOUNDS_CHANGED",
    rules: { ...COUNTER },
  },
  {
    key: "G5-INVALID", lane: "G", category: CATEGORY, band: [140_000, 149_999],
    what: "rules made unparseable (a non-boolean mode leaf) → AUTO_PAUSED · RULES_INVALID, the row CANCELLED · BOT_NOT_ACTIVE",
    rules: { ...COUNTER },
  },
  {
    key: "G6-SCOPE-EMPTY", lane: "G", category: CATEGORY, band: [150_000, 159_999],
    what: "scope.categories emptied (the §0 live blocker) → SKIPPED · OUT_OF_SCOPE, with the populated-scope CONTROL",
    rules: { ...COUNTER },
  },
];

/**
 * THE EXPECTED FIGURES, EACH WITH ITS DERIVATION. Every market: `graceMin: 0` (a stake locks on placement), a
 * seeded NO 5,000 aged past its exit close, then the trigger NO. The bot's side is YES; YES.raw is 0 throughout.
 *
 *   decide: asked = floorTo(floor(trigger × 80 / 100), 500) · cut = NO.nonHouse (seed + trigger) − YES.raw 0
 *           stake = floorTo(min(asked, cut, stakeMaxTzs, bounds.max 1,000,000), 500), ok iff ≥ max(stakeMinTzs 1,000, bounds.min 1,000)
 *   fire:   against = NO.lockedA15 (seed + trigger: both locked at once under grace 0) − YES.raw 0
 *           capped  = floorTo(min(intent.stakeTzs, against, stakeMaxTzs, bounds.max), 500), SKIPPED · STAKE_BOUNDS_CHANGED iff < max(stakeMinTzs, bounds.min)
 *   `floorTo(n, step) = floor(max(0, n) / step) × step`.
 */
export const expect = {
  /**
   * G1 · trigger NO 100,000, seeded NO 5,000.
   *   asked  = floorTo(floor(100,000 × 80 / 100), 500) = floorTo(80,000, 500) = 80,000
   *   cut    = 105,000 − 0 = 105,000 ; decide = floorTo(min(80,000, 105,000, 10,000,000, 1,000,000), 500) = 80,000
   *   phase 1 · counter OFF at fire → SKIPPED · OUT_OF_SCOPE; nothing placed; wallet delta 0.
   *   phase 2 · a fresh market, same numbers, `schemaVersion: 99` at fire → requeued (transientAttempts ≥ 1), then
   *             restored → against = 105,000 ; capped = floorTo(min(80,000, 105,000, 10,000,000, 1,000,000), 500) = 80,000 → placed 80,000.
   */
  "G1-MODE-OFF": { trigger: 100_000, seed: 5_000, asked: 80_000, decide: 80_000, side: "YES", fireCode: "OUT_OF_SCOPE", future: { fire: 80_000 } },

  /**
   * G2 · trigger NO 110,000, seeded NO 5,000.
   *   asked  = floorTo(floor(110,000 × 0.8), 500) = 88,000 ; cut = 115,000 ; decide = 88,000
   *   stakeMax 10,000,000 → 20,000 while PENDING:
   *   capped = floorTo(min(88,000, 115,000, 20,000, 1,000,000), 500) = 20,000 ; min = max(1,000, 1,000) = 1,000 ; 20,000 ≥ 1,000
   *   → recomputed 20,000 < 88,000 → clampStake writes 20,000 and decision.firedStakeTzs 20,000 → placed 20,000 ; wallet −20,000.
   * ⭐ 20,000 ≠ 25,000 and ≠ 28,000, so it cannot be confused with lane B's cap literals.
   */
  "G2-MAX-DOWN": { trigger: 110_000, seed: 5_000, asked: 88_000, decide: 88_000, side: "YES", newStakeMax: 20_000, fire: 20_000 },

  /**
   * G3 · trigger NO 120,000, seeded NO 5,000, stakeMax 50,000 at the decision.
   *   asked  = floorTo(floor(120,000 × 0.8), 500) = 96,000 ; cut = 125,000
   *   decide = floorTo(min(96,000, 125,000, 50,000, 1,000,000), 500) = 50,000   ← pinned by the OLD cap
   *   stakeMax 50,000 → 1,000,000 while PENDING:
   *   capped = floorTo(min(50,000 [intent.stakeTzs], 125,000, 1,000,000, 1,000,000), 500) = 50,000 → not < 50,000, no clamp → placed 50,000.
   *   ⛔ a fire re-sized UPWARD would place min(125,000 [cut], 1,000,000, 1,000,000) = 125,000, or 96,000 from
   *      decision.askedStakeTzs. Both are visibly not 50,000 — but growth is refused at THREE layers (fire.ts:229 the
   *      Math.min term · fire.ts:236 `recomputed < intent.stakeTzs` + clampStake's `"stakeTzs" > new` SQL, dal:3939 ·
   *      fire.ts:257 places the ROW's figure), so the Math.min term dropped ALONE is unobservable at every durable
   *      surface (measured: 99/99) and only all three defeated together place 125,000 (measured: caught, wallet −125,000).
   */
  "G3-MAX-UP": { trigger: 120_000, seed: 5_000, asked: 96_000, oldStakeMax: 50_000, decide: 50_000, side: "YES", newStakeMax: 1_000_000, fire: 50_000, growWouldBe: { noIntentTerm: 125_000, fromAsked: 96_000 } },

  /**
   * G4 · trigger NO 130,000, seeded NO 5,000.
   *   asked  = floorTo(floor(130,000 × 0.8), 500) = 104,000 ; cut = 135,000 ; decide = 104,000
   *   phase 1 · schedule → one window ≥ 11 h away from the DB clock's now, on today's EAT weekday, allDay false
   *             → inSchedule false at fire → SKIPPED · OUTSIDE_SCHEDULE; nothing placed; wallet delta 0.
   *   phase 2 · fresh market; stakeMin raised to 30,000 BEFORE the trigger (decide: 104,000 ≥ 30,000, unchanged);
   *             stakeMax 10,000,000 → 20,000 while PENDING:
   *             capped = floorTo(min(104,000, 135,000, 20,000, 1,000,000), 500) = 20,000 ; min = max(30,000, 1,000) = 30,000
   *             20,000 < 30,000 → SKIPPED · STAKE_BOUNDS_CHANGED; nothing placed; wallet delta 0.
   *   ⛔ 20,000 ≥ the live minimum 1,000, so `planner.ts:414` (revalidateLive) stays silent and the account stays ACTIVE.
   */
  "G4-SCHEDULE": { trigger: 130_000, seed: 5_000, asked: 104_000, decide: 104_000, side: "YES", fireCode: "OUTSIDE_SCHEDULE", bounds: { stakeMin: 30_000, newStakeMax: 20_000, code: "STAKE_BOUNDS_CHANGED" } },

  /**
   * G5 · trigger NO 140,000, seeded NO 5,000.
   *   asked  = floorTo(floor(140,000 × 0.8), 500) = 112,000 ; cut = 145,000 ; decide = 112,000
   *   then `modes.polls.counter: "yes"` (a string) → parseHouseBotRules → readStoredRulesV1's bool() → RULES_INVALID, field modes.polls.counter
   *   → stopBot(AUTO_PAUSED, RULES_INVALID, field) → cancelLive({houseBotId}, BOT_NOT_ACTIVE) → CANCELLED · BOT_NOT_ACTIVE; ONE botStopped alert.
   */
  "G5-INVALID": { trigger: 140_000, seed: 5_000, asked: 112_000, decide: 112_000, side: "YES", terminal: "CANCELLED", code: "BOT_NOT_ACTIVE", pause: "RULES_INVALID", field: "modes.polls.counter" },

  /**
   * G6 · trigger NO 150,000, seeded NO 5,000.
   *   asked  = floorTo(floor(150,000 × 0.8), 500) = 120,000 ; cut = 155,000 ; decide = 120,000
   *   then scope.categories [] → rulesCover false → SKIPPED · OUT_OF_SCOPE; nothing placed; wallet delta 0.
   */
  "G6-SCOPE-EMPTY": { trigger: 150_000, seed: 5_000, asked: 120_000, decide: 120_000, side: "YES", fireCode: "OUT_OF_SCOPE" },
} as const;

/** Phase 1 has six terminal rows, phase 2 two more. The ledger case is AND-ed with this count. */
const TERMINALS_EXPECTED = 8;

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const EAT_OFFSET_MS = 3 * 3_600_000;
/**
 * The EAT weekday and minute-of-day of an instant, BY HAND (UTC+3; Tanzania has had no daylight saving since
 * 1931). Fixture arithmetic, not oracle arithmetic: it places G4's window and checks the premise that the
 * fire instant was really outside it. The expected value stays the literal string OUTSIDE_SCHEDULE.
 */
const eatOf = (ms: number): { day: string; nextDay: string; minute: number } => {
  const d = new Date(ms + EAT_OFFSET_MS);
  const i = (d.getUTCDay() + 6) % 7;
  return { day: WEEKDAYS[i], nextDay: WEEKDAYS[(i + 1) % 7], minute: d.getUTCHours() * 60 + d.getUTCMinutes() };
};

/** ⛔ Copied from the lanes file (its `helpers` is module-private) — the SAME definitions, on purpose. */
function helpers(env: Any): Any {
  const { ok, j, w, S } = env;
  /** The guard that keeps the ruling-120 placeholder out of every arithmetic comparison. */
  const stakeOracle = (row: Any, expected: number, what: string): void => {
    if (!row) { ok(what, false, "no row"); return; }
    if (!["PENDING", "CLAIMED", "PLACED"].includes(row.status)) {
      ok(what, false, `refused to compare: ${row.id} is ${row.status} — stakeTzs there is the ruling-120 placeholder, not an intended stake`);
      return;
    }
    ok(what, row.stakeTzs === expected, j({ got: row.stakeTzs, expected, status: row.status }));
  };
  /** `IntentFeedFilter` carries NO `marketId` — it filters by ACCOUNT. */
  const rowsOf = async (botId: string): Promise<Any[]> => {
    const page = await S.houseBotIntentStore.listFeed({ houseBotId: botId, limit: 50 });
    return (page?.rows ?? page ?? []) as Any[];
  };
  const housePositionsOn = async (marketId: string): Promise<Any[]> =>
    (await w.positionsOf(marketId)).filter((p: Any) => p.houseBotId != null);
  /** A guarded verdict does not guard its own eagerly-evaluated detail string: never `new Date(NaN)`. */
  const stamp = (t: unknown): string => (typeof t === "number" && Number.isFinite(t) ? new Date(t).toISOString() : "— absent —");
  return { stakeOracle, rowsOf, housePositionsOn, stamp };
}

export async function run(env: Any, prior: Any): Promise<Any> {
  void prior;
  const { ok, section, until, j, w, S, fleet, stake, EXPECT, COUNTER_CUTOFF_MIN, laneWanted, passes, calls, seen, RULES, CTX } = env;
  if (!laneWanted("G")) return null;
  const KEYS = ["G1-MODE-OFF", "G2-MAX-DOWN", "G3-MAX-UP", "G4-SCHEDULE", "G5-INVALID", "G6-SCOPE-EMPTY"];
  if (KEYS.some((k) => !fleet[k])) return null;
  const { stakeOracle, rowsOf, housePositionsOn, stamp } = helpers(env);

  const out: Any = { placed: [] };
  /** Every terminal row this lane WITNESSED — the ledger case's witness against silence. */
  let terminals = 0;

  const getBot = (botId: string): Promise<Any> => S.houseBotStore.get(botId);
  const dbNow = async (): Promise<number> => (await S.houseBotRuntimeStore.dbClock()).nowMs;
  const stoppedFor = (botId: string, cause?: string): number =>
    calls.filter((c: Any) => c.fn === "botStopped" && c.botId === botId && (cause === undefined || c.code === cause)).length;
  const plannerCount = (k: string): number => passes.planner.reduce((n: number, p: Any) => n + (p?.counts?.[k] ?? 0), 0);

  /** A market for one desk: the seed (aged, out of every band), the holder's balance BEFORE the trigger, the trigger. */
  const arm = async (key: string, title: string): Promise<Any> => {
    const bot = fleet[key];
    const exp = EXPECT[key];
    const market = await w.poll({ graceMin: 0, category: bot.category, closeInMs: COUNTER_CUTOFF_MIN * 60_000, title });
    await stake(market.id, "NO", exp.seed, 10_000);
    /* ⚠️ Read BEFORE the trigger — reading it after the intent appears is a race the poller can win. */
    const before = (await w.bal(bot.userId)).balance as number;
    const trig = await stake(market.id, "NO", exp.trigger, 0);
    return { key, bot, exp, market, before, trig, decided: null, change: null, fired: null };
  };

  /** The row that answers THE TRIGGER (by `triggerPositionId`), not the seed's visible TRIGGER_STAKE_RANGE row. */
  const waitDecision = (d: Any): Promise<Any> => until(`${d.key} · a decision on the trigger`, 60_000, async () => {
    const rows = await rowsOf(d.bot.botId);
    const hit = rows.find((r: Any) => r.triggerPositionId === d.trig.positionId);
    return hit ? await S.houseBotIntentStore.get(hit.id) : null;
  });
  const waitTerminal = (d: Any): Promise<Any> => until(`${d.key} · the row leaving PENDING/CLAIMED`, 120_000, async () => {
    const r = await S.houseBotIntentStore.get(d.decided.id);
    return r && r.status !== "PENDING" && r.status !== "CLAIMED" ? r : null;
  });

  /**
   * THE CHANGE, made the instant the row is seen PENDING, through the DAL CAS. It records everything the
   * mid-flight premise needs: the base version, the DB-clock instant of the save, the CAS answer, the account
   * re-read after it (the new value must be readable BEFORE the poller claims) and the ROW re-read after it
   * (it must still be PENDING, or the change was not mid-flight at all). Nothing is attempted when there is
   * no PENDING row — under the meta-mutation there is nothing to change under, and every case reads red.
   */
  const changeNow = async (d: Any, patchOf: (bot: Any, atMs: number) => Record<string, unknown>): Promise<Any> => {
    if (d.decided?.status !== "PENDING") return null;
    const cur = await getBot(d.bot.botId);
    const atMs = await dbNow();
    const patch = patchOf(cur, atMs);
    const res = await S.houseBotStore.saveRules(d.bot.botId, cur.rulesVersion, patch);
    const botAfter = await getBot(d.bot.botId);
    const rowAfter = await S.houseBotIntentStore.get(d.decided.id);
    return { base: cur.rulesVersion, docBefore: cur.rules, before: cur, patch, ok: res?.ok === true, res, atMs, botAfter, rowAfter };
  };

  /** The five assertions every sub-case shares: the decision, its size, and the MID-FLIGHT premise. */
  const premise = (d: Any, what: string): void => {
    const { key, exp, decided, change } = d;
    ok(`${key} · the engine decided: a PENDING COUNTER on the side opposite the trigger, reasonCode null`,
      decided?.kind === "COUNTER" && decided?.side === exp.side && decided?.status === "PENDING" && decided?.reasonCode == null,
      j({ kind: decided?.kind, side: decided?.side, status: decided?.status, code: decided?.reasonCode }));
    stakeOracle(decided, exp.decide, `${key} · …sized EXACTLY ${exp.decide} by the rules AS THEY STOOD at the decision`);
    ok(`${key} · …and the amount it recorded asking for is exactly ${exp.asked}`,
      decided?.decision?.askedStakeTzs === exp.asked, j({ asked: decided?.decision?.askedStakeTzs, expected: exp.asked }));
    ok(`${key} · MID-FLIGHT · ${what} landed through the DAL CAS while the row was STILL PENDING (re-read AFTER the save — the read that proves it landed in flight), its dueAt still ahead of the database clock read immediately BEFORE the save (the printed margin omits the save's own latency)`,
      change?.ok === true && change?.rowAfter?.status === "PENDING" && decided != null && Date.parse(decided.dueAt) > change.atMs,
      j({ saved: change?.ok, rowAfterSave: change?.rowAfter?.status, dueAt: decided?.dueAt, savedAt: stamp(change?.atMs), marginMs: decided && change ? Date.parse(decided.dueAt) - change.atMs : null }));
    ok(`${key} · …and rulesVersion is exactly base + 1 — the save is on the row fire re-reads, not in a tab`,
      change?.ok === true && change?.botAfter?.rulesVersion === change?.base + 1,
      j({ base: change?.base, after: change?.botAfter?.rulesVersion }));
  };

  /** A refusal's money: no marked position, the wallet exactly where it was — AND-ed with the witnessed terminal row. */
  const refusedMoney = async (d: Any, status: string, code: string): Promise<void> => {
    const { key, bot, market, before, fired } = d;
    const witnessed = fired?.status === status && fired?.reasonCode === code && fired?.id === d.decided?.id;
    const n = (await housePositionsOn(market.id)).filter((p: Any) => p.houseBotId === bot.botId).length;
    const after = (await w.bal(bot.userId)).balance as number;
    ok(`${key} · …no marked position on the market and the holder's wallet untouched (delta 0 against the balance read BEFORE the trigger) — the refusal WITNESSED first, so the empty market is evidence`,
      witnessed && n === 0 && before - after === 0 && fired?.positionId == null,
      j({ witnessed, positions: n, before, after, delta: before - after }));
  };
  const stillActive = async (d: Any, terminalStatus: string): Promise<void> => {
    const botNow = await getBot(d.bot.botId);
    ok(`${d.key} · …and the account is STILL ACTIVE — a pause would mean revalidateLive or rulesOutcomes fired, not the seam under test`,
      d.fired?.status === terminalStatus && botNow?.status === "ACTIVE" && stoppedFor(d.bot.botId) === 0,
      j({ status: botNow?.status, pauseReason: botNow?.pauseReason, botStopped: stoppedFor(d.bot.botId) }));
  };
  /** A placement's money: ONE marked position of exactly `stakeExpected`, the wallet down by exactly that, every money row marked. */
  const placedMoney = async (d: Any, stakeExpected: number, why: string): Promise<number | undefined> => {
    const { key, bot, market, before, fired } = d;
    ok(`${key} · the poller fired it to PLACED, with a position id, on the SAME row that was PENDING`,
      fired?.status === "PLACED" && !!fired?.positionId && fired?.id === d.decided?.id, j({ status: fired?.status, code: fired?.reasonCode }));
    const house = (await housePositionsOn(market.id)).filter((p: Any) => p.houseBotId === bot.botId);
    const staked = house[0]?.stake;
    ok(`${key} · exactly ONE marked position on this market, YES, of EXACTLY ${stakeExpected} — ${why}`,
      house.length === 1 && house[0]?.side === "YES" && staked === stakeExpected, j({ n: house.length, side: house[0]?.side, staked, expected: stakeExpected }));
    const after = (await w.bal(bot.userId)).balance as number;
    ok(`${key} · …and the holder's wallet fell by exactly ${stakeExpected}, to the shilling`,
      typeof staked === "number" && staked === stakeExpected && before - after === stakeExpected, j({ before, after, delta: before - after, staked }));
    const txns = house[0] ? await w.txnsFor(house[0].id) : [];
    ok(`${key} · …and every money row it wrote carries the marker (D20)`,
      txns.length > 0 && txns.every((t: Any) => t.houseBotId === bot.botId), j({ n: txns.length }));
    if (house.length === 1 && staked === stakeExpected) out.placed.push({ key, stake: staked, side: house[0].side, market: market.id, botId: bot.botId, holder: bot.userId });
    return staked;
  };

  /* ═══ PHASE 1 · six desks, six markets, six changes — all deciding at once ═══════════════════════ */
  section("lane G · RULES CHANGED MID-FLIGHT — six accounts, one market each, the change made while the row is PENDING");

  const desks: Any[] = [];
  for (const key of KEYS) desks.push(await arm(key, `Fleet ${key}`));
  const byKey = (k: string): Any => desks.find((d) => d.key === k);

  /* The change each desk makes the moment its row is PENDING. G4's window is placed on the DB clock's now. */
  let g4Schedule: Any = null;
  let g3Cas2: Any = null;
  const CHANGES: Record<string, (d: Any) => Promise<void>> = {
    "G1-MODE-OFF": async (d) => {
      d.change = await changeNow(d, (bot) => {
        const doc = structuredClone(bot.rules);
        doc.modes.polls.counter = false;
        return { rules: doc };
      });
    },
    "G2-MAX-DOWN": async (d) => {
      d.change = await changeNow(d, () => ({ stakeMaxTzs: d.exp.newStakeMax }));
    },
    "G3-MAX-UP": async (d) => {
      d.change = await changeNow(d, () => ({ stakeMaxTzs: d.exp.newStakeMax }));
      /* ⛔ THE CAS, from ONE base: a second save at the stale version must be REFUSED with the current row. A
         save that re-reads the version first (world.setCaps) cannot fail and proves nothing about concurrency. */
      if (d.change) g3Cas2 = await S.houseBotStore.saveRules(d.bot.botId, d.change.base, { stakeMaxTzs: d.exp.newStakeMax });
    },
    "G4-SCHEDULE": async (d) => {
      d.change = await changeNow(d, (bot, atMs) => {
        /* Placed on the DATABASE clock's now — what fire.ts:155 tests against. The window is the ANTIPODAL hour
           (now + 12 h floored to the hour, mod 24 h: ≥ 11 h away either way), listed on BOTH today's and
           tomorrow's EAT weekday — so a fire landing after EAT midnight (≤ 5 min after a 23:5x save) is still on
           a LISTED day, and "outside" is always the window's minutes, never an unlisted day. */
        const { day, nextDay, minute } = eatOf(atMs);
        const startMin = ((Math.floor(minute / 60) + 12) % 24) * 60;
        g4Schedule = { days: [day, nextDay], allDay: false, windows: [{ startMin, endMin: startMin + 60 }] };
        const doc = structuredClone(bot.rules);
        doc.schedule = g4Schedule;
        return { rules: doc };
      });
    },
    "G5-INVALID": async (d) => {
      d.change = await changeNow(d, (bot) => {
        const doc = structuredClone(bot.rules);
        doc.modes.polls.counter = "yes"; // a string where a boolean must be: readStoredRulesV1's bool() → RULES_INVALID at this field
        return { rules: doc };
      });
    },
    "G6-SCOPE-EMPTY": async (d) => {
      d.change = await changeNow(d, (bot) => {
        const doc = structuredClone(bot.rules);
        doc.scope.categories = [];
        return { rules: doc };
      });
    },
  };

  /* ⛔ CONCURRENT: each desk waits for ITS decision and changes ITS rules the instant the row is PENDING. */
  await Promise.all(desks.map(async (d: Any) => {
    d.decided = await waitDecision(d);
    await CHANGES[d.key](d);
  }));
  /* ⛔ CONCURRENT: each desk waits for its own terminal row. */
  await Promise.all(desks.map(async (d: Any) => {
    d.fired = d.decided?.status === "PENDING" ? await waitTerminal(d) : null;
    if (d.fired) terminals++;
  }));
  /** The timing margins, printed (not asserted) so a run report can say how wide the PENDING window really was. */
  const margins = (list: Any[]): void => console.log(`   … margins (dueAt − save instant, ms): ${list.map((d: Any) =>
    `${d.key}=${d.decided && d.change ? Date.parse(d.decided.dueAt) - d.change.atMs : "—"}`).join(" · ")}`);
  margins(desks);

  // ── G1 · mode switched off ────────────────────────────────────────────────────────────────────
  {
    const d = byKey("G1-MODE-OFF");
    premise(d, "modes.polls.counter → false");
    ok("G1-MODE-OFF · the STORED document now has modes.polls.counter === false — read back off the row, not assumed",
      d.change?.ok === true && d.change?.botAfter?.rules?.modes?.polls?.counter === false && d.change?.docBefore?.modes?.polls?.counter === true,
      j({ before: d.change?.docBefore?.modes?.polls?.counter, after: d.change?.botAfter?.rules?.modes?.polls?.counter }));
    ok(`G1-MODE-OFF · fire re-read the saved scope: the SAME row went PENDING → SKIPPED · ${d.exp.fireCode} (fire.ts:147 coversAtFire → rulesCover reads modes.polls.counter)`,
      d.fired?.id === d.decided?.id && d.fired?.status === "SKIPPED" && d.fired?.reasonCode === d.exp.fireCode,
      j({ status: d.fired?.status, code: d.fired?.reasonCode, sameRow: d.fired?.id === d.decided?.id }));
    await stillActive(d, "SKIPPED");
    await refusedMoney(d, "SKIPPED", d.exp.fireCode);
  }

  // ── G2 · stakeMax lowered → clamped down, written back ────────────────────────────────────────
  {
    const d = byKey("G2-MAX-DOWN");
    const exp = d.exp;
    premise(d, `stakeMaxTzs → ${exp.newStakeMax}`);
    ok(`G2-MAX-DOWN · the STORED cap reads stakeMaxTzs ${exp.newStakeMax} BEFORE the poller claims (the row still PENDING at that read)`,
      d.change?.ok === true && d.change?.botAfter?.stakeMaxTzs === exp.newStakeMax && d.change?.rowAfter?.status === "PENDING",
      j({ before: d.change?.before?.stakeMaxTzs, after: d.change?.botAfter?.stakeMaxTzs, row: d.change?.rowAfter?.status }));
    const staked = await placedMoney(d, exp.fire, "the recomputed cap, not the 88,000 it decided");
    ok(`G2-MAX-DOWN · MON-02 · the row was CLAMPED DOWN: stakeTzs ${exp.decide} at PENDING → ${exp.fire} at PLACED, and decision.firedStakeTzs === ${exp.fire} — written only by clampStake (the Postgres one, house-bot-dal.ts:3933, which this drive runs on; its in-memory twin at :2659)`,
      d.decided?.stakeTzs === exp.decide && d.fired?.status === "PLACED" && d.fired?.stakeTzs === exp.fire && d.fired?.decision?.firedStakeTzs === exp.fire && staked === exp.fire,
      j({ pending: d.decided?.stakeTzs, placedRow: d.fired?.stakeTzs, firedStakeTzs: d.fired?.decision?.firedStakeTzs, staked }));
    ok(`G2-MAX-DOWN · …while decision.askedStakeTzs still says ${exp.asked} — the decision was NOT re-run at fire, the stake was cut`,
      d.fired?.status === "PLACED" && d.fired?.decision?.askedStakeTzs === exp.asked, j({ asked: d.fired?.decision?.askedStakeTzs }));
    await stillActive(d, "PLACED");
  }

  // ── G3 · stakeMax raised → must not grow ──────────────────────────────────────────────────────
  {
    const d = byKey("G3-MAX-UP");
    const exp = d.exp;
    premise(d, `stakeMaxTzs ${exp.oldStakeMax} → ${exp.newStakeMax}`);
    ok(`G3-MAX-UP · PREMISE · the decision was PINNED by the OLD cap: asked ${exp.asked} > cap ${exp.oldStakeMax} = decided ${exp.decide} — otherwise a growing fire would be invisible`,
      d.change?.before?.stakeMaxTzs === exp.oldStakeMax && d.decided?.stakeTzs === exp.decide && d.decided?.decision?.askedStakeTzs === exp.asked && exp.asked > exp.oldStakeMax,
      j({ oldCap: d.change?.before?.stakeMaxTzs, decided: d.decided?.stakeTzs, asked: d.decided?.decision?.askedStakeTzs }));
    ok(`G3-MAX-UP · the STORED cap reads stakeMaxTzs ${exp.newStakeMax} BEFORE the poller claims (the row still PENDING at that read)`,
      d.change?.ok === true && d.change?.botAfter?.stakeMaxTzs === exp.newStakeMax && d.change?.rowAfter?.status === "PENDING",
      j({ after: d.change?.botAfter?.stakeMaxTzs, row: d.change?.rowAfter?.status }));
    ok("G3-MAX-UP · CAS · a SECOND save from the SAME base version is REFUSED with the current row (rulesVersion base + 1) — two officers, one winner, never a merge",
      d.change?.ok === true && g3Cas2?.ok === false && g3Cas2?.current?.rulesVersion === d.change?.base + 1,
      j({ second: g3Cas2?.ok, current: g3Cas2?.current?.rulesVersion, base: d.change?.base }));
    const staked = await placedMoney(d, exp.fire, `the DECIDED stake, not the raised cap: a fire re-sized UPWARD would place ${exp.growWouldBe.noIntentTerm} (the cut — what placing does with all three shrink-only layers defeated) or ${exp.growWouldBe.fromAsked} (from the asked amount)`);
    ok(`G3-MAX-UP · THE OWNER'S ASSERTION · the row's stakeTzs is byte-identical to the decision (${exp.decide}) and carries NO decision.firedStakeTzs — Math.min(intent.stakeTzs, …) is the ceiling and clampStake never ran`,
      d.fired?.status === "PLACED" && d.fired?.stakeTzs === exp.decide && d.decided?.stakeTzs === exp.decide && d.fired?.decision?.firedStakeTzs === undefined && staked === exp.decide,
      j({ pending: d.decided?.stakeTzs, placedRow: d.fired?.stakeTzs, firedStakeTzs: d.fired?.decision?.firedStakeTzs ?? "absent", staked }));
    ok(`G3-MAX-UP · …and decision.askedStakeTzs still says ${exp.asked} — nothing re-sized the stake`,
      d.fired?.status === "PLACED" && d.fired?.decision?.askedStakeTzs === exp.asked, j({ asked: d.fired?.decision?.askedStakeTzs }));
    await stillActive(d, "PLACED");
  }

  // ── G4 · schedule moved out ───────────────────────────────────────────────────────────────────
  {
    const d = byKey("G4-SCHEDULE");
    premise(d, "schedule → one window that excludes now");
    {
      /* ⚠️ Compared FIELD BY FIELD, not as JSON text: jsonb stores keys in its own order (`{"endMin":…,"startMin":…}`
         came back for `{startMin, endMin}`), and a string compare read a correct product as a failed save on run 1. */
      const s = d.change?.botAfter?.rules?.schedule;
      const w0 = s?.windows?.[0];
      const same = g4Schedule != null && s != null && Array.isArray(s.days) && s.days.length === 2 && s.days[0] === g4Schedule.days[0] && s.days[1] === g4Schedule.days[1]
        && s.allDay === false && Array.isArray(s.windows) && s.windows.length === 1
        && w0?.startMin === g4Schedule.windows[0].startMin && w0?.endMin === g4Schedule.windows[0].endMin;
      ok(`G4-SCHEDULE · the STORED schedule now reads ${j(g4Schedule)} EAT (read back field by field), replacing all-day every day — a shape no officer form posts, so through the DAL`,
        d.change?.ok === true && same && d.change?.docBefore?.schedule?.allDay === true,
        j({ before: d.change?.docBefore?.schedule, after: s }));
    }
    ok(`G4-SCHEDULE · fire re-tested the schedule on the DATABASE clock: the SAME row went PENDING (reasonCode null — decide.ts did NOT write this code) → SKIPPED · ${d.exp.fireCode} (fire.ts:162)`,
      d.decided?.reasonCode == null && d.fired?.id === d.decided?.id && d.fired?.status === "SKIPPED" && d.fired?.reasonCode === d.exp.fireCode,
      j({ atDecision: d.decided?.reasonCode, status: d.fired?.status, code: d.fired?.reasonCode }));
    {
      const finishedMs = d.fired?.finishedAt ? Date.parse(d.fired.finishedAt) : NaN;
      const at = Number.isFinite(finishedMs) ? eatOf(finishedMs) : null;
      const win = g4Schedule?.windows?.[0];
      const dayListed = at != null && g4Schedule != null && g4Schedule.days.includes(at.day);
      const minuteInside = at != null && win != null && at.minute >= win.startMin && at.minute < win.endMin;
      ok("G4-SCHEDULE · PREMISE · the instant it was finished (DB clock) is on a LISTED EAT weekday (today or tomorrow — a midnight rollover cannot be the refuser) and its minute-of-day, computed by hand, lies OUTSIDE the window written, within 5 minutes of the save — so \"outside\" is the window's minutes, not a day that passed",
        at != null && d.change != null && dayListed && !minuteInside && finishedMs - d.change.atMs < 300_000 && finishedMs > d.change.atMs,
        j({ finishedAt: stamp(finishedMs), eat: at, dayListed, minuteInside, window: g4Schedule, sinceSaveMs: d.change ? finishedMs - d.change.atMs : null }));
    }
    await stillActive(d, "SKIPPED");
    await refusedMoney(d, "SKIPPED", d.exp.fireCode);
  }

  // ── G5 · rules made unparseable ───────────────────────────────────────────────────────────────
  {
    const d = byKey("G5-INVALID");
    const exp = d.exp;
    premise(d, "modes.polls.counter → \"yes\" (a string), an unparseable document");
    const parsedBefore = d.change ? RULES.parseHouseBotRules(d.change.docBefore, CTX) : null;
    const parsedAfter = d.change ? RULES.parseHouseBotRules(d.change.botAfter?.rules, CTX) : null;
    ok(`G5-INVALID · CONTROL · the document parsed OK before the write; the one written is one readStoredRulesV1 REJECTS: RULES_INVALID at ${exp.field} — through the DAL, because no officer path can reach this state (rules-save.ts:150 refuses an unreadable doc, :246 round-trips what it writes)`,
      parsedBefore?.ok === true && parsedAfter?.ok === false && parsedAfter?.code === exp.pause && parsedAfter?.field === exp.field && d.change?.ok === true,
      j({ before: parsedBefore?.ok, after: parsedAfter?.ok, code: parsedAfter?.code, field: parsedAfter?.field }));
    const botNow = await getBot(d.bot.botId);
    ok(`G5-INVALID · the account is AUTO_PAUSED with pauseReason ${exp.pause} and pauseDetail.field ${exp.field} — NOT stakeMaxTzs, which would be revalidateLive pausing it for a different reason`,
      d.fired != null && botNow?.status === "AUTO_PAUSED" && botNow?.pauseReason === exp.pause && botNow?.pauseDetail?.field === exp.field,
      j({ status: botNow?.status, pauseReason: botNow?.pauseReason, detail: botNow?.pauseDetail }));
    ok(`G5-INVALID · the SAME row went PENDING → ${exp.terminal} · ${exp.code} (stopBot → cancelLive, outcomes.ts:147, or fire.ts:131)`,
      d.fired?.id === d.decided?.id && d.fired?.status === exp.terminal && d.fired?.reasonCode === exp.code,
      j({ status: d.fired?.status, code: d.fired?.reasonCode, sameRow: d.fired?.id === d.decided?.id }));
    ok(`G5-INVALID · exactly ONE botStopped alert for this account, cause ${exp.pause} (outcomes.ts:157) — the second actor found the account already out of ACTIVE and wrote nothing`,
      d.fired != null && stoppedFor(d.bot.botId) === 1 && stoppedFor(d.bot.botId, exp.pause) === 1,
      j({ botStopped: stoppedFor(d.bot.botId), withCause: stoppedFor(d.bot.botId, exp.pause) }));
    /* WHICH ACTOR. attempts is bumped by the poller's claim: 0 means the row was cancelled before any claim —
       the PLANNER's rulesOutcomes (planner.ts:399; its pass counts rulesPaused); ≥ 1 means it was claimed and
       fire.ts:128-131 ran the same stop. Both write the same durable state, so the actor is PINNED by arithmetic:
       the save lands ≥ 29 s before dueAt (the margins printed above) and the planner passes every 15 s, so a
       correct planner ALWAYS cancels the row before the poller can claim it. A run where fire is the actor is a
       planner whose duty did not fire — measured: planner.ts:399 disabled walked through the either-actor form of
       this assertion (99/99, actor "fire", attempts 1, rulesPaused 0); this form takes it red. By the same
       arithmetic fire's own arm is NOT MEASURED here: it can only act when the planner's did not. */
    const actor = d.fired == null ? null : d.fired.attempts === 0 ? "planner" : "fire";
    ok(`G5-INVALID · WHICH ACTOR · the PLANNER (attempts 0 — cancelled before any claim; planner passes counted rulesPaused ≥ 1, boundsPaused 0 — that would be the wrong mechanism): with ≥ 29 s of PENDING left at the save and a 15 s planner cadence, fire.ts:128-131 acting instead (attempts ≥ 1, rulesPaused 0) would mean planner.ts:399 did NOT`,
      actor === "planner" && plannerCount("rulesPaused") >= 1 && plannerCount("boundsPaused") === 0,
      j({ actor, attempts: d.fired?.attempts, claimedBy: d.fired?.claimedBy, rulesPaused: plannerCount("rulesPaused"), boundsPaused: plannerCount("boundsPaused") }));
    await refusedMoney(d, exp.terminal, exp.code);
  }

  // ── G6 · scope.categories emptied ─────────────────────────────────────────────────────────────
  {
    const d = byKey("G6-SCOPE-EMPTY");
    premise(d, "scope.categories → []");
    ok(`G6-SCOPE-EMPTY · CONTROL · the POPULATED scope (categories [${CATEGORY}] in the stored document at the PENDING observation) DID produce the PENDING intent — a fixture that only asserts "no intents" passes before and after the §0 fix`,
      d.decided?.status === "PENDING" && Array.isArray(d.change?.docBefore?.scope?.categories) && d.change?.docBefore?.scope?.categories?.includes(CATEGORY),
      j({ categoriesBefore: d.change?.docBefore?.scope?.categories, status: d.decided?.status }));
    ok("G6-SCOPE-EMPTY · the STORED scope.categories is now [] (read back) and the document still parses — this is a scope change, not an invalid document",
      d.change?.ok === true && Array.isArray(d.change?.botAfter?.rules?.scope?.categories) && d.change?.botAfter?.rules?.scope?.categories?.length === 0
        && RULES.parseHouseBotRules(d.change?.botAfter?.rules, CTX)?.ok === true,
      j({ after: d.change?.botAfter?.rules?.scope?.categories }));
    ok(`G6-SCOPE-EMPTY · fire re-read the saved scope: the SAME row went PENDING → SKIPPED · ${d.exp.fireCode} (rulesCover with an empty category list, decide.ts:179)`,
      d.fired?.id === d.decided?.id && d.fired?.status === "SKIPPED" && d.fired?.reasonCode === d.exp.fireCode,
      j({ status: d.fired?.status, code: d.fired?.reasonCode, sameRow: d.fired?.id === d.decided?.id }));
    await stillActive(d, "SKIPPED");
    await refusedMoney(d, "SKIPPED", d.exp.fireCode);
  }

  /* ═══ PHASE 2 · two desks that placed nothing, re-armed: the bounds refusal and the FUTURE build ═══ */
  section("lane G · phase 2 — stakeMax lowered UNDER stakeMin (G4) · rules from a FUTURE build are requeued, not paused (G1)");

  const restore = async (key: string, extra: Record<string, unknown> = {}): Promise<Any> => {
    const d = byKey(key);
    const docBefore = d.change?.docBefore;
    if (!docBefore) return { ok: false, why: "no docBefore — phase 1 changed nothing" };
    const cur = await getBot(d.bot.botId);
    const res = await S.houseBotStore.saveRules(d.bot.botId, cur.rulesVersion, { rules: docBefore, ...extra });
    return { ok: res?.ok === true, bot: await getBot(d.bot.botId) };
  };
  const g4 = byKey("G4-SCHEDULE");
  const g1 = byKey("G1-MODE-OFF");
  const r4 = await restore("G4-SCHEDULE", { stakeMinTzs: g4.exp.bounds.stakeMin });
  const r1 = await restore("G1-MODE-OFF");
  ok(`G4-BOUNDS · re-armed: the phase-1 schedule restored (all day) and stakeMinTzs raised to ${g4.exp.bounds.stakeMin} BEFORE the trigger — decide passes it (104,000 ≥ 30,000), fire is what moves`,
    r4?.ok === true && r4?.bot?.rules?.schedule?.allDay === true && r4?.bot?.stakeMinTzs === g4.exp.bounds.stakeMin && r4?.bot?.status === "ACTIVE",
    j({ ok: r4?.ok, allDay: r4?.bot?.rules?.schedule?.allDay, stakeMin: r4?.bot?.stakeMinTzs, status: r4?.bot?.status, why: r4?.why }));
  ok("G1-FUTURE · re-armed: the phase-1 document restored (counter back ON) so the desk decides again",
    r1?.ok === true && r1?.bot?.rules?.modes?.polls?.counter === true && r1?.bot?.status === "ACTIVE",
    j({ ok: r1?.ok, counter: r1?.bot?.rules?.modes?.polls?.counter, status: r1?.bot?.status, why: r1?.why }));

  const p2: Any[] = [];
  if (r4?.ok) p2.push(await arm("G4-SCHEDULE", "Fleet G4-BOUNDS"));
  if (r1?.ok) p2.push(await arm("G1-MODE-OFF", "Fleet G1-FUTURE"));
  const q4 = p2.find((d) => d.key === "G4-SCHEDULE") ?? { key: "G4-SCHEDULE", exp: g4.exp, bot: g4.bot, market: g4.market, before: g4.before, decided: null, change: null, fired: null };
  const q1 = p2.find((d) => d.key === "G1-MODE-OFF") ?? { key: "G1-MODE-OFF", exp: g1.exp, bot: g1.bot, market: g1.market, before: g1.before, decided: null, change: null, fired: null };
  q4.key = "G4-BOUNDS";
  q1.key = "G1-FUTURE";

  let requeued: Any = null;
  let restored: Any = null;
  await Promise.all(p2.map(async (d: Any) => {
    d.decided = await waitDecision(d);
    if (d === q4) {
      d.change = await changeNow(d, () => ({ stakeMaxTzs: d.exp.bounds.newStakeMax }));
      d.fired = d.decided?.status === "PENDING" ? await waitTerminal(d) : null;
    } else {
      d.change = await changeNow(d, (bot) => ({ rules: { ...structuredClone(bot.rules), schemaVersion: 99 } }));
      /* The requeue: fire.ts:129 hands the row back (transientAttempts + 1, a MON-10 backoff) — and keeps doing so. */
      requeued = d.decided?.status === "PENDING"
        ? await until("G1-FUTURE · the row being handed back (transientAttempts ≥ 1)", 120_000, async () => {
          const r = await S.houseBotIntentStore.get(d.decided.id);
          return r && r.transientAttempts >= 1 ? r : null;
        })
        : null;
      const botDuring = await getBot(d.bot.botId);
      d.during = { bot: botDuring, stopped: stoppedFor(d.bot.botId), futureAlerts: seen("once", "RULES_FROM_FUTURE") };
      /* Then the document comes back from the future, and the same row must fire normally. */
      if (requeued) {
        const cur = await getBot(d.bot.botId);
        const res = await S.houseBotStore.saveRules(d.bot.botId, cur.rulesVersion, { rules: d.change.docBefore });
        restored = { ok: res?.ok === true, bot: await getBot(d.bot.botId) };
      }
      d.fired = requeued ? await waitTerminal(d) : null;
    }
    if (d.fired) terminals++;
  }));
  margins(p2);

  // ── G4-BOUNDS · stakeMax lowered under stakeMin ───────────────────────────────────────────────
  {
    const d = q4;
    const b = d.exp.bounds;
    premise(d, `stakeMaxTzs → ${b.newStakeMax}, under stakeMinTzs ${b.stakeMin}`);
    ok(`G4-BOUNDS · the STORED caps read stakeMinTzs ${b.stakeMin} / stakeMaxTzs ${b.newStakeMax} BEFORE the poller claims — an ordering no validator would accept (R-STAKE-ORDER), so through the DAL; and ${b.newStakeMax} ≥ the live minimum 1,000, so planner.ts:414 stays silent`,
      d.change?.ok === true && d.change?.botAfter?.stakeMinTzs === b.stakeMin && d.change?.botAfter?.stakeMaxTzs === b.newStakeMax && d.change?.rowAfter?.status === "PENDING",
      j({ stakeMin: d.change?.botAfter?.stakeMinTzs, stakeMax: d.change?.botAfter?.stakeMaxTzs, row: d.change?.rowAfter?.status }));
    ok(`G4-BOUNDS · fire recomputed under the new bounds: capped 20,000 < max(stakeMin 30,000, bounds.min 1,000) → the SAME row went PENDING → SKIPPED · ${b.code} (fire.ts:230-231), NOT CAP_STAKE_MAX and NOT a clamp`,
      d.fired?.id === d.decided?.id && d.fired?.status === "SKIPPED" && d.fired?.reasonCode === b.code && d.fired?.decision?.firedStakeTzs === undefined,
      j({ status: d.fired?.status, code: d.fired?.reasonCode, firedStakeTzs: d.fired?.decision?.firedStakeTzs ?? "absent" }));
    await stillActive(d, "SKIPPED");
    await refusedMoney(d, "SKIPPED", b.code);
  }

  // ── G1-FUTURE · rules from a future build ────────────────────────────────────────────────────
  {
    const d = q1;
    const exp = d.exp;
    premise(d, "schemaVersion → 99 (a document from a FUTURE build)");
    ok("G1-FUTURE · RULES_FROM_FUTURE is NOT a pause and NOT a skip: the row was handed back (transientAttempts ≥ 1, fire.ts:129 requeueQuietly), the account still ACTIVE, no botStopped for it, and no RULES_FROM_FUTURE alert yet (the planner alerts only after 600 s)",
      requeued != null && requeued.transientAttempts >= 1 && ["PENDING", "CLAIMED"].includes(requeued.status) && d.during?.bot?.status === "ACTIVE" && d.during?.stopped === 0 && d.during?.futureAlerts === 0,
      j({ transientAttempts: requeued?.transientAttempts, status: requeued?.status, nextAttemptAt: requeued?.nextAttemptAt, bot: d.during?.bot?.status, stopped: d.during?.stopped, futureAlerts: d.during?.futureAlerts }));
    ok("G1-FUTURE · the document restored (CAS ok, schemaVersion back to 1) — and the SAME row, never cancelled, fires on its next claim",
      restored?.ok === true && restored?.bot?.rules?.schemaVersion === 1 && d.fired?.id === d.decided?.id,
      j({ restored: restored?.ok, schemaVersion: restored?.bot?.rules?.schemaVersion, sameRow: d.fired?.id === d.decided?.id }));
    const staked = await placedMoney(d, exp.future.fire, "the stake it decided before the document went to the future");
    ok(`G1-FUTURE · the PLACED row still carries transientAttempts ≥ 1 — the durable proof it was requeued before it placed — its stakeTzs ${exp.future.fire} unchanged, no firedStakeTzs`,
      d.fired?.status === "PLACED" && d.fired?.transientAttempts >= 1 && d.fired?.stakeTzs === exp.future.fire && d.fired?.decision?.firedStakeTzs === undefined && staked === exp.future.fire,
      j({ transientAttempts: d.fired?.transientAttempts, row: d.fired?.stakeTzs, staked }));
    await stillActive(d, "PLACED");
  }

  /* ═══ THE LEDGER · ruling 165 held across the whole lane ═══════════════════════════════════════ */
  {
    const control = await S.houseBotControlStore.get();
    ok(`G · LEDGER · ${terminals}/${TERMINALS_EXPECTED} terminal rows witnessed, ZERO security alerts, ZERO switchedOff, the master switch still ON — no mid-flight change let a stale figure reach H0 (that would be house_key_mismatch → ENGINE_FAULT, and every later absence here would pass for the wrong reason)`,
      terminals === TERMINALS_EXPECTED && seen("security") === 0 && seen("switchedOff") === 0 && control?.enabled === true,
      j({ terminals, security: seen("security"), switchedOff: seen("switchedOff"), enabled: control?.enabled }));
  }

  return out;
}
