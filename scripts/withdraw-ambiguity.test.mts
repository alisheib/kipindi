/** Accepted payout with an unpersisted provider identity must keep its original
 * hold/key/transaction visible and refuse another dispatch. Memory and scratch PG. */
process.env.EMAIL_OUTBOX_CAPTURE = "1";
import { readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PG = process.argv.includes("--pg");
if (process.env.NODE_ENV === "production" || (!!process.env.DATABASE_URL !== PG))
  throw new Error("withdraw-ambiguity requires memory or explicit --pg on scratch PostgreSQL");
if (PG) {
  const target = new URL(process.env.DATABASE_URL!);
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(target.hostname)
    || target.port !== String(process.env.KP_SCRATCH_PORT ?? 5433)) throw new Error("Not a reserved loopback PostgreSQL port");
}
const { db } = await import("../src/lib/server/store.ts");
const { prisma } = await import("../src/lib/server/prisma.ts");
if (PG) {
  const rows = await prisma()!.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory");
  const normal = (p: string) => realpathSync(p).replace(/\\/g, "/").toLowerCase();
  if (normal(rows[0]?.data_directory ?? "") !== normal(join(ROOT, ".pgscratch")))
    throw new Error("Refusing another checkout's PostgreSQL cluster");
}
const { withdraw, settlePaymentWebhook } = await import("../src/lib/server/wallet-service.ts");
const { setPaymentControls } = await import("../src/lib/server/payment-control.ts");
await setPaymentControls({ provider: "mock" }, "s9-test");

let serial = 0;
const now = () => new Date().toISOString();
async function account() {
  const index = ++serial, id = `s9_wda_${index}`, digits = `76${String(index).padStart(7, "0")}`;
  await db.user.create({ id, phoneE164: `+255${digits}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: "Payout recovery fixture", dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1",
    acceptedTermsAt: now(), marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: `${id}@t.tz`, emailVerifiedAt: now(), createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 100_000, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as never);
  await db.kyc.upsert({ id: `kyc_${id}`, userId: id, status: "APPROVED", rejectReason: null, rejectNote: null,
    idType: "NIDA", idNumber: `199001014${String(index).padStart(11, "0")}`, idExpiry: null,
    idVerifiedAt: now(), fullName: "Payout Recovery", dob: "1990-01-01", documents: [], reviewerId: null,
    reviewedAt: now(), submittedAt: now(), approvedAt: now(), createdAt: now(), updatedAt: now() });
  return { id, input: { provider: "MPESA" as const, amount: 20_000, msisdn: digits } };
}
const payouts = async (owner: string) => (await db.txn.listForUser(owner)).filter(t => t.type === "WITHDRAWAL");
const checks: Array<[string, boolean]> = [];
const ok = (name: string, pass: boolean) => checks.push([name, pass]);

const a = await account(), originalKey = "s9-withdraw-ambiguous-1", newKey = "s9-withdraw-new-intent-1";
let acceptedRef: string | null = null, referenceWrites = 0;
const update = db.txn.update;
(db.txn as any).update = async (...args: any[]) => {
  if (args[1]?.providerRef && String(args[0]).startsWith("txn_")) {
    acceptedRef = args[1].providerRef; referenceWrites++;
    return null; // provider accepted, but persistence answer was lost
  }
  return (update as (...xs: any[]) => any)(...args);
};
let first: Awaited<ReturnType<typeof withdraw>>;
try { first = await withdraw(a.id, a.input, originalKey); }
finally { (db.txn as any).update = update; }
const row = (await payouts(a.id))[0], wallet = await db.wallet.findByUserId(a.id);
ok("accepted-write-null.original-reservation-and-hold", !first.ok && first.code === "BUSY"
  && first.txnId === row?.id && row?.idempotencyKey === originalKey && row?.status === "PROCESSING"
  && row.providerRef === null && wallet?.balance === 80_000 && wallet.hold === 20_000 && referenceWrites === 1);
const callback = await settlePaymentWebhook({ providerRef: acceptedRef!, status: "CONFIRMED", amount: 20_000 });
ok("callback-before-reference.no-false-settlement", !callback.handled && callback.reason === "unknown-reference"
  && (await db.txn.findById(row.id))?.status === "PROCESSING" && (await db.wallet.findByUserId(a.id))?.hold === 20_000);
const same = await withdraw(a.id, a.input, originalKey), fresh = await withdraw(a.id, a.input, newKey);
ok("same-key.replays-original", same.ok && same.data?.txnId === row.id && same.data.status === "PROCESSING"
  && (await payouts(a.id)).length === 1);
ok("new-key.unresolved-identity-blocks-second-payout", !fresh.ok && fresh.code === "BUSY" && fresh.txnId === row.id
  && (await payouts(a.id)).length === 1 && (await db.wallet.findByUserId(a.id))?.hold === 20_000 && referenceWrites === 1);
const b = await account();
const foreign = await withdraw(b.id, b.input, originalKey);
ok("foreign-key.cannot-read-another-payout", !foreign.ok && foreign.code === "CONFLICT" && (await payouts(b.id)).length === 0);

const c = await account();
let thrownRef: string | null = null;
(db.txn as any).update = async (...args: any[]) => {
  if (args[1]?.providerRef && String(args[0]).startsWith("txn_")) {
    thrownRef = args[1].providerRef;
    throw new Error("Controlled reference-write timeout after provider acceptance");
  }
  return (update as (...xs: any[]) => any)(...args);
};
let thrown: Awaited<ReturnType<typeof withdraw>>;
try { thrown = await withdraw(c.id, c.input, "s9-withdraw-ambiguous-throw"); }
finally { (db.txn as any).update = update; }
const thrownRow = (await payouts(c.id))[0];
ok("accepted-write-throw.carries-original-id", !thrown.ok && thrown.code === "BUSY" && thrown.txnId === thrownRow?.id
  && !!thrownRef && thrownRow?.status === "PROCESSING" && !thrownRow.providerRef);
const retryThrown = await withdraw(c.id, c.input, "s9-withdraw-ambiguous-throw-new");
ok("accepted-write-throw.new-key-blocked", !retryThrown.ok && retryThrown.txnId === thrownRow.id
  && (await payouts(c.id)).length === 1);

const partialOwner = await account();
const partial = await db.txn.create({ id: "txn_s9_partial_rail", walletId: `wal_${partialOwner.id}`, userId: partialOwner.id,
  type: "WITHDRAWAL", status: "PROCESSING", amount: -20_000, fee: 300, taxWithheld: 0,
  balanceAfter: 80_000, currency: "TZS", provider: "MPESA", providerRef: "wdr_s9_partial_rail",
  payoutRail: null, providerStatus: null, msisdn: partialOwner.input.msisdn,
  description: "Payout reference saved without verified rail", positionId: null, amlReason: null,
  createdAt: now(), updatedAt: now(), completedAt: null, idempotencyKey: "s9-partial-rail",
  origin: null, pendingBet: null } as never);
ok("dal.partial-rail-is-missing-live-identity", (await db.txn.findProcessingWithdrawalMissingIdentity(partialOwner.id, true))?.id === partial.id
  && (await db.txn.findProcessingWithdrawalMissingIdentity(partialOwner.id, false)) === null);

const action = readFileSync(join(ROOT, "src/app/wallet/withdraw/actions.ts"), "utf8");
const route = action.indexOf('if (!result.ok && result.txnId) redirect(`/wallet?withdrawal=${result.txnId}` as never);');
const refusal = action.indexOf('if (!result.ok) redirect(("/wallet/withdraw?error="');
ok("action.ambiguous-id-opens-owned-status-before-error-form", route >= 0 && refusal > route);
const red = action.replace('if (!result.ok && result.txnId) redirect(`/wallet?withdrawal=${result.txnId}` as never);', "");
ok("red.removing-recovery-route-is-detected", red !== action && red.indexOf('if (!result.ok && result.txnId)') < 0);

const failed = checks.filter(([, pass]) => !pass);
for (const [name, pass] of checks) console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
console.log(`withdraw-ambiguity ${PG ? "PostgreSQL" : "memory"}: ${checks.length - failed.length}/${checks.length}`);
if (PG) await prisma()!.$disconnect();
if (failed.length) process.exitCode = 1;
