/**
 * KYC service — Tanzania-aligned, GBT-acceptable workflow.
 *
 * ⭐ FOUR WAYS TO PROVE WHO YOU ARE (owner decision, Ali 2026-08-19). A player
 * proves identity with ANY ONE of NIDA, passport, driving licence or voter's card.
 * Which documents exist, what their numbers must look like, which images each one
 * requires and whether it carries an expiry are ALL declared in ONE place —
 * `src/lib/id-documents.ts`. ⛔ Nothing in this file may hard-write a fifth answer.
 *
 * Steps:
 *  1) Identity: document type + number + name + DOB → format, expiry, uniqueness
 *  2) Phone verified (already done at signup)
 *  3) Documents: the slots THAT TYPE requires, plus a selfie, through the storage seam
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
import { putKycDocument } from "./storage";
import { sniffBase64ImageMime } from "./image-signature";
import { verifyNida } from "./nida";
import { rateCheckAsync } from "./rate-limit";
import { KycIdentitySchema } from "./validators";
import {
  ID_DOC_SPECS,
  ALL_DOC_SLOTS,
  MIN_AGE_YEARS,
  ageOn,
  isExpired,
  missingSlots,
  validateIdNumber,
  type IdDocType,
  type KycDocSlot,
} from "@/lib/id-documents";
import type { z } from "zod";
import type { ServiceResult } from "./auth-service";
import type { FailureReason } from "@/lib/failure-reasons";
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
    // ⛔ THE WHOLE IDENTITY TUPLE CLEARS TOGETHER. Leaving `idType` behind while
    // nulling `idNumber` would let a restarted submission carry the previous
    // document's type into the next one's validation — and leaving `idNumber`
    // behind would hold a number hostage under the partial unique index for a
    // submission that no longer claims it.
    idType: null,
    idNumber: null,
    idExpiry: null,
    idVerifiedAt: null,
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

/**
 * STEP 1 — the identity step, for ANY ONE of the four documents.
 *
 * Order matters and every step is here for a reason it has already been bitten by:
 *
 *  1. RATE LIMIT — an identity field is a guessing surface.
 *  2. SHAPE (`KycIdentitySchema`) — a real type, a number, a name, a DOB ≥ 18.
 *     ⭐ The AGE GATE LIVES ON THE DECLARED DOB, so it covers all four types. Only
 *     a NIDA carries a date of birth inside the number; an age check derived from
 *     the number would be silently NIDA-only, which is a control that passes
 *     because the feature is absent.
 *  3. FORMAT (`validateIdNumber`) — the ONE catalogue. Published rules refuse;
 *     advisory shapes only flag; the two documents with no published format are
 *     held to a sanity band and nothing more, by owner instruction.
 *  4. EXPIRY — asked for, and enforced, only where the document has one.
 *  5. 🔴 UNIQUENESS — one document, one account, ACROSS ALL FOUR TYPES.
 *  6. The write, whose losing racer is caught by the partial unique index.
 */
export async function submitIdentityStep(userId: string, input: z.input<typeof KycIdentitySchema>): Promise<ServiceResult<{ verified: boolean; reason?: string }>> {
  const rl = await rateCheckAsync(userId, "kyc.submit");
  if (!rl.allowed) return { ok: false, error: "Too many attempts.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  const parse = KycIdentitySchema.safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid input", code: "INVALID" };

  const k = await db.kyc.findByUserId(userId);
  if (!k) return { ok: false, error: "Start KYC first.", code: "NOT_FOUND" };

  const idType = parse.data.idType as IdDocType;
  const spec = ID_DOC_SPECS[idType];

  // ── 🔴 AGE, FOR ALL FOUR TYPES ────────────────────────────────────────────
  // `dateOfBirth` in the schema already refuses under-18, so this is the second
  // lock rather than the first — and it is here, above the per-type branch, so it
  // can never become a property of one document. A caller that reaches the service
  // without the schema (a script, a future API) still meets the gate.
  const declaredAge = ageOn(parse.data.dob, new Date());
  if (!Number.isFinite(declaredAge) || declaredAge < MIN_AGE_YEARS) {
    audit({ category: "COMPLIANCE", action: "kyc.identity.underage_attempt", actorId: userId, targetType: "User", targetId: userId, payload: { idType } });
    await db.kyc.upsert({ ...k, status: "REJECTED", rejectReason: "UNDERAGE", rejectNote: null, updatedAt: new Date().toISOString() });
    notifyKyc(userId, "REJECTED").catch(() => {});
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: "Identity check needs attention",
      html: kycRejectedHtml({ reason: REJECT_EMAIL_TEXT.UNDERAGE }),
      tag: "kyc-rejected",
    }));
    return { ok: true, data: { verified: false, reason: "UNDERAGE" } };
  }

  // ── FORMAT — one catalogue, one entry per document ────────────────────────
  const verdict = validateIdNumber(idType, parse.data.idNumber);
  if (!verdict.ok) {
    // Named for what happened, and carrying WHICH rule failed — a compliance
    // record that says only "invalid" cannot answer "did we lock a real citizen
    // out, and on what basis?".
    audit({ category: "KYC", action: "kyc.id.invalid_format", actorId: userId, targetType: "User", targetId: userId, payload: { idType, refusal: verdict.refusal, formatKind: spec.format.kind } });
    return { ok: false, error: `That ${idType} number does not meet the recorded rule (${verdict.refusal}).`, code: "INVALID", reason: "id_number_format" };
  }
  const idNumber = verdict.value;

  // ── EXPIRY — only where the document actually has one ─────────────────────
  // ⛔ NIDA and the voter's card do not expire, so nothing asks for a date they
  // do not carry. Asking would invite an invented one, and an invented date in a
  // compliance record is worse than no date.
  const expiryRaw = (parse.data.idExpiry ?? "").trim();
  let idExpiry: string | null = null;
  if (spec.expires) {
    if (!expiryRaw) {
      return { ok: false, error: `An expiry date is required for a ${idType}.`, code: "INVALID", reason: "id_expiry_required" };
    }
    // 🔴 REFUSED AT SUBMIT, not accepted-and-flagged. An expired document is not
    // valid identity evidence, and an officer approving one is the human control
    // failing silently. `KycRejectReason.EXPIRED_ID` stays the officer's word for
    // a document whose IMAGE shows an expiry the player did not declare.
    if (isExpired(expiryRaw, new Date())) {
      audit({ category: "COMPLIANCE", action: "kyc.id.expired_rejected", actorId: userId, targetType: "User", targetId: userId, payload: { idType, expiry: expiryRaw } });
      return { ok: false, error: `That ${idType} expired on ${expiryRaw}.`, code: "INVALID", reason: "id_expired" };
    }
    idExpiry = expiryRaw.slice(0, 10);
  }

  // ── 🔴 UNIQUENESS — ONE DOCUMENT, ONE ACCOUNT, ACROSS ALL FOUR TYPES ──────
  // Block if this (type, number) is already on ANOTHER user's submission that is
  // not rejected (a rejected one frees it). Multi-accounting / identity-reuse is a
  // P0 AML control for a licensed book, and since there is no authority check
  // (docs/IDENTITY-POLICY.md) uniqueness is the ENTIRE machine-side control.
  //
  // ⛔ THE PAIR, NEVER THE NUMBER ALONE. On the number alone a passport would
  // collide with an unrelated licence sharing its digits; on the type alone the
  // check means nothing. And the partial unique index enforces exactly this pair,
  // so the fast path and the enforcement ask one question.
  //
  // ⚠️ `findActiveByIdNumber` is an indexed findFirst returning only
  // { userId, status } — it never hydrates the base64 KYC images (audit H5).
  const conflict = await db.kyc.findActiveByIdNumber(idType, idNumber, userId);
  if (conflict) {
    audit({ category: "SECURITY", action: "kyc.id.duplicate_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { idType, conflictUserId: conflict.userId, conflictStatus: conflict.status } });
    return { ok: false, error: "This identity document is already linked to another account. If this is a mistake, contact support.", code: "INVALID", reason: "id_taken" };
  }

  // Collect the contact email at the identity step (canonical collection point).
  // Routed through the single setUserEmail() writer so a new address resets
  // verification and fires a confirmation link. Best-effort: never block KYC.
  if (parse.data.email !== undefined && parse.data.email !== "") {
    const emailResult = await setUserEmail(userId, parse.data.email).catch((err) => {
      console.error("[kyc] setUserEmail failed:", (err as Error)?.message);
      return null;
    });
    if (emailResult && !emailResult.ok) console.warn(`[kyc] setUserEmail rejected: ${emailResult.error}`);
    else if (emailResult?.ok) console.log(`[kyc] email saved for ${userId.slice(0, 14)}… (changed=${emailResult.changed}, verificationSent=${emailResult.verificationSent})`);
  } else {
    console.warn(`[kyc] no email provided in identity step for ${userId.slice(0, 14)}…`);
  }

  // ── THE NIDA AUTHORITY SEAM ───────────────────────────────────────────────
  // ⛔ ONLY NIDA HAS ONE, AND TODAY IT ANSWERS NOTHING. `nida.ts` is a
  // deterministic mock; no request has ever reached the National Identification
  // Authority, and by owner decision none is required. There is no equivalent
  // endpoint for a passport, a licence or a voter's card and none is invented
  // here — the image plus a human officer is the control for all four.
  // The sanctions / details-mismatch QA paths live in that mock and so are
  // NIDA-only by construction; they are test hooks, not a control.
  if (idType === "NIDA") {
    const result = await verifyNida({ nida: idNumber, fullName: parse.data.fullName, dob: parse.data.dob, userId });
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
      const enumMember = NIDA_ENUM[result.reason];
      // ⚠️ These sentences are ENGLISH. `/profile/kyc` renders the enum member in
      // the player's own language, so storing one alongside a categorised
      // rejection prints the same reason twice — once translated, once in ours
      // (§6 E-6). Keep it only for OTHER, which shows no category at all. The
      // EMAIL still carries it: email templates have no dictionary.
      const rejectNote = enumMember === "OTHER" ? NIDA_TEXT[result.reason] : null;
      await db.kyc.upsert({ ...k, status: "REJECTED", rejectReason: enumMember, rejectNote, updatedAt: new Date().toISOString() });
      audit({ category: "KYC", action: "kyc.nida.rejected", actorId: userId, targetType: "Kyc", targetId: k.id, payload: { reason: result.reason } });
      // In-app + email notice (best-effort).
      notifyKyc(userId, "REJECTED").catch(() => {});
      sendEmailToUser(userId, (email) => ({
        to: email,
        subject: "Identity check needs attention",
        html: kycRejectedHtml({ reason: NIDA_TEXT[result.reason] }),
        tag: "kyc-rejected",
      }));
      return { ok: true, data: { verified: false, reason: result.reason } };
    }
  }

  const now = new Date().toISOString();
  try {
    await db.kyc.upsert({
      ...k,
      idType,
      idNumber,
      idExpiry,
      idVerifiedAt: now,
      // ⚠️ THE DEPRECATED MIRROR IS GONE (2026-08-20, contract step). This upsert
      // used to also write `nidaNumber` / `nidaVerifiedAt` for a NIDA so a rolling
      // deploy's previous container could keep serving KYC reads. That mirror had
      // exactly one release to live and this is the release it dies in — the fields
      // leave the schema HERE, the columns leave the database in the migration that
      // follows. ⛔ Do not re-add either: two homes for one fact diverge, and the
      // stale one is always the one somebody reads.
      fullName: parse.data.fullName,
      dob: parse.data.dob,
      updatedAt: now,
    });
  } catch (err) {
    // The check above is the FAST PATH; the partial unique index
    // "KycSubmission_idType_idNumber_active_key" is the ENFORCEMENT. Two users
    // submitting the same document in the same instant both clear the read
    // (proven by scripts/load/s14-kyc-nida-race.mts) — the loser lands here.
    // Present it as the same refusal a sequential duplicate gets, so a race is
    // indistinguishable from an ordinary duplicate to the player, and audited the
    // same way for AML.
    if (!isIdUniqueViolation(err)) throw err;
    audit({ category: "SECURITY", action: "kyc.id.duplicate_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { idType, viaConstraint: true } });
    return { ok: false, error: "This identity document is already linked to another account. If this is a mistake, contact support.", code: "INVALID", reason: "id_taken" };
  }
  // `idVerifiedAt` means "format accepted + unique", never "authority confirmed"
  // (docs/IDENTITY-POLICY.md). The payload used to carry a fabricated matchScore
  // of 0.97 straight into the audit chain; record the real basis, and record WHICH
  // document — a regulator asking "what did you accept, and on what rule?" gets
  // the answer from this row.
  audit({
    category: "KYC",
    action: "kyc.id.accepted",
    actorId: userId, targetType: "Kyc", targetId: k.id,
    payload: {
      idType,
      basis: "format+uniqueness",
      formatKind: spec.format.kind,
      flags: verdict.flags,
      expiryCaptured: idExpiry !== null,
    },
  });
  return { ok: true, data: { verified: true } };
}

/**
 * 🔴 THE INDEX THAT IS THE UNIQUENESS RULE — one document, one account, across all
 * four identity types. Declared in
 * prisma/migrations/20260820120000_kyc_identity_document.
 */
export const ID_UNIQUE_INDEX = "KycSubmission_idType_idNumber_active_key";

/**
 * Did this write lose the one-document-one-account race?
 *
 * Matches Prisma's P2002 (unique constraint) and, defensively, the raw Postgres
 * 23505 / index name — a PARTIAL unique index is created by raw SQL rather than
 * the Prisma DSL, so the driver does not always attach `meta.target`.
 *
 * ⚠️ IT USED TO ANSWER FOR TWO INDEXES, AND NOW THERE IS ONE. Through the expand
 * release a NIDA write touched both the tuple index and the legacy
 * `KycSubmission_nidaNumber_active_key`, and which one Postgres reported first was
 * not something this code should depend on. The legacy index is partial on
 * `nidaNumber IS NOT NULL`, and since the mirror write above was deleted nothing
 * populates that column — so it cannot fire again even while the column is still
 * physically there. ⛔ The `/nida/i` branch below stays: it matches the message of a
 * legacy-index violation from a row written BEFORE this release, which is the one
 * case where a real duplicate can still surface through the old name.
 */
export function isIdUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string; meta?: { target?: unknown } };
  const msg = String(e?.message ?? "");
  if (msg.includes(ID_UNIQUE_INDEX) || msg.includes("KycSubmission_nidaNumber_active_key")) return true;
  if (e?.code === "23505") return true;
  if (e?.code !== "P2002") return false;
  // P2002 on this table can only be an identity index — `id` is a cuid we generate
  // and `userId` is not unique — but check the target when we are given one.
  const t = e.meta?.target;
  const asText = Array.isArray(t) ? t.join(",") : String(t ?? "");
  return asText === "" || /nida|idnumber|idtype/i.test(asText) || asText.includes(ID_UNIQUE_INDEX);
}

/** Max decoded size of a document image, and the accepted data-URL shape. */
export const MAX_DOC_BYTES = 3 * 1024 * 1024; // 3 MB decoded — legible ID photos, bounded
const DOC_DATAURL_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
/** Validate an uploaded document image data URL. Returns decoded byte size. */
export function validateDocImage(s: string): { ok: true; bytes: number; mimeType: string } | { ok: false; error: string; reason: FailureReason } {
  const declared = DOC_DATAURL_RE.exec(s ?? "");
  if (!s || !declared) return { ok: false, error: "Document must be a JPG, PNG, or WebP image.", reason: "doc_image_type" };
  const b64 = s.slice(s.indexOf(",") + 1);
  const bytes = Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
  if (bytes <= 0) return { ok: false, error: "Empty image.", reason: "doc_image_type" };
  if (bytes > MAX_DOC_BYTES) return { ok: false, error: "Image too large. Use a photo under 3 MB.", reason: "doc_too_large" };
  // 🔴 The mime above is whatever the CLIENT wrote in the data URL. Identify the
  // format from the BYTES and require it to agree — otherwise a renamed .exe, a
  // zip, or an SVG carrying <script> is stored as a citizen's identity document
  // and an officer approves against something that is not an image at all.
  const actual = sniffBase64ImageMime(b64);
  if (!actual) return { ok: false, error: "That file isn't a JPG, PNG, or WebP image.", reason: "doc_image_type" };
  if (actual !== `image/${declared[1]}`) {
    return { ok: false, error: "That file isn't a JPG, PNG, or WebP image.", reason: "doc_image_type" };
  }
  // `actual` — sniffed from the bytes — not `declared`, which the client wrote.
  return { ok: true, bytes, mimeType: actual };
}

/**
 * Attach one image to a slot.
 *
 * ⛔ THE SLOT LIST IS NOT WRITTEN HERE. `ALL_DOC_SLOTS` is derived from the four
 * documents' own `requiredSlots`, so a fifth document type gets its slot accepted
 * by adding a catalogue row and nothing else — and, more importantly, a slot that
 * NO document asks for can never be accepted by this function. A hand-written union
 * here is how `PASSPORT` sat in the database enum, unused and unreachable, from the
 * first KYC release until 2026-08-20.
 */
export async function attachDocument(userId: string, docType: KycDocSlot, storageKey: string): Promise<ServiceResult> {
  if (!ALL_DOC_SLOTS.includes(docType)) {
    return { ok: false, error: "Unknown document slot.", code: "INVALID", reason: "doc_image_type" };
  }
  const valid = validateDocImage(storageKey);
  if (!valid.ok) return { ok: false, error: valid.error, code: "INVALID", reason: valid.reason };
  const k = await db.kyc.findByUserId(userId);
  if (!k) return { ok: false, error: "Start KYC first.", code: "NOT_FOUND" };
  // Re-uploading a document while it's already under review or approved would
  // change the evidence behind an officer's pending/made decision — block it.
  if (k.status === "PENDING_REVIEW" || k.status === "APPROVED") {
    return { ok: false, error: "Documents are locked while your submission is under review.", code: "INVALID", reason: "docs_locked" };
  }
  // H8: persist via the storage seam — INLINE (data URL) today, Cloudflare R2 the
  // moment it's configured, with no change to this call site.
  const storedKey = await putKycDocument(storageKey, `${userId}/${docType}`);
  // Carry the VERIFIED mime + size forward: once this is an `r2:<key>` the bytes
  // can no longer be measured from the stored value, and guessing produced
  // "0 bytes, application/octet-stream" for every R2 document.
  const docs = [...k.documents.filter((d: { docType: string }) => d.docType !== docType), { docType, storageKey: storedKey, uploadedAt: new Date().toISOString(), mimeType: valid.mimeType, sizeBytes: valid.bytes }];
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
  if (!valid.ok) return { ok: false, error: valid.error, code: "INVALID", reason: valid.reason };
  const k = await db.kyc.findByUserId(userId);
  if (!k) return { ok: false, error: "Start KYC first.", code: "NOT_FOUND" };
  if (k.status !== "ADDITIONAL_INFO_REQUIRED") {
    return { ok: false, error: "No extra documents are being requested right now.", code: "INVALID", reason: "no_extra_request" };
  }
  const requests: KycExtraRequest[] = k.extraRequests ?? [];
  const target = requests.find((r: KycExtraRequest) => r.id === requestId);
  if (!target) return { ok: false, error: "Unknown document request.", code: "NOT_FOUND" };
  const now = new Date().toISOString();
  const storedKey = await putKycDocument(storageKey, `${userId}/extra_${requestId}`);
  const next = requests.map((r: KycExtraRequest) => (r.id === requestId ? { ...r, storageKey: storedKey, uploadedAt: now } : r));
  await db.kyc.upsert({ ...k, extraRequests: next, updatedAt: now });
  audit({ category: "KYC", action: "kyc.extra_document.uploaded", actorId: userId, targetType: "Kyc", targetId: k.id, payload: { requestId, bytes: valid.bytes } });
  return { ok: true };
}

export async function submitForReview(userId: string): Promise<ServiceResult> {
  const k = await db.kyc.findByUserId(userId);
  if (!k) return { ok: false, error: "Start KYC first.", code: "NOT_FOUND" };
  if (!k.idVerifiedAt || !k.idType) return { ok: false, error: "Identity document not yet accepted.", code: "INVALID", reason: "id_not_verified" };
  // 🔴 THE REQUIRED SLOTS ARE THE ONES *THIS DOCUMENT* NEEDS — never a count.
  // `documents.length >= 3` was true of a NIDA and is a lie about a passport, and a
  // count can be satisfied by three copies of the same slot. Ask the catalogue
  // which slots are missing and name them.
  const missing = missingSlots(k.idType as IdDocType, k.documents.map((d: { docType: string }) => d.docType));
  if (missing.length > 0) {
    return { ok: false, error: `Missing document${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`, code: "INVALID", reason: "docs_required" };
  }
  // ⚠️ EXPIRY IS RE-CHECKED AT SUBMIT, not only at the identity step. A passport
  // accepted on Monday can be out of date by the time the documents are attached,
  // and an officer must never be handed an expired document to approve.
  if (isExpired(k.idExpiry ?? null, new Date())) {
    audit({ category: "COMPLIANCE", action: "kyc.id.expired_rejected", actorId: userId, targetType: "Kyc", targetId: k.id, payload: { idType: k.idType, expiry: k.idExpiry, at: "submit" } });
    return { ok: false, error: `That ${k.idType} expired on ${k.idExpiry}.`, code: "INVALID", reason: "id_expired" };
  }
  // If an officer requested extra documents, every slot must be filled before
  // the player can resubmit — otherwise it'd bounce straight back.
  const unfulfilled = (k.extraRequests ?? []).filter((r: KycExtraRequest) => !r.storageKey);
  if (unfulfilled.length > 0) {
    return { ok: false, error: `Please upload the ${unfulfilled.length} requested document${unfulfilled.length > 1 ? "s" : ""} before submitting.`, code: "INVALID", reason: "extra_docs_required" };
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
  notifyKyc(userId, "PENDING_REVIEW").catch(() => {}); // in-app "submitted, under review" notice

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
  // ⚠️ The document TYPE travels with the masked tail, because from 2026-08-20
  // "•••• 5678" alone no longer says what was submitted — and an officer opening
  // the queue decides which case to pick up from this line.
  const nidaMasked = `${k.idType ?? "ID"} •••• ${k.idNumber?.slice(-4) ?? ""}`;
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
/**
 * Force an already-APPROVED player to re-verify (audit §9.3 #4) — document
 * expiry, a name mismatch, suspicious activity. Moves KYC APPROVED →
 * ADDITIONAL_INFO_REQUIRED with the officer's reason, which (a) re-locks
 * WITHDRAWALS immediately (the withdraw gate requires kyc.status === "APPROVED")
 * and (b) reopens the document upload + resubmit flow so the player can
 * re-verify. Login/betting are left alone — this targets the money-out gate.
 * COMPLIANCE-audited; an officer cannot force-reverify themselves.
 */
export async function forceReverifyKyc(officerId: string, userId: string, reason: string): Promise<ServiceResult> {
  if (!userId) return { ok: false, error: "Missing user.", code: "INVALID" };
  if (officerId === userId) {
    audit({ category: "SECURITY", action: "kyc.reverify.self_blocked", actorId: officerId, targetType: "User", targetId: userId });
    return { ok: false, error: "You cannot force yourself to re-verify.", code: "INVALID" };
  }
  const clean = (reason ?? "").trim().slice(0, 300);
  if (clean.length < 5) return { ok: false, error: "A reason (≥ 5 characters) is required.", code: "INVALID" };
  return withLock(`kyc:${userId}`, async () => {
    const k = await db.kyc.findByUserId(userId);
    if (!k) return { ok: false as const, error: "No KYC submission for this user.", code: "NOT_FOUND" as const };
    if (k.status !== "APPROVED") {
      return { ok: false as const, error: `KYC is ${k.status} — only an APPROVED player can be forced to re-verify.`, code: "INVALID" as const };
    }
    const now = new Date().toISOString();
    await db.kyc.upsert({ ...k, status: "ADDITIONAL_INFO_REQUIRED", reviewerId: officerId, reviewedAt: now, rejectNote: clean, updatedAt: now });
    audit({ category: "COMPLIANCE", action: "kyc.force_reverify", actorId: officerId, targetType: "User", targetId: userId, payload: { kycId: k.id, reason: clean } });
    notifyKyc(userId, "ADDITIONAL_INFO").catch(() => {});
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: "Action needed · Please re-verify your identity",
      html: kycMoreInfoHtml({ reason: clean, reference: k.id }),
      tag: "kyc-more-info",
    })).catch(() => {});
    return { ok: true as const };
  });
}

/**
 * English one-liners per `KycRejectReason`, for the surfaces that have no
 * dictionary — today, the rejection email.
 *
 * ⛔ NOT for `/profile/kyc`. That page renders the enum member through
 * `humanizeRejectReason` in the player's own language; putting one of these in
 * front of it prints the reason twice, the second time in English, to the 44 of
 * 46 live users who are Swahili (§6 E-6).
 *
 * `SANCTIONED` says nothing about a list, deliberately — same rule as E-1.
 */
const REJECT_EMAIL_TEXT: Record<string, string> = {
  BLURRY_DOC: "The identity document photo was too blurry or dark to read.",
  DETAILS_MISMATCH: "The details entered do not match the identity document.",
  EXPIRED_ID: "The identity document has expired.",
  UNDERAGE: "You must be 18 or older to use 50pick.",
  DUPLICATE_IDENTITY: "This identity is already registered to another account.",
  SANCTIONED: "We're unable to verify this identity.",
  OTHER: "Please check your documents and submit again.",
};

export async function reviewKyc(opts: {
  officerId: string;
  userId: string;
  decision: "APPROVE" | "REJECT" | "REQUEST_INFO";
  reason?: string;
  note?: string;
  /** REJECT only: the categorised `KycRejectReason`. Defaults to OTHER, which is
   *  correct for a free-text rejection but was previously forced on EVERY manual
   *  rejection — the officer picked "Details mismatch" and both the compliance
   *  record and the player read "other". */
  rejectCode?: "BLURRY_DOC" | "DETAILS_MISMATCH" | "EXPIRED_ID" | "UNDERAGE" | "SANCTIONED" | "DUPLICATE_IDENTITY" | "OTHER";
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
  //
  // A CATEGORISED rejection is the exception: `humanizeRejectReason` renders the
  // enum member as a translated sentence on /profile/kyc, so the player is told
  // why in their own language with no free text at all. OTHER renders nothing,
  // so an uncategorised rejection still has to carry words or the player is told
  // they were rejected and nothing else. This rule pre-dates categorised
  // rejections, which is why it forced the officer's screen to prepend an
  // English sentence to every reason (§6 E-6).
  const categorised = (opts.rejectCode ?? "OTHER") !== "OTHER";
  if (decision === "REJECT" && !categorised && reason.length < 5) {
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
      notifyKyc(userId, "APPROVED").catch(() => {});
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
      notifyKyc(userId, "ADDITIONAL_INFO").catch(() => {});
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
    // enum. (Writing free text into the enum column threw in Postgres and lost
    // the decision in prod — hence the strict `rejectCode` union above.)
    // `rejectCode` carries the officer's CHOSEN category; OTHER only when the
    // caller genuinely has none. Hard-coding OTHER here made every rejection on
    // production uncategorised and printed "Reason: other." to the player.
    const rejectCode = opts.rejectCode ?? "OTHER";
    // Empty, not "": a categorised rejection needs no free text, and the column
    // is nullable. Anything stored here is shown to the player VERBATIM, in
    // whatever language it was written — which is why nothing English is put
    // here on behalf of the officer (§6 E-6).
    const officerNote = (opts.note?.trim() || reason) || null;
    await db.kyc.upsert({ ...k, status: "REJECTED", rejectReason: rejectCode, rejectNote: officerNote, reviewerId: officerId, reviewedAt: now, updatedAt: now });
    audit({ category: "KYC", action: "kyc.rejected", actorId: officerId, targetType: "User", targetId: userId, payload: { kycId: k.id, reason: officerNote, rejectCode } });
    notifyKyc(userId, "REJECTED").catch(() => {});
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: "Identity check needs attention",
      // The email has no dictionary, so it falls back to an English rendering of
      // the category rather than going out with a blank reason line.
      html: kycRejectedHtml({ reason: officerNote ?? REJECT_EMAIL_TEXT[rejectCode], reference: k.id }),
      tag: "kyc-rejected",
    }));
    return { ok: true as const };
  });
}
