/**
 * loser-share fee model — the golden suite.
 *
 * Reproduces the numbers on the accountant's spreadsheet
 * (Proposal/50pick Calculations.xlsx) to the shilling, and proves the loser-share
 * invariants hold on the REAL settlement path:
 *
 *   fee     = (platformFeeRate + operatorFeeRate) × the LOSING pool
 *   netPool = pool − fee
 *   payout  = (stake / winningPool) × netPool     (stake returned + share of net)
 *
 * The model is outcome-DEPENDENT (the fee is a slice of whichever side loses) — the
 * deliberate difference from capped-commission, and the property this suite pins.
 * Owner decision 2026-07-23; see docs/COMPLIANCE-DECISIONS.md.
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import {
  poolFee,
  settledPayoutFor,
  payoutFor,
  allocateWinnerPayouts,
  levySplit,
  type FeeRates,
} from "../src/lib/payout.ts";
import { createMarket, buyPosition, resolveMarket, settleMarket, listPositionsForMarket } from "../src/lib/server/market-service.ts";
import { setGlobalConfig } from "../src/lib/server/market-config.ts";
import { settlementFeesByPoll } from "../src/lib/server/analytics.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
  cond ? pass++ : fail++;
}

const now = () => new Date().toISOString();
let seq = 0;
async function fundedUser(id: string, balance = 2_000_000): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25596${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}
const bal = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;

// Loser-share rates: Platform 3% + Operator 10% = 13% of the losing pool.
const LS: Partial<FeeRates> = { feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10 };

// Reference sheet pools.
const YES = 16_000;
const NO = 650_000;
const POOL = YES + NO; // 666,000

// ── 1 · The fee, both outcomes (reference sheet: 84,500 and 2,080) ───────────────
{
  const feeYes = poolFee(YES, NO, LS, "YES"); // YES wins → NO (650,000) loses
  const feeNo = poolFee(YES, NO, LS, "NO");   // NO wins  → YES (16,000) loses
  ok("1: YES wins — fee is 13% of the NO pool = 84,500", Math.round(feeYes.fee) === 84_500, `fee=${Math.round(feeYes.fee)}`);
  ok("1: NO wins — fee is 13% of the YES pool = 2,080", Math.round(feeNo.fee) === 2_080, `fee=${Math.round(feeNo.fee)}`);
  ok("1: netPool YES wins = 581,500", Math.round(feeYes.netPool) === 581_500, `net=${Math.round(feeYes.netPool)}`);
  ok("1: netPool NO wins = 663,920", Math.round(feeNo.netPool) === 663_920, `net=${Math.round(feeNo.netPool)}`);
  // The defining property: the fee is DIFFERENT depending on who wins.
  ok("1: ★ OUTCOME-DEPENDENT — the fee differs by winner", Math.round(feeYes.fee) !== Math.round(feeNo.fee));
}

// ── 2 · Per-player payouts (reference sheet, to the shilling) ────────────────────
{
  // YES side wins: Jimmy 1,000 / p2 5,000 / p3 10,000 (pool 16,000).
  const jimmy = settledPayoutFor({ yesPool: YES, noPool: NO, side: "YES", stake: 1_000 }, LS);
  ok("2: Jimmy (YES 1,000) → 36,344", jimmy.payout === 36_344, `payout=${jimmy.payout}`);
  // NO side wins: bettor 100,000 / p2 250,000 / p3 300,000 (pool 650,000).
  const noWin = settledPayoutFor({ yesPool: YES, noPool: NO, side: "NO", stake: 100_000 }, LS);
  ok("2: NO bettor (100,000) → 102,142", noWin.payout === 102_142, `payout=${noWin.payout}`);
  // Every winner gets back at least their stake.
  ok("2: winner floor — Jimmy ≥ stake", jimmy.payout >= 1_000);
  ok("2: winner floor — NO bettor ≥ stake", noWin.payout >= 100_000);
}

// ── 3 · Conservation (no mint / no leak), both outcomes ──────────────────────
{
  // YES wins: winners are the YES side (stakes 1,000 / 5,000 / 10,000).
  const feeYes = poolFee(YES, NO, LS, "YES");
  const yesWinners = [{ id: "a", stake: 1_000 }, { id: "b", stake: 5_000 }, { id: "c", stake: 10_000 }];
  const allocYes = allocateWinnerPayouts(yesWinners, YES, feeYes.netPool);
  const sumYes = [...allocYes.values()].reduce((s, v) => s + v, 0);
  ok("3: YES wins — Σpayouts + fee == pool", sumYes + Math.round(feeYes.fee) === POOL, `${sumYes}+${Math.round(feeYes.fee)}`);

  // NO wins: winners are the NO side (stakes 100,000 / 250,000 / 300,000).
  const feeNo = poolFee(YES, NO, LS, "NO");
  const noWinners = [{ id: "d", stake: 100_000 }, { id: "e", stake: 250_000 }, { id: "f", stake: 300_000 }];
  const allocNo = allocateWinnerPayouts(noWinners, NO, feeNo.netPool);
  const sumNo = [...allocNo.values()].reduce((s, v) => s + v, 0);
  ok("3: NO wins — Σpayouts + fee == pool", sumNo + Math.round(feeNo.fee) === POOL, `${sumNo}+${Math.round(feeNo.fee)}`);
}

// ── 4 · One-sided → fee 0 (everyone refunded) ────────────────────────────────
{
  const feeOne = poolFee(30_000, 0, LS, "YES"); // nobody on NO → no losing pool
  ok("4: one-sided — fee is 0", Math.round(feeOne.fee) === 0, `fee=${Math.round(feeOne.fee)}`);
}

// ── 5 · Taxes come OUT of the 13% (player never loses more) ──────────────────
{
  const feeYes = poolFee(YES, NO, LS, "YES"); // 84,500
  const split = levySplit(feeYes.fee, { traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05 });
  ok("5: TRA = 10% of the fee", split.traLevy === Math.round(84_500 * 0.10), `tra=${split.traLevy}`);
  ok("5: GBT = 5% of the fee", split.gbtLevy === Math.round(84_500 * 0.05), `gbt=${split.gbtLevy}`);
  ok("5: operator net = fee − TRA − GBT (taxes out of the 13%)", split.operatorNet === 84_500 - split.traLevy - split.gbtLevy);
}

// ── 6 · Projection == settlement (the quote equals the payment) ──────────────
{
  const proj = payoutFor({ yesPool: YES - 1_000, noPool: NO, side: "YES", stake: 1_000 }, LS);
  const settled = settledPayoutFor({ yesPool: YES, noPool: NO, side: "YES", stake: 1_000 }, LS);
  ok("6: projection and settlement agree to the shilling", proj.payout === settled.payout, `proj=${proj.payout} settled=${settled.payout}`);
}

// ── 7 · END TO END through the real services (loser-share pinned) ────────────
{
  // Raise maxStake so the example stakes (up to 650,000) are accepted — the
  // default cap is 100,000, which would otherwise reject the NO bet and make the
  // poll one-sided.
  await setGlobalConfig({ feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, maxStake: 1_000_000 }, "ls-test");

  const m = await createMarket({
    titleEn: "Loser-share e2e", titleSw: "Soko la ada", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);

  await fundedUser("ls_y1");
  await fundedUser("ls_n1");
  await buyPosition("ls_y1", { marketId: m.id, side: "YES", stake: 16_000 });
  await buyPosition("ls_n1", { marketId: m.id, side: "NO", stake: 650_000 });

  const beforeY = await bal("ls_y1");
  await resolveMarket({ marketId: m.id, outcome: "YES", officerId: "fee_a" });
  await resolveMarket({ marketId: m.id, outcome: "YES", officerId: "fee_b" });
  await settleMarket(m.id, { force: true });

  const paidY = (await bal("ls_y1")) - beforeY;
  const settled = (await listPositionsForMarket(m.id)).find((p) => p.userId === "ls_y1");
  // Sole YES winner takes the whole netPool = 666,000 − 13%×650,000 = 581,500.
  ok("7: e2e — sole YES winner receives netPool 581,500", (settled?.finalPayout ?? 0) === 581_500, `payout=${settled?.finalPayout}`);
  ok("7: e2e — wallet credited by the payout", paidY === 581_500, `credited=${paidY}`);

  // ── 8 · The ACCOUNTANT per-poll view shows the right model + fee ────────────
  const view = await settlementFeesByPoll("28d");
  const row = view.rows.find((r) => r.marketId === m.id);
  ok("8: accountant view lists the poll", !!row, `rows=${view.rows.length}`);
  ok("8: accountant view — feeModel = loser-share", row?.feeModel === "loser-share", `model=${row?.feeModel}`);
  ok("8: accountant view — fee = 84,500 (13% of the NO pool)", row?.fee === 84_500, `fee=${row?.fee}`);
  ok("8: accountant view — operator net = fee − TRA − GBT", row?.operatorNet === 84_500 - Math.round(84_500 * 0.10) - Math.round(84_500 * 0.05), `net=${row?.operatorNet}`);
  ok("8: accountant per-model total matches", view.byModel["loser-share"].fee >= 84_500);
}

console.log(`\nloser-share-fee: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
