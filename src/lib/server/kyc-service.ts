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
import type { StoredUser, KycExtraRequest } from "./store";
import { randomId } from "./crypto";
import { verifyNida } from "./nida";
import { rateCheck } from "./rate-limit";
import { KycNidaSchema } from "./validators";
import type { z } from "zod";
import type { ServiceResult } from "./auth-service";
import { notifyKyc, notifyAdminKycReview } from "./notification-service";
import { sendEmail, sendEmailToUser, kycRejectedHtml, kycApprovedHtml, kycSubmittedHtml, kycSubmittedAdminHtml, kycMoreInfoHtml } from "./email";
import { resolvePhoneEmail } from "./email-map";
import { setUserEmail } from "./email-verification";
import { withLock } from "./locks";
import { displayLabel } from "@/lib/display-label";

const BASE_URL = () => process.env.NEXT_PUBLIC_APP_URL || "https://kipindi-production.up.railway.app";

/** First word of a full name, used as a friendly greeting in emails. */
function firstName(full?: string | null): string | undefined {
  return full?.trim().split(/\s+/)[0] || undefined;
}

/** Mask a phone for an email body: keep country code + last 2 (e.g. "+25570*****19"). */
function maskPhone(phone?: string | null): string {
  const p = (phone ?? "").trim();
  return p.length > 6 ? `${p.slice(0, 6)}*****${p.slice(-2)}` : "****";
}

/**
 * Recipients for the "new KYC to verify" admin email (Decision 2026-06-14:
 * ALL admin-role users with a resolvable email). `KYC_NOTIFY_EMAILS` (comma-
 * separated) is the later "only some accounts" override. Best-effort: returns
 * a deduped, lowercased list; `[]` simply means the admin email is skipped.
 */
export async function kycNotifyEmails(): Promise<string[]> {
  const override = (process.env.KYC_NOTIFY_EMAILS ?? "").trim();
  let raw: string[];
  if (override) {
    raw = override.split(",");
  } else {
    const users = await db.user.list();
    raw = users
      .filter((u) => ["ADMIN", "COMPLIANCE", "MODERATOR"].includes(u.role))
      .map((u) => u.email || resolvePhoneEmail(u.phoneE164) || "");
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of raw) {
    const norm = e.trim().toLowerCase();
    if (norm && !norm.endsWith("@stub") && !norm.endsWith("@none") && !seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
  }
  return out;
}

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

  // Uniqueness: one NIDA = one account. Block if this national ID is already on
  // ANOTHER user's submission that isn't rejected (a rejected one frees it).
  // Multi-accounting / identity-reuse is a P0 AML control for a licensed book.
  // Scan ALL submissions (not findByNida's single arbitrary/most-recent row) so
  // the control is correct regardless of store ordering: block if ANY other
  // user holds this NIDA on a non-rejected submission.
  const nidaConflict = (await db.kyc.list()).find(
    (k) => k.userId !== userId && (k.nidaNumber ?? "").trim() === parse.data.nida && k.status !== "REJECTED",
  );
  if (nidaConflict) {
    audit({ category: "SECURITY", action: "kyc.nida.duplicate_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { conflictUserId: nidaConflict.userId, conflictStatus: nidaConflict.status } });
    return { ok: false, error: "This National ID is already linked to another account. If this is a mistake, contact support.", code: "INVALID" };
  }

  // Collect the contact email at the identity step (canonical collection point).
  // Routed through the single setUserEmail() writer so a new address resets
  // verification and fires a confirmation link. Best-effort: never block KYC.
  if (parse.data.email !== undefined && parse.data.email !== "") {
    await setUserEmail(userId, parse.data.email).catch(() => {});
  }

  const result = await verifyNida({ nida: parse.data.nida, fullName: parse.data.fullName, dob: parse.data.dob, userId });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  if (result.verified === false) {
    // The DB `rejectReason` column is the KycRejectReason enum — writing the raw
    // NIDA code (e.g. "MISMATCH"/"NOT_FOUND") throws in Postgres (it only passed
    // in the in-memory dev store). Map to a valid enum member and keep a
    // player-readable detail in rejectNote.
    const NIDA_ENUM = { MISMATCH: "DETAILS_MISMATCH", EXPIRED: "EXPIRED_ID", NOT_FOUND: "OTHER", UNDERAGE: "UNDERAGE", SANCTIONED: "SANCTIONED" } as const;
    const NIDA_TEXT = { MISMATCH: "Your details didn't match the National ID record.", EXPIRED: "The National ID on file has expired.", NOT_FOUND: "We couldn't find this National ID.", UNDERAGE: "You must be 18 or older to use 50pick.", SANCTIONED: "We're unable to verify this identity." } as const;
    const rejectNote = NIDA_TEXT[result.reason];
    await db.kyc.upsert({ ...k, status: "REJECTED", rejectReason: NIDA_ENUM[result.reason], rejectNote, updatedAt: new Date().toISOString() });
    audit({ category: "KYC", action: "kyc.nida.rejected", actorId: userId, targetType: "Kyc", targetId: k.id, payload: { reason: result.reason } });
    // In-app + email notice (best-effort).
    notifyKyc(userId, "REJECTED");
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: "Identity check needs attention",
      html: kycRejectedHtml({ reason: rejectNote }),
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

/**
 * Player fulfils an officer-requested extra document. Allowed only while the
 * submission is in ADDITIONAL_INFO_REQUIRED (i.e. an officer actually asked).
 * Validates the image and attaches it to the matching request slot.
 */
export async function attachExtraDocument(userId: string, requestId: string, storageKey: string): Promise<ServiceResult> {
  const valid = validateDocImage(storageKey);
  if (!valid.ok) return { ok: false, error: valid.error, code: "INVALID" };
  const k = await db.kyc.findByUserId(userId);
  if (!k) return { ok: false, error: "Start KYC first.", code: "NOT_FOUND" };
  if (k.status !== "ADDITIONAL_INFO_REQUIRED") {
    return { ok: false, error: "No extra documents are being requested right now.", code: "INVALID" };
  }
  const requests: KycExtraRequest[] = k.extraRequests ?? [];
  const target = requests.find((r: KycExtraRequest) => r.id === requestId);
  if (!target) return { ok: false, error: "Unknown document request.", code: "NOT_FOUND" };
  const now = new Date().toISOString();
  const next = requests.map((r: KycExtraRequest) => (r.id === requestId ? { ...r, storageKey, uploadedAt: now } : r));
  await db.kyc.upsert({ ...k, extraRequests: next, updatedAt: now });
  audit({ category: "KYC", action: "kyc.extra_document.uploaded", actorId: userId, targetType: "Kyc", targetId: k.id, payload: { requestId, bytes: valid.bytes } });
  return { ok: true };
}

export async function submitForReview(userId: string): Promise<ServiceResult> {
  const k = await db.kyc.findByUserId(userId);
  if (!k) return { ok: false, error: "Start KYC first.", code: "NOT_FOUND" };
  if (!k.nidaVerifiedAt) return { ok: false, error: "NIDA not yet verified.", code: "INVALID" };
  if (k.documents.length < 3) return { ok: false, error: "All three documents required.", code: "INVALID" };
  // If an officer requested extra documents, every slot must be filled before
  // the player can resubmit — otherwise it'd bounce straight back.
  const unfulfilled = (k.extraRequests ?? []).filter((r: KycExtraRequest) => !r.storageKey);
  if (unfulfilled.length > 0) {
    return { ok: false, error: `Please upload the ${unfulfilled.length} requested document${unfulfilled.length > 1 ? "s" : ""} before submitting.`, code: "INVALID" };
  }

  // Idempotency guard: only fire on the transition INTO PENDING_REVIEW. A
  // double-submit / retry when already pending returns ok WITHOUT re-emailing
  // the player or the admins. (APPROVED is likewise already past this gate.)
  if (k.status === "PENDING_REVIEW" || k.status === "APPROVED") {
    return { ok: true };
  }

  const now = new Date().toISOString();
  await db.kyc.upsert({ ...k, status: "PENDING_REVIEW", submittedAt: now, updatedAt: now });
  audit({ category: "KYC", action: "kyc.submitted", actorId: userId, targetType: "Kyc", targetId: k.id });
  notifyKyc(userId, "PENDING_REVIEW"); // in-app "submitted, under review" notice

  // ── Notifications (all best-effort; a failed send must never break submit) ──
  const u = await db.user.findById(userId);
  const docTypes = k.documents.map((d: { docType: string }) => d.docType);

  // Player: "documents received, pending verification".
  sendEmailToUser(userId, (email) => ({
    to: email,
    subject: "Documents received · verification pending",
    tag: "kyc-submitted",
    html: kycSubmittedHtml({
      name: firstName(k.fullName ?? u?.displayName),
      reference: k.id,
      submittedAt: now,
      docTypes,
      viewUrl: "/profile/kyc",
    }),
  }));

  // Compliance/ops: one best-effort send per recipient. No PII (masked NIDA,
  // masked phone, no images, no DOB) — the reviewer opens the secured drill-in.
  const reviewUrl = `${BASE_URL()}/admin/players/${userId}?tab=kyc`;
  const nidaMasked = "•••• " + (k.nidaNumber?.slice(-4) ?? "");
  const playerLabel = displayLabel({ id: userId, displayName: k.fullName ?? u?.displayName ?? null });

  // In-app alert in every admin's MAIN notification bell (deep-links to the
  // KYC tab). This is the reliable in-platform signal; email is the extra nudge.
  for (const a of await db.user.list()) {
    if (["ADMIN", "COMPLIANCE", "MODERATOR"].includes(a.role)) {
      notifyAdminKycReview(a.id, { playerLabel, userId }).catch(() => {});
    }
  }

  const adminHtml = kycSubmittedAdminHtml({
    reference: k.id,
    name: playerLabel,
    phoneMasked: maskPhone(u?.phoneE164),
    nidaMasked,
    submittedAt: now,
    reviewUrl,
  });
  kycNotifyEmails()
    .then((recipients) => {
      if (recipients.length === 0) {
        console.log("[kyc] no admin notify recipients resolved — admin email skipped");
        return;
      }
      for (const to of recipients) {
        sendEmail({ to, subject: "New KYC to verify · " + k.id, tag: "kyc-admin", html: adminHtml, trackLinks: false }).catch(() => {});
      }
    })
    .catch(() => {});

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
  decision: "APPROVE" | "REJECT" | "REQUEST_INFO";
  reason?: string;
  note?: string;
  /** REQUEST_INFO only: specific extra documents to request, each a non-empty
   *  description (e.g. "Clearer photo of ID back", "Proof of address"). The
   *  player gets an upload slot per item; the officer sees each with its
   *  description + the uploaded content. */
  requestedDocs?: string[];
}): Promise<ServiceResult> {
  const { officerId, userId, decision } = opts;
  if (!userId) return { ok: false, error: "Missing user.", code: "INVALID" };
  if (officerId === userId) {
    audit({ category: "SECURITY", action: "kyc.review.self_blocked", actorId: officerId, targetType: "User", targetId: userId });
    return { ok: false, error: "You cannot review your own identity verification.", code: "INVALID" };
  }
  const reason = (opts.reason ?? "").trim();
  // Both REJECT and REQUEST_INFO put text in front of the player — require it.
  if (decision === "REJECT" && reason.length < 5) {
    return { ok: false, error: "A rejection reason (at least 5 characters) is required.", code: "INVALID" };
  }
  if (decision === "REQUEST_INFO" && reason.length < 5) {
    return { ok: false, error: "Tell the player what's needed (at least 5 characters).", code: "INVALID" };
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
      const u = await db.user.findById(userId);
      // Build a single user patch: unlock the account if it's gated purely by
      // KYC, and surface the NIDA-verified legal name as the display name.
      const patch: Partial<StoredUser> = {};
      if (u && u.status === "PENDING_KYC") patch.status = "ACTIVE";
      // Decision (Ali, 2026-06-14): ALWAYS set displayName from the verified
      // legal name on approve, even over a chosen handle. Public surfaces stay
      // safe automatically — leaderboard shows first word only, comments mask +
      // freeze the name at write time — so the full surname never leaks.
      if (k.fullName?.trim()) patch.displayName = k.fullName.trim();
      if (Object.keys(patch).length) await db.user.update(userId, patch);
      audit({ category: "KYC", action: "kyc.approved", actorId: officerId, targetType: "User", targetId: userId, payload: { kycId: k.id, priorStatus: u?.status ?? null, nameBackfilled: !!k.fullName?.trim() } });
      notifyKyc(userId, "APPROVED");
      const greetName = firstName(k.fullName) ?? displayLabel(u ?? { id: userId, displayName: null });
      sendEmailToUser(userId, (email) => ({
        to: email,
        subject: "Identity verified · You're fully verified",
        html: kycApprovedHtml({ name: greetName, reference: k.id }),
        tag: "kyc-approved",
      }));
      return { ok: true as const };
    }

    if (decision === "REQUEST_INFO") {
      // Officer needs more / clearer docs or extra info before deciding. The
      // submission stays open: status → ADDITIONAL_INFO_REQUIRED unlocks
      // re-upload (attachDocument allows it in this state) and the player can
      // resubmit, which transitions back to PENDING_REVIEW. The note is the
      // player-facing ask, surfaced both in-app and on /profile/kyc.
      // Build the extra-document request slots (each a non-empty description).
      // A REQUEST_INFO sets the slots needed THIS round (replacing any prior set).
      const descriptions = (opts.requestedDocs ?? []).map((d) => d.trim()).filter((d) => d.length > 0);
      const extraRequests = descriptions.map((description) => ({
        id: `req_${randomId(8)}`,
        description: description.slice(0, 300),
        requestedAt: now,
        storageKey: null as string | null,
        uploadedAt: null as string | null,
      }));
      await db.kyc.upsert({ ...k, status: "ADDITIONAL_INFO_REQUIRED", rejectReason: null, rejectNote: reason, extraRequests, reviewerId: officerId, reviewedAt: now, updatedAt: now });
      audit({ category: "KYC", action: "kyc.more_info_requested", actorId: officerId, targetType: "User", targetId: userId, payload: { kycId: k.id, note: reason, extraDocs: descriptions.length } });
      notifyKyc(userId, "ADDITIONAL_INFO");
      sendEmailToUser(userId, (email) => ({
        to: email,
        subject: "More information needed · 50pick verification",
        html: kycMoreInfoHtml({ reason, reference: k.id }),
        tag: "kyc-more-info",
      }));
      return { ok: true as const };
    }

    // REJECT — `reason` is the officer's free-text, player-facing message. It
    // belongs in rejectNote (free text); rejectReason is the KycRejectReason
    // enum, so a manual rejection is categorised as OTHER. (Writing free text
    // into the enum column threw in Postgres and lost the decision in prod.)
    await db.kyc.upsert({ ...k, status: "REJECTED", rejectReason: "OTHER", rejectNote: opts.note?.trim() || reason, reviewerId: officerId, reviewedAt: now, updatedAt: now });
    audit({ category: "KYC", action: "kyc.rejected", actorId: officerId, targetType: "User", targetId: userId, payload: { kycId: k.id, reason } });
    notifyKyc(userId, "REJECTED");
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: "Identity check needs attention",
      html: kycRejectedHtml({ reason, reference: k.id }),
      tag: "kyc-rejected",
    }));
    return { ok: true as const };
  });
}
