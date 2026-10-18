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
 *   §7 the week void (its bulk refund, R1): every ticket refunded in full, no Up & Down notice, no wagering reversed
 *   §8 the adversarial review's findings (2026-10-17): the receipt's balance (R4a), the guarantee's answer and record
 *      (R4b), the loss panel against the gate (R5), one reference booking once (R7), the ticket arm asking the rollout
 *      itself (R10a), and the desk check failing closed at the purchase and at the settlement (R10b)
 */
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-purchase-session-secret-0123456789abcdef";

const { loadMaswaliWorld, OWNER, SEALER } = await import("./maswali-money-world.mts");
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

// ── §7 · the week void, through its bulk refund (R1) ─────────────────────────
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

// ── §8 · the adversarial review's findings (2026-10-17) ─────────────────────
console.log(`${String.fromCharCode(10)}§8 · the review's findings: the receipt, the rollout, the desk check, the guarantee, the loss panel`);
{
  const act = await import("../../src/lib/server/activity-summary.ts");
  const { auditFlush, getAuditForTarget } = await import("../../src/lib/server/audit.ts");
  const desks = W.w.dal.houseBotStore;
  const realLookup = desks.findLiveByUserId;
  /** R10b's fault, declared: the desk lookup throws — for every account, or only for `only`. `realDesk` puts it back. */
  const blindDesk = (only?: string) => {
    desks.findLiveByUserId = async (id: string, tx?: unknown) => {
      if (!only || id === only) throw new Error("injected: the desk lookup could not be read");
      return realLookup.call(desks, id, tx);
    };
  };
  const realDesk = () => { desks.findLiveByUserId = realLookup; };
  const setRollout = (state: string) => { process.env.FEATURE_MILLIONEA = state; };
  /**
   * ⚠️ A FIXTURE OF TIME, declared (the world's `backdate`, widened): a ticket bought `byMs` ago — its ticket row, its
   * position and its BET_PLACED row moved into the past together, as a purchase made then would have written them.
   */
  const backdateTicket = async (positionId: string, byMs: number) => {
    if (W.onPostgres) {
      const pc = W.prisma()!;
      await pc.$executeRawUnsafe(`UPDATE "MaswaliTicket" SET "createdAt" = "createdAt" - ($1::int * interval '1 millisecond') WHERE "positionId" = $2`, byMs, positionId);
      await pc.$executeRawUnsafe(`UPDATE "Transaction" SET "createdAt" = "createdAt" - ($1::int * interval '1 millisecond') WHERE "positionId" = $2 AND "type" = 'BET_PLACED'`, byMs, positionId);
    } else {
      // The memory twins keep their ticket rows on `globalThis` and hand back the live transaction rows.
      const tickets = (globalThis as any).__50PICK_MLN_TICKETS as Map<string, any>;
      for (const t of tickets.values()) if (t.positionId === positionId) t.createdAt = new Date(Date.parse(t.createdAt) - byMs).toISOString();
      const p = await W.w.mdal.positionStore.get(positionId);
      for (const t of await txnsOf(p.userId)) if (t.positionId === positionId && t.type === "BET_PLACED") t.createdAt = new Date(Date.parse(t.createdAt) - byMs).toISOString();
    }
    await W.backdate(positionId, byMs);
  };
  const buyDirect = (u: string, wk: any, slips: any[]) =>
    market.buyPosition(u, { marketId: wk.marketId, side: "YES", stake: price * slips.length, maswali: { weekId: wk.id, slips } });

  // A PUBLIC week after the first two, and a DRIVE week beside it (one open week per line).
  const { week: P, start: startP } = await W.openWeek({ weeksAhead: 4 });
  const { week: D, start: startD } = await W.openWeek({ weeksAhead: 5, visibility: "DRIVE" });

  // R4a · the receipt's balance, read in the purchase's own transaction.
  const a = await W.user({ balance: 50_000 });
  const two = await W.buy(a, P.id, [W.LOSE, W.LOSE], { key: "r4a-two" });
  const walletAfter = (await W.bal(a)).balance;
  const placed = (await txnsOf(a)).filter((t: any) => t.type === "BET_PLACED");
  ok("R4a.1 · ⭐ the receipt's balance is the wallet AFTER the purchase, on both stores (Postgres had read the wallet before it)",
    two.ok && two.data.balance === 50_000 - 2 * price && two.data.balance === walletAfter, `${why(two)} · receipt ${two.data?.balance} · wallet ${walletAfter}`);
  ok("R4a.2 · …and it is the purchase's own last balanceAfter", placed.length === 2 && Math.min(...placed.map((t: any) => t.balanceAfter)) === two.data?.balance,
    J(placed.map((t: any) => t.balanceAfter)));
  const more = await W.buy(a, P.id, [W.LOSE]);
  const again = await W.buy(a, P.id, [W.LOSE, W.LOSE], { key: "r4a-two" });
  ok("R4a.3 · the replay answers the wallet as it stands, read in the wallet lock, and charges nothing (control)",
    more.ok && again.ok && again.data.replayed === true && again.data.balance === 50_000 - 3 * price && (await W.bal(a)).balance === 50_000 - 3 * price, why(again));

  // R10a · the ticket arm asks the rollout itself.
  const x = await W.user({ balance: 50_000 });
  let told: any, direct: any, previewPublic: any, previewDrive: any;
  try {
    setRollout("WITHDRAWN");
    told = await W.buy(x, P.id, [W.LOSE]); // purchaseMaswaliTickets itself is told ACTIVE
    direct = await buyDirect(x, P, [W.LOSE]);
    setRollout("STAFF_PREVIEW");
    previewPublic = await buyDirect(x, P, [W.LOSE]);
    previewDrive = await buyDirect(x, D, [W.LOSE]);
  } finally { setRollout("ACTIVE"); }
  ok("R10a.1 · ⛔ with the product WITHDRAWN the ticket arm itself refuses, though purchaseMaswaliTickets was told ACTIVE",
    !told.ok && told.reason === "millionea_not_available", why(told));
  ok("R10a.2 · ⛔ …and the bet door called directly, past purchaseMaswaliTickets, sells nothing either", !direct.ok && direct.reason === "millionea_not_available", why(direct));
  ok("R10a.3 · ⛔ at STAFF_PREVIEW the arm refuses a PUBLIC week, by the one rule (rolloutSells)", !previewPublic.ok && previewPublic.reason === "millionea_not_available", why(previewPublic));
  ok("R10a.4 · …and sells a DRIVE week there: the rule, not a blanket refusal (control)", previewDrive.ok, why(previewDrive));
  ok("R10a.5 · the refusals moved nothing: one ticket bought, one price paid",
    (await W.bal(x)).balance === 50_000 - price && (await dal.ticketStore.listForUser(x)).length === 1, J(await W.bal(x)));
  const active = await buyDirect(x, P, [W.LOSE]);
  ok("R10a.6 · back at ACTIVE the same direct purchase goes through (control)", active.ok, why(active));

  // R10b · the desk check fails closed at the purchase.
  const y = await W.user({ balance: 50_000 });
  let blind: any;
  try { blindDesk(); blind = await W.buy(y, P.id, [W.LOSE], { key: "r10b-blind" }); } finally { realDesk(); }
  ok("R10b.1 · ⛔ a desk check that cannot be read refuses the purchase (fail closed): busy, the stake has not moved",
    !blind.ok && blind.code === "BUSY" && blind.reason === "system_busy", why(blind));
  ok("R10b.2 · …and nothing was charged or written", (await W.bal(y)).balance === 50_000 && (await dal.ticketStore.listForUser(y)).length === 0, J(await W.bal(y)));
  const seen = await W.buy(y, P.id, [W.LOSE], { key: "r10b-blind" });
  ok("R10b.3 · the same key, once the check reads, buys the ticket (control)", seen.ok && !seen.data.replayed && (await W.bal(y)).balance === 50_000 - price, why(seen));

  // R4b + R7 · the guarantee's answer and its record, and one reference booking once per direction.
  const g = () => W.balanceOf(acct.maswaliGuarantee);
  const fund = (amount: number, reference: string) => money.fundMaswaliGuarantee({ amount, reference, typed: money.GUARANTEE_FUND_WORD, ownerId: OWNER });
  const giveBack = (amount: number, reference: string) => money.returnMaswaliGuarantee({ amount, reference, typed: money.GUARANTEE_RETURN_WORD, ownerId: OWNER });
  const rowFor = async (action: string, reference: string) => {
    await auditFlush();
    return getAuditForTarget("MaswaliGuarantee", "guarantee").find((e: any) => e.action === action && e.payload?.reference === reference) as any;
  };
  const g0 = (await g())!;
  const f1 = await fund(1_000, "R7-RAIL-0001");
  ok("R4b.1 · ⭐ the funding answers the guarantee AFTER it (Postgres had answered the balance before)", f1.ok && f1.balance === g0 + 1_000 && (await g()) === g0 + 1_000,
    `${f1.ok ? f1.balance : f1.error} · ledger ${await g()} · before ${g0}`);
  const fundRow = await rowFor("maswali.guarantee.funded", "R7-RAIL-0001");
  ok("R4b.2 · …and its COMPLIANCE row records that balance as balanceAfter", fundRow?.payload?.balanceAfter === g0 + 1_000, J(fundRow?.payload));
  const twice = await fund(1_000, "R7-RAIL-0001");
  ok("R7.1 · ⛔ the same reference funds once: the second submit is refused, naming the reference and when it was recorded",
    !twice.ok && twice.error.includes("R7-RAIL-0001") && twice.error.includes("already recorded") && (await g()) === g0 + 1_000, twice.ok ? "booked twice" : twice.error);
  const spaced = await fund(1_000, "  R7-RAIL-0001  ");
  ok("R7.2 · ⛔ …compared as the ceremony reads it (trimmed)", !spaced.ok && (await g()) === g0 + 1_000, spaced.ok ? "booked twice" : spaced.error);
  const cased = await fund(1_000, "r7-rail-0001");
  ok("R7.2b · ⛔ …and in any case: a bank's reference is the same reference written small", !cased.ok && (await g()) === g0 + 1_000, cased.ok ? "booked twice" : cased.error);
  const race = await Promise.all([fund(1_000, "R7-RAIL-0002"), fund(1_000, "R7-RAIL-0002")]);
  ok("R7.3 · ⭐ two submits of one reference at once: exactly one books (the check and the write share the chain lock)",
    race.filter((r: any) => r.ok).length === 1 && (await g()) === g0 + 2_000, J(race.map((r: any) => (r.ok ? "ok" : r.error))));
  const fresh = await fund(1_000, "R7-RAIL-0003");
  ok("R7.4 · a new reference funds as before (control)", fresh.ok && (await g()) === g0 + 3_000, fresh.ok ? "" : fresh.error);
  const r1 = await giveBack(1_000, "R7-OUT-0001");
  const returnRow = await rowFor("maswali.guarantee.returned", "R7-OUT-0001");
  ok("R4b.3 · the return answers the guarantee after it, and its row records the same balanceAfter",
    r1.ok && r1.balance === g0 + 2_000 && (await g()) === g0 + 2_000 && returnRow?.payload?.balanceAfter === g0 + 2_000, r1.ok ? J(returnRow?.payload) : r1.error);
  const r2 = await giveBack(1_000, "R7-OUT-0001");
  ok("R7.5 · ⛔ the same return reference books once", !r2.ok && r2.error.includes("already recorded") && (await g()) === g0 + 2_000, r2.ok ? "booked twice" : r2.error);
  const r3 = await giveBack(1_000, "R7-RAIL-0001");
  ok("R7.6 · a reference is checked per direction: a funding's reference may name a return (control)", r3.ok && (await g()) === g0 + 1_000, r3.ok ? "" : r3.error);
  if (W.onPostgres) {
    // R4b · the COMPLIANCE row is written once the movement COMMITS (afterCommit): a funding inside a transaction that then
    // rolls back books nothing and records nothing, and its reference stays free (R7 reads only what committed). Postgres
    // only: the memory store has no transaction to roll back.
    const { withLock } = await import("../../src/lib/server/locks.ts");
    const before = (await g())!;
    let rolledBack = false;
    try {
      await withLock("r4b:outer", async () => {
        const inner = await fund(1_000, "R4B-ROLLBACK-0001");
        if (!inner.ok) throw new Error(`the inner funding was refused: ${inner.error}`);
        throw new Error("injected: the outer transaction rolls back after the funding");
      });
    } catch (err) { rolledBack = String((err as Error)?.message ?? err).includes("injected"); }
    const ghost = await rowFor("maswali.guarantee.funded", "R4B-ROLLBACK-0001");
    ok("R4b.4 · ⭐ a funding whose transaction rolls back books nothing and leaves no COMPLIANCE row (it is written on commit)",
      rolledBack && (await g()) === before && !ghost, J({ rolledBack, before, now: await g(), ghost: ghost?.payload ?? null }));
    const later = await fund(1_000, "R4B-ROLLBACK-0001");
    ok("R7.7 · …and its reference is still free: the check reads only what committed (control)", later.ok && (await g()) === before + 1_000, later.ok ? "" : later.error);
  }

  // R10b (the hold) + R5 · the DRIVE week pays two winners, one of them while its desk check cannot be read; the PUBLIC
  // week voids a ticket bought yesterday. Then the free winner's loss panel against the gate.
  const u = await W.user({ balance: 50_000 }); // R5: wins today, and is refunded today a ticket bought yesterday
  const uHold = await W.user({ balance: 50_000 }); // R10b: the winner whose desk check cannot be read
  await rg.setLimits(u, { dailyLossLimit: 3 * price });
  const won = await W.buy(u, D.id, [W.WIN]);
  const old = await W.buy(u, P.id, [W.LOSE]);
  const holder = await W.buy(uHold, D.id, [W.WIN]);
  if (old.ok) await backdateTicket(old.data.maswali.tickets[0].positionId, 25 * 3_600_000);
  const panel0 = (await act.getRgUsage(u)).dailyLoss.used;
  const gate0 = (await rg.getLimitUsage(u)).lossToday;
  ok("R5.1 · on plain stakes the panel and the gate agree: one ticket today, the other moved to yesterday (control)",
    won.ok && old.ok && holder.ok && panel0 === price && gate0 === price, `panel ${panel0} · gate ${gate0} · ${why(won)} · ${why(old)} · ${why(holder)}`);

  const atD = await W.closeAndSeal(D, startD);
  const clean = await W.settle.previewMaswaliSettlement(D.id, atD);
  ok("R10b.4 · with every desk check readable, the preview holds no winner (control)", clean.ok && clean.preview.winners === 2 && clean.preview.held === 0,
    clean.ok ? J({ winners: clean.preview.winners, held: clean.preview.held }) : clean.error);
  const holdBefore = (await W.bal(uHold)).balance;
  let rel: any;
  try { blindDesk(uHold); rel = await W.release(D.id, atD); } finally { realDesk(); }
  const share = rel?.ok ? rel.preview.arithmetic.share : 0;
  const dTickets = (await dal.ticketStore.listForWeek(D.id)) as any[];
  const hw = await W.bal(uHold);
  ok("R10b.5 · ⛔ a winner whose desk check cannot be read is paid in full and HELD (fail closed), never paid free",
    rel?.ok === true && rel.preview.held === 1 && share > 0 && hw.balance - holdBefore === share
      && dTickets.find((t) => t.userId === uHold && t.won)?.frozenReason === "desk check unreadable"
      && hw.status === "FROZEN" && (hw.freezeReasons ?? []).includes("MILLIONEA_SHARE"),
    rel?.ok ? J({ held: rel.preview.held, share, got: hw.balance - holdBefore, status: hw.status, reasons: hw.freezeReasons }) : rel?.error);
  ok("R10b.6 · …and the winner whose check read cleanly is paid free", (await W.bal(u)).status === "ACTIVE"
    && (dTickets.find((t) => t.userId === u && t.won)?.frozenReason ?? null) === null, J(await W.bal(u)));

  const atP = await W.closeAndSeal(P, startP, Array.from({ length: 15 }, () => ({ void: "not_played" })));
  const voided = await W.svc.voidWeek({ weekId: P.id, now: atP });
  const panel = (await act.getRgUsage(u)).dailyLoss.used;
  const gate = (await rg.getLimitUsage(u)).lossToday;
  ok("R5.2 · ⭐ after a Millionea win and a refund today of a ticket bought yesterday, the panel's loss is the gate's: still the one ticket",
    voided.ok && panel === gate && gate === price, `${voided.ok ? "voided" : voided.error} · panel ${panel} · gate ${gate}`);
  const room = 3 * price - panel;
  const inside = await rg.checkLossLimit(u, room);
  const past = await rg.checkLossLimit(u, room + 1);
  ok("R5.3 · ⭐ …so the panel's headroom is exactly what the gate admits: one shilling more is refused", inside.allowed && !past.allowed, J({ room, inside, past }));
  const raw = await W.db.txn.sumGamblingNetSince(u, Date.now() - 86_400_000);
  ok("R5.4 · …while the raw gambling net, which the panel read before, counts the win and the refund as money back", raw > 0, `${raw}`);
}

// ── §9 · the stale slip (S7, MR-30) ─────────────────────────────────────────
console.log(`${String.fromCharCode(10)}§9 · a slip opened before the stop never sells a final-week ticket`);
{
  // A PUBLIC week after every other (the last to open), made the final week while it is ON SALE by the Owner's own act.
  // `shownFinal` is what the player's slip posts: whether it stated the final week's rule when it opened.
  const { week: Z } = await W.openWeek({ weeksAhead: 6 });
  const buyAs = (u: string, shownFinal: boolean, key: string) =>
    W.svc.purchaseMaswaliTickets({ userId: u, weekId: Z.id, slips: [W.LOSE], idempotencyKey: key, shownFinal, stateNow: async () => "ACTIVE" });
  const count = async () => (await dal.weekStore.get(Z.id)).ticketCount;
  const early = await W.user({ balance: 50_000 });
  const plain = await buyAs(early, false, "s7-stale-before-0001");
  ok("SF.1 · a week never final sells to a slip that stated no final week, as before (control)", plain.ok && !plain.data.replayed && (await count()) === 1, why(plain));
  // S7-F4 · the stop waits for a purchase in flight on the week's market: the market lock is held here, as a purchase holds
  // it from its in-lock finality read to its commit, while the Owner's stop runs.
  const { withLock } = await import("../../src/lib/server/locks.ts");
  let letGo!: () => void;
  const held = new Promise<void>((r) => { letGo = r; });
  let entered!: () => void;
  const holding = new Promise<void>((r) => { entered = r; });
  const flight = withLock(`market:${Z.marketId}`, async () => { entered(); await held; });
  await holding;
  let stopped = false;
  const stopping = W.svc.sunsetMaswali({ weekId: Z.id, ownerId: OWNER, typed: W.svc.SUNSET_WORD, reason: "purchase suite stops Millionea" })
    .then((r: any) => { stopped = true; return r; });
  await new Promise((r) => setTimeout(r, 400));
  const finalWhileHeld = (await dal.weekStore.get(Z.id)).isFinal;
  const waited = !stopped && finalWhileHeld === false;
  letGo();
  await flight;
  const stop = await stopping;
  ok("SF.2a · ⛔ S7-F4 · the Owner's stop waits for a purchase in flight on the week's market: the week is not final while that lock is held",
    waited, J({ stopped, finalWhileHeld }));
  ok("SF.2 · the Owner makes the week on sale the final week (the fixture)", stop.ok && stop.week.isFinal === true && stop.week.state === "OPEN", why(stop));
  const stale = await W.user({ balance: 50_000 });
  const refused = await buyAs(stale, false, "s7-stale-slip-0001");
  ok("SF.3 · ⛔ a slip opened before the stop is refused: the week is final now and the slip did not say so",
    !refused.ok && refused.reason === "millionea_week_final" && refused.code === "INVALID", why(refused));
  ok("SF.4 · …and nothing moved: no debit, no ticket, the week's count unchanged",
    (await W.bal(stale)).balance === 50_000 && (await dal.ticketStore.listForUser(stale)).length === 0 && (await count()) === 1, J({ bal: await W.bal(stale), count: await count() }));
  const fresh = await buyAs(stale, true, "s7-fresh-slip-0001");
  ok("SF.5 · a slip opened after the stop (it states the final week) is sold (control)",
    fresh.ok && !fresh.data.replayed && (await W.bal(stale)).balance === 50_000 - price && (await count()) === 2, why(fresh));
  const replay = await buyAs(early, false, "s7-stale-before-0001");
  ok("SF.6 · ⭐ L2 · the same key of a purchase that landed before the stop answers its own receipt, never the refusal, and charges nothing",
    replay.ok && replay.data.replayed === true && J(replay.data.maswali.tickets) === J(plain.data.maswali.tickets)
      && (await W.bal(early)).balance === 50_000 - price && (await count()) === 2, why(replay));

  // S7-F4 · a stop landing between the slip's check and the money transaction: such a purchase passed
  // `purchaseMaswaliTickets`' check while the week was not final, so it reaches the ticket arm with its slip's answer —
  // the path taken here directly, after the stop.
  const midFlight = (u: string, key: string) => market.buyPosition(u, {
    marketId: Z.marketId, side: "YES", stake: price, idempotencyKey: key, maswali: { weekId: Z.id, slips: [W.LOSE], shownFinal: false } });
  const mid = await W.user({ balance: 50_000 });
  const inFlight = await midFlight(mid, "s7f4-mid-flight-0001");
  ok("SF.6a · ⛔ S7-F4 · a stop landing between the slip's check and the money transaction refuses inside the locks, and nothing moves",
    !inFlight.ok && inFlight.reason === "millionea_week_final" && (await W.bal(mid)).balance === 50_000
      && (await dal.ticketStore.listForUser(mid)).length === 0 && (await count()) === 2, why(inFlight));
  const landedMid = await midFlight(early, "s7-stale-before-0001");
  ok("SF.6b · ⭐ …while a key that landed before the stop still answers its own receipt from the wallet lock, charging nothing (control)",
    landedMid.ok && landedMid.data.replayed === true && J(landedMid.data.maswali?.tickets) === J(plain.data.maswali.tickets)
      && (await W.bal(early)).balance === 50_000 - price && (await count()) === 2, why(landedMid));

  // S7-F4 · the refusal is the OPEN week's: once the final week has CLOSED, a stale slip gets the closed week's own answer.
  const shut = await W.svc.closeWeek({ weekId: Z.id, now: new Date(Date.parse(Z.closesAt) + 60_000) });
  const late = await W.user({ balance: 50_000 });
  const staleShut = await buyAs(late, false, "s7-stale-shut-0001");
  const freshShut = await buyAs(late, true, "s7-fresh-shut-0001");
  ok("SF.7 · ⛔ a stale slip on the final week once it has CLOSED gets the closed week's own answer, never the stale-slip refusal: the one a slip that stated the rule gets",
    shut.ok && !staleShut.ok && !freshShut.ok && staleShut.reason !== "millionea_week_final" && staleShut.reason === freshShut.reason
      && (await W.bal(late)).balance === 50_000 && (await count()) === 2, `${shut.ok ? "closed" : shut.error} · ${why(staleShut)} · ${why(freshShut)}`);
  const replayShut = await buyAs(early, false, "s7-stale-before-0001");
  ok("SF.8 · …and the same key of a purchase that landed still answers its own receipt on the closed week, charging nothing (control)",
    replayShut.ok && replayShut.data.replayed === true && J(replayShut.data.maswali.tickets) === J(plain.data.maswali.tickets)
      && (await W.bal(early)).balance === 50_000 - price && (await count()) === 2, why(replayShut));
}

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
