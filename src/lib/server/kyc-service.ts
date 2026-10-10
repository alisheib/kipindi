/**
 * KYC service — Tanzania-aligned, GBT-acceptable workflow.
 *
 * ⭐ FOUR WAYS TO PROVE WHO YOU ARE (owner decision, Ali 2026-08-19). A player
 * proves identity with ANY ONE of NIDA, passport, driving licence or voter's card.
 * Which documents exist, what their numbers must look like, which images each one
 * requires and whether it carries an expiry are ALL declared in ONE place —
 * `src/lib/id-documents.ts`. ⛔ Nothing in this file may hard-write a fifth answer.
 *
 * ⭐ TWO TRACKS SINCE 2026-10-10 (owner ruling, Ali, relaying the Gaming Board's request that players no
 * longer upload identity documents — docs/COMPLIANCE-DECISIONS.md, "2026-10-10 · Players verify identity
 * with typed details"):
 *
 *  · TYPED (every player) — `verifyIdentity`: ONE press. Document type + number (+ expiry where the
 *    document has one) + full name; the date of birth is the ACCOUNT's (`User.dob`). Format, expiry,
 *    uniqueness and the automatic checks (`kyc-auto-checks.ts`) run, and the identity is APPROVED AT ONCE
 *    when they pass — officers check those approvals afterwards (`markPostChecked`). Narrow cases ROUTE to
 *    an officer instead (PENDING_REVIEW); none of them is a refusal.
 *  · AGENT (agent applicants only) — `submitIdentityStep` → `attachDocument` (the document's photos and a
 *    selfie) → `submitForReview` → an officer approves on the photos (`reviewKyc`, photo mode), which stamps
 *    `photoVerifiedAt`, the agent programme's identity gate. Exactly as before 2026-10-10.
 *
 *  APPROVED opens WITHDRAWAL — the only money action identity decides since the owner ruling of
 *  2026-09-13 (see `kyc-gate.ts`). REJECTED returns a reason code; a FINAL code (`kyc-refusal.ts`)
 *  also freezes the wallet and keeps the document number reserved.
 *
 * Compliance:
 *  - Every step audited (KYC category) with correlation IDs.
 *  - PII at rest in fields only; not in logs. Audit payloads carry the document TYPE, the keyed
 *    fingerprint and the last four characters — never the number, a name, a date or an officer's note.
 *  - Documents are storage keys; binaries never enter app DB.
 */
import { appUrl } from "@/lib/app-url";
import { audit, getAuditForTargetsDurable } from "./audit";
import { db } from "./store";
import type { KycPriorIdentity, StoredKyc } from "./store";
import { randomId, identityFingerprint, pepperedLetters } from "./crypto";
import { putKycDocument } from "./storage";
import { sniffBase64ImageMime } from "./image-signature";
import { verifyNida } from "./nida";
import { rateCheckAsync, rateRefundAsync } from "./rate-limit";
import { KycIdentitySchema, type KycIdentityInput } from "./validators";
import {
  ID_DOC_SPECS,
  ALL_DOC_SLOTS,
  MAX_DOC_BYTES,
  MIN_AGE_YEARS,
  ageOnPlatformDate,
  isExpired,
  isIdDocType,
  isOfAge,
  missingSlots,
  normaliseIdNumber,
  photoSetComplete,
  photoSetStampedBy,
  validateIdNumber,
  type IdDocType,
  type IdNumberFlag,
  type KycDocSlot,
} from "@/lib/id-documents";
import { uncheckedAutomaticApproval } from "@/lib/kyc-approval";
import type { ServiceResult } from "./auth-service";
import type { FailureReason } from "@/lib/failure-reasons";
import { notifyKyc, notifyAdminKycReview, kycOfficerRoles } from "./notification-service";
import { sendEmail, sendEmailToUser, kycRejectedHtml, kycApprovedHtml, kycSubmittedHtml, kycSubmittedAdminHtml, kycMoreInfoHtml } from "./email";
import { resolvePhoneEmail } from "./email-map";
import { runOutsideLock, withLock } from "./locks";
import { displayLabel } from "@/lib/display-label";
import { isFinalRefusal, isDecidableRefusalCode } from "@/lib/kyc-refusal";
import { addWalletFreeze, removeWalletFreeze, staleIdentityHold, freezeWalletByOfficer, OFFICER_FREEZE_REASON_MIN } from "./wallet-freeze";
import { currentFreezeReasons } from "@/lib/wallet-freeze-reasons";
import { kycRiskScore, KYC_MAKER_CHECKER_THRESHOLD } from "./kyc-risk";
import {
  decideKyc,
  nidaSaysUnder18,
  samePersonNameKey,
  ROUTE_REASON_LABEL,
  type KycDecision,
  type KycDecisionFacts,
  type KycFlag,
  type KycRouteReason,
} from "@/lib/kyc-auto-checks";
import { ATTESTATION_SET_ID, parseAttestations, type KycAttestationMode } from "@/lib/kyc-attestations";

export type { KycIdentityInput } from "./validators";

/** Which identity track a verification is on — typed details (players) or photos + selfie (agent applicants). */
export type KycTrack = "typed" | "agent";

/** The refusal codes an officer's form may post. ⛔ `BLURRY_DOC` stays in the type (legacy rows display it) but is refused for a new decision. */
export type KycRejectCode = "BLURRY_DOC" | "DETAILS_MISMATCH" | "EXPIRED_ID" | "UNDERAGE" | "SANCTIONED" | "DUPLICATE_IDENTITY" | "OTHER";

// ⭐ THE BASE URL HAS ONE HOME: `appUrl()` (`src/lib/app-url.ts`).
// 🔴 This file carried a private `BASE_URL` defaulting to `kipindi-production.up.railway.app`
// until 2026-09-07 — a RETIRED host, and precisely the failure `app-url.ts` exists to prevent:
// its own header says the old default "meant any environment that forgot the env var would email
// people a railway.app link". Five files kept a copy of the bug beside the fix.

/** First word of a full name, used as a friendly greeting in emails. */
function firstName(full?: string | null): string | undefined {
  return full?.trim().split(/\s+/)[0] || undefined;
}

/** Mask a phone for an email body: keep country code + last 2 (e.g. "+25570*****19"). */
function maskPhone(phone?: string | null): string {
  const p = (phone ?? "").trim();
  return p.length > 6 ? `${p.slice(0, 6)}*****${p.slice(-2)}` : "****";
}

/** The last four characters of a document number — the most an audit row or an email ever carries. */
function last4(n: string | null | undefined): string | null {
  const s = (n ?? "").trim();
  return s ? s.slice(-4) : null;
}

/** The facts a version token is built from — every KYC shape on the server carries them (`StoredKyc`). */
type KycVersionFacts = {
  updatedAt: string;
  status: string;
  idType?: string | null;
  idNumber?: string | null;
  idExpiry?: string | null;
  fullName?: string | null;
  dob?: string | null;
};

/**
 * The IDENTITY half of a version token: a keyed digest of what an officer decides ON — the status and the typed
 * identity (type, normalised number, expiry, full name, date of birth). ⛔ KEYED (`pepperedLetters`, the
 * `identityFingerprint` pepper) and letters-only: the token travels in an officer's form, and a plain hash of a
 * document number is a guessable stand-in for the number itself.
 */
function kycIdentityDigest(k: KycVersionFacts): string {
  const day = (v: string | null | undefined) => (v ? String(v).slice(0, 10) : null);
  return pepperedLetters("kyc-version", JSON.stringify([
    k.status,
    k.idType ?? null,
    normaliseIdNumber(k.idNumber ?? "") || null,
    day(k.idExpiry),
    k.fullName ?? null,
    day(k.dob),
  ]), 24);
}

/**
 * The officer forms' VERSION token for a submission: `<updatedAt>~<identity digest>`. Every officer form posts the
 * version it rendered, and the service refuses a decision on a row that changed since — so an officer never decides
 * on details the player has since corrected, and a recommendation made on one version never seals another
 * (`getApprovalRecommendation`).
 *
 * ⭐ TWO HALVES, TWO QUESTIONS (2026-10-10, review R1.6). A POSITIVE act — APPROVE, a two-officer recommendation,
 * Mark checked — needs the row EXACTLY as the officer saw it (`sameRowVersion`: any write moves `updatedAt`). A
 * REFUSAL-type act — reject (recoverable or final), ask for corrections, correct the date of birth — needs only the
 * IDENTITY the officer saw (`sameIdentityVersion`): a write that changes no identity fact (a photo attached on the
 * agent track, a post-check stamp) must never void an officer's refusal. 🔴 With `updatedAt` alone, a player posting
 * a photo every few seconds voided every refusal of their own unchecked automatic approval, the final ones included.
 * ⛔ The officer screens post this token unchanged (`page.tsx` → the rail and the date-of-birth form, and
 * `approveAgent`); nothing outside this file reads its parts.
 */
export function kycRowVersion(k: KycVersionFacts): string {
  return `${k.updatedAt}~${kycIdentityDigest(k)}`;
}

/** A positive act's version check: the row exactly as the officer saw it. */
function sameRowVersion(k: KycVersionFacts, posted: string): boolean {
  return !!posted && kycRowVersion(k) === posted;
}

/** A refusal-type act's version check: the identity as the officer saw it. A token with no digest (an old form) is stale. */
function sameIdentityVersion(k: KycVersionFacts, posted: string): boolean {
  const cut = (posted ?? "").lastIndexOf("~");
  return cut > 0 && posted.slice(cut + 1) === kycIdentityDigest(k);
}

/**
 * Recipients for the "new KYC to verify" admin email (Decision 2026-06-14: every officer with a resolvable email).
 * `KYC_NOTIFY_EMAILS` (comma-separated) is the later "only some accounts" override and still wins. Best-effort:
 * returns a deduped, lowercased list; `[]` simply means the admin email is skipped.
 * ⭐ THE SAME AUDIENCE AS THE BELL (2026-10-10, review R4.5): `kycOfficerRoles()` — the roles that can open AND act on
 * `/admin/kyc/<userId>`, the link this email carries (ADMIN and COMPLIANCE by default). It read a hard-coded
 * ADMIN / COMPLIANCE / MODERATOR set, so the Trading role was emailed a case page its grants refuse to open, while
 * the bell had already moved. The agent programme's admin email (`agent-application-service.ts`) reads this too.
 */
export async function kycNotifyEmails(): Promise<string[]> {
  const override = (process.env.KYC_NOTIFY_EMAILS ?? "").trim();
  let raw: string[];
  if (override) {
    raw = override.split(",");
  } else {
    const roles = new Set(await kycOfficerRoles());
    const users = await db.user.list();
    raw = users
      .filter((u) => roles.has(u.role))
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
  // ⛔ A FINAL REFUSAL IS NOT RESTARTED BY THE PLAYER (2026-09-13 — docs/COMPLIANCE-DECISIONS.md, S1).
  // Two reasons, both of which only exist because money is now played before identity is checked:
  //   · S2 — the loop was unbounded. A player refused at cash-out could restart and resubmit forever
  //     while their balance sat frozen and the officer's queue took the load.
  //   · S16 — the reset below nulls `idNumber`, which would RELEASE a number the final refusal keeps
  //     reserved, handing the document to the next account that presents it.
  // The door back is an officer: `reopenFinalRefusal`, with a written reason, when a final call was
  // wrong. A RECOVERABLE refusal restarts exactly as before.
  if (existing?.status === "REJECTED" && isFinalRefusal(existing.rejectReason)) {
    audit({ category: "COMPLIANCE", action: "kyc.restart_refused_final", actorId: userId, targetType: "Kyc", targetId: existing.id, payload: { rejectReason: existing.rejectReason } });
    return {
      ok: false,
      error: "This verification was refused and cannot be restarted. Contact support.",
      code: "INVALID",
      reason: "kyc_refused_final",
    };
  }
  // ⛔ ONE RESET SHAPE, shared with the officer's re-opening of a final refusal — the tuple clears
  // together and `approvedAt` survives. `restartedSubmission` carries both rules and their reasons.
  // ⭐ AND THE OFFICER WHO REFUSED IT IS CARRIED THROUGH THE RESTART (2026-10-10). From that release a typed
  // identity is approved automatically unless something routes it — and "an officer has already ruled on
  // this identity" is one of those things. A restart that dropped `reviewerId` would let a player an officer
  // refused (recoverably) restart and be approved by the machine a minute later, on the same details.
  const reviewer = existing?.status === "REJECTED" && existing.reviewerId
    ? { officerId: existing.reviewerId, at: existing.reviewedAt ?? new Date().toISOString() }
    : undefined;
  const k = await db.kyc.upsert(restartedSubmission(existing, userId, reviewer, "restart"));
  audit({ category: "KYC", action: "kyc.started", actorId: userId, targetType: "Kyc", targetId: k.id, payload: reviewer ? { officerProvenance: true } : undefined });
  return { ok: true, data: { kycId: k.id } };
}

/**
 * ⛔ THE PLAYER'S OWN WRITES STOP AT THE DOORS AN OFFICER'S DECISION CLOSED (found 2026-09-13, audit session 95).
 *
 * `startKyc` refused to restart a FINAL refusal, and the verification page hid its step forms — but the three
 * step functions below asked only "does a row exist?". A server action is a reachable endpoint whether or not a
 * page renders its form, so one POST from a finally refused player could:
 *   · `submitForReview` — move REJECTED/UNDERAGE back to PENDING_REVIEW, dropping the case off the refused-funds
 *     report and out of `refusedFundsPosition`, and ping every officer;
 *   · `submitIdentityStep` — replace the reserved document number (S16 undone: the index releases the old one),
 *     or, through the NIDA mock's mismatch path, overwrite UNDERAGE with a RECOVERABLE code, after which
 *     `startKyc` restarts and an officer's Unfreeze treats the identity hold as stale;
 *   · `attachDocument` — replace the images the refusal was decided on.
 * And on an APPROVED or PENDING_REVIEW row `submitIdentityStep` rewrote the identity tuple with no review at all:
 * the approval stayed, the number an officer approved was released for another account, and the account kept
 * its withdrawal right on an identity nobody had seen.
 *
 * So: a FINAL refusal is closed to every player write (the door back is `reopenFinalRefusal`, an officer's act),
 * and the identity tuple is locked while a submission is with an officer or approved. A RECOVERABLE refusal
 * stays open on the server, and the refusal already freed the number.
 *
 * ⭐ THE RULES SINCE 2026-10-10 (typed-only KYC):
 *   · identity — PENDING_REVIEW / APPROVED: locked (`docs_locked`). ADDITIONAL_INFO_REQUIRED on an account
 *     APPROVED ONCE (`approvedAt`): the name and expiry may be corrected, the document TYPE and NUMBER may not
 *     (`identity_number_locked`) — the 2026-09-13 P0 lock, narrowed to what it protects: one POST replacing the
 *     approved number frees it for another account on exactly the account an officer flagged. A document that
 *     genuinely changed goes through an officer's recoverable refusal and a restart. IN_PROGRESS is OPEN: a
 *     restart already released the approved tuple, and the old `approvedAt && idVerifiedAt` lock stranded rows.
 *   · documents (the agent photo track) — PENDING_REVIEW locked; APPROVED allowed only while no officer's PHOTO
 *     approval stands over the photos on file (`photoStampStands` — a typed-verified player adding photos to become an
 *     agent; or a stray stamp with no photos it approved, which therefore locks nothing).
 *   · submit — the final-refusal door only; `submitForReview` asks the rest itself.
 */
type PlayerStep = "identity" | "documents" | "submit";
type KycRow = NonNullable<Awaited<ReturnType<typeof db.kyc.findByUserId>>>;
type IdentityTuple = { idType: string; idNumber: string };

/** Does this row hold exactly this (type, number)? Normalised on both sides; an empty number never matches. */
function sameTuple(k: { idType?: string | null; idNumber?: string | null }, idType: string, idNumber: string): boolean {
  const held = normaliseIdNumber(k.idNumber ?? "");
  return !!held && (k.idType ?? "") === idType && held === normaliseIdNumber(idNumber);
}

/**
 * ⛔ ONE PREDICATE FOR "PHOTO-VERIFIED" (2026-10-10) — the same question the agent gates ask
 * (`photoIdentityVerified`, `agent-identity.ts`), through the same pure helper (`photoSetStampedBy`, `id-documents.ts`):
 * APPROVED, the officer's photo stamp, AND the photos it approved still on file — the full set, every image uploaded no
 * later than the stamp. A stamp alone is not enough: a stamp whose photos are gone (a pre-release restart cleared them)
 * would lock the documents step and short-circuit the send while the agent gates keep refusing — a dead end with no way
 * out. ⭐ And photos uploaded AFTER the stamp are not the ones it approved (review R5.2): they neither lock the documents
 * step nor short-circuit the send, so the send reaches an officer, whose photo approval stamps anew.
 */
function photoStampStands(k: { status: string; photoVerifiedAt?: string | null; idType?: string | null; documents?: readonly { docType: string; uploadedAt?: string | null }[] }): boolean {
  return k.status === "APPROVED" && photoSetStampedBy(k.idType, k.documents, k.photoVerifiedAt);
}

function closedToPlayer(
  k: { id: string; userId: string; status: string; rejectReason?: string | null; approvedAt?: string | null; idType?: string | null; idNumber?: string | null; photoVerifiedAt?: string | null; documents?: readonly { docType: string; uploadedAt?: string | null }[] },
  step: PlayerStep,
  next?: IdentityTuple,
): ServiceResult<never> | null {
  if (k.status === "REJECTED" && isFinalRefusal(k.rejectReason)) {
    audit({ category: "COMPLIANCE", action: "kyc.player_write_refused_final", actorId: k.userId, targetType: "Kyc", targetId: k.id, payload: { step, rejectReason: k.rejectReason } });
    return { ok: false, error: "This verification was refused and cannot be changed. Contact support.", code: "INVALID", reason: "kyc_refused_final" };
  }
  if (step === "identity") {
    if (k.status === "PENDING_REVIEW" || k.status === "APPROVED") {
      audit({ category: "SECURITY", action: "kyc.identity_locked_blocked", actorId: k.userId, targetType: "Kyc", targetId: k.id, payload: { status: k.status, approvedOnce: !!k.approvedAt } });
      return { ok: false, error: "Your identity details are locked while your submission is with our team or approved.", code: "INVALID", reason: "docs_locked" };
    }
    if (k.status === "ADDITIONAL_INFO_REQUIRED" && !!k.approvedAt && next && !!k.idType && !!k.idNumber && !sameTuple(k, next.idType, next.idNumber)) {
      audit({ category: "SECURITY", action: "kyc.identity_number_locked_blocked", actorId: k.userId, targetType: "Kyc", targetId: k.id, payload: { status: k.status, heldType: k.idType, triedType: next.idType } });
      return { ok: false, error: "The document number can't be changed here. Contact us if your document has changed.", code: "INVALID", reason: "identity_number_locked" };
    }
  }
  if (step === "documents") {
    // Re-uploading a document while it's under review would change the evidence behind an officer's pending
    // decision; once an officer has approved the photos, they are that decision's evidence.
    if (k.status === "PENDING_REVIEW" || photoStampStands(k)) {
      return { ok: false, error: "Documents are locked while your submission is under review.", code: "INVALID", reason: "docs_locked" };
    }
  }
  return null;
}

/** The FINAL-refusal door alone — what the typed path asks before its idempotency check (see `verifyIdentity`). */
function closedFinal(k: KycRow): ServiceResult<never> | null {
  // On a final refusal `closedToPlayer` answers at its first branch, whatever the step.
  return k.status === "REJECTED" && isFinalRefusal(k.rejectReason) ? closedToPlayer(k, "identity") : null;
}

/**
 * ⛔ THE CHECK AND THE WRITE READ THE SAME ROW (P0 adversarial review, 2026-09-13).
 *
 * `closedToPlayer` above ran on the copy each step read at its start — and each step then awaited something slow
 * (an R2 upload, the NIDA check's fixed latency, an email write) and wrote `{ ...thatCopy, … }` back. `kyc.upsert`
 * replaces the whole row, status and refusal code included, with no version check. So an officer's FINAL refusal
 * that landed during the await was silently REVERTED by the player's write: the case left REJECTED, fell off the
 * refused-funds report, and the officer's Unfreeze then read the identity hold as stale.
 *
 * So every player write happens here: under `kyc:<userId>` — the lock `reviewKyc`, `askForCorrections` and
 * `reopenFinalRefusal` already hold while they decide — re-reading the row, re-asking `closedToPlayer` on THAT copy,
 * and building the write from it. The slow work stays outside, before the lock.
 * `before` answers an idempotent re-press from the fresh row BEFORE the doors are asked (an approved identity
 * pressed again is a success, not a "locked" refusal).
 */
async function underSubmissionLock<T>(
  userId: string,
  stale: KycRow,
  step: PlayerStep,
  write: (fresh: KycRow) => Promise<ServiceResult<T>>,
  opts: { next?: IdentityTuple; before?: (fresh: KycRow) => ServiceResult<T> | null } = {},
): Promise<ServiceResult<T>> {
  return withLock(`kyc:${userId}`, async (): Promise<ServiceResult<T>> => {
    const fresh = await db.kyc.findByUserId(userId);
    if (!fresh || fresh.id !== stale.id) {
      return { ok: false, error: "Your verification changed while this was being saved. Reload the page and try again.", code: "INVALID" };
    }
    const early = opts.before?.(fresh);
    if (early) return early;
    const closed = closedToPlayer(fresh, step, opts.next);
    if (closed) return closed;
    return write(fresh);
  });
}

// ── PRIOR IDENTITIES — the typed details are the only identification record now ─────────────────────────────

/** The identity a row holds, as a history entry — or null when it holds none. */
function priorIdentityOf(k: KycRow | StoredKyc, cause: KycPriorIdentity["cause"], at: string): KycPriorIdentity | null {
  if (!k.idType && !k.idNumber) return null;
  return {
    idType: k.idType ?? null,
    idNumber: k.idNumber ?? null,
    idExpiry: k.idExpiry ?? null,
    fullName: k.fullName ?? null,
    dob: k.dob ? String(k.dob).slice(0, 10) : null,
    idFingerprint: k.idFingerprint ?? null,
    status: k.status,
    approvedAt: k.approvedAt ?? null,
    reviewerId: k.reviewerId ?? null,
    cause,
    supersededAt: at,
  };
}

/** The most prior identities one row keeps (2026-10-10, review R2.7) — see `capPriorIdentities`. */
const PRIOR_IDENTITIES_CAP = 20;

/**
 * ⛔ BOUNDED. The newest `PRIOR_IDENTITIES_CAP` entries, oldest first — plus, when it would otherwise fall off, the FIRST
 * entry carrying an `approvedAt`: the identity the account held when it was first approved (the first identity
 * superseded after that approval is the approved one), which is the entry an inspector asks for first. The whole list
 * travels on every `findByUserId` (sign-in, the money gate), so it cannot grow without limit.
 */
function capPriorIdentities(list: KycPriorIdentity[]): KycPriorIdentity[] {
  if (list.length <= PRIOR_IDENTITIES_CAP) return list;
  const anchor = list.findIndex((e) => !!e.approvedAt);
  const keepFrom = list.length - PRIOR_IDENTITIES_CAP;
  if (anchor < 0 || anchor >= keepFrom) return list.slice(keepFrom);
  return [list[anchor], ...list.slice(keepFrom + 1)];
}

/**
 * ⛔ APPEND-ONLY, NEVER RE-ORDERED, AND CAPPED (`capPriorIdentities`). The row's history plus the identity it holds now
 * (when it holds one): an inspector asking "which documents did this account ever present?" reads this list.
 * ⭐ ONE WRITER — every append goes through here (`restartedSubmission`, the two identity steps, `correctDateOfBirth`).
 */
function withPriorIdentity(k: KycRow | StoredKyc, cause: KycPriorIdentity["cause"], at: string): KycPriorIdentity[] {
  const list = Array.isArray(k.priorIdentities) ? [...k.priorIdentities] : [];
  const prior = priorIdentityOf(k, cause, at);
  return capPriorIdentities(prior ? [...list, prior] : list);
}

/**
 * Does the next identity differ from the one the row holds, in ANY identity fact — type, normalised number, expiry,
 * full name or date of birth? (2026-10-10, reviews R1.7/R2.6.) ⭐ A name or an expiry correction is the ONLY change an
 * account approved once may make (`closedToPlayer`), so a history that recorded only a new type or number lost exactly
 * the name the account was approved under.
 */
function identityDiffers(
  k: { idType?: string | null; idNumber?: string | null; idExpiry?: string | null; fullName?: string | null; dob?: string | null },
  next: { idType: string; idNumber: string; idExpiry: string | null; fullName: string; dob: string | null },
): boolean {
  const day = (v: string | null | undefined) => (v ? String(v).slice(0, 10) : "");
  return (k.idType ?? "") !== next.idType
    || normaliseIdNumber(k.idNumber ?? "") !== normaliseIdNumber(next.idNumber)
    || day(k.idExpiry) !== day(next.idExpiry)
    || (k.fullName ?? "").trim() !== next.fullName.trim()
    || day(k.dob) !== day(next.dob);
}

/**
 * Was the identity this row holds RELIED ON — approved, refused, sent or routed to an officer, or asked to be corrected?
 * (2026-10-10, review R2.7.) Only then is it history. ⛔ An IN_PROGRESS (or NOT_STARTED) tuple was never decided: the
 * agent track's "save details" writes one with no decision, so appending on every such edit let any player grow the
 * list without bound (one raw number per entry) through the rate limit's ~720 saves a day.
 */
function identityWasDecided(k: { status: string }): boolean {
  return k.status !== "IN_PROGRESS" && k.status !== "NOT_STARTED";
}

/**
 * The prior identities a player's identity step writes: the held identity is appended (cause "correction") when it was
 * DECIDED and the next one differs from it in any identity fact; otherwise the list is carried unchanged.
 */
function priorIdentitiesForStep(
  k: KycRow,
  next: { idType: string; idNumber: string; idExpiry: string | null; fullName: string; dob: string | null },
  at: string,
): KycPriorIdentity[] {
  const holds = !!k.idType && !!k.idNumber;
  if (holds && identityWasDecided(k) && identityDiffers(k, next)) return withPriorIdentity(k, "correction", at);
  return Array.isArray(k.priorIdentities) ? k.priorIdentities : [];
}

/**
 * ⭐ OFFICER PROVENANCE (2026-10-10). An identity an officer has already ruled on goes back to an officer,
 * never to the machine: a reviewer on the row (carried through a restart and a re-open), or corrections asked.
 * ⭐ AND THE DURABLE TRAIL (`readSideFacts` → `officerHistory`, reviews R1.3/R2.1): the row alone cannot answer it for
 * a row the OLD build restarted after an officer's refusal — that restart wrote `reviewerId: null`.
 */
function hasOfficerProvenance(k: { reviewerId?: string | null; status: string }): boolean {
  return k.reviewerId != null || k.status === "ADDITIONAL_INFO_REQUIRED";
}

/**
 * The officer acts that give an identity its provenance, as the durable audit trail records them (target User). The
 * pre-release names are here on purpose: `kyc.more_info_requested` and `kyc.force_reverify` are what the old build
 * wrote, and the rows it restarted are the ones that lost `reviewerId`.
 */
const OFFICER_IDENTITY_ACTS = ["kyc.rejected", "kyc.more_info_requested", "kyc.force_reverify", "kyc.corrections_asked", "kyc.refusal_reopened", "kyc.dob_corrected"] as const;
/** The officer's escalation of an identity to AML (`escalateKycToAmlAction`, target User). */
const AML_ESCALATION_ACTION = "kyc.escalated_to_aml";
/** An under-18 date of birth the PLAYER entered (`parseIdentity`, `refuseUnderage` — actor the player, target User). One
 *  name for the writers and the reader (`readUnderageAttempt`), so the route can never look for a fact nobody writes. */
const UNDERAGE_ATTEMPT_ACTION = "kyc.identity.underage_attempt";
/** "Since the beginning" for a filtered durable read. */
const TRAIL_EPOCH_ISO = "1970-01-01T00:00:00.000Z";

/** An actor that is an officer acting on this player — never the machine (null, "system…") and never the player. */
function isOfficerActor(actorId: string | null | undefined, userId: string): boolean {
  return !!actorId && actorId !== userId && !actorId.startsWith("system");
}

// ── THE IDENTITY STEP, SHARED BY BOTH TRACKS ─────────────────────────────────────────────────────────────────

type ParsedIdentity = {
  user: NonNullable<Awaited<ReturnType<typeof db.user.findById>>>;
  k: KycRow;
  idType: IdDocType;
  idNumber: string;
  idExpiry: string | null;
  fullName: string;
  /** YYYY-MM-DD. */
  dob: string;
  /** True when `dob` is the account's (`User.dob`); false when the player typed it (an account with none). */
  dobFromAccount: boolean;
  formatFlags: readonly IdNumberFlag[];
  formatKind: string;
};
type ParseOutcome =
  | { kind: "ok"; p: ParsedIdentity }
  | { kind: "fail"; result: ServiceResult<never> }
  /** A decision was WRITTEN (an UNDERAGE or NIDA refusal) — the caller reports it as an outcome, not an error. */
  | { kind: "refused"; reason: string };

/**
 * The identity step, for ANY ONE of the four documents — every check that runs BEFORE the lock.
 *
 * Order matters and every step is here for a reason it has already been bitten by:
 *
 *  1. RATE LIMIT — an identity field is a guessing surface.
 *  2. THE DATE OF BIRTH — ⭐ the ACCOUNT's since 2026-10-10. `User.dob` arrives from Prisma as a full ISO
 *     timestamp, so it is normalised with `.slice(0, 10)` BEFORE the schema (whose `dob` is `YYYY-MM-DD`);
 *     only an account with none types one. An account date under 18 is the FINAL refusal path; a typed one
 *     under 18 is audited and refused by the schema.
 *  3. SHAPE (`KycIdentitySchema`) — a real type, a number, a name, a DOB ≥ 18.
 *     ⭐ The AGE GATE LIVES ON THE DECLARED DOB, so it covers all four types. Only
 *     a NIDA carries a date of birth inside the number; an age check derived from
 *     the number would be silently NIDA-only, which is a control that passes
 *     because the feature is absent.
 *  4. FORMAT (`validateIdNumber`) — the ONE catalogue. Published rules refuse;
 *     advisory shapes only flag; the two documents with no published format are
 *     held to a sanity band and nothing more, by owner instruction.
 *  5. EXPIRY — asked for, and enforced, only where the document has one.
 * Uniqueness and the NIDA seam follow in `checkIdentityAvailable`; the write, whose losing racer is caught
 * by the partial unique index, happens under the lock.
 */
async function parseIdentity(userId: string, input: KycIdentityInput, preCheck: (k: KycRow) => ServiceResult<never> | null): Promise<ParseOutcome> {
  const rl = await rateCheckAsync(userId, "kyc.submit");
  if (!rl.allowed) return { kind: "fail", result: { ok: false, error: "Too many attempts.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec } };

  const user = await db.user.findById(userId);
  if (!user) return { kind: "fail", result: { ok: false, error: "Account not found.", code: "NOT_FOUND" } };

  let k = await db.kyc.findByUserId(userId);
  if (!k) {
    // The page opens a submission when it renders; a caller that skipped it (a script, a stale tab) gets one here.
    const started = await startKyc(userId);
    if (!started.ok) return { kind: "fail", result: started as ServiceResult<never> };
    k = await db.kyc.findByUserId(userId);
  }
  if (!k) return { kind: "fail", result: { ok: false, error: "Start KYC first.", code: "NOT_FOUND" } };
  // ⛔ Before anything else touches the row — see `closedToPlayer`.
  const closed = preCheck(k);
  if (closed) return { kind: "fail", result: closed };

  // ── THE DATE OF BIRTH — the account's, normalised BEFORE the schema ─────────
  const accountDob = user.dob ? String(user.dob).slice(0, 10) : "";
  const dobFromAccount = accountDob !== "";
  const typedDob = String(input.dob ?? "").trim().slice(0, 10);
  const dob = dobFromAccount ? accountDob : typedDob;
  const claimedType = typeof input.idType === "string" ? input.idType : null;

  if (dobFromAccount) {
    // ⭐ UNDERAGE ON THE ACCOUNT'S DATE IS THE FINAL PATH. Registration refuses an under-18 date, so this is
    // reachable only through an officer's correction of the account date or a legacy row — and the schema
    // below would refuse it as a plain form error, which is not what a minor holding money is owed.
    const accountAge = ageOnPlatformDate(accountDob, new Date());
    if (Number.isFinite(accountAge) && accountAge < MIN_AGE_YEARS) {
      const refused = await refuseUnderage(userId, k, claimedType);
      if (!refused.ok) return { kind: "fail", result: refused };
      return { kind: "refused", reason: "UNDERAGE" };
    }
  } else if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(typedDob) && Date.parse(`${typedDob}T00:00:00Z`) <= Date.now() && !isOfAge(typedDob, new Date())) {
    // A TYPED date under 18 (an account with no date on file). The schema refuses it below as a form error —
    // the date is the player's claim and nothing has been recorded against the account yet — but the attempt
    // itself is a compliance fact. ⭐ And an AGE FACT (2026-10-10, review R5.8): the player's next press goes to an
    // officer (`UNDERAGE_ATTEMPT`, read back by `readUnderageAttempt`) — an adult date retyped a minute after an
    // under-18 one is the case the age control exists for. Awaited, so the fact is on record before the refusal returns.
    await audit({ category: "COMPLIANCE", action: UNDERAGE_ATTEMPT_ACTION, actorId: userId, targetType: "User", targetId: userId, payload: { idType: claimedType, source: "typed" } });
  }

  const parse = KycIdentitySchema.safeParse({ ...input, dob });
  if (!parse.success) {
    const first = parse.error.errors[0];
    // The account's own date failing the shape is not something the player can fix on this form.
    if (dobFromAccount && first?.path?.[0] === "dob") {
      return { kind: "fail", result: { ok: false, error: "The date of birth on your account can't be read. Contact support.", code: "INVALID" } };
    }
    return { kind: "fail", result: { ok: false, error: first?.message ?? "Invalid input", code: "INVALID" } };
  }

  const idType = parse.data.idType as IdDocType;
  const spec = ID_DOC_SPECS[idType];

  // ── 🔴 AGE, FOR ALL FOUR TYPES ────────────────────────────────────────────
  // `dateOfBirth` in the schema already refuses under-18, so this is the second
  // lock rather than the first — and it is here, above the per-type branch, so it
  // can never become a property of one document. A caller that reaches the service
  // without the schema (a script, a future API) still meets the gate.
  // ⛔ The one age gate — whole calendar years on the Tanzanian date, the SAME question `validators.dateOfBirth`
  // asks, so this really is the second lock its comment says it is (id-documents.ts `isOfAge`).
  const declaredAge = ageOnPlatformDate(parse.data.dob, new Date());
  if (!Number.isFinite(declaredAge) || declaredAge < MIN_AGE_YEARS) {
    const refused = await refuseUnderage(userId, k, idType);
    if (!refused.ok) return { kind: "fail", result: refused };
    return { kind: "refused", reason: "UNDERAGE" };
  }

  // ── FORMAT — one catalogue, one entry per document ────────────────────────
  const verdict = validateIdNumber(idType, parse.data.idNumber);
  if (!verdict.ok) {
    // Named for what happened, and carrying WHICH rule failed — a compliance
    // record that says only "invalid" cannot answer "did we lock a real citizen
    // out, and on what basis?".
    audit({ category: "KYC", action: "kyc.id.invalid_format", actorId: userId, targetType: "User", targetId: userId, payload: { idType, refusal: verdict.refusal, formatKind: spec.format.kind } });
    return { kind: "fail", result: { ok: false, error: `That ${idType} number does not meet the recorded rule (${verdict.refusal}).`, code: "INVALID", reason: "id_number_format" } };
  }

  // ── EXPIRY — only where the document actually has one ─────────────────────
  // ⛔ NIDA and the voter's card do not expire, so nothing asks for a date they
  // do not carry. Asking would invite an invented one, and an invented date in a
  // compliance record is worse than no date.
  const expiryRaw = (parse.data.idExpiry ?? "").trim();
  let idExpiry: string | null = null;
  if (spec.expires) {
    if (!expiryRaw) {
      return { kind: "fail", result: { ok: false, error: `An expiry date is required for a ${idType}.`, code: "INVALID", reason: "id_expiry_required" } };
    }
    // 🔴 REFUSED AT SUBMIT, not accepted-and-flagged. An expired document is not
    // valid identity evidence, and an approval of one — automatic or an officer's —
    // is the control failing silently. `KycRejectReason.EXPIRED_ID` stays the
    // officer's word for a document that expired after it was accepted.
    if (isExpired(expiryRaw, new Date())) {
      audit({ category: "COMPLIANCE", action: "kyc.id.expired_rejected", actorId: userId, targetType: "User", targetId: userId, payload: { idType, expiry: expiryRaw } });
      return { kind: "fail", result: { ok: false, error: `That ${idType} expired on ${expiryRaw}.`, code: "INVALID", reason: "id_expired" } };
    }
    idExpiry = expiryRaw.slice(0, 10);
  }

  return {
    kind: "ok",
    p: {
      user, k, idType,
      idNumber: verdict.value,
      idExpiry,
      fullName: parse.data.fullName,
      dob: parse.data.dob.slice(0, 10),
      dobFromAccount,
      formatFlags: verdict.flags,
      formatKind: spec.format.kind,
    },
  };
}

/**
 * ⭐ UNDERAGE IS A FINAL CODE (2026-09-13): the wallet is frozen before the refusal is written — under the
 * submission lock, on the row as it stands now. Shared by the account-date gate and the declared-date lock.
 */
async function refuseUnderage(userId: string, k: KycRow, idType: string | null): Promise<ServiceResult<never>> {
  audit({ category: "COMPLIANCE", action: UNDERAGE_ATTEMPT_ACTION, actorId: userId, targetType: "User", targetId: userId, payload: { idType } });
  const refused = await underSubmissionLock<never>(userId, k, "identity", async (fresh) => {
    const freeze = await freezeForFinalRefusal(userId, fresh.id, "UNDERAGE", null);
    if (!freeze.ok) return { ok: false, error: freeze.error, code: "INVALID" };
    await db.kyc.upsert({ ...fresh, status: "REJECTED", rejectReason: "UNDERAGE", rejectNote: null, updatedAt: new Date().toISOString() });
    await recordFinalRefusal(userId, fresh.id, "UNDERAGE", null);
    return { ok: true };
  });
  if (!refused.ok) return refused;
  // A2 row 11 · a FINAL identity refusal voids a holder's consent and stops their bot (C4-SPEC ruling 127).
  runOutsideLock(() => {
    void import("./house-bot/holder-hook").then((m) => m.onHolderAccountChanged(userId, "IDENTITY_REFUSED")).catch(() => {});
  });
  // ⛔ `finalRefusal`: the ordinary REJECTED notice says "Please re-submit", which is false on a final
  // code — the player cannot restart and the wallet is frozen while an officer decides the balance.
  notifyKyc(userId, "REJECTED", { finalRefusal: true }).catch(() => {});
  sendEmailToUser(userId, (email) => ({
    to: email,
    subject: "Identity verification refused",
    html: kycRejectedHtml({ reason: REJECT_EMAIL_TEXT.UNDERAGE, reasonSw: REJECT_EMAIL_TEXT_SW.UNDERAGE, finalRefusal: true }),
    tag: "kyc-rejected",
  }));
  return { ok: true };
}

type AvailableOutcome =
  | { kind: "ok"; fingerprint: string }
  | { kind: "fail"; result: ServiceResult<never> }
  | { kind: "refused"; reason: string };

/**
 * UNIQUENESS and the NIDA seam — the slow, read-mostly half of the identity step, still before the lock.
 */
async function checkIdentityAvailable(userId: string, p: ParsedIdentity): Promise<AvailableOutcome> {
  const { k, idType, idNumber } = p;
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
  const fingerprint = identityFingerprint(idType, idNumber);
  const conflict =
    (await db.kyc.findActiveByIdNumber(idType, idNumber, userId)) ??
    // 🔴 AND THE SAME QUESTION ASKED OF AN ERASED ROW. `anonymizeClosedAccount` destroys
    // `idNumber` (it becomes this document's keyed HMAC), so from that moment the read
    // above cannot match it — the erased row holds a hash and this applicant is holding
    // the raw number. Without this second read a re-presented document would clear the
    // fast path and then lose to "KycSubmission_idFingerprint_active_key" in the DATABASE:
    // the control would still hold, but the player would meet an unexplained failure
    // instead of the `id_taken` refusal, and the SECURITY audit row would say
    // `viaConstraint` for an ordinary, sequential duplicate.
    (await db.kyc.findActiveByFingerprint(fingerprint, userId));
  if (conflict) {
    audit({ category: "SECURITY", action: "kyc.id.duplicate_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { idType, conflictUserId: conflict.userId, conflictStatus: conflict.status } });
    return { kind: "fail", result: { ok: false, error: "This identity document is already linked to another account. If this is a mistake, contact support.", code: "INVALID", reason: "id_taken" } };
  }

  // The identity step never writes the contact email (changeOwnEmail or an officer does — route audit 2026-10-06, A1).

  // ── THE NIDA AUTHORITY SEAM ───────────────────────────────────────────────
  // ⛔ ONLY NIDA HAS ONE, AND TODAY IT ANSWERS NOTHING. `nida.ts` is a
  // deterministic mock; no request has ever reached the National Identification
  // Authority, and by owner decision none is required. There is no equivalent
  // endpoint for a passport, a licence or a voter's card and none is invented
  // here — uniqueness, the automatic checks and an officer's check afterwards are
  // the control for a typed identity (the photos and an officer, for an agent's).
  // The sanctions / details-mismatch QA paths live in that mock and so are
  // NIDA-only by construction; they are test hooks, not a control.
  if (idType === "NIDA") {
    const result = await verifyNida({ nida: idNumber, fullName: p.fullName, dob: p.dob, userId });
    if (!result.ok) {
      return { kind: "fail", result: { ok: false, error: result.error } };
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
      // ⭐ UNDERAGE and SANCTIONED are FINAL codes (2026-09-13): freeze before the refusal is written — under the
      // submission lock, on the row as it stands after the NIDA check's latency, never on the copy read before it.
      const nidaRefused = await underSubmissionLock<never>(userId, k, "identity", async (fresh) => {
        const freeze = await freezeForFinalRefusal(userId, fresh.id, enumMember, null);
        if (!freeze.ok) return { ok: false, error: freeze.error, code: "INVALID" };
        await db.kyc.upsert({ ...fresh, status: "REJECTED", rejectReason: enumMember, rejectNote, updatedAt: new Date().toISOString() });
        audit({ category: "KYC", action: "kyc.nida.rejected", actorId: userId, targetType: "Kyc", targetId: fresh.id, payload: { reason: result.reason } });
        await recordFinalRefusal(userId, fresh.id, enumMember, null);
        return { ok: true };
      });
      if (!nidaRefused.ok) return { kind: "fail", result: nidaRefused };
      // In-app + email notice (best-effort). ⛔ A final code must not be told to re-submit.
      const nidaFinal = isFinalRefusal(enumMember);
      // A2 row 11 · only a FINAL code is a holder cause; a retryable NIDA answer leaves the bot alone.
      if (nidaFinal) {
        runOutsideLock(() => {
          void import("./house-bot/holder-hook").then((m) => m.onHolderAccountChanged(userId, "IDENTITY_REFUSED")).catch(() => {});
        });
      }
      notifyKyc(userId, "REJECTED", { finalRefusal: nidaFinal }).catch(() => {});
      sendEmailToUser(userId, (email) => ({
        to: email,
        subject: nidaFinal ? "Identity verification refused" : "Identity check needs attention",
        html: kycRejectedHtml({ reason: NIDA_TEXT[result.reason], reasonSw: nidaFinal ? REJECT_EMAIL_TEXT_SW[enumMember] : undefined, finalRefusal: nidaFinal }),
        tag: "kyc-rejected",
      }));
      return { kind: "refused", reason: result.reason };
    }
  }
  return { kind: "ok", fingerprint };
}

/** The unique-index race, reported exactly as a sequential duplicate is (see `isIdUniqueViolation`). */
function idTakenByRace(userId: string, idType: string): ServiceResult<never> {
  // The check above is the FAST PATH; the partial unique index
  // "KycSubmission_idType_idNumber_active_key" is the ENFORCEMENT. Two users
  // submitting the same document in the same instant both clear the read
  // (proven by scripts/load/s14-kyc-nida-race.mts) — the loser lands here.
  // Present it as the same refusal a sequential duplicate gets, so a race is
  // indistinguishable from an ordinary duplicate to the player, and audited the
  // same way for AML.
  audit({ category: "SECURITY", action: "kyc.id.duplicate_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { idType, viaConstraint: true } });
  return { ok: false, error: "This identity document is already linked to another account. If this is a mistake, contact support.", code: "INVALID", reason: "id_taken" };
}

/** `idVerifiedAt` means "format accepted + unique", never "authority confirmed" (docs/IDENTITY-POLICY.md). */
function auditIdAccepted(userId: string, kycId: string, p: ParsedIdentity, track: KycTrack): void {
  // The payload used to carry a fabricated matchScore of 0.97 straight into the audit chain; record the real
  // basis, and record WHICH document — a regulator asking "what did you accept, and on what rule?" gets the
  // answer from this row.
  audit({
    category: "KYC",
    action: "kyc.id.accepted",
    actorId: userId, targetType: "Kyc", targetId: kycId,
    payload: {
      idType: p.idType,
      basis: "format+uniqueness",
      formatKind: p.formatKind,
      flags: p.formatFlags,
      expiryCaptured: p.idExpiry !== null,
      dobSource: p.dobFromAccount ? "account" : "typed",
      track,
    },
  });
}

/**
 * ⭐ An account with no date of birth on file gets the one the player typed, once it was accepted — from then on
 * `User.dob` is the single source (2026-10-10). ⛔ Never overwrites a date the account already holds: correcting
 * one is an officer's act (`correctDateOfBirth`).
 */
async function adoptTypedDob(userId: string, p: ParsedIdentity): Promise<void> {
  if (p.dobFromAccount) return;
  try {
    const fresh = await db.user.findById(userId);
    if (fresh && !fresh.dob) await db.user.update(userId, { dob: p.dob });
  } catch (err) {
    console.warn(`[kyc] the typed date of birth could not be written to the account ${userId.slice(0, 14)}…: ${(err as Error)?.message ?? err}`);
  }
}

// ── THE AUTOMATIC CHECKS' FACTS ──────────────────────────────────────────────────────────────────────────────

/** The statuses that make a same-person match RESTRICTED (2026-10-10). */
const RESTRICTED_ACCOUNT_STATUSES = new Set(["SELF_EXCLUDED", "COOLED_OFF", "SUSPENDED", "CLOSED"]);

/** The other accounts a same-person check matched — the workstation links each by its case, never by its name. */
export type KycSamePersonMatch = { userId: string; restricted: boolean };

type SideFacts = Pick<KycDecisionFacts, "riskScore" | "riskThreshold" | "holds" | "sofStatus" | "amlEscalationOpen" | "underageAttempt"> & {
  samePerson: KycSamePersonMatch[];
  /** The durable trail says an officer ruled on this identity and no officer approved it since (`readOfficerHistory`). */
  officerHistory: boolean;
};

/**
 * ⭐ OFFICER PROVENANCE FROM THE DURABLE TRAIL (2026-10-10, reviews R1.3/R2.1). The newest officer act on this player's
 * identity decides: a refusal-type act (`OFFICER_IDENTITY_ACTS`) → true; an officer's `kyc.approved` → false (an officer
 * accepted the identity since). An automatic approval (actor null) settles nothing and is skipped.
 * 🔴 WHY THE ROW IS NOT ENOUGH. The build before 2026-10-10 restarted a refused row with `reviewerId: null`, and its
 * container keeps serving for up to 60 s after the migration — so an identity an officer refused (recoverably) and the
 * player then restarted reads "no officer" on the row, and the machine would approve the same details at once.
 * ⛔ ONE FILTERED READ (`getAuditForTargetsDurable`: this player, these actions), never a window of the player's newest
 * rows — every NIDA press, wallet act and sign-in writes a User-targeted row, and a window drops old officer acts first.
 * ⛔ FAILS CLOSED: a failed read throws (the press is refused with "try again"); a truncated read that found no officer
 * act routes the identity to an officer.
 */
async function readOfficerHistory(userId: string): Promise<boolean> {
  const trail = await getAuditForTargetsDurable({
    targetType: "User",
    targetIds: [userId],
    actions: [...OFFICER_IDENTITY_ACTS, "kyc.approved"],
    sinceIso: TRAIL_EPOCH_ISO,
    limit: 200,
  });
  for (const e of trail.entries) { // newest first
    if (!isOfficerActor(e.actorId, userId)) continue;
    return e.action !== "kyc.approved";
  }
  return trail.truncated;
}

/**
 * Is an AML escalation of this identity still open — an officer escalated it AFTER the last decision on it?
 * (2026-10-10, review R1.4.) ⛔ DURABLE, never the ring — the ring empties on every deploy, and an escalation must
 * outlive a release. ⛔ AND FILTERED (this player, this action, since the decision), never the newest 500 of the
 * player's rows: a busy account pushed an older escalation out of that window and was approved at once. Newest first,
 * so a truncated read still holds the newest escalation; it is read as open anyway (fail closed).
 */
async function readAmlEscalationOpen(userId: string, decidedAt: string | null): Promise<boolean> {
  const esc = await getAuditForTargetsDurable({
    targetType: "User",
    targetIds: [userId],
    actions: [AML_ESCALATION_ACTION],
    sinceIso: decidedAt ?? TRAIL_EPOCH_ISO,
    limit: 50,
  });
  return esc.truncated || esc.entries.some((e) => !decidedAt || e.createdAt > decidedAt);
}

/**
 * Has this player ever ENTERED an under-18 date of birth — an admitted underage attempt (2026-10-10, review R5.8)? The
 * typed form refuses one and audits it (`parseIdentity`), and an adult date retyped straight after was then approved
 * at once and adopted as the account's own. ⛔ The same filtered durable read as `readOfficerHistory`: this player, this
 * action, the player as its actor (an officer's or the machine's row is not the player's admission). ⛔ FAILS CLOSED: a
 * failed read throws (the press is refused with "try again"), and a truncated read counts as an attempt on record.
 */
async function readUnderageAttempt(userId: string): Promise<boolean> {
  const trail = await getAuditForTargetsDurable({
    targetType: "User",
    targetIds: [userId],
    actions: [UNDERAGE_ATTEMPT_ACTION],
    sinceIso: TRAIL_EPOCH_ISO,
    limit: 50,
  });
  return trail.truncated || trail.entries.some((e) => e.actorId === userId);
}

/**
 * Every fact `decideKyc` needs that is not on the submission — read BEFORE the lock (slow, read-only).
 * ⛔ THROWS on a failed read, and the caller refuses the press with "try again" rather than deciding on a fact
 * it does not have: a risk score read as zero, or a hold read as absent, would approve the one case that
 * should have gone to an officer.
 */
async function readSideFacts(userId: string, dob: string, fullName: string, decidedAt: string | null): Promise<SideFacts> {
  const risk = await kycRiskScore(userId);
  const wallet = await db.wallet.findByUserId(userId);
  const holds: string[] = wallet ? currentFreezeReasons(wallet) : [];
  const sof = await db.sourceOfFunds.get(userId);
  const amlEscalationOpen = await readAmlEscalationOpen(userId, decidedAt);
  const officerHistory = await readOfficerHistory(userId);
  const underageAttempt = await readUnderageAttempt(userId);
  // Possible same person: the same normalised name and date of birth on ANOTHER account. The stores return the
  // day's rows; the name is compared here, by the one normaliser.
  const key = samePersonNameKey(fullName);
  const samePerson: KycSamePersonMatch[] = [];
  if (key) {
    const candidates = await db.kyc.findSamePersonCandidates(dob, userId);
    const byUser = new Map<string, typeof candidates>();
    for (const c of candidates) {
      if (samePersonNameKey(c.fullName) !== key) continue;
      byUser.set(c.userId, [...(byUser.get(c.userId) ?? []), c]);
    }
    // Bounded: a name and a birthday shared by dozens of accounts is already a reason to look, and every match
    // past the first few only repeats it.
    for (const [otherId, rows] of Array.from(byUser.entries()).slice(0, 25)) {
      const other = await db.user.findById(otherId);
      const otherWallet = await db.wallet.findByUserId(otherId);
      const restricted = RESTRICTED_ACCOUNT_STATUSES.has(other?.status ?? "")
        || otherWallet?.status === "FROZEN"
        || rows.some((r) => r.status === "REJECTED" && isFinalRefusal(r.rejectReason));
      samePerson.push({ userId: otherId, restricted });
    }
  }
  return {
    riskScore: risk.score,
    riskThreshold: KYC_MAKER_CHECKER_THRESHOLD,
    holds,
    sofStatus: sof?.reviewStatus ?? null,
    amlEscalationOpen,
    underageAttempt,
    samePerson,
    officerHistory,
  };
}

/**
 * ⭐ THE OFFICER'S CHECKLIST FOR ONE CASE — the same facts and the same pure decision the instant path used
 * (`readSideFacts` + `decideKyc`), so the workstation cannot come to disagree with the machine about a rule, only,
 * at worst, about a fact read at another moment. `samePerson` names the OTHER accounts by id (the screen links each
 * to its own case — never by its name). Null when the case holds no identity details yet.
 * ⛔ THROWS on a failed fact read; the page says the checks could not be read, never draws them as passed.
 */
export async function readKycCaseChecks(userId: string): Promise<{ decision: KycDecision; samePerson: KycSamePersonMatch[]; mode: KycAttestationMode } | null> {
  const k = await db.kyc.findByUserId(userId);
  if (!k || !isIdDocType(k.idType) || !k.idNumber) return null;
  const u = await db.user.findById(userId);
  const accountDob = (u?.dob ? String(u.dob) : k.dob ? String(k.dob) : "").slice(0, 10);
  const side = await readSideFacts(userId, accountDob, k.fullName ?? "", k.reviewedAt ?? null);
  const verdict = validateIdNumber(k.idType, k.idNumber);
  const mode: KycAttestationMode = photoSetComplete(k.idType, (k.documents ?? []).map((d: { docType: string }) => d.docType)) ? "photo" : "typed";
  const decision = decideKyc({
    idType: k.idType,
    idNumber: k.idNumber,
    idExpiry: k.idExpiry ?? null,
    accountDob,
    now: new Date(),
    formatFlags: verdict.ok ? verdict.flags : [],
    ...side,
    // The row OR the durable trail — the same question the instant path asks (`verifyIdentity`).
    officerProvenance: hasOfficerProvenance(k) || side.officerHistory,
    track: mode === "photo" ? "agent" : "typed",
  });
  return { decision, samePerson: side.samePerson, mode };
}

// ── THE SHARED APPROVAL CORE ─────────────────────────────────────────────────────────────────────────────────

type ApprovalActor =
  | { kind: "system"; flags: KycFlag[] }
  /** `attested`: the officer POSTED this mode's attestations (re-validated by `reviewKyc`); `attestations` are those
   *  statements (null when none were). ⛔ Only then does the approval record an attestation set — the agent-approval
   *  call posts none (2026-10-10, reviews R1.5/R4.2) — and only then, on the workstation, is an automatic approval
   *  checked by it (R5.3). */
  | { kind: "officer"; officerId: string; mode: KycAttestationMode; via: "workstation" | "agent_approval"; attested: boolean; attestations: Record<string, "pass"> | null };

/**
 * ⭐ ONE APPROVAL, WHOEVER APPROVES — the instant path (actor SYSTEM) and an officer's `reviewKyc` APPROVE
 * (including the agent-approval call) both write it here, so the two can never drift on the facts every
 * approval must keep. Runs INSIDE the caller's `kyc:` lock; returns the notices to send AFTER the lock.
 *
 *  · `approvedAt` IS STAMPED ONCE AND ONLY ONCE — `k.approvedAt ?? now`, never a bare `now`. It records the
 *    FIRST time this account satisfied us, which is the question the withdrawal gate asks; re-stamping it on
 *    every re-approval would turn it into a duplicate of `reviewedAt` and quietly lose the fact that a
 *    re-verified player was already trusted once.
 *  · OFFICER: `reviewerId` is the officer; `photoVerifiedAt` is stamped only when the officer decided in PHOTO
 *    mode on a full photo set — the agent programme's gate. An automatic approval leaves the post-check list
 *    (`postCheckedAt/ById`) only when the officer POSTED this case's attestation set on the WORKSTATION — the checklist,
 *    the flags and the statements in front of them — and that check is recorded as `kyc.post_checked`, exactly as
 *    Mark checked records it (`markPostChecked`). ⛔ (2026-10-10, review R5.3.) The agent-approval call posts no
 *    statements and shows no checklist or flags, so it approves the photos and leaves the automatic approval UNCHECKED
 *    and on the list: it stamped `postCheckedAt` for any officer approval until then, and a flagged approval left the
 *    list — and lost its flagged-first alert — with nobody having read its flags.
 *  · SYSTEM: `reviewerId` stays null (an approval no officer made is never attributed to one — and never to
 *    the player either, which keeps the flags out of the player's own data export), `autoApprovedAt` and the
 *    flags are recorded, and the approval joins the officers' post-check list.
 *  · ⛔ ONLY AN OFFICER'S APPROVAL LIFTS A STALE IDENTITY HOLD. The automatic path never lifts a hold — a hold
 *    ROUTES the identity to an officer instead (`WALLET_HOLD`).
 *  · ⭐ THE APPROVAL'S AUDIT IS WRITTEN STRAIGHT AFTER THE APPROVAL (2026-10-10, review R2.10). The upsert commits on
 *    its own (on Postgres it is not the lock's transaction), so anything that threw between the write and the audit
 *    left an approval on record with no `kyc.approved` — and a re-press then answered an idempotent "approved", so the
 *    gap was never filled. Now: the account is read BEFORE the write (a failed read writes nothing), the audit is
 *    awaited right after it, and what follows — the hold lift, the legacy status normalisation — is best-effort and
 *    never throws past the committed approval.
 */
async function approveIdentity(k: KycRow, userId: string, actor: ApprovalActor, now: string): Promise<() => void> {
  const officer = actor.kind === "officer" ? actor : null;
  const photo = !!officer && officer.mode === "photo" && photoSetComplete(k.idType, (k.documents ?? []).map((d: { docType: string }) => d.docType));
  // ⛔ A POST-CHECK IS THE OFFICER'S STATEMENTS ON THE WORKSTATION, never the bare fact of an approval (R5.3 — see above).
  const checkedNow = !!officer && officer.via === "workstation" && officer.attested && !!officer.attestations && uncheckedAutomaticApproval(k);
  const row: StoredKyc = {
    ...k,
    status: "APPROVED",
    approvedAt: k.approvedAt ?? now,
    rejectReason: null,
    rejectNote: null,
    reviewedAt: now,
    updatedAt: now,
    ...(officer
      ? {
          reviewerId: officer.officerId,
          photoVerifiedAt: photo ? now : (k.photoVerifiedAt ?? null),
          postCheckedAt: checkedNow ? now : (k.postCheckedAt ?? null),
          postCheckedById: checkedNow ? officer.officerId : (k.postCheckedById ?? null),
        }
      : {
          reviewerId: null,
          autoApprovedAt: now,
          autoFlags: actor.kind === "system" ? [...actor.flags] : [],
          postCheckedAt: null,
          postCheckedById: null,
        }),
  };
  // Read BEFORE the write: a failed read here writes nothing, and the audit below must not wait on it.
  const u = await db.user.findById(userId);
  // May throw a unique-index violation on the typed path (the tuple is written in this same upsert); the caller
  // catches it BEFORE any side effect below has happened.
  await db.kyc.upsert(row);
  // ⭐ THE RECORD OF THE APPROVAL, IMMEDIATELY (R2.10 — see the header). `audit()` never rejects.
  // ⛔ `attestationSet` names the statements the officer POSTED, so it is null when none were (the agent-approval call):
  // an inspector reads the set id as "this officer made these statements" (`kyc-attestations.ts`).
  if (officer) {
    await audit({
      category: "KYC", action: "kyc.approved", actorId: officer.officerId, targetType: "User", targetId: userId,
      payload: { kycId: k.id, priorStatus: u?.status ?? null, ...(officer.attested ? { attestationSet: ATTESTATION_SET_ID[officer.mode] } : { attestationSet: null }), idType: k.idType ?? null, idFingerprint: k.idFingerprint ?? null, last4: last4(k.idNumber), via: officer.via, photoVerified: photo, nameBackfilled: false },
    });
    // ⭐ The post-check this approval made, recorded as Mark checked records its own (`markPostChecked`, same payload) —
    // the workstation shows "checked by <officer>" from `postCheckedById`, and the fact behind that line is this row.
    if (checkedNow && officer.attestations) {
      await audit({
        category: "COMPLIANCE", action: "kyc.post_checked", actorId: officer.officerId, targetType: "User", targetId: userId,
        payload: { kycId: k.id, attestationSet: ATTESTATION_SET_ID[officer.mode], attestations: officer.attestations, flags: Array.isArray(k.autoFlags) ? k.autoFlags : [] },
      });
    }
  } else {
    await audit({
      category: "KYC", action: "kyc.approved", actorId: null, targetType: "User", targetId: userId,
      payload: { kycId: k.id, automatic: true, basis: "typed-details", flags: actor.kind === "system" ? actor.flags : [], idType: k.idType ?? null, idFingerprint: k.idFingerprint ?? null, last4: last4(k.idNumber) },
    });
  }
  // ⭐ An officer's approval leaves no final refusal on record, so an identity hold still on the wallet is STALE (its
  // refusal write failed, or a re-open's lift failed) — lift it here, or the approved player's withdrawal says "frozen".
  // (Best-effort: the lift never throws — `liftStaleIdentityHoldAfterDecision`.)
  if (officer) await liftStaleIdentityHoldAfterDecision(userId, officer.officerId, k.id, "APPROVE");
  // ⚠️ LEGACY NORMALISATION ONLY. `User.status = "PENDING_KYC"` was written at registration until
  // 2026-09-13 and gated nothing; new accounts are created ACTIVE and the existing rows were
  // normalised in `20260913120000_kyc_at_withdrawal`. This keeps a straggler — a row written by a
  // container still running the old code during that deploy — from wearing a pending label
  // after its identity is approved. It never overrides SUSPENDED / CLOSED / SELF_EXCLUDED /
  // COOLED_OFF: those outrank an identity approval.
  // ⛔ BEST-EFFORT: a label tidy-up must never throw past an approval that is already committed and audited.
  try {
    if (u && u.status === "PENDING_KYC") await db.user.update(userId, { status: "ACTIVE" });
  } catch (err) {
    console.warn(`[kyc] the legacy PENDING_KYC label could not be cleared for ${userId.slice(0, 14)}…: ${(err as Error)?.message ?? err}`);
  }
  // ⛔ APPROVAL DOES NOT TOUCH THE DISPLAY NAME (owner ruling, Ali, 2026-09-13 — reverses the
  // 2026-06-14 ruling that set it to the legal name "even over a chosen handle"). Approval used to
  // happen before anyone had played; from 2026-09-13 a player may spend weeks on the leaderboard
  // under a handle and be verified at the moment they cash out, and overwriting it then would
  // publish their legal name unannounced. The legal name is RECORDED on this submission and shown
  // to the officer; it is not displayed. docs/COMPLIANCE-DECISIONS.md, 2026-09-13 (second).
  // ⛔ Do not restore the overwrite from this file's history.
  const greetName = firstName(k.fullName) ?? displayLabel(u ?? { id: userId, displayName: null });
  const emailUnconfirmed = !!u?.email && !u.emailVerifiedAt;
  return () => {
    notifyKyc(userId, "APPROVED").catch(() => {});
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: "Identity verified · You're fully verified",
      // ⭐ The second withdrawal step, only when it is still owed (2026-10-07) — see `kycApprovedHtml`.
      html: kycApprovedHtml({ name: greetName, reference: k.id, emailUnconfirmed }),
      tag: "kyc-approved",
    }));
  };
}

/**
 * A case has reached the officers' queue — the player's notice and email, the officers' bell and the admin email.
 * Best-effort throughout: a failed send never breaks the press that sent the case. Called AFTER the lock.
 */
async function announceCaseToOfficers(
  userId: string,
  k: { id: string; idType?: string | null; idNumber?: string | null; fullName?: string | null },
  opts: { evidence: "typed" | "photos"; submittedAt: string; reasons: readonly KycRouteReason[]; urgent: boolean },
): Promise<void> {
  try {
    // In-app "received, under review" notice — "details" for a routed typed send, "photos" for an agent's photo send.
    notifyKyc(userId, "PENDING_REVIEW", { evidence: opts.evidence }).catch(() => {});
    const u = await db.user.findById(userId);
    // Player: "details / photos received, pending verification".
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: opts.evidence === "typed" ? "Details received · verification pending" : "Photos received · verification pending",
      tag: "kyc-submitted",
      html: kycSubmittedHtml({
        name: firstName(k.fullName ?? u?.displayName),
        reference: k.id,
        submittedAt: opts.submittedAt,
        evidence: opts.evidence,
        viewUrl: opts.evidence === "photos" ? "/profile/kyc?for=agent" : "/profile/kyc",
      }),
    }));

    // Compliance: no PII beyond the masked tail (no images, no DOB) — the officer opens the secured case.
    // ⭐ The case's own page since 2026-10-10 (it was the player page's KYC tab, which no longer decides anything).
    const reviewUrl = `${appUrl()}/admin/kyc/${userId}`;
    // ⚠️ The document TYPE travels with the masked tail, because from 2026-08-20
    // "•••• 5678" alone no longer says what was submitted — and an officer opening
    // the queue decides which case to pick up from this line.
    const idMasked = `${k.idType ?? "ID"} •••• ${k.idNumber?.slice(-4) ?? ""}`;
    const playerLabel = displayLabel({ id: userId, displayName: k.fullName ?? u?.displayName ?? null });

    // In-app alert in the MAIN bell of every officer who can act on it (deep-links to the case). This is the
    // reliable in-platform signal; email is the extra nudge. `urgent` — the NIDA number says under 18, or (2026-10-10,
    // review R5.8) the player entered an under-18 date of birth earlier: asked HERE, so the agent's photo send rings as
    // urgently as a routed typed press does. A failed read rings urgent — attention is the safe side of a bell.
    // ⛔ ONE AUDIENCE READER: `kycOfficerRoles()` (live grants; ADMIN + COMPLIANCE by default) is the same reader the
    // overdue-review and post-check alerts use, so the three KYC bells can never go to different people.
    const urgent = opts.urgent || (await readUnderageAttempt(userId).catch(() => true));
    const officerRoles = new Set(await kycOfficerRoles());
    for (const a of await db.user.list()) {
      if (officerRoles.has(a.role)) {
        notifyAdminKycReview(a.id, { playerLabel, userId, urgent }).catch(() => {});
      }
    }

    const adminHtml = kycSubmittedAdminHtml({
      reference: k.id,
      name: playerLabel,
      phoneMasked: maskPhone(u?.phoneE164),
      idMasked,
      submittedAt: opts.submittedAt,
      reviewUrl,
      reasons: opts.reasons.map((r) => ROUTE_REASON_LABEL[r]),
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
  } catch (err) {
    console.warn(`[kyc] case notices failed for ${userId.slice(0, 14)}…: ${(err as Error)?.message ?? err}`);
  }
}

/**
 * ⭐ THE TYPED IDENTITY — ONE PRESS, ONE LOCK (owner ruling, Ali, 2026-10-10).
 *
 * Before the lock (slow, read-only): every check of `parseIdentity` (rate limit, the account's date of birth,
 * schema, format, expiry), uniqueness and the NIDA seam (`checkIdentityAvailable`), and the automatic checks'
 * facts (`readSideFacts`). Then ONE `underSubmissionLock`, on the row as it stands now:
 *   · the same identity pressed again — APPROVED → "approved", PENDING_REVIEW → "routed", nothing written;
 *   · the doors (`closedToPlayer`, the number lock on an approved-once correction) and the row VERSION — a row
 *     that changed since it was read (an officer's decision, another tab) is never overwritten;
 *   · a RECOVERABLE refusal restarts in the same write (its officer provenance carried), so "Try again" is one press;
 *   · a DECIDED identity the press changes in any fact goes into `priorIdentities` (cause "correction",
 *     `priorIdentitiesForStep`);
 *   · the tuple is written TOGETHER with the decision — APPROVED at once (`approveIdentity`, actor SYSTEM), or
 *     PENDING_REVIEW with `kyc.routed {reasons}`. The unique-index race lands as `id_taken`, as before.
 * After the lock: the notices, and an account with no date of birth adopts the typed one.
 */
export async function verifyIdentity(
  userId: string,
  input: KycIdentityInput,
): Promise<ServiceResult<{ outcome: "approved" | "routed" | "refused"; reason?: string; routes?: KycRouteReason[] }>> {
  const parsed = await parseIdentity(userId, input, closedFinal);
  if (parsed.kind === "fail") return parsed.result;
  if (parsed.kind === "refused") return { ok: true, data: { outcome: "refused", reason: parsed.reason } };
  const p = parsed.p;
  const next = { idType: p.idType, idNumber: p.idNumber };

  // An idempotent re-press is answered before anything slow or writing runs (the NIDA seam, the checks).
  if (sameTuple(p.k, p.idType, p.idNumber)) {
    if (p.k.status === "APPROVED") return { ok: true, data: { outcome: "approved" } };
    if (p.k.status === "PENDING_REVIEW") return { ok: true, data: { outcome: "routed" } };
  }
  const closed = closedToPlayer(p.k, "identity", next);
  if (closed) return closed;

  const avail = await checkIdentityAvailable(userId, p);
  if (avail.kind === "fail") return avail.result;
  if (avail.kind === "refused") return { ok: true, data: { outcome: "refused", reason: avail.reason } };

  let side: SideFacts;
  try {
    side = await readSideFacts(userId, p.dob, p.fullName, p.k.reviewedAt ?? null);
  } catch (err) {
    console.warn(`[kyc] the automatic checks could not read their facts for ${userId.slice(0, 14)}…: ${(err as Error)?.message ?? err}`);
    return { ok: false, error: "We couldn't finish checking your details just now. Please try again in a moment.", code: "INVALID" };
  }

  const out: { decision?: KycDecision; notify?: () => void; kycId?: string } = {};
  const now = new Date().toISOString();
  const written = await underSubmissionLock<{ outcome: "approved" | "routed" | "refused"; reason?: string; routes?: KycRouteReason[] }>(
    userId,
    p.k,
    "identity",
    async (fresh) => {
      if (fresh.updatedAt !== p.k.updatedAt) {
        return { ok: false, error: "Your verification changed while it was being saved. Reload the page and try again.", code: "INVALID" };
      }
      // A recoverable refusal restarts in this same write — its reviewer carried, so an officer's refusal goes
      // back to an officer.
      const base: KycRow = fresh.status === "REJECTED"
        ? ({ ...fresh, ...restartedSubmission(fresh, userId, fresh.reviewerId ? { officerId: fresh.reviewerId, at: fresh.reviewedAt ?? now } : undefined, "restart") } as KycRow)
        : fresh;
      // ⭐ A DECIDED identity that changes in ANY fact (a name or expiry correction included) goes into the history;
      // an undecided IN_PROGRESS edit does not (`priorIdentitiesForStep`, reviews R1.7/R2.6/R2.7).
      const priorIdentities = priorIdentitiesForStep(base, p, now);
      const withTuple: KycRow = {
        ...base,
        idType: p.idType,
        idNumber: p.idNumber,
        idExpiry: p.idExpiry,
        idVerifiedAt: now,
        // 🔴 WRITTEN FOR EVERY SUBMISSION, not only for the ones that will one day be
        // erased — and that is the whole point. The fingerprint only collides if BOTH rows
        // carry one: the erased row (which gets it at erasure time, computed from the raw
        // number it is destroying) and the row of whoever presents that document next.
        idFingerprint: avail.fingerprint,
        fullName: p.fullName,
        dob: p.dob,
        priorIdentities,
        updatedAt: now,
      };
      const decision = decideKyc({
        idType: p.idType,
        idNumber: p.idNumber,
        idExpiry: p.idExpiry,
        accountDob: p.dob,
        now: new Date(now),
        formatFlags: p.formatFlags,
        ...side,
        officerProvenance: hasOfficerProvenance(base) || side.officerHistory,
        track: "typed",
      });
      out.decision = decision;
      out.kycId = fresh.id;
      if (decision.outcome === "block") {
        // Unreachable in practice — the age and expiry refusals above run first — but a block is never written.
        const expired = decision.rows.some((r) => r.key === "expiry" && r.outcome === "block");
        return { ok: false, error: decision.blocks[0] ?? "These details cannot be verified.", code: "INVALID", ...(expired ? { reason: "id_expired" as FailureReason } : {}) };
      }
      try {
        if (decision.outcome === "approve") {
          out.notify = await approveIdentity(withTuple, userId, { kind: "system", flags: decision.flags }, now);
          return { ok: true, data: { outcome: "approved" } };
        }
        await db.kyc.upsert({ ...withTuple, status: "PENDING_REVIEW", submittedAt: now });
      } catch (err) {
        if (!isIdUniqueViolation(err)) throw err;
        return idTakenByRace(userId, p.idType);
      }
      audit({
        category: "KYC", action: "kyc.routed", actorId: null, targetType: "User", targetId: userId,
        payload: { kycId: fresh.id, reasons: decision.routes, idType: p.idType, idFingerprint: avail.fingerprint, last4: last4(p.idNumber) },
      });
      return { ok: true, data: { outcome: "routed", routes: decision.routes } };
    },
    {
      next,
      before: (fresh) => {
        if (!sameTuple(fresh, p.idType, p.idNumber)) return null;
        if (fresh.status === "APPROVED") return { ok: true, data: { outcome: "approved" } };
        if (fresh.status === "PENDING_REVIEW") return { ok: true, data: { outcome: "routed" } };
        return null;
      },
    },
  );
  if (!written.ok) return written;
  if (!out.decision) return written; // answered by the idempotency check under the lock — nothing was written

  auditIdAccepted(userId, out.kycId ?? p.k.id, p, "typed");
  await adoptTypedDob(userId, p);
  if (written.data?.outcome === "approved") {
    out.notify?.();
  } else if (written.data?.outcome === "routed") {
    await announceCaseToOfficers(userId, { id: out.kycId ?? p.k.id, idType: p.idType, idNumber: p.idNumber, fullName: p.fullName }, {
      evidence: "typed",
      submittedAt: now,
      reasons: out.decision.routes,
      // ⭐ Both age routes are urgent (R5.8): the number's own birth digits, or an under-18 date the player entered earlier.
      urgent: out.decision.routes.includes("NIDA_UNDER_18") || out.decision.routes.includes("UNDERAGE_ATTEMPT") || nidaSaysUnder18(p.idType, p.idNumber, new Date(now)),
    });
  }
  return written;
}

/**
 * THE AGENT PHOTO TRACK, STEP 1 — save the identity details; no decision (the officer decides on the photos).
 * The same checks as the typed press (`parseIdentity`, `checkIdentityAvailable`) and the same doors; the
 * photos follow (`attachDocument`) and the send (`submitForReview`).
 */
export async function submitIdentityStep(userId: string, input: KycIdentityInput): Promise<ServiceResult<{ verified: boolean; reason?: string }>> {
  const parsed = await parseIdentity(userId, input, (k) => closedToPlayer(k, "identity"));
  if (parsed.kind === "fail") return parsed.result;
  if (parsed.kind === "refused") return { ok: true, data: { verified: false, reason: parsed.reason } };
  const p = parsed.p;
  const next = { idType: p.idType, idNumber: p.idNumber };
  const closed = closedToPlayer(p.k, "identity", next);
  if (closed) return closed;

  const avail = await checkIdentityAvailable(userId, p);
  if (avail.kind === "fail") return avail.result;
  if (avail.kind === "refused") return { ok: true, data: { verified: false, reason: avail.reason } };

  const now = new Date().toISOString();
  // ⛔ UNDER THE SUBMISSION LOCK, FROM THE ROW AS IT STANDS NOW — the NIDA check above sleeps and the email write
  // above awaits, and an officer's final refusal landing in that gap must never be overwritten by `{ ...k }`.
  const written = await underSubmissionLock<never>(userId, p.k, "identity", async (fresh) => {
    try {
      await db.kyc.upsert({
        ...fresh,
        idType: p.idType,
        idNumber: p.idNumber,
        idExpiry: p.idExpiry,
        idVerifiedAt: now,
        idFingerprint: avail.fingerprint,
        // ⚠️ THE DEPRECATED MIRROR IS GONE (2026-08-20, contract step). This upsert
        // used to also write `nidaNumber` / `nidaVerifiedAt` for a NIDA so a rolling
        // deploy's previous container could keep serving KYC reads. ⛔ Do not re-add
        // either: two homes for one fact diverge, and the stale one is always the one
        // somebody reads.
        fullName: p.fullName,
        dob: p.dob,
        // ⭐ The typed track's rule (`priorIdentitiesForStep`): a decided identity changed in any fact is history; this
        // step's own undecided saves (IN_PROGRESS, no decision) are not — it is the one a player can repeat at will.
        priorIdentities: priorIdentitiesForStep(fresh, p, now),
        // ⛔ PHOTOS BELONG TO THE DOCUMENT THEY SHOW (2026-10-10). A different document — another type, or the same type
        // with a new number (a renewed passport) — drops the photos of the old one, so the photo step asks for the new
        // document's own images and an officer never reviews an old passport's photo against a new number. The same
        // document re-saved (a corrected name or expiry) keeps them. Only this undecided agent step reaches it: the
        // identity is locked while it is with an officer or approved (`closedToPlayer`).
        documents: sameTuple(fresh, p.idType, p.idNumber) ? fresh.documents : [],
        updatedAt: now,
      });
    } catch (err) {
      if (!isIdUniqueViolation(err)) throw err;
      return idTakenByRace(userId, p.idType);
    }
    return { ok: true };
  }, { next });
  if (!written.ok) return written;
  auditIdAccepted(userId, p.k.id, p, "agent");
  await adoptTypedDob(userId, p);
  return { ok: true, data: { verified: true } };
}

/**
 * 🔴 THE INDEX THAT IS THE UNIQUENESS RULE — one document, one account, across all
 * four identity types. Declared in
 * prisma/migrations/20260820120000_kyc_identity_document.
 */
export const ID_UNIQUE_INDEX = "KycSubmission_idType_idNumber_active_key";

/**
 * 🔴 THE SECOND ENFORCEMENT OF THE SAME RULE — on the value that survives erasure.
 * Declared in prisma/migrations/20260821140000_kyc_identity_fingerprint, with the SAME
 * partial predicate as the tuple index. A live duplicate can trip either one (both are
 * written by the same upsert and Postgres reports whichever it checks first), so both
 * names must read as `id_taken` or the loser of an ordinary duplicate gets a 500.
 */
export const ID_FINGERPRINT_UNIQUE_INDEX = "KycSubmission_idFingerprint_active_key";

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
  if (msg.includes(ID_UNIQUE_INDEX) || msg.includes(ID_FINGERPRINT_UNIQUE_INDEX) || msg.includes("KycSubmission_nidaNumber_active_key")) return true;
  if (e?.code === "23505") return true;
  if (e?.code !== "P2002") return false;
  // P2002 on this table can only be an identity index — `id` is a cuid we generate
  // and `userId` is not unique — but check the target when we are given one.
  const t = e.meta?.target;
  const asText = Array.isArray(t) ? t.join(",") : String(t ?? "");
  return asText === "" || /nida|idnumber|idtype|idfingerprint/i.test(asText)
    || asText.includes(ID_UNIQUE_INDEX) || asText.includes(ID_FINGERPRINT_UNIQUE_INDEX);
}

/** The accepted data-URL shape. The size cap is `MAX_DOC_BYTES`, imported above —
 *  ⛔ do not re-declare it here: the browser compressor targets the same number and
 *  the two ends of one upload must not drift. */
const DOC_DATAURL_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
/** Validate an uploaded document image data URL. Returns decoded byte size.
 *  ⭐ Kept for the agent photo track AND the agent programme's application documents
 *  (`agent-application-service.ts` imports it). */
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

/** The attach limit's bucket — its own, so photos never spend the identity press's tokens. Exported for the dev-only
 *  `/auth/demo` fixture, which attaches a whole photo set on every visit and hands those tokens back. */
export function kycAttachRateKey(userId: string): string {
  return `${userId}:attach`;
}

/**
 * THE AGENT PHOTO TRACK, STEP 2 — attach one image to a slot.
 *
 * ⛔ THE SLOT LIST IS NOT WRITTEN HERE. `ALL_DOC_SLOTS` is derived from the four
 * documents' own `requiredSlots`, so a fifth document type gets its slot accepted
 * by adding a catalogue row and nothing else — and, more importantly, a slot that
 * NO document asks for can never be accepted by this function. A hand-written union
 * here is how `PASSPORT` sat in the database enum, unused and unreachable, from the
 * first KYC release until 2026-08-20.
 * ⭐ Allowed on an APPROVED identity that has no officer's PHOTO approval yet (a typed-verified player
 * becoming an agent adds photos on top) — see `closedToPlayer`'s documents door.
 */
export async function attachDocument(userId: string, docType: KycDocSlot, storageKeyOrImage: string): Promise<ServiceResult> {
  if (!ALL_DOC_SLOTS.includes(docType)) {
    return { ok: false, error: "Unknown document slot.", code: "INVALID", reason: "doc_image_type" };
  }
  const valid = validateDocImage(storageKeyOrImage);
  if (!valid.ok) return { ok: false, error: valid.error, code: "INVALID", reason: valid.reason };
  const k = await db.kyc.findByUserId(userId);
  if (!k) return { ok: false, error: "Start KYC first.", code: "NOT_FOUND" };
  // ⛔ The images a FINAL refusal was decided on are evidence, and images under review or behind an officer's
  // photo approval are that decision's evidence — see `closedToPlayer`.
  const closed = closedToPlayer(k, "documents");
  if (closed) return closed;
  // ⛔ RATE-LIMITED (2026-10-10, review R1.6). Every attach writes the row (`updatedAt`), and the documents door is open
  // on an APPROVED identity (the agent upgrade) — so an unbounded loop of attaches kept moving the version every officer
  // form posts. Its OWN bucket (`<userId>:attach`), so the photos never spend the identity press's tokens, and its OWN
  // rule (`kyc.attach`, 12 at once, then 3 a minute — review R5.5): the `kyc.submit` rule it borrowed allowed a NIDA's
  // three photos two retakes in all, then one photo every two minutes. Asked after the doors and before the slow upload.
  const rl = await rateCheckAsync(kycAttachRateKey(userId), "kyc.attach");
  if (!rl.allowed) return { ok: false, error: "Too many attempts.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };
  // ⭐ ONLY AN ATTACH THAT LANDS SPENDS ITS TOKEN (R5.5): an upload that throws, or a write the lock refuses (a decision
  // landed meanwhile), hands it back — the player is never charged for our failure.
  let landed = false;
  try {
    // H8: persist via the storage seam — INLINE (data URL) today, Cloudflare R2 the
    // moment it's configured, with no change to this call site.
    const storedKey = await putKycDocument(storageKeyOrImage, `${userId}/${docType}`);
    // Carry the VERIFIED mime + size forward: once this is an `r2:<key>` the bytes
    // can no longer be measured from the stored value, and guessing produced
    // "0 bytes, application/octet-stream" for every R2 document.
    // ⛔ The upload above may take seconds against R2. The write happens under the submission lock, on the row as it
    // stands NOW — the lock re-asks `closedToPlayer` — so a refusal or a submission that landed during the upload is
    // never reverted by this player's stale copy.
    const saved = await underSubmissionLock<never>(userId, k, "documents", async (fresh) => {
      const docs = [...fresh.documents.filter((d: { docType: string }) => d.docType !== docType), { docType, storageKey: storedKey, uploadedAt: new Date().toISOString(), mimeType: valid.mimeType, sizeBytes: valid.bytes }];
      await db.kyc.upsert({ ...fresh, documents: docs, updatedAt: new Date().toISOString() });
      return { ok: true };
    });
    if (!saved.ok) return saved;
    landed = true;
  } finally {
    if (!landed) await rateRefundAsync(kycAttachRateKey(userId), "kyc.attach");
  }
  // Note: never log the image bytes themselves in the audit payload.
  audit({ category: "KYC", action: "kyc.document.uploaded", actorId: userId, targetType: "Kyc", targetId: k.id, payload: { docType, bytes: valid.bytes } });
  return { ok: true };
}

// ⛔ `attachExtraDocument` WAS DELETED HERE ON 2026-10-10. It filled an officer's REQUEST_INFO upload slot, and the
// owner's ruling of that day leaves officers one ask: CORRECTIONS of typed details (`askForCorrections`), never an
// extra document. Legacy requests stay on their rows, read-only, and never block a send (`submitForReview`).

/**
 * THE AGENT PHOTO TRACK, STEP 3 — send the photo case to an officer.
 *
 * Requires the identity details and the FULL photo set for that document (selfie included). Idempotent on a case
 * already sent, and on an identity an officer has already approved on photos. ⭐ From an APPROVED typed identity
 * (no photo approval yet) it moves to PENDING_REVIEW — `approvedAt` is kept, so the player's withdrawals stay open
 * while the officer looks at the photos.
 */
export async function submitForReview(userId: string): Promise<ServiceResult> {
  const k = await db.kyc.findByUserId(userId);
  if (!k) return { ok: false, error: "Start KYC first.", code: "NOT_FOUND" };
  // ⛔ A FINAL refusal never goes back to the queue on the player's say-so — see `closedToPlayer`.
  const closed = closedToPlayer(k, "submit");
  if (closed) return closed;
  if (!k.idVerifiedAt || !k.idType) return { ok: false, error: "Identity document not yet accepted.", code: "INVALID", reason: "id_not_verified" };
  // 🔴 THE REQUIRED SLOTS ARE THE ONES *THIS DOCUMENT* NEEDS — never a count.
  // `documents.length >= 3` was true of a NIDA and is a lie about a passport, and a
  // count can be satisfied by three copies of the same slot. Ask the catalogue
  // which slots are missing and name them (`photoSetComplete` asks the same question).
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
  // ⛔ THE EXTRA-REQUESTS GATE IS DELETED (2026-10-10). No new request can exist (REQUEST_INFO is removed), and a
  // legacy open one must never strand a player whose upload control no longer exists.

  // Idempotency guard: only fire on the transition INTO PENDING_REVIEW. A
  // double-submit / retry when already pending returns ok WITHOUT re-emailing
  // the player or the admins; an identity already approved on photos is past this gate.
  if (k.status === "PENDING_REVIEW" || photoStampStands(k)) {
    return { ok: true };
  }

  const now = new Date().toISOString();
  // ⛔ THE TRANSITION IS A COMPARE-AND-SWAP UNDER THE SUBMISSION LOCK. Every check above ran on the row read at the
  // top; the write happens only if the row is still exactly that row — so an officer's refusal, or a concurrent
  // submit, landing in between is never overwritten, and a double click emails nobody twice.
  let transitioned = false;
  const moved = await underSubmissionLock<never>(userId, k, "submit", async (fresh) => {
    if (fresh.status === "PENDING_REVIEW" || photoStampStands(fresh)) return { ok: true };
    if (fresh.status !== k.status || fresh.updatedAt !== k.updatedAt) {
      return { ok: false, error: "Your verification changed while it was being sent. Reload the page and try again.", code: "INVALID" };
    }
    await db.kyc.upsert({ ...fresh, status: "PENDING_REVIEW", submittedAt: now, updatedAt: now });
    transitioned = true;
    return { ok: true };
  });
  if (!moved.ok) return moved;
  if (!transitioned) return { ok: true };
  audit({ category: "KYC", action: "kyc.submitted", actorId: userId, targetType: "Kyc", targetId: k.id, payload: { evidence: "photos", priorStatus: k.status } });
  // ── Notifications (all best-effort; a failed send must never break submit) ──
  await announceCaseToOfficers(userId, k, {
    evidence: "photos",
    submittedAt: now,
    reasons: ["AGENT_PHOTOS"],
    urgent: !!k.idType && !!k.idNumber && nidaSaysUnder18(k.idType, k.idNumber, new Date(now)),
  });
  return { ok: true };
}

export async function getKycStatus(userId: string) {
  return await db.kyc.findByUserId(userId);
}

/** All KYC submissions awaiting an officer decision (for the review queue). */
export async function listPendingKyc() {
  // ⛔ FILTERED IN THE DATABASE SINCE 2026-09-05. This read `db.kyc.list()` — every row,
  // documents joined — and filtered here. Correct while KYC was optional and production
  // held 56 submissions. It changed when identity gated depositing, playing AND withdrawing
  // (2026-09-05), which sent every new account to verification first and gave each a row.
  // ⚠️ THAT REASON IS SUPERSEDED; THE ANSWER STANDS (2026-09-13). Identity is now asked before
  // WITHDRAWAL only (`kyc-gate.ts`), so a new account has no submission until the player opens
  // /profile/kyc. The filter stays: the table only grows, and this queue is now a MONEY queue —
  // a player in it may be waiting on us to take out their own balance (docs/COMPLIANCE-DECISIONS.md
  // 2026-09-13, S14) — so its render must not degrade with the history behind it.
  // ⚠️ The sort stays: `listByStatus` orders by `submittedAt` in SQL, and re-sorting here
  // costs nothing on a page-sized list while keeping FIFO true if a backend ever forgets.
  return (await db.kyc.listByStatus(["PENDING_REVIEW", "ADDITIONAL_INFO_REQUIRED"]))
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? "")); // oldest first (FIFO)
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
 * `BLURRY_DOC` is legacy (no new decision uses it since 2026-10-10) and kept for the rows that carry it.
 */
const REJECT_EMAIL_TEXT: Record<string, string> = {
  BLURRY_DOC: "The identity document photo was too blurry or dark to read.",
  DETAILS_MISMATCH: "The details entered do not match the identity document.",
  EXPIRED_ID: "The identity document has expired.",
  UNDERAGE: "You must be 18 or older to use 50pick.",
  DUPLICATE_IDENTITY: "This identity is already registered to another account.",
  SANCTIONED: "We're unable to verify this identity.",
  OTHER: "Please check your details and try again.",
};
/**
 * ⭐ The FINAL refusal reason in Swahili, for the email's Swahili half (audit session 95, 2026-09-13) — it used to say only
 * that the verification was refused, while Terms §3a promises the player the reason in every language. Final codes only:
 * `kycRejectedHtml` renders `reasonSw` on the final-refusal branch.
 */
const REJECT_EMAIL_TEXT_SW: Record<string, string> = {
  UNDERAGE: "Lazima uwe na umri wa miaka 18 au zaidi kutumia 50pick.",
  DUPLICATE_IDENTITY: "Utambulisho huu tayari umesajiliwa kwenye akaunti nyingine.",
  SANCTIONED: "Hatuwezi kuthibitisha utambulisho huu.",
};

/**
 * The submission as it looks after a restart — ONE shape for the player's own restart
 * (`startKyc`, and the typed press's inline restart of a recoverable refusal) and the officer's
 * re-opening of a final refusal (`reopenFinalRefusal`).
 *
 * ⛔ THE WHOLE IDENTITY TUPLE CLEARS TOGETHER. Leaving `idType` behind while nulling `idNumber`
 * would let a restarted submission carry the previous document's type into the next one's
 * validation — and leaving `idNumber` behind would hold a number hostage under the partial unique
 * index for a submission that no longer claims it. `idFingerprint` clears with it, which releases
 * the erasure-proof twin of the same number.
 *
 * 🔴 THE ONE FIELD THIS RESET MUST *NOT* CLEAR is `approvedAt`. Reachable: APPROVED → corrections
 * asked → REJECTED → restart. That player HOLDS MONEY earned under an identity we accepted; nulling their
 * first-approval date locks them out of it, and no suite would go red. Approval is a fact about the
 * past, not a state — see the column note in prisma/schema.prisma.
 *
 * ⭐ AND SINCE 2026-10-10, BUILT FIELD BY FIELD ON PURPOSE — this is one of the writers that BUILDS a row instead of
 * spreading the one it read, so every column is named here or the DAL writes it null:
 *   · `priorIdentities` APPENDS the identity being cleared (cause "restart" / "reopen") — with no images, the typed
 *     details are the only record of what this account presented;
 *   · `photoVerifiedAt`, `autoApprovedAt`, `autoFlags`, `postCheckedAt/ById` CLEAR — they describe the approval of
 *     the identity being cleared, and the next one earns its own; ⚠️ ONE caller puts two back: `reopenFinalRefusal`, for
 *     an approval only the machine made and no officer checked, keeps `autoApprovedAt`/`autoFlags` beside the kept
 *     `approvedAt` (review R5.1), because that `approvedAt` still opens withdrawal and must still say whose it is;
 *   · `documents` still CLEAR (the agent photo track's `missingSlots` must not be satisfied by refused images);
 *   · `extraRequests` are CARRIED as they are (legacy officer requests, read-only evidence);
 *   · `reviewerId` / `reviewedAt` are the caller's: an officer's re-open, or the officer whose refusal is restarted.
 */
function restartedSubmission(existing: Awaited<ReturnType<typeof db.kyc.findByUserId>>, userId: string, reviewer?: { officerId: string; at: string }, cause: "restart" | "reopen" = "restart"): StoredKyc {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? `kyc_${randomId(10)}`,
    userId,
    status: "IN_PROGRESS" as const,
    rejectReason: null,
    rejectNote: null,
    idType: null,
    idNumber: null,
    idExpiry: null,
    idVerifiedAt: null,
    idFingerprint: null,
    fullName: null,
    dob: null,
    documents: [],
    extraRequests: existing?.extraRequests ?? [],
    reviewerId: reviewer?.officerId ?? null,
    reviewedAt: reviewer?.at ?? null,
    submittedAt: null,
    approvedAt: existing?.approvedAt ?? null,
    photoVerifiedAt: null,
    autoApprovedAt: null,
    autoFlags: [],
    postCheckedAt: null,
    postCheckedById: null,
    priorIdentities: existing ? withPriorIdentity(existing, cause, now) : [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/**
 * ⭐ WHAT A FINAL REFUSAL DOES TO THE ACCOUNT — step one, taken BEFORE the refusal is written
 * (owner ruling, Ali, 2026-09-13 — docs/COMPLIANCE-DECISIONS.md, S1 and S15).
 *
 * From 2026-09-13 a player deposits and plays before anyone checks who they are, so a refusal can
 * land on an account holding real money. On a FINAL code (`UNDERAGE`, `SANCTIONED`,
 * `DUPLICATE_IDENTITY`) the wallet is frozen — no further deposits, bets or withdrawals — because
 * "we have refused you, please keep paying" is the one outcome no compliance argument survives.
 * What then happens to the balance is an officer's recorded decision (`refused-funds.ts`).
 *
 * ⛔ ORDER: FREEZE FIRST, THEN WRITE THE REFUSAL. If the freeze fails, nothing is written and the
 * officer's click fails loudly, so a retry does both. The other order leaves a refusal on record
 * with no freeze behind it — and the retry is refused, because a decided submission cannot be
 * decided again, so the freeze would never happen. A freeze with no refusal (the write fails
 * after) is the safe residue: the officer retries, the freeze is idempotent, the refusal lands.
 *
 * ⚠️ A RECOVERABLE code does nothing here. The player may simply submit again.
 */
async function freezeForFinalRefusal(userId: string, kycId: string, rejectCode: string, actorId: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isFinalRefusal(rejectCode)) return { ok: true };
  const frozen = await addWalletFreeze(userId, "IDENTITY_REFUSED", { actorId, note: `identity refused · ${rejectCode}`, ref: { kycId, rejectCode } });
  // A player with no wallet row has nothing to freeze and nothing to protect — not a failure.
  if (!frozen.ok && frozen.code !== "NOT_FOUND") {
    return { ok: false, error: `The wallet could not be frozen, so the refusal was not recorded. Try again. (${frozen.error})` };
  }
  return { ok: true };
}

/**
 * ⭐ AFTER A NON-FINAL OFFICER DECISION, AN IDENTITY HOLD WITH NO FINAL REFUSAL BEHIND IT IS LIFTED (audit session 95,
 * 2026-09-13). `freezeForFinalRefusal` writes the hold BEFORE the refusal, so a refusal write that failed — or an officer
 * who then approved or asked for corrections instead — left an IDENTITY_REFUSED hold standing on a wallet whose
 * verification says something else. Called inside the identity lock, after the decision is written; it lifts only that
 * reason (an officer's own hold or a self-exclusion stays) and a failed lift never fails the officer's decision.
 * ⛔ An OFFICER's decision only — the automatic approval never lifts a hold (it routes instead).
 * ⛔ AND ONLY AN OFFICER'S APPROVAL LIFTS ONE THAT STANDS ON AN APPROVAL ONLY THE MACHINE MADE (2026-10-10, review R5.1).
 * A re-open of a final refusal of such an approval KEEPS the identity hold on purpose (`reopenFinalRefusal`), and from
 * then on the hold reads as "stale" — no final refusal stands behind it. Corrections asked, or a recoverable refusal,
 * are not an officer accepting that identity, so neither may lift it: the machine's `approvedAt` would open withdrawal
 * again on an identity no officer has accepted. Asked of the row as the decision left it (a failed read lifts nothing).
 */
async function liftStaleIdentityHoldAfterDecision(userId: string, officerId: string, kycId: string, decision: "APPROVE" | "CORRECTIONS" | "REJECT"): Promise<void> {
  // ⛔ NEVER THROWS (2026-10-10, review R2.10): it runs after the decision is written and audited, and a failed read of
  // the hold must not turn a recorded decision into an error the officer retries.
  try {
    if (decision !== "APPROVE" && uncheckedAutomaticApproval(await db.kyc.findByUserId(userId))) return;
    if (!(await staleIdentityHold(userId))) return;
    const lifted = await removeWalletFreeze(userId, "IDENTITY_REFUSED", { actorId: officerId, note: `stale identity hold lifted on ${decision}`, ref: { kycId, decision } });
    if (!lifted.ok && lifted.code !== "NOT_FOUND") console.warn(`[kyc] stale identity hold could not be lifted for ${userId.slice(0, 14)}…: ${lifted.error}`);
  } catch (err) {
    console.warn(`[kyc] stale identity hold could not be checked for ${userId.slice(0, 14)}…: ${(err as Error)?.message ?? err}`);
  }
}

/** Step two, AFTER the refusal is written: the awaited COMPLIANCE fact an inspector reads. */
async function recordFinalRefusal(userId: string, kycId: string, rejectCode: string, actorId: string | null): Promise<void> {
  if (!isFinalRefusal(rejectCode)) return;
  // ⛔ `Promise.resolve().then(…)`, NOT `db.wallet.findByUserId(userId).catch(…)`: the in-memory store
  // returns a plain value, so a chained `.catch` threw on every final refusal in every unit suite — after the
  // freeze and the REJECTED write, before this fact, the notice and the email (found by `test:kyc`, 2026-09-13).
  const w = await Promise.resolve().then(() => db.wallet.findByUserId(userId)).catch(() => null);
  await audit({
    category: "COMPLIANCE",
    action: "kyc.refused_final",
    actorId,
    targetType: "User",
    targetId: userId,
    payload: {
      kycId,
      rejectCode,
      walletStatus: w?.status ?? null,
      // What is at stake the moment we refuse — the number the officer's balance decision starts from.
      balance: w?.balance ?? null,
      hold: w?.hold ?? null,
      bonusBalance: w?.bonusBalance ?? null,
      instruction: "Owner ruling 2026-09-13 · a final identity refusal freezes the wallet; an officer decides the balance case by case with a recorded reason",
    },
  });
}

/** The officer's written reason for re-opening a final refusal — the same floor as a balance decision. */
export const REOPEN_FINAL_REFUSAL_REASON_MIN = 20;

/**
 * An officer re-opens a FINAL refusal that was wrong — the only door back after one.
 *
 * ⭐ WHAT IT DOES, together: the submission restarts exactly as a player's own restart would (the
 * document number is released, `approvedAt` survives, the identity goes into `priorIdentities` with
 * cause "reopen"), the identity-refusal hold on the wallet is lifted (other holds — self-exclusion, an
 * officer's own freeze — stay), and a COMPLIANCE fact is written with the officer's reason. The player is
 * told they may verify again — and, the officer's provenance being on the row, their next send goes to an
 * officer, never straight to an automatic approval.
 * ⛔ EXCEPT THE LIFT, when the refused identity's approval was the MACHINE's alone and no officer had checked it
 * (2026-10-10, review R5.1): the hold is KEPT (`holdKept` on the audit row) and so is that approval's machine
 * provenance on the row, until an officer approves the identity the player sends next — see the comment in the body.
 *
 * ⛔ IT CANNOT RE-OPEN A RECOVERABLE REFUSAL (the player does that themselves) and an officer
 * cannot re-open their own. It does not undo a balance decision already carried out: money returned
 * or forfeited stays returned or forfeited, and the report keeps both facts side by side.
 */
export async function reopenFinalRefusal(officerId: string, userId: string, reason: string): Promise<ServiceResult> {
  if (!userId) return { ok: false, error: "Missing player.", code: "INVALID" };
  if (officerId === userId) {
    audit({ category: "SECURITY", action: "kyc.reopen.self_blocked", actorId: officerId, targetType: "User", targetId: userId });
    return { ok: false, error: "You cannot re-open your own identity verification.", code: "INVALID" };
  }
  const clean = (reason ?? "").trim().slice(0, 500);
  if (clean.length < REOPEN_FINAL_REFUSAL_REASON_MIN) {
    return { ok: false, error: `A reason of at least ${REOPEN_FINAL_REFUSAL_REASON_MIN} characters is required to re-open a final refusal.`, code: "INVALID" };
  }
  const reopened = await withLock(`kyc:${userId}`, async () => {
    const k = await db.kyc.findByUserId(userId);
    if (!k) return { ok: false as const, error: "No verification for this player.", code: "NOT_FOUND" as const };
    if (k.status !== "REJECTED" || !isFinalRefusal(k.rejectReason)) {
      return { ok: false as const, error: `Only a FINAL refusal can be re-opened here (this verification is ${k.status}${k.rejectReason ? ` · ${k.rejectReason}` : ""}).`, code: "INVALID" as const };
    }
    // ⛔ NOT WHILE MONEY IS STILL LEAVING (audit session 95, 2026-09-13). A refused-funds return in flight holds its
    // amount; re-opening now lifts the identity hold, and if that payout then fails its reversal lands in an ACTIVE
    // wallet while the decision row still says "returned" and the case has already left the refused report.
    const inFlight = await db.wallet.findByUserId(userId);
    if (inFlight && inFlight.hold > 0) {
      return { ok: false as const, error: `A payout of ${inFlight.hold.toLocaleString("en")} TZS is still in flight on this account. Wait for it to settle, then re-open.`, code: "INVALID" as const };
    }
    const now = new Date().toISOString();
    const priorRejectReason = k.rejectReason;
    // ⭐ THE REFUSAL'S EVIDENCE IS RECORDED BEFORE THE RESET CLEARS IT (audit session 95, 2026-09-13). The reset nulls the
    // identity tuple and empties the document list, so a re-opened SANCTIONED or UNDERAGE refusal used to leave nothing
    // an inspector could reopen. The pointers go into the tamper-evident chain: the document storage keys (R2 objects are
    // not deleted by a reset), the document type, the fingerprint (a keyed hash, never the number) and who decided when.
    // ⛔ An INLINE image (`data:` URL, local/dev storage only) is NOT copied into the audit payload — it is the image itself.
    const evidence = {
      idType: k.idType ?? null,
      idFingerprint: (k as { idFingerprint?: string | null }).idFingerprint ?? null,
      reviewerId: k.reviewerId ?? null,
      reviewedAt: k.reviewedAt ?? null,
      submittedAt: k.submittedAt ?? null,
      documents: (k.documents ?? []).map((d: { docType: string; storageKey?: string | null; uploadedAt?: string | null }) => ({
        docType: d.docType,
        uploadedAt: d.uploadedAt ?? null,
        storageKey: typeof d.storageKey === "string" && !d.storageKey.startsWith("data:") ? d.storageKey : null,
        inline: typeof d.storageKey === "string" && d.storageKey.startsWith("data:"),
      })),
    };
    // ⛔ AN APPROVAL ONLY THE MACHINE MADE KEEPS ITS HOLD THROUGH A RE-OPEN (2026-10-10, review R5.1). The reset keeps
    // `approvedAt` (a fact about the past), and `approvedAt` keeps withdrawal open — so lifting the identity hold here
    // re-opened payouts on an identity an officer had refused and no officer had ever accepted. Asked of the REFUSED row,
    // before the reset: an automatic approval no officer checked (`uncheckedAutomaticApproval`). Then the hold stays, and
    // the re-opened row KEEPS that approval's machine provenance (`autoApprovedAt`, its flags — the one pair the reset
    // otherwise clears), so every later decision still knows whose approval `approvedAt` is: the next send ROUTES
    // (WALLET_HOLD, and the re-opening officer's provenance), corrections or a recoverable refusal lift nothing
    // (`liftStaleIdentityHoldAfterDecision`), and the officer's APPROVAL lifts the hold as the stale one it then is.
    // An identity an officer approved or checked keeps today's behaviour: the hold is lifted.
    const keepHold = uncheckedAutomaticApproval(k);
    const restarted = restartedSubmission(k, userId, { officerId, at: now }, "reopen");
    await db.kyc.upsert(keepHold
      ? { ...restarted, autoApprovedAt: k.autoApprovedAt ?? null, autoFlags: Array.isArray(k.autoFlags) ? [...k.autoFlags] : [] }
      : restarted);
    const unfrozen = keepHold ? null : await removeWalletFreeze(userId, "IDENTITY_REFUSED", { actorId: officerId, note: clean, ref: { kycId: k.id, priorRejectReason } });
    await audit({
      category: "COMPLIANCE",
      action: "kyc.refusal_reopened",
      actorId: officerId,
      targetType: "User",
      targetId: userId,
      payload: {
        kycId: k.id,
        priorRejectReason,
        evidence,
        reason: clean,
        // The wallet as the re-open leaves it: after the lift, or — the hold kept — as it stood.
        walletStatusAfter: unfrozen ? (unfrozen.ok ? unfrozen.status : null) : (inFlight?.status ?? null),
        walletHoldsAfter: unfrozen ? (unfrozen.ok ? unfrozen.reasons : null) : (inFlight ? currentFreezeReasons(inFlight) : null),
        walletHoldError: unfrozen && !unfrozen.ok && unfrozen.code !== "NOT_FOUND" ? unfrozen.error : null,
        holdKept: keepHold ? "unchecked_automatic_approval" : null,
      },
    });
    // ⭐ ITS OWN NOTICE (2026-10-10, review R4.4) — "you can verify your identity again". The corrections notice this sent
    // tells the player to "read the note", and a re-opened row has no note (the reset nulls it) and no details to correct.
    notifyKyc(userId, "REOPENED").catch(() => {});
    // ⛔ THE ORDER STAYS (reset, then lift) AND A FAILED LIFT IS SAID, NEVER REPORTED AS SUCCESS (review, 2026-09-13).
    // Lifting first would, on a failed reset, leave a FINAL refusal standing on a live wallet — an underage or
    // sanctioned person able to transact. So the reset goes first; if the lift then fails the officer is told,
    // and `unfreezeWalletByOfficer` can lift an identity hold whose final refusal is no longer on record.
    if (unfrozen && !unfrozen.ok && unfrozen.code !== "NOT_FOUND") {
      return { ok: false as const, error: `The refusal was re-opened, but the wallet hold could not be lifted (${unfrozen.error}). Use Unfreeze on the player's page to lift it.`, code: "INVALID" as const };
    }
    return { ok: true as const };
  });
  // A2 row 11's way out · the refusal is re-opened, so the cause that voided consent is gone. The bot does not
  // resume by itself; the holder's permission is confirmed again first. ⚠️ A failed wallet lift still re-opened
  // the refusal, so the hook runs on that answer too.
  if (reopened.ok || reopened.code === "INVALID") {
    runOutsideLock(() => {
      void import("./house-bot/holder-hook").then((m) => m.onHolderAccountChanged(userId, "IDENTITY_REOPENED")).catch(() => {});
    });
  }
  return reopened;
}

/** The refusal an officer form gets when the case changed after it was rendered. */
const STALE_CASE = "This case changed since you opened it. Reload it and decide again.";

// ⛔ `uncheckedAutomaticApproval` LIVES IN `src/lib/kyc-approval.ts` (2026-10-10, review R5.1) — ONE predicate for this
// service and the officer's workstation (`freezeOnReject`), and it asks NO status. The local copy that stood here asked
// APPROVED / ADDITIONAL_INFO_REQUIRED only, on the theory that a PENDING_REVIEW row was an agent applicant's photo case;
// it is also a typed-verified player's photo upgrade, a corrected send routed on the officer's provenance and a corrected
// date of birth — each keeping the machine's `approvedAt` and so withdrawal — and a recoverable refusal there landed with
// the money still flowing, on an identity no officer had accepted.

/** An optional "Also freeze the wallet" ask, validated BEFORE any decision is written. */
function freezeAsk(alsoFreeze: boolean | undefined, freezeReason: string | undefined): { ok: true; reason: string | null } | { ok: false; error: string } {
  if (!alsoFreeze) return { ok: true, reason: null };
  const clean = (freezeReason ?? "").trim();
  if (clean.length < OFFICER_FREEZE_REASON_MIN) return { ok: false, error: `A reason for the freeze (at least ${OFFICER_FREEZE_REASON_MIN} characters) is required.` };
  return { ok: true, reason: clean };
}

/**
 * Officer decision on a KYC submission — APPROVE or REJECT.
 *
 * Hardened for the scenarios a compliance officer hits in practice:
 *  - Self-review blocked (an officer can't verify their own identity).
 *  - VERSIONED: the form posts the row version it showed (`kycRowVersion`); a case that changed since is refused,
 *    so an officer never decides on details they have not seen. APPROVE asks for the row EXACTLY as shown; REJECT asks
 *    for the IDENTITY as shown (`sameIdentityVersion`), so a write that changes no identity fact — a photo attached on
 *    the agent track — can never void a refusal (2026-10-10, review R1.6).
 *  - APPROVE only from PENDING_REVIEW, and only when the automatic checks show no BLOCK on the server (under 18,
 *    expired) — flags never stop an officer. The attestations, when posted, must be THIS case's set (photo mode
 *    on a full photo set, typed mode otherwise — `kyc-attestations.ts`), and a photo-mode approval stamps
 *    `photoVerifiedAt`, the agent programme's gate. The approval records the attestation set only when it was posted.
 *  - REJECT from PENDING_REVIEW, APPROVED or ADDITIONAL_INFO_REQUIRED. ⭐ The last since 2026-10-10 (review R1.1):
 *    corrections are now asked of APPROVED identities, and a player who never answers kept withdrawal open while no
 *    refusal — a final one included — could be recorded against them. A RECOVERABLE code
 *    (DETAILS_MISMATCH, EXPIRED_ID, OTHER) frees the number and the player may start again — back to an officer, the
 *    refusal's provenance being carried; `BLURRY_DOC` is refused for a new decision (no photo to be blurry). A FINAL
 *    code (`UNDERAGE`, `SANCTIONED`, `DUPLICATE_IDENTITY`) freezes the wallet in the same step and keeps the document
 *    number reserved; what happens to the balance is an officer's recorded decision (`refused-funds.ts`).
 *    docs/COMPLIANCE-DECISIONS.md 2026-09-13, S1. ⭐ "Also freeze the wallet" (an officer's own hold) is offered on
 *    every rejection: a recoverable refusal of an APPROVED identity leaves `approvedAt`, and so withdrawals, open.
 *    ⛔ And it is REQUIRED on a recoverable refusal of an AUTOMATIC approval no officer has checked yet
 *    (`uncheckedAutomaticApproval`, review R1.2): that `approvedAt` records no officer's acceptance, and Terms §3a
 *    promises no money goes out when we cannot verify an identity. A final code's own freeze already holds the wallet.
 *    ⭐ WHATEVER STATUS THE APPROVAL SITS IN NOW (review R5.1): PENDING_REVIEW too — an agent photo send, a corrected
 *    send routed on provenance and a date-of-birth correction each move it there with `approvedAt` intact.
 *  - APPROVE opens the withdrawal gate and nothing else. It never overrides a SUSPENDED / CLOSED /
 *    SELF_EXCLUDED / COOLED_OFF status — those outrank a KYC pass.
 *  - Player is always notified (in-app + best-effort email). Both clicks audited.
 * ⛔ The REQUEST_INFO decision was REMOVED on 2026-10-10 — officers ask for corrections (`askForCorrections`).
 */
export async function reviewKyc(opts: {
  officerId: string;
  userId: string;
  decision: "APPROVE" | "REJECT";
  /** The row version the officer's form showed (`kycRowVersion`). Required. */
  version: string;
  /** APPROVE: which attestation set the officer used. Must match the case (photo set on file → photo). */
  mode?: KycAttestationMode;
  /** APPROVE: the officer's attestations, re-validated here when posted (the action records them). */
  attestations?: Record<string, "pass">;
  /** REJECT only: the categorised `KycRejectReason`. Defaults to OTHER, which is
   *  correct for a free-text rejection but was previously forced on EVERY manual
   *  rejection — the officer picked "Details mismatch" and both the compliance
   *  record and the player read "other". */
  rejectCode?: KycRejectCode;
  reason?: string;
  note?: string;
  /** REJECT only: also put an officer's hold on the wallet, with `freezeReason`. */
  alsoFreeze?: boolean;
  freezeReason?: string;
  /** Which door the decision came through — recorded on the approval. */
  via?: "workstation" | "agent_approval";
}): Promise<ServiceResult> {
  const { officerId, userId, decision } = opts;
  if (!userId) return { ok: false, error: "Missing user.", code: "INVALID" };
  if (officerId === userId) {
    audit({ category: "SECURITY", action: "kyc.review.self_blocked", actorId: officerId, targetType: "User", targetId: userId });
    return { ok: false, error: "You cannot review your own identity verification.", code: "INVALID" };
  }
  if (decision !== "APPROVE" && decision !== "REJECT") {
    return { ok: false, error: "Unknown decision. Approve, reject, or ask the player for corrections.", code: "INVALID" };
  }
  if (!opts.version) return { ok: false, error: STALE_CASE, code: "INVALID" };
  const reason = (opts.reason ?? "").trim();
  // A rejection puts text in front of the player — require it.
  //
  // A CATEGORISED rejection is the exception: `humanizeRejectReason` renders the
  // enum member as a translated sentence on /profile/kyc, so the player is told
  // why in their own language with no free text at all. OTHER renders nothing,
  // so an uncategorised rejection still has to carry words or the player is told
  // they were rejected and nothing else (§6 E-6).
  const rejectCode = opts.rejectCode ?? "OTHER";
  if (decision === "REJECT") {
    if (!isDecidableRefusalCode(rejectCode)) {
      return { ok: false, error: `${rejectCode} is not a reason for a new decision. Choose details mismatch, expired document, other, or a final code.`, code: "INVALID" };
    }
    const categorised = rejectCode !== "OTHER";
    if (!categorised && reason.length < 5) {
      return { ok: false, error: "A rejection reason (at least 5 characters) is required.", code: "INVALID" };
    }
  }
  const freezeWanted = decision === "REJECT" ? freezeAsk(opts.alsoFreeze, opts.freezeReason) : ({ ok: true, reason: null } as const);
  if (!freezeWanted.ok) return { ok: false, error: freezeWanted.error, code: "INVALID" };

  let after: (() => void) | null = null;
  const reviewed = await withLock(`kyc:${userId}`, async () => {
    const k = await db.kyc.findByUserId(userId);
    if (!k) return { ok: false as const, error: "No KYC submission for this user.", code: "NOT_FOUND" as const };
    const now = new Date().toISOString();

    if (decision === "APPROVE") {
      if (k.status !== "PENDING_REVIEW") {
        return { ok: false as const, error: `KYC is ${k.status} — only a submission awaiting review can be approved.`, code: "INVALID" as const };
      }
      if (!sameRowVersion(k, opts.version)) return { ok: false as const, error: STALE_CASE, code: "INVALID" as const };
      if (!isIdDocType(k.idType) || !k.idNumber) {
        return { ok: false as const, error: "This case has no identity details to approve.", code: "INVALID" as const };
      }
      const caseMode: KycAttestationMode = photoSetComplete(k.idType, (k.documents ?? []).map((d: { docType: string }) => d.docType)) ? "photo" : "typed";
      if (opts.mode && opts.mode !== caseMode) {
        return { ok: false as const, error: `This is a ${caseMode} case now — reload it and confirm the ${caseMode} checks.`, code: "INVALID" as const };
      }
      // The statements as validated — carried into the approval, which records them as the post-check they are (R5.3).
      let attestations: Record<string, "pass"> | null = null;
      if (opts.attestations !== undefined) {
        const attest = parseAttestations(opts.attestations, caseMode);
        if (!attest.ok) return { ok: false as const, error: attest.error, code: "INVALID" as const };
        attestations = attest.attested;
      }
      // ⛔ THE SERVER RE-CHECKS THE BLOCKS ON EVERY APPROVAL. Only the blocks bind an officer — the routes are why the
      // case is in front of them and the flags are for them to read — so the side facts are neutral here.
      const u0 = await db.user.findById(userId);
      const accountDob = (u0?.dob ? String(u0.dob) : k.dob ? String(k.dob) : "").slice(0, 10);
      const check = decideKyc({
        idType: k.idType,
        idNumber: k.idNumber,
        idExpiry: k.idExpiry ?? null,
        accountDob,
        now: new Date(now),
        formatFlags: [],
        riskScore: 0,
        riskThreshold: KYC_MAKER_CHECKER_THRESHOLD,
        holds: [],
        sofStatus: null,
        amlEscalationOpen: false,
        underageAttempt: false,
        samePerson: [],
        officerProvenance: true,
        track: caseMode === "photo" ? "agent" : "typed",
      });
      if (check.blocks.length) {
        audit({ category: "COMPLIANCE", action: "kyc.approve.blocked", actorId: officerId, targetType: "User", targetId: userId, payload: { kycId: k.id, blocks: check.rows.filter((r) => r.outcome === "block").map((r) => r.key) } });
        return { ok: false as const, error: `This identity cannot be approved: ${check.blocks.join("; ")}.`, code: "INVALID" as const };
      }
      after = await approveIdentity(k, userId, { kind: "officer", officerId, mode: caseMode, via: opts.via ?? "workstation", attested: opts.attestations !== undefined, attestations }, now);
      return { ok: true as const };
    }

    // REJECT — from PENDING_REVIEW, APPROVED, or ADDITIONAL_INFO_REQUIRED (a player asked for corrections who has not
    // answered — R1.1, see the header). Every code from each, the final ones freezing first as always.
    if (k.status !== "PENDING_REVIEW" && k.status !== "APPROVED" && k.status !== "ADDITIONAL_INFO_REQUIRED") {
      return { ok: false as const, error: `KYC is ${k.status} — only a submission awaiting review, one waiting on the player's corrections, or an approved identity can be rejected.`, code: "INVALID" as const };
    }
    if (!sameIdentityVersion(k, opts.version)) return { ok: false as const, error: STALE_CASE, code: "INVALID" as const };
    // ⛔ AN UNCHECKED AUTOMATIC APPROVAL IS NOT REFUSED WITH THE MONEY LEFT FLOWING (2026-10-10, review R1.2). Its
    // `approvedAt` was stamped by the machine and keeps withdrawal open for good (`approvedEver`), so a recoverable
    // refusal of it — a stolen number, say — would still pay out. The officer's hold is required here, from EVERY status
    // this branch accepts (R5.1: the predicate asks none — `kyc-approval.ts`); a final code freezes the wallet itself, below.
    if (!isFinalRefusal(rejectCode) && uncheckedAutomaticApproval(k) && !freezeWanted.reason) {
      return { ok: false as const, error: "Rejecting an automatic approval no officer has checked also holds the wallet — tick “Also freeze the wallet”.", code: "INVALID" as const };
    }
    // `reason` is the officer's free-text, player-facing message. It belongs in rejectNote (free text);
    // rejectReason is the KycRejectReason enum. (Writing free text into the enum column threw in Postgres and
    // lost the decision in prod — hence the strict `rejectCode` union above.)
    // Empty, not "": a categorised rejection needs no free text, and the column
    // is nullable. Anything stored here is shown to the player VERBATIM, in
    // whatever language it was written — which is why nothing English is put
    // here on behalf of the officer (§6 E-6).
    const officerNote = (opts.note?.trim() || reason) || null;
    // ⭐ "Also freeze the wallet" — an officer's own hold, taken BEFORE the refusal is written for the same reason as a
    // final code's (a failed freeze writes nothing; the officer retries both).
    if (freezeWanted.reason) {
      const held = await freezeWalletByOfficer(officerId, userId, freezeWanted.reason);
      if (!held.ok && held.code !== "NOT_FOUND") return { ok: false as const, error: `The wallet could not be frozen, so nothing was recorded. Try again. (${held.error})`, code: "INVALID" as const };
    }
    // ⭐ A FINAL CODE FREEZES THE WALLET FIRST (2026-09-13, S1/S15) — see `freezeForFinalRefusal`
    // for why the freeze precedes the write. A recoverable code passes straight through.
    const freeze = await freezeForFinalRefusal(userId, k.id, rejectCode, officerId);
    if (!freeze.ok) return { ok: false as const, error: freeze.error, code: "INVALID" as const };
    await db.kyc.upsert({ ...k, status: "REJECTED", rejectReason: rejectCode, rejectNote: officerNote, reviewerId: officerId, reviewedAt: now, updatedAt: now });
    // A RECOVERABLE refusal leaves no final refusal on record: an identity hold still standing is stale. A final code
    // just wrote its own hold (above) and keeps it.
    if (!isFinalRefusal(rejectCode)) await liftStaleIdentityHoldAfterDecision(userId, officerId, k.id, "REJECT");
    // ⛔ The officer's note stays on the row — the player reads it there — and never enters the audit chain (2026-10-10).
    audit({
      category: "KYC", action: "kyc.rejected", actorId: officerId, targetType: "User", targetId: userId,
      payload: { kycId: k.id, rejectCode, priorStatus: k.status, noteLength: officerNote?.length ?? 0, alsoFreeze: !!freezeWanted.reason, idType: k.idType ?? null, idFingerprint: k.idFingerprint ?? null, last4: last4(k.idNumber) },
    });
    await recordFinalRefusal(userId, k.id, rejectCode, officerId);
    // ⛔ A final code must not be told to re-submit — see `refuseUnderage`.
    const reviewFinal = isFinalRefusal(rejectCode);
    after = () => {
      notifyKyc(userId, "REJECTED", { finalRefusal: reviewFinal }).catch(() => {});
      sendEmailToUser(userId, (email) => ({
        to: email,
        subject: reviewFinal ? "Identity verification refused" : "Identity check needs attention",
        // The email has no dictionary, so it falls back to an English rendering of
        // the category rather than going out with a blank reason line.
        html: kycRejectedHtml({ reason: officerNote ?? REJECT_EMAIL_TEXT[rejectCode], reasonSw: reviewFinal ? REJECT_EMAIL_TEXT_SW[rejectCode] : undefined, reference: k.id, finalRefusal: reviewFinal }),
        tag: "kyc-rejected",
      }));
    };
    return { ok: true as const };
  });
  if (reviewed.ok) (after as (() => void) | null)?.();
  // A2 row 11 · an officer's FINAL refusal is a holder cause. Fired after the lock returns (C4-SPEC ruling 127):
  // this function is also nested inside an `agent:` lock on the approval path.
  if (reviewed.ok && decision === "REJECT" && isFinalRefusal(rejectCode)) {
    runOutsideLock(() => {
      void import("./house-bot/holder-hook").then((m) => m.onHolderAccountChanged(userId, "IDENTITY_REFUSED")).catch(() => {});
    });
  }
  return reviewed;
}

/** The officer's note to a player asked for corrections — the floor it must clear. */
export const CORRECTIONS_NOTE_MIN = 5;

/**
 * ⭐ ASK THE PLAYER TO CORRECT THEIR DETAILS (2026-10-10) — the one ask an officer has, replacing REQUEST_INFO (extra
 * documents) and force re-verify. From PENDING_REVIEW or APPROVED → ADDITIONAL_INFO_REQUIRED, with the officer's note
 * (shown to the player, never copied into the audit chain).
 *
 * 🔴 WHAT IT DOES TO MONEY — the same answer force re-verify gave since 2026-09-13: NOTHING. Withdrawal stays open on an
 * account approved once (`approvedAt` is never cleared), deposits and bets were never identity-gated. It means "we are
 * re-checking you" and nothing else. ⛔ So an officer who needs money to stop uses a money control — "Also freeze the
 * wallet" (`freezeWalletByOfficer`) is offered on this very action; payouts can also be paused platform-wide.
 * ⛔ Never writes `extraRequests`. On an account approved once, the player may correct the name and expiry but not the
 * document number (`identity_number_locked`); their corrected send goes back to an officer (officer provenance).
 */
export async function askForCorrections(officerId: string, userId: string, opts: { note: string; version: string; alsoFreeze?: boolean; freezeReason?: string }): Promise<ServiceResult> {
  if (!userId) return { ok: false, error: "Missing user.", code: "INVALID" };
  if (officerId === userId) {
    audit({ category: "SECURITY", action: "kyc.corrections.self_blocked", actorId: officerId, targetType: "User", targetId: userId });
    return { ok: false, error: "You cannot ask yourself for corrections.", code: "INVALID" };
  }
  const note = (opts.note ?? "").trim().slice(0, 500);
  if (note.length < CORRECTIONS_NOTE_MIN) return { ok: false, error: `Tell the player what to correct (at least ${CORRECTIONS_NOTE_MIN} characters).`, code: "INVALID" };
  if (!opts.version) return { ok: false, error: STALE_CASE, code: "INVALID" };
  const freezeWanted = freezeAsk(opts.alsoFreeze, opts.freezeReason);
  if (!freezeWanted.ok) return { ok: false, error: freezeWanted.error, code: "INVALID" };

  let kycId: string | null = null;
  const asked = await withLock(`kyc:${userId}`, async () => {
    const k = await db.kyc.findByUserId(userId);
    if (!k) return { ok: false as const, error: "No KYC submission for this user.", code: "NOT_FOUND" as const };
    if (k.status !== "PENDING_REVIEW" && k.status !== "APPROVED") {
      return { ok: false as const, error: `KYC is ${k.status} — corrections can be asked of a submission awaiting review or an approved identity.`, code: "INVALID" as const };
    }
    // The IDENTITY the officer saw (R1.6) — a photo attached since changes nothing they ask the player to correct.
    if (!sameIdentityVersion(k, opts.version)) return { ok: false as const, error: STALE_CASE, code: "INVALID" as const };
    if (freezeWanted.reason) {
      const held = await freezeWalletByOfficer(officerId, userId, freezeWanted.reason);
      if (!held.ok && held.code !== "NOT_FOUND") return { ok: false as const, error: `The wallet could not be frozen, so nothing was recorded. Try again. (${held.error})`, code: "INVALID" as const };
    }
    const now = new Date().toISOString();
    await db.kyc.upsert({ ...k, status: "ADDITIONAL_INFO_REQUIRED", rejectReason: null, rejectNote: note, reviewerId: officerId, reviewedAt: now, updatedAt: now });
    await liftStaleIdentityHoldAfterDecision(userId, officerId, k.id, "CORRECTIONS");
    audit({ category: "COMPLIANCE", action: "kyc.corrections_asked", actorId: officerId, targetType: "User", targetId: userId, payload: { kycId: k.id, priorStatus: k.status, noteLength: note.length, alsoFreeze: !!freezeWanted.reason } });
    kycId = k.id;
    return { ok: true as const };
  });
  if (!asked.ok) return asked;
  notifyKyc(userId, "ADDITIONAL_INFO").catch(() => {});
  sendEmailToUser(userId, (email) => ({
    to: email,
    subject: "Please check your details · 50pick verification",
    html: kycMoreInfoHtml({ reason: note, reference: kycId ?? undefined }),
    tag: "kyc-more-info",
  }));
  return { ok: true };
}

/**
 * ⭐ THE OFFICER'S CHECK OF AN AUTOMATIC APPROVAL (2026-10-10). Requires an APPROVED identity that was approved
 * automatically and not yet checked, the version the officer saw, and the TYPED attestation set (which acknowledges
 * the number's flags). The blocks are re-checked on the server: a case that should never have been approved is
 * refused here — the officer rejects it or asks for corrections instead. Writes `postCheckedAt/ById`.
 * ⛔ The version check is EXACT, like APPROVE (`sameRowVersion`): Mark checked attests the approval's flags as recorded
 * and closes the item, so a write it did not see refuses it — which only leaves the item on the list (the safe side).
 * A refusal of the same approval compares the identity alone and can never be blocked that way (review R1.6).
 */
export async function markPostChecked(officerId: string, userId: string, opts: { version: string; attestations: Record<string, "pass"> }): Promise<ServiceResult> {
  if (!userId) return { ok: false, error: "Missing user.", code: "INVALID" };
  if (officerId === userId) {
    audit({ category: "SECURITY", action: "kyc.post_check.self_blocked", actorId: officerId, targetType: "User", targetId: userId });
    return { ok: false, error: "You cannot check your own identity verification.", code: "INVALID" };
  }
  if (!opts.version) return { ok: false, error: STALE_CASE, code: "INVALID" };
  const attest = parseAttestations(opts.attestations, "typed");
  if (!attest.ok) return { ok: false, error: attest.error, code: "INVALID" };
  return withLock(`kyc:${userId}`, async () => {
    const k = await db.kyc.findByUserId(userId);
    if (!k) return { ok: false as const, error: "No KYC submission for this user.", code: "NOT_FOUND" as const };
    if (k.status !== "APPROVED" || !k.autoApprovedAt || k.postCheckedAt) {
      return { ok: false as const, error: "Only an automatic approval not yet checked can be marked checked.", code: "INVALID" as const };
    }
    if (!sameRowVersion(k, opts.version)) return { ok: false as const, error: STALE_CASE, code: "INVALID" as const };
    if (!isIdDocType(k.idType) || !k.idNumber) return { ok: false as const, error: "This case has no identity details.", code: "INVALID" as const };
    const now = new Date().toISOString();
    const u = await db.user.findById(userId);
    const check = decideKyc({
      idType: k.idType, idNumber: k.idNumber, idExpiry: k.idExpiry ?? null,
      accountDob: (u?.dob ? String(u.dob) : k.dob ? String(k.dob) : "").slice(0, 10),
      now: new Date(now), formatFlags: [], riskScore: 0, riskThreshold: KYC_MAKER_CHECKER_THRESHOLD,
      holds: [], sofStatus: null, amlEscalationOpen: false, underageAttempt: false, samePerson: [], officerProvenance: false, track: "typed",
    });
    if (check.blocks.length) {
      return { ok: false as const, error: `This approval cannot be marked checked: ${check.blocks.join("; ")}. Reject it or ask for corrections.`, code: "INVALID" as const };
    }
    await db.kyc.upsert({ ...k, postCheckedAt: now, postCheckedById: officerId, updatedAt: now });
    audit({ category: "COMPLIANCE", action: "kyc.post_checked", actorId: officerId, targetType: "User", targetId: userId, payload: { kycId: k.id, attestationSet: ATTESTATION_SET_ID.typed, attestations: attest.attested, flags: Array.isArray(k.autoFlags) ? k.autoFlags : [] } });
    return { ok: true as const };
  });
}

/** The written reason a date-of-birth correction needs — the same floor as re-opening a final refusal. */
export const DOB_CORRECTION_REASON_MIN = 20;

/**
 * ⭐ CORRECT AN ACCOUNT'S DATE OF BIRTH (2026-10-10) — the only fix for a wrong sign-up date, now that the identity step
 * takes the account's date instead of asking. Compliance only (the action checks the grant and the step-up); a written
 * reason of at least `DOB_CORRECTION_REASON_MIN` characters. Updates `User.dob` and the submission's `dob`, appends the
 * identity as it stood to `priorIdentities` (cause "correction"), and re-runs the age gate:
 *   · under 18 → the FINAL refusal path (wallet frozen first, refusal recorded);
 *   · otherwise the identity goes to an officer — PENDING_REVIEW when it holds details, and the officer's provenance on
 *     the row in every case, so the next send can never be approved automatically. `approvedAt` is never cleared.
 * Audit `kyc.dob_corrected` carries no dates.
 */
export async function correctDateOfBirth(officerId: string, userId: string, opts: { dob: string; reason: string; version: string }): Promise<ServiceResult> {
  if (!userId) return { ok: false, error: "Missing player.", code: "INVALID" };
  if (officerId === userId) {
    audit({ category: "SECURITY", action: "kyc.dob_correction.self_blocked", actorId: officerId, targetType: "User", targetId: userId });
    return { ok: false, error: "You cannot correct your own date of birth.", code: "INVALID" };
  }
  const reason = (opts.reason ?? "").trim().slice(0, 500);
  if (reason.length < DOB_CORRECTION_REASON_MIN) return { ok: false, error: `A reason of at least ${DOB_CORRECTION_REASON_MIN} characters is required.`, code: "INVALID" };
  const dob = String(opts.dob ?? "").trim().slice(0, 10);
  const parsedDob = new Date(`${dob}T00:00:00Z`);
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dob) || Number.isNaN(parsedDob.getTime()) || parsedDob.toISOString().slice(0, 10) !== dob || Number(dob.slice(0, 4)) < 1900 || parsedDob.getTime() > Date.now()) {
    return { ok: false, error: "Enter a real date of birth (YYYY-MM-DD, 1900 or later, not in the future).", code: "INVALID" };
  }
  if (!opts.version) return { ok: false, error: STALE_CASE, code: "INVALID" };

  const out: { underage?: boolean; toOfficer?: boolean } = {};
  const corrected = await withLock(`kyc:${userId}`, async () => {
    const k = await db.kyc.findByUserId(userId);
    if (!k) return { ok: false as const, error: "No verification for this player.", code: "NOT_FOUND" as const };
    // The IDENTITY the officer saw (R1.6) — the date they correct is one of its facts.
    if (!sameIdentityVersion(k, opts.version)) return { ok: false as const, error: STALE_CASE, code: "INVALID" as const };
    if (k.status === "REJECTED" && isFinalRefusal(k.rejectReason)) {
      return { ok: false as const, error: "This identity was finally refused. Re-open the refusal first.", code: "INVALID" as const };
    }
    const now = new Date().toISOString();
    // The identity as it stood goes into the history when the date actually changes (an officer's act: no decided-state
    // rule — it is bounded by the grant, the step-up and the cap).
    const dobChanged = (k.dob ? String(k.dob).slice(0, 10) : "") !== dob;
    const priorIdentities = dobChanged ? withPriorIdentity(k, "correction", now) : (Array.isArray(k.priorIdentities) ? k.priorIdentities : []);
    const underage = !isOfAge(dob, new Date(now));
    if (underage) {
      // ⭐ FREEZE FIRST, THEN THE ACCOUNT DATE, THEN THE REFUSAL — see `freezeForFinalRefusal`.
      const freeze = await freezeForFinalRefusal(userId, k.id, "UNDERAGE", officerId);
      if (!freeze.ok) return { ok: false as const, error: freeze.error, code: "INVALID" as const };
      await db.user.update(userId, { dob });
      await db.kyc.upsert({ ...k, dob, priorIdentities, status: "REJECTED", rejectReason: "UNDERAGE", rejectNote: null, reviewerId: officerId, reviewedAt: now, updatedAt: now });
      await recordFinalRefusal(userId, k.id, "UNDERAGE", officerId);
      out.underage = true;
    } else {
      await db.user.update(userId, { dob });
      // ⛔ A refused row (recoverable) keeps its status: moving it would re-claim a number its refusal released. Every
      // row carries the officer's provenance, so whatever the player sends next goes to an officer.
      const toOfficer = holdsDetails(k);
      await db.kyc.upsert({
        ...k,
        dob,
        priorIdentities,
        ...(toOfficer ? { status: "PENDING_REVIEW" as const, submittedAt: now } : {}),
        reviewerId: officerId,
        reviewedAt: now,
        updatedAt: now,
      });
      out.toOfficer = toOfficer;
    }
    audit({ category: "COMPLIANCE", action: "kyc.dob_corrected", actorId: officerId, targetType: "User", targetId: userId, payload: { kycId: k.id, reasonLength: reason.length, outcome: underage ? "underage_refused" : out.toOfficer ? "to_officer" : "provenance_only" } });
    return { ok: true as const };
  });
  if (!corrected.ok) return corrected;
  if (out.underage) {
    runOutsideLock(() => {
      void import("./house-bot/holder-hook").then((m) => m.onHolderAccountChanged(userId, "IDENTITY_REFUSED")).catch(() => {});
    });
    notifyKyc(userId, "REJECTED", { finalRefusal: true }).catch(() => {});
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: "Identity verification refused",
      html: kycRejectedHtml({ reason: REJECT_EMAIL_TEXT.UNDERAGE, reasonSw: REJECT_EMAIL_TEXT_SW.UNDERAGE, finalRefusal: true }),
      tag: "kyc-rejected",
    }));
  } else if (out.toOfficer) {
    // ⭐ ITS OWN NOTICE (2026-10-10, review R5.10): the "details received" notice told the player they had sent something,
    // and they sent nothing — our team changed their date of birth and is checking their identity again.
    notifyKyc(userId, "DOB_CORRECTED").catch(() => {});
  }
  return { ok: true };
}

/** Does this row hold typed details a date-of-birth correction can send to an officer? (`correctDateOfBirth`'s rule.) */
function holdsDetails(k: KycRow): boolean {
  return !!k.idVerifiedAt && !!k.idType && !!k.idNumber && k.status !== "REJECTED" && k.status !== "NOT_STARTED";
}

// ⛔ `forceReverifyKyc` WAS DELETED HERE ON 2026-10-10 — `askForCorrections` is its replacement (from APPROVED as well
// as PENDING_REVIEW, with the same "it moves no money; freeze the wallet if money must stop" rule and the freeze offered
// in the same action).
