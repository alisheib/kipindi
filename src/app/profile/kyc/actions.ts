"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { signInPathForAction } from "@/lib/server/sign-in-path";
import { startKyc, verifyIdentity, submitIdentityStep, attachDocument, submitForReview } from "@/lib/server/kyc-service";
import { reasonKeyFor } from "@/lib/failure-banner";
import { ALL_DOC_SLOTS, isIdDocType, type KycDocSlot } from "@/lib/id-documents";
import { isSafePath } from "@/lib/safe-next";

/**
 * /profile/kyc's actions — TWO TRACKS since 2026-10-10 (owner ruling, Ali: players verify with typed details,
 * agents keep photo identity).
 *
 *   · typed (every player): `verifyIdentityAction` — ONE press, one service call (`verifyIdentity`), which decides
 *     under one lock: verified at once, sent to an officer, or refused. ⛔ There is no "save, then send" here any
 *     more: two presses meant two locks and a row that could be approved on details nobody re-read.
 *   · agent (agent applicants): `saveAgentIdentityAction` (details, no decision) → `attachDocumentAction` per photo
 *     slot → `sendPhotosForReviewAction` (the officer decides on the photos).
 *   · both: `restartKycAction` after a recoverable refusal.
 * ⛔ DELETED with the typed track, not disabled: the two-press `submitIdentityAction` / `submitKycForReviewAction`
 * pair, and `attachExtraDocumentAction` (officers no longer ask for extra documents; requests already on file are
 * shown to the player as text only).
 *
 * ⭐ EVERY REDIRECT CARRIES THE TRACK AND THE SAFE RETURN TARGET. A gated screen sends `?next=` (the withdraw panel,
 * the agent CTA) and the agent CTA sends `?for=agent`; an action that dropped either put a player who came to
 * withdraw on an approved card with no Continue, or dropped an agent applicant onto the typed form.
 */

/** The page's address, with the agent track and a SAME-SITE return target carried (the one shared rule). */
function kycPath(base: string, opts: { agent?: boolean; next?: string | null }): string {
  const extra: string[] = [];
  if (opts.agent) extra.push("for=agent");
  if (opts.next && isSafePath(opts.next)) extra.push(`next=${encodeURIComponent(opts.next)}`);
  if (extra.length === 0) return base;
  return `${base}${base.includes("?") ? "&" : "?"}${extra.join("&")}`;
}

/** The form's identity fields, read the same way by both tracks. */
function identityFields(formData: FormData) {
  // ⛔ THE TYPE COMES FROM THE FORM, NOT FROM THE URL. The chooser writes it into
  // the URL so a refused submit round-trips and the right fields render — but the
  // form carries its own hidden copy, so what is VALIDATED is what was on screen
  // when the player pressed the button. Reading the query string here instead
  // would let a stale or hand-edited `?idType=` validate a number against a
  // different document's rule.
  const rawType = String(formData.get("idType") ?? "");
  const idType = isIdDocType(rawType) ? rawType : "NIDA";
  const idNumber = String(formData.get("idNumber") ?? "");
  const idExpiry = String(formData.get("idExpiry") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  // ⭐ THE DATE OF BIRTH IS THE ACCOUNT'S (2026-10-10). The form posts one only when the account has none; the service
  // takes `User.dob` whenever it exists and ignores a posted one, so a hand-built POST cannot swap it.
  const dob = String(formData.get("dob") ?? "").trim();
  return { idType, idNumber, idExpiry, fullName, dob };
}

/**
 * Carry the form values through an error redirect so the player doesn't have to re-type a 20-digit number and a
 * full name — and carry the TYPE, or a refused passport submit re-renders the NIDA form.
 * ⛔ THE KEY, NOT THE SENTENCE: the page resolves `?reason=` through the failure registry itself, so no text a link
 * carries is ever rendered.
 */
function refusedPath(f: ReturnType<typeof identityFields>, reason: string, opts: { agent?: boolean; next?: string | null }): string {
  const carry =
    `&idType=${encodeURIComponent(f.idType)}` +
    `&idNumber=${encodeURIComponent(f.idNumber)}` +
    `&fullName=${encodeURIComponent(f.fullName)}` +
    (f.dob ? `&dob=${encodeURIComponent(f.dob)}` : "") +
    (f.idExpiry ? `&idExpiry=${encodeURIComponent(f.idExpiry)}` : "");
  return kycPath(`/profile/kyc?reason=${encodeURIComponent(reason)}${carry}`, opts);
}

/**
 * Player explicitly restarts a REJECTED submission.
 *
 * `startKyc()` CLEARS the record (the identity tuple, documents, rejectReason,
 * rejectNote
 * — see kyc-service.ts `restartedSubmission`). That is correct for a deliberate "start again", and
 * wrong for a page load: until 2026-07-31 `page.tsx` called it on every render,
 * which wiped the rejection one line before the page read it, so the rejection
 * panel was unreachable and the player never learned why they were turned down.
 * Restarting is now an action the player takes, not a side effect of looking.
 * The refusal card posts the track and the return target, so the restarted form is the same one.
 */
export async function restartKycAction(formData?: FormData) {
  const session = await currentSession();
  if (!session) redirect((await signInPathForAction()) as never);
  const agent = String(formData?.get("for") ?? "") === "agent";
  const next = String(formData?.get("next") ?? "");
  await startKyc(session.userId);
  revalidatePath("/profile/kyc");
  redirect(kycPath("/profile/kyc", { agent, next }) as never);
}

/**
 * ⭐ THE TYPED TRACK — one press (owner ruling, 2026-10-10).
 *
 * `verifyIdentity` answers with an OUTCOME, and each has its own landing:
 *   · approved → the verified card (with Continue to the safe `next`);
 *   · routed   → "We're checking your details" (an officer decides; the service told the officers);
 *   · refused  → the refusal card. ⛔ `ok` reports that the step RAN, not that the player passed — a document the
 *     NIDA check refuses still answers ok:true with outcome "refused", and the row is already REJECTED. Landing it
 *     on a success word would contradict the email the service just sent.
 */
export async function verifyIdentityAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect((await signInPathForAction()) as never);
  const f = identityFields(formData);
  const next = String(formData.get("next") ?? "");

  const result = await verifyIdentity(session.userId, {
    idType: f.idType,
    idNumber: f.idNumber,
    idExpiry: f.idExpiry,
    fullName: f.fullName,
    ...(f.dob ? { dob: f.dob } : {}),
  });

  revalidatePath("/profile/kyc");
  if (!result.ok) redirect(refusedPath(f, reasonKeyFor(result), { next }) as never);
  const outcome = result.data?.outcome;
  if (outcome === "refused") redirect(kycPath("/profile/kyc", { next }) as never);
  if (outcome === "routed") redirect(kycPath("/profile/kyc?sent=1", { next }) as never);
  redirect(kycPath("/profile/kyc?verified=1", { next }) as never);
}

/**
 * THE AGENT PHOTO TRACK, STEP 1 — save the details (no decision; the officer decides on the photos).
 * Today's behaviour of the old identity step, on the agent track only.
 */
export async function saveAgentIdentityAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect((await signInPathForAction()) as never);
  const f = identityFields(formData);
  const next = String(formData.get("next") ?? "");
  const agent = (path: string) => kycPath(path, { agent: true, next });

  const result = await submitIdentityStep(session.userId, {
    idType: f.idType,
    idNumber: f.idNumber,
    idExpiry: f.idExpiry,
    fullName: f.fullName,
    ...(f.dob ? { dob: f.dob } : {}),
  });

  revalidatePath("/profile/kyc");
  if (!result.ok) redirect(refusedPath(f, reasonKeyFor(result), { agent: true, next }) as never);
  // A document that FAILS the identity check (mismatch / sanctioned / underage /
  // not-found) still returns ok:true — `ok` reports that the step ran, not that
  // the player passed. submitIdentityStep has already set the submission to
  // REJECTED and emailed "Identity check needs attention". Redirecting to the
  // success banner greeted that player with "Document details accepted — now
  // attach your photos", i.e. the screen contradicted the email. Fall through to
  // the page, which renders the rejection panel with the reason.
  if (result.data?.verified === false) redirect(agent("/profile/kyc") as never);
  redirect(agent("/profile/kyc?id=accepted") as never);
}

export async function attachDocumentAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string; code?: string; reason?: string; retryAfterSec?: number }> {
  // B-7 — failures carry `code` (+ the stable service string) so the uploader
  // can render its own localized line via errorCopy.
  // ⛔ AND THEY MUST CARRY `reason`, OR TEACHING THE SERVICE TO EMIT ONE IS INERT. This
  // boundary used to forward `error` and `code` and silently drop everything else, so a
  // reason minted in `kyc-service.ts` died here and the uploader fell back to prose.
  // ⭐ THE AGENT PHOTO TRACK ONLY since 2026-10-10: the typed track renders no uploader, and the service refuses a
  // photo on a row an officer has photo-approved (`closedToPlayer`, documents step).
  const session = await currentSession();
  if (!session) return { ok: false, error: "Sign in required.", code: "AUTH" };
  // ⛔ THE ACCEPT-LIST IS DERIVED, NOT WRITTEN. `ALL_DOC_SLOTS` is built from the
  // four documents' own `requiredSlots`, so this boundary widens with the
  // catalogue and can never accept a slot no document asks for. The literal union
  // that used to sit here is why PASSPORT / DRIVER_LICENSE / VOTER_CARD existed in
  // the database enum and were unreachable from the product.
  const docType = String(formData.get("docType") ?? "") as KycDocSlot;
  if (!ALL_DOC_SLOTS.includes(docType)) return { ok: false, error: "Invalid document type.", code: "INVALID" };
  // The client resizes the photo and posts it as a base64 image data URL; the
  // service validates the format + size and stores it on the submission.
  const image = String(formData.get("image") ?? "");
  const result = await attachDocument(session.userId, docType, image);
  revalidatePath("/profile/kyc");
  // ⭐ AND THE WAIT (2026-10-10): attaching is rate-limited per account by its own rule (`kyc.attach`, rate-limit.ts;
  // `kyc-service.attachDocument`), and `errorCopy` says "wait {sec}s" from `retryAfterSec` — dropped here, the agent read a
  // default wait instead of the rule's own.
  return result.ok ? { ok: true } : { ok: false, error: result.error, code: result.code, reason: result.reason, retryAfterSec: result.retryAfterSec };
}

/**
 * THE AGENT PHOTO SEND — the full photo set (selfie included) to an officer. On an account already verified from
 * typed details this moves the row to PENDING_REVIEW and keeps `approvedAt`, so withdrawals stay open meanwhile.
 */
export async function sendPhotosForReviewAction(formData?: FormData) {
  const session = await currentSession();
  if (!session) redirect((await signInPathForAction()) as never);
  const next = String(formData?.get("next") ?? "");
  const result = await submitForReview(session.userId);
  revalidatePath("/profile/kyc");
  if (!result.ok) {
    redirect(kycPath(`/profile/kyc?reason=${encodeURIComponent(reasonKeyFor(result))}`, { agent: true, next }) as never);
  }
  redirect(kycPath("/profile/kyc?submitted=1", { agent: true, next }) as never);
}
