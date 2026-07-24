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
import { setPaymentControls, type ControlsUpdate, type PaymentProviderId } from "@/lib/server/payment-control";
import { selcomEnv, selcomPing } from "@/lib/server/selcom";
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

/**
 * Operations control-plane — set the active payment provider and demo-async at
 * runtime. Gated to ADMIN/COMPLIANCE + 2FA and audited. The LIVE-mode hard-locks
 * (no mock on real money, real provider must be configured, no demo-async on real
 * money) are enforced in `setPaymentControls`, which refuses an invalid write —
 * this action just carries the officer id and revalidates. (Settlement is no longer
 * a control here — it is timer-driven per market; see market-scheduler.ts.)
 */
export async function setPaymentControlsAction(formData: FormData): Promise<Result> {
  const g = await gate("setPaymentControls");
  if ("error" in g) return { ok: false, error: g.error };
  const updates: ControlsUpdate = {};
  const provider = formData.get("provider");
  if (typeof provider === "string" && provider) updates.provider = provider as PaymentProviderId;
  const demoAsync = formData.get("demoAsync");
  if (typeof demoAsync === "string" && demoAsync) updates.demoAsync = demoAsync === "true";
  if (Object.keys(updates).length === 0) return { ok: false, error: "No change requested." };
  const r = await setPaymentControls(updates, g.userId);
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/admin/payments");
  return { ok: true };
}

/**
 * Test the Selcom connection WITHOUT moving money — a signed order-status probe.
 * Confirms the credentials + signature are accepted and that this server's IP is
 * on Selcom's allow-list (the call must originate from the allow-listed egress).
 * Audited; no order is created and nothing is charged.
 */
export async function testSelcomConnectionAction(): Promise<{ ok: true; detail: string } | { ok: false; error: string }> {
  const g = await gate("testSelcomConnection");
  if ("error" in g) return { ok: false, error: g.error };
  const env = selcomEnv();
  if (!env) return { ok: false, error: "Selcom is not configured — set PAYMENT_API_KEY / PAYMENT_API_SECRET / PAYMENT_VENDOR_ID / PAYMENT_API_URL." };
  const r = await selcomPing(env);
  audit({ category: "WALLET", action: "payments.selcom.ping", actorId: g.userId, targetType: "PaymentProvider", targetId: "selcom", payload: { reachable: r.reachable, authOk: r.authOk, httpStatus: r.httpStatus, resultcode: r.resultcode } });
  if (!r.reachable) return { ok: false, error: `Could not reach Selcom (${r.error}). If prod, this server's IP must be on Selcom's allow-list.` };
  if (!r.authOk) return { ok: false, error: `Reached Selcom but auth was rejected (HTTP ${r.httpStatus}). Check the API key/secret/vendor and that this IP is allow-listed.` };
  return { ok: true, detail: `Reached Selcom · HTTP ${r.httpStatus}${r.resultcode ? ` · code ${r.resultcode}` : ""}${r.message ? ` · ${r.message.slice(0, 90)}` : ""}` };
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

/** Retry a failed WITHDRAWAL via the tested withdraw() flow; cancel the old
 *  record (A4). A failed withdrawal was auto-refunded to spendable balance at
 *  fail-time, so re-initiating debits from the restored balance — no double-pay. */
export async function retryWithdrawalAction(formData: FormData): Promise<Result> {
  const g = await gate("retryWithdrawal");
  if ("error" in g) return { ok: false, error: g.error };
  const txnId = String(formData.get("txnId") ?? "");
  const t = await db.txn.findById(txnId);
  if (!t || t.type !== "WITHDRAWAL" || t.status !== "FAILED") return { ok: false, error: "Not a retryable failed withdrawal." };
  const { withdraw } = await import("@/lib/server/wallet-service");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await withdraw(t.userId, { provider: (t.provider ?? "MPESA"), amount: Math.abs(t.amount), msisdn: t.msisdn ?? undefined } as any);
  await db.txn.update(txnId, { status: "CANCELLED", description: `${t.description ?? "withdrawal failed"} · superseded by retry` });
  audit({ category: "WALLET", action: "payments.retry.withdrawal", actorId: g.userId, targetType: "Transaction", targetId: txnId, payload: { retried: r.ok, newStatus: r.ok ? r.data?.status : null } });
  revalidatePath("/admin/payments");
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? "Retry failed again." };
}

/** PSP reconciliation — manually MATCH an unmatched CONFIRMED money movement to a
 *  provider settlement id (A3). The ref removes it from reconcile() drift. */
export async function reconcileMatchAction(formData: FormData): Promise<Result> {
  const g = await gate("reconcileMatch");
  if ("error" in g) return { ok: false, error: g.error };
  const txnId = String(formData.get("txnId") ?? "");
  const providerRef = String(formData.get("providerRef") ?? "").trim().slice(0, 120);
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  if (providerRef.length < 3) return { ok: false, error: "Enter the provider settlement reference." };
  const t = await db.txn.findById(txnId);
  if (!t || t.status !== "CONFIRMED" || (t.type !== "DEPOSIT" && t.type !== "WITHDRAWAL")) return { ok: false, error: "Not an unmatched settled money movement." };
  if (t.providerRef) return { ok: false, error: "Already matched." };
  await db.txn.update(txnId, { providerRef });
  audit({ category: "COMPLIANCE", action: "payments.reconcile.matched", actorId: g.userId, targetType: "Transaction", targetId: txnId, payload: { providerRef, reason, type: t.type, amount: Math.abs(t.amount) } });
  revalidatePath("/admin/payments");
  return { ok: true };
}

/** PSP reconciliation — WRITE OFF an unmatched item with no PSP correlation
 *  (e.g. a manual/internal movement), with a mandatory reason (A3). Records a
 *  sentinel ref so it clears drift + a watched COMPLIANCE audit. No money moves. */
export async function reconcileWriteOffAction(formData: FormData): Promise<Result> {
  const g = await gate("reconcileWriteOff");
  if ("error" in g) return { ok: false, error: g.error };
  const txnId = String(formData.get("txnId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  if (reason.length < 5) return { ok: false, error: "A write-off reason (≥ 5 chars) is required." };
  const t = await db.txn.findById(txnId);
  if (!t || t.status !== "CONFIRMED" || (t.type !== "DEPOSIT" && t.type !== "WITHDRAWAL")) return { ok: false, error: "Not an unmatched settled money movement." };
  if (t.providerRef) return { ok: false, error: "Already matched." };
  await db.txn.update(txnId, { providerRef: `WRITEOFF-${g.userId.slice(0, 10)}`, amlReason: reason });
  audit({ category: "COMPLIANCE", action: "payments.reconcile.written_off", actorId: g.userId, targetType: "Transaction", targetId: txnId, payload: { reason, type: t.type, amount: Math.abs(t.amount) } });
  revalidatePath("/admin/payments");
  return { ok: true };
}

/** Bulk-retry every FAILED deposit/withdrawal (A4) via the same tested flows the
 *  single-row retry uses — deposits never debit and a failed withdrawal was
 *  auto-refunded at fail-time, so re-running can't double-pay. Capped per run. */
export async function bulkRetryAction(): Promise<{ ok: true; retried: number; stillFailed: number } | { ok: false; error: string }> {
  const g = await gate("bulkRetry");
  if ("error" in g) return { ok: false, error: g.error };
  const failed = (await db.txn.listByStatus("FAILED")).filter((t) => t.type === "DEPOSIT" || t.type === "WITHDRAWAL").slice(0, 50);
  const { deposit, withdraw } = await import("@/lib/server/wallet-service");
  let retried = 0, stillFailed = 0;
  for (const t of failed) {
    try {
      const r = t.type === "DEPOSIT"
        ? await deposit(t.userId, { provider: (t.provider ?? "MPESA") as DepositProvider, amount: Math.abs(t.amount), msisdn: t.msisdn ?? undefined })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : await withdraw(t.userId, { provider: (t.provider ?? "MPESA"), amount: Math.abs(t.amount), msisdn: t.msisdn ?? undefined } as any);
      await db.txn.update(t.id, { status: "CANCELLED", description: `${t.description ?? "failed"} · superseded by bulk retry` });
      if (r.ok) retried++; else stillFailed++;
    } catch { stillFailed++; }
  }
  audit({ category: "WALLET", action: "payments.retry.bulk", actorId: g.userId, targetType: null, targetId: null, payload: { attempted: failed.length, retried, stillFailed } });
  revalidatePath("/admin/payments");
  return { ok: true, retried, stillFailed };
}
