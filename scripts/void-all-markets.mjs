/**
 * void-all-markets.mjs — Testing utility. Voids ALL live/closed markets
 * and refunds every open position's stake back to the player's wallet.
 *
 * Usage:  railway run node scripts/void-all-markets.mjs
 *
 * This is a one-shot script, NOT an API endpoint. It bypasses the
 * two-officer rule because it's an operator-initiated testing reset.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  // 1. Find all non-terminal markets
  const markets = await prisma.predictionMarket.findMany({
    where: { status: { in: ["LIVE", "CLOSED"] } },
  });

  console.log(`Found ${markets.length} markets to void (LIVE + CLOSED).`);
  if (markets.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let totalRefunded = 0;
  let positionsRefunded = 0;

  for (const m of markets) {
    // 2. Find all OPEN positions on this market
    const positions = await prisma.position.findMany({
      where: { marketId: m.id, status: "OPEN" },
    });

    // 3. Refund each position
    for (const p of positions) {
      const wallet = await prisma.wallet.findFirst({ where: { userId: p.userId } });
      if (!wallet) {
        console.warn(`  No wallet for user ${p.userId}, skipping position ${p.id}`);
        continue;
      }

      const stakeNum = Number(p.stake);

      // Credit the stake back
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: stakeNum } },
      });

      // Mark position as voided
      await prisma.position.update({
        where: { id: p.id },
        data: {
          status: "VOID",
          finalPayout: stakeNum,
          settledAt: now,
        },
      });

      // Record the refund transaction
      const txnId = `txn_void_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await prisma.transaction.create({
        data: {
          id: txnId,
          walletId: wallet.id,
          userId: p.userId,
          type: "BET_REFUND",
          status: "CONFIRMED",
          amount: stakeNum,
          fee: 0,
          taxWithheld: 0,
          balanceAfter: Number(wallet.balance) + stakeNum,
          currency: "TZS",
          provider: "INTERNAL",
          description: `Bulk void refund: "${m.titleEn.slice(0, 60)}"`,
          betId: p.id,
          createdAt: now,
          updatedAt: now,
          completedAt: now,
        },
      });

      totalRefunded += stakeNum;
      positionsRefunded++;
    }

    // 4. Void the market
    await prisma.predictionMarket.update({
      where: { id: m.id },
      data: {
        status: "VOIDED",
        resolvedOutcome: "VOID",
        updatedAt: now,
      },
    });

    console.log(`  Voided ${m.id} "${m.titleEn.slice(0, 50)}" — ${positions.length} positions refunded`);
  }

  // 5. Also clear pending AI polls (unreviewed)
  const deletedPolls = await prisma.aIPoll.deleteMany({
    where: { state: { in: ["GENERATING", "PENDING_REVIEW", "APPROVED", "EDITING"] } },
  });

  // 6. Clear market candidates
  const deletedCandidates = await prisma.marketCandidate.deleteMany({
    where: { state: { in: ["EXTRACTED", "VERIFYING", "SCORED", "PENDING_REVIEW", "APPROVED"] } },
  });

  console.log(`\nDone.`);
  console.log(`  Markets voided: ${markets.length}`);
  console.log(`  Positions refunded: ${positionsRefunded}`);
  console.log(`  Total TZS refunded: ${totalRefunded.toLocaleString()}`);
  console.log(`  AI polls cleared: ${deletedPolls.count}`);
  console.log(`  Candidates cleared: ${deletedCandidates.count}`);
  console.log(`\nNext sentinel sweep will find 0 LIVE markets — $0 cost.`);
}

main()
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
