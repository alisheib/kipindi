/**
 * Wallet atomic-adjust unit tests (in-memory store; no DATABASE_URL).
 * Verifies the money-safe mutation primitive: delta application, overdraw guard,
 * hold moves, and that a failed guard leaves the balance untouched.
 *
 * (In production db.wallet.adjust maps to a single conditional updateMany —
 * DB-atomic increment/decrement with a WHERE balance>=n guard — so the guard
 * semantics tested here are enforced atomically under real concurrency.)
 */
import { db } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}`); }
}

const now = new Date().toISOString();
// `await` is load-bearing on Postgres: the in-memory DAL returns synchronously,
// the Prisma twin returns a Promise. Without it this suite passes in memory and
// tests nothing at all against a real database.
await db.wallet.create({ id: "wlt_t", userId: "usr_t", balance: 1000, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });

// 1. Credit applies a positive delta.
ok("credit +500 -> 1500", (await db.wallet.adjust("wlt_t", { balance: 500 }))?.balance === 1500);

// 2. Guarded debit succeeds when funds suffice.
ok("debit 300 -> 1200", (await db.wallet.adjust("wlt_t", { balance: -300 }, { requireBalanceGte: 300 }))?.balance === 1200);

// 3. Guarded debit is REJECTED (null) when it would overdraw…
ok("overdraw rejected -> null", (await db.wallet.adjust("wlt_t", { balance: -5000 }, { requireBalanceGte: 5000 })) === null);
// …and the balance is untouched.
ok("balance unchanged after reject", (await db.wallet.findByUserId("usr_t"))?.balance === 1200);

// 4. Combined balance→hold move (withdraw initiation), overdraw-guarded.
{
  const w = await db.wallet.adjust("wlt_t", { balance: -200, hold: 200 }, { requireBalanceGte: 200 });
  ok("debit+hold: balance 1000, hold 200", w?.balance === 1000 && w?.hold === 200);
}

// 5. Hold release (settlement / approval).
ok("hold released -> 0", (await db.wallet.adjust("wlt_t", { hold: -200 }))?.hold === 0);

// 6. Exact-balance debit allowed (gte boundary).
ok("debit exact balance ok", (await db.wallet.adjust("wlt_t", { balance: -1000 }, { requireBalanceGte: 1000 }))?.balance === 0);

// 7. Missing wallet -> null.
ok("missing wallet -> null", (await db.wallet.adjust("wlt_missing", { balance: 1 })) === null);

console.log(`\nwallet-atomic: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
