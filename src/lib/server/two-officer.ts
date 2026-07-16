/**
 * A8 — the shared two-officer (maker-checker) gate.
 *
 * Several compliance surfaces enforce the same rule: the officer who performs
 * the SECOND step (approve / seal / countersign) must be a DIFFERENT person from
 * the one who performed the FIRST step (prepare / recommend / stage). The rule
 * was hand-written per surface — `pack-actions.approveReportPack` audited a
 * `pack.approve.conflict_blocked` COMPLIANCE event and returned a "second officer
 * required" error, while `kyc-actions.approveKycWorkstationAction` returned the
 * same class of error but wrote NO audit entry. This helper makes the check one
 * definition so the behaviour (and the audit trail) can't drift again.
 *
 * The resolver's own B≠A gate lives inside `market-service.ts` (the money layer)
 * and is intentionally NOT routed through here — that file is money-tested and
 * owned separately; unifying it is a follow-up for that layer's owner.
 *
 * Returns `{ error }` when the gate BLOCKS (maker === checker) — and writes the
 * conflict to the audit chain as it does so — or `null` when the gate passes.
 */
import { audit } from "./audit";
import { CEREMONY } from "@/lib/admin-status-lexicon";

export type TwoOfficerGateParams = {
  /** The officer who performed the first step (preparedBy / recommender / stage-1). */
  makerId: string | null | undefined;
  /** The officer attempting the second step (the authenticated actor). */
  checkerId: string;
  /**
   * The human tail appended after "Second officer required — " in the returned
   * error, e.g. "you prepared this pack and cannot approve your own work."
   */
  reason: string;
  /** Audit shape for the conflict-blocked event written when the gate blocks. */
  audit: {
    /** Verb-noun action, e.g. "pack.approve.conflict_blocked". */
    action: string;
    /** e.g. "ReportPack" | "User". */
    targetType: string;
    targetId: string;
    /** Extra payload merged onto `{ reason: "self-approval" }`. */
    payload?: Record<string, unknown>;
  };
};

/**
 * Enforce the maker-checker rule. When `makerId` is set and equals `checkerId`
 * the attempt is a self-approval: a COMPLIANCE `conflict_blocked` audit entry is
 * written and a uniform error is returned. When they differ (or no maker is
 * recorded), the gate passes and returns `null`.
 */
export function twoOfficerGate(p: TwoOfficerGateParams): { error: string } | null {
  if (p.makerId && p.makerId === p.checkerId) {
    audit({
      category: "COMPLIANCE",
      action: p.audit.action,
      actorId: p.checkerId,
      targetType: p.audit.targetType,
      targetId: p.audit.targetId,
      payload: { reason: "self-approval", ...p.audit.payload },
    });
    return { error: `${CEREMONY.secondOfficerRequired.en} — ${p.reason}` };
  }
  return null;
}
