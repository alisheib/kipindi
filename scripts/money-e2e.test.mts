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
 *   CLOSE       notifySelectionClosedForMarket() — the exact payout is disclosed
 *   SETTLE      resolveMarket() x2 + settleMarket() — winners paid, losers zeroed
 *   ONE-SIDED   a poll nobody opposed → everybody refunded, we earn nothing
 *   VOID        an emergency-voided poll → everybody refunded
 *   STAKE-SHARE two polls and an Up & Down round frozen under FEE-TAX-2026-10's law (the gate opened in this
 *               process only): close → disclosed == paid → settle → each BET_PAYOUT's withheld tax on HOUSE:WINNINGS_TAX
 *   CASH OUT    withdraw()           — to mobile money, the 1.5% fee, NO withholding tax
 *
 * Then it RECONCILES:
 *   • every ledger group sums to zero
 *   • money conservation: deposited == (wallets + pools + house), drift 0.00
 *   • HOUSE:WINNINGS_TAX == Σ BET_PAYOUT.taxWithheld, and every stake-share POOL closes at exactly 0
 *   • WINNER FLOOR: no WIN position is ever paid below its floor — the stake (older models), the net stake (stake-share)
 */
import { PrismaClient } from "@prisma/client";
import { deposit, withdraw } from "../src/lib/server/wallet-service.ts";
import {
  createMarket, buyPosition, cashOutPosition, getMarket, resolveMarket, settleMarket,
  listPositionsForMarket, notifySelectionClosedForMarket, ratesFor,
} from "../src/lib/server/market-service.ts";
import { marketStore, positionStore } from "../src/lib/server/market-dal.ts";
import { setGlobalConfig } from "../src/lib/server/market-config.ts";
import { setRequireTwoOfficerResolution } from "../src/lib/server/resolution-policy.ts";
import { poolFee, DEFAULT_WITHDRAWAL_FEE_RATE, DEFAULT_WITHDRAWAL_GATEWAY_SHARE_RATE } from "../src/lib/payout.ts";
// FEE-TAX-2026-10 · §7c/§7d — the stake-share law, stamped with the gate opened in THIS process only.
import { __setFeeLawLiveForTest } from "../src/lib/fee-law-gate.ts";
import { assetStore, chainStore, roundStore, observationStore } from "../src/lib/server/updown-dal.ts";
import { createAsset, setAssetEnabled, createChain, setChainState, cleanGridAnchor } from "../src/lib/server/updown-config.ts";
import { openRound, closeRound } from "../src/lib/server/updown-service.ts";
import { addSource, seedDefaultSources } from "../src/lib/server/source-registry.ts";

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
  // A verified email is required before a first deposit (wallet-service email gate).
  await prisma.user.create({ data: { id, phoneE164: p, role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: id, email: `${id}@test.tz`, emailVerifiedAt: new Date() } });
  await prisma.wallet.create({ data: { id: `wal_${id}`, userId: id, balance: 0, currency: "TZS", status: "ACTIVE" } });
  // ⛔ THE IDENTITY TUPLE, NOT THE DELETED MIRROR. This fixture set `nidaNumber`
  // ALONE until 2026-08-20 — so after the contract migration it would have created an
  // APPROVED submission carrying NO identity number at all, and every uniqueness
  // assertion downstream would have passed over nothing.
  await prisma.kycSubmission.create({ data: { userId: id, status: "APPROVED", idType: "NIDA", idNumber: `${19900101}${String(phone).slice(-10)}`, idVerifiedAt: new Date() } });
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

// This suite's hardcoded numbers are the capped-commission model with a paid-exit
// window. Pin both (the platform defaults are now loser-share + paidExitWindow=0) so
// the suite is self-consistent and tests the capped e2e path against real Postgres.
// loser-share conservation against Postgres is covered by the drift check either way.
await setGlobalConfig({ feeModel: "capped-commission", paidExitWindowMinutes: 15 }, "e2e-setup");
// Sections 5-7 model a two-DISTINCT-officer resolution (officer_a stages, officer_b
// seals) — that flow only exists under two-admin authorization, which is OFF by
// default now. Enable it for those sections; section 8b flips it OFF and proves the
// single-admin one-action path conserves money on real Postgres too.
await setRequireTwoOfficerResolution(true, "e2e-setup");

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
  // Force the selection cutoff into the past, then fire the REAL per-market
  // selection-closed transition — the exact function the market timer calls.
  const m = (await marketStore.get(m1.id))!;
  m.selectionClosedAt = new Date(Date.now() - 60_000).toISOString();
  await marketStore.set(m);

  const r = await notifySelectionClosedForMarket(m1.id);
  ok("the selection-closed transition ran for this poll", r.notified === true, `notified=${r.notified}`);
  // The old sweep asserted it touched EXACTLY one market; per-market, the equivalent
  // scope check is that it reached exactly the four bettors still holding a position
  // (the two early exits are out).
  ok("it disclosed to exactly the 4 remaining bettors", r.bettors === 4, `bettors ${r.bettors}`);

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
section("7b · SINGLE-ADMIN resolution (the default) — one officer, one action, on real PG");
// The platform default: two-admin authorization OFF, so ONE officer resolves in a
// single call (incl. one who holds a position). Money must conserve exactly like the
// two-officer path above. (2026-07-24, docs/COMPLIANCE-DECISIONS.md.)
// ════════════════════════════════════════════════════════════════════════════
{
  await setRequireTwoOfficerResolution(false, "e2e-single-admin");
  const m = await mkPoll("Single admin seals this one");
  await buyPosition("p_win1", { marketId: m.id, side: "YES", stake: 40_000 });
  await buyPosition("p_lose1", { marketId: m.id, side: "NO", stake: 60_000 });

  const fresh = (await getMarket(m.id))!;
  const fee = poolFee(fresh.yesPool, fresh.noPool, ratesFor(fresh));
  const winBefore = await bal("p_win1");
  const loseBefore = await bal("p_lose1");

  // ONE call seals it — no second officer.
  const r = await resolveMarket({ marketId: m.id, outcome: "YES", officerId: "officer_solo" });
  ok("7b: single admin resolves in one action (stage complete)", r.ok && r.data?.stage === "complete", r.ok ? "" : r.error);
  const s = await settleMarket(m.id, { force: true, actorId: "officer_solo" });
  ok("7b: single-admin settlement succeeded", s.ok, s.ok ? "" : (s as { error?: string }).error);

  const settled = await listPositionsForMarket(m.id);
  const winPos = settled.find((p) => p.userId === "p_win1")!;
  const losePos = settled.find((p) => p.userId === "p_lose1")!;
  const winDelta = (await bal("p_win1")) - winBefore;
  ok("7b: YES winner paid (≥ stake, floor holds)", winPos.status === "WIN" && (winPos.finalPayout ?? 0) >= winPos.stake && winDelta === winPos.finalPayout);
  ok("7b: NO loser zeroed, nothing credited", losePos.status === "LOSS" && Number(losePos.finalPayout) === 0 && (await bal("p_lose1")) === loseBefore);
  const conservation = fee.pool - ((winPos.finalPayout ?? 0) + fee.fee);
  ok("7b: NO MINT / NO LEAK — single-admin payout + fee reconstitute the pool", Math.abs(conservation) <= 3, `dust ${conservation.toFixed(2)}`);
  // Restore two-admin ON for any later section that models the two-officer dance.
  await setRequireTwoOfficerResolution(true, "e2e-single-admin-restore");
}

// ════════════════════════════════════════════════════════════════════════════
section("7c · STAKE-SHARE POLLS (FEE-TAX-2026-10) — a fee on every stake, a 15% winnings tax, on real PG");
// The new law is DECIDED and NOT IN FORCE (`fee-law-gate.ts`): no market can freeze it before release R5. So the gate
// is opened IN THIS PROCESS, through the test seam, for each stamp only — and shut again before a shilling moves. Then
// the whole chain runs for real: bet → close (the exact payout disclosed) → settle → the ledger, and §8 withdraws a
// stake-share winner's money. Two polls: the document's own example (FEE-TAX-PLAN §3) and a lopsided book whose
// winner is paid BELOW its stake (ruling 1) — never below its NET stake.
// ════════════════════════════════════════════════════════════════════════════
const stakeShareMarketIds: string[] = [];
const SS_RATES = { feeModel: "stake-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, winningsTaxRate: 0.15 };
async function ssPoll(title: string) {
  __setFeeLawLiveForTest(true);
  try {
    const m = await createMarket({
      titleEn: title, titleSw: `${title} (sw)`, category: "macro",
      sourceUrl: "https://bot.go.tz", resolutionCriterion: "Official source on the date.",
      resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(),
      selectionClosedAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      proposedBy: "officer_a", rateOverrides: SS_RATES,
    } as never);
    stakeShareMarketIds.push(m.id);
    return m;
  } finally {
    __setFeeLawLiveForTest(null);
  }
}
async function poolLedger(marketId: string) {
  const sum = await prisma.ledgerEntry.aggregate({ _sum: { amount: true }, where: { marketId, account: `POOL:${marketId}` } });
  return Number(sum._sum.amount ?? 0);
}
for (const [label, plan, want] of [
  ["the document's example", [["p_win1", "YES", 1_000], ["p_win2", "YES", 3_000], ["p_exit_free", "YES", 5_000], ["p_lose1", "NO", 10_000], ["p_lose2", "NO", 20_000], ["p_exit_fee", "NO", 5_000]], { paid: [3_746, 11_237, 18_729], tax: 4_568, fee: 5_720 }],
  ["a lopsided book", [["p_win1", "YES", 60_000], ["p_lose1", "NO", 2_000]], { paid: [53_679], tax: 261, fee: 8_060 }],
] as const) {
  const m = await ssPoll(`Stake-share e2e · ${label}`);
  ok(`7c ${label}: the poll FROZE stake-share with its 15% tax (v3)`, m.feeSnapshot?.feeModel === "stake-share" && m.feeSnapshot?.winningsTaxRate === 0.15 && m.feeSnapshot?.v === 3, JSON.stringify(m.feeSnapshot));
  const placed: Array<{ id: string; user: string; side: "YES" | "NO"; stake: number }> = [];
  for (const [user, side, stake] of plan) {
    const r = await buyPosition(user, { marketId: m.id, side, stake });
    ok(`7c ${label}: ${user} staked ${money(stake)} on ${side}`, r.ok, r.ok ? "" : (r as { error?: string }).error);
    if (r.ok) placed.push({ id: r.data!.positionId, user, side, stake });
  }
  // BETTING CLOSES — the real per-market transition discloses the exact payout.
  const row = (await marketStore.get(m.id))!;
  row.selectionClosedAt = new Date(Date.now() - 60_000).toISOString();
  await marketStore.set(row);
  const closed = await notifySelectionClosedForMarket(m.id);
  ok(`7c ${label}: the close disclosed to every bettor`, closed.notified === true && closed.bettors === placed.length, JSON.stringify(closed));
  const disclosed = new Map((await listPositionsForMarket(m.id)).map((p) => [p.id, p.potentialPayout]));
  const before: Record<string, number> = {};
  for (const p of placed) before[p.user] = await bal(p.user);
  await resolveMarket({ marketId: m.id, outcome: "YES", officerId: "officer_a" });
  await resolveMarket({ marketId: m.id, outcome: "YES", officerId: "officer_b" });
  const s = await settleMarket(m.id, { force: true, actorId: "officer_a" });
  ok(`7c ${label}: settlement succeeded`, s.ok, s.ok ? "" : (s as { error?: string }).error);
  const settled = new Map((await listPositionsForMarket(m.id)).map((p) => [p.id, p]));
  const winners = placed.filter((p) => p.side === "YES");
  const paid = winners.map((p) => settled.get(p.id)?.finalPayout ?? null);
  ok(`7c ${label}: ★ winners are paid ${want.paid.map(money).join(" / ")} — exactly what the close disclosed`,
    JSON.stringify(paid) === JSON.stringify(want.paid) && winners.every((p) => settled.get(p.id)?.finalPayout === disclosed.get(p.id)),
    JSON.stringify({ paid, disclosed: winners.map((p) => disclosed.get(p.id)) }));
  let taxRows = 0, taxWithheld = 0;
  for (const p of winners) {
    const pos = settled.get(p.id)!;
    const delta = (await bal(p.user)) - before[p.user];
    ok(`7c ${label}: ${p.user}: the wallet credit is the NET payout`, delta === pos.finalPayout, `delta ${money(delta)} · paid ${money(pos.finalPayout ?? 0)}`);
    ok(`7c ${label}: ${p.user}: ★ the NET-STAKE floor — never below the stake less its own fee (${money(pos.feeTzs ?? 0)})`,
      pos.feeTzs != null && (pos.finalPayout ?? 0) >= p.stake - pos.feeTzs, `stake ${money(p.stake)} paid ${money(pos.finalPayout ?? 0)}`);
    const txn = await prisma.transaction.findFirst({ where: { positionId: p.id, type: "BET_PAYOUT" } });
    const line = txn ? await prisma.ledgerEntry.findFirst({ where: { txnId: txn.id, entryType: "SETTLEMENT_WINNINGS_TAX" } }) : null;
    if (txn && line && Number(line.amount) === Number(txn.taxWithheld) && line.account === "HOUSE:WINNINGS_TAX" && Number(txn.taxWithheld) === pos.winningsTaxTzs && Number(txn.amount) === pos.finalPayout) taxRows++;
    taxWithheld += Number(txn?.taxWithheld ?? 0);
  }
  ok(`7c ${label}: every BET_PAYOUT carries its withheld tax, tied to ONE line on HOUSE:WINNINGS_TAX`, taxRows === winners.length, `${taxRows}/${winners.length}`);
  ok(`7c ${label}: ★ the withheld tax totals T = ${money(want.tax)}`, taxWithheld === want.tax, `withheld ${money(taxWithheld)}`);
  const losers = placed.filter((p) => p.side === "NO");
  ok(`7c ${label}: the losers paid their own fee and were paid nothing`, losers.every((p) => settled.get(p.id)?.status === "LOSS" && settled.get(p.id)?.feeTzs != null && Number(settled.get(p.id)?.finalPayout) === 0));
  const fees = [...settled.values()].reduce((a, p) => a + (p.feeTzs ?? 0), 0);
  ok(`7c ${label}: Σ every position's own fee = F = ${money(want.fee)}`, fees === want.fee, `Σ fee ${money(fees)}`);
  ok(`7c ${label}: ★ POOL:<market> closes at EXACTLY 0 — payouts + F + T, no dust`, (await poolLedger(m.id)) === 0, `POOL ${await poolLedger(m.id)}`);
  if (label === "a lopsided book") {
    ok("7c a lopsided book: the winner really is paid BELOW its stake (ruling 1) — so §10's floor is measured on a case that can break it",
      (paid[0] ?? Infinity) < 60_000);
  }
}

// ════════════════════════════════════════════════════════════════════════════
section("7d · A STAKE-SHARE UP & DOWN ROUND — the real chain, the real close, on real PG");
// The same law on the second product, through ONLY its product path: an asset, a chain on a stake-share profile (the
// explicit override a chain on another model needs), `openRound` with a confirmed open price, real bets, and
// `closeRound` → `settleMarket`. ⛔ The gate is open IN THIS PROCESS only for the platform's 15% tax, the chain's
// profile and the round's stamp; a round takes its tax from the platform's config, never from its profile.
// ════════════════════════════════════════════════════════════════════════════
{
  await seedDefaultSources();
  await addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto", rationale: "e2e fixture", addedBy: "system" });
  const a = await createAsset({
    key: "BTCE2ESS", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
    priceSourceUrl: "https://api.twelvedata.com/quote", category: "crypto", decimals: 2, minMoveTicks: 2,
  }, "officer_a");
  if (!a.ok) throw new Error(`7d fixture: createAsset — ${a.error}`);
  await setAssetEnabled(a.data.id, true, "officer_a");
  const asset = (await assetStore.get(a.data.id))!;
  const anchorMs = cleanGridAnchor(Date.now() + 60_000);
  const B = (k: number) => new Date(anchorMs + k * 5 * 60_000).toISOString();
  const confirmAt = async (iso: string, price: number) => {
    const o = await observationStore.ensure(asset.id, iso);
    await observationStore.confirm(o.id, { price, sourceUrl: asset.priceSourceUrl, sourceQuotedAt: iso, evidence: `BTC quoted ${price}`, confidence: 96, model: "test-stub", rawHash: `e2e${iso}${price}` });
    return o.id;
  };
  let roundId = "", marketId = "";
  __setFeeLawLiveForTest(true);
  try {
    const taxSaved = await setGlobalConfig({ winningsTaxRate: 0.15 }, "e2e-stake-share");
    if (!taxSaved.ok) throw new Error(`7d fixture: the 15% tax — ${JSON.stringify(taxSaved)}`);
    const c = await createChain({
      assetId: asset.id, durationMinutes: 5,
      rateProfile: { feeModel: "stake-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, feeCeilingRate: 1 / 3, estimatedWinningsRate: 0.4, showEstimatedWinnings: true },
    }, "officer_a", { allowFeeModelOverride: true });
    if (!c.ok) throw new Error(`7d fixture: createChain — ${c.error}`);
    await setChainState(c.data.id, "RUNNING", "officer_a");
    const chain = (await chainStore.get(c.data.id))!;
    const opened = await openRound(chain, B(2), await confirmAt(B(2), 63_000), 63_000);
    if (!opened.ok) throw new Error(`7d fixture: openRound — ${opened.error}`);
    roundId = opened.data.id; marketId = opened.data.marketId;
  } finally {
    __setFeeLawLiveForTest(null);
  }
  stakeShareMarketIds.push(marketId);
  const m = (await getMarket(marketId))!;
  ok("7d: the round FROZE stake-share with the platform's 15% tax (v3)", m.feeSnapshot?.feeModel === "stake-share" && m.feeSnapshot?.winningsTaxRate === 0.15, JSON.stringify(m.feeSnapshot));
  const up = await buyPosition("p_win2", { marketId, side: "YES", stake: 5_000 });
  const dn = await buyPosition("p_lose2", { marketId, side: "NO", stake: 5_000 });
  ok("7d: both sides staked 5,000", up.ok && dn.ok, `${up.ok ? "" : (up as { error?: string }).error} ${dn.ok ? "" : (dn as { error?: string }).error}`);
  const upBefore = await bal("p_win2"), dnBefore = await bal("p_lose2");
  // The close: a confirmed reading at the round's OWN boundary, strictly beyond its frozen up target.
  const r0 = (await roundStore.get(roundId))!;
  const closePrice = Number(((r0.upTarget ?? 63_000) + 50).toFixed(2));
  const closed = await closeRound(roundId, await confirmAt(r0.boundaryAt, closePrice), closePrice);
  ok("7d: the round closed UP and its money moved", closed.ok && closed.data.outcome === "UP" && closed.data.settled, JSON.stringify(closed));
  const pos = new Map((await listPositionsForMarket(marketId)).map((p) => [p.userId, p]));
  // 5,000 v 5,000: F = 650 + 650; P = 4,350; T = rhu(652.5) = 653; the winner gets its net 4,350 + the prize 3,697.
  ok("7d: ★ the UP winner is paid 8,047 — its net stake 4,350 back plus the prize after tax", pos.get("p_win2")?.finalPayout === 8_047 && (await bal("p_win2")) - upBefore === 8_047,
    `paid ${pos.get("p_win2")?.finalPayout}`);
  ok("7d: the DOWN loser is paid nothing and its own fee is on the row", Number(pos.get("p_lose2")?.finalPayout) === 0 && pos.get("p_lose2")?.feeTzs === 650 && (await bal("p_lose2")) === dnBefore);
  const tax = await prisma.ledgerEntry.aggregate({ _sum: { amount: true }, where: { marketId, account: "HOUSE:WINNINGS_TAX" } });
  ok("7d: ★ the round's 653 of tax sits on HOUSE:WINNINGS_TAX, and its POOL closes at EXACTLY 0", Number(tax._sum.amount) === 653 && (await poolLedger(marketId)) === 0,
    `tax ${Number(tax._sum.amount)} · POOL ${await poolLedger(marketId)}`);
}

// ════════════════════════════════════════════════════════════════════════════
section("8 · CASH OUT TO MOBILE MONEY — the 1.5% fee, and NOTHING else");
// ════════════════════════════════════════════════════════════════════════════
// ⛔ THESE LITERALS ARE THE LAW, NOT THE CODE'S OPINION OF IT. RULES §2.7: 1.5% of the
// amount withdrawn, of which 0.5 percentage points is the gateway's. On 100,000 that is
// 1,500 of fee and 98,500 to the player, 500 of the fee belonging to HOUSE:AGGREGATOR.
//
// ⚠️ They read `1_000` / `99_000` — the 1% rate RETIRED on 2026-08-14 — until this suite
// was first run against a real Postgres on 2026-09-09, when it went RED on correct code.
// An assertion pinned to a superseded rate does not merely fail to catch a defect; it
// ACCUSES THE FIX. Note the tell it left: the HOUSE:AGGREGATOR line below already said
// 500, which is 0.5pp of 1.5% — half this section was updated in 2026-08-14 and half was
// not, and nothing in the repo could see the contradiction because the suite had never
// been executed. (§6.4 found the same rot in ledger.test.mts's captions.)
//
// ⭐ So the literals are bound to the shipped default below. If a rate legitimately moves,
// RULES §5 step 4 requires every statement of it to move in the SAME commit — and this
// says which one is stale instead of re-deriving the expectation from the code under test.
let totalWithdrawnGross = 0, totalWithdrawFees = 0;
{
  ok(
    "the literals below still state the shipped rate — RULES §2.7 (1.5%, 0.5pp gateway)",
    DEFAULT_WITHDRAWAL_FEE_RATE === 0.015 && DEFAULT_WITHDRAWAL_GATEWAY_SHARE_RATE === 0.005,
    `payout.ts ships ${DEFAULT_WITHDRAWAL_FEE_RATE} / ${DEFAULT_WITHDRAWAL_GATEWAY_SHARE_RATE} — if the RATE moved, update RULES §2.7 and these literals in the same commit`,
  );

  const before = await bal("p_win1");
  const r = await withdraw("p_win1", { amount: 100_000, provider: "MPESA", msisdn: msisdns["p_win1"] });
  ok("withdrawal succeeded", r.ok, r.ok ? "" : (r as { error?: string }).error);
  if (r.ok) {
    ok("fee is 1,500 — exactly 1.5% (RULES §2.7)", r.data.fee === 1_500, `fee ${money(r.data.fee)}`);
    ok("★ he receives 98,500 — NO withholding tax (the old code paid 85,000)", r.data.net === 98_500, `net ${money(r.data.net)}`);
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

  // ⭐ FEE-TAX-2026-10 · the winnings tax is its OWN liability (owed to TRA, never revenue, never a levy), and every
  // shilling on it is one a BET_PAYOUT row withheld: §7c's 4,568 + 261 and §7d's 653.
  const winningsTax = Number(house.find((h) => h.account === "HOUSE:WINNINGS_TAX")?.sum ?? 0);
  const withheld = await prisma.transaction.aggregate({ _sum: { taxWithheld: true }, where: { type: "BET_PAYOUT" } });
  ok("★ HOUSE:WINNINGS_TAX = Σ BET_PAYOUT.taxWithheld, to the shilling (5,482 — the stake-share sections' T)",
     winningsTax === Number(withheld._sum.taxWithheld ?? 0) && winningsTax === 4_568 + 261 + 653,
     `account ${money(winningsTax)} · withheld ${money(Number(withheld._sum.taxWithheld ?? 0))}`);
  const ssPools = await Promise.all(stakeShareMarketIds.map(poolLedger));
  ok("★ every stake-share market's POOL account closed at EXACTLY 0", ssPools.length === 3 && ssPools.every((x) => x === 0), JSON.stringify(ssPools));

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
  // The stake-share sections are exact by construction (whole shillings, largest remainder, POOL at 0), so the run's
  // drift stays exactly where the older sections leave it: 0.00 (R2a's run, and this one).
  ok("★ …and the drift is 0.00 — the stake-share sections add none", Math.abs(drift) < 0.005, `drift ${drift.toFixed(2)}`);
}

// ════════════════════════════════════════════════════════════════════════════
section("10 · THE WINNER FLOOR, across every settled position in the system");
// ════════════════════════════════════════════════════════════════════════════
{
  // ⭐ MODEL-AWARE SINCE FEE-TAX-2026-10. Under the two older models a winner's floor is the stake. Under `stake-share` the
  // fee comes out of EVERY stake (ruling 1), so the floor is the NET stake — the stake less the fee the position itself
  // paid, which settlement writes on the row (`Position.feeTzs`, set on stake-share positions only). §7c's lopsided winner
  // IS paid below its stake, so the older wording would accuse a correct settlement.
  const wins = await prisma.position.findMany({ where: { status: "WIN" } });
  const floorOf = (p: { stake: unknown; feeTzs: number | null }) => Number(p.stake) - (p.feeTzs ?? 0);
  const breaches = wins.filter((p) => Number(p.finalPayout ?? 0) < floorOf(p));
  console.log(`\n  ${wins.length} WIN positions settled across the run`);
  for (const p of wins) {
    const ratio = Number(p.finalPayout) / Number(p.stake);
    console.log(`    ${p.userId.padEnd(12)} staked ${money(Number(p.stake)).padStart(7)} → paid ${money(Number(p.finalPayout)).padStart(7)}  (${ratio.toFixed(3)}×)${p.feeTzs != null ? `  · stake-share, own fee ${money(p.feeTzs)}` : ""}`);
  }
  ok("★★ NOT ONE WINNER WAS PAID BELOW ITS FLOOR — the stake (older models) or the net stake (stake-share)", breaches.length === 0,
     breaches.map(b => `${b.userId} staked ${b.stake} paid ${b.finalPayout} fee ${b.feeTzs}`).join(", "));
  const olderBelowStake = wins.filter((p) => p.feeTzs == null && Number(p.finalPayout ?? 0) < Number(p.stake));
  ok("★ …and under the older models that floor is still the WHOLE stake", olderBelowStake.length === 0,
     olderBelowStake.map(b => `${b.userId} staked ${b.stake} paid ${b.finalPayout}`).join(", "));
  ok("…the run held stake-share winners, one of them paid below its stake (so the net-stake floor was really measured)",
     wins.some((p) => p.feeTzs != null && Number(p.finalPayout ?? 0) < Number(p.stake)));
}

console.log(`\n${"═".repeat(74)}`);
console.log(`  FULL-FLOW E2E: ${pass} passed, ${fail} failed`);
console.log(`${"═".repeat(74)}\n`);
await prisma.$disconnect();
if (fail > 0) process.exit(1);
