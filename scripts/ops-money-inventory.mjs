#!/usr/bin/env node
/**
 * MONEY INVENTORY — read-only pre-flight before any rebaseline / go-live step.
 *
 * Answers the one question that governs whether the database may be reset:
 *   "Has any REAL money already moved through a payment gateway?"
 * A real movement is a CONFIRMED DEPOSIT/WITHDRAWAL that carries a providerRef on
 * a real MNO/card rail. Once such a row exists it is the proof of what the platform
 * owes its players while the cash sits in the aggregator's float — from that moment
 * the database must NEVER be rebaselined.
 *
 * This script only SELECTs. It writes nothing and deletes nothing.
 *
 *   DATABASE_URL=... node scripts/ops-money-inventory.mjs
 */
import { PrismaClient } from "@prisma/client";

const DB = process.env.DATABASE_URL;
if (!DB) { console.error("FATAL: DATABASE_URL is not set."); process.exit(1); }
const host = (() => { try { return new URL(DB).host; } catch { return "unparseable"; } })();

const prisma = new PrismaClient();
const money = (n) => `TZS ${Number(n ?? 0).toLocaleString()}`;
const line = () => console.log("-".repeat(72));

line();
console.log(`  MONEY INVENTORY (read-only) — ${host}`);
line();

const [users, wallets, txns, ledger, positions, bonuses, audits] = await Promise.all([
  prisma.user.count(), prisma.wallet.count(), prisma.transaction.count(),
  prisma.ledgerEntry.count(), prisma.position.count(), prisma.bonusGrant.count(),
  prisma.auditLog.count(),
]);
const sums = await prisma.wallet.aggregate({ _sum: { balance: true, hold: true, pending: true, bonusBalance: true } });

console.log(`  users ............ ${users}`);
console.log(`  wallets .......... ${wallets}`);
console.log(`  transactions ..... ${txns}`);
console.log(`  ledger entries ... ${ledger}`);
console.log(`  positions ........ ${positions}`);
console.log(`  bonus grants ..... ${bonuses}`);
console.log(`  audit entries .... ${audits}`);
console.log(`  wallet totals .... balance ${money(sums._sum.balance)} · hold ${money(sums._sum.hold)} · pending ${money(sums._sum.pending)} · bonus ${money(sums._sum.bonusBalance)}`);
line();

const GATEWAY_RAILS = ["MPESA", "TIGO_PESA", "AIRTEL_MONEY", "HALO_PESA", "MIXX", "TTCL_PESA", "CARD", "BANK_TRANSFER"];
const real = await prisma.transaction.findMany({
  where: {
    type: { in: ["DEPOSIT", "WITHDRAWAL"] },
    status: "CONFIRMED",
    providerRef: { not: null },
    provider: { in: GATEWAY_RAILS },
  },
  select: { id: true, type: true, amount: true, provider: true, providerRef: true, createdAt: true },
  orderBy: { createdAt: "asc" },
});

// Anything still moving is also decision-relevant: you cannot call a database
// "clean" while a payment is mid-flight at the gateway.
const inFlight = await prisma.transaction.count({ where: { status: { in: ["PROCESSING", "PENDING", "AML_REVIEW"] } } });

if (real.length === 0) {
  console.log("  \x1b[32mNO REAL GATEWAY MONEY.\x1b[0m Safe to rebaseline to genesis.");
} else {
  console.log(`  \x1b[31mREAL GATEWAY MONEY PRESENT — ${real.length} settled movement(s).\x1b[0m`);
  console.log("  DO NOT rebaseline: these rows are the record of what players are owed.\n");
  let net = 0;
  for (const r of real.slice(0, 25)) {
    net += Number(r.amount);
    console.log(`    ${r.createdAt.toISOString()}  ${r.type.padEnd(10)} ${money(r.amount).padStart(16)}  ${r.provider}  ${r.providerRef}`);
  }
  if (real.length > 25) console.log(`    ... and ${real.length - 25} more`);
  console.log(`\n  net across shown rows: ${money(net)}`);
}
console.log(`  in-flight (PROCESSING/PENDING/AML_REVIEW): ${inFlight}`);
line();

await prisma.$disconnect();
