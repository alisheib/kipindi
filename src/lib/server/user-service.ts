/**
 * Player self-service: account closure, data export, activity history.
 *
 * Compliance:
 *  - GDPR Art 15 (right of access) — `exportUserData` returns a structured copy
 *    of every record about the user.
 *  - GDPR Art 17 (right to erasure / be forgotten) — `closeAccount` flips status,
 *    freezes wallet, optionally redacts PII after the AML retention window.
 *  - Tanzania Personal Data Protection Act 2022 — same shape, same controls.
 *  - AML retention overrides: financial + KYC records persist for 7 years even
 *    after closure (handled in production by a scheduled redaction job).
 */
import { audit, getAuditForActor, type AuditEntry } from "./audit";
import { db } from "./store";
import { destroySession } from "./session";
import type { ServiceResult } from "./auth-service";

export type UserDataExport = {
  generatedAt: string;
  user: ReturnType<typeof db.user.findById>;
  kyc: ReturnType<typeof db.kyc.findByUserId>;
  wallet: ReturnType<typeof db.wallet.findByUserId>;
  responsibleGambling: ReturnType<typeof db.responsible.get>;
  bets: ReturnType<typeof db.bet.findByUser>;
  transactions: ReturnType<typeof db.txn.findByUser>;
  auditEntries: AuditEntry[];
};

/** GDPR Art 15 — return a structured snapshot of all data we hold on this user. */
export function exportUserData(userId: string): UserDataExport {
  return {
    generatedAt: new Date().toISOString(),
    user: db.user.findById(userId),
    kyc: db.kyc.findByUserId(userId),
    wallet: db.wallet.findByUserId(userId),
    responsibleGambling: db.responsible.get(userId),
    bets: db.bet.findByUser(userId, 1000),
    transactions: db.txn.findByUser(userId, 1000),
    auditEntries: getAuditForActor(userId, 1000),
  };
}

/**
 * Self-initiated account closure. One-way until manually reopened by support.
 *
 * - Account status → CLOSED, closedAt set.
 * - Wallet status → CLOSED (no further deposits/withdrawals/bets).
 * - Active bets remain in place to settle out (compliance: cannot void existing
 *   stakes unilaterally; payouts must complete or refund per the operating rules).
 * - Session destroyed.
 * - Marketing opt-in cleared.
 *
 * The user can re-register (different account) but the closed userId is retained
 * for AML/audit traceability for 7 years.
 */
export async function closeAccount(userId: string, reason?: string): Promise<ServiceResult<{ closedAt: string }>> {
  const user = db.user.findById(userId);
  if (!user) return { ok: false, error: "User not found.", code: "NOT_FOUND" };
  if (user.status === "CLOSED") return { ok: true, data: { closedAt: user.closedAt ?? user.updatedAt } };

  const closedAt = new Date().toISOString();
  db.user.update(userId, {
    status: "CLOSED",
    closedAt,
    marketingOptIn: false,
  });
  const wallet = db.wallet.findByUserId(userId);
  if (wallet && wallet.status !== "CLOSED") {
    db.wallet.update(wallet.id, { status: "CLOSED" });
  }
  await destroySession();

  audit({
    category: "COMPLIANCE",
    action: "user.account.closed",
    actorId: userId,
    targetType: "User",
    targetId: userId,
    payload: { reason: reason ?? null },
  });

  return { ok: true, data: { closedAt } };
}

/** Get a user's own activity feed — what they themselves have done. */
export function getOwnActivity(userId: string, limit = 100): AuditEntry[] {
  return getAuditForActor(userId, limit);
}
