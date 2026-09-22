/**
 * LANE F · orderBots FAIRNESS and marketHeld CONTENTION — one lane module of the fleet drive.
 *
 * ⛔ THIS FILE IMPORTS NOTHING FROM `src/` — its `expect` literals are the oracle (see the roster's header).
 * `run` receives everything it touches through `env`.
 *
 * ── WHAT THE PRODUCT DOES (read from source, verified line by line before this was written) ──────────────
 * `orderBots` (decide.ts:163-167) is a pure sort recomputed from database facts once per pass: share =
 * openExposure / capOpenExposureTzs ascending (a null or zero cap → +∞, last), then lastPlacedAt ascending
 * (null → −∞, first), then botId. `openExposure` is `houseBookStore.openExposure(null)` — the sum of each desk's
 * OPEN marked positions (dal:4277); `lastPlacedAt` is `placedTimes({withinSec: 86_400})[0]`, newest first
 * (dal:4345). Both are read ONCE per pass into `PassFacts.bots` (trigger.ts:122-134), so the order is FROZEN
 * for a whole pass. The untargeted COUNTER walks the desks in that order (decide.ts:350-352): the first desk
 * with no code RETURNS its PENDING row and the loop ends — a losing desk writes NOTHING; every refuser does
 * `firstCode ??= { bot, code }` (:386), and only when ALL refuse is ONE SKIPPED row written, naming
 * `firstCode.bot` (:411-419). `marketHeld` (enter-now.ts:183-210) is read LAZILY, only for a desk the pure
 * decision already named on a non-SKIPPED row (trigger.ts:249-281 `decideWithFlags`, :283-294 `loadFlags`),
 * in the order OWNER_POSITION (the holder's own unmarked OPEN stake) → OTHER_BOT (another desk's live intent,
 * ACTIVE target or OPEN marked position) → OWN_INTENT → PER_MARKET_COUNT; `loadFlags` collapses every one
 * of those to a bare `marketHeld: true`. MARKET_HELD is the EIGHTH guard (decide.ts:368), AFTER
 * TRIGGER_STAKE_RANGE (:364) — so two desks with disjoint bands never reach it, and this lane's two desks
 * share ONE band on purpose.
 *
 * ── WHAT IS A LITERAL HERE, AND WHAT IS NOT ────────────────────────────────────────────────────────────────
 * ⛔ THE COIN FLIP. Two fresh desks both have share 0 and lastPlacedAt null, so `orderBots` falls through to
 * botId — and `newHouseId` is a prefix plus `randomId(12)` (dal:397). "Which desk is PROBED first on the first
 * trigger" is therefore NOT a literal on a fresh fleet. Phase 0 makes the OUTCOME a literal with a durable
 * product fact — F1's holder stakes their own unmarked 5,000 on M0, so F1 is OWNER_POSITION-held there
 * (enter-now.ts:194) and F2 reacts whichever desk the id order put first — but it cannot say whether clause (a)
 * was ever EVALUATED: if F2's id sorts first, F2 is named at once and F1's flags are never loaded. So the run
 * PRINTS the id order beside P0, and clause (a) is MEASURED at P0b, where the order is no longer random: after
 * P0 F1 sits at share 0 and F2 at 40,000/5,000,000, so F1 is named FIRST on every run and its flags are the
 * first ones loaded. From P0 on every order is derived from caps and stakes this file chose:
 *
 *   caps   F1 capOpenExposureTzs 1,000,000 · F2 5,000,000        (DIFFERENT caps, same FIXED 40,000 stake)
 *   share  = openExposure / cap ; the same 40,000 is 0.04 of F1's cap and 0.008 of F2's
 *
 *   P0   M0   share 0 = 0, lastPlacedAt null = null → botId (RANDOM, printed); F1 is OWNER_POSITION-held on M0
 *             either way                       → F2 places 40,000   F1 0/1M = 0         F2 40,000/5M = 0.008
 *   P0b  M0b  F1 (0) < F2 (0.008) STRICTLY → F1 is named first and its flags are loaded: OWNER_POSITION (its
 *             holder's own OPEN NO on M0b) and NOTHING ELSE holds it (no live intent, no other desk's position,
 *             countOnMarket 0 of 6 — each read before the trigger) → refused MARKET_HELD → F2 places 40,000
 *             ⭐ THE CLAUSE-(a) MEASUREMENT: with enter-now.ts:194 gone F1 reacts here on EVERY run
 *                                                                                        F2 80,000/5M = 0.016
 *   P1   M1   F1 (0) < F2 (0.016)             → F1 places 40,000   F1 40,000/1M = 0.04
 *   P2   M2   F2 (0.016) < F1 (0.04)          → 2a: F2 PENDING; 2b one second later on the SAME market, while
 *             2a is still live → F2 is OWN_INTENT-held, F1 OTHER_BOT-held (2a is another desk's live intent) →
 *             ONE SKIPPED row on 2b's anchor naming the FIRST desk in the frozen order: F2, the WINNER of 2a,
 *             reasonCode MARKET_HELD. Then 2a fires:                F2 120,000/5M = 0.024, lastPlacedAt NEWER
 *   P3   M3   F2 (0.024) < F1 (0.04) although F2 placed MORE RECENTLY → F2 (THE COMPARATOR CASE: a
 *             least-recent-first or round-robin engine names F1 here) → F2 160,000/5M = 0.032
 *   P4   M1   F2 (0.032) < F1 (0.04): F2 is OTHER_BOT-held by F1's OPEN position (marketUsage.otherBotOpen, read
 *             before the trigger) and F1 is NOT held by its own (countOnMarket 1 < freqMaxPerMarket 6, no live
 *             intent) → F1 counters AGAIN on M1 — two F1 positions, zero F2, no SKIPPED row → F1 80,000/1M = 0.08
 *             ⚠️ The probe ORDER is invisible in P4: a refused desk writes nothing, and a least-recent-first
 *             comparator (F1 placed longer ago) yields the same rows. P3 is what pins the comparator; P4 pins
 *             clause (b) refusing F2 and clause (d) NOT binding F1 at count 1.
 *
 * Every ordering assertion carries its PREMISE inside it: the exposures and last-placed instants are read
 * through the SAME DAL members the pass reads (`openExposure(null)`, `placedTimes`, `marketUsage`, `botUsage`,
 * `listLiveOnMarket`) immediately BEFORE the trigger, so the assertion is "given these read facts, the row
 * named this desk" and never "the row named this desk" alone. Nothing here is a distributional claim.
 *
 * ⛔ THE ONE PLACE THE IDENTITY IS NOT LANE F'S ALONE. Lane G shares this category (disjoint bands, by the
 * programme's allocation). When G's desks are designated in the same process they sit at share 0 during this
 * lane (G runs after F) and sort BEFORE F2, and they refuse 320,000 on their band — so the FIRST refuser on
 * 2b is a G desk with TRIGGER_STAKE_RANGE, not F2 with MARKET_HELD. The file reads which desks are in scope on
 * this category and asserts the literal that follows from the roster in THIS process; F2's own hold is
 * witnessed in both cases through `listLiveOnMarket`. A `--only F` run asserts F2 · MARKET_HELD. P0b is the
 * same in both: a G desk is refused on its band by the PURE decision and never has its flags loaded, so F1 is
 * still the first desk whose flags are read, and the row is F2's.
 *
 * ⛔ WHAT THE DURABLE ROW CANNOT SAY. `loadFlags` throws away WHICH hold fired, so a SKIPPED · MARKET_HELD row
 * does not distinguish OWN_INTENT from OTHER_BOT from OWNER_POSITION. Each cause is therefore read directly at
 * the moment it applies — the holder's OPEN unmarked stake (P0, P0b), 2a live on the market (P2b),
 * `otherBotOpen` (P4) — and never inferred from the code on the row.
 *
 * ⛔ TIMING THAT WOULD SWAP A SUB-CASE. The 2b hold exists only while 2a is PENDING/CLAIMED (until dueAt =
 * placedAt + 25 s, claimed ≥ 2 s later); 2b is decided within ~11 s of 2a. The lane asserts, off the rows, that
 * 2b's deciding pass (row.finishedAt) came BEFORE 2a's placement instant — otherwise 2b was the P4 case.
 *
 * ⛔ THE LANE IS SEQUENTIAL BY NATURE. Each phase's literal is a function of the exposure the previous phase
 * left behind, so the phases cannot run concurrently the way lanes A–C's desks do; the engine still decides
 * both desks in one pass on every trigger, and lanes A–E's concurrency claims are theirs.
 *
 * ⛔ NEVER COMPARE A SKIPPED ROW'S stakeTzs (ruling 120) — `stakeOracle` refuses; the placeholder is asserted
 * once, positively, as the placeholder, with its derivation beside the literal.
 *
 * ── NOT MEASURED, said here so nobody credits it ──────────────────────────────────────────────────────────
 *   · 2b's anchor "retired for ever" is asserted at the END of the lane (≥ 90 s and many sweeps after 2b, after
 *     the trigger has left the 90 s lookback): a re-read of a SKIPPED trigger needs BOTH the `NOT EXISTS` of
 *     `triggerPage` (dal:4503) and the COUNTER anchor conflict (dal:2500, a partial unique index) weakened; the
 *     SQL alone weakened re-decides the row and is refused by the index (ON CONFLICT DO NOTHING) — no position,
 *     no second row, nothing this lane can see. The index is a migration, not a code edit; not mutated here.
 *   · Which hold clause fired on 2b for F1 (OTHER_BOT) is inferred from the read cause (2a live for another
 *     desk) and not from the row; only F2's OWN_INTENT is what the SKIPPED row names.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
import type { FleetBot } from "./house-bot-fleet-roster.mts";

export const LANE = "F";

export const roster: readonly FleetBot[] = [
  /* ── Lane F · culture · two desks, ONE band, DIFFERENT exposure caps ───────────────────────────────── */
  {
    key: "F1-CAP1M", lane: "F", category: "culture", band: [300_000, 350_000],
    what: "COUNTER at a FIXED 40,000 under an open-exposure cap of 1,000,000 — the SMALL cap: the same stake is 5× the share",
    rules: { counter: true, amount: { kind: "FIXED", fixedTzs: 40_000 }, roundToTzs: 1_000, jitterPct: 0, delaySec: 25, reactPct: 100 },
    /* capPerMarketTzs and stakeMaxTzs are lowered with the exposure cap: the rules' cross-checks refuse a start
       when the per-market cap exceeds the exposure cap or the stake max exceeds the per-market cap. */
    caps: { capOpenExposureTzs: 1_000_000, capPerMarketTzs: 1_000_000, stakeMaxTzs: 1_000_000 },
  },
  {
    key: "F2-CAP5M", lane: "F", category: "culture", band: [300_000, 350_000],
    what: "the same desk under an open-exposure cap of 5,000,000 — the LARGE cap (5, not 4: four F2 placements must stay strictly below F1's one, 160,000/5M = 0.032 < 0.04)",
    rules: { counter: true, amount: { kind: "FIXED", fixedTzs: 40_000 }, roundToTzs: 1_000, jitterPct: 0, delaySec: 25, reactPct: 100 },
    caps: { capOpenExposureTzs: 5_000_000, capPerMarketTzs: 5_000_000, stakeMaxTzs: 1_000_000 },
  },
];

export const expect = {
  /**
   * Both desks: trigger NO 320,000 (inside [300,000–350,000]; outside every lane-G band), seed NO 5,000 (outside
   * every band in both lanes). Per placement:
   *   base   = 40,000 (FIXED — the trigger's 320,000 is irrelevant, which is the case)
   *   asked  = floorTo(40,000, 1,000)                                    = 40,000
   *   cut    = NO.nonHouse − YES.raw ≥ (5,000 + 320,000) − 40,000        ≥ 285,000  → asked survives
   *   stake  = floorTo(min(40,000, cut, stakeMax 1,000,000, bounds 1,000,000), 1,000) = 40,000 ≥ max(1,000, 1,000)
   *   fire   = floorTo(min(40,000, NO.lockedA15 − YES.raw ≥ 285,000, …), 1,000)      = 40,000 — no clamp
   *   due    = max(placedAt + 25 s, exitClose) = placedAt + 25 s (grace 0 → exitClose = placedAt); held = false
   */
  "F1-CAP1M": { cap: 1_000_000, trigger: 320_000, seed: 5_000, decide: 40_000, fire: 40_000, asked: 40_000, delaySec: 25, side: "YES", placements: 2 },
  "F2-CAP5M": { cap: 5_000_000, trigger: 320_000, seed: 5_000, decide: 40_000, fire: 40_000, asked: 40_000, delaySec: 25, side: "YES", placements: 4 },
  /**
   * The exposure ledger the order is derived from (share = exposure / cap; the harness asserts the integers and
   * the caps, which fully determine the shares printed in the header):
   *   after P0 : F1 0        (0)    F2 40,000  (0.008)
   *   after P0b: F1 0        (0)    F2 80,000  (0.016)
   *   after P1 : F1 40,000   (0.04) F2 80,000  (0.016)
   *   after P2 : F1 40,000   (0.04) F2 120,000 (0.024)
   *   after P3 : F1 40,000   (0.04) F2 160,000 (0.032)
   *   after P4 : F1 80,000   (0.08) F2 160,000 (0.032)
   * rows: 7 trigger rows (P0, P0b, P1, 2a, 2b, P3, P4) + 3 seed refusals (M1, M2, M3; M0's and M0b's seeds are the
   * holder's own stakes, which the sweep classes as a holder's and never anchors) = 10 rows inserted by the sweep.
   * placeholder: the stakeTzs a SKIPPED row carries (ruling 120, decide.ts:267) = max(1, stakeMinTzs, bounds.min)
   *   = max(1, 1,000 [the drive's OPEN_CAPS.stakeMinTzs], 1,000 [platform minStake]) = 1,000
   */
  "F-ORDER": {
    afterP0: { F1: 0, F2: 40_000 },
    afterP0b: { F1: 0, F2: 80_000 },
    afterP1: { F1: 40_000, F2: 80_000 },
    afterP2: { F1: 40_000, F2: 120_000 },
    afterP3: { F1: 40_000, F2: 160_000 },
    afterP4: { F1: 80_000, F2: 160_000 },
    placeholder: 1_000,
    rows: 10,
    freqMaxPerMarket: 6,
  },
} as const;

/** ⛔ Copied from the lanes file (its helpers are not exported): ONE placeholder guard, ONE account-keyed feed read. */
function helpers(env: Any): Any {
  const { ok, j, w, S } = env;
  const stakeOracle = (row: Any, expected: number, what: string): void => {
    if (!row) { ok(what, false, "no row"); return; }
    if (!["PENDING", "CLAIMED", "PLACED"].includes(row.status)) {
      ok(what, false, `refused to compare: ${row.id} is ${row.status} — stakeTzs there is the ruling-120 placeholder, not an intended stake`);
      return;
    }
    ok(what, row.stakeTzs === expected, j({ got: row.stakeTzs, expected, status: row.status }));
  };
  /** ⚠️ `IntentFeedFilter` carries NO `marketId` — it filters by ACCOUNT. */
  const rowsOf = async (botId: string): Promise<Any[]> => {
    const page = await S.houseBotIntentStore.listFeed({ houseBotId: botId, limit: 50 });
    return (page?.rows ?? page ?? []) as Any[];
  };
  const housePositionsOn = async (marketId: string): Promise<Any[]> =>
    (await w.positionsOf(marketId)).filter((p: Any) => p.houseBotId != null);
  /** A guarded verdict does not guard its own eagerly-built detail: an absent instant prints as words, never throws. */
  const stamp = (t: number): string => (Number.isFinite(t) ? new Date(t).toISOString() : "— never —");
  return { stakeOracle, rowsOf, housePositionsOn, stamp };
}

export async function run(env: Any, prior: Any): Promise<Any> {
  void prior;
  const { ok, section, until, j, w, S, fleet, stake, EXPECT, COUNTER_CUTOFF_MIN, laneWanted, passes, calls, sleep } = env;
  if (!laneWanted("F")) return null;
  const F1 = fleet["F1-CAP1M"];
  const F2 = fleet["F2-CAP5M"];
  if (!F1 || !F2) return null;
  const E1: Any = EXPECT["F1-CAP1M"];
  const E2: Any = EXPECT["F2-CAP5M"];
  const ORDER: Any = EXPECT["F-ORDER"];
  const { stakeOracle, rowsOf, housePositionsOn, stamp } = helpers(env);
  const keyOf = (botId: string | null | undefined): string =>
    botId === F1.botId ? F1.key : botId === F2.botId ? F2.key : botId == null ? "—" : `(not a lane-F desk: ${botId.slice(0, 6)}…)`;
  const parse = (s: string | null | undefined): number => (s ? Date.parse(s) : Number.NaN);

  section("lane F · ORDER and HOLD — two desks, one category, ONE band, different exposure caps; six placements in a fixed sequence");

  /* ⛔ Under KP_FLEET_SILENT nothing decides. The first silent wait is the full 60 s so a slow engine is never
     mistaken for a dead one; every later wait shrinks, so the meta-mutation does not cost fifteen minutes. */
  let engineAlive = true;
  const decideWait = (): number => (engineAlive ? 60_000 : 6_000);
  const fireWait = (): number => (engineAlive ? 120_000 : 6_000);

  const sweepStart = passes.sweep.length;
  const callsStart = calls.length;
  const placed: Any[] = [];

  // ── the facts the pass reads, read through the same members ───────────────────────────────────
  const exposureOf = async (botId: string): Promise<number> =>
    ((await S.houseBookStore.openExposure(null)) as Any[]).find((r) => r.houseBotId === botId)?.openStakeTzs ?? 0;
  const exposures = async (): Promise<{ F1: number; F2: number }> => ({ F1: await exposureOf(F1.botId), F2: await exposureOf(F2.botId) });
  const lastPlacedOf = async (botId: string): Promise<string | null> =>
    ((await S.houseSeamStore.placedTimes({ houseBotId: botId, withinSec: 86_400 })) as string[])[0] ?? null;
  const capOf = async (botId: string): Promise<number | null> => (await S.houseBotStore.get(botId))?.capOpenExposureTzs ?? null;
  const findRow = (positionId: string): Promise<Any> => S.houseBotIntentStore.findByAnchor("COUNTER", positionId);
  const mkMarket = (title: string): Promise<Any> =>
    w.poll({ graceMin: 0, category: F1.category, closeInMs: COUNTER_CUTOFF_MIN * 60_000, title });
  /** The holder's own unmarked stake on a market — what makes that desk OWNER_POSITION-held there (enter-now.ts:194). */
  const holderStake = async (desk: Any, market: Any): Promise<{ positionId: string; row: Any; holds: boolean }> => {
    const own = await w.svc.buyPosition(desk.userId, { marketId: market.id, side: "NO", stake: E1.seed, idempotencyKey: crypto.randomUUID() });
    if (!own?.ok) throw new Error(`lane F: the holder's own stake on ${market.id} was refused: ${j(own)}`);
    await w.backdate(own.data.positionId, 10_000);
    const row = (await w.positionsOf(market.id)).find((p: Any) => p.id === own.data.positionId);
    return { positionId: own.data.positionId, row, holds: row?.status === "OPEN" && row?.houseBotId == null && row?.userId === desk.userId };
  };

  /** The ledger after a phase — the inputs the NEXT pass's `orderBots` will read, asserted as integers with the caps. */
  const ledger = async (tag: string, exp: { F1: number; F2: number }, prose: string): Promise<void> => {
    const got = await exposures();
    const caps = { F1: await capOf(F1.botId), F2: await capOf(F2.botId) };
    ok(`${tag} · the order inputs the next pass reads — openExposure F1 ${exp.F1}/${E1.cap}, F2 ${exp.F2}/${E2.cap}: ${prose}`,
      got.F1 === exp.F1 && got.F2 === exp.F2 && caps.F1 === E1.cap && caps.F2 === E2.cap, j({ got, caps }));
  };

  /** The decision's shape beyond the stake: asked, delay, due = trigger + delay exactly, not held to any exit. */
  const shape = async (tag: string, decided: Any, marketId: string, trigPositionId: string, exp: Any): Promise<void> => {
    const trigRow = (await w.positionsOf(marketId)).find((p: Any) => p.id === trigPositionId);
    const trigAt = parse(trigRow?.placedAt);
    const dueAt = parse(decided?.dueAt);
    ok(`${tag} · …asked ${exp.asked}, delay ${exp.delaySec} s, due EXACTLY ${exp.delaySec} s after the trigger (grace 0: the exit close IS the placement, so nothing holds it later)`,
      decided?.decision?.askedStakeTzs === exp.asked && decided?.decision?.delaySec === exp.delaySec && decided?.decision?.held === false
        && Number.isFinite(trigAt) && Number.isFinite(dueAt) && dueAt === trigAt + exp.delaySec * 1000,
      j({ asked: decided?.decision?.askedStakeTzs, delaySec: decided?.decision?.delaySec, held: decided?.decision?.held, trigger: stamp(trigAt), due: stamp(dueAt) }));
  };

  /** Wait for a PENDING row to leave PENDING/CLAIMED, then assert the whole placement chain for the winner. */
  const placement = async (o: { tag: string; market: Any; winner: Any; loser: Any; decided: Any; before: number; positions: { winner: number; loser: number } }): Promise<Any> => {
    const exp: Any = EXPECT[o.winner.key];
    const fired = o.decided?.status === "PENDING"
      ? await until(`${o.tag} · the poller firing it`, fireWait(), async () => {
          const r = await S.houseBotIntentStore.get(o.decided.id);
          return r && r.status !== "PENDING" && r.status !== "CLAIMED" ? r : null;
        })
      : null;
    ok(`${o.tag} · the poller fired it to PLACED, with a position id`, fired?.status === "PLACED" && !!fired?.positionId, j({ status: fired?.status, code: fired?.reasonCode }));
    const house = await housePositionsOn(o.market.id);
    const mine = house.filter((p: Any) => p.houseBotId === o.winner.botId);
    const theirs = house.filter((p: Any) => p.houseBotId === o.loser.botId);
    ok(`${o.tag} · marked positions on this market: ${o.positions.winner} for ${o.winner.key}, ${o.positions.loser} for ${o.loser.key}, every one on ${exp.side}`,
      mine.length === o.positions.winner && theirs.length === o.positions.loser && mine.every((p: Any) => p.side === exp.side),
      j({ winner: mine.length, other: theirs.length, sides: mine.map((p: Any) => p.side) }));
    const pos = mine.find((p: Any) => p.id === fired?.positionId) ?? null;
    ok(`${o.tag} · …the position this row placed stakes exactly ${exp.fire}, and the row still carries ${exp.fire} — decided = staked, no clamp at fire`,
      pos != null && pos.stake === exp.fire && fired?.stakeTzs === exp.fire, j({ staked: pos?.stake, row: fired?.stakeTzs }));
    const after = (await w.bal(o.winner.userId)).balance as number;
    ok(`${o.tag} · …and ${o.winner.key}'s holder wallet fell by exactly ${exp.fire}, to the shilling`,
      pos != null && o.before - after === exp.fire, j({ before: o.before, after, delta: o.before - after }));
    const txns = pos ? await w.txnsFor(pos.id) : [];
    ok(`${o.tag} · …and every money row it wrote carries the marker (D20)`,
      txns.length > 0 && txns.every((t: Any) => t.houseBotId === o.winner.botId), j({ n: txns.length }));
    if (pos) placed.push({ key: o.winner.key, stake: pos.stake, side: pos.side, market: o.market.id, botId: o.winner.botId, holder: o.winner.userId });
    return { fired, pos };
  };

  /** One trigger, one expected winner, with the ordering premise folded INTO the decide assertion. */
  const counter = async (o: { tag: string; market: Any; winner: Any; loser: Any; claim: string; premise: { pass: boolean; detail: unknown }; positions: { winner: number; loser: number } }): Promise<Any> => {
    const exp: Any = EXPECT[o.winner.key];
    /* ⚠️ The holder's balance is taken BEFORE the trigger — after the intent appears is a race the poller can win. */
    const before = (await w.bal(o.winner.userId)).balance as number;
    const trig = await stake(o.market.id, "NO", exp.trigger, 0);
    const decided = await until(`${o.tag} · a decision on the trigger`, decideWait(), () => findRow(trig.positionId));
    if (!decided) engineAlive = false;
    const got = decided ? { desk: keyOf(decided.houseBotId), kind: decided.kind, status: decided.status, code: decided.reasonCode, side: decided.side } : null;
    ok(`${o.tag} · ${o.claim}`,
      o.premise.pass && decided?.houseBotId === o.winner.botId && decided?.kind === "COUNTER" && decided?.status === "PENDING" && decided?.side === exp.side,
      j({ premise: o.premise.detail, got }));
    stakeOracle(decided, exp.decide, `${o.tag} · …and it is EXACTLY the FIXED ${exp.decide} the rules say (the trigger's ${exp.trigger} is irrelevant to a FIXED amount)`);
    await shape(o.tag, decided, o.market.id, trig.positionId, exp);
    const loserRows = (await rowsOf(o.loser.botId)).filter((r: Any) => r.triggerPositionId === trig.positionId);
    ok(`${o.tag} · ONE row on the trigger's anchor and it is ${o.winner.key}'s — ${o.loser.key} wrote nothing (a losing desk writes nothing, decide.ts:352-408); that absence is backed by the winner's row`,
      decided != null && decided.anchorKey === trig.positionId && decided.triggerPositionId === trig.positionId && loserRows.length === 0,
      j({ anchored: decided?.anchorKey === trig.positionId, loserRows: loserRows.length }));
    const { fired, pos } = await placement({ tag: o.tag, market: o.market, winner: o.winner, loser: o.loser, decided, before, positions: o.positions });
    return { trig, decided, fired, pos };
  };

  // ── which OTHER desks are in scope on this category in THIS process (lane G shares it) ──────────────
  /* Read off the stored rows, never assumed from the roster: status, product, mode, category, cap, exposure. */
  const rivals: Any[] = [];
  for (const spec of Object.values(fleet) as Any[]) {
    if (spec.key === F1.key || spec.key === F2.key || spec.category !== F1.category) continue;
    const row = await S.houseBotStore.get(spec.botId);
    const r = row?.rules;
    const covers = row?.status === "ACTIVE" && r?.scope?.products?.polls === true && r?.modes?.polls?.counter === true
      && Array.isArray(r?.scope?.categories) && r.scope.categories.includes(F1.category);
    if (!covers) continue;
    rivals.push({
      key: spec.key, botId: spec.botId, cap: row.capOpenExposureTzs, exposure: await exposureOf(spec.botId),
      band: [r.counter?.triggerStakeMinTzs, r.counter?.triggerStakeMaxTzs],
    });
  }
  if (rivals.length > 0) console.log(`   · ${rivals.length} other desk(s) in scope on ${F1.category} in this process: ${rivals.map((r) => r.key).join(", ")} — the 2b identity literal is the shared-category one`);

  // ═══ P0 · the tie-break: F1 OWNER_POSITION-held, so F2 takes the first trigger whatever the id order ═══
  /* ⛔ THE ID ORDER IS RANDOM AND IT IS PRINTED, because it decides whether clause (a) was EVALUATED here: F1's
     flags are loaded only if the pure decision named F1 first (trigger.ts:268-276), i.e. only if F1's id sorts
     first. The OUTCOME (F2's row) is a literal either way; the evaluation is measured at P0b whatever the order. */
  const idOrder = F1.botId < F2.botId ? "F1-first" : "F2-first";
  console.log(`   · P0 id order (share 0 = 0, lastPlacedAt null = null → botId): ${idOrder} — ${idOrder === "F1-first"
    ? "F1 is named first and its flags are loaded, so clause (a) is reached at P0 as well"
    : "F2 is named at once and F1's flags are never loaded at P0; clause (a) is measured at P0b"}`);
  const M0 = await mkMarket("Fleet F · M0 tie-break");
  const own0 = await holderStake(F1, M0);
  const p0 = await counter({
    tag: "F-P0", market: M0, winner: F2, loser: F1,
    claim: `${F2.key} takes the tie-break trigger — ${F1.key} is OWNER_POSITION-held (its holder's own unmarked NO is OPEN here, enter-now.ts:194), so whichever desk the random id order put first the row is ${F2.key}'s PENDING COUNTER (this run: ${idOrder}; whether F1 was probed HERE is that coin flip — P0b is the measurement)`,
    premise: { pass: own0.holds, detail: { idOrder, ownerStake: { status: own0.row?.status, marked: own0.row?.houseBotId != null, side: own0.row?.side, holder: own0.row?.userId === F1.userId } } },
    positions: { winner: 1, loser: 0 },
  });
  void p0;
  await ledger("F-P0", ORDER.afterP0, "F2 now carries share 0.008 and F1 share 0 — the tie is broken by a durable fact, not by a random id, and from here F1 sorts STRICTLY first");

  // ═══ P0b · CLAUSE (a) MEASURED: F1 is named first on every run, and only OWNER_POSITION can hold it ═══════
  const M0b = await mkMarket("Fleet F · M0b clause (a)");
  const own0b = await holderStake(F1, M0b);
  const pre0b = await exposures();
  const live0b = (await S.houseBotIntentStore.listLiveOnMarket(M0b.id)) as Any[];
  const usage0b = await S.houseSeamStore.marketUsage({ houseBotId: F1.botId, marketId: M0b.id });
  const count0b = (await S.houseSeamStore.botUsage({ houseBotId: F1.botId, marketId: M0b.id })).countOnMarket;
  const max0b = (await S.houseBotStore.get(F1.botId))?.freqMaxPerMarket ?? null;
  const onlyClauseA = own0b.holds && live0b.length === 0 && usage0b?.otherBotOpen === false && count0b === 0 && max0b === ORDER.freqMaxPerMarket;
  const p0b = await counter({
    tag: "F-P0b", market: M0b, winner: F2, loser: F1,
    claim: `CLAUSE (a) MEASURED · ${F1.key} sorts STRICTLY first (share 0/1,000,000 = 0 < ${F2.key}'s 40,000/5,000,000 = 0.008, read before the trigger), so decide names ${F1.key} first and loadFlags reads marketHeld(${F1.key}, M0b): its holder's own unmarked NO is OPEN there (OWNER_POSITION, enter-now.ts:194) and NOTHING ELSE holds it — no live intent on the market, no other desk's OPEN position, countOnMarket 0 of 6 (each read before the trigger) — so ${F1.key} is refused MARKET_HELD and the row is ${F2.key}'s PENDING COUNTER; with clause (a) gone ${F1.key} reacts here on every run`,
    premise: { pass: onlyClauseA && pre0b.F1 === ORDER.afterP0.F1 && pre0b.F2 === ORDER.afterP0.F2,
      detail: { exposure: pre0b, ownerStake: { status: own0b.row?.status, marked: own0b.row?.houseBotId != null, holder: own0b.row?.userId === F1.userId }, live: live0b.length, otherBotOpenForF1: usage0b?.otherBotOpen, f1CountOnMarket: count0b, freqMaxPerMarket: max0b } },
    positions: { winner: 1, loser: 0 },
  });
  void p0b;
  await ledger("F-P0b", ORDER.afterP0b, "F2 80,000/5,000,000 = 0.016 and F1 still 0 — F1 was refused by a hold, not by the order");

  // ═══ P1 · F1 (share 0) before F2 (0.016) ═════════════════════════════════════════════════════════════
  const M1 = await mkMarket("Fleet F · M1 first trigger");
  await stake(M1.id, "NO", E1.seed, 10_000);
  const pre1 = await exposures();
  const p1 = await counter({
    tag: "F-P1", market: M1, winner: F1, loser: F2,
    claim: `${F1.key} takes trigger 1: share 0/1,000,000 = 0 sorts before ${F2.key}'s 80,000/5,000,000 = 0.016 (exposures read before the trigger are the premise)`,
    premise: { pass: pre1.F1 === ORDER.afterP0b.F1 && pre1.F2 === ORDER.afterP0b.F2, detail: { exposure: pre1 } },
    positions: { winner: 1, loser: 0 },
  });
  void p1;
  await ledger("F-P1", ORDER.afterP1, "F1 40,000/1,000,000 = 0.04 now OUTRANKS F2's 0.016 — the small cap made the same stake five times the share");

  // ═══ P2 · F2 takes trigger 2 on a different market; a second trigger one second later meets the hold ══
  const M2 = await mkMarket("Fleet F · M2 the visible hold");
  await stake(M2.id, "NO", E2.seed, 10_000);
  const pre2 = await exposures();
  /* The desks that sort BEFORE F2 (0.016) at this instant: any rival at exposure 0 (share 0). A rival with exposure
     > 0 would make the identity underivable here and is reported as such, loudly, rather than guessed. */
  const rivalsAhead = rivals.filter((r) => r.cap != null && r.cap > 0 && r.exposure === 0);
  const rivalsUnknown = rivals.filter((r) => !(r.cap != null && r.cap > 0 && r.exposure === 0));
  const before2 = (await w.bal(F2.userId)).balance as number;
  const t2a = await stake(M2.id, "NO", E2.trigger, 0);
  await sleep(1_000);
  const t2b = await stake(M2.id, "NO", E2.trigger, 0);
  const [d2a, d2b] = await Promise.all([
    until("F-P2a · a decision on trigger 2a", decideWait(), () => findRow(t2a.positionId)),
    until("F-P2b · a decision on trigger 2b", decideWait(), () => findRow(t2b.positionId)),
  ]);
  if (!d2a || !d2b) engineAlive = false;
  const sweepAt2b = passes.sweep.length;
  /* ⛔ READ NOW, while 2a is still live: the cause of the hold, through the member loadFlags reads. */
  const liveM2 = (await S.houseBotIntentStore.listLiveOnMarket(M2.id)) as Any[];
  const liveA = liveM2.find((i) => i.id === d2a?.id) ?? null;

  ok(`F-P2a · ${F2.key} takes trigger 2 on a DIFFERENT market: its share 0.016 sorts before ${F1.key}'s 0.04 now that ${F1.key} holds an OPEN position — a PENDING COUNTER for ${F2.key}`,
    pre2.F1 === ORDER.afterP1.F1 && pre2.F2 === ORDER.afterP1.F2 && d2a?.houseBotId === F2.botId && d2a?.kind === "COUNTER" && d2a?.status === "PENDING" && d2a?.side === E2.side,
    j({ premise: { exposure: pre2 }, got: d2a ? { desk: keyOf(d2a.houseBotId), status: d2a.status, code: d2a.reasonCode, side: d2a.side } : null }));
  stakeOracle(d2a, E2.decide, `F-P2a · …and it is EXACTLY the FIXED ${E2.decide} the rules say`);
  await shape("F-P2a", d2a, M2.id, t2a.positionId, E2);

  ok("F-P2b · trigger 2b, one second later on the SAME market while 2a is still live: exactly ONE row on its anchor, and it is SKIPPED — no desk reacted",
    d2b != null && d2b.kind === "COUNTER" && d2b.status === "SKIPPED" && d2b.anchorKey === t2b.positionId && d2b.triggerPositionId === t2b.positionId,
    j({ got: d2b ? { desk: keyOf(d2b.houseBotId), status: d2b.status, code: d2b.reasonCode } : null }));
  ok(`F-P2b · WITNESS · at the moment 2b's row exists, 2a's intent is LIVE on this market (listLiveOnMarket — the read loadFlags makes at trigger.ts:285 → enter-now.ts:188): the hold's CAUSE, read rather than inferred`,
    d2b != null && liveA != null && liveA.houseBotId === F2.botId && ["PENDING", "CLAIMED"].includes(liveA.status),
    j({ live: liveM2.map((i) => ({ desk: keyOf(i.houseBotId), status: i.status, is2a: i.id === d2a?.id })) }));
  if (rivalsAhead.length === 0 && rivalsUnknown.length === 0) {
    ok(`F-P2b · the SKIPPED row names ${F2.key} — the WINNER of 2a, held against ITSELF by its own live intent (OWN_INTENT) and first in the frozen order, not the loser — reasonCode MARKET_HELD (decide.ts:368, 385-386, 411-412), in decision.code and in the why`,
      d2b?.houseBotId === F2.botId && d2b?.reasonCode === "MARKET_HELD" && d2b?.decision?.code === "MARKET_HELD"
        && String(d2b?.why ?? "").includes("not countered (MARKET_HELD)") && String(d2b?.why ?? "").includes(`Fleet ${F2.key}`),
      j({ desk: keyOf(d2b?.houseBotId), code: d2b?.reasonCode, decisionCode: d2b?.decision?.code, why: d2b?.why ?? null }));
  } else {
    const bandOut = rivalsAhead.every((r) => Number.isFinite(r.band[0]) && Number.isFinite(r.band[1]) && (E2.trigger < r.band[0] || E2.trigger > r.band[1]));
    ok(`F-P2b · SHARED-CATEGORY RUN · ${rivalsAhead.length} other desk(s) on ${F1.category} sit at share 0 and sort BEFORE ${F2.key} (0.016): the FIRST refuser is one of THEM, refused on its band (TRIGGER_STAKE_RANGE, decide.ts:364, ahead of MARKET_HELD at :368) — ${F2.key}'s own hold is the WITNESS above, not the visible row`,
      rivalsUnknown.length === 0 && bandOut && d2b != null && rivalsAhead.some((r) => r.botId === d2b.houseBotId) && d2b.reasonCode === "TRIGGER_STAKE_RANGE",
      j({ rivalsAhead: rivalsAhead.map((r) => ({ key: r.key, band: r.band, exposure: r.exposure })), rivalsUnknown: rivalsUnknown.map((r) => r.key), got: { desk: rivals.find((r) => r.botId === d2b?.houseBotId)?.key ?? keyOf(d2b?.houseBotId), code: d2b?.reasonCode } }));
  }
  ok(`F-P2b · …and its stakeTzs IS the ruling-120 placeholder (${ORDER.placeholder} = max(1, stakeMinTzs 1,000, platform min 1,000)), not an intended stake`,
    d2b != null && d2b.stakeTzs === ORDER.placeholder, j({ got: d2b?.stakeTzs }));
  const fRows2b = [...(await rowsOf(F1.botId)), ...(await rowsOf(F2.botId))].filter((r: Any) => r.triggerPositionId === t2b.positionId);
  ok(`F-P2b · no lane-F desk holds any row on 2b's anchor other than that one SKIPPED row (${rivalsAhead.length === 0 ? "F2's" : "which here is a rival's, so none"})`,
    d2b != null && fRows2b.every((r: Any) => r.id === d2b.id) && fRows2b.length === (rivalsAhead.length === 0 && rivalsUnknown.length === 0 ? 1 : 0),
    j({ fRows: fRows2b.map((r: Any) => ({ desk: keyOf(r.houseBotId), status: r.status, code: r.reasonCode })) }));

  const f2a = await placement({ tag: "F-P2a", market: M2, winner: F2, loser: F1, decided: d2a, before: before2, positions: { winner: 1, loser: 0 } });
  const decidedAt2b = parse(d2b?.finishedAt);
  const placedAt2a = parse(f2a.pos?.placedAt);
  ok("F-P2b · PREMISE · 2b was decided BEFORE 2a was placed (its row's finishedAt is the deciding pass's instant; 2a's position placedAt is the fire) — otherwise the hold had lapsed and this was the P4 case, not a visible hold",
    Number.isFinite(decidedAt2b) && Number.isFinite(placedAt2a) && decidedAt2b < placedAt2a,
    j({ decided2b: stamp(decidedAt2b), placed2a: stamp(placedAt2a) }));
  const houseM2 = await housePositionsOn(M2.id);
  ok("F-P2 · immediately after 2a fired the market carries exactly ONE marked position — 2b, decided SKIPPED while 2a was live, did not fire (the END-OF-LANE case below is what says the anchor stays retired)",
    f2a.fired?.status === "PLACED" && houseM2.length === 1 && houseM2[0]?.houseBotId === F2.botId, j({ n: houseM2.length, desks: houseM2.map((p: Any) => keyOf(p.houseBotId)) }));
  await ledger("F-P2", ORDER.afterP2, "F2 120,000/5,000,000 = 0.024 is still below F1's 0.04 — and F2's lastPlacedAt is now the NEWER one, which is what makes P3 discriminating");

  // ═══ P3 · THE COMPARATOR CASE · share outranks lastPlacedAt ═══════════════════════════════════════════
  const M3 = await mkMarket("Fleet F · M3 the keys disagree");
  await stake(M3.id, "NO", E2.seed, 10_000);
  const pre3 = await exposures();
  const last3 = { F1: await lastPlacedOf(F1.botId), F2: await lastPlacedOf(F2.botId) };
  const keysDisagree = pre3.F1 === ORDER.afterP2.F1 && pre3.F2 === ORDER.afterP2.F2
    && Number.isFinite(parse(last3.F1)) && Number.isFinite(parse(last3.F2)) && parse(last3.F2) > parse(last3.F1);
  const p3 = await counter({
    tag: "F-P3", market: M3, winner: F2, loser: F1,
    claim: `THE COMPARATOR CASE · ${F2.key} takes trigger 3: share 0.024 < 0.04 wins although ${F2.key} placed MORE RECENTLY than ${F1.key} (placedTimes, read before the trigger) — a least-recent-first or round-robin engine names ${F1.key} here`,
    premise: { pass: keysDisagree, detail: { exposure: pre3, lastPlaced: last3 } },
    positions: { winner: 1, loser: 0 },
  });
  void p3;
  await ledger("F-P3", ORDER.afterP3, "F2 160,000/5,000,000 = 0.032 — still below F1's 0.04, so F2 sorts first in P4 and must be refused there by a hold, not by the order");

  // ═══ P4 · a second trigger on M1: F2 is OTHER_BOT-held by F1's OPEN position, F1 counters again ═══════
  const usageF2 = await S.houseSeamStore.marketUsage({ houseBotId: F2.botId, marketId: M1.id });
  const usageF1 = await S.houseSeamStore.marketUsage({ houseBotId: F1.botId, marketId: M1.id });
  const countF1 = (await S.houseSeamStore.botUsage({ houseBotId: F1.botId, marketId: M1.id })).countOnMarket;
  const liveM1 = (await S.houseBotIntentStore.listLiveOnMarket(M1.id)) as Any[];
  const maxPerMarket = (await S.houseBotStore.get(F1.botId))?.freqMaxPerMarket ?? null;
  const pre4 = await exposures();
  const heldForF2 = usageF2?.otherBotOpen === true && usageF1?.otherBotOpen === false && countF1 === 1 && liveM1.length === 0
    && maxPerMarket === ORDER.freqMaxPerMarket && pre4.F1 === ORDER.afterP3.F1 && pre4.F2 === ORDER.afterP3.F2;
  const p4 = await counter({
    tag: "F-P4", market: M1, winner: F1, loser: F2,
    claim: `a second trigger on M1, which ${F1.key} already holds with an OPEN position: ${F2.key}, first in the order (0.032 < 0.04), does NOT take it — it is OTHER_BOT-held by ${F1.key}'s OPEN position (marketUsage.otherBotOpen true for ${F2.key}, enter-now.ts:200, read before the trigger) — and ${F1.key} DOES: its own position does not hold it (clause (d): countOnMarket 1 < freqMaxPerMarket 6; no live intent) — ${F1.key}'s PENDING row, no SKIPPED row. ⚠️ The probe ORDER itself is invisible here (a refused desk writes nothing; a least-recent-first comparator gives the same rows) — P3 pins the comparator`,
    premise: { pass: heldForF2, detail: { otherBotOpen: { forF2: usageF2?.otherBotOpen, forF1: usageF1?.otherBotOpen }, f1CountOnMarket: countF1, freqMaxPerMarket: maxPerMarket, live: liveM1.length, exposure: pre4 } },
    positions: { winner: 2, loser: 0 },
  });
  void p4;
  await ledger("F-P4", ORDER.afterP4, "F1 80,000/1,000,000 = 0.08 — two positions on one market by one desk, the other never admitted");

  // ═══ END OF LANE · 2b's anchor stayed retired through everything that followed ═══════════════════════
  const rowEnd2b = await findRow(t2b.positionId);
  const houseM2End = await housePositionsOn(M2.id);
  const rows2bEnd = [...(await rowsOf(F1.botId)), ...(await rowsOf(F2.botId))].filter((r: Any) => r.triggerPositionId === t2b.positionId);
  const sweepsSince2b = passes.sweep.length - sweepAt2b;
  const sinceDecided2bS = Number.isFinite(decidedAt2b) ? Math.round((Date.now() - decidedAt2b) / 1000) : null;
  ok(`F-P2 · END OF LANE · ${sweepsSince2b} sweep passes and ${sinceDecided2bS ?? "?"} s after 2b was decided (P3 and P4 in between — 2a fired, and 2b's trigger was re-readable by every one of those passes had its anchor not excluded it), its anchor still holds exactly the one SKIPPED row it got and M2 still carries exactly ONE marked position: the transient hold left a PERMANENT refusal (triggerPage excludes any position with a COUNTER row of ANY status, dal:4503; the anchor conflict has no status predicate, dal:2500)`,
    sweepsSince2b >= 3 && d2b != null && rowEnd2b?.id === d2b.id && rowEnd2b?.status === "SKIPPED" && rows2bEnd.every((r: Any) => r.id === d2b.id)
      && houseM2End.length === 1 && houseM2End[0]?.houseBotId === F2.botId,
    j({ sweepsSince2b, sinceDecided2bS, row: rowEnd2b ? `${rowEnd2b.status}/${rowEnd2b.reasonCode}` : null, sameRow: rowEnd2b?.id === d2b?.id, laneRows: rows2bEnd.length, positions: houseM2End.length }));

  // ═══ the passes and the alert ledger over the lane's window ═════════════════════════════════════════
  const sweeps = passes.sweep.slice(sweepStart) as Any[];
  const inserted = sweeps.reduce((n: number, p: Any) => n + (p?.outcomes?.inserted ?? 0), 0);
  const holder = sweeps.reduce((n: number, p: Any) => n + (p?.outcomes?.holder ?? 0), 0);
  const skipped = sweeps.filter((p: Any) => p?.skipped != null).length;
  const failed = sweeps.reduce((n: number, p: Any) => n + (p?.failed ?? 0), 0);
  /* ⛔ THE ABSENCE WITNESS for "never as a trigger": a holder's stake writes no anchor row (trigger.ts:158-161
     returns "holder" before any insert), so the count alone cannot tell "read as a holder's" from "read as a
     trigger AND refused" — that leaves a SKIPPED row on the holder's position id, and it is read for here. */
  const holderRows = [await findRow(own0.positionId), await findRow(own0b.positionId)];
  ok(`F · every sweep pass in the lane's window RAN (none skipped for admission) and none failed a decision; they inserted EXACTLY the lane's ${ORDER.rows} rows (7 triggers + 3 seed refusals), read BOTH holder stakes as a holder's (outcome "holder" ≥ 2) and NEVER anchored either — no COUNTER row on either holder position id`,
    sweeps.length > 0 && skipped === 0 && failed === 0 && inserted === ORDER.rows && holder >= 2 && holderRows.every((r) => r == null),
    j({ passes: sweeps.length, inserted, holder, skipped, failed, holderRows: holderRows.map((r) => (r ? `${r.status}/${r.reasonCode}` : null)) }));
  const window = calls.slice(callsStart) as Any[];
  const placedF1 = window.filter((c) => c.fn === "placed" && c.botId === F1.botId).length;
  const placedF2 = window.filter((c) => c.fn === "placed" && c.botId === F2.botId).length;
  const faults = window.filter((c) => c.fn === "security" || c.fn === "botStopped" || c.fn === "switchedOff").length;
  ok(`F · the placed alert fired once per placement (${F1.key} ×${E1.placements}, ${F2.key} ×${E2.placements}) and no security, botStopped or switchedOff alert ran in the window — six placements, no fault`,
    placedF1 === E1.placements && placedF2 === E2.placements && faults === 0, j({ placedF1, placedF2, faults }));

  return { lane: "F", measured: true, placed };
}
