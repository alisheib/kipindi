"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { buildDsarBundle } from "@/lib/server/privacy";
import { revokeUserSessions } from "@/lib/server/session-registry";
import { type AdminDomain } from "@/lib/server/roles";
import { requireStaff } from "@/lib/server/rbac-guard";
import { fieldError } from "@/lib/server/field-error";
import { setUserEmail } from "@/lib/server/email-verification";
import { loadConfig, saveConfig } from "@/lib/server/config-store";
import { TWO_PERSON_THRESHOLD_TZS } from "../../aml/constants";
import { maskEmail } from "@/lib/server/email";
import { selfExclusionStanding } from "@/lib/server/responsible-gambling";
import { removeWalletFreeze } from "@/lib/server/wallet-freeze";

/**
 * Privileged player-management actions. Each one:
 *   1. Authenticates via currentSession() and gates on ADMIN_ROLES
 *      (defence-in-depth — the /admin layout already blocks, but
 *      a leaked action ID must not escalate from a player session).
 *   2. Requires a reason string (≥ 5 chars) to satisfy the audit
 *      requirement printed on the page.
 *   3. Mutates user.status and writes an ADMIN-category audit entry
 *      so the change is traceable end-to-end.
 *
 * For phase 1 we wire suspend + restore. The other placeholder
 * actions (close-account, freeze-wallet, refund) need the
 * two-officer flow and stay disabled until that's wired separately.
 */

// RBAC: the player workstation hosts actions of DIFFERENT sensitivities, so each maps
// to the domain that governs it — support desk vs money vs compliance/PII. requireStaff
// checks the role's canAct for that domain (Owner/ADMIN bypasses), audits a blocked
// attempt, then enforces step-up 2FA. This is what lets a SUPPORT role suspend/reset a
// player without being able to move money (accounting) or rule on KYC / export PII
// (compliance). ⚠ Keep this map in sync with the action names below.
const ACTION_DOMAIN: Record<string, AdminDomain> = {
  exportPlayerDataAction: "compliance",
  suspendPlayerAction: "support",
  restorePlayerAction: "support",
  adminResetPasswordAction: "support",
  setPlayerEmailAction: "support",
  adjustBalanceAction: "accounting",
  forceReverifyKycAction: "compliance",
  approveKycAction: "compliance",
  rejectKycAction: "compliance",
  requestKycInfoAction: "compliance",
  // 2026-09-13 — the officer's wallet freeze and the door back from a final identity refusal.
  // Compliance decisions, never support: a freeze stops a player's money in both directions.
  freezeWalletAction: "compliance",
  unfreezeWalletAction: "compliance",
  liftStaleIdentityHoldAction: "compliance",
};

async function requireAdmin(action: string): Promise<string> {
  return (await requireStaff(ACTION_DOMAIN[action] ?? "compliance", action)).userId;
}

/**
 * GDPR Art. 15 export — returns the player's full data bundle as a JSON
 * string the client turns into a download. Officer-gated + audited.
 */
export async function exportPlayerDataAction(userId: string): Promise<
  { ok: true; payload: string; filename: string } | { ok: false; error: string }
> {
  const officerId = await requireAdmin("exportPlayerDataAction");
  if (!userId) return { ok: false, error: "Missing user id." };
  try {
    const bundle = await buildDsarBundle(userId);
    if (!bundle) return { ok: false, error: "Player not found." };
    audit({
      category: "COMPLIANCE",
      action: "player.data_exported",
      actorId: officerId,
      targetType: "User",
      targetId: userId,
      payload: { article: "GDPR Art 15" },
    });
    return {
      ok: true,
      payload: JSON.stringify(bundle, null, 2),
      filename: `player-${userId}-dsar.json`,
    };
  } catch (err) {
    return { ok: false, error: safeError(err, "Export failed") };
  }
}

export async function suspendPlayerAction(formData: FormData) {
  const officerId = await requireAdmin("suspendPlayerAction");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (!userId) return { ok: false as const, error: "Missing user id." };
  if (reason.length < 5) return fieldError("reason", "Reason is required (≥ 5 chars).");

  const target = await db.user.findById(userId);
  if (!target) return { ok: false as const, error: "Player not found." };
  // RG-safety (audit 2026-07-21): only an ACTIVE account may be suspended. If a
  // SELF_EXCLUDED / COOLED_OFF / PENDING_KYC player could be suspended, the
  // restore path (which returns the account to ACTIVE) would silently LIFT a
  // responsible-gambling self-exclusion, a cool-off, or a KYC gate — a
  // compliance breach. Those states are governed by their own flows and a
  // suspend adds nothing to an already-restricted account; restricting suspend
  // to ACTIVE keeps restore→ACTIVE always correct.
  if (target.status !== "ACTIVE") {
    return {
      ok: false as const,
      error:
        target.status === "SUSPENDED"
          ? "Player is already suspended."
          : `Cannot suspend — the account is ${target.status}. Only an ACTIVE account can be suspended; self-exclusion, cool-off, pending-KYC and closure are handled by their own controls.`,
    };
  }

  try {
    const prevStatus = target.status;
    await db.user.update(userId, { status: "SUSPENDED" });
    await revokeUserSessions(userId); // suspended players are signed out immediately
    audit({
      category: "ADMIN",
      action: "player.suspended",
      actorId: officerId,
      targetType: "User",
      targetId: userId,
      payload: { reason, prevStatus },
    });
    revalidatePath(`/admin/players/${userId}`);
    revalidatePath("/admin/players");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Suspend failed") };
  }
}

export async function restorePlayerAction(formData: FormData) {
  const officerId = await requireAdmin("restorePlayerAction");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (!userId) return { ok: false as const, error: "Missing user id." };
  if (reason.length < 5) return fieldError("reason", "Reason is required (≥ 5 chars).");

  const target = await db.user.findById(userId);
  if (!target) return { ok: false as const, error: "Player not found." };

  // 🔴 E-238 · REOPENING A SELF-EXCLUSION IS AN OFFICER ACTION, AND THIS IS THE ONLY DOOR.
  //
  // Ali ruled on 2026-08-27 that the period a player picks (24h / 1w / 1m / 6m) is the
  // MINIMUM the exclusion lasts, not an expiry: the account never reinstates itself, and the
  // player must ASK. LCCP SR 3.5.5 — a self-exclusion that lifts on a timer is not a
  // self-exclusion. `assertSignInAllowed` refuses them at every sign-in door until an officer
  // acts here, and tells them the date from which they may ask.
  //
  // ⛔ THE MINIMUM IS CHECKED, NOT ASSUMED. An officer cannot shorten a self-exclusion by
  // pressing this early — that would hand the one control a struggling player has to whoever
  // they can talk into it.
  let selfExcluded = false;
  if (target.status === "SELF_EXCLUDED") {
    const standing = await selfExclusionStanding(userId);
    if (standing.state === "serving") {
      return {
        ok: false as const,
        error: standing.permanent
          ? "This is a PERMANENT self-exclusion and cannot be reopened."
          : `Cannot reopen yet — the self-exclusion runs until ${standing.until.slice(0, 10)}.`,
      };
    }
    if (standing.state !== "minimum_served") {
      // SELF_EXCLUDED with no end date at all — a genuine divergence, not a served period.
      return { ok: false as const, error: "Cannot reopen — this exclusion has no recorded end date. Escalate to compliance." };
    }
    selfExcluded = true;
  } else if (target.status !== "SUSPENDED") {
    return { ok: false as const, error: `Cannot restore — current status is ${target.status}.` };
  }

  try {
    // ⭐ ACTIVE, AND SINCE 2026-09-13 THAT IS THE WHOLE ANSWER. This used to restore to
    // PENDING_KYC for anyone not approved, because a PENDING_KYC player promoted to ACTIVE would
    // have walked through an identity gate. There is no such gate on sign-in, deposit or play any
    // more (the only identity gate is on withdrawal, and it reads the KYC row, never this status),
    // so PENDING_KYC means nothing and every account restores to ACTIVE — the status new accounts
    // are now created with (docs/COMPLIANCE-DECISIONS.md 2026-09-13).
    const nextStatus = "ACTIVE" as const;
    await db.user.update(userId, { status: nextStatus });

    // ⭐ AND THE WALLET COMES BACK WITH THE ACCOUNT — but only by lifting the SELF-EXCLUSION hold.
    // 🔴 This used to set the wallet straight to ACTIVE on the strength of "self-exclusion is the
    // only writer of FROZEN". From 2026-09-13 it is not: a FINAL identity refusal and an officer can
    // freeze a wallet too, and reopening a served exclusion must not silently lift either. The
    // wallet is ACTIVE again only if no other hold remains (`wallet-freeze.ts`).
    if (selfExcluded) {
      await removeWalletFreeze(userId, "SELF_EXCLUSION", { actorId: officerId, note: reason, ref: { via: "rg.self_exclusion.reopened" } });
    }

    // ⚠️ `selfExclusionUntil` IS DELIBERATELY LEFT AS IT IS. It is the cross-operator
    // register's record that the exclusion happened; /admin/self-exclusions and
    // reports/catalogue.ts both compare it against `now`, so a past date already reads as
    // ended. Clearing it would erase the history to change the gate.
    audit({
      category: selfExcluded ? "COMPLIANCE" : "ADMIN",
      action: selfExcluded ? "rg.self_exclusion.reopened" : "player.restored",
      actorId: officerId,
      targetType: "User",
      targetId: userId,
      payload: { reason, restoredTo: nextStatus, ...(selfExcluded ? { wasSelfExcluded: true } : {}) },
    });
    revalidatePath(`/admin/players/${userId}`);
    revalidatePath("/admin/players");
    revalidatePath("/admin/self-exclusions");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Restore failed") };
  }
}

// ─── Player password reset (admin support) ───────────────────────────────────

export async function adminResetPasswordAction(formData: FormData) {
  const officerId = await requireAdmin("adminResetPasswordAction");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { ok: false as const, error: "Missing user id." };
  const { adminResetPassword } = await import("@/lib/server/password-reset");
  return adminResetPassword(officerId, userId);
}

// ─── Player email (admin override) ────────────────────────────────────────────

export async function setPlayerEmailAction(formData: FormData) {
  const officerId = await requireAdmin("setPlayerEmailAction");
  const userId = String(formData.get("userId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!userId) return { ok: false as const, error: "Missing user id." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fieldError("email", "Enter a valid email.");

  const target = await db.user.findById(userId);
  if (!target) return { ok: false as const, error: "Player not found." };
  const prev = target.email ?? null;
  // Route through the SINGLE writer rather than touching db.user directly.
  // Writing here bypassed the one-account-per-email check (which is app-level,
  // not a DB index, so the direct write silently succeeded on a duplicate) and
  // never sent a confirmation link — leaving the player unverified, un-emailed,
  // and unable to deposit after a support agent "fixed" their address.
  const r = await setUserEmail(userId, email, { byOfficer: true });
  if (!r.ok) return { ok: false as const, error: r.error };
  audit({
    category: "ADMIN",
    action: "player.email.set_by_officer",
    actorId: officerId,
    targetType: "User",
    targetId: userId,
    payload: { prev, next: email },
  });
  // ⚠️ MASKED, unlike the audit payload immediately above — deliberately different.
  // The audit entry MUST carry both addresses in full: "officer changed this player's email
  // from X to Y" is the material fact, and a masked audit of a contact-detail change would
  // be useless to a regulator reading it back. The audit chain is access-controlled,
  // tamper-evident and ours.
  // This console line is only a convenience duplicate of that entry, and it goes to
  // Railway's log stream, whose retention is not ours to control — so it gets the mask
  // (audit F-06). Nothing is lost: the full values are one lookup away in /admin/audit.
  console.log(`[admin] officer ${officerId.slice(0, 14)}… set email for ${userId.slice(0, 14)}…: ${prev ? maskEmail(prev) : "null"} → ${maskEmail(email)}`);
  revalidatePath(`/admin/players/${userId}`);
  return { ok: true as const };
}

// ─── Manual balance adjustment (audit §9.3 #4) ──────────────────────────────
// Officer credits/debits a player's real balance with a mandatory reason. The
// money move + txn + ledger are atomic (wallet-service.adminAdjustBalance); this
// wrapper only gates (MONEY_ROLES via requireAdmin + TOTP) and validates input.
/**
 * Maker-checker stage-1 store for LARGE balance adjustments (B-4). Same durable
 * config-store pattern as the AML two-person queue (`admin/aml/actions.ts`) —
 * survives restarts, keyed by player. One pending large adjustment per player;
 * the second, DIFFERENT officer must submit the IDENTICAL direction+amount to
 * countersign, else the pending record is replaced with their proposal.
 */
type AdjustStage1 = { actorId: string; at: string; signed: number; reason: string };
const ADJUST_STAGE1_KEY = (userId: string) => `balance-adjust.stage1:${userId}`;
const adjustStage1Mem = new Map<string, AdjustStage1>();
async function getAdjustStage1(userId: string): Promise<AdjustStage1 | null> {
  const mem = adjustStage1Mem.get(userId);
  if (mem) return mem;
  const persisted = await loadConfig<AdjustStage1>(ADJUST_STAGE1_KEY(userId));
  if (persisted) adjustStage1Mem.set(userId, persisted);
  return persisted;
}
async function setAdjustStage1(userId: string, sig: AdjustStage1 | null): Promise<void> {
  if (sig) adjustStage1Mem.set(userId, sig); else adjustStage1Mem.delete(userId);
  await saveConfig(ADJUST_STAGE1_KEY(userId), sig);
}

export async function adjustBalanceAction(formData: FormData) {
  const officerId = await requireAdmin("adjustBalanceAction");
  const userId = String(formData.get("userId") ?? "");
  const direction = String(formData.get("direction") ?? "credit"); // "credit" | "debit"
  const amountRaw = Number(String(formData.get("amount") ?? "0").replace(/[,\s]/g, ""));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!userId) return { ok: false as const, error: "Missing user id." };
  if (!Number.isFinite(amountRaw) || amountRaw <= 0) return fieldError("amount", "Enter a positive whole-shilling amount.");
  if (reason.length < 5) return fieldError("reason", "Reason is required (≥ 5 chars).");
  const signed = direction === "debit" ? -Math.round(amountRaw) : Math.round(amountRaw);
  try {
    // Two-person rule (B-4): at/above the platform's two-person threshold the
    // ceremony must not be WEAKER than an AML release of the same size. First
    // officer records a pending adjustment; a second, DIFFERENT officer submits
    // the identical adjustment to execute it. Below the threshold: unchanged.
    if (Math.abs(signed) >= TWO_PERSON_THRESHOLD_TZS) {
      const first = await getAdjustStage1(userId);
      if (!first) {
        await setAdjustStage1(userId, { actorId: officerId, at: new Date().toISOString(), signed, reason });
        audit({ category: "COMPLIANCE", action: "balance_adjust.stage1", actorId: officerId, targetType: "User", targetId: userId, payload: { signed, reason } });
        revalidatePath(`/admin/players/${userId}`);
        return { ok: true as const, stage: "stage1" as const, message: "First approval recorded. A second, different officer must submit the same adjustment to apply it." };
      }
      if (first.actorId === officerId) {
        return { ok: false as const, error: "A different officer must give the second approval (two-person rule). Your proposal is already recorded." };
      }
      if (first.signed !== signed) {
        // A different figure is a NEW proposal, not a countersign — replace stage-1.
        await setAdjustStage1(userId, { actorId: officerId, at: new Date().toISOString(), signed, reason });
        audit({ category: "COMPLIANCE", action: "balance_adjust.stage1_replaced", actorId: officerId, targetType: "User", targetId: userId, payload: { signed, reason, previous: first } });
        revalidatePath(`/admin/players/${userId}`);
        return { ok: true as const, stage: "stage1" as const, message: "Amount differs from the pending proposal — recorded as a NEW first approval. A second, different officer must submit the same adjustment." };
      }
      // Countersigned: execute, then clear the pending record. Audit both ids.
      const { adminAdjustBalance } = await import("@/lib/server/wallet-service");
      const r = await adminAdjustBalance(userId, officerId, signed, reason);
      if (!r.ok) return { ok: false as const, error: r.error };
      await setAdjustStage1(userId, null);
      audit({ category: "COMPLIANCE", action: "balance_adjust.countersigned", actorId: officerId, targetType: "User", targetId: userId, payload: { signed, reason, firstOfficerId: first.actorId, secondOfficerId: officerId } });
      revalidatePath(`/admin/players/${userId}`);
      return { ok: true as const, balance: r.balance };
    }
    const { adminAdjustBalance } = await import("@/lib/server/wallet-service");
    const r = await adminAdjustBalance(userId, officerId, signed, reason);
    if (!r.ok) return { ok: false as const, error: r.error };
    revalidatePath(`/admin/players/${userId}`);
    return { ok: true as const, balance: r.balance };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Adjustment failed") };
  }
}

// ─── Force re-verify KYC (audit §9.3 #4) ────────────────────────────────────
// Moves an APPROVED player to ADDITIONAL_INFO_REQUIRED → reopens the resubmit flow.
// Audited in kyc-service.
// 🔴 IT DOES NOT RE-LOCK WITHDRAWALS — that is what this comment claimed until
// 2026-08-20, and it was the whole reason an officer reached for this control. The
// withdrawal gate asks whether the account was EVER approved (`kyc-gate.ts`, 2026-09-13),
// and re-verifying never clears that. To stop money leaving, the stops are: freeze the
// wallet, or pause payouts. ⛔ Do NOT rely on an AML hold — the TZS 1,000,000 two-officer
// hold this comment used to name was switched off by the owner ruling of 2026-09-13
// (`WITHDRAWAL_AML_HOLD` in payments.ts); a large withdrawal is sent without review.
// See docs/BOARD-DISCLOSURE-B-E.md §6.1.
export async function forceReverifyKycAction(formData: FormData) {
  const officerId = await requireAdmin("forceReverifyKycAction");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!userId) return { ok: false as const, error: "Missing user id." };
  if (reason.length < 5) return fieldError("reason", "Reason is required (≥ 5 chars).");
  try {
    const { forceReverifyKyc } = await import("@/lib/server/kyc-service");
    const r = await forceReverifyKyc(officerId, userId, reason);
    if (!r.ok) return { ok: false as const, error: r.error };
    // ⭐ "ALSO FREEZE THE WALLET" (2026-09-13). Re-verification stops no money any more, so the
    // dialog offers the lever that does, with the same written reason. It needs the SAME compliance
    // grant this action already demanded above, so nothing is widened by offering it here.
    // ⚠️ If the freeze fails the re-verification has still happened — the officer is told plainly
    // rather than shown a success that only half-happened.
    if (String(formData.get("alsoFreeze") ?? "") === "1") {
      const { freezeWalletByOfficer } = await import("@/lib/server/wallet-freeze");
      const f = await freezeWalletByOfficer(officerId, userId, reason);
      revalidatePath(`/admin/players/${userId}`);
      if (!f.ok) return { ok: false as const, error: `Re-verification was required, but the wallet was NOT frozen: ${f.error}` };
    }
    revalidatePath(`/admin/players/${userId}`);
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Force re-verify failed") };
  }
}

// ─── KYC review (officer decision on a pending submission) ──────────────────

export async function approveKycAction(formData: FormData) {
  const officerId = await requireAdmin("approveKycAction");
  const userId = String(formData.get("userId") ?? "");
  try {
    // Maker-checker parity (audit 2026-07-21): a HIGH-RISK approval must go
    // through the KYC workstation's recommend→seal two-officer flow
    // (kyc/[id]/kyc-actions.ts). This one-click player-page approve has no
    // second-officer step, so it must NOT become a way to single-officer-approve
    // a high-risk applicant the workstation would force two officers on. Low/
    // medium-risk approvals continue to flow through here unchanged.
    const { kycRiskScore, KYC_MAKER_CHECKER_THRESHOLD } = await import("@/lib/server/kyc-risk");
    const risk = await kycRiskScore(userId);
    if (risk.score >= KYC_MAKER_CHECKER_THRESHOLD) {
      audit({
        category: "COMPLIANCE",
        action: "kyc.approve.maker_checker_required",
        actorId: officerId,
        targetType: "User",
        targetId: userId,
        payload: { riskScore: risk.score, from: "player-detail", route: "use-workstation" },
      });
      return {
        ok: false as const,
        error: `High-risk submission (score ${risk.score}) — approve it from the KYC workstation, where a second officer must recommend and seal it. Open it from Approvals → the pending KYC review.`,
      };
    }
    const { reviewKyc } = await import("@/lib/server/kyc-service");
    const r = await reviewKyc({ officerId, userId, decision: "APPROVE" });
    if (r.ok) {
      revalidatePath(`/admin/players/${userId}`);
      revalidatePath("/admin/approvals");
    }
    return r.ok ? { ok: true as const } : { ok: false as const, error: r.error };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Approve KYC failed") };
  }
}

export async function rejectKycAction(formData: FormData) {
  const officerId = await requireAdmin("rejectKycAction");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  try {
    const { reviewKyc } = await import("@/lib/server/kyc-service");
    const r = await reviewKyc({ officerId, userId, decision: "REJECT", reason });
    if (r.ok) {
      revalidatePath(`/admin/players/${userId}`);
      revalidatePath("/admin/approvals");
    }
    return r.ok ? { ok: true as const } : { ok: false as const, error: r.error };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Reject KYC failed") };
  }
}

/** Ask the player for more / clearer documents or extra info. Keeps the
 *  submission open (ADDITIONAL_INFO_REQUIRED) so they can update + resubmit. */
export async function requestKycInfoAction(formData: FormData) {
  const officerId = await requireAdmin("requestKycInfoAction");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  // Optional extra-document requests: a JSON array of non-empty descriptions.
  let requestedDocs: string[] = [];
  try {
    const raw = JSON.parse(String(formData.get("requestedDocs") ?? "[]"));
    if (Array.isArray(raw)) requestedDocs = raw.map((d) => String(d).trim()).filter((d) => d.length > 0).slice(0, 10);
  } catch { /* ignore malformed — treated as none */ }
  const { reviewKyc } = await import("@/lib/server/kyc-service");
  const r = await reviewKyc({ officerId, userId, decision: "REQUEST_INFO", reason, requestedDocs });
  if (r.ok) {
    revalidatePath(`/admin/players/${userId}`);
    revalidatePath("/admin/approvals");
  }
  return r.ok ? { ok: true as const } : { ok: false as const, error: r.error };
}

// ─── Wallet freeze (officer) — 2026-09-13 ─────────────────────────────────────
//
// ⭐ THE LEVER RULING 6 HANDS THE OFFICER. From 2026-09-13 re-verification blocks no money at all,
// so an officer with a doubt about an account needs a control that does: the freeze stops deposits,
// bets and withdrawals alike. It had no officer control before this — self-exclusion was the only
// writer of FROZEN. `wallet-freeze.ts` records the hold BY REASON, so this never lifts a
// self-exclusion or a final identity refusal, and they never lift this.
// ⛔ COMPLIANCE domain, step-up 2FA, mandatory written reason, awaited COMPLIANCE audit.

export async function freezeWalletAction(formData: FormData) {
  const officerId = await requireAdmin("freezeWalletAction");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!userId) return { ok: false as const, error: "Missing user id." };
  if (reason.length < 5) return fieldError("reason", "Reason is required (≥ 5 chars).");
  try {
    const { freezeWalletByOfficer } = await import("@/lib/server/wallet-freeze");
    const r = await freezeWalletByOfficer(officerId, userId, reason);
    if (!r.ok) return { ok: false as const, error: r.error };
    revalidatePath(`/admin/players/${userId}`);
    return { ok: true as const, changed: r.changed };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Freeze failed") };
  }
}

export async function unfreezeWalletAction(formData: FormData) {
  const officerId = await requireAdmin("unfreezeWalletAction");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!userId) return { ok: false as const, error: "Missing user id." };
  if (reason.length < 5) return fieldError("reason", "Reason is required (≥ 5 chars).");
  try {
    const { unfreezeWalletByOfficer } = await import("@/lib/server/wallet-freeze");
    const r = await unfreezeWalletByOfficer(officerId, userId, reason);
    if (!r.ok) return { ok: false as const, error: r.error };
    revalidatePath(`/admin/players/${userId}`);
    return { ok: true as const, status: r.status };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Unfreeze failed") };
  }
}

/**
 * Lift a STALE identity hold — an IDENTITY_REFUSED hold with no final refusal behind it (audit session 95,
 * 2026-09-13). Until this action the service could lift one only when no officer hold stood beside it, and no
 * screen offered it at all, so a failed re-open left the player's wallet frozen for good. Compliance domain, like
 * the freeze itself; the service re-checks staleness under the identity lock.
 */
export async function liftStaleIdentityHoldAction(formData: FormData) {
  const officerId = await requireAdmin("liftStaleIdentityHoldAction");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!userId) return { ok: false as const, error: "Missing user id." };
  if (reason.length < 5) return fieldError("reason", "Reason is required (≥ 5 chars).");
  try {
    const { liftStaleIdentityHold } = await import("@/lib/server/wallet-freeze");
    const r = await liftStaleIdentityHold(officerId, userId, reason);
    if (!r.ok) return { ok: false as const, error: r.error };
    revalidatePath(`/admin/players/${userId}`);
    return { ok: true as const, status: r.status };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Lifting the identity hold failed") };
  }
}

/* ⛔ NO "re-open a final refusal" action here (removed 2026-09-13): the one door back after a FINAL
   identity refusal is `reopenFinalRefusalWorkstationAction` on /admin/kyc/[id], where the officer sees the
   case. A second copy on this page had no caller (`test:orphan-actions`), and an uncalled server action is
   still a reachable endpoint. */
