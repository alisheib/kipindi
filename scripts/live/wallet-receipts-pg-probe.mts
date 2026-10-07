/**
 * RECEIPTS ON A REAL POSTGRES — the Prisma twin of `db.txn.findByUserTypes`, which no in-memory suite executes.
 *
 * ⭐ WHY THIS EXISTS. `test:wallet-receipts` proves the MEMORY twin (own rows only, deposits and withdrawals only, newest
 * first, ties broken by id) and holds the Prisma twin's SHAPE as source. Whether `type: { in: [...] }` really leaves a
 * stake or a bonus out, whether `orderBy: [createdAt desc, id desc]` really breaks a same-millisecond tie the way the
 * memory twin does, and whether `take` really stops at the limit are facts about the database. This writes a small book to
 * a scratch Postgres through the REAL `db` and reads it back, element by element, against answers written here by hand.
 *
 * Run (through the heavy-node lock; it needs a migrated EMPTY database):
 *   npm run db:probe-wallet-receipts   (db-scratch boots Postgres; scripts/live/pg-probe-run.mts migrates it and runs this)
 */
process.exitCode = 1;
if (!process.env.DATABASE_URL) {
  console.error("wallet-receipts-pg-probe: needs DATABASE_URL (a scratch Postgres) — refusing to run on the memory twin, which proves nothing here.");
  process.exit(2);
}
{
  // ⛔ A LOOPBACK CLUSTER ONLY: this probe writes accounts, wallets and transactions.
  let host = "";
  try { host = new URL(process.env.DATABASE_URL).hostname; } catch { /* refused below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error("wallet-receipts-pg-probe: refusing — it writes rows, and runs only against a loopback scratch cluster (db-scratch).");
    process.exit(2);
  }
}

const { db } = await import("../../src/lib/server/store.ts");
const { RECEIPT_TYPES } = await import("../../src/lib/wallet/receipts.ts");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { if (c) pass++; else fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const json = (v: unknown) => JSON.stringify(v);

const mkUser = async (id: string, phone: string) => {
  await db.user.create({
    id, phoneE164: phone, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null,
    acceptedTermsVersion: "v1", acceptedTermsAt: "2026-08-01T08:00:00.000Z", marketingOptIn: false, twoFactorEnabled: false,
    avatarDataUrl: null, createdAt: "2026-08-01T08:00:00.000Z", updatedAt: "2026-08-01T08:00:00.000Z", lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE",
    createdAt: "2026-08-01T08:00:00.000Z", updatedAt: "2026-08-01T08:00:00.000Z" } as never);
};
await mkUser("probe_rc_me", "+255751200001");
await mkUser("probe_rc_other", "+255751200002");

const txn = (id: string, userId: string, type: string, status: string, at: string) => db.txn.create({
  id, walletId: `wal_${userId}`, userId, type, status, amount: type === "WITHDRAWAL" || type === "BET_PLACED" ? -5_000 : 5_000,
  fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: null, msisdn: null, description: "probe",
  positionId: null, amlReason: null, createdAt: at, updatedAt: at, completedAt: null, idempotencyKey: null,
} as never);
await txn("probe_rc_d1", "probe_rc_me", "DEPOSIT", "CONFIRMED", "2026-10-01T08:00:00.000Z");
await txn("probe_rc_b1", "probe_rc_me", "BET_PLACED", "CONFIRMED", "2026-10-02T08:00:00.000Z");
await txn("probe_rc_w1", "probe_rc_me", "WITHDRAWAL", "PROCESSING", "2026-10-03T08:00:00.000Z");
await txn("probe_rc_x1", "probe_rc_me", "BONUS_CREDIT", "CONFIRMED", "2026-10-03T09:00:00.000Z");
await txn("probe_rc_h1", "probe_rc_me", "HOUSE_FEE", "CONFIRMED", "2026-10-03T10:00:00.000Z");
await txn("probe_rc_o1", "probe_rc_other", "DEPOSIT", "CONFIRMED", "2026-10-04T08:00:00.000Z");
// Two rows at the SAME instant — the tie must break by id, descending, exactly as the memory twin breaks it.
await txn("probe_rc_tie_a", "probe_rc_me", "DEPOSIT", "FAILED", "2026-09-28T08:00:00.000Z");
await txn("probe_rc_tie_b", "probe_rc_me", "DEPOSIT", "CANCELLED", "2026-09-28T08:00:00.000Z");

const got = (await db.txn.findByUserTypes("probe_rc_me", RECEIPT_TYPES, 50)) as Array<{ id: string; userId: string; type: string }>;
ok("1 · ★ only this player's rows reach Postgres's answer", got.length > 0 && got.every((t) => t.userId === "probe_rc_me"), json(got.map((t) => t.userId)));
ok("2 · ★ only deposits and withdrawals — the stake, the bonus and the fee stay out", got.every((t) => t.type === "DEPOSIT" || t.type === "WITHDRAWAL"), json(got.map((t) => t.type)));
ok("3 · ★ newest first, the same-instant pair broken by id descending (the memory twin's order)",
  json(got.map((t) => t.id)) === json(["probe_rc_w1", "probe_rc_d1", "probe_rc_tie_b", "probe_rc_tie_a"]), json(got.map((t) => t.id)));
const two = (await db.txn.findByUserTypes("probe_rc_me", RECEIPT_TYPES, 2)) as Array<{ id: string }>;
ok("4 · the limit is kept", json(two.map((t) => t.id)) === json(["probe_rc_w1", "probe_rc_d1"]), json(two.map((t) => t.id)));
const none = (await db.txn.findByUserTypes("probe_rc_nobody", RECEIPT_TYPES, 50)) as unknown[];
ok("5 · an account with no rows reads an empty list, not an error", Array.isArray(none) && none.length === 0);

console.log(`\nwallet-receipts-pg-probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
