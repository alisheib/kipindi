"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db, type StoredTxn } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { withLock } from "@/lib/server/locks";
import { notifyWithdrawalSent } from "@/lib/server/wallet-service";
import { getEffectiveConfig } from "@/lib/server/market-config";
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
/**
 * The payment gateway's slice of the 1% withdrawal fee, at the rates in force.
 * Clamped to the fee actually charged on the txn so the ledger group can never be
 * unbalanced by a config change between initiation and AML release.
 */
async function gatewayShareFor(gross: number, fee: number): Promise<number> {
  const cfg = await getEffectiveConfig().catch(() => null);
  if (!cfg) return 0;
  return Math.min(fee, Math.max(0, Math.round(gross * Math.max(0, cfg.withdrawalGatewayShareRate))));
}

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

    // ⛔ APPROVING A WITHDRAWAL HERE DOES NOT SEND ANY MONEY.
    //
    // Everything below releases the hold, marks the transaction CONFIRMED, posts a
    // WITHDRAWAL ledger group crediting EXTERNAL, and emails the player "your
    // withdrawal is on its way" — with ZERO calls to the payment gateway. The
    // player's balance is gone, the books say it left the platform, and nothing was
    // ever dispatched. That is destroyed money, and it is worst on the LARGEST
    // payouts: dispatchWithdrawal returns AML_REVIEW with a FABRICATED providerRef
    // (payments.ts, the >= AML_REVIEW_THRESHOLD_TZS branch) BEFORE the adapter and
    // therefore before the missing-float-PIN guard, so the control believed to
    // protect big withdrawals is the one that bypasses every other protection.
    //
    // Until an approved withdrawal is actually dispatched to the gateway — set
    // PROCESSING with a REAL providerRef, hold retained, and settled by
    // settleWithdrawalConfirmed (which already does the hold-release + ledger +
    // notification atomically) — this action must not be able to complete.
    //
    // Deposits are unaffected: they never reach this branch.
    if (txn.type === "WITHDRAWAL") {
      audit({
        category: "COMPLIANCE",
        action: "aml.approve.blocked_no_payout_rail",
        actorId: session.userId,
        targetType: "Transaction",
        targetId: txnId,
        payload: { amount: txn.amount, note: "Approval refused: releasing the hold here would mark the payout complete without dispatching it." },
      });
      return {
        ok: false as const,
        error:
          "Withdrawal approval is disabled. Approving here would release the hold and mark the payout sent WITHOUT contacting the payment provider — the player would lose the money. Re-enable only once approved withdrawals are dispatched to the gateway and settled by the webhook/reconcile path.",
      };
    }

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
      // The withdrawal ledger post and the "on its way" notification that used to
      // live here are gone: TypeScript now proves this line is unreachable for a
      // WITHDRAWAL (the guard above narrows the type), which is exactly the point.
      // When approved withdrawals are dispatched for real, settleWithdrawalConfirmed
      // owns the hold-release, the ledger and the notification — atomically, and only
      // after the gateway has accepted the payout. Do not re-add them here.
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
    // Withdrawal ledger post removed — unreachable here by construction (see the
    // guard above), and it credited EXTERNAL for money that had never been sent.
    audit({
      category: "ADMIN",
      action: "aml.approved",
      actorId: session.userId,
      targetType: "Transaction",
      targetId: txnId,
      payload: { amount: txn.amount, reason: reason || null, twoPersonApproval: "below-threshold" },
    });
    // notifyWithdrawalSent removed — it told the player their money was on its way
    // when nothing had been dispatched. Unreachable here by construction.
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
