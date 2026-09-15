/**
 * The case list behind `test:house-bot-engine`. Run by that suite in two child processes — one on Postgres, one on
 * the memory store — never on its own. Source pins run in the memory child only (they read files, not a store).
 *
 * Sections follow the build order in `plans/house-bots/C4-SPEC.md` §5:
 *   §1 the lock exit · §2 the planner lease · §3 attribution · §4 the market view · §5 Enter now decision ·
 *   §6 the outcome table · §7 decide · §8 source pins · §9 feed copy.
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
const j = (v: unknown) => JSON.stringify(v)?.slice(0, 260) ?? String(v);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** A throw is a failed assertion, never a crashed suite. */
async function guard(label: string, fn: () => Promise<void> | void): Promise<void> {
  try { await fn(); } catch (e) { ok(`${label} · threw`, false, (e as Error)?.stack?.split("\n").slice(0, 3).join(" | ") ?? String(e)); }
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
  ok("6.4 · A7: bounds that moved → SKIPPED(STAKE_BOUNDS_CHANGED), no alert", row("stake_below_min").code === "STAKE_BOUNDS_CHANGED" && !row("stake_below_min").alert && row("stake_above_max").code === "STAKE_BOUNDS_CHANGED");
  ok("6.5 · A7: a stake that is not whole → FAILED + AlertOnce", row("stake_not_whole").status === "FAILED" && row("stake_not_whole").alert === "stakeNotWhole");
  ok("6.6 · N1: stale → EXPIRED(STALE); blackout → SKIPPED(INFO_BLACKOUT); concentration → SKIPPED(COUNTERPARTY_CONCENTRATION)",
    row("house_intent_stale").status === "EXPIRED" && row("house_intent_stale").code === "STALE" && row("house_info_blackout").code === "INFO_BLACKOUT" && row("house_counterparty_concentration").code === "COUNTERPARTY_CONCENTRATION");
  ok("6.7 · an invalid side and a key mismatch stop the engine (SECURITY + master OFF)", row("market_not_live").engineFault === true && row("house_key_mismatch").engineFault === true);
  ok("6.8 · a trigger exit puts the trigger in the penalty box", row("house_trigger_gone").penalty === true && row("house_trigger_gone").code === "TRIGGER_EXITED");
  const transient = keys.filter((k) => row(k).kind === "transient").sort();
  ok("6.9 · the transient rows are exactly BUSY, rate_limited, gate unreadable and system_busy", j(transient) === j(["code:BUSY", "house_gate_unreadable", "rate_limited", "system_busy"]), j(transient));
  const codes = keys.filter((k) => row(k).kind === "terminal").map((k) => row(k).code);
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
  const tgt = { targetId: "hbt_1", houseBotId: "hb_a", delayMinSec: 10, delayMaxSec: 10, timingFrom: "STAKE", reactTo: "FIRST", effectiveFrom: at(-100), drawnDelaySec: 10, lockedAtDue: 10_000 };
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
      globalThis.__50PICK_HOUSE_SCHEMA_READY = undefined;
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
  ok("12.5 · ⭐ A13 · a Sentinel verdict and a staged resolution change NOTHING in the engine's view", j(await HDAL.houseSeamStore.marketView(market.id)) === before);
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

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail })}`);
process.exit(fail === 0 ? 0 : 1);
