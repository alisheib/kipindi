/**
 * Payment provider abstraction.
 * Production: swap to Selcom / Azampay aggregator (BoT-licensed) — covers
 * M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Mixx by Yas, plus card.
 * Dev: deterministic mock — instant approval, simulates 1.5–3s latency.
 *
 * Compliance:
 *  - Provider correlation IDs persisted on `Transaction.providerRef` for
 *    chargeback / dispute / regulator inspection.
 *  - All requests audited (WALLET category).
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

/** Mock deposit — always succeeds, latency ~1.5s. */
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
  await new Promise((r) => setTimeout(r, 1_500));
  // Test paths for failure: amount ending in 13 → DECLINED
  if (opts.amount % 100 === 13) {
    audit({ category: "WALLET", action: "deposit.declined", actorId: opts.userId, targetType: "User", targetId: opts.userId, payload: { correlationId } });
    return { ok: false, reason: "DECLINED", correlationId };
  }
  // Real mobile-money/card collections are ASYNCHRONOUS: the initiate call only
  // pushes a prompt to the customer's handset; the final result arrives later on
  // the webhook. `PAYMENTS_DEMO_ASYNC=true` makes the mock behave that way (return
  // PENDING, no auto-credit) so the webhook→settle path can be demoed end-to-end.
  // Default (unset) stays synchronously CONFIRMED for local dev / the gauntlet.
  if (isAsyncMode()) {
    return { ok: true, providerRef: `${opts.provider}-${randomId(6).toUpperCase()}`, status: "PENDING", correlationId };
  }
  return { ok: true, providerRef: `${opts.provider}-${randomId(6).toUpperCase()}`, status: "CONFIRMED", correlationId };
}

/** Mock withdrawal. Triggers AML review path on amounts ≥ 1,000,000 TZS. */
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
  await new Promise((r) => setTimeout(r, 1_500));
  if (opts.amount >= 1_000_000) {
    audit({ category: "COMPLIANCE", action: "withdraw.aml_review_triggered", actorId: opts.userId, targetType: "User", targetId: opts.userId, payload: { correlationId, amount: opts.amount, threshold: 1_000_000 } });
    return { ok: true, providerRef: `${opts.provider}-${randomId(6).toUpperCase()}`, status: "AML_REVIEW", correlationId };
  }
  // Async payout simulation — see dispatchDeposit. The funds stay held until the
  // provider's payout webhook confirms (or fails) the disbursement.
  if (isAsyncMode()) {
    return { ok: true, providerRef: `${opts.provider}-${randomId(6).toUpperCase()}`, status: "PENDING", correlationId };
  }
  return { ok: true, providerRef: `${opts.provider}-${randomId(6).toUpperCase()}`, status: "CONFIRMED", correlationId };
}

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
