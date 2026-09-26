/**
 * The case list behind `test:house-bot-engine`. Run by that suite in two child processes — one on Postgres, one on
 * the memory store — never on its own. Source pins run in the memory child only (they read files, not a store).
 *
 * Sections follow the build order in `plans/house-bots/C4-SPEC.md` §5:
 *   §1 the lock exit · §2 the planner lease · §3 attribution · §4 the market view · §5 Enter now decision ·
 *   §6 the outcome table · §7 decide · §8 source pins · §9 feed copy · §10 schema gate · §11 engine process · §12 market view · §13 applyOutcome · §14 the A15 price read ·
 *   §15 the Enter now loader, the opener draw and marketHeld · §16 fire and the poller · §17 the planner · §18 the trigger · §19 the holder hook and the L2 holder sweep.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./decomment.mts";
/* ⛔ THE DECLARED MUTATIONS ARE READ BY THIS SUITE (ruling 505), so an `expect` that names no label it can print is
 * reported HERE, by a suite that runs every day, instead of by a drive nobody has run — see the roll-call at the foot. */
import { MUTATIONS as DECLARED_MUTATIONS } from "../anchors/house-bot-engine.anchors.mjs";
import { expectDriftReport, expectDriftControl, type DeclaredMutation } from "./house-bot-expect-drift.mts";

type Any = any;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
const onPostgres = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false";
let pass = 0, fail = 0;
/** Every label this run emitted, so ruling 505's roll-call at the foot of this file measures the suite instead of asserting `true`. */
const emitted: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  emitted.push(l);
  console.log(`${c ? "PASS" : "FAIL"} [${STORE}] ${l}${x ? ` — ${x}` : ""}`);
};
const section = (t: string) => console.log(`\n[${STORE}] ${t}`);
// ⛔ NEVER TRUNCATED. `j` is used on both sides of comparisons; a 260-character cut once hid a Sentinel verdict
// appended to a view's title past the cut, so the A13 case could not fail (mutation S17 missed).
const j = (v: unknown) => JSON.stringify(v) ?? String(v);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** A throw is a failed assertion, never a crashed suite. */
/** `HB_ENGINE_SECTIONS=7,17` runs only those guarded sections — for mutation runs; the suite itself always runs all. */
const ONLY_SECTIONS = (process.env.HB_ENGINE_SECTIONS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
async function guard(label: string, fn: () => Promise<void> | void): Promise<void> {
  if (ONLY_SECTIONS.length > 0 && !ONLY_SECTIONS.includes(label)) return;
  // The whole message, on one line: Prisma puts the database's own text after its first lines, which a stack cut lost.
  try { await fn(); } catch (e) { ok(`${label} · threw`, false, `${String((e as Error)?.message ?? e).replace(/\s+/g, " ")} | ${(e as Error)?.stack?.split("\n").slice(1, 4).join(" | ") ?? ""}`); }
}
/**
 * ⭐ REPLAN RULING 543 · ONE CALL WITH THE AUDIT CHAIN UNSIGNABLE — `NODE_ENV=production` and no `AUDIT_CHAIN_SECRET`,
 * exactly the precondition `chainSecret()` refuses on a served build. The audit queue is drained BEFORE the env moves (no
 * earlier fire-and-forget append may be stamped under it) and again before it is put back (nothing queued inside may be
 * stamped outside), and both variables are restored in a `finally`.
 */
async function withUnsignableChain<T>(fn: () => Promise<T>): Promise<T> {
  const AUD543: Any = await import("../../src/lib/server/audit.ts");
  await AUD543.auditFlush();
  const env0 = { node: process.env.NODE_ENV, chain: process.env.AUDIT_CHAIN_SECRET };
  const put = (k: string, v: string | undefined): void => { if (v === undefined) delete (process.env as Any)[k]; else (process.env as Any)[k] = v; };
  try {
    put("NODE_ENV", "production");
    put("AUDIT_CHAIN_SECRET", undefined);
    return await fn();
  } finally {
    await AUD543.auditFlush();
    put("NODE_ENV", env0.node);
    put("AUDIT_CHAIN_SECRET", env0.chain);
  }
}

process.env.MARKET_SCHEDULER = "false";
const L: Any = await import("../../src/lib/server/locks.ts");
const LEAD: Any = await import("../../src/lib/server/leader.ts");
const { loadConfig }: Any = await import("../../src/lib/server/config-store.ts");
const { prisma }: Any = await import("../../src/lib/server/prisma.ts");
const CP: Any = await import("../../src/lib/house-bot/counterparty.ts");
const SEAM: Any = await import("../../src/lib/server/house-bot/seam.ts");
const MV: Any = await import("../../src/lib/server/house-bot/market-view.ts");
const EN: Any = await import("../../src/lib/server/house-bot/enter-now-decision.ts");
const OM: Any = await import("../../src/lib/server/house-bot/outcome-map.ts");
const DE: Any = await import("../../src/lib/server/house-bot/decide.ts");
const FC: Any = await import("../../src/lib/house-bot/feed-copy.ts");
const K: Any = await import("../../src/lib/house-bot/constants.ts");
const BP: Any = await import("../../src/lib/house-bot/bet-path.ts");
const R: Any = await import("../../src/lib/house-bot/rules.ts");
const CLOCK: Any = await import("../../src/lib/house-bot/clock.ts");
const { playerHandle }: Any = await import("../../src/lib/server/house-bot/alerts.ts");
const { isDemoMarket }: Any = await import("../../src/lib/server/market-service.ts");

ok(`0.store · the child runs on ${STORE}`, onPostgres === (STORE === "postgres"));

/* ═══ §1 · the lock exit (C4-SPEC §2 trap, ruling 31) ═════════════════════════════════════════════ */
section("§1 · a hook fired inside a lock must not join its transaction");
await guard("1", async () => {
  let insideSeen = false, outsideSeen = true, laterSeen = true, trapSeen = false;
  let trapPromise: Promise<void> = Promise.resolve();
  let exitPromise: Promise<void> = Promise.resolve();
  await L.withLock("hb-engine:outer", async () => {
    insideSeen = L.inLock();
    outsideSeen = L.runOutsideLock(() => L.inLock());
    // A fire-and-forget hook started inside the lock callback, after the write.
    trapPromise = (async () => { await sleep(5); trapSeen = L.inLock(); })();
    exitPromise = L.runOutsideLock(async () => { await sleep(5); laterSeen = L.inLock() || L.currentLockTx() !== null; });
  });
  await Promise.all([trapPromise, exitPromise]);
  ok("1.1 · inside a lock, inLock() is true (control)", insideSeen);
  ok("1.2 · runOutsideLock sees no lock context", outsideSeen === false);
  ok("1.3 · ⭐ CONTROL · a promise started inside the callback still carries the lock after it returns — the trap is real", trapSeen === true);
  ok("1.4 · a promise started through runOutsideLock carries no lock and no transaction after an await", laterSeen === false);

  if (onPostgres) {
    const db = prisma();
    const txid = async (tx: Any) => String(((await tx.$queryRawUnsafe(`SELECT txid_current()::text AS t`)) as Any[])[0].t);
    let outer = "", nested = "", escaped = "";
    await L.withLock("hb-engine:pg-outer", async (tx: Any) => {
      outer = await txid(tx);
      nested = await L.withLock("hb-engine:pg-nested", async (t2: Any) => txid(t2));
      escaped = await L.runOutsideLock(() => L.withLock("hb-engine:pg-escaped", async (t3: Any) => txid(t3)));
    });
    ok("1.5 · CONTROL · a nested withLock joins the outer transaction", outer !== "" && nested === outer, `${outer} vs ${nested}`);
    ok("1.6 · a withLock inside runOutsideLock opens its OWN transaction", escaped !== "" && escaped !== outer, `${outer} vs ${escaped}`);
    void db;
  }
});

/* ═══ §2 · the planner lease (04 A24) ════════════════════════════════════════════════════════════ */
section("§2 · acquireLeadership takes a lease length and can fail closed on a lost write");
await guard("2", async () => {
  const now = Date.now();
  ok("2.1 · a call with no options keeps the lifecycle's 3-minute lease", await LEAD.acquireLeadership(`hb-default-${process.pid}`, { now }));
  const snapDefault = LEAD.leadershipSnapshot()[`hb-default-${process.pid}`];
  ok("2.2 · …and the observed lease is LEASE_MS long", snapDefault && Math.abs(snapDefault.expiresInSec - LEAD.LEASE_MS / 1000) <= 2, j(snapDefault));
  ok("2.3 · the house planner's 45 s lease is taken", await LEAD.acquireLeadership(`hb-planner-${process.pid}`, { leaseMs: K.PLANNER_LEASE_MS, now, strictWrite: true }));
  const snap = LEAD.leadershipSnapshot()[`hb-planner-${process.pid}`];
  ok("2.4 · …and observed as 45 s", snap && Math.abs(snap.expiresInSec - 45) <= 2, j(snap));
  if (onPostgres) {
    const stored = await loadConfig(`__LEADER_hb-planner-${process.pid}__`);
    ok("2.5 · the STORED lease expires 45 s after the claim", stored && stored.expiresAt === now + 45_000, j(stored));
    const task = `hb-strict-${process.pid}`;
    const db = prisma();
    await db.$executeRawUnsafe(`ALTER TABLE "SystemConfig" ADD CONSTRAINT hb_engine_refuse_lease CHECK (key <> '__LEADER_${task}__')`);
    try {
      ok("2.6 · ⛔ a lease write that FAILS makes a strict claim return false", (await LEAD.acquireLeadership(task, { leaseMs: 45_000, strictWrite: true })) === false);
      ok("2.7 · ⭐ CONTROL · the same failed write without strictWrite still returns true — the swallow A24 names is real", (await LEAD.acquireLeadership(task, {})) === true);
    } finally {
      await db.$executeRawUnsafe(`ALTER TABLE "SystemConfig" DROP CONSTRAINT IF EXISTS hb_engine_refuse_lease`);
    }
  }
});

/* ═══ §3 · attribution moved, unchanged (N1 §4.1) ════════════════════════════════════════════════ */
section("§3 · one attribution function");
await guard("3", () => {
  ok("3.1 · the seam uses counterparty.ts's attributeStake (one function, not a copy)", typeof CP.attributeStake === "function" && SEAM.attributeStake === CP.attributeStake);
  const a = CP.attributeStake(9_000, [{ userId: "a", lockedTzs: 4_000 }, { userId: "b", lockedTzs: 4_000 }, { userId: "c", lockedTzs: 4_000 }], 12_000);
  ok("3.2 · UX-15: three accounts at 33% are each attributed 3,000", j(a.map((x: Any) => x.attributedTzs)) === "[3000,3000,3000]", j(a));
});

/* ═══ §4 · the market view (04 A12, A13) ═════════════════════════════════════════════════════════ */
section("§4 · the allowlisted view and the one scope predicate");
const T0 = Date.parse("2026-09-16T09:00:00.000Z");
const at = (sec: number) => new Date(T0 + sec * 1000).toISOString();
function viewRow(o: Any = {}): Any {
  return {
    id: "mkt_hb_1", productLine: "MARKET", category: "weather", status: "LIVE", yesPool: 0, noPool: 0,
    selectionClosedAt: at(7_200), resolutionAt: at(10_800), createdAt: at(-3_600), titleEn: "Will Dar get rain today?",
    exitGraceMin: 5, exitPaidMin: 0, reopenedAt: null, round: null, ...o,
  };
}
const roundOf = (o: Any = {}) => ({ roundId: "rnd_1", chainId: "chn_1", chainKey: "BTC:5", roundNumber: 412, opensAt: at(-60), durationMinutes: 5,
  openPrice: 100, upTarget: 110, downTarget: 96, chainRunning: true, assetEnabled: true, ...o });
await guard("4", () => {
  ok("4.1 · HOUSE_MARKET_FIELDS is exactly the pinned list", j(MV.HOUSE_MARKET_FIELDS) === j(["id", "productLine", "category", "status", "yesPool", "noPool", "selectionClosedAt", "resolutionAt", "createdAt", "titleEn", "feeSnapshot", "reopenedAt"]));
  for (const t of ["Demo · BTC above 70k?", "Demo· spacing", "Will it rain?"]) {
    ok(`4.2 · isDemo agrees with isDemoMarket for “${t}”`, MV.projectMarketView(viewRow({ titleEn: t })).isDemo === isDemoMarket({ titleEn: t }));
  }
  const v = (o: Any) => MV.projectMarketView(viewRow(o));
  ok("4.3 · a poll with a cutoff is in scope", MV.scopeCode(v({})) === null && MV.inScope(v({})));
  ok("4.4 · a poll with no selection close is NO_CUTOFF", MV.scopeCode(v({ selectionClosedAt: null })) === "NO_CUTOFF");
  ok("4.5 · a raw JACKPOT product line is PRODUCT_NOT_SUPPORTED", MV.scopeCode(v({ productLine: "JACKPOT" })) === "PRODUCT_NOT_SUPPORTED");
  ok("4.6 · an Up & Down market with no round is UD_NO_ROUND", MV.scopeCode(v({ productLine: "UPDOWN" })) === "UD_NO_ROUND");
  ok("4.7 · a demo market is out of scope", !MV.inScope(v({ titleEn: "Demo · x" })));
  const ud = v({ productLine: "UPDOWN", selectionClosedAt: null, resolutionAt: at(900), round: roundOf({ opensAt: at(-60), durationMinutes: 5 }) });
  ok("4.8 · A12 Up & Down cutoff = min(opensAt + D, resolutionAt)", MV.cutoffOf(ud) === at(240), MV.cutoffOf(ud));
  ok("4.9 · a poll's cutoff is its selection close, never resolutionAt", MV.cutoffOf(v({})) === at(7_200));
  ok("4.10 · bettableFrom = max(round opensAt, market createdAt)", MV.bettableFrom(v({ createdAt: at(-10), productLine: "UPDOWN", round: roundOf({ opensAt: at(-60) }) })) === at(-10));
});

/* ═══ §5 · Enter now decision (N1 §4.2) ═══════════════════════════════════════════════════════════ */
section("§5 · enterNowDecision");
const side = (o: Any = {}) => ({ raw: 0, nonHouse: 0, locked: 0, unlocked: 0, earliestLockAt: null, excluded: 0, lockedA15: 0, accounts: [], ...o });
const merge = (a: Any, b: Any): Any => {
  if (b === undefined) return a;
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const out: Any = { ...a };
    for (const k of Object.keys(b)) out[k] = merge(a[k], b[k]);
    return out;
  }
  return b;
};
const NOW = at(0);
const UX15 = { YES: side({ raw: 12_000, nonHouse: 12_000, locked: 12_000, accounts: [{ userId: "usr_A", lockedTzs: 4_000 }, { userId: "usr_B", lockedTzs: 4_000 }, { userId: "usr_C", lockedTzs: 4_000 }] }), NO: side({ raw: 3_000, nonHouse: 3_000, locked: 3_000 }) };
function enIn(o: Any = {}): Any {
  return merge({
    view: { id: "mkt_hb_1", titleEn: "Will Dar get rain today?", category: "weather", selectionClosedAt: at(7_200) },
    blocked: false, pools: UX15, openerDraw: null, own: { side: null, count: 0, stakeTzs: 0 },
    rules: { thinStakeTzs: 10_000, openerStakeTzs: 5_000, roundToTzs: 1_000 },
    bot: { stakeMinTzs: 1_000, stakeMaxTzs: 100_000, capPerMarketTzs: 1e6, capDailyStakeTzs: 1e7, capDailyLossTzs: 1e7, capOpenExposureTzs: 1e7,
      balanceFloorTzs: 0, capStaffChosenPerDay: 10, capStaffChosenDailyTzs: 1e6, freqMinGapSec: 20, freqMaxPerHour: 20, freqMaxPerDay: 100,
      stakeOnMarket: 0, stakedToday: 0, projectedLossToday: 0, openExposure: 0, staffChosenCountToday: 0, staffChosenTzsToday: 0, balance: 5e6, placedAt: [] },
    control: { gCapPerMarketTzs: 1e7, gCapDailyStakeTzs: 1e8, gCapDailyLossTzs: 1e8, gCapOpenExposureTzs: 1e8, gCapStaffChosenPerDay: 50,
      gCapStaffChosenDailyTzs: 1e7, gStaffChosenMaxCounterpartyShare: 50, gCounterPerPlayerPerDay: 5, gCounterPerPlayerTzsPerDay: 1e6, gMaxBetsPerMinute: 20,
      houseOnMarket: 0, globalStakedToday: 0, globalProjectedLossToday: 0, globalExposure: 0, globalStaffChosenCountToday: 0, globalStaffChosenTzsToday: 0, platformPlacedAt: [] },
    counterparties: [], bounds: { min: 1_000, max: 1_000_000 }, now: NOW,
  }, o);
}
await guard("5", () => {
  const r = EN.enterNowDecision(enIn());
  ok("5.1 · UX-15: THIN on NO, 9,000, binding room", r.ok && r.entryCondition === "THIN" && r.side === "NO" && r.stakeTzs === 9_000 && r.binding === "room", j(r));
  ok("5.2 · …top account 33.3%, three attributed accounts, handle = playerHandle", r.ok && r.decision.lockedByTopAccountPct === 33.3 && r.decision.attributedAccounts === 3 && r.decision.topCounterpartyHandle === playerHandle("usr_A"), j(r.ok && r.decision));
  ok("5.3 · …why matches N1's example", r.ok && r.why === "Enter now · thinner side NO (players' locked YES 12,000 · raw NO 3,000) · stake 10,000 cut to 9,000 (room)", r.ok ? r.why : "");
  ok("5.4 · …the decision carries no user id", r.ok && !JSON.stringify(r.decision).includes("usr_"), j(r.ok && r.decision));
  ok("5.5 · a blackout refuses first, before the share check", (EN.enterNowDecision(enIn({ blocked: true, control: { gStaffChosenMaxCounterpartyShare: null } })) as Any).code === "INFO_BLACKOUT");
  const nullShare = EN.enterNowDecision(enIn({ control: { gStaffChosenMaxCounterpartyShare: null } }));
  ok("5.6 · a share limit that is not set refuses COUNTERPARTY_CONCENTRATION {limit:null}", !nullShare.ok && nullShare.code === "COUNTERPARTY_CONCENTRATION" && nullShare.facts.limit === null, j(nullShare));
  const empty = { YES: side(), NO: side() };
  const op = EN.enterNowDecision(enIn({ pools: empty, openerDraw: { side: "YES", drawnFor: "ENTER_NOW", drawnAt: NOW } }));
  ok("5.7 · an empty poll is OPENER on the DRAWN side, stake = opener stake", op.ok && op.entryCondition === "OPENER" && op.side === "YES" && op.stakeTzs === 5_000 && op.binding === "openerStake", j(op));
  let threw = false;
  try { EN.enterNowDecision(enIn({ pools: empty })); } catch { threw = true; }
  ok("5.8 · an empty poll without its drawn side throws (never a silent side)", threw);
  const houseOnly = EN.enterNowDecision(enIn({ pools: { YES: side({ raw: 5_000 }), NO: side() } }));
  ok("5.9 · house money only → HOUSE_ONLY", !houseOnly.ok && houseOnly.code === "HOUSE_ONLY", j(houseOnly));
  const sellable = EN.enterNowDecision(enIn({ pools: { YES: side({ raw: 4_000, nonHouse: 4_000, unlocked: 4_000, earliestLockAt: at(30) }), NO: side() } }));
  ok("5.10 · only sellable money → ONLY_SELLABLE with retryAt = earliestLockAt", !sellable.ok && sellable.code === "ONLY_SELLABLE" && sellable.retryAt === at(30), j(sellable));
  const balanced = EN.enterNowDecision(enIn({ pools: { YES: side({ raw: 5_000, nonHouse: 5_000, locked: 5_000 }), NO: side({ raw: 5_000, nonHouse: 5_000, locked: 5_000 }) } }));
  ok("5.11 · balanced locked money → BALANCED, no retryAt", !balanced.ok && balanced.code === "BALANCED" && balanced.retryAt === undefined, j(balanced));
  const own = EN.enterNowDecision(enIn({ own: { side: "YES", count: 1, stakeTzs: 2_000 } }));
  ok("5.12 · the bot holds the other side → OWN_OTHER_SIDE {held, now}", !own.ok && own.code === "OWN_OTHER_SIDE" && own.facts.held === "YES" && own.facts.now === "NO", j(own));
  const conc = EN.enterNowDecision(enIn({ pools: { YES: side({ raw: 10_000, nonHouse: 10_000, locked: 10_000, accounts: [{ userId: "usr_T", lockedTzs: 6_000 }, { userId: "usr_U", lockedTzs: 4_000 }] }), NO: side({ raw: 1_000, nonHouse: 1_000, locked: 1_000 }) } }));
  ok("5.13 · one account at 60% against a 50% limit → COUNTERPARTY_CONCENTRATION {60, 50}", !conc.ok && conc.code === "COUNTERPARTY_CONCENTRATION" && conc.facts.pct === 60 && conc.facts.limit === 50, j(conc));
  const low = EN.enterNowDecision(enIn({ bot: { stakeMaxTzs: 500 } }));
  ok("5.14 · a bot maximum under the minimum → STAKE_BELOW_MIN naming stakeMax", !low.ok && low.code === "STAKE_BELOW_MIN" && low.facts.binding === "stakeMax" && low.facts.min === 1_000, j(low));
  const unsetCap = EN.enterNowDecision(enIn({ bot: { capDailyLossTzs: null } }));
  ok("5.15 · a money cap that is not set leaves no room (the seam refuses it) → STAKE_BELOW_MIN naming dailyLoss", !unsetCap.ok && unsetCap.code === "STAKE_BELOW_MIN" && unsetCap.facts.binding === "dailyLoss", j(unsetCap));
  ok("5.16 · the bot's staff-chosen count used → STAFF_CHOSEN_PER_DAY", (EN.enterNowDecision(enIn({ bot: { staffChosenCountToday: 10 } })) as Any).code === "STAFF_CHOSEN_PER_DAY");
  ok("5.17 · the platform count not set → GLOBAL_STAFF_CHOSEN", (EN.enterNowDecision(enIn({ control: { gCapStaffChosenPerDay: null } })) as Any).code === "GLOBAL_STAFF_CHOSEN");
  ok("5.18 · an attributed player countered 5 times today → COUNTERPARTY_LIMIT", (EN.enterNowDecision(enIn({ counterparties: [{ userId: "usr_B", count: 5, tzs: 0 }] })) as Any).code === "COUNTERPARTY_LIMIT");
  const perTzs = EN.enterNowDecision(enIn({ control: { gCounterPerPlayerTzsPerDay: 2_000 } }));
  ok("5.19 · 2,000 TZS per player today → 6,000, binding counterpartyTzs", perTzs.ok && perTzs.stakeTzs === 6_000 && perTzs.binding === "counterpartyTzs", j(perTzs));
  ok("5.20 · …and the seam's H4 attribution of that stake stays within 2,000 each", perTzs.ok && CP.attributeStake(perTzs.stakeTzs, UX15.YES.accounts, 12_000).every((a: Any) => a.attributedTzs <= 2_000)
    && CP.attributeStake(7_000, UX15.YES.accounts, 12_000).some((a: Any) => a.attributedTzs > 2_000));
  const gap = EN.enterNowDecision(enIn({ bot: { placedAt: [at(-5)] } }));
  ok("5.21 · a bet 5 s ago with a 20 s gap → possibleAt now + 15 s, MIN_GAP", gap.ok && gap.possibleAt === at(15) && gap.possibleCode === "MIN_GAP", j(gap));
  const hour = EN.enterNowDecision(enIn({ bot: { freqMaxPerHour: 2, placedAt: [at(-3_000), at(-2_400), at(-600)] } }));
  ok("5.22 · 3 bets in the hour against 2 → frees when the 2nd-oldest ages out (now + 20 min), PER_HOUR binds last", hour.ok && hour.possibleAt === at(1_200) && hour.possibleCode === "PER_HOUR", j(hour));
  ok("5.23 · free now → possibleAt null", r.ok && r.possibleAt === null && r.possibleCode === null);
  const unsetRate = EN.enterNowDecision(enIn({ bot: { freqMinGapSec: null } }));
  ok("5.24 · a rate cap that is not set refuses with its code (never frees)", !unsetRate.ok && unsetRate.code === "MIN_GAP", j(unsetRate));
  const tie = EN.enterNowDecision(enIn({ bot: { stakeMaxTzs: 9_000 } }));
  ok("5.25 · a tie names the earlier term (room before stakeMax)", tie.ok && tie.binding === "room", j(tie));
  const rounding = EN.enterNowDecision(enIn({ pools: { YES: side({ ...UX15.YES, raw: 12_500, locked: 12_500 }), NO: UX15.NO } }));
  ok("5.26 · 9,500 of room floors to 9,000 at round-to 1,000", rounding.ok && rounding.stakeTzs === 9_000, j(rounding));
});

/* ═══ §6 · the outcome table (PLAN §4.6, A7, A10, N1 §4.6) ═══════════════════════════════════════ */
section("§6 · the outcome table");
await guard("6", () => {
  const keys = Object.keys(OM.OUTCOME_TABLE);
  const expected = ["ok", ...BP.BET_PATH_REASONS, ...BP.BET_PATH_BARE_CODES.map((c: string) => `code:${c}`)];
  ok("6.1 · one row per reason, bare code and ok — no more, no fewer", keys.length === expected.length && expected.every((k) => keys.includes(k)), `${keys.length} vs ${expected.length}`);
  ok("6.2 · an unknown reason has no key (A10 UNMAPPED)", OM.outcomeKey({ ok: false, code: "INVALID", reason: "house_reason_from_the_future" }) === null);
  ok("6.3 · a bare BUSY maps to code:BUSY; a reason spelled like a bare key does not", OM.outcomeKey({ ok: false, code: "BUSY" }) === "code:BUSY" && OM.outcomeKey({ ok: false, code: "BUSY", reason: "code:BUSY" }) === null);
  const row = (k: string) => (OM.OUTCOME_TABLE as Any)[k];
  ok("6.4 · A7: bounds that moved → SKIPPED(STAKE_BOUNDS_CHANGED), no alert", row("stake_below_min").reasonCode === "STAKE_BOUNDS_CHANGED" && !row("stake_below_min").alert && row("stake_above_max").reasonCode === "STAKE_BOUNDS_CHANGED");
  ok("6.5 · A7: a stake that is not whole → FAILED + AlertOnce", row("stake_not_whole").status === "FAILED" && row("stake_not_whole").alert === "stakeNotWhole");
  ok("6.6 · N1: stale → EXPIRED(STALE); blackout → SKIPPED(INFO_BLACKOUT); concentration → SKIPPED(COUNTERPARTY_CONCENTRATION)",
    row("house_intent_stale").status === "EXPIRED" && row("house_intent_stale").reasonCode === "STALE" && row("house_info_blackout").reasonCode === "INFO_BLACKOUT" && row("house_counterparty_concentration").reasonCode === "COUNTERPARTY_CONCENTRATION");
  ok("6.7 · an invalid side and a key mismatch stop the engine (SECURITY + master OFF)", row("market_not_live").engineFault === true && row("house_key_mismatch").engineFault === true);
  ok("6.8 · a trigger exit puts the trigger in the penalty box", row("house_trigger_gone").penalty === true && row("house_trigger_gone").reasonCode === "TRIGGER_EXITED");
  const transient = keys.filter((k) => row(k).kind === "transient").sort();
  ok("6.9 · the transient rows are exactly BUSY, rate_limited, gate unreadable and system_busy", j(transient) === j(["code:BUSY", "house_gate_unreadable", "rate_limited", "system_busy"]), j(transient));
  const codes = keys.filter((k) => row(k).kind === "terminal").map((k) => row(k).reasonCode);
  ok("6.10 · every terminal code is an EngineCode", codes.every((c) => K.isEngineCode(c)), j(codes.filter((c) => !K.isEngineCode(c))));
  ok("6.11 · account_blocked re-reads the account; consent stale recomputes the causes (A10, A3)", row("account_blocked").kind === "rereadAccount" && row("house_consent_stale").kind === "rereadConsent");
});

/* ═══ §7 · decide (PLAN F4, A11, A12, A15, A16, N2 §4) ═══════════════════════════════════════════ */
section("§7 · decide");
const ALL_DAYS = CLOCK.WEEKDAYS ?? ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
function rulesOf(o: Any = {}): Any {
  const base = R.DEFAULT_RULES_V1({ stakeBounds: { minTzs: 1_000, maxTzs: 1_000_000 } });
  return merge(merge(base, {
    scope: { products: { updown: true, polls: true }, chains: ["BTC:5"], categories: ["weather"], skipPollsClosingWithinMin: 0, poolTotalMinTzs: 0, poolTotalMaxTzs: null },
    modes: { updown: { counter: true, fill: true, opener: true }, polls: { counter: true, fill: true, opener: true } },
    counter: { delayMinSec: 15, delayMaxSec: 45, reactProbabilityPct: 100, triggerStakeMinTzs: 1_000, triggerStakeMaxTzs: 200_000, amount: { kind: "PCT", pct: 80 } },
    fill: { leadUdSec: 45, leadPollsMin: 30, targetThinSharePct: 40, jitterSec: 0 },
    shaping: { roundToTzs: 1_000, jitterPct: 0 },
    guards: { noReactZoneUdSec: 0, noReactZonePollsMin: 0, minTimeToCutoffUdSec: 10, minTimeToCutoffPollsMin: 1 },
    schedule: { days: ALL_DAYS, allDay: true, windows: [] },
    targeting: { enabled: true },
  }), o);
}
function botOf(o: Any = {}): Any {
  return merge({ botId: "hb_a", botUserId: "usr_bot_a", label: "Bot A", rules: rulesOf(), stakeMinTzs: 1_000, stakeMaxTzs: 100_000, capOpenExposureTzs: 1e6,
    openExposure: 0, lastPlacedAt: null, scopeFrom: at(-86_400), marketHeld: false, capPrecheck: null, reactRoll: 1 }, o);
}
const minRand = (min: number) => min;
function ctrIn(o: Any = {}): Any {
  return merge({
    view: MV.projectMarketView(viewRow()),
    trigger: { positionId: "pos_t1", userId: "usr_p1", handle: "Player #A3F2K8", side: "YES", stakeTzs: 10_000, placedAt: at(-1) },
    filtered: null, globalScopeFrom: at(-86_400), bots: [botOf()], target: null,
    pools: { YES: side({ raw: 10_000, nonHouse: 10_000 }), NO: side() }, price: null, blocked: false, bounds: { min: 1_000, max: 1_000_000 }, passNow: NOW,
  }, o);
}
await guard("7", () => {
  const c = DE.decideCounter(ctrIn(), { randomInt: minRand });
  ok("7.1 · untargeted COUNTER: held to the player's exit (placed + 5 min) with NO lock margin", c.row && c.row.status === "PENDING" && c.row.dueAt === at(-1 + 300) && c.row.side === "NO", j(c.row));
  ok("7.2 · …80% of 10,000 = 8,000; stale 600 s after due; held recorded", c.row && c.row.stakeTzs === 8_000 && c.row.staleAt === at(-1 + 300 + 600) && c.row.decision.held === true, j(c.row));
  const tgt = { targetId: "hbt_1", houseBotId: "hb_a", delayMinSec: 10, delayMaxSec: 10, timingFrom: "STAKE", reactTo: "FIRST", effectiveFrom: at(-100), drawnDelaySec: 10, lockedAtDue: 10_000, staffChosenRoomTzs: 1_000_000_000 };
  const t = DE.decideCounter(ctrIn({ target: tgt }), { randomInt: minRand });
  ok("7.3 · targeted COUNTER: held to the exit + LOCK_MARGIN_MS, stale 60 s after", t.row && t.row.targetId === "hbt_1" && t.row.dueAt === at(-1 + 307) && t.row.staleAt === at(-1 + 367) && t.row.decision.lockMarginMs === 7_000, j(t.row));
  // N2-E1 · a target reacts only to stakes placed at or after its effectiveFrom (the arming delay); 7.3 is the control.
  const notYet = DE.decideCounter(ctrIn({ target: { ...tgt, effectiveFrom: at(5) } }), { randomInt: minRand });
  ok("7.3b · N2-E1 · a stake placed BEFORE the target's effectiveFrom is not a targeted reaction (no targetId on any row)",
    !notYet.row || notYet.row.targetId == null, j(notYet.row));
  const late = DE.decideCounter(ctrIn({ view: MV.projectMarketView(viewRow({ selectionClosedAt: at(-1 + 330) })) }), { randomInt: minRand });
  ok("7.4 · the exit hold passes the deadline while the delay alone fits → SKIPPED(EXIT_WINDOW_TOO_LATE)", late.row && late.row.status === "SKIPPED" && late.row.reasonCode === "EXIT_WINDOW_TOO_LATE", j(late.row));
  const cut = DE.decideCounter(ctrIn({ view: MV.projectMarketView(viewRow({ selectionClosedAt: at(-1 + 70) })) }), { randomInt: minRand });
  ok("7.5 · even the delay passes the deadline → SKIPPED(CUTOFF)", cut.row && cut.row.reasonCode === "CUTOFF", j(cut.row));

  const udView = (price: Any) => ({ view: MV.projectMarketView(viewRow({ productLine: "UPDOWN", selectionClosedAt: at(240), resolutionAt: at(900), exitGraceMin: 0, round: roundOf() })), price });
  const fresh = { price: 105, source: "observation", ageSec: 10 };
  ok("7.6 · A15: open 100, targets +10/−4, price +5 at 25% → UD_CLOSENESS (checked against BOTH targets)", DE.udCloseness(udView(fresh).view, fresh, 25) === "UD_CLOSENESS");
  const near = { price: 102, source: "observation", ageSec: 10 };
  const symmetric = MV.projectMarketView(viewRow({ productLine: "UPDOWN", round: roundOf({ downTarget: 90 }) }));
  ok("7.7 · ⭐ DISCRIMINATES · +2 is refused against +10/−4 (the down target binds) and allowed against +10/−10",
    DE.udCloseness(udView(near).view, near, 25) === "UD_CLOSENESS" && DE.udCloseness(symmetric, near, 25) === null);
  ok("7.8 · a 4-minute-old observation → UD_STALE_PRICE", DE.udCloseness(udView(null).view, { price: 100, source: "observation", ageSec: 240 }, 25) === "UD_STALE_PRICE");
  ok("7.9 · a 100 s vendor bar is fresh and close enough", DE.udCloseness(udView(null).view, { price: 100.5, source: "vendor_bar", ageSec: 100 }, 25) === null);
  ok("7.10 · no targets → UD_NO_PRICE", DE.udCloseness(MV.projectMarketView(viewRow({ productLine: "UPDOWN", round: roundOf({ upTarget: null }) })), fresh, 25) === "UD_NO_PRICE");

  /* 7.10a–7.10e · THE FLOOR UNDER THE CLOSENESS BAND (04 A15; UD_CLOSENESS_FLOOR_BPS).
     The fixture is PRODUCTION's own, read 2026-09-23: BTC/USD, `marginBps = 0`, so `computeTargets` froze
     the band at one tick — open 86,379.20, targets ±0.02. Before the floor these five all refused, which is
     why a switched-on, funded, correctly-scoped desk placed nothing for 23 hours. */
  const btcRound = (o: Any = {}) => MV.projectMarketView(viewRow({ productLine: "UPDOWN", selectionClosedAt: at(240), resolutionAt: at(900), exitGraceMin: 0,
    round: roundOf({ chainKey: "BTC:5", openPrice: 86_379.20, upTarget: 86_379.22, downTarget: 86_379.18, ...o }) }));
  const obs = (price: number) => ({ price, source: "observation", ageSec: 10 });
  // 86,379.20 × 5/10_000 = 43.1896 → at 25% the bot may sit within 10.797 of the open.
  ok("7.10a · ⭐ THE PRODUCTION SHAPE · a one-tick band (±0.02 on an open of 86,379.20) is floored to 43.19, so a $10 drift is ALLOWED at 25%",
    DE.udCloseness(btcRound(), obs(86_369.20), 25) === null);
  ok("7.10b · ⭐ DISCRIMINATES · the floor did NOT disable the guard — $50 of drift on the same round is still UD_CLOSENESS",
    DE.udCloseness(btcRound(), obs(86_329.20), 25) === "UD_CLOSENESS");
  ok("7.10c · the boundary binds on the floored band: 10.79 passes and 10.80 does not",
    DE.udCloseness(btcRound(), obs(86_379.20 - 10.79), 25) === null && DE.udCloseness(btcRound(), obs(86_379.20 - 10.80), 25) === "UD_CLOSENESS");
  /* ⛔ WITHOUT the floor this case is the whole finding: 100 is the HIGHEST `closenessPct` the field admits
     (`FIELD_META["updown.closenessPct"]` is 0–100), and at 100 a one-tick band still only tolerated 0.02. */
  ok("7.10d · ⭐ NO OFFICER SETTING COULD HAVE FIXED IT · at closenessPct 100, the field's maximum, a $10 drift is allowed only because of the floor",
    DE.udCloseness(btcRound(), obs(86_369.20), 100) === null);
  /* A FLOOR, NEVER A CAP: XAU/USD 15-min's real 5-bps band (2.16 on 4,323.36) exceeds the floor of 2.1617
     by a hair, and the suites' own 4-on-100 band exceeds it 80×; both must keep deciding for themselves. */
  ok("7.10e · ⭐ A FLOOR, NOT A CAP · a band that already describes its asset still binds — 4 on an open of 100 refuses +5 exactly as before",
    DE.udCloseness(udView(fresh).view, fresh, 25) === "UD_CLOSENESS");
  const udRow = DE.decideCounter(ctrIn(udView(fresh)), { randomInt: minRand });
  ok("7.11 · the Up & Down COUNTER records its closeness skip", udRow.row && udRow.row.reasonCode === "UD_CLOSENESS", j(udRow.row));

  ok("7.12 · a demo market → no row", DE.decideCounter(ctrIn({ view: MV.projectMarketView(viewRow({ titleEn: "Demo · x" })) }), { randomInt: minRand }).row === null);
  const noRound = DE.decideCounter(ctrIn({ view: MV.projectMarketView(viewRow({ productLine: "UPDOWN" })) }), { randomInt: minRand });
  ok("7.13 · an Up & Down market with no round → no row, code UD_NO_ROUND for the alert", noRound.row === null && noRound.code === "UD_NO_ROUND");
  const reopened = DE.decideCounter(ctrIn({ view: MV.projectMarketView(viewRow({ reopenedAt: at(-50) })) }), { randomInt: minRand });
  ok("7.14 · A16: a reopened market → SKIPPED(MARKET_REOPENED)", reopened.row && reopened.row.reasonCode === "MARKET_REOPENED", j(reopened.row));
  ok("7.15 · A11: a stake placed before switch-on → no row", DE.decideCounter(ctrIn({ globalScopeFrom: at(0) }), { randomInt: minRand }).row === null);
  ok("7.16 · A11: a stake placed before the bot's Start → no row", DE.decideCounter(ctrIn({ bots: [botOf({ scopeFrom: at(0) })] }), { randomInt: minRand }).row === null);

  const bots = [botOf({ botId: "hb_b", openExposure: 500_000 }), botOf({ botId: "hb_c", openExposure: 100_000, lastPlacedAt: at(-10) }), botOf({ botId: "hb_d", openExposure: 100_000, lastPlacedAt: at(-60) })];
  ok("7.17 · PLAN §4.4 bot choice: lowest exposure share, then least recent bet, then id", j(DE.orderBots(bots).map((b: Any) => b.botId)) === j(["hb_d", "hb_c", "hb_b"]));
  // Ruling 164 · the react roll is the CALLER's, drawn once per pass per bot. `reactProbabilityPct` defaults to 60.
  const at60 = () => rulesOf({ counter: { reactProbabilityPct: 60 } });
  const rollAt = (roll: Any) => DE.decideCounter(ctrIn({ bots: [botOf({ reactRoll: roll, rules: at60() })] }), { randomInt: minRand });
  ok("7.37 · ⭐ ruling 164 · a react roll ABOVE the bot's probability → SKIPPED(NOT_REACTING)",
    rollAt(61).row?.status === "SKIPPED" && rollAt(61).row?.reasonCode === "NOT_REACTING", j(rollAt(61).row));
  ok("7.38 · …the boundary reacts: a roll EQUAL to the probability is a COUNTER, and 1 is too",
    rollAt(60).row?.status === "PENDING" && rollAt(60).row?.kind === "COUNTER" && rollAt(1).row?.status === "PENDING",
    j({ at60: rollAt(60).row?.status, at1: rollAt(1).row?.status }));
  ok("7.39 · ⛔ a bot that reaches its roll WITHOUT one throws — the pure decision never draws it itself",
    (() => {
      const noRoll = botOf({ rules: at60() });
      delete noRoll.reactRoll; // `merge` keeps the default when a key is undefined, so the key itself has to go
      try { DE.decideCounter(ctrIn({ bots: [noRoll] }), { randomInt: minRand }); return false; }
      catch (e) { return /reactRoll is drawn by the caller/.test(String((e as Error).message)); }
    })());
  const boxed = DE.decideCounter(ctrIn({ filtered: "PENALTY_BOX" }), { randomInt: minRand });
  ok("7.18 · a penalty-boxed trigger leaves ONE SKIPPED(PENALTY_BOX) row", boxed.row && boxed.row.status === "SKIPPED" && boxed.row.reasonCode === "PENALTY_BOX", j(boxed.row));
  const heldTarget = DE.decideCounter(ctrIn({ target: tgt, bots: [botOf({ marketHeld: true }), botOf({ botId: "hb_z" })] }), { randomInt: minRand });
  ok("7.19 · N2 §4: the target candidate fails, a scope bot reacts, and records targetSkipped", heldTarget.row && heldTarget.row.houseBotId === "hb_z" && heldTarget.row.targetId === null && heldTarget.row.decision.targetSkipped?.code === "MARKET_HELD", j(heldTarget.row));
  const allHeld = DE.decideCounter(ctrIn({ target: tgt, bots: [botOf({ marketHeld: true })] }), { randomInt: minRand });
  ok("7.20 · …none eligible: the SKIPPED row carries the target's code and targetId", allHeld.row && allHeld.row.reasonCode === "MARKET_HELD" && allHeld.row.targetId === "hbt_1", j(allHeld.row));
  const blockedTarget = DE.decideCounter(ctrIn({ target: tgt, blocked: true, bots: [botOf()] }), { randomInt: minRand });
  ok("7.21 · a blackout stops the target (INFO_BLACKOUT)", blockedTarget.row && blockedTarget.row.reasonCode === "INFO_BLACKOUT", j(blockedTarget.row));
  const blockedAuto = DE.decideCounter(ctrIn({ blocked: true }), { randomInt: minRand });
  ok("7.22 · …but never an untargeted COUNTER (the blackout is for staff-chosen rows only)", blockedAuto.row && blockedAuto.row.status === "PENDING", j(blockedAuto.row));
  const lateSweep = DE.decideCounter(ctrIn({ passNow: at(2_000) }), { randomInt: minRand });
  ok("7.23 · a sweep that finds a trigger past its staleAt writes EXPIRED(STALE)", lateSweep.row && lateSweep.row.status === "EXPIRED" && lateSweep.row.reasonCode === "STALE", j(lateSweep.row));
  let drew = false;
  ok("7.24 · a fixed target delay never calls the RNG", DE.drawTargetDelay({ delayMinSec: 12, delayMaxSec: 12 }, () => { drew = true; return 0; }) === 12 && !drew);

  const fillIn = (o: Any = {}) => merge({ view: MV.projectMarketView(viewRow()), bot: botOf(), pools: { YES: side({ raw: 10_000, nonHouse: 10_000, locked: 10_000 }), NO: side({ raw: 1_000, nonHouse: 1_000, locked: 1_000 }) },
    price: null, bounds: { min: 1_000, max: 1_000_000 }, globalScopeFrom: at(-86_400), passNow: NOW }, o);
  const fill = DE.planFill(fillIn(), { randomInt: minRand });
  ok("7.25 · FILL: thin NO up to 40% of locked YES → floor(10,000·40/60) − 1,000 = 5,666 → 5,000 at round-to", fill.row && fill.row.kind === "FILL" && fill.row.side === "NO" && fill.row.stakeTzs === 5_000, j(fill.row));
  ok("7.26 · …due at cutoff − lead", fill.row && fill.row.dueAt === at(7_200 - 1_800), j(fill.row));
  ok("7.27 · FILL with no locked money on the other side → no row", DE.planFill(fillIn({ pools: { YES: side({ raw: 10_000, nonHouse: 10_000, unlocked: 10_000 }), NO: side({ raw: 1_000 }) } }), { randomInt: minRand }).row === null);
  const openIn = (o: Any = {}) => merge(fillIn({ pools: { YES: side(), NO: side() } }), o);
  const opener = DE.planOpener({ ...openIn(), openerSide: "NO" }, { randomInt: minRand });
  ok("7.28 · OPENER: both pools 0 → the drawn side", opener.row && opener.row.kind === "OPENER" && opener.row.side === "NO", j(opener.row));
  ok("7.29 · OPENER never plans once a pool has money", DE.planOpener({ ...fillIn(), openerSide: "NO" }, { randomInt: minRand }).row === null);
  ok("7.30 · A11: OPENER only when bettableFrom is inside scope", DE.planOpener({ ...openIn({ globalScopeFrom: at(0) }), openerSide: "NO" }, { randomInt: minRand }).row === null);

  // Ruling 92 · a NULL scope start is OUT of scope, never "no bound". Each has a control that decides with the scope set.
  ok("7.31 · ruling 92 · never switched on (global scopeFrom NULL) → no COUNTER row; CONTROL: set → a row",
    DE.decideCounter(ctrIn({ globalScopeFrom: null }), { randomInt: minRand }).row === null && DE.decideCounter(ctrIn(), { randomInt: minRand }).row != null);
  ok("7.32 · …a bot never Started (its scopeFrom NULL) is out of scope → no row",
    DE.decideCounter(ctrIn({ bots: [botOf({ scopeFrom: null })] }), { randomInt: minRand }).row === null);
  ok("7.33 · …FILL with the bot's scopeFrom NULL → no row; CONTROL: set → a row",
    DE.planFill(fillIn({ bot: botOf({ scopeFrom: null }) }), { randomInt: minRand }).row === null && DE.planFill(fillIn(), { randomInt: minRand }).row != null);
  ok("7.34 · …OPENER with global scopeFrom NULL → no row", DE.planOpener({ ...openIn({ globalScopeFrom: null }), openerSide: "NO" }, { randomInt: minRand }).row === null);

  /* ━━ 2026-09-23 · THE EIGHTEEN REFUSALS THAT HAD NO NAME ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   * Every case above this line asserts `.row === null` — which is the defect, stated by the tests themselves.
   * A null row says "not this market" and stops. `planFill` and `planOpener` had EIGHTEEN refusal points and
   * every one returned a null CODE beside it, so an officer looking at an account with no bets could not tell
   * "there was nothing to stake on" from "four hundred markets were considered and every one refused". These
   * assert the REASON, which is the thing a desk can actually paint. */
  ok("7.34a · the three refusals that had no name at all: FILL before the account was Started, FILL with neither side thin, OPENER on a market that already holds money",
    DE.planFill(fillIn({ bot: botOf({ scopeFrom: null }) }), { randomInt: minRand }).code === "BEFORE_SCOPE"
      && DE.planFill(fillIn({ pools: { YES: side({ raw: 10_000, nonHouse: 10_000, unlocked: 10_000 }), NO: side({ raw: 1_000 }) } }), { randomInt: minRand }).code === "NO_THIN_SIDE"
      && DE.planOpener({ ...fillIn(), openerSide: "NO" }, { randomInt: minRand }).code === "MARKET_NOT_EMPTY",
    j({
      beforeScope: DE.planFill(fillIn({ bot: botOf({ scopeFrom: null }) }), { randomInt: minRand }).code,
      noThin: DE.planFill(fillIn({ pools: { YES: side({ raw: 10_000, nonHouse: 10_000, unlocked: 10_000 }), NO: side({ raw: 1_000 }) } }), { randomInt: minRand }).code,
      notEmpty: DE.planOpener({ ...fillIn(), openerSide: "NO" }, { randomInt: minRand }).code,
    }));
  ok("7.34b · …and a refusal that DID have a name elsewhere carries it here too, rather than collapsing to nothing: a market that is no longer live",
    DE.planFill(fillIn({ view: { status: "SETTLED" } }), { randomInt: minRand }).code === "MARKET_NOT_LIVE",
    j({ notLive: DE.planFill(fillIn({ view: { status: "SETTLED" } }), { randomInt: minRand }).code }));

  /* ⭐ THE CLAIM THE CONSOLE`S READ-ONLY WALK RESTS ON, HELD HERE RATHER THAN IN A COMMENT.
   * `explainBotIdle` walks the planner`s own ladder with `place: false` and SKIPS `openerSide`, because that
   * call INSERTS the audited, once-per-market draw and an officer opening a panel must not mint one. Skipping
   * it is sound for exactly one reason: `planOpener` reads the drawn side ONLY to fill the row it returns.
   * ⛔ THE DAY A SIDE-DEPENDENT REFUSAL IS ADDED, THIS FAILS — which is the point. Without it, the comment
   * over there is the only thing holding the panel honest, and a comment has never failed a build. */
  {
    const openSide = (sd: "YES" | "NO", o: Any = {}) => DE.planOpener({ ...openIn(o), openerSide: sd }, { randomInt: minRand });
    const yes = openSide("YES"), no = openSide("NO");
    const strip = (r: Any) => j({ ...r, side: null, why: null });
    const refYes = openSide("YES", { globalScopeFrom: null }), refNo = openSide("NO", { globalScopeFrom: null });
    ok("7.34c · the drawn side changes the ROW and never the ANSWER — same draws, both sides: the two rows differ in their side and in the sentence naming it, and in NOTHING else; a refusal answers the same code either way",
      yes.row != null && no.row != null && yes.row.side === "YES" && no.row.side === "NO"
        && strip(yes.row) === strip(no.row) && yes.row.why !== no.row.why
        && refYes.code === "BEFORE_SCOPE" && refNo.code === "BEFORE_SCOPE",
      j({ yes: yes.row, no: no.row, refYes: refYes.code, refNo: refNo.code }));
  }

  /* ⛔ AND THE SOURCE IS PINNED, because eighteen points is too many to hold by example: a nineteenth refusal
   * added tomorrow would be nameless again, and every behavioural case above would still pass. */
  {
    const decideSrc = decomment(readFileSync(join(ROOT, "src/lib/server/house-bot/decide.ts"), "utf8"));
    const NAMELESS = /return { row: null, code: null }/g;
    ok("7.34d · not one refusal in decide.ts returns a nameless code — eighteen of them did; CONTROL: the same pattern IS found in a planted line, so a zero here means absence and not a broken pattern",
      (decideSrc.match(NAMELESS) ?? []).length === 0
        && ("  return { row: null, code: null };".match(NAMELESS) ?? []).length === 1
        && decideSrc.length > 5_000,
      j({ nameless: (decideSrc.match(NAMELESS) ?? []).length, bytes: decideSrc.length }));
  }
  const tdStake = DE.targetDueAt({ placedAtMs: 0, exitCloseAtMs: 300_000, timingFrom: "STAKE", delaySec: 10 });
  const tdExit = DE.targetDueAt({ placedAtMs: 0, exitCloseAtMs: 300_000, timingFrom: "EXIT_CLOSE", delaySec: 10 });
  ok("7.35 · ruling 108 · one due-time formula: STAKE 10 s on a 5-min exit → requested 0:10, held to 5:07; EXIT_CLOSE 10 s → 5:10",
    tdStake.requestedMs === 10_000 && tdStake.dueMs === 307_000 && tdExit.requestedMs === 310_000 && tdExit.dueMs === 310_000, j({ tdStake, tdExit }));
  const tgtTwo = DE.decideCounter(ctrIn({ target: { ...tgt, timingFrom: "EXIT_CLOSE" } }), { randomInt: minRand });
  ok("7.36 · …and decideCounter uses it: a targeted EXIT_CLOSE 10 s reaction is due at the exit + 10 s", tgtTwo.row?.dueAt === at(-1 + 310), j(tgtTwo.row));
});

/* ═══ §7b · THE RULE LEAVES NO SUITE PINNED (2026-09-23 · register B6) ═══════════════════════════
 *
 * ⛔ WHAT THE AUDIT FOUND, AND WHY IT IS A GAP AND NOT A STYLE POINT. The engine reads 29 numeric leaves.
 * Before today the only instrument that moved most of them was `qa:house-bot-fleet` — a whole-engine drive
 * on a real database — so a leaf could be dropped from `decide.ts` and every `test:` suite stayed green. A
 * pure case per leaf is what makes the DEFECT, not the drive, the thing that goes red.
 * ⛔ EVERY CASE HERE IS A PAIR: the value that REFUSES and the value one step away that ALLOWS. A single-sided
 * case passes just as well when the rule is deleted and the answer happens to be "no row" for another reason
 * — which is exactly how these leaves came to be unmeasured while the suites read 756 green.
 * ⚠️ THE ARITHMETIC IS WRITTEN OUT at each case, from the fixture's own clock: the market cutoff is T0+7,200 s,
 * the trigger is placed at T0−1 s, and a round locks at T0+240 s.
 */
await guard("7b", () => {
  /* The two fixtures §7 keeps inside its own guard, rebuilt here so this block stands alone. */
  const fillIn = (o: Any = {}) => merge({ view: MV.projectMarketView(viewRow()), bot: botOf(), pools: { YES: side({ raw: 10_000, nonHouse: 10_000, locked: 10_000 }), NO: side({ raw: 1_000, nonHouse: 1_000, locked: 1_000 }) },
    price: null, bounds: { min: 1_000, max: 1_000_000 }, globalScopeFrom: at(-86_400), passNow: NOW }, o);
  const openIn = (o: Any = {}) => merge(fillIn({ pools: { YES: side(), NO: side() } }), o);
  const maxRand = (_min: number, max: number) => max;
  /** An RNG that RECORDS what it was asked for — the only way a draw's own bounds can be asserted. */
  const recorder = (pick: "min" | "max" = "max") => {
    const calls: Array<[number, number]> = [];
    const fn = (min: number, max: number) => { calls.push([min, max]); return pick === "max" ? max : min; };
    return { calls, fn };
  };
  const counterWith = (rules: Any, o: Any = {}, rng: Any = minRand) =>
    DE.decideCounter(ctrIn({ bots: [botOf({ rules: rulesOf(rules) })], ...o }), { randomInt: rng });
  const codeOf = (r: Any): Any => r.row?.reasonCode ?? (r.row?.status === "PENDING" ? "PENDING" : r.row?.status ?? "no-row");
  /* An Up & Down view whose closeness PASSES (open 100, targets ±10, price 102 at 25%), so a UD case measures
     the leaf it names and not the price gate. Its round locks at T0+240 s. */
  const udFresh = { price: 102, source: "observation", ageSec: 10 };
  const udView = () => MV.projectMarketView(viewRow({ productLine: "UPDOWN", selectionClosedAt: at(240), resolutionAt: at(900), exitGraceMin: 0, round: roundOf({ downTarget: 90 }) }));

  /* ── the no-react zone, in BOTH units ─────────────────────────────────────────────────────────── */
  /* polls: the zone is minutes. cutoff T0+7,200 s, trigger T0−1 s → the zone bites at 7,201 s = 120.02 min. */
  ok("7b.1 · guards.noReactZonePollsMin · a zone that reaches the trigger is NO_REACT_ZONE, and one minute less is a bet — the band edge, in MINUTES",
    codeOf(counterWith({ guards: { noReactZonePollsMin: 121 } })) === "NO_REACT_ZONE"
      && codeOf(counterWith({ guards: { noReactZonePollsMin: 120 } })) === "PENDING",
    j({ over: codeOf(counterWith({ guards: { noReactZonePollsMin: 121 } })), under: codeOf(counterWith({ guards: { noReactZonePollsMin: 120 } })) }));
  /* Up & Down: the same leaf in SECONDS, against a round that locks at T0+240 s. */
  ok("7b.2 · guards.noReactZoneUdSec · the same guard in SECONDS on a round: 241 refuses, 240 bets — so the two units cannot be swapped without a red",
    codeOf(counterWith({ guards: { noReactZoneUdSec: 241 } }, { view: udView(), price: udFresh })) === "NO_REACT_ZONE"
      && codeOf(counterWith({ guards: { noReactZoneUdSec: 240 } }, { view: udView(), price: udFresh })) === "PENDING",
    j({ over: codeOf(counterWith({ guards: { noReactZoneUdSec: 241 } }, { view: udView(), price: udFresh })) }));

  /* ── the pool band, with its edges ───────────────────────────────────────────────────────────── */
  /* the fixture's raw pools are 10,000 + 0. */
  ok("7b.3 · scope.poolTotalMinTzs / MaxTzs · the band is INCLUSIVE at both ends: a total equal to the minimum bets, one TZS under is POOL_BAND",
    codeOf(counterWith({ scope: { poolTotalMinTzs: 10_000 } })) === "PENDING"
      && codeOf(counterWith({ scope: { poolTotalMinTzs: 10_001 } })) === "POOL_BAND",
    j({ at: codeOf(counterWith({ scope: { poolTotalMinTzs: 10_000 } })), over: codeOf(counterWith({ scope: { poolTotalMinTzs: 10_001 } })) }));
  ok("7b.4 · …and the ceiling the same way: equal to the maximum bets, one TZS over is POOL_BAND — with a NULL maximum meaning no ceiling at all",
    codeOf(counterWith({ scope: { poolTotalMaxTzs: 10_000 } })) === "PENDING"
      && codeOf(counterWith({ scope: { poolTotalMaxTzs: 9_999 } })) === "POOL_BAND"
      && codeOf(counterWith({ scope: { poolTotalMaxTzs: null } })) === "PENDING",
    j({ at: codeOf(counterWith({ scope: { poolTotalMaxTzs: 10_000 } })), under: codeOf(counterWith({ scope: { poolTotalMaxTzs: 9_999 } })) }));

  /* ── closing-soon, and the control that it gates POLLS only ──────────────────────────────────── */
  ok("7b.5 · scope.skipPollsClosingWithinMin · 121 minutes reaches a poll closing in 120.02 and is CUTOFF; 120 does not — and the SAME rule leaves a round alone, which is why it belongs to the Counter section and not to Scope",
    codeOf(counterWith({ scope: { skipPollsClosingWithinMin: 121 } })) === "CUTOFF"
      && codeOf(counterWith({ scope: { skipPollsClosingWithinMin: 120 } })) === "PENDING"
      && codeOf(counterWith({ scope: { skipPollsClosingWithinMin: 121 } }, { view: udView(), price: udFresh })) === "PENDING",
    j({ polls: codeOf(counterWith({ scope: { skipPollsClosingWithinMin: 121 } })), ud: codeOf(counterWith({ scope: { skipPollsClosingWithinMin: 121 } }, { view: udView(), price: udFresh })) }));

  /* ── the trigger-stake band, inclusive at both edges ─────────────────────────────────────────── */
  /* ⛔ THE ANSWER IS 100% OF THE TRIGGER HERE, AND THAT IS NOT COSMETIC. 🔴 Measured on this case's first run:
     at the default 80%, a trigger exactly at the 1,000 floor produces an 800 answer, which is below the bot's
     own 1,000 minimum stake — so the row came back STAKE_BELOW_MIN and the case reported the BAND as broken
     when the band was right. A case whose edge value is decided by a different leaf measures that leaf. */
  const trig = (stakeTzs: number) => codeOf(DE.decideCounter(ctrIn({ trigger: { positionId: "pos_t1", userId: "usr_p1", handle: "Player #A3F2K8", side: "YES", stakeTzs, placedAt: at(-1) }, pools: { YES: side({ raw: stakeTzs, nonHouse: stakeTzs }), NO: side() }, bots: [botOf({ rules: rulesOf({ scope: { poolTotalMinTzs: 0, poolTotalMaxTzs: null }, counter: { amount: { kind: "PCT", pct: 100 } } }) })] }), { randomInt: minRand }));
  ok("7b.6 · counter.triggerStakeMin/MaxTzs · the band is INCLUSIVE: a stake exactly at the floor and exactly at the ceiling are both answered, one either side is TRIGGER_STAKE_RANGE",
    trig(1_000) === "PENDING" && trig(200_000) === "PENDING"
      && trig(999) === "TRIGGER_STAKE_RANGE" && trig(200_001) === "TRIGGER_STAKE_RANGE",
    j({ floor: trig(1_000), ceiling: trig(200_000), under: trig(999), over: trig(200_001) }));

  /* ── the delay draw, and the amount shaping ──────────────────────────────────────────────────── */
  /* ⛔ THE EXIT HOLD IS TURNED OFF for this one (grace 0), or the due time is the exit close and the draw is
     invisible — which is how a delay range could have been read from the wrong leaves and nothing gone red. */
  const noHold = { view: MV.projectMarketView(viewRow({ exitGraceMin: 0 })) };
  const drawRec = recorder("max");
  const drawn = counterWith({ counter: { delayMinSec: 15, delayMaxSec: 45 } }, noHold, drawRec.fn);
  const drawnMin = counterWith({ counter: { delayMinSec: 15, delayMaxSec: 45 } }, noHold, minRand);
  ok("7b.7 · counter.delayMin/MaxSec · the wait is DRAWN between the two leaves — the RNG is asked for exactly (15, 45), and the due time moves with what it answers: T0+44 s at the top, T0+14 s at the bottom",
    j(drawRec.calls[0]) === j([15, 45]) && drawn.row?.dueAt === at(-1 + 45) && drawnMin.row?.dueAt === at(-1 + 15),
    j({ asked: drawRec.calls[0], max: drawn.row?.dueAt, min: drawnMin.row?.dueAt }));
  const jitterRec = recorder("max");
  const jittered = counterWith({ counter: { amount: { kind: "PCT", pct: 80 } }, shaping: { jitterPct: 10, roundToTzs: 100 } }, {}, jitterRec.fn);
  ok("7b.8 · shaping.jitterPct · the amount is moved by a draw over ±the leaf — asked for exactly (−10, 10), and 80% of 10,000 at +10% is 8,800 once rounded to 100",
    j(jitterRec.calls.find((c: Any) => c[0] < 0)) === j([-10, 10]) && jittered.row?.stakeTzs === 8_800,
    j({ asked: jitterRec.calls, stake: jittered.row?.stakeTzs }));
  const fixed = counterWith({ counter: { amount: { kind: "FIXED", fixedTzs: 4_000 } } });
  ok("7b.9 · counter.amount FIXED · the same amount whatever the player staked — 4,000 against a 10,000 trigger, where the PCT arm would have answered 8,000",
    fixed.row?.stakeTzs === 4_000 && counterWith({}).row?.stakeTzs === 8_000,
    j({ fixed: fixed.row?.stakeTzs, pct: counterWith({}).row?.stakeTzs }));
  ok("7b.10 · shaping.roundToTzs · the amount is floored to the step, never rounded up: 80% of 10,000 = 8,000 at a 3,000 step is 6,000",
    counterWith({ shaping: { roundToTzs: 3_000 } }).row?.stakeTzs === 6_000, j(counterWith({ shaping: { roundToTzs: 3_000 } }).row?.stakeTzs));

  /* ── min time to cutoff, at decide ──────────────────────────────────────────────────────────── */
  ok("7b.11 · guards.minTimeToCutoffUdSec · the deadline is the cutoff MINUS this leaf: at 230 s of a round that locks at T0+240 the due T0+14 is past it and the row is CUTOFF; at 225 the same bet stands",
    codeOf(counterWith({ guards: { minTimeToCutoffUdSec: 230 } }, { view: udView(), price: udFresh })) === "CUTOFF"
      && codeOf(counterWith({ guards: { minTimeToCutoffUdSec: 225 } }, { view: udView(), price: udFresh })) === "PENDING",
    j({ tight: codeOf(counterWith({ guards: { minTimeToCutoffUdSec: 230 } }, { view: udView(), price: udFresh })) }));

  /* ── the schedule, at decide, in EAT ────────────────────────────────────────────────────────── */
  /* ⛔ THE DAY IS DERIVED FROM THE FIXTURE'S OWN CLOCK, never typed: T0 is 12:00 EAT. */
  const today = CLOCK.eatWeekday(T0);
  const tomorrow = ALL_DAYS[(ALL_DAYS.indexOf(today) + 1) % 7];
  ok("7b.12 · schedule.days · a day the account may bet is answered and a day it may not is OUTSIDE_SCHEDULE — the day taken from the fixture's own EAT clock, not typed here",
    codeOf(counterWith({ schedule: { days: [today], allDay: true, windows: [] } })) === "PENDING"
      && codeOf(counterWith({ schedule: { days: [tomorrow], allDay: true, windows: [] } })) === "OUTSIDE_SCHEDULE",
    j({ today, tomorrow }));
  /* ⛔ AND THE WINDOW IS READ IN **EAT** MINUTES, WHICH IS THE WHOLE POINT OF THE DISCRIMINATOR BELOW.
     T0 is 09:00 UTC and 12:00 EAT. A window of 11:00–13:00 must CONTAIN it and a window of 09:00–10:00 must
     NOT — an implementation that read the clock in UTC gets both backwards. */
  const win = (startMin: number, endMin: number) =>
    codeOf(counterWith({ schedule: { days: [today], allDay: false, windows: [{ startMin, endMin }] } }));
  ok("7b.13 · schedule.windows · ⭐ THE UTC DISCRIMINATOR · 11:00→13:00 EAT contains a trigger at 12:00 EAT and 09:00→10:00 does not — the same instant is 09:00 UTC, so a window read in UTC answers both the wrong way round",
    win(11 * 60, 13 * 60) === "PENDING" && win(9 * 60, 10 * 60) === "OUTSIDE_SCHEDULE",
    j({ eatWindow: win(11 * 60, 13 * 60), utcLookalike: win(9 * 60, 10 * 60) }));
  ok("7b.14 · schedule.allDay · All day on the right day bets at any hour, and a schedule with no day at all never bets — an unreadable schedule is a refusal, never an open door",
    codeOf(counterWith({ schedule: { days: [today], allDay: true, windows: [] } })) === "PENDING"
      && codeOf(counterWith({ schedule: { days: [], allDay: true, windows: [] } })) === "OUTSIDE_SCHEDULE", "");
  /**
   * ⭐ AND THE INSTANT IT IS JUDGED AT IS THE DUE TIME (2026-09-23 · the owner decision recorded in §5).
   *
   * The trigger is placed at T0−1 s and, with the fixture's 5-minute exit grace, the bet is DUE at T0+299 s.
   * A window that opens at 12:05 EAT (T0+300 s is 12:05:00) therefore contains the DUE instant and not the
   * placed one: a COUNTER judged at `placedMs` refuses it, and one judged at `dueMs` answers it. This is the
   * case that tells the two readings apart, and it is the direction the change widens.
   */
  const dueInWindow = codeOf(counterWith({ schedule: { days: [today], allDay: false, windows: [{ startMin: 12 * 60 + 4, endMin: 13 * 60 }] } }));
  ok("7b.15 · ⛔ THE SCHEDULE IS JUDGED AT THE DUE INSTANT, NOT AT THE TRIGGER'S · a window opening at 12:04 EAT answers a stake placed at 11:59:59 whose bet is DUE at 12:04:59 — judged at the placed instant this row would not exist",
    dueInWindow === "PENDING", j({ verdict: dueInWindow }));

  /* ── FILL: the lead in both units, and the jitter draw ──────────────────────────────────────── */
  const udFill = (o: Any = {}) => fillIn(merge({ view: udView(), price: udFresh }, o));
  ok("7b.16 · fill.leadUdSec · a round is filled `lead` seconds before it locks: 45 s before T0+240 is T0+195, and 90 s before it is T0+150",
    DE.planFill(udFill({ bot: botOf({ rules: rulesOf({ fill: { leadUdSec: 45 } }) }) }), { randomInt: minRand }).row?.dueAt === at(240 - 45)
      && DE.planFill(udFill({ bot: botOf({ rules: rulesOf({ fill: { leadUdSec: 90 } }) }) }), { randomInt: minRand }).row?.dueAt === at(240 - 90),
    j(DE.planFill(udFill(), { randomInt: minRand }).row?.dueAt));
  ok("7b.17 · fill.leadPollsMin · and a poll `lead` MINUTES before its cutoff: 30 min before T0+7,200 s is T0+5,400 s, 45 min is T0+4,500 s — the two units cannot be swapped without a red",
    DE.planFill(fillIn({ bot: botOf({ rules: rulesOf({ fill: { leadPollsMin: 30 } }) }) }), { randomInt: minRand }).row?.dueAt === at(7_200 - 1_800)
      && DE.planFill(fillIn({ bot: botOf({ rules: rulesOf({ fill: { leadPollsMin: 45 } }) }) }), { randomInt: minRand }).row?.dueAt === at(7_200 - 2_700), "");
  const fillRec = recorder("max");
  const jitterFill = DE.planFill(fillIn({ bot: botOf({ rules: rulesOf({ fill: { leadPollsMin: 30, jitterSec: 60 } }) }) }), { randomInt: fillRec.fn });
  ok("7b.18 · fill.jitterSec · the jitter is DRAWN over (0, the leaf) and SUBTRACTED from the due time — asked for exactly (0, 60), and 60 s earlier than the unjittered T0+5,400 is T0+5,340",
    j(fillRec.calls[0]) === j([0, 60]) && jitterFill.row?.dueAt === at(7_200 - 1_800 - 60),
    j({ asked: fillRec.calls[0], due: jitterFill.row?.dueAt }));
  ok("7b.19 · …and a zero jitter never asks the RNG at all — a draw consumed on a bot that does not jitter shifts every later draw on the pass",
    (() => { const r = recorder("max"); DE.planFill(fillIn({ bot: botOf({ rules: rulesOf({ fill: { jitterSec: 0 } }) }) }), { randomInt: r.fn }); return r.calls.length === 0; })(), "");

  /* ── FILL and OPENER read the Up & Down closeness ───────────────────────────────────────────── */
  const farPrice = { price: 108, source: "observation", ageSec: 10 };
  ok("7b.20 · updown.closenessPct at FILL · a price outside the closeness stops the fill, and the same price inside a wider closeness fills — the leaf is read, not the fixture",
    DE.planFill(udFill({ price: farPrice, bot: botOf({ rules: rulesOf({ updown: { closenessPct: 25 } }) }) }), { randomInt: minRand }).row === null
      && DE.planFill(udFill({ price: farPrice, bot: botOf({ rules: rulesOf({ updown: { closenessPct: 90 } }) }) }), { randomInt: minRand }).row !== null, "");
  const udOpen = (o: Any = {}) => ({ ...openIn(merge({ view: udView(), price: farPrice }, o)), openerSide: "NO" as const });
  ok("7b.21 · updown.closenessPct at OPENER · the same leaf on the opener: refused at 25%, opened at 90%",
    DE.planOpener(udOpen({ bot: botOf({ rules: rulesOf({ updown: { closenessPct: 25 }, opener: { delayUdMinSec: 1, delayUdMaxSec: 1 } }) }) }), { randomInt: minRand }).row === null
      && DE.planOpener(udOpen({ bot: botOf({ rules: rulesOf({ updown: { closenessPct: 90 }, opener: { delayUdMinSec: 1, delayUdMaxSec: 1 } }) }) }), { randomInt: minRand }).row !== null, "");

  /* ── OPENER: the two delay units and the stake draw ─────────────────────────────────────────── */
  /* A round opens at T0−60 s, so a 120-second delay is due at T0+60; read as MINUTES it would be past the lock. */
  const udOpenRec = recorder("min");
  const udOpened = DE.planOpener({ ...openIn({ view: udView(), price: udFresh, bot: botOf({ rules: rulesOf({ opener: { delayUdMinSec: 120, delayUdMaxSec: 120 } }) }) }), openerSide: "NO" }, { randomInt: udOpenRec.fn });
  ok("7b.22 · opener.delayUdMin/MaxSec · the opener's wait on a round is drawn in SECONDS over the two leaves — asked for (120, 120) and due at the round's open + 120 s = T0+60",
    j(udOpenRec.calls[0]) === j([120, 120]) && udOpened.row?.dueAt === at(-60 + 120),
    j({ asked: udOpenRec.calls[0], due: udOpened.row?.dueAt }));
  /* A poll is bettable from its creation; moved to T0−100 s so the draw is visible above the pass clock. */
  const pollOpenRec = recorder("min");
  const pollOpened = DE.planOpener({ ...openIn({ view: MV.projectMarketView(viewRow({ createdAt: at(-100) })), bot: botOf({ rules: rulesOf({ opener: { delayPollsMinMin: 7, delayPollsMaxMin: 7 } }) }) }), openerSide: "NO" }, { randomInt: pollOpenRec.fn });
  ok("7b.23 · opener.delayPollsMin/MaxMin · and on a poll it is MINUTES: asked for (7, 7) and due 7 minutes after the poll became bettable at T0−100 s, which is T0+320",
    j(pollOpenRec.calls[0]) === j([7, 7]) && pollOpened.row?.dueAt === at(-100 + 420),
    j({ asked: pollOpenRec.calls[0], due: pollOpened.row?.dueAt }));
  const stakeRec = recorder("max");
  const openStake = DE.planOpener({ ...openIn({ view: MV.projectMarketView(viewRow({ createdAt: at(-100) })), bot: botOf({ rules: rulesOf({ opener: { stakeMinTzs: 1_500, stakeMaxTzs: 4_700 }, shaping: { roundToTzs: 1_000 } }) }) }), openerSide: "NO" }, { randomInt: stakeRec.fn });
  ok("7b.24 · opener.stakeMin/MaxTzs · the opener's amount is DRAWN between the two leaves and then FLOORED to the step — asked for (1,500, 4,700), drawn 4,700, and stored 4,000",
    j(stakeRec.calls.find((c: Any) => c[0] === 1_500)) === j([1_500, 4_700]) && openStake.row?.stakeTzs === 4_000,
    j({ asked: stakeRec.calls, stake: openStake.row?.stakeTzs }));

  /* ══ §7c · WHAT THE FLEET'S LANE E MEASURED AND COULD NOT DISCRIMINATE (register E · M9, 2026-09-23) ════
   *
   * 🔴 THE HONEST STATE THESE REPLACE. `house-bot-fleet-lane-e.mts` asserts the OPENER's deadline/stale
   * arithmetic and its decision's field shape END TO END, and its own header admits they have "no discriminating
   * engine mutation on record": the drive's only red is `KP_FLEET_SILENT`, which proves an assertion cannot pass
   * with a DEAD engine — never that it catches a WRONG one. And it cannot be fixed there: the anchors run against
   * declared `suite:` values and there is no fleet suite, because a fleet red would rebuild a scratch Postgres
   * fleet per mutation.
   * ⛔ SO THE CLAIMS MOVE TO WHERE THEY ARE PURE. `planOpener` is a pure function of its input; asserting its
   * arithmetic here costs microseconds, and `red:house-bot-engine` already mutates this file's subjects. The lane
   * keeps its end-to-end assertion — what it stops claiming is that nothing but a dead engine could break it.
   * ⚠️ EACH IS A PAIR, the section's own rule: an equality against a literal is satisfied by any code that
   * happens to produce that literal, so each case MOVES a leaf and reads the answer move with it. */
  const openView = () => MV.projectMarketView(viewRow({ createdAt: at(-100) }));
  const openerAt = (min: number) => DE.planOpener({
    ...openIn({ view: openView(), bot: botOf({ rules: rulesOf({ guards: { minTimeToCutoffPollsMin: min }, opener: { delayPollsMinMin: 1, delayPollsMaxMin: 1 } }) }) }),
    openerSide: "NO",
  }, { randomInt: minRand });
  const dl5 = openerAt(5);
  const dl9 = openerAt(9);
  const cutoffMs = Date.parse(dl5.row!.decision.snapshot.cutoff);
  ok("7c.1 · guards.minTimeToCutoffPollsMin · an OPENER's `deadlineAt` is the market's own cutoff LESS that guard in minutes — 5 minutes gives cutoff − 300,000 ms, and moving the leaf to 9 moves the deadline by exactly 240,000 ms more",
    dl5.row?.deadlineAt === new Date(cutoffMs - 300_000).toISOString()
      && dl9.row?.deadlineAt === new Date(cutoffMs - 540_000).toISOString()
      && Date.parse(dl5.row!.deadlineAt) - Date.parse(dl9.row!.deadlineAt) === 240_000,
    j({ cutoff: dl5.row?.decision.snapshot.cutoff, at5: dl5.row?.deadlineAt, at9: dl9.row?.deadlineAt }));
  /* ⛔ AND THE FLOOR IS THE OTHER HALF OF THE SAME LEAF: `guardsFor` holds `minTimeToCutoffSec` at
     `MIN_TIME_TO_CUTOFF_FLOOR_SEC`, so a guard of ZERO minutes is not zero — it is the floor, and a deadline that
     collapsed onto the cutoff would let a stake be planned with no room to land. */
  const dl0 = openerAt(0);
  ok("7c.2 · …and the 10 s FLOOR holds under it: a guard of 0 minutes gives cutoff − 10,000 ms, not cutoff",
    dl0.row?.deadlineAt === new Date(cutoffMs - K.MIN_TIME_TO_CUTOFF_FLOOR_SEC * 1_000).toISOString()
      && dl0.row?.deadlineAt !== dl5.row?.deadlineAt,
    j({ floorSec: K.MIN_TIME_TO_CUTOFF_FLOOR_SEC, at0: dl0.row?.deadlineAt }));
  /* ⛔ `staleAt` IS PER PRODUCT, and the pair is the two products rather than two numbers: one table, two rows,
     and a plan that read the wrong row would still produce a perfectly well-formed instant. */
  const stalePoll = dl5;
  const staleUd = DE.planOpener({ ...openIn({ view: udView(), price: udFresh, bot: botOf({ rules: rulesOf({ opener: { delayUdMinSec: 60, delayUdMaxSec: 60 } }) }) }), openerSide: "NO" }, { randomInt: minRand });
  ok("7c.3 · STALE_AFTER_SEC · an OPENER's `staleAt` is its OWN `dueAt` plus the window for ITS product — the polls row on a poll, the Up & Down row on a round, and the two rows are different",
    stalePoll.row?.staleAt === new Date(Date.parse(stalePoll.row!.dueAt) + K.STALE_AFTER_SEC.polls * 1_000).toISOString()
      && staleUd.row?.staleAt === new Date(Date.parse(staleUd.row!.dueAt) + K.STALE_AFTER_SEC.updown * 1_000).toISOString()
      && K.STALE_AFTER_SEC.polls !== K.STALE_AFTER_SEC.updown,
    j({ poll: [stalePoll.row?.dueAt, stalePoll.row?.staleAt], ud: [staleUd.row?.dueAt, staleUd.row?.staleAt], table: K.STALE_AFTER_SEC }));
  /* ⛔ THE DECISION'S SHAPE, MEASURED AS A DIFFERENCE AND NOT AS AN ABSENCE. "It carries no `wantedTzs`" is
     satisfied by a build that writes no decision at all, or by a field renamed everywhere — so the case reads a
     FILL's decision from the same module in the same breath: an OPENER asks for nothing because it DRAWS, and a
     FILL asks for an amount because it is filling to a share. The population is both, never one. */
  const fillDecision = DE.planFill(fillIn(), { randomInt: minRand }).row?.decision;
  const openDecision = dl5.row?.decision;
  /* The SEVEN keys a FILL's decision carries and an OPENER's does not. `askedStakeTzs` is deliberately NOT in
     this list: no plan in the module writes it, so asserting its absence would measure nothing. */
  const ASKS = ["wantedTzs", "rawYes", "rawNo", "lockedYes", "lockedNo", "targetSharePct", "lockMarginMs"];
  ok("7c.4 · an OPENER's decision carries NO asked amount and NO pool figure — entry, the drawn delay, `bettableFrom` and the snapshot, and nothing else — while a FILL's decision from the same module carries every one of those seven, which is what makes the absence a measurement",
    !!openDecision && !!fillDecision
      && ASKS.every((k) => !(k in openDecision)) && ASKS.every((k) => k in fillDecision)
      && openDecision.entry === "AUTO" && typeof openDecision.delaySec === "number" && typeof openDecision.bettableFrom === "string"
      && j(Object.keys(openDecision).sort()) === j(["bettableFrom", "delaySec", "entry", "snapshot"])
      && openDecision.snapshot.roundNumber === null && typeof openDecision.snapshot.titleEn === "string",
    j({ opener: openDecision, fillKeys: Object.keys(fillDecision ?? {}).sort() }));
});

/* ═══ §8 · source pins (memory child only) ═══════════════════════════════════════════════════════ */
if (STORE === "memory") {
  section("§8 · source pins");
  const code = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8"));
  // ⛔ The span between the keyword and `from` may not cross a `;` — a lazy span across statements read
  // `export const X = [...]; import type {…} from "…"` as ONE value import (found by 8.1 on market-view.ts).
  const importsOf = (src: string) => [...src.matchAll(/^\s*(import|export)\s+(type\s+)?[^;]*?\s+from\s+["']([^"']+)["']/gm)].map((m) => ({ typeOnly: !!m[2], spec: m[3] }));
  const PURE = [
    "src/lib/server/house-bot/decide.ts",
    "src/lib/server/house-bot/enter-now-decision.ts",
    "src/lib/server/house-bot/outcome-map.ts",
    "src/lib/server/house-bot/market-view.ts",
    "src/lib/house-bot/counterparty.ts",
    "src/lib/house-bot/feed-copy.ts",
  ];
  const valueAllowed = (spec: string) => spec.startsWith("@/lib/house-bot/") || spec.startsWith("./") && !spec.includes("blackout") && !spec.includes("opener-side")
    || spec === "@/lib/exit-window" || spec === "@/lib/display-label";
  for (const f of PURE) {
    const bad = importsOf(code(f)).filter((i) => !i.typeOnly && !valueAllowed(i.spec));
    ok(`8.1 · ${f.split("/").pop()} is pure: no store, clock or server value import`, bad.length === 0, j(bad));
    ok(`8.2 · ${f.split("/").pop()} never names StoredMarket (A13)`, !/\bStoredMarket\b/.test(code(f)));
  }
  for (const f of ["src/lib/server/house-bot/decide.ts", "src/lib/server/house-bot/enter-now-decision.ts"]) {
    ok(`8.3 · ${f.split("/").pop()} imports neither blackout.ts nor opener-side.ts nor a store`, !importsOf(code(f)).some((i) => /blackout|opener-side|store|house-bot-dal/.test(i.spec) && !i.typeOnly));
  }
  const FORBIDDEN = /\b(sentinel\w*|resolvedOutcome|resolutionEvidence|resolveClaimedAt|resolutionStage1By)\b/;
  for (const f of ["src/lib/server/house-bot/decide.ts", "src/lib/server/house-bot/enter-now-decision.ts", "src/lib/server/house-bot/market-view.ts"]) {
    ok(`8.4 · A13 token walker: ${f.split("/").pop()} reads no result-check field`, !FORBIDDEN.test(code(f)), (code(f).match(FORBIDDEN) ?? [""])[0]);
  }
  ok("8.5 · CONTROL · the token walker sees a planted sentinel read", FORBIDDEN.test(`const x = market.${"sentinel"}Outcome;`));
  ok("8.6 · CONTROL · the import filter refuses a planted store value import", importsOf(`import { db } from "../store";\n`).filter((i) => !i.typeOnly && !valueAllowed(i.spec)).length === 1);
}

/* ═══ §9 · feed copy (N1 §8, N2 §8) ═════════════════════════════════════════════════════════════ */
section("§9 · feed copy");
await guard("9", () => {
  const all = [...K.ENGINE_CODES, ...K.CAP_CODES.map((c: string) => `CAP_${c}`)];
  const missing = all.filter((c) => typeof FC.ENGINE_CODE_SENTENCE[c] !== "string" || FC.ENGINE_CODE_SENTENCE[c].length < 8);
  ok("9.1 · every engine code, CAP_ codes included, has a sentence", missing.length === 0 && Object.keys(FC.ENGINE_CODE_SENTENCE).length === new Set(all).size, j(missing));
  ok("9.2 · every target end cause has its N2 §8 caption", K.TARGET_END_CAUSES.every((c: string) => !!FC.TARGET_END_CAPTION[c]) && FC.TARGET_END_CAPTION.VETOED === "Stopped by staff (veto) — can't be targeted again");
  ok("9.3 · every press refusal code has its N1 §8 sentence", FC.PRESS_REFUSAL_CODES.every((c: string) => !!FC.PRESS_REFUSAL_SENTENCE[c]));
  ok("9.4 · a staff-chosen row without its own sentence reads “{entry} not placed: …”", FC.staffChosenSentence("CAP_PER_HOUR") === "{entry} not placed: {bot}'s hourly bet limit was reached.", FC.staffChosenSentence("CAP_PER_HOUR"));
  ok("9.5 · N1's own sentence wins where N1 wrote one", FC.staffChosenSentence("STALE") === "{entry} not placed: 50pick was busy until the time limit (15 s) passed.");
  ok("9.6 · fillCopy fills known placeholders and leaves unknown ones visible", FC.fillCopy("{bot} · {nope}", { bot: "Bot A" }) === "Bot A · {nope}");
  const texts = [...Object.values(FC.ENGINE_CODE_SENTENCE), ...Object.values(FC.PRESS_REFUSAL_SENTENCE), ...Object.values(FC.TARGET_END_CAPTION)] as string[];
  ok("9.7 · no sentence carries a square bracket (Tailwind scans src)", texts.every((t) => !/[[\]]/.test(t)));
});

/* ═══ §10 · the schema gate (04 A23) ══════════════════════════════════════════════════════════════ */
section("§10 · houseBotSchemaReady and /api/health");
const SR: Any = await import("../../src/lib/server/house-bot/schema-ready.ts");
await guard("10", async () => {
  const full = { tables: [...SR.HOUSE_SCHEMA_TABLES], columns: SR.HOUSE_SCHEMA_COLUMNS.map(([table, column]: string[]) => ({ table, column })), seeds: { control: 1, runtime: 1 } };
  ok("10.1 · every table, marker column and seed → ready", SR.schemaStateFrom(full).ready === true);
  const noPress = SR.schemaStateFrom({ ...full, tables: full.tables.filter((t: string) => t !== "HouseBotPress") });
  ok("10.2 · the 8th table missing → not ready, naming it", !noPress.ready && j(noPress.missingTables) === j(["HouseBotPress"]), j(noPress));
  const noMarker = SR.schemaStateFrom({ ...full, columns: full.columns.filter((c: Any) => !(c.table === "Position" && c.column === "houseBotId")) });
  ok("10.3 · the Position marker missing → not ready, naming it", !noMarker.ready && j(noMarker.missingColumns) === j(["Position.houseBotId"]), j(noMarker));
  ok("10.4 · tables without their seeded rows → not ready", SR.schemaStateFrom({ ...full, seeds: { control: 0, runtime: 1 } }).ready === false && SR.schemaStateFrom({ ...full, seeds: null }).ready === false);
  const thrown = await SR.houseBotSchemaReady({ probe: async () => { throw new Error("probe down"); } });
  ok("10.5 · a probe that throws → NOT ready (fails closed), probeFailed", thrown.ready === false && thrown.probeFailed === true, j(thrown));
  globalThis.__50PICK_HOUSE_SCHEMA_READY = undefined;
  const real = await SR.houseBotSchemaReady();
  ok(`10.6 · the real ${STORE} store is ready`, real.ready === true, j(real));

  const H: Any = await import("../../src/app/api/health/route.ts");
  // ⛔ OWNER RULING D19, C5-SPEC rulings 171–172: /api/health is PUBLIC and names nothing about house bots. It is read
  // AFTER this process has taken the planner's lease (and the lifecycle's, whose key REL-5 reads), because a lease this
  // process holds is exactly what leadershipSnapshot() prints; ruling 171 chose (a), an allowlist of platform tasks.
  const LEAD10: Any = await import("../../src/lib/server/leader.ts");
  const { LIFECYCLE_TASK }: Any = await import("../../src/lib/server/lifecycle.ts");
  const { houseHits }: Any = await import("./house-bot-vocabulary.mjs");
  const tookPlanner = await LEAD10.acquireLeadership(K.HOUSE_PLANNER_TASK, { leaseMs: K.PLANNER_LEASE_MS, strictWrite: true });
  const tookLifecycle = await LEAD10.acquireLeadership(LIFECYCLE_TASK);
  const res = await H.GET();
  const body: Any = await res.json();
  /** Every key and every string value in the body, at any depth. */
  const keysAndValues = (v: Any, out: string[] = []): string[] => {
    if (Array.isArray(v)) v.forEach((x) => keysAndValues(x, out));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { out.push(k); keysAndValues(x, out); }
    else if (typeof v === "string") out.push(v);
    return out;
  };
  const named = keysAndValues(body);
  const snapshot = LEAD10.leadershipSnapshot();
  ok("10.7 · ⭐ POSITIVE CONTROL · this process holds the planner's lease: the UNFILTERED leadershipSnapshot() names HOUSE_PLANNER_TASK",
    tookPlanner === true && tookLifecycle === true && !!snapshot[K.HOUSE_PLANNER_TASK] && snapshot[K.HOUSE_PLANNER_TASK].isMe === true, j(snapshot));
  ok("10.7a · ⛔ D19 · /api/health answers 200 with no houseBots key, no key or value equal to the planner's lease name, and no vocabulary hit at any depth",
    res.status === 200 && body.ok === true && !("houseBots" in body) && !named.includes(K.HOUSE_PLANNER_TASK) && !named.includes("house-bot") && houseHits(JSON.stringify(body)).length === 0,
    `${res.status} · ${j(houseHits(JSON.stringify(body)))} · leadership ${j(body.leadership)}`);
  ok("10.7b · ruling 171 (a) · the planner's task key is absent from leadership, while the platform's lifecycle lease stays (REL-5 reads leadership.lifecycle.isMe)",
    !(K.HOUSE_PLANNER_TASK in (body.leadership ?? {})) && body.leadership?.[LIFECYCLE_TASK]?.isMe === true, j(body.leadership));
  await LEAD10.releaseLeadership(K.HOUSE_PLANNER_TASK);
  await LEAD10.releaseLeadership(LIFECYCLE_TASK);

  // 10.8 · the engine's health moved to the admin-gated SERVER reader (ruling 172): ADMIN only, decided on the stored role.
  const EH: Any = await import("../../src/lib/server/house-bot/engine-health.ts");
  const ALERTS10: Any = await import("../../src/lib/server/house-bot/alerts.ts");
  const E10: Any = await import("../../src/lib/server/house-bot/engine.ts");
  const { loadWorld: loadWorld10 }: Any = await import("./house-bot-world.mts");
  const W10 = await loadWorld10();
  const adminViewer = await W10.user({ role: "ADMIN" });
  const staffViewers = await Promise.all(["COMPLIANCE", "FINANCE", "AUDITOR", "SUPPORT", "MODERATOR", "GROWTH", "PLAYER"].map((role) => W10.user({ role })));
  const noopTicks = { pollerTick: async () => {}, plannerTick: async () => {}, sweepTick: async () => {} };
  globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined;
  const refusedStart = await E10.startHouseBotEngine(noopTicks, { env: () => "false" });
  const refusedView = await EH.houseEngineHealthFor(adminViewer);
  ok("10.8 · ruling 172 · a REFUSED engine reads through the admin reader for an ADMIN: not started, the refusal named, the schema ready, the drop count a number",
    refusedStart.refused === "ENV_DISABLED" && refusedView?.readable === true && refusedView.engine.started === false && refusedView.engine.refused === "ENV_DISABLED"
      && refusedView.schema.ready === true && typeof refusedView.engine.hookDropped === "number", j(refusedView));
  // A STARTED engine is read through the reader in §11 (11.17b), straight after §11.17's REAL start — never a state set by
  // hand here: a real start writes this instance's boot row, and §11.16 proves a refused start writes none.
  const staffViews = await Promise.all(staffViewers.map((id) => EH.houseEngineHealthFor(id)));
  globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined;
  ok("10.8c · ⛔ ruling 172 · every other role — COMPLIANCE, FINANCE, AUDITOR, SUPPORT, MODERATOR, GROWTH, PLAYER — and no viewer at all get null",
    staffViews.length === 7 && staffViews.every((v: Any) => v === null) && (await EH.houseEngineHealthFor(null)) === null && (await EH.houseEngineHealthFor("usr_no_such_viewer")) === null, j(staffViews));
  const roles = ["ADMIN", "COMPLIANCE", "FINANCE", "AUDITOR", "SUPPORT", "MODERATOR", "GROWTH", "PLAYER", "AGENT"];
  const recipients = new Set(((await ALERTS10.houseBotAlertRecipients()) as Any[]).map((u) => u.role));
  ok("10.8d · the reader's audience is the house-alert audience: inHouseAlertAudience admits exactly the roles houseBotAlertRecipients returns (ADMIN)",
    j(roles.filter((r) => ALERTS10.inHouseAlertAudience(r))) === j(["ADMIN"]) && [...recipients].every((r) => ALERTS10.inHouseAlertAudience(r)) && recipients.has("ADMIN"), j([...recipients]));

  if (onPostgres) {
    const db = prisma();
    await db.$executeRawUnsafe(`ALTER TABLE "HouseBotPress" RENAME TO "HouseBotPress_hb_gate"`);
    try {
      globalThis.__50PICK_HOUSE_SCHEMA_READY = undefined;
      const gone = await SR.houseBotSchemaReady();
      ok("10.9 · a real missing table → not ready, naming it", !gone.ready && gone.missingTables.includes("HouseBotPress"), j(gone));
      const r503 = await H.GET();
      const b503: Any = await r503.json();
      const why503 = await EH.houseEngineHealthFor(adminViewer);
      ok("10.10 · ⛔ /api/health answers 503 with ok false and names nothing (no houseBots key, no vocabulary hit); the admin reader says why",
        r503.status === 503 && b503.ok === false && !("houseBots" in b503) && houseHits(JSON.stringify(b503)).length === 0
          && why503?.readable === true && why503.schema.ready === false && why503.schema.missingTables.includes("HouseBotPress"),
        `${r503.status} · public ${j(Object.keys(b503))} · admin ${j(why503?.schema)}`);
      const head = await H.HEAD();
      ok("10.11 · HEAD agrees with GET (503)", head.status === 503, String(head.status));
      const E: Any = await import("../../src/lib/server/house-bot/engine.ts");
      globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined;
      let ticked = 0;
      const refused = await E.startHouseBotEngine({ pollerTick: async () => { ticked++; }, plannerTick: async () => { ticked++; } });
      ok("10.12 · the engine does not start on a missing schema, and arms no timer", refused.started === false && refused.refused === "SCHEMA_NOT_READY"
        && Object.values(E.engineState().timers).every((t) => t === null) && ticked === 0, j(refused));
    } finally {
      await db.$executeRawUnsafe(`ALTER TABLE "HouseBotPress_hb_gate" RENAME TO "HouseBotPress"`);
      // ⛔ The schema cache is NOT cleared here: 10.13 must prove the gate itself asks again after a not-ready
      // answer. Clearing it made a gate that cached "not ready" pass (mutation S3 missed).
      globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined;
    }
    const back = await H.GET();
    ok("10.13 · restored → 200 again (a not-ready answer is not cached)", back.status === 200, String(back.status));
  }
});

/* ═══ §11 · the engine process (PLAN §4.2, 04 A4, A24) ══════════════════════════════════════════ */
section("§11 · engine boot, back-pressure and stop");
const EN2: Any = await import("../../src/lib/server/house-bot/engine.ts");
const { INSTANCE_ID }: Any = await import("../../src/lib/server/leader.ts");
const HDAL: Any = await import("../../src/lib/server/house-bot-dal.ts");
/* M4 (2026-09-23): the health reader and the constants, for the boot-refusal cases at 11.16a-e. */
const EH2: Any = await import("../../src/lib/server/house-bot/engine-health.ts");
const KX: Any = await import("../../src/lib/house-bot/constants.ts");
await guard("11", async () => {
  const st = (o: Any = {}) => ({ ...EN2.engineState(), started: true, stopping: false, skewMs: 0, inFlight: new Map(), ...o });
  const adm = (o: Any = {}) => ({ inFlight: 0, queueDepth: 0, limits: { maxInFlight: 10, maxQueue: 500, maxWaitMs: 15_000 }, ...o });
  ok("11.1 · not started → no claims", EN2.claimGate({ ...st(), started: false }, adm()).reason === "NOT_STARTED");
  ok("11.2 · stopping → no claims", EN2.claimGate(st({ stopping: true }), adm()).reason === "STOPPING");
  ok("11.3 · skew not yet measured → no claims (fails closed)", EN2.claimGate(st({ skewMs: null }), adm()).reason === "SKEW_UNKNOWN");
  ok("11.4 · A24: +6 s skew → no claims", EN2.claimGate(st({ skewMs: 6_000 }), adm()).reason === "SKEW");
  ok("11.5 · …and −6 s too", EN2.claimGate(st({ skewMs: -6_000 }), adm()).reason === "SKEW");
  ok("11.6 · A24: an admission queue → no claims", EN2.claimGate(st(), adm({ queueDepth: 1 })).reason === "ADMISSION");
  ok("11.7 · A24: in-flight at half the maximum → no claims", EN2.claimGate(st(), adm({ inFlight: 5 })).reason === "ADMISSION");
  const four = EN2.claimGate(st(), adm({ inFlight: 4 }));
  ok("11.8 · …below half → claims, with 2 free slots", four.ok === true && four.freeSlots === 2, j(four));
  const busy = new Map([["hbi_1", { startedAt: 0, inline: false }], ["hbi_2", { startedAt: 0, inline: true }]]);
  ok("11.9 · two fires in flight → FULL", EN2.claimGate(st({ inFlight: busy }), adm()).reason === "FULL");
  ok("11.10 · A24 claim guard = max(0, skew) + 2 s", (EN2.claimGate(st({ skewMs: 3_000 }), adm()) as Any).skewGuardMs === 5_000 && (EN2.claimGate(st({ skewMs: -3_000 }), adm()) as Any).skewGuardMs === 2_000);
  ok("11.11 · N2 §4: the bet hook is suspended while skew is unknown or over 5 s", EN2.hookSuspendedBySkew(st({ skewMs: null })) && EN2.hookSuspendedBySkew(st({ skewMs: 5_001 })) && !EN2.hookSuspendedBySkew(st({ skewMs: 5_000 })));

  const probe = st({ skewMs: 0 });
  ok("11.12 · a clock that throws → skew unknown (claims pause)", (await EN2.measureSkew(probe, async () => { throw new Error("db down"); })) === null && probe.skewMs === null);
  ok("11.13 · skew is measured against the round-trip midpoint", Math.abs((await EN2.measureSkew(probe, async () => Date.now() + 1_000))! - 1_000) <= 50, String(probe.skewMs));

  const ticks = { pollerTick: async () => {}, plannerTick: async () => {} };
  const ready = async () => ({ ready: true });
  globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined;
  const off = await EN2.startHouseBotEngine(ticks, { env: () => "false", schemaReady: ready, timeZone: async () => "UTC" });
  ok("11.14 · HOUSE_BOT_ENGINE=false → not started, no timer", off.started === false && off.refused === "ENV_DISABLED" && Object.values(EN2.engineState().timers).every((t) => t === null));
  globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined;
  const zone = await EN2.startHouseBotEngine(ticks, { env: () => undefined, schemaReady: ready, timeZone: async () => "Africa/Dar_es_Salaam" });
  ok("11.15 · A4: a database TimeZone that is not UTC → not started", zone.started === false && zone.refused === "DB_TIMEZONE");
  /* ══ M4 · A BOOT REFUSAL THE DESK CAN READ (2026-09-23) ═════════════════════════════════════
   * ⚠️ 11.16 USED TO READ "no boot row was written", AND THAT PROXY IS NOW TOO STRONG. Its CLAIM — a refused
   * start must never be readable as a boot — is unchanged and is asserted here directly, on the fields that
   * decide it. What changed is that a `DB_TIMEZONE` refusal now RECORDS ITSELF on that row, because the desk
   * reads durable rows and had no way to name the cause: it saw no boot and no beat and said "The engine is not
   * running" while `/admin/system` could answer only for whichever replica happened to render it.
   * ⛔ THE ROW IS NOT A BOOT AND MAY NOT BECOME ONE: no `bootAt`, so `bootAtMs` stays null and `BOOTING`
   * cannot fire; no `engineEnabled`. That is the half a "no row at all" assertion was standing in for. */
  const refusedRow: Any = await HDAL.houseBotRuntimeStore.get(`engine:${INSTANCE_ID}`);
  ok("11.16 · a refused start writes NO BOOT — the row it leaves carries no `bootAt` and no `engineEnabled`, so nothing can read it as a started engine",
    refusedRow !== null && refusedRow.bootAt == null && refusedRow.engineEnabled !== true,
    j(refusedRow));
  ok("11.16a · M4 · …and it RECORDS THE CAUSE where the desk can read it: `BOOT_REFUSED:DB_TIMEZONE` on the instance's own row, the same shape `CLAIMS_BLOCKED:` uses one layer down",
    refusedRow?.pollerErrorCode === `${KX.BOOT_REFUSED_CODE}:DB_TIMEZONE`, j(refusedRow?.pollerErrorCode));
  const refusedBeats: Any = EH2.houseEngineBeats(await HDAL.houseBotRuntimeStore.listInstances());
  ok("11.16b · M4 · the beats carry the refusal as a CAUSE and still carry no boot — read off the durable rows, which is the only thing the desk reads",
    refusedBeats.bootRefusedReason === "DB_TIMEZONE" && refusedBeats.bootAtMs === null, j(refusedBeats));
  ok("11.16c · M4 · and the verdict is `BOOT_REFUSED`, ABOVE `STALE` — the same fact with its cause in it, where an officer reading the vaguer sentence goes looking in the wrong place",
    EH2.houseEngineVerdict({ on: true, beats: refusedBeats, activeAccounts: 1, nowMs: Date.now() }) === "BOOT_REFUSED",
    j({ verdict: EH2.houseEngineVerdict({ on: true, beats: refusedBeats, activeAccounts: 1, nowMs: Date.now() }) }));
  /* ⛔ AND THE CONTROL IS THE OTHER REFUSAL, which must leave NOTHING: one replica with the engine switched off
     is a normal deployment, and marking the whole desk danger over it would be a false alarm nobody can clear. */
  await HDAL.houseBotRuntimeStore.upsert(`engine:${INSTANCE_ID}`, { pollerErrorCode: null });
  globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined;
  const envOff = await EN2.startHouseBotEngine(ticks, { env: () => "false", schemaReady: ready, timeZone: async () => "UTC" });
  const envRow: Any = await HDAL.houseBotRuntimeStore.get(`engine:${INSTANCE_ID}`);
  ok("11.16d · M4 · CONTROL · an ENV_DISABLED refusal records NOTHING — only the one refusal that is a FAULT is written down, so 11.16a measured the cause and not "
    + "every refusal alike",
    envOff.refused === "ENV_DISABLED" && envRow?.pollerErrorCode == null,
    j({ refused: envOff.refused, code: envRow?.pollerErrorCode }));
  /* ⛔ AND A LANDED BOOT ENDS IT. A current state that outlives its cause is the lie `clearClaimsBlocked`
     exists against one layer down, and a refusal nobody can clear is worse than one nobody was told about. */
  await HDAL.houseBotRuntimeStore.upsert(`engine:${INSTANCE_ID}`, { pollerErrorCode: `${KX.BOOT_REFUSED_CODE}:DB_TIMEZONE` });
  await HDAL.houseBotRuntimeStore.boot(`engine:${INSTANCE_ID}`, { engineEnabled: true });
  const clearedBeats: Any = EH2.houseEngineBeats(await HDAL.houseBotRuntimeStore.listInstances());
  ok("11.16e · M4 · a boot that LANDS clears the refusal in `boot()` itself — the beats stop carrying a cause and the verdict stops being `BOOT_REFUSED`",
    clearedBeats.bootRefusedReason === null && clearedBeats.bootAtMs !== null
      && EH2.houseEngineVerdict({ on: true, beats: clearedBeats, activeAccounts: 1, nowMs: Date.now() }) !== "BOOT_REFUSED",
    j({ reason: clearedBeats.bootRefusedReason, boot: clearedBeats.bootAtMs }));

  /* ── 11.15b–f · ⛔ THE BOOT REFUSAL THAT TOLD NOBODY (01 register:1210; `ALERT_KEY.dbTimezone`) ────────────────
   * 11.15 has pinned the REFUSAL since commit 4, and the refusal is right: a database whose TimeZone is not UTC makes
   * every EAT day key wrong, so the engine declines to start rather than count a day it cannot trust. What no case
   * asked until this build is whether anyone is TOLD. `ALERT_KEY.dbTimezone()` sat in the key table from commit 4
   * with ZERO callers anywhere in the tree, and the only trace of the refusal was a `console.error` on a container
   * that then sat idle — an engine that is correct, and silent, and from every instrument indistinguishable from an
   * engine nobody switched on.
   * ⛔ THE CONDITION IS DRIVEN, NEVER THE FUNCTION. Every case below boots a real engine through a real
   * `deps.timeZone` and reads what arrived on the channel. A case that called the alert helper and watched it return
   * would stay green on a build where the boot path never reaches it — which is exactly the build this was written
   * against, and is the easiest alert assertion in the world to fake. */
  {
    const bell = () => {
      const calls: Any[] = [];
      const alerts: Any = {
        once: async (key: string, m: Any) => { calls.push({ key, code: m.code, detail: m.detail }); },
        placed: async () => {}, security: async () => {}, botStopped: async () => {},
      };
      return { calls, alerts };
    };
    const fresh = () => { globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined; };
    const withBell = (b: Any) => ({ ...ticks, hookAlerts: b.alerts });
    const tzDeps = (zone: string | null) => ({ env: () => undefined, schemaReady: ready, timeZone: async () => zone });

    fresh();
    const b1 = bell();
    const first = await EN2.startHouseBotEngine(withBell(b1), tzDeps("Africa/Dar_es_Salaam"));
    ok("11.15b · ⛔ register:1210 · a non-UTC database still refuses the boot — AND NOW RINGS: exactly one engine:db_timezone bell, code DB_TIMEZONE, carrying the zone that was actually read",
      first.started === false && first.refused === "DB_TIMEZONE" && b1.calls.length === 1
        && b1.calls[0].code === "DB_TIMEZONE" && String(b1.calls[0].key).startsWith("engine:db_timezone")
        && b1.calls[0].detail?.zone === "Africa/Dar_es_Salaam",
      j(b1.calls));

    fresh();
    const b2 = bell();
    const second = await EN2.startHouseBotEngine(withBell(b2), tzDeps("Africa/Dar_es_Salaam"));
    ok("11.15c · …and the same misconfiguration on the NEXT container boot in the same EAT day still refuses and tells nobody a second time — the throttle is the AlertOnce claim, not a process flag, so a fleet restarting together against one bad database rings once",
      second.refused === "DB_TIMEZONE" && b2.calls.length === 0, j({ refused: second.refused, calls: b2.calls }));

    fresh();
    const b3 = bell();
    const unreadable = await EN2.startHouseBotEngine(withBell(b3), tzDeps(null));
    ok("11.15d · …and a TimeZone that cannot be read AT ALL is the same refusal, inside the same day's one bell",
      unreadable.refused === "DB_TIMEZONE" && b3.calls.length === 0, j({ refused: unreadable.refused, calls: b3.calls }));

    /* ⭐ POSITIVE CONTROL — the case that must still be ALLOWED. A UTC database has to pass this gate, and the only
     * way to prove it passed WITHOUT arming this process's timers (11.17 below owns the one real start in §11) is to
     * let it reach the very next statement and fail there: the boot row. BOOT_FAILED is therefore proof that the
     * zone was ACCEPTED, and no bell rang for a database that was never misconfigured. Without this control a build
     * that alerted on every boot, UTC or not, would pass 11.15b–d HARDER than the right one.
     * ⛔ AND THE BELL IS RE-ARMED FIRST. 11.15b spent this EAT day's claim; left spent, a build that rang on EVERY
     * boot would be silenced here by the THROTTLE rather than by the zone check, and this control would pass on the
     * broken build, so a wrong ring must be made visible first.
     * ⛔ AND IT IS RE-ARMED DETERMINISTICALLY, not off the bell that rang: on the very build this control exists to
     * catch, an earlier boot may already have spent the claim, leaving no bell to read the key from.
     * `claimWithEatSuffix` returns the real key whether or not it won it.
     * (Found by driving the `alerts-tz-rings-on-every-boot` mutation: this control was MISSED until this line.) */
    {
      const dbtz = K.ALERT_KEY.dbTimezone();
      const { key } = await HDAL.houseBotAlertOnceStore.claimWithEatSuffix(dbtz.prefix, dbtz.unit);
      await HDAL.houseBotAlertOnceStore.release(key).catch(() => {});
    }
    fresh();
    const b4 = bell();
    const realBoot = HDAL.houseBotRuntimeStore.boot;
    let utc: Any;
    try {
      HDAL.houseBotRuntimeStore.boot = async () => { throw new Error("boot row refused by the positive control"); };
      utc = await EN2.startHouseBotEngine(withBell(b4), tzDeps("Etc/UTC"));
    } finally {
      HDAL.houseBotRuntimeStore.boot = realBoot;
    }
    ok("11.15e · ⭐ POSITIVE CONTROL · a UTC database is ALLOWED past the clock gate — it reaches the boot row (BOOT_FAILED, never DB_TIMEZONE) and rings NO timezone bell",
      utc?.refused === "BOOT_FAILED" && b4.calls.length === 0, j({ refused: utc?.refused, calls: b4.calls }));

    /* ⛔ THE BELL MAY NEVER COST THE VERDICT. The refusal is already decided when the alert runs; a channel that
     * throws must still leave the engine refused and the caller told WHICH refusal it was. An alert that swallowed
     * the verdict would be this defect again, louder: a stop that reports nothing. */
    fresh();
    const throwing: Any = {
      ...ticks,
      hookAlerts: { once: async () => { throw new Error("alert channel down"); }, placed: async () => {}, security: async () => {}, botStopped: async () => {} },
    };
    let stillRefused: Any;
    try { stillRefused = await EN2.startHouseBotEngine(throwing, tzDeps("Africa/Nairobi")); }
    catch (e) { stillRefused = { threw: String((e as Error)?.message ?? e) }; }
    ok("11.15f · ⛔ the bell never costs the verdict · an alert channel that THROWS still leaves the engine refused DB_TIMEZONE, and startHouseBotEngine itself does not throw",
      stillRefused?.refused === "DB_TIMEZONE" && stillRefused?.threw === undefined, j(stillRefused));
  }

  globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined;
  const on = await EN2.startHouseBotEngine(ticks, { env: () => undefined, schemaReady: ready, timeZone: async () => "Etc/UTC", dbClockMs: async () => Date.now() + 1_000 });
  const firstTimer = EN2.engineState().timers.first;
  const again = await EN2.startHouseBotEngine(ticks, { env: () => undefined, schemaReady: ready, timeZone: async () => "UTC" });
  ok("11.17 · a clean start: started, skew measured, the first pass armed", on.started === true && Math.abs(EN2.engineState().skewMs - 1_000) <= 50 && firstTimer !== null, j(EN2.houseBotEngineHealth()));
  ok("11.18 · A24: startHouseBotEngine called twice arms ONE timer", again.started === true && EN2.engineState().timers.first === firstTimer);
  const row = await HDAL.houseBotRuntimeStore.get(`engine:${INSTANCE_ID}`);
  ok("11.19 · the boot row engine:<instance> says enabled, with a boot time", row?.engineEnabled === true && !!row?.bootAt, j(row));
  // 11.17b · ruling 172 · the admin-gated reader over THIS real start (moved from 10.8b, which set the state by hand). The
  // late-reaction drop counter is advanced as the hook itself advances it (X5), since no hook call runs in this section.
  {
    const EH11: Any = await import("../../src/lib/server/house-bot/engine-health.ts");
    const W11 = await (await import("./house-bot-world.mts")).loadWorld();
    const admin11 = await W11.user({ role: "ADMIN" });
    const compliance11 = await W11.user({ role: "COMPLIANCE" });
    EN2.engineState().hook.dropped += 3;
    const live = await EH11.houseEngineHealthFor(admin11);
    ok("11.17b · ruling 172 · the REAL started engine reads through the admin reader for an ADMIN: started, no refusal, the boot row's time, the measured skew, X5's drop count",
      on.started === true && live?.readable === true && live.engine.started === true && live.engine.refused === null
        && !!live.engine.bootAt && Math.abs(live.engine.skewMs - 1_000) <= 50 && live.engine.hookDropped === EN2.engineState().hook.dropped && live.engine.hookDropped >= 3,
      j({ live, bootRow: row?.bootAt }));
    ok("11.17c · ⛔ ruling 172 · …and a COMPLIANCE viewer of that same started engine gets null", (await EH11.houseEngineHealthFor(compliance11)) === null);
  }
  let requeued: Any = null;
  await EN2.stopHouseBotEngine({ requeueMine: async (id: string, exclude: string[]) => { requeued = { id, exclude }; return 0; } }, "test");
  await sleep(10);
  ok("11.20 · stop: stopping set, every timer cleared, claims handed back for this instance", EN2.engineState().stopping === true && Object.values(EN2.engineState().timers).every((t) => t === null)
    && requeued?.id === INSTANCE_ID && EN2.claimGate(EN2.engineState(), adm()).ok === false, j(requeued));
  globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined;

  // L3 · the sweep's 5 s timer and its lease check, driven FOR REAL on a started engine (ruling 103) — no fake timers, so
  // this waits on the engine's own FIRST_TICK_DELAY_MS and SWEEP_INTERVAL_MS.
  {
    const LEADER: Any = await import("../../src/lib/server/leader.ts");
    const waitUntil = async (cond: () => boolean, ms: number) => { const t0 = Date.now(); while (!cond() && Date.now() - t0 < ms) await sleep(250); return cond(); };
    const countingTicks = (counts: { poller: number; planner: number; sweep: number }) => ({
      pollerTick: async () => { counts.poller++; }, plannerTick: async () => { counts.planner++; }, sweepTick: async () => { counts.sweep++; },
    });
    const held = { poller: 0, planner: 0, sweep: 0 };
    const startedHeld = await EN2.startHouseBotEngine(countingTicks(held), { env: () => undefined, schemaReady: ready, timeZone: async () => "UTC", dbClockMs: async () => Date.now() });
    const swept = await waitUntil(() => held.sweep >= 2, K.FIRST_TICK_DELAY_MS + 3 * K.SWEEP_INTERVAL_MS + 5_000);
    ok("11.30 · ⭐ L3 · a started engine holding the planner's lease runs the sweep on its own timer: ≥ 2 sweeps, the planner ran, the lease is ours",
      startedHeld.started === true && swept && held.planner >= 1 && EN2.holdsPlannerLease(), j({ held, lease: LEADER.leadershipSnapshot()[K.HOUSE_PLANNER_TASK] }));
    await EN2.stopHouseBotEngine({}, "test");
    globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined;
    if (onPostgres) {
      // Only Postgres can have ANOTHER holder (single-process mode always leads): write that instance's live lease first.
      const CS11: Any = await import("../../src/lib/server/config-store.ts");
      const key = `__LEADER_${K.HOUSE_PLANNER_TASK}__`;
      await CS11.saveConfig(key, { holder: "hb-other-instance", expiresAt: Date.now() + 120_000, renewedAt: Date.now() });
      const other = { poller: 0, planner: 0, sweep: 0 };
      await EN2.startHouseBotEngine(countingTicks(other), { env: () => undefined, schemaReady: ready, timeZone: async () => "UTC", dbClockMs: async () => Date.now() });
      // Wait for the planner's ATTEMPT (recorded even when the lease is refused), then two whole sweep intervals more.
      const attempted = await waitUntil(() => EN2.engineState().lastPlannerTickAt != null, K.FIRST_TICK_DELAY_MS + 10_000);
      await sleep(2 * K.SWEEP_INTERVAL_MS + 1_000);
      ok("11.31 · L3 · …and while another instance holds a live lease: the planner attempted, yet 0 planner passes and 0 sweeps ran",
        attempted && other.planner === 0 && other.sweep === 0 && !EN2.holdsPlannerLease(), j({ other, attempted, lease: LEADER.leadershipSnapshot()[K.HOUSE_PLANNER_TASK] }));
      await EN2.stopHouseBotEngine({}, "test");
      await CS11.saveConfig(key, { holder: "hb-other-instance", expiresAt: 0, renewedAt: Date.now() });
      globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined;
    }
  }
  if (onPostgres) {
    const tz = String(((await prisma().$queryRawUnsafe(`SELECT current_setting('TimeZone') AS "z"`)) as Any[])[0].z);
    const real = await EN2.startHouseBotEngine(ticks, { env: () => undefined, schemaReady: ready, dbClockMs: async () => Date.now() });
    ok(`11.21 · the real TimeZone probe (${tz}) agrees with the boot decision`, (EN2.UTC_ZONES.includes(tz)) === (real.refused !== "DB_TIMEZONE"), j(real));
    await EN2.stopHouseBotEngine({}, "test");
    globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined;
  }
});

/** Module-scope `let`/`var`, or a `new Map|Set|WeakMap` constant not typed Readonly (04 F7). */
// ⛔ The lookahead carries its own `\s*`: outside it, backtracking the whitespace let "ReadonlySet" slip past (11.24).
const MUTABLE_MODULE_STATE = /^(?:export\s+)?(?:let|var)\s+\w+|^(?:export\s+)?const\s+\w+\s*(?::(?!\s*Readonly(?:Set|Map)<)[^=]+)?=\s*new\s+(?:Map|Set|WeakMap)\b/gm;
if (STORE === "memory") {
  section("§11b · F7 source pin: no module-scope mutable state in server/house-bot/");
  const { readdirSync } = await import("node:fs");
  const dir = join(ROOT, "src/lib/server/house-bot");
  const offenders: string[] = [];
  for (const f of readdirSync(dir).filter((n: string) => n.endsWith(".ts"))) {
    const src = decomment(readFileSync(join(dir, f), "utf8"));
    for (const m of src.matchAll(MUTABLE_MODULE_STATE)) offenders.push(`${f}: ${m[0]}`);
  }
  ok("11.22 · no top-level let, var or mutable Map/Set in any server/house-bot module (state lives on globalThis)", offenders.length === 0, offenders.join(" | "));
  ok("11.23 · CONTROL · the pin sees a planted module Map and an untyped module Set", [..."const cache = new Map();\nconst seen = new Set<string>();".matchAll(MUTABLE_MODULE_STATE)].length === 2);
  ok("11.24 · CONTROL · a ReadonlySet/ReadonlyMap constant is allowed (the type forbids mutation)", [..."const ROWS: ReadonlySet<string> = new Set([\"a\"]);".matchAll(MUTABLE_MODULE_STATE)].length === 0);
}

/* ═══ §12 · the engine's one market read (04 A12, A13) ═══════════════════════════════════════════ */
section("§12 · houseSeamStore.marketView");
const { loadWorld, OFFICER: WORLD_OFFICER }: Any = await import("./house-bot-world.mts");
await guard("12", async () => {
  const w = await loadWorld();
  await w.user({ id: WORLD_OFFICER, role: "ADMIN" });
  const market = await w.poll({ graceMin: 5, paidMin: 2 });
  ok("12.0 · fixture · a poll exists", typeof market?.id === "string", j(market));
  const row = await HDAL.houseSeamStore.marketView(market.id);
  const stored = await w.mdal.marketStore.get(market.id);
  const isoOrNull = (s: string | null | undefined) => (s ? new Date(s).toISOString() : null);
  ok("12.1 · a poll: raw product line, category, status, pools and times match the stored market",
    !!row && row.productLine === "MARKET" && row.category === stored.category && row.status === stored.status && row.yesPool === Number(stored.yesPool)
      && row.noPool === Number(stored.noPool) && row.resolutionAt === isoOrNull(stored.resolutionAt) && row.selectionClosedAt === isoOrNull(stored.selectionClosedAt)
      && row.createdAt === isoOrNull(stored.createdAt) && row.titleEn === stored.titleEn, j(row));
  ok("12.2 · …the exit rates are the market's FROZEN ones (grace 5, paid 2)", row?.exitGraceMin === 5 && row?.exitPaidMin === 2, j(row));
  ok("12.3 · …no round, never reopened", row?.round === null && row?.reopenedAt === null);
  const KEYS = ["id", "productLine", "category", "status", "yesPool", "noPool", "selectionClosedAt", "resolutionAt", "createdAt", "titleEn", "exitGraceMin", "exitPaidMin", "reopenedAt", "round"];
  ok("12.4 · the row carries exactly the allowlisted keys", j(Object.keys(row ?? {}).sort()) === j([...KEYS].sort()), j(Object.keys(row ?? {})));
  const before = j(row);
  if (w.onPostgres) {
    await w.prisma().$executeRawUnsafe(`UPDATE "PredictionMarket" SET "sentinelOutcome" = 'YES', "sentinelConfidence" = 97, "resolutionStage1By" = $1 WHERE "id" = $2`, WORLD_OFFICER, market.id);
  } else {
    await w.mdal.marketStore.set({ ...stored, sentinelOutcome: "YES", sentinelConfidence: 97, resolutionStage1By: WORLD_OFFICER });
  }
  const afterStore = await w.mdal.marketStore.get(market.id);
  const after = JSON.stringify(await HDAL.houseSeamStore.marketView(market.id));
  ok("12.5a · fixture · the stored market now carries the Sentinel verdict", afterStore?.sentinelOutcome === "YES", String(afterStore?.sentinelOutcome));
  ok("12.5 · ⭐ A13 · a Sentinel verdict and a staged resolution change NOTHING in the engine's view", after === JSON.stringify(row), `${JSON.stringify(row)} vs ${after}`);
  void before;
  ok("12.6 · an unknown market → null", (await HDAL.houseSeamStore.marketView("mkt_hb_not_there")) === null);
  if (w.onPostgres) {
    await w.prisma().$executeRawUnsafe(`UPDATE "PredictionMarket" SET "productLine" = 'JACKPOT' WHERE "id" = $1`, market.id);
    try {
      const raw = await HDAL.houseSeamStore.marketView(market.id);
      ok("12.7 · A12 · the RAW product line reaches the view (JACKPOT), and scope refuses it", raw?.productLine === "JACKPOT" && MV.scopeCode(MV.projectMarketView(raw)) === "PRODUCT_NOT_SUPPORTED", j(raw?.productLine));
    } finally {
      await w.prisma().$executeRawUnsafe(`UPDATE "PredictionMarket" SET "productLine" = 'MARKET' WHERE "id" = $1`, market.id);
    }
  }

  // A real Up & Down round: asset → chain → confirmed observation → openRound (the Commit 3 caps fixture).
  const cfg: Any = await import("../../src/lib/server/updown-config.ts");
  const uds: Any = await import("../../src/lib/server/updown-service.ts");
  const udd: Any = await import("../../src/lib/server/updown-dal.ts");
  const { seedDefaultSources, addSource }: Any = await import("../../src/lib/server/source-registry.ts");
  await seedDefaultSources();
  await addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto", rationale: "test fixture (mirrors production)", addedBy: "system" });
  const a = await cfg.createAsset({ key: `E${process.pid}`, symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
    priceSourceUrl: "https://api.twelvedata.com/quote", category: "crypto", decimals: 2, minMoveTicks: 2 }, WORLD_OFFICER);
  if (a.ok) await cfg.setAssetEnabled(a.data.id, true, WORLD_OFFICER);
  const c = a.ok ? await cfg.createChain({ assetId: a.data.id, durationMinutes: 5 }, WORLD_OFFICER) : a;
  if (c.ok) await cfg.setChainState(c.data.id, "RUNNING", WORLD_OFFICER);
  const chain = c.ok ? await udd.chainStore.get(c.data.id) : null;
  const boundary = new Date(cfg.cleanGridAnchor(Date.now() + 60_000)).toISOString();
  let opened: Any = { ok: false, error: `fixture: ${a.error ?? c.error}` };
  if (chain) {
    const o = await udd.observationStore.ensure(a.data.id, boundary);
    await udd.observationStore.confirm(o.id, { price: 60_000, sourceUrl: "https://api.twelvedata.com/quote", sourceQuotedAt: boundary,
      evidence: "BTC quoted 60000", confidence: 96, model: "test-stub", rawHash: `hv_${process.pid}` });
    opened = await uds.openRound(chain, boundary, o.id, 60_000);
  }
  ok("12.8 · fixture · a real Up & Down round is open on a running chain", opened.ok === true, opened.ok ? "" : String(opened.error));
  if (opened.ok) {
    const round = await udd.roundStore.get(opened.data.id);
    const v = await HDAL.houseSeamStore.marketView(round.marketId);
    ok("12.9 · the chain key is the rules' `<assetId>:<durationMinutes>`", v?.round?.chainKey === `${a.data.id}:5`, j(v?.round));
    ok("12.10 · the round's number, open time, open price and duration are the stored round's",
      v?.productLine === "UPDOWN" && v.round.roundNumber === round.roundNumber && v.round.opensAt === isoOrNull(round.opensAt)
        && v.round.openPrice === (round.openPrice == null ? null : Number(round.openPrice)) && v.round.durationMinutes === 5
        && v.round.upTarget === (round.upTarget == null ? null : Number(round.upTarget)) && v.round.downTarget === (round.downTarget == null ? null : Number(round.downTarget)), j(v?.round));
    ok("12.11 · a running chain on an enabled asset reads as such", v?.round?.chainRunning === true && v.round.assetEnabled === true);
    const view = MV.projectMarketView(v);
    ok("12.12 · A12 cutoff = min(opensAt + 5 min, the market's close)", MV.cutoffOf(view) === new Date(Math.min(Date.parse(v.round.opensAt) + 300_000, Date.parse(v.selectionClosedAt ?? v.resolutionAt))).toISOString());
    await cfg.setChainState(c.data.id, "PAUSED", WORLD_OFFICER);
    await cfg.setAssetEnabled(a.data.id, false, WORLD_OFFICER);
    const paused = await HDAL.houseSeamStore.marketView(round.marketId);
    ok("12.13 · A16 · a paused chain and a disabled asset are visible to the engine", paused?.round?.chainRunning === false && paused.round.assetEnabled === false, j(paused?.round));
  }
});

/* ═══ §13 · applyOutcome — what a bet-path answer writes (PLAN §4.6, 04 A8, A10, A19, N1 §4.3) ═══════════════ */
section("§13 · applyOutcome on the claimed row");
const OC: Any = await import("../../src/lib/server/house-bot/outcomes.ts");
const TR: Any = await import("../../src/lib/server/house-bot/transient.ts");
const CTL: Any = await import("../../src/lib/server/house-bot/control.ts");
const { AdmissionBusy }: Any = await import("../../src/lib/server/admission.ts");
const { auditFlush, getAuditPage }: Any = await import("../../src/lib/server/audit.ts");
await guard("13", async () => {
  const w = await loadWorld();
  if (!(await w.db.user.findById(WORLD_OFFICER))) await w.user({ id: WORLD_OFFICER, role: "ADMIN" });
  await w.limits();
  await w.switchOn();
  const S = HDAL;
  const ME = "world"; // `loadWorld().intent` claims every row as "world"
  const recorder = (onStop?: () => void) => {
    const calls: Any[] = [];
    const alerts = {
      placed: async (i: Any) => { calls.push({ fn: "placed", id: i.id, inLock: L.inLock() }); },
      once: async (key: string, m: Any) => { calls.push({ fn: "once", key, code: m.code, inLock: L.inLock() }); },
      security: async (m: Any) => { calls.push({ fn: "security", code: m.code, inLock: L.inLock() }); },
      botStopped: async (bot: Any, change: Any) => { onStop?.(); calls.push({ fn: "botStopped", botId: bot.id, status: bot.status, ...change, inLock: L.inLock() }); },
    };
    return { alerts, calls, count: (fn: string) => calls.filter((c) => c.fn === fn).length, codes: (code: string) => calls.filter((c) => c.fn === "once" && c.code === code).length };
  };
  const fresh = async (b: Any, o: Any = {}) => { const m = await w.poll(); return w.intent(b, m.id, o); };
  const row = (id: string) => S.houseBotIntentStore.get(id) as Promise<Any>;
  const botRow = (id: string) => S.houseBotStore.get(id) as Promise<Any>;
  const refuse = (reason: string, detail?: Any) => ({ ok: false, code: "REFUSED", reason, ...(detail ? { detail } : {}) });
  const apply = (intent: Any, answer: Any, alerts: Any) => OC.applyOutcome({ intent, me: ME, answer, alerts });
  const eventsOf = async (botId: string) => ((await S.houseBotEventStore.listByBot(botId, { limit: 100 })).rows as Any[]);
  const auditsOf = async (pred: (e: Any) => boolean) => { await auditFlush(); return (getAuditPage({ limit: 10_000 }) as Any[]).filter(pred); };
  const streak = async () => Number((await S.houseBotRuntimeStore.get(K.RUNTIME_KEY.global))?.errorStreak);
  const since = () => new Date(Date.now() - 1_000).toISOString();
  const offIds = async () => new Set(((await S.houseBotEventStore.listByKinds(["SWITCH_OFF"], { limit: 500 })) as Any[]).map((e) => e.id));
  const newOffs = async (before: Set<string>) => ((await S.houseBotEventStore.listByKinds(["SWITCH_OFF"], { limit: 500 })) as Any[]).filter((e) => !before.has(e.id));
  const auditIds = async () => new Set((await auditsOf(() => true)).map((e) => e.id));
  // ⛔ WAIT ON THE DATABASE CLOCK, NOT ON A TIMER. The requeue compares the database's now(); a Node timer starts from the
  // event loop's cached time, so after synchronous work `sleep(n)` can end before n ms have really passed. 13.9 requeued a
  // row once in seven Postgres runs with a 200 ms margin while the clocks agreed (fourth session, 2026-09-15).
  const untilDbPast = async (instantMs: number, marginMs = 150) => {
    for (let k = 0; k < 100; k++) {
      if ((await S.houseBotRuntimeStore.dbClock()).nowMs > instantMs + marginMs) return;
      await sleep(50);
    }
    throw new Error(`untilDbPast: the database clock never passed ${new Date(instantMs).toISOString()}`);
  };

  /* ── 13.1 placed: the A8 claim ── */
  {
    const b = await w.bot();
    const m = await w.poll();
    const i = await w.intent(b, m.id, { kind: "OPENER", stakeTzs: 1_000 });
    const placed = await w.place(b, i);
    ok("13.1a · fixture · a real house bet placed the claimed intent", placed.ok === true && (await row(i.id))?.status === "PLACED", j(placed));
    await S.houseBotRuntimeStore.bumpErrorStreak();
    await S.houseBotRuntimeStore.bumpErrorStreak();
    const rec = recorder();
    const first = await apply(await row(i.id), { ok: true }, rec.alerts);
    ok("13.1 · ok → placed, the A8 alertedAt claim taken, ONE placed alert", first.kind === "placed" && first.alerted === true && (await row(i.id)).alertedAt != null && rec.count("placed") === 1, j(first));
    ok("13.1b · …and the error streak is reset", (await streak()) === 0, String(await streak()));
    const again = await apply(await row(i.id), { ok: true, replayed: true }, rec.alerts);
    ok("13.2 · a replayed ok after the claim → alerted false, no second alert", again.kind === "placed" && again.alerted === false && rec.count("placed") === 1, j(again));
    const m2 = await w.poll();
    const i2 = await w.intent(b, m2.id, { kind: "OPENER", stakeTzs: 1_000 });
    const p2 = await w.place(b, i2);
    const rec2 = recorder();
    const both = await Promise.all([apply(await row(i2.id), { ok: true }, rec2.alerts), apply(await row(i2.id), { ok: true, replayed: true }, rec2.alerts)]);
    ok("13.3 · two workers answering ok for one PLACED row → exactly one alert", p2.ok === true && rec2.count("placed") === 1 && both.filter((o: Any) => o.alerted).length === 1, j(both));
    const claimed = await fresh(b);
    const rec3 = recorder();
    const noClaim = await apply(claimed, { ok: true }, rec3.alerts);
    ok("13.4 · the engine never writes PLACED: an ok on a row still CLAIMED takes no claim and alerts nobody", noClaim.alerted === false && (await row(claimed.id)).status === "CLAIMED" && rec3.count("placed") === 0, j(await row(claimed.id)));
    await S.houseBotIntentStore.finish(claimed.id, ME, { status: "CANCELLED", reasonCode: "BOT_NOT_ACTIVE" });
  }

  /* ── 13.5 transient: requeue with backoff, never the streak ── */
  {
    const b = await w.bot();
    await S.houseBotRuntimeStore.resetErrorStreak();
    const TRANSIENTS: Array<[string, Any]> = [
      ["system_busy", refuse("system_busy")],
      ["code:BUSY (no reason)", { ok: false, code: "BUSY" }],
      ["house_gate_unreadable", refuse("house_gate_unreadable")],
      ["thrown 55P03", { thrown: Object.assign(new Error("lock"), { code: "55P03" }) }],
      ["thrown P1017 under meta", { thrown: Object.assign(new Error("closed"), { meta: { code: "P1017" } }) }],
      ["thrown AdmissionBusy", { thrown: new AdmissionBusy("shed", 0) }],
    ];
    for (const [label, answer] of TRANSIENTS) {
      const i = await fresh(b);
      const t0 = Date.now();
      const out = await apply(i, answer, recorder().alerts);
      const r = await row(i.id);
      const wait = Date.parse(r.nextAttemptAt) - t0;
      ok(`13.5 · ${label} → PENDING again, transientAttempts 1, attempts handed back, next try in ≈1 s`,
        out.kind === "requeued" && r.status === "PENDING" && r.claimedBy === null && r.transientAttempts === 1 && r.attempts === 0 && wait >= 500 && wait <= 2_500, `${wait} ms · ${j(r)}`);
    }
    ok("13.6 · no transient answer moved the error streak", (await streak()) === 0, String(await streak()));
    for (const [n, lo, hi] of [[1, 4_000, 6_500], [3, 44_000, 47_000], [7, 44_000, 47_000]] as Array<[number, number, number]>) {
      const i = await fresh(b, { transientAttempts: n });
      const t0 = Date.now();
      await apply(i, refuse("system_busy"), recorder().alerts);
      const wait = Date.parse((await row(i.id)).nextAttemptAt) - t0;
      ok(`13.7 · MON-10 backoff after ${n} earlier transient tries is ${lo / 1000}–${hi / 1000} s`, wait >= lo && wait <= hi, `${wait} ms`);
    }
    const nearStale = await fresh(b, { staleAt: w.iso(1_500) });
    // The requeue needs `staleAt − 1 s > now()`: wait until the database clock has passed that bound.
    await untilDbPast(Date.parse(nearStale.staleAt) - 1_000);
    const outStale = await apply(nearStale, refuse("system_busy"), recorder().alerts);
    ok("13.8 · ruling 50 · no time before staleAt (staleAt ≤ deadline) → EXPIRED(STALE)", outStale.kind === "terminal" && (await row(nearStale.id)).status === "EXPIRED" && (await row(nearStale.id)).reasonCode === "STALE", j(outStale));
    const nearDeadline = await fresh(b, { deadlineAt: w.iso(1_200), staleAt: w.iso(600_000) });
    await untilDbPast(Date.parse(nearDeadline.deadlineAt));
    const clockBefore = { db: new Date((await S.houseBotRuntimeStore.dbClock()).nowMs).toISOString(), js: new Date().toISOString() };
    const outDead = await apply(nearDeadline, refuse("system_busy"), recorder().alerts);
    const deadRow = await row(nearDeadline.id);
    ok("13.9 · ruling 50 · the deadline passed first (deadline < staleAt) → EXPIRED(BUSY_TIMEOUT)", deadRow.status === "EXPIRED" && deadRow.reasonCode === "BUSY_TIMEOUT",
      `${j(outDead)} · row ${j({ status: deadRow.status, deadlineAt: deadRow.deadlineAt, nextAttemptAt: deadRow.nextAttemptAt, claimedAt: nearDeadline.claimedUntil })} · before apply ${j(clockBefore)}`);

    // A10: two minutes of transient failures → one ENGINE_DB_TRANSIENT alert an hour. The control runs FIRST, before the
    // hour's AlertOnce key is claimed — after it, a missing time check would pass the control for the wrong reason.
    await S.houseBotRuntimeStore.resetErrorStreak();
    // ⛔ Free this hour's key first, and prove it is still free after the control: §13.5's transients could have
    // claimed it, and a control run against a claimed key passes for the wrong reason (mutation M5 missed).
    const dbKey = K.ALERT_KEY.engineDb();
    await S.houseBotAlertOnceStore.release((await S.houseBotAlertOnceStore.claimWithEatSuffix(dbKey.prefix, dbKey.unit)).key);
    const dbKeyFree = async () => {
      const c = await S.houseBotAlertOnceStore.claimWithEatSuffix(dbKey.prefix, dbKey.unit);
      if (c.claimed) await S.houseBotAlertOnceStore.release(c.key);
      return c.claimed;
    };
    const recDb = recorder();
    await apply(await fresh(b), refuse("system_busy"), recDb.alerts);
    ok("13.10 · CONTROL · a transient run that started just now alerts nobody, and the hour's key stays unclaimed", recDb.codes("ENGINE_DB_TRANSIENT") === 0 && (await dbKeyFree()) && (await S.houseBotRuntimeStore.get(K.RUNTIME_KEY.global))?.transientSince != null, j(recDb.calls));
    await S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.global, { transientSince: new Date(Date.now() - 180_000).toISOString() });
    await apply(await fresh(b), refuse("system_busy"), recDb.alerts);
    await apply(await fresh(b), { thrown: Object.assign(new Error("x"), { code: "57014" }) }, recDb.alerts);
    ok("13.11 · a transient run older than 2 minutes → ONE ENGINE_DB_TRANSIENT alert for the hour", recDb.codes("ENGINE_DB_TRANSIENT") === 1, j(recDb.calls));
    await S.houseBotRuntimeStore.resetErrorStreak();

    // PLAN §4.6: `rate_limited` twice in an hour → one holder-contention alert.
    const bc = await w.bot();
    const recRl = recorder();
    const rl1 = await apply(await fresh(bc), refuse("rate_limited"), recRl.alerts);
    ok("13.12 · one rate_limited → requeued, no contention alert", rl1.kind === "requeued" && recRl.codes("HOLDER_CONTENTION") === 0, j(rl1));
    await apply(await fresh(bc), refuse("rate_limited"), recRl.alerts);
    await apply(await fresh(bc), refuse("rate_limited"), recRl.alerts);
    ok("13.13 · the second in the hour → ONE HOLDER_CONTENTION alert; the third adds none", recRl.codes("HOLDER_CONTENTION") === 1, j(recRl.calls));
  }

  /* ── 13.14 every plain terminal row, its alert and the penalty box ── */
  {
    const b = await w.bot();
    const trig = await w.user();
    const rec = recorder();
    const TERMINALS = Object.entries(OM.OUTCOME_TABLE).filter(([, a]: Any) => a.kind === "terminal" && !a.engineFault) as Array<[string, Any]>;
    ok("13.14a · fixture · the table has plain terminal rows to walk", TERMINALS.length >= 15, String(TERMINALS.length));
    for (const [key, action] of TERMINALS) {
      const i = await fresh(b);
      const answer = key.startsWith("code:") ? { ok: false, code: key.slice(5) } : refuse(key);
      const out = await apply(action.penalty ? { ...i, triggerUserId: trig } : i, answer, rec.alerts);
      const r = await row(i.id);
      ok(`13.14 · ${key} → ${action.status}(${action.reasonCode})`, out.kind === "terminal" && out.written === true && r.status === action.status && r.reasonCode === action.reasonCode && r.finishedAt != null, j(r));
    }
    ok("13.15 · balance_insufficient and house_cash_only share CAP_BALANCE_FLOOR → ONE alert for the bot today", rec.codes("CAP_BALANCE_FLOOR") === 1
      && rec.calls.some((c) => c.fn === "once" && c.code === "CAP_BALANCE_FLOOR" && c.key.startsWith(`bot:${b.botId}:CAP_BALANCE_FLOOR`)), j(rec.calls));
    ok("13.16 · A7 · stake_not_whole → one STAKE_NOT_WHOLE alert", rec.codes("STAKE_NOT_WHOLE") === 1);
    ok("13.17 · no other terminal row alerts (the penalty box's own alert is 13.18b), stops the bot or touches the switch", rec.calls.filter((c) => c.fn === "once" && c.code !== "PENALTY_BOXED").length === 2 && rec.count("botStopped") === 0 && rec.count("security") === 0
      && (await botRow(b.botId)).status === "ACTIVE" && (await S.houseBotControlStore.get()).enabled === true, j(rec.calls));
    const boxed = await S.houseBotEventStore.listByKinds(["PENALTY_BOXED"], { userId: trig, limit: 10 });
    ok("13.18 · R5 · a trigger exit boxes the trigger account: one PENALTY_BOXED event (CASHED_OUT_COUNTERED)", boxed.length === 1 && boxed[0].payload?.cause === "CASHED_OUT_COUNTERED", j(boxed));
    ok("13.18b · ruling 107 · …with ONE PENALTY_BOXED admin alert, on the box's own key", rec.codes("PENALTY_BOXED") === 1
      && rec.calls.some((c) => c.fn === "once" && c.code === "PENALTY_BOXED" && String(c.key).startsWith(`penalty:${trig}:`)), j(rec.calls.filter((c) => c.fn === "once")));
    await apply({ ...(await fresh(b)), triggerUserId: trig }, refuse("house_trigger_gone"), rec.alerts);
    ok("13.19 · …a second exit the same EAT day boxes nothing more", (await S.houseBotEventStore.listByKinds(["PENALTY_BOXED"], { userId: trig, limit: 10 })).length === 1);
    const b2 = await w.bot();
    const notMine = await fresh(b2);
    const rec2 = recorder();
    const out = await OC.applyOutcome({ intent: notMine, me: "another-worker", answer: refuse("balance_insufficient"), alerts: rec2.alerts });
    ok("13.20 · a row this worker does not hold → written false, the row untouched, no alert", out.written === false && (await row(notMine.id)).status === "CLAIMED" && rec2.calls.length === 0, j(out));
    await S.houseBotIntentStore.finish(notMine.id, ME, { status: "CANCELLED", reasonCode: "BOT_NOT_ACTIVE" });
    const staleRef = await apply(await fresh(b2), refuse("house_intent_superseded"), rec2.alerts);
    ok("13.21 · house_intent_superseded → noop, nothing written", staleRef.kind === "noop" && rec2.calls.length === 0);
  }

  /* ── 13.22 engine faults: FAILED(INTERNAL) + SECURITY + master OFF(ENGINE_FAULT) ── */
  {
    for (const key of ["market_not_live", "idempotency_key_conflict", "house_key_mismatch"]) {
      await w.switchOn();
      const b = await w.bot();
      const other = await fresh(b);
      const i = await fresh(b);
      const rec = recorder();
      const offBefore = await offIds();
      const audBefore = await auditIds();
      const out = await apply(i, refuse(key), rec.alerts);
      const c = await S.houseBotControlStore.get();
      const off = await newOffs(offBefore);
      const aud = await auditsOf((e) => e.action === "house_bot.engine_fault" && e.targetId === c.id && !audBefore.has(e.id));
      ok(`13.22 · ${key} → FAILED(INTERNAL), master OFF(ENGINE_FAULT), one SECURITY alert`, out.status === "FAILED" && out.code === "INTERNAL" && c.enabled === false && c.offCause === "ENGINE_FAULT" && rec.count("security") === 1, `${j(out)} · ${j(c)}`);
      ok(`13.23 · ${key} → every live intent CANCELLED(MASTER_OFF), one SWITCH_OFF event carrying its audit id`, (await row(other.id)).status === "CANCELLED" && (await row(other.id)).reasonCode === "MASTER_OFF"
        && off.length === 1 && off[0].payload?.cause === "ENGINE_FAULT" && aud.length === 1 && off[0].auditId === aud[0].id, `${j(off)} · ${aud.length}`);
    }
    await w.switchOn();
    const b = await w.bot();
    const [i1, i2] = [await fresh(b), await fresh(b)];
    const rec = recorder();
    const offBefore = await offIds();
    await Promise.all([apply(i1, refuse("house_key_mismatch"), rec.alerts), apply(i2, refuse("house_key_mismatch"), rec.alerts)]);
    const offs = await newOffs(offBefore);
    ok("13.24 · two workers faulting at once → ONE SWITCH_OFF event and ONE SECURITY alert", offs.length === 1 && rec.count("security") === 1, `${j(offs)} · ${j(rec.calls)}`);
    ok("13.25 · …and neither row is left CLAIMED", (await row(i1.id)).status !== "CLAIMED" && (await row(i2.id)).status !== "CLAIMED");
    await w.switchOn();
    const b3 = await w.bot();
    const moved = await fresh(b3);
    const out = await OC.applyOutcome({ intent: moved, me: "another-worker", answer: refuse("house_key_mismatch"), alerts: recorder().alerts });
    ok("13.26 · ruling 53 · a fault on a row someone else moved still switches house bots OFF", out.written === false && (await S.houseBotControlStore.get()).enabled === false, j(out));
    await w.switchOn();
  }

  /* ── 13.27 the bet path's pause refusals ── */
  {
    const PAUSES = Object.entries(OM.OUTCOME_TABLE).filter(([, a]: Any) => a.kind === "autoPause") as Array<[string, Any]>;
    const VOIDS = ["SELF_EXCLUDED", "COOLING_OFF"];
    ok("13.27a · fixture · the table's pause rows", PAUSES.length === 7, j(PAUSES.map(([k]) => k)));
    for (const [key, action] of PAUSES) {
      const b = await w.bot();
      const m = await w.poll();
      const tgt = await S.targetStore.insert({
        id: S.newHouseId("target"), houseBotId: b.botId, marketId: m.id, delayMinSec: 5, delayMaxSec: 10, timingFrom: "STAKE", reactTo: "FIRST",
        createdById: WORLD_OFFICER, snapshot: { titleEn: "Target poll", category: "macro", cutoff: w.iso(3_600_000), rawYes: 0, rawNo: 0 },
      });
      const pending = await fresh(b);
      const i = await fresh(b);
      const rec = recorder();
      const from = since();
      const out = await apply(i, refuse(key), rec.alerts);
      const bot = await botRow(b.botId);
      const evs = (await eventsOf(b.botId)).filter((e) => e.kind === "AUTO_PAUSED" && Date.parse(e.createdAt) >= Date.parse(from));
      const aud = await auditsOf((e) => e.action === "house_bot.auto_paused" && e.targetId === b.botId);
      const stop = rec.calls.find((c) => c.fn === "botStopped");
      ok(`13.27 · ${key} → AUTO_PAUSED(${action.cause}) from ACTIVE`, out.kind === "botStopped" && bot.status === "AUTO_PAUSED" && bot.pauseReason === action.cause && bot.pausedFromStatus === "ACTIVE", j(bot));
      ok(`13.28 · ${key} → both live intents CANCELLED(BOT_NOT_ACTIVE), one AUTO_PAUSED event, one audit, ONE botStopped alert`,
        (await row(i.id)).status === "CANCELLED" && (await row(pending.id)).reasonCode === "BOT_NOT_ACTIVE" && evs.length === 1 && aud.length === 1
          && rec.count("botStopped") === 1 && stop?.cause === action.cause && stop?.cancelled === 2, `${j(evs)} · ${aud.length} · ${j(rec.calls)}`);
      const tNow = await S.targetStore.get(tgt.id);
      if (VOIDS.includes(action.cause)) {
        ok(`13.29 · ⭐ A3 · ${key} VOIDS consent: consentVoidCause ${action.cause} and the bot's ACTIVE target ENDED(CONSENT_VOID)`,
          bot.consentVoidCause === action.cause && bot.consentVoidAt != null && tNow.status === "ENDED" && tNow.endCause === "CONSENT_VOID", `${j(bot)} · ${j(tNow)}`);
      } else {
        ok(`13.29 · ${key} pauses without a consent void`, bot.consentVoidAt === null, j(bot));
      }
      if (action.anomaly) ok(`13.30 · ${key} is unreachable by A7 → one ANOMALY alert`, rec.codes("ANOMALY") === 1, j(rec.calls));
      const second = await fresh(b);
      const rec2 = recorder();
      await apply(second, refuse(key), rec2.alerts);
      ok(`13.31 · ${key} again on the paused bot → no second event or alert, and the claimed row is closed CANCELLED(BOT_NOT_ACTIVE)`,
        rec2.count("botStopped") === 0 && (await eventsOf(b.botId)).filter((e) => e.kind === "AUTO_PAUSED").length === 1
          && (await row(second.id)).status === "CANCELLED" && (await row(second.id)).reasonCode === "BOT_NOT_ACTIVE", `${j(rec2.calls)} · ${j(await row(second.id))}`);
    }
  }

  /* ── 13.32 ⭐ A19 order ── */
  {
    const b = await w.bot();
    const i = await fresh(b);
    const trail: string[] = [];
    const real = { setStatus: S.houseBotStore.setStatus, cancelLive: S.houseBotIntentStore.cancelLive, append: S.houseBotEventStore.append, setAuditId: S.houseBotEventStore.setAuditId };
    S.houseBotStore.setStatus = async (...a: Any[]) => { trail.push(`status:${L.inLock()}`); return real.setStatus.apply(S.houseBotStore, a); };
    S.houseBotIntentStore.cancelLive = async (...a: Any[]) => { trail.push(`cancel:${L.inLock()}`); return real.cancelLive.apply(S.houseBotIntentStore, a); };
    S.houseBotEventStore.append = async (...a: Any[]) => { trail.push(`event:${L.inLock()}`); return real.append.apply(S.houseBotEventStore, a); };
    S.houseBotEventStore.setAuditId = async (...a: Any[]) => { trail.push(`auditId:${L.inLock()}`); return real.setAuditId.apply(S.houseBotEventStore, a); };
    const rec = recorder(() => trail.push(`alert:${L.inLock()}`));
    try {
      await apply(i, refuse("wallet_frozen"), rec.alerts);
    } finally {
      Object.assign(S.houseBotStore, { setStatus: real.setStatus });
      Object.assign(S.houseBotIntentStore, { cancelLive: real.cancelLive });
      Object.assign(S.houseBotEventStore, { append: real.append, setAuditId: real.setAuditId });
    }
    ok("13.32 · ⭐ A19 · status inside the lock; then cancel, event, audit id, alert — each after the lock returns",
      j(trail) === j(["status:true", "cancel:false", "event:false", "auditId:false", "alert:false"]), j(trail));
    const b2 = await w.bot();
    const i2 = await fresh(b2);
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    let entered!: () => void;
    const holding = new Promise<void>((r) => { entered = r; });
    const held = L.withLock(`wallet:${b2.userId}`, async () => { entered(); await gate; });
    await holding;
    const p = apply(i2, refuse("wallet_frozen"), recorder().alerts);
    await sleep(300);
    const mid = await botRow(b2.botId);
    release();
    await held;
    await p;
    ok("13.33 · the status write waits for wallet:<botUser> (held → still ACTIVE; released → AUTO_PAUSED)", mid.status === "ACTIVE" && (await botRow(b2.botId)).status === "AUTO_PAUSED", `${mid.status} → ${(await botRow(b2.botId)).status}`);
  }

  /* ── 13.34 account_blocked: re-read the account (A5, A10, ruling 49) ── */
  {
    const cases: Array<[string, Any, string, string]> = [
      ["CLOSED", { status: "CLOSED", closedAt: w.iso() }, "REMOVED", "ACCOUNT_CLOSED"],
      ["SELF_EXCLUDED", { status: "SELF_EXCLUDED" }, "AUTO_PAUSED", "SELF_EXCLUDED"],
      ["COOLED_OFF", { status: "COOLED_OFF" }, "AUTO_PAUSED", "COOLING_OFF"],
      ["SUSPENDED", { status: "SUSPENDED" }, "AUTO_PAUSED", "ACCOUNT_SUSPENDED"],
      ["ACTIVE (nothing found)", {}, "AUTO_PAUSED", "ACCOUNT_BLOCKED"],
    ];
    for (const [label, patch, to, cause] of cases) {
      const b = await w.bot();
      if (Object.keys(patch).length) await w.setUserFields(b.userId, patch);
      const i = await fresh(b);
      const rec = recorder();
      const out = await apply(i, refuse("account_blocked"), rec.alerts);
      const bot = await botRow(b.botId);
      const stop = rec.calls.find((c) => c.fn === "botStopped");
      ok(`13.34 · account ${label} → ${to}(${cause}), the row closed, one botStopped alert`, out.kind === "botStopped" && bot.status === to && (to === "REMOVED" ? bot.removedCause === cause && bot.removedById === null : bot.pauseReason === cause)
        && (await row(i.id)).status === "CANCELLED" && rec.count("botStopped") === 1 && stop?.to === to && stop?.cause === cause, `${j(bot)} · ${j(rec.calls)}`);
      if (to === "REMOVED") {
        const ev = (await eventsOf(b.botId)).find((e) => e.kind === "REMOVED");
        const aud = await auditsOf((e) => e.action === "house_bot.removed" && e.targetId === b.botId);
        ok("13.35 · A5 · the REMOVED event carries the house_bot.removed audit id", !!ev && aud.length === 1 && ev.auditId === aud[0].id, `${j(ev)} · ${aud.length}`);
      }
      if (cause === "SELF_EXCLUDED" || cause === "COOLING_OFF") ok(`13.36 · ${label} voids consent (${cause})`, bot.consentVoidCause === cause, j(bot));
    }
    const bp = await w.bot();
    await S.houseBotStore.setStatus(bp.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: null });
    await w.setUserFields(bp.userId, { status: "CLOSED", closedAt: w.iso() });
    await apply(await fresh(bp), refuse("account_blocked"), recorder().alerts);
    ok("13.37 · a PAUSED bot whose account closed is REMOVED too", (await botRow(bp.botId)).status === "REMOVED");
  }

  /* ── 13.35b · replan ruling 543 · a stop whose compliance row cannot be SIGNED still stops, still tells, and stamps
     NO phantom id. Before the audit contract was fixed the unsigned row THREW out of `engineAudit` after the status
     had moved — the alert was never sent — and once it stopped throwing, the ticketed id of an entry that never
     landed would have been stamped on the event as if a row existed. ── */
  {
    const AUD543: Any = await import("../../src/lib/server/audit.ts");
    const b = await w.bot();
    const rec = recorder();
    const stopped = await withUnsignableChain(() => OC.stopBot(b.botId, { to: "AUTO_PAUSED", cause: "ACCOUNT_BLOCKED" }, rec.alerts))
      .catch((e: unknown) => `threw: ${String((e as Error)?.message ?? e)}`);
    const bot = await botRow(b.botId);
    const ev = (await eventsOf(b.botId)).find((e) => e.kind === "AUTO_PAUSED");
    ok("13.35b · ⭐ 543 · a stop whose compliance row cannot be SIGNED still stops the bot and still tells someone — and its event carries NO audit id, never the id of a row that does not exist",
      stopped === true && bot.status === "AUTO_PAUSED" && !!ev && ev.auditId == null && rec.count("botStopped") === 1,
      `${j(stopped)} · ${j(ev)} · ${j(rec.calls)}`);
    const b2 = await w.bot();
    const stopped2 = await OC.stopBot(b2.botId, { to: "AUTO_PAUSED", cause: "ACCOUNT_BLOCKED" }, recorder().alerts);
    const ev2 = (await eventsOf(b2.botId)).find((e) => e.kind === "AUTO_PAUSED");
    ok("13.35c · CONTROL · the same stop with the secret in place stamps its event with an id the audit store really holds — so the null above is the missing record, not a stop that never audits",
      stopped2 === true && typeof ev2?.auditId === "string" && AUD543.getAuditById(ev2.auditId) !== undefined, j(ev2));
  }

  /* ── 13.38 house_consent_stale: recompute the holder's causes (A3, PLAN §14) ── */
  {
    const bpw = await w.bot();
    await w.setUserFields(bpw.userId, { passwordHash: "hash_holder_v2", passwordSetVia: "SELF_CHANGE", passwordSetAt: w.iso() });
    await apply(await fresh(bpw), refuse("house_consent_stale"), recorder().alerts);
    const pw = await botRow(bpw.botId);
    ok("13.38 · a changed password → AUTO_PAUSED(PASSWORD_CHANGED), no consent void", pw.status === "AUTO_PAUSED" && pw.pauseReason === "PASSWORD_CHANGED" && pw.consentVoidAt === null, j(pw));
    const bid = await w.bot();
    await S.houseBotStore.setConsentVoid(bid.botId, "IDENTITY_REFUSED");
    const recId = recorder();
    await apply(await fresh(bid), refuse("house_consent_stale"), recId.alerts);
    const idb = await botRow(bid.botId);
    ok("13.39 · a standing IDENTITY_REFUSED void → AUTO_PAUSED(IDENTITY_REFUSED) (a void that already stands still stops the bot)", idb.status === "AUTO_PAUSED" && idb.pauseReason === "IDENTITY_REFUSED" && recId.count("botStopped") === 1, j(idb));
    const bw = await w.bot();
    await S.houseBotStore.setConsentVoid(bw.botId, "HOLDER_WITHDREW");
    await apply(await fresh(bw), refuse("house_consent_stale"), recorder().alerts);
    const wd = await botRow(bw.botId);
    const confirm = await auditsOf((e) => e.action === "house_bot.holder_withdrew_consent" && e.targetId === bw.botId);
    ok("13.40 · a standing HOLDER_WITHDREW void → AUTO_PAUSED(HOLDER_WITHDREW), and the engine never writes the holder's withdrawal", wd.status === "AUTO_PAUSED" && wd.pauseReason === "HOLDER_WITHDREW" && confirm.length === 0, `${j(wd)} · ${confirm.length}`);
    const bok = await w.bot();
    const iok = await fresh(bok);
    const outOk = await apply(iok, refuse("house_consent_stale"), recorder().alerts);
    ok("13.41 · ruling 51 · consent valid again by the time of the re-read → requeued, the bot stays ACTIVE", outOk.kind === "requeued" && (await botRow(bok.botId)).status === "ACTIVE", j(outOk));
    const bun = await w.bot();
    const iun = await fresh(bun);
    const realGet = S.houseBotStore.get;
    S.houseBotStore.get = async () => { throw Object.assign(new Error("read failed"), { code: "P1001" }); };
    let outUn: Any;
    try { outUn = await apply(iun, refuse("house_consent_stale"), recorder().alerts); } catch (e) { outUn = { threw: String((e as Error)?.message ?? e) }; } finally { Object.assign(S.houseBotStore, { get: realGet }); }
    ok("13.42 · ruling 51 · an unreadable holder → requeued, never a guessed pause", outUn?.kind === "requeued" && (await botRow(bun.botId)).status === "ACTIVE", j(outUn));
  }

  /* ── 13.43 market re-reads (PLAN §4.6 NOT_FOUND, A10 INVALID) ── */
  {
    const b = await w.bot();
    const gone = await fresh(b);
    const outGone = await apply({ ...gone, marketId: "mkt_hb_gone" }, { ok: false, code: "NOT_FOUND" }, recorder().alerts);
    ok("13.43 · NOT_FOUND and the market is gone → SKIPPED(MARKET_GONE)", (await row(gone.id)).status === "SKIPPED" && (await row(gone.id)).reasonCode === "MARKET_GONE", j(outGone));
    const realView = S.houseSeamStore.marketView;
    for (const code of ["NOT_FOUND", "INVALID", "SELECTION_CLOSED"]) {
      const iv = await fresh(b);
      S.houseSeamStore.marketView = async () => { throw Object.assign(new Error("read failed"), { code: "P1001" }); };
      let outV: Any;
      try { outV = await apply(iv, { ok: false, code }, recorder().alerts); } catch (e) { outV = { threw: String((e as Error)?.message ?? e) }; } finally { Object.assign(S.houseSeamStore, { marketView: realView }); }
      ok(`13.44 · ruling 51 · ${code} with an unreadable market → requeued, the bot stays ACTIVE`, outV?.kind === "requeued" && (await botRow(b.botId)).status === "ACTIVE", j(outV));
    }
    const live = await fresh(b);
    await apply(live, refuse("selection_closed"), recorder().alerts);
    ok("13.45 · selection_closed on a LIVE market → EXPIRED(CUTOFF)", (await row(live.id)).status === "EXPIRED" && (await row(live.id)).reasonCode === "CUTOFF", j(await row(live.id)));
    const inv = await fresh(b);
    await apply({ ...inv, marketId: "mkt_hb_gone" }, { ok: false, code: "INVALID" }, recorder().alerts);
    ok("13.46 · INVALID and the market is gone → SKIPPED(MARKET_NOT_LIVE)", (await row(inv.id)).reasonCode === "MARKET_NOT_LIVE");
    const closed = await fresh(b);
    await w.mdal.marketStore.stamp(closed.marketId, { status: "CLOSED" });
    ok("13.47a · fixture · the market now reads CLOSED", (await S.houseSeamStore.marketView(closed.marketId))?.status === "CLOSED");
    await apply(closed, { ok: false, code: "SELECTION_CLOSED" }, recorder().alerts);
    ok("13.47 · SELECTION_CLOSED on a market no longer LIVE → SKIPPED(MARKET_NOT_LIVE)", (await row(closed.id)).status === "SKIPPED" && (await row(closed.id)).reasonCode === "MARKET_NOT_LIVE");
    const bm = await w.bot();
    const acc = await fresh(bm);
    await apply(acc, { ok: false, code: "NOT_FOUND" }, recorder().alerts);
    ok("13.48 · NOT_FOUND while the market exists → AUTO_PAUSED(ACCOUNT_MISSING)", (await botRow(bm.botId)).pauseReason === "ACCOUNT_MISSING" && (await row(acc.id)).status === "CANCELLED");
  }

  /* ── 13.49 conflicts and caps (N1 §4.6, ruling 47) ── */
  {
    const b = await w.bot();
    const conflict = async (detail: Any) => { const i = await fresh(b); await apply(i, refuse("house_market_conflict", detail), recorder().alerts); return (await row(i.id)).reasonCode; };
    ok("13.49 · conflict OPPOSITE_SIDE → SKIPPED(CAP_OPPOSITE_SIDE)", (await conflict({ conflict: "OPPOSITE_SIDE" })) === "CAP_OPPOSITE_SIDE");
    ok("13.50 · conflict OWNER_POSITION / OTHER_BOT / TRIGGER_BOTH_SIDES / none → SKIPPED(MARKET_HELD)",
      (await conflict({ conflict: "OWNER_POSITION" })) === "MARKET_HELD" && (await conflict({ conflict: "OTHER_BOT" })) === "MARKET_HELD"
        && (await conflict({ conflict: "TRIGGER_BOTH_SIDES" })) === "MARKET_HELD" && (await conflict(undefined)) === "MARKET_HELD");
    const cap = async (detail: Any, o: Any = {}) => {
      const i = await fresh(b, o);
      const t0 = Date.now();
      const out = await apply(i, refuse("house_cap_reached", detail), recorder().alerts);
      return { out, r: await row(i.id), t0 };
    };
    const until = new Date(Date.now() + 30_000).toISOString();
    const gap = await cap({ cap: "MIN_GAP", until });
    ok("13.51 · MIN_GAP freeing before staleAt → deferred to the seam's own `until`, attempts handed back", gap.out.kind === "deferred" && gap.r.status === "PENDING" && gap.r.nextAttemptAt === until && gap.r.attempts === 0 && gap.r.transientAttempts === 0, j(gap.r));
    const late = await cap({ cap: "MIN_GAP", until: new Date(Date.now() + 900_000).toISOString() });
    ok("13.52 · MIN_GAP freeing after staleAt → SKIPPED(CAP_MIN_GAP)", late.r.status === "SKIPPED" && late.r.reasonCode === "CAP_MIN_GAP", j(late.r));
    const perMin = await cap({ cap: "GLOBAL_BETS_PER_MINUTE" });
    const minWait = Date.parse(perMin.r.nextAttemptAt) - perMin.t0;
    ok("13.53 · ruling 47 · GLOBAL_BETS_PER_MINUTE → deferred one window (≈60 s)", perMin.out.kind === "deferred" && minWait >= 59_000 && minWait <= 61_500, `${minWait} ms`);
    const perMinLate = await cap({ cap: "GLOBAL_BETS_PER_MINUTE" }, { staleAt: w.iso(30_000) });
    ok("13.54 · …but past staleAt → SKIPPED(CAP_GLOBAL_BETS_PER_MINUTE)", perMinLate.r.reasonCode === "CAP_GLOBAL_BETS_PER_MINUTE");
    const hour = await cap({ cap: "PER_HOUR" });
    const day = await cap({ cap: "PER_DAY" });
    ok("13.55 · ruling 47 · PER_HOUR and PER_DAY carry no free time → SKIPPED", hour.r.reasonCode === "CAP_PER_HOUR" && day.r.reasonCode === "CAP_PER_DAY");
    const terminalCap = await cap({ cap: "PER_MARKET_COUNT", until });
    ok("13.56 · a cap that does not defer (PER_MARKET_COUNT) skips even with a free time", terminalCap.r.status === "SKIPPED" && terminalCap.r.reasonCode === "CAP_PER_MARKET_COUNT");
    const bu = await w.bot();
    const iu = await fresh(bu);
    const recU = recorder();
    await apply(iu, refuse("house_cap_reached", { cap: "NO_SUCH_CAP" }), recU.alerts);
    ok("13.57 · ruling 54 · an unknown cap code → FAILED(UNMAPPED), AUTO_PAUSED(UNMAPPED_REFUSAL), one alert", (await row(iu.id)).reasonCode === "UNMAPPED"
      && (await botRow(bu.botId)).pauseReason === "UNMAPPED_REFUSAL" && recU.codes("UNMAPPED_REFUSAL") === 1, j(recU.calls));
  }

  /* ── 13.58 UNMAPPED (A10) ── */
  {
    const b = await w.bot();
    const other = await fresh(b);
    const i = await fresh(b);
    const rec = recorder();
    const out = await apply(i, refuse("house_brand_new_reason"), rec.alerts);
    const bot = await botRow(b.botId);
    ok("13.58 · an unknown reason → FAILED(UNMAPPED), AUTO_PAUSED(UNMAPPED_REFUSAL), its intents cancelled, one alert", out.status === "FAILED" && (await row(i.id)).reasonCode === "UNMAPPED"
      && bot.pauseReason === "UNMAPPED_REFUSAL" && (await row(other.id)).status === "CANCELLED" && rec.codes("UNMAPPED_REFUSAL") === 1 && rec.count("botStopped") === 1, `${j(out)} · ${j(rec.calls)}`);
    const reactivate = () => S.houseBotStore.setStatus(b.botId, { from: ["AUTO_PAUSED"], to: "ACTIVE", pauseReason: null, pausedFromStatus: null });
    await reactivate();
    const spelled = await fresh(b);
    await apply(spelled, refuse("code:BUSY"), rec.alerts);
    ok("13.59 · a reason spelled like a table key (\"code:BUSY\") is FAILED(UNMAPPED), not a transient requeue", (await row(spelled.id)).status === "FAILED" && (await row(spelled.id)).reasonCode === "UNMAPPED", j(await row(spelled.id)));
    await reactivate();
    const bare = await fresh(b);
    await apply(bare, { ok: false, code: "SOMETHING_NEW" }, rec.alerts);
    ok("13.59b · an unknown bare code is FAILED(UNMAPPED) and pauses again, and the alert stays once a day", (await row(bare.id)).reasonCode === "UNMAPPED"
      && (await botRow(b.botId)).pauseReason === "UNMAPPED_REFUSAL" && rec.codes("UNMAPPED_REFUSAL") === 1, j(rec.calls));
  }

  /* ── 13.60 the error streak (ENG-11) ── */
  {
    await w.switchOn();
    await S.houseBotRuntimeStore.resetErrorStreak();
    const b = await w.bot();
    const rec = recorder();
    const boom = () => ({ thrown: new Error("engine defect") });
    const o1 = await apply(await fresh(b), boom(), rec.alerts);
    ok("13.60 · a non-transient throw → FAILED(INTERNAL), streak 1, still ON", o1.status === "FAILED" && o1.code === "INTERNAL" && (await streak()) === 1 && (await S.houseBotControlStore.get()).enabled === true, j(o1));
    await apply(await fresh(b), { thrown: Object.assign(new Error("deadlock"), { code: "40P01" }) }, rec.alerts);
    ok("13.61 · a transient throw between them leaves the streak alone", (await streak()) === 1);
    await apply(await fresh(b), boom(), rec.alerts);
    ok("13.62 · two in a row → still ON", (await S.houseBotControlStore.get()).enabled === true && (await streak()) === 2);
    const audBefore = await auditIds();
    await apply(await fresh(b), boom(), rec.alerts);
    const c = await S.houseBotControlStore.get();
    const aud = await auditsOf((e) => e.action === "house_bot.switch_off" && e.payload?.cause === "ENGINE_ERRORS" && !audBefore.has(e.id));
    ok("13.63 · the third → master OFF(ENGINE_ERRORS), one SECURITY alert, one switch_off audit", c.enabled === false && c.offCause === "ENGINE_ERRORS" && rec.count("security") === 1 && aud.length === 1, `${j(c)} · ${aud.length}`);
    await w.switchOn();
    await S.houseBotRuntimeStore.resetErrorStreak();
  }

  /* ── 13.64 isEngineTransient and the backoff (A10, MON-10) ── */
  ok("13.64 · isEngineTransient: admission shedding, retry.ts codes, the engine codes (top level and meta)",
    TR.isEngineTransient(new AdmissionBusy("timeout", 15_000)) && TR.isEngineTransient({ code: "40001" }) && TR.isEngineTransient({ code: "55P03" })
      && TR.isEngineTransient({ meta: { code: "57P03" } }) && TR.isEngineTransient({ code: "P1008" }));
  ok("13.65 · CONTROL · a unique violation, a plain Error, a string and null are not transient",
    !TR.isEngineTransient({ code: "P2002" }) && !TR.isEngineTransient(new Error("x")) && !TR.isEngineTransient("55P03") && !TR.isEngineTransient(null));
  ok("13.66 · transientBackoffMs walks 1, 5, 15, 45 s and stays at 45 s", [-1, 0, 1, 2, 3, 9].map((n) => TR.transientBackoffMs(n, K.REQUEUE_BACKOFF_SEC)).join(",") === "1000,1000,5000,15000,45000,45000");

  /* ── 13.67 maintenanceOn (F7, ruling 48) ── */
  {
    const PCFG: Any = await import("../../src/lib/server/platform-config.ts");
    const CS: Any = await import("../../src/lib/server/config-store.ts");
    if (!onPostgres) {
      ok("13.67 · memory: no config store → not in maintenance", (await CTL.maintenanceOn()) === false);
    } else {
      const before = await CS.loadConfigResult(PCFG.PLATFORM_CONFIG_KEY);
      try {
        await CS.saveConfigOrThrow(PCFG.PLATFORM_CONFIG_KEY, { timezone: "Africa/Dar_es_Salaam", maintenanceMode: true });
        ok("13.67 · a stored config in maintenance → true", (await CTL.maintenanceOn()) === true);
        await CS.saveConfigOrThrow(PCFG.PLATFORM_CONFIG_KEY, { maintenanceMode: true });
        ok("13.68 · a row without a timezone reads as the defaults, as getPlatformConfig reads it → false", (await CTL.maintenanceOn()) === false);
        await CS.saveConfigOrThrow(PCFG.PLATFORM_CONFIG_KEY, { timezone: "Africa/Dar_es_Salaam", maintenanceMode: false });
        ok("13.69 · CONTROL · maintenance off → false", (await CTL.maintenanceOn()) === false);
        await prisma().$executeRawUnsafe(`ALTER TABLE "SystemConfig" RENAME TO "SystemConfig_hb_gate"`);
        let threw = false;
        try { await CTL.maintenanceOn(); } catch { threw = true; } finally { await prisma().$executeRawUnsafe(`ALTER TABLE "SystemConfig_hb_gate" RENAME TO "SystemConfig"`); }
        ok("13.70 · ⛔ an unreadable config THROWS (a requeue, never a stake)", threw === true);
      } finally {
        if (before.ok && before.value != null) await CS.saveConfigOrThrow(PCFG.PLATFORM_CONFIG_KEY, before.value);
        else await prisma().systemConfig.deleteMany({ where: { key: PCFG.PLATFORM_CONFIG_KEY } });
      }
    }
  }
});

/* ═══ §14 · the A15 price read (udPriceForDecision, peekVendorBar) ════════════════════════════════════════════ */
section("§14 · udPriceForDecision: a cached vendor bar, else a fresh observation, never a paid call");
const UDP: Any = await import("../../src/lib/server/house-bot/ud-price.ts");
const VEN: Any = await import("../../src/lib/server/updown-terminal-vendor.ts");
await guard("14", async () => {
  const cfg: Any = await import("../../src/lib/server/updown-config.ts");
  const udd: Any = await import("../../src/lib/server/updown-dal.ts");
  const { seedDefaultSources, addSource }: Any = await import("../../src/lib/server/source-registry.ts");
  await seedDefaultSources();
  await addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto", rationale: "test fixture (mirrors production)", addedBy: "system" }).catch(() => null);
  const made = await cfg.createAsset({ key: `P${process.pid}`, symbol: "ETH/USD", nameEn: "Ether", nameSw: "Ether", iconKey: "crypto",
    priceSourceUrl: "https://api.twelvedata.com/quote", category: "crypto", decimals: 2, minMoveTicks: 2 }, WORLD_OFFICER);
  ok("14.0 · fixture · a real asset exists", made.ok === true, j(made));
  const asset = made.data;
  const vendorAsset = { id: asset.id, symbol: asset.symbol, priceSourceUrl: asset.priceSourceUrl, sourceDomain: asset.sourceDomain ?? "api.twelvedata.com" };
  const utc = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");
  /** Fill the terminal's cache the way the chart route does, through a fake vendor (no network). */
  const cacheBars = async (range: string, bars: Array<{ t: number; c: number }>, status = 200) => {
    let calls = 0;
    const fake = async () => { calls++; return new Response(JSON.stringify({ values: bars.map((b) => ({ datetime: utc(b.t), open: String(b.c), high: String(b.c), low: String(b.c), close: String(b.c) })) }), { status }); };
    const got = await VEN.vendorBarsFor(vendorAsset, range, "test-key", fake);
    return { got, calls };
  };
  const observe = async (boundaryMs: number, price: number, quotedMs: number) => {
    const o = await udd.observationStore.ensure(asset.id, new Date(boundaryMs).toISOString());
    return udd.observationStore.confirm(o.id, { price, sourceUrl: "https://api.twelvedata.com/quote", sourceQuotedAt: new Date(quotedMs).toISOString(),
      evidence: "fixture", confidence: 96, model: "test-stub", rawHash: `hp_${process.pid}_${boundaryMs}` });
  };
  const minute = (ms: number) => Math.floor(ms / 60_000) * 60_000;
  const realFetch = globalThis.fetch;
  let paid = 0;
  // Never the network: a paid call is counted and answered with a refusal here, so a defect cannot reach the vendor.
  globalThis.fetch = (async () => { paid++; return new Response("{}", { status: 500 }); }) as Any;
  try {
    VEN.__clearVendorCacheForTests();
    const now = Date.now();
    ok("14.1 · nothing cached and no observation → null (UD_STALE_PRICE)", (await UDP.udPriceForDecision(asset.id, { nowMs: now })) === null);
    ok("14.2 · ⛔ A15 · a cache miss makes NO vendor call", paid === 0 && VEN.peekVendorBar(asset.id) === null, `${paid} calls`);

    const seeded = await cacheBars("15M", [{ t: minute(now) - 180_000, c: 101 }, { t: minute(now) - 60_000, c: 102 }]);
    ok("14.3a · fixture · the chart path cached two 1-minute bars with one fake call", seeded.calls === 1 && seeded.got?.length === 2, j(seeded));
    const fresh = await UDP.udPriceForDecision(asset.id, { nowMs: minute(now) + 30_000 });
    ok("14.3 · the newest cached bar, 90 s from its open → vendor_bar at its close", fresh?.source === "vendor_bar" && fresh.price === 102 && fresh.ageSec === 90, j(fresh));
    ok("14.4 · …and still no paid call (peek reads the cache only)", paid === 0, `${paid} calls`);
    /* ⭐ RE-AIMED 2026-09-23, 120 → 180, WITH THE EDGE PINNED ON BOTH SIDES. The window was widened because it
       had to outlast the provider's ~91 s publish lag PLUS the delay an OPENER waits out (up to 90 s) — at 120
       the first two live intents this desk ever created were both refused UD_STALE_PRICE at 151 s and 144 s.
       ⛔ A ONE-SIDED CASE WOULD NOT HAVE NOTICED THE WIDENING AT ALL: "180 s is refused" alone stays green if
       the window is widened again to 300. The pair is what makes the number itself the subject. */
    const justInside = await UDP.udPriceForDecision(asset.id, { nowMs: minute(now) + 119_000 });
    ok("14.5a · 179 s from the bar's open is still INSIDE the window", justInside?.price === 102 && justInside.ageSec === 179, j(justInside));
    const aged = await UDP.udPriceForDecision(asset.id, { nowMs: minute(now) + 120_000 });
    ok("14.5 · 180 s from the bar's open → not a vendor price; no observation → null", aged === null, j(aged));

    await cacheBars("1H", [{ t: minute(now), c: 105 }]);
    const newest = await UDP.udPriceForDecision(asset.id, { nowMs: minute(now) + 10_000 });
    ok("14.6 · the newest bar across the 1-minute ranges wins (1H's newer bar over 15M's)", newest?.price === 105 && newest.ageSec === 10, j(newest));

    VEN.__clearVendorCacheForTests();
    await cacheBars("6H", [{ t: minute(now), c: 999 }]);
    ok("14.7 · a 5-minute bar (6H) is not a 1-minute bar → no vendor price", VEN.peekVendorBar(asset.id) === null && (await UDP.udPriceForDecision(asset.id, { nowMs: minute(now) + 5_000 })) === null);
    /* 14.7a–14.7e · THE ORACLE'S READING, REPUBLISHED (2026-09-23).
       🔴 THE PRODUCTION SHAPE. The desk's two price routes were a chart cache only a PLAYER warms and a CONFIRMED
       observation under 60 s old — and the provider's dated bar publishes ~91 s after its boundary, so that second
       route is older than its own threshold the moment it exists. Measured live: the newest confirmed BTC
       observation never read under 90 s across twenty minutes. With no chart open the desk had NO price at all. */
    VEN.__clearVendorCacheForTests();
    ok("14.7a · ⭐ THE PRODUCTION SHAPE · no chart has been opened, so there is no cached bar at all",
      VEN.peekVendorBar(asset.id) === null && (await UDP.udPriceForDecision(asset.id, { nowMs: minute(now) + 30_000 })) === null);
    VEN.publishOracleBar(asset.id, 777, new Date(minute(now)).toISOString());
    const viaOracle = await UDP.udPriceForDecision(asset.id, { nowMs: minute(now) + 30_000 });
    ok("14.7b · ⭐ …and the oracle's own confirmed reading now serves it — the desk can price with no chart open",
      viaOracle?.source === "vendor_bar" && viaOracle.price === 777 && viaOracle.ageSec === 30, j(viaOracle));
    /* ⛔ THE ONE THAT KEEPS THE AGE CHECK HONEST. `t` is the QUOTED instant, never the instant it was published —
       stamping it "now" would make every reading look fresh and turn the caller's staleness test into a check
       that cannot fail, which is the whole reason the desk may refuse a price at all. */
    ok("14.7c · ⭐ DISCRIMINATES · the age is judged from the QUOTED instant, not from when it was published — 200 s is still refused",
      (await UDP.udPriceForDecision(asset.id, { nowMs: minute(now) + 200_000 })) === null);
    await cacheBars("15M", [{ t: minute(now) + 60_000, c: 888 }]);
    const chartWins = await UDP.udPriceForDecision(asset.id, { nowMs: minute(now) + 90_000 });
    ok("14.7d · a chart-warmed bar that is NEWER still wins — the oracle only decides the no-chart case",
      chartWins?.price === 888, j(chartWins));
    VEN.publishOracleBar(asset.id, 111, new Date(minute(now) - 300_000).toISOString());
    const notBackwards = VEN.peekVendorBar(asset.id);
    ok("14.7e · ⛔ the oracle clock never moves backwards — an OLDER boundary does not replace what is held",
      notBackwards != null && notBackwards.c === 888, j(notBackwards));
    ok("14.7f · ⛔ A15 · not one of these made a paid call", paid === 0, `${paid} calls`);

    VEN.__clearVendorCacheForTests();
    await cacheBars("30M", [{ t: minute(now), c: 1 }], 500);
    ok("14.8 · a cached vendor FAILURE is no bar", VEN.peekVendorBar(asset.id) === null);

    VEN.__clearVendorCacheForTests();
    const b1 = minute(now) - 600_000, b2 = minute(now) - 300_000;
    await observe(b1, 200, now - 400_000);
    await observe(b2, 210, now - 30_000);
    const obs = await UDP.udPriceForDecision(asset.id, { nowMs: now });
    ok("14.9 · no bar → the LATEST confirmed observation, aged from the source's own quote time", obs?.source === "observation" && obs.price === 210 && obs.ageSec === 30, j(obs));
    const oldObs = await UDP.udPriceForDecision(asset.id, { nowMs: now + 210_000 });
    ok("14.10 · A15 test · a 4-minute-old observation and no vendor bar → null", oldObs === null, j(oldObs));
    const view = MV.projectMarketView(viewRow({ productLine: "UPDOWN", selectionClosedAt: null, resolutionAt: at(900), round: roundOf({ openPrice: 100, upTarget: 110, downTarget: 96 }) }));
    ok("14.11 · …which the closeness rule reads as UD_STALE_PRICE", DE.udCloseness(view, oldObs, 25) === "UD_STALE_PRICE");

    const realList = udd.observationStore.list;
    udd.observationStore.list = async () => { throw Object.assign(new Error("read failed"), { code: "P1001" }); };
    let unreadable: Any = "not called";
    try { unreadable = await UDP.udPriceForDecision(asset.id, { nowMs: now }); } catch (e) { unreadable = { threw: String((e as Error)?.message ?? e) }; } finally { Object.assign(udd.observationStore, { list: realList }); }
    ok("14.12 · an unreadable observation store → null (no older price, no throw)", unreadable === null, j(unreadable));

    // A15's red: the observation still sits at the open while the market has moved to 0.93 of the margin.
    VEN.__clearVendorCacheForTests();
    const margin = 4; // min(110 − 100, 100 − 96)
    await cacheBars("15M", [{ t: minute(now), c: 100 + 0.93 * margin }]);
    const moved = await UDP.udPriceForDecision(asset.id, { nowMs: minute(now) + 20_000 });
    ok("14.13 · ⭐ A15 · vendor bar at open + 0.93 × margin → UD_CLOSENESS at 25%", moved?.source === "vendor_bar" && DE.udCloseness(view, moved, 25) === "UD_CLOSENESS", j(moved));
    ok("14.14 · CONTROL · the same market read at the open price is close — the board-price read would have placed", DE.udCloseness(view, { price: 100, source: "observation", ageSec: 5 }, 25) === null);
    ok("14.15 · no paid vendor call was made anywhere in §14", paid === 0, `${paid} calls`);
  } finally {
    globalThis.fetch = realFetch;
    VEN.__clearVendorCacheForTests();
  }
});

/* ═══ §15 · Enter now: the loader, the opener draw and the holding predicate (N1 §4.1, §4.2, §4.4) ═════════════ */
section("§15 · loadEnterNowInput, openerSide and marketHeld");
const ENL: Any = await import("../../src/lib/server/house-bot/enter-now.ts");
const OS: Any = await import("../../src/lib/server/house-bot/opener-side.ts");
const RC: Any = await import("../../src/lib/server/house-bot/rules-context.ts");
const POOLS: Any = await import("../../src/lib/server/house-bot/pools.ts");
await guard("15", async () => {
  const w = await loadWorld();
  if (!(await w.db.user.findById(WORLD_OFFICER))) await w.user({ id: WORLD_OFFICER, role: "ADMIN" });
  await w.limits({ gStaffChosenMaxCounterpartyShare: 50 });
  await w.switchOn();
  // Earlier sections placed house bets this minute; GLOBAL_BETS_PER_MINUTE is not under test here.
  await w.ageHouseMinute();
  const S = HDAL;
  const ME = "world";
  const DRAW = { actorId: WORLD_OFFICER, drawnFor: "ENTER_NOW_PREVIEW" };
  const enterNowRules = (o: Any = {}) => {
    const r: Any = R.DEFAULT_RULES_V1({ stakeBounds: { minTzs: 1_000, maxTzs: 10_000_000 } });
    r.scope.products.polls = true;
    r.scope.categories = ["macro"];
    r.shaping.roundToTzs = 1_000;
    r.enterNow = { enabled: true, thinStakeTzs: 10_000, openerStakeTzs: 5_000 };
    return merge(r, o);
  };
  const botWith = async (caps: Any = {}, rules: Any = enterNowRules()) => {
    const b = await w.bot({ caps });
    const cur: Any = await S.houseBotStore.get(b.botId);
    const saved = await S.houseBotStore.saveRules(b.botId, cur.rulesVersion, { rules });
    if (!saved.ok) throw new Error("§15 fixture: saveRules CAS failed");
    return b;
  };
  // An AI result check recorded on a LIVE poll, written as §12 writes it.
  const stamp = async (marketId: string) => {
    if (w.onPostgres) {
      await w.prisma().$executeRawUnsafe(`UPDATE "PredictionMarket" SET "sentinelOutcome" = 'YES', "sentinelConfidence" = 97 WHERE "id" = $1`, marketId);
    } else {
      const stored = await w.mdal.marketStore.get(marketId);
      await w.mdal.marketStore.set({ ...stored, sentinelOutcome: "YES", sentinelConfidence: 97 });
    }
  };
  const drawsOn = async (marketId: string) => ((await S.houseBotEventStore.listByKinds(["OPENER_SIDE_DRAWN"], { marketId, limit: 50 })) as Any[]);
  const finishLive = (id: string) => S.houseBotIntentStore.finish(id, ME, { status: "CANCELLED", reasonCode: "BOT_NOT_ACTIVE" });
  const NOT_HELD = j({ held: false });
  // A decision that throws is an answer the case asserts on — never a throw handed to the section guard, which would
  // report only "threw" and skip every case after it (mutation E25 first missed 15.25 that way).
  const decideSafe = (input: Any): Any => { try { return EN.enterNowDecision(input); } catch (e) { return { threw: String((e as Error)?.message ?? e) }; } };

  /* ── 15.0 UX-15's worked example on a real poll ── */
  const b1 = await botWith();
  const m = await w.poll();
  const players: string[] = [];
  for (const [s, stake] of [["YES", 4_000], ["YES", 4_000], ["YES", 4_000], ["NO", 3_000]] as Array<[string, number]>) {
    const p = await w.user({ balance: 100_000 });
    players.push(p);
    const r = await w.svc.buyPosition(p, { marketId: m.id, side: s, stake, idempotencyKey: crypto.randomUUID() });
    if (!r.ok) throw new Error(`§15 fixture: a player bet was refused — ${j(r)}`);
  }
  // Grace 0: each exit closed at placement; 10 s back puts every stake past LOCK_MARGIN_MS.
  for (const p of await w.positionsOf(m.id)) await w.backdate(p.id, 10_000);
  const load = await ENL.loadEnterNowInput(b1.botId, m.id, DRAW, { randomInt: () => 1 });
  const inp: Any = load.ok ? load.input : null;
  ok("15.0 · fixture · the rules parse with Enter now on and round-to 1,000; the platform bounds admit 1,000–10,000",
    !!inp && inp.rules.thinStakeTzs === 10_000 && inp.rules.openerStakeTzs === 5_000 && inp.rules.roundToTzs === 1_000 && inp.bounds.max >= 10_000 && inp.bounds.min <= 1_000, j(load));
  ok("15.1 · the loader reads UX-15's pools through lockedForHouse: locked YES 12,000 · raw and locked NO 3,000 · three YES accounts",
    !!inp && inp.pools.YES.locked === 12_000 && inp.pools.NO.raw === 3_000 && inp.pools.NO.locked === 3_000 && inp.pools.YES.accounts.length === 3, j(inp?.pools));
  ok("15.2 · a poll holding money is never drawn: openerDraw null, drawn false, not blocked, no OPENER_SIDE_DRAWN row",
    !!inp && inp.openerDraw === null && load.drawn === false && inp.blocked === false && (await drawsOn(m.id)).length === 0, j(inp?.openerDraw));
  const d: Any = inp ? decideSafe(inp) : null;
  ok("15.3 · ⭐ UX-15 end to end: THIN on NO, 9,000, binding room, top account 33.3%, three attributed accounts",
    d?.ok === true && d.side === "NO" && d.entryCondition === "THIN" && d.stakeTzs === 9_000 && d.binding === "room" && d.decision.lockedByTopAccountPct === 33.3 && d.decision.attributedAccounts === 3, j(d));
  const usage = await S.houseSeamStore.botUsage({ houseBotId: b1.botId, marketId: m.id });
  const wallet: Any = await w.db.wallet.findByUserId(b1.userId);
  const bounds = await w.svc.stakeBoundsForMarket({ id: m.id, productLine: "MARKET" });
  const control: Any = await S.houseBotControlStore.get();
  ok("15.4 · the figures are the seam's own reads: stake on market, live balance, stakeBoundsForMarket, the share limit",
    !!inp && inp.bot.stakeOnMarket === usage.stakeOnMarket && inp.bot.balance === wallet.balance && j(inp.bounds) === j(bounds)
      && inp.control.gStaffChosenMaxCounterpartyShare === control.gStaffChosenMaxCounterpartyShare && control.gStaffChosenMaxCounterpartyShare === 50, j(inp?.bot));
  ok("15.5 · now is the database clock, and every account on BOTH sides is asked for today's counters (four, all zero)",
    !!inp && Math.abs(Date.parse(inp.now) - Date.now()) < 5_000 && inp.counterparties.length === 4 && inp.counterparties.every((c: Any) => c.count === 0 && c.tzs === 0)
      && players.every((p) => inp.counterparties.some((c: Any) => c.userId === p)), j(inp?.counterparties));

  /* ── 15.6 the figure the preview shows is the figure the gate places ── */
  const manual = await w.intent(b1, m.id, { kind: "MANUAL", entryCondition: "THIN", side: d?.side, stakeTzs: d?.stakeTzs, decision: d?.decision ?? {}, why: d?.why ?? null });
  const placed = await w.place(b1, manual);
  const pos: Any = (await w.positionsOf(m.id)).find((p: Any) => p.houseBotId === b1.botId);
  ok("15.6 · ⭐ the decided side and stake go through placeHouseBet unchanged (preview = gate)", placed.ok === true && pos?.side === "NO" && pos?.stake === 9_000, j(placed));
  const after = await ENL.loadEnterNowInput(b1.botId, m.id, DRAW);
  const ai: Any = after.ok ? after.input : null;
  ok("15.7 · after it: own {NO, 1, 9,000}; the bot's staked, staff-chosen, per-market and the house-on-market figures count it",
    !!ai && j(ai.own) === j({ side: "NO", count: 1, stakeTzs: 9_000 }) && ai.bot.staffChosenCountToday === 1 && ai.bot.staffChosenTzsToday === 9_000
      && ai.control.globalStaffChosenCountToday >= 1 && ai.bot.stakedToday === 9_000 && ai.bot.stakeOnMarket === 9_000 && ai.control.houseOnMarket === 9_000,
    j(ai && { own: ai.own, bot: ai.bot, houseOnMarket: ai.control.houseOnMarket }));
  ok("15.8 · …the rate facts carry its placement instant, in the bot's 24 h window and the platform minute",
    !!ai && ai.bot.placedAt.length === 1 && Date.parse(ai.bot.placedAt[0]) === Date.parse(pos.placedAt) && ai.control.platformPlacedAt.some((t: string) => Date.parse(t) === Date.parse(pos.placedAt)),
    j(ai && { bot: ai.bot.placedAt, platform: ai.control.platformPlacedAt, pos: pos?.placedAt }));
  ok("15.9 · …each YES account is charged its attributed 3,000 today (count 1)",
    !!ai && players.slice(0, 3).every((p) => { const c = ai.counterparties.find((x: Any) => x.userId === p); return c?.count === 1 && c?.tzs === 3_000; }), j(ai?.counterparties));
  ok("15.10 · …and the thin side is gone: the same load now decides BALANCED", !!ai && decideSafe(ai).code === "BALANCED", j(ai && decideSafe(ai)));

  /* ── 15.11 marketHeld (N1 §4.4; §6 refusal 15 a–d) ── */
  ok("15.11 · one placed stake here and room under the per-market count → not held", j(await ENL.marketHeld(b1.botId, m.id)) === NOT_HELD);
  await w.setCaps(b1.botId, { freqMaxPerMarket: 1 });
  const atCount = await ENL.marketHeld(b1.botId, m.id);
  ok("15.12 · count 1 of max 1 → PER_MARKET_COUNT {count 1, max 1}", atCount.held && atCount.code === "PER_MARKET_COUNT" && atCount.count === 1 && atCount.max === 1, j(atCount));
  const second = await w.intent(b1, m.id, { kind: "FILL", side: "NO", stakeTzs: 1_000 });
  const gate = await w.place(b1, second);
  ok("15.13 · ⭐ ruling 58 · the seam refuses that market for the same reason (house_cap_reached PER_MARKET_COUNT)",
    gate.ok === false && gate.reason === "house_cap_reached" && gate.detail?.cap === "PER_MARKET_COUNT", j(gate));
  await finishLive(second.id);
  await w.setCaps(b1.botId, { freqMaxPerMarket: null });
  const unset = await ENL.marketHeld(b1.botId, m.id);
  ok("15.14 · a per-market count that is not set holds the market (the seam refuses NULL)", unset.held && unset.code === "PER_MARKET_COUNT" && unset.max === null, j(unset));
  await w.setCaps(b1.botId, { freqMaxPerMarket: 6 });

  const b2 = await botWith();
  const byPosition = await ENL.marketHeld(b2.botId, m.id);
  ok("15.15 · another bot's OPEN house position → OTHER_BOT (an aggregate read: no bot id)", byPosition.held && byPosition.code === "OTHER_BOT" && byPosition.botId === null, j(byPosition));

  const m2 = await w.poll();
  ok("15.16 · CONTROL · an untouched poll is held for nobody", j(await ENL.marketHeld(b1.botId, m2.id)) === NOT_HELD && j(await ENL.marketHeld(b2.botId, m2.id)) === NOT_HELD);
  const i2 = await w.intent(b2, m2.id, { kind: "FILL", side: "YES", stakeTzs: 1_000 });
  const byIntent = await ENL.marketHeld(b1.botId, m2.id);
  ok("15.17 · another bot's live intent → OTHER_BOT naming that bot", byIntent.held && byIntent.code === "OTHER_BOT" && byIntent.botId === b2.botId, j(byIntent));
  const ownIntent = await ENL.marketHeld(b2.botId, m2.id);
  ok("15.18 · the bot's own live intent → OWN_INTENT with its id, kind and due time",
    ownIntent.held && ownIntent.code === "OWN_INTENT" && ownIntent.intentId === i2.id && ownIntent.kind === "FILL" && ownIntent.dueAt === i2.dueAt, j(ownIntent));
  ok("15.19 · …except the row being fired (ignoreIntentId) → not held", j(await ENL.marketHeld(b2.botId, m2.id, { ignoreIntentId: i2.id })) === NOT_HELD);
  await finishLive(i2.id);
  ok("15.20 · a finished intent holds nothing", j(await ENL.marketHeld(b1.botId, m2.id)) === NOT_HELD);

  const m3 = await w.poll();
  await S.targetStore.insert({
    id: S.newHouseId("target"), houseBotId: b2.botId, marketId: m3.id, delayMinSec: 5, delayMaxSec: 10, timingFrom: "STAKE", reactTo: "FIRST",
    createdById: WORLD_OFFICER, snapshot: { titleEn: "Target poll", category: "macro", cutoff: w.iso(3_600_000), rawYes: 0, rawNo: 0 },
  });
  const byTarget = await ENL.marketHeld(b1.botId, m3.id);
  ok("15.21 · another bot's ACTIVE target → OTHER_BOT naming that bot", byTarget.held && byTarget.code === "OTHER_BOT" && byTarget.botId === b2.botId, j(byTarget));
  ok("15.22 · the targeting bot is not held by its own target", j(await ENL.marketHeld(b2.botId, m3.id)) === NOT_HELD);

  const m4 = await w.poll();
  const holderBet = await w.svc.buyPosition(b1.userId, { marketId: m4.id, side: "YES", stake: 1_000, idempotencyKey: crypto.randomUUID() });
  const i4 = await w.intent(b2, m4.id, { kind: "FILL", side: "YES", stakeTzs: 1_000 });
  const byOwner = await ENL.marketHeld(b1.botId, m4.id);
  ok("15.23 · the holder's own OPEN stake → OWNER_POSITION, answered before another bot's intent (§6 order: a before b)",
    holderBet.ok === true && byOwner.held && byOwner.code === "OWNER_POSITION", `${j(holderBet)} · ${j(byOwner)}`);
  await finishLive(i4.id);

  /* ── 15.24 blackout first, then one draw per market ── */
  const m5 = await w.poll();
  await stamp(m5.id);
  const dark = await ENL.loadEnterNowInput(b1.botId, m5.id, DRAW, { randomInt: () => 1 });
  ok("15.24 · ⭐ blackout first: an EMPTY poll with a recorded AI check loads blocked, with no draw and no OPENER_SIDE_DRAWN row",
    dark.ok && dark.input.blocked === true && dark.input.openerDraw === null && dark.drawn === false && (await drawsOn(m5.id)).length === 0, j(dark.ok ? { blocked: dark.input.blocked, draw: dark.input.openerDraw } : dark));
  ok("15.25 · …and the decision refuses INFO_BLACKOUT", dark.ok && decideSafe(dark.input).code === "INFO_BLACKOUT", j(dark.ok ? decideSafe(dark.input) : dark));

  const m6 = await w.poll();
  const first = await ENL.loadEnterNowInput(b1.botId, m6.id, DRAW, { randomInt: () => 1 });
  const rows6 = await drawsOn(m6.id);
  const draw6: Any = first.ok ? first.input.openerDraw : null;
  ok("15.26 · an empty poll draws: side NO (randomInt → 1), for ENTER_NOW_PREVIEW, drawn true", draw6?.side === "NO" && draw6?.drawnFor === "ENTER_NOW_PREVIEW" && first.drawn === true, j(first));
  ok("15.27 · …one OPENER_SIDE_DRAWN row carrying the officer, the bot, the side and the draw time",
    rows6.length === 1 && rows6[0].actorId === WORLD_OFFICER && rows6[0].houseBotId === b1.botId && rows6[0].payload?.side === "NO" && Date.parse(rows6[0].createdAt) === Date.parse(draw6?.drawnAt), j(rows6));
  const dOpen: Any = first.ok ? decideSafe(first.input) : null;
  ok("15.28 · …and the decision is OPENER on the drawn side for the opener stake", dOpen?.ok === true && dOpen.entryCondition === "OPENER" && dOpen.side === "NO" && dOpen.stakeTzs === 5_000 && dOpen.binding === "openerStake", j(dOpen));
  const again = await ENL.loadEnterNowInput(b2.botId, m6.id, { actorId: null, drawnFor: "ENTER_NOW" }, { randomInt: () => 0 });
  ok("15.29 · ⭐ never re-rolled: another bot, another caller and randomInt → 0 read the SAME side, drawnFor and drawnAt; still one row",
    again.ok && j(again.input.openerDraw) === j(draw6) && again.drawn === false && (await drawsOn(m6.id)).length === 1, j(again.ok ? again.input.openerDraw : again));

  const m7 = await w.poll();
  const drawArgs = { houseBotId: b1.botId, actorId: null, drawnFor: "OPENER_PLAN" };
  let inLockThrew = false;
  try { await L.withLock(`hb-test:draw:${m7.id}`, async () => OS.openerSide(m7.id, drawArgs, { randomInt: () => 0 })); } catch { inLockThrew = true; }
  ok("15.30 · openerSide inside a lock throws and writes no draw", inLockThrew && (await drawsOn(m7.id)).length === 0);
  let badRandom = false;
  try { await OS.openerSide(m7.id, drawArgs, { randomInt: () => 2 }); } catch { badRandom = true; }
  ok("15.31 · a random answer other than 0 or 1 throws and writes no draw", badRandom && (await drawsOn(m7.id)).length === 0);
  const plain = await OS.openerSide(m7.id, drawArgs, { randomInt: () => 0 });
  ok("15.32 · CONTROL · the same call outside a lock draws YES (randomInt → 0)", plain.side === "YES" && plain.drawn === true && (await drawsOn(m7.id)).length === 1, j(plain));

  /* ── 15.33 refusals the loader owns ── */
  const future = await botWith({}, { schemaVersion: 99 });
  const outdated = await botWith({}, { schemaVersion: 0 });
  const rf = await ENL.loadEnterNowInput(future.botId, m2.id, DRAW);
  const ro = await ENL.loadEnterNowInput(outdated.botId, m2.id, DRAW);
  ok("15.33 · rules saved by a newer build → RULES_FROM_FUTURE; an outdated format → RULES_REVIEW", !rf.ok && rf.code === "RULES_FROM_FUTURE" && !ro.ok && ro.code === "RULES_REVIEW", `${j(rf)} · ${j(ro)}`);
  const noBot = await ENL.loadEnterNowInput("hb_not_there", m2.id, DRAW);
  const noMarket = await ENL.loadEnterNowInput(b1.botId, "mkt_hb_not_there", DRAW);
  ok("15.34 · a missing bot → BOT_MISSING; a missing market → MARKET_MISSING", noBot.code === "BOT_MISSING" && noMarket.code === "MARKET_MISSING", `${j(noBot)} · ${j(noMarket)}`);

  /* ── 15.35 the view's locked-pool inputs, placedTimes, the parse context ── */
  const m8 = await w.poll({ graceMin: 5, paidMin: 2 });
  const viewIn = POOLS.lockedPoolInputsOfView(MV.projectMarketView(await S.houseSeamStore.marketView(m8.id)));
  const rowIn = POOLS.lockedPoolInputs(await w.mdal.marketStore.get(m8.id));
  ok("15.35 · the view's locked-pool inputs equal H3's from the market row: grace 5 min, paid 2 min, the same close",
    viewIn.graceMs === 300_000 && viewIn.paidMs === 120_000 && rowIn.graceMs === viewIn.graceMs && rowIn.paidMs === viewIn.paidMs && Date.parse(rowIn.closesAt) === Date.parse(viewIn.closesAt), `${j(viewIn)} vs ${j(rowIn)}`);

  const t1 = await S.houseSeamStore.placedTimes({ houseBotId: b1.botId, withinSec: 86_400 });
  const t2 = await S.houseSeamStore.placedTimes({ houseBotId: b2.botId, withinSec: 86_400 });
  ok("15.36 · placedTimes: the bot's own placement and nothing of another bot's", t1.length === 1 && Date.parse(t1[0]) === Date.parse(pos.placedAt) && t2.length === 0, `${j(t1)} · ${j(t2)}`);
  const all = await S.houseSeamStore.placedTimes({ houseBotId: null, withinSec: 86_400 });
  ok("15.37 · every bot's placements (null) include it, newest first",
    all.some((t: string) => Date.parse(t) === Date.parse(pos.placedAt)) && all.every((t: string, k: number) => k === 0 || Date.parse(all[k - 1]) >= Date.parse(t)), `${all.length} rows`);
  const argOutcomes: string[] = [];
  for (const bad of [0, 86_401, 1.5, -1]) {
    try { await S.houseSeamStore.placedTimes({ houseBotId: b1.botId, withinSec: bad }); argOutcomes.push(`${bad}:accepted`); } catch { argOutcomes.push(`${bad}:refused`); }
  }
  ok("15.38 · a window outside 1–86,400 whole seconds is refused", argOutcomes.every((s) => s.endsWith(":refused")), argOutcomes.join(" "));
  await w.backdate(pos.id, 60_000);
  const in3600 = await S.houseSeamStore.placedTimes({ houseBotId: b1.botId, withinSec: 3_600 });
  const in30 = await S.houseSeamStore.placedTimes({ houseBotId: b1.botId, withinSec: 30 });
  await w.backdate(pos.id, 2 * 86_400_000 - 60_000);
  const aged = await S.houseSeamStore.placedTimes({ houseBotId: b1.botId, withinSec: 86_400 });
  await w.backdate(pos.id, -2 * 86_400_000);
  ok("15.39 · the window is measured back from the database clock: a minute-old stake is inside 3,600 s, outside 30 s, and two days old is outside 86,400 s",
    in3600.length === 1 && in30.length === 0 && aged.length === 0, `${j(in3600)} · ${j(in30)} · ${j(aged)}`);

  // §12 disables its asset at the end, so §15 creates an enabled one of its own (sources were seeded by §12).
  const cfg: Any = await import("../../src/lib/server/updown-config.ts");
  const na = await cfg.createAsset({ key: `F${process.pid}`, symbol: "ETH/USD", nameEn: "Ether", nameSw: "Ether", iconKey: "crypto",
    priceSourceUrl: "https://api.twelvedata.com/quote", category: "crypto", decimals: 2, minMoveTicks: 2 }, WORLD_OFFICER);
  if (na.ok) {
    await cfg.setAssetEnabled(na.data.id, true, WORLD_OFFICER);
    await cfg.createChain({ assetId: na.data.id, durationMinutes: 5 }, WORLD_OFFICER);
  }
  const ctx = await RC.loadParseContext();
  const assets: Any[] = await cfg.listAssets({ enabledOnly: true });
  const chains: Any[] = await cfg.listChains();
  const ofEnabled = chains.filter((c) => assets.some((a) => a.id === c.assetId));
  const c0 = ofEnabled[0];
  const a0 = c0 ? assets.find((a) => a.id === c0.assetId) : null;
  ok("15.40 · fixture · an enabled asset with a chain exists (created here), and its id is not its symbol", !!a0 && a0.id !== a0.symbol && ofEnabled.some((c) => na.ok && c.assetId === na.data.id), j(a0 ?? na));
  const ofDisabled = chains.filter((c) => !assets.some((a) => a.id === c.assetId));
  ok("15.41b · a chain of a disabled asset (§12's, disabled at its end) is left out of the context",
    ofDisabled.length >= 1 && ofDisabled.every((c) => !ctx.chains.some((k: Any) => k.key === `${c.assetId}:${c.durationMinutes}`)), j(ofDisabled.map((c) => c.assetId)));
  ok("15.41 · the parse context: chain keys <assetId>:<durationMinutes> for every chain of an enabled asset; the platform's categories and durations",
    j(ctx.chains.map((c: Any) => c.key).sort()) === j(ofEnabled.map((c) => `${c.assetId}:${c.durationMinutes}`).sort())
      && j(ctx.categories) === j(R.RULES_CONTEXT_LISTS.categories) && j(ctx.durations) === j(R.RULES_CONTEXT_LISTS.durations), j(ctx.chains));
  if (a0) {
    const byId = R.parseHouseBotRules(enterNowRules({ scope: { products: { updown: true }, chains: [`${a0.id}:${c0.durationMinutes}`] } }), ctx);
    const bySymbol = R.parseHouseBotRules(enterNowRules({ scope: { products: { updown: true }, chains: [`${a0.symbol}:${c0.durationMinutes}`] } }), ctx);
    ok("15.42 · ⭐ a chain saved by asset id stays in scope; the same chain saved by symbol is dropped as stale",
      byId.ok && byId.stale.length === 0 && byId.rules.scope.chains.length === 1 && bySymbol.ok && bySymbol.stale.length === 1 && bySymbol.rules.scope.chains.length === 0, `${j(byId)} · ${j(bySymbol)}`);
  }

  if (!w.onPostgres) {
    const code = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8"));
    const FORBIDDEN15 = /\b(sentinel\w*|resolvedOutcome|resolutionEvidence|resolveClaimedAt|resolutionStage1By)\b/;
    for (const f of ["enter-now.ts", "opener-side.ts", "rules-context.ts"]) {
      const src = code(`src/lib/server/house-bot/${f}`);
      ok(`15.43 · A13 · ${f} reads no result-check field and never names StoredMarket`, !FORBIDDEN15.test(src) && !/\bStoredMarket\b/.test(src), (src.match(FORBIDDEN15) ?? [""])[0]);
    }
  }
});

/* ═══ §16 · fireClaimedIntent and the poller (PLAN F5, N1 §4.3 step 6, N2 §4 step 7, A16; rulings 63–70) ═════════ */
section("§16 · fireClaimedIntent and pollerPass");
const FI: Any = await import("../../src/lib/server/house-bot/fire.ts");
const WK: Any = await import("../../src/lib/server/house-bot/worker.ts");
const ADM: Any = await import("../../src/lib/server/admission.ts");
/* 16.63 reads and writes the holder's responsible-gambling row itself — never through `selfExclude`/`coolOff`/`setLimits`,
 * which fire the in-app holder hook (see the 16.63 block). */
const RG16: Any = await import("../../src/lib/server/responsible-gambling.ts");
await guard("16", async () => {
  const w = await loadWorld();
  if (!(await w.db.user.findById(WORLD_OFFICER))) await w.user({ id: WORLD_OFFICER, role: "ADMIN" });
  await w.limits();
  await w.switchOn();
  await w.ageHouseMinute();
  const S = HDAL;
  const ME = "world";
  // Earlier sections leave PENDING rows (requeues, deferrals); nothing in §16 may fire them by accident.
  await S.houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");
  const fireRules = (o: Any = {}) => {
    const r: Any = R.DEFAULT_RULES_V1({ stakeBounds: { minTzs: 1_000, maxTzs: 10_000_000 } });
    r.scope.products.polls = true;
    r.scope.categories = ["macro"];
    r.modes.polls = { counter: true, fill: true, opener: true };
    r.shaping.roundToTzs = 1_000;
    r.enterNow = { enabled: true, thinStakeTzs: 10_000, openerStakeTzs: 5_000 };
    r.targeting = { enabled: true };
    return merge(r, o);
  };
  const botWith = async (caps: Any = {}, rules: Any = fireRules()) => {
    const b = await w.bot({ caps });
    const cur: Any = await S.houseBotStore.get(b.botId);
    const saved = await S.houseBotStore.saveRules(b.botId, cur.rulesVersion, { rules });
    if (!saved.ok) throw new Error("§16 fixture: saveRules CAS failed");
    return b;
  };
  const recorder = (o: { placedThrows?: boolean } = {}) => {
    const calls: Any[] = [];
    const alerts = {
      placed: async (i: Any) => { calls.push({ fn: "placed", id: i.id, inFlight: EN2.engineState().inFlight.has(i.id) }); if (o.placedThrows) throw new Error("alert channel down"); },
      /* ⛔ `detail` IS CAPTURED, and 16.515f is why: a D19 case that asks "does this bell name a holder?" over calls
       * that never carried a detail is an absence measured over NOTHING, and passes on every build. */
      once: async (key: string, m: Any) => { calls.push({ fn: "once", key, code: m.code, detail: m.detail }); },
      security: async (m: Any) => { calls.push({ fn: "security", code: m.code }); },
      botStopped: async (bot: Any, change: Any) => { calls.push({ fn: "botStopped", botId: bot.id, ...change }); },
    };
    return { alerts, calls, count: (fn: string) => calls.filter((c) => c.fn === fn).length };
  };
  // Every call is caught and asserted: a throw handed to the section guard would skip every later case (E25's lesson).
  const fireSafe = async (intent: Any, alerts: Any, me = ME): Promise<Any> => { try { return await FI.fireClaimedIntent(intent, { me, alerts }); } catch (e) { return { threw: String((e as Error)?.message ?? e) }; } };
  const fire = fireSafe;
  const passSafe = async (ctx: Any, alerts: Any): Promise<Any> => { try { return await WK.pollerPass(ctx, alerts); } catch (e) { return { threw: String((e as Error)?.message ?? e) }; } };
  const row = (id: string) => S.houseBotIntentStore.get(id) as Promise<Any>;
  const is = async (id: string, status: string, code: string | null) => { const r = await row(id); return !!r && r.status === status && (code == null || r.reasonCode === code); };
  const houseOn = async (marketId: string) => (await w.positionsOf(marketId)).filter((p: Any) => p.houseBotId != null);
  const FILL = (o: Any = {}) => ({ kind: "FILL", side: "NO", stakeTzs: 2_000, ...o });
  const MANUAL = (o: Any = {}) => ({ kind: "MANUAL", entryCondition: "THIN", side: "NO", stakeTzs: 2_000, ...o });
  const closeLive = async (id: string) => { await S.houseBotIntentStore.finish(id, ME, { status: "CANCELLED", reasonCode: "BOT_NOT_ACTIVE" }); await S.houseBotIntentStore.cancelPending(id, "BOT_NOT_ACTIVE"); };
  /** A LIVE poll; `yes` > 0 puts a player's YES stake on it, aged past the exit close + LOCK_MARGIN_MS (grace 0). */
  const lockedPoll = async (yes = 10_000, o: Any = {}) => {
    const m = await w.poll(o);
    if (yes <= 0) return { m, player: null as string | null, positionId: null as string | null };
    const p = await w.user({ balance: 100_000 });
    const r = await w.svc.buyPosition(p, { marketId: m.id, side: "YES", stake: yes, idempotencyKey: crypto.randomUUID() });
    if (!r.ok) throw new Error(`§16 fixture: a player bet was refused — ${j(r)}`);
    for (const pos of await w.positionsOf(m.id)) await w.backdate(pos.id, 10_000);
    return { m, player: p as string | null, positionId: r.data.positionId as string | null };
  };
  // A market change that has its own flows (close, reopen), written as §12 writes result stamps.
  const setMarket = async (marketId: string, patch: { status?: string; reopened?: boolean }) => {
    if (w.onPostgres) {
      if (patch.status) await w.prisma().$executeRawUnsafe(`UPDATE "PredictionMarket" SET "status" = '${patch.status}' WHERE "id" = $1`, marketId);
      if (patch.reopened) await w.prisma().$executeRawUnsafe(`UPDATE "PredictionMarket" SET "reopenedAt" = now() WHERE "id" = $1`, marketId);
    } else {
      const stored = await w.mdal.marketStore.get(marketId);
      await w.mdal.marketStore.set({ ...stored, ...(patch.status ? { status: patch.status } : {}), ...(patch.reopened ? { reopenedAt: new Date().toISOString() } : {}) });
    }
  };
  const pendingRow = (b: Any, marketId: string, o: Any = {}) => ({
    id: S.newHouseId("intent"), houseBotId: b.botId, botUserId: b.userId, kind: "FILL", marketId, productLine: "MARKET", anchorKey: marketId,
    triggerPositionId: null, triggerUserId: null, targetId: null, requestedById: null, entryCondition: null, side: "NO", stakeTzs: 2_000,
    dueAt: w.iso(-5_000), deadlineAt: w.iso(3_600_000), staleAt: w.iso(600_000), status: "PENDING", reasonCode: null, why: null,
    decision: {}, attempts: 0, transientAttempts: 0, nextAttemptAt: null, claimedBy: null, claimedUntil: null, positionId: null, finishedAt: null, alertedAt: null, ...o,
  });
  /** A promise's value, or `{ threw }` — never a throw handed to the section guard. */
  const settle = async (p: Any): Promise<Any> => { try { return await p; } catch (e) { return { threw: String((e as Error)?.message ?? e) }; } };
  /**
   * REMOVE a bot a 16.63/16.69 block made (§19's `retire`), so no account left ACTIVE, AUTO_PAUSED or carrying
   * responsible-gambling state reaches a later section. Never throws: it answers whether the bot is REMOVED after.
   */
  const retire16 = async (botId: string): Promise<boolean> => {
    try {
      const b: Any = await S.houseBotStore.get(botId);
      if (b && b.status !== "REMOVED") {
        await S.houseBotStore.setStatus(botId, {
          from: [b.status], to: "REMOVED", pauseReason: null, pausedFromStatus: null,
          removal: { byId: WORLD_OFFICER, reason: "section 16 fixture", cause: "MANUAL" },
        });
      }
      return ((await S.houseBotStore.get(botId)) as Any)?.status === "REMOVED";
    } catch {
      return false;
    }
  };

  /* ── 16.1 MON-13 preconditions, inFlight, the placed path ── */
  {
    const b = await botWith();
    const { m } = await lockedPoll();
    const i = await w.intent(b, m.id, FILL({ stakeTzs: 5_000 }));
    const rec = recorder();
    const inLock = await L.withLock(`hb-test:fire:${i.id}`, async () => fireSafe(i, rec.alerts));
    ok("16.1 · MON-13 · fire inside a lock throws; the row stays CLAIMED and is never registered in flight",
      typeof inLock?.threw === "string" && (await is(i.id, "CLAIMED", null)) && !EN2.engineState().inFlight.has(i.id), j(inLock));
    const inSlot = await ADM.withAdmission(async () => fireSafe(i, rec.alerts));
    ok("16.2 · MON-13 · fire inside an admission slot throws; the row stays CLAIMED", typeof inSlot?.threw === "string" && (await is(i.id, "CLAIMED", null)), j(inSlot));
    const out = await fire(i, rec.alerts);
    const house = await houseOn(m.id);
    ok("16.3 · a FILL against players' locked money places through the seam: PLACED, one NO 5,000 house position, one placed alert",
      out.kind === "outcome" && out.outcome.kind === "placed" && (await is(i.id, "PLACED", null)) && house.length === 1 && house[0].side === "NO" && house[0].stake === 5_000 && rec.count("placed") === 1, j(out));
    ok("16.4 · ruling 69 · the row is in flight while it fires (seen from the alert) and gone after", rec.calls.find((c) => c.fn === "placed")?.inFlight === true && !EN2.engineState().inFlight.has(i.id), j(rec.calls));
  }
  {
    const b = await botWith();
    const { m } = await lockedPoll();
    const i = await w.intent(b, m.id, FILL());
    const out = await fireSafe(i, recorder({ placedThrows: true }).alerts);
    ok("16.5 · ruling 68 · applyOutcome throwing (the alert failed after the stake) → fire never throws; the requeue finds nothing to hand back (PLACED)",
      out.kind === "requeued" && out.written === false && (await is(i.id, "PLACED", null)), j(out));
    ok("16.6 · …and the row is out of inFlight on that path too", !EN2.engineState().inFlight.has(i.id));
  }

  /* ── 16.69 · B7's FIRST limb · THE FIRE HEARTBEAT (ruling 69, ENG-33; RESUME-HERE §0c decision 6, build step 5) ──
   * MEASURED before this build: no case on either store asserted ANY part of it — no script named FIRE_HEARTBEAT_MS
   * or called `.heartbeat(`, and no declared mutation touched fire.ts's timer or either DAL twin's `heartbeat`.
   * ⛔ THE TIMER IS CAPTURED, NEVER WAITED FOR. `fireClaimedIntent` registers its interval SYNCHRONOUSLY, before its
   * first await, so `setInterval` is patched for that one synchronous start and put back at once. `clearInterval` stays
   * patched until the fire has returned (fire.ts clears in its `finally`) and hands every handle that is not the
   * captured one to the real function, so a timer a lock, an admission slot or Prisma clears meanwhile is untouched.
   * ⛔ THE FIRE IS PARKED AT ITS FIRST READ — `houseBotControlStore.get`, the master switch — so a tick lands while the
   * row is still CLAIMED and in flight. Only that one call is parked (the store is put back at once), and the gate is
   * opened in a `finally` BEFORE the fire is awaited: a failing case must never hang the section.
   * ⛔ The rows are inserted CLAIMED with claimedUntil +20 s, so an extension to ≈ now + CLAIM_TTL_SEC is a move of
   * minutes that a TOLERANCE reads on either clock (Postgres writes the database's now(), memory Date.now()); "did not
   * move" is two reads of an untouched value, so it is exact. */
  const beatingFire = (i: Any, alerts: Any, o: { me?: string; beat?: (...a: Any[]) => Promise<Any> } = {}) => {
    const realSet = globalThis.setInterval;
    const realClear = globalThis.clearInterval;
    const control = S.houseBotControlStore;
    const realGet = control.get;
    const intents = S.houseBotIntentStore;
    const realBeat = intents.heartbeat;
    const handle: Any = { unrefs: 0, unref() { this.unrefs++; return this; }, ref() { return this; }, hasRef() { return false; } };
    const set: Array<{ fn: () => void; ms: number }> = [];
    const calls: Array<{ args: Any[]; pr: Promise<Any> }> = [];
    let cleared = 0, parked = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    let p!: Promise<Any>;
    try {
      (globalThis as Any).setInterval = (fn: () => void, ms: number) => { set.push({ fn, ms }); return handle; };
      (globalThis as Any).clearInterval = (h: Any) => { if (h === handle) { cleared++; return undefined; } return realClear(h); };
      control.get = async (...a: Any[]) => { parked++; await gate; return realGet.apply(control, a); };
      intents.heartbeat = (...a: Any[]) => { const pr = (o.beat ?? realBeat).apply(intents, a); calls.push({ args: a, pr }); return pr; };
      p = fireSafe(i, alerts, o.me ?? ME);
    } catch (e) {
      // Nothing started: put back what only `restore` would otherwise put back.
      release();
      (globalThis as Any).clearInterval = realClear;
      Object.assign(intents, { heartbeat: realBeat });
      throw e;
    } finally {
      // Only fire's OWN interval is captured, and only its own first read is parked.
      (globalThis as Any).setInterval = realSet;
      Object.assign(control, { get: realGet });
    }
    return {
      p, set, handle, calls,
      parked: () => parked,
      cleared: () => cleared,
      release: () => release(),
      /** Once the fire has returned: the real clearInterval and the real heartbeat back, and the gate open whatever happened. */
      restore: () => { release(); (globalThis as Any).clearInterval = realClear; Object.assign(intents, { heartbeat: realBeat }); },
    };
  };
  /** One gated fire: `atGate` runs while it is parked, then the gate opens, the fire is awaited and everything is put back. */
  const withBeatingFire = async (i: Any, alerts: Any, atGate: (f: Any) => Promise<void>, o: { me?: string; beat?: (...a: Any[]) => Promise<Any> } = {}) => {
    const f = beatingFire(i, alerts, o);
    try {
      try { await atGate(f); } finally { f.release(); }
      return { f, out: await f.p };
    } finally {
      await f.p; // fireSafe never rejects, and the gate is already open
      f.restore();
    }
  };
  const claimedRow = async (b: Any, marketId: string): Promise<Any> =>
    row((await S.houseBotIntentStore.insert(pendingRow(b, marketId, { status: "CLAIMED", claimedBy: ME, claimedUntil: w.iso(20_000), attempts: 1, stakeTzs: 5_000 }))).id);
  const made69 = { bots: [] as string[], rows: [] as string[] };
  {
    const b = await botWith();
    made69.bots.push(b.botId);
    const { m } = await lockedPoll(10_000);
    const i = await claimedRow(b, m.id);
    made69.rows.push(i.id);
    let r: Any, mid: Any, tickAt = 0, callsMid = 0, clearedMid = -1, parkedMid = 0, inFlightMid = false;
    const { f, out } = await withBeatingFire(i, recorder().alerts, async (g: Any) => {
      inFlightMid = EN2.engineState().inFlight.has(i.id);
      parkedMid = g.parked();
      tickAt = Date.now();
      g.set[0]?.fn();
      callsMid = g.calls.length;
      r = await settle(g.calls[0]?.pr);
      mid = await row(i.id);
      clearedMid = g.cleared();
    });
    ok("16.69a · ⭐ ruling 69 · fire starts ONE heartbeat timer, every FIRE_HEARTBEAT_MS, unref'd so it never holds the process open — and a claim's TTL is more than three beats long, so two failed beats in a row still leave the claim alive",
      f.set.length === 1 && f.set[0].ms === K.FIRE_HEARTBEAT_MS && f.handle.unrefs === 1 && K.FIRE_HEARTBEAT_MS * 3 < K.CLAIM_TTL_SEC * 1000,
      j({ timers: f.set.map((s: Any) => s.ms), unrefs: f.handle.unrefs, beatMs: K.FIRE_HEARTBEAT_MS, ttlSec: K.CLAIM_TTL_SEC }));
    ok("16.69b · ⭐ ruling 69 · the heartbeat, ticked while the fire is still in flight (parked at its first read, the row CLAIMED), extends THIS worker's claim: heartbeat(row, me) answers true and claimedUntil moves from +20 s to ≈ now + CLAIM_TTL_SEC",
      inFlightMid && parkedMid === 1 && callsMid === 1 && j(f.calls[0]?.args) === j([i.id, ME]) && r === true && mid?.status === "CLAIMED"
        && Date.parse(mid.claimedUntil) - Date.parse(i.claimedUntil) >= 150_000
        && Math.abs(Date.parse(mid.claimedUntil) - (tickAt + K.CLAIM_TTL_SEC * 1000)) < 10_000,
      j({ inFlight: inFlightMid, parked: parkedMid, calls: callsMid, args: f.calls[0]?.args, r, was: i.claimedUntil, now: mid?.claimedUntil, status: mid?.status, tickAt: new Date(tickAt).toISOString() }));
    const house = await houseOn(m.id);
    const placed: Any = await row(i.id);
    ok("16.69c · …and the fire then places as usual, and its timer is cleared only when it returns — never while it was parked, exactly once after",
      out?.kind === "outcome" && out.outcome?.kind === "placed" && placed?.status === "PLACED" && house.length === 1 && house[0].stake === 5_000
        && clearedMid === 0 && f.cleared() === 1 && !EN2.engineState().inFlight.has(i.id),
      j({ out, row: placed?.status, house: house.map((p: Any) => p.stake), clearedMid, cleared: f.cleared() }));
    const late = await settle(S.houseBotIntentStore.heartbeat(i.id, ME));
    const after: Any = await row(i.id);
    ok("16.69d · a heartbeat on a row that is no longer CLAIMED writes nothing: on the PLACED row, which still carries this worker's claimedBy, it answers false and claimedUntil does not move",
      placed?.status === "PLACED" && placed.claimedBy === ME && late === false && after?.status === "PLACED" && Date.parse(after.claimedUntil) === Date.parse(placed.claimedUntil),
      j({ late, before: placed && [placed.status, placed.claimedBy, placed.claimedUntil], after: after && [after.status, after.claimedUntil] }));
  }
  {
    // The same fixture fired by a worker that does NOT hold the claim (16.12's shape).
    const b = await botWith();
    made69.bots.push(b.botId);
    const { m } = await lockedPoll(10_000);
    const i = await claimedRow(b, m.id);
    made69.rows.push(i.id);
    let r: Any, mid: Any, callsMid = 0;
    const { f, out } = await withBeatingFire(i, recorder().alerts, async (g: Any) => {
      g.set[0]?.fn();
      callsMid = g.calls.length;
      r = await settle(g.calls[0]?.pr);
      mid = await row(i.id);
    }, { me: "another-worker" });
    ok("16.69e · ⛔ a heartbeat never extends ANOTHER worker's claim: ticked from a fire that does not hold the row, it answers false and claimedUntil does not move — and that fire ends LOST (ruling 165), nothing placed",
      callsMid === 1 && j(f.calls[0]?.args) === j([i.id, "another-worker"]) && r === false
        && mid?.status === "CLAIMED" && mid.claimedBy === ME && Date.parse(mid.claimedUntil) === Date.parse(i.claimedUntil)
        && out?.kind === "lost" && (await houseOn(m.id)).length === 0,
      j({ calls: callsMid, args: f.calls[0]?.args, r, mid: mid && [mid.status, mid.claimedBy, mid.claimedUntil], was: i.claimedUntil, out }));
    await closeLive(i.id);
  }
  {
    /* ⛔ THE ONE THROW ROUTE OUT OF fire(), AND THE CASE DEPENDS ON IT. `return finish(…)` inside fire()'s try is not
     * awaited, so a store failure while writing a terminal row rejects fire() itself instead of reaching its catch —
     * that is how a throw reaches `fireClaimedIntent`'s `finally` at all (16.5/16.6's applyOutcome throw never does:
     * `apply` requeues it). Were that line ever made `return await`, the throw would stop, and 16.69f0 says so in red
     * rather than letting 16.69f pass on the success path. On an EMPTY poll the fire's own terminal write is
     * SKIPPED(CONDITION_GONE), and only this row's write fails. */
    const b = await botWith();
    made69.bots.push(b.botId);
    const { m } = await lockedPoll(0);
    const i = await claimedRow(b, m.id);
    made69.rows.push(i.id);
    const intents = S.houseBotIntentStore;
    const realFinish = intents.finish;
    let got: Any = null, inFlightAfter = true;
    intents.finish = async (...a: Any[]) => { if (a[0] === i.id) throw new Error("injected finish failure"); return realFinish.apply(intents, a); };
    try {
      got = await withBeatingFire(i, recorder().alerts, async () => {});
      inFlightAfter = EN2.engineState().inFlight.has(i.id);
    } finally {
      Object.assign(intents, { finish: realFinish });
    }
    const threw = typeof got?.out?.threw === "string" && got.out.threw.includes("injected finish failure");
    ok("16.69f0 · fixture · a store failure while fire writes its terminal row escapes fire() as a THROW — the one throw route out of fire is the unawaited `return finish(…)` inside its try; were it ever made `return await`, THIS line goes red, never 16.69f green on the success path",
      threw, j(got?.out));
    ok("16.69f · ⛔ ruling 69 · a THROW out of fire still clears the heartbeat timer AND the in-flight entry — both are cleared on every exit, a throw included",
      threw && got?.f?.cleared() === 1 && !inFlightAfter, j({ out: got?.out, cleared: got?.f?.cleared(), inFlight: inFlightAfter }));
    await closeLive(i.id);
  }
  {
    /* ENG-33's fix line: "the heartbeat's failure to extend claimedUntil does not abort the in-flight fire". The beat
     * is swallowed on purpose — the claim's TTL is the backstop — so the only way to see it NOT swallowed is an
     * unhandled rejection. The listener counts only the injected message, lives for one fire plus 25 ms, and is removed
     * in a `finally`; 16.69h proves it hears a rejection of exactly that shape at all. */
    const b = await botWith();
    made69.bots.push(b.botId);
    const { m } = await lockedPoll(10_000);
    const i = await claimedRow(b, m.id);
    made69.rows.push(i.id);
    const DOWN = "heartbeat store down";
    const seen: string[] = [];
    const onUnhandled = (e: unknown) => { seen.push(String((e as Error)?.message ?? e)); };
    const ours = () => seen.filter((s) => s === DOWN).length;
    let got: Any = null, ticked = 0, afterFire = -1, afterControl = -1;
    process.on("unhandledRejection", onUnhandled);
    try {
      got = await withBeatingFire(i, recorder().alerts, async (g: Any) => {
        g.set[0]?.fn();
        g.set[0]?.fn();
        ticked = g.calls.length;
      }, { beat: async () => { throw Object.assign(new Error(DOWN), { code: "P1001" }); } });
      await sleep(25);
      afterFire = ours();
      void Promise.reject(Object.assign(new Error(DOWN), { code: "P1001" }));
      await sleep(25);
      afterControl = ours();
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
    const foreign = seen.filter((s) => s !== DOWN);
    ok("16.69g · ENG-33 · a heartbeat whose store write FAILS is swallowed: ticked twice against a store that throws, no rejection escapes the timer, and the fire still places",
      ticked === 2 && afterFire === 0 && got?.out?.kind === "outcome" && got.out.outcome?.kind === "placed" && (await is(i.id, "PLACED", null)),
      j({ ticked, unhandled: afterFire, out: got?.out, foreign }));
    ok("16.69h · CONTROL · the recorder 16.69g reads does see an unhandled rejection of exactly that shape, so its zero is a measurement and not a deaf listener",
      afterControl - afterFire === 1, j({ afterFire, afterControl, foreign }));
  }
  {
    const left: string[] = [];
    for (const id of made69.bots) if (!(await retire16(id))) left.push(id);
    const live: string[] = [];
    for (const id of made69.rows) { const r: Any = await row(id); if (!r || r.status === "PENDING" || r.status === "CLAIMED") live.push(id); }
    ok("16.69i · fixture · every account 16.69 made is REMOVED again, and no row it claimed is left live",
      made69.bots.length === 4 && left.length === 0 && made69.rows.length === 4 && live.length === 0, j({ bots: made69.bots.length, left, rows: made69.rows.length, live }));
    // Two stakes placed above: give the platform's per-minute house count back (the world's own fixture of time).
    await w.ageHouseMinute();
  }

  /* ── 16.7 the step-9 re-cut and the write-back clamp (MON-02, ruling 67) ── */
  {
    const b = await botWith();
    const { m } = await lockedPoll(10_000);
    const big = await w.intent(b, m.id, FILL({ stakeTzs: 20_000 }));
    const out = await fire(big, recorder().alerts);
    const r = await row(big.id);
    const house = await houseOn(m.id);
    ok("16.7 · a FILL of 20,000 against 10,000 locked is cut to 10,000, written back (firedStakeTzs) and placed at 10,000",
      out.outcome?.kind === "placed" && r.stakeTzs === 10_000 && r.decision?.firedStakeTzs === 10_000 && house[0]?.stake === 10_000, j({ out, stake: r.stakeTzs, decision: r.decision }));
  }
  {
    const b = await botWith();
    const { m } = await lockedPoll(0);
    const i = await w.intent(b, m.id, FILL());
    const out = await fire(i, recorder().alerts);
    ok("16.8 · no locked money on the other side → SKIPPED(CONDITION_GONE), no position", out.kind === "finished" && (await is(i.id, "SKIPPED", "CONDITION_GONE")) && (await houseOn(m.id)).length === 0, j(out));
  }
  {
    const b = await botWith({ stakeMinTzs: 20_000 });
    const { m } = await lockedPoll(10_000);
    const i = await w.intent(b, m.id, FILL({ stakeTzs: 25_000 }));
    const out = await fire(i, recorder().alerts);
    ok("16.9 · A7 · a cut stake under the bot's minimum → SKIPPED(STAKE_BOUNDS_CHANGED), the stake never written back", out.kind === "finished" && (await is(i.id, "SKIPPED", "STAKE_BOUNDS_CHANGED")) && (await row(i.id)).stakeTzs === 25_000, j(out));
  }
  {
    const b = await botWith();
    const m = await w.poll();
    const p = await w.user({ balance: 100_000 });
    const trig = await w.svc.buyPosition(p, { marketId: m.id, side: "YES", stake: 10_000, idempotencyKey: crypto.randomUUID() });
    // Just placed: its exit closed at placement (grace 0) but LOCK_MARGIN_MS has not passed — locked 0, lockedA15 10,000.
    const fill = await w.intent(b, m.id, FILL({ stakeTzs: 5_000 }));
    const outFill = await fire(fill, recorder().alerts);
    const counter = await w.intent(b, m.id, { kind: "COUNTER", side: "NO", stakeTzs: 5_000, triggerPositionId: trig.data?.positionId, triggerUserId: p });
    const outCounter = await fire(counter, recorder().alerts);
    ok("16.10 · inside the lock margin a FILL finds no locked money → CONDITION_GONE …", trig.ok === true && outFill.kind === "finished" && (await is(fill.id, "SKIPPED", "CONDITION_GONE")), j(outFill));
    ok("16.11 · …while the untargeted COUNTER is cut against lockedA15 and places (A15 unchanged)", outCounter.outcome?.kind === "placed" && (await is(counter.id, "PLACED", null)), j(outCounter));
  }

  /* ── 16.x7 · X7 · BOTH_SIDES checked again at fire (rulings 136, 159) ── */
  {
    const b = await botWith();
    const m = await w.poll();
    const p = await w.user({ balance: 100_000 });
    const trig = await w.svc.buyPosition(p, { marketId: m.id, side: "YES", stake: 10_000, idempotencyKey: crypto.randomUUID() });
    // The player takes the other side while the counter still waits — the gap X7 closes.
    const hedge = await w.svc.buyPosition(p, { marketId: m.id, side: "NO", stake: 1_000, idempotencyKey: crypto.randomUUID() });
    const counter = await w.intent(b, m.id, { kind: "COUNTER", side: "NO", stakeTzs: 2_000, triggerPositionId: trig.data?.positionId, triggerUserId: p });
    const out = await fire(counter, recorder().alerts);
    const boxed = (await S.houseBotEventStore.listByKinds(["PENALTY_BOXED"], { userId: p, limit: 10 })) as Any[];
    const theirs = (await w.positionsOf(m.id)).filter((x: Any) => x.userId === p);
    ok("16.x7a · ⭐ X7 · a trigger that holds BOTH sides when the counter fires → SKIPPED(PENALTY_BOX), nothing placed",
      trig.ok === true && hedge.ok === true && (await is(counter.id, "SKIPPED", "PENALTY_BOX")) && (await houseOn(m.id)).length === 0, j({ out, trig: trig.ok, hedge: hedge.ok, row: await row(counter.id) }));
    ok("16.x7b · …the account is penalty-boxed once, with cause BOTH_SIDES, naming this counter",
      boxed.length === 1 && boxed[0].payload?.cause === "BOTH_SIDES" && boxed[0].payload?.intentId === counter.id, j(boxed.map((e: Any) => e.payload)));
    ok("16.x7c · …and the player's own two stakes are untouched: both OPEN, the same amounts",
      theirs.length === 2 && theirs.every((x: Any) => x.status === "OPEN") && theirs.map((x: Any) => x.stake).sort((a: number, z: number) => a - z).join() === "1000,10000",
      j(theirs.map((x: Any) => `${x.side}:${x.stake}:${x.status}`)));
  }
  {
    // CONTROL (16.11's shape): a trigger on ONE side → the counter still places, and nobody is boxed.
    const b = await botWith();
    const m = await w.poll();
    const p = await w.user({ balance: 100_000 });
    const trig = await w.svc.buyPosition(p, { marketId: m.id, side: "YES", stake: 10_000, idempotencyKey: crypto.randomUUID() });
    const counter = await w.intent(b, m.id, { kind: "COUNTER", side: "NO", stakeTzs: 5_000, triggerPositionId: trig.data?.positionId, triggerUserId: p });
    const out = await fire(counter, recorder().alerts);
    const boxed = (await S.houseBotEventStore.listByKinds(["PENALTY_BOXED"], { userId: p, limit: 10 })) as Any[];
    ok("16.x7d · CONTROL · a trigger on ONE side → the counter places and the account is not boxed",
      out.outcome?.kind === "placed" && (await is(counter.id, "PLACED", null)) && boxed.length === 0, j({ out, boxed: boxed.length }));
  }
  {
    // A house-marked position on the trigger's account is not the player's choice: it never makes "both sides" (ruling 159).
    const { HOLDER_HASH } = (await import("./house-bot-world.mts")) as Any;
    const b = await botWith();
    const m = await w.poll();
    const p = await w.user({ balance: 100_000, passwordHash: HOLDER_HASH });
    const heldBot = await w.bot({ holderId: p });
    const opener = await w.intent(heldBot, m.id, { kind: "OPENER", side: "NO", stakeTzs: 1_000 });
    const placedOpener = await w.place(heldBot, opener);
    const trig = await w.svc.buyPosition(p, { marketId: m.id, side: "YES", stake: 10_000, idempotencyKey: crypto.randomUUID() });
    const counter = await w.intent(b, m.id, { kind: "COUNTER", side: "NO", stakeTzs: 2_000, triggerPositionId: trig.data?.positionId, triggerUserId: p });
    const out = await fire(counter, recorder().alerts);
    const boxed = (await S.houseBotEventStore.listByKinds(["PENALTY_BOXED"], { userId: p, limit: 10 })) as Any[];
    const r = await row(counter.id);
    ok("16.x7e · a house-marked NO beside the player's own YES is NOT both sides at fire: no box, not PENALTY_BOX (the seam decides the rest)",
      placedOpener.ok === true && trig.ok === true && boxed.length === 0 && r?.reasonCode !== "PENALTY_BOX", j({ opener: placedOpener.ok, trig: trig.ok, out, row: r?.status, code: r?.reasonCode, boxed: boxed.length }));
  }
  {
    // An opposite stake the player already SOLD is not a side they hold: only OPEN positions make "both sides".
    const b = await botWith();
    const m = await w.poll();
    const p = await w.user({ balance: 100_000 });
    const sold = await w.svc.buyPosition(p, { marketId: m.id, side: "NO", stake: 1_000, idempotencyKey: crypto.randomUUID() });
    // A fixture of STATE, declared: this poll has no exit runway (16.11's shape, so the counter can place), so the sale is
    // written as the status a real cash-out leaves — the read under test looks only at status and side.
    const soldRow = sold.ok ? await w.mdal.positionStore.get(sold.data.positionId) : null;
    if (soldRow) await w.mdal.positionStore.set({ ...soldRow, status: "CASHED_OUT", settledAt: new Date().toISOString() });
    const cashed = { ok: (await w.mdal.positionStore.get(sold.data?.positionId))?.status === "CASHED_OUT" };
    const trig = await w.svc.buyPosition(p, { marketId: m.id, side: "YES", stake: 10_000, idempotencyKey: crypto.randomUUID() });
    const counter = await w.intent(b, m.id, { kind: "COUNTER", side: "NO", stakeTzs: 5_000, triggerPositionId: trig.data?.positionId, triggerUserId: p });
    const out = await fire(counter, recorder().alerts);
    const boxed = (await S.houseBotEventStore.listByKinds(["PENALTY_BOXED"], { userId: p, limit: 10 })) as Any[];
    ok("16.x7f · a NO the player already cashed out plus an open YES is ONE side: the counter places, nobody is boxed",
      sold.ok === true && cashed?.ok === true && trig.ok === true && out.outcome?.kind === "placed" && boxed.length === 0,
      j({ sold: sold.ok, cashed: cashed?.ok ? "ok" : cashed, trig: trig.ok, out, boxed: boxed.length }));
  }
  {
    const b = await botWith();
    const { m } = await lockedPoll(10_000);
    const i = await w.intent(b, m.id, FILL({ stakeTzs: 20_000 }));
    const out = await fire(i, recorder().alerts, "another-worker");
    ok("16.12 · MON-02 · a write-back clamp on a row this worker does not hold writes nothing and stops: lost, stake 20,000, no position",
      out.kind === "lost" && (await row(i.id)).stakeTzs === 20_000 && (await is(i.id, "CLAIMED", null)) && (await houseOn(m.id)).length === 0, j(out));
    await closeLive(i.id);
  }

  /* ── 16.13 F5 re-checks through the one mapper (ruling 63) ── */
  {
    const b = await botWith();
    const { m, player } = await lockedPoll(10_000);
    const i = await w.intent(b, m.id, { kind: "COUNTER", side: "NO", stakeTzs: 2_000, triggerPositionId: `pos_hb_gone_${process.pid}`, triggerUserId: player });
    const out = await fire(i, recorder().alerts);
    const boxed = (await S.houseBotEventStore.listByKinds(["PENALTY_BOXED"], { userId: player, limit: 10 })) as Any[];
    ok("16.13 · a COUNTER whose trigger is gone → the mapper's house_trigger_gone row: SKIPPED(TRIGGER_EXITED), the trigger penalty-boxed", (await is(i.id, "SKIPPED", "TRIGGER_EXITED")) && boxed.length === 1, j({ out, boxed: boxed.length }));
  }
  {
    const b = await botWith();
    const { m } = await lockedPoll();
    const i = await w.intent(b, m.id, FILL());
    await w.switchOff();
    let out: Any;
    try { out = await fire(i, recorder().alerts); } finally { await w.switchOn(); }
    ok("16.14 · master OFF → CANCELLED(MASTER_OFF), nothing placed", (await is(i.id, "CANCELLED", "MASTER_OFF")) && (await houseOn(m.id)).length === 0, j(out));
  }
  if (w.onPostgres) {
    const CS: Any = await import("../../src/lib/server/config-store.ts");
    const PCFG: Any = await import("../../src/lib/server/platform-config.ts");
    const b = await botWith();
    const { m } = await lockedPoll();
    const i = await w.intent(b, m.id, FILL());
    const before = await CS.loadConfigResult(PCFG.PLATFORM_CONFIG_KEY);
    let out: Any;
    try {
      await CS.saveConfigOrThrow(PCFG.PLATFORM_CONFIG_KEY, { timezone: "Africa/Dar_es_Salaam", maintenanceMode: true });
      out = await fire(i, recorder().alerts);
    } finally {
      if (before.ok && before.value != null) await CS.saveConfigOrThrow(PCFG.PLATFORM_CONFIG_KEY, before.value);
      else await w.prisma().systemConfig.deleteMany({ where: { key: PCFG.PLATFORM_CONFIG_KEY } });
    }
    ok("16.15 · F7 · maintenance (Postgres) → SKIPPED(MAINTENANCE)", await is(i.id, "SKIPPED", "MAINTENANCE"), j(out));
  }
  {
    const b = await botWith();
    const { m } = await lockedPoll();
    const i = await w.intent(b, m.id, FILL());
    await S.houseBotStore.setStatus(b.botId, { from: ["ACTIVE"], to: "AUTO_PAUSED", pauseReason: "WALLET_FROZEN", pauseDetail: null, pausedFromStatus: "ACTIVE" });
    const out = await fire(i, recorder().alerts);
    ok("16.16 · a bot no longer ACTIVE → CANCELLED(BOT_NOT_ACTIVE)", await is(i.id, "CANCELLED", "BOT_NOT_ACTIVE"), j(out));
  }
  {
    const b = await botWith();
    const { m } = await lockedPoll();
    const i = await w.intent(b, m.id, FILL());
    await w.setUserFields(b.userId, { passwordHash: "hash_changed_by_holder" });
    const rec = recorder();
    const out = await fire(i, rec.alerts);
    const bot: Any = await S.houseBotStore.get(b.botId);
    ok("16.17 · the holder's password changed → the mapper's consent re-read: AUTO_PAUSED(PASSWORD_CHANGED), row CANCELLED(BOT_NOT_ACTIVE), one alert",
      bot.status === "AUTO_PAUSED" && bot.pauseReason === "PASSWORD_CHANGED" && (await is(i.id, "CANCELLED", "BOT_NOT_ACTIVE")) && rec.count("botStopped") === 1, j({ status: bot.status, reason: bot.pauseReason, out }));
  }

  /* ── 16.63 · B7's SECOND limb · THE HOLDER CHECK AT FIRE (ruling 63, fire.ts step 4; RESUME-HERE §0c decision 6) ──
   * MEASURED before this build: 16.17 was the only case that reached step 4, and it could not fail on it — a password
   * change on a poll with locked money, where the seam refuses the same holder anyway (H2's consent check, and the
   * in-lock loss limit), so removing step 4 changed no row, bot or position.
   * ⭐ THE DISCRIMINATOR IS WHERE FIRE STOPS, AND AN EMPTY POLL MAKES IT VISIBLE. With nothing locked against the row, a
   * fire that got past step 4 ends SKIPPED(CONDITION_GONE) at the amount step with the bot still ACTIVE and never
   * reaches the seam — so in 16.63a–c only fire's OWN holder check can pause the account, and 16.63e is that control.
   * (Should a later step ever finish an empty poll EARLIER, the controls go red first — by design.)
   * ⛔ THE STATE IS WRITTEN WITHOUT THE IN-APP HOLDER HOOK. `selfExclude`, `coolOff` and `setLimits` fire the real hook
   * asynchronously (the §19 race behind C4 ruling 156): it would pause the bot BEFORE the fire, and the case would pass
   * for the wrong reason, since house_bot_inactive writes the same CANCELLED(BOT_NOT_ACTIVE) row. So the settings row
   * and the account status are written directly, as §19 row 8 and 19.E do; the bot is read ACTIVE right before each
   * fire, and the fire's OUTCOME is asserted (botStopped, with its cause), not only the row.
   * ⛔ The timers are DAYS away (the RG timer columns are naive DateTime), and nothing is lost yet, so the rolling
   * 24-hour loss window over the naive Transaction.createdAt never enters into it. */
  {
    const DAY = 86_400_000;
    const made63: string[] = [];
    const rgWrite = async (userId: string, patch: Any) => { const cur = await RG16.getRgSettings(userId); await w.db.responsible.upsert({ ...cur, ...patch }); };
    const atFire = async (setup: (userId: string) => Promise<void>) => {
      const b = await botWith();
      made63.push(b.botId);
      const { m } = await lockedPoll(0);
      const i = await w.intent(b, m.id, FILL());
      await setup(b.userId);
      const before: Any = await S.houseBotStore.get(b.botId);
      const rec = recorder();
      const out = await fireSafe(i, rec.alerts);
      const bot: Any = await S.houseBotStore.get(b.botId);
      const r: Any = await row(i.id);
      return { before: before?.status, out, bot, r, placed: (await houseOn(m.id)).length, alerts: rec.count("botStopped") };
    };
    const shown = (x: Any) => j({
      before: x.before, out: x.out, placed: x.placed, alerts: x.alerts, row: x.r && [x.r.status, x.r.reasonCode],
      bot: x.bot && { status: x.bot.status, reason: x.bot.pauseReason, voidCause: x.bot.consentVoidCause, voidAt: x.bot.consentVoidAt },
    });
    /** Fire itself stopped the account for `cause`: botStopped from the ACTIVE bot it read, the row closed, nothing placed, one alert. */
    const stoppedAtFire = (x: Any, cause: string) => x.before === "ACTIVE"
      && x.out?.kind === "outcome" && x.out.outcome?.kind === "botStopped" && x.out.outcome.to === "AUTO_PAUSED" && x.out.outcome.cause === cause
      && x.bot?.status === "AUTO_PAUSED" && x.bot.pauseReason === cause
      && x.r?.status === "CANCELLED" && x.r.reasonCode === "BOT_NOT_ACTIVE" && x.placed === 0 && x.alerts === 1;
    /** Fire went past the holder check: the empty poll ended the row at the amount step and the bot is untouched. */
    const wentOn = (x: Any) => x.before === "ACTIVE"
      && x.out?.kind === "finished" && x.out.status === "SKIPPED" && x.out.code === "CONDITION_GONE"
      && x.r?.status === "SKIPPED" && x.r.reasonCode === "CONDITION_GONE" && x.bot?.status === "ACTIVE" && x.placed === 0 && x.alerts === 0;

    const excluded = await atFire(async (u) => {
      await rgWrite(u, { selfExclusionUntil: w.iso(7 * DAY), selfExclusionStartedAt: w.iso() });
      await w.setUserFields(u, { status: "SELF_EXCLUDED" });
    });
    ok("16.63a · ⭐ ruling 63 · a SELF-EXCLUDED holder at fire is stopped by fire's OWN holder check (on an empty poll no later step can pause the account): the bot AUTO_PAUSED(SELF_EXCLUDED) with its consent voided, the row CANCELLED(BOT_NOT_ACTIVE), nothing placed, one alert",
      stoppedAtFire(excluded, "SELF_EXCLUDED") && excluded.bot.consentVoidCause === "SELF_EXCLUDED" && excluded.bot.consentVoidAt != null, shown(excluded));
    const cooling = await atFire(async (u) => { await rgWrite(u, { coolingOffUntil: w.iso(2 * DAY), coolingOffStartedAt: w.iso() }); });
    ok("16.63b · ⭐ ruling 63 · a cooling-off TIMER alone — the account's status still ACTIVE — stops the bot at fire the same way: AUTO_PAUSED(COOLING_OFF), consent voided, the row CANCELLED(BOT_NOT_ACTIVE)",
      stoppedAtFire(cooling, "COOLING_OFF") && cooling.bot.consentVoidCause === "COOLING_OFF" && cooling.bot.consentVoidAt != null, shown(cooling));
    const ownLimit = await atFire(async (u) => { await rgWrite(u, { dailyLossLimit: 1_000 }); });
    ok("16.63c · ⭐ ruling 63 · the holder's OWN daily loss limit, asked about THIS row's stake, stops the bot at fire as loss_limit_daily: AUTO_PAUSED(OWNER_LOSS_LIMIT), consent NOT voided, the row CANCELLED(BOT_NOT_ACTIVE) — never a requeue",
      stoppedAtFire(ownLimit, "OWNER_LOSS_LIMIT") && ownLimit.bot.consentVoidAt == null && ownLimit.bot.consentVoidCause == null, shown(ownLimit));
    const equal = await atFire(async (u) => { await rgWrite(u, { dailyLossLimit: 2_000 }); });
    ok("16.63d · CONTROL · a loss limit EQUAL to the row's stake fits (nothing lost today + 2,000 is not over 2,000): fire goes on, the empty poll ends it SKIPPED(CONDITION_GONE), and the bot stays ACTIVE",
      wentOn(equal), shown(equal));
    const none = await atFire(async () => {});
    ok("16.63e · CONTROL · a holder with no responsible-gambling state, on the same empty poll, reaches the amount step: SKIPPED(CONDITION_GONE), the bot ACTIVE — so in 16.63a–c only fire's holder check could have paused it",
      wentOn(none), shown(none));
    const ended = await atFire(async (u) => {
      await rgWrite(u, { coolingOffUntil: w.iso(-2 * DAY), coolingOffStartedAt: w.iso(-3 * DAY) });
      await w.setUserFields(u, { status: "COOLED_OFF" });
    });
    ok("16.63f · CONTROL · a break that has ENDED — its timer two days past, the status still COOLED_OFF — is no break at fire: SKIPPED(CONDITION_GONE), the bot ACTIVE",
      wentOn(ended), shown(ended));
    const left: string[] = [];
    for (const id of made63) if (!(await retire16(id))) left.push(id);
    ok("16.63g · fixture · every account 16.63 made is REMOVED again, so no account carrying a loss limit or a break reaches a later section",
      made63.length === 6 && left.length === 0, j({ made: made63.length, left }));
  }

  /* ── 16.18 rules at fire (ruling 65) ── */
  {
    const future = await botWith({}, { schemaVersion: 99 });
    const outdated = await botWith({}, { schemaVersion: 0 });
    const invalid = await botWith({}, { schemaVersion: "one" });
    const iF = await w.intent(future, (await lockedPoll()).m.id, FILL());
    const iO = await w.intent(outdated, (await lockedPoll()).m.id, FILL());
    const iI = await w.intent(invalid, (await lockedPoll()).m.id, FILL());
    const outF = await fire(iF, recorder().alerts);
    ok("16.18 · rules saved by a newer build → back to PENDING, the bot left ACTIVE (no pause)",
      outF.kind === "requeued" && outF.written === true && (await is(iF.id, "PENDING", null)) && (await S.houseBotStore.get(future.botId)).status === "ACTIVE", j(outF));
    await closeLive(iF.id);
    const outO = await fire(iO, recorder().alerts);
    const botO: Any = await S.houseBotStore.get(outdated.botId);
    ok("16.19 · outdated rules → AUTO_PAUSED(RULES_OUTDATED), row CANCELLED(BOT_NOT_ACTIVE)", botO.status === "AUTO_PAUSED" && botO.pauseReason === "RULES_OUTDATED" && (await is(iO.id, "CANCELLED", "BOT_NOT_ACTIVE")), j({ botO: [botO.status, botO.pauseReason], outO }));
    const outI = await fire(iI, recorder().alerts);
    const botI: Any = await S.houseBotStore.get(invalid.botId);
    ok("16.20 · invalid rules → AUTO_PAUSED(RULES_INVALID) with the field in the pause detail", botI.pauseReason === "RULES_INVALID" && botI.pauseDetail?.field === "schemaVersion" && (await is(iI.id, "CANCELLED", "BOT_NOT_ACTIVE")), j({ reason: botI.pauseReason, detail: botI.pauseDetail, outI }));
  }

  /* ── 16.21 the market, scope and lifecycle ── */
  {
    const b = await botWith();
    const { m } = await lockedPoll();
    const i = await w.intent(b, m.id, FILL());
    await setMarket(m.id, { status: "CLOSED" });
    const out = await fire(i, recorder().alerts);
    ok("16.21 · a market no longer LIVE → the mapper's market re-read: SKIPPED(MARKET_NOT_LIVE)", await is(i.id, "SKIPPED", "MARKET_NOT_LIVE"), j(out));
  }
  {
    const sports = await botWith({}, fireRules({ scope: { categories: ["sports"] } }));
    const noFill = await botWith({}, fireRules({ modes: { polls: { fill: false } } }));
    const noEnter = await botWith({}, fireRules({ enterNow: { enabled: false } }));
    const iS = await w.intent(sports, (await lockedPoll()).m.id, FILL());
    const iM = await w.intent(noFill, (await lockedPoll()).m.id, FILL());
    const iE = await w.intent(noEnter, (await lockedPoll()).m.id, MANUAL());
    const oS = await fire(iS, recorder().alerts);
    const oM = await fire(iM, recorder().alerts);
    const oE = await fire(iE, recorder().alerts);
    ok("16.22 · ruling 66 · the poll's category no longer listed → SKIPPED(OUT_OF_SCOPE)", await is(iS.id, "SKIPPED", "OUT_OF_SCOPE"), j(oS));
    ok("16.23 · …the row's mode switched off → SKIPPED(OUT_OF_SCOPE)", await is(iM.id, "SKIPPED", "OUT_OF_SCOPE"), j(oM));
    ok("16.24 · …Enter now switched off for a MANUAL row → SKIPPED(OUT_OF_SCOPE)", await is(iE.id, "SKIPPED", "OUT_OF_SCOPE"), j(oE));
  }
  {
    const b1 = await botWith();
    const b2 = await botWith();
    const { m } = await lockedPoll();
    const f = await w.intent(b1, m.id, FILL());
    const man = await w.intent(b2, m.id, MANUAL());
    await setMarket(m.id, { reopened: true });
    const oF = await fire(f, recorder().alerts);
    const oM = await fire(man, recorder().alerts);
    ok("16.25 · A16 · a reopened poll → an automatic row SKIPPED(MARKET_REOPENED) …", await is(f.id, "SKIPPED", "MARKET_REOPENED"), j(oF));
    ok("16.26 · …a staff-chosen row meets the information blackout instead → SKIPPED(INFO_BLACKOUT)", await is(man.id, "SKIPPED", "INFO_BLACKOUT"), j(oM));
  }
  {
    const nearCutoff = async () => w.svc.createMarket({
      titleEn: "House fire poll", titleSw: "Soko la jaribio", category: "macro", sourceUrl: "https://bot.go.tz",
      resolutionCriterion: "Resolves at the official date.", resolutionAt: w.iso(7 * 864e5), selectionClosedAt: w.iso(30 * 60_000), proposedBy: WORLD_OFFICER,
      rateOverrides: { freeExitGraceMinutes: 0, paidExitWindowMinutes: 0 },
    });
    const late = await botWith({}, fireRules({ guards: { minTimeToCutoffPollsMin: 60 } }));
    const early = await botWith();
    const m1 = await nearCutoff();
    const m2 = await nearCutoff();
    const iL = await w.intent(late, m1.id, FILL());
    const iE = await w.intent(early, m2.id, FILL());
    const oL = await fire(iL, recorder().alerts);
    const oE = await fire(iE, recorder().alerts);
    ok("16.27 · A16 · betting closes in 30 min and the bot stops 60 min before → EXPIRED(CUTOFF), though the stored deadline is an hour away",
      (await is(iL.id, "EXPIRED", "CUTOFF")) && Date.parse(iL.deadlineAt) > Date.now() + 30 * 60_000, j({ oL, closes: m1.selectionClosedAt }));
    ok("16.28 · CONTROL · the same poll with a 5-minute stop is not CUTOFF (it goes on and finds no locked money)", await is(iE.id, "SKIPPED", "CONDITION_GONE"), j(oE));
  }
  {
    const eatMin = ((new Date().getUTCHours() + 3) % 24) * 60 + new Date().getUTCMinutes();
    const start = ((eatMin + 720) % 1_380) + 30;
    const closed = await botWith({}, fireRules({ schedule: { allDay: false, windows: [{ startMin: start, endMin: start + 1 }] } }));
    const iF = await w.intent(closed, (await lockedPoll()).m.id, FILL());
    const iM = await w.intent(closed, (await lockedPoll()).m.id, MANUAL());
    const oF = await fire(iF, recorder().alerts);
    const oM = await fire(iM, recorder().alerts);
    ok("16.29 · a schedule that excludes now → an automatic row SKIPPED(OUTSIDE_SCHEDULE)", await is(iF.id, "SKIPPED", "OUTSIDE_SCHEDULE"), j(oF));
    ok("16.30 · W8 · Enter now ignores the schedule: the MANUAL row on the same bot places", await is(iM.id, "PLACED", null), j(oM));
  }

  /* ── 16.31 targets (N2 §4 step 7) ── */
  {
    const b = await botWith();
    const target = (marketId: string) => S.targetStore.insert({
      id: S.newHouseId("target"), houseBotId: b.botId, marketId, delayMinSec: 5, delayMaxSec: 10, timingFrom: "STAKE", reactTo: "FIRST",
      createdById: WORLD_OFFICER, snapshot: { titleEn: "Target poll", category: "macro", cutoff: w.iso(3_600_000), rawYes: 0, rawNo: 0 },
    });
    const reaction = (marketId: string, targetId: string, player: string | null, positionId: string | null) =>
      w.intent(b, marketId, { kind: "COUNTER", side: "NO", stakeTzs: 2_000, targetId, triggerPositionId: positionId, triggerUserId: player, decision: { reactTo: "FIRST" } });
    const pr = await lockedPoll();
    const tr = await target(pr.m.id);
    const iR = await reaction(pr.m.id, tr.id, pr.player, pr.positionId);
    await S.targetStore.remove(tr.id, WORLD_OFFICER);
    const pv = await lockedPoll();
    const tv = await target(pv.m.id);
    const iV = await reaction(pv.m.id, tv.id, pv.player, pv.positionId);
    await S.targetStore.veto(tv.id);
    const pc = await lockedPoll();
    const tc = await target(pc.m.id);
    const iC = await reaction(pc.m.id, tc.id, pc.player, pc.positionId);
    await S.targetStore.endActive(tc.id, "MARKET_CLOSED");
    const oR = await fire(iR, recorder().alerts);
    const oV = await fire(iV, recorder().alerts);
    const oC = await fire(iC, recorder().alerts);
    ok("16.31 · a removed target → CANCELLED(TARGET_REMOVED)", await is(iR.id, "CANCELLED", "TARGET_REMOVED"), j(oR));
    ok("16.32 · a vetoed target → CANCELLED(TARGET_ENDED)", await is(iV.id, "CANCELLED", "TARGET_ENDED"), j({ oV, target: await S.targetStore.get(tv.id) }));
    ok("16.33 · a target ENDED for another cause (MARKET_CLOSED) → the reaction goes on and places", await is(iC.id, "PLACED", null), j(oC));
    // N1-4 · fire's OWN blackout read (ruling 64). Without it the seam still refuses the same stake with the same code, so
    // the row's status cannot tell them apart; WHERE it stops can: fire finishes the row itself, before the bet path.
    const pb = await lockedPoll();
    const tb = await target(pb.m.id);
    const iB = await reaction(pb.m.id, tb.id, pb.player, pb.positionId);
    await setMarket(pb.m.id, { reopened: true });
    const oB = await fire(iB, recorder().alerts);
    ok("16.33b · N1-4 · a targeted reaction on a reopened (blacked-out) poll is stopped by fire itself: finished SKIPPED(INFO_BLACKOUT), never sent to the bet path",
      oB?.kind === "finished" && oB.code === "INFO_BLACKOUT" && (await is(iB.id, "SKIPPED", "INFO_BLACKOUT")), j(oB));
    const p2 = await w.user({ balance: 100_000 });
    const t2 = await w.svc.buyPosition(p2, { marketId: pc.m.id, side: "YES", stake: 5_000, idempotencyKey: crypto.randomUUID() });
    const iSecond = await reaction(pc.m.id, tc.id, p2, t2.data?.positionId ?? null);
    const oSecond = await fire(iSecond, recorder().alerts);
    ok("16.34 · react-to-first with a PLACED sibling → SKIPPED(CAP_TARGET_ONCE) before the seam", t2.ok === true && (await is(iSecond.id, "SKIPPED", "CAP_TARGET_ONCE")), j(oSecond));
  }

  /* ── 16.35 Enter now at fire (N1 §4.3 step 6) ── */
  {
    const b = await botWith();
    const other = await botWith();
    const { m } = await lockedPoll();
    const man = await w.intent(b, m.id, MANUAL());
    const held = await w.intent(other, m.id, FILL());
    const out = await fire(man, recorder().alerts);
    ok("16.35 · another bot's live intent holds the poll → SKIPPED(MARKET_HELD)", await is(man.id, "SKIPPED", "MARKET_HELD"), j(out));
    await closeLive(held.id);
  }
  {
    const b = await botWith();
    const { m } = await lockedPoll();
    const man = await w.intent(b, m.id, MANUAL({ side: "YES" }));
    const out = await fire(man, recorder().alerts);
    ok("16.36 · the thin side is NO now but the row says YES → SKIPPED(CONDITION_GONE); the side is never re-chosen", (await is(man.id, "SKIPPED", "CONDITION_GONE")) && (await houseOn(m.id)).length === 0, j(out));
  }
  {
    const b = await botWith({ freqMinGapSec: 60 });
    const first = await w.intent(b, (await lockedPoll()).m.id, FILL());
    const oFirst = await fire(first, recorder().alerts);
    const { m } = await lockedPoll();
    const man = await w.intent(b, m.id, MANUAL());
    const out = await fire(man, recorder().alerts);
    const r = await row(man.id);
    ok("16.37 · the minimum gap frees before staleAt → a deferral: PENDING again with nextAttemptAt at the free time, attempts handed back",
      oFirst.outcome?.kind === "placed" && out.kind === "deferred" && out.written === true && r.status === "PENDING" && r.attempts === 0 && Math.abs(Date.parse(r.nextAttemptAt) - Date.parse(out.until)) < 1_000, j({ oFirst, out, r: [r.status, r.attempts, r.nextAttemptAt] }));
    await closeLive(man.id);
    await w.setCaps(b.botId, { freqMinGapSec: 900 });
    const late = await w.intent(b, (await lockedPoll()).m.id, MANUAL());
    const outLate = await fire(late, recorder().alerts);
    ok("16.38 · …a gap that frees only after staleAt → SKIPPED(CAP_MIN_GAP)", await is(late.id, "SKIPPED", "CAP_MIN_GAP"), j(outLate));
  }
  {
    const b = await botWith({ freqMaxPerMarket: 1 });
    const { m } = await lockedPoll();
    const first = await w.intent(b, m.id, FILL());
    const oFirst = await fire(first, recorder().alerts);
    const man = await w.intent(b, m.id, MANUAL());
    const out = await fire(man, recorder().alerts);
    ok("16.39 · the bot's per-market count used → SKIPPED(CAP_PER_MARKET_COUNT)", oFirst.outcome?.kind === "placed" && (await is(man.id, "SKIPPED", "CAP_PER_MARKET_COUNT")), j(out));
  }
  {
    const b = await botWith();
    const { m } = await lockedPoll();
    const man = await w.intent(b, m.id, MANUAL());
    const press = await S.pressStore.insertChecking({ id: S.newHouseId("press"), actorId: WORLD_OFFICER, submitId: crypto.randomUUID(), purpose: "ENTER_NOW", houseBotId: b.botId, marketId: m.id, targetId: null, intentId: null, reason: "Test press for fire" });
    const queued = press.ok ? await S.houseTransaction((tx: Any) => S.pressStore.queue(press.row.id, man.id, tx)) : null;
    const out = await fire(man, recorder().alerts);
    const pr: Any = press.ok ? await S.pressStore.get(press.row.id) : null;
    ok("16.40 · N1 §4.3 step 7 · a placed Enter now moves its QUEUED press to DONE", queued?.state === "QUEUED" && out.outcome?.kind === "placed" && pr?.state === "DONE", j({ out, press: pr?.state }));
  }

  /* ── 16.41 the poller (ruling 70) ── */
  {
    await S.houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");
    const b = await botWith();
    const polls = [await lockedPoll(), await lockedPoll()];
    const rows = [];
    for (const p of polls) rows.push(await S.houseBotIntentStore.insert(pendingRow(b, p.m.id)));
    const instanceId = `hb-test-worker-${process.pid}`;
    const st = { ...EN2.engineState(), started: true, stopping: false, skewMs: 0, inFlight: new Map() };
    const shut = await passSafe({ state: { ...st, started: false }, instanceId }, recorder().alerts);
    ok("16.41 · the gate first: an engine not started claims nothing and writes no beat",
      shut.claimed === 0 && shut.gate === "NOT_STARTED" && (await S.houseBotRuntimeStore.get(K.RUNTIME_KEY.pollerBeat(instanceId))) == null && (await is(rows[0].id, "PENDING", null)), j(shut));
    const rec = recorder();
    const pass = await passSafe({ state: st, instanceId }, rec.alerts);
    ok("16.42 · a gate that admits → both due rows claimed by this instance and fired together, both PLACED, one beat written",
      pass.claimed === 2 && pass.beat === true && pass.results.every((r: Any) => r.outcome?.kind === "placed") && (await is(rows[0].id, "PLACED", null)) && (await is(rows[1].id, "PLACED", null))
        && (await S.houseBotRuntimeStore.get(K.RUNTIME_KEY.pollerBeat(instanceId))) != null && rec.count("placed") === 2, j(pass));
    const idle = `${instanceId}-idle`;
    const empty = await passSafe({ state: st, instanceId: idle }, recorder().alerts);
    ok("16.43 · A24 · nothing due → claimed 0 and NO beat (a process that cannot claim never looks healthy)", empty.claimed === 0 && empty.beat !== true && (await S.houseBotRuntimeStore.get(K.RUNTIME_KEY.pollerBeat(idle))) == null, j(empty));
  }

  /* ── 16.514 A24's POLLER-FAILURE LIMB — dead end to end until C7 step 4 (replan rulings 514, 549) ──
   * MEASURED before this build: POLLER_FAILURE_ALERT_AFTER had exactly ONE occurrence in the tree (its own
   * definition), ALERT_KEY.pollerFailing had NO writer, and pollerErrorAt, pollerErrorCode, pollerErrorStreak and
   * the durable skewMs had no writer ANYWHERE — the whole limb, not only the alert, inside a commit marked CLOSED.
   * A poller whose claim statement keeps throwing claims nothing, so it fires nothing, so no outcome, no alert and
   * no audit is ever written and every other instrument reads "quiet".
   * ⛔ THE FAILURE IS RECORDED WITHOUT A BEAT: beat() stamps beatAt, and a failed pass that looked alive is the
   * precise defect A24 exists for, so the write goes through upsert. */
  {
    const instanceId = `hb-test-a24-${process.pid}`;
    const key = K.RUNTIME_KEY.pollerBeat(instanceId);
    const st = { ...EN2.engineState(), started: true, stopping: false, skewMs: 0, inFlight: new Map() };
    const realClaim = S.houseBotIntentStore.claimBatch;
    const failingAlerts = recorder();
    const firedAlerts = () => failingAlerts.calls.filter((c: Any) => c.fn === "once" && String(c.key).startsWith("engine:poller_failing"));
    try {
      S.houseBotIntentStore.claimBatch = async () => { throw new Error("claim statement exploded"); };
      const first = await passSafe({ state: st, instanceId }, failingAlerts.alerts);
      const afterFirst: Any = await S.houseBotRuntimeStore.get(key);
      ok("16.514a · ⛔ A24 · a CLAIM that throws is recorded on this instance's own heartbeat row — the instant, the code and a streak of 1 — and NO beatAt is written, because a failed pass must never look alive",
        first?.claimed === 0 && first?.failure?.streak === 1 && afterFirst != null
          && afterFirst.pollerErrorAt != null && String(afterFirst.pollerErrorCode).includes("claim statement exploded")
          && afterFirst.pollerErrorStreak === 1 && afterFirst.beatAt == null,
        j({ first, row: afterFirst && { at: afterFirst.pollerErrorAt, code: afterFirst.pollerErrorCode, streak: afterFirst.pollerErrorStreak, beatAt: afterFirst.beatAt, skewMs: afterFirst.skewMs } }));
      ok("16.514b · …and the durable skewMs is written with it — until this build it lived only in process memory and died with the container",
        afterFirst?.skewMs === 0, j({ skewMs: afterFirst?.skewMs }));

      /* ⛔ THE ALERT IS THE ASSERTION RULING 514 ASKED FOR, AND IT FAILS WHEN ALERT_KEY.pollerFailing HAS NO
       * WRITER — which is exactly the tree this case was written against. The streak is the ROW's, not the
       * process's: a container that crash-loops every ten failures would otherwise never reach the threshold, and
       * a crash-looping poller is the commonest shape this alert exists for. */
      const before = firedAlerts().length;
      for (let n = 2; n <= K.POLLER_FAILURE_ALERT_AFTER; n++) await passSafe({ state: st, instanceId }, failingAlerts.alerts);
      const atThreshold: Any = await S.houseBotRuntimeStore.get(key);
      const fired = firedAlerts();
      ok("16.514c · ⭐ RULING 514 · POLLER_FAILURE_ALERT_AFTER failed claims in a row send ONE engine:poller_failing alert — the constant's second occurrence in this tree, and the key's first writer anywhere",
        before === 0 && atThreshold?.pollerErrorStreak === K.POLLER_FAILURE_ALERT_AFTER && fired.length === 1 && fired[0]?.code === "POLLER_FAILING",
        j({ before, after: K.POLLER_FAILURE_ALERT_AFTER, streak: atThreshold?.pollerErrorStreak, fired: fired.map((c: Any) => ({ key: c.key, code: c.code })) }));
      const again = await passSafe({ state: st, instanceId }, failingAlerts.alerts);
      ok("16.514d · …and the next failure in the same EAT hour tells nobody a second time (the AlertOnce claim), while the streak keeps counting",
        firedAlerts().length === 1 && again?.failure?.streak === K.POLLER_FAILURE_ALERT_AFTER + 1 && again?.failure?.alerted === false,
        j({ alerts: firedAlerts().length, failure: again?.failure }));
      ok("16.514e · CONTROL · every failed pass above really reached this row — the streak is the ROW's own count, so a case that never wrote could not have produced it, and still no beat",
        atThreshold?.beatAt == null && again?.claimed === 0, j({ beatAt: atThreshold?.beatAt, claimed: again?.claimed }));
    } finally {
      S.houseBotIntentStore.claimBatch = realClaim;
    }

    /* The recovery half: a claim that succeeds beats, resets the streak and writes the skew — and does NOT erase
     * the last error, because the Callout tells "failing" from "not running" by which of the two is fresher. */
    const b = await botWith();
    const p = await lockedPoll();
    await S.houseBotIntentStore.insert(pendingRow(b, p.m.id));
    const good = await passSafe({ state: { ...st, skewMs: 37 }, instanceId }, recorder().alerts);
    const recovered: Any = await S.houseBotRuntimeStore.get(key);
    ok("16.514f · A24 · the next claim that SUCCEEDS beats, resets the streak to 0 and writes the measured skew — and KEEPS the last error, which is the only thing that tells a recovered poller from one that has never failed",
      good?.claimed === 1 && good?.beat === true && recovered?.pollerErrorStreak === 0 && recovered?.beatAt != null
        && recovered?.skewMs === 37 && recovered?.pollerErrorAt != null && String(recovered?.pollerErrorCode).includes("claim statement exploded"),
      j({ good: good && { claimed: good.claimed, beat: good.beat, threw: good.threw }, row: recovered && { streak: recovered.pollerErrorStreak, beatAt: recovered.beatAt, skewMs: recovered.skewMs, code: recovered.pollerErrorCode } }));
    ok("16.514g · CONTROL · the claim really was restored — the pass above claimed and fired a real row, so the reset is a measurement and not an unreached patch",
      good?.results?.length === 1, j({ results: good?.results?.length }));
  }

  /* ── 16.515 · ⛔ THE SILENT STOP — the clock-skew bell (01 register:1218; `ALERT_KEY.clockSkew`) ────────────────
   * MEASURED before this build: `ALERT_KEY.clockSkew` had exactly ONE occurrence in the whole tree — its own line in
   * the key table — and §11.3/§11.4 pinned only the REFUSAL. That refusal has always been right: `claimGate` will
   * not claim while this container's measured offset from the database clock is unknown or past
   * MAX_TOLERATED_SKEW_MS, because claiming on a clock five seconds out fires intents before they are due.
   * ⛔ THE DEFECT IS THE SILENCE, NOT THE STOP. On a live money platform the bots then stop staking and the only
   * evidence is an ABSENCE: no outcome, no audit, no bell — every instrument reading "quiet", which is exactly what
   * an hour with nothing due looks like. A stop nobody is told about is its own failure, and it is the same one A24
   * exists for, so it is answered in the same place and the same shape as A24's limb above.
   * ⛔ THE CONDITION IS DRIVEN, NEVER THE FUNCTION. Every case below runs a real `pollerPass` over a real gate and
   * reads what arrived on the channel. A case that called the alert helper and watched it return would stay green on
   * a build where `pollerPass` never reaches it — which is precisely the build this section was written against. */
  {
    const instanceId = `hb-test-skew-${process.pid}`;
    const st = { ...EN2.engineState(), started: true, stopping: false, skewMs: 0, inFlight: new Map() };
    const rec = recorder();
    const bells = () => rec.calls.filter((c: Any) => c.fn === "once" && String(c.key).startsWith("engine:clock_skew"));

    /* ⛔ RE-ARM DETERMINISTICALLY, NEVER OFF THE BELL THAT RANG. Reading the key back from an observed bell works
     * only on a build where the bell rang — and the build these cases exist to catch is one where an EARLIER pass
     * already spent this EAT day's claim, so there is no bell to read, `String(undefined)` is released instead, and
     * the re-arming silently becomes a no-op that leaves the control masked exactly as before.
     * `claimWithEatSuffix` returns the real key whether or not it won it, so this learns it in EVERY build.
     * (Found by driving `alerts-skew-every-gate`: it was WRONG-ASSERTION until this helper existed.) */
    const rearm = async (k: Any): Promise<string> => {
      const { key } = await S.houseBotAlertOnceStore.claimWithEatSuffix(k.prefix, k.unit);
      await S.houseBotAlertOnceStore.release(key).catch(() => {});
      return key;
    };

    // Each case below measures its OWN condition, not whatever the sections above happened to leave behind.
    await rearm(K.ALERT_KEY.clockSkew());
    const before = bells().length;
    const unknown = await passSafe({ state: { ...st, skewMs: null }, instanceId }, rec.alerts);
    ok("16.515a · ⛔ register:1218 · a clock that has NOT been measured stops the claims (SKEW_UNKNOWN) — and now RINGS: exactly one engine:clock_skew bell, code CLOCK_SKEW, the key's first writer anywhere in this tree",
      before === 0 && unknown?.claimed === 0 && unknown?.gate === "SKEW_UNKNOWN" && unknown?.alerted === true
        && bells().length === 1 && bells()[0]?.code === "CLOCK_SKEW",
      j({ before, pass: unknown, bells: bells().map((c: Any) => ({ key: c.key, code: c.code })) }));

    const over = await passSafe({ state: { ...st, skewMs: 6_000 }, instanceId }, rec.alerts);
    ok("16.515b · …and a clock 6 s out on the NEXT pass of the same EAT day stops the claims too and tells nobody a second time — the throttle is the AlertOnce claim, which is what makes a poller reaching this line every few seconds, on every container at once, ring ONCE",
      over?.claimed === 0 && over?.gate === "SKEW" && over?.alerted === false && bells().length === 1,
      j({ pass: over, bells: bells().length }));

    /* ⛔ THE BELL IS RE-ARMED BEFORE THE POSITIVE CONTROL, AND THE MUTATION DRIVE IS WHY.
     * 16.515a spends this EAT day's AlertOnce claim. Left spent, the control below could not tell a build that
     * rings ONLY on a bad clock from one that rings on EVERY refused gate — the second one would be silenced by
     * the throttle, not by the predicate, and the control would pass on the broken build. So the claim is handed
     * back, and the control then runs against an ARMED bell, where a wrong ring is visible.
     * (Found by driving the `alerts-skew-every-gate` mutation: the control was MISSED until this line.) */
    await rearm(K.ALERT_KEY.clockSkew());

    /* ⭐ POSITIVE CONTROLS — the gate reasons that must still be ALLOWED to be silent. NOT_STARTED and STOPPING are
     * a container booting or shutting down and FULL is back-pressure: the engine WORKING. A bell on any of them
     * would wake an officer at every deploy, and an alert nobody can act on is an alert nobody reads.
     * ⭐ THE FIRST ONE IS THE SHARP ONE: its skew is genuinely UNKNOWN (skewMs null) and it still must not ring,
     * because `claimGate` answers NOT_STARTED first. A build that rang on "the gate refused" rather than on "the
     * clock cannot be trusted" passes 16.515a–b and fails only here. */
    const quiet = recorder();
    const quietBells = () => quiet.calls.filter((c: Any) => c.fn === "once" && String(c.key).startsWith("engine:clock_skew"));
    const notStarted = await passSafe({ state: { ...st, started: false, skewMs: null }, instanceId }, quiet.alerts);
    const stopping = await passSafe({ state: { ...st, stopping: true, skewMs: null }, instanceId }, quiet.alerts);
    const busy = new Map([["hbi_s1", { startedAt: 0, inline: false }], ["hbi_s2", { startedAt: 0, inline: true }]]);
    const full = await passSafe({ state: { ...st, skewMs: 0, inFlight: busy }, instanceId }, quiet.alerts);
    ok("16.515c · ⭐ POSITIVE CONTROL · an UNMEASURED clock behind a NOT_STARTED or STOPPING gate, and a FULL slot table on a good clock, are the engine working — each refuses claims and NOT ONE of them rings",
      notStarted?.gate === "NOT_STARTED" && stopping?.gate === "STOPPING" && full?.gate === "FULL"
        && notStarted?.alerted === false && stopping?.alerted === false && full?.alerted === false
        && quietBells().length === 0,
      j({ gates: [notStarted?.gate, stopping?.gate, full?.gate], bells: quietBells().length }));

    /* ⛔ THE BELL NEVER COSTS THE PASS, AND A CHANNEL DOWN FOR ONE TICK MUST NOT BUY THE WHOLE DAY'S SILENCE.
     * The claim is given back when the send throws (C3 review LI-8), so the next occurrence still tells someone.
     * The bell is still armed here: 16.515c proved it did not ring on any of those three gates. */
    const downRec = recorder();
    const downAlerts: Any = { ...downRec.alerts, once: async () => { throw new Error("alert channel down"); } };
    const down = await passSafe({ state: { ...st, skewMs: null }, instanceId }, downAlerts);
    ok("16.515d · ⛔ the bell never costs the pass · a channel that THROWS still returns the gate reason and alerted:false, and pollerPass itself does not throw",
      down?.claimed === 0 && down?.gate === "SKEW_UNKNOWN" && down?.alerted === false && down?.threw === undefined, j(down));

    const after = recorder();
    const afterBells = () => after.calls.filter((c: Any) => c.fn === "once" && String(c.key).startsWith("engine:clock_skew"));
    const retry = await passSafe({ state: { ...st, skewMs: -6_000 }, instanceId }, after.alerts);
    ok("16.515e · ⭐ LI-8 · the FAILED bell gave its claim back, so the very next skewed pass does tell someone — and a clock 6 s out the OTHER way is the same untrustworthy clock",
      retry?.gate === "SKEW" && retry?.alerted === true && afterBells().length === 1 && afterBells()[0]?.code === "CLOCK_SKEW",
      j({ retry, bells: afterBells().length }));

    /* ⛔ AND THE ABSENCE IS MEASURED OVER SOMETHING. The first half of this case pins that each bell really carries
     * its diagnostic detail; only then does the second half mean anything. Asked over calls that carried no detail
     * at all — which is what the shared recorder handed back until this build — "does it name a holder?" is a sweep
     * over an empty population, and an empty sweep passes. */
    const d19 = [...bells(), ...afterBells()];
    ok("16.515f · ⛔ D19 · every skew bell carries its diagnostic detail — reason, the measured offset and the tolerance — and NAMES NO BOT AND NO HOLDER: a server clock is a fact about the PROCESS, true of every bot at once, and a handle hung on it would put a person's name against a fault that has nothing to do with them",
      d19.length === 2 && d19.every((c: Any) => {
        const d = (c.detail ?? {}) as Record<string, unknown>;
        const carries = typeof d.reason === "string" && d.toleratedMs === K.MAX_TOLERATED_SKEW_MS && "skewMs" in d;
        const names = d.botId !== undefined || d.holderUserId !== undefined || d.handle !== undefined || d.label !== undefined;
        return carries && !names;
      }), j(d19.map((c: Any) => c.detail)));

    /* ⭐ POSITIVE CONTROL · the bell must not have bought its silence by breaking the poller. A clock inside
     * tolerance on the same instance still claims a real due row and fires it. */
    const bSkew = await botWith();
    const pSkew = await lockedPoll();
    await S.houseBotIntentStore.insert(pendingRow(bSkew, pSkew.m.id));
    const healthy = await passSafe({ state: { ...st, skewMs: 0 }, instanceId }, recorder().alerts);
    ok("16.515g · ⭐ POSITIVE CONTROL · a clock INSIDE tolerance on the same instance still CLAIMS and FIRES a real due row — the gate that now rings did not stop admitting the passes it always admitted",
      healthy?.claimed === 1 && healthy?.beat === true && healthy?.results?.length === 1,
      j({ claimed: healthy?.claimed, beat: healthy?.beat, results: healthy?.results?.length }));
  }
  {
    const b = await botWith();
    const claimAs = async (me: string) => {
      const inserted = await S.houseBotIntentStore.insert(pendingRow(b, (await lockedPoll(0)).m.id));
      return S.houseBotIntentStore.claimById(inserted.id, me);
    };
    const mine = await claimAs("hb-rel-A");
    const inFlight = await claimAs("hb-rel-A");
    const foreign = await claimAs("hb-rel-B");
    let released: Any;
    try { released = await WK.workerTicks(recorder().alerts).requeueMine("hb-rel-A", [inFlight.id]); } catch (e) { released = { threw: String((e as Error)?.message ?? e) }; }
    const r = await row(mine.id);
    ok("16.44 · SIGTERM · requeueMine releases this instance's claims except the ones in flight: 1 released, PENDING, attempts handed back",
      released === 1 && r.status === "PENDING" && r.claimedBy === null && r.attempts === 0, j({ released, r: [r.status, r.claimedBy, r.attempts] }));
    ok("16.45 · …the in-flight row and another instance's claim stay CLAIMED", (await is(inFlight.id, "CLAIMED", null)) && (await row(foreign.id)).claimedBy === "hb-rel-B");
    for (const x of [mine, inFlight, foreign]) {
      await S.houseBotIntentStore.cancelPending(x.id, "BOT_NOT_ACTIVE");
      await S.houseBotIntentStore.finish(x.id, (await row(x.id)).claimedBy ?? ME, { status: "CANCELLED", reasonCode: "BOT_NOT_ACTIVE" });
    }
  }
  /* ── 16.46 N1-3 · the claim never takes a row past its staleAt (a late row is expired by the planner, never fired) ── */
  {
    // `claimBatch` takes any due row in the store, so this runs last in §16 with nothing else live.
    await S.houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");
    const b = await botWith();
    const stale = await S.houseBotIntentStore.insert(pendingRow(b, (await lockedPoll(0)).m.id, { dueAt: w.iso(-60_000), staleAt: w.iso(-1_000) }));
    const fresh = await S.houseBotIntentStore.insert(pendingRow(b, (await lockedPoll(0)).m.id));
    const claimed: Any[] = await S.houseBotIntentStore.claimBatch({ me: `hb-n13-${process.pid}`, freeSlots: 10, skewGuardMs: 0 });
    const ids = claimed.map((r: Any) => r.id);
    ok("16.46 · N1-3 · a due row already past its staleAt is NOT claimed and stays PENDING; CONTROL: the fresh due row beside it is claimed",
      !ids.includes(stale.id) && (await is(stale.id, "PENDING", null)) && ids.includes(fresh.id), j({ ids, stale: stale.id, fresh: fresh.id }));
    await S.houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");
  }

  /* ── 16.47 ruling 165 · a claim that MOVED is lost, never a key mismatch ── */
  {
    // Nothing else live: this block fires a row whose stake another worker changed under it.
    await S.houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");
    const b = await botWith();
    const { m } = await lockedPoll(10_000);
    const i = await w.intent(b, m.id, FILL({ stakeTzs: 2_000 }));
    // What a re-claiming worker's own fire does at step 16 (MON-02): it clamps the row. This fire still holds 2,000.
    const moved = await S.houseBotIntentStore.clampStake(i.id, ME, 1_000);
    const rec = recorder();
    const out = await fire(i, rec.alerts);
    const house = await houseOn(m.id);
    ok("16.47 · ⭐ ruling 165 · the row's stake changed under this fire → LOST: nothing placed, and no SECURITY alert switches house bots off",
      moved?.stakeTzs === 1_000 && out.kind === "lost" && house.length === 0 && rec.count("security") === 0,
      j({ out, moved: moved?.stakeTzs, house: house.length, security: rec.count("security") }));
    const { m: m2 } = await lockedPoll(10_000);
    const i2 = await w.intent(b, m2.id, FILL({ stakeTzs: 2_000 }));
    const out2 = await fire(i2, recorder().alerts);
    ok("16.48 · CONTROL · the same fire on an untouched row places, so 16.47 is not vacuous",
      out2.kind === "outcome" && out2.outcome?.kind === "placed" && (await houseOn(m2.id)).length === 1, j(out2));
    await S.houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");
  }
});

/* ═══ §17 · the planner (N1 §4.3 pass order, N1 §4.5, N2 §4 step 9, A16, F4, F5, PLAN §3; rulings 71–100, 111–112) ═══ */
section("§17 · plannerPass and its duties");
const PL: Any = await import("../../src/lib/server/house-bot/planner.ts");
const CAPS: Any = await import("../../src/lib/server/house-bot/cap-precheck.ts");
const PA: Any = await import("../../src/lib/server/house-bot/press-audit.ts");
const OV: Any = await import("../../src/lib/server/house-bot/oversight.ts");
const AUD: Any = await import("../../src/lib/server/audit.ts");
const DSG: Any = await import("../../src/lib/server/house-bot/designation.ts");
const HB_BOOK: Any = await import("../../src/lib/server/house-bot/book.ts");
await guard("17", async () => {
  const w = await loadWorld();
  if (!(await w.db.user.findById(WORLD_OFFICER))) await w.user({ id: WORLD_OFFICER, role: "ADMIN" });
  await w.limits();
  await w.switchOn();
  await w.ageHouseMinute();
  const S = HDAL;
  // Earlier sections leave live rows; nothing in §17 may act on them by accident.
  await S.houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");
  const parseCtx = await RC.loadParseContext();
  const dbNow = async (): Promise<number> => (await S.houseBotRuntimeStore.dbClock()).nowMs;
  const msg = (e: unknown) => String((e as Error)?.message ?? e);
  const planRules = (o: Any = {}) => {
    const r: Any = R.DEFAULT_RULES_V1({ stakeBounds: { minTzs: 1_000, maxTzs: 10_000_000 } });
    r.scope.products.polls = true;
    r.scope.categories = ["macro"];
    r.modes.polls = { counter: true, fill: true, opener: true };
    r.shaping.roundToTzs = 1_000;
    r.shaping.jitterPct = 0;
    r.targeting = { enabled: true };
    return merge(r, o);
  };
  /** An ACTIVE bot with parseable planner rules, a min gap F5 accepts, and its scope started now. */
  const botWith = async (caps: Any = {}, rules: Any = planRules()) => {
    const b = await w.bot({ caps: { freqMinGapSec: 20, ...caps } });
    const cur: Any = await S.houseBotStore.get(b.botId);
    const saved = await S.houseBotStore.saveRules(b.botId, cur.rulesVersion, { rules });
    if (!saved.ok) throw new Error("§17 fixture: saveRules CAS failed");
    await S.houseBotRuntimeStore.setScopeFrom(K.RUNTIME_KEY.bot(b.botId));
    return b;
  };
  const parsedOf = async (botId: string) => {
    const bot: Any = await S.houseBotStore.get(botId);
    const p: Any = R.parseHouseBotRules(bot.rules, parseCtx);
    if (!p.ok) throw new Error(`§17 fixture: rules do not parse — ${p.code} ${p.field ?? ""}`);
    return { bot, rules: p.rules };
  };
  const recorder = () => {
    const calls: Any[] = [];
    const alerts = {
      placed: async (i: Any) => { calls.push({ fn: "placed", id: i.id }); },
      once: async (key: string, m: Any) => { calls.push({ fn: "once", key, code: m.code, m }); },
      security: async (m: Any) => { calls.push({ fn: "security", code: m.code }); },
      botStopped: async (bot: Any, change: Any) => { calls.push({ fn: "botStopped", botId: bot.id, ...change }); },
      switchedOff: async (change: Any) => { calls.push({ fn: "switchedOff", ...change }); },
    };
    return { alerts, calls, count: (fn: string) => calls.filter((c) => c.fn === fn).length, keyed: (prefix: string) => calls.filter((c) => c.fn === "once" && String(c.key).startsWith(prefix)) };
  };
  // Every duty call is caught and asserted (E25's lesson): a throw handed to the guard would skip every later case.
  const safe = async (fn: () => Promise<Any>): Promise<Any> => { try { return await fn(); } catch (e) { return { threw: msg(e) }; } };
  const row = (id: string) => S.houseBotIntentStore.get(id) as Promise<Any>;
  const is = async (id: string, status: string, code: string | null) => { const r = await row(id); return !!r && r.status === status && (code == null || r.reasonCode === code); };
  const pollAt = (o: { closeInMs?: number; title?: string } = {}): Promise<Any> => w.svc.createMarket({
    titleEn: o.title ?? "House planner poll", titleSw: "Soko la mpangaji", category: "macro", sourceUrl: "https://bot.go.tz",
    resolutionCriterion: "Resolves at the official date.", resolutionAt: w.iso(7 * 864e5), proposedBy: WORLD_OFFICER,
    ...(o.closeInMs != null ? { selectionClosedAt: w.iso(o.closeInMs) } : {}),
    rateOverrides: { freeExitGraceMinutes: 0, paidExitWindowMinutes: 0 },
  });
  /** A player's YES stake on the market, aged past its exit close + LOCK_MARGIN_MS (grace 0). */
  const lockYes = async (marketId: string, yes = 10_000) => {
    const p = await w.user({ balance: 100_000 });
    const r = await w.svc.buyPosition(p, { marketId, side: "YES", stake: yes, idempotencyKey: crypto.randomUUID() });
    if (!r.ok) throw new Error(`§17 fixture: a player bet was refused — ${j(r)}`);
    for (const pos of await w.positionsOf(marketId)) await w.backdate(pos.id, 10_000);
    return p as string;
  };
  /** Market stamps whose own flows live elsewhere (close, void, reopen, a result check, a resolve claim). */
  const stamp = async (marketId: string, patch: { status?: string; reopened?: boolean; resolveClaimed?: boolean; sentinelClosed?: boolean }) => {
    if (w.onPostgres) {
      const P = w.prisma();
      if (patch.status) await P.$executeRawUnsafe(`UPDATE "PredictionMarket" SET "status" = '${patch.status}' WHERE "id" = $1`, marketId);
      if (patch.reopened) await P.$executeRawUnsafe(`UPDATE "PredictionMarket" SET "reopenedAt" = (clock_timestamp() AT TIME ZONE 'UTC') WHERE "id" = $1`, marketId);
      if (patch.resolveClaimed) await P.$executeRawUnsafe(`UPDATE "PredictionMarket" SET "resolveClaimedAt" = (clock_timestamp() AT TIME ZONE 'UTC') WHERE "id" = $1`, marketId);
      if (patch.sentinelClosed) await P.$executeRawUnsafe(`UPDATE "PredictionMarket" SET "sentinelClosedAt" = (clock_timestamp() AT TIME ZONE 'UTC') WHERE "id" = $1`, marketId);
    } else {
      const m = await w.mdal.marketStore.get(marketId);
      const now = new Date().toISOString();
      await w.mdal.marketStore.set({ ...m, ...(patch.status ? { status: patch.status } : {}), ...(patch.reopened ? { reopenedAt: now } : {}),
        ...(patch.resolveClaimed ? { resolveClaimedAt: now } : {}), ...(patch.sentinelClosed ? { sentinelClosedAt: now } : {}) });
    }
  };
  const rowOf = (b: Any, marketId: string, o: Any = {}) => ({
    id: S.newHouseId("intent"), houseBotId: b.botId, botUserId: b.userId, kind: "FILL", marketId, productLine: "MARKET", anchorKey: marketId,
    triggerPositionId: null, triggerUserId: null, targetId: null, requestedById: null, entryCondition: null, side: "NO", stakeTzs: 2_000,
    dueAt: w.iso(-5_000), deadlineAt: w.iso(3_600_000), staleAt: w.iso(600_000), status: "PENDING", reasonCode: null, why: null,
    decision: {}, attempts: 0, transientAttempts: 0, nextAttemptAt: null, claimedBy: null, claimedUntil: null, positionId: null, finishedAt: null, alertedAt: null, ...o,
  });
  const insert = (r: Any) => safe(() => S.houseBotIntentStore.insert(r));
  const ctxOf = () => ({ state: { ...EN2.engineState(), planner: { oversightAtMs: null, hourlyKey: null, scan: {} } }, instanceId: `hb-test-planner-${process.pid}` });
  const auditTotal = async (action: string) => (await AUD.getAuditByActionsDurable([action], { limit: 5_000 })).total as number;
  const target = (b: Any, marketId: string, o: Any = {}) => safe(() => S.targetStore.insert({
    id: S.newHouseId("target"), houseBotId: b.botId, marketId, delayMinSec: 10, delayMaxSec: 10, timingFrom: "STAKE", reactTo: "EVERY",
    createdById: WORLD_OFFICER, snapshot: { titleEn: "House planner poll", category: "macro" }, ...o,
  }));

  /* ── 17.1 the deadline pass also ends abandoned claims (ruling 72) ── */
  {
    const b = await botWith();
    const pend = await insert(rowOf(b, (await pollAt()).id, { deadlineAt: w.iso(-1_000) }));
    const dead = await insert(rowOf(b, (await pollAt()).id, { status: "CLAIMED", claimedBy: "hb-gone", claimedUntil: w.iso(-1_000), attempts: 1, deadlineAt: w.iso(-500) }));
    const live = await insert(rowOf(b, (await pollAt()).id, { status: "CLAIMED", claimedBy: "hb-live", claimedUntil: w.iso(120_000), attempts: 1, deadlineAt: w.iso(-500) }));
    const expired = await safe(() => S.houseBotIntentStore.expirePastDeadline());
    ok("17.1 · fixture · three rows inserted", !pend.threw && !dead.threw && !live.threw, j({ pend: pend.threw, dead: dead.threw, live: live.threw }));
    ok("17.2 · PENDING past its deadline → EXPIRED(CUTOFF)", await is(pend.id, "EXPIRED", "CUTOFF"), j(expired));
    ok("17.3 · ENG-16 · a CLAIMED row past its deadline whose claim has expired → EXPIRED(CUTOFF)", await is(dead.id, "EXPIRED", "CUTOFF"), j(await row(dead.id)));
    ok("17.4 · …while a live claim past its deadline is never expired (fire's own deadline check owns it)", await is(live.id, "CLAIMED", null), j(await row(live.id)));
    await S.houseBotIntentStore.finish(live.id, "hb-live", { status: "CANCELLED", reasonCode: "BOT_NOT_ACTIVE" });
  }

  /* ── 17.5 STALE before POISON; one poison audit per pass (A10, A19; ruling 73) ── */
  {
    const b = await botWith();
    const staleAndSpent = await insert(rowOf(b, (await pollAt()).id, { status: "CLAIMED", claimedBy: "hb-gone", claimedUntil: w.iso(-2_000), attempts: 3, staleAt: w.iso(-1_000) }));
    const poisonA = await insert(rowOf(b, (await pollAt()).id, { status: "CLAIMED", claimedBy: "hb-gone", claimedUntil: w.iso(-2_000), attempts: 3 }));
    const poisonB = await insert(rowOf(b, (await pollAt()).id, { status: "CLAIMED", claimedBy: "hb-gone", claimedUntil: w.iso(-2_000), attempts: 3 }));
    const before = await auditTotal("house_bot.poison");
    const rec = recorder();
    const pass = await safe(() => PL.plannerPass(ctxOf(), { alerts: rec.alerts, liveBounds: async () => ({ minStake: 1_000, maxStake: 10_000_000, refillPerMin: 10 }) }));
    const after = await auditTotal("house_bot.poison");
    ok("17.5 · a spent claim that is also past staleAt → EXPIRED(STALE), not POISON (N1: STALE runs first)", await is(staleAndSpent.id, "EXPIRED", "STALE"), j(await row(staleAndSpent.id)));
    ok("17.6 · a spent claim still before staleAt → FAILED(POISON)", (await is(poisonA.id, "FAILED", "POISON")) && (await is(poisonB.id, "FAILED", "POISON")), j(pass?.duties));
    ok("17.7 · one poison alert per intent (poison:<id>)", rec.keyed(`poison:${poisonA.id}`).length === 1 && rec.keyed(`poison:${poisonB.id}`).length === 1, j(rec.calls.filter((c) => c.fn === "once").map((c) => c.key)));
    ok("17.8 · A19 · ONE house_bot.poison audit for the pass, not one per intent", after - before === 1, `before ${before} · after ${after}`);
    ok("17.9 · ruling 98 · the money-safety duties ran, so the pass beat", pass?.beat === true && (await S.houseBotRuntimeStore.get(K.RUNTIME_KEY.plannerBeat)) != null, j(pass?.duties));
    const order = Object.keys(pass?.duties ?? {});
    const want = ["deadline", "stale", "poison", "press", "pressAudit", "alertRepair", "endTargets", "pendingLifecycle", "rulesOutcomes", "revalidateLive", "lossStops", "walletMissing", "fillOpener"];
    ok("17.10 · ruling 71 · the duties ran in the ruled order", j(order.slice(0, want.length)) === j(want), j(order));
  }

  /* ── 17.11 press DONE and the A8 alert repair (N1 §4.5) ── */
  {
    const b = await botWith();
    const m = await pollAt();
    const man = await insert(rowOf(b, m.id, { kind: "MANUAL", entryCondition: "THIN", requestedById: WORLD_OFFICER, anchorKey: K.manualAnchorKey(WORLD_OFFICER, crypto.randomUUID()), staleAt: w.iso(15_000) }));
    const press = await S.pressStore.insertChecking({ id: S.newHouseId("press"), actorId: WORLD_OFFICER, submitId: crypto.randomUUID(), purpose: "ENTER_NOW", houseBotId: b.botId, marketId: m.id, targetId: null, intentId: null, reason: "Planner press case" });
    const queued = press.ok ? await S.houseTransaction((tx: Any) => S.pressStore.queue(press.row.id, man.id, tx)) : null;
    await S.houseBotIntentStore.cancelPending(man.id, "CANCELLED_BY_ADMIN");
    const placed = await insert(rowOf(b, (await pollAt()).id, { status: "PLACED", positionId: `pos_hb_placed_${process.pid}_${Date.now()}`, finishedAt: w.iso(-60_000), attempts: 1 }));
    const rec = recorder();
    const p1 = await safe(() => PL.plannerPass(ctxOf(), { alerts: rec.alerts, liveBounds: async () => ({ minStake: 1_000, maxStake: 10_000_000, refillPerMin: 10 }) }));
    const pr: Any = press.ok ? await S.pressStore.get(press.row.id) : null;
    ok("17.11 · a QUEUED press whose intent is terminal → DONE in the press pass", queued?.state === "QUEUED" && pr?.state === "DONE", j({ p: pr?.state, duties: p1?.duties?.press }));
    ok("17.12 · A8 · a PLACED row whose alert never went out (finished 60 s ago) is alerted once by the repair", !placed.threw && rec.calls.filter((c) => c.fn === "placed" && c.id === placed.id).length === 1 && (await row(placed.id))?.alertedAt != null, j(placed.threw ?? rec.calls.filter((c) => c.fn === "placed")));
    const rec2 = recorder();
    await safe(() => PL.plannerPass(ctxOf(), { alerts: rec2.alerts, liveBounds: async () => ({ minStake: 1_000, maxStake: 10_000_000, refillPerMin: 10 }) }));
    ok("17.13 · …and never twice (the alertedAt claim)", rec2.calls.filter((c) => c.fn === "placed" && c.id === placed.id).length === 0);

    // N1-8 · the press audit LEASE (ruling 74), Postgres only: the repair picks a press only once its row is 60 s old, and
    // only Postgres lets a case age one (a declared fixture of time). The lease matters when two planners list the same
    // press before either writes (a failover), so two passes run AT ONCE; the lease must let exactly one audit through.
    if (w.onPostgres && press.ok) {
      const AUD17: Any = await import("../../src/lib/server/audit.ts");
      await w.prisma().$executeRawUnsafe(`UPDATE "HouseBotPress" SET "updatedAt" = "updatedAt" - interval '120 seconds' WHERE "id" = $1`, press.row.id);
      const bounds = async () => ({ minStake: 1_000, maxStake: 10_000_000, refillPerMin: 10 });
      const both = await Promise.all([
        safe(() => PL.plannerPass(ctxOf(), { alerts: recorder().alerts, liveBounds: bounds })),
        safe(() => PL.plannerPass(ctxOf(), { alerts: recorder().alerts, liveBounds: bounds })),
      ]);
      await AUD17.auditFlush?.();
      const rows = (await AUD17.getAuditByActionsDurable(["house_bot.enter_now"], { limit: 200 })).entries.filter((e: Any) => e.targetId === b.botId);
      const audited: Any = await S.pressStore.get(press.row.id);
      ok("17.13b · ⭐ N1-8 · two planner passes at once over one unaudited press → exactly ONE house_bot.enter_now audit, and the press records it",
        rows.length === 1 && audited?.auditId === rows[0]?.id, j({ rows: rows.map((e: Any) => e.id), auditId: audited?.auditId, counts: both.map((p: Any) => p?.counts?.pressAudited) }));
    }
  }

  /* ── 17.14 the press audit builder (ruling 74; the 60 s lease repair itself is NOT MEASURED here — no backdating of presses) ── */
  {
    const press = (o: Any) => ({ id: "hbp_x", actorId: WORLD_OFFICER, submitId: "s", purpose: "ENTER_NOW", houseBotId: "hb_x", marketId: "mkt_x", targetId: null, intentId: "hbi_x", state: "QUEUED", code: null, reason: "Because the pool is thin", auditId: null, auditClaimUntil: null, createdAt: w.iso(), updatedAt: w.iso(), ...o });
    const intent = { id: "hbi_x", marketId: "mkt_x", side: "NO", stakeTzs: 5_000, entryCondition: "THIN", status: "PLACED" };
    const q = PA.pressAuditEntry(press({}), { intent, events: [], holderUserId: "usr_h" });
    ok("17.14 · an ENTER_NOW press QUEUED → house_bot.enter_now with the intent's side, stake, condition and outcome",
      q?.action === "house_bot.enter_now" && q.payload.stakeTzs === 5_000 && q.payload.outcome === "PLACED" && q.payload.holderUserId === "usr_h" && K.isAllowedHouseAuditPayload(q.payload), j(q));
    ok("17.15 · a REFUSED(OWNER_POSITION) press → house_bot.enter_now_refused; REFUSED(STAKE_BELOW_MIN) → no audit",
      PA.pressAuditEntry(press({ state: "REFUSED", code: "OWNER_POSITION" }), { intent: null, events: [], holderUserId: null })?.action === "house_bot.enter_now_refused"
        && PA.pressAuditEntry(press({ state: "REFUSED", code: "STAKE_BELOW_MIN" }), { intent: null, events: [], holderUserId: null }) === null);
    ok("17.16 · a TARGET_ADD press with no TARGET_ADDED event is never guessed (null)", PA.pressAuditEntry(press({ purpose: "TARGET_ADD", state: "DONE", intentId: null }), { intent: null, events: [], holderUserId: null }) === null);
    const ev = { kind: "TARGET_ADDED", marketId: "mkt_x", payload: { targetId: "hbt_x", delayMinSec: 10, delayMaxSec: 20, timingFrom: "STAKE", reactTo: "FIRST", label: "Leaky" } };
    const t = PA.pressAuditEntry(press({ purpose: "TARGET_ADD", state: "DONE", intentId: null, targetId: "hbt_x" }), { intent: null, events: [ev], holderUserId: null });
    ok("17.17 · …with its event → house_bot.target_added from the event's own fields, and no label (R7)", t?.action === "house_bot.target_added" && t.payload.delayMaxSec === 20 && !("label" in t.payload), j(t));
    const written = await safe(() => PA.writePressAudit(press({}), q));
    const entry = typeof written === "string" ? (await AUD.getAuditByActionsDurable(["house_bot.enter_now"], { limit: 50 })).entries.find((e: Any) => e.id === written) : null;
    ok("17.18 · ruling 74 · the repair writes AS THE OFFICER who pressed, never system_house_bot", entry?.actorId === WORLD_OFFICER && entry?.category === "COMPLIANCE", j({ written, actor: entry?.actorId }));

    /* ── 17.14b · replan ruling 543 · the id is what marks a press AUDITED, so an entry that did not land has none ──
       `audit()` resolves an entry it cannot sign with a ticketed id all the same; handing that on would mark the press
       audited, and the lease repair would never write the row that was lost. */
    const unsignedId = await withUnsignableChain(() => safe(() => PA.writePressAudit(press({}), q)));
    ok("17.14b · ⭐ 543 · a press audit that cannot be SIGNED answers null — never the id of a row that does not exist, which would mark the press audited and stop the lease repair from ever writing it",
      unsignedId === null, j({ unsignedId }));
    const signedId = await safe(() => PA.writePressAudit(press({}), q));
    ok("17.14c · CONTROL · …while the same write with the secret in place answers an id the audit store really holds — so the null above is the missing row, not a writer that answers null",
      typeof signedId === "string" && AUD.getAuditById(signedId) !== undefined, j({ signedId }));

    /* ── 17.14d · Postgres · a row the DATABASE refuses (ruling 543's second shortfall) ──────────────────────────────
       The fail-open for a database outage was already there: a signed copy kept in this process's ring. What was not
       there was the SAYING — `recorded` read true and the ring-only id was handed on as if a table row existed. A
       BEFORE INSERT trigger that raises stands in for the outage, on this run's own scratch database, for exactly two
       calls, and is dropped in a `finally`. ⚠️ Memory has no persist path at all, so this is Postgres by nature. */
    if (w.onPostgres) {
      const db = w.prisma();
      await AUD.auditFlush();
      let refused: Any = null;
      let refusedWrite: Any = null;
      try {
        await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION hb543_refuse_audit() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RAISE EXCEPTION 'hb543 planted refusal'; END $f$`);
        await db.$executeRawUnsafe(`CREATE TRIGGER hb543_refuse BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION hb543_refuse_audit()`);
        refused = await safe(() => AUD.audit({ category: "SYSTEM", action: "probe.543.persist", actorId: null, targetType: null, targetId: null, payload: { probe: 1 } }));
        refusedWrite = await safe(() => PA.writePressAudit(press({}), q));
        await AUD.auditFlush();
      } finally {
        await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS hb543_refuse ON "AuditLog"`);
        await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS hb543_refuse_audit()`);
      }
      const rowsOf = async (id: unknown): Promise<number> =>
        Number(((await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "AuditLog" WHERE "id" = $1`, String(id))) as Any[])[0]?.n ?? -1);
      const refusedRows = await rowsOf(refused?.id);
      ok("17.14d · ⭐ 543 · Postgres · an append the DATABASE refuses resolves unrecorded — PERSIST_FAILED — with a signed copy in this process's ring and NO row in the table, and a press audit written through it answers null",
        refused?.recorded === false && refused?.unrecorded === "PERSIST_FAILED" && AUD.getAuditById(refused?.id) !== undefined
          && refusedRows === 0 && refusedWrite === null,
        j({ refused: refused && { recorded: refused.recorded, unrecorded: refused.unrecorded, threw: refused.threw ?? null }, tableRows: refusedRows, refusedWrite }));
      const after = await safe(() => AUD.audit({ category: "SYSTEM", action: "probe.543.persisted", actorId: null, targetType: null, targetId: null, payload: { probe: 2 } }));
      await AUD.auditFlush();
      const afterRows = await rowsOf(after?.id);
      ok("17.14e · CONTROL · with the refusal dropped the same append is recorded and IS in the table — so PERSIST_FAILED above is the database's refusal and not a constant",
        after?.recorded === true && after?.unrecorded === undefined && afterRows === 1, j({ recorded: after?.recorded, tableRows: afterRows }));
    }
  }

  /* ── 17.19 endTargets (N2 §4 step 9; rulings 75–76) ── */
  {
    const b = await botWith({ targetsMaxActive: 50 });
    const nowMs = await dbNow();
    const closed = await pollAt(); const tClosed = await target(b, closed.id); await stamp(closed.id, { status: "CLOSED" });
    const reopened = await pollAt(); const tReopened = await target(b, reopened.id); await stamp(reopened.id, { reopened: true });
    const claimed = await pollAt(); const tClaimed = await target(b, claimed.id); await stamp(claimed.id, { resolveClaimed: true });
    const checked = await pollAt(); const tChecked = await target(b, checked.id); await stamp(checked.id, { sentinelClosed: true });
    const open = await pollAt(); const tOpen = await target(b, open.id);
    const done = await pollAt(); const tDone = await target(b, done.id, { reactTo: "FIRST" });
    if (!tDone.threw) await insert(rowOf(b, done.id, { kind: "COUNTER", anchorKey: `pos_hb_done_${process.pid}`, triggerPositionId: `pos_hb_done_${process.pid}`, triggerUserId: WORLD_OFFICER, targetId: tDone.id, status: "PLACED", positionId: `pos_hb_donep_${process.pid}`, finishedAt: w.iso(-1_000), attempts: 1 }));
    const n = await safe(() => PL.endTargets(nowMs, parseCtx));
    const get = (t: Any) => S.targetStore.get(t.id) as Promise<Any>;
    const ended = async (t: Any, cause: string) => { const r = await get(t); return r?.status === "ENDED" && r?.endCause === cause; };
    ok("17.19 · fixture · six targets inserted", ![tClosed, tReopened, tClaimed, tChecked, tOpen, tDone].some((t) => t.threw), j([tClosed, tReopened, tClaimed, tChecked, tOpen, tDone].map((t) => t.threw ?? "ok")));
    ok("17.20 · a closed poll → ENDED(MARKET_CLOSED)", await ended(tClosed, "MARKET_CLOSED"), j({ n, t: await get(tClosed) }));
    ok("17.21 · a reopened poll → ENDED(MARKET_REOPENED)", await ended(tReopened, "MARKET_REOPENED"));
    ok("17.22 · N2 step 9.5 · a young resolve claim ALONE never ends a target (stays ACTIVE)", (await get(tClaimed))?.status === "ACTIVE");
    ok("17.23 · …while a recorded result check does → ENDED(INFO_BLACKOUT)", await ended(tChecked, "INFO_BLACKOUT"));
    ok("17.24 · reactTo FIRST with a PLACED reaction → ENDED(DONE)", await ended(tDone, "DONE"));
    ok("17.25 · CONTROL · an open, in-scope, reactable poll's target stays ACTIVE", (await get(tOpen))?.status === "ACTIVE");
    const evs = (await S.houseBotEventStore.listByKinds(["TARGET_ENDED"], { marketId: closed.id, limit: 5 })) as Any[];
    ok("17.26 · ruling 76 · one TARGET_ENDED event, payload {targetId, endCause} — never `cause`", evs.length === 1 && evs[0].payload?.endCause === "MARKET_CLOSED" && evs[0].payload?.targetId === tClosed.id && !("cause" in (evs[0].payload ?? {})), j(evs));
    const again = await safe(() => PL.endTargets(nowMs, parseCtx));
    ok("17.27 · a second pass writes no second event (conditional end)", ((await S.houseBotEventStore.listByKinds(["TARGET_ENDED"], { marketId: closed.id, limit: 5 })) as Any[]).length === 1, j(again));
    // Rules the bot can no longer parse leave its targets ACTIVE and inert (04:4005), even out of the rules' scope.
    const cur: Any = await S.houseBotStore.get(b.botId);
    await S.houseBotStore.saveRules(b.botId, cur.rulesVersion, { rules: { schemaVersion: 99 } });
    await safe(async () => PL.endTargets(await dbNow(), parseCtx));
    ok("17.28 · unparseable rules leave an in-scope target ACTIVE (inert)", (await get(tOpen))?.status === "ACTIVE");
    const cur2: Any = await S.houseBotStore.get(b.botId);
    await S.houseBotStore.saveRules(b.botId, cur2.rulesVersion, { rules: planRules({ scope: { categories: ["weather"] } }) });
    await safe(async () => PL.endTargets(await dbNow(), parseCtx));
    ok("17.29 · a category no longer in the saved rules → ENDED(OUT_OF_SCOPE)", await ended(tOpen, "OUT_OF_SCOPE"), j(await get(tOpen)));
    const late = await pollAt({ closeInMs: 10 * 60_000 });
    const b2 = await botWith({}, planRules({ guards: { noReactZonePollsMin: 30 } }));
    const tLate = await target(b2, late.id);
    await safe(async () => PL.endTargets(await dbNow(), parseCtx));
    ok("17.30 · a poll with no reactable stake left (no-react zone covers the rest) → ENDED(CUTOFF_PASSED)", !tLate.threw && (await ended(tLate, "CUTOFF_PASSED")), j(tLate.threw ?? (await get(tLate))));
  }

  /* ── 17.31 the A16 PENDING sweep (ruling 88) ── */
  {
    const b = await botWith();
    const shut = await pollAt();
    const pShut = await insert(rowOf(b, shut.id));
    await stamp(shut.id, { status: "CLOSED" });
    const re = await pollAt();
    const pFill = await insert(rowOf(b, re.id));
    const pMan = await insert(rowOf(b, re.id, { kind: "MANUAL", entryCondition: "THIN", requestedById: WORLD_OFFICER, anchorKey: K.manualAnchorKey(WORLD_OFFICER, crypto.randomUUID()), staleAt: w.iso(15_000) }));
    await stamp(re.id, { reopened: true });
    const n = await safe(() => PL.sweepPendingLifecycle());
    ok("17.31 · A16 · PENDING on a closed poll → SKIPPED(MARKET_NOT_LIVE)", await is(pShut.id, "SKIPPED", "MARKET_NOT_LIVE"), j({ n, r: await row(pShut.id) }));
    ok("17.32 · …on a reopened poll the FILL → SKIPPED(MARKET_REOPENED) (never re-planned)", await is(pFill.id, "SKIPPED", "MARKET_REOPENED"));
    ok("17.33 · …while the staff-chosen row is left PENDING for fire's blackout", await is(pMan.id, "PENDING", null));
    await S.houseBotIntentStore.cancelPending(pMan.id, "BOT_NOT_ACTIVE");
  }

  /* ── 17.34 rules-parse outcomes and F4's future alert (ruling 100) ── */
  {
    const control = await S.houseBotControlStore.get();
    const old = await botWith();
    const oldCur: Any = await S.houseBotStore.get(old.botId);
    await S.houseBotStore.saveRules(old.botId, oldCur.rulesVersion, { rules: { schemaVersion: 0, scope: { products: { polls: true } } } });
    const oldJson = j((await S.houseBotStore.get(old.botId) as Any).rules);
    const fut = await botWith();
    const futCur: Any = await S.houseBotStore.get(fut.botId);
    await S.houseBotStore.saveRules(fut.botId, futCur.rulesVersion, { rules: { schemaVersion: 99 } });
    const rec = recorder();
    const r1 = await safe(async () => PL.rulesOutcomes(await dbNow(), control, parseCtx, rec.alerts));
    await safe(async () => PL.rulesOutcomes(await dbNow(), control, parseCtx, rec.alerts));
    await safe(async () => PL.rulesOutcomes(await dbNow(), control, parseCtx, rec.alerts));
    const oldBot: Any = await S.houseBotStore.get(old.botId);
    ok("17.34 · F4 · v0 rules → AUTO_PAUSED(RULES_OUTDATED) once", oldBot.status === "AUTO_PAUSED" && oldBot.pauseReason === "RULES_OUTDATED" && rec.calls.filter((c) => c.fn === "botStopped" && c.botId === old.botId).length === 1, j({ r1, s: oldBot.status, p: oldBot.pauseReason }));
    ok("17.35 · …and the rules JSON is byte-identical after 3 passes (the engine never converts)", j(oldBot.rules) === oldJson);
    const futBot: Any = await S.houseBotStore.get(fut.botId);
    const futRt: Any = await S.houseBotRuntimeStore.get(K.RUNTIME_KEY.bot(fut.botId));
    ok("17.36 · rules from a newer build: never paused, the idle start recorded, no alert before 10 min",
      futBot.status === "ACTIVE" && futRt?.rulesFutureSince != null && rec.keyed(`rules-future:${fut.botId}:`).length === 0, j({ s: futBot.status, since: futRt?.rulesFutureSince }));
    await S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.bot(fut.botId), { rulesFutureSince: w.iso(-11 * 60_000) });
    const rec2 = recorder();
    await safe(async () => PL.rulesOutcomes(await dbNow(), control, parseCtx, rec2.alerts));
    await safe(async () => PL.rulesOutcomes(await dbNow(), control, parseCtx, rec2.alerts));
    ok("17.37 · …idle for 11 min → ONE alert rules-future:<botId>:99, the status still ACTIVE",
      rec2.keyed(`rules-future:${fut.botId}:99`).length === 1 && (await S.houseBotStore.get(fut.botId) as Any).status === "ACTIVE", j(rec2.calls.filter((c) => c.fn === "once").map((c) => c.key)));
    const futCur2: Any = await S.houseBotStore.get(fut.botId);
    await S.houseBotStore.saveRules(fut.botId, futCur2.rulesVersion, { rules: planRules() });
    await safe(async () => PL.rulesOutcomes(await dbNow(), control, parseCtx, recorder().alerts));
    ok("17.38 · rules that parse again clear the idle start", (await S.houseBotRuntimeStore.get(K.RUNTIME_KEY.bot(fut.botId)) as Any)?.rulesFutureSince == null);
    await S.houseBotStore.setStatus(fut.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: null });
  }

  /* ── 17.39 F5 revalidateLive (A7, F5, N1 §5; ruling 84) ── */
  {
    const control = await S.houseBotControlStore.get();
    const low = await botWith({ stakeMinTzs: 1_000, stakeMaxTzs: 4_000 });
    const clamp = await botWith({ stakeMinTzs: 2_000, stakeMaxTzs: 10_000 });
    const live = { minStake: 2_000, maxStake: 5_000, refillPerMin: 10 };
    const both = [await parsedOf(low.botId), await parsedOf(clamp.botId)];
    const rec = recorder();
    const r1 = await safe(() => PL.revalidateLive(both, control, rec.alerts, async () => live));
    const r2 = await safe(() => PL.revalidateLive(both, control, rec.alerts, async () => live));
    const lowBot: Any = await S.houseBotStore.get(low.botId);
    ok("17.39 · F5 · the platform minimum raised above the bot's minimum → AUTO_PAUSED(RULES_INVALID, stakeMinTzs), one stop over two passes",
      lowBot.status === "AUTO_PAUSED" && lowBot.pauseReason === "RULES_INVALID" && lowBot.pauseDetail?.field === "stakeMinTzs" && rec.calls.filter((c) => c.fn === "botStopped" && c.botId === low.botId).length === 1, j({ r1, r2, s: lowBot.status, d: lowBot.pauseDetail }));
    const hash = PL.boundsHashOf(live);
    ok("17.40 · a maximum that only narrows → stays ACTIVE, ONE bounds-clamp alert for the hash", (await S.houseBotStore.get(clamp.botId) as Any).status === "ACTIVE" && rec.keyed(`bounds-clamp:${clamp.botId}:${hash}`).length === 1, j(rec.calls.filter((c) => c.fn === "once").map((c) => c.key)));
    ok("17.41 · the live hash is recorded on the global runtime row", (await S.houseBotRuntimeStore.get(K.RUNTIME_KEY.global) as Any)?.boundsHash === hash);
    const p = both[1];
    ok("17.42 · unplaceableField · a min gap under the live floor, and a global per-market cap under the live minimum",
      PL.unplaceableField({ ...p.bot, freqMinGapSec: 10 }, p.rules, { gCapPerMarketTzs: null }, { minStake: 1_000, maxStake: 1e7, refillPerMin: 10 }) === "freqMinGapSec"
        && PL.unplaceableField(p.bot, p.rules, { gCapPerMarketTzs: 500 }, { minStake: 1_000, maxStake: 1e7, refillPerMin: 10 }) === "gCapPerMarketTzs"
        && PL.unplaceableField(p.bot, p.rules, { gCapPerMarketTzs: null }, { minStake: 1_000, maxStake: 1e7, refillPerMin: 10 }) === null);
    await S.houseBotStore.setStatus(clamp.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: null });
  }

  /* ── 17.43 realised-loss stops (PLAN §3; rulings 82–83, 111) ── */
  {
    const m = await pollAt();
    await lockYes(m.id);
    // The stake is placed under an open loss cap (H2's projected-loss cap would refuse 2,000 against 1,000); the cap is
    // lowered afterwards, as an owner saving a tighter cap mid-day would.
    const b = await botWith();
    const i = await w.intent(b, m.id, { kind: "FILL", side: "NO", stakeTzs: 2_000 });
    const placed = await w.place(b, i);
    await w.setCaps(b.botId, { capDailyLossTzs: 1_000 });
    const res = await safe(() => w.svc.resolveMarket({ marketId: m.id, outcome: "YES", officerId: WORLD_OFFICER }));
    const st = await safe(() => w.svc.settleMarket(m.id, { force: true }));
    const before = await auditTotal("house_bot.loss_stop");
    const control = await S.houseBotControlStore.get();
    const rec = recorder();
    const s1 = await safe(async () => PL.lossStops(await dbNow(), [await S.houseBotStore.get(b.botId)], { ...control, gCapDailyLossTzs: null }, rec.alerts));
    const s2 = await safe(async () => PL.lossStops(await dbNow(), [await S.houseBotStore.get(b.botId)], { ...control, gCapDailyLossTzs: null }, rec.alerts));
    const bot: Any = await S.houseBotStore.get(b.botId);
    ok("17.43 · fixture · a house NO 2,000 placed, resolved YES and settled", placed.ok === true && !res?.threw && !st?.threw, j({ placed: placed.ok ? true : placed, res, st }));
    ok("17.44 · realised loss 2,000 ≥ the bot's cap 1,000 → AUTO_PAUSED(DAILY_LOSS_STOP), audited house_bot.loss_stop, one stop over two passes",
      bot.status === "AUTO_PAUSED" && bot.pauseReason === "DAILY_LOSS_STOP" && (await auditTotal("house_bot.loss_stop")) - before === 1 && rec.count("botStopped") === 1, j({ s1, s2, status: bot.status }));
    const all = await safe(async () => (await HB_BOOK.houseDayBook(CLOCK.eatDayKey(await dbNow()), null)).realisedLossTzs);
    const rec2 = recorder();
    const g1 = await safe(async () => PL.lossStops(await dbNow(), [], { ...control, enabled: true, gCapDailyLossTzs: all }, rec2.alerts));
    const g2 = await safe(async () => PL.lossStops(await dbNow(), [], { ...control, enabled: true, gCapDailyLossTzs: all }, rec2.alerts));
    const offs = (await S.houseBotEventStore.listByKinds(["SWITCH_OFF"], { limit: 50 })) as Any[];
    const ctl: Any = await S.houseBotControlStore.get();
    ok("17.45 · the global realised loss at the global cap → OFF(GLOBAL_LOSS_STOP) once: one switchedOff alert, never security",
      g1?.global === true && g2?.global === false && ctl.enabled === false && ctl.offCause === "GLOBAL_LOSS_STOP" && rec2.count("switchedOff") === 1 && rec2.count("security") === 0, j({ g1, g2, off: ctl.offCause, calls: rec2.calls }));
    ok("17.46 · …with a SWITCH_OFF event carrying the cause", offs.some((e) => e.payload?.cause === "GLOBAL_LOSS_STOP"));
    await w.switchOn();
  }

  /* ── 17.47 FILL and OPENER planning (PLAN F4, A11, A15; rulings 91–96) ── */
  {
    const rules = planRules();
    const fillLeadMs = rules.fill.leadPollsMin * 60_000;
    const b = await botWith({}, rules);
    const near = await pollAt({ closeInMs: fillLeadMs + 5_000 });
    await lockYes(near.id, 10_000);
    const far = await pollAt({ closeInMs: fillLeadMs + 60 * 60_000 });
    await lockYes(far.id, 10_000);
    const empty = await pollAt({ closeInMs: 2 * 3_600_000 });
    const control = await S.houseBotControlStore.get();
    const state = ctxOf().state;
    const minDraw = (min: number) => min;
    const r1 = await safe(async () => PL.planFillAndOpener(await dbNow(), state, control, [await parsedOf(b.botId)], { randomInt: minDraw, drawRandomInt: () => 1 }));
    const fill: Any = await S.houseBotIntentStore.findByAnchor("FILL", near.id);
    ok("17.47 · a poll whose FILL is due within the horizon gets ONE PENDING FILL on its thin side, sized to 40% of players' locked YES (6,666 → 6,000)",
      fill?.status === "PENDING" && fill.side === "NO" && fill.stakeTzs === 6_000 && fill.houseBotId === b.botId, j({ r1, fill }));
    ok("17.48 · ruling 91 · a poll whose FILL is an hour away is not planned yet", (await S.houseBotIntentStore.findByAnchor("FILL", far.id)) == null);
    const opener: Any = await S.houseBotIntentStore.findByAnchor("OPENER", empty.id);
    const draw: Any = await S.houseBotEventStore.findOpenerDraw(empty.id);
    ok("17.49 · an empty poll created after Start → one OPENER on the side drawn once (NO), the draw naming the bot, for OPENER_PLAN",
      opener?.status === "PENDING" && opener.side === "NO" && draw?.payload?.side === "NO" && draw?.houseBotId === b.botId && draw?.payload?.drawnFor === "OPENER_PLAN", j({ opener, draw }));
    const r2 = await safe(async () => PL.planFillAndOpener(await dbNow(), state, control, [await parsedOf(b.botId)], { randomInt: minDraw, drawRandomInt: () => 0 }));
    const fills = await S.houseBotIntentStore.listLiveOnMarket(near.id);
    ok("17.50 · a second pass plans nothing more on either market", r2?.fill === 0 && r2?.opener === 0 && fills.length === 1, j({ r2, fills: fills.length }));
    const oldEmpty = await pollAt({ closeInMs: 3 * 3_600_000 });
    const b2 = await botWith({}, planRules({ scope: { categories: ["weather"] } }));
    const r3 = await safe(async () => PL.planFillAndOpener(await dbNow(), state, control, [await parsedOf(b2.botId)], { randomInt: minDraw }));
    ok("17.51 · a bot that does not cover the category plans nothing and draws nothing", (await S.houseBotEventStore.findOpenerDraw(oldEmpty.id)) == null, j(r3));
    const b3 = await botWith({}, rules);
    const r4 = await safe(async () => PL.planFillAndOpener(await dbNow(), ctxOf().state, control, [await parsedOf(b3.botId)], { randomInt: minDraw }));
    ok("17.52 · A11 · a poll created before the bot's Start gets no OPENER from that bot", (await S.houseBotIntentStore.findByAnchor("OPENER", oldEmpty.id)) == null, j(r4));
    const g: Any = await S.houseBotRuntimeStore.get(K.RUNTIME_KEY.global);
    await S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.global, { scopeFrom: null });
    const late = await pollAt({ closeInMs: 4 * 3_600_000 });
    const b4 = await botWith({}, rules);
    const r5 = await safe(async () => PL.planFillAndOpener(await dbNow(), ctxOf().state, control, [await parsedOf(b4.botId)], { randomInt: minDraw }));
    ok("17.53 · ruling 92 · never switched on (global scopeFrom NULL) → nothing planned", r5?.opener === 0 && (await S.houseBotIntentStore.findByAnchor("OPENER", late.id)) == null, j(r5));
    await S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.global, { scopeFrom: g?.scopeFrom ?? w.iso() });

    /* ⭐ 2026-09-23 · THE EXPLAINING WALK: IT SEES WHAT THE PLANNER SEES, AND IT MOVES NOTHING.
     * The console answers "why is it not staking?" by walking `runMarket` with `place: false`. Two things have
     * to hold or the panel is either useless or dangerous: it must reach the verdict the PLANNER reaches, and
     * it must not WRITE — no intent, and above all no OPENER DRAW, which is the audited once-per-market record
     * of which side the house took. An officer opening a panel must not move the desk they are inspecting. */
    {
      /* ⛔ THE ACCOUNT IS STARTED BEFORE THE MARKET EXISTS, or A11 refuses the market for being older than the
         Start and the walk would answer BEFORE_SCOPE — a green pair of assertions below measuring nothing. */
      const b5 = await botWith({}, rules);
      const fresh = await pollAt({ closeInMs: 5 * 3_600_000 });
      /**
       * ⛔ SCOPE IS A PRECONDITION HERE, NOT THE SUBJECT, SO IT IS SET RATHER THAN INHERITED.
       * 🔴 MEASURED 2026-09-23: run §17 ALONE — which is exactly what a red drive does — and the global scope
       * start restored two lines above resolves to NOW, so every market including this one answers
       * BEFORE_SCOPE, `wouldStake` is 0, and BOTH assertions below measure nothing while still reading green
       * in a full-suite run. That is how this pair first passed: on state an earlier section happened to
       * leave behind. A case that only works in one ordering is not a case.
       * ⛔ IT DOES NOT WEAKEN THEM: what is asserted is that the WALK agrees with the PLANNER and writes
       * nothing. Scope decides whether either has anything to look at, so it is arranged, not measured — and
       * 7.34a already holds BEFORE_SCOPE itself, on the pure planner, where it belongs.
       */
      const scopeAt = new Date((await dbNow()) - 3_600_000).toISOString();
      await S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.global, { scopeFrom: scopeAt });
      await S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.bot(b5.botId), { scopeFrom: scopeAt });
      const intentsBefore = (await S.houseBotIntentStore.listLiveOnMarket(fresh.id)).length;
      const seen: Any = await safe(async () => PL.explainBotIdle(b5.botId, { limit: 50 }));
      const drawAfter = await S.houseBotEventStore.findOpenerDraw(fresh.id);
      const intentsAfter = (await S.houseBotIntentStore.listLiveOnMarket(fresh.id)).length;
      ok("17.53a · the walk reaches the planner's own verdict: it considers the open markets and counts the ones this account WOULD stake on right now",
        seen != null && seen.considered > 0 && seen.wouldStake > 0,
        j({ considered: seen?.considered, wouldStake: seen?.wouldStake, looked: seen?.looked, byCode: seen?.byCode }));
      ok("17.53b · ⛔ …AND IT WRITES NOTHING: no intent appears on the market it just judged stakeable, and no OPENER DRAW is minted",
        intentsAfter === intentsBefore && drawAfter == null, j({ intentsBefore, intentsAfter, draw: drawAfter }));
      /* ⛔ AND THE CONTROL, because "wrote nothing" passes just as well on a walk that found NOTHING: the very
         same account over the very same market, walked by the PLANNER, writes both. */
      const r6 = await safe(async () => PL.planFillAndOpener(await dbNow(), ctxOf().state, control, [await parsedOf(b5.botId)], { randomInt: minDraw, drawRandomInt: () => 1 }));
      ok("17.53c · CONTROL · the PLANNER over that same account and market writes both the intent and the draw the walk declined to write — so 17.53b is absence, not emptiness",
        (await S.houseBotIntentStore.findByAnchor("OPENER", fresh.id)) != null && (await S.houseBotEventStore.findOpenerDraw(fresh.id)) != null, j(r6));
    }

    await w.switchOff();
    const off = await safe(() => PL.plannerPass(ctxOf(), { alerts: recorder().alerts, liveBounds: async () => ({ minStake: 1_000, maxStake: 10_000_000, refillPerMin: 10 }) }));
    await w.switchOn();
    ok("17.54 · P:500 · with the master OFF the pass skips FILL/OPENER planning", off?.duties?.fillOpener === "skipped", j(off?.duties));
    for (const id of [fill?.id, opener?.id]) if (id) await S.houseBotIntentStore.cancelPending(id, "BOT_NOT_ACTIVE");
  }

  /* ── 17.55 the scan, the anchor-scoped insert and switch-on's scope start (rulings 91, 92, 97) ── */
  {
    const b = await botWith();
    const a = await pollAt({ closeInMs: 30 * 3_600_000 });
    const c = await pollAt({ closeInMs: 30 * 3_600_000 + 1_000 });
    const demo = await pollAt({ closeInMs: 30 * 3_600_000 + 500, title: "Demo · planner" });
    const cancelled = await pollAt({ closeInMs: 30 * 3_600_000 + 2_000 });
    const vetoed = await pollAt({ closeInMs: 30 * 3_600_000 + 3_000 });
    const oc = await insert(rowOf(b, cancelled.id, { kind: "OPENER" }));
    await S.houseBotIntentStore.cancelPending(oc.id, "BOT_NOT_ACTIVE");
    const ov = await insert(rowOf(b, vetoed.id, { kind: "OPENER" }));
    await S.houseBotIntentStore.cancelPending(ov.id, "CANCELLED_BY_ADMIN");
    const fromIso = new Date(Date.parse(a.selectionClosedAt) - 1).toISOString();
    const toIso = vetoed.selectionClosedAt;
    const page = await safe(() => S.houseSeamStore.plannableMarkets({ kind: "OPENER", productLine: "MARKET", fromIso, toIso, after: null, limit: 200 }));
    const ids = Array.isArray(page) ? page.map((r: Any) => r.id) : [];
    ok("17.55 · the scan lists in-scope empty polls in cutoff order, re-lists a plain CANCELLED opener, and leaves out a demo and an officer's cancel (02 X11)",
      j(ids) === j([a.id, c.id, cancelled.id]), j({ page, want: [a.id, c.id, cancelled.id] }));
    const next = await safe(() => S.houseSeamStore.plannableMarkets({ kind: "OPENER", productLine: "MARKET", fromIso, toIso, after: page[0], limit: 200 }));
    ok("17.56 · keyset: after the first row the page starts at the second", Array.isArray(next) && next[0]?.id === c.id, j(next));
    await lockYes(c.id, 1_000);
    const again = await safe(() => S.houseSeamStore.plannableMarkets({ kind: "OPENER", productLine: "MARKET", fromIso, toIso, after: null, limit: 200 }));
    ok("17.57 · a poll with money in it is no longer an OPENER candidate", Array.isArray(again) && !again.some((r: Any) => r.id === c.id), j(again));
    const trig = `pos_hb_anchor_${process.pid}`;
    const first = await safe(() => S.houseBotIntentStore.insertIgnoringConflict(rowOf(b, a.id, { kind: "COUNTER", anchorKey: trig, triggerPositionId: trig, triggerUserId: WORLD_OFFICER, status: "SKIPPED", reasonCode: "NOT_REACTING", finishedAt: w.iso() })));
    const dup = await safe(() => S.houseBotIntentStore.insertIgnoringConflict(rowOf(b, a.id, { kind: "COUNTER", anchorKey: trig, triggerPositionId: trig, triggerUserId: WORLD_OFFICER, status: "SKIPPED", reasonCode: "NOT_REACTING", finishedAt: w.iso() })));
    const idClash = await safe(() => S.houseBotIntentStore.insertIgnoringConflict(rowOf(b, a.id, { id: first?.id, kind: "COUNTER", anchorKey: `${trig}_b`, triggerPositionId: `${trig}_b`, triggerUserId: WORLD_OFFICER, status: "SKIPPED", reasonCode: "NOT_REACTING", finishedAt: w.iso() })));
    const manual = await safe(() => S.houseBotIntentStore.insertIgnoringConflict(rowOf(b, a.id, { kind: "MANUAL", entryCondition: "THIN", requestedById: WORLD_OFFICER, anchorKey: K.manualAnchorKey(WORLD_OFFICER, crypto.randomUUID()) })));
    ok("17.58 · ruling 97 · a second decision on the same trigger → null (already decided)", first?.id != null && dup === null, j({ first: first?.id ?? first, dup }));
    ok("17.59 · …but an id clash is a defect and raises (TGT-26(e)), and a MANUAL row is refused", typeof idClash?.threw === "string" && typeof manual?.threw === "string", j({ idClash, manual }));
    await w.switchOff();
    // Plant an hour-old scope start first, so only THIS switch-on can have moved it (mutation P32 once passed on a
    // value an earlier case had written a moment before).
    await S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.global, { scopeFrom: w.iso(-3_600_000) });
    const beforeOn = await dbNow();
    await w.switchOn();
    const gl: Any = await S.houseBotRuntimeStore.get(K.RUNTIME_KEY.global);
    ok("17.60 · ruling 92 · switch-on writes global scopeFrom in the same step (an hour-old value is replaced by the switch-on instant)",
      gl?.scopeFrom != null && Date.parse(gl.scopeFrom) >= beforeOn, j({ scopeFrom: gl?.scopeFrom, beforeOn: new Date(beforeOn).toISOString() }));
  }

  /* ── 17.61 hourly summaries (rulings 80–81) ── */
  {
    const b = await botWith();
    const placedRow = await insert(rowOf(b, (await pollAt()).id, { status: "PLACED", positionId: `pos_hb_sum_${process.pid}`, finishedAt: w.iso(), alertedAt: w.iso(), attempts: 1 }));
    const control = await S.houseBotControlStore.get();
    const rec = recorder();
    // The window is the hour just ended at `nowMs`: an hour ahead of the database clock makes it the current hour.
    const h1 = await safe(async () => PL.hourlyDuties((await dbNow()) + 3_600_000, { ...control, bellAlertsPerHour: 0 }, rec.alerts));
    const h2 = await safe(async () => PL.hourlyDuties((await dbNow()) + 3_600_000, { ...control, bellAlertsPerHour: 0 }, rec.alerts));
    const admins = rec.calls.filter((c) => c.code === "HOUR_SUMMARY_ADMINS");
    const holder = rec.calls.filter((c) => c.code === "HOUR_SUMMARY_HOLDER" && c.m.botId === b.botId);
    const prevHour = CLOCK.eatKeyFor("previousHour", await dbNow());
    ok("17.61 · admins' summary once, keyed on the hour summarised (previousHour), beyond a 0 cap", !placedRow.threw && admins.length === 1 && admins[0].key === `summary:admins:all:${prevHour}` && admins[0].m.detail.beyondCap >= 1, j({ h1, h2, admins }));
    // D19c, C4 ruling 149: the holder is never told, so the planner raises no holder summary — the PLACED stake above
    // keeps this discriminating (the removed loop raised one for exactly this row).
    ok("17.62 · D19c · no holder summary is raised for the holder's PLACED stake", holder.length === 0 && rec.calls.every((c) => c.code !== "HOUR_SUMMARY_HOLDER"), j(rec.calls.map((c) => c.code)));
  }

  /* ── 17.63 oversight (N1 §4.5; ruling 79) ── */
  {
    const b = await botWith();
    const quiet = await pollAt();
    const q = await insert(rowOf(b, quiet.id, { kind: "MANUAL", entryCondition: "THIN", requestedById: WORLD_OFFICER, anchorKey: K.manualAnchorKey(WORLD_OFFICER, crypto.randomUUID()), status: "PLACED", positionId: `pos_hb_ov1_${process.pid}`, finishedAt: w.iso(-5_000), alertedAt: w.iso(), attempts: 1, staleAt: w.iso(10_000) }));
    await stamp(quiet.id, { status: "VOIDED" });
    const decided = await pollAt();
    const d = await insert(rowOf(b, decided.id, { kind: "MANUAL", entryCondition: "THIN", requestedById: WORLD_OFFICER, anchorKey: K.manualAnchorKey(WORLD_OFFICER, crypto.randomUUID()), status: "PLACED", positionId: `pos_hb_ov2_${process.pid}`, finishedAt: w.iso(-5_000), alertedAt: w.iso(), attempts: 1, staleAt: w.iso(10_000) }));
    await AUD.audit({ category: "COMPLIANCE", action: "market.emergency_void", actorId: WORLD_OFFICER, targetType: "Market", targetId: decided.id, payload: { reason: "planner case" } });
    await stamp(decided.id, { status: "VOIDED" });
    const rec = recorder();
    const o1 = await safe(async () => OV.oversightPass(rec.alerts, await dbNow()));
    const o2 = await safe(async () => OV.oversightPass(rec.alerts, await dbNow()));
    const vQuiet = rec.calls.filter((c) => c.key === `staff-stake-voided:${quiet.id}`);
    const vDecided = rec.calls.filter((c) => c.key === `staff-stake-voided:${decided.id}`);
    const self = rec.calls.filter((c) => c.key === `staff-stake-self-decided:${decided.id}:voided`);
    ok("17.63 · a voided poll holding a staff-chosen stake → ONE staff-stake-voided alert over two passes", !q.threw && vQuiet.length === 1, j({ o1, o2, q: q.threw }));
    ok("17.64 · ruling 79 · no void audit → the alert carries NO time (never the moment the pass noticed)", vQuiet[0]?.m.detail.atIso === null, j(vQuiet[0]?.m.detail));
    ok("17.65 · …with the emergency-void audit → its time", !d.threw && vDecided.length === 1 && typeof vDecided[0].m.detail.atIso === "string", j(vDecided[0]?.m.detail));
    ok("17.66 · the officer who chose the stake also voided the market → ONE staff-stake-self-decided:<market>:voided (a record, nothing refused)", self.length === 1 && self[0].m.detail.actorId === WORLD_OFFICER, j(self));
    ok("17.67 · bulkMarketIds reads the batch's resolved list only", j(OV.bulkMarketIds({ selection: ["a", "b"], resolved: ["b"] })) === j(["b"]));
  }

  /* ── 17.66b oversight through the ONE requester rule (C5-SPEC ruling 178): a targeted stake's requester is the officer
     who ADDED the target, never the officer who later updated it ── */
  {
    const b = await botWith();
    const m = await pollAt();
    const adder = await w.user({ role: "ADMIN" }), updater = await w.user({ role: "ADMIN" });
    const t = await target(b, m.id, { createdById: adder });
    const upd = !t.threw ? await safe(() => S.targetStore.casUpdate(t.id, t.version, { delayMaxSec: 20 }, updater)) : t;
    const trigger = `pos_hb_ovt_${process.pid}`;
    const s = await insert(rowOf(b, m.id, { kind: "COUNTER", anchorKey: trigger, triggerPositionId: trigger, triggerUserId: null, targetId: t.id, status: "PLACED",
      positionId: `pos_hb_ovt_placed_${process.pid}`, finishedAt: w.iso(-5_000), alertedAt: w.iso(), attempts: 1, staleAt: w.iso(10_000) }));
    // The updater resolves first (not a requester: no alert), then the adder voids (the requester: one alert).
    await AUD.audit({ category: "ADMIN", action: "market.adjudicated", actorId: updater, targetType: "Market", targetId: m.id, payload: { outcome: "YES" } });
    await AUD.audit({ category: "COMPLIANCE", action: "market.emergency_void", actorId: adder, targetType: "Market", targetId: m.id, payload: { reason: "planner case" } });
    const rec = recorder();
    const o = await safe(async () => OV.oversightPass(rec.alerts, await dbNow()));
    const resolved = rec.calls.filter((c) => c.key === `staff-stake-self-decided:${m.id}:resolved`);
    const voided = rec.calls.filter((c) => c.key === `staff-stake-self-decided:${m.id}:voided`);
    ok("17.66b · ruling 178 · the officer who only UPDATED the target decides the market → no self-decided alert",
      !t.threw && upd?.ok === true && upd.row?.updatedById === updater && !s.threw && !o.threw && resolved.length === 0, j({ o, upd: upd?.ok, s: s.threw, resolved }));
    ok("17.66c · …the officer who ADDED the target decides it → ONE alert, requestedBy exactly [the adder]",
      voided.length === 1 && voided[0].m.detail.actorId === adder && j(voided[0].m.detail.requestedBy) === j([adder]), j(voided.map((c) => c.m.detail)));
  }

  /* ── 17.68 cap pre-check (ruling 94) ── */
  {
    const facts = (o: Any = {}) => merge({
      bot: { stakeMinTzs: 1_000, stakeMaxTzs: 10_000, capPerMarketTzs: 50_000, balanceFloorTzs: 0, capDailyStakeTzs: 1e6, capDailyLossTzs: 1e6, capOpenExposureTzs: 1e6, capStaffChosenPerDay: 5, capStaffChosenDailyTzs: 1e6 },
      control: { gCapPerMarketTzs: 1e6, gCapDailyStakeTzs: 1e7, gCapDailyLossTzs: 1e7, gCapOpenExposureTzs: 1e7, gCounterPerPlayerPerDay: 3, gCounterPerPlayerTzsPerDay: 1e6, gCapStaffChosenPerDay: 10, gCapStaffChosenDailyTzs: 1e7 },
      balance: 100_000, stakeOnMarket: 0, stakedToday: 0, projectedLossToday: 0, openExposure: 0, houseOnMarket: 0, globalStakedToday: 0,
      globalProjectedLossToday: 0, globalExposure: 0, staffChosen: null, counterparty: null,
    }, o);
    ok("17.68 · generous facts → no cap refuses", CAPS.capPrecheck(facts(), 1_000) === null);
    ok("17.69 · an unset minimum refuses first (CAP_STAKE_MIN), as H2 does", CAPS.capPrecheck(facts({ bot: { stakeMinTzs: null } }), 1_000) === "CAP_STAKE_MIN");
    ok("17.70 · the seam's order: the bot's PER_MARKET before the global per-market cap", CAPS.capPrecheck(facts({ stakeOnMarket: 49_500, houseOnMarket: 1e6 }), 1_000) === "CAP_PER_MARKET");
    ok("17.71 · a balance floor that the stake would break → CAP_BALANCE_FLOOR", CAPS.capPrecheck(facts({ balance: 1_500, bot: { balanceFloorTzs: 1_000 } }), 1_000) === "CAP_BALANCE_FLOOR");
    ok("17.72 · staff-chosen caps bind only staff-chosen rows", CAPS.capPrecheck(facts({ bot: { capStaffChosenPerDay: null } }), 1_000) === null
      && CAPS.capPrecheck(facts({ bot: { capStaffChosenPerDay: null }, staffChosen: { count: 0, tzs: 0, globalCount: 0, globalTzs: 0 } }), 1_000) === "CAP_STAFF_CHOSEN_PER_DAY");
    ok("17.73 · a COUNTER's trigger account at its daily count → CAP_COUNTERPARTY_COUNT", CAPS.capPrecheck(facts({ counterparty: { count: 3, tzs: 0 } }), 1_000) === "CAP_COUNTERPARTY_COUNT");
  }

  /* ── 17.74 the consent void's TARGET_ENDED payload (ruling 76) and fire with limits from a newer build (ruling 100) ── */
  {
    const b = await botWith({ targetsMaxActive: 5 });
    const m = await pollAt();
    const t = await target(b, m.id);
    const v = await safe(() => DSG.voidHouseConsent({ userId: b.userId, cause: "SELF_EXCLUDED", actorId: null }));
    const evs = (await S.houseBotEventStore.listByKinds(["TARGET_ENDED"], { marketId: m.id, limit: 5 })) as Any[];
    ok("17.74 · a consent void ends the target with payload {targetId, endCause: CONSENT_VOID} — never `cause`",
      !t.threw && evs.length === 1 && evs[0].payload?.endCause === "CONSENT_VOID" && !("cause" in (evs[0].payload ?? {})), j({ v, evs }));
  }
  if (w.onPostgres) {
    const b = await botWith();
    const m = await pollAt();
    await lockYes(m.id);
    const i = await w.intent(b, m.id, { kind: "FILL", side: "NO", stakeTzs: 2_000 });
    let out: Any;
    try {
      await w.prisma().$executeRawUnsafe(`UPDATE "HouseBotControl" SET "limitsSchemaVersion" = "limitsSchemaVersion" + 1`);
      out = await safe(() => FI.fireClaimedIntent(i, { me: "world", alerts: recorder().alerts }));
    } finally {
      await w.prisma().$executeRawUnsafe(`UPDATE "HouseBotControl" SET "limitsSchemaVersion" = "limitsSchemaVersion" - 1`);
    }
    const r: Any = await row(i.id);
    ok("17.75 · F4 · limits saved by a newer build (Postgres): fire places nothing and hands the row back PENDING", out?.kind === "requeued" && r.status === "PENDING" && (await w.positionsOf(m.id)).every((p: Any) => p.houseBotId == null), j({ out, status: r.status }));
    await S.houseBotIntentStore.cancelPending(i.id, "BOT_NOT_ACTIVE");
  }
});

/* ── 17.76 the P3 purge loops past one batch (ruling 86) — Postgres: only SQL can age a throttle row 31 days ── */
await guard("17", async () => {
  if (!onPostgres) return;
  const RET: Any = await import("../../src/lib/server/retention.ts");
  const P = prisma();
  const tag = `case:ret:${process.pid}`;
  await P.$executeRawUnsafe(`INSERT INTO "HouseBotAlertOnce" ("key", "createdAt") SELECT $1::text || ':' || g::text, now() - interval '31 days' FROM generate_series(1, 5001) g`, tag);
  await P.$executeRawUnsafe(`INSERT INTO "HouseBotAlertOnce" ("key") VALUES ($1::text)`, `${tag}:young`);
  let r: Any;
  try { r = await RET.runRetentionPass(); } catch (e) { r = { threw: String((e as Error)?.message ?? e) }; }
  const left = (await P.$queryRawUnsafe(`SELECT count(*)::int AS "n" FROM "HouseBotAlertOnce" WHERE "key" LIKE $1::text`, `${tag}:%`)) as Any[];
  ok("17.76 · ruling 86 · 5,001 throttle rows past 30 days are purged in ONE nightly run (two batches of 5,000); the young row stays",
    (r?.houseBotAlertOncePurged ?? 0) >= 5_001 && left[0]?.n === 1, j({ purged: r?.houseBotAlertOncePurged, threw: r?.threw, left }));
});

/* ── 17.507 X1's DUTY-NAME HALF — the planner's failed duties, DURABLE (PROGRESS X1; replan rulings 507, 549) ──
 * "Today a stuck summary or a failed loss check is only in the server log; the strip would say it in plain words."
 * The pass has always KNOWN which duty failed — `out.duties[name]` is "ok", "skipped" or "failed: <message>" — and
 * that knowledge died with the tick. It now rides the heartbeat row's own `extra` field, key-scoped exactly as
 * `beatAt` is, so `beat:planner` carries the PLANNER's facts the way `beat:poller:<instance>` carries that
 * instance's claim failures (A24, `worker.ts`).
 * ⛔ NAMES ONLY, NEVER THE MESSAGE: a duty's error text is an arbitrary database or vendor string and can name a
 * bot, a market or an account, and a console surface reads this row.
 * ⛔ AND A FAILED MONEY DUTY STILL DOES NOT BEAT (ruling 98) — the record is written through `upsert`. */
await guard("17", async () => {
  const w = await loadWorld();
  if (!(await w.db.user.findById(WORLD_OFFICER))) await w.user({ id: WORLD_OFFICER, role: "ADMIN" });
  await w.limits();
  await w.switchOn();
  const S = HDAL;
  const PLK = K.RUNTIME_KEY.plannerBeat;
  const quiet = {
    placed: async () => {}, once: async () => {}, security: async () => {},
    botStopped: async () => {}, switchedOff: async () => {},
  };
  const bounds = async () => ({ minStake: 1_000, maxStake: 10_000_000, refillPerMin: 10 });
  const ctx = () => ({ state: { ...EN2.engineState(), planner: { oversightAtMs: null, hourlyKey: null, scan: {} } }, instanceId: `hb-test-x1-${process.pid}` });
  const runPass = async (): Promise<Any> => { try { return await PL.plannerPass(ctx(), { alerts: quiet, liveBounds: bounds }); } catch (e) { return { threw: String((e as Error)?.message ?? e) }; } };
  const failedOf = (p: Any): string[] => Object.entries(p?.duties ?? {}).filter(([, v]) => String(v).startsWith("failed:")).map(([n]) => n);
  const mirrors = (p: Any, row: Any): boolean => {
    const f = failedOf(p);
    return row?.pollerErrorCode === (f.length > 0 ? f.join(",") : null);
  };

  /* (1) a NON-money duty fails: the pass still beats, and the row names the duty. */
  const realRepair = S.houseBotIntentStore.listAlertRepair;
  let withNonMoney: Any, rowNonMoney: Any;
  try {
    S.houseBotIntentStore.listAlertRepair = async () => { throw new Error("alert repair read exploded"); };
    withNonMoney = await runPass();
    rowNonMoney = await S.houseBotRuntimeStore.get(PLK);
  } finally {
    S.houseBotIntentStore.listAlertRepair = realRepair;
  }
  ok("17.507a · ⭐ X1 · a NON-money duty that fails is named on the planner's own heartbeat row, and the pass still BEATS — which is exactly X1's 'Summaries delayed' case",
    failedOf(withNonMoney).includes("alertRepair") && withNonMoney?.beat === true
      && String(rowNonMoney?.pollerErrorCode).split(",").includes("alertRepair") && rowNonMoney?.beatAt != null && rowNonMoney?.pollerErrorAt != null,
    j({ duties: withNonMoney?.duties, row: rowNonMoney && { code: rowNonMoney.pollerErrorCode, at: rowNonMoney.pollerErrorAt, beatAt: rowNonMoney.beatAt } }));
  ok("17.507b · …and it is the NAME, never the message — the row carries only members of the closed DutyName list, so a database string that named a bot, a market or an account could never reach a console surface through it",
    String(rowNonMoney?.pollerErrorCode ?? "").split(",").every((n: string) => /^[A-Za-z]+$/.test(n))
      && !String(rowNonMoney?.pollerErrorCode ?? "").includes("exploded"),
    j({ code: rowNonMoney?.pollerErrorCode }));
  ok("17.507c · CONTROL · the row MIRRORS this pass's own duties map — so the value above was produced by the pass under test and not left behind by an earlier one",
    mirrors(withNonMoney, rowNonMoney), j({ failed: failedOf(withNonMoney), code: rowNonMoney?.pollerErrorCode }));

  /* (2) a MONEY duty fails: the duty is recorded and NO beat is written (ruling 98 + A24's own law). */
  const beatBefore = (await S.houseBotRuntimeStore.get(PLK))?.beatAt ?? null;
  const realDeadline = S.houseBotIntentStore.expirePastDeadline;
  let withMoney: Any, rowMoney: Any;
  try {
    S.houseBotIntentStore.expirePastDeadline = async () => { throw new Error("deadline sweep exploded"); };
    withMoney = await runPass();
    rowMoney = await S.houseBotRuntimeStore.get(PLK);
  } finally {
    S.houseBotIntentStore.expirePastDeadline = realDeadline;
  }
  ok("17.507d · ⛔ a MONEY duty that fails is recorded on the row and writes NO beat — a pass that failed must never look alive, which is the whole reason this record does not ride beat()",
    failedOf(withMoney).includes("deadline") && withMoney?.beat !== true
      && String(rowMoney?.pollerErrorCode).split(",").includes("deadline") && (rowMoney?.beatAt ?? null) === beatBefore,
    j({ failed: failedOf(withMoney), beat: withMoney?.beat, beatBefore, beatAfter: rowMoney?.beatAt, code: rowMoney?.pollerErrorCode }));
  ok("17.507e · CONTROL · the beat really could have moved — the pass before this one wrote one, so an unchanged beatAt is a measurement and not an absent writer",
    beatBefore != null, j({ beatBefore }));

  /* (3) the clean pass: nothing failed, so the row says nothing failed. A record that only ever GROWS would report
   * a duty that recovered an hour ago as still broken, which is the stale-verdict class this programme pays for. */
  const clean = await runPass();
  const rowClean: Any = await S.houseBotRuntimeStore.get(PLK);
  ok("17.507f · a pass whose duties all held clears the record — the row mirrors the pass, so a duty that recovered is not reported as still broken",
    mirrors(clean, rowClean) && (failedOf(clean).length > 0 || rowClean?.pollerErrorCode === null),
    j({ failed: failedOf(clean), code: rowClean?.pollerErrorCode }));
});

/* ═══ §18 · the trigger: the post-commit hook and the sweep (PLAN §4.3, 04 A11, A12, A21, A24, R5, N2 §4; C4-SPEC rulings 90–110, 114–115) ═══ */
section("§18 · trigger.ts — the bet hook and the sweep");
const TG: Any = await import("../../src/lib/server/house-bot/trigger.ts");
const ADM18: Any = await import("../../src/lib/server/admission.ts");
if (STORE === "memory") {
  await guard("18", async () => {
    // ── source pins: the call site (rulings 101–102) and the trigger's imports (N1 §3, ruling 108) ──
    const svc = readFileSync(join(ROOT, "src/lib/server/market-service.ts"), "utf8").replace(/\r\n/g, "\n");
    const seamAt = svc.indexOf("// SEAM:trigger");
    const end = seamAt >= 0 ? svc.indexOf("\n    }\n", seamAt) : -1;
    const block = seamAt >= 0 && end > seamAt ? svc.slice(seamAt, end) : "";
    const cond = block.split("\n")[1] ?? "";
    ok("18.1 · ruling 101 · one // SEAM:trigger block; its condition is a player's Up & Down stake, the engine switch read in it",
      svc.split("// SEAM:trigger").length === 2
        && /^\s*if \(ctx\.kind === "player" && market\.productLine === "UPDOWN" && process\.env\[HOUSE_BOT_ENGINE_ENV\] !== "false"\) \{$/.test(cond), j(cond));
    const envAt = block.indexOf("process.env[HOUSE_BOT_ENGINE_ENV]");
    const importAt = block.indexOf('import("./house-bot/trigger")');
    const exitAt = block.indexOf("runOutsideAdmission(() => runOutsideLock(() => {");
    ok("18.2 · A24/R6 · the env check precedes the dynamic import, which runs inside runOutsideAdmission(() => runOutsideLock(…)); nothing awaited",
      envAt >= 0 && importAt > envAt && exitAt > envAt && exitAt < importAt && !/\bawait\b/.test(block), j(block));
    const committedAt = svc.indexOf("if (result.ok && committed) {");
    const standingAt = svc.indexOf("const standing = await readIdentityStanding(userId);");
    const auditAt = svc.indexOf('action: "market.position.opened"');
    const recruitAt = svc.indexOf("// SEAM:recruit");
    ok("18.3 · the hook sits under the committed guard and after the position audit (never between readIdentityStanding and it), before the recruit accrual",
      committedAt > 0 && standingAt > committedAt && auditAt > standingAt && seamAt > auditAt && recruitAt > seamAt, j({ committedAt, standingAt, auditAt, seamAt, recruitAt }));
    const facts = block.match(/const facts = \{([^}]*)\}/)?.[1] ?? "";
    ok("18.4 · ruling 101 · the call passes only facts the block already holds",
      j(facts.split(",").map((s) => s.split(":")[0].trim()).filter(Boolean)) === j(["positionId", "userId", "marketId", "side", "stake", "placedAt"]), facts);
    const tsrc = decomment(readFileSync(join(ROOT, "src/lib/server/house-bot/trigger.ts"), "utf8"));
    ok("18.5 · N1 §3 · trigger.ts never loads fire.ts, the house bet function or oversight.ts, and is a pinned importer of blackout.ts",
      !/from "\.\/fire"|placeHouseBet|from "\.\/oversight"/.test(tsrc) && /from "\.\/blackout"/.test(tsrc));
    ok("18.6 · ruling 108 · the trigger times a targeted row only through targetDueAt (no lock-margin arithmetic of its own)",
      /targetDueAt\(/.test(tsrc) && !/LOCK_MARGIN_MS/.test(tsrc));

    // ── pure: the staff-chosen room (ruling 94), the lease check (103), the admission exit (102) ──
    const tgtRoom = { targetId: "hbt_r", houseBotId: "hb_a", delayMinSec: 10, delayMaxSec: 10, timingFrom: "STAKE", reactTo: "EVERY", effectiveFrom: at(-100), drawnDelaySec: 10, lockedAtDue: 10_000 };
    const roomed = DE.decideCounter(ctrIn({ target: { ...tgtRoom, staffChosenRoomTzs: 3_000 } }), { randomInt: minRand });
    ok("18.7 · N2 §4 step 6 · a targeted stake is clamped to the staff-chosen TZS left today (asked 8,000 → 3,000)",
      roomed.row?.targetId === "hbt_r" && roomed.row.status === "PENDING" && roomed.row.stakeTzs === 3_000, j(roomed.row));
    const unknown = DE.decideCounter(ctrIn({ target: { ...tgtRoom } }), { randomInt: minRand });
    ok("18.8 · …a missing room figure fails closed: no targeted stake (SKIPPED STAKE_BELOW_MIN naming the target)",
      unknown.row?.status === "SKIPPED" && unknown.row.reasonCode === "STAKE_BELOW_MIN" && unknown.row.targetId === "hbt_r", j(unknown.row));
    const skipLow = DE.decideCounter(ctrIn({ filtered: "PENALTY_BOX" }), { randomInt: minRand });
    const skipHigh = DE.decideCounter(ctrIn({ filtered: "PENALTY_BOX", bots: [botOf({ stakeMinTzs: 5_000 })] }), { randomInt: minRand });
    ok("18.8b · ruling 120 · a row decided NOT to react records the smallest stake the bot could place (max(1, stakeMin, live min)), never 0",
      skipLow.row?.status === "SKIPPED" && skipLow.row.stakeTzs === 1_000 && skipHigh.row?.stakeTzs === 5_000, j({ low: skipLow.row?.stakeTzs, high: skipHigh.row?.stakeTzs }));
    ok("18.9 · ruling 103 · the sweep runs only under a held, unexpired planner lease",
      EN2.holdsPlannerLease({ "house-bot": { holder: "this instance", isMe: true, expiresInSec: 30 } })
        && !EN2.holdsPlannerLease({ "house-bot": { holder: "hb-other", isMe: false, expiresInSec: 30 } })
        && !EN2.holdsPlannerLease({ "house-bot": { holder: "this instance", isMe: true, expiresInSec: 0 } })
        && !EN2.holdsPlannerLease({ lifecycle: { holder: "this instance", isMe: true, expiresInSec: 30 } }) && !EN2.holdsPlannerLease({}));
    const inside = await ADM18.withAdmission(async () => [ADM18.inAdmission(), ADM18.runOutsideAdmission(() => ADM18.inAdmission())]);
    ok("18.10 · ruling 102 · runOutsideAdmission leaves the slot (inside true, escaped false)", j(inside) === j([true, false]), j(inside));
    const nested = await L.withLock(`hb-test:trigger:${process.pid}`, async () => ADM18.withAdmission(async () =>
      ADM18.runOutsideAdmission(() => L.runOutsideLock(() => [L.inLock(), L.currentLockTx() != null, ADM18.inAdmission()]))));
    ok("18.11 · …nested with runOutsideLock inside a lock and a slot: no lock, no lock transaction, no slot", j(nested) === j([false, false, false]), j(nested));

    // ── the hook's gates (rulings 109–110) ──
    const quiet = { placed: async () => {}, once: async () => {}, security: async () => {}, botStopped: async () => {}, switchedOff: async () => {} };
    const bet = { positionId: "pos_hook_x", userId: "usr_hook_x", marketId: "mkt_hook_x", side: "YES", stake: 1_000, placedAt: new Date().toISOString() };
    const stOf = (o: Any = {}, hook: Any = {}) => ({ ...EN2.engineState(), started: true, stopping: false, skewMs: 0, inFlight: new Map(), ...o, hook: { inFlight: 0, dropped: 0, cache: null, alerts: quiet, ...hook } });
    ok("18.12 · ruling 109 · an engine that has not started, or has no alert channel, leaves the stake to the sweep",
      (await TG.onPlayerBetCommitted(bet, { state: stOf({ started: false }) })) === "notStarted" && (await TG.onPlayerBetCommitted(bet, { state: stOf({}, { alerts: null }) })) === "notStarted");
    ok("18.13 · N2 §4 step 1 · skew unknown or over 5 s → suspended",
      (await TG.onPlayerBetCommitted(bet, { state: stOf({ skewMs: null }) })) === "skew" && (await TG.onPlayerBetCommitted(bet, { state: stOf({ skewMs: 5_001 }) })) === "skew");
    const full = stOf({}, { inFlight: K.HOOK_SEMAPHORE });
    const dropped = await TG.onPlayerBetCommitted(bet, { state: full });
    ok("18.14 · A24 · at HOOK_SEMAPHORE calls the next is dropped and counted; health reports hookDropped (a count, no ids)",
      dropped === "dropped" && full.hook.dropped === 1 && full.hook.inFlight === K.HOOK_SEMAPHORE && EN2.houseBotEngineHealth(full).hookDropped === 1, String(dropped));
    ok("18.15 · PLAN §4.3 · a fresh soft cache with no ACTIVE bot and no holder → idle",
      (await TG.onPlayerBetCommitted(bet, { state: stOf({}, { cache: { atMs: Date.now(), live: false, holderIds: new Set() } }) })) === "idle");
    const broken = stOf();
    const failed = await TG.onPlayerBetCommitted(null, { state: broken });
    ok("18.16 · a hook that throws answers `failed` — never a throw to the bet — and gives its semaphore slot back", failed === "failed" && broken.hook.inFlight === 0, String(failed));
    globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined;
    const fresh18 = EN2.engineState();
    ok("18.17 · ruling 110 · a fresh engine state: hook 0 in flight, 0 dropped, no channel; the sweep timer unarmed",
      fresh18.hook.inFlight === 0 && fresh18.hook.dropped === 0 && fresh18.hook.alerts === null && fresh18.timers.sweep === null && EN2.houseBotEngineHealth(fresh18).hookDropped === 0);
  });
}

await guard("18", async () => {
  const w = await loadWorld();
  if (!(await w.db.user.findById(WORLD_OFFICER))) await w.user({ id: WORLD_OFFICER, role: "ADMIN" });
  await w.limits();
  await w.ageHouseMinute();
  const S = HDAL;
  const msg = (e: unknown) => String((e as Error)?.message ?? e);
  // Every call the mutations can make throw is caught and asserted (E25's lesson).
  const safe = async (fn: () => Promise<Any>): Promise<Any> => { try { return await fn(); } catch (e) { return { threw: msg(e) }; } };
  const dbNow = async (): Promise<number> => (await S.houseBotRuntimeStore.dbClock()).nowMs;
  const pauseAll = async () => {
    for (const b of (await S.houseBotStore.listNonRemoved()) as Any[]) {
      if (b.status === "ACTIVE") await S.houseBotStore.setStatus(b.id, { from: ["ACTIVE"], to: "AUTO_PAUSED", pauseReason: "UNMAPPED_REFUSAL", pauseDetail: null, pausedFromStatus: "ACTIVE" });
    }
  };
  // Earlier sections leave live rows and ACTIVE bots; only §18's own bot may decide here.
  await S.houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");
  await pauseAll();
  await w.switchOff();
  await w.switchOn();
  // The scope start is planted at T0 and no fixture stake is placed until the DATABASE clock is 7 s past it: a stake aged
  // 6 s is then still in scope, while every earlier section's stake is not.
  const T0 = await dbNow();
  const T0iso = new Date(T0).toISOString();
  const plantScope = () => S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.global, { scopeFrom: T0iso });
  await plantScope();
  while ((await dbNow()) < T0 + 7_000) await sleep(250);

  const trigRules = () => {
    const r: Any = R.DEFAULT_RULES_V1({ stakeBounds: { minTzs: 1_000, maxTzs: 10_000_000 } });
    r.scope.products.polls = true;
    r.scope.categories = ["macro"];
    // 1 is the field's minimum (0 is RULES_INVALID, and an unparseable bot decides nothing — 18.19 guards that).
    r.scope.skipPollsClosingWithinMin = 1;
    r.modes.polls = { counter: true, fill: false, opener: false };
    r.counter.delayMinSec = 10;
    r.counter.delayMaxSec = 10;
    r.counter.reactProbabilityPct = 100;
    r.counter.amount = { kind: "PCT", pct: 50 };
    r.shaping.roundToTzs = 1_000;
    r.shaping.jitterPct = 0;
    r.guards.noReactZonePollsMin = 0;
    r.guards.minTimeToCutoffPollsMin = 1;
    r.targeting = { enabled: true };
    return r;
  };
  /** The one deciding bot: every other bot is paused first; its scope starts at T0. */
  const soloBot = async (o: Any = {}) => {
    await pauseAll();
    const b = await w.bot({ caps: o.caps ?? {}, ...(o.balance != null ? { balance: o.balance } : {}) });
    const cur: Any = await S.houseBotStore.get(b.botId);
    const saved = await S.houseBotStore.saveRules(b.botId, cur.rulesVersion, { rules: o.rules ?? trigRules() });
    if (!saved.ok) throw new Error("§18 fixture: saveRules CAS failed");
    await S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.bot(b.botId), { scopeFrom: T0iso });
    return b;
  };
  /** A player's stake, aged `ageMs` (default 6 s — past the sweep's 5 s filter). */
  const stakeOn = async (marketId: string, side: string, stake = 10_000, o: Any = {}) => {
    const userId = o.userId ?? await w.user({ balance: 1_000_000, ...(o.user ?? {}) });
    const r = await w.svc.buyPosition(userId, { marketId, side, stake, idempotencyKey: crypto.randomUUID() });
    if (!r.ok) throw new Error(`§18 fixture: a stake was refused — ${j(r)}`);
    const age = o.ageMs ?? 6_000;
    if (age > 0) await w.backdate(r.data.positionId, age);
    return { userId: userId as string, positionId: r.data.positionId as string };
  };
  /** A bot's OPEN house stake through the seam (a player's YES must already be locked on the market). */
  const houseStake = async (b: Any, marketId: string, side = "NO", stakeTzs = 2_000) => {
    const i = await w.intent(b, marketId, { kind: "FILL", side, stakeTzs });
    const r = await w.place(b, i);
    if (!r.ok) throw new Error(`§18 fixture: the house stake was refused — ${j(r)}`);
    return r;
  };
  const rowFor = (b: Any, marketId: string) => ({
    id: S.newHouseId("intent"), houseBotId: b.botId, botUserId: b.userId, kind: "FILL", marketId, productLine: "MARKET", anchorKey: marketId,
    triggerPositionId: null, triggerUserId: null, targetId: null, requestedById: null, entryCondition: null, side: "NO", stakeTzs: 2_000,
    dueAt: w.iso(600_000), deadlineAt: w.iso(3_600_000), staleAt: w.iso(1_200_000), status: "PENDING", reasonCode: null, why: null,
    decision: {}, attempts: 0, transientAttempts: 0, nextAttemptAt: null, claimedBy: null, claimedUntil: null, positionId: null, finishedAt: null, alertedAt: null,
  });
  const recorder = () => {
    const calls: Any[] = [];
    const alerts = {
      placed: async (i: Any) => { calls.push({ fn: "placed", id: i.id }); },
      // `adm`/`lock`: where the call ran — L2 proves the live hook runs outside the admission slot and every lock by behaviour.
      once: async (key: string, m: Any) => { calls.push({ fn: "once", key, code: m.code, m, adm: ADM18.inAdmission(), lock: L.inLock() || L.currentLockTx() != null }); },
      security: async (m: Any) => { calls.push({ fn: "security", code: m.code }); },
      botStopped: async (bot: Any, change: Any) => { calls.push({ fn: "botStopped", botId: bot.id, ...change }); },
      switchedOff: async (change: Any) => { calls.push({ fn: "switchedOff", ...change }); },
    };
    return { alerts, calls, keyed: (prefix: string) => calls.filter((c) => c.fn === "once" && String(c.key).startsWith(prefix)) };
  };
  const ctx18 = { state: EN2.engineState(), instanceId: `hb-test-sweep-${process.pid}` };
  const sweep = (alerts: Any, o: Any = {}) => safe(() => TG.sweepPass(ctx18, { alerts, randomInt: (min: number) => min, ...o }));
  const counterOf = (positionId: string) => S.houseBotIntentStore.findByAnchor("COUNTER", positionId) as Promise<Any>;
  const pos = (id: string) => w.mdal.positionStore.get(id) as Promise<Any>;
  const setMarket = async (marketId: string, patch: { status?: string; productLine?: string }) => {
    if (w.onPostgres) {
      if (patch.status) await w.prisma().$executeRawUnsafe(`UPDATE "PredictionMarket" SET "status" = '${patch.status}' WHERE "id" = $1`, marketId);
      if (patch.productLine) await w.prisma().$executeRawUnsafe(`UPDATE "PredictionMarket" SET "productLine" = '${patch.productLine}' WHERE "id" = $1`, marketId);
    } else {
      const m = await w.mdal.marketStore.get(marketId);
      if (patch.status) await w.mdal.marketStore.set({ ...m, status: patch.status });
      if (patch.productLine) (await w.mdal.marketStore.get(marketId)).productLine = patch.productLine;
    }
  };
  /** On Postgres `User.recruitedBy` references `AffiliateAgent.userId`: a holder who recruits is an agent. Memory has no such key. */
  const asAgent = async (userId: string) => {
    if (w.onPostgres) {
      await w.prisma().$executeRawUnsafe(`INSERT INTO "AffiliateAgent" ("id", "userId", "code") VALUES ($1, $2, $3) ON CONFLICT ("userId") DO NOTHING`,
        `aff_hb_${userId}`, userId, `HB${userId.replace(/[^A-Za-z0-9]/g, "").slice(-12)}`);
    }
  };
  /** The facts a pass reads now, so a case can prove the pass DECIDES before it asserts what was not decided. */
  const decidingFor = async (botId: string) => {
    const nowMs = await dbNow();
    const f: Any = await safe(() => TG.loadPassFacts(nowMs, { targets: true }));
    return f?.decide === true && (f.bots as Any[]).some((x) => x.botId === botId);
  };
  const sameFields = (a: Any, b: Any) => !!a && Object.keys(b).length === Object.keys(a).length && Object.keys(b).every((k) => a[k] === b[k]);
  const armedTarget = async (b: Any, marketId: string) => {
    const t = await S.targetStore.insert({ id: S.newHouseId("target"), houseBotId: b.botId, marketId, delayMinSec: 10, delayMaxSec: 10, timingFrom: "STAKE", reactTo: "EVERY",
      createdById: WORLD_OFFICER, snapshot: { titleEn: "House seam poll", category: "macro" } });
    // A fixture of time: armed a minute ago (the insert writes createdAt and effectiveFrom = createdAt + 12 s from DB now()).
    if (w.onPostgres) {
      await w.prisma().$executeRawUnsafe(`UPDATE "HouseBotTarget" SET "createdAt" = "createdAt" - interval '60 seconds', "effectiveFrom" = "effectiveFrom" - interval '60 seconds' WHERE "id" = $1`, t.id);
    } else {
      const mem = (globalThis as Any).__50PICK_HB_TARGETS as Map<string, Any>;
      const cur = mem.get(t.id);
      mem.set(t.id, { ...cur, createdAt: new Date(Date.parse(cur.createdAt) - 60_000).toISOString(), effectiveFrom: new Date(Date.parse(cur.effectiveFrom) - 60_000).toISOString() });
    }
    return t;
  };

  /* ── 18.20 an aged poll stake → one COUNTER; a second pass writes nothing more ── */
  {
    const b = await soloBot();
    ok("18.19 · fixture · §18's bot parses, its scope has started and the pass DECIDES (every negative case below would otherwise pass vacuously)", await decidingFor(b.botId));
    const m = await w.poll();
    const t = await stakeOn(m.id, "YES", 10_000);
    const rec = recorder();
    const p1 = await sweep(rec.alerts);
    const r = await counterOf(t.positionId);
    const p = await pos(t.positionId);
    ok("18.20 · an aged poll stake under a covering bot → ONE PENDING COUNTER on the other side, anchored on the stake",
      !p1.threw && r?.status === "PENDING" && r.houseBotId === b.botId && r.triggerPositionId === t.positionId && r.triggerUserId === t.userId && r.side === "NO" && r.productLine === "MARKET", j({ p1, r }));
    ok("18.21 · …50% of 10,000 = 5,000, due 10 s after the stake (no exit window), stale 600 s after due",
      r?.stakeTzs === 5_000 && Date.parse(r.dueAt) === Date.parse(p.placedAt) + 10_000 && Date.parse(r.staleAt) === Date.parse(r.dueAt) + 600_000, j({ r, placedAt: p?.placedAt }));
    const p2 = await sweep(rec.alerts);
    ok("18.22 · a second pass writes no second row (the page's anchor filter)", !p2.threw && (await S.houseBotIntentStore.listLiveOnMarket(m.id)).length === 1, j(p2));
  }

  /* ── 18.15b the hook's soft cache, discriminated: a live bot exists, so only the cache can answer idle (mutation T32 once passed 18.15) ── */
  {
    await soloBot();
    const hookFacts = { positionId: `pos_hook_idle_${process.pid}`, userId: `usr_hook_nobody_${process.pid}`, marketId: "mkt_hook_x", side: "YES", stake: 1_000, placedAt: new Date().toISOString() };
    const stateWith = (cache: Any) => ({ ...EN2.engineState(), started: true, stopping: false, skewMs: 0, inFlight: new Map(), hook: { inFlight: 0, dropped: 0, cache, alerts: recorder().alerts } });
    const idle = await safe(() => TG.onPlayerBetCommitted(hookFacts, { state: stateWith({ atMs: Date.now(), live: false, holderIds: new Set() }) }));
    const fresh = await safe(() => TG.onPlayerBetCommitted(hookFacts, { state: stateWith(null) }));
    ok("18.15b · PLAN §4.3 · a fresh soft cache saying nothing is live answers idle with no decision — while a fresh read with a live bot decides the same stake (not a player)",
      idle === "idle" && fresh === "notPlayer", j({ idle, fresh }));
  }

  /* ── 18.23 the sweep's 5 s age filter (A24) ── */
  {
    await soloBot();
    const m = await w.poll();
    const t = await stakeOn(m.id, "YES", 10_000, { ageMs: 0 });
    const rec = recorder();
    await sweep(rec.alerts);
    const young = await counterOf(t.positionId);
    await w.backdate(t.positionId, 6_000);
    await sweep(rec.alerts);
    ok("18.23 · A24 · a stake younger than 5 s is not decided by the sweep; once 6 s old it is", young == null && (await counterOf(t.positionId)) != null, j({ young }));
  }

  /* ── 18.24 scope start, a non-player, the penalty box, a recruit (A11, I3, PLAN §4.3, ruling 36) ── */
  {
    const b = await soloBot();
    const rec = recorder();
    const mEarly = await w.poll();
    const early = await stakeOn(mEarly.id, "YES", 10_000);
    await S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.global, { scopeFrom: new Date(await dbNow()).toISOString() });
    const pe = await sweep(rec.alerts);
    await plantScope();
    ok("18.24 · A11 · a stake placed before the global scope start writes no row — decided out of scope, not idle",
      !pe.threw && (await counterOf(early.positionId)) == null && (pe.outcomes?.outOfScope ?? 0) >= 1 && (pe.outcomes?.idle ?? 0) === 0, j(pe));
    const mClosed = await w.poll();
    const gone = await stakeOn(mClosed.id, "YES", 10_000);
    // A stake cashed out before the sweep reads it (the status the cash-out writes; its money flow has its own suites).
    if (w.onPostgres) await w.prisma().$executeRawUnsafe(`UPDATE "Position" SET "status" = 'CASHED_OUT' WHERE "id" = $1`, gone.positionId);
    else (await pos(gone.positionId)).status = "CASHED_OUT";
    const pc = await sweep(rec.alerts);
    ok("18.24b · ruling 114 · a stake no longer OPEN when read writes no row (a row would only box the player at fire)",
      !pc.threw && (await counterOf(gone.positionId)) == null && (pc.outcomes?.closed ?? 0) >= 1, j(pc));
    const mAgent = await w.poll();
    const agent = await stakeOn(mAgent.id, "YES", 10_000, { user: { role: "AGENT" } });
    const mBoxed = await w.poll();
    const boxedUser = await w.user({ balance: 1_000_000 });
    await S.houseBotAlertOnceStore.claimWithEatSuffix(`penalty:${boxedUser}`, "day");
    const boxed = await stakeOn(mBoxed.id, "YES", 10_000, { userId: boxedUser });
    const mRecruit = await w.poll();
    await asAgent(b.userId);
    const recruit = await stakeOn(mRecruit.id, "YES", 10_000, { user: { recruitedBy: b.userId } });
    const p = await sweep(rec.alerts);
    ok("18.25 · I3 · a non-PLAYER account's stake is never a trigger (no row, decided as not a player)",
      !p.threw && (await counterOf(agent.positionId)) == null && (p.outcomes?.notPlayer ?? 0) >= 1, j(p));
    const rb = await counterOf(boxed.positionId);
    ok("18.26 · PLAN §4.3 · a penalty-boxed account leaves ONE SKIPPED(PENALTY_BOX) row (its stake the bot's smallest, ruling 120)",
      rb?.status === "SKIPPED" && rb.reasonCode === "PENALTY_BOX" && rb.stakeTzs >= 1_000, j(rb));
    const rr = await counterOf(recruit.positionId);
    ok("18.27 · A21 · a live holder's recruit leaves ONE SKIPPED(HOLDER_RECRUIT) row", rr?.status === "SKIPPED" && rr.reasonCode === "HOLDER_RECRUIT", j(rr));
  }

  /* ── 18.28 the holding predicate and the cap pre-check, loaded for the bot the row names (rulings 93–94) ── */
  {
    await soloBot();
    const other = await w.bot(); // its rules never parse, so it never decides; its live FILL holds the market
    const m = await w.poll();
    const held = await stakeOn(m.id, "YES", 10_000);
    const fill = { ...rowFor(other, m.id) };
    const ins = await safe(() => S.houseBotIntentStore.insert(fill));
    const p = await sweep(recorder().alerts);
    const rh = await counterOf(held.positionId);
    ok("18.28 · rulings 58, 93 · another bot's live intent holds the market → SKIPPED(MARKET_HELD)", !ins.threw && rh?.status === "SKIPPED" && rh.reasonCode === "MARKET_HELD", j({ ins: ins.threw, rh, p }));
    await S.houseBotIntentStore.cancelPending(fill.id, "BOT_NOT_ACTIVE");
  }
  {
    await soloBot({ balance: 500 });
    const m = await w.poll();
    const t = await stakeOn(m.id, "YES", 10_000);
    const p = await sweep(recorder().alerts);
    const r = await counterOf(t.positionId);
    ok("18.29 · ruling 94 · a money cap that refuses even the smallest stake → SKIPPED with its code (a 500 TZS balance: CAP_BALANCE_FLOOR), never PENDING",
      r?.status === "SKIPPED" && r.reasonCode === "CAP_BALANCE_FLOOR", j({ r, p }));
  }

  /* ── 18.30 A21 · the holder against their own bot (ruling 105) ── */
  const holderEvents = async (marketId: string) => (await S.houseBotEventStore.listByKinds(["HOLDER_AGAINST_BOT"], { marketId, limit: 5 })) as Any[];
  {
    const b = await soloBot();
    const m = await w.poll();
    await stakeOn(m.id, "YES", 10_000, { ageMs: 10_000 });
    const placed = await safe(() => houseStake(b, m.id, "NO", 2_000));
    const mSame = await w.poll();
    await stakeOn(mSame.id, "YES", 10_000, { ageMs: 10_000 });
    const placedSame = await safe(() => houseStake(b, mSame.id, "NO", 2_000));
    const h = await stakeOn(m.id, "YES", 3_000, { userId: b.userId });
    const hSame = await stakeOn(mSame.id, "NO", 1_000, { userId: b.userId });
    const rec = recorder();
    const p1 = await sweep(rec.alerts);
    const alert = rec.keyed(`holder-against:${b.botId}:${m.id}`);
    const ev = await holderEvents(m.id);
    const want = { side: "YES", stakeTzs: 3_000, botSide: "NO", botStakeTzs: 2_000, productLine: "MARKET" }; // ruling 166 · the copy needs the product to say the right word
    ok("18.30 · fixture · the bot holds an OPEN NO house stake on both polls", !placed.threw && !placedSame.threw, j({ placed, placedSame }));
    ok("18.31 · A21 · the holder's YES against the bot's NO → ONE alert holder-against:<bot>:<market>, aggregates only",
      alert.length === 1 && sameFields(alert[0].m.detail, want) && alert[0].m.botId === b.botId && alert[0].m.marketId === m.id && !j(alert[0].m).includes(b.userId), j({ p1, alerts: rec.calls.filter((c) => c.fn === "once") }));
    ok("18.32 · …and ONE HOLDER_AGAINST_BOT event: the bot, the holder and the market as columns; {side, stakeTzs, botSide, botStakeTzs}",
      ev.length === 1 && ev[0].houseBotId === b.botId && ev[0].userId === b.userId && sameFields(ev[0].payload, want), j(ev));
    ok("18.33 · I3 · the holder's own stake is never a trigger: no COUNTER row on it", (await counterOf(h.positionId)) == null);
    ok("18.34 · A21 · the holder on the SAME side as the bot → nothing", rec.keyed(`holder-against:${b.botId}:${mSame.id}`).length === 0
      && (await holderEvents(mSame.id)).length === 0 && (await counterOf(hSame.positionId)) == null);
    const rec2 = recorder();
    await sweep(rec2.alerts);
    ok("18.35 · a second pass (the stake still in the lookback) sends and writes nothing more", rec2.keyed(`holder-against:${b.botId}:${m.id}`).length === 0 && (await holderEvents(m.id)).length === 1);
  }

  /* ── 18.36 A21 runs whatever the switch says; OFF decides nothing, and the watermark still moves (rulings 104–105) ── */
  {
    const b = await soloBot();
    const m = await w.poll();
    await stakeOn(m.id, "YES", 10_000, { ageMs: 10_000 });
    const placed = await safe(() => houseStake(b, m.id, "NO", 2_000));
    const mOff = await w.poll();
    const player = await stakeOn(mOff.id, "YES", 10_000);
    await w.switchOff();
    await stakeOn(m.id, "YES", 1_000, { userId: b.userId });
    const rec = recorder();
    const before: Any = await S.houseBotRuntimeStore.get(K.RUNTIME_KEY.global);
    const p = await sweep(rec.alerts);
    const after: Any = await S.houseBotRuntimeStore.get(K.RUNTIME_KEY.global);
    await w.switchOn();
    await plantScope();
    ok("18.36 · ruling 105 · switch OFF: the holder's stake against their bot is still alerted, once", !placed.threw && rec.keyed(`holder-against:${b.botId}:${m.id}`).length === 1, j({ p, placed }));
    ok("18.37 · A11 · switch OFF: an aged player stake gets no row; the pass decides nothing", (await counterOf(player.positionId)) == null && (p.outcomes?.inserted ?? 0) === 0 && (p.outcomes?.idle ?? 0) >= 1, j(p));
    // The stored mark only moves forward: an earlier pass that read nothing may already stand at its passNow − 5 s, ahead of
    // stakes aged 6 s right after it (the lookback still reads them). What the pass ASKS for is the last stake it read.
    ok("18.38 · ruling 104 · …and the pass asks the watermark for the last stake it read (a real stake, never passNow − 5 s), and the stored mark never moves back",
      p.read > 0 && typeof p.advance?.id === "string" && p.advance.id !== ""
        && Date.parse(after?.sweepPlacedAt) >= Date.parse(before?.sweepPlacedAt) && Date.parse(after?.sweepPlacedAt) >= Date.parse(p.advance.placedAt),
      j({ before: before?.sweepPlacedAt, after: after?.sweepPlacedAt, advance: p.advance, read: p.read }));
  }

  /* ── 18.39 a failed decision holds the watermark, and the lookback reads the stake again (ruling 104) ── */
  {
    const b = await soloBot();
    const m = await w.poll();
    await stakeOn(m.id, "YES", 10_000, { ageMs: 10_000 });
    const placed = await safe(() => houseStake(b, m.id, "NO", 2_000));
    const h = await stakeOn(m.id, "YES", 1_000, { userId: b.userId });
    const hp = await pos(h.positionId);
    const down = recorder();
    down.alerts.once = async () => { throw new Error("alert channel down"); };
    const precedes = (a: { placedAt: string; id: string }, x: { placedAt: string; id: string }) =>
      Date.parse(a.placedAt) < Date.parse(x.placedAt) || (Date.parse(a.placedAt) === Date.parse(x.placedAt) && a.id < x.id);
    const markBefore: Any = await S.houseBotRuntimeStore.get(K.RUNTIME_KEY.global);
    const pFail = await sweep(down.alerts);
    const mark: Any = await S.houseBotRuntimeStore.get(K.RUNTIME_KEY.global);
    const failedStake = { placedAt: new Date(Date.parse(hp.placedAt)).toISOString(), id: h.positionId };
    const markTuple = (r: Any) => ({ placedAt: r?.sweepPlacedAt, id: r?.sweepPositionId ?? "" });
    ok("18.39 · a decision that throws (A21's alert channel down) is counted; the pass never asks past that stake, and the stored mark stays put or behind it",
      !placed.threw && pFail.failed >= 1 && (pFail.advance == null || precedes(pFail.advance, failedStake))
        && (j(markTuple(mark)) === j(markTuple(markBefore)) || precedes(markTuple(mark), failedStake)),
      j({ pFail, markBefore: markTuple(markBefore), mark: markTuple(mark), stake: failedStake }));
    const up = recorder();
    const pUp = await sweep(up.alerts);
    ok("18.40 · …the next pass reads the stake again and the alert goes out (its claim was given back)", up.keyed(`holder-against:${b.botId}:${m.id}`).length === 1, j(pUp));
  }

  /* ── 18.41 R5 BOTH_SIDES, and the box's record (rulings 106–107) ── */
  {
    const b = await soloBot();
    const m = await w.poll();
    const player = await w.user({ balance: 1_000_000 });
    const yes = await stakeOn(m.id, "YES", 10_000, { userId: player });
    const counter = { ...rowFor(b, m.id), kind: "COUNTER", anchorKey: yes.positionId, triggerPositionId: yes.positionId, triggerUserId: player, status: "PLACED",
      positionId: `pos_hb_both_${process.pid}`, finishedAt: w.iso(-1_000), attempts: 1 };
    const ins = await safe(() => S.houseBotIntentStore.insert(counter));
    const no = await stakeOn(m.id, "NO", 2_000, { userId: player });
    const rec = recorder();
    const p = await sweep(rec.alerts);
    const r = await counterOf(no.positionId);
    const ev = (await S.houseBotEventStore.listByKinds(["PENALTY_BOXED"], { userId: player, limit: 5 })) as Any[];
    const day = CLOCK.eatDayKey(await dbNow());
    ok("18.41 · R5 · the house countered this account here and it now holds both sides → its new stake leaves SKIPPED(PENALTY_BOX)",
      !ins.threw && r?.status === "SKIPPED" && r.reasonCode === "PENALTY_BOX", j({ ins: ins.threw, r, p }));
    ok("18.42 · ruling 107 · ONE PENALTY_BOXED event {cause: BOTH_SIDES, day: today's EAT day, intentId: that COUNTER} on the market",
      ev.length === 1 && ev[0].payload?.cause === "BOTH_SIDES" && ev[0].payload?.day === day && ev[0].payload?.intentId === counter.id && ev[0].marketId === m.id, j(ev));
    const boxAlerts = rec.keyed(`penalty:${player}:`);
    ok("18.43 · ruling 107 · ONE admin alert on the box's key, code PENALTY_BOXED, the player named only by handle",
      boxAlerts.length === 1 && boxAlerts[0].code === "PENALTY_BOXED" && boxAlerts[0].m.detail?.handle === playerHandle(player) && !j(boxAlerts[0].m).includes(player), j(boxAlerts));
    ok("18.44 · the box stands: the account reads penalty-boxed today", (await S.houseSeamStore.triggerAccount(player))?.penaltyToday === true);
    const lone = await w.user({ balance: 1_000_000 });
    const m2 = await w.poll();
    const y2 = await stakeOn(m2.id, "YES", 10_000, { userId: lone });
    const one = await safe(() => S.houseBotIntentStore.insert({ ...counter, id: S.newHouseId("intent"), marketId: m2.id, anchorKey: y2.positionId, triggerPositionId: y2.positionId, triggerUserId: lone, positionId: `pos_hb_one_${process.pid}` }));
    const y3 = await stakeOn(m2.id, "YES", 1_000, { userId: lone });
    await sweep(recorder().alerts);
    const r3 = await counterOf(y3.positionId);
    ok("18.45 · CONTROL · countered but still on ONE side → not boxed; its next stake is decided normally",
      !one.threw && (await S.houseSeamStore.triggerAccount(lone))?.penaltyToday === false && r3 != null && r3.reasonCode !== "PENALTY_BOX", j({ one: one.threw, r3 }));
  }
  {
    const u = await w.user();
    const down = recorder();
    down.alerts.once = async () => { throw new Error("alert channel down"); };
    const boxed = await safe(() => OC.boxAccount({ userId: u, houseBotId: null, marketId: null, cause: "BOTH_SIDES", intentId: `hbi_x_${process.pid}` }, down.alerts));
    const again = await S.houseBotAlertOnceStore.claimWithEatSuffix(`penalty:${u}`, "day");
    ok("18.46 · ruling 107 · a failed box alert never releases the box: boxed, the claim not free again, the account reads boxed",
      boxed === true && again.claimed === false && (await S.houseSeamStore.triggerAccount(u))?.penaltyToday === true, j({ boxed, again }));
    ok("18.47 · …and a second boxing the same EAT day boxes nothing (false)",
      (await safe(() => OC.boxAccount({ userId: u, houseBotId: null, marketId: null, cause: "BOTH_SIDES", intentId: `hbi_y_${process.pid}` }, recorder().alerts))) === false);
  }
  {
    const b = await soloBot();
    const m = await w.poll();
    const u = await w.user();
    // Its own anchor: §16 already anchors a COUNTER on `pos_hb_gone_<pid>` (hbi_counter_anchor_uq) in a full run.
    const i = await w.intent(b, m.id, { kind: "COUNTER", triggerPositionId: `pos_hb_gone18_${process.pid}_${Date.now()}`, triggerUserId: u, side: "NO" });
    const rec = recorder();
    const out = await safe(() => OC.applyOutcome({ intent: i, me: "world", answer: { ok: false, code: "REFUSED", reason: "house_trigger_gone" }, alerts: rec.alerts }));
    const ev = (await S.houseBotEventStore.listByKinds(["PENALTY_BOXED"], { userId: u, limit: 5 })) as Any[];
    const day = CLOCK.eatDayKey(await dbNow());
    ok("18.48 · R5 · a trigger exit boxes with {cause: CASHED_OUT_COUNTERED, day, intentId} and ONE PENALTY_BOXED alert",
      !out.threw && ev.length === 1 && ev[0].payload?.cause === "CASHED_OUT_COUNTERED" && ev[0].payload?.day === day && ev[0].payload?.intentId === i.id
        && rec.keyed(`penalty:${u}:`).length === 1, j({ out, ev, calls: rec.calls }));
  }

  /* ── 18.49 targeted COUNTERs (N2 §4 steps 2–6; rulings 38, 94, 108) ── */
  {
    const b = await soloBot();
    const m = await w.poll({ graceMin: 5, paidMin: 0 });
    const t = await armedTarget(b, m.id);
    const trig = await stakeOn(m.id, "YES", 10_000);
    const p = await sweep(recorder().alerts);
    const r = await counterOf(trig.positionId);
    const placedMs = Date.parse((await pos(trig.positionId)).placedAt);
    ok("18.49 · N2 §4 · a stake on a targeted poll → ONE PENDING targeted COUNTER naming the target", r?.status === "PENDING" && r.targetId === t.id && r.decision?.entry === "TARGET", j({ r, p }));
    ok("18.50 · ruling 108 · asked 10 s after the stake, held to the 5-min exit + 7 s → due +307 s, stale +367 s, heldToExit",
      !!r && Date.parse(r.dueAt) === placedMs + 307_000 && Date.parse(r.staleAt) === placedMs + 367_000 && r.decision.heldToExit === true
        && Date.parse(r.decision.requestedDueAt) === placedMs + 10_000, j(r));
    ok("18.51 · ruling 38 · sized against the trigger side's money locked AT the due time: 50% of 10,000 = 5,000", r?.stakeTzs === 5_000, j(r?.stakeTzs));
  }
  {
    const b = await soloBot({ caps: { capStaffChosenDailyTzs: 3_000 } });
    const m = await w.poll();
    await armedTarget(b, m.id);
    const trig = await stakeOn(m.id, "YES", 10_000);
    await sweep(recorder().alerts);
    const r = await counterOf(trig.positionId);
    ok("18.52 · ruling 94 · the targeted stake is clamped to the staff-chosen TZS left today (bot cap 3,000 → 3,000, not 5,000)",
      r?.status === "PENDING" && r.targetId != null && r.stakeTzs === 3_000, j(r));
  }
  {
    const b = await soloBot();
    const m = await w.poll();
    const t = await armedTarget(b, m.id);
    const trig = await stakeOn(m.id, "YES", 10_000);
    const nowMs = await dbNow();
    const facts = await safe(() => TG.loadPassFacts(nowMs, { targets: true }));
    await S.targetStore.endActive(t.id, "VETOED");
    const p = await pos(trig.positionId);
    const row = { id: trig.positionId, userId: trig.userId, marketId: m.id, side: "YES", stake: 10_000, placedAt: new Date(Date.parse(p.placedAt)).toISOString(), status: "OPEN" };
    const out = await safe(() => TG.decideTrigger(row, facts, { alerts: recorder().alerts, randomInt: (min: number) => min }));
    const r = await counterOf(trig.positionId);
    ok("18.53 · N2 §4 step 4.6 · the target ended between the pass read and the insert → the same pass writes the UNTARGETED row",
      facts?.targets?.get?.(m.id)?.id === t.id && out === "inserted" && r?.status === "PENDING" && r.targetId == null, j({ out, r }));
  }
  {
    const b = await soloBot();
    const m = await w.poll();
    const t = await armedTarget(b, m.id);
    const u = await w.user({ balance: 1_000_000 });
    await S.houseBotAlertOnceStore.claimWithEatSuffix(`penalty:${u}`, "day");
    const trig = await stakeOn(m.id, "YES", 10_000, { userId: u });
    await sweep(recorder().alerts);
    const r = await counterOf(trig.positionId);
    ok("18.54 · TGT-25 · a penalty-boxed stake on a targeted poll → ONE SKIPPED(PENALTY_BOX) row naming the target", r?.status === "SKIPPED" && r.reasonCode === "PENALTY_BOX" && r.targetId === t.id, j(r));
  }

  /* ── 18.55 once-only scope alerts (ruling 90) ── */
  {
    await soloBot();
    const mJ = await w.poll();
    const sJ = await stakeOn(mJ.id, "YES", 10_000);
    const mU = await w.poll();
    const sU = await stakeOn(mU.id, "YES", 10_000);
    await setMarket(mJ.id, { productLine: "JACKPOT" });
    await setMarket(mU.id, { productLine: "UPDOWN" });
    const rec = recorder();
    const p = await sweep(rec.alerts);
    const rec2 = recorder();
    await sweep(rec2.alerts);
    await setMarket(mJ.id, { productLine: "MARKET" });
    await setMarket(mU.id, { productLine: "MARKET" });
    ok("18.55 · A12 · a raw product line no policy admits → ONE product-denied:<line>:<EAT day> alert, no row",
      rec.keyed("product-denied:JACKPOT:").length === 1 && (await counterOf(sJ.positionId)) == null, j({ p, keys: rec.calls.filter((c) => c.fn === "once").map((c) => c.key) }));
    ok("18.56 · A12 · an Up & Down market with no round → ONE ud-orphan-market:<market> alert, no row", rec.keyed(`ud-orphan-market:${mU.id}`).length === 1 && (await counterOf(sU.positionId)) == null);
    ok("18.57 · …once only: a second pass sends neither again", rec2.keyed("product-denied:JACKPOT:").length === 0 && rec2.keyed(`ud-orphan-market:${mU.id}`).length === 0);
  }
  {
    const p = await sweep(recorder().alerts, { admission: () => ({ queueDepth: 1 }) });
    ok("18.58 · A24 · an admission queue → the pass is skipped: no read, no watermark write", p.skipped === "ADMISSION" && p.read === 0 && p.advance === null, j(p));
  }

  /* ── 18.L4 the per-player counterparty caps refuse a trigger AT DECISION TIME, with the trigger account as counterparty (L4) ── */
  {
    const b = await soloBot();
    const player = await w.user({ balance: 1_000_000 });
    const clean = await w.user({ balance: 1_000_000 });
    const mPast = await w.poll();
    const earlier = await stakeOn(mPast.id, "YES", 10_000, { userId: player });
    // Today's PLACED COUNTER against this player (TZS 2,000), as 18.41 writes one.
    const counted = await safe(() => S.houseBotIntentStore.insert({ ...rowFor(b, mPast.id), kind: "COUNTER", anchorKey: earlier.positionId, triggerPositionId: earlier.positionId,
      triggerUserId: player, status: "PLACED", positionId: `pos_hb_l4_${process.pid}`, finishedAt: w.iso(-1_000), attempts: 1 }));
    const decideOn = async (userId: string) => {
      const m = await w.poll();
      const s = await stakeOn(m.id, "YES", 10_000, { ageMs: 10_000, userId });
      // A pass reads one bounded page of the lookback, and earlier sections leave stakes in it (measured on Postgres: the
      // first pass had not reached this stake). The decision is the same whichever pass makes it, so sweep until it is made.
      // Ruling 92: a bot reacts only to stakes placed after it (and the switch) started. These stakes are aged 10 s so the
    // sweep reads them, which put them BEFORE a bot started a moment ago — measured: every pass called them outOfScope,
    // and the case passed or failed with the setup's timing. The scope is declared instead of raced.
    await S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.bot(b.botId), { scopeFrom: w.iso(-3_600_000) });
    await S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.global, { scopeFrom: w.iso(-3_600_000) });
    const passes: Any[] = [];
      for (let pass = 0; pass < 6; pass++) {
        passes.push(await sweep(recorder().alerts));
        const r = await counterOf(s.positionId);
        if (r) return r;
      }
      console.log(`[${STORE}] 18.L4 diagnostic · no row for ${s.positionId} after 6 passes: ${j(passes.slice(-2))}`);
      return null;
    };
    try {
      await w.limits({ gCounterPerPlayerPerDay: 1 });
      const byCount = await decideOn(player);
      const control = await decideOn(clean);
      ok("18.L4a · L4 · a player the house already countered once today, at a daily count of 1 → their next stake leaves SKIPPED(CAP_COUNTERPARTY_COUNT)",
        !counted.threw && byCount?.status === "SKIPPED" && byCount.reasonCode === "CAP_COUNTERPARTY_COUNT", j({ counted: counted.threw, byCount }));
      ok("18.L4b · CONTROL · another player with no counters today, same bot and limits → a PENDING COUNTER",
        control?.status === "PENDING" && control.kind === "COUNTER", j(control));
      await w.limits({ gCounterPerPlayerPerDay: 1_440, gCounterPerPlayerTzsPerDay: 2_000 });
      const byTzs = await decideOn(player);
      ok("18.L4c · L4 · …and at a daily TZS cap equal to what was already countered (2,000) → SKIPPED(CAP_COUNTERPARTY_TZS)",
        byTzs?.status === "SKIPPED" && byTzs.reasonCode === "CAP_COUNTERPARTY_TZS", j(byTzs));
    } finally {
      await w.limits();
    }
  }

  /* ── 18.59 the new DAL reads on this store: triggerPage, triggerAccount, placedCounterFor ── */
  {
    const b = await soloBot();
    const m = await w.poll();
    const s1 = await stakeOn(m.id, "YES", 10_000, { ageMs: 12_000 });
    const s2 = await stakeOn(m.id, "YES", 10_000, { ageMs: 9_000 });
    const placed = await safe(() => houseStake(b, m.id, "NO", 2_000));
    const houseIds = (await w.positionsOf(m.id)).filter((x: Any) => x.houseBotId != null).map((x: Any) => x.id as string);
    for (const id of houseIds) await w.backdate(id, 6_000);
    const mc = await w.poll();
    const sClosed = await stakeOn(mc.id, "YES", 10_000);
    await setMarket(mc.id, { status: "CLOSED" });
    const mA = await w.poll();
    const sAnch = await stakeOn(mA.id, "YES", 10_000);
    const anch = await safe(() => S.houseBotIntentStore.insert({ ...rowFor(b, mA.id), kind: "COUNTER", anchorKey: sAnch.positionId, triggerPositionId: sAnch.positionId,
      triggerUserId: sAnch.userId, status: "SKIPPED", reasonCode: "NOT_REACTING", finishedAt: w.iso() }));
    const now = await dbNow();
    const page = (o: Any = {}) => S.houseSeamStore.triggerPage({ fromIso: new Date(now - 120_000).toISOString(), beforeIso: new Date(now - 5_000).toISOString(), after: null, limit: 200, ...o }) as Promise<Any[]>;
    const ids = (rows: Any[]) => rows.map((x) => x.id as string);
    const all = await page();
    ok("18.59 · triggerPage · unmarked stakes on a LIVE market, oldest first", ids(all).includes(s1.positionId) && ids(all).indexOf(s2.positionId) > ids(all).indexOf(s1.positionId), j(ids(all).slice(-8)));
    ok("18.60 · …never a marked (house) stake, a stake on a market no longer LIVE, or a stake a COUNTER is anchored on",
      !placed.threw && !anch.threw && houseIds.length === 1 && !houseIds.some((id) => ids(all).includes(id)) && !ids(all).includes(sClosed.positionId) && !ids(all).includes(sAnch.positionId),
      j({ placed: placed.threw, anch: anch.threw, houseIds }));
    const p1: Any = await pos(s1.positionId);
    const p1At = new Date(Date.parse(p1.placedAt)).toISOString();
    const afterS1 = await page({ after: { placedAt: p1At, id: s1.positionId } });
    ok("18.61 · …keyset: after (placedAt, id) of the first stake the page starts strictly after it", !ids(afterS1).includes(s1.positionId) && ids(afterS1).includes(s2.positionId));
    const upToS1 = await page({ beforeIso: p1At });
    ok("18.62 · …the window includes `beforeIso` itself and nothing newer", ids(upToS1).includes(s1.positionId) && !ids(upToS1).includes(s2.positionId));
    const r1 = all.find((x) => x.id === s1.positionId);
    ok("18.63 · …a row is exactly {id, userId, marketId, side, stake, placedAt, status}",
      !!r1 && j(Object.keys(r1).sort()) === j(["id", "marketId", "placedAt", "side", "stake", "status", "userId"]) && r1.userId === s1.userId && r1.stake === 10_000 && r1.side === "YES" && r1.status === "OPEN", j(r1));
    ok("18.64 · …bounded by its limit", (await page({ limit: 1 })).length === 1);

    await asAgent(b.userId);
    const recruitUser = await w.user({ recruitedBy: b.userId });
    const acct = await S.houseSeamStore.triggerAccount(recruitUser);
    ok("18.65 · triggerAccount · role, recruiter, no box", acct?.role === "PLAYER" && acct.recruitedBy === b.userId && acct.penaltyToday === false, j(acct));
    await S.houseBotAlertOnceStore.claimWithEatSuffix(`penalty:${recruitUser}`, "day");
    ok("18.66 · …today's box row is seen (its day computed from the database clock)", (await S.houseSeamStore.triggerAccount(recruitUser))?.penaltyToday === true);
    const oldBox = await w.user();
    await S.houseBotAlertOnceStore.claim(`penalty:${oldBox}:2000-01-01`);
    ok("18.67 · …a box from another day is not today's", (await S.houseSeamStore.triggerAccount(oldBox))?.penaltyToday === false);
    ok("18.68 · …an unknown account → null", (await S.houseSeamStore.triggerAccount(`usr_hb_nobody_${process.pid}`)) === null);

    const pu = await w.user();
    const mk = (o: Any) => safe(() => S.houseBotIntentStore.insert({ ...rowFor(b, mA.id), kind: "COUNTER", triggerUserId: pu, ...o }));
    const pending = await mk({ anchorKey: `pos_hb_pc1_${process.pid}`, triggerPositionId: `pos_hb_pc1_${process.pid}` });
    ok("18.69 · placedCounterFor · a PENDING COUNTER is not a counter placed", !pending.threw && (await S.houseBotIntentStore.placedCounterFor(pu, mA.id)) === null, j(pending.threw));
    const placedA = await mk({ anchorKey: `pos_hb_pc2_${process.pid}`, triggerPositionId: `pos_hb_pc2_${process.pid}`, status: "PLACED", positionId: `pos_hb_pc2p_${process.pid}`, finishedAt: w.iso(), attempts: 1 });
    await sleep(25);
    const placedB = await mk({ anchorKey: `pos_hb_pc3_${process.pid}`, triggerPositionId: `pos_hb_pc3_${process.pid}`, status: "PLACED", positionId: `pos_hb_pc3p_${process.pid}`, finishedAt: w.iso(), attempts: 1 });
    const found: Any = await S.houseBotIntentStore.placedCounterFor(pu, mA.id);
    ok("18.70 · …the newest PLACED COUNTER on (account, market)", !placedA.threw && !placedB.threw && found?.id === placedB.id, j({ found: found?.id, a: placedA.id, b: placedB.id }));
    ok("18.71 · …another market or another account → null",
      (await S.houseBotIntentStore.placedCounterFor(pu, m.id)) === null && (await S.houseBotIntentStore.placedCounterFor(`usr_hb_nobody_${process.pid}`, mA.id)) === null);
    if (!pending.threw) await S.houseBotIntentStore.cancelPending(pending.id, "BOT_NOT_ACTIVE");
  }

  /* ── 18.72 the hook, end to end through a real Up & Down stake and the live call site (rulings 101–102, 109) ── */
  {
    const cfg: Any = await import("../../src/lib/server/updown-config.ts");
    const uds: Any = await import("../../src/lib/server/updown-service.ts");
    const udd: Any = await import("../../src/lib/server/updown-dal.ts");
    const { seedDefaultSources, addSource }: Any = await import("../../src/lib/server/source-registry.ts");
    await seedDefaultSources();
    await addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto", rationale: "test fixture (mirrors production)", addedBy: "system" });
    const a = await cfg.createAsset({ key: `T${process.pid}`, symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
      priceSourceUrl: "https://api.twelvedata.com/quote", category: "crypto", decimals: 2, minMoveTicks: 2 }, WORLD_OFFICER);
    if (a.ok) await cfg.setAssetEnabled(a.data.id, true, WORLD_OFFICER);
    const c = a.ok ? await cfg.createChain({ assetId: a.data.id, durationMinutes: 5 }, WORLD_OFFICER) : a;
    if (c.ok) await cfg.setChainState(c.data.id, "RUNNING", WORLD_OFFICER);
    const chain = c.ok ? await udd.chainStore.get(c.data.id) : null;
    const boundary = new Date(cfg.cleanGridAnchor(Date.now() + 60_000)).toISOString();
    let opened: Any = { ok: false, error: `fixture: ${a.error ?? c.error}` };
    if (chain) {
      const o = await udd.observationStore.ensure(a.data.id, boundary);
      await udd.observationStore.confirm(o.id, { price: 60_000, sourceUrl: "https://api.twelvedata.com/quote", sourceQuotedAt: boundary,
        evidence: "BTC quoted 60000", confidence: 96, model: "test-stub", rawHash: `ht_${process.pid}` });
      opened = await uds.openRound(chain, boundary, o.id, 60_000);
    }
    ok("18.72 · fixture · a real Up & Down round is open on a running chain", opened.ok === true, opened.ok ? "" : String(opened.error));
    if (opened.ok) {
      const round = await udd.roundStore.get(opened.data.id);
      const udRules = trigRules();
      udRules.scope.products = { updown: true, polls: false };
      udRules.scope.categories = [];
      udRules.scope.chains = [`${a.data.id}:5`];
      udRules.modes.updown = { counter: true, fill: false, opener: false };
      udRules.modes.polls = { counter: false, fill: false, opener: false };
      udRules.guards.noReactZoneUdSec = 0;
      udRules.guards.minTimeToCutoffUdSec = 10;
      udRules.updown.closenessPct = 100;
      udRules.targeting = { enabled: false };
      const b = await soloBot({ rules: udRules });
      ok("18.72b · fixture · the Up & Down bot parses on the new chain and the pass decides", await decidingFor(b.botId));
      const state = EN2.engineState();
      const rec = recorder();
      const saved = { started: state.started, stopping: state.stopping, skewMs: state.skewMs, alerts: state.hook.alerts, cache: state.hook.cache };
      state.started = true;
      state.stopping = false;
      state.skewMs = 0;
      state.hook.alerts = rec.alerts;
      state.hook.cache = null;
      const waitRow = async (positionId: string, withinMs: number): Promise<{ row: Any; ms: number }> => {
        const t0 = Date.now();
        while (Date.now() - t0 < withinMs) {
          const r = await counterOf(positionId);
          if (r) return { row: r, ms: Date.now() - t0 };
          await sleep(100);
        }
        return { row: null, ms: Date.now() - t0 };
      };
      try {
        const player = await w.user({ balance: 1_000_000 });
        const udBet = await w.svc.buyPosition(player, { marketId: round.marketId, side: "YES", stake: 5_000, idempotencyKey: crypto.randomUUID() });
        const got = udBet.ok ? await waitRow(udBet.data.positionId, 5_000) : { row: null, ms: 0 };
        ok("18.73 · ⭐ ruling 101 · a player's Up & Down stake → the hook decides it with no sweep: one COUNTER anchored on the stake",
          udBet.ok === true && got.row?.kind === "COUNTER" && got.row.triggerUserId === player && got.row.productLine === "UPDOWN" && got.row.houseBotId === b.botId, j({ bet: udBet.ok ? "ok" : udBet, got }));
        ok("18.74 · …on the other side, PENDING, with the A15 price it used recorded", got.row?.side === "NO" && got.row?.status === "PENDING"
          && ["observation", "vendor_bar"].includes(got.row?.decision?.priceSource), j(got.row));
        const waitMs = Math.max(2_000, got.ms * 3);
        const poll = await w.poll();
        const pollBet = await w.svc.buyPosition(player, { marketId: poll.id, side: "YES", stake: 5_000, idempotencyKey: crypto.randomUUID() });
        const pollGot = pollBet.ok ? await waitRow(pollBet.data.positionId, waitMs) : { row: null, ms: 0 };
        ok("18.75 · N2 §4 step 1 · a poll stake reaches no hook: no row, while the same armed hook decided Up & Down (polls are sweep-only)",
          pollBet.ok === true && got.row != null && pollGot.row == null, j({ pollGot, upDownMs: got.ms }));
        const prevEnv = process.env[K.HOUSE_BOT_ENGINE_ENV];
        process.env[K.HOUSE_BOT_ENGINE_ENV] = "false";
        let offGot: Any = null;
        try {
          const offBet = await w.svc.buyPosition(player, { marketId: round.marketId, side: "YES", stake: 1_000, idempotencyKey: crypto.randomUUID() });
          offGot = offBet.ok ? await waitRow(offBet.data.positionId, waitMs) : { row: null, refused: offBet };
        } finally {
          if (prevEnv === undefined) delete process.env[K.HOUSE_BOT_ENGINE_ENV];
          else process.env[K.HOUSE_BOT_ENGINE_ENV] = prevEnv;
        }
        ok("18.76 · A24/R6 · HOUSE_BOT_ENGINE=false → the hook returns before its import: no row for the next Up & Down stake",
          got.row != null && offGot?.row == null && offGot?.refused == null, j(offGot));

        // L1 · A21 through the LIVE hook: the holder's own Up & Down stake against their bot, at the real call site, no sweep.
        // The players' stakes are aged past their exit windows so the bot's FILL has locked money to stand on.
        for (const p of (await w.positionsOf(round.marketId)).filter((x: Any) => x.houseBotId == null)) await w.backdate(p.id, 20 * 60_000);
        const botFill = await safe(async () => {
          const i = await w.intent(b, round.marketId, { kind: "FILL", side: "NO", stakeTzs: 2_000, productLine: "UPDOWN" });
          return w.place(b, i);
        });
        ok("18.77 · L1 fixture · the bot holds an OPEN NO house stake on the round", botFill?.ok === true, j(botFill));
        const holderEventsOn = async () => (await S.houseBotEventStore.listByKinds(["HOLDER_AGAINST_BOT"], { marketId: round.marketId, limit: 5 })) as Any[];
        const holderBet = await w.svc.buyPosition(b.userId, { marketId: round.marketId, side: "YES", stake: 1_000, idempotencyKey: crypto.randomUUID() });
        let hev: Any[] = [];
        for (const t0 = Date.now(); Date.now() - t0 < 5_000 && hev.length === 0; await sleep(100)) hev = await holderEventsOn();
        const want = { side: "YES", stakeTzs: 1_000, botSide: "NO", botStakeTzs: 2_000, productLine: "UPDOWN" }; // ruling 166 · an Up & Down round, so the alert says Up/Down
        ok("18.78 · ⭐ L1 · A21 through the LIVE hook: the holder's Up & Down YES against their bot's NO → ONE HOLDER_AGAINST_BOT event, with no sweep run",
          holderBet.ok === true && hev.length === 1 && hev[0].houseBotId === b.botId && hev[0].userId === b.userId && sameFields(hev[0].payload, want), j({ bet: holderBet.ok ? "ok" : holderBet, hev }));
        ok("18.79 · …ONE alert holder-against:<bot>:<market>, and the holder's stake is never a trigger (no COUNTER on it)",
          rec.keyed(`holder-against:${b.botId}:${round.marketId}`).length === 1 && holderBet.ok === true && (await counterOf(holderBet.data.positionId)) == null,
          j(rec.calls.filter((c: Any) => c.fn === "once").map((c: Any) => c.key)));
        // L2 · the hook's admission and lock exit, by BEHAVIOUR: the alert the live hook sent ran with no slot and no lock,
        // although `buyPosition` holds a slot (withAdmission) and the wallet and market locks around the commit.
        const a21 = rec.keyed(`holder-against:${b.botId}:${round.marketId}`)[0];
        ok("18.80 · ⭐ L2 · the live hook's call ran OUTSIDE the admission slot and outside every lock",
          !!a21 && a21.adm === false && a21.lock === false, j({ adm: a21?.adm, lock: a21?.lock }));
        const probe = recorder();
        await ADM18.withAdmission(async () => L.withLock(`hb-test:l2:${process.pid}`, () => probe.alerts.once("probe", { code: "PROBE" })));
        ok("18.80c · CONTROL · the same recorder called inside a slot and a lock records adm and lock true (the spy can see them)",
          probe.calls[0]?.adm === true && probe.calls[0]?.lock === true, j(probe.calls[0]));
      } finally {
        state.started = saved.started;
        state.stopping = saved.stopping;
        state.skewMs = saved.skewMs;
        state.hook.alerts = saved.alerts;
        state.hook.cache = saved.cache;
      }
    }
  }

  // ── Ruling 164 · the flag reload must not RE-DRAW the react roll ───────────────────────────────────────────────
  // `decideWithFlags` runs the decision again once a bot's flags are loaded. When the roll lived inside the pure
  // function, that second run re-rolled and a 60% bot reacted at 36%. The stub below returns 1 for the FIRST 1–100
  // draw and 100 for every later one, so this stake is countered only while the roll is drawn once.
  {
    const rules164 = trigRules();
    rules164.counter.reactProbabilityPct = 60; // ⛔ at the fixture's default of 100 every roll reacts and this cannot fail
    const b164 = await soloBot({ rules: rules164 });
    await S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.bot(b164.botId), { scopeFrom: w.iso(-3_600_000) });
    await S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.global, { scopeFrom: w.iso(-3_600_000) });
    // Drain whatever earlier blocks left decidable, so the pass under test decides exactly this stake (every decided
    // row is anchored, and `triggerPage` skips an anchored stake).
    await sweep(recorder().alerts);
    const m164 = await w.poll();
    const s164 = await stakeOn(m164.id, "YES", 10_000, { ageMs: 10_000 });
    let rolls = 0;
    const firstReacts = (min: number, max: number) => (min === 1 && max === 100 ? (++rolls === 1 ? 1 : 100) : min);
    for (let pass = 0; pass < 6 && !(await counterOf(s164.positionId)); pass++) await sweep(recorder().alerts, { randomInt: firstReacts });
    const row164 = await counterOf(s164.positionId);
    ok("18.164a · ⭐ ruling 164 · the flag reload does not re-draw the react roll: a first roll of 1 at 60% → a PENDING COUNTER",
      row164?.status === "PENDING" && row164?.kind === "COUNTER" && rolls >= 1, j({ rolls, row: row164 }));
    const m164b = await w.poll();
    const s164b = await stakeOn(m164b.id, "YES", 10_000, { ageMs: 10_000 });
    let rollsB = 0;
    const alwaysRefuses = (min: number, max: number) => (min === 1 && max === 100 ? (rollsB++, 100) : min);
    for (let pass = 0; pass < 6 && !(await counterOf(s164b.positionId)); pass++) await sweep(recorder().alerts, { randomInt: alwaysRefuses });
    const row164b = await counterOf(s164b.positionId);
    ok("18.164b · CONTROL · a roll ABOVE the probability still refuses — SKIPPED(NOT_REACTING), so 18.164a is not vacuous",
      row164b?.status === "SKIPPED" && row164b?.reasonCode === "NOT_REACTING" && rollsB >= 1, j({ rollsB, row: row164b }));
  }

  // ── L6 · a double sweep at leader failover (ruling 103) ────────────────────────────────────────────────────────
  // TWO PROCESSES sweep the same window at the same moment. Each one's own page read is held at a barrier until the
  // other has read the same stake, so both decide it together — the failover overlap the ruling calls harmless. The
  // guarantee under test is the anchor's unique index with ON CONFLICT DO NOTHING, so this is Postgres only.
  if (w.onPostgres) {
    const { spawn } = await import("node:child_process");
    const { fileURLToPath: toPath6 } = await import("node:url");
    const { join: joinPath6, dirname: dirnamePath6 } = await import("node:path");
    const ROOT6 = joinPath6(dirnamePath6(toPath6(import.meta.url)), "..", "..");
    const b6 = await soloBot();
    // Ruling 92 · the stake is aged into the sweep's window, which puts it BEFORE a bot that started a moment ago:
    // declare the scope an hour back for the bot and globally, exactly as 18.L4 does, or every pass says outOfScope.
    await S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.bot(b6.botId), { scopeFrom: w.iso(-3_600_000) });
    await S.houseBotRuntimeStore.upsert(K.RUNTIME_KEY.global, { scopeFrom: w.iso(-3_600_000) });
    const m6 = await w.poll();
    const s6 = await stakeOn(m6.id, "YES", 10_000, { ageMs: 10_000 });
    const raceId = `l6_${process.pid}`;
    const T06 = (await S.houseBotRuntimeStore.dbClock()).nowMs + 5_000;
    const runSweep = (sideId: string) => new Promise<Any>((resolve) => {
      const child = spawn("npx", ["tsx", "scripts/lib/house-bot-two-process-child.mts"], {
        cwd: ROOT6, shell: process.platform === "win32",
        env: {
          ...process.env, ROLE: "sweep", SIDE_ID: sideId, RACE_ID: raceId,
          POSITION_ID: s6.positionId, T0_ISO: new Date(T06).toISOString(),
        },
      });
      let out = "";
      child.stdout?.on("data", (d) => { out += String(d); });
      child.stderr?.on("data", (d) => { out += String(d); });
      child.on("close", (code) => {
        const got = /@@RESULT (\{.*\})/.exec(out);
        resolve({ code, result: got ? JSON.parse(got[1]) : null, out });
      });
    });
    const [A6, B6] = await Promise.all([runSweep("a"), runSweep("b")]);
    ok("18.L6a · fixture · both sweep processes read the SAME stake in one window and met at the barrier",
      A6.result?.sawTarget === true && B6.result?.sawTarget === true && A6.result?.barrier === true && B6.result?.barrier === true,
      j({ a: A6.result ?? A6.out.slice(-400), b: B6.result ?? B6.out.slice(-400) }));
    const counted6: Any[] = await w.prisma().$queryRawUnsafe(
      `SELECT count(*)::int AS "n" FROM "HouseBotIntent" WHERE "kind" = 'COUNTER' AND "anchorKey" = $1::text`, s6.positionId);
    const inserted6 = Number(A6.result?.outcomes?.inserted ?? 0) + Number(B6.result?.outcomes?.inserted ?? 0);
    ok("18.L6b · ⭐ L6 · a double sweep at failover writes ONE counter for the stake, never two",
      Number(counted6[0]?.n) === 1, j({ rows: counted6[0]?.n, a: A6.result?.outcomes, b: B6.result?.outcomes }));
    ok("18.L6c · …and neither pass failed: the loser's insert is absorbed by the anchor conflict, never an error",
      Number(A6.result?.failed) === 0 && Number(B6.result?.failed) === 0 && inserted6 >= 1,
      j({ aFailed: A6.result?.failed, bFailed: B6.result?.failed, inserted: inserted6 }));
  }

  await S.houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");
});

/* ═══ §19 · the holder hook and the L2 holder sweep (04 A2, A3, A5, C8, C13, R6; PLAN §14; 02 §2.2–2.3; rulings 121–135) ═══ */
section("§19 · holder-hook.ts — every A2 row, through the hook and through the sweep");
const HH: Any = await import("../../src/lib/server/house-bot/holder-hook.ts");
const RG19: Any = await import("../../src/lib/server/responsible-gambling.ts");
const WF19: Any = await import("../../src/lib/server/wallet-freeze.ts");
const PRIV19: Any = await import("../../src/lib/server/privacy.ts");
const CS19: Any = await import("../../src/lib/server/config-store.ts");
const EL19: Any = await import("../../src/lib/server/house-bot/eligibility.ts");
// ⛔ C4 ruling 156: every A2 row here is driven through ONE path (the hook, or the sweep) with a recorder. The platform
// writers the fixtures use (selfExclude, coolOff, the wallet freeze, fileDsarRequest) fire the REAL in-app hook
// asynchronously, which raced the path under test on Postgres (6–7 reds before this, on `54dbb0dd` too). The in-app
// entry is suspended for §19; the call sites are `test:house-bot-holder-lifecycle`'s to prove.
HH.suspendInAppHolderHookForCases(true);

if (STORE === "memory") {
  await guard("19", () => {
    const src = decomment(readFileSync(join(ROOT, "src/lib/server/house-bot/holder-hook.ts"), "utf8"));
    ok("19.1 · R6, ruling 127 · the holder hook never reads HOUSE_BOT_ENGINE and never loads fire.ts or the house bet function",
      !/HOUSE_BOT_ENGINE|placeHouseBet|from "\.\/fire"/.test(src));
    ok("19.2 · ruling 122 · ONE apply — the hook and the sweep both call applyHolderCauses — and the only status write here is the cause-set rewrite (stopBot and voidHouseConsent own the rest)",
      (src.match(/applyHolderCauses\(/g) ?? []).length === 3 && (src.match(/houseBotStore\.setStatus\(/g) ?? []).length === 1,
      j({ applies: (src.match(/applyHolderCauses\(/g) ?? []).length, setStatus: (src.match(/houseBotStore\.setStatus\(/g) ?? []).length }));
    ok("19.3 · ruling 133 · the credential branch is guarded by the pause's own detail, not by who claimed the alert key first",
      /!pausedByThisChange\(bot, pw\)/.test(src)
        && /bot\.pauseReason === "PASSWORD_CHANGED" && bot\.pauseDetail\?\.method === pw\.method/.test(src));
  });
}

await guard("19", async () => {
  const w = await loadWorld();
  if (!(await w.db.user.findById(WORLD_OFFICER))) await w.user({ id: WORLD_OFFICER, role: "ADMIN" });
  await w.limits();
  const S = HDAL;
  const msg = (e: unknown) => String((e as Error)?.message ?? e);
  // Every call a mutation can make throw is caught and asserted (E25's lesson).
  const safe = async (fn: () => Promise<Any>): Promise<Any> => { try { return await fn(); } catch (e) { return { threw: msg(e) }; } };
  const iso = () => new Date().toISOString();
  const newHash = () => `hash_holder_${crypto.randomUUID()}`;
  /** The hash `world.bot()` seeds every holder with — 19.J0 proves the fixture starts from ITS fingerprint. */
  const { HOLDER_HASH: HOLDER_HASH_19 }: Any = await import("./house-bot-world.mts");
  const botRow = (id: string) => S.houseBotStore.get(id) as Promise<Any>;
  const eventsOf = async (botId: string, kinds?: string[]) =>
    ((await S.houseBotEventStore.listByBot(botId, { limit: 500, ...(kinds ? { kinds } : {}) })).rows as Any[]);
  const causeCodes = (b: Any) => ((b?.pauseDetail?.causes ?? []) as Any[]).map((c) => c.code).sort().join(",");
  const auditsFor = async (botId: string) => { await auditFlush(); return (getAuditPage({ limit: 10_000 }) as Any[]).filter((e) => e.targetId === botId); };
  const retire = async (botId: string) => {
    const b = await botRow(botId);
    if (b && b.status !== "REMOVED") {
      await S.houseBotStore.setStatus(botId, {
        from: [b.status], to: "REMOVED", pauseReason: null, pausedFromStatus: null,
        removal: { byId: WORLD_OFFICER, reason: "section 19 fixture", cause: "MANUAL" },
      });
    }
  };

  // ⛔ The sweep reads EVERY non-REMOVED bot, so earlier sections' bots would be decided here too (and their holders
  // carry causes those sections planted). Only §19's own bots may be live while §19 runs.
  await S.houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");
  for (const b of (await S.houseBotStore.listNonRemoved()) as Any[]) await retire(b.id);
  ok("19.4 · fixture · no bot from an earlier section is left live for the sweep", ((await S.houseBotStore.listNonRemoved()) as Any[]).length === 0);
  // 04 A2's test runs every row with the master switch OFF; R6 keeps the hook and the sweep running whatever it says.
  await safe(() => w.switchOff());

  const recorder = (o: { throwOn?: string } = {}) => {
    const calls: Any[] = [];
    const push = (fn: string, rec: Any) => {
      calls.push({ fn, inLock: L.inLock() || L.currentLockTx() != null, ...rec });
      if (o.throwOn === fn) throw new Error(`injected ${fn} failure`);
    };
    const alerts = {
      passwordPaused: async (bot: Any, ch: Any) => push("passwordPaused", { botId: bot.id, userId: bot.userId, status: bot.status, ...ch }),
      passwordChanged: async (bot: Any, ch: Any) => push("passwordChanged", { botId: bot.id, userId: bot.userId, status: bot.status, ...ch }),
      botStopped: async (bot: Any, ch: Any) => push("botStopped", { botId: bot.id, userId: bot.userId, status: bot.status, ...ch }),
      causeAdded: async (bot: Any, c: Any) => push("causeAdded", { botId: bot.id, userId: bot.userId, code: c.code }),
      causeCleared: async (bot: Any, code: string) => push("causeCleared", { botId: bot.id, userId: bot.userId, code }),
      holderLockedOut: async (bot: Any, until: string | null) => push("holderLockedOut", { botId: bot.id, userId: bot.userId, until }),
      officerSetEmail: async (bot: Any) => push("officerSetEmail", { botId: bot.id, userId: bot.userId }),
      breakEnded: async (bot: Any, until: string) => push("breakEnded", { botId: bot.id, userId: bot.userId, until }),
      // ⛔ A TRAP, not a channel (D19c, C4 ruling 149): `HolderAlerts` has no holder member any more. If the hook ever
      // called one, it would record `notice:<kind>` here and break every exact call sequence below.
      holderNotice: async (userId: string, kind: string) => push("holderNotice", { userId, kind }),
    };
    const label = (c: Any) => c.fn === "holderNotice" ? `notice:${c.kind}`
      : (c.fn === "causeAdded" || c.fn === "causeCleared") ? `${c.fn}:${c.code}` : c.fn;
    const of = (userId: string) => calls.filter((c) => c.userId === userId);
    return {
      alerts, calls, of,
      fns: (userId: string) => of(userId).map(label),
      n: (userId: string, fn: string) => of(userId).filter((c) => label(c) === fn || c.fn === fn).length,
    };
  };
  const quietEngine: Any = { placed: async () => {}, once: async () => {}, security: async () => {}, switchedOff: async () => {}, botStopped: async () => {} };
  const hook = (userId: string, event: string, rec: Any, meta?: Any) =>
    safe(() => HH.onHolderAccountChangedWith(userId, event, { alerts: rec.alerts, ...(meta ? { meta } : {}) }));
  const sweep = (rec: Any) => safe(() => HH.holderSweep({ alerts: rec.alerts }));

  /** Every write and read the hook can make, counted while `fn` runs (A2: "a user with no bot gets zero extra writes"). */
  const spyWrites = async (fn: () => Promise<Any>): Promise<Any> => {
    const seen: string[] = [];
    const patched: Any[] = [];
    const targets: Any[] = [
      [S.houseBotStore, "findLiveByUserId"], [S.houseBotStore, "get"], [S.houseBotStore, "setStatus"],
      [S.houseBotStore, "setConsentVoid"], [S.houseBotStore, "setCredentialChanged"], [S.houseBotEventStore, "append"],
      [S.houseBotAlertOnceStore, "claim"], [S.houseBotAlertOnceStore, "claimWithEatSuffix"], [S.houseBotIntentStore, "cancelLive"],
    ];
    for (const [obj, name] of targets) {
      const orig = obj[name];
      patched.push([obj, name, orig]);
      obj[name] = async (...args: Any[]) => { seen.push(name); return orig.apply(obj, args); };
    }
    try { return { result: await fn(), seen }; } finally { for (const [obj, name, orig] of patched) obj[name] = orig; }
  };

  /* ── 19.5–19.8 · what the hook does with no bot, a removed bot, a wrong event and the engine switched off ── */
  {
    const stranger = await w.user({ passwordHash: "hash_stranger" });
    const rec = recorder();
    const spied = await spyWrites(() => hook(stranger, "PASSWORD_SELF_CHANGE", rec));
    ok("19.5 · A2 · a user with no bot costs ONE indexed read and writes nothing",
      spied.result?.kind === "noBot" && j(spied.seen) === j(["findLiveByUserId"]) && rec.calls.length === 0, j(spied));

    const gone = await w.bot();
    await retire(gone.botId);
    const recG = recorder();
    const rG = await hook(gone.userId, "ACCOUNT_CLOSED", recG);
    ok("19.6 · a REMOVED bot is no live bot: the hook returns before reading the holder and tells nobody",
      rG?.kind === "noBot" && recG.calls.length === 0, j(rG));

    const hint = await w.bot();
    const recH = recorder();
    await w.setUserFields(hint.userId, { passwordHash: newHash(), passwordSetVia: "SELF_CHANGE", passwordSetAt: iso() });
    const rH = await hook(hint.userId, "ACCOUNT_CLOSED", recH); // a wrong or stale event
    const botH = await botRow(hint.botId);
    ok("19.7 · ⭐ ruling 121 · the event is only a hint: a stale ACCOUNT_CLOSED event on an open account applies the causes that were READ (PASSWORD_CHANGED), never a removal",
      rH?.applied?.kind === "paused" && botH.status === "AUTO_PAUSED" && botH.pauseReason === "PASSWORD_CHANGED" && botH.removedCause == null, j({ rH, botH: { status: botH.status, reason: botH.pauseReason } }));
    await retire(hint.botId);

    const env = await w.bot();
    const recE = recorder();
    const prevEnv = process.env[K.HOUSE_BOT_ENGINE_ENV];
    process.env[K.HOUSE_BOT_ENGINE_ENV] = "false";
    let rE: Any = null;
    try {
      await w.setUserFields(env.userId, { status: "SUSPENDED" });
      rE = await hook(env.userId, "SUSPENDED", recE);
    } finally {
      if (prevEnv === undefined) delete process.env[K.HOUSE_BOT_ENGINE_ENV];
      else process.env[K.HOUSE_BOT_ENGINE_ENV] = prevEnv;
    }
    ok("19.8 · R6, ruling 127 · the holder hook runs whatever HOUSE_BOT_ENGINE says (the bot is still stopped with the engine switched off)",
      rE?.applied?.kind === "paused" && (await botRow(env.botId)).pauseReason === "ACCOUNT_SUSPENDED", j(rE));
    await retire(env.botId);

    // 19.8b · R6, ruling 245 · THE CLOSURE with the engine off, which nothing covered at HEAD.
    // 19.8 above is a SUSPENSION (the bot is paused, not removed); §19 row 5's closure runs with
    // HOUSE_BOT_ENGINE UNSET; and lifecycle 3.3 only shows that the L2 SWEEP reads no env. So the one
    // path R6 actually depends on — a holder closes their account while the engine is switched off —
    // had no case. It matters because erasure's live-bot refusal (04 A5) is the BACKSTOP for this: if
    // a closure with the engine off left the bot alive, every erasure on that account would refuse,
    // and a desk would keep staking from an account its owner has closed.
    //
    // ⚠️ Ruling 156's suspension is not needed here and is deliberately not taken: `setUserFields`
    // is a direct DAL write, so no platform writer fires the in-app hook, and this case drives the
    // hook itself exactly once. Suspending it would only hide a race that cannot happen.
    const envC = await w.bot();
    const recC = recorder();
    const prevEnvC = process.env[K.HOUSE_BOT_ENGINE_ENV];
    process.env[K.HOUSE_BOT_ENGINE_ENV] = "false";
    let rC: Any = null;
    let duringEnvC: string | undefined = "not read";
    try {
      await w.setUserFields(envC.userId, { status: "CLOSED", closedAt: iso() });
      rC = await hook(envC.userId, "ACCOUNT_CLOSED", recC);
      duringEnvC = process.env[K.HOUSE_BOT_ENGINE_ENV];
    } finally {
      if (prevEnvC === undefined) delete process.env[K.HOUSE_BOT_ENGINE_ENV];
      else process.env[K.HOUSE_BOT_ENGINE_ENV] = prevEnvC;
    }
    const botC = await botRow(envC.botId);
    const envReadC = process.env[K.HOUSE_BOT_ENGINE_ENV];
    ok("19.8b · R6, ruling 245 · a CLOSED account with HOUSE_BOT_ENGINE=false still leaves the bot REMOVED(ACCOUNT_CLOSED), and the owner is told — the engine switch never keeps a desk alive on an account its holder has closed",
      rC?.kind === "applied" && rC?.applied?.kind === "removed" && botC.status === "REMOVED"
        && botC.removedCause === "ACCOUNT_CLOSED" && recC.n(envC.userId, "botStopped") === 1,
      j({ rC, status: botC.status, cause: botC.removedCause, fns: recC.fns(envC.userId) }));
    ok("19.8b-env · CONTROL · the env really READ \"false\" at the moment the hook ran, and is restored afterwards — an unset variable would make 19.8b the same case as §19 row 5, which already passes",
      duringEnvC === "false" && envReadC === prevEnvC,
      `prev=${String(prevEnvC)} during=${String(duringEnvC)} after=${String(envReadC)}`);
    await retire(envC.botId);
  }

  /* ── 19.A · every A2 row, first through the hook, then through the sweep with no hook at all ── */
  const pwChange = (via: string) => async (u: string) => { await w.setUserFields(u, { passwordHash: newHash(), passwordSetVia: via, passwordSetAt: iso() }); };
  const ROWS: Any[] = [
    { n: "1", what: "password changed in settings", event: "PASSWORD_SELF_CHANGE", change: pwChange("SELF_CHANGE"),
      status: "AUTO_PAUSED", reason: "PASSWORD_CHANGED", causes: "PASSWORD_CHANGED", pw: "SELF_CHANGE",
      fns: ["passwordPaused"], events: ["AUTO_PAUSED"] },
    { n: "2", what: "a reset link", event: "PASSWORD_RESET_LINK", change: pwChange("RESET_LINK"),
      status: "AUTO_PAUSED", reason: "PASSWORD_CHANGED", causes: "PASSWORD_CHANGED", pw: "RESET_LINK",
      fns: ["passwordPaused"], events: ["AUTO_PAUSED"] },
    { n: "3", what: "support's temporary password", event: "PASSWORD_OFFICER_TEMP", change: pwChange("OFFICER_TEMP"),
      status: "AUTO_PAUSED", reason: "PASSWORD_CHANGED", causes: "PASSWORD_CHANGED", pw: "OFFICER_TEMP",
      fns: ["passwordPaused"], events: ["AUTO_PAUSED"] },
    { n: "5", what: "the account closed", event: "ACCOUNT_CLOSED", change: async (u: string) => { await w.setUserFields(u, { status: "CLOSED", closedAt: iso() }); },
      removed: true, fns: ["botStopped"], events: ["REMOVED"] },
    { n: "6", what: "self-exclusion", event: "SELF_EXCLUDED", change: async (u: string) => { await RG19.selfExclude(u, "24h"); },
      status: "AUTO_PAUSED", reason: "SELF_EXCLUDED", voidCause: "SELF_EXCLUDED", causes: "SELF_EXCLUDED,WALLET_FROZEN",
      fns: ["botStopped"], events: ["AUTO_PAUSED", "CONSENT_VOIDED"] },
    { n: "7", what: "a cooling-off break", event: "COOLING_OFF", change: async (u: string) => { await RG19.coolOff(u, "1h"); },
      status: "AUTO_PAUSED", reason: "COOLING_OFF", voidCause: "COOLING_OFF", causes: "COOLING_OFF",
      fns: ["botStopped"], events: ["AUTO_PAUSED", "CONSENT_VOIDED"] },
    { n: "8", what: "his own daily loss limit", event: "LOSS_LIMIT_SET",
      change: async (u: string) => { const cur = await RG19.getRgSettings(u); await w.db.responsible.upsert({ ...cur, dailyLossLimit: 500 }); },
      status: "AUTO_PAUSED", reason: "OWNER_LOSS_LIMIT", causes: "OWNER_LOSS_LIMIT", fns: ["botStopped"], events: ["AUTO_PAUSED"] },
    { n: "9", what: "suspended by an officer", event: "SUSPENDED", change: async (u: string) => { await w.setUserFields(u, { status: "SUSPENDED" }); },
      status: "AUTO_PAUSED", reason: "ACCOUNT_SUSPENDED", causes: "ACCOUNT_SUSPENDED", fns: ["botStopped"], events: ["AUTO_PAUSED"] },
    { n: "10", what: "an officer's wallet hold", event: "WALLET_FREEZE", change: async (u: string) => { await WF19.freezeWalletByOfficer(WORLD_OFFICER, u, "section 19 fixture hold"); },
      status: "AUTO_PAUSED", reason: "WALLET_FROZEN", causes: "WALLET_FROZEN", fns: ["botStopped"], events: ["AUTO_PAUSED"] },
    { n: "11", what: "a final identity refusal", event: "IDENTITY_REFUSED", optional: true,
      change: async (u: string) => {
        await w.db.kyc.upsert({
          id: `kyc_${u}`, userId: u, status: "REJECTED", rejectReason: "UNDERAGE", rejectNote: null, fullName: "Fixture", dob: "2010-01-01",
          documents: [], reviewerId: WORLD_OFFICER, reviewedAt: iso(), submittedAt: iso(), createdAt: iso(), updatedAt: iso(),
        });
      },
      status: "AUTO_PAUSED", reason: "IDENTITY_REFUSED", voidCause: "IDENTITY_REFUSED", causes: "IDENTITY_REFUSED",
      fns: ["botStopped"], events: ["AUTO_PAUSED", "CONSENT_VOIDED"] },
    { n: "12", what: "promoted to staff", event: "ROLE_CHANGED", change: async (u: string) => { await w.setUserFields(u, { role: "ADMIN" }); },
      status: "AUTO_PAUSED", reason: "ROLE_CHANGED", causes: "ROLE_CHANGED", fns: ["botStopped"], events: ["AUTO_PAUSED"] },
    { n: "13", what: "approved as an agent", event: "ROLE_CHANGED", change: async (u: string) => { await w.setUserFields(u, { role: "AGENT" }); },
      status: "AUTO_PAUSED", reason: "ROLE_CHANGED", causes: "ROLE_CHANGED", fns: ["botStopped"], events: ["AUTO_PAUSED"] },
    { n: "14", what: "an erasure request filed", event: "ERASURE_REQUEST", change: async (u: string) => { PRIV19.fileDsarRequest({ userId: u, type: "ERASURE" }); },
      status: "AUTO_PAUSED", reason: "HOLDER_ERASURE_REQUEST", voidCause: "HOLDER_ERASURE_REQUEST", causes: "HOLDER_ERASURE_REQUEST",
      fns: ["botStopped"], events: ["AUTO_PAUSED", "CONSENT_VOIDED"] },
  ];

  const runRow = async (r: Any, mode: "HOOK" | "SWEEP"): Promise<Any> => {
    const b = await w.bot();
    const m = await w.poll();
    const live = await w.intent(b, m.id);
    const rec = recorder();
    const before = new Set((await eventsOf(b.botId)).map((e: Any) => e.id));
    const fixture = await safe(() => r.change(b.userId));
    if (fixture?.threw) return { b, notMeasured: fixture.threw };
    const res = mode === "HOOK" ? await hook(b.userId, r.event, rec) : await sweep(rec);
    const bot = await botRow(b.botId);
    const fresh = (await eventsOf(b.botId)).filter((e: Any) => !before.has(e.id));
    const stop = rec.of(b.userId).find((c: Any) => c.fn === "botStopped" || c.fn === "passwordPaused");
    const a1Call = rec.of(b.userId).find((c: Any) => c.fn === "passwordPaused") ?? null;
    const audits = (await auditsFor(b.botId)).map((a: Any) => a.action);
    const shape = {
      status: bot?.status, reason: bot?.pauseReason ?? null, removedCause: bot?.removedCause ?? null,
      voidCause: bot?.consentVoidCause ?? null, causes: causeCodes(bot), fns: rec.fns(b.userId), events: fresh.map((e: Any) => e.kind).sort(),
    };
    const out = {
      ...shape, res, detectedBy: bot?.pauseDetail?.detectedBy ?? null, detail: bot?.pauseDetail ?? null,
      cancelled: stop?.cancelled ?? null, a1: a1Call, intent: (await S.houseBotIntentStore.get(live.id))?.status,
      anyInLock: rec.of(b.userId).some((c: Any) => c.inLock), audits,
    };
    // Whichever path did NOT run must now find nothing left to do.
    const rec2 = recorder();
    const eventsBefore2 = (await eventsOf(b.botId)).length;
    if (mode === "HOOK") await sweep(rec2); else await hook(b.userId, r.event, rec2);
    const again = { fns: rec2.fns(b.userId), newEvents: (await eventsOf(b.botId)).length - eventsBefore2, status: (await botRow(b.botId))?.status };
    return { b, out, again, shape };
  };

  const seen: Record<string, Any> = {};
  for (const r of ROWS) {
    for (const mode of ["HOOK", "SWEEP"] as const) {
      const got = await runRow(r, mode);
      if (got.notMeasured) {
        ok(`19.A${r.n}.${mode} · NOT MEASURED on this store — the fixture row could not be written (${String(got.notMeasured).slice(0, 80)})`, r.optional === true && STORE === "postgres");
        await retire(got.b.botId);
        continue;
      }
      const o = got.out;
      const stateOk = r.removed
        ? o.status === "REMOVED" && o.removedCause === "ACCOUNT_CLOSED"
        : o.status === r.status && o.reason === r.reason && o.voidCause === (r.voidCause ?? null) && o.causes === r.causes && o.detectedBy === mode;
      // A1 for a change that stopped a RUNNING bot is never the "again" variant (02 §2.2 rows 91 and 93).
      const pwOk = !r.pw || (o.detail?.method === r.pw && o.detail?.officerReset === (r.pw === "OFFICER_TEMP") && o.detail?.changedAt != null
        && o.a1?.again === false && o.a1?.cancelled === 1);
      const resOk = mode === "HOOK" ? o.res?.kind === "applied" : o.res?.changed >= 1 && o.res?.failed === 0;
      ok(`19.A${r.n}.${mode} · A2 row ${r.n} (${r.what}) → ${r.removed ? "REMOVED(ACCOUNT_CLOSED)" : `${r.status}(${r.reason})`}${r.voidCause ? ` · consent void ${r.voidCause}` : ""} · alerts ${r.fns.join(" + ")} · events ${r.events.join(" + ")} · the queued stake cancelled · every alert after the lock`,
        stateOk && pwOk && resOk && j(o.fns) === j(r.fns) && j(o.events) === j(r.events)
          && o.cancelled === 1 && o.intent === "CANCELLED" && o.anyInLock === false
          && o.audits.includes(r.removed ? "house_bot.removed" : "house_bot.auto_paused"),
        j({ ...o, detail: undefined, res: undefined }));
      ok(`19.A${r.n}.${mode}b · idempotent · the ${mode === "HOOK" ? "sweep" : "hook"} that follows it writes no event and sends nothing`,
        got.again.fns.length === 0 && got.again.newEvents === 0 && got.again.status === o.status, j(got.again));
      seen[`${r.n}.${mode}`] = got.shape;
      await retire(got.b.botId);
    }
    const h = seen[`${r.n}.HOOK`], s = seen[`${r.n}.SWEEP`];
    if (h && s) {
      ok(`19.A${r.n}.same · ⭐ 04 A2 · with the hook disabled the L2 sweep reaches the same status, cause set, alerts and events`, j(h) === j(s), j({ hook: h, sweep: s }));
    }
  }

  /* ── 19.B · a bot that is already stopped: the cause set, its events and its bells (ruling 124) ── */
  {
    const b = await w.bot();
    await S.houseBotStore.setStatus(b.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: "ACTIVE" });
    const rec = recorder();
    await w.setUserFields(b.userId, { status: "SUSPENDED" });
    const r1 = await hook(b.userId, "SUSPENDED", rec);
    let bot = await botRow(b.botId);
    const added1 = await eventsOf(b.botId, ["HOLDER_CAUSE_ADDED"]);
    ok("19.B1 · ruling 124 · a new cause on a PAUSED bot keeps its status and reason, records the cause set, writes ONE HOLDER_CAUSE_ADDED {cause, detectedBy} and rings ONE cause-added bell; no stop alert",
      r1?.applied?.kind === "none" && j(r1?.applied?.added) === j(["ACCOUNT_SUSPENDED"]) && bot.status === "PAUSED" && bot.pauseReason === "MANUAL"
        && causeCodes(bot) === "ACCOUNT_SUSPENDED" && bot.pauseDetail?.detectedBy === "HOOK"
        && added1.length === 1 && added1[0].payload?.cause === "ACCOUNT_SUSPENDED" && added1[0].payload?.detectedBy === "HOOK"
        && j(rec.fns(b.userId)) === j(["causeAdded:ACCOUNT_SUSPENDED"]),
      j({ r1, status: bot.status, causes: causeCodes(bot), added: added1.length, fns: rec.fns(b.userId) }));

    const rec2 = recorder();
    await hook(b.userId, "SUSPENDED", rec2);
    await sweep(rec2);
    ok("19.B2 · ⭐ ruling 124 · the same cause seen again by the hook and by the sweep writes nothing and rings nothing — the cause-set rewrite IS the dedupe",
      rec2.of(b.userId).length === 0 && (await eventsOf(b.botId, ["HOLDER_CAUSE_ADDED"])).length === 1, j(rec2.fns(b.userId)));

    const rec3 = recorder();
    await w.setUserFields(b.userId, { role: "ADMIN" });
    await Promise.all([hook(b.userId, "ROLE_CHANGED", rec3), sweep(rec3)]);
    bot = await botRow(b.botId);
    const roleEvents = (await eventsOf(b.botId, ["HOLDER_CAUSE_ADDED"])).filter((e: Any) => e.payload?.cause === "ROLE_CHANGED");
    ok("19.B3 · a hook and a sweep racing on one new cause → ONE event, ONE bell, and NO holder notice (A2 rows 12–13; D19c)",
      roleEvents.length === 1 && rec3.n(b.userId, "causeAdded:ROLE_CHANGED") === 1 && rec3.n(b.userId, "notice:role_changed") === 0
        && causeCodes(bot) === "ACCOUNT_SUSPENDED,ROLE_CHANGED",
      j({ events: roleEvents.length, fns: rec3.fns(b.userId), causes: causeCodes(bot) }));

    const rec4 = recorder();
    await w.setUserFields(b.userId, { status: "ACTIVE" });
    await sweep(rec4);
    bot = await botRow(b.botId);
    ok("19.B4 · C13 · a recorded cause that is no longer live rings ONE cause-cleared bell and leaves the set; the bot stays PAUSED (it never resumes by itself)",
      j(rec4.fns(b.userId)) === j(["causeCleared:ACCOUNT_SUSPENDED"]) && causeCodes(bot) === "ROLE_CHANGED"
        && bot.status === "PAUSED" && bot.pauseReason === "MANUAL", j({ fns: rec4.fns(b.userId), causes: causeCodes(bot), status: bot.status }));
    const rec5 = recorder();
    await sweep(rec5);
    ok("19.B5 · …and the next sweep rings no second cleared bell", rec5.of(b.userId).length === 0, j(rec5.fns(b.userId)));

    const rec6 = recorder();
    await w.setUserFields(b.userId, { role: "PLAYER" });
    await sweep(rec6);
    bot = await botRow(b.botId);
    ok("19.B6 · the last cause clears too: an empty cause set, the status and reason still untouched",
      j(rec6.fns(b.userId)) === j(["causeCleared:ROLE_CHANGED"]) && causeCodes(bot) === "" && bot.status === "PAUSED", j({ fns: rec6.fns(b.userId), causes: causeCodes(bot) }));

    const rec7 = recorder();
    await RG19.selfExclude(b.userId, "24h");
    const r7 = await hook(b.userId, "SELF_EXCLUDED", rec7);
    bot = await botRow(b.botId);
    const voidEvents = (await eventsOf(b.botId, ["HOLDER_CAUSE_ADDED"])).filter((e: Any) => e.payload?.cause === "SELF_EXCLUDED");
    const frozenEvents = (await eventsOf(b.botId, ["HOLDER_CAUSE_ADDED"])).filter((e: Any) => e.payload?.cause === "WALLET_FROZEN");
    ok("19.B7 · A3 · a consent-voiding cause on a PAUSED bot voids consent without moving the status: ONE SELF_EXCLUDED event (the void writes its own), ONE WALLET_FROZEN event, a bell for each, no stop alert",
      r7?.applied?.kind === "voided" && bot.status === "PAUSED" && bot.pauseReason === "MANUAL" && bot.consentVoidCause === "SELF_EXCLUDED"
        && voidEvents.length === 1 && frozenEvents.length === 1
        && rec7.n(b.userId, "causeAdded:SELF_EXCLUDED") === 1 && rec7.n(b.userId, "causeAdded:WALLET_FROZEN") === 1 && rec7.n(b.userId, "botStopped") === 0,
      j({ r7, status: bot.status, voidCause: bot.consentVoidCause, fns: rec7.fns(b.userId) }));
    await retire(b.botId);
  }

  /* ── 19.C · PLAN §14 and 02 §2.2 · a password change on a bot that is not running ── */
  {
    const b = await w.bot();
    await S.houseBotStore.setStatus(b.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: "ACTIVE" });
    const rec = recorder();
    const setAt = iso();
    await w.setUserFields(b.userId, { passwordHash: newHash(), passwordSetVia: "SELF_CHANGE", passwordSetAt: setAt });
    const r1 = await hook(b.userId, "PASSWORD_SELF_CHANGE", rec);
    let bot = await botRow(b.botId);
    const cred = await eventsOf(b.botId, ["CREDENTIAL_CHANGED"]);
    const audits = (await auditsFor(b.botId)).filter((a: Any) => a.action === "house_bot.credential_changed");
    ok("19.C1 · 02 §2.2 row 92 · PAUSED(MANUAL) + a password change → the status and reason stand, the credential fields are stamped, ONE CREDENTIAL_CHANGED {method, changedAt, detectedBy}, A2 once, no A1, no cause-added event or bell",
      r1?.applied?.kind === "credential" && bot.status === "PAUSED" && bot.pauseReason === "MANUAL"
        && bot.credentialChangedVia === "SELF_CHANGE" && bot.credentialChangedAt != null
        && cred.length === 1 && cred[0].payload?.method === "SELF_CHANGE" && Date.parse(cred[0].payload?.changedAt) === Date.parse(setAt) && cred[0].payload?.detectedBy === "HOOK"
        && (await eventsOf(b.botId, ["HOLDER_CAUSE_ADDED"])).filter((e: Any) => e.payload?.cause === "PASSWORD_CHANGED").length === 0
        && j(rec.fns(b.userId)) === j(["passwordChanged"]) && causeCodes(bot) === "PASSWORD_CHANGED",
      j({ r1, status: bot.status, via: bot.credentialChangedVia, cred: cred.length, fns: rec.fns(b.userId) }));
    ok("19.C1b · ruling 28 · its record is the SECURITY audit house_bot.credential_changed by system_house_bot, linked from the event",
      audits.length === 1 && audits[0].actorId === K.SYSTEM_HOUSE_BOT_ACTOR && audits[0].category === "SECURITY" && cred[0]?.auditId === audits[0].id,
      j({ audits: audits.map((a: Any) => ({ actor: a.actorId, cat: a.category })), auditId: cred[0]?.auditId }));

    const rec2 = recorder();
    await sweep(rec2);
    ok("19.C2 · the sweep's later look at the SAME change → no second A2 and no second record (the pw:<botId>:<fingerprint> claim)",
      rec2.of(b.userId).length === 0 && (await eventsOf(b.botId, ["CREDENTIAL_CHANGED"])).length === 1, j(rec2.fns(b.userId)));

    const rec3 = recorder();
    await w.setUserFields(b.userId, { passwordHash: newHash(), passwordSetVia: "RESET_LINK", passwordSetAt: iso() });
    await sweep(rec3);
    bot = await botRow(b.botId);
    ok("19.C3 · X4 · changed again before re-verify → a new fingerprint alerts again (A2, method RESET_LINK) and records a second CREDENTIAL_CHANGED",
      j(rec3.fns(b.userId)) === j(["passwordChanged"]) && rec3.of(b.userId)[0].method === "RESET_LINK"
        && (await eventsOf(b.botId, ["CREDENTIAL_CHANGED"])).length === 2 && bot.credentialChangedVia === "RESET_LINK" && bot.pauseReason === "MANUAL",
      j({ fns: rec3.fns(b.userId), cred: (await eventsOf(b.botId, ["CREDENTIAL_CHANGED"])).length }));
    await retire(b.botId);

    const b4 = await w.bot();
    await w.setUserFields(b4.userId, { status: "SUSPENDED" });
    await hook(b4.userId, "SUSPENDED", recorder());
    const rec4 = recorder();
    await w.setUserFields(b4.userId, { passwordHash: newHash(), passwordSetVia: "OFFICER_TEMP", passwordSetAt: iso() });
    await hook(b4.userId, "PASSWORD_OFFICER_TEMP", rec4);
    const bot4 = await botRow(b4.botId);
    ok("19.C4 · 02 §2.2 row 94 · AUTO_PAUSED(ACCOUNT_SUSPENDED) + an officer's temporary password → status and reason kept, OFFICER_TEMP recorded, A2, and NO holder notice (D19c; A2 row 3)",
      bot4.status === "AUTO_PAUSED" && bot4.pauseReason === "ACCOUNT_SUSPENDED" && bot4.credentialChangedVia === "OFFICER_TEMP"
        && j(rec4.fns(b4.userId)) === j(["passwordChanged"]) && rec4.of(b4.userId)[0].method === "OFFICER_TEMP",
      j({ status: bot4.status, reason: bot4.pauseReason, fns: rec4.fns(b4.userId) }));
    await retire(b4.botId);

    const b5 = await w.bot();
    const rec5 = recorder();
    await w.setUserFields(b5.userId, { passwordHash: newHash(), passwordSetVia: "SELF_CHANGE", passwordSetAt: iso() });
    await Promise.all([hook(b5.userId, "PASSWORD_SELF_CHANGE", rec5), sweep(rec5), hook(b5.userId, "PASSWORD_SELF_CHANGE", rec5)]);
    const bot5 = await botRow(b5.botId);
    ok("19.C5 · ruling 125 · two hooks and a sweep racing over one ACTIVE bot's password change → ONE A1, ONE AUTO_PAUSED event, NO holder notice, and never an A2",
      rec5.n(b5.userId, "passwordPaused") === 1 && rec5.n(b5.userId, "notice:password_paused") === 0 && rec5.n(b5.userId, "passwordChanged") === 0
        && (await eventsOf(b5.botId, ["AUTO_PAUSED"])).length === 1 && (await eventsOf(b5.botId, ["CREDENTIAL_CHANGED"])).length === 0
        && bot5.status === "AUTO_PAUSED" && bot5.pauseReason === "PASSWORD_CHANGED",
      j({ fns: rec5.fns(b5.userId), auto: (await eventsOf(b5.botId, ["AUTO_PAUSED"])).length }));
    await retire(b5.botId);

    /* ⭐ ruling 133 · the window between a pause and its A1 — the race that made a second look record the change again. */
    const bR = await w.bot();
    await w.setUserFields(bR.userId, { passwordHash: newHash(), passwordSetVia: "SELF_CHANGE", passwordSetAt: iso() });
    const readR = await CTL.readBotAndHolder(bR.botId, { ownerLossStakeTzs: 1_000 });
    const causeR = readR.causes.find((c: Any) => c.code === "PASSWORD_CHANGED");
    const moved = await OC.stopBot(bR.botId, {
      to: "AUTO_PAUSED", cause: "PASSWORD_CHANGED",
      detail: { causes: readR.causes, detectedBy: "HOOK", method: causeR.method, changedAt: causeR.changedAt, officerReset: false },
    }, quietEngine);
    const recR = recorder();
    await sweep(recR);
    const botR = await botRow(bR.botId);
    const keyFree = await S.houseBotAlertOnceStore.claim(K.ALERT_KEY.password(bR.botId, readR.snapshot.fingerprintNow));
    ok("19.C6 · ⭐ rulings 133 and 138 · a look landing between the pause and its A1 records NOTHING — no second CREDENTIAL_CHANGED, no A2 — and pays the ONE A1 the pause still owes",
      moved === true && (await eventsOf(bR.botId, ["CREDENTIAL_CHANGED"])).length === 0
        && recR.n(bR.userId, "passwordChanged") === 0 && recR.n(bR.userId, "passwordPaused") === 1
        && botR.credentialChangedAt == null && keyFree === false,
      j({ moved, cred: (await eventsOf(bR.botId, ["CREDENTIAL_CHANGED"])).length, fns: recR.fns(bR.userId), keyClaimedByRetry: keyFree === false }));

    const rec7 = recorder();
    await w.setUserFields(bR.userId, { passwordHash: newHash(), passwordSetVia: "RESET_LINK", passwordSetAt: iso() });
    await hook(bR.userId, "PASSWORD_RESET_LINK", rec7);
    const botR2 = await botRow(bR.botId);
    ok("19.C7 · ⭐ ruling 134 · 02 §2.2 row 93 · a bot already paused FOR a password change alerts A1 AGAIN on the next change — never A2 — flagged again:true so its body never claims it stopped anything, and records it",
      j(rec7.fns(bR.userId)) === j(["passwordPaused"]) && rec7.of(bR.userId)[0].cancelled === 0 && rec7.of(bR.userId)[0].again === true && rec7.of(bR.userId)[0].method === "RESET_LINK"
        && (await eventsOf(bR.botId, ["CREDENTIAL_CHANGED"])).length === 1 && botR2.credentialChangedVia === "RESET_LINK" && botR2.pauseReason === "PASSWORD_CHANGED",
      j({ fns: rec7.fns(bR.userId), cancelled: rec7.of(bR.userId)[0]?.cancelled, cred: (await eventsOf(bR.botId, ["CREDENTIAL_CHANGED"])).length }));
    await retire(bR.botId);

    const bV = await w.bot();
    await RG19.selfExclude(bV.userId, "24h");
    await w.setUserFields(bV.userId, { passwordHash: newHash(), passwordSetVia: "SELF_CHANGE", passwordSetAt: iso() });
    const recV = recorder();
    await hook(bV.userId, "SELF_EXCLUDED", recV);
    const botV = await botRow(bV.botId);
    ok("19.C8 · ⭐ ruling 135 · a password change that lands while ANOTHER cause stops the same ACTIVE bot is still recorded, with A2 (02 row 94) — neither look may drop it",
      botV.status === "AUTO_PAUSED" && botV.pauseReason === "SELF_EXCLUDED" && botV.credentialChangedVia === "SELF_CHANGE"
        && (await eventsOf(bV.botId, ["CREDENTIAL_CHANGED"])).length === 1
        && recV.n(bV.userId, "passwordChanged") === 1 && recV.n(bV.userId, "passwordPaused") === 0,
      j({ status: botV.status, reason: botV.pauseReason, via: botV.credentialChangedVia, fns: recV.fns(bV.userId) }));
    await retire(bV.botId);

    const bF = await w.bot();
    await w.setUserFields(bF.userId, { passwordHash: newHash(), passwordSetVia: "SELF_CHANGE", passwordSetAt: iso() });
    const recF = recorder({ throwOn: "passwordPaused" });
    const rF = await hook(bF.userId, "PASSWORD_SELF_CHANGE", recF);
    const botF = await botRow(bF.botId);
    ok("19.C9 · ⭐ an A1 whose send FAILS is never replaced by an A2: the pause and its event stand, and no credential record is written for the change that caused the pause",
      rF?.kind === "applied" && botF.status === "AUTO_PAUSED" && botF.pauseReason === "PASSWORD_CHANGED" && botF.credentialChangedAt == null
        && (await eventsOf(bF.botId, ["CREDENTIAL_CHANGED"])).length === 0 && recF.n(bF.userId, "passwordChanged") === 0,
      j({ status: botF.status, cred: botF.credentialChangedAt, fns: recF.fns(bF.userId) }));
    const recF2 = recorder();
    await sweep(recF2);
    ok("19.C9b · ⭐ ruling 138 · the next look pays the A1 the failed send dropped — once, as the STOP alert it was (again:false) — and still writes no credential record",
      recF2.n(bF.userId, "passwordPaused") === 1 && recF2.of(bF.userId)[0]?.again === false && recF2.n(bF.userId, "passwordChanged") === 0
        && (await eventsOf(bF.botId, ["CREDENTIAL_CHANGED"])).length === 0,
      j({ fns: recF2.fns(bF.userId), cred: (await eventsOf(bF.botId, ["CREDENTIAL_CHANGED"])).length }));
    const recF3 = recorder();
    await sweep(recF3);
    ok("19.C9c · …and once it is delivered the claim stands: no third A1", recF3.of(bF.userId).length === 0, j(recF3.fns(bF.userId)));
    await retire(bF.botId);
  }

  /* ── 19.D · rows 16–18: a signal that carries no cause and never stops a bot (ruling 126) ── */
  {
    const b = await w.bot();
    const before = new Set((await eventsOf(b.botId)).map((e: Any) => e.id));
    const rec = recorder();
    const lockedUntil = new Date(Date.now() + 600_000).toISOString();
    await w.setUserFields(b.userId, { lockedUntil });
    await hook(b.userId, "LOCKED_OUT", rec);
    await hook(b.userId, "LOCKED_OUT", rec);
    const bot = await botRow(b.botId);
    const lockBell = rec.of(b.userId).find((c: Any) => c.fn === "holderLockedOut");
    ok("19.D1 · A2 row 16 · a lockout never stops a bot (anyone could lock the holder out): ONE SECURITY bell for the EAT day, carrying when the lockout ends (C13's copy), no status change, no event",
      bot.status === "ACTIVE" && rec.n(b.userId, "holderLockedOut") === 1
        && lockBell?.until != null && Date.parse(lockBell.until) === Date.parse(lockedUntil)
        && (await eventsOf(b.botId)).filter((e: Any) => !before.has(e.id)).length === 0,
      j({ status: bot.status, until: lockBell?.until, fns: rec.fns(b.userId) }));

    const recE = recorder();
    await hook(b.userId, "EMAIL_CHANGED", recE, { byOfficer: false });
    await hook(b.userId, "EMAIL_CHANGED", recE, { byOfficer: true });
    await w.setUserFields(b.userId, { emailSetByOfficerAt: iso() });
    await hook(b.userId, "EMAIL_CHANGED", recE, { byOfficer: true });
    await hook(b.userId, "EMAIL_CHANGED", recE, { byOfficer: true });
    const emailEvents = await eventsOf(b.botId, ["HOLDER_EMAIL_CHANGED"]);
    ok("19.D2 · A2 row 17 · every email change writes HOLDER_EMAIL_CHANGED {byOfficer}; only an officer-set email rings, once per stamp, and an officer claim with no stamp rings nothing",
      emailEvents.length === 4 && emailEvents.filter((e: Any) => e.payload?.byOfficer === true).length === 3 && recE.n(b.userId, "officerSetEmail") === 1,
      j({ events: emailEvents.length, byOfficer: emailEvents.filter((e: Any) => e.payload?.byOfficer === true).length, fns: recE.fns(b.userId) }));

    const rec2fa = recorder();
    await hook(b.userId, "TWO_FA_ON", rec2fa);
    const afterOn = await eventsOf(b.botId, ["HOLDER_2FA_ON", "HOLDER_2FA_OFF"]);
    await hook(b.userId, "TWO_FA_OFF", rec2fa);
    const afterOff = await eventsOf(b.botId, ["HOLDER_2FA_ON", "HOLDER_2FA_OFF"]);
    ok("19.D3 · A2 row 18 (D5) · 2FA writes the event of the change that HAPPENED — on → HOLDER_2FA_ON, off → HOLDER_2FA_OFF, one each — and alerts nobody",
      afterOn.length === 1 && afterOn[0].kind === "HOLDER_2FA_ON"
        && afterOff.length === 2 && afterOff.filter((e: Any) => e.kind === "HOLDER_2FA_OFF").length === 1
        && rec2fa.of(b.userId).length === 0,
      j({ on: afterOn.map((e: Any) => e.kind), off: afterOff.map((e: Any) => e.kind), fns: rec2fa.fns(b.userId) }));

    const recS = recorder();
    const countBefore = (await eventsOf(b.botId)).length;
    await sweep(recS);
    ok("19.D4 · ruling 126 · the L2 sweep never repeats rows 16–18 — none of them leaves a durable signal to compare against",
      recS.of(b.userId).length === 0 && (await eventsOf(b.botId)).length === countBefore && (await botRow(b.botId)).status === "ACTIVE",
      j({ fns: recS.fns(b.userId), before: countBefore, after: (await eventsOf(b.botId)).length }));
    await retire(b.botId);
  }

  /* ── 19.E · C8 · the break that ended (ruling 129) ── */
  {
    const b = await w.bot();
    const rec = recorder();
    await RG19.coolOff(b.userId, "1h");
    await hook(b.userId, "COOLING_OFF", rec);
    const readLive = await CTL.readBotAndHolder(b.botId, { ownerLossStakeTzs: 1_000 });
    const ringsWhileRunning = await HH.breakEnded(readLive, rec.alerts);
    ok("19.E1 · C8 · while the break is still running there is no break-end bell", ringsWhileRunning === false && rec.n(b.userId, "breakEnded") === 0, j({ ringsWhileRunning }));

    const cur = await RG19.getRgSettings(b.userId);
    const ended = new Date(Date.now() - 60_000).toISOString();
    await w.db.responsible.upsert({ ...cur, coolingOffUntil: ended });
    const rec2 = recorder();
    await sweep(rec2);
    const bot = await botRow(b.botId);
    const bell = rec2.of(b.userId).find((c: Any) => c.fn === "breakEnded");
    ok("19.E2 · ⭐ C8, ruling 16 · when the break ends the sweep rings ONCE, keyed on the break's own end; the void still stands as CONSENT_VOID{COOLING_OFF}; no cause-added event, and no cleared bell for the break",
      rec2.n(b.userId, "breakEnded") === 1 && bell != null && Date.parse(bell.until) === Date.parse(ended)
        && causeCodes(bot) === "CONSENT_VOID" && bot.consentVoidCause === "COOLING_OFF" && bot.status === "AUTO_PAUSED"
        && (await eventsOf(b.botId, ["HOLDER_CAUSE_ADDED"])).length === 0
        && rec2.n(b.userId, "causeAdded") === 0 && rec2.n(b.userId, "causeCleared") === 0,
      j({ fns: rec2.fns(b.userId), until: bell?.until, causes: causeCodes(bot), status: bot.status }));

    const rec3 = recorder();
    await sweep(rec3);
    ok("19.E3 · …and the next sweep rings nothing: one bell per break", rec3.of(b.userId).length === 0, j(rec3.fns(b.userId)));
    await retire(b.botId);
  }

  /* ── 19.F · A5 · closure removes the bot from any status, and REMOVED is the end ── */
  {
    const b = await w.bot();
    await S.houseBotStore.setStatus(b.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: "ACTIVE" });
    const rec = recorder();
    await w.setUserFields(b.userId, { status: "CLOSED", closedAt: iso() });
    await hook(b.userId, "ACCOUNT_CLOSED", rec);
    const bot = await botRow(b.botId);
    ok("19.F1 · A5 · a closed account removes the bot from PAUSED too, and the holder is told nothing (D19c)",
      bot.status === "REMOVED" && bot.removedCause === "ACCOUNT_CLOSED" && j(rec.fns(b.userId)) === j(["botStopped"]),
      j({ status: bot.status, cause: bot.removedCause, fns: rec.fns(b.userId) }));

    const recR = recorder();
    const read = await CTL.readBotAndHolder(b.botId, {});
    const spiedR = await spyWrites(() => HH.applyHolderCauses(read, { detectedBy: "SWEEP", alerts: recR.alerts }));
    const applied = spiedR.result;
    ok("19.F2 · ⭐ ruling 123 · REMOVED is the end: an apply on a removed bot makes NO store call at all — every later write is conditional, so only the early return proves it — and tells nobody",
      applied.kind === "none" && applied.added.length === 0 && applied.cleared.length === 0 && recR.calls.length === 0 && j(spiedR.seen) === j([]),
      j({ applied, seen: spiedR.seen }));

    const b3 = await w.bot();
    await w.setUserFields(b3.userId, { status: "SUSPENDED" });
    await hook(b3.userId, "SUSPENDED", recorder());
    const rec3 = recorder();
    await w.setUserFields(b3.userId, { status: "CLOSED", closedAt: iso() });
    await sweep(rec3);
    const bot3 = await botRow(b3.botId);
    ok("19.F3 · …and from AUTO_PAUSED through the sweep, once — ACCOUNT_CLOSED wins over every other cause (no cause-added bell beside it)",
      bot3.status === "REMOVED" && bot3.removedCause === "ACCOUNT_CLOSED"
        && rec3.n(b3.userId, "botStopped") === 1 && rec3.n(b3.userId, "notice:removed") === 0 && rec3.n(b3.userId, "causeAdded") === 0,
      j({ status: bot3.status, fns: rec3.fns(b3.userId) }));
  }

  /* ── 19.G · ruling 130 · the erasure queue is read from its durable copy, and fails closed ── */
  {
    const b = await w.bot();
    if (onPostgres) {
      const key = "privacy.dsar_queue";
      const stored = ((await loadConfig(key)) ?? []) as Any[];
      const foreign = {
        id: `dsar_other_${crypto.randomUUID().slice(0, 8)}`, userId: b.userId, type: "ERASURE", status: "PENDING", reason: null,
        requestedAt: iso(), fulfilledAt: null, fulfilledBy: null, exportRef: null, erasureHeldUntil: null,
      };
      await CS19.saveConfigOrThrow(key, [...stored, foreign]);
      const open = await PRIV19.openErasureRequest(b.userId);
      const rec = recorder();
      await hook(b.userId, "ERASURE_REQUEST", rec);
      const bot = await botRow(b.botId);
      ok("19.G1 · ⭐ ruling 130 · a request filed on ANOTHER container — in the stored queue, absent from this process's array — stops the bot and voids consent",
        open?.id === foreign.id && bot.status === "AUTO_PAUSED" && bot.consentVoidCause === "HOLDER_ERASURE_REQUEST",
        j({ open: open?.id, status: bot.status, voidCause: bot.consentVoidCause }));
      await CS19.saveConfigOrThrow(key, stored);
      await retire(b.botId);

      const b2 = await w.bot();
      await w.setUserFields(b2.userId, { status: "SUSPENDED" });
      const rec2 = recorder();
      let hookRes: Any = null, sweepRes: Any = null, elig: Any = null;
      await prisma().$executeRawUnsafe(`ALTER TABLE "SystemConfig" RENAME TO "SystemConfig_hb19"`);
      try {
        hookRes = await hook(b2.userId, "SUSPENDED", rec2);
        sweepRes = await sweep(rec2);
        elig = await EL19.houseBotEligibility(b2.userId, { context: "start", botId: b2.botId });
      } finally {
        await prisma().$executeRawUnsafe(`ALTER TABLE "SystemConfig_hb19" RENAME TO "SystemConfig"`);
      }
      const bot2 = await botRow(b2.botId);
      ok("19.G2 · ⭐ ruling 130 · an unreadable data-rights queue fails CLOSED: the hook answers failed, the sweep counts the bot as failed, nothing is written or sent, and Start shows ERASURE_UNREADABLE",
        hookRes?.kind === "failed" && sweepRes?.failed >= 1 && bot2.status === "ACTIVE" && rec2.calls.length === 0
          && (elig?.blocking ?? []).some((r: Any) => r.code === "ERASURE_UNREADABLE"),
        j({ hookRes, sweepRes, status: bot2.status, blocking: (elig?.blocking ?? []).map((r: Any) => r.code) }));

      const rec3 = recorder();
      await sweep(rec3);
      ok("19.G3 · …and once the queue reads again the next sweep applies the cause it could not read before",
        (await botRow(b2.botId)).pauseReason === "ACCOUNT_SUSPENDED" && rec3.n(b2.userId, "botStopped") === 1, j({ fns: rec3.fns(b2.userId) }));
      await retire(b2.botId);
    } else {
      ok("19.G1 · NOT MEASURED on the memory store — it keeps no stored config, so 'filed on another container' and 'unreadable queue' exist only on Postgres", STORE === "memory");
      await retire(b.botId);
    }
  }

  /* ── 19.H · a failure never costs the record, and never skips the next bot (ruling 131) ── */
  {
    const b = await w.bot();
    await S.houseBotStore.setStatus(b.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: "ACTIVE" });
    await w.setUserFields(b.userId, { status: "SUSPENDED" });
    const rec = recorder({ throwOn: "causeAdded" });
    const res = await hook(b.userId, "SUSPENDED", rec);
    const bot = await botRow(b.botId);
    const ev = (await eventsOf(b.botId, ["HOLDER_CAUSE_ADDED"]))[0];
    const freed = ev ? await S.houseBotAlertOnceStore.claim(`bot:${b.botId}:CAUSE:ACCOUNT_SUSPENDED:${ev.id}`) : false;
    ok("19.H1 · ruling 131 · a failed cause-added send never fails the apply: the event and the cause set stand, and the claim is given back",
      res?.kind === "applied" && ev != null && causeCodes(bot) === "ACCOUNT_SUSPENDED" && freed === true,
      j({ res, event: ev?.id, freed }));
    await retire(b.botId);

    const bad = await w.bot();
    const good = await w.bot();
    await w.setUserFields(good.userId, { status: "SUSPENDED" });
    const rec2 = recorder();
    const origGet = S.houseBotStore.get;
    let hookRes: Any = null, sweepRes: Any = null;
    S.houseBotStore.get = async (id: string, tx?: Any) => {
      if (id === bad.botId) throw new Error("injected bot read failure");
      return origGet.call(S.houseBotStore, id, tx);
    };
    try {
      hookRes = await hook(bad.userId, "SUSPENDED", rec2);
      sweepRes = await sweep(rec2);
    } finally { S.houseBotStore.get = origGet; }
    ok("19.H2 · a read that throws → the hook answers failed (never a throw to the writer that called it) and the sweep counts that bot and still decides the NEXT one",
      hookRes?.kind === "failed" && sweepRes?.failed >= 1 && sweepRes?.bots >= 2
        && (await botRow(good.botId)).pauseReason === "ACCOUNT_SUSPENDED" && rec2.n(good.userId, "botStopped") === 1,
      j({ hookRes, sweepRes, fns: rec2.fns(good.userId) }));
    await retire(bad.botId);
    await retire(good.botId);
  }

  /* ── 19.I · several live causes at once (04 A3 order) ── */
  {
    const b = await w.bot();
    const m = await w.poll();
    const live = await w.intent(b, m.id);
    const rec = recorder();
    await w.setUserFields(b.userId, { status: "SUSPENDED", passwordHash: newHash(), passwordSetVia: "SELF_CHANGE", passwordSetAt: iso() });
    await hook(b.userId, "SUSPENDED", rec);
    const bot = await botRow(b.botId);
    ok("19.I1 · ⭐ 04 A3 · with several causes live the FIRST in HOLDER_CAUSES order becomes the pause reason (PASSWORD_CHANGED before ACCOUNT_SUSPENDED) and the WHOLE set is recorded, with A1 and the holder's notice",
      bot.status === "AUTO_PAUSED" && bot.pauseReason === "PASSWORD_CHANGED" && causeCodes(bot) === "ACCOUNT_SUSPENDED,PASSWORD_CHANGED"
        && bot.pauseDetail?.method === "SELF_CHANGE" && j(rec.fns(b.userId)) === j(["passwordPaused"])
        && (await S.houseBotIntentStore.get(live.id))?.status === "CANCELLED",
      j({ reason: bot.pauseReason, causes: causeCodes(bot), fns: rec.fns(b.userId) }));
    const rec2 = recorder();
    await sweep(rec2);
    ok("19.I2 · …and the sweep that follows finds the set current: no second bell, no second event",
      rec2.of(b.userId).length === 0, j(rec2.fns(b.userId)));
    await retire(b.botId);
  }

  /* ── 19.J · HB-ACC-16 · a REHASH, and the fingerprint that decides whether it stops the bot ── */
  /**
   * ⛔ THE ROW IS "FUTURE" BUT THE MECHANISM IS PRESENT-DAY AND LIVE. HB-ACC-16: a code change rewrites
   * `passwordHash` with no holder acting — rehash-on-login, a scrypt parameter upgrade, a password set
   * after an OTP sign-in. Expected: EITHER the writer declares `passwordSetVia=REHASH` and refreshes
   * `HouseBot.passwordFingerprint` in the same act, OR the build fails.
   *
   * WHAT WAS ALREADY ASSERTED: the "or the build fails" half, by `test:house-bot-holder-lifecycle` §1
   * (`1.1`–`1.4`, `WRITER_CEILING` 33, with plants at `4.1`/`4.2`/`4.5`) — every `db.user.update` naming
   * `passwordHash` must carry the hook.
   *
   * WHAT NOTHING DROVE, until this section: the ESCAPE HATCH. `PASSWORD_SET_VIA` includes `REHASH`
   * (`constants.ts:168`), `designation.ts:93` words it ("a security update"), and `holderCauses` raises
   * `PASSWORD_CHANGED` ONLY on `s.fingerprintNow !== s.bot.passwordFingerprint` (`consent.ts:97`). The only
   * `REHASH` anywhere under `scripts/` was `test:house-bot-migrations` `d.11`, which proves the DATABASE
   * check constraint accepts the STRING — not that the engine does anything with it.
   *
   * ⚠️ AND A FINDING, SAID PLAINLY RATHER THAN PAPERED OVER: **there is no shipped writer that can refresh
   * `HouseBot.passwordFingerprint` while the bot is ACTIVE.** `setVerified` is the only one and it is
   * PAUSED-only by construction (`PAUSED_ONLY`, `house-bot-dal.ts:2174`). So the row's "in the SAME
   * transaction" contract has no implementation to assert today, and this section does not pretend to
   * assert it. What it drives is the PREDICATE that contract depends on, through the real hook and the real
   * sweep: with the fingerprint refreshed, the same REHASH state raises no cause and the bot runs.
   */
  {
    const PR19: Any = await import("../../src/lib/server/password-reset.ts");
    const PRZ19: Any = await import("../../src/lib/house-bot/pause-reasons.ts");
    const DSG19: Any = await import("../../src/lib/server/house-bot/designation.ts");
    const b = await w.bot();
    const before = await botRow(b.botId);
    ok("19.J0 · fixture · the bot is ACTIVE and its stored fingerprint matches the holder's current hash, so the run below starts from a bot that is really running",
      before.status === "ACTIVE" && before.passwordFingerprint === PR19.passwordFingerprint(HOLDER_HASH_19),
      j({ status: before.status, fp: before.passwordFingerprint }));

    /* (a) PLANTED CONTROL — the DEFECT the row exists to prevent: a rehash that does NOT refresh the
     *     fingerprint. Driven through the REAL hook, not by calling holderCauses and reading its answer. */
    const h1 = newHash();
    const recA = recorder();
    await w.setUserFields(b.userId, { passwordHash: h1, passwordSetVia: "REHASH", passwordSetAt: iso() });
    await hook(b.userId, "PASSWORD_SELF_CHANGE", recA);
    let bot = await botRow(b.botId);
    const pausedEvents = await eventsOf(b.botId, ["AUTO_PAUSED"]);
    const userAfterRehash = await w.db.user.findById(b.userId);
    ok("19.J1 · HB-ACC-16 PLANTED · a REHASH rewrite that does NOT refresh the fingerprint STOPS the bot: AUTO_PAUSED(PASSWORD_CHANGED), one A1 bell, one AUTO_PAUSED event — the half the row exists to prevent, and nothing drove it before",
      bot.status === "AUTO_PAUSED" && bot.pauseReason === "PASSWORD_CHANGED"
        && causeCodes(bot) === "PASSWORD_CHANGED" && j(recA.fns(b.userId)) === j(["passwordPaused"]) && pausedEvents.length === 1,
      j({ status: bot.status, reason: bot.pauseReason, method: bot.pauseDetail?.method, fns: recA.fns(b.userId), events: pausedEvents.length }));
    /* ⛔ MEASURED, NOT ASSUMED — and the first draft of this line asserted the opposite and went red, which is
     * why it is written out. The pause's `method` is **UNKNOWN**, never "REHASH": `CREDENTIAL_CHANGED_VIA` is
     * `PASSWORD_CHANGE_METHODS` (SELF_CHANGE, RESET_LINK, OFFICER_TEMP) plus UNKNOWN, and REHASH is deliberately
     * NOT one of them — a rehash is not a credential change. `consent.ts:98` therefore maps it through
     * `isPasswordChangeMethod(via) ? via : "UNKNOWN"`. The distinction is pinned in BOTH directions below so a
     * later change cannot quietly start reporting a rehash as a holder's own password change. */
    ok("19.J1b · HB-ACC-16 · the USER really carries passwordSetVia REHASH, and the pause reports method UNKNOWN — because REHASH is deliberately absent from CREDENTIAL_CHANGED_VIA (a rehash is not a credential change), so consent.ts maps it through isPasswordChangeMethod to UNKNOWN",
      userAfterRehash?.passwordSetVia === "REHASH" && bot.pauseDetail?.method === "UNKNOWN"
        && !PRZ19.PASSWORD_CHANGE_METHODS.includes("REHASH") && PRZ19.CREDENTIAL_CHANGED_VIA.includes("UNKNOWN"),
      j({ setVia: userAfterRehash?.passwordSetVia, method: bot.pauseDetail?.method, methods: PRZ19.PASSWORD_CHANGE_METHODS }));
    ok("19.J1c · HB-ACC-16 CONTROL · REHASH is still a worded, reachable state elsewhere — wrongPasswordCopy tells the officer the password was changed 'via a security update' — so 19.J1b's UNKNOWN is a deliberate distinction and not a dropped case",
      DSG19.wrongPasswordCopy({ passwordSetAt: new Date().toISOString(), passwordSetVia: "REHASH" }, 2).includes("a security update"),
      DSG19.wrongPasswordCopy({ passwordSetAt: new Date().toISOString(), passwordSetVia: "REHASH" }, 2));

    /* (b) THE ESCAPE HATCH — the fingerprint is refreshed to the hash the holder actually has now, and the
     *     bot runs again. ⚠️ The refresh happens through the only shipped writer (`setVerified`, paused
     *     bots), so this is the PREDICATE driven, not an atomic same-transaction write: the row's writer
     *     does not exist to be called. Both doors are then driven — the hook AND a sweep with no hook. */
    const fp1 = PR19.passwordFingerprint(h1);
    await S.houseBotStore.setVerified(b.botId, { fingerprint: fp1, verifiedById: WORLD_OFFICER, verifiedAt: iso() });
    /* ⛔ `pauseDetail: null` MIRRORS THE REAL START (designation.ts:508). Omitting it KEEPS the stored detail
     * — `SetStatusInput.pauseDetail` says so in its own words — and the first draft of this fixture left a
     * stale PASSWORD_CHANGED cause set on a running bot and read it as a product finding. It was the
     * fixture taking a shortcut the product does not take. */
    await S.houseBotStore.setStatus(b.botId, { from: ["AUTO_PAUSED"], to: "ACTIVE", pauseReason: null, pauseDetail: null, pausedFromStatus: null });
    const recB = recorder();
    await hook(b.userId, "PASSWORD_SELF_CHANGE", recB);
    await sweep(recB);
    bot = await botRow(b.botId);
    ok("19.J2 · HB-ACC-16 · ⭐ THE ESCAPE HATCH IS REAL: with `passwordSetVia` still REHASH and the bot's fingerprint refreshed to the hash the holder now has, BOTH the hook and a hookless sweep raise NO cause — the bot stays ACTIVE, rings nobody and writes no second AUTO_PAUSED event",
      bot.status === "ACTIVE" && bot.pauseReason === null && causeCodes(bot) === ""
        && recB.of(b.userId).length === 0 && (await eventsOf(b.botId, ["AUTO_PAUSED"])).length === 1,
      j({ status: bot.status, reason: bot.pauseReason, causes: causeCodes(bot), fns: recB.fns(b.userId) }));
    ok("19.J2b · …and the refresh really moved the stored fingerprint to the new hash's — so 19.J2's silence is the fingerprint MATCHING and not the hook having stopped looking",
      bot.passwordFingerprint === fp1 && fp1 !== before.passwordFingerprint && bot.credentialChangedVia === null,
      j({ fp: bot.passwordFingerprint, expected: fp1, wasFp: before.passwordFingerprint }));

    /* (c) POSITIVE CONTROL — on the SAME fixture, an ordinary SELF_CHANGE must STILL pause. The new branch
     *     may not weaken 19.A row 1, which is the rule that protects every holder who really changed it. */
    const recC = recorder();
    await w.setUserFields(b.userId, { passwordHash: newHash(), passwordSetVia: "SELF_CHANGE", passwordSetAt: iso() });
    await hook(b.userId, "PASSWORD_SELF_CHANGE", recC);
    bot = await botRow(b.botId);
    ok("19.J3 · HB-ACC-16 POSITIVE CONTROL · an ordinary SELF_CHANGE on the SAME fixture STILL stops the bot — AUTO_PAUSED(PASSWORD_CHANGED) method SELF_CHANGE, one A1 — so the REHASH branch has not weakened 19.A row 1",
      bot.status === "AUTO_PAUSED" && bot.pauseReason === "PASSWORD_CHANGED" && bot.pauseDetail?.method === "SELF_CHANGE"
        && j(recC.fns(b.userId)) === j(["passwordPaused"]),
      j({ status: bot.status, method: bot.pauseDetail?.method, fns: recC.fns(b.userId) }));
    await retire(b.botId);
  }

  await S.houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");
});
HH.suspendInAppHolderHookForCases(false);

/* ═══ §20 · the engine-health verdict the console renders (04 A24; C7-SPEC rulings 309, 352, 353, 354, 414) ═════
 * ⛔ ONE SERVER-SIDE PREDICATE, and it lives beside the thresholds so no constant and no `RUNTIME_KEY` crosses into
 * a page or a client chunk (353). These cases are PURE: they hand the predicate rows and instants, which is the only
 * way to exercise a boot grace and a 45-second-old beat without waiting 45 seconds.
 * ⛔ AND THE VERDICT REVERSES `PLAN.md:450`'s OR, which is the whole reason it needed a case: the poller writes its
 * beat only after a CLAIM, so a perfectly healthy engine with nothing due writes none, and PLAN's OR would paint
 * "the engine is not running" on it. An alarm that is usually wrong is one nobody reads. */
section("§20 · houseEngineVerdict and houseEngineBeats");
await guard("20", async () => {
  const EH: Any = await import("../../src/lib/server/house-bot/engine-health.ts");
  const NOW = Date.UTC(2026, 8, 19, 12, 0, 0);
  const iso20 = (agoMs: number) => new Date(NOW - agoMs).toISOString();
  const row = (key: string, o: Any = {}): Any => ({
    key, hourKey: null, countInHour: 0, rateLimitedHourKey: null, rateLimitedCount: 0, sweepPlacedAt: null,
    sweepPositionId: null, scopeFrom: null, errorStreak: 0, transientSince: null, boundsHash: null,
    exitConfigHash: null, rulesFutureSince: null, engineEnabled: null, bootAt: null, beatAt: null,
    pollerErrorAt: null, pollerErrorCode: null, pollerErrorStreak: 0, skewMs: null, updatedAt: iso20(0), ...o,
  });
  /* ⛔ EVERY CALL IS CAUGHT (E25 lesson): an ABSENT predicate must be a failed ASSERTION per case, not one throw
   * that reports the whole section under a single label and says nothing about which rule is missing. */
  const beatsOf = (rows: Any[]): Any => { try { return EH.houseEngineBeats(rows); } catch { return null; } };
  const verdict = (rows: Any[] | null, o: Any = {}): Any => {
    try {
      return EH.houseEngineVerdict({
        /* ⚠️ `??` COALESCES NULL, and `on: null` (the unreadable-control state) is a case of its own — so the
         * default is chosen by PRESENCE, not by a nullish fallback. Measured: the first form turned `on: null`
         * into `true` and the case failed for the harness's reason rather than the product's. */
        on: "on" in o ? o.on : true, beats: rows === null ? null : EH.houseEngineBeats(rows),
        activeAccounts: o.activeAccounts ?? 1, nowMs: NOW,
      });
    } catch { return "THREW"; }
  };
  const ENGINE = K.RUNTIME_KEY.engine("i-1");
  const PLANNER = K.RUNTIME_KEY.plannerBeat;
  const POLLER = K.RUNTIME_KEY.pollerBeat("i-1");

  /* ── 353's four, in its own order ── */
  ok("20.1 · 353 · switch ON, booted 10 min ago, the planner beat 45 s old and NO poller beat at all → STALE",
    verdict([row(ENGINE, { bootAt: iso20(600_000) }), row(PLANNER, { beatAt: iso20(45_000) })]) === "STALE", "");
  ok("20.2 · ⭐ 353 · the SAME rows with the planner beat 10 s old and still no poller beat → NOT stale — the idle-engine false alarm, which is red under PLAN.md:450's OR",
    verdict([row(ENGINE, { bootAt: iso20(600_000) }), row(PLANNER, { beatAt: iso20(10_000) })]) === null, "");
  ok("20.3 · 353 · switch ON, booted 30 s ago, NO beats at all → BOOTING, not stale — without the grace every deploy paints the danger row (FIRST_TICK_DELAY_MS is 20 s)",
    verdict([row(ENGINE, { bootAt: iso20(30_000) })]) === "BOOTING", "");
  ok("20.4 · 353 · …and the same instance at boot + 91 s with no planner beat → STALE",
    verdict([row(ENGINE, { bootAt: iso20(91_000) })]) === "STALE", "");
  ok("20.5 · 353 · switch OFF with no beats at all → NOTHING is said, because the strip already says the desk is off",
    verdict([], { on: false }) === null && verdict(null, { on: false }) === null && verdict([], { on: null }) === null, "");
  ok("20.6 · 353 · CONTROL · the grace and the threshold are the SHIPPED constants, not numbers typed into this case",
    K.BOOT_GRACE_MS === 90_000 && K.ENGINE_STALE_MS === 30_000 && K.PLANNER_INTERVAL_MS === 15_000, j({ grace: K.BOOT_GRACE_MS, stale: K.ENGINE_STALE_MS }));

  /* ── 354(c) · a beat read that FAILED is never an absent card and never a healthy one ── */
  ok("20.7 · 354(c) · beats that could NOT be read answer UNREADABLE — never a healthy band, and never the same answer as 'no rows', which is a different fact",
    verdict(null) === "UNREADABLE" && verdict([]) === "STALE", "");

  /* ── A24 · the poller's own failure, which had no writer at all before C7 step 4b (replan ruling 514) ── */
  const live = [row(ENGINE, { bootAt: iso20(600_000) }), row(PLANNER, { beatAt: iso20(5_000) })];
  ok("20.8 · ⭐ A24/514 · a poller ERROR newer than that poller's own beat → POLLER_FAILING",
    verdict([...live, row(POLLER, { beatAt: iso20(60_000), pollerErrorAt: iso20(3_000), pollerErrorStreak: 12 })]) === "POLLER_FAILING", "");
  ok("20.9 · …and an error OLDER than the beat that followed it says nothing — a poller that recovered is not a poller that is failing",
    verdict([...live, row(POLLER, { beatAt: iso20(2_000), pollerErrorAt: iso20(60_000), pollerErrorStreak: 0 })]) === null, "");
  ok("20.10 · ⛔ 353 · a poller with NO beat at all never makes the verdict stale on its own — the poller beats only after a CLAIM, so an idle one writes nothing",
    verdict(live) === null && verdict([...live, row(POLLER, { beatAt: null })]) === null, "");

  /* ── X1 · the planner's failed duty NAMES, off the planner row's own key-scoped column ── */
  ok("20.11 · ⭐ X1 · a live planner whose last pass failed a duty → DUTY_FAILED, and the NAMES come off the planner row",
    verdict([row(ENGINE, { bootAt: iso20(600_000) }), row(PLANNER, { beatAt: iso20(5_000), pollerErrorCode: "hourly,alertRepair", pollerErrorAt: iso20(5_000) })]) === "DUTY_FAILED", "");
  ok("20.12 · X1 · the fold reads those names off the PLANNER row and the claim failure off the POLLER row — the columns are key-scoped, and reading them off the wrong family is the one way to get this wrong",
    (() => {
      const b = beatsOf([
        row(PLANNER, { beatAt: iso20(5_000), pollerErrorCode: "hourly,alertRepair", pollerErrorAt: iso20(5_000) }),
        row(POLLER, { beatAt: iso20(60_000), pollerErrorAt: iso20(3_000), pollerErrorCode: "claim exploded", pollerErrorStreak: 12, skewMs: 41 }),
      ]);
      return j(b?.plannerFailedDuties) === j(["hourly", "alertRepair"]) && b?.pollerErrorStreak === 12 && b?.skewMs === 41
        && b?.pollerErrorAtMs === Date.parse(iso20(3_000)) && b?.plannerFailedAtMs === Date.parse(iso20(5_000));
    })(), "");
  ok("20.13 · X1 · CONTROL · an empty duty column is NO duties, never one duty named the empty string",
    j(beatsOf([row(PLANNER, { pollerErrorCode: "" })])?.plannerFailedDuties) === j([])
      && j(beatsOf([row(PLANNER, { pollerErrorCode: null })])?.plannerFailedDuties) === j([]), "");

  /* ── 414 · several instances is a CAPTION, and A23's "latest boot" is the newest of them ── */
  ok("20.14 · 352 · the newest boot wins across instances, and the instance COUNT is what a caption is built from",
    (() => {
      const b = beatsOf([
        row(K.RUNTIME_KEY.engine("i-1"), { bootAt: iso20(600_000) }),
        row(K.RUNTIME_KEY.engine("i-2"), { bootAt: iso20(30_000) }),
        row(PLANNER, { beatAt: iso20(5_000) }),
      ]);
      return b?.instances === 2 && b?.bootAtMs === Date.parse(iso20(30_000));
    })(), "");
  ok("20.15 · …and a third replica's rows move the poller and the boot but never the PLANNER's beat, which is the one the verdict rests on",
    (() => {
      const base = [row(ENGINE, { bootAt: iso20(600_000) }), row(PLANNER, { beatAt: iso20(45_000) })];
      const withThird = [...base, row(K.RUNTIME_KEY.pollerBeat("i-3"), { beatAt: iso20(1_000) }), row(K.RUNTIME_KEY.engine("i-3"), { bootAt: iso20(1_000) })];
      return verdict(base) === "STALE" && beatsOf(withThird)?.plannerBeatAtMs === Date.parse(iso20(45_000));
    })(), "");

  /* ── the two 355 distinctions the band already pays for, one card over ── */
  ok("20.16 · 355 · a roster read that FAILED is not zero: the 'nothing is running' row is not claimed when the count is unknown",
    verdict(live, { activeAccounts: null }) === null && verdict(live, { activeAccounts: 0 }) === "IDLE" && verdict(live, { activeAccounts: 2 }) === null, "");
  /* ══ CLAIMS_BLOCKED · register:1218 · the state that used to render as NOTHING ═══════════════════════════════
   * ⛔ THE DEFECT THESE PIN. `claimGate` refuses every claim while this container's skew is unknown or too large,
   * and `pollerPass` then returned early writing NOTHING. The planner kept beating, so the verdict saw a fresh
   * planner beat (not STALE), no poller error (not POLLER_FAILING), no failed duties and active accounts (not
   * IDLE) — and answered `null`, which the Desk renders as no Callout at all. Switch ON, green chip, full tiles,
   * and every stake refused. 20.19 is the control that makes these mean something: the SAME rows without the
   * marker must still answer `null`, or the case would pass on the row's mere presence. */
  ok("20.18 · ⭐ 1218 · a live planner and a poller row MARKED claims-blocked → CLAIMS_BLOCKED — the verdict that used to be `null` while nothing could be staked",
    verdict([...live, row(POLLER, { pollerErrorCode: `${K.CLAIMS_BLOCKED_CODE}:SKEW` })]) === "CLAIMS_BLOCKED", "");
  ok("20.19 · ⛔ CONTROL · the SAME rows with the marker REMOVED answer `null` again — so 20.18 turns on the marker and not on the poller row existing",
    verdict([...live, row(POLLER, {})]) === null, "");
  ok("20.20 · 1218 · the marker OUTRANKS a stale claim failure — a claim never ATTEMPTED is not a claim that THREW, and an instance blocked today may still carry last week's `pollerErrorAt`",
    verdict([...live, row(POLLER, { beatAt: iso20(60_000), pollerErrorAt: iso20(3_000), pollerErrorCode: `${K.CLAIMS_BLOCKED_CODE}:SKEW_UNKNOWN` })]) === "CLAIMS_BLOCKED", "");
  ok("20.21 · ⛔ CONTROL · a REAL claim failure message is never mistaken for the marker — `recordClaimFailure` writes the thrown message into the very same column, so only the prefix separates them",
    verdict([...live, row(POLLER, { beatAt: iso20(60_000), pollerErrorAt: iso20(3_000), pollerErrorCode: "connection terminated unexpectedly" })]) === "POLLER_FAILING", "");
  ok("20.22 · the fold hands back the REASON, and the two gate reasons stay distinguishable — the Callout says a different sentence for a clock that could not be READ than for one that DISAGREES",
    (() => {
      const a = beatsOf([...live, row(POLLER, { pollerErrorCode: `${K.CLAIMS_BLOCKED_CODE}:SKEW_UNKNOWN` })]);
      const b = beatsOf([...live, row(POLLER, { pollerErrorCode: `${K.CLAIMS_BLOCKED_CODE}:SKEW` })]);
      const c = beatsOf([...live, row(POLLER, { pollerErrorCode: "some thrown message" })]);
      return a?.claimsBlockedReason === "SKEW_UNKNOWN" && b?.claimsBlockedReason === "SKEW" && c?.claimsBlockedReason === null;
    })(), "");
  ok("20.17 · CONTROL · every verdict this predicate can answer was reached by a case in THIS run",
    (() => {
      const reached = new Set([
        verdict([row(ENGINE, { bootAt: iso20(600_000) }), row(PLANNER, { beatAt: iso20(45_000) })]),
        verdict([row(ENGINE, { bootAt: iso20(30_000) })]),
        verdict(null),
        verdict([...live, row(POLLER, { beatAt: iso20(60_000), pollerErrorAt: iso20(3_000) })]),
        verdict([row(ENGINE, { bootAt: iso20(600_000) }), row(PLANNER, { beatAt: iso20(5_000), pollerErrorCode: "hourly" })]),
        verdict(live, { activeAccounts: 0 }),
        verdict([...live, row(POLLER, { pollerErrorCode: `${K.CLAIMS_BLOCKED_CODE}:SKEW` })]),
      ].filter((v) => v !== null));
      return j([...reached].sort()) === j(["BOOTING", "CLAIMS_BLOCKED", "DUTY_FAILED", "IDLE", "POLLER_FAILING", "STALE", "UNREADABLE"]);
    })(), "");
});

/* ⛔ RULING 505's ROLL-CALL OVER THE DECLARED MUTATIONS, AND IT MUST BE LAST — it reads the labels THIS run printed.
 * `red:house-bot-engine` matches a run's FAIL lines with `result.fails.find((l) => l.includes(d.expect))`, so an
 * `expect` that is not a substring of any label this suite can print is classed WRONG-ASSERTION, `missed++`, and the
 * drive exits 1 — red for the wrong reason, which inside C5-8's single batch run reads exactly like success.
 * ⛔ SKIPPED, AND SAID SO, WHEN THE RUN IS SECTION-FILTERED. `HB_ENGINE_SECTIONS` runs a subset for a mutation drive,
 * and a partial run's labels are a partial population — a roll-call over one would report every unrun section's
 * declarations as stale, which is the very defect it exists to catch. The full suite always runs every section.
 * ⛔ The `caps-pg`, `comms-mem`, `designation-mem` and `info-edge-mem` entries name labels of OTHER suites, which this
 * run cannot print — they are counted and NAMED in the extra, so the exclusion is visible rather than silent. */
if (ONLY_SECTIONS.length > 0) {
  console.log(`\n[${STORE}] 1.505 · NOT MEASURED — this run was section-filtered (HB_ENGINE_SECTIONS=${ONLY_SECTIONS.join(",")}), so its labels are not the suite's population`);
} else {
  const KEY = STORE === "memory" ? "engine-mem" : "engine-pg";
  const selfCode = decomment(readFileSync(fileURLToPath(import.meta.url), "utf8"));
  const LBL = `1.505 · every declared \`${KEY}\` mutation names an assertion THIS run actually printed — an \`expect\` that matches no label can only ever report WRONG-ASSERTION`;
  const LBLC = `1.505 · CONTROL · the roll-call reads this run's own labels and this suite's own source, so a drifted \`expect\` IS reported and an invented one is never found`;
  const input = {
    suiteKeys: [KEY], declarations: DECLARED_MUTATIONS as DeclaredMutation[],
    emitted, source: selfCode, ownLabels: [LBL, LBLC],
  };
  const rc = expectDriftReport(input);
  ok(LBL, rc.declared >= (STORE === "memory" ? 22 : 6) && rc.stale.length === 0, j(rc));
  const control = expectDriftControl(input, 300);
  ok(LBLC, control.pass, control.extra);
}
console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail })}`);
process.exit(fail === 0 ? 0 : 1);
