"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db, type StoredTxn } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { runOutsideLock, withLock } from "@/lib/server/locks";
import { dispatchApprovedWithdrawal, refundAmlRejection } from "@/lib/server/wallet-service";
import { getFirstSignature, setFirstSignature } from "./stage1-store";

import { TWO_PERSON_THRESHOLD_TZS } from "./constants";
import { formatTzs } from "@/lib/utils";
import { requireStaff } from "@/lib/server/rbac-guard";
import { fieldError } from "@/lib/server/field-error";

// RBAC: AML release/reject moves money but is a COMPLIANCE decision → `compliance`.
// requireStaff enforces the role's canAct (Owner/ADMIN bypass), audits, then step-up
// 2FA; we re-read the role to preserve the { session, role } shape callers expect.
async function requireAdmin() {
  const session = await requireStaff("compliance");
  const u = await db.user.findById(session.userId);
  return { session, role: u?.role ?? "ADMIN" };
}

// First-officer co-signature store — moved to ./stage1-store (B-9) so the queue
// page reads the SAME durable store these actions write, instead of scanning
// the audit ring (wrong category, volatile) and never populating its badges.

/**
 * Approve a withdrawal held in AML_REVIEW and DISPATCH the payout.
 *
 * Two-person rule (POCA Cap 423 §16 + FATF R.10): every AML-held withdrawal is
 * ≥ TWO_PERSON_THRESHOLD_TZS, so two DIFFERENT officers must approve. The first
 * officer's click records `aml.approve.stage1` (the txn stays AML_REVIEW). A second,
 * different officer's click hands off to `dispatchApprovedWithdrawal`, which moves
 * AML_REVIEW → PROCESSING with a REAL provider reference, sends the payout to the
 * gateway, and lets the webhook/reconcile path settle it EXACTLY-ONCE. The hold is
 * kept until the provider confirms — no money is ever marked "sent" without dispatch.
 *
 * This replaces the old hard-block: previously approval was refused entirely because
 * it would have released the hold + marked the payout sent WITHOUT contacting the
 * gateway (destroyed money). The dispatch-first flow removes that hazard.
 *
 * A DEPOSIT held in AML awaits a REFUND, not an approval (this action never credits a
 * wallet) — resolve those with Reject.
 */
export async function approveAmlAction(formData: FormData) {
  const { session } = await requireAdmin();
  const txnId = String(formData.get("txnId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  // ⛔ DELIBERATELY PLAIN (DG-S-05): `txnId` is a hidden value the queue row supplies, not a
  // control anyone typed into — there is nothing on screen to focus, and naming a field that
  // does not render is the one failure mode `focusFirstInvalid` cannot recover from.
  if (!txnId) return { ok: false as const, error: "Missing transaction id." };
  // Releasing money is the highest-risk action — a recorded justification is
  // mandatory (FATF R.10 / EDD), matching the reject path.
  //
  // ⭐ DG-S-05 — THE ONLY FIELD-SHAPED REFUSAL IN THIS ACTION, and it is the one that stands
  // between an officer and frozen funds. The sentence is UNCHANGED; it now carries the address
  // of the control that has to change. `"aml-reason"` is the `data-field` on the reason input
  // in `aml-actions-client.tsx` — one input serves both buttons, so the reject path names the
  // same address. Every other refusal below is a STATE or SEPARATION-OF-DUTIES decision (not in
  // AML_REVIEW · self-review · a deposit awaiting a refund · the two-person rule · a gateway
  // fault): none of them is fixed by editing a box on screen, so all of them stay plain.
  if (reason.length < 5) return fieldError("aml-reason", "Reason is required (≥ 5 chars) to release funds.");

  // Lock the transaction to prevent TOCTOU — two officers clicking approve at once
  // could otherwise both pass the AML_REVIEW check and bypass the two-person rule.
  return withLock(`aml-txn:${txnId}`, async () => {
    const all = (await db.txn.listByStatus("AML_REVIEW")) as StoredTxn[];
    const txn = all.find((t) => t.id === txnId);
    if (!txn) return { ok: false as const, error: "Transaction not in AML_REVIEW." };

    // No self-review: an officer must never approve their own money movement
    // (separation of duties).
    if (txn.userId === session.userId) {
      audit({ category: "SECURITY", action: "aml.self_review_blocked", actorId: session.userId, targetType: "Transaction", targetId: txnId, payload: { amount: txn.amount, kind: "approve" } });
      return { ok: false as const, error: "You cannot approve your own transaction." };
    }

    // A DEPOSIT held here awaits a REFUND, not approval — this action never credits a
    // wallet, so approving would mark it settled with nothing delivered. Deposits reach
    // AML_REVIEW via the RG-suspense path, where what is owed is a refund. Use Reject.
    if (txn.type !== "WITHDRAWAL") {
      audit({ category: "COMPLIANCE", action: "aml.approve.deposit_refused", actorId: session.userId, targetType: "Transaction", targetId: txnId, payload: { amount: txn.amount, type: txn.type } });
      return { ok: false as const, error: "A deposit held for review cannot be approved here — it awaits a refund. Use Reject to return the funds to the player." };
    }

    const gross = Math.abs(txn.amount);

    // Two-person rule for amounts ≥ the threshold (every AML-held withdrawal qualifies).
    if (gross >= TWO_PERSON_THRESHOLD_TZS) {
      const first = await getFirstSignature(txnId);
      if (!first) {
        // First officer: record the stage-1 co-signature; the txn stays AML_REVIEW.
        await setFirstSignature(txnId, { actorId: session.userId, at: new Date().toISOString() });
        audit({ category: "COMPLIANCE", action: "aml.approve.stage1", actorId: session.userId, targetType: "Transaction", targetId: txnId, payload: { amount: gross, reason } });
        revalidatePath("/admin/aml");
        return { ok: true as const, stage: "stage1" as const, message: "First approval recorded. A second, different officer must approve to release the funds." };
      }
      if (first.actorId === session.userId) {
        return { ok: false as const, error: "A different officer must give the second approval (two-person rule)." };
      }
    }

    // Approved (second officer for ≥ threshold; single officer otherwise). Dispatch the
    // payout: dispatchApprovedWithdrawal moves AML_REVIEW → PROCESSING with a REAL
    // provider reference and lets the webhook/reconcile path settle it exactly-once.
    // The hold is kept until the provider confirms; a provider refusal leaves the txn
    // under review (never a silent auto-refund) so it can be retried or rejected.
    const firstOfficer = await getFirstSignature(txnId);
    const dispatched = await dispatchApprovedWithdrawal(txnId);
    if (!dispatched.ok) {
      audit({ category: "COMPLIANCE", action: "aml.approve.dispatch_failed", actorId: session.userId, targetType: "Transaction", targetId: txnId, payload: { amount: gross, error: dispatched.error } });
      return { ok: false as const, error: dispatched.error };
    }
    audit({
      category: "COMPLIANCE",
      action: "aml.approved",
      actorId: session.userId,
      targetType: "Transaction",
      targetId: txnId,
      payload: { amount: gross, reason, firstOfficerId: firstOfficer?.actorId ?? null, secondOfficerId: session.userId, dispatchStatus: dispatched.status },
    });
    revalidatePath("/admin/aml");
    return { ok: true as const, stage: "complete" as const, message: dispatched.status === "CONFIRMED" ? "Payout sent." : "Payout dispatched — settling now." };
  });
}

export async function rejectAmlAction(formData: FormData) {
  const { session } = await requireAdmin();
  const txnId = String(formData.get("txnId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  // ⛔ Plain for the same reason as the approve path — `txnId` renders nowhere.
  if (!txnId) return { ok: false as const, error: "Missing transaction id." };
  // ⭐ DG-S-05 — the reject panel and the approve panel are the SAME control (`AmlActionRow`
  // renders one reason input and swaps its placeholder by mode), so both refusals name one
  // address. Sentence unchanged.
  if (reason.length < 5) return fieldError("aml-reason", "Reason is required (≥ 5 chars).");

  // Lock the whole reject on the transaction (like approveAmlAction) so two
  // officers / a double-click can't both pass the AML_REVIEW check and refund
  // twice — crediting the player's balance for the same withdrawal more than once.
  // F7 · the refunded withdrawal is announced after the lock returns; its facts live inside the lock.
  let refunded: { userId: string; amountTzs: number } | null = null;
  const rejected = await withLock(`aml-txn:${txnId}`, async () => {
    const all = (await db.txn.listByStatus("AML_REVIEW")) as StoredTxn[];
    const txn = all.find((t) => t.id === txnId);
    if (!txn) return { ok: false as const, error: "Transaction not in AML_REVIEW." };

    // No self-review (separation of duties) — also applies to rejecting.
    if (txn.userId === session.userId) {
      audit({ category: "SECURITY", action: "aml.self_review_blocked", actorId: session.userId, targetType: "Transaction", targetId: txnId, payload: { amount: txn.amount, kind: "reject" } });
      return { ok: false as const, error: "You cannot review your own transaction." };
    }

    // ⛔ ONE TRANSACTION (C4-SPEC ruling 137): the refund and the FAILED mark commit together or not at all. This used
    // to credit the wallet with no transaction and write FAILED outside the wallet lock, so a failure between the
    // two left them disagreeing — and a second officer could refund the same withdrawal again.
    await refundAmlRejection(txn, reason);
    if (txn.type === "WITHDRAWAL") refunded = { userId: txn.userId, amountTzs: Math.abs(txn.amount) };

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
      // Fire-and-forget, but swallow rejections — a bounced/failed email must
      // never turn a completed AML rejection into a 500 for the officer.
      void sendEmailToUser(txn.userId, (email) => ({
        to: email,
        subject: `Withdrawal returned · ${formatTzs(Math.abs(txn.amount))}`,
        html: amlRejectRefundHtml({ amount: Math.abs(txn.amount), reason, reference: txn.id, gatewayRef: txn.providerRef ?? null }),
        tag: "aml-refund",
      })).catch(() => {});
    }

    revalidatePath("/admin/aml");
    return { ok: true as const };
  });
  const done = refunded as { userId: string; amountTzs: number } | null;
  if (rejected.ok && done) {
    // F7 · the holder's own money came back: a live, ACTIVE house bot on this account tells every admin (02 §3.6).
    runOutsideLock(() => {
      void import("@/lib/server/house-bot/money-hook").then((m) => m.onHolderMoneyEvent(done.userId, { event: "withdrawal_rejected", amountTzs: done.amountTzs, txnId })).catch(() => {});
    });
  }
  return rejected;
}
