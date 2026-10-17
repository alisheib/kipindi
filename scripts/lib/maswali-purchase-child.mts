/**
 * test:maswali-purchase — BUYING AND THE FREE CANCEL, ON BOTH STORES (MASWALI-BUILD S3; MASWALI-PLAN §7b S3 items 1–3).
 *
 *   npx tsx scripts/maswali-purchase.test.mts     (npm run test:maswali-purchase)
 *
 *   §1 who may buy and when: the rollout, the week, the account (MR-10), the picks (MR-9), the price (MR-8)
 *   §2 ⭐ one purchase of N tickets: one debit, N positions, N transactions, N salted tickets, one ledger group (MB-31)
 *   §3 the replay: the same key is the same purchase — never twice, never another purchase's receipt
 *   §4 the cap (MR-11), counted inside the wallet lock: concurrent purchases of one account end at exactly the cap
 *   §5 real balance only (MR-10) and the responsible-gambling gates, through the one bet path
 *   §6 ⭐ the free cancel (MR-12): in full, in one transaction, only inside its window, never twice; no paid exit
 *   §7 the void arm: a voided week refunds every ticket in full, and sends no Up & Down notice and reverses no wagering
 */
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-purchase-session-secret-0123456789abcdef";

const { loadMaswaliWorld, SEALER } = await import("./maswali-money-world.mts");
const W = await loadMaswaliWorld();
const { svc: market } = W.w;
const { dal, money, acct } = W;
const { leafHash } = await import("../../src/lib/maswali-commitment.ts");
const rg = await import("../../src/lib/server/responsible-gambling.ts");

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const J = (x: unknown) => JSON.stringify(x);
const why = (r: { ok: boolean; reason?: string; error?: string }) => (r.ok ? "ok" : `${r.reason ?? "-"}: ${r.error}`);
/** One player's positions on one week's market, their transactions, their notices — read through the stores. */
const positionsOn = async (u: string, marketId: string) => ((await market.listPositionsForMarket(marketId)) as any[]).filter((x) => x.userId === u);
const txnsOf = async (u: string) => (await W.db.txn.findByUser(u, 500)) as any[];
const noticesOf = async (u: string) => ((await W.db.notification.findByUser(u, 500)) as any[] | null) ?? [];
const settleDust = () => new Promise((r) => setTimeout(r, 400)); // a notice is written after its money commits

await W.setup({ guarantee: 20_000_000 });
const { week } = await W.openWeek({ weeksAhead: 2 });
const price = W.svc.frozenRules(week).ticketPriceTzs as number;

// ── §1 · who may buy, and when ──────────────────────────────────────────────
console.log("\n§1 · who may buy, and when");
{
  const p = await W.user({ balance: 50_000 });
  ok("1.1 · the frozen price is the stake bounds: min = max = one ticket", J(await market.stakeBoundsForMarket({ id: week.marketId, productLine: "MASWALI" })) === J({ min: price, max: price }));
  const withdrawn = await W.buy(p, week.id, [W.WIN], { state: "WITHDRAWN" });
  ok("1.2 · ⛔ WITHDRAWN sells nothing, and says Millionea is not available", !withdrawn.ok && withdrawn.reason === "millionea_not_available", why(withdrawn));
  const preview = await W.buy(p, week.id, [W.WIN], { state: "STAFF_PREVIEW" });
  ok("1.3 · ⛔ a PUBLIC week does not sell at STAFF_PREVIEW (only a DRIVE week does)", !preview.ok && preview.reason === "millionea_not_available", why(preview));
  ok("1.4 · the rollout rule, both lines: PUBLIC only at ACTIVE; DRIVE from STAFF_PREVIEW",
    W.svc.rolloutSells("ACTIVE", "PUBLIC") && !W.svc.rolloutSells("STAFF_PREVIEW", "PUBLIC") && W.svc.rolloutSells("STAFF_PREVIEW", "DRIVE")
    && !W.svc.rolloutSells("WITHDRAWN", "DRIVE"));
  const unknown = await W.buy(p, "mlc_nope", [W.WIN]);
  ok("1.5 · ⛔ an unknown week is not open", !unknown.ok && unknown.reason === "millionea_week_not_open", why(unknown));
  const fourteen = await W.buy(p, week.id, [W.WIN.slice(0, 14)]);
  ok("1.6 · ⛔ a slip of fourteen answers is refused (MR-9)", !fourteen.ok && fourteen.reason === "millionea_picks_incomplete", why(fourteen));
  const maybe = await W.buy(p, week.id, [[...W.WIN.slice(0, 14), "MAYBE"]]);
  ok("1.7 · ⛔ an answer that is not YES or NO is refused", !maybe.ok && maybe.reason === "millionea_picks_incomplete", why(maybe));
  const none = await W.buy(p, week.id, []);
  ok("1.8 · ⛔ no slip at all is refused", !none.ok && none.reason === "millionea_picks_incomplete", why(none));
  const staff = await W.user({ balance: 50_000, role: "ADMIN" });
  const s = await W.buy(staff, week.id, [W.WIN]);
  ok("1.9 · ⛔ a staff account cannot buy (MR-10)", !s.ok && s.reason === "millionea_staff_barred", why(s));
  const desk = await W.bot({ balance: 50_000 });
  const d = await W.buy(desk.userId, week.id, [W.WIN]);
  ok("1.10 · ⛔ a house desk account cannot buy", !d.ok && d.reason === "millionea_account_ineligible", why(d));
  const direct = await market.buyPosition(p, { marketId: week.marketId, side: "YES", stake: price });
  ok("1.11 · ⛔ the plain bet door still refuses a week without slips (the S0.5 fence)", !direct.ok && /not accepting/.test(direct.error ?? ""), why(direct));
  const wrongStake = await market.buyPosition(p, { marketId: week.marketId, side: "YES", stake: price + 1, maswali: { weekId: week.id, slips: [W.WIN] } });
  ok("1.12 · ⛔ a stake that is not price × tickets is refused before any money moves", !wrongStake.ok, why(wrongStake));
  ok("1.13 · …and none of §1 moved a shilling", (await W.bal(p)).balance === 50_000 && (await dal.ticketStore.listForUser(p)).length === 0, J(await W.bal(p)));
}

// ── §2 · one purchase of three tickets ──────────────────────────────────────
console.log("\n§2 · one purchase of three tickets");
const buyer = await W.user({ balance: 50_000 });
const three = [W.WIN, W.LOSE, W.slip("NO")];
const bought = await W.buy(buyer, week.id, three, { key: "key-three" });
{
  ok("2.1 · bought", bought.ok, why(bought));
  const tickets = bought.ok ? bought.data.maswali.tickets : [];
  ok("2.2 · three receipts, in slip order", tickets.length === 3, J(tickets));
  ok("2.3 · one debit of 3 × the price", (await W.bal(buyer)).balance === 50_000 - 3 * price && bought.data.balance === 50_000 - 3 * price, J(await W.bal(buyer)));
  const rows = await dal.ticketStore.listForUser(buyer, { cycleId: week.id });
  ok("2.4 · three LIVE ticket rows", rows.length === 3 && rows.every((t: any) => t.status === "LIVE"));
  const bySerial = [...rows].sort((a: any, b: any) => a.serial.localeCompare(b.serial));
  ok("2.5 · serials are the week's code and its sale number", bySerial.every((t: any) => new RegExp(`^${week.code}-\\d{6}$`).test(t.serial)), J(bySerial.map((t: any) => t.serial)));
  ok("2.6 · ⭐ each ticket's commitment is its salted leaf: leafHash(week, ticket, salt, picks)",
    rows.every((t: any) => t.selectionsHash === leafHash({ weekId: week.id, ticketId: t.id, salt: t.salt, picks: t.selections })));
  ok("2.7 · …and every salt is its own", new Set(rows.map((t: any) => t.salt)).size === 3);
  const mine = await positionsOn(buyer, week.marketId);
  ok("2.8 · three OPEN positions on the week's market, each one ticket's price, no potential payout",
    mine.length === 3 && mine.every((p: any) => p.status === "OPEN" && p.stake === price && p.potentialPayout === 0 && (p.bonusStakeTzs ?? 0) === 0), J(mine));
  ok("2.9 · each position's key is the request's key and the ticket's place: key#0…#2",
    mine.map((p: any) => p.idempotencyKey).sort().join(",") === "key-three#0,key-three#1,key-three#2");
  const txns = (await txnsOf(buyer)).filter((t: any) => t.type === "BET_PLACED");
  ok("2.10 · three BET_PLACED transactions of −price, each naming the ticket", txns.length === 3 && txns.every((t: any) => t.amount === -price && /^Millionea ticket · /.test(t.description)), J(txns.map((t: any) => t.description)));
  const w = await dal.weekStore.get(week.id);
  ok("2.11 · the week counts three live tickets", w.ticketCount === 3, `${w.ticketCount}`);
  const m = await market.getMarket(week.marketId);
  ok("2.12 · the market's pool holds all three stakes on one side", m.yesPool === 3 * price && m.noPool === 0, `${m.yesPool}/${m.noPool}`);
  ok("2.13 · ⭐ the week's POOL ledger account holds them too (both stores)", (await W.balanceOf(acct.pool(week.marketId))) === 3 * price, `${await W.balanceOf(acct.pool(week.marketId))}`);
}

// ── §3 · the replay ─────────────────────────────────────────────────────────
console.log("\n§3 · the same key is the same purchase");
{
  const again = await W.buy(buyer, week.id, three, { key: "key-three" });
  ok("3.1 · the same key and slips answer the same receipts, replayed", again.ok && again.data.replayed === true
    && J(again.data.maswali.tickets) === J(bought.data.maswali.tickets), why(again));
  ok("3.2 · …and nothing was charged twice", (await W.bal(buyer)).balance === 50_000 - 3 * price && (await dal.weekStore.get(week.id)).ticketCount === 3);
  const other = await W.buy(buyer, week.id, [W.WIN, W.WIN, W.slip("NO")], { key: "key-three" });
  ok("3.3 · ⛔ the same key with other picks is a conflict, never a receipt", !other.ok && other.reason === "idempotency_key_conflict", why(other));
  const fewer = await W.buy(buyer, week.id, three.slice(0, 2), { key: "key-three" });
  ok("3.4 · ⛔ the same key naming fewer slips than were bought is a conflict", !fewer.ok && fewer.reason === "idempotency_key_conflict", why(fewer));
  const thief = await W.user({ balance: 50_000 });
  const stolen = await W.buy(thief, week.id, three, { key: "key-three" });
  ok("3.5 · ⛔ another player's key is a conflict, never that player's receipt", !stolen.ok && stolen.reason === "idempotency_key_conflict", why(stolen));
}

// ── §4 · the cap ────────────────────────────────────────────────────────────
console.log("\n§4 · the cap, counted inside the wallet lock");
{
  const cap = W.svc.frozenRules(week).ticketCapPerWeek as number;
  const p = await W.user({ balance: 100_000 });
  const over = await W.buy(p, week.id, Array.from({ length: cap + 1 }, () => W.LOSE));
  ok(`4.1 · ⛔ ${cap + 1} tickets in one purchase are refused, naming the cap`, !over.ok && over.reason === "millionea_cap_reached" && over.detail?.ticketCap === cap, why(over));
  const racers = await Promise.all(Array.from({ length: 20 }, (_, i) => W.buy(p, week.id, [W.slip("NO", i % 10)], { key: `race-${i}` })));
  const won = racers.filter((r: any) => r.ok).length;
  const capped = racers.filter((r: any) => !r.ok && r.reason === "millionea_cap_reached").length;
  ok(`4.2 · ⭐ 20 concurrent purchases of one account end at exactly ${cap} tickets`, won === cap && capped === 20 - cap, `${won} bought · ${capped} capped · ${J(racers.filter((r: any) => !r.ok && r.reason !== "millionea_cap_reached").map(why))}`);
  ok("4.3 · …and the account holds exactly the cap, paid once each", (await dal.ticketStore.countLiveForUser(week.id, p)) === cap && (await W.bal(p)).balance === 100_000 - cap * price);
  const q = await W.user({ balance: 100_000 });
  const fifty = await Promise.all(Array.from({ length: 50 }, (_, i) => W.buy(q, week.id, [W.slip("YES", i % 10)], { key: `race50-${i}` })));
  ok(`4.4 · ⭐ 50 concurrent purchases end at exactly ${cap} too`, fifty.filter((r: any) => r.ok).length === cap && (await dal.ticketStore.countLiveForUser(week.id, q)) === cap);
  const r = await W.user({ balance: 100_000 });
  await W.buy(r, week.id, Array.from({ length: cap - 2 }, () => W.LOSE));
  const third = await W.buy(r, week.id, [W.LOSE, W.LOSE, W.LOSE]);
  ok("4.5 · ⛔ a purchase that would pass the cap is refused whole, saying how many are held", !third.ok && third.reason === "millionea_cap_reached" && /hold 8 of 10/.test(third.error ?? ""), why(third));
}

// ── §5 · real balance only, and the responsible-gambling gates ─────────────
console.log("\n§5 · real balance only, and the platform's gates");
{
  const bonusOnly = await W.user({ balance: 0, bonusBalance: 50_000 });
  const b = await W.buy(bonusOnly, week.id, [W.WIN]);
  ok("5.1 · ⛔ bonus money cannot buy a ticket (MR-10), and the player is told so", !b.ok && b.reason === "millionea_bonus_refused", why(b));
  const mixed = await W.user({ balance: price, bonusBalance: 50_000 });
  const m = await W.buy(mixed, week.id, [W.WIN, W.LOSE]);
  ok("5.2 · ⛔ …nor top up a purchase the main balance cannot cover", !m.ok && m.reason === "millionea_bonus_refused" && (await W.bal(mixed)).balance === price, why(m));
  const poor = await W.user({ balance: price - 1 });
  const pr = await W.buy(poor, week.id, [W.WIN]);
  ok("5.3 · ⛔ not enough balance", !pr.ok && pr.reason === "balance_insufficient", why(pr));
  const excluded = await W.user({ balance: 50_000 });
  await rg.selfExclude(excluded, "24h");
  const ex = await W.buy(excluded, week.id, [W.WIN]);
  ok("5.4 · ⛔ a self-excluded player is refused by the platform's own gate", !ex.ok && ex.reason === "self_excluded", why(ex));
  const cooling = await W.user({ balance: 50_000 });
  await rg.coolOff(cooling, "1h");
  const co = await W.buy(cooling, week.id, [W.WIN]);
  ok("5.5 · ⛔ a player on a break is refused", !co.ok && co.reason === "cooling_off", why(co));
  const suspended = await W.user({ balance: 50_000 });
  await W.setUserFields(suspended, { status: "SUSPENDED" });
  const su = await W.buy(suspended, week.id, [W.WIN]);
  ok("5.6 · ⛔ a suspended account is refused", !su.ok && su.reason === "account_blocked", why(su));
  const limited = await W.user({ balance: 50_000 });
  await rg.setLimits(limited, { dailyLossLimit: 2 * price });
  const l1 = await W.buy(limited, week.id, [W.LOSE, W.LOSE]);
  const l2 = await W.buy(limited, week.id, [W.LOSE]);
  ok("5.7 · the loss limit admits a purchase up to it…", l1.ok, why(l1));
  ok("5.8 · ⛔ …and refuses the next ticket past it", !l2.ok && l2.reason === "loss_limit_daily", why(l2));
  const pausedRefund = await market.cashOutPosition(limited, l1.data.maswali.tickets[0].positionId);
  ok("5.9 · the free cancel inside the window refunds in full", pausedRefund.ok && pausedRefund.data.value === price, why(pausedRefund));
  const l3 = await W.buy(limited, week.id, [W.LOSE]);
  ok("5.10 · …and a cancel of a stake inside the same 24 h frees the limit again (OD-17)", l3.ok, why(l3));
}

// ── §5b · the sales pause (MB-62) ───────────────────────────────────────────
console.log("\n§5b · the sales pause stops sales, and nothing else");
{
  const pause = await import("../../src/lib/server/maswali-pause.ts");
  const p = await W.user({ balance: 50_000 });
  const held = await W.buy(p, week.id, [W.LOSE]);
  const short = await pause.pauseMaswaliSales({ officerId: "usr_mln_compliance", reason: "no" });
  ok("5b.1 · ⛔ a pause needs its written reason", !short.ok);
  const paused = await pause.pauseMaswaliSales({ officerId: "usr_mln_compliance", reason: "source outage on two questions" });
  ok("5b.2 · paused", paused.ok && paused.pause.paused === true);
  const refused = await W.buy(p, week.id, [W.LOSE]);
  ok("5b.3 · ⛔ a purchase while paused is refused, and nothing is charged", !refused.ok && refused.reason === "millionea_paused" && (await W.bal(p)).balance === 50_000 - price, why(refused));
  const cancel = await market.cashOutPosition(p, held.data.maswali.tickets[0].positionId);
  ok("5b.4 · ⭐ …while a free cancel still goes through (a pause never blocks the money coming back)", cancel.ok && (await W.bal(p)).balance === 50_000, why(cancel));
  const resumed = await pause.resumeMaswaliSales({ officerId: "usr_mln_compliance", note: "sources back up" });
  const again = await W.buy(p, week.id, [W.LOSE]);
  ok("5b.5 · resumed, a purchase goes through again", resumed.ok && again.ok, why(again));
}

// ── §6 · the free cancel ────────────────────────────────────────────────────
console.log("\n§6 · the free cancel");
{
  const p = await W.user({ balance: 50_000 });
  const r = await W.buy(p, week.id, [W.WIN, W.LOSE]);
  const [t1, t2] = r.data.maswali.tickets;
  const poolBefore = await W.balanceOf(acct.pool(week.marketId));
  const countBefore = (await dal.weekStore.get(week.id)).ticketCount;
  const c = await market.cashOutPosition(p, t1.positionId);
  ok("6.1 · ⭐ cancelled in full: the whole price back, no fee", c.ok && c.data.value === price && c.data.balance === 50_000 - price, why(c));
  const t = await dal.ticketStore.get(t1.ticketId);
  ok("6.2 · the ticket is CANCELLED with its instant", t.status === "CANCELLED" && !!t.cancelledAt);
  const pos = (await positionsOn(p, week.marketId)).find((x: any) => x.id === t1.positionId);
  ok("6.3 · its position is CASHED_OUT at the full stake", pos.status === "CASHED_OUT" && pos.finalPayout === price, J(pos));
  ok("6.4 · the week's count and the pool give it back, in the same act",
    (await dal.weekStore.get(week.id)).ticketCount === countBefore - 1 && (await W.balanceOf(acct.pool(week.marketId))) === poolBefore - price
    && (await market.getMarket(week.marketId)).yesPool === poolBefore - price);
  const txn = (await txnsOf(p)).find((x: any) => x.type === "CASHOUT");
  ok("6.5 · one CASHOUT transaction of the price, fee 0, naming the free window", !!txn && txn.amount === price && txn.fee === 0 && /free window/.test(txn.description), J(txn));
  const twice = await market.cashOutPosition(p, t1.positionId);
  ok("6.6 · ⛔ a ticket is cancelled once", !twice.ok && (await W.bal(p)).balance === 50_000 - price, why(twice));
  await W.backdate(t2.positionId, 60 * 60_000);
  const late = await market.cashOutPosition(p, t2.positionId);
  ok("6.7 · ⛔ after its free window a ticket cannot be cancelled — and there is no paid exit (MB-50)", !late.ok && (await dal.ticketStore.get(t2.ticketId)).status === "LIVE", why(late));
  const other = await W.user({ balance: 50_000 });
  const theft = await market.cashOutPosition(other, (await W.buy(p, week.id, [W.LOSE])).data.maswali.tickets[0].positionId);
  ok("6.8 · ⛔ nobody cancels another player's ticket", !theft.ok && (await W.bal(other)).balance === 50_000, why(theft));
}

// ── §7 · the week void through settleMarket's VOID arm ──────────────────────
console.log("\n§7 · a voided week refunds every ticket");
{
  // A second public week, after the first: its own buyers, every main question void on its own ground.
  const closeFirst = await W.svc.closeWeek({ weekId: week.id, now: new Date(Date.parse(week.closesAt) + 60_000) });
  ok("7.0 · the first week closes", closeFirst.ok, closeFirst.ok ? "" : closeFirst.error);
  const { week: v, start } = await W.openWeek({ weeksAhead: 3 });
  const a = await W.user({ balance: 50_000 }), b = await W.user({ balance: 50_000 });
  // `a` holds a bonus with progress made on other bets: a ticket accrues no turnover (OD-27), so its refund must remove none.
  const bonus = await import("../../src/lib/server/bonus-service.ts");
  await bonus.creditBonus(a, { amountTzs: 10_000, source: "ADMIN", sourceRef: `mln-wager-${a}`, wagerMultiplier: 10, notifyPlayer: false });
  await bonus.recordWagering(a, 5_000);
  const wagerLeft = async () => (await bonus.getBonusSummary(a)).activeWagerRemainingTzs;
  const leftBefore = await wagerLeft();
  await W.buy(a, v.id, [W.WIN, W.LOSE]);
  ok("7.0b · buying tickets accrues no turnover against the bonus", (await wagerLeft()) === leftBefore, `${leftBefore} → ${await wagerLeft()}`);
  await W.buy(b, v.id, [W.WIN]);
  const notesBefore = (await noticesOf(a)).length;
  await W.svc.closeWeek({ weekId: v.id, now: new Date(Date.parse(v.closesAt) + 60_000) });
  const sealAt = new Date(start + 9 * 86_400_000);
  for (let slot = 1; slot <= 15; slot++) {
    await W.svc.sealQuestion({ weekId: v.id, slot, outcome: "VOID", voidReason: "not_played", evidence: `Event ${slot} was not played at all`, officerId: SEALER, now: sealAt });
  }
  const after = await dal.weekStore.get(v.id);
  const voided = await W.svc.voidWeek({ weekId: v.id, now: new Date(Date.parse(after.objectionsCloseAt) + 60_000) });
  ok("7.1 · the week voids whole once its window closes (MR-18)", voided.ok && voided.week.state === "VOIDED", voided.ok ? voided.week.state : voided.error);
  ok("7.2 · ⭐ every ticket's whole price is back", (await W.bal(a)).balance === 50_000 && (await W.bal(b)).balance === 50_000, `${(await W.bal(a)).balance} · ${(await W.bal(b)).balance}`);
  ok("7.3 · every position VOID at its stake", (await positionsOn(a, v.marketId)).every((p: any) => p.status === "VOID" && p.finalPayout === price));
  ok("7.3b · ⭐ …and the void's refund reverses no turnover the tickets never earned", (await wagerLeft()) === leftBefore, `${leftBefore} → ${await wagerLeft()}`);
  const refunds = (await txnsOf(a)).filter((t: any) => t.type === "BET_REFUND");
  ok("7.4 · one BET_REFUND per ticket", refunds.length === 2, `${refunds.length}`);
  await settleDust();
  const notesAfter = (await noticesOf(a)).length;
  ok("7.5 · ⛔ no Up & Down \"round voided\" notice for a ticket (S6 writes Millionea's own)", notesAfter === notesBefore, `${notesBefore} → ${notesAfter}`);
  if (W.onPostgres) ok("7.6 · the voided week's POOL is exactly 0 (Postgres books the refunds)", (await W.balanceOf(acct.pool(v.marketId))) === 0, `${await W.balanceOf(acct.pool(v.marketId))}`);
  ok("7.7 · the jackpot is untouched by a void (worked example D)", (await W.balanceOf(acct.maswaliJackpot)) === 0, `${await W.balanceOf(acct.maswaliJackpot)}`);
}

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
