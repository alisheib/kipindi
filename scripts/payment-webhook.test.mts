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

// ── AML: the ≥1,000,000 hold is on GROSS, not net (regression) ──────────────
// A gross 1,000,000 withdrawal nets 990,000 after the 1% fee. Evaluating AML on
// net let it slip the mandatory second-officer hold. Must be AML_REVIEW on gross.
makePlayer("usr_aml", { balance: 2_000_000, kyc: "APPROVED" });
const amlWd = await withdraw("usr_aml", { provider: "MPESA", amount: 1_000_000 });
ok("gross-1M withdrawal → AML_REVIEW (net 990k must NOT slip the hold)", amlWd.ok === true && amlWd.data!.status === "AML_REVIEW");
ok("AML-held funds stay in hold, not disbursed", hold("usr_aml") === 1_000_000 && bal("usr_aml") === 1_000_000);
makePlayer("usr_aml2", { balance: 600_000, kyc: "APPROVED" });
const belowWd = await withdraw("usr_aml2", { provider: "MPESA", amount: 500_000 });
ok("below-threshold withdrawal is not AML-held", belowWd.ok === true && belowWd.data!.status !== "AML_REVIEW");

// ── SELCOM MODE: reconcile re-queries; a pending payout is NEVER blind-reversed ──
// Drives the real Selcom adapter with a stubbed gateway. Proves: (1) an accepted-but-
// pending payout is LEFT in PROCESSING by the sweep (no double-pay), (2) reconcile
// settles it from the authoritative walletcashin/query re-query, (3) a deposit only
// credits from the signed order-status re-query.
process.env.PAYMENT_AGGREGATOR = "selcom";
process.env.PAYMENT_API_URL = "https://apigw.selcommobile.com/v1";
process.env.PAYMENT_API_KEY = "k";
process.env.PAYMENT_API_SECRET = "s";
process.env.PAYMENT_VENDOR_ID = "v";
process.env.PAYMENT_VENDOR_PIN = "1234";

const realFetch = globalThis.fetch;
let cashinQueryStatus = "111"; // pending
let orderStatus = "PENDING";
globalThis.fetch = (async (url: unknown) => {
  const u = String(url);
  const env = (code: string) => new Response(JSON.stringify({ resultcode: code, result: code === "000" ? "SUCCESS" : "PENDING" }), { status: 200, headers: { "content-type": "application/json" } });
  if (u.includes("/walletcashin/process")) return env("111");            // accepted, pending
  if (u.includes("/walletcashin/query")) return env(cashinQueryStatus);   // re-query
  if (u.includes("/checkout/create-order-minimal")) return env("000");
  if (u.includes("/checkout/wallet-payment")) return env("111");
  if (u.includes("/checkout/order-status")) return new Response(JSON.stringify({ resultcode: "000", data: [{ payment_status: orderStatus, amount: 30_000 }] }), { status: 200, headers: { "content-type": "application/json" } });
  return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

makePlayer("usr_sel", { balance: 100_000, kyc: "APPROVED" });
const selWd = await withdraw("usr_sel", { provider: "MPESA", amount: 30_000, msisdn: "0712345678" });
const selWdTxn = selWd.ok ? selWd.data!.txnId : "";
ok("selcom payout accepted → PROCESSING + held", selWd.ok === true && selWd.data!.status === "PROCESSING" && hold("usr_sel") === 30_000);
ok("selcom payout persisted a providerRef for re-query", !!ref(selWdTxn));

cashinQueryStatus = "111"; // Selcom still says pending
const sweep1 = await reconcileStalePayments(-1);
ok("pending payout LEFT in PROCESSING — never blind-reversed", st(selWdTxn) === "PROCESSING" && hold("usr_sel") === 30_000);
ok("reconcile counted it as leftPending", sweep1.leftPending >= 1);

cashinQueryStatus = "000"; // Selcom now confirms the payout
const sweep2 = await reconcileStalePayments(-1);
ok("confirmed payout releases the hold via re-query", st(selWdTxn) === "CONFIRMED" && hold("usr_sel") === 0);
ok("reconcile counted a withdrawal confirmed", sweep2.withdrawalsConfirmed >= 1);

// Deposit: credits ONLY from the signed order-status re-query.
makePlayer("usr_seld", { balance: 0, kyc: "APPROVED" });
const selDep = await deposit("usr_seld", { provider: "MPESA", amount: 30_000, msisdn: "0712345678" });
const selDepTxn = selDep.ok ? selDep.data!.txnId : "";
ok("selcom deposit → PROCESSING, not credited up front", selDep.ok === true && selDep.data!.status === "PROCESSING" && bal("usr_seld") === 0);
orderStatus = "PENDING";
await reconcileStalePayments(-1);
ok("pending deposit stays PROCESSING (order-status not COMPLETED)", st(selDepTxn) === "PROCESSING" && bal("usr_seld") === 0);
orderStatus = "COMPLETED";
await reconcileStalePayments(-1);
ok("deposit credited exactly-once via order-status re-query", st(selDepTxn) === "CONFIRMED" && bal("usr_seld") === 30_000);

globalThis.fetch = realFetch;
for (const k of ["PAYMENT_AGGREGATOR", "PAYMENT_API_URL", "PAYMENT_API_KEY", "PAYMENT_API_SECRET", "PAYMENT_VENDOR_ID", "PAYMENT_VENDOR_PIN"]) delete process.env[k];

console.log(`\npayment-webhook: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
