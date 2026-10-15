/** Explicit terminal check only. Ordinary status/recovery retain their PROCESSING-only automatic probe policy. */
import { db } from "./store";
import { audit } from "./audit";
import { rateCheckAsync } from "./rate-limit";
import { verifyDepositStatus } from "./payments";
import { settlePaymentWebhook } from "./wallet-service";
import { withLock } from "./locks";
import { canonicalDepositFunding, depositProjection, ownedDeposit, sameDepositFunding } from "@/lib/journey/deposit-state";
import { isMobileMoneyMethodId } from "@/lib/payment-providers";
import { matchesDepositRecheckBinding, parsePostedDepositRecheckBinding } from "@/lib/journey/deposit-recheck-binding";
import type { DepositStatusView } from "./deposit-status";

export type DepositRecheckRead = {
  view: DepositStatusView & { failureAuthority?: "signed-recheck" };
  rateLimited: boolean;
  unavailable: boolean;
};

/** A signed FAILED is authority only for the same fresh, unmarked funding row and current wallet. No dispatch/key. */
export async function recheckDepositStatus(userId: string, txnId: string, expected: unknown): Promise<DepositRecheckRead> {
  const unknown = (retryAfterSec = 0, rateLimited = false, unavailable = false): DepositRecheckRead => ({
    view: { state: "UNKNOWN", serverNow: Date.now(), retryAfterSec }, rateLimited, unavailable,
  });
  if (!userId) return unknown();
  const callerRate = await rateCheckAsync(userId, "deposit.status");
  if (!callerRate.allowed) return unknown(callerRate.retryAfterSec, true);
  try {
    if (typeof txnId !== "string" || txnId.length === 0 || txnId.length > 128 || !/^[a-z0-9_-]+$/i.test(txnId)) {
      await audit({ category: "SECURITY", action: "deposit.recheck.lookup_refused", actorId: userId,
        targetType: "Transaction", targetId: null, payload: { reason: "invalid-identifier" } });
      return unknown();
    }
    // The tuple arrives from the browser: the posted shape (UUID-or-null key) is checked before any lookup.
    const binding = parsePostedDepositRecheckBinding(expected);
    if (!binding || binding.owner !== userId || binding.txnId !== txnId) return unknown();
    const stored = await db.txn.findById(txnId);
    const funding = canonicalDepositFunding(stored);
    if (!ownedDeposit(userId, stored) || !funding || !matchesDepositRecheckBinding(userId, txnId, binding, stored)) {
      await audit({ category: "SECURITY", action: "deposit.recheck.lookup_refused", actorId: userId,
        targetType: "Transaction", targetId: null, payload: { reason: "scope" } });
      return unknown();
    }
    // The memory DAL can return its row object. Freeze the normalized funding identity before any awaited provider
    // work, so a later mutation cannot silently change both sides of the fresh comparison.
    const initial = { ...stored, pendingBet: funding.pendingBet };
    const initialProjection = depositProjection(userId, initial, Date.now());
    if (initialProjection.state === "UNKNOWN" || initialProjection.state === "PENDING" || initialProjection.state === "RETURNED") return unknown();
    let verifiedTerminal: "FAILED" | "CONFIRMED" | undefined;
    let verifiedAmount: number | undefined;
    // Held/review authority is retained without another provider call. Existing paid rows can be read,
    // but only a raw FAILED with no hold/review can acquire safe-new-payment authority from this explicit operation.
    if (initialProjection.state === "FAILED") {
      if (initial.status !== "FAILED" || !initial.providerRef || (initial.provider !== "CARD" && !isMobileMoneyMethodId(initial.provider))) return unknown();
      const probeRate = await rateCheckAsync(initial.id, "deposit.probe");
      if (!probeRate.allowed) return unknown(probeRate.retryAfterSec, true);
      const verified = await verifyDepositStatus(initial.providerRef);
      if (verified.status !== "FAILED" && verified.status !== "CONFIRMED") return unknown();
      if (verified.amount !== undefined && (!Number.isSafeInteger(verified.amount) || verified.amount <= 0 || verified.amount !== initial.amount)) return unknown();
      verifiedTerminal = verified.status;
      verifiedAmount = verified.amount;
    }
    // Never hold a connection while querying the provider. Bind its answer to a fresh row inside the existing lock.
    return await withLock(`wallet:${userId}`, async (tx) => {
      let fresh = await db.txn.findById(initial.id, tx);
      if (!ownedDeposit(userId, fresh) || !sameDepositFunding(initial, fresh)
        || fresh.providerRef !== initial.providerRef || fresh.idempotencyKey !== initial.idempotencyKey
        || !matchesDepositRecheckBinding(userId, txnId, binding, fresh)) return unknown();
      let projection = depositProjection(userId, fresh, Date.now());
      if (projection.state === "UNKNOWN" || projection.state === "PENDING" || projection.state === "RETURNED") return unknown();
      // A provider contradiction may be recorded only for a valid current wallet. Read before that mutation;
      // the marker-only claim below changes no balance and reenters this same wallet lock.
      const wallet = await db.wallet.findByUserId(userId, tx);
      if (!wallet || wallet.currency !== "TZS" || !Number.isFinite(wallet.balance) || wallet.balance < 0) return unknown();
      const opposed = (fresh.status === "FAILED" && verifiedTerminal === "CONFIRMED")
        || (fresh.status === "CONFIRMED" && verifiedTerminal === "FAILED");
      if (opposed && projection.state !== "REVIEW" && projection.state !== "HELD") {
        // Claim only after fresh canonical binding, including any drift during provider I/O. The existing claim
        // reenters this SAME wallet lock; it records review, never a debit/reversal or a new collection.
        await settlePaymentWebhook({ providerRef: fresh.providerRef!, status: verifiedTerminal!,
          ...(verifiedTerminal === "CONFIRMED" ? { amount: verifiedAmount } : {}) }, binding);
        fresh = await db.txn.findById(initial.id, tx);
        if (!ownedDeposit(userId, fresh) || !sameDepositFunding(initial, fresh)
          || fresh.providerRef !== initial.providerRef || fresh.idempotencyKey !== initial.idempotencyKey
          || !matchesDepositRecheckBinding(userId, txnId, binding, fresh)) return unknown();
        projection = depositProjection(userId, fresh, Date.now());
      }
      if (projection.state === "UNKNOWN" || projection.state === "PENDING" || projection.state === "RETURNED") return unknown();
      if (opposed && projection.state !== "REVIEW" && projection.state !== "HELD") return unknown();
      if (projection.state === "FAILED" && (verifiedTerminal !== "FAILED" || fresh.status !== "FAILED")) return unknown();
      if (projection.state === "FAILED") {
        const referenced = await db.txn.findByProviderRef(fresh.providerRef!, tx);
        if (!referenced || referenced.id !== fresh.id) return unknown();
      }
      return { view: { ...projection, balance: wallet.balance, retryAfterSec: 0,
        ...(projection.state === "FAILED" ? { failureAuthority: "signed-recheck" as const } : {}) }, rateLimited: false, unavailable: false };
    });
  } catch { return unknown(0, false, true); }
}
