/**
 * One-off cleanup: void + delete all system-seeded markets (proposedBy = "system").
 * Run via: railway run node scripts/delete-seed-markets.mjs
 *
 * For LIVE/CLOSED markets: refunds every OPEN position, then marks VOIDED.
 * For RESOLVED/VOIDED/DRAFT markets: deletes directly.
 * Positions cascade-delete with the market (onDelete: Cascade in schema).
 *
 * ⛔ THIS FILE IS THE ONE PLACE IN THE REPOSITORY THAT WRITES A POSITIONED `Transaction` ROW AROUND THE DAL, and it
 * carried two defects at once (C5-7's review). Both are fixed here; the shape is pinned by
 * `test:house-bot-reports` 0.232.5, which reads every `prisma.transaction.create` in tracked `scripts/**` the same
 * way ruling 232 reads `src/**`.
 *
 *  1. 🔴 IT COULD NOT RUN. The row was written with `betId: pos.id`. Migration
 *     `20260702120000_rename_betid_to_positionid` renamed `Transaction.betId` → `positionId` on 2026-07-02 and this
 *     script was last touched 2026-06-22, so line 66 threw `PrismaClientValidationError: Unknown argument betId` —
 *     AFTER the wallet had already been credited on its own statement, with no `$transaction` and no `try`. The
 *     player kept the money, the position stayed OPEN, the market was not VOIDED, no ledger row existed, and a
 *     re-run refunded the same position again. The three writes are now ONE `prisma.$transaction`, so a refund is
 *     all of it or none of it.
 *  2. ⛔ IT DROPPED THE HOUSE MARKER (owner ruling D19 / PLAN §2 I3). `houseBotId` is copied by hand at every
 *     positioned write, and repairing (1) alone would have made every house-marked position it refunds write an
 *     UNMARKED money row: visible in the holder's own wallet activity (`findByUser`'s `excludeHouseBets` filter
 *     drops rows where `houseBotId IS NOT NULL`, so a NULL marker is KEPT) and missing from the house book's
 *     `returned` (`house-bot-dal.ts`'s day rows require `houseBotId IS NOT NULL`), understating what came back to
 *     that bot. The marker is read from `pos` — the same row whose id is this write's `positionId`, which is
 *     ruling 232's rule.
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

        // ⛔ ONE TRANSACTION, THREE WRITES. The credit, the ledger row and the VOID are the same fact; committing
        // the credit on its own statement is how this script used to pay a player twice for one position.
        await prisma.$transaction([
          // Credit wallet
          prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: stake } },
          }),
          // Record refund transaction
          prisma.transaction.create({
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
              positionId: pos.id,
              // ⛔ The marker comes from the SAME row whose id is this write's positionId (ruling 232).
              ...(pos.houseBotId ? { houseBotId: pos.houseBotId } : {}),
              createdAt: now,
              updatedAt: now,
              completedAt: now,
            },
          }),
          // Mark position VOID
          prisma.position.update({
            where: { id: pos.id },
            data: { status: "VOID", finalPayout: stake, settledAt: now },
          }),
        ]);

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
