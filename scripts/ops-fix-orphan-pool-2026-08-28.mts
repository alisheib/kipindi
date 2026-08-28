/**
 * ONE-OFF · correct an orphaned market pool left by the bulk-resolve fleet minter.
 *
 * 🔴 WHAT HAPPENED, 2026-08-28, AND IT WAS MY OWN DOING. The first run of
 * `ops-bulk-resolve-fleet.mts mint` crashed part-way through its FIRST fixture
 * (`marketStore.stamp` refuses `resolutionAt`, correctly). Two QA-fleet stakes of TZS 1,000
 * had already been placed through the real money path. `destroy` then refunded the two
 * wallets with a raw `prisma.wallet.update` and deleted the market — the positions
 * cascade-deleted with it.
 *
 * ⛔ THE WALLETS WERE MADE WHOLE. THE LEDGER WAS NOT. Two `STAKE_DEBIT` groups still stand:
 *
 *     PLAYER:usr_393c…  −1000     POOL:mkt_2a46dfa364b520fa1094  +1000
 *     PLAYER:usr_ed31…  −1000     POOL:mkt_2a46dfa364b520fa1094  +1000
 *
 * so the books claim TZS 2,000 is held in escrow for a market that does not exist, while the
 * money is back in two wallets. ⚠️ AND `house-money.cjs` STILL SAYS "the books balance":
 * every entry sums to zero because BOTH halves of each pair are present. A grand total of
 * zero is not the same statement as "every account means what it says" — this is exactly the
 * shape an unledgered credit takes, which is why `ops-qa-fleet.mts` refuses to touch
 * `Wallet.balance` directly and why `ops-clear-unledgered-credit.mjs` exists.
 *
 * ⭐ THE FIX IS A DELTA, NOT A REPLAY. It posts the REFUND pair that the void path would
 * have posted — POOL debited, PLAYER credited — computed from what the pool account
 * ACTUALLY holds right now, not from a remembered figure. If the pool is already flat the
 * script does nothing and says so: a restore that replays a fixed amount is how an earlier
 * incident over-credited 794,906.
 *
 * ⛔ It does NOT touch any wallet. The wallets are already correct; this only makes the
 * ledger agree with them.
 *
 *   npx tsx scripts/ops-fix-orphan-pool-2026-08-28.mts --dry
 *   npx tsx scripts/ops-fix-orphan-pool-2026-08-28.mts --apply
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(join(process.cwd(), ".env.qa.local"), "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_0-9]+)=(.*)$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
process.env.DATABASE_URL = process.env.PROD_DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL ?? "";
if (!process.env.DATABASE_URL) { console.error("no DATABASE_URL"); process.exit(2); }

const { prisma: prismaFn } = await import("../src/lib/server/prisma.ts");
const { audit } = await import("../src/lib/server/audit.ts");
const prisma = prismaFn();
if (!prisma) { console.error("no prisma client"); process.exit(2); }

const APPLY = process.argv.includes("--apply");
const MARKET = "mkt_2a46dfa364b520fa1094";
const POOL = `POOL:${MARKET}`;

// The market must genuinely be gone — otherwise this is not an orphan and the right remedy
// is the void path, not a correction.
const still = await prisma.predictionMarket.findUnique({ where: { id: MARKET }, select: { id: true } });
if (still) { console.error(`REFUSING: market ${MARKET} still exists. Void it through the engine instead.`); process.exit(1); }

const rows = await prisma.ledgerEntry.findMany({
  where: { account: POOL },
  select: { id: true, groupId: true, amount: true, entryType: true, userId: true, txnId: true },
});
const held = rows.reduce((s, r) => s + Number(r.amount), 0);
console.log(`${POOL}: ${rows.length} entries, net ${held}`);
if (Math.abs(held) < 0.005) { console.log("pool is already flat — nothing to correct."); process.exit(0); }

// Who to credit, and by how much: the DELTA each player's own stake left behind.
const byUser = new Map<string, number>();
for (const r of rows) {
  if (r.entryType !== "STAKE_DEBIT" || !r.userId) continue;
  byUser.set(r.userId, (byUser.get(r.userId) ?? 0) + Number(r.amount));
}
const total = [...byUser.values()].reduce((a, b) => a + b, 0);
console.log("correction plan (POOL debited, PLAYER credited):");
for (const [u, amt] of byUser) console.log(`  ${u}  +${amt}`);
if (Math.abs(total - held) > 0.005) {
  console.error(`REFUSING: the per-player stakes (${total}) do not account for the whole pool (${held}).`);
  process.exit(1);
}
if (!APPLY) { console.log("\n--dry — nothing written."); process.exit(0); }

for (const [userId, amt] of byUser) {
  const groupId = `orphanfix_${MARKET}_${userId.slice(-8)}`;
  const exists = await prisma.ledgerEntry.findFirst({ where: { groupId }, select: { id: true } });
  // ⛔ IDEMPOTENT. A re-run must not post the pair twice — the group id is derived, not random.
  if (exists) { console.log(`  ${userId}: already corrected, skipping`); continue; }
  await prisma.ledgerEntry.createMany({
    data: [
      { id: `led_${groupId}_a`, groupId, account: POOL, entryType: "REFUND", amount: -amt, currency: "TZS", userId, marketId: MARKET, memo: "Correction — orphaned QA pool, wallet already refunded" },
      { id: `led_${groupId}_b`, groupId, account: `PLAYER:${userId}`, entryType: "REFUND", amount: amt, currency: "TZS", userId, marketId: MARKET, memo: "Correction — QA stake returned outside the ledger, booked here" },
    ],
  });
  console.log(`  ${userId}: corrected +${amt}`);
}

audit({
  category: "SYSTEM",
  action: "ledger.orphan_pool_corrected",
  actorId: "ops-bulk-resolve-drive",
  targetType: "Market",
  targetId: MARKET,
  payload: {
    pool: POOL, correctedTzs: held, perUser: Object.fromEntries(byUser),
    note: "A QA fixture market was deleted while two stakes were live; the wallets were refunded outside the ledger, leaving the pool account holding money for a market that no longer exists. This posts the REFUND pair the void path would have written. No wallet was touched — the wallets were already correct.",
  },
});

const after = await prisma.ledgerEntry.aggregate({ where: { account: POOL }, _sum: { amount: true } });
console.log(`\n${POOL} now nets ${Number(after._sum.amount ?? 0)}`);
await prisma.$disconnect();
