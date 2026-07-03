"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db, type StoredTxn } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { withLock } from "@/lib/server/locks";
import { notifyWithdrawalSent } from "@/lib/server/wallet-service";
import { loadConfig, saveConfig } from "@/lib/server/config-store";

import { TWO_PERSON_THRESHOLD_TZS } from "./constants";
import { formatTzs } from "@/lib/utils";
import { MONEY_ROLES } from "@/lib/server/roles";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import { postLedgerEntries, withdrawalEntries } from "@/lib/server/ledger";

const ADMIN_ROLES = MONEY_ROLES; // role tier — see @/lib/server/roles

async function requireAdmin() {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const u = await db.user.findById(session.userId);
  if (!(u && ADMIN_ROLES.has(u.role))) redirect("/auth/admin");
  await requireAdminTotp(session.userId, session.sessionId); // B3: 2FA at the action layer
  return { session, role: u?.role ?? "ADMIN" };
}

/**
 * First-officer co-signature store. Durable (config-store → DB in prod) so the
 * two-person link survives restarts, AND mirrored in-process so it's reliable
 * regardless of how many ADMIN audit events occur between the two clicks. This
 * replaces the old getAuditPage({limit:200}) scan, which silently lost the
 * signature on a busy day (audit finding) — downgrading two-officer to one.
 */
type Stage1Sig = { actorId: string; at: string };
const STAGE1_KEY = (txnId: string) => `aml.stage1:${txnId}`;
const stage1Mem = new Map<string, Stage1Sig>();
async function getFirstSignature(txnId: string): Promise<Stage1Sig | null> {
  const mem = stage1Mem.get(txnId);
  if (mem) return mem;
  const persisted = await loadConfig<Stage1Sig>(STAGE1_KEY(txnId));
  if (persisted) stage1Mem.set(txnId, persisted);
  return persisted;
}
async function setFirstSignature(txnId: string, sig: Stage1Sig): Promise<void> {
  stage1Mem.set(txnId, sig);
  await saveConfig(STAGE1_KEY(txnId), sig);
}

/**
 * Approve a transaction held in AML_REVIEW.
 *
 * Two-person rule (POCA Cap 423 §16 + FATF R.10): for amounts ≥ the AML-hold
 * threshold (TWO_PERSON_THRESHOLD_TZS, = the payments AML trigger), two
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
  // Releasing money is the highest-risk action — a recorded justification is
  // mandatory (FATF R.10 / EDD), matching the reject path. (Was optional.)
  if (reason.length < 5) return { ok: false as const, error: "Reason is required (≥ 5 chars) to release funds." };

  // Lock the transaction to prevent TOCTOU — two officers clicking
  // approve simultaneously could both read AML_REVIEW status and both
  // flip to CONFIRMED, bypassing the two-person rule.
  return withLock(`aml-txn:${txnId}`, async () => {
    const all = (await db.txn.listByStatus("AML_REVIEW")) as StoredTxn[];
    const txn = all.find((t) => t.id === txnId);
    if (!txn) return { ok: false as const, error: "Transaction not in AML_REVIEW." };

    // No self-review: an officer who happens to own this transaction must never
    // approve their own money movement (separation of duties). KYC/SoF already
    // block this; the AML queue did not.
    if (txn.userId === session.userId) {
      audit({ category: "SECURITY", action: "aml.self_review_blocked", actorId: session.userId, targetType: "Transaction", targetId: txnId, payload: { amount: txn.amount, kind: "approve" } });
      return { ok: false as const, error: "You cannot approve your own transaction." };
    }

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
      const first = await getFirstSignature(txnId);
      if (!first) {
        await setFirstSignature(txnId, { actorId: session.userId, at: new Date().toISOString() });
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
      // Tell the player their (now AML-cleared) withdrawal is on its way — same
      // receipt as an ordinary withdrawal. Previously this path was silent.
      if (txn.type === "WITHDRAWAL") {
        const gross = Math.abs(txn.amount);
        postLedgerEntries(`wdr_${txn.id}`, withdrawalEntries({ txnId: txn.id, userId: txn.userId, grossAmount: gross, taxWithheld: txn.taxWithheld, provider: txn.provider ?? "INTERNAL" })).catch(() => {});
        notifyWithdrawalSent(txn);
      }
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
    // Dual-write: withdrawal confirmed via AML → double-entry ledger.
    if (txn.type === "WITHDRAWAL") {
      const gross = Math.abs(txn.amount);
      postLedgerEntries(`wdr_${txn.id}`, withdrawalEntries({ txnId: txn.id, userId: txn.userId, grossAmount: gross, taxWithheld: txn.taxWithheld, provider: txn.provider ?? "INTERNAL" })).catch(() => {});
    }
    audit({
      category: "ADMIN",
      action: "aml.approved",
      actorId: session.userId,
      targetType: "Transaction",
      targetId: txnId,
      payload: { amount: txn.amount, reason: reason || null, twoPersonApproval: "below-threshold" },
    });
    if (txn.type === "WITHDRAWAL") notifyWithdrawalSent(txn);
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

    // No self-review (separation of duties) — also applies to rejecting.
    if (txn.userId === session.userId) {
      audit({ category: "SECURITY", action: "aml.self_review_blocked", actorId: session.userId, targetType: "Transaction", targetId: txnId, payload: { amount: txn.amount, kind: "reject" } });
      return { ok: false as const, error: "You cannot review your own transaction." };
    }

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
      // Fire-and-forget, but swallow rejections — a bounced/failed email must
      // never turn a completed AML rejection into a 500 for the officer.
      void sendEmailToUser(txn.userId, (email) => ({
        to: email,
        subject: `Withdrawal returned · ${formatTzs(Math.abs(txn.amount))}`,
        html: amlRejectRefundHtml({ amount: Math.abs(txn.amount), reason }),
        tag: "aml-refund",
      })).catch(() => {});
    }

    revalidatePath("/admin/aml");
    return { ok: true as const };
  });
}
