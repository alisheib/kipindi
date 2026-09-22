/**
 * LANE D · FILL — one lane module of the fleet drive (see `house-bot-fleet-drive.mts`, "lane modules").
 *
 * ⛔ THIS FILE IMPORTS NOTHING FROM `src/`, for the reason the roster's header gives: its `expect` literals are
 * the ORACLE, derived by hand from inputs this fixture chose, and calling `decide.ts` to check `decide.ts` is a
 * tautology. `run` receives everything it touches through `env`.
 *
 * ONE desk, FOUR markets, because a FILL is planned ONCE PER MARKET for the life of the database
 * (`plannableMarkets` has a `NOT EXISTS` dedupe on (kind, anchorKey) that survives every terminal status but an
 * admin's CANCELLED), so every sub-case needs a market of its own:
 *
 *   D1-FILL     · the pure arithmetic: locked NO 50,000, raw YES 0 → wanted 33,333, staked 33,000.
 *   D1-COLUMNS  · raw ≠ locked on BOTH sides (ineligible money), so each wrong column gives a different
 *                 `wantedTzs`; then late money on the thin side makes the FIRE-time cut bind, on the `locked`
 *                 column, where `lockedA15`/`nonHouse` would have left the stake uncut.
 *   D1-SCOPE    · a market whose fill instant (cutoff − lead) precedes switch-on: NO row, ever — an absence,
 *                 witnessed by the pass that planned D1-FILL, which scanned this market first and wrote nothing.
 *   D1-FINDER   · the thin-side FINDER: raw ≠ locked on both sides, arranged so that the real finder rejects YES
 *                 on its raw share and plans NO, while a finder that reads the thin side's own pool (or the total)
 *                 off the locked column picks YES first, sizes it below zero and writes NOTHING — row vs no row.
 *                 ⛔ Added at the mutation stage: the first version of this file claimed the finder could not be
 *                 measured, and the mutation `raw[s] → locked[s]` walked through its 33 assertions untouched.
 *
 * ⛔ A FILL REFUSAL IS PURE ABSENCE. `planFill` returns `{ row: null, code: null }` for every refusal that
 * matters, and `planMarket` throws even the few non-null codes away (`if (!probe.row) continue;`). So a negative
 * case here can never read a SKIPPED row; it reads the PLANNER PASS STRUCTURE the drive captures (`env.passes`)
 * — the pass ran duty `fillOpener` ok, had the market inside its scan window, planned a positive sibling in the
 * same breath, and wrote nothing for this one. A dead engine supplies the absence for free and the witness never.
 *
 * ⛔ EVERY ASSERTION BELOW GOES RED WITH THE ENGINE OFF. Under `KP_FLEET_SILENT=1` the switch still goes on and
 * the scope instants still exist, so no premise that holds without the engine may stand alone as a pass — each
 * is folded into an assertion that also needs a fact only the engine can produce (a row, a pass, a position).
 *
 * ⛔ THE CUTOFF IS THE OPPOSITE OF LANE A's, and it is the whole clock of this lane. A FILL is due at
 * `max(cutoff − lead − jitter, passNow)` (decide.ts) and the planner scans only markets with
 * `cutoff ≤ passNow + max(lead + jitter) + 15 s` (planner.ts, `plannableMarkets`); `cutoff − lead` must also be
 * at or after switch-on. So a market closing in EXACTLY `lead` is due the moment it is seen; one closing in
 * `lead + W` is invisible until `W − 15 s` have passed and then due at `cutoff − lead`; and one closing so soon
 * that `cutoff − lead` precedes switch-on is refused in silence. The markets use all three shapes (D1-FINDER
 * closes in exactly the lead, as D1-FILL does).
 *
 * ⚠️ WHAT THIS LANE CANNOT MEASURE, said here so nobody credits it. Both follow from the validator's ceiling on
 * `fill.targetThinSharePct` (rules.ts: 10–50), i.e. k = p/(100−p) ≤ 1: (1) `room` never binds, because
 * floor(L·k) ≤ L, so no legal fixture can tell `room` from its absence — deleting it is an equivalent mutant;
 * (2) the finder variant that reads the share off the LOCKED column on BOTH terms
 * (locked[s]·100 < p·(locked[s]+locked[opp])) is observationally equivalent to the real one: a positive row on S
 * needs raw[S] < k·locked[opp], and for the other side S′ to be picked first under that variant it would need
 * locked[S′] < k·locked[S] ≤ k·raw[S] < k²·locked[S′], impossible for k ≤ 1 — and a row that both variants
 * write is sized identically. The ONE-TERM variants are NOT equivalent, and D1-FINDER separates them: a wrong
 * finder that picks the other side sizes it to ≤ 0 and writes nothing, so a fixture the real finder plans is
 * the discriminator — row versus NO row. (`wantedTzs` and the fired stake still exclude the sizing columns.)
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
import type { FleetBot } from "./house-bot-fleet-roster.mts";

export const LANE = "D";

/** The desk's lead, restated as the literal every timing figure below is derived from (`fill.leadPollsMin`). */
const LEAD_MIN = 30;
const LEAD_MS = LEAD_MIN * 60_000;
/** The planner's own cadence, the slack it adds to the FILL scan window (planner.ts `PLANNER_INTERVAL_MS`). */
const SCAN_SLACK_MS = 15_000;
/** `PLANNER_MIN_CUTOFF_AHEAD_MS` — the scan's lower edge, strict. */
const SCAN_AHEAD_MS = 10_000;
/** `guards.minTimeToCutoffPollsMin` default 5 → `deadlineAt = cutoff − 300 s`. */
const MIN_TIME_TO_CUTOFF_MS = 300_000;
/** `STALE_AFTER_SEC.polls` → `staleAt = dueAt + 600 s`. */
const STALE_MS = 600_000;
/** `LOCK_MARGIN_MS` = MAX_TOLERATED_SKEW_MS 5,000 + CLAIM_SKEW_GUARD_MS 2,000 — recorded on every FILL decision. */
const LOCK_MARGIN_MS = 7_000;

export const roster: readonly FleetBot[] = [
  /* ── Lane D · tech · FILL ───────────────────────────────────────────────────────────────────────── */
  {
    key: "D1-FILL", lane: "D", category: "tech", band: [10_000, 999_999],
    what: "FILL to a 40% thin share — three markets: the arithmetic, the raw/locked columns with a fire-time cut, and a market whose fill instant precedes switch-on",
    rules: { fill: true, thinSharePct: 40, leadPollsMin: LEAD_MIN, roundToTzs: 1_000, jitterPct: 0 },
  },
];

/**
 * THE EXPECTED FIGURES, EACH WITH ITS DERIVATION. The source they describe, so a reader can check the hand
 * against it without re-deriving anything (decide.ts `planFill`; fire.ts step 15; seam.ts H3):
 *   thin   = first s of [YES, NO] with locked[opp] > 0 && raw[s] × 100 < p × (raw[s] + raw[opp])
 *   wanted = floor(locked[opp] × p / (100 − p)) − raw[thin]
 *   room   = locked[opp] − raw[thin]                 (never binds at p ≤ 50: floor(L·p/(100−p)) ≤ L)
 *   stake  = clampStake(min(wanted, room)) = floorTo(min(·, stakeMaxTzs, bounds.max), roundToTzs), ok iff ≥ max(stakeMinTzs, bounds.min)
 *   fire   = floorTo(min(stakeTzs, locked[opp] − raw[side], stakeMaxTzs, bounds.max), roundToTzs); a smaller figure is written back
 *   H3     = raw[side] + stake ≤ locked[opp], inside the lock
 * `locked` counts an OPEN unmarked stake of an ELIGIBLE account (role PLAYER, not a live holder, not boxed today,
 * not recruited by a live holder) whose exit closed ≥ 7 s ago; `lockedA15` and `nonHouse` have no eligibility
 * filter (`lockedA15` also no margin); `raw` is the market's own pool. That is what the column cases lean on.
 */
export const expect = {
  /**
   * D1-FILL · one eligible NO 50,000 aged past the exit close; nothing on YES; market closing in EXACTLY the lead.
   *   thin   : YES — locked NO 50,000 > 0 and 0 × 100 = 0 < 40 × (0 + 50,000) = 2,000,000
   *   wanted = floor(50,000 × 40 / 60) − raw YES 0 = floor(33,333.33) − 0 = 33,333
   *   room   = 50,000 − 0 = 50,000
   *   stake  = floorTo(min(33,333, 50,000, 10,000,000, 1,000,000), 1,000) = 33,000  (ok: ≥ max(1,000, 1,000))
   *   fire   : cut = locked NO 50,000 − raw YES 0 = 50,000 → floorTo(min(33,000, 50,000, …), 1,000) = 33,000 = the row → nothing written back
   *   due    = max(cutoff − lead, passNow) = passNow (cutoff − lead = the creation instant, already past)
   * ⭐ `wantedTzs` 33,333 is the discriminator: floor(50,000 × 0.4) = 20,000 (p/100), 50,000 × 40/60 floored to the
   *   step in one go = 33,000, a room-first implementation = 50,000 — none of them writes 33,333.
   */
  "D1-FILL": { seedNo: 50_000, wanted: 33_333, decide: 33_000, fire: 33_000, side: "YES", closeInMs: LEAD_MS },

  /**
   * D1-COLUMNS · raw ≠ locked on BOTH sides, then late money on the thin side. All seeds aged past the exit close.
   *   NO  : 70,000 from a PLAYER (eligible → locked) + 30,000 from an AGENT-role account (ineligible → raw, nonHouse,
   *         lockedA15, but NOT locked)
   *   YES :  8,000 from an AGENT-role account (ineligible → raw but NOT locked)
   *   pools at the plan: raw YES 8,000 · raw NO 100,000 · locked YES 0 · locked NO 70,000 (lockedA15 NO 100,000)
   *   thin   : YES — locked NO 70,000 > 0 and 8,000 × 100 = 800,000 < 40 × (8,000 + 100,000) = 4,320,000
   *            (NO is not: 100,000 × 100 = 10,000,000 ≥ 4,320,000 — and locked YES is 0 besides)
   *   wanted = floor(70,000 × 40 / 60) − raw YES 8,000 = floor(46,666.67) − 8,000 = 46,666 − 8,000 = 38,666
   *            ⛔ raw / nonHouse / lockedA15 NO (100,000) there: floor(66,666.67) − 8,000 = 58,666
   *            ⛔ locked YES (0) for the subtrahend: 46,666 · both wrong: 66,666
   *   room   = 70,000 − 8,000 = 62,000
   *   stake  = floorTo(min(38,666, 62,000, 10,000,000, 1,000,000), 1,000) = 38,000
   *   late   : YES 36,500 from a PLAYER, placed once the row is durable → raw YES 44,500 at the fire
   *   fire   : cut = locked NO 70,000 − raw YES 44,500 = 25,500 → floorTo(min(38,000, 25,500, …), 1,000) = 25,000
   *            ⛔ lockedA15 / nonHouse NO (100,000) there: cut 55,500 → 38,000, uncut
   *            ⛔ locked YES for the subtrahend (36,500 once the late stake has locked, else 0): 33,000 or 38,000
   *   H3     : 44,500 + 25,000 = 69,500 ≤ 70,000 (500 of slack, so the seam's own re-check is not what cuts it)
   *   MON-02 : 25,000 < 38,000 → the claimed row is clamped to 25,000 and records `firedStakeTzs` 25,000
   *   due    = cutoff − lead, which is 55 s after the market is created (closeInMs = lead + 55 s); the market is
   *            outside the scan window for the first 40 s and is planned by the third pass after creation.
   */
  "D1-COLUMNS": {
    seedNo: 70_000, excludedNo: 30_000, excludedYes: 8_000, lateYes: 36_500,
    rawYes: 8_000, rawNo: 100_000, lockedYes: 0, lockedNo: 70_000,
    wanted: 38_666, decide: 38_000, fire: 25_000, side: "YES", closeInMs: LEAD_MS + 55_000,
  },

  /**
   * D1-SCOPE · the same money as D1-FILL (locked NO 50,000, thin YES, would want 33,333), but the market closes at
   * `scopeFrom + lead − 30 s`, so `cutoff − lead = scopeFrom − 30 s < scopeFrom` and decide.ts refuses before it
   * ever sizes anything: `{ row: null, code: null }`. Nothing is written, nothing is placed. The scan window and the
   * deadline are both satisfied at the witnessing pass while the run is under 20 min old, so the scope check is the
   * ONLY refuser — and the case says so in its premise.
   */
  "D1-SCOPE": { seedNo: 50_000, decide: null, beforeScopeMs: 30_000 },

  /**
   * D1-FINDER · the thin-side finder, measured the only way it can be at p ≤ 50: by a fixture the real finder
   * plans and a wrong one refuses. YES holds 81% of the RAW pool (not thin) but only 37.5% when its OWN pool is
   * read off the locked column against the raw total — a finder that does that picks YES first (YES is tested
   * first), sizes it to floor(locked NO 10,000 × 40/60) − raw YES 130,000 < 0, and writes NOTHING. All seeds aged
   * past the exit close; the ineligible money comes from AGENT-role accounts, as in D1-COLUMNS.
   *   YES : 60,000 from a PLAYER (eligible → locked) + 70,000 from an AGENT (raw only)
   *   NO  : 10,000 from a PLAYER (eligible → locked) + 20,000 from an AGENT (raw only)
   *   pools at the plan: raw YES 130,000 · raw NO 30,000 · locked YES 60,000 · locked NO 10,000
   *   thin   : YES? locked NO 10,000 > 0, but 130,000 × 100 = 13,000,000 ≥ 40 × (130,000 + 30,000) = 6,400,000 — no
   *            NO?  locked YES 60,000 > 0 and 30,000 × 100 = 3,000,000 < 6,400,000 — yes → thin NO, sized on YES
   *            ⛔ the thin side's OWN pool read LOCKED: YES 60,000 × 100 = 6,000,000 < 6,400,000 → YES picked first →
   *               wanted floor(10,000 × 40/60) − 130,000 = 6,666 − 130,000 < 0 → clamp 0 → NO ROW
   *            ⛔ the TOTAL read LOCKED (70,000): YES 13,000,000 ≥ 2,800,000 and NO 3,000,000 ≥ 2,800,000 → NO ROW
   *            (both terms read locked: YES 6,000,000 ≥ 2,800,000, NO 1,000,000 < 2,800,000 → NO, the same row —
   *            the equivalent variant the header proves cannot be separated at any legal p)
   *   wanted = floor(60,000 × 40 / 60) − raw NO 30,000 = 40,000 − 30,000 = 10,000
   *            ⛔ raw YES (130,000) there: floor(86,666.67) − 30,000 = 56,666 · locked NO (10,000) for the subtrahend:
   *               30,000 · no subtrahend: 40,000
   *   room   = 60,000 − 30,000 = 30,000
   *            ⛔ every wrong `wanted` above (56,666 · 30,000 · 40,000) is capped by `room` to 30,000 at the decide —
   *               the one place in this lane where `room` is seen to act, and only on a WRONG `wanted` (measured under
   *               the no-subtrahend mutant: the PENDING row said 30,000, wantedTzs 40,000); `wantedTzs` alone tells the
   *               three variants apart
   *   stake  = floorTo(min(10,000, 30,000, 10,000,000, 1,000,000), 1,000) = 10,000  (ok: ≥ max(1,000, 1,000))
   *   fire   : cut = locked YES 60,000 − raw NO 30,000 = 30,000 → floorTo(min(10,000, 30,000, …), 1,000) = 10,000 = the
   *            row → nothing written back (lockedA15 YES 130,000 there gives a cut of 100,000 — not a discriminator
   *            at fire; D1-COLUMNS is). ⛔ A wrong row of 30,000 passes the cut untouched, so the position would read
   *            30,000 — never 10,000.
   *   H3     : 30,000 + 10,000 = 40,000 ≤ 60,000
   *   due    = passNow (closeInMs = lead, as D1-FILL)
   * ⛔ SEED ORDER MATTERS. The market closes in exactly the lead, so it is inside the scan window from its first
   *   second and a pass can land between two seeds. The seeds go in AGENT YES, AGENT NO, PLAYER NO, PLAYER YES, and
   *   every prefix of that order leaves the finder nothing: with no locked money at all `locked[opp] > 0` fails
   *   both ways; with only locked NO 10,000, YES is 70,000 of 100,000 (not thin) and NO faces locked YES 0.
   */
  "D1-FINDER": {
    playerYes: 60_000, agentYes: 70_000, playerNo: 10_000, agentNo: 20_000,
    rawYes: 130_000, rawNo: 30_000, lockedYes: 60_000, lockedNo: 10_000,
    wanted: 10_000, decide: 10_000, fire: 10_000, side: "NO", closeInMs: LEAD_MS,
  },
} as const;

export async function run(env: Any, prior: Any): Promise<Any> {
  void prior;
  const { ok, section, until, j, w, S, fleet, EXPECT, passes, calls, sleep, C, FLEET, ENG } = env;
  const bot = fleet["D1-FILL"];
  if (!bot) return null;
  const A: Any = EXPECT["D1-FILL"];
  const B: Any = EXPECT["D1-COLUMNS"];
  const N: Any = EXPECT["D1-SCOPE"];
  const F: Any = EXPECT["D1-FINDER"];

  section("lane D · FILL — one account, four markets: the arithmetic, the columns, the scope instant, and the finder");

  // ── helpers (the placeholder guard is copied from the lanes file, which does not export it) ──────
  /** ⛔ The guard that keeps the ruling-120 placeholder out of every arithmetic comparison. */
  const stakeOracle = (row: Any, expected: number, what: string): void => {
    if (!row) { ok(what, false, "no row"); return; }
    if (!["PENDING", "CLAIMED", "PLACED"].includes(row.status)) {
      ok(what, false, `refused to compare: ${row.id} is ${row.status} — stakeTzs there is the ruling-120 placeholder, not an intended stake`);
      return;
    }
    ok(what, row.stakeTzs === expected, j({ got: row.stakeTzs, expected, status: row.status }));
  };
  /** A FILL's `triggerPositionId` is null and its anchor is the MARKET, so the row is found by kind + market. */
  const fillRows = async (): Promise<Any[]> => {
    const page = await S.houseBotIntentStore.listFeed({ houseBotId: bot.botId, kinds: ["FILL"], limit: 50 });
    return (page?.rows ?? page ?? []) as Any[];
  };
  const fillRowOn = async (marketId: string): Promise<Any | null> => {
    const hit = (await fillRows()).find((r: Any) => r.marketId === marketId);
    return hit ? await S.houseBotIntentStore.get(hit.id) : null;
  };
  const housePositionsOn = async (marketId: string): Promise<Any[]> =>
    (await w.positionsOf(marketId)).filter((p: Any) => p.houseBotId != null);
  const ms = (s: unknown): number => (typeof s === "string" ? Date.parse(s) : NaN);
  /** ⛔ A guarded verdict does not guard its own eagerly-evaluated detail: a NaN instant prints as words, not a throw. */
  const stamp = (t: number): string => (Number.isFinite(t) ? new Date(t).toISOString() : "— never —");
  /** Planner passes whose `fillOpener` duty ran ok, with a pass instant strictly inside (fromMs, toMs). */
  const fillPassesBetween = (fromMs: number, toMs: number): Any[] =>
    passes.planner.filter((p: Any) => { const t = ms(p?.passNowIso); return t > fromMs && t < toMs && p?.duties?.fillOpener === "ok"; });
  /** The pass whose instant equals a row's `dueAt` — only a row due the moment it was planned has one. */
  const passAt = (iso: unknown): Any | null => passes.planner.find((p: Any) => Number.isFinite(ms(iso)) && ms(p?.passNowIso) === ms(iso)) ?? null;
  /** The last pass that started at or before a row was created: the pass that wrote it. */
  const planningPassOf = (row: Any): Any | null => {
    if (!row) return null;
    const before = passes.planner.filter((p: Any) => ms(p?.passNowIso) <= ms(row.createdAt));
    return before.length ? before[before.length - 1] : null;
  };
  const filledIn = (p: Any): boolean => p?.duties?.fillOpener === "ok" && (p?.counts?.filled ?? 0) >= 1;
  /** ⛔ THE ROW LANDS MID-PASS, AND THE DRIVE APPENDS THE PASS STRUCTURE ONLY WHEN THE PASS ENDS. Measured on the
      second run, under load: the row was read 38 ms after its own dueAt, before its pass had been pushed, and
      "no pass with that instant" took three cases down. The engine's `plannerBusy` is cleared in the pass's
      `finally`, after the push, so waiting for it to drop is waiting for the structure to exist. With the engine
      off it is already false and nothing waits. */
  const passSettled = (what: string): Promise<Any> => until(what, 20_000, async () => (ENG.engineState().plannerBusy ? null : true));
  const waitFired = (id: string, what: string, msMax: number): Promise<Any> =>
    until(what, msMax, async () => { const r = await S.houseBotIntentStore.get(id); return r && r.status !== "PENDING" && r.status !== "CLAIMED" ? r : null; });
  /** A bettor of a given role (the drive's `stake` only mints PLAYER accounts), and a stake by them. */
  const bettor = async (role?: string): Promise<string> => w.user({ balance: FLEET.playerBalance, ...(role ? { role } : {}) });
  const put = async (userId: string, marketId: string, side: string, amount: number, ageMs = 0): Promise<Any> => {
    const r = await w.svc.buyPosition(userId, { marketId, side, stake: amount, idempotencyKey: crypto.randomUUID() });
    if (!r.ok) throw new Error(`lane D fixture stake refused: ${j(r)}`);
    if (ageMs > 0) await w.backdate(r.data.positionId, ageMs);
    return { userId, positionId: r.data.positionId };
  };
  const placedAtOf = (all: Any[], id: unknown): number => { const p = all.find((x: Any) => x.id === id); return p?.placedAt ? ms(p.placedAt) : NaN; };
  const out: Any = { lane: "D", placed: [] };

  // ── stage 0 · the scope instants, read back off the runtime rows the switch and the start wrote ──
  const globalRt = await S.houseBotRuntimeStore.get(C.RUNTIME_KEY.global);
  const botRt = await S.houseBotRuntimeStore.get(C.RUNTIME_KEY.bot(bot.botId));
  const scopeFromMs = Math.max(ms(globalRt?.scopeFrom), ms(botRt?.scopeFrom));

  /* ═══ D1-SCOPE is created FIRST: its cutoff sorts before D1-FILL's, so the pass that plans D1-FILL has already
     scanned it and refused it in the same breath — that ordering is the witness. ═══ */
  let marketN: Any = null;
  const tN = Date.now();
  if (Number.isFinite(scopeFromMs)) {
    const closeInMs = LEAD_MS + (scopeFromMs - Date.now()) - N.beforeScopeMs;
    marketN = await w.poll({ graceMin: 0, category: bot.category, closeInMs, title: "Fleet D1-SCOPE" });
    await put(await bettor(), marketN.id, "NO", N.seedNo, 10_000);
  }

  /* ═══ D1-FILL · the pure arithmetic ═══════════════════════════════════════════════════════════════ */
  /* ⚠️ The holder's balance is taken BEFORE the market exists — reading it after the row appears is a race the
     poller can win. */
  const beforeA = (await w.bal(bot.userId)).balance as number;
  const tA = Date.now();
  const marketA = await w.poll({ graceMin: 0, category: bot.category, closeInMs: A.closeInMs, title: "Fleet D1-FILL" });
  /* Aged past its exit close (graceMin 0 → exitAt = placedAt, locked 7 s later), from a fresh PLAYER — never the
     holder, whose own stake would hold the market (OWNER_POSITION). Nothing goes on YES before the plan. */
  await put(await bettor(), marketA.id, "NO", A.seedNo, 10_000);

  const decidedA = await until("D1-FILL · the planner writing a FILL row on the market", 60_000, () => fillRowOn(marketA.id));
  if (decidedA) await passSettled("D1-FILL · the planning pass handing its structure back");
  const passA = passAt(decidedA?.dueAt);

  ok("D1-FILL · the planner decided: a PENDING FILL on the thin side YES, anchored on the MARKET, with no trigger, no target and no reason code",
    decidedA?.kind === "FILL" && decidedA?.side === A.side && decidedA?.status === "PENDING" && decidedA?.anchorKey === marketA.id
      && decidedA?.triggerPositionId == null && decidedA?.triggerUserId == null && decidedA?.targetId == null && decidedA?.reasonCode == null,
    j({ kind: decidedA?.kind, side: decidedA?.side, status: decidedA?.status, code: decidedA?.reasonCode, anchor: decidedA?.anchorKey === marketA.id }));
  stakeOracle(decidedA, A.decide, `D1-FILL · …and it is EXACTLY the stake the rules say (${A.decide}) — floor(50,000 × 40/60) = 33,333 floored to the 1,000 step`);
  ok(`D1-FILL · …and the durable wantedTzs is EXACTLY ${A.wanted} — the pre-step figure only floor(locked NO × 40/60) − raw YES produces (p/100 gives 20,000; one rounding to the step gives 33,000)`,
    decidedA?.decision?.wantedTzs === A.wanted, j({ wanted: decidedA?.decision?.wantedTzs, expected: A.wanted }));
  ok("D1-FILL · …and the decision records the aggregate it sized on: raw YES 0 · raw NO 50,000 · locked YES 0 · locked NO 50,000 · share 40% · lock margin 7,000 · AUTO · category tech",
    decidedA?.decision?.rawYes === 0 && decidedA?.decision?.rawNo === A.seedNo && decidedA?.decision?.lockedYes === 0 && decidedA?.decision?.lockedNo === A.seedNo
      && decidedA?.decision?.targetSharePct === 40 && decidedA?.decision?.lockMarginMs === LOCK_MARGIN_MS && decidedA?.decision?.entry === "AUTO"
      && decidedA?.decision?.snapshot?.category === bot.category,
    j({ rawYes: decidedA?.decision?.rawYes, rawNo: decidedA?.decision?.rawNo, lockedYes: decidedA?.decision?.lockedYes, lockedNo: decidedA?.decision?.lockedNo,
      p: decidedA?.decision?.targetSharePct, margin: decidedA?.decision?.lockMarginMs, entry: decidedA?.decision?.entry, category: decidedA?.decision?.snapshot?.category }));
  /* ⭐ The durable row and the in-memory pass structure name the SAME instant: a row due the moment it was planned
     carries the pass's own `passNow` as its dueAt (max(cutoff − lead, passNow) with cutoff − lead already past). */
  ok("D1-FILL · dueAt IS the planning pass's own instant (cutoff − lead was already past) — and that pass ran fillOpener ok and counted ≥ 1 fill",
    !!passA && filledIn(passA), j({ dueAt: decidedA?.dueAt, pass: passA?.passNowIso ?? "— no pass with that instant —", duty: passA?.duties?.fillOpener, filled: passA?.counts?.filled }));
  ok("D1-FILL · deadlineAt = cutoff − 300 s and staleAt = dueAt + 600 s, exactly, off the row's own snapshot",
    ms(decidedA?.deadlineAt) === ms(decidedA?.decision?.snapshot?.cutoff) - MIN_TIME_TO_CUTOFF_MS && ms(decidedA?.staleAt) === ms(decidedA?.dueAt) + STALE_MS,
    j({ deadline: decidedA?.deadlineAt, cutoff: decidedA?.decision?.snapshot?.cutoff, stale: decidedA?.staleAt, due: decidedA?.dueAt }));

  const firedA = decidedA?.status === "PENDING" ? await waitFired(decidedA.id, "D1-FILL · the poller firing it", 60_000) : null;
  ok("D1-FILL · the poller fired it to PLACED, with a position id",
    firedA?.status === "PLACED" && !!firedA?.positionId, j({ status: firedA?.status, code: firedA?.reasonCode }));
  const houseA = (await housePositionsOn(marketA.id)).filter((p: Any) => p.houseBotId === bot.botId);
  const stakedA = houseA[0]?.stake;
  ok(`D1-FILL · exactly ONE marked position on this market, on YES, of exactly ${A.fire} — the number the rules decided is the number that was staked`,
    houseA.length === 1 && houseA[0]?.side === A.side && stakedA === A.fire && houseA[0]?.id === firedA?.positionId,
    j({ n: houseA.length, side: houseA[0]?.side, stake: stakedA, expected: A.fire }));
  /* ⛔ `undefined === undefined` is not agreement: the absence of a write-back is only evidence on a PLACED row. */
  ok(`D1-FILL · fire wrote NOTHING back: the PLACED row still says ${A.decide} and carries no firedStakeTzs (the cut, locked NO 50,000 − raw YES 0, did not bind)`,
    firedA?.status === "PLACED" && firedA?.stakeTzs === A.decide && firedA?.decision != null && !("firedStakeTzs" in firedA.decision),
    j({ status: firedA?.status, row: firedA?.stakeTzs, fired: firedA?.decision?.firedStakeTzs ?? "absent" }));
  const afterA = (await w.bal(bot.userId)).balance as number;
  ok("D1-FILL · …and the holder's wallet fell by exactly that, to the shilling",
    typeof stakedA === "number" && beforeA - afterA === stakedA, j({ before: beforeA, after: afterA, delta: beforeA - afterA, staked: stakedA }));
  const txnsA = await w.txnsFor(houseA[0]?.id);
  ok("D1-FILL · …and every money row it wrote carries the marker (D20: an unmarked row on a marked stake reads as a missing player row)",
    txnsA.length > 0 && txnsA.every((t: Any) => t.houseBotId === bot.botId), j({ n: txnsA.length }));
  /* The measured instants, for the timing-margin report (not an assertion; the drive prints details only on FAIL). */
  console.log(`   · D1-FILL timing ${j({ marketCreated: stamp(tA), rowCreated: decidedA?.createdAt ?? null, due: decidedA?.dueAt ?? null, bet: houseA[0]?.placedAt ?? null,
    createToRowS: Number.isFinite(ms(decidedA?.createdAt)) ? (ms(decidedA?.createdAt) - tA) / 1000 : null, dueToBetS: Number.isFinite(ms(houseA[0]?.placedAt)) ? (ms(houseA[0]?.placedAt) - ms(decidedA?.dueAt)) / 1000 : null })}`);
  if (firedA?.status === "PLACED" && houseA.length === 1) {
    out.placed.push({ key: "D1-FILL", stake: stakedA, side: houseA[0].side, market: marketA.id, botId: bot.botId, holder: bot.userId });
  }

  /* ═══ D1-SCOPE · the absence, witnessed by the pass that planned D1-FILL ═════════════════════════════ */
  const rowN = marketN ? await fillRowOn(marketN.id) : null;
  const storedN = marketN ? await w.mdal.marketStore.get(marketN.id) : null;
  const cutoffN = ms(storedN?.selectionClosedAt);
  const passNowA = ms(passA?.passNowIso);
  /* The pass's scan window, as `plannableMarkets` bounds it: (passNow + 10 s, passNow + lead + 15 s]. */
  const inWindowAtA = Number.isFinite(passNowA) && cutoffN > passNowA + SCAN_AHEAD_MS && cutoffN <= passNowA + LEAD_MS + SCAN_SLACK_MS;
  /* While the run is this young the deadline (cutoff − 5 min) is still ahead of the pass, so the scope check is the only refuser. */
  const youngRunAtA = Number.isFinite(passNowA) && passNowA - scopeFromMs < 20 * 60_000;
  const fillInstantBeforeScope = cutoffN - LEAD_MS < scopeFromMs;
  ok("D1-SCOPE · a market whose fill instant (cutoff − lead) precedes switch-on got NO FILL row — WITNESSED: the pass that planned D1-FILL had this market inside its scan window (it sorts first by cutoff), ran fillOpener ok, and wrote nothing for it; the run was young enough that neither the window nor the deadline was the refuser",
    rowN == null && !!passA && filledIn(passA) && inWindowAtA && youngRunAtA && fillInstantBeforeScope,
    j({ row: rowN ? `${rowN.status}/${rowN.reasonCode}` : "none", pass: passA?.passNowIso ?? "— none —", inWindow: inWindowAtA, youngRun: youngRunAtA,
      fillInstant: stamp(cutoffN - LEAD_MS), scopeFrom: stamp(scopeFromMs) }));
  const houseN = marketN ? await housePositionsOn(marketN.id) : [];
  ok("D1-SCOPE · …and nothing was placed on it — its refusal witnessed by that same pass, so the empty market is evidence",
    !!passA && filledIn(passA) && marketN != null && houseN.length === 0, j({ placed: houseN.length, witnessed: !!passA && filledIn(passA) }));

  /* ═══ D1-COLUMNS · raw ≠ locked on both sides, then the fire-time cut ═══════════════════════════════ */
  /* ⛔ THE MARKET IS CREATED THE MOMENT A PLANNER PASS ENDS, so that the passes land at ≈ +15, +30, +45 s after
     it. Closing in lead + 55 s, it is outside the scan window (cutoff ≤ passNow + lead + 15 s) at +15 and +30, and
     inside at +45 — planned there with dueAt = cutoff − lead = +55 s, which leaves ≈ 10 s to put the late YES on
     the book between the durable decision and the fire. The premises below read the real instants back rather
     than trust this arithmetic. */
  const n0 = passes.planner.length;
  let boundary: Any = null;
  for (const t0 = Date.now(); Date.now() - t0 < 20_000;) {
    if (passes.planner.length > n0) { boundary = passes.planner[passes.planner.length - 1]; break; }
    await sleep(100);
  }
  if (!boundary) console.log("   … D1-COLUMNS: no planner pass ended within 20 s — the market is created anyway; the timing premises below will say what that cost");
  const tB = Date.now();
  const marketB = await w.poll({ graceMin: 0, category: bot.category, closeInMs: B.closeInMs, title: "Fleet D1-COLUMNS" });
  const beforeB = (await w.bal(bot.userId)).balance as number;
  await put(await bettor(), marketB.id, "NO", B.seedNo, 10_000);
  /* ⛔ AGENT is a non-PLAYER role: `lockedForHouse` counts its money in raw, nonHouse and lockedA15, and NOT in
     locked. That is what separates the columns on both sides, at both the plan and the fire. */
  await put(await bettor("AGENT"), marketB.id, "NO", B.excludedNo, 10_000);
  await put(await bettor("AGENT"), marketB.id, "YES", B.excludedYes, 10_000);
  const latePlayer = await bettor();

  /* A tight poll, because the late YES must land inside the window between the durable row and the claim. */
  let decidedB: Any = null;
  for (const t0 = Date.now(); Date.now() - t0 < 75_000;) {
    decidedB = await fillRowOn(marketB.id);
    if (decidedB) break;
    await sleep(250);
  }
  if (!decidedB) console.log("   … D1-COLUMNS: no FILL row after 75 s");
  /* The late YES goes on FIRST — the window is the thing — and only then does the harness wait for the pass. */
  const lateYes = decidedB ? await put(latePlayer, marketB.id, "YES", B.lateYes, 0) : null;
  if (decidedB) await passSettled("D1-COLUMNS · the planning pass handing its structure back");

  ok("D1-COLUMNS · the planner decided: a PENDING FILL on YES — thin by the RAW share (8,000 of 108,000 = 7.4%), against the players' LOCKED NO",
    decidedB?.kind === "FILL" && decidedB?.side === B.side && decidedB?.status === "PENDING" && decidedB?.reasonCode == null,
    j({ kind: decidedB?.kind, side: decidedB?.side, status: decidedB?.status, code: decidedB?.reasonCode }));
  stakeOracle(decidedB, B.decide, `D1-COLUMNS · …and it is EXACTLY ${B.decide} — 38,666 floored to the step`);
  ok(`D1-COLUMNS · …and wantedTzs is EXACTLY ${B.wanted} = floor(locked NO 70,000 × 40/60) − raw YES 8,000 — raw/nonHouse/lockedA15 NO (100,000) there gives 58,666; locked YES (0) for the subtrahend gives 46,666`,
    decidedB?.decision?.wantedTzs === B.wanted, j({ wanted: decidedB?.decision?.wantedTzs, expected: B.wanted }));
  ok("D1-COLUMNS · …and the decision records the aggregate: raw YES 8,000 · raw NO 100,000 · locked YES 0 · locked NO 70,000 — the ineligible money is in raw and not in locked, on BOTH sides",
    decidedB?.decision?.rawYes === B.rawYes && decidedB?.decision?.rawNo === B.rawNo && decidedB?.decision?.lockedYes === B.lockedYes && decidedB?.decision?.lockedNo === B.lockedNo,
    j({ rawYes: decidedB?.decision?.rawYes, rawNo: decidedB?.decision?.rawNo, lockedYes: decidedB?.decision?.lockedYes, lockedNo: decidedB?.decision?.lockedNo }));
  const cutoffB = ms(decidedB?.decision?.snapshot?.cutoff);
  ok("D1-COLUMNS · dueAt = cutoff − lead EXACTLY — the row was planned BEFORE its fill instant and made to wait for it (a row due at the pass would carry the pass's instant instead)",
    Number.isFinite(cutoffB) && ms(decidedB?.dueAt) === cutoffB - LEAD_MS,
    j({ due: decidedB?.dueAt, cutoff: decidedB?.decision?.snapshot?.cutoff, lead: `${LEAD_MIN} min`, pass: planningPassOf(decidedB)?.passNowIso ?? "— none —" }));
  /* The scan window's upper edge is the MAX lead + jitter over every fill-enabled ACTIVE desk, plus the planner's
     cadence (planner.ts). With only this desk that is 30 min + 15 s; another lane's wider desk would widen it for
     everyone, so the edge is read off the fleet's own saved rules and printed. */
  const fillDesks = (await S.houseBotStore.listNonRemoved()).filter((b: Any) => b.status === "ACTIVE" && b.rules?.scope?.products?.polls && b.rules?.modes?.polls?.fill);
  const windowMs = Math.max(LEAD_MS, ...fillDesks.map((b: Any) => (Number(b.rules?.fill?.leadPollsMin) * 60 + Number(b.rules?.fill?.jitterSec ?? 0)) * 1000)) + SCAN_SLACK_MS;
  /* The planning pass is the last one that started at or before the row; the passes BEFORE it are the ones that
     looked at the market and planned nothing. */
  const planningB = planningPassOf(decidedB);
  const between = fillPassesBetween(tB, ms(decidedB?.createdAt)).filter((p: Any) => p !== planningB);
  ok(`D1-COLUMNS · the planner did NOT see the market before it entered the scan window (cutoff − ${Math.round(windowMs / 1000)} s over ${fillDesks.length} fill desk(s)): the row was created after that edge by a pass that counted ≥ 1 fill, and the earlier fillOpener pass(es) since the market's creation looked and planned nothing`,
    decidedB != null && ms(decidedB.createdAt) >= cutoffB - windowMs - 2_000 && filledIn(planningB) && between.length >= 1,
    j({ created: decidedB?.createdAt, edge: stamp(cutoffB - windowMs), planningPass: planningB?.passNowIso ?? "— none —", filled: planningB?.counts?.filled, passesBefore: between.length, marketCreated: stamp(tB) }));

  const firedB = decidedB?.status === "PENDING" ? await waitFired(decidedB.id, "D1-COLUMNS · the poller firing it", 60_000) : null;
  ok("D1-COLUMNS · the poller fired it to PLACED, with a position id",
    firedB?.status === "PLACED" && !!firedB?.positionId, j({ status: firedB?.status, code: firedB?.reasonCode }));
  const allB = marketB ? await w.positionsOf(marketB.id) : [];
  const houseB = allB.filter((p: Any) => p.houseBotId === bot.botId);
  const stakedB = houseB[0]?.stake;
  ok(`D1-COLUMNS · exactly ONE marked position, on YES, of EXACTLY ${B.fire} — cut at fire on locked NO 70,000 − raw YES 44,500 = 25,500, floored; lockedA15 or nonHouse (100,000) there would have left it at 38,000`,
    houseB.length === 1 && houseB[0]?.side === B.side && stakedB === B.fire, j({ n: houseB.length, side: houseB[0]?.side, stake: stakedB, expected: B.fire }));
  /* ⭐ MON-02 · the smaller figure is written back, so the officer's record is the bet that was placed. */
  ok(`D1-COLUMNS · MON-02: the row was clamped from the ${B.decide} it decided to the ${B.fire} it staked, and records firedStakeTzs ${B.fire}`,
    decidedB?.stakeTzs === B.decide && firedB?.status === "PLACED" && firedB?.stakeTzs === B.fire && firedB?.decision?.firedStakeTzs === B.fire,
    j({ decided: decidedB?.stakeTzs, row: firedB?.stakeTzs, fired: firedB?.decision?.firedStakeTzs }));
  /* ⛔ THE PREMISE, read back off durable rows rather than assumed: the late YES landed AFTER the decision was
     durable (else the plan would have sized on 44,500 and the literal above would be wrong for the wrong reason)
     and BEFORE the bet (else the cut never saw it). */
  const lateAt = placedAtOf(allB, lateYes?.positionId);
  const betAt = placedAtOf(allB, houseB[0]?.id);
  const decidedAt = ms(decidedB?.createdAt);
  ok("D1-COLUMNS · PREMISE · the late YES landed after the decision was durable and before the bet — so the plan sized on 8,000 and the fire on 44,500",
    Number.isFinite(lateAt) && Number.isFinite(betAt) && Number.isFinite(decidedAt) && decidedAt < lateAt && lateAt < betAt,
    j({ decided: stamp(decidedAt), late: stamp(lateAt), bet: stamp(betAt) }));
  const afterB = (await w.bal(bot.userId)).balance as number;
  ok("D1-COLUMNS · …and the holder's wallet fell by exactly the CUT stake, to the shilling",
    typeof stakedB === "number" && beforeB - afterB === stakedB, j({ before: beforeB, after: afterB, delta: beforeB - afterB, staked: stakedB }));
  const txnsB = await w.txnsFor(houseB[0]?.id);
  ok("D1-COLUMNS · …and every money row it wrote carries the marker",
    txnsB.length > 0 && txnsB.every((t: Any) => t.houseBotId === bot.botId), j({ n: txnsB.length }));
  /* The measured instants, for the timing-margin report (not an assertion). `rowToDueS` is the window the late YES
     had to land in; `lateToBetS` is how much of it was left when the bet was placed. */
  console.log(`   · D1-COLUMNS timing ${j({ boundaryPass: boundary?.passNowIso ?? null, marketCreated: stamp(tB), rowCreated: decidedB?.createdAt ?? null, due: decidedB?.dueAt ?? null,
    late: stamp(lateAt), bet: stamp(betAt), createToRowS: Number.isFinite(decidedAt) ? (decidedAt - tB) / 1000 : null,
    rowToDueS: Number.isFinite(decidedAt) && Number.isFinite(ms(decidedB?.dueAt)) ? (ms(decidedB?.dueAt) - decidedAt) / 1000 : null,
    rowToLateS: Number.isFinite(lateAt) && Number.isFinite(decidedAt) ? (lateAt - decidedAt) / 1000 : null,
    lateToBetS: Number.isFinite(lateAt) && Number.isFinite(betAt) ? (betAt - lateAt) / 1000 : null, planningPass: planningB?.passNowIso ?? null, passesBefore: between.length })}`);
  if (firedB?.status === "PLACED" && houseB.length === 1) {
    out.placed.push({ key: "D1-COLUMNS", stake: stakedB, side: houseB[0].side, market: marketB.id, botId: bot.botId, holder: bot.userId });
  }

  /* ═══ D1-FINDER · the thin-side finder, by a fixture a wrong finder refuses ═════════════════════════ */
  const beforeF = (await w.bal(bot.userId)).balance as number;
  const tF = Date.now();
  const marketF = await w.poll({ graceMin: 0, category: bot.category, closeInMs: F.closeInMs, title: "Fleet D1-FINDER" });
  /* ⛔ In THIS order — see the derivation: every prefix of it leaves the finder nothing to plan. */
  await put(await bettor("AGENT"), marketF.id, "YES", F.agentYes, 10_000);
  await put(await bettor("AGENT"), marketF.id, "NO", F.agentNo, 10_000);
  await put(await bettor(), marketF.id, "NO", F.playerNo, 10_000);
  await put(await bettor(), marketF.id, "YES", F.playerYes, 10_000);

  const decidedF = await until("D1-FINDER · the planner writing a FILL row on the market", 60_000, () => fillRowOn(marketF.id));
  if (decidedF) await passSettled("D1-FINDER · the planning pass handing its structure back");
  const passF = passAt(decidedF?.dueAt);

  ok("D1-FINDER · the planner decided: a PENDING FILL on NO — YES was rejected on its RAW share (130,000 of 160,000 = 81%); a finder reading YES's own pool off the LOCKED column (60,000 = 37.5%) picks YES first, sizes it below zero and writes NOTHING, as does one reading the total off the locked column",
    decidedF?.kind === "FILL" && decidedF?.side === F.side && decidedF?.status === "PENDING" && decidedF?.anchorKey === marketF.id && decidedF?.reasonCode == null,
    j({ row: decidedF ? "present" : "NONE", kind: decidedF?.kind, side: decidedF?.side, status: decidedF?.status, code: decidedF?.reasonCode }));
  stakeOracle(decidedF, F.decide, `D1-FINDER · …and it is EXACTLY ${F.decide} — a wanted of 56,666 / 30,000 / 40,000 (the wrong columns, see the derivation) is capped by room (60,000 − 30,000) and reads 30,000 here`);
  ok(`D1-FINDER · …and wantedTzs is EXACTLY ${F.wanted} = floor(locked YES 60,000 × 40/60) − raw NO 30,000 — raw YES (130,000) there gives 56,666; locked NO (10,000) for the subtrahend gives 30,000; no subtrahend gives 40,000`,
    decidedF?.decision?.wantedTzs === F.wanted, j({ wanted: decidedF?.decision?.wantedTzs, expected: F.wanted }));
  ok("D1-FINDER · …and the decision records the aggregate: raw YES 130,000 · raw NO 30,000 · locked YES 60,000 · locked NO 10,000 — ineligible money on BOTH sides, in raw and not in locked",
    decidedF?.decision?.rawYes === F.rawYes && decidedF?.decision?.rawNo === F.rawNo && decidedF?.decision?.lockedYes === F.lockedYes && decidedF?.decision?.lockedNo === F.lockedNo,
    j({ rawYes: decidedF?.decision?.rawYes, rawNo: decidedF?.decision?.rawNo, lockedYes: decidedF?.decision?.lockedYes, lockedNo: decidedF?.decision?.lockedNo }));
  ok("D1-FINDER · dueAt IS the planning pass's own instant — and that pass ran fillOpener ok and counted ≥ 1 fill",
    !!passF && filledIn(passF), j({ dueAt: decidedF?.dueAt, pass: passF?.passNowIso ?? "— no pass with that instant —", duty: passF?.duties?.fillOpener, filled: passF?.counts?.filled }));

  const firedF = decidedF?.status === "PENDING" ? await waitFired(decidedF.id, "D1-FINDER · the poller firing it", 60_000) : null;
  ok("D1-FINDER · the poller fired it to PLACED, with a position id",
    firedF?.status === "PLACED" && !!firedF?.positionId, j({ status: firedF?.status, code: firedF?.reasonCode }));
  const houseF = (await housePositionsOn(marketF.id)).filter((p: Any) => p.houseBotId === bot.botId);
  const stakedF = houseF[0]?.stake;
  ok(`D1-FINDER · exactly ONE marked position on this market, on NO, of exactly ${F.fire} — the cut at fire (locked YES 60,000 − raw NO 30,000 = 30,000) did not bind; a wrong row of 30,000 passes it untouched and would read 30,000 here, never 10,000`,
    houseF.length === 1 && houseF[0]?.side === F.side && stakedF === F.fire && houseF[0]?.id === firedF?.positionId,
    j({ n: houseF.length, side: houseF[0]?.side, stake: stakedF, expected: F.fire }));
  ok(`D1-FINDER · fire wrote NOTHING back: the PLACED row still says ${F.decide} and carries no firedStakeTzs`,
    firedF?.status === "PLACED" && firedF?.stakeTzs === F.decide && firedF?.decision != null && !("firedStakeTzs" in firedF.decision),
    j({ status: firedF?.status, row: firedF?.stakeTzs, fired: firedF?.decision?.firedStakeTzs ?? "absent" }));
  const afterF = (await w.bal(bot.userId)).balance as number;
  ok("D1-FINDER · …and the holder's wallet fell by exactly that, to the shilling",
    typeof stakedF === "number" && beforeF - afterF === stakedF, j({ before: beforeF, after: afterF, delta: beforeF - afterF, staked: stakedF }));
  const txnsF = await w.txnsFor(houseF[0]?.id);
  ok("D1-FINDER · …and every money row it wrote carries the marker",
    txnsF.length > 0 && txnsF.every((t: Any) => t.houseBotId === bot.botId), j({ n: txnsF.length }));
  console.log(`   · D1-FINDER timing ${j({ marketCreated: stamp(tF), rowCreated: decidedF?.createdAt ?? null, due: decidedF?.dueAt ?? null, bet: houseF[0]?.placedAt ?? null,
    createToRowS: Number.isFinite(ms(decidedF?.createdAt)) ? (ms(decidedF?.createdAt) - tF) / 1000 : null })}`);
  if (firedF?.status === "PLACED" && houseF.length === 1) {
    out.placed.push({ key: "D1-FINDER", stake: stakedF, side: houseF[0].side, market: marketF.id, botId: bot.botId, holder: bot.userId });
  }

  /* ═══ the lane as a whole ═══════════════════════════════════════════════════════════════════════════ */
  const rowN2 = marketN ? await fillRowOn(marketN.id) : null;
  const laterPasses = fillPassesBetween(tN, Date.now());
  ok(`D1-SCOPE · after the whole lane (${laterPasses.length} fillOpener passes since it was created) there is STILL no row on the scope market — every pass looked and refused`,
    marketN != null && rowN2 == null && laterPasses.length >= 3, j({ passes: laterPasses.length, row: rowN2 ? `${rowN2.status}/${rowN2.reasonCode}` : "none" }));
  const placedAlerts = calls.filter((c: Any) => c.fn === "placed" && c.botId === bot.botId).length;
  ok("D · the notification chain saw EXACTLY three placements for this account — one per filled market, none for the scope market",
    placedAlerts === 3 && houseA.length === 1 && houseB.length === 1 && houseF.length === 1 && houseN.length === 0,
    j({ placedAlerts, a: houseA.length, b: houseB.length, f: houseF.length, n: houseN.length }));

  return out;
}
