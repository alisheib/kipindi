"use server";

/**
 * ADM4 — Payments-ops actions. All gated to ADMIN/COMPLIANCE + 2FA and audited.
 *
 * Money-safety: "Retry now" re-runs the ORIGINAL failed deposit through the
 * money-tested `deposit()` flow (deposits never debit, so this can't double-pay)
 * and cancels the old record. "Cancel & refund" only transitions a FAILED
 * record to CANCELLED — a failed withdrawal was already auto-refunded at
 * fail-time, and a failed deposit never moved money, so nothing is minted here.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import { COMPLIANCE_ROLES } from "@/lib/server/roles";
import { setKillSwitch, type Mno, MNOS } from "@/lib/server/payment-ops";
import { deposit } from "@/lib/server/wallet-service";

type DepositProvider = "MPESA" | "AIRTEL_MONEY" | "HALO_PESA" | "MIXX" | "CARD";

type Result = { ok: true } | { ok: false; error: string };

async function gate(action: string): Promise<{ userId: string; sessionId: string } | { error: string }> {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const user = await db.user.findById(session.userId);
  if (!user || !COMPLIANCE_ROLES.has(user.role)) {
    audit({ category: "SECURITY", action: "privilege_escalation_blocked", actorId: session.userId, targetType: "Action", targetId: action, payload: { role: user?.role ?? "unknown" } });
    return { error: "Forbidden: ADMIN or COMPLIANCE role required." };
  }
  await requireAdminTotp(session.userId, session.sessionId);
  return { userId: session.userId, sessionId: session.sessionId };
}

/** Kill-switch — pause/resume deposits or withdrawals for one MNO (hard tier). */
export async function toggleKillSwitchAction(formData: FormData): Promise<Result> {
  const g = await gate("toggleKillSwitch");
  if ("error" in g) return { ok: false, error: g.error };
  const provider = String(formData.get("provider") ?? "") as Mno;
  const kind = String(formData.get("kind") ?? "") as "deposits" | "withdrawals";
  const paused = String(formData.get("paused") ?? "") === "true";
  if (!MNOS.some((m) => m.id === provider)) return { ok: false, error: "Unknown provider." };
  if (kind !== "deposits" && kind !== "withdrawals") return { ok: false, error: "Invalid flow." };
  await setKillSwitch(provider, kind, paused, g.userId);
  revalidatePath("/admin/payments");
  return { ok: true };
}

/** Retry a failed DEPOSIT via the tested deposit() flow; cancel the old record. */
export async function retryDepositAction(formData: FormData): Promise<Result> {
  const g = await gate("retryDeposit");
  if ("error" in g) return { ok: false, error: g.error };
  const txnId = String(formData.get("txnId") ?? "");
  const t = await db.txn.findById(txnId);
  if (!t || t.type !== "DEPOSIT" || t.status !== "FAILED") return { ok: false, error: "Not a retryable failed deposit." };
  const r = await deposit(t.userId, { provider: (t.provider ?? "MPESA") as DepositProvider, amount: Math.abs(t.amount), msisdn: t.msisdn ?? undefined });
  await db.txn.update(txnId, { status: "CANCELLED", description: `${t.description ?? "deposit failed"} · superseded by retry` });
  audit({ category: "WALLET", action: "payments.retry.deposit", actorId: g.userId, targetType: "Transaction", targetId: txnId, payload: { retried: r.ok, newStatus: r.ok ? r.data?.status : null } });
  revalidatePath("/admin/payments");
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? "Retry failed again." };
}

/** Cancel & refund — close a failed money movement. */
export async function cancelRefundTxnAction(formData: FormData): Promise<Result> {
  const g = await gate("cancelRefund");
  if ("error" in g) return { ok: false, error: g.error };
  const txnId = String(formData.get("txnId") ?? "");
  const t = await db.txn.findById(txnId);
  if (!t || t.status !== "FAILED") return { ok: false, error: "Only a FAILED transaction can be cancelled." };
  await db.txn.update(txnId, { status: "CANCELLED", description: `${t.description ?? "failed"} · cancelled by operator` });
  audit({
    category: "WALLET",
    action: "payments.cancel_refund",
    actorId: g.userId,
    targetType: "Transaction",
    targetId: txnId,
    payload: { type: t.type, amount: Math.abs(t.amount), note: t.type === "WITHDRAWAL" ? "failed withdrawal already auto-refunded at fail-time; record closed" : "failed deposit never moved money; record closed" },
  });
  revalidatePath("/admin/payments");
  return { ok: true };
}
