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

export async function startKyc(userId: string): Promise<ServiceResult<{ kycId: string }>> {
  const existing = db.kyc.findByUserId(userId);
  if (existing && existing.status !== "NOT_STARTED" && existing.status !== "REJECTED") {
    return { ok: true, data: { kycId: existing.id } };
  }
  const k = db.kyc.upsert({
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

  const k = db.kyc.findByUserId(userId);
  if (!k) return { ok: false, error: "Start KYC first.", code: "NOT_FOUND" };

  const result = await verifyNida({ nida: parse.data.nida, fullName: parse.data.fullName, dob: parse.data.dob, userId });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  if (result.verified === false) {
    db.kyc.upsert({ ...k, status: "REJECTED", rejectReason: result.reason, updatedAt: new Date().toISOString() });
    audit({ category: "KYC", action: "kyc.nida.rejected", actorId: userId, targetType: "Kyc", targetId: k.id, payload: { reason: result.reason } });
    return { ok: true, data: { verified: false, reason: result.reason } };
  }

  db.kyc.upsert({
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

export async function attachDocument(userId: string, docType: "NIDA_FRONT" | "NIDA_BACK" | "SELFIE", storageKey: string): Promise<ServiceResult> {
  const k = db.kyc.findByUserId(userId);
  if (!k) return { ok: false, error: "Start KYC first.", code: "NOT_FOUND" };
  const docs = [...k.documents.filter((d: { docType: string }) => d.docType !== docType), { docType, storageKey, uploadedAt: new Date().toISOString() }];
  db.kyc.upsert({ ...k, documents: docs, updatedAt: new Date().toISOString() });
  audit({ category: "KYC", action: "kyc.document.uploaded", actorId: userId, targetType: "Kyc", targetId: k.id, payload: { docType, storageKey } });
  return { ok: true };
}

export async function submitForReview(userId: string): Promise<ServiceResult> {
  const k = db.kyc.findByUserId(userId);
  if (!k) return { ok: false, error: "Start KYC first.", code: "NOT_FOUND" };
  if (!k.nidaVerifiedAt) return { ok: false, error: "NIDA not yet verified.", code: "INVALID" };
  if (k.documents.length < 3) return { ok: false, error: "All three documents required.", code: "INVALID" };

  db.kyc.upsert({ ...k, status: "PENDING_REVIEW", submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  audit({ category: "KYC", action: "kyc.submitted", actorId: userId, targetType: "Kyc", targetId: k.id });
  return { ok: true };
}

export async function getKycStatus(userId: string) {
  return db.kyc.findByUserId(userId);
}
