/**
 * Payment webhook / async-settlement tests (in-memory store; no DATABASE_URL).
 *
 * Verifies the rebuilt deposit/withdraw flow where an ASYNC provider only
 * credits/settles on a verified webhook — and that settlement is EXACTLY ONCE:
 *   - a PENDING deposit does NOT credit the wallet up front
 *   - the webhook credits it, and a retried (duplicate) webhook does not double-credit
 *   - a FAILED webhook on a pending deposit credits nothing
 *   - a PENDING withdrawal holds funds; webhook CONFIRMED releases, FAILED reverses
 *   - reconcileStalePayments sweeps stuck PROCESSING rows to a terminal state
 *   - the synchronous (mock-CONFIRMED) path still credits immediately (regression)
 */
import { db } from "../src/lib/server/store.ts";
import { deposit, withdraw, settlePaymentWebhook, reconcileStalePayments } from "../src/lib/server/wallet-service.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}`); }
}

const now = new Date().toISOString();
function makePlayer(id: string, opts: { balance?: number; kyc?: "APPROVED" } = {}) {
  db.user.create({
    id, phoneE164: `+25571000${id.slice(-4)}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: `${id}@t.tz`,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  } as never);
  db.wallet.create({ id: `wlt_${id}`, userId: id, balance: opts.balance ?? 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  if (opts.kyc) {
    db.kyc.upsert({ id: `kyc_${id}`, userId: id, status: opts.kyc, rejectReason: null, rejectNote: null, nidaNumber: "19900101456712341234", nidaVerifiedAt: now, fullName: "Test Player", dob: "1990-01-01", documents: [], reviewerId: null, reviewedAt: null, submittedAt: now, createdAt: now, updatedAt: now } as never);
  }
}
const ref = (txnId: string) => db.txn.findById(txnId)?.providerRef ?? "";
const bal = (uid: string) => db.wallet.findByUserId(uid)?.balance ?? -1;
const hold = (uid: string) => db.wallet.findByUserId(uid)?.hold ?? -1;
const st = (txnId: string) => db.txn.findById(txnId)?.status;

// ── DEPOSIT: async → webhook credits exactly once ──────────────────────────
process.env.PAYMENTS_DEMO_ASYNC = "true";
makePlayer("usr_dep");

const d1 = await deposit("usr_dep", { provider: "MPESA", amount: 50_000 });
ok("async deposit returns PROCESSING", d1.ok && d1.data!.status === "PROCESSING");
ok("async deposit does NOT credit up front", bal("usr_dep") === 0);
const dTxn = d1.ok ? d1.data!.txnId : "";
ok("pending deposit txn has a providerRef", !!ref(dTxn));
ok("pending deposit txn is PROCESSING", st(dTxn) === "PROCESSING");

const w1 = await settlePaymentWebhook({ providerRef: ref(dTxn), status: "CONFIRMED" });
ok("webhook CONFIRMED handled", w1.handled);
ok("webhook credits the wallet", bal("usr_dep") === 50_000);
ok("deposit txn now CONFIRMED", st(dTxn) === "CONFIRMED");

// Retry the SAME webhook (providers deliver at-least-once) → no double credit.
const w1retry = await settlePaymentWebhook({ providerRef: ref(dTxn), status: "CONFIRMED" });
ok("duplicate webhook acked", w1retry.handled && w1retry.reason.startsWith("already"));
ok("duplicate webhook does NOT double-credit", bal("usr_dep") === 50_000);

// Unknown reference → not handled, no effect.
const wUnknown = await settlePaymentWebhook({ providerRef: "NOPE-XXXXXX", status: "CONFIRMED" });
ok("unknown reference not handled", !wUnknown.handled);

// ── DEPOSIT: async → webhook FAILED credits nothing ────────────────────────
const d2 = await deposit("usr_dep", { provider: "MPESA", amount: 9_000 });
const d2Txn = d2.ok ? d2.data!.txnId : "";
await settlePaymentWebhook({ providerRef: ref(d2Txn), status: "FAILED" });
ok("failed-webhook deposit marked FAILED", st(d2Txn) === "FAILED");
ok("failed-webhook deposit credited nothing", bal("usr_dep") === 50_000);

// ── DEPOSIT: synchronous path still credits immediately (regression) ───────
delete process.env.PAYMENTS_DEMO_ASYNC;
makePlayer("usr_sync");
const d3 = await deposit("usr_sync", { provider: "MPESA", amount: 12_000 });
ok("sync deposit returns CONFIRMED", d3.ok && d3.data!.status === "CONFIRMED");
ok("sync deposit credits immediately", bal("usr_sync") === 12_000);

// ── WITHDRAWAL: async hold → webhook CONFIRMED releases ────────────────────
process.env.PAYMENTS_DEMO_ASYNC = "true";
makePlayer("usr_wd", { balance: 100_000, kyc: "APPROVED" });
const wd1 = await withdraw("usr_wd", { provider: "MPESA", amount: 20_000 });
ok("async withdrawal returns PROCESSING", wd1.ok && wd1.data!.status === "PROCESSING");
ok("withdrawal moves funds into hold", bal("usr_wd") === 80_000 && hold("usr_wd") === 20_000);
const wdTxn = wd1.ok ? wd1.data!.txnId : "";
await settlePaymentWebhook({ providerRef: ref(wdTxn), status: "CONFIRMED" });
ok("confirmed payout releases the hold", hold("usr_wd") === 0 && bal("usr_wd") === 80_000);
ok("withdrawal txn CONFIRMED", st(wdTxn) === "CONFIRMED");

// ── WITHDRAWAL: async → webhook FAILED returns the funds ───────────────────
const wd2 = await withdraw("usr_wd", { provider: "MPESA", amount: 20_000 });
const wd2Txn = wd2.ok ? wd2.data!.txnId : "";
ok("2nd withdrawal holds again", bal("usr_wd") === 60_000 && hold("usr_wd") === 20_000);
await settlePaymentWebhook({ providerRef: ref(wd2Txn), status: "FAILED" });
ok("failed payout returns funds + releases hold", bal("usr_wd") === 80_000 && hold("usr_wd") === 0);
ok("withdrawal txn FAILED", st(wd2Txn) === "FAILED");

// ── RECONCILE: sweep a stuck pending deposit ───────────────────────────────
makePlayer("usr_rec");
const d4 = await deposit("usr_rec", { provider: "MPESA", amount: 7_000 });
const d4Txn = d4.ok ? d4.data!.txnId : "";
ok("recon: deposit starts PROCESSING", st(d4Txn) === "PROCESSING");
const swept = await reconcileStalePayments(-1); // everything older than "now + 1ms" → all pending
ok("recon swept at least one deposit", swept.depositsFailed >= 1);
ok("recon marked the stale deposit FAILED", st(d4Txn) === "FAILED");
ok("recon credited nothing", bal("usr_rec") === 0);

delete process.env.PAYMENTS_DEMO_ASYNC;
console.log(`\npayment-webhook: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
