"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit, getAuditPage } from "@/lib/server/audit";

import { TWO_PERSON_THRESHOLD_TZS } from "./constants";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

async function requireAdmin() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const u = db.user.findById(session.userId);
  if (!session.demoMode && !(u && ADMIN_ROLES.has(u.role))) redirect("/auth/login");
  return { session, role: u?.role ?? "DEMO" };
}

/**
 * Find the first-officer co-signature for a transaction, if one exists.
 * Returns the audit entry (so we can extract actorId and timestamp) or null.
 */
function findFirstSignature(txnId: string): { actorId: string | null; at: string } | null {
  const entries = getAuditPage({ category: "ADMIN", limit: 200 });
  const sig = entries.find((e) => e.action === "aml.approve.stage1" && e.targetId === txnId);
  if (!sig) return null;
  return { actorId: sig.actorId, at: sig.at };
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

  const all = db.txn.listByStatus("AML_REVIEW");
  const txn = all.find((t) => t.id === txnId);
  if (!txn) return { ok: false as const, error: "Transaction not in AML_REVIEW." };

  const requiresTwo = Math.abs(txn.amount) >= TWO_PERSON_THRESHOLD_TZS;
  if (requiresTwo) {
    const first = findFirstSignature(txnId);
    if (!first) {
      // First-stage approval: don't release the funds yet.
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
    // Stage-2: release the funds.
    db.txn.update(txnId, {
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
  db.txn.update(txnId, {
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
}

export async function rejectAmlAction(formData: FormData) {
  const { session } = await requireAdmin();
  const txnId = String(formData.get("txnId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (!txnId) return { ok: false as const, error: "Missing transaction id." };
  if (reason.length < 5) return { ok: false as const, error: "Reason is required (≥ 5 chars)." };

  const all = db.txn.listByStatus("AML_REVIEW");
  const txn = all.find((t) => t.id === txnId);
  if (!txn) return { ok: false as const, error: "Transaction not in AML_REVIEW." };

  // Reverse the held funds back to wallet (if it's a withdrawal that placed a hold)
  // and mark FAILED with the reason.
  const wallet = db.wallet.findByUserId(txn.userId);
  if (wallet && txn.type === "WITHDRAWAL") {
    db.wallet.update(wallet.id, { balance: wallet.balance + Math.abs(txn.amount) });
  }
  db.txn.update(txnId, {
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

  revalidatePath("/admin/aml");
  return { ok: true as const };
}
