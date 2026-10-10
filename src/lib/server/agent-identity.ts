/**
 * THE AGENT PROGRAMME'S IDENTITY QUESTIONS — one home (owner ruling, Ali, 2026-10-10).
 *
 * ⭐ TWO KINDS OF "APPROVED" SINCE 2026-10-10. A player verifies their identity with TYPED details and is approved
 * AUTOMATICALLY when the checks pass (`verifyIdentity`, `kyc-service.ts`) — that opens withdrawals, and nothing else.
 * Agents keep everything as before: an applicant's identity is their document photos and a selfie, approved by an
 * OFFICER (`reviewKyc` in photo mode), which stamps `photoVerifiedAt`. docs/COMPLIANCE-DECISIONS.md, "2026-10-10 ·
 * Players verify identity with typed details" — what deliberately does NOT change.
 *
 * ⛔ SO `status === "APPROVED"` NO LONGER ANSWERS THE AGENT PROGRAMME'S QUESTION, and every agent gate asks here
 * instead (`agent-application-service.ts`): self-service eligibility, the fee payment and `approveAgent` ask
 * `photoIdentityVerified`; an invitee's submit asks `photoCaseSent || photoIdentityVerified`, because an invitee's
 * photo case is decided together with the application at approval. An automatic typed approval has no officer and
 * no photos, so it never satisfies an agent gate — that is the whole reason this file exists.
 *
 * ⭐ THE TWO PREDICATES ARE PURE and read only the row the caller already holds; `agentIdentityIntent` is the one
 * question that reads the store.
 */
import { db } from "./store";
import { photoSetComplete, photoSetStampedBy } from "@/lib/id-documents";

/** The facts the two predicates read. Every KYC shape on the server carries them (`StoredKyc`). ⭐ `uploadedAt` since
 *  2026-10-10 (review R5.2): an officer's stamp counts only over photos uploaded no later than it (`photoSetStampedBy`). */
type AgentKycFacts = {
  status: string;
  photoVerifiedAt?: string | null;
  idType?: string | null;
  documents?: ReadonlyArray<{ docType: string; uploadedAt?: string | null }> | null;
} | null | undefined;

/**
 * Is this person on the agent programme's road — so `/profile/kyc` offers them the PHOTO track (document photos and a
 * selfie, for an officer) rather than the typed details every player gives?
 *
 * Yes when they hold a live agent application (anything not REJECTED / DECLINED / EXPIRED / REVOKED — an INVITED
 * draft and an approved agent included: an agent who re-verifies keeps the photo check, as before 2026-10-10), or
 * when a live invitation is bound to their account's email address — an invitee who registered after it was issued
 * has no application row until they accept it.
 * ⭐ THE MATCH IS THE INVITATION PAGE'S OWN: the account's address against the bound one, ignoring case
 * (`invitationPreview`'s `viewerMatches`, and the store's `findLiveByEmail`). ⛔ A phone-era invitation (issued before
 * 2026-09-08) is not asked: it can no longer be accepted (`requestInvitationOtp` refuses to send it a code), so it
 * would put a player on the photo track for an invitation they cannot take up.
 * ⚠️ A failed read THROWS. The caller decides what a page shows then; answering `false` would silently put an agent
 * applicant on the typed track.
 */
export async function agentIdentityIntent(userId: string): Promise<boolean> {
  if (await db.agentApplication.findActiveByUser(userId)) return true;
  const user = await db.user.findById(userId);
  const email = (user?.email ?? "").trim();
  if (!email) return false;
  const inv = await db.agentInvitation.findLiveByEmail(email);
  // ⚠️ An ISSUED row can be past its date: an invitation is marked EXPIRED lazily (`invitationPreview`, the daily sweep).
  return !!inv && Date.parse(inv.expiresAt) > Date.now();
}

/**
 * Has an OFFICER approved this identity on its photos — the agent programme's identity gate?
 *
 * Three facts, all on the row the caller holds:
 *  · ⛔ THE CURRENT STATUS. `photoVerifiedAt` survives what comes after it on the row — an officer's request for
 *    corrections, a refusal (recoverable or final), a date-of-birth correction that sends the identity back to
 *    review — so the stamp alone would open an agent gate on an identity that is refused or reopened today. The
 *    gates this replaced asked the CURRENT status deliberately ("the withdrawal gate's approved-ever question is a
 *    different rule for a different door"), and that is kept.
 *  · THE STAMP — an officer's approval in photo mode (`reviewKyc` → `approveIdentity`).
 *  · ⛔ AND THE PHOTOS THE STAMP APPROVED, STILL ON FILE FOR THIS IDENTITY (`photoSetStampedBy`): the full photo set,
 *    every image of it uploaded NO LATER than the stamp. An officer's photo approval is only ever written on a complete
 *    set, and on a live account only a restart removes documents — which, since 2026-10-10, clears the stamp in the same
 *    write (`restartedSubmission`). The migration that added the column (`20261010150000_kyc_typed_identity`) backfilled
 *    `photoVerifiedAt = approvedAt` only on rows APPROVED at that moment (`WHERE "status" = 'APPROVED' AND "approvedAt"
 *    IS NOT NULL AND "photoVerifiedAt" IS NULL`) — every one of them, in production, an officer's approval of photos
 *    uploaded before it. It was applied ONCE, at the deploy, and ⛔ it must NEVER be run again: from that release an
 *    APPROVED row may be an AUTOMATIC typed approval, and the same UPDATE would stamp it as an officer's photo approval.
 *    🔴 WHY THE UPLOAD TIME, NOT ONLY THE SET (review R5.2). With the set alone, such a stray stamp (a re-run of that
 *    UPDATE, a fixture, a hand-edited row) was a way AROUND this gate: the documents door stays open under a stamp with no
 *    photos behind it, and the upload that completed the set made this answer true — photos no officer ever saw. Photos
 *    uploaded after the stamp are not the ones it approved, so they never satisfy it; the player's send then goes to an
 *    officer like any other photo case (`submitForReview`), and that officer's approval stamps anew.
 */
export function photoIdentityVerified(kyc: AgentKycFacts): boolean {
  if (!kyc || kyc.status !== "APPROVED" || !kyc.photoVerifiedAt) return false;
  return photoSetStampedBy(kyc.idType, kyc.documents, kyc.photoVerifiedAt);
}

/**
 * Is a PHOTO case with an officer right now — the full photo set for the document on file (the selfie included) and
 * the identity awaiting review? An invitee's photo case is decided together with the application at approval, so
 * this is enough for an invitee to submit (`missingForSubmit`, `submitForReview`).
 * ⛔ A typed case an officer is reviewing (routed, no photos) is NOT a photo case: approving it would stamp nothing
 * the agent programme can use.
 */
export function photoCaseSent(kyc: AgentKycFacts): boolean {
  if (!kyc || kyc.status !== "PENDING_REVIEW") return false;
  return photoSetOnFile(kyc);
}

/** The full photo set for the row's document, selfie included — the question the officer's workstation asks to
 *  choose its photo mode, and the one an officer's photo approval is written on (`photoSetComplete`, `id-documents.ts`). */
function photoSetOnFile(kyc: NonNullable<AgentKycFacts>): boolean {
  return photoSetComplete(kyc.idType, (kyc.documents ?? []).map((d) => d.docType));
}
