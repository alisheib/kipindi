/**
 * test:maswali-settle — A WEEK'S SETTLEMENT, ON BOTH STORES (MASWALI-BUILD S3; MASWALI-PLAN §7b S3 items 4–9, §5b).
 *
 *   npx tsx scripts/maswali-settle.test.mts     (npm run test:maswali-settle)
 *
 * The S3 acceptance, to the shilling (MASWALI-PLAN §7b S3 "Acceptance"):
 *   (a) a 200-ticket no-winner week rolls 200,000 into the JACKPOT, F = 0
 *   (b) a 300-ticket floor week with one winner: U 700,000, F 130,000, TRA 13,000, GBT 6,500, paid 870,000
 *   (c) 1,500 tickets with 7 winners: 186,428 each, 4 carried
 *   (d) a week void refunds every 1,000 and leaves R untouched            (test:maswali-purchase §7, and §5 here)
 *   (e) the six-week trajectory of §5 replays to a house result of +97,800
 *   (f) an under-funded guarantee aborts with no partial writes
 * and: the preview's digest gates the release; a second release settles nothing; the chain order; the drive's own
 * jackpot (OD-21); a winner whose account changed is paid and held (MB-43), then released or forfeited to the jackpot
 * (OD-07); the sunset's top score (MR-30); Millionea winnings never lift the loss limit (OD-17); the nightly invariants.
 * The review's findings (2026-10-17), each with its control:
 *   R3  · a refused release claims no carry (1.3b, 6.2b, R6.4; on Postgres a late failure, R3.6); a draft below an opened
 *         week never opens (R3.1); a carry above the jackpot pays nothing (R3.4)
 *   R4c · the float alert and the returned week carry the committed figures (R4c.1–3)
 *   R6  · a lift waits for a release landing a held share (R6.2); a refused release lifts its holds (R6.4)
 *   R8  · on Postgres, a forfeit or a hold whose commit fails leaves neither half (R8.1, R8.2)
 *   R9  · the final week's wide tie: 300 winners paid in bulk, timed (§11, R9.1–R9.5)
 */
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-settle-session-secret-0123456789abcdef";

const { loadMaswaliWorld, OWNER, RELEASER } = await import("./maswali-money-world.mts");
const W = await loadMaswaliWorld();
const { dal, money, settle, acct, ledger } = W;
const { checkMaswaliInvariants } = await import("../../src/lib/server/maswali-invariants.ts");
const rg = await import("../../src/lib/server/responsible-gambling.ts");

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const J = (x: unknown) => JSON.stringify(x);
const errOf = (r: { ok: boolean; error?: string }) => (r.ok ? "" : String(r.error));
const bal = async (u: string) => (await W.bal(u)).balance as number;
const jackpot = () => W.balanceOf(acct.maswaliJackpot);
const guarantee = () => W.balanceOf(acct.maswaliGuarantee);
const commission = async () => (W.onPostgres ? W.balanceOf(acct.commission) : null);

// The players: 160 funded accounts, enough for 1,500 tickets at the cap of 10.
// Enough for every floor week below to open (OD-02 asks the floor of each unsettled week) and pay its top-up.
const FUND = 10_000_000;
const players: string[] = [];
for (let i = 0; i < 160; i++) players.push(await W.user({ balance: 200_000 }));

/** Sell a week: `winners` all-YES tickets (one per player, so each winner is its own account), then losers. */
async function sellWeek(weekId: string, total: number, winners: number): Promise<string[]> {
  const winnerIds = players.slice(0, winners);
  for (const u of winnerIds) {
    const r = await W.buy(u, weekId, [W.WIN]);
    if (!r.ok) throw new Error(`sellWeek: a winner's purchase was refused: ${r.error}`);
  }
  await W.sell(weekId, total - winners, W.LOSE, players.slice(winners));
  return winnerIds;
}

await W.setup({ guarantee: FUND });
let ahead = 2;

// ── §1 · (a) a no-winner week ───────────────────────────────────────────────
console.log("\n§1 · (a) a 200-ticket week with no winner rolls over");
{
  const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
  await sellWeek(week.id, 200, 0);
  const at = await W.closeAndSeal(week, start);
  const early = await settle.previewMaswaliSettlement(week.id, new Date(at.getTime() - 120_000));
  ok("1.1 · ⛔ nothing settles while the objection window is open", !early.ok && /objection window/.test(errOf(early)), errOf(early));
  const p = await settle.previewMaswaliSettlement(week.id, at);
  ok("1.2 · the preview: S 200,000 agreed three ways, k 0, a rollover", p.ok && p.preview.sales === 200_000 && p.preview.winners === 0 && p.preview.arithmetic.kind === "ROLLOVER", J(p.ok ? p.preview : p));
  const forged = await settle.settleMaswaliWeek({ weekId: week.id, releasedBy: RELEASER, digest: "0".repeat(32), now: at });
  ok("1.3 · ⛔ a release whose digest is not the prepared figures pays nothing", !forged.ok && /changed since it was prepared/.test(errOf(forged)) && (await dal.weekStore.get(week.id)).state === "RESOLVING");
  ok("1.3b · R3 · …and claims no carry: a refused release leaves the week's carry unclaimed", (await dal.weekStore.get(week.id)).rolloverIn === null,
    `${(await dal.weekStore.get(week.id)).rolloverIn}`);
  const r = await W.release(week.id, at);
  ok("1.4 · ⭐ (a) released: SETTLED", r.ok && r.week.state === "SETTLED", errOf(r));
  ok("1.5 · ⭐ (a) the JACKPOT holds 200,000", (await jackpot()) === 200_000, `${await jackpot()}`);
  ok("1.6 · ⭐ (a) F = 0, U = 0, nothing paid; the week mirrors the rollover", r.ok && r.week.fee === 0 && r.week.topUp === 0 && r.week.paidTotal === 0 && r.week.carryOut === 200_000 && r.week.winningTickets === 0, J(r.ok && r.week));
  ok("1.7 · the week's POOL ends at exactly 0", (await W.balanceOf(acct.pool(week.marketId))) === 0);
  ok("1.8 · every ticket SETTLED, none won, every position LOSS", (await dal.ticketStore.listForWeek(week.id)).every((t: any) => t.status === "SETTLED" && t.won === false && t.score === 9)
    && ((await W.w.svc.listPositionsForMarket(week.marketId)) as any[]).every((x) => x.status === "LOSS" && x.finalPayout === 0));
  ok("1.9 · the carry was claimed in order (R = 0 for the first week)", r.ok && r.week.rolloverIn === 0);
  const twice = await W.release(week.id, at);
  ok("1.10 · a second release settles nothing (already)", twice.ok && twice.already === true && (await jackpot()) === 200_000);
  ok("1.11 · the guarantee is untouched by a rollover", (await guarantee()) === FUND);
}

// ── §2 · (b) a floor week with one winner ───────────────────────────────────
console.log("\n§2 · (b) a 300-ticket floor week with one winner");
let winnerB = "";
{
  const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
  [winnerB] = await sellWeek(week.id, 300, 1);
  const before = await bal(winnerB);
  const at = await W.closeAndSeal(week, start);
  const r = await W.release(week.id, at);
  const a = r.ok ? r.preview.arithmetic : null;
  ok("2.1 · released", r.ok, errOf(r));
  ok("2.2 · it claimed the 200,000 the first week carried (MR-21)", r.ok && r.week.rolloverIn === 200_000, `${r.ok && r.week.rolloverIn}`);
  ok("2.3 · ⭐ (b) J = the floor 1,000,000; F 130,000; TRA 13,000; GBT 6,500", a?.J === 1_000_000 && a?.F === 130_000 && a?.tra === 13_000 && a?.gbt === 6_500, J(a));
  ok("2.4 · ⭐ (b) the one winner is paid 870,000", (await bal(winnerB)) - before === 870_000 && a?.share === 870_000, `${(await bal(winnerB)) - before}`);
  ok("2.5 · ⭐ (b) the top-up U = 1,000,000 − 200,000 − 300,000 + … = 500,000 here (700,000 with no carry)", a?.U === 500_000, `${a?.U}`);
  ok("2.6 · the guarantee paid exactly U", (await guarantee()) === FUND - 500_000, `${await guarantee()}`);
  ok("2.7 · a topped-up week carries nothing: the JACKPOT is 0", (await jackpot()) === 0, `${await jackpot()}`);
  ok("2.8 · the POOL ends at exactly 0", (await W.balanceOf(acct.pool(week.marketId))) === 0);
  const payout = ((await W.db.txn.findByUser(winnerB, 50)) as any[]).find((t) => t.type === "BET_PAYOUT");
  ok("2.9 · one BET_PAYOUT of the share, naming the week and the serial", !!payout && payout.amount === 870_000 && /Millionea MLN-.* · 10 of 10/.test(payout.description), J(payout));
  ok("2.10 · the week mirrors the ledger: S + R + U = F + paid + carry", r.ok && r.week.salesAtClose + r.week.rolloverIn + r.week.topUp === r.week.fee + r.week.paidTotal + r.week.carryOut);
}

// ── §3 · (b′) the floor case exactly as written: no carry ───────────────────
console.log("\n§3 · (b) exactly: 300 tickets, R = 0, one winner → U 700,000");
{
  const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
  const [winner] = await sellWeek(week.id, 300, 1);
  const before = await bal(winner);
  const g = await guarantee();
  const at = await W.closeAndSeal(week, start);
  const r = await W.release(week.id, at);
  const a = r.ok ? r.preview.arithmetic : null;
  ok("3.1 · ⭐ (b) U 700,000, F 130,000, TRA 13,000, GBT 6,500, paid 870,000",
    r.ok && r.week.rolloverIn === 0 && a?.U === 700_000 && a?.F === 130_000 && a?.tra === 13_000 && a?.gbt === 6_500 && a?.paid === 870_000, J(a));
  ok("3.2 · the guarantee gave 700,000 and the winner got 870,000", g - (await guarantee()) === 700_000 && (await bal(winner)) - before === 870_000);
}

// ── §4 · (c) 1,500 tickets, 7 winners, dust carried ─────────────────────────
console.log("\n§4 · (c) 1,500 tickets with 7 winners");
{
  const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
  const winners = await sellWeek(week.id, 1_500, 7);
  const before = await Promise.all(winners.map(bal));
  const g = await guarantee();
  const at = await W.closeAndSeal(week, start);
  const r = await W.release(week.id, at);
  const a = r.ok ? r.preview.arithmetic : null;
  ok("4.1 · released", r.ok, errOf(r));
  ok("4.2 · ⭐ (c) J 1,500,000, F 195,000, each of 7 paid 186,428", a?.J === 1_500_000 && a?.F === 195_000 && a?.share === 186_428 && a?.k === 7, J(a));
  const after = await Promise.all(winners.map(bal));
  ok("4.3 · ⭐ every winner's wallet rose by exactly 186,428", after.every((v, i) => v - before[i] === 186_428), J(after.map((v, i) => v - before[i])));
  ok("4.4 · ⭐ (c) the 4 of dust rolls to the JACKPOT, no top-up", a?.carryOut === 4 && a?.U === 0 && (await jackpot()) === 4 && (await guarantee()) === g, `${await jackpot()}`);
  ok("4.5 · the POOL ends at exactly 0", (await W.balanceOf(acct.pool(week.marketId))) === 0);
  ok("4.6 · 7 WIN positions and 1,493 LOSS", ((await W.w.svc.listPositionsForMarket(week.marketId)) as any[]).filter((x) => x.status === "WIN").length === 7
    && ((await W.w.svc.listPositionsForMarket(week.marketId)) as any[]).filter((x) => x.status === "LOSS").length === 1_493);
}

// ── §5 · (d) a void leaves R untouched; the chain waits for it ──────────────
console.log("\n§5 · (d) a void refunds and leaves the carry where it is");
{
  const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
  await sellWeek(week.id, 30, 0);
  const R = await jackpot();
  await W.svc.closeWeek({ weekId: week.id, now: new Date(Date.parse(week.closesAt) + 60_000) });
  const sealAt = new Date(start + 9 * 86_400_000);
  for (let slot = 1; slot <= 15; slot++) {
    await W.svc.sealQuestion({ weekId: week.id, slot, outcome: "VOID", voidReason: "not_played", evidence: `Event ${slot} was not played at all`, officerId: "usr_mln_sealer", now: sealAt });
  }
  const w = await dal.weekStore.get(week.id);
  const refused = await settle.previewMaswaliSettlement(week.id, new Date(Date.parse(w.objectionsCloseAt) + 60_000));
  ok("5.1 · ⛔ a week that voids whole is never settled, only voided", !refused.ok && /voids whole/.test(errOf(refused)), errOf(refused));
  const v = await W.svc.voidWeek({ weekId: week.id, now: new Date(Date.parse(w.objectionsCloseAt) + 60_000) });
  ok("5.2 · ⭐ (d) voided; every ticket refunded; R untouched", v.ok && v.week.state === "VOIDED" && (await jackpot()) === R, `${R} → ${await jackpot()}`);
}

// ── §6 · (f) an under-funded guarantee aborts with no partial write ─────────
console.log("\n§6 · (f) the guarantee cannot cover the top-up");
{
  const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
  const [winner] = await sellWeek(week.id, 20, 1);
  const at = await W.closeAndSeal(week, start);
  const p = await settle.previewMaswaliSettlement(week.id, at);
  // ⚠️ A FAULT THE PRODUCT CANNOT PRODUCE, DECLARED: the guarantee drained below this week's top-up by a booking that
  //    skips the return ceremony's requirement check — the product's own builder, posted directly. Only so the abort path
  //    can be exercised; the ceremony refuses this very movement (worked example E).
  const held = (await guarantee())!;
  await money.postMaswaliLines(`test_drain_${week.id}`, ledger.maswaliGuaranteeReturnEntries({ amount: held - 1, reference: "TEST-FAULT", actorId: OWNER }), null);
  const before = { bal: await bal(winner), jackpot: await jackpot(), pool: await W.balanceOf(acct.pool(week.marketId)) };
  const r = p.ok ? await settle.settleMaswaliWeek({ weekId: week.id, releasedBy: RELEASER, digest: p.preview.digest, now: at }) : p;
  ok("6.1 · ⭐ (f) refused, naming the guarantee — never a smaller share", !r.ok && /guarantee holds less/.test(errOf(r)), errOf(r));
  const after = await dal.weekStore.get(week.id);
  ok("6.2 · ⭐ (f) no partial write: the week is RESOLVING, no ticket graded, no money moved",
    after.state === "RESOLVING" && after.settledAt === null && (await dal.ticketStore.listForWeek(week.id)).every((t: any) => t.status === "LIVE")
    && (await bal(winner)) === before.bal && (await jackpot()) === before.jackpot && (await W.balanceOf(acct.pool(week.marketId))) === before.pool);
  ok("6.2b · R3 · ⭐ …and no carry stands for the refused week: the claim is written after the guarantee's refusal, never before it",
    after.rolloverIn === null, `${after.rolloverIn}`);
  ok("6.3 · the invariants report the shortfall", !(await checkMaswaliInvariants()).ok);
  const refill = await money.fundMaswaliGuarantee({ amount: FUND * 2, reference: "TEST-RAIL-0002", typed: money.GUARANTEE_FUND_WORD, ownerId: OWNER });
  const again = await W.release(week.id, at);
  ok("6.4 · funded again, the same week releases", refill.ok && again.ok && again.week.state === "SETTLED", errOf(again));
}

// ── §6b · S is read three ways, to the shilling ─────────────────────────────
console.log("\n§6b · a pool one shilling off refuses the week (MB-08)");
{
  const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
  await sellWeek(week.id, 10, 0);
  const at = await W.closeAndSeal(week, start);
  // ⚠️ A FAULT THE PRODUCT CANNOT PRODUCE, DECLARED: one shilling booked into the week's POOL from outside, so the ledger
  //    disagrees with the market's pool and the tickets by exactly 1. Then booked back out.
  const pool = acct.pool(week.marketId), outside = acct.external("TEST_FAULT");
  await money.postMaswaliLines(`test_drift_${week.id}`, [
    { account: pool, entryType: "ADJUSTMENT", amount: 1, marketId: week.marketId, memo: "test fault" },
    { account: outside, entryType: "ADJUSTMENT", amount: -1, marketId: week.marketId, memo: "test fault" },
  ], null);
  const p = await settle.previewMaswaliSettlement(week.id, at);
  ok("6b.1 · ⛔ the ledger one shilling above the tickets: the week does not settle", !p.ok && /sales do not agree/.test(errOf(p)), errOf(p));
  await money.postMaswaliLines(`test_drift_back_${week.id}`, [
    { account: pool, entryType: "ADJUSTMENT", amount: -1, marketId: week.marketId, memo: "test fault undone" },
    { account: outside, entryType: "ADJUSTMENT", amount: 1, marketId: week.marketId, memo: "test fault undone" },
  ], null);
  const r = await W.release(week.id, at);
  ok("6b.2 · …and once the three readings agree again, it settles", r.ok && r.week.state === "SETTLED", errOf(r));
}

// ── §7 · a winner whose account changed: paid and held, then decided ────────
console.log("\n§7 · a winner whose account changed is paid and held (MB-43, OD-07)");
{
  const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
  const [a, b] = await sellWeek(week.id, 100, 2);
  await W.setUserFields(b, { status: "SUSPENDED" });
  const at = await W.closeAndSeal(week, start);
  const before = await bal(b);
  const r = await W.release(week.id, at);
  ok("7.1 · released; one winner held", r.ok && r.preview.held === 1, errOf(r));
  const share = r.ok ? r.preview.arithmetic.share : 0;
  const held = (await dal.ticketStore.listForWeek(week.id)).find((t: any) => t.userId === b && t.won);
  ok("7.2 · ⭐ the held winner is still paid the full share — never a re-run, never less", (await bal(b)) - before === share && held?.frozenReason === "account suspended", `${held?.frozenReason}`);
  const w = await W.bal(b);
  ok("7.3 · …and their wallet is held for Compliance (MILLIONEA_SHARE)", w.status === "FROZEN" && (w.freezeReasons ?? []).includes("MILLIONEA_SHARE"), J(w));
  ok("7.4 · the free winner is not held", (await W.bal(a)).status === "ACTIVE");
  const wrongWord = await settle.forfeitMaswaliShare({ ticketId: held.id, officerId: OWNER, typed: "forfeit", reason: "duplicate identity proven" });
  ok("7.5 · ⛔ a forfeit needs its typed words", !wrongWord.ok);
  const j0 = await jackpot();
  const f = await settle.forfeitMaswaliShare({ ticketId: held.id, officerId: OWNER, typed: settle.FORFEIT_SHARE_WORD, reason: "duplicate identity proven" });
  ok("7.6 · ⭐ forfeited: the whole share leaves the wallet and goes to the JACKPOT, never the house (OD-07)",
    f.ok && (await bal(b)) === before && (await jackpot()) - j0 === share, `${errOf(f)} · ${(await jackpot()) - j0}`);
  ok("7.7 · …and the wallet's Millionea hold lifts once no share is held", !(((await W.bal(b)).freezeReasons ?? []) as string[]).includes("MILLIONEA_SHARE"), J(await W.bal(b)));
  const again = await settle.forfeitMaswaliShare({ ticketId: held.id, officerId: OWNER, typed: settle.FORFEIT_SHARE_WORD, reason: "duplicate identity proven" });
  ok("7.8 · ⛔ a share is forfeited once", !again.ok && (await jackpot()) - j0 === share);
  const freeTicket = (await dal.ticketStore.listForWeek(week.id)).find((t: any) => t.userId === a && t.won);
  const h = await settle.holdMaswaliShare({ ticketId: freeTicket.id, officerId: OWNER, reason: "a reversed deposit funded it" });
  ok("7.9 · Compliance holds a paid share found later (MB-74)", h.ok && (await W.bal(a)).status === "FROZEN");
  const rel = await settle.releaseMaswaliShare({ ticketId: freeTicket.id, officerId: OWNER, note: "the reversal was re-paid" });
  ok("7.10 · …and releases it: the player keeps it, the hold lifts", rel.ok && (await W.bal(a)).status === "ACTIVE" && (await dal.ticketStore.get(freeTicket.id)).frozenReason === null);
  await W.setUserFields(b, { status: "ACTIVE" }); // the account's own review ends; later weeks buy from it again
}

// ── §8 · OD-17: a Millionea win never lifts the loss limit ──────────────────
console.log("\n§8 · Millionea winnings never offset the 24-hour loss limit (OD-17)");
{
  const winner = players[0]; // won in §2 and §7 today
  const usage = await rg.getLimitUsage(winner);
  const raw = await W.db.txn.sumGamblingNetSince(winner, Date.now() - 86_400_000);
  ok("8.1 · ⭐ the limit's loss today counts every ticket bought and none of the winnings", usage.lossToday > 0 && raw > 0, `lossToday ${usage.lossToday} · platform net ${raw}`);
  // Derived independently from the player's own rows: every stake and every in-window refund of an in-window stake,
  // and NO payout — the only Millionea money back that may lower the loss is a refund of a stake inside the window.
  const since = Date.now() - 86_400_000;
  const rows = ((await W.db.txn.findByUser(winner, 2_000)) as any[]).filter((t) => t.status === "CONFIRMED" && Date.parse(t.createdAt) >= since);
  const staked = -rows.filter((t) => t.type === "BET_PLACED").reduce((x, t) => x + t.amount, 0);
  const back = rows.filter((t) => t.type === "BET_REFUND" || t.type === "CASHOUT").reduce((x, t) => x + t.amount, 0);
  ok("8.2 · ⭐ the loss today is stakes minus in-window refunds, exactly — the winnings are not in it", usage.lossToday === Math.max(0, staked - back), `lossToday ${usage.lossToday} · staked ${staked} · refunded ${back}`);
}

// ── §9 · the drive's own jackpot (OD-21) and the chain ──────────────────────
console.log("\n§9 · a DRIVE week rolls into its own jackpot");
{
  const publicBefore = await jackpot();
  const { week, start } = await W.openWeek({ weeksAhead: ahead++, visibility: "DRIVE" });
  await sellWeek(week.id, 10, 0);
  const at = await W.closeAndSeal(week, start);
  const r = await W.release(week.id, at);
  ok("9.1 · released", r.ok, errOf(r));
  ok("9.2 · ⭐ its 10,000 went to the DRIVE jackpot, and the public one did not move", (await W.balanceOf(acct.maswaliDriveJackpot)) === 10_000 && (await jackpot()) === publicBefore,
    `drive ${await W.balanceOf(acct.maswaliDriveJackpot)} · public ${publicBefore} → ${await jackpot()}`);
}

// ── §10 · (e) the six-week trajectory ───────────────────────────────────────
console.log("\n§10 · (e) the six-week trajectory of §5 worked example A");
{
  // A fresh ledger for the trajectory: every earlier week settled, so its own jackpot starts where they left it.
  // The trajectory needs R = 0 at its week 1, so first empty the public jackpot by a week that pays it out.
  const { week: w0, start: s0 } = await W.openWeek({ weeksAhead: ahead++ });
  await sellWeek(w0.id, 10, 1);
  const r0 = await W.release(w0.id, await W.closeAndSeal(w0, s0));
  ok("10.0 · the public jackpot is emptied first", r0.ok && (await jackpot()) === 0, `${await jackpot()}`);
  const plan = [[300, 0], [400, 1], [500, 0], [600, 0], [700, 0], [800, 3]] as const;
  const g0 = (await guarantee())!;
  const c0 = await commission();
  const got: Array<{ R: number; k: number; F: number; U: number; paid: number; jackpot: number }> = [];
  let netFee = 0;
  for (const [n, k] of plan) {
    const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
    await sellWeek(week.id, n, k);
    const r = await W.release(week.id, await W.closeAndSeal(week, start));
    if (!r.ok) { ok(`10.x · week of ${n} released`, false, errOf(r)); break; }
    got.push({ R: r.week.rolloverIn, k: r.week.winningTickets, F: r.week.fee, U: r.week.topUp, paid: r.week.paidTotal, jackpot: (await jackpot())! });
    netFee += r.week.fee - r.week.traLevy - r.week.gbtLevy;
  }
  const want = [
    { R: 0, k: 0, F: 0, U: 0, paid: 0, jackpot: 300_000 },
    { R: 300_000, k: 1, F: 130_000, U: 300_000, paid: 870_000, jackpot: 0 },
    { R: 0, k: 0, F: 0, U: 0, paid: 0, jackpot: 500_000 },
    { R: 500_000, k: 0, F: 0, U: 0, paid: 0, jackpot: 1_100_000 },
    { R: 1_100_000, k: 0, F: 0, U: 0, paid: 0, jackpot: 1_800_000 },
    { R: 1_800_000, k: 3, F: 338_000, U: 0, paid: 2_262_000, jackpot: 0 },
  ];
  ok("10.1 · ⭐ (e) every week of the trajectory, to the shilling (R, k, F, U, paid, the jackpot after)", J(got) === J(want), J(got));
  ok("10.2 · ⭐ (e) the guarantee gave 300,000 in all", g0 - (await guarantee())! === 300_000, `${g0 - (await guarantee())!}`);
  ok("10.3 · ⭐ (e) the house result from the weeks' own columns: net fee 397,800 − top-up 300,000 = +97,800", netFee - 300_000 === 97_800, `net ${netFee}`);
  if (W.onPostgres) {
    const c1 = await commission();
    ok("10.4 · ⭐ (e) …and the ledger's HOUSE:COMMISSION grew by exactly that net fee", c1! - c0! === 397_800, `${c1! - c0!}`);
  }
}

// ── R3 · the carry: in chain order, claimed with its payout, never above the jackpot ──────────────────────
console.log("\n§R3 · the carry is claimed strictly in order, with its payout, and never above what the jackpot holds");
{
  // (ii) THE CHAIN ORDER AT THE OPEN: A is drafted first (the lower seq) and B after it; B opens, sells and closes. A can no
  //      longer open — it would settle after B and claim a carry B may already have drawn (the double claim).
  const startA = W.weekStartAhead(ahead++);
  const draftA = await W.svc.createWeek({ weekStartMs: startA, questions: W.questions(startA), officerId: "usr_mln_drafter", now: new Date(startA - 3 * 86_400_000) });
  if (!draftA.ok) throw new Error(`R3: the draft was refused: ${draftA.error}`);
  await W.svc.attestParity({ weekId: draftA.week.id, officerId: "usr_mln_reader" });
  const { week: b, start: sb } = await W.openWeek({ weeksAhead: ahead++ });
  await sellWeek(b.id, 10, 0);
  await W.svc.closeWeek({ weekId: b.id, now: new Date(Date.parse(b.closesAt) + 60_000) });
  const late = await W.svc.openWeek({ weekId: draftA.week.id, officerId: "usr_mln_drafter", guarantee: money.guaranteeReader, now: new Date(startA + 60_000) });
  ok("R3.1 · ⛔ a draft whose seq is below a week that has already opened never opens — it would claim a carry that week may already have drawn",
    !late.ok && /strictly in order/.test(errOf(late)) && (await dal.weekStore.get(draftA.week.id)).state === "DRAFT", errOf(late));
  const rb = await W.release(b.id, await W.closeAndSeal(b, sb));
  ok("R3.2 · …and the week above it settles and claims in order: a draft that can never open is never in the chain",
    rb.ok && rb.week.state === "SETTLED" && rb.week.rolloverIn != null, errOf(rb));

  // (iii) THE JACKPOT COVERS R: a carry claimed on its own (the standalone `claimCarry`, kept for its other callers), then
  //       the drive jackpot drained one shilling below it. The release must pay nothing until the two agree again.
  const { week: d, start: sd } = await W.openWeek({ weeksAhead: ahead++, visibility: "DRIVE" });
  const [winner] = await sellWeek(d.id, 10, 1);
  const at = await W.closeAndSeal(d, sd);
  const R = (await W.balanceOf(acct.maswaliDriveJackpot))!;
  const claim = await W.svc.claimCarry({ weekId: d.id, readJackpot: () => W.balanceOf(acct.maswaliDriveJackpot) });
  ok("R3.3 · the standalone claim keeps its behaviour: it claims the drive jackpot, in order, at once", claim.ok && claim.rolloverIn === R && R > 0, `${errOf(claim)} · R ${R}`);
  // ⚠️ A FAULT THE PRODUCT CANNOT PRODUCE, DECLARED: one shilling booked out of the drive jackpot from outside, then back in.
  const outside = acct.external("TEST_FAULT");
  await money.postMaswaliLines(`test_jackpot_drift_${d.id}`, [
    { account: acct.maswaliDriveJackpot, entryType: "ADJUSTMENT", amount: -1, memo: "test fault" },
    { account: outside, entryType: "ADJUSTMENT", amount: 1, memo: "test fault" },
  ], null);
  const before = { bal: await bal(winner), guarantee: await guarantee(), drive: await W.balanceOf(acct.maswaliDriveJackpot) };
  const p = await settle.previewMaswaliSettlement(d.id, at);
  const r = p.ok ? await settle.settleMaswaliWeek({ weekId: d.id, releasedBy: RELEASER, digest: p.preview.digest, now: at }) : p;
  const after = await dal.weekStore.get(d.id);
  ok("R3.4 · ⭐ (iii) a carry above what the jackpot holds pays nothing: refused, and the winner, the guarantee and the jackpot untouched",
    !r.ok && /jackpot holds less/.test(errOf(r)) && after.state === "RESOLVING" && (await bal(winner)) === before.bal && (await guarantee()) === before.guarantee
      && (await W.balanceOf(acct.maswaliDriveJackpot)) === before.drive && (await dal.ticketStore.listForWeek(d.id)).every((t: any) => t.status === "LIVE"), errOf(r));
  await money.postMaswaliLines(`test_jackpot_drift_back_${d.id}`, [
    { account: acct.maswaliDriveJackpot, entryType: "ADJUSTMENT", amount: 1, memo: "test fault undone" },
    { account: outside, entryType: "ADJUSTMENT", amount: -1, memo: "test fault undone" },
  ], null);
  const again = await W.release(d.id, at);
  ok("R3.5 · …and once the jackpot holds it again, the week settles, drawing exactly that carry",
    again.ok && again.week.state === "SETTLED" && again.week.rolloverIn === R && (await W.balanceOf(acct.maswaliDriveJackpot)) === again.week.carryOut, errOf(again));
}

// ── R4c · the float alert reads the figures the settlement committed (MB-11) ───────────────────────────────
console.log("\n§R4c · the payout float alert is handed the paid total the settlement committed (MB-11)");
{
  const { getAuditForTargetDurable, auditFlush } = await import("../../src/lib/server/audit.ts");
  // The check runs after the release returns (it never delays a payment); give it its turn, then read the record.
  const floatAlerts = async (weekId: string, tries: number): Promise<any[]> => {
    for (let i = 0; i < tries; i++) {
      await new Promise((res) => setTimeout(res, 50));
      await auditFlush();
      const rows = (await getAuditForTargetDurable("MaswaliCycle", weekId, { limit: 50 })).entries.filter((e: any) => e.action === "maswali.settlement.float_low");
      if (rows.length > 0) return rows;
    }
    return [];
  };
  const floatWeek = async (readFloat: (paid: number) => { balance: number }) => {
    const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
    await sellWeek(week.id, 10, 1);
    const at = await W.closeAndSeal(week, start);
    const p = await settle.previewMaswaliSettlement(week.id, at);
    if (!p.ok) throw new Error(`R4c: the preview was refused: ${p.error}`);
    const paid = p.preview.arithmetic.paid;
    const r = await settle.settleMaswaliWeek({ weekId: week.id, releasedBy: RELEASER, digest: p.preview.digest, now: at, readFloat: async () => readFloat(paid) });
    return { week, r, paid };
  };
  const dry = await floatWeek(() => ({ balance: 0 }));
  const alerts = await floatAlerts(dry.week.id, 40);
  ok("R4c.1 · ⭐ an empty float raises the MB-11 alert, naming the paid total the settlement committed (on Postgres too)",
    dry.r.ok && dry.paid > 0 && alerts.length === 1 && alerts[0].payload?.paid === dry.paid, J({ r: errOf(dry.r), alerts: alerts.map((a: any) => a.payload) }));
  ok("R4c.2 · ⭐ …and the release returns the week as committed: SETTLED, its paid total the one the alert names",
    dry.r.ok && dry.r.week.state === "SETTLED" && dry.r.week.paidTotal === dry.paid, J(dry.r.ok ? { state: dry.r.week.state, paidTotal: dry.r.week.paidTotal } : dry.r));
  const buffer = Number(alerts[0]?.payload?.buffer ?? NaN);
  const deep = await floatWeek((paid) => ({ balance: paid + buffer }));
  ok("R4c.3 · control: a float that covers the shares and the buffer raises nothing", Number.isFinite(buffer) && deep.r.ok && (await floatAlerts(deep.week.id, 10)).length === 0,
    `${errOf(deep.r)} · buffer ${buffer}`);
}

// ── R6 · a held share's hold and every lift take one lock; R8 · a share act commits whole or not at all ────
console.log("\n§R6 · the hold and every lift share one lock (MB-43); R8 · a hold or a forfeit commits whole or not at all");
{
  const { runOutsideLock } = await import("../../src/lib/server/locks.ts");
  const P = players[157], Q = players[158];
  const filler = players.slice(140, 150);
  const heldOf = async (u: string) => (((await W.bal(u)).freezeReasons ?? []) as string[]).includes("MILLIONEA_SHARE");
  const buyOne = async (u: string, weekId: string) => {
    const b = await W.buy(u, weekId, [W.WIN]);
    if (!b.ok) throw new Error(`R6: a winner's purchase was refused: ${b.error}`);
  };
  const failAt = (act: string) => settle.__setMaswaliSettleSeamsForTests({
    beforeCommit: async (at: string) => { if (at === act) throw new Error(`TEST-FAULT · the ${act} commit fails`); },
  });
  const thrownBy = async (fn: () => Promise<unknown>): Promise<string> => {
    try { await fn(); return ""; } catch (e) { return String((e as Error)?.message ?? e); } finally { settle.__setMaswaliSettleSeamsForTests(null); }
  };

  // Two weeks with one winning ticket of P's each, both bought while P's account was still active.
  const { week: x1, start: s1 } = await W.openWeek({ weeksAhead: ahead++ });
  await buyOne(P, x1.id);
  await W.sell(x1.id, 9, W.LOSE, filler);
  await W.svc.closeWeek({ weekId: x1.id, now: new Date(Date.parse(x1.closesAt) + 60_000) });
  const { week: x2, start: s2 } = await W.openWeek({ weeksAhead: ahead++ });
  await buyOne(P, x2.id);
  await W.sell(x2.id, 9, W.LOSE, filler);
  await W.setUserFields(P, { status: "SUSPENDED" });
  const r1 = await W.release(x1.id, await W.closeAndSeal(x1, s1));
  const t1 = (await dal.ticketStore.listForWeek(x1.id)).find((t: any) => t.userId === P && t.won);
  ok("R6.1 · the first week pays P's share and holds it (MB-43)", r1.ok && r1.preview.held === 1 && t1?.frozenReason === "account suspended" && (await heldOf(P)), errOf(r1));

  // ⭐ THE INTERLEAVE: while the second release holds P's wallet and has not yet paid, Compliance releases the FIRST share.
  const at2 = await W.closeAndSeal(x2, s2);
  const pending: { lift?: Promise<any> } = {};
  settle.__setMaswaliSettleSeamsForTests({
    afterHolds: async () => {
      pending.lift = runOutsideLock(() => settle.releaseMaswaliShare({ ticketId: t1.id, officerId: OWNER, note: "the first review is closed" }));
      await new Promise((res) => setTimeout(res, 200));
    },
  });
  let r2: any;
  try { r2 = await W.release(x2.id, at2); } finally { settle.__setMaswaliSettleSeamsForTests(null); }
  const lifted = pending.lift ? await pending.lift : null;
  const t2 = (await dal.ticketStore.listForWeek(x2.id)).find((t: any) => t.userId === P && t.won);
  ok("R6.2 · ⭐ the lift waited for the release: the first share released, the second landed held, and P's wallet STILL held (MB-43)",
    r2?.ok && lifted?.ok && (await dal.ticketStore.get(t1.id)).frozenReason === null && t2?.frozenReason === "account suspended" && (await heldOf(P))
      && (await W.bal(P)).status === "FROZEN", J({ r2: r2 ? errOf(r2) : "none", lifted, t2: t2?.frozenReason, wallet: await W.bal(P) }));
  const rel2 = await settle.releaseMaswaliShare({ ticketId: t2.id, officerId: OWNER, note: "the second review is closed" });
  ok("R6.3 · control: releasing the last held share lifts the hold", rel2.ok && !(await heldOf(P)) && (await W.bal(P)).status === "ACTIVE", errOf(rel2));

  // A release refused AFTER its hold: the hold is lifted again (R6), and no carry is claimed (R3).
  await W.setUserFields(P, { status: "ACTIVE" });
  const { week: x3, start: s3 } = await W.openWeek({ weeksAhead: ahead++ });
  await buyOne(P, x3.id);
  await buyOne(Q, x3.id);
  await W.sell(x3.id, 8, W.LOSE, filler);
  await W.setUserFields(P, { status: "SUSPENDED" });
  const at3 = await W.closeAndSeal(x3, s3);
  const p3 = await settle.previewMaswaliSettlement(x3.id, at3);
  // ⚠️ A FAULT THE PRODUCT CANNOT PRODUCE, DECLARED (as §6): the guarantee drained below the top-up after the preview.
  const g3 = (await guarantee())!;
  await money.postMaswaliLines(`test_drain_r6_${x3.id}`, ledger.maswaliGuaranteeReturnEntries({ amount: g3 - 1, reference: "TEST-FAULT", actorId: OWNER }), null);
  const balP = await bal(P), balQ = await bal(Q);
  const short = p3.ok ? await settle.settleMaswaliWeek({ weekId: x3.id, releasedBy: RELEASER, digest: p3.preview.digest, now: at3 }) : p3;
  const w3 = await dal.weekStore.get(x3.id);
  ok("R6.4 · ⭐ a release refused after its hold lifts that hold again — no hold stands with no held share — and claims no carry (R3)",
    !short.ok && /guarantee holds less/.test(errOf(short)) && !(await heldOf(P)) && (await W.bal(P)).status === "ACTIVE" && (await bal(P)) === balP
      && w3.state === "RESOLVING" && w3.rolloverIn === null, J({ e: errOf(short), wallet: await W.bal(P), rolloverIn: w3.rolloverIn }));
  const refill = await money.fundMaswaliGuarantee({ amount: FUND * 2, reference: "TEST-RAIL-0003", typed: money.GUARANTEE_FUND_WORD, ownerId: OWNER });
  if (W.onPostgres) {
    // On the store that rolls back: the release fails at its last statement — after the claim, every credit and the stamp.
    failAt("release");
    const thrown = await thrownBy(() => W.release(x3.id, at3));
    const w3b = await dal.weekStore.get(x3.id);
    ok("R3.6 · ⭐ (Postgres) a release that fails at its last statement leaves no carry claimed, nothing paid, and no hold standing (R6)",
      /TEST-FAULT/.test(thrown) && w3b.state === "RESOLVING" && w3b.rolloverIn === null && (await bal(P)) === balP && (await bal(Q)) === balQ && !(await heldOf(P))
        && (await dal.ticketStore.listForWeek(x3.id)).every((t: any) => t.status === "LIVE"), J({ thrown, rolloverIn: w3b.rolloverIn, wallet: await W.bal(P) }));
  }
  const r3 = await W.release(x3.id, at3);
  const tickets3 = await dal.ticketStore.listForWeek(x3.id);
  const t3 = tickets3.find((t: any) => t.userId === P && t.won), tq = tickets3.find((t: any) => t.userId === Q && t.won);
  ok("R6.5 · control: funded again, the week settles once — both paid, P's share held again, Q's free, the carry claimed",
    refill.ok && r3.ok && r3.week.state === "SETTLED" && r3.week.rolloverIn != null && t3?.frozenReason === "account suspended" && tq?.frozenReason === null
      && (await heldOf(P)) && !(await heldOf(Q)), errOf(r3));

  if (W.onPostgres) {
    // R8 · a forfeit whose commit fails: neither half lands.
    const j0 = await jackpot(), b0 = await bal(P);
    failAt("forfeit");
    const thrown = await thrownBy(() => settle.forfeitMaswaliShare({ ticketId: t3.id, officerId: OWNER, typed: settle.FORFEIT_SHARE_WORD, reason: "duplicate identity proven" }));
    const t3b = await dal.ticketStore.get(t3.id);
    ok("R8.1 · ⭐ (Postgres) a forfeit whose commit fails leaves the share held, the wallet whole and the jackpot unmoved — never 'forfeited' with nothing debited",
      /TEST-FAULT/.test(thrown) && t3b.frozenReason === "account suspended" && (await bal(P)) === b0 && (await jackpot()) === j0 && (await heldOf(P)),
      J({ thrown, reason: t3b.frozenReason }));
    // R8 · a hold whose commit fails: the ticket stays unheld, and the hold placed for it is lifted again.
    failAt("hold");
    const hThrown = await thrownBy(() => settle.holdMaswaliShare({ ticketId: tq.id, officerId: OWNER, reason: "a reversed deposit funded it" }));
    ok("R8.2 · ⭐ (Postgres) a hold whose commit fails leaves the ticket unheld and no hold on the wallet",
      /TEST-FAULT/.test(hThrown) && (await dal.ticketStore.get(tq.id)).frozenReason === null && !(await heldOf(Q)) && (await W.bal(Q)).status === "ACTIVE",
      J({ hThrown, wallet: await W.bal(Q) }));
  }
  const hq = await settle.holdMaswaliShare({ ticketId: tq.id, officerId: OWNER, reason: "a reversed deposit funded it" });
  ok("R8.3 · control: the same hold commits whole when nothing fails — the ticket held, and the wallet with it",
    hq.ok && (await dal.ticketStore.get(tq.id)).frozenReason === "compliance · a reversed deposit funded it" && (await heldOf(Q)), errOf(hq));
  const relQ = await settle.releaseMaswaliShare({ ticketId: tq.id, officerId: OWNER, note: "the reversal was re-paid" });
  const relP = await settle.releaseMaswaliShare({ ticketId: t3.id, officerId: OWNER, note: "the account's review is closed" });
  ok("R6.6 · control: each release lifts its own player's hold", relQ.ok && relP.ok && !(await heldOf(Q)) && !(await heldOf(P)), `${errOf(relQ)} ${errOf(relP)}`);
  await W.setUserFields(P, { status: "ACTIVE" }); // the account's own review ends
}

// ── §11 · the sunset: the final week's top score shares the whole jackpot ───
console.log("\n§11 · the sunset (MR-30, OD-03)");
{
  // A jackpot to share: a no-winner week first.
  const { week: w1, start: s1 } = await W.openWeek({ weeksAhead: ahead++ });
  await sellWeek(w1.id, 50, 0);
  await W.release(w1.id, await W.closeAndSeal(w1, s1));
  const R = (await jackpot())!;
  const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
  const wrong = await W.svc.sunsetMaswali({ weekId: week.id, ownerId: OWNER, typed: "stop", reason: "the product is retired" });
  ok("11.1 · ⛔ the sunset needs its typed words", !wrong.ok);
  const s = await W.svc.sunsetMaswali({ weekId: week.id, ownerId: OWNER, typed: W.svc.SUNSET_WORD, reason: "the product is retired" });
  ok("11.2 · the Owner makes the current week the final week", s.ok && s.week.isFinal === true, errOf(s));
  // ⭐ R9 · A WIDE TIE: 300 tickets score 9 of 10 (they miss slot 1) — thirty players with ten each — and twenty miss two.
  //    No 10 of 10 anywhere, so the 300 share the whole jackpot, paid in bulk inside the one settlement transaction.
  const TOP = 300, EACH = 10, LOW = 20;
  const top = players.slice(100, 100 + TOP / EACH);
  await W.sell(week.id, TOP, W.LOSE, top, EACH);
  await W.sell(week.id, LOW, W.slip("YES", 1).map((x: string, i: number) => (i === 0 ? "NO" : x)), players.slice(100 + TOP / EACH));
  const before = await Promise.all(top.map(bal));
  const at = await W.closeAndSeal(week, start);
  const p = await settle.previewMaswaliSettlement(week.id, at);
  const t0 = Date.now();
  const r = p.ok ? await settle.settleMaswaliWeek({ weekId: week.id, releasedBy: RELEASER, digest: p.preview.digest, now: at }) : p;
  const ms = Date.now() - t0;
  console.log(`      R9 · the release of ${TOP} winners took ${ms} ms on ${STORE}`);
  const a = p.ok ? p.preview.arithmetic : null;
  const J0 = R + (TOP + LOW) * 1_000;
  const F = Math.round(0.13 * J0);
  ok("11.3 · ⭐ the top score (9 of 10) shares the whole jackpot, no floor and no top-up",
    r.ok && p.ok && p.preview.basis === "TOP_SCORE" && p.preview.winningScore === 9 && a?.k === TOP && a?.J === J0 && a?.F === F && a?.U === 0
      && a?.share === Math.floor((J0 - F) / TOP), J(p.ok ? p.preview : p));
  const after = await Promise.all(top.map(bal));
  ok("11.4 · each top player is paid one share per top ticket", after.every((v, i) => v - before[i] === EACH * (a?.share ?? -1)), J(after.map((v, i) => v - before[i])));
  ok("11.5 · the jackpot keeps only the dust", (await jackpot()) === (a?.carryOut ?? -1), `${await jackpot()}`);
  const positions = (await W.w.svc.listPositionsForMarket(week.marketId)) as any[];
  ok("R9.1 · ⭐ the wide tie settles in ONE release: 300 WIN positions at the share, 20 LOSS, every ticket graded",
    r.ok && positions.filter((x) => x.status === "WIN" && x.finalPayout === a?.share).length === TOP && positions.filter((x) => x.status === "LOSS").length === LOW
      && (await dal.ticketStore.listForWeek(week.id)).every((t: any) => t.status === "SETTLED"), `${ms} ms on ${STORE} for ${TOP} winners · ${errOf(r)}`);
  // Every winning ticket keeps its own BET_PAYOUT row, and each player's ten rows step the balance one share at a time.
  const winPositions = new Set(positions.filter((x) => x.status === "WIN").map((x) => x.id));
  let rowsOk = true, stepsOk = true;
  for (const u of top) {
    const rows = ((await W.db.txn.findByUser(u, 200)) as any[]).filter((t) => t.type === "BET_PAYOUT" && winPositions.has(t.positionId));
    if (rows.length !== EACH || new Set(rows.map((t) => t.positionId)).size !== EACH || rows.some((t) => t.amount !== a?.share || t.houseBotId)) rowsOk = false;
    const steps = rows.map((t) => Number(t.balanceAfter)).sort((x, y) => x - y);
    if (steps.some((v, i) => i > 0 && v - steps[i - 1] !== a?.share) || steps[steps.length - 1] !== (await bal(u))) stepsOk = false;
  }
  ok("R9.2 · every winning ticket has its own BET_PAYOUT row on its own position, unmarked (Ruling 232)", rowsOk);
  ok("R9.3 · each player's ten rows step the balance by one share each, ending at the wallet's balance", stepsOk);
  ok("R9.4 · the week mirrors the ledger with 300 winners: S + R + U = F + paid + carry",
    r.ok && r.week.winningTickets === TOP && r.week.salesAtClose + r.week.rolloverIn + r.week.topUp === r.week.fee + r.week.paidTotal + r.week.carryOut, J(r.ok && r.week));
  const twice = await W.release(week.id, at);
  ok("R9.5 · exactly once: a second release pays nothing", twice.ok && twice.already === true && (await Promise.all(top.map(bal))).every((v, i) => v === after[i]));
  const { week: next } = await (async () => {
    const start2 = W.weekStartAhead(ahead++);
    const c = await W.svc.createWeek({ weekStartMs: start2, questions: W.questions(start2), officerId: "usr_mln_drafter", now: new Date(start2 - 3 * 86_400_000) });
    await W.svc.attestParity({ weekId: c.week.id, officerId: "usr_mln_reader" });
    return { week: c.week, start: start2 };
  })();
  const o = await W.svc.openWeek({ weekId: next.id, officerId: "usr_mln_drafter", guarantee: money.guaranteeReader, now: new Date(Date.parse(next.opensAt) + 60_000) });
  ok("11.6 · ⛔ nothing opens after a final week that ran", !o.ok && /has ended/.test(errOf(o)), errOf(o));
}

// ── §12 · the nightly invariants ────────────────────────────────────────────
console.log("\n§12 · the invariants hold over everything above");
{
  const inv = await checkMaswaliInvariants();
  ok("12.1 · ⭐ every pool 0, every week's columns close, the jackpots equal their weeks and forfeits, the guarantee covers", inv.ok, J(inv.problems));
}

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
