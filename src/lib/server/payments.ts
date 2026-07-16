/**
 * Payment provider abstraction — env-switched ADAPTER pattern (mirrors `sms.ts`).
 *
 * The active adapter is chosen by `PAYMENT_AGGREGATOR`:
 *   ""/"mock" (default) → `mockAdapter`  — deterministic dev/test provider.
 *   "selcom"            → `selcomAdapter` — Selcom (BoT-licensed aggregator).
 *   "azampay"           → `azampayAdapter`— AzamPay (BoT-licensed aggregator).
 * Both real adapters currently THROW "not wired" — see
 * `docs/PAYMENT-INTEGRATION-CHECKLIST.md` for the fill-in-the-blanks runbook.
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

export type PaymentProvider = "MPESA" | "TIGO_PESA" | "AIRTEL_MONEY" | "HALO_PESA" | "MIXX" | "TTCL_PESA" | "CARD" | "BANK_TRANSFER" | "INTERNAL";

export type DepositResult =
  | { ok: true; providerRef: string; status: "CONFIRMED" | "PENDING"; correlationId: string }
  | { ok: false; reason: "INSUFFICIENT_FUNDS" | "PROVIDER_DOWN" | "TIMEOUT" | "DECLINED" | "FRAUD"; correlationId: string };

export type WithdrawResult =
  | { ok: true; providerRef: string; status: "CONFIRMED" | "PENDING" | "AML_REVIEW"; correlationId: string }
  | { ok: false; reason: "INSUFFICIENT_BALANCE" | "PROVIDER_DOWN" | "ACCOUNT_NOT_VERIFIED" | "DAILY_LIMIT" | "FRAUD"; correlationId: string };

/** What the wrapper hands an adapter — the caller's request plus the correlation
 *  id the wrapper already minted and audited. */
export type DispatchOpts = { provider: PaymentProvider; amount: number; msisdn?: string; userId: string; correlationId: string };

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
export async function dispatchDeposit(opts: { provider: PaymentProvider; amount: number; msisdn?: string; userId: string }): Promise<DepositResult> {
  const correlationId = `dep_${randomId(10)}`;
  audit({
    category: "WALLET",
    action: "deposit.dispatch",
    actorId: opts.userId,
    targetType: "User",
    targetId: opts.userId,
    payload: { correlationId, provider: opts.provider, amount: opts.amount, msisdn: opts.msisdn ? mask(opts.msisdn) : null },
  });
  return pickAdapter().deposit({ ...opts, correlationId });
}

/** Initiate a withdrawal disbursement through the active gateway. Amounts
 *  ≥ AML_REVIEW_THRESHOLD_TZS are held for review and NOT sent to the gateway. */
export async function dispatchWithdrawal(opts: { provider: PaymentProvider; amount: number; msisdn?: string; userId: string }): Promise<WithdrawResult> {
  const correlationId = `wdr_${randomId(10)}`;
  audit({
    category: "WALLET",
    action: "withdraw.dispatch",
    actorId: opts.userId,
    targetType: "User",
    targetId: opts.userId,
    payload: { correlationId, provider: opts.provider, amount: opts.amount, msisdn: opts.msisdn ? mask(opts.msisdn) : null },
  });
  // Compliance FIRST, before any adapter is touched — a large payout is held for
  // a second-officer AML review; we never dispatch it to the gateway on the spot.
  if (opts.amount >= AML_REVIEW_THRESHOLD_TZS) {
    audit({ category: "COMPLIANCE", action: "withdraw.aml_review_triggered", actorId: opts.userId, targetType: "User", targetId: opts.userId, payload: { correlationId, amount: opts.amount, threshold: AML_REVIEW_THRESHOLD_TZS } });
    return { ok: true, providerRef: `${opts.provider}-${randomId(6).toUpperCase()}`, status: "AML_REVIEW", correlationId };
  }
  return pickAdapter().withdraw({ ...opts, correlationId });
}

// ── ADAPTER SELECTION ─────────────────────────────────────────────────────────

function pickAdapter(): PaymentAdapter {
  switch ((process.env.PAYMENT_AGGREGATOR ?? "").toLowerCase()) {
    case "selcom":  return selcomAdapter;
    case "azampay": return azampayAdapter;
    case "":
    case "mock":
    default:        return mockAdapter;
  }
}

/**
 * Whether a REAL payout rail is live right now. The launch checklist / a future
 * boot-check use this to refuse to run real money on the mock in production
 * (mirrors `sms.ts` `smsConfigured()`). `mock` is never "configured".
 */
export function paymentGatewayConfigured(): boolean {
  const agg = (process.env.PAYMENT_AGGREGATOR ?? "").toLowerCase();
  if (agg === "selcom" || agg === "azampay") return !!process.env.PAYMENT_API_KEY && !!process.env.PAYMENT_API_SECRET;
  return false;
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
    // `PAYMENTS_DEMO_ASYNC=true` makes the mock behave like a real async gateway
    // (return PENDING, no auto-credit) so the webhook→settle path can be demoed
    // end-to-end. Default (unset) stays synchronously CONFIRMED for local dev.
    if (isAsyncMode()) return { ok: true, providerRef: `${provider}-${randomId(6).toUpperCase()}`, status: "PENDING", correlationId };
    return { ok: true, providerRef: `${provider}-${randomId(6).toUpperCase()}`, status: "CONFIRMED", correlationId };
  },
  async withdraw({ provider, correlationId }) {
    await new Promise((r) => setTimeout(r, 1_500));
    // (AML ≥ 1M is handled by the wrapper before we get here.)
    if (isAsyncMode()) return { ok: true, providerRef: `${provider}-${randomId(6).toUpperCase()}`, status: "PENDING", correlationId };
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

const selcomAdapter: PaymentAdapter = {
  name: "selcom",
  async deposit() { throw NOT_WIRED("selcom"); },
  async withdraw() { throw NOT_WIRED("selcom"); },
};

const azampayAdapter: PaymentAdapter = {
  name: "azampay",
  async deposit() { throw NOT_WIRED("azampay"); },
  async withdraw() { throw NOT_WIRED("azampay"); },
};

/** When true, the mock provider behaves like a real async gateway (returns
 *  PENDING; settlement arrives later on the webhook). Off by default. */
function isAsyncMode(): boolean {
  return process.env.PAYMENTS_DEMO_ASYNC === "true";
}

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
