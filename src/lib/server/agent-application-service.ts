/**
 * AGENT APPLICATION SERVICE — two doors, one state machine, one approver.
 *
 * A vetted business partner who introduces players and earns commission on the revenue those
 * players generate. ⛔ RECRUITER ONLY: an agent never holds float and never touches player
 * money. Authority: docs/AGENT-PROGRAMME.md. Rate rule: docs/RULES.md §2.10.
 *
 * ── THE LIFECYCLE ──────────────────────────────────────────────────────────────────────
 *   SELF-SERVICE   /agent → startApplication → attach ×7 → referees → fee → submit ─┐
 *                                                                                    ├→ UNDER_REVIEW → APPROVED
 *   OFFICER-LED    issueInvitation → INVITED → acceptInvitation → (same path) ──────┘       ↘ REJECTED (fee refunded)
 *                                                                                            ↘ ADDITIONAL_INFO_REQUIRED → resubmit
 *
 * ── THE RULES THIS FILE IS THE HOME OF ─────────────────────────────────────────────────
 *  ⭐ `approveAgent` IS THE ONLY WRITER OF `UserRole.AGENT`, and it UPDATEs an `AffiliateAgent`
 *    row that already exists with a player-format code. Nothing else — not the staff-roles
 *    screen, not a script — assigns the role.
 *  ⭐ ONE officer decides. ⛔ No two-officer lock (Ali, dated; `test:two-admin` asserts its
 *    absence). Self-review is blocked; on an INVITED application the invitee's ACCEPTANCE is
 *    the second party, so it can never be approved before acceptance.
 *  ⛔ Staff are refused at the door, at submit and at approval — approving would strip their
 *    admin access. A paid staff application exits through the ordinary reject+refund path
 *    (`STAFF_CONFLICT`), never a hard INVALID with the fee stranded.
 *  ⭐ THE FEE IS PAID FROM THE APPLICANT'S WALLET (Ali, 2026-09-10). They deposit on the
 *    ordinary rails, then pay from that balance. It therefore DOES enter the player ledger:
 *    a `Transaction` plus a `LedgerEntry` group whose money-in leg is the PLAYER account, so
 *    the house book, the trial balance and the tax pack all see it. VAT is split per the
 *    config's treatment (EXCLUSIVE at 0, so no `HOUSE:TAX` leg today).
 *    ⚠️ This REVERSES the pre-2026-09-10 rule that the fee never enters the player ledger and
 *    was attested by an officer reading a receipt. The programme is now INSIDE the money
 *    invariants: the debit must be all-or-nothing, locked and idempotent, and it can race a
 *    bet for the same balance. `COMPLIANCE-DECISIONS.md` § 2026-09-10.
 *  ⛔ NO NUMBER IS A LITERAL. Every amount, window and day count is read from `agent-config`.
 *
 * ── GATE THE OFFER, NEVER THE REFUSAL ───────────────────────────────────────────────────
 * Every refusal that would strand the registration fee — staff, self-excluded, terminal rejection,
 * cool-down, KYC — bites at `startApplication` and on the /agent page's CTA, BEFORE the
 * applicant is asked to pay the fee from their wallet. A refusal that first appears at review
 * routes through the refund path as a rejection, never a silent block.
 */
import { createHash } from "node:crypto";
import { db, type StoredAgentApplication, type StoredAgentApplicationDocument, type StoredAgentInvitation, type AgentDocType, type AgentRejectReason, type StoredUser } from "./store";
import type { ServiceResult } from "./auth-service";
import { audit } from "./audit";
import { randomId, generateOtp, hashOtp, verifyOtp } from "./crypto";
import { withLock } from "./locks";
import { getAgentConfig, type AgentConfig, type FeeVatTreatment } from "./agent-config";
import { ensureAffiliateAccount, isApprovedAgent, agentStandingFor, AGENT_CODE_PREFIX } from "./affiliate-service";
import { getKycStatus, reviewKyc, validateDocImage } from "./kyc-service";
// ⭐ The all-or-nothing fee debit (Ali, 2026-09-10). ⛔ NOT `debitInternal`, which debits
// partially by design. ⚠️ `wallet-service` does not import this module, so no cycle.
import { payAgentRegistrationFee, refundAgentRegistrationFeeToWallet } from "./wallet-service";
import { putKycDocument, deleteKycDocument } from "./storage";
import { isStaffRole } from "./roles";
import { isLockedOut, selfExclusionStanding } from "./responsible-gambling";
import { revokeUserSessions } from "./session-registry";
import { postLedgerEntries, agentRegistrationFeeEntries, ledgerGroupAccountSum, acct } from "./ledger";
import { appUrl } from "@/lib/app-url";
import { formatTzs } from "@/lib/utils";
import { AGENT_STATUS } from "@/lib/admin-status-lexicon";

import {
  notifyAgentApplicationSubmitted, notifyAgentApproved, notifyAgentRejected, notifyAgentInfoRequested,
  notifyAgentFeeRefunded, notifyAgentDeactivated, notifyAdminAgentReview,
  notifyAgentRevoked, notifyAgentRateChanged,
} from "./notification-service";
import {
  sendEmailToUser, agentApprovedHtml, agentRejectedHtml, agentInfoRequestedHtml, agentFeeRefundedHtml,
  agentApplicationSubmittedAdminHtml, agentInvitationHtml, agentDeactivatedHtml,
  agentRevokedHtml, agentRateChangedHtml, agentInviteOtpHtml,
  stubIsRetrievable,
  type SendResult,
} from "./email";
import { kycNotifyEmails } from "./kyc-service";
import { sendEmail } from "./email";

// ═══════════════════════════════════════════════════════════════════════════
//  THE DOCUMENTS — framework §2, verbatim
// ═══════════════════════════════════════════════════════════════════════════

/** The seven the framework requires. ⭐ Its fifth item — government ID — is the platform's
 *  existing KYC, so it is not a slot here. */
export const REQUIRED_DOC_SLOTS: readonly AgentDocType[] = [
  "CV", "REQUEST_LETTER", "SERIKALI_LETTER",
  "REFEREE_ONE_LETTER", "REFEREE_ONE_ID", "REFEREE_TWO_LETTER", "REFEREE_TWO_ID",
];
/** Every slot the form accepts: the seven, plus the fee receipt. */
export const ALL_DOC_SLOTS: readonly AgentDocType[] = [...REQUIRED_DOC_SLOTS, "FEE_RECEIPT"];
/** ⛔ THIRD-PARTY PII. Referee ID scans belong to people who never used 50pick. */
export const THIRD_PARTY_SLOTS: readonly AgentDocType[] = ["REFEREE_ONE_ID", "REFEREE_TWO_ID"];
/** ⛔ Never re-appliable. */
export const TERMINAL_REJECT_REASONS: readonly AgentRejectReason[] = ["SANCTIONED", "IDENTITY_MISMATCH", "FRAUD"];

/** States an applicant may still edit in. */
const EDITABLE: readonly StoredAgentApplication["status"][] = ["DRAFT", "KYC_SUBMITTED", "PAYMENT_PENDING", "ADDITIONAL_INFO_REQUIRED"];
/** States an officer may decide from. */
const DECIDABLE: readonly StoredAgentApplication["status"][] = ["UNDER_REVIEW", "ADDITIONAL_INFO_REQUIRED"];

/**
 * Retention — ⛔ measured from the DECISION, never from `User.closedAt` (a referee has no
 * account). Published in docs/DATA-RETENTION.md §1; `test:retention` asserts they agree.
 */
/** Referee ID scans: 90 days after the decision. A referee is not a customer, so the 7-year CDD
 *  hold does not apply — and we have no relationship under which to keep them longer. */
export const AGENT_REFEREE_DOC_HOLD_DAYS = 90;
/** A REJECTED applicant's own file (CV, letters, receipt): 90 days after the decision. */
export const AGENT_REJECTED_DOC_HOLD_DAYS = 90;
/** An APPROVED agent's file is CDD evidence for a business partner — the 7-year hold. */
export const AGENT_APPROVED_DOC_HOLD_YEARS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const iso = () => new Date().toISOString();

// ═══════════════════════════════════════════════════════════════════════════
//  THE FEE — one place computes it, from config
// ═══════════════════════════════════════════════════════════════════════════

/**
 * What the applicant pays in total, and the VAT component of it, from the config's treatment.
 *
 * ⭐ ON THE SHIPPED CONFIG (2026-09-08) THE TREATMENT IS `EXCLUSIVE`: `registrationFeeTzs` is
 * the NET 100,000, VAT is 18,000, and the applicant pays 118,000 — management's
 * "TZS 100,000 + VAT = 118,000". `INCLUSIVE` remains supported for an operator who publishes
 * a gross price, and backs the VAT out of it instead.
 *
 * ⛔ EVERY SURFACE READS `totalTzs` FOR THE PRICE AND `cfg.feeVatTreatment` FOR THE WORDING.
 * Three surfaces used to state "VAT inclusive" in prose regardless of the setting, which
 * turned a config flip into a lie on the public page and in the binding terms. A guard
 * (`test:agent-fee-copy`) now holds that shut.
 */
export function feeBreakdown(cfg: AgentConfig = getAgentConfig()): { totalTzs: number; vatTzs: number; netTzs: number } {
  return feeBreakdownFor(cfg.registrationFeeTzs, cfg.feeVatTreatment, cfg.feeVatRatePct);
}

/**
 * The same split for an ARBITRARY fee figure — the one the refund path needs.
 *
 * ⭐ WHY IT IS SEPARATE. A refund must return exactly what was COLLECTED, and what was
 * collected is stamped on the application (`feeAmountTzs`), not read from today's config: an
 * operator who changes the fee between collection and refund must still hand back the
 * original amount, with the original VAT component, or the tax pack and the bank statement
 * disagree.
 *
 * 🔴 AND THIS FIXES A REAL BUG. The refund used to back the VAT out with the INCLUSIVE
 * formula (`amount × rate / (1 + rate)`) whenever the stamped amount differed from today's
 * expected total — even when the treatment was `EXCLUSIVE`, where the VAT component of a
 * gross 118,000 is 18,000 and the inclusive formula returns 18,000 only by coincidence of
 * the rate. At any other rate it under- or over-reverses `HOUSE:TAX` and leaves a permanent
 * residue in the one account the statutory pack is read from.
 */
export function feeBreakdownFor(
  feeTzs: number,
  treatment: FeeVatTreatment,
  vatRatePct: number,
): { totalTzs: number; vatTzs: number; netTzs: number } {
  const rate = vatRatePct / 100;
  if (treatment === "EXCLUSIVE") {
    const vat = Math.round(feeTzs * rate);
    return { totalTzs: feeTzs + vat, vatTzs: vat, netTzs: feeTzs };
  }
  const vat = Math.round(feeTzs * (rate / (1 + rate)));
  return { totalTzs: feeTzs, vatTzs: vat, netTzs: feeTzs - vat };
}

/**
 * The VAT component OF A GROSS AMOUNT ALREADY PAID, under a given treatment.
 *
 * ⭐ THIS IS THE REFUND'S QUESTION, AND IT IS NOT THE SAME AS `feeBreakdownFor`'s. The refund
 * knows the gross it is handing back and needs the VAT inside it. Under `INCLUSIVE` the gross
 * IS `registrationFeeTzs`, so the inclusive back-out applies. Under `EXCLUSIVE` the gross is
 * `net × (1 + rate)`, so the VAT inside it is `gross × rate / (1 + rate)` — which is the same
 * algebra, and that is the point: for a GROSS input the back-out formula is treatment-
 * independent. It is stated once, here, so nobody has to re-derive that and get it wrong
 * again.
 */
export function vatWithinGross(grossTzs: number, vatRatePct: number): number {
  const rate = vatRatePct / 100;
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return Math.round(grossTzs * (rate / (1 + rate)));
}

// ═══════════════════════════════════════════════════════════════════════════
//  ELIGIBILITY — gate the OFFER
// ═══════════════════════════════════════════════════════════════════════════

export type ApplyRefusal =
  | "programme_disabled"
  | "kyc_required"
  | "staff"
  | "already_agent"
  | "account_not_active"
  | "rg_locked"
  | "terminal_rejection"
  | "cooldown"
  | "invitation_pending";

export type ApplicantEligibility =
  | { ok: true }
  | { ok: false; refusal: ApplyRefusal; until?: string | null };

/**
 * May this person START an application? Read by `startApplication` AND by the /agent page's
 * CTA, so the page never offers what the service is about to refuse — before anyone is told
 * to send TZS 100,000 out of band.
 */
export async function applicantEligibility(userId: string, opts: { forInvitation?: boolean } = {}): Promise<ApplicantEligibility> {
  const cfg = getAgentConfig();
  if (!cfg.enabled) return { ok: false, refusal: "programme_disabled" };
  const user = await db.user.findById(userId);
  if (!user) return { ok: false, refusal: "account_not_active" };
  if (isStaffRole(user.role)) return { ok: false, refusal: "staff" };
  const acct = await db.affiliate.findByUserId(userId);
  if (isApprovedAgent(acct)) return { ok: false, refusal: "already_agent" };
  if (user.status !== "ACTIVE" && user.status !== "PENDING_KYC") return { ok: false, refusal: "account_not_active" };
  // ⭐ Responsible gambling: a person on a break, or with a serving self-exclusion, is not
  // offered a financial stake in recruiting gamblers. Checked here — at the offer — so the
  // refusal never first appears after the fee was paid.
  const lock = await isLockedOut(userId);
  if (lock.locked) return { ok: false, refusal: "rg_locked", until: lock.until };
  const se = await selfExclusionStanding(userId);
  if (se.state !== "none") return { ok: false, refusal: "rg_locked", until: null };
  // KYC — self-service needs the platform's ordinary identity verification APPROVED first.
  // An invitee uploads their own ID + selfie through the same flow and it is decided at
  // approval, so for them the door opens without it.
  if (!opts.forInvitation) {
    const kyc = await getKycStatus(userId);
    if (!kyc || kyc.status !== "APPROVED") return { ok: false, refusal: "kyc_required" };
  }
  // Prior refusals: terminal reasons never re-open; others re-open after the cool-down.
  // ⭐ REVOKED joins REJECTED here (four-lens review, 2026-09-07): the authority promises a
  // cool-down after a partnership is ended, and the code only counted rejections — a revoked
  // agent could re-apply the same afternoon.
  const prior = (await db.agentApplication.listByUser(userId)).filter((a) => a.status === "REJECTED" || a.status === "REVOKED");
  if (prior.some((a) => a.rejectReason && TERMINAL_REJECT_REASONS.includes(a.rejectReason))) {
    return { ok: false, refusal: "terminal_rejection" };
  }
  const latest = prior.sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""))[0];
  if (latest?.reviewedAt) {
    const until = new Date(new Date(latest.reviewedAt).getTime() + cfg.reapplyCooldownDays * DAY_MS);
    if (until.getTime() > Date.now()) return { ok: false, refusal: "cooldown", until: until.toISOString() };
  }
  return { ok: true };
}

/** Any application of this user still owed a refund — the second-fee gate. */
async function refundOwedTo(userId: string): Promise<StoredAgentApplication | null> {
  const apps = await db.agentApplication.listByUser(userId);
  return apps.find((a) => a.feeDisposition === "REFUND_DUE") ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SELF-SERVICE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Start — or RESUME — an application. A literal mirror of `startKyc`: an existing row in an
 * editable state is resumed and its id returned; UNDER_REVIEW and APPROVED refuse with a real
 * message; a terminal row is not found by `findActiveByUser`, so a fresh one is created.
 *
 * ⛔ THE PARTIAL UNIQUE INDEX IS THE RACE-LOSER BACKSTOP, NOT THIS. Two concurrent starts both
 * pass `findActiveByUser`; the lock below serialises them so the index never has to fire, and
 * if it somehow does, `isAgentApplicationDuplicate` turns the 23505 into a resume.
 */
export async function startApplication(userId: string): Promise<ServiceResult<{ applicationId: string; resumed: boolean }>> {
  return withLock(`agentapp:${userId}`, async () => {
    const existing = await db.agentApplication.findActiveByUser(userId);
    if (existing) {
      if (existing.status === "INVITED") return { ok: false as const, error: "Accept your invitation first.", code: "INVALID" as const };
      if (existing.status === "UNDER_REVIEW") return { ok: false as const, error: "Your application is awaiting compliance approval.", code: "INVALID" as const };
      if (existing.status === "APPROVED") return { ok: false as const, error: "You are already an approved agent.", code: "INVALID" as const };
      return { ok: true as const, data: { applicationId: existing.id, resumed: true } };
    }
    const elig = await applicantEligibility(userId);
    if (!elig.ok) return refusalResult(elig);
    const cfg = getAgentConfig();
    const now = iso();
    let app: StoredAgentApplication;
    try {
      app = await db.agentApplication.create({
        id: `agp_${randomId(10)}`,
        userId,
        status: "DRAFT",
        source: "SELF_SERVICE",
        refereeOneName: null, refereeOneContact: null, refereeTwoName: null, refereeTwoContact: null, refereeConsentAt: null,
        feeAmountTzs: null, feeAttestedTzs: null, feeFundingSource: null, feeReference: null, feeStatementRef: null,
        feeReconciledAt: null, feeReconciledById: null, feeSourceAccount: null,
        feeWaivedAt: null, feeWaivedById: null, feeWaiverReason: null,
        feeDisposition: "NONE", feeRefundDueAt: null, feeRefundedAt: null, feeRefundedById: null, feeRefundReference: null, feeRefundAmountTzs: null,
        reviewerId: null, reviewedAt: null, rejectReason: null, rejectNote: null, infoRequestNote: null, infoRequestedAt: null,
        approvedRatePct: null, agentCode: null, acceptedTermsVersion: null, acceptedTermsAt: null,
        submittedAt: null,
        expiresAt: new Date(Date.now() + cfg.draftExpiryDays * DAY_MS).toISOString(),
        createdAt: now, updatedAt: now,
      });
    } catch (err) {
      if (isAgentApplicationDuplicate(err)) {
        const again = await db.agentApplication.findActiveByUser(userId);
        if (again) return { ok: true as const, data: { applicationId: again.id, resumed: true } };
      }
      throw err;
    }
    audit({ category: "ADMIN", action: "agent.application.started", actorId: userId, targetType: "AgentApplication", targetId: app.id, payload: { source: "SELF_SERVICE", expiresAt: app.expiresAt } });
    return { ok: true as const, data: { applicationId: app.id, resumed: false } };
  });
}

/**
 * The partial unique index fired. Prisma surfaces a raw-SQL partial index as P2002 with an
 * unreliable `meta.target`, so match the Postgres code and the index NAME too.
 */
export const AGENT_APPLICATION_ACTIVE_INDEX = "AgentApplication_userId_active_key";
export function isAgentApplicationDuplicate(err: unknown): boolean {
  const e = err as { code?: string; meta?: { code?: string; target?: unknown; message?: string }; message?: string } | null;
  if (!e) return false;
  const text = `${e.message ?? ""} ${e.meta?.message ?? ""} ${JSON.stringify(e.meta?.target ?? "")}`;
  return e.code === "P2002" || e.code === "23505" || e.meta?.code === "23505" || text.includes(AGENT_APPLICATION_ACTIVE_INDEX);
}

/**
 * Refuse, and say WHERE. ⛔ `field` first in the signature on purpose — the same construction
 * as `fieldError` in `src/lib/server/field-error.ts`, for the same reason: the address of the
 * control the operator must fix is not an afterthought. The client hands it to
 * `focusFirstInvalid`, so the refusal lands on the input rather than in a toast.
 */
function fieldFailure(field: string, error: string): ServiceResult<never> {
  return { ok: false, error, code: "INVALID", field };
}

function refusalResult(elig: Extract<ApplicantEligibility, { ok: false }>): ServiceResult<never> {
  const messages: Record<ApplyRefusal, string> = {
    programme_disabled: "The agent programme is not accepting applications right now.",
    kyc_required: "Verify your identity first.",
    staff: "Staff accounts cannot apply to be agents.",
    already_agent: "You are already an approved agent.",
    account_not_active: "Your account is not active.",
    rg_locked: "Applications are not available while a responsible-gambling break is active.",
    terminal_rejection: "A previous decision on your application is final.",
    cooldown: "You can apply again after the cool-down period.",
    invitation_pending: "Accept your invitation first.",
  };
  return { ok: false, error: messages[elig.refusal], code: "INVALID", reason: undefined } as ServiceResult<never>;
}

/** The one live application for the applicant, in an editable state, or a refusal. */
async function editableApplication(userId: string): Promise<{ ok: true; app: StoredAgentApplication } | { ok: false; error: string; code: "NOT_FOUND" | "INVALID" }> {
  const app = await db.agentApplication.findActiveByUser(userId);
  if (!app) return { ok: false, error: "Start an application first.", code: "NOT_FOUND" };
  if (!EDITABLE.includes(app.status)) {
    return { ok: false, error: app.status === "UNDER_REVIEW" ? "Your application is locked while it is under review." : "This application can no longer be edited.", code: "INVALID" };
  }
  return { ok: true, app };
}

/** ⛔ The storage key hint is OPAQUE: the application id and the slot. Never a name, never a
 *  phone — that is the one class of PII erasure can never reach. Built HERE, never by a caller. */
function keyHintFor(applicationId: string, docType: AgentDocType): string {
  return `agentapp/${applicationId}/${docType}`;
}

/**
 * Attach one image to a slot. REPLACES a previous file in that slot (the old object is
 * destroyed). Distinct errors for the three ways an upload is wrong — wrong type, too large,
 * magic bytes disagree — come from `validateDocImage`, the SAME validator KYC uses.
 *
 * `suppliedById` records who physically supplied the file: the applicant, or the officer on an
 * invited application. ⛔ An officer may never supply an invitee's own identity documents —
 * those go through the ordinary KYC flow, not through here.
 */
export async function attachAgentDocument(
  userId: string,
  docType: AgentDocType,
  dataUrl: string,
  opts: { suppliedById?: string } = {},
): Promise<ServiceResult<{ status: StoredAgentApplication["status"]; attached: number }>> {
  if (!ALL_DOC_SLOTS.includes(docType)) return { ok: false, error: "Unknown document slot.", code: "INVALID", reason: "doc_image_type" };
  const valid = validateDocImage(dataUrl);
  if (!valid.ok) return { ok: false, error: valid.error, code: "INVALID", reason: valid.reason };

  return withLock(`agentapp:${userId}`, async () => {
    const e = await editableApplication(userId);
    if (!e.ok) return { ok: false as const, error: e.error, code: e.code };
    const app = e.app;
    // In ADDITIONAL_INFO_REQUIRED only the slots an officer rejected — or ones still empty —
    // are actionable. Replacing an accepted document would change evidence behind a pending
    // decision.
    const slot = await db.agentApplicationDoc.findSlot(app.id, docType);
    if (app.status === "ADDITIONAL_INFO_REQUIRED" && slot && !slot.rejected) {
      return { ok: false as const, error: "That document was accepted. Only the ones the officer asked about can be replaced.", code: "INVALID" as const, reason: "docs_locked" as const };
    }
    const storedKey = await putKycDocument(dataUrl, keyHintFor(app.id, docType));
    const now = iso();
    if (slot) {
      // Replace: destroy the old bytes, then overwrite the row.
      await deleteKycDocument(slot.storageKey);
      await db.agentApplicationDoc.update(slot.id, {
        storageKey: storedKey, mimeType: valid.mimeType, sizeBytes: valid.bytes,
        suppliedById: opts.suppliedById ?? userId, uploadedAt: now, rejected: false, rejectReason: null, purgedAt: null,
      });
    } else {
      await db.agentApplicationDoc.create({
        id: `agd_${randomId(10)}`,
        applicationId: app.id, docType, storageKey: storedKey, mimeType: valid.mimeType, sizeBytes: valid.bytes,
        suppliedById: opts.suppliedById ?? userId, uploadedAt: now, rejected: false, rejectReason: null,
        thirdParty: THIRD_PARTY_SLOTS.includes(docType), purgedAt: null,
      });
    }
    // Never log the image bytes.
    audit({ category: "ADMIN", action: "agent.application.document_uploaded", actorId: opts.suppliedById ?? userId, targetType: "AgentApplication", targetId: app.id, payload: { docType, bytes: valid.bytes, replaced: !!slot, thirdParty: THIRD_PARTY_SLOTS.includes(docType) } });

    const next = await recomputeDraftStatus(app);
    const attached = (await db.agentApplicationDoc.listByApplication(app.id)).filter((d) => REQUIRED_DOC_SLOTS.includes(d.docType) && !d.purgedAt).length;
    return { ok: true as const, data: { status: next, attached } };
  });
}

/**
 * ⭐ THE DRAFT-STATE RULE, PURE — one home, no I/O.
 *
 * Extracted so `payFeeFromWallet` can apply the SAME rule without a second database round trip
 * while it is holding the wallet lock. ⚠️ The alternative was to re-state the derivation at that
 * call site, which is a second source of truth for a status machine — exactly the thing that
 * rots. ⛔ Any new draft-state condition belongs HERE and nowhere else.
 */
function deriveDraftStatus(
  app: Pick<StoredAgentApplication, "status" | "feeReference" | "feeDisposition">,
  allSeven: boolean,
): StoredAgentApplication["status"] {
  if (app.status === "ADDITIONAL_INFO_REQUIRED") return app.status;
  /**
   * ⛔ "THE FEE IS SETTLED", NOT "A REFERENCE WAS TYPED".
   *
   * 🔴 This read `!!app.feeReference || app.feeDisposition === "WAIVED"`, which was complete only
   * while every payment happened out of band. A WALLET payment (Ali, 2026-09-10) writes **no
   * `feeReference`** — the debit carries the payer's identity, so there is nothing to type — so a
   * paid applicant stayed at `KYC_SUBMITTED`. And `submitForReview` is the ONLY door into
   * `UNDER_REVIEW`: they had paid us TZS 100,000 and the form would not let them apply.
   *
   * ⭐ `COLLECTED` is the disposition that means "we have the money", by either rail, and it is
   * already what `approveAgent` requires. Reading the DISPOSITION rather than the evidence of one
   * particular rail is what makes this correct for both.
   * `npm run test:agent-fee-wallet-path` §1.1 · `COMPLIANCE-DECISIONS.md` § 2026-09-10.
   */
  const feeRecorded = !!app.feeReference || app.feeDisposition === "WAIVED" || app.feeDisposition === "COLLECTED";
  return !allSeven ? "DRAFT" : feeRecorded ? "PAYMENT_PENDING" : "KYC_SUBMITTED";
}

/** Has the applicant attached all seven required documents? One read, so a caller that already
 *  needs it can take it BEFORE entering a lock-sensitive section. */
async function hasAllRequiredDocs(applicationId: string): Promise<boolean> {
  const docs = (await db.agentApplicationDoc.listByApplication(applicationId)).filter((d) => !d.purgedAt);
  return REQUIRED_DOC_SLOTS.every((s) => docs.some((d) => d.docType === s));
}

/** DRAFT → KYC_SUBMITTED once all seven are attached; → PAYMENT_PENDING once the fee is
 *  settled too. Never moves a row out of ADDITIONAL_INFO_REQUIRED (that needs a resubmit). */
async function recomputeDraftStatus(app: StoredAgentApplication): Promise<StoredAgentApplication["status"]> {
  if (app.status === "ADDITIONAL_INFO_REQUIRED") return app.status;
  const next = deriveDraftStatus(app, await hasAllRequiredDocs(app.id));
  if (next !== app.status) await db.agentApplication.update(app.id, { status: next });
  return next;
}

/** Referee names + contacts, and the applicant's attestation that each consented. ⛔ The
 *  applicant is the accountable party — we have no relationship with the referee. */
/**
 * ⭐ IS THIS CONTACT ONE A COMPLIANCE OFFICER COULD ACTUALLY USE?
 *
 * The field accepts a phone number OR an email, so it needs both shapes. ⚠️ Deliberately
 * permissive on the PHONE side: a referee is not a 50pick account holder, so a landline
 * (`022 …`), a number written with spaces or dashes, and an international number all have to
 * pass. What must NOT pass is a string with no plausible way to reach anybody — which is
 * everything the old `length >= 6` rule let through.
 *
 * ⛔ NOT A REGISTRATION-GRADE PHONE CHECK. `/^\+255[67]\d{8}$/` is right for a 50pick account
 * (it must be a Tanzanian mobile that can receive an OTP) and wrong here: refusing a
 * referee's office landline would make an applicant fabricate a mobile number to get past
 * the form, which is worse than accepting the landline.
 */
export function isReachableContact(raw: string): boolean {
  const value = (raw ?? "").trim();
  if (!value) return false;
  // An email: something@something.tld, no spaces or list separators.
  if (/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(value)) return true;
  // A phone: at least nine digits once punctuation is stripped, and nothing but digits and
  // the punctuation people actually write numbers with.
  if (!/^[+()\-.\s\d]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

export async function setReferees(
  userId: string,
  input: { oneName: string; oneContact: string; twoName: string; twoContact: string; consent: boolean },
): Promise<ServiceResult> {
  const clean = (s: string) => (s ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const oneName = clean(input.oneName), twoName = clean(input.twoName);
  const oneContact = clean(input.oneContact), twoContact = clean(input.twoContact);
  /**
   * 🔴 EVERY REFUSAL HERE NAMES ITS FIELD, and the format rules are real.
   *
   * This used to say "Each referee needs a name" for either name and "Each referee needs a
   * phone number or email" for either contact — a refusal an applicant could not act on
   * without guessing which of the four boxes was wrong, delivered as a TOAST, on a
   * four-step form where the offending step may not even be on screen. And the only rule on
   * the contact was `length >= 6`, so `aaaaaa` passed and an officer discovered the
   * unreachable referee days later, at the point of a decision.
   *
   * ⛔ THE RULE IS NAMED IN FULL, never "invalid" (§F4). A referee is a real person a
   * compliance officer has to be able to REACH — that is the entire purpose of the field —
   * so a contact that cannot be dialled or written to is worse than an empty one, because
   * an empty one is visibly missing.
   */
  for (const [field, value] of [["oneName", oneName], ["twoName", twoName]] as const) {
    if (value.length < 2) return fieldFailure(field, "Enter the referee's full name, as it appears on their letter.");
    // ⛔ A name is not a phone number. Somebody pasting a number into both boxes of a pair is
    // a real slip, and it leaves the officer with a contact and no idea who it belongs to.
    if (!/[A-Za-z]/.test(value)) return fieldFailure(field, "Enter the referee's name in letters — this is who they are, not how to reach them.");
  }
  for (const [field, value] of [["oneContact", oneContact], ["twoContact", twoContact]] as const) {
    if (!value) return fieldFailure(field, "Enter a phone number or an email address for this referee.");
    if (!isReachableContact(value)) {
      return fieldFailure(field, "Enter a reachable contact — a Tanzanian mobile number like 0712 345 678 or +255 712 345 678, or an email address like referee@example.com.");
    }
  }
  if (!input.consent) return fieldFailure("consent", "Confirm that both referees agreed to be named.");
  return withLock(`agentapp:${userId}`, async () => {
    const e = await editableApplication(userId);
    if (!e.ok) return { ok: false as const, error: e.error, code: e.code };
    await db.agentApplication.update(e.app.id, { refereeOneName: oneName, refereeOneContact: oneContact, refereeTwoName: twoName, refereeTwoContact: twoContact, refereeConsentAt: iso() });
    audit({ category: "ADMIN", action: "agent.application.referees_set", actorId: userId, targetType: "AgentApplication", targetId: e.app.id });
    return { ok: true as const };
  });
}

/**
 * The applicant records the receipt reference they were given for the out-of-band payment.
 * ⭐ `feeReference` is UNIQUE — one receipt, one application. ⛔ The AMOUNT is never typed here:
 * `feeAmountTzs` is stamped from config by the OFFICER at reconciliation.
 *
 * ⛔ THE SECOND-FEE GATE. While a previous application of theirs is still owed a refund, we do
 * not take a second TZS 100,000. Refused here — at the payment — not at the door, so the
 * applicant can still assemble documents while the refund is processed.
 */
/**
 * ⭐ EVERY REFUSAL THIS CAN PRODUCE IS A NAMED TOKEN, not a sentence to be pattern-matched.
 *
 * 🔴 The form used to tell them apart with `/already in use/i.test(r.error)` and
 * `/refund/i.test(r.error)`, and rendered `r.error` raw for everything else — so a Swahili or
 * Chinese applicant met English server prose on the money step, and a reworded sentence would
 * have silently broken the two branches that did work. This is the same discipline the upload
 * path in `apply/actions.ts` already states in its header: the UI must not substring-match
 * English prose to tell two failures apart.
 */
/**
 * ⭐ MACHINE TOKENS, NOT ENGLISH PROSE. The form renders translated copy from these; it used to
 * substring-match the server's sentences (`/refund/i.test(r.error)`), which put raw English into
 * a Swahili UI for every refusal that had no branch, and made rewording a sentence a silent
 * regression. ⛔ A new refusal without a token is that defect again.
 *
 * The last four arrived with the WALLET rail (Ali, 2026-09-10). Paying from a wallet inherits
 * every precondition of DEPOSITING, and two of them are not checked at the agent door:
 *  · `kyc_required`     — deposit needs identity APPROVED. `applicantEligibility` enforces this
 *                         for self-service but exempts an OFFICER-INVITED applicant on purpose,
 *                         so an invitee could reach the payment step unable to fund a wallet.
 *  · `email_unverified` — deposit needs a verified email; nothing upstream checks it.
 *  · `insufficient_balance` — the commonest refusal of all, and the one that must carry the
 *                         SHORTFALL so the surface can offer a deposit for the right amount.
 *  · `wallet_unavailable` — one honest token for the rest, rather than leaking an internal code.
 */
export type FeeRefusal =
  | "reference_format" | "reference_taken" | "receipt_missing" | "refund_owed" | "not_editable"
  | "kyc_required" | "email_unverified" | "insufficient_balance" | "wallet_unavailable";

export type FeeResult =
  | { ok: true; data: { status: StoredAgentApplication["status"] } }
  | { ok: false; error: string; code: "INVALID" | "NOT_FOUND"; field?: string; refusal: FeeRefusal };

export async function recordFeePayment(userId: string, input: { feeReference: string }): Promise<FeeResult> {
  const ref = (input.feeReference ?? "").trim().toUpperCase().replace(/\s+/g, "");
  // ⛔ THE RULE IS NAMED, and the refusal carries its field so it lands ON the input.
  if (ref.length < 4 || ref.length > 64 || !/^[A-Z0-9-]+$/.test(ref)) {
    return { ok: false, error: "Enter the receipt reference exactly as printed — letters, numbers and dashes only, at least 4 characters.", code: "INVALID", field: "feeReference", refusal: "reference_format" };
  }
  return withLock(`agentapp:${userId}`, async () => {
    const e = await editableApplication(userId);
    if (!e.ok) return { ok: false as const, error: e.error, code: e.code, refusal: "not_editable" as const };
    const app = e.app;
    const owed = await refundOwedTo(userId);
    // ⭐ `refusal` is a MACHINE TOKEN, so the form renders translated copy instead of
    // substring-matching this English sentence — which is exactly what it used to do
    // (`/refund/i.test(r.error)`), and which put raw English into a Swahili UI for every
    // other refusal this call can produce.
    if (owed && owed.id !== app.id) return { ok: false as const, error: "A refund from your previous application is still being processed. Wait for it before paying again.", code: "INVALID" as const, refusal: "refund_owed" as const };
    const receipt = await db.agentApplicationDoc.findSlot(app.id, "FEE_RECEIPT");
    if (!receipt || receipt.purgedAt) return { ok: false as const, error: "Upload the receipt first.", code: "INVALID" as const, refusal: "receipt_missing" as const };
    const holder = await db.agentApplication.findByFeeReference(ref);
    if (holder && holder.id !== app.id) {
      audit({ category: "SECURITY", action: "agent.fee.duplicate_reference", actorId: userId, targetType: "AgentApplication", targetId: app.id, payload: { holder: holder.id } });
      return { ok: false as const, error: "That receipt reference is already in use.", code: "INVALID" as const, field: "feeReference", refusal: "reference_taken" as const };
    }
    // A changed receipt on an ADDITIONAL_INFO_REQUIRED application clears the officer's
    // reconciliation: the payment they matched is no longer the one on the row.
    const clearReconcile = app.status === "ADDITIONAL_INFO_REQUIRED" && app.feeReference !== ref && !!app.feeReconciledAt;
    await db.agentApplication.update(app.id, {
      feeReference: ref,
      ...(clearReconcile ? { feeReconciledAt: null, feeReconciledById: null, feeAttestedTzs: null, feeStatementRef: null, feeDisposition: "NONE" as const } : {}),
    });
    audit({ category: "ADMIN", action: "agent.fee.reference_recorded", actorId: userId, targetType: "AgentApplication", targetId: app.id, payload: { feeReference: ref, clearedReconciliation: clearReconcile } });
    const status = await recomputeDraftStatus({ ...app, feeReference: ref });
    return { ok: true as const, data: { status } };
  });
}

/**
 * ⭐ PAY THE REGISTRATION FEE FROM THE APPLICANT'S OWN WALLET — the live rail since 2026-09-10.
 *
 * Ali's ruling: the applicant deposits on the ordinary rails, then pays the fee from that
 * balance. Reason: a Lipa/QR payment carries no reference on any network and a bank receipt is
 * only as good as the human reading it, whereas a wallet debit carries the payer's identity by
 * construction. `COMPLIANCE-DECISIONS.md` § 2026-09-10.
 *
 * ── GATE THE OFFER, NEVER THE REFUSAL — and this rail added two new gates ───────────────────
 * ⛔ Paying from a wallet inherits EVERY PRECONDITION OF DEPOSITING, and `wallet/deposit/page.tsx`
 * renders a gate instead of the form for two of them. Neither was checked at the agent door,
 * because under the out-of-band rail neither could strand anybody:
 *  · KYC APPROVED — `applicantEligibility` enforces it for self-service, but `!opts.forInvitation`
 *    exempts an OFFICER-INVITED applicant deliberately ("decided at approval"). Under this rail
 *    an un-KYC'd invitee cannot fund a wallet and therefore cannot pay. ⚠️ And the invitation
 *    email hard-codes `feeWaivable: true`, so it says the fee *may* be waived while the waiver is
 *    a separate officer action — an unwaived invitee would simply be stuck.
 *  · A VERIFIED EMAIL — required by deposit, checked nowhere upstream.
 *
 * ── WHAT IS RETAINED FROM THE OLD RAIL, AND WHAT IS NOT ─────────────────────────────────────
 * ⛔ The refund-owed refusal STAYS. It is not a receipt control — it is a money-owed control, and
 * it is just as true when the money would leave a wallet. The receipt image, the typed reference
 * and its uniqueness check are gone with the rail that needed them; the debit replaces all three.
 *
 * ── ATOMICITY, AND THE LOCK ORDER THIS ESTABLISHES ──────────────────────────────────────────
 * ⚠️ This is a NEW lock pair. `locks.ts` documents the rule as *"lock order is globally
 * wallet→market (never the reverse), so a longer hold cannot create a cycle"*, and nothing else
 * pairs `agentapp:` with `wallet:`. Taking **`agentapp:` OUTER and `wallet:` INNER** gives a
 * consistent total order `agentapp → wallet → market`. ⛔ Never invert it.
 * ⭐ And because `withLock` publishes its transaction and the inner `withMoneyTx` JOINS it, the
 * wallet debit, the `Transaction`, the ledger group AND the stamp below commit as ONE
 * transaction — a throw anywhere rolls back all four.
 *
 * ⭐ IDEMPOTENT AT BOTH LAYERS. This returns early on an already-settled disposition, and
 * `payAgentRegistrationFee` is itself keyed on the application id, so a double-submitted form
 * pays once even if it races past the early return.
 */
export async function payFeeFromWallet(userId: string): Promise<FeeResult & { shortfallTzs?: number }> {
  return withLock(`agentapp:${userId}`, async () => {
    const e = await editableApplication(userId);
    if (!e.ok) return { ok: false as const, error: e.error, code: e.code, refusal: "not_editable" as const };
    const app = e.app;

    // ⭐ ALREADY SETTLED — idempotent, and NOT an error. A second tap must not look like a
    // failure to someone who has already paid.
    if (app.feeDisposition === "WAIVED" || app.feeDisposition === "COLLECTED") {
      const status = await recomputeDraftStatus(app);
      return { ok: true as const, data: { status } };
    }

    // ⛔ RETAINED: we still hold money of theirs from a previous application.
    const owed = await refundOwedTo(userId);
    if (owed && owed.id !== app.id) {
      return { ok: false as const, error: "A refund from your previous application is still being processed. Wait for it before paying again.", code: "INVALID" as const, refusal: "refund_owed" as const };
    }

    // ⛔ THE DEPOSIT PRECONDITIONS, CHECKED BEFORE ANY MONEY MOVES, in the SAME ORDER the deposit
    // screen asks them — identity, then email — so a person cannot clear the one they were told
    // about and then be refused for another.
    const kyc = await getKycStatus(userId);
    if (!kyc || kyc.status !== "APPROVED") {
      return { ok: false as const, error: "Verify your identity before paying the registration fee.", code: "INVALID" as const, refusal: "kyc_required" as const };
    }
    const payer = await db.user.findById(userId);
    if (!payer?.emailVerifiedAt) {
      return { ok: false as const, error: "Verify your email address before paying the registration fee.", code: "INVALID" as const, refusal: "email_unverified" as const };
    }

    // ⛔ `feeBreakdown().totalTzs` IS WHAT AN APPLICANT OWES. Never `registrationFeeTzs`, never a
    // literal — the config module's own law, and a guard exists because attesting the net against
    // the total once failed four downstream legs as a chain.
    const fee = feeBreakdown();

    /**
     * ⭐ EVERY READ HAPPENS BEFORE THE WALLET LOCK IS TAKEN.
     *
     * ⚠️ `withLock` nests by joining the parent transaction, and its own note says the inner
     * advisory lock is then "held until the OUTER lock ends". So every round trip after the debit
     * happens while this user's WALLET lock is held — and while it is, they cannot bet, cash out
     * or withdraw. That is a LIVENESS cost on a money path, and no guard catches it, so the
     * section under the lock is kept to a single write.
     */
    const allSeven = await hasAllRequiredDocs(app.id);

    const paid = await payAgentRegistrationFee(userId, {
      applicationId: app.id,
      amountTzs: fee.totalTzs,
      vatTzs: fee.vatTzs,
      description: `Agent registration fee · ${app.id}`,
    });

    if (!paid.ok) {
      if (paid.code === "INSUFFICIENT_FUNDS") {
        return {
          ok: false as const,
          error: `You need ${formatTzs(paid.shortfall)} more in your wallet to pay the registration fee.`,
          code: "INVALID" as const, refusal: "insufficient_balance" as const,
          shortfallTzs: paid.shortfall,
        };
      }
      return { ok: false as const, error: "That payment could not be completed. Contact support.", code: "INVALID" as const, refusal: "wallet_unavailable" as const };
    }

    /**
     * ⭐ STAMPED IN THE SAME TRANSACTION AS THE DEBIT.
     * `feeFundingSource: "WALLET"` is what lets `recordFeeRefund` mirror the collection instead
     * of today's policy — refunding this to `EXTERNAL:SELCOM` would send a person's money to a
     * bank account they never paid from. `feeAmountTzs` is stamped so the officer's panel shows
     * WHAT WAS PAID rather than today's config figure.
     * ⛔ No `feeReference`, no `feeAttestedTzs`, no `feeReconciledById` — nobody attested
     * anything, and inventing an officer here would be a false audit record.
     */
    const now = iso();
    const status = deriveDraftStatus({ ...app, feeDisposition: "COLLECTED" }, allSeven);
    // ⭐ ONE WRITE, no reads — the status is folded in rather than recomputed, so the wallet lock
    // is not held across a second query. Same rule as `recomputeDraftStatus`, so they cannot drift.
    await db.agentApplication.update(app.id, {
      feeAmountTzs: fee.totalTzs,
      feeDisposition: "COLLECTED",
      feeFundingSource: "WALLET",
      feeReconciledAt: now,
      ...(status !== app.status ? { status } : {}),
    });

    audit({
      category: "COMPLIANCE", action: "agent.fee.paid_from_wallet_recorded", actorId: userId,
      targetType: "AgentApplication", targetId: app.id,
      payload: { amountTzs: fee.totalTzs, vatTzs: fee.vatTzs, txnId: paid.txnId, balanceAfter: paid.balanceAfter, fundingSource: "WALLET", status },
    });

    return { ok: true as const, data: { status } };
  });
}

/**
 * Submit for review — THE ONLY DOOR INTO `UNDER_REVIEW`, from DRAFT-family states AND from
 * ADDITIONAL_INFO_REQUIRED (the exit transition the framework omits).
 * Refuses anything incomplete with an explicit list of what is missing, so the form can say
 * exactly that rather than "cannot submit".
 */
export async function submitForReview(userId: string, input: { acceptedTermsVersion: string }): Promise<ServiceResult<{ missing: string[] }>> {
  return withLock(`agentapp:${userId}`, async () => {
    const e = await editableApplication(userId);
    if (!e.ok) return { ok: false as const, error: e.error, code: e.code };
    const app = e.app;
    // The gates that bite at the door bite again here: staff, standing, RG, KYC can all have
    // changed since the draft was started.
    const elig = await applicantEligibility(userId, { forInvitation: app.source === "OFFICER_INVITED" });
    if (!elig.ok) return refusalResult(elig);
    const owed = await refundOwedTo(userId);
    if (owed && owed.id !== app.id) return { ok: false as const, error: "A refund from your previous application is still being processed.", code: "INVALID" as const };
    const missing = await missingForSubmit(app);
    if (missing.length > 0) return { ok: false as const, error: "Your application is not complete.", code: "INVALID" as const, data: { missing } } as ServiceResult<{ missing: string[] }>;
    if (!(input.acceptedTermsVersion ?? "").trim()) return { ok: false as const, error: "Accept the agent terms to continue.", code: "INVALID" as const };
    // An invitee's own identity must at least be SUBMITTED for review — it is decided at approval.
    if (app.source === "OFFICER_INVITED") {
      const kyc = await getKycStatus(userId);
      if (!kyc || !["PENDING_REVIEW", "APPROVED"].includes(kyc.status)) {
        return { ok: false as const, error: "Submit your identity documents first.", code: "INVALID" as const };
      }
    }
    const now = iso();
    await db.agentApplication.update(app.id, {
      status: "UNDER_REVIEW", submittedAt: now, infoRequestNote: null, infoRequestedAt: null,
      acceptedTermsVersion: input.acceptedTermsVersion.trim(), acceptedTermsAt: now, expiresAt: null,
    });
    // Clear per-slot rejections — the officer gets a fresh look at a resubmission.
    for (const d of await db.agentApplicationDoc.listByApplication(app.id)) {
      if (d.rejected) await db.agentApplicationDoc.update(d.id, { rejected: false, rejectReason: null });
    }
    audit({ category: "ADMIN", action: "agent.application.submitted", actorId: userId, targetType: "AgentApplication", targetId: app.id, payload: { source: app.source, resubmission: app.status === "ADDITIONAL_INFO_REQUIRED" } });
    notifyAgentApplicationSubmitted(userId, { applicationId: app.id });
    // Officers: in-app in every compliance bell, plus the email nudge. Best-effort.
    const user = await db.user.findById(userId);
    const label = user?.displayName?.trim() || `Applicant ${app.id.slice(-6)}`;
    for (const a of await db.user.listByRoles(["ADMIN", "COMPLIANCE"])) {
      notifyAdminAgentReview(a.id, { applicantLabel: label, applicationId: app.id }).catch(() => {});
    }
    const to = await kycNotifyEmails();
    if (to.length > 0) {
      sendEmail({ to: to.join(","), subject: `Agent application awaiting approval · ${label}`, html: agentApplicationSubmittedAdminHtml({ reference: app.id, applicantLabel: label, submittedAt: now, reviewUrl: `${appUrl()}/admin/agents/${app.id}` }), tag: "agent-submitted-admin", trackLinks: false }).catch(() => {});
    }
    return { ok: true as const, data: { missing: [] } };
  });
}

/** What still stands between this application and a submit — as slot / field names the form
 *  can translate. Empty means submittable. */
export async function missingForSubmit(app: StoredAgentApplication): Promise<string[]> {
  const docs = (await db.agentApplicationDoc.listByApplication(app.id)).filter((d) => !d.purgedAt);
  const missing: string[] = [];
  for (const s of REQUIRED_DOC_SLOTS) {
    const d = docs.find((x) => x.docType === s);
    if (!d) missing.push(s);
    else if (d.rejected) missing.push(s);
  }
  if (!app.refereeOneName || !app.refereeTwoName || !app.refereeConsentAt) missing.push("REFEREES");
  if (app.feeDisposition !== "WAIVED") {
    if (!docs.some((d) => d.docType === "FEE_RECEIPT")) missing.push("FEE_RECEIPT");
    if (!app.feeReference) missing.push("FEE_REFERENCE");
  }
  // ⭐ An INVITED applicant's own identity is part of what is missing — it used to be enforced
  // only as a late refusal at submit ("Submit your identity documents first"), after the seven
  // uploads and the fee (four-lens review, 2026-09-07). PENDING_REVIEW is enough here: the officer
  // decides identity and agent status together at approval.
  if (app.source === "OFFICER_INVITED") {
    const kyc = await getKycStatus(app.userId);
    if (!kyc || !["PENDING_REVIEW", "APPROVED"].includes(kyc.status)) missing.push("IDENTITY");
  }
  return missing;
}

// ═══════════════════════════════════════════════════════════════════════════
//  READ MODEL — the applicant's own view
// ═══════════════════════════════════════════════════════════════════════════

export type AgentDocView = { docType: AgentDocType; uploadedAt: string; rejected: boolean; rejectReason: string | null; sizeBytes: number; thirdParty: boolean };

export type ApplicantView =
  | { state: "none"; eligibility: ApplicantEligibility }
  | { state: "agent"; active: boolean }
  | { state: "invited"; applicationId: string; invitationExpiresAt: string | null }
  | {
      state: "in_progress" | "under_review" | "info_required" | "rejected" | "declined" | "expired" | "revoked";
      app: StoredAgentApplication;
      documents: AgentDocView[];
      missing: string[];
      /** What the applicant is owed and when it is due, when a fee was reconciled then refused. */
      refund: { dueAt: string | null; refundedAt: string | null; amountTzs: number | null; reference: string | null } | null;
      /** When they may apply again, for a non-terminal rejection. Null = terminal. */
      reapplyAt: string | null;
      /** From config: what the page promises about review time. */
      reviewSlaDays: number;
    };

export async function applicantView(userId: string): Promise<ApplicantView> {
  const acct = await db.affiliate.findByUserId(userId);
  if (isApprovedAgent(acct)) return { state: "agent", active: !!acct?.active };
  const cfg = getAgentConfig();
  const apps = await db.agentApplication.listByUser(userId);
  const live = apps.find((a) => !["REJECTED", "DECLINED", "EXPIRED", "REVOKED"].includes(a.status)) ?? null;
  const app = live ?? apps[0] ?? null;
  if (!app) return { state: "none", eligibility: await applicantEligibility(userId) };
  if (app.status === "INVITED") {
    const inv = (await db.agentInvitation.list()).find((i) => i.applicationId === app.id) ?? null;
    return { state: "invited", applicationId: app.id, invitationExpiresAt: inv?.expiresAt ?? null };
  }
  const documents: AgentDocView[] = (await db.agentApplicationDoc.listByApplication(app.id))
    .filter((d) => !d.purgedAt)
    .map((d) => ({ docType: d.docType, uploadedAt: d.uploadedAt, rejected: d.rejected, rejectReason: d.rejectReason, sizeBytes: d.sizeBytes, thirdParty: d.thirdParty }));
  const state: Extract<ApplicantView, { app: StoredAgentApplication }>["state"] =
    app.status === "UNDER_REVIEW" ? "under_review"
    : app.status === "ADDITIONAL_INFO_REQUIRED" ? "info_required"
    : app.status === "REJECTED" ? "rejected"
    : app.status === "DECLINED" ? "declined"
    : app.status === "EXPIRED" ? "expired"
    : app.status === "REVOKED" ? "revoked"
    : "in_progress";
  const terminal = !!app.rejectReason && TERMINAL_REJECT_REASONS.includes(app.rejectReason);
  const reapplyAt = (app.status === "REJECTED" || app.status === "REVOKED") && !terminal && app.reviewedAt
    ? new Date(new Date(app.reviewedAt).getTime() + cfg.reapplyCooldownDays * DAY_MS).toISOString()
    : null;
  return {
    state, app, documents,
    missing: EDITABLE.includes(app.status) ? await missingForSubmit(app) : [],
    refund: app.feeDisposition === "REFUND_DUE" || app.feeDisposition === "REFUNDED"
      ? { dueAt: app.feeRefundDueAt, refundedAt: app.feeRefundedAt, amountTzs: app.feeAmountTzs, reference: app.feeRefundReference }
      : null,
    reapplyAt,
    reviewSlaDays: cfg.reviewSlaDays,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  OFFICER — fee
// ═══════════════════════════════════════════════════════════════════════════

async function officerLoads(officerId: string, applicationId: string): Promise<{ ok: true; app: StoredAgentApplication; applicant: StoredUser } | { ok: false; error: string; code: "NOT_FOUND" | "INVALID" }> {
  const app = await db.agentApplication.findById(applicationId);
  if (!app) return { ok: false, error: "Application not found.", code: "NOT_FOUND" };
  if (app.userId === officerId) {
    audit({ category: "SECURITY", action: "agent.review.self_blocked", actorId: officerId, targetType: "AgentApplication", targetId: app.id });
    return { ok: false, error: "You cannot act on your own application.", code: "INVALID" };
  }
  const applicant = await db.user.findById(app.userId);
  if (!applicant) return { ok: false, error: "Applicant account not found.", code: "NOT_FOUND" };
  return { ok: true, app, applicant };
}

/**
 * The officer attests the payment against the receipt AND the bank statement line.
 * ⛔ THE AMOUNT IS STAMPED FROM CONFIG, and what the officer READ is a second column: a
 * mismatch is a hard refusal, not a note. A TZS 1,000 receipt attested as the fee must fail.
 * ⭐ Posts the LedgerEntry in the same step — money from the public becomes visible to the
 * house book, the trial balance and the tax pack the moment it is recognised.
 */
export async function reconcileFee(
  officerId: string,
  applicationId: string,
  input: { attestedTzs: number; statementRef: string; sourceAccountMasked: string },
): Promise<ServiceResult> {
  const statementRef = (input.statementRef ?? "").trim().slice(0, 80);
  if (statementRef.length < 3) return { ok: false, error: "Enter the bank statement line reference.", code: "INVALID" };
  const source = (input.sourceAccountMasked ?? "").trim().slice(0, 40);
  const attested = Math.round(Number(input.attestedTzs));
  return withLock(`agent:${applicationId}`, async () => {
    const o = await officerLoads(officerId, applicationId);
    if (!o.ok) return { ok: false as const, error: o.error, code: o.code };
    const { app } = o;
    if (!["PAYMENT_PENDING", "UNDER_REVIEW", "ADDITIONAL_INFO_REQUIRED"].includes(app.status)) {
      const word = AGENT_STATUS[app.status].en; return { ok: false as const, error: `Nothing to reconcile on an application marked "${word}".`, code: "INVALID" as const };
    }
    if (app.feeDisposition === "WAIVED") return { ok: false as const, error: "The fee was waived — nothing to reconcile.", code: "INVALID" as const };
    if (app.feeReconciledAt) return { ok: false as const, error: "The fee is already reconciled.", code: "INVALID" as const };
    if (!app.feeReference) return { ok: false as const, error: "The applicant has not recorded a receipt reference yet.", code: "INVALID" as const };
    const cfg = getAgentConfig();
    const fee = feeBreakdown(cfg);
    if (!Number.isFinite(attested) || attested !== fee.totalTzs) {
      audit({ category: "COMPLIANCE", action: "agent.fee.amount_mismatch", actorId: officerId, targetType: "AgentApplication", targetId: app.id, payload: { attested, expected: fee.totalTzs } });
      return { ok: false as const, error: `The receipt reads ${formatTzs(attested)}; the fee is ${formatTzs(fee.totalTzs)}. A short or over payment cannot be reconciled — ask the applicant to correct it.`, code: "INVALID" as const };
    }
    const now = iso();
    await db.agentApplication.update(app.id, {
      feeAmountTzs: fee.totalTzs, feeAttestedTzs: attested, feeStatementRef: statementRef, feeSourceAccount: source || null,
      feeReconciledAt: now, feeReconciledById: officerId, feeDisposition: "COLLECTED",
      // ⭐ STAMPED AT COLLECTION so the refund mirrors the collection rather than today's
      // policy — the same doctrine as reversing the VAT actually booked. This path is the
      // legacy out-of-band rail by definition: an officer read a bank receipt.
      feeFundingSource: "EXTERNAL",
    });
    // ⛔ THIS IS THE LEGACY OUT-OF-BAND PATH — money arrived in a bank account, NOT through a
    // wallet, so there is correctly no player `Transaction` here and the money-in leg must
    // stay EXTERNAL. ⚠️ Since 2026-09-10 the live rail is a WALLET DEBIT, which does carry a
    // `Transaction` and whose money-in leg is the PLAYER account. Both shapes therefore
    // exist, and `agentRegistrationFeeEntries` takes the source EXPLICITLY: booking this
    // legacy collection against the player would post a PLAYER ledger entry with no wallet
    // movement behind it and silently diverge the ledger from the balance it describes.
    // `COMPLIANCE-DECISIONS.md` § 2026-09-10.
    await postLedgerEntries(`agentfee_${app.id}`, agentRegistrationFeeEntries({
      groupRef: app.id, userId: app.userId, amount: fee.totalTzs, vatAmount: fee.vatTzs,
      description: `Agent registration fee · ${app.feeReference}`,
      source: "EXTERNAL",
    })).catch(() => {});
    audit({ category: "COMPLIANCE", action: "agent.fee.reconciled", actorId: officerId, targetType: "AgentApplication", targetId: app.id, payload: { feeReference: app.feeReference, statementRef, amountTzs: fee.totalTzs, vatTzs: fee.vatTzs, treatment: cfg.feeVatTreatment } });
    return { ok: true as const };
  });
}

/** Waive the fee — with a typed reason, audited. The officer-invited case. No ledger entry:
 *  no money moved. */
export async function waiveFee(officerId: string, applicationId: string, reason: string): Promise<ServiceResult> {
  const clean = (reason ?? "").trim().slice(0, 300);
  if (clean.length < 10) return { ok: false, error: "A reason of at least 10 characters is required to waive the fee.", code: "INVALID" };
  return withLock(`agent:${applicationId}`, async () => {
    const o = await officerLoads(officerId, applicationId);
    if (!o.ok) return { ok: false as const, error: o.error, code: o.code };
    const { app } = o;
    if (["APPROVED", "REJECTED", "DECLINED", "EXPIRED", "REVOKED"].includes(app.status)) return { ok: false as const, error: "This application is closed.", code: "INVALID" as const };
    if (app.feeDisposition === "COLLECTED") return { ok: false as const, error: "The fee was already collected — it cannot be waived now. Reject and refund instead.", code: "INVALID" as const };
    await db.agentApplication.update(app.id, { feeDisposition: "WAIVED", feeWaivedAt: iso(), feeWaivedById: officerId, feeWaiverReason: clean, feeAmountTzs: 0 });
    audit({ category: "COMPLIANCE", action: "agent.fee.waived", actorId: officerId, targetType: "AgentApplication", targetId: app.id, payload: { reason: clean } });
    // ⛔ Only a DRAFT-phase application advances on a waiver (the fee step is now satisfied). An
    // application already UNDER_REVIEW or sent back for information keeps its place: the
    // draft-status recompute used to run unconditionally here and quietly moved a submitted
    // application back to "Ready to submit" — found by test:agent-application-security §5.
    if (app.status === "DRAFT" || app.status === "KYC_SUBMITTED" || app.status === "PAYMENT_PENDING") {
      await recomputeDraftStatus({ ...app, feeDisposition: "WAIVED" });
    }
    return { ok: true as const };
  });
}

/**
 * Record the refund of a rejected applicant's fee. ⛔ The amount must equal exactly what was
 * collected; the destination is the account the money came from (captured at reconciliation);
 * the reference is the evidence. Posts the exact mirror of the collection, so a refunded fee
 * nets to zero in the house book.
 */
export async function recordFeeRefund(officerId: string, applicationId: string, input: { reference: string; amountTzs: number }): Promise<ServiceResult> {
  const ref = (input.reference ?? "").trim().slice(0, 80);
  if (ref.length < 3) return { ok: false, error: "Enter the refund reference.", code: "INVALID" };
  const amount = Math.round(Number(input.amountTzs));
  return withLock(`agent:${applicationId}`, async () => {
    const o = await officerLoads(officerId, applicationId);
    if (!o.ok) return { ok: false as const, error: o.error, code: o.code };
    const { app } = o;
    if (app.feeDisposition !== "REFUND_DUE") return { ok: false as const, error: "No refund is owed on this application.", code: "INVALID" as const };
    if (!Number.isFinite(amount) || amount !== (app.feeAmountTzs ?? -1)) {
      return { ok: false as const, error: `The refund must be exactly ${formatTzs(app.feeAmountTzs ?? 0)} — the amount collected.`, code: "INVALID" as const };
    }
    const now = iso();
    const cfg = getAgentConfig();
    /**
     * ⛔ THE ROW IS MARKED REFUNDED **AFTER** THE MONEY MOVES, NOT BEFORE.
     *
     * This update used to run first. On the wallet rail that ordering is a trap: if the credit
     * then failed, the application would read `REFUNDED` with nothing paid — and the refunds
     * worklist keys on the disposition, so it would FORGET a person we still owe. A
     * `REFUND_DUE` row an officer can retry is strictly better than a `REFUNDED` one that lied.
     * The write now happens below, once the money is actually back.
     */
    // ⭐ THE VAT INSIDE THE GROSS THAT WAS ACTUALLY COLLECTED — not today's expected split.
    // `amount` is already proved equal to `app.feeAmountTzs` above, so this reverses exactly
    // what `reconcileFee` posted and `HOUSE:TAX` nets to zero on a refunded application.
    // 🔴 This used to branch on whether the stamped amount still matched config and otherwise
    // apply the INCLUSIVE back-out unconditionally, which mis-reversed the tax leg under an
    // EXCLUSIVE treatment at any rate other than the one in force. See `vatWithinGross`.
    // 🔴 REVERSE WHAT WAS BOOKED, NOT WHAT TODAY'S RATE WOULD BOOK. This read
    // `vatWithinGross(amount, cfg.feeVatRatePct)` — the rate in force NOW — and the comment
    // above promised `HOUSE:TAX` nets to zero on a refunded application. That promise held
    // only while the rate never moved between collection and refund, and on 2026-09-09 it
    // moved: Ali set `feeVatRatePct` 18 → 0. Refunding the application collected at 18%
    // would then have returned the full 118,000 and reversed VAT of ZERO, stranding 18,000
    // in `HOUSE:TAX` against money that went entirely back.
    //
    // ⭐ The ledger already knows the answer exactly: the collection posted the VAT leg into
    // `agentfee_${app.id}`. Reading it back is exact by construction, needs no new column,
    // and cannot rot the next time a rate moves.
    //
    // ⛔ `null` means the store DID NOT ANSWER — not "no VAT". Only then do we fall back to
    // computing it, and the audit records which source was used so a reversal can always be
    // explained. Treating an unanswered read as 0 is exactly the §1.2 defect.
    const bookedVat = await ledgerGroupAccountSum(`agentfee_${app.id}`, acct.tax);
    const vatReversed = bookedVat ?? vatWithinGross(amount, cfg.feeVatRatePct);
    /**
     * ⭐ AND REVERSE TO WHERE THE MONEY CAME FROM, BY THE SAME DOCTRINE AS THE VAT.
     *
     * A fee paid from a wallet must go back to that wallet; one paid out of band must go back
     * out of band. Getting this wrong is not cosmetic in either direction: refunding a
     * wallet-funded fee to `EXTERNAL:SELCOM` sends a person's money to a bank account they
     * never paid from, and refunding an out-of-band fee to `PLAYER:<id>` credits a wallet
     * that was never debited — minting shillings and drifting the trial balance.
     *
     * ⛔ THE STORED STAMP IS THE SOURCE OF TRUTH, NOT AN INFERENCE. `feeFundingSource` is
     * written at collection. `null` means the row predates the 2026-09-10 ruling, and every
     * historical collection was out of band, so `null` reads as EXTERNAL.
     *
     * ⚠️ The ledger is consulted only as a CROSS-CHECK. If the collection group carries a
     * `PLAYER:` leg the fee was wallet-funded, and that must agree with the stamp. A
     * disagreement is a real defect somewhere upstream, so it is audited rather than
     * silently resolved — and the STAMP still wins, because a `null` from
     * `ledgerGroupAccountSum` means "could not ask", not "no player leg".
     */
    const fundingSource: "WALLET" | "EXTERNAL" = app.feeFundingSource ?? "EXTERNAL";
    const bookedPlayerLeg = await ledgerGroupAccountSum(`agentfee_${app.id}`, acct.player(app.userId));
    const ledgerSaysWallet = bookedPlayerLeg !== null && bookedPlayerLeg !== 0;
    if (bookedPlayerLeg !== null && ledgerSaysWallet !== (fundingSource === "WALLET")) {
      audit({
        category: "COMPLIANCE", action: "agent.fee.funding_source_mismatch", actorId: officerId,
        targetType: "AgentApplication", targetId: app.id,
        payload: { stamped: fundingSource, ledgerPlayerLeg: bookedPlayerLeg, refundedTo: fundingSource, note: "the stamp wins; investigate the collection" },
      });
    }
    /**
     * ⭐ A WALLET-FUNDED FEE GOES BACK TO THE WALLET — as MONEY, not as a book entry.
     *
     * 🔴 This posted the ledger mirror and nothing else, which was complete while every
     * collection arrived in a bank account and an officer wired it back. Once the fee can be
     * paid from a balance that becomes a defect against the applicant: their `PLAYER:` account
     * is credited, their wallet is not, `computeTrialBalance` drifts by the whole fee forever,
     * and the person we refused is out of pocket while our books say we paid them.
     *
     * ⛔ THE LEGACY PATH IS UNCHANGED, and that is not an oversight. An `EXTERNAL` collection
     * moved no wallet in, so crediting one here would MINT the fee. The branch is on the STORED
     * `feeFundingSource` — never on an inference — and `null` reads as EXTERNAL, which is what
     * every row predating 2026-09-10 was. Production holds exactly one such row.
     */
    if (fundingSource === "WALLET") {
      const credited = await refundAgentRegistrationFeeToWallet(app.userId, {
        applicationId: app.id,
        amountTzs: amount,
        // ⛔ The VAT the COLLECTION booked, read back above — never today's rate.
        vatTzs: vatReversed,
        description: `Agent registration fee refunded · ${ref}`,
      });
      if (!credited.ok) {
        // ⛔ REFUSE THE WHOLE REFUND rather than marking it done. A `REFUNDED` row whose money
        // never moved is worse than a `REFUND_DUE` one an officer can retry: the worklist would
        // forget a person we still owe.
        audit({ category: "COMPLIANCE", action: "agent.fee.refund_failed", actorId: officerId, targetType: "AgentApplication", targetId: app.id, payload: { code: credited.code, amountTzs: amount } });
        return { ok: false as const, error: "The refund could not be paid into the applicant's wallet. Nothing was changed — try again or escalate.", code: "INVALID" as const };
      }
    } else {
      // The out-of-band mirror: an officer has sent the money back by the rail it came in on,
      // and this records it. No wallet moved, so none moves here.
      await postLedgerEntries(`agentfee_refund_${app.id}`, agentRegistrationFeeEntries({
        groupRef: app.id, userId: app.userId, amount: -amount,
        vatAmount: -vatReversed,
        description: `Agent registration fee refunded · ${ref}`,
        source: fundingSource,
      })).catch(() => {});
    }

    // ⭐ NOW the row is refunded — after the money, never before it.
    await db.agentApplication.update(app.id, { feeDisposition: "REFUNDED", feeRefundedAt: now, feeRefundedById: officerId, feeRefundReference: ref, feeRefundAmountTzs: amount });
    audit({ category: "COMPLIANCE", action: "agent.fee.refunded", actorId: officerId, targetType: "AgentApplication", targetId: app.id, payload: { amountTzs: amount, reference: ref, rejectedBy: app.reviewerId, destination: app.feeSourceAccount, vatReversedTzs: vatReversed, vatSource: bookedVat === null ? "computed-from-config" : "ledger" } });
    notifyAgentFeeRefunded(app.userId, { amountTzs: amount, reference: ref });
    sendEmailToUser(app.userId, (email) => ({ to: email, subject: `Your agent registration fee has been refunded · ${formatTzs(amount)}`, html: agentFeeRefundedHtml({ amountTzs: amount, reference: ref, destinationMasked: app.feeSourceAccount }), tag: "agent-fee-refunded" })).catch(() => {});
    return { ok: true as const };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  OFFICER — decisions
// ═══════════════════════════════════════════════════════════════════════════

/** Ask for a clearer copy of specific documents. UNDER_REVIEW → ADDITIONAL_INFO_REQUIRED, with
 *  the rejected slots marked so only those become actionable for the applicant. */
export async function requestMoreInfo(officerId: string, applicationId: string, input: { note: string; slots: AgentDocType[] }): Promise<ServiceResult> {
  const note = (input.note ?? "").trim().slice(0, 500);
  if (note.length < 5) return { ok: false, error: "Tell the applicant what is needed (at least 5 characters).", code: "INVALID" };
  const slots = (input.slots ?? []).filter((s) => ALL_DOC_SLOTS.includes(s));
  return withLock(`agent:${applicationId}`, async () => {
    const o = await officerLoads(officerId, applicationId);
    if (!o.ok) return { ok: false as const, error: o.error, code: o.code };
    const { app } = o;
    if (app.status !== "UNDER_REVIEW") return { ok: false as const, error: "Only an application under review can be sent back.", code: "INVALID" as const };
    const now = iso();
    for (const d of await db.agentApplicationDoc.listByApplication(app.id)) {
      if (slots.includes(d.docType)) await db.agentApplicationDoc.update(d.id, { rejected: true, rejectReason: note });
    }
    await db.agentApplication.update(app.id, { status: "ADDITIONAL_INFO_REQUIRED", infoRequestNote: note, infoRequestedAt: now, reviewerId: officerId, reviewedAt: now, expiresAt: new Date(Date.now() + getAgentConfig().draftExpiryDays * DAY_MS).toISOString() });
    audit({ category: "COMPLIANCE", action: "agent.application.info_requested", actorId: officerId, targetType: "AgentApplication", targetId: app.id, payload: { slots, note } });
    notifyAgentInfoRequested(app.userId, { note });
    sendEmailToUser(app.userId, (email) => ({ to: email, subject: "Your agent application needs one more thing", html: agentInfoRequestedHtml({ reason: note, reference: app.id }), tag: "agent-info-requested" })).catch(() => {});
    return { ok: true as const };
  });
}

/**
 * Reject. If a fee was collected it becomes REFUND_DUE with a deadline, and the same row lands
 * on the refunds-owed worklist — reject and refund share ONE worklist, or TZS 100,000 sits
 * owed with nothing tracking it. Referee ID scans are destroyed immediately: we never had a
 * relationship with those people under which to keep them.
 */
export async function rejectApplication(officerId: string, applicationId: string, input: { reason: AgentRejectReason; note?: string }): Promise<ServiceResult> {
  const note = (input.note ?? "").trim().slice(0, 500);
  if (input.reason === "OTHER" && note.length < 5) return { ok: false, error: "A reason of at least 5 characters is required.", code: "INVALID" };
  return withLock(`agent:${applicationId}`, async () => {
    const o = await officerLoads(officerId, applicationId);
    if (!o.ok) return { ok: false as const, error: o.error, code: o.code };
    const { app } = o;
    if (!DECIDABLE.includes(app.status)) { const word = AGENT_STATUS[app.status].en; return { ok: false as const, error: `An application marked "${word}" cannot be rejected.`, code: "INVALID" as const }; }
    const cfg = getAgentConfig();
    const now = iso();
    const refundDue = app.feeDisposition === "COLLECTED";
    await db.agentApplication.update(app.id, {
      status: "REJECTED", reviewerId: officerId, reviewedAt: now, rejectReason: input.reason, rejectNote: note || null,
      ...(refundDue ? { feeDisposition: "REFUND_DUE" as const, feeRefundDueAt: new Date(Date.now() + cfg.refundDeadlineDays * DAY_MS).toISOString() } : {}),
    });
    const purged = await purgeThirdPartyDocuments(app.id);
    audit({ category: "COMPLIANCE", action: "agent.application.rejected", actorId: officerId, targetType: "AgentApplication", targetId: app.id, payload: { reason: input.reason, note, refundDue, refereeDocsPurged: purged, terminal: TERMINAL_REJECT_REASONS.includes(input.reason) } });
    const terminal = TERMINAL_REJECT_REASONS.includes(input.reason);
    notifyAgentRejected(app.userId, { refundDue, amountTzs: app.feeAmountTzs, reason: input.reason });
    sendEmailToUser(app.userId, (email) => ({
      to: email, subject: "Your agent application was not approved",
      html: agentRejectedHtml({ reason: input.reason, note: note || null, refundDue, amountTzs: app.feeAmountTzs, refundDays: cfg.refundDeadlineDays, reapplyDays: terminal ? null : cfg.reapplyCooldownDays }),
      tag: "agent-rejected",
    })).catch(() => {});
    return { ok: true as const };
  });
}

/** Destroy the referee scans of an application now, keeping the rows as tombstones. */
async function purgeThirdPartyDocuments(applicationId: string): Promise<number> {
  let n = 0;
  for (const d of await db.agentApplicationDoc.listByApplication(applicationId)) {
    if (!d.thirdParty || d.purgedAt) continue;
    const gone = await deleteKycDocument(d.storageKey);
    if (gone) { await db.agentApplicationDoc.update(d.id, { purgedAt: iso() }); n++; }
  }
  return n;
}

/**
 * ⭐ APPROVE — THE ONLY WRITER OF `UserRole.AGENT`.
 *
 * Preconditions, each its own refusal with its own audit so the officer's screen can say WHY a
 * button is disabled rather than "cannot approve":
 *   · not the officer's own application (self-review);
 *   · UNDER_REVIEW — ⛔ never INVITED (the invitee has not accepted), never ADDITIONAL_INFO_REQUIRED
 *     (something is outstanding), never twice;
 *   · on an OFFICER_INVITED application, the invitation is ACCEPTED — the second party;
 *   · the applicant is not staff (approving would strip their admin access);
 *   · not already an agent;
 *   · KYC: self-service → APPROVED already; invited → PENDING_REVIEW or APPROVED, and a
 *     PENDING_REVIEW one is decided HERE through the ordinary KYC service — one review, two
 *     records — ⛔ never flagged approved without real identity documents;
 *   · the fee is RESOLVED: COLLECTED or WAIVED, never NONE;
 *   · the rate is within (0, cfg.maxCommissionPct].
 * Then, atomically under the agent lock: mint the `50PICK-AG-` code, UPDATE the affiliate row
 * (never create — one exists with a player code), set the role, mark the application, revoke
 * sessions (the role rides in the cookie), audit, notify in-app and by email.
 */
export async function approveAgent(officerId: string, applicationId: string, input: { commissionPct: number }): Promise<ServiceResult<{ agentCode: string; commissionPct: number }>> {
  const cfg = getAgentConfig();
  const pct = Number(input.commissionPct);
  if (!Number.isFinite(pct) || pct <= 0 || pct > cfg.maxCommissionPct) {
    return { ok: false, error: `The commission rate must be above 0% and no more than ${cfg.maxCommissionPct}%.`, code: "INVALID" };
  }
  const rate = Math.round(pct * 100) / 100;
  return withLock(`agent:${applicationId}`, async () => {
    const o = await officerLoads(officerId, applicationId);
    if (!o.ok) return { ok: false as const, error: o.error, code: o.code };
    const { app, applicant } = o;
    const refuse = (why: string, error: string) => {
      audit({ category: "COMPLIANCE", action: "agent.approve.refused", actorId: officerId, targetType: "AgentApplication", targetId: app.id, payload: { why } });
      return { ok: false as const, error, code: "INVALID" as const };
    };
    if (app.status === "INVITED") return refuse("not_accepted", "The invitee has not accepted the invitation yet.");
    if (app.status === "APPROVED") return refuse("already_approved", "This application is already approved.");
    if (app.status !== "UNDER_REVIEW") return refuse(`status_${app.status}`, `An application marked "${AGENT_STATUS[app.status].en}" cannot be approved.`);
    if (app.source === "OFFICER_INVITED") {
      const inv = (await db.agentInvitation.list()).find((i) => i.applicationId === app.id);
      if (!inv || inv.status !== "ACCEPTED") return refuse("invitation_not_accepted", "The invitation has not been accepted by the invitee.");
    }
    if (isStaffRole(applicant.role)) return refuse("staff", "A staff account cannot be made an agent — reject it as a staff conflict.");
    const acct = await ensureAffiliateAccount(app.userId);
    if (isApprovedAgent(acct)) return refuse("already_agent", "This person is already an approved agent.");
    if (applicant.status !== "ACTIVE") return refuse(`account_${applicant.status}`, "The applicant's account is not active.");
    if (app.feeDisposition !== "COLLECTED" && app.feeDisposition !== "WAIVED") return refuse("fee_unresolved", "Reconcile the fee, or waive it with a reason, before approving.");
    // KYC — the platform's ordinary identity verification, decided by the ordinary service.
    const kyc = await getKycStatus(app.userId);
    if (!kyc) return refuse("kyc_missing", "The applicant has not verified their identity.");
    if (kyc.status === "PENDING_REVIEW" && app.source === "OFFICER_INVITED") {
      const r = await reviewKyc({ officerId, userId: app.userId, decision: "APPROVE" });
      if (!r.ok) return refuse("kyc_review_failed", `Identity could not be approved: ${r.error}`);
    } else if (kyc.status !== "APPROVED") {
      return refuse(`kyc_${kyc.status}`, "The applicant's identity verification is not approved.");
    }

    // Mint the code — unique, retried.
    let code = mintAgentCode();
    let guard = 0;
    while (await db.affiliate.findByCode(code)) { code = mintAgentCode(); if (++guard > 20) return refuse("code_mint", "Could not mint a unique agent code — try again."); }
    const now = iso();
    // ⛔ UPDATE, never create: the row exists with a player-format code, and memory `create`
    // would silently overwrite its counters while Prisma would throw P2002.
    const updated = await db.affiliate.update(app.userId, { code, approvedAt: now, approvedBy: officerId, commissionPct: rate, active: true, deactivatedAt: null });
    if (!updated || !updated.approvedAt || updated.commissionPct !== rate) {
      // A null here is a HARD failure — it is exactly the silent production no-op this
      // programme was built to close, and proceeding would mint an agent with no rate.
      audit({ category: "SECURITY", action: "agent.approve.write_failed", actorId: officerId, targetType: "AgentApplication", targetId: app.id, payload: { userId: app.userId } });
      return { ok: false as const, error: "The agent record could not be written. Nothing was changed.", code: "INVALID" as const };
    }
    await db.user.update(app.userId, { role: "AGENT", roleChangedAt: now, roleChangedBy: officerId } as Partial<StoredUser>);
    await db.agentApplication.update(app.id, { status: "APPROVED", reviewerId: officerId, reviewedAt: now, approvedRatePct: rate, agentCode: code, expiresAt: null });
    // The role rides in the signed session cookie — without this the new agent sees nothing
    // until they happen to sign in again.
    await revokeUserSessions(app.userId).catch(() => {});
    audit({ category: "COMPLIANCE", action: "agent.approved", actorId: officerId, targetType: "User", targetId: app.userId, payload: { applicationId: app.id, agentCode: code, commissionPct: rate, feeDisposition: app.feeDisposition, source: app.source } });
    notifyAgentApproved(app.userId, { agentCode: code, commissionPct: rate });
    sendEmailToUser(app.userId, (email) => ({ to: email, subject: "You are now a Verified 50pick Agent", html: agentApprovedHtml({ agentCode: code, commissionPct: rate, windowMonths: cfg.commissionWindowMonths }), tag: "agent-approved" })).catch(() => {});
    return { ok: true as const, data: { agentCode: code, commissionPct: rate } };
  });
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function mintAgentCode(): string {
  const hex = randomId(16);
  let id = "";
  for (let i = 0; i + 1 < hex.length && id.length < 6; i += 2) id += CODE_ALPHABET[parseInt(hex.slice(i, i + 2), 16) % CODE_ALPHABET.length];
  return AGENT_CODE_PREFIX + id;
}

// ═══════════════════════════════════════════════════════════════════════════
//  OFFICER — standing
// ═══════════════════════════════════════════════════════════════════════════

/** Change an agent's rate. Validated against the config ceiling; the new rate prices only
 *  FUTURE accruals — every row carries the rate that priced it. */
export async function setAgentRate(officerId: string, userId: string, commissionPct: number, reason: string): Promise<ServiceResult> {
  const cfg = getAgentConfig();
  const pct = Math.round(Number(commissionPct) * 100) / 100;
  if (!Number.isFinite(pct) || pct <= 0 || pct > cfg.maxCommissionPct) return { ok: false, error: `The rate must be above 0% and no more than ${cfg.maxCommissionPct}%.`, code: "INVALID" };
  const clean = (reason ?? "").trim().slice(0, 300);
  if (clean.length < 5) return { ok: false, error: "A reason (≥ 5 characters) is required.", code: "INVALID" };
  if (officerId === userId) return { ok: false, error: "You cannot change your own rate.", code: "INVALID" };
  return withLock(`agent:${userId}`, async () => {
    const acct = await db.affiliate.findByUserId(userId);
    if (!isApprovedAgent(acct)) return { ok: false as const, error: "Not an approved agent.", code: "NOT_FOUND" as const };
    const before = acct!.commissionPct;
    const updated = await db.affiliate.update(userId, { commissionPct: pct });
    if (!updated || updated.commissionPct !== pct) return { ok: false as const, error: "The rate could not be written.", code: "INVALID" as const };
    audit({ category: "COMPLIANCE", action: "agent.rate.changed", actorId: officerId, targetType: "User", targetId: userId, payload: { before, after: pct, reason: clean } });
    // ⭐ The agent terms promise notice of a rate change; a change with no message is a broken
    // promise (four-lens review, 2026-09-07). Prospective only — every accrual keeps its own rate.
    notifyAgentRateChanged(userId, { beforePct: before, afterPct: pct });
    sendEmailToUser(userId, (email) => ({ to: email, subject: `Your 50pick commission rate is now ${pct}%`, html: agentRateChangedHtml({ beforePct: before, afterPct: pct }), tag: "agent-rate-changed" })).catch(() => {});
    return { ok: true as const };
  });
}

/** Deactivate — prospective only. New binds refused, accrual stops, every entry point and the
 *  badge go; accruals already PAID stand. Reversible. */
export async function deactivateAgent(officerId: string, userId: string, reason: string): Promise<ServiceResult> {
  const clean = (reason ?? "").trim().slice(0, 300);
  if (clean.length < 5) return { ok: false, error: "A reason (≥ 5 characters) is required.", code: "INVALID" };
  if (officerId === userId) return { ok: false, error: "You cannot deactivate yourself.", code: "INVALID" };
  return withLock(`agent:${userId}`, async () => {
    const acct = await db.affiliate.findByUserId(userId);
    if (!isApprovedAgent(acct)) return { ok: false as const, error: "Not an approved agent.", code: "NOT_FOUND" as const };
    if (!acct!.active) return { ok: false as const, error: "Already deactivated.", code: "INVALID" as const };
    const updated = await db.affiliate.update(userId, { active: false, deactivatedAt: iso() });
    if (!updated || updated.active) return { ok: false as const, error: "The change could not be written.", code: "INVALID" as const };
    await revokeUserSessions(userId).catch(() => {});
    audit({ category: "COMPLIANCE", action: "agent.deactivated", actorId: officerId, targetType: "User", targetId: userId, payload: { reason: clean } });
    notifyAgentDeactivated(userId);
    sendEmailToUser(userId, (email) => ({ to: email, subject: "Your 50pick agent account has been paused", html: agentDeactivatedHtml(), tag: "agent-deactivated" })).catch(() => {});
    return { ok: true as const };
  });
}

/** Reactivate. ⛔ Does NOT restamp `approvedAt` — that would be the second discriminator the
 *  resolver refuses to read, and a restamp is exactly how it would delete an agent's book. */
export async function reactivateAgent(officerId: string, userId: string, reason: string): Promise<ServiceResult> {
  const clean = (reason ?? "").trim().slice(0, 300);
  if (clean.length < 5) return { ok: false, error: "A reason (≥ 5 characters) is required.", code: "INVALID" };
  return withLock(`agent:${userId}`, async () => {
    const acct = await db.affiliate.findByUserId(userId);
    if (!isApprovedAgent(acct)) return { ok: false as const, error: "Not an approved agent.", code: "NOT_FOUND" as const };
    if (acct!.active) return { ok: false as const, error: "Already active.", code: "INVALID" as const };
    const user = await db.user.findById(userId);
    if (!user || agentStandingFor(user, { ...acct!, active: true }).ok === false) return { ok: false as const, error: "The account's status does not allow reactivation.", code: "INVALID" as const };
    const updated = await db.affiliate.update(userId, { active: true, deactivatedAt: null });
    if (!updated || !updated.active) return { ok: false as const, error: "The change could not be written.", code: "INVALID" as const };
    audit({ category: "COMPLIANCE", action: "agent.reactivated", actorId: officerId, targetType: "User", targetId: userId, payload: { reason: clean } });
    return { ok: true as const };
  });
}

/** End the partnership. The application becomes REVOKED (terminal, and it frees the partial
 *  index so the person may apply again later), role returns to PLAYER, sessions are revoked. */
export async function revokeAgent(officerId: string, userId: string, reason: string): Promise<ServiceResult> {
  const clean = (reason ?? "").trim().slice(0, 300);
  if (clean.length < 10) return { ok: false, error: "A reason (≥ 10 characters) is required to end a partnership.", code: "INVALID" };
  if (officerId === userId) return { ok: false, error: "You cannot revoke yourself.", code: "INVALID" };
  return withLock(`agent:${userId}`, async () => {
    const acct = await db.affiliate.findByUserId(userId);
    if (!isApprovedAgent(acct)) return { ok: false as const, error: "Not an approved agent.", code: "NOT_FOUND" as const };
    const now = iso();
    const updated = await db.affiliate.update(userId, { active: false, deactivatedAt: now, approvedAt: null, approvedBy: null, commissionPct: null });
    if (!updated || updated.approvedAt) return { ok: false as const, error: "The change could not be written.", code: "INVALID" as const };
    await db.user.update(userId, { role: "PLAYER", roleChangedAt: now, roleChangedBy: officerId } as Partial<StoredUser>);
    const app = (await db.agentApplication.listByUser(userId)).find((a) => a.status === "APPROVED");
    if (app) await db.agentApplication.update(app.id, { status: "REVOKED", rejectNote: clean, reviewedAt: now, reviewerId: officerId });
    await revokeUserSessions(userId).catch(() => {});
    audit({ category: "COMPLIANCE", action: "agent.revoked", actorId: officerId, targetType: "User", targetId: userId, payload: { reason: clean, applicationId: app?.id ?? null } });
    // ⭐ Its OWN notice and email. This used to send the "paused" bell, whose link is the agent
    // dashboard — a page a revoked (now PLAYER) account cannot open (four-lens review, 2026-09-07).
    const reapplyAt = new Date(Date.now() + getAgentConfig().reapplyCooldownDays * DAY_MS).toISOString();
    notifyAgentRevoked(userId, { reapplyAt });
    sendEmailToUser(userId, (email) => ({ to: email, subject: "Your 50pick agent partnership has ended", html: agentRevokedHtml({ reapplyAt }), tag: "agent-revoked" })).catch(() => {});
    return { ok: true as const };
  });
}

/** Settle a PENDING accrual out of band (the excluded / cooling-off agent's payable). No wallet
 *  credit — the money left through a bank transfer the officer references here. */
export async function settlePayable(officerId: string, rewardId: string, reference: string): Promise<ServiceResult> {
  const ref = (reference ?? "").trim().slice(0, 80);
  if (ref.length < 3) return { ok: false, error: "Enter the settlement reference.", code: "INVALID" };
  const rows = await db.referralReward.list(5000);
  const row = rows.find((r) => r.id === rewardId);
  if (!row) return { ok: false, error: "Accrual not found.", code: "NOT_FOUND" };
  if (row.status !== "PENDING" || row.programme !== "AGENT") return { ok: false, error: "Only a pending agent accrual can be settled.", code: "INVALID" };
  if (officerId === row.referrerUserId) return { ok: false, error: "You cannot settle your own accrual.", code: "INVALID" };
  return withLock(`referral:commission:${row.referrerUserId}:${row.recruitUserId}`, async () => {
    const fresh = (await db.referralReward.listByReferrer(row.referrerUserId)).find((r) => r.id === rewardId);
    if (!fresh || fresh.status !== "PENDING") return { ok: false as const, error: "Already settled.", code: "INVALID" as const };
    await db.referralReward.update(rewardId, { status: "PAID", note: `settled out of band · ${ref}` });
    await db.affiliate.incrementEarned(row.referrerUserId, row.amountTzs);
    audit({ category: "COMPLIANCE", action: "agent.payable.settled", actorId: officerId, targetType: "ReferralReward", targetId: rewardId, payload: { referrerUserId: row.referrerUserId, amountTzs: row.amountTzs, reference: ref } });
    return { ok: true as const };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  OFFICER — invitation
// ═══════════════════════════════════════════════════════════════════════════

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const INVITE_OTP_PURPOSE = "agent_invite" as const;
const OTP_TTL_MS = 5 * 60 * 1000;

/**
 * Propose the programme to a phone number. Refused at ISSUE (not at acceptance): the number
 * already belongs to an agent, to staff, or to a self-excluded person; or a live invitation
 * already stands for it. The token is returned ONCE and stored only as a hash.
 */
/**
 * ⭐ ISSUE AN INVITATION, BY EMAIL.
 *
 * 🔴 WHY IT IS EMAIL AND NOT SMS. The programme shipped inviting by phone, and the officer's
 * console said "A text with the link is on its way". It was not: `src/lib/server/sms.ts`
 * defaults to the `console` provider, Beem and Africa's Talking are declared stubs that
 * THROW, and the Selcom adapter's body is written against an unsigned contract. In production
 * `sms.ts` logged "console provider active in PRODUCTION … NOT delivered" while the console
 * promised delivery and the applicant's own status page said the link "was texted to your
 * number". Three surfaces asserting a delivery that could not happen.
 *
 * ⭐ POSTMARK IS LIVE AND CARRIES EVERY OTHER TRANSACTIONAL MAIL ON THE PLATFORM, so the
 * invitation now goes there — and `sendEmail` returns a `reason` (`sent` · `stub` ·
 * `no-address` · `suppressed` · `failed`) which this function READS and reports, because a
 * caller that makes a promise to a person must read it (`email.ts:107`).
 *
 * ⛔ AND THE ADDRESS IS THE SECURITY BOUNDARY, NOT A CONVENIENCE. Acceptance requires a code
 * delivered to THIS mailbox and a signed-in account whose own email matches it — the same
 * two-party control the phone binding gave. A forwarded link is worthless either way.
 */
export async function issueInvitation(officerId: string, input: { email: string; displayName?: string }): Promise<ServiceResult<{ invitationId: string; token: string; expiresAt: string; link: string; delivery: SendResult["reason"] }>> {
  const email = (input.email ?? "").trim().toLowerCase();
  // ⛔ A SHAPE CHECK, NOT A VALIDATION OF EXISTENCE. It refuses the typo classes an officer
  // actually makes (no @, no dot, a trailing comma, whitespace inside) and nothing more:
  // there is no way to know from here whether a well-formed address is real, and the
  // delivery `reason` below is what actually answers that.
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(email) || email.length > 254) {
    return fieldFailure("email", "Enter the applicant's email address — for example agent@example.com.");
  }
  const cfg = getAgentConfig();
  if (!cfg.enabled) return { ok: false, error: "The agent programme is switched off.", code: "INVALID" };
  const existing = await db.user.findByEmail(email);
  if (existing) {
    if (existing.id === officerId) return fieldFailure("email", "You cannot invite yourself.");
    if (isStaffRole(existing.role)) return fieldFailure("email", "That address belongs to a staff account.");
    if (isApprovedAgent(await db.affiliate.findByUserId(existing.id))) return fieldFailure("email", "That person is already an agent.");
    if (existing.status === "SELF_EXCLUDED" || existing.status === "CLOSED" || existing.status === "SUSPENDED") return fieldFailure("email", `That account is ${existing.status.toLowerCase().replace("_", "-")}.`);
    if ((await selfExclusionStanding(existing.id)).state !== "none") return fieldFailure("email", "That person has a self-exclusion on record.");
    if (await db.agentApplication.findActiveByUser(existing.id)) return fieldFailure("email", "That person already has a live application.");
  }
  if (await db.agentInvitation.findLiveByEmail(email)) return fieldFailure("email", "A live invitation already stands for that address — withdraw it first.");
  const token = randomId(24);
  const now = iso();
  const expiresAt = new Date(Date.now() + cfg.invitationExpiryDays * DAY_MS).toISOString();
  const inv = await db.agentInvitation.create({
    id: `agi_${randomId(10)}`, applicationId: null, phoneE164: null, email, displayName: (input.displayName ?? "").trim().slice(0, 80) || null,
    tokenHash: tokenHash(token), status: "ISSUED", issuedById: officerId, issuedAt: now, expiresAt,
    acceptedAt: null, acceptedUserId: null, declinedAt: null, revokedAt: null, revokedById: null, createdAt: now, updatedAt: now,
  });
  // If the person already has an account, open the application in INVITED now, so the
  // lifecycle row exists and `startApplication` tells them to accept first.
  if (existing) {
    const app = await db.agentApplication.create({
      id: `agp_${randomId(10)}`, userId: existing.id, status: "INVITED", source: "OFFICER_INVITED",
      refereeOneName: null, refereeOneContact: null, refereeTwoName: null, refereeTwoContact: null, refereeConsentAt: null,
      feeAmountTzs: null, feeAttestedTzs: null, feeFundingSource: null, feeReference: null, feeStatementRef: null, feeReconciledAt: null, feeReconciledById: null, feeSourceAccount: null,
      feeWaivedAt: null, feeWaivedById: null, feeWaiverReason: null, feeDisposition: "NONE", feeRefundDueAt: null, feeRefundedAt: null, feeRefundedById: null, feeRefundReference: null, feeRefundAmountTzs: null,
      reviewerId: null, reviewedAt: null, rejectReason: null, rejectNote: null, infoRequestNote: null, infoRequestedAt: null,
      approvedRatePct: null, agentCode: null, acceptedTermsVersion: null, acceptedTermsAt: null, submittedAt: null, expiresAt, createdAt: now, updatedAt: now,
    });
    await db.agentInvitation.update(inv.id, { applicationId: app.id });
  }
  const link = `${appUrl()}/agent/invite/${token}`;
  /**
   * ⭐ AWAITED, AND ITS `reason` IS RETURNED. Every other mail on this platform is
   * fire-and-forget, correctly — a receipt that fails to send must not fail the payment. This
   * one is the opposite: the mail IS the invitation, and the officer is about to be told
   * something about it. `email.ts` states the rule outright — "callers that make a PROMISE to
   * the player must read it" — so the console reports what actually happened instead of
   * asserting delivery the way the SMS copy did.
   *
   * ⛔ `sendEmail` DIRECTLY, NOT `sendEmailToUser`. The invitee may have no 50pick account
   * yet, which is the whole point of an officer-issued invitation; `sendEmailToUser` looks up
   * a userId and would silently skip exactly the people this feature exists for.
   */
  const delivery = await sendEmail({
    to: email,
    subject: "You are invited to become a Verified 50pick Agent",
    html: agentInvitationHtml({ link, expiresAt, feeWaivable: true, feeTzs: feeBreakdown(cfg).totalTzs }),
    tag: "agent-invitation",
    // ⛔ Postmark's click-tracking redirect would rewrite the one-time token link. The same
    // reason the KYC deep link opts out.
    trackLinks: false,
  });
  audit({ category: "COMPLIANCE", action: "agent.invitation.issued", actorId: officerId, targetType: "AgentInvitation", targetId: inv.id, payload: { email: maskEmailForAudit(email), expiresAt, existingUser: !!existing, delivery: delivery.reason } });
  return { ok: true, data: { invitationId: inv.id, token, expiresAt, link, delivery: delivery.reason } };
}

export async function revokeInvitation(officerId: string, invitationId: string, reason: string): Promise<ServiceResult> {
  const inv = await db.agentInvitation.findById(invitationId);
  if (!inv) return { ok: false, error: "Invitation not found.", code: "NOT_FOUND" };
  if (inv.status !== "ISSUED") return { ok: false, error: `Invitation is ${inv.status.toLowerCase()}.`, code: "INVALID" };
  const now = iso();
  await db.agentInvitation.update(inv.id, { status: "REVOKED", revokedAt: now, revokedById: officerId });
  if (inv.applicationId) await db.agentApplication.update(inv.applicationId, { status: "DECLINED", rejectNote: `invitation revoked: ${(reason ?? "").trim().slice(0, 200)}` });
  audit({ category: "COMPLIANCE", action: "agent.invitation.revoked", actorId: officerId, targetType: "AgentInvitation", targetId: inv.id, payload: { reason: (reason ?? "").trim().slice(0, 200) } });
  return { ok: true };
}

/** What an invite link shows before anyone proves anything: the MASKED address it was sent
 *  to, the channel, the expiry, whether it is still live. ⛔ Never the full address — this
 *  page is readable by anyone holding the link. */
export async function invitationPreview(
  token: string,
  /** ⭐ Optional. When the reader is signed in, pass them so the identity match is decided
   *  against the REAL address rather than by string-matching the mask on the page. */
  viewer?: Pick<StoredUser, "email" | "phoneE164"> | null,
): Promise<{ ok: true; invitationId: string; channel: InvitationChannel["kind"]; addressMasked: string; displayName: string | null; expiresAt: string; status: StoredAgentInvitation["status"]; viewerMatches: boolean } | { ok: false; reason: "invalid" | "expired" | "revoked" | "used" | "declined" }> {
  const inv = await db.agentInvitation.findByTokenHash(tokenHash((token ?? "").trim()));
  if (!inv) return { ok: false, reason: "invalid" };
  if (inv.status === "REVOKED") return { ok: false, reason: "revoked" };
  if (inv.status === "ACCEPTED") return { ok: false, reason: "used" };
  if (inv.status === "DECLINED") return { ok: false, reason: "declined" };
  if (inv.status === "EXPIRED" || new Date(inv.expiresAt).getTime() < Date.now()) {
    if (inv.status !== "EXPIRED") await expireInvitation(inv);
    return { ok: false, reason: "expired" };
  }
  const ch = invitationChannel(inv);
  if (!ch) return { ok: false, reason: "invalid" };
  /**
   * 🔴 THE MATCH IS DECIDED HERE, ON THE REAL ADDRESS — not on the page, against the MASK.
   *
   * `/agent/invite/[token]` used to compute it by string-matching the masked value:
   *   `preview.phoneMasked.endsWith(viewer.phoneE164.slice(-3)) && …startsWith(…)`
   * Two different numbers sharing a country code and their last three digits therefore
   * "matched", and any change to the mask's punctuation silently broke it. It is one
   * comparison, and it belongs where the unmasked address is — which is here.
   *
   * ⛔ The boolean is all that leaves. The address itself never does.
   */
  const viewerMatches = viewer
    ? (ch.kind === "EMAIL"
        ? (viewer.email ?? "").trim().toLowerCase() === ch.address.toLowerCase()
        : viewer.phoneE164 === ch.address)
    : false;
  return { ok: true, invitationId: inv.id, channel: ch.kind, addressMasked: maskChannel(ch), displayName: inv.displayName, expiresAt: inv.expiresAt, status: inv.status, viewerMatches };
}

async function expireInvitation(inv: StoredAgentInvitation): Promise<void> {
  await db.agentInvitation.update(inv.id, { status: "EXPIRED" });
  if (inv.applicationId) await db.agentApplication.update(inv.applicationId, { status: "EXPIRED" });
  audit({ category: "SYSTEM", action: "agent.invitation.expired", actorId: null, targetType: "AgentInvitation", targetId: inv.id });
}

/** Send the OTP to the phone the invitation is BOUND to. The invitee proves possession of THAT
 *  number, not of the link — a forwarded link is worthless. */
/**
 * ⭐ THE ONE PLACE THAT DECIDES WHICH ADDRESS AN INVITATION IS BOUND TO.
 *
 * Invitations issued before 2026-09-08 carry a phone; every one since carries an email. Both
 * must stay acceptable — the programme went live on 2026-09-07 and an applicant holding a
 * day-old link has done nothing wrong. ⛔ So the two eras are not two code paths: every
 * caller asks this, and the OTP, the delivery, the mask and the identity check all follow the
 * channel it returns. Inventing an email for a phone row to "unify" them would fabricate the
 * exact fact the acceptance check is built on.
 */
export type InvitationChannel =
  | { kind: "EMAIL"; address: string }
  | { kind: "PHONE"; address: string };

export function invitationChannel(inv: Pick<StoredAgentInvitation, "email" | "phoneE164">): InvitationChannel | null {
  if (inv.email && inv.email.trim()) return { kind: "EMAIL", address: inv.email.trim() };
  if (inv.phoneE164 && inv.phoneE164.trim()) return { kind: "PHONE", address: inv.phoneE164.trim() };
  // ⛔ Never a fallback. A row with neither address cannot prove anything about anybody, so
  // the callers refuse rather than accept on a token alone.
  return null;
}

/** The address, masked for display and for an audit row. Never the whole thing. */
export function maskChannel(ch: InvitationChannel): string {
  if (ch.kind === "PHONE") {
    const digits = ch.address.replace(/\D/g, "");
    return `+${digits.slice(0, 3)} ••• ••• ${digits.slice(-3)}`;
  }
  return maskEmailForAudit(ch.address);
}

/**
 * ⚠️ A MASK THAT SHOWS THE FIRST CHARACTER AND THE WHOLE DOMAIN — `a•••@gmail.com`.
 *
 * ⛔ Not a full address: this is rendered on a page anyone holding the link can open, and the
 * platform masks every logged address under PDPA 2022 (`email.ts` → `maskEmail`).
 * ⭐ But the DOMAIN stays, because the mask has a job: the invitee has to recognise their own
 * mailbox to know whether to sign in with a different account. A mask that hides everything
 * makes the mismatch branch unreadable, which is how that branch became a dead end.
 */
export function maskEmailForAudit(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "•••";
  return `${email[0]}•••${email.slice(at)}`;
}

export async function requestInvitationOtp(token: string): Promise<ServiceResult<{ expiresAt: string; delivery: SendResult["reason"]; deliverable: boolean }>> {
  const p = await invitationPreview(token);
  if (!p.ok) return { ok: false, error: "This invitation is no longer valid.", code: "INVALID" };
  const inv = (await db.agentInvitation.findById(p.invitationId))!;
  const ch = invitationChannel(inv);
  if (!ch) return { ok: false, error: "This invitation is no longer valid.", code: "INVALID" };
  /**
   * ⛔ A PHONE-ERA INVITATION CANNOT BE SENT A CODE, AND SAYS SO PLAINLY. There is no
   * licensed SMS provider, so offering to "text me a code" would arm a button that cannot
   * deliver — the defect this whole change exists to remove. The honest answer names the
   * remedy: an officer withdraws it and issues a new one by email.
   */
  if (ch.kind === "PHONE") {
    return { ok: false, error: "This invitation was sent by text, and we can no longer deliver codes that way. Ask the officer who invited you to withdraw it and send a new invitation to your email address.", code: "INVALID" };
  }
  const code = generateOtp();
  const salt = randomId(8);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  await db.otp.create({ id: `otp_${randomId(12)}`, phoneE164: null, email: ch.address, hashedCode: await hashOtp(code, salt), salt, purpose: INVITE_OTP_PURPOSE, attempts: 0, consumedAt: null, expiresAt, createdAt: iso() });
  // ⭐ AWAITED and its reason returned, for the same reason the invitation mail is: the page
  // is about to tell the invitee a code is in their inbox.
  const delivery = await sendEmail({
    to: ch.address,
    subject: "Your 50pick agent invitation code",
    html: agentInviteOtpHtml({ code, minutes: Math.round(OTP_TTL_MS / 60_000) }),
    tag: "agent-invite-otp",
    trackLinks: false,
  });
  audit({ category: "AUTH", action: "otp.agent_invite.sent", actorId: null, targetType: "Email", targetId: maskEmailForAudit(ch.address), payload: { invitationId: inv.id, delivery: delivery.reason } });
  /**
   * ⭐ TWO FACTS, TWO FIELDS. `delivery` is what the provider actually said — it goes to the
   * audit row and to an officer diagnosing a failure. `deliverable` is the only thing the
   * INVITEE'S screen needs: may it open a code box, or is that a dead end?
   *
   * ⛔ A `stub` send is deliverable ONLY where the outbox is armed, which `stubIsRetrievable`
   * decides and which is false in production whatever the env says. Without this the local
   * end-to-end drive could never read a code — and papering over it by treating every `stub`
   * as sent would have shipped a code box that a misconfigured deployment can never satisfy.
   */
  const deliverable = delivery.reason === "sent" || (delivery.reason === "stub" && stubIsRetrievable());
  return { ok: true, data: { expiresAt, delivery: delivery.reason, deliverable } };
}

/**
 * Accept. Requires (1) a valid, live token, (2) an OTP that was delivered to the bound phone,
 * (3) a signed-in account whose phone IS the bound phone. ⭐ This is the second party.
 */
export async function acceptInvitation(userId: string, token: string, otpCode: string): Promise<ServiceResult<{ applicationId: string }>> {
  const p = await invitationPreview(token);
  if (!p.ok) return { ok: false, error: "This invitation is no longer valid.", code: "INVALID" };
  const inv = (await db.agentInvitation.findById(p.invitationId))!;
  const user = await db.user.findById(userId);
  if (!user) return { ok: false, error: "Sign in first.", code: "INVALID" };
  const ch = invitationChannel(inv);
  if (!ch) return { ok: false, error: "This invitation is no longer valid.", code: "INVALID" };
  /**
   * ⭐ THE SECOND PARTY: the signed-in account must OWN the address the invitation was sent
   * to. This is what makes a forwarded link worthless, and it is unchanged in substance —
   * only the address moved from a phone to a mailbox.
   *
   * ⚠️ CASE-INSENSITIVE ON EMAIL. Addresses are, and an invitee whose account reads
   * `Ali@x.tz` against an invitation typed `ali@x.tz` is the same person; refusing them would
   * be a lockout produced entirely by capitalisation.
   */
  const identityMatches = ch.kind === "EMAIL"
    ? (user.email ?? "").trim().toLowerCase() === ch.address.toLowerCase()
    : user.phoneE164 === ch.address;
  if (!identityMatches) {
    audit({ category: "SECURITY", action: "agent.invitation.identity_mismatch", actorId: userId, targetType: "AgentInvitation", targetId: inv.id, payload: { channel: ch.kind } });
    return {
      ok: false,
      error: ch.kind === "EMAIL"
        ? "This invitation was sent to a different email address. Sign in with the account that uses it."
        : "This invitation was sent to a different phone number.",
      code: "INVALID",
    };
  }
  // OTP — check every active code for the bound ADDRESS + purpose, consume all on match.
  const active = ch.kind === "EMAIL"
    ? await db.otp.findAllActiveByEmail(ch.address, INVITE_OTP_PURPOSE)
    : await db.otp.findAllActive(ch.address, INVITE_OTP_PURPOSE);
  let matched = false;
  for (const o of active) { if (await verifyOtp((otpCode ?? "").trim(), o.salt, o.hashedCode)) { matched = true; break; } }
  if (!matched) {
    // Same discipline as sign-in: the counter lands on the newest code only.
    if (active[0]) await db.otp.incrementAttempts(active[0].id);
    audit({ category: "SECURITY", action: "agent.invitation.otp_failed", actorId: userId, targetType: "AgentInvitation", targetId: inv.id });
    return { ok: false, error: "That code is not right or has expired.", code: "INVALID" };
  }
  // On match, consume EVERY active code for the phone + purpose (SMS delivery order).
  for (const o of active) await db.otp.consume(o.id);
  const elig = await applicantEligibility(userId, { forInvitation: true });
  if (!elig.ok) return refusalResult(elig);
  return withLock(`agentapp:${userId}`, async () => {
    const now = iso();
    const cfg = getAgentConfig();
    let appId = inv.applicationId;
    if (appId) {
      await db.agentApplication.update(appId, { status: "DRAFT", expiresAt: new Date(Date.now() + cfg.draftExpiryDays * DAY_MS).toISOString() });
    } else {
      const app = await db.agentApplication.create({
        id: `agp_${randomId(10)}`, userId, status: "DRAFT", source: "OFFICER_INVITED",
        refereeOneName: null, refereeOneContact: null, refereeTwoName: null, refereeTwoContact: null, refereeConsentAt: null,
        feeAmountTzs: null, feeAttestedTzs: null, feeFundingSource: null, feeReference: null, feeStatementRef: null, feeReconciledAt: null, feeReconciledById: null, feeSourceAccount: null,
        feeWaivedAt: null, feeWaivedById: null, feeWaiverReason: null, feeDisposition: "NONE", feeRefundDueAt: null, feeRefundedAt: null, feeRefundedById: null, feeRefundReference: null, feeRefundAmountTzs: null,
        reviewerId: null, reviewedAt: null, rejectReason: null, rejectNote: null, infoRequestNote: null, infoRequestedAt: null,
        approvedRatePct: null, agentCode: null, acceptedTermsVersion: null, acceptedTermsAt: null, submittedAt: null,
        expiresAt: new Date(Date.now() + cfg.draftExpiryDays * DAY_MS).toISOString(), createdAt: now, updatedAt: now,
      });
      appId = app.id;
    }
    await db.agentInvitation.update(inv.id, { status: "ACCEPTED", acceptedAt: now, acceptedUserId: userId, applicationId: appId });
    audit({ category: "COMPLIANCE", action: "agent.invitation.accepted", actorId: userId, targetType: "AgentInvitation", targetId: inv.id, payload: { applicationId: appId } });
    return { ok: true as const, data: { applicationId: appId! } };
  });
}

export async function declineInvitation(token: string): Promise<ServiceResult> {
  const p = await invitationPreview(token);
  if (!p.ok) return { ok: false, error: "This invitation is no longer valid.", code: "INVALID" };
  const inv = (await db.agentInvitation.findById(p.invitationId))!;
  await db.agentInvitation.update(inv.id, { status: "DECLINED", declinedAt: iso() });
  if (inv.applicationId) await db.agentApplication.update(inv.applicationId, { status: "DECLINED" });
  audit({ category: "COMPLIANCE", action: "agent.invitation.declined", actorId: null, targetType: "AgentInvitation", targetId: inv.id });
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  HOUSEKEEPING — called from the retention chore
// ═══════════════════════════════════════════════════════════════════════════

/** Expire untouched drafts and lapsed invitations; destroy the documents of the expired. */
export async function expireStaleAgentApplications(now = Date.now()): Promise<{ drafts: number; invitations: number; documents: number }> {
  let drafts = 0, invitations = 0, documents = 0;
  for (const a of await db.agentApplication.list()) {
    if (!EDITABLE.includes(a.status) && a.status !== "INVITED") continue;
    if (!a.expiresAt || new Date(a.expiresAt).getTime() > now) continue;
    await db.agentApplication.update(a.id, { status: "EXPIRED" });
    for (const d of await db.agentApplicationDoc.listByApplication(a.id)) {
      if (d.purgedAt) continue;
      if (await deleteKycDocument(d.storageKey)) { await db.agentApplicationDoc.update(d.id, { purgedAt: iso() }); documents++; }
    }
    audit({ category: "SYSTEM", action: "agent.application.expired", actorId: null, targetType: "AgentApplication", targetId: a.id });
    drafts++;
  }
  for (const i of await db.agentInvitation.list()) {
    if (i.status !== "ISSUED" || new Date(i.expiresAt).getTime() > now) continue;
    await expireInvitation(i);
    invitations++;
  }
  return { drafts, invitations, documents };
}

/**
 * Destroy documents that have aged out of their hold, on the clock measured from the
 * DECISION. The application ROW survives — it is the decision record.
 */
export async function purgeAgedAgentDocuments(now = Date.now()): Promise<{ referee: number; applicant: number }> {
  let referee = 0, applicant = 0;
  const apps = new Map((await db.agentApplication.list()).map((a) => [a.id, a] as const));
  for (const d of await db.agentApplicationDoc.listUnpurged()) {
    const a = apps.get(d.applicationId);
    if (!a) continue;
    const decidedAt = a.reviewedAt ?? (a.status === "EXPIRED" || a.status === "DECLINED" ? a.updatedAt : null);
    if (!decidedAt) continue; // still live
    const age = now - new Date(decidedAt).getTime();
    const hold = d.thirdParty
      ? AGENT_REFEREE_DOC_HOLD_DAYS * DAY_MS
      : a.status === "APPROVED" ? AGENT_APPROVED_DOC_HOLD_YEARS * 365 * DAY_MS : AGENT_REJECTED_DOC_HOLD_DAYS * DAY_MS;
    if (age < hold) continue;
    if (await deleteKycDocument(d.storageKey)) {
      await db.agentApplicationDoc.update(d.id, { purgedAt: iso() });
      if (d.thirdParty) referee++; else applicant++;
    }
  }
  return { referee, applicant };
}

/**
 * ERASURE, IMMEDIATE HALF — the words. Referee names and contacts, and every sentence an
 * officer typed, are personal data with no statute behind them; they go the moment erasure
 * runs, ⛔ never gated on the 7-year document hold (a description is not a document — the
 * same rule `erasure.ts` applies to KYC `extraRequests`).
 */
export async function pseudonymiseAgentApplications(userId: string): Promise<number> {
  let n = 0;
  for (const a of await db.agentApplication.listByUser(userId)) {
    const already = a.refereeOneName === "Erased" && a.refereeTwoName === "Erased" && !a.refereeOneContact && !a.refereeTwoContact;
    if (already) continue;
    await db.agentApplication.update(a.id, {
      refereeOneName: a.refereeOneName ? "Erased" : null, refereeTwoName: a.refereeTwoName ? "Erased" : null,
      refereeOneContact: null, refereeTwoContact: null,
      rejectNote: a.rejectNote ? "Erased" : null, infoRequestNote: a.infoRequestNote ? "Erased" : null,
      feeWaiverReason: a.feeWaiverReason ? "Erased" : null, feeStatementRef: a.feeStatementRef ? "Erased" : null,
    });
    n++;
  }
  return n;
}

/**
 * ERASURE, DOCUMENT HALF — the bytes. Runs when `erasure.ts` releases documents (the 7-year
 * CDD hold, which an APPROVED agent's file shares with KYC). ⛔ The row only goes if the bytes
 * went: a failed object KEEPS its `storageKey` so a re-run can retry, exactly as KYC does.
 */
export async function purgeAgentDocumentsForUser(userId: string): Promise<{ deleted: number; failed: number }> {
  let deleted = 0, failed = 0;
  for (const a of await db.agentApplication.listByUser(userId)) {
    for (const d of await db.agentApplicationDoc.listByApplication(a.id)) {
      if (d.purgedAt) continue;
      if (await deleteKycDocument(d.storageKey)) { await db.agentApplicationDoc.update(d.id, { purgedAt: iso() }); deleted++; }
      else failed++;
    }
  }
  return { deleted, failed };
}

export type { StoredAgentApplication, StoredAgentApplicationDocument, StoredAgentInvitation };
