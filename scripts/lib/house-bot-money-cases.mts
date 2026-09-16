/**
 * The case list behind `test:house-bot-money`. Run by that suite in two child processes — one on
 * Postgres, one on the memory store — never on its own. Every line carries its store.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadWorld, HOLDER_HASH, OFFICER } from "./house-bot-world.mts";
import { EXIT_WINDOW_GRID, exitGridCase } from "./house-bot-exit-grid.mts";

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

const w = await loadWorld();
ok(`0.store · the stores run on ${STORE}`, w.onPostgres === (STORE === "postgres"));

await w.user({ id: OFFICER, role: "ADMIN" });
await w.limits();
await w.switchOn();

/** A poll with a locked NO stake of `noStake` from a fresh player, placed and backdated past the margin. */
async function pollWithLockedNo(noStake = 10_000): Promise<{ market: Any; player: string; noPos: Any }> {
  const market = await w.poll({ graceMin: 0 });
  const player = await w.user({ balance: 1_000_000 });
  const r = await w.svc.buyPosition(player, { marketId: market.id, side: "NO", stake: noStake, idempotencyKey: crypto.randomUUID() });
  if (!r.ok) throw new Error(`fixture bet refused: ${show(r)}`);
  await w.backdate(r.data.positionId, 10_000);
  return { market, player, noPos: await w.mdal.positionStore.get(r.data.positionId) };
}

// ═══ §1 · a FILL places, marked, cash only, exactly once ═════════════════════════════════════
section("§1 · a house stake places once, marked on every row");
{
  const { market } = await pollWithLockedNo(10_000);
  const b = await w.bot();
  const before = await w.bal(b.userId);
  const i = await w.intent(b, market.id, { kind: "FILL", side: "YES", stakeTzs: 5_000 });
  const r = await w.place(b, i);
  ok("1.1 · placeHouseBet places the stake", r.ok === true && !r.data?.replayed, show(r));
  const pos = r.ok ? await w.mdal.positionStore.get(r.data.positionId) : null;
  ok("1.2 · the position carries the house marker", pos?.houseBotId === b.botId, `houseBotId ${pos?.houseBotId}`);
  ok("1.3 · the position is funded entirely in cash (bonus part 0)", pos?.bonusStakeTzs === 0 && pos?.stake === 5_000);
  const txns = pos ? await w.txnsFor(pos.id) : [];
  const placedTxn = txns.find((t: Any) => t.type === "BET_PLACED");
  ok("1.4 · the BET_PLACED transaction carries the same marker", placedTxn?.houseBotId === b.botId, `txn ${placedTxn?.id} marker ${placedTxn?.houseBotId}`);
  const after = await w.bal(b.userId);
  ok("1.5 · the holder's cash balance fell by exactly the stake", before.balance - after.balance === 5_000, `${before.balance} → ${after.balance}`);
  const row = await w.dal.houseBotIntentStore.get(i.id);
  ok("1.6 · markPlaced wrote PLACED with the position id", row?.status === "PLACED" && row?.positionId === pos?.id, `${row?.status} ${row?.positionId}`);
  const m = await w.svc.getMarket(market.id);
  ok("1.7 · the YES pool grew by the stake", m.yesPool === 5_000 && m.noPool === 10_000, `${m.yesPool}/${m.noPool}`);

  // Replay: the same key again (a lost acknowledgement retried).
  const again = await w.place(b, i);
  ok("1.8 · a repeat of the same intent replays the original (replayed: true)", again.ok === true && again.data?.replayed === true && again.data?.positionId === pos?.id, show(again));
  const mine = (await w.positionsOf(market.id)).filter((p: Any) => p.houseBotId === b.botId);
  ok("1.9 · …and there is still exactly one house position", mine.length === 1, `${mine.length}`);
  ok("1.10 · …and no second debit", (await w.bal(b.userId)).balance === after.balance);

  // No early exit, on the offer and on the refusal (sanctioned changes (d) and (e)).
  const co = await w.svc.cashOutValue(pos, m);
  // D19c, ruling 147: the offer and the refusal read exactly as a closed exit does — nothing names the house.
  ok("1.11 · cashOutValue offers no sale on a house position, as a closed window (WINDOW_PASSED)", co.sellable === false && co.reason === "WINDOW_PASSED", JSON.stringify(co));
  const sell = await w.svc.cashOutPosition(b.userId, pos.id);
  ok("1.12 · cashOutPosition refuses with the closed exit window's reason and code", sell.ok === false && sell.reason === "exit_window_closed" && sell.code === "SELECTION_CLOSED", show(sell));
  ok("1.12b · …in the exit window's own words, byte for byte, with no house word",
    sell.ok === false && sell.error === "The sell-out window for this bet has closed — it now rides to settlement. · Muda wa kuuza dau hili umefungwa — litaenda hadi malipo."
      && !/liquidity|ukwasi|house|50pick/i.test(sell.error), sell.ok === false ? sell.error : "ok");
  ok("1.13 · …and the position stays OPEN", (await w.mdal.positionStore.get(pos.id)).status === "OPEN");

  // ⭐ 1.13b–1.13d · THE REFUSAL MUST BE THE MARKER'S, NOT THE WINDOW'S. On the fixture above the exit window has
  // already shut, so the platform refuses this sale anyway and removing the house branch changes nothing a case can
  // see (measured 2026-09-16: mutation (e) was MISSED). Here the market is still open for selling: a player's own
  // bet on it IS sellable, and the house stake beside it still is not.
  {
    const open = await w.poll({ graceMin: 10, paidMin: 10 });
    const opener = await w.place(b, await w.intent(b, open.id, { kind: "OPENER", stakeTzs: 2_000 }));
    const housePos = opener.ok ? await w.mdal.positionStore.get(opener.data.positionId) : null;
    const player = await w.user({ balance: 100_000 });
    const bet = await w.svc.buyPosition(player, { marketId: open.id, side: "NO", stake: 5_000, idempotencyKey: crypto.randomUUID() });
    const mOpen = await w.svc.getMarket(open.id);
    const playerPos = bet.ok ? await w.mdal.positionStore.get(bet.data.positionId) : null;
    const playerValue = playerPos ? await w.svc.cashOutValue(playerPos, mOpen) : null;
    ok("1.13b · CONTROL · this market is still open for selling: a PLAYER's own bet on it is sellable",
      bet.ok === true && playerValue?.sellable === true, JSON.stringify({ bet: bet.ok, playerValue }));
    const houseValue = housePos ? await w.svc.cashOutValue(housePos, mOpen) : null;
    ok("1.13c · …and the house stake beside it is offered no sale (WINDOW_PASSED, the closed window's own word)",
      opener.ok === true && houseValue?.sellable === false && houseValue?.reason === "WINDOW_PASSED", JSON.stringify({ opener: opener.ok, houseValue }));
    const sellOpen = housePos ? await w.svc.cashOutPosition(b.userId, housePos.id) : null;
    ok("1.13d · ⭐ (e) · the holder cannot sell a house stake even where the WINDOW IS OPEN, and it stays OPEN",
      sellOpen?.ok === false && sellOpen?.code === "SELECTION_CLOSED"
        && (await w.mdal.positionStore.get(housePos!.id)).status === "OPEN", show(sellOpen));
    // ⭐ AND THE CONDITION IS THE RIGHT WAY ROUND. Removing the branch entirely changes nothing a case can see —
    // `cashOutPosition` calls `cashOutValue`, whose own house branch (sanctioned change (d)) already refuses, so the
    // two are defence in depth (measured 2026-09-16: the (e) mutation was MISSED twice). What the branch CAN get
    // wrong is which side of the marker it names, and that is visible immediately: the player beside it must still
    // be able to sell.
    const sellPlayer = playerPos ? await w.svc.cashOutPosition(player, playerPos.id) : null;
    ok("1.13e · ⭐ (e) · …while the PLAYER on the same market sells their own bet normally (the marker, not the market, is what refuses)",
      sellPlayer?.ok === true && (await w.mdal.positionStore.get(playerPos!.id)).status === "CASHED_OUT", show(sellPlayer));
  }

  // D19c, C4 ruling 154: the holder's own data export keeps their money rows but never the house marker.
  const { exportUserData } = await import("../../src/lib/server/user-service.ts");
  const exported = await exportUserData(b.userId);
  const rowOut = (exported.transactions as Any[]).find((t) => t.id === placedTxn?.id);
  ok("1.14 · ruling 154 · the holder's export carries the house stake's transaction WITHOUT the house marker (the raw row has it)",
    placedTxn?.houseBotId === b.botId && !!rowOut && !("houseBotId" in rowOut) && !JSON.stringify(exported).includes(b.botId),
    JSON.stringify({ raw: placedTxn?.houseBotId, exported: rowOut ? Object.keys(rowOut) : null }));
}

// ═══ §2 · refusals that must move nothing ═══════════════════════════════════════════════════
section("§2 · refusals move nothing");
{
  const { market } = await pollWithLockedNo(10_000);
  const b = await w.bot();
  const snap = async () => ({ bal: (await w.bal(b.userId)).balance, pools: await w.svc.getMarket(market.id), house: (await w.positionsOf(market.id)).filter((p: Any) => p.houseBotId != null).length });
  const s0 = await snap();

  // 2.1 superseded: the intent is cancelled after the claim (Remove / auto-pause / OFF).
  const i1 = await w.intent(b, market.id, { kind: "FILL", side: "YES", stakeTzs: 2_000 });
  await w.dal.houseBotIntentStore.cancelLive({ houseBotId: b.botId }, "BOT_NOT_ACTIVE");
  const r1 = await w.place(b, i1);
  ok("2.1 · a cancelled intent reaches markPlaced and ends house_intent_superseded (never a key mismatch)", r1.ok === false && r1.reason === "house_intent_superseded", show(r1));
  const s1 = await snap();
  ok("2.2 · …no house position, no debit, pools unchanged", s1.house === s0.house && s1.bal === s0.bal && s1.pools.yesPool === s0.pools.yesPool,
    `house ${s1.house} bal ${s1.bal} yes ${s1.pools.yesPool}`);
  ok("2.3 · …and the intent stays CANCELLED with no position", (await w.dal.houseBotIntentStore.get(i1.id))?.status === "CANCELLED");

  // 2.4 stale: CLAIMED but past staleAt by the time H4 reads it on the database clock.
  const i2 = await w.intent(b, market.id, { kind: "FILL", side: "YES", stakeTzs: 2_000, staleAt: w.iso(1_500) });
  await sleep(2_200);
  const r2 = await w.place(b, i2);
  ok("2.4 · a CLAIMED intent past staleAt ends house_intent_stale", r2.ok === false && r2.reason === "house_intent_stale", show(r2));
  const s2 = await snap();
  ok("2.5 · …no position, no debit", s2.house === s0.house && s2.bal === s0.bal);
  ok("2.6 · …and the intent is still CLAIMED (the mapper writes EXPIRED, not the seam)", (await w.dal.houseBotIntentStore.get(i2.id))?.status === "CLAIMED");
  // One live FILL per market (`hbi_fill_opener_anchor_uq`): retire it before the next case plans another.
  await w.dal.houseBotIntentStore.cancelLive({ houseBotId: b.botId }, "CASE_DONE");

  // 2.7 key and figures (H0).
  const i3 = await w.intent(b, market.id, { kind: "FILL", side: "YES", stakeTzs: 2_000 });
  const wrongStake = await w.svc.placeHouseBet(b.userId, { marketId: market.id, side: "YES", stake: 3_000, idempotencyKey: w.constants.houseIntentKey(i3.id) }, { botId: b.botId, intentId: i3.id });
  ok("2.7 · a stake that differs from the intent row → house_key_mismatch", wrongStake.ok === false && wrongStake.reason === "house_key_mismatch", show(wrongStake));
  const wrongKey = await w.svc.placeHouseBet(b.userId, { marketId: market.id, side: "YES", stake: 2_000, idempotencyKey: "hb:not-this-intent" }, { botId: b.botId, intentId: i3.id });
  ok("2.8 · a key that is not houseIntentKey(intentId) → house_key_mismatch", wrongKey.ok === false && wrongKey.reason === "house_key_mismatch", show(wrongKey));
  const wrongSide = await w.svc.placeHouseBet(b.userId, { marketId: market.id, side: "NO", stake: 2_000, idempotencyKey: w.constants.houseIntentKey(i3.id) }, { botId: b.botId, intentId: i3.id });
  ok("2.9 · a side that differs from the intent row → house_key_mismatch", wrongSide.ok === false && wrongSide.reason === "house_key_mismatch", show(wrongSide));
  const otherBot = await w.bot();
  const wrongBot = await w.svc.placeHouseBet(otherBot.userId, { marketId: market.id, side: "YES", stake: 2_000, idempotencyKey: w.constants.houseIntentKey(i3.id) }, { botId: otherBot.botId, intentId: i3.id });
  ok("2.10 · another bot presenting this intent → house_key_mismatch", wrongBot.ok === false && wrongBot.reason === "house_key_mismatch", show(wrongBot));

  // 2.11 H1 — switch and bot status, read fresh.
  await w.switchOff();
  const off = await w.place(b, i3);
  ok("2.11 · master OFF → house_disabled", off.ok === false && off.reason === "house_disabled", show(off));
  await w.switchOn();
  await w.dal.houseBotStore.setStatus(b.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: null });
  const paused = await w.place(b, i3);
  ok("2.12 · a PAUSED bot → house_bot_inactive", paused.ok === false && paused.reason === "house_bot_inactive", show(paused));
  await w.dal.houseBotStore.setStatus(b.botId, { from: ["PAUSED"], to: "ACTIVE", pauseReason: null, pausedFromStatus: null });
  const s3 = await snap();
  ok("2.13 · after every refusal above: still no house position and no debit", s3.house === s0.house && s3.bal === s0.bal, `house ${s3.house} bal ${s3.bal}`);
  const back = await w.place(b, i3);
  ok("2.14 · CONTROL · the same intent, correctly presented, places", back.ok === true, show(back));
}

// ═══ §3 · cash only, consent, conflicts ═════════════════════════════════════════════════════
section("§3 · cash only, consent and conflicts (H2)");
{
  // One market per case: a market holds one live FILL (`hbi_fill_opener_anchor_uq`, anchor = market).
  const m1 = await pollWithLockedNo(20_000);
  const b = await w.bot({ balance: 1_000, bonusBalance: 50_000 });
  const i = await w.intent(b, m1.market.id, { kind: "FILL", side: "YES", stakeTzs: 5_000 });
  const r = await w.place(b, i);
  ok("3.1 · cash 1,000 with bonus 50,000 and a 5,000 stake → house_cash_only", r.ok === false && r.reason === "house_cash_only", show(r));
  const wal = await w.bal(b.userId);
  ok("3.2 · …the bonus balance is untouched", (wal.bonusBalance ?? 0) === 50_000 && wal.balance === 1_000, `${wal.balance} / ${wal.bonusBalance}`);

  const mc = await pollWithLockedNo(20_000);
  const b2 = await w.bot();
  await w.setUserFields(b2.userId, { passwordHash: "hash_changed_by_holder" });
  const i2 = await w.intent(b2, mc.market.id, { kind: "FILL", side: "YES", stakeTzs: 2_000 });
  const r2 = await w.place(b2, i2);
  ok("3.3 · the holder changed their password → house_consent_stale", r2.ok === false && r2.reason === "house_consent_stale", show(r2));
  await w.setUserFields(b2.userId, { passwordHash: HOLDER_HASH });

  const mr = await pollWithLockedNo(20_000);
  const b3 = await w.bot();
  await w.setUserFields(b3.userId, { role: "AGENT" });
  const i3 = await w.intent(b3, mr.market.id, { kind: "FILL", side: "YES", stakeTzs: 2_000 });
  const r3 = await w.place(b3, i3);
  ok("3.4 · the holder is no longer a PLAYER → house_account_ineligible", r3.ok === false && r3.reason === "house_account_ineligible", show(r3));

  const mo = await pollWithLockedNo(20_000);
  const b4 = await w.bot();
  const own = await w.svc.buyPosition(b4.userId, { marketId: mo.market.id, side: "NO", stake: 1_000, idempotencyKey: crypto.randomUUID() });
  ok("3.5 · fixture · the holder places their OWN bet on the market", own.ok === true, show(own));
  const i4 = await w.intent(b4, mo.market.id, { kind: "FILL", side: "YES", stakeTzs: 2_000 });
  const r4 = await w.place(b4, i4);
  ok("3.6 · the holder's own OPEN position → house_market_conflict{OWNER_POSITION}", r4.ok === false && r4.reason === "house_market_conflict" && r4.detail?.conflict === "OWNER_POSITION", show(r4));

  // Another bot already holds this market (I3: one bot per market). Bot B arrives as an Enter now press.
  const m2 = await pollWithLockedNo(20_000);
  const bA = await w.bot(), bB = await w.bot();
  const iA = await w.intent(bA, m2.market.id, { kind: "FILL", side: "YES", stakeTzs: 2_000 });
  const rA = await w.place(bA, iA);
  ok("3.7 · fixture · bot A places on the market", rA.ok === true, show(rA));
  const iB = await w.intent(bB, m2.market.id, { kind: "MANUAL", entryCondition: "THIN", side: "YES", stakeTzs: 2_000 });
  const rB = await w.place(bB, iB);
  ok("3.8 · bot B on the same market → house_market_conflict{OTHER_BOT}", rB.ok === false && rB.reason === "house_market_conflict" && rB.detail?.conflict === "OTHER_BOT", show(rB));
}

// ═══ §4 · the mode condition, on locked money only ══════════════════════════════════════════
section("§4 · mode conditions read locked money (H3, 04 A15, N1 §4.1)");
{
  // A FILL may not size against money that can still leave: a fresh NO stake inside its margin.
  const market = await w.poll({ graceMin: 0 });
  const p = await w.user({ balance: 100_000 });
  const fresh = await w.svc.buyPosition(p, { marketId: market.id, side: "NO", stake: 10_000, idempotencyKey: crypto.randomUUID() });
  const b = await w.bot();
  const i = await w.intent(b, market.id, { kind: "FILL", side: "YES", stakeTzs: 5_000 });
  const r = await w.place(b, i);
  ok("4.1 · NO money placed under LOCK_MARGIN_MS ago does not count → house_condition_gone{FILL}", r.ok === false && r.reason === "house_condition_gone" && r.detail?.condition === "FILL", show(r));
  await w.dal.houseBotIntentStore.cancelLive({ houseBotId: b.botId }, "CASE_DONE");
  await w.backdate(fresh.data.positionId, 8_000);
  const i2 = await w.intent(b, market.id, { kind: "FILL", side: "YES", stakeTzs: 5_000 });
  const r2 = await w.place(b, i2);
  ok("4.2 · CONTROL · the same stake 8 s later (past the 7 s margin) → the FILL places", r2.ok === true, show(r2));

  // Money of an account the house may not react to counts as nothing (I3).
  const m2 = await w.poll({ graceMin: 0 });
  const agent = await w.user({ balance: 100_000, role: "PLAYER" });
  const ab = await w.svc.buyPosition(agent, { marketId: m2.id, side: "NO", stake: 10_000, idempotencyKey: crypto.randomUUID() });
  await w.backdate(ab.data.positionId, 10_000);
  await w.setUserFields(agent, { role: "AGENT" });
  const b2 = await w.bot();
  const i3 = await w.intent(b2, m2.id, { kind: "FILL", side: "YES", stakeTzs: 2_000 });
  const r3 = await w.place(b2, i3);
  ok("4.3 · locked NO money held only by an AGENT counts 0 → house_condition_gone", r3.ok === false && r3.reason === "house_condition_gone", show(r3));

  // OPENER needs both pools empty.
  const m3 = await w.poll({ graceMin: 0 });
  const b3 = await w.bot();
  const i4 = await w.intent(b3, m3.id, { kind: "OPENER", side: "NO", stakeTzs: 1_000 });
  const r4 = await w.place(b3, i4);
  ok("4.4 · OPENER on an empty poll places", r4.ok === true, show(r4));
  // LIE-02: ONE bot and a player's stake, so nothing but the condition can refuse — the exact reason and condition.
  for (const [label, o] of [
    ["OPENER", { kind: "OPENER" }],
    ["Enter now OPENER", { kind: "MANUAL", entryCondition: "OPENER" }],
  ] as const) {
    const m = await w.poll({ graceMin: 0 });
    const pl = await w.user({ balance: 100_000 });
    const pb = await w.svc.buyPosition(pl, { marketId: m.id, side: "NO", stake: 1_000, idempotencyKey: crypto.randomUUID() });
    const bo = await w.bot();
    const ro = await w.place(bo, await w.intent(bo, m.id, { ...o, side: "YES", stakeTzs: 1_000 }));
    ok(`4.5 · ${label} on a poll holding a player's stake → house_condition_gone{OPENER}`,
      pb.ok === true && ro.ok === false && ro.reason === "house_condition_gone" && ro.detail?.condition === "OPENER" && (await w.positionsOf(m.id)).length === 1, show(ro));
  }
  {
    const m = await w.poll({ graceMin: 0 });
    const bo = await w.bot();
    const ro = await w.place(bo, await w.intent(bo, m.id, { kind: "MANUAL", entryCondition: "OPENER", side: "YES", stakeTzs: 1_000 }));
    ok("4.5c · CONTROL · the same Enter now OPENER on an empty poll places", ro.ok === true, show(ro));
  }

  // The trigger of a COUNTER must still be OPEN when the bet lands (house_trigger_gone).
  {
    const m = await w.poll({ graceMin: 5 });
    const pl = await w.user({ balance: 100_000 });
    const t = await w.svc.buyPosition(pl, { marketId: m.id, side: "NO", stake: 10_000, idempotencyKey: crypto.randomUUID() });
    const sold = t.ok ? await w.svc.cashOutPosition(pl, t.data.positionId) : t;
    const bo = await w.bot();
    const r = await w.place(bo, await w.intent(bo, m.id, { kind: "COUNTER", triggerPositionId: t.data?.positionId, triggerUserId: pl, side: "YES", stakeTzs: 2_000 }));
    ok("4.6 · a COUNTER whose trigger was sold back → house_trigger_gone, nothing placed",
      sold.ok === true && r.ok === false && r.reason === "house_trigger_gone" && (await w.positionsOf(m.id)).every((p: Any) => p.houseBotId == null), `sold ${show(sold)} · ${show(r)}`);
    const m2 = await w.poll({ graceMin: 5 });
    const t2 = await w.svc.buyPosition(pl, { marketId: m2.id, side: "NO", stake: 10_000, idempotencyKey: crypto.randomUUID() });
    const b2 = await w.bot();
    const r2 = await w.place(b2, await w.intent(b2, m2.id, { kind: "COUNTER", triggerPositionId: t2.data?.positionId, triggerUserId: pl, side: "YES", stakeTzs: 2_000 }));
    ok("4.6c · CONTROL · the same trigger still OPEN (inside its window) passes the trigger check and stops at the condition",
      r2.ok === false && r2.reason === "house_condition_gone" && r2.detail?.condition === "COUNTER", show(r2));
  }

  // The trigger account on BOTH sides is not countered (TRIGGER_BOTH_SIDES).
  {
    const m = await w.poll({ graceMin: 0 });
    const pl = await w.user({ balance: 1_000_000 });
    const no = await w.svc.buyPosition(pl, { marketId: m.id, side: "NO", stake: 10_000, idempotencyKey: crypto.randomUUID() });
    await w.backdate(no.data.positionId, 10_000);
    const b1 = await w.bot();
    const r1 = await w.place(b1, await w.intent(b1, m.id, { kind: "COUNTER", triggerPositionId: no.data.positionId, triggerUserId: pl, side: "YES", stakeTzs: 2_000 }));
    ok("4.7c · CONTROL · a one-sided trigger account is countered", r1.ok === true, show(r1));
    const m2 = await w.poll({ graceMin: 0 });
    const no2 = await w.svc.buyPosition(pl, { marketId: m2.id, side: "NO", stake: 10_000, idempotencyKey: crypto.randomUUID() });
    const yes2 = await w.svc.buyPosition(pl, { marketId: m2.id, side: "YES", stake: 1_000, idempotencyKey: crypto.randomUUID() });
    await w.backdate(no2.data.positionId, 10_000);
    const b2 = await w.bot();
    const r2 = await w.place(b2, await w.intent(b2, m2.id, { kind: "COUNTER", triggerPositionId: no2.data.positionId, triggerUserId: pl, side: "YES", stakeTzs: 2_000 }));
    ok("4.7 · the trigger account also holds the house's side → house_market_conflict{TRIGGER_BOTH_SIDES}",
      yes2.ok === true && r2.ok === false && r2.reason === "house_market_conflict" && r2.detail?.conflict === "TRIGGER_BOTH_SIDES", show(r2));
  }

  // A bot never holds both sides of one market (OPPOSITE_SIDE).
  {
    const { market } = await pollWithLockedNo(20_000);
    const bo = await w.bot();
    const r1 = await w.place(bo, await w.intent(bo, market.id, { kind: "MANUAL", entryCondition: "THIN", side: "YES", stakeTzs: 1_000 }));
    ok("4.8 · fixture · the bot holds YES", r1.ok === true, show(r1));
    const rOpp = await w.place(bo, await w.intent(bo, market.id, { kind: "MANUAL", entryCondition: "THIN", side: "NO", stakeTzs: 1_000 }));
    ok("4.8a · the same bot then NO on that market → house_market_conflict{OPPOSITE_SIDE}",
      rOpp.ok === false && rOpp.reason === "house_market_conflict" && rOpp.detail?.conflict === "OPPOSITE_SIDE", show(rOpp));
    await w.dal.houseBotIntentStore.cancelLive({ houseBotId: bo.botId }, "CASE_DONE");
    const rSame = await w.place(bo, await w.intent(bo, market.id, { kind: "MANUAL", entryCondition: "THIN", side: "YES", stakeTzs: 1_000 }));
    ok("4.8c · CONTROL · the same bot again on YES places", rSame.ok === true, show(rSame));
  }
}

// ═══ §5 · settlement pays and refunds marked rows with the marker ══════════════════════════
section("§5 · settlement carries the marker (PLAN §3 propagation, 04 A17)");
{
  // WIN.
  const { market } = await pollWithLockedNo(10_000);
  const b = await w.bot();
  const i = await w.intent(b, market.id, { kind: "FILL", side: "YES", stakeTzs: 5_000 });
  const r = await w.place(b, i);
  ok("5.0 · fixture · a house YES stake", r.ok === true, show(r));
  const res = await w.svc.resolveMarket({ marketId: market.id, outcome: "YES", officerId: OFFICER });
  const st = await w.svc.settleMarket(market.id, { force: true });
  ok("5.1 · the market resolves YES and settles", res.ok === true && st.ok === true, `${show(res)} · ${show(st)}`);
  const pos = await w.mdal.positionStore.get(r.data.positionId);
  const payout = (await w.txnsFor(pos.id)).find((t: Any) => t.type === "BET_PAYOUT");
  ok("5.2 · the house position WON and its BET_PAYOUT carries the marker", pos.status === "WIN" && payout?.houseBotId === b.botId, `${pos.status} · ${payout?.houseBotId}`);
  ok("5.3 · …and the position marker survived settlement's full-row write", pos.houseBotId === b.botId);
  {
    // Levy identity (PLAN §9): statutory figures include the house stake, so on a market holding one,
    // stakes − payouts − refunds is still exactly the pool fee the frozen rates compute.
    const { poolFee } = await import("../../src/lib/payout.ts");
    const settled = await w.svc.getMarket(market.id);
    const fee = poolFee(5_000, 10_000, w.svc.ratesFor(settled), "YES").fee;
    ok("5.3b · levy identity with a house stake in the pool: 15,000 staked − payout = the pool fee", payout && 15_000 - payout.amount === fee, `payout ${payout?.amount} · fee ${fee}`);
    if (w.onPostgres) {
      const sums: Any[] = await w.prisma()!.$queryRawUnsafe(
        `SELECT coalesce(sum("amount") FILTER (WHERE "account" = $1), 0)::text AS "pool",`
        + ` coalesce(sum("amount") FILTER (WHERE "account" IN ('HOUSE:COMMISSION', 'HOUSE:TRA_LEVY', 'HOUSE:GBT_LEVY')), 0)::text AS "fee"`
        + ` FROM "LedgerEntry" WHERE "marketId" = $2`, `POOL:${market.id}`, market.id);
      ok("5.3c · Postgres ledger: the market's pool account nets to 0 and commission + levies book exactly the fee",
        Number(sums[0].pool) === 0 && Number(sums[0].fee) === fee, `pool ${sums[0].pool} · fee booked ${sums[0].fee} · fee ${fee}`);
    }
  }

  // VOID.
  const m2 = await pollWithLockedNo(10_000);
  const b2 = await w.bot();
  const i2 = await w.intent(b2, m2.market.id, { kind: "FILL", side: "YES", stakeTzs: 4_000 });
  const r2 = await w.place(b2, i2);
  await w.svc.resolveMarket({ marketId: m2.market.id, outcome: "VOID", officerId: OFFICER });
  await w.svc.settleMarket(m2.market.id, { force: true });
  const refund = (await w.txnsFor(r2.data.positionId)).find((t: Any) => t.type === "BET_REFUND");
  ok("5.4 · a VOID refund of a house stake carries the marker", refund?.houseBotId === b2.botId && refund?.amount === 4_000, `${refund?.houseBotId} ${refund?.amount}`);

  // Emergency void.
  const m3 = await pollWithLockedNo(10_000);
  const b3 = await w.bot();
  const i3 = await w.intent(b3, m3.market.id, { kind: "FILL", side: "YES", stakeTzs: 3_000 });
  const r3 = await w.place(b3, i3);
  const ev = await w.svc.emergencyVoidMarket({ marketId: m3.market.id, officerId: OFFICER, reason: "house seam test" });
  const eRefund = (await w.txnsFor(r3.data.positionId)).find((t: Any) => t.type === "BET_REFUND");
  ok("5.5 · an emergency-void refund of a house stake carries the marker", ev.ok === true && eRefund?.houseBotId === b3.botId, `${show(ev)} · ${eRefund?.houseBotId}`);

  // One-sided: only the house OPENER stake in the pool.
  const m4 = await w.poll({ graceMin: 0 });
  const b4 = await w.bot();
  const i4 = await w.intent(b4, m4.id, { kind: "OPENER", side: "YES", stakeTzs: 2_000 });
  const r4 = await w.place(b4, i4);
  await w.svc.resolveMarket({ marketId: m4.id, outcome: "YES", officerId: OFFICER });
  await w.svc.settleMarket(m4.id, { force: true });
  const osRefund = (await w.txnsFor(r4.data.positionId)).find((t: Any) => t.type === "BET_REFUND");
  ok("5.6 · a one-sided refund of a house stake carries the marker", osRefund?.houseBotId === b4.botId, `${osRefund?.houseBotId}`);

  // A player's refund is never marked.
  const playerRefund = ((await w.db.txn.listAll()) as Any[]).filter((t) => t.positionId === m2.noPos.id && t.type === "BET_REFUND");
  ok("5.7 · CONTROL · the player's refund on the same VOID market carries no marker", playerRefund.length === 1 && playerRefund[0].houseBotId == null,
    `${playerRefund.length} row(s), marker ${playerRefund[0]?.houseBotId}`);
}

// ═══ §6 · sanctioned change (b): a key is never someone else's receipt ═════════════════════
section("§6 · (b) a reused key refuses instead of replaying another account's bet");
{
  const market = await w.poll({ graceMin: 0 });
  const a = await w.user({ balance: 100_000 }), c = await w.user({ balance: 100_000 });
  const key = crypto.randomUUID();
  const ra = await w.svc.buyPosition(a, { marketId: market.id, side: "YES", stake: 2_000, idempotencyKey: key });
  const rc = await w.svc.buyPosition(c, { marketId: market.id, side: "YES", stake: 2_000, idempotencyKey: key });
  ok("6.1 · player C reusing player A's key → idempotency_key_conflict", ra.ok === true && rc.ok === false && rc.reason === "idempotency_key_conflict", show(rc));
  ok("6.2 · …C was not debited and holds no position", (await w.bal(c)).balance === 100_000 && (await w.positionsOf(market.id)).every((p: Any) => p.userId !== c));
  const ra2 = await w.svc.buyPosition(a, { marketId: market.id, side: "YES", stake: 2_000, idempotencyKey: key });
  ok("6.3 · CONTROL · A's own retry still replays, now marked replayed: true (j)", ra2.ok === true && ra2.data?.replayed === true && ra2.data?.positionId === ra.data.positionId, show(ra2));
}

// ═══ §8 · D19c: a holder's outcome notice is any player's notice (C4 rulings 143–145) ════════════
// Owner ruling D19 (2026-09-16): nothing about house bots reaches a player, the holder included. These cases
// replaced the liquidity-label cases: they prove the ABSENCE, and each one would fail if a label came back.
section("§8 · no house wording on outcome notices, in any language");
{
  /** Every house word a notice must not carry, in the three locales (the vocabulary the bundle scan uses). */
  const HOUSE_WORDS = /liquidity|ukwasi|流动性|house|nyumba|\bboti\b|机器人|50pick/i;
  /** The fixture market's own titles are operator data, not house wording — they are taken out before the test. */
  const FIXTURE_TITLES = ["House seam poll", "Soko la jaribio"];
  const ours = (v: unknown) => FIXTURE_TITLES.reduce((acc, t) => acc.split(t).join(""), String(v ?? ""));
  const leaks = (n: Any): string[] => n == null ? ["no row"] : ["titleEn", "titleSw", "titleZh", "bodyEn", "bodySw", "bodyZh", "href"]
    .filter((f) => HOUSE_WORDS.test(ours(n[f]))).map((f) => `${f}: ${n[f]}`);
  const j = (x: Any) => JSON.stringify(x);
  const rows = async (userId: string, kind?: string) => ((await w.db.notification.findByUser(userId, 200)) as Any[]).filter((n) => !kind || n.kind === kind);
  // WIN on a house stake, LOSS on the player's.
  const { market, player } = await pollWithLockedNo(10_000);
  const b = await w.bot();
  const r = await w.place(b, await w.intent(b, market.id, { kind: "FILL", side: "YES", stakeTzs: 5_000 }));
  await w.svc.resolveMarket({ marketId: market.id, outcome: "YES", officerId: OFFICER });
  await w.svc.settleMarket(market.id, { force: true });
  await sleep(500);
  const m1 = await w.svc.getMarket(market.id);
  const win = (await rows(b.userId, "WIN")).find((n) => n.bodyEn.includes(r.data.positionId));
  ok("8.1 · the holder's WIN notice for a house stake exists and carries no house word in any language", !!win && leaks(win).length === 0, j(leaks(win)));
  // The LINK is as visible as the words (a mutation that labelled only the href passed a body-only check — measured).
  ok("8.2 · …and its English body is the plain template, byte for byte, and its link is the plain permalink",
    !!win && win.bodyEn === `${m1.titleEn} · ${r.data.positionId} paid out. Tap to view.` && win.href === `/positions/${r.data.positionId}`, `${win?.bodyEn ?? "no WIN row"} · ${win?.href}`);
  ok("8.3 · …and its Swahili and Chinese bodies end exactly as any player's do",
    !!win && win.bodySw.endsWith(`· ${r.data.positionId} kimelipa. Bonyeza kuona.`) && win.bodyZh.endsWith(`· ${r.data.positionId} 已赔付。点击查看。`), `${win?.bodySw} | ${win?.bodyZh}`);
  const loss = (await rows(player, "LOSS"))[0];
  ok("8.4 · CONTROL · the player's LOSS notice on the same market exists and carries no house word", !!loss && leaks(loss).length === 0, loss?.bodyEn ?? "no LOSS row");

  // Selection closed: a holder with a house stake AND an own stake gets ONE notice over both, like any hedged player.
  const m2 = await w.poll({ graceMin: 0 });
  const h = await w.bot();
  const ro = await w.place(h, await w.intent(h, m2.id, { kind: "OPENER", side: "YES", stakeTzs: 3_000 }));
  const other = await w.user({ balance: 100_000 });
  await w.svc.buyPosition(other, { marketId: m2.id, side: "NO", stake: 4_000, idempotencyKey: crypto.randomUUID() });
  const own = await w.svc.buyPosition(h.userId, { marketId: m2.id, side: "NO", stake: 2_000, idempotencyKey: crypto.randomUUID() });
  ok("8.5 · fixture · a holder with a house YES 3,000 and their own NO 2,000", ro.ok === true && own.ok === true, `${show(ro)} · ${show(own)}`);
  await w.mdal.marketStore.stamp(m2.id, { selectionClosedAt: new Date(Date.now() - 1_000).toISOString() });
  const sc = await w.svc.notifySelectionClosedForMarket(m2.id);
  await sleep(500);
  const closed = await rows(h.userId, "SELECTION_CLOSED");
  ok("8.6 · selection closed → exactly ONE notice for the holder, naming BOTH figures (one book, as for any hedged player)",
    sc.notified === true && closed.length === 1 && closed[0].bodyEn.includes("If YES wins you receive") && closed[0].bodyEn.includes("; if NO wins you receive"),
    `${closed.length} row(s): ${closed.map((n) => n.bodyEn).join(" | ")}`);
  ok("8.7 · …with the both-sides title and no house word in any language",
    closed.length === 1 && closed[0].titleEn === "Betting closed — your payouts are set" && leaks(closed[0]).length === 0, j({ title: closed[0]?.titleEn, leaks: leaks(closed[0]) }));
  const otherClosed = await rows(other, "SELECTION_CLOSED");
  ok("8.8 · CONTROL · a player with no house stake gets exactly one notice with no house word", otherClosed.length === 1 && leaks(otherClosed[0]).length === 0);

  // The verdict notice. A holder whose every stake here is house-marked is not invited to object (objecting would be
  // refused); a mixed holder and a player keep the invitation. Nobody's notice names why (ruling 145).
  const OBJECT = { en: "object before then", sw: "pinga kabla ya muda huo", zh: "提出异议" };
  const invites = (n: Any) => n.bodyEn.includes(OBJECT.en) && n.bodySw.includes(OBJECT.sw) && n.bodyZh.includes(OBJECT.zh);
  const invitesNone = (n: Any) => !n.bodyEn.includes(OBJECT.en) && !n.bodySw.includes(OBJECT.sw) && !n.bodyZh.includes(OBJECT.zh);
  const v1 = await pollWithLockedNo(10_000);
  const hOnly = await w.bot();
  const rv1 = await w.place(hOnly, await w.intent(hOnly, v1.market.id, { kind: "FILL", side: "YES", stakeTzs: 2_000 }));
  const v2 = await pollWithLockedNo(10_000);
  const hMixed = await w.bot();
  const rv2 = await w.place(hMixed, await w.intent(hMixed, v2.market.id, { kind: "FILL", side: "YES", stakeTzs: 2_000 }));
  const ownV = await w.svc.buyPosition(hMixed.userId, { marketId: v2.market.id, side: "YES", stake: 1_000, idempotencyKey: crypto.randomUUID() });
  await w.svc.resolveMarket({ marketId: v1.market.id, outcome: "NO", officerId: OFFICER });
  await w.svc.resolveMarket({ marketId: v2.market.id, outcome: "NO", officerId: OFFICER });
  await sleep(500);
  const verdictOf = async (userId: string, marketId: string) => (await rows(userId, "VERDICT")).find((n) => n.href?.includes(marketId));
  const vHouse = await verdictOf(hOnly.userId, v1.market.id), vMixed = await verdictOf(hMixed.userId, v2.market.id), vPlayer = await verdictOf(v1.player, v1.market.id);
  ok("8.9 · fixture · a house-only holder, a mixed holder and a player each got a verdict notice",
    rv1.ok === true && rv2.ok === true && ownV.ok === true && !!vHouse && !!vMixed && !!vPlayer, `${show(rv1)} · ${show(rv2)} · ${show(ownV)} · ${!!vHouse}/${!!vMixed}/${!!vPlayer}`);
  ok("8.10 · the house-only holder's verdict notice has NO objection invitation and no house word in any language",
    !!vHouse && invitesNone(vHouse) && leaks(vHouse).length === 0, j({ body: vHouse?.bodyEn, leaks: vHouse ? leaks(vHouse) : null }));
  ok("8.11 · the mixed holder keeps the invitation in all three languages, with no house word", !!vMixed && invites(vMixed) && leaks(vMixed).length === 0, vMixed?.bodyEn ?? "no row");
  ok("8.12 · CONTROL · the player keeps the invitation and has no house word", !!vPlayer && invites(vPlayer) && leaks(vPlayer).length === 0, vPlayer?.bodyEn ?? "no row");
  ok("8.13 · CONTROL · the mixed holder's and the player's verdict bodies are the same sentence apart from the title",
    !!vMixed && !!vPlayer && vMixed.bodyEn.slice(vMixed.bodyEn.indexOf(" · ")) === vPlayer.bodyEn.slice(vPlayer.bodyEn.indexOf(" · ")),
    `${vMixed?.bodyEn} | ${vPlayer?.bodyEn}`);
}

// ═══ §10 · orphan repair refunds a house stake with the marker (MC-3) — memory only ═══════════════
if (!w.onPostgres) {
  section("§10 · memory: orphan repair carries the marker");
  const { eatDayKey } = await import("../../src/lib/house-bot/clock.ts");
  const { houseDayBook } = await import("../../src/lib/server/house-bot/book.ts");
  const { market } = await pollWithLockedNo(10_000);
  const b = await w.bot();
  const r = await w.place(b, await w.intent(b, market.id, { kind: "FILL", side: "YES", stakeTzs: 3_000 }));
  const p = await w.mdal.positionStore.get(r.data.positionId);
  const before = await houseDayBook(eatDayKey(Date.now()), b.botId);
  await w.mdal.positionStore.set({ ...p, marketId: `mkt_gone_${process.pid}` });
  const rep = await w.svc.repairOrphanedPositions();
  const refund = (await w.txnsFor(p.id)).find((t: Any) => t.type === "BET_REFUND");
  const after = await houseDayBook(eatDayKey(Date.now()), b.botId);
  ok("10.1 · the orphaned house stake is refunded once, and its refund carries the house marker",
    rep.repaired >= 1 && !!refund && refund.houseBotId === b.botId && refund.amount === 3_000, `${JSON.stringify(rep)} · ${refund ? `${refund.amount} marker ${refund.houseBotId}` : "no refund"}`);
  ok("10.2 · the bot's book counts the refund as returned", after.returnedTzs - before.returnedTzs === 3_000, `before ${before.returnedTzs} · after ${after.returnedTzs}`);
  const { market: m2, player } = await pollWithLockedNo(10_000);
  const pp = (await w.positionsOf(m2.id)).find((x: Any) => x.userId === player);
  await w.mdal.positionStore.set({ ...pp, marketId: `mkt_gone2_${process.pid}` });
  await w.svc.repairOrphanedPositions();
  const pRefund = (await w.txnsFor(pp.id)).find((t: Any) => t.type === "BET_REFUND");
  ok("10.c1 · CONTROL · a player's orphan refund carries no marker", !!pRefund && pRefund.houseBotId == null, pRefund ? String(pRefund.houseBotId) : "no refund");
} else {
  console.log(`[${STORE}] §10 · orphan repair: NOT RUN on Postgres — Position.marketId has a foreign key, so an orphan cannot exist there.`);
}

// ═══ §9 · lockedForHouse on the A14 grid — on BOTH stores (the SQL on Postgres, the twin in memory) ═══
section("§9 · lockedForHouse = the JS exit window + LOCK_MARGIN_MS, on the A14 grid");
{
  const { lockedForHouse, lockedPoolInputs } = await import("../../src/lib/server/house-bot/pools.ts");
  const { exitWindowFacts } = await import("../../src/lib/exit-window.ts");
  const { LOCK_MARGIN_MS } = await import("../../src/lib/house-bot/constants.ts");
  const market = await w.poll({ graceMin: 0 });
  const player = await w.user({ balance: 1_000_000 });
  const bet = await w.svc.buyPosition(player, { marketId: market.id, side: "YES", stake: 1_000, idempotencyKey: crypto.randomUUID() });
  const pos = await w.mdal.positionStore.get(bet.data.positionId);
  const placedMs = Date.parse(pos.placedAt);
  const diffs: string[] = [];
  let probes = 0;
  for (const c of EXIT_WINDOW_GRID) {
    if (c.emptyPlacedAt) continue;
    const closesAt = new Date(placedMs + c.runwayMs).toISOString();
    const graceMs = c.graceMin * 60_000, paidMs = c.paidMin * 60_000;
    const js = exitWindowFacts({ placedAtMs: placedMs, closesAtMs: placedMs + c.runwayMs, freeExitGraceMinutes: c.graceMin, paidExitWindowMinutes: c.paidMin });
    for (const deltaMs of [-1, 0, 1]) {
      const asOf = new Date(js.exitCloseAtMs + LOCK_MARGIN_MS + deltaMs).toISOString();
      const pool = await lockedForHouse(market.id, { graceMs, paidMs, closesAt, asOf });
      probes++;
      const expectLocked = deltaMs >= 0 ? 1_000 : 0;
      const expectA15 = js.exitCloseAtMs <= Date.parse(asOf) ? 1_000 : 0;
      if (pool.YES.locked !== expectLocked || pool.YES.lockedA15 !== expectA15 || pool.YES.nonHouse !== 1_000) {
        diffs.push(`${c.id} δ${deltaMs}: locked ${pool.YES.locked}/${expectLocked} A15 ${pool.YES.lockedA15}/${expectA15}`);
      }
    }
    void exitGridCase;
  }
  ok(`9.1 · locked and lockedA15 = JS exitWindowFacts (+ LOCK_MARGIN_MS for locked) on the A14 grid, ±1 ms (${probes} probes)`, diffs.length === 0 && probes > 300, diffs.slice(0, 3).join(" | "));
  const inputs = lockedPoolInputs(market);
  ok("9.2 · lockedPoolInputs reads the market's frozen rates (grace 0 here)", inputs.graceMs === 0 && inputs.paidMs === 0, JSON.stringify(inputs));
}

// ═══ §7 · Postgres only: the ledger ties, and lockedForHouse's plan at scale ═════════════════════
if (w.onPostgres) {
  section("§7 · Postgres: trial balance and the lockedForHouse plan");
  const { trialBalance } = await import("../../src/lib/server/ledger.ts");
  const tb: Any = await trialBalance();
  // The one expected difference is the §3 fixture's seeded bonus (no grant behind it); every other wallet ties.
  const unexpected = (tb.drift as Any[]).filter((d) => !(w.seededBonus.has(d.userId) && d.realDrift === 0 && d.bonusDrift === w.seededBonus.get(d.userId)));
  ok("7.1 · the books balance: every ledger group sums to zero and the global sum is zero", tb.globalBalanced === true && tb.imbalancedGroups.length === 0,
    `global ${tb.globalSum} · imbalanced ${tb.imbalancedGroups.length}`);
  ok("7.1b · every wallet ties to its ledger after every house stake, payout and refund above (seeded bonus aside)", unexpected.length === 0 && tb.checkedWallets >= 20,
    `${unexpected.length} unexpected of ${tb.checkedWallets} · ${JSON.stringify(unexpected[0] ?? null)}`);
  ok("7.1c · CONTROL · the seeded bonus wallet IS reported as drifting, so the check can see a drift", (tb.drift as Any[]).some((d) => w.seededBonus.has(d.userId)));

  // N1 §4.1 EXPLAIN pin: 20,000 OPEN positions on one poll among 200,000 → the one statement reads Position
  // through (marketId, status), never a sequential scan. Rows are inserted by SQL (a fixture of volume).
  {
    const { houseSeamStore } = w.dal;
    const hot = await w.poll({ graceMin: 0 });
    const cold = await Promise.all(Array.from({ length: 9 }, () => w.poll({ graceMin: 0 })));
    const who = await w.user({ balance: 0 });
    const pc = w.prisma()!;
    const fill = (marketId: string, n: number) => pc.$executeRawUnsafe(
      `INSERT INTO "Position" ("id", "userId", "marketId", "side", "stake", "bonusStakeTzs", "potentialPayout", "status", "placedAt")`
      + ` SELECT 'pos_explain_' || $1 || '_' || g, $2, $1, (CASE WHEN g % 2 = 0 THEN 'YES' ELSE 'NO' END)::"MarketSide", 1000, 0, 2000, 'OPEN'::"PositionStatus",`
      + ` (clock_timestamp() AT TIME ZONE 'UTC') - (g * interval '1 second') FROM generate_series(1, $3::int) g`, marketId, who, n);
    await fill(hot.id, 20_000);
    for (const m of cold) await fill(m.id, 20_000);
    await pc.$executeRawUnsafe(`ANALYZE "Position"`);
    let captured: { text: string; values: unknown[] } | null = null;
    const spy = { $queryRawUnsafe: async (text: string, ...values: unknown[]) => { captured = { text, values }; return []; }, $executeRawUnsafe: async () => 0 };
    await houseSeamStore.lockedPool({ marketId: hot.id, graceMs: 0, paidMs: 0, closesAt: hot.resolutionAt, asOf: null }, spy);
    const plan: Any[] = captured ? await pc.$queryRawUnsafe(`EXPLAIN ${(captured as Any).text}`, ...(captured as Any).values) : [];
    const text = plan.map((r) => Object.values(r)[0]).join("\n");
    ok("7.4 · EXPLAIN at 20,000 OPEN positions on the poll (200,000 total): no sequential scan on Position",
      text.length > 0 && !/Seq Scan on "Position"/.test(text), text.split("\n").filter((l) => /Position/.test(l)).join(" | ").slice(0, 400));
    ok("7.5 · …and Position is read through its (marketId, status) index", /Position_marketId_status_idx/.test(text), text.split("\n").filter((l) => /Index|Bitmap/.test(l)).join(" | ").slice(0, 400));
    const pool = await w.dal.houseSeamStore.lockedPool({ marketId: hot.id, graceMs: 0, paidMs: 0, closesAt: hot.resolutionAt });
    ok("7.6 · CONTROL · the same statement returns the 20,000 stakes (10,000 a side, all locked)", pool.YES.locked === 10_000_000 && pool.NO.locked === 10_000_000,
      `${pool.YES.locked} / ${pool.NO.locked}`);

    // ── A24 · "EXPLAIN pin at 1M/20k rows", and L5's triggerPage pin (C4 ruling 161) ──────────────────────────────
    // 780,000 unmarked + 20,000 house-marked positions on top of the 200,000 above: 1,000,000 positions, 20,000 marked,
    // spread over 30 days. Four bot ids; bots 1 and 3 hold OPEN stakes, bots 2 and 4 settled ones.
    const markets = [hot, ...cold].map((m: Any) => m.id);
    await pc.$executeRawUnsafe(
      `INSERT INTO "Position" ("id", "userId", "marketId", "side", "stake", "bonusStakeTzs", "potentialPayout", "status", "placedAt")`
      + ` SELECT 'pos_x1m_u_' || g, $1, ($2::text[])[1 + (g % 10)], (CASE WHEN g % 2 = 0 THEN 'YES' ELSE 'NO' END)::"MarketSide", 1000, 0, 2000,`
      + ` 'OPEN'::"PositionStatus", (clock_timestamp() AT TIME ZONE 'UTC') - (g * interval '3.3 second') FROM generate_series(1, 780000) g`, who, markets);
    await pc.$executeRawUnsafe(
      `INSERT INTO "Position" ("id", "userId", "marketId", "side", "stake", "bonusStakeTzs", "potentialPayout", "status", "placedAt", "houseBotId")`
      + ` SELECT 'pos_x1m_h_' || g, $1, ($2::text[])[1 + (g % 10)], (CASE WHEN g % 2 = 0 THEN 'YES' ELSE 'NO' END)::"MarketSide", 1000, 0, 2000,`
      + ` (CASE WHEN g % 2 = 0 THEN 'OPEN' ELSE 'LOSS' END)::"PositionStatus", (clock_timestamp() AT TIME ZONE 'UTC') - (g * interval '129.6 second'),`
      + ` 'hb_x1m_' || (1 + (g % 4)) FROM generate_series(1, 20000) g`, who, markets);
    await pc.$executeRawUnsafe(`ANALYZE "Position"`);
    const counted: Any[] = await pc.$queryRawUnsafe(`SELECT count(*)::int AS "all", count(*) FILTER (WHERE "houseBotId" IS NOT NULL)::int AS "marked" FROM "Position"`);
    ok("7.7 · fixture · at least 1,000,000 positions, at least 20,000 of them house-marked", counted[0].all >= 1_000_000 && counted[0].marked >= 20_000, JSON.stringify(counted[0]));

    /** Capture the SQL a DAL read sends through its transaction parameter, then EXPLAIN it with its real parameters. */
    const planOf = async (call: (spy: Any) => Promise<unknown>): Promise<string> => {
      let got: { text: string; values: unknown[] } | null = null;
      const spy = { $queryRawUnsafe: async (text: string, ...values: unknown[]) => { got = { text, values }; return [{}]; }, $executeRawUnsafe: async () => 0 };
      await call(spy).catch(() => null);
      if (!got) return "";
      const rows: Any[] = await pc.$queryRawUnsafe(`EXPLAIN ${(got as Any).text}`, ...(got as Any).values);
      return rows.map((r) => Object.values(r)[0]).join("\n");
    };
    const noSeqScan = (plan: string) => plan.length > 0 && !/Seq Scan on "Position"/.test(plan);
    const brief = (plan: string) => plan.split("\n").filter((l) => /Position|Index|Bitmap/.test(l)).join(" | ").slice(0, 300);
    const book = w.dal.houseBookStore;
    const nowIso = new Date().toISOString();
    const PINS: Array<[string, (spy: Any) => Promise<unknown>]> = [
      ["botUsage (per-bot rolling windows)", (spy) => houseSeamStore.botUsage({ houseBotId: "hb_x1m_1", marketId: hot.id }, spy)],
      ["marketUsage (house stake on a market)", (spy) => houseSeamStore.marketUsage({ houseBotId: "hb_x1m_1", marketId: hot.id }, spy)],
      ["globalUsage (GLOBAL_BETS_PER_MINUTE / day)", (spy) => houseSeamStore.globalUsage(spy)],
      ["placedTimes, all bots, 1 day", (spy) => houseSeamStore.placedTimes({ houseBotId: null, withinSec: 86_400 }, spy)],
      ["placedTimes, one bot, 1 hour", (spy) => houseSeamStore.placedTimes({ houseBotId: "hb_x1m_1", withinSec: 3_600 }, spy)],
      ["dayRows, every bot in one GROUP BY", (spy) => book.dayRows({ fromIso: new Date(Date.now() - 2 * 86_400_000).toISOString(), toIso: nowIso, houseBotId: null }, spy)],
      ["dayRows, one bot", (spy) => book.dayRows({ fromIso: new Date(Date.now() - 2 * 86_400_000).toISOString(), toIso: nowIso, houseBotId: "hb_x1m_1" }, spy)],
      ["openExposure, every bot", (spy) => book.openExposure(null, spy)],
      ["openExposure, one bot", (spy) => book.openExposure("hb_x1m_1", spy)],
      ["triggerPage, the sweep's 90 s window (L5)", (spy) => houseSeamStore.triggerPage({ fromIso: new Date(Date.now() - 90_000).toISOString(), beforeIso: new Date(Date.now() - 5_000).toISOString(), after: null, limit: 200 }, spy)],
    ];
    for (const [i, [what, call]] of PINS.entries()) {
      const plan = await planOf(call);
      ok(`7.${8 + i} · A24 · EXPLAIN at 1M/20k: ${what} — no sequential scan on Position`, noSeqScan(plan), brief(plan) || "no statement captured");
    }

    // CONTROLS — the same reads, run for real, return what the fixture implies (so an empty statement cannot pass).
    const openAll = (await book.openExposure(null)).filter((r: Any) => String(r.houseBotId).startsWith("hb_x1m_"));
    ok("7.18 · CONTROL · open exposure of the fixture bots is exactly bots 1 and 3, TZS 5,000,000 each",
      JSON.stringify(openAll.map((r: Any) => [r.houseBotId, r.openStakeTzs])) === JSON.stringify([["hb_x1m_1", 5_000_000], ["hb_x1m_3", 5_000_000]]), JSON.stringify(openAll));
    const usage = await houseSeamStore.botUsage({ houseBotId: "hb_x1m_1", marketId: hot.id });
    const g = await houseSeamStore.globalUsage();
    const page = await houseSeamStore.triggerPage({ fromIso: new Date(Date.now() - 90_000).toISOString(), beforeIso: new Date(Date.now() - 5_000).toISOString(), after: null, limit: 200 });
    ok("7.19 · CONTROL · botUsage, globalUsage and triggerPage read real rows from the fixture",
      usage.placedLastDay > 100 && usage.lastPlacedAt != null && g.betsLastDay > 600 && page.length > 0 && page.length <= 200,
      JSON.stringify({ usage, g, page: page.length }));
  }
}

// ═══ §8 · L10 · an AML rejection refunds in ONE transaction (C4-SPEC ruling 137) ═══════════════════
section("§8 · the AML rejection refund is atomic");
{
  const WS: Any = await import("../../src/lib/server/wallet-service.ts");
  /** A withdrawal already held for AML review: 20,000 moved from balance to hold, the txn in AML_REVIEW. */
  const heldWithdrawal = async (): Promise<{ userId: string; walletId: string; txnId: string }> => {
    const userId = await w.user({ balance: 100_000 });
    const wallet = (await w.db.wallet.findByUserId(userId)) as Any;
    await w.db.wallet.adjust(wallet.id, { balance: -20_000, hold: 20_000 });
    const txnId = `txn_l10_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    await w.db.txn.create({
      id: txnId, walletId: wallet.id, userId, type: "WITHDRAWAL", status: "AML_REVIEW", amount: -20_000, fee: 0, taxWithheld: 0,
      balanceAfter: 80_000, currency: "TZS", provider: "MPESA", providerRef: null, msisdn: null, description: "held withdrawal",
      positionId: null, amlReason: "Threshold", createdAt: now, updatedAt: now, completedAt: null,
    } as Any);
    return { userId, walletId: wallet.id, txnId };
  };

  const ok1 = await heldWithdrawal();
  const txn1 = (await w.db.txn.findById(ok1.txnId)) as Any;
  await WS.refundAmlRejection(txn1, "rejected by the officer");
  const wal1 = (await w.db.wallet.findByUserId(ok1.userId)) as Any;
  const after1 = (await w.db.txn.findById(ok1.txnId)) as Any;
  ok("8.1 · ruling 137 · a rejected withdrawal credits the balance back, releases the hold, and reads FAILED",
    wal1.balance === 100_000 && wal1.hold === 0 && after1.status === "FAILED" && after1.amlReason === "rejected by the officer",
    `balance ${wal1.balance} · hold ${wal1.hold} · ${after1.status}`);

  if (w.onPostgres) {
    // ⭐ The defect itself: a failure between the refund and the FAILED mark. Both must roll back together.
    const bad = await heldWithdrawal();
    const txnBad = (await w.db.txn.findById(bad.txnId)) as Any;
    const realUpdate = w.db.txn.update;
    let threw = "";
    w.db.txn.update = async () => { throw new Error("injected failure on the FAILED write"); };
    try { await WS.refundAmlRejection(txnBad, "must roll back"); } catch (e) { threw = String((e as Error)?.message ?? e); } finally { w.db.txn.update = realUpdate; }
    const walBad = (await w.db.wallet.findByUserId(bad.userId)) as Any;
    const txnStill = (await w.db.txn.findById(bad.txnId)) as Any;
    ok("8.2 · ⭐ ruling 137 · when the FAILED write fails, the refund rolls back WITH it: the money stays held and the withdrawal still reads AML_REVIEW",
      /injected failure/.test(threw) && walBad.balance === 80_000 && walBad.hold === 20_000 && txnStill.status === "AML_REVIEW",
      `threw=${!!threw} · balance ${walBad.balance} · hold ${walBad.hold} · ${txnStill.status}`);
  } else {
    console.log("NOT MEASURED [memory] 8.2 · the in-memory store has no transactions to roll back; the rollback is a Postgres property");
  }
}

// ═══ §9 · F7 · the holder's own money on a live house-bot account (02 §3.6) ═══════════════════════
section("§9 · the money hook tells admins only about an ACTIVE bot, once per event");
{
  const MH: Any = await import("../../src/lib/server/house-bot/money-hook.ts");
  const ownerMoney = async (botId: string) =>
    ((await w.dal.houseBotEventStore.listByBot(botId, { limit: 200, kinds: ["OWNER_MONEY"] })).rows as Any[]);

  const stranger = await w.user({ balance: 5_000 });
  ok("9.1 · a player with no bot: nothing is read beyond one index lookup and nothing is written",
    (await MH.onHolderMoneyEvent(stranger, { event: "deposited", amountTzs: 5_000, txnId: "txn_f7_none" })) === "noBot");

  const paused = await w.bot();
  await w.dal.houseBotStore.setStatus(paused.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: "ACTIVE" });
  ok("9.2 · 02 §3.6 · a PAUSED bot's holder moving their own money tells nobody and records nothing",
    (await MH.onHolderMoneyEvent(paused.userId, { event: "withdrew", amountTzs: 1_000, txnId: "txn_f7_paused" })) === "notActive"
      && (await ownerMoney(paused.botId)).length === 0);

  const active = await w.bot();
  const first = await MH.onHolderMoneyEvent(active.userId, { event: "withdrew", amountTzs: 50_000, txnId: "txn_f7_same" });
  const second = await MH.onHolderMoneyEvent(active.userId, { event: "withdrew", amountTzs: 50_000, txnId: "txn_f7_same" });
  const events = await ownerMoney(active.botId);
  ok("9.3 · ⭐ 02 §3.6 · two identical money events on an ACTIVE bot are TWO events, each carrying the balance as it is now",
    first === "sent" && second === "sent" && events.length === 2
      && events.every((e) => e.payload?.event === "withdrew" && e.payload?.amountTzs === 50_000 && typeof e.payload?.balanceTzs === "number"),
    JSON.stringify(events.map((e) => e.payload)));
}

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
