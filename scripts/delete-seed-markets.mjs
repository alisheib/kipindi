/**
 * One-off cleanup: void + delete all system-seeded markets (proposedBy = "system").
 * Run via: railway run node scripts/delete-seed-markets.mjs
 *
 * For LIVE/CLOSED markets: refunds every OPEN position, then marks VOIDED.
 * For RESOLVED/VOIDED/DRAFT markets: deletes directly.
 * Positions cascade-delete with the market (onDelete: Cascade in schema).
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

function randomId(n = 12) {
  return randomBytes(n).toString("hex").slice(0, n);
}

async function main() {
  console.log("Finding all system-seeded markets (proposedBy = 'system')...");

  const markets = await prisma.predictionMarket.findMany({
    where: { proposedBy: "system" },
    include: {
      positions: { where: { status: "OPEN" } },
    },
  });

  console.log(`Found ${markets.length} seed markets.`);
  if (markets.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  let voided = 0;
  let refundedPositions = 0;
  let refundedTzs = 0;
  let deleted = 0;

  for (const m of markets) {
    const isActive = m.status === "LIVE" || m.status === "CLOSED";
    const openPositions = m.positions;

    if (isActive && openPositions.length > 0) {
      console.log(`  Voiding "${m.titleEn.slice(0, 60)}" — ${openPositions.length} open positions...`);

      for (const pos of openPositions) {
        const stake = Number(pos.stake);

        // Find or skip wallet
        const wallet = await prisma.wallet.findUnique({ where: { userId: pos.userId } });
        if (!wallet) {
          console.warn(`    No wallet for user ${pos.userId} — skipping refund`);
          continue;
        }

        const now = new Date();
        const balanceAfter = Number(wallet.balance) + stake;

        // Credit wallet
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: stake } },
        });

        // Record refund transaction
        await prisma.transaction.create({
          data: {
            id: `txn_${randomId(12)}`,
            walletId: wallet.id,
            userId: pos.userId,
            type: "BET_REFUND",
            status: "CONFIRMED",
            amount: stake,
            fee: 0,
            taxWithheld: 0,
            balanceAfter,
            currency: "TZS",
            provider: "INTERNAL",
            description: `Seed cleanup refund · "${m.titleEn.slice(0, 60)}"`,
            betId: pos.id,
            createdAt: now,
            updatedAt: now,
            completedAt: now,
          },
        });

        // Mark position VOID
        await prisma.position.update({
          where: { id: pos.id },
          data: { status: "VOID", finalPayout: stake, settledAt: now },
        });

        refundedPositions++;
        refundedTzs += stake;
      }

      // Mark market VOIDED
      await prisma.predictionMarket.update({
        where: { id: m.id },
        data: {
          status: "VOIDED",
          resolvedOutcome: "VOID",
          yesPool: 0,
          noPool: 0,
        },
      });
      voided++;
    }

    // Delete the market (positions cascade)
    await prisma.predictionMarket.delete({ where: { id: m.id } });
    deleted++;
    console.log(`  Deleted: "${m.titleEn.slice(0, 70)}"`);
  }

  console.log("\nDone.");
  console.log(`  Markets deleted:   ${deleted}`);
  console.log(`  Markets voided:    ${voided} (before deletion)`);
  console.log(`  Positions refunded: ${refundedPositions}`);
  console.log(`  TZS refunded:      ${refundedTzs.toLocaleString("en-US")}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
