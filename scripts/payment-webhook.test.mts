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
import { deposit, withdraw, settlePaymentWebhook, reconcileStalePayments, dispatchApprovedWithdrawal } from "../src/lib/server/wallet-service.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}`); }
}

const now = new Date().toISOString();
/**
 * ⚠️ EVERY db.* CALL IS AWAITED.
 *
 * The in-memory store is SYNCHRONOUS (it returns values); Prisma returns
 * Promises. This file was written sync-style, so on real Postgres the wallet
 * insert raced ahead of the user insert and died on the Wallet_userId_fkey
 * foreign key — meaning this suite, which is the exactly-once / no-double-credit
 * proof for the money-in webhook, had only ever actually executed against the
 * in-memory Map. Awaiting everything makes it valid on BOTH stores, so the
 * webhook guarantees are now proven where multi-instance races can occur.
 */
/**
 * 🔴 E-215 · THE REGISTERED NUMBER IS THE FIXTURE'S JOB, AND THIS SUITE HAD NEVER DONE IT.
 *
 * `withdraw()` refuses any destination that is not the account's own number
 * (`wallet-service.ts` → `payoutDestinationFor`), shipped 2026-08-25 in 27e17d38 — a commit
 * that touched 17 files and NOT this one. 24 of this suite's 47 assertions have been red on
 * every CI run since, each preceded by `[audit] WALLET withdraw.destination_refused`.
 *
 * ⛔ AND THE OLD PHONE COULD NEVER HAVE BEEN REGISTERED AT ALL. `id.slice(-4)` on ids that are
 * WORDS yields LETTERS — "usr_wd" → "r_wd" → `+25571000r_wd` — which `normalizeTzLocalDigits`
 * reduces to 5 digits, so the refusal was `no_registered_number`, not even a mismatch. It also
 * collided: usr_aml2 and usr_selaml2 both produced `+25571000aml2`, two accounts on one number.
 * A sequence fixes both, and `7` + 8 digits is the subscriber shape `tzPhone` actually accepts.
 *
 * ⭐ THE GUARD IS SATISFIED THE WAY A REAL PLAYER SATISFIES IT — by withdrawing to the number
 * the account is registered to — never by relaxing it, stubbing it, or passing `phoneE164`
 * straight through. Proven still load-bearing inside this suite: point one fixture at a
 * well-formed but UNREGISTERED number and 7 assertions go red again.
 */
const localDigits = new Map<string, string>();
let phoneSeq = 0;
async function makePlayer(id: string, opts: { balance?: number; kyc?: "APPROVED" } = {}) {
  const local = `7${String(++phoneSeq).padStart(8, "0")}`;
  localDigits.set(id, local);
  await db.user.create({
    id, phoneE164: `+255${local}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: `${id}@t.tz`, emailVerifiedAt: now,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wlt_${id}`, userId: id, balance: opts.balance ?? 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  if (opts.kyc) {
    await db.kyc.upsert({ id: `kyc_${id}`, userId: id, status: opts.kyc, rejectReason: null, rejectNote: null, idType: "NIDA", idNumber: "19900101456712341234", idExpiry: null, idVerifiedAt: now, fullName: "Test Player", dob: "1990-01-01", documents: [], reviewerId: null, reviewedAt: null, submittedAt: now, approvedAt: opts.kyc === "APPROVED" ? now : null, createdAt: now, updatedAt: now } as never);
  }
}
const ref = async (txnId: string) => (await db.txn.findById(txnId))?.providerRef ?? "";
const bal = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;
const hold = async (uid: string) => (await db.wallet.findByUserId(uid))?.hold ?? -1;
const st = async (txnId: string) => (await db.txn.findById(txnId))?.status;

// ── DEPOSIT: async → webhook credits exactly once ──────────────────────────
process.env.PAYMENTS_DEMO_ASYNC = "true";
await makePlayer("usr_dep");

const d1 = await deposit("usr_dep", { provider: "MPESA", amount: 50_000 });
ok("async deposit returns PROCESSING", d1.ok && d1.data!.status === "PROCESSING");
ok("async deposit does NOT credit up front", await bal("usr_dep") === 0);
const dTxn = d1.ok ? d1.data!.txnId : "";
ok("pending deposit txn has a providerRef", !!await ref(dTxn));
ok("pending deposit txn is PROCESSING", await st(dTxn) === "PROCESSING");

const w1 = await settlePaymentWebhook({ providerRef: await ref(dTxn), status: "CONFIRMED" });
ok("webhook CONFIRMED handled", w1.handled);
ok("webhook credits the wallet", await bal("usr_dep") === 50_000);
ok("deposit txn now CONFIRMED", await st(dTxn) === "CONFIRMED");

// Retry the SAME webhook (providers deliver at-least-once) → no double credit.
const w1retry = await settlePaymentWebhook({ providerRef: await ref(dTxn), status: "CONFIRMED" });
ok("duplicate webhook acked", w1retry.handled && w1retry.reason.startsWith("already"));
ok("duplicate webhook does NOT double-credit", await bal("usr_dep") === 50_000);

// Unknown reference → not handled, no effect.
const wUnknown = await settlePaymentWebhook({ providerRef: "NOPE-XXXXXX", status: "CONFIRMED" });
ok("unknown reference not handled", !wUnknown.handled);

// ── DEPOSIT: async → webhook FAILED credits nothing ────────────────────────
const d2 = await deposit("usr_dep", { provider: "MPESA", amount: 9_000 });
const d2Txn = d2.ok ? d2.data!.txnId : "";
await settlePaymentWebhook({ providerRef: await ref(d2Txn), status: "FAILED" });
ok("failed-webhook deposit marked FAILED", await st(d2Txn) === "FAILED");
ok("failed-webhook deposit credited nothing", await bal("usr_dep") === 50_000);

// ── DEPOSIT: synchronous path still credits immediately (regression) ───────
delete process.env.PAYMENTS_DEMO_ASYNC;
await makePlayer("usr_sync");
const d3 = await deposit("usr_sync", { provider: "MPESA", amount: 12_000 });
ok("sync deposit returns CONFIRMED", d3.ok && d3.data!.status === "CONFIRMED");
ok("sync deposit credits immediately", await bal("usr_sync") === 12_000);

// ── WITHDRAWAL: async hold → webhook CONFIRMED releases ────────────────────
process.env.PAYMENTS_DEMO_ASYNC = "true";
await makePlayer("usr_wd", { balance: 100_000, kyc: "APPROVED" });
const wd1 = await withdraw("usr_wd", { provider: "MPESA", amount: 20_000, msisdn: localDigits.get("usr_wd")! });
ok("async withdrawal returns PROCESSING", wd1.ok && wd1.data!.status === "PROCESSING");
ok("withdrawal moves funds into hold", await bal("usr_wd") === 80_000 && await hold("usr_wd") === 20_000);
const wdTxn = wd1.ok ? wd1.data!.txnId : "";
await settlePaymentWebhook({ providerRef: await ref(wdTxn), status: "CONFIRMED" });
ok("confirmed payout releases the hold", await hold("usr_wd") === 0 && await bal("usr_wd") === 80_000);
ok("withdrawal txn CONFIRMED", await st(wdTxn) === "CONFIRMED");

// ── WITHDRAWAL: async → webhook FAILED returns the funds ───────────────────
const wd2 = await withdraw("usr_wd", { provider: "MPESA", amount: 20_000, msisdn: localDigits.get("usr_wd")! });
const wd2Txn = wd2.ok ? wd2.data!.txnId : "";
ok("2nd withdrawal holds again", await bal("usr_wd") === 60_000 && await hold("usr_wd") === 20_000);
await settlePaymentWebhook({ providerRef: await ref(wd2Txn), status: "FAILED" });
ok("failed payout returns funds + releases hold", await bal("usr_wd") === 80_000 && await hold("usr_wd") === 0);
ok("withdrawal txn FAILED", await st(wd2Txn) === "FAILED");

// ── RECONCILE: sweep a stuck pending deposit ───────────────────────────────
await makePlayer("usr_rec");
const d4 = await deposit("usr_rec", { provider: "MPESA", amount: 7_000 });
const d4Txn = d4.ok ? d4.data!.txnId : "";
ok("recon: deposit starts PROCESSING", await st(d4Txn) === "PROCESSING");
const swept = await reconcileStalePayments(-1); // everything older than "now + 1ms" → all pending
ok("recon swept at least one deposit", swept.depositsFailed >= 1);
ok("recon marked the stale deposit FAILED", await st(d4Txn) === "FAILED");
ok("recon credited nothing", await bal("usr_rec") === 0);

delete process.env.PAYMENTS_DEMO_ASYNC;

// ── AML: the ≥1,000,000 hold is on GROSS, not net (regression) ──────────────
// A gross 1,000,000 withdrawal nets 990,000 after the 1% fee. Evaluating AML on
// net let it slip the mandatory second-officer hold. Must be AML_REVIEW on gross.
await makePlayer("usr_aml", { balance: 2_000_000, kyc: "APPROVED" });
const amlWd = await withdraw("usr_aml", { provider: "MPESA", amount: 1_000_000, msisdn: localDigits.get("usr_aml")! });
const amlWdTxn = amlWd.ok ? amlWd.data!.txnId : "";
ok("gross-1M withdrawal → AML_REVIEW (net 990k must NOT slip the hold)", amlWd.ok === true && amlWd.data!.status === "AML_REVIEW");
ok("AML-held funds stay in hold, not disbursed", await hold("usr_aml") === 1_000_000 && await bal("usr_aml") === 1_000_000);
await makePlayer("usr_aml2", { balance: 600_000, kyc: "APPROVED" });
const belowWd = await withdraw("usr_aml2", { provider: "MPESA", amount: 500_000, msisdn: localDigits.get("usr_aml2")! });
ok("below-threshold withdrawal is not AML-held", belowWd.ok === true && belowWd.data!.status !== "AML_REVIEW");

// ── AML APPROVE → DISPATCH: the payout half of the review flow ──────────────
// A large withdrawal held in AML_REVIEW must be able to PAY OUT once approved.
// dispatchApprovedWithdrawal bypasses the AML hold (review already happened),
// dispatches to the gateway, keeps the hold until the provider confirms, and
// settles exactly-once. Previously approval was hard-blocked → large payouts
// dead-ended at "return only". Here the provider is the sync mock → settles now.
{
  const d = await dispatchApprovedWithdrawal(amlWdTxn);
  ok("approved dispatch (sync mock) → CONFIRMED", d.ok === true && d.status === "CONFIRMED");
  ok("approved payout releases the hold (money left the platform)", await hold("usr_aml") === 0 && await bal("usr_aml") === 1_000_000);
  ok("approved withdrawal txn CONFIRMED", await st(amlWdTxn) === "CONFIRMED");
  // Idempotent: a settled payout is no longer AML_REVIEW, so re-dispatch is refused.
  const again = await dispatchApprovedWithdrawal(amlWdTxn);
  ok("re-dispatch of a settled payout is refused (exactly-once)", again.ok === false);
}

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

await makePlayer("usr_sel", { balance: 100_000, kyc: "APPROVED" });
const selWd = await withdraw("usr_sel", { provider: "MPESA", amount: 30_000, msisdn: localDigits.get("usr_sel")! });
const selWdTxn = selWd.ok ? selWd.data!.txnId : "";
ok("selcom payout accepted → PROCESSING + held", selWd.ok === true && selWd.data!.status === "PROCESSING" && await hold("usr_sel") === 30_000);
ok("selcom payout persisted a providerRef for re-query", !!await ref(selWdTxn));

cashinQueryStatus = "111"; // Selcom still says pending
const sweep1 = await reconcileStalePayments(-1);
ok("pending payout LEFT in PROCESSING — never blind-reversed", await st(selWdTxn) === "PROCESSING" && await hold("usr_sel") === 30_000);
ok("reconcile counted it as leftPending", sweep1.leftPending >= 1);

cashinQueryStatus = "000"; // Selcom now confirms the payout
const sweep2 = await reconcileStalePayments(-1);
ok("confirmed payout releases the hold via re-query", await st(selWdTxn) === "CONFIRMED" && await hold("usr_sel") === 0);
ok("reconcile counted a withdrawal confirmed", sweep2.withdrawalsConfirmed >= 1);

// ── AML APPROVE → DISPATCH on the real Selcom adapter (stubbed gateway) ──────
// Approving a reviewed ≥1M payout must DISPATCH it (PROCESSING + real ref, hold
// kept) — never mark it sent without the gateway — then settle via re-query.
await makePlayer("usr_selaml", { balance: 3_000_000, kyc: "APPROVED" });
const selAml = await withdraw("usr_selaml", { provider: "MPESA", amount: 1_500_000, msisdn: localDigits.get("usr_selaml")! });
const selAmlTxn = selAml.ok ? selAml.data!.txnId : "";
ok("selcom ≥1M withdrawal → AML_REVIEW held", selAml.ok === true && selAml.data!.status === "AML_REVIEW" && await hold("usr_selaml") === 1_500_000);
cashinQueryStatus = "111"; // gateway accepts but is still pending after dispatch
const disp = await dispatchApprovedWithdrawal(selAmlTxn);
ok("approved selcom payout → PROCESSING (dispatched, not blind-confirmed)", disp.ok === true && disp.status === "PROCESSING" && await st(selAmlTxn) === "PROCESSING");
ok("approved selcom payout kept the hold + got a REAL provider ref", await hold("usr_selaml") === 1_500_000 && !!await ref(selAmlTxn));
cashinQueryStatus = "000"; // gateway now confirms the payout
await reconcileStalePayments(-1);
ok("approved selcom payout settles via re-query (hold released)", await st(selAmlTxn) === "CONFIRMED" && await hold("usr_selaml") === 0);

// Provider refusal (float PIN not yet set) must NOT auto-refund a just-approved
// payout — it reverts to AML_REVIEW (hold intact) for the officer to retry/reject.
await makePlayer("usr_selaml2", { balance: 3_000_000, kyc: "APPROVED" });
const selAml2 = await withdraw("usr_selaml2", { provider: "MPESA", amount: 1_200_000, msisdn: localDigits.get("usr_selaml2")! });
const selAml2Txn = selAml2.ok ? selAml2.data!.txnId : "";
const savedPin = process.env.PAYMENT_VENDOR_PIN;
delete process.env.PAYMENT_VENDOR_PIN; // simulate the float PIN not yet configured
const failDisp = await dispatchApprovedWithdrawal(selAml2Txn);
ok("approved payout with no float PIN is refused (provider down)", failDisp.ok === false);
ok("refused payout reverts to AML_REVIEW, hold intact (no auto-refund)", await st(selAml2Txn) === "AML_REVIEW" && await hold("usr_selaml2") === 1_200_000);
process.env.PAYMENT_VENDOR_PIN = savedPin;

// Deposit: credits ONLY from the signed order-status re-query.
await makePlayer("usr_seld", { balance: 0, kyc: "APPROVED" });
const selDep = await deposit("usr_seld", { provider: "MPESA", amount: 30_000, msisdn: "0712345678" });
const selDepTxn = selDep.ok ? selDep.data!.txnId : "";
ok("selcom deposit → PROCESSING, not credited up front", selDep.ok === true && selDep.data!.status === "PROCESSING" && await bal("usr_seld") === 0);
orderStatus = "PENDING";
await reconcileStalePayments(-1);
ok("pending deposit stays PROCESSING (order-status not COMPLETED)", await st(selDepTxn) === "PROCESSING" && await bal("usr_seld") === 0);
orderStatus = "COMPLETED";
await reconcileStalePayments(-1);
ok("deposit credited exactly-once via order-status re-query", await st(selDepTxn) === "CONFIRMED" && await bal("usr_seld") === 30_000);

globalThis.fetch = realFetch;
for (const k of ["PAYMENT_AGGREGATOR", "PAYMENT_API_URL", "PAYMENT_API_KEY", "PAYMENT_API_SECRET", "PAYMENT_VENDOR_ID", "PAYMENT_VENDOR_PIN"]) delete process.env[k];

console.log(`\npayment-webhook: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
