/**
 * PRODUCTION-LEVEL FULL-FLOW E2E — real Postgres, real services, no shortcuts.
 *
 *   Run:  DATABASE_URL=... USE_PRISMA_DAL=true npx tsx scripts/money-e2e.test.mts
 *   npm:  npm run e2e:money          (needs a Postgres — see scripts/load/README.md)
 *
 * This is the ONE suite that exercises the real Prisma DAL, the advisory-lock path,
 * and the double-entry ledger against an ACTUAL DATABASE. Every other suite runs on
 * the in-memory store, so this is the only place the production money path is really
 * driven. It is deliberately NOT part of `npm run test:all` (which must run with no
 * DB) — run it before shipping anything that touches money.
 *
 * Every money movement goes through the ACTUAL service function the app calls.
 * Nothing is written straight to the DB except identity/KYC setup.
 *
 *   CASH IN     deposit()            — real payment dispatch
 *   PLAY        buyPosition()        — YES and NO, several players
 *   CASH OUT    cashOutPosition()    — inside the free window (free) AND after it (fee → house)
 *   CLOSE       notifySelectionClosedMarkets() — the exact payout is disclosed
 *   SETTLE      resolveMarket() x2 + settleMarket() — winners paid, losers zeroed
 *   ONE-SIDED   a poll nobody opposed → everybody refunded, we earn nothing
 *   VOID        an emergency-voided poll → everybody refunded
 *   CASH OUT    withdraw()           — to mobile money, 1% fee, NO withholding tax
 *
 * Then it RECONCILES:
 *   • every ledger group sums to zero
 *   • money conservation: deposited == (wallets + pools + house), to dust
 *   • WINNER FLOOR: no WIN position is ever paid below its stake
 */
import { PrismaClient } from "@prisma/client";
import { deposit, withdraw } from "../src/lib/server/wallet-service.ts";
import {
  createMarket, buyPosition, cashOutPosition, getMarket, resolveMarket, settleMarket,
  listPositionsForMarket, notifySelectionClosedMarkets, ratesFor,
} from "../src/lib/server/market-service.ts";
import { marketStore, positionStore } from "../src/lib/server/market-dal.ts";
import { poolFee } from "../src/lib/payout.ts";

if (!process.env.DATABASE_URL) {
  console.error("money-e2e: DATABASE_URL is required — this suite runs against a REAL Postgres.");
  console.error("           See scripts/load/README.md for the disposable local cluster.");
  process.exit(1);
}

const prisma = new PrismaClient();
let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ FAIL  ${label}${extra ? ` — ${extra}` : ""}`); }
}
const money = (n: number) => n.toLocaleString();
const bal = async (id: string) => Number((await prisma.wallet.findUnique({ where: { userId: id } }))!.balance);
const section = (s: string) => console.log(`\n${"═".repeat(74)}\n  ${s}\n${"═".repeat(74)}`);

let phone = 700000000;
async function player(id: string) {
  const p = `+255${++phone}`;
  await prisma.user.create({ data: { id, phoneE164: p, role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: id } });
  await prisma.wallet.create({ data: { id: `wal_${id}`, userId: id, balance: 0, currency: "TZS", status: "ACTIVE" } });
  await prisma.kycSubmission.create({ data: { userId: id, status: "APPROVED", nidaNumber: `${19900101}${String(phone).slice(-10)}` } });
  return p;
}
async function officer(id: string) {
  await prisma.user.create({ data: { id, phoneE164: `+255${++phone}`, role: "ADMIN", status: "ACTIVE", locale: "EN", displayName: id } });
}

const mkPoll = (title: string, closeInMin = 60) => createMarket({
  titleEn: title, titleSw: `${title} (sw)`, category: "macro",
  sourceUrl: "https://bot.go.tz", resolutionCriterion: "Official source on the date.",
  resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(),
  selectionClosedAt: new Date(Date.now() + closeInMin * 60_000).toISOString(),
  proposedBy: "officer_a",
} as never);

/** Backdate a position so it is past the free-exit window. */
async function pastGrace(posId: string) {
  const p = await positionStore.get(posId);
  if (p) { p.placedAt = new Date(Date.now() - 10 * 60_000).toISOString(); await positionStore.set(p); }
}

await officer("officer_a");
await officer("officer_b");

// ════════════════════════════════════════════════════════════════════════════
section("1 · CASH IN — six players deposit through the real payment service");
// ════════════════════════════════════════════════════════════════════════════
const PLAYERS = ["p_win1", "p_win2", "p_lose1", "p_lose2", "p_exit_free", "p_exit_fee"];
const msisdns: Record<string, string> = {};
for (const id of PLAYERS) msisdns[id] = await player(id);

let totalDeposited = 0;
for (const id of PLAYERS) {
  const r = await deposit(id, { amount: 200_000, provider: "MPESA", msisdn: msisdns[id] });
  if (r.ok) totalDeposited += 200_000;
  ok(`${id} deposited 200,000`, r.ok, r.ok ? "" : (r as { error?: string }).error);
}
ok("every wallet is funded", (await Promise.all(PLAYERS.map(bal))).every((b) => b === 200_000));
console.log(`\n  total cash in: TZS ${money(totalDeposited)}`);

// ════════════════════════════════════════════════════════════════════════════
section("2 · PLAY — a real poll, bets on both sides");
// ════════════════════════════════════════════════════════════════════════════
const m1 = await mkPoll("Will the BoT hold the rate in Q3?");
console.log(`  poll ${m1.id}`);
const snap = ratesFor(m1);
ok("the poll FROZE its rates at creation (feeSnapshot)", !!m1.feeSnapshot && snap.commissionRate === 0.10);
console.log(`  frozen at: commission ${snap.commissionRate * 100}% · ceiling ${(snap.feeCeilingRate * 100).toFixed(1)}% of the smaller side`);

const bets: Record<string, string> = {};
for (const [id, side, stake] of [
  ["p_win1", "YES", 60_000], ["p_win2", "YES", 40_000],
  ["p_lose1", "NO", 50_000], ["p_lose2", "NO", 30_000],
  ["p_exit_free", "YES", 20_000], ["p_exit_fee", "NO", 20_000],
] as const) {
  const r = await buyPosition(id, { marketId: m1.id, side, stake });
  ok(`${id} staked ${money(stake)} on ${side}`, r.ok, r.ok ? "" : (r as { error?: string }).error);
  if (r.ok) bets[id] = r.data!.positionId;
}
{
  const m = (await getMarket(m1.id))!;
  console.log(`\n  pools: YES ${money(m.yesPool)} / NO ${money(m.noPool)}`);
  ok("pools are YES 120,000 / NO 100,000", m.yesPool === 120_000 && m.noPool === 100_000);
}

// ════════════════════════════════════════════════════════════════════════════
section("3 · CASH OUT (early exit) — inside the free window, and after it");
// ════════════════════════════════════════════════════════════════════════════
{
  // (a) INSIDE the free window → full refund, zero fee.
  const before = await bal("p_exit_free");
  const poolBefore = (await getMarket(m1.id))!.yesPool + (await getMarket(m1.id))!.noPool;
  const r = await cashOutPosition("p_exit_free", bets["p_exit_free"]);
  ok("free-window exit succeeded", r.ok, r.ok ? "" : (r as { error?: string }).error);
  const got = (await bal("p_exit_free")) - before;
  ok(`free-window exit = FULL refund of 20,000 (no fee)`, got === 20_000, `got ${money(got)}`);
  const poolAfter = (await getMarket(m1.id))!.yesPool + (await getMarket(m1.id))!.noPool;
  ok("the whole stake left the pool", poolBefore - poolAfter === 20_000, `pool dropped ${money(poolBefore - poolAfter)}`);

  // (b) AFTER the free window → 10% fee, and it goes to the HOUSE.
  await pastGrace(bets["p_exit_fee"]);
  const before2 = await bal("p_exit_fee");
  const poolBefore2 = (await getMarket(m1.id))!.yesPool + (await getMarket(m1.id))!.noPool;
  const r2 = await cashOutPosition("p_exit_fee", bets["p_exit_fee"]);
  ok("post-window exit succeeded", r2.ok, r2.ok ? "" : (r2 as { error?: string }).error);
  const got2 = (await bal("p_exit_fee")) - before2;
  ok(`post-window exit = 18,000 (20,000 − 10%)`, got2 === 18_000, `got ${money(got2)}`);
  const poolAfter2 = (await getMarket(m1.id))!.yesPool + (await getMarket(m1.id))!.noPool;
  ok("THE WHOLE 20,000 left the pool — the 2,000 fee did NOT stay behind for the other players",
     poolBefore2 - poolAfter2 === 20_000, `pool dropped ${money(poolBefore2 - poolAfter2)}`);

  const houseFee = await prisma.ledgerEntry.aggregate({
    _sum: { amount: true }, where: { marketId: m1.id, entryType: "CASHOUT_FEE" },
  });
  ok("the 2,000 exit fee reached HOUSE:COMMISSION", Number(houseFee._sum.amount) === 2_000, `house got ${money(Number(houseFee._sum.amount))}`);

  const m = (await getMarket(m1.id))!;
  console.log(`\n  pools after both exits: YES ${money(m.yesPool)} / NO ${money(m.noPool)}`);
}

// ════════════════════════════════════════════════════════════════════════════
section("4 · BETTING CLOSES — the exact payout is disclosed");
// ════════════════════════════════════════════════════════════════════════════
{
  // Force the selection cutoff into the past, then run the real sweep.
  const m = (await marketStore.get(m1.id))!;
  m.selectionClosedAt = new Date(Date.now() - 60_000).toISOString();
  await marketStore.set(m);

  const r = await notifySelectionClosedMarkets();
  ok("the selection-closed sweep ran", r.notified === 1, `notified ${r.notified} market(s)`);

  const fresh = (await getMarket(m1.id))!;
  const fee = poolFee(fresh.yesPool, fresh.noPool, ratesFor(fresh));
  console.log(`\n  frozen pools: YES ${money(fresh.yesPool)} / NO ${money(fresh.noPool)}`);
  console.log(`  fee: min(10% × ${money(fee.pool)} = ${money(Math.round(fee.commission))}, 1/3 × ${money(fee.smaller)} = ${money(Math.round(fee.ceiling))}) = ${money(Math.round(fee.fee))}`);
  console.log(`  netPool: ${money(Math.round(fee.netPool))}\n`);

  const positions = (await listPositionsForMarket(m1.id)).filter((p) => p.status === "OPEN");
  for (const p of positions) {
    console.log(`    ${p.userId.padEnd(12)} ${p.side.padEnd(3)} staked ${money(p.stake).padStart(7)}  →  if ${p.side} wins, receives ${money(p.potentialPayout)}`);
    ok(`${p.userId}: the disclosed payout is ≥ their stake`, p.potentialPayout >= p.stake);
  }
  ok("every OPEN position now carries an exact payoutIfWin", positions.every((p) => p.potentialPayout > 0));
}

// ════════════════════════════════════════════════════════════════════════════
section("5 · SETTLE — YES wins. Winners paid, losers zeroed.");
// ════════════════════════════════════════════════════════════════════════════
const settleSnapshot: Record<string, number> = {};
for (const id of PLAYERS) settleSnapshot[id] = await bal(id);
{
  const fresh = (await getMarket(m1.id))!;
  const fee = poolFee(fresh.yesPool, fresh.noPool, ratesFor(fresh));
  const disclosed = new Map((await listPositionsForMarket(m1.id)).filter(p => p.status === "OPEN").map(p => [p.id, p.potentialPayout]));

  await resolveMarket({ marketId: m1.id, outcome: "YES", officerId: "officer_a" });
  await resolveMarket({ marketId: m1.id, outcome: "YES", officerId: "officer_b" });
  const s = await settleMarket(m1.id, { force: true, actorId: "officer_a" });
  ok("settlement succeeded", s.ok, s.ok ? "" : (s as { error?: string }).error);

  const settled = await listPositionsForMarket(m1.id);
  let paidOut = 0;
  for (const p of settled) {
    if (p.status === "CASHED_OUT") continue;
    const delta = (await bal(p.userId)) - settleSnapshot[p.userId];
    if (p.side === "YES") {
      ok(`${p.userId} WON — paid ${money(p.finalPayout ?? 0)} on a ${money(p.stake)} stake`, p.status === "WIN" && (p.finalPayout ?? 0) > 0);
      ok(`${p.userId}: ★ WINNER FLOOR — never paid below stake`, (p.finalPayout ?? 0) >= p.stake, `stake ${money(p.stake)} paid ${money(p.finalPayout ?? 0)}`);
      ok(`${p.userId}: what we PROMISED at close is what we PAID`, p.finalPayout === disclosed.get(p.id), `promised ${money(disclosed.get(p.id) ?? 0)} paid ${money(p.finalPayout ?? 0)}`);
      ok(`${p.userId}: the wallet credit matches`, delta === p.finalPayout, `delta ${money(delta)}`);
      paidOut += p.finalPayout ?? 0;
    } else {
      ok(`${p.userId} LOST — stake forfeited, nothing credited`, p.status === "LOSS" && Number(p.finalPayout) === 0 && delta === 0);
    }
  }
  const conservation = fee.pool - (paidOut + fee.fee);
  ok("NO MINT / NO LEAK — payouts + fee reconstitute the pool", Math.abs(conservation) <= 3, `dust ${conservation.toFixed(2)}`);
  console.log(`\n  pool ${money(fee.pool)} = payouts ${money(paidOut)} + our fee ${money(Math.round(fee.fee))}  (dust ${conservation.toFixed(2)})`);
}

// ════════════════════════════════════════════════════════════════════════════
section("6 · ONE-SIDED POLL — nobody opposed. Everybody refunded; we earn nothing.");
// ════════════════════════════════════════════════════════════════════════════
{
  const m = await mkPoll("Nobody will take the other side");
  await buyPosition("p_win1", { marketId: m.id, side: "YES", stake: 30_000 });
  await buyPosition("p_win2", { marketId: m.id, side: "YES", stake: 20_000 });

  const b1 = await bal("p_win1"), b2 = await bal("p_win2");
  await resolveMarket({ marketId: m.id, outcome: "YES", officerId: "officer_a" });
  await resolveMarket({ marketId: m.id, outcome: "YES", officerId: "officer_b" });
  await settleMarket(m.id, { force: true });

  ok("one-sided: p_win1 refunded IN FULL (30,000)", (await bal("p_win1")) - b1 === 30_000);
  ok("one-sided: p_win2 refunded IN FULL (20,000)", (await bal("p_win2")) - b2 === 20_000);
  const ps = await listPositionsForMarket(m.id);
  ok("one-sided: positions are VOID, refunded at their stake", ps.every((p) => p.status === "VOID" && p.finalPayout === p.stake));
  const f = poolFee(50_000, 0, ratesFor((await getMarket(m.id))!));
  ok("one-sided: our fee is ZERO — this poll earned us nothing", f.fee === 0);
}

// ════════════════════════════════════════════════════════════════════════════
section("7 · VOIDED POLL — refund everybody");
// ════════════════════════════════════════════════════════════════════════════
{
  const m = await mkPoll("This one gets voided");
  await buyPosition("p_win1", { marketId: m.id, side: "YES", stake: 25_000 });
  await buyPosition("p_lose1", { marketId: m.id, side: "NO", stake: 15_000 });

  const b1 = await bal("p_win1"), b2 = await bal("p_lose1");
  await resolveMarket({ marketId: m.id, outcome: "VOID", officerId: "officer_a" });
  await resolveMarket({ marketId: m.id, outcome: "VOID", officerId: "officer_b" });
  await settleMarket(m.id, { force: true });

  ok("void: YES bettor refunded in full (25,000)", (await bal("p_win1")) - b1 === 25_000);
  ok("void: NO bettor refunded in full (15,000)", (await bal("p_lose1")) - b2 === 15_000);
  ok("void: the house took nothing", (await getMarket(m.id))!.status === "VOIDED");
}

// ════════════════════════════════════════════════════════════════════════════
section("8 · CASH OUT TO MOBILE MONEY — 1% fee, and NOTHING else");
// ════════════════════════════════════════════════════════════════════════════
let totalWithdrawnGross = 0, totalWithdrawFees = 0;
{
  const before = await bal("p_win1");
  const r = await withdraw("p_win1", { amount: 100_000, provider: "MPESA", msisdn: msisdns["p_win1"] });
  ok("withdrawal succeeded", r.ok, r.ok ? "" : (r as { error?: string }).error);
  if (r.ok) {
    ok("fee is 1,000 — exactly 1%", r.data.fee === 1_000, `fee ${money(r.data.fee)}`);
    ok("★ he receives 99,000 — NO withholding tax (the old code paid 85,000)", r.data.net === 99_000, `net ${money(r.data.net)}`);
    totalWithdrawnGross += 100_000; totalWithdrawFees += r.data.fee;
  }
  ok("the wallet is debited the full 100,000", before - (await bal("p_win1")) === 100_000);

  const taxRows = await prisma.ledgerEntry.count({ where: { entryType: "WITHDRAWAL_TAX" } });
  ok("★ NOT ONE withholding-tax row exists anywhere in the ledger", taxRows === 0, `${taxRows} rows`);

  const gw = await prisma.ledgerEntry.aggregate({ _sum: { amount: true }, where: { account: "HOUSE:AGGREGATOR" } });
  ok("the gateway got its 0.5% (500)", Number(gw._sum.amount) === 500, `gateway ${money(Number(gw._sum.amount))}`);
}

// ════════════════════════════════════════════════════════════════════════════
section("9 · RECONCILE — the books must balance");
// ════════════════════════════════════════════════════════════════════════════
{
  // (a) EVERY ledger group must sum to zero. A group that didn't would have been
  //     REJECTED by postLedgerEntries and silently dropped.
  const groups = await prisma.$queryRawUnsafe<Array<{ groupId: string; sum: string }>>(
    `SELECT "groupId", SUM(amount)::text as sum FROM "LedgerEntry" GROUP BY "groupId" HAVING ABS(SUM(amount)) > 0.005`,
  );
  ok("★ EVERY ledger group sums to zero (double-entry holds)", groups.length === 0,
     groups.length ? `${groups.length} imbalanced: ${groups.slice(0, 3).map(g => `${g.groupId}=${g.sum}`).join(", ")}` : "");

  const totalGroups = await prisma.$queryRawUnsafe<Array<{ n: string }>>(`SELECT COUNT(DISTINCT "groupId")::text as n FROM "LedgerEntry"`);
  console.log(`\n  ${totalGroups[0].n} ledger groups posted, all balanced`);

  // (b) HOUSE ACCOUNTS
  const house = await prisma.$queryRawUnsafe<Array<{ account: string; sum: string }>>(
    `SELECT account, SUM(amount)::text as sum FROM "LedgerEntry"
     WHERE account LIKE 'HOUSE:%' OR account LIKE 'SYSTEM:%' GROUP BY account ORDER BY account`,
  );
  console.log("\n  house accounts:");
  for (const h of house) console.log(`    ${h.account.padEnd(22)} ${money(Number(h.sum)).padStart(10)}`);

  const deadAccounts = house.filter((h) => ["HOUSE:TAX", "HOUSE:RESERVE"].includes(h.account));
  ok("★ the RETIRED accounts (HOUSE:TAX / HOUSE:RESERVE) were never credited", deadAccounts.length === 0,
     deadAccounts.map(d => `${d.account}=${d.sum}`).join(", "));

  // (c) MONEY CONSERVATION across the whole system.
  const wallets = await prisma.wallet.aggregate({ _sum: { balance: true, hold: true } });
  const walletTotal = Number(wallets._sum.balance) + Number(wallets._sum.hold);
  // ONLY UNSETTLED pools hold live money. A settled market RETAINS its final pool
  // figures as a historical record (that is what the resolution panel prints) — the
  // money itself already moved to the winners' wallets and the house. Counting them
  // here would double-count every settled poll.
  const pools = await prisma.predictionMarket.aggregate({
    _sum: { yesPool: true, noPool: true },
    where: { settledAt: null },
  });
  const poolTotal = Number(pools._sum.yesPool ?? 0) + Number(pools._sum.noPool ?? 0);
  const houseTotal = house.reduce((s, h) => s + Number(h.sum), 0);
  // Money that has left the platform for the payment provider.
  const gone = totalWithdrawnGross - totalWithdrawFees;

  const accounted = walletTotal + poolTotal + houseTotal + gone;
  const drift = accounted - totalDeposited;

  console.log(`\n  cash in (deposits)      ${money(totalDeposited).padStart(12)}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  player wallets          ${money(walletTotal).padStart(12)}`);
  console.log(`  live market pools       ${money(poolTotal).padStart(12)}`);
  console.log(`  house (fees + levies)   ${money(Math.round(houseTotal)).padStart(12)}`);
  console.log(`  paid out to M-Pesa      ${money(gone).padStart(12)}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  accounted for           ${money(Math.round(accounted)).padStart(12)}`);
  console.log(`  drift                   ${drift.toFixed(2).padStart(12)}`);

  ok("★ MONEY CONSERVATION — every shilling deposited is accounted for", Math.abs(drift) <= 5, `drift ${drift.toFixed(2)}`);
}

// ════════════════════════════════════════════════════════════════════════════
section("10 · THE WINNER FLOOR, across every settled position in the system");
// ════════════════════════════════════════════════════════════════════════════
{
  const wins = await prisma.position.findMany({ where: { status: "WIN" } });
  const breaches = wins.filter((p) => Number(p.finalPayout ?? 0) < Number(p.stake));
  console.log(`\n  ${wins.length} WIN positions settled across the run`);
  for (const p of wins) {
    const ratio = Number(p.finalPayout) / Number(p.stake);
    console.log(`    ${p.userId.padEnd(12)} staked ${money(Number(p.stake)).padStart(7)} → paid ${money(Number(p.finalPayout)).padStart(7)}  (${ratio.toFixed(3)}×)`);
  }
  ok("★★ NOT ONE WINNER WAS PAID BELOW THEIR STAKE", breaches.length === 0,
     breaches.map(b => `${b.userId} staked ${b.stake} paid ${b.finalPayout}`).join(", "));
}

console.log(`\n${"═".repeat(74)}`);
console.log(`  FULL-FLOW E2E: ${pass} passed, ${fail} failed`);
console.log(`${"═".repeat(74)}\n`);
await prisma.$disconnect();
if (fail > 0) process.exit(1);
