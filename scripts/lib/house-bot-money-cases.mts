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
  ok("1.11 · cashOutValue offers no sale on a house position (HOUSE_POSITION)", co.sellable === false && co.reason === "HOUSE_POSITION", JSON.stringify(co));
  const sell = await w.svc.cashOutPosition(b.userId, pos.id);
  ok("1.12 · cashOutPosition refuses house_position_no_exit", sell.ok === false && sell.reason === "house_position_no_exit", show(sell));
  ok("1.13 · …and the position stays OPEN", (await w.mdal.positionStore.get(pos.id)).status === "OPEN");
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
  const b4 = await w.bot();
  const i5 = await w.intent(b4, m3.id, { kind: "MANUAL", entryCondition: "OPENER", side: "YES", stakeTzs: 1_000 });
  const r5 = await w.place(b4, i5);
  ok("4.5 · a second OPENER once a pool is non-zero → refused (other bot or condition gone)", r5.ok === false && (r5.reason === "house_condition_gone" || r5.reason === "house_market_conflict"), show(r5));
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

// ═══ §8 · outcome notices name a liquidity stake (04 A17 (h)) ═══════════════════════════════
section("§8 · the liquidity label on outcome notices");
{
  const LABEL = "50pick liquidity stake";
  const rows = async (userId: string, kind?: string) => ((await w.db.notification.findByUser(userId, 200)) as Any[]).filter((n) => !kind || n.kind === kind);
  // WIN on a house stake, LOSS on the player's.
  const { market, player } = await pollWithLockedNo(10_000);
  const b = await w.bot();
  const r = await w.place(b, await w.intent(b, market.id, { kind: "FILL", side: "YES", stakeTzs: 5_000 }));
  await w.svc.resolveMarket({ marketId: market.id, outcome: "YES", officerId: OFFICER });
  await w.svc.settleMarket(market.id, { force: true });
  await sleep(500);
  const win = (await rows(b.userId, "WIN")).find((n) => n.bodyEn.includes(r.data.positionId) || n.titleEn.includes("won"));
  ok("8.1 · the holder's WIN notice for a house stake carries the label in all three languages",
    !!win && win.bodyEn.includes(LABEL) && win.bodySw.includes("Dau la ukwasi la 50pick") && win.bodyZh.includes("50pick 流动性投注"), win?.bodyEn ?? "no WIN row");
  const loss = (await rows(player, "LOSS"))[0];
  ok("8.2 · CONTROL · the player's LOSS notice on the same market carries no label", !!loss && !loss.bodyEn.includes(LABEL), loss?.bodyEn ?? "no LOSS row");

  // Selection closed: a holder with a house stake AND an own stake gets two notices — the house figures
  // labelled, and personal figures that exclude the house money.
  const m2 = await w.poll({ graceMin: 0 });
  const h = await w.bot();
  const ro = await w.place(h, await w.intent(h, m2.id, { kind: "OPENER", side: "YES", stakeTzs: 3_000 }));
  const other = await w.user({ balance: 100_000 });
  await w.svc.buyPosition(other, { marketId: m2.id, side: "NO", stake: 4_000, idempotencyKey: crypto.randomUUID() });
  const own = await w.svc.buyPosition(h.userId, { marketId: m2.id, side: "NO", stake: 2_000, idempotencyKey: crypto.randomUUID() });
  ok("8.3 · fixture · a holder with a house YES 3,000 and their own NO 2,000", ro.ok === true && own.ok === true, `${show(ro)} · ${show(own)}`);
  await w.mdal.marketStore.stamp(m2.id, { selectionClosedAt: new Date(Date.now() - 1_000).toISOString() });
  const sc = await w.svc.notifySelectionClosedForMarket(m2.id);
  await sleep(500);
  const closed = await rows(h.userId, "SELECTION_CLOSED");
  const houseNotice = closed.filter((n) => n.bodyEn.includes(LABEL));
  const personal = closed.filter((n) => !n.bodyEn.includes(LABEL));
  ok("8.4 · selection closed → one labelled notice for the house stake and one personal notice", sc.notified === true && houseNotice.length === 1 && personal.length === 1,
    `${closed.length} row(s): ${closed.map((n) => n.bodyEn).join(" | ")}`);
  ok("8.5 · …the labelled one names only the YES (house) figure; the personal one only the NO (own) figure",
    houseNotice[0]?.bodyEn.includes("If YES wins") && !houseNotice[0]?.bodyEn.includes("If NO wins")
      && personal[0]?.bodyEn.includes("If NO wins") && !personal[0]?.bodyEn.includes("If YES wins"),
    `${houseNotice[0]?.bodyEn} | ${personal[0]?.bodyEn}`);
  const otherClosed = await rows(other, "SELECTION_CLOSED");
  ok("8.6 · CONTROL · a player with no house stake gets exactly one unlabelled notice", otherClosed.length === 1 && !otherClosed[0].bodyEn.includes(LABEL));
}

// ═══ §7 · Postgres only: the ledger ties, and lockedForHouse's SQL is the JS exit window ═════
if (w.onPostgres) {
  section("§7 · Postgres: trial balance and the lockedForHouse SQL");
  const { trialBalance } = await import("../../src/lib/server/ledger.ts");
  const tb: Any = await trialBalance();
  // The one expected difference is the §3 fixture's seeded bonus (no grant behind it); every other wallet ties.
  const unexpected = (tb.drift as Any[]).filter((d) => !(w.seededBonus.has(d.userId) && d.realDrift === 0 && d.bonusDrift === w.seededBonus.get(d.userId)));
  ok("7.1 · the books balance: every ledger group sums to zero and the global sum is zero", tb.globalBalanced === true && tb.imbalancedGroups.length === 0,
    `global ${tb.globalSum} · imbalanced ${tb.imbalancedGroups.length}`);
  ok("7.1b · every wallet ties to its ledger after every house stake, payout and refund above (seeded bonus aside)", unexpected.length === 0 && tb.checkedWallets >= 20,
    `${unexpected.length} unexpected of ${tb.checkedWallets} · ${JSON.stringify(unexpected[0] ?? null)}`);
  ok("7.1c · CONTROL · the seeded bonus wallet IS reported as drifting, so the check can see a drift", (tb.drift as Any[]).some((d) => w.seededBonus.has(d.userId)));

  // The A14 grid, through the SQL: for each row, one OPEN stake by an eligible player; `asOf` pins the clock.
  const { lockedForHouse, lockedPoolInputs } = await import("../../src/lib/server/house-bot/pools.ts");
  const { exitWindowFacts } = await import("../../src/lib/exit-window.ts");
  const { LOCK_MARGIN_MS } = await import("../../src/lib/house-bot/constants.ts");
  const market = await w.poll({ graceMin: 0 });
  const player = await w.user({ balance: 1_000_000 });
  const bet = await w.svc.buyPosition(player, { marketId: market.id, side: "YES", stake: 1_000, idempotencyKey: crypto.randomUUID() });
  const pos = await w.mdal.positionStore.get(bet.data.positionId);
  const placedMs = Date.parse(pos.placedAt);
  const diffs: string[] = [];
  let rows = 0;
  for (const c of EXIT_WINDOW_GRID) {
    if (c.emptyPlacedAt) continue;
    const g = exitGridCase(c);
    const closesAt = new Date(placedMs + c.runwayMs).toISOString();
    const graceMs = c.graceMin * 60_000, paidMs = c.paidMin * 60_000;
    const js = exitWindowFacts({ placedAtMs: placedMs, closesAtMs: placedMs + c.runwayMs, freeExitGraceMinutes: c.graceMin, paidExitWindowMinutes: c.paidMin });
    for (const deltaMs of [-1, 0, 1]) {
      // asOf = exit close + margin + delta: locked iff delta ≥ 0.
      const asOf = new Date(js.exitCloseAtMs + LOCK_MARGIN_MS + deltaMs).toISOString();
      const pool = await lockedForHouse(market.id, { graceMs, paidMs, closesAt, asOf });
      const expectLocked = deltaMs >= 0 ? 1_000 : 0;
      rows++;
      if (pool.YES.locked !== expectLocked) diffs.push(`${c.id} δ${deltaMs}: locked ${pool.YES.locked} ≠ ${expectLocked}`);
    }
    void g;
  }
  ok(`7.2 · SQL locked = JS exitWindowFacts + LOCK_MARGIN_MS on the A14 grid, ±1 ms (${rows} probes)`, diffs.length === 0 && rows > 300, diffs.slice(0, 3).join(" | "));
  const inputs = lockedPoolInputs(market);
  ok("7.3 · lockedPoolInputs reads the market's frozen rates (grace 0 here)", inputs.graceMs === 0 && inputs.paidMs === 0, JSON.stringify(inputs));
}

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
