/** S9's private payment reader. Signed probes reuse the webhook settlement path; this never dispatches a payment. */
import { db, type StoredTxn } from "./store";
import { audit } from "./audit";
import { rateCheckAsync } from "./rate-limit";
import { verifyDepositStatus } from "./payments";
import { settlePaymentWebhook } from "./wallet-service";
import { canonicalDepositFunding, canProbeDeposit, depositProjection, ownedDeposit, type DepositProjection } from "@/lib/journey/deposit-state";

export type DepositLookup = { kind: "txn-id" | "funding-key" | "card-order"; value: string };
export type DepositStatusView =
  | { state: "UNKNOWN"; serverNow: number; retryAfterSec: number }
  | Exclude<DepositProjection, { state: "UNKNOWN" }> & { balance: number; retryAfterSec: number };
export type DepositStatusRead = { view: DepositStatusView; rateLimited: boolean; txn?: StoredTxn };

function validLookup(lookup: DepositLookup): boolean {
  if (typeof lookup.value !== "string" || !["txn-id", "funding-key", "card-order"].includes(lookup.kind)) return false;
  if (lookup.kind === "funding-key") return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lookup.value);
  return lookup.value.length > 0 && lookup.value.length <= (lookup.kind === "card-order" ? 64 : 128)
    && /^[a-z0-9_-]+$/i.test(lookup.value);
}

/** Caller budget precedes the lookup; the probe budget is spent only for an owned, eligible transaction. */
export async function readDepositStatus(userId: string, lookup: DepositLookup): Promise<DepositStatusRead> {
  const unknown = (retryAfterSec = 0, rateLimited = false): DepositStatusRead => ({
    view: { state: "UNKNOWN", serverNow: Date.now(), retryAfterSec }, rateLimited,
  });
  if (!userId) return unknown();
  const statusRate = await rateCheckAsync(userId, "deposit.status");
  if (!statusRate.allowed) return unknown(statusRate.retryAfterSec, true);
  try {
    if (!validLookup(lookup)) {
      await audit({ category: "SECURITY", action: "deposit.status.lookup_refused", actorId: userId,
        targetType: "Transaction", targetId: null, payload: { reason: "invalid-identifier" } });
      return unknown();
    }
    let txn = lookup.kind === "txn-id" ? await db.txn.findById(lookup.value)
      : lookup.kind === "funding-key" ? await db.txn.findByIdempotencyKey(lookup.value)
      : await db.txn.findByProviderRef(lookup.value);
    // All refused identifiers have the same view. The audit deliberately records neither the submitted key/reference
    // nor a foreign row id: a lookup attempt does not need somebody else's financial identifier in its audit payload.
    if (!txn || txn.userId !== userId || txn.type !== "DEPOSIT" || txn.currency !== "TZS" || txn.houseBotId != null) {
      await audit({ category: "SECURITY", action: "deposit.status.lookup_refused", actorId: userId,
        targetType: "Transaction", targetId: null, payload: { lookup: lookup.kind, reason: "scope" } });
      return unknown();
    }
    let retryAfterSec = 0;
    let verifiedTerminal: "CONFIRMED" | "FAILED" | undefined;
    // Funding-key recovery is a read only. It can recover the original reservation after a lost action answer, but
    // never dispatches, probes or settles. Card's signed browser-return adapter remains available even hours later.
    const eligible = lookup.kind === "card-order"
      ? txn.provider === "CARD" && txn.status === "PROCESSING" && !!txn.providerRef && !!canonicalDepositFunding(txn)
        && depositProjection(userId, txn, Date.now()).state === "PENDING"
      : lookup.kind === "txn-id" && canProbeDeposit(userId, txn, Date.now());
    if (eligible) {
      const probeRate = await rateCheckAsync(txn.id, "deposit.probe");
      if (!probeRate.allowed) retryAfterSec = probeRate.retryAfterSec;
      else {
        try {
          const verified = await verifyDepositStatus(txn.providerRef!);
          if (verified.status === "CONFIRMED") {
            verifiedTerminal = "CONFIRMED";
            await settlePaymentWebhook({ providerRef: txn.providerRef!, status: "CONFIRMED", amount: verified.amount });
          } else if (verified.status === "FAILED") {
            verifiedTerminal = "FAILED";
            await settlePaymentWebhook({ providerRef: txn.providerRef!, status: "FAILED" });
          }
          // PENDING, UNSUPPORTED and an unrecognised verdict carry no terminal authority.
        } catch { /* A transport/signature/settle fault remains uncertainty; reread in case a webhook won meanwhile. */ }
      }
    }
    // No stale fallback: a competing webhook or RG hold wins; a disappeared/changed row cannot retain old authority.
    txn = await db.txn.findById(txn.id);
    if (!ownedDeposit(userId, txn)) return unknown(retryAfterSec);
    const projection = depositProjection(userId, txn, Date.now());
    if (projection.state === "UNKNOWN") return unknown(retryAfterSec);
    // A failed review write must not turn the signed contradiction this request observed into safe-retry authority.
    // A persisted marker still wins after a lost write answer; the original RG-held collection remains held.
    const opposed = (txn.status === "CONFIRMED" && verifiedTerminal === "FAILED")
      || ((txn.status === "FAILED" || txn.status === "REVERSED") && verifiedTerminal === "CONFIRMED");
    if (opposed && projection.state !== "REVIEW" && projection.state !== "HELD") return unknown(retryAfterSec);
    const wallet = await db.wallet.findByUserId(userId);
    if (!wallet || wallet.currency !== "TZS" || !Number.isSafeInteger(wallet.balance) || wallet.balance < 0) return unknown(retryAfterSec);
    return { view: { ...projection, balance: wallet.balance, retryAfterSec }, rateLimited: false, txn };
  } catch { return unknown(); }
}
