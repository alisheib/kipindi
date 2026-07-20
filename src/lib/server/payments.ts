/**
 * Payment provider abstraction — the ADAPTER pattern (mirrors `sms.ts`).
 *
 * The active adapter is chosen at RUNTIME by the operations control-plane
 * (`payment-control.ts` → `getPaymentProvider()`): an admin toggle on
 * /admin/payments, falling back to the `PAYMENT_AGGREGATOR` env, else `mock`:
 *   "mock" (default) → `mockAdapter`  — deterministic dev/test provider.
 *   "selcom"         → `selcomAdapter` — Selcom (BoT-licensed aggregator).
 *   "azampay"        → `azampayAdapter`— AzamPay (BoT-licensed aggregator).
 * This is how Selcom is "integrated but not used": the adapter ships, and Ali
 * flips the provider from admin when ready. ⛔ In LIVE money-mode the mock is
 * REFUSED at dispatch (it fabricates confirmations) — see `resolveActiveAdapter`.
 * The adapter's shape is fixed by what `wallet-service` needs, so wiring a real
 * provider never changes the calling code or the settlement state machine.
 *
 * Provider-agnostic concerns (a correlation id, the `*.dispatch` audit, and the
 * AML ≥ 1,000,000 TZS review hold — never disburse a large payout without a
 * second-officer review) live in the WRAPPER below so every adapter inherits
 * them identically. Adapters only do the raw "call the gateway, return the
 * outcome" work.
 *
 * Compliance:
 *  - Provider correlation IDs persisted on `Transaction.providerRef` for
 *    chargeback / dispute / regulator inspection.
 *  - All requests audited (WALLET category); AML holds audited (COMPLIANCE).
 */
import { audit } from "./audit";
import { randomId } from "./crypto";
import { getPaymentProvider, getDemoAsyncEnabled, type PaymentProviderId } from "./payment-control";
import { isLiveMoneyMode } from "./runtime-mode";
import { selcomEnv, selcomDeposit, selcomCardCheckout, selcomWithdraw, selcomVerifyOrder, selcomVerifyCashin, mnoToSelcomCashin, type SelcomBilling } from "./selcom";

export type PaymentProvider = "MPESA" | "TIGO_PESA" | "AIRTEL_MONEY" | "HALO_PESA" | "MIXX" | "TTCL_PESA" | "CARD" | "BANK_TRANSFER" | "INTERNAL";

export type DepositResult =
  | {
      ok: true;
      providerRef: string;
      status: "CONFIRMED" | "PENDING";
      correlationId: string;
      /** Hosted-checkout (CARD) only: the Selcom gateway URL the buyer must be
       *  sent to in order to enter their card details. Absent on the mobile-money
       *  rail, where the prompt goes to the handset instead of the browser.
       *  ⚠️ Its presence NEVER implies money moved — the deposit is still
       *  PROCESSING and is credited only by the authoritative order-status
       *  re-query, exactly as on every other rail. */
      redirectUrl?: string;
    }
  | {
      ok: false;
      reason: "INSUFFICIENT_FUNDS" | "PROVIDER_DOWN" | "TIMEOUT" | "DECLINED" | "FRAUD";
      correlationId: string;
      /** Log-safe explanation from the provider (HTTP status, result code, message).
       *  Carried into the failure audit entry so a failed real-money deposit can be
       *  explained after the fact — a live 5,000 TZS deposit failed on 2026-07-20
       *  with nothing recorded beyond "PROVIDER_DOWN". Never contains credentials. */
      detail?: string;
    };

export type WithdrawResult =
  | { ok: true; providerRef: string; status: "CONFIRMED" | "PENDING" | "AML_REVIEW"; correlationId: string }
  | { ok: false; reason: "INSUFFICIENT_BALANCE" | "PROVIDER_DOWN" | "ACCOUNT_NOT_VERIFIED" | "DAILY_LIMIT" | "FRAUD"; correlationId: string };

/** What the wrapper hands an adapter — the caller's request plus the correlation
 *  id the wrapper already minted and audited. */
export type DispatchOpts = {
  provider: PaymentProvider;
  amount: number;
  msisdn?: string;
  userId: string;
  correlationId: string;
  /** CARD only — the hosted-checkout context the mobile-money rail has no use for. */
  card?: CardCheckoutContext;
};

/** Everything the Selcom hosted card checkout needs that the wallet layer must
 *  supply: who the buyer is, the billing details they entered (Selcom rejects card
 *  orders without them), and where to send them back to. */
export type CardCheckoutContext = {
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string;
  billing: SelcomBilling;
  redirectUrl: string;
  cancelUrl: string;
};

/** Never auto-disburse a payout at/above this without a review hold. Kept equal
 *  to the AML-hold trigger in wallet-service so nothing slips through single-officer. */
export const AML_REVIEW_THRESHOLD_TZS = 1_000_000;

export type PaymentAdapter = {
  name: string;
  /** Initiate a collection (deposit). Real gateways are ASYNC: the push goes to
   *  the handset and the final result arrives later on the webhook → return
   *  `PENDING` + the provider's id as `providerRef`; the webhook settles it. */
  deposit(o: DispatchOpts): Promise<DepositResult>;
  /** Initiate a disbursement (withdrawal/payout). Async in the same way. */
  withdraw(o: DispatchOpts): Promise<WithdrawResult>;
};

// ── PUBLIC WRAPPER — the only thing wallet-service imports ────────────────────

/** Initiate a deposit collection through the active gateway. */
export async function dispatchDeposit(opts: { provider: PaymentProvider; amount: number; msisdn?: string; userId: string; card?: CardCheckoutContext }): Promise<DepositResult> {
  const correlationId = `dep_${randomId(10)}`;
  audit({
    category: "WALLET",
    action: "deposit.dispatch",
    actorId: opts.userId,
    targetType: "User",
    targetId: opts.userId,
    payload: { correlationId, provider: opts.provider, amount: opts.amount, msisdn: opts.msisdn ? mask(opts.msisdn) : null },
  });
  const routed = await resolveActiveAdapter("deposit", correlationId);
  if (!routed.ok) return { ok: false, reason: "PROVIDER_DOWN", correlationId };
  return routed.adapter.deposit({ ...opts, correlationId });
}

/** Initiate a withdrawal disbursement through the active gateway. Payouts whose
 *  GROSS value ≥ AML_REVIEW_THRESHOLD_TZS are held for review and NOT sent to the
 *  gateway. `amount` is what the gateway actually disburses (net of the fee);
 *  `grossAmount` (defaults to `amount`) is the full withdrawal value the AML gate
 *  is evaluated against — evaluating on `net` would let a gross withdrawal just
 *  over the threshold slip past the mandatory second-officer review. */
export async function dispatchWithdrawal(opts: { provider: PaymentProvider; amount: number; grossAmount?: number; msisdn?: string; userId: string }): Promise<WithdrawResult> {
  const correlationId = `wdr_${randomId(10)}`;
  const amlBasis = opts.grossAmount ?? opts.amount;
  audit({
    category: "WALLET",
    action: "withdraw.dispatch",
    actorId: opts.userId,
    targetType: "User",
    targetId: opts.userId,
    payload: { correlationId, provider: opts.provider, amount: opts.amount, grossAmount: amlBasis, msisdn: opts.msisdn ? mask(opts.msisdn) : null },
  });
  // Compliance FIRST, before any adapter is touched — a large payout is held for
  // a second-officer AML review; we never dispatch it to the gateway on the spot.
  // Evaluated on the GROSS withdrawal value, not the net-of-fee disbursement.
  if (amlBasis >= AML_REVIEW_THRESHOLD_TZS) {
    audit({ category: "COMPLIANCE", action: "withdraw.aml_review_triggered", actorId: opts.userId, targetType: "User", targetId: opts.userId, payload: { correlationId, amount: opts.amount, grossAmount: amlBasis, threshold: AML_REVIEW_THRESHOLD_TZS } });
    // The reference here used to be FABRICATED (`${provider}-${randomId(6)}`), which
    // was indistinguishable from a real gateway reference to everything downstream —
    // reconciliation, the compliance ledger and /admin/transactions all treated a
    // payout that had never been dispatched as one the gateway had accepted.
    //
    // Nothing has been sent to any provider at this point: this branch returns BEFORE
    // resolveActiveAdapter, and therefore before the float-PIN guard and before the
    // LIVE-mode mock refusal. The correlation id is OUR id and is honest about that;
    // a real providerRef is only ever minted when the gateway actually accepts the
    // payout, on approval-dispatch.
    return { ok: true, providerRef: correlationId, status: "AML_REVIEW", correlationId };
  }
  const routed = await resolveActiveAdapter("withdraw", correlationId);
  if (!routed.ok) return { ok: false, reason: "PROVIDER_DOWN", correlationId };
  return routed.adapter.withdraw({ ...opts, correlationId });
}

// ── ADAPTER SELECTION ─────────────────────────────────────────────────────────

/**
 * Resolve the adapter to use for THIS dispatch, honouring the runtime control-plane
 * and the LIVE-mode safety guard. ⛔ Real money never runs on the mock: the mock
 * fabricates confirmations, so routing to it in LIVE mode would mint/lose money.
 * Refuse + SECURITY-audit; the operator halts payments with the kill-switch and
 * resumes by selecting a real provider (belt-and-braces with `setPaymentControls`,
 * which refuses to even persist `provider=mock` in LIVE mode).
 */
async function resolveActiveAdapter(
  flow: "deposit" | "withdraw",
  correlationId: string,
): Promise<{ ok: true; adapter: PaymentAdapter } | { ok: false }> {
  const provider = await getPaymentProvider();
  if (isLiveMoneyMode() && provider === "mock") {
    audit({
      category: "SECURITY",
      action: "payments.live_mock_refused",
      actorId: null,
      targetType: "PaymentControlPlane",
      targetId: flow,
      payload: { correlationId, note: "Real money is LIVE but the active provider is the mock — refusing to move money on a fabricated rail." },
    });
    return { ok: false };
  }
  return { ok: true, adapter: adapterFor(provider) };
}

function adapterFor(provider: PaymentProviderId): PaymentAdapter {
  switch (provider) {
    case "selcom":  return selcomAdapter;
    case "azampay": return azampayAdapter;
    case "mock":
    default:        return mockAdapter;
  }
}

// ── MOCK ADAPTER (default) — deterministic dev/test provider ──────────────────
// Behaviour is IDENTICAL to the pre-adapter stub: ~1.5s latency, a DECLINE test
// hook (amount ending in 13), and PENDING-vs-CONFIRMED gated by PAYMENTS_DEMO_ASYNC.

const mockAdapter: PaymentAdapter = {
  name: "mock",
  async deposit({ provider, amount, userId, correlationId }) {
    await new Promise((r) => setTimeout(r, 1_500));
    // Test path for failure: amount ending in 13 → DECLINED.
    if (amount % 100 === 13) {
      audit({ category: "WALLET", action: "deposit.declined", actorId: userId, targetType: "User", targetId: userId, payload: { correlationId } });
      return { ok: false, reason: "DECLINED", correlationId };
    }
    // Demo-async (control-plane toggle / `PAYMENTS_DEMO_ASYNC=true`) makes the mock
    // behave like a real async gateway (return PENDING, no auto-credit) so the
    // webhook→settle path can be demoed end-to-end. Default (unset) stays
    // synchronously CONFIRMED for local dev. Forced OFF in LIVE mode.
    if (await getDemoAsyncEnabled()) return { ok: true, providerRef: `${provider}-${randomId(6).toUpperCase()}`, status: "PENDING", correlationId };
    return { ok: true, providerRef: `${provider}-${randomId(6).toUpperCase()}`, status: "CONFIRMED", correlationId };
  },
  async withdraw({ provider, correlationId }) {
    await new Promise((r) => setTimeout(r, 1_500));
    // (AML ≥ 1M is handled by the wrapper before we get here.)
    if (await getDemoAsyncEnabled()) return { ok: true, providerRef: `${provider}-${randomId(6).toUpperCase()}`, status: "PENDING", correlationId };
    return { ok: true, providerRef: `${provider}-${randomId(6).toUpperCase()}`, status: "CONFIRMED", correlationId };
  },
};

// ── REAL ADAPTERS (stubs) ─────────────────────────────────────────────────────
// Each throws until wired. The intended implementation (auth token, collection /
// disbursement endpoints, field maps, signature) is documented step-by-step in
// docs/PAYMENT-INTEGRATION-CHECKLIST.md — fill these two bodies from the signed
// aggregator's real API docs, then set PAYMENT_AGGREGATOR + the creds. Real
// collections/disbursements are ASYNC: return PENDING + the provider id, and let
// the webhook (already built, HMAC-verified, idempotent) settle the transaction.

const NOT_WIRED = (name: string) =>
  new Error(`${name} payment adapter not wired — see docs/PAYMENT-INTEGRATION-CHECKLIST.md. Set PAYMENT_AGGREGATOR only after the deposit()/withdraw() bodies are implemented + tested.`);

// ── SELCOM ADAPTER — wired to the verified gateway client (src/lib/server/selcom.ts).
// Real collections/disbursements are ASYNCHRONOUS: we return PENDING + the provider
// reference (our own correlation id, which we send to Selcom as the order_id/transid
// and which it echoes on the callback), and the webhook — settling from the signed
// order-status re-query — is the sole authority that credits/confirms, exactly once.
const selcomAdapter: PaymentAdapter = {
  name: "selcom",
  async deposit({ provider, amount, msisdn, userId, correlationId, card }) {
    const env = selcomEnv();
    if (!env) return { ok: false, reason: "PROVIDER_DOWN", correlationId };

    // ── CARD: hosted-checkout redirect, a different rail entirely ────────────
    // The buyer enters their card on Selcom's page, so there is no MSISDN and no
    // USSD push; we hand back the gateway URL and the caller redirects. Money is
    // still credited ONLY by the authoritative order-status re-query, so this
    // rail inherits the same exactly-once settlement as every other one.
    if (provider === "CARD") {
      // Refuse rather than silently fall through to the USSD push. Before this
      // branch existed, choosing "Card" on the deposit form reached the code
      // below and pushed a MOBILE-MONEY prompt to the phone number field — a
      // player picking Card got charged over mobile money instead.
      if (!card) return { ok: false, reason: "DECLINED", correlationId };
      const r = await selcomCardCheckout(env, {
        orderId: correlationId,
        amount,
        buyerEmail: card.buyerEmail,
        buyerName: card.buyerName,
        buyerPhone: card.buyerPhone,
        billing: card.billing,
        redirectUrl: card.redirectUrl,
        cancelUrl: card.cancelUrl,
      });
      if (!r.ok) return { ok: false, reason: r.reason, correlationId };
      // PENDING: the order exists but the buyer has not paid yet — they have not
      // even seen the card form. Nothing is credited until order-status says so.
      return { ok: true, status: "PENDING", providerRef: correlationId, correlationId, redirectUrl: r.gatewayUrl };
    }

    if (!msisdn) return { ok: false, reason: "DECLINED", correlationId }; // no handset to push the USSD prompt to
    // order_id = OUR correlation id → it becomes providerRef, so the callback
    // (which echoes order_id) correlates back to this exact transaction.
    const r = await selcomDeposit(env, { orderId: correlationId, amount, msisdn, userId });
    // AMBIGUOUS (the USSD push may have reached the handset) → do NOT fail: return
    // PENDING so the deposit stays PROCESSING and the authoritative order-status
    // re-query (webhook/reconcile) credits it exactly-once IF the customer paid.
    // Only a DEFINITIVE PROVIDER_DOWN/DECLINED (customer not charged) fails.
    if (!r.ok && r.reason !== "AMBIGUOUS") return { ok: false, reason: r.reason, correlationId, detail: r.detail };
    return { ok: true, status: "PENDING", providerRef: correlationId, correlationId };
  },
  async withdraw({ provider, amount, msisdn, correlationId }) {
    const env = selcomEnv();
    if (!env) return { ok: false, reason: "PROVIDER_DOWN", correlationId };
    if (!env.pin) return { ok: false, reason: "PROVIDER_DOWN", correlationId }; // wallet-cashin requires the float PIN
    if (!msisdn) return { ok: false, reason: "ACCOUNT_NOT_VERIFIED", correlationId }; // no payee number
    const utilityCode = mnoToSelcomCashin(provider);
    if (!utilityCode) return { ok: false, reason: "PROVIDER_DOWN", correlationId }; // rail not served by MNO cash-in
    const r = await selcomWithdraw(env, { transid: correlationId, amount, msisdn, utilityCode });
    // A payout is reversed ONLY on a DEFINITIVE Selcom rejection (reason FAILED —
    // the disbursement did not happen). AMBIGUOUS (timeout/network/HTTP error) may
    // be in flight → return PENDING so the hold is KEPT and the walletcashin/query
    // re-query (webhook/reconcile) confirms or reverses it. Never blind-reverse.
    if (!r.ok && r.reason === "FAILED") return { ok: false, reason: "PROVIDER_DOWN", correlationId };
    return { ok: true, status: "PENDING", providerRef: correlationId, correlationId };
  },
};

// ── AUTHORITATIVE STATUS RE-QUERY (for the reconcile sweep) ────────────────────
// Lets `wallet-service.reconcileStalePayments` resolve a stuck PROCESSING txn from
// the provider's own signed status endpoint instead of blindly timing it out (which
// double-pays withdrawals and strands paid deposits). Provider-agnostic: returns
// UNSUPPORTED when the active adapter has no real gateway (mock/test) or is not
// configured, PENDING while the movement is still in flight/ambiguous (leave it
// PROCESSING and re-check later), and only CONFIRMED/FAILED when Selcom is definitive.
export type VerifyStatus = "CONFIRMED" | "FAILED" | "PENDING" | "UNSUPPORTED";

export async function verifyDepositStatus(providerRef: string): Promise<{ status: VerifyStatus; amount?: number }> {
  if ((await getPaymentProvider()) !== "selcom") return { status: "UNSUPPORTED" };
  const env = selcomEnv();
  if (!env) return { status: "UNSUPPORTED" };
  const r = await selcomVerifyOrder(env, providerRef);
  if (r.status === "CONFIRMED") return { status: "CONFIRMED", amount: r.amount };
  if (r.status === "FAILED") return { status: "FAILED", amount: r.amount };
  return { status: "PENDING" };
}

export async function verifyWithdrawalStatus(providerRef: string): Promise<{ status: VerifyStatus }> {
  if ((await getPaymentProvider()) !== "selcom") return { status: "UNSUPPORTED" };
  const env = selcomEnv();
  if (!env) return { status: "UNSUPPORTED" };
  const r = await selcomVerifyCashin(env, providerRef);
  if (r.status === "CONFIRMED") return { status: "CONFIRMED" };
  if (r.status === "FAILED") return { status: "FAILED" };
  return { status: "PENDING" };
}

const azampayAdapter: PaymentAdapter = {
  name: "azampay",
  async deposit() { throw NOT_WIRED("azampay"); },
  async withdraw() { throw NOT_WIRED("azampay"); },
};

function mask(msisdn: string) {
  return msisdn.length > 6 ? `${msisdn.slice(0, 4)}*****${msisdn.slice(-2)}` : "****";
}

// `computeWithdrawalTax` is DELETED.
//
// It withheld a hardcoded 15% of EVERY withdrawal — it was called as
// `computeWithdrawalTax(amount, amount)`, i.e. treating the entire withdrawal as
// taxable winnings, and its own comment at the call site admitted this was
// "naïve". A player who deposited 100,000, never placed a bet, and withdrew,
// received 85,000. We were taking 15% of a player's own untouched deposit and
// booking it as tax.
//
// Ali's decision (2026-07): taxes are only ever on OUR commission. A player pays
// the pool fee (indirectly, through the payout) and the 1% withdrawal fee, and
// nothing else. The withdrawal fee lives in RateConfig — `withdrawalFeeRate` /
// `withdrawalGatewayShareRate` — and is applied in wallet-service.ts.
//
// ⚠️ LEGAL: the 15% cited the Income Tax Act. Removing it is a legal call, not an
// engineering one. Ali has made it; it is on the record in the session summary.
