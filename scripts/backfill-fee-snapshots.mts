/**
 * Backfill `PredictionMarket.feeSnapshot` onto polls that predate the column.
 *
 *   Run:  npx tsx scripts/backfill-fee-snapshots.mts          (dry run — default)
 *         npx tsx scripts/backfill-fee-snapshots.mts --apply  (writes)
 *
 * ── THE RULE, AND WHY ──────────────────────────────────────────────────────
 *
 * SETTLED markets (settledAt IS NOT NULL, or status RESOLVED/VOIDED) ARE LEFT
 * ALONE. Their money has already moved. History is history; we do not rewrite it,
 * and a snapshot on a settled poll would be a lie about what it was actually paid
 * at.
 *
 * LIVE / OPEN markets — polls with bets already placed and money still in the pool
 * — are stamped with:
 *
 *     commissionRate:  0.09   ← the OLD rate. What those players were QUOTED.
 *     feeCeilingRate:  1/3    ← the NEW ceiling.
 *
 * That combination is deliberate, and it is the whole point of this script.
 *
 *   • Keeping 9% honours the deal those players actually took. Migrating them to
 *     the new 10% would charge them MORE than they agreed to, retroactively —
 *     which is the exact category of thing this project exists to stop us doing.
 *
 *   • Adding the ceiling can only ever REDUCE their fee, never raise it:
 *     min(0.09 × pool, (1/3) × smaller) ≤ 0.09 × pool, always. So every affected
 *     player is paid the same or MORE than they were quoted. Nobody can complain,
 *     and the in-flight winner-loses-money bug dies immediately on every open poll
 *     rather than only on new ones.
 *
 * In short: the ceiling is applied retroactively because it is a gift. The rate
 * rise is not, because it is not.
 */
import { PrismaClient } from "@prisma/client";
import { DEFAULT_FEE_CEILING_RATE, DEFAULT_CASHOUT_FEE_RATE, DEFAULT_FREE_EXIT_GRACE_MINUTES, DEFAULT_PAID_EXIT_WINDOW_MINUTES, DEFAULT_TRA_TAX_ON_COMMISSION_RATE, DEFAULT_GBT_LEVY_ON_COMMISSION_RATE, THIN_PROFIT_RATIO, poolFee } from "../src/lib/payout.ts";
import { LEGACY_COMMISSION_RATE } from "../src/lib/server/market-config.ts";

const APPLY = process.argv.includes("--apply");

/** The rates an in-flight poll is stamped with. Old commission, new ceiling. */
const LEGACY_SNAPSHOT = {
  commissionRate: LEGACY_COMMISSION_RATE,      // 0.09 — what they were quoted
  feeCeilingRate: DEFAULT_FEE_CEILING_RATE,    // 1/3  — the gift
  cashOutFeeRate: DEFAULT_CASHOUT_FEE_RATE,
  freeExitGraceMinutes: DEFAULT_FREE_EXIT_GRACE_MINUTES,
  paidExitWindowMinutes: DEFAULT_PAID_EXIT_WINDOW_MINUTES,
  traTaxOnCommissionRate: DEFAULT_TRA_TAX_ON_COMMISSION_RATE,
  gbtLevyOnCommissionRate: DEFAULT_GBT_LEVY_ON_COMMISSION_RATE,
  thinProfitRatio: THIN_PROFIT_RATIO,
  v: 1 as const,
  stampedAt: new Date().toISOString(),
};

const prisma = new PrismaClient();

async function main() {
  console.log(`\n=== feeSnapshot backfill — ${APPLY ? "APPLY (writing)" : "DRY RUN (no writes)"} ===\n`);

  const all = await prisma.predictionMarket.findMany({
    select: { id: true, titleEn: true, status: true, settledAt: true, yesPool: true, noPool: true, feeSnapshot: true },
  });

  const alreadyStamped = all.filter((m) => m.feeSnapshot != null);
  // Settled = the money has moved. Do not touch.
  const settled = all.filter((m) => m.feeSnapshot == null && (m.settledAt != null || m.status === "RESOLVED" || m.status === "VOIDED"));
  // In flight = pool still intact, positions still open. These get the snapshot.
  const inFlight = all.filter((m) => m.feeSnapshot == null && m.settledAt == null && m.status !== "RESOLVED" && m.status !== "VOIDED");

  console.log(`Total markets            : ${all.length}`);
  console.log(`Already have a snapshot  : ${alreadyStamped.length}  (skipped — idempotent)`);
  console.log(`Settled / resolved       : ${settled.length}  (LEFT ALONE — history is history)`);
  console.log(`LIVE / OPEN to backfill  : ${inFlight.length}\n`);

  if (inFlight.length === 0) {
    console.log("Nothing to do.\n");
    return;
  }

  // Show exactly what each affected poll gains. This is the number Ali will want:
  // not "we migrated N rows" but "these players are now paid this much more".
  console.log("Effect on each in-flight poll (old fee -> new fee, on today's pools):\n");
  let totalOldFee = 0, totalNewFee = 0, wouldHaveUnderpaid = 0;

  for (const m of inFlight) {
    const yes = Number(m.yesPool), no = Number(m.noPool);
    const pool = yes + no, smaller = Math.min(yes, no);
    const oldFee = LEGACY_COMMISSION_RATE * pool;                        // uncapped — what they'd have paid
    const newFee = poolFee(yes, no, LEGACY_SNAPSHOT).fee;                // capped
    totalOldFee += oldFee; totalNewFee += newFee;

    // Under the old rule, was the fee bigger than the entire prize? If so, every
    // winner on this poll was mathematically guaranteed to lose money.
    const wasBroken = smaller > 0 && oldFee > smaller;
    if (wasBroken) wouldHaveUnderpaid++;

    const flag = wasBroken ? "  <-- WINNERS WOULD HAVE LOST MONEY" : newFee < oldFee ? "  (fee reduced)" : "";
    console.log(
      `  ${m.id.slice(0, 12).padEnd(12)} ${m.status.padEnd(7)} ` +
      `pool ${Math.round(pool).toLocaleString().padStart(10)}  ` +
      `smaller ${Math.round(smaller).toLocaleString().padStart(9)}  ` +
      `fee ${Math.round(oldFee).toLocaleString().padStart(8)} -> ${Math.round(newFee).toLocaleString().padStart(8)}${flag}`,
    );
  }

  console.log(`\n  Fee across all in-flight polls: ${Math.round(totalOldFee).toLocaleString()} -> ${Math.round(totalNewFee).toLocaleString()}`);
  console.log(`  Returned to players:            ${Math.round(totalOldFee - totalNewFee).toLocaleString()} TZS`);
  console.log(`  Polls where winners would have been paid below their stake: ${wouldHaveUnderpaid}`);

  if (!APPLY) {
    console.log(`\nDRY RUN — nothing written. Re-run with --apply to stamp ${inFlight.length} row(s).\n`);
    return;
  }

  let written = 0;
  for (const m of inFlight) {
    await prisma.predictionMarket.update({
      where: { id: m.id },
      data: { feeSnapshot: LEGACY_SNAPSHOT as never },
    });
    written++;
  }
  console.log(`\nAPPLIED — stamped ${written} row(s). Settled markets untouched (${settled.length}).\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
