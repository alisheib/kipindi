/**
 * One-shot pre-launch testing float. Run DELIBERATELY via `npm run ops:seed-test-float`.
 *
 * 🔴 IT CAME OFF THE `start` COMMAND ON 2026-09-11 (E-380) — DO NOT PUT IT BACK.
 * It used to run on every production boot: every deploy, every restart, every crash-loop
 * iteration. The two refusals below did hold, and were verified holding on the first boot
 * after the pre-launch reset — but **both are Railway SERVICE VARIABLES, not code.** An env
 * var can be changed with no deploy, no diff and no review, and the refusal runs in a
 * separate node process before `next start`, so nothing in Next.js supplies `NODE_ENV` —
 * only the service config does. Five admin wallets sat at exactly the floor below, so this
 * had already fired against production at least once.
 * ⭐ "Guarded by two env vars" describes a CONFIGURATION; "not reachable from the boot path"
 * describes a DESIGN. A script that can mint money into every wallet has no business being
 * one mis-set variable away from running itself on a platform holding real player balances.
 * The refusals stay as defence in depth; they are no longer the only thing standing there.
 *
 * When TEST_FUNDING="true": top every ACTIVE wallet UP to a TZS 1,000,000 floor.
 * Idempotent (only raises balances below the floor, never reduces), skips
 * frozen/closed wallets, and is a no-op when TEST_FUNDING isn't set or there's
 * no DATABASE_URL. NEVER exits non-zero — it must not block `next start`.
 *
 * ⚠️ The line above about being "run from the `start` command" was true until 2026-09-11 and
 * is not any more — see the note at the top. It is kept here because the sentence explains
 * WHY the script was written the way it is (no login required, runs where DATABASE_URL is
 * reachable), which is still the reason it exists at all.
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
