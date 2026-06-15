"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db, type StoredTxn } from "@/lib/server/store";
import { audit, getAuditPage } from "@/lib/server/audit";
import { withLock } from "@/lib/server/locks";

import { TWO_PERSON_THRESHOLD_TZS } from "./constants";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

async function requireAdmin() {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const u = await db.user.findById(session.userId);
  if (!(u && ADMIN_ROLES.has(u.role))) redirect("/auth/admin");
  return { session, role: u?.role ?? "ADMIN" };
}

/**
 * Find the first-officer co-signature for a transaction, if one exists.
 * Returns the audit entry (so we can extract actorId and timestamp) or null.
 */
function findFirstSignature(txnId: string): { actorId: string | null; at: string } | null {
  const entries = getAuditPage({ category: "ADMIN", limit: 200 });
  const sig = entries.find((e) => e.action === "aml.approve.stage1" && e.targetId === txnId);
  if (!sig) return null;
  return { actorId: sig.actorId, at: sig.createdAt };
}

/**
 * Approve a transaction held in AML_REVIEW.
 *
 * Two-person rule (POCA Cap 423 §16 + FATF R.10): for amounts ≥ TZS 5M, two
 * different officers must approve. The first click records `aml.approve.stage1`
 * — the txn stays in AML_REVIEW. A different officer's second click flips to
 * CONFIRMED and records `aml.approved` linking back to the first officer's id.
 *
 * For amounts under the threshold, single-officer approval still applies.
 */
export async function approveAmlAction(formData: FormData) {
  const { session } = await requireAdmin();
  const txnId = String(formData.get("txnId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (!txnId) return { ok: false as const, error: "Missing transaction id." };

  // Lock the transaction to prevent TOCTOU — two officers clicking
  // approve simultaneously could both read AML_REVIEW status and both
  // flip to CONFIRMED, bypassing the two-person rule.
  return withLock(`aml-txn:${txnId}`, async () => {
    const all = (await db.txn.listByStatus("AML_REVIEW")) as StoredTxn[];
    const txn = all.find((t) => t.id === txnId);
    if (!txn) return { ok: false as const, error: "Transaction not in AML_REVIEW." };

    // Releasing an AML-approved withdrawal must clear this txn's `hold` exactly
    // like withdraw()'s success path. withdraw() moved balance→hold; on approve
    // the money leaves the platform, so the hold is dropped (NOT returned to
    // balance — that would re-credit the player). Without this, `hold` leaks
    // upward forever on every approved withdrawal (≥ TZS 1M), corrupting the
    // balance+hold ledger invariant and liability accounting.
    const releaseWithdrawalHold = async () => {
      if (txn.type !== "WITHDRAWAL") return;
      await withLock(`wallet:${txn.userId}`, async () => {
        const w = await db.wallet.findByUserId(txn.userId);
        if (w) await db.wallet.adjust(w.id, { hold: -Math.abs(txn.amount) });
      });
    };

    const requiresTwo = Math.abs(txn.amount) >= TWO_PERSON_THRESHOLD_TZS;
    if (requiresTwo) {
      const first = findFirstSignature(txnId);
      if (!first) {
        audit({
          category: "ADMIN",
          action: "aml.approve.stage1",
          actorId: session.userId,
          targetType: "Transaction",
          targetId: txnId,
          payload: { amount: txn.amount, reason: reason || null, threshold: TWO_PERSON_THRESHOLD_TZS },
        });
        revalidatePath("/admin/aml");
        return { ok: true as const, stage: "stage1" as const, message: "Stage 1 recorded — second officer required to release." };
      }
      if (first.actorId === session.userId) {
        return { ok: false as const, error: "Second-officer approval must come from a different reviewer." };
      }
      await releaseWithdrawalHold();
      await db.txn.update(txnId, {
        status: "CONFIRMED",
        completedAt: new Date().toISOString(),
        amlReason: reason || txn.amlReason,
      });
      audit({
        category: "ADMIN",
        action: "aml.approved",
        actorId: session.userId,
        targetType: "Transaction",
        targetId: txnId,
        payload: {
          amount: txn.amount,
          reason: reason || null,
          twoPersonApproval: "complete",
          firstOfficer: first.actorId,
          firstOfficerAt: first.at,
          secondOfficer: session.userId,
        },
      });
      revalidatePath("/admin/aml");
      return { ok: true as const, stage: "complete" as const };
    }

    // Below threshold — single-officer approval.
    await releaseWithdrawalHold();
    await db.txn.update(txnId, {
      status: "CONFIRMED",
      completedAt: new Date().toISOString(),
      amlReason: reason || txn.amlReason,
    });
    audit({
      category: "ADMIN",
      action: "aml.approved",
      actorId: session.userId,
      targetType: "Transaction",
      targetId: txnId,
      payload: { amount: txn.amount, reason: reason || null, twoPersonApproval: "below-threshold" },
    });
    revalidatePath("/admin/aml");
    return { ok: true as const, stage: "complete" as const };
  });
}

export async function rejectAmlAction(formData: FormData) {
  const { session } = await requireAdmin();
  const txnId = String(formData.get("txnId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (!txnId) return { ok: false as const, error: "Missing transaction id." };
  if (reason.length < 5) return { ok: false as const, error: "Reason is required (≥ 5 chars)." };

  // Lock the whole reject on the transaction (like approveAmlAction) so two
  // officers / a double-click can't both pass the AML_REVIEW check and refund
  // twice — crediting the player's balance for the same withdrawal more than once.
  return withLock(`aml-txn:${txnId}`, async () => {
    const all = (await db.txn.listByStatus("AML_REVIEW")) as StoredTxn[];
    const txn = all.find((t) => t.id === txnId);
    if (!txn) return { ok: false as const, error: "Transaction not in AML_REVIEW." };

    // Reverse the held funds back to wallet (if it's a withdrawal that placed a
    // hold) and mark FAILED. The inner wallet lock also guards against a
    // concurrent bet/deposit/withdrawal reading a stale balance.
    if (txn.type === "WITHDRAWAL") {
      await withLock(`wallet:${txn.userId}`, async () => {
        const wallet = await db.wallet.findByUserId(txn.userId);
        if (wallet) {
          const amt = Math.abs(txn.amount);
          // withdraw() moved the funds balance -> hold. Reversing on reject must
          // BOTH credit balance AND release the hold, or `hold` leaks upward
          // forever (corrupting the balance+hold ledger invariant + AML totals).
          await db.wallet.adjust(wallet.id, { balance: amt, hold: -amt });
        }
      });
    }
    await db.txn.update(txnId, {
      status: "FAILED",
      completedAt: new Date().toISOString(),
      amlReason: reason,
    });

    audit({
      category: "ADMIN",
      action: "aml.rejected",
      actorId: session.userId,
      targetType: "Transaction",
      targetId: txnId,
      payload: { amount: txn.amount, reason },
    });

    // Tell the player their withdrawal was returned (best-effort).
    if (txn.type === "WITHDRAWAL") {
      const { sendEmailToUser, amlRejectRefundHtml } = await import("@/lib/server/email");
      sendEmailToUser(txn.userId, (email) => ({
        to: email,
        subject: `Withdrawal returned · TZS ${Math.abs(txn.amount).toLocaleString()}`,
        html: amlRejectRefundHtml({ amount: Math.abs(txn.amount), reason }),
        tag: "aml-refund",
      }));
    }

    revalidatePath("/admin/aml");
    return { ok: true as const };
  });
}
