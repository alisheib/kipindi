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
 *  ⭐ The fee NEVER enters the player ledger. It is money from a member of the public, attested
 *    by an officer reading a receipt, and it posts a `LedgerEntry` so the house book, the trial
 *    balance and the tax pack can see it. VAT is split per the config's treatment.
 *  ⛔ NO NUMBER IS A LITERAL. Every amount, window and day count is read from `agent-config`.
 *
 * ── GATE THE OFFER, NEVER THE REFUSAL ───────────────────────────────────────────────────
 * Every refusal that would strand TZS 100,000 — staff, self-excluded, terminal rejection,
 * cool-down, KYC — bites at `startApplication` and on the /agent page's CTA, BEFORE the
 * applicant is told to pay out of band. A refusal that first appears at review routes through
 * the refund path as a rejection, never a silent block.
 */
import { createHash } from "node:crypto";
import { db, type StoredAgentApplication, type StoredAgentApplicationDocument, type StoredAgentInvitation, type AgentDocType, type AgentRejectReason, type StoredUser } from "./store";
import type { ServiceResult } from "./auth-service";
import { audit } from "./audit";
import { randomId, generateOtp, hashOtp, verifyOtp } from "./crypto";
import { withLock } from "./locks";
import { getAgentConfig, type AgentConfig } from "./agent-config";
import { ensureAffiliateAccount, isApprovedAgent, agentStandingFor, AGENT_CODE_PREFIX } from "./affiliate-service";
import { getKycStatus, reviewKyc, validateDocImage } from "./kyc-service";
import { putKycDocument, deleteKycDocument } from "./storage";
import { isStaffRole } from "./roles";
import { isLockedOut, selfExclusionStanding } from "./responsible-gambling";
import { revokeUserSessions } from "./session-registry";
import { postLedgerEntries, agentRegistrationFeeEntries } from "./ledger";
import { sms, otpMessage } from "./sms";
import { appUrl } from "@/lib/app-url";
import { formatTzs } from "@/lib/utils";
import { AGENT_STATUS } from "@/lib/admin-status-lexicon";

/** The audit chain never carries a whole phone number. Same shape as the auth audits. */
const maskPhoneForAudit = (p: string) => (p.length > 6 ? `${p.slice(0, 4)}•••${p.slice(-2)}` : "•••");
import {
  notifyAgentApplicationSubmitted, notifyAgentApproved, notifyAgentRejected, notifyAgentInfoRequested,
  notifyAgentFeeRefunded, notifyAgentDeactivated, notifyAdminAgentReview,
  notifyAgentRevoked, notifyAgentRateChanged,
} from "./notification-service";
import {
  sendEmailToUser, agentApprovedHtml, agentRejectedHtml, agentInfoRequestedHtml, agentFeeRefundedHtml,
  agentApplicationSubmittedAdminHtml, agentInvitationHtml, agentDeactivatedHtml,
  agentRevokedHtml, agentRateChangedHtml,
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

/** What the applicant pays in total, and the VAT component of it, from the config's treatment.
 *  INCLUSIVE keeps the applicant-facing figure exactly the published TZS 100,000. */
export function feeBreakdown(cfg: AgentConfig = getAgentConfig()): { totalTzs: number; vatTzs: number; netTzs: number } {
  const rate = cfg.feeVatRatePct / 100;
  if (cfg.feeVatTreatment === "EXCLUSIVE") {
    const vat = Math.round(cfg.registrationFeeTzs * rate);
    return { totalTzs: cfg.registrationFeeTzs + vat, vatTzs: vat, netTzs: cfg.registrationFeeTzs };
  }
  const vat = Math.round(cfg.registrationFeeTzs * (rate / (1 + rate)));
  return { totalTzs: cfg.registrationFeeTzs, vatTzs: vat, netTzs: cfg.registrationFeeTzs - vat };
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
        feeAmountTzs: null, feeAttestedTzs: null, feeReference: null, feeStatementRef: null,
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

/** DRAFT → KYC_SUBMITTED once all seven are attached; → PAYMENT_PENDING once the fee is
 *  recorded too. Never moves a row out of ADDITIONAL_INFO_REQUIRED (that needs a resubmit). */
async function recomputeDraftStatus(app: StoredAgentApplication): Promise<StoredAgentApplication["status"]> {
  if (app.status === "ADDITIONAL_INFO_REQUIRED") return app.status;
  const docs = (await db.agentApplicationDoc.listByApplication(app.id)).filter((d) => !d.purgedAt);
  const allSeven = REQUIRED_DOC_SLOTS.every((s) => docs.some((d) => d.docType === s));
  const feeRecorded = !!app.feeReference || app.feeDisposition === "WAIVED";
  const next: StoredAgentApplication["status"] = !allSeven ? "DRAFT" : feeRecorded ? "PAYMENT_PENDING" : "KYC_SUBMITTED";
  if (next !== app.status) await db.agentApplication.update(app.id, { status: next });
  return next;
}

/** Referee names + contacts, and the applicant's attestation that each consented. ⛔ The
 *  applicant is the accountable party — we have no relationship with the referee. */
export async function setReferees(
  userId: string,
  input: { oneName: string; oneContact: string; twoName: string; twoContact: string; consent: boolean },
): Promise<ServiceResult> {
  const clean = (s: string) => (s ?? "").trim().slice(0, 120);
  const oneName = clean(input.oneName), twoName = clean(input.twoName);
  const oneContact = clean(input.oneContact), twoContact = clean(input.twoContact);
  if (oneName.length < 2 || twoName.length < 2) return { ok: false, error: "Each referee needs a name.", code: "INVALID" };
  if (oneContact.length < 6 || twoContact.length < 6) return { ok: false, error: "Each referee needs a phone number or email.", code: "INVALID" };
  if (!input.consent) return { ok: false, error: "Confirm that both referees agreed to be named.", code: "INVALID" };
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
export async function recordFeePayment(userId: string, input: { feeReference: string }): Promise<ServiceResult<{ status: StoredAgentApplication["status"] }>> {
  const ref = (input.feeReference ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (ref.length < 4 || ref.length > 64 || !/^[A-Z0-9-]+$/.test(ref)) {
    return { ok: false, error: "Enter the receipt reference exactly as printed (letters, numbers and dashes).", code: "INVALID" };
  }
  return withLock(`agentapp:${userId}`, async () => {
    const e = await editableApplication(userId);
    if (!e.ok) return { ok: false as const, error: e.error, code: e.code };
    const app = e.app;
    const owed = await refundOwedTo(userId);
    if (owed && owed.id !== app.id) return { ok: false as const, error: "A refund from your previous application is still being processed. Wait for it before paying again.", code: "INVALID" as const };
    const receipt = await db.agentApplicationDoc.findSlot(app.id, "FEE_RECEIPT");
    if (!receipt || receipt.purgedAt) return { ok: false as const, error: "Upload the receipt first.", code: "INVALID" as const };
    const holder = await db.agentApplication.findByFeeReference(ref);
    if (holder && holder.id !== app.id) {
      audit({ category: "SECURITY", action: "agent.fee.duplicate_reference", actorId: userId, targetType: "AgentApplication", targetId: app.id, payload: { holder: holder.id } });
      return { ok: false as const, error: "That receipt reference is already in use.", code: "INVALID" as const };
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
    });
    // ⛔ Never a player Transaction. A balanced LedgerEntry group against the applicant.
    await postLedgerEntries(`agentfee_${app.id}`, agentRegistrationFeeEntries({
      groupRef: app.id, userId: app.userId, amount: fee.totalTzs, vatAmount: fee.vatTzs,
      description: `Agent registration fee · ${app.feeReference}`,
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
    const fee = feeBreakdown(cfg);
    await db.agentApplication.update(app.id, { feeDisposition: "REFUNDED", feeRefundedAt: now, feeRefundedById: officerId, feeRefundReference: ref, feeRefundAmountTzs: amount });
    await postLedgerEntries(`agentfee_refund_${app.id}`, agentRegistrationFeeEntries({
      groupRef: app.id, userId: app.userId, amount: -amount, vatAmount: -(app.feeAmountTzs === fee.totalTzs ? fee.vatTzs : Math.round(amount * (cfg.feeVatRatePct / (100 + cfg.feeVatRatePct)))),
      description: `Agent registration fee refunded · ${ref}`,
    })).catch(() => {});
    audit({ category: "COMPLIANCE", action: "agent.fee.refunded", actorId: officerId, targetType: "AgentApplication", targetId: app.id, payload: { amountTzs: amount, reference: ref, rejectedBy: app.reviewerId, destination: app.feeSourceAccount } });
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
export async function issueInvitation(officerId: string, input: { phoneE164: string; displayName?: string }): Promise<ServiceResult<{ invitationId: string; token: string; expiresAt: string; link: string }>> {
  const phone = (input.phoneE164 ?? "").trim();
  if (!/^\+255[67]\d{8}$/.test(phone)) return { ok: false, error: "Enter a Tanzanian mobile number as +255…", code: "INVALID" };
  const cfg = getAgentConfig();
  if (!cfg.enabled) return { ok: false, error: "The agent programme is switched off.", code: "INVALID" };
  const existing = await db.user.findByPhone(phone);
  if (existing) {
    if (existing.id === officerId) return { ok: false, error: "You cannot invite yourself.", code: "INVALID" };
    if (isStaffRole(existing.role)) return { ok: false, error: "That number belongs to a staff account.", code: "INVALID" };
    if (isApprovedAgent(await db.affiliate.findByUserId(existing.id))) return { ok: false, error: "That person is already an agent.", code: "INVALID" };
    if (existing.status === "SELF_EXCLUDED" || existing.status === "CLOSED" || existing.status === "SUSPENDED") return { ok: false, error: `That account is ${existing.status.toLowerCase().replace("_", "-")}.`, code: "INVALID" };
    if ((await selfExclusionStanding(existing.id)).state !== "none") return { ok: false, error: "That person has a self-exclusion on record.", code: "INVALID" };
    if (await db.agentApplication.findActiveByUser(existing.id)) return { ok: false, error: "That person already has a live application.", code: "INVALID" };
  }
  if (await db.agentInvitation.findLiveByPhone(phone)) return { ok: false, error: "A live invitation already stands for that number — revoke it first.", code: "INVALID" };
  const token = randomId(24);
  const now = iso();
  const expiresAt = new Date(Date.now() + cfg.invitationExpiryDays * DAY_MS).toISOString();
  const inv = await db.agentInvitation.create({
    id: `agi_${randomId(10)}`, applicationId: null, phoneE164: phone, displayName: (input.displayName ?? "").trim().slice(0, 80) || null,
    tokenHash: tokenHash(token), status: "ISSUED", issuedById: officerId, issuedAt: now, expiresAt,
    acceptedAt: null, acceptedUserId: null, declinedAt: null, revokedAt: null, revokedById: null, createdAt: now, updatedAt: now,
  });
  // If the person already has an account, open the application in INVITED now, so the
  // lifecycle row exists and `startApplication` tells them to accept first.
  if (existing) {
    const app = await db.agentApplication.create({
      id: `agp_${randomId(10)}`, userId: existing.id, status: "INVITED", source: "OFFICER_INVITED",
      refereeOneName: null, refereeOneContact: null, refereeTwoName: null, refereeTwoContact: null, refereeConsentAt: null,
      feeAmountTzs: null, feeAttestedTzs: null, feeReference: null, feeStatementRef: null, feeReconciledAt: null, feeReconciledById: null, feeSourceAccount: null,
      feeWaivedAt: null, feeWaivedById: null, feeWaiverReason: null, feeDisposition: "NONE", feeRefundDueAt: null, feeRefundedAt: null, feeRefundedById: null, feeRefundReference: null, feeRefundAmountTzs: null,
      reviewerId: null, reviewedAt: null, rejectReason: null, rejectNote: null, infoRequestNote: null, infoRequestedAt: null,
      approvedRatePct: null, agentCode: null, acceptedTermsVersion: null, acceptedTermsAt: null, submittedAt: null, expiresAt, createdAt: now, updatedAt: now,
    });
    await db.agentInvitation.update(inv.id, { applicationId: app.id });
  }
  const link = `${appUrl()}/agent/invite/${token}`;
  audit({ category: "COMPLIANCE", action: "agent.invitation.issued", actorId: officerId, targetType: "AgentInvitation", targetId: inv.id, payload: { phone: maskPhoneForAudit(phone), expiresAt, existingUser: !!existing } });
  sms.send(phone, `50pick: you have been invited to become a Verified 50pick Agent · umealikwa kuwa Wakala Aliyethibitishwa wa 50pick. Open / Fungua ${link} — expires in / inaisha baada ya siku ${cfg.invitationExpiryDays}.`).catch(() => {});
  if (existing) {
    sendEmailToUser(existing.id, (email) => ({ to: email, subject: "You are invited to become a Verified 50pick Agent", html: agentInvitationHtml({ link, expiresAt, feeWaivable: true, feeTzs: feeBreakdown(cfg).totalTzs }), tag: "agent-invitation" })).catch(() => {});
  }
  return { ok: true, data: { invitationId: inv.id, token, expiresAt, link } };
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

/** What an invite link shows before anyone proves anything: the masked phone, the expiry,
 *  whether it is still live. Never the full number. */
export async function invitationPreview(token: string): Promise<{ ok: true; invitationId: string; phoneMasked: string; displayName: string | null; expiresAt: string; status: StoredAgentInvitation["status"] } | { ok: false; reason: "invalid" | "expired" | "revoked" | "used" | "declined" }> {
  const inv = await db.agentInvitation.findByTokenHash(tokenHash((token ?? "").trim()));
  if (!inv) return { ok: false, reason: "invalid" };
  if (inv.status === "REVOKED") return { ok: false, reason: "revoked" };
  if (inv.status === "ACCEPTED") return { ok: false, reason: "used" };
  if (inv.status === "DECLINED") return { ok: false, reason: "declined" };
  if (inv.status === "EXPIRED" || new Date(inv.expiresAt).getTime() < Date.now()) {
    if (inv.status !== "EXPIRED") await expireInvitation(inv);
    return { ok: false, reason: "expired" };
  }
  const digits = inv.phoneE164.replace(/\D/g, "");
  return { ok: true, invitationId: inv.id, phoneMasked: `+${digits.slice(0, 3)} ••• ••• ${digits.slice(-3)}`, displayName: inv.displayName, expiresAt: inv.expiresAt, status: inv.status };
}

async function expireInvitation(inv: StoredAgentInvitation): Promise<void> {
  await db.agentInvitation.update(inv.id, { status: "EXPIRED" });
  if (inv.applicationId) await db.agentApplication.update(inv.applicationId, { status: "EXPIRED" });
  audit({ category: "SYSTEM", action: "agent.invitation.expired", actorId: null, targetType: "AgentInvitation", targetId: inv.id });
}

/** Send the OTP to the phone the invitation is BOUND to. The invitee proves possession of THAT
 *  number, not of the link — a forwarded link is worthless. */
export async function requestInvitationOtp(token: string): Promise<ServiceResult<{ expiresAt: string }>> {
  const p = await invitationPreview(token);
  if (!p.ok) return { ok: false, error: "This invitation is no longer valid.", code: "INVALID" };
  const inv = (await db.agentInvitation.findById(p.invitationId))!;
  const code = generateOtp();
  const salt = randomId(8);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  await db.otp.create({ id: `otp_${randomId(12)}`, phoneE164: inv.phoneE164, hashedCode: await hashOtp(code, salt), salt, purpose: INVITE_OTP_PURPOSE, attempts: 0, consumedAt: null, expiresAt, createdAt: iso() });
  audit({ category: "AUTH", action: "otp.agent_invite.sent", actorId: null, targetType: "Phone", targetId: maskPhoneForAudit(inv.phoneE164), payload: { invitationId: inv.id } });
  sms.send(inv.phoneE164, otpMessage(code, "SW")).catch(() => {});
  return { ok: true, data: { expiresAt } };
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
  if (user.phoneE164 !== inv.phoneE164) {
    audit({ category: "SECURITY", action: "agent.invitation.phone_mismatch", actorId: userId, targetType: "AgentInvitation", targetId: inv.id });
    return { ok: false, error: "This invitation was sent to a different phone number.", code: "INVALID" };
  }
  // OTP — check every active code for the phone + purpose, consume all on match.
  const active = await db.otp.findAllActive(inv.phoneE164, INVITE_OTP_PURPOSE);
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
        feeAmountTzs: null, feeAttestedTzs: null, feeReference: null, feeStatementRef: null, feeReconciledAt: null, feeReconciledById: null, feeSourceAccount: null,
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
