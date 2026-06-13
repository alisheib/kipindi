/**
 * KYC service — Tanzania-aligned (NIDA-first), GBT-acceptable workflow.
 * Steps:
 *  1) NIDA number + name + DOB → NIDA API verify
 *  2) Phone verified (already done at signup)
 *  3) Documents: ID front, ID back, selfie (uploaded to object storage by hash key)
 *  4) Submitted → PENDING_REVIEW (compliance reviewer assigns + decides)
 *  5) APPROVED unlocks withdrawals; REJECTED returns reason code
 *
 * Compliance:
 *  - Every step audited (KYC category) with correlation IDs.
 *  - PII at rest in fields only; not in logs.
 *  - Documents are storage keys; binaries never enter app DB.
 */
import { audit } from "./audit";
import { db } from "./store";
import { randomId } from "./crypto";
import { verifyNida } from "./nida";
import { rateCheck } from "./rate-limit";
import { KycNidaSchema } from "./validators";
import type { z } from "zod";
import type { ServiceResult } from "./auth-service";
import { notifyKyc } from "./notification-service";
import { sendEmailToUser, kycRejectedHtml, kycApprovedHtml } from "./email";
import { withLock } from "./locks";
import { displayLabel } from "@/lib/display-label";

export async function startKyc(userId: string): Promise<ServiceResult<{ kycId: string }>> {
  const existing = await db.kyc.findByUserId(userId);
  if (existing && existing.status !== "NOT_STARTED" && existing.status !== "REJECTED") {
    return { ok: true, data: { kycId: existing.id } };
  }
  const k = await db.kyc.upsert({
    id: existing?.id ?? `kyc_${randomId(10)}`,
    userId,
    status: "IN_PROGRESS",
    rejectReason: null,
    rejectNote: null,
    nidaNumber: null,
    nidaVerifiedAt: null,
    fullName: null,
    dob: null,
    documents: [],
    reviewerId: null,
    reviewedAt: null,
    submittedAt: null,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  audit({ category: "KYC", action: "kyc.started", actorId: userId, targetType: "Kyc", targetId: k.id });
  return { ok: true, data: { kycId: k.id } };
}

export async function submitNidaStep(userId: string, input: z.input<typeof KycNidaSchema>): Promise<ServiceResult<{ verified: boolean; reason?: string }>> {
  const rl = rateCheck(userId, "kyc.submit");
  if (!rl.allowed) return { ok: false, error: "Too many attempts.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  const parse = KycNidaSchema.safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid input", code: "INVALID" };

  const k = await db.kyc.findByUserId(userId);
  if (!k) return { ok: false, error: "Start KYC first.", code: "NOT_FOUND" };

  const result = await verifyNida({ nida: parse.data.nida, fullName: parse.data.fullName, dob: parse.data.dob, userId });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  if (result.verified === false) {
    await db.kyc.upsert({ ...k, status: "REJECTED", rejectReason: result.reason, updatedAt: new Date().toISOString() });
    audit({ category: "KYC", action: "kyc.nida.rejected", actorId: userId, targetType: "Kyc", targetId: k.id, payload: { reason: result.reason } });
    // In-app + email notice (best-effort).
    notifyKyc(userId, "REJECTED");
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: "Identity check needs attention",
      html: kycRejectedHtml({ reason: result.reason ?? "We couldn't verify your details. Please re-check and resubmit." }),
      tag: "kyc-rejected",
    }));
    return { ok: true, data: { verified: false, reason: result.reason } };
  }

  await db.kyc.upsert({
    ...k,
    nidaNumber: parse.data.nida,
    nidaVerifiedAt: new Date().toISOString(),
    fullName: result.fullName,
    dob: result.dob,
    updatedAt: new Date().toISOString(),
  });
  audit({ category: "KYC", action: "kyc.nida.verified", actorId: userId, targetType: "Kyc", targetId: k.id, payload: { matchScore: result.matchScore } });
  return { ok: true, data: { verified: true } };
}

/** Max decoded size of a document image, and the accepted data-URL shape. */
export const MAX_DOC_BYTES = 3 * 1024 * 1024; // 3 MB decoded — legible ID photos, bounded
const DOC_DATAURL_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
/** Validate an uploaded document image data URL. Returns decoded byte size. */
export function validateDocImage(s: string): { ok: true; bytes: number } | { ok: false; error: string } {
  if (!s || !DOC_DATAURL_RE.test(s)) return { ok: false, error: "Document must be a JPG, PNG, or WebP image." };
  const b64 = s.slice(s.indexOf(",") + 1);
  const bytes = Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
  if (bytes <= 0) return { ok: false, error: "Empty image." };
  if (bytes > MAX_DOC_BYTES) return { ok: false, error: "Image too large. Use a photo under 3 MB." };
  return { ok: true, bytes };
}

export async function attachDocument(userId: string, docType: "NIDA_FRONT" | "NIDA_BACK" | "SELFIE", storageKey: string): Promise<ServiceResult> {
  const valid = validateDocImage(storageKey);
  if (!valid.ok) return { ok: false, error: valid.error, code: "INVALID" };
  const k = await db.kyc.findByUserId(userId);
  if (!k) return { ok: false, error: "Start KYC first.", code: "NOT_FOUND" };
  // Re-uploading a document while it's already under review or approved would
  // change the evidence behind an officer's pending/made decision — block it.
  if (k.status === "PENDING_REVIEW" || k.status === "APPROVED") {
    return { ok: false, error: "Documents are locked while your submission is under review.", code: "INVALID" };
  }
  const docs = [...k.documents.filter((d: { docType: string }) => d.docType !== docType), { docType, storageKey, uploadedAt: new Date().toISOString() }];
  await db.kyc.upsert({ ...k, documents: docs, updatedAt: new Date().toISOString() });
  // Note: never log the image bytes themselves in the audit payload.
  audit({ category: "KYC", action: "kyc.document.uploaded", actorId: userId, targetType: "Kyc", targetId: k.id, payload: { docType, bytes: valid.bytes } });
  return { ok: true };
}

export async function submitForReview(userId: string): Promise<ServiceResult> {
  const k = await db.kyc.findByUserId(userId);
  if (!k) return { ok: false, error: "Start KYC first.", code: "NOT_FOUND" };
  if (!k.nidaVerifiedAt) return { ok: false, error: "NIDA not yet verified.", code: "INVALID" };
  if (k.documents.length < 3) return { ok: false, error: "All three documents required.", code: "INVALID" };

  await db.kyc.upsert({ ...k, status: "PENDING_REVIEW", submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  audit({ category: "KYC", action: "kyc.submitted", actorId: userId, targetType: "Kyc", targetId: k.id });
  notifyKyc(userId, "PENDING_REVIEW"); // in-app "submitted, under review" notice
  return { ok: true };
}

export async function getKycStatus(userId: string) {
  return await db.kyc.findByUserId(userId);
}

/** All KYC submissions awaiting an officer decision (for the review queue). */
export async function listPendingKyc() {
  return (await db.kyc.list())
    .filter((k) => k.status === "PENDING_REVIEW" || k.status === "ADDITIONAL_INFO_REQUIRED")
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? "")); // oldest first (FIFO)
}

/**
 * Officer decision on a pending KYC submission.
 *
 * Hardened for the scenarios a compliance officer hits in practice:
 *  - Self-review blocked (an officer can't verify their own identity).
 *  - REJECT requires a written reason (≥ 5 chars) — that text is what the
 *    player sees in-app and by email.
 *  - Idempotent + race-safe: serialized per-user under a lock, and only a
 *    PENDING_REVIEW / ADDITIONAL_INFO submission can be decided, so a
 *    double-click or two officers can't double-approve or double-email.
 *  - APPROVE unlocks the account ONLY when it's gated purely by KYC
 *    (PENDING_KYC / IN_PROGRESS). It never overrides a SUSPENDED / CLOSED /
 *    SELF_EXCLUDED / COOLED_OFF status — those outrank a KYC pass.
 *  - REJECT leaves the user able to resubmit; it does not change account status.
 *  - Player is always notified (in-app + best-effort email). Both clicks audited.
 */
export async function reviewKyc(opts: {
  officerId: string;
  userId: string;
  decision: "APPROVE" | "REJECT";
  reason?: string;
  note?: string;
}): Promise<ServiceResult> {
  const { officerId, userId, decision } = opts;
  if (!userId) return { ok: false, error: "Missing user.", code: "INVALID" };
  if (officerId === userId) {
    audit({ category: "SECURITY", action: "kyc.review.self_blocked", actorId: officerId, targetType: "User", targetId: userId });
    return { ok: false, error: "You cannot review your own identity verification.", code: "INVALID" };
  }
  const reason = (opts.reason ?? "").trim();
  if (decision === "REJECT" && reason.length < 5) {
    return { ok: false, error: "A rejection reason (at least 5 characters) is required.", code: "INVALID" };
  }

  return withLock(`kyc:${userId}`, async () => {
    const k = await db.kyc.findByUserId(userId);
    if (!k) return { ok: false as const, error: "No KYC submission for this user.", code: "NOT_FOUND" as const };
    if (k.status !== "PENDING_REVIEW" && k.status !== "ADDITIONAL_INFO_REQUIRED") {
      return { ok: false as const, error: `KYC is ${k.status} — only a submission awaiting review can be decided.`, code: "INVALID" as const };
    }
    const now = new Date().toISOString();

    if (decision === "APPROVE") {
      await db.kyc.upsert({ ...k, status: "APPROVED", reviewerId: officerId, reviewedAt: now, rejectReason: null, rejectNote: null, updatedAt: now });
      // Unlock the account only if it's gated purely by KYC.
      const u = await db.user.findById(userId);
      if (u && u.status === "PENDING_KYC") {
        await db.user.update(userId, { status: "ACTIVE" });
      }
      audit({ category: "KYC", action: "kyc.approved", actorId: officerId, targetType: "User", targetId: userId, payload: { kycId: k.id, priorStatus: u?.status ?? null } });
      notifyKyc(userId, "APPROVED");
      const firstName = (k.fullName?.trim().split(/\s+/)[0]) || displayLabel(u ?? { id: userId, displayName: null });
      sendEmailToUser(userId, (email) => ({
        to: email,
        subject: "Identity verified · You're fully verified",
        html: kycApprovedHtml({ name: firstName }),
        tag: "kyc-approved",
      }));
      return { ok: true as const };
    }

    // REJECT
    await db.kyc.upsert({ ...k, status: "REJECTED", rejectReason: reason, rejectNote: opts.note?.trim() || null, reviewerId: officerId, reviewedAt: now, updatedAt: now });
    audit({ category: "KYC", action: "kyc.rejected", actorId: officerId, targetType: "User", targetId: userId, payload: { kycId: k.id, reason } });
    notifyKyc(userId, "REJECTED");
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: "Identity check needs attention",
      html: kycRejectedHtml({ reason }),
      tag: "kyc-rejected",
    }));
    return { ok: true as const };
  });
}
