"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

async function requireAdmin() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const u = db.user.findById(session.userId);
  if (!session.demoMode && !(u && ADMIN_ROLES.has(u.role))) redirect("/auth/login");
  return { session, role: u?.role ?? "DEMO" };
}

/**
 * Approve a transaction held in AML_REVIEW. In production, this requires a
 * second reviewer for amounts ≥ TZS 5M (the second click on the row); this
 * single-officer build records both the click and the simulated co-signature
 * for now.
 */
export async function approveAmlAction(formData: FormData) {
  const { session } = await requireAdmin();
  const txnId = String(formData.get("txnId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (!txnId) return { ok: false as const, error: "Missing transaction id." };

  // Look up the transaction; only AML_REVIEW txns can be approved.
  const all = db.txn.listByStatus("AML_REVIEW");
  const txn = all.find((t) => t.id === txnId);
  if (!txn) return { ok: false as const, error: "Transaction not in AML_REVIEW." };

  // For withdrawals: complete by moving to PROCESSING, then CONFIRMED via
  // payment-provider hook. For this build we just flip to CONFIRMED.
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
    payload: { amount: txn.amount, reason: reason || null, twoPersonApproval: "single-officer-build" },
  });

  revalidatePath("/admin/aml");
  return { ok: true as const };
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
