/**
 * The case list behind `test:house-bot-engine`. Run by that suite in two child processes — one on Postgres, one on
 * the memory store — never on its own. Source pins run in the memory child only (they read files, not a store).
 *
 * Sections follow the build order in `plans/house-bots/C4-SPEC.md` §5:
 *   §1 the lock exit · §2 the planner lease · §3 attribution · §4 the market view · §5 Enter now decision ·
 *   §6 the outcome table · §7 decide · §8 source pins · §9 feed copy · §10 schema gate · §11 engine process · §12 market view · §13 applyOutcome · §14 the A15 price read ·
 *   §15 the Enter now loader, the opener draw and marketHeld · §16 fire and the poller · §17 the planner · §18 the trigger.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./decomment.mts";

type Any = any;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
const onPostgres = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false";
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
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
    openExposure: 0, lastPlacedAt: null, scopeFrom: at(-86_400), marketHeld: false, capPrecheck: null }, o);
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
  const tdStake = DE.targetDueAt({ placedAtMs: 0, exitCloseAtMs: 300_000, timingFrom: "STAKE", delaySec: 10 });
  const tdExit = DE.targetDueAt({ placedAtMs: 0, exitCloseAtMs: 300_000, timingFrom: "EXIT_CLOSE", delaySec: 10 });
  ok("7.35 · ruling 108 · one due-time formula: STAKE 10 s on a 5-min exit → requested 0:10, held to 5:07; EXIT_CLOSE 10 s → 5:10",
    tdStake.requestedMs === 10_000 && tdStake.dueMs === 307_000 && tdExit.requestedMs === 310_000 && tdExit.dueMs === 310_000, j({ tdStake, tdExit }));
  const tgtTwo = DE.decideCounter(ctrIn({ target: { ...tgt, timingFrom: "EXIT_CLOSE" } }), { randomInt: minRand });
  ok("7.36 · …and decideCounter uses it: a targeted EXIT_CLOSE 10 s reaction is due at the exit + 10 s", tgtTwo.row?.dueAt === at(-1 + 310), j(tgtTwo.row));
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
  const res = await H.GET();
  const body: Any = await res.json();
  ok("10.7 · /api/health answers 200 with houseBots.schemaReady true", res.status === 200 && body.houseBots?.schemaReady === true, `${res.status} ${j(body.houseBots)}`);
  ok("10.8 · …and reports this instance's engine (not started in a suite)", body.houseBots?.engine?.started === false, j(body.houseBots?.engine));

  if (onPostgres) {
    const db = prisma();
    await db.$executeRawUnsafe(`ALTER TABLE "HouseBotPress" RENAME TO "HouseBotPress_hb_gate"`);
    try {
      globalThis.__50PICK_HOUSE_SCHEMA_READY = undefined;
      const gone = await SR.houseBotSchemaReady();
      ok("10.9 · a real missing table → not ready, naming it", !gone.ready && gone.missingTables.includes("HouseBotPress"), j(gone));
      const r503 = await H.GET();
      const b503: Any = await r503.json();
      ok("10.10 · ⛔ /api/health answers 503 with houseBots.schemaReady false and ok false", r503.status === 503 && b503.houseBots?.schemaReady === false && b503.ok === false, `${r503.status} ${j(b503.houseBots)}`);
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
  ok("11.16 · …and no boot row was written by a refused start", (await HDAL.houseBotRuntimeStore.get(`engine:${INSTANCE_ID}`)) === null);
  globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined;
  const on = await EN2.startHouseBotEngine(ticks, { env: () => undefined, schemaReady: ready, timeZone: async () => "Etc/UTC", dbClockMs: async () => Date.now() + 1_000 });
  const firstTimer = EN2.engineState().timers.first;
  const again = await EN2.startHouseBotEngine(ticks, { env: () => undefined, schemaReady: ready, timeZone: async () => "UTC" });
  ok("11.17 · a clean start: started, skew measured, the first pass armed", on.started === true && Math.abs(EN2.engineState().skewMs - 1_000) <= 50 && firstTimer !== null, j(EN2.houseBotEngineHealth()));
  ok("11.18 · A24: startHouseBotEngine called twice arms ONE timer", again.started === true && EN2.engineState().timers.first === firstTimer);
  const row = await HDAL.houseBotRuntimeStore.get(`engine:${INSTANCE_ID}`);
  ok("11.19 · the boot row engine:<instance> says enabled, with a boot time", row?.engineEnabled === true && !!row?.bootAt, j(row));
  let requeued: Any = null;
  await EN2.stopHouseBotEngine({ requeueMine: async (id: string, exclude: string[]) => { requeued = { id, exclude }; return 0; } }, "test");
  await sleep(10);
  ok("11.20 · stop: stopping set, every timer cleared, claims handed back for this instance", EN2.engineState().stopping === true && Object.values(EN2.engineState().timers).every((t) => t === null)
    && requeued?.id === INSTANCE_ID && EN2.claimGate(EN2.engineState(), adm()).ok === false, j(requeued));
  globalThis.__50PICK_HOUSE_BOT_ENGINE = undefined;
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
    const aged = await UDP.udPriceForDecision(asset.id, { nowMs: minute(now) + 60_000 });
    ok("14.5 · 120 s from the bar's open → not a vendor price; no observation → null", aged === null, j(aged));

    await cacheBars("1H", [{ t: minute(now), c: 105 }]);
    const newest = await UDP.udPriceForDecision(asset.id, { nowMs: minute(now) + 10_000 });
    ok("14.6 · the newest bar across the 1-minute ranges wins (1H's newer bar over 15M's)", newest?.price === 105 && newest.ageSec === 10, j(newest));

    VEN.__clearVendorCacheForTests();
    await cacheBars("6H", [{ t: minute(now), c: 999 }]);
    ok("14.7 · a 5-minute bar (6H) is not a 1-minute bar → no vendor price", VEN.peekVendorBar(asset.id) === null && (await UDP.udPriceForDecision(asset.id, { nowMs: minute(now) + 5_000 })) === null);
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
      once: async (key: string, m: Any) => { calls.push({ fn: "once", key, code: m.code }); },
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
    const h1 = await safe(async () => PL.hourlyDuties((await dbNow()) + 3_600_000, { ...control, bellAlertsPerHour: 0, holderNoticesPerHour: 0 }, rec.alerts));
    const h2 = await safe(async () => PL.hourlyDuties((await dbNow()) + 3_600_000, { ...control, bellAlertsPerHour: 0, holderNoticesPerHour: 0 }, rec.alerts));
    const admins = rec.calls.filter((c) => c.code === "HOUR_SUMMARY_ADMINS");
    const holder = rec.calls.filter((c) => c.code === "HOUR_SUMMARY_HOLDER" && c.m.botId === b.botId);
    const prevHour = CLOCK.eatKeyFor("previousHour", await dbNow());
    ok("17.61 · admins' summary once, keyed on the hour summarised (previousHour), beyond a 0 cap", !placedRow.threw && admins.length === 1 && admins[0].key === `summary:admins:all:${prevHour}` && admins[0].m.detail.beyondCap >= 1, j({ h1, h2, admins }));
    ok("17.62 · …and the holder's once, counting their PLACED stake (0 notices an hour = summary only)", holder.length === 1 && holder[0].m.detail.count >= 1, j(holder));
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
      once: async (key: string, m: Any) => { calls.push({ fn: "once", key, code: m.code, m }); },
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
    const want = { side: "YES", stakeTzs: 3_000, botSide: "NO", botStakeTzs: 2_000 };
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
      } finally {
        state.started = saved.started;
        state.stopping = saved.stopping;
        state.skewMs = saved.skewMs;
        state.hook.alerts = saved.alerts;
        state.hook.cache = saved.cache;
      }
    }
  }

  await S.houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");
});

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail })}`);
process.exit(fail === 0 ? 0 : 1);
