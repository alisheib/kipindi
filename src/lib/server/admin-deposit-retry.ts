import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { canonicalDepositFunding, sameDepositFunding } from "@/lib/journey/deposit-state";
import { isMobileMoneyMethodId } from "@/lib/payment-providers";
import { DEPOSIT_FINAL_NEGATIVE_MARK, DEPOSIT_RETRY_CLAIM_MARK, DEPOSIT_RETRY_REVIEW_MARK, hasDepositStatusReview } from "@/lib/wallet/deposit-review";
import { canAdminRetryDeposit } from "@/lib/wallet/admin-deposit-retry-policy";
import { audit } from "./audit";
import { withLock } from "./locks";
import { db, type StoredTxn } from "./store";
import { deposit } from "./wallet-service";

const REVIEW_NOTE = "admin retry held: provider-negative proof unavailable; review required";

/** This key is stable across a lost response, separate admin sessions and bulk/single clicks.
 * The original row id is hashed to keep the stored key bounded below 256 characters. */
export function adminDepositRetryKey(originalId: string): string {
  return `admin-retry-deposit:v1:${createHash("sha256").update(originalId).digest("hex")}`;
}

function matchesChild(original: StoredTxn, child: StoredTxn, key: string): boolean {
  return child.id !== original.id && child.idempotencyKey === key
    && Date.parse(child.createdAt) >= Date.parse(original.createdAt)
    && (child.origin ?? null) === (original.origin ?? null)
    && sameDepositFunding(original, child);
}

type RetryResult =
  | { ok: true; childTxnId: string; childStatus: StoredTxn["status"]; recovered: boolean; recoveryRequired: boolean }
  | { ok: false; error: string; reviewRequired?: boolean };

type Check =
  | { kind: "dispatch"; original: StoredTxn }
  | { kind: "child"; original: StoredTxn; child: StoredTxn }
  | { kind: "review"; reason: string }
  | { kind: "blocked"; error: string };

/** Shared by the single-row and bulk actions. No provider call occurs until the original
 * FAILED row's verified negative, unique reference and full funding identity have been
 * freshly checked under the same wallet lock used by callback settlement. */
export async function retryFailedDepositFromAdmin(originalId: string, actorId: string, source: "single" | "bulk"): Promise<RetryResult> {
  const initial = await db.txn.findById(originalId);
  if (!initial || initial.type !== "DEPOSIT") return { ok: false, error: "Not a failed deposit." };
  const key = adminDepositRetryKey(initial.id);

  const markReview = async (row: StoredTxn, reason: string, tx: Prisma.TransactionClient | null): Promise<Check> => {
    if (row.status === "FAILED" && (!row.description?.includes(REVIEW_NOTE)
      || row.providerStatus == null || row.providerStatus === DEPOSIT_FINAL_NEGATIVE_MARK || row.providerStatus === DEPOSIT_RETRY_CLAIM_MARK)) {
      const nextStatus = row.providerStatus == null || row.providerStatus === DEPOSIT_FINAL_NEGATIVE_MARK || row.providerStatus === DEPOSIT_RETRY_CLAIM_MARK
        ? DEPOSIT_RETRY_REVIEW_MARK : row.providerStatus;
      const saved = await db.txn.update(row.id,
        { description: row.description?.includes(REVIEW_NOTE) ? row.description : `${row.description ?? "Deposit failed"} · ${REVIEW_NOTE}`,
          providerStatus: nextStatus }, tx);
      if (!saved || saved.status !== "FAILED" || !saved.description?.includes(REVIEW_NOTE) || saved.providerStatus !== nextStatus)
        throw new Error("Deposit retry review could not be persisted");
    }
    return { kind: "review", reason };
  };

  let checked: Check;
  try {
    checked = await withLock(`wallet:${initial.userId}`, async (tx): Promise<Check> => {
      const original = await db.txn.findById(originalId, tx);
      if (!original || original.userId !== initial.userId || original.type !== "DEPOSIT")
        return { kind: "blocked", error: "The original deposit changed. Refresh before retrying." };
      if (hasDepositStatusReview(original)) return { kind: "review", reason: "original has a contradictory provider result" };
      const child = await db.txn.findByIdempotencyKey(key, tx);
      if (child && !matchesChild(original, child, key))
        return markReview(original, "retry key belongs to another funding identity", tx);
      if (original.status === "CANCELLED" && child) return { kind: "child", original, child };
      if (original.status !== "FAILED") return { kind: "blocked", error: "Not a retryable failed deposit." };
      if (!canAdminRetryDeposit(original, true)) return markReview(original, "definitive provider-negative proof or mobile funding identity is absent", tx);
      let selected: StoredTxn | null;
      try { selected = await db.txn.findByProviderRef(original.providerRef!, tx); }
      catch { return markReview(original, "original provider reference is ambiguous", tx); }
      if (!selected || selected.id !== original.id) return markReview(original, "original provider reference is not uniquely owned", tx);
      // Claim the old row before releasing this lock for provider I/O. Otherwise an
      // officer's Cancel can close it in the gap and still allow a new collection.
      if (original.providerStatus === DEPOSIT_FINAL_NEGATIVE_MARK) {
        const claimed = await db.txn.update(original.id, { providerStatus: DEPOSIT_RETRY_CLAIM_MARK }, tx);
        if (!claimed || claimed.status !== "FAILED" || claimed.providerStatus !== DEPOSIT_RETRY_CLAIM_MARK)
          throw new Error("Deposit retry claim could not be persisted");
      }
      return child ? { kind: "child", original, child } : { kind: "dispatch", original };
    });
  } catch {
    return { ok: false, error: "The retry check could not be saved. No new payment was requested." };
  }
  if (checked.kind === "blocked") return { ok: false, error: checked.error };
  if (checked.kind === "review") {
    await audit({ category: "COMPLIANCE", action: "payments.retry.deposit.needs_review", actorId, targetType: "Transaction", targetId: originalId,
      payload: { source, reason: checked.reason, note: "No replacement collection was requested." } });
    return { ok: false, error: "Provider failure is not proven. This deposit needs payment review before retry or closure.", reviewRequired: true };
  }

  let child = checked.kind === "child" ? checked.child : null;
  let refused: string | null = null;
  if (!child) {
    const intent = canonicalDepositFunding(checked.original);
    // The policy above established this; repeat the narrowing here so no future caller can
    // widen the helper into Card or an unsupported payout rail by changing one condition.
    if (!intent || !isMobileMoneyMethodId(intent.provider))
      return { ok: false, error: "The original funding identity needs review.", reviewRequired: true };
    try {
      const started = await deposit(checked.original.userId, {
        provider: intent.provider, amount: intent.amount, msisdn: intent.msisdn ?? undefined,
        origin: checked.original.origin === "low_balance" ? "low_balance" : undefined,
      }, key, undefined, intent.pendingBet);
      if (!started.ok) refused = started.error;
    } catch {
      refused = "The retry answer was lost. Refresh and inspect the original order before acting again.";
    }
    // A failed response may still follow reservation or dispatch. The key, not that
    // response, decides whether another click may call the provider again.
    child = await db.txn.findByIdempotencyKey(key);
  }
  if (!child) {
    if (refused) return { ok: false, error: refused };
    await withLock(`wallet:${initial.userId}`, async (tx) => {
      const original = await db.txn.findById(originalId, tx);
      if (original) await markReview(original, "replacement row missing after successful answer", tx);
    });
    await audit({ category: "COMPLIANCE", action: "payments.retry.deposit.needs_review", actorId, targetType: "Transaction", targetId: originalId,
      payload: { source, reason: "deposit reported success without a recoverable replacement row" } });
    return { ok: false, error: "Retry status is uncertain. Review the original deposit before another attempt.", reviewRequired: true };
  }

  type Finish = { kind: "done"; child: StoredTxn } | { kind: "review"; reason: string };
  let finish: Finish;
  try {
    finish = await withLock(`wallet:${initial.userId}`, async (tx): Promise<Finish> => {
      const original = await db.txn.findById(originalId, tx);
      const persistedChild = await db.txn.findByIdempotencyKey(key, tx);
      if (!original || !persistedChild || !matchesChild(original, persistedChild, key)) {
        if (original) await markReview(original, "replacement identity could not be verified", tx);
        return { kind: "review", reason: "replacement identity could not be verified" };
      }
      // Reservation can succeed before the correlation-reference write or provider
      // dispatch fails. That row is not evidence of a replacement collection.
      if (!persistedChild.providerRef || persistedChild.status === "FAILED" || persistedChild.status === "CANCELLED") {
        await markReview(original, "replacement was reserved without a dispatchable provider order", tx);
        return { kind: "review", reason: "replacement was reserved without a dispatchable provider order" };
      }
      if (hasDepositStatusReview(original)) return { kind: "review", reason: "late confirmation contradicted the original failed order" };
      if (original.status === "CANCELLED") return { kind: "done", child: persistedChild };
      if (!canAdminRetryDeposit(original, true)) return { kind: "review", reason: "original failure authority changed while retrying" };
      const saved = await db.txn.update(originalId,
        { status: "CANCELLED", description: `${original.description ?? "Deposit failed"} · superseded by retry ${persistedChild.id}` }, tx);
      if (!saved || saved.status !== "CANCELLED") throw new Error("Original deposit closure could not be committed");
      return { kind: "done", child: persistedChild };
    });
  } catch {
    return { ok: false, error: "A replacement exists, but its original could not be closed. Refresh and review both deposits.", reviewRequired: true };
  }
  if (finish.kind === "review") {
    await audit({ category: "COMPLIANCE", action: "payments.retry.deposit.needs_review", actorId, targetType: "Transaction", targetId: originalId,
      payload: { source, childTxnId: child.id, reason: finish.reason } });
    return { ok: false, error: "A replacement exists, but the original payment changed. Review both deposits.", reviewRequired: true };
  }
  await audit({ category: "WALLET", action: "payments.retry.deposit", actorId, targetType: "Transaction", targetId: originalId,
    payload: { source, childTxnId: finish.child.id, childStatus: finish.child.status, recovered: checked.kind === "child" } });
  return { ok: true, childTxnId: finish.child.id, childStatus: finish.child.status,
    recovered: checked.kind === "child", recoveryRequired: finish.child.status === "PROCESSING" };
}
