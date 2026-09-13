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
 *   - NO withdrawal is held for a two-officer AML review (owner ruling 2026-09-13): TZS 1,000,000
 *     and 1,500,000 are sent at once, the TZS 5,000,000 per-withdrawal cap is the only ceiling, and
 *     a row held BEFORE the ruling (seeded, because withdraw() can no longer write one) is still
 *     paid out by the officer path, or kept under review when the rail refuses it
 */
import { db } from "../src/lib/server/store.ts";
import { deposit, withdraw, settlePaymentWebhook, reconcileStalePayments, dispatchApprovedWithdrawal } from "../src/lib/server/wallet-service.ts";
import { WITHDRAWAL_AML_HOLD } from "../src/lib/server/payments.ts";
import { WITHDRAW_MAX_TZS } from "../src/lib/server/validators.ts";
import { getEffectiveConfig } from "../src/lib/server/market-config.ts";
import { computeWithdrawalFee } from "../src/lib/payout.ts";

import "./lib/verified-fixtures.mts";
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
async function makePlayer(id: string, opts: { balance?: number; hold?: number; kyc?: "APPROVED" } = {}) {
  const local = `7${String(++phoneSeq).padStart(8, "0")}`;
  localDigits.set(id, local);
  await db.user.create({
    id, phoneE164: `+255${local}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: `${id}@t.tz`, emailVerifiedAt: now,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wlt_${id}`, userId: id, balance: opts.balance ?? 0, pending: 0, hold: opts.hold ?? 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  if (opts.kyc) {
    await db.kyc.upsert({ id: `kyc_${id}`, userId: id, status: opts.kyc, rejectReason: null, rejectNote: null, idType: "NIDA", idNumber: "19900101456712341234", idExpiry: null, idVerifiedAt: now, fullName: "Test Player", dob: "1990-01-01", documents: [], reviewerId: null, reviewedAt: null, submittedAt: now, approvedAt: opts.kyc === "APPROVED" ? now : null, createdAt: now, updatedAt: now } as never);
  }
}

/**
 * ⭐ A LEGACY AML_REVIEW ROW, written the way `withdraw()` wrote one while the hold was on.
 *
 * 2026-09-13: `withdraw()` can no longer produce this state (`WITHDRAWAL_AML_HOLD = false`), yet a
 * row held BEFORE the ruling must still be payable (an officer approves → dispatchApprovedWithdrawal)
 * and must keep its hold when the rail refuses. So the state is SEEDED, field for field: the gross
 * moved from balance into hold; a WITHDRAWAL row in AML_REVIEW carrying the fee; the registered
 * number in E.164 (what WithdrawSchema stores); `providerRef` = our own `wdr_` correlation id (the
 * phantom the hold branch returned, never a gateway ref); and the hold branch's amlReason.
 * createdAt is backdated because a held row has sat in the queue.
 */
async function seedLegacyAmlHold(id: string, startBalance: number, gross: number) {
  await makePlayer(id, { balance: startBalance - gross, hold: gross, kyc: "APPROVED" });
  const w = await db.wallet.findByUserId(id);
  const fee = computeWithdrawalFee(gross, (await getEffectiveConfig()).withdrawalFeeRate);
  const txnId = `txn_legacy_${id}`;
  const phantomRef = `wdr_legacy${String(phoneSeq).padStart(4, "0")}`;
  const heldAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  await db.txn.create({
    id: txnId, walletId: w!.id, userId: id, type: "WITHDRAWAL", status: "AML_REVIEW",
    amount: -gross, fee, taxWithheld: 0, balanceAfter: startBalance - gross, currency: "TZS",
    provider: "MPESA", providerRef: phantomRef, msisdn: `+255${localDigits.get(id)}`,
    description: "Legacy AML-held withdrawal (seeded)", positionId: null, amlReason: "Threshold ≥ TZS 1,000,000",
    createdAt: heldAt, updatedAt: heldAt, completedAt: null, idempotencyKey: null,
  } as never);
  return { txnId, phantomRef };
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

// ── AML: NO WITHDRAWAL IS HELD FOR REVIEW (owner ruling 2026-09-13) ───────────
// ⛔ INVERTED, NOT DELETED. Until 2026-09-13 this block proved a gross ≥ TZS 1,000,000 withdrawal
// was HELD in AML_REVIEW for a two-officer review (on the gross, so a 985,000 net could not slip
// it). The owner removed that hold: any amount up to the TZS 5,000,000 cap is sent at once. Do not
// restore the old assertion from history. Putting the hold back is a new ruling, and the switch
// check below goes red the day `WITHDRAWAL_AML_HOLD` is flipped without one.
ok("WITHDRAWAL_AML_HOLD is false: owner ruling 2026-09-13, no withdrawal is held for a two-officer review (turning it back on needs a new ruling and a rewrite of this block)",
  WITHDRAWAL_AML_HOLD === false);
await makePlayer("usr_aml", { balance: 2_000_000, kyc: "APPROVED" });
const amlWd = await withdraw("usr_aml", { provider: "MPESA", amount: 1_000_000, msisdn: localDigits.get("usr_aml")! });
const amlWdTxn = amlWd.ok ? amlWd.data!.txnId : "";
ok("gross-1M withdrawal is NOT held: sent at once (sync mock → CONFIRMED, never AML_REVIEW)",
  amlWd.ok === true && amlWd.data!.status !== "AML_REVIEW" && amlWd.data!.status === "CONFIRMED");
ok("…its stored row is CONFIRMED and carries no AML reason",
  await st(amlWdTxn) === "CONFIRMED" && (await db.txn.findById(amlWdTxn))?.amlReason === null);
ok("…the full gross left the balance and nothing is parked in hold",
  await hold("usr_aml") === 0 && await bal("usr_aml") === 1_000_000);
ok("…and the withdrawal fee is still charged on it (fee > 0, fee + net = gross)",
  amlWd.ok === true && amlWd.data!.fee > 0 && amlWd.data!.fee + amlWd.data!.net === 1_000_000);
ok("a withdrawal that was never held cannot be pushed through the officer release path",
  (await dispatchApprovedWithdrawal(amlWdTxn)).ok === false);
await makePlayer("usr_aml2", { balance: 600_000, kyc: "APPROVED" });
const belowWd = await withdraw("usr_aml2", { provider: "MPESA", amount: 500_000, msisdn: localDigits.get("usr_aml2")! });
ok("below-threshold withdrawal is not AML-held", belowWd.ok === true && belowWd.data!.status !== "AML_REVIEW");

// ── THE CAP IS THE CEILING: exactly TZS 5,000,000 is sent, 5,000,001 is refused ──
// With no hold, WITHDRAW_MAX_TZS (validators.ts) is the only limit on the size of one withdrawal,
// and every player-facing statement of the 2026-09-13 ruling names it. Each case gets its OWN
// 6,000,000 wallet, so the refusal can only be the cap and never a short balance.
ok("the per-withdrawal cap is still TZS 5,000,000", WITHDRAW_MAX_TZS === 5_000_000);
await makePlayer("usr_cap", { balance: 6_000_000, kyc: "APPROVED" });
const capWd = await withdraw("usr_cap", { provider: "MPESA", amount: WITHDRAW_MAX_TZS, msisdn: localDigits.get("usr_cap")! });
ok("exactly the cap (TZS 5,000,000) is accepted and sent at once (CONFIRMED, not held)",
  capWd.ok === true && capWd.data!.status === "CONFIRMED");
ok("…balance down by 5,000,000 and the hold released",
  await bal("usr_cap") === 1_000_000 && await hold("usr_cap") === 0);
await makePlayer("usr_cap_over", { balance: 6_000_000, kyc: "APPROVED" });
const overWd = await withdraw("usr_cap_over", { provider: "MPESA", amount: WITHDRAW_MAX_TZS + 1, msisdn: localDigits.get("usr_cap_over")! });
ok("TZS 5,000,001 is refused, and the refusal is the cap",
  overWd.ok === false && /cap is TZS 5,000,000/.test(overWd.error));
ok("…nothing moved: balance 6,000,000, hold 0, no withdrawal row written",
  await bal("usr_cap_over") === 6_000_000 && await hold("usr_cap_over") === 0 && (await db.txn.findByUser("usr_cap_over")).length === 0);

// ── LEGACY AML_REVIEW ROW: APPROVE → DISPATCH still pays it out ───────────────
// withdraw() no longer creates AML_REVIEW rows (2026-09-13), but a row held BEFORE the ruling must
// still PAY OUT once an officer approves it, so it is seeded (seedLegacyAmlHold).
// dispatchApprovedWithdrawal skips the hold (review already happened), dispatches to the gateway,
// keeps the hold until the provider confirms, and settles exactly-once. Previously approval was
// hard-blocked → large payouts dead-ended at "return only". Here the provider is the sync mock →
// settles now.
{
  const legacy = await seedLegacyAmlHold("usr_aml_legacy", 2_000_000, 1_000_000);
  ok("seeded legacy row is AML_REVIEW with the gross in hold (the state withdraw() used to write)",
    await st(legacy.txnId) === "AML_REVIEW" && await hold("usr_aml_legacy") === 1_000_000 && await bal("usr_aml_legacy") === 1_000_000);
  const d = await dispatchApprovedWithdrawal(legacy.txnId);
  ok("approved dispatch (sync mock) → CONFIRMED", d.ok === true && d.status === "CONFIRMED");
  ok("approved payout releases the hold (money left the platform)", await hold("usr_aml_legacy") === 0 && await bal("usr_aml_legacy") === 1_000_000);
  ok("approved withdrawal txn CONFIRMED", await st(legacy.txnId) === "CONFIRMED");
  ok("…and the phantom wdr_ id was replaced by the gateway's own reference",
    !!await ref(legacy.txnId) && await ref(legacy.txnId) !== legacy.phantomRef);
  // Idempotent: a settled payout is no longer AML_REVIEW, so re-dispatch is refused.
  const again = await dispatchApprovedWithdrawal(legacy.txnId);
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

// ── SELCOM: a TZS 1,500,000 withdrawal is DISPATCHED at once (owner ruling 2026-09-13) ──
// Until 2026-09-13 this proved a ≥1M Selcom payout stopped at AML_REVIEW. Inverted: it goes
// straight to the gateway (PROCESSING, with the gateway's ref and rail persisted and the hold kept)
// and settles from the walletcashin/query re-query exactly like any other payout, never
// blind-confirmed.
await makePlayer("usr_selaml", { balance: 3_000_000, kyc: "APPROVED" });
cashinQueryStatus = "111"; // gateway accepts; the payout is still pending
const selAml = await withdraw("usr_selaml", { provider: "MPESA", amount: 1_500_000, msisdn: localDigits.get("usr_selaml")! });
const selAmlTxn = selAml.ok ? selAml.data!.txnId : "";
ok("selcom 1.5M withdrawal → PROCESSING at once, NOT AML_REVIEW",
  selAml.ok === true && selAml.data!.status === "PROCESSING" && await st(selAmlTxn) === "PROCESSING");
ok("…hold kept until the gateway confirms, with the gateway ref + rail persisted",
  await hold("usr_selaml") === 1_500_000 && await bal("usr_selaml") === 1_500_000 && !!await ref(selAmlTxn) && !!(await db.txn.findById(selAmlTxn))?.payoutRail);
cashinQueryStatus = "000"; // gateway now confirms the payout
await reconcileStalePayments(-1);
ok("…and settles via re-query as an ordinary payout (hold released)",
  await st(selAmlTxn) === "CONFIRMED" && await hold("usr_selaml") === 0 && await bal("usr_selaml") === 1_500_000);

// ── LEGACY AML APPROVE → DISPATCH on the real Selcom adapter (stubbed gateway) ──
// A row held BEFORE 2026-09-13 (seeded: withdraw() cannot write one now). Approving it must
// DISPATCH it (PROCESSING + real ref, hold kept), never mark it sent without the gateway, then
// settle via re-query.
const selLegacy = await seedLegacyAmlHold("usr_selaml_legacy", 3_000_000, 1_500_000);
cashinQueryStatus = "111"; // gateway accepts but is still pending after dispatch
const disp = await dispatchApprovedWithdrawal(selLegacy.txnId);
ok("approved selcom payout → PROCESSING (dispatched, not blind-confirmed)", disp.ok === true && disp.status === "PROCESSING" && await st(selLegacy.txnId) === "PROCESSING");
ok("approved selcom payout kept the hold + got a REAL provider ref",
  await hold("usr_selaml_legacy") === 1_500_000 && !!await ref(selLegacy.txnId) && await ref(selLegacy.txnId) !== selLegacy.phantomRef);
cashinQueryStatus = "000"; // gateway now confirms the payout
await reconcileStalePayments(-1);
ok("approved selcom payout settles via re-query (hold released)", await st(selLegacy.txnId) === "CONFIRMED" && await hold("usr_selaml_legacy") === 0);

// Provider refusal (float PIN not yet set) must NOT auto-refund a just-approved legacy payout. It
// reverts to AML_REVIEW (hold intact) for the officer to retry or reject. This protects
// wallet-service's revert, which still runs for every row held before 2026-09-13.
const selAml2 = await seedLegacyAmlHold("usr_selaml2", 3_000_000, 1_200_000);
const savedPin = process.env.PAYMENT_VENDOR_PIN;
delete process.env.PAYMENT_VENDOR_PIN; // simulate the float PIN not yet configured
const failDisp = await dispatchApprovedWithdrawal(selAml2.txnId);
ok("approved payout with no float PIN is refused (provider down)", failDisp.ok === false);
ok("refused payout reverts to AML_REVIEW, hold intact (no auto-refund)", await st(selAml2.txnId) === "AML_REVIEW" && await hold("usr_selaml2") === 1_200_000);
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
