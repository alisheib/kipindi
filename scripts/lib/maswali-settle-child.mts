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
 *   R3  · a refused release claims no carry (1.3b, 6.2b, R6.4; on Postgres a late failure, R3.6); the chain is the calendar,
 *         whatever the drafting order (R3.1–R3.2b), and a week due before one already opened never opens (R3.1c); a carry
 *         above the jackpot pays nothing (R3.4)
 *   R4c · the float alert and the returned week carry the committed figures (R4c.1–3)
 *   R6  · a lift waits for a release landing a held share — Compliance's (R6.2) and a forfeit's own (R6.2b); a release holds
 *         only inside the chain lock (R6.5a); a refused release lifts its holds (R6.4); a late duplicate holds nothing and
 *         lifts strays (R6.7, R6.8); the heal lifts a stray hold and nothing else (R6.9, R6.10)
 *   R8  · on Postgres, a forfeit or a hold whose commit fails leaves neither half (R8.1, R8.2)
 *   R9  · the final week's wide tie: 300 winners paid in bulk, the shape counted and the time printed (§11, R9.1–R9.6)
 *   B9  · while a final week is ENDING, an earlier week still runs and a later one is refused (§11, B9.1, B9.2)
 * And S7's own (2026-10-19/21): a missing payee refused before the carry (§4b, 4b.1–4b.3); holds that outlast one section of
 * the chain lock's 30-second transaction yield it between sections, each section re-reading the week and re-placing a hold
 * a lift removed meanwhile (§S7F8, S7F8.0–S7F8.2 — S16's all-held 7,000-winner shape measured on scratch Postgres); and the
 * lifts, their twin: a release refused after its holds lifts them in sections, a lift stopped midway leaves every account
 * whole and the heal finishes it, each hold lifted exactly once (S7F8.3–S7F8.6).
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

// ── §4b · the batched payee pre-read refuses before the memory store's first write ──────────────
console.log("\n§4b · a missing winner wallet aborts the whole release before its carry claim");
{
  const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
  const winners = await sellWeek(week.id, 24, 2);
  const before = await Promise.all(winners.map(bal));
  const poolBefore = await W.balanceOf(acct.pool(week.marketId));
  const jackpotBefore = await jackpot(), guaranteeBefore = await guarantee();
  const at = await W.closeAndSeal(week, start);
  const preview = await settle.previewMaswaliSettlement(week.id, at);
  const realFind = W.db.wallet.findByUserIds;
  W.db.wallet.findByUserIds = async (...args: any[]) =>
    (await realFind.apply(W.db.wallet, args)).filter((wallet: any) => wallet.userId !== winners[1]);
  let refused: any;
  try {
    refused = preview.ok ? await settle.settleMaswaliWeek({ weekId: week.id, releasedBy: RELEASER, digest: preview.preview.digest, now: at }) : preview;
  } finally {
    W.db.wallet.findByUserIds = realFind;
  }
  const still = await dal.weekStore.get(week.id);
  const positions = await W.w.svc.listPositionsForMarket(week.marketId);
  const tickets = await dal.ticketStore.listForWeek(week.id);
  ok("4b.1 · ⛔ a missing payee is refused before the carry or any winner mark is written",
    !refused.ok && /MISSING:/.test(errOf(refused)) && still.state === "RESOLVING" && still.rolloverIn === null
      && positions.every((p: any) => p.status === "OPEN") && tickets.every((t: any) => t.status === "LIVE"),
    J({ refusal: errOf(refused), state: still.state, rolloverIn: still.rolloverIn }));
  ok("4b.2 · ⛔ the refused release leaves both wallets, the pool, jackpot and guarantee unchanged",
    (await Promise.all(winners.map(bal))).every((v, i) => v === before[i])
      && (await W.balanceOf(acct.pool(week.marketId))) === poolBefore
      && (await jackpot()) === jackpotBefore && (await guarantee()) === guaranteeBefore);
  const recovered = await W.release(week.id, at);
  const share = recovered.ok && recovered.preview.arithmetic.kind === "PAYOUT" ? recovered.preview.arithmetic.share : 0;
  ok("4b.3 · the same week then releases once, with one payout and the full share per winner",
    recovered.ok && recovered.week.state === "SETTLED" && share > 0
      && (await Promise.all(winners.map(bal))).every((v, i) => v - before[i] === share), errOf(recovered));
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
  const DAY = 86_400_000;
  const drafted = async (start: number) => {
    const c = await W.svc.createWeek({ weekStartMs: start, questions: W.questions(start), officerId: "usr_mln_drafter", now: new Date(start - 3 * DAY) });
    if (!c.ok) throw new Error(`R3: the draft was refused: ${c.error}`);
    await W.svc.attestParity({ weekId: c.week.id, officerId: "usr_mln_reader", readVersion: await W.svc.readDraftVersion(c.week.id) });
    return c.week;
  };
  const opens = (week: any, now: number) => W.svc.openWeek({ weekId: week.id, officerId: "usr_mln_drafter", guarantee: money.guaranteeReader, now: new Date(now) });

  // (ii) THE CHAIN IS THE CALENDAR: the LATER week is drafted first (the lower seq), the earlier one second. The earlier
  //      opens first, as the calendar says; the later one opens once it has closed, settles only after it, and claims the
  //      carry it rolled.
  const start1 = W.weekStartAhead(ahead++), start2 = W.weekStartAhead(ahead++);
  const due2 = await drafted(start2), due1 = await drafted(start1);
  const o1 = await opens(due1, start1 + 60_000);
  ok("R3.1 · ⭐ the week drafted second but due first opens first: the chain is the calendar, never the drafting order",
    o1.ok && due2.seq < due1.seq, `${errOf(o1)} · seq ${due2.seq} < ${due1.seq}`);
  await sellWeek(due1.id, 10, 0);
  await W.svc.closeWeek({ weekId: due1.id, now: new Date(Date.parse(o1.ok ? o1.week.closesAt : due1.closesAt) + 60_000) });
  const o2 = await opens(due2, start2 + 60_000);
  await sellWeek(due2.id, 10, 1);
  const at1 = await W.closeAndSeal(o1.ok ? o1.week : due1, start1), at2 = await W.closeAndSeal(o2.ok ? o2.week : due2, start2);
  const early = await W.release(due2.id, at2);
  ok("R3.2 · ⛔ …the later week opens once the earlier one closed, and cannot settle before it, whatever order they were drafted in",
    o2.ok && !early.ok && /strictly in order/.test(errOf(early)) && (await dal.weekStore.get(due2.id)).rolloverIn === null, `${errOf(o2)} · ${errOf(early)}`);
  const r1 = await W.release(due1.id, at1);
  const carried = (await jackpot())!;
  const r2 = await W.release(due2.id, at2);
  ok("R3.2b · ⭐ …and once it has, the later week claims the carry the earlier one rolled: the carry flows in calendar order",
    r1.ok && r2.ok && r2.week.state === "SETTLED" && r2.week.rolloverIn === carried && carried >= 10_000, `${errOf(r1)} · ${errOf(r2)} · carried ${carried}`);

  // The guard behind it: a week whose calendar comes BEFORE one that has already opened never opens. It bites only when a
  // later week was opened early and closed early — here, opened nine days ahead and closed at once with nothing sold.
  const startE = W.weekStartAhead(ahead++), startL = W.weekStartAhead(ahead++);
  const dueE = await drafted(startE), dueL = await drafted(startL);
  const oL = await opens(dueL, startE - 2 * DAY);
  const cL = await W.svc.closeWeek({ weekId: dueL.id, early: true, now: new Date(startE - 2 * DAY + 60_000) });
  const oE = await opens(dueE, startE + 60_000);
  ok("R3.1c · ⛔ a week whose calendar comes before one already opened never opens: it would settle after it and claim a carry it may have drawn",
    oL.ok && cL.ok && !oE.ok && /strictly in calendar order/.test(errOf(oE)) && (await dal.weekStore.get(dueE.id)).state === "DRAFT", `${errOf(oL)} · ${errOf(oE)}`);
  const rL = await W.release(dueL.id, await W.closeAndSeal(oL.ok ? oL.week : dueL, startL));
  ok("R3.1d · …and the later week still runs its course: sold nothing, it settles as an empty rollover", rL.ok && rL.week.state === "SETTLED" && rL.week.salesAtClose === 0, errOf(rL));

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
  const { runOutsideLock, withLock } = await import("../../src/lib/server/locks.ts");
  const { addWalletFreeze } = await import("../../src/lib/server/wallet-freeze.ts");
  const { getAuditForTargetDurable, auditFlush } = await import("../../src/lib/server/audit.ts");
  const P = players[157], Q = players[158], P2 = players[159];
  const filler = players.slice(140, 150);
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
  const heldOf = async (u: string) => (((await W.bal(u)).freezeReasons ?? []) as string[]).includes("MILLIONEA_SHARE");
  const buyOne = async (u: string, weekId: string) => {
    const b = await W.buy(u, weekId, [W.WIN]);
    if (!b.ok) throw new Error(`R6: a winner's purchase was refused: ${b.error}`);
  };
  /** A week sold to `buyers` (one winning ticket each) and filled to ten tickets, then closed. */
  const soldWeek = async (buyers: string[]) => {
    const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
    for (const u of buyers) await buyOne(u, week.id);
    await W.sell(week.id, 10 - buyers.length, W.LOSE, filler);
    await W.svc.closeWeek({ weekId: week.id, now: new Date(Date.parse(week.closesAt) + 60_000) });
    return { week, start };
  };
  const wonBy = async (weekId: string, u: string) => (await dal.ticketStore.listForWeek(weekId)).find((t: any) => t.userId === u && t.won);
  const failAt = (act: string) => settle.__setMaswaliSettleSeamsForTests({
    beforeCommit: async (at: string) => { if (at === act) throw new Error(`TEST-FAULT · the ${act} commit fails`); },
  });
  const thrownBy = async (fn: () => Promise<unknown>): Promise<string> => {
    try { await fn(); return ""; } catch (e) { return String((e as Error)?.message ?? e); } finally { settle.__setMaswaliSettleSeamsForTests(null); }
  };

  // Three weeks with one winning ticket of P's each, all bought while P's account was still active.
  const { week: x1, start: s1 } = await soldWeek([P]);
  const { week: x2, start: s2 } = await soldWeek([P]);
  const { week: x3, start: s3 } = await soldWeek([P]);
  await W.setUserFields(P, { status: "SUSPENDED" });
  const r1 = await W.release(x1.id, await W.closeAndSeal(x1, s1));
  const t1 = await wonBy(x1.id, P);
  ok("R6.1 · the first week pays P's share and holds it (MB-43)", r1.ok && r1.preview.held === 1 && t1?.frozenReason === "account suspended" && (await heldOf(P)), errOf(r1));

  // ⭐ THE INTERLEAVE: while the second release holds P's wallet and has not yet paid, Compliance releases the FIRST share.
  const at2 = await W.closeAndSeal(x2, s2);
  const pending: { lift?: Promise<any> } = {};
  settle.__setMaswaliSettleSeamsForTests({
    afterHolds: async () => {
      pending.lift = runOutsideLock(() => settle.releaseMaswaliShare({ ticketId: t1.id, officerId: OWNER, note: "the first review is closed" }));
      await sleep(200);
    },
  });
  let r2: any;
  try { r2 = await W.release(x2.id, at2); } finally { settle.__setMaswaliSettleSeamsForTests(null); }
  const lifted = pending.lift ? await pending.lift : null;
  const t2 = await wonBy(x2.id, P);
  ok("R6.2 · ⭐ the lift waited for the release: the first share released, the second landed held, and P's wallet STILL held (MB-43)",
    r2?.ok && lifted?.ok && (await dal.ticketStore.get(t1.id)).frozenReason === null && t2?.frozenReason === "account suspended" && (await heldOf(P))
      && (await W.bal(P)).status === "FROZEN", J({ r2: r2 ? errOf(r2) : "none", lifted, t2: t2?.frozenReason, wallet: await W.bal(P) }));

  // ⭐ THE LIFT'S OWN LOCK: a forfeit of the second share has committed and is about to lift — its lift runs once every
  //    other lock of the forfeit is gone — just as the third release lands another held share for P.
  const at3 = await W.closeAndSeal(x3, s3);
  let openLift!: () => void;
  const liftGate = new Promise<void>((res) => { openLift = res; });
  const paused: { forfeit?: boolean } = {};
  settle.__setMaswaliSettleSeamsForTests({
    beforeLift: async () => { paused.forfeit = true; await liftGate; },
    afterHolds: async () => { openLift(); await sleep(200); },
  });
  let forfeiting: Promise<any> | undefined, r3: any;
  try {
    forfeiting = settle.forfeitMaswaliShare({ ticketId: t2.id, officerId: OWNER, typed: settle.FORFEIT_SHARE_WORD, reason: "duplicate identity proven" });
    for (let i = 0; i < 100 && !paused.forfeit; i++) await sleep(20);
    r3 = await W.release(x3.id, at3);
  } finally {
    openLift();
    settle.__setMaswaliSettleSeamsForTests(null);
  }
  const forfeited = forfeiting ? await forfeiting : null;
  const t3 = await wonBy(x3.id, P);
  ok("R6.2b · ⭐ a forfeit's lift waited for the release landing a held share: the old share forfeited, the new one held, P's wallet STILL held",
    paused.forfeit === true && forfeited?.ok && r3?.ok && String((await dal.ticketStore.get(t2.id)).frozenReason).startsWith("forfeited · ")
      && t3?.frozenReason === "account suspended" && (await heldOf(P)) && (await W.bal(P)).status === "FROZEN",
    J({ paused: paused.forfeit, forfeited, r3: r3 ? errOf(r3) : "none", t3: t3?.frozenReason, wallet: await W.bal(P) }));
  const rel3 = await settle.releaseMaswaliShare({ ticketId: t3.id, officerId: OWNER, note: "the third review is closed" });
  ok("R6.3 · control: releasing the last held share lifts the hold", rel3.ok && !(await heldOf(P)) && (await W.bal(P)).status === "ACTIVE", errOf(rel3));

  // A release refused AFTER its hold: the hold is lifted again (R6), and no carry is claimed (R3).
  await W.setUserFields(P, { status: "ACTIVE" });
  const { week: x4, start: s4 } = await soldWeek([P, Q]);
  await W.setUserFields(P, { status: "SUSPENDED" });
  const at4 = await W.closeAndSeal(x4, s4);
  const p4 = await settle.previewMaswaliSettlement(x4.id, at4);
  // ⚠️ A FAULT THE PRODUCT CANNOT PRODUCE, DECLARED (as §6): the guarantee drained below the top-up after the preview.
  const g4 = (await guarantee())!;
  await money.postMaswaliLines(`test_drain_r6_${x4.id}`, ledger.maswaliGuaranteeReturnEntries({ amount: g4 - 1, reference: "TEST-FAULT", actorId: OWNER }), null);
  const balP = await bal(P), balQ = await bal(Q);
  const short = p4.ok ? await settle.settleMaswaliWeek({ weekId: x4.id, releasedBy: RELEASER, digest: p4.preview.digest, now: at4 }) : p4;
  const w4 = await dal.weekStore.get(x4.id);
  ok("R6.4 · ⭐ a release refused after its hold lifts that hold again — no hold stands with no held share — and claims no carry (R3)",
    !short.ok && /guarantee holds less/.test(errOf(short)) && !(await heldOf(P)) && (await W.bal(P)).status === "ACTIVE" && (await bal(P)) === balP
      && w4.state === "RESOLVING" && w4.rolloverIn === null, J({ e: errOf(short), wallet: await W.bal(P), rolloverIn: w4.rolloverIn }));
  const refill = await money.fundMaswaliGuarantee({ amount: FUND * 2, reference: "TEST-RAIL-0003", typed: money.GUARANTEE_FUND_WORD, ownerId: OWNER });
  if (W.onPostgres) {
    // On the store that rolls back: the release fails at its last statement — after the claim, every credit and the stamp.
    failAt("release");
    const thrown = await thrownBy(() => W.release(x4.id, at4));
    const w4b = await dal.weekStore.get(x4.id);
    ok("R3.6 · ⭐ (Postgres) a release that fails at its last statement leaves no carry claimed, nothing paid, and no hold standing (R6)",
      /TEST-FAULT/.test(thrown) && w4b.state === "RESOLVING" && w4b.rolloverIn === null && (await bal(P)) === balP && (await bal(Q)) === balQ && !(await heldOf(P))
        && (await dal.ticketStore.listForWeek(x4.id)).every((t: any) => t.status === "LIVE"), J({ thrown, rolloverIn: w4b.rolloverIn, wallet: await W.bal(P) }));
  }
  // ⭐ …and the release places its hold only once IT holds the chain lock: while another act holds that lock, P's wallet
  //    is untouched — so no lift can run between a hold and the commit of its share (the other half of the interleave).
  const waiting: { release?: Promise<any> } = {};
  let untouched = false;
  await withLock(W.svc.MASWALI_CHAIN_LOCK, async () => {
    waiting.release = runOutsideLock(() => W.release(x4.id, at4));
    await sleep(400);
    untouched = !(await heldOf(P));
  });
  const r4 = await waiting.release!;
  ok("R6.5a · ⭐ a release places its hold only inside the chain lock: while another act holds that lock, the winner's wallet is untouched",
    untouched && r4?.ok && (await heldOf(P)), `untouched ${untouched} · ${r4 ? errOf(r4) : "no release"}`);
  const t4 = await wonBy(x4.id, P), tq = await wonBy(x4.id, Q);
  ok("R6.5 · control: funded again, the week settles once — both paid, P's share held again, Q's free, the carry claimed",
    refill.ok && r4?.ok && r4.week.state === "SETTLED" && r4.week.rolloverIn != null && t4?.frozenReason === "account suspended" && tq?.frozenReason === null
      && (await heldOf(P)) && !(await heldOf(Q)), r4 ? errOf(r4) : "no release");

  // ⭐ THE HEAL: a stray hold — Q's wallet held with no held share behind it — is lifted; P's, with its held share, stands.
  // ⚠️ A FAULT THE PRODUCT CANNOT PRODUCE WITHOUT A STOPPED PROCESS, DECLARED: the hold placed directly, with no share.
  await addWalletFreeze(Q, "MILLIONEA_SHARE", { actorId: null, note: "TEST-FAULT · a stray hold, as a stopped process leaves" });
  const strayBefore = await heldOf(Q);
  const healed = await settle.healStrayMillioneaHolds();
  ok("R6.9 · ⭐ the heal lifts a Millionea hold with no held share behind it, and leaves a held share's hold standing",
    strayBefore && healed.lifted.includes(Q) && !healed.lifted.includes(P) && !(await heldOf(Q)) && (await W.bal(Q)).status === "ACTIVE" && (await heldOf(P)),
    J({ healed, Q: await W.bal(Q) }));
  const healedAgain = await settle.healStrayMillioneaHolds();
  ok("R6.10 · …and a second heal finds nothing to lift: a held share's hold is never a stray", healedAgain.lifted.length === 0 && (await heldOf(P)), J(healedAgain));

  if (W.onPostgres) {
    // R8 · a forfeit whose commit fails: neither half lands.
    const j0 = await jackpot(), b0 = await bal(P);
    failAt("forfeit");
    const thrown = await thrownBy(() => settle.forfeitMaswaliShare({ ticketId: t4.id, officerId: OWNER, typed: settle.FORFEIT_SHARE_WORD, reason: "duplicate identity proven" }));
    const t4b = await dal.ticketStore.get(t4.id);
    ok("R8.1 · ⭐ (Postgres) a forfeit whose commit fails leaves the share held, the wallet whole and the jackpot unmoved — never 'forfeited' with nothing debited",
      /TEST-FAULT/.test(thrown) && t4b.frozenReason === "account suspended" && (await bal(P)) === b0 && (await jackpot()) === j0 && (await heldOf(P)),
      J({ thrown, reason: t4b.frozenReason }));
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
  const relP = await settle.releaseMaswaliShare({ ticketId: t4.id, officerId: OWNER, note: "the account's review is closed" });
  ok("R6.6 · control: each release lifts its own player's hold", relQ.ok && relP.ok && !(await heldOf(Q)) && !(await heldOf(P)), `${errOf(relQ)} ${errOf(relP)}`);

  // ⭐ THE LATE DUPLICATE: a second release of one week read it RESOLVING before the first committed, and reaches the chain
  //    lock only after the first settled it and Compliance released both held shares, while P2's wallet carries a stray
  //    hold (declared below). The duplicate must answer `already`, place no hold of its own, and leave both wallets free.
  await W.setUserFields(P, { status: "ACTIVE" });
  const { week: x5, start: s5 } = await soldWeek([P, P2]);
  await W.setUserFields(P, { status: "SUSPENDED" });
  await W.setUserFields(P2, { status: "SUSPENDED" });
  const at5 = await W.closeAndSeal(x5, s5);
  let resume!: () => void;
  const gate = new Promise<void>((res) => { resume = res; });
  const waited: { duplicate?: boolean } = {};
  settle.__setMaswaliSettleSeamsForTests({ beforeChain: async () => { if (!waited.duplicate) { waited.duplicate = true; await gate; } } });
  let duplicate: Promise<any> | undefined, firstRelease: any;
  try {
    duplicate = W.release(x5.id, at5);
    for (let i = 0; i < 100 && !waited.duplicate; i++) await sleep(20);
    firstRelease = await W.release(x5.id, at5);
  } finally {
    settle.__setMaswaliSettleSeamsForTests(null);
  }
  const tp = await wonBy(x5.id, P), tp2 = await wonBy(x5.id, P2);
  const relp = await settle.releaseMaswaliShare({ ticketId: tp.id, officerId: OWNER, note: "the review is closed" });
  const relp2 = await settle.releaseMaswaliShare({ ticketId: tp2.id, officerId: OWNER, note: "the review is closed" });
  // ⚠️ A FAULT THE PRODUCT CANNOT PRODUCE WITHOUT A STOPPED PROCESS, DECLARED: P2's wallet held again, with no share behind it.
  await addWalletFreeze(P2, "MILLIONEA_SHARE", { actorId: null, note: "TEST-FAULT · a stray hold, as a stopped process leaves" });
  resume();
  const dup = duplicate ? await duplicate : null;
  await auditFlush();
  const holdsForP = (await getAuditForTargetDurable("User", P, { limit: 200 })).entries
    .filter((e: any) => e.action === "wallet.freeze_added" && String(e.payload?.note ?? "").startsWith(`Millionea ${x5.code} ·`));
  ok("R6.7 · ⭐ a duplicate release that waited behind the first answers `already` and places no hold of its own (the week re-read under the chain lock)",
    waited.duplicate === true && firstRelease?.ok && !firstRelease.already && dup?.ok && dup.already === true && holdsForP.length === 1,
    J({ first: firstRelease ? errOf(firstRelease) || "ok" : "none", dup: dup ? (dup.ok ? { already: dup.already } : dup.error) : "none", holdsForP: holdsForP.length }));
  ok("R6.8 · ⭐ …and its `already` answer lifts every hold of its winners with no held share behind it: both wallets end unfrozen",
    relp.ok && relp2.ok && !(await heldOf(P)) && !(await heldOf(P2)) && (await W.bal(P)).status === "ACTIVE" && (await W.bal(P2)).status === "ACTIVE",
    J({ P: await W.bal(P), P2: await W.bal(P2) }));
  await W.setUserFields(P, { status: "ACTIVE" }); // the accounts' own reviews end
  await W.setUserFields(P2, { status: "ACTIVE" });
}

// ── S7-F8 · a release whose holds outlast one section of the chain lock (MB-43, R6; the lock's 30-second budget) ────
// On Postgres every hold is its own committed write placed while the release holds `maswali:chain`, and that lock is a
// transaction with a 30-second budget: S16 measured a few thousand held winners overrunning it (the release rolled back,
// nothing paid). So the holds yield the lock between sections, and each section re-reads what the last one held — a lift
// may run while the lock is let go. `holdSectionMs: 0` makes every section place ONE hold and the money take a section of
// its own, so three held winners show it here.
console.log("\n§S7F8 · the holds in sections of the chain lock: each section re-reads the week and the holds before it, and the week pays once");
{
  const { getAuditForTargetDurable, auditFlush } = await import("../../src/lib/server/audit.ts");
  const heldOf = async (u: string) => (((await W.bal(u)).freezeReasons ?? []) as string[]).includes("MILLIONEA_SHARE");
  /** A week with three winners whose accounts are suspended after their purchase (held) and one free winner. */
  const heldWeek = async () => {
    const H = [await W.user({ balance: 200_000 }), await W.user({ balance: 200_000 }), await W.user({ balance: 200_000 })];
    const F = await W.user({ balance: 200_000 });
    const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
    for (const u of [...H, F]) {
      const b = await W.buy(u, week.id, [W.WIN]);
      if (!b.ok) throw new Error(`S7F8: a winner's purchase was refused: ${b.error}`);
    }
    await W.sell(week.id, 6, W.LOSE, players.slice(140, 150));
    for (const u of H) await W.setUserFields(u, { status: "SUSPENDED" });
    return { week, at: await W.closeAndSeal(week, start), H, F };
  };
  const outcome = async (weekId: string, H: string[], F: string, before: number[], r: any) => {
    const tickets = await dal.ticketStore.listForWeek(weekId);
    const ticketOf = (u: string) => tickets.find((t: any) => t.userId === u && t.won);
    const share = r.ok && r.preview?.arithmetic?.kind === "PAYOUT" ? r.preview.arithmetic.share : 0;
    const gained = (await Promise.all([...H, F].map(bal))).map((v, i) => v - before[i]);
    return {
      settled: r.ok === true && r.week?.state === "SETTLED" && r.preview?.held === 3 && share > 0,
      sharesHeld: H.every((u) => ticketOf(u)?.frozenReason === "account suspended") && ticketOf(F)?.frozenReason === null,
      walletsHeld: await Promise.all(H.map(heldOf)), freeHeld: await heldOf(F),
      paidOnce: gained.every((g) => g === share), share, gained,
    };
  };

  // Control: the same shape on the default section budget — three holds fit one section, as every release so far.
  {
    const { week, at, H, F } = await heldWeek();
    const before = await Promise.all([...H, F].map(bal));
    const sections: number[] = [];
    settle.__setMaswaliSettleSeamsForTests({ betweenHoldSections: async (n: number) => { sections.push(n); } });
    let r: any;
    try { r = await W.release(week.id, at); } finally { settle.__setMaswaliSettleSeamsForTests(null); }
    const o = await outcome(week.id, H, F, before, r);
    ok("S7F8.0 · control: three held winners' holds fit ONE section of the chain lock, and the week pays as it always did",
      sections.length === 0 && o.settled && o.sharesHeld && o.walletsHeld.every(Boolean) && !o.freeHeld && o.paidOnce, J({ r: errOf(r), sections, o }));
    for (const u of H) await W.setUserFields(u, { status: "ACTIVE" });
  }

  const { week, at, H, F } = await heldWeek();
  const before = await Promise.all([...H, F].map(bal));
  const sections: number[] = [];
  const healed: string[][] = [];
  settle.__setMaswaliSettleSeamsForTests({
    holdSectionMs: 0,
    betweenHoldSections: async (n: number) => {
      sections.push(n);
      // ⭐ A LIFT WHILE THE LOCK IS LET GO: the heal runs between the first two sections. The first section's hold has no
      //    held share behind it yet (none has landed), so the heal lifts it — as it must for a real stray.
      if (n === 1) healed.push((await settle.healStrayMillioneaHolds()).lifted);
    },
  });
  let r: any;
  try { r = await W.release(week.id, at); } finally { settle.__setMaswaliSettleSeamsForTests(null); }
  const o = await outcome(week.id, H, F, before, r);
  // One hold a section, in the week's ticket order: the first (yield 1; the heal lifts it), the same again (yield 2), the
  // second (yield 3), the third (yield 4), then the money in a section of its own.
  ok("S7F8.1 · ⭐ holds that outlast a section let the chain lock go between sections, four times, and the week still settles once: every held share landed held, every held wallet held, the free winner paid free",
    J(sections) === J([1, 2, 3, 4]) && o.settled && o.sharesHeld && o.walletsHeld.every(Boolean) && !o.freeHeld && o.paidOnce,
    J({ r: errOf(r), sections, o }));
  await auditFlush();
  const trail = async (u: string) => {
    const rows = (await getAuditForTargetDurable("User", u, { limit: 200 })).entries
      .filter((e: any) => String(e.payload?.reason) === "MILLIONEA_SHARE");
    return { added: rows.filter((e: any) => e.action === "wallet.freeze_added").length, removed: rows.filter((e: any) => e.action === "wallet.freeze_removed").length };
  };
  const trails = await Promise.all(H.map(trail));
  const liftedByHeal = H.filter((u) => healed[0]?.includes(u));
  ok("S7F8.2 · ⭐ the hold a lift removed between two sections was read again under the next section's lock and placed again before the money (R6): the lifted winner's trail is two holds and one lift, each other held winner's one hold",
    healed.length === 1 && liftedByHeal.length === 1
      && H.every((u, i) => (u === liftedByHeal[0] ? trails[i].added === 2 && trails[i].removed === 1 : trails[i].added === 1 && trails[i].removed === 0)),
    J({ healed, trails }));
  for (const u of H) await W.setUserFields(u, { status: "ACTIVE" }); // the accounts' own reviews end

  // ── THE LIFTS IN SECTIONS (the holds' twin): a release refused AFTER its holds lifts them again, section by section of
  //    the chain lock; a lift that stops midway leaves every account whole, and the heal finishes it, each hold lifted once.
  //    ⚠️ A FAULT THE PRODUCT CANNOT PRODUCE, DECLARED (as R6.4): the guarantee drained below the week's top-up after the
  //    preview, so the release refuses in its money — after every hold is placed. One week carries all four acts (MR-3: a
  //    later week could not even start while this one is unsettled).
  {
    const x = await heldWeek();
    const balances = await Promise.all([...x.H, x.F].map(bal));
    const g = (await guarantee())!;
    if (g > 1) await money.postMaswaliLines(`test_drain_s7f8_${x.week.id}`, ledger.maswaliGuaranteeReturnEntries({ amount: g - 1, reference: "TEST-FAULT", actorId: OWNER }), null);
    const untouched = async () => J(await Promise.all([...x.H, x.F].map(bal))) === J(balances)
      && (await dal.weekStore.get(x.week.id)).state === "RESOLVING" && (await dal.weekStore.get(x.week.id)).rolloverIn === null;
    const freed = async () => Promise.all(x.H.map(async (u) => !(await heldOf(u)) && (await W.bal(u)).status === "ACTIVE"));

    const liftSections: number[] = [];
    settle.__setMaswaliSettleSeamsForTests({ holdSectionMs: 0, betweenLiftSections: async (n: number) => { liftSections.push(n); } });
    let r1: any;
    try { r1 = await W.release(x.week.id, x.at); } finally { settle.__setMaswaliSettleSeamsForTests(null); }
    await auditFlush();
    const t1 = await Promise.all(x.H.map(trail));
    ok("S7F8.3 · ⭐ a release refused after its holds lifts them again in sections of the chain lock (one account a section here): every held wallet free, each hold placed once and lifted once, nothing paid",
      !r1.ok && /guarantee holds less/.test(errOf(r1)) && J(liftSections) === J([1, 2]) && (await freed()).every(Boolean)
        && t1.every((y) => y.added === 1 && y.removed === 1) && (await untouched()),
      J({ refusal: errOf(r1), liftSections, trails: t1 }));

    settle.__setMaswaliSettleSeamsForTests({
      holdSectionMs: 0,
      betweenLiftSections: async (n: number) => { if (n === 1) throw new Error("TEST-FAULT · the process stops midway through the lifts"); },
    });
    let r2: any;
    try { r2 = await W.release(x.week.id, x.at); } finally { settle.__setMaswaliSettleSeamsForTests(null); }
    const stopped = await freed();
    await auditFlush();
    const t2 = await Promise.all(x.H.map(trail));
    ok("S7F8.4 · ⭐ a lift that stops after its first section leaves every account whole — lifted and recorded, or still held — never half, and nothing paid",
      !r2.ok && stopped.filter(Boolean).length === 1
        && x.H.every((_, i) => t2[i].added === 2 && t2[i].removed === (stopped[i] ? 2 : 1)) && (await untouched()),
      J({ refusal: errOf(r2), stopped, trails: t2 }));

    const healedNow = await settle.healStrayMillioneaHolds();
    await auditFlush();
    const t3 = await Promise.all(x.H.map(trail));
    const leftHeld = x.H.filter((_, i) => !stopped[i]);
    ok("S7F8.5 · ⭐ …and the heal lifts exactly the rest: no wallet left frozen, each hold lifted exactly once (two holds, two lifts each)",
      leftHeld.length === 2 && leftHeld.every((u) => healedNow.lifted.includes(u)) && x.H.filter((_, i) => stopped[i]).every((u) => !healedNow.lifted.includes(u))
        && (await freed()).every(Boolean) && t3.every((y) => y.added === 2 && y.removed === 2),
      J({ healed: healedNow.lifted, trails: t3 }));

    const refill = await money.fundMaswaliGuarantee({ amount: FUND * 2, reference: "TEST-RAIL-S7F8", typed: money.GUARANTEE_FUND_WORD, ownerId: OWNER });
    const r4 = await W.release(x.week.id, x.at);
    await auditFlush();
    const t4 = await Promise.all(x.H.map(trail));
    const o4 = await outcome(x.week.id, x.H, x.F, balances, r4);
    ok("S7F8.6 · control: refilled, the same week settles once — its held shares landing held, its holds placed a third time, each lifted twice before",
      refill.ok && o4.settled && o4.sharesHeld && o4.walletsHeld.every(Boolean) && !o4.freeHeld && o4.paidOnce
        && t4.every((y) => y.added === 3 && y.removed === 2),
      J({ r4: errOf(r4), o4, trails: t4 }));
    for (const u of x.H) await W.setUserFields(u, { status: "ACTIVE" });
  }
}

// ── §11 · the sunset: the final week's top score shares the whole jackpot ───
console.log("\n§11 · the sunset (MR-30, OD-03)");
{
  const DAY = 86_400_000;
  const drafted = async (start: number) => {
    const c = await W.svc.createWeek({ weekStartMs: start, questions: W.questions(start), officerId: "usr_mln_drafter", now: new Date(start - 3 * DAY) });
    if (!c.ok) throw new Error(`§11: the draft was refused: ${c.error}`);
    await W.svc.attestParity({ weekId: c.week.id, officerId: "usr_mln_reader", readVersion: await W.svc.readDraftVersion(c.week.id) });
    return c.week;
  };
  const opens = (w: any, now: number) => W.svc.openWeek({ weekId: w.id, officerId: "usr_mln_drafter", guarantee: money.guaranteeReader, now: new Date(now) });
  // A jackpot to share: a no-winner week first.
  const { week: w1, start: s1 } = await W.openWeek({ weeksAhead: ahead++ });
  await sellWeek(w1.id, 50, 0);
  await W.release(w1.id, await W.closeAndSeal(w1, s1));
  // ⭐ B9 · The final week is DRAFTED a full week ahead (OD-03's notice). A week whose calendar comes BEFORE it still runs;
  //    only one after it is refused.
  const startE = W.weekStartAhead(ahead++), startF = W.weekStartAhead(ahead++), startG = W.weekStartAhead(ahead++);
  const finalDraft = await drafted(startF);
  const wrong = await W.svc.sunsetMaswali({ weekId: finalDraft.id, ownerId: OWNER, typed: "stop", reason: "the product is retired" });
  ok("11.1 · ⛔ the sunset needs its typed words", !wrong.ok);
  const s = await W.svc.sunsetMaswali({ weekId: finalDraft.id, ownerId: OWNER, typed: W.svc.SUNSET_WORD, reason: "the product is retired" });
  ok("11.2 · the Owner makes a drafted week the final week, a full week ahead (OD-03)", s.ok && s.week.isFinal === true, errOf(s));
  const beforeFinal = await drafted(startE), afterFinal = await drafted(startG);
  const refused = await opens(afterFinal, startG + 60_000);
  ok("B9.2 · ⛔ while the final week is ENDING, a week whose calendar comes after it is refused",
    !refused.ok && /final week; nothing opens after it/.test(errOf(refused)), errOf(refused));
  const oE = await opens(beforeFinal, startE + 60_000);
  if (oE.ok) await sellWeek(beforeFinal.id, 10, 0);
  const rE = oE.ok ? await W.release(beforeFinal.id, await W.closeAndSeal(oE.week, startE)) : oE;
  ok("B9.1 · ⭐ …and a week whose calendar comes BEFORE it, drafted beside it, still opens, sells and settles",
    oE.ok && rE.ok && rE.week.state === "SETTLED", errOf(rE));
  const R = (await jackpot())!;
  const oF = await opens(finalDraft, startF + 60_000);
  if (!oF.ok) throw new Error(`§11: the final week did not open: ${oF.error}`);
  const week = oF.week, start = startF;
  // ⭐ R9 · A WIDE TIE: 300 tickets score 9 of 10 (they miss slot 1) — thirty players with ten each — and twenty miss two.
  //    No 10 of 10 anywhere, so the 300 share the whole jackpot, paid in bulk inside the one settlement transaction.
  const TOP = 300, EACH = 10, LOW = 20;
  const top = players.slice(100, 100 + TOP / EACH);
  await W.sell(week.id, TOP, W.LOSE, top, EACH);
  await W.sell(week.id, LOW, W.slip("YES", 1).map((x: string, i: number) => (i === 0 ? "NO" : x)), players.slice(100 + TOP / EACH));
  const before = await Promise.all(top.map(bal));
  const at = await W.closeAndSeal(week, start);
  const p = await settle.previewMaswaliSettlement(week.id, at);
  // ⭐ R9 · THE BULK SHAPE, counted on the store's own calls: one position update, one credit of 30 players, one
  //    insert of 300 ticket payout rows, and no direct per-player wallet adjustment from settlement. The memory DAL's
  //    implementation of creditMany may call adjust internally; that is one store call, not 30 settlement calls.
  const ps = W.w.mdal.positionStore, wal = W.db.wallet;
  const calls = { winners: 0, winnerIds: 0, sets: 0, adjusts: 0, credits: 0, creditUsers: 0, inserts: 0, payoutRows: 0 };
  let insideCreditMany = false; // the memory DAL implements its one bulk call using adjust internally
  const realWinners = ps.settleMaswaliWinners, realSet = ps.set, realAdjust = wal.adjust;
  const realCredit = wal.creditMany, realTxnMany = W.db.txn.createMany;
  ps.settleMaswaliWinners = (...args: any[]) => { calls.winners++; calls.winnerIds += args[1].length; return realWinners.apply(ps, args); };
  ps.set = (...args: any[]) => { calls.sets++; return realSet.apply(ps, args); };
  wal.adjust = (...args: any[]) => { if (!insideCreditMany) calls.adjusts++; return realAdjust.apply(wal, args); };
  wal.creditMany = async (...args: any[]) => {
    calls.credits++; calls.creditUsers += args[0].length;
    insideCreditMany = true;
    try { return await realCredit.apply(wal, args); }
    finally { insideCreditMany = false; }
  };
  W.db.txn.createMany = (...args: any[]) => { calls.inserts++; calls.payoutRows += args[0].length; return realTxnMany.apply(W.db.txn, args); };
  const t0 = Date.now();
  let r: any;
  try {
    r = p.ok ? await settle.settleMaswaliWeek({ weekId: week.id, releasedBy: RELEASER, digest: p.preview.digest, now: at }) : p;
  } finally {
    ps.settleMaswaliWinners = realWinners; ps.set = realSet; wal.adjust = realAdjust; wal.creditMany = realCredit; W.db.txn.createMany = realTxnMany;
  }
  const ms = Date.now() - t0;
  console.log(`      R9 · the release of ${TOP} winners took ${ms} ms on ${STORE}`);
  ok("R9.6 · ⭐ the bulk shape, counted: one position update, one 30-player credit, one 300-row payout insert, no direct per-player adjusts",
    r.ok && calls.winners === 1 && calls.winnerIds === TOP && calls.sets === 0 && calls.adjusts === 0
      && calls.credits === 1 && calls.creditUsers === TOP / EACH && calls.inserts === 1 && calls.payoutRows === TOP, J(calls));
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
  const o = await opens(afterFinal, startG + 60_000);
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
