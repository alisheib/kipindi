/**
 * The case list behind `test:house-bot-caps`. Run by that suite in two child processes — one on Postgres,
 * one on the memory store — never on its own. Lock-timeout cases need real Postgres locks and run there
 * only; everything else runs on both.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadWorld, OFFICER } from "./house-bot-world.mts";

type Any = any;
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  console.log(`${c ? "PASS" : "FAIL"} [${STORE}] ${l}${x ? ` — ${x}` : ""}`);
};
const section = (t: string) => console.log(`\n[${STORE}] ${t}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const show = (r: Any) => (r?.ok ? `ok${r.data?.replayed ? " (replayed)" : ""}` : `${r?.code ?? "?"}/${r?.reason ?? "no-reason"}${r?.detail ? ` ${JSON.stringify(r.detail)}` : ""}`);
const capOf = (r: Any) => (r?.ok === false && r.reason === "house_cap_reached" ? r.detail?.cap : null);

const w = await loadWorld();
const { withLock } = await import("../../src/lib/server/locks.ts");
const { houseDayBook, houseOpenExposure } = await import("../../src/lib/server/house-bot/book.ts");
const { eatDayKey } = await import("../../src/lib/house-bot/clock.ts");
ok(`0.store · the stores run on ${STORE}`, w.onPostgres === (STORE === "postgres"));
await w.user({ id: OFFICER, role: "ADMIN" });
await w.limits();
await w.switchOn();

/** A fresh empty poll and a claimed OPENER intent on it. */
async function opener(b: Any, stakeTzs = 1_000, o: Record<string, unknown> = {}): Promise<{ market: Any; i: Any }> {
  const market = await w.poll({ graceMin: 0 });
  return { market, i: await w.intent(b, market.id, { kind: "OPENER", side: "YES", stakeTzs, ...o }) };
}
/** A fresh empty poll and a claimed Enter now (MANUAL, OPENER condition) intent on it. */
async function manualOpener(b: Any, stakeTzs = 1_000): Promise<{ market: Any; i: Any }> {
  const market = await w.poll({ graceMin: 0 });
  return { market, i: await w.intent(b, market.id, { kind: "MANUAL", entryCondition: "OPENER", side: "YES", stakeTzs }) };
}
/** A locked NO stake by a fresh player (backdated past the margin); returns the position. */
async function lockedNo(marketId: string, stake: number, player?: string): Promise<Any> {
  const p = player ?? await w.user({ balance: 1_000_000 });
  const r = await w.svc.buyPosition(p, { marketId, side: "NO", stake, idempotencyKey: crypto.randomUUID() });
  if (!r.ok) throw new Error(`fixture bet refused: ${show(r)}`);
  await w.backdate(r.data.positionId, 10_000);
  return w.mdal.positionStore.get(r.data.positionId);
}
const houseCount = async (marketId: string) => (await w.positionsOf(marketId)).filter((p: Any) => p.houseBotId != null).length;

// ═══ §0 · the per-minute and per-day global counters, first, while nothing else has bet ═══════
section("§0 · GLOBAL_BETS_PER_MINUTE and GLOBAL_BETS_PER_DAY (H4)");
{
  const g0 = await w.dal.houseSeamStore.globalUsage();
  ok("0.1 · fixture · no house bet in the last minute yet", g0.betsLastMinute === 0, JSON.stringify(g0));
  await w.limits({ gMaxBetsPerMinute: 1 });
  const b = await w.bot();
  const a = await opener(b);
  const ra = await w.place(b, a.i);
  ok("0.2 · CONTROL · the first bet of the minute places at gMaxBetsPerMinute 1", ra.ok === true, show(ra));
  const c = await opener(b);
  const rc = await w.place(b, c.i);
  ok("0.3 · the second → house_cap_reached{GLOBAL_BETS_PER_MINUTE}", capOf(rc) === "GLOBAL_BETS_PER_MINUTE", show(rc));
  const g1 = await w.dal.houseSeamStore.globalUsage();
  await w.limits({ gMaxBetsPerDay: Math.max(1, g1.betsLastDay) });
  const d = await opener(b);
  const rd = await w.place(b, d.i);
  ok("0.4 · betsLastDay at gMaxBetsPerDay → house_cap_reached{GLOBAL_BETS_PER_DAY}", capOf(rd) === "GLOBAL_BETS_PER_DAY", show(rd));
  await w.limits();
  const e = await opener(b);
  const re = await w.place(b, e.i);
  ok("0.5 · CONTROL · limits restored → the next bet places", re.ok === true, show(re));
}

// ═══ §1 · every per-bot cap stops exactly (H2) ═══════════════════════════════════════════════
// From here on, every placement first ages earlier house bets out of the one-minute window, so the
// ≤ 20-a-minute global cap proven in §0 never masks the cap a case is about.
{
  const rawPlace = w.place;
  (w as Any).place = async (b: Any, i: Any) => { await w.ageHouseMinute(); return rawPlace(b, i); };
}

section("§1 · per-bot caps (H2 group 3, 4, 5)");
{
  const expectCap = async (label: string, caps: Record<string, unknown>, stake: number, cap: string, pre?: (b: Any) => Promise<void>, botOpts: Record<string, unknown> = {}) => {
    const b = await w.bot({ caps, ...botOpts });
    if (pre) await pre(b);
    const { i } = await opener(b, stake);
    const r = await w.place(b, i);
    ok(label, capOf(r) === cap, show(r));
    return b;
  };
  await expectCap("1.1 · stake below stakeMinTzs → STAKE_MIN", { stakeMinTzs: 2_000 }, 1_000, "STAKE_MIN");
  await expectCap("1.2 · stake above stakeMaxTzs → STAKE_MAX", { stakeMaxTzs: 1_500 }, 2_000, "STAKE_MAX");
  await expectCap("1.3 · stakeMaxTzs NOT SET (null) → STAKE_MAX: an unset cap cannot bet", { stakeMaxTzs: null }, 2_000, "STAKE_MAX");
  await expectCap("1.4 · stake above capPerMarketTzs → PER_MARKET", { capPerMarketTzs: 1_500 }, 2_000, "PER_MARKET");
  await expectCap("1.5 · balance − stake below balanceFloorTzs → BALANCE_FLOOR", { balanceFloorTzs: 9_500 }, 1_000, "BALANCE_FLOOR", undefined, { balance: 10_000 });
  const two = async (b: Any) => { const x = await opener(b, 2_000); const r = await w.place(b, x.i); if (!r.ok) throw new Error(`pre bet: ${show(r)}`); };
  await expectCap("1.6 · today's stake + this > capDailyStakeTzs → DAILY_STAKE", { capDailyStakeTzs: 2_500 }, 1_000, "DAILY_STAKE", two);
  await expectCap("1.7 · projected loss + this > capDailyLossTzs → DAILY_LOSS_PROJECTED", { capDailyLossTzs: 2_500 }, 1_000, "DAILY_LOSS_PROJECTED", two);
  await expectCap("1.8 · open exposure + this > capOpenExposureTzs → EXPOSURE", { capOpenExposureTzs: 2_500 }, 1_000, "EXPOSURE", two);
  {
    const b = await w.bot({ caps: { capDailyStakeTzs: 3_000 } });
    await two(b);
    const { i } = await opener(b, 1_000);
    const r = await w.place(b, i);
    ok("1.9 · CONTROL · exactly at capDailyStakeTzs (2,000 + 1,000 = 3,000) places", r.ok === true, show(r));
  }
  await expectCap("1.10 · a second bet inside freqMinGapSec → MIN_GAP", { freqMinGapSec: 3_600 }, 1_000, "MIN_GAP", async (b) => { const x = await opener(b); await w.place(b, x.i); });
  {
    const b = await w.bot({ caps: { freqMaxPerHour: 2 } });
    const placed: string[] = [];
    for (let k = 0; k < 2; k++) { const x = await opener(b); const r = await w.place(b, x.i); if (r.ok) placed.push(r.data.positionId); }
    const { i } = await opener(b);
    const r = await w.place(b, i);
    ok("1.11 · a third bet in the rolling hour at freqMaxPerHour 2 → PER_HOUR", placed.length === 2 && capOf(r) === "PER_HOUR", show(r));
    for (const id of placed) await w.backdate(id, 3_700_000);
    const y = await opener(b);
    const ry = await w.place(b, y.i);
    ok("1.12 · CONTROL · once those two are more than an hour old, the next places (a rolling window, not a clock hour)", ry.ok === true, show(ry));
  }
  await expectCap("1.13 · a third bet in the rolling day at freqMaxPerDay 2 → PER_DAY", { freqMaxPerDay: 2 }, 1_000, "PER_DAY",
    async (b) => { for (let k = 0; k < 2; k++) { const x = await opener(b); await w.place(b, x.i); } });
  {
    const b = await w.bot({ caps: { freqMaxPerMarket: 1 } });
    const x = await opener(b);
    await w.place(b, x.i);
    const i2 = await w.intent(b, x.market.id, { kind: "MANUAL", entryCondition: "THIN", side: "YES", stakeTzs: 1_000 });
    const r = await w.place(b, i2);
    ok("1.14 · a second house stake by this bot on the same market at freqMaxPerMarket 1 → PER_MARKET_COUNT", capOf(r) === "PER_MARKET_COUNT", show(r));
  }
  {
    const b = await w.bot({ caps: { capStaffChosenPerDay: 2 } });
    for (let k = 0; k < 2; k++) { const x = await manualOpener(b); const r = await w.place(b, x.i); if (!r.ok) throw new Error(`staff pre bet: ${show(r)}`); }
    const y = await manualOpener(b);
    const r = await w.place(b, y.i);
    ok("1.15 · a third staff-chosen stake at capStaffChosenPerDay 2 → STAFF_CHOSEN_PER_DAY", capOf(r) === "STAFF_CHOSEN_PER_DAY", show(r));
    const z = await opener(b);
    const rz = await w.place(b, z.i);
    ok("1.16 · CONTROL · an automated OPENER by the same bot is not a staff-chosen stake and places", rz.ok === true, show(rz));
  }
  {
    const b = await w.bot({ caps: { capStaffChosenPerDay: null } });
    const y = await manualOpener(b);
    const r = await w.place(b, y.i);
    ok("1.17 · capStaffChosenPerDay NOT SET → STAFF_CHOSEN_PER_DAY: Enter now cannot bet", capOf(r) === "STAFF_CHOSEN_PER_DAY", show(r));
  }
  {
    const b = await w.bot({ caps: { capStaffChosenDailyTzs: 2_500 } });
    const x = await manualOpener(b, 2_000);
    await w.place(b, x.i);
    const y = await manualOpener(b, 1_000);
    const r = await w.place(b, y.i);
    ok("1.18 · staff-chosen stake today + this > capStaffChosenDailyTzs → STAFF_CHOSEN_DAILY_STAKE", capOf(r) === "STAFF_CHOSEN_DAILY_STAKE", show(r));
  }
  {
    // TARGET_ONCE: a FIRST target reacts once. Two locked NO triggers on one poll, two reactions.
    const market = await w.poll({ graceMin: 0 });
    const t1 = await lockedNo(market.id, 10_000);
    const t2 = await lockedNo(market.id, 10_000);
    const b = await w.bot();
    const targetId = `hbt_case_${process.pid}`;
    const r1i = await w.intent(b, market.id, { kind: "COUNTER", triggerPositionId: t1.id, triggerUserId: t1.userId, targetId, decision: { reactTo: "FIRST" }, side: "YES", stakeTzs: 2_000 });
    const r1 = await w.place(b, r1i);
    ok("1.19 · fixture · a targeted FIRST reaction places", r1.ok === true, show(r1));
    const r2i = await w.intent(b, market.id, { kind: "COUNTER", triggerPositionId: t2.id, triggerUserId: t2.userId, targetId, decision: { reactTo: "FIRST" }, side: "YES", stakeTzs: 2_000 });
    const r2 = await w.place(b, r2i);
    ok("1.20 · a second reaction of the same FIRST target → TARGET_ONCE", capOf(r2) === "TARGET_ONCE", show(r2));
  }
  {
    // One family (INT-05, N2 §3): Enter now and targeted reactions count against the same staff-chosen cap.
    const b = await w.bot({ caps: { capStaffChosenPerDay: 2 } });
    const x = await manualOpener(b);
    const rx = await w.place(b, x.i);
    const market = await w.poll({ graceMin: 0 });
    const t1 = await lockedNo(market.id, 10_000);
    const t2 = await lockedNo(market.id, 10_000);
    const targetId = `hbt_family_${process.pid}`;
    const ry = await w.place(b, await w.intent(b, market.id, { kind: "COUNTER", triggerPositionId: t1.id, triggerUserId: t1.userId, targetId, decision: { reactTo: "EVERY" }, side: "YES", stakeTzs: 1_000 }));
    const rz = await w.place(b, await w.intent(b, market.id, { kind: "COUNTER", triggerPositionId: t2.id, triggerUserId: t2.userId, targetId, decision: { reactTo: "EVERY" }, side: "YES", stakeTzs: 1_000 }));
    ok("1.21 · one Enter now + one targeted reaction placed, then a targeted reaction at capStaffChosenPerDay 2 → STAFF_CHOSEN_PER_DAY (one family)",
      rx.ok === true && ry.ok === true && capOf(rz) === "STAFF_CHOSEN_PER_DAY", `${show(rx)} · ${show(ry)} · ${show(rz)}`);
  }
}

// ═══ §2 · the declared H2 order (N1 §3, MON-09): two checks at once, the earlier wins ═══════════
section("§2 · H2_ORDER fixtures");
{
  {
    const b = await w.bot({ caps: { stakeMaxTzs: 500 } });
    const market = await w.poll({ graceMin: 0 });
    await w.svc.buyPosition(b.userId, { marketId: market.id, side: "NO", stake: 1_000, idempotencyKey: crypto.randomUUID() });
    const i = await w.intent(b, market.id, { kind: "OPENER", side: "YES", stakeTzs: 1_000 });
    const r = await w.place(b, i);
    ok("2.1 · OWNER_POSITION + STAKE_MAX → OWNER_POSITION", r.ok === false && r.detail?.conflict === "OWNER_POSITION", show(r));
  }
  {
    const b = await w.bot({ caps: { capOpenExposureTzs: 2_500, freqMinGapSec: 3_600 } });
    const x = await opener(b, 2_000); await w.place(b, x.i);
    const y = await opener(b, 1_000);
    const r = await w.place(b, y.i);
    ok("2.2 · EXPOSURE + MIN_GAP → EXPOSURE", capOf(r) === "EXPOSURE", show(r));
  }
  {
    const b = await w.bot({ caps: { capStaffChosenPerDay: 1, freqMinGapSec: 3_600 } });
    const x = await manualOpener(b); await w.place(b, x.i);
    const y = await manualOpener(b);
    const r = await w.place(b, y.i);
    ok("2.3 · STAFF_CHOSEN_PER_DAY + MIN_GAP → STAFF_CHOSEN_PER_DAY", capOf(r) === "STAFF_CHOSEN_PER_DAY", show(r));
  }
  {
    const b = await w.bot({ caps: { freqMaxPerMarket: 1, freqMinGapSec: 3_600 } });
    const x = await opener(b); await w.place(b, x.i);
    const i2 = await w.intent(b, x.market.id, { kind: "MANUAL", entryCondition: "THIN", side: "YES", stakeTzs: 1_000 });
    const r = await w.place(b, i2);
    ok("2.4 · MIN_GAP + PER_MARKET_COUNT → PER_MARKET_COUNT (the terminal cap wins within group 5)", capOf(r) === "PER_MARKET_COUNT", show(r));
  }
  {
    // 02 §3.4: a Pause written under wallet:<botUser> while a bet already past H1 waits for that lock is
    // honoured inside the lock — even though the CLAIMED intent itself was never cancelled.
    const b = await w.bot();
    const { market, i } = await opener(b);
    const hold = withLock(`wallet:${b.userId}`, async () => {
      await sleep(300);
      await w.dal.houseBotStore.setStatus(b.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: null });
      await sleep(200);
    });
    await sleep(100);
    const r = await w.place(b, i);
    await hold;
    const row = await w.dal.houseBotIntentStore.get(i.id);
    ok("2.5 · a bot paused under its wallet lock while a claimed bet waits → house_bot_inactive in H2, 0 positions, intent not PLACED",
      r.ok === false && r.reason === "house_bot_inactive" && (await houseCount(market.id)) === 0 && row?.status !== "PLACED", `${show(r)} · intent ${row?.status}`);
  }
}

// ═══ §3 · global caps (H3, H4) ════════════════════════════════════════════════════════════════
section("§3 · global caps");
{
  const today = eatDayKey(Date.now());
  {
    await w.limits({ gCapPerMarketTzs: 1_500 });
    const b = await w.bot();
    const { i } = await opener(b, 2_000);
    const r = await w.place(b, i);
    ok("3.1 · all bots' open stake on the market + this > gCapPerMarketTzs → GLOBAL_PER_MARKET", capOf(r) === "GLOBAL_PER_MARKET", show(r));
  }
  {
    const all = await houseDayBook(today, null);
    await w.limits({ gCapDailyStakeTzs: all.stakedTzs + 2_000 });
    const b = await w.bot();
    const a = await opener(b, 2_000);
    const ra = await w.place(b, a.i);
    ok("3.2 · CONTROL · exactly at gCapDailyStakeTzs places", ra.ok === true, show(ra));
    const c = await opener(b, 1_000);
    const rc = await w.place(b, c.i);
    ok("3.3 · one TZS over → GLOBAL_DAILY_STAKE", capOf(rc) === "GLOBAL_DAILY_STAKE", show(rc));
  }
  {
    const all = await houseDayBook(today, null);
    await w.limits({ gCapDailyLossTzs: all.projectedLossTzs + 1_500 });
    const b = await w.bot();
    const { i } = await opener(b, 2_000);
    const r = await w.place(b, i);
    ok("3.4 · projected loss of every bot + this > gCapDailyLossTzs → GLOBAL_LOSS_PROJECTED", capOf(r) === "GLOBAL_LOSS_PROJECTED", show(r));
  }
  {
    await w.limits({ gCapOpenExposureTzs: (await houseOpenExposure(null)) + 1_500 });
    const b = await w.bot();
    const { i } = await opener(b, 2_000);
    const r = await w.place(b, i);
    ok("3.5 · open exposure of every bot + this > gCapOpenExposureTzs → GLOBAL_EXPOSURE", capOf(r) === "GLOBAL_EXPOSURE", show(r));
  }
  {
    await w.limits({ gCounterPerPlayerPerDay: 1 });
    const market = await w.poll({ graceMin: 0 });
    const player = await w.user({ balance: 1_000_000 });
    const t1 = await lockedNo(market.id, 10_000, player);
    const t2 = await lockedNo(market.id, 10_000, player);
    const b = await w.bot();
    const r1 = await w.place(b, await w.intent(b, market.id, { kind: "COUNTER", triggerPositionId: t1.id, triggerUserId: player, side: "YES", stakeTzs: 2_000 }));
    ok("3.6 · fixture · a COUNTER against the player places", r1.ok === true, show(r1));
    const r2 = await w.place(b, await w.intent(b, market.id, { kind: "COUNTER", triggerPositionId: t2.id, triggerUserId: player, side: "YES", stakeTzs: 2_000 }));
    ok("3.7 · a second COUNTER against the same player at gCounterPerPlayerPerDay 1 → COUNTERPARTY_COUNT", capOf(r2) === "COUNTERPARTY_COUNT", show(r2));
  }
  {
    await w.limits({ gCounterPerPlayerTzsPerDay: 2_500 });
    const market = await w.poll({ graceMin: 0 });
    const player = await w.user({ balance: 1_000_000 });
    const t1 = await lockedNo(market.id, 10_000, player);
    const t2 = await lockedNo(market.id, 10_000, player);
    const b = await w.bot();
    await w.place(b, await w.intent(b, market.id, { kind: "COUNTER", triggerPositionId: t1.id, triggerUserId: player, side: "YES", stakeTzs: 2_000 }));
    const r2 = await w.place(b, await w.intent(b, market.id, { kind: "COUNTER", triggerPositionId: t2.id, triggerUserId: player, side: "YES", stakeTzs: 1_000 }));
    ok("3.8 · countered TZS today + this > gCounterPerPlayerTzsPerDay → COUNTERPARTY_TZS", capOf(r2) === "COUNTERPARTY_TZS", show(r2));
  }
  {
    const staff = await w.dal.houseBotIntentStore.staffChosenPlacedToday({ houseBotId: null });
    await w.limits({ gCapStaffChosenPerDay: staff.count + 1 });
    const b1 = await w.bot(), b2 = await w.bot();
    const x = await manualOpener(b1);
    const rx = await w.place(b1, x.i);
    const y = await manualOpener(b2);
    const ry = await w.place(b2, y.i);
    ok("3.9 · the staff-chosen stakes of EVERY bot at gCapStaffChosenPerDay → GLOBAL_STAFF_CHOSEN_PER_DAY", rx.ok === true && capOf(ry) === "GLOBAL_STAFF_CHOSEN_PER_DAY", `${show(rx)} · ${show(ry)}`);
  }
  {
    const staff = await w.dal.houseBotIntentStore.staffChosenPlacedToday({ houseBotId: null });
    await w.limits({ gCapStaffChosenDailyTzs: staff.stakeTzs + 1_500 });
    const b = await w.bot();
    const x = await manualOpener(b, 2_000);
    const r = await w.place(b, x.i);
    ok("3.10 · staff-chosen TZS of every bot + this > gCapStaffChosenDailyTzs → GLOBAL_STAFF_CHOSEN_DAILY_STAKE", capOf(r) === "GLOBAL_STAFF_CHOSEN_DAILY_STAKE", show(r));
  }
  {
    // MON-14: clearing a staff-chosen limit while bots run is allowed, and the next staff-chosen stake refuses in the lock.
    await w.limits({ gCapStaffChosenPerDay: null });
    const b = await w.bot();
    const x = await manualOpener(b);
    const r = await w.place(b, x.i);
    const y = await opener(b);
    const ry = await w.place(b, y.i);
    ok("3.11 · gCapStaffChosenPerDay cleared (NULL) → GLOBAL_STAFF_CHOSEN_PER_DAY, while an automated OPENER still places",
      capOf(r) === "GLOBAL_STAFF_CHOSEN_PER_DAY" && ry.ok === true, `${show(r)} · ${show(ry)}`);
  }
  await w.limits();
}

// ═══ §4 · concurrency: the caps hold inside the locks (PLAN I6) ════════════════════════════════
section("§4 · bursts stop exactly at the cap");
{
  {
    const market = await w.poll({ graceMin: 0 });
    const bA = await w.bot(), bB = await w.bot();
    const iA = await w.intent(bA, market.id, { kind: "OPENER", side: "YES", stakeTzs: 1_000 });
    const iB = await w.intent(bB, market.id, { kind: "MANUAL", entryCondition: "OPENER", side: "NO", stakeTzs: 1_000 });
    const [ra, rb] = await Promise.all([w.place(bA, iA), w.place(bB, iB)]);
    ok("4.1 · two bots racing one empty poll → exactly one house position", [ra, rb].filter((r) => r.ok).length === 1 && (await houseCount(market.id)) === 1,
      `${show(ra)} · ${show(rb)}`);
  }
  {
    const b = await w.bot();
    const { market, i } = await opener(b);
    const rs = await Promise.all([w.place(b, i), w.place(b, i), w.place(b, i)]);
    ok("4.2 · the same intent fired three times at once → one position, one fresh result, the others replayed",
      (await houseCount(market.id)) === 1 && rs.every((r) => r.ok) && rs.filter((r) => !r.data.replayed).length === 1, rs.map(show).join(" · "));
  }
  {
    const b = await w.bot({ caps: { capDailyStakeTzs: 5_000 } });
    const shots = await Promise.all(Array.from({ length: 5 }, () => opener(b, 2_000)));
    const rs = await Promise.all(shots.map((s) => w.place(b, s.i)));
    ok("4.3 · five concurrent 2,000 stakes at capDailyStakeTzs 5,000 → exactly 2 placed, 3 DAILY_STAKE",
      rs.filter((r) => r.ok).length === 2 && rs.filter((r) => capOf(r) === "DAILY_STAKE").length === 3, rs.map(show).join(" · "));
  }
  {
    const staff = await w.dal.houseBotIntentStore.staffChosenPlacedToday({ houseBotId: null });
    await w.limits({ gCapStaffChosenPerDay: staff.count + 3 });
    const bots = await Promise.all(Array.from({ length: 8 }, () => w.bot()));
    const shots = await Promise.all(bots.map((b) => manualOpener(b)));
    const rs = await Promise.all(shots.map((s, k) => w.place(bots[k], s.i)));
    ok("4.4 · eight concurrent Enter now stakes across eight bots at 3 left → exactly 3 placed, 5 GLOBAL_STAFF_CHOSEN_PER_DAY",
      rs.filter((r) => r.ok).length === 3 && rs.filter((r) => capOf(r) === "GLOBAL_STAFF_CHOSEN_PER_DAY").length === 5, rs.map(show).join(" · "));
    await w.limits();
  }
  {
    // OFF mid-burst: nothing that reaches H4 after the switch commits.
    const bots = await Promise.all(Array.from({ length: 4 }, () => w.bot()));
    const shots = await Promise.all(bots.map((b) => opener(b)));
    await w.switchOff();
    const rs = await Promise.all(shots.map((s, k) => w.place(bots[k], s.i)));
    ok("4.5 · switch OFF, then a burst → every stake refused house_disabled, no position", rs.every((r) => r.ok === false && r.reason === "house_disabled")
      && (await Promise.all(shots.map((s) => houseCount(s.market.id)))).every((n) => n === 0), rs.map(show).join(" · "));
    await w.switchOn();
  }
  {
    // A9 step 1 + H4: OFF written while a bet is past H1 and waiting on house:control binds at the re-read.
    const b = await w.bot();
    const { market, i } = await opener(b);
    const hold = withLock(w.constants.HOUSE_CONTROL_LOCK, () => sleep(1_000));
    await sleep(100);
    const bet = w.place(b, i);
    await sleep(300);
    await w.switchOff();
    await hold;
    const r = await bet;
    ok("4.6 · a bet already past H1, waiting on house:control, meets an OFF written meanwhile → house_disabled at H4", r.ok === false && r.reason === "house_disabled" && (await houseCount(market.id)) === 0, show(r));
    await w.switchOn();
  }
}

// ═══ §5 · the in-lock re-reads: staleAt, blackout, concentration, product and round ═════════════
section("§5 · in-lock re-reads");
{
  {
    // MON-03: the wallet lock is held past the intent's staleAt; the H4 re-read on the database clock refuses.
    const b = await w.bot();
    const { market, i } = await opener(b, 1_000, { staleAt: w.iso(1_500) });
    const hold = withLock(`wallet:${b.userId}`, () => sleep(2_500));
    await sleep(100);
    const r = await w.place(b, i);
    await hold;
    ok("5.1 · wallet:<botUser> held past staleAt → house_intent_stale, 0 positions", r.ok === false && r.reason === "house_intent_stale" && (await houseCount(market.id)) === 0, show(r));
  }
  {
    // ⚠️ Stamped through the product's own writer (`marketStore.stamp`, the Prisma client on Postgres), never
    // raw SQL: a raw Date bound into a naive `timestamp` column goes through the session time zone and lands
    // hours off — which is how this fixture's first version made a stale claim look fresh.
    const stamp = (marketId: string, fields: Record<string, unknown>) => w.mdal.marketStore.stamp(marketId, fields);
    const blackoutCase = async (label: string, prepare: (marketId: string) => Promise<unknown>, expectBlocked: boolean) => {
      const b = await w.bot();
      const { market, i } = await manualOpener(b);
      await prepare(market.id);
      const r = await w.place(b, i);
      ok(label, expectBlocked ? (r.ok === false && r.reason === "house_info_blackout") : r.ok === true, show(r));
    };
    await blackoutCase("5.2 · an AI result stamped on a LIVE poll → Enter now refused house_info_blackout", (id) => stamp(id, { sentinelOutcome: "YES" }), true);
    await blackoutCase("5.3 · a poll closed on a result and reopened by an officer (sanctioned change (r)) → house_info_blackout", async (id) => {
      await stamp(id, { status: "CLOSED" });
      const re = await w.svc.adminReopenMarket(id, OFFICER);
      const m = await w.svc.getMarket(id);
      if (!re.ok || m.status !== "LIVE" || !m.reopenedAt || m.reopenCount !== 1) throw new Error(`reopen fixture: ${show(re)} ${m.status} ${m.reopenedAt} ${m.reopenCount}`);
    }, true);
    await blackoutCase("5.4 · a fresh resolve claim → house_info_blackout", (id) => stamp(id, { resolveClaimedAt: new Date(Date.now() - 60_000).toISOString() }), true);
    await blackoutCase("5.5 · CONTROL · a resolve claim older than RESOLVE_CLAIM_TTL_MS → not blocked, places",
      (id) => stamp(id, { resolveClaimedAt: new Date(Date.now() - 11 * 60_000).toISOString() }), false);
    {
      const b = await w.bot();
      const { market, i } = await opener(b);
      await stamp(market.id, { sentinelOutcome: "YES" });
      const r = await w.place(b, i);
      ok("5.6 · CONTROL · an automated OPENER on a stamped poll is not staff-chosen → not blacked out, places", r.ok === true, show(r));
    }
  }
  {
    // Counterparty concentration (INT-02): Enter now THIN against 80 / 20 locked NO.
    const market = await w.poll({ graceMin: 0 });
    const big = await lockedNo(market.id, 8_000);
    const small = await lockedNo(market.id, 2_000);
    await w.limits({ gStaffChosenMaxCounterpartyShare: 50 });
    const b = await w.bot();
    const i = await w.intent(b, market.id, { kind: "MANUAL", entryCondition: "THIN", side: "YES", stakeTzs: 5_000 });
    const r = await w.place(b, i);
    ok("5.7 · one account holds 80% of the locked NO money at share limit 50 → house_counterparty_concentration", r.ok === false && r.reason === "house_counterparty_concentration", show(r));
    await w.dal.houseBotIntentStore.cancelLive({ houseBotId: b.botId }, "CASE_DONE");
    await w.limits({ gStaffChosenMaxCounterpartyShare: null });
    const b2 = await w.bot();
    const i2 = await w.intent(b2, market.id, { kind: "MANUAL", entryCondition: "THIN", side: "YES", stakeTzs: 5_000 });
    const r2 = await w.place(b2, i2);
    ok("5.8 · the share limit NOT SET → house_counterparty_concentration (Enter now refuses)", r2.ok === false && r2.reason === "house_counterparty_concentration", show(r2));
    await w.dal.houseBotIntentStore.cancelLive({ houseBotId: b2.botId }, "CASE_DONE");
    {
      // LIE-01: the share limit NOT SET turns Enter now off for BOTH entry conditions (MON-14's consequence).
      const bo = await w.bot();
      const eo = await manualOpener(bo);
      const ro = await w.place(bo, eo.i);
      ok("5.8b · share limit NOT SET → an Enter now OPENER on an empty poll is refused house_counterparty_concentration",
        ro.ok === false && ro.reason === "house_counterparty_concentration" && (await houseCount(eo.market.id)) === 0, show(ro));
      await w.limits({ gStaffChosenMaxCounterpartyShare: 50 });
      const bc = await w.bot();
      const ec = await manualOpener(bc);
      const rc = await w.place(bc, ec.i);
      ok("5.8c · CONTROL · with the share limit at 50 the same Enter now OPENER places", rc.ok === true, show(rc));
    }
    await w.limits({ gStaffChosenMaxCounterpartyShare: 80 });
    const b3 = await w.bot();
    const i3 = await w.intent(b3, market.id, { kind: "MANUAL", entryCondition: "THIN", side: "YES", stakeTzs: 5_000 });
    const r3 = await w.place(b3, i3);
    const row = await w.dal.houseBotIntentStore.get(i3.id);
    const cps = (row?.decision?.counterparties ?? []) as Any[];
    ok("5.9 · at share limit 80 the stake places", r3.ok === true, show(r3));
    ok("5.10 · …attributed pro rata to the ≥25% account only: 5,000 × 8,000 / 10,000 = 4,000 to the 80% holder",
      cps.length === 1 && cps[0].userId === big.userId && cps[0].attributedTzs === 4_000 && cps[0].sharePct === 80, JSON.stringify(cps));
    ok("5.11 · …and the 20% holder is not attributed", !cps.some((c) => c.userId === small.userId));
    await w.limits();
  }
  {
    // N1 §3: Enter now THIN sizes against LOCKED money only — a stake still inside its margin counts 0.
    const market = await w.poll({ graceMin: 0 });
    const p = await w.user({ balance: 1_000_000 });
    await w.svc.buyPosition(p, { marketId: market.id, side: "NO", stake: 10_000, idempotencyKey: crypto.randomUUID() });
    const b = await w.bot();
    const r = await w.place(b, await w.intent(b, market.id, { kind: "MANUAL", entryCondition: "THIN", side: "YES", stakeTzs: 2_000 }));
    ok("5.17 · Enter now THIN against NO money placed under 7 s ago → house_condition_gone{THIN}", r.ok === false && r.reason === "house_condition_gone" && r.detail?.condition === "THIN", show(r));
  }
  {
    // The condition comes from the CLAIMED ROW, never from the market's state: a THIN press on a poll that
    // is empty is refused, never quietly placed as an opener.
    const b = await w.bot();
    const market = await w.poll({ graceMin: 0 });
    const r = await w.place(b, await w.intent(b, market.id, { kind: "MANUAL", entryCondition: "THIN", side: "YES", stakeTzs: 1_000 }));
    ok("5.18 · an Enter now THIN row on an empty poll → house_condition_gone{THIN} (never re-chosen as OPENER)", r.ok === false && r.reason === "house_condition_gone" && r.detail?.condition === "THIN", show(r));
  }
  {
    // N2 §3: a TARGETED counter sizes against locked money; its own unlocked trigger does not count.
    const market = await w.poll({ graceMin: 0 });
    const p = await w.user({ balance: 1_000_000 });
    const t = await w.svc.buyPosition(p, { marketId: market.id, side: "NO", stake: 10_000, idempotencyKey: crypto.randomUUID() });
    const b = await w.bot();
    const r = await w.place(b, await w.intent(b, market.id, { kind: "COUNTER", triggerPositionId: t.data.positionId, triggerUserId: p, targetId: `hbt_unlocked_${process.pid}`, decision: { reactTo: "EVERY" }, side: "YES", stakeTzs: 2_000 }));
    ok("5.19 · a targeted COUNTER whose trigger is still inside its margin → house_condition_gone{COUNTER}", r.ok === false && r.reason === "house_condition_gone" && r.detail?.condition === "COUNTER", show(r));
  }
  {
    const b = await w.bot();
    const { market, i } = await opener(b);
    if (w.onPostgres) await w.prisma()!.$executeRawUnsafe(`UPDATE "PredictionMarket" SET "productLine" = 'JACKPOT' WHERE "id" = $1`, market.id);
    else (await w.mdal.marketStore.get(market.id)).productLine = "JACKPOT";
    const r = await w.place(b, i);
    ok("5.12 · a raw product line no policy admits (JACKPOT) → house_product_not_allowed", r.ok === false && r.reason === "house_product_not_allowed", show(r));
  }
  {
    const b = await w.bot();
    const ud = await w.svc.createMarket({
      titleEn: "Up or Down seam case", titleSw: "Juu au Chini", category: "macro", sourceUrl: "https://bot.go.tz",
      resolutionCriterion: "Round close.", resolutionAt: w.iso(3_600_000), proposedBy: OFFICER, productLine: "UPDOWN",
      rateOverrides: { freeExitGraceMinutes: 0, paidExitWindowMinutes: 0 },
    });
    const i = await w.intent(b, ud.id, { kind: "OPENER", productLine: "UPDOWN", side: "YES", stakeTzs: 1_000 });
    const r = await w.place(b, i);
    ok("5.13 · an Up & Down market with no round row → house_round_locked (the lock time cannot be proven)", r.ok === false && r.reason === "house_round_locked", show(r));
  }
  {
    // LIE-03: a REAL round (asset → chain → confirmed observation → openRound), so the round-lock formula
    // (opensAt + durationMinutes, capped at the market's close) is what decides — not a missing row.
    const cfg: Any = await import("../../src/lib/server/updown-config.ts");
    const uds: Any = await import("../../src/lib/server/updown-service.ts");
    const udd: Any = await import("../../src/lib/server/updown-dal.ts");
    const { seedDefaultSources, addSource } = await import("../../src/lib/server/source-registry.ts");
    await seedDefaultSources();
    await addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto", rationale: "test fixture (mirrors production)", addedBy: "system" });
    const a = await cfg.createAsset({
      key: `B${process.pid}`, symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
      priceSourceUrl: "https://api.twelvedata.com/quote", category: "crypto", decimals: 2, minMoveTicks: 2,
    }, OFFICER);
    if (a.ok) await cfg.setAssetEnabled(a.data.id, true, OFFICER);
    const c = a.ok ? await cfg.createChain({ assetId: a.data.id, durationMinutes: 5 }, OFFICER) : a;
    if (c.ok) await cfg.setChainState(c.data.id, "RUNNING", OFFICER);
    const chain = c.ok ? await udd.chainStore.get(c.data.id) : null;
    const anchorMs = cfg.cleanGridAnchor(Date.now() + 60_000);
    const openRoundAt = async (k: number) => {
      const boundary = new Date(anchorMs + k * 5 * 60_000).toISOString();
      const o = await udd.observationStore.ensure(a.data.id, boundary);
      await udd.observationStore.confirm(o.id, {
        price: 60_000, sourceUrl: "https://api.twelvedata.com/quote", sourceQuotedAt: boundary,
        evidence: "BTC quoted 60000", confidence: 96, model: "test-stub", rawHash: `h${k}_${process.pid}`,
      });
      return uds.openRound(chain, boundary, o.id, 60_000);
    };
    const r1 = chain ? await openRoundAt(0) : { ok: false, error: `fixture: ${a.error ?? c.error}` };
    const r2 = chain ? await openRoundAt(1) : r1;
    ok("5.13a · fixture · two real Up & Down rounds open on a running chain", r1.ok === true && r2.ok === true, `${r1.ok ? "ok" : r1.error} · ${r2.ok ? "ok" : r2.error}`);
    if (r1.ok && r2.ok) {
      // Round 1's betting window is moved into the past: opensAt goes back until opensAt + durationMinutes is a
      // minute ago. `opensAt` is write-once in the round store, so the fixture shifts the stored value relative
      // to itself: interval arithmetic on Postgres (no Date crosses the naive-timestamp boundary), the memory
      // map directly. The market row — its close, its selection close — is untouched.
      const before = Date.parse((await udd.roundStore.get(r1.data.id)).opensAt);
      const shiftMs = Math.ceil((before + 5 * 60_000 - Date.now() + 60_000) / 1_000) * 1_000;
      if (w.onPostgres) await w.prisma()!.$executeRawUnsafe(`UPDATE "UpDownRound" SET "opensAt" = "opensAt" - ($1::int * interval '1 millisecond') WHERE "id" = $2`, shiftMs, r1.data.id);
      else { const mem = (globalThis as Any).__50PICK_UD_ROUNDS as Map<string, Any>; mem.set(r1.data.id, { ...mem.get(r1.data.id), opensAt: new Date(before - shiftMs).toISOString() }); }
      const after = Date.parse((await udd.roundStore.get(r1.data.id)).opensAt);
      ok("5.13a2 · fixture · round 1's betting window (opensAt + 5 min) now ended about a minute ago",
        before - after === shiftMs && after + 5 * 60_000 < Date.now() - 50_000, `shift ${shiftMs} ms · window ended ${Date.now() - (after + 5 * 60_000)} ms ago`);
      const bl = await w.bot();
      const rl = await w.place(bl, await w.intent(bl, r1.data.marketId, { kind: "OPENER", productLine: "UPDOWN", side: "YES", stakeTzs: 1_000 }));
      ok("5.13b · a real round whose opensAt + durationMinutes has passed → house_round_locked, nothing placed",
        rl.ok === false && rl.reason === "house_round_locked" && (await houseCount(r1.data.marketId)) === 0, show(rl));
      const bo = await w.bot();
      const ro = await w.place(bo, await w.intent(bo, r2.data.marketId, { kind: "OPENER", productLine: "UPDOWN", side: "YES", stakeTzs: 1_000 }));
      ok("5.13c · CONTROL · the same OPENER on a round still inside its window places", ro.ok === true, show(ro));
    }
  }
  {
    // PLAN H4: a NO_FUNDS abort after markPlaced leaves the intent CLAIMED with no position, on BOTH stores.
    const b = await w.bot();
    const { market, i } = await opener(b);
    const realAdjust = w.db.wallet.adjust;
    let tripped = false;
    w.db.wallet.adjust = async (...args: Any[]) => {
      if (!tripped && args[1]?.balance < 0) { tripped = true; return null; }
      return realAdjust.apply(w.db.wallet, args);
    };
    let r: Any;
    try { r = await w.place(b, i); } finally { w.db.wallet.adjust = realAdjust; }
    const row = await w.dal.houseBotIntentStore.get(i.id);
    ok("5.14 · a debit refused after markPlaced → balance_insufficient", tripped && r.ok === false && r.reason === "balance_insufficient", show(r));
    ok("5.15 · …the intent is CLAIMED again with no position (rolled back on Postgres, reverted in memory)", row?.status === "CLAIMED" && row?.positionId == null && row?.finishedAt == null,
      `${row?.status} ${row?.positionId} ${row?.finishedAt}`);
    ok("5.16 · …and no house position exists", (await houseCount(market.id)) === 0);
  }
}

// ═══ §6 · Postgres only: lock timeouts bound a house bet and never a player's (04 A9) ═══════════
if (w.onPostgres) {
  section("§6 · lock timeouts (Postgres)");
  {
    const b = await w.bot();
    const { market, i } = await opener(b);
    const player = await w.user({ balance: 100_000 });
    const hold = withLock(w.constants.HOUSE_CONTROL_LOCK, () => sleep(6_000));
    await sleep(200);
    const t0 = Date.now();
    const house = w.place(b, i).then((r: Any) => ({ r, ms: Date.now() - t0 }));
    await sleep(300);
    const t1 = Date.now();
    const playerBet = await w.svc.buyPosition(player, { marketId: market.id, side: "NO", stake: 1_000, idempotencyKey: crypto.randomUUID() });
    const playerMs = Date.now() - t1;
    const h = await house;
    await hold;
    ok("6.1 · house:control held → the house bet returns BUSY after the 2 s lock_timeout, not after the holder's 6 s", h.r.ok === false && h.r.code === "BUSY" && h.ms >= 1_800 && h.ms < 5_000, `${show(h.r)} in ${h.ms} ms`);
    ok("6.2 · a player's bet on the same market completes while house:control is still held", playerBet.ok === true && playerMs < 5_000, `${show(playerBet)} in ${playerMs} ms`);
    ok("6.3 · …and the house bet moved nothing", (await houseCount(market.id)) === 0);
  }
  {
    const b = await w.bot();
    const { i } = await opener(b);
    const hold = withLock(w.constants.HOUSE_CONTROL_LOCK, () => sleep(4_000));
    await sleep(200);
    const t0 = Date.now();
    await w.switchOff();
    const offMs = Date.now() - t0;
    await hold;
    const r = await w.place(b, i);
    ok("6.4 · switching OFF never waits on house:control (A9 step 1)", offMs < 1_500, `${offMs} ms`);
    ok("6.5 · …and the next house bet is refused house_disabled", r.ok === false && r.reason === "house_disabled", show(r));
    await w.switchOn();
  }
  {
    const b = await w.bot();
    const { market, i } = await opener(b);
    const hold = withLock(`market:${market.id}`, () => sleep(6_000));
    await sleep(200);
    const t0 = Date.now();
    const r = await w.place(b, i);
    const ms = Date.now() - t0;
    await hold;
    ok("6.6 · market:<id> held → the house bet returns BUSY after ~2 s", r.ok === false && r.code === "BUSY" && ms >= 1_800 && ms < 5_000, `${show(r)} in ${ms} ms`);
  }
}

// ═══ §7 · the kill switch as a service: A9's four steps (04 A9 F9; C4-SPEC ruling 139) ═══════════
section("§7 · switchOffHouseBots");
{
  const KS: Any = await import("../../src/lib/server/house-bot/kill-switch.ts");
  const { SWITCH_OFF_COPY }: Any = await import("../../src/lib/house-bot/feed-copy.ts");
  const { drainLock, inLock, currentLockTx }: Any = await import("../../src/lib/server/locks.ts");
  const { auditFlush, getAuditPage }: Any = await import("../../src/lib/server/audit.ts");

  const recSwitch = () => {
    const calls: Any[] = [];
    const unused = async () => { throw new Error("caps §7: the kill switch speaks only on switchedOff"); };
    return {
      calls,
      alerts: {
        placed: unused, once: unused, security: unused, botStopped: unused,
        switchedOff: async (c: Any) => { calls.push({ ...c, inLock: inLock() || currentLockTx() != null }); },
      },
    };
  };
  const control = () => w.dal.houseBotControlStore.get() as Promise<Any>;
  const offEvents = async () => ((await w.dal.houseBotEventStore.listByKinds(["SWITCH_OFF"], { limit: 200 })) as Any[]);
  const offAudits = async () => { await auditFlush(); return (getAuditPage({ limit: 10_000 }) as Any[]).filter((e) => e.action === "house_bot.switch_off"); };

  // ⛔ Earlier sections leave live rows behind; only this section's own stake may be counted by the cancel step.
  await w.dal.houseBotIntentStore.cancelLive({ all: true }, "MASTER_OFF");

  // ── 7.1 · the whole path, with a queued stake to cancel ──
  {
    await w.switchOn();
    const b = await w.bot();
    const { i } = await opener(b);
    const rec = recSwitch();
    const eventsBefore = (await offEvents()).length;
    const auditsBefore = (await offAudits()).length;
    const res = await KS.switchOffHouseBots({ cause: "MANUAL", byId: OFFICER, reason: "caps section 7", alerts: rec.alerts });
    const c = await control();
    const row = (await w.dal.houseBotIntentStore.get(i.id)) as Any;
    const ev = (await offEvents()).slice(eventsBefore);
    const au = (await offAudits()).slice(auditsBefore);
    ok("7.1 · A9 steps 1–4 · OFF written, the drain answered, the queued stake CANCELLED(MASTER_OFF), ONE SWITCH_OFF event carrying {cause, cancelled, drain}, its audit linked, and the alert last and outside every lock",
      res.ok === true && res.changed === true && res.drain === "drained" && res.message === SWITCH_OFF_COPY.DRAINED
        && c.enabled === false && c.offCause === "MANUAL" && c.switchedById === OFFICER
        && row.status === "CANCELLED" && row.reasonCode === "MASTER_OFF" && res.cancelled === 1
        && ev.length === 1 && ev[0].payload?.cause === "MANUAL" && ev[0].payload?.cancelled === 1 && ev[0].payload?.drain === "drained"
        && au.length === 1 && ev[0].auditId === au[0].id
        && rec.calls.length === 1 && rec.calls[0].cause === "MANUAL" && rec.calls[0].cancelled === 1 && rec.calls[0].inLock === false,
      JSON.stringify({ res, enabled: c.enabled, row: row.status, events: ev.length, audits: au.length, calls: rec.calls }));

    // ── 7.2 · a second OFF changes nothing and says so ──
    const rec2 = recSwitch();
    const res2 = await KS.switchOffHouseBots({ cause: "MANUAL", byId: OFFICER, reason: "second press", alerts: rec2.alerts });
    ok("7.2 · an OFF that finds it already off writes nothing, cancels nothing and tells nobody (two writers, one OFF)",
      res2.ok === true && res2.changed === false && res2.drain === "skipped" && res2.cancelled === 0
        && res2.message === SWITCH_OFF_COPY.ALREADY_OFF && rec2.calls.length === 0
        && (await offEvents()).length === eventsBefore + 1 && (await offAudits()).length === auditsBefore + 1,
      JSON.stringify({ res2, events: (await offEvents()).length - eventsBefore }));
  }

  // ── 7.3 · a bet still inside house:control: OFF is binding at once, the drain only informs ──
  {
    await w.switchOn();
    const b = await w.bot();
    const { i } = await opener(b);
    const rec = recSwitch();
    const hold = withLock(w.constants.HOUSE_CONTROL_LOCK, () => sleep(6_000));
    await sleep(200);
    const t0 = Date.now();
    const pending = KS.switchOffHouseBots({ cause: "MANUAL", byId: OFFICER, reason: "held", alerts: rec.alerts });
    // The switch must be binding long before the drain gives up: poll the row, not the promise.
    let bindingMs = -1;
    for (let k = 0; k < 60; k++) {
      if ((await control()).enabled === false) { bindingMs = Date.now() - t0; break; }
      await sleep(50);
    }
    const res = await pending;
    const totalMs = Date.now() - t0;
    await hold;
    const r = await w.place(b, i);
    ok("7.3 · ⭐ A9 steps 1–2 · with a bet still holding house:control the switch is OFF in well under 1.5 s (step 1 takes no lock) while the drain is still waiting",
      bindingMs >= 0 && bindingMs < 1_500 && res.ok === true && res.changed === true, `binding in ${bindingMs} ms, answered in ${totalMs} ms`);
    ok("7.4 · …and the bounded drain answers BUSY with A9's own words, without ever leaving the switch on",
      res.drain === "busy" && res.message === SWITCH_OFF_COPY.BUSY && totalMs >= 2_500 && totalMs < 8_000 && (await control()).enabled === false,
      `${res.drain} · ${res.message} · ${totalMs} ms`);
    ok("7.5 · …and the next house bet is refused house_disabled", r.ok === false && r.reason === "house_disabled", show(r));
  }

  // ── 7.6 · the only outcome that leaves house bots ON says so ──
  {
    await w.switchOn();
    const rec = recSwitch();
    const realSwitchOff = w.dal.houseBotControlStore.switchOff;
    const eventsBefore = (await offEvents()).length;
    let res: Any;
    w.dal.houseBotControlStore.switchOff = async () => { throw new Error("injected control write failure"); };
    try { res = await KS.switchOffHouseBots({ cause: "MANUAL", byId: OFFICER, reason: "write fails", alerts: rec.alerts }); }
    finally { w.dal.houseBotControlStore.switchOff = realSwitchOff; }
    ok("7.6 · A9 · a failed OFF write is the one outcome that leaves house bots ON: it says so in plain words, writes no event and tells nobody",
      res.ok === false && res.failure === "WRITE_FAILED" && res.message === SWITCH_OFF_COPY.WRITE_FAILED
        && (await control()).enabled === true && (await offEvents()).length === eventsBefore && rec.calls.length === 0,
      JSON.stringify({ res, enabled: (await control()).enabled }));
    await w.switchOff();
  }

  // ── 7.7 · the drain must never answer about its own caller ──
  {
    let threw = "";
    await withLock(w.constants.HOUSE_CONTROL_LOCK, async () => {
      try { await drainLock(w.constants.HOUSE_CONTROL_LOCK, { timeout: "250ms" }); } catch (e) { threw = String((e as Error)?.message ?? e); }
    });
    ok("7.7 · ⭐ a drain inside a lock would answer 'drained' about itself: it refuses to run there", /must not run inside a lock/.test(threw), threw || "no throw");
    const free = await drainLock(w.constants.HOUSE_CONTROL_LOCK, { timeout: "250ms" });
    ok("7.8 · CONTROL · with nothing holding it the same drain answers drained", free === "drained", String(free));
    await w.switchOn();
  }
}
// ═══ §8 · Postgres only: MON-06 — two processes, clocks at −5 s and +5 s, a cash-out racing a house stake (ruling 162) ═══
if (w.onPostgres) {
  section("§8 · MON-06: the lock margin holds across two processes with skewed clocks (Postgres)");
  {
    const { spawn } = await import("node:child_process");
    const { pathToFileURL } = await import("node:url");
    const { join: joinPath, dirname: dirnamePath } = await import("node:path");
    const { fileURLToPath: toPath } = await import("node:url");
    const ROOT8 = joinPath(dirnamePath(toPath(import.meta.url)), "..", "..");
    await w.limits();
    const market = await w.poll({ graceMin: 1, paidMin: 1 });
    const player = await w.user({ balance: 1_000_000 });
    const bought = await w.svc.buyPosition(player, { marketId: market.id, side: "NO", stake: 10_000, idempotencyKey: crypto.randomUUID() });
    if (!bought.ok) throw new Error(`MON-06 fixture: the player's bet was refused ${JSON.stringify(bought)}`);
    // The exit window is 120 s from placement; move placement back 108 s so the window closes ~12 s ahead on the DB clock.
    await w.backdate(bought.data.positionId, 108_000);
    const pos = await w.mdal.positionStore.get(bought.data.positionId);
    const T0 = Date.parse(pos.placedAt) + 120_000;
    const b = await w.bot();
    const run = (role: string, skewMs: number, extra: Record<string, string>) => new Promise<{ code: number | null; result: Any; out: string }>((resolve) => {
      const child = spawn("npx", ["tsx", "--import", pathToFileURL(joinPath(ROOT8, "scripts", "lib", "clock-skew-preload.mjs")).href, "scripts/lib/house-bot-two-process-child.mts"], {
        cwd: ROOT8, shell: process.platform === "win32",
        env: { ...process.env, ROLE: role, SKEW_MS: String(skewMs), T0_ISO: new Date(T0).toISOString(), ...extra },
      });
      let out = "";
      child.stdout?.on("data", (d) => { out += String(d); });
      child.stderr?.on("data", (d) => { out += String(d); });
      child.on("close", (code) => {
        const m = /@@RESULT (\{.*\})/.exec(out);
        resolve({ code, result: m ? JSON.parse(m[1]) : null, out });
      });
    });
    const [cash, house] = await Promise.all([
      run("cashout", -5_000, { POSITION_ID: pos.id, USER_ID: player }),
      run("house", 5_000, { BOT_ID: b.botId, BOT_USER_ID: b.userId, MARKET_ID: market.id }),
    ]);
    ok("8.0 · fixture · both processes ran to the end and reported", cash.code === 0 && house.code === 0 && !!cash.result && !!house.result,
      JSON.stringify({ cash: cash.result ?? cash.out.slice(-300), house: house.result ?? house.out.slice(-300) }));
    const after = await w.mdal.positionStore.get(pos.id);
    const housePositions = (await w.positionsOf(market.id)).filter((p: Any) => p.houseBotId != null);
    const cashedOut = after?.status === "CASHED_OUT";
    ok("8.1 · ⭐ MON-06 · never both: no house stake counted money that was then cashed out",
      !(cashedOut && housePositions.length > 0), JSON.stringify({ status: after?.status, housePositions: housePositions.length, cash: cash.result, house: house.result }));
    ok("8.2 · CONTROL · the race was live: the −5 s cash-out succeeded after the true close, and the +5 s house process tried more than 5 times and placed nothing",
      cashedOut && cash.result?.success === true && Number(cash.result?.atDbMs) >= 500 && housePositions.length === 0 && Number(house.result?.attempts) > 5,
      JSON.stringify({ cash: cash.result, house: house.result }));
  }
}

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
