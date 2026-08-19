"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { startKyc, submitIdentityStep, attachDocument, attachExtraDocument, submitForReview } from "@/lib/server/kyc-service";
import { getServerT } from "@/lib/i18n-server";
import { reasonKeyFor } from "@/lib/failure-banner";
import { ALL_DOC_SLOTS, isIdDocType, type KycDocSlot } from "@/lib/id-documents";

/**
 * Player explicitly restarts a REJECTED submission.
 *
 * `startKyc()` CLEARS the record (nidaNumber, documents, rejectReason, rejectNote
 * — see kyc-service.ts:79-95). That is correct for a deliberate "start again", and
 * wrong for a page load: until 2026-07-31 `page.tsx` called it on every render,
 * which wiped the rejection one line before the page read it, so the rejection
 * panel was unreachable and the player never learned why they were turned down.
 * Restarting is now an action the player takes, not a side effect of looking.
 */
export async function restartKycAction() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  await startKyc(session.userId);
  revalidatePath("/profile/kyc");
  redirect("/profile/kyc");
}

export async function submitIdentityAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const rawEmail = formData.get("email");
  const emailStr = rawEmail ? String(rawEmail).trim() : "";

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
  const dob = String(formData.get("dob") ?? "");

  const result = await submitIdentityStep(session.userId, {
    idType,
    idNumber,
    idExpiry,
    fullName,
    dob,
    ...(emailStr ? { email: emailStr } : {}),
  });

  revalidatePath("/profile/kyc");
  // Carry form values through the error redirect so the player doesn't have to
  // re-type a 20-digit number + full name on a validation failure — and carry the
  // TYPE, or a refused passport submit re-renders the NIDA form.
  if (!result.ok) {
    // ⛔ THE KEY, NOT THE SENTENCE. This used to mint the localized copy HERE and put the
    // finished sentence on the query string. That was already better than raw prose, but it
    // still meant the page rendered whatever `?error=` said — so any text could be shown to a
    // signed-in player by handing them a link. The page resolves the key itself now.
    const carry =
      `&idType=${encodeURIComponent(idType)}` +
      `&idNumber=${encodeURIComponent(idNumber)}` +
      `&fullName=${encodeURIComponent(fullName)}` +
      `&dob=${encodeURIComponent(dob)}` +
      (idExpiry ? `&idExpiry=${encodeURIComponent(idExpiry)}` : "") +
      (emailStr ? `&email=${encodeURIComponent(emailStr)}` : "");
    redirect(`/profile/kyc?reason=${encodeURIComponent(reasonKeyFor(result))}${carry}`);
  }
  // A document that FAILS the identity check (mismatch / sanctioned / underage /
  // not-found) still returns ok:true — `ok` reports that the step ran, not that
  // the player passed. submitIdentityStep has already set the submission to
  // REJECTED and emailed "Identity check needs attention". Redirecting to the
  // success banner greeted that player with "Document details accepted — now
  // attach your photos", i.e. the screen contradicted the email. Fall through to
  // the page, which renders the rejection panel with the reason.
  if (result.data?.verified === false) redirect("/profile/kyc");
  redirect("/profile/kyc?id=accepted");
}

export async function attachDocumentAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string; code?: string; reason?: string }> {
  // B-7 — failures carry `code` (+ the stable service string) so the uploader
  // can render its own localized line via errorCopy.
  // ⛔ AND THEY MUST CARRY `reason`, OR TEACHING THE SERVICE TO EMIT ONE IS INERT. This
  // boundary used to forward `error` and `code` and silently drop everything else, so a
  // reason minted in `kyc-service.ts` died here and the uploader fell back to prose.
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
  return result.ok ? { ok: true } : { ok: false, error: result.error, code: result.code, reason: result.reason };
}

export async function attachExtraDocumentAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string; code?: string; reason?: string }> {
  const session = await currentSession();
  if (!session) return { ok: false, error: "Sign in required.", code: "AUTH" };
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return { ok: false, error: "Missing request.", code: "INVALID" };
  const image = String(formData.get("image") ?? "");
  const result = await attachExtraDocument(session.userId, requestId, image);
  revalidatePath("/profile/kyc");
  return result.ok ? { ok: true } : { ok: false, error: result.error, code: result.code, reason: result.reason };
}

export async function submitKycForReviewAction() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const result = await submitForReview(session.userId);
  revalidatePath("/profile/kyc");
  if (!result.ok) {
    redirect(`/profile/kyc?reason=${encodeURIComponent(reasonKeyFor(result))}`);
  }
  redirect("/profile/kyc?submitted=1");
}
