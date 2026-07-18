/**
 * One-shot pre-launch testing float, run from the `start` command (inside the
 * Railway container, where DATABASE_URL is reachable) so EXISTING accounts are
 * funded without each having to log in.
 *
 * When TEST_FUNDING="true": top every ACTIVE wallet UP to a TZS 1,000,000 floor.
 * Idempotent (only raises balances below the floor, never reduces), skips
 * frozen/closed wallets, and is a no-op when TEST_FUNDING isn't set or there's
 * no DATABASE_URL. NEVER exits non-zero — it must not block `next start`.
 *
 * Turn off before real-money launch: unset TEST_FUNDING (the DB is also
 * formatted at go-live, so no float carries over).
 *
 * ⛔ POST-GO-LIVE (2026-07-18): the platform now holds REAL player money, so
 * TEST_FUNDING alone is no longer an acceptable last line of defence — one
 * mis-set Railway variable would mint TZS 1,000,000 into every real wallet and
 * permanently unbalance the ledger. The seeder therefore ALSO refuses outright
 * when NODE_ENV === "production", regardless of TEST_FUNDING. There is now no
 * env combination that mints money on the live deployment. Pre-launch use on a
 * non-production build is unaffected.
 */
const FLOOR = 1_000_000;

async function main() {
  // Hard refusal FIRST — before the TEST_FUNDING read, so no flag can reach it.
  if (process.env.NODE_ENV === "production") {
    console.log("[test-float] NODE_ENV=production — REFUSING to mint test float, skipping wallet top-up.");
    return;
  }
  if (process.env.TEST_FUNDING !== "true") {
    console.log("[test-float] TEST_FUNDING not 'true' — skipping wallet top-up.");
    return;
  }
  if (!process.env.DATABASE_URL) {
    console.log("[test-float] no DATABASE_URL — skipping (memory store / local dev).");
    return;
  }
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const wallets = await prisma.wallet.findMany({ where: { status: "ACTIVE" } });
    let funded = 0;
    for (const w of wallets) {
      if (Number(w.balance) >= FLOOR) continue;
      await prisma.wallet.update({ where: { id: w.id }, data: { balance: FLOOR } });
      funded++;
    }
    console.log(`[test-float] topped ${funded}/${wallets.length} active wallets up to TZS ${FLOOR.toLocaleString()}.`);
  } catch (err) {
    console.error("[test-float] top-up failed (continuing to boot):", err?.message ?? err);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

await main();
process.exit(0);
